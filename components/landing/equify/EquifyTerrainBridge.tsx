'use client';

import type { RefObject } from 'react';
import { useEquifyTerrain } from './hooks/useEquifyTerrain';

interface EquifyTerrainBridgeProps {
  hostRef: RefObject<HTMLDivElement>;
  enabled: boolean;
  reducedMotion: boolean;
}

/** גשר Three.js terrain — נטען דינמית ללא SSR */
export default function EquifyTerrainBridge({ hostRef, enabled, reducedMotion }: EquifyTerrainBridgeProps) {
  useEquifyTerrain(hostRef, { enabled, reducedMotion });
  return null;
}
