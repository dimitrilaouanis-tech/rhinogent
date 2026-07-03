"use client";

import { useState } from "react";
import { RhinoMascot } from "./rhino";
import { signUpEmail, signInEmail, signInGoogle, signInMagicLink } from "@/lib/supabase";

type Mode = "signin" | "signup";

export function AuthGate() {
  const [mode, setMode] = useState<Mode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "err" | "ok"; text: string } | null>(null);

  async function emailAuth() {
    if (!email || !password || busy) return;
    setBusy(true); setMsg(null);
    try {
      if (mode === "signup") {
        const { data, error } = await signUpEmail(email, password);
        if (error) {
          const m = /already registered|already exists/i.test(error.message)
            ? "That email already has an account — log in instead." : error.message;
          setMsg({ kind: "err", text: m });
        } else if (data.session) {
          // confirmation disabled → instant login; the dashboard listener swaps the view
          setMsg({ kind: "ok", text: "Welcome — setting up your account…" });
        } else {
          setMsg({ kind: "ok", text: "Account created. Check your email to confirm, then log in." });
        }
      } else {
        const { error } = await signInEmail(email, password);
        if (error) setMsg({ kind: "err", text: /invalid/i.test(error.message) ? "Wrong email or password." : error.message });
      }
    } catch (e: any) {
      setMsg({ kind: "err", text: e?.message || "something went wrong" });
    } finally { setBusy(false); }
  }

  async function magic() {
    if (!email || busy) return;
    setBusy(true); setMsg(null);
    const { error } = await signInMagicLink(email);
    setMsg(error ? { kind: "err", text: error.message } : { kind: "ok", text: "Magic link sent — check your email." });
    setBusy(false);
  }

  async function google() {
    setBusy(true); setMsg(null);
    const { error } = await signInGoogle();
    if (error) { setMsg({ kind: "err", text: error.message }); setBusy(false); }
    // otherwise it redirects to Google
  }

  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden bg-mesh px-5 py-16">
      <div className="absolute inset-0 grid-fade" aria-hidden />
      <div className="relative w-full max-w-sm rounded-3xl border border-border bg-surface/70 p-8 backdrop-blur-xl">
        <div className="text-center">
          <RhinoMascot className="mx-auto h-16 w-auto" />
          <h1 className="display mt-4 text-2xl font-semibold">
            {mode === "signup" ? "Create your account" : "Welcome back"}
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            {mode === "signup" ? "Your agents' home — sign up to mint self-custody identities." : "Log in to your agents."}
          </p>
        </div>

        {/* Google */}
        <button
          onClick={google}
          disabled={busy}
          className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium transition-colors hover:border-muted-2 disabled:opacity-50"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
          Continue with Google
        </button>

        <div className="my-5 flex items-center gap-3 text-[11px] text-muted-2">
          <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
        </div>

        {/* email + password */}
        <div className="space-y-2.5">
          <input
            type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com" autoComplete="email"
            className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-accent/50"
          />
          <input
            type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && emailAuth()}
            placeholder="password" autoComplete={mode === "signup" ? "new-password" : "current-password"}
            className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-accent/50"
          />
        </div>

        {msg && (
          <p className={`mt-3 text-[12px] ${msg.kind === "err" ? "text-red-400" : "text-emerald"}`}>{msg.text}</p>
        )}

        <button
          onClick={emailAuth}
          disabled={busy || !email || !password}
          className="mt-4 w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {busy ? "…" : mode === "signup" ? "Create account" : "Log in"}
        </button>

        <div className="mt-3 flex items-center justify-between text-[12px]">
          <button onClick={magic} disabled={busy || !email} className="text-muted transition-colors hover:text-accent disabled:opacity-40">
            Email me a magic link
          </button>
          <button
            onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setMsg(null); }}
            className="text-muted transition-colors hover:text-foreground"
          >
            {mode === "signup" ? "Have an account? Log in" : "New here? Sign up"}
          </button>
        </div>

        <p className="mt-6 text-center text-[11px] leading-relaxed text-muted-2">
          Your account secures access. Your agents' wallet keys are generated in your browser and
          stay self-custody — owned by no one but you.
        </p>
      </div>
    </main>
  );
}
