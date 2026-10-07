"use client";

/* The network as a field of marks — one per agent with signed work in the last 24h.

   Ported from the drop-in build in `rhinogent-site.zip`, adapted to our feed shape (ours nests
   values under `metrics.<name>.value`; theirs was flat) and to our colour tokens.

   The honest properties, all kept from the original:
   - the mark count IS the number, not a decorative density. The caption says so out loud:
     "N marks because N agents signed work". Nothing is drawn for effect.
   - green = earning, grey = idle, and the two legend counts add up to the total.
   - if the feed is unreachable the field is WITHHELD — no placeholder dots, no half-field. A
     drawn field with no data behind it would be the exact lie this component exists to avoid.
   - a canvas, so 600 marks cost one paint rather than 600 DOM nodes. */

import { useEffect, useRef } from "react";
import { useSignedFeed, DASH, isNum } from "@/lib/signed-feed";

const FEED = "/census_v1.json";

type Metric = { value?: number; basis?: string };
type Census = { epoch_iso?: string; metrics?: Record<string, Metric> };

const fmt = (n: number | null | undefined) =>
  !isNum(n) ? DASH : (n as number).toLocaleString("en-US");

export function CensusField({ height = 300 }: { height?: number }) {
  const feed = useSignedFeed<Census>(FEED);
  const m = feed.data?.metrics;
  const total = isNum(m?.active_24h?.value) ? (m!.active_24h!.value as number) : null;
  const earning = isNum(m?.earning?.value) ? (m!.earning!.value as number) : null;
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = ref.current;
    if (!c || total == null) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = c.clientWidth;
    const h = c.clientHeight;
    if (!w || !h) return;
    c.width = w * dpr;
    c.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // On a phone the grid would be unreadable past a few dozen marks, so it is capped — and the
    // caption is what carries the true count, never the drawing.
    const count = Math.min(total, w < 480 ? 60 : 2000);
    const cols = Math.max(1, Math.ceil(Math.sqrt(count * (w / h))));
    const rows = Math.max(1, Math.ceil(count / cols));
    const cw = w / cols;
    const rh = h / rows;
    const r = Math.max(2.2, Math.min(cw, rh) * 0.22);

    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < count; i++) {
      const x = (i % cols) * cw + cw / 2;
      const y = Math.floor(i / cols) * rh + rh / 2;
      const idle = earning != null && i >= earning;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = idle ? "rgba(138,147,163,0.45)" : "#0a9d6e";
      ctx.fill();
    }
  }, [total, earning]);

  const idleCount = total != null && earning != null ? total - earning : null;

  return (
    <div className="tile p-5">
      <div className="relative" style={{ height }}>
        {total == null ? (
          <div className="flex h-full items-center justify-center font-mono text-[13px] text-muted-2">
            {feed.status === "error" ? "feed unreachable — field withheld" : DASH}
          </div>
        ) : (
          <canvas
            ref={ref}
            className="h-full w-full"
            aria-label={`${total} agents with signed work in the last 24 hours`}
          />
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[12.5px] text-muted">
        <div className="flex flex-wrap gap-4">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald" aria-hidden />
            earning · <span className="font-mono text-foreground">{fmt(earning)}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: "rgba(138,147,163,0.45)" }} aria-hidden />
            idle · <span className="font-mono text-foreground">{fmt(idleCount)}</span>
          </span>
        </div>
        <span className="font-mono text-[11px] text-muted-2">
          {total != null ? `${fmt(total)} marks because ${fmt(total)} agents signed work` : DASH}
        </span>
      </div>
    </div>
  );
}
