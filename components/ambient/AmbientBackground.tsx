'use client';

import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import type { CSSProperties } from 'react';
import { PARALLAX_BLOB } from '../landing/motion/motionConfig';

const NOISE_DATA_URI =
  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

interface AmbientBlob {
  className: string;
  color: string;
  size: string;
  top?: string;
  bottom?: string;
  insetInlineStart?: string;
  insetInlineEnd?: string;
  animate: { x: number[]; y: number[] };
  parallaxFactor: number;
}

const BLOBS: AmbientBlob[] = [
  {
    className: 'ambient-blob ambient-blob-a',
    color: 'rgba(0, 245, 160, 0.08)',
    size: '42rem',
    top: '-8%',
    insetInlineEnd: '-6%',
    animate: { x: [0, 18, -12, 0], y: [0, -14, 10, 0] },
    parallaxFactor: PARALLAX_BLOB,
  },
  {
    className: 'ambient-blob ambient-blob-b',
    color: 'rgba(16, 185, 129, 0.07)',
    size: '36rem',
    bottom: '-10%',
    insetInlineStart: '-8%',
    animate: { x: [0, -16, 20, 0], y: [0, 12, -18, 0] },
    parallaxFactor: PARALLAX_BLOB * 0.85,
  },
  {
    className: 'ambient-blob ambient-blob-c',
    color: 'rgba(0, 245, 160, 0.06)',
    size: '28rem',
    top: '38%',
    insetInlineStart: '42%',
    animate: { x: [0, 14, -20, 0], y: [0, 20, -8, 0] },
    parallaxFactor: PARALLAX_BLOB * 0.95,
  },
];

function blobStyle(blob: AmbientBlob): CSSProperties {
  return {
    width: blob.size,
    height: blob.size,
    top: blob.top,
    bottom: blob.bottom,
    insetInlineStart: blob.insetInlineStart,
    insetInlineEnd: blob.insetInlineEnd,
    background: `radial-gradient(circle, ${blob.color} 0%, transparent 70%)`,
  };
}

function ParallaxBlob({ blob, reduced }: { blob: AmbientBlob; reduced: boolean }) {
  const { scrollY } = useScroll();
  const y = useTransform(
    scrollY,
    [0, 1200],
    [0, reduced ? 0 : -1200 * blob.parallaxFactor],
  );

  if (reduced) {
    return <div className={blob.className} style={blobStyle(blob)} />;
  }

  return (
    <motion.div
      className={blob.className}
      style={{ ...blobStyle(blob), y, willChange: 'transform' }}
      animate={blob.animate}
      transition={{
        duration: 18,
        ease: 'easeInOut',
        repeat: Infinity,
      }}
    />
  );
}

export function AmbientBackground() {
  const reducedMotion = useReducedMotion();

  return (
    <div className="ambient-bg" aria-hidden>
      <div className="ambient-bg-base" />
      <div className="ambient-bg-aura" />
      {BLOBS.map((blob) => (
        <ParallaxBlob key={blob.className} blob={blob} reduced={!!reducedMotion} />
      ))}
      <div className="ambient-bg-noise" style={{ backgroundImage: NOISE_DATA_URI }} />
      <div className="ambient-bg-grid" />
    </div>
  );
}
