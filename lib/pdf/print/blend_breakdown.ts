import type { ValuationReportData } from '../types';
import { escHtml, fmtMoneyCompact } from './print_formatters';

export function formatBlendBreakdownText(opts: {
  evDcf: number;
  evMultiples: number;
  dcfWeight: number;
  multWeight: number;
  dampenedLabelHe?: string;
}): string | null {
  const { evDcf, evMultiples, dcfWeight, multWeight, dampenedLabelHe } = opts;
  if (multWeight <= 0) {
    return dampenedLabelHe
      ? `${dampenedLabelHe} — שקלול מכפילים הופחת עקב חריגה`
      : null;
  }
  const dcfPct = Math.round(dcfWeight * 100);
  const multPct = Math.round(multWeight * 100);
  return `DCF ${fmtMoneyCompact(evDcf)} × ${dcfPct}% + מכפילים ${fmtMoneyCompact(evMultiples)} × ${multPct}%`;
}

export function buildBlendBreakdownLine(data: ValuationReportData): string | null {
  const weights = data.blendWeights;
  const evDcf = data.evDcf;
  if (!weights || evDcf == null) {
    return data.weightingLabelHe ? escHtml(data.weightingLabelHe) : null;
  }

  const multEv =
    data.evMultiplesMedian ??
    (weights.multiples > 0
      ? (data.baseEV - weights.dcf * evDcf) / weights.multiples
      : 0);

  const line = formatBlendBreakdownText({
    evDcf,
    evMultiples: multEv,
    dcfWeight: weights.dcf,
    multWeight: weights.multiples,
    dampenedLabelHe: data.weightingLabelHe,
  });

  return line ? escHtml(line) : null;
}
