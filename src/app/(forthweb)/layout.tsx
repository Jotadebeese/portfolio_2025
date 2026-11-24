import type { Metadata } from "next";
import { DM_Sans, Roboto } from "next/font/google";
import "../(app)/globals.css";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { PostHogProvider } from "@/components/providers/PostHogProvider";
import ForthwebHeader from "@/components/forthweb/forthweb-header";
import ForthwebFooter from "@/components/forthweb/forthweb-footer";
import { FORTHWEB_PUBLIC_URL } from "@/lib/forthweb-host";

export const metadata: Metadata = {
  metadataBase: new URL(FORTHWEB_PUBLIC_URL),
  title: {
    template: "%s | forthweb",
    default: "forthweb — Browser-Native Developer Tools",
  },
  description:
    "Fast, privacy-first developer utilities running 100% locally in your browser via HTML5 Canvas, WebCodecs GPU, and Web Crypto API — zero uploads, zero tracking of your files.",
  openGraph: {
    title: "forthweb — Browser-Native Developer Tools",
    description:
      "Fast, privacy-first developer utilities running 100% locally in your browser — zero server uploads.",
    siteName: "forthweb",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/assets/forthweb-og-1200x630.jpg",
        alt: "forthweb — Browser-Native Developer Tools",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "forthweb — Browser-Native Developer Tools",
    description:
      "Fast, privacy-first developer utilities running 100% locally in your browser — zero server uploads.",
    images: ["/assets/forthweb-og-1200x630.jpg"],
  },
};

const dm_sans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  display: "swap",
});

export default function ForthwebRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body
        className={`${dm_sans.variable} ${roboto.variable} selection:text-background antialiased selection:bg-amber-600`}
      >
        <PostHogProvider>
          <div className="flex min-h-dvh flex-col justify-between">
            <ForthwebHeader />
            <main className="flex w-full flex-grow flex-col items-center pb-16 sm:pb-20">
              <div className="w-full max-w-6xl">{children}</div>
            </main>
            <Analytics />
            <SpeedInsights />
            <ForthwebFooter />
          </div>
        </PostHogProvider>
      </body>
    </html>
  );
}
