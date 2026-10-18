// The new engines in a live (real-time) session, the way a player meets them (klang SPEC §7.2 t-eng-live): chosen by
// their chip, a finger held and moved on the field (setF/setY), let go, a MIDI keyboard, a Puls lane, the second
// layer, level 3, a shake under Gestik, the mixer's source text – and without AudioWorklet: the stand-ins, the note in
// the engine section, the toast. Also: the iframe hint.   node t-eng-live.js   (slot kn-inst, built by run-all.sh)
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const L = require('./dsplib');
const URL_ = process.env.KN_URL || 'http://127.0.0.1:8790/kn-inst/index.html';
async function open(browser, o = {}) {
  const ctx = await browser.newContext(o.mobile === false ? { viewport: { width: 1280, height: 800 } } : { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript((noWorklet) => {
    if (noWorklet) { delete window.AudioWorkletNode; Object.defineProperty(BaseAudioContext.prototype, 'audioWorklet', { get: () => undefined }); }
    const mk = (id, name) => ({ id, name, state: 'connected', onmidimessage: null });
    const inputs = new Map([['k1', mk('k1', 'Testkeyboard')]]);
    window.__midi = { inputs, access: { inputs, outputs: new Map(), onstatechange: null } };
    navigator.requestMIDIAccess = () => Promise.resolve(window.__midi.access);
    window.__send = (bytes, id = 'k1') => { const i = inputs.get(id); i.onmidimessage && i.onmidimessage({ data: new Uint8Array(bytes), timeStamp: performance.now() }); };
    window.__sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  }, !!o.noWorklet);
  await page.goto(o.url || URL_); await page.waitForFunction(() => !!window.__M);
  return { page, errors, ctx };
}
const settle = (page, ms) => page.evaluate((ms) => window.__sleep(ms), ms);
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const { page, errors, ctx } = await open(browser, { mobile: false });   // desktop: the keyboard is asked for at start
  await page.click('#btnStart'); await settle(page, 700);
  const ring = (key) => (key === 'hlm' ? 500 : key === 'rnk' ? 1500 : 2600);   // (Harz's glass rings on after the bow lifts)
  for (const key of ['hlm', 'rnk', 'hrz']) {
    // the chip in the Klang panel (the library UI comes later)
    await page.evaluate(() => window.__M.openPanel('klang'));
    // (stage 1b: the chips became the row + library – chosen by its tile)
    await page.click('#p-v-eng .kq-name'); await page.click(`.kq-fams .chip[data-fam="alle"]`); await page.click(`.kq-tile[data-k="${key}"] .kq-pick`); await page.click('.kq-done');
    const st = await page.evaluate(async (key) => { const M = window.__M; for (let i = 0; i < 100 && M.DSP.state !== 'ok'; i++) await window.__sleep(20); return { st: M.DSP.state, eng: M.P['v.eng'], sec: !M.engSecs[key].hidden, chip: document.querySelector('#engName').textContent }; }, key);
    L.ok(st.st === 'ok' && st.eng === key && st.sec, `${key}: its chip selects it, the module is ready, its section shows (${st.chip})`);
    await page.evaluate(() => window.__M.closePanel && window.__M.closePanel());
    await settle(page, 200);
    // a finger: down, slide across columns and up the field, up
    const box = await page.locator('#cvFx').boundingBox();
    await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.7); await page.mouse.down(); await settle(page, 250);
    const held = await page.evaluate((key) => { const v = [...window.__M.A.voices].find((v) => v.alive && v.eng === key && !v.released); return v ? { as: v.as, wk: !!v.wk, cost: v.cost } : null; }, key);
    for (let i = 1; i <= 8; i++) { await page.mouse.move(box.x + box.width * (0.3 + i * 0.05), box.y + box.height * (0.7 - i * 0.06)); await settle(page, 60); }
    const lv = await page.evaluate(() => { const A = window.__M.A, b = new Float32Array(A.analyser.fftSize); A.analyser.getFloatTimeDomainData(b); let s = 0; for (const x of b) s += x * x; return 10 * Math.log10(s / b.length + 1e-20); });
    await page.mouse.up(); await settle(page, ring(key));
    const after = await page.evaluate((key) => [...window.__M.A.voices].filter((v) => v.eng === key && v.alive).length, key);
    L.ok(held && held.as === key && held.wk && lv > -60 && after === 0, `${key}: a finger plays its processor (cost ${held && held.cost}), slides (setF/setY) at ${lv.toFixed(1)} dBFS, lets go – voice freed`);
    // a MIDI keyboard, with pitch wheel (the detune bus)
    await page.evaluate(() => { window.__send([0x90, 60, 100]); }); await settle(page, 200);
    await page.evaluate(() => { window.__send([0xe0, 0x7f, 0x7f]); }); await settle(page, 150);
    const midi = await page.evaluate((key) => { const v = [...window.__M.A.voices].find((v) => v.alive && v.eng === key && !v.released); return v ? { as: v.as, bend: window.__M.A.bendCents } : null; }, key);
    await page.evaluate(() => { window.__send([0xe0, 0, 0x40]); window.__send([0x80, 60, 0]); }); await settle(page, ring(key));
    L.ok(midi && midi.as === key && midi.bend > 100, `${key}: a MIDI key plays it, the wheel bends it (${midi && midi.bend} ct on the bus)`);
    // second layer + Puls lane + level 3, all at once
    const busy = await page.evaluate(async (key) => {
      const M = window.__M; M.setParam('v.eng', 'neb'); M.setParam('v.layer', key); M.setParam('l0.eng', key); M.setParam('l0.on', true); M.setParam('l1.eng', key); M.setParam('l1.on', true);
      M.setParam('dev.q', '3'); M.seqStart(); let maxV = 0, maxL = 0, over = 0, vb3 = 0;
      for (let i = 0; i < 30; i++) { await window.__sleep(50); const b = M.getBudget()[0], l = M.voiceLoad(); vb3 = b; maxV = Math.max(maxV, M.A.voices.size); maxL = Math.max(maxL, l); if (l > b + 1e-9) over++; }   // (level 3's budget, as it stands at each moment)
      const lanes = [...M.A.voices].filter((v) => v.eng === key).map((v) => v.as + (v.wk ? '*' : ''));
      M.seqStop(); M.setParam('dev.q', '1'); M.setParam('l0.on', false); M.setParam('l1.on', false); M.setParam('v.layer', 'off'); M.setParam('v.eng', key);
      await window.__sleep(key === 'hlm' ? 600 : key === 'rnk' ? 1500 : 3500);
      return { maxV, maxL: +maxL.toFixed(2), vb: vb3, over, lanes, left: M.A.voices.size, broken: [...M.A.workletBroken], mx: M.mxSrcText('l0') };
    }, key);
    L.ok(busy.lanes.length && busy.lanes.every((s) => s === key + '*') && !busy.over && busy.left === 0 && !busy.broken.length, `${key}: Puls lanes at level 3 play it (${busy.lanes.length} voices sounding, max load ${busy.maxL} ≤ ${busy.vb}), all end, nothing broken (${JSON.stringify({ over: busy.over, left: busy.left, broken: busy.broken, lanes: busy.lanes.join() })})`);
    // Gestik: a shake hammers the rings (wkShake is what the shake subscription calls)
    if (key === 'rnk') {
      const sh = await page.evaluate(async () => {
        const M = window.__M, A = M.A, v = M.playNote('rnk', A.ctx.currentTime + 0.01, 196, 0.5, 0.7, {});
        const rms = () => { const b = new Float32Array(A.analyser.fftSize); A.analyser.getFloatTimeDomainData(b); let s = 0; for (const x of b) s += x * x; return Math.sqrt(s / b.length); };
        await window.__sleep(1500); const a = rms(); for (let i = 0; i < 3; i++) { M.wkShake({ v: 1 }); await window.__sleep(30); } const b = rms();   // three swings
        v.release(); await window.__sleep(1500);
        return { a: 20 * Math.log10(a), b: 20 * Math.log10(b), left: A.voices.size };
      });
      L.ok(sh.b > sh.a + 1 && sh.left === 0, `rnk: a shake strikes the held ring (${sh.a.toFixed(1)} → ${sh.b.toFixed(1)} dBFS)`);
    }
  }
  // knobs follow live; MACRO; mixer text
  const k = await page.evaluate(async () => {
    const M = window.__M, A = M.A; M.setParam('v.eng', 'hlm');
    const v = M.playNote('hlm', A.ctx.currentTime + 0.01, 220, 0.7, 0.7, {}); await window.__sleep(300);
    let got = null; const pm = v.wk.port.postMessage.bind(v.wk.port); v.wk.port.postMessage = (m) => { if (m && m.set) got = m.set; pm(m); };
    M.setParam('hlm.mund', 0.9); v.release(); await window.__sleep(400);
    return { got, macro: [M.macroId(0), M.macroId(1)], mx: M.mxSrcText('fin'), group: M.GROUP.hlm + '/' + M.GROUP.rnk };
  });
  L.ok(k.got && k.got.mund === 0.9, 'a knob turned while a voice sounds reaches its processor ({set})');
  L.ok(k.macro.join() === 'hlm.atem,hlm.blatt' && k.mx === 'Halm' && k.group === 'Halm/Ranke', `MACRO A/B ${k.macro}, mixer source „${k.mx}“, MIDI groups ${k.group}`);
  // Halm's pipes: the chip renames the knobs and the note, a sounding voice hears the pipe, the flame rings out and ends
  const kp = await page.evaluate(async () => {
    const M = window.__M, A = M.A; M.setParam('v.eng', 'hlm'); M.openPanel('klang'); await window.__sleep(100);
    const lab = (id) => { const el = document.querySelector(`[data-pid="${id}"] label`); return el ? el.firstChild.nodeValue + (el.querySelector('.kq-ab') ? '+' + el.querySelector('.kq-ab').textContent : '') : ''; };
    const note = () => { const el = document.getElementById('eng-note-hlm'); return el ? el.textContent : ''; };
    const before = [lab('hlm.atem'), lab('hlm.blatt'), lab('hlm.luft')], n0 = note();
    const v = M.playNote('hlm', A.ctx.currentTime + 0.01, 220, 0.6, 0.7, {}); await window.__sleep(300);
    let got = null; const pm = v.wk.port.postMessage.bind(v.wk.port); v.wk.port.postMessage = (m) => { if (m && m.set && !got) got = m.set; pm(m); };
    const chip = document.querySelector('[data-pid="hlm.rohr"] .chip[data-val="flamme"]'); if (chip) chip.click(); await window.__sleep(100);
    const after = [lab('hlm.atem'), lab('hlm.blatt'), lab('hlm.luft')], n1 = note();
    v.release(); await window.__sleep(150);
    const w = M.playNote('hlm', A.ctx.currentTime + 0.01, 330, 0.6, 0.7, {}); await window.__sleep(600);
    const rms = () => { const b = new Float32Array(A.analyser.fftSize); A.analyser.getFloatTimeDomainData(b); let s = 0; for (const x of b) s += x * x; return 10 * Math.log10(s / b.length + 1e-20); };
    const lv = rms(); w.release(); await window.__sleep(300); const ring = w.alive; await window.__sleep(1500);
    const left = [...A.voices].filter((x) => x.alive && x.eng === 'hlm').length;
    M.setParam('hlm.rohr', 'rohrblatt'); await window.__sleep(50); const back = [lab('hlm.atem'), note()]; M.closePanel();
    return { before, after, n0, n1, got, lv, ring, left, back, wk: !!w.wk };
  });
  L.ok(kp.got && kp.got.rohr === 'flamme', 'Halm: the pipe chosen while a note sounds reaches its processor ({set: rohr})');
  L.ok(kp.before.join() === 'Atem (Druck)+A,Blatt (weich)+B,Luft (Rauschen)' && kp.after.join() === 'Hitze+A,Flackern+B,Feuer (Knistern)' && kp.back[0] === 'Atem (Druck)+A' && /Hitze/.test(kp.n1) && kp.n0 !== kp.n1 && kp.back[1] === kp.n0, `Halm: the knobs and the note follow the pipe (${kp.before.join(' / ')} → ${kp.after.join(' / ')})`);
  L.ok(kp.wk && kp.lv > -60 && kp.ring && kp.left === 0, `Halm's flame plays (${kp.lv.toFixed(1)} dBFS), rings on after the finger lifts, then the voice is freed`);
  // Harz: the body changed while a note sounds reaches its processor, the Dämpfung's Nachklang follows the body
  const kh = await page.evaluate(async () => {
    const M = window.__M, A = M.A; M.setParam('v.eng', 'hrz'); M.openPanel('klang'); await window.__sleep(100);
    const txt = () => { const el = document.querySelector('[data-pid="hrz.daempfung"]'); return el ? el.textContent : ''; };
    const v = M.playNote('hrz', A.ctx.currentTime + 0.01, 220, 0.6, 0.7, {}); await window.__sleep(300);
    let got = null; const pm = v.wk.port.postMessage.bind(v.wk.port); v.wk.port.postMessage = (m) => { if (m && m.set && !got) got = m.set; pm(m); };   // (the first: the ringing voice also hears the body set back)
    const t0 = txt(); M.setParam('hrz.koerper', 'schale'); await window.__sleep(50); const t1 = txt(); v.release(); M.setParam('hrz.koerper', 'glas'); M.closePanel(); await window.__sleep(200);
    return { got, t0, t1, macro: [M.macroId(0), M.macroId(1)], mx: M.mxSrcText('fin') };
  });
  L.ok(kh.got && kh.got.koerper === "schale" && /Nachklang/.test(kh.t1) && kh.t0 !== kh.t1, `Harz: Körper reaches the sounding processor, Nachklang follows the body („${(kh.t0.match(/Nachklang [^s]*s/) || [''])[0]}“ → „${(kh.t1.match(/Nachklang [^s]*s/) || [''])[0]}“)`);
  L.ok(kh.macro.join() === 'hrz.druck,hrz.harz' && kh.mx === 'Harz', `Harz: MACRO A/B ${kh.macro}, mixer source „${kh.mx}“`);
  // Moder (struck): its tile, a tap rings out by itself and frees the voice, a MIDI key with the wheel, lanes and the
  // second layer at level 3, a knob reaching the ringing processor, MACRO/mixer/MIDI group, the Rassel's chip and strike
  {
    await page.evaluate(() => { window.__M.setParam('mdr.nachklang', 1.5); window.__M.openPanel('klang'); });
    await page.click('#p-v-eng .kq-name'); await page.click('.kq-fams .chip[data-fam="erde"]'); await page.click('.kq-tile[data-k="mdr"] .kq-pick'); await page.click('.kq-done');
    const st = await page.evaluate(async () => { const M = window.__M; for (let i = 0; i < 100 && M.DSP.state !== 'ok'; i++) await window.__sleep(20); return { st: M.DSP.state, eng: M.P['v.eng'], sec: !M.engSecs.mdr.hidden, chip: document.querySelector('#engName').textContent, chips: [...M.engSecs.mdr.querySelectorAll('.chip')].map((c) => c.textContent).join('/') }; });
    L.ok(st.st === 'ok' && st.eng === 'mdr' && st.sec && /Glocke\/Holz\/Knochen/.test(st.chips), `mdr: its tile in Erde selects it, the module is ready, its section shows (${st.chip}; Körper ${st.chips})`);
    await page.evaluate(() => window.__M.closePanel && window.__M.closePanel()); await settle(page, 200);
    const box = await page.locator('#cvFx').boundingBox();
    await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.3); await page.mouse.down(); await settle(page, 120); await page.mouse.up();
    const tap = await page.evaluate(async () => { const M = window.__M, v = [...M.A.voices].find((v) => v.alive && v.eng === 'mdr'); if (!v) return null; const o = { as: v.as, wk: !!v.wk, rel: v.released, cost: v.cost, life0: +(v.endAt - v.t0).toFixed(2) };
      const rms = () => { const A = M.A, b = new Float32Array(A.analyser.fftSize); A.analyser.getFloatTimeDomainData(b); let s = 0; for (const x of b) s += x * x; return 10 * Math.log10(s / b.length + 1e-20); };
      await window.__sleep(300); o.lv = +rms().toFixed(1); await window.__sleep(2200); o.left = [...M.A.voices].filter((w) => w.eng === 'mdr').length; o.life = +(v.endAt - v.t0).toFixed(2); return o; });
    L.ok(tap && tap.as === 'mdr' && tap.wk && tap.rel && tap.lv > -60 && tap.left === 0 && tap.life <= 1.5 * 1.3 + 0.15, `mdr: a tap strikes its processor (struck: released at once, ${tap && tap.lv} dBFS, cost ${tap && tap.cost}), it ends by itself at ${tap && tap.life} s (Nachklang 1.5) and the voice is freed`);
    await page.evaluate(() => { window.__send([0x90, 64, 100]); window.__send([0xe0, 0x7f, 0x7f]); }); await settle(page, 150);
    const midi = await page.evaluate(() => { const v = [...window.__M.A.voices].find((v) => v.alive && v.eng === 'mdr'); return v ? { as: v.as, bend: window.__M.A.bendCents } : null; });
    await page.evaluate(() => { window.__send([0xe0, 0, 0x40]); window.__send([0x80, 64, 0]); }); await settle(page, 2200);
    L.ok(midi && midi.as === 'mdr' && midi.bend > 100, `mdr: a MIDI key strikes it, the wheel bends it (${midi && midi.bend} ct on the bus)`);
    const busy = await page.evaluate(async () => {
      const M = window.__M; M.setParam('mdr.nachklang', 5); M.setParam('v.eng', 'neb'); M.setParam('v.layer', 'mdr'); M.setParam('l0.eng', 'mdr'); M.setParam('l0.on', true); M.setParam('l1.eng', 'mdr'); M.setParam('l1.on', true);
      M.setParam('dev.q', '3'); M.seqStart(); let maxV = 0, maxL = 0, over = 0, vb3 = 0;
      for (let i = 0; i < 40; i++) { await window.__sleep(50); const b = M.getBudget()[0], l = M.voiceLoad(); vb3 = b; maxV = Math.max(maxV, M.A.voices.size); maxL = Math.max(maxL, l); if (l > b + 1e-9) over++; }
      const lanes = [...M.A.voices].filter((v) => v.eng === 'mdr').map((v) => v.as + (v.wk ? '*' : '')), mx = M.mxSrcText('l0');
      M.seqStop(); M.setParam('dev.q', '1'); M.setParam('l0.on', false); M.setParam('l1.on', false); M.setParam('v.layer', 'off'); M.setParam('v.eng', 'mdr');
      await window.__sleep(5500);
      return { maxV, maxL: +maxL.toFixed(2), vb: vb3, over, lanes, left: M.A.voices.size, broken: [...M.A.workletBroken], mx };
    });
    L.ok(busy.lanes.length && busy.lanes.every((s) => s === 'mdr*') && !busy.over && busy.left === 0 && !busy.broken.length && busy.mx === 'Moder', `mdr: Puls lanes at level 3 play it (${busy.lanes.length} voices sounding, max load ${busy.maxL} ≤ ${busy.vb}, mixer „${busy.mx}“), all end by themselves (${busy.left} left), nothing broken`);
    const kn = await page.evaluate(async () => {
      const M = window.__M, A = M.A, v = M.playNote('mdr', A.ctx.currentTime + 0.01, 220, 0.7, 0.8, {}); await window.__sleep(200);
      let got = null; const pm = v.wk.port.postMessage.bind(v.wk.port); v.wk.port.postMessage = (m) => { if (m && m.set && !got) got = m.set; pm(m); };
      M.setParam('mdr.knistern', 0.9); M.setParam('mdr.knistern', 0.4);
      return { got, macro: [M.macroId(0), M.macroId(1)], group: M.GROUP.mdr, note: M.ENG_NOTE.mdr };
    });
    L.ok(kn.got && kn.got.knistern === 0.9 && kn.macro.join() === 'mdr.pilz,mdr.knistern' && kn.group === 'Moder' && /Feuchte/.test(kn.note), `mdr: Knistern reaches the ringing processor ({set}: ${JSON.stringify(kn.got)}), MACRO ${kn.macro}, MIDI group „${kn.group}“, its note („${kn.note.slice(0, 50)}…“)`);
    // the Rassel: Moder among its sounds; a swing's strike plays a Moder voice on the Klang strip
    const ras = await page.evaluate(async () => {
      const M = window.__M, keep = { on: M.GK.on, lad: M.GK.p.lad, ras: M.GK.p.ras, rasS: M.GK.p.rasS, rasQ: M.GK.p.rasQ };
      M.GK.p.rasS = 'mdr'; M.gkCheck(); const kept = M.GK.p.rasS;
      M.GK.on = true; M.GK.p.lad = true; M.GK.p.ras = true; M.GK.p.rasQ = 'frei';
      const n0 = M.A.voices.size; M.ladRassel({ t: performance.now(), v: 0.8 }); await window.__sleep(60);
      const v = [...M.A.voices].find((v) => v.alive && v.eng === 'mdr'), o = { kept, as: v && v.as, wk: !!(v && v.wk), n: M.A.voices.size - n0 };
      Object.assign(M.GK.p, { lad: keep.lad, ras: keep.ras, rasS: keep.rasS, rasQ: keep.rasQ }); M.GK.on = keep.on;
      M.gkEnable(true); await window.__sleep(500); M.openPanel('dev'); await window.__sleep(400);
      const box = document.querySelector('[role=radiogroup][aria-label="Klang der Rassel"]'); o.chips = box ? [...box.querySelectorAll('.chip')].map((b) => b.textContent).join('/') : 'no card';
      M.closePanel(); M.gkDisable && M.gkDisable(); await window.__sleep(2500);
      return o;
    });
    L.ok(ras.kept === 'mdr' && ras.as === 'mdr' && ras.wk && /Moder/.test(ras.chips), `mdr: a Rassel sound – kept by the check, its chip (${ras.chips}), a swing strikes a Moder voice on its processor (${JSON.stringify(ras)})`);
  }
  const errs = errors.filter((e) => !/myzel-dsp\.js|Failed to load resource/.test(e));
  L.ok(!errs.length, 'no console errors ' + errs.join(' | '));
  await ctx.close();
  // -- without AudioWorklet: the stand-ins, said once
  {
    const { page, errors, ctx } = await open(browser, { noWorklet: true });
    await page.click('#btnStart'); await settle(page, 300);
    await page.evaluate(() => window.__M.openPanel('klang'));
    await page.click('#p-v-eng .kq-name'); await page.click('.kq-fams .chip[data-fam="luft"]'); await page.click('.kq-tile[data-k="hlm"] .kq-pick'); await page.click('.kq-done'); await settle(page, 300);
    const r = await page.evaluate(async () => {
      const M = window.__M, A = M.A, v = M.playNote('hlm', A.ctx.currentTime + 0.01, 220, 0.6, 0.7, {}), w = M.playNote('rnk', A.ctx.currentTime + 0.01, 330, 0.6, 0.7, {}), x = M.playNote('hrz', A.ctx.currentTime + 0.01, 440, 0.6, 0.7, {}), z = M.playNote('mdr', A.ctx.currentTime + 0.01, 550, 0.6, 0.7, {});
      await window.__sleep(200); v.release(); w.release(); if (x.release) x.release();
      return { state: M.DSP.state, as: [v.as, w.as, x.as, z.as], eng: [v.eng, w.eng, x.eng, z.eng], note: !M.engSecs.hlm.wkNote.hidden && M.engSecs.hlm.wkNote.textContent, toast: document.querySelector('#toastMsg').textContent, mx: M.mxSrcText('fin'), patch: M.P['v.eng'] };
    });
    L.ok(r.state === 'kein' && r.as.join() === 'hau,neb,sch,glo' && r.eng.join() === 'hlm,rnk,hrz,mdr' && r.patch === 'hlm', `no AudioWorklet: Halm plays as Hauch, Ranke as Nebel, Harz as Schale, Moder as Glocke, the patch keeps „hlm“ (${JSON.stringify(r.as)})`);
    L.ok(/Halm vereinfacht als Hauch/.test(r.note || '') && /kein AudioWorklet/.test(r.toast) && r.mx === 'Halm (als Hauch)', `…and says so: section „${r.note}“, toast „${r.toast}“, mixer „${r.mx}“`);
    L.ok(!errors.length, 'no console errors without AudioWorklet ' + errors.join(' | '));
    await ctx.close();
  }
  // -- in a frame (claude.ai): one hint to open it in its own tab
  {
    const ctx = await browser.newContext({ viewport: { width: 800, height: 900 } }); const page = await ctx.newPage();
    await page.goto(process.env.KN_FRAME || URL_.replace(/kn-inst\/index\.html$/, 'kn-frame.html'));   // a parent page from the same server (a secure context: AudioWorklet exists)
    const fr = await (await page.waitForSelector('#f')).contentFrame(); await fr.waitForFunction(() => !!window.__M);
    await fr.click('#btnStart'); await fr.waitForTimeout(300);
    await fr.evaluate(() => window.__M.setParam('v.eng', 'rnk')); await fr.waitForTimeout(300);
    const t = await fr.evaluate(() => document.querySelector('#toastMsg').textContent);
    L.ok(/eigenen Tab/.test(t), `in a frame: „${t}“`);
    await ctx.close();
  }
  await browser.close();
  process.exit(L.summary() ? 1 : 0);
})().catch((e) => { console.log('FAIL fatal ' + (e && e.stack || e)); process.exit(1); });
