import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { fetchYahooIsraelMultiples, computeIsraelMedianByIndustry } from '../../../../lib/market-data/yahoo-israel';
import { computeBlendedMultiples } from '../../../../lib/market-data/compute-multiples';
import { DAMODARAN_2026_FALLBACK } from '../../../../lib/market-data/damodaran';

const INDUSTRIES = ['saas','fintech','healthtech','cyber','realestate','construction','manufacturing','retail','food','professional_services','defense','energy','other'];

export async function GET(req: Request) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  try {
    // 1. Fetch Yahoo Israel data
    const yahooSnapshots = await fetchYahooIsraelMultiples();
    const yahooByIndustry = computeIsraelMedianByIndustry(yahooSnapshots);

    // 2. Compute blended multiples for all industries
    const computedMultiples: Record<string, ReturnType<typeof computeBlendedMultiples>> = {};
    for (const industry of INDUSTRIES) {
      computedMultiples[industry] = computeBlendedMultiples(industry, yahooByIndustry[industry]);
    }

    // 3. Save snapshot to Supabase
    const { error } = await supabase
      .from('market_data_snapshots')
      .upsert({
        snapshot_date: new Date().toISOString().split('T')[0],
        damodaran_ev_ebitda: DAMODARAN_2026_FALLBACK,
        yahoo_israel_multiples: yahooByIndustry,
        computed_multiples: computedMultiples,
        crp_israel: 0.028,
        risk_free_rate: 0.045,
      }, { onConflict: 'snapshot_date' });

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      industriesUpdated: INDUSTRIES.length,
      yahooTickers: yahooSnapshots.length,
      snapshotDate: new Date().toISOString().split('T')[0],
    });

  } catch (err) {
    console.warn('[cron/refresh-market-data]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
