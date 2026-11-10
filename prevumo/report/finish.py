"""Opens the draft in LibreOffice, updates the table of contents, then saves the final .docx and a PDF.
Usage (from prevumo/report): python3 finish.py"""
import os, subprocess, sys, tempfile, time
from pathlib import Path
sys.path.insert(0, "/root/.claude/skills/synced/2410064c-d687-469c-b301-0adc31934a47_d46269b3-d2ee-4650-b908-2a25f1b50aa6/docx/scripts")
from office.soffice import get_soffice_env
import uno
from com.sun.star.beans import PropertyValue

here = Path(__file__).resolve().parent
src, out_docx, out_pdf = here / "build/draft.docx", here / "PREVUMO_PD_B3_Group10.docx", here / "PREVUMO_PD_B3_Group10.pdf"
profile = tempfile.mkdtemp(prefix="lo_profile_")
proc = subprocess.Popen(["soffice", f"-env:UserInstallation={Path(profile).as_uri()}", "--headless", "--invisible", "--nologo", "--norestore",
                         "--accept=socket,host=127.0.0.1,port=2765;urp;"], env=get_soffice_env(), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
def pv(n, v): p = PropertyValue(); p.Name = n; p.Value = v; return p
ctx = None
local = uno.getComponentContext()
resolver = local.ServiceManager.createInstanceWithContext("com.sun.star.bridge.UnoUrlResolver", local)
for _ in range(60):
    try: ctx = resolver.resolve("uno:socket,host=127.0.0.1,port=2765;urp;StarOffice.ComponentContext"); break
    except Exception: time.sleep(1)
desktop = ctx.ServiceManager.createInstanceWithContext("com.sun.star.frame.Desktop", ctx)
doc = desktop.loadComponentFromURL(uno.systemPathToFileUrl(str(src)), "_blank", 0, (pv("Hidden", True),))
for _ in range(2):  # twice: the first update can move page numbers
    idx = doc.getDocumentIndexes()
    for i in range(idx.getCount()): idx.getByIndex(i).update()
    doc.refresh()
doc.storeToURL(uno.systemPathToFileUrl(str(out_docx)), (pv("FilterName", "MS Word 2007 XML"),))
pages = doc.getCurrentController().getPropertyValue("PageCount")
doc.close(True)
try: desktop.terminate()
except Exception: pass
proc.wait(timeout=30)
print("wrote", out_docx.name, out_pdf.name, "pages:", pages)

# Times New Roman everywhere: LibreOffice adds its own default fonts to unused styles and the theme
import re, shutil, zipfile
tmp = out_docx.with_suffix(".tmp.docx")
with zipfile.ZipFile(out_docx) as zin, zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as zout:
    for item in zin.infolist():
        if item.filename.endswith("/"): continue
        data = zin.read(item.filename)
        if item.filename in ("word/styles.xml", "word/fontTable.xml", "word/theme/theme1.xml"):
            t = data.decode("utf-8")
            t = t.replace("Liberation Sans", "Times New Roman").replace("Liberation Serif", "Times New Roman").replace('typeface="Arial"', 'typeface="Times New Roman"').replace('typeface="DejaVu Sans"', 'typeface="Times New Roman"')
            data = t.encode("utf-8")
        zout.writestr(item.filename, data)
shutil.move(tmp, out_docx)
# the PDF is made from the final .docx itself
from office.soffice import run_soffice
outdir = here / "build" / "conv"; outdir.mkdir(parents=True, exist_ok=True)
run_soffice(["--headless", "--convert-to", "pdf", "--outdir", str(outdir), str(out_docx)], capture_output=True, timeout=240)
shutil.copy(outdir / out_pdf.name, out_pdf)
print("final pdf from final docx")
