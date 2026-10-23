import type { Metadata } from "next";
import { LocationSection } from "@/components/LocationSection";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Samad and Son's Hardware Store, founded by Suhail Ahmad Magray, supplies paints, plumbing materials, plywood and hardware in Peerpora, Ganderbal.",
  alternates: { canonical: "/about" },
};

export default async function AboutPage() {
  const settings = await getSettings();
  const paragraphs = settings.aboutText.split(/\n{2,}/).filter(Boolean);

  return (
    <>
      <div className="mx-auto max-w-6xl px-4 pt-12 sm:px-6">
        <h1 className="text-3xl font-extrabold sm:text-4xl">About {settings.businessName}</h1>
        <p className="mt-3 font-semibold text-forest">Founded by {settings.founderName}</p>

        <div className={`mt-8 grid gap-10 ${settings.founderPhotoUrl ? "md:grid-cols-[1fr_280px]" : ""}`}>
          <div className="max-w-[68ch] space-y-5 text-lg leading-relaxed">
            {paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          {settings.founderPhotoUrl && (
            <figure>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={settings.founderPhotoUrl}
                alt={`${settings.founderName}, founder of ${settings.businessName}`}
                className="w-full rounded-lg border border-line object-cover"
              />
              <figcaption className="mt-2 text-sm text-muted">{settings.founderName}, founder</figcaption>
            </figure>
          )}
        </div>
      </div>
      <div className="mt-14">
        <LocationSection settings={settings} />
      </div>
    </>
  );
}
