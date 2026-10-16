"use client";

/* /download — the v2 structure, in our colours.
   ─────────────────────────────────────────────────────────────────────────────────────────
   Ported 2026-10-15 from the Download v2 drop, which has the better shape: a surface picker
   with real state chips, a feature row per surface beside its capture, integrity and
   authenticity as two commands with their output, a what-runs-where table, the machine files,
   the connect-your-tools block, and an FAQ that answers the questions people actually ask
   before installing.

   WHAT IS NOT PORTED: its palette. The drop ships its own near-black (#14141a with #c9c9d6
   greys) and its own type stack. Everything here reads the site tokens, so the page inherits
   the bone ground, the violet accent, the emerald/gold chips and Geist, and changing a token in
   globals.css moves this with it. A second palette on one site is how two pages stop looking
   like one product.

   THREE FACTS CORRECTED FROM THE DROP, each checked against the real artifact:
     - it printed `key rhinogent-feed-2026`; the published kid is qH_Kx6…U_Q (jwks.json)
     - it named `rhinogent-android-v0.4.0-arm64.apk`; the file is rhinogent-0.4.0.apk
     - it called `node verify-feed.mjs census_v1.json`; the verifier takes a URL or a path and
       defaults to the census, so the bare command is the honest one
   A getting-started page whose pasted output does not match the tool teaches, first, that our
   docs are decorative.

   DIGESTS ARE REAL. npm's dist.shasum from `npm view rhinogent`; the APK's sha256 computed
   from the 378,685,157-byte file itself. Of twenty-five release pages studied, two render a
   per-asset hash. */

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { PageShell, PageHead, Honest } from "@/components/feed-ui";
import { CopyCmd } from "@/components/home-fx";
import { AssetsTable, type Asset as FileAsset } from "@/components/assets-table";
import { HeroSession } from "@/components/hero-session";

/* ── the four surfaces ─────────────────────────────────────────────────────────────── */

type State = "live" | "npm" | "paused" | "building";

const CHIP: Record<State, { label: string; cls: string }> = {
  live: { label: "live", cls: "bg-emerald/12 text-emerald" },
  npm: { label: "on npm", cls: "bg-emerald/12 text-emerald" },
  paused: { label: "paused", cls: "bg-gold/15 text-gold" },
  building: { label: "in development", cls: "bg-gold/15 text-gold" },
};

const PICKER: { kind: string; name: string; state: State; href: string }[] = [
  { kind: "Web", name: "Rhinogent on the web", state: "live", href: "#web" },
  { kind: "Terminal", name: "rhinogent CLI", state: "npm", href: "#cli" },
  { kind: "Phone", name: "Rhinogent for Android", state: "paused", href: "#phone" },
  { kind: "Desktop", name: "Rhinogent app", state: "building", href: "#desktop" },
];

type Surface = {
  id: string;
  kind: string;
  state: State;
  head: string;
  body: string;
  points: string[];
  shot?: string;
  term?: boolean;
  session?: boolean;
  ctas?: { href: string; label: string; primary?: boolean }[];
  cmd?: string;
};

const SURFACES: Surface[] = [
  {
    id: "web",
    kind: "Web",
    state: "live",
    head: "Nothing to install. Your key stays in this browser.",
    body: "Chat, the live desk and the ledger. No account needed to start: the keypair is generated in the browser and never leaves it. Sign up later and keep what you made.",
    points: [
      "Chat on four lanes: Facts (free, abstains), Normal (sovereign, on-box), Pro (web-grounded, signed), CLI",
      "Desk: watch the agent's own browser, take over any time",
      "Rules and approvals: every send or spend shows a needs-you card",
      "Agents ladder, Earn, Verifier — same identity everywhere",
    ],
    session: true,
    ctas: [
      { href: "/chat", label: "Open the web app", primary: true },
      { href: "/chat", label: "Chat without an account" },
    ],
  },
  {
    id: "cli",
    kind: "Terminal",
    state: "npm",
    head: "An identity in one command.",
    body: "No account, no browser. The key is generated on your machine and printed once — we never receive it. Piped output stays pure JSON, so it composes with the rest of your shell.",
    points: [
      "init — creates the identity locally; the private half is shown once",
      "verify <target> — a cross-verified counterparty check with its grounds",
      "connect — reads the network without signing anything",
      "MIT, 8.2 kB unpacked, one dependency",
    ],
    term: true,
    cmd: "npm i -g rhinogent",
  },
  {
    id: "phone",
    kind: "Phone",
    state: "paused",
    head: "The whole desk, in your pocket.",
    body: "Five tabs, same identity, same record. Desk is the agent's live cloud browser; Chat is where it comes back to ask; Agents is your roster; Network is the ladder; Earn is what has been recorded and not yet paid.",
    points: [
      "Durable jobs that survive restarts — a reconcile across three days, a 02:00 nightly shift",
      "Standing instructions in plain words, per project",
      "Approvals: nothing sends until you sign",
      "A floating companion over any other app, with a live timeline of signed moves",
    ],
    shot: "/shots/app-chat-transcript.png",
    ctas: [{ href: "mailto:hello@rhinogent.com?subject=Android%20build", label: "Ask for a build" }],
  },
  {
    id: "desktop",
    kind: "Desktop",
    state: "building",
    head: "An IDE your agent works inside.",
    body: "One native window, two modes today and a companion over the top. IDE puts an explorer, an editor column and a Problems / Output / Terminal / Ports panel around an agent docked down the right, with 0n1x MCP loaded as an extension.",
    points: [
      "Ask it something and it answers in the same window you are coding in",
      "0n1x MCP shows as a connected extension — verify-before-pay and the census from inside the editor",
      "The companion drops a signed pill for every move and every Claude Code session",
      "File tree and Monaco editor are not wired yet — the app says so in its own explorer",
    ],
    shot: "/shots/desktop-ide.png",
  },
];

/* ── what runs where ───────────────────────────────────────────────────────────────── */

const RUNS: { surface: string; platform: string; version: string; size: string; needs: string; state: State }[] = [
  { surface: "Web", platform: "any modern browser", version: "continuous", size: "—", needs: "WebCrypto (Ed25519) for the verifier", state: "live" },
  { surface: "CLI", platform: "macOS · Linux · Windows", version: "0.1.0", size: "8.2 kB", needs: "Node 18 or newer", state: "npm" },
  { surface: "Android", platform: "Android 10+ · arm64", version: "0.4.0 · 2026-09-10", size: "361 MB", needs: "Android 10 or newer", state: "paused" },
  { surface: "Desktop", platform: "Windows · macOS", version: "unreleased", size: "—", needs: "Windows 10+ · macOS 12+", state: "building" },
];

/* ── the machine files ─────────────────────────────────────────────────────────────── */

const ARTIFACTS: FileAsset[] = [
  { path: "/verify-feed.mjs", what: "The verifier. Node 18+, no dependencies, ~150 lines", size: "7.9 kB", sha: "990cf1c63670a66a64d035c61bac2325eebf6d6905568b12ead9d3cfef1e6813", state: "live", note: "fetches the key rather than embedding one, and exits 3 if it cannot prove it is able to fail" },
  { path: "/SHA256SUMS", what: "Checksums for the artifacts this deploy writes", size: "579 B", state: "live", note: "generated at build time, in the format sha256sum -c reads" },
  { path: "/feed-state.json", what: "The state of every published feed, from the publisher's perspective", size: "1.6 kB", state: "live", note: "pending / usable / readonly, each with the moment it entered that state" },
  { path: "/.well-known/jwks.json", what: "The feed-signing public key, RFC 8037 JWK", size: "235 B", sha: "d8a7d98d7f8ae5730aab8a0bfd4e562cb03a91f76a96dfb7168141730c31edc2", state: "live", note: "kid qH_Kx6eaTyILIR88KmdZXqn_sM5zskMidWXDWkPwU_Q" },
  { path: "/.well-known/security.txt", what: "Where to report something, and when the contact expires. RFC 9116", size: "420 B", sha: "04fd69adc5010e3e069c4bd1f7fa9900cc8b970e65c376c86cce427fce02dd14", state: "live" },
  { path: "/.well-known/agent-card.json", what: "A2A agent card — every field the v1.0 spec requires", size: "3.1 kB", state: "network", note: "no signatures field yet: published, not signed" },
  { path: "/a2a_cards.json", what: "One card per agent, each with its did:pkh and the address to challenge", size: "123 kB", state: "network" },
  { path: "/census_v1.json", what: "The signed census feed — every number on the site", size: "—", state: "absent", note: "pending; the network writes it, not the build. See /feed-state.json" },
];

const FAQ: [string, string][] = [
  ["Why is Android paused?", "The build ships four voice models whose licences do not allow commercial distribution. We are replacing them. The APK is real, it runs, and its hash is published below so a build a tester hands you can be checked before it touches your phone."],
  ["Why is there no desktop installer?", "It compiles and runs on our machines, but we have not signed a build. An unsigned installer asks you to trust a file nobody vouched for, which is the opposite of what this product is for. When there is a signed one it appears here with its hash."],
  ["Is the web app enough?", "Yes. Chat, desk, approvals, ladder, earn and the verifier are all in the browser, and the key never leaves it. The other surfaces add reach, not capability."],
  ["What if I lose the key?", "The agent is gone. We cannot restore it, because we never had it. Export the encrypted backup when you create the agent — that is the only copy, and it is yours."],
  ["Where does it run?", "The agent's desk runs on our servers in the United States; we operate from Greece. Your key, your memory and your approvals stay on your side."],
];

function Chip({ s }: { s: State }) {
  return (
    <span className={`rounded-md px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] ${CHIP[s].cls}`}>
      {CHIP[s].label}
    </span>
  );
}

function Term() {
  const d = "text-[#53607a]";
  return (
    <div className="overflow-hidden rounded-xl" style={{ background: "#0c111c", boxShadow: "0 0 0 1px rgba(17,17,26,0.12)" }}>
      <div className="border-b border-white/[0.07] px-4 py-2.5">
        <span className="font-mono text-[11px] text-[#5b6b85]">rhinogent</span>
      </div>
      <pre className="hscroll hscroll-dark overflow-x-auto px-5 py-4 font-mono text-[12.5px] leading-[1.8] text-[#c6d3e6]">
        <span className="text-[#5b6b85]">$</span> rhinogent init{"\n\n"}
        <span style={{ color: "#4ade80" }}>✓ Identity created</span>
        <span className={d}> · on this machine</span>
        {"\n\n"}
        <span className={d}>  callsign </span> Stone-Horn-9508{"\n"}
        <span className={d}>  did      </span> did:pkh:eip155:8453:0x9011…{"\n"}
        <span className={d}>  card     </span> ./agent-card.json{"\n\n"}
        <span style={{ color: "var(--gold)" }}>! Private key</span>
        <span className={d}> — shown once. We never receive it.</span>
      </pre>
    </div>
  );
}

export function DownloadView() {
  const [open, setOpen] = useState<number | null>(0);
  /* THE FOUR SURFACES ARE A TAB SET, NOT A STACK. Stacked, they ran 3,507px — nearly half of
     a 7,554px page spent re-reading the same layout four times, and a reader looking for the
     Android build scrolled past three surfaces they had already decided against. The picker
     above them was already a list of four choices; it just didn't do anything. Now it does.

     ALL FOUR STAY IN THE HTML. The inactive ones are hidden with display:none under
     `.js-reveal`, which the inline script in layout.tsx sets — so with JavaScript off every
     surface renders, stacked, exactly as before. Nothing about a file is reachable only by
     running our code, which is the one thing this page cannot afford. */
  const [tab, setTab] = useState(0);

  // deep links keep working: /download/#phone opens on the phone tab rather than a blank page
  /* ── THE TRAVELLING INDICATOR ─────────────────────────────────────────────────────────
     Four buttons that pick a panel is a segmented control, and the selected one used to be
     drawn by swapping its own border and background. That paints one box out and another in,
     which reads as four separate things reacting. One indicator that MOVES reads as one
     control with a position in it — the same argument as the nav pill, and the reason every
     segmented control worth copying is built this way.

     Measured from the real rects rather than computed from a column count, because the grid
     is 1-up on phones, 2-up at sm and 4-up at lg, and the rows are not the same height. */
  const segRef = useRef<HTMLDivElement | null>(null);
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [seg, setSeg] = useState<{ x: number; y: number; w: number; h: number; on: boolean }>(
    { x: 0, y: 0, w: 0, h: 0, on: false },
  );

  useLayoutEffect(() => {
    const move = () => {
      const box = segRef.current, el = btnRefs.current[tab];
      if (!box || !el) return setSeg((v) => ({ ...v, on: false }));
      const a = el.getBoundingClientRect(), b = box.getBoundingClientRect();
      setSeg({ x: a.left - b.left, y: a.top - b.top, w: a.width, h: a.height, on: true });
    };
    move();
    window.addEventListener("resize", move);
    if (typeof document !== "undefined" && document.fonts) document.fonts.ready.then(move).catch(() => {});
    return () => window.removeEventListener("resize", move);
  }, [tab]);

  useEffect(() => {
    const pick = () => {
      const h = window.location.hash.replace(/^#/, "");
      const i = SURFACES.findIndex((s) => s.id === h);
      if (i >= 0) setTab(i);
    };
    pick();
    window.addEventListener("hashchange", pick);
    return () => window.removeEventListener("hashchange", pick);
  }, []);

  return (
    <PageShell wide>
      <PageHead
        eyebrow="Download"
        title={
          <>
            One agent. <span className="accent-gradient">Every door to it.</span>
          </>
        }
        sub="One identity, one wallet, one record, reached four ways. Two are open now; two are being built. Every chip on this page is the surface's real state, and nothing links to a file that is not there."
      />

      {/* ── surface picker ────────────────────────────────────────────────────────── */}
      <div
        ref={segRef}
        role="tablist"
        aria-label="Surfaces"
        className="seg mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        {/* aria-hidden: aria-selected on the buttons already says which one is chosen. This
            is the same fact drawn in pixels. */}
        <span
          aria-hidden
          className="seg-pill"
          style={{
            width: seg.w,
            height: seg.h,
            transform: `translate3d(${seg.x}px, ${seg.y}px, 0)`,
            opacity: seg.on ? 1 : 0,
          }}
        />
        {PICKER.map((p, i) => {
          const on = i === tab;
          return (
            <button
              key={p.kind}
              ref={(el) => { btnRefs.current[i] = el; }}
              type="button"
              role="tab"
              aria-selected={on}
              aria-controls={SURFACES[i].id}
              onClick={() => {
                setTab(i);
                history.replaceState(null, "", p.href);
              }}
              className={`relative z-10 rounded-xl border p-4 text-left transition-colors duration-200 ${
                on ? "border-transparent" : "border-border bg-background hover:border-accent/40"
              }`}
            >
              <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted-2">{p.kind}</p>
              <p className="mt-2 text-[14.5px] font-semibold tracking-tight">{p.name}</p>
              <span className="mt-2.5 inline-block"><Chip s={p.state} /></span>
            </button>
          );
        })}
      </div>

      <div className="mx-auto mt-6 max-w-sm">
        <CopyCmd cmd="npx rhinogent init" />
      </div>

      {/* ── one row per surface ───────────────────────────────────────────────────── */}
      <div className="mt-12 flex flex-col gap-14 md:gap-20" data-no-rvx>
        {SURFACES.map((s, i) => (
          <section
            key={s.id}
            id={s.id}
            role="tabpanel"
            className={`scroll-mt-24 ${i === tab ? "" : "dl-off"}`}
          >
            <div className="grid gap-8 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:gap-12">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted-2">{s.kind}</span>
                  <Chip s={s.state} />
                </div>
                <h2 className="display mt-3 text-[26px] font-semibold leading-[1.15] tracking-tight sm:text-[30px]">{s.head}</h2>
                <p className="body-copy mt-3 text-[14px] leading-relaxed">{s.body}</p>

                <ul className="mt-5 space-y-2.5 border-t border-border pt-5">
                  {s.points.map((p) => (
                    <li key={p} className="body-copy text-[12.5px] leading-relaxed">{p}</li>
                  ))}
                </ul>

                {s.cmd && <div className="mt-5 max-w-xs"><CopyCmd cmd={s.cmd} /></div>}

                {s.ctas && (
                  <div className="mt-5 flex flex-wrap gap-2.5">
                    {s.ctas.map((c) => (
                      <Link
                        key={c.label}
                        href={c.href}
                        className={c.primary
                          ? "btn-grad rounded-full px-5 py-2 text-[13px] font-semibold text-white"
                          : "rounded-full border border-border px-5 py-2 text-[13px] font-medium transition-colors hover:border-accent/40"}
                      >
                        {c.label} →
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <div>
                {s.session ? (
                  <HeroSession />
                ) : s.term ? (
                  <Term />
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element -- static export */
                  <img
                    src={s.shot}
                    alt={s.head}
                    loading="lazy"
                    className="w-full rounded-xl"
                    style={{ boxShadow: "0 0 0 1px rgba(17,17,26,0.10), 0 28px 70px -34px rgba(17,17,26,0.40)" }}
                  />
                )}
              </div>
            </div>
          </section>
        ))}
      </div>

      {/* ── what every surface shares ─────────────────────────────────────────────────
          THE ONLY SECTION OF DOWNLOAD V2 THAT WAS NOT ALREADY HERE. Four doors is a weaker
          pitch than one agent with four doors, and a page that lists surfaces without saying
          what survives the move between them is selling four products.

          THREE OF THE FOUR SENTENCES ARE SOFTER THAN THE DROP'S, each for a checked reason:
            wallet  the drop says "the cap is enforced by the gate, not the app". The gate chain
                    exists and is null-tested, and it is not wired to a live payment rail, so
                    the tile says built-not-wired instead of enforced.
            memory  the drop says "sync between devices only under your key". Sync runs through
                    an account, which means our rows, not only your key. The delete half IS
                    real — every note on /profile has a × that removes it.
            ledger  the drop says all three surfaces show the same receipts. Web and desktop
                    read the same signed feed; the phone mirror is not built.
          Identity is the drop's sentence unchanged: did:pkh is what the dashboard, /developers
          and the card all actually use. */}
      <section className="mt-20 border-t border-border pt-14">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-2">
          What every surface shares
        </p>
        <h2 className="display mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          Same agent. Same memory. Same record.
        </h2>
        <p className="body-copy mt-3 max-w-2xl text-[15px] leading-relaxed">
          The four doors above are doors, not four products. What follows you through them is
          one key, one balance, one set of notes and one chain of receipts &mdash; and where a
          piece of that is still only built on one side, the tile says so.
        </p>

        <div className="mt-7 grid gap-px overflow-hidden rounded-xl bg-border sm:grid-cols-2">
          {[
            {
              k: "Identity",
              p: "One did:pkh on Base, created where you are — in the browser, in the terminal, on the phone. The same identifier is what the dashboard shows, what /developers documents and what the published card carries.",
              s: null,
            },
            {
              k: "Wallet",
              p: "Self-custody: the spending key is the one you made, so nothing here can move the balance. Per-payment and per-day caps are written and null-tested in the gate chain, ahead of the payment rail they will sit on.",
              s: "caps built, not yet wired",
            },
            {
              k: "Memory",
              p: "Notes live on your device and come off line by line — every one on your profile carries an × that deletes it. Syncing them across devices goes through an account, which means a row on our side; without one, nothing leaves the browser.",
              s: null,
            },
            {
              k: "Ledger",
              p: "Every move is signed and chained, and the web and desktop read that same feed, so a receipt you see in one is the receipt in the other. The phone shows its own moves and does not mirror the feed yet.",
              s: "phone mirror not built",
            },
          ].map((t) => (
            <div key={t.k} className="bg-background p-5">
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-accent">
                  {t.k}
                </p>
                {t.s && (
                  <span className="rounded-full border border-gold/30 bg-gold/[.08] px-2 py-0.5 font-mono text-[10px] tracking-tight text-gold">
                    {t.s}
                  </span>
                )}
              </div>
              <p className="body-copy mt-2 text-[13px] leading-relaxed">{t.p}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── integrity and authenticity ────────────────────────────────────────────── */}
      <section className="mt-16">
        <h2 className="display text-2xl font-semibold tracking-tight sm:text-3xl">
          Integrity and authenticity, by hand.
        </h2>
        <p className="body-copy mt-3 max-w-2xl text-[15px] leading-relaxed">
          Check the file you downloaded against the published sums, then check that the feeds you
          are about to trust are signed by the key we publish — not by one the checker carries.
        </p>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-background p-5">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted-2">Integrity</p>
            <div className="mt-3">
              <CopyCmd cmd="curl -sO https://rhinogent.com/SHA256SUMS && sha256sum -c SHA256SUMS" />
            </div>
            <pre className="hscroll hscroll-dark mt-3 overflow-x-auto rounded-lg bg-[#0c111c] px-4 py-3 font-mono text-[11.5px] leading-[1.7] text-[#c6d3e6]">
              {"verify-feed.mjs: "}<span style={{ color: "#4ade80" }}>OK</span>{"\n"}
              {".well-known/jwks.json: "}<span style={{ color: "#4ade80" }}>OK</span>
            </pre>
            <p className="mt-3 font-mono text-[11px] leading-relaxed text-muted-2">
              Generated at build time from the files actually shipped, so it cannot lag what you
              downloaded. macOS: <code>shasum -a 256</code>. Windows: <code>Get-FileHash</code>.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-background p-5">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted-2">Authenticity</p>
            <div className="mt-3">
              <CopyCmd cmd="curl -sO https://rhinogent.com/verify-feed.mjs && node verify-feed.mjs" />
            </div>
            <pre className="hscroll hscroll-dark mt-3 overflow-x-auto rounded-lg bg-[#0c111c] px-4 py-3 font-mono text-[11.5px] leading-[1.7] text-[#c6d3e6]">
              {"null test    "}<span style={{ color: "#4ade80" }}>pass</span>{"\n"}
              {"signature    "}<span style={{ color: "#4ade80" }}>VERIFIED</span>{"\n"}
              {"kid          qH_Kx6…U_Q"}
            </pre>
            <p className="mt-3 font-mono text-[11px] leading-relaxed text-muted-2">
              Node, no dependencies. Read the null-test line first: if it does not say pass, the
              run exits 3 and the verdict above it means nothing.
            </p>
          </div>
        </div>
      </section>

      {/* ── what runs where ───────────────────────────────────────────────────────── */}
      <section className="mt-16">
        <h2 className="display text-2xl font-semibold tracking-tight sm:text-3xl">What runs where.</h2>

        <div className="mt-6 overflow-hidden rounded-xl border border-border">
          <div className="hidden items-center gap-4 border-b border-border bg-surface/60 px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-2 lg:flex">
            <span className="w-[86px] shrink-0">Surface</span>
            <span className="w-[185px] shrink-0">Platform</span>
            <span className="w-[130px] shrink-0">Version</span>
            <span className="w-[66px] shrink-0">Size</span>
            <span className="flex-1">Needs</span>
            <span className="w-[110px] shrink-0">State</span>
          </div>
          {RUNS.map((r, i) => (
            <div key={r.surface} className={`flex flex-col gap-1.5 bg-background px-5 py-3.5 lg:flex-row lg:items-center lg:gap-4 ${i > 0 ? "border-t border-border" : ""}`}>
              <span className="w-full shrink-0 text-[13px] font-semibold lg:w-[86px]">{r.surface}</span>
              <span className="w-full shrink-0 font-mono text-[11.5px] text-muted-2 lg:w-[185px]">{r.platform}</span>
              <span className="w-full shrink-0 font-mono text-[11.5px] tabular-nums text-muted-2 lg:w-[130px]">{r.version}</span>
              <span className="w-full shrink-0 font-mono text-[11.5px] tabular-nums text-muted-2 lg:w-[66px]">{r.size}</span>
              <span className="body-copy flex-1 text-[12.5px]">{r.needs}</span>
              <span className="w-full shrink-0 lg:w-[110px]"><Chip s={r.state} /></span>
            </div>
          ))}
        </div>
      </section>

      <Honest>
        No iOS build exists. Nothing on this page links to a file that is not there — which is
        why two rows offer a conversation instead of a button. When the Android licence is
        cleared and the desktop installer is signed, they become files here, and not before.
      </Honest>

      {/* ── machine files ─────────────────────────────────────────────────────────── */}
      <section className="mt-16">
        <h2 className="display text-2xl font-semibold tracking-tight sm:text-3xl">
          If you came to check us rather than install something.
        </h2>
        <p className="body-copy mt-3 max-w-2xl text-[15px] leading-relaxed">
          Fetchable with no account and no key, and readable by another agent.
        </p>
        <div className="mt-6">
          <AssetsTable assets={ARTIFACTS} />
        </div>
      </section>

      {/* ── connect your tools ────────────────────────────────────────────────────── */}
      <section className="mt-16">
        <h2 className="display text-2xl font-semibold tracking-tight sm:text-3xl">
          Use the agents from the tools you already have.
        </h2>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {[
            { h: "MCP client", s: "Claude Code · Cursor", code: `{"mcpServers":{"rhinogent":{\n  "url":"https://rhinogent.com/mcp"\n}}}` },
            { h: "A2A client", s: "JSON-RPC over the published card", code: `GET  /.well-known/agent-card.json\nPOST /a2a   message/send → task id\n            tasks/get   → signed result` },
            { h: "x402 buyer", s: "pay per call, on Base", code: `GET /api/verify?domain=…\n← 402 · accepts USDC on Base\n→ retry with payment-signature\n← 200 · signed verdict` },
          ].map((c) => (
            <div key={c.h} className="overflow-hidden rounded-xl border border-border bg-background">
              <div className="border-b border-border px-4 py-3">
                <p className="text-[13.5px] font-semibold tracking-tight">{c.h}</p>
                <p className="font-mono text-[10.5px] text-muted-2">{c.s}</p>
              </div>
              <pre className="hscroll hscroll-dark overflow-x-auto bg-[#0c111c] px-4 py-3.5 font-mono text-[11px] leading-[1.7] text-[#c6d3e6]">
                {c.code}
              </pre>
            </div>
          ))}
        </div>
        <p className="mt-3 font-mono text-[11px] leading-relaxed text-muted-2">
          The agent card is published and fetchable; it does not carry a signatures field yet, and
          the page says so rather than letting you assume it does.
        </p>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────────────────── */}
      <section className="mt-16">
        <h2 className="display text-2xl font-semibold tracking-tight sm:text-3xl">
          Questions people ask before installing.
        </h2>
        <div className="mt-6 overflow-hidden rounded-xl border border-border">
          {FAQ.map(([q, a], i) => (
            <div key={q} className={i > 0 ? "border-t border-border" : ""}>
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-center justify-between gap-4 bg-background px-5 py-4 text-left transition-colors hover:bg-surface/50"
              >
                <span className="text-[14px] font-medium tracking-tight">{q}</span>
                <span className="shrink-0 font-mono text-[15px] text-muted-2">{open === i ? "–" : "+"}</span>
              </button>
              {open === i && (
                <p className="body-copy bg-background px-5 pb-5 text-[13px] leading-relaxed">{a}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── close ─────────────────────────────────────────────────────────────────── */}
      <section className="mt-16 rounded-xl border border-border bg-surface/50 p-8 text-center">
        <h2 className="display text-2xl font-semibold tracking-tight sm:text-3xl">
          Register, give it a job, read the receipt.
        </h2>
        <p className="body-copy mx-auto mt-3 max-w-xl text-[14.5px] leading-relaxed">
          Three minutes on a machine that already has Node. The key is yours from the first
          command, and the record is checkable by anyone from the first job.
        </p>
        <div className="mx-auto mt-6 max-w-sm">
          <CopyCmd cmd="npx rhinogent init" />
        </div>
        <div className="mt-5 flex flex-wrap justify-center gap-2.5">
          <Link href="/chat" className="btn-grad rounded-full px-6 py-2.5 text-[13px] font-semibold text-white">
            Open the web app →
          </Link>
          <Link href="/start" className="rounded-full border border-border px-6 py-2.5 text-[13px] font-medium transition-colors hover:border-accent/40">
            See what each surface does →
          </Link>
        </div>
      </section>
    </PageShell>
  );
}
