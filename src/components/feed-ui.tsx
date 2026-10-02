"use client";

import { Nav } from "./nav";
import { Footer } from "./footer";
import { DASH, short, type SigState } from "@/lib/signed-feed";

/** Shared shell for the inner pages: one nav, one footer. */
export function PageShell({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <>
      <Nav />
      <main className={`mx-auto w-full flex-1 px-5 pb-20 pt-10 sm:pt-14 ${wide ? "max-w-7xl" : "max-w-6xl"}`}>
        {children}
      </main>
      <Footer />
    </>
  );
}

export function PageHead({ eyebrow, title, sub, right }: {
  eyebrow: string; title: React.ReactNode; sub?: React.ReactNode; right?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="display mt-3 text-4xl font-semibold sm:text-5xl">{title}</h1>
        {sub && <p className="mt-4 text-[15px] leading-relaxed text-muted">{sub}</p>}
      </div>
      {right}
    </header>
  );
}

const SIG_LABEL: Record<SigState, [string, string]> = {
  valid: ["signed ✓", "text-emerald bg-emerald/10 ring-emerald/25"],
  invalid: ["signature ✗", "text-red-600 bg-red-500/10 ring-red-500/25"],
  unsigned: ["unsigned", "text-muted bg-surface-2 ring-border"],
  "foreign-key": ["signed by an unpinned key", "text-gold bg-gold/10 ring-gold/30"],
};

/** "0n1x.census/1 · epoch 2026-10-01T23:05Z · signed ✓" — the provenance of every number below. */
export function FeedStamp({ path, schema, epochIso, sig, status }: {
  path: string; schema?: string; epochIso?: string; sig: SigState | null; status: "loading" | "ok" | "error";
}) {
  const [label, cls] = sig ? SIG_LABEL[sig] : status === "error" ? ["feed unreachable — showing —", "text-muted bg-surface-2 ring-border"] : ["verifying…", "text-muted bg-surface-2 ring-border"];
  return (
    <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-muted-2">
      <a href={path} className="underline decoration-border underline-offset-2 hover:text-foreground">{path.replace(/^\//, "")}</a>
      <span>·</span>
      <span>{schema || DASH}</span>
      <span>·</span>
      <span>epoch {epochIso ? epochIso.replace(/:\d\dZ$/, "Z") : DASH}</span>
      <span className={`rounded-full px-2 py-0.5 ring-1 ring-inset ${cls}`}>{label}</span>
    </div>
  );
}

const TIER_CLS: Record<string, string> = {
  ELITE: "bg-accent/10 text-accent ring-accent/25",
  TRUSTED: "bg-emerald/10 text-emerald ring-emerald/25",
  PROVEN: "bg-cyber/10 text-[#0b8aa3] ring-cyber/25",
  UNRANKED: "bg-surface-2 text-muted ring-border",
};
export function TierPill({ tier }: { tier?: string }) {
  const t = (tier || "").toUpperCase();
  return (
    <span className={`inline-flex rounded-md px-2 py-0.5 font-mono text-[10.5px] font-semibold ring-1 ring-inset ${TIER_CLS[t] || TIER_CLS.UNRANKED}`}>
      {t || DASH}
    </span>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`min-w-0 rounded-2xl border border-border bg-background p-5 sm:p-6 ${className}`}>{children}</section>;
}

export function CardTitle({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-baseline justify-between gap-3">
      <h2 className="text-[15px] font-semibold tracking-tight">{children}</h2>
      {aside && <span className="font-mono text-[11px] text-muted-2">{aside}</span>}
    </div>
  );
}

/** Honesty line — rendered verbatim, small, never hidden. */
export function Honest({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 text-[12px] leading-relaxed text-muted-2">{children}</p>;
}

export function Mono({ children, title }: { children: React.ReactNode; title?: string }) {
  return <span className="font-mono text-[12px]" title={title}>{children}</span>;
}

export { short };
