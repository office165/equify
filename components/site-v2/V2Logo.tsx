/**
 * Round 11 (SITE_V2): equify's logo (public/equify_site_logo.svg: a turquoise dot, "equify", and "BY SBC" in gold under it), set in
 * HTML so it takes the theme's colour and so its words are the link's words (a screen reader and the visible text agree).
 * `suffix` is read by screen readers only (for example ", דף הבית").
 */
export function V2Logo({ className = '', suffix = '' }: { className?: string; suffix?: string }) {
  return (
    <span className={`v2-lg ${className}`.trim()} dir="ltr">
      <span className="v2-lg-row">
        <span className="v2-lg-dot" aria-hidden="true" />
        <span className="v2-lg-word">equify</span>
      </span>
      <span className="v2-lg-by">BY SBC</span>
      {suffix ? <span className="v2-sr">{suffix}</span> : null}
    </span>
  );
}
