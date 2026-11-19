'use client';

import { useSiteFlags } from '../../shared/SiteFlagsContext';
import {
  LANDING_FAQ,
  LANDING_FAQ_V2,
  LANDING_MODELS,
  LANDING_MODELS_V2,
  LANDING_STEPS,
  LANDING_STEPS_V2,
  MARQUEE_ITEMS,
  MARQUEE_ITEMS_V2,
  PRICING_FEATURES,
  PRICING_FEATURES_V2,
} from './equify-data';

/** Round 10: the landing copy, as it was or (COPY_V2) corrected. */
export function landingCopy(copyV2: boolean) {
  return copyV2
    ? { marquee: MARQUEE_ITEMS_V2, models: LANDING_MODELS_V2, faq: LANDING_FAQ_V2, steps: LANDING_STEPS_V2, pricing: PRICING_FEATURES_V2 }
    : { marquee: MARQUEE_ITEMS, models: LANDING_MODELS, faq: LANDING_FAQ, steps: LANDING_STEPS, pricing: PRICING_FEATURES };
}

export function useLandingCopy() {
  const { copyV2 } = useSiteFlags();
  return { copyV2, ...landingCopy(copyV2) };
}
