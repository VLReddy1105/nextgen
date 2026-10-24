import assert from "node:assert/strict";
import { chromium } from "../../work/ui-test/node_modules/playwright/index.mjs";
const browser = await chromium.launch({
  headless: true,
  channel: process.env.UI_BROWSER_CHANNEL || "msedge",
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const open = async (role, moduleKey, extra = "") => {
    await page.goto(
      `http://127.0.0.1:4173/?role=${role}&page=${moduleKey}${extra}`,
    );
    await page.locator("main h1").first().waitFor();
  };
  for (const [role, modules] of Object.entries({
    company: [
      "overview",
      "applications",
      "talent",
      "projects",
      "events",
      "settings",
    ],
    university: [
      "overview",
      "students",
      "student-connections",
      "announcements",
      "settings",
    ],
    mentor: [
      "overview",
      "requests",
      "students",
      "connections",
      "projects",
      "events",
      "sessions",
      "settings",
    ],
    founder: [
      "overview",
      "connections",
      "projects",
      "communities",
      "events",
      "settings",
    ],
  })) {
    for (const moduleKey of modules) {
      await open(role, moduleKey);
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${role}/${moduleKey} overflow`,
      );
    }
    const nav = page.locator("nav[aria-label='Workspace navigation']").first();
    assert.equal(await nav.count(), 1);
    assert.ok(await nav.locator('a[href="/dashboard/overview"]').count());
    assert.equal(
      await nav.locator('a[href="/dashboard/my-university"]').count(),
      0,
    );
    assert.equal(await nav.locator('a[href="/dashboard/ai-tools"]').count(), 0);
  }
  await open("founder", "overview");
  assert.equal(
    await page.locator('nav a[href="/dashboard/talent"]').count(),
    0,
  );
  assert.equal(
    await page.locator('nav a[href="/dashboard/applications"]').count(),
    0,
  );
  await open("mentor", "requests", "&scenario=roles");
  await page.getByRole("button", { name: "Accept", exact: true }).click();
  await page.getByText(/No mentorship requests in this view/).waitFor();
  assert.equal(
    await page.getByRole("button", { name: "Accept", exact: true }).count(),
    0,
  );
  await open("mentor", "connections", "&scenario=roles");
  await page.getByRole("button", { name: "Decline", exact: true }).click();
  await page.locator("main").getByText("declined", { exact: true }).waitFor();
  await open("university", "student-connections", "&scenario=roles");
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await page.getByText("No requests waiting for approval.").waitFor();
  await page.getByText("Test Student · approved", { exact: true }).waitFor();
  await page.goto(
    "http://127.0.0.1:4173/?role=mentor&page=requests&scenario=failure",
  );
  await page.getByRole("alert").waitFor();
  assert.ok(
    (await page.getByRole("alert").innerText()).includes(
      "Controlled connection read failed",
    ),
  );
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await page.getByRole("alert").waitFor();
  await open("company", "opportunities");
  await page.getByText("Create opportunity", { exact: true }).click();
  await page.getByLabel("Title", { exact: false }).fill("   ");
  await page
    .getByLabel("Registration / application deadline", { exact: false })
    .fill("2099-01-01T10:00");
  await page
    .getByRole("button", { name: "Save opportunity", exact: true })
    .click();
  await page.getByText("Title is required.", { exact: true }).waitFor();
  assert.deepEqual(errors, []);
  console.log(
    "PASS: role navigation/pages and privacy boundaries; mentorship accept/decline reflection; campus decision/history; loading/error retry; whitespace validation.",
  );
} finally {
  await browser.close();
}
