import { NextResponse } from 'next/server';
import { isUpayEnabled } from '../../../../../lib/payments/upay/upay_client';
import { handleUpayIpn } from '../../../../../lib/payments/upay/upay_ipn';
import { defaultUpayOrderStore } from '../../../../../lib/payments/upay/upay_orders';
import { UNDOCUMENTED_STATUS_VERIFIER, releaseViaPaypalMechanism } from '../../../../../lib/payments/upay/upay_settle';
import { greenInvoiceAfterUpay } from '../../../../../lib/payments/upay/upay_wiring';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Round 9 (UPAY): IPN from upay. Logs every call; releases only after verification. 404 while off. */
async function handle(request: Request) {
  if (!isUpayEnabled()) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const r = await handleUpayIpn(request, {
    store: defaultUpayOrderStore(),
    verify: UNDOCUMENTED_STATUS_VERIFIER,
    release: releaseViaPaypalMechanism,
    afterPaid: greenInvoiceAfterUpay,
  });
  return NextResponse.json(r.body, { status: r.status });
}

export const GET = handle;
export const POST = handle;
