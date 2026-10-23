import { CATEGORY_SPEC_HINTS } from "./business";
import { db } from "./db";

/** Reference data the product form needs. */
export async function getProductFormLookups() {
  const [categories, units, brands] = await Promise.all([
    db.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true, slug: true } }),
    db.unit.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { name: true } }),
    db.brand.findMany({ orderBy: { name: "asc" }, select: { name: true } }),
  ]);
  const specHints: Record<string, string[]> = {};
  for (const c of categories) specHints[c.id] = CATEGORY_SPEC_HINTS[c.slug] ?? [];
  return { categories, units: units.map((u) => u.name), brands: brands.map((b) => b.name), specHints };
}

export function formatDateTime(d: Date) {
  return d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });
}
