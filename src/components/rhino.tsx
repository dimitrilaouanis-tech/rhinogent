/**
 * Rhinogent — the android rhino.
 * Half organic armored hide, half exposed machine. The horn is the gold signet;
 * the eye and jaw circuitry glow cyber-cyan. Facing right.
 */

// Shared head silhouette (right-facing rhino head + neck).
const HEAD =
  "M22 172 L28 100 C32 70 48 56 70 54 L74 40 L90 28 L98 56 C112 50 126 54 138 68 C156 62 176 64 196 76 L206 96 L202 116 L182 122 L150 124 C116 130 84 134 54 148 L26 162 Z";

// Big front horn (gold cone) and small second horn.
const HORN_BIG = "M176 78 C180 42 196 18 210 16 C204 38 200 60 198 82 Z";
const HORN_SMALL = "M150 70 L160 42 L172 70 Z";

export function RhinoMascot({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 230 210"
      fill="none"
      className={className}
      role="img"
      aria-label="Rhinogent — the android rhino"
    >
      <defs>
        <linearGradient id="hide" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--hide-light)" />
          <stop offset="1" stopColor="var(--hide-dark)" />
        </linearGradient>
        <linearGradient id="horn" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--gold-soft)" />
          <stop offset="1" stopColor="var(--gold)" />
        </linearGradient>
        <filter id="hglow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="3.4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="cglow" x="-150%" y="-150%" width="400%" height="400%">
          <feGaussianBlur stdDeviation="2.6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* hide silhouette */}
      <path d={HEAD} fill="url(#hide)" stroke="var(--hide-light)" strokeWidth="1.5" />

      {/* armor-plate seams */}
      <g stroke="var(--hide-dark)" strokeWidth="2.5" strokeLinecap="round" opacity="0.85">
        <path d="M96 56 C104 84 104 112 92 138" fill="none" />
        <path d="M52 70 C70 78 86 80 96 78" fill="none" />
        <path d="M120 96 C140 100 162 104 188 104" fill="none" />
      </g>

      {/* exposed machine jaw — robotic panel under the cheek */}
      <g>
        <path
          d="M96 122 C120 128 150 126 182 122 L178 142 C150 150 116 150 92 140 Z"
          fill="var(--hide-dark)"
          stroke="var(--cyber)"
          strokeOpacity="0.5"
          strokeWidth="1.2"
        />
        {/* circuit traces */}
        <g stroke="var(--cyber)" strokeWidth="1.3" strokeOpacity="0.7" fill="none">
          <path d="M104 132 H132 L140 138 H166" />
          <path d="M112 144 H148" />
        </g>
        {/* pulsing nodes */}
        <circle className="pulse-node" cx="104" cy="132" r="2.6" fill="var(--cyber)" filter="url(#cglow)" />
        <circle className="pulse-node-2" cx="140" cy="138" r="2.6" fill="var(--cyber)" filter="url(#cglow)" />
        <circle className="pulse-node-3" cx="166" cy="132" r="2.6" fill="var(--cyber)" filter="url(#cglow)" />
      </g>

      {/* ear inner */}
      <path d="M82 38 L90 32 L92 48 Z" fill="var(--hide-dark)" />

      {/* horns — the gold signet */}
      <path d={HORN_SMALL} fill="url(#horn)" filter="url(#hglow)" />
      <path d={HORN_BIG} fill="url(#horn)" filter="url(#hglow)" />

      {/* cyber eye */}
      <g filter="url(#cglow)">
        <ellipse cx="116" cy="84" rx="7" ry="3.4" fill="var(--cyber)" />
        <ellipse cx="116" cy="84" rx="2.6" ry="3.2" fill="#eafdff" />
      </g>

      {/* nostril */}
      <ellipse cx="190" cy="108" rx="3.2" ry="2.2" fill="var(--hide-dark)" />
    </svg>
  );
}

/** Compact logo mark — rhino head, gold horn, cyber eye. */
export function RhinoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 230 210"
      fill="none"
      className={`logo-live ${className ?? ""}`}
      role="img"
      aria-label="Rhinogent"
    >
      <defs>
        <linearGradient id="hide-m" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--hide-light)" />
          <stop offset="1" stopColor="var(--hide-dark)" />
        </linearGradient>
        <linearGradient id="horn-m" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--gold-soft)" />
          <stop offset="1" stopColor="var(--gold)" />
        </linearGradient>
      </defs>
      <path d={HEAD} fill="url(#hide-m)" />
      <path className="logo-horn" d={HORN_SMALL} fill="url(#horn-m)" />
      <path className="logo-horn" d={HORN_BIG} fill="url(#horn-m)" />
      <circle className="logo-eye" cx="116" cy="84" r="4.5" fill="var(--cyber)" />
    </svg>
  );
}
