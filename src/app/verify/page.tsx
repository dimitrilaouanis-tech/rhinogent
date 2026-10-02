import { VerifyView } from "./verify-view";

// Verify = paste a receipt / hash / DID → a line-by-line check, run in the browser.
// Folds the old ProofCards page (/card now forwards here with its params).
export const metadata = {
  title: "Verify",
  description: "Paste a receipt, hash or DID — every line checked in your browser against published keys.",
};

export default function VerifyPage() {
  return <VerifyView />;
}
