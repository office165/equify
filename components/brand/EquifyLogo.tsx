'use client';

import React, { useId } from 'react';
import { BRAND_LOGO_TITLE } from '../../lib/brand/brand-identity';
import {
  EQUIFY_SITE_LOGO_ASPECT,
  EQUIFY_SITE_LOGO_SRC,
  equifyStackedLogoSize,
} from '../../lib/brand/brand-logo';
import {
  EQUIFY_ARROW_GRADIENT,
  EQUIFY_ARROW_PATH,
  EQUIFY_BAR_BOTTOM_PATH,
  EQUIFY_BAR_MIDDLE_PATH,
  EQUIFY_BAR_TOP_PATH,
  EQUIFY_MARK_VIEWBOX,
  EQUIFY_SLICE_PATH,
  EQUIFY_STEM_PATH,
} from './equify-mark-paths';

export type EquifyLogoVariant = 'dark-bg' | 'light-bg';

export interface EquifyLogoProps {
  variant?: EquifyLogoVariant;
  premium?: boolean;
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

/** Render height (px) — mobile baseline. */
const LOGO_HEIGHT_DEFAULT = 58;

const LOGO_IMG_CLASS =
  'equify-logo-img w-auto object-contain mix-blend-[plus-lighter]';

/** Mobile stays 58px; desktop +~35% (md) / +~38% (lg). */
function responsiveLogoSizeClass(compact: boolean, premium: boolean): string {
  if (compact) return '';
  if (premium) return 'md:h-[76px] lg:h-[92px]';
  return 'md:h-[72px] lg:h-[80px]';
}

function intrinsicLogoHeightPx(compact: boolean, premium: boolean): number {
  if (compact) return LOGO_HEIGHT_DEFAULT;
  if (premium) return 92;
  return 80;
}

export function EquifyLogo({
  premium = false,
  compact = false,
  className = '',
  markOnly = false,
  titleId: titleIdProp,
  decorative = false,
  variant: _variant = 'dark-bg',
}: EquifyLogoProps) {
  const uid = useId().replace(/:/g, '');
  const titleId = decorative ? undefined : (titleIdProp ?? `equify-logo-title-${uid}`);
  const gradId = `equify-lockup-${uid}`;

  if (markOnly) {
    return (
      <EquifyMark
        variant={_variant}
        className={className}
        gradientId={gradId}
        titleId={titleId}
      />
    );
  }

  const heightPx = intrinsicLogoHeightPx(compact, premium);
  const { width, height } = equifyStackedLogoSize(heightPx);
  const sizeClass = compact
    ? 'h-[58px]'
    : `h-[58px] ${responsiveLogoSizeClass(compact, premium)}`.trim();

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={EQUIFY_SITE_LOGO_SRC}
      alt={decorative ? '' : BRAND_LOGO_TITLE}
      aria-hidden={decorative ? true : undefined}
      width={width}
      height={height}
      decoding="async"
      className={`${LOGO_IMG_CLASS} ${sizeClass} ${premium ? 'equify-logo-img--premium' : ''} ${compact ? 'equify-logo-img--compact' : ''} bg-transparent ${className}`}
      style={{ backgroundColor: 'transparent', mixBlendMode: 'plus-lighter' }}
    />
  );
}
