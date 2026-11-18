/**
 * Round 6: Vercel Analytics and Speed Insights, behind NEXT_PUBLIC_ANALYTICS (off by default).
 * NEXT_PUBLIC_* is inlined at build time, so turning it on needs a redeploy. With the flag off
 * nothing is rendered, no script is loaded, and the packages are imported only when the flag is on.
 */
export function analyticsEnabled(value = process.env.NEXT_PUBLIC_ANALYTICS): boolean {
  return value?.trim().toLowerCase() === 'on';
}

export async function SiteAnalytics() {
  if (!analyticsEnabled()) return null;
  const [{ Analytics }, { SpeedInsights }] = await Promise.all([
    import('@vercel/analytics/next'),
    import('@vercel/speed-insights/next'),
  ]);
  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
}
