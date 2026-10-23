import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  signSessionToken,
  verifySessionToken,
  type SessionPayload,
} from "./session-token";

export interface CurrentAdmin {
  id: string;
  email: string;
  name: string;
  role: "OWNER" | "STAFF";
}

export async function createSession(admin: SessionPayload) {
  const token = await signSessionToken(admin);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

/**
 * Expires the session cookie. It is overwritten with the SAME attributes it was created with:
 * the production cookie uses the `__Host-` prefix, and browsers ignore a deletion for such a
 * cookie unless it is also Secure with Path=/ (plain `cookies().delete()` omits Secure).
 */
export async function destroySession() {
  (await cookies()).set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });
}

/**
 * The signed-in admin, re-checked against the database on every request so that a deactivated
 * account (or changed role) loses access immediately, not when the token expires.
 */
export const getCurrentAdmin = cache(async (): Promise<CurrentAdmin | null> => {
  const session = await verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const admin = await db.adminUser.findUnique({
    where: { id: session.adminId },
    select: { id: true, email: true, name: true, role: true, isActive: true },
  });
  if (!admin || !admin.isActive) return null;
  return { id: admin.id, email: admin.email, name: admin.name, role: admin.role };
});

/** Use at the top of every admin page and every admin server action. */
export async function requireAdmin(): Promise<CurrentAdmin> {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

/** For owner-only actions such as editing site settings. */
export async function requireOwner(): Promise<CurrentAdmin> {
  const admin = await requireAdmin();
  if (admin.role !== "OWNER") redirect("/admin?denied=1");
  return admin;
}
