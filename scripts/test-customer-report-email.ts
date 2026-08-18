/**
 * Customer report email copy + CTA contract.
 *   npx tsx scripts/test-customer-report-email.ts
 */

import {
  buildMarketingReportEmailHtml,
  buildMarketingReportEmailText,
  hasUsableReportDownloadUrl,
} from '../lib/email/templates/marketingReport';

function assert(cond: unknown, message: string): void {
  if (!cond) throw new Error(message);
}

const signed =
  'https://xyzcompany.supabase.co/storage/v1/object/sign/valuation_reports/report.pdf?token=abc';

assert(hasUsableReportDownloadUrl(signed), 'signed https URL must be usable');
assert(!hasUsableReportDownloadUrl('#'), '"#" must not be usable');
assert(!hasUsableReportDownloadUrl(''), 'empty must not be usable');
assert(!hasUsableReportDownloadUrl(null), 'null must not be usable');
assert(!hasUsableReportDownloadUrl('http://example.com/x.pdf'), 'http must not be usable');

const withLink = {
  companyName: 'חברת בדיקה',
  recipientName: 'ישראל',
  metricsAccessUrl: signed,
  locale: 'he' as const,
};

const htmlBoth = buildMarketingReportEmailHtml(withLink);
const textBoth = buildMarketingReportEmailText(withLink);
assert(htmlBoth.includes(`href="${signed.replace(/&/g, '&amp;')}"`), 'HTML must include signed href');
assert(htmlBoth.includes('לצפייה במדדי ההערכה והורדת הדוח'), 'HTML must show CTA');
assert(
  htmlBoth.includes('הדוח המלא מצורף למייל'),
  'both-mode intro must mention attachment + access',
);
assert(textBoth.includes(signed), 'text must include signed URL');
assert(
  !htmlBoth.includes('href="#"'),
  'HTML with link must not contain dead href',
);

const htmlAttachOnly = buildMarketingReportEmailHtml({
  companyName: 'חברת בדיקה',
  recipientName: 'ישראל',
  metricsAccessUrl: null,
  locale: 'he',
});
const textAttachOnly = buildMarketingReportEmailText({
  companyName: 'חברת בדיקה',
  recipientName: 'ישראל',
  locale: 'he',
});

assert(
  htmlAttachOnly.includes('הדוח מצורף למייל'),
  'attachment-only intro required',
);
assert(
  !htmlAttachOnly.includes('ובאפשרותך לגשת למדדי'),
  'attachment-only must not promise a click-through',
);
assert(
  !htmlAttachOnly.includes('לצפייה במדדי ההערכה והורדת הדוח'),
  'attachment-only must hide CTA',
);
assert(!htmlAttachOnly.includes('href="#'), 'must never render href="#"');
assert(
  !htmlAttachOnly.includes('metricsAccessUrl') &&
    !htmlAttachOnly.includes('supabase.co'),
  'attachment-only HTML must not leak a download URL',
);
assert(
  !textAttachOnly.includes('קישור למדדי'),
  'attachment-only text must omit the access line',
);

const htmlHash = buildMarketingReportEmailHtml({
  companyName: 'Test Co',
  metricsAccessUrl: '#',
  locale: 'en',
});
assert(htmlHash.includes('The report is attached to this email'), 'hash URL → attach-only EN');
assert(!htmlHash.includes('href="#"'), 'hash URL must not become a button');
assert(!htmlHash.includes('View Evaluation Metrics'), 'hash URL must hide EN CTA');

console.log('test-customer-report-email: ok');
