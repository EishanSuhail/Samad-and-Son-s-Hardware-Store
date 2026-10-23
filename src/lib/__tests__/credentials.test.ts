import bcrypt from "bcryptjs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "../db";
import { LOCK_MINUTES, MAX_FAILED_LOGINS, validatePasswordStrength, verifyCredentials } from "../credentials";

const EMAIL = "creds-test@example.test";
const PASSWORD = "correct-horse-battery-9";

beforeAll(async () => {
  await db.adminUser.deleteMany({ where: { email: EMAIL } });
  await db.adminUser.create({ data: { email: EMAIL, name: "Test", role: "OWNER", passwordHash: await bcrypt.hash(PASSWORD, 4) } });
});
afterAll(async () => {
  await db.adminUser.deleteMany({ where: { email: EMAIL } });
  await db.$disconnect();
});

describe("verifyCredentials", () => {
  it("accepts the right password and is case-insensitive on email", async () => {
    const r = await verifyCredentials(EMAIL.toUpperCase(), PASSWORD);
    expect(r.ok).toBe(true);
  });

  it("rejects a wrong password and an unknown email with the same result", async () => {
    expect(await verifyCredentials(EMAIL, "wrong-password-1")).toMatchObject({ ok: false, reason: "invalid" });
    expect(await verifyCredentials("nobody@example.test", PASSWORD)).toEqual({ ok: false, reason: "invalid" });
  });

  it("locks the account after repeated failures, even for the correct password, then unlocks", async () => {
    await db.adminUser.update({ where: { email: EMAIL }, data: { failedLoginCount: 0, lockedUntil: null } });
    let last;
    for (let i = 0; i < MAX_FAILED_LOGINS; i++) last = await verifyCredentials(EMAIL, "wrong-password-1");
    expect(last).toMatchObject({ ok: false, reason: "locked" });

    expect(await verifyCredentials(EMAIL, PASSWORD)).toMatchObject({ ok: false, reason: "locked" });

    const later = new Date(Date.now() + (LOCK_MINUTES + 1) * 60_000);
    expect((await verifyCredentials(EMAIL, PASSWORD, later)).ok).toBe(true);
  });

  it("resets the failure counter on a successful login", async () => {
    await verifyCredentials(EMAIL, "wrong-password-1");
    await verifyCredentials(EMAIL, PASSWORD);
    const row = await db.adminUser.findUniqueOrThrow({ where: { email: EMAIL } });
    expect(row.failedLoginCount).toBe(0);
    expect(row.lockedUntil).toBeNull();
  });

  it("refuses a deactivated account even with the right password", async () => {
    await db.adminUser.update({ where: { email: EMAIL }, data: { isActive: false, failedLoginCount: 0, lockedUntil: null } });
    expect((await verifyCredentials(EMAIL, PASSWORD)).ok).toBe(false);
    await db.adminUser.update({ where: { email: EMAIL }, data: { isActive: true, failedLoginCount: 0, lockedUntil: null } });
  });
});

describe("validatePasswordStrength", () => {
  it("enforces length and character mix", () => {
    expect(validatePasswordStrength("short1")).toMatch(/12/);
    expect(validatePasswordStrength("onlyletterslongenough")).toMatch(/numbers/);
    expect(validatePasswordStrength("123456789012345")).toMatch(/letters/);
    expect(validatePasswordStrength("a-good-passphrase-2026")).toBeNull();
  });
});
