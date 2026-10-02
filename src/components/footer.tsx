import Link from "next/link";
import { RhinoA1Mark } from "./rhino-a1";

// One footer on every page (design-approved). The line is the whole claim — nothing
// here asserts a number; every number on the site is recomputable from its signed feed.
export function Footer() {
  return (
    <footer className="border-t border-border bg-surface/40">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <RhinoA1Mark className="h-6 w-6" />
          <span className="text-sm font-semibold tracking-tight">Rhinogent</span>
          <span className="text-[13px] text-muted">· the reference client for 0n1x</span>
        </Link>
        <p className="font-mono text-[11px] leading-relaxed text-muted-2">
          self-custody · ERC-8004 · x402 · A2A · every number recomputable
        </p>
      </div>
    </footer>
  );
}
