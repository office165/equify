/**
 * Internal alert to the SBC office (operational issues, never customer marketing).
 * Fire-and-forget: never throws, never blocks the caller.
 *
 * Env:
 *   OFFICE_ALERT_EMAIL     recipient (default office@sbc-il.co.il)
 *   OFFICE_ALERTS_DISABLED 'true' to skip sending (tests, local runs)
 */
import { EmailGateway } from '../gateway/email_gateway';

export const DEFAULT_OFFICE_ALERT_EMAIL = 'office@sbc-il.co.il';

export interface OfficeAlert {
  /** Short machine-readable kind, e.g. report_coherence_warning. */
  kind: string;
  subject: string;
  lines: string[];
}

type AlertSink = (alert: OfficeAlert) => void;

const recorded: OfficeAlert[] = [];
let testSink: AlertSink | null = null;

/** Tests only: capture alerts instead of sending email. */
export function setOfficeAlertSinkForTests(sink: AlertSink | null): void {
  testSink = sink;
}

export function getRecordedOfficeAlerts(): readonly OfficeAlert[] {
  return recorded;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function sendOfficeAlert(alert: OfficeAlert): void {
  console.warn(`[office-alert] ${alert.kind}: ${alert.subject}`);
  if (testSink) {
    recorded.push(alert);
    testSink(alert);
    return;
  }
  if (process.env.OFFICE_ALERTS_DISABLED === 'true') return;
  const to = process.env.OFFICE_ALERT_EMAIL?.trim() || DEFAULT_OFFICE_ALERT_EMAIL;
  void new EmailGateway()
    .send({
      to,
      subject: `[equify alert] ${alert.subject}`,
      text: alert.lines.join('\n'),
      html: `<div dir="rtl" style="font-family:Arial,sans-serif;font-size:14px">${alert.lines
        .map((l) => `<p style="margin:0 0 6px">${escapeHtml(l)}</p>`)
        .join('')}</div>`,
    })
    .catch((err) => {
      console.error('[office-alert] send failed', err instanceof Error ? err.message : err);
    });
}
