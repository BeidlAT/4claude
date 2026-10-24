// The owner's first test on a phone (22.10.2026: "beim loopen ist der sound sehr abgehackt … das aufnehmen von audio
// geht nicht richtig, wartet auf die 1 und dann passiert nichts, oder sagt es nimmt auf aber bleibt bei 0 … wenn ich die
// aufnahme länge ändern will, wird [was spielt] langsamer oder schneller"), as the phone does it: an Android phone
// emulated (412 × 915, touch, a mobile UA – Myzel's phone defaults), every action a real tap or drag on the real
// controls (CDP touch events), nothing through internal calls; window.__M only reads what the page shows or holds.
//   1. Aufnahme in Takten: fresh (empty storage), the Puls off and on, and after a reload – the window starts (on the 1
//      with the Puls), its time runs, the take arrives exactly bars × 4 beats long
//   2. Aufnahme frei: the time runs, the take arrives
//   3. the Hexenring's own recording (the Hauptknopf) with the Puls: count-in, recording, a Schleife that sounds
//   4. Klopf mit: eight taps on the pad give a play delay
//   5. a length change while loops play (Takte, Feste Länge, Humus-Länge, the loop's „Länge +1“): what plays keeps its
//      pitch and tempo (shift of the long-term spectrum 0 cents, the Taktgeber unchanged; „Länge +1“ re-cuts: beats + 4)
//   6. loops played on: the chain copy on out 1 rests once every Schicht is baked, and wakes, audible, for „folgt“
//   7. continuity: the output recorded while two loops play, the main thread throttled 6× – no gap, no click
//   8. a slow audio core (cgroup, root only – else INFO): device underruns while loops play; the guard lets Taumeln rest
//      on the phone, never A.lite or the live budget for loops (report A), and the stutter eases (playoutStats,
//      Chromium's experimental figures)
//   9. the owner's report A (23.10.2026: 8 loops, none playing, the device dropping a quarter of its audio, the live budget
//      cut to 6 and A.lite on): a halted or muted loop reads nothing in the processor – offline, the same samples as
//      reading it, and its render time gone; live, a halted loop costs nothing in the budget, lets the chain's copy on out
//      1 and Ruhe rest and wakes them before it plays again; on a slow core shared with the Werk-Rahmen's renders (root),
//      8 loops of which 4 Lebendig: the guard first holds Lebendig (the last pass plays on), then lets Taumeln rest,
//      never touches the live budget or A.lite, and the underruns fall
//   node t-hx-phone.js        (slot hx: sh ../v2/mk.sh /home/user/4claude/myzel hx – run-all.sh builds it)
//   PARTS=9 node t-hx-phone.js  (only part 9; PARTS=1-7, 8, 1-8 the others)
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs');
const H = require('./hx-h');
const { ok } = H;
const URL = process.env.HX_URL || 'http://127.0.0.1:8790/hx-inst/index.html';
const PHONE = { viewport: { width: 412, height: 915 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2.625, userAgent: 'Mozilla/5.0 (Linux; Android 14; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36' };
let browser = null;
async function phone(o = {}) {
  if (!browser) browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--enable-experimental-web-platform-features'] });
  const ctx = o.ctx || (await browser.newContext(PHONE));
  // (part 9: the guard's timer held back until the test starts it from a known state – watchUnderruns again)
  if (o.noguard) await ctx.addInitScript(() => { const si = window.setInterval; window.setInterval = function (f, ms, ...a) { if (typeof f === 'function' && /hxWGuard/.test(String(f)) && !window.__guardOk) return 0; return si.call(this, f, ms, ...a); }; });
  const page = await ctx.newPage(), errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' || /^Hexenring: (non-finite|a render held non-finite)/.test(m.text())) errors.push(m.text()); });
  await page.goto(URL); await page.waitForFunction(() => !!window.__M); await page.waitForTimeout(600);
  await H.tools(page);
  const cdp = await ctx.newCDPSession(page);
  await page.tap('#btnStart'); await page.waitForFunction(() => window.__M.HX.state === 'ok', null, { timeout: 10000 }); await page.waitForTimeout(800);
  const P = { page, ctx, cdp, errors };
  P.box = await page.evaluate(() => { const r = document.getElementById('cvFx').getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; });
  return P;
}
const touch = (P, type, x, y) => P.cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
// a phrase on the field: n notes, each held ms
async function play(P, n = 8, ms = 250, row = 0) {
  const [x0, y0, w, h] = P.box;
  for (let i = 0; i < n; i++) { const x = x0 + w * (0.15 + 0.1 * (i % 8)), y = y0 + h * (0.3 + 0.1 * row); await touch(P, 'touchStart', x, y); await P.page.waitForTimeout(ms); await touch(P, 'touchEnd'); await P.page.waitForTimeout(250); }
}
async function tapSel(P, sel) { const l = P.page.locator(sel).first(); await l.scrollIntoViewIfNeeded(); await l.tap(); }
async function openFold(P, text) { const l = P.page.locator('#hxSec button.fold-b', { hasText: text }).first(); await l.scrollIntoViewIfNeeded(); if ((await l.getAttribute('aria-expanded')) !== 'true') await l.tap(); await P.page.waitForTimeout(200); }
async function tapText(P, text, within = '') { const l = P.page.locator((within ? within + ' ' : '') + 'button', { hasText: text }).first(); await l.scrollIntoViewIfNeeded(); await l.tap(); }
// a sideways drag on a slider (the touch path: relative, no jump), dx px per step
async function drag(P, sel, dx, steps = 15) {
  const l = P.page.locator(sel).first(); await l.scrollIntoViewIfNeeded(); const r = await l.boundingBox();
  const y = r.y + r.height / 2; let x = r.x + r.width * (dx > 0 ? 0.2 : 0.8);
  await touch(P, 'touchStart', x, y);
  for (let i = 0; i < steps; i++) { x += dx; await touch(P, 'touchMove', x, y); await P.page.waitForTimeout(35); }
  await touch(P, 'touchEnd');
}
const shows = (P) => P.page.evaluate(() => ({ time: document.querySelector('.rectime').textContent, sub: document.querySelector('.recsub').textContent, lbl: document.getElementById('recLabel').textContent, st: window.__M.CAP.state, takes: window.__M.takes.length, ctxT: window.__M.A.ctx.currentTime }));
// the recorder of the output (A.out), its frames from where it began
async function recOn(P) { await P.page.evaluate(async () => { const M = window.__M, a = M.A.ctx; if (!window.__rn) await a.audioWorklet.addModule(window.__testUrl); const n = new AudioWorkletNode(a, 'hx-recf', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2], channelCount: 2, channelCountMode: 'explicit' }); M.A.out.connect(n); const z = a.createGain(); z.gain.value = 0; n.connect(z).connect(a.destination); window.__rn = n; }); }
async function recGet(P) { return P.page.evaluate(async () => { const d = await window.__recGet(window.__rn); try { window.__M.A.out.disconnect(window.__rn); } catch (e) {} return { L: Array.from(d.L), f0: d.f0, sr: window.__M.A.ctx.sampleRate }; }); }
// the long-term spectrum on a log axis (5-cent bins, 80 Hz–5 kHz) and the shift between two of them, in cents
function fft(re, im) { const n = re.length; for (let i = 1, j = 0; i < n; i++) { let b = n >> 1; for (; j & b; b >>= 1) j ^= b; j ^= b; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let len = 2; len <= n; len <<= 1) { const a = -2 * Math.PI / len, wr = Math.cos(a), wi = Math.sin(a); for (let i = 0; i < n; i += len) { let cr = 1, ci = 0; for (let k = 0; k < len / 2; k++) { const p = i + k, q = p + len / 2, vr = re[q] * cr - im[q] * ci, vi = re[q] * ci + im[q] * cr; re[q] = re[p] - vr; im[q] = im[p] - vi; re[p] += vr; im[p] += vi; const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t; } } } }
function logSpec(x, sr) {
  const N = 16384, B = Math.round(240 * Math.log2(5000 / 80)), acc = new Float64Array(B);
  for (let s = 0; s + N <= x.length; s += N / 2) {
    const re = new Float64Array(N), im = new Float64Array(N);
    for (let i = 0; i < N; i++) re[i] = x[s + i] * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / N));
    fft(re, im);
    for (let k = 1; k < N / 2; k++) { const f = k * sr / N; if (f >= 80 && f < 5000) acc[Math.floor(240 * Math.log2(f / 80))] += re[k] * re[k] + im[k] * im[k]; }
  }
  let m = 0; for (let b = 0; b < B; b++) { acc[b] = Math.log(1e-12 + acc[b]); m += acc[b]; } m /= B; for (let b = 0; b < B; b++) acc[b] -= m;
  return acc;
}
function shiftCents(a, b) { let best = 0, bs = -Infinity; for (let d = -240; d <= 240; d++) { let s = 0, n = 0; for (let i = 0; i < a.length; i++) { const j = i + d; if (j >= 0 && j < b.length) { s += a[i] * b[j]; n++; } } s /= n; if (s > bs) { bs = s; best = d; } } return best * 5; }
const rms = (a) => Math.sqrt(a.reduce((s, v) => s + v * v, 0) / Math.max(1, a.length));
// gaps (a 128-frame block 30 dB under its 16 neighbours) and clicks (a second difference 10× its neighbours' median)
function gapsClicks(x) {
  const B = 128, nb = Math.floor(x.length / B), r = [], m2 = [];
  for (let k = 0; k < nb; k++) { let s = 0, m = 0; for (let i = 1; i < B; i++) { const v = x[k * B + i]; s += v * v; if (k * B + i >= 2) { const d = Math.abs(v - 2 * x[k * B + i - 1] + x[k * B + i - 2]); if (d > m) m = d; } } r.push(Math.sqrt(s / B)); m2.push(m); }
  let gaps = 0, clicks = 0;
  for (let k = 8; k < nb - 8; k++) {
    let m = 0; const nbh = []; for (let j = 1; j <= 8; j++) { m += r[k - j] + r[k + j]; nbh.push(m2[k - j], m2[k + j]); }
    m /= 16; nbh.sort((a, b) => a - b);
    if (m > 1e-3 && r[k] < 0.03 * m) gaps++;
    if (m2[k] > 1e-3 && m2[k] > 10 * nbh[8]) clicks++;
  }
  return { gaps, clicks };
}

const RUN = (k) => !process.env.PARTS || process.env.PARTS.split(',').includes(k);
// n loops of 2 bars made from notes on the field's strip (internal calls: the setup, not what is tested), the first nl
// of them Lebendig; returns their keys
async function mkLoops(P, n, nl, o = {}) {
  return P.page.evaluate(async ({ n, nl, o }) => {
    const M = window.__M, A = M.A, sl = (ms) => new Promise((r) => setTimeout(r, ms)), ENGS = ['glo', 'neb'];
    M.setParam('v.human', 0); M.setParam('hx.laenge', 'fest'); M.setParam('hx.festT', o.bars || 2);
    M.setParam('seq.bpm', 110); for (const i of [0, 1, 2, 3]) M.setParam('l' + i + '.on', false); if (!M.SEQ.on) M.seqStart();
    await sl(700);
    const keys = [];
    for (let j = 0; j < n; j++) {
      const beat = 60 / M.tgBpm(A.ctx.currentTime), t0 = M.tgTime(Math.ceil(M.tgBeat(A.ctx.currentTime + 0.3) / 4) * 4), bars = o.bars || 2;
      const degs = [[0, 2, 4, 7], [4, 2, 1, 3], [7, 5, 4, 2], [0, 4, 7, 9]][j % 4];
      for (let r = 0; r < bars; r++) degs.forEach((d, i) => { const f = M.N.notes[Math.min(M.N.notes.length - 1, d + 7 * (j % 3))].f, t = t0 + (r * 4 + i) * beat; const v = M.playNote(ENGS[j % 2], t, f, 0.5, i ? 0.6 : 0.9, { bus: M.stripIn('fin') }); if (v && v.release) setTimeout(() => v.release(), (t + beat * 0.6 - A.ctx.currentTime) * 1000); });
      while (A.ctx.currentTime < t0 + 4 * bars * beat + 0.05) await sl(30);
      const L = M.hxHarvest(M.hxKorbPlan(M.hxHeard()), {});
      if (L) keys.push(L.key);
      await sl(300);
    }
    if (M.SEQ.on) M.seqStop();
    for (let i = 0; i < 100; i++) { let all = true; for (const k of keys) { const L = M.hxByKey(k); for (const id of L.sch) { const S = M.HX.sch.get(id); if (!(S && S.wn && S.aud)) { all = false; M.hxWNotesAll(L); } } } if (all) break; await sl(100); }
    for (let i = 0; i < nl && i < keys.length; i++) M.hxWSet(M.hxByKey(keys[i]), 'eig', 'lebendig');
    return keys;
  }, { n, nl, o });
}
(async () => {
  let P = null, out = null;
  if (RUN('1-8') || RUN('1-7')) {
  // ---- 1. Aufnahme in Takten (fresh), the Puls off: it begins at once, its time runs, the take is exact ----
  P = await phone();
  await tapSel(P, '#tab-rec'); await P.page.waitForTimeout(500);
  await tapText(P, 'In Takten', '#sheet');
  await drag(P, '#p-rec-bars', -40, 20);   // (down to 1 Takt: a short test)
  let s = await P.page.evaluate(() => ({ bars: window.__M.P['rec.bars'], info: document.querySelector('#sheet .grid + .note') ? document.querySelector('#sheet .grid + .note').textContent : '' }));
  ok(s.bars === 1, `1. the Takte slider dragged on the phone: ${s.bars} Takt`);
  await tapSel(P, '.recbig button.big');
  const seen = [];
  for (let i = 0; i < 8; i++) { await P.page.waitForTimeout(500); seen.push(await shows(P)); if (i === 1) await play(P, 3, 200); }
  const recRows = seen.filter((x) => x.st === 'rec' || x.st === 'tail');
  ok(recRows.length >= 2 && new Set(recRows.map((x) => x.sub)).size >= 2, `1.   Puls off: it records at once, and its time runs (${recRows.map((x) => x.sub.slice(0, 7)).join(' · ')})`);
  await P.page.waitForFunction(() => window.__M.takes.length >= 1 && window.__M.CAP.state === 'idle', null, { timeout: 20000 }).catch(() => {});
  let tk = await P.page.evaluate(() => { const M = window.__M, t = M.takes[0]; return t ? { frames: t.frames, bars: t.bars, bpm: t.bpm, sr: t.sr } : null; });
  ok(tk && tk.bars === 1 && Math.abs(tk.frames - Math.round(4 * 60 / tk.bpm * tk.sr)) <= 1, `1.   the take: ${tk && tk.bars} Takt at ${tk && tk.bpm} BPM = ${tk && tk.frames} frames (bars × 4 beats: ${tk && Math.round(4 * 60 / tk.bpm * tk.sr)})`);
  // the Puls on: it waits for the 1 (counting down), then records, its time runs
  await tapSel(P, '#btnPuls'); await P.page.waitForTimeout(700);
  await tapSel(P, '.recbig button.big');
  const seen2 = [];
  for (let i = 0; i < 12; i++) { await P.page.waitForTimeout(400); seen2.push(await shows(P)); }
  const cue = seen2.filter((x) => x.st === 'cue'), rec2 = seen2.filter((x) => x.st === 'rec' || x.st === 'tail');
  ok(rec2.length >= 2 && (cue.length === 0 || /Eins/.test(cue[0].sub)), `1.   Puls on: ${cue.length ? 'waits for the 1 („' + cue[0].sub.slice(0, 40) + '…“), then ' : ''}records (${rec2.map((x) => x.time).join(' · ')})`);
  await P.page.waitForFunction(() => window.__M.takes.length >= 2 && window.__M.CAP.state === 'idle', null, { timeout: 20000 }).catch(() => {});
  tk = await P.page.evaluate(() => { const t = window.__M.takes[0]; return t ? { frames: t.frames, bars: t.bars, bpm: t.bpm, sr: t.sr } : null; });
  ok(tk && tk.bars === 1 && Math.abs(tk.frames - Math.round(4 * 60 / tk.bpm * tk.sr)) <= 1, `1.   the take with the Puls: exact (${tk && tk.frames} frames)`);
  await tapSel(P, '#btnPuls');
  // ---- 2. Aufnahme frei ----
  await tapText(P, 'Frei', '#sheet');
  await tapSel(P, '.recbig button.big');
  const t2 = [];
  for (let i = 0; i < 5; i++) { await P.page.waitForTimeout(400); t2.push((await shows(P)).time); }
  await tapSel(P, '.recbig button.big');
  await P.page.waitForFunction(() => window.__M.takes.length >= 3 && window.__M.CAP.state === 'idle', null, { timeout: 15000 }).catch(() => {});
  tk = await P.page.evaluate(() => { const t = window.__M.takes[0]; return t ? { frames: t.frames, sr: t.sr } : null; });
  ok(new Set(t2).size >= 3 && t2[t2.length - 1] !== '0:00,0' && tk && tk.frames > 1.5 * tk.sr, `2. free: its time runs (${t2.join(' · ')}), the take ${tk && (tk.frames / tk.sr).toFixed(2)} s`);
  // ---- 1b. after a reload (the stored settings and takes come back): in Takten again ----
  const ctx1 = P.ctx;
  await P.page.close();
  P = await phone({ ctx: ctx1 });
  await tapSel(P, '#tab-rec'); await P.page.waitForTimeout(500);
  s = await P.page.evaluate(() => ({ len: window.__M.P['rec.len'], takes: window.__M.takes.length }));
  await tapText(P, 'In Takten', '#sheet');
  await tapSel(P, '.recbig button.big');
  const seen3 = [];
  for (let i = 0; i < 6; i++) { await P.page.waitForTimeout(400); seen3.push(await shows(P)); }
  await P.page.waitForFunction(() => window.__M.CAP.state === 'idle' && window.__M.takes.length >= 4, null, { timeout: 20000 }).catch(() => {});
  const n3 = await P.page.evaluate(() => window.__M.takes.length);
  ok(s.takes >= 3 && seen3.some((x) => x.st === 'rec') && n3 >= 4, `1b. after a reload (${s.takes} takes back): in Takten it records again, a new take (${n3})`);
  ok(!P.errors.length, `1–2. no error (${P.errors.slice(0, 2).join(' | ')})`);
  await P.ctx.close();

  // ---- 3. the Hexenring's own recording, the Puls on: count-in, recording, a Schleife ----
  P = await phone();
  await tapSel(P, '#btnPuls'); await P.page.waitForTimeout(600);
  await tapSel(P, '#hxHaupt');
  const ph = [];
  for (let i = 0; i < 6; i++) { ph.push(await P.page.evaluate(() => window.__M.HX.rec && window.__M.HX.rec.phase)); await play(P, 2, 200); }
  await tapSel(P, '#hxHaupt');
  await P.page.waitForFunction(() => [...window.__M.HX.loops.values()].some((L) => L.state === 'spielt'), null, { timeout: 15000 }).catch(() => {});
  await P.page.waitForTimeout(2500);
  await recOn(P); await P.page.waitForTimeout(3000); out = await recGet(P);
  const nl = await P.page.evaluate(() => window.__M.HX.loops.size);
  ok(ph.includes('rec') && nl >= 1 && rms(out.L) > 1e-3, `3. Hauptknopf with the Puls: ${[...new Set(ph)].join(' → ')}; ${nl} Schleife, it sounds (RMS ${rms(out.L).toFixed(4)})`);
  // ---- 4. Klopf mit (the card's settings): eight taps on the pad ----
  await tapSel(P, '#btnPuls');
  await tapSel(P, '#tab-rec'); await P.page.waitForTimeout(500);
  await openFold(P, 'Einstellungen');
  await tapText(P, 'Klopf mit', '#hxSec');
  const k0 = await P.page.evaluate(() => window.__M.HX.klopf && window.__M.HX.klopf.clicks.slice());
  for (let i = 0; i < 9 && k0; i++) {
    await P.page.evaluate((t) => new Promise((r) => { const go = () => (window.__M.A.ctx.currentTime >= t ? r() : setTimeout(go, 4)); go(); }), k0[i + 2] + 0.03);
    const l = P.page.locator('.hx-kpad'); if (!(await l.count())) break; const r = await l.boundingBox(); if (!r) break; await touch(P, 'touchStart', r.x + r.width / 2, r.y + r.height / 2); await touch(P, 'touchEnd');
  }
  await P.page.waitForFunction(() => !window.__M.HX.klopf, null, { timeout: 6000 }).catch(() => {});
  await P.page.waitForTimeout(400);
  const lat = await P.page.evaluate(() => { const m = window.__M.HXK.klopf && window.__M.HXK.klopf.querySelector('.hx-ms'); return { k: !!window.__M.HX.klopf, txt: m ? m.textContent : '' }; });   // (the card's „Spielverzögerung“ row, as shown)
  ok(k0 && !lat.k && /\d+ ms/.test(lat.txt || ''), `4. Klopf mit: eight taps → „${lat.txt}“`);
  ok(!P.errors.length, `3–4. no error (${P.errors.slice(0, 2).join(' | ')})`);
  await P.ctx.close();

  // ---- 5. a length change while loops play ----
  P = await phone();
  await tapSel(P, '#btnPuls'); await P.page.waitForTimeout(500);   // (played to the Puls: a loop in Takten)
  await play(P, 8, 300); await tapSel(P, '#hxKorb'); await P.page.waitForTimeout(300); await tapSel(P, '#btnPuls'); await P.page.waitForTimeout(7000);
  await tapSel(P, '#tab-rec'); await P.page.waitForTimeout(600);
  await tapText(P, 'In Takten', '#sheet');
  const geo = () => P.page.evaluate(() => { const M = window.__M, L = [...M.HX.loops.values()][0]; return { tg: M.TG.hx, on: M.TG.hxOn, beats: L.d.beats, Lf: L.d.L, len: M.hxLen(L) }; });
  // („Länge +1“ first: a bar more reaches back into the Humus, which holds the last 64 s)
  for (const [lab, act] of [['„Länge +1“ (the loop)', async () => { const b0 = (await geo()).beats; for (let i = 0; i < 3 && (await geo()).beats === b0; i++) { await P.page.waitForTimeout(400); await tapText(P, 'Länge +1', '#hxSec'); await P.page.waitForTimeout(300); } }],
    ['the Takte slider (Aufnahme)', () => drag(P, '#p-rec-bars', 5)],
    ['Feste Länge (Hexenring)', async () => { await openFold(P, 'Einstellungen'); await P.page.getByRole('radio', { name: 'Fest', exact: true }).first().tap(); await drag(P, '#p-hx-festT', 5); }],
    ['Humus-Länge', () => drag(P, '#p-hx-humus', 4)]]) {
    await recOn(P); await P.page.waitForTimeout(6500);
    const g0 = await geo(), tA = await P.page.evaluate(() => window.__M.A.ctx.currentTime);
    await act();
    const tB = await P.page.evaluate(() => window.__M.A.ctx.currentTime);
    await P.page.waitForTimeout(9500);
    const g1 = await geo(); out = await recGet(P);
    const fA = Math.round(tA * out.sr) - out.f0, fB = Math.round(tB * out.sr) - out.f0;
    const pre = out.L.slice(Math.max(0, fA - 6 * out.sr), fA), post = out.L.slice(fB + 3 * out.sr, fB + 9 * out.sr), sh = shiftCents(logSpec(pre, out.sr), logSpec(post, out.sr));
    const recut = /Länge \+1/.test(lab);
    ok(sh === 0 && g1.tg === g0.tg && g1.on === g0.on && (recut ? g1.beats === g0.beats + 4 && g1.Lf === g0.Lf : g1.beats === g0.beats && g1.len === g0.len) && rms(post) > 0.3 * rms(pre),
      `5. ${lab} while the loop plays: what plays keeps pitch and tempo (shift ${sh} cents, ${g0.tg.toFixed(2)} → ${g1.tg.toFixed(2)} BPM, beats ${g0.beats} → ${g1.beats}${recut ? ': re-cut, not resampled' : ''}; RMS ${rms(pre).toFixed(3)} → ${rms(post).toFixed(3)})`);
  }
  // ---- 6. the chain copy on out 1 rests once all is baked, and wakes for „folgt“ – audible ----
  await P.page.waitForFunction(() => window.__M.HXF1.off, null, { timeout: 40000 }).catch(() => {});
  const r6 = await P.page.evaluate(() => ({ off: window.__M.HXF1.off, out: [...window.__M.HX.sch.values()].map((S) => S.out) }));
  ok(r6.off && r6.out.every((o) => !o), `6. every Schicht baked (out ${r6.out.join(',')}): the chain copy on out 1 rests`);
  await recOn(P);
  await tapText(P, 'folgt', '#hxSec');
  const w6 = await P.page.evaluate(() => window.__M.HXF1.off);
  await P.page.waitForTimeout(8000);
  out = await recGet(P);
  const gc6 = gapsClicks(out.L.slice(Math.round(0.5 * out.sr)));
  const o6 = await P.page.evaluate(() => [...window.__M.HX.sch.values()].map((S) => S.out));
  ok(!w6 && o6.some((o) => o) && rms(out.L.slice(-3 * out.sr)) > 1e-3 && gc6.gaps === 0, `6.   „folgt“: awake at once, the loop plays on through it (out ${o6.join(',')}, RMS ${rms(out.L.slice(-3 * out.sr)).toFixed(4)}, gaps ${gc6.gaps})`);
  ok(!P.errors.length, `5–6. no error (${P.errors.slice(0, 2).join(' | ')})`);
  await P.ctx.close();

  // ---- 7. continuity: two loops, the main thread throttled 6× ----
  P = await phone();
  await play(P, 8, 300, 0); await tapSel(P, '#hxKorb'); await P.page.waitForTimeout(2500);
  await play(P, 8, 300, 1); await tapSel(P, '#hxKorb'); await P.page.waitForTimeout(6000);
  await tapSel(P, '#tab-rec'); await P.page.waitForTimeout(500);
  await P.cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
  await recOn(P); await P.page.waitForTimeout(12000); out = await recGet(P);
  await P.cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  const gc7 = gapsClicks(out.L);
  ok(gc7.gaps === 0 && gc7.clicks <= 1 && rms(out.L) > 1e-3, `7. two loops, main thread 6× throttled, the Aufnahme panel open: ${(out.L.length / out.sr).toFixed(1)} s of output – gaps ${gc7.gaps}, clicks ${gc7.clicks}`);
  ok(!P.errors.length, `7. no error (${P.errors.slice(0, 2).join(' | ')})`);
  await P.ctx.close();

  }   // (parts 1–7)
  if (RUN('1-8') || RUN('8')) {
  // ---- 8. a slow audio core (root: the render threads in a cgroup with a share of a core) ----
  const CG = '/sys/fs/cgroup/cpu/hxslow';
  let cg = false;
  try { fs.mkdirSync(CG, { recursive: true }); fs.writeFileSync(CG + '/cpu.cfs_period_us', '4000'); fs.writeFileSync(CG + '/cpu.cfs_quota_us', '1200'); cg = true; } catch (e) {}
  if (!cg) console.log('INFO 8. no cgroup here (needs root and cgroup v1 cpu): the slow-core case is not run');
  else {
    P = await phone();
    await play(P, 8, 300, 0); await tapSel(P, '#hxKorb'); await P.page.waitForTimeout(2500);
    await play(P, 8, 300, 1); await tapSel(P, '#hxKorb'); await P.page.waitForTimeout(8000);
    const { execSync } = require('child_process');
    let moved = 0;
    for (const p of fs.readdirSync('/proc')) {
      if (!/^\d+$/.test(p)) continue;
      let ts = []; try { ts = fs.readdirSync('/proc/' + p + '/task'); } catch (e) { continue; }
      for (const t of ts) { let c = ''; try { c = fs.readFileSync('/proc/' + p + '/task/' + t + '/comm', 'utf8').trim(); } catch (e) {} if (/^(Realtime AudioW|AudioWorklet|AudioOutputDevi)/.test(c)) { try { execSync('chrt -o -p 0 ' + t); fs.writeFileSync(CG + '/tasks', t); moved++; } catch (e) {} } }
    }
    const fb = () => P.page.evaluate(() => { const s = window.__M.A.ctx.playoutStats; return s ? s.fallbackFramesEvents : null; });
    const f0 = await fb(); await P.page.waitForTimeout(20000); const f1 = await fb(); await P.page.waitForTimeout(15000); const f2 = await fb();
    const g = await P.page.evaluate(() => ({ tau: !!window.__M.HX.tauRest, f1: window.__M.HXF1.off, card: !!document.querySelector('.hx-ms'), lite: !!window.__M.A.lite, sc: window.__M.A.budgetScale || 1 }));
    // (report A, 23.10.2026: while loops sound the guard no longer lightens the live chains – A.lite – nor cuts the live
    // budget; before, that last step did most of the relief here: 1369 → 66 fallbacks; now the loops' own steps: about a
    // third fewer at this share of a core – what is left is for the owner to decide, SPEC §10.5 „As built (report A)“)
    if (f0 == null) console.log('INFO 8. this Chromium has no playoutStats: the slow-core case is not measured');
    else ok(moved >= 1 && g.tau && g.f1 && !g.lite && g.sc === 1 && (f2 - f1) / 15 < 0.8 * (f1 - f0) / 20, `8. a slow audio core (30 % of a core for ${moved} render threads), two loops: the guard let Taumeln rest on the phone (${g.tau}), the copy on out 1 rests (${g.f1}), the live chains and budget untouched (A.lite ${g.lite}, scale ${g.sc}); device fallbacks ${f1 - f0} in the first 20 s, ${f2 - f1} in the 15 s after`);
    await P.ctx.close();
  }
  }   // (part 8)

  if (RUN('9')) {
  // ---- 9a. offline: a halted or muted loop reads nothing – the same samples as reading it (po.noMute), its time gone ----
  P = await phone();
  const r9 = await P.page.evaluate(async () => {
    const SR = 44100, CH = 8192, pre = 4410, len = 88200, post = 44100, n = pre + len + post;
    const Sx = (s, i) => 0.2 * Math.sin(2 * Math.PI * (220 + 37 * s) * i / SR + s) + 0.05 * Math.sin(2 * Math.PI * (2637 + 91 * s) * i / SR);
    const D = (s) => { const d = new Float32Array(Math.ceil(n / 128) + 1); for (let k = 0; k < d.length; k++) d[k] = 6 * Math.sin(2 * Math.PI * 1.7 * (0.05 + 0.13 * s + k * 128 / SR)); return d; };
    const mkCh = (s) => { const a = []; for (let c = 0; c * CH < n; c++) { const L = new Float32Array(CH), R = new Float32Array(CH); for (let j = 0; j < CH; j++) { const i = c * CH + j; if (i < n) { const v = Sx(s, i) * (i > pre + len ? Math.exp(-(i - pre - len) / 8000) : 1); L[j] = v; R[j] = 0.8 * v; } } a.push([L, R]); } return a; };
    async function run(po, o) {
      const frames = o.dur * SR, ctx = await window.__ringCtx(frames, SR), beat = SR * 60 / 120, msgs = [{ seg: [[0, 0, beat]], reset: 1 }];
      for (let l = 0; l < o.nl; l++) {
        msgs.push({ loop: { id: l + 1, lock: 'takt', b0: 0, beats: 4, state: o.halt0 ? 'angehalten' : 'spielt', out: l % 2 } });
        for (let s = 0; s < 2; s++) msgs.push({ schicht: { loop: l + 1, id: 10 * l + s + 1, chunks: mkCh(2 * l + s), n, pre, len, join: s ? 'ola' : 'xf', X: 441, rho: 1, tau: true, dd: 0, ausklang: { off: pre + len, len: post }, dr: D(2 * l + s) } });
      }
      // (halted at a seam – its Ausklang free of the state –, re-entered from a start, muted mid-pass and back, Schlafen's tail)
      if (!o.halt0) for (let l = 0; l < o.nl; l++) {
        const sh = (l % 3) * 0.37 * SR;
        msgs.push({ state: { loop: l + 1, to: 'angehalten', f: Math.round(2 * len - 2000 + sh) } });
        msgs.push({ state: { loop: l + 1, to: 'spielt', f: Math.round(4 * len + sh), b0: 8 * Math.round((4 * len + sh) / beat / 8 + 1), X: 441 } });
        msgs.push({ state: { loop: l + 1, to: 'stumm', f: Math.round(7.3 * len + sh), X: 2205 } });
        msgs.push({ state: { loop: l + 1, to: 'spielt', f: Math.round(8.6 * len + sh), X: 2205 } });
        msgs.push({ state: { loop: l + 1, to: 'angehalten', f: Math.round(10.2 * len + sh), tail: 22050 } });
      }
      const pool = []; for (let i = 0; i < 12 + 40 * o.nl; i++) pool.push([new Float32Array(CH), new Float32Array(CH)]); msgs.push({ pool });
      const node = new AudioWorkletNode(ctx, 'myzel-ring', { numberOfInputs: 2, numberOfOutputs: 2, outputChannelCount: [2, 2], channelCount: 2, channelCountMode: 'explicit', processorOptions: Object.assign({ humusS: 1, msgs, rid: 90 + Math.floor(Math.random() * 1e6), drift: 1, ddPool: 1, ddBlk: 512 }, po) });
      const b = ctx.createBuffer(1, frames, SR), d = b.getChannelData(0); for (let i = 0; i < frames; i++) d[i] = 6 * Math.sin(2 * Math.PI * 2.5 * (i / SR) + 1.1);
      const src = ctx.createBufferSource(); src.buffer = b; src.connect(node, 0, 1); src.start();
      const m = ctx.createChannelMerger(2); node.connect(m, 0, 0); node.connect(m, 1, 1); m.connect(ctx.destination);   // (out 0 left, out 1 right: both heard)
      const t0 = performance.now(), buf = await ctx.startRendering();
      return { L: buf.getChannelData(0).slice(), R: buf.getChannelData(1).slice(), ms: performance.now() - t0 };
    }
    const out = {}, A = await run({ noMute: 1 }, { dur: 26, nl: 4 }), B = await run({}, { dur: 26, nl: 4 });
    let m = 0, pk = 0; for (let i = 0; i < A.L.length; i++) { m = Math.max(m, Math.abs(A.L[i] - B.L[i]), Math.abs(A.R[i] - B.R[i])); pk = Math.max(pk, Math.abs(A.L[i]), Math.abs(A.R[i])); }
    out.d = m; out.pk = pk;
    const T = { read: [], skip: [], none: [] }, med = (a) => a.slice().sort((x, y) => x - y)[1];
    for (let k = 0; k < 3; k++) { T.read.push((await run({ noMute: 1 }, { dur: 20, nl: 8, halt0: 1 })).ms); T.skip.push((await run({}, { dur: 20, nl: 8, halt0: 1 })).ms); T.none.push((await run({}, { dur: 20, nl: 0 })).ms); }
    out.ms = { read: med(T.read), skip: med(T.skip), none: med(T.none) };
    return out;
  });
  ok(r9.d === 0 && r9.pk > 0.05, `9a. offline, 4 loops on both outputs halted at a seam and inside a pass, re-entered, muted and back, Schlafen's tail: the same samples whether a silent loop is read or not (max |d| ${r9.d}, peak ${r9.pk.toFixed(2)})`);
  ok(r9.ms.skip - r9.ms.none < 0.3 * (r9.ms.read - r9.ms.none), `9a.   8 halted loops (2 Schichten each, Taumeln on): the processor's time for 20 s ${r9.ms.read.toFixed(0)} → ${r9.ms.skip.toFixed(0)} ms (without loops ${r9.ms.none.toFixed(0)})`);
  await P.ctx.close();

  // ---- 9b. live: halted loops cost nothing in the budget, the copy on out 1 and Ruhe rest – and wake before one plays ----
  P = await phone();
  const k9 = await mkLoops(P, 3, 0, { bars: 1 });
  await P.page.evaluate((keys) => { const M = window.__M; M.hxFolgt(M.hxByKey(keys[0]), true); }, k9);
  await P.page.waitForTimeout(6000);
  const b9 = await P.page.evaluate((keys) => { const M = window.__M; const play = M.hxLoad(); for (const k of keys) { const L = M.hxByKey(k); M.hxState(L.id, 'angehalten', null); } return { play, out1: [...M.HX.sch.values()].some((S) => S.out), f1: M.HXF1.off }; }, k9);
  await P.page.waitForFunction(() => window.__M.HXF1.off && window.__M.IDLE.on, null, { timeout: 45000 }).catch(() => {});
  const h9 = await P.page.evaluate((keys) => { const M = window.__M; return { load: M.hxLoad(), cap: M.HX_COST.capture, each: keys.map((k) => M.hxCostOf(M.hxByKey(k))), f1: M.HXF1.off, idle: M.IDLE.on, late: M.IDLE.late, card: (document.getElementById('hxCost') || {}).textContent || '' }; }, k9);
  ok(b9.play > h9.cap + 1 && Math.abs(h9.load - h9.cap) < 1e-9 && h9.each.every((c) => c === 0), `9b. three loops playing count ${b9.play.toFixed(2)} units; halted, nothing but the Humus (${h9.load.toFixed(2)} = capture ${h9.cap}; each loop ${h9.each.join(', ')})`);
  ok(b9.out1 && h9.f1 && h9.idle, `9b.   a halted loop on out 1 („folgt“): the chain's copy rests (${h9.f1}), and Ruhe sleeps with halted loops (${h9.idle})`);
  await recOn(P);
  const w9 = await P.page.evaluate((keys) => { const M = window.__M, L = M.hxByKey(keys[0]); M.hxState(L.id, 'spielt', null); return { f1: M.HXF1.off, idle: M.IDLE.on }; }, k9);
  await P.page.waitForTimeout(5000);
  out = await recGet(P);
  const a9 = await P.page.evaluate(() => ({ late: window.__M.IDLE.late, f1: window.__M.HXF1.off }));
  ok(!w9.f1 && !w9.idle && a9.late === h9.late && rms(out.L.slice(-3 * out.sr)) > 1e-3, `9b.   played again: both awake before it sounds (copy resting ${w9.f1}, Ruhe ${w9.idle}; late wakes ${h9.late} → ${a9.late}), it sounds through out 1 (RMS ${rms(out.L.slice(-3 * out.sr)).toFixed(4)})`);
  ok(/^Rechenzeit: Schleifen und Humus \d+,\d von \d+ Einheiten/.test(h9.card), `9b.   the card says what the loops take: „${h9.card}“`);
  ok(!P.errors.length, `9a–b. no error (${P.errors.slice(0, 2).join(' | ')})`);
  await P.ctx.close();

  // ---- 9c. a slow core shared with the Werk-Rahmen's renders (root): 8 loops, 4 Lebendig – the guard's order ----
  const CG9 = '/sys/fs/cgroup/cpu/hxslow9';
  let cg9 = false;
  try { fs.mkdirSync(CG9, { recursive: true }); fs.writeFileSync(CG9 + '/cpu.cfs_period_us', '4000'); fs.writeFileSync(CG9 + '/cpu.cfs_quota_us', String(40 * (+process.env.SLOW9 || 50))); cg9 = true; } catch (e) {}
  if (!cg9) console.log('INFO 9c. no cgroup here (needs root and cgroup v1 cpu): the slow-core case is not run');
  else {
    P = await phone({ noguard: true });
    const keys = await mkLoops(P, 8, 4);
    await P.page.waitForTimeout(15000);
    const { execSync } = require('child_process');
    const move = (re) => { let n = 0; for (const p of fs.readdirSync('/proc')) { if (!/^\d+$/.test(p)) continue; let ts = []; try { ts = fs.readdirSync('/proc/' + p + '/task'); } catch (e) { continue; } for (const t of ts) { let c = ''; try { c = fs.readFileSync('/proc/' + p + '/task/' + t + '/comm', 'utf8').trim(); } catch (e) {} if (re.test(c)) { try { if (/Realtime|Output/.test(c)) execSync('chrt -o -p 0 ' + t + ' 2>/dev/null'); fs.writeFileSync(CG9 + '/tasks', t); n++; } catch (e) {} } } } return n; };
    const moved = move(/^(Realtime AudioW|AudioOutputDevi)/), mv = setInterval(() => move(/^Offline AudioW/), 150);   // (the renders' threads compete for the same core, as on a phone's)
    const fb = () => P.page.evaluate(() => { const s = window.__M.A.ctx.playoutStats; return s ? s.fallbackFramesEvents : null; });
    const s0 = await P.page.evaluate(() => { const M = window.__M; return { vb: M.vbudget(), lite: !!M.A.lite, sc: M.A.budgetScale || 1, wlive: [...M.HX.sch.values()].filter((S) => S.wLive).length, tau: !!M.HX.tauRest }; });
    await P.page.waitForTimeout(3000);
    const u0 = await fb();
    await P.page.evaluate(() => { window.__guardOk = true; window.__gT = performance.now(); window.__M.watchUnderruns(); });
    const us = [u0], held = [];
    for (let i = 0; i < 16; i++) {
      await P.page.waitForTimeout(5000); us.push(await fb());
      held.push(await P.page.evaluate((k) => { const M = window.__M; return M.hxWWord(M.hxByKey(k)); }, keys[0]));
      if (i >= 5 && us[i + 1] - us[i] === 0 && us[i] - us[i - 1] === 0) break;
    }
    clearInterval(mv);
    const g = await P.page.evaluate(() => { const M = window.__M; return { log: (M.HX.gLog || []).filter((e) => e.t >= window.__gT).map((e) => e.step), vb: M.vbudget(), lite: !!M.A.lite, sc: M.A.budgetScale || 1, tau: !!M.HX.tauRest, spielt: M.hxLoopsLive().filter((L) => L.state === 'spielt').length }; });
    if (u0 == null) console.log('INFO 9c. this Chromium has no playoutStats: the slow-core case is not measured');
    else {
      const d = us.slice(1).map((x, i) => x - us[i]), first = d[0] + d[1], last = d[d.length - 1] + d[d.length - 2];
      const iL = g.log.indexOf('lebendig'), iT = g.log.indexOf('taumeln');
      ok(moved >= 1 && s0.wlive === 4 && !s0.tau && iL === 0 && (iT < 0 || iT > iL) && !g.log.includes('lite'), `9c. a slow core (${process.env.SLOW9 || 50} % for ${moved} render threads and the Werk-Rahmen's), 8 loops of which ${s0.wlive} living: the guard's steps ${[...new Set(g.log)].join(' → ')} – Lebendig first, Taumeln only after it (if the stutter lasts), never the live budget`);
      ok(g.vb === s0.vb && !g.lite && g.sc === 1 && g.spielt === 8, `9c.   the live budget ${s0.vb} → ${g.vb}, A.lite ${g.lite}, scale ${g.sc}; all ${g.spielt} loops still play`);
      ok(held.some((w) => /letzten Durchgang/.test(w)), `9c.   a held living loop says „${held.find((w) => /letzten Durchgang/.test(w)) || held[0]}“`);
      ok(first >= 50 && last <= Math.max(10, 0.1 * first), `9c.   the underruns fall: ${d.join(', ')} per 5 s (the first 10 s ${first}, the last 10 s ${last})`);
    }
    ok(!P.errors.length, `9c. no error (${P.errors.slice(0, 2).join(' | ')})`);
    await P.ctx.close();
  }
  }   // (part 9)
  await browser.close();
  process.exit(H.summary() ? 1 : 0);
})().catch(async (e) => { console.log('FAIL exception ' + (e && e.stack || e)); try { await browser.close(); } catch (x) {} process.exit(1); });
