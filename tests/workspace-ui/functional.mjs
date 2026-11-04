import assert from "node:assert/strict";
import { chromium } from "../../work/ui-test/node_modules/playwright/index.mjs";
const browser = await chromium.launch({
  headless: true,
  channel: process.env.UI_BROWSER_CHANNEL || "msedge",
});
let cases = 0;
try {
  for (const width of [390, 820, 1440])
    for (const role of [
      "student",
      "mentor",
      "company",
      "university",
      "founder",
    ]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 } });
      page.setDefaultTimeout(10000);
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(
        `http://127.0.0.1:4173/?role=${role}&page=projects&view=discover`,
      );
      await page.locator("main h1").first().waitFor();
      const account = page.getByRole("button", {
        name: "Account menu",
        exact: true,
      });
      const bell = page.getByRole("button", { name: /unread notifications/ });
      const panel = page.getByRole("region", {
        name: "Account menu",
        exact: true,
      });
      await account.click();
      assert.equal(await account.getAttribute("aria-expanded"), "true");
      assert.equal(
        await panel
          .getByRole("link", { name: "Profile", exact: true })
          .getAttribute("href"),
        "/dashboard/profile",
      );
      assert.equal(
        await panel
          .getByRole("link", { name: "Account", exact: true })
          .getAttribute("href"),
        "/dashboard/settings#account",
      );
      assert.equal(
        await panel
          .getByRole("link", { name: "Settings", exact: true })
          .getAttribute("href"),
        "/dashboard/settings",
      );
      await account.click();
      assert.equal(await panel.count(), 0);
      await account.click();
      await page.keyboard.press("Escape");
      assert.equal(await panel.count(), 0);
      assert.equal(
        await account.evaluate((el) => el === document.activeElement),
        true,
      );
      await account.click();
      await bell.click();
      assert.equal(await panel.count(), 0);
      assert.equal(await bell.getAttribute("aria-expanded"), "true");
      const notice = page.getByRole("region", { name: /unread notifications/ });
      const box = await notice.boundingBox();
      assert.ok(
        box.x >= 0 && box.x + box.width <= width,
        `${role}/${width} popover overflow`,
      );
      await page.mouse.click(width - 5, 600);
      assert.equal(await notice.count(), 0);
      await bell.click();
      await page.keyboard.press("Escape");
      assert.equal(await notice.count(), 0);
      // Prevent native navigation only to observe the link-click close synchronously.
      await page.evaluate(() =>
        document.addEventListener("click", (e) => {
          if (e.target.closest("a")) e.preventDefault();
        }),
      );
      await account.click();
      await panel.getByRole("link", { name: "Profile", exact: true }).click();
      assert.equal(await panel.count(), 0);
      await bell.click();
      await notice
        .getByRole("link", { name: /View all notifications/ })
        .click();
      assert.equal(await notice.count(), 0);
      if (width < 1024)
        await page.getByRole("button", { name: "Open navigation" }).click();
      const nav =
        width < 1024 ? page.locator("dialog nav") : page.locator("nav").first();
      const chevron = nav.getByRole("button", {
        name: "Expand Projects",
        exact: true,
      });
      assert.equal(await chevron.getAttribute("aria-expanded"), "true");
      assert.equal(
        await nav
          .getByRole("link", { name: "Discover Projects", exact: true })
          .getAttribute("aria-current"),
        "page",
      );
      await chevron.click();
      assert.equal(await chevron.getAttribute("aria-expanded"), "false");
      await nav.locator('a[href="/dashboard/projects"]').click();
      if (width < 1024)
        await page.getByRole("button", { name: "Open navigation" }).click();
      assert.equal(await chevron.getAttribute("aria-expanded"), "true");
      assert.equal(
        await nav
          .getByRole("button", { name: "Expand Events", exact: true })
          .getAttribute("aria-expanded"),
        "false",
      );
      assert.equal(
        await nav
          .getByRole("link", { name: "Help & Support", exact: true })
          .getAttribute("href"),
        "/dashboard/help",
      );
      const sidebarAccount = page.locator(
        'button[aria-label="Sidebar account menu"]:visible',
      );
      await sidebarAccount.click();
      await page.keyboard.press("Escape");
      assert.equal(await sidebarAccount.getAttribute("aria-expanded"), "false");
      await sidebarAccount.click();
      await page
        .getByRole("region", { name: "Sidebar account menu", exact: true })
        .getByRole("link", { name: "Settings", exact: true })
        .click();
      assert.equal(
        await page
          .getByRole("region", { name: "Sidebar account menu", exact: true })
          .count(),
        0,
      );
      if (width < 1024)
        assert.equal(
          await page.locator("dialog").evaluate((el) => el.open),
          false,
        );
      await page.goto(
        `http://127.0.0.1:4173/?role=${role}&page=help&scenario=functional`,
      );
      await page
        .getByRole("heading", { name: "Help & Support", exact: true })
        .waitFor();
      {
        await page.getByRole("button", { name: "Submit report" }).click();
        await page
          .getByRole("alert")
          .filter({ hasText: "at least ten" })
          .waitFor();
        await page
          .getByRole("combobox", { name: /^Category/ })
          .selectOption(
            role === "student" ? "Suspicious Opportunity" : "Privacy",
          );
        await page
          .getByLabel("Subject", { exact: true })
          .fill("Suspicious posting");
        await page
          .getByLabel("Details", { exact: true })
          .fill("Please review this suspicious posting.");
        await page.getByRole("button", { name: "Submit report" }).click();
        await page
          .getByRole("status")
          .filter({ hasText: "local-report" })
          .waitFor();
      }
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      assert.deepEqual(errors, []);
      await page.close();
      cases++;
      console.log(`Passed ${role}/${width}`);
    }
  const page = await browser.newPage();
  await page.goto(
    "http://127.0.0.1:4173/?role=student&page=help&scenario=functional&fail=1",
  );
  await page
    .getByRole("combobox", { name: /^Category/ })
    .selectOption("Suspicious Opportunity");
  await page.getByLabel("Subject", { exact: true }).fill("Failure test");
  await page
    .getByLabel("Details", { exact: true })
    .fill("Retain these details after failure.");
  await page.getByRole("button", { name: "Submit report" }).click();
  await page
    .getByRole("alert")
    .filter({ hasText: "could not be saved" })
    .waitFor();
  assert.equal(
    await page.getByLabel("Details", { exact: true }).inputValue(),
    "Retain these details after failure.",
  );
  console.log(
    `${cases} role/viewport shared interaction and Help cases, plus report failure, passed`,
  );
} finally {
  await browser.close();
}
