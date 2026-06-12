export {
  DUR,
  EASE,
  PROGRESS_SPRING,
  STAGGER,
  VIEWPORT_REVEAL,
} from '../../../lib/motion';

/** @deprecated Use STAGGER from lib/motion */
export const STAGGER_MS = 0.08;

/** @deprecated Hero word stagger — prefer DUR/EASE */
export const SPRING = { type: 'spring' as const, stiffness: 200, damping: 25 };

/** @deprecated Use sectionReveal y offset */
export const FADE_RISE_PX = 28;

export const RTL_ORIGIN = { x: 1, y: 0 };

export const PARALLAX_BLOB = 0.3;
export const PARALLAX_3D = 0.6;
export const PARALLAX_CONTENT = 1;
