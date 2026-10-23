import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Browser } from "playwright-core";
import { BASE, axeViolations, launch, newPage } from "./helpers";

// Needs E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD for an existing OWNER account. Skipped when not provided.
const email = process.env.E2E_ADMIN_EMAIL;
const password = process.env.E2E_ADMIN_PASSWORD;
const run = email && password ? describe : describe.skip;

let browser: Browser;
beforeAll(async () => { browser = await launch(); });
afterAll(async () => { await browser.close(); });

describe("admin is protected", () => {
  it("redirects every admin page to the login screen when signed out", async () => {
    const { ctx, page } = await newPage(browser, 1280);
    for (const path of ["/admin", "/admin/products", "/admin/orders", "/admin/settings", "/admin/audit"]) {
      await page.goto(BASE + path);
      expect(page.url(), path).toContain("/admin/login");
    }
    expect((await page.request.get(BASE + "/api/admin/products/export", { maxRedirects: 0 })).status()).not.toBe(200);
    await ctx.close();
  });
  it("rejects a wrong password with a generic message", async () => {
    const { ctx, page } = await newPage(browser, 1280);
    await page.goto(BASE + "/admin/login");
    await page.getByLabel("Email").fill("nobody@example.test");
    await page.getByLabel("Password").fill("definitely-wrong-password");
    await page.getByRole("button", { name: /sign in/i }).click();
    const alert = page.locator("form [role=alert]");
    await alert.waitFor();
    expect(page.url()).toContain("/admin/login");
    expect(await alert.innerText()).toMatch(/incorrect|invalid|wrong/i);
    await ctx.close();
  });
});

run("admin signed in", () => {
  it("logs in through the real form, every menu link works, no serious accessibility issues", async () => {
    const { ctx, page, errors } = await newPage(browser, 1280);
    await page.goto(BASE + "/admin/login");
    await page.getByLabel("Email").fill(email!);
    await page.getByLabel("Password").fill(password!);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL((u) => !u.pathname.includes("/login"));
    const links = await page.locator('nav[aria-label="Admin"] a').evaluateAll((els) => els.map((e) => (e as HTMLAnchorElement).pathname));
    expect(links.length).toBeGreaterThanOrEqual(7);
    for (const l of links) {
      const r = await page.goto(BASE + l);
      expect(r?.status(), l).toBe(200);
      expect(await axeViolations(page), l).toEqual([]);
    }
    expect(errors).toEqual([]);
    await ctx.close();
  });
  it("signing out ends the session", async () => {
    const { ctx, page } = await newPage(browser, 1280);
    await page.goto(BASE + "/admin/login");
    await page.getByLabel("Email").fill(email!);
    await page.getByLabel("Password").fill(password!);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL((u) => !u.pathname.includes("/login"));
    await Promise.all([page.waitForURL("**/admin/login"), page.getByRole("button", { name: /sign out|log out/i }).first().click()]);
    await page.goto(BASE + "/admin/products");
    expect(page.url()).toContain("/admin/login");
    await ctx.close();
  });
});
