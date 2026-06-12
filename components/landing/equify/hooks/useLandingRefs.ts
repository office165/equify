'use client';

import { useRef } from 'react';

/** אוסף refs משותף ל-GSAP motion ול-Hero terrain */
export function useLandingRefs() {
  return {
    terrainRef: useRef<HTMLDivElement>(null),
    loaderRef: useRef<HTMLDivElement>(null),
    navRef: useRef<HTMLElement>(null),
    heroValRef: useRef<HTMLSpanElement>(null),
    sparkLineRef: useRef<SVGPathElement>(null),
    sparkFillRef: useRef<SVGPathElement>(null),
    tiltCardRef: useRef<HTMLDivElement>(null),
    marqueeRef: useRef<HTMLDivElement>(null),
    stepsGridRef: useRef<HTMLDivElement>(null),
    beamRef: useRef<HTMLElement>(null),
    priceCardRef: useRef<HTMLDivElement>(null),
    quotaNumRef: useRef<HTMLSpanElement>(null),
    quotaBarRef: useRef<HTMLElement>(null),
  };
}

export type LandingRefs = ReturnType<typeof useLandingRefs>;
