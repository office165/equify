'use client';

import { useEffect, type RefObject } from 'react';

/**
 * רקע WebGL אמביינטי — פורט מ-initBg ב-HTML
 * ניקוי מלא ב-unmount
 */
export function useWizardBgCanvas(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  options: { reducedMotion: boolean },
): void {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const gl = canvas.getContext('webgl', {
      antialias: false,
      alpha: true,
      powerPreference: 'low-power',
    });
    if (!gl) return undefined;

    const vs = `attribute vec2 p; void main(){ gl_Position=vec4(p,0.,1.); }`;
    const fs = `
      precision mediump float;
      uniform float t; uniform vec2 res;
      void main(){
        vec2 uv = gl_FragCoord.xy / res;
        float d1 = length(uv - vec2(.18,.82)) - .42;
        float d2 = length(uv - vec2(.78,.22)) - .36;
        float g1 = exp(-d1*d1*3.2) * .07;
        float g2 = exp(-d2*d2*2.8) * .055;
        float pulse = .5+.5*sin(t*.4);
        gl_FragColor = vec4(0.,g1*.9+g2*.7+pulse*.01,(g1+g2)*.95,g1+g2);
      }`;

    function mkShader(type: number, src: string): WebGLShader | null {
      const s = gl!.createShader(type);
      if (!s) return null;
      gl!.shaderSource(s, src);
      gl!.compileShader(s);
      return s;
    }

    const prog = gl.createProgram();
    if (!prog) return undefined;

    const vShader = mkShader(gl.VERTEX_SHADER, vs);
    const fShader = mkShader(gl.FRAGMENT_SHADER, fs);
    if (!vShader || !fShader) return undefined;

    gl.attachShader(prog, vShader);
    gl.attachShader(prog, fShader);
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const tLoc = gl.getUniformLocation(prog, 't');
    const rLoc = gl.getUniformLocation(prog, 'res');
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const cvs = canvas;
    const ctx = gl;

    function resize(): void {
      cvs.width = window.innerWidth;
      cvs.height = window.innerHeight;
      ctx.viewport(0, 0, cvs.width, cvs.height);
    }
    resize();
    window.addEventListener('resize', resize, { passive: true });

    let raf = 0;
    const start = performance.now();

    function drawFrame(t: number): void {
      ctx.uniform1f(tLoc, t);
      ctx.uniform2f(rLoc, cvs.width, cvs.height);
      ctx.drawArrays(ctx.TRIANGLE_STRIP, 0, 4);
    }

    if (options.reducedMotion) {
      drawFrame(0);
    } else {
      function frame(): void {
        raf = requestAnimationFrame(frame);
        const t = (performance.now() - start) / 1000;
        drawFrame(t);
      }
      frame();
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      ctx.deleteProgram(prog);
      ctx.deleteShader(vShader);
      ctx.deleteShader(fShader);
      if (buf) ctx.deleteBuffer(buf);
    };
  }, [canvasRef, options.reducedMotion]);
}
