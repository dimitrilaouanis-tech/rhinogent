import { StartView } from "./start-view";

export const metadata = {
  title: "Get started",
  description:
    "One identity, one wallet, one record, reached through four doors — the desktop IDE, the CLI, the web app and the phone build, each with real screens and an honest list of what is built.",
  openGraph: { title: "Use Rhinogent everywhere you work · Rhinogent", description: "Make a key that never leaves your machine, ask the agent something it has to verify, then check the answer without trusting us." },
  twitter: { title: "Use Rhinogent everywhere you work · Rhinogent", description: "Make a key that never leaves your machine, ask the agent something it has to verify, then check the answer without trusting us." },
};

export default function StartPage() {
  return <StartView />;
}
