import { NextResponse } from 'next/server';
import type { ForecastMatrixWithDiagnostics } from '../../../../../valuation_forecast';
import {
  appRouteMethodNotAllowed,
  jsonError,
} from '../../../../../lib/api/http';
import { getInMemoryValuation } from '../../../../../lib/valuation/in_memory_store';

export async function GET(
  _request: Request,
  context: { params: { valuationId: string } },
) {
  const valuationId = context.params.valuationId;
  const cached = getInMemoryValuation(valuationId);

  if (!cached) {
    return jsonError('Valuation not found', 404, 'NOT_FOUND');
  }

  return NextResponse.json({
    valuationId,
    title: cached.companyName,
    forecast_matrix_json: cached.forecast_matrix_json,
    source: 'in_memory',
  });
}

export function POST() {
  return appRouteMethodNotAllowed(['GET']);
}
