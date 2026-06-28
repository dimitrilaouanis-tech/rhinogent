/**
 * The Rhinogent mark — a wax-seal / signet-ring glyph.
 * An octagonal seal ring enclosing the 0n1x monogram notch.
 */
export function Seal({
  className,
  glow = false,
}: {
  className?: string;
  glow?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      className={className}
      role="img"
      aria-label="Rhinogent seal"
    >
      {glow && (
        <defs>
          <filter id="seal-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3.2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      )}
      <g
        filter={glow ? "url(#seal-glow)" : undefined}
        stroke="var(--gold)"
        strokeWidth="2.4"
        strokeLinejoin="round"
      >
        {/* outer octagonal seal ring */}
        <path
          d="M34 8 H66 L92 34 V66 L66 92 H34 L8 66 V34 Z"
          fill="rgba(232,196,119,0.05)"
        />
        {/* inner seal face */}
        <path d="M38 20 H62 L80 38 V62 L62 80 H38 L20 62 V38 Z" opacity="0.55" />
      </g>
      {/* the engraved monogram: a notched ring = the "0" of 0n1x */}
      <circle
        cx="50"
        cy="50"
        r="15"
        stroke="var(--gold-soft)"
        strokeWidth="3"
        fill="none"
      />
      <path
        d="M50 35 V50 L60 57"
        stroke="var(--gold-soft)"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
