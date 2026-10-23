import bcrypt from "bcryptjs";
import { db } from "./db";

export const MAX_FAILED_LOGINS = 5;
export const LOCK_MINUTES = 15;
export const BCRYPT_COST = 12;

// Valid bcrypt hash of a random throw-away string. Compared against when the email is unknown so
// that "no such account" and "wrong password" take about the same time.
const DUMMY_HASH = "$2b$12$dEWwCkVzM94lv2uN04ByJOP8LHMOdrE2BiVHEbXUrlzN7xRth.Fxm";

export type CredentialResult =
  | { ok: true; admin: { id: string; role: "OWNER" | "STAFF"; email: string } }
  | { ok: false; reason: "invalid" | "locked"; adminId?: string };

export async function verifyCredentials(email: string, password: string, now = new Date()): Promise<CredentialResult> {
  const admin = await db.adminUser.findUnique({ where: { email: email.toLowerCase() } });

  if (!admin) {
    await bcrypt.compare(password, DUMMY_HASH);
    return { ok: false, reason: "invalid" };
  }
  if (admin.lockedUntil && admin.lockedUntil > now) {
    // Still do the work so response timing does not reveal the lock.
    await bcrypt.compare(password, DUMMY_HASH);
    return { ok: false, reason: "locked", adminId: admin.id };
  }

  const matches = await bcrypt.compare(password, admin.passwordHash);
  if (!matches || !admin.isActive) {
    const failed = admin.failedLoginCount + 1;
    const lock = failed >= MAX_FAILED_LOGINS;
    await db.adminUser.update({
      where: { id: admin.id },
      data: {
        failedLoginCount: lock ? 0 : failed,
        lockedUntil: lock ? new Date(now.getTime() + LOCK_MINUTES * 60_000) : admin.lockedUntil,
      },
    });
    return { ok: false, reason: lock ? "locked" : "invalid", adminId: admin.id };
  }

  await db.adminUser.update({
    where: { id: admin.id },
    data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: now },
  });
  return { ok: true, admin: { id: admin.id, role: admin.role, email: admin.email } };
}

export function validatePasswordStrength(password: string): string | null {
  if (password.length < 12) return "Use at least 12 characters.";
  if (password.length > 128) return "Use at most 128 characters.";
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return "Include both letters and numbers.";
  return null;
}
