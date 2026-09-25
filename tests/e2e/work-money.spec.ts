import { expect, test } from "@playwright/test";

test.beforeEach(async ({ request }) => {
  await request.post("/api/dev-sync", { data: { op: "reset" } });
});

test("planning from the routine fills the rail, and a shift can be added and edited", async ({ page }) => {
  await page.goto("/work");
  await page.getByTestId("plan-shifts").click({ timeout: 15_000 });
  await expect(page.getByText(/shifts? planned from your routine/)).toBeVisible();
  await expect(page.getByTestId("shift-rail").locator(".ticket").first()).toBeVisible();
  await page.waitForTimeout(500);
  // planning twice adds nothing new
  const count = await page.getByTestId("shift-rail").locator(".ticket").count();
  await page.getByTestId("plan-shifts").click();
  await expect(page.getByText("already have their shifts")).toBeVisible();
  await expect(page.getByTestId("shift-rail").locator(".ticket")).toHaveCount(count);

  await page.getByRole("button", { name: /Edit Bobino Bagel/ }).first().click();
  await page.getByLabel("Starts").fill("09:00");
  await page.getByLabel("Ends").fill("13:00");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByTestId("shift-rail")).toContainText("09:00 to 13:00");
});

test("a past planned shift asks to be confirmed, and worked hours count", async ({ page }) => {
  await page.goto("/work");
  await page.getByTestId("add-shift").click({ timeout: 15_000 });
  await page.getByLabel("Day").fill("2020-01-06");
  await page.getByLabel("Starts").fill("08:00");
  await page.getByLabel("Ends").fill("12:30");
  await page.getByLabel("Unpaid break in minutes").fill("30");
  await page.getByRole("button", { name: "Save" }).click();
  const confirm = page.getByTestId("to-confirm");
  await expect(confirm).toBeVisible();
  await confirm.getByRole("button", { name: "Worked" }).click();
  await expect(page.getByTestId("worked-list")).toContainText("4 hours");
});

test("spending, a paid bill and a budget show on the month", async ({ page }) => {
  await page.goto("/money");
  await page.getByTestId("add-spent").click({ timeout: 15_000 });
  await page.getByLabel("Amount").fill("12.40");
  await page.getByLabel("Where or who").fill("Test market");
  await page.getByLabel("Category").selectOption({ label: "Food: Groceries" });
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByTestId("tx-list")).toContainText("Test market");
  await expect(page.getByTestId("month-spent")).toHaveText("$12.40");

  await page.getByTestId("add-bill").click();
  await page.getByLabel("Name").fill("Phone plan");
  await page.getByLabel("Amount").fill("35");
  await page.getByLabel("Day of the month").fill("1");
  await page.getByRole("button", { name: "Save" }).click();
  await page.getByTestId("bill-list").getByRole("button", { name: "Mark paid" }).click();
  await expect(page.getByTestId("bill-list").locator(".chip")).toHaveText("Paid");
  await expect(page.getByTestId("month-spent")).toHaveText("$47.40");
  await page.reload();
  await expect(page.getByTestId("month-spent")).toHaveText("$47.40");
});

test("spending from the Today dock lands in Money", async ({ page }) => {
  await page.goto("/today");
  await page.getByTestId("checkin-spent").click();
  await page.getByLabel("Amount in dollars").fill("3.75");
  await page.getByRole("button", { name: "Add" }).click();
  await expect(page.locator(".figure").first()).toHaveText("$3.75");
  await page.goto("/money");
  await expect(page.getByTestId("month-spent")).toHaveText("$3.75", { timeout: 15_000 });
});
