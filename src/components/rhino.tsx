/**
 * The agent symbol — the shape used for Rhinogent and for every agent.
 *
 * The geometry lives in components/agent-mark.tsx; these two exports stay so the pages that
 * already import them keep working unchanged. Prefer importing AgentMark directly in new code,
 * and pass it a `seed` (an agent callsign) when the mark stands for a specific agent rather
 * than for the brand.
 */
import { AgentMark, AgentMarkTrio } from "./agent-mark";

/** The large mark, for a closing panel or an empty state. Three tints, because the thing being
    sold is a fleet you own, not a single pet. */
export function RhinoMascot({ className }: { className?: string }) {
  return <AgentMarkTrio className={className} />;
}

/** Compact mark. Pass `seed` to tint it for one agent; omit it for the house blue. */
export function RhinoMark({ className, seed }: { className?: string; seed?: string }) {
  return <AgentMark className={className} seed={seed} />;
}
