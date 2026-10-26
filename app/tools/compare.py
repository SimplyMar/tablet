"""Side-by-side of reference frame and a screenshot, plus a per-region mean abs diff.
Usage: python3 -I tools/compare.py REF.png SHOT.png OUT.png [x0 y0 x1 y1]"""
import sys
from PIL import Image, ImageChops

ref, shot, out = sys.argv[1:4]
box = tuple(int(v) for v in sys.argv[4:8]) if len(sys.argv) >= 8 else None
a = Image.open(ref).convert('RGB'); b = Image.open(shot).convert('RGB').resize(a.size)
if box: a, b = a.crop(box), b.crop(box)
d = ImageChops.difference(a, b).convert('L')
mean = sum(d.getdata()) / (d.width * d.height)
print(f'mean abs diff: {mean:.2f} / 255')
sheet = Image.new('RGB', (a.width * 2 + 8, a.height), 'white')
sheet.paste(a, (0, 0)); sheet.paste(b, (a.width + 8, 0)); sheet.save(out)
