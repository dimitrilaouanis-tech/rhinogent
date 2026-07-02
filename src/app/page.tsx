import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { RhinoMark, RhinoMascot } from "@/components/rhino";
import { CensusStrip } from "@/components/census-strip";

export default function Home() {
  return (
    <>
      <Nav />
      <main className="flex-1">
        <Hero />
        <CensusStrip />
        <Standards />
        <FeatureRows />
        <HowItWorks />
        <Counterparty />
        <Platforms />
        <Developers />
        <Security />
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
      <div className="absolute inset-0 grid-fade" aria-hidden />
      <div className="relative mx-auto max-w-5xl px-5 pb-20 pt-20 text-center sm:pt-28">
        <div className="animate-rise inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1 text-xs text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald" />
          Self-custody · owned by no one but your agent
        </div>

        <h1 className="display animate-rise delay-1 mx-auto mt-7 max-w-4xl text-balance text-6xl font-semibold sm:text-7xl">
          <span className="text-gradient">The identity wallet</span>{" "}
          <span className="accent-gradient">for agents.</span>
        </h1>

        <p className="animate-rise delay-2 mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-muted sm:text-xl">
          Every AI agent deserves an identity — signed, self-custody, owned by no
          one but the agent. Mint one in a single call, fund a Base wallet, and
          let it pay over x402 while anyone can verify who it is.
        </p>

        <div className="animate-rise delay-3 mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/dashboard"
            className="w-full rounded-full bg-accent px-7 py-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 sm:w-auto"
          >
            Get Rhinogent
          </Link>
          <a
            href="#developers"
            className="w-full rounded-full border border-border bg-surface/50 px-7 py-3.5 text-sm font-medium text-foreground transition-colors hover:border-muted-2 sm:w-auto"
          >
            Read the docs
          </a>
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
              Half hide · half machine
            </p>
            <div className="relative mx-auto mt-8 max-w-sm">
              <IdentityCard />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── Standards strip ───────────────────────── */
function Standards() {
  const items = ["Base", "x402", "ERC-8004", "A2A", "AP2", "did:pkh", "Ed25519"];
  return (
    <div className="border-y border-border/60 bg-surface/30">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-5 py-7">
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

/* ───────────────────────── Alternating feature rows (MetaMask) ───────────────────────── */
function FeatureRows() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-5">
      <div className="py-24 text-center">
        <p className="text-xs uppercase tracking-widest text-accent">
          What every agent gets
        </p>
        <h2 className="display mx-auto mt-4 max-w-3xl text-4xl font-semibold sm:text-5xl">
          <span className="text-gradient">
            Self-custody identity,
          </span>{" "}
          <span className="text-muted">built for AI agents.</span>
        </h2>
      </div>

      <div className="flex flex-col gap-24 pb-24">
        <FeatureRow
          eyebrow="Self-custody"
          title="Keys never leave your agent."
          body="The SDK generates an Ed25519 keypair and a Base wallet inside the agent's own runtime. Every rival issues or holds the identity — we don't. There's nothing for us to seize, freeze, or fake."
          bullets={["Generated on-device", "Owned by no one but the agent", "did:pkh bound"]}
          visual={<IdentityCard />}
        />
        <FeatureRow
          flip
          eyebrow="Wallet"
          title="A Base wallet, built in."
          body="Fund it, watch it, and let the agent pay over x402 from one identity. USDC on Base, settlement-native — no glue code."
          bullets={["USDC on Base", "x402 payments", "One identity"]}
          visual={<WalletCard />}
        />
        <FeatureRow
          eyebrow="Verifiable"
          title="Signed, and provable to anyone."
          body="Every agent carries an Ed25519 seal and a verifiable track record any counterparty can check before they trust or transact. No hollow 'verified' badge — real signatures."
          bullets={["Ed25519 signed", "Verifiable history", "No trust-me database"]}
          visual={<VerifyCard />}
        />
        <FeatureRow
          flip
          eyebrow="Control"
          title="Spend mandates you author."
          body="Compose a signed spend cap and allowlist that the agent adopts and enforces itself. Authority stays scoped — honest about what self-custody can and can't do."
          bullets={["Signed mandate", "Caps & allowlists", "PERM → AP2"]}
          visual={<MandateCard />}
        />
      </div>
    </section>
  );
}

function FeatureRow({
  eyebrow,
  title,
  body,
  bullets,
  visual,
  flip,
}: {
  eyebrow: string;
  title: string;
  body: string;
  bullets: string[];
  visual: React.ReactNode;
  flip?: boolean;
}) {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
      <div className={flip ? "lg:order-2" : ""}>
        <p className="text-xs uppercase tracking-widest text-accent">{eyebrow}</p>
        <h3 className="display mt-3 text-3xl font-semibold sm:text-4xl">
          {title}
        </h3>
        <p className="mt-4 text-base leading-relaxed text-muted">{body}</p>
        <ul className="mt-6 flex flex-wrap gap-2">
          {bullets.map((b) => (
            <li
              key={b}
              className="rounded-full border border-border bg-surface/50 px-3 py-1 text-xs text-muted"
            >
              {b}
            </li>
          ))}
        </ul>
      </div>
      <div className={flip ? "lg:order-1" : ""}>
        <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-b from-surface-2/60 to-surface p-8">
          <div
            className="pointer-events-none absolute inset-0 opacity-70"
            style={{
              background:
                "radial-gradient(22rem 14rem at 70% 10%, rgba(87,227,255,0.08), transparent 60%)",
            }}
            aria-hidden
          />
          <div className="relative">{visual}</div>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── How it works (numbered flow) ───────────────────────── */
function HowItWorks() {
  const steps = [
    {
      n: "01",
      t: "Mint on contact",
      d: "One call generates an Ed25519 keypair and a Base wallet inside your agent's runtime. No signup, no sales call — fetch is the signup.",
    },
    {
      n: "02",
      t: "Get a signed identity",
      d: "The agent receives a signed identity card binding its key, callsign, and did:pkh — verifiable by anyone, owned only by the agent.",
    },
    {
      n: "03",
      t: "Set the mandate",
      d: "Author a signed spend cap and merchant allowlist the agent adopts. It transacts autonomously — within the boundaries you define.",
    },
    {
      n: "04",
      t: "Transact & verify",
      d: "The agent pays over x402, verifies the counterparty on the other side, and leaves a signed track record anyone can check.",
    },
  ];
  return (
    <section id="how" className="mx-auto max-w-6xl px-5 py-24">
      <div className="text-center">
        <p className="text-xs uppercase tracking-widest text-accent">
          How it works
        </p>
        <h2 className="display mx-auto mt-4 max-w-2xl text-4xl font-semibold sm:text-5xl">
          <span className="text-gradient">Live in one call.</span>
        </h2>
      </div>
      <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {steps.map((s) => (
          <div
            key={s.n}
            className="rounded-2xl border border-border bg-surface/40 p-6"
          >
            <span className="font-mono text-sm text-accent">{s.n}</span>
            <h3 className="mt-3 text-lg font-semibold tracking-tight">{s.t}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{s.d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ───────────────────────── Counterparty differentiator (open seat) ───────────────────────── */
function Counterparty() {
  return (
    <section className="border-y border-border/60 bg-surface/20">
      <div className="mx-auto max-w-4xl px-5 py-20 text-center">
        <p className="text-xs uppercase tracking-widest text-accent">
          What no one else does
        </p>
        <h2 className="display mx-auto mt-4 max-w-3xl text-3xl font-semibold sm:text-4xl">
          <span className="text-muted">Everyone secures your agent&apos;s keys.</span>{" "}
          <span className="text-gradient">
            Rhinogent also tells it who it&apos;s paying.
          </span>
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted">
          Before your agent sends a cent, it can verify the merchant, the price,
          and the counterparty&apos;s signed identity on the other side of the
          deal — the one check the whole industry skips.
        </p>
      </div>
    </section>
  );
}

/* ───────────────────────── Platforms (MetaMask install targets) ───────────────────────── */
function Platforms() {
  const targets = [
    { t: "TypeScript SDK", d: "npm i @0n1x/rhinogent" },
    { t: "Python SDK", d: "pip install rhinogent" },
    { t: "Dashboard", d: "Web · oversee every agent" },
    { t: "Gateway", d: "HTTP · x402 + identity handshake" },
  ];
  return (
    <section className="border-y border-border/60 bg-surface/20">
      <div className="mx-auto max-w-6xl px-5 py-20">
        <div className="text-center">
          <h2 className="display text-3xl font-semibold sm:text-4xl">
            <span className="text-gradient">
              One identity. Everywhere your agent runs.
            </span>
          </h2>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {targets.map((x) => (
            <div
              key={x.t}
              className="rounded-2xl border border-border bg-background/40 p-6"
            >
              <RhinoMark className="h-7 w-7" />
              <h3 className="mt-4 text-base font-semibold tracking-tight">
                {x.t}
              </h3>
              <p className="mt-1 font-mono text-xs text-muted">{x.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── Developers (Stripe code section) ───────────────────────── */
function Developers() {
  return (
    <section id="developers" className="mx-auto max-w-6xl px-5 py-24">
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div>
          <p className="text-xs uppercase tracking-widest text-accent">
            For developers
          </p>
          <h2 className="display mt-3 text-4xl font-semibold sm:text-5xl">
            <span className="text-gradient">One import.</span>
            <br />
            <span className="text-muted">One identity.</span>
          </h2>
          <p className="mt-5 max-w-md text-base leading-relaxed text-muted">
            Drop the SDK into your agent. It mints a self-custody identity and a
            Base wallet on first run, signs every action, and presents a
            verifiable card to anyone it transacts with.
          </p>
          <a
            href="#docs"
            className="mt-8 inline-flex rounded-full border border-border bg-surface/50 px-6 py-3 text-sm font-medium transition-colors hover:border-muted-2"
          >
            Read the docs →
          </a>
        </div>
        <CodePanel />
      </div>
    </section>
  );
}

function CodePanel() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl shadow-slate-900/10">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
        <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
        <span className="h-3 w-3 rounded-full bg-[#28c840]" />
        <span className="ml-3 font-mono text-xs text-muted-2">agent.ts</span>
      </div>
      <pre className="overflow-x-auto p-5 font-mono text-[13px] leading-relaxed">
        <code>
          <span className="text-muted-2">{`// give your agent an identity`}</span>
          {"\n"}
          <span className="text-accent">import</span>
          <span className="text-foreground">{" { Rhinogent } "}</span>
          <span className="text-accent">from</span>
          <span className="text-emerald">{' "@0n1x/rhinogent"'}</span>
          <span className="text-foreground">;</span>
          {"\n\n"}
          <span className="text-accent">const</span>
          <span className="text-foreground"> agent = </span>
          <span className="text-accent">await</span>
          <span className="text-foreground"> Rhinogent.</span>
          <span className="text-accent">mint</span>
          <span className="text-foreground">();</span>
          {"\n"}
          <span className="text-foreground">agent.</span>
          <span className="text-accent">did</span>
          <span className="text-foreground">; </span>
          <span className="text-muted-2">{`// did:pkh:eip155:8453:0x…`}</span>
          {"\n\n"}
          <span className="text-muted-2">{`// sign anything — proof anyone can verify`}</span>
          {"\n"}
          <span className="text-accent">const</span>
          <span className="text-foreground"> seal = agent.</span>
          <span className="text-accent">sign</span>
          <span className="text-foreground">(order);</span>
          {"\n"}
          <span className="text-foreground">Rhinogent.</span>
          <span className="text-accent">verify</span>
          <span className="text-foreground">(seal); </span>
          <span className="text-emerald">{`// true`}</span>
        </code>
      </pre>
    </div>
  );
}

/* ───────────────────────── Security / neutrality ───────────────────────── */
function Security() {
  return (
    <section id="security" className="mx-auto max-w-6xl px-5 py-24">
      <div className="rounded-3xl border border-border bg-gradient-to-b from-surface-2/60 to-surface/30 p-10 sm:p-14">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs uppercase tracking-widest text-accent">
            The trust model
          </p>
          <h2 className="display mt-4 text-3xl font-semibold sm:text-4xl">
            <span className="text-gradient">
              We sign the one thing that stays scarce: the truth.
            </span>
          </h2>
          <p className="mt-5 text-base leading-relaxed text-muted">
            Rhinogent is deliberately not a custodian. Because we never hold your
            agent&apos;s keys, there is nothing to seize, hack, or play favorites
            with. Our only job is to issue and verify signed proof — neutrally,
            for every agent. That neutrality is the moat.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-3xl gap-5 sm:grid-cols-3">
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
    <div className="rounded-2xl border border-border bg-background/40 p-6 text-center">
      <p className="accent-gradient font-mono text-2xl font-semibold">{k}</p>
      <p className="mt-1 text-sm text-muted">{label}</p>
    </div>
  );
}

/* ───────────────────────── CTA (Apple centered) ───────────────────────── */
function CTA() {
  return (
    <section
      id="get-started"
      className="relative overflow-hidden border-t border-border/60 bg-mesh"
    >
      <div className="absolute inset-0 grid-fade" aria-hidden />
      <div className="relative mx-auto max-w-3xl px-5 py-28 text-center">
        <RhinoMascot className="mx-auto h-28 w-auto" />
        <h2 className="display mt-7 text-balance text-5xl font-semibold sm:text-6xl">
          <span className="text-gradient">Give your agent its horn.</span>
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-lg text-muted">
          Mint a self-custody identity, fund a Base wallet, and let your agent
          prove who it is — in one import.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/dashboard"
            className="w-full rounded-full bg-accent px-7 py-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 sm:w-auto"
          >
            Get Rhinogent
          </Link>
          <a
            href="#docs"
            className="w-full rounded-full border border-border bg-surface/50 px-7 py-3.5 text-sm font-medium text-foreground transition-colors hover:border-muted-2 sm:w-auto"
          >
            Read the docs
          </a>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── Visual cards ───────────────────────── */
function IdentityCard() {
  return (
    <div className="rounded-2xl border border-border bg-gradient-to-b from-surface-2 to-surface p-6 shadow-xl shadow-slate-900/10">
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

function WalletCard() {
  return (
    <div className="rounded-2xl border border-border bg-gradient-to-b from-surface-2 to-surface p-6 shadow-xl shadow-slate-900/10">
      <p className="text-xs uppercase tracking-widest text-muted-2">
        Wallet · Base
      </p>
      <p className="mt-2 font-mono text-3xl font-semibold">
        <span className="accent-gradient">42.50</span>{" "}
        <span className="text-sm text-muted">USDC</span>
      </p>
      <div className="mt-6 space-y-2 font-mono text-[13px]">
        <Flow dir="out" label="onyx_kya_verify" amt="-0.05" />
        <Flow dir="out" label="price_check x402" amt="-0.02" />
        <Flow dir="in" label="deposit" amt="+25.00" />
      </div>
    </div>
  );
}

function Flow({
  dir,
  label,
  amt,
}: {
  dir: "in" | "out";
  label: string;
  amt: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-border/50 pb-2">
      <span className="text-muted">{label}</span>
      <span className={dir === "in" ? "text-emerald" : "text-muted-2"}>
        {amt}
      </span>
    </div>
  );
}

function VerifyCard() {
  return (
    <div className="rounded-2xl border border-border bg-gradient-to-b from-surface-2 to-surface p-6 shadow-xl shadow-slate-900/10">
      <p className="text-xs uppercase tracking-widest text-muted-2">
        Signature check
      </p>
      <div className="mt-4 rounded-lg border border-border bg-surface p-4 font-mono text-[12px] leading-relaxed">
        <p className="text-muted-2">{`{`}</p>
        <p className="pl-3 text-foreground">
          alg: <span className="text-emerald">{`"Ed25519"`}</span>,
        </p>
        <p className="pl-3 text-foreground">
          signer: <span className="text-accent">{`"0x…4AEF"`}</span>,
        </p>
        <p className="pl-3 text-foreground">
          valid: <span className="text-emerald">true</span>
        </p>
        <p className="text-muted-2">{`}`}</p>
      </div>
      <p className="mt-4 flex items-center gap-2 text-sm text-emerald">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald" /> Signature
        verified on-device
      </p>
    </div>
  );
}

function MandateCard() {
  return (
    <div className="rounded-2xl border border-border bg-gradient-to-b from-surface-2 to-surface p-6 shadow-xl shadow-slate-900/10">
      <p className="text-xs uppercase tracking-widest text-muted-2">
        Spend mandate
      </p>
      <dl className="mt-4 space-y-3 font-mono text-[13px]">
        <Row k="cap / day" v="$5.00" />
        <Row k="per call" v="$0.50" />
        <Row k="allowlist">
          <span className="text-accent">3 merchants</span>
        </Row>
        <Row k="signed">
          <span className="text-accent">PERM_v0 ✓</span>
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
