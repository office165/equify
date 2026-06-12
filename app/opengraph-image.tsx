import { ImageResponse } from 'next/og';
import { BRAND_OG_ALT } from '../lib/brand/brand-identity';

export const runtime = 'edge';
export const alt = BRAND_OG_ALT;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 72,
          background: 'linear-gradient(135deg, #0D1B2A 0%, #051c14 50%, #064e3b 100%)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <svg
            width="64"
            height="70"
            viewBox="0 0 44 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="mint" x1="22" y1="6" x2="42" y2="22" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#34D399" />
                <stop offset="100%" stopColor="#2DD4BF" />
              </linearGradient>
            </defs>
            <path d="M6 10h4v28H6z" fill="#FFFFFF" />
            <path d="M6 34h22v4H6z" fill="#FFFFFF" />
            <path d="M6 22h16v4H6z" fill="#FFFFFF" />
            <path d="M6 10h16v4H6z" fill="#FFFFFF" />
            <path d="M22 10h4V6h6l8 8-8 8h-4v-4H22V10z" fill="url(#mint)" />
          </svg>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span
              style={{
                fontSize: 42,
                fontWeight: 700,
                color: '#FFFFFF',
                letterSpacing: -1,
              }}
            >
              equify
            </span>
            <span
              style={{
                fontSize: 14,
                fontWeight: 400,
                color: 'rgba(255,255,255,0.55)',
                letterSpacing: 4,
                textTransform: 'uppercase',
              }}
            >
              BY SBC
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 900 }}>
          <h1
            style={{
              margin: 0,
              fontSize: 64,
              fontWeight: 700,
              lineHeight: 1.1,
              color: '#f8fafc',
              letterSpacing: -1,
            }}
          >
            פלטפורמת הערכות שווי מוסדית
          </h1>
          <p style={{ margin: 0, fontSize: 28, lineHeight: 1.45, color: '#cbd5e1' }}>
            DCF · Bear / Base / Bull · דוחות מנהלים · תמיכה בעברית
          </p>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 22,
            color: '#94a3b8',
          }}
        >
          <span>equify.co.il</span>
          <span style={{ color: '#34d399' }}>ILS · USD · EUR · GBP</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
