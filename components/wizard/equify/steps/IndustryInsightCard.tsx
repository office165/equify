'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { LineChart } from 'lucide-react';
import {
  getSubSectorLabel,
  getSubSectorMultAdj,
  getSubSectorValuationProfile,
  resolveSubSectorMultiplesIndustry,
} from '../../../../lib/constants/industry_config';
import type { ValuationLocale } from '../../../../api_client';
import type { EquifySectorKey } from '../../../../lib/valuation';
import { resolveSectorMethodologyConfig } from '../../../../lib/valuation/sector_methodology_resolver';
import { resolveSubSectorDefaultMultiple } from '../../../../lib/valuation/sub_sector_default_multiple';
import { ISRAEL_MULTIPLES_2026 } from '../../../../lib/valuation/multiples';
import {
  fetchSectorMetricsClient,
  getOfflineSectorMetrics,
} from '../../../../lib/wizard/sector_market_defaults';
import type { SectorMetricsResult } from '../../../../lib/utils/financialData';
import { useWizardValuation } from '../WizardValuationContext';

export interface IndustryInsightCardProps {
  sector: EquifySectorKey;
  subSector: string;
  locale: ValuationLocale;
  copy: {
    titlePrefix: string;
    ebitdaMultiple: string;
    revenueMultiple: string;
    pbvMultiple: string;
    navMultiple: string;
    industryRange: string;
    disclaimer: string;
    reDevelopment?: {
      title: string;
      subtitle: string;
      description: string;
    };
    subSectorPremium?: Partial<
      Record<
        string,
        { title: string; subtitle: string; description: string }
      >
    >;
  };
}

type PremiumMicrocopy = {
  title: string;
  subtitle: string;
  description: string;
};

function resolvePremiumMicrocopy(
  sector: EquifySectorKey,
  subSector: string,
  isHe: boolean,
  copy: IndustryInsightCardProps['copy'],
): PremiumMicrocopy | null {
  if (!isHe) return null;

  const smb = copy.subSectorPremium?.[subSector];
  if (smb) return smb;

  if (sector === 'real_estate' && subSector === 're_development' && copy.reDevelopment) {
    return copy.reDevelopment;
  }

  return null;
}

function PremiumInsightBody({ premium }: { premium: PremiumMicrocopy }) {
  return (
    <>
      <p className="text-sm font-semibold leading-snug tracking-normal text-teal-50/95">
        {premium.title}
      </p>
      <p className="text-sm leading-snug tracking-normal text-teal-100/80">
        {premium.subtitle}
      </p>
      <p className="pt-1 text-xs leading-relaxed tracking-normal text-teal-200/55">
        {premium.description}
      </p>
    </>
  );
}

function formatMultiple(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(1);
}

function formatRange(range: [number, number]): string {
  return `${formatMultiple(range[0])}x – ${formatMultiple(range[1])}x`;
}

export function IndustryInsightCard({
  sector,
  subSector,
  locale,
  copy,
}: IndustryInsightCardProps) {
  const { state, sectorMarketDefaultsPending } = useWizardValuation();
  const [metrics, setMetrics] = useState<SectorMetricsResult | null>(null);

  const marketContext = state.financials.marketContext;
  const isHe = locale === 'he';

  useEffect(() => {
    if (!sector || !subSector) {
      setMetrics(null);
      return;
    }

    if (marketContext?.sectorKey === sector) {
      setMetrics({
        sector,
        resolvedSectorKey: sector,
        evEbitda: marketContext.evEbitda,
        evRevenue: marketContext.evRevenue,
        unleveredBeta: marketContext.unleveredBeta,
        source: marketContext.source,
        fetchedAt: marketContext.fetchedAt,
      });
      return;
    }

    let cancelled = false;
    const offline = getOfflineSectorMetrics(sector);
    setMetrics(offline);

    void fetchSectorMetricsClient(sector).then((result) => {
      if (!cancelled) setMetrics(result);
    });

    return () => {
      cancelled = true;
    };
  }, [marketContext, sector, subSector]);

  const insight = useMemo(() => {
    if (!metrics) return null;

    const subSectorLabel = getSubSectorLabel(sector, subSector, locale);
    if (!subSectorLabel) return null;

    const valuationProfile = getSubSectorValuationProfile(sector, subSector);
    const multiplesIndustry = resolveSubSectorMultiplesIndustry(sector, subSector);
    const institutionalRanges = ISRAEL_MULTIPLES_2026[multiplesIndustry];

    if (valuationProfile) {
      const { primaryMultiple, multipleRange, disclaimerHe, disclaimerEn } = valuationProfile;

      if (primaryMultiple === 'pbv' || primaryMultiple === 'nav') {
        const pbvRange =
          multipleRange ??
          institutionalRanges.pbv ??
          ([0.8, 1.8] as [number, number]);
        const adjustedRange: [number, number] = [
          pbvRange[0] * getSubSectorMultAdj(sector, subSector),
          pbvRange[1] * getSubSectorMultAdj(sector, subSector),
        ];

        return {
          subSectorLabel,
          multipleLabel:
            primaryMultiple === 'nav' ? copy.navMultiple : copy.pbvMultiple,
          displayValue: formatRange(adjustedRange),
          showRangeLabel: true,
          disclaimer:
            (isHe ? disclaimerHe : disclaimerEn) ??
            copy.disclaimer,
          isPending: sectorMarketDefaultsPending && marketContext?.sectorKey !== sector,
        };
      }

      if (primaryMultiple === 'ev_ebitda' || primaryMultiple === 'ev_revenue') {
        const range =
          multipleRange ??
          (primaryMultiple === 'ev_ebitda'
            ? institutionalRanges.evEbitda
            : institutionalRanges.evSales);
        const baseMultiple =
          primaryMultiple === 'ev_ebitda'
            ? metrics.evEbitda
            : metrics.evRevenue;
        const adjusted = baseMultiple * getSubSectorMultAdj(sector, subSector);

        return {
          subSectorLabel,
          multipleLabel:
            primaryMultiple === 'ev_revenue'
              ? copy.revenueMultiple
              : copy.ebitdaMultiple,
          displayValue: multipleRange
            ? formatRange(multipleRange)
            : `${formatMultiple(adjusted)}x`,
          showRangeLabel: Boolean(multipleRange),
          disclaimer:
            (isHe ? disclaimerHe : disclaimerEn) ??
            copy.disclaimer,
          isPending: sectorMarketDefaultsPending && marketContext?.sectorKey !== sector,
        };
      }
    }

    const methodology = resolveSectorMethodologyConfig(sector, subSector);
    const prefersRevenue =
      methodology.strategy === 'current_run_rate_revenue' ||
      methodology.weightRev > methodology.weightEbitda;
    const defaultMultiple = resolveSubSectorDefaultMultiple({
      sector,
      subSector,
      sectorConfig: methodology,
      market: {
        evEbitda: metrics.evEbitda,
        evRevenue: metrics.evRevenue,
      },
    });

    return {
      subSectorLabel,
      multipleLabel: prefersRevenue ? copy.revenueMultiple : copy.ebitdaMultiple,
      displayValue: `${formatMultiple(defaultMultiple)}x`,
      showRangeLabel: false,
      disclaimer: copy.disclaimer,
      isPending: sectorMarketDefaultsPending && marketContext?.sectorKey !== sector,
    };
  }, [
    copy.disclaimer,
    copy.ebitdaMultiple,
    copy.industryRange,
    copy.navMultiple,
    copy.pbvMultiple,
    copy.revenueMultiple,
    isHe,
    locale,
    marketContext?.sectorKey,
    metrics,
    sector,
    sectorMarketDefaultsPending,
    subSector,
  ]);

  if (!insight) return null;

  const premiumMicrocopy = resolvePremiumMicrocopy(sector, subSector, isHe, copy);

  return (
    <div
      key={`${sector}-${subSector}`}
      role="note"
      aria-live="polite"
      dir={isHe ? 'rtl' : undefined}
      className="mt-6 p-4 rounded-xl bg-teal-900/10 border border-teal-800/30 flex items-start gap-4 animate-in fade-in slide-in-from-top-4 eqw-industry-insight"
    >
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-500/10 text-teal-300/90"
        aria-hidden
      >
        <LineChart className="h-[18px] w-[18px]" strokeWidth={2} />
      </div>

      <div className="min-w-0 flex-1 space-y-1">
        {premiumMicrocopy ? (
          <PremiumInsightBody premium={premiumMicrocopy} />
        ) : (
          <>
            <p className="text-sm font-semibold leading-snug tracking-normal text-teal-50/95">
              {copy.titlePrefix}: {insight.subSectorLabel}
            </p>
            <p className="text-sm leading-snug tracking-normal text-teal-100/80">
              {insight.multipleLabel}
              {!insight.showRangeLabel ? (
                <>
                  :{' '}
                  <span className="mono font-medium text-teal-200/95">
                    {insight.isPending ? '…' : insight.displayValue}
                  </span>
                </>
              ) : null}
            </p>
            {insight.showRangeLabel ? (
              <p className="text-sm leading-snug tracking-normal text-teal-100/80">
                {copy.industryRange}:{' '}
                <span className="mono font-medium text-teal-200/95">
                  {insight.isPending ? '…' : insight.displayValue}
                </span>
              </p>
            ) : null}
            <p className="pt-1 text-xs leading-relaxed tracking-normal text-teal-200/55">
              {insight.disclaimer}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
