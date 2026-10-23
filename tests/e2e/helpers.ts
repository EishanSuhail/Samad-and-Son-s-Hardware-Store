import { chromium, type Browser, type BrowserContext, type Page } from "playwright-core";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";

export const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";

function findChromium(): string | undefined {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  const candidates = ["/opt/pw-browsers/chromium-1243/chrome-linux64/chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/google-chrome"];
  return candidates.find((p) => existsSync(p));
}

export async function launch(): Promise<Browser> {
  return chromium.launch({ executablePath: findChromium(), args: ["--no-sandbox"] });
}

export async function newPage(browser: Browser, width = 390, height = 800): Promise<{ ctx: BrowserContext; page: Page; errors: string[] }> {
  const ctx = await browser.newContext({ viewport: { width, height } });
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  return { ctx, page, errors };
}

const require = createRequire(import.meta.url);
/** Runs axe-core on the current page and returns serious/critical violations. */
export async function axeViolations(page: Page) {
  const source = (await import("node:fs")).readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
  await page.evaluate(source);
  const result = await page.evaluate(async () => {
    // @ts-expect-error axe is injected above
    const r = await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] } });
    return r.violations.map((v: { id: string; impact: string; nodes: { target: string[] }[] }) => ({ id: v.id, impact: v.impact, targets: v.nodes.slice(0, 3).map((n) => n.target.join(" ")) }));
  });
  return (result as { id: string; impact: string; targets: string[] }[]).filter((v) => v.impact === "serious" || v.impact === "critical");
}
