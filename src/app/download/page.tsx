import { DownloadView } from "./download-view";

export const metadata = {
  title: "Download",
  description:
    "The CLI on npm, the Android APK, and the signed artifacts anyone can fetch to check us — with an honest status on what isn't finished.",
};

export default function DownloadPage() {
  return <DownloadView />;
}
