/** Round 9: server render of wizard step 4 (payment), for the "flag off changes nothing" check. */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { WizardValuationProvider } from '../../components/wizard/equify/WizardValuationContext';
import { Step4Goal, type Step4GoalProps } from '../../components/wizard/equify/steps/Step4Goal';
import { ValuationI18nProvider } from '../../valuation_i18n';
import { withQuietConsole } from './quiet';

export function renderStep4(props: Partial<Step4GoalProps> = {}): string {
  return withQuietConsole(() =>
    renderToStaticMarkup(
      React.createElement(
        ValuationI18nProvider,
        null,
        React.createElement(
          WizardValuationProvider,
          null,
          React.createElement(Step4Goal, { onBack: () => {}, onGenerate: () => {}, ...props }),
        ),
      ),
    ),
  );
}
