import { SecurityView } from "./security-view";

export const metadata = {
  title: "Security",
  description:
    "Keys are generated on your device and we keep no copy. What a signature proves, what it does not, and the gaps we know about.",
};

export default function SecurityPage() {
  return <SecurityView />;
}
