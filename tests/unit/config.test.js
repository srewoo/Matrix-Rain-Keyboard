// Unit tests for config.js — run with `node --test tests/`.
const test = require("node:test");
const assert = require("node:assert/strict");
const { sanitize, fromStorage, findSiteRule, DEFAULTS, LIMITS, THEMES } = require("../../config.js");

test("empty or garbage input yields defaults", () => {
  for (const raw of [undefined, null, 42, "x", []]) {
    assert.deepEqual(sanitize(raw), { ...DEFAULTS, disabledSites: [] });
  }
});

test("numbers are clamped to their limits", () => {
  const s = sanitize({ density: 999, speed: -5, backdrop: 2, glyphSize: 1 });
  assert.equal(s.density, LIMITS.density[1]);
  assert.equal(s.speed, LIMITS.speed[0]);
  assert.equal(s.backdrop, LIMITS.backdrop[1]);
  assert.equal(s.glyphSize, LIMITS.glyphSize[0]);
});

test("non-numeric numbers fall back to defaults", () => {
  assert.equal(sanitize({ speed: "fast" }).speed, DEFAULTS.speed);
  assert.equal(sanitize({ density: NaN }).density, DEFAULTS.density);
});

test("unknown themes and prototype keys are rejected", () => {
  assert.equal(sanitize({ theme: "hotpink" }).theme, DEFAULTS.theme);
  assert.equal(sanitize({ theme: "__proto__" }).theme, DEFAULTS.theme);
  assert.equal(sanitize({ theme: "amber" }).theme, "amber");
});

test("booleans must be real booleans", () => {
  assert.equal(sanitize({ enabled: "true" }).enabled, false);
  assert.equal(sanitize({ enabled: true }).enabled, true);
});

test("unknown fields are dropped", () => {
  assert.ok(!("evil" in sanitize({ evil: 1 })));
});

test("disabled sites are validated, lower-cased and de-duplicated", () => {
  const s = sanitize({ disabledSites: ["Example.com", "example.com", "<script>", 5, "a.b"] });
  assert.deepEqual(s.disabledSites, ["example.com", "a.b"]);
});

test("v1 matrixEnabled flag migrates; v2 settings win over it", () => {
  assert.equal(fromStorage({ matrixEnabled: true }).enabled, true);
  assert.equal(fromStorage({ matrixEnabled: true, settings: { enabled: false } }).enabled, false);
  assert.equal(fromStorage({}).enabled, false);
});

test("default theme exists", () => {
  assert.ok(Object.hasOwn(THEMES, DEFAULTS.theme));
});

test("a site rule covers the exact host and its subdomains only", () => {
  const list = ["google.com"];
  assert.equal(findSiteRule("google.com", list), "google.com");
  assert.equal(findSiteRule("mail.google.com", list), "google.com");
  assert.equal(findSiteRule("MAIL.Google.com", list), "google.com");
  assert.equal(findSiteRule("notgoogle.com", list), undefined);
  assert.equal(findSiteRule("google.com.evil.io", list), undefined);
  assert.equal(findSiteRule("google.com", ["mail.google.com"]), undefined);
});

test("dimming accepts the full 0 (transparent) to 1 (solid black) range", () => {
  assert.equal(sanitize({ backdrop: 1 }).backdrop, 1);
  assert.equal(sanitize({ backdrop: 0 }).backdrop, 0);
  assert.equal(sanitize({ backdrop: 1.5 }).backdrop, 1);
});
