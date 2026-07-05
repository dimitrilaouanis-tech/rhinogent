"use client";

import { useEffect, useRef, useState } from "react";

// The SAME engine as 0n1x — space-field galaxy + supernova core + neurons + orbits +
// click-to-focus + 3D depth + live signed tape. Loaded from /matrix-engine.js so both
// sites share one visual language. Reads the same public feeds (relative on rhinogent.com).

declare global {
  interface Window { OnyxMatrix?: { mount: (el: HTMLCanvasElement, opts: Record<string, unknown>) => unknown }; }
}

export function MatrixGalaxy() {
  const cvRef = useRef<HTMLCanvasElement>(null);
  const [stats, setStats] = useState<{ eco?: number; txs?: number; flow?: number }>({});

  useEffect(() => {
    let mounted = true;
    function boot() {
      if (!mounted || !cvRef.current || !window.OnyxMatrix) return;
      window.OnyxMatrix.mount(cvRef.current, {
        feedUrl: "/token_feed.json",
        manifestUrl: "/census_manifest.json",
        messages: ["R H I N O G E N T", "THE AGENT YOU OWN", "SELF-CUSTODY IDENTITY", "LIVING IN 0n1x"],
        onStats: (s: { ecoTotal?: number; txsLive?: number; txsVerified?: number; flow?: number }) => {
          setStats((p) => ({
            eco: s.ecoTotal ?? p.eco,
            txs: s.txsLive ?? s.txsVerified ?? p.txs,
            flow: s.flow ?? p.flow,
          }));
        },
      });
    }
    if (window.OnyxMatrix) { boot(); return () => { mounted = false; }; }
    const sc = document.createElement("script");
    sc.src = "/matrix-engine.js?v=21";
    sc.onload = boot;
    document.body.appendChild(sc);
    return () => { mounted = false; };
  }, []);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border" style={{ background: "#060608" }}>
      <div className="absolute left-4 top-3 z-10 flex flex-wrap gap-4 font-mono text-[11px]" style={{ pointerEvents: "none" }}>
        <span style={{ color: "#3fdda0" }}>● LIVE AGENT NETWORK</span>
        {stats.eco != null && <span style={{ color: "#8b95a3" }}>agents <b style={{ color: "#f2f4f7" }}>{stats.eco.toLocaleString()}</b></span>}
        {stats.txs != null && <span style={{ color: "#8b95a3" }}>verified txs <b style={{ color: "#7c9aff" }}>{stats.txs.toLocaleString()}</b></span>}
        {stats.flow != null && <span style={{ color: "#8b95a3" }}>flow <b style={{ color: "#f5a623" }}>+{stats.flow.toLocaleString()}</b></span>}
      </div>
      <canvas ref={cvRef} className="block w-full" style={{ height: "62vh", minHeight: 380, cursor: "grab" }} />
      <div className="absolute bottom-2 right-3 font-mono text-[10px]" style={{ color: "#8b95a3", pointerEvents: "none" }}>
        scroll = zoom · drag = pan · click a star = focus · double-click = reset
      </div>
    </div>
  );
}
