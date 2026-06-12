import { NextResponse } from 'next/server';
import {
  executeValuationGenerate,
  parseValuationCalculateBody,
  resolveContactFromAuthHeader,
  wantsValuationPdfResponse,
} from '../../../lib/api/handlers/valuation_generate';
import { mapWizardLifecycle } from '../../../lib/valuation/engine';
import type { LifecycleStage } from '../../../lib/valuation/multiples';
import { appRouteMethodNotAllowed } from '../../../lib/api/http';

export const runtime = 'nodejs';

type CalculateBodyExtension = {
  stage?: LifecycleStage;
};

/**
 * Enhanced calculate endpoint — extends `/api/v1/valuation/calculate` with
 * explicit `stage` and Israeli multiples metadata in the response.
 */
export async function POST(request: Request) {
  const parsed = await parseValuationCalculateBody(request);
  if (!parsed.ok) {
    return parsed.response;
  }

  const raw = parsed.body as typeof parsed.body & CalculateBodyExtension;
  if (
    raw.stage &&
    (raw.stage === 'seed' ||
      raw.stage === 'early' ||
      raw.stage === 'growth' ||
      raw.stage === 'mature')
  ) {
    raw.wizard = {
      ...raw.wizard,
      lifecycleStage: raw.stage,
    };
  }

  const url = new URL(request.url);
  const returnPdf = wantsValuationPdfResponse({
    acceptHeader: request.headers.get('accept'),
    formatParam: url.searchParams.get('format'),
    bodyFlag: raw.returnPdf === true,
    defaultPdf: false,
  });

  const contact = resolveContactFromAuthHeader(request.headers.get('authorization'));
  const response = await executeValuationGenerate(raw, returnPdf, { request, contact });

  if (response.status !== 200) {
    return response;
  }

  const payload = (await response.json()) as Record<string, unknown>;
  const matrix = payload.forecast_matrix_json as
    | { multiples_analysis?: Record<string, unknown> }
    | undefined;
  const analysis = matrix?.multiples_analysis;

  return NextResponse.json(
    {
      ...payload,
      stage: mapWizardLifecycle(raw.wizard.lifecycleStage),
      valuationRange: analysis?.valuationRange ?? null,
      selectedMultiple: analysis?.selectedMultiple ?? null,
      multiplesUsed: analysis?.multiplesUsed ?? null,
    },
    { status: 200 },
  );
}

export function GET() {
  return appRouteMethodNotAllowed(['POST']);
}
