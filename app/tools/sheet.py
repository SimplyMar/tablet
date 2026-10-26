"""Tile numbered frames NAME_00.png.. into one contact sheet. Usage: python3 -I tools/sheet.py DIR NAME OUT [cols] [scale]"""
import sys, glob
from PIL import Image
d, name, out = sys.argv[1:4]
cols = int(sys.argv[4]) if len(sys.argv) > 4 else 4
scale = float(sys.argv[5]) if len(sys.argv) > 5 else 0.33
fs = sorted(glob.glob(f'{d}/{name}_*.png'))
ims = [Image.open(f).convert('RGB') for f in fs]
w, h = int(ims[0].width * scale), int(ims[0].height * scale)
rows = (len(ims) + cols - 1) // cols
sheet = Image.new('RGB', (cols * w, rows * h), 'white')
for i, im in enumerate(ims): sheet.paste(im.resize((w, h)), ((i % cols) * w, (i // cols) * h))
sheet.save(out)
