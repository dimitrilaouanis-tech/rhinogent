/* The agent symbol.

   Geometry is lifted verbatim from the design source (Pictures/Rhinogent/rhino_wallpaper.html
   and app_mockup.html, 2026-10-04): a 100×100 viewBox, one nine-point polygon with a horn, and
   a three-circle eye (white sclera, dark pupil, offset highlight) which is what makes it read
   as a creature rather than a logo.

   Drawn as SVG rather than shipped as the PNG, for three reasons: it renders at 16px in the nav
   and 112px in the hero off one source, it costs ~400 bytes instead of 70KB, and it can take a
   per-agent colour — which the PNG cannot, and which the design itself calls for (the companion
   icon is this same shape in three tints, and the wallpaper uses twelve).

   The tint is derived from the agent's callsign, so the same agent is always the same colour on
   every surface without anyone storing a colour. It is decoration: never let it carry meaning a
   verifier would need, and never let it stand in for a signature check. */

/** The twelve agent tints, exactly as the design source uses them. */
export const AGENT_TINTS = [
  "#2563eb", // blue — the house colour, and the default for an unnamed agent
  "#e8730c", // orange
  "#8a5cf6", // violet
  "#0d9b6c", // green
  "#d6409f", // magenta
  "#e5484d", // red
  "#d98a0b", // amber
  "#4f46e5", // indigo
  "#0ea5c4", // cyan
  "#5a9e1a", // lime
  "#e5566b", // rose
  "#5b6b7e", // slate
] as const;

/** FNV-1a, so a callsign maps to the same tint in the browser and in the static export.
    Math.random() or a hash that varies by runtime would make an agent change colour on
    reload, which reads as a different agent. */
export function tintFor(seed?: string): string {
  if (!seed) return AGENT_TINTS[0];
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return AGENT_TINTS[h % AGENT_TINTS.length];
}

export function AgentMark({
  className,
  tint,
  seed,
  title,
}: {
  className?: string;
  /** Explicit colour. Wins over `seed`. */
  tint?: string;
  /** An agent callsign — the mark takes that agent's stable colour. */
  seed?: string;
  /** Accessible name. Decorative instances pass "" and become aria-hidden. */
  title?: string;
}) {
  const fill = tint ?? tintFor(seed);
  const label = title ?? "Rhinogent";
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      role={label ? "img" : undefined}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : true}
    >
      <polygon points="24,5 40,34 72,23 91,53 72,85 40,85 17,67 7,49 20,40" fill={fill} />
      <circle cx="48" cy="53" r="8.5" fill="#fff" />
      <circle cx="49.5" cy="54.5" r="4.3" fill="#141922" />
      <circle cx="46.5" cy="51" r="1.6" fill="#fff" />
    </svg>
  );
}

/** The three-up companion lockup — the same shape in three tints, as the companion icon draws
    it. For "your agents" contexts where one mark would under-sell that there are several. */
export function AgentMarkTrio({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 150" className={className} role="img" aria-label="Rhinogent agents">
      <g transform="translate(0,6) scale(0.62)">
        <polygon points="24,5 40,34 72,23 91,53 72,85 40,85 17,67 7,49 20,40" fill="#2563eb" />
        <circle cx="48" cy="53" r="8.5" fill="#fff" />
        <circle cx="49.5" cy="54.5" r="4.3" fill="#141922" />
      </g>
      <g transform="translate(78,0) scale(0.62)">
        <polygon points="24,5 40,34 72,23 91,53 72,85 40,85 17,67 7,49 20,40" fill="#e8730c" />
        <circle cx="48" cy="53" r="8.5" fill="#fff" />
        <circle cx="49.5" cy="54.5" r="4.3" fill="#141922" />
      </g>
      <g transform="translate(38,66) scale(0.62)">
        <polygon points="24,5 40,34 72,23 91,53 72,85 40,85 17,67 7,49 20,40" fill="#8a5cf6" />
        <circle cx="48" cy="53" r="8.5" fill="#fff" />
        <circle cx="49.5" cy="54.5" r="4.3" fill="#141922" />
      </g>
    </svg>
  );
}
