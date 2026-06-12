import {
  appRouteMethodNotAllowed,
  jsonError,
} from '../../../../../../../lib/api/http';
import { CLIENT_PDF_REQUIRED_MESSAGE } from '../../../../../../../lib/pdf/valuation_report_pdf';

export async function GET(
  _request: Request,
  context: { params: { valuationId: string } },
) {
  void context.params.valuationId;

  return jsonError(CLIENT_PDF_REQUIRED_MESSAGE, 410, 'CLIENT_PDF_REQUIRED');
}

export function POST() {
  return appRouteMethodNotAllowed(['GET']);
}
