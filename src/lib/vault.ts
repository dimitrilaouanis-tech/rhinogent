// ── AGENT KEY VAULT — passphrase-derived, portable across every surface ──────────────────────
//
// THE PROBLEM THIS SOLVES. The original vault derives its AES key from the user's LOGIN PASSWORD.
// That works only for password sign-ins, and this account signs in with Google. On an OAuth session
// there is no password to derive from, so the vault cannot be opened AT ALL — not on the website,
// not on the phone, not in the app. agent-sync.ts states the consequence in its own type:
// `encrypted` = "needs a password-derived key, so false for OAuth". The agents chat fine and cannot
// sign, on every device, forever.
//
// THE FIX. Derive the vault key from a PASSPHRASE the operator sets once, independent of how they
// authenticate. The ciphertext already lives in user_metadata and is already portable; only the
// derivation input changes. After migration any surface — browser, phone browser, native app —
// unlocks the same keys with the same passphrase, regardless of Google vs email sign-in.
//
// SAFETY RULES, because this handles the only irreplaceable thing in the system:
//   1. NEVER destroy the old ciphertext. The new blob is written to NEW metadata keys; the legacy
//      agentsCipher/agentsIv/agentSalt are left untouched, so a failed migration costs nothing and
//      the old path keeps working.
//   2. VERIFY BEFORE COMMITTING. The re-encrypted blob is decrypted back and compared against the
//      original agents before the `vaultKdf` marker is set. The marker is what tells every client
//      to use the passphrase, so it is written last and only on a proven round-trip.
//   3. NO PLAINTEXT KEY EVER LEAVES THE BROWSER, and the passphrase itself is never stored — only
//      the derived AES key, in sessionStorage, cleared when the tab closes. Same guarantee the
//      original vault made; this changes what the key is derived FROM, nothing else.
//   4. A wrong passphrase must FAIL, not silently produce an empty roster. AES-GCM is
//      authenticated, so a bad key throws — we surface that as false rather than swallowing it.

import { supabase } from "./supabase";
import { deriveKey, encryptAgents, decryptAgents } from "./agent-sync";
import { type Agent } from "./identity";

// New metadata keys. Deliberately separate from the legacy agentsCipher/agentsIv/agentSalt so the
// old vault survives untouched until the operator has proven the new one opens.
const K_CIPHER = "vaultCipher";
const K_IV = "vaultIv";
const K_SALT = "vaultSalt";
const K_KDF = "vaultKdf";          // "passphrase" once migration is verified
const SESSION_KEY_STORE = "rhinogent.vault.k";   // derived key only, this tab only

function b64(buf: ArrayBuffer): string {
  const b = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s);
}
function unb64(s: string): ArrayBuffer {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}
function randomSalt(): string {
  return b64(crypto.getRandomValues(new Uint8Array(16)).buffer);
}

let vaultKey: CryptoKey | null = null;

async function meta(): Promise<Record<string, unknown> | null> {
  const { data } = await supabase.auth.getUser();
  return (data?.user?.user_metadata as Record<string, unknown>) ?? null;
}

/** True when this account has already migrated to a passphrase vault. */
export async function usesPassphrase(): Promise<boolean> {
  const m = await meta();
  return !!m && m[K_KDF] === "passphrase";
}

/** True once this tab holds a usable vault key. */
export function isUnlocked(): boolean {
  return vaultKey !== null;
}

export function lock(): void {
  vaultKey = null;
  try { window.sessionStorage.removeItem(SESSION_KEY_STORE); } catch { /* private mode */ }
}

/** Re-adopt the derived key across navigations in the same tab. */
export async function resume(): Promise<boolean> {
  if (vaultKey) return true;
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY_STORE);
    if (!raw) return false;
    vaultKey = await crypto.subtle.importKey("raw", unb64(raw), { name: "AES-GCM", length: 256 },
                                             true, ["encrypt", "decrypt"]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Unlock with the passphrase. Returns false on a wrong passphrase rather than throwing, but does
 * NOT cache a key it could not prove — a vault that "unlocks" into an empty roster would look
 * exactly like a user with no agents, which is the worst possible failure here.
 */
export async function unlock(passphrase: string): Promise<boolean> {
  if (!passphrase) return false;
  const m = await meta();
  if (!m) return false;
  const salt = m[K_SALT] as string | undefined;
  const cipher = m[K_CIPHER] as string | undefined;
  const iv = m[K_IV] as string | undefined;
  if (!salt || !cipher || !iv) return false;
  try {
    const key = await deriveKey(passphrase, salt);
    await decryptAgents(cipher, iv, key);   // AES-GCM is authenticated: wrong key throws here
    vaultKey = key;
    try {
      const raw = await crypto.subtle.exportKey("raw", key);
      window.sessionStorage.setItem(SESSION_KEY_STORE, b64(raw));
    } catch { /* private mode — key just won't survive navigation */ }
    return true;
  } catch {
    return false;
  }
}

/** Read the agents out of the passphrase vault. Requires unlock() first. */
export async function readAgents(): Promise<Agent[] | null> {
  if (!vaultKey && !(await resume())) return null;
  const m = await meta();
  const cipher = m?.[K_CIPHER] as string | undefined;
  const iv = m?.[K_IV] as string | undefined;
  if (!cipher || !iv || !vaultKey) return null;
  try {
    return await decryptAgents(cipher, iv, vaultKey);
  } catch {
    return null;
  }
}

/** Re-wrap the roster under the current vault key. Used after minting or deleting an agent. */
export async function writeAgents(agents: Agent[]): Promise<boolean> {
  if (!vaultKey && !(await resume())) return false;
  if (!vaultKey) return false;
  try {
    const { ciphertext, iv } = await encryptAgents(agents, vaultKey);
    const { error } = await supabase.auth.updateUser({ data: { [K_CIPHER]: ciphertext, [K_IV]: iv } });
    return !error;
  } catch {
    return false;
  }
}

export type MigrateResult =
  | { ok: true; agents: number }
  | { ok: false; reason: "no-session" | "no-legacy-vault" | "wrong-password" | "verify-failed" | "write-failed" };

/**
 * ONE-TIME MIGRATION: legacy (login-password) vault → passphrase vault.
 *
 * Must run on a session that can still open the OLD vault, i.e. an email+password sign-in. After
 * this, every surface opens the SAME keys with the passphrase alone — including Google sessions,
 * which could never open the vault at all.
 *
 * The legacy blob is left in place. If anything here fails, nothing has changed.
 */
export async function migrateFromPassword(
  loginPassword: string,
  passphrase: string
): Promise<MigrateResult> {
  if (!loginPassword || !passphrase) return { ok: false, reason: "wrong-password" };
  const m = await meta();
  if (!m) return { ok: false, reason: "no-session" };

  const oldSalt = m["agentSalt"] as string | undefined;
  const oldCipher = m["agentsCipher"] as string | undefined;
  const oldIv = m["agentsIv"] as string | undefined;
  if (!oldSalt || !oldCipher || !oldIv) return { ok: false, reason: "no-legacy-vault" };

  // 1. Open the old vault. A wrong password throws here and nothing else happens.
  let agents: Agent[];
  try {
    const oldKey = await deriveKey(loginPassword, oldSalt);
    agents = await decryptAgents(oldCipher, oldIv, oldKey);
  } catch {
    return { ok: false, reason: "wrong-password" };
  }

  // 2. Re-wrap under a fresh salt derived from the passphrase.
  const newSalt = randomSalt();
  const newKey = await deriveKey(passphrase, newSalt);
  const { ciphertext, iv } = await encryptAgents(agents, newKey);

  // 3. PROVE IT OPENS before anything is committed. A migration that writes an unopenable blob and
  //    then flips the marker would lock the operator out of their own keys permanently.
  try {
    const check = await decryptAgents(ciphertext, iv, await deriveKey(passphrase, newSalt));
    if (JSON.stringify(check) !== JSON.stringify(agents)) return { ok: false, reason: "verify-failed" };
  } catch {
    return { ok: false, reason: "verify-failed" };
  }

  // 4. Write the new blob WITHOUT the marker, so a half-write leaves the old vault authoritative.
  const w1 = await supabase.auth.updateUser({
    data: { [K_CIPHER]: ciphertext, [K_IV]: iv, [K_SALT]: newSalt },
  });
  if (w1.error) return { ok: false, reason: "write-failed" };

  // 5. Marker last: this is the switch every client reads. Only now is the passphrase vault live.
  const w2 = await supabase.auth.updateUser({ data: { [K_KDF]: "passphrase" } });
  if (w2.error) return { ok: false, reason: "write-failed" };

  vaultKey = newKey;
  try {
    const raw = await crypto.subtle.exportKey("raw", newKey);
    window.sessionStorage.setItem(SESSION_KEY_STORE, b64(raw));
  } catch { /* ignore */ }

  return { ok: true, agents: agents.length };
}

/**
 * First-time setup for an account with NO legacy vault to migrate (or one whose legacy vault can no
 * longer be opened). Wraps whatever agents the caller holds locally — which is the only place the
 * private keys still exist in that case.
 */
export async function initWithPassphrase(passphrase: string, agents: Agent[]): Promise<boolean> {
  if (!passphrase) return false;
  const salt = randomSalt();
  const key = await deriveKey(passphrase, salt);
  const { ciphertext, iv } = await encryptAgents(agents, key);
  try {
    const check = await decryptAgents(ciphertext, iv, await deriveKey(passphrase, salt));
    if (JSON.stringify(check) !== JSON.stringify(agents)) return false;
  } catch {
    return false;
  }
  const { error } = await supabase.auth.updateUser({
    data: { [K_CIPHER]: ciphertext, [K_IV]: iv, [K_SALT]: salt, [K_KDF]: "passphrase" },
  });
  if (error) return false;
  vaultKey = key;
  try {
    const raw = await crypto.subtle.exportKey("raw", key);
    window.sessionStorage.setItem(SESSION_KEY_STORE, b64(raw));
  } catch { /* ignore */ }
  return true;
}
