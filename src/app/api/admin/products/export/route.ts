import { getCurrentAdmin } from "@/lib/auth";
import { toCsv } from "@/lib/csv";
import { db } from "@/lib/db";
import { paiseToRupeesString } from "@/lib/money";
import { IMPORT_COLUMNS, TEMPLATE_EXAMPLE } from "@/lib/product-import";

const yesNo = (b: boolean) => (b ? "yes" : "no");

// GET /api/admin/products/export          -> every product as CSV
// GET /api/admin/products/export?template=1 -> empty template with one example row
export async function GET(request: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) return new Response("Unauthorized", { status: 401 });

  const template = new URL(request.url).searchParams.get("template") === "1";
  let rows: (string | number | boolean | null)[][];

  if (template) {
    rows = [[...IMPORT_COLUMNS], TEMPLATE_EXAMPLE];
  } else {
    const products = await db.product.findMany({
      orderBy: { name: "asc" },
      include: { category: { select: { name: true } }, brand: { select: { name: true } }, attributes: { orderBy: { sortOrder: "asc" } } },
    });
    rows = [
      [...IMPORT_COLUMNS],
      ...products.map((p) => [
        p.sku,
        p.name,
        p.category.name,
        p.subcategory ?? "",
        p.brand?.name ?? "",
        p.unit,
        p.shortDescription ?? "",
        p.description ?? "",
        paiseToRupeesString(p.pricePaise),
        paiseToRupeesString(p.salePricePaise),
        yesNo(p.trackInventory),
        p.stockQuantity,
        p.lowStockThreshold,
        yesNo(p.isFeatured),
        yesNo(p.isActive),
        p.attributes.map((a) => `${a.name}=${a.value}`).join("; "),
      ]),
    ];
  }

  return new Response("﻿" + toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${template ? "products-template" : "products"}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
