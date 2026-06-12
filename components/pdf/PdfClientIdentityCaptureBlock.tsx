'use client';

import type { PdfClientIdentity } from '../../lib/pdf/types';
import type { ValuationLocale } from '../../api_client';
import { EquifyLogo } from '../brand/EquifyLogo';

const COPY = {
  he: {
    eyebrow: 'דוח הערכת שווי רשמי',
    title: 'פרופיל תאגידי ואבחון זהות',
    sectionTitle: 'פרטי לקוח ואימות זהות',
    fullName: 'שם מלא',
    company: 'שם חברה',
    nationalId: 'ת.ז. / ח.פ.',
    corporateTaxId: 'ע.מ. / ח.פ. תאגידי',
    phone: 'טלפון',
    email: 'דוא״ל',
    midpoint: 'שווי אמצע (בסיס)',
    logoPlaceholder: 'מקום ללוגו החברה',
  },
  en: {
    eyebrow: 'Official valuation report',
    title: 'Corporate profile & identity verification',
    sectionTitle: 'Client & Identity Verification',
    fullName: 'Full name',
    company: 'Company name',
    nationalId: 'National ID / Reg. no.',
    corporateTaxId: 'Corporate tax ID',
    phone: 'Phone',
    email: 'Email',
    midpoint: 'Valuation midpoint (base)',
    logoPlaceholder: 'Company logo slot',
  },
} as const;

function Field({
  label,
  value,
  ltr = false,
}: {
  label: string;
  value: string;
  ltr?: boolean;
}) {
  const display = value.trim() || '—';
  return (
    <div className="rounded-xl border border-emerald-500/10 bg-[#0B1211]/50 px-3 py-2.5">
      <dt className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd
        className={`mt-0.5 text-sm font-semibold text-slate-100 ${ltr ? 'font-mono tabular-nums' : ''}`}
        dir={ltr ? 'ltr' : undefined}
      >
        {display}
      </dd>
    </div>
  );
}

function CorporateBrandingSlot({
  customLogoDataUrl,
  placeholderLabel,
}: {
  customLogoDataUrl?: string | null;
  placeholderLabel: string;
}) {
  if (customLogoDataUrl?.trim()) {
    return (
      <img
        src={customLogoDataUrl}
        alt=""
        className="h-9 max-w-[8rem] object-contain object-center"
      />
    );
  }

  return (
    <div className="flex items-center gap-3">
      <EquifyLogo variant="dark-bg" compact className="h-9 max-w-[7rem]" />
      <div className="hidden h-9 w-28 items-center justify-center rounded-lg border border-dashed border-slate-700 text-[10px] tracking-wider text-slate-500 sm:flex">
        {placeholderLabel}
      </div>
    </div>
  );
}

export interface PdfClientIdentityCaptureBlockProps {
  identity: PdfClientIdentity;
  valuationMidpoint: number;
  currency?: string;
  locale: ValuationLocale;
  customLogoDataUrl?: string | null;
}

export function PdfClientIdentityCaptureBlock({
  identity,
  valuationMidpoint,
  currency = 'ILS',
  locale,
  customLogoDataUrl,
}: PdfClientIdentityCaptureBlockProps) {
  const t = COPY[locale === 'en' ? 'en' : 'he'];
  const midpointFmt = new Intl.NumberFormat(locale === 'he' ? 'he-IL' : 'en-IL', {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(valuationMidpoint);

  return (
    <section
      id="valubot-pdf-client-identity"
      aria-label={t.sectionTitle}
      className="pdf-card-break pdf-block-contain pdf-card-contain metric-card diagnostic-block mb-6 w-full rounded-2xl border border-emerald-500/10 bg-[#0B1211]/40 p-4 backdrop-blur-3xl sm:p-6"
    >
      <div className="mb-6 flex w-full items-center justify-between gap-4 border-b border-emerald-500/10 pb-6">
        <div className="flex min-w-0 flex-col gap-1 text-right">
          <span className="text-xs font-semibold uppercase tracking-widest text-emerald-400">
            {t.eyebrow}
          </span>
          <h2 className="text-xl font-bold tracking-tight text-slate-100">{t.title}</h2>
        </div>
        <div className="flex shrink-0 items-center gap-3 rounded-xl border border-slate-800/60 bg-[#111823]/40 p-3">
          <CorporateBrandingSlot
            customLogoDataUrl={customLogoDataUrl}
            placeholderLabel={t.logoPlaceholder}
          />
        </div>
      </div>

      <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-emerald-400/90">
        {t.sectionTitle}
      </h3>
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label={t.fullName} value={identity.fullName} />
        <Field label={t.company} value={identity.companyName} />
        <Field label={t.nationalId} value={identity.nationalId} ltr />
        <Field label={t.corporateTaxId} value={identity.corporateTaxId} ltr />
        <Field label={t.phone} value={identity.userPhone} ltr />
        <Field label={t.email} value={identity.userEmail} ltr />
        <Field label={t.midpoint} value={midpointFmt} ltr />
      </dl>
    </section>
  );
}
