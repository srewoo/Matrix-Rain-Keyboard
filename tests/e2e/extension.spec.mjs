// End-to-end behaviour of the packaged extension in real Chromium.
import { test, expect, setSettings, getSettings, overlay, inkedPixels } from "./helpers.mjs";

test("is off by default and leaves the page untouched", async ({ page, sw, site }) => {
  await page.goto(`${site}/page.html`);
  await page.waitForTimeout(500);
  await expect(overlay(page)).toHaveCount(0);
});

test("enabling adds a transparent overlay: the page stays visible until you type", async ({ page, sw, site }) => {
  await page.goto(`${site}/page.html`);
  await setSettings(sw, { enabled: true });
  await expect(overlay(page)).toHaveCount(1);
  await page.waitForTimeout(1500); // v1 painted the page black within ~1s
  expect(await inkedPixels(page)).toBe(0);
});

test("typing makes rain, which clears itself once idle", async ({ page, sw, site }) => {
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(`${site}/page.html`);
  await setSettings(sw, { enabled: true, speed: 3 });
  await expect(overlay(page)).toHaveCount(1);
  await page.locator("#msg").pressSequentially("hello world");
  await expect.poll(() => inkedPixels(page)).toBeGreaterThan(0);
  await expect.poll(() => inkedPixels(page), { timeout: 15_000 }).toBe(0);
  expect(errors).toEqual([]);
});

test("settings apply live to every open tab", async ({ context, sw, site }) => {
  const a = await context.newPage();
  const b = await context.newPage();
  await a.goto(`${site}/page.html`);
  await b.goto(`${site}/page.html`);
  await setSettings(sw, { enabled: true });
  await expect(overlay(a)).toHaveCount(1);
  await expect(overlay(b)).toHaveCount(1);
  await setSettings(sw, { enabled: false });
  await expect(overlay(a)).toHaveCount(0);
  await expect(overlay(b)).toHaveCount(0);
});

test("turning a site off removes the overlay there", async ({ page, sw, site }) => {
  await page.goto(`${site}/page.html`);
  await setSettings(sw, { enabled: true });
  await expect(overlay(page)).toHaveCount(1);
  await setSettings(sw, { enabled: true, disabledSites: ["127.0.0.1"] });
  await expect(overlay(page)).toHaveCount(0);
});

test("keys typed in a cross-origin iframe rain on the top page", async ({ page, sw, site }) => {
  await page.goto(`${site}/page.html`);
  await setSettings(sw, { enabled: true });
  await expect(overlay(page)).toHaveCount(1);
  const inner = page.frameLocator("#frame").locator("#inner");
  await inner.click();
  await inner.pressSequentially("typing in a frame");
  await expect.poll(() => inkedPixels(page)).toBeGreaterThan(0);
});

test("no overlay is created inside child frames", async ({ page, sw, site }) => {
  await page.goto(`${site}/page.html`);
  await setSettings(sw, { enabled: true });
  await expect(overlay(page)).toHaveCount(1);
  await expect(page.frameLocator("#frame").locator("canvas")).toHaveCount(0);
});

test("fullscreen moves the overlay into the fullscreen element and back", async ({ page, sw, site }) => {
  await page.goto(`${site}/page.html`);
  await setSettings(sw, { enabled: true });
  await expect(overlay(page)).toHaveCount(1);
  const parentId = () => page.evaluate(() => document.querySelector("canvas[data-digital-rain]").parentElement.id || "html");
  await page.click("#fs");
  await expect.poll(parentId).toBe("stage");
  await page.evaluate(() => document.exitFullscreen());
  await expect.poll(parentId).toBe("html");
});

test("popup toggles the extension and shows its state", async ({ page, sw, extensionId }) => {
  await page.goto(`chrome-extension://${extensionId}/popup.html`);
  const toggle = page.locator("#toggle");
  await expect(toggle).toHaveText("ENABLE");
  await toggle.click();
  await expect(toggle).toHaveText("DISABLE");
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  expect((await getSettings(sw)).enabled).toBe(true);
});

test("popup sliders save clamped values", async ({ page, sw, extensionId }) => {
  await page.goto(`chrome-extension://${extensionId}/popup.html`);
  await page.locator("#density").fill("8");
  await page.locator("#theme").selectOption("amber");
  await expect.poll(async () => (await getSettings(sw))?.density).toBe(8);
  expect((await getSettings(sw)).theme).toBe("amber");
  await expect(page.locator("#density-out")).toHaveText("8");
});

test("100% dimming turns the background solid black while it rains", async ({ page, sw, site }) => {
  await page.goto(`${site}/page.html`);
  await setSettings(sw, { enabled: true, backdrop: 1 });
  await expect(overlay(page)).toHaveCount(1);
  await page.locator("#msg").pressSequentially("lights out");
  // A corner pixel away from the rain: opaque black once the fade-in completes.
  const corner = () => page.evaluate(() => {
    const c = document.querySelector("canvas[data-digital-rain]");
    const [r, g, b, a] = c.getContext("2d").getImageData(c.width - 2, c.height - 2, 1, 1).data;
    return { r, g, b, a };
  });
  await expect.poll(async () => (await corner()).a, { timeout: 5_000 }).toBeGreaterThan(250);
  const { r, g, b } = await corner();
  expect(r + g + b).toBeLessThan(10);
});
