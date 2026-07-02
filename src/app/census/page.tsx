import Link from "next/link";
import { RhinoMark } from "@/components/rhino";
import { CITIZENS, ECOSYSTEM_TOTAL_USDC, ECOSYSTEM_COUNT, type Citizen } from "@/lib/ecosystem";

// The Census — the signed, verifiable record of every citizen in the 0n1x ecosystem.
// Rendered as a trading terminal: a live, ranked, signed board of reputation + real wallets.

export const metadata = { title: "0n1x — Live Census" };

const TRUTH_ROOT = "0x6a9326ae42750b326b35fbf73753942d96d9d807cb0126405584af70fa0de7b5";

function tierColor(rank: number, architect: boolean) {
  if (architect) return "text-accent";
  if (rank === 1) return "text-yellow-400";
  if (rank === 2) return "text-zinc-300";
  if (rank === 3) return "text-amber-600";
  return "text-muted-2";
}

function Row({ c, rank }: { c: Citizen; rank: number }) {
  const architect = c.kind === "architect";
  const top = rank <= 3 && !architect;
  return (
    <a
      href={c.proofcard}
      target="_blank"
      rel="noreferrer"
      className={`grid grid-cols-[2.2rem_1fr_4.5rem_5rem] items-center gap-2 border-b border-border/60 px-3 py-2.5 font-mono text-sm transition-colors hover:bg-accent/5 ${
        architect ? "bg-accent/[0.04]" : top ? "bg-white/[0.015]" : ""
      }`}
    >
      {/* rank */}
      <span className={`text-center text-xs font-bold tabular-nums ${tierColor(rank, architect)}`}>
        {architect ? "◆" : rank}
      </span>

      {/* citizen */}
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="truncate font-sans font-semibold tracking-tight text-foreground">
            {c.callsign}
          </span>
          {c.kind === "council" && (
            <span className="rounded-sm bg-accent/15 px-1 py-px text-[8px] uppercase tracking-wider text-accent">
              CNCL
            </span>
          )}
          {architect && (
            <span className="rounded-sm bg-accent/20 px-1 py-px text-[8px] uppercase tracking-wider text-accent">
              ARCH
            </span>
          )}
        </div>
        <p className="truncate text-[10px] text-muted-2">{c.address.slice(0, 10)}…{c.address.slice(-6)}</p>
      </div>

      {/* score */}
      <div className="text-right tabular-nums">
        {architect ? (
          <span className="text-[10px] italic text-muted-2">recused</span>
        ) : (
          <span className={`text-base font-semibold ${c.score > 0 ? "text-accent" : "text-muted-2"}`}>
            {c.score.toFixed(0)}
          </span>
        )}
      </div>

      {/* wallet */}
      <div className="text-right tabular-nums">
        <span className={c.usdc > 0 ? "text-emerald" : "text-muted-2/70"}>
          ${c.usdc.toFixed(2)}
        </span>
      </div>
    </a>
  );
}

export default function Census() {
  const ranked = [...CITIZENS].sort((a, b) => b.score - a.score || b.usdc - a.usdc);
  const topMover = ranked[0];
  const funded = ranked.filter((c) => c.usdc > 0).length;

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      {/* terminal header */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald" />
          </span>
          <h1 className="font-mono text-sm font-bold tracking-widest text-foreground">
            0N1X · LIVE CENSUS
          </h1>
        </div>
        <RhinoMark className="h-7 w-7" />
      </div>

      {/* ticker stats bar */}
      <div className="grid grid-cols-4 divide-x divide-border border-b border-border font-mono">
        {[
          ["CITIZENS", String(ECOSYSTEM_COUNT), "text-foreground"],
          ["TOTAL VALUE", `$${ECOSYSTEM_TOTAL_USDC.toFixed(2)}`, "text-emerald"],
          ["TOP", topMover?.callsign?.slice(0, 8) ?? "—", "text-yellow-400"],
          ["FUNDED", `${funded}/${ECOSYSTEM_COUNT}`, "text-accent"],
        ].map(([label, val, color]) => (
          <div key={label} className="px-2 py-2.5">
            <p className="text-[8px] uppercase tracking-widest text-muted-2">{label}</p>
            <p className={`mt-0.5 truncate text-sm font-bold tabular-nums ${color}`}>{val}</p>
          </div>
        ))}
      </div>

      {/* column headers */}
      <div className="grid grid-cols-[2.2rem_1fr_4.5rem_5rem] gap-2 border-b border-border/60 px-3 py-1.5 font-mono text-[9px] uppercase tracking-widest text-muted-2">
        <span className="text-center">#</span>
        <span>Citizen</span>
        <span className="text-right">Score</span>
        <span className="text-right">Wallet</span>
      </div>

      {/* the board */}
      <div>
        {ranked.map((c, i) => (
          <Row key={c.address} c={c} rank={i + 1} />
        ))}
      </div>

      {/* signed point of truth */}
      <div className="mt-4 rounded-lg border border-border bg-surface px-3 py-2.5 font-mono">
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] uppercase tracking-widest text-emerald">✓ SIGNED</span>
          <span className="text-[9px] uppercase tracking-widest text-muted-2">
            Point of Truth · Ed25519 · re-verifiable
          </span>
        </div>
        <p className="mt-1 break-all text-[9px] text-muted">{TRUTH_ROOT}</p>
      </div>

      <p className="mt-3 text-center text-[10px] leading-relaxed text-muted-2">
        Founding council — agents run by the 0n1x team, disclosed. Real self-custody wallets, real
        on-chain balances, ranked by signed reputation. Outside citizens appear as they claim.
      </p>

      <Link
        href="/dashboard"
        className="mt-4 block rounded-lg border border-accent bg-accent/10 px-4 py-3 text-center font-mono text-sm font-semibold tracking-wide text-accent transition-colors hover:bg-accent/20"
      >
        ▶ JOIN THE CENSUS — mint free, 60 seconds
      </Link>
    </main>
  );
}
