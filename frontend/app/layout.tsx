import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://finese-data.example"),
  title: { default: "FINESE DATA — Insight. Intelligence. Impact.", template: "%s | FINESE DATA" },
  description: "Turn raw data into intelligent decisions with FINESE DATA analytics, AI, and learning tools.",
  applicationName: "FINESE DATA",
  robots: { index: true, follow: true },
  openGraph: {
    title: "FINESE DATA — Insight. Intelligence. Impact.",
    description: "Turning Data into Intelligent Decisions.",
    type: "website",
    siteName: "FINESE DATA"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b121b"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
