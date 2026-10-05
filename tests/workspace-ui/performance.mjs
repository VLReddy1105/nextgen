import { chromium } from "../../work/ui-test/node_modules/playwright/index.mjs";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const baseline = process.argv.includes("before");
const browser = await chromium.launch({
  headless: true,
  channel: process.env.UI_BROWSER_CHANNEL || "msedge",
});
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("http://127.0.0.1:4173/performance.html");
  const count = () =>
    page.locator("html").getAttribute("data-calls").then(Number);
  await page
    .getByRole("button", { name: "Refresh test", exact: true })
    .waitFor();
  await page.getByRole("button", { name: "Refresh test", exact: true }).click();
  await page.evaluate(() => {
    window.dispatchEvent(new Event("focus"));
    window.dispatchEvent(new Event("focus"));
  });
  const overlapCalls = await count();
  if (!baseline)
    assert.equal(
      overlapCalls,
      1,
      "StrictMode, explicit refresh and focus share one pending request",
    );
  const start = performance.now();
  await page.getByRole("button", { name: "Resolve test", exact: true }).click();
  await page.locator("main h1").waitFor();
  const overview = performance.now() - start;
  const navigation = {};
  for (const name of ["opportunities", "projects", "communities", "events"]) {
    const t = performance.now();
    await page
      .getByRole("button", { name: `Open ${name}`, exact: true })
      .click();
    await page.locator("main h1").waitFor();
    navigation[name] = Math.round(performance.now() - t);
  }
  assert.equal(
    await count(),
    overlapCalls,
    "Module changes must not reload workspace",
  );
  if (!baseline) {
    await page
      .getByRole("button", { name: "Refresh test", exact: true })
      .click();
    const inFlight = await count();
    await page
      .getByRole("button", { name: "Mutate test", exact: true })
      .click();
    assert.equal(
      await count(),
      inFlight,
      "Write invalidation waits for current load",
    );
    await page
      .getByRole("button", { name: "Resolve test", exact: true })
      .click();
    await page.waitForFunction(
      (n) => Number(document.documentElement.dataset.calls) === n + 1,
      inFlight,
    );
    await page
      .getByRole("button", { name: "Resolve test", exact: true })
      .click();
    await page
      .getByTestId("revision")
      .filter({ hasText: "Revision 1" })
      .waitFor();
    await page
      .getByRole("button", { name: "Refresh test", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Reject test", exact: true })
      .click();
    await page.getByRole("alert").filter({ hasText: "Test failure" }).waitFor();
    assert.equal(
      await page.getByTestId("revision").textContent(),
      "Revision 1",
      "Background failure retains data",
    );
  }
  assert.deepEqual(errors, []);
  const result = {
    mode: baseline ? "before" : "after",
    overlapCalls,
    overviewRenderAfterDataMs: Math.round(overview),
    componentNavigationMs: navigation,
  };
  await mkdir("work/performance", { recursive: true });
  await writeFile(
    `work/performance/frontend-${result.mode}.json`,
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result, null, 2));
  if (!baseline) {
    const polling = await browser.newPage();
    await polling.clock.install();
    await polling.goto("http://127.0.0.1:4173/performance.html");
    await polling
      .getByRole("button", { name: "Refresh test", exact: true })
      .waitFor();
    const calls = () =>
      polling.locator("html").getAttribute("data-calls").then(Number);
    await polling.clock.fastForward(95000);
    assert.equal(
      await calls(),
      1,
      "95-second request must not overlap with polling",
    );
    await polling
      .getByRole("button", { name: "Resolve test", exact: true })
      .click();
    await polling.locator("main h1").waitFor();
    await polling.evaluate(() => window.dispatchEvent(new Event("focus")));
    assert.equal(await calls(), 1, "Fresh data must not refresh on focus");
    await polling.clock.fastForward(30000);
    assert.equal(await calls(), 2, "Polling resumes after completion");
    await polling.evaluate(() =>
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        value: "hidden",
      }),
    );
    await polling
      .getByRole("button", { name: "Resolve test", exact: true })
      .click();
    await polling.clock.fastForward(120000);
    assert.equal(await calls(), 2, "Hidden tab must not poll");
    await polling.evaluate(() => {
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        value: "visible",
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    assert.equal(await calls(), 3, "Visible stale tab refreshes");
    await polling
      .getByRole("button", { name: "Unmount test", exact: true })
      .click();
    await polling.clock.runFor(1);
    assert.equal(
      await polling.locator("html").getAttribute("data-aborted"),
      "true",
      "Unmount cancels active fetch",
    );
    await polling.close();
    console.log(
      "PASS: slow polling, freshness, hidden tabs, visibility recovery and unmount cancellation",
    );
  }
} finally {
  await browser.close();
}
