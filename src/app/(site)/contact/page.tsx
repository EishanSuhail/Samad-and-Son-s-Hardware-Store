import type { Metadata } from "next";
import Link from "next/link";
import { LocationSection } from "@/components/LocationSection";
import { WhatsAppLink } from "@/components/WhatsAppLink";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Contact Samad and Son's Hardware Store in Peerpora, Ganderbal, opposite J&K Bank, on WhatsApp or by phone.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const settings = await getSettings();
  return (
    <>
      <div className="mx-auto max-w-6xl px-4 pt-12 sm:px-6">
        <h1 className="text-3xl font-extrabold sm:text-4xl">Contact us</h1>
        <p className="mt-3 max-w-[60ch] text-lg text-muted">
          The quickest way to check availability and prices is WhatsApp. You can also{" "}
          <Link href="/quotation" className="font-semibold text-forest underline underline-offset-4">
            request a quotation
          </Link>{" "}
          for several items at once.
        </p>
        <WhatsAppLink
          number={settings.whatsappNumber}
          label="Chat on WhatsApp"
          message={`Assalamu Alaikum,\n\nI would like to enquire about products at ${settings.businessName}.`}
          className="mt-6 !min-h-12 !px-6 !text-base"
        />
        {settings.email && (
          <p className="mt-5 text-sm">
            Email:{" "}
            <a href={`mailto:${settings.email}`} className="font-semibold text-forest underline underline-offset-4">
              {settings.email}
            </a>
          </p>
        )}
      </div>
      <div className="mt-12">
        <LocationSection settings={settings} heading="Find the store" />
      </div>
    </>
  );
}
