import { NextResponse } from 'next/server';
import { resolveEquifySectorKey } from '../../../../lib/i18n/equify_report_copy';
import type { EquifySectorKey } from '../../../../lib/valuation';
import { fetchSectorMetrics } from '../../../../lib/utils/financialData';

export const runtime = 'nodejs';

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const rawSector = searchParams.get('sector') ?? 'other';
  const sector = resolveEquifySectorKey(rawSector) as EquifySectorKey;
  const metrics = await fetchSectorMetrics(sector);

  return NextResponse.json(metrics, {
    headers: {
      'Cache-Control': 'private, max-age=900',
    },
  });
}
