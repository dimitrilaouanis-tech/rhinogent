import { DownloadView } from "./download-view";

export const metadata = {
  title: "Download",
  description:
    "The CLI on npm, the Android APK, and the signed artifacts anyone can fetch to check us — with an honest status on what isn't finished.",
  openGraph: { title: "Every file, with its hash · Rhinogent", description: "Installers with their real sizes and SHA-256 digests, including the two that are not downloadable yet, and why." },
  twitter: { title: "Every file, with its hash · Rhinogent", description: "Installers with their real sizes and SHA-256 digests, including the two that are not downloadable yet, and why." },
};

export default function DownloadPage() {
  return <DownloadView />;
}
