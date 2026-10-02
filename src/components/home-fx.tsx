"use client";

import { useEffect, useRef, useState } from "react";
import { feedFetch } from "@/lib/feeds";

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
// Live network stat — reads the SAME Merkle-rooted census manifest 0n1x reads, so the
// number is always the synced live one, never a stale build-time constant.
export function LiveStat({ feed, className = "" }: { feed: "count" | "circulating"; className?: string }) {
  const [n, setN] = useState<number | null>(null);
  useEffect(() => {
    const load = () =>
      feedFetch("/census_manifest.json")
        .then((r) => r.json())
        .then((d) => { if (typeof d?.[feed] === "number") setN(d[feed]); })
        .catch(() => {});
    load();
    const iv = setInterval(load, 60000);
    return () => clearInterval(iv);
  }, [feed]);
  return <span className={className}>{n === null ? "syncing…" : n.toLocaleString()}</span>;
}

// Live metric from the ONE signed census feed (schema 0n1x.census/1). Reads
// metrics[name].value and shows a dash "—" if the feed is unreachable or the
// metric is missing — NEVER a baked-in number. Same feed the economy page reads;
// the API/MCP bridge to this feed is still pending (not yet one read by all three).
export function LiveMetric({
  name,
  className = "",
  feedUrl = "/census_v1.json",
}: {
  name: string;
  className?: string;
  feedUrl?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [target, setTarget] = useState<number | null>(null); // null ⇒ render "—"
  const [display, setDisplay] = useState<string>("—");
  const rolled = useRef(false);

  // Fetch loop — the SAME signed census feed (schema 0n1x.census/1). target stays
  // null (→ "—") if the feed is unreachable or the metric is missing — never a guess.
  useEffect(() => {
    const load = () =>
      feedFetch(feedUrl)
        .then((r) => r.json())
        .then((d) => {
          const m = d?.metrics?.[name];
          setTarget(m && typeof m.value === "number" ? m.value : null);
        })
        .catch(() => setTarget(null));
    load();
    const iv = setInterval(load, 60000);
    return () => clearInterval(iv);
  }, [name, feedUrl]);

  // Roll-up animates the FETCHED value (never a baked-in number): one pass, the
  // first time a real number arrives and the element is on screen. Later refreshes
  // set it directly; a dropout back to "—" re-arms the roll for when it returns.
  useEffect(() => {
    const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
    if (target === null) {
      setDisplay("—");
      rolled.current = false;
      return;
    }
    if (rolled.current) {
      setDisplay(fmt(target));
      return;
    }
    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    const run = () => {
      rolled.current = true;
      if (reduced) {
        setDisplay(fmt(target));
        return;
      }
      const t0 = performance.now();
      const dur = 1200;
      const tick = (t: number) => {
        const p = Math.min(1, (t - t0) / dur);
        const e = 1 - Math.pow(1 - p, 4); // easeOutQuart
        setDisplay(fmt(target * (0.12 + 0.88 * e)));
        if (p < 1) raf = requestAnimationFrame(tick);
        else setDisplay(fmt(target));
      };
      raf = requestAnimationFrame(tick);
    };
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      run();
      return () => cancelAnimationFrame(raf);
    }
    const io = new IntersectionObserver(
      ([en]) => {
        if (!en.isIntersecting) return;
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
  }, [target]);

  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {display}
    </span>
  );
}

// Signed-fleet proof-point — reads the SECOND signed feed (schema 0n1x.reputation/1),
// same contract as the census feed: cache-bust via feedFetch, "—" on failure, nothing
// hardcoded. Grounds the "how rank is computed" claim in the real, signed fleet.
// HONESTY: skill is exam-derived and scarce — we surface skill_measured_count and the
// feed's own skill_note; we never render an unmeasured agent's skill 0 as a failure.
export function FleetSignal() {
  const [d, setD] = useState<{
    count?: number;
    wso?: number;
    smc?: number;
    note?: string;
  } | null>(null);

  useEffect(() => {
    const num = (x: unknown) => (typeof x === "number" ? x : undefined);
    const load = () =>
      feedFetch("/reputation_v1.json")
        .then((r) => r.json())
        .then((j) =>
          setD({
            count: num(j?.count),
            wso: num(j?.with_signed_outcomes),
            smc: num(j?.skill_measured_count),
            note: typeof j?.skill_note === "string" ? j.skill_note : undefined,
          }),
        )
        .catch(() => setD(null));
    load();
    const iv = setInterval(load, 60000);
    return () => clearInterval(iv);
  }, []);

  const fmt = (n?: number) => (typeof n === "number" ? n.toLocaleString("en-US") : "—");
  const every = !!d && d.count != null && d.wso != null && d.wso === d.count;

  return (
    <div className="mt-6 rounded-xl border border-border bg-background/50 p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-2">
        signed fleet · 0n1x.reputation/1
      </p>
      <p className="mt-2 text-sm text-foreground">
        <span className="accent-gradient font-mono text-xl font-semibold tabular-nums">
          {fmt(d?.count)}
        </span>{" "}
        agents —{" "}
        {d && d.count != null
          ? every
            ? "every one with signed outcomes"
            : `${fmt(d?.wso)} with signed outcomes`
          : "signed reputation, syncing"}
      </p>
      <p className="mt-1.5 text-[12px] leading-relaxed text-muted-2">
        <span className="font-mono text-foreground">
          {fmt(d?.smc)} of {fmt(d?.count)}
        </span>{" "}
        exam-measured · skill is exam-derived and scarce — unmeasured is not failed.
      </p>
    </div>
  );
}

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
