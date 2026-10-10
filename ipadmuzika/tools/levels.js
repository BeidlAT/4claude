// Misst die Pegel aller Rituale im Browser: ein Ton, ein Dreiklang, je mit laufenden Taktgebern.
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
(async () => {
  const srv = await new Promise((res) => { const s = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }); s.listen(0, '127.0.0.1', () => res(s)); });
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext({ viewport: { width: 1180, height: 820 } })).newPage();
  page.on('pageerror', (e) => console.log('Seitenfehler', e.message));
  await page.goto(`http://127.0.0.1:${srv.address().port}/index.html`);
  await page.click('#btnAwaken'); await page.waitForTimeout(800);
  const res = await page.evaluate(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const peakOver = async (ms) => { let p = 0; const t0 = performance.now(); while (performance.now() - t0 < ms) { p = Math.max(p, VIS.pkL, VIS.pkR); await sleep(30); } return p; };
    const db = (x) => (x > 1e-6 ? (20 * Math.log10(x)).toFixed(1) : '-inf');
    const out = [];
    for (const r of RITUALE) {
      const st = ritualState(r);
      for (const m of st.mods) if (m.vals.lauf != null) m.vals.lauf = 0;
      Machine.load(st); await sleep(300);
      const sk = Skala.build(Machine.st.skala), hz = (s) => Skala.stepHz(sk, 3, s);
      Audio.send({ t: 'panic' }); await sleep(200);
      Audio.noteOn(1, hz(0), 0.5, 0.78); const one = await peakOver(1800); Audio.noteOff(1); await sleep(2500);
      Audio.send({ t: 'panic' }); await sleep(200);
      [0, 2, 4].forEach((s, i) => Audio.noteOn(10 + i, hz(s), 0.5, 0.78)); const tri = await peakOver(1800); [0, 1, 2].forEach((i) => Audio.noteOff(10 + i));
      await sleep(400); Audio.send({ t: 'panic' }); await sleep(200);
      const live = ritualState(r); Machine.load(live); await sleep(200);
      const gen = await peakOver(4000);
      out.push(`${r.name.padEnd(24)} ein Ton ${db(one).padStart(6)} dB   Dreiklang ${db(tri).padStart(6)} dB   von selbst ${db(gen).padStart(6)} dB`);
      Audio.send({ t: 'panic' });
    }
    return out;
  });
  console.log(res.join('\n'));
  await browser.close(); srv.close();
})();
