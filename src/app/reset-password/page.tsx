"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { RhinoMark } from "@/components/rhino";
import { supabase, updatePassword } from "@/lib/supabase";

type Status = "checking" | "ready" | "invalid" | "done";

// Reached via the email link from "Forgot password?" (auth-gate.tsx → requestPasswordReset).
// Supabase puts a recovery token in the URL hash; the client SDK (detectSessionInUrl: true,
// set in lib/supabase.ts) parses it on load and fires a PASSWORD_RECOVERY auth event with a
// short-lived session — that session is what lets updateUser({ password }) succeed below.
export default function ResetPassword() {
  const [status, setStatus] = useState<Status>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let settled = false;
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        settled = true;
        setStatus("ready");
      }
    });
    // Fallback: the hash may already have been consumed by the time this mounts —
    // if a session already exists, allow the reset rather than falsely calling it invalid.
    supabase.auth.getSession().then(({ data }) => {
      if (!settled && data.session) setStatus("ready");
    });
    const timeout = setTimeout(() => {
      if (!settled) setStatus((s) => (s === "checking" ? "invalid" : s));
    }, 2500);
    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  async function submit() {
    if (busy) return;
    if (password.length < 8) return setMsg("Password must be at least 8 characters.");
    if (password !== confirm) return setMsg("Passwords don't match.");
    setBusy(true); setMsg(null);
    try {
      const { error } = await updatePassword(password);
      if (error) setMsg(error.message);
      else setStatus("done");
    } catch (e: any) {
      setMsg(e?.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative flex min-h-screen flex-1 items-center justify-center overflow-hidden bg-mesh px-5 py-16">
      <div className="absolute inset-0 grid-fade" aria-hidden />
      <div className="relative w-full max-w-[420px]">
        <Link href="/" className="flex justify-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface">
            <RhinoMark className="h-7 w-7" />
          </span>
        </Link>

        {status === "checking" && (
          <p className="mt-8 text-center text-sm text-muted">Verifying your reset link…</p>
        )}

        {status === "invalid" && (
          <>
            <h1 className="display mt-6 text-center text-[28px] font-semibold tracking-tight text-foreground">
              Link expired or invalid
            </h1>
            <p className="mt-3 text-center text-sm text-muted">
              Password reset links only work once and expire quickly. Head back and request a
              fresh one from the login screen.
            </p>
            <Link
              href="/dashboard/"
              className="mt-6 block w-full rounded-lg bg-accent px-4 py-2.5 text-center text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Back to login
            </Link>
          </>
        )}

        {status === "ready" && (
          <>
            <h1 className="display mt-6 text-center text-[28px] font-semibold tracking-tight text-foreground">
              Set a new password
            </h1>
            <p className="mt-2 text-center text-sm text-muted">
              This updates your Rhinogent account login only.
            </p>

            <div className="mt-8">
              <label className="block text-sm font-medium text-muted">New password</label>
              <div className="relative mt-1.5">
                <input
                  type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••" autoComplete="new-password"
                  className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 pr-10 text-sm text-foreground placeholder-muted-2 outline-none transition-colors focus:border-accent/50"
                />
                <button type="button" onClick={() => setShow((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-2 hover:text-muted" aria-label="toggle password">
                  {show
                    ? <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.4 5.1A9.5 9.5 0 0121 12a9.8 9.8 0 01-2.4 3.2M6.1 6.1A9.8 9.8 0 003 12a9.5 9.5 0 0013.9 4"/></svg>
                    : <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>}
                </button>
              </div>

              <label className="mt-4 block text-sm font-medium text-muted">Confirm password</label>
              <input
                type={show ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="••••••••••••" autoComplete="new-password"
                className="mt-1.5 w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder-muted-2 outline-none transition-colors focus:border-accent/50"
              />
            </div>

            {msg && <p className="mt-3 text-[13px] text-red-400">{msg}</p>}

            <button
              onClick={submit}
              disabled={busy || !password || !confirm}
              className="mt-5 w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? "…" : "Update password"}
            </button>
          </>
        )}

        {status === "done" && (
          <>
            <h1 className="display mt-6 text-center text-[28px] font-semibold tracking-tight text-foreground">
              Password updated
            </h1>
            <p className="mt-3 text-center text-sm text-muted">
              You're signed in with your new password.
            </p>
            <Link
              href="/dashboard/"
              className="mt-6 block w-full rounded-lg bg-accent px-4 py-2.5 text-center text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Go to your agents
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
