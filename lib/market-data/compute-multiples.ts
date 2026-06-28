/**
 * Blended multiple engine: Damodaran (35%) + Yahoo Israel public (40%) + Israel private adjustment (25%)
 * Applies: DLOM 20%, size premium, CRP, post-Oct7 defense premium, Israel solar premium
 */

import { DAMODARAN_2026_FALLBACK } from './damodaran';

const ISRAEL_PRIVATE_DISCOUNT = 0.80;  // DLOM 20%
const CRP_ISRAEL_2026 = 0.028;         // Country Risk Premium

interface BlendedMultiple {
  evEbitda: [number, number];
  evSales:  [number, number];
  evEbita:  [number, number];
  pe?:      [number, number];
  sources:  { damodaran: number; yahoo: number; israelAdj: number };
  confidence: 'high' | 'medium' | 'low';
  lastUpdated: string;
}

export function computeBlendedMultiples(
  industryKey: string,
  yahooMedian: { evEbitda: number; evRevenue: number; count: number } | undefined,
): BlendedMultiple {
  const dam = DAMODARAN_2026_FALLBACK[industryKey] ?? DAMODARAN_2026_FALLBACK['other'];

  // Damodaran global base (public companies, large cap)
  const damEbitda = dam.evEbitda;
  const damSales  = dam.evSales;

  // Yahoo Israel public median (or fallback to Damodaran × 0.85 for Israel discount)
  const yahooEbitda  = yahooMedian?.evEbitda  ?? damEbitda * 0.85;
  const yahooSales   = yahooMedian?.evRevenue ?? damSales  * 0.85;
  const yahooCount   = yahooMedian?.count     ?? 0;

  // Israel private adjustment — apply DLOM + size + CRP adjustment
  const israelAdjFactor = ISRAEL_PRIVATE_DISCOUNT * (1 - CRP_ISRAEL_2026);

  // Weighted blend
  const weights = { damodaran: 0.35, yahoo: 0.40, israelAdj: 0.25 };
  const blendedEbitda =
    damEbitda   * weights.damodaran +
    yahooEbitda * weights.yahoo +
    damEbitda   * israelAdjFactor * weights.israelAdj;

  const blendedSales =
    damSales   * weights.damodaran +
    yahooSales * weights.yahoo +
    damSales   * israelAdjFactor * weights.israelAdj;

  // Sector-specific premiums
  const sectorPremium =
    industryKey === 'cyber'   ? 1.12 :  // Israel cyber global premium
    industryKey === 'defense' ? 1.08 :  // Post-Oct7 defense budget surge
    industryKey === 'energy'  ? 1.06 :  // Israel solar expansion
    industryKey === 'saas'    ? 1.04 :  // Israel tech export premium
    1.0;

  const finalEbitda = blendedEbitda * sectorPremium * ISRAEL_PRIVATE_DISCOUNT;
  const finalSales  = blendedSales  * sectorPremium * ISRAEL_PRIVATE_DISCOUNT;
  const spread = 0.30; // ±30% for bear/bull range

  return {
    evEbitda: [
      Math.round(finalEbitda * (1 - spread) * 10) / 10,
      Math.round(finalEbitda * (1 + spread) * 10) / 10,
    ],
    evSales: [
      Math.round(finalSales * (1 - spread) * 10) / 10,
      Math.round(finalSales * (1 + spread) * 10) / 10,
    ],
    evEbita: [
      Math.round(finalEbitda * 0.88 * (1 - spread) * 10) / 10,
      Math.round(finalEbitda * 0.88 * (1 + spread) * 10) / 10,
    ],
    sources: weights,
    confidence: yahooCount >= 2 ? 'high' : yahooCount === 1 ? 'medium' : 'low',
    lastUpdated: new Date().toISOString(),
  };
}
