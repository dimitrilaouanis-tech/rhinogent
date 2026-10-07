import { PricingView } from "./pricing-view";

export const metadata = {
  title: "Pricing",
  description:
    "Minting is free and Normal replies are free. Pro is priced by the depth of the answer, in tokens.",
};

export default function PricingPage() {
  return <PricingView />;
}
