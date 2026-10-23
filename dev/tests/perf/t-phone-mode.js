// The Handy-Modus and „Leistung messen“ (the owner's phone report, 23.10.2026): a phone-only lightening of the drawing,
// never of the sound, and the on-device measurement the owner sends back.
//   1. where it engages by itself: a phone (412 × 915, touch, DPR 2.75) yes – the field at 1.5 × its CSS pixels; an iPad
//      (1024 × 1366, touch) and a computer never
//   2. the switch in „Gerät“, as the phone does it (taps): „Handy-Modus: an (automatisch)“, off by hand (the field at 2 ×
//      again), „Wieder automatisch“, kept over a reload
//   3. „Leistung messen“ through the UI, the main thread 4× slower: tapped, the panel closed, 20 s of touches on the
//      field – the summary and the report (every topic, the touches counted, no device name), „Kopieren“ copies it; under
//      that load the phone draws about 30 frames a second (PH.load), the iPad and the computer never switch; the load's
//      30 frames end when the load does
//   4. the sound bit-identical: offline renders (one oscillator per note through the echo, the hall and the master – the
//      exact case of t-idle-parity) with the Handy-Modus on and under load, and off: every sample equal; the parameters,
//      the budget and the quality the same
//   5. the audio side in the report (after the owner's report A, 23.10.2026): with loops – one playing, one halted, one
//      Lebendig – each loop's share of the budget (the halted one 0) and their sum as the budget counts it, the
//      Werk-Rahmen's renders (begun, done, their time against real time), the guard's steps with their second, the
//      latency asked for against what the context reports; the live line in „Leistung“ and the card's line say the same
//   node t-phone-mode.js        env SLOT (default perfcur-inst: sh ../v2/mk.sh /home/user/4claude/myzel perfcur)
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const L = require('./lib.js');
const SLOT = process.env.SLOT || 'perfcur-inst', URL = L.HOST + SLOT + '/index.html';
let fails = 0, passes = 0;
const ok = (c, m) => { if (c) passes++; else fails++; console.log((c ? 'PASS ' : 'FAIL ') + m); };
const PHONE = Object.assign({}, L.VPS.a, { deviceScaleFactor: 2.75 });
const IPAD = { viewport: { width: 1024, height: 1366 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2, userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' };
const DESK = L.VPS.d;
async function open(b, vp, o = {}) {
  const ctx = o.ctx || (await b.newContext(vp));
  if (o.hz120) await ctx.addInitScript(L.RAF120);
  const page = await ctx.newPage(), errors = [];
  page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(URL); await page.waitForFunction(() => !!window.__M); await page.waitForTimeout(500);
  if (o.start !== false) { if (vp.hasTouch) await page.tap('#btnStart'); else await page.click('#btnStart'); await page.waitForTimeout(1500); }
  return { ctx, page, errors };
}
const st = (pg) => pg.evaluate(() => { const M = window.__M; return { on: M.PH.on, set: M.PH.set, load: M.PH.load, dpr: M.VIS.dpr, w: M.VIS.w, cw: M.cvFx.width, mob: M.MOBILE, tab: M.HX_TABLET }; });
const note = (pg) => pg.evaluate(() => { const U = window.__M.LM.ui; return U ? { t: U.phNote.textContent, auto: !U.auto.hidden, sw: U.sw.getAttribute('aria-checked') } : null; });
async function tap(pg, sel) { const l = pg.locator(sel).first(); await l.scrollIntoViewIfNeeded(); await l.tap(); await pg.waitForTimeout(250); }
async function touches(pg, secs) {
  const box = await pg.evaluate(() => { const r = document.getElementById('cvFx').getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; });
  const c = await pg.context().newCDPSession(pg), t0 = Date.now();
  for (let i = 0; Date.now() - t0 < secs * 1000; i++) {
    const x = box[0] + box[2] * (0.15 + 0.7 * ((i * 0.37) % 1)), y = box[1] + box[3] * (0.3 + 0.4 * ((i * 0.61) % 1));
    await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] }); await pg.waitForTimeout(450);
    await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await pg.waitForTimeout(250);
  }
  await c.detach();
}
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--enable-experimental-web-platform-features'] });
  // ---- 1. where it engages ----
  let P = await open(b, PHONE);
  let s = await st(P.page);
  ok(s.mob && !s.tab && s.on && s.set === 'auto' && s.dpr === 1.5 && s.cw === Math.round(s.w * 1.5), `1. a phone: the Handy-Modus on by itself (${s.set}), the field at ${s.dpr} × (${s.cw} px for ${s.w} CSS px; device 2.75)`);
  const lat = await P.page.evaluate(() => ({ p: window.__M.P['dev.lat'], m: window.__M.A.latMode }));
  ok(lat.p === 'safe' && lat.m === 'safe', `1.   Android's latency stays „Sicher“ (balanced) by default: ${lat.p} / the context ${lat.m}`);
  for (const [name, vp] of [['an iPad', IPAD], ['a computer', DESK]]) {
    const Q = await open(b, vp); const q = await st(Q.page);
    ok(!q.on && !q.load && q.dpr === Math.min(2, vp.deviceScaleFactor || 1), `1. ${name}: never (mobile ${q.mob}, tablet ${q.tab}; the field at ${q.dpr} ×)`);
    await Q.ctx.close();
  }
  // ---- 2. the switch in „Gerät“ ----
  await tap(P.page, '#tab-dev'); await P.page.waitForTimeout(400);
  let n = await note(P.page);
  ok(n && /^Handy-Modus: an \(automatisch\)/.test(n.t) && n.sw === 'true' && !n.auto, `2. Gerät shows „${n && n.t.slice(0, 60)}…“`);
  await tap(P.page, '#phSw');
  s = await st(P.page); n = await note(P.page);
  ok(!s.on && s.set === 'aus' && s.dpr === 2 && s.cw === Math.round(s.w * 2) && /^Handy-Modus: aus \(von dir eingestellt\)/.test(n.t) && n.auto, `2.   off by hand: the field at ${s.dpr} × again (${s.cw} px), „${n.t.slice(0, 44)}…“, „Wieder automatisch“ shown`);
  await P.page.reload(); await P.page.waitForFunction(() => !!window.__M); await P.page.waitForTimeout(400);
  s = await st(P.page);
  ok(!s.on && s.set === 'aus', `2.   kept over a reload (${s.set})`);
  await P.page.tap('#btnStart'); await P.page.waitForTimeout(1200);
  await tap(P.page, '#tab-dev'); await P.page.waitForTimeout(300);
  await tap(P.page, '#phAuto');
  s = await st(P.page); n = await note(P.page);
  const stored = await P.page.evaluate(() => localStorage.getItem('myzel.handy'));
  ok(s.on && s.set === 'auto' && s.dpr === 1.5 && !n.auto && !stored, `2.   „Wieder automatisch“: on again (${s.set}, stored „${stored}“)`);
  await P.ctx.close();

  // ---- 3. „Leistung messen“ through the UI, under load ----
  const ctx3 = await b.newContext(PHONE); await ctx3.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: L.HOST.replace(/\/$/, '') });
  P = await open(b, PHONE, { ctx: ctx3, hz120: true });
  await tap(P.page, '#tab-dev'); await P.page.waitForTimeout(300);
  const cdp = await P.ctx.newCDPSession(P.page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await tap(P.page, '#lmGo');
  const on = await P.page.evaluate(() => window.__M.LM.on);
  await tap(P.page, '#tab-dev');   // (closed: played as always)
  await touches(P.page, 21.5);
  await P.page.waitForFunction(() => !window.__M.LM.on && window.__M.LM.res, null, { timeout: 15000 }).catch(() => {});
  const ld = await P.page.evaluate(() => ({ load: window.__M.PH.load, why: window.__M.PH.why }));
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  const toastTxt = await P.page.evaluate(() => document.getElementById('toastMsg').textContent);
  await tap(P.page, '#tab-dev'); await P.page.waitForTimeout(300);
  const R = await P.page.evaluate(() => { const M = window.__M, U = M.LM.ui; return { res: M.LM.res, txt: U.txt.value, sum: [...U.sum.querySelectorAll('li')].map((x) => x.textContent), sumHidden: U.sum.hidden }; });
  ok(on && /Leistung gemessen/.test(toastTxt), `3. „Leistung messen“ tapped (running ${on}), the panel closed, 20 s of touches – the toast „${toastTxt.slice(0, 50)}…“`);
  const latL = R.sum.find((x) => /^Latenz: /.test(x)) || '';
  ok(!R.sumHidden && R.sum.length >= 6 && /^Bild: /.test(R.sum[0]) && /^Vom Antippen bis zum Ton: etwa \d+ ms/.test(R.sum[1]) && /^Klang: /.test(R.sum[2]) && /^Ergebnis: /.test(R.sum[3]) && /^Latenz: eingestellt „Sicher“ – das Gerät meldet \d+(,\d)? ms Puffer und \d+(,\d)? ms Ausgabe\.$/.test(latL) && /Handy-Modus war an/.test(R.sum[R.sum.length - 1]), `3.   the summary: ${R.sum.join(' | ')}`);
  const topics = ['Myzel Leistung', '\ndev ', '\nhandy ', '\naudio ', '\nunder ', '\nraf hz=', '\nmain ms/s ', '\ntick ', '\ntouch n=', '\nvoices ', ' hx loops=', '\nloops loops=', '\nwerk st=', '\nguard ', '\nlatency set=safe hint=balanced base='];
  const miss = topics.filter((t) => !R.txt.includes(t));
  ok(!miss.length && R.res.touch && R.res.touch.n >= 10 && R.res.parts.feld > 0 && R.res.parts.tick > 0 && R.res.hz >= 100 && R.res.audio.sr > 0 && R.res.voices.max >= 1, `3.   the report: every topic (${miss.length ? 'missing ' + miss.join(',') : 'all'}), ${R.res.touch && R.res.touch.n} touches (touch → sound ${R.res.touch && R.res.touch.ton} ms), display ${R.res.hz} Hz, ${R.txt.split('\n').length} lines, ${R.txt.length} characters`);
  ok(!/Pixel|Build\//.test(R.txt) && /os=Android 14 br=Chrome\/\d+/.test(R.txt), `3.   no device name in it (${(R.txt.match(/os=[^\n]*? br=\S+/) || [''])[0]})`);
  ok(ld.load && R.res.ph.load >= 50 && R.res.draw.fps <= 31.5, `3.   under that load the phone drew ${R.res.draw.fps} frames a second (PH.load ${ld.load} – „${ld.why}“ – ${R.res.ph.load} % of the time)`);
  await tap(P.page, '#lmCopy'); await P.page.waitForTimeout(300);
  const clip = await P.page.evaluate(() => navigator.clipboard.readText().catch((e) => 'ERR ' + e));
  ok(clip === R.txt, `3.   „Kopieren“: the clipboard holds the report (${clip.length} characters)`);
  await tap(P.page, '#tab-dev');
  // (the release: the frames' and the long tasks' signals stop with the load; this headless machine's audio sink drops
  // a block now and then by itself, so its underrun count is held still for the step that ends the hold)
  await P.page.waitForTimeout(5000);
  const rel = await P.page.evaluate(() => { const M = window.__M, PH = M.PH, s = { hb: PH.hb.length, lt: PH.lt.length, was: PH.load }; PH.until = 0; PH.u = M.A.underruns || 0; PH.uh.length = 0; M.phTick(); s.load = PH.load; return s; });
  ok(rel.was && rel.hb < 8 && rel.lt < 2 && !rel.load, `3.   the load gone (frames late in the last 3 s: ${rel.hb}, long tasks ${rel.lt}), the hold over: the 30 frames end (PH.load ${rel.load})`);
  ok(!P.errors.length, `1–3. no page error on the phone (${P.errors.slice(0, 2).join(' | ')})`);
  await P.ctx.close();
  for (const [name, vp] of [['an iPad', IPAD], ['a computer', DESK]]) {
    const Q = await open(b, vp, { hz120: true }); const c = await Q.ctx.newCDPSession(Q.page);
    await c.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await Q.page.evaluate(() => window.__M.lmStart()); await Q.page.waitForTimeout(8000);
    const q = await Q.page.evaluate(() => ({ on: window.__M.PH.on, load: window.__M.PH.load, dpr: window.__M.VIS.dpr }));
    await c.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    ok(!q.on && !q.load, `3. ${name} under the same load: never (on ${q.on}, load ${q.load}, the field at ${q.dpr} ×)`);
    await Q.ctx.close();
  }

  // ---- 5. the audio side in the report: per loop, the Werk-Rahmen, the guard's steps, the latency ----
  P = await open(b, PHONE);
  const r5 = await P.page.evaluate(async () => {
    const M = window.__M, A = M.A, sl = (ms) => new Promise((r) => setTimeout(r, ms)), keys = [];
    M.setParam('hx.laenge', 'fest'); M.setParam('hx.festT', 1); M.setParam('seq.bpm', 120); for (const i of [0, 1, 2, 3]) M.setParam('l' + i + '.on', false); M.seqStart(); await sl(600);
    for (let j = 0; j < 3; j++) {
      const beat = 60 / M.tgBpm(A.ctx.currentTime), t0 = M.tgTime(Math.ceil(M.tgBeat(A.ctx.currentTime + 0.3) / 4) * 4);
      for (let i = 0; i < 4; i++) { const t = t0 + i * beat, v = M.playNote('neb', t, M.N.notes[(2 * i + j) % M.N.notes.length].f, 0.5, 0.7, { bus: M.stripIn('fin') }); if (v && v.release) setTimeout(() => v.release(), (t + 0.3 - A.ctx.currentTime) * 1000); }
      while (A.ctx.currentTime < t0 + 4 * beat + 0.05) await sl(30);
      const L = M.hxHarvest(M.hxKorbPlan(M.hxHeard()), {}); if (L) keys.push(L.key); await sl(300);
    }
    M.seqStop();
    for (let i = 0; i < 100; i++) { let all = true; for (const k of keys) { const L = M.hxByKey(k); for (const id of L.sch) { const S = M.HX.sch.get(id); if (!(S && S.wn && S.aud)) { all = false; M.hxWNotesAll(L); } } } if (all) break; await sl(100); }
    M.hxState(M.hxByKey(keys[1]).id, 'angehalten', null);
    M.hxWSet(M.hxByKey(keys[2]), 'eig', 'lebendig');
    await sl(6000);
    M.lmStart(); await sl(1500); M.hxGuardLog('taumeln'); await sl(6000);
    const each = keys.map((k) => +M.hxCostOf(M.hxByKey(k)).toFixed(2));
    M.lmStop();
    M.openPanel('dev'); await sl(900);
    return { txt: M.LM.txt, res: M.LM.res, sum: M.LM.sum, each, slots: keys.map((k) => M.hxByKey(k).slot), live: (document.getElementById('lmHx') || {}).textContent || '', cost: (document.getElementById('hxCost') || {}).textContent || '' };
  });
  const ln = (k) => (r5.txt.split('\n').find((x) => x.startsWith(k + ' ')) || '');
  const lp = ln('loops'), wk = ln('werk'), gd = ln('guard'), la = ln('latency');
  const s2 = new RegExp('S' + (r5.slots[1] + 1) + '=0\\(halt[,a-z-]*\\)'), s1 = new RegExp('S' + (r5.slots[0] + 1) + '=[0-9.]+\\(spielt[,a-z-]*\\)');   // (the guard may have stepped on this machine: tau-ruht)
  ok(s1.test(lp) && s2.test(lp) && r5.each[1] === 0 && r5.each[0] > 0.3 && Math.abs(r5.res.lp.sum.hx - r5.res.lp.sum.loops - r5.res.lp.sum.rest) < 0.02, `5. per loop: „${lp}“ (the halted one 0; now ${r5.each.join(', ')})`);
  ok(/^werk st=ok pool=\d+ n=\d+ perS=[\d.]+ done=\d+ stop=\d+ ms=\d+ wait=\d+ xRT=[\d.]+ q=\d+ jobs=\d+$/.test(wk) && r5.res.werk.n >= 1 && r5.res.werk.done >= 1 && r5.res.werk.xRT > 0, `5.   the Werk-Rahmen: „${wk}“`);
  ok(/^guard (\S+ )*taumeln@[12]( \S+)* · pause=\d+ hold=(true|false) max=\S+ tau=(true|false) lite=(true|false) scale=[\d.]+$/.test(gd), `5.   the guard's steps: „${gd}“`);
  ok(/^latency set=safe hint=balanced base=[\d.]+ out=[\d.]+ outMin=[\d.]+ outMax=[\d.]+ buf=\d+ avg=\S+$/.test(la), `5.   the latency: „${la}“`);
  ok(/^Schleifen: 3, davon 2 spielend – sie belegen im Mittel \d+(,\d+)? von \d+ Einheiten/.test(r5.sum.find((x) => /^Schleifen:/.test(x)) || '') && /^Lebendige Schleifen: \d+ Durchgänge neu gerechnet/.test(r5.sum.find((x) => /^Lebendige/.test(x)) || '') && r5.sum.some((x) => x === 'Myzel hat entlastet: Taumeln ruht.'), `5.   the summary: ${r5.sum.slice(4, -1).join(' | ')}`);
  ok(/^Schleifen: 3, davon 2 spielend – sie belegen \d+,\d von \d+ Einheiten/.test(r5.live) && /^Rechenzeit: Schleifen und Humus \d+,\d von \d+ Einheiten/.test(r5.cost), `5.   „Leistung“ live: „${r5.live}“ · the card: „${r5.cost}“`);
  ok(!P.errors.length, `5. no page error (${P.errors.slice(0, 2).join(' | ')})`);
  await P.ctx.close();

  // ---- 4. the sound bit-identical ----
  // (Chromium's offline render is bit-reproducible only where at most two signals meet – t-idle-parity: so the echo and the
  // hall each on their own)
  const EXACT = { 'dev.q': '1', 'dev.lat': 'std', 'dly.wow': 0, 'dly.pp': 0, 'v.layer': 'off', 'l0.on': false, 'l1.on': false, 'l2.on': false, 'l3.on': false, 'bor.on': false };
  const CASES = [['the echo at 60 %, no hall', { 'rev.mix': 0, 'xdly.rev': 0, 'dly.fb': 0.6 }], ['the hall, no echo', { 'dly.mix': 0 }]];
  async function render(mode, params) {
    const ctx = await b.newContext(PHONE);
    await ctx.addInitScript(() => {   // (no frames; Math.random seeded, in the page and in its workers – the hall's response is made in one)
      const orig = URL.createObjectURL.bind(URL);
      URL.createObjectURL = (b) => (b && /javascript/.test(b.type || '') ? orig(new Blob(['{let x=777;Math.random=()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return((x>>>0)%1e9)/1e9;};}\n', b], { type: b.type })) : orig(b));
    });
    await ctx.addInitScript(() => { window.requestAnimationFrame = () => 0; let x = 12345; Math.random = () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 1e9) / 1e9; }; });
    const page = await ctx.newPage(); await page.goto(URL); await page.waitForFunction(() => !!window.__M);
    const r = await page.evaluate(async ([mode, params]) => {
      const M = window.__M, A = M.A, sr = 44100, dur = 14;
      M.phSet(mode); clearInterval(M.PH.timer); if (mode === 'an') M.PH.load = true;   // (on, and under load – held there: everything it changes)
      let x = 4242; Math.random = () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 1e9) / 1e9; };
      window.__mkCtx = () => new OfflineAudioContext(2, Math.ceil(dur * sr), sr);
      for (const id in M.PD) if (!M.PD[id].dev) M.P[id] = M.PD[id].d;
      Object.assign(M.P, params); M.applyQuality(); M.buildNotes(); M.initAudio();
      for (let i = 0; i < 500 && !A.revActive; i++) await new Promise((res) => setTimeout(res, 10));
      const ctx = A.ctx;
      for (let j = 0, t = 0.1; t < 8; t += 0.45, j++) {
        const f = 110 * Math.pow(2, (j * 5 % 12) / 12);
        ctx.suspend(Math.round(t * sr / 128) * 128 / sr).then(() => {
          const t0 = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sawtooth'; o.frequency.value = f; g.gain.value = 0;
          g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.3, t0 + 0.01); g.gain.setValueAtTime(0.3, t0 + 0.3); g.gain.linearRampToValueAtTime(0, t0 + 0.36);
          o.connect(g).connect(M.stripIn('fin')); o.start(t0); o.stop(t0 + 0.4); ctx.resume();
        });
      }
      const buf = await ctx.startRendering();
      let e = 0; const L0 = buf.getChannelData(0), R0 = buf.getChannelData(1); for (let i = 0; i < L0.length; i++) e += L0[i] * L0[i];
      return { L: Array.from(L0), R: Array.from(R0), e, P: JSON.stringify(M.P), vb: M.vbudget(), q: JSON.stringify(M.qcur()), ph: M.PH.on, load: M.PH.load };
    }, [mode, params]);
    await ctx.close();
    return r;
  }
  for (const [name, extra] of CASES) {
    const prm = Object.assign({}, EXACT, extra), a = await render('an', prm), z = await render('aus', prm);
    let md = 0; for (const c of ['L', 'R']) for (let i = 0; i < a[c].length; i++) md = Math.max(md, Math.abs(a[c][i] - z[c][i]));
    ok(a.ph && a.load && !z.ph && a.e > 1 && md === 0, `4. the sound, ${name}: offline renders (14 s, one oscillator per note through the chain, the strips and the master) with the Handy-Modus on and under load, and off – every sample identical (max |d| ${md}, energy ${a.e.toFixed(1)})`);
    ok(a.P === z.P && a.vb === z.vb && a.q === z.q, `4.   the parameters, the voice budget (${a.vb}) and the quality the same either way`);
  }
  await b.close();
  console.log('== ' + passes + ' passed, ' + fails + ' failed');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.log('FAIL exception ' + (e && e.stack || e)); process.exit(1); });
