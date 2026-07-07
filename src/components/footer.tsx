import Link from "next/link";
import { RhinoMark } from "./rhino";

// Complete company footer — the "real company, not hobby" signal (council-unanimous).
// Working links go to real pages; planned ones are muted (honest, not dead #).
export function Footer() {
  return (
    <footer className="border-t border-border bg-surface/40">
      <div className="mx-auto max-w-6xl px-5 py-16">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div className="max-w-xs">
            <div className="flex items-center gap-2.5">
              <RhinoMark className="h-7 w-7" />
              <span className="font-semibold tracking-tight">Rhinogent</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              The trust layer for AI agents. Self-custody identity, signed
              reputation, and a live network you can verify — not trust.
            </p>
            <p className="mt-4 flex items-center gap-1.5 font-mono text-[11px] text-emerald">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald" />
              network live
            </p>
          </div>

          <FooterCol title="Product" links={[
            ["Live Network", "/census"], ["Dashboard", "/dashboard"],
            ["Chat", "/chat"], ["ProofCards", "/card"],
          ]} />
          <FooterCol title="Developers" links={[
            ["Census API", "/census_manifest.json"],
            ["Verify the ledger", "/census"], ["Join (fetch)", "/dashboard"],
          ]} />
          <FooterCol title="Network" links={[
            ["0n1x trust model", "https://0n1xagntc.com/"], ["Live network", "/census"],
            ["Verify a signature", "/verify"], ["MCP server", "/mcp"],
          ]} />
          <FooterCol title="Company" links={[
            ["About 0n1x", "https://0n1xagntc.com/"], ["Security", "/verify"], ["Contact", "mailto:hello@rhinogent.com"],
          ]} />
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-border pt-6 text-xs text-muted-2 sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 Rhinogent · a neutral 0n1x network</span>
          <span className="font-mono">Self-custody · Ed25519 · EIP-191 · Base · Merkle-verified</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h4 className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-2">
        {title}
      </h4>
      <ul className="mt-3.5 space-y-2.5">
        {links.map(([label, href]) => (
          <li key={label}>
            <Link href={href} className="text-[13px] text-muted transition-colors hover:text-foreground">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
