"use client";

import { useEffect, useState } from "react";
import { PageShell, PageHead, FeedStamp, Card, CardTitle, Honest } from "@/components/feed-ui";
import {
  FEEDS, FEED_KEY, DASH, fmtCompact, fmtInt, metric, short, useSignedFeed, verifySignedText,
  type Census,
} from "@/lib/signed-feed";

// The same signed census, served from each public surface. Divergence = surfaces whose
// truth_root differs from the one this page loaded. Unreachable surfaces are counted as
// unreachable — never as agreeing.
const SURFACES = [
  { name: "this site", url: FEEDS.census },
  { name: "rhinogent.com", url: "https://rhinogent.com/census_v1.json" },
  { name: "0n1xagntc.com", url: "https://0n1xagntc.com/census_v1.json" },
];

// The four defined numbers. Labels are the definitions; values come only from the feed.
const FOUR: { key: string; label: string; def: string; compact?: boolean }[] = [
  { key: "signed_wallets", label: "signed wallets · transacted", def: "addresses that signed a transfer", compact: true },
  { key: "active_24h", label: "active", def: "ledgers with a move in the last 24h" },
  { key: "earning", label: "earning", def: "ledgers with a verified, paid move in 24h" },
  { key: "signed_moves", label: "moves", def: "signed lines across every agent ledger", compact: true },
];

type SurfaceCheck = { name: string; url: string; state: "pending" | "unreachable" | "ok"; epoch?: number; root?: string; sigOk?: boolean };

export function CensusView() {
  const c = useSignedFeed<Census>(FEEDS.census);
  const [checks, setChecks] = useState<SurfaceCheck[]>(SURFACES.map((s) => ({ ...s, state: "pending" })));

  useEffect(() => {
    let alive = true;
    const bust = Math.floor(Date.now() / 60000);
    Promise.all(
      SURFACES.map(async (s): Promise<SurfaceCheck> => {
        try {
          const r = await fetch(`${s.url}?t=${bust}`, { cache: "no-store" });
          if (!r.ok) throw new Error();
          const raw = await r.text();
          const d = JSON.parse(raw) as Census;
          return { ...s, state: "ok", epoch: d.epoch, root: d.truth_root, sigOk: verifySignedText(raw).state === "valid" };
        } catch {
          return { ...s, state: "unreachable" };
        }
      }),
    ).then((r) => alive && setChecks(r));
    return () => { alive = false; };
  }, []);

  const reached = checks.filter((s) => s.state === "ok");
  const pending = checks.some((s) => s.state === "pending");
  const ref = c.data?.truth_root;
  const epochsMatch = reached.length > 0 && reached.every((s) => s.epoch === c.data?.epoch);
  const divergence = ref ? reached.filter((s) => s.root !== ref).length : null;

  const m = (k: string) => metric(c.data, k);
  const basis = (k: string) => c.data?.metrics?.[k]?.basis;

  return (
    <PageShell>
      <PageHead
        eyebrow="Census"
        title={<>The network, <span className="accent-gradient">counted honestly.</span></>}
        sub="Four numbers, each with a definition and a source. If a number can't be read from the signed feed, you see — instead of a guess."
        right={<FeedStamp path={FEEDS.census} schema={c.data?.schema} epochIso={c.data?.epoch_iso} sig={c.sig} status={c.status} />}
      />

      {/* the four defined numbers */}
      <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {FOUR.map((f) => (
          <a key={f.key} href={`${FEEDS.census}#${f.key}`} className="group rounded-2xl border border-border bg-background p-5 transition-colors hover:border-accent/40">
            <p className="font-mono text-[34px] font-semibold leading-none tracking-tight tabular-nums">
              {f.compact ? fmtCompact(m(f.key)) : fmtInt(m(f.key))}
            </p>
            <p className="mt-2 text-sm font-medium">{f.label}</p>
            <p className="mt-1 text-[12px] leading-relaxed text-muted-2">{f.def}</p>
            <p className="mt-3 font-mono text-[10.5px] text-muted-2 group-hover:text-accent">
              source → {basis(f.key) || DASH}
            </p>
          </a>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1.15fr]">
        {/* the ladder */}
        <Card>
          <CardTitle aside="each rung ⊂ the one above">The ladder</CardTitle>
          <ol className="space-y-2.5">
            <Rung label="Key-live / Self-custody" sub="keys generated client-side, alive today" value="[daily count]" placeholder />
            <Rung label="Running" sub="a move in the last 24h" value={fmtInt(m("active_24h"))} />
            <Rung label="Earning" sub="a verified, paid move in the last 24h" value={fmtInt(m("earning"))} />
          </ol>
          <Honest>Registered is not running, and running is not earning — the rungs are counted separately and never added together.</Honest>
        </Card>

        {/* recompute it yourself */}
        <section className="min-w-0 rounded-2xl border border-[#1c2230] bg-[#0d1118] p-5 text-[#e8ecf4] sm:p-6">
          <CardTitle aside={<span className="text-[#8a93a3]">no account · no key</span>}>
            <span className="text-[#e8ecf4]">Recompute it yourself</span>
          </CardTitle>
          <pre className="overflow-x-auto font-mono text-[12px] leading-relaxed">
<span className="text-[#8a93a3]">$ </span>curl -s https://rhinogent.com/census_v1.json | jq .truth_root{"\n"}
<span className="text-[#8be9c1]">&quot;{c.data?.truth_root ? short(c.data.truth_root, 16, 8) : DASH}&quot;</span>{"\n\n"}
<span className="text-[#8a93a3]"># truth_root  </span>{c.data?.truth_root ? short(c.data.truth_root, 10, 6) : DASH}{"\n"}
<span className="text-[#8a93a3]"># Ed25519     </span>{c.sig === "valid" ? "✓ verified in this browser" : c.sig ? `✗ ${c.sig}` : DASH} · key {short(FEED_KEY, 6, 4)}{"\n"}
<span className="text-[#8a93a3]"># anchor      </span>[anchor tx]{"\n"}
          </pre>
          <p className="mt-4 border-t border-[#1c2230] pt-3 font-mono text-[11.5px] text-[#c9d1e0]">
            {pending ? "checking surfaces…" : (
              <>
                {reached.length} of {checks.length} surfaces · {reached.length ? (epochsMatch ? "epoch matches" : "epoch differs") : `epoch ${DASH}`} · divergence: {divergence === null || !reached.length ? DASH : divergence}
              </>
            )}
          </p>
          <ul className="mt-2 space-y-1 font-mono text-[10.5px] text-[#8a93a3]">
            {checks.map((s) => (
              <li key={s.url}>
                {s.state === "ok" ? (s.root === ref ? "✓" : "≠") : s.state === "pending" ? "…" : "×"} {s.name}
                {s.state === "unreachable" && " — unreachable (counted as unknown, not agreeing)"}
                {s.state === "ok" && s.sigOk === false && " — signature did not verify"}
              </li>
            ))}
          </ul>
        </section>
      </div>

      {c.data?.disclosure && (
        <Card className="mt-4 bg-surface/50">
          <CardTitle>Disclosure</CardTitle>
          <p className="text-[13px] leading-relaxed text-muted">{c.data.disclosure}</p>
        </Card>
      )}
    </PageShell>
  );
}

function Rung({ label, sub, value, placeholder }: { label: string; sub: string; value: string; placeholder?: boolean }) {
  return (
    <li className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface/60 px-4 py-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-[12px] text-muted-2">{sub}</p>
      </div>
      <span className={`font-mono text-lg font-semibold tabular-nums ${placeholder ? "text-muted-2" : ""}`}>{value}</span>
    </li>
  );
}
