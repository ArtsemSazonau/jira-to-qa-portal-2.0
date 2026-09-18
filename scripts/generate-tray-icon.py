#!/usr/bin/env python3
"""Generate the macOS menu-bar template icons in src-tauri/icons/.

A template image is pure black with a varying alpha channel; macOS recolours it
for light and dark menu bars, so the app icon cannot be reused here.

tray-icon renders the status item at a fixed 18pt height, so 18px is the 1x size
and 36px the 2x size — a 36px source lands 1:1 on Retina and halves cleanly on
non-Retina displays.

    python3 scripts/generate-tray-icon.py

Stdlib only (no Pillow): the glyph is a rounded-cap polyline rasterised with 8x8
supersampling, then written as an 8-bit RGBA PNG by hand.
"""

import struct
import zlib
from pathlib import Path

# Checkmark in a 0..1 unit box, y pointing down. Deliberately chunky so it stays
# readable at 18pt.
STROKE = [(0.16, 0.54), (0.40, 0.77), (0.84, 0.23)]
HALF_WIDTH = 0.085
SUPERSAMPLE = 8

OUT_DIR = Path(__file__).resolve().parent.parent / "src-tauri" / "icons"
SIZES = {"trayTemplate.png": 18, "trayTemplate@2x.png": 36}


def distance_to_segment(px, py, ax, ay, bx, by):
    dx, dy = bx - ax, by - ay
    length_sq = dx * dx + dy * dy
    t = 0.0 if length_sq == 0 else ((px - ax) * dx + (py - ay) * dy) / length_sq
    t = max(0.0, min(1.0, t))
    cx, cy = ax + t * dx, ay + t * dy
    return ((px - cx) ** 2 + (py - cy) ** 2) ** 0.5


def coverage(px, py):
    """1.0 inside the stroke, 0.0 outside. Round caps and joins come for free
    from taking the minimum distance across all segments."""
    nearest = min(
        distance_to_segment(px, py, *STROKE[i], *STROKE[i + 1])
        for i in range(len(STROKE) - 1)
    )
    return 1.0 if nearest <= HALF_WIDTH else 0.0


def render(size):
    """Return raw RGBA scanlines for a size x size black-on-transparent glyph."""
    rows = []
    step = 1.0 / (size * SUPERSAMPLE)
    for y in range(size):
        row = bytearray()
        for x in range(size):
            hits = 0
            for sy in range(SUPERSAMPLE):
                py = (y * SUPERSAMPLE + sy + 0.5) * step
                for sx in range(SUPERSAMPLE):
                    px = (x * SUPERSAMPLE + sx + 0.5) * step
                    hits += coverage(px, py)
            alpha = round(255 * hits / (SUPERSAMPLE * SUPERSAMPLE))
            row += bytes((0, 0, 0, alpha))
        rows.append(bytes(row))
    return rows


def write_png(path, size, rows):
    raw = b"".join(b"\x00" + row for row in rows)  # filter type 0 per scanline

    def chunk(tag, data):
        body = tag + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body))

    header = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)  # 8-bit RGBA
    path.write_bytes(
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", header)
        + chunk(b"IDAT", zlib.compress(raw, 9))
        + chunk(b"IEND", b"")
    )


def main():
    for name, size in SIZES.items():
        path = OUT_DIR / name
        write_png(path, size, render(size))
        print(f"wrote {path} ({size}x{size}, {path.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
