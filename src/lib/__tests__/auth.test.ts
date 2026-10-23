import bcrypt from "bcryptjs";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

let cookieValue: string | undefined;
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (cookieValue && name === "admin_session" ? { name, value: cookieValue } : undefined),
    set: vi.fn(),
    delete: vi.fn(),
  }),
  headers: async () => new Headers(),
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

import { db } from "../db";
import { getCurrentAdmin, requireAdmin, requireOwner } from "../auth";
import { signSessionToken } from "../session-token";

let ownerId: string;
let staffId: string;

beforeAll(async () => {
  await db.adminUser.deleteMany({ where: { email: { in: ["auth-owner@example.test", "auth-staff@example.test"] } } });
  const hash = await bcrypt.hash("irrelevant-password-1", 4);
  ownerId = (await db.adminUser.create({ data: { email: "auth-owner@example.test", name: "Owner", role: "OWNER", passwordHash: hash } })).id;
  staffId = (await db.adminUser.create({ data: { email: "auth-staff@example.test", name: "Staff", role: "STAFF", passwordHash: hash } })).id;
});
afterAll(async () => {
  await db.adminUser.deleteMany({ where: { email: { in: ["auth-owner@example.test", "auth-staff@example.test"] } } });
  await db.$disconnect();
});
beforeEach(() => {
  cookieValue = undefined;
});

describe("unauthorised access prevention", () => {
  it("treats a request with no session as signed out and redirects to login", async () => {
    expect(await getCurrentAdmin()).toBeNull();
    await expect(requireAdmin()).rejects.toThrow("REDIRECT:/admin/login");
  });

  it("rejects a forged session cookie", async () => {
    cookieValue = "forged.token.value";
    await expect(requireAdmin()).rejects.toThrow("REDIRECT:/admin/login");
  });

  it("accepts a valid session for an active admin", async () => {
    cookieValue = await signSessionToken({ adminId: ownerId, role: "OWNER" });
    expect(await requireAdmin()).toMatchObject({ id: ownerId, role: "OWNER" });
  });

  it("revokes access immediately when the account is deactivated, even with a valid token", async () => {
    cookieValue = await signSessionToken({ adminId: staffId, role: "STAFF" });
    expect(await getCurrentAdmin()).not.toBeNull();
    await db.adminUser.update({ where: { id: staffId }, data: { isActive: false } });
    expect(await getCurrentAdmin()).toBeNull();
    await db.adminUser.update({ where: { id: staffId }, data: { isActive: true } });
  });

  it("uses the role stored in the database, not the one in the token", async () => {
    // A staff member's token claiming OWNER must not grant owner access.
    cookieValue = await signSessionToken({ adminId: staffId, role: "OWNER" });
    await expect(requireOwner()).rejects.toThrow("REDIRECT:/admin?denied=1");
  });

  it("lets the owner through requireOwner", async () => {
    cookieValue = await signSessionToken({ adminId: ownerId, role: "OWNER" });
    expect(await requireOwner()).toMatchObject({ role: "OWNER" });
  });
});
