#!/usr/bin/env python3
"""Make the generated deck safe for PowerPoint.

pptxgenjs leaves a few things PowerPoint handles badly: duplicate shape ids on a slide,
content type overrides for parts that do not exist, and JPEG posters stored as .png.
This script fixes those, adds the autoplay timing for the two films (targeting the
film shape's own, now unique, id), and rewrites the package the way PowerPoint does:
[Content_Types].xml first, XML compressed, media stored, no folder entries.

Usage: python3 sanitize.py deck.pptx [--no-autoplay]
"""
import io
import re
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path

path = Path(sys.argv[1])
autoplay = "--no-autoplay" not in sys.argv

src = zipfile.ZipFile(path)
parts = {i.filename: src.read(i.filename) for i in src.infolist() if not i.filename.endswith("/")}
src.close()
log = []

# 1. Content types: drop overrides for missing parts; use the standard JPEG type.
ct = parts["[Content_Types].xml"].decode("utf-8")
def keep_override(m):
    name = m.group(1).lstrip("/")
    if name in parts:
        return m.group(0)
    log.append(f"removed override for missing {name}")
    return ""
ct = re.sub(r'<Override PartName="([^"]+)"[^>]*/>', keep_override, ct)
ct = ct.replace('ContentType="image/jpg"', 'ContentType="image/jpeg"')
parts["[Content_Types].xml"] = ct.encode("utf-8")

# 2. Media: any .png part that is not a PNG is converted to a real PNG.
for name, data in list(parts.items()):
    if name.startswith("ppt/media/") and name.lower().endswith(".png") and not data.startswith(b"\x89PNG"):
        with tempfile.TemporaryDirectory() as d:
            src_f, out_f = Path(d, "in.bin"), Path(d, "out.png")
            src_f.write_bytes(data)
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(src_f), str(out_f)], check=True)
            parts[name] = out_f.read_bytes()
        log.append(f"converted {name} to a real PNG")

# 3. Unique shape ids on every slide, layout and master.
def renumber(xml):
    counter = {"n": 0}
    def sub(m):
        counter["n"] += 1
        return f'<p:cNvPr id="{counter["n"]}"'
    return re.sub(r'<p:cNvPr id="\d+"', sub, xml)

slide_re = re.compile(r"ppt/(slides|slideLayouts|slideMasters)/[^/]+\.xml$")
for name in list(parts):
    if slide_re.match(name):
        xml = parts[name].decode("utf-8")
        before = re.findall(r'<p:cNvPr id="(\d+)"', xml)
        if len(before) != len(set(before)):
            log.append(f"renumbered shape ids in {name}")
        xml = renumber(xml)
        # drop any earlier timing: it would point at old ids
        xml = re.sub(r"<p:timing>.*?</p:timing>", "", xml, flags=re.S)
        parts[name] = xml.encode("utf-8")

# 4. Autoplay timing for the films, as PowerPoint writes it for "Start: Automatically".
def duration_ms(media_bytes):
    with tempfile.NamedTemporaryFile(suffix=".mp4") as f:
        f.write(media_bytes)
        f.flush()
        out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f.name],
                             capture_output=True, text=True, check=True).stdout.strip()
    return int(round(float(out) * 1000))

def timing(spid, ms):
    return (
        '<p:timing><p:tnLst><p:par><p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst>'
        '<p:seq concurrent="1" nextAc="seek"><p:cTn id="2" dur="indefinite" nodeType="mainSeq"><p:childTnLst>'
        '<p:par><p:cTn id="3" fill="hold"><p:stCondLst><p:cond delay="indefinite"/><p:cond evt="onBegin" delay="0"><p:tn val="2"/></p:cond></p:stCondLst><p:childTnLst>'
        '<p:par><p:cTn id="4" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>'
        '<p:par><p:cTn id="5" presetID="1" presetClass="mediacall" presetSubtype="0" fill="hold" nodeType="afterEffect"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>'
        f'<p:cmd type="call" cmd="playFrom(0.0)"><p:cBhvr><p:cTn id="6" dur="{ms}" fill="hold"/><p:tgtEl><p:spTgt spid="{spid}"/></p:tgtEl></p:cBhvr></p:cmd>'
        '</p:childTnLst></p:cTn></p:par></p:childTnLst></p:cTn></p:par></p:childTnLst></p:cTn></p:par>'
        '</p:childTnLst></p:cTn><p:prevCondLst><p:cond evt="onPrev" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:prevCondLst>'
        '<p:nextCondLst><p:cond evt="onNext" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:nextCondLst></p:seq>'
        f'<p:video><p:cMediaNode vol="80000"><p:cTn id="7" fill="hold" display="0"><p:stCondLst><p:cond delay="indefinite"/></p:stCondLst></p:cTn>'
        f'<p:tgtEl><p:spTgt spid="{spid}"/></p:tgtEl></p:cMediaNode></p:video>'
        '</p:childTnLst></p:cTn></p:par></p:tnLst></p:timing>'
    )

if autoplay:
    for name in sorted(parts):
        if not re.match(r"ppt/slides/slide\d+\.xml$", name):
            continue
        xml = parts[name].decode("utf-8")
        m = re.search(r'<p:cNvPr id="(\d+)" name="[^"]*film, no sound"', xml)
        if not m:
            continue
        rels = parts[name.replace("slides/", "slides/_rels/") + ".rels"].decode("utf-8")
        video_id = re.search(r'<a:videoFile r:link="([^"]+)"', xml).group(1)
        target = re.search(rf'Id="{video_id}"[^>]*Target="\.\./media/([^"]+)"', rels) or re.search(rf'Target="\.\./media/([^"]+)"[^>]*Id="{video_id}"', rels)
        ms = duration_ms(parts["ppt/media/" + target.group(1)])
        xml = xml.replace("</p:clrMapOvr></p:sld>", f"</p:clrMapOvr>{timing(m.group(1), ms)}</p:sld>")
        parts[name] = xml.encode("utf-8")
        log.append(f"autoplay on {name}: shape {m.group(1)}, {ms} ms")

# 5. Write the package the conventional way.
order = ["[Content_Types].xml", "_rels/.rels"] + sorted(n for n in parts if n not in ("[Content_Types].xml", "_rels/.rels"))
buf = io.BytesIO()
with zipfile.ZipFile(buf, "w") as out:
    for name in order:
        stored = name.startswith("ppt/media/") and name.rsplit(".", 1)[-1].lower() in ("mp4", "m4v", "png", "jpg", "jpeg")
        info = zipfile.ZipInfo(name, date_time=(2026, 11, 27, 12, 0, 0))
        info.compress_type = zipfile.ZIP_STORED if stored else zipfile.ZIP_DEFLATED
        out.writestr(info, parts[name])
path.write_bytes(buf.getvalue())
print("\n".join(log))
print(f"wrote {path} ({len(order)} parts)")
