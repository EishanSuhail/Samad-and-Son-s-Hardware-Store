import type { Prisma } from "@/generated/prisma/client";
import { db } from "./db";
import { setStockTo } from "./inventory";
import type { ImportLookups, ImportPreview, ImportProduct } from "./product-import";
import { slugify } from "./slug";

export async function loadImportLookups(): Promise<ImportLookups> {
  const [categories, units, skus] = await Promise.all([
    db.category.findMany({ select: { id: true, name: true, slug: true } }),
    db.unit.findMany({ select: { name: true } }),
    db.product.findMany({ select: { sku: true } }),
  ]);
  return { categories, units: units.map((u) => u.name), existingSkus: new Set(skus.map((s) => s.sku)) };
}

async function uniqueSlug(tx: Prisma.TransactionClient, base: string) {
  const root = base || "product";
  for (let n = 0; n < 100; n++) {
    const candidate = n === 0 ? root : `${root}-${n + 1}`;
    if (!(await tx.product.findUnique({ where: { slug: candidate }, select: { id: true } }))) return candidate;
  }
  return `${root}-${Date.now()}`;
}

export interface ImportSummary {
  created: number;
  updated: number;
  skipped: number;
  failed: number;
}

/**
 * Writes the valid rows of an already-validated preview in ONE transaction, so a failure part-way
 * leaves the catalogue untouched. Rows with errors are never written.
 *
 * Updating an existing SKU: blank cells keep the current value (so a partial spreadsheet cannot wipe data).
 */
export async function executeImport(preview: ImportPreview, adminUserId: string): Promise<ImportSummary> {
  const summary: ImportSummary = { created: 0, updated: 0, skipped: preview.counts.skip, failed: preview.counts.error };
  const work = preview.rows.filter((r) => (r.action === "create" || r.action === "update") && r.product);

  await db.$transaction(
    async (tx) => {
      for (const row of work) {
        const p = row.product as ImportProduct;
        const brandId = p.brand
          ? (await tx.brand.upsert({ where: { name: p.brand }, update: {}, create: { name: p.brand, slug: slugify(p.brand) || `brand-${Date.now()}` } })).id
          : undefined;

        if (row.action === "create") {
          const created = await tx.product.create({
            data: {
              sku: p.sku,
              name: p.name,
              slug: await uniqueSlug(tx, p.slug),
              categoryId: p.categoryId,
              subcategory: p.subcategory,
              brandId: brandId ?? null,
              shortDescription: p.shortDescription,
              description: p.description,
              unit: p.unit,
              pricingMode: p.pricePaise != null ? "FIXED" : "PRICE_ON_REQUEST",
              pricePaise: p.pricePaise,
              salePricePaise: p.pricePaise != null ? p.salePricePaise : null,
              trackInventory: p.trackInventory,
              stockQuantity: 0,
              lowStockThreshold: p.lowStockThreshold ?? 5,
              isFeatured: p.isFeatured ?? false,
              isActive: p.isActive ?? true,
            },
          });
          if (p.trackInventory && (p.stockQuantity ?? 0) > 0) {
            await setStockTo(tx, { productId: created.id, newQuantity: p.stockQuantity!, type: "IMPORT", reason: "CSV import", adminUserId });
          }
          if (p.attributes.length) await tx.productAttribute.createMany({ data: p.attributes.map((a, i) => ({ productId: created.id, name: a.name, value: a.value, sortOrder: i })) });
          summary.created++;
        } else {
          const existing = await tx.product.findUniqueOrThrow({ where: { sku: p.sku } });
          const data: Prisma.ProductUncheckedUpdateInput = { name: p.name, categoryId: p.categoryId, unit: p.unit };
          if (p.subcategory !== null) data.subcategory = p.subcategory;
          if (brandId) data.brandId = brandId;
          if (p.shortDescription !== null) data.shortDescription = p.shortDescription;
          if (p.description !== null) data.description = p.description;
          if (p.pricePaise !== null) {
            data.pricingMode = "FIXED";
            data.pricePaise = p.pricePaise;
            if (p.salePricePaise !== null) data.salePricePaise = p.salePricePaise;
            else if (existing.salePricePaise !== null && existing.salePricePaise >= p.pricePaise) data.salePricePaise = null;
          } else if (p.salePricePaise !== null && existing.pricePaise !== null && p.salePricePaise < existing.pricePaise) {
            data.salePricePaise = p.salePricePaise;
          }
          if (p.lowStockThreshold !== null) data.lowStockThreshold = p.lowStockThreshold;
          if (p.isFeatured !== null) data.isFeatured = p.isFeatured;
          if (p.isActive !== null) data.isActive = p.isActive;
          if (p.stockQuantity !== null) data.trackInventory = true;
          await tx.product.update({ where: { id: existing.id }, data });
          if (p.stockQuantity !== null) {
            await setStockTo(tx, { productId: existing.id, newQuantity: p.stockQuantity, type: "IMPORT", reason: "CSV import", adminUserId });
          }
          if (p.attributes.length) {
            await tx.productAttribute.deleteMany({ where: { productId: existing.id } });
            await tx.productAttribute.createMany({ data: p.attributes.map((a, i) => ({ productId: existing.id, name: a.name, value: a.value, sortOrder: i })) });
          }
          summary.updated++;
        }
      }
    },
    { timeout: 120_000, maxWait: 10_000 },
  );
  return summary;
}
