import type { FulfilmentMethod, OrderStatus } from "@/generated/prisma/client";
import { db } from "./db";
import { InsufficientStockError, deductStockForOrder, restoreStockForOrder } from "./inventory";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "New (awaiting confirmation)",
  CONFIRMED: "Confirmed",
  PROCESSING: "Being prepared",
  READY_FOR_PICKUP: "Ready for pickup",
  DISPATCHED: "Dispatched",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

/** Statuses at which the shop has committed the goods, so stock has been taken off the shelf. */
const STOCK_HELD: OrderStatus[] = ["CONFIRMED", "PROCESSING", "READY_FOR_PICKUP", "DISPATCHED", "COMPLETED"];

/** Statuses an order may move to next. PENDING cannot be re-entered; COMPLETED and CANCELLED are final. */
export function allowedNextStatuses(from: OrderStatus, fulfilment: FulfilmentMethod): OrderStatus[] {
  if (from === "COMPLETED" || from === "CANCELLED") return [];
  const all: OrderStatus[] = ["CONFIRMED", "PROCESSING", fulfilment === "PICKUP" ? "READY_FOR_PICKUP" : "DISPATCHED", "COMPLETED", "CANCELLED"];
  const order: OrderStatus[] = ["PENDING", "CONFIRMED", "PROCESSING", "READY_FOR_PICKUP", "DISPATCHED", "COMPLETED"];
  return all.filter((s) => s === "CANCELLED" || order.indexOf(s) > order.indexOf(from));
}

export type StatusChangeResult =
  | { ok: true; from: OrderStatus; to: OrderStatus }
  | { ok: false; message: string };

/**
 * Moves an order to a new status. Stock is deducted when the order first reaches a confirmed
 * status and put back when a confirmed order is cancelled; both happen in the same transaction
 * as the status change, so a stock shortage leaves the order untouched.
 */
export async function changeOrderStatus(orderId: string, to: OrderStatus, adminUserId: string): Promise<StatusChangeResult> {
  try {
    return await db.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`;
      if (rows.length === 0) return { ok: false as const, message: "Order not found." };
      const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, select: { status: true, fulfilment: true } });
      if (!allowedNextStatuses(order.status, order.fulfilment).includes(to)) {
        return { ok: false as const, message: `An order that is “${ORDER_STATUS_LABEL[order.status]}” cannot be changed to “${ORDER_STATUS_LABEL[to]}”.` };
      }
      if (STOCK_HELD.includes(to)) await deductStockForOrder(tx, orderId, adminUserId);
      if (to === "CANCELLED") await restoreStockForOrder(tx, orderId, adminUserId);
      await tx.order.update({ where: { id: orderId }, data: { status: to } });
      return { ok: true as const, from: order.status, to };
    });
  } catch (error) {
    if (error instanceof InsufficientStockError) {
      return { ok: false, message: `Not enough stock to confirm this order: ${error.items.map((i) => `${i.name} (needs ${i.requested}, have ${i.available})`).join("; ")}. Adjust stock first, or cancel the order.` };
    }
    throw error;
  }
}
