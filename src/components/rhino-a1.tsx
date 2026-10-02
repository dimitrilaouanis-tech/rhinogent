/**
 * A1 SHARP — the angular rhino head. Logo mark AND every agent avatar.
 * One closed polygon of straight cuts (no curves): horn, brow, jaw, ear, plus a faceted eye.
 * Rules (design-approved):
 *  - colour is HASHED from the DID — same agent, same colour, on every surface;
 *  - two-letter initials sit on the face;
 *  - STATE IS A RING around the head (green=working, grey=idle, black=needs-you, arc=progress),
 *    never baked into the shape.
 */

// Right-facing head in a 64×64 box. Six straight cuts on the face plane + horn + brow + jaw.
const HEAD = "M9 47 L13 27 L20 19 L23 9 L28 18 L37 18 L44 22 L50 12 L52 25 L58 30 L56 38 L45 41 L33 44 L20 51 Z";
// facet cuts (brow line, cheek plane, jaw hinge) — drawn as hairlines over the fill
const CUTS = ["M20 19 L29 27 L44 22", "M29 27 L33 44", "M29 27 L52 25", "M13 27 L29 27"];
const EYE = "M38 26 L42 25 L41 28 Z";

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** Deterministic fill from a DID (or callsign/address when no DID is known). */
export function didColor(did: string): { fill: string; ink: string } {
  const h = hash(did.toLowerCase());
  const hue = h % 360;
  const sat = 48 + ((h >>> 9) % 22);
  const light = 38 + ((h >>> 17) % 14);
  return { fill: `hsl(${hue} ${sat}% ${light}%)`, ink: "#ffffff" };
}

/** "Iron-Spire-F054" → "IS"; "did:pkh:…:0xAB12" → "AB". */
export function initialsFor(name: string): string {
  const parts = name.split(/[-\s_]+/).filter((p) => /^[A-Za-z]/.test(p));
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  const tail = name.replace(/^.*0x/i, "");
  return (tail.slice(0, 2) || "??").toUpperCase();
}

export type AgentState = "working" | "idle" | "needs-you" | "none";

const RING: Record<AgentState, string | null> = {
  working: "var(--emerald)",
  idle: "var(--muted-2)",
  "needs-you": "var(--foreground)",
  none: null,
};

/** The logo mark — the same polygon, brand ink, no ring. */
export function RhinoA1Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label="Rhinogent">
      <path d={HEAD} fill="var(--foreground)" />
      <g stroke="var(--background)" strokeOpacity="0.28" strokeWidth="0.9" fill="none" strokeLinejoin="miter">
        {CUTS.map((d) => <path key={d} d={d} />)}
      </g>
      <path d="M44 22 L50 12 L52 25 Z" fill="var(--accent)" />
      <path d={EYE} fill="var(--background)" />
    </svg>
  );
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
  const { fill, ink } = didColor(did || name || "?");
  const ini = initialsFor(name || did || "??");
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
      <g transform="translate(5 5) scale(0.84)">
        <path d={HEAD} fill={fill} />
        <g stroke="#fff" strokeOpacity="0.25" strokeWidth="0.9" fill="none">
          {CUTS.map((d) => <path key={d} d={d} />)}
        </g>
        <path d={EYE} fill="#fff" fillOpacity="0.9" />
        <text
          x="31" y="40" textAnchor="middle" fontSize="13" fontWeight="800"
          fill={ink} fontFamily="var(--font-geist-mono), ui-monospace, monospace"
        >
          {ini}
        </text>
      </g>
    </svg>
  );
}
