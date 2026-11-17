import { fetchIlsPerUnitRates } from '../../../lib/utils/fx_provider';
import { FX_FALLBACK_AS_OF, STATIC_FX_FROM_ILS } from '../../../lib/utils/fxService';

export const revalidate = 3600;

export async function GET() {
  try {
    const live = await fetchIlsPerUnitRates();
    return Response.json({
      USD: live.USD,
      EUR: live.EUR,
      GBP: live.GBP,
      source: 'live',
      asOf: live.asOfDate,
      fetchedAt: new Date().toISOString(),
    });
  } catch {
    return Response.json({
      USD: 1 / STATIC_FX_FROM_ILS.USD,
      EUR: 1 / STATIC_FX_FROM_ILS.EUR,
      GBP: 1 / STATIC_FX_FROM_ILS.GBP,
      source: 'fallback',
      asOf: FX_FALLBACK_AS_OF,
      fetchedAt: new Date().toISOString(),
    });
  }
}
