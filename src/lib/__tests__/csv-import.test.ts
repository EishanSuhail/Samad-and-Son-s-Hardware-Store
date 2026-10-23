import { describe, expect, it } from "vitest";
import { csvCell, parseCsv, toCsv } from "../csv";
import { IMPORT_COLUMNS, previewImport, type ImportLookups } from "../product-import";

const lookups: ImportLookups = {
  categories: [
    { id: "c1", name: "Wall Putty", slug: "wall-putty" },
    { id: "c2", name: "PVC Pipes and Fittings", slug: "pvc-pipes-and-fittings" },
  ],
  units: ["Piece", "Bag", "Litre"],
  existingSkus: new Set(["EXIST-1"]),
};
const HEAD = IMPORT_COLUMNS.join(",");
const row = (o: Record<string, string>) => IMPORT_COLUMNS.map((c) => (o[c] ?? "").replace(/"/g, '""')).map((v) => `"${v}"`).join(",");
const csv = (...rows: Record<string, string>[]) => [HEAD, ...rows.map(row)].join("\n");
const good = { sku: "A-1", name: "Putty 20kg", category: "wall putty", unit: "bag" };

describe("CSV parsing and writing", () => {
  it("handles quotes, commas, newlines, CRLF and a BOM", () => {
    expect(parseCsv('﻿a,b\r\n"x, y","say ""hi""\nthere"\r\n')).toEqual([["a", "b"], ["x, y", 'say "hi"\nthere']]);
  });
  it("round-trips through toCsv", () => {
    const data = [["name", "note"], ["Pipe, 1\"", "line1\nline2"]];
    expect(parseCsv(toCsv(data))).toEqual(data);
  });
  it("neutralises spreadsheet formulas on export", () => {
    expect(csvCell("=HYPERLINK(\"http://x\")")).toBe("\"'=HYPERLINK(\"\"http://x\"\")\"");
    expect(csvCell("+91 7006839895")).toBe("'+91 7006839895");
    expect(csvCell(-5)).toBe("-5");
    expect(csvCell("plain")).toBe("plain");
  });
});

describe("previewImport validation", () => {
  it("accepts a valid row, matching category and unit case-insensitively", () => {
    const p = previewImport(csv({ ...good, price: "250.50", stock: "10", specs: "Pack weight=20 kg; Grade=A" }), lookups, "upsert");
    expect(p.counts).toEqual({ create: 1, update: 0, skip: 0, error: 0 });
    const r = p.rows[0].product!;
    expect(r).toMatchObject({ categoryId: "c1", unit: "Bag", pricePaise: 25050, stockQuantity: 10, trackInventory: true, slug: "putty-20kg" });
    expect(r.attributes).toEqual([{ name: "Pack weight", value: "20 kg" }, { name: "Grade", value: "A" }]);
  });

  it("reports row-level errors with the spreadsheet row number", () => {
    const p = previewImport(
      csv(
        good,
        { sku: "", name: "", category: "Nope", unit: "Crate", price: "abc" },
        { ...good, sku: "A-2", name: "Other", price: "100", sale_price: "150", stock: "-3", featured: "maybe" },
      ),
      lookups,
      "upsert",
    );
    expect(p.counts).toMatchObject({ create: 1, error: 2 });
    expect(p.rows[1].rowNumber).toBe(3);
    expect(p.rows[1].errors.join(" ")).toMatch(/SKU is required.*Name is required.*Unknown category.*Unknown unit.*Price must be a number/s);
    expect(p.rows[2].errors.join(" ")).toMatch(/Sale price must be lower.*stock must be a whole number.*featured must be yes or no/s);
  });

  it("detects duplicate SKUs inside the file (case-insensitive) and flags only the later row", () => {
    const p = previewImport(csv(good, { ...good, sku: "a-1", name: "Different" }), lookups, "upsert");
    expect(p.rows[0].action).toBe("create");
    expect(p.rows[1]).toMatchObject({ action: "error" });
    expect(p.rows[1].errors[0]).toMatch(/Duplicate SKU.*row 2/);
  });

  it("treats existing SKUs as updates, or skips them in create-only mode", () => {
    const file = csv({ ...good, sku: "exist-1" });
    expect(previewImport(file, lookups, "upsert").rows[0].action).toBe("update");
    expect(previewImport(file, lookups, "create_only").rows[0].action).toBe("skip");
  });

  it("rejects files with missing or unknown columns, or no data", () => {
    expect(previewImport("sku,name\nA,B", lookups, "upsert").fatal).toMatch(/Missing required column.*category, unit/);
    expect(previewImport(`${HEAD},evil\n`, lookups, "upsert").fatal).toMatch(/Unknown column/);
    expect(previewImport(HEAD, lookups, "upsert").fatal).toMatch(/no products/);
    expect(previewImport("", lookups, "upsert").fatal).toMatch(/empty/);
  });

  it("enforces size and row limits", () => {
    expect(previewImport("x".repeat(600_000), lookups, "upsert").fatal).toMatch(/too large/);
    const many = csv(...Array.from({ length: 2001 }, (_, i) => ({ ...good, sku: `S-${i}`, name: `Item ${i}` })));
    expect(previewImport(many, lookups, "upsert").fatal).toMatch(/Too many rows/);
  });

  it("flags two new products that would share a web address", () => {
    const p = previewImport(csv(good, { ...good, sku: "A-9" }), lookups, "upsert");
    expect(p.rows[1].errors.join(" ")).toMatch(/same web address/);
  });
});
