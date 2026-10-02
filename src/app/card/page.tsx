import { Forward } from "@/components/forward";

// Folded: ProofCards → Verify. The card params (?n=&a=&i=&s=) carry over and are
// verified on /verify exactly as before (EIP-191 recover → must equal the address).
export const metadata = { title: "ProofCard → Verify" };

export default function CardPage() {
  return <Forward to="/verify/" label="ProofCards" />;
}
