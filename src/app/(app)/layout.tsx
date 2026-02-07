import type { Metadata } from "next";
import { DM_Sans, Roboto } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_WEB_APP_PUBLIC_URL || "http://localhost:3000",
  ),
  title: {
    template: "%s | Juan Bedoya",
    default: "There is not title yet for this page | Juan Bedoya",
  },
  description:
    "A Software Developer, with background in electronics engineering and a big passion in AI.",
  openGraph: {
    title: "Juan Bedoya",
    description:
      "A Software Developer, with background in electronics engineering and a big passion in AI.",
    siteName: "Juan Bedoya",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/assets/bowser.jpeg",
        alt: "Lego set of Bowser from Mario.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Juan Bedoya",
    images: ["/assets/bowser.jpeg"],
  },
};

const dm_sans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});
const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${dm_sans.variable} ${roboto.variable} selection:text-background antialiased selection:bg-amber-600`}
      >
        <div className="flex min-h-screen flex-col justify-between">
          <Navbar />
          <main className="flex w-full flex-grow flex-col items-center pb-12">
            <div className="w-full max-w-6xl">{children}</div>
          </main>
          <Analytics />
          <Footer />
        </div>
      </body>
    </html>
  );
}
