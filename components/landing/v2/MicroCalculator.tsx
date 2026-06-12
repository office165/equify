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
        <span className="co-label">אינדיקציית שווי לבעלים</span>
        <div className="co-val">
          <span id="calcVal">{result.equityM.toFixed(1)}</span>M ₪
        </div>
        <span className="co-label" style={{ color: 'var(--paper-dim)', letterSpacing: '.05em' }}>
          EQUITY VALUE · INDICATIVE
        </span>

        <div className="co-range">
          <div className="cr-bar">
            <div className="cr-fill" id="crFill" style={{ left: '14%', right: '14%' }} />
            <div className="cr-dot" id="crDot" style={{ left: `${result.dotPct}%` }} />
          </div>
          <div className="cr-ends">
            <span id="crLow">₪{result.lowM.toFixed(1)}M</span>
            <span id="crHigh">₪{result.highM.toFixed(1)}M</span>
          </div>
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

        <div className="co-cta">
          <Link className="btn magnetic" href="/wizard">
            קבל את הדוח המלא <span className="arr">←</span>
          </Link>
        </div>
        <p className="co-disc">
          אינדיקציה אלגוריתמית בלבד · אינה ייעוץ השקעות או חוות דעת חשבונאית
        </p>
      </div>
    </div>
  );
}
