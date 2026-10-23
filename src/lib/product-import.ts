import { parseCsv } from "./csv";
import { rupeesToPaise } from "./money";
import { slugify } from "./slug";

export const IMPORT_COLUMNS = [
  "sku",
  "name",
  "category",
  "subcategory",
  "brand",
  "unit",
  "short_description",
  "description",
  "price",
  "sale_price",
  "track_inventory",
  "stock",
  "low_stock_threshold",
  "featured",
  "active",
  "specs",
] as const;

export const REQUIRED_COLUMNS = ["sku", "name", "category", "unit"] as const;
export const MAX_IMPORT_ROWS = 2000;
export const MAX_IMPORT_BYTES = 500_000;

export const TEMPLATE_EXAMPLE = [
  "SAMPLE-100",
  "Example product name",
  "Wall Putty",
  "",
  "",
  "Bag",
  "Short description",
  "",
  "",
  "",
  "yes",
  "25",
  "5",
  "no",
  "yes",
  "Pack weight=20 kg; Intended application=Interior walls",
];

export interface ImportLookups {
  categories: { id: string; name: string; slug: string }[];
  units: string[];
  existingSkus: Set<string>;
}

export interface ImportProduct {
  sku: string;
  name: string;
  slug: string;
  categoryId: string;
  subcategory: string | null;
  brand: string | null;
  unit: string;
  shortDescription: string | null;
  description: string | null;
  pricePaise: number | null;
  salePricePaise: number | null;
  trackInventory: boolean;
  stockQuantity: number | null;
  lowStockThreshold: number | null;
  isFeatured: boolean | null;
  isActive: boolean | null;
  attributes: { name: string; value: string }[];
}

export interface ImportRowResult {
  rowNumber: number; // spreadsheet row, header = 1
  sku: string;
  name: string;
  action: "create" | "update" | "skip" | "error";
  errors: string[];
  product?: ImportProduct;
}

export type ImportMode = "upsert" | "create_only";

export interface ImportPreview {
  fatal?: string;
  rows: ImportRowResult[];
  counts: { create: number; update: number; skip: number; error: number };
}

const truthy = (v: string) => ["yes", "y", "true", "1"].includes(v.trim().toLowerCase());
const falsy = (v: string) => ["no", "n", "false", "0"].includes(v.trim().toLowerCase());

function parseBool(v: string, label: string, errors: string[]): boolean | null {
  if (v.trim() === "") return null;
  if (truthy(v)) return true;
  if (falsy(v)) return false;
  errors.push(`${label} must be yes or no.`);
  return null;
}

function parseInt0(v: string, label: string, errors: string[]): number | null {
  if (v.trim() === "") return null;
  if (!/^\d+$/.test(v.trim()) || Number(v) > 1_000_000) {
    errors.push(`${label} must be a whole number from 0 to 1,000,000.`);
    return null;
  }
  return Number(v);
}

function parseSpecs(v: string, errors: string[]): { name: string; value: string }[] {
  if (v.trim() === "") return [];
  const out: { name: string; value: string }[] = [];
  const seen = new Set<string>();
  for (const part of v.split(";")) {
    if (part.trim() === "") continue;
    const eq = part.indexOf("=");
    const name = eq > 0 ? part.slice(0, eq).trim() : "";
    const value = eq > 0 ? part.slice(eq + 1).trim() : "";
    if (!name || !value) {
      errors.push(`Specs must look like "Name=Value; Name=Value" (problem near "${part.trim().slice(0, 30)}").`);
      continue;
    }
    if (seen.has(name.toLowerCase())) {
      errors.push(`Spec "${name}" is listed twice.`);
      continue;
    }
    seen.add(name.toLowerCase());
    out.push({ name: name.slice(0, 60), value: value.slice(0, 200) });
  }
  return out.slice(0, 30);
}

/** Pure validation of CSV text. Nothing is written; the same function is re-run server-side before importing. */
export function previewImport(csvText: string, lookups: ImportLookups, mode: ImportMode): ImportPreview {
  const empty = { create: 0, update: 0, skip: 0, error: 0 };
  if (csvText.length > MAX_IMPORT_BYTES) return { fatal: "That file is too large. Split it into files under 500 KB.", rows: [], counts: empty };

  const table = parseCsv(csvText);
  if (table.length === 0) return { fatal: "The file is empty.", rows: [], counts: empty };

  const header = table[0].map((h) => h.trim().toLowerCase());
  const missing = REQUIRED_COLUMNS.filter((c) => !header.includes(c));
  if (missing.length) return { fatal: `Missing required column${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}. Download the template for the right layout.`, rows: [], counts: empty };
  const unknown = header.filter((h) => h && !(IMPORT_COLUMNS as readonly string[]).includes(h));
  if (unknown.length) return { fatal: `Unknown column${unknown.length > 1 ? "s" : ""}: ${unknown.join(", ")}. Download the template for the right layout.`, rows: [], counts: empty };
  if (new Set(header).size !== header.length) return { fatal: "A column name appears more than once.", rows: [], counts: empty };

  const dataRows = table.slice(1);
  if (dataRows.length === 0) return { fatal: "The file has a header but no products.", rows: [], counts: empty };
  if (dataRows.length > MAX_IMPORT_ROWS) return { fatal: `Too many rows (${dataRows.length}). Import at most ${MAX_IMPORT_ROWS} at a time.`, rows: [], counts: empty };

  const catByKey = new Map<string, { id: string }>();
  for (const c of lookups.categories) {
    catByKey.set(c.name.toLowerCase(), c);
    catByKey.set(c.slug.toLowerCase(), c);
  }
  const unitByKey = new Map(lookups.units.map((u) => [u.toLowerCase(), u]));
  const existing = new Set([...lookups.existingSkus].map((s) => s.toLowerCase()));
  const seenInFile = new Map<string, number>();
  const seenSlugs = new Map<string, number>();

  const rows: ImportRowResult[] = dataRows.map((cells, idx) => {
    const rowNumber = idx + 2;
    const get = (col: string) => (cells[header.indexOf(col)] ?? "").trim();
    const errors: string[] = [];

    const sku = get("sku");
    const name = get("name");
    if (!sku) errors.push("SKU is required.");
    else if (!/^[A-Za-z0-9][A-Za-z0-9._\-/]*$/.test(sku) || sku.length > 60) errors.push("SKU may only use letters, numbers and . _ - / (max 60 characters).");
    if (!name) errors.push("Name is required.");
    else if (name.length < 2 || name.length > 160) errors.push("Name must be 2 to 160 characters.");

    const skuKey = sku.toLowerCase();
    if (sku) {
      const first = seenInFile.get(skuKey);
      if (first) errors.push(`Duplicate SKU: also used on row ${first}.`);
      else seenInFile.set(skuKey, rowNumber);
    }

    const category = catByKey.get(get("category").toLowerCase());
    if (!get("category")) errors.push("Category is required.");
    else if (!category) errors.push(`Unknown category "${get("category")}". Use the exact category name.`);

    const unitRaw = get("unit");
    const unit = unitByKey.get(unitRaw.toLowerCase());
    if (!unitRaw) errors.push("Unit is required.");
    else if (!unit) errors.push(`Unknown unit "${unitRaw}". Known units: ${lookups.units.join(", ")}.`);

    const priceRaw = get("price");
    const salePriceRaw = get("sale_price");
    const pricePaise = priceRaw ? rupeesToPaise(priceRaw) : null;
    const salePricePaise = salePriceRaw ? rupeesToPaise(salePriceRaw) : null;
    if (priceRaw && pricePaise === null) errors.push("Price must be a number like 250 or 250.50.");
    if (pricePaise !== null && pricePaise <= 0) errors.push("Price must be greater than 0 (leave empty for Price on Request).");
    if (salePriceRaw && salePricePaise === null) errors.push("Sale price must be a number like 199 or 199.50.");
    if (salePricePaise !== null && pricePaise === null && priceRaw === "") errors.push("A sale price needs a regular price.");
    if (salePricePaise !== null && pricePaise !== null && salePricePaise >= pricePaise) errors.push("Sale price must be lower than the price.");

    const track = parseBool(get("track_inventory"), "track_inventory", errors);
    const stock = parseInt0(get("stock"), "stock", errors);
    const low = parseInt0(get("low_stock_threshold"), "low_stock_threshold", errors);
    const featured = parseBool(get("featured"), "featured", errors);
    const active = parseBool(get("active"), "active", errors);
    const attributes = parseSpecs(get("specs"), errors);

    const slug = slugify(name) || slugify(sku);
    const exists = existing.has(skuKey);
    if (!exists && sku) {
      const clash = seenSlugs.get(slug);
      if (clash) errors.push(`Another new product on row ${clash} would get the same web address. Make the names different.`);
      else seenSlugs.set(slug, rowNumber);
    }

    if (errors.length) return { rowNumber, sku, name, action: "error", errors };
    if (exists && mode === "create_only") return { rowNumber, sku, name, action: "skip", errors: [] };

    return {
      rowNumber,
      sku,
      name,
      action: exists ? "update" : "create",
      errors: [],
      product: {
        sku,
        name,
        slug,
        categoryId: category!.id,
        subcategory: get("subcategory") || null,
        brand: get("brand") || null,
        unit: unit!,
        shortDescription: get("short_description") || null,
        description: get("description") || null,
        pricePaise,
        salePricePaise,
        trackInventory: track ?? stock !== null,
        stockQuantity: stock,
        lowStockThreshold: low,
        isFeatured: featured,
        isActive: active,
        attributes,
      },
    };
  });

  const counts = { create: 0, update: 0, skip: 0, error: 0 };
  for (const r of rows) counts[r.action]++;
  return { rows, counts };
}
