import assert from "node:assert/strict";
import { chromium } from "../../work/ui-test/node_modules/playwright/index.mjs";
const browser = await chromium.launch({ headless: true, channel: "msedge" });
try {
  const page = await browser.newPage();
  const errors = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto("http://127.0.0.1:4173/performance.html");
  const click = name => page.getByRole("button", { name, exact: true }).click();
  await click("Resolve test"); await page.locator("main h1").waitFor();
  await click("Targeted mutation"); await click("Targeted mutation");
  assert.equal(await page.locator("html").getAttribute("data-section-calls"), "1");
  await click("Resolve sections");
  await page.waitForFunction(() => document.documentElement.dataset.sectionCalls === "2");
  assert.equal(await page.getByTestId("section-result").textContent(), "empty", "Older section snapshot cannot commit across a newer write");
  await click("Mark one test"); await click("Resolve notices");
  await page.waitForFunction(() => document.querySelector('[data-testid="unread"]').textContent === "0");
  await click("Resolve sections");
  await page.waitForFunction(() => document.querySelector('[data-testid="section-result"]').textContent === "Section 2");
  assert.equal(await page.getByTestId("unread").textContent(), "0", "Section snapshot cannot undo a newer mark-read");
  assert.equal(await page.locator("html").getAttribute("data-calls"), "1", "Targeted writes never reload full workspace");
  assert.deepEqual(errors, []);
  console.log("PASS section refresh: coalescing, stale write rejection, notification race, no full refetch");
} finally { await browser.close(); }
