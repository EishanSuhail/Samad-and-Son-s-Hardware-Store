import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "../db";
import { IMPORT_COLUMNS, previewImport, type ImportPreview } from "../product-import";
import { executeImport, loadImportLookups } from "../product-import-db";

const PREFIX = "IMPTEST-";
let adminId: string;

const row = (o: Record<string, string>) => IMPORT_COLUMNS.map((c) => `"${(o[c] ?? "").replace(/"/g, '""')}"`).join(",");
const csv = (...rows: Record<string, string>[]) => [IMPORT_COLUMNS.join(","), ...rows.map(row)].join("\n");

async function cleanup() {
  await db.product.deleteMany({ where: { sku: { startsWith: PREFIX } } });
  await db.brand.deleteMany({ where: { name: "ImpTest Brand" } });
}

beforeAll(async () => {
  await cleanup();
  await db.category.upsert({ where: { slug: "imp-test-cat" }, update: {}, create: { name: "Imp Test Cat", slug: "imp-test-cat" } });
  await db.unit.upsert({ where: { name: "Bag" }, update: {}, create: { name: "Bag", shortName: "bag" } });
  await db.adminUser.deleteMany({ where: { email: "imp@example.test" } });
  adminId = (await db.adminUser.create({ data: { email: "imp@example.test", name: "Imp", passwordHash: "x" } })).id;
});
afterAll(async () => {
  await cleanup();
  await db.category.deleteMany({ where: { slug: "imp-test-cat" } });
  await db.adminUser.deleteMany({ where: { email: "imp@example.test" } });
  await db.$disconnect();
});

describe("executeImport", () => {
  it("creates products with brand, specs, price and an IMPORT stock movement", async () => {
    const preview = previewImport(
      csv(
        { sku: `${PREFIX}1`, name: "Imp Putty", category: "Imp Test Cat", unit: "Bag", brand: "ImpTest Brand", price: "900", stock: "12", specs: "Pack weight=20 kg; Grade=A", featured: "yes" },
        { sku: `${PREFIX}2`, name: "Imp Plain", category: "imp-test-cat", unit: "bag" },
      ),
      await loadImportLookups(),
      "upsert",
    );
    expect(preview.counts).toMatchObject({ create: 2, error: 0 });
    const summary = await executeImport(preview, adminId);
    expect(summary).toMatchObject({ created: 2, updated: 0, failed: 0 });

    const p1 = await db.product.findUniqueOrThrow({ where: { sku: `${PREFIX}1` }, include: { brand: true, attributes: true } });
    expect(p1).toMatchObject({ pricePaise: 90000, pricingMode: "FIXED", stockQuantity: 12, trackInventory: true, isFeatured: true, unit: "Bag" });
    expect(p1.brand?.name).toBe("ImpTest Brand");
    expect(p1.attributes.map((a) => `${a.name}=${a.value}`).sort()).toEqual(["Grade=A", "Pack weight=20 kg"]);
    expect(await db.inventoryMovement.findFirstOrThrow({ where: { productId: p1.id } })).toMatchObject({ type: "IMPORT", quantityChange: 12, quantityAfter: 12 });

    const p2 = await db.product.findUniqueOrThrow({ where: { sku: `${PREFIX}2` } });
    expect(p2).toMatchObject({ pricingMode: "PRICE_ON_REQUEST", pricePaise: null, trackInventory: false });
  });

  it("on update, blank cells keep current values and given cells change them", async () => {
    const preview = previewImport(
      csv({ sku: `${PREFIX}1`, name: "Imp Putty Renamed", category: "Imp Test Cat", unit: "Bag", stock: "20" }),
      await loadImportLookups(),
      "upsert",
    );
    expect(preview.rows[0].action).toBe("update");
    expect(await executeImport(preview, adminId)).toMatchObject({ created: 0, updated: 1 });
    const p = await db.product.findUniqueOrThrow({ where: { sku: `${PREFIX}1` }, include: { attributes: true, brand: true } });
    expect(p.name).toBe("Imp Putty Renamed");
    expect(p.pricePaise).toBe(90000); // blank price kept
    expect(p.isFeatured).toBe(true); // blank featured kept
    expect(p.attributes).toHaveLength(2); // blank specs kept
    expect(p.brand?.name).toBe("ImpTest Brand");
    expect(p.stockQuantity).toBe(20);
    const ms = await db.inventoryMovement.findMany({ where: { productId: p.id }, orderBy: { createdAt: "asc" } });
    expect(ms.map((m) => m.quantityChange)).toEqual([12, 8]);
  });

  it("skips existing SKUs in create-only mode and never writes error rows", async () => {
    const preview = previewImport(
      csv(
        { sku: `${PREFIX}1`, name: "Should not change", category: "Imp Test Cat", unit: "Bag" },
        { sku: `${PREFIX}3`, name: "Bad row", category: "Nope", unit: "Bag" },
        { sku: `${PREFIX}4`, name: "Imp Four", category: "Imp Test Cat", unit: "Bag" },
      ),
      await loadImportLookups(),
      "create_only",
    );
    const summary = await executeImport(preview, adminId);
    expect(summary).toEqual({ created: 1, updated: 0, skipped: 1, failed: 1 });
    expect((await db.product.findUniqueOrThrow({ where: { sku: `${PREFIX}1` } })).name).toBe("Imp Putty Renamed");
    expect(await db.product.findUnique({ where: { sku: `${PREFIX}3` } })).toBeNull();
    expect(await db.product.findUnique({ where: { sku: `${PREFIX}4` } })).not.toBeNull();
  });

  it("is all-or-nothing: a database failure part-way leaves nothing behind", async () => {
    const good = previewImport(csv({ sku: `${PREFIX}5`, name: "Imp Five", category: "Imp Test Cat", unit: "Bag" }), await loadImportLookups(), "upsert");
    const broken = previewImport(csv({ sku: `${PREFIX}6`, name: "Imp Six", category: "Imp Test Cat", unit: "Bag" }), await loadImportLookups(), "upsert");
    broken.rows[0].product!.categoryId = "does-not-exist"; // forces a foreign-key failure on the second row
    const combined: ImportPreview = { rows: [...good.rows, ...broken.rows], counts: { create: 2, update: 0, skip: 0, error: 0 } };
    await expect(executeImport(combined, adminId)).rejects.toThrow();
    expect(await db.product.count({ where: { sku: { in: [`${PREFIX}5`, `${PREFIX}6`] } } })).toBe(0);
  });
});
