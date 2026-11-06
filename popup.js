// Digital Rain — popup. Writes settings to chrome.storage.local; every tab's
// content script picks them up through storage.onChanged (no messaging needed).
(async () => {
  "use strict";
  const { THEMES, LIMITS, sanitize, fromStorage, findSiteRule } = window.RainConfig;
  const $ = (id) => document.getElementById(id);
  const SLIDERS = ["density", "speed", "glyphSize", "backdrop"];
  const FORMAT = {
    density: (v) => `${v}`,
    speed: (v) => `${v.toFixed(1)}×`,
    glyphSize: (v) => `${v}px`,
    backdrop: (v) => `${Math.round(v * 100)}%`,
  };

  let settings = fromStorage(await chrome.storage.local.get(["settings", "matrixEnabled"]));
  const page = await pingActiveTab();

  async function pingActiveTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      return tab?.id ? await chrome.tabs.sendMessage(tab.id, { type: "RAIN_PING" }) : null;
    } catch {
      return null; // restricted page, or tab opened before the extension loaded
    }
  }

  async function save(patch) {
    settings = sanitize({ ...settings, ...patch });
    await chrome.storage.local.set({ settings });
    await chrome.storage.local.remove("matrixEnabled"); // v1 key, migrated
    render();
  }

  function statusText() {
    if (!page) return ["Can't run on this tab. Reload it, or it's a browser page.", true];
    if (!settings.enabled) return ["Off everywhere.", false];
    const rule = findSiteRule(page.host, settings.disabledSites);
    if (rule) return [`Off on ${rule === page.host ? rule : `${rule} and its subdomains`}.`, false];
    return ["Type on the page — the rain follows your caret. Enter bursts.", false];
  }

  function render() {
    const btn = $("toggle");
    btn.textContent = settings.enabled ? "DISABLE" : "ENABLE";
    btn.setAttribute("aria-pressed", String(settings.enabled));
    $("theme").value = settings.theme;
    for (const key of SLIDERS) {
      $(key).value = settings[key];
      $(`${key}-out`).textContent = FORMAT[key](settings[key]);
    }
    $("typedGlyphs").checked = settings.typedGlyphs;
    $("enterBurst").checked = settings.enterBurst;
    if (page?.host) $("siteOn").checked = !findSiteRule(page.host, settings.disabledSites);
    const [text, warn] = statusText();
    $("status").textContent = text;
    $("status").classList.toggle("warn", warn);
  }

  function bind() {
    for (const [id, t] of Object.entries(THEMES)) $("theme").add(new Option(t.label, id));
    for (const key of SLIDERS) {
      [$(key).min, $(key).max] = LIMITS[key];
      $(key).addEventListener("input", (e) => save({ [key]: Number(e.target.value) }));
    }
    $("toggle").addEventListener("click", () => save({ enabled: !settings.enabled }));
    $("theme").addEventListener("change", (e) => save({ theme: e.target.value }));
    $("typedGlyphs").addEventListener("change", (e) => save({ typedGlyphs: e.target.checked }));
    $("enterBurst").addEventListener("change", (e) => save({ enterBurst: e.target.checked }));
    if (page?.host) {
      $("site-row").hidden = false;
      $("site-name").textContent = page.host;
      $("siteOn").addEventListener("change", (e) => {
        // Turning a site back on also lifts any parent-domain rule covering it.
        const rest = settings.disabledSites.filter((d) => !findSiteRule(page.host, [d]));
        save({ disabledSites: e.target.checked ? rest : [...rest, page.host] });
      });
    }
  }

  bind();
  render();
})();
