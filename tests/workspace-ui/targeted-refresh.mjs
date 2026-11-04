import assert from "node:assert/strict";
import { chromium } from "../../work/ui-test/node_modules/playwright/index.mjs";
const browser = await chromium.launch({ headless: true, channel: "msedge" });
try {
  const page = await browser.newPage();
  await page.goto("http://127.0.0.1:4173/performance.html");
  const click = (name) => page.getByRole("button", { name, exact: true }).click();
  const calls = () => page.locator("html").getAttribute("data-calls").then(Number);
  const notices = () => page.locator("html").getAttribute("data-notice-calls").then(Number);
  await click("Resolve test");
  await page.locator("main h1").waitFor();
  const initial = await calls();
  await click("No refresh test");
  assert.equal(await calls(), initial, "Support/settings must not reload workspace");
  // Hold an old full snapshot across a confirmed mark-read and targeted refresh.
  await click("Refresh test");
  await click("Mark one test");
  assert.equal(await notices(), 1);
  assert.equal(await calls(), initial + 1);
  assert.equal(await page.getByTestId("unread").textContent(), "1", "Wait for server confirmation");
  await click("Resolve notices");
  await page.waitForFunction(() => document.querySelector('[data-testid="unread"]').textContent === "0");
  await click("Resolve test");
  assert.equal(await page.getByTestId("unread").textContent(), "0", "Old full snapshot must not restore unread state");
  assert.equal(await page.getByTestId("module-unread").textContent(), "0");
  await click("Mark all test");
  await click("Mark one test");
  assert.equal(await notices(), 2, "Overlapping updates share the pending read");
  await click("Resolve notices");
  await page.waitForFunction(() => document.documentElement.dataset.noticeCalls === "3");
  await click("Resolve notices");
  assert.equal(await calls(), initial + 1, "Mark-one/all never load unrelated sections");
  await click("Mark all test");
  await click("Reject notices");
  assert.equal(await page.getByTestId("unread").textContent(), "0", "Failed reads preserve confirmed state");
  await click("Open notifications");
  await click("Mark all read");
  await click("Resolve notices");
  await page.getByRole("button", { name: "Mark all read", exact: true }).waitFor();
  assert.equal(await calls(), initial + 1, "Real notification Action forwards the narrow refresh scope");
  console.log("PASS targeted refresh: narrow reads, coalescing, racing snapshots, counters, failure preservation");
} finally {
  await browser.close();
}
