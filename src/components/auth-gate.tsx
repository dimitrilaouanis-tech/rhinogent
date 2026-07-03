"use client";

import { useState } from "react";
import { RhinoMark } from "./rhino";
import { signUpEmail, signInEmail, signInGoogle } from "@/lib/supabase";

type Mode = "signin" | "signup";

// flip on once the provider is configured in Supabase (Auth → Providers)
const GOOGLE_ENABLED = false;
const GITHUB_ENABLED = false;

export function AuthGate() {
  const [mode, setMode] = useState<Mode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "err" | "ok"; text: string } | null>(null);
  const anyOAuth = GOOGLE_ENABLED || GITHUB_ENABLED;

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
          setMsg({ kind: "ok", text: "Welcome — setting up your account…" });
        } else {
          setMsg({ kind: "ok", text: "Check your email to confirm your account." });
        }
      } else {
        const { error } = await signInEmail(email, password);
        if (error) setMsg({ kind: "err", text: /invalid/i.test(error.message) ? "Wrong email or password." : error.message });
      }
    } catch (e: any) {
      setMsg({ kind: "err", text: e?.message || "Something went wrong." });
    } finally { setBusy(false); }
  }

  async function google() {
    setBusy(true); setMsg(null);
    const { error } = await signInGoogle();
    if (error) { setMsg({ kind: "err", text: error.message }); setBusy(false); }
  }

  const isSignup = mode === "signup";

  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden bg-mesh px-5 py-16">
      <div className="absolute inset-0 grid-fade" aria-hidden />
      <div className="relative w-full max-w-[420px]">
        {/* logo */}
        <div className="flex justify-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface">
            <RhinoMark className="h-7 w-7" />
          </span>
        </div>

        {/* heading */}
        <h1 className="display mt-6 text-center text-[28px] font-semibold tracking-tight text-foreground">
          {isSignup ? "Create a Rhinogent account" : "Log in to Rhinogent"}
        </h1>
        <p className="mt-2 text-center text-sm text-muted">
          {isSignup ? "Already have an account? " : "New to Rhinogent? "}
          <button
            onClick={() => { setMode(isSignup ? "signin" : "signup"); setMsg(null); }}
            className="font-semibold text-foreground underline-offset-2 hover:underline"
          >
            {isSignup ? "Log in" : "Sign up"}
          </button>.
        </p>

        {/* OAuth (side by side, shown when configured) */}
        {anyOAuth && (
          <>
            <div className="mt-8 grid grid-cols-2 gap-3">
              {GOOGLE_ENABLED && (
                <button onClick={google} disabled={busy}
                  className="flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-muted-2 disabled:opacity-50">
                  <svg viewBox="0 0 24 24" className="h-4 w-4"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
                  Google
                </button>
              )}
              {GITHUB_ENABLED && (
                <button disabled={busy}
                  className="flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-muted-2 disabled:opacity-50">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-foreground"><path d="M12 2A10 10 0 0 0 8.8 21.5c.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.3-3.4-1.3-.4-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.6 2.4 1.1 3 .9.1-.7.3-1.1.6-1.4-2.2-.2-4.5-1.1-4.5-5 0-1.1.4-2 1-2.6-.1-.3-.4-1.3.1-2.6 0 0 .8-.3 2.7 1a9.4 9.4 0 0 1 5 0c1.9-1.3 2.7-1 2.7-1 .5 1.3.2 2.3.1 2.6.6.6 1 1.5 1 2.6 0 3.9-2.3 4.7-4.5 5 .3.3.7.9.7 1.9v2.8c0 .3.1.6.7.5A10 10 0 0 0 12 2z"/></svg>
                  GitHub
                </button>
              )}
            </div>
            <div className="my-6 flex items-center gap-4 text-xs text-muted-2">
              <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
            </div>
          </>
        )}

        {/* email + password */}
        <div className={anyOAuth ? "" : "mt-8"}>
          <label className="block text-sm font-medium text-muted">Email</label>
          <input
            type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="alan.turing@example.com" autoComplete="email"
            className="mt-1.5 w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder-muted-2 outline-none transition-colors focus:border-accent/50"
          />

          <label className="mt-4 block text-sm font-medium text-muted">Password</label>
          <div className="relative mt-1.5">
            <input
              type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && emailAuth()}
              placeholder="••••••••••••" autoComplete={isSignup ? "new-password" : "current-password"}
              className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 pr-10 text-sm text-foreground placeholder-muted-2 outline-none transition-colors focus:border-accent/50"
            />
            <button type="button" onClick={() => setShow((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-2 hover:text-muted" aria-label="toggle password">
              {show
                ? <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.4 5.1A9.5 9.5 0 0121 12a9.8 9.8 0 01-2.4 3.2M6.1 6.1A9.8 9.8 0 003 12a9.5 9.5 0 0013.9 4"/></svg>
                : <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>}
            </button>
          </div>
        </div>

        {msg && (
          <p className={`mt-3 text-[13px] ${msg.kind === "err" ? "text-red-400" : "text-emerald"}`}>{msg.text}</p>
        )}

        <button
          onClick={emailAuth}
          disabled={busy || !email || !password}
          className="mt-5 w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "…" : isSignup ? "Create account" : "Log in"}
        </button>

        <p className="mt-6 text-center text-xs leading-relaxed text-muted-2">
          By signing up, you agree to our <a href="/terms" className="underline hover:text-muted">Terms</a>,{" "}
          <a href="/acceptable-use" className="underline hover:text-muted">Acceptable Use</a>, and{" "}
          <a href="/privacy" className="underline hover:text-muted">Privacy Policy</a>.
        </p>
        <p className="mt-4 text-center text-[11px] text-muted-2">
          Your agents' wallet keys are generated in your browser and stay self-custody.
        </p>
      </div>
    </main>
  );
}
