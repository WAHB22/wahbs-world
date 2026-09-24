import { expect, test } from "@playwright/test";

test.beforeEach(async ({ request }) => {
  await request.post("/api/dev-sync", { data: { op: "reset" } });
});

test("the landing shows WAHB and nine worlds with live status lines", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "WAHB" })).toBeVisible();
  const panes = page.getByRole("navigation", { name: "Worlds" }).getByRole("link");
  await expect(panes).toHaveCount(9);
  await expect(page.locator('[data-world="school"] .pane-line')).not.toHaveText("Courses, deadlines, the new term.", { timeout: 15_000 });
});

for (const kind of ["morph", "dive", "liquid", "shatter"] as const) {
  test(`${kind}: entering a world navigates at once and never blocks, then the way back works`, async ({ page }) => {
    await page.goto("/lab/transitions");
    await page.getByTestId(`choose-${kind}`).click();
    await expect(page.getByTestId(`choose-${kind}`)).toHaveText("Chosen");
    await page.goto("/");
    await page.locator('[data-world="today"]').click();
    // Navigation starts immediately: the URL changes well before the transition ends.
    await expect(page).toHaveURL(/\/today$/, { timeout: 500 });
    // The overlay never takes clicks: the world is usable during the transition.
    await page.getByTestId("checkin-gym_done").click();
    await expect(page.getByTestId("today-log")).toContainText("Gym done");
    await expect(page.locator(".tx-host > *")).toHaveCount(0, { timeout: 2000 });
    await page.getByRole("link", { name: "Back to the world" }).click();
    await expect(page).toHaveURL(/\/$/);
  });
}

test("reduced motion turns every transition into a short crossfade", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto("/");
  await page.locator('[data-world="school"]').click();
  await expect(page).toHaveURL(/\/school$/);
  await expect(page.locator(".tx-host > *")).toHaveCount(0, { timeout: 600 });
  await expect(page.getByRole("heading", { name: "Opens in phase 3" })).toBeVisible();
  await ctx.close();
});

test("a world that is not built yet says so honestly and offers the way back", async ({ page }) => {
  await page.goto("/career");
  await expect(page.getByRole("heading", { name: "Career" })).toBeVisible();
  await expect(page.getByText("Opens in phase 4")).toBeVisible();
  await page.getByRole("link", { name: "Back to the world" }).first().click();
  await expect(page).toHaveURL(/\/$/);
});

test("phone: the deck turns with buttons and keys, and the front card opens its world", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto("/");
  await expect(page.locator('.deck-card[data-front]')).toHaveAttribute("data-world", "today");
  await page.getByRole("button", { name: "Next world" }).click();
  await expect(page.locator('.deck-card[data-front]')).toHaveAttribute("data-world", "school");
  await page.locator('.deck-card[data-front]').focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.locator('.deck-card[data-front]')).toHaveAttribute("data-world", "work");
  await page.getByRole("button", { name: "Previous world" }).click();
  await page.getByRole("button", { name: "Previous world" }).click();
  await page.locator('.deck-card[data-front]').click();
  await expect(page).toHaveURL(/\/today$/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await ctx.close();
});
