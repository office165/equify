'use client';

import React, { useMemo, useState } from 'react';
import { BACKLOG_INFLECTION_RATIO_THRESHOLD } from '../../../../lib/valuation/backlog_inflection_accelerator';
import { fmtEquitySidebarM, fmtK } from '../../../../lib/valuation';
import { BLENDED_EBITDA_WEIGHTS } from '../../../../lib/valuation/blended_ebitda';
import { patchFinancialHistoryYear } from '../../../../lib/wizard/financial_history';
import { computeNetDebtK } from '../../../../lib/wizard/map_equify_wizard';
import { useEquifyStrings } from '../../../../lib/i18n/use_equify_strings';
import { SmartFieldLabel } from '../../ui/SmartFieldLabel';
import { SmartInput } from '../../ui/SmartInput';
import { SmartSlider } from '../../ui/SmartSlider';
import { useWizardValuation } from '../WizardValuationContext';

export interface Step2FinancialsProps {
  onBack: () => void;
  onNext: () => void;
}

function safeK(value: number | undefined | null): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export function Step2Financials({ onBack, onNext }: Step2FinancialsProps) {
  const { shell, steps: t, isHe, locale } = useEquifyStrings();
  const { state, computed, scenarios, updateFinancials, updateProfile } =
    useWizardValuation();
  const { financials, profile } = state;
  const [auditOpen, setAuditOpen] = useState(false);

  const y2024 = financials.y2024 ?? { revenueK: 0, ebitdaK: 0 };
  const y2025 = financials.y2025 ?? { revenueK: 0, ebitdaK: 0 };
  const y2026 = financials.y2026 ?? { revenueK: 0, ebitdaK: 0 };
  const projected = financials.projectedEbitdaK ?? [0, 0, 0];

  const netDebtK = useMemo(() => computeNetDebtK(financials), [financials]);

  const backlogRatio = useMemo(() => {
    const rev = safeK(y2026.revenueK);
    const backlog = safeK(financials.backlogSignedK);
    if (rev <= 0 || backlog <= 0) return 0;
    return backlog / rev;
  }, [financials.backlogSignedK, y2026.revenueK]);

  const inflectionEligible = backlogRatio >= BACKLOG_INFLECTION_RATIO_THRESHOLD;

  const { blendWeights, ebitdaBlend } = computed;
  const weightLabel = (base: string, w: number) =>
    w > 0 ? `${base} · ${Math.round(w * 100)}%` : base;
  const wEbitda = BLENDED_EBITDA_WEIGHTS;
  const maxEv = Math.max(computed.dcf, computed.ebtMult, computed.revMult, 1);
  const barPct = (v: number) => `${(v / maxEv) * 90}%`;
  const qsArc = (computed.qs / 100) * 163.4;
  const backLabel = isHe ? `→ ${t.common.back}` : `← ${t.common.back}`;

  return (
    <>
      <div className="pane-eyebrow rv">{shell.step2Eyebrow}</div>
      <h2 className="pane-title rv">
        {shell.step2TitleBefore}{' '}
        <span className="hl">{shell.step2TitleHl}</span>
      </h2>
      <p className="pane-sub rv">{t.step2.sub}</p>

      <div className="fin-layout fin-layout--live-first">
        <div className="fin-inputs stagger w-full min-w-0 max-w-full">
          <div className="fin-field-grid">
            <SmartInput
              label={t.step2.hist2026Revenue}
              tooltip={t.step2.histYearTip}
              value={safeK(y2026.revenueK)}
              variant="currency"
              required
              ariaLabel={t.step2.hist2026Revenue}
              onChange={(v) =>
                updateFinancials(
                  patchFinancialHistoryYear(financials, 'y2026', { revenueK: v }),
                )
              }
            />
            <SmartInput
              label={t.step2.hist2026Ebitda}
              tooltip={t.step2.histYearTip}
              value={safeK(y2026.ebitdaK)}
              variant="currency"
              required
              ariaLabel={t.step2.hist2026Ebitda}
              onChange={(v) =>
                updateFinancials(
                  patchFinancialHistoryYear(financials, 'y2026', { ebitdaK: v }),
                )
              }
            />
          </div>

          <SmartInput
            label={t.step2.backlogSigned}
            tooltip={t.step2.backlogSignedTip}
            value={safeK(financials.backlogSignedK)}
            variant="currency"
            ariaLabel={t.step2.backlogSigned}
            onChange={(v) => updateFinancials({ backlogSignedK: v })}
          />

          {inflectionEligible ? (
            <SmartInput
              label={t.step2.projected2027F}
              tooltip={t.step2.projectedForwardTip}
              value={safeK(projected[0])}
              variant="currency"
              ariaLabel={t.step2.projected2027F}
              onChange={(v) =>
                updateFinancials({
                  projectedEbitdaK: [v, projected[1] ?? 0, projected[2] ?? 0],
                })
              }
            />
          ) : null}

          <details
            className="fin-audit-accordion rv"
            open={auditOpen}
            onToggle={(e) => setAuditOpen(e.currentTarget.open)}
          >
            <summary className="fin-audit-accordion-summary">
              {t.step2.auditedHistoryAccordion}
            </summary>
            <div className="fin-audit-accordion-body">
            <div className="fin-field-grid">
              <SmartInput
                label={t.step2.hist2024Revenue}
                  tooltip={t.step2.histYearTip}
                  value={safeK(y2024.revenueK)}
                  variant="currency"
                  ariaLabel={t.step2.hist2024Revenue}
                  onChange={(v) =>
                    updateFinancials(
                      patchFinancialHistoryYear(financials, 'y2024', { revenueK: v }),
                    )
                  }
                />
                <SmartInput
                  label={t.step2.hist2024Ebitda}
                  tooltip={t.step2.histYearTip}
                  value={safeK(y2024.ebitdaK)}
                  variant="currency"
                  ariaLabel={t.step2.hist2024Ebitda}
                  onChange={(v) =>
                    updateFinancials(
                      patchFinancialHistoryYear(financials, 'y2024', { ebitdaK: v }),
                    )
                  }
                />
              </div>
              <div className="fin-field-grid">
                <SmartInput
                  label={t.step2.hist2025Revenue}
                  tooltip={t.step2.histYearTip}
                  value={safeK(y2025.revenueK)}
                  variant="currency"
                  ariaLabel={t.step2.hist2025Revenue}
                  onChange={(v) =>
                    updateFinancials(
                      patchFinancialHistoryYear(financials, 'y2025', { revenueK: v }),
                    )
                  }
                />
                <SmartInput
                  label={t.step2.hist2025Ebitda}
                  tooltip={t.step2.histYearTip}
                  value={safeK(y2025.ebitdaK)}
                  variant="currency"
                  ariaLabel={t.step2.hist2025Ebitda}
                  onChange={(v) =>
                    updateFinancials(
                      patchFinancialHistoryYear(financials, 'y2025', { ebitdaK: v }),
                    )
                  }
                />
              </div>
            </div>
          </details>

          <SmartInput
            label={t.step2.ownerSalary}
            tooltip={t.step2.ownerSalaryTip}
            value={safeK(financials.normalizedOwnerSalaryK)}
            variant="currency"
            ariaLabel={t.step2.ownerSalary}
            onChange={(v) => updateFinancials({ normalizedOwnerSalaryK: v })}
          />

          <SmartSlider
            label={
              <SmartFieldLabel tooltip={t.step2.growthTip} required>
                {t.step2.growth}
              </SmartFieldLabel>
            }
            value={safeK(financials.growth)}
            min={-10}
            max={50}
            step={1}
            unit="%"
            minLabel={t.step2.minGrowth}
            maxLabel={t.step2.maxGrowth}
            ariaLabel={t.step2.growth}
            onChange={(v) => updateFinancials({ growth: v })}
          />

          <SmartSlider
            label={
              <SmartFieldLabel tooltip={t.step2.capexTip}>{t.step2.capex}</SmartFieldLabel>
            }
            value={safeK(financials.capexLevelPct)}
            min={0}
            max={30}
            step={1}
            unit="%"
            minLabel="0%"
            maxLabel="30%"
            ariaLabel={t.step2.capex}
            onChange={(v) => updateFinancials({ capexLevelPct: v })}
          />

          <div className="fin-field-grid">
            <SmartInput
              label={t.step2.grossDebt}
              tooltip={t.step2.grossDebtTip}
              value={safeK(financials.grossDebtK)}
              variant="currency"
              ariaLabel={t.step2.grossDebt}
              onChange={(v) => updateFinancials({ grossDebtK: v })}
            />
            <SmartInput
              label={t.step2.cash}
              tooltip={t.step2.cashTip}
              value={safeK(financials.cashK)}
              variant="currency"
              ariaLabel={t.step2.cash}
              onChange={(v) => updateFinancials({ cashK: v })}
            />
          </div>

          <div className="net-debt-banner rv">
            <span>{t.step2.netDebt}</span>
            <b className="mono">{fmtK(netDebtK, locale)}</b>
          </div>

          <div className="fin-field-grid fin-field-grid--meta">
            <div className="field">
              <label>{t.step2.currency}</label>
              <select
                className="sel"
                value={profile.currency}
                onChange={(e) =>
                  updateProfile({
                    currency: e.target.value as 'ILS' | 'USD' | 'EUR',
                  })
                }
              >
                <option value="ILS">{t.step2.currencyIls}</option>
                <option value="USD">{t.step2.currencyUsd}</option>
                <option value="EUR">{t.step2.currencyEur}</option>
              </select>
            </div>
            <div className="field">
              <label>{t.step2.fiscalYear}</label>
              <input
                className="inp"
                type="number"
                placeholder="2025"
                dir="ltr"
                value={profile.fiscalYear ?? ''}
                onChange={(e) => updateProfile({ fiscalYear: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="calc-live rv-r">
          <div className="cl-hd">{t.step2.livePanel}</div>
          <div className="cl-val mono">{fmtEquitySidebarM(computed.equity, locale)}</div>
          <div className="cl-sub mono">
            {t.step2.waccQuality(computed.wacc.toFixed(1), computed.qsGrade)}
          </div>
          {computed.backlogInflectionActive ? (
            <div className="cl-inflection-note mono">
              {t.step2.inflectionActive(
                Math.round((computed.backlogRatio ?? 0) * 100),
              )}
            </div>
          ) : null}
          <div className="cl-ebitda-blend">
            <div className="cl-ebitda-blend-hd">{t.step2.blendedEbitdaTitle}</div>
            <div className="cl-ebitda-blend-row">
              {t.step2.blendedEbitdaPast(
                Math.round(wEbitda.past * 100),
                fmtK(ebitdaBlend?.past ?? 0, locale),
              )}
            </div>
            <div className="cl-ebitda-blend-row">
              {t.step2.blendedEbitdaCurrent(
                Math.round(wEbitda.current * 100),
                fmtK(ebitdaBlend?.current ?? 0, locale),
              )}
            </div>
            <div className="cl-ebitda-blend-row">
              {t.step2.blendedEbitdaProjected(
                Math.round(wEbitda.projected * 100),
                fmtK(ebitdaBlend?.projected ?? 0, locale),
                (ebitdaBlend?.dcfGrowthPct ?? 0).toFixed(1),
              )}
            </div>
            <div className="cl-ebitda-blend-total mono">
              {t.step2.blendedEbitdaTotal(fmtK(ebitdaBlend?.blended ?? 0, locale))}
            </div>
          </div>
          <div className="cl-models">
            <div className="cl-row">
              <span>{weightLabel(t.step2.modelDcf, blendWeights.dcf)}</span>
              <div className="cl-bar-wrap">
                <div className="cl-bar-fill" style={{ width: barPct(computed.dcf) }} />
              </div>
              <b className="mono">{fmtK(computed.dcf, locale)}</b>
            </div>
            <div className="cl-row">
              <span>{weightLabel(t.step2.modelEbitda, blendWeights.ebitda)}</span>
              <div className="cl-bar-wrap">
                <div
                  className="cl-bar-fill"
                  style={{ width: barPct(computed.ebtMult) }}
                />
              </div>
              <b className="mono">{fmtK(computed.ebtMult, locale)}</b>
            </div>
            {blendWeights.rev > 0 ? (
              <div className="cl-row">
                <span>{weightLabel(t.step2.modelRevenue, blendWeights.rev)}</span>
                <div className="cl-bar-wrap">
                  <div
                    className="cl-bar-fill"
                    style={{ width: barPct(computed.revMult) }}
                  />
                </div>
                <b className="mono">{fmtK(computed.revMult, locale)}</b>
              </div>
            ) : null}
          </div>
          <div className="scen-row">
            <div className="scen-badge bear">
              <span style={{ color: 'var(--dim)', fontSize: 10 }}>{t.step2.scenarioBear}</span>
              <span className="sv mono">{fmtK(scenarios.bearEq, locale)}</span>
            </div>
            <div className="scen-badge base">
              <span style={{ color: 'var(--dim)', fontSize: 10 }}>{t.step2.scenarioBase}</span>
              <span className="sv mono">{fmtK(scenarios.baseEq, locale)}</span>
            </div>
            <div className="scen-badge bull">
              <span style={{ color: 'var(--dim)', fontSize: 10 }}>{t.step2.scenarioBull}</span>
              <span className="sv mono">{fmtK(scenarios.bullEq, locale)}</span>
            </div>
          </div>
          <div className="qs-wrap">
            <div className="qs-ring" style={{ width: 64, height: 64 }}>
              <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true">
                <circle cx="32" cy="32" r="26" fill="none" stroke="#0F2E29" strokeWidth="6" />
                <circle
                  cx="32"
                  cy="32"
                  r="26"
                  fill="none"
                  stroke="url(#qg)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${qsArc} 164`}
                  transform="rotate(-90 32 32)"
                />
                <defs>
                  <linearGradient id="qg" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0" stopColor="#00C2B8" />
                    <stop offset="1" stopColor="#C49A3C" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="qv mono">{computed.qs}</div>
            </div>
            <div className="qs-detail">
              <div className="qs-grade">{computed.qsGrade}</div>
              <div className="qs-label">{t.step2.qualityScore}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="nav-row rv">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onBack}>
          {backLabel}
        </button>
        <button type="button" className="btn btn-primary" onClick={onNext}>
          {t.common.nextRisk} <span className="arr">{isHe ? '←' : '→'}</span>
        </button>
      </div>
    </>
  );
}
