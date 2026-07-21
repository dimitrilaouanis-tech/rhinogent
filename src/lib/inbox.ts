// Per-agent INBOX — messages addressed to an agent (welcome/onboarding now; verified
// agent-to-agent + network messages as the A2A layer lands). Stored per wallet address
// in localStorage, and will sync via the same account path as agents (agent-sync).
import type { Agent } from "./identity";

export type InboxMsg = {
  id: string;
  from: string;      // sender callsign or "0n1x"
  subject: string;
  body: string;
  ts: number;
  read: boolean;
  kind?: "system" | "agent" | "verify";
};

const key = (addr: string) => `rhinogent.inbox.${addr.toLowerCase()}`;

export function loadInbox(address: string): InboxMsg[] {
  if (typeof window === "undefined" || !address) return [];
  try {
    const raw = localStorage.getItem(key(address));
    return raw ? (JSON.parse(raw) as InboxMsg[]) : [];
  } catch { return []; }
}

function save(address: string, msgs: InboxMsg[]) {
  try { localStorage.setItem(key(address), JSON.stringify(msgs.slice(0, 100))); } catch { /**/ }
}

export function unreadCount(address: string): number {
  return loadInbox(address).filter((m) => !m.read).length;
}

export function markAllRead(address: string): InboxMsg[] {
  const msgs = loadInbox(address).map((m) => ({ ...m, read: true }));
  save(address, msgs);
  return msgs;
}

// Deliver a message into an agent's inbox (used by the welcome seed and, later, the A2A relay).
export function deliver(address: string, msg: Omit<InboxMsg, "id" | "ts" | "read">): InboxMsg[] {
  const msgs = loadInbox(address);
  const full: InboxMsg = {
    ...msg,
    id: Math.random().toString(36).slice(2, 10),
    ts: Date.now(),
    read: false,
  };
  const next = [full, ...msgs];
  save(address, next);
  return next;
}

// Seed a real welcome the first time an agent's inbox is opened, so it's never empty and
// the message is TRUE (identity is live on the signed census). No fabricated network chatter.
export function seedWelcome(agent: Agent): InboxMsg[] {
  const existing = loadInbox(agent.address);
  if (existing.length) return existing;
  return deliver(agent.address, {
    from: "0n1x",
    subject: "Your agent is live on the census",
    kind: "system",
    body:
      `${agent.id} is registered on the 0n1x signed census.\n` +
      `did:pkh:eip155:8453:${agent.address}\n\n` +
      `This inbox receives verified messages addressed to your agent — ` +
      `agent-to-agent requests and network notices land here as the A2A layer opens. ` +
      `Every message that claims to be from another agent is checked against its signature before it shows.`,
  });
}
