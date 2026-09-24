import { expect, test, type BrowserContext, type Page } from "@playwright/test";

async function open(context: BrowserContext, path = "/today"): Promise<Page> {
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && !/Failed to load resource|net::ERR_INTERNET_DISCONNECTED/.test(m.text()) && errors.push(m.text()));
  (page as Page & { errors: string[] }).errors = errors;
  await page.goto(path);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect(page.getByTestId("sync-badge")).toHaveText(/Synced/, { timeout: 20_000 });
  return page;
}
const errorsOf = (p: Page) => (p as Page & { errors: string[] }).errors;

test.beforeEach(async ({ request }) => {
  await request.post("/api/dev-sync", { data: { op: "reset" } });
});

test("a check in made offline on the phone appears on the laptop after reconnecting, and survives reloads", async ({ browser }) => {
  const phoneCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const laptopCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const phone = await open(phoneCtx);
  const laptop = await open(laptopCtx);

  await phoneCtx.setOffline(true);
  await phone.getByTestId("checkin-gym_done").click();
  await expect(phone.getByTestId("today-log")).toContainText("Gym done");
  await expect(phone.getByTestId("sync-badge")).toHaveText(/1 waiting/);

  // Reload with no connection: the service worker serves the page, IndexedDB still has the check in.
  await phone.reload();
  await expect(phone.getByTestId("today-log")).toContainText("Gym done");
  await expect(phone.getByTestId("sync-badge")).toHaveText(/1 waiting|Offline/);

  await laptop.reload();
  await expect(laptop.getByTestId("sync-badge")).toHaveText(/Synced/);
  await expect(laptop.getByText("Nothing yet.")).toBeVisible();

  await phoneCtx.setOffline(false);
  await expect(phone.getByTestId("sync-badge")).toHaveText(/Synced/, { timeout: 20_000 });

  await laptop.reload();
  await expect(laptop.getByTestId("today-log")).toContainText("Gym done", { timeout: 20_000 });
  await laptop.reload();
  await expect(laptop.getByTestId("today-log")).toContainText("Gym done");

  expect(errorsOf(phone)).toEqual([]);
  expect(errorsOf(laptop)).toEqual([]);
  await phoneCtx.close();
  await laptopCtx.close();
});

test("spending and a moment save from the sheet, and undo removes a check in everywhere", async ({ browser }) => {
  const a = await browser.newContext();
  const b = await browser.newContext();
  const pa = await open(a);
  const pb = await open(b);

  await pa.getByTestId("checkin-spent").click();
  await pa.getByLabel("Amount in dollars").fill("12.50");
  await pa.getByLabel("What for (optional)").fill("Groceries");
  await pa.getByRole("button", { name: "Add" }).click();
  await expect(pa.getByTestId("today-log")).toContainText("Spent 12.50 dollars, Groceries");

  await pa.getByTestId("checkin-moment").click();
  await pa.getByLabel("What happened").fill("Sunset on the canal");
  await pa.keyboard.press("Enter");
  await expect(pa.getByTestId("today-log")).toContainText("Sunset on the canal");

  await pa.getByTestId("checkin-gym_done").click();
  await pa.getByRole("button", { name: "Undo" }).click();
  await expect(pa.getByTestId("today-log")).not.toContainText("Gym done");

  await expect(pa.getByTestId("sync-badge")).toHaveText(/Synced/, { timeout: 20_000 });
  await pb.reload();
  await expect(pb.getByTestId("today-log")).toContainText("Sunset on the canal", { timeout: 20_000 });
  await expect(pb.getByTestId("today-log")).toContainText("Spent 12.50");
  await expect(pb.getByTestId("today-log")).not.toContainText("Gym done");
  expect(errorsOf(pa)).toEqual([]);
  await a.close();
  await b.close();
});

test("export then import on a fresh device brings everything back", async ({ browser }) => {
  const a = await browser.newContext({ acceptDownloads: true });
  const pa = await open(a);
  await pa.getByTestId("checkin-gym_done").click();
  await expect(pa.getByTestId("today-log")).toContainText("Gym done");
  await pa.goto("/settings");
  const [download] = await Promise.all([pa.waitForEvent("download"), pa.getByTestId("export").click()]);
  expect(download.suggestedFilename()).toMatch(/^wahbs-world-\d{4}-\d{2}-\d{2}\.json$/);
  const file = await download.path();

  // A fresh device with no server data: reset the server so only the import can bring it back.
  await pa.request.post("/api/dev-sync", { data: { op: "reset" } });
  const b = await browser.newContext();
  const pb = await open(b, "/settings");
  await pb.getByTestId("import-file").setInputFiles(file!);
  await expect(pb.getByRole("dialog", { name: "Import preview" })).toContainText("checkins");
  await pb.getByTestId("import-confirm").click();
  await expect(pb.getByRole("status").filter({ hasText: "Imported" })).toBeVisible();
  await pb.goto("/today");
  await expect(pb.getByTestId("today-log")).toContainText("Gym done");
  await a.close();
  await b.close();
});

test("the check in dock and settings are reachable by keyboard", async ({ page }) => {
  await page.goto("/today");
  await expect(page.getByTestId("sync-badge")).toHaveText(/Synced/, { timeout: 20_000 });
  let reached = false;
  for (let i = 0; i < 30 && !reached; i++) {
    await page.keyboard.press("Tab");
    reached = await page.evaluate(() => document.activeElement?.getAttribute("data-testid") === "checkin-gym_done");
  }
  expect(reached).toBe(true);
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("today-log")).toContainText("Gym done");
  const outline = await page.evaluate(() => getComputedStyle(document.activeElement!).outlineStyle);
  expect(outline).not.toBe("none");
});
