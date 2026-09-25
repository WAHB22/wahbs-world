"""WCAG 2.x contrast for the WAHB'S WORLD token plan.
Glass backings are checked in the worst case: the backing composited over the
brightest thing the room may put behind glass (tokens "behind", white if unset), and over its darkest."""
import itertools, json, sys

def hx(h):
    h = h.lstrip('#'); return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))
def lin(c):
    c /= 255; return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
def lum(rgb):
    r, g, b = (lin(v) for v in rgb); return 0.2126*r + 0.7152*g + 0.0722*b
def ratio(a, b):
    la, lb = sorted((lum(a), lum(b)), reverse=True); return (la + .05) / (lb + .05)
def over(fg, a, bg):
    return tuple(round(fg[i]*a + bg[i]*(1-a)) for i in range(3))
def tohex(rgb): return '#%02X%02X%02X' % rgb

T = json.load(open(sys.argv[1]))
c = {k: hx(v) for k, v in T['color'].items()}
WHITE, BLACK = (255, 255, 255), (0, 0, 0)
BEHIND = hx(T['behind']) if 'behind' in T else WHITE
rows = []
for name, spec in T['backings'].items():
    base = c[spec['color']]; a = spec['alpha']
    worst = over(base, a, BEHIND) if spec['theme'] == 'dark' else over(base, a, BLACK)
    best = over(base, a, c['abyss']) if spec['theme'] == 'dark' else over(base, a, WHITE)
    for t in spec['text']:
        rows.append((name, t, tohex(worst), ratio(c[t], worst), ratio(c[t], best), spec.get('min', 4.5)))
fails = 0
print(f"{'backing':16} {'text':12} {'worst bg':9} {'worst':>6} {'best':>6}  need")
for n, t, w, r1, r2, need in rows:
    ok = r1 >= need; fails += not ok
    print(f"{n:16} {t:12} {w:9} {r1:6.2f} {r2:6.2f}  {need}  {'ok' if ok else 'FAIL'}")
print()
for n, (fg, bg, need) in T['pairs'].items():
    r = ratio(c[fg], c[bg]); ok = r >= need; fails += not ok
    print(f"{n:34} {fg:>10} on {bg:<10} {r:6.2f}  {need}  {'ok' if ok else 'FAIL'}")
sys.exit(1 if fails else 0)
