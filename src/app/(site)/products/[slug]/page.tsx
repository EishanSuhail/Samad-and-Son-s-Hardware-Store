import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { ProductCard } from "@/components/ProductCard";
import { ProductGallery } from "@/components/ProductGallery";
import { ProductPurchasePanel } from "@/components/ProductPurchasePanel";
import { db } from "@/lib/db";
import { absoluteUrl } from "@/lib/site-url";
import { formatPaise } from "@/lib/money";
import { STOCK_LABEL, priceInfo, stockStatus } from "@/lib/product-helpers";
import { CARD_SELECT } from "@/lib/queries";
import { getSettings } from "@/lib/settings";

type Props = { params: Promise<{ slug: string }> };

async function getProduct(slug: string) {
  return db.product.findFirst({
    where: { slug, isActive: true, category: { isActive: true } },
    include: {
      category: true,
      brand: true,
      images: { orderBy: { sortOrder: "asc" } },
      attributes: { orderBy: { sortOrder: "asc" } },
    },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) return { title: "Product not found" };
  const description = p.shortDescription ?? `${p.name} available at Samad and Son's Hardware Store, Peerpora, Ganderbal.`;
  return {
    title: p.name,
    description,
    alternates: { canonical: `/products/${p.slug}` },
    robots: p.isSample ? { index: false, follow: false } : undefined,
    openGraph: { title: p.name, description, images: p.images[0] ? [p.images[0].url] : undefined },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const [settings, related] = await Promise.all([
    getSettings(),
    db.product.findMany({
      where: { isActive: true, categoryId: product.categoryId, id: { not: product.id } },
      orderBy: [{ isFeatured: "desc" }, { name: "asc" }],
      take: 4,
      select: CARD_SELECT,
    }),
  ]);

  const { current, original } = priceInfo({ ...product, images: [], category: product.category, brand: product.brand });
  const status = stockStatus(product);
  const stockLabel = settings.showStock ? STOCK_LABEL[status] : null;
  const description = product.description?.split(/\n{2,}/).filter(Boolean) ?? [];

  // Structured data uses only configured facts: no rating, and an offer only when a real price is set.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product.sku,
    description: product.shortDescription ?? product.description ?? undefined,
    category: product.category.name,
    brand: product.brand ? { "@type": "Brand", name: product.brand.name } : undefined,
    image: product.images.map((i) => i.url),
    offers:
      current != null
        ? {
            "@type": "Offer",
            priceCurrency: "INR",
            price: (current / 100).toFixed(2),
            availability:
              status === "OUT_OF_STOCK" ? "https://schema.org/OutOfStock" : status === "NOT_TRACKED" ? undefined : "https://schema.org/InStock",
          }
        : undefined,
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <JsonLd data={jsonLd} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
            { "@type": "ListItem", position: 2, name: product.category.name, item: absoluteUrl(`/categories/${product.category.slug}`) },
            { "@type": "ListItem", position: 3, name: product.name },
          ],
        }}
      />
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: product.category.name, href: `/categories/${product.category.slug}` },
          { label: product.name },
        ]}
      />

      <div className="mt-6 grid gap-10 md:grid-cols-2">
        <ProductGallery images={product.images.map((i) => ({ url: i.url, altText: i.altText }))} name={product.name} />

        <div>
          {product.isSample && (
            <p className="mb-3 inline-block rounded bg-tape px-2 py-0.5 text-xs font-bold">Sample data — not a real listing</p>
          )}
          <p className="text-sm font-semibold text-forest">
            <Link href={`/categories/${product.category.slug}`} className="hover:underline">
              {product.category.name}
            </Link>
            {product.brand && <span className="text-muted"> · {product.brand.name}</span>}
          </p>
          <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">{product.name}</h1>
          <p className="mt-1 text-sm text-muted">SKU: {product.sku}</p>
          {product.shortDescription && <p className="mt-4 max-w-[60ch] text-lg">{product.shortDescription}</p>}

          <div className="mt-5 flex flex-wrap items-baseline gap-x-3 border-y border-line py-4">
            {current != null ? (
              <>
                <span className="text-3xl font-extrabold">{formatPaise(current)}</span>
                {original != null && <span className="text-lg text-muted line-through">{formatPaise(original)}</span>}
                <span className="text-muted">per {product.unit}</span>
              </>
            ) : (
              <>
                <span className="text-2xl font-extrabold">Price on Request</span>
                <span className="text-muted">per {product.unit}. Send an enquiry or request a quotation.</span>
              </>
            )}
          </div>
          {product.isSample && current != null && <p className="mt-2 text-xs text-muted">Placeholder price for development only.</p>}
          {stockLabel && (
            <p className={`mt-3 text-sm font-bold ${status === "OUT_OF_STOCK" ? "text-danger" : status === "LOW_STOCK" ? "text-[#8a5a00]" : "text-forest"}`}>
              {stockLabel}
            </p>
          )}

          <div className="mt-6">
            <ProductPurchasePanel
              product={{ id: product.id, slug: product.slug, name: product.name, sku: product.sku, unit: product.unit, pricePaise: current }}
              outOfStock={status === "OUT_OF_STOCK"}
              whatsappNumber={settings.whatsappNumber}
            />
          </div>
        </div>
      </div>

      <div className="mt-12 grid gap-10 md:grid-cols-2">
        {description.length > 0 && (
          <section aria-labelledby="desc-heading">
            <h2 id="desc-heading" className="text-xl font-bold">
              Description
            </h2>
            <div className="mt-3 max-w-[64ch] space-y-3 leading-relaxed">
              {description.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </section>
        )}
        {(product.attributes.length > 0 || product.unit) && (
          <section aria-labelledby="spec-heading">
            <h2 id="spec-heading" className="text-xl font-bold">
              Specifications
            </h2>
            <dl className="mt-3 divide-y divide-line border-y border-line text-sm">
              {product.attributes.map((a) => (
                <div key={a.id} className="grid grid-cols-[40%_1fr] gap-3 py-2.5">
                  <dt className="font-semibold">{a.name}</dt>
                  <dd className="text-muted">{a.value}</dd>
                </div>
              ))}
              <div className="grid grid-cols-[40%_1fr] gap-3 py-2.5">
                <dt className="font-semibold">Sold per</dt>
                <dd className="text-muted">{product.unit}</dd>
              </div>
            </dl>
          </section>
        )}
      </div>

      {related.length > 0 && (
        <section aria-labelledby="related-heading" className="mt-16">
          <h2 id="related-heading" className="text-2xl font-extrabold">
            Related products
          </h2>
          <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((p) => (
              <li key={p.id}>
                <ProductCard product={p} whatsappNumber={settings.whatsappNumber} showStock={settings.showStock} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
