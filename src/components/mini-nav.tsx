"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { RhinoMark } from "./rhino";
import { AccountMenu } from "./account-menu";
import { supabase } from "@/lib/supabase";

// Slim universal nav for app pages (census/terminal/card) — you can always get home
// and hop between surfaces. The full marketing Nav stays on the landing page.
export function MiniNav({ current }: { current?: string }) {
  const links = [
    { href: "/", label: "Home" },
    { href: "/chat", label: "Chat" },
    { href: "/earn", label: "Earn" },
    { href: "/census", label: "Network" },
    { href: "/dashboard", label: "Agents" },
  ];
  const [authed, setAuthed] = useState<boolean | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setAuthed(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);
  return (
    <nav className="flex items-center gap-2 border-b border-border/70 bg-background/80 px-4 py-2 backdrop-blur-xl">
      <style>{`.mininav-scroll::-webkit-scrollbar{display:none}`}</style>
      <Link href="/" className="mr-1 flex shrink-0 items-center gap-2" aria-label="Rhinogent home">
        <RhinoMark className="h-6 w-6" />
        <span className="text-[13px] font-semibold tracking-tight">Rhinogent</span>
      </Link>
      <div className="mininav-scroll flex min-w-0 flex-1 items-center gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none]">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-[12px] font-medium transition-colors ${
              current === l.href ? "bg-accent/10 text-accent" : "text-muted hover:text-foreground"
            }`}
          >
            {l.label}
          </Link>
        ))}
      </div>
      {/* same profile control as the full Nav — consistent sign-out/profile on every app page */}
      {authed && <div className="shrink-0"><AccountMenu compact /></div>}
    </nav>
  );
}
