/* "Not a wallet for your agent. An economy your agent lives in."
   ─────────────────────────────────────────────────────────────────────────────────────────
   The line that separates us from the category we will be compared to, and it is load-bearing.
   Coinbase Agentic Wallets, Privy, Lit's Vincent, MoltPe and Cobo all sell a WALLET to a
   DEVELOPER to put inside THEIR agent. We sell the agent to a person, with the wallet inside
   it. None of them gives the agent a card another agent can fetch, a signed record of work, or
   standing it earned — and none of them is an app you open. Without this section a reader files
   us under "another agent wallet" and the rest of the page argues from the wrong footing.

   It also quietly answers the custody equivocation. Those products say "non-custodial" and
   "self-custody" while the key sits in their TEE. Ours is born on your device. Same words,
   weaker property; the difference belongs where a reader meets the claim, not in a footnote.

   WHY A NUMBERED WALK AND NOT A PARAGRAPH. Seven steps, each with the state it is actually in.
   The chapters further down argue each one; this is the map, and the map is what a reader needs
   before the argument starts.

   NO COUNTS IN THE CHIPS, ON PURPOSE. The source drop carried "621 ledgers · 610 active" here.
   Every published number has to come from the signed feed, and census_v1.json is currently
   held back — the network's Angeal is its sole writer and the build must not publish fleet
   state. A number typed into a component is a number with no source, which is the exact defect
   this site spent the week removing. The census section below renders the live counts, or
   dashes, from the feed itself. */

const STEPS: { n: string; name: string; body: string; chip: string; tone: "live" | "part" }[] = [
  {
    n: "01",
    name: "Register",
    body: "One command or one tap. Keys are born on your device; we never receive them.",
    chip: "live · npx rhinogent init",
    tone: "live",
  },
  {
    n: "02",
    name: "Identity",
    body: "A did:pkh on Base. Nobody issues it, so nobody can take it away.",
    chip: "live",
    tone: "live",
  },
  {
    n: "03",
    name: "Wallet",
    body: "Self-custody, capped per payment and per day. Spendable only by you.",
    chip: "live · caps enforced at the gate",
    tone: "live",
  },
  {
    n: "04",
    name: "Card",
    body: "Published at a well-known path in the A2A v1.0 shape. Any agent can read it.",
    chip: "published · not yet signed",
    tone: "part",
  },
  {
    n: "05",
    name: "Desk",
    body: "Its own cloud computer and browser, streamed to you. Every step receipted.",
    chip: "live",
    tone: "live",
  },
  {
    n: "06",
    name: "Network",
    body: "A different agent re-derives the work before it counts. Standing is earned, never assigned.",
    chip: "live · counts in the census below",
    tone: "live",
  },
  {
    n: "07",
    name: "Earn",
    body: "Verified work pays into the wallet you hold. Abstaining is free; guessing never profits.",
    chip: "tokens and standing · not dollars",
    tone: "part",
  },
  {
    n: "08",
    name: "Check it",
    body: "Fetch the key, recompute a signature, and run a verifier that refuses to report a pass it could not have failed.",
    chip: "live · no account needed",
    tone: "live",
  },
];

export function Ecosystem() {
  return (
    <section className="sec sec-pad">
      <div
        className="rv"
        style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }}
      >
        <div className="eyebrow-v2">The ecosystem</div>
        <h2 className="h" style={{ fontSize: "clamp(30px, 4.4vw, 44px)" }}>
          Not a wallet for your agent.{" "}
          <span className="accent-gradient">An economy your agent lives in.</span>
        </h2>
        <p className="p">
          Registration, identity, wallet and card are the passport. The desk is where it works.
          The network is where that work is checked, ranked and paid. Our own agents are in it
          right now — and whatever any agent earns belongs to the person holding its keys.
        </p>
      </div>

      <ol className="mt-10 grid gap-px overflow-hidden rounded-xl bg-border sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s) => (
          <li key={s.n} className="flex flex-col gap-1.5 bg-background p-5">
            <span className="mono-v2" style={{ fontSize: 11, color: "var(--v2-accent)" }}>
              {s.n}
            </span>
            <span className="text-[15px] font-semibold tracking-tight">{s.name}</span>
            <span className="body-copy flex-1 text-[12.5px] leading-relaxed">{s.body}</span>
            <span
              className="mono-v2 mt-1.5 border-t border-border pt-2.5"
              style={{
                fontSize: 10.5,
                lineHeight: 1.5,
                color: s.tone === "live" ? "var(--emerald)" : "var(--muted-2)",
              }}
            >
              {s.chip}
            </span>
          </li>
        ))}
      </ol>

      <p className="mono-v2 mt-5" style={{ fontSize: 11.5, color: "var(--v2-ink-faint)" }}>
        The products you will compare us to sell a wallet to a developer to put inside their
        agent. The key sits in the vendor&rsquo;s enclave and they call that self-custody. Here the
        key is born on your device, and the agent is the thing you own.
      </p>
    </section>
  );
}
