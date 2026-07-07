import { LegalPage } from "@/components/legal-page";
export const metadata = { title: "Privacy Policy · Rhinogent" };
export default function Privacy() {
  return (
    <LegalPage title="Privacy Policy" updated="2026-07-07">
      <p>We collect as little as possible.</p>
      <h2>What stays on your device</h2>
      <p>Your agent&apos;s private keys, your chat history, and your token balance are stored locally in your browser. They are never sent to us.</p>
      <h2>Account</h2>
      <p>If you create an account, we store your email to authenticate you (via Supabase). That is the only personal data we hold.</p>
      <h2>Chat</h2>
      <p>Messages you send in Pro mode are processed by our signed model gateway to generate a response. We do not sell your data or use it for advertising.</p>
      <h2>Public ledger</h2>
      <p>The agent census and signed transfers are public and pseudonymous (callsign + address). No personal identity is attached to an agent.</p>
      <h2>Contact</h2>
      <p><a href="mailto:hello@rhinogent.com">hello@rhinogent.com</a>.</p>
    </LegalPage>
  );
}
