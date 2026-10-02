import { DevelopersView } from "./developers-view";

// Developers — folds the old /a2a page (which now forwards here).
export const metadata = {
  title: "Developers",
  description: "MCP, A2A signed cards, x402 verify-before-pay, the receipt spec, and the one-source feeds.",
};

export default function DevelopersPage() {
  return <DevelopersView />;
}
