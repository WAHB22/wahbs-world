"""No dash check (non negotiable 2).

Fails on an em dash, an en dash, a figure dash, a horizontal bar, or a spaced
hyphen (" - ") in visible text. Hyphens inside words and anything inside code
are fine. Markdown: fenced blocks, inline code and list markers are skipped.
HTML: only text nodes outside code, pre, script and style are checked, plus
alt, title, aria-label and placeholder attributes.
Usage: python3 tools/nodash.py <files or folders>
"""
import re, sys, pathlib
from html.parser import HTMLParser

BAD = re.compile(r'[‒–—―]|(?<=\S) - (?=\S)|(?<=\S) -$|^- (?=\S)')
SKIP_TAGS = {'code', 'pre', 'script', 'style', 'template'}
ATTRS = {'alt', 'title', 'aria-label', 'placeholder'}

def check_md(text):
    out, fenced = [], False
    for n, line in enumerate(text.split('\n'), 1):
        if line.lstrip().startswith('```'):
            fenced = not fenced; continue
        if fenced: continue
        body = re.sub(r'`[^`]*`', '', line)
        body = re.sub(r'^\s*([-*+]|\d+\.)\s+', '', body)
        body = re.sub(r'^\|?(\s*:?-{3,}:?\s*\|)+\s*:?-{0,}:?\s*$', '', body)  # table rules
        body = re.sub(r'<!--.*?-->', '', body)
        if BAD.search(body): out.append((n, line.strip()))
    return out

class Visible(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True); self.stack = []; self.hits = []
    def handle_starttag(self, tag, attrs):
        if tag not in ('br', 'img', 'input', 'meta', 'link', 'hr', 'source'): self.stack.append(tag)
        for k, v in attrs:
            if k in ATTRS and v and BAD.search(v): self.hits.append((self.getpos()[0], f'{k}="{v}"'))
    def handle_endtag(self, tag):
        while self.stack:
            if self.stack.pop() == tag: break
    def handle_data(self, data):
        if SKIP_TAGS & set(self.stack): return
        for line in data.split('\n'):
            if BAD.search(line.strip()): self.hits.append((self.getpos()[0], line.strip()))

def check_html(text):
    p = Visible(); p.feed(text); return p.hits

def main(args):
    files = []
    for a in args or ['.']:
        p = pathlib.Path(a)
        files += [f for f in (p.rglob('*') if p.is_dir() else [p])
                  if f.suffix in ('.md', '.html') and not ({'node_modules', '.git', '.claude', '.next', 'test-results', 'playwright-report'} & set(f.parts))]
    fails = 0
    for f in sorted(files):
        text = f.read_text(encoding='utf-8')
        for n, line in (check_md(text) if f.suffix == '.md' else check_html(text)):
            fails += 1; print(f'{f}:{n}: {line[:140]}')
    print(f'no dash check: {len(files)} files, {fails} problems')
    return 1 if fails else 0

if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
