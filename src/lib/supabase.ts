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

// convenience wrappers used by the auth UI
export async function signUpEmail(email: string, password: string) {
  return supabase.auth.signUp({ email, password });
}
export async function signInEmail(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}
export async function signInGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: "https://rhinogent.com/dashboard/" },
  });
}
export async function signInMagicLink(email: string) {
  return supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: "https://rhinogent.com/dashboard/" } });
}
export async function signOut() {
  return supabase.auth.signOut();
}
