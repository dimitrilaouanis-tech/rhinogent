// ── Agent inbox — IMPERSONATION-DEFENDED (the envelope rule) ─────────────────
// The `agent_inbox` table is OPEN-INSERT by design: any agent can SEND to any
// address. Authenticity therefore CANNOT come from the `from_addr` field (an
// attacker sets it to whatever they like). It comes ONLY from a signature the
// CLIENT verifies here, before rendering.
//
// THE ENVELOPE RULE:
//   • every legitimate message is signed by the SENDER's key over a canonical
//     message binding {to, from, body}.
//   • verifyInbox() recovers the signer from (message, sig) and checks it equals
//     the claimed from_addr. The ✓ is granted by THAT check — never by from_addr.
//   • a row with a missing/garbage sig, or a sig that recovers to a different
//     address, is marked verified:false → the UI renders it as
//     "unsigned — sender unproven" and shows NO ✓ and NO trusted sender name.
//
// This is the other half of "open by design": open insert is only safe because
// the reader proves the sender cryptographically.

import { recoverMessageAddress } from "viem";
import { supabase } from "./supabase";

export type InboxRow = {
  id: string;
  to_addr: string;
  from_addr: string;
  from_callsign: string | null;
  body: string;
  sig: string | null;
  pubkey: string | null;
  read: boolean;
  created_at: string;
};

export type VerifiedInboxMsg = InboxRow & {
  verified: boolean;
  reason: string;           // why it did/didn't verify (shown on unproven rows)
  signer: string | null;    // the address actually recovered from the signature
};

// The canonical envelope a sender signs. Binding to_addr + from_addr + body stops
// replay to a different recipient and any body tampering. Keep this EXACT — both
// signer and verifier must format identically.
export function inboxEnvelope(toAddr: string, fromAddr: string, body: string): string {
  return `Onyx Inbox\nto=${toAddr.toLowerCase()}\nfrom=${fromAddr.toLowerCase()}\nbody=${body}`;
}

/** Verify ONE row against the envelope rule. Never throws. */
export async function verifyRow(row: InboxRow): Promise<VerifiedInboxMsg> {
  const base = { ...row, verified: false, signer: null as string | null };
  if (!row.sig || typeof row.sig !== "string" || !/^0x[0-9a-fA-F]{130}$/.test(row.sig)) {
    return { ...base, reason: "no valid signature — sender unproven" };
  }
  if (!/^0x[0-9a-fA-F]{40}$/.test(row.from_addr || "")) {
    return { ...base, reason: "claimed sender is not a valid address" };
  }
  try {
    const signer = await recoverMessageAddress({
      message: inboxEnvelope(row.to_addr, row.from_addr, row.body),
      signature: row.sig as `0x${string}`,
    });
    if (signer.toLowerCase() !== row.from_addr.toLowerCase()) {
      return { ...base, signer, reason: "signature does not match the claimed sender — forged" };
    }
    return { ...row, verified: true, signer, reason: "signature verified" };
  } catch {
    return { ...base, reason: "bad signature — could not verify" };
  }
}

/** Fetch + verify an agent's inbox. Rows are returned newest-first, each tagged
 *  verified/unproven. The caller renders trust ONLY from `verified`. */
export async function fetchInbox(toAddr: string, limit = 40): Promise<VerifiedInboxMsg[]> {
  if (!toAddr) return [];
  try {
    const { data, error } = await supabase
      .from("agent_inbox")
      .select("id,to_addr,from_addr,from_callsign,body,sig,pubkey,read,created_at")
      .eq("to_addr", toAddr)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error || !data?.length) return [];
    return await Promise.all((data as InboxRow[]).map(verifyRow));
  } catch {
    return [];
  }
}
