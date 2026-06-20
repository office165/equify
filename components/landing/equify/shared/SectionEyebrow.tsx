type SectionEyebrowProps = {
  children: React.ReactNode;
  /** Center the label block under section titles (e.g. pricing). */
  centered?: boolean;
  className?: string;
};

/** Section kicker — default aligns to RTL start; centered variant balances decorative lines. */
export function SectionEyebrow({ children, centered = false, className = '' }: SectionEyebrowProps) {
  if (!centered) {
    return <span className={`eyebrow rv ${className}`.trim()}>{children}</span>;
  }

  return (
    <div className={`eyebrow-wrap ${className}`.trim()}>
      <span className="eyebrow-mark" aria-hidden="true" />
      <span className="eyebrow eyebrow--no-mark rv">{children}</span>
      <span className="eyebrow-mark" aria-hidden="true" />
    </div>
  );
}
