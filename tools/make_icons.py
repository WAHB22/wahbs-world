"""Render the app icons (a W in the display face on navy glass, with the ember heat lamp)."""
import base64, pathlib
from playwright.sync_api import sync_playwright
root = pathlib.Path(__file__).resolve().parent.parent
font = 'data:font/woff2;base64,' + base64.b64encode((root / 'public/fonts/Anybody-normal-latin.woff2').read_bytes()).decode()
def page(size, pad):
    return f"""<html><head><style>
@font-face{{font-family:A;src:url({font});font-weight:100 900;font-stretch:50% 150%}}
html,body{{margin:0;width:{size}px;height:{size}px;background:#040914}}
.i{{position:absolute;inset:0;display:grid;place-items:center;
background:radial-gradient(circle at 50% 18%,rgba(255,106,19,.55),transparent 42%),radial-gradient(circle at 80% 110%,rgba(31,79,216,.7),transparent 60%),linear-gradient(180deg,#0C1C44,#040914)}}
.w{{font:820 {int(size*(0.62-pad))}px/1 A;font-variation-settings:"wdth" 128;letter-spacing:-.03em;margin-top:{int(size*0.06)}px;
background:linear-gradient(180deg,#DCE8FF 25%,#8DB6FF 65%,#3B7BFF);-webkit-background-clip:text;color:transparent}}
</style></head><body><div class=i><div class=w>W</div></div></body></html>"""
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/opt/pw-browsers/chromium')
    for name, size, pad in [('icon-192', 192, 0), ('icon-512', 512, 0), ('icon-maskable-512', 512, 0.14), ('apple-touch-icon', 180, 0)]:
        pg = b.new_page(viewport={'width': size, 'height': size})
        pg.set_content(page(size, pad)); pg.evaluate('document.fonts.ready'); pg.wait_for_timeout(150)
        pg.screenshot(path=str(root / f'public/icons/{name}.png'))
    b.close()
print('icons written')
