import { NextResponse } from 'next/server';
import { getEmailProvider } from '../../../../lib/config/deployment_env';
import {
  EmailGateway,
  resolveTransactionalFrom,
} from '../../../../lib/gateway/email_gateway';

export const runtime = 'nodejs';

/** Hardcoded probe recipient — do not accept overrides. */
const PROBE_RECIPIENT = 'office@sbc-il.co.il';

function authorizeProbe(request: Request): boolean {
  const secret =
    process.env.EMAIL_LIVE_PROBE_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const header = request.headers.get('authorization')?.trim();
  return header === `Bearer ${secret}`;
}

function maskSecretPresent(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

/**
 * Temporary secured probe — POST or GET, Bearer EMAIL_LIVE_PROBE_SECRET or CRON_SECRET.
 * Sends exactly one email to office@sbc-il.co.il via EmailGateway.
 * (Redeploy trigger: no runtime behavior change.)
 */
export async function POST(request: Request) {
  return handleProbe(request);
}

export async function GET(request: Request) {
  return handleProbe(request);
}

async function handleProbe(request: Request) {
  if (!authorizeProbe(request)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const at = new Date().toISOString();
  const configuredProvider = getEmailProvider();
  const from = resolveTransactionalFrom();
  const emailFromEnv = process.env.EMAIL_FROM?.trim() || null;
  const emailProviderEnv = process.env.EMAIL_PROVIDER?.trim() || '(default: resend)';
  const hasResendKey = maskSecretPresent(process.env.RESEND_API_KEY);
  const hasSendGridKey = maskSecretPresent(process.env.SENDGRID_API_KEY);

  const subject = `[Equify probe] Resend live test ${at}`;
  const html = [
    '<p>Equify production Resend probe (temporary endpoint).</p>',
    `<p>Timestamp: <code>${at}</code></p>`,
    `<p>Provider: <code>${configuredProvider}</code></p>`,
    `<p>From: <code>${from}</code></p>`,
    '<p>If you received this, transactional email is working end-to-end.</p>',
  ].join('\n');
  const text = `Equify Resend probe at ${at}. Provider=${configuredProvider}. From=${from}`;

  try {
    const gateway = new EmailGateway();
    const result = await gateway.send({
      to: PROBE_RECIPIENT,
      subject,
      html,
      text,
    });

    return NextResponse.json({
      ok: true,
      at,
      probeRecipient: PROBE_RECIPIENT,
      configuredProvider,
      emailProviderEnv,
      from,
      emailFromEnv,
      hasResendKey,
      hasSendGridKey,
      provider: result.provider,
      messageId: result.messageId,
      delivered: result.delivered,
      note:
        result.delivered === true
          ? 'delivered=true means Resend accepted the request (HTTP 200). Confirm final inbox delivery in Resend Logs using messageId.'
          : 'delivered=false — RESEND_API_KEY likely missing; EmailGateway skipped send.',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[resend-live-probe] send failed', message, err);
    return NextResponse.json(
      {
        ok: false,
        at,
        probeRecipient: PROBE_RECIPIENT,
        configuredProvider,
        emailProviderEnv,
        from,
        emailFromEnv,
        hasResendKey,
        hasSendGridKey,
        provider: configuredProvider,
        messageId: null,
        delivered: false,
        error: message,
      },
      { status: 502 },
    );
  }
}
