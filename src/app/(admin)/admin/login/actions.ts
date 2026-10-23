"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { logAudit } from "@/lib/audit";
import { createSession } from "@/lib/auth";
import { verifyCredentials } from "@/lib/credentials";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

export interface LoginState {
  error?: string;
}

const schema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(1).max(200),
});

const WINDOW_MS = 15 * 60_000;

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const ip = await getClientIp();

  // Throttle by IP first, before doing any password work.
  const ipLimit = rateLimit(`login:ip:${ip}`, 20, WINDOW_MS);
  if (!ipLimit.ok) {
    return { error: `Too many sign-in attempts. Try again in ${Math.ceil(ipLimit.retryAfterSeconds / 60)} minutes.` };
  }

  const parsed = schema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: "Enter your email address and password." };
  const { email, password } = parsed.data;

  const emailLimit = rateLimit(`login:email:${email}`, 8, WINDOW_MS);
  if (!emailLimit.ok) {
    return { error: `Too many sign-in attempts. Try again in ${Math.ceil(emailLimit.retryAfterSeconds / 60)} minutes.` };
  }

  const result = await verifyCredentials(email, password);

  if (!result.ok) {
    await logAudit({
      adminUserId: result.adminId,
      action: result.reason === "locked" ? "login.locked" : "login.failed",
      entity: "AdminUser",
      entityId: result.adminId,
      details: { email },
    });
    // One generic message for every failure so the form never reveals which emails exist.
    return {
      error:
        result.reason === "locked"
          ? "Too many failed attempts. This account is locked for 15 minutes."
          : "Incorrect email or password.",
    };
  }

  await createSession({ adminId: result.admin.id, role: result.admin.role });
  await logAudit({ adminUserId: result.admin.id, action: "login.success", entity: "AdminUser", entityId: result.admin.id });
  redirect("/admin");
}
