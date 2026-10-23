import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "./db";
import { effectivePricePaise } from "./money";
import type { CardProduct } from "./product-helpers";
import { CARD_SELECT } from "./queries";

export const PAGE_SIZE = 12;
export const SORTS = ["relevance", "name_asc", "name_desc", "price_asc", "price_desc"] as const;
export type SortKey = (typeof SORTS)[number];

const optionalText = z.string().trim().max(100).optional().catch(undefined);
// Empty form fields arrive as "" — treat them as "not set" rather than 0.
const optionalNumber = z.preprocess(
  (v) => (v === "" || v === null ? undefined : v),
  z.coerce.number().min(0).max(10_000_000).optional().catch(undefined),
);

export const listingParamsSchema = z.object({
  q: optionalText,
  category: optionalText,
  brand: optionalText,
  type: optionalText,
  min: optionalNumber,
  max: optionalNumber,
  stock: z.enum(["in"]).optional().catch(undefined),
  sort: z.enum(SORTS).catch("relevance"),
  page: z.coerce.number().int().min(1).max(10000).catch(1),
});

export type ListingParams = z.infer<typeof listingParamsSchema>;

/** Next.js gives string | string[] | undefined per key; take the first value and validate. */
export function parseListingParams(raw: Record<string, string | string[] | undefined>): ListingParams {
  const flat: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(raw)) flat[k] = Array.isArray(v) ? v[0] : v;
  return listingParamsSchema.parse(flat);
}

/** Query-string for links that keep the current filters (drops defaults and empty values). */
export function toQueryString(params: Partial<ListingParams>, overrides: Partial<ListingParams> = {}): string {
  const merged = { ...params, ...overrides };
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) {
    if (v === undefined || v === "" || (k === "sort" && v === "relevance") || (k === "page" && v === 1)) continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

function buildWhere(params: ListingParams, fixedCategorySlug?: string): Prisma.ProductWhereInput {
  const and: Prisma.ProductWhereInput[] = [{ isActive: true }, { category: { isActive: true } }];

  const categorySlug = fixedCategorySlug ?? params.category;
  if (categorySlug) and.push({ category: { slug: categorySlug } });
  if (params.brand) and.push({ brand: { slug: params.brand } });
  if (params.type) and.push({ subcategory: { equals: params.type, mode: "insensitive" } });
  if (params.stock === "in") and.push({ OR: [{ trackInventory: false }, { stockQuantity: { gt: 0 } }] });

  const terms = (params.q ?? "").split(/\s+/).filter(Boolean).slice(0, 6);
  for (const term of terms) {
    const contains = { contains: term, mode: "insensitive" as const };
    and.push({
      OR: [
        { name: contains },
        { sku: contains },
        { shortDescription: contains },
        { subcategory: contains },
        { category: { name: contains } },
        { brand: { name: contains } },
        { attributes: { some: { OR: [{ name: contains }, { value: contains }] } } },
      ],
    });
  }
  return { AND: and };
}

function relevanceScore(c: { name: string; sku: string }, q: string): number {
  const query = q.toLowerCase();
  const name = c.name.toLowerCase();
  const sku = c.sku.toLowerCase();
  if (sku === query) return 100;
  if (name === query) return 90;
  if (name.startsWith(query)) return 70;
  if (name.includes(query)) return 50;
  if (sku.includes(query)) return 40;
  return 10;
}

export interface ListingResult {
  products: CardProduct[];
  total: number;
  page: number;
  pageCount: number;
}

/**
 * Database-backed product search. A light candidate query selects matching rows, which are then
 * filtered by effective price and sorted in code (effective price = sale price when lower), and
 * only the requested page of full card data is loaded.
 */
export async function listProducts(params: ListingParams, fixedCategorySlug?: string): Promise<ListingResult> {
  const candidates = await db.product.findMany({
    where: buildWhere(params, fixedCategorySlug),
    select: { id: true, name: true, sku: true, isFeatured: true, pricingMode: true, pricePaise: true, salePricePaise: true },
  });

  const minPaise = params.min != null ? Math.round(params.min * 100) : null;
  const maxPaise = params.max != null ? Math.round(params.max * 100) : null;
  const priceSort = params.sort === "price_asc" || params.sort === "price_desc";

  let rows = candidates.map((c) => ({ ...c, price: effectivePricePaise(c) }));

  // Price filters and price sorting only ever include products that have a price.
  if (minPaise != null || maxPaise != null || priceSort) {
    rows = rows.filter(
      (r) => r.price != null && (minPaise == null || r.price >= minPaise) && (maxPaise == null || r.price <= maxPaise),
    );
  }

  const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, "en", { sensitivity: "base" });
  switch (params.sort) {
    case "name_asc":
      rows.sort(byName);
      break;
    case "name_desc":
      rows.sort((a, b) => byName(b, a));
      break;
    case "price_asc":
      rows.sort((a, b) => a.price! - b.price! || byName(a, b));
      break;
    case "price_desc":
      rows.sort((a, b) => b.price! - a.price! || byName(a, b));
      break;
    default: {
      const q = (params.q ?? "").trim();
      rows.sort((a, b) => {
        const s = q ? relevanceScore(b, q) - relevanceScore(a, q) : 0;
        return s || Number(b.isFeatured) - Number(a.isFeatured) || byName(a, b);
      });
    }
  }

  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(params.page, pageCount);
  const ids = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((r) => r.id);

  const cards = await db.product.findMany({ where: { id: { in: ids } }, select: CARD_SELECT });
  const byId = new Map(cards.map((c) => [c.id, c]));
  const products = ids.map((id) => byId.get(id)).filter((p): p is CardProduct => Boolean(p));

  return { products, total, page, pageCount };
}

export async function getFilterOptions(categorySlug?: string) {
  const [brands, types] = await Promise.all([
    db.brand.findMany({
      where: { products: { some: { isActive: true } } },
      orderBy: { name: "asc" },
      select: { name: true, slug: true },
    }),
    db.product.findMany({
      where: { isActive: true, subcategory: { not: null }, ...(categorySlug ? { category: { slug: categorySlug } } : {}) },
      distinct: ["subcategory"],
      orderBy: { subcategory: "asc" },
      select: { subcategory: true },
    }),
  ]);
  return { brands, types: types.map((t) => t.subcategory!).filter(Boolean) };
}
