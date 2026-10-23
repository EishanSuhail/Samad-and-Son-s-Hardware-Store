import type { Metadata } from "next";
import { Archivo, Public_Sans } from "next/font/google";
import "./globals.css";
import { BUSINESS } from "@/lib/business";

const heading = Archivo({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-heading", display: "swap" });
const body = Public_Sans({ subsets: ["latin"], variable: "--font-body", display: "swap" });

// Settings and catalogue are edited from the admin panel, so pages must always render fresh.
export const dynamic = "force-dynamic";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${BUSINESS.name} — Hardware Store in Peerpora, Ganderbal`,
    template: `%s | ${BUSINESS.name}`,
  },
  description:
    "Paints, PVC and PPR pipes, plywood, wall putty, POP, tools and everyday hardware at Peerpora, Ganderbal, opposite J&K Bank. Enquire on WhatsApp for availability and prices.",
  openGraph: { siteName: BUSINESS.name, type: "website", locale: "en_IN" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${heading.variable} ${body.variable}`}>
      <body className="flex min-h-screen flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:font-semibold"
        >
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
