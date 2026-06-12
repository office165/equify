'use client';

import type { ValuationScenario } from '../../lib/valuation/canonical_valuation';

const TABS: { key: ValuationScenario; icon: string; labelHe: string; labelEn: string }[] = [
  { key: 'bear', icon: '🐻', labelHe: 'דובי', labelEn: 'Bear' },
  { key: 'base', icon: '◆', labelHe: 'בסיס', labelEn: 'Base' },
  { key: 'bull', icon: '🚀', labelHe: 'שורי', labelEn: 'Bull' },
];

interface ScenarioTabsProps {
  selected: ValuationScenario;
  onSelect: (scenario: ValuationScenario) => void;
  locale?: 'he' | 'en';
  className?: string;
}

export function ScenarioTabs({
  selected,
  onSelect,
  locale = 'he',
  className,
}: ScenarioTabsProps) {
  const isHe = locale === 'he';

  return (
    <div
      className={`rr-scenario-tabs ${className ?? ''}`}
      role="tablist"
      aria-label={isHe ? 'תרחישי הערכה' : 'Valuation scenarios'}
    >
      {TABS.map((tab) => {
        const active = selected === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={active}
            className={`rr-scenario-tab${active ? ' rr-scenario-tab--active' : ''}`}
            onClick={() => onSelect(tab.key)}
          >
            <span className="rr-scenario-tab__icon" aria-hidden>
              {tab.icon}
            </span>
            <span>{isHe ? tab.labelHe : tab.labelEn}</span>
          </button>
        );
      })}
    </div>
  );
}
