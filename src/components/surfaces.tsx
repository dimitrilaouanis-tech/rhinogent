/* The surfaces — one band each, rendered on /download.

   Was /apps/apps-view.tsx until 2026-10-06, when /apps and /download merged: they were the same
   four bands twice. Of 15 comparable products, zero label this page "Apps" and 11 label it
   "Download".

   Each surface is a horizontal band: the claim on the left, an annotated rail of
   "bits" that scrolls sideways.

   Why horizontal, and why this horizontal. The audit of 25 dev-tool landing pages (2026-10-05)
   found the current pattern is `snap-x snap-mandatory overflow-x-auto` — Attio and Granola both
   build their sequence behaviour that way, and a search for `IntersectionObserver` across all
   ten of those files returned zero hits. Nobody in that set scroll-jacks. So this is a real
   scroll rail: no JavaScript, the trackpad and keyboard keep working, and it degrades to a
   plain scrollable row if anything fails.

   Granola's edge-spacer trick is in here too — a spacer at each end so the first and last card
   align to the content gutter instead of slamming into the viewport edge.

   Each bit is a view plus a label and one line. That is the difference between a gallery and an
   explanation: a screenshot shows you a screen; an annotated bit tells you what you are looking
   at and why it matters. */

import Link from "next/link";
import { CopyCmd } from "@/components/home-fx";
import { Rail } from "@/components/rail";

/* fit:"contain" is for a capture whose own aspect is nowhere near 16:9 and whose edges carry
   meaning. The companion island is roughly 3:1 and the whole point of it is the full pill --
   object-cover in a 16:9 box sliced the callsign straight off the left. */
type Bit = {
  src?: string;
  term?: "init" | "verify";
  title: string;
  line: string;
  tall?: boolean;
  fit?: "contain";
};

export type Surface = {
  n: string;
  id: string;
  kicker: string;
  name: string;
  status: string;
  live: boolean;
  claim: string;
  body: string;
  bits: Bit[];
  cmd?: string;
  cta?: { href: string; label: string };
  /* A second, quieter door. The web app genuinely works with no account -- chat-view reads the
     agents held in this browser -- but the page only ever offered "Open it", so a reader had no
     way to know whether opening it would drop them into a signup wall. Say both. */
  cta2?: { href: string; label: string };
  built?: string[];
  soon?: string[];
  note?: string;
};

export const SURFACES: Surface[] = [
  {
    n: "01",
    id: "companion",
    kicker: "desktop",
    name: "Rhinogent for desktop",
    status: "builds · no installer",
    live: false,
    claim: "An IDE your agent works inside.",
    body:
      "One native window, two modes today and a companion over the top. IDE puts an explorer, an editor column and a Problems / Output / Terminal / Ports panel around an agent docked down the right — ask it something and it answers in the same window you are coding in, with 0n1x MCP loaded as an extension so verify-before-pay and the census are a call away from inside the editor. Chat is the same agents without the editor. The companion sits above all of it, dropping a signed pill for every move and every Claude Code session, so you approve a permission without leaving the window you were in.",
    built: ["IDE mode", "Chat mode", "Companion island", "Settings", "Claude Code hook"],
    soon: ["Signed installer", "Live Desk mode", "File tree and editor wiring"],
    bits: [
      {
        src: "/shots/desktop-ide.png",
        title: "IDE mode",
        line: "Explorer, editor, Problems / Output / Terminal / Ports, and the agent docked right. 0n1x MCP shows as a connected extension. The file tree and Monaco editor are not wired yet — the app says so itself.",
      },
      {
        src: "/shots/companion-island.png",
        fit: "contain",
        title: "The companion, idle",
        line: "Pinned above everything. One agent's callsign, its state, and nothing else until there is something to say. Captured from the running build.",
      },
      {
        src: "/shots/companion-fleet.png",
        fit: "contain",
        title: "Open it",
        line: "Pick an agent and the panel follows what it is doing. Empty here only because this capture has no backend attached.",
      },
      {
        src: "/shots/desktop-settings.png",
        tall: true,
        title: "Settings, and the Claude Code hook",
        line: "Sync agents across web, phone and desktop, and install the hooks to see Claude Code sessions in the companion — approving permissions in place.",
      },
      {
        src: "/shots/companion-workspace.png",
        tall: true,
        title: "Workspace — design",
        line: "Tasks, projects, earn, roster and outbox, one tap from anywhere. Design capture, not the build.",
      },
      {
        src: "/shots/companion-needs-you.png",
        tall: true,
        title: "Needs you — design",
        line: "An over-cap payment stops here and waits. It never decides for you. Design capture, not the build.",
      },
      {
        src: "/shots/companion-all-desks.png",
        tall: true,
        title: "Every desk at once — design",
        line: "The whole roster, each with its own key, rank and live workspace. Design capture, not the build.",
      },
    ],
    note: "Sign-in gated, unlike the web — the desktop app shows no agent and no chat until you sign in, because one account is what syncs your roster across desktop, phone and web. It compiles and runs; there is no signed installer, so there is nothing honest to put behind a button yet.",
  },
  {
    n: "02",
    id: "cli",
    kicker: "terminal",
    name: "The CLI",
    status: "on npm",
    live: true,
    claim: "An identity in one command.",
    body:
      "No account, no browser. The key is generated on your machine and printed once — we never see it. Piped output stays pure JSON, so it composes with the rest of your shell.",
    built: ["init", "verify", "task, with approvals", "census --verify"],
    soon: ["ACP mode for editors"],
    bits: [
      { term: "init", title: "init", line: "Creates the identity locally. The key is shown once and never sent." },
      {
        term: "verify",
        title: "verify",
        line: "Checks a counterparty, and names the command to recompute the answer yourself.",
      },
    ],
    cmd: "npx rhinogent init",
  },
  {
    n: "03",
    id: "web",
    kicker: "web",
    name: "Rhinogent on the web",
    status: "live",
    live: true,
    claim: "The thread, the desk and the ledger.",
    body:
      "Talk to your agents, watch the one that's working, and see what each has actually signed. Anything over your cap stops and waits for you. An account syncs your agents across web, phone and desktop — but you do not need one to start: the keys live in this browser, so you can open the chat and go. Signing up later keeps what you already made.",
    built: ["Chat with signed replies", "Live desk", "Rules and approvals", "Agents ladder", "Verifier"],
    soon: ["Memory screen (designed)", "Earn as a live page"],
    bits: [
      { src: "/shots/app-web-chat.png", title: "Chat", line: "Your agents on the left, the thread on the right, every reply stamped." },
      { src: "/shots/app-web-agents.png", title: "Agents", line: "The ladder — rank, tier and the verified work behind each one." },
      { src: "/shots/app-web-earn.png", title: "Earn", line: "What was paid, what wasn't, and which grader signed it." },
      { src: "/shots/app-web-verify.png", title: "Verify", line: "Paste a receipt; the signature is checked in your own browser." },
    ],
    cta: { href: "/dashboard/classic", label: "Create an account" },
    cta2: { href: "/chat", label: "Or chat without one" },
  },
  {
    n: "04",
    id: "phone",
    kicker: "phone",
    name: "Rhinogent mobile",
    status: "Android · preview",
    live: false,
    claim: "The whole desk, in your pocket.",
    body:
      "Five tabs, same identity, same record. Desk is the agent’s live cloud browser; Chat is where it comes back to ask; Agents is your roster ladder; Network is the live ladder across the network; Earn is what has been recorded and not yet paid. Chat runs on four lanes and the picker names them: Facts answers only from signed-corpus consensus and cites it, Normal is fast and free on the local brain, Pro is web-grounded and returns a signed ProofCard with its sources, CLI commands the agent to actually do something. There is a floating companion too — a panel over any other app showing the active agent’s rank, a live timeline of its signed moves, and its workspace; talk to it hands-free, or minimise it to a soundwave and tap to talk.",
    built: ["Desk", "Chat — Facts / Normal / Pro / CLI", "Activity", "Approvals", "Floating companion"],
    soon: ["Store listing", "iOS", "Public download"],
    bits: [
      {
        src: "/shots/app-desk-liveview.png",
        tall: true,
        title: "Desk",
        line: "Filling a login on portal.supplyhub.io — 2 of 3 fields, 1.05s — with decide / attest / draft hashes under it.",
      },
      {
        src: "/shots/app-chat-transcript.png",
        tall: true,
        title: "Chat",
        line: "Three refund drafts waiting on your signature. Deny, allow once, or sign all three — nothing sends until you do.",
      },
      {
        src: "/shots/app-tasks.png",
        tall: true,
        title: "Tasks",
        line: "Durable jobs that survive restarts: reconcile supplier prices (day 2 of 3), industry watch at 09:00 daily, an autonomous 02:00 shift.",
      },
      {
        src: "/shots/app-projects.png",
        tall: true,
        title: "Projects",
        line: "Standing instructions in plain words: “flag anything more than 5% over median before purchase”.",
      },
      {
        src: "/shots/app-agents-teammates.png",
        tall: true,
        title: "Agents",
        line: "The roster as desks. Who is working, who is blocked and needs you, and the rank each one has earned.",
      },
      {
        src: "/shots/app-network.png",
        tall: true,
        title: "Network",
        line: "The ladder, ordered by verified work and slashes — not by how much each one talked.",
      },
      {
        src: "/shots/app-earn.png",
        tall: true,
        title: "Earn",
        line: "Work recorded but not yet paid, and who earned it. These numbers are the device at capture time, not the live feed.",
      },
    ],
    note: "Not in a store yet — builds go to testers first, and the download is paused while we clear a voice-model licence.",
  },
];

const MATTE =
  "radial-gradient(circle at 1px 1px, rgba(17,17,26,0.07) 1.2px, transparent 0) 0 0 / 26px 26px";



export function Band({ s }: { s: Surface }) {
  /* Every card in a rail is the SAME frame. A rail that mixes a 3:1 screenshot with a 1:2 one
     looks broken no matter how good either image is, so the band declares one shape and the
     images fit inside it. */
  const tall = s.bits.some((b) => b.tall) && s.bits.every((b) => b.tall || b.fit === "contain");
  const frame = tall ? { w: 248, h: 430 } : { w: 468, h: 300 };

  return (
    <section id={s.id} className="scroll-mt-24">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,330px)_minmax(0,1fr)] lg:gap-12">
        {/* ── left: what it is ──────────────────────────────────────────────────── */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-mono text-sm text-accent">{s.n}</span>
            <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-2">
              {s.kicker}
            </span>
            <span
              className={`rounded-md px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] ${
                s.live ? "bg-emerald/12 text-emerald" : "bg-gold/15 text-gold"
              }`}
            >
              {s.status}
            </span>
          </div>

          <h2 className="display mt-3 text-[26px] font-semibold leading-[1.15] tracking-tight sm:text-[30px]">
            {s.claim}
          </h2>
          <p className="mt-2 font-mono text-[12px] text-muted-2">{s.name}</p>
          <p className="body-copy mt-4 text-[14px] leading-relaxed">{s.body}</p>

          {s.cmd && (
            <div className="mt-5 max-w-xs">
              <CopyCmd cmd={s.cmd} />
            </div>
          )}

          {(s.cta || s.cta2) && (
            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              {s.cta && (
                <Link
                  href={s.cta.href}
                  className="btn-grad rounded-full px-5 py-2 text-[13px] font-semibold text-white"
                >
                  {s.cta.label} →
                </Link>
              )}
              {s.cta2 && (
                <Link
                  href={s.cta2.href}
                  className="rounded-full border border-border px-5 py-2 text-[13px] font-medium text-foreground transition-colors hover:border-accent/40"
                >
                  {s.cta2.label} →
                </Link>
              )}
            </div>
          )}

          {(s.built || s.soon) && (
            <div className="mt-6 grid grid-cols-2 gap-5 border-t border-border pt-5">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-emerald">Built</p>
                <ul className="mt-2 space-y-1">
                  {(s.built ?? []).map((x) => (
                    <li key={x} className="text-[12.5px] leading-snug text-foreground">{x}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-2">Not yet</p>
                <ul className="mt-2 space-y-1">
                  {(s.soon ?? []).map((x) => (
                    <li key={x} className="text-[12.5px] leading-snug text-muted-2">{x}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {s.note && (
            <p className="mt-5 border-t border-border pt-4 font-mono text-[11px] leading-relaxed text-muted-2">
              {s.note}
            </p>
          )}
        </div>

        {/* ── right: the showcase ───────────────────────────────────────────────── */}
        <Rail
          label={`${s.name} — ${s.bits.length} views`}
          items={s.bits.map((b, i) => ({ id: `${s.id}-${i}`, label: b.title }))}
        >
          {s.bits.map((b, i) => (
            <BitCard key={b.title} b={b} id={`${s.id}-${i}`} eager={i === 0} frame={frame} />
          ))}
        </Rail>
      </div>
    </section>
  );
}

function BitCard({
  b,
  id,
  eager,
  frame,
}: {
  b: Bit;
  id: string;
  eager: boolean;
  frame: { w: number; h: number };
}) {
  return (
    <figure
      id={id}
      className="flex flex-none snap-start flex-col"
      style={{ width: frame.w }}
    >
      {/* the image well — one height for every card in the rail, so the row has one baseline */}
      {/* the hero's recipe exactly: rounded frame, hairline, one long soft shadow, floating
          on the page ground. A phone gets the rounder corner a phone has. */}
      <div
        className="relative overflow-hidden"
        style={{
          height: frame.h,
          borderRadius: b.tall ? 22 : 12,
          background: b.term ? "#0c111c" : b.fit === "contain" ? "#0b0b0d" : "var(--background)",
          boxShadow:
            "0 0 0 1px rgba(17,17,26,0.10), 0 28px 70px -34px rgba(17,17,26,0.40)",
        }}
      >
        {b.term ? (
          <div className="h-full overflow-hidden">
            <TerminalBit which={b.term} />
          </div>
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element -- static export, no image loader */
          <img
            src={b.src}
            alt={b.title}
            loading={eager ? "eager" : "lazy"}
            decoding="async"
            className={
              b.fit === "contain"
                ? "absolute inset-0 h-full w-full object-contain p-4"
                : "absolute inset-0 h-full w-full object-cover object-top"
            }
          />
        )}
      </div>

      {/* fixed-height footer: the reason the bottom edge used to be ragged was captions of
          different lengths pushing the cards to different heights */}
      <figcaption className="flex h-[104px] flex-col gap-1 pt-4">
        <p className="text-[13.5px] font-semibold tracking-tight">{b.title}</p>
        <p
          className="body-copy overflow-hidden text-[12px] leading-[1.5]"
          style={{ display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical" }}
        >
          {b.line}
        </p>
      </figcaption>
    </figure>
  );
}

/* The CLI as live text. Warp renders its terminal as DOM rather than a raster and Ghostty's hero
   ships zero <img> — mono text is crisp at any DPR, selectable, and about 1KB. These blocks
   mirror the CLI's real output after the rewrite: aligned key/value, one ✓, no ASCII box. */
function TerminalBit({ which }: { which: "init" | "verify" }) {
  const d = "text-[#53607a]";
  return (
    <div className="bg-[#0c111c]">
      <div className="flex items-center gap-2 border-b border-white/[0.07] px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        <span className="ml-2 font-mono text-[11.5px] text-[#9aa6bd]">rhinogent</span>
      </div>
      <pre className="overflow-x-auto px-5 py-5 font-mono text-[12px] leading-[1.8] text-[#c6d3e6]">
        {which === "init" ? (
          <>
            <span className="text-[#5b6b85]">$</span> rhinogent init{"\n\n"}
            <span className="text-[#4ade80]">✓</span>{" "}
            <span className="text-white">Identity created</span>{" "}
            <span className={d}>· generated on this machine</span>
            {"\n\n"}
            <span className={d}>callsign </span> Stone-Horn-9508{"\n"}
            <span className={d}>address  </span> 0x901113e6E9Fd2995…659508{"\n"}
            <span className={d}>did      </span>
            <span className={d}> did:pkh:eip155:8453:0x9011…</span>
            {"\n\n"}
            <span className="text-[#fbbf24]">!</span>{" "}
            <span className="text-white">Private key</span>{" "}
            <span className={d}>— shown once. We never receive it.</span>
            {"\n\n"}
            <span className={d}>  0x···· never leaves your machine ····</span>
            {"\n\n"}
            <span className={d}>network   </span>
            <span className="text-[#4ade80]">connected</span>
          </>
        ) : (
          <>
            <span className="text-[#5b6b85]">$</span> rhinogent verify stripe.com{"\n\n"}
            <span className="text-[#4ade80]">✓</span>{" "}
            <span className="text-white">stripe.com</span> <span className={d}>·</span>{" "}
            <span className="text-[#4ade80]">ok</span>
            {"\n\n"}
            <span className={d}>source  </span> facts_registry{"\n"}
            <span className={d}>checked </span>
            <span className={d}> 2026-10-05T00:14Z</span>
            {"\n\n"}
            <span className={d}>A signature proves who said it, not that it is true.</span>
            {"\n"}
            <span className={d}>Recompute </span>
            <span className="text-[#a78bfa]">curl rhinogent.com/census_v1.json</span>
          </>
        )}
      </pre>
    </div>
  );
}
