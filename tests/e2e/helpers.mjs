// Shared fixtures: a local HTTP server for test pages and a Chromium context
// with the built extension loaded.
import { test as base, chromium } from "@playwright/test";
import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const EXT = path.resolve(import.meta.dirname, "../../dist/extension");
const FIXTURES = path.join(import.meta.dirname, "fixtures");

export function serve() {
  const server = http.createServer(async (req, res) => {
    // basename() keeps requests inside the fixtures folder.
    const name = path.basename(new URL(req.url, "http://x").pathname) || "page.html";
    if (name === "favicon.ico") return void res.writeHead(204).end();
    try {
      const body = await readFile(path.join(FIXTURES, name));
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end(body);
    } catch {
      res.writeHead(404).end();
    }
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

export const extensionArgs = [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`];

export const test = base.extend({
  site: [async ({}, use) => {
    const server = await serve();
    await use(`http://127.0.0.1:${server.address().port}`);
    server.close();
  }, { scope: "worker" }],

  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext("", {
      channel: "chromium", // new headless mode, which supports extensions
      viewport: { width: 1280, height: 800 },
      args: extensionArgs,
    });
    await use(context);
    await context.close();
  },

  sw: async ({ context }, use) => {
    const sw = context.serviceWorkers()[0] ?? (await context.waitForEvent("serviceworker"));
    await use(sw);
  },

  extensionId: async ({ sw }, use) => use(new URL(sw.url()).host),
});

export { expect } from "@playwright/test";

export const setSettings = (sw, settings) =>
  sw.evaluate((s) => chrome.storage.local.set({ settings: s }), settings);

export const getSettings = (sw) =>
  sw.evaluate(async () => (await chrome.storage.local.get("settings")).settings);

export const overlay = (page) => page.locator("canvas[data-digital-rain]");

/** Count of sampled overlay pixels with any opacity; -1 when there's no overlay. */
export const inkedPixels = (page) =>
  page.evaluate(() => {
    const c = document.querySelector("canvas[data-digital-rain]");
    if (!c) return -1;
    const { data } = c.getContext("2d").getImageData(0, 0, c.width, c.height);
    let n = 0;
    for (let i = 3; i < data.length; i += 64) if (data[i] > 0) n++;
    return n;
  });
