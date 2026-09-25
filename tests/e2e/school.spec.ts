import { expect, test } from "@playwright/test";

test.beforeEach(async ({ request }) => {
  await request.post("/api/dev-sync", { data: { op: "reset" } });
});

test("School shows the term, its units and the deadlines", async ({ page }) => {
  await page.goto("/school");
  await expect(page.getByTestId("unit")).toHaveCount(6, { timeout: 15_000 });
  await expect(page.getByTestId("deadline-list").locator("li").first()).toBeVisible();
});

test("adding, editing and completing a deadline all persist", async ({ page }) => {
  await page.goto("/school");
  await expect(page.getByTestId("unit").first()).toBeVisible({ timeout: 15_000 });
  await page.getByTestId("add-deadline").click();
  await page.getByLabel("What it is").fill("Test quiz zeta");
  await page.getByLabel("Due on").fill("2099-01-05");
  await page.getByRole("button", { name: "Save" }).click();
  await page.getByRole("tab", { name: "All" }).click();
  await page.getByRole("button", { name: /Show all/ }).click();
  const row = page.getByTestId("deadline-list").locator(".row-btn", { hasText: "Test quiz zeta" });
  await expect(row).toBeVisible();

  await row.click();
  await page.getByLabel("What it is").fill("Test quiz eta");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByTestId("deadline-list").locator(".row-btn", { hasText: "Test quiz eta" })).toBeVisible();

  await page.getByRole("button", { name: "Mark Test quiz eta done" }).click();
  await expect(page.getByText("Test quiz eta marked done.")).toBeVisible();
  await page.reload();
  await page.getByRole("tab", { name: "Done" }).click();
  await expect(page.getByTestId("deadline-list").locator(".row-btn", { hasText: "Test quiz eta" })).toBeVisible();
});

test("a new term archives the old one and brings its courses", async ({ page }) => {
  await page.goto("/school/new-term");
  await expect(page.getByTestId("wizard-next")).toBeVisible({ timeout: 15_000 });
  await page.getByLabel("Term name").fill("Winter 2027");
  await page.getByLabel("First day").fill("2027-01-06");
  await page.getByLabel("Last day").fill("2027-04-30");
  await page.getByTestId("wizard-next").click();
  await page.getByLabel("Code").fill("chg 4999");
  await page.getByLabel("Name").fill("Test course");
  await page.getByTestId("wizard-next").click();
  await page.getByRole("button", { name: "Add a class time" }).click();
  await page.getByLabel("Starts").fill("10:00");
  await page.getByLabel("Ends").fill("11:20");
  await page.getByTestId("wizard-next").click();
  await page.getByTestId("wizard-start").click();
  await expect(page).toHaveURL(/\/school$/);
  await expect(page.getByRole("heading", { name: "Winter 2027" })).toBeVisible();
  await expect(page.getByTestId("unit")).toHaveCount(1);
  await expect(page.getByTestId("unit")).toContainText("CHG 4999");
});
