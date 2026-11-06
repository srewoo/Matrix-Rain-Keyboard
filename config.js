// Digital Rain — shared config: themes, tuning, settings schema.
// Loaded by the content script, the popup, and the Node unit tests.
(function (root) {
  "use strict";

  const GLYPHS =
    "アイウエオカキクケコサシスセソタチツテトナニヌネノﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾝ0123456789ABCDEFZ:.=*+-<>¦｜";

  /** Colour themes. `trail: null` means a per-streak hue (rainbow). */
  const THEMES = Object.freeze({
    classic: { label: "Classic green", head: "#e8ffe8", trail: "#00ff41" },
    amber: { label: "Amber terminal", head: "#fff3d6", trail: "#ffb000" },
    cyan: { label: "Ice cyan", head: "#e6ffff", trail: "#00e5ff" },
    crimson: { label: "Crimson", head: "#ffe3e6", trail: "#ff2a4d" },
    violet: { label: "Violet", head: "#f3e8ff", trail: "#b14bff" },
    rainbow: { label: "Rainbow", head: "#ffffff", trail: null },
  });

  /** Inclusive [min, max] for each numeric user setting. */
  const LIMITS = Object.freeze({
    density: [1, 8], // streaks per keystroke
    speed: [0.5, 3], // fall-speed multiplier
    backdrop: [0, 1], // page dimming while rain is visible (1 = solid black)
    glyphSize: [12, 32], // CSS px
  });

  const DEFAULTS = Object.freeze({
    enabled: false,
    theme: "classic",
    density: 3,
    speed: 1,
    backdrop: 0.45,
    glyphSize: 18,
    typedGlyphs: true,
    enterBurst: true,
    disabledSites: Object.freeze([]),
  });

  /** Simulation tuning. Not user-facing. */
  const SIM = Object.freeze({
    trailLength: [10, 24], // glyphs per streak, inclusive range
    baseSpeed: 22, // rows per second at speed 1
    maxStreaks: 250, // hard cap on live streaks (bounds draw cost)
    mutateRate: 1.5, // trail glyph swaps per streak per second
    spreadCols: 2, // how far from the caret the typed-glyph streak may land
    burstFraction: 0.6, // share of columns an Enter burst fills
    burstStagger: 12, // rows of random start offset in a burst
    backdropEase: 3, // backdrop fade speed (per second)
    reducedMotionSpeed: 0.5, // speed multiplier under prefers-reduced-motion
    repeatRate: 8, // max auto-repeat keystrokes handled per second
  });

  const MAX_SITES = 500;
  const HOST_RE = /^[a-z0-9.-]{1,253}$/i;

  function clamp(value, [lo, hi], fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback;
  }

  function cleanSites(list) {
    if (!Array.isArray(list)) return [];
    const valid = list.filter((h) => typeof h === "string" && HOST_RE.test(h));
    return [...new Set(valid.map((h) => h.toLowerCase()))].slice(0, MAX_SITES);
  }

  /**
   * Validate untrusted settings (storage can hold anything). Unknown fields
   * are dropped, numbers clamped, enums allowlisted.
   * @param {unknown} raw
   * @returns {typeof DEFAULTS}
   */
  function sanitize(raw) {
    const r = raw && typeof raw === "object" ? raw : {};
    const bool = (v, d) => (typeof v === "boolean" ? v : d);
    return {
      enabled: bool(r.enabled, DEFAULTS.enabled),
      theme: Object.hasOwn(THEMES, r.theme) ? r.theme : DEFAULTS.theme,
      density: Math.round(clamp(r.density, LIMITS.density, DEFAULTS.density)),
      speed: clamp(r.speed, LIMITS.speed, DEFAULTS.speed),
      backdrop: clamp(r.backdrop, LIMITS.backdrop, DEFAULTS.backdrop),
      glyphSize: Math.round(clamp(r.glyphSize, LIMITS.glyphSize, DEFAULTS.glyphSize)),
      typedGlyphs: bool(r.typedGlyphs, DEFAULTS.typedGlyphs),
      enterBurst: bool(r.enterBurst, DEFAULTS.enterBurst),
      disabledSites: cleanSites(r.disabledSites),
    };
  }

  /**
   * Build settings from a chrome.storage.local result, migrating the v1
   * `matrixEnabled` flag.
   * @param {{settings?: unknown, matrixEnabled?: unknown}} res
   */
  function fromStorage(res) {
    const stored = res?.settings && typeof res.settings === "object" ? res.settings : {};
    const legacy = typeof res?.matrixEnabled === "boolean" ? { enabled: res.matrixEnabled } : {};
    return sanitize({ ...legacy, ...stored });
  }

  /**
   * The disabled-site entry covering `host` (exact or parent domain), if any.
   * "google.com" covers "mail.google.com"; "mail.google.com" does not cover "google.com".
   * @param {string} host
   * @param {string[]} list
   * @returns {string|undefined}
   */
  function findSiteRule(host, list) {
    const h = String(host).toLowerCase();
    return list.find((d) => h === d || h.endsWith(`.${d}`));
  }

  const api = { GLYPHS, THEMES, LIMITS, DEFAULTS, SIM, sanitize, fromStorage, findSiteRule };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.RainConfig = api;
})(globalThis);
