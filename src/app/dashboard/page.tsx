import { MyAgents } from "./my-agents";

export const metadata = {
  title: "My agents",
  description: "Your agents at work — state, standing, what happened while you were away, and your keys.",
};

export default function DashboardPage() {
  return <MyAgents />;
}
