function resolveEmailAssetBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://equify.co.il';
  return raw.replace(/\/$/, '');
}

export const EMAIL_THEME = {
  outerBackground: '#f7f9fa',
  cardBackground: '#ffffff',
  border: '#e2e8f0',
  headerBackground: '#0B201B',
  brandInk: '#F5F7F6',
  accent: '#3FC7B9',
  gold: '#A8842E',
  /** Accessible text/link color on light backgrounds — never use `accent` for text. */
  accentText: '#0F766E',
  bodyText: '#2d3748',
  headingText: '#1a202c',
  secondaryText: '#4a5568',
  signatureText: '#718096',
  footerText: '#a0aec0',
  ctaBackground: '#0B201B',
  ctaText: '#F5F7F6',
  blockBackground: '#fdfdfd',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  maxWidthPx: 600,
  /** Absolute URL — relative paths break in email clients. Uses Preview/prod site origin. */
  logoUrl: `${resolveEmailAssetBaseUrl()}/equify-logo-on-dark.png`,
  logoWidthPx: 220,
} as const;
