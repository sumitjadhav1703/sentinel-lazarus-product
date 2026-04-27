#!/usr/bin/env python3
from pathlib import Path
import shutil
import subprocess

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "assets" / "build"
ICONSET = ASSET_DIR / "icon.iconset"
ICONSET_BASE_SIZES = [16, 32, 128, 256, 512]


def rounded_rectangle_mask(size, radius):
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=255)
    return mask


def make_icon(size):
    icon = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    mask = rounded_rectangle_mask(size, int(size * 0.22))
    bg = Image.new("RGBA", (size, size), "#181511")
    icon.paste(bg, (0, 0), mask)

    draw = ImageDraw.Draw(icon)
    pad = int(size * 0.18)
    shield = [
        (size // 2, pad),
        (size - pad, int(size * 0.29)),
        (size - pad, int(size * 0.49)),
        (size // 2, size - pad),
        (pad, int(size * 0.49)),
        (pad, int(size * 0.29)),
    ]
    draw.line(shield + [shield[0]], fill="#d97757", width=max(2, size // 24), joint="curve")

    font_size = int(size * 0.42)
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Georgia.ttf", font_size)
    except OSError:
        font = ImageFont.load_default()
    text = "L"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text(((size - tw) / 2, (size - th) / 2 - size * 0.04), text, fill="#f4eee8", font=font)
    draw.rounded_rectangle(
        (int(size * 0.32), int(size * 0.76), int(size * 0.68), int(size * 0.80)),
        radius=max(1, size // 80),
        fill="#9db38e",
    )
    return icon


def save_icons():
    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    if ICONSET.exists():
        shutil.rmtree(ICONSET)
    ICONSET.mkdir(parents=True, exist_ok=True)
    base = make_icon(1024)
    base.save(ASSET_DIR / "icon.png")
    base.save(ASSET_DIR / "icon.ico", sizes=[(16, 16), (32, 32), (48, 48), (256, 256)])

    for size in ICONSET_BASE_SIZES:
        image = base.resize((size, size), Image.Resampling.LANCZOS)
        image.convert("RGB").save(ICONSET / f"icon_{size}x{size}.png")
        retina = base.resize((size * 2, size * 2), Image.Resampling.LANCZOS)
        retina.convert("RGB").save(ICONSET / f"icon_{size}x{size}@2x.png")

    (ASSET_DIR / "icon.icns").unlink(missing_ok=True)
    subprocess.run(
        ["iconutil", "--convert", "icns", "--output", str(ASSET_DIR / "icon.icns"), str(ICONSET)],
        check=True,
    )


if __name__ == "__main__":
    save_icons()
    print(f"Generated icons in {ASSET_DIR}")
