import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { CategoryCard } from "@/components/CategoryCard";
import { HeroArt } from "@/components/HeroArt";
import { JsonLd } from "@/components/JsonLd";
import { LocationSection } from "@/components/LocationSection";
import { ProductCard } from "@/components/ProductCard";
import { WhatsAppLink } from "@/components/WhatsAppLink";
import { BUSINESS } from "@/lib/business";
import { getActiveCategories, getFeaturedProducts } from "@/lib/queries";
import { absoluteUrl } from "@/lib/site-url";
import { getSettings } from "@/lib/settings";

export default async function HomePage() {
  const [settings, categories, featured] = await Promise.all([getSettings(), getActiveCategories(), getFeaturedProducts(8)]);

  // Only facts the owner has configured. No rating, geo-coordinates, price range or opening hours are invented.
  const phone = settings.phoneNumber || settings.whatsappNumber;
  const localBusiness = {
    "@context": "https://schema.org",
    "@type": "HardwareStore",
    name: settings.businessName,
    url: absoluteUrl("/"),
    founder: { "@type": "Person", name: settings.founderName },
    address: { "@type": "PostalAddress", streetAddress: settings.address, addressCountry: "IN" },
    telephone: phone ? `+${phone.replace(/\D/g, "")}` : undefined,
    email: settings.email || undefined,
    image: settings.logoUrl ? absoluteUrl(settings.logoUrl) : undefined,
    sameAs: Object.values(settings.socialLinks).length ? Object.values(settings.socialLinks) : undefined,
    hasMap: settings.googleMapsUrl || undefined,
  };

  return (
    <>
      <JsonLd data={localBusiness} />
      <section className="border-b border-line bg-stone">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.1fr_0.9fr] md:py-16">
          <div>
            <h1 className="hero-in max-w-[18ch] text-4xl font-extrabold sm:text-5xl lg:text-[3.4rem]">{BUSINESS.heroHeadline}</h1>
            <p className="hero-in hero-in-2 mt-5 max-w-[56ch] text-lg text-muted">{BUSINESS.heroSubtext}</p>
            <div className="hero-in hero-in-3 mt-8 flex flex-wrap gap-3">
              <Link
                href="/products"
                className="inline-flex min-h-12 items-center rounded-md bg-forest px-6 text-base font-semibold text-white hover:bg-forest-deep"
              >
                Explore Products
              </Link>
              <Link
                href="/quotation"
                className="inline-flex min-h-12 items-center rounded-md border-2 border-forest bg-white px-6 text-base font-semibold text-forest hover:bg-forest hover:text-white"
              >
                Request a Quotation
              </Link>
              <WhatsAppLink number={settings.whatsappNumber} label="Chat on WhatsApp" className="!min-h-12 !px-6 !text-base" />
            </div>
            <p className="hero-in hero-in-3 mt-5 text-sm text-muted">
              {settings.address} · {settings.landmark}
            </p>
          </div>
          <div className="hero-in hero-in-2 mx-auto w-full max-w-md md:max-w-none">
            <HeroArt />
          </div>
        </div>
      </section>

      <section aria-labelledby="categories-heading" className="mx-auto mt-16 max-w-6xl px-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="categories-heading" className="text-2xl font-extrabold sm:text-3xl">
              Shop by category
            </h2>
            <p className="mt-2 max-w-[60ch] text-muted">Paints and plumbing to plywood and fasteners. Pick a category to see what is listed.</p>
          </div>
          <Link href="/categories" className="text-sm font-semibold text-forest underline underline-offset-4">
            See all categories
          </Link>
        </div>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((c) => (
            <li key={c.id}>
              <CategoryCard category={c} />
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="featured-heading" className="mx-auto mt-16 max-w-6xl px-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="featured-heading" className="text-2xl font-extrabold sm:text-3xl">
            Featured products
          </h2>
          <Link href="/products" className="text-sm font-semibold text-forest underline underline-offset-4">
            Browse all products
          </Link>
        </div>
        {featured.length === 0 ? (
          <p className="mt-6 rounded-lg border border-dashed border-line p-8 text-center text-muted">
            No featured products yet. Browse the full range or ask us on WhatsApp.
          </p>
        ) : (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((p) => (
              <li key={p.id}>
                <ProductCard product={p} whatsappNumber={settings.whatsappNumber} showStock={settings.showStock} />
              </li>
            ))}
          </ul>
        )}
        {featured.some((p) => p.isSample) && (
          <p className="mt-4 text-xs text-muted">
            Products marked “Sample data” are development placeholders and will be replaced with the real inventory before launch.
          </p>
        )}
      </section>

      <section aria-labelledby="why-heading" className="mx-auto mt-16 max-w-6xl px-4 sm:px-6">
        <h2 id="why-heading" className="text-2xl font-extrabold sm:text-3xl">
          Why shop with us
        </h2>
        <ul className="mt-6 grid gap-x-8 gap-y-4 sm:grid-cols-2">
          {settings.whyChooseUs.map((point) => (
            <li key={point} className="flex items-start gap-3 border-t border-line pt-4">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-forest" aria-hidden="true" />
              <span className="font-semibold">{point}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-16">
        <LocationSection settings={settings} />
      </div>
    </>
  );
}
