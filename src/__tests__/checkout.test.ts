import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

let ipCounter = 0;
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined, set: vi.fn(), delete: vi.fn() }),
  headers: async () => new Headers({ "x-forwarded-for": `198.51.100.${(ipCounter % 250) + 1}` }),
}));

import { db } from "@/lib/db";
import { makeReference, mergeLines, priceLines } from "@/lib/checkout";
import { priceLinesAction, submitQuotationAction } from "@/app/(site)/checkout-actions";

const P = "CHK-";
const ids: Record<string, string> = {};
const fd = (o: Record<string, string>) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) f.append(k, v); return f; };

beforeAll(async () => {
  await db.quotation.deleteMany({ where: { customerName: { startsWith: "Chk " } } });
  await db.product.deleteMany({ where: { sku: { startsWith: P } } });
  await db.category.deleteMany({ where: { slug: { startsWith: "chk-" } } });
  const cat = await db.category.create({ data: { name: "Chk Cat", slug: "chk-cat", sortOrder: 9100 } });
  const dead = await db.category.create({ data: { name: "Chk Hidden", slug: "chk-hidden", sortOrder: 9101, isActive: false } });
  const mk = async (key: string, data: Record<string, unknown>) => {
    ids[key] = (await db.product.create({ data: { sku: `${P}${key}`, name: `Chk ${key}`, slug: `chk-${key.toLowerCase()}`, categoryId: cat.id, unit: "Piece", ...data } as never })).id;
  };
  await mk("FIX", { pricingMode: "FIXED", pricePaise: 10000 });
  await mk("SALE", { pricingMode: "FIXED", pricePaise: 10000, salePricePaise: 7550 });
  await mk("POR", { pricingMode: "PRICE_ON_REQUEST" });
  await mk("OUT", { pricingMode: "FIXED", pricePaise: 500, trackInventory: true, stockQuantity: 0 });
  await mk("LOW", { pricingMode: "FIXED", pricePaise: 500, trackInventory: true, stockQuantity: 3 });
  await mk("OFF", { pricingMode: "FIXED", pricePaise: 500, isActive: false });
  ids.HID = (await db.product.create({ data: { sku: `${P}HID`, name: "Chk HID", slug: "chk-hid", categoryId: dead.id, unit: "Piece", pricingMode: "FIXED", pricePaise: 900 } })).id;
});
afterAll(async () => {
  await db.quotation.deleteMany({ where: { customerName: { startsWith: "Chk " } } });
  await db.product.deleteMany({ where: { sku: { startsWith: P } } });
  await db.category.deleteMany({ where: { slug: { startsWith: "chk-" } } });
  await db.$disconnect();
});

describe("priceLines", () => {
  it("uses database prices (sale price when lower) and totals them exactly", async () => {
    const r = await priceLines([{ productId: ids.FIX, quantity: 3 }, { productId: ids.SALE, quantity: 2 }]);
    expect(r.lines.map((l) => [l.unitPricePaise, l.lineTotalPaise])).toEqual([[10000, 30000], [7550, 15100]]);
    expect(r.subtotalPaise).toBe(45100);
    expect(r.hasUnpricedItems).toBe(false);
    expect(r.hasProblems).toBe(false);
  });
  it("leaves Price on Request out of the total and flags it", async () => {
    const r = await priceLines([{ productId: ids.FIX, quantity: 1 }, { productId: ids.POR, quantity: 5 }]);
    expect(r.subtotalPaise).toBe(10000);
    expect(r.hasUnpricedItems).toBe(true);
    expect(r.lines[1].lineTotalPaise).toBeNull();
  });
  it("flags stock problems and unavailable products, and excludes unavailable ones from totals", async () => {
    const r = await priceLines([
      { productId: ids.OUT, quantity: 1 }, { productId: ids.LOW, quantity: 4 }, { productId: ids.OFF, quantity: 1 },
      { productId: ids.HID, quantity: 1 }, { productId: "does-not-exist", quantity: 1 },
    ]);
    const prob = Object.fromEntries(r.lines.map((l) => [l.sku, l.problem]));
    expect(prob).toMatchObject({ [`${P}OUT`]: "OUT_OF_STOCK", [`${P}LOW`]: "NOT_ENOUGH_STOCK", [`${P}OFF`]: "UNAVAILABLE", [`${P}HID`]: "UNAVAILABLE" });
    expect(r.lines).toHaveLength(4);
    expect(r.hasProblems).toBe(true);
    expect(r.subtotalPaise).toBe(500 * 1 + 500 * 4); // OUT/LOW still priced, archived/hidden are not
  });
  it("merges duplicate lines and caps quantity", () => {
    expect(mergeLines([{ productId: "a", quantity: 2 }, { productId: "a", quantity: 3 }, { productId: "b", quantity: 9999 }, { productId: "b", quantity: 5 }])).toEqual([
      { productId: "a", quantity: 5 }, { productId: "b", quantity: 9999 },
    ]);
  });
});

describe("priceLinesAction", () => {
  it("rejects malformed input", async () => {
    for (const bad of [null, [], "x", [{ productId: ids.FIX, quantity: 0 }], [{ productId: ids.FIX, quantity: 1.5 }], [{ productId: ids.FIX, quantity: 10000 }], Array(51).fill({ productId: "a", quantity: 1 })]) {
      expect((await priceLinesAction(bad)).ok).toBe(false);
    }
  });
  it("ignores any price or name the browser sends", async () => {
    const r = await priceLinesAction([{ productId: ids.FIX, quantity: 1, pricePaise: 1, name: "Free" }]);
    expect(r.ok && r.cart.lines[0]).toMatchObject({ name: "Chk FIX", unitPricePaise: 10000 });
  });
});

describe("makeReference", () => {
  it("is well-formed, unambiguous and varies", () => {
    const refs = new Set(Array.from({ length: 200 }, () => makeReference("QT")));
    expect(refs.size).toBeGreaterThan(190);
    for (const r of refs) expect(r).toMatch(/^QT-\d{6}-[2-9A-HJKMNP-Z]{5}$/);
    expect(makeReference("SH", new Date("2026-10-23T20:00:00Z"))).toMatch(/^SH-261024-/); // IST rolls to the next day
  });
});

describe("submitQuotationAction", () => {
  const good = (o: Record<string, string> = {}) => fd({
    lines: JSON.stringify([{ productId: ids.FIX, quantity: 2 }, { productId: ids.POR, quantity: 10 }, { productId: ids.OFF, quantity: 1 }]),
    customerName: "Chk Buyer", phone: "70068 39895", preferredContact: "PHONE", notes: "Bulk", website: "", ...o,
  });

  it("saves the request with server-side snapshots and returns a reference", async () => {
    ipCounter++;
    const r = await submitQuotationAction({}, good());
    expect(r.ok).toBe(true);
    expect(r.reference).toMatch(/^QT-/);
    expect(r.whatsappText).toContain(r.reference!);
    const q = await db.quotation.findUniqueOrThrow({ where: { reference: r.reference! }, include: { items: true } });
    expect(q).toMatchObject({ customerName: "Chk Buyer", phone: "917006839895", preferredContact: "PHONE", status: "NEW", notes: "Bulk" });
    expect(q.items.map((i) => [i.sku, i.productName, i.quantity]).sort()).toEqual([[`${P}FIX`, "Chk FIX", 2], [`${P}POR`, "Chk POR", 10]]);
  });
  it("validates customer details and saves nothing", async () => {
    ipCounter++;
    const before = await db.quotation.count();
    const r = await submitQuotationAction({}, good({ customerName: "", phone: "123" }));
    expect(r.ok).toBe(false);
    expect(Object.keys(r.fieldErrors!)).toEqual(expect.arrayContaining(["customerName", "phone"]));
    expect(r.reference).toBeUndefined();
    expect((await submitQuotationAction({}, good({ lines: "[]" }))).ok).toBe(false);
    expect((await submitQuotationAction({}, good({ lines: "not json" }))).ok).toBe(false);
    expect((await submitQuotationAction({}, good({ lines: JSON.stringify([{ productId: ids.OFF, quantity: 1 }]) }))).ok).toBe(false);
    expect(await db.quotation.count()).toBe(before);
  });
  it("silently refuses bots that fill the honeypot", async () => {
    ipCounter++;
    const before = await db.quotation.count();
    expect((await submitQuotationAction({}, good({ website: "http://spam" }))).ok).toBe(false);
    expect(await db.quotation.count()).toBe(before);
  });
  it("rate limits repeated submissions from one address", async () => {
    ipCounter += 300; // fresh IP bucket, then hold it constant
    const base = ipCounter;
    const results: boolean[] = [];
    for (let i = 0; i < 7; i++) { ipCounter = base; results.push(!!(await submitQuotationAction({}, good())).ok); }
    expect(results).toEqual([true, true, true, true, true, false, false]);
  });
});
