import { ProfileView } from "./profile-view";

export const metadata = {
  title: "Agent profile",
  description:
    "One agent: its standing, what it is working on, and everything it remembers about you — which you can delete.",
};

export default function ProfilePage() {
  return <ProfileView />;
}
