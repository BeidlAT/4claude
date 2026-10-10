// Öffnet das Sphärenwerk in Chromium (iPad-Größen), erweckt die Maschine, spielt und macht Bildschirmfotos.
// Aufruf: NODE_PATH=$(npm root -g) node tools/browser-check.js [ausgabeordner] [szenario]
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const OUT = process.argv[2] || path.join(require('os').tmpdir(), 'sphaerenwerk-test');
const SCENARIO = process.argv[3] || 'basic';
fs.mkdirSync(OUT, { recursive: true });

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.json': 'application/json', '.wav': 'audio/wav' };
function serve() {
  return new Promise((res) => {
    const srv = http.createServer((req, rsp) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p.endsWith('/')) p += 'index.html';
      const f = path.join(ROOT, p);
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rsp.writeHead(404); rsp.end('nicht da'); return; }
      rsp.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(rsp);
    });
    srv.listen(0, '127.0.0.1', () => res(srv));
  });
}

(async () => {
  const srv = await serve();
  const url = `http://127.0.0.1:${srv.address().port}/index.html`;
  const micWav = path.join(OUT, 'stimme.wav');
  const args = ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'];
  if (fs.existsSync(micWav)) args.push('--use-file-for-fake-audio-capture=' + micWav);
  const browser = await chromium.launch({ args });
  const sizes = SCENARIO === 'sizes'
    ? [['quer', 1180, 820], ['hoch', 820, 1180], ['pro', 1366, 1024], ['klein', 1080, 810]]
    : [['quer', 1180, 820]];
  const problems = [];
  for (const [name, w, hgt] of sizes) {
    const ctx = await browser.newContext({ viewport: { width: w, height: hgt }, deviceScaleFactor: 2, hasTouch: true, locale: 'de-DE' });
    await ctx.grantPermissions(['microphone']);
    const page = await ctx.newPage();
    page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') problems.push(`[${name}] ${m.type()}: ${m.text()}`); });
    page.on('pageerror', (e) => problems.push(`[${name}] Seitenfehler: ${e.message}\n${e.stack || ''}`));
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(OUT, `${name}-0-start.png`) });
    await page.click('#btnAwaken');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(OUT, `${name}-1-werk.png`) });
    // auf dem kleinen Pad spielen
    const mini = await page.$('#mini canvas');
    const box = await mini.boundingBox();
    const cdp = await ctx.newCDPSession(page);
    const touch = async (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((p, i) => ({ x: p[0], y: p[1], id: p[2] != null ? p[2] : i })) });
    const P = (fx, fy, id) => [box.x + box.width * fx, box.y + box.height * fy, id];
    await touch('touchStart', [P(0.2, 0.5, 1)]);
    await page.waitForTimeout(150);
    await touch('touchStart', [P(0.2, 0.5, 1), P(0.45, 0.3, 2)]);
    await page.waitForTimeout(150);
    await touch('touchStart', [P(0.2, 0.5, 1), P(0.45, 0.3, 2), P(0.7, 0.7, 3)]);
    for (let i = 0; i < 10; i++) { await touch('touchMove', [P(0.2 + i * 0.004, 0.5, 1), P(0.45, 0.3 - i * 0.01, 2), P(0.7, 0.7, 3)]); await page.waitForTimeout(30); }
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(OUT, `${name}-2-spielen.png`) });
    await touch('touchEnd', []);
    await page.waitForTimeout(300);
    const state = await page.evaluate(() => ({
      ready: Audio.ready, sr: Audio.sr, q: Audio.quality, ctx: Audio.ctx && Audio.ctx.state,
      vis: VIS.t > 0, voices: VIS.voices.length, mods: VIS.mods.size, pk: VIS.pkL,
      cables: Machine.st.cables.length, views: Werk.views.size, scale: Werk.s,
    }));
    console.log(name, JSON.stringify(state));
    if (SCENARIO === 'basic' || SCENARIO === 'full') {
      // Pad im Vollbild, Halten, zwei Töne halten
      await page.click('#btnPad');
      await page.waitForTimeout(500);
      await page.click('#strip .b-hold');
      const host = await (await page.$('#padHost canvas')).boundingBox();
      const Q = (fx, fy, id) => [host.x + host.width * fx, host.y + host.height * fy, id];
      await touch('touchStart', [Q(0.3, 0.4, 5)]); await page.waitForTimeout(200); await touch('touchEnd', []);
      await touch('touchStart', [Q(0.62, 0.65, 6)]); await page.waitForTimeout(200); await touch('touchEnd', []);
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(OUT, `${name}-3-pad-halten.png`) });
      // Mikrofon an (Fake-Gerät)
      await page.click('#strip .b-mic');
      await page.waitForTimeout(2500);
      await page.screenshot({ path: path.join(OUT, `${name}-4-pad-mikro.png`) });
      const st2 = await page.evaluate(() => ({ mic: Audio.micOn, micDb: VIS.micDb, micHz: VIS.micHz, layers: VIS.layers.length, orbs: Pad.orbs.length }));
      console.log(name, 'pad', JSON.stringify(st2));
      await page.click('#sWerk');
      await page.waitForTimeout(400);
      // Organ umdrehen und Kammer öffnen
      await page.click('.t-stimmen .flip');
      await page.waitForTimeout(700);
      await page.screenshot({ path: path.join(OUT, `${name}-5-umgedreht.png`) });
      const slot = await page.$('.slot');
      if (slot) { await slot.click(); await page.waitForTimeout(400); await page.screenshot({ path: path.join(OUT, `${name}-6-kammer.png`) }); await page.keyboard.press('Escape'); }
      // Orakel
      await page.evaluate(() => Oracle.draw());
      await page.waitForTimeout(1200);
      await page.screenshot({ path: path.join(OUT, `${name}-7-orakel.png`) });
      await page.evaluate(() => Oracle.hide());
    }
    await ctx.close();
  }
  await browser.close();
  srv.close();
  if (problems.length) { console.log('\nProbleme:'); for (const p of problems) console.log(' - ' + p); }
  else console.log('\nKeine Fehler in der Konsole.');
})().catch((e) => { console.error(e); process.exit(1); });
