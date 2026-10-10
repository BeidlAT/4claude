// Baut eine einzelne HTML-Datei für die Vorschau als Claude-Artefakt: ohne Dokumentgerüst (das setzt der
// Betrachter), Stil und Skripte eingebettet, die Klangmaschine als Text (wird als Blob-URL geladen),
// ohne Manifest und Service Worker. Aufruf: node tools/build-artifact.js ausgabe.html
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const out = process.argv[2] || path.join(require('os').tmpdir(), 'sphaerenwerk-artefakt.html');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const html = read('index.html');

const head = html.slice(html.indexOf('<head>') + 6, html.indexOf('</head>'));
let body = html.slice(html.indexOf('<body>') + 6, html.indexOf('</body>'));

const title = (head.match(/<title>[\s\S]*?<\/title>/) || [''])[0];
const fontLinks = head.split('\n').filter((l) => /fonts\.(googleapis|gstatic)\.com/.test(l)).join('\n');

// Skripte der Reihe nach einbetten, Service-Worker-Anmeldung weglassen
const scripts = [];
body = body.replace(/<script src="([^"]+)"><\/script>\n?/g, (m, src) => { scripts.push(src); return ''; });
body = body.replace(/<script>\s*if \('serviceWorker'[\s\S]*?<\/script>\n?/, '');
const guard = (code, name) => {
  if (/<\/script|<!--/i.test(code)) throw new Error(name + ' enthält </script oder <!--');
  return code;
};
const js = scripts.map((s) => '// ---- ' + s + '\n' + guard(read(s), s)).join('\n');
const css = read('style.css');
const engine = guard(read('engine.js'), 'engine.js');

const page = [
  title,
  fontLinks,
  '<style>\n' + css + '\n</style>',
  body.trim(),
  '<script type="text/plain" id="engine-src">\n' + engine + '\n</script>',
  '<script>\n' + js + '\n</script>',
].join('\n');

fs.writeFileSync(out, page);
console.log('geschrieben:', out, (page.length / 1024).toFixed(0) + ' KB');
