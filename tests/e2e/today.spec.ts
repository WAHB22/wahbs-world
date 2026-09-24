import { expect, test } from "@playwright/test";

test.beforeEach(async ({ request }) => {
  await request.post("/api/dev-sync", { data: { op: "reset" } });
});

test("Today shows the one thing, the day's service and the week's numbers", async ({ page }) => {
  await page.goto("/today");
  await expect(page.getByRole("heading", { name: "The one thing" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Service today" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Money" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Training" })).toBeVisible();
});

test("picking another one thing and marking it done both save and persist", async ({ page }) => {
  await page.goto("/today");
  await expect(page.getByTestId("one-thing")).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "Pick another" }).click();
  const select = page.getByLabel("The one thing for today");
  const target = await select.locator("option").nth(3).textContent();
  await select.selectOption({ index: 3 });
  await expect(page.getByTestId("one-thing")).toHaveText(target!);
  await page.reload();
  await expect(page.getByTestId("one-thing")).toHaveText(target!);
  await page.getByTestId("one-done").click();
  await expect(page.getByTestId("one-thing")).not.toHaveText(target!);
});

test("spending shows up in the money figure at once", async ({ page }) => {
  await page.goto("/today");
  await page.getByTestId("checkin-spent").click();
  await page.getByLabel("Amount in dollars").fill("7.25");
  await page.getByRole("button", { name: "Add" }).click();
  await expect(page.locator(".figure")).toHaveText("$7.25");
});
