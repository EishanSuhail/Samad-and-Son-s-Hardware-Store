import { db } from "./db";
import type { CardProduct } from "./product-helpers";

/** Fields every product card needs. Keeps list queries light (first image only). */
export const CARD_SELECT = {
  id: true,
  slug: true,
  sku: true,
  name: true,
  unit: true,
  shortDescription: true,
  pricingMode: true,
  pricePaise: true,
  salePricePaise: true,
  trackInventory: true,
  stockQuantity: true,
  lowStockThreshold: true,
  isSample: true,
  category: { select: { name: true, slug: true } },
  brand: { select: { name: true } },
  images: { select: { url: true, altText: true }, orderBy: { sortOrder: "asc" as const }, take: 1 },
} as const;

export async function getActiveCategories() {
  return db.category.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      imageUrl: true,
      _count: { select: { products: { where: { isActive: true } } } },
    },
  });
}

export async function getFeaturedProducts(limit = 8): Promise<CardProduct[]> {
  return db.product.findMany({
    where: { isActive: true, isFeatured: true, category: { isActive: true } },
    orderBy: { updatedAt: "desc" },
    take: limit,
    select: CARD_SELECT,
  });
}
