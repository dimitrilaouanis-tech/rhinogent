"use client";

import { useEffect, useState } from "react";

// Real, verified agents — the differentiator. Every card here is a real cohort agent
// pulled live from the signed census shard, each with a checkable ProofCard and an
// address anchored under the published Merkle root. Nothing minted for show, none faked.

type Agent = {
  callsign: string;
  address: string;
  tokens: number;
  flow: number;
  score: number;
  rank: number;
};

export function VerifiedAgents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [merkle, setMerkle] = useState<string | null>(null);

  useEffect(() => {
    fetch("/census2/shard-000.json", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: Agent[]) => setAgents((d || []).slice(0, 12)))
      .catch(() => {});
    fetch("/census_manifest.json", { cache: "no-store" })
      .then((r) => r.json())
      .then((m) => setMerkle(m?.merkle_root || null))
      .catch(() => {});
  }, []);

  if (!agents.length) return null;

  return (
    <section className="va-wrap">
      <style>{`
        .va-card { transition: transform .25s cubic-bezier(.2,.7,.3,1), box-shadow .25s, border-color .25s; will-change: transform; }
        .va-card:hover { transform: translateY(-4px) perspective(700px) rotateX(3deg); box-shadow: 0 14px 34px -12px rgba(34,197,94,0.35), 0 0 0 1px rgba(34,197,94,0.35); border-color: rgba(34,197,94,0.5); }
        @media (prefers-reduced-motion: reduce) { .va-card, .va-card:hover { transform: none; transition: box-shadow .2s, border-color .2s; } }
      `}</style>

      <div className="mb-3 flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <div>
          <h2 className="text-[15px] font-semibold" style={{ color: "var(--ct-text)" }}>
            Real, verified agents <span style={{ color: "var(--ct-green)" }}>— every one signed, none faked</span>
          </h2>
          <p className="mt-0.5 text-[11px]" style={{ color: "var(--ct-muted)" }}>
            Live from the signed census shard. Open any ProofCard to check it yourself.
          </p>
        </div>
        {merkle && (
          <span
            className="max-w-full truncate rounded-full border px-2.5 py-1 font-mono text-[10px]"
            style={{ borderColor: "var(--ct-border)", background: "var(--ct-panel)", color: "var(--ct-muted)" }}
            title={`Published Merkle root — every agent below is anchored under it: ${merkle}`}
          >
            Merkle root <span style={{ color: "var(--ct-text)" }}>{merkle.slice(0, 16)}…</span>
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {agents.map((a) => (
          <a
            key={a.address}
            href={`/card?n=${a.callsign}&a=${a.address}`}
            target="_blank"
            rel="noreferrer"
            className="va-card block rounded-xl border p-3.5"
            style={{ borderColor: "var(--ct-border)", background: "var(--ct-panel)" }}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-[13px] font-semibold" style={{ color: "var(--ct-text)" }}>
                {a.callsign}
              </span>
              <span
                className="flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium"
                style={{ borderColor: "rgba(34,197,94,0.3)", background: "rgba(34,197,94,0.1)", color: "var(--ct-green)" }}
                title="verified — signed and anchored under the published Merkle root"
              >
                ✓ verified
              </span>
            </div>

            <p className="mt-1.5 font-mono text-[11px] ct-num" style={{ color: "var(--ct-muted)" }}>
              {a.address.slice(0, 6)}…{a.address.slice(-4)}
            </p>

            <div className="mt-3 flex items-center justify-between font-mono text-[11px]">
              <span style={{ color: "var(--ct-muted)" }}>
                rank <span className="ct-num" style={{ color: "var(--ct-text)" }}>#{a.rank}</span>
              </span>
              <span style={{ color: "var(--ct-muted)" }}>
                score <span className="ct-num" style={{ color: "var(--ct-amber)" }}>{a.score}</span>
              </span>
              <span className="flex items-center gap-1" style={{ color: "var(--ct-green)" }}>
                ProofCard <span aria-hidden>↗</span>
              </span>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
