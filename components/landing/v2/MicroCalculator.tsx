'use client';

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

export function MicroCalculator() {
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
        <h3>נתוני העסק</h3>
        <p className="c-note">ערכים שנתיים, באלפי ₪</p>

        <div className="cfield">
          <div className="cf-top">
            <label htmlFor="rRev">הכנסות שנתיות</label>
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
            <label htmlFor="rMar">שיעור EBITDA</label>
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
            <label htmlFor="rGro">צמיחה שנתית צפויה</label>
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
            <label>ענף פעילות</label>
          </div>
          <div className="cseg" id="sector" role="group" aria-label="ענף פעילות">
            {MICRO_SECTORS.map((sector) => (
              <button
                key={sector.id}
                type="button"
                className={sectorId === sector.id ? 'on' : ''}
                onClick={() => setSectorId(sector.id)}
              >
                {sector.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="calc-out">
        <span className="co-label">הערכה גסה לפי מכפיל ענפי בלבד</span>

        <div className="co-range co-range-primary">
          <div className="co-range-hero" dir="ltr">
            <span id="crLow">₪{result.lowM.toFixed(1)}M</span>
            <span className="co-range-sep">–</span>
            <span id="crHigh">₪{result.highM.toFixed(1)}M</span>
          </div>
          <p className="co-spread" dir="rtl">
            פער של{' '}
            <span className="co-spread-val" dir="ltr">
              ₪{result.spreadM.toFixed(1)}M
            </span>{' '}
            בין קצה לקצה
          </p>
          <div className="cr-bar">
            <div className="cr-fill" id="crFill" style={{ left: '14%', right: '14%' }} />
            <div className="cr-dot" id="crDot" style={{ left: `${result.dotPct}%` }} />
          </div>
        </div>

        <div className="co-val co-val-secondary">
          <span className="co-val-note">אינדיקציה מרכזית (מכפיל בלבד)</span>
          <span className="co-val-amount" dir="ltr">
            <span id="calcVal">{result.equityM.toFixed(1)}</span>M ₪
          </span>
        </div>

        <div className="co-meta">
          <div>
            <b id="mEbitda">₪{result.ebitdaM.toFixed(2)}M</b>
            <span>EBITDA שנתי</span>
          </div>
          <div>
            <b id="mMult">×{result.mult.toFixed(1)}</b>
            <span>מכפיל אפקטיבי</span>
          </div>
          <div>
            <b id="mGrade">{result.grade}</b>
            <span>Quality Score</span>
          </div>
        </div>

        <div className="co-locked">
          <p className="co-locked-title">מה הדוח המלא מוסיף</p>
          <ul className="co-locked-list">
            {FULL_REPORT_LINES.map((line) => (
              <li key={line}>
                <LockIcon />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="co-cta">
          <Link className="btn magnetic" href="/wizard">
            צמצם את הפער: הדוח המלא <span className="arr">←</span>
          </Link>
        </div>
        <p className="co-disc">
          אינדיקציה אלגוריתמית בלבד · אינה ייעוץ השקעות או חוות דעת חשבונאית
        </p>
      </div>
    </div>
  );
}
