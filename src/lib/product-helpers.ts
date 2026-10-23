import { effectivePricePaise } from "./money";

export type StockStatus = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" | "NOT_TRACKED";

export function stockStatus(p: { trackInventory: boolean; stockQuantity: number; lowStockThreshold: number }): StockStatus {
  if (!p.trackInventory) return "NOT_TRACKED";
  if (p.stockQuantity <= 0) return "OUT_OF_STOCK";
  if (p.stockQuantity <= p.lowStockThreshold) return "LOW_STOCK";
  return "IN_STOCK";
}

export const STOCK_LABEL: Record<StockStatus, string | null> = {
  IN_STOCK: "In stock",
  LOW_STOCK: "Low stock",
  OUT_OF_STOCK: "Out of stock",
  NOT_TRACKED: null,
};

export interface CardProduct {
  id: string;
  slug: string;
  sku: string;
  name: string;
  unit: string;
  shortDescription: string | null;
  pricingMode: "FIXED" | "PRICE_ON_REQUEST";
  pricePaise: number | null;
  salePricePaise: number | null;
  trackInventory: boolean;
  stockQuantity: number;
  lowStockThreshold: number;
  isSample: boolean;
  category: { name: string; slug: string };
  brand: { name: string } | null;
  images: { url: string; altText: string | null }[];
}

export function priceInfo(p: CardProduct) {
  const current = effectivePricePaise(p);
  const original = current != null && p.pricePaise != null && current < p.pricePaise ? p.pricePaise : null;
  return { current, original };
}
