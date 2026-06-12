import type { ForecastMatrixWithDiagnostics } from '../../valuation_forecast';
import { normalizePhoneE164 } from '../phone/normalize_e164';
import { getWizardContext } from './wizard_context';
import type { PdfClientIdentity } from './types';

export type { PdfClientIdentity };

function trim(value: string | undefined | null): string {
  return String(value ?? '').trim();
}

/**
 * Read the latest client identity from wizard_context on the forecast matrix.
 * Call immediately before PDF generation so the capture reflects verified lead data.
 */
export function harvestPdfClientIdentity(
  matrix: ForecastMatrixWithDiagnostics,
): PdfClientIdentity {
  const wizard = getWizardContext(matrix);
  const ids = wizard.user_identifiers;
  const companyName =
    trim(wizard.company_name) || trim(matrix.meta.company_name);

  return {
    fullName: trim(wizard.full_name),
    companyName,
    nationalId: trim(ids?.national_id),
    corporateTaxId: trim(ids?.corporate_tax_id),
    userPhone: normalizePhoneE164(trim(ids?.mobile_phone)),
    userEmail: trim(ids?.email).toLowerCase(),
  };
}

/**
 * Merge harvested identity into the matrix payload sent to the PDF API
 * so server-side Puppeteer HTML uses the same verified fields.
 */
export function applyPdfClientIdentityToMatrix(
  matrix: ForecastMatrixWithDiagnostics,
  identity: PdfClientIdentity,
): ForecastMatrixWithDiagnostics {
  const existingWizard = matrix.wizard_context ?? getWizardContext(matrix);
  const existingIds = existingWizard.user_identifiers;

  return {
    ...matrix,
    meta: {
      ...matrix.meta,
      company_name: identity.companyName || matrix.meta.company_name,
    },
    wizard_context: {
      ...existingWizard,
      full_name: identity.fullName || existingWizard.full_name,
      company_name: identity.companyName || existingWizard.company_name,
      user_identifiers: {
        mobile_phone: identity.userPhone || existingIds?.mobile_phone || '',
        national_id: identity.nationalId || existingIds?.national_id || '',
        corporate_tax_id:
          identity.corporateTaxId || existingIds?.corporate_tax_id || '',
        email: identity.userEmail || existingIds?.email || '',
        validated: existingIds?.validated ?? false,
      },
    },
  };
}
