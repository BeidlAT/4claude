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
//      on the phone and the stutter ends (playoutStats, Chromium's experimental figures)
//   node t-hx-phone.js        (slot hx: sh ../v2/mk.sh /home/user/4claude/myzel hx – run-all.sh builds it)
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

(async () => {
  // ---- 1. Aufnahme in Takten (fresh), the Puls off: it begins at once, its time runs, the take is exact ----
  let P = await phone();
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
  await recOn(P); await P.page.waitForTimeout(3000); let out = await recGet(P);
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
    const g = await P.page.evaluate(() => ({ tau: !!window.__M.HX.tauRest, f1: window.__M.HXF1.off, card: !!document.querySelector('.hx-ms') }));
    if (f0 == null) console.log('INFO 8. this Chromium has no playoutStats: the slow-core case is not measured');
    else ok(moved >= 1 && g.tau && f2 - f1 <= 15, `8. a slow audio core (30 % of a core for ${moved} render threads), two loops: the guard let Taumeln rest on the phone (${g.tau}), the copy on out 1 rests (${g.f1}); device fallbacks ${f1 - f0} in the first 20 s, ${f2 - f1} in the 15 s after`);
    await P.ctx.close();
  }
  await browser.close();
  process.exit(H.summary() ? 1 : 0);
})().catch(async (e) => { console.log('FAIL exception ' + (e && e.stack || e)); try { await browser.close(); } catch (x) {} process.exit(1); });
