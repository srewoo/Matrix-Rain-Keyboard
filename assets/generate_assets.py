#!/usr/bin/env python3
"""Generate all Chrome Web Store assets for Matrix Rain Keyboard.

Produces store icon, toolbar icons, promo tiles, and screenshots — all
rendered as the Matrix "digital rain" so the store art matches the product.

Run from this folder:  python3 generate_assets.py
Outputs into ./store/ (promo + screenshots) and ../ (extension icons).
"""

import os
import random
import string

from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
STORE = os.path.join(HERE, "store")
os.makedirs(STORE, exist_ok=True)

MONO = "/System/Library/Fonts/Menlo.ttc"
GLYPHS = (
    "0123456789"
    + string.ascii_uppercase
    + "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホ:=*+-<>"
)

HEAD = (216, 255, 216)   # near-white leading glyph
BRIGHT = (0, 255, 65)    # classic matrix green
DIM = (0, 90, 25)        # faint tail


def font(size):
    return ImageFont.truetype(MONO, size)


def rain(width, height, fsize, density=1.0, seed=7, fade_bg=255):
    """Render a matrix-rain RGBA image."""
    rnd = random.Random(seed)
    img = Image.new("RGBA", (width, height), (0, 0, 0, fade_bg))
    d = ImageDraw.Draw(img)
    f = font(fsize)
    step = int(fsize * 1.05)
    cols = width // step
    for c in range(cols):
        if rnd.random() > density:
            continue
        head_row = rnd.randint(0, height // step)
        length = rnd.randint(6, height // step + 4)
        x = c * step
        for k in range(length):
            row = head_row - k
            if row < 0:
                break
            y = row * step
            g = rnd.choice(GLYPHS)
            if k == 0:
                color = HEAD
            elif k < 4:
                color = BRIGHT
            else:
                t = min(1.0, k / length)
                color = (0, int(255 - t * 200), int(65 - t * 50))
            d.text((x, y), g, font=f, fill=color)
    return img


def vignette_text(img, lines, sub=None):
    """Overlay centered title text with a soft dark backing for legibility."""
    d = ImageDraw.Draw(img, "RGBA")
    W, H = img.size
    # Dark gradient band behind text.
    band = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    bd = ImageDraw.Draw(band)
    bh = int(H * 0.5)
    for i in range(bh):
        a = int(150 * (1 - abs(i - bh / 2) / (bh / 2)))
        bd.line([(0, H // 2 - bh // 2 + i), (W, H // 2 - bh // 2 + i)],
                fill=(0, 0, 0, max(0, a)))
    img.alpha_composite(band)

    title_f = font(int(H * 0.13))
    y = H * 0.30
    for ln in lines:
        bbox = d.textbbox((0, 0), ln, font=title_f)
        tw = bbox[2] - bbox[0]
        x = (W - tw) / 2
        # glow
        for off in ((2, 2), (-2, 2), (2, -2), (-2, -2)):
            d.text((x + off[0], y + off[1]), ln, font=title_f, fill=(0, 90, 25, 255))
        d.text((x, y), ln, font=title_f, fill=(0, 255, 65, 255))
        y += (bbox[3] - bbox[1]) * 1.4
    if sub:
        sf = font(int(H * 0.05))
        bbox = d.textbbox((0, 0), sub, font=sf)
        tw = bbox[2] - bbox[0]
        d.text(((W - tw) / 2, y + H * 0.02), sub, font=sf, fill=(180, 255, 180, 255))


def rounded_icon(size):
    """Square app icon with rounded corners and centered glyph."""
    scale = 4
    s = size * scale
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    mask = Image.new("L", (s, s), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, s, s], radius=int(s * 0.18), fill=255)
    bg = rain(s, s, max(8, int(s * 0.11)), density=1.0, seed=size, fade_bg=255)
    img.paste(bg, (0, 0))
    # Big centered "M"-like glyph for small-size recognizability.
    d = ImageDraw.Draw(img)
    gf = font(int(s * 0.6))
    ch = "M"  # Menlo lacks katakana glyphs — keep a crisp, always-rendering letter
    bbox = d.textbbox((0, 0), ch, font=gf)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x = (s - tw) / 2 - bbox[0]
    y = (s - th) / 2 - bbox[1]
    for off in ((3, 3), (-3, 3), (3, -3), (-3, -3)):
        d.text((x + off[0], y + off[1]), ch, font=gf, fill=(0, 120, 35, 255))
    d.text((x, y), ch, font=gf, fill=(216, 255, 216, 255))
    img.putalpha(Image.composite(img.getchannel("A"), Image.new("L", (s, s), 0), mask))
    return img.resize((size, size), Image.LANCZOS)


def main():
    # --- Extension + store icons ---
    for sz in (16, 48, 128):
        rounded_icon(sz).save(os.path.join(ROOT, f"icon{sz}.png"))
    # Keep manifest's generic icon.png as the 128 too.
    rounded_icon(128).save(os.path.join(ROOT, "icon.png"))
    rounded_icon(128).save(os.path.join(STORE, "store_icon_128.png"))

    # --- Small promo tile 440x280 ---
    tile = rain(440, 280, 16, density=0.9, seed=3).convert("RGBA")
    vignette_text(tile, ["MATRIX", "RAIN"], "type to make it rain")
    tile.convert("RGB").save(os.path.join(STORE, "promo_small_440x280.png"))

    # --- Marquee promo tile 1400x560 ---
    marq = rain(1400, 560, 20, density=0.95, seed=11).convert("RGBA")
    vignette_text(marq, ["MATRIX RAIN KEYBOARD"], "every keystroke feeds the green rain")
    marq.convert("RGB").save(os.path.join(STORE, "promo_marquee_1400x560.png"))

    # --- Screenshots 1280x800 ---
    shot1 = rain(1280, 800, 20, density=1.0, seed=21).convert("RGBA")
    vignette_text(shot1, ["WAKE UP..."], "your screen is the Matrix now")
    shot1.convert("RGB").save(os.path.join(STORE, "screenshot_1_1280x800.png"))

    shot2 = rain(1280, 800, 18, density=0.85, seed=42).convert("RGBA")
    vignette_text(shot2, ["ONE CLICK", "TO ENABLE"], "toggle from the toolbar popup")
    shot2.convert("RGB").save(os.path.join(STORE, "screenshot_2_1280x800.png"))

    print("Assets written to:", STORE, "and extension icons to:", ROOT)


if __name__ == "__main__":
    main()
