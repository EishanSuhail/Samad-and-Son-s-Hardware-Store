"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { requireAdmin, requireOwner } from "@/lib/auth";
import { db } from "@/lib/db";
import { InsufficientStockError, setStockTo } from "@/lib/inventory";
import { rupeesToPaise } from "@/lib/money";
import { productFormSchema } from "@/lib/product-schema";
import { uniqueViolationInfo } from "@/lib/db-errors";
import { slugify } from "@/lib/slug";
import { Prisma } from "@/generated/prisma/client";

export interface ProductFormState {
  ok?: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
}

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "");
const flag = (fd: FormData, k: string) => fd.get(k) === "on";

async function uniqueSlug(base: string, excludeId?: string) {
  const root = base || "product";
  for (let n = 0; n < 50; n++) {
    const candidate = n === 0 ? root : `${root}-${n + 1}`;
    const clash = await db.product.findFirst({ where: { slug: candidate, ...(excludeId ? { id: { not: excludeId } } : {}) }, select: { id: true } });
    if (!clash) return candidate;
  }
  return `${root}-${Date.now()}`;
}

export async function saveProductAction(_prev: ProductFormState, formData: FormData): Promise<ProductFormState> {
  const admin = await requireAdmin();
  const id = str(formData, "id") || undefined;

  const parsed = productFormSchema.safeParse({
    name: str(formData, "name"),
    sku: str(formData, "sku"),
    slug: str(formData, "slug"),
    categoryId: str(formData, "categoryId"),
    subcategory: str(formData, "subcategory"),
    brand: str(formData, "brand"),
    shortDescription: str(formData, "shortDescription"),
    description: str(formData, "description"),
    unit: str(formData, "unit"),
    pricingMode: str(formData, "pricingMode"),
    price: str(formData, "price"),
    salePrice: str(formData, "salePrice"),
    trackInventory: flag(formData, "trackInventory"),
    stockQuantity: str(formData, "stockQuantity") || "0",
    lowStockThreshold: str(formData, "lowStockThreshold") || "5",
    isFeatured: flag(formData, "isFeatured"),
    isActive: flag(formData, "isActive"),
    attributes: str(formData, "attributes"),
    images: str(formData, "images"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0] ?? "form")] ??= issue.message;
    return { ok: false, message: "Some fields need attention. Nothing was saved.", fieldErrors };
  }
  const v = parsed.data;

  const [category, unit] = await Promise.all([
    db.category.findUnique({ where: { id: v.categoryId }, select: { id: true } }),
    db.unit.findUnique({ where: { name: v.unit }, select: { name: true } }),
  ]);
  if (!category) return { ok: false, message: "Nothing was saved.", fieldErrors: { categoryId: "That category no longer exists." } };
  if (!unit) return { ok: false, message: "Nothing was saved.", fieldErrors: { unit: "Choose one of the listed units." } };

  const fixed = v.pricingMode === "FIXED";
  const pricePaise = fixed ? rupeesToPaise(v.price) : null;
  const salePricePaise = fixed && v.salePrice !== "" ? rupeesToPaise(v.salePrice) : null;
  const slug = await uniqueSlug(v.slug || slugify(v.name) || slugify(v.sku), id);

  let savedId: string;
  try {
    savedId = await db.$transaction(async (tx) => {
      const brand = v.brand
        ? await tx.brand.upsert({ where: { name: v.brand }, update: {}, create: { name: v.brand, slug: slugify(v.brand) || `brand-${Date.now()}` } })
        : null;

      const data = {
        sku: v.sku,
        name: v.name,
        slug,
        categoryId: v.categoryId,
        subcategory: v.subcategory || null,
        brandId: brand?.id ?? null,
        shortDescription: v.shortDescription || null,
        description: v.description || null,
        unit: v.unit,
        pricingMode: v.pricingMode,
        pricePaise,
        salePricePaise,
        trackInventory: v.trackInventory,
        lowStockThreshold: v.lowStockThreshold,
        isFeatured: v.isFeatured,
        isActive: v.isActive,
      };

      let productId: string;
      if (id) {
        await tx.product.update({ where: { id }, data });
        productId = id;
        // Stock is changed through the inventory helper so every change leaves a movement record.
        if (v.trackInventory) {
          await setStockTo(tx, { productId, newQuantity: v.stockQuantity, type: "ADJUSTMENT", reason: "Edited in product form", adminUserId: admin.id });
        }
      } else {
        const created = await tx.product.create({ data: { ...data, stockQuantity: v.trackInventory ? v.stockQuantity : 0 } });
        productId = created.id;
        if (v.trackInventory && v.stockQuantity > 0) {
          await tx.inventoryMovement.create({
            data: { productId, type: "INITIAL", quantityChange: v.stockQuantity, quantityAfter: v.stockQuantity, reason: "Opening stock", adminUserId: admin.id },
          });
        }
      }

      await tx.productAttribute.deleteMany({ where: { productId } });
      if (v.attributes.length) {
        await tx.productAttribute.createMany({ data: v.attributes.map((a, i) => ({ productId, name: a.name, value: a.value, sortOrder: i })) });
      }
      await tx.productImage.deleteMany({ where: { productId } });
      if (v.images.length) {
        await tx.productImage.createMany({
          data: v.images.map((img, i) => ({ productId, url: img.url, altText: img.altText || null, sortOrder: i })),
        });
      }
      return productId;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const target = uniqueViolationInfo(error);
      if (target.includes("sku")) return { ok: false, message: "Nothing was saved.", fieldErrors: { sku: "Another product already uses this SKU." } };
      return { ok: false, message: "Nothing was saved.", fieldErrors: { slug: "Another product already uses this web address." } };
    }
    if (error instanceof InsufficientStockError) return { ok: false, message: "Nothing was saved.", fieldErrors: { stockQuantity: "Stock cannot be negative." } };
    console.error("saveProduct failed", error);
    return { ok: false, message: "Something went wrong and nothing was saved. Try again." };
  }

  await logAudit({ adminUserId: admin.id, action: id ? "product.update" : "product.create", entity: "Product", entityId: savedId, details: { sku: v.sku, name: v.name } });
  revalidatePath("/admin/products");
  if (!id) redirect(`/admin/products/${savedId}?created=1`);
  return { ok: true, message: "Product saved." };
}

export async function toggleProductActiveAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = str(formData, "id");
  const product = await db.product.findUnique({ where: { id }, select: { isActive: true, sku: true } });
  if (!product) return;
  await db.product.update({ where: { id }, data: { isActive: !product.isActive } });
  await logAudit({ adminUserId: admin.id, action: product.isActive ? "product.archive" : "product.unarchive", entity: "Product", entityId: id, details: { sku: product.sku } });
  revalidatePath("/admin/products");
}

/** Permanent delete is owner-only. Past orders keep their own name/price snapshot, so history is unaffected. */
export async function deleteProductAction(formData: FormData) {
  const admin = await requireOwner();
  const id = str(formData, "id");
  if (formData.get("confirm") !== "on") redirect(`/admin/products/${id}?error=confirm`);
  const product = await db.product.findUnique({ where: { id }, select: { sku: true, name: true } });
  if (!product) redirect("/admin/products");
  await db.product.delete({ where: { id } });
  await logAudit({ adminUserId: admin.id, action: "product.delete", entity: "Product", entityId: id, details: product });
  revalidatePath("/admin/products");
  redirect("/admin/products?deleted=1");
}

// ───────────── bulk actions on the product list ─────────────

export interface BulkResult {
  ok: boolean;
  message: string;
}

export async function bulkProductAction(_prev: BulkResult | null, formData: FormData): Promise<BulkResult> {
  const admin = await requireAdmin();
  const ids = formData.getAll("ids").map(String).filter(Boolean).slice(0, 500);
  const op = str(formData, "op");
  const value = str(formData, "value").trim();
  if (ids.length === 0) return { ok: false, message: "Select at least one product first." };

  try {
    switch (op) {
      case "price_set": {
        const paise = rupeesToPaise(value);
        if (paise === null || paise <= 0) return { ok: false, message: "Enter a price like 250 or 250.50." };
        const n = await db.product.updateMany({ where: { id: { in: ids } }, data: { pricingMode: "FIXED", pricePaise: paise, salePricePaise: null } });
        await logAudit({ adminUserId: admin.id, action: "product.bulk_price", entity: "Product", details: { count: n.count, setTo: paise } });
        return { ok: true, message: `Price set to ₹${(paise / 100).toFixed(2)} on ${n.count} product(s). Sale prices on them were cleared.` };
      }
      case "price_percent": {
        const pct = Number(value);
        if (!Number.isFinite(pct) || pct < -90 || pct > 500 || pct === 0) return { ok: false, message: "Enter a percentage between -90 and 500, for example 10 or -5." };
        // Integer maths in the database: new = round(old * (100 + pct) / 100). Products without a price are untouched.
        const factor = 100 + pct;
        const n = await db.$executeRaw`
          UPDATE "Product" SET
            "pricePaise" = GREATEST(1, ROUND("pricePaise" * ${factor}::numeric / 100)),
            "salePricePaise" = CASE WHEN "salePricePaise" IS NULL THEN NULL ELSE GREATEST(1, ROUND("salePricePaise" * ${factor}::numeric / 100)) END,
            "updatedAt" = NOW()
          WHERE id = ANY(${ids}) AND "pricingMode" = 'FIXED' AND "pricePaise" IS NOT NULL`;
        await db.$executeRaw`UPDATE "Product" SET "salePricePaise" = NULL WHERE id = ANY(${ids}) AND "salePricePaise" >= "pricePaise"`;
        await logAudit({ adminUserId: admin.id, action: "product.bulk_price", entity: "Product", details: { count: n, percent: pct } });
        return { ok: true, message: `Prices changed by ${pct}% on ${n} product(s). Products without a price were left alone.` };
      }
      case "stock_set": {
        if (!/^\d{1,7}$/.test(value)) return { ok: false, message: "Enter the stock as a whole number." };
        const qty = Number(value);
        await db.$transaction(async (tx) => {
          for (const productId of ids) {
            await tx.product.update({ where: { id: productId }, data: { trackInventory: true } });
            await setStockTo(tx, { productId, newQuantity: qty, type: "ADJUSTMENT", reason: "Bulk stock update", adminUserId: admin.id });
          }
        });
        await logAudit({ adminUserId: admin.id, action: "product.bulk_stock", entity: "Product", details: { count: ids.length, setTo: qty } });
        return { ok: true, message: `Stock set to ${qty} on ${ids.length} product(s).` };
      }
      case "category": {
        const category = await db.category.findUnique({ where: { id: value }, select: { name: true } });
        if (!category) return { ok: false, message: "Choose a category." };
        const n = await db.product.updateMany({ where: { id: { in: ids } }, data: { categoryId: value } });
        await logAudit({ adminUserId: admin.id, action: "product.bulk_category", entity: "Product", details: { count: n.count, category: category.name } });
        return { ok: true, message: `Moved ${n.count} product(s) to ${category.name}.` };
      }
      case "archive":
      case "unarchive": {
        const n = await db.product.updateMany({ where: { id: { in: ids } }, data: { isActive: op === "unarchive" } });
        await logAudit({ adminUserId: admin.id, action: `product.bulk_${op}`, entity: "Product", details: { count: n.count } });
        return { ok: true, message: `${op === "archive" ? "Archived" : "Published"} ${n.count} product(s).` };
      }
      default:
        return { ok: false, message: "Choose what to do with the selected products." };
    }
  } finally {
    revalidatePath("/admin/products");
  }
}
