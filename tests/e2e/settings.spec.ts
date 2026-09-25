import { expect, test } from "@playwright/test";

test.beforeEach(async ({ request }) => {
  await request.post("/api/dev-sync", { data: { op: "reset" } });
});

const choose = async (page: import("@playwright/test").Page, group: string, option: string) => {
  await page.getByRole("group", { name: group }).getByRole("radio", { name: option, exact: true }).check();
  await expect(page.getByRole("group", { name: group }).getByRole("radio", { name: option, exact: true })).toBeChecked();
};

test("a passcode locks the app, refuses a wrong one and opens with the right one", async ({ page }) => {
  await page.goto("/settings");
  await page.getByTestId("passcode-set").click();
  await page.getByLabel("New passcode").fill("4711");
  await page.getByLabel("Type it again").fill("4711");
  await page.getByTestId("passcode-save").click();
  await expect(page.getByText("Passcode set. This device now asks for it.")).toBeVisible();

  await page.getByTestId("lock-now").click();
  await expect(page.getByRole("heading", { name: "Wahb's World is locked" })).toBeVisible();
  await page.getByLabel("Passcode").fill("0000");
  await page.getByRole("button", { name: "Unlock" }).click();
  await expect(page.locator(".lock-card [role=alert]")).toHaveText("That passcode is not right.");
  await page.getByLabel("Passcode").fill("4711");
  await page.getByRole("button", { name: "Unlock" }).click();
  await expect(page.getByRole("heading", { name: "Settings", level: 1 })).toBeVisible();

  // Opening the app again asks first, and nothing behind it is rendered.
  await page.goto("/money");
  await expect(page.getByRole("heading", { name: "Wahb's World is locked" })).toBeVisible();
  await expect(page.getByTestId("month-spent")).toHaveCount(0);
  await page.getByLabel("Passcode").fill("4711");
  await page.getByRole("button", { name: "Unlock" }).click();
  await expect(page.getByTestId("month-spent")).toBeVisible();
});

test("a mismatched passcode is caught before it is saved", async ({ page }) => {
  await page.goto("/settings");
  await page.getByTestId("passcode-set").click();
  await page.getByLabel("New passcode").fill("4711");
  await page.getByLabel("Type it again").fill("4712");
  await page.getByTestId("passcode-save").click();
  await expect(page.locator("form .warn")).toHaveText("The two entries are different.");
});

test("the pace cap holds the whole app at calm", async ({ page }) => {
  await page.goto("/settings");
  await choose(page, "Pace never goes above", "Calm");
  await expect(page.locator("html")).toHaveAttribute("data-intensity", "calm");
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-intensity", "calm");
  await expect(page.locator(".pill-label")).toContainText("calm");
});

test("sound starts off, and the theme choice applies at once and persists", async ({ page }) => {
  await page.goto("/settings");
  await expect(page.getByRole("group", { name: "Profile" }).getByRole("radio", { name: "Off" })).toBeChecked();
  await expect(page.getByRole("button", { name: "Play a sample" })).toBeDisabled();
  await choose(page, "Theme", "Dark");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.goto("/today");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(bg).toBe("rgb(11, 11, 13)");
});
