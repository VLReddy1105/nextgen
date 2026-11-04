import assert from "node:assert/strict";
import { chromium } from "../../work/ui-test/node_modules/playwright/index.mjs";
const browser = await chromium.launch({ headless: true, channel: "msedge" });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  for (const role of ["student", "mentor", "company", "university", "founder"]) {
    await page.goto(`http://127.0.0.1:4173/bootstrap.html?role=${role}`);
    await page.getByRole("heading", { name: `${role} overview ready`, exact: true }).waitFor();
    for (const label of ["Account menu", "Sidebar account menu"]) {
      const text = await page.getByRole("button", { name: label, exact: true }).innerText();
      assert.ok(text.toLowerCase().includes(role), `${role}: ${label} must display the role`);
      assert.ok(!text.includes("Account"));
    }
    assert.equal(await page.locator("html").getAttribute("data-calls"), "1", "StrictMode shares the active bootstrap");
  }
  await page.goto("http://127.0.0.1:4173/bootstrap.html?role=student&scenario=missing");
  await page.getByText("The workspace API is out of date. Restart the backend with the current code, then retry.", { exact: true }).waitFor();
  assert.ok((await page.getByRole("button", { name: "Account menu", exact: true }).innerText()).toLowerCase().includes("student"));
  assert.equal(await page.locator("html").getAttribute("data-calls"), "1", "Missing route must not trigger a broad fallback");
  await page.goto("http://127.0.0.1:4173/bootstrap.html?role=student&scenario=expired");
  await page.getByText("Your session has expired. Sign in again.", { exact: true }).waitFor();
  assert.equal(await page.getByRole("heading", { name: "student overview ready" }).count(), 0);
  assert.deepEqual(errors, []);
  console.log("PASS real API client bootstrap: five roles, role labels, StrictMode, missing route, expired session, no broad fallback");
} finally { await browser.close(); }
