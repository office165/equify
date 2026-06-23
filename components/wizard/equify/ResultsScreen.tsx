'use client';

import React, { useMemo } from 'react';
import {
  fmtEquitySidebarM,
  fmtK,
  terminalValuePct,
} from '../../../lib/valuation';
import { computeNetDebtK } from '../../../lib/wizard/map_equify_wizard';
import { useWizardValuation } from './WizardValuationContext';

export interface ResultsScreenProps {
  onDownloadPdf: () => void;
  onNewValuation: () => void;
  isDownloadingPdf?: boolean;
}

export function ResultsScreen({
  onDownloadPdf,
  onNewValuation,
  isDownloadingPdf = false,
}: ResultsScreenProps) {
  const { computed, scenarios, state } = useWizardValuation();
  const { financials } = state;

  const netDebtK = computeNetDebtK(financials);

  const wfWidths = useMemo(() => {
    const ev = computed.ev || 1;
    return {
      ev: 100,
      debt: Math.min(100, (netDebtK / ev) * 100),
      eq: Math.min(100, (computed.equity / ev) * 100),
    };
  }, [computed.equity, computed.ev, netDebtK]);

  const tvPct = terminalValuePct(computed.dcf);

  return (
    <section className="eqw-results" aria-label="תוצאות הערכת השווי">
      <div className="res-hero">
        <div className="res-eyebrow">שווי לבעלים · תרחיש בסיס</div>
        <div className="res-val mono">{fmtEquitySidebarM(computed.equity)}</div>
        <div className="res-cap">
          שווי פעילות <span className="mono">{fmtK(computed.ev)}</span> בניכוי חוב
          נטו <span className="mono">{fmtK(netDebtK)}</span>
        </div>
        <div className="res-range">
          <span className="rr-bear">
            Bear <span className="mono">{fmtK(scenarios.bearEq)}</span>
          </span>
          <span className="sep">|</span>
          <span>
            Base <span className="mono">{fmtK(scenarios.baseEq)}</span>
          </span>
          <span className="sep">|</span>
          <span className="rr-bull">
            Bull <span className="mono">{fmtK(scenarios.bullEq)}</span>
          </span>
        </div>
      </div>

      <div className="res-grid stagger">
        <div className="res-card">
          <div className="rc-val mono">{fmtK(computed.ev)}</div>
          <div className="rc-lbl">שווי פעילות (EV)</div>
          <div className="rc-sub">Weighted Average</div>
        </div>
        <div className="res-card">
          <div className="rc-val mono">{computed.wacc.toFixed(1)}%</div>
          <div className="rc-lbl">WACC אפקטיבי</div>
          <div className="rc-sub">Damodaran CRP</div>
        </div>
        <div className="res-card">
          <div className="rc-val mono">×{computed.effectiveMult.toFixed(1)}</div>
          <div className="rc-lbl">מכפיל EBITDA אפקטיבי</div>
          <div className="rc-sub">Market-calibrated</div>
        </div>
        <div className="res-card">
          <div className="rc-val mono">{fmtK(computed.ebitda)}</div>
          <div className="rc-lbl">EBITDA שנתי</div>
          <div className="rc-sub">Trailing twelve months</div>
        </div>
        <div className="res-card">
          <div
            className="rc-val mono"
            style={{ color: 'var(--gold)' }}
          >{`${computed.qsGrade} · ${computed.qs}`}</div>
          <div className="rc-lbl">Quality Score</div>
          <div className="rc-sub">Risk-adjusted</div>
        </div>
        <div className="res-card">
          <div className="rc-val mono">{tvPct}%</div>
          <div className="rc-lbl">Terminal Value %</div>
          <div className="rc-sub">of DCF total</div>
        </div>
      </div>

      <div className="waterfall stagger">
        <h3>מ-EV לשווי לבעלים</h3>
        <div className="wf-row">
          <span className="wl">שווי פעילות (EV)</span>
          <div className="wf-track">
            <div className="wf-bar ev" style={{ width: `${wfWidths.ev}%` }} />
          </div>
          <b className="mono">{fmtK(computed.ev)}</b>
        </div>
        <div className="wf-row">
          <span className="wl">חוב נטו</span>
          <div className="wf-track">
            <div className="wf-bar dt" style={{ width: `${wfWidths.debt}%` }} />
          </div>
          <b className="mono" style={{ color: 'var(--red)' }}>
            −{fmtK(netDebtK)}
          </b>
        </div>
        <div className="wf-row total">
          <span className="wl" style={{ fontWeight: 700 }}>
            שווי לבעלים
          </span>
          <div className="wf-track">
            <div className="wf-bar eq" style={{ width: `${wfWidths.eq}%` }} />
          </div>
          <b className="mono">{fmtK(computed.equity)}</b>
        </div>
      </div>

      <div className="model-list stagger">
        {computed.backlogInflectionActive ? (
          <div className="ml-row" style={{ marginBottom: 12, opacity: 0.92 }}>
            <div>
              <div className="mr-name">מתודולוגיית Inflection (צבר הזמנות)</div>
              <div className="mr-desc">
                DCF {Math.round(computed.blendWeights.dcf * 100)}% · מכפיל EBITDA{' '}
                {Math.round(computed.blendWeights.ebitda * 100)}% · בסיס{' '}
                {fmtK(computed.baseEbitdaForMultiple)}
              </div>
            </div>
          </div>
        ) : null}
        <div className="ml-row">
          <div>
            <div className="mr-name">DCF + WACC</div>
            <div className="mr-desc">היוון תזרים · ערך טרמינלי · Damodaran CRP</div>
          </div>
          <div style={{ textAlign: 'left' }}>
            <div className="mr-val mono">{fmtK(computed.dcf)}</div>
            <div className="mr-weight">
              {Math.round(computed.blendWeights.dcf * 100)}% · EV
            </div>
          </div>
        </div>
        <div className="ml-row">
          <div>
            <div className="mr-name">מכפיל EBITDA</div>
            <div className="mr-desc">מכויל מ-12 עסקאות M&A ישראליות 2023–2026</div>
          </div>
          <div style={{ textAlign: 'left' }}>
            <div className="mr-val mono">{fmtK(computed.ebtMult)}</div>
            <div className="mr-weight">
              {Math.round(computed.blendWeights.ebitda * 100)}% · EV
            </div>
          </div>
        </div>
        {computed.blendWeights.rev > 0 ? (
          <div className="ml-row">
            <div>
              <div className="mr-name">מכפיל הכנסות</div>
              <div className="mr-desc">Revenue Multiple — עם התאמת ענף ושלב</div>
            </div>
            <div style={{ textAlign: 'left' }}>
              <div className="mr-val mono">{fmtK(computed.revMult)}</div>
              <div className="mr-weight">
                {Math.round(computed.blendWeights.rev * 100)}% · EV
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="scen-table stagger">
        <table>
          <thead>
            <tr>
              <th>תרחיש</th>
              <th>צמיחה</th>
              <th>EBITDA %</th>
              <th>WACC</th>
              <th>מכפיל</th>
              <th>EV</th>
              <th>שווי לבעלים</th>
            </tr>
          </thead>
          <tbody>
            {scenarios.rows.map((row) => (
              <tr
                key={row.label}
                className={row.label === 'base' ? 'base-row' : undefined}
              >
                <td>
                  {row.label === 'bear' && '🐻 Bear'}
                  {row.label === 'base' && '◆ Base'}
                  {row.label === 'bull' && '🚀 Bull'}
                </td>
                <td className="num">{row.growthPct}%</td>
                <td className="num">{row.ebitdaAdj}</td>
                <td className="num">{row.waccPct.toFixed(1)}%</td>
                <td className="num">{row.multDisplay}</td>
                <td className="num">{fmtK(row.ev)}</td>
                <td
                  className={`num ${
                    row.label === 'bear'
                      ? 'bear-val'
                      : row.label === 'bull'
                        ? 'bull-val'
                        : 'base-val'
                  }`}
                >
                  {fmtK(row.equity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="res-actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={onDownloadPdf}
          disabled={isDownloadingPdf}
        >
          {isDownloadingPdf ? 'מפיק PDF...' : 'הורד דוח PDF נקי'}{' '}
          <span className="arr">↓</span>
        </button>
        <button type="button" className="btn btn-ghost" onClick={onNewValuation}>
          הערכה חדשה
        </button>
      </div>

      <p className="disclaimer">
        אינדיקציה אלגוריתמית בלבד · לא ייעוץ השקעות · לא חוות דעת חשבונאית · ©
        2026 equify BY SBC
      </p>
    </section>
  );
}
