import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: { default: "FINESE DATA — From raw data to reliable decisions", template: "%s · FINESE DATA" },
  description: "An intelligent data workspace to explore, prepare, understand, model and transform your data.",
  applicationName: "FINESE DATA",
  icons: { icon: "/icon.svg" },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#08111f" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
