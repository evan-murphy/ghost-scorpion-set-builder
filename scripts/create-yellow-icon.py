#!/usr/bin/env python3
"""Create yellow-tinted PWA icons from existing white icons."""
from PIL import Image
import os

YELLOW = (243, 199, 12)  # #F3C70C
ASSETS = os.path.join(os.path.dirname(__file__), '..', 'assets')

def tint_white_to_yellow(img):
    """Replace white/light pixels with yellow, preserve transparency."""
    img = img.convert('RGBA')
    data = img.getdata()
    new_data = []
    for item in data:
        r, g, b, a = item
        # If pixel is light (white/gray), tint toward yellow
        brightness = (r + g + b) / 3
        if brightness > 80 and a > 50:
            # Blend toward yellow based on brightness
            blend = min(1.0, (brightness - 80) / 150)
            nr = int(r * (1 - blend) + YELLOW[0] * blend)
            ng = int(g * (1 - blend) + YELLOW[1] * blend)
            nb = int(b * (1 - blend) + YELLOW[2] * blend)
            new_data.append((nr, ng, nb, a))
        else:
            new_data.append(item)
    img.putdata(new_data)
    return img

def main():
    for size in (192, 512):
        src = os.path.join(ASSETS, f'icon-{size}.png')
        dst = os.path.join(ASSETS, f'icon-{size}-yellow.png')
        if not os.path.exists(src):
            print(f'Skip: {src} not found')
            continue
        img = Image.open(src)
        out = tint_white_to_yellow(img)
        out.save(dst)
        print(f'Created {dst}')

if __name__ == '__main__':
    main()
