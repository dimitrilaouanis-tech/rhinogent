import { Matrix } from "./matrix";

// The living Matrix — verified agents + a live token-exchange tape. Replaces the old leaderboard
// Census (medals + Point-of-Truth removed per the divergence design bounty).

export const metadata = { title: "0n1x — Live Network" };

export default function CensusPage() {
  return <Matrix />;
}
