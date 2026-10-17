# contact sheets of shots/gu: one per viewport and kind (view, field, card) → shots/gu/_sheet-<vp>-<kind>.png
import sys, os, glob
from PIL import Image, ImageDraw
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'shots', 'gu')
ORDER = ['start', 'hilfe', 'off', 'ask', 'live', 'anl', 'lad', 'schlaf', 'fae', 'regen', 'mess', 'funk', 'nogyro', 'denied', 'nosensor', 'viewer']
vps = sys.argv[1].split(',') if len(sys.argv) > 1 else ['p390', 'p360', 'land', 'ipadL', 'ipadP', 'desk', 'iph']
kind = sys.argv[2] if len(sys.argv) > 2 else 'view'
H = int(sys.argv[3]) if len(sys.argv) > 3 else 700
for vp in vps:
    ims = []
    for st in ORDER:
        f = os.path.join(D, vp + '-' + st + ('' if kind == 'view' else '-' + kind) + '.png')
        if os.path.exists(f): ims.append((st, Image.open(f).convert('RGB')))
    if not ims: continue
    sc = [H / im.size[1] for _, im in ims]
    th = [im.resize((max(1, int(im.size[0] * s)), H)) for (_, im), s in zip(ims, sc)]
    cols = min(len(th), max(1, 2400 // (th[0].size[0] + 10)))
    rows = (len(th) + cols - 1) // cols
    cw = max(t.size[0] for t in th) + 10
    out = Image.new('RGB', (cols * cw, rows * (H + 24)), (40, 40, 40))
    d = ImageDraw.Draw(out)
    for i, (t, (st, _)) in enumerate(zip(th, ims)):
        x, y = (i % cols) * cw, (i // cols) * (H + 24)
        out.paste(t, (x, y + 22)); d.text((x + 4, y + 4), st, fill=(255, 220, 120))
    out.save(os.path.join(D, '_sheet-' + vp + '-' + kind + '.png'))
    print(vp, kind, out.size)
