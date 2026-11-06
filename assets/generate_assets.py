#!/usr/bin/env python3
"""Generate icons and promo tiles for Digital Rain Keyboard.

Screenshots are NOT drawn here: `npm run screenshots` captures them from the
real extension in Chromium, so the store shows exactly what users get.

Run:  python3 assets/generate_assets.py   (or: npm run assets)
Writes: icon{16,48,128}.png (repo root) and assets/store/*.png.
Needs: Pillow, macOS Hiragino fonts (for katakana).
"""

import os
import random
import string
import sys

from PIL import Image, ImageChops, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
STORE = os.path.join(HERE, "store")

# Hiragino Sans GB covers latin + katakana. Menlo has no katakana, which is
# what turned v1's store art into rows of empty boxes.
RAIN_FONT = "/System/Library/Fonts/Hiragino Sans GB.ttc"
TITLE_FONT = "/System/Library/Fonts/Menlo.ttc"
GLYPHS = (
    "0123456789"
    + string.ascii_uppercase
    + "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホ:=*+-<>"
)
ICON_GLYPH = "ア"

HEAD = (232, 255, 232)
GREEN = (0, 255, 65)


def font(path, size, index=0):
    return ImageFont.truetype(path, size, index=index)


def assert_covers(f, chars):
    """Fail if the font would draw any char as the missing-glyph box."""
    def mask(ch):
        img = Image.new("L", (64, 64))
        ImageDraw.Draw(img).text((4, 4), ch, font=f, fill=255)
        return img
    missing = mask("￿")  # guaranteed-unassigned code point -> .notdef
    bad = [c for c in chars if not ImageChops.difference(mask(c), missing).getbbox()]
    if bad:
        sys.exit(f"Font {f.path} lacks glyphs: {''.join(bad)}")


def rain(width, height, fsize, density=1.0, seed=7):
    """Black RGBA canvas of falling-code streaks: bright head, fading trail."""
    rnd = random.Random(seed)
    img = Image.new("RGBA", (width, height), (0, 0, 0, 255))
    d = ImageDraw.Draw(img)
    f = font(RAIN_FONT, fsize)
    step = int(fsize * 1.1)
    for c in range(width // step):
        if rnd.random() > density:
            continue
        head = rnd.randint(0, height // step)
        length = rnd.randint(8, height // step + 4)
        for k in range(length):
            row = head - k
            if row < 0:
                break
            if k == 0:
                color = HEAD
            else:
                t = k / length
                color = (0, int(255 - t * 205), int(65 - t * 45))
            d.text((c * step, row * step), rnd.choice(GLYPHS), font=f, fill=color)
    return img


def title(img, lines, sub=None):
    """Centered title with a soft dark band behind it for legibility."""
    W, H = img.size
    band = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    bd = ImageDraw.Draw(band)
    bh = int(H * 0.6)
    for i in range(bh):
        a = int(190 * (1 - abs(i - bh / 2) / (bh / 2)))
        bd.line([(0, H // 2 - bh // 2 + i), (W, H // 2 - bh // 2 + i)], fill=(0, 0, 0, a))
    img.alpha_composite(band)
    d = ImageDraw.Draw(img)
    tf = font(TITLE_FONT, int(H * 0.15), index=1)  # Menlo Bold
    heights = [d.textbbox((0, 0), ln, font=tf)[3] for ln in lines]
    y = H * 0.5 - sum(heights) * 0.65 - (H * 0.05 if sub else 0)
    for ln, h in zip(lines, heights):
        x0, _, x1, _ = d.textbbox((0, 0), ln, font=tf)
        x = (W - (x1 - x0)) / 2
        for off in ((3, 3), (-3, 3), (3, -3), (-3, -3)):
            d.text((x + off[0], y + off[1]), ln, font=tf, fill=(0, 90, 25))
        d.text((x, y), ln, font=tf, fill=GREEN)
        y += h * 1.3
    if sub:
        sf = font(TITLE_FONT, int(H * 0.055))
        x0, _, x1, _ = d.textbbox((0, 0), sub, font=sf)
        d.text(((W - (x1 - x0)) / 2, y + H * 0.02), sub, font=sf, fill=(190, 255, 190))


def icon(size, art=None):
    """Rounded-square rain icon with a bold katakana mark.
    `art` < size leaves transparent padding (Web Store wants 96px art in 128)."""
    art = art or size
    s = art * 4  # supersample, then downscale for clean edges
    img = rain(s, s, max(10, int(s * 0.11)), seed=art)
    d = ImageDraw.Draw(img)
    gf = font(RAIN_FONT, int(s * 0.62), index=1)
    bx = d.textbbox((0, 0), ICON_GLYPH, font=gf)
    x = (s - (bx[2] - bx[0])) / 2 - bx[0]
    y = (s - (bx[3] - bx[1])) / 2 - bx[1]
    for off in ((5, 5), (-5, 5), (5, -5), (-5, -5)):
        d.text((x + off[0], y + off[1]), ICON_GLYPH, font=gf, fill=(0, 110, 30))
    d.text((x, y), ICON_GLYPH, font=gf, fill=HEAD)
    mask = Image.new("L", (s, s), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, s - 1, s - 1], radius=int(s * 0.2), fill=255)
    img.putalpha(mask)
    img = img.resize((art, art), Image.LANCZOS)
    if art == size:
        return img
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(img, ((size - art) // 2, (size - art) // 2), img)
    return out


def main():
    assert_covers(font(RAIN_FONT, 32), GLYPHS + ICON_GLYPH)
    os.makedirs(STORE, exist_ok=True)

    for sz in (16, 48, 128):
        icon(sz).save(os.path.join(ROOT, f"icon{sz}.png"))
    icon(128, art=96).save(os.path.join(STORE, "store_icon_128.png"))

    tile = rain(440, 280, 16, density=0.9, seed=3)
    title(tile, ["DIGITAL", "RAIN"], "type to make it rain")
    tile.convert("RGB").save(os.path.join(STORE, "promo_small_440x280.png"))

    marquee = rain(1400, 560, 20, density=0.95, seed=11)
    title(marquee, ["DIGITAL RAIN"], "falling code that follows your typing")
    marquee.convert("RGB").save(os.path.join(STORE, "promo_marquee_1400x560.png"))

    print("Icons ->", ROOT, "| promo tiles ->", STORE)


if __name__ == "__main__":
    main()
