import assert from "node:assert/strict";
import { chromium } from "../../work/ui-test/node_modules/playwright/index.mjs";
const browser = await chromium.launch({
  headless: true,
  channel: process.env.UI_BROWSER_CHANNEL || "msedge",
});
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const moduleKey of [
      "overview",
      "profile",
      "students",
      "requests",
      "connections",
      "sessions",
    ]) {
      await page.goto(
        `http://127.0.0.1:4173/?role=mentor&page=${moduleKey}&scenario=roles`,
      );
      await page.locator("main h1").waitFor();
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${moduleKey}/${width}`,
      );
      assert.equal(
        await page.locator('nav a[href="/dashboard/applications"]').count(),
        0,
      );
    }
  }
  await page.goto(
    "http://127.0.0.1:4173/?role=mentor&page=overview&scenario=roles",
  );
  await page
    .getByRole("heading", { name: "Complete your professional profile" })
    .waitFor();
  await page
    .getByRole("heading", { name: "Students matching your expertise" })
    .waitFor();
  assert.ok(
    (await page.locator("main").innerText()).includes("Matches python"),
  );
  assert.equal(
    await page.getByText("University Mentor", { exact: true }).count(),
    0,
  );
  assert.equal(
    await page.getByText("Company Mentor", { exact: true }).count(),
    0,
  );
  await page.goto(
    "http://127.0.0.1:4173/?role=mentor&page=students&scenario=roles",
  );
  await page.getByLabel("Student view").selectOption("recommended");
  await page.getByRole("button", { name: "Accept", exact: true }).click();
  await page.getByText("accepted", { exact: true }).waitFor();
  await page.getByLabel("Student view").selectOption("active");
  await page
    .locator("main")
    .getByRole("heading", { name: "Test Student" })
    .waitFor();
  assert.equal(
    await page.getByRole("button", { name: "Accept", exact: true }).count(),
    0,
  );
  await page.goto("http://127.0.0.1:4173/?role=mentor&page=profile");
  await page.getByLabel("Employer (professional background only)").waitFor();
  assert.ok(
    (await page.locator("main").innerText()).includes(
      "does not establish an approved affiliation",
    ),
  );
  await page.goto("http://127.0.0.1:4173/?role=mentor&page=sessions");
  await page
    .getByText("No upcoming mentorship sessions.", { exact: true })
    .waitFor();
  await page.goto(
    "http://127.0.0.1:4173/?role=mentor&page=mentor-project&context=head",
  );
  await page.getByText("Invitations and requests", { exact: true }).click();
  await page
    .getByRole("heading", { name: "Mentees matching this project" })
    .waitFor();
  await page.getByLabel("Student / mentor email", { exact: false }).waitFor();
  assert.ok(
    (await page.locator("main").innerText()).includes(
      "Matching does not grant membership",
    ),
  );
  await page.goto(
    "http://127.0.0.1:4173/?role=mentor&page=mentor-project&context=member",
  );
  await page.getByRole("button", { name: "Leave project" }).waitFor();
  assert.equal(
    await page.getByText("Invitations and requests", { exact: true }).count(),
    0,
  );
  assert.equal(
    await page
      .getByRole("heading", { name: "Mentees matching this project" })
      .count(),
    0,
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: 18 Mentor viewport cases; profile completion, authorized skill matching, accept-to-active reflection, truthful employer copy and upcoming-session empty state.",
  );
} finally {
  await browser.close();
}
