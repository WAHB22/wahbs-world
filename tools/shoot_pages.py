"""Screenshot a list of pages at laptop and phone size: python3 tools/shoot_pages.py phaseN /a /b ..."""
import sys, pathlib
from playwright.sync_api import sync_playwright
B = 'http://localhost:3200'; out = pathlib.Path('shots') / sys.argv[1]; out.mkdir(parents=True, exist_ok=True)
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/opt/pw-browsers/chromium'); errs = []
    for name, vp, mobile in [('laptop', (1440, 900), False), ('phone', (390, 844), True)]:
        ctx = b.new_context(viewport={'width': vp[0], 'height': vp[1]}, device_scale_factor=2 if mobile else 1, is_mobile=mobile, has_touch=mobile)
        pg = ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)[:200])); pg.on('console', lambda m: m.type == 'error' and errs.append(m.text[:200]))
        for path in sys.argv[2:]:
            pg.goto(B + path); pg.evaluate('document.fonts.ready'); pg.wait_for_timeout(1400)
            slug = path.strip('/').replace('/', '-').split('?')[0] or 'landing'
            pg.screenshot(path=str(out / f'{slug}-{name}.png'), full_page=not mobile)
        ctx.close()
    b.close()
print('errors', errs)
