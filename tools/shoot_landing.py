"""Landing screenshots: laptop (with the 3D glass) and phone (the deck, scrolled once)."""
import sys, pathlib
from playwright.sync_api import sync_playwright
B = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:3200'
out = pathlib.Path('shots/phase2'); out.mkdir(parents=True, exist_ok=True)
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/opt/pw-browsers/chromium', args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    pg = b.new_page(viewport={'width': 1440, 'height': 900}); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)[:200])); pg.on('console', lambda m: m.type == 'error' and errs.append(m.text[:200]))
    pg.goto(B + '/'); pg.evaluate('document.fonts.ready')
    try: pg.wait_for_selector('.stage.gl-on', timeout=20000)
    except Exception: print('3D layer did not start')
    pg.mouse.move(1000, 260); pg.wait_for_timeout(1200)
    pg.screenshot(path=str(out / 'landing-laptop.png'))
    ph = b.new_page(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    ph.on('pageerror', lambda e: errs.append(str(e)[:200]))
    ph.goto(B + '/'); ph.evaluate('document.fonts.ready'); ph.wait_for_timeout(1200)
    print('phone overflow', ph.evaluate('document.documentElement.scrollWidth > innerWidth'))
    ph.screenshot(path=str(out / 'landing-phone.png'))
    ph.get_by_label('Next world').click(); ph.wait_for_timeout(500)
    ph.screenshot(path=str(out / 'landing-phone-scrolled.png'))
    print('errors', errs)
    b.close()
