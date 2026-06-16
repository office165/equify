'use client';

import React, { useId } from 'react';
import { BRAND_LOGO_TITLE } from '../../lib/brand/brand-identity';
import {
  EQUIFY_ARROW_GRADIENT,
  EQUIFY_ARROW_PATH,
  EQUIFY_BAR_BOTTOM_PATH,
  EQUIFY_BAR_MIDDLE_PATH,
  EQUIFY_BAR_TOP_PATH,
  EQUIFY_LOCKUP,
  EQUIFY_MARK_VIEWBOX,
  EQUIFY_SLICE_PATH,
  EQUIFY_STEM_PATH,
} from './equify-mark-paths';

export type EquifyLogoVariant = 'dark-bg' | 'light-bg';

export interface EquifyLogoProps {
  variant?: EquifyLogoVariant;
  premium?: boolean;
  /** Scales lockup for narrow mobile headers — keeps full wordmark + BY SBC */
  compact?: boolean;
  className?: string;
  showSubBrand?: boolean;
  /** @deprecated Use `<EquifyMark />` */
  markOnly?: boolean;
  titleId?: string;
  decorative?: boolean;
}

function variantColors(variant: EquifyLogoVariant) {
  if (variant === 'light-bg') {
    return { ink: '#0D1B2A', sub: 'rgba(13,27,42,0.55)', slice: '#FFFFFF' };
  }
  return { ink: '#FFFFFF', sub: 'rgba(255,255,255,0.5)', slice: '#0A0F0D' };
}

function MarkPaths({
  ink,
  slice,
  gradId,
}: {
  ink: string;
  slice: string;
  gradId: string;
}) {
  const g = EQUIFY_ARROW_GRADIENT;
  return (
    <>
      <defs>
        <linearGradient
          id={gradId}
          x1={g.x1}
          y1={g.y1}
          x2={g.x2}
          y2={g.y2}
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor={ink} />
          <stop offset="100%" stopColor={g.endColor} />
        </linearGradient>
      </defs>
      <path d={EQUIFY_STEM_PATH} fill={ink} />
      <path d={EQUIFY_BAR_BOTTOM_PATH} fill={ink} />
      <path d={EQUIFY_BAR_MIDDLE_PATH} fill={ink} />
      <path d={EQUIFY_BAR_TOP_PATH} fill={ink} />
      <path d={EQUIFY_ARROW_PATH} className="logo-arrow-path" fill={`url(#${gradId})`} />
      <path d={EQUIFY_SLICE_PATH} fill={slice} />
    </>
  );
}

export interface EquifyMarkProps {
  variant?: EquifyLogoVariant;
  className?: string;
  gradientId?: string;
  titleId?: string;
  ariaHidden?: boolean;
}

/** Icon-only mark — favicon, hero core, mobile header */
export function EquifyMark({
  variant = 'dark-bg',
  className = 'h-8 w-8',
  gradientId: gradientIdProp,
  titleId,
  ariaHidden = false,
}: EquifyMarkProps) {
  const uid = useId().replace(/:/g, '');
  const gradId = gradientIdProp ?? `equify-mark-${uid}`;
  const { ink, slice } = variantColors(variant);

  return (
    <svg
      className={className}
      viewBox={EQUIFY_MARK_VIEWBOX}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      focusable="false"
      aria-hidden={ariaHidden ? true : titleId ? undefined : true}
      aria-labelledby={titleId && !ariaHidden ? titleId : undefined}
      preserveAspectRatio="xMidYMid meet"
    >
      {titleId ? (
        <title id={titleId}>{BRAND_LOGO_TITLE}</title>
      ) : null}
      <MarkPaths ink={ink} slice={slice} gradId={gradId} />
    </svg>
  );
}

/** @deprecated Use `EquifyMark` */
export const EquifyLogoMark = EquifyMark;

export function EquifyLogo({
  variant = 'dark-bg',
  premium = false,
  compact = false,
  className = '',
  showSubBrand = true,
  markOnly = false,
  titleId: titleIdProp,
  decorative = false,
}: EquifyLogoProps) {
  const uid = useId().replace(/:/g, '');
  const titleId = decorative ? undefined : (titleIdProp ?? `equify-logo-title-${uid}`);
  const gradId = `equify-lockup-${uid}`;
  const { ink, sub, slice } = variantColors(variant);

  if (markOnly) {
    return (
      <EquifyMark
        variant={variant}
        className={className}
        gradientId={gradId}
        titleId={titleId}
      />
    );
  }

  const L = EQUIFY_LOCKUP;
  const heightClass = compact
    ? 'h-7 w-auto max-w-full sm:h-8'
    : premium
      ? 'h-10 w-auto sm:h-11 md:h-12'
      : 'h-9 w-auto sm:h-10';

  return (
    <span dir="ltr" className={`equify-logo-lockup inline-block ${heightClass} ${className}`}>
    <svg
      className="block h-full w-full"
      viewBox={L.viewBox}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative ? true : undefined}
      aria-labelledby={decorative ? undefined : titleId}
      preserveAspectRatio="xMinYMid meet"
    >
      {titleId && !decorative ? (
        <title id={titleId}>{BRAND_LOGO_TITLE}</title>
      ) : null}
      <g transform={`translate(0, ${L.markY}) scale(${L.markScale})`}>
        <MarkPaths ink={ink} slice={slice} gradId={gradId} />
      </g>
      <text
        x={L.wordmarkX}
        y={L.wordmarkY}
        fill={ink}
        fontFamily="var(--font-equify, Assistant), ui-sans-serif, system-ui, sans-serif"
        fontSize={L.wordmarkSize}
        fontWeight="700"
        letterSpacing="-0.01em"
      >
        equify
      </text>
      {showSubBrand ? (
        <text
          x={L.subBrandX}
          y={L.subBrandY}
          fill={sub}
          fontFamily="var(--font-equify, Assistant), ui-sans-serif, system-ui, sans-serif"
          fontSize="9"
          fontWeight="500"
          letterSpacing="0.18em"
          textAnchor="end"
        >
          BY SBC
        </text>
      ) : null}
    </svg>
    </span>
  );
}
