import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Seal } from "@/components/seal";

export default function Home() {
  return (
    <>
      <Nav />
      <main className="flex-1">
        <Hero />
        <LogoStrip />
        <HowItWorks />
        <Features />
        <Trust />
        <CTA />
      </main>
      <Footer />
    </>
  );
}

/* ───────────────────────── Hero ───────────────────────── */
function Hero() {
  return (
    <section className="relative overflow-hidden bg-aura">
      <div className="absolute inset-0 grid-fade" aria-hidden />
      <div className="relative mx-auto max-w-6xl px-5 pb-24 pt-20 sm:pt-28">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="animate-rise inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1 text-xs text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald" />
              Self-custody · keys never leave the agent
            </div>

            <h1 className="animate-rise delay-1 mt-6 text-balance text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
              <span className="text-gradient">The identity wallet</span>
              <br />
              <span className="text-gradient">for </span>
              <span className="gold-gradient">agents.</span>
            </h1>

            <p className="animate-rise delay-2 mt-6 max-w-lg text-lg leading-relaxed text-muted">
              Every AI agent gets a cryptographic identity, a Base wallet it
              alone controls, and signed proof of who it is — so it can transact
              on the agentic web and anyone can verify it. Like a signet ring:
              the seal <em>is</em> the authority.
            </p>

            <div className="animate-rise delay-3 mt-9 flex flex-col gap-3 sm:flex-row">
              <a
                href="#get-started"
                className="rounded-xl bg-foreground px-6 py-3 text-center text-sm font-semibold text-background transition-opacity hover:opacity-90"
              >
                Give your agent an identity
              </a>
              <a
                href="#how"
                className="rounded-xl border border-border bg-surface/50 px-6 py-3 text-center text-sm font-medium text-foreground transition-colors hover:border-muted-2"
              >
                See how it works
              </a>
            </div>

            <p className="animate-rise delay-4 mt-6 font-mono text-xs text-muted-2">
              $ npm i @0n1x/signet · one import, one identity
            </p>
          </div>

          <SealCard />
        </div>
      </div>
    </section>
  );
}

/* Floating identity card — the visual anchor */
function SealCard() {
  return (
    <div className="animate-rise delay-3 relative mx-auto w-full max-w-sm">
      <div className="animate-seal rounded-2xl border border-border bg-gradient-to-b from-surface-2 to-surface p-6 shadow-2xl shadow-black/50">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-2">
              Rhino Signet identity
            </p>
            <p className="mt-1 text-lg font-semibold tracking-tight">
              Keen-Beacon-4AEF
            </p>
          </div>
          <Seal className="h-12 w-12" glow />
        </div>

        <dl className="mt-7 space-y-3 font-mono text-[13px]">
          <Row k="did" v="did:pkh:eip155:8453:0x…4AEF" />
          <Row k="wallet" v="0x4Af2…9c1B · Base" />
          <Row k="credential">
            <span className="rounded-md bg-emerald/15 px-2 py-0.5 text-emerald">
              VERIFIED
            </span>
          </Row>
          <Row k="signed by">
            <span className="text-gold">0n1x ✓</span>
          </Row>
        </dl>

        <div className="mt-7 border-t border-border pt-4">
          <p className="text-[11px] leading-relaxed text-muted-2">
            Ed25519 self-custody · signature verified on-device · spend mandate
            attached
          </p>
        </div>
      </div>
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

/* ───────────────────────── Logo strip ───────────────────────── */
function LogoStrip() {
  const items = ["Base", "x402", "ERC-8004", "A2A", "AP2", "did:pkh"];
  return (
    <div className="border-y border-border/60 bg-surface/30">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-5 py-6">
        <span className="text-xs uppercase tracking-widest text-muted-2">
          Built on open standards
        </span>
        {items.map((i) => (
          <span key={i} className="font-mono text-sm text-muted">
            {i}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ───────────────────────── How it works ───────────────────────── */
function HowItWorks() {
  const steps = [
    {
      n: "01",
      t: "Mint on-device",
      d: "The SDK generates an Ed25519 keypair and a Base wallet inside the agent's own runtime. The keys are never transmitted, never stored by us.",
    },
    {
      n: "02",
      t: "Get signed",
      d: "0n1x issues a signed identity card binding the agent's key, callsign, and did:pkh — verifiable by anyone, owned only by the agent.",
    },
    {
      n: "03",
      t: "Transact & be verified",
      d: "The agent pays over x402 and presents its seal. Counterparties verify the signature before they trust or transact. The seal is the proof.",
    },
  ];
  return (
    <section id="how" className="mx-auto max-w-6xl px-5 py-24">
      <SectionHead
        eyebrow="How it works"
        title="An identity your agent owns — not one we hold."
        sub="Three steps. No custody. The whole point is that we can't be the single point of failure."
      />
      <div className="mt-14 grid gap-5 md:grid-cols-3">
        {steps.map((s) => (
          <div
            key={s.n}
            className="group rounded-2xl border border-border bg-surface/40 p-7 transition-colors hover:border-muted-2"
          >
            <span className="font-mono text-sm text-gold">{s.n}</span>
            <h3 className="mt-4 text-lg font-semibold tracking-tight">{s.t}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{s.d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ───────────────────────── Features ───────────────────────── */
function Features() {
  const feats = [
    {
      t: "Self-custody by design",
      d: "Keys are generated and held on the agent's runtime. We never see them — so we can't lose, leak, or freeze them.",
    },
    {
      t: "Signed, verifiable identity",
      d: "Every agent carries an Ed25519 seal anyone can check. No central database to trust, no hollow 'verified' badge.",
    },
    {
      t: "A Base wallet, built in",
      d: "Fund it, watch it, and let the agent pay over x402 — all from one identity. USDC on Base, settlement-native.",
    },
    {
      t: "Spend mandates",
      d: "Author a signed spend cap and allowlist the agent adopts. Authority stays scoped — the agent enforces its own limits.",
    },
    {
      t: "Owner dashboard",
      d: "See every agent you run: balance, signed activity, credential, and mandate posture — in one neutral view.",
    },
    {
      t: "Open standards, no lock-in",
      d: "did:pkh, A2A cards, ERC-8004, x402. Your agent's identity is portable and yours to take anywhere.",
    },
  ];
  return (
    <section id="features" className="border-y border-border/60 bg-surface/20">
      <div className="mx-auto max-w-6xl px-5 py-24">
        <SectionHead
          eyebrow="Features"
          title="MetaMask gave people self-custody. Rhino Signet gives it to agents."
          sub="Everything an autonomous agent needs to hold an identity, hold funds, and prove both."
        />
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {feats.map((f) => (
            <div
              key={f.t}
              className="rounded-2xl border border-border bg-background/40 p-7"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface">
                <Seal className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-base font-semibold tracking-tight">
                {f.t}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{f.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── Trust ───────────────────────── */
function Trust() {
  return (
    <section id="trust" className="mx-auto max-w-6xl px-5 py-24">
      <div className="rounded-3xl border border-border bg-gradient-to-b from-surface-2/60 to-surface/30 p-10 sm:p-14">
        <div className="max-w-2xl">
          <p className="text-xs uppercase tracking-widest text-gold">
            The trust model
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            We sign the one thing that stays scarce: the truth.
          </h2>
          <p className="mt-5 text-base leading-relaxed text-muted">
            Rhino Signet is deliberately not a custodian. Because we never hold your
            agent&apos;s keys, there is nothing to seize, hack, or play
            favorites with. Our only job is to issue and verify signed proof —
            neutrally, for every agent. That neutrality is the moat.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-muted-2">
            Honest by design: the dashboard gives you visibility, mandate
            authoring, and verification — it does not pretend to remote-control
            an agent it cannot custody.
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          <Stat k="0" label="Keys we custody" />
          <Stat k="Ed25519" label="Signature on every identity" />
          <Stat k="100%" label="Verifiable, on-device" />
        </div>
      </div>
    </section>
  );
}

function Stat({ k, label }: { k: string; label: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background/40 p-6">
      <p className="gold-gradient font-mono text-2xl font-semibold">{k}</p>
      <p className="mt-1 text-sm text-muted">{label}</p>
    </div>
  );
}

/* ───────────────────────── CTA ───────────────────────── */
function CTA() {
  return (
    <section
      id="get-started"
      className="relative overflow-hidden border-t border-border/60 bg-aura"
    >
      <div className="absolute inset-0 grid-fade" aria-hidden />
      <div className="relative mx-auto max-w-3xl px-5 py-28 text-center">
        <Seal className="mx-auto h-14 w-14" glow />
        <h2 className="mt-7 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
          <span className="text-gradient">Give your agent a seal.</span>
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-lg text-muted">
          Open the dashboard, connect an agent, and watch its identity, balance,
          and signed activity come to life. Powered by 0n1x.
        </p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href="#"
            className="rounded-xl bg-foreground px-7 py-3.5 text-sm font-semibold text-background transition-opacity hover:opacity-90"
          >
            Open the dashboard
          </a>
          <a
            href="#docs"
            className="rounded-xl border border-border bg-surface/50 px-7 py-3.5 text-sm font-medium text-foreground transition-colors hover:border-muted-2"
          >
            Read the docs
          </a>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── shared ───────────────────────── */
function SectionHead({
  eyebrow,
  title,
  sub,
}: {
  eyebrow: string;
  title: string;
  sub: string;
}) {
  return (
    <div className="max-w-2xl">
      <p className="text-xs uppercase tracking-widest text-gold">{eyebrow}</p>
      <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
        {title}
      </h2>
      <p className="mt-4 text-base leading-relaxed text-muted">{sub}</p>
    </div>
  );
}
