import assert from "node:assert/strict";
import { chromium } from "../../work/ui-test/node_modules/playwright/index.mjs";
const browser = await chromium.launch({ headless: true, channel: "msedge" });
try {
  const page = await browser.newPage();
  await page.goto("http://127.0.0.1:4173/session.html");
  const click = (name) => page.getByRole("button", { name, exact: true }).click();
  await click("Resolve accounts");
  await page.getByRole("main").getByText("Private one", { exact: true }).waitFor();
  await click("Old request");
  await click("Change session");
  await page.getByText("Updating your session…").waitFor();
  assert.equal(await page.getByText("Private one", { exact: true }).count(), 0);
  await click("Server identity");
  assert.equal(await page.locator("html").getAttribute("data-abortedone"), "true", "Old account read is aborted");
  assert.equal(await page.locator("html").getAttribute("data-abortedtwo"), null, "Old cleanup must not abort the newest account bootstrap");
  await click("Resolve accounts");
  await page.getByRole("main").getByText("Private two", { exact: true }).waitFor();
  assert.equal(await page.getByText("Private one", { exact: true }).count(), 0, "Old in-flight result must not cross accounts");
  await click("Sign out fixture");
  await page.getByText("Updating your session…").waitFor();
  assert.equal(await page.getByText("Private two", { exact: true }).count(), 0);
  console.log("PASS: account switch/sign-out immediately unmount private state; late old responses cannot cross accounts");
} finally { await browser.close(); }
