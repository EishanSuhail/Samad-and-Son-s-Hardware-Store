import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ProductListing } from "@/components/ProductListing";
import { listProducts, parseListingParams } from "@/lib/catalogue";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function getCategory(slug: string) {
  return db.category.findFirst({ where: { slug, isActive: true } });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategory(slug);
  if (!category) return { title: "Category not found" };
  return {
    title: category.name,
    description: `${category.description ?? category.name} Available at Samad and Son's Hardware Store, Peerpora, Ganderbal.`,
    alternates: { canonical: `/categories/${category.slug}` },
    openGraph: { title: category.name, images: category.imageUrl ? [category.imageUrl] : undefined },
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const category = await getCategory(slug);
  if (!category) notFound();

  const listing = parseListingParams(await searchParams);
  const [settings, result] = await Promise.all([getSettings(), listProducts(listing, category.slug)]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Categories", href: "/categories" }, { label: category.name }]} />
      <h1 className="mt-4 text-3xl font-extrabold sm:text-4xl">{category.name}</h1>
      {category.description && <p className="mb-8 mt-2 max-w-[62ch] text-muted">{category.description}</p>}
      <ProductListing
        basePath={`/categories/${category.slug}`}
        params={listing}
        result={result}
        whatsappNumber={settings.whatsappNumber}
        showStock={settings.showStock}
        fixedCategorySlug={category.slug}
      />
    </div>
  );
}
