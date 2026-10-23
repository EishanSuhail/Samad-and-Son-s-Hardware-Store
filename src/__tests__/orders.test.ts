import bcrypt from "bcryptjs";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

let cookieValue: string | undefined;
let ipCounter = 0;
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (cookieValue && name === "admin_session" ? { name, value: cookieValue } : undefined),
    set: vi.fn(), delete: vi.fn(),
  }),
  headers: async () => new Headers({ "x-forwarded-for": `192.0.2.${(ipCounter % 250) + 1}` }),
}));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`REDIRECT:${url}`); } }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { db } from "@/lib/db";
import { signSessionToken } from "@/lib/session-token";
import { allowedNextStatuses, changeOrderStatus } from "@/lib/orders";
import { submitOrderAction } from "@/app/(site)/checkout-actions";
import { saveOrderNotesAction, updateOrderStatusAction } from "@/app/(admin)/admin/(panel)/orders/actions";
import { saveQuotationAction } from "@/app/(admin)/admin/(panel)/quotations/actions";

const P = "ORD-";
const ids: Record<string, string> = {};
let adminId: string;
let staffId: string;
const fd = (o: Record<string, string>) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) f.append(k, v); return f; };
const redirectOf = async (p: Promise<unknown>) => await p.then(() => "", (e: Error) => e.message);
const stock = async (k: string) => (await db.product.findUniqueOrThrow({ where: { id: ids[k] } })).stockQuantity;
const setSetting = (key: string, value: unknown) => db.setting.upsert({ where: { key }, update: { value: value as never }, create: { key, value: value as never } });

async function cleanup() {
  await db.inventoryMovement.deleteMany({ where: { product: { sku: { startsWith: P } } } });
  await db.order.deleteMany({ where: { customerName: { startsWith: "Ord " } } });
  await db.quotation.deleteMany({ where: { customerName: { startsWith: "Ord " } } });
  await db.product.deleteMany({ where: { sku: { startsWith: P } } });
  await db.category.deleteMany({ where: { slug: "ord-cat" } });
  await db.adminUser.deleteMany({ where: { email: { startsWith: "ord-" } } });
}

beforeAll(async () => {
  await cleanup();
  const hash = await bcrypt.hash("irrelevant-1", 4);
  adminId = (await db.adminUser.create({ data: { email: "ord-owner@example.test", name: "Owner", role: "OWNER", passwordHash: hash } })).id;
  staffId = (await db.adminUser.create({ data: { email: "ord-staff@example.test", name: "Staff", role: "STAFF", passwordHash: hash } })).id;
  const cat = await db.category.create({ data: { name: "Ord Cat", slug: "ord-cat", sortOrder: 9200 } });
  const mk = async (k: string, data: Record<string, unknown>) => {
    ids[k] = (await db.product.create({ data: { sku: `${P}${k}`, name: `Ord ${k}`, slug: `ord-${k.toLowerCase()}`, categoryId: cat.id, unit: "Piece", pricingMode: "FIXED", pricePaise: 1000, ...data } as never })).id;
  };
  await mk("A", { trackInventory: true, stockQuantity: 10 });
  await mk("B", { trackInventory: true, stockQuantity: 2 });
  await mk("C", {});
});
afterAll(async () => { await cleanup(); await db.setting.deleteMany({}); await db.$disconnect(); });
beforeEach(async () => {
  cookieValue = await signSessionToken({ adminId, role: "OWNER" });
  await db.setting.deleteMany({});
  await db.inventoryMovement.deleteMany({ where: { product: { sku: { startsWith: P } } } });
  await db.order.deleteMany({ where: { customerName: { startsWith: "Ord " } } });
  await db.product.update({ where: { id: ids.A }, data: { stockQuantity: 10 } });
  await db.product.update({ where: { id: ids.B }, data: { stockQuantity: 2 } });
});

const order = async (items: [string, number][], extra: Record<string, unknown> = {}) =>
  db.order.create({
    data: {
      reference: `ORD-${Math.random().toString(36).slice(2, 8)}`, customerName: "Ord Test", phone: "917006839895", ...extra,
      items: { create: items.map(([k, q]) => ({ productId: ids[k], productName: `Ord ${k}`, sku: `${P}${k}`, unit: "Piece", quantity: q, unitPricePaise: 1000 })) },
    },
  });

describe("allowedNextStatuses", () => {
  it("moves forward only, uses the right step for pickup vs delivery, and freezes final states", () => {
    expect(allowedNextStatuses("PENDING", "PICKUP")).toEqual(["CONFIRMED", "PROCESSING", "READY_FOR_PICKUP", "COMPLETED", "CANCELLED"]);
    expect(allowedNextStatuses("PENDING", "DELIVERY")).toEqual(["CONFIRMED", "PROCESSING", "DISPATCHED", "COMPLETED", "CANCELLED"]);
    expect(allowedNextStatuses("PROCESSING", "PICKUP")).toEqual(["READY_FOR_PICKUP", "COMPLETED", "CANCELLED"]);
    expect(allowedNextStatuses("COMPLETED", "PICKUP")).toEqual([]);
    expect(allowedNextStatuses("CANCELLED", "DELIVERY")).toEqual([]);
  });
});

describe("changeOrderStatus", () => {
  it("deducts tracked stock once on confirm, with movements, ignoring untracked items", async () => {
    const o = await order([["A", 3], ["C", 5]]);
    expect(await changeOrderStatus(o.id, "CONFIRMED", adminId)).toMatchObject({ ok: true, to: "CONFIRMED" });
    expect(await stock("A")).toBe(7);
    expect(await changeOrderStatus(o.id, "PROCESSING", adminId)).toMatchObject({ ok: true });
    expect(await stock("A")).toBe(7); // not deducted twice
    const m = await db.inventoryMovement.findMany({ where: { orderId: o.id } });
    expect(m).toHaveLength(1);
    expect(m[0]).toMatchObject({ type: "ORDER_DEDUCTION", quantityChange: -3, quantityAfter: 7 });
  });

  it("refuses to confirm when stock is short and changes nothing", async () => {
    const o = await order([["A", 1], ["B", 5]]);
    const r = await changeOrderStatus(o.id, "CONFIRMED", adminId);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.message).toMatch(/Ord B/);
    expect((await db.order.findUniqueOrThrow({ where: { id: o.id } })).status).toBe("PENDING");
    expect(await stock("A")).toBe(10);
    expect(await stock("B")).toBe(2);
    expect(await db.inventoryMovement.count({ where: { orderId: o.id } })).toBe(0);
  });

  it("restores exactly what was deducted on cancel, and cancelling a pending order touches no stock", async () => {
    const o = await order([["A", 4]]);
    await changeOrderStatus(o.id, "CONFIRMED", adminId);
    expect(await stock("A")).toBe(6);
    expect(await changeOrderStatus(o.id, "CANCELLED", adminId)).toMatchObject({ ok: true });
    expect(await stock("A")).toBe(10);
    const p = await order([["A", 4]]);
    await changeOrderStatus(p.id, "CANCELLED", adminId);
    expect(await stock("A")).toBe(10);
    expect(await db.inventoryMovement.count({ where: { orderId: p.id } })).toBe(0);
  });

  it("rejects illegal transitions", async () => {
    const o = await order([["A", 1]]);
    expect((await changeOrderStatus(o.id, "DISPATCHED", adminId)).ok).toBe(false); // pickup order
    expect((await changeOrderStatus(o.id, "PENDING", adminId)).ok).toBe(false);
    await changeOrderStatus(o.id, "CANCELLED", adminId);
    expect((await changeOrderStatus(o.id, "CONFIRMED", adminId)).ok).toBe(false);
    expect((await changeOrderStatus("nope", "CONFIRMED", adminId)).ok).toBe(false);
  });

  it("never double-deducts when two admins confirm at once", async () => {
    const o = await order([["A", 6]]);
    const results = await Promise.all([changeOrderStatus(o.id, "CONFIRMED", adminId), changeOrderStatus(o.id, "CONFIRMED", adminId)]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(await stock("A")).toBe(4);
  });
});

describe("submitOrderAction", () => {
  const form = (o: Record<string, string> = {}) =>
    fd({ lines: JSON.stringify([{ productId: ids.A, quantity: 2 }, { productId: ids.C, quantity: 1 }]), customerName: "Ord Web", phone: "9876543210", fulfilment: "PICKUP", address: "", notes: "", website: "", ...o });

  it("saves a PENDING order with price snapshots and does NOT touch stock", async () => {
    ipCounter += 400;
    const r = await submitOrderAction({}, form());
    expect(r.ok).toBe(true);
    expect(r.reference).toMatch(/^SH-/);
    expect(r.subtotalPaise).toBe(3000);
    const o = await db.order.findUniqueOrThrow({ where: { reference: r.reference! }, include: { items: true } });
    expect(o).toMatchObject({ status: "PENDING", phone: "919876543210", fulfilment: "PICKUP", subtotalPaise: 3000, address: null });
    expect(o.items.map((i) => [i.sku, i.quantity, i.unitPricePaise]).sort()).toEqual([[`${P}A`, 2, 1000], [`${P}C`, 1, 1000]]);
    expect(await stock("A")).toBe(10);
  });

  it("honours the owner's switches and delivery rules", async () => {
    ipCounter += 400;
    await setSetting("orderSubmissionEnabled", false);
    expect((await submitOrderAction({}, form())).message).toMatch(/switched off/);
    await setSetting("orderSubmissionEnabled", true);
    expect((await submitOrderAction({}, form({ fulfilment: "DELIVERY", address: "House 1, Peerpora" }))).fieldErrors?.fulfilment).toBeTruthy(); // delivery disabled by default
    await setSetting("deliveryEnabled", true);
    expect((await submitOrderAction({}, form({ fulfilment: "DELIVERY", address: "x" }))).fieldErrors?.address).toBeTruthy();
    const ok = await submitOrderAction({}, form({ fulfilment: "DELIVERY", address: "House 1, Peerpora, Ganderbal" }));
    expect(ok.ok).toBe(true);
    expect((await db.order.findUniqueOrThrow({ where: { reference: ok.reference! } })).address).toBe("House 1, Peerpora, Ganderbal");
    await setSetting("pickupEnabled", false);
    expect((await submitOrderAction({}, form())).fieldErrors?.fulfilment).toBeTruthy();
  });

  it("blocks carts with stock problems, bad details and bots; saves nothing", async () => {
    ipCounter += 400;
    const before = await db.order.count();
    expect((await submitOrderAction({}, form({ lines: JSON.stringify([{ productId: ids.B, quantity: 9 }]) }))).ok).toBe(false);
    expect((await submitOrderAction({}, form({ customerName: "", phone: "1" }))).fieldErrors).toMatchObject({ customerName: expect.any(String), phone: expect.any(String) });
    expect((await submitOrderAction({}, form({ website: "spam" }))).ok).toBe(false);
    expect((await submitOrderAction({}, form({ lines: "[]" }))).ok).toBe(false);
    expect(await db.order.count()).toBe(before);
  });

  it("rate limits one address", async () => {
    ipCounter += 400;
    const base = ipCounter;
    const out: boolean[] = [];
    for (let i = 0; i < 7; i++) { ipCounter = base; out.push(!!(await submitOrderAction({}, form())).ok); }
    expect(out).toEqual([true, true, true, true, true, false, false]);
  });
});

describe("admin order and quotation actions", () => {
  it("require a signed-in admin", async () => {
    cookieValue = undefined;
    const o = await order([["A", 1]]);
    expect(await redirectOf(updateOrderStatusAction(fd({ id: o.id, to: "CONFIRMED" })))).toBe("REDIRECT:/admin/login");
    expect(await redirectOf(saveOrderNotesAction(fd({ id: o.id, internalNotes: "x" })))).toBe("REDIRECT:/admin/login");
    expect(await redirectOf(saveQuotationAction(fd({ id: "x", status: "NEW" })))).toBe("REDIRECT:/admin/login");
  });

  it("status update goes through stock rules, requires cancel confirmation, and writes an audit entry", async () => {
    const o = await order([["A", 2]]);
    expect(await redirectOf(updateOrderStatusAction(fd({ id: o.id, to: "CONFIRMED" })))).toMatch(/\?ok=/);
    expect(await stock("A")).toBe(8);
    expect(await redirectOf(updateOrderStatusAction(fd({ id: o.id, to: "CANCELLED" })))).toMatch(/\?err=.*confirm/);
    expect((await db.order.findUniqueOrThrow({ where: { id: o.id } })).status).toBe("CONFIRMED");
    expect(await redirectOf(updateOrderStatusAction(fd({ id: o.id, to: "CANCELLED", confirmCancel: "on" })))).toMatch(/\?ok=/);
    expect(await stock("A")).toBe(10);
    expect(await redirectOf(updateOrderStatusAction(fd({ id: o.id, to: "BOGUS" })))).toMatch(/\?err=/);
    expect(await db.auditLog.count({ where: { entity: "Order", entityId: o.id, action: "order.status" } })).toBe(2);
  });

  it("saves order notes and quotation responses with validation", async () => {
    const o = await order([["A", 1]]);
    await redirectOf(saveOrderNotesAction(fd({ id: o.id, internalNotes: "  call back  " })));
    expect((await db.order.findUniqueOrThrow({ where: { id: o.id } })).internalNotes).toBe("call back");

    const q = await db.quotation.create({ data: { reference: "QT-ORD-1", customerName: "Ord Q", phone: "917006839895" } });
    expect(await redirectOf(saveQuotationAction(fd({ id: q.id, status: "SENT_TO_CUSTOMER", quotedTotal: "12,500.50", adminResponse: "Total as discussed", internalNotes: "" })))).toMatch(/\?ok=/);
    expect(await db.quotation.findUniqueOrThrow({ where: { id: q.id } })).toMatchObject({ status: "SENT_TO_CUSTOMER", quotedTotalPaise: 1250050, adminResponse: "Total as discussed" });
    expect(await redirectOf(saveQuotationAction(fd({ id: q.id, status: "NEW", quotedTotal: "abc" })))).toMatch(/\?err=/);
    expect(await redirectOf(saveQuotationAction(fd({ id: q.id, status: "WRONG" })))).toMatch(/\?err=/);
    expect((await db.quotation.findUniqueOrThrow({ where: { id: q.id } })).status).toBe("SENT_TO_CUSTOMER");
    await db.quotation.delete({ where: { id: q.id } });
    void staffId;
  });
});
