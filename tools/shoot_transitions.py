"""Frames of each transition from the lab page, in 10x slow motion, plus a contact sheet."""
import sys, pathlib, time
from playwright.sync_api import sync_playwright
from PIL import Image
B = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:3200'
out = pathlib.Path('shots/phase2/transitions'); out.mkdir(parents=True, exist_ok=True)
kinds = ['morph', 'dive', 'liquid', 'shatter']; fracs = [0.15, 0.35, 0.55, 0.8]
dur = {'morph': 620, 'dive': 720, 'liquid': 820, 'shatter': 780}
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/opt/pw-browsers/chromium')
    pg = b.new_page(viewport={'width': 1280, 'height': 900})
    pg.goto(B + '/lab/transitions'); pg.evaluate('document.fonts.ready'); pg.wait_for_timeout(800)
    pg.evaluate('''(() => { const o = Element.prototype.animate; Element.prototype.animate = function (k, t) { const a = o.call(this, k, t); a.playbackRate = 0.05; return a; }; })()''')
    for k in kinds:
        stage = pg.locator('.lab-stage').nth(kinds.index(k))
        stage.scroll_into_view_if_needed(); pg.wait_for_timeout(200)
        pg.get_by_test_id(f'play-{k}').click(); t0 = time.time()
        for f in fracs:
            wait = dur[k] * f * 20 / 1000 - (time.time() - t0)
            if wait > 0: time.sleep(wait)
            stage.screenshot(path=str(out / f'{k}-{int(f*100):02d}.png'))
        time.sleep(dur[k] * 20 / 1000 + 1.5)
    b.close()
w, h = 560, 315
sheet = Image.new('RGB', (w * 4, h * 4))
for r, k in enumerate(kinds):
    for c, f in enumerate(fracs):
        sheet.paste(Image.open(out / f'{k}-{int(f*100):02d}.png').resize((w, h)), (c * w, r * h))
sheet.save(out / 'sheet.png'); print('sheet written')
