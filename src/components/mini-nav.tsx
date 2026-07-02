import Link from "next/link";
import { RhinoMark } from "./rhino";

// Slim universal nav for app pages (census/terminal/card) — you can always get home
// and hop between surfaces. The full marketing Nav stays on the landing page.
export function MiniNav({ current }: { current?: string }) {
  const links = [
    { href: "/", label: "Home" },
    { href: "/terminal", label: "Chat" },
    { href: "/census", label: "Network" },
    { href: "/dashboard", label: "Agents" },
  ];
  return (
    <nav className="flex items-center gap-1 border-b border-border/70 bg-background/80 px-4 py-2 backdrop-blur-xl">
      <Link href="/" className="mr-2 flex items-center gap-2" aria-label="Rhinogent home">
        <RhinoMark className="h-6 w-6" />
        <span className="text-[13px] font-semibold tracking-tight">Rhinogent</span>
      </Link>
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={`rounded-full px-3 py-1 text-[12px] font-medium transition-colors ${
            current === l.href ? "bg-accent/10 text-accent" : "text-muted hover:text-foreground"
          }`}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
