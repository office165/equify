'use client';

import { useEffect, useState } from 'react';
import { EQUIFY_DISPATCH_TOKEN_KEY } from '../../../../lib/payments/dispatch_token_storage';

/**
 * Round 9 (UPAY): where upay sends the customer back. The URL itself releases nothing: this page
 * asks our server, which asks upay, and goes on to the report only with a server-minted token.
 * Opened inside the payment frame, it moves the whole window.
 */
export default function UpayReturnPage() {
  const [message, setMessage] = useState('מאמתים את התשלום מול upay...');

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const order = q.get('order') ?? '';
    const sig = q.get('sig') ?? '';
    let tries = 0;
    let stopped = false;
    const tick = async () => {
      tries += 1;
      try {
        const res = await fetch(`/api/v1/payments/upay/status?order=${encodeURIComponent(order)}&sig=${encodeURIComponent(sig)}`, { cache: 'no-store' });
        const j = (await res.json()) as { status?: string; released?: boolean; dispatchToken?: string | null };
        if (j.released && j.dispatchToken) {
          try {
            sessionStorage.setItem(EQUIFY_DISPATCH_TOKEN_KEY, j.dispatchToken);
          } catch {
            // private mode: the report is still delivered by email
          }
          (window.top ?? window).location.assign('/results');
          return;
        }
        if (j.status === 'failed' || j.status === 'cancelled') {
          setMessage('התשלום לא הושלם. אפשר לחזור לאשף ולנסות שוב.');
          return;
        }
      } catch {
        // retry
      }
      if (tries >= 40) {
        setMessage('לא הצלחנו לאמת את התשלום עדיין. אם החיוב בוצע, הדוח יישלח למייל אחרי האימות, ואפשר גם לפנות אלינו.');
        return;
      }
      if (!stopped) setTimeout(tick, 3000);
    };
    void tick();
    return () => {
      stopped = true;
    };
  }, []);

  return (
    <main dir="rtl" lang="he" style={{ minHeight: '60vh', display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center' }}>
      <p role="status" aria-live="polite">{message}</p>
    </main>
  );
}
