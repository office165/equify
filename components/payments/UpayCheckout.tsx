'use client';

import { useState } from 'react';

/** Round 9: the card option shows only with NEXT_PUBLIC_UPAY=on (inlined at build time). */
export function isUpayUiEnabled(value = process.env.NEXT_PUBLIC_UPAY): boolean {
  return value?.trim().toLowerCase() === 'on';
}

/**
 * Round 9 (UPAY): card payment on upay's page, shown inside our page (iframe in a dialog). The card
 * number is typed only on upay's page. If the frame cannot show it, the customer gets a link to
 * open upay's page in the same window, and comes back to /payment/upay/return.
 */
export function UpayCheckout({ email }: { email: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/payments/upay/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const j = (await res.json()) as { url?: string };
      if (!res.ok || !j.url) throw new Error('create_failed');
      setUrl(j.url);
    } catch {
      setError('לא הצלחנו לפתוח את דף התשלום. אפשר לנסות שוב או לשלם ב PayPal.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="upay-checkout" style={{ marginTop: 12 }}>
      <button type="button" className="btn w-full justify-center" onClick={() => void start()} disabled={busy}>
        {busy ? 'פותחים את דף התשלום...' : 'תשלום בכרטיס אשראי'}
      </button>
      {error ? <p role="alert" style={{ marginTop: 8, fontSize: 13 }}>{error}</p> : null}
      {url ? (
        <div role="dialog" aria-modal="true" aria-label="תשלום בכרטיס אשראי" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'grid', placeItems: 'center', zIndex: 1000, padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 12, width: 'min(520px, 100%)', height: 'min(720px, 90vh)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <iframe title="דף התשלום של upay" src={url} style={{ border: 0, flex: 1, width: '100%' }} allow="payment" />
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: 8, fontSize: 13, color: '#333' }}>
              <a href={url}>הדף לא נטען? פתיחה בחלון הזה</a>
              <button type="button" onClick={() => setUrl(null)}>סגירה</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
