# Chrome Web Store Listing — Digital Rain Keyboard

Copy these fields into the Developer Dashboard. Assets live in `assets/store/`.

## Name
Digital Rain Keyboard

## Summary (≤132 chars)
Falling-code digital rain that follows your typing. Six themes, adjustable speed and density, and per-site control.

## Category
Fun (alt: Entertainment)

## Language
English

## Detailed description
Turn your typing into a cascade of falling code.

Digital Rain Keyboard draws glowing streams of characters over any web page as
you type. The letter you press falls from your cursor, more streams fill the
screen with every keystroke, and pressing Enter sends a wave across the page.
When you stop typing, the rain fades away and the page is back to normal.

FEATURES
• Rain follows your cursor; the letters you type lead the streams
• Press Enter to send a wave across the whole screen
• Six colour themes: classic green, amber, ice cyan, crimson, violet, rainbow
• Adjust density, speed, glyph size and page dimming — from fully transparent to solid black
• Turn it off for any site (covers its subdomains too)
• Works in embedded editors and fullscreen pages
• Click-through overlay: the page stays readable and fully usable
• Respects your system's reduced-motion setting; uses no CPU while idle
• Password and payment fields never show what you type

HOW TO USE
1. Click the toolbar icon and press ENABLE.
2. Type anywhere on a page.
3. Open the popup again to change the theme or turn it off for a site.

Chrome doesn't allow extensions on internal pages (chrome://, the Web Store),
so the effect won't appear there.

PRIVACY
No data collection, no network requests, no tracking. Your settings are stored
only in your browser.

## Single purpose (required)
Display a decorative falling-code animation over the current web page in
response to the user's typing.

## Permission justifications
- **storage**: saves your display settings (on/off, theme, speed, density,
  per-site list) locally in your browser.
- **Host access (`<all_urls>`, content script)**: the animation is drawn on
  whatever page you're typing on, including embedded frames such as rich text
  editors. The script only listens for key presses to start the animation; it
  does not read page content.

## Remote code
No. All code is packaged in the extension.

## Data usage (privacy practices tab)
- Collected data: **none**. Tick nothing in the data-type list.
- Certify: not sold to third parties; not used for unrelated purposes; not used
  for creditworthiness or lending.

## Assets
| Field | File |
|---|---|
| Store icon (128×128, 96px art) | `assets/store/store_icon_128.png` |
| Screenshots (1280×800) | `assets/store/screenshot_{1,2,3}_1280x800.png` |
| Small promo tile (440×280) | `assets/store/promo_small_440x280.png` |
| Marquee promo tile (1400×560) | `assets/store/promo_marquee_1400x560.png` |
