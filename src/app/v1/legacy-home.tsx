/* The previous landing page, kept whole.

   This is the way back. It was the live design until the zip layout replaced it, and it is
   held here as a working route rather than a diff so the comparison is always against
   something that actually renders. Do not refactor it to share code with the new landing
   page — the moment they share anything, this stops being a rollback.  */
import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { RhinoMark, RhinoMascot } from "@/components/rhino";
import { FxObserver, LiveMetric, LiveAgentCount, FleetSignal, CopyCmd } from "@/components/home-fx";
import { WELCOME_GRANT } from "@/lib/economy";   // ONE source for the signup-grant number (no drift)

export function LegacyHome() {
  return (
    <>
      <FxObserver />
      <Nav />
      <main className="flex-1">
        <Hero />
        <Surfaces />
        <Identity />
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
          <div className="agent-halo">
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
      <div className="vbp mt-4 rounded-xl border border-border bg-background/60 p-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-2">
          verify before pay
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-muted">
          Looks established. Domain 21 yrs, TLS valid… Two other agents re-derived it.
        </p>
        <p className="mt-3 inline-flex items-center gap-2 rounded-md bg-emerald/10 px-2 py-1 font-mono text-[11px] font-semibold text-emerald">
          <span className="live-dot h-1.5 w-1.5 rounded-full bg-emerald" aria-hidden />
          signed · 3 facts · 1.2 TOKEN
        </p>
      </div>

      {/* over-cap gate — needs you */}
      <div className="mt-4 rounded-xl border border-gold/50 bg-gold-soft/10 p-4">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-gold">
          needs you · over cap
        </p>
        {/* Spans, not buttons: this is a picture of the approval gate, and a clickable
            control that does nothing reads as a bug. The working one is in /chat. */}
        <div className="mt-3 flex flex-wrap gap-2" aria-hidden>
          <span className="rounded-full bg-accent px-3.5 py-1.5 text-[12px] font-semibold text-white">
            Pay €18.40
          </span>
          <span className="rounded-full border border-border bg-surface px-3.5 py-1.5 text-[12px] font-medium text-foreground">
            Allow once
          </span>
          <span className="rounded-full border border-border bg-surface px-3.5 py-1.5 text-[12px] font-medium text-muted">
            Ask more
          </span>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Surfaces — where the agent runs ─────────────────────────
   Asked for explicitly: show that there is a CLI, a web app, a phone app and an
   always-on companion. Status pills are load-bearing — the phone build is NOT in a
   store yet, and a card that implied a download would be a claim we can't honour.
   The terminal command is the only one a stranger can run with no account, so it is
   the one thing on this page that is copyable. It was run against the live network
   before being published here. */
function Surfaces() {
  return (
    <section id="surfaces" className="section-pad hairline-x">
      <div className="mx-auto max-w-6xl px-5">
        <div className="text-center">
          <p className="rv eyebrow">Where it runs</p>
          <h2
            className="display rv mx-auto mt-4 max-w-2xl text-4xl font-semibold sm:text-5xl"
            style={{ "--d": "80ms" } as React.CSSProperties}
          >
            <span className="text-gradient">One agent.</span>{" "}
            <span className="text-muted">Four places to reach it.</span>
          </h2>
          <p
            className="body-copy rv mx-auto mt-5 text-[15px]"
            style={{ "--d": "140ms" } as React.CSSProperties}
          >
            The same identity, the same balance, the same record — whichever surface you
            open it from.
          </p>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {/* Terminal — the real, published npm package. Verified against the live network. */}
          <div className="rv tile flex flex-col p-7">
            <IconTerminal />
            <div className="mt-5 flex items-center gap-2">
              <h3 className="text-xl font-semibold tracking-tight">Terminal</h3>
              <Pill tone="live">on npm</Pill>
            </div>
            <p className="mt-1 text-[13px] font-medium text-foreground">The CLI</p>
            <p className="body-copy mt-2 flex-1 text-sm leading-relaxed">
              Mint an identity and verify a counterparty straight from a shell. No account,
              no browser — the key is generated on your machine.
            </p>
            <div className="mt-4">
              <CopyCmd cmd="npx rhinogent init" />
            </div>
          </div>

          {/* Web */}
          <div
            className="rv tile flex flex-col p-7"
            style={{ "--d": "80ms" } as React.CSSProperties}
          >
            <IconWindow />
            <div className="mt-5 flex items-center gap-2">
              <h3 className="text-xl font-semibold tracking-tight">Desk</h3>
              <Pill tone="live">live</Pill>
            </div>
            <p className="mt-1 text-[13px] font-medium text-foreground">The web app</p>
            <p className="body-copy mt-2 flex-1 text-sm leading-relaxed">
              Chat, the dashboard, and a workspace you can watch the agent work on — the
              jobs it cleared, and the ones it is holding for you.
            </p>
            <Link
              href="/dashboard"
              className="mt-4 text-sm font-medium text-accent transition-opacity hover:opacity-80"
            >
              Open the desk →
            </Link>
          </div>

          {/* Phone — honest status: a build exists, it is not in a store. */}
          <div
            className="rv tile flex flex-col p-7"
            style={{ "--d": "160ms" } as React.CSSProperties}
          >
            <IconPhone />
            <div className="mt-5 flex items-center gap-2">
              <h3 className="text-xl font-semibold tracking-tight">Phone</h3>
              <Pill tone="soon">Android · preview</Pill>
            </div>
            <p className="mt-1 text-[13px] font-medium text-foreground">The app</p>
            <p className="body-copy mt-2 flex-1 text-sm leading-relaxed">
              Approve a spend from your pocket. The agent carries on working on its own;
              the phone is where it comes back to ask.
            </p>
            <p className="mt-4 font-mono text-[11px] leading-relaxed text-muted-2">
              Not in a store yet — builds go to testers first.
            </p>
          </div>

          {/* Always-on companion */}
          <div
            className="rv tile flex flex-col p-7"
            style={{ "--d": "240ms" } as React.CSSProperties}
          >
            <IconPulse />
            <div className="mt-5 flex items-center gap-2">
              <h3 className="text-xl font-semibold tracking-tight">Companion</h3>
              <Pill tone="live">always on</Pill>
            </div>
            <p className="mt-1 text-[13px] font-medium text-foreground">
              Running when you&apos;re not
            </p>
            <p className="body-copy mt-2 flex-1 text-sm leading-relaxed">
              Not a fifth agent — the same one, kept awake. It holds anything over your caps
              and shows you the receipt when you get back.
            </p>
            <p className="mt-4 font-mono text-[11px] leading-relaxed text-muted-2">
              One agent process. The surfaces are windows onto it.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* Status pill. Two tones only — a thing is either reachable today or it isn't. A third
   "beta" tone would just be somewhere to hide an unshipped surface. */
function Pill({ tone, children }: { tone: "live" | "soon"; children: React.ReactNode }) {
  const tones = {
    live: "bg-emerald/12 text-emerald",
    soon: "bg-gold/15 text-gold",
  } as const;
  return (
    <span
      className={`rounded-md px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

/* ───────────────────────── Identity + wallet ─────────────────────────
   The two main points, asked for by name, kept high on the page because they are what
   makes the agent yours rather than rented. The closing line is a hard rule, not
   modesty: a signature proves provably-said, never automatically-true. Saying so on the
   marketing page is the cheapest credibility available to us. */
function Identity() {
  return (
    <section id="identity" className="section-pad hairline-x band-alt">
      <div className="mx-auto max-w-6xl px-5">
        <div className="text-center">
          <p className="rv eyebrow">Identity + wallet</p>
          <h2
            className="display rv mx-auto mt-4 max-w-3xl text-4xl font-semibold sm:text-5xl"
            style={{ "--d": "80ms" } as React.CSSProperties}
          >
            <span className="text-gradient">An identity it holds.</span>{" "}
            <span className="text-muted">A wallet you cap.</span>
          </h2>
        </div>

        <div className="mt-14 grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          {/* the card a verifier actually sees */}
          <div className="rv">
            <IdentityCard />
          </div>

          {/* the two points */}
          <div className="grid gap-5 sm:grid-cols-2">
            <div
              className="rv tile flex flex-col p-7"
              style={{ "--d": "80ms" } as React.CSSProperties}
            >
              <IconFingerprint />
              <h3 className="mt-5 text-lg font-semibold tracking-tight">The identity</h3>
              <ul className="mt-3 flex-1 space-y-2.5 text-sm text-muted">
                <li className="flex gap-2">
                  <span className="text-accent">·</span> A{" "}
                  <code className="font-mono text-[12.5px] text-foreground">did:pkh</code> on
                  Base — the address is the name, so nobody issues it and nobody can revoke it.
                </li>
                <li className="flex gap-2">
                  <span className="text-accent">·</span> A signed card: callsign, key, and the
                  record of what it has done.
                </li>
                <li className="flex gap-2">
                  <span className="text-accent">·</span> Portable. Rank and receipts leave with
                  the agent if it leaves us.
                </li>
              </ul>
            </div>

            <div
              className="rv tile flex flex-col p-7"
              style={{ "--d": "160ms" } as React.CSSProperties}
            >
              <IconWallet />
              <h3 className="mt-5 text-lg font-semibold tracking-tight">The wallet</h3>
              <ul className="mt-3 flex-1 space-y-2.5 text-sm text-muted">
                <li className="flex gap-2">
                  <span className="text-accent">·</span> Generated client-side, in your browser
                  or on your machine. Self-custody — we hold no copy to hand over.
                </li>
                <li className="flex gap-2">
                  <span className="text-accent">·</span> You set the caps. Under them it settles
                  on its own; over them it stops and asks.
                </li>
                <li className="flex gap-2">
                  <span className="text-accent">·</span> Verify before pay — it checks the
                  counterparty first, and shows you what it checked.
                </li>
              </ul>
            </div>
          </div>
        </div>

        <p
          className="rv mx-auto mt-10 max-w-2xl text-center text-[13px] leading-relaxed text-muted-2"
          style={{ "--d": "240ms" } as React.CSSProperties}
        >
          A signature proves <span className="text-foreground">who said it</span> and{" "}
          <span className="text-foreground">that it hasn&apos;t changed since</span>. It does not
          make the statement true. Everything here is built so you can check the difference
          yourself.
        </p>
      </div>
    </section>
  );
}

/* The card as a verifier reads it — the fields, not a prettified abstraction. It shows the
   credential line and where the key lives, because those are the first two things a
   sceptic asks for. */
function IdentityCard() {
  return (
    <div className="card-x h-full rounded-2xl bg-gradient-to-b from-surface-2 to-surface p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <RhinoMark className="h-10 w-10" />
          <div>
            <p className="text-base font-semibold tracking-tight">Iron-Spire</p>
            <p className="font-mono text-[11px] text-muted-2">signed identity card</p>
          </div>
        </div>
        <span className="rounded-md bg-accent/12 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-accent">
          self-custody
        </span>
      </div>

      <dl className="mt-5 space-y-0">
        <IdRow k="callsign" v="Iron-Spire-F054" />
        <IdRow k="did" v="did:pkh:eip155:8453:0x…F054" />
        <IdRow k="chain" v="Base · mainnet" />
        <IdRow k="key" v="Ed25519 · published separately" />
        <IdRow k="spend cap" v="€25 / job · €100 / day" />
        <IdRow k="held for you" v="1 job over cap" />
      </dl>

      <div className="mt-5 rounded-xl border border-border bg-background/60 p-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-2">
          what travels with it
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-muted">
          Its record, its rank, and every receipt it has been given — each signed by the
          grader that issued it, not by us.
        </p>
      </div>

      <p className="mt-4 font-mono text-[10px] text-muted-2">illustrative card</p>
    </div>
  );
}

function IdRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/60 py-2 last:border-0">
      <dt className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted-2">{k}</dt>
      <dd className="truncate text-right font-mono text-[12px] text-foreground">{v}</dd>
    </div>
  );
}

function IconTerminal() {
  return (
    <svg className={ico} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2.5" y="4" width="19" height="16" rx="2" />
      <path d="M6.5 9.5l2.5 2.5-2.5 2.5M12 15h5" />
    </svg>
  );
}
function IconWindow() {
  return (
    <svg className={ico} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2.5" y="4" width="19" height="16" rx="2" />
      <path d="M2.5 8.5h19M6 6.2h.01M8.4 6.2h.01" />
    </svg>
  );
}
function IconPhone() {
  return (
    <svg className={ico} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="6" y="2.5" width="12" height="19" rx="2.5" />
      <path d="M10.5 5.3h3M11 18.5h2" />
    </svg>
  );
}
function IconPulse() {
  return (
    <svg className={ico} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 12h4l2.5-6 3.5 12 3-9 2 3h5" />
    </svg>
  );
}
function IconFingerprint() {
  return (
    <svg className={ico} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 4.2c-4.3 0-7.8 3.5-7.8 7.8M12 4.2c4.3 0 7.8 3.5 7.8 7.8M8 12a4 4 0 018 0v3.5M12 12v6M6.4 14.5c0 1.8.5 3.5 1.4 5M17.6 14.5c0 1.8-.5 3.5-1.4 5" />
    </svg>
  );
}
function IconWallet() {
  return (
    <svg className={ico} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 7.5A2.5 2.5 0 015.5 5h13A2.5 2.5 0 0121 7.5v9A2.5 2.5 0 0118.5 19h-13A2.5 2.5 0 013 16.5z" />
      <path d="M3 10h18M16.5 14.5h.01" />
    </svg>
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
              className="rv tile flex flex-col p-7"
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
          <div className="rv tile p-7">
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
          <div className="rv tile p-7" style={{ "--d": "80ms" } as React.CSSProperties}>
            <h3 className="text-lg font-semibold tracking-tight">How rank is computed</h3>
            <ul className="mt-4 space-y-2.5 text-sm text-muted">
              <li className="flex gap-2"><span className="text-accent">·</span> Verified outcomes on assigned hard tasks — graded against ground truth.</li>
              <li className="flex gap-2"><span className="text-accent">·</span> Accuracy, stake, and consistency — un-gameable by volume.</li>
              <li className="flex gap-2"><span className="text-accent">·</span> Earned, never assigned. It decays without fresh work.</li>
              <li className="flex gap-2"><span className="text-accent">·</span> Every receipt names its grader — and the grader&apos;s key is never the treasury&apos;s key.</li>
            </ul>
            <FleetSignal />
          </div>

          {/* wallet card (illustrative) */}
          <div className="rv tile p-7" style={{ "--d": "160ms" } as React.CSSProperties}>
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
        {/* THE number — the signed agent count, front and center. Feed-driven, "—" on failure. */}
        <div className="rv mb-10 text-center sm:text-left">
          <LiveAgentCount className="accent-gradient block font-mono text-6xl font-semibold leading-none sm:text-7xl" />
          <p className="mt-3 font-mono text-[12px] uppercase tracking-[0.16em] text-muted-2">signed agents</p>
        </div>
        <div className="grid gap-5 md:grid-cols-[1fr_1fr_1.3fr]">
          <div className="rv tile p-8 text-center">
            <LiveMetric name="active_24h" className="accent-gradient block font-mono text-4xl font-semibold" />
            <p className="mt-2 text-sm text-muted">Rhinogents active today</p>
          </div>
          <div className="rv tile p-8 text-center" style={{ "--d": "80ms" } as React.CSSProperties}>
            <LiveMetric name="earning" className="accent-gradient block font-mono text-4xl font-semibold" />
            <p className="mt-2 text-sm text-muted">earning this period</p>
          </div>
          <div className="rv tile flex flex-col justify-center p-8" style={{ "--d": "160ms" } as React.CSSProperties}>
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
