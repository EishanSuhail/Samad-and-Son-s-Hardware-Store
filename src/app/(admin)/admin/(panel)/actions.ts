"use server";

import { redirect } from "next/navigation";
import { logAudit } from "@/lib/audit";
import { destroySession, getCurrentAdmin } from "@/lib/auth";

export async function logoutAction() {
  const admin = await getCurrentAdmin();
  await destroySession();
  if (admin) await logAudit({ adminUserId: admin.id, action: "logout", entity: "AdminUser", entityId: admin.id });
  redirect("/admin/login");
}
