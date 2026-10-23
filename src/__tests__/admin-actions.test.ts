import bcrypt from "bcryptjs";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

let cookieValue: string | undefined;
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (cookieValue && name === "admin_session" ? { name, value: cookieValue } : undefined),
    set: vi.fn(),
    delete: vi.fn(),
  }),
  headers: async () => new Headers({ "x-forwarded-for": "203.0.113.9" }),
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { db } from "@/lib/db";
import { signSessionToken } from "@/lib/session-token";
import { saveSettingsAction } from "@/app/(admin)/admin/(panel)/settings/actions";
import { adjustStockAction } from "@/app/(admin)/admin/(panel)/inventory/actions";
import { deleteCategoryAction, moveCategoryAction, saveCategoryAction, toggleCategoryAction } from "@/app/(admin)/admin/(panel)/categories/actions";
import { bulkProductAction, deleteProductAction, saveProductAction, toggleProductActiveAction } from "@/app/(admin)/admin/(panel)/products/actions";

const P = "ACT-";
let ownerId: string;
let staffId: string;
let catA: string;
let catB: string;

const fd = (o: Record<string, string | string[]>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) (Array.isArray(v) ? v : [v]).forEach((x) => f.append(k, x));
  return f;
};
const productForm = (o: Record<string, string> = {}) =>
  fd({
    name: "Act Putty", sku: `${P}1`, slug: "", categoryId: catA, subcategory: "", brand: "", shortDescription: "", description: "",
    unit: "Bag", pricingMode: "PRICE_ON_REQUEST", price: "", salePrice: "", stockQuantity: "0", lowStockThreshold: "5",
    attributes: "[]", images: "[]", isActive: "on", ...o,
  });
const login = async (id: string, role: "OWNER" | "STAFF") => {
  cookieValue = await signSessionToken({ adminId: id, role });
};
const redirectOf = async (p: Promise<unknown>) => (await p.then(() => "", (e: Error) => e.message));

async function cleanup() {
  await db.orderItem.deleteMany({ where: { order: { reference: { startsWith: "ACT-" } } } });
  await db.order.deleteMany({ where: { reference: { startsWith: "ACT-" } } });
  await db.product.deleteMany({ where: { sku: { startsWith: P } } });
  await db.brand.deleteMany({ where: { name: { startsWith: "ActBrand" } } });
  await db.category.deleteMany({ where: { slug: { startsWith: "act-" } } });
}

beforeAll(async () => {
  await cleanup();
  await db.unit.upsert({ where: { name: "Bag" }, update: {}, create: { name: "Bag", shortName: "bag" } });
  await db.adminUser.deleteMany({ where: { email: { in: ["act-owner@example.test", "act-staff@example.test"] } } });
  const hash = await bcrypt.hash("x-irrelevant-1", 4);
  ownerId = (await db.adminUser.create({ data: { email: "act-owner@example.test", name: "Owner", role: "OWNER", passwordHash: hash } })).id;
  staffId = (await db.adminUser.create({ data: { email: "act-staff@example.test", name: "Staff", role: "STAFF", passwordHash: hash } })).id;
  catA = (await db.category.create({ data: { name: "Act Cat A", slug: "act-cat-a", sortOrder: 9001 } })).id;
  catB = (await db.category.create({ data: { name: "Act Cat B", slug: "act-cat-b", sortOrder: 9002 } })).id;
});
afterAll(async () => {
  await cleanup();
  await db.adminUser.deleteMany({ where: { email: { in: ["act-owner@example.test", "act-staff@example.test"] } } });
  await db.$disconnect();
});
beforeEach(async () => {
  await login(ownerId, "OWNER");
  await db.product.deleteMany({ where: { sku: { startsWith: P } } });
});

describe("authorisation on actions", () => {
  it("rejects every admin action when signed out", async () => {
    cookieValue = undefined;
    expect(await redirectOf(saveProductAction({}, productForm()))).toBe("REDIRECT:/admin/login");
    expect(await redirectOf(bulkProductAction(null, fd({ op: "archive", ids: "x" })))).toBe("REDIRECT:/admin/login");
    expect(await redirectOf(adjustStockAction({}, fd({ id: "x", mode: "add", amount: "1" })))).toBe("REDIRECT:/admin/login");
    expect(await redirectOf(saveCategoryAction({}, fd({ name: "Nope" })))).toBe("REDIRECT:/admin/login");
    expect(await db.product.count({ where: { sku: `${P}1` } })).toBe(0);
  });

  it("lets staff manage products but not delete them", async () => {
    await login(staffId, "STAFF");
    expect(await redirectOf(saveProductAction({}, productForm()))).toMatch(/^REDIRECT:\/admin\/products\//);
    const p = await db.product.findUniqueOrThrow({ where: { sku: `${P}1` } });
    expect(await redirectOf(deleteProductAction(fd({ id: p.id, confirm: "on" })))).toBe("REDIRECT:/admin?denied=1");
    expect(await db.product.count({ where: { id: p.id } })).toBe(1);
  });
});

describe("saveProductAction", () => {
  it("creates a product with brand, specs, price, stock and an opening-stock movement", async () => {
    const r = await redirectOf(
      saveProductAction({}, productForm({
        brand: "ActBrand One", pricingMode: "FIXED", price: "1,250.50", salePrice: "999", trackInventory: "on", stockQuantity: "12",
        attributes: JSON.stringify([{ name: "Pack weight", value: "20 kg" }]), subcategory: "Interior",
      })),
    );
    const p = await db.product.findUniqueOrThrow({ where: { sku: `${P}1` }, include: { brand: true, attributes: true } });
    expect(r).toBe(`REDIRECT:/admin/products/${p.id}?created=1`);
    expect(p).toMatchObject({ slug: "act-putty", pricePaise: 125050, salePricePaise: 99900, pricingMode: "FIXED", stockQuantity: 12, trackInventory: true, subcategory: "Interior" });
    expect(p.brand?.name).toBe("ActBrand One");
    expect(p.attributes).toMatchObject([{ name: "Pack weight", value: "20 kg" }]);
    expect(await db.inventoryMovement.findFirstOrThrow({ where: { productId: p.id } })).toMatchObject({ type: "INITIAL", quantityChange: 12 });
  });

  it("returns field errors and saves nothing for invalid input", async () => {
    const before = await db.product.count();
    const bad = await saveProductAction({}, productForm({ name: "", sku: "bad sku!", categoryId: "", pricingMode: "FIXED", price: "" }));
    expect(bad.ok).toBe(false);
    expect(Object.keys(bad.fieldErrors!)).toEqual(expect.arrayContaining(["name", "sku", "categoryId", "price"]));
    const sale = await saveProductAction({}, productForm({ pricingMode: "FIXED", price: "100", salePrice: "100" }));
    expect(sale.fieldErrors?.salePrice).toMatch(/lower/);
    const img = await saveProductAction({}, productForm({ images: JSON.stringify([{ url: "https://evil.example.com/x.jpg", altText: "" }]) }));
    expect(img.fieldErrors?.images).toBeTruthy();
    const attrs = await saveProductAction({}, productForm({ attributes: JSON.stringify([{ name: "A", value: "1" }, { name: "a", value: "2" }]) }));
    expect(attrs.fieldErrors?.attributes).toBeTruthy();
    expect(await db.product.count()).toBe(before);
  });

  it("refuses a duplicate SKU with a clear message and keeps the original", async () => {
    await redirectOf(saveProductAction({}, productForm({ name: "First" })));
    const dup = await saveProductAction({}, productForm({ name: "Second" }));
    expect(dup).toMatchObject({ ok: false, fieldErrors: { sku: expect.stringMatching(/already uses this SKU/) } });
    expect((await db.product.findMany({ where: { sku: `${P}1` } })).map((p) => p.name)).toEqual(["First"]);
  });

  it("gives products with the same name different web addresses", async () => {
    await redirectOf(saveProductAction({}, productForm({ sku: `${P}A`, name: "Twin" })));
    await redirectOf(saveProductAction({}, productForm({ sku: `${P}B`, name: "Twin" })));
    const slugs = (await db.product.findMany({ where: { sku: { in: [`${P}A`, `${P}B`] } } })).map((p) => p.slug).sort();
    expect(new Set(slugs).size).toBe(2);
  });

  it("edits a product and records a stock adjustment when quantity changes", async () => {
    await redirectOf(saveProductAction({}, productForm({ trackInventory: "on", stockQuantity: "10" })));
    const p = await db.product.findUniqueOrThrow({ where: { sku: `${P}1` } });
    const ok = await saveProductAction({}, productForm({ id: p.id, name: "Renamed", trackInventory: "on", stockQuantity: "4", pricingMode: "FIXED", price: "50" }));
    expect(ok.ok).toBe(true);
    const after = await db.product.findUniqueOrThrow({ where: { id: p.id } });
    expect(after).toMatchObject({ name: "Renamed", stockQuantity: 4, pricePaise: 5000 });
    const moves = await db.inventoryMovement.findMany({ where: { productId: p.id }, orderBy: { createdAt: "asc" } });
    expect(moves.map((m) => [m.type, m.quantityChange, m.quantityAfter])).toEqual([["INITIAL", 10, 10], ["ADJUSTMENT", -6, 4]]);
  });

  it("clears price when switching to Price on Request", async () => {
    await redirectOf(saveProductAction({}, productForm({ pricingMode: "FIXED", price: "75", salePrice: "60" })));
    const p = await db.product.findUniqueOrThrow({ where: { sku: `${P}1` } });
    await saveProductAction({}, productForm({ id: p.id, pricingMode: "PRICE_ON_REQUEST", price: "75" }));
    expect(await db.product.findUniqueOrThrow({ where: { id: p.id } })).toMatchObject({ pricingMode: "PRICE_ON_REQUEST", pricePaise: null, salePricePaise: null });
  });

  it("archives and republishes", async () => {
    await redirectOf(saveProductAction({}, productForm()));
    const p = await db.product.findUniqueOrThrow({ where: { sku: `${P}1` } });
    await toggleProductActiveAction(fd({ id: p.id }));
    expect((await db.product.findUniqueOrThrow({ where: { id: p.id } })).isActive).toBe(false);
    await toggleProductActiveAction(fd({ id: p.id }));
    expect((await db.product.findUniqueOrThrow({ where: { id: p.id } })).isActive).toBe(true);
  });
});

describe("deleteProductAction", () => {
  it("requires the confirmation box, then deletes while order history keeps its snapshot", async () => {
    await redirectOf(saveProductAction({}, productForm({ pricingMode: "FIXED", price: "10" })));
    const p = await db.product.findUniqueOrThrow({ where: { sku: `${P}1` } });
    await db.order.create({ data: { reference: "ACT-ORDER-1", customerName: "T", phone: "9999999999", items: { create: [{ productId: p.id, productName: "Act Putty", sku: `${P}1`, unit: "Bag", quantity: 2, unitPricePaise: 1000 }] } } });

    expect(await redirectOf(deleteProductAction(fd({ id: p.id })))).toBe(`REDIRECT:/admin/products/${p.id}?error=confirm`);
    expect(await db.product.count({ where: { id: p.id } })).toBe(1);

    expect(await redirectOf(deleteProductAction(fd({ id: p.id, confirm: "on" })))).toBe("REDIRECT:/admin/products?deleted=1");
    expect(await db.product.count({ where: { id: p.id } })).toBe(0);
    const item = await db.orderItem.findFirstOrThrow({ where: { order: { reference: "ACT-ORDER-1" } } });
    expect(item).toMatchObject({ productId: null, productName: "Act Putty", sku: `${P}1`, quantity: 2, unitPricePaise: 1000 });
  });
});

describe("bulkProductAction", () => {
  const mk = async (sku: string, extra: Record<string, string> = {}) => {
    await redirectOf(saveProductAction({}, productForm({ sku: `${P}${sku}`, name: `Bulk ${sku}`, ...extra })));
    return (await db.product.findUniqueOrThrow({ where: { sku: `${P}${sku}` } })).id;
  };

  it("requires a selection and a valid action", async () => {
    expect((await bulkProductAction(null, fd({ op: "archive" }))).ok).toBe(false);
    const id = await mk("X1");
    expect((await bulkProductAction(null, fd({ op: "", ids: id }))).ok).toBe(false);
    expect((await bulkProductAction(null, fd({ op: "price_set", value: "abc", ids: id }))).ok).toBe(false);
  });

  it("sets a price and clears sale prices", async () => {
    const a = await mk("P1", { pricingMode: "FIXED", price: "100", salePrice: "80" });
    const b = await mk("P2");
    const r = await bulkProductAction(null, fd({ op: "price_set", value: "250.50", ids: [a, b] }));
    expect(r.ok).toBe(true);
    expect(await db.product.findMany({ where: { id: { in: [a, b] } }, select: { pricePaise: true, salePricePaise: true, pricingMode: true } })).toEqual(
      expect.arrayContaining([{ pricePaise: 25050, salePricePaise: null, pricingMode: "FIXED" }]),
    );
    expect((await db.product.findUniqueOrThrow({ where: { id: b } })).pricePaise).toBe(25050);
  });

  it("changes prices by a percentage with exact rounding, leaves unpriced items alone", async () => {
    const priced = await mk("PC1", { pricingMode: "FIXED", price: "199.99", salePrice: "150" });
    const unpriced = await mk("PC2");
    const up = await bulkProductAction(null, fd({ op: "price_percent", value: "10", ids: [priced, unpriced] }));
    expect(up.ok).toBe(true);
    expect(await db.product.findUniqueOrThrow({ where: { id: priced } })).toMatchObject({ pricePaise: 21999, salePricePaise: 16500 });
    expect(await db.product.findUniqueOrThrow({ where: { id: unpriced } })).toMatchObject({ pricePaise: null, pricingMode: "PRICE_ON_REQUEST" });
    await bulkProductAction(null, fd({ op: "price_percent", value: "-50", ids: priced }));
    expect((await db.product.findUniqueOrThrow({ where: { id: priced } })).pricePaise).toBe(11000);
    expect((await bulkProductAction(null, fd({ op: "price_percent", value: "-95", ids: priced }))).ok).toBe(false);
    expect((await bulkProductAction(null, fd({ op: "price_percent", value: "0", ids: priced }))).ok).toBe(false);
  });

  it("sets stock with movement records, moves category, archives", async () => {
    const a = await mk("S1");
    const b = await mk("S2", { trackInventory: "on", stockQuantity: "7" });
    expect((await bulkProductAction(null, fd({ op: "stock_set", value: "25", ids: [a, b] }))).ok).toBe(true);
    expect(await db.product.findMany({ where: { id: { in: [a, b] } }, select: { stockQuantity: true, trackInventory: true } })).toEqual([
      { stockQuantity: 25, trackInventory: true },
      { stockQuantity: 25, trackInventory: true },
    ]);
    expect(await db.inventoryMovement.count({ where: { productId: { in: [a, b] }, reason: "Bulk stock update" } })).toBe(2);

    expect((await bulkProductAction(null, fd({ op: "category", value: catB, ids: [a, b] }))).ok).toBe(true);
    expect(await db.product.count({ where: { id: { in: [a, b] }, categoryId: catB } })).toBe(2);
    expect((await bulkProductAction(null, fd({ op: "category", value: "nope", ids: a }))).ok).toBe(false);

    expect((await bulkProductAction(null, fd({ op: "archive", ids: [a, b] }))).ok).toBe(true);
    expect(await db.product.count({ where: { id: { in: [a, b] }, isActive: false } })).toBe(2);
  });
});

describe("categories", () => {
  const form = (o: Record<string, string>) => fd({ name: "Act New", slug: "", description: "", image: "[]", isActive: "on", ...o });

  it("creates with the next sort order, rejects duplicates", async () => {
    const r = await redirectOf(saveCategoryAction({}, form({ name: "Act Cat C", slug: "act-cat-c" })));
    const c = await db.category.findUniqueOrThrow({ where: { slug: "act-cat-c" } });
    expect(r).toBe(`REDIRECT:/admin/categories/${c.id}?created=1`);
    const max = await db.category.aggregate({ _max: { sortOrder: true } });
    expect(c.sortOrder).toBe(max._max.sortOrder);
    expect((await saveCategoryAction({}, form({ name: "Act Cat C", slug: "act-other" }))).fieldErrors?.name).toMatch(/already/);
    expect((await saveCategoryAction({}, form({ name: "Another", slug: "act-cat-c" }))).fieldErrors?.slug).toMatch(/web address/);
    expect((await saveCategoryAction({}, form({ name: "x" }))).ok).toBe(false);
    expect((await saveCategoryAction({}, form({ image: JSON.stringify([{ url: "https://evil.example.com/a.png" }]) }))).ok).toBe(false);
  });

  it("moves a category up and down and toggles it", async () => {
    const order = async () => (await db.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true } })).map((c) => c.id);
    const before = await order();
    const i = before.indexOf(catB);
    await moveCategoryAction(fd({ id: catB, dir: "up" }));
    const after = await order();
    expect(after.indexOf(catB)).toBe(i - 1);
    await moveCategoryAction(fd({ id: catB, dir: "down" }));
    expect(await order()).toEqual(before);
    await toggleCategoryAction(fd({ id: catB }));
    expect((await db.category.findUniqueOrThrow({ where: { id: catB } })).isActive).toBe(false);
    await toggleCategoryAction(fd({ id: catB }));
  });

  it("blocks deleting a category that still has products", async () => {
    await redirectOf(saveProductAction({}, productForm()));
    expect(await redirectOf(deleteCategoryAction(fd({ id: catA })))).toBe(`REDIRECT:/admin/categories/${catA}?error=has-products`);
    expect(await db.category.count({ where: { id: catA } })).toBe(1);
    const empty = await db.category.create({ data: { name: "Act Empty", slug: "act-empty" } });
    await login(staffId, "STAFF");
    expect(await redirectOf(deleteCategoryAction(fd({ id: empty.id })))).toBe("REDIRECT:/admin?denied=1");
    await login(ownerId, "OWNER");
    expect(await redirectOf(deleteCategoryAction(fd({ id: empty.id })))).toBe("REDIRECT:/admin/categories");
    expect(await db.category.count({ where: { id: empty.id } })).toBe(0);
  });
});

describe("adjustStockAction", () => {
  it("adds, removes and sets stock; blocks negatives and untracked products", async () => {
    await redirectOf(saveProductAction({}, productForm({ trackInventory: "on", stockQuantity: "10" })));
    const p = await db.product.findUniqueOrThrow({ where: { sku: `${P}1` } });
    expect(await adjustStockAction({}, fd({ id: p.id, mode: "add", amount: "5", reason: "delivery" }))).toMatchObject({ ok: true, message: "Stock is now 15." });
    expect(await adjustStockAction({}, fd({ id: p.id, mode: "add", amount: "-3" }))).toMatchObject({ ok: true, message: "Stock is now 12." });
    expect(await adjustStockAction({}, fd({ id: p.id, mode: "set", amount: "40" }))).toMatchObject({ ok: true, message: "Stock is now 40." });
    expect((await adjustStockAction({}, fd({ id: p.id, mode: "add", amount: "-41" }))).ok).toBe(false);
    expect((await adjustStockAction({}, fd({ id: p.id, mode: "set", amount: "-1" }))).ok).toBe(false);
    expect((await adjustStockAction({}, fd({ id: p.id, mode: "add", amount: "abc" }))).ok).toBe(false);
    expect((await db.product.findUniqueOrThrow({ where: { id: p.id } })).stockQuantity).toBe(40);

    await redirectOf(saveProductAction({}, productForm({ sku: `${P}U`, name: "Untracked one" })));
    const u = await db.product.findUniqueOrThrow({ where: { sku: `${P}U` } });
    expect((await adjustStockAction({}, fd({ id: u.id, mode: "add", amount: "5" }))).message).toMatch(/tracking/);
  });
});

describe("saveSettingsAction images", () => {
  const form = (o: Record<string, string> = {}) =>
    fd({
      businessName: "Act Shop", founderName: "Act Founder", address: "Some address here", landmark: "", whatsappNumber: "7006839895", phoneNumber: "",
      email: "", businessHours: "", googleMapsUrl: "", aboutText: "A sufficiently long about text.", whyChooseUs: "One\nTwo",
      facebook: "", instagram: "", youtube: "", pickupEnabled: "on", showStock: "on", ...o,
    });
  it("only owners may save; rejects images from other hosts; stores the first uploaded image", async () => {
    await login(staffId, "STAFF");
    expect(await redirectOf(saveSettingsAction({}, form()))).toBe("REDIRECT:/admin?denied=1");
    await login(ownerId, "OWNER");
    const bad = await saveSettingsAction({}, form({ logoUrl: JSON.stringify([{ url: "https://evil.example.com/x.png" }]) }));
    expect(bad.ok).toBe(false);
    expect(bad.fieldErrors?.logoUrl).toBeTruthy();
    const name = "a".repeat(32) + ".png";
    const ok = await saveSettingsAction({}, form({ logoUrl: JSON.stringify([{ url: `/uploads/${name}` }]) }));
    expect(ok.ok).toBe(true);
    expect((await db.setting.findUniqueOrThrow({ where: { key: "logoUrl" } })).value).toBe(`/uploads/${name}`);
    const cleared = await saveSettingsAction({}, form({ logoUrl: "[]" }));
    expect(cleared.ok).toBe(true);
    expect((await db.setting.findUniqueOrThrow({ where: { key: "logoUrl" } })).value).toBe("");
    await db.setting.deleteMany({});
  });
});
