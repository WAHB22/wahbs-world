import { expect, test, type Page } from "@playwright/test";

async function demo(page: Page) {
  await page.keyboard.press("Shift+D");
  await expect(page.getByRole("complementary", { name: "Demo controls" })).toBeVisible();
}

test("the scripted demo path runs end to end", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

  // 1. Log in, pick Makerspace 1.
  await page.goto("/login");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/locations$/);
  await page.getByRole("link", { name: /Makerspace 1/ }).first().click();

  // 2. Three machines in use, with live numbers.
  const inUse = page.locator("section[aria-labelledby=in-use]");
  await expect(inUse.getByRole("link")).toHaveCount(3);

  // 3. Irregularity on Welder 2: the rust banner slides in at the top.
  await demo(page);
  await page.getByRole("button", { name: "Trigger irregularity" }).click();
  const banner = page.getByRole("region", { name: "Alerts" });
  await expect(banner.getByText("Welder 2 looks irregular")).toBeVisible({ timeout: 10_000 });

  // 4. Review, then call a technician.
  await banner.getByRole("button", { name: "Review" }).click();
  const alert = page.getByRole("dialog", { name: "Welder 2 looks irregular" });
  await expect(alert.getByText(/3rd irregularity this month/)).toBeVisible();
  await alert.getByRole("button", { name: "Call technician" }).click();
  await page.getByRole("button", { name: "Send request" }).click();
  await expect(page.getByText(/Request sent to Volt Repair Ottawa · machine history attached/)).toBeVisible();
  await page.getByRole("button", { name: "Done" }).click();
  await expect(banner.getByText("Welder 2 looks irregular")).toHaveCount(0);

  // 5. Idle 3D printer 4: prompt, shut down, it leaves In use.
  await demo(page);
  await page.getByRole("button", { name: /Trigger idle/ }).click();
  const prompt = page.getByRole("alertdialog", { name: /3D printer 4 has been idle for 45 min/ });
  await expect(prompt).toBeVisible({ timeout: 10_000 });
  await prompt.getByRole("button", { name: "Shut down" }).click();
  await expect(inUse.getByRole("link")).toHaveCount(2, { timeout: 10_000 });

  // 6. Assign Beta Inc. to the laser cutter for this afternoon.
  await page.getByRole("button", { name: "Assign user" }).first().click();
  const drawer = page.getByRole("dialog", { name: "Assign a user" });
  await drawer.getByLabel("Name or company").fill("Beta Inc.");
  await drawer.getByRole("button", { name: "Laser cutter", exact: true }).click();
  await drawer.getByRole("button", { name: "This afternoon" }).click();
  await drawer.getByRole("button", { name: "Save assignment" }).click();
  await expect(page.getByText(/Beta Inc\. assigned to Laser cutter/)).toBeVisible();

  // 7. Fast forward to end of day: the daily report with both tables.
  await demo(page);
  await page.getByRole("button", { name: /Fast forward/ }).click();
  await expect(page).toHaveURL(/\/reports$/);
  await expect(page.getByRole("heading", { name: "Daily report" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Per machine" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Per member" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Unassigned" })).toBeVisible();
  await expect(page.getByText(/Generated automatically at/)).toBeVisible();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBe(0);
  expect(errors).toEqual([]);
});

test("every page is reachable and nothing scrolls sideways", async ({ page }) => {
  await page.goto("/login");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole("button", { name: "Log in" }).click();
  for (const path of ["/locations", "/l/ms1", "/l/ms1/m/ms1-welder-2", "/l/ms1/reports", "/l/ms1/assignments", "/l/ms1/notifications", "/l/ms1/settings", "/l/chem"]) {
    await page.goto(path);
    await expect(page.locator("main h1")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBe(0);
  }
});
