import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { JsonLd } from "@/components/jsonld";
import { ScrollFx, ScrollProgress } from "@/components/scroll-fx";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Bloomberg-terminal grade census page — JetBrains Mono for the readout grid.
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Matches --page. It was #060608, which painted the mobile address bar black above a
  // light page — the one piece of chrome a visitor sees before the site renders.
  themeColor: "#f7f6f3",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://rhinogent.com"),
  title: {
    default: "Rhinogent — the agent you own",
    template: "%s · Rhinogent",
  },
  description:
    "Self-custody identity and wallets for AI agents. Every agent gets a cryptographic identity, a Base wallet it alone controls, and signed, verifiable proof of who it is.",
  keywords: [
    "AI agent wallet",
    "agent identity",
    "self-custody",
    "x402",
    "Base",
    "agentic web",
    "0n1x",
  ],
  openGraph: {
    title: "Rhinogent — the agent you own",
    description:
      "An identity nobody issues, a wallet only you can spend, and a signed record of every move.",
    type: "website",
    siteName: "Rhinogent",
  },
  twitter: {
    card: "summary_large_image",
    title: "Rhinogent — the agent you own",
    description:
      "An identity nobody issues, a wallet only you can spend, and a signed record of every move.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <head>
        {/* Blocking and inline on purpose: it must run before first paint, so scroll-reveal
            content is hidden only once we know JS is alive to reveal it again. Via next/script
            or the bundle this would land after paint and flash the content before hiding it.
            If this never executes, globals.css leaves everything visible — fail-open by design. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `document.documentElement.classList.add('js-reveal')`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <JsonLd />
        {/* Site-wide scroll behaviour: reveal-on-scroll on every route, not just the landing
            page, plus the progress hairline. Nothing it does is load-bearing for content — see
            the fail-open note in scroll-fx.tsx. */}
        <ScrollProgress />
        <ScrollFx />
        {/* Localhost-only route switcher. Renders nothing anywhere else. */}
        <noscript>
          <div style={{ padding: "1rem", textAlign: "center", fontSize: "14px" }}>
            Rhinogent needs JavaScript enabled to run the chat, create identities, and verify signatures.
          </div>
        </noscript>
        {children}
      </body>
    </html>
  );
}
