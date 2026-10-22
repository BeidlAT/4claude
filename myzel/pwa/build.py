#!/usr/bin/env python3
"""Builds the installable offline web app (PWA) from the claude.ai artifact source.

    python3 myzel/pwa/build.py <output-dir>

myzel/index.html stays the single source: it is an HTML fragment (the artifact host wraps it in a document).
This script wraps it the same way, swaps Google Fonts for the local copies in pwa/fonts, links the manifest
and icons, registers the service worker and writes a versioned sw.js that precaches every file for offline use.
"""
import hashlib, json, os, re, shutil, sys

HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.dirname(HERE)
out = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.join(APP, 'dist'))

src = open(os.path.join(APP, 'index.html'), encoding='utf-8').read()

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
# The service worker is registered only outside the claude.ai viewer (which does not allow service workers), and never
# by the Hexenring's hidden render frame (?werk=1, SPEC §8: render-only, it must not touch the app's caches).
TAIL = """
<script>
if ('serviceWorker' in navigator && !(window.claude && window.claude.use) && !/[?&]werk=1(&|$)/.test(location.search)) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js').then(function (reg) {
      reg.addEventListener('updatefound', function () {
        var w = reg.installing;
        if (!w) return;
        w.addEventListener('statechange', function () {
          // a newer version has been stored while this one is open: the app offers a reload
          if (w.state === 'activated' && navigator.serviceWorker.controller) window.dispatchEvent(new Event('myzel-update'));
        });
      });
    }).catch(function () {});
  });
}
</script>
</body>
</html>
"""

if os.path.isdir(out):
    shutil.rmtree(out)
os.makedirs(out)
open(os.path.join(out, 'index.html'), 'w', encoding='utf-8').write(HEAD + src + TAIL)
shutil.copy(os.path.join(APP, 'tap-worklet.js'), out)
shutil.copy(os.path.join(HERE, 'manifest.webmanifest'), out)
for d in ('fonts', 'icons'):
    shutil.copytree(os.path.join(HERE, d), os.path.join(out, d))

# 2. service worker: precache list + a version derived from the content of every file
assets = []
for root, _, files in os.walk(out):
    for f in sorted(files):
        rel = os.path.relpath(os.path.join(root, f), out).replace(os.sep, '/')
        if not rel.endswith('.txt'):
            assets.append(rel)
assets.sort()
h = hashlib.sha256()
for rel in assets:
    h.update(rel.encode()); h.update(open(os.path.join(out, rel), 'rb').read())
version = h.hexdigest()[:12]
sw = open(os.path.join(HERE, 'sw.js'), encoding='utf-8').read()
sw = sw.replace("'__VERSION__'", json.dumps(version)).replace('__ASSETS__', json.dumps(['./'] + assets, indent=2))
open(os.path.join(out, 'sw.js'), 'w', encoding='utf-8').write(sw)
print('built', out, '– version', version, '–', len(assets) + 1, 'files cached for offline use')
