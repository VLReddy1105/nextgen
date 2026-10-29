import assert from "node:assert/strict";
import { chromium } from "../../work/ui-test/node_modules/playwright/index.mjs";
const browser = await chromium.launch({
  headless: true,
  channel: process.env.UI_BROWSER_CHANNEL || "msedge",
});
try {
  const page = await browser.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const role of ["mentor", "company", "university"])
      for (const moduleKey of ["mentors", "mentor-opportunities"]) {
        await page.goto(
          `http://127.0.0.1:4173/?role=${role}&page=${moduleKey}&scenario=affiliations&org=${role === "university" ? "university" : "company"}`,
        );
        await page.locator("main h1").waitFor();
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          `${role}/${moduleKey}/${width}`,
        );
      }
  }
  await page.goto(
    "http://127.0.0.1:4173/?role=mentor&page=mentors&scenario=affiliations",
  );
  await page
    .getByRole("heading", { name: "Independent Mentor" })
    .first()
    .waitFor();
  assert.equal(
    await page
      .getByRole("heading", {
        name: "Company Mentor — Verified Organization",
      })
      .count(),
    0,
  );
  await page
    .getByRole("button", { name: "Accept affiliation", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Company Mentor — Verified Organization" })
    .first()
    .waitFor();
  await page
    .getByRole("button", { name: "End affiliation", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Independent Mentor" })
    .first()
    .waitFor();
  await page
    .getByLabel("How will you mentor on GenZnect?")
    .selectOption("university");
  await page
    .getByText(
      "No eligible organizations match. University accounts must be verified.",
    )
    .waitFor();
  await page.goto(
    "http://127.0.0.1:4173/?role=mentor&page=mentors&scenario=affiliations&direction=request&org=university",
  );
  assert.equal(
    await page
      .getByRole("button", { name: "Accept affiliation", exact: true })
      .count(),
    0,
    "No self-approval action",
  );
  await page
    .getByRole("button", { name: "Cancel request", exact: true })
    .waitFor();
  await page.goto(
    "http://127.0.0.1:4173/?role=university&page=mentors&scenario=affiliations&direction=request&org=university",
  );
  await page
    .getByRole("button", { name: "Accept affiliation", exact: true })
    .click();
  await page
    .getByText(
      "Only sessions explicitly shared with this organization are counted.",
    )
    .waitFor();
  await page.goto(
    "http://127.0.0.1:4173/?role=company&page=mentor-opportunities&scenario=affiliations",
  );
  await page.getByText("Engineer · 0 years experience").waitFor();
  await page.getByLabel("Decision").selectOption("selected");
  await page
    .locator("form")
    .filter({
      has: page.getByRole("heading", { name: "Application decision" }),
    })
    .getByRole("button", { name: "Save application decision", exact: true })
    .click();
  // A pending invitation from the fixture remains pending; selection cannot accept it.
  assert.equal(
    await page.getByRole("button", { name: "End affiliation" }).count(),
    0,
  );
  await page.goto(
    "http://127.0.0.1:4173/?role=mentor&page=mentor-opportunities&scenario=affiliations",
  );
  await page.getByText("Matches python").waitFor();
  await page.getByRole("button", { name: "Withdraw application" }).click();
  assert.equal(
    await page.getByRole("button", { name: "Withdraw application" }).count(),
    0,
  );
  for (const moduleKey of ["mentors", "mentor-opportunities"]) {
    await page.goto(`http://127.0.0.1:4173/?role=mentor&page=${moduleKey}`);
    await page.getByText(/not available yet/).waitFor();
    assert.equal(
      await page.locator("main form").count(),
      0,
      "No pre-migration write form",
    );
    assert.equal(
      await page.getByRole("button", { name: "Accept affiliation" }).count(),
      0,
    );
  }
  await page.goto(
    "http://127.0.0.1:4173/?role=student&page=mentorship&scenario=affiliations",
  );
  await page.getByText("Independent Mentor", { exact: true }).waitFor();
  assert.equal(
    await page.locator('nav a[href="/dashboard/mentors"]').count(),
    0,
  );
  assert.equal(
    await page.locator('nav a[href="/dashboard/mentor-opportunities"]').count(),
    0,
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS 18 affiliation/recruitment viewport cases; invitation consent, independent/pending/accepted display, self-approval prevention, organization approval and scoped progress, decisions, withdrawal, matching, Student badge, and pre-migration guards.",
  );
} finally {
  await browser.close();
}
