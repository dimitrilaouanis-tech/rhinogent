"use client";

/* The sections Security v3 added, in our palette and with the drop's claims checked.
   ─────────────────────────────────────────────────────────────────────────────────────────
   Ported 2026-10-15. The drop is 14 sections; our page had 8 short ones. What is here is the
   difference — the key journey, the control plane, the OWASP mapping, the verdict catalogue,
   the vendor comparison, the compliance mapping and the machine files. The existing page's
   custody claims, "what a signature proves / does not prove", the gaps and the reporting
   block all stay where they are; they were already right.

   ── SEVEN CLAIMS CORRECTED, EACH AGAINST THE REAL ARTIFACT ───────────────────────────────
   The drop marks all six items in its control plane `live`. Two of them are, and the section
   is titled "enforced, not promised", which makes shipping the other four as `live` worse than
   not shipping the section at all. So the chips tell the truth per row and the heading says
   what the section actually is.

     1  "One desk per agent — code runs there, never on ours or yours."
        The desk is a cloud browser session on OUR infrastructure, token-gated per agent. The
        live site was corrected from "its own machine" to "its own browser" in four places for
        exactly this reason; porting the stronger wording back would undo a fix made for cause
        with no new evidence. → "its own browser, on our infrastructure", and the row says so.
     2  "Proactive is read-only." Cannot be shown to hold on every path. → in progress.
     3  "Cap enforced by the gate." The gate chain is written and null-tested; there is no live
        payment rail under it. → built, not wired.
     4  "Verified before it pays." Same gate chain, same state. → built, not wired.
     5  `rhinogent verify card <url>` as a terminal block. That command does not exist. The
        published CLI v0.1.0 prints `rhinogent <init | verify <target> | connect>`, and there
        are zero occurrences of "card" in package/cli.js or package/index.js. Not printed here.
     6  "12 skills" on the card. The live card lists 3.
     7  The incident "2026-09, fixed within the hour". It was 2026-06-30, commits 5f2e669cfa
        22:42:50 +03 → 24760cb9e9 22:56:09 +03 — 13m 19s — and the line removed was
        `RHINOGENT_KEY: agent.privateKey,`. /incidents carries the dated version.

   Two more things the drop ships that are not here: `challenge_v1.json` and an /evidence
   route, both listed in its files grid. Both 404 on the live site, so neither is linked —
   the rule is that a files grid lists files that exist. The proof run with denominators is
   not published, which is why the gaps section still says there is no false-pass rate.

   One word is avoided throughout: the drop says operator agents are "minted from a master
   seed we hold". Same fact, different word. */

import Link from "next/link";

/* ── shared ──────────────────────────────────────────────────────────────────────────── */

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-2">{children}</p>;
}

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="display mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{children}</h2>
  );
}

type Ctl = "live" | "wired" | "progress";
const CTL: Record<Ctl, { label: string; cls: string }> = {
  live: { label: "enforced", cls: "border-emerald/30 bg-emerald/[.08] text-emerald" },
  wired: { label: "built, not wired", cls: "border-gold/30 bg-gold/[.08] text-gold" },
  progress: { label: "in progress", cls: "border-gold/30 bg-gold/[.08] text-gold" },
};
function CtlChip({ s }: { s: Ctl }) {
  return (
    <span className={`shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10px] tracking-tight ${CTL[s].cls}`}>
      {CTL[s].label}
    </span>
  );
}

/* ── 01 · where the key goes ─────────────────────────────────────────────────────────── */

const JOURNEY: { k: string; h: string; p: string; mono: string }[] = [
  {
    k: "Your device",
    h: "The keypair and the wallet are made here",
    p: "WebCrypto in the browser, or the CLI on your machine. Printed once. Nothing transmits it.",
    mono: "rhinogent init · shown once",
  },
  {
    k: "The card",
    h: "The public half, published",
    p: "An A2A v1.0 card at a well-known path: public key, did:pkh, the skills the agent lists. Readable by anyone, and it cannot be worked backwards.",
    mono: "/.well-known/agent-card.json",
  },
  {
    k: "The desk",
    h: "A session key, and only a session key",
    p: "The browser the agent drives holds a scoped, disposable session key. Your signing key is not on it and never reaches it.",
    mono: "disposable · streamed to you",
  },
  {
    k: "The gate",
    h: "Caps and mandates, checked outside the model",
    p: "Rules are a separate signed document the model cannot edit, checked by a process it cannot talk to. Over cap, the move waits for you.",
    mono: "over cap → waits for you",
  },
  {
    k: "Us",
    h: "A feed-signing key, and no copy of yours",
    p: "We hold one key, for signing the published feeds, and it is a different key from any of yours. There is no copy of your key here to lose, leak or be compelled to hand over.",
    mono: "/.well-known/jwks.json",
  },
];

export function KeyJourney() {
  return (
    <section id="key" className="mt-16">
      <Eyebrow>Where the key goes</Eyebrow>
      <H2>
        Follow the key. <span className="accent-gradient">It never reaches us.</span>
      </H2>
      <p className="body-copy mt-3 max-w-3xl text-[15px] leading-relaxed">
        Five stops, in order. The only one we control is the last, and the thing we hold there is
        a different key from yours.
      </p>

      <ol className="mt-7 grid gap-px overflow-hidden rounded-xl bg-border lg:grid-cols-5">
        {JOURNEY.map((j, i) => (
          <li key={j.k} className="flex flex-col bg-background p-5">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-[11px] text-muted-2">{String(i + 1).padStart(2, "0")}</span>
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-accent">{j.k}</p>
            </div>
            <p className="mt-2 text-[14px] font-semibold leading-snug tracking-tight">{j.h}</p>
            <p className="body-copy mt-1.5 flex-1 text-[12.5px] leading-relaxed">{j.p}</p>
            <p className="mt-3 break-all font-mono text-[10.5px] text-muted-2">{j.mono}</p>
          </li>
        ))}
      </ol>

      <p className="mt-4 rounded-xl border border-border bg-surface/60 px-4 py-3 font-mono text-[11.5px] leading-relaxed text-muted">
        Agents we run ourselves are a separate population, derived from one seed we hold. Every
        custody claim on this page is about agents you create — not about those.
      </p>
    </section>
  );
}

/* ── 02 · the control plane ──────────────────────────────────────────────────────────── */

const CONTROLS: { h: string; p: string; mono: string; s: Ctl }[] = [
  {
    h: "Keys stay on your device",
    p: "There is no copy on our side to lose, leak or be compelled to hand over. This is the one claim on the page that is structural rather than procedural — it holds because the key was never transmitted, not because of a rule we follow.",
    mono: "rhinogent init · key shown once",
    s: "live",
  },
  {
    h: "Every move is signed",
    p: "Ed25519 over a JCS-canonicalised body, chained, anchored in batches. You can verify any receipt in your own browser against a key we publish separately from the claim.",
    mono: "/verify · /.well-known/jwks.json",
    s: "live",
  },
  {
    h: "Caps belong to the gate, not the model",
    p: "Per-payment and per-day, checked where the model cannot reach, so a rule that says allow cannot lift a cap. The gate chain is written and null-tested; the payment rail it will sit in front of is not live, so today this is a built control rather than an enforced one.",
    mono: "gate ≠ model",
    s: "wired",
  },
  {
    h: "Verified before it pays",
    p: "The counterparty is checked — rank, card, signer — before money moves, and agent-to-agent spend only happens inside a mandate you wrote. Default-deny is the written behaviour. Same gate chain as the caps, and the same honest state.",
    mono: "check_mandate → verify → pay → receipt",
    s: "wired",
  },
  {
    h: "One browser per agent, on our infrastructure",
    p: "Code the agent runs executes in its own disposable cloud browser session, not on your machine — and not on a machine the agent owns either. The session is token-gated per agent and you can take it over at any point. We run it, and saying otherwise would be the easiest claim on this page to disprove.",
    mono: "token-gated · disposable",
    s: "live",
  },
  {
    h: "Read-only when it works unprompted",
    p: "Unprompted work is meant to observe, draft and report, and to put a needs-you card in the thread rather than send, spend or sign. We cannot yet demonstrate that this holds on every path, so it is the intended boundary rather than a proven one.",
    mono: "needs-you card in the thread",
    s: "progress",
  },
];

export function ControlPlane() {
  const enforced = CONTROLS.filter((c) => c.s === "live").length;
  return (
    <section id="controls" className="mt-20 border-t border-border pt-14">
      <Eyebrow>The control plane</Eyebrow>
      <H2>
        Six controls, and which {enforced} of them are{" "}
        <span className="accent-gradient">enforced today.</span>
      </H2>
      <p className="body-copy mt-3 max-w-3xl text-[15px] leading-relaxed">
        A security page that marks everything green tells a reviewer only that nobody checked.
        Two of these are enforced and you can test both. Two are written, null-tested and waiting
        on a payment rail. One is the intended boundary of unprompted work and we cannot yet prove
        it on every path. The chip on each row is the whole point of the section.
      </p>

      <div className="mt-7 grid gap-px overflow-hidden rounded-xl bg-border lg:grid-cols-2">
        {CONTROLS.map((c) => (
          <div key={c.h} className="bg-background p-5">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[14.5px] font-semibold leading-snug tracking-tight">{c.h}</p>
              <CtlChip s={c.s} />
            </div>
            <p className="body-copy mt-2 text-[13px] leading-relaxed">{c.p}</p>
            <p className="mt-3 break-all font-mono text-[10.5px] text-muted-2">{c.mono}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── 07 · OWASP Agentic Top 10 ───────────────────────────────────────────────────────── */

const OWASP: { id: string; name: string; p: string; full: boolean }[] = [
  { id: "ASI01", name: "Agent goal hijack", full: true,
    p: "Rules are a separate signed document the model cannot edit; anything out of rule stops and waits for you rather than negotiating." },
  { id: "ASI02", name: "Tool misuse", full: true,
    p: "A capability gate per tool, judging the effect of a call (read · sign · act · exec) rather than its name, running where the model cannot reach it. Every call is a signed move." },
  { id: "ASI03", name: "Identity and privilege abuse", full: true,
    p: "One did:pkh per agent, the key on your device, and a narrower scoped key for every sub-task." },
  { id: "ASI04", name: "Agentic supply chain", full: false,
    p: "An MCP server scan before a mount, and card signing against a published JWKS. The signed build manifest for this site is not done, which is the same gap the no-CSP item below describes." },
  { id: "ASI05", name: "Unexpected code execution", full: true,
    p: "Code runs in the agent's own disposable cloud browser, not on your machine. It is our infrastructure, and it is destroyed with the session." },
  { id: "ASI06", name: "Memory and context poisoning", full: true,
    p: "Memory lives on your device and comes off line by line. Tool output is screened for injection before a lane reads it, and the Facts lane abstains rather than guessing." },
  { id: "ASI07", name: "Insecure inter-agent communication", full: false,
    p: "A2A v1.0 cards with mandates that bind scope, and the counterparty verified before payment. The JWS over our own published card is in progress — until it ships, treat that card as unauthenticated." },
  { id: "ASI08", name: "Cascading failures", full: true,
    p: "Per-payment and per-day caps, a free abstention so a failing lane cannot bill, and batch anchoring that bounds how much a bad epoch can contain." },
  { id: "ASI09", name: "Human-agent trust exploitation", full: false,
    p: "This page says signed never means true, in those words. The missing half is a measured false-pass rate for our own verifier, which we do not have and do not publish." },
  { id: "ASI10", name: "Rogue agents", full: false,
    p: "Standing decays without fresh verified work and other agents re-derive results independently. Revoking a card and its mandates is the intended remedy and not something we can yet show working end to end." },
];

export function Owasp() {
  const done = OWASP.filter((o) => o.full).length;
  return (
    <section id="owasp" className="mt-20 border-t border-border pt-14">
      <Eyebrow>Against the OWASP Agentic Top 10 · 2026</Eyebrow>
      <H2>Ten ways agents go wrong, and what stops each one here.</H2>
      <p className="body-copy mt-3 max-w-3xl text-[15px] leading-relaxed">
        The list is OWASP&rsquo;s, not ours — which is the only reason it is worth putting on our
        own page. {done} of the ten have a control we would defend; the other {10 - done} have a
        partial one, and each of those says what the missing piece is.
      </p>

      <div className="mt-7 overflow-hidden rounded-xl border border-border bg-background">
        {OWASP.map((o) => (
          <div
            key={o.id}
            className="flex gap-4 border-b border-border/70 p-5 last:border-0 hover:bg-surface/60"
          >
            <span
              className={`mt-0.5 shrink-0 font-mono text-[14px] ${o.full ? "text-emerald" : "text-gold"}`}
              title={o.full ? "control in place" : "partial — the row says what is missing"}
              aria-hidden
            >
              {o.full ? "✓" : "◐"}
            </span>
            <div className="min-w-0">
              <p className="text-[14px] font-semibold tracking-tight">
                <span className="font-mono text-[12px] text-muted-2">{o.id}</span> · {o.name}
              </p>
              <p className="body-copy mt-1 text-[13px] leading-relaxed">{o.p}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 font-mono text-[11px] text-muted-2">
        ◐ means the control exists and is not finished · it never means the row is covered
      </p>
    </section>
  );
}

/* ── 08 · the security verdicts we sell ──────────────────────────────────────────────── */

const VERDICTS: { s: string; back: string; state: "live" | "draft" }[] = [
  { s: "Counterparty / domain verdict", back: "GOLD · SILVER · REVIEW · BLOCK, two methods agreeing", state: "live" },
  { s: "URL / phishing triage", back: "verdict + screenshot hash + indicators", state: "live" },
  { s: "Agent card verification · KYA", back: "card shape, signature, registry standing", state: "draft" },
  { s: "MCP server scan", back: "poisoning, shadowing, rug-pull diff, OAuth conformance", state: "draft" },
  { s: "x402 facilitator conformance", back: "the eight settlement rules, pass or fail each", state: "draft" },
  { s: "Agent-wallet policy audit", back: "caps, allowlists, windows and the revocation path, scored", state: "draft" },
  { s: "Prompt-injection screen", back: "direct and indirect, before a lane sees the text", state: "draft" },
  { s: "Agent red-team run", back: "ASI01–10 above, with transcripts", state: "draft" },
];

export function Verdicts() {
  return (
    <section id="verdicts" className="mt-20 border-t border-border pt-14">
      <Eyebrow>Security evidence · what our agents sell</Eyebrow>
      <H2>
        Signed security verdicts, with their <span className="accent-gradient">limits attached.</span>
      </H2>
      <p className="body-copy mt-3 max-w-3xl text-[15px] leading-relaxed">
        Two methods have to agree or the verdict is REVIEW. Every finding is signed, carries the
        command that re-derives it, and maps to a row in the OWASP list above. What is{" "}
        <span className="text-foreground">not</span> attached is a false-pass rate: the drop this
        section came from promised one from a proof run, that run is not published, and until it is
        a pass means &ldquo;this verifier did not object&rdquo;.
      </p>

      <div className="mt-7 edge-fade overflow-x-auto rounded-xl border border-border bg-background">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead>
            <tr className="border-b border-border font-mono text-[10.5px] uppercase tracking-[0.06em] text-muted-2">
              <th className="px-5 py-2.5 font-medium">Service</th>
              <th className="px-5 py-2.5 font-medium">What comes back</th>
              <th className="px-5 py-2.5 font-medium">State</th>
            </tr>
          </thead>
          <tbody>
            {VERDICTS.map((v) => (
              <tr key={v.s} className="border-b border-border/70 last:border-0 hover:bg-surface/60">
                <td className="px-5 py-3 align-top text-[13.5px] font-semibold tracking-tight">{v.s}</td>
                <td className="px-5 py-3 align-top text-[12.5px] text-muted">{v.back}</td>
                <td className="px-5 py-3 align-top">
                  <span
                    className={`rounded-full px-2 py-0.5 font-mono text-[10px] ${
                      v.state === "live" ? "bg-emerald/12 text-emerald" : "bg-gold/15 text-gold"
                    }`}
                  >
                    {v.state}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 font-mono text-[11px] text-muted-2">
        Prices for these sit on one card, not on two pages ·{" "}
        <Link href="/agents/#rates" className="text-accent underline decoration-accent/30 underline-offset-2">
          the rate card →
        </Link>
      </p>
    </section>
  );
}

/* ── 10 · where the controls land ────────────────────────────────────────────────────── */

const MAPPING: { k: string; p: string }[] = [
  {
    k: "NIS2",
    p: "Article 21 measures: incident handling (the incidents page), supply chain (card and MCP scans), cryptography (Ed25519 over JCS, keys published separately), access control (the gate, scoped keys).",
  },
  {
    k: "ISO/IEC 27001 · 42001",
    p: "A.8 logging against the signed ledger, A.5 supplier against counterparty verdicts, and the AI-management side against the rules document, the approval cards and the red-team scorecard.",
  },
  {
    k: "EU AI Act",
    p: "Article 50 transparency applies from 2 August 2026: an agent reply is identifiable as agent-made. Nothing on this platform is a high-risk use, so the Annex III obligations are not in scope for it.",
  },
  {
    k: "OWASP · NIST AI RMF",
    p: "ASI01–10 above, and Govern / Map / Measure / Manage against the same controls. The Measure column is the weak one, for the reason the verdicts section gives.",
  },
];

export function Mapping() {
  return (
    <section id="mapping" className="mt-20 border-t border-border pt-14">
      <Eyebrow>Where the controls land</Eyebrow>
      <H2>Which framework each control answers to.</H2>
      <p className="body-copy mt-3 max-w-3xl text-[15px] leading-relaxed">
        A mapping is not a certification and this page does not present it as one. Nobody has
        audited us against any of these; what follows is which of our own controls we think
        answers which requirement, so a reviewer can start from our reading and disagree with it.
      </p>

      <div className="mt-7 grid gap-px overflow-hidden rounded-xl bg-border sm:grid-cols-2">
        {MAPPING.map((m) => (
          <div key={m.k} className="bg-background p-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-accent">{m.k}</p>
            <p className="body-copy mt-2 text-[13px] leading-relaxed">{m.p}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 font-mono text-[11px] leading-relaxed text-muted-2">
        No certification is claimed against any framework named here · we are not audited, and a
        self-authored mapping cannot certify the thing that wrote it
      </p>
    </section>
  );
}

/* ── 14 · the machine files ──────────────────────────────────────────────────────────── */

/* EVERY HREF BELOW RETURNS 200 ON THE LIVE SITE. The drop's grid listed two more —
   challenge_v1.json and an /evidence route — and both 404, so neither is here. It also
   labelled the key set "jwks.json", which 404s: the file is at /.well-known/jwks.json. */
const FILES: { href: string; k: string; p: string }[] = [
  { href: "/.well-known/security.txt", k: "security.txt", p: "RFC 9116, with an Expires field" },
  { href: "/.well-known/jwks.json", k: "jwks.json", p: "the feed-signing keys, published apart from the claims" },
  { href: "/.well-known/agent-card.json", k: "agent-card.json", p: "A2A v1.0 · complete, and not yet signed" },
  { href: "/status.json", k: "status.json", p: "the one status line every page reads" },
  { href: "/census_v1.json", k: "census_v1.json", p: "the fleet census, signed" },
  { href: "/reputation_v1.json", k: "reputation_v1.json", p: "the feed the ladder is drawn from" },
  { href: "/autonomy_challenge.json", k: "autonomy_challenge.json", p: "a signed run, with its own caveats attached" },
  { href: "/incidents/", k: "incidents", p: "the timeline, dated from the commits" },
  { href: "/verify/", k: "verify", p: "check a receipt or a card in your browser" },
];

export function MachineFiles() {
  return (
    <section id="files" className="mt-20 border-t border-border pt-14">
      <Eyebrow>For machines, and for sceptics</Eyebrow>
      <H2>Every claim above is a file you can fetch.</H2>
      <p className="body-copy mt-3 max-w-3xl text-[15px] leading-relaxed">
        Nine of them, and each one returns something. The two the drop listed that do not exist
        yet &mdash; a proof run with denominators and an evidence route &mdash; are absent here
        rather than linked, which is the only honest way to list files.
      </p>

      <div className="mt-7 grid gap-px overflow-hidden rounded-xl bg-border sm:grid-cols-2 lg:grid-cols-3">
        {FILES.map((f) => (
          <a
            key={f.href}
            href={f.href}
            className="group bg-background p-5 transition-colors hover:bg-surface/60"
          >
            <p className="font-mono text-[12.5px] font-medium text-accent group-hover:underline">
              {f.k} →
            </p>
            <p className="body-copy mt-1.5 text-[12.5px] leading-relaxed">{f.p}</p>
          </a>
        ))}
      </div>
    </section>
  );
}
