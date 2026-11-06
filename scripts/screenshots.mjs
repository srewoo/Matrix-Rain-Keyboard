// Captures Chrome Web Store screenshots (1280x800) from the real built
// extension, so the listing shows exactly what users get.
//   Output: assets/store/screenshot_{1,2,3}_1280x800.png
// Rain is random, so each run differs; re-run if a frame looks sparse.
import { chromium } from "@playwright/test";
import path from "node:path";
import { serve, extensionArgs } from "../tests/e2e/helpers.mjs";

const OUT = path.resolve(import.meta.dirname, "../assets/store");
const SIZE = { width: 1280, height: 800 };
const shot = (page, n) => page.screenshot({ path: path.join(OUT, `screenshot_${n}_1280x800.png`) });

const server = await serve();
const site = `http://127.0.0.1:${server.address().port}`;
const context = await chromium.launchPersistentContext("", {
  channel: "chromium", viewport: SIZE, deviceScaleFactor: 1, args: extensionArgs,
});
const sw = context.serviceWorkers()[0] ?? (await context.waitForEvent("serviceworker"));
const setSettings = (s) => sw.evaluate((v) => chrome.storage.local.set({ settings: v }), s);
const page = await context.newPage();

try {
  // 1. Typing in a light-theme editor: rain follows the caret.
  await setSettings({ enabled: true, density: 4 });
  await page.goto(`${site}/showcase.html`);
  await page.locator("canvas[data-digital-rain]").waitFor({ state: "attached" });
  await page.locator("#body").click();
  await page.keyboard.type("Ship the new build, then coffee. Remember to water the plants", { delay: 45 });
  await shot(page, 1);

  // 2. Enter burst on a dark page, rainbow theme.
  await setSettings({ enabled: true, theme: "rainbow", density: 3 });
  await page.goto(`${site}/showcase.html?dark`);
  await page.locator("canvas[data-digital-rain]").waitFor({ state: "attached" });
  await page.locator("#body").click();
  await page.keyboard.type("Ideas for the weekend", { delay: 40 });
  await page.keyboard.press("Enter");
  await page.waitForTimeout(1100);
  await shot(page, 2);

  // 3. The settings popup over a page with amber rain.
  const id = new URL(sw.url()).host;
  const popup = await context.newPage();
  await popup.setViewportSize({ width: 312, height: 600 });
  await popup.goto(`chrome-extension://${id}/popup.html`);
  await setSettings({ enabled: true, theme: "amber", density: 5 });
  await popup.reload();
  // Opened as a tab, the popup has no page behind it and shows its "can't run
  // here" state. Render the state it shows over a normal page instead.
  await popup.evaluate(() => {
    const status = document.getElementById("status");
    status.textContent = "Type on the page — the rain follows your caret. Enter bursts.";
    status.classList.remove("warn");
    document.getElementById("site-name").textContent = "notes.example.com";
    document.getElementById("siteOn").checked = true;
    document.getElementById("site-row").hidden = false;
  });
  const png = (await popup.locator("body").screenshot()).toString("base64");
  await popup.close();
  await page.goto(`${site}/showcase.html`);
  await page.locator("canvas[data-digital-rain]").waitFor({ state: "attached" });
  await page.locator("#body").click();
  await page.keyboard.type("Pick a theme, speed and density from the toolbar", { delay: 40 });
  await page.evaluate((src) => {
    const img = Object.assign(document.createElement("img"), { src: `data:image/png;base64,${src}` });
    Object.assign(img.style, {
      position: "fixed", top: "12px", right: "24px", zIndex: "2147483647",
      borderRadius: "10px", boxShadow: "0 12px 40px rgba(0,0,0,.45)", border: "1px solid #0b3d1a",
    });
    document.documentElement.append(img); // after the rain canvas, so it sits on top
    return img.decode();
  }, png);
  await shot(page, 3);
  console.log(`Screenshots -> ${path.relative(process.cwd(), OUT)}`);
} finally {
  await context.close();
  server.close();
}
