import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { PreReleaseBar, SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { RevealOnScroll } from "@/components/Reveal";
import { site } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.name} — ${site.tagline}`, template: `%s · ${site.name}` },
  description:
    "PlainClick is a small Mac app that puts the commands you use most into a plain, clearly labelled panel next to supported apps. US$5.99 one time.",
  openGraph: {
    title: `${site.name} — ${site.tagline}`,
    description: "A plain, labelled panel for the Mac apps you use every day.",
    images: ["/video/plainclick-launch-poster.jpg"],
  },
};

export const viewport: Viewport = { themeColor: "#1d1d1f", colorScheme: "light" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <SiteHeader />
        <PreReleaseBar />
        <main id="main">{children}</main>
        <SiteFooter />
        <RevealOnScroll />
      </body>
    </html>
  );
}
