'use client';

import { useEffect, useMemo, useState } from 'react';
import { BRAND_NAME } from '../../lib/brand/brand-identity';
import { formatILS } from '../../lib/utils/formatCurrency';

export interface WhatsAppShareButtonProps {
  /** User mobile from wizard (e.g. "0521234567" or "+972501234567"). */
  phone: string;
  companyName: string;
  /** Absolute enterprise value in reporting currency (ILS). */
  baseEv: number;
  /** @deprecated Pre-formatted string — prefer `baseEv`. */
  baseValue?: string;
  /** Full URL to the results page; defaults to current page after mount. */
  reportUrl?: string;
  className?: string;
}

function toWhatsAppE164(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('972')) {
    return digits;
  }
  if (digits.startsWith('0')) {
    return `972${digits.slice(1)}`;
  }
  return `972${digits}`;
}

function fmtShareValue(value: number): string {
  return formatILS(value, { short: true });
}

function buildShareMessage(
  companyName: string,
  baseEv: number,
  reportUrl: string,
): string {
  return (
    `דוח הערכת שווי — ${companyName}\n` +
    `שווי פעילות (בסיס): ${fmtShareValue(baseEv)}\n` +
    `צפה בדוח המלא: ${reportUrl}\n` +
    `הופק על ידי ${BRAND_NAME}`
  );
}

export function WhatsAppShareButton({
  phone,
  companyName,
  baseEv,
  baseValue: baseValueProp,
  reportUrl: reportUrlProp,
  className = '',
}: WhatsAppShareButtonProps) {
  const [reportUrl, setReportUrl] = useState(reportUrlProp ?? '');

  useEffect(() => {
    if (reportUrlProp) {
      setReportUrl(reportUrlProp);
      return;
    }
    setReportUrl(window.location.href);
  }, [reportUrlProp]);

  const formattedValue = useMemo(() => {
    if (Number.isFinite(baseEv) && baseEv > 0) {
      return fmtShareValue(baseEv);
    }
    return baseValueProp ?? '—';
  }, [baseEv, baseValueProp]);

  const waUrl = useMemo(() => {
    const trimmedPhone = phone.trim();
    if (!trimmedPhone || !reportUrl) {
      return '';
    }
    const cleanPhone = toWhatsAppE164(trimmedPhone);
    const evForMessage = Number.isFinite(baseEv) && baseEv > 0 ? baseEv : 0;
    const message = encodeURIComponent(
      buildShareMessage(companyName, evForMessage, reportUrl),
    );
    return `https://wa.me/${cleanPhone}?text=${message}`;
  }, [phone, companyName, baseEv, reportUrl]);

  if (!waUrl) {
    return null;
  }

  return (
    <a
      href={waUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={
        className ||
        'inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border-2 border-[#25D366] bg-transparent px-6 py-3.5 text-sm font-semibold text-[#25D366] transition hover:border-[#20bd5a] hover:bg-[#25D366]/10'
      }
      title={formattedValue}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5 shrink-0"
        fill="currentColor"
        aria-hidden
      >
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.883 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
      שלח לי ב-WhatsApp
    </a>
  );
}
