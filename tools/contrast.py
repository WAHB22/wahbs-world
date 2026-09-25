"""WCAG 2.x contrast for every text token on every ground, in light and dark, plus named pairs."""
import json, sys
def hx(h): h = h.lstrip('#'); return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))
def lin(c): c /= 255; return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
def lum(rgb): r, g, b = (lin(v) for v in rgb); return 0.2126*r + 0.7152*g + 0.0722*b
def ratio(a, b): la, lb = sorted((lum(hx(a)), lum(hx(b))), reverse=True); return (la + .05) / (lb + .05)
T = json.load(open(sys.argv[1])); fails = 0
for mode in ('light', 'dark'):
    P = T[mode]
    for t in T['text']:
        for g in T['grounds']:
            r = ratio(P[t], P[g]); ok = r >= 4.5; fails += not ok
            print(f"{mode:5} {t:10} on {g:8} {r:6.2f}  {'ok' if ok else 'FAIL'}")
    for name, (fg, bg, need) in T['pairs'].items():
        r = ratio(P[fg], P[bg]); ok = r >= need; fails += not ok
        print(f"{mode:5} {name:62} {r:6.2f}  {need}  {'ok' if ok else 'FAIL'}")
sys.exit(1 if fails else 0)
