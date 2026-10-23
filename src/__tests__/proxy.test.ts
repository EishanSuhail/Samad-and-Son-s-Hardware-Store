import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { proxy } from "../proxy";
import { signSessionToken } from "../lib/session-token";

const req = (path: string, token?: string) =>
  new NextRequest(`http://localhost:3000${path}`, token ? { headers: { cookie: `admin_session=${token}` } } : undefined);

describe("proxy guarding /admin", () => {
  it("redirects anonymous visitors from admin pages to the login page", async () => {
    for (const path of ["/admin", "/admin/products", "/admin/settings", "/admin/orders/123"]) {
      const res = await proxy(req(path));
      expect(res.status).toBe(307);
      expect(new URL(res.headers.get("location")!).pathname).toBe("/admin/login");
    }
  });

  it("lets the login page load for anonymous visitors", async () => {
    const res = await proxy(req("/admin/login"));
    expect(res.headers.get("location")).toBeNull();
  });

  it("lets a validly signed session through and bounces it off the login page", async () => {
    const token = await signSessionToken({ adminId: "x", role: "OWNER" });
    expect((await proxy(req("/admin/products", token))).headers.get("location")).toBeNull();
    expect(new URL((await proxy(req("/admin/login", token))).headers.get("location")!).pathname).toBe("/admin");
  });

  it("does not let a forged cookie through", async () => {
    const res = await proxy(req("/admin", "forged.cookie.value"));
    expect(new URL(res.headers.get("location")!).pathname).toBe("/admin/login");
  });
});
