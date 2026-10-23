import type { MovementType, Prisma } from "@/generated/prisma/client";

type Tx = Prisma.TransactionClient;

export class InsufficientStockError extends Error {
  constructor(public readonly items: { name: string; requested: number; available: number }[]) {
    super(`Not enough stock: ${items.map((i) => `${i.name} (need ${i.requested}, have ${i.available})`).join("; ")}`);
    this.name = "InsufficientStockError";
  }
}

interface StockChange {
  productId: string;
  change: number;
  type: MovementType;
  reason?: string;
  adminUserId?: string | null;
  orderId?: string | null;
}

/**
 * Atomically changes stock and records the movement. The increment is done by the database
 * (not read-modify-write in code), and a change that would take stock below zero throws, which
 * rolls back the surrounding transaction.
 */
export async function applyStockChange(tx: Tx, c: StockChange) {
  const updated = await tx.product.update({
    where: { id: c.productId },
    data: { stockQuantity: { increment: c.change } },
    select: { name: true, stockQuantity: true },
  });
  if (updated.stockQuantity < 0) {
    throw new InsufficientStockError([{ name: updated.name, requested: -c.change, available: updated.stockQuantity - c.change }]);
  }
  await tx.inventoryMovement.create({
    data: {
      productId: c.productId,
      type: c.type,
      quantityChange: c.change,
      quantityAfter: updated.stockQuantity,
      reason: c.reason,
      adminUserId: c.adminUserId ?? null,
      orderId: c.orderId ?? null,
    },
  });
  return updated.stockQuantity;
}

/** Sets stock to an exact number (stock-take). Locks the row so the recorded change is exact. */
export async function setStockTo(tx: Tx, p: { productId: string; newQuantity: number; type: MovementType; reason?: string; adminUserId?: string | null }) {
  const rows = await tx.$queryRaw<{ stockQuantity: number }[]>`SELECT "stockQuantity" FROM "Product" WHERE id = ${p.productId} FOR UPDATE`;
  if (rows.length === 0) throw new Error("Product not found");
  const change = p.newQuantity - rows[0].stockQuantity;
  if (change === 0) return rows[0].stockQuantity;
  return applyStockChange(tx, { productId: p.productId, change, type: p.type, reason: p.reason, adminUserId: p.adminUserId });
}

/**
 * Deducts stock for the tracked items of an order. Safe to call more than once for the same order:
 * an item already deducted is skipped, and the unique (orderId, productId, type) constraint on
 * InventoryMovement makes a concurrent duplicate fail instead of double-deducting.
 */
export async function deductStockForOrder(tx: Tx, orderId: string, adminUserId?: string | null) {
  const items = await tx.orderItem.findMany({
    where: { orderId, productId: { not: null } },
    select: { productId: true, quantity: true, product: { select: { trackInventory: true } } },
  });
  // Merge duplicate lines of the same product so one movement covers the order.
  const wanted = new Map<string, number>();
  for (const i of items) if (i.product?.trackInventory) wanted.set(i.productId!, (wanted.get(i.productId!) ?? 0) + i.quantity);

  const already = await tx.inventoryMovement.findMany({ where: { orderId, type: "ORDER_DEDUCTION" }, select: { productId: true } });
  const done = new Set(already.map((m) => m.productId));

  const shortages: { name: string; requested: number; available: number }[] = [];
  for (const [productId, qty] of wanted) {
    if (done.has(productId)) continue;
    const p = await tx.product.findUniqueOrThrow({ where: { id: productId }, select: { name: true, stockQuantity: true } });
    if (p.stockQuantity < qty) shortages.push({ name: p.name, requested: qty, available: p.stockQuantity });
  }
  if (shortages.length) throw new InsufficientStockError(shortages);

  for (const [productId, qty] of wanted) {
    if (done.has(productId)) continue;
    await applyStockChange(tx, { productId, change: -qty, type: "ORDER_DEDUCTION", reason: "Order confirmed", adminUserId, orderId });
  }
}

/** Puts back exactly what was deducted for an order (e.g. when it is cancelled). Idempotent. */
export async function restoreStockForOrder(tx: Tx, orderId: string, adminUserId?: string | null) {
  const deductions = await tx.inventoryMovement.findMany({ where: { orderId, type: "ORDER_DEDUCTION" } });
  const restored = await tx.inventoryMovement.findMany({ where: { orderId, type: "ORDER_RESTORE" }, select: { productId: true } });
  const done = new Set(restored.map((m) => m.productId));
  for (const d of deductions) {
    if (done.has(d.productId)) continue;
    await applyStockChange(tx, { productId: d.productId, change: -d.quantityChange, type: "ORDER_RESTORE", reason: "Order cancelled", adminUserId, orderId });
  }
}
