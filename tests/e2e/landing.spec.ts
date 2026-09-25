import { expect, test } from "@playwright/test";

test.beforeEach(async ({ request }) => {
  await request.post("/api/dev-sync", { data: { op: "reset" } });
});

test("the landing shows WORLD with its little planet and nine worlds with live status lines", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "WORLD" })).toBeVisible();
  await expect(page.getByRole("img", { name: /small planet/ })).toBeVisible();
  const panes = page.getByRole("navigation", { name: "Worlds" }).getByRole("link");
  await expect(panes).toHaveCount(9);
  await expect(page.locator('[data-world="school"] .plaque-line')).not.toHaveText("Courses, deadlines, the new term.", { timeout: 15_000 });
});

for (const kind of ["morph", "dive", "liquid", "shatter"] as const) {
  test(`${kind}: entering a world navigates at once and never blocks, then the way back works`, async ({ page }) => {
    await page.goto("/today"); // warm the route, so the timing below measures the app, not a cold server
    await page.goto("/lab/transitions");
    await page.getByTestId(`choose-${kind}`).click();
    await expect(page.getByTestId(`choose-${kind}`)).toHaveText("Chosen");
    await page.goto("/");
    await page.locator('[data-world="today"]').click();
    // Navigation starts immediately (the glass cabinet lets the object break first, well under a second).
    await expect(page).toHaveURL(/\/today$/, { timeout: kind === "shatter" ? 2000 : 500 });
    // The overlay never takes clicks: the world is usable during the transition.
    await page.getByTestId("checkin-gym_done").click();
    await expect(page.getByTestId("today-log")).toContainText("Gym done");
    await expect(page.locator(".tx-host > *")).toHaveCount(0, { timeout: 2000 });
    await page.getByRole("link", { name: "Back to the world" }).click();
    await expect(page).toHaveURL(/\/$/);
  });
}

test("shatter is the default and carries you into the world", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('[data-world="school"] .plaque-line')).not.toHaveText("Courses, deadlines, the new term.", { timeout: 15_000 });
  await page.waitForTimeout(2500); // the landing's picture (flat mode) is taken while the page is idle
  await page.locator('[data-world="school"]').click();
  await expect(page).toHaveURL(/\/school$/, { timeout: 3000 });
  await expect(page.locator(".tx-host > *")).toHaveCount(0, { timeout: 4000 });
});

test("reduced motion turns every transition into a short crossfade", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto("/");
  await page.locator('[data-world="school"]').click();
  await expect(page).toHaveURL(/\/school$/);
  await expect(page.locator(".tx-host > *")).toHaveCount(0, { timeout: 600 });
  await expect(page.getByRole("heading", { name: "School", level: 1 })).toBeVisible();
  await ctx.close();
});

test("a world that is not built yet says so honestly and offers the way back", async ({ page }) => {
  await page.goto("/career");
  await expect(page.getByRole("heading", { name: "Career" })).toBeVisible();
  await expect(page.getByText("Opens in phase 4")).toBeVisible();
  await page.getByRole("link", { name: "Back to the world" }).first().click();
  await expect(page).toHaveURL(/\/$/);
});

test("phone: all nine worlds are within reach and Today opens", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Worlds" }).getByRole("link")).toHaveCount(9);
  for (const slug of ["career", "today", "training"]) await expect(page.locator(`[data-world="${slug}"]`)).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByTestId("enter-today").click();
  await expect(page).toHaveURL(/\/today$/, { timeout: 3000 });
  await ctx.close();
});
