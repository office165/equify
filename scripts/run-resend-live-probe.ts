/**
 * Invoke the temporary Resend live-probe API route on a deployed environment.
 *
 * Usage:
 *   PROBE_SECRET="$CRON_SECRET" \
 *   PRODUCTION_URL="https://equify.co.il" \
 *   npx tsx scripts/run-resend-live-probe.ts
 *
 * PROBE_SECRET may also be EMAIL_LIVE_PROBE_SECRET (must match server env).
 */

const PRODUCTION_URL =
  process.env.PRODUCTION_URL?.replace(/\/$/, '') || 'https://equify.co.il';
const PROBE_SECRET =
  process.env.PROBE_SECRET?.trim() ||
  process.env.EMAIL_LIVE_PROBE_SECRET?.trim() ||
  process.env.CRON_SECRET?.trim();

async function main(): Promise<void> {
  if (!PROBE_SECRET) {
    console.error(
      'Missing PROBE_SECRET (or CRON_SECRET / EMAIL_LIVE_PROBE_SECRET in env).',
    );
    process.exit(1);
  }

  const url = `${PRODUCTION_URL}/api/internal/resend-live-probe`;
  console.log(`POST ${url}`);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PROBE_SECRET}`,
      'Content-Type': 'application/json',
    },
  });

  const bodyText = await response.text();
  let json: Record<string, unknown>;
  try {
    json = JSON.parse(bodyText) as Record<string, unknown>;
  } catch {
    console.error('Non-JSON response:', response.status, bodyText);
    process.exit(1);
  }

  console.log(JSON.stringify(json, null, 2));
  console.log(`HTTP ${response.status}`);

  if (!response.ok) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
