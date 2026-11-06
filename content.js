// Digital Rain — content script. Runs in every frame.
// Top frame: owns the canvas overlay and keyboard input.
// Child frames: only report "a key was pressed" (never which) via background.js.
// Settings arrive only through chrome.storage (popup writes, every tab reacts).
(() => {
  "use strict";
  if (window.__digitalRainLoaded) return;
  window.__digitalRainLoaded = true;

  const { THEMES, SIM, GLYPHS, sanitize, fromStorage, findSiteRule } = window.RainConfig;
  const SECRET_AUTOCOMPLETE = /password|one-time-code|cc-/i;
  const isTop = window === window.top;

  function isSecret(el) {
    return el instanceof HTMLInputElement &&
      (el.type === "password" || SECRET_AUTOCOMPLETE.test(el.autocomplete));
  }

  function watchSettings(onChange) {
    chrome.storage.local.get(["settings", "matrixEnabled"]).then((res) => onChange(fromStorage(res)));
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "local" && changes.settings) onChange(sanitize(changes.settings.newValue));
    });
  }

  if (!isTop) {
    let enabled = false;
    watchSettings((s) => (enabled = s.enabled));
    window.addEventListener("keydown", (e) => {
      if (!enabled || e.isComposing) return;
      const el = e.composedPath?.()[0] ?? e.target;
      const enter = e.key === "Enter" && !isSecret(el);
      chrome.runtime.sendMessage({ type: "RAIN_FRAME_KEY", enter, repeat: e.repeat }).catch(() => {});
    }, true);
    return;
  }

  const host = location.hostname.toLowerCase();
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const rain = window.RainSim.createRain({ glyphs: GLYPHS, ...SIM });
  let settings = sanitize({});
  let canvas = null;
  let ctx = null;
  let raf = 0;
  let last = 0;
  let backdrop = 0;
  let lastRepeat = 0;

  const isActive = () => settings.enabled && !findSiteRule(host, settings.disabledSites);

  // ---- canvas -------------------------------------------------------------

  function setImportant(el, styles) {
    for (const [k, v] of Object.entries(styles)) el.style.setProperty(k, v, "important");
  }

  /** Fullscreen containers are in the top layer; the overlay must live inside them. */
  function overlayParent() {
    const fs = document.fullscreenElement;
    // Replaced elements (e.g. a natively fullscreened <video>) can't hold children.
    const canHold = fs && !/^(VIDEO|AUDIO|IMG|CANVAS|IFRAME)$/.test(fs.tagName);
    return canHold ? fs : document.documentElement;
  }

  function onFullscreenChange() {
    if (canvas) overlayParent().appendChild(canvas);
  }

  function mount() {
    if (canvas) return;
    canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    canvas.dataset.digitalRain = "";
    // !important so page stylesheets (e.g. `canvas { display:none }`) can't break it.
    setImportant(canvas, {
      position: "fixed", inset: "0", width: "100vw", height: "100vh",
      margin: "0", padding: "0", border: "0", display: "block",
      background: "transparent", "pointer-events": "none", "z-index": "2147483647",
    });
    overlayParent().appendChild(canvas);
    ctx = canvas.getContext("2d");
    resize();
    window.addEventListener("resize", resize);
    document.addEventListener("fullscreenchange", onFullscreenChange);
  }

  function unmount() {
    stop();
    window.removeEventListener("resize", resize);
    document.removeEventListener("fullscreenchange", onFullscreenChange);
    canvas?.remove();
    canvas = ctx = null;
    rain.clear();
    backdrop = 0;
  }

  function resize() {
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(innerWidth * dpr);
    canvas.height = Math.round(innerHeight * dpr);
    // Resizing a canvas resets its context state, so re-apply everything.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = `${settings.glyphSize}px "MS Gothic", "Hiragino Kaku Gothic ProN", monospace`;
    ctx.textBaseline = "top";
    rain.resize(Math.ceil(innerWidth / settings.glyphSize), Math.ceil(innerHeight / settings.glyphSize));
    render();
  }

  // ---- loop ---------------------------------------------------------------

  function start() {
    if (raf || !canvas) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05); // cap: tab switches, hitches
    last = now;
    rain.step(dt);
    const target = rain.count() > 0 ? settings.backdrop : 0;
    backdrop += (target - backdrop) * Math.min(1, dt * SIM.backdropEase);
    if (rain.count() === 0 && backdrop < 0.005) {
      backdrop = 0;
      render();
      raf = 0; // idle: stop burning frames until the next keystroke
      return;
    }
    render();
    raf = requestAnimationFrame(frame);
  }

  function render() {
    if (!ctx) return;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    if (backdrop > 0) {
      ctx.fillStyle = `rgba(0,0,0,${backdrop.toFixed(3)})`;
      ctx.fillRect(0, 0, innerWidth, innerHeight);
    }
    const theme = THEMES[settings.theme];
    const size = settings.glyphSize;
    rain.forEachCell((col, row, glyph, k, len, s) => {
      const isHead = k === 0;
      const trail = theme.trail ?? `hsl(${s.hue},100%,62%)`;
      ctx.globalAlpha = isHead ? 1 : 0.9 * (1 - k / len);
      ctx.fillStyle = isHead ? theme.head : trail;
      ctx.shadowBlur = isHead ? 10 : 0;
      ctx.shadowColor = trail;
      ctx.fillText(glyph, col * size, row * size);
    });
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  // ---- input --------------------------------------------------------------

  /** Viewport x of the caret/focused field, or null when there is none. */
  function caretX(el) {
    if (el?.isContentEditable) {
      const sel = getSelection();
      if (sel?.rangeCount) {
        const r = sel.getRangeAt(0).getBoundingClientRect();
        if (r.left || r.width) return r.left;
      }
    }
    if (el instanceof Element && el !== document.body && el !== document.documentElement) {
      const r = el.getBoundingClientRect();
      if (r.width > 0) return r.left + Math.min(textCaretOffset(el), r.width);
    }
    return null;
  }

  /** Approx. px from a text field's left edge to its caret (current visual line). */
  function textCaretOffset(el) {
    if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) || !ctx) return 0;
    const pos = el.selectionStart ?? el.value.length;
    const before = el.value.slice(0, pos);
    const line = before.slice(before.lastIndexOf("\n") + 1);
    const style = getComputedStyle(el);
    const padL = parseFloat(style.paddingLeft) || 0;
    const saved = ctx.font;
    ctx.font = style.font;
    let w = ctx.measureText(line).width;
    ctx.font = saved;
    if (el instanceof HTMLTextAreaElement) {
      const inner = el.clientWidth - padL - (parseFloat(style.paddingRight) || 0);
      // ponytail: wraps by width, not at word boundaries — x can be off by up to a word.
      if (inner > 0) w %= inner;
    }
    return padL + w - el.scrollLeft;
  }

  // The first streak (carrying the typed glyph) lands at the caret; the rest
  // fall anywhere so the whole screen fills as you type.
  function rainAt(x, glyph) {
    const n = reducedMotion.matches ? 1 : settings.density;
    for (let i = 0; i < n; i++) {
      const atCaret = i === 0 && x !== null;
      const col = atCaret
        ? x / settings.glyphSize + (Math.random() * 2 - 1) * SIM.spreadCols
        : Math.random() * rain.cols();
      rain.spawn(col, i === 0 ? glyph : null);
    }
  }

  function burst() {
    const share = SIM.burstFraction * (reducedMotion.matches ? 0.25 : 1);
    for (let c = 0; c < rain.cols(); c++) {
      if (Math.random() < share) rain.spawn(c, null, -Math.random() * SIM.burstStagger);
    }
  }

  /** Shared by local keys and keys relayed from child frames. */
  function trigger({ x = null, glyph = null, enter = false, repeat = false }) {
    if (!canvas) return;
    if (repeat) {
      // Held keys auto-repeat ~30/s; throttle so the screen doesn't saturate.
      const now = performance.now();
      if (now - lastRepeat < 1000 / SIM.repeatRate) return;
      lastRepeat = now;
    }
    if (enter && settings.enterBurst) burst();
    else rainAt(x, glyph);
    start();
  }

  function onKey(e) {
    if (e.isComposing) return;
    const el = e.composedPath?.()[0] ?? e.target; // reaches inputs inside shadow DOM
    const secret = isSecret(el);
    const showKey = settings.typedGlyphs && !secret && e.key.length === 1 && e.key.trim();
    trigger({
      x: caretX(el),
      glyph: showKey ? e.key : null,
      enter: e.key === "Enter" && !secret,
      repeat: e.repeat,
    });
  }

  // ---- settings -----------------------------------------------------------

  function apply(next) {
    const resized = next.glyphSize !== settings.glyphSize;
    settings = next;
    rain.setSpeed(settings.speed * (reducedMotion.matches ? SIM.reducedMotionSpeed : 1));
    if (!isActive()) {
      window.removeEventListener("keydown", onKey, true);
      unmount();
      return;
    }
    mount();
    if (resized) resize();
    window.addEventListener("keydown", onKey, true); // no-op if already added
    render();
  }

  watchSettings(apply);

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (sender.id !== chrome.runtime.id) return false;
    if (msg?.type === "RAIN_PING") {
      sendResponse({ host, active: isActive() });
    } else if (msg?.type === "RAIN_FRAME_KEY" && isActive()) {
      trigger({ enter: msg.enter === true, repeat: msg.repeat === true });
    }
    return false;
  });
})();
