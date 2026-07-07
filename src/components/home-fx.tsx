"use client";

import { useEffect, useRef, useState } from "react";

/* Scroll-reveal driver: adds .in to every .rv element (and .play to the
   verify-card) when it enters the viewport. Static export → runs client-side. */
export function FxObserver() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll(".rv, .verify-card"));
    if (typeof IntersectionObserver === "undefined") {
      els.forEach((el) => el.classList.add("in", "play"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add("in");
          if (e.target.classList.contains("verify-card")) e.target.classList.add("play");
          io.unobserve(e.target);
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return null;
}

/* Count-up stat number: easeOutQuart on reveal, tabular-nums, comma-format,
   min-width in ch to prevent layout jitter. Reduced-motion → instant. */
export function StatNumber({
  n,
  suffix = "",
  live = false,
  className = "",
}: {
  n: number;
  suffix?: string;
  live?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [v, setV] = useState(n);   // initial = the REAL number (SSG/no-JS/crawlers see it, never "0")

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const run = () => {
      const reduced =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) {
        setV(n);
        return;
      }
      const t0 = performance.now();
      const dur = 1400;
      const tick = (t: number) => {
        const p = Math.min(1, (t - t0) / dur);
        const ease = 1 - Math.pow(1 - p, 4); // easeOutQuart
        setV(Math.round(n * (0.82 + 0.18 * ease)));   // flourish the last 18% — never shows 0 or a drop
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    if (typeof IntersectionObserver === "undefined") {
      run();
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        run();
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [n]);

  const full = n.toLocaleString("en-US") + suffix;
  return (
    <span ref={ref} className="inline-flex flex-col items-center">
      <span
        className={`tabular-nums ${className}`}
        style={{ minWidth: `${full.length}ch`, display: "inline-block" }}
      >
        {v.toLocaleString("en-US")}
        {suffix}
      </span>
      {live && (
        <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald/10 px-2.5 py-0.5 font-mono text-[10px] font-semibold tracking-[0.12em] text-emerald">
          <span className="live-dot h-1.5 w-1.5 rounded-full bg-emerald" aria-hidden />
          LIVE
        </span>
      )}
    </span>
  );
}
