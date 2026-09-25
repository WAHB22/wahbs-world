import { expect, test, type Page } from "@playwright/test";

test.beforeEach(async ({ request }) => {
  await request.post("/api/dev-sync", { data: { op: "reset" } });
});

const day = (offset = 0) => {
  const d = new Date(Date.now() + offset * 86_400_000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const sheet = (page: Page) => page.getByRole("dialog");

test("Projects: a project, two tasks where one waits on the other, done, and time logged", async ({ page }) => {
  await page.goto("/projects");
  await page.getByTestId("add-project").click();
  await sheet(page).getByLabel("Name").fill("Reactor model");
  await sheet(page).getByLabel("Deadline").fill(day(21));
  await sheet(page).getByLabel("Hours a week you give it").fill("4");
  await page.getByRole("button", { name: "Save" }).click();
  await page.getByTestId("project-card").filter({ hasText: "Reactor model" }).click();
  await expect(page).toHaveURL(/\/projects\/p\?id=/);
  await expect(page.getByRole("heading", { name: "Reactor model", level: 1 })).toBeVisible();

  await page.getByTestId("add-task").click();
  await sheet(page).getByLabel("Task").fill("Collect rate data");
  await sheet(page).getByLabel("Estimated hours").fill("3");
  await page.getByRole("button", { name: "Save" }).click();
  await page.getByTestId("add-task").click();
  await sheet(page).getByLabel("Task").fill("Fit the model");
  await sheet(page).getByRole("group", { name: "Waits on" }).getByRole("checkbox", { name: "Collect rate data" }).check();
  await page.getByRole("button", { name: "Save" }).click();
  const fit = page.locator(".row-btn", { hasText: "Fit the model" });
  await expect(fit).toContainText("Waits on Collect rate data");

  await page.getByRole("button", { name: "Mark Collect rate data done" }).click();
  await expect(fit).not.toContainText("Waits on");
  await expect(page.locator(".figure-note").first()).toHaveText("1 of 2");

  await page.getByTestId("log-time").click();
  await sheet(page).getByLabel("Minutes").fill("90");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("region", { name: "Time" })).toContainText("1.5 h");
  await page.reload();
  await expect(page.locator(".figure-note").first()).toHaveText("1 of 2");
});

test("Career: an application lands in its column, and evidence carries its skill", async ({ page }) => {
  await page.goto("/career");
  await page.getByTestId("add-application").click();
  await sheet(page).getByLabel("Organization").fill("Northwind Process");
  await sheet(page).getByLabel("Role").fill("Process co-op");
  await sheet(page).getByLabel("Status").selectOption("applied");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByTestId("application-board").getByRole("region", { name: "Applied" })).toContainText("Process co-op");

  await page.getByRole("button", { name: "Add a skill" }).click();
  await sheet(page).getByLabel("Skill").fill("Process simulation");
  await page.getByRole("button", { name: "Save" }).click();
  await page.getByTestId("add-evidence").click();
  await sheet(page).getByLabel("What you did").fill("Distillation column design");
  await sheet(page).getByRole("group", { name: "Skills it proves" }).getByRole("checkbox", { name: "Process simulation" }).check();
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByTestId("evidence-list")).toContainText("Distillation column design");
  await expect(page.getByTestId("evidence-list")).toContainText("Process simulation");
  await page.reload();
  await expect(page.getByTestId("evidence-list")).toContainText("Process simulation");
});

test("Knowledge: a topic needs its source, then comes back for review and moves on", async ({ page }) => {
  await page.goto("/knowledge");
  await page.getByTestId("add-topic").click();
  await sheet(page).getByLabel("Topic").fill("Le Chatelier's principle");
  await sheet(page).getByLabel("What you learned").fill("A system at equilibrium shifts to undo a change.");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(sheet(page).locator(".warn")).toHaveText("Link to the source is needed.");
  await sheet(page).getByLabel("Link to the source").fill("https://example.org/equilibrium");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Le Chatelier's principle kept. First review tomorrow.")).toBeVisible();
  await expect(page.getByTestId("topic-list")).toContainText("Le Chatelier's principle");
  await expect(page.getByTestId("review-card")).toContainText("All caught up.");

  // Two days later it is due.
  await page.clock.install({ time: new Date(Date.now() + 2 * 86_400_000) });
  await page.reload();
  await expect(page.getByTestId("review-card")).toContainText("Le Chatelier's principle");
  await page.getByTestId("show-answer").click();
  await expect(page.getByTestId("review-card")).toContainText("shifts to undo a change");
  await page.getByTestId("grade-good").click();
  await expect(page.getByTestId("review-card")).toContainText("All caught up.");
});

test("Training: a session logged here and Gym done on Today both count", async ({ page }) => {
  await page.goto("/training");
  await expect(page.getByTestId("week-sessions")).toContainText("0");
  await page.getByTestId("log-session").click();
  await sheet(page).getByLabel("Minutes").fill("45");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByTestId("session-list")).toContainText("45 min");
  await expect(page.getByTestId("week-sessions")).toHaveText(/^1/);

  await page.goto("/today");
  await page.getByTestId("checkin-gym_done").click();
  await expect(page.getByTestId("today-log")).toContainText("Gym done");
  await page.goto("/training");
  await expect(page.getByTestId("week-sessions")).toHaveText(/^2/);
});

// An 8 by 8 orange PNG, small enough to live here.
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEUlEQVR4nGM4EaWBFTEMLQkAZKhSgU2VHoYAAAAASUVORK5CYII=", "base64");

test("Life: a moment keeps its people and its photo, and the names are remembered", async ({ page }) => {
  await page.goto("/life");
  await page.getByTestId("add-moment").click();
  await sheet(page).getByLabel("What happened").fill("Dinner after the midterm");
  await sheet(page).getByLabel("Who was there (names, separated by commas)").fill("Sam, Noor");
  await page.getByTestId("photo-input").setInputFiles({ name: "dinner.png", mimeType: "image/png", buffer: PNG });
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByTestId("timeline")).toContainText("Dinner after the midterm");
  await expect(page.locator(".thumb")).toHaveCount(1, { timeout: 10_000 });
  await expect(page.getByTestId("people")).toContainText("Sam");
  await expect(page.getByTestId("people")).toContainText("Noor");

  await page.getByTestId("add-moment").click();
  await expect(sheet(page)).toContainText("Names you have used: Noor, Sam");
  await sheet(page).getByLabel("What happened").fill("Study group");
  await sheet(page).getByLabel("Who was there (names, separated by commas)").fill("sam");
  await page.getByRole("button", { name: "Save" }).click();
  const sam = page.getByTestId("people").locator(".row-btn", { hasText: "Sam" });
  await expect(sam.locator(".row-side")).toHaveText("2");

  // Choosing a name shows only the moments with them.
  await page.getByTestId("people").locator(".row-btn", { hasText: "Noor" }).click();
  await expect(page.getByRole("heading", { name: "With Noor" })).toBeVisible();
  await expect(page.getByTestId("timeline")).not.toContainText("Study group");
  await page.reload();
  await expect(page.locator(".thumb")).toHaveCount(1, { timeout: 10_000 });
});

test("Recap and chapter: the week counts what got done, and a title sticks", async ({ page }) => {
  await page.goto("/training");
  await page.getByTestId("log-session").click();
  await page.getByRole("button", { name: "Save" }).click();
  await page.goto("/recap");
  await expect(page.getByRole("heading", { name: "This week", level: 1 })).toBeVisible();
  await expect(page.getByRole("region", { name: "In numbers" }).locator(".figure-block", { hasText: "Showed up" }).locator(".figure-lg")).toHaveText("1");
  await page.getByTestId("chapter-title").fill("The week it started");
  await page.getByLabel("A note to your future self").click();
  await page.waitForTimeout(300);
  await page.reload();
  await expect(page.getByTestId("chapter-title")).toHaveValue("The week it started");

  await page.goto("/chapter");
  await page.getByTestId("chapter-title").fill("September");
  await page.getByLabel("A note to your future self").fill("Keep going.");
  await page.getByTestId("chapter-title").click();
  await page.waitForTimeout(300); // the save on leaving the field is a local write
  await page.reload();
  await expect(page.getByTestId("chapter-title")).toHaveValue("September");
  await expect(page.getByLabel("A note to your future self")).toHaveValue("Keep going.");
});
