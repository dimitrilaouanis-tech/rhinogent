"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PageShell, PageHead, Card, CardTitle, Honest } from "@/components/feed-ui";
import { supabase } from "@/lib/supabase";
import { getWallet } from "@/lib/wallet";
import { DASH, fmtInt, isNum, useJson } from "@/lib/signed-feed";

// Earn — YOUR wallet (from the shared token_ledger, the same rows every surface reads),
// what things cost and what work pays (from /rates_v1.json). No number is written here:
// signed out, offline, or unpublished ⇒ "—".

type Rates = {
  status?: string;
  usd_per_token?: number | null;
  usd_note?: string;
  costs?: { id: string; label: string; min: number | null; max: number | null; note?: string }[];
  earns?: { id: string; label: string; usd_min?: number; usd_max?: number; share?: number; rank_only?: boolean; note?: string }[];
};
type Row = { amount?: number; reason?: string; kind?: string; created_at?: string; sig?: string };
type W = { balance: number; earned: number; spent: number; welcome?: number; bonus?: number; uid: string | null };

const DAY = 86400000;

export function EarnView() {
  const rates = useJson<Rates>("/rates_v1.json");
  const [w, setW] = useState<W | null | "out">(null);
  const [rows, setRows] = useState<Row[] | null | "error">(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const wallet = (await getWallet().catch(() => null)) as W | null;
      if (!alive) return;
      if (!wallet?.uid) { setW("out"); setRows([]); return; }
      setW(wallet);
      const { data, error } = await supabase
        .from("token_ledger").select("*").eq("user_id", wallet.uid)
        .order("created_at", { ascending: false }).limit(300);
      if (alive) setRows(error || !data ? "error" : (data as Row[]));
    };
    load();
    const on = () => load();
    window.addEventListener("wallet:change", on);
    return () => { alive = false; window.removeEventListener("wallet:change", on); };
  }, []);

  const wallet = w && w !== "out" ? w : null;
  const granted = wallet && (isNum(wallet.welcome) || isNum(wallet.bonus)) ? (wallet.welcome ?? 0) + (wallet.bonus ?? 0) : null;
  const pctEarned = wallet && granted !== null && granted + wallet.earned > 0 ? (wallet.earned / (granted + wallet.earned)) * 100 : null;
  const usd = wallet && isNum(rates.data?.usd_per_token) ? wallet.balance * (rates.data!.usd_per_token as number) : null;

  // earned this week: positive ledger rows, bucketed by local day (oldest → today)
  const week = useMemo(() => {
    if (!Array.isArray(rows) || w === "out") return null; // signed out ⇒ —, never a zero
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const days = Array.from({ length: 7 }, (_, i) => ({ t: today.getTime() - (6 - i) * DAY, v: 0 }));
    for (const r of rows) {
      const a = Number(r.amount || 0);
      const t = r.created_at ? Date.parse(r.created_at) : NaN;
      if (!(a > 0) || Number.isNaN(t)) continue;
      const d = days.find((x) => t >= x.t && t < x.t + DAY);
      if (d) d.v += a;
    }
    return days;
  }, [rows, w]);
  const weekMax = week ? Math.max(...week.map((d) => d.v)) : 0;
  const weekSum = week ? week.reduce((s, d) => s + d.v, 0) : null;

  const range = (min: number | null, max: number | null) =>
    min === null ? DASH : min === 0 && max === 0 ? "free" : max === null ? `from ${fmtInt(min)}` : min === max ? fmtInt(min) : `${fmtInt(min)}–${fmtInt(max)}`;
  const usdR = (a?: number, b?: number) => (isNum(a) && isNum(b) ? `$${a.toFixed(2)}–${b.toFixed(2)}` : DASH);

  return (
    <PageShell>
      <PageHead
        eyebrow="Earn"
        title={<>Paid for being right. <span className="accent-gradient">Only for that.</span></>}
        sub="Your wallet, what things cost, and what your agent's work pays — every move recorded, including the ones that went against you."
      />

      <div className="mt-10 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        {/* wallet */}
        <Card className="bg-gradient-to-b from-surface-2 to-surface">
          <CardTitle aside="self-custody · shared ledger">Wallet</CardTitle>
          <p className="font-mono text-[42px] font-semibold leading-none tracking-tight tabular-nums">
            {wallet ? fmtInt(wallet.balance) : DASH} <span className="text-lg text-muted">TOKEN</span>
          </p>
          <p className="mt-2 font-mono text-sm text-muted">
            {usd !== null ? `$${usd.toFixed(2)}` : `$${DASH}`}
            {usd === null && rates.data?.usd_note && <span className="ml-2 text-[11px] text-muted-2">{rates.data.usd_note}</span>}
          </p>
          <div className="mt-5 grid grid-cols-3 gap-2">
            <Tile k="granted" v={granted !== null ? fmtInt(granted) : DASH} />
            <Tile k="earned" v={wallet ? fmtInt(wallet.earned) : DASH} />
            <Tile k="spent" v={wallet ? fmtInt(wallet.spent) : DASH} />
          </div>
          <div className="mt-4">
            <div className="h-1.5 overflow-hidden rounded-full bg-border">
              <div className="h-full rounded-full bg-emerald" style={{ width: `${pctEarned ?? 0}%` }} />
            </div>
            <p className="mt-1.5 font-mono text-[11.5px] text-muted">
              {pctEarned !== null ? `${Math.round(pctEarned)}% earned` : `${DASH} earned`} · the rest was granted, not earned
            </p>
          </div>
          {w === "out" && (
            <p className="mt-4 text-[13px] text-muted">
              <Link href="/dashboard" className="font-medium text-accent underline">Sign in</Link> to see your wallet — it reads your rows of the shared ledger.
            </p>
          )}
        </Card>

        {/* earned this week */}
        <Card>
          <CardTitle aside={weekSum !== null ? `${fmtInt(weekSum)} TOKEN` : DASH}>Earned this week</CardTitle>
          <div className="flex h-36 items-end gap-2">
            {(week ?? Array.from({ length: 7 }, () => ({ t: 0, v: 0 }))).map((d, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                <div className="relative w-full flex-1">
                  <div
                    className="absolute bottom-0 w-full rounded-md bg-accent/80"
                    style={{ height: week && weekMax > 0 ? `${Math.max(2, (d.v / weekMax) * 100)}%` : "2px" }}
                    title={week ? `${fmtInt(d.v)} TOKEN` : DASH}
                  />
                </div>
                <span className="font-mono text-[10px] text-muted-2">
                  {d.t ? new Date(d.t).toLocaleDateString("en-US", { weekday: "narrow" }) : DASH}
                </span>
              </div>
            ))}
          </div>
          {rows === "error" && <Honest>{DASH} ledger unreachable — no bars rather than guessed ones.</Honest>}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* what things cost */}
        <Card>
          <CardTitle aside="TOKEN">What things cost</CardTitle>
          <ul className="divide-y divide-border/70">
            {(rates.data?.costs ?? []).map((c) => (
              <li key={c.id} className="flex items-baseline justify-between gap-3 py-2.5">
                <div>
                  <p className="text-sm font-medium">{c.label}</p>
                  {c.note && <p className="text-[12px] text-muted-2">{c.note}</p>}
                </div>
                <span className="font-mono text-sm tabular-nums">{range(c.min, c.max)}</span>
              </li>
            ))}
            {!rates.data && <li className="py-3 text-sm text-muted-2">{DASH}</li>}
          </ul>
          <Honest>every reply signed · Normal is free · Pro priced by depth, from {rates.data?.costs?.find((c) => c.id === "pro")?.min ?? DASH} TOKEN.</Honest>
        </Card>

        {/* how your agent earns */}
        <Card>
          <CardTitle aside="paid only when graded right">How your agent earns</CardTitle>
          <ul className="divide-y divide-border/70">
            {(rates.data?.earns ?? []).map((e) => (
              <li key={e.id} className="flex items-baseline justify-between gap-3 py-2.5">
                <div>
                  <p className="text-sm font-medium">{e.label}</p>
                  {e.note && <p className="text-[12px] text-muted-2">{e.note}</p>}
                </div>
                <span className="font-mono text-sm tabular-nums">
                  {e.rank_only ? "rank only" : isNum(e.share) ? `${Math.round(e.share * 100)}%` : usdR(e.usd_min, e.usd_max)}
                </span>
              </li>
            ))}
            {!rates.data && <li className="py-3 text-sm text-muted-2">{DASH}</li>}
          </ul>
          {rates.data?.status && <Honest>Schedule: {rates.data.status}.</Honest>}
        </Card>
      </div>

      {/* latest moves */}
      <Card className="mt-4">
        <CardTitle aside="your rows of the shared ledger">Latest signed moves</CardTitle>
        {Array.isArray(rows) && rows.length > 0 ? (
          <ul className="divide-y divide-border/70">
            {rows.slice(0, 10).map((r, i) => {
              const a = Number(r.amount || 0);
              const reason = r.reason || r.kind || DASH;
              const held = /held|over.?cap|needs.?you/i.test(reason);
              const wrong = /wrong|incorrect|refut/i.test(reason);
              return (
                <li key={i} className="flex items-center justify-between gap-3 py-2.5 text-[13px]">
                  <div className="flex min-w-0 items-center gap-2">
                    {held && <span className="rounded-md bg-gold/15 px-1.5 py-0.5 font-mono text-[10.5px] text-gold">held · over cap</span>}
                    {wrong && <span className="rounded-md bg-red-500/10 px-1.5 py-0.5 font-mono text-[10.5px] text-red-600">recorded wrong</span>}
                    <span className="truncate">{reason}</span>
                    {r.sig && <span className="font-mono text-[10.5px] text-emerald">signed ✓</span>}
                  </div>
                  <div className="flex shrink-0 items-center gap-3 font-mono">
                    <span className="text-[11px] text-muted-2">{r.created_at ? new Date(r.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : DASH}</span>
                    <span className={`tabular-nums ${a > 0 ? "text-emerald" : "text-foreground"}`}>{a > 0 ? "+" : ""}{fmtInt(a)}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted-2">{rows === null ? "Reading the ledger…" : rows === "error" ? `${DASH} ledger unreachable` : w === "out" ? "Sign in to see your moves." : "No moves yet."}</p>
        )}
        <Honest>Held-over-cap payments and recorded wrong answers stay in this list — a ledger that only shows wins is not a ledger.</Honest>
      </Card>
    </PageShell>
  );
}

function Tile({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/70 px-3 py-2.5">
      <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted-2">{k}</p>
      <p className="mt-1 font-mono text-base font-semibold tabular-nums">{v}</p>
    </div>
  );
}
