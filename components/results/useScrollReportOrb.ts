'use client';

import { useEffect, type RefObject } from 'react';
import * as THREE from 'three';

const PHI = (1 + Math.sqrt(5)) / 2;

function fibonacciSphere(count: number, radius: number): Float32Array {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const theta = (2 * Math.PI * i) / PHI;
    const y = 1 - (2 * (i + 0.5)) / count;
    const r = Math.sqrt(1 - y * y);
    positions[i * 3] = Math.cos(theta) * r * radius;
    positions[i * 3 + 1] = y * radius;
    positions[i * 3 + 2] = Math.sin(theta) * r * radius;
  }
  return positions;
}

/** Three.js cover orb — all DOM access inside useEffect only. */
export function useScrollReportOrb(
  hostRef: RefObject<HTMLElement | null>,
  options: { enabled: boolean; reducedMotion: boolean },
): void {
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const host = hostRef.current;
    if (!host || !options.enabled || options.reducedMotion) return undefined;

    const scene = new THREE.Scene();
    const width = host.clientWidth || window.innerWidth;
    const height = host.clientHeight || window.innerHeight;
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.set(0, 0, 4.2);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'low-power',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
    renderer.setSize(width, height);
    host.appendChild(renderer.domElement);

    const positions = fibonacciSphere(900, 1.35);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0x00c2b8,
      size: 0.012,
      transparent: true,
      opacity: 0.55,
    });
    const points = new THREE.Points(geo, mat);
    scene.add(points);

    let rafId = 0;
    let running = true;

    const onResize = () => {
      const w = host.clientWidth || window.innerWidth;
      const h = host.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const frame = () => {
      if (!running) return;
      points.rotation.y += 0.0018;
      points.rotation.x += 0.0006;
      renderer.render(scene, camera);
      rafId = window.requestAnimationFrame(frame);
    };

    window.addEventListener('resize', onResize, { passive: true });
    rafId = window.requestAnimationFrame(frame);

    return () => {
      running = false;
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      geo.dispose();
      mat.dispose();
      if (renderer.domElement.parentNode === host) {
        host.removeChild(renderer.domElement);
      }
    };
  }, [hostRef, options.enabled, options.reducedMotion]);
}
