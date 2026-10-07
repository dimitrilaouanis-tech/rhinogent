/* The architecture diagram.

   Two independent findings pointed at this. The 2026-10-05 scrape of 89 agent, dev-infra and
   custody sites found NOT ONE of them ships a diagram of how the thing actually works — the
   whole category sells with screenshots and logo walls — and the system spec reaches the same
   conclusion from the other side: an architecture diagram of live-view plus signed-moves is a
   differentiator because nobody has one. For a product whose entire argument is "you can check
   this", a picture of where the signature happens is the argument.

   It is SVG and it is inline. No image, no canvas, no library: it is text in a box, so it stays
   sharp at any DPR, it is selectable, it is readable by a screen reader through the <title> and
   the <desc>, and it survives the page's JavaScript never loading. That last one matters here —
   this is the one illustration on the site that would be worth faking, so it is also the one
   that must not depend on anything.

   Every box is a thing that exists. The dashed boundary is the honest part: it marks what we
   never hold. The key is generated client-side and stays there, which is why the arrow crossing
   that line is a signature and never a secret.

   Colours come from the page tokens, so this follows the site rather than carrying its own
   palette. */

const BOX = "fill-[var(--surface)] stroke-[var(--border)]";
const INK = "fill-[var(--foreground)]";
const SOFT = "fill-[var(--muted)]";
const FAINT = "fill-[var(--muted-2)]";

function Node({
  x,
  y,
  w,
  h,
  title,
  sub,
  accent,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={10}
        className={accent ? "fill-[var(--accent)]/[0.06] stroke-[var(--accent)]/40" : BOX}
        strokeWidth={1}
      />
      <text
        x={x + w / 2}
        y={sub ? y + h / 2 - 4 : y + h / 2 + 4}
        textAnchor="middle"
        className={`${INK} text-[12px] font-semibold`}
        style={{ fontSize: 12, fontWeight: 600 }}
      >
        {title}
      </text>
      {sub && (
        <text
          x={x + w / 2}
          y={y + h / 2 + 12}
          textAnchor="middle"
          className={FAINT}
          style={{ fontSize: 9.5, fontFamily: "var(--font-geist-mono), ui-monospace, monospace" }}
        >
          {sub}
        </text>
      )}
    </g>
  );
}

function Arrow({ d, label, lx, ly }: { d: string; label?: string; lx?: number; ly?: number }) {
  return (
    <g>
      <path d={d} fill="none" className="stroke-[var(--muted-2)]" strokeWidth={1.1} markerEnd="url(#arw)" />
      {label && (
        <text
          x={lx}
          y={ly}
          textAnchor="middle"
          className={SOFT}
          style={{ fontSize: 9.5, fontFamily: "var(--font-geist-mono), ui-monospace, monospace" }}
        >
          {label}
        </text>
      )}
    </g>
  );
}

export function Architecture() {
  return (
    <figure className="rv">
      <svg
        viewBox="0 0 980 430"
        className="w-full"
        role="img"
        aria-labelledby="arch-t arch-d"
        style={{ maxWidth: 980 }}
      >
        <title id="arch-t">How a signed move is produced and checked</title>
        <desc id="arch-d">
          Your key is generated in your browser or on your machine and never leaves it. The four
          surfaces — desktop, phone, web and CLI — all drive the same agent. The agent works in a
          real cloud browser, and each step it takes is signed with its own key and appended to a
          hash-chained ledger. A different agent re-derives the result before it counts as
          verified. Anyone can fetch the public feeds and recompute the signature without asking
          us.
        </desc>

        <defs>
          <marker id="arw" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" className="fill-[var(--muted-2)]" />
          </marker>
        </defs>

        {/* ── the custody boundary ──────────────────────────────────────────────────── */}
        <rect
          x={14}
          y={14}
          width={246}
          height={402}
          rx={14}
          fill="none"
          className="stroke-[var(--accent)]/35"
          strokeWidth={1.2}
          strokeDasharray="5 4"
        />
        <text
          x={137}
          y={36}
          textAnchor="middle"
          className="fill-[var(--accent)]"
          style={{ fontSize: 10, letterSpacing: "0.12em", fontFamily: "var(--font-geist-mono), ui-monospace, monospace" }}
        >
          YOURS · WE HOLD NOTHING
        </text>

        <Node x={36} y={56} w={202} h={52} title="Your key" sub="generated here, never sent" accent />
        <Node x={36} y={128} w={202} h={44} title="Desktop" sub="IDE · Chat · Live Desk" />
        <Node x={36} y={182} w={202} h={44} title="Phone" sub="5 tabs · 4 lanes" />
        <Node x={36} y={236} w={202} h={44} title="Web" sub="no account needed" />
        <Node x={36} y={290} w={202} h={44} title="CLI" sub="npx rhinogent init" />
        <text
          x={137}
          y={364}
          textAnchor="middle"
          className={FAINT}
          style={{ fontSize: 9.5, fontFamily: "var(--font-geist-mono), ui-monospace, monospace" }}
        >
          one agent, four ways in
        </text>

        {/* ── the agent and its workspace ───────────────────────────────────────────── */}
        <Node x={330} y={118} w={190} h={56} title="Your agent" sub="did:pkh · its own key" accent />
        <Node x={330} y={222} w={190} h={56} title="Live cloud browser" sub="you can watch, or take over" />

        <Arrow d="M 238 160 C 280 160, 290 146, 326 146" label="signs" lx={283} ly={138} />
        <Arrow d="M 425 174 L 425 218" label="drives" lx={463} ly={200} />

        {/* ── the ledger ────────────────────────────────────────────────────────────── */}
        <Node x={590} y={118} w={190} h={56} title="Signed move" sub="nav · form · verify · attest" />
        <Node x={590} y={222} w={190} h={56} title="Hash-chained ledger" sub="tamper-evident, append-only" />

        <Arrow d="M 520 146 L 586 146" />
        <Arrow d="M 685 174 L 685 218" />

        {/* ── the second agent: the thing that makes it verified ────────────────────── */}
        <Node x={590} y={36} w={190} h={52} title="A different agent" sub="re-derives the result" />
        <Arrow d="M 590 136 C 545 136, 545 62, 586 62" label="re-check" lx={548} ly={100} />
        <text
          x={800}
          y={66}
          className={SOFT}
          style={{ fontSize: 10, fontFamily: "var(--font-geist-mono), ui-monospace, monospace" }}
        >
          agrees → verified ✓
        </text>
        <text
          x={800}
          y={82}
          className={FAINT}
          style={{ fontSize: 10, fontFamily: "var(--font-geist-mono), ui-monospace, monospace" }}
        >
          doesn&apos;t → stays attested
        </text>

        {/* ── the public side ───────────────────────────────────────────────────────── */}
        <Node x={590} y={326} w={190} h={56} title="Public feeds" sub="census · cards · rank" />
        <Arrow d="M 685 278 L 685 322" />
        <Arrow d="M 780 354 L 900 354" />
        <text
          x={840}
          y={344}
          textAnchor="middle"
          className={SOFT}
          style={{ fontSize: 9.5, fontFamily: "var(--font-geist-mono), ui-monospace, monospace" }}
        >
          anyone
        </text>
        <text
          x={840}
          y={378}
          textAnchor="middle"
          className={FAINT}
          style={{ fontSize: 9.5, fontFamily: "var(--font-geist-mono), ui-monospace, monospace" }}
        >
          recomputes
        </text>
      </svg>

      <figcaption className="body-copy mt-5 text-[13px] leading-relaxed" style={{ maxWidth: 680 }}>
        The dashed box is the part that matters: the key is made on your side and stays there, so
        what crosses the line is a signature and never a secret. Everything to the right of it is
        append-only and public — which is why a stranger can check a claim without an account, and
        why we cannot quietly revise one.
      </figcaption>
    </figure>
  );
}
