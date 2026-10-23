"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { OrderStatus } from "@/generated/prisma/client";
import { logAudit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { ORDER_STATUS_LABEL, changeOrderStatus } from "@/lib/orders";

const STATUSES = Object.keys(ORDER_STATUS_LABEL) as OrderStatus[];
const back = (id: string, kind: "ok" | "err", text: string) => `/admin/orders/${id}?${kind}=${encodeURIComponent(text)}`;

export async function updateOrderStatusAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const to = String(formData.get("to") ?? "") as OrderStatus;
  if (!STATUSES.includes(to)) redirect(back(id, "err", "Choose a valid status."));
  if (to === "CANCELLED" && formData.get("confirmCancel") !== "on") redirect(back(id, "err", "Tick the box to confirm you want to cancel this order."));

  const result = await changeOrderStatus(id, to, admin.id);
  if (!result.ok) redirect(back(id, "err", result.message));
  await logAudit({ adminUserId: admin.id, action: "order.status", entity: "Order", entityId: id, details: { from: result.from, to: result.to } });
  revalidatePath("/admin/orders");
  revalidatePath("/admin/inventory");
  redirect(back(id, "ok", `Order is now “${ORDER_STATUS_LABEL[to]}”.`));
}

export async function saveOrderNotesAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const notes = String(formData.get("internalNotes") ?? "").trim().slice(0, 2000);
  const exists = await db.order.findUnique({ where: { id }, select: { id: true } });
  if (!exists) redirect("/admin/orders");
  await db.order.update({ where: { id }, data: { internalNotes: notes || null } });
  await logAudit({ adminUserId: admin.id, action: "order.notes", entity: "Order", entityId: id });
  redirect(back(id, "ok", "Notes saved."));
}
