/** Round 10 to 13: server render of the site's pages and wizard steps, with and without the site flags. */
import './css_stub';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { EquifyLandingPage } from '../../components/landing/equify/EquifyLandingPage';
import { HomeV2 } from '../../components/site-v2/HomeV2';
import { SiteFlagsProvider } from '../../components/shared/SiteFlagsContext';
import { WizardValuationProvider } from '../../components/wizard/equify/WizardValuationContext';
import { Step1Profile } from '../../components/wizard/equify/steps/Step1Profile';
import { ValuationI18nProvider } from '../../valuation_i18n';
import { SITE_FLAGS_OFF, type SiteFlags } from '../../lib/flags/site_flags';
import { withQuietConsole } from './quiet';

const h = React.createElement;
// The components use Next's automatic JSX runtime; tsx compiles them with the classic one, which needs React in scope.
(globalThis as unknown as { React: typeof React }).React = React;

/** flags === null: no provider at all, as the root layout renders it with every flag off. */
function wrap(node: React.ReactElement, flags: Partial<SiteFlags> | null): React.ReactElement {
  return flags === null ? node : h(SiteFlagsProvider, { value: { ...SITE_FLAGS_OFF, ...flags } }, node);
}

export function renderLanding(flags: Partial<SiteFlags> | null): string {
  return withQuietConsole(() => renderToString(wrap(h(EquifyLandingPage), flags)));
}

export function renderHomeV2(flags: Partial<SiteFlags>): string {
  return withQuietConsole(() => renderToString(wrap(h(HomeV2), { siteV2: true, ...flags })));
}

export function renderStep1(flags: Partial<SiteFlags> | null): string {
  return withQuietConsole(() =>
    renderToString(
      wrap(
        h(ValuationI18nProvider, null, h(WizardValuationProvider, null, h(Step1Profile as unknown as React.FC<Record<string, unknown>>, { onNext: () => {} }))),
        flags,
      ),
    ),
  );
}

/** The visible text of an HTML string (tags, scripts and styles removed), for the writing rules. */
export function visibleText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');
}
