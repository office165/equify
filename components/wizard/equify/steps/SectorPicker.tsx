'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ValuationLocale } from '../../../../api_client';
import type { EquifySectorKey } from '../../../../lib/valuation';
import {
  INDUSTRY_CONFIG,
  SECTOR_SELECT_OPTIONS,
  getSubSectorChipLabel,
  getSubSectorValuationProfile,
  getSubSectorsForSector,
} from '../../../../lib/constants/industry_config';
import { scheduleClientProductEvent } from '../../../../lib/analytics/track_event_client';
import {
  CUSTOMER_TYPE_OPTIONS,
  REVENUE_SOURCE_OPTIONS,
  countUniqueSubSectors,
  resolveFastPathSuggestions,
  type CustomerTypeKey,
  type RevenueSourceKey,
} from '../../../../lib/wizard/sector_fast_path';
import {
  filterSectorsByQuery,
  type SectorSuggestHit,
} from '../../../../lib/wizard/sector_suggest';
import { IndustryInsightCard } from './IndustryInsightCard';

export type SectorPickPath = 'fast' | 'manual' | 'freetext';

export interface SectorPickerProps {
  sector: EquifySectorKey;
  subSector: string;
  locale: ValuationLocale;
  isHe: boolean;
  sectorError?: boolean;
  industryInsightCopy: React.ComponentProps<
    typeof IndustryInsightCard
  >['copy'];
  strings: {
    sector: string;
    sectorSearch: string;
    sectorSearchPlaceholder: string;
    sectorNoResults: string;
    selectSector: string;
    selectSubSector: string;
    subSector: string;
    unsureHint: string;
    unsurePlaceholder: string;
    unsureSubmit: string;
    unsureEmpty: string;
    unsureError: string;
  };
  onSelect: (next: {
    sector: EquifySectorKey;
    subSector: string;
    path: SectorPickPath;
  }) => void;
}

type PickerMode = 'fast' | 'manual' | 'freetext';

function formatMultiple(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(1);
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  return reduced;
}

export function SectorPicker({
  sector,
  subSector,
  locale,
  isHe,
  sectorError,
  industryInsightCopy,
  strings,
  onSelect,
}: SectorPickerProps) {
  const reducedMotion = usePrefersReducedMotion();
  const subSectorCount = useMemo(() => countUniqueSubSectors(), []);

  const [mode, setMode] = useState<PickerMode>('fast');
  const [revenue, setRevenue] = useState<RevenueSourceKey | null>(null);
  const [customer, setCustomer] = useState<CustomerTypeKey | null>(null);
  const [rangeDecision, setRangeDecision] = useState<
    'pending' | 'confirmed' | 'rejected' | 'skipped'
  >('pending');

  const [sectorQuery, setSectorQuery] = useState('');
  const [unsureText, setUnsureText] = useState('');
  const [suggestHits, setSuggestHits] = useState<SectorSuggestHit[]>([]);
  const [suggestBusy, setSuggestBusy] = useState(false);
  const [suggestPhase, setSuggestPhase] = useState<'read' | 'match'>('read');
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [suggestReveal, setSuggestReveal] = useState(false);
  const suggestTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoAppliedComboRef = useRef<string | null>(null);

  const sectors = useMemo(
    () =>
      SECTOR_SELECT_OPTIONS.map((s) => ({
        key: s.key,
        label: isHe ? s.labelHe : s.labelEn,
      })),
    [isHe],
  );

  const sectorFilter = useMemo(
    () => filterSectorsByQuery(sectorQuery),
    [sectorQuery],
  );
  const visibleSectors = useMemo(() => {
    if (!sectorFilter) return sectors;
    const keys = new Set(sectorFilter.map((hit) => hit.sector));
    if (sector) keys.add(sector);
    return sectors.filter((s) => keys.has(s.key));
  }, [sector, sectorFilter, sectors]);

  const subSectors = getSubSectorsForSector(sector);
  const visibleSubSectors = useMemo(() => {
    if (!sectorFilter || !sector) return subSectors;
    const hit = sectorFilter.find((row) => row.sector === sector);
    if (!hit) return subSectors;
    return subSectors.filter(
      (s) => hit.subSectorIds.includes(s.id) || s.id === subSector,
    );
  }, [sector, subSector, sectorFilter, subSectors]);

  const showIndustryInsight = Boolean(sector && subSector);
  const noSectorHits = Boolean(sectorFilter && sectorFilter.length === 0);

  const fastSuggestions = useMemo(() => {
    if (!revenue || !customer) return [];
    return resolveFastPathSuggestions(revenue, customer);
  }, [revenue, customer]);

  const fastNoMatch =
    Boolean(revenue && customer) && fastSuggestions.length === 0;

  useEffect(() => {
    if (fastNoMatch && mode === 'fast') {
      setMode('manual');
      scheduleClientProductEvent('sector_manual_used', {
        reason: 'fast_path_no_match',
      });
    }
  }, [fastNoMatch, mode]);

  useEffect(() => {
    if (!revenue || !customer || fastSuggestions.length === 0) return;
    const comboKey = `${revenue}:${customer}:${fastSuggestions
      .map((h) => `${h.sector}/${h.subSector}`)
      .join(',')}`;
    if (autoAppliedComboRef.current === comboKey) return;
    autoAppliedComboRef.current = comboKey;
    const first = fastSuggestions[0];
    onSelect({
      sector: first.sector,
      subSector: first.subSector,
      path: 'fast',
    });
    scheduleClientProductEvent('sector_fast_path_used', {
      revenue,
      customer,
      sector: first.sector,
      subSector: first.subSector,
    });
  }, [revenue, customer, fastSuggestions, onSelect]);

  useEffect(() => {
    setRangeDecision('pending');
  }, [sector, subSector]);

  const multipleMeta = useMemo(() => {
    if (!sector || !subSector) return null;
    const profile = getSubSectorValuationProfile(sector, subSector);
    if (!profile?.multipleRange) return null;
    const unit =
      profile.primaryMultiple === 'ev_revenue'
        ? 'Revenue'
        : profile.primaryMultiple === 'pbv'
          ? 'P/B'
          : profile.primaryMultiple === 'nav'
            ? 'NAV'
            : 'EBITDA';
    return { range: profile.multipleRange, unit };
  }, [sector, subSector]);

  const applySelection = useCallback(
    (
      nextSector: EquifySectorKey,
      nextSub: string,
      path: SectorPickPath,
    ) => {
      onSelect({ sector: nextSector, subSector: nextSub, path });
      if (path === 'manual') {
        scheduleClientProductEvent('sector_manual_used', {
          sector: nextSector,
          subSector: nextSub,
        });
      } else if (path === 'freetext') {
        scheduleClientProductEvent('sector_freetext_used', {
          sector: nextSector,
          subSector: nextSub,
        });
      }
    },
    [onSelect],
  );

  const handleSectorChip = useCallback(
    (key: EquifySectorKey) => {
      const firstSub = getSubSectorsForSector(key)[0]?.id ?? '';
      applySelection(key, firstSub, 'manual');
    },
    [applySelection],
  );

  const handleSubSectorChip = useCallback(
    (id: string) => {
      applySelection(sector, id, 'manual');
    },
    [applySelection, sector],
  );

  const handleFastPick = useCallback(
    (hit: (typeof fastSuggestions)[number]) => {
      applySelection(hit.sector, hit.subSector, 'fast');
      scheduleClientProductEvent('sector_fast_path_used', {
        revenue,
        customer,
        sector: hit.sector,
        subSector: hit.subSector,
        picked: true,
      });
    },
    [applySelection, customer, revenue],
  );

  const handleUnsureSuggest = useCallback(async () => {
    setSuggestBusy(true);
    setSuggestError(null);
    setSuggestHits([]);
    setSuggestReveal(false);
    setSuggestPhase('read');
    if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current);
    suggestTimerRef.current = setTimeout(() => {
      setSuggestPhase('match');
    }, 2500);

    try {
      const res = await fetch('/api/v1/sector/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: unsureText }),
      });
      if (!res.ok) {
        setSuggestError(strings.unsureError);
        return;
      }
      const json = (await res.json()) as { suggestions?: SectorSuggestHit[] };
      const hits = json.suggestions ?? [];
      setSuggestHits(hits);
      if (hits.length === 0) setSuggestError(strings.unsureEmpty);
      else {
        // allow CSS enter animation
        requestAnimationFrame(() => setSuggestReveal(true));
      }
    } catch {
      setSuggestHits([]);
      setSuggestError(strings.unsureError);
    } finally {
      if (suggestTimerRef.current) {
        clearTimeout(suggestTimerRef.current);
        suggestTimerRef.current = null;
      }
      setSuggestBusy(false);
    }
  }, [strings.unsureEmpty, strings.unsureError, unsureText]);

  useEffect(() => {
    return () => {
      if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current);
    };
  }, []);

  // Keyboard: 1–4 / Enter for fast-path questions
  useEffect(() => {
    if (mode !== 'fast') return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (!revenue) {
        const idx = Number(e.key) - 1;
        if (idx >= 0 && idx < REVENUE_SOURCE_OPTIONS.length) {
          e.preventDefault();
          setRevenue(REVENUE_SOURCE_OPTIONS[idx].key);
        }
        return;
      }
      if (!customer) {
        const idx = Number(e.key) - 1;
        if (idx >= 0 && idx < CUSTOMER_TYPE_OPTIONS.length) {
          e.preventDefault();
          setCustomer(CUSTOMER_TYPE_OPTIONS[idx].key);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [customer, mode, revenue]);

  const openManual = useCallback(() => {
    setMode('manual');
    scheduleClientProductEvent('sector_manual_used', { via: 'toggle' });
  }, []);

  const openFreetext = useCallback(() => {
    setMode('freetext');
  }, []);

  const backToFast = useCallback(() => {
    setMode('fast');
  }, []);

  const confirmRange = useCallback(() => {
    setRangeDecision('confirmed');
    scheduleClientProductEvent('sector_range_confirmed', {
      sector,
      subSector,
    });
  }, [sector, subSector]);

  const rejectRange = useCallback(() => {
    setRangeDecision('rejected');
    scheduleClientProductEvent('sector_range_rejected', {
      sector,
      subSector,
    });
    setMode('manual');
  }, [sector, subSector]);

  const motionClass = reducedMotion ? ' sp-reduced' : '';

  return (
    <div className={`sector-picker${motionClass}`} style={{ marginTop: 28 }}>
      <div className="field">
        <label>
          {strings.sector} <span className="req">*</span>
        </label>
        {sectorError ? (
          <span className="v-msg err show" role="alert">
            {isHe ? 'נא לבחור ענף' : 'Please select a sector'}
          </span>
        ) : null}

        {mode === 'fast' ? (
          <div className="sp-fast" aria-live="polite">
            <div
              className="sp-q"
              role="radiogroup"
              aria-label={
                isHe ? 'ממה מגיע רוב ההכנסה?' : 'Where does most revenue come from?'
              }
            >
              <p className="sp-q-title">
                {isHe
                  ? 'ממה מגיע רוב ההכנסה?'
                  : 'Where does most revenue come from?'}
              </p>
              <div className="sp-options">
                {REVENUE_SOURCE_OPTIONS.map((opt, i) => {
                  const selected = revenue === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      className={`sp-option${selected ? ' on' : ''}`}
                      onClick={() => {
                        setRevenue(opt.key);
                        setCustomer(null);
                      }}
                    >
                      <span className="sp-option-index" aria-hidden>
                        {i + 1}
                      </span>
                      <span>{isHe ? opt.labelHe : opt.labelEn}</span>
                    </button>
                  );
                })}
              </div>
              <p className="sp-kbd-hint">
                {isHe ? 'אפשר גם עם המקלדת' : 'Keyboard shortcuts work too'}
              </p>
            </div>

            {revenue ? (
              <div
                className="sp-q sp-q-enter"
                role="radiogroup"
                aria-label={
                  isHe ? 'מי הלקוח העיקרי?' : 'Who is the primary customer?'
                }
              >
                <p className="sp-q-title">
                  {isHe ? 'מי הלקוח העיקרי?' : 'Who is the primary customer?'}
                </p>
                <div className="sp-options sp-options-3">
                  {CUSTOMER_TYPE_OPTIONS.map((opt, i) => {
                    const selected = customer === opt.key;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        className={`sp-option${selected ? ' on' : ''}`}
                        onClick={() => setCustomer(opt.key)}
                      >
                        <span className="sp-option-index" aria-hidden>
                          {i + 1}
                        </span>
                        <span>{isHe ? opt.labelHe : opt.labelEn}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {revenue && customer ? (
              <div className="sp-echo sp-q-enter">
                <p className="sp-echo-label">
                  {isHe ? 'לפי מה שסיפרת' : 'Based on what you shared'}
                </p>
                <div className="sp-echo-chips">
                  <span className="sp-echo-chip">
                    {isHe
                      ? REVENUE_SOURCE_OPTIONS.find((o) => o.key === revenue)
                          ?.labelHe
                      : REVENUE_SOURCE_OPTIONS.find((o) => o.key === revenue)
                          ?.labelEn}
                  </span>
                  <span className="sp-echo-chip">
                    {isHe
                      ? CUSTOMER_TYPE_OPTIONS.find((o) => o.key === customer)
                          ?.labelHe
                      : CUSTOMER_TYPE_OPTIONS.find((o) => o.key === customer)
                          ?.labelEn}
                  </span>
                </div>

                {fastNoMatch ? (
                  <p className="sp-nomatch">
                    {isHe
                      ? 'לא מצאנו התאמה מדויקת… נעבור לבחירה ידנית.'
                      : 'No exact match… switching to manual selection.'}
                  </p>
                ) : (
                  <>
                    <p className="sp-suggest-heading">
                      {isHe ? 'זה נראה כמו:' : 'This looks like:'}
                    </p>
                    <div className="sp-suggest-cards" role="list">
                      {fastSuggestions.map((hit, idx) => {
                        const selected =
                          sector === hit.sector && subSector === hit.subSector;
                        const sectorLabel = isHe
                          ? INDUSTRY_CONFIG[hit.sector].chipLabelHe
                          : INDUSTRY_CONFIG[hit.sector].chipLabelEn;
                        return (
                          <button
                            key={`${hit.sector}-${hit.subSector}`}
                            type="button"
                            role="listitem"
                            className={`sp-suggest-card${selected ? ' on' : ''}`}
                            style={
                              reducedMotion
                                ? undefined
                                : { animationDelay: `${idx * 60}ms` }
                            }
                            onClick={() => handleFastPick(hit)}
                          >
                            {selected ? (
                              <span className="sp-suggest-mark" aria-hidden />
                            ) : null}
                            <span className="sp-suggest-title">
                              {sectorLabel} ·{' '}
                              {isHe ? hit.labelHe : hit.labelEn}
                            </span>
                            <span className="sp-suggest-reason">
                              {isHe ? hit.reasonHe : hit.reasonEn}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            ) : null}

            <div className="sp-alt-links">
              <button type="button" className="sp-link" onClick={openManual}>
                {isHe
                  ? 'אני יודע את הענף שלי — בחירה ידנית'
                  : 'I know my sector — choose manually'}
              </button>
              <button type="button" className="sp-link" onClick={openFreetext}>
                {isHe ? 'תאר במילים שלך' : 'Describe in your own words'}
              </button>
            </div>
          </div>
        ) : null}

        {mode === 'manual' ? (
          <div className="sp-manual sp-q-enter">
            <button type="button" className="sp-link sp-back" onClick={backToFast}>
              {isHe ? '← חזרה לשאלות הקצרות' : '← Back to quick questions'}
            </button>
            <input
              className="inp sector-search"
              type="search"
              value={sectorQuery}
              onChange={(e) => setSectorQuery(e.target.value)}
              placeholder={strings.sectorSearchPlaceholder}
              aria-label={strings.sectorSearch}
              autoComplete="off"
            />
            <div className="chips" role="group" aria-label={strings.selectSector}>
              {visibleSectors.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  className={`chip${sector === s.key ? ' on' : ''}`}
                  onClick={() => handleSectorChip(s.key)}
                >
                  {s.label}
                </button>
              ))}
            </div>
            {noSectorHits && visibleSectors.length === 0 ? (
              <span className="v-msg err show">{strings.sectorNoResults}</span>
            ) : null}
            <button
              type="button"
              className="sp-link"
              style={{ marginTop: 10 }}
              onClick={openFreetext}
            >
              {isHe ? 'תאר במילים שלך' : 'Describe in your own words'}
            </button>
          </div>
        ) : null}

        {mode === 'freetext' ? (
          <div className="sp-freetext unsure-sector-panel sp-q-enter">
            <button type="button" className="sp-link sp-back" onClick={backToFast}>
              {isHe ? '← חזרה לשאלות הקצרות' : '← Back to quick questions'}
            </button>
            <p className="unsure-sector-hint">{strings.unsureHint}</p>
            <textarea
              className="inp"
              value={unsureText}
              onChange={(e) => setUnsureText(e.target.value)}
              placeholder={strings.unsurePlaceholder}
              maxLength={400}
              rows={3}
            />
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ marginTop: 10 }}
              disabled={suggestBusy || unsureText.trim().length < 5}
              onClick={() => void handleUnsureSuggest()}
            >
              {strings.unsureSubmit}
            </button>
            {suggestBusy ? (
              <p className="sp-wait" aria-live="polite">
                {suggestPhase === 'read'
                  ? isHe
                    ? 'קורא את התיאור'
                    : 'Reading your description'
                  : isHe
                    ? `מתאים מול ${subSectorCount} תתי-ענפים`
                    : `Matching against ${subSectorCount} sub-sectors`}
                <span className="sp-dots" aria-hidden>
                  <span />
                  <span />
                  <span />
                </span>
              </p>
            ) : null}
            {suggestError ? (
              <p className="v-msg err show" style={{ marginTop: 8 }}>
                {suggestError}
              </p>
            ) : null}
            {suggestHits.length > 0 ? (
              <div
                className={`suggest-hits sp-freetext-hits${suggestReveal ? ' show' : ''}`}
                role="list"
              >
                {suggestHits.map((hit, idx) => {
                  const sectorLabel = isHe
                    ? INDUSTRY_CONFIG[hit.sector].chipLabelHe
                    : INDUSTRY_CONFIG[hit.sector].chipLabelEn;
                  return (
                    <button
                      key={`${hit.sector}-${hit.subSector}`}
                      type="button"
                      className="suggest-hit sp-freetext-hit"
                      style={
                        reducedMotion
                          ? undefined
                          : { animationDelay: `${idx * 60}ms` }
                      }
                      onClick={() =>
                        applySelection(hit.sector, hit.subSector, 'freetext')
                      }
                    >
                      <span className="sp-suggest-title">
                        {sectorLabel} · {isHe ? hit.labelHe : hit.labelEn}
                      </span>
                      {hit.reason ? (
                        <span className="sp-suggest-reason">{hit.reason}</span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ) : null}
            <button
              type="button"
              className="sp-link"
              style={{ marginTop: 10 }}
              onClick={openManual}
            >
              {isHe
                ? 'אני יודע את הענף שלי — בחירה ידנית'
                : 'I know my sector — choose manually'}
            </button>
          </div>
        ) : null}
      </div>

      {mode === 'manual' && subSectors.length > 0 ? (
        <div className="field" style={{ marginTop: 16 }}>
          <label>
            {strings.subSector} <span className="req">*</span>
          </label>
          <div
            className="chips chips-sub-sectors"
            role="group"
            aria-label={strings.selectSubSector}
            dir={isHe ? 'rtl' : 'ltr'}
          >
            {visibleSubSectors.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`chip${subSector === s.id ? ' on' : ''}`}
                onClick={() => handleSubSectorChip(s.id)}
                dir={isHe ? 'rtl' : 'ltr'}
                lang={isHe ? 'he' : 'en'}
              >
                {getSubSectorChipLabel(sector, s, locale)}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {showIndustryInsight ? (
        <>
          <IndustryInsightCard
            sector={sector}
            subSector={subSector}
            locale={locale}
            copy={industryInsightCopy}
          />
          {multipleMeta && rangeDecision === 'pending' ? (
            <div className="sp-range-confirm" aria-live="polite">
              <p className="sp-range-text">
                {isHe
                  ? `עסקים בענף הזה נסחרים בטווח ${formatMultiple(multipleMeta.range[0])}x–${formatMultiple(multipleMeta.range[1])}x ${multipleMeta.unit}. האם זה נשמע הגיוני לעסק שלך?`
                  : `Businesses in this sector typically trade at ${formatMultiple(multipleMeta.range[0])}x–${formatMultiple(multipleMeta.range[1])}x ${multipleMeta.unit}. Does that sound right for yours?`}
              </p>
              <div className="sp-range-actions">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={confirmRange}
                >
                  {isHe ? 'כן, מתאים' : 'Yes, that fits'}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={rejectRange}
                >
                  {isHe ? 'לא בטוח…' : 'Not sure…'}
                </button>
              </div>
            </div>
          ) : null}
          {rangeDecision === 'confirmed' ? (
            <p className="sp-range-ack" aria-live="polite">
              {isHe ? 'מעולה — ממשיכים עם הטווח הזה.' : 'Great — we will use that range.'}
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
