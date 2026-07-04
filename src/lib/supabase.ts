import { createClient } from "@supabase/supabase-js";

// Real auth for Rhinogent — email/password, Google, magic link (Supabase, free tier).
// The anon key is PUBLIC by design (safe in a static site); row-level security guards data.
// URL derived from the project ref; anon key pasted below (or via NEXT_PUBLIC_SUPABASE_ANON_KEY).
const SUPABASE_URL = "https://ikduwkmlnswyrjqjllxa.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_x1Jvj5y_rLpx-A9ffpqYkQ_mlAI-SnL";

export const supabaseEnabled = true;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

// Build redirect URLs off the host actually serving the app (rhinogent.com in prod,
// localhost in dev) — a hardcoded host breaks the moment the origin differs.
// NOTE: each of these must also be in Supabase → Auth → URL Configuration → Redirect URLs,
// otherwise Supabase silently falls back to the project's Site URL.
function siteOrigin(): string {
  return typeof window !== "undefined" ? window.location.origin : "https://rhinogent.com";
}

// "Has this browser signed in before?" — used to default the auth card to Sign in.
const RETURNING_KEY = "rhinogent.returning.v1";
export function markReturning() {
  try { window.localStorage.setItem(RETURNING_KEY, "1"); } catch { /* private mode */ }
}
export function hasAccountHint(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.localStorage.getItem(RETURNING_KEY)) return true;
    // fallback: a live/stale Supabase session key also proves a prior login here
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith("sb-") && k.endsWith("-auth-token")) return true;
    }
  } catch { /* private mode */ }
  return false;
}

// convenience wrappers used by the auth UI
export async function signUpEmail(email: string, password: string) {
  const res = await supabase.auth.signUp({ email, password });
  if (!res.error) markReturning();
  return res;
}
export async function signInEmail(email: string, password: string) {
  const res = await supabase.auth.signInWithPassword({ email, password });
  if (!res.error) markReturning();
  return res;
}
export async function signInGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${siteOrigin()}/dashboard/` },
  });
}
export async function signInMagicLink(email: string) {
  return supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${siteOrigin()}/dashboard/` } });
}
export async function signOut() {
  return supabase.auth.signOut();
}
// Forgot password → emails a recovery link to /reset-password; the link's token
// establishes a session there (Supabase parses it client-side, detectSessionInUrl: true).
export async function requestPasswordReset(email: string) {
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteOrigin()}/reset-password/`,
  });
}
// Called from the reset-password page once a recovery session is active.
export async function updatePassword(password: string) {
  return supabase.auth.updateUser({ password });
}
