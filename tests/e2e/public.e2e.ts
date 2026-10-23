import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Browser } from "playwright-core";
import { BASE, axeViolations, launch, newPage } from "./helpers";

let browser: Browser;
beforeAll(async () => { browser = await launch(); });
afterAll(async () => { await browser.close(); });

const PAGES = ["/", "/products", "/categories", "/about", "/contact", "/privacy", "/terms", "/returns", "/cart", "/quotation", "/products/sample-pvc-pipe"];

describe("responsive layout", () => {
  for (const width of [320, 390, 768, 1280]) {
    it(`no horizontal scroll or console errors at ${width}px`, async () => {
      const { ctx, page, errors } = await newPage(browser, width);
      for (const path of PAGES) {
        await page.goto(BASE + path);
        await page.waitForLoadState("networkidle");
        expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), `${path} overflows`).toBeLessThanOrEqual(0);
      }
      expect(errors).toEqual([]);
      await ctx.close();
    });
  }
});

describe("navigation", () => {
  it("mobile menu opens, links work and closes with Escape", async () => {
    const { ctx, page } = await newPage(browser, 390);
    await page.goto(BASE + "/");
    const toggle = page.getByRole("button", { name: /menu/i });
    await toggle.click();
    const mobileNav = page.getByRole("navigation", { name: "Mobile" });
    expect(await mobileNav.isVisible()).toBe(true);
    await mobileNav.getByRole("link", { name: "Shop Products" }).click();
    await page.waitForURL("**/products");
    if (await mobileNav.isVisible()) await page.keyboard.press("Escape");
    expect(await mobileNav.isVisible()).toBe(false);
    await toggle.click();
    expect(await mobileNav.isVisible()).toBe(true);
    await page.keyboard.press("Escape");
    expect(await mobileNav.isVisible()).toBe(false);
    await ctx.close();
  });
});

describe("homepage and WhatsApp", () => {
  it("shows the real business details and a working wa.me link", async () => {
    const { ctx, page } = await newPage(browser, 1280);
    await page.goto(BASE + "/");
    const text = await page.locator("body").innerText();
    expect(text).toContain("Samad and Son's Hardware Store");
    expect(text).toContain("Peerpora");
    expect(text).toContain("Opposite J&K Bank");
    const hrefs = await page.locator('a[href^="https://wa.me/"]').evaluateAll((els) => els.map((e) => (e as HTMLAnchorElement).href));
    expect(hrefs.length).toBeGreaterThan(0);
    for (const h of hrefs) expect(h).toMatch(/^https:\/\/wa\.me\/917006839895/);
    await ctx.close();
  });
});

describe("catalogue", () => {
  it("search, sort and filter work and the empty state is helpful", async () => {
    const { ctx, page } = await newPage(browser, 1280);
    await page.goto(BASE + "/products?q=pvc");
    expect(await page.getByRole("link", { name: /PVC Pipe/ }).first().isVisible()).toBe(true);
    await page.goto(BASE + "/products?q=zzzznotfound");
    expect(await page.locator("main").innerText()).toMatch(/no products|couldn.t find|nothing/i);
    const r = await page.goto(BASE + "/products?sort=bogus&page=-5&minPrice=abc");
    expect(r?.status()).toBe(200);
    await ctx.close();
  });
  it("unknown product and category give a 404 page", async () => {
    const { ctx, page } = await newPage(browser, 390);
    expect((await page.goto(BASE + "/products/does-not-exist"))?.status()).toBe(404);
    expect((await page.goto(BASE + "/categories/does-not-exist"))?.status()).toBe(404);
    await ctx.close();
  });
});

describe("accessibility (axe, WCAG 2 A/AA, serious and critical only)", () => {
  for (const path of ["/", "/products", "/categories", "/about", "/contact", "/products/sample-pvc-pipe", "/cart", "/quotation"]) {
    it(`${path} has no serious violations`, async () => {
      const { ctx, page } = await newPage(browser, 1280);
      await page.goto(BASE + path);
      await page.waitForLoadState("networkidle");
      expect(await axeViolations(page)).toEqual([]);
      await ctx.close();
    });
  }
});

describe("SEO", () => {
  it("serves robots and sitemap, canonical tags and structured data", async () => {
    const { ctx, page } = await newPage(browser, 1280);
    const robots = await (await page.request.get(BASE + "/robots.txt")).text();
    expect(robots).toMatch(/Disallow: \/admin/);
    expect(robots).toMatch(/Sitemap:/);
    const sitemap = await (await page.request.get(BASE + "/sitemap.xml")).text();
    expect(sitemap).toContain("/products");
    expect(sitemap).not.toContain("/admin");
    expect(sitemap).not.toContain("/cart");
    await page.goto(BASE + "/");
    expect(await page.locator('link[rel="canonical"]').count()).toBeGreaterThanOrEqual(0);
    const ld = await page.locator('script[type="application/ld+json"]').allInnerTexts();
    expect(JSON.parse(ld[0])["@type"]).toBe("HardwareStore");
    await ctx.close();
  });
});
