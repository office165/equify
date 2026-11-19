/**
 * Round 14: one test document in Green Invoice's sandbox (morning), the day we get a sandbox key.
 *
 *   GREEN_INVOICE=on GREEN_INVOICE_API_ID=<sandbox id> GREEN_INVOICE_API_SECRET=<sandbox secret> npx tsx scripts/round-14/green-invoice-sandbox.ts [--usd]
 *
 * Refuses with GREEN_INVOICE_LIVE=1: only api.sandbox.morning.dev and sandbox.d.greeninvoice.co.il.
 * Uses a memory store (nothing written to our database). Prints the document id and number, and the
 * token and document answers with the access token hidden, so they can be saved as recorded answers
 * in tests/fixtures/upay/.
 */
import { greenInvoiceUrls, issueInvoiceOnce, memoryInvoiceStore, readGreenInvoiceConfig, type JsonFetch } from '../../lib/invoices/green_invoice';

async function main() {
  const cfg = readGreenInvoiceConfig();
  if (!cfg) {
    console.error('Missing GREEN_INVOICE_API_ID or GREEN_INVOICE_API_SECRET (sandbox key).');
    process.exit(2);
  }
  if (cfg.live || !greenInvoiceUrls(cfg).token.includes('sandbox')) {
    console.error('Refusing: GREEN_INVOICE_LIVE=1. Sandbox only.');
    process.exit(2);
  }
  if (process.env.GREEN_INVOICE?.trim().toLowerCase() !== 'on') process.env.GREEN_INVOICE = 'on';
  const usd = process.argv.includes('--usd');
  const recorded: Array<{ url: string; status: number; body: unknown }> = [];
  const f: JsonFetch = async (url, init) => {
    const res = await fetch(url, init);
    const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    const shown = body && typeof body === 'object' && 'accessToken' in body ? { ...body, accessToken: '***' } : body;
    recorded.push({ url, status: res.status, body: shown });
    return { ok: res.ok, status: res.status, json: async () => body };
  };
  const r = await issueInvoiceOnce(
    {
      orderKey: `sandbox:${Date.now()}`,
      customerName: 'Sandbox test',
      customerEmail: 'sandbox@example.invalid',
      amount: usd ? 349 : 999,
      currency: usd ? 'USD' : 'ILS',
      method: 'credit_card',
      transactionId: 'sandbox',
      date: new Date().toISOString().slice(0, 10),
      cardLast4: '0000',
    },
    { store: memoryInvoiceStore(), fetchImpl: f, config: cfg },
  );
  console.log(JSON.stringify({ outcome: r.outcome, documentId: r.documentId, reason: r.reason }, null, 1));
  console.log(JSON.stringify(recorded, null, 1));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
