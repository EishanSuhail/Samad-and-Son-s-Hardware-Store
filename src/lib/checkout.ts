import { randomInt } from "node:crypto";
import { z } from "zod";
import { db } from "./db";
import type { LineProblem } from "./checkout-shared";
import { effectivePricePaise } from "./money";
import { normaliseWhatsappNumber } from "./whatsapp";

export const MAX_LINES = 50;
export const MAX_QTY = 9999;

export const lineInputSchema = z.object({
  productId: z.string().min(1).max(40),
  quantity: z.number().int().min(1).max(MAX_QTY),
});
export const linesInputSchema = z.array(lineInputSchema).min(1, "Add at least one product.").max(MAX_LINES, `You can include up to ${MAX_LINES} products.`);
export type LineInput = z.infer<typeof lineInputSchema>;

export interface PricedLine {
  productId: string;
  slug: string;
  name: string;
  sku: string;
  unit: string;
  quantity: number;
  /** Authoritative price per unit from the database; null = Price on Request. */
  unitPricePaise: number | null;
  lineTotalPaise: number | null;
  /** Stock currently available when tracked; null when not tracked. */
  availableQuantity: number | null;
  problem: LineProblem | null;
}

export interface PricedCart {
  lines: PricedLine[];
  /** Sum of lines that have a price. Estimated: unpriced lines are not included. */
  subtotalPaise: number;
  hasUnpricedItems: boolean;
  hasProblems: boolean;
}

/** Merges duplicate product ids (summing quantities, capped). */
export function mergeLines(lines: LineInput[]): LineInput[] {
  const map = new Map<string, number>();
  for (const l of lines) map.set(l.productId, Math.min(MAX_QTY, (map.get(l.productId) ?? 0) + l.quantity));
  return [...map].map(([productId, quantity]) => ({ productId, quantity }));
}

/**
 * Looks every product up in the database and returns server-trusted names, units and prices.
 * Anything the browser claimed about price or name is ignored. Archived or missing products are
 * flagged UNAVAILABLE and contribute nothing to totals.
 */
export async function priceLines(input: LineInput[]): Promise<PricedCart> {
  const merged = mergeLines(input);
  const products = await db.product.findMany({
    where: { id: { in: merged.map((l) => l.productId) } },
    select: {
      id: true, slug: true, name: true, sku: true, unit: true, pricingMode: true, pricePaise: true, salePricePaise: true,
      trackInventory: true, stockQuantity: true, isActive: true, category: { select: { isActive: true } },
    },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  const lines: PricedLine[] = [];
  for (const l of merged) {
    const p = byId.get(l.productId);
    if (!p) continue; // deleted: nothing trustworthy to show; the caller reports it via the count mismatch
    const available = p.isActive && p.category.isActive;
    const unit = available ? effectivePricePaise(p) : null;
    let problem: LineProblem | null = null;
    if (!available) problem = "UNAVAILABLE";
    else if (p.trackInventory && p.stockQuantity <= 0) problem = "OUT_OF_STOCK";
    else if (p.trackInventory && l.quantity > p.stockQuantity) problem = "NOT_ENOUGH_STOCK";
    lines.push({
      productId: p.id, slug: p.slug, name: p.name, sku: p.sku, unit: p.unit, quantity: l.quantity,
      unitPricePaise: unit,
      lineTotalPaise: unit != null && !problem?.startsWith("UNAV") ? unit * l.quantity : null,
      availableQuantity: p.trackInventory ? p.stockQuantity : null,
      problem,
    });
  }
  const live = lines.filter((l) => l.problem !== "UNAVAILABLE");
  return {
    lines,
    subtotalPaise: live.reduce((sum, l) => sum + (l.lineTotalPaise ?? 0), 0),
    hasUnpricedItems: live.some((l) => l.unitPricePaise == null),
    hasProblems: lines.some((l) => l.problem !== null) || lines.length !== merged.length,
  };
}

// Customer details ----------------------------------------------------------------------------

const customerPhone = z
  .string()
  .trim()
  .max(30)
  .refine((v) => normaliseWhatsappNumber(v) !== null, { message: "Enter a valid phone number, for example 7006839895." })
  .transform((v) => normaliseWhatsappNumber(v)!);

export const customerSchema = z.object({
  customerName: z.string().trim().min(2, "Enter your name.").max(100),
  phone: customerPhone,
  notes: z.string().trim().max(1000, "Keep notes under 1000 characters.").transform((v) => v || null),
});

// References ----------------------------------------------------------------------------------

// No 0/O/1/I so references are easy to read out over the phone.
const REF_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export function makeReference(prefix: "SH" | "QT", now = new Date()): string {
  const d = new Date(now.getTime() + 5.5 * 3_600_000); // IST date
  const ymd = `${String(d.getUTCFullYear()).slice(2)}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
  let tail = "";
  for (let i = 0; i < 5; i++) tail += REF_ALPHABET[randomInt(REF_ALPHABET.length)];
  return `${prefix}-${ymd}-${tail}`;
}

export { PROBLEM_TEXT, type LineProblem } from "./checkout-shared";
