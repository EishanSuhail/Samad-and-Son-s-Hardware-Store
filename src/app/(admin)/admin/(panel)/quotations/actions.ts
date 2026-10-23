"use server";

import { redirect } from "next/navigation";
import type { QuotationStatus } from "@/generated/prisma/client";
import { logAudit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { rupeesToPaise } from "@/lib/money";
import { QUOTATION_STATUS_LABEL } from "@/lib/quotations";

const back = (id: string, kind: "ok" | "err", text: string) => `/admin/quotations/${id}?${kind}=${encodeURIComponent(text)}`;

export async function saveQuotationAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as QuotationStatus;
  if (!(status in QUOTATION_STATUS_LABEL)) redirect(back(id, "err", "Choose a valid status."));

  const response = String(formData.get("adminResponse") ?? "").trim();
  const internal = String(formData.get("internalNotes") ?? "").trim();
  if (response.length > 3000 || internal.length > 2000) redirect(back(id, "err", "Text is too long."));

  const totalRaw = String(formData.get("quotedTotal") ?? "").trim();
  const quotedTotalPaise = totalRaw === "" ? null : rupeesToPaise(totalRaw);
  if (totalRaw !== "" && (quotedTotalPaise === null || quotedTotalPaise < 0 || quotedTotalPaise > 99_99_99_999_00)) redirect(back(id, "err", "Enter the quoted total as a number, for example 12500.50."));

  const existing = await db.quotation.findUnique({ where: { id }, select: { status: true } });
  if (!existing) redirect("/admin/quotations");
  await db.quotation.update({ where: { id }, data: { status, adminResponse: response || null, internalNotes: internal || null, quotedTotalPaise } });
  await logAudit({ adminUserId: admin.id, action: "quotation.update", entity: "Quotation", entityId: id, details: { from: existing.status, to: status } });
  redirect(back(id, "ok", "Quotation saved."));
}
