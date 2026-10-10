// Prüft die Bedienung im Browser: Kabel stecken und umstecken, Regler drehen, Organe umsetzen,
// Rituale und Orakel, Takt-Aufnahme mit WAV-Export, Geisterhand. Aufruf wie browser-check.js.
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const OUT = process.argv[2] || path.join(require('os').tmpdir(), 'sphaerenwerk-test');
fs.mkdirSync(OUT, { recursive: true });
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
let fails = 0;
const check = (ok, msg) => { console.log((ok ? '  ok   ' : '  FEHL ') + msg); if (!ok) fails++; };

function serve() {
  return new Promise((res) => {
    const srv = http.createServer((req, rsp) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p.endsWith('/')) p += 'index.html';
      const f = path.join(ROOT, p);
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rsp.writeHead(404); rsp.end(); return; }
      rsp.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(rsp);
    });
    srv.listen(0, '127.0.0.1', () => res(srv));
  });
}

(async () => {
  const srv = await serve();
  const url = `http://127.0.0.1:${srv.address().port}/index.html`;
  const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 1024 }, deviceScaleFactor: 1, hasTouch: true, locale: 'de-DE', acceptDownloads: true });
  await ctx.grantPermissions(['microphone']);
  const page = await ctx.newPage();
  const problems = [];
  page.on('console', (m) => { if (m.type() === 'error') problems.push(m.text()); });
  page.on('pageerror', (e) => problems.push('Seitenfehler: ' + e.message + '\n' + (e.stack || '')));
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate(() => { localStorage.clear(); });
  await page.reload({ waitUntil: 'networkidle' });
  await page.click('#btnAwaken');
  await page.waitForTimeout(1200);
  await page.evaluate(() => { const t = document.getElementById('toast'); t.hidden = true; });

  const center = async (sel) => { const b = await (await page.$(sel)).boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; };
  const ids = await page.evaluate(() => Object.fromEntries(Machine.st.mods.map((m) => [m.type, m.id])));

  console.log('Kabel stecken');
  const n0 = await page.evaluate(() => Machine.st.cables.length);
  let [sx, sy] = await center(`.mod[data-id="${ids.schlagwerk}"] .jk[data-port="out"] .jk-hole`);
  let [tx, ty] = await center(`.mod[data-id="${ids.altar}"] .jk[data-port="in"] .jk-hole`);
  await page.mouse.move(sx, sy); await page.mouse.down();
  for (let i = 1; i <= 12; i++) { await page.mouse.move(sx + (tx - sx) * i / 12, sy + (ty - sy) * i / 12); await page.waitForTimeout(16); }
  await page.mouse.up();
  await page.waitForTimeout(200);
  const n1 = await page.evaluate(() => Machine.st.cables.length);
  check(n1 === n0 + 1, `neues Kabel Schlagwerk → Altar (${n0} → ${n1})`);
  await page.screenshot({ path: path.join(OUT, 'f1-kabel.png') });

  console.log('Kabel an der Eingangsbuchse herausziehen');
  [sx, sy] = await center(`.mod[data-id="${ids.altar}"] .jk[data-port="in"] .jk-hole`);
  await page.mouse.move(sx, sy); await page.mouse.down();
  for (let i = 1; i <= 8; i++) { await page.mouse.move(sx - i * 20, sy - i * 25); await page.waitForTimeout(16); }
  await page.mouse.up();
  await page.waitForTimeout(200);
  const n2 = await page.evaluate(() => Machine.st.cables.length);
  check(n2 === n1 - 1, `Kabel gelöst (${n1} → ${n2})`);
  await page.evaluate(() => Machine.undo());
  check((await page.evaluate(() => Machine.st.cables.length)) === n1, 'Rückgängig steckt es wieder');

  console.log('Modulationskabel an einen Regler');
  [sx, sy] = await center(`.mod[data-id="${ids.gezeiten}"] .jk[data-port="III"] .jk-hole`);
  [tx, ty] = await center(`.mod[data-id="${ids.resonator}"] .knob[data-p="klingen"] .kjack`);
  await page.mouse.move(sx, sy); await page.mouse.down();
  for (let i = 1; i <= 12; i++) { await page.mouse.move(sx + (tx - sx) * i / 12, sy + (ty - sy) * i / 12); await page.waitForTimeout(16); }
  await page.mouse.up();
  await page.waitForTimeout(400);
  const modc = await page.evaluate((rid) => Machine.st.cables.find((c) => c.kind === 'mod' && c.to.m === rid && c.to.p === 'klingen'), ids.resonator);
  check(!!modc, 'Gezeiten III steckt am Regler „Klingen“');
  const modded = await page.evaluate((rid) => document.querySelector(`.mod[data-id="${rid}"] .knob[data-p="klingen"]`).classList.contains('modded'), ids.resonator);
  check(modded, 'Regler zeigt den Modulationsbogen');

  console.log('Regler drehen');
  [sx, sy] = await center(`.mod[data-id="${ids.stimmen}"] .knob[data-p="filter"] .kn-cap`);
  const v0 = await page.evaluate((id) => Machine.mod(id).vals.filter, ids.stimmen);
  await page.mouse.move(sx, sy); await page.mouse.down();
  for (let i = 1; i <= 10; i++) { await page.mouse.move(sx, sy - i * 6); await page.waitForTimeout(16); }
  await page.mouse.up();
  const v1 = await page.evaluate((id) => Machine.mod(id).vals.filter, ids.stimmen);
  check(v1 > v0 + 0.15, `Filter höher gedreht (${v0.toFixed(2)} → ${v1.toFixed(2)})`);

  console.log('Organ umsetzen');
  const before = await page.evaluate((id) => { const m = Machine.mod(id); return [m.c, m.r]; }, ids.gezeiten);
  const slot = await page.evaluate(() => { const s = document.querySelector('.slot'); const r = s.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
  [sx, sy] = await center(`.mod[data-id="${ids.gezeiten}"] .plate h3`);
  await page.mouse.move(sx, sy); await page.mouse.down();
  for (let i = 1; i <= 15; i++) { await page.mouse.move(sx + (slot[0] - sx) * i / 15, sy + (slot[1] - 120 * (await page.evaluate(() => Werk.s)) - sy) * i / 15); await page.waitForTimeout(16); }
  await page.mouse.up();
  await page.waitForTimeout(500);
  const after = await page.evaluate((id) => { const m = Machine.mod(id); return [m.c, m.r]; }, ids.gezeiten);
  check(after[0] !== before[0] || after[1] !== before[1], `Gezeiten umgesetzt (${before} → ${after})`);
  await page.screenshot({ path: path.join(OUT, 'f2-umgesetzt.png') });

  console.log('Rituale');
  const rit = await page.evaluate(async () => {
    const out = [];
    for (const r of RITUALE) {
      Machine.load(ritualState(r)); Pad.layout(); Werk.fit();
      await new Promise((res) => setTimeout(res, 250));
      Audio.noteOn(77, 220, 0.5, 0.8);
      await new Promise((res) => setTimeout(res, 700));
      out.push([r.name, Math.max(VIS.pkL, VIS.pkR), Werk.views.size, Machine.st.cables.length]);
      Audio.noteOff(77);
    }
    return out;
  });
  for (const [name, pk, nv, nc] of rit) check(pk > 0.003 && pk < 1, `${name}: klingt (Spitze ${(20 * Math.log10(pk)).toFixed(1)} dB), ${nv} Organe, ${nc} Kabel`);
  await page.screenshot({ path: path.join(OUT, 'f3-ritual.png') });

  console.log('Orakel: jede Karte');
  const orc = await page.evaluate(() => {
    Machine.load(ritualState(RITUALE[0]));
    const res = [];
    for (let i = 0; i < Oracle.cards.length; i++) {
      Oracle.last = -1;
      const card = Oracle.cards[i];
      let note = null, err = null;
      try { if (card.a) note = Machine.batch(() => card.a()); } catch (e) { err = String(e); }
      res.push([card.t, note, err]);
      if (card.a && note != null) Machine.undo();
    }
    Oracle.hide();
    return res;
  });
  for (const [t, note, err] of orc) check(!err, `„${t}“ ${err ? err : note ? '→ ' + note : '(Anweisung)'}`);

  console.log('Takt-Aufnahme bei 120 BPM, 1 Takt, 1 Takt Nachklang');
  await page.evaluate(() => {
    Machine.load(ritualState(RITUALE[0])); Machine.setTempo(120);
    Settings.set('recMode', 'takt'); Settings.set('recBars', 1); Settings.set('recCount', true); Settings.set('recFold', true); Settings.set('recTail', 1);
    Audio.noteOn(91, 293.66, 0.6, 0.8);
    Recorder.toggle();
  });
  await page.waitForTimeout(6800);
  const take = await page.evaluate(() => { const t = Recorder.takes[Recorder.takes.length - 1]; return t && { frames: t.frames, sr: t.sr, mode: t.mode, bars: t.bars, peak: t.peak, state: Recorder.state }; });
  console.log('   ', JSON.stringify(take));
  check(take && take.mode === 'takt' && take.frames === Math.round(2 * take.sr), 'Schleife exakt 2 s lang (1 Takt bei 120 BPM)');
  check(take && take.peak > 0.01, 'Aufnahme enthält Klang');
  await page.evaluate(() => { Audio.noteOff(91); Recorder.sheet(); });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, 'f4-aufnahmen.png') });
  const saveBtn = await page.$('.take .btn.primary');
  await saveBtn.click();
  await page.waitForSelector('.take .btn.ready', { timeout: 8000 });
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 8000 }), page.click('.take .btn.ready')]);
  const file = path.join(OUT, dl.suggestedFilename());
  await dl.saveAs(file);
  const buf = fs.readFileSync(file);
  const dataPos = buf.indexOf('data');
  const dataLen = buf.readUInt32LE(dataPos + 4);
  check(buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WAVE', 'WAV-Kopf stimmt (' + dl.suggestedFilename() + ')');
  check(dataLen === take.frames * 6, `24-Bit-Stereo-Daten: ${dataLen} Bytes = ${take.frames} Frames`);
  await page.keyboard.press('Escape');

  console.log('Geisterhand');
  await page.evaluate(() => { Machine.setTempo(120); Settings.set('geistTakte', 1); App.setView('pad'); });
  await page.waitForTimeout(300);
  await page.evaluate(() => Ghost.start());
  const wait = await page.evaluate(() => Ghost.rec.t0 - Ghost.now());
  await page.waitForTimeout(Math.max(0, wait * 1000) + 100);
  const host = await (await page.$('#padHost canvas')).boundingBox();
  const cdp = await ctx.newCDPSession(page);
  const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((p) => ({ x: p[0], y: p[1], id: p[2] })) });
  for (const fx of [0.2, 0.45, 0.7]) {
    await touch('touchStart', [[host.x + host.width * fx, host.y + host.height * 0.5, 9]]);
    await page.waitForTimeout(250);
    await touch('touchEnd', []);
    await page.waitForTimeout(250);
  }
  await page.waitForTimeout(2200);
  const g = await page.evaluate(() => ({ layers: Ghost.layers.length, ev: Ghost.layers[0] ? Ghost.layers[0].ev.length : 0, rec: !!Ghost.rec }));
  check(g.layers === 1 && g.ev >= 6, `ein Geist mit ${g.ev} Ereignissen`);
  let ghostVoices = 0;
  for (let i = 0; i < 20; i++) { ghostVoices = Math.max(ghostVoices, await page.evaluate(() => VIS.voices.filter((v) => v.note >= 1000000).length)); await page.waitForTimeout(100); }
  check(ghostVoices > 0, 'der Geist spielt Töne nach');
  await page.screenshot({ path: path.join(OUT, 'f5-geist.png') });
  await page.evaluate(() => { Ghost.clear(); App.setView('werk'); });

  console.log('Blätter');
  for (const fn of ['skalaSheet', 'tempoSheet', 'ritualSheet', 'settingsSheet', 'helpSheet']) {
    await page.evaluate((f) => App[f](), fn);
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(OUT, 'f6-' + fn + '.png') });
    await page.evaluate(() => Sheet.close());
  }
  await page.evaluate(() => { Machine.setSkala({ mode: 'obertoene' }); App.setView('pad'); });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, 'f7-obertoene.png') });

  await browser.close();
  srv.close();
  if (problems.length) { console.log('\nKonsole:'); for (const p of problems) console.log(' - ' + p); fails += problems.length; }
  console.log(fails ? `\n${fails} Prüfung(en) fehlgeschlagen` : '\nAlle Prüfungen bestanden');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
