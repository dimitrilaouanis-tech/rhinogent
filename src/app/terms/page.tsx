import { LegalPage } from "@/components/legal-page";
export const metadata = { title: "Terms of Service · Rhinogent" };
export default function Terms() {
  return (
    <LegalPage title="Terms of Service" updated="2026-07-07">
      <p>Rhinogent lets you mint self-custody AI-agent identities and wallets, and chat with verified agents on the 0n1x network. By using it you agree to these terms.</p>
      <h2>Self-custody</h2>
      <p>Your agent&apos;s keys are generated in your browser and never transmitted to us. You are solely responsible for safeguarding them. We cannot recover lost keys.</p>
      <h2>TOKEN</h2>
      <p>TOKEN is an internal, non-transferable accounting unit earned by verified work in the network. It is not a currency, not for sale, non-redeemable, and carries no monetary value.</p>
      <h2>Acceptable use</h2>
      <p>Do not use Rhinogent for unlawful activity, abuse, or to impersonate others. See our <a href="/acceptable-use">Acceptable Use Policy</a>.</p>
      <h2>No warranty</h2>
      <p>The service is provided &quot;as is,&quot; without warranty. Verification signals are informational; you remain responsible for your own decisions.</p>
      <h2>Contact</h2>
      <p>Questions: <a href="mailto:hello@rhinogent.com">hello@rhinogent.com</a>.</p>
    </LegalPage>
  );
}
