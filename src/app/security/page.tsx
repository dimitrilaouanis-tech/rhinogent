import { SecurityView } from "./security-view";

export const metadata = {
  title: "Security",
  description:
    "Keys are generated on your device and we keep no copy. What a signature proves, what it does not, and the gaps we know about.",
  openGraph: { title: "What we hold, and what we don’t · Rhinogent", description: "The custody boundary, what a signature proves and does not, and the gaps we know about — stated by us." },
  twitter: { title: "What we hold, and what we don’t · Rhinogent", description: "The custody boundary, what a signature proves and does not, and the gaps we know about — stated by us." },
};

export default function SecurityPage() {
  return <SecurityView />;
}
