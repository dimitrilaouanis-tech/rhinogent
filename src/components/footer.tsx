import { Seal } from "./seal";

export function Footer() {
  return (
    <footer className="border-t border-border/60 bg-surface/40">
      <div className="mx-auto max-w-6xl px-5 py-12">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-xs">
            <div className="flex items-center gap-2.5">
              <Seal className="h-6 w-6" />
              <span className="font-semibold tracking-tight">Rhinogent</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              The identity wallet for agents. Self-custody by design — keys never
              leave the agent.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-10 text-sm sm:grid-cols-3">
            <FooterCol
              title="Product"
              items={["Dashboard", "Agent SDK", "Gateway", "Pricing"]}
            />
            <FooterCol
              title="Developers"
              items={["Docs", "Quickstart", "A2A card", "x402"]}
            />
            <FooterCol
              title="Company"
              items={["0n1x", "Trust model", "Status", "Contact"]}
            />
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-border/60 pt-6 text-xs text-muted-2 sm:flex-row sm:items-center sm:justify-between">
          <span>© {2026} Rhinogent · Powered by 0n1x</span>
          <span className="font-mono">
            Self-custody · Ed25519 · Base · x402
          </span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-2">
        {title}
      </h4>
      <ul className="mt-3 space-y-2">
        {items.map((i) => (
          <li key={i}>
            <a
              href="#"
              className="text-muted transition-colors hover:text-foreground"
            >
              {i}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
