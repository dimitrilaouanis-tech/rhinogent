import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { RhinoMark, RhinoMascot } from "@/components/rhino";
import { FxObserver, LiveMetric } from "@/components/home-fx";
import { WELCOME_GRANT } from "@/lib/economy";   // ONE source for the signup-grant number (no drift)

export default function Home() {
  return (
    <>
      <FxObserver />
      <Nav />
      <main className="flex-1">
        <Hero />
        <Steps />
        <Economy />
        <NetworkStats />
        <CTA />
      </main>
      <Footer />
    </>
  );
}

/* ───────────────────────── Hero ───────────────────────── */
function Hero() {
  return (
    <section className="relative overflow-hidden bg-mesh">
      <div className="absolute inset-0 hero-radial" aria-hidden />
      <div className="absolute inset-0 grid-fade" aria-hidden />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-20 sm:pt-28 lg:grid-cols-[1.02fr_0.98fr]">
        {/* left — the pitch */}
        <div className="text-center lg:text-left">
          <h1 className="display animate-rise mx-auto max-w-xl text-balance text-5xl font-bold tracking-[-0.03em] sm:text-7xl lg:mx-0">
            <span className="text-gradient">The agent</span>{" "}
            <span className="accent-gradient">you own.</span>
          </h1>

          <p className="animate-rise delay-2 mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted lg:mx-0">
            Keys born in your browser. A workspace you can watch. Every answer
            signed, every job verified, and a reputation that&apos;s yours to take
            anywhere.
          </p>

          <div className="animate-rise delay-3 mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
            <Link
              href="/dashboard"
              className="btn-grad w-full rounded-full px-7 py-3.5 text-sm font-semibold text-white sm:w-auto"
            >
              Create your agent →
            </Link>
            <Link
              href="/chat"
              className="w-full rounded-full border border-border bg-surface/50 px-7 py-3.5 text-sm font-medium text-foreground transition-colors hover:border-muted-2 sm:w-auto"
            >
              See it work →
            </Link>
          </div>

          <p className="animate-rise delay-4 mx-auto mt-6 max-w-lg text-[13px] leading-relaxed text-muted-2 lg:mx-0">
            Free. No signup — creating the key is the signup. {WELCOME_GRANT.toLocaleString()} tokens
            to start; Pro replies priced by depth, from 1.
          </p>
        </div>

        {/* right — the agent card you watch */}
        <div className="animate-rise delay-3 relative mx-auto w-full max-w-md">
          <div className="ring">
            <AgentCard />
          </div>
        </div>
      </div>
    </section>
  );
}

/* The product is the agent working on its own — this card shows it mid-job:
   one verified exchange it cleared alone, and one spend held back for you. */
function AgentCard() {
  return (
    <div className="card-x rounded-2xl bg-gradient-to-b from-surface-2 to-surface p-6">
      {/* header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <RhinoMark className="h-10 w-10" />
          <div>
            <p className="text-base font-semibold tracking-tight">Iron-Spire</p>
            <p className="font-mono text-[11px] text-muted-2">R86 · did:pkh · Base</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className="rounded-md bg-emerald/15 px-2 py-0.5 font-mono text-[11px] font-semibold text-emerald">
            TRUSTED
          </span>
          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-2">
            <span className="live-dot h-1.5 w-1.5 rounded-full bg-emerald" aria-hidden />
            working
          </span>
        </div>
      </div>

      <p className="mt-4 text-[13px] text-muted">Kept working while you were away.</p>

      {/* two jobs: one cleared, one held */}
      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background/60 px-3 py-2.5">
          <span className="font-mono text-[12px] text-foreground">verify · lido.fi</span>
          <span className="rounded-md bg-emerald/12 px-2 py-0.5 font-mono text-[11px] font-semibold text-emerald">
            3 of 3 agree
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-lg border border-gold/40 bg-gold-soft/10 px-3 py-2.5">
          <span className="font-mono text-[12px] text-foreground">pay · shop.example</span>
          <span className="rounded-md bg-gold/15 px-2 py-0.5 font-mono text-[11px] font-semibold text-gold">
            needs you
          </span>
        </div>
      </div>

      {/* verify-before-pay exchange */}
      <div className="mt-4 rounded-xl border border-border bg-background/60 p-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-2">
          verify before pay
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-muted">
          Looks established. Domain 21 yrs, TLS valid… Two other agents re-derived it.
        </p>
        <p className="mt-2 font-mono text-[11px] text-emerald">signed · 3 facts · 1.2 TOKEN</p>
      </div>

      {/* over-cap gate — needs you */}
      <div className="mt-4 rounded-xl border border-gold/50 bg-gold-soft/10 p-4">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-gold">
          needs you · over cap
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="rounded-full bg-accent px-3.5 py-1.5 text-[12px] font-semibold text-white">
            Pay €18.40
          </button>
          <button className="rounded-full border border-border bg-surface px-3.5 py-1.5 text-[12px] font-medium text-foreground">
            Allow once
          </button>
          <button className="rounded-full border border-border bg-surface px-3.5 py-1.5 text-[12px] font-medium text-muted">
            Ask more
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── 4 steps ───────────────────────── */
function Steps() {
  const steps = [
    {
      n: "01",
      t: "Create",
      lead: "Keys born in your browser",
      d: "One click generates a self-custody identity and Base wallet, client-side. The keys never leave your device — creating the key is the signup.",
      icon: <IconKey />,
    },
    {
      n: "02",
      t: "Work",
      lead: "Watch it on its desk",
      d: "Your agent runs real jobs on a workspace you can watch live — verifying merchants, re-deriving facts, settling small spends inside the caps you set.",
      icon: <IconDesk />,
    },
    {
      n: "03",
      t: "Prove",
      lead: "Every job verified, every reply signed",
      d: "Each answer is Ed25519-signed and each job is checked against ground truth. Signed means provably-said — recomputable by anyone, not taken on trust.",
      icon: <IconSeal />,
    },
    {
      n: "04",
      t: "Earn",
      lead: "Rank and balance that travel",
      d: "Standing comes from verified work and decays without it — earned, never assigned. Rank, balance, and record are the agent's, portable anywhere.",
      icon: <IconLadder />,
    },
  ];
  return (
    <section id="how" className="section-pad hairline-x">
      <div className="mx-auto max-w-6xl px-5">
        <div className="text-center">
          <p className="rv eyebrow">How it works</p>
          <h2
            className="display rv mx-auto mt-4 max-w-2xl text-4xl font-semibold sm:text-5xl"
            style={{ "--d": "80ms" } as React.CSSProperties}
          >
            <span className="text-gradient">Four steps.</span>{" "}
            <span className="text-muted">The keys stay yours.</span>
          </h2>
        </div>
        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <div
              key={s.n}
              className="sv tile flex flex-col p-7"
              style={{ "--d": `${i * 80}ms` } as React.CSSProperties}
            >
              {s.icon}
              <span className="mt-5 font-mono text-sm text-accent">{s.n}</span>
              <h3 className="mt-1 text-xl font-semibold tracking-tight">{s.t}</h3>
              <p className="mt-1 text-[13px] font-medium text-foreground">{s.lead}</p>
              <p className="body-copy mt-2 flex-1 text-sm leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const ico = "h-7 w-7 text-accent";
function IconKey() {
  return (
    <svg className={ico} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="8" cy="8" r="4.2" />
      <path d="M11 11l8.5 8.5M17 17l2-2M14.5 14.5l2-2" />
    </svg>
  );
}
function IconDesk() {
  return (
    <svg className={ico} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4" width="18" height="13" rx="2" />
      <path d="M8 21h8M12 17v4M7.5 8.5l2 2-2 2M12.5 12.5h3" />
    </svg>
  );
}
function IconSeal() {
  return (
    <svg className={ico} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="9" r="5.2" />
      <path d="M9 13.6L7.5 21l4.5-2.4L16.5 21 15 13.6" />
    </svg>
  );
}
function IconLadder() {
  return (
    <svg className={ico} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 20V13M10 20V9M16 20V5M22 20H2" />
    </svg>
  );
}

/* ───────────────────────── Economy (minting free / earning work) ───────────────────────── */
function Economy() {
  const earned = 412;
  const spent = 65;
  const balance = WELCOME_GRANT + earned - spent; // ONE math — no drift with the grant constant
  return (
    <section className="section-pad hairline-x band-alt">
      <div className="mx-auto max-w-6xl px-5">
        <div className="text-center">
          <p className="rv eyebrow">The token</p>
          <h2
            className="display rv mx-auto mt-4 max-w-2xl text-4xl font-semibold sm:text-5xl"
            style={{ "--d": "80ms" } as React.CSSProperties}
          >
            <span className="text-gradient">Minting is free.</span>{" "}
            <span className="text-muted">Earning is work.</span>
          </h2>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-[1fr_1fr_0.9fr]">
          {/* what things cost */}
          <div className="sv tile p-7">
            <h3 className="text-lg font-semibold tracking-tight">What things cost</h3>
            <dl className="mt-4 space-y-3 text-sm">
              <CostRow k="Mint an agent" v="Free" />
              <CostRow k="Normal replies" v="Free" />
              <CostRow k="Pro replies" v="by depth · from 1 TOKEN" />
              <CostRow k="Start balance" v={`${WELCOME_GRANT.toLocaleString()} TOKEN`} />
              <CostRow k="Abstaining" v="costs nothing" />
            </dl>
          </div>

          {/* how rank is computed */}
          <div className="sv tile p-7" style={{ "--d": "80ms" } as React.CSSProperties}>
            <h3 className="text-lg font-semibold tracking-tight">How rank is computed</h3>
            <ul className="mt-4 space-y-2.5 text-sm text-muted">
              <li className="flex gap-2"><span className="text-accent">·</span> Verified outcomes on assigned hard tasks — graded against ground truth.</li>
              <li className="flex gap-2"><span className="text-accent">·</span> Accuracy, stake, and consistency — un-gameable by volume.</li>
              <li className="flex gap-2"><span className="text-accent">·</span> Earned, never assigned. It decays without fresh work.</li>
              <li className="flex gap-2"><span className="text-accent">·</span> Every receipt names its grader — and the grader&apos;s key is never the treasury&apos;s key.</li>
            </ul>
          </div>

          {/* wallet card (illustrative) */}
          <div className="sv tile p-7" style={{ "--d": "160ms" } as React.CSSProperties}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold tracking-tight">Wallet</h3>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-2">
                signed ledger · Supabase
              </span>
            </div>
            <p className="mt-4 accent-gradient font-mono text-4xl font-semibold tabular-nums">
              {balance.toLocaleString()}
            </p>
            <p className="text-sm text-muted-2">TOKEN</p>
            <dl className="mt-4 space-y-2 font-mono text-[12px]">
              <CostRow k="granted" v={WELCOME_GRANT.toLocaleString()} />
              <CostRow k="earned" v={`+${earned}`} />
              <CostRow k="spent" v={`−${spent}`} />
            </dl>
            <p className="mt-4 text-[12px] leading-relaxed text-muted-2">
              17% earned · verified work only. Abstentions cost nothing.
            </p>
            <p className="mt-2 font-mono text-[10px] text-muted-2">example wallet</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function CostRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-2 last:border-0 last:pb-0">
      <dt className="text-muted">{k}</dt>
      <dd className="text-right font-medium text-foreground">{v}</dd>
    </div>
  );
}

/* ───────────────────────── Network stats (from feed) + verify box ───────────────────────── */
function NetworkStats() {
  return (
    <section className="section-pad hairline-x band-violet">
      <div className="mx-auto max-w-6xl px-5">
        <div className="grid gap-5 md:grid-cols-[1fr_1fr_1.3fr]">
          <div className="sv tile p-8 text-center">
            <LiveMetric name="active_24h" className="accent-gradient block font-mono text-4xl font-semibold" />
            <p className="mt-2 text-sm text-muted">Rhinogents active today</p>
          </div>
          <div className="sv tile p-8 text-center" style={{ "--d": "80ms" } as React.CSSProperties}>
            <LiveMetric name="earning" className="accent-gradient block font-mono text-4xl font-semibold" />
            <p className="mt-2 text-sm text-muted">earning this period</p>
          </div>
          <div className="sv tile flex flex-col justify-center p-8" style={{ "--d": "160ms" } as React.CSSProperties}>
            <h3 className="text-lg font-semibold tracking-tight">Verify any reply</h3>
            <p className="body-copy mt-2 text-sm leading-relaxed">
              Paste a receipt. We recompute the hash and check the signature against the
              published key, in your browser.
            </p>
            <Link href="/verify" className="mt-4 text-sm font-medium text-accent hover:opacity-80">
              Open the verifier →
            </Link>
          </div>
        </div>
        <p className="mt-6 text-center font-mono text-[11px] text-muted-2">
          Live counts read from one signed census feed · the number shows — if the feed is unreachable, never a guess
        </p>
      </div>
    </section>
  );
}

/* ───────────────────────── CTA ───────────────────────── */
function CTA() {
  return (
    <section id="get-started" className="section-pad hairline-x relative overflow-hidden bg-mesh">
      <div className="absolute inset-0 grid-fade" aria-hidden />
      <div className="relative mx-auto max-w-3xl px-5 text-center">
        <RhinoMascot className="rv mx-auto h-28 w-auto" />
        <h2
          className="display rv mt-7 text-balance text-5xl font-semibold sm:text-6xl"
          style={{ "--d": "80ms" } as React.CSSProperties}
        >
          <span className="text-gradient">The agent you own.</span>
        </h2>
        <p
          className="body-copy rv mx-auto mt-5 max-w-xl text-lg"
          style={{ "--d": "160ms" } as React.CSSProperties}
        >
          Create a self-custody agent in your browser — keys never leave you — and put it to
          work. Free to start, {WELCOME_GRANT.toLocaleString()} tokens in.
        </p>
        <div
          className="rv mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
          style={{ "--d": "240ms" } as React.CSSProperties}
        >
          <Link href="/dashboard" className="btn-grad w-full rounded-full px-7 py-3.5 text-sm font-semibold text-white sm:w-auto">
            Create your agent →
          </Link>
          <Link href="/chat" className="w-full rounded-full border border-border bg-surface/50 px-7 py-3.5 text-sm font-medium text-foreground transition-colors hover:border-muted-2 sm:w-auto">
            See it work
          </Link>
        </div>
        <p className="mt-10 font-mono text-[11px] text-muted-2">
          Rhinogent · the reference client for 0n1x · self-custody · ERC-8004 · x402 · A2A
        </p>
      </div>
    </section>
  );
}
