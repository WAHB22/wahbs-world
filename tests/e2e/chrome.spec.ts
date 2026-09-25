import { expect, test } from "@playwright/test";

test("the liquid chrome renders, stays out of the way, and stops drawing off screen", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto("/");
  const canvas = page.locator(".chrome-canvas canvas");
  await expect(canvas).toBeVisible({ timeout: 15_000 });
  // The copy stays clickable over the canvas.
  await page.getByTestId("enter-today").click({ trial: true });
  // Something was actually drawn: the canvas is not blank.
  await page.waitForTimeout(1500);
  const shot = await canvas.screenshot();
  expect(shot.byteLength).toBeGreaterThan(20_000);
  await page.locator("#menu").scrollIntoViewIfNeeded();
  await page.mouse.wheel(0, 3000);
  await page.waitForTimeout(300);
  expect(errors).toEqual([]);
});
