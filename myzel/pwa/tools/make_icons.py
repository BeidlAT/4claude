"""Draws the Myzel app icon (glowing mycelium on loam) and writes all PWA icon sizes.
Run: python3 myzel/pwa/tools/make_icons.py   (needs Pillow; output is committed, so this is only for redesigns)"""
import math, random, os
from PIL import Image, ImageDraw, ImageFilter, ImageChops

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'icons')
S = 2048                                  # master size, drawn large and scaled down for anti-aliasing
LOAM = (17, 13, 11)
SPORE = (255, 179, 92)
LUMEN = (134, 240, 208)

def mycelium(scale):
    """scale < 1 keeps the artwork inside the maskable safe zone"""
    rnd = random.Random(7)
    lines = Image.new('RGB', (S, S), (0, 0, 0))
    d = ImageDraw.Draw(lines)
    cx, cy = S / 2, S * (0.5 + 0.06 * scale)
    tips = []
    def grow(x, y, a, w, life, col, depth):
        for _ in range(int(life)):
            step = S * 0.012 * scale
            nx, ny = x + math.cos(a) * step, y + math.sin(a) * step
            d.line([(x, y), (nx, ny)], fill=col, width=max(2, int(w)))
            x, y = nx, ny
            a += rnd.uniform(-0.28, 0.28)
            w *= 0.985
            if depth < 4 and rnd.random() < 0.06:
                grow(x, y, a + rnd.choice([-0.75, 0.75]), w * 0.7, life * 0.55, col, depth + 1)
        tips.append((x, y))
    for k in range(9):
        a = -math.pi / 2 + (k - 4) * 0.36 + rnd.uniform(-0.08, 0.08)
        col = SPORE if k % 3 else LUMEN
        grow(cx, cy, a, S * 0.012 * scale, 26 + rnd.randint(0, 10), col, 0)
    for k in range(4):   # a few roots downwards
        grow(cx, cy, math.pi / 2 + (k - 1.5) * 0.5, S * 0.008 * scale, 10, SPORE, 2)
    return lines, (cx, cy), tips

def render(scale, rounded):
    base = Image.new('RGB', (S, S), LOAM)
    # soft warm ground glow
    glow = Image.new('RGB', (S, S), (0, 0, 0))
    ImageDraw.Draw(glow).ellipse([S * 0.2, S * 0.35, S * 0.8, S * 0.95], fill=(70, 40, 18))
    base = ImageChops.add(base, glow.filter(ImageFilter.GaussianBlur(S * 0.12)))
    lines, (cx, cy), tips = mycelium(scale)
    halo = lines.filter(ImageFilter.GaussianBlur(S * 0.012))
    base = ImageChops.add(base, halo)
    base = ImageChops.add(base, halo)
    base = ImageChops.screen(base, lines)
    d = ImageDraw.Draw(base)
    for (x, y) in tips:       # spores at the tips
        r = S * 0.006 * scale
        d.ellipse([x - r, y - r, x + r, y + r], fill=(255, 236, 200))
    core = Image.new('RGB', (S, S), (0, 0, 0))
    r = S * 0.05 * scale
    ImageDraw.Draw(core).ellipse([cx - r, cy - r, cx + r, cy + r], fill=SPORE)
    base = ImageChops.add(base, core.filter(ImageFilter.GaussianBlur(S * 0.03)))
    ImageDraw.Draw(base).ellipse([cx - r * 0.45, cy - r * 0.45, cx + r * 0.45, cy + r * 0.45], fill=(255, 240, 215))
    img = base.convert('RGBA')
    if rounded:   # plain "any" icon: rounded square, transparent corners
        mask = Image.new('L', (S, S), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, S - 1, S - 1], radius=int(S * 0.22), fill=255)
        img.putalpha(mask)
    return img

os.makedirs(OUT, exist_ok=True)
anyicon = render(0.8, True)
mask = render(0.64, False)                # maskable: full bleed, artwork inside the 80 % safe circle
apple = render(0.78, False).convert('RGB')  # iOS adds its own rounding and needs an opaque image
for size in (192, 512):
    anyicon.resize((size, size), Image.LANCZOS).save(os.path.join(OUT, f'icon-{size}.png'), optimize=True)
mask.resize((512, 512), Image.LANCZOS).save(os.path.join(OUT, 'icon-maskable-512.png'), optimize=True)
apple.resize((180, 180), Image.LANCZOS).save(os.path.join(OUT, 'apple-touch-icon.png'), optimize=True)
anyicon.resize((32, 32), Image.LANCZOS).save(os.path.join(OUT, 'favicon-32.png'), optimize=True)
print('icons written to', os.path.normpath(OUT))
