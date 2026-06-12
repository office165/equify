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

export function useResultsBgOrb(
  hostRef: RefObject<HTMLElement | null>,
  options: { enabled: boolean; reducedMotion: boolean },
): void {
  useEffect(() => {
    const host = hostRef.current;
    if (!host || !options.enabled) return undefined;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050f0d, 0.04);

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
    renderer.domElement.className = 'rr-orb-canvas';
    host.appendChild(renderer.domElement);

    const spherePositions = fibonacciSphere(1200, 1.35);
    const sphereGeo = new THREE.BufferGeometry();
    sphereGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(spherePositions, 3),
    );

    const sphereMat = new THREE.PointsMaterial({
      size: 0.018,
      color: 0x00c2b8,
      transparent: true,
      opacity: 0.55,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const sphere = new THREE.Points(sphereGeo, sphereMat);
    scene.add(sphere);

    const torusGeo = new THREE.TorusGeometry(1.85, 0.012, 8, 180);
    const torusMat = new THREE.MeshBasicMaterial({
      color: 0x4dd6ce,
      transparent: true,
      opacity: 0.35,
    });
    const torus = new THREE.Mesh(torusGeo, torusMat);
    torus.rotation.x = Math.PI * 0.42;
    scene.add(torus);

    const innerTorusGeo = new THREE.TorusGeometry(1.15, 0.008, 6, 120);
    const innerTorusMat = new THREE.MeshBasicMaterial({
      color: 0xc49a3c,
      transparent: true,
      opacity: 0.22,
    });
    const innerTorus = new THREE.Mesh(innerTorusGeo, innerTorusMat);
    innerTorus.rotation.x = Math.PI * 0.25;
    innerTorus.rotation.y = Math.PI * 0.15;
    scene.add(innerTorus);

    let mx = 0;
    let my = 0;
    let tx = 0;
    let ty = 0;
    let t = 0;
    let rafId = 0;
    let running = true;

    const onPointerMove = (e: PointerEvent) => {
      tx = e.clientX / window.innerWidth - 0.5;
      ty = e.clientY / window.innerHeight - 0.5;
    };

    const onResize = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const onVisibility = () => {
      running = document.visibilityState === 'visible';
      if (running && !rafId) frame();
    };

    const frame = () => {
      rafId = 0;
      if (!running) return;

      rafId = window.requestAnimationFrame(frame);
      if (!options.reducedMotion) t += 0.008;

      mx += (tx - mx) * 0.035;
      my += (ty - my) * 0.035;

      sphere.rotation.y = t * 0.35 + mx * 0.4;
      sphere.rotation.x = my * 0.25;
      torus.rotation.z = t * 0.5;
      innerTorus.rotation.z = -t * 0.35;

      camera.position.x = mx * 0.35;
      camera.position.y = my * 0.25;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    frame();

    return () => {
      running = false;
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
      sphereGeo.dispose();
      sphereMat.dispose();
      torusGeo.dispose();
      torusMat.dispose();
      innerTorusGeo.dispose();
      innerTorusMat.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === host) {
        host.removeChild(renderer.domElement);
      }
    };
  }, [hostRef, options.enabled, options.reducedMotion]);
}
