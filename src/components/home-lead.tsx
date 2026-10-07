/* The landing page's opening movement — the part that was rebuilt from the 2026-10-05 scrapes
   (89 agent/dev-infra/custody sites across two passes) plus the two HTML drops.

   This is NOT a variant page. It is the real site's first four sections, in a separate file
   because page.tsx was already 1,100 lines and these sections have a different provenance from
   the ones below them. Everything here is reused by page.tsx and nothing else.

   What each section is, and the evidence for it:

   1. HERO — ≤7 words, agent as subject, and the install line IN the hero.
      AgentOps puts `pip install agentops` between the subhead and the CTA; agno's hero button
      is literally "Copy prompt"; Smithery leads with npx. Ours was four screens down.

   2. FAKED — section one is the FAILURE MODE, not the promise.
      Called "the highest-signal structural move in the whole set". Arcade's first content
      heading is "Failed approaches to agent security"; Braintrust's is "Agents fail differently
      than normal software". Ours names three ways agent trust is faked, and all three are things
      we measured this week, so it is reporting rather than rhetoric. It is the ONE dark band on
      the page: the custody scrape found the inverted ground works as emphasis for a single
      section and reads as a stripe pattern the moment it repeats.

   3. INSTEAD — code paired with its real output, side by side.
      Firecrawl's two-pane (Python left, JSON right) is the canonical version. Nobody in the set
      ships a long file or two languages in one block.

   4. LADDER — a numbered time-to-value ladder.
      Parahelp's "Hour 1 / Hour 2 / Hour 3" was the most legible version in the set.

   A dated "recently shipped" changelog was built here and then cut: the scrape liked it as a
   proof-of-life device, but on a page whose whole argument is "here is a record you can check
   yourself" a hand-written list of things we say we did is the weakest evidence on the page.
   The census feed and the receipts do that job with something a reader can recompute.

   Mono is used as a SYSTEM here, not as a code font: eyebrows, labels, numbers, stamps.
   Occurrence counts in the scrape — composio 224, e2b 176, mastra 101 — make it the strongest
   shared marker of the developer-infrastructure column, which is the column our whole claim
   ("you can check this") puts us in.

   NOT adopted, deliberately: autoplay hero video (the end-user-product tell, and the heaviest
   thing on every page that uses it), and a Solutions mega-menu (it reclassifies you as the
   demo-gated archetype). */

import Link from "next/link";
import { CopyCmd } from "@/components/home-fx";
import { HeroSession } from "@/components/hero-session";
import { WELCOME_GRANT } from "@/lib/economy";

export function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="rv mono-v2"
      style={{
        fontSize: 11,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: "var(--v2-ink-faint)",
      }}
    >
      {children}
    </p>
  );
}

/* ── 1 · hero ─────────────────────────────────────────────────────────────────────────── */
export function HeroLead() {
  return (
    <section className="relative overflow-hidden bg-mesh">
      <div className="absolute inset-0 hero-radial" aria-hidden />
      <div className="absolute inset-0 grid-fade" aria-hidden />
      <div
        className="sec relative"
        style={{ paddingTop: "clamp(48px,7vw,80px)", paddingBottom: "clamp(48px,7vw,80px)" }}
      >
      <div style={{ maxWidth: 760 }}>
        <p
          className="rv mono-v2"
          style={{
            fontSize: 11,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--v2-ink-faint)",
          }}
        >
          Self-custody identity for agents
        </p>

        <h1
          className="display rv mt-5 text-balance text-5xl font-bold tracking-[-0.03em] sm:text-7xl"
          style={{ maxWidth: 820 }}
        >
          <span className="text-gradient">Every agent gets</span>{" "}
          <span className="accent-gradient">a key it owns.</span>
        </h1>

        <p
          className="body-copy rv mt-6 text-lg leading-relaxed"
          style={{ maxWidth: 580, "--d": "70ms" } as React.CSSProperties}
        >
          An identity nobody issues, a wallet only you can spend, and a signed record of every
          move — so the agent can be held to account, not just trusted.
        </p>

        <div className="rv mt-7" style={{ maxWidth: 380, "--d": "120ms" } as React.CSSProperties}>
          <CopyCmd cmd="npx rhinogent init" />
        </div>

        <div
          className="rv mt-5 flex flex-wrap items-center gap-3"
          style={{ "--d": "170ms" } as React.CSSProperties}
        >
          <Link
            href="/dashboard"
            className="btn-grad rounded-full px-7 py-3.5 text-sm font-semibold text-white"
          >
            Create your agent
          </Link>
          <Link
            href="/chat"
            className="rounded-full border border-border bg-surface/50 px-7 py-3.5 text-sm font-medium text-foreground transition-colors hover:border-muted-2"
          >
            Or chat without an account
          </Link>
          <span className="mono-v2" style={{ fontSize: 11.5, color: "var(--v2-ink-faint)" }}>
            free · no card · {WELCOME_GRANT.toLocaleString()} tokens
          </span>
        </div>
      </div>

        <div className="mt-14">
          <HeroSession />
        </div>
      </div>
    </section>
  );
}

/* ── 2 · the failure mode (the page's one dark band) ──────────────────────────────────── */
export function Faked() {
  const ways = [
    {
      n: "01",
      t: "The agent signs its own verdict",
      d: "A signature proves who said it. Most “verified” agent claims are signed by the same key that made the claim, which proves nothing a reader didn’t already assume.",
      m: "we publish the grader’s key separately from the treasury’s",
    },
    {
      n: "02",
      t: "Holding a key is treated as a reputation",
      d: "An address with no record is an empty wallet with a nice name. Possession is not a track record, and most agent registries cannot tell you the difference.",
      m: "rank = 70 + floor(XP/12), earned only from verified outcomes",
    },
    {
      n: "03",
      t: "The registries are empty",
      d: "We sampled the flagship on-chain validation registry on two mainnets: 0 of 95 agents on Base and 0 of 101 on Ethereum carry a single validation record. The contract is deployed on 48 chains and essentially never written to.",
      m: "measured 2026-10-04 over public RPC",
    },
  ];
  return (
    <section style={{ background: "#0d1222", color: "#e6e9f2" }}>
      <div
        className="sec"
        style={{ paddingTop: "clamp(56px,8vw,96px)", paddingBottom: "clamp(56px,8vw,96px)" }}
      >
        <p
          className="rv mono-v2"
          style={{
            fontSize: 11,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "#7c87a3",
          }}
        >
          The problem
        </p>
        <h2
          className="display rv mt-4 text-4xl font-semibold text-white sm:text-5xl"
          style={{ "--d": "80ms" } as React.CSSProperties}
        >
          Three ways agent trust is faked today.
        </h2>
        <p
          className="rv mt-5 text-[15px] leading-relaxed text-[#9aa6bd]"
          style={{ maxWidth: 620, "--d": "140ms" } as React.CSSProperties}
        >
          We measured each of these. They are the reason a signature on its own is worth very
          little, and the reason this product exists.
        </p>

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {ways.map((w) => (
            <div
              key={w.n}
              className="rv rounded-2xl border border-white/[0.09] bg-white/[0.03] p-6"
            >
              <span className="mono-v2" style={{ fontSize: 12, color: "#a9a3ff" }}>
                {w.n}
              </span>
              <h3 className="mt-2.5 text-[16px] font-semibold text-white">{w.t}</h3>
              <p className="mt-2.5 text-[13.5px] leading-relaxed text-[#9aa6bd]">{w.d}</p>
              <p
                className="mono-v2 mt-4 border-t border-white/[0.08] pt-3"
                style={{ fontSize: 11, lineHeight: 1.6, color: "#5fd6a8" }}
              >
                ↳ {w.m}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── 3 · what happens instead — the two-pane ──────────────────────────────────────────── */
export function Instead() {
  return (
    <section
      className="sec"
      style={{ paddingTop: "clamp(56px,8vw,96px)", paddingBottom: "clamp(40px,6vw,64px)" }}
    >
      <Kicker>What happens instead</Kicker>
      <h2
        className="display rv mt-4 text-4xl font-semibold sm:text-5xl"
        style={{ maxWidth: 760, "--d": "80ms" } as React.CSSProperties}
      >
        A fact goes in. A receipt someone else can recompute comes out.
      </h2>

      <div className="mt-9 grid gap-4 lg:grid-cols-2">
        <Pane label="you ask" tone="in">
          <span className="text-[#5b6b85]">$</span> rhinogent verify stripe.com{"\n\n"}
          <span className="text-[#53607a]">{"// no account, no key, no sign-up"}</span>
        </Pane>
        <Pane label="it answers" tone="out">
          {"{"}{"\n"}
          {"  "}<span className="text-[#7cc5ff]">&quot;tier&quot;</span>{":       "}<span className="text-[#fbbf24]">&quot;GOLD&quot;</span>{","}{"\n"}
          {"  "}<span className="text-[#7cc5ff]">&quot;clearance&quot;</span>{": "}<span className="text-[#4ade80]">&quot;PROCEED&quot;</span>{","}{"\n"}
          {"  "}<span className="text-[#7cc5ff]">&quot;paths&quot;</span>{":      ["}<span className="text-[#4ade80]">&quot;infra&quot;</span>{", "}<span className="text-[#4ade80]">&quot;identity&quot;</span>{"],"}{"\n"}
          {"  "}<span className="text-[#7cc5ff]">&quot;agree&quot;</span>{":      "}<span className="text-[#4ade80]">true</span>{","}{"\n"}
          {"  "}<span className="text-[#7cc5ff]">&quot;grounds&quot;</span>{":    ["}<span className="text-[#4ade80]">&quot;domain age&quot;</span>{", "}<span className="text-[#4ade80]">&quot;TLS&quot;</span>{", "}<span className="text-[#4ade80]">&quot;brand&quot;</span>{"],"}{"\n"}
          {"  "}<span className="text-[#7cc5ff]">&quot;grader&quot;</span>{":     "}<span className="text-[#4ade80]">&quot;onyx-8994a5b5&quot;</span>{","}{"\n"}
          {"  "}<span className="text-[#7cc5ff]">&quot;alg&quot;</span>{":        "}<span className="text-[#4ade80]">&quot;Ed25519 / JCS&quot;</span>{"\n"}
          {"}"}{"\n\n"}
          <span className="text-[#53607a]">{"// two orthogonal paths have to agree for GOLD."}</span>{"\n"}
          <span className="text-[#53607a]">{"// when they disagree you get SILVER / REVIEW, not a"}</span>{"\n"}
          <span className="text-[#53607a]">{"// confident answer -- a 95-day-old domain returns that."}</span>
        </Pane>
      </div>

      <p className="mono-v2 rv mt-4" style={{ fontSize: 11.5, color: "var(--v2-ink-faint)" }}>
        A signature proves what was SAID. Independent verification proves it is TRUE. Work that has been re-derived by a different agent carries a check; work that is only signed is marked attested, and never gets one.
      </p>
    </section>
  );
}

function Pane({
  label,
  tone,
  children,
}: {
  label: string;
  tone: "in" | "out";
  children: React.ReactNode;
}) {
  return (
    <div
      className="rv flex flex-col overflow-hidden rounded-xl"
      style={{ boxShadow: "0 0 0 1px rgba(17,17,26,0.10)" }}
    >
      <div className="flex items-center justify-between border-b border-white/[0.07] bg-[#0c111c] px-4 py-2.5">
        <span
          className="mono-v2"
          style={{
            fontSize: 11,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: tone === "in" ? "#9aa6bd" : "#5fd6a8",
          }}
        >
          {label}
        </span>
        <span className="mono-v2" style={{ fontSize: 10.5, color: "#3d4760" }}>
          {tone === "in" ? "your terminal" : "signed response"}
        </span>
      </div>
      {/* flex-1 matters: the two panes are grid siblings and stretch to equal height, but a
          bare <pre> sizes to its content -- the shorter one showed the page ground through its
          bottom third. */}
      <pre className="flex-1 overflow-x-auto bg-[#0c111c] px-5 py-5 font-mono text-[12.5px] leading-[1.8] text-[#c6d3e6]">
        {children}
      </pre>
    </div>
  );
}

/* ── 4 · the ladder ───────────────────────────────────────────────────────────────────── */
export function Ladder() {
  const steps: [string, string][] = [
    [
      "Minute 1",
      "Run one command. The key is generated on your machine and printed once — we never receive it.",
    ],
    [
      "Minute 2",
      "Give it a job. It works on its own cloud browser and you watch, or you close the laptop.",
    ],
    [
      "Minute 3",
      "Read the receipt. Who did it, who checked it, what against, when — recomputable by anyone.",
    ],
  ];
  return (
    <section className="sec" style={{ paddingBottom: "clamp(56px,8vw,96px)" }}>
      <Kicker>How fast</Kicker>
      <h2
        className="display rv mt-4 text-4xl font-semibold sm:text-[44px]"
        style={{ "--d": "80ms" } as React.CSSProperties}
      >
        Three minutes, start to receipt.
      </h2>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {steps.map(([t, d]) => (
          <div key={t} className="rv tile p-6">
            <p
              className="mono-v2"
              style={{
                fontSize: 11,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--v2-accent)",
              }}
            >
              {t}
            </p>
            <p className="body-copy mt-2.5 text-[14px] leading-relaxed">{d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

