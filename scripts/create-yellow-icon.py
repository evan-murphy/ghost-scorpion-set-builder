#!/usr/bin/env python3
"""Create PWA icons with yellow background and scorpion."""
from PIL import Image
import os

YELLOW = (243, 199, 12)  # #F3C70C
ASSETS = os.path.join(os.path.dirname(__file__), '..', 'assets')


def create_yellow_background_icon(img):
    """Composite scorpion icon onto solid yellow background."""
    img = img.convert('RGBA')
    w, h = img.size
    # Create solid yellow background
    bg = Image.new('RGBA', (w, h), (*YELLOW, 255))
    # Composite: scorpion (opaque pixels) on top of yellow
    # Transparent areas in icon -> show yellow; opaque areas -> show scorpion
    bg.paste(img, (0, 0), img)
    return bg


def main():
    for size in (192, 512):
        src = os.path.join(ASSETS, f'icon-{size}.png')
        dst = os.path.join(ASSETS, f'icon-{size}-yellow.png')
        if not os.path.exists(src):
            print(f'Skip: {src} not found')
            continue
        img = Image.open(src)
        out = create_yellow_background_icon(img)
        out.save(dst)
        print(f'Created {dst}')

if __name__ == '__main__':
    main()
