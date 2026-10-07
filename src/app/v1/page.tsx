/* /v1 — the previous landing page, at a stable URL.

   It renders its own copy (legacy-home.tsx), NOT `../page`: while it re-exported the home
   route, promoting a new design to `/` would have turned this into a second copy of the new
   thing and quietly destroyed the rollback. */
import { LegacyHome } from "./legacy-home";

export const metadata = {
  title: "Previous landing page",
  description: "The landing page design that preceded the current one, kept for comparison.",
  robots: { index: false, follow: false },
};

export default function V1() {
  return <LegacyHome />;
}
