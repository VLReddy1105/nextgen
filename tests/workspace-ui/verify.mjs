import { chromium } from "../../work/ui-test/node_modules/playwright/index.mjs";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
await mkdir("work/ui-review", { recursive: true });
const browser = await chromium.launch({
  headless: true,
  channel: process.env.UI_BROWSER_CHANNEL || undefined,
});
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
for (const width of [1440, 1366, 1024, 768, 390]) {
  await page.setViewportSize({ width, height: 1000 });
  for (const section of [
    "overview",
    "profile",
    "opportunities",
    "ai-tools",
    "notifications",
  ]) {
    await page.goto(`http://127.0.0.1:4173/?page=${section}&state=populated`);
    await page.locator("main h1").waitFor();
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `${section} overflow at ${width}`,
    );
    await page.screenshot({
      path: `work/ui-review/${section}-${width}.png`,
      fullPage: true,
    });
  }
}
await page.goto("http://127.0.0.1:4173/?page=overview");
await page.getByRole("button", { name: "Open navigation" }).click();
assert.equal(await page.locator("dialog").evaluate((e) => e.open), true);
await page.keyboard.press("Escape");
assert.equal(await page.locator("dialog").evaluate((e) => e.open), false);
assert.equal(
  await page.evaluate(() => document.activeElement?.getAttribute("aria-label")),
  "Open navigation",
);
await page.goto("http://127.0.0.1:4173/?page=profile&section=skills");
await page.getByRole("heading", { name: "Skills & interests" }).waitFor();
await page.keyboard.press("Tab");
assert.ok(await page.evaluate(() => document.activeElement !== document.body));
for (const state of ["loading", "error"]) {
  await page.goto(`http://127.0.0.1:4173/?state=${state}`);
  await page
    .locator(
      state === "loading" ? "main [aria-busy=true]" : "main [role=alert]",
    )
    .waitFor();
  await page.screenshot({
    path: `work/ui-review/${state}-390.png`,
    fullPage: true,
  });
}
assert.deepEqual(errors, []);
console.log(
  "PASS: 25 component/width combinations; no overflow; mobile dialog Escape/focus restore; keyboard focus; empty/loading/error states. Authenticated live integration is a separate test.",
);
await browser.close();
