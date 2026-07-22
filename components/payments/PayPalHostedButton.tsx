'use client';

import { useEffect, useState } from 'react';
import { CLIENT_ID } from '../../lib/payments/paypal_hosted_button_ids';

type PaypalHostedButtonsApi = {
  HostedButtons: (opts: { hostedButtonId: string }) => {
    render: (selector: string) => Promise<void> | void;
  };
};

declare global {
  interface Window {
    paypal?: PaypalHostedButtonsApi;
  }
}

function sdkSrc(clientId: string): string {
  return `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&components=hosted-buttons&disable-funding=venmo&currency=ILS`;
}

function loadPaypalSdk(clientId: string): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('ssr'));
  }
  if (window.paypal?.HostedButtons) {
    return Promise.resolve();
  }

  const src = sdkSrc(clientId);
  const existing = document.querySelector<HTMLScriptElement>(
    `script[src="${src}"]`,
  );
  if (existing) {
    return new Promise((resolve, reject) => {
      if (window.paypal?.HostedButtons) {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener(
        'error',
        () => reject(new Error('paypal_sdk_load_failed')),
        { once: true },
      );
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('paypal_sdk_load_failed'));
    document.body.appendChild(script);
  });
}

export interface PayPalHostedButtonProps {
  hostedButtonId: string;
}

export function PayPalHostedButton({ hostedButtonId }: PayPalHostedButtonProps) {
  const containerId = `paypal-container-${hostedButtonId}`;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const container = document.getElementById(containerId);

    const run = async () => {
      if (!hostedButtonId) {
        setError(true);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(false);
      if (container) container.innerHTML = '';

      try {
        await loadPaypalSdk(CLIENT_ID);
        if (cancelled) return;
        if (!window.paypal?.HostedButtons) {
          setError(true);
          setLoading(false);
          return;
        }

        await Promise.resolve(
          window.paypal.HostedButtons({ hostedButtonId }).render(
            `#${containerId}`,
          ),
        );
        if (!cancelled) setLoading(false);
      } catch (err) {
        console.error('[PayPalHostedButton]', err);
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
      const node = document.getElementById(containerId);
      if (node) node.innerHTML = '';
    };
  }, [hostedButtonId, containerId]);

  return (
    <div className="equify-paypal-hosted-button w-full" data-hosted-button-id={hostedButtonId}>
      {loading ? (
        <div
          className="flex items-center justify-center gap-2 py-3 text-sm text-slate-400"
          role="status"
          aria-live="polite"
        >
          <span
            className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-[#00F5A0]"
            aria-hidden
          />
          <span>טוען תשלום מאובטח...</span>
        </div>
      ) : null}
      {error ? (
        <p className="py-2 text-sm text-red-300" role="alert">
          לא ניתן לטעון את כפתור התשלום. רענן את העמוד או נסה שוב.
        </p>
      ) : null}
      <div id={containerId} className="min-h-[45px] w-full" />
    </div>
  );
}
