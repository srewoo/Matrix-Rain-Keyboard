# Changelog

## 2.0.1 — 2026-11-06
Renamed to **Digital Rain Keyboard**. Rebuilt from the ground up.

### Fixed
- The page no longer turns black when enabled; dimming only appears while rain falls.
- The animation stops when the screen is clear (v1 used CPU on every tab, forever).
- Speed is the same on 60 Hz and 120 Hz displays; glyphs are sharp on high-DPI screens.
- Settings apply to every open tab immediately; the on/off state can't get out of sync.
- Holding a key no longer floods the screen or makes streaks vanish mid-fall.
- Store artwork renders katakana correctly (v1 showed empty boxes).
- Removed unused `scripting` and `activeTab` permissions.

### Added
- Rain follows your cursor; typed characters lead the streams; Enter sends a wave.
- Six themes, plus density, speed, glyph size and page dimming (0% transparent to 100% solid black).
- Per-site off switch, covering subdomains.
- Works when typing inside embedded editors (iframes) and on fullscreen pages.
- Respects `prefers-reduced-motion`.
- Password, one-time-code and card fields never show typed characters.

## 1.0.1
- Initial release as "Matrix Rain Keyboard".
