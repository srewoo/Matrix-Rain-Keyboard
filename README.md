# Matrix Rain Keyboard 🟢

A fun Chrome extension that turns any web page into a full-screen Matrix
"digital rain". Every key you press spawns fresh green characters cascading
down the screen.

## Install (Load Unpacked)

1. Open Chrome and go to `chrome://extensions`
2. Toggle **Developer mode** ON (top-right)
3. Click **Load unpacked**
4. Select this folder: `matrix/`
5. Pin the extension and click its icon → **ENABLE**

## Use

- Click the toolbar icon and hit **ENABLE**.
- Click anywhere on the page and **start typing** — each keystroke feeds the rain.
- Click the icon again → **DISABLE** to stop.

State is remembered per session via `chrome.storage`.

## Notes

- The overlay is click-through (`pointer-events: none`), so the page stays usable.
- It can't run on restricted pages like `chrome://` or the Web Store.
- Files: `manifest.json`, `content.js` (effect), `popup.html/js` (toggle), `icon{16,48,128}.png`.
- Store assets + listing/privacy docs live in `assets/` and `store/`.
- Regenerate all art any time: `python3 assets/generate_assets.py`.
- Web Store upload package: `matrix-rain-keyboard-v1.0.0.zip`.
