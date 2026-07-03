"use client";

// mempool.space-style fixed-grid activity panel. Fixed N-slot grid, deterministic
// left-to-right fill, wraps to next row, overwrites the oldest slot when full.
// Squares never move or reflow — only their fill color transitions (flash-fade).

const SLOTS = 240;

export type ActivitySlot = { id: number; amount: number; ts: number };

function intensity(amount: number, max: number): string {
  const t = max > 0 ? Math.min(1, amount / max) : 0;
  // low → panel-raised, high → amber (neutral-important accent per spec)
  const alpha = 0.12 + t * 0.78;
  return `rgba(245, 166, 35, ${alpha.toFixed(3)})`;
}

export function ActivityGrid({ slots }: { slots: ActivitySlot[] }) {
  const maxAmt = Math.max(1, ...slots.map((s) => s.amount));
  const filled = new Array(SLOTS).fill(null) as (ActivitySlot | null)[];
  // fill left-to-right, oldest overwritten first: place newest SLOTS entries in order received
  const recent = slots.slice(-SLOTS);
  recent.forEach((s, i) => { filled[i] = s; });

  return (
    <div className="rounded-xl border p-3" style={{ borderColor: "var(--ct-border)", background: "var(--ct-panel)" }}>
      <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "var(--ct-muted)" }}>
        <span style={{ color: "var(--ct-amber)" }}>▦</span> activity grid · {SLOTS} most recent transfers · intensity = amount
      </p>
      <div
        className="mt-2.5 grid gap-[3px]"
        style={{ gridTemplateColumns: "repeat(30, 1fr)" }}
      >
        {filled.map((s, i) => (
          <div
            key={i}
            className="ct-flash aspect-square rounded-[2px]"
            title={s ? `${s.amount.toLocaleString()} TOKEN` : "empty slot"}
            style={{
              background: s ? intensity(s.amount, maxAmt) : "var(--ct-panel-raised)",
              border: "1px solid var(--ct-border)",
              transition: "background-color 800ms ease-out",
            }}
          />
        ))}
      </div>
    </div>
  );
}
