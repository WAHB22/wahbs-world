"""Phase screenshots: laptop and phone, for the pages that exist."""
import pathlib, sys
from playwright.sync_api import sync_playwright
root = pathlib.Path(__file__).resolve().parent.parent
base = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:3200'
out = root / 'shots' / (sys.argv[2] if len(sys.argv) > 2 else 'phase1')
out.mkdir(parents=True, exist_ok=True)
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/opt/pw-browsers/chromium')
    for name, vp, mobile in [('laptop', (1440, 900), False), ('phone', (390, 844), True)]:
        ctx = b.new_context(viewport={'width': vp[0], 'height': vp[1]}, device_scale_factor=2 if mobile else 1, is_mobile=mobile, has_touch=mobile)
        pg = ctx.new_page()
        pg.goto(base + '/today'); pg.get_by_test_id('sync-badge').filter(has_text='Synced').wait_for(timeout=20000)
        pg.get_by_test_id('checkin-gym_done').click(); pg.wait_for_timeout(5600)
        pg.get_by_test_id('checkin-moment').click(); pg.get_by_label('What happened').fill('Coffee with Alex after the shift'); pg.keyboard.press('Enter')
        pg.wait_for_timeout(5600)
        for path, file in [('/', 'landing'), ('/today', 'today'), ('/settings', 'settings')]:
            pg.goto(base + path); pg.evaluate('document.fonts.ready'); pg.wait_for_timeout(1200)
            pg.screenshot(path=str(out / f'{file}-{name}.png'))
        pg.goto(base + '/today'); pg.wait_for_timeout(800); pg.get_by_test_id('checkin-spent').click(); pg.wait_for_timeout(500)
        pg.screenshot(path=str(out / f'today-sheet-{name}.png'))
        ctx.close()
    b.close()
print('shots in', out)
