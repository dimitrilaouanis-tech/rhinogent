/**
 * Agent avatars.
 *
 * The shape is the agent symbol (components/agent-mark.tsx) — one source for the nav, the
 * footer, the favicon and every avatar. What this file adds on top of the bare symbol:
 *  - colour is HASHED from the DID, so the same agent is the same colour on every surface;
 *  - STATE IS A RING around it (green=working, grey=idle, black=needs-you, arc=progress),
 *    never baked into the shape.
 */
import { AgentMark, AGENT_TINTS } from "./agent-mark";

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** Deterministic fill from a DID (or callsign/address when no DID is known), drawn from the
    twelve tints the design actually uses rather than an open hue wheel. */
export function didColor(did: string): { fill: string; ink: string } {
  const h = hash(did.toLowerCase());
  return { fill: AGENT_TINTS[h % AGENT_TINTS.length], ink: "#ffffff" };
}

export type AgentState = "working" | "idle" | "needs-you" | "none";

const RING: Record<AgentState, string | null> = {
  working: "var(--emerald)",
  idle: "var(--muted-2)",
  "needs-you": "var(--foreground)",
  none: null,
};

/** The logo mark — the agent symbol in house blue. Geometry lives in agent-mark.tsx so the
    nav, the footer, the favicon and every agent avatar cannot drift apart. */
export function RhinoA1Mark({ className }: { className?: string }) {
  return <AgentMark className={className} />;
}

/**
 * Agent avatar. `progress` (0..1) draws an arc on the ring instead of a full circle.
 * Size is in px; the head never changes with state — only the ring does.
 */
export function RhinoAvatar({
  did,
  name,
  state = "none",
  progress,
  size = 36,
  className = "",
}: {
  did: string;
  name?: string;
  state?: AgentState;
  progress?: number;
  size?: number;
  className?: string;
}) {
  const { fill } = didColor(did || name || "?");
  const ring = RING[state];
  const r = 30.5;
  const c = 2 * Math.PI * r;
  const p = typeof progress === "number" ? Math.max(0, Math.min(1, progress)) : null;
  const label = `${name || did}${state !== "none" ? ` · ${state}` : ""}${p !== null ? ` · ${Math.round(p * 100)}%` : ""}`;
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={`shrink-0 ${className}`} role="img" aria-label={label}>
      <circle cx="32" cy="32" r="29" fill="var(--surface-2)" />
      {ring && p === null && <circle cx="32" cy="32" r={r} fill="none" stroke={ring} strokeWidth="3" />}
      {ring && p !== null && (
        <>
          <circle cx="32" cy="32" r={r} fill="none" stroke="var(--border)" strokeWidth="3" />
          <circle
            cx="32" cy="32" r={r} fill="none" stroke={ring} strokeWidth="3" strokeLinecap="round"
            strokeDasharray={`${c * p} ${c}`} transform="rotate(-90 32 32)"
          />
        </>
      )}
      {/* The agent symbol, scaled from its own 100×100 box into this 64×64 one and inset so it
          clears the state ring. The per-DID fill stays — that is what makes two agents tell
          apart at a glance — but the initials overlay is gone: the symbol's eye sits where the
          text did, and the two fought. Colour plus callsign carries the identity. */}
      <g transform="translate(13.5 13.5) scale(0.37)">
        <polygon points="24,5 40,34 72,23 91,53 72,85 40,85 17,67 7,49 20,40" fill={fill} />
        <circle cx="48" cy="53" r="8.5" fill="#fff" />
        <circle cx="49.5" cy="54.5" r="4.3" fill="#141922" />
        <circle cx="46.5" cy="51" r="1.6" fill="#fff" />
      </g>
    </svg>
  );
}
