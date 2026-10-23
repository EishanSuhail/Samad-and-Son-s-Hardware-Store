"use server";

import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { InsufficientStockError, applyStockChange, setStockTo } from "@/lib/inventory";

export interface AdjustState {
  ok?: boolean;
  message?: string;
}

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

export async function adjustStockAction(_prev: AdjustState, formData: FormData): Promise<AdjustState> {
  const admin = await requireAdmin();
  const productId = str(formData, "id");
  const mode = str(formData, "mode");
  const amountRaw = str(formData, "amount");
  const reason = str(formData, "reason").slice(0, 200);

  if (!/^-?\d{1,7}$/.test(amountRaw)) return { ok: false, message: "Enter a whole number." };
  const amount = Number(amountRaw);
  if (mode === "set" && amount < 0) return { ok: false, message: "Stock cannot be negative." };
  if (mode !== "set" && mode !== "add") return { ok: false, message: "Choose add or set." };
  if (mode === "add" && amount === 0) return { ok: false, message: "Enter a number other than 0." };

  const product = await db.product.findUnique({ where: { id: productId }, select: { trackInventory: true, sku: true } });
  if (!product) return { ok: false, message: "That product no longer exists." };
  if (!product.trackInventory) return { ok: false, message: "Turn on stock tracking for this product first." };

  try {
    const after = await db.$transaction((tx) =>
      mode === "set"
        ? setStockTo(tx, { productId, newQuantity: amount, type: "ADJUSTMENT", reason: reason || "Stock count", adminUserId: admin.id })
        : applyStockChange(tx, { productId, change: amount, type: "ADJUSTMENT", reason: reason || (amount > 0 ? "Stock added" : "Stock removed"), adminUserId: admin.id }),
    );
    await logAudit({ adminUserId: admin.id, action: "inventory.adjust", entity: "Product", entityId: productId, details: { sku: product.sku, mode, amount, after } });
    revalidatePath("/admin/inventory");
    return { ok: true, message: `Stock is now ${after}.` };
  } catch (error) {
    if (error instanceof InsufficientStockError) return { ok: false, message: "That would take stock below zero." };
    console.error("adjustStock failed", error);
    return { ok: false, message: "Could not update stock. Try again." };
  }
}

export async function updateThresholdAction(_prev: AdjustState, formData: FormData): Promise<AdjustState> {
  const admin = await requireAdmin();
  const productId = str(formData, "id");
  const value = str(formData, "threshold");
  if (!/^\d{1,7}$/.test(value)) return { ok: false, message: "Enter a whole number." };
  const n = await db.product.updateMany({ where: { id: productId }, data: { lowStockThreshold: Number(value) } });
  if (n.count === 0) return { ok: false, message: "That product no longer exists." };
  await logAudit({ adminUserId: admin.id, action: "inventory.threshold", entity: "Product", entityId: productId, details: { threshold: Number(value) } });
  revalidatePath("/admin/inventory");
  return { ok: true, message: "Saved." };
}
