import { type Agent } from "./identity";
import { supabase, supabaseEnabled } from "./supabase";
import { loadAgents } from "./agents";

// ── Self-custody account sync ────────────────────────────────────────────────
// Agents (including their private keys) persist to the user's ACCOUNT so they
// survive a cleared browser and appear on every device. The CRYPTO BOUNDARY:
// the private key is AES-GCM encrypted CLIENT-SIDE with a key derived from the
// user's LOGIN PASSWORD (PBKDF2) BEFORE it ever touches Supabase. The server
// stores ONLY ciphertext + iv + salt — never a plaintext key, and never the
// password (Supabase already hashes that for auth). No plaintext key path to
// the server exists anywhere in this file.

const LS_KEY = "rhinogent.agents.v1";
const SESSION_KEY_STORE = "rhinogent.sync.k"; // base64 of the raw AES key, this-tab only

// In-memory AES-GCM key for this tab. Only ever derived from the login password.
let sessionKey: CryptoKey | null = null;

const enc = new TextEncoder();
const dec = new TextDecoder();

function b64encode(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}
// Returns an ArrayBuffer (a clean BufferSource) so WebCrypto's strict DOM types accept it
// directly as salt / iv / data without SharedArrayBuffer-union complaints.
function b64decode(b64: string): ArrayBuffer {
  const s = atob(b64);
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
  return bytes.buffer;
}
// TextEncoder output as a plain BufferSource for the same reason.
function utf8(s: string): BufferSource {
  return new Uint8Array(enc.encode(s)).buffer;
}

/** PBKDF2(password, salt) → AES-GCM key. 100k iters, SHA-256. */
export async function deriveKey(password: string, saltB64: string): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    utf8(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: b64decode(saltB64), iterations: 100_000, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    true, // extractable so we can cache the raw key in sessionStorage for this tab
    ["encrypt", "decrypt"]
  );
}

/** AES-GCM encrypt the agent list (JSON). Returns base64 ciphertext + iv. */
export async function encryptAgents(
  agents: Agent[],
  key: CryptoKey
): Promise<{ ciphertext: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    utf8(JSON.stringify(agents))
  );
  return { ciphertext: b64encode(ct), iv: b64encode(iv.buffer) };
}

/** AES-GCM decrypt → Agent[]. Throws on wrong key / tampered data. */
export async function decryptAgents(
  ciphertextB64: string,
  ivB64: string,
  key: CryptoKey
): Promise<Agent[]> {
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: b64decode(ivB64) },
    key,
    b64decode(ciphertextB64)
  );
  return JSON.parse(dec.decode(pt)) as Agent[];
}

function randomSaltB64(): string {
  return b64encode(crypto.getRandomValues(new Uint8Array(16)).buffer);
}

/** True once a session key exists for this tab (from login or unlock). */
export function hasSessionKey(): boolean {
  return sessionKey !== null;
}

async function loadSessionKeyFromStorage(): Promise<void> {
  if (sessionKey || typeof window === "undefined") return;
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY_STORE);
    if (!raw) return;
    sessionKey = await crypto.subtle.importKey(
      "raw",
      b64decode(raw),
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );
  } catch { /* ignore */ }
}

// Fetch the per-user salt from user_metadata, minting+persisting one on first use.
async function getOrCreateSalt(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  const user = data?.user;
  if (!user) return null;
  const existing = (user.user_metadata as any)?.agentSalt;
  if (existing) return existing as string;
  const salt = randomSaltB64();
  await supabase.auth.updateUser({ data: { agentSalt: salt } });
  return salt;
}

/** Derive + cache the AES key from the login password. Call on sign-in/sign-up.
 *  The password lives only here, only long enough to derive the key. */
export async function setSessionKey(password: string): Promise<void> {
  if (!supabaseEnabled || typeof window === "undefined" || !password) return;
  try {
    const salt = await getOrCreateSalt();
    if (!salt) return;
    sessionKey = await deriveKey(password, salt);
    // Cache the raw key so agents keep syncing across this tab's navigations.
    // NOTE: this is the derived key, NOT the password — and it's sessionStorage
    // (cleared when the tab closes), never localStorage.
    try {
      const raw = await crypto.subtle.exportKey("raw", sessionKey);
      window.sessionStorage.setItem(SESSION_KEY_STORE, b64encode(raw));
    } catch { /* ignore */ }
  } catch { /* ignore */ }
}

/** Re-derive the key on demand (e.g. persisted Supabase session, fresh tab where
 *  the password wasn't seen). Wire to a prompt later; exported for that use. */
export async function unlockWithPassword(password: string): Promise<boolean> {
  await setSessionKey(password);
  return hasSessionKey();
}

/** Result of a sync push — so the UI can surface a real "not synced" state instead of failing
 *  silently (the recurring silent-failure disease). `mirror` = the public identity mirror landed;
 *  `encrypted` = the key-bearing blob landed (needs a password-derived key, so false for OAuth). */
export type PushResult = { ok: boolean; mirror: boolean; encrypted: boolean; error?: string; skipped?: string };

/** Encrypt the current agents and store ciphertext in user_metadata + write the public mirror.
 *  Returns a status so callers can show "agents not synced — retry" rather than swallow errors. */
export async function pushAgents(agents: Agent[]): Promise<PushResult> {
  if (!supabaseEnabled || typeof window === "undefined") return { ok: false, mirror: false, encrypted: false, skipped: "disabled" };
  const { data } = await supabase.auth.getUser();
  if (!data?.user) return { ok: false, mirror: false, encrypted: false, skipped: "signed-out" };
  let mirror = false, encrypted = false, error: string | undefined;
  // PUBLIC mirror (agents table, RLS user-scoped): callsign/address/label/did only — NEVER a key.
  // UNION-PRESERVING: read the existing mirror first and merge this device's agents INTO it by
  // address, so a device that only knows 3 of your agents can't wipe the 5 minted elsewhere.
  try {
    const tomb = await getTombstones();   // never resurrect a deleted agent
    const { data: existing } = await supabase
      .from("agents").select("callsign,address,did,label,created_at").eq("user_id", data.user.id);
    const byAddr = new Map<string, { callsign: string; address: string; did: string; label: string; created_at: number }>();
    for (const r of existing || []) {
      const addr = String(r.address);
      if (tomb.has(addr.toLowerCase())) continue;
      byAddr.set(addr.toLowerCase(), { callsign: String(r.callsign), address: addr, did: String(r.did || ""), label: String(r.label || r.callsign), created_at: Number(r.created_at) || 0 });
    }
    for (const a of agents) {  // local wins on conflict (freshest label/callsign)
      if (tomb.has(a.address.toLowerCase())) continue;
      byAddr.set(a.address.toLowerCase(), { callsign: a.id, address: a.address, did: a.did, label: a.label, created_at: a.createdAt });
    }
    const union = [...byAddr.values()].sort((x, y) => (x.created_at || 0) - (y.created_at || 0));
    await supabase.from("agents").delete().eq("user_id", data.user.id);
    if (union.length) {
      const { error: insErr } = await supabase.from("agents").insert(
        union.map((a, i) => ({ user_id: data.user.id, index: i, callsign: a.callsign, label: a.label, address: a.address, did: a.did, created_at: a.created_at }))
      );
      if (insErr) throw insErr;   // no longer swallowed — surfaces as a not-synced state
    }
    mirror = true;
  } catch (e) {
    error = (e as { message?: string })?.message || String(e);
  }
  // ENCRYPTED full sync (includes private keys) — only with the password-derived key.
  try {
    await loadSessionKeyFromStorage();
    if (sessionKey) {
      const salt = (data.user.user_metadata as any)?.agentSalt || (await getOrCreateSalt());
      if (salt) {
        const { ciphertext, iv } = await encryptAgents(agents, sessionKey);
        // Only ciphertext leaves the browser — never a plaintext private key.
        const { error: upErr } = await supabase.auth.updateUser({ data: { agentsCipher: ciphertext, agentsIv: iv, agentSalt: salt } });
        if (upErr) throw upErr;
        encrypted = true;
      }
    }
  } catch (e) {
    if (!error) error = (e as { message?: string })?.message || String(e);
  }
  return { ok: mirror, mirror, encrypted, error };
}

// Union two agent lists by address — keeps local-only agents, prefers remote
// copy on conflict (remote is the account's source of truth after decrypt).
function mergeByAddress(local: Agent[], remote: Agent[]): Agent[] {
  const byAddr = new Map<string, Agent>();
  for (const a of local) byAddr.set(a.address.toLowerCase(), a);
  for (const a of remote) byAddr.set(a.address.toLowerCase(), a);
  return Array.from(byAddr.values());
}

/** Pull encrypted agents from the account, decrypt, merge into localStorage.
 *  Returns the merged list (or the current local list on any no-op/failure). */
export async function pullAgents(): Promise<Agent[]> {
  const local = loadAgents();
  if (!supabaseEnabled || typeof window === "undefined") return local;
  try {
    await loadSessionKeyFromStorage();
    if (!sessionKey) return local;
    const { data } = await supabase.auth.getUser();
    const meta = data?.user?.user_metadata as any;
    if (!meta?.agentsCipher || !meta?.agentsIv) return local;
    const remote = await decryptAgents(meta.agentsCipher, meta.agentsIv, sessionKey);
    const merged = mergeByAddress(local, remote);
    try { window.localStorage.setItem(LS_KEY, JSON.stringify(merged)); } catch { /* ignore */ }
    return merged;
  } catch {
    return local;
  }
}

/** An account agent as seen from ANOTHER device: identity is known, the private key is not.
 *  `hasKey:false` means this device cannot sign/reveal for it — the key stays self-custody on
 *  the device that minted it (that's the point, not a bug). */
export type AccountAgent = Omit<Agent, "privateKey"> & { privateKey?: `0x${string}`; hasKey: boolean };

/** PUBLIC-mirror pull — works for EVERY login method, including OAuth where no password-derived
 *  key exists and the encrypted pull can't run. Returns the account's agent IDENTITIES so the
 *  Agents page SHOWS all your agents on every device (the encrypted pull adds keys when unlocked).
 *  Without this, an OAuth user sees an empty Agents page on a second device. */
export async function pullAgentsPublic(): Promise<AccountAgent[]> {
  if (!supabaseEnabled || typeof window === "undefined") return [];
  try {
    const { data: u } = await supabase.auth.getUser();
    if (!u?.user) return [];
    const { data } = await supabase
      .from("agents")
      .select("callsign,label,address,did,created_at,index")
      .eq("user_id", u.user.id)
      .order("index", { ascending: true });
    return (data || []).map((r: Record<string, unknown>) => ({
      id: String(r.callsign),
      label: String(r.label || r.callsign),
      address: String(r.address) as `0x${string}`,
      did: String(r.did || `did:pkh:eip155:8453:${r.address}`),
      createdAt: Number(r.created_at) || Date.now(),
      hasKey: false,
    }));
  } catch { return []; }
}

/** TOMBSTONES — addresses of agents the user DELETED. Stored in account metadata so a delete is a
 *  POSITIVE event that survives the union merge (union alone would resurrect a deleted agent from
 *  the mirror). Every device honors these: excluded from push, dropped from the view, purged from
 *  the local key store. Lowercased addresses. */
async function getTombstones(): Promise<Set<string>> {
  try {
    const { data } = await supabase.auth.getUser();
    const arr = (data?.user?.user_metadata as any)?.agentTombstones;
    return new Set(Array.isArray(arr) ? arr.map((a: unknown) => String(a).toLowerCase()) : []);
  } catch { return new Set(); }
}

/** Purge tombstoned addresses out of THIS device's local key store so a deleted agent can't be
 *  re-pushed from here on the next sync. */
function purgeLocal(tomb: Set<string>) {
  try {
    const local = loadAgents().filter((a) => !tomb.has(a.address.toLowerCase()));
    window.localStorage.setItem(LS_KEY, JSON.stringify(local));
  } catch { /* ignore */ }
}

/** Delete an agent EVERYWHERE: tombstone it in account metadata (so no device resurrects it),
 *  drop its live mirror row, and remove it from this device's local store. Cross-device delete
 *  propagation for agents — the same model as chat delete-sync. */
export async function deleteAgentEverywhere(address: string): Promise<void> {
  if (!supabaseEnabled || typeof window === "undefined") return;
  const addr = address.toLowerCase();
  try {
    const { data } = await supabase.auth.getUser();
    if (!data?.user) return;
    const existing = (data.user.user_metadata as any)?.agentTombstones;
    const set = new Set<string>(Array.isArray(existing) ? existing.map((a: unknown) => String(a).toLowerCase()) : []);
    set.add(addr);
    await supabase.auth.updateUser({ data: { agentTombstones: [...set] } });
    // drop the live mirror row (RLS: match on address, case-insensitive)
    await supabase.from("agents").delete().eq("user_id", data.user.id).ilike("address", address);
  } catch { /* best-effort */ }
  purgeLocal(new Set([addr]));
}

/** The full picture for the Agents page on ANY device: local agents (with keys) unioned with the
 *  account's public mirror (identity only), MINUS anything tombstoned. Local wins on conflict —
 *  it holds the key. Also purges tombstoned agents from this device's local store. */
export async function accountAgents(): Promise<AccountAgent[]> {
  const tomb = await getTombstones();
  purgeLocal(tomb);
  const local: AccountAgent[] = loadAgents().map((a) => ({ ...a, hasKey: true }));
  const remote = await pullAgentsPublic();
  const byAddr = new Map<string, AccountAgent>();
  for (const a of remote) byAddr.set(a.address.toLowerCase(), a);
  for (const a of local) byAddr.set(a.address.toLowerCase(), a);   // local (key-holding) wins
  for (const dead of tomb) byAddr.delete(dead);                    // deleted-elsewhere never shows
  return Array.from(byAddr.values());
}

/** Drop the in-memory + cached session key (e.g. on sign-out). */
export function clearSessionKey(): void {
  sessionKey = null;
  if (typeof window !== "undefined") {
    try { window.sessionStorage.removeItem(SESSION_KEY_STORE); } catch { /* ignore */ }
  }
}
