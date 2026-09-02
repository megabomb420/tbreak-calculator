#!/usr/bin/env python3
"""Generate geometric PWA icons: interval mark on dusk navy. No mascot, no cannabis leaf."""

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
ICONS = PUBLIC / "icons"

BG = (10, 13, 18)  # #0A0D12
CARD = (21, 27, 36)  # #151B24
ACCENT = (215, 196, 168)  # #D7C4A8


def rounded_rect(draw: ImageDraw.ImageDraw, box, radius: int, fill) -> None:
    draw.rounded_rectangle(box, radius=radius, fill=fill)


def draw_mark(draw: ImageDraw.ImageDraw, size: int, inset_ratio: float) -> None:
    """Two vertical bars: a pause/break mark inside a rounded card."""
    pad = int(size * inset_ratio)
    card_radius = max(int(size * 0.18), 8)
    rounded_rect(draw, (pad, pad, size - pad, size - pad), card_radius, CARD)

    bar_w = max(int(size * 0.09), 3)
    bar_h = int(size * 0.34)
    gap = int(size * 0.08)
    cy = size / 2
    cx = size / 2
    bar_radius = max(bar_w // 2, 2)
    left = cx - gap / 2 - bar_w
    right = cx + gap / 2
    top = cy - bar_h / 2
    bottom = cy + bar_h / 2
    rounded_rect(draw, (left, top, left + bar_w, bottom), bar_radius, ACCENT)
    rounded_rect(draw, (right, top, right + bar_w, bottom), bar_radius, ACCENT)


def make(size: int, *, maskable: bool = False) -> Image.Image:
    img = Image.new("RGB", (size, size), BG)
    draw = ImageDraw.Draw(img)
    inset = 0.22 if maskable else 0.12
    draw_mark(draw, size, inset)
    return img


def main() -> None:
    ICONS.mkdir(parents=True, exist_ok=True)
    make(192).save(ICONS / "icon-192.png", optimize=True)
    make(512).save(ICONS / "icon-512.png", optimize=True)
    make(512, maskable=True).save(ICONS / "icon-maskable-512.png", optimize=True)
    make(180).save(PUBLIC / "apple-touch-icon.png", optimize=True)
    make(32).save(PUBLIC / "favicon.png", optimize=True)
    print("wrote icons to", PUBLIC)


if __name__ == "__main__":
    main()
