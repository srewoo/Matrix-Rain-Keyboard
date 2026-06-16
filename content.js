// Matrix Rain Keyboard — content script
// Full-screen green "digital rain" overlay. Every keypress spawns a new
// streak of falling characters, like the Matrix code waterfall.

(() => {
  if (window.__matrixRainLoaded) return;
  window.__matrixRainLoaded = true;

  const GLYPHS =
    "アイウエオカキクケコサシスセソタチツテトナニヌネノﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾝ0123456789ABCDEFZ:.=*+-<>¦｜çﾘ";
  const FONT_SIZE = 18;

  let enabled = false;
  let canvas, ctx, columns, raf;
  // Each active column holds a vertical position (head) of a falling streak.
  // value === null means that column is currently idle (no rain).
  let drops = [];
  let colCount = 0;

  function buildCanvas() {
    canvas = document.createElement("canvas");
    canvas.id = "__matrix_rain_canvas";
    Object.assign(canvas.style, {
      position: "fixed",
      top: "0",
      left: "0",
      width: "100vw",
      height: "100vh",
      zIndex: "2147483647",
      pointerEvents: "none",
      background: "transparent",
    });
    document.documentElement.appendChild(canvas);
    ctx = canvas.getContext("2d");
    resize();
    window.addEventListener("resize", resize);
  }

  function resize() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    colCount = Math.floor(canvas.width / FONT_SIZE);
    drops = new Array(colCount).fill(null);
    if (ctx) ctx.font = `${FONT_SIZE}px monospace`;
  }

  function randomGlyph() {
    return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
  }

  // Spawn a falling streak in a few random columns per keystroke.
  function spawnRain() {
    if (!enabled || colCount === 0) return;
    const bursts = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < bursts; i++) {
      const col = Math.floor(Math.random() * colCount);
      drops[col] = 0; // start at the top
    }
  }

  function draw() {
    // Translucent black fade leaves trailing tails behind each glyph.
    ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < drops.length; i++) {
      const y = drops[i];
      if (y === null) continue;

      const x = i * FONT_SIZE;
      const pixelY = y * FONT_SIZE;

      // Bright leading character.
      ctx.fillStyle = "#cfffcf";
      ctx.fillText(randomGlyph(), x, pixelY);
      // Classic green trail just behind the head.
      ctx.fillStyle = "#00ff41";
      ctx.fillText(randomGlyph(), x, pixelY - FONT_SIZE);

      drops[i] = y + 1;

      // Reset once the streak runs off the bottom.
      if (pixelY > canvas.height && Math.random() > 0.975) {
        drops[i] = null;
      } else if (pixelY > canvas.height + FONT_SIZE * 40) {
        drops[i] = null;
      }
    }

    raf = requestAnimationFrame(draw);
  }

  function onKey() {
    spawnRain();
  }

  function enable() {
    if (enabled) return;
    enabled = true;
    if (!canvas) buildCanvas();
    canvas.style.display = "block";
    // Clear any stale frame.
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    window.addEventListener("keydown", onKey, true);
    raf = requestAnimationFrame(draw);
  }

  function disable() {
    enabled = false;
    window.removeEventListener("keydown", onKey, true);
    if (raf) cancelAnimationFrame(raf);
    if (canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      canvas.style.display = "none";
    }
    drops = new Array(colCount).fill(null);
  }

  // Restore last state and listen for popup toggles.
  chrome.storage?.local.get(["matrixEnabled"], (res) => {
    if (res && res.matrixEnabled) enable();
  });

  chrome.runtime?.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type === "MATRIX_TOGGLE") {
      if (msg.enabled) enable();
      else disable();
      sendResponse({ ok: true, enabled });
    } else if (msg?.type === "MATRIX_STATUS") {
      sendResponse({ enabled });
    }
    return true;
  });
})();
