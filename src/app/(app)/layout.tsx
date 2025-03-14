import type { Metadata } from "next";
import { DM_Sans, PT_Serif, Space_Grotesk } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/navbar";

export const metadata: Metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};

export const space_grotestk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const dm_sans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});
const pt_serif = PT_Serif({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-pt-serif",
});
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${dm_sans.variable} ${space_grotestk.variable} ${pt_serif.variable} antialiased`}
      >
        <div className="flex min-h-screen flex-col justify-between">
          <Navbar />
          {children}
          <footer className="">Footer</footer>
        </div>
      </body>
    </html>
  );
}
