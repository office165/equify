'use client';

import { useEquifyMotion } from './hooks/useEquifyMotion';
import type { EquifyMotionOptions } from './hooks/useEquifyMotion';

/** גשר אנימציות GSAP — נטען דינמית ללא SSR */
export default function EquifyMotionBridge(props: EquifyMotionOptions) {
  useEquifyMotion(props);
  return null;
}
