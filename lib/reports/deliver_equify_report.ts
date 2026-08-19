import type { ValuationLocale } from '../../api_client';
import { updateMondayLeadColumnsViaGraphql } from '../crm/monday_graphql_lead';
import { findMondayItemIdByEmail } from '../crm/valubot_monday_sync';
import { uploadMondayColumnFile } from '../crm/monday_client';
import { VALUBOT_MONDAY_COLUMNS } from '../crm/valubot_monday_columns';
import { mapWizardToValuationData } from '../pdf-template/map-from-wizard';
import type { ValuationData } from '../pdf-template/types';
import { getIndustryLabel } from '../constants/industries';
import { refreshFxRates } from '../utils/fxService';
import type { EquifyValuationPersistedState } from '../wizard/equify_valuation_persistence';
import type { ForecastMatrixWithDiagnostics } from '../../valuation_forecast';
import { buildExportValuationDataFromLiveSession } from '../results/build-export-valuation-data';
import { scheduleProductEvent } from '../analytics/track_event';
import { packageAndSendCustomerReport } from './send_customer_report';

export type ReportDeliverTrigger = 'PAYPAL_PAID' | 'PROMO_FREE';

export interface DeliverEquifyReportInput {
  mondayItemId?: string | null;
  email: string;
  valuationState: EquifyValuationPersistedState;
  triggerType: ReportDeliverTrigger;
  locale?: ValuationLocale;
  forecastMatrix?: ForecastMatrixWithDiagnostics | null;
}

export interface DeliverEquifyReportResult {
  ok: boolean;
  reportId: string;
  pdfBytes: number;
  monday: {
    ok: boolean;
    itemId: string | null;
    columnsUpdated: boolean;
    fileUploaded: boolean;
    error?: string;
  };
  email: {
    ok: boolean;
    delivered: boolean;
    messageId: string | null;
    error?: string;
  };
}

function statusValue(label: string): { label: string } {
  return { label };
}

function resolveMondayStatuses(_triggerType: ReportDeliverTrigger): {
  leadStatus: string;
  processStage: string;
} {
  return {
    leadStatus: 'שולם - הופק דוח',
    processStage: 'הופק דוח',
  };
}

function equityMidpointNis(summaryEquityK: number): number {
  if (!Number.isFinite(summaryEquityK)) return 0;
  return Math.round(summaryEquityK * 1000);
}

export function buildDeliverAiNotes(
  valuationState: EquifyValuationPersistedState,
  valuationData: ValuationData,
): string {
  const { summary, wizard } = valuationState;
  const sectorLabel = getIndustryLabel(wizard.profile.sector, 'he');
  const turnoverK = wizard.financials.y2026.revenueK;
  const multiple = valuationData.effectiveMult ?? valuationData.revenueMultiple ?? null;

  const multiplePart =
    multiple != null && Number.isFinite(multiple)
      ? `EBITDA Multiplier used: ${multiple.toFixed(1)}x`
      : 'EBITDA Multiplier: sector automatic';

  return [
    multiplePart,
    `Base Equity: ${equityMidpointNis(summary.equityK).toLocaleString('he-IL')} ₪`,
    `EBITDA: ${Math.round(summary.ebitdaK).toLocaleString('he-IL')}K ₪`,
    `Turnover: ${Math.round(turnoverK).toLocaleString('he-IL')}K ₪`,
    `Quality Score: ${Math.round(summary.qualityScore)}`,
    `Industry: ${sectorLabel}`,
    `WACC: ${summary.wacc.toFixed(1)}%`,
  ].join(' | ');
}

async function resolveValuationDataForDeliver(
  input: DeliverEquifyReportInput,
  reportId: string,
  locale: ValuationLocale,
): Promise<ValuationData> {
  await refreshFxRates();

  if (input.forecastMatrix) {
    return buildExportValuationDataFromLiveSession(
      input.forecastMatrix,
      input.valuationState.wizard,
      locale,
      reportId,
    );
  }

  return mapWizardToValuationData(input.valuationState.wizard, reportId, locale);
}

async function syncMondayDeliverable(params: {
  itemId: string;
  valuationState: EquifyValuationPersistedState;
  triggerType: ReportDeliverTrigger;
  aiNotes: string;
  pdfBuffer: Buffer;
  filename: string;
}): Promise<{
  columnsUpdated: boolean;
  fileUploaded: boolean;
  error?: string;
}> {
  const { itemId, valuationState, triggerType, aiNotes, pdfBuffer, filename } = params;
  const statuses = resolveMondayStatuses(triggerType);
  const columnValues: Record<string, unknown> = {
    [VALUBOT_MONDAY_COLUMNS.valuationMidpoint]: String(
      equityMidpointNis(valuationState.summary.equityK),
    ),
    [VALUBOT_MONDAY_COLUMNS.qualityScore]: String(
      Math.round(valuationState.summary.qualityScore),
    ),
    [VALUBOT_MONDAY_COLUMNS.leadStatus]: statusValue(statuses.leadStatus),
    [VALUBOT_MONDAY_COLUMNS.processStage]: statusValue(statuses.processStage),
    [VALUBOT_MONDAY_COLUMNS.aiNotes]: aiNotes,
  };

  let columnsUpdated = false;
  let fileUploaded = false;
  const errors: string[] = [];

  try {
    await updateMondayLeadColumnsViaGraphql(itemId, columnValues);
    columnsUpdated = true;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'monday_columns_failed';
    errors.push(message);
    console.error('[deliver-report] Monday column update failed', err);
  }

  try {
    await uploadMondayColumnFile({
      itemId,
      columnId: VALUBOT_MONDAY_COLUMNS.files,
      fileBuffer: pdfBuffer,
      filename,
    });
    fileUploaded = true;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'monday_file_upload_failed';
    errors.push(message);
    console.error('[deliver-report] Monday PDF upload failed', err);
  }

  return {
    columnsUpdated,
    fileUploaded,
    error: errors.length ? errors.join('; ') : undefined,
  };
}

export async function deliverEquifyReport(
  input: DeliverEquifyReportInput,
): Promise<DeliverEquifyReportResult> {
  const locale = input.locale ?? 'he';
  const reportId = `eq-deliver-${Date.now()}`;
  const valuationData = await resolveValuationDataForDeliver(input, reportId, locale);
  const aiNotes = buildDeliverAiNotes(input.valuationState, valuationData);
  const emailTarget = input.email.trim() || input.valuationState.userEmail.trim();
  const profile = input.valuationState.wizard.profile;

  const packaged = await packageAndSendCustomerReport({
    valuationData,
    to: emailTarget,
    locale,
    recipientName: profile.fullName,
    archive: {
      userEmail: emailTarget || profile.userEmail,
      userPhone: profile.userMobilePhone,
      valuationMidpoint: equityMidpointNis(input.valuationState.summary.equityK),
      displayName: profile.fullName || valuationData.companyName,
      nationalId: profile.userNationalId,
      corporateTaxId: profile.userCorporateTaxId,
      sectorLabel:
        valuationData.sectorLabel ||
        getIndustryLabel(profile.sector, locale),
      currency: valuationData.currency,
      valuationId: reportId,
    },
    indicativeEnterpriseValue: valuationData.enterpriseValue,
    currency: valuationData.currency,
  });

  const pdfBuffer = packaged.pdfBuffer;
  const filename = packaged.filename;
  const emailResult = packaged.email;

  let itemId =
    input.mondayItemId?.trim() ||
    input.valuationState.mondayItemId?.trim() ||
    null;

  if (!itemId) {
    const email = emailTarget;
    if (email) {
      itemId = await findMondayItemIdByEmail(email);
    }
  }

  const mondayResult = itemId
    ? await syncMondayDeliverable({
        itemId,
        valuationState: input.valuationState,
        triggerType: input.triggerType,
        aiNotes,
        pdfBuffer,
        filename,
      })
    : {
        columnsUpdated: false,
        fileUploaded: false,
        error: 'monday_item_not_found',
      };

  const pdfBytes = packaged.pdfBytes;
  const ok =
    pdfBytes > 0 &&
    (mondayResult.columnsUpdated || mondayResult.fileUploaded || emailResult.delivered);

  if (ok) {
    scheduleProductEvent({
      eventType: 'report_created',
      metadata: {
        reportId,
        source: 'reports/deliver',
        triggerType: input.triggerType,
        archived: packaged.archived,
      },
    });
  }

  return {
    ok,
    reportId,
    pdfBytes,
    monday: {
      ok: mondayResult.columnsUpdated || mondayResult.fileUploaded,
      itemId,
      columnsUpdated: mondayResult.columnsUpdated,
      fileUploaded: mondayResult.fileUploaded,
      error: mondayResult.error,
    },
    email: {
      ok: emailResult.delivered,
      delivered: emailResult.delivered,
      messageId: emailResult.messageId,
      error: emailResult.error,
    },
  };
}
