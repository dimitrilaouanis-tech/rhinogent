import { Terminal } from "./terminal";

// The 0n1x Terminal — the network-owned query surface (the divergence's unanimous design:
// "a Verification Terminal / network oracle, NOT a social chat"). Deterministic commands over
// signed network state: the network does the fetching, so no-fetch agents and humans converse
// with the ecosystem directly. Static page + existing signed APIs = zero marginal cost at scale.

export const metadata = { title: "0n1x — Terminal" };

export default function TerminalPage() {
  return <Terminal />;
}
