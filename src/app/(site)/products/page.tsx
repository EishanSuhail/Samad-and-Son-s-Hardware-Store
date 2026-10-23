import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ProductListing } from "@/components/ProductListing";
import { listProducts, parseListingParams } from "@/lib/catalogue";
import { getActiveCategories } from "@/lib/queries";
import { getSettings } from "@/lib/settings";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export const metadata: Metadata = {
  title: "Shop Products",
  description:
    "Browse paints, PVC and PPR pipes, plywood, wall putty, POP, tools and hardware from Samad and Son's Hardware Store, Peerpora, Ganderbal.",
  alternates: { canonical: "/products" },
};

export default async function ProductsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = parseListingParams(await searchParams);
  const [settings, categories, result] = await Promise.all([getSettings(), getActiveCategories(), listProducts(params)]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Shop Products" }]} />
      <h1 className="mt-4 text-3xl font-extrabold sm:text-4xl">{params.q ? `Results for “${params.q}”` : "Shop products"}</h1>
      <p className="mb-8 mt-2 max-w-[62ch] text-muted">
        Prices and stock shown are set by the store. If a product says Price on Request, send an enquiry and we will confirm the price.
      </p>
      <ProductListing
        basePath="/products"
        params={params}
        result={result}
        whatsappNumber={settings.whatsappNumber}
        showStock={settings.showStock}
        categories={categories.map(({ name, slug }) => ({ name, slug }))}
      />
    </div>
  );
}
