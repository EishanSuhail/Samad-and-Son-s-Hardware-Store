import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

/** Public, indexable pages only: no cart, quotation or admin. Archived products and hidden categories are excluded. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, products] = await Promise.all([
    db.category.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } }),
    db.product.findMany({ where: { isActive: true, isSample: false, category: { isActive: true } }, select: { slug: true, updatedAt: true } }),
  ]);
  const fixed = ["", "/products", "/categories", "/about", "/contact", "/privacy", "/terms", "/returns"];
  return [
    ...fixed.map((p) => ({ url: `${base}${p}`, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.6 })),
    ...categories.map((c) => ({ url: `${base}/categories/${c.slug}`, lastModified: c.updatedAt, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...products.map((p) => ({ url: `${base}/products/${p.slug}`, lastModified: p.updatedAt, changeFrequency: "weekly" as const, priority: 0.8 })),
  ];
}
