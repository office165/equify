'use client';

import { useEffect, type RefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export interface LandingMotionOptions {
  reducedMotion: boolean;
  onPreloadComplete: () => void;
  heroValRef: RefObject<HTMLSpanElement | null>;
  sparkLineRef: RefObject<SVGPathElement | null>;
  sparkFillRef: RefObject<SVGPathElement | null>;
  loaderRef: RefObject<HTMLDivElement | null>;
  navRef: RefObject<HTMLElement | null>;
  beamRef: RefObject<HTMLElement | null>;
  stepsGridRef: RefObject<HTMLElement | null>;
  priceCardRef: RefObject<HTMLDivElement | null>;
  quotaNumRef: RefObject<HTMLSpanElement | null>;
  quotaBarRef: RefObject<HTMLElement | null>;
  marqueeRef: RefObject<HTMLDivElement | null>;
  tiltCardRef: RefObject<HTMLDivElement | null>;
}

export function useLandingMotion(options: LandingMotionOptions): void {
  const {
    reducedMotion,
    onPreloadComplete,
    heroValRef,
    sparkLineRef,
    sparkFillRef,
    loaderRef,
    navRef,
    beamRef,
    stepsGridRef,
    priceCardRef,
    quotaNumRef,
    quotaBarRef,
    marqueeRef,
    tiltCardRef,
  } = options;

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    gsap.registerPlugin(ScrollTrigger);
    let removeScrollListener: (() => void) | undefined;

    const ctx = gsap.context(() => {
      const dur = (n: number) => (reducedMotion ? 0.01 : n);

      const drawSpark = () => {
        const line = sparkLineRef.current;
        const fill = sparkFillRef.current;
        if (!line || !fill) return;
        const pts = [12, 18, 15, 24, 22, 30, 28, 38, 35, 46, 44, 56, 60, 58, 70].map(
          (v, i, a) => [i * (400 / (a.length - 1)), 84 - v],
        );
        const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
        line.setAttribute('d', d);
        fill.setAttribute('d', `${d} L400 90 L0 90 Z`);
        const len = line.getTotalLength();
        line.style.strokeDasharray = String(len);
        line.style.strokeDashoffset = String(len);
        gsap.to(line, { strokeDashoffset: 0, duration: dur(2), ease: 'power2.inOut', delay: 1 });
      };

      const heroIntro = () => {
        const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
        tl.to('.h-title .ln>span', { y: 0, duration: dur(1.1), stagger: 0.12 }, 0)
          .to('.hero .rv', { opacity: 1, y: 0, duration: 0.9, stagger: 0.1 }, 0.35)
          .to('.tick-card', { opacity: 1, x: 0, duration: 1.1 }, 0.5);

        const hv = heroValRef.current;
        if (hv) {
          const o = { v: 0 };
          gsap.to(o, {
            v: 20.1,
            duration: dur(2.2),
            ease: 'power3.out',
            delay: 0.7,
            onUpdate: () => {
              hv.textContent = o.v.toFixed(1);
            },
          });
        }
        drawSpark();
      };

      const loader = loaderRef.current;
      const bar = loader?.querySelector('.l-bar i') as HTMLElement | null;
      const num = loader?.querySelector('.l-num') as HTMLElement | null;
      const o = { v: 0 };

      gsap.to(o, {
        v: 100,
        duration: dur(1.4),
        ease: 'power2.inOut',
        onUpdate: () => {
          if (bar) bar.style.width = `${o.v}%`;
          if (num) num.textContent = `${Math.round(o.v)}%`;
        },
        onComplete: () => {
          if (loader) {
            gsap.to(loader, {
              yPercent: -100,
              duration: dur(0.8),
              ease: 'power4.inOut',
              onComplete: () => {
                onPreloadComplete();
                heroIntro();
                ScrollTrigger.refresh();
              },
            });
          } else {
            onPreloadComplete();
            heroIntro();
          }
        },
      });

      const nav = navRef.current;
      const onScroll = () => {
        if (nav) nav.classList.toggle('scrolled', window.scrollY > 40);
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
      removeScrollListener = () => window.removeEventListener('scroll', onScroll);

      const marquee = marqueeRef.current;
      if (marquee && !reducedMotion) {
        gsap.to(marquee, { xPercent: 50, duration: 30, ease: 'none', repeat: -1 });
      }

      gsap.utils.toArray<HTMLElement>('section .rv, .stats .rv').forEach((el) => {
        if (el.closest('.hero')) return;
        gsap.to(el, {
          opacity: 1,
          y: 0,
          duration: dur(1),
          ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 88%' },
        });
      });

      gsap.utils.toArray<HTMLElement>('.count').forEach((el) => {
        const to = Number(el.dataset.to ?? 0);
        const counter = { v: 0 };
        ScrollTrigger.create({
          trigger: el,
          start: 'top 90%',
          once: true,
          onEnter: () => {
            gsap.to(counter, {
              v: to,
              duration: dur(1.6),
              ease: 'power2.out',
              onUpdate: () => {
                el.textContent = String(Math.round(counter.v));
              },
            });
          },
        });
      });

      const stepsGrid = stepsGridRef.current;
      const beam = beamRef.current;
      if (stepsGrid && beam) {
        ScrollTrigger.create({
          trigger: stepsGrid,
          start: 'top 75%',
          end: 'bottom 40%',
          scrub: reducedMotion ? false : 0.6,
          onUpdate: (self) => {
            beam.style.width = `${self.progress * 100}%`;
            stepsGrid.querySelectorAll('.step').forEach((s, i) => {
              s.classList.toggle('lit', self.progress > (i + 0.3) / 4);
            });
          },
        });
      }

      const priceCard = priceCardRef.current;
      if (priceCard) {
        ScrollTrigger.create({
          trigger: priceCard,
          start: 'top 80%',
          once: true,
          onEnter: () => {
            const q = { v: 0 };
            const qn = quotaNumRef.current;
            const qb = quotaBarRef.current;
            gsap.to(q, {
              v: 77,
              duration: dur(1.8),
              ease: 'power3.out',
              onUpdate: () => {
                if (qn) qn.textContent = String(Math.round(q.v));
                if (qb) qb.style.width = `${q.v}%`;
              },
            });
          },
        });

        if (!reducedMotion) {
          const ang = { a: 0 };
          gsap.to(ang, {
            a: 360,
            duration: 9,
            ease: 'none',
            repeat: -1,
            onUpdate: () => priceCard.style.setProperty('--ang', `${ang.a}deg`),
          });
        }
      }

      document.querySelectorAll<HTMLDetailsElement>('.faq').forEach((d) => {
        const body = d.querySelector('.fa-body') as HTMLElement | null;
        const summary = d.querySelector('summary');
        if (!body || !summary) return;
        summary.addEventListener('click', (e) => {
          e.preventDefault();
          if (d.open) {
            gsap.to(body, {
              height: 0,
              opacity: 0,
              duration: dur(0.35),
              ease: 'power2.inOut',
              onComplete: () => {
                d.open = false;
              },
            });
          } else {
            d.open = true;
            gsap.fromTo(
              body,
              { height: 0, opacity: 0 },
              { height: 'auto', opacity: 1, duration: dur(0.45), ease: 'power3.out' },
            );
          }
        });
      });

      if (!reducedMotion && window.matchMedia('(hover: hover)').matches) {
        document.querySelectorAll<HTMLElement>('.magnetic').forEach((btn) => {
          const onMove = (e: PointerEvent) => {
            const r = btn.getBoundingClientRect();
            gsap.to(btn, {
              x: (e.clientX - r.left - r.width / 2) * 0.25,
              y: (e.clientY - r.top - r.height / 2) * 0.35,
              duration: 0.4,
              ease: 'power3.out',
            });
          };
          const onLeave = () => gsap.to(btn, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1,.4)' });
          btn.addEventListener('pointermove', onMove);
          btn.addEventListener('pointerleave', onLeave);
        });

        const card = tiltCardRef.current;
        if (card) {
          const onMove = (e: PointerEvent) => {
            const r = card.getBoundingClientRect();
            gsap.to(card, {
              rotateY: ((e.clientX - r.left) / r.width - 0.5) * -10,
              rotateX: ((e.clientY - r.top) / r.height - 0.5) * 8,
              transformPerspective: 900,
              duration: 0.5,
              ease: 'power3.out',
            });
          };
          const onLeave = () =>
            gsap.to(card, { rotateX: 0, rotateY: 0, duration: 0.8, ease: 'elastic.out(1,.5)' });
          card.addEventListener('pointermove', onMove);
          card.addEventListener('pointerleave', onLeave);
        }

        document.querySelectorAll<HTMLElement>('.mcard').forEach((c) => {
          const glow = c.querySelector('.mc-glow') as HTMLElement | null;
          if (!glow) return;
          c.addEventListener('pointermove', (e) => {
            const r = c.getBoundingClientRect();
            glow.style.left = `${e.clientX - r.left}px`;
            glow.style.top = `${e.clientY - r.top}px`;
          });
        });
      }
    });

    return () => {
      removeScrollListener?.();
      ctx.revert();
      ScrollTrigger.getAll().forEach((st) => st.kill());
    };
  }, [
    reducedMotion,
    onPreloadComplete,
    heroValRef,
    sparkLineRef,
    sparkFillRef,
    loaderRef,
    navRef,
    beamRef,
    stepsGridRef,
    priceCardRef,
    quotaNumRef,
    quotaBarRef,
    marqueeRef,
    tiltCardRef,
  ]);
}
