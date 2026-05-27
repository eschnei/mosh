#!/usr/bin/env python3
"""
Generate the Mosh app icon at 1024x1024.

Design: macOS-style rounded square (squircle) in deep charcoal #1a1a1c with a
bold white "M" centered. Includes a soft inner highlight gradient for a
premium, polished feel at all sizes (down to 16x16).

Output: build/icon.png (1024x1024 PNG with alpha).
"""

from PIL import Image, ImageDraw, ImageFont, ImageFilter
from pathlib import Path
import sys

SIZE = 1024
CORNER_RADIUS = 230  # ~22.5% — matches macOS Big Sur+ app icon mask
BG_COLOR = (26, 26, 28, 255)         # #1a1a1c
HIGHLIGHT_COLOR = (255, 255, 255, 22)  # subtle top sheen
FG_COLOR = (255, 255, 255, 255)

OUT_PATH = Path(__file__).resolve().parent.parent / "build" / "icon.png"


def find_bold_font(target_size: int) -> ImageFont.FreeTypeFont:
    """Locate a system font that renders a confident, geometric 'M'."""
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial Black.ttf",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/System/Library/Fonts/Supplemental/Impact.ttf",
        "/System/Library/Fonts/HelveticaNeue.ttc",
        "/System/Library/Fonts/Helvetica.ttc",
    ]
    for path in candidates:
        if Path(path).exists():
            try:
                return ImageFont.truetype(path, target_size)
            except (OSError, IOError):
                continue
    return ImageFont.load_default()


def build_squircle_mask(size: int, radius: int) -> Image.Image:
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        [(0, 0), (size - 1, size - 1)],
        radius=radius,
        fill=255,
    )
    return mask


def main() -> int:
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)

    # 1. Squircle background filled with the brand charcoal.
    canvas = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    bg_draw = ImageDraw.Draw(canvas)
    bg_draw.rounded_rectangle(
        [(0, 0), (SIZE - 1, SIZE - 1)],
        radius=CORNER_RADIUS,
        fill=BG_COLOR,
    )

    # 2. Soft top sheen — composite ADDITIVELY over the background, then clip
    #    to the squircle so corners stay crisp.
    sheen = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    sheen_draw = ImageDraw.Draw(sheen)
    sheen_draw.ellipse(
        [(-int(SIZE * 0.15), -int(SIZE * 0.6)),
         (int(SIZE * 1.15), int(SIZE * 0.5))],
        fill=HIGHLIGHT_COLOR,
    )
    sheen = sheen.filter(ImageFilter.GaussianBlur(radius=60))
    canvas = Image.alpha_composite(canvas, sheen)

    # 3. The letter M — bold, centered, optically balanced.
    font_size = 780
    font = find_bold_font(font_size)
    text = "M"

    measure_draw = ImageDraw.Draw(canvas)
    while True:
        bbox = measure_draw.textbbox((0, 0), text, font=font)
        text_w = bbox[2] - bbox[0]
        text_h = bbox[3] - bbox[1]
        if text_w <= int(SIZE * 0.74) and text_h <= int(SIZE * 0.74):
            break
        font_size -= 20
        if font_size <= 200:
            break
        font = find_bold_font(font_size)

    bbox = measure_draw.textbbox((0, 0), text, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    x = (SIZE - text_w) // 2 - bbox[0]
    # Optical nudge upward so the M sits in the visual center.
    y = (SIZE - text_h) // 2 - bbox[1] - int(SIZE * 0.02)

    text_draw = ImageDraw.Draw(canvas)
    text_draw.text((x, y), text, font=font, fill=FG_COLOR)

    # 4. Final clip to the squircle mask in case any sheen blur bled outside.
    final = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    final.paste(canvas, (0, 0), build_squircle_mask(SIZE, CORNER_RADIUS))

    final.save(OUT_PATH, "PNG", optimize=True)
    print(f"Wrote {OUT_PATH} ({final.size[0]}x{final.size[1]})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
