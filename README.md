# Digital Rain Keyboard

Chrome extension: falling-code "digital rain" that follows your typing. Rain fills the screen as
you type, the letters you type fall from your cursor, and **Enter** sends a
wave across the screen.

## Install (Load Unpacked)

1. `npm install && npm run build`
2. `chrome://extensions` → **Developer mode** ON → **Load unpacked** → pick `dist/extension/`.
3. Pin the extension, click it, hit **ENABLE**, then type on any page.
   (Tabs opened before installing need one reload.)

## Settings (toolbar popup)

| Setting | Range |
|---|---|
| Theme | Classic green, Amber, Ice cyan, Crimson, Violet, Rainbow |
| Density | 1–8 streaks per keystroke |
| Speed | 0.5×–3× |
| Glyph size | 12–32 px |
| Page dimming | 0% (transparent) to 100% (solid black); fades in only while rain is falling |
| Show typed characters | on/off |
| Enter key bursts the screen | on/off |
| Run on *this site* | untick to turn it off for that site and its subdomains |

Changes apply live to every open tab.

## Privacy & behaviour

- Typed characters are drawn **only** in the moment and never stored or sent.
  Password, one-time-code and credit-card fields never show typed characters.
- No network requests. Only permission: `storage`.
- Respects `prefers-reduced-motion` (1 streak per key, half speed, smaller bursts).
- The animation loop stops once the screen is clear — zero CPU while idle.
- The overlay is click-through and DPI-aware.
- Works when typing in embedded editors (iframes): child frames tell the top
  page *that* a key was pressed, never *which* key, via the background worker.
- Fullscreen pages keep the overlay (except a natively fullscreened `<video>`).

## Development

| Command | What it does |
|---|---|
| `npm test` | Unit tests (simulation + settings validation), no browser |
| `npm run build` | Validates the manifest and code, writes `dist/extension/` and the store zip |
| `npm run test:e2e` | Builds, then loads the real extension in Chromium and tests it |
| `npm run test:all` | Both test suites |
| `npm run assets` | Regenerates icons and promo tiles (Pillow + macOS Hiragino font) |
| `npm run screenshots` | Captures store screenshots from the real extension |
| `npm run release` | All tests, build, screenshots — then follow `store/SUBMISSION_CHECKLIST.md` |
| `npm version patch` | Bumps the version in `package.json` and `manifest.json` together |

Requirements: Node 20+, `zip` on PATH. First e2e run: `npx playwright install chromium`.

## Files

| File | Role |
|---|---|
| `manifest.json` | MV3 manifest |
| `config.js` | Themes, limits, defaults, sim tuning, settings validation, site rules |
| `rain.js` | Pure rain simulation (no DOM) |
| `content.js` | Overlay, keyboard input, frame relay, storage sync |
| `background.js` | Relays key presses from embedded frames to the top frame |
| `popup.html/js` | Settings UI |
| `scripts/` | Build, version sync, screenshot capture |
| `tests/unit/`, `tests/e2e/` | Node unit tests; Playwright e2e tests |
| `assets/` | Art generator and store images |
| `store/` | Listing text, privacy policy, submission checklist |
