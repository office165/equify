'use client';

import dynamic from 'next/dynamic';
import { useCallback, useState } from 'react';
import { useReducedMotion } from '../motion/useReducedMotion';
import { useLandingRefs } from './hooks/useLandingRefs';
import { LandingFooter } from './shared/LandingFooter';
import { LandingNav } from './shared/LandingNav';
import { LandingPreloader } from './shared/LandingPreloader';
import { MarqueeBand } from './shared/MarqueeBand';
import { CalculatorSection } from './sections/CalculatorSection';
import { FaqSection } from './sections/FaqSection';
import { FinalCtaSection } from './sections/FinalCtaSection';
import { HeroSection } from './sections/HeroSection';
import { ModelsSection } from './sections/ModelsSection';
import { PricingSection } from './sections/PricingSection';
import { StatsSection } from './sections/StatsSection';
import { StepsSection } from './sections/StepsSection';
import './equify-tokens.css';
import './equify-landing.css';

// GSAP — ייבוא דינמי, ללא SSR
const EquifyMotionBridge = dynamic(() => import('./EquifyMotionBridge'), { ssr: false });

// Three.js terrain — ייבוא דינמי, ללא SSR
const EquifyTerrainBridge = dynamic(() => import('./EquifyTerrainBridge'), { ssr: false });

/** דף נחיתה equify — קומפוזיציה של כל הסקשנים */
export function EquifyLandingPage() {
  const reducedMotion = useReducedMotion();
  const [loaderVisible, setLoaderVisible] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const refs = useLandingRefs();

  const onPreloadComplete = useCallback(() => setLoaderVisible(false), []);

  return (
    <div
      className="equify-landing-root relative min-h-[100dvh] overflow-x-clip pb-safe text-right"
      dir="rtl"
      lang="he"
    >
      <LandingPreloader loaderRef={refs.loaderRef} visible={loaderVisible} />

      <LandingNav
        navRef={refs.navRef}
        menuOpen={menuOpen}
        onOpenMenu={() => setMenuOpen(true)}
        onCloseMenu={() => setMenuOpen(false)}
      />

      <HeroSection
        terrainRef={refs.terrainRef}
        heroValRef={refs.heroValRef}
        sparkLineRef={refs.sparkLineRef}
        sparkFillRef={refs.sparkFillRef}
        tiltCardRef={refs.tiltCardRef}
      />

      <MarqueeBand marqueeRef={refs.marqueeRef} />
      <StatsSection />
      <StepsSection stepsGridRef={refs.stepsGridRef} beamRef={refs.beamRef} />
      <CalculatorSection />
      <ModelsSection />
      <PricingSection
        priceCardRef={refs.priceCardRef}
        quotaNumRef={refs.quotaNumRef}
        quotaBarRef={refs.quotaBarRef}
      />
      <FaqSection />
      <FinalCtaSection />
      <LandingFooter />

      <EquifyMotionBridge
        reducedMotion={reducedMotion}
        onPreloadComplete={onPreloadComplete}
        {...refs}
      />

      <EquifyTerrainBridge
        hostRef={refs.terrainRef}
        enabled={!reducedMotion}
        reducedMotion={reducedMotion}
      />
    </div>
  );
}
