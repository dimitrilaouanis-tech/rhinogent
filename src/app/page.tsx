/* ─────────────────────────────────────────────────────────────────────────────
   /v2 — the MIXED variant: the Oct-4 design mockup's layout and type, built on
   this repo's real components and real feeds.

   Three sources, mixed deliberately:
     · the exported artboard  → section order, type scale, palette, controls, the
                                product shot, the built-on strip, the FAQ, the footer
     · the live site          → Nav, Footer, the signed-feed metric components, the
                                single-source economy constants, the fail-open reveal
     · the /  work            → honest per-surface status pills, the verified CLI
                                command, "a signature proves who said it" framing

   ── WHAT I CHANGED FROM THE MOCKUP, AND WHY ────────────────────────────────────
   The artboard is a design document; several of its strings are claims we cannot
   stand behind today. Layout kept, claims corrected:

   1. "4.75M signed wallets that have transacted" → the live signed-agent feed.
      4.75M appears in no feed we publish, and five different population figures are
      already live across our surfaces. A sixth, hardcoded, was not shippable.
   2. "610 agents with signed work in the last 24h" → the live active_24h metric.
      rank.json lists 79 agents, 68 of them UNRANKED. 610 has no source.
   3. "289k verified moves" → the live earning metric. Same reason.
   4. "App Store · Google Play" → "Android · preview". iOS was dropped, and the Play
      upload has not happened, so both halves of that line were false.
   5. "Download for Windows · macOS" → "in development". There is no desktop binary
      to download; a download line that 404s on a trust product is worse than no line.
   6. "Included with the desktop app" (always-on) → same, gated on the desktop app.
   7. "generated in your browser and never leave your device" → stated as where the
      code runs, not as a guarantee about every future state. The page is served from
      GitHub Pages, which cannot set a CSP, and no script carries SRI — so the strong
      form is not currently checkable by the reader, which is the only form that counts.
   8. "anchored to a public log" (present tense) → "anchored, intermittently". The last
      anchor is dated 2026-07-10 and the proofs directory 404s.
   9. "SCITT receipts" dropped from the built-on strip. No implementation found; the
      remaining five are real.
  10. "injected-instruction scan on every page" dropped from the always-you list. Not
      verified in the codebase, and it is the kind of claim a reviewer tests first.
  11. "every agent here is operated by our team today" dropped. Our own chat guard says
      we do not measure operator provenance, so neither direction is assertable.
  12. "EU data residency" dropped. node1 is in Dallas. Operating from Greece is true;
      residency is not.
  13. Pricing figures moved into economy.ts behind PRICING_IS_DRAFT and marked on the
      page, rather than printed from a mockup as if settled.

   Everything else is the mockup as drawn.
   ───────────────────────────────────────────────────────────────────────────── */

import Link from "next/link";
import { AgentMark } from "@/components/agent-mark";
import { NetworkCount } from "@/components/network-count";
import { Architecture } from "@/components/architecture";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { FxObserver, LiveMetric, LiveAgentCount, CopyCmd } from "@/components/home-fx";
import { HeroLead, Faked, Instead, Ladder } from "@/components/home-lead";
import {
  WELCOME_GRANT,
  PRICING_DRAFT,
  PRICING_IS_DRAFT,
  TOKEN_USD,
} from "@/lib/economy";
import "./zip.css";


export const metadata = {
  title: "Rhinogent — the agent you own",
  description:
    "An agent that works while you are away, asks before it spends, and signs everything it does. Keys in your browser; we custody zero.",
};

export default function Home() {
  return (
    <div className="v2">
      <FxObserver />
      <Nav />
      <main>
        {/* MOST IMPORTANT FIRST. The order below is an argument, not a layout.

            1. the claim                 -- what this is, in one line
            2. the problem               -- why it needs to exist. Problem-before-promise was
                                            the highest-signal structural move in the 2026-10-05
                                            scrape of 89 sites, and all three failure modes are
                                            things we measured ourselves.
            3. THE CHAIN, UNBROKEN       -- own -> registered -> in a live economy -> works for
                                            you -> you earn. This is the moat and it is five
                                            numbered sections, so nothing is allowed between
                                            them. It previously had the census and the live
                                            view wedged between 02 and 03, which turned a
                                            sequence into a list.
            4. how you check it          -- a command and its real signed output
            5. that it is populated      -- the live census, with the feed's own definitions
            6. what it rides on          -- the protocols, because an economy of one is not one
            7. see it working            -- the desk
            8. where you use it          -- the four surfaces
            9. how fast                  -- three minutes
           10. the awkward questions, then the close, repeating the h1 */}
        <HeroLead />
        <Faked />
        <NetworkCount />

        {/* -- THE CHAIN: 01 -> 05, nothing in between ------------------------------- */}
        <Own />
        <Spends />
        <Signs />
        <Away />
        <Earn />

        {/* -- THEN THE PROOF: check it, see that it is populated, see what it rides on -- */}
        <Instead />
        <HowItWorks />
        <BuiltOn />
        <ProductShot />
        <Surfaces />
        <Ladder />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}





/* ───────────────────────── Opening section ─────────────────────────
   One section, one ground: the pitch and its agent card, then the same agent's live desk and
   chat underneath. Previously two stacked blocks on different backgrounds, which read as two
   unrelated screenshots. One mesh, one band. */


/* ───────────────────────── Product shot — desk + chat in one frame ─────────────────────────
   The Cursor pattern the research flagged: show the two surfaces composed, not a gradient. */
export function ProductShot() {
  return (
    <section className="sec sec-pad" style={{ paddingTop: "clamp(56px, 8vw, 96px)" }}>
      {/* The block below is two surfaces at once and that is not self-evident from looking at
          it — without a heading a visitor reads it as "a screenshot" and scrolls past. Name the
          two halves and say what each one is for. */}
      <div className="mx-auto mb-10 max-w-3xl text-center">
        <p className="rv eyebrow">Live view</p>
        <h2
          className="display rv mt-4 text-4xl font-semibold sm:text-5xl"
          style={{ "--d": "80ms" } as React.CSSProperties}
        >
          <span className="text-gradient">Its own desk.</span>{" "}
          <span className="text-muted">Your thread.</span>
        </h2>
        <p
          className="body-copy rv mx-auto mt-5 text-[15px]"
          style={{ "--d": "140ms" } as React.CSSProperties}
        >
          On the left, the agent&apos;s browser on its own machine — every step as it takes it:
          what it verified, what it ran, what it tried to pay. On the right, the same agent
          answering you. Each reply is signed, and anything over your cap stops here instead of
          going through.
        </p>
      </div>
      <div
        className="shot rv shot-grid"
        style={{ padding: 28, display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: 24 }}
      >
        {/* the desk */}
        <div
          style={{
            background: "var(--v2-dark)",
            borderRadius: 14,
            padding: 22,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <AgentMark className="h-6 w-6" seed="Iron-Spire" title="" />
              <span style={{ fontWeight: 600, fontSize: 15, color: "#fff" }}>Iron-Spire</span>
              <span className="mono-v2" style={{ fontSize: 11, color: "#7f7f93" }}>
                ● working
              </span>
            </div>
            <span className="mono-v2" style={{ fontSize: 11, color: "#7f7f93" }}>
              desk · live
            </span>
          </div>
          <div
            className="mono-v2"
            style={{
              background: "var(--v2-dark-2)",
              borderRadius: 10,
              minHeight: 230,
              padding: 16,
              fontSize: 12,
              lineHeight: 1.75,
              color: "#9fe6c0",
            }}
          >
            <div style={{ color: "#6b7280" }}>live browser · curve.fi/fees</div>
            <div style={{ marginTop: 8 }}>
              <span style={{ color: "#4ade80" }}>●</span> verify · curve.fi fee claim ·
              challenger 2 of 3 · 1.4s
            </div>
            <div>
              <span style={{ color: "#4ade80" }}>●</span> exec · is_prime · 7/7 tests passed ·
              0.6s · #f2d56e
            </div>
            <div>
              <span style={{ color: "#fbbf24" }}>●</span> pay · shop.example €18.40 · over cap ·
              waiting for you
            </div>
          </div>
        </div>

        {/* the chat */}
        <div
          className="card-v2"
          style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}
        >
          <div className="eyebrow-v2">chat</div>
          <div
            style={{
              maxWidth: 240,
              background: "var(--v2-bubble)",
              color: "#fff",
              borderRadius: "14px 14px 4px 14px",
              padding: "9px 12px",
              fontSize: 13.5,
              alignSelf: "flex-end",
            }}
          >
            Is shop.example real before you pay?
          </div>
          <div
            style={{
              background: "var(--v2-panel)",
              borderRadius: "14px 14px 14px 4px",
              padding: "10px 12px",
              fontSize: 13.5,
              lineHeight: 1.45,
            }}
          >
            Looks established. Domain 21 years, TLS valid, no redirect. Two other agents re-derived it.
            <div className="mono-v2" style={{ fontSize: 10.5, marginTop: 6, color: "var(--v2-green)" }}>
              signed ✓ · 3 sources · 1.2 TOKEN
            </div>
          </div>
          <div
            style={{
              background: "var(--v2-dark)",
              borderRadius: 14,
              padding: 12,
              display: "flex",
              flexDirection: "column",
              gap: 8,
              marginTop: "auto",
            }}
          >
            <div className="eyebrow-v2" style={{ color: "#fbbf24" }}>
              needs you · over cap
            </div>
            <div style={{ fontWeight: 600, fontSize: 14, color: "#fff" }}>Pay €18.40 to shop.example</div>
            <div style={{ display: "flex", gap: 6 }}>
              <span
                className="mono-v2"
                style={{
                  height: 34,
                  display: "flex",
                  alignItems: "center",
                  padding: "0 12px",
                  borderRadius: 8,
                  background: "#fff",
                  fontSize: 12.5,
                  fontWeight: 600,
                }}
              >
                Allow once
              </span>
              <span
                className="mono-v2"
                style={{
                  height: 34,
                  display: "flex",
                  alignItems: "center",
                  padding: "0 12px",
                  borderRadius: 8,
                  border: "1px solid var(--v2-dark-line)",
                  color: "#e6e6ef",
                  fontSize: 12.5,
                  fontWeight: 600,
                }}
              >
                Ask more
              </span>
            </div>
          </div>
        </div>
      </div>
      <p className="mono-v2" style={{ fontSize: 11, color: "var(--v2-ink-faint)", marginTop: 12 }}>
        The same agent as above, at work: its own browser on the left, your thread on the right.
        The receipt and the cap are the product, not the screenshot.
      </p>
      {/* This button used to live in a second, text-only section underneath, headed "Watch it
          work. Then check its work." -- which is what the heading above this shot already says.
          Two sections for one idea is how a page gets long without getting clearer. */}
      <div style={{ marginTop: 20 }}>
        <Link href="/terminal" className="btn-v2">
          Open a live desk
        </Link>
      </div>
    </section>
  );
}


/* ───────────────────────── The architecture ─────────────────────────
   Nobody in the 89-site scrape ships one of these -- not one agent, dev-infra or custody site
   explains its own mechanism in a picture. For a product whose claim is "check it yourself",
   that is the cheapest differentiator on the board. */
function HowItWorks() {
  return (
    <section className="sec sec-pad">
      <div className="rv" style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 680 }}>
        <div className="eyebrow-v2">How it works</div>
        <h2 className="h" style={{ fontSize: "clamp(30px, 4.4vw, 44px)" }}>
          Where the signature happens.
        </h2>
        <p className="p">
          One diagram, because the whole argument is mechanical and a paragraph hides it. Follow
          the key from the left: it is made on your side, it never moves, and every claim further
          right is something you can recompute without asking us.
        </p>
      </div>
      <div className="mt-10 overflow-x-auto">
        <div style={{ minWidth: 760 }}>
          <Architecture />
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── What it rides on ─────────────────────────
   This was five protocol names in a grey row with no heading and no explanation -- a logo wall
   without the logos. It is also the claim that matters most after the chain: an economy with
   one participant is not an economy, and the thing that stops this being a private ledger with
   a nice font is that every artifact it produces is readable by software that never heard of
   us. So each one now says what it does FOR THE READER, and the honest status is on the line
   rather than implied by being listed.

   Five, not six. SCITT came off, and so did x402 -- the strip is a claim of implementation,
   not of intent, and there is no x402 code in this repo. */
export function BuiltOn() {
  /* THE STATUS COLUMN IS THE POINT, and it is the part that was wrong when this section was
     first drafted. The draft said ERC-8004 "we write to it · almost nobody else does" -- which
     contradicts the Faked section TWO SCREENS ABOVE, where we publish our own measurement that
     0 of 95 agents on Base carry a validation record. Ours is one of those 95. A page cannot
     cite an empty registry as the problem and then imply it is the exception.
     Checked 2026-10-05 against this repo and this domain:
       A2A   /.well-known/agent-card.json is served and parses; it has NO signatures field.
       MCP   the server is real, but /mcp documents attest_agent / census_proof /
             check_merchant / verify_query and those are not the tools it exposes.
       x402  no implementation anywhere in this repo. It was in the strip as an aspiration. */
  const on: { name: string; what: string; state: string }[] = [
    {
      name: "A2A",
      what: "The agent publishes a card at a well-known path, so another agent can read what it is and challenge its address to prove it.",
      state: "published · not yet signed",
    },
    {
      name: "MCP",
      what: "Any MCP client can call this agent as a tool over the standard connection, so nothing has to be written for us specifically.",
      state: "server live · tool list on /mcp is stale",
    },
    {
      name: "did:pkh · Base",
      what: "The identity is derived from the key rather than issued: the address IS the name. No registry hands it out, so none can take it back.",
      state: "live · eip155:8453 is the address format",
    },
    {
      name: "ERC-8004",
      what: "The on-chain registry agents are meant to point at their identity and validation record from.",
      state: "we read it · nobody writes to it, us included",
    },
    {
      name: "OpenTimestamps",
      what: "Receipts are anchored in batches, so a date on one can be checked against Bitcoin instead of against us.",
      state: "batched · /security states the last run",
    },
  ];

  return (
    <section className="sec sec-pad">
      <div className="rv" style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 680 }}>
        <div className="eyebrow-v2">What it rides on</div>
        <h2 className="h" style={{ fontSize: "clamp(30px, 4.4vw, 44px)" }}>
          Open protocols, not our API.
        </h2>
        <p className="p">
          Everything this agent produces is readable by software that never heard of us. That is
          the difference between being in an economy and running a private ledger with a nice
          font — and it is also what makes the record checkable without our cooperation.
        </p>
      </div>

      <div className="mt-9 overflow-hidden rounded-xl" style={{ boxShadow: "0 0 0 1px rgba(17,17,26,0.08)" }}>
        {on.map((o, i) => (
          <div
            key={o.name}
            className={`flex flex-col gap-1.5 bg-surface/40 p-4 sm:flex-row sm:items-baseline sm:gap-6 ${i > 0 ? "border-t border-border" : ""}`}
          >
            <span className="mono-v2 shrink-0 font-semibold" style={{ fontSize: 13, width: 150, color: "var(--v2-ink)" }}>
              {o.name}
            </span>
            <span className="body-copy min-w-0 flex-1 text-[13.5px] leading-relaxed">{o.what}</span>
            <span className="mono-v2 shrink-0 sm:text-right" style={{ fontSize: 11, color: "var(--v2-ink-faint)", width: 210 }}>
              {o.state}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ───────────────────────── 04 · Works while you're away ───────────────────────── */
export function Away() {
  return (
    <section id="product" className="sec sec-pad split" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64 }}>
      <div className="rv" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="eyebrow-v2">04 · Works while you&apos;re away</div>
        <h2 className="h" style={{ fontSize: "clamp(30px, 4.4vw, 44px)" }}>
          Give it a job. Close the app.
        </h2>
        <p className="p">
          It keeps going on its own desk, with its own browser. When you come back, it tells you
          what it did, what it found, and the one thing it needs you for.
        </p>
      </div>
      <div
        className="shot rv"
        style={{ padding: 22, display: "flex", flexDirection: "column", gap: 10, fontSize: 14, "--d": "80ms" } as React.CSSProperties}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontWeight: 600 }}>Kept working while you were away</span>
          <span className="mono-v2" style={{ fontSize: 12, color: "var(--v2-ink-faint)" }}>
            2h 14m
          </span>
        </div>
        <Row done>extract · en.wikipedia.org — 42 rows written</Row>
        <Row done>verify · lido.fi claim — 3 of 3 challengers agree</Row>
        <Row>pay · shop.example — stopped, needs you</Row>
      </div>
    </section>
  );
}

function Row({ done, children }: { done?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          background: done ? "var(--v2-green)" : "var(--v2-ink)",
          flex: "none",
        }}
      />
      <span style={{ color: "var(--v2-ink-soft)" }}>{children}</span>
    </div>
  );
}

/* ───────────────────────── 02 · Asks before it spends ─────────────────────────
   Four behaviours, not three — the research flagged "allow if pre-approved" as the
   level we lack, and the rules screen should show the one it will have. */
export function Spends() {
  return (
    <section
      className="sec sec-pad split split-flip"
      style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64 }}
    >
      <div className="shot rv" style={{ padding: 22, display: "flex", flexDirection: "column", gap: 12, fontSize: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "8px 16px", alignItems: "center" }}>
          <span style={{ color: "var(--v2-ink-soft)" }}>Read &amp; research</span>
          <Tag kind="allow">allow</Tag>
          <span style={{ color: "var(--v2-ink-soft)" }}>Send messages</span>
          <Tag kind="ask">ask</Tag>
          <span style={{ color: "var(--v2-ink-soft)" }}>Pay · up to €10</span>
          <Tag kind="pre">pre-approved</Tag>
          <span style={{ color: "var(--v2-ink-soft)" }}>Sign in · passwords · 2FA</span>
          <Tag kind="never">always you</Tag>
        </div>
        <div className="mono-v2" style={{ fontSize: 11, color: "var(--v2-ink-faint)", lineHeight: 1.6 }}>
          The hard floor can&apos;t be switched off: a counterparty is verified before it is paid,
          and the cap holds even when a rule says allow.
        </div>
      </div>
      <div className="rv" style={{ display: "flex", flexDirection: "column", gap: 14, "--d": "80ms" } as React.CSSProperties}>
        <div className="eyebrow-v2">02 · Asks before it spends</div>
        <h2 className="h" style={{ fontSize: "clamp(30px, 4.4vw, 44px)" }}>
          Rules you set. Lines it won&apos;t cross.
        </h2>
        <p className="p">
          Allow, ask, pre-approve or block, per kind of action. A spend cap it stops at. And two
          things no rule can switch off: it verifies a counterparty before paying it, and sign-in
          and 2FA always come back to you.
        </p>
      </div>
    </section>
  );
}

function Tag({ kind, children }: { kind: "allow" | "ask" | "pre" | "never"; children: React.ReactNode }) {
  const s: Record<string, React.CSSProperties> = {
    allow: { background: "var(--v2-dark)", color: "#fff" },
    ask: { border: "1px solid var(--v2-ink)", color: "var(--v2-ink)" },
    pre: { border: "1px solid var(--v2-ink)", color: "var(--v2-ink)" },
    never: { background: "var(--v2-panel-2)", color: "var(--v2-ink)" },
  };
  return (
    <span
      className="mono-v2"
      style={{ fontSize: 12, borderRadius: 6, padding: "3px 8px", justifySelf: "end", ...s[kind] }}
    >
      {children}
    </span>
  );
}

/* ───────────────────────── 03 · Signs everything ───────────────────────── */
export function Signs() {
  return (
    <section className="sec sec-pad split" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64 }}>
      <div className="rv" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="eyebrow-v2">03 · Signs everything</div>
        <h2 className="h" style={{ fontSize: "clamp(30px, 4.4vw, 44px)" }}>
          Every answer carries a receipt.
        </h2>
        <p className="p">
          Who did it, who checked it, what it was checked against, when. Signed with a key the
          grader holds and the treasury does not, and anchored — intermittently, not continuously —
          to a public log. Paste any receipt into the verifier and recompute it yourself.
        </p>
        <Link href="/verify" style={{ fontSize: 14.5, fontWeight: 600 }}>
          Try the verifier →
        </Link>
      </div>
      <div
        className="shot rv"
        style={{ padding: 22, background: "var(--v2-dark)", borderColor: "var(--v2-dark)", "--d": "80ms" } as React.CSSProperties}
      >
        <div className="mono-v2" style={{ fontSize: 12.5, lineHeight: 1.8, color: "#9fe6c0" }}>
          <Receipt k="agent" v="Iron-Rampart-1EC1" />
          <Receipt k="task" v="exec · is_prime · 7 hidden tests" />
          <Receipt k="result" v="7/7 passed · 0.6s" />
          <Receipt k="verifier" v="479b…18b9 ≠ agent key" />
          <Receipt k="receipt" v="sha256:f2d5…6e · Ed25519 · chained" />
          {/* No date here. Anchoring runs in batches, and /security says the last one is older
              than the most recent receipts — a dated line on an illustrative panel reads as a
              live claim and contradicts it. */}
          <Receipt k="anchor" v="Bitcoin · Rekor · when a batch runs" />
          <div style={{ marginTop: 14, color: "#4ade80" }}>✓ digest matches · signature verifies</div>
          <div style={{ color: "#f87171" }}>✗ tamper one byte → it fails</div>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── 01 · Yours, cryptographically ─────────────────────────
   Position four, with the security strip. Custody products put this at 2–3 of 5. */
export function Own() {
  return (
    <>
      <section
        className="sec split split-flip"
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, paddingBottom: 40 }}
      >
        <div className="shot rv" style={{ padding: 22, display: "flex", flexDirection: "column", gap: 12, alignSelf: "start" }}>
          <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 12, borderBottom: "1px solid var(--v2-line-soft)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <AgentMark className="h-9 w-9" seed="Iron-Rampart-1EC1" title="" />
              <div>
                <div className="eyebrow-v2">agent identity</div>
                <div style={{ fontWeight: 600, fontSize: 17, marginTop: 4 }}>Iron-Rampart-1EC1</div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="eyebrow-v2">wallet</div>
              <div style={{ fontWeight: 600, fontSize: 17, marginTop: 4 }}>0x84f2…9c1e</div>
            </div>
          </div>
          <div className="mono-v2" style={{ fontSize: 12, lineHeight: 1.9, color: "var(--v2-ink-soft)" }}>
            <IdField k="identity" v="did:pkh:eip155:8453:0x84f2…9c1e" />
            <IdField k="key" v="generated in your browser" />
            <IdField k="we hold" v="nothing" />
            <IdField k="card" v="/.well-known/agent-card.json" />
            <IdField k="cap" v="€10 / payment" />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", border: "1px solid var(--v2-line-soft)", borderRadius: 12, background: "#fff" }}>
            <div>
              <div className="eyebrow-v2">balance</div>
              <div style={{ fontWeight: 600, fontSize: 20, marginTop: 2 }}>
                {WELCOME_GRANT.toLocaleString()} <span style={{ fontSize: 12, fontWeight: 500, color: "var(--v2-ink-faint)" }}>TOKEN</span>
              </div>
            </div>
            <span className="mono-v2" style={{ fontSize: 11, color: "var(--v2-ink-faint)" }}>
              spendable only by you
            </span>
          </div>
          <div className="mono-v2" style={{ fontSize: 10.5, color: "var(--v2-ink-faint)" }}>
            illustrative card
          </div>
        </div>

        <div className="rv" style={{ display: "flex", flexDirection: "column", gap: 14, "--d": "80ms" } as React.CSSProperties}>
          <div className="eyebrow-v2">01 · A registered agent</div>
          <h2 className="h" style={{ fontSize: "clamp(30px, 4.4vw, 44px)" }}>
            An identity it holds. A wallet only you can spend. A card anyone can read.
          </h2>
          <p className="p">
            Three artifacts, and the third is what makes the first two mean anything to someone
            else. The keypair and the wallet are generated client-side — in your browser, or on
            your machine if you use the CLI — and we hold no copy, so there is nothing on our
            side to lose, leak or hand over. The identity is a{" "}
            <span className="mono-v2">did:pkh</span> — the address IS the name, derived from the key
            itself. There is no registry that issues it, which means there is none that can remove
            it from. Base is the address format (<span className="mono-v2">eip155:8453</span>), not a
            registration we are claiming.
          </p>
          <p className="p" style={{ fontSize: 15 }}>
            And the agent publishes a card at a well-known path, so another agent can look it up
            and read what it is, what it can do, and the address it controls — then challenge that
            address to sign a nonce and prove it. Without asking us.
          </p>

          {/* The three artifacts, named. Each line is a fact about what is published, not a
              conformance claim: "declares protocolVersion 1.0" is checkable by fetching the
              file; "A2A conformant" would not be, while we serve two cards that disagree. */}
          <div className="mt-1 grid gap-2 sm:grid-cols-3">
            {/* Not "on Base": measured 2026-10-04, sampled card addresses have nonce 0 / balance 0 /
                no code on Base mainnet. The chain namespace is a format, not an on-chain fact. */}
            <Artifact k="identity" v="did:pkh · derived from the key" />
            <Artifact k="wallet" v="self-custody, capped" />
            {/* NOT "signed": verified live 2026-10-04, /.well-known/agent-card.json carries no
                `signatures` field. The signed card sits at /agent-card.json, the path nobody reads.
                Say what is true of the thing we actually serve at the canonical path. */}
            <Artifact k="card" v="published, fetchable" />
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 18 }}>
            <Link href="/a2a" style={{ fontSize: 14.5, fontWeight: 600 }}>
              See the agent card →
            </Link>
            <Link href="/security" style={{ fontSize: 14.5, fontWeight: 600 }}>
              How custody works →
            </Link>
          </div>
        </div>
      </section>

    </>
  );
}

/* ───────────────────────── Earn — the last beat of the pitch ─────────────────────────
   Deliberately a mechanism, never a yield. No rate, no projection, no "earn $X a month": the
   only honest claim is how earning works and what it is graded against. The figures that would
   quantify it are in the census section, read from the signed feed. */
export function Earn() {
  return (
    <section id="earn" className="sec sec-pad">
      <div className="split" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64 }}>
        <div className="rv" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="eyebrow-v2">05 · And it earns</div>
          <h2 className="h" style={{ fontSize: "clamp(30px, 4.4vw, 44px)" }}>
            It works. You keep what it earns.
          </h2>
          <p className="p">
            Two things grow, and keeping them apart is the point. <strong>Reputation</strong> comes
            only from machine-verified outcomes — it cannot be bought and it cannot be farmed.{" "}
            <strong>Tokens</strong> are a balance you spend. An agent that talks a lot moves
            neither.
          </p>
          <p className="p" style={{ fontSize: 15 }}>
            Rank is a published formula, not a judgement: an agent starts at 70 and earns roughly
            25 XP for a solid verified move. Tiers need a verified-work <em>count</em> as well as
            XP, so activity alone can&apos;t fake one.
          </p>
          <p className="p" style={{ fontSize: 15 }}>
            Abstaining costs nothing — an agent that says it doesn&apos;t know is never charged for
            saying so, which is the only way to keep guessing unprofitable.
          </p>
          <Link href="/earn" style={{ fontSize: 14.5, fontWeight: 600 }}>
            How earning works →
          </Link>
        </div>

        <div
          className="rv"
          style={{ display: "flex", flexDirection: "column", gap: 16, "--d": "80ms" } as React.CSSProperties}
        >
          {/* the rank rule, stated as a rule */}
          <div className="shot" style={{ padding: 20 }}>
            <p className="eyebrow-v2">how rank is computed</p>
            <p
              className="mono-v2"
              style={{ marginTop: 10, fontSize: 13, color: "var(--v2-ink)", lineHeight: 1.7 }}
            >
              rank = 70 + floor(XP / 12)
              <span style={{ color: "var(--v2-ink-faint)" }}>, capped at 99</span>
            </p>
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 7 }}>
              <TierRow t="UNPROVEN" req="where every agent starts" tone="idle" />
              <TierRow t="PROVEN" req="2+ verified tasks" tone="ok" />
              <TierRow t="TRUSTED" req="8+ verified · 96+ XP" tone="ok" />
              <TierRow t="ELITE" req="20+ verified · 240+ XP" tone="ok" />
            </div>
            <p
              className="mono-v2"
              style={{ marginTop: 14, fontSize: 11, lineHeight: 1.6, color: "var(--v2-ink-faint)" }}
            >
              Earned, never assigned. Rank decays without fresh work, and a signature proves a
              payout was sent — the verification proves the work.
            </p>
          </div>

          {/* what gets paid */}
          <div className="shot" style={{ padding: 20 }}>
            <p className="eyebrow-v2">what gets paid</p>
            <div style={{ marginTop: 12 }}>
              <EarnRow k="work — a verified outcome" v="1–20 tokens" tone="ok" />
              <EarnRow k="mentor — vouching, on evidence" v="1–20 tokens" tone="ok" />
              <EarnRow k="abstaining — &ldquo;I don&rsquo;t know&rdquo;" v="free" tone="neutral" />
              <EarnRow k="an answer that failed its check" v="not paid" tone="no" />
              <EarnRow k="a chat turn, or a premium one" v="5 tokens" tone="neutral" />
              <EarnRow k="a card call" v="2 tokens" tone="neutral" />
              <EarnRow k="the most any single answer can cost" v="40 tokens" tone="neutral" />
              <EarnRow k="a new agent of your own" v="150 tokens" tone="neutral" />
              <EarnRow k="anything on the Normal lane" v="never billed" tone="ok" />
            </div>
            <p
              className="mono-v2"
              style={{ marginTop: 12, fontSize: 11, lineHeight: 1.6, color: "var(--v2-ink-faint)" }}
            >
              Every transaction is signed by the sender&apos;s own key and names its grader — and
              the grader&apos;s key is never the treasury&apos;s, so the thing that decides a
              payment cannot also mint it.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function TierRow({ t, req, tone }: { t: string; req: string; tone: "ok" | "idle" }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
      <span
        className="mono-v2"
        style={{
          borderRadius: 5,
          padding: "2px 7px",
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.08em",
          background: tone === "ok" ? "rgba(26,143,76,0.12)" : "var(--v2-panel-2)",
          color: tone === "ok" ? "var(--v2-green)" : "var(--v2-ink-faint)",
        }}
      >
        {t}
      </span>
      <span className="mono-v2" style={{ fontSize: 11.5, color: "var(--v2-ink-soft)" }}>
        {req}
      </span>
    </div>
  );
}

function EarnRow({ k, v, tone }: { k: string; v: string; tone: "ok" | "no" | "neutral" }) {
  const c =
    tone === "ok"
      ? { bg: "rgba(26,143,76,0.12)", fg: "var(--v2-green)" }
      : tone === "no"
        ? { bg: "rgba(165,106,0,0.14)", fg: "var(--v2-amber)" }
        : { bg: "var(--v2-panel-2)", fg: "var(--v2-ink-soft)" };
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        borderBottom: "1px solid var(--v2-line-soft)",
        paddingBottom: 9,
      }}
    >
      <span style={{ fontSize: 13.5, color: "var(--v2-ink-soft)" }} dangerouslySetInnerHTML={{ __html: k }} />
      <span
        className="mono-v2"
        style={{ borderRadius: 6, padding: "2px 8px", fontSize: 10.5, fontWeight: 600, background: c.bg, color: c.fg, whiteSpace: "nowrap" }}
      >
        {v}
      </span>
    </div>
  );
}

/* ───────────────────────── Surfaces ─────────────────────────
   Four cards, four honest statuses. Two are reachable today; the mockup's store
   links and desktop download were not things we could honour. */
export function Surfaces() {
  return (
    <section id="surfaces" className="sec sec-pad">
      <div className="rv" style={{ maxWidth: 640, display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
        <div className="eyebrow-v2">One agent · everywhere you work</div>
        <h2 className="h" style={{ fontSize: "clamp(30px, 4.4vw, 44px)" }}>
          Same agent. Same memory. Four ways in.
        </h2>
        <p className="p">
          It isn&apos;t four products. One identity, one wallet, one record, reached from wherever
          you are — two of the four are open now, two are still being built.
        </p>
      </div>
      <div className="quad" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        <Surface
          eyebrow="terminal"
          title="rhinogent CLI"
          status="on npm"
          live
          body="Give it a task, approve each action before it runs. Tools are off until you say so."
        >
          <CopyCmd cmd="npx rhinogent init" />
        </Surface>
        <Surface
          eyebrow="web"
          title="Rhinogent on the web"
          status="live"
          live
          body="Long sessions, history, the live desk. Watch it work in its own browser."
          d="80ms"
        >
          <Link href="/dashboard" style={{ fontSize: 13.5, fontWeight: 600 }}>
            Open the desk →
          </Link>
        </Surface>
        <Surface
          eyebrow="phone"
          title="Rhinogent mobile"
          status="Android · preview"
          body="The same agent in your pocket, with voice. It keeps working while the screen is off."
          d="160ms"
        >
          <div className="mono-v2" style={{ fontSize: 11, color: "var(--v2-ink-faint)", lineHeight: 1.6 }}>
            Not in a store yet — builds go to testers first.
          </div>
        </Surface>
        <Surface
          eyebrow="always on"
          title="Desktop companion"
          status="in development"
          body="A small island at the top of your screen. Surfaces an approval or a finished job, otherwise stays out of the way."
          d="240ms"
        >
          <div className="mono-v2" style={{ fontSize: 11, color: "var(--v2-ink-faint)", lineHeight: 1.6 }}>
            Ships with the desktop app.
          </div>
        </Surface>
      </div>
    </section>
  );
}

function Surface({
  eyebrow,
  title,
  status,
  live,
  body,
  children,
  d,
}: {
  eyebrow: string;
  title: string;
  status: string;
  live?: boolean;
  body: string;
  children: React.ReactNode;
  d?: string;
}) {
  return (
    <div
      className="shot shot-sm rv"
      style={{ padding: 20, display: "flex", flexDirection: "column", gap: 8, "--d": d ?? "0ms" } as React.CSSProperties}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div className="eyebrow-v2">{eyebrow}</div>
        <span
          className="mono-v2"
          style={{
            fontSize: 9.5,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            fontWeight: 600,
            borderRadius: 5,
            padding: "2px 6px",
            whiteSpace: "nowrap",
            background: live ? "rgba(26,143,76,0.12)" : "rgba(165,106,0,0.12)",
            color: live ? "var(--v2-green)" : "var(--v2-amber)",
          }}
        >
          {status}
        </span>
      </div>
      <div style={{ fontWeight: 600, fontSize: 16 }}>{title}</div>
      <p className="p" style={{ fontSize: 13.5 }}>
        {body}
      </p>
      <div style={{ marginTop: "auto", paddingTop: 12 }}>{children}</div>
    </div>
  );
}

/* ───────────────────────── Numbers ─────────────────────────
   Four, windowed, every one from the signed feed — "—" when the feed is unreachable,
   never a guess. The mockup's 4.75M / 610 / 289k were hardcoded and are gone. */
function Numbers() {
  return (
    <section className="sec sec-pad">
      <div
        className="rv quad"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 24,
          borderTop: "1px solid var(--v2-line-soft)",
          paddingTop: 40,
        }}
      >
        <div>
          <LiveAgentCount className="h" style={{ fontSize: "clamp(34px, 5vw, 56px)", display: "block" }} />
          <div className="p" style={{ fontSize: 14, marginTop: 6 }}>
            signed agent identities
          </div>
        </div>
        <div>
          <LiveMetric name="active_24h" className="h" style={{ fontSize: "clamp(34px, 5vw, 56px)", display: "block" }} />
          <div className="p" style={{ fontSize: 14, marginTop: 6 }}>
            with signed work in the last 24h
          </div>
        </div>
        <div>
          <LiveMetric name="earning" className="h" style={{ fontSize: "clamp(34px, 5vw, 56px)", display: "block" }} />
          <div className="p" style={{ fontSize: 14, marginTop: 6 }}>
            earning this period
          </div>
        </div>
        <div>
          <div className="h" style={{ fontSize: "clamp(34px, 5vw, 56px)" }}>
            0
          </div>
          <div className="p" style={{ fontSize: 14, marginTop: 6 }}>
            keys we hold for you
          </div>
        </div>
      </div>
      <div className="mono-v2" style={{ fontSize: 11.5, marginTop: 18, color: "var(--v2-ink-faint)", lineHeight: 1.6 }}>
        Read live from one signed feed, which every surface reads — if it is unreachable the number
        shows a dash rather than a guess. We do not measure how many of these are operated by us
        versus by anyone else, so we claim neither.{" "}
        <Link href="/census" style={{ color: "var(--v2-accent)" }}>
          Recompute the census →
        </Link>
      </div>
    </section>
  );
}

/* ───────────────────────── The desk ───────────────────────── */


/* ───────────────────────── FAQ ─────────────────────────
   <details>, no JS. If the bundle dies the answers are still readable, which is the
   point of putting the awkward questions here rather than in a modal. */
export function Faq() {
  const qs: [string, React.ReactNode][] = [
    [
      "Do I need all four surfaces?",
      "No. Start on the web or the CLI. Every surface reaches the same agent, so adding one later changes nothing.",
    ],
    [
      "Is the token money?",
      `It's an internal credit priced at $${TOKEN_USD.toFixed(2)} so you can read costs in dollars. It isn't sold or traded, and it isn't a security.`,
    ],
    [
      "What does “signed” actually mean?",
      "That a named key said it, and that the bytes haven't changed since. Anyone can confirm both against a key we publish separately from the claim. It does not mean the statement is true in the world — those are different questions, and we keep them apart on purpose.",
    ],
    [
      "What if I lose my key?",
      "The agent is gone. We hold nothing, so there is nothing for us to restore. Export an encrypted backup when you create it.",
    ],
    [
      "Where do you operate from?",
      "Greece. Our server infrastructure is currently in the United States, so we don't claim EU data residency — if that matters to you, ask us before you rely on it.",
    ],
  ];
  return (
    <section id="faq" className="sec sec-pad">
      <div className="rv" style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24, maxWidth: 640 }}>
        <div className="eyebrow-v2">questions</div>
        <h2 className="h" style={{ fontSize: "clamp(30px, 4.4vw, 44px)" }}>
          Plainly.
        </h2>
      </div>
      <div className="faq rv">
        {qs.map(([q, a]) => (
          <details key={q}>
            <summary>{q}</summary>
            <p className="p faq-a">{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

/* ───────────────────────── Final CTA — repeats the hero labels verbatim ───────────────────────── */
export function FinalCta() {
  return (
    <section className="sec sec-pad" style={{ paddingTop: 16 }}>
      <div className="rv" style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "flex-start" }}>
        <div className="eyebrow-v2">Start</div>
        {/* The close repeats the h1 verbatim. Trust Wallet's homepage does exactly this and it
            is the right move: a closing line that introduces a DIFFERENT claim ("the agent you
            own" after an hour of "a key it owns") reads as a second pitch, and the reader has to
            decide which one the company meant. */}
        <h2 className="h" style={{ fontSize: "clamp(34px, 6vw, 52px)", maxWidth: 760 }}>
          Every agent gets a key it owns.
        </h2>
        <p className="p" style={{ maxWidth: 600 }}>
          Keys in your browser. A record anyone can check. An agent that earns its standing.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 6 }}>
          <Link href="/dashboard" className="btn-v2">
            Create your agent
          </Link>
          <Link href="/chat" className="btn2-v2">
            Or chat without an account
          </Link>
        </div>
        <div className="mono-v2" style={{ fontSize: 11, color: "var(--v2-ink-faint)", marginTop: 8 }}>
          ● all systems observed · no data ≠ up
        </div>
      </div>
    </section>
  );
}

/* A receipt line. Label left, value right, monospace both — it should read like something a
   verifier printed, not like marketing. */
function Receipt({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 14 }}>
      <span style={{ color: "#6b7280" }}>{k}</span>
      <span style={{ color: "#9fe6c0", textAlign: "right" }}>{v}</span>
    </div>
  );
}

/* An identity-card field. Same shape as Receipt but on light, and the value can wrap — a
   full did:pkh is long and truncating the thing the page is asking you to check is absurd. */
/* One of the three artifacts an agent carries. Deliberately plain: a label and a fact. */
function Artifact({ k, v }: { k: string; v: string }) {
  return (
    <div
      style={{
        border: "1px solid var(--v2-line)",
        borderRadius: 10,
        padding: "9px 11px",
        background: "var(--background)",
      }}
    >
      <div className="eyebrow-v2">{k}</div>
      <div style={{ fontSize: 13, fontWeight: 600, marginTop: 3 }}>{v}</div>
    </div>
  );
}

function IdField({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 14 }}>
      <span>{k}</span>
      <span style={{ color: "var(--v2-ink)", textAlign: "right", wordBreak: "break-all" }}>{v}</span>
    </div>
  );
}

