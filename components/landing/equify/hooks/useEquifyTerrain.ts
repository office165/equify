'use client';

import { useEffect, type RefObject } from 'react';

/** Three.js terrain — ייבוא דינמי בלבד (ללא SSR) */
export function useEquifyTerrain(
  hostRef: RefObject<HTMLElement>,
  options: { enabled: boolean; reducedMotion: boolean },
): void {
  useEffect(() => {
    const host = hostRef.current;
    if (!host || !options.enabled) return undefined;

    let disposed = false;
    let cleanup: (() => void) | undefined;

    void import('three').then((THREE) => {
      if (disposed || !hostRef.current) return;

      const COLS = 110;
      const ROWS = 70;
      const SP = 0.42;
      const count = COLS * ROWS;

      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x050f0d, 0.055);

      const width = host.clientWidth || window.innerWidth;
      const height = host.clientHeight || window.innerHeight;
      const camera = new THREE.PerspectiveCamera(58, width / height, 0.1, 100);
      camera.position.set(0, 3.2, 9.5);
      camera.lookAt(0, 0, 0);

      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'low-power',
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
      renderer.setSize(width, height);
      host.appendChild(renderer.domElement);

      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);
      const cTurq = new THREE.Color(0x00c2b8);
      const cMint = new THREE.Color(0x9eeee6);
      const cPine = new THREE.Color(0x0f2e29);
      const tmp = new THREE.Color();

      let idx = 0;
      for (let r = 0; r < ROWS; r += 1) {
        for (let c = 0; c < COLS; c += 1) {
          positions[idx * 3] = (c - COLS / 2) * SP;
          positions[idx * 3 + 1] = 0;
          positions[idx * 3 + 2] = (r - ROWS / 2) * SP;
          idx += 1;
        }
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      const material = new THREE.PointsMaterial({
        size: 0.055,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        sizeAttenuation: true,
      });

      const points = new THREE.Points(geometry, material);
      points.position.y = -1.4;
      scene.add(points);

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
        if (!running || disposed) return;

        rafId = window.requestAnimationFrame(frame);
        if (!options.reducedMotion) t += 0.012;

        mx += (tx - mx) * 0.04;
        my += (ty - my) * 0.04;

        const pos = geometry.attributes.position.array as Float32Array;
        const col = geometry.attributes.color.array as Float32Array;
        let k = 0;

        for (let r = 0; r < ROWS; r += 1) {
          for (let c = 0; c < COLS; c += 1) {
            const x = pos[k * 3];
            const z = pos[k * 3 + 2];
            const y =
              Math.sin(x * 0.45 + t) * 0.55 +
              Math.cos(z * 0.55 - t * 0.8) * 0.42 +
              Math.sin((x + z) * 0.22 + t * 0.5) * 0.65;
            const damp = 1 - Math.min(1, Math.abs(z) / (ROWS * SP * 0.5)) * 0.35;
            pos[k * 3 + 1] = y * damp;

            const hNorm = (y * damp + 1.6) / 3.2;
            if (hNorm < 0.55) tmp.copy(cPine).lerp(cTurq, hNorm / 0.55);
            else tmp.copy(cTurq).lerp(cMint, (hNorm - 0.55) / 0.45);

            col[k * 3] = tmp.r;
            col[k * 3 + 1] = tmp.g;
            col[k * 3 + 2] = tmp.b;
            k += 1;
          }
        }

        geometry.attributes.position.needsUpdate = true;
        geometry.attributes.color.needsUpdate = true;
        points.rotation.y = mx * 0.18;
        camera.position.y = 3.2 + my * 0.7;
        camera.lookAt(0, 0, 0);
        renderer.render(scene, camera);
      };

      window.addEventListener('pointermove', onPointerMove, { passive: true });
      window.addEventListener('resize', onResize, { passive: true });
      document.addEventListener('visibilitychange', onVisibility);
      frame();

      cleanup = () => {
        running = false;
        if (rafId) window.cancelAnimationFrame(rafId);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('resize', onResize);
        document.removeEventListener('visibilitychange', onVisibility);
        geometry.dispose();
        material.dispose();
        renderer.dispose();
        if (renderer.domElement.parentNode === host) {
          host.removeChild(renderer.domElement);
        }
      };
    });

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [hostRef, options.enabled, options.reducedMotion]);
}
