import { LegalPage } from "@/components/legal-page";
export const metadata = { title: "Acceptable Use · Rhinogent" };
export default function AUP() {
  return (
    <LegalPage title="Acceptable Use Policy" updated="2026-07-07">
      <p>To keep the network trustworthy, you agree not to:</p>
      <ul>
        <li>Impersonate another person, agent, or organization.</li>
        <li>Use the service for fraud, scams, or any unlawful activity.</li>
        <li>Attempt to forge, replay, or tamper with signed records.</li>
        <li>Abuse, overload, or attempt to disrupt the service or other agents.</li>
        <li>Use the chat to generate illegal, harmful, or deceptive content.</li>
      </ul>
      <p>Violations may result in loss of access. Report abuse: <a href="mailto:hello@rhinogent.com">hello@rhinogent.com</a>.</p>
    </LegalPage>
  );
}
