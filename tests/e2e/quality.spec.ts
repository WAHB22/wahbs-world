import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const PAGES = ["/", "/today", "/settings", "/~offline", "/school", "/school/new-term", "/work", "/money", "/projects", "/career", "/knowledge", "/training", "/life", "/recap", "/chapter"];
const DASH = /[‒–—―]|\S - \S/;

for (const path of PAGES) {
  test(`${path} passes axe, has no dashes in visible text, and no console errors`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    await page.goto(path);
    await page.evaluate(() => document.fonts.ready);
    // Let the page's entrance finish, so contrast is measured on the settled page.
    await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running" || a.effect?.getTiming().iterations === Infinity));
    await page.waitForTimeout(300);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
    const text = await page.evaluate(() => document.body.innerText);
    expect(text.split("\n").filter((l) => DASH.test(l))).toEqual([]);
    expect(errors).toEqual([]);
  });
}

for (const width of [390, 768, 1440, 2560]) {
  test(`no horizontal scroll at ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const path of PAGES) {
      await page.goto(path);
      await page.waitForTimeout(200);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${path} at ${width}`).toBe(true);
    }
  });
}
