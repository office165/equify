import type { ReactNode } from 'react';

export type LandingLocale = 'he' | 'en';

const DURATION_UNITS: Record<LandingLocale, { short: string; long: string }> = {
  he: { short: 'דק\u05F3', long: 'דקות' },
  en: { short: 'Min', long: 'minutes' },
};

export type BidiNumberUnitProps = {
  number: ReactNode;
  unit?: ReactNode;
  prefix?: ReactNode;
  className?: string;
  unitClassName?: string;
};

/** Isolates digits and unit text so RTL pages render "10 דק׳" / "10 Min" correctly. */
export function BidiNumberUnit({
  number,
  unit,
  prefix,
  className = '',
  unitClassName = '',
}: BidiNumberUnitProps) {
  return (
    <span className={`bidi-num-unit inline-flex items-center justify-center gap-1 ${className}`.trim()} dir="ltr">
      {prefix != null ? <span className="bidi-num-unit__prefix">{prefix}</span> : null}
      <span className="bidi-num-unit__num">{number}</span>
      {unit != null ? (
        <span className={`bidi-num-unit__unit ${unitClassName}`.trim()} dir="auto">
          {unit}
        </span>
      ) : null}
    </span>
  );
}

type DurationValueProps = {
  value?: number;
  variant?: 'short' | 'long';
  locale?: LandingLocale;
  className?: string;
  unitClassName?: string;
};

export function DurationValue({
  value = 10,
  variant = 'long',
  locale = 'he',
  className,
  unitClassName,
}: DurationValueProps) {
  return (
    <BidiNumberUnit
      className={className}
      unitClassName={unitClassName}
      number={value}
      unit={DURATION_UNITS[locale][variant]}
    />
  );
}

export function durationUnit(locale: LandingLocale, variant: 'short' | 'long'): string {
  return DURATION_UNITS[locale][variant];
}
