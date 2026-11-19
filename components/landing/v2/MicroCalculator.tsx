'use client';

import { useCopyText } from '../../../lib/copy/use_copy_text';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  computeMicroValuation,
  formatMillionsFromK,
  MICRO_SECTORS,
} from '../../../lib/landing/micro-calculator';

function rangeProgress(value: number, min: number, max: number): string {
  const p = ((value - min) / (max - min)) * 100;
  return `${p}%`;
}

const FULL_REPORT_LINES = [
  'DCF מלא עם WACC מותאם לענף ולפרופיל הסיכון שלך',
  'מטריצות רגישות: מה קורה לשווי אם WACC עולה ב-1%',
  'תרחישי Bear / Base / Bull',
  'Quality Score מפורט לפי שבעה גורמים',
] as const;

const FULL_REPORT_LINES_EN = [
  'A full DCF with a WACC fitted to your sector and risk profile',
  'Sensitivity tables: what happens to the value if WACC rises by 1%',
  'Bear / Base / Bull scenarios',
  'A detailed Quality Score across seven factors',
] as const;

const MICRO_TEXT = {
  he: { data: 'נתוני העסק', note: 'ערכים שנתיים, באלפי ₪', revenue: 'הכנסות שנתיות', margin: 'שיעור EBITDA', growth: 'צמיחה שנתית צפויה', sector: 'ענף פעילות', rough: 'הערכה גסה לפי מכפיל ענפי בלבד', gap: 'פער של', edge: 'בין קצה לקצה', central: 'אינדיקציה מרכזית (מכפיל בלבד)', ebitda: 'EBITDA שנתי', mult: 'מכפיל אפקטיבי', adds: 'מה הדוח המלא מוסיף', cta: 'צמצם את הפער: הדוח המלא', disc: '' },
  en: { data: 'Your business', note: 'Annual figures, in ILS thousands', revenue: 'Annual revenue', margin: 'EBITDA margin', growth: 'Expected annual growth', sector: 'Sector', rough: 'A rough estimate from a sector multiple only', gap: 'A gap of', edge: 'from end to end', central: 'Central indication (multiple only)', ebitda: 'Annual EBITDA', mult: 'Effective multiple', adds: 'What the full report adds', cta: 'Close the gap: the full report', disc: 'An algorithmic indication only, not investment advice or an accounting opinion.' },
} as const;

const MICRO_SECTOR_EN: Record<string, string> = { services: 'Services', tech: 'Technology / SaaS', retail: 'Retail and trade', industry: 'Industry' };

function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" className="co-lock-icon">
      <rect x="3" y="6" width="8" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.2" fill="none" />
      <path
        d="M5 6V4.5a2 2 0 0 1 4 0V6"
        stroke="currentColor"
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function MicroCalculator({ lang = 'he', wizardHref = '/wizard' }: { lang?: 'he' | 'en'; wizardHref?: string } = {}) {
  const { tx, copyV2 } = useCopyText(lang);
  // Round 13: English words for /en (Hebrew is today's text).
  const T = MICRO_TEXT[lang];
  const [revenueK, setRevenueK] = useState(8000);
  const [marginPct, setMarginPct] = useState(18);
  const [growthPct, setGrowthPct] = useState(12);
  const [sectorId, setSectorId] = useState<(typeof MICRO_SECTORS)[number]['id']>('services');

  const sectorMultiplier =
    MICRO_SECTORS.find((s) => s.id === sectorId)?.multiplier ?? 1;

  const result = useMemo(
    () =>
      computeMicroValuation({
        revenueK,
        margin: marginPct / 100,
        growth: growthPct / 100,
        sectorMultiplier,
      }),
    [revenueK, marginPct, growthPct, sectorMultiplier],
  );

  return (
    <div className="calc-box rv">
      <div className="calc-ctrl">
        <h3>{T.data}</h3>
        <p className="c-note">{T.note}</p>

        <div className="cfield">
          <div className="cf-top">
            <label htmlFor="rRev">{T.revenue}</label>
            <output id="oRev">₪{formatMillionsFromK(revenueK)}M</output>
          </div>
          <input
            type="range"
            id="rRev"
            min={500}
            max={50000}
            step={100}
            value={revenueK}
            style={{ ['--p' as string]: rangeProgress(revenueK, 500, 50000) }}
            onChange={(e) => setRevenueK(Number(e.target.value))}
          />
        </div>

        <div className="cfield">
          <div className="cf-top">
            <label htmlFor="rMar">{T.margin}</label>
            <output id="oMar">{marginPct}%</output>
          </div>
          <input
            type="range"
            id="rMar"
            min={2}
            max={45}
            step={1}
            value={marginPct}
            style={{ ['--p' as string]: rangeProgress(marginPct, 2, 45) }}
            onChange={(e) => setMarginPct(Number(e.target.value))}
          />
        </div>

        <div className="cfield">
          <div className="cf-top">
            <label htmlFor="rGro">{T.growth}</label>
            <output id="oGro">{growthPct}%</output>
          </div>
          <input
            type="range"
            id="rGro"
            min={-5}
            max={40}
            step={1}
            value={growthPct}
            style={{ ['--p' as string]: rangeProgress(growthPct, -5, 40) }}
            onChange={(e) => setGrowthPct(Number(e.target.value))}
          />
        </div>

        <div className="cfield">
          <div className="cf-top">
            <label>{T.sector}</label>
          </div>
          <div className="cseg" id="sector" role="group" aria-label={T.sector}>
            {MICRO_SECTORS.map((sector) => (
              <button
                key={sector.id}
                type="button"
                className={sectorId === sector.id ? 'on' : ''}
                onClick={() => setSectorId(sector.id)}
              >
                {lang === 'he' ? sector.label : MICRO_SECTOR_EN[sector.id]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="calc-out">
        <span className="co-label">{T.rough}</span>

        <div className="co-range co-range-primary">
          <div className="co-range-hero" dir="ltr">
            <span id="crLow">₪{result.lowM.toFixed(1)}M</span>
            <span className="co-range-sep">{lang === 'he' ? (copyV2 ? 'עד' : '–') : 'to'}</span>
            <span id="crHigh">₪{result.highM.toFixed(1)}M</span>
          </div>
          <p className="co-spread" dir="rtl">
            {T.gap}{' '}
            <span className="co-spread-val" dir="ltr">
              ₪{result.spreadM.toFixed(1)}M
            </span>{' '}
            {T.edge}
          </p>
          <div className="cr-bar">
            <div className="cr-fill" id="crFill" style={{ left: '14%', right: '14%' }} />
            <div className="cr-dot" id="crDot" style={{ left: `${result.dotPct}%` }} />
          </div>
        </div>

        <div className="co-val co-val-secondary">
          <span className="co-val-note">{T.central}</span>
          <span className="co-val-amount" dir="ltr">
            <span id="calcVal">{result.equityM.toFixed(1)}</span>M ₪
          </span>
        </div>

        <div className="co-meta">
          <div>
            <b id="mEbitda">₪{result.ebitdaM.toFixed(2)}M</b>
            <span>{T.ebitda}</span>
          </div>
          <div>
            <b id="mMult">×{result.mult.toFixed(1)}</b>
            <span>{T.mult}</span>
          </div>
          <div>
            <b id="mGrade">{result.grade}</b>
            <span>Quality Score</span>
          </div>
        </div>

        <div className="co-locked">
          <p className="co-locked-title">{T.adds}</p>
          <ul className="co-locked-list">
            {(lang === 'he' ? FULL_REPORT_LINES : FULL_REPORT_LINES_EN).map((line) => (
              <li key={line}>
                <LockIcon />
                <span>{tx(line)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="co-cta">
          <Link className="btn magnetic" href={wizardHref}>
            {T.cta} <span className="arr">{lang === 'he' ? '←' : '→'}</span>
          </Link>
        </div>
        <p className="co-disc">
          {lang === 'he' ? tx('אינדיקציה אלגוריתמית בלבד · אינה ייעוץ השקעות או חוות דעת חשבונאית') : T.disc}
        </p>
      </div>
    </div>
  );
}
