import { expect, test } from "@playwright/test";

test.beforeEach(async ({ request }) => {
  await request.post("/api/dev-sync", { data: { op: "reset" } });
});

test("the home page is a menu: the hero, nine worlds with live lines, and the week", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Wahb's World.", level: 1 })).toBeVisible();
  const dishes = page.getByRole("navigation", { name: "Worlds" }).getByRole("link");
  await expect(dishes).toHaveCount(9);
  // The line under each dish comes from live data, not the static description.
  await expect(page.locator('[data-world="school"] .dish-line')).not.toHaveText("Courses, deadlines and the next term", { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "This week" })).toBeVisible();
  await expect(page.getByRole("link", { name: /This week's recap/ })).toHaveAttribute("href", "/recap");
});

for (const [kind, name] of [["liquid", "Chrome drop"], ["morph", "Shared morph"]] as const) {
  test(`${name}: entering a world navigates at once, never blocks, and the way back works`, async ({ page }) => {
    await page.goto("/today"); // warm the route, so the timing below measures the app, not a cold server
    await page.goto("/settings");
    await page.getByRole("group", { name: "Entering a world" }).getByRole("radio", { name }).check();
    await expect(page.getByRole("group", { name: "Entering a world" }).getByRole("radio", { name })).toBeChecked();
    await page.goto("/");
    await page.locator('[data-world="today"]').click();
    await expect(page).toHaveURL(/\/today$/, { timeout: kind === "liquid" ? 1500 : 800 });
    // The overlay never takes clicks: the world is usable during the transition.
    await page.getByTestId("checkin-gym_done").click();
    await expect(page.getByTestId("today-log")).toContainText("Gym done");
    await expect(page.locator(".tx-host > *")).toHaveCount(0, { timeout: 2000 });
    await page.getByRole("link", { name: "Back to the menu" }).click();
    await expect(page).toHaveURL(/\/$/);
  });
}

test("the chrome drop is the default and carries you into the world", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('[data-world="school"] .dish-line')).not.toHaveText("Courses, deadlines and the next term", { timeout: 15_000 });
  await page.locator('[data-world="school"]').click();
  await expect(page).toHaveURL(/\/school$/, { timeout: 1500 });
  await expect(page.locator(".tx-host > *")).toHaveCount(0, { timeout: 2000 });
  await expect(page.getByRole("heading", { name: "School", level: 1 })).toBeVisible();
});

test("Open Today in the hero goes to Today", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("enter-today").click();
  await expect(page).toHaveURL(/\/today$/, { timeout: 1500 });
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

test("the week board counts a deadline added in School", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".tile-deadlines .tile-list li").first()).toBeVisible({ timeout: 15_000 });
  const before = Number(await page.locator(".tile-deadlines .tile-figure").textContent());
  await page.goto("/school");
  await expect(page.getByTestId("unit").first()).toBeVisible({ timeout: 15_000 });
  await page.getByTestId("add-deadline").click();
  await page.getByLabel("What it is").fill("Week board check");
  const d = new Date(Date.now() + 2 * 86_400_000);
  await page.getByLabel("Due on").fill(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goto("/");
  await expect(page.locator(".tile-deadlines .tile-figure")).toHaveText(String(before + 1));
});

test("a narrow window still reaches every world without sideways scrolling", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Worlds" }).getByRole("link")).toHaveCount(9);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByTestId("enter-today").click();
  await expect(page).toHaveURL(/\/today$/, { timeout: 3000 });
  await ctx.close();
});
