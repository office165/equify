'use client';

import { useEffect, useState } from 'react';
import { fetchLaunchSlots, type LaunchSlotsResponse } from '../../lib/landing/launchSlots';
import { FadeRise } from './motion/FadeRise';
import { PricingCard } from './PricingCard';

export function PricingFomoSection() {
  const [slots, setSlots] = useState<LaunchSlotsResponse | null>(null);

  useEffect(() => {
    void fetchLaunchSlots().then(setSlots);
  }, []);

  const total = slots?.total ?? 100;
  const remaining = slots?.remaining ?? 23;
  const claimedPct = total > 0 ? Math.round(((total - remaining) / total) * 100) : 0;

  return (
    <section
      className="landing-section overflow-visible pb-12 pt-6 md:pb-20 md:pt-8"
      aria-labelledby="pricing-title"
      id="pricing"
      dir="rtl"
      lang="he"
    >
      <FadeRise className="mb-10 text-center">
        <p className="typo-eyebrow mb-3">תמחור</p>
        <h2 id="pricing-title" className="typo-h2 text-2xl sm:text-3xl">
          מוכן לדעת כמה שווה העסק שלך?
        </h2>
      </FadeRise>

      <FadeRise>
        <PricingCard remaining={remaining} total={total} claimedPct={claimedPct} />
      </FadeRise>
    </section>
  );
}
