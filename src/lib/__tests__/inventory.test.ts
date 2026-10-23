import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "../db";
import { InsufficientStockError, applyStockChange, deductStockForOrder, restoreStockForOrder, setStockTo } from "../inventory";

let categoryId: string;
let productId: string;
let untrackedId: string;
let orderId: string;

const stock = async (id = productId) => (await db.product.findUniqueOrThrow({ where: { id } })).stockQuantity;

beforeAll(async () => {
  await db.orderItem.deleteMany({ where: { order: { reference: { startsWith: "INV-TEST" } } } });
  await db.order.deleteMany({ where: { reference: { startsWith: "INV-TEST" } } });
  await db.product.deleteMany({ where: { sku: { startsWith: "INV-TEST" } } });
  const cat = await db.category.upsert({ where: { slug: "inv-test" }, update: {}, create: { name: "Inv Test", slug: "inv-test" } });
  categoryId = cat.id;
  productId = (await db.product.create({ data: { sku: "INV-TEST-1", name: "Tracked", slug: "inv-test-1", categoryId, trackInventory: true, stockQuantity: 10 } })).id;
  untrackedId = (await db.product.create({ data: { sku: "INV-TEST-2", name: "Untracked", slug: "inv-test-2", categoryId, trackInventory: false, stockQuantity: 0 } })).id;
});
afterAll(async () => {
  await db.orderItem.deleteMany({ where: { order: { reference: { startsWith: "INV-TEST" } } } });
  await db.order.deleteMany({ where: { reference: { startsWith: "INV-TEST" } } });
  await db.product.deleteMany({ where: { sku: { startsWith: "INV-TEST" } } });
  await db.category.deleteMany({ where: { slug: "inv-test" } });
  await db.$disconnect();
});
beforeEach(async () => {
  await db.inventoryMovement.deleteMany({ where: { productId: { in: [productId, untrackedId] } } });
  await db.product.update({ where: { id: productId }, data: { stockQuantity: 10 } });
  await db.orderItem.deleteMany({ where: { order: { reference: { startsWith: "INV-TEST" } } } });
  await db.order.deleteMany({ where: { reference: { startsWith: "INV-TEST" } } });
  const order = await db.order.create({
    data: {
      reference: `INV-TEST-${Date.now()}`,
      customerName: "T",
      phone: "9999999999",
      items: {
        create: [
          { productId, productName: "Tracked", sku: "INV-TEST-1", unit: "Piece", quantity: 3 },
          { productId: untrackedId, productName: "Untracked", sku: "INV-TEST-2", unit: "Piece", quantity: 5 },
        ],
      },
    },
  });
  orderId = order.id;
});

describe("stock adjustments", () => {
  it("records a movement with the resulting quantity", async () => {
    await db.$transaction((tx) => applyStockChange(tx, { productId, change: 5, type: "ADJUSTMENT", reason: "delivery" }));
    const m = await db.inventoryMovement.findFirstOrThrow({ where: { productId } });
    expect(m).toMatchObject({ quantityChange: 5, quantityAfter: 15, type: "ADJUSTMENT" });
    expect(await stock()).toBe(15);
  });

  it("refuses to go below zero and rolls everything back", async () => {
    await expect(db.$transaction((tx) => applyStockChange(tx, { productId, change: -11, type: "ADJUSTMENT" }))).rejects.toBeInstanceOf(InsufficientStockError);
    expect(await stock()).toBe(10);
    expect(await db.inventoryMovement.count({ where: { productId } })).toBe(0);
  });

  it("setStockTo records the exact difference and ignores no-op sets", async () => {
    await db.$transaction((tx) => setStockTo(tx, { productId, newQuantity: 4, type: "ADJUSTMENT", reason: "stock-take" }));
    await db.$transaction((tx) => setStockTo(tx, { productId, newQuantity: 4, type: "ADJUSTMENT" }));
    const ms = await db.inventoryMovement.findMany({ where: { productId } });
    expect(ms).toHaveLength(1);
    expect(ms[0]).toMatchObject({ quantityChange: -6, quantityAfter: 4 });
  });
});

describe("order stock deduction", () => {
  it("deducts only tracked items", async () => {
    await db.$transaction((tx) => deductStockForOrder(tx, orderId));
    expect(await stock()).toBe(7);
    expect(await stock(untrackedId)).toBe(0);
    expect(await db.inventoryMovement.count({ where: { orderId } })).toBe(1);
  });

  it("does not deduct twice when called again for the same order", async () => {
    await db.$transaction((tx) => deductStockForOrder(tx, orderId));
    await db.$transaction((tx) => deductStockForOrder(tx, orderId));
    await db.$transaction((tx) => deductStockForOrder(tx, orderId));
    expect(await stock()).toBe(7);
    expect(await db.inventoryMovement.count({ where: { orderId, type: "ORDER_DEDUCTION" } })).toBe(1);
  });

  it("does not double-deduct when two requests race (concurrent confirm clicks)", async () => {
    const results = await Promise.allSettled([
      db.$transaction((tx) => deductStockForOrder(tx, orderId)),
      db.$transaction((tx) => deductStockForOrder(tx, orderId)),
      db.$transaction((tx) => deductStockForOrder(tx, orderId)),
    ]);
    expect(results.some((r) => r.status === "fulfilled")).toBe(true);
    expect(await stock()).toBe(7);
    expect(await db.inventoryMovement.count({ where: { orderId, type: "ORDER_DEDUCTION" } })).toBe(1);
  });

  it("blocks confirmation when stock is short, naming the item, and changes nothing", async () => {
    await db.product.update({ where: { id: productId }, data: { stockQuantity: 2 } });
    const err = await db.$transaction((tx) => deductStockForOrder(tx, orderId)).catch((e) => e);
    expect(err).toBeInstanceOf(InsufficientStockError);
    expect(err.items).toEqual([{ name: "Tracked", requested: 3, available: 2 }]);
    expect(await stock()).toBe(2);
  });

  it("restores exactly what was deducted, once", async () => {
    await db.$transaction((tx) => deductStockForOrder(tx, orderId));
    await db.$transaction((tx) => restoreStockForOrder(tx, orderId));
    await db.$transaction((tx) => restoreStockForOrder(tx, orderId));
    expect(await stock()).toBe(10);
    expect(await db.inventoryMovement.count({ where: { orderId, type: "ORDER_RESTORE" } })).toBe(1);
  });

  it("restore does nothing if the order never deducted stock", async () => {
    await db.$transaction((tx) => restoreStockForOrder(tx, orderId));
    expect(await stock()).toBe(10);
  });
});
