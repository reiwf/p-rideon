"use client";

/* Day-trip destinations — an infinite carousel of full-bleed cover images.
   One rAF loop drives everything: a slow auto-glide leftwards, manual
   drag/swipe in either direction (with momentum on release), seamless
   wrap-around (the track holds two identical groups; the offset is taken
   modulo one group's width), and the centre-stage effect that scales and
   brightens whichever cards are mid-screen. Hovering pauses the auto-glide;
   prefers-reduced-motion disables it entirely (swiping still works). */

import { useEffect, useRef } from "react";
import { useI18n } from "./LanguageProvider";
import { SectionHead } from "./Fleet";

const places = [
  { key: "kyoto", kanji: "京都", img: "/destinations/kyoto.jpg", km: 55, time: "1h" },
  { key: "nara", kanji: "奈良", img: "/destinations/nara.jpg", km: 35, time: "45m" },
  { key: "kobe", kanji: "神戸", img: "/destinations/kobe.jpg", km: 30, time: "40m" },
  { key: "wakayama", kanji: "和歌山", img: "/destinations/wakayama.jpg", km: 85, time: "1h 20m" },
] as const;

const AUTO_SPEED = 0.04; // px per ms ≈ 40px/s leftwards

function Card({ place, name, sub, meta }: { place: (typeof places)[number]; name: string; sub: string; meta: string }) {
  return (
    <div className="group relative block h-[400px] w-[280px] shrink-0 select-none overflow-hidden rounded-[18px] border border-hairline sm:h-[440px] sm:w-[330px]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={place.img}
        alt={name}
        loading="lazy"
        draggable={false}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-[500ms] ease-out group-hover:scale-[1.16]"
      />
      <div aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,9,6,0.18)_0%,transparent_35%,transparent_52%,rgba(10,9,6,0.78)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 p-6">
        <p className="text-[0.6rem] font-medium uppercase tracking-[0.28em] text-[#d6bf85]">{meta}</p>
        <p className="mt-1.5 font-display text-[1.75rem] leading-tight text-white">{name}</p>
        <p className="mt-0.5 text-[0.66rem] font-light uppercase tracking-[0.32em] text-white/60">{sub}</p>
      </div>
    </div>
  );
}

export function Destinations() {
  const { t, locale } = useI18n();
  const wrapRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const track = trackRef.current;
    if (!wrap || !track) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let offset = 0; // px scrolled leftwards, wrapped modulo one group width
    let vel = 0; // momentum after a swipe, px/ms (positive = leftwards)
    let dragging = false;
    let hovering = false;
    let lastX = 0;
    let lastMove = 0;
    let prev = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(64, now - prev);
      prev = now;
      const wr = wrap.getBoundingClientRect();
      if (wr.bottom < 0 || wr.top > window.innerHeight) return; // offscreen

      if (!dragging) {
        if (Math.abs(vel) > 0.02) {
          offset += vel * dt;
          vel *= Math.pow(0.94, dt / 16.7); // momentum decay
        } else if (!reduced && !hovering) {
          offset += AUTO_SPEED * dt;
        }
      }

      const half = track.scrollWidth / 2;
      if (half > 0) offset = ((offset % half) + half) % half;
      track.style.transform = `translate3d(${-offset}px,0,0)`;

      // centre-stage: scale/brighten by distance from the viewport centre
      const mid = window.innerWidth / 2;
      for (const el of wrap.querySelectorAll<HTMLElement>("[data-mcard]")) {
        const r = el.getBoundingClientRect();
        const reach = mid + r.width / 2;
        const t01 = Math.max(0, 1 - Math.abs(r.left + r.width / 2 - mid) / reach);
        const ease = Math.sin((t01 * Math.PI) / 2);
        el.style.transform = `scale(${(0.86 + 0.14 * ease).toFixed(4)})`;
        el.style.opacity = (0.5 + 0.5 * ease).toFixed(3);
      }
    };
    raf = requestAnimationFrame(tick);

    const down = (e: PointerEvent) => {
      dragging = true;
      vel = 0;
      lastX = e.clientX;
      lastMove = performance.now();
      wrap.setPointerCapture(e.pointerId);
      wrap.classList.add("cursor-grabbing");
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      const now = performance.now();
      const dx = e.clientX - lastX;
      offset -= dx; // finger right → cards follow right
      vel = -dx / Math.max(1, now - lastMove);
      lastX = e.clientX;
      lastMove = now;
    };
    const up = () => {
      dragging = false;
      wrap.classList.remove("cursor-grabbing");
    };
    // pause-on-hover is a mouse nicety only: touch taps emit synthetic mouse
    // events with no matching leave, which would freeze the glide forever
    const enter = (e: PointerEvent) => { if (e.pointerType === "mouse") hovering = true; };
    const leave = (e: PointerEvent) => { if (e.pointerType === "mouse") hovering = false; };

    wrap.addEventListener("pointerdown", down);
    wrap.addEventListener("pointermove", move);
    wrap.addEventListener("pointerup", up);
    wrap.addEventListener("pointercancel", up);
    wrap.addEventListener("pointerenter", enter);
    wrap.addEventListener("pointerleave", leave);
    return () => {
      cancelAnimationFrame(raf);
      wrap.removeEventListener("pointerdown", down);
      wrap.removeEventListener("pointermove", move);
      wrap.removeEventListener("pointerup", up);
      wrap.removeEventListener("pointercancel", up);
      wrap.removeEventListener("pointerenter", enter);
      wrap.removeEventListener("pointerleave", leave);
    };
  }, []);

  const cards = places.map((p) => ({
    place: p,
    name: t.dest.places[p.key],
    // the counterpart script as a quiet subtitle: kanji for Latin readers, romaji otherwise
    sub: locale === "en" ? p.kanji : p.key.toUpperCase(),
    meta: `${p.km} km · ${p.time} · ${t.dest.fromOsaka}`,
  }));
  // each group repeats the set so the track fills ultrawide screens too
  const group = [...cards, ...cards];

  return (
    <section id="destinations" className="scroll-mt-20 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHead eyebrow={t.dest.eyebrow} title={t.dest.title} />
        <p className="mt-3 max-w-[52ch] text-[0.95rem] font-light leading-[1.6] text-muted">{t.dest.sub}</p>
      </div>

      <div
        ref={wrapRef}
        className="mt-12 cursor-grab touch-pan-y overflow-hidden py-4"
        aria-label={t.dest.title}
      >
        <div ref={trackRef} className="flex w-max will-change-transform">
          {[0, 1].map((half) => (
            <div key={half} className="flex gap-5 pr-5" aria-hidden={half === 1}>
              {group.map((c, i) => (
                <div key={`${half}-${i}`} data-mcard className="shrink-0 will-change-transform">
                  <Card {...c} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
