"""Contact sheet of rendered check frames: python3 tools/anim/sheet.py out.png pattern ...
Run from tools/anim/.work after `node tools/anim/build.mjs <patterns> --frames`."""
import glob
import re
import sys

from PIL import Image, ImageDraw

W = H = 360
S = 0.5
rows = []
for name in sys.argv[2:]:
    files = sorted(glob.glob(f"{name}-*.png"), key=lambda f: int(re.search(r"-(\d+)\.png$", f).group(1)))
    rows.append((name, files))
sheet = Image.new("RGB", (int(W * S * 3) + 10, int((H * S + 16) * len(rows))), (16, 16, 18))
draw = ImageDraw.Draw(sheet)
for r, (name, files) in enumerate(rows):
    y = int(r * (H * S + 16))
    draw.text((4, y + 2), name, fill=(230, 230, 230))
    for c, f in enumerate(files[:3]):
        im = Image.open(f).convert("RGB").resize((int(W * S), int(H * S)))
        sheet.paste(im, (int(c * W * S) + 5, y + 14))
sheet.save(sys.argv[1])
