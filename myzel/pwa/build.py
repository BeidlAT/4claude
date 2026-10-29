#!/usr/bin/env python3
"""Builds the installable offline web app (PWA) from the claude.ai artifact source.

    python3 myzel/pwa/build.py <output-dir>

The app's source is the module tree myzel/src; myzel/index.html is its build (python3 myzel/build.py myzel/src
myzel/index.html), committed alongside it. This script refuses a stale index.html (not the build of myzel/src), so
the Pages job fails instead of publishing old code. index.html is an HTML fragment (the artifact host wraps it in a
document). This script wraps it the same way, swaps Google Fonts for the local copies in pwa/fonts, links the manifest
and icons, registers the service worker and writes a versioned sw.js that precaches every file for offline use.
"""
import hashlib, json, os, re, shutil, sys

HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.dirname(HERE)
out = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.join(APP, 'dist'))

src = open(os.path.join(APP, 'index.html'), encoding='utf-8').read()

# 0. index.html must be the build of the modules in myzel/src (never edited by hand)
sys.path.insert(0, APP)
from build import build as build_app   # myzel/build.py
with open(os.path.join(APP, 'index.html'), encoding='utf-8', newline='') as fh:
    if build_app(os.path.join(APP, 'src')) != fh.read():
        sys.exit('myzel/index.html is not the build of myzel/src – run python3 myzel/build.py myzel/src myzel/index.html')

# 1. local fonts instead of Google Fonts (works offline, no third-party requests)
src, n = re.subn(r'<link rel="preconnect" href="https://fonts\.(googleapis|gstatic)\.com"[^>]*>\n?', '', src)
src, m = re.subn(r'<link rel="stylesheet" href="https://fonts\.googleapis\.com/[^"]+">', '<link rel="stylesheet" href="fonts/fonts.css">', src)
assert n == 2 and m == 1, 'Google Fonts links in index.html changed – update build.py'

HEAD = """<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="description" content="Touch-Instrument für Ambient, Perkussion und psychedelische Klänge – mit Euklid-Puls, Effekten und verlustfreier Aufnahme.">
<meta name="theme-color" content="#110d0b">
<meta name="color-scheme" content="dark">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Myzel">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" sizes="32x32" href="icons/favicon-32.png">
<link rel="icon" type="image/png" sizes="192x192" href="icons/icon-192.png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}[hidden]{display:none!important}</style>
</head>
<body>
"""
# The update check (index.html's updBoot: registers sw.js, asks for a newer version on the start screen, shows its
# notes) runs only outside the claude.ai viewer (which does not allow service workers), and never in the Hexenring's
# hidden render frame (?werk=1, SPEC §8: render-only, it must not touch the app's caches). MYZEL_BUILD carries this
# build's version (the service worker's cache version) and its release notes from CHANGELOG.json.
TAIL = """
<script>
window.MYZEL_BUILD = __BUILD__;
if ('serviceWorker' in navigator && !(window.claude && window.claude.use) && !/[?&]werk=1(&|$)/.test(location.search) && window.myzelUpdate) window.myzelUpdate(window.MYZEL_BUILD);
</script>
</body>
</html>
"""

# 2. release notes (myzel/CHANGELOG.json, newest first): every release adds an entry on top – see its "regel"
log = json.load(open(os.path.join(APP, 'CHANGELOG.json'), encoding='utf-8'))
notes = log['versionen']
ids = [e['id'] for e in notes]
assert notes and len(set(ids)) == len(ids), 'CHANGELOG.json: ids missing or not unique'
assert ids == sorted(ids, reverse=True), 'CHANGELOG.json: newest entry first'
for e in notes:
    assert re.fullmatch(r'\d{4}-\d{2}-\d{2}[a-z]?', e['id']), 'CHANGELOG.json: id is a date (2026-10-23, 2026-10-23b): ' + e['id']
    assert 2 <= len(e['punkte']) <= 6 and all(isinstance(p, str) and p.strip() for p in e['punkte']), 'CHANGELOG.json: 2–6 points in ' + e['id']
notes = [{'id': e['id'], 'punkte': e['punkte']} for e in notes]

if os.path.isdir(out):
    shutil.rmtree(out)
os.makedirs(out)
page = HEAD + src + TAIL.replace('__BUILD__', '{"version":"__MYZEL_VERSION__","notes":' + json.dumps(notes, ensure_ascii=False).replace('</', '<\\/') + '}')
open(os.path.join(out, 'index.html'), 'w', encoding='utf-8').write(page)
json.dump(notes, open(os.path.join(out, 'changelog.json'), 'w', encoding='utf-8'), ensure_ascii=False)   # read by an older open version from this one's cache
shutil.copy(os.path.join(APP, 'tap-worklet.js'), out)
shutil.copy(os.path.join(HERE, 'manifest.webmanifest'), out)
for d in ('fonts', 'icons'):
    shutil.copytree(os.path.join(HERE, d), os.path.join(out, d))
# the hall's real rooms (dev/tools/raeume.py): served beside the app, not precached – each loads the first time it is
# chosen and is kept then (sw.js, its own cache across versions)
if os.path.isdir(os.path.join(APP, 'raeume')):
    shutil.copytree(os.path.join(APP, 'raeume'), os.path.join(out, 'raeume'))

# 3. service worker: precache list + a version derived from the content of every file (index.html still holding its
#    placeholder; the version is stamped into it afterwards)
assets = []
for root, _, files in os.walk(out):
    for f in sorted(files):
        rel = os.path.relpath(os.path.join(root, f), out).replace(os.sep, '/')
        if not rel.endswith('.txt') and not rel.startswith('raeume/'):
            assets.append(rel)
assets.sort()
h = hashlib.sha256()
for rel in assets:
    h.update(rel.encode()); h.update(open(os.path.join(out, rel), 'rb').read())
for root, _, files in os.walk(os.path.join(out, 'raeume')):   # (a changed room is a new version too – its cache keeps the old one otherwise)
    for f in sorted(files): h.update(f.encode()); h.update(open(os.path.join(root, f), 'rb').read())
version = h.hexdigest()[:12]
sw = open(os.path.join(HERE, 'sw.js'), encoding='utf-8').read()
sw = sw.replace("'__VERSION__'", json.dumps(version)).replace('__ASSETS__', json.dumps(['./'] + assets, indent=2))
open(os.path.join(out, 'sw.js'), 'w', encoding='utf-8').write(sw)
open(os.path.join(out, 'index.html'), 'w', encoding='utf-8').write(page.replace('__MYZEL_VERSION__', version))
print('built', out, '– version', version, '– notes', ids[0], '–', len(assets) + 1, 'files cached for offline use')
