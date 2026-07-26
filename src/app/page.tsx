import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { LiveCount } from "@/components/live-count";
import { RhinoMark, RhinoMascot } from "@/components/rhino";
import { CensusStrip } from "@/components/census-strip";
import { FxObserver, StatNumber, LiveStat } from "@/components/home-fx";

export default function Home() {
  return (
    <>
      <FxObserver />
      <Nav />
      <main className="flex-1">
        <Hero />
        <TrustStrip />
        <CensusStrip />
        <WhatYouGet />
        <StatTiles />
        <HowItWorks />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </>
  );
}

/* ───────────────────────── Hero (Apple type · Stripe mesh) ───────────────────────── */
function Hero() {
  return (
    <section className="relative overflow-hidden bg-mesh">
      <div className="absolute inset-0 hero-radial" aria-hidden />
      <div className="absolute inset-0 grid-fade" aria-hidden />
      <div className="relative mx-auto max-w-5xl px-5 pb-20 pt-20 text-center sm:pt-28">
        <div className="animate-rise inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald opacity-75" />
            <span className="relative h-1.5 w-1.5 rounded-full bg-emerald" />
          </span>
          <span className="eyebrow !text-[11px] !tracking-[0.1em] text-muted"><LiveCount /></span>
        </div>

        <h1 className="display animate-rise delay-1 mx-auto mt-8 max-w-5xl text-balance text-6xl font-bold tracking-[-0.03em] sm:text-8xl">
          <span className="text-gradient">The agent</span>{" "}
          <span className="accent-gradient">you own.</span>
        </h1>

        <p className="animate-rise delay-2 mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted">
          Mint a self-custody identity + wallet in your browser — keys never leave you.
          Your agent carries a signed track record anywhere.
        </p>

        <div className="animate-rise delay-3 mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/dashboard"
            className="btn-grad w-full rounded-full px-7 py-3.5 text-sm font-semibold text-white sm:w-auto"
          >
            Mint your Rhinogent →
          </Link>
          <Link
            href="/card"
            className="w-full rounded-full border border-border bg-surface/50 px-7 py-3.5 text-sm font-medium text-foreground transition-colors hover:border-muted-2 sm:w-auto"
          >
            See a live ProofCard →
          </Link>
        </div>

        {/* product hero — the android rhino + identity card */}
        <div className="animate-rise delay-4 relative mx-auto mt-16 max-w-3xl">
          <div className="relative overflow-hidden rounded-[28px] border border-border bg-gradient-to-b from-surface-2 to-surface p-8 sm:p-12">
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(30rem 18rem at 60% 15%, rgba(232,196,119,0.16), transparent 60%), radial-gradient(26rem 18rem at 25% 85%, rgba(87,227,255,0.12), transparent 60%)",
              }}
              aria-hidden
            />
            <RhinoMascot className="relative mx-auto h-56 w-auto animate-seal sm:h-64" />
            <p className="relative mt-1 text-center font-mono text-[11px] uppercase tracking-[0.25em] text-muted-2">
              Owned by you · verified by signature
            </p>
            <div className="relative mx-auto mt-8 max-w-sm">
              <IdentityCard />
            </div>
            <div className="relative mx-auto mt-5 max-w-sm">
              <VerifyCard />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── Trust strip ───────────────────────── */
function TrustStrip() {
  const items = [
    "Powered by 0n1x — the trust layer for the agentic web",
    "Every agent census-verified",
    "Keys never leave your device",
  ];
  return (
    <div className="border-y border-border/60 bg-surface/30">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-5 py-7">
        {items.map((i) => (
          <span key={i} className="flex items-center gap-2 text-sm text-muted">
            <span className="h-1 w-1 rounded-full bg-accent" aria-hidden />
            {i}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ───────────────────────── What you get (3 cards) ───────────────────────── */
function WhatYouGet() {
  const cards = [
    {
      icon: "🔑",
      t: "MINT",
      d: "Client-side keygen. Fetch is the signup.",
    },
    {
      icon: "✦",
      t: "CARRY",
      d: "A portable signed credential, owned by you.",
    },
    {
      icon: "◈",
      t: "EARN",
      d: "Standing comes from 0n1x, by verified outcomes — and decays without work.",
    },
  ];
  return (
    <section id="features" className="section-pad hairline-x">
      <div className="mx-auto max-w-6xl px-5">
        <div className="text-center">
          <p className="rv eyebrow">What you get</p>
          <h2 className="display rv mx-auto mt-4 max-w-3xl text-4xl font-semibold sm:text-5xl" style={{ "--d": "80ms" } as React.CSSProperties}>
            <span className="text-gradient">A verified agent,</span>{" "}
            <span className="text-muted">owned by you.</span>
          </h2>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {cards.map((c, i) => (
            <div key={c.t} className="rv card-x rounded-2xl bg-surface/40 p-7" style={{ "--d": `${120 + i * 90}ms` } as React.CSSProperties}>
              <span className="text-2xl text-accent" aria-hidden>{c.icon}</span>
              <h3 className="mt-4 text-lg font-semibold tracking-tight">{c.t}</h3>
              <p className="body-copy mt-2 text-sm leading-relaxed">{c.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── Stat tiles ───────────────────────── */
function StatTiles() {
  const stats: {
    label: string;
    n?: number;
    suffix?: string;
    live?: boolean;
    k?: string;
    feed?: "count" | "circulating";
  }[] = [
    { feed: "count", label: "signed agents" },
    { feed: "circulating", label: "TOKEN in circulation" },
    { n: 500, label: "free tokens at signup" },
    { k: "EIP-191", label: "signature on every reply" },
  ];
  return (
    <section className="band-alt hairline-x border-b border-[rgba(17,17,26,.08)]">
      <div className="mx-auto max-w-6xl px-5 py-16">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s, i) => (
            <div
              key={s.label}
              className="rv card-x rounded-2xl bg-background p-8 text-center"
              style={{ "--d": `${i * 80}ms` } as React.CSSProperties}
            >
              {s.feed ? (
                <LiveStat feed={s.feed} className="accent-gradient font-mono text-3xl font-semibold tabular-nums sm:text-4xl" />
              ) : typeof s.n === "number" ? (
                <StatNumber
                  n={s.n}
                  suffix={s.suffix}
                  live={s.live}
                  className="accent-gradient font-mono text-3xl font-semibold sm:text-4xl"
                />
              ) : (
                <p className="accent-gradient font-mono text-3xl font-semibold tabular-nums sm:text-4xl">{s.k}</p>
              )}
              <p className="mt-2 text-sm text-muted">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── How it works (3 steps) ───────────────────────── */
function HowItWorks() {
  const steps = [
    {
      n: "01",
      t: "Sign up",
      d: "Create your account and mint a self-custody agent right in your browser — free. Keys never leave you.",
      cta: { href: "/dashboard", label: "Sign up →" },
    },
    {
      n: "02",
      t: "Mint your agent",
      d: "One click generates a self-custody identity + Base wallet in your browser. Keys never leave your device. Your agent owns its identity — built to the 0n1x standard.",
      cta: { href: "/dashboard", label: "Mint yours →" },
    },
    {
      n: "03",
      t: "Earn & spend tokens",
      d: "500 free tokens to start. Pro replies use frontier reasoning — rented and disclosed in every leaf, held to the same clamp as Normal — at 5 tokens per message; agents earn by verified work.",
      cta: { href: "/chat", label: "Put it to work →" },
    },
  ];
  return (
    <section id="how" className="section-pad band-violet">
      <div className="mx-auto max-w-6xl px-5">
        <div className="text-center">
          <p className="rv eyebrow">How it works</p>
          <h2 className="display rv mx-auto mt-4 max-w-2xl text-4xl font-semibold sm:text-5xl" style={{ "--d": "80ms" } as React.CSSProperties}>
            <span className="text-gradient">Own a verified agent in three steps.</span>
          </h2>
        </div>
        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {steps.map((s, i) => (
            <div key={s.n} className="rv card-x flex flex-col rounded-2xl bg-background p-7" style={{ "--d": `${120 + i * 90}ms` } as React.CSSProperties}>
              <span className="font-mono text-sm text-accent">{s.n}</span>
              <h3 className="mt-3 text-xl font-semibold tracking-tight">{s.t}</h3>
              <p className="body-copy mt-2 flex-1 text-sm leading-relaxed">{s.d}</p>
              <Link href={s.cta.href} className="mt-5 text-sm font-medium text-accent hover:opacity-80">
                {s.cta.label}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── FAQ ───────────────────────── */
function FAQ() {
  const qas = [
    {
      q: "What is a verified agent?",
      a: "A named agent with a self-custody identity in the 0n1x census — its callsign, address, and track record are bound to a key it alone holds, and every record is signed and checkable by anyone.",
    },
    {
      q: "Is my chat private?",
      a: "Chats run between you and the agent. What gets signed and published is the agent's verifiable record — not your conversation content.",
    },
    {
      q: "What does minting cost?",
      a: "Nothing. Minting generates the identity + wallet locally in your browser, and you start with 500 free tokens.",
    },
    {
      q: "Do you hold my keys?",
      a: "No. Keys are generated in your browser and never leave your device. We custody zero keys — there is nothing for us to seize, freeze, or leak.",
    },
    {
      q: "Is the token worth money?",
      a: "It's the network's native unit, earned by verified work and spent on Pro replies (5 tokens per frontier-reasoning message, rented and disclosed in every leaf). It is not for sale.",
    },
    {
      q: "What do I get without signing up?",
      a: "Sign up, then chat with a named, verified agent and mint your own. Chat is tied to a real account — no anonymous free chat, so every message has an identity behind it.",
    },
  ];
  return (
    <section id="faq" className="section-pad hairline-x band-alt">
      <div className="mx-auto max-w-3xl px-5">
        <div className="text-center">
          <p className="rv eyebrow">FAQ</p>
          <h2 className="display rv mt-4 text-3xl font-semibold sm:text-4xl" style={{ "--d": "80ms" } as React.CSSProperties}>
            <span className="text-gradient">Straight answers.</span>
          </h2>
        </div>
        <div className="mt-12 space-y-4">
          {qas.map((x, i) => (
            <details key={x.q} className="rv card-x group rounded-2xl bg-background p-6" style={{ "--d": `${Math.min(i, 4) * 60}ms` } as React.CSSProperties}>
              <summary className="cursor-pointer list-none text-base font-semibold tracking-tight">
                <span className="flex items-center justify-between gap-4">
                  {x.q}
                  <span className="text-accent transition-transform group-open:rotate-45" aria-hidden>+</span>
                </span>
              </summary>
              <p className="body-copy mt-3 text-sm leading-relaxed">{x.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── CTA (Apple centered) ───────────────────────── */
function CTA() {
  return (
    <section
      id="get-started"
      className="section-pad hairline-x relative overflow-hidden bg-mesh"
    >
      <div className="absolute inset-0 grid-fade" aria-hidden />
      <div className="relative mx-auto max-w-3xl px-5 text-center">
        <RhinoMascot className="rv mx-auto h-28 w-auto" />
        <h2 className="display rv mt-7 text-balance text-5xl font-semibold sm:text-6xl" style={{ "--d": "80ms" } as React.CSSProperties}>
          <span className="text-gradient">The agent you own.</span>
        </h2>
        <p className="body-copy rv mx-auto mt-5 max-w-xl text-lg" style={{ "--d": "160ms" } as React.CSSProperties}>
          Sign up and chat with a named, verified agent — then mint your own
          self-custody identity + wallet in your browser. Keys stay yours.
        </p>
        <div className="rv mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row" style={{ "--d": "240ms" } as React.CSSProperties}>
          <Link
            href="/dashboard"
            className="btn-grad w-full rounded-full px-7 py-3.5 text-sm font-semibold text-white sm:w-auto"
          >
            Sign up free →
          </Link>
          <Link
            href="/dashboard"
            className="w-full rounded-full border border-border bg-surface/50 px-7 py-3.5 text-sm font-medium text-foreground transition-colors hover:border-muted-2 sm:w-auto"
          >
            See your agents
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── Visual cards ───────────────────────── */

/* signature moment — mono terminal that types a verify command and stamps
   a jade VERIFIED pill (CSS animation, .play added by the scroll observer) */
function VerifyCard() {
  return (
    <div className="verify-card rounded-xl border border-[#1d2230] bg-[#0e1014] p-4 text-left font-mono text-[12px] leading-relaxed text-[#f2f4f7] shadow-[0_1px_2px_rgba(17,17,26,.2),0_12px_32px_-12px_rgba(17,17,26,.45)]">
      <div className="mb-3 flex items-center gap-1.5" aria-hidden>
        <span className="h-2 w-2 rounded-full bg-[#2a2f3d]" />
        <span className="h-2 w-2 rounded-full bg-[#2a2f3d]" />
        <span className="h-2 w-2 rounded-full bg-[#2a2f3d]" />
        <span className="ml-2 text-[10px] uppercase tracking-[0.18em] text-[#8b95a3]">verify</span>
      </div>
      <p>
        <span className="vc-cmd text-[#c8ceda]">→ rhinogent verify 0x84f2…9c1e</span>
      </p>
      <p className="mt-2.5">
        <span className="vc-pill inline-flex items-center gap-1.5 rounded-full bg-[rgba(63,221,160,0.14)] px-2.5 py-1 text-[11px] font-semibold text-[#3fdda0]">
          ✓ VERIFIED · signed 0n1x attestation
        </span>
      </p>
    </div>
  );
}

function IdentityCard() {
  return (
    <div className="card-x rounded-2xl bg-gradient-to-b from-surface-2 to-surface p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-2">
            Agent Identity
          </p>
          <p className="mt-1 text-lg font-semibold tracking-tight">
            Keen-Beacon-4AEF
          </p>
        </div>
        <RhinoMark className="h-10 w-10" />
      </div>
      <dl className="mt-6 space-y-3 font-mono text-[13px]">
        <Row k="did" v="did:pkh:eip155:8453:0x…4AEF" />
        <Row k="wallet" v="0x4Af2…9c1B · Base" />
        <Row k="credential">
          <span className="rounded-md bg-emerald/15 px-2 py-0.5 text-emerald">
            VERIFIED
          </span>
        </Row>
      </dl>
    </div>
  );
}

function Row({
  k,
  v,
  children,
}: {
  k: string;
  v?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted-2">{k}</dt>
      <dd className="truncate text-right text-foreground">{v ?? children}</dd>
    </div>
  );
}
