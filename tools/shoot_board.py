"""Screenshot design/token-board.html at laptop and phone widths."""
import pathlib, sys
from playwright.sync_api import sync_playwright
root = pathlib.Path(__file__).resolve().parent.parent
url = (root / 'design/token-board.html').as_uri()
errors = []
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/opt/pw-browsers/chromium' if pathlib.Path('/opt/pw-browsers/chromium').is_file() else None)
    for name, vp, scale in [('desktop-1440', (1440, 900), 1), ('phone-390', (390, 844), 2)]:
        pg = b.new_page(viewport={'width': vp[0], 'height': vp[1]}, device_scale_factor=scale)
        pg.on('console', lambda m: m.type == 'error' and errors.append(m.text))
        pg.on('pageerror', lambda e: errors.append(str(e)))
        pg.goto(url); pg.evaluate('document.fonts.ready'); pg.wait_for_timeout(300)
        fonts = pg.evaluate("[...document.fonts].filter(f=>f.status==='loaded').map(f=>f.family)")
        overflow = pg.evaluate('document.documentElement.scrollWidth > innerWidth')
        pg.screenshot(path=str(root / f'design/shots/board-{name}.png'), full_page=True)
        pg.screenshot(path=str(root / f'design/shots/board-{name}-fold.png'))
        print(name, 'fonts', sorted(set(fonts)), 'horizontal overflow', overflow)
    b.close()
print('errors', errors); sys.exit(1 if errors else 0)
