import Link from "next/link";
import { Seal } from "./seal";

const links = [
  { href: "#how", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#trust", label: "Trust" },
  { href: "#docs", label: "Docs" },
];

export function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link href="/" className="flex items-center gap-2.5">
          <Seal className="h-7 w-7" />
          <span className="text-[15px] font-semibold tracking-tight">
            Rhino Signet
          </span>
          <span className="hidden rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest text-muted sm:inline">
            by 0n1x
          </span>
        </Link>

        <div className="hidden items-center gap-7 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm text-muted transition-colors hover:text-foreground"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <a
            href="#docs"
            className="hidden text-sm text-muted transition-colors hover:text-foreground sm:inline"
          >
            Sign in
          </a>
          <a
            href="#get-started"
            className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            Open dashboard
          </a>
        </div>
      </nav>
    </header>
  );
}
