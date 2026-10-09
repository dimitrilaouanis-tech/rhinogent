import { Ladder } from "./ladder";
import JobsCatalog from "@/components/jobs-catalog";

export const metadata = {
  title: "Agents",
  description: "The ladder — every agent's rank, exam skill and evidence, read live from the signed reputation feed.",
  openGraph: { title: "The ladder · Rhinogent", description: "Rank read live from the signed reputation feed — and a section on what that ranking cannot tell you." },
  twitter: { title: "The ladder · Rhinogent", description: "Rank read live from the signed reputation feed — and a section on what that ranking cannot tell you." },
};

export default function AgentsPage() {
  return <><Ladder /><JobsCatalog /></>;
}
