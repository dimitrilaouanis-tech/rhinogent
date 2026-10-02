import { CensusView } from "./census-view";

// Census = the four defined numbers + the ladder + recompute-it-yourself.
// Folds the old Live Network page (matrix.tsx) — its numbers now come only from census_v1.json.
export const metadata = {
  title: "Census",
  description: "The network, counted honestly — four defined numbers from the signed census feed, each recomputable.",
};

export default function CensusPage() {
  return <CensusView />;
}
