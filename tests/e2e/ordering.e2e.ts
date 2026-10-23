import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Browser } from "playwright-core";
import { BASE, axeViolations, launch, newPage } from "./helpers";

// Creates real rows named "E2E ..." in the database the site points at. Delete them afterwards (docs/TESTING.md).
let browser: Browser;
beforeAll(async () => { browser = await launch(); });
afterAll(async () => { await browser.close(); });

describe("cart and WhatsApp", () => {
  it("prices come from the server and the WhatsApp message matches the cart", async () => {
    const { ctx, page, errors } = await newPage(browser, 390);
    await page.goto(BASE + "/products/sample-pvc-pipe");
    await page.getByRole("button", { name: /Add to Cart/ }).first().click();
    await page.goto(BASE + "/cart");
    await page.waitForFunction(() => /₹/.test(document.querySelector("aside")?.textContent ?? ""));
    await page.getByLabel(/Quantity of .*PVC/i).fill("4");
    await page.waitForFunction(() => /1,000/.test(document.querySelector("aside")?.textContent ?? ""));
    const href = await page.getByRole("link", { name: /Order on WhatsApp/ }).getAttribute("href");
    const message = decodeURIComponent(href!.split("text=")[1]);
    expect(message).toContain("PVC Pipe");
    expect(message).toContain("4 Piece");
    expect(message).toContain("Estimated Subtotal: ₹1,000");
    expect(await page.locator("aside").innerText()).toMatch(/does\s+not\s+place an order/i);
    expect(errors).toEqual([]);
    await ctx.close();
  });
  it("a tampered cart cannot change the price", async () => {
    const { ctx, page } = await newPage(browser, 390);
    await page.goto(BASE + "/");
    await page.evaluate(() => localStorage.setItem("samad-hardware-lists-v1", JSON.stringify({ cart: [{ productId: "x", slug: "x", name: "Free thing", sku: "X", unit: "Piece", quantity: 1, pricePaise: 1 }], quote: [] })));
    await page.goto(BASE + "/cart");
    await page.waitForTimeout(1200);
    expect(await page.locator("main").innerText()).not.toContain("Free thing ₹");
    await ctx.close();
  });
});

describe("quotation and website order", () => {
  it("validates, saves, shows a reference, and empties the list only after success", async () => {
    const { ctx, page } = await newPage(browser, 390);
    await page.goto(BASE + "/products/sample-pvc-pipe");
    await page.getByRole("button", { name: /Quote|Request a Quotation/ }).first().click();
    await page.goto(BASE + "/quotation");
    await page.getByLabel("Name", { exact: true }).fill("E2E Quote Person");
    await page.getByRole("button", { name: /Send quotation request/ }).click();
    await page.getByText("Enter a valid phone number").waitFor();
    expect(await page.getByLabel("Name", { exact: true }).inputValue()).toBe("E2E Quote Person");
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("samad-hardware-lists-v1")!).quote.length)).toBe(1);
    await page.getByLabel("Phone number").fill("9876543210");
    await page.getByRole("button", { name: /Send quotation request/ }).click();
    await page.getByText("Quotation request received").waitFor();
    expect(await page.locator("main").innerText()).toMatch(/QT-\d{6}-[A-Z0-9]{5}/);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("samad-hardware-lists-v1")!).quote.length)).toBe(0);
    await ctx.close();
  });
  it("places a website order and the confirmation is honest about its status", async () => {
    const { ctx, page, errors } = await newPage(browser, 390);
    await page.goto(BASE + "/products/sample-pvc-pipe");
    await page.getByRole("button", { name: /Add to Cart/ }).first().click();
    await page.goto(BASE + "/cart");
    await page.waitForFunction(() => /₹/.test(document.querySelector("aside")?.textContent ?? ""));
    await page.getByLabel("Name", { exact: true }).fill("E2E Order Person");
    await page.getByRole("button", { name: "Send order to shop" }).click();
    await page.getByText("Enter a valid phone number").waitFor();
    await page.getByLabel("Phone number").fill("9876543210");
    await page.getByRole("button", { name: "Send order to shop" }).click();
    await page.getByText("Order request received").waitFor();
    const text = await page.locator("main").innerText();
    expect(text).toMatch(/SH-\d{6}-[A-Z0-9]{5}/);
    expect(text).toMatch(/not final/i);
    expect(await axeViolations(page)).toEqual([]);
    expect(errors).toEqual([]);
    await ctx.close();
  });
});
