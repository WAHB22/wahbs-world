import { expect, test } from "@playwright/test";

// Runs in the "glass" project, where the browser has WebGL (software rendering, so it is slow).
test.beforeEach(async ({ request }) => {
  await request.post("/api/dev-sync", { data: { op: "reset" } });
});

test("the glass cabinet: nine objects with brass plaques, and one breaks to open its world", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/");
  await expect(page.locator(".vitrine[data-glass]")).toBeVisible({ timeout: 60_000 });
  await expect(page.locator(".plaque")).toHaveCount(9);
  await page.locator('[data-world="money"]').click();
  await expect(page.locator(".vitrine[data-breaking]")).toBeAttached();
  await expect(page).toHaveURL(/\/money$/, { timeout: 30_000 });
});
