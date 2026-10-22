// The new engines in a live (real-time) session, the way a player meets them (klang SPEC §7.2 t-eng-live): chosen by
// their chip, a finger held and moved on the field (setF/setY), let go, a MIDI keyboard, a Puls lane, the second
// layer, level 3, a shake under Gestik, the mixer's source text – and without AudioWorklet: the stand-ins, the note in
// the engine section, the toast; Zapfen there plays its own native stand-in (finger, MIDI, lanes, knobs), Glut its own
// native loop. Also: the iframe hint.   node t-eng-live.js   (slot kn-inst, built by run-all.sh)
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
  const ring = (key) => (key === 'hlm' ? 500 : key === 'rnk' ? 1500 : key === 'shn' ? 700 : key === 'zpf' ? 1200 : key === 'glt' ? 3000 : key === 'khl' ? 500 : key === 'boe' ? 6500 : key === 'amo' ? 900 : 2600);   // (Harz's glass rings on after the bow lifts; Böe's strings with their Nachklang, 3 s; Sehne: the hand mutes it)
  for (const key of ['hlm', 'khl', 'rnk', 'hrz', 'shn', 'zpf', 'glt', 'boe', 'amo']) {
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
      await window.__sleep(key === 'hlm' ? 600 : key === 'rnk' ? 1500 : key === 'shn' ? 900 : key === 'zpf' ? 1500 : key === 'glt' ? 4000 : key === 'khl' ? 600 : key === 'boe' ? 4500 : key === 'amo' ? 1200 : 3500);
      // (a step the Puls had scheduled ahead – up to 0.35 s – still starts after the stop and plays its gate and its
      // release: on a busy machine that outlived the fixed wait; a voice that never ends still fails after 4 s more)
      let more = 0; while (M.A.voices.size && more < 4000) { await window.__sleep(100); more += 100; }
      return { maxV, maxL: +maxL.toFixed(2), vb: vb3, over, lanes, left: M.A.voices.size, more, broken: [...M.A.workletBroken], mx: M.mxSrcText('l0') };
    }, key);
    L.ok(busy.lanes.length && busy.lanes.every((s) => s === key + '*') && !busy.over && busy.left === 0 && !busy.broken.length, `${key}: Puls lanes at level 3 play it (${busy.lanes.length} voices sounding, max load ${busy.maxL} ≤ ${busy.vb}), all end${busy.more ? ' (the last ' + busy.more + ' ms later)' : ''}, nothing broken (${JSON.stringify({ over: busy.over, left: busy.left, broken: busy.broken, lanes: busy.lanes.join() })})`);
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
    // Amöbe: a shake's swing reaches the held voice as a burst ({zuck}) – the form breaks (the waveform a period apart
    // differs more right after it), the level holds (normalised), the voice ends after the lift
    if (key === 'amo') {
      const sh = await page.evaluate(async () => {
        const M = window.__M, A = M.A, v = M.playNote('amo', A.ctx.currentTime + 0.01, 110, 0.3, 0.7, {});
        let got = 0; const pm = v.wk.port.postMessage.bind(v.wk.port); v.wk.port.postMessage = (m) => { if (m && m.zuck) got++; pm(m); };
        const grab = () => { const b = new Float32Array(A.analyser.fftSize); A.analyser.getFloatTimeDomainData(b); let s = 0; for (const x of b) s += x * x; return { rms: Math.sqrt(s / b.length) }; };
        await window.__sleep(1200); const a = grab(); for (let i = 0; i < 3; i++) { M.wkShake({ v: 1 }); await window.__sleep(40); } const b = grab();
        v.release(); await window.__sleep(900);
        return { got, a: 20 * Math.log10(a.rms), b: 20 * Math.log10(b.rms), left: [...A.voices].filter((x) => x.eng === 'amo').length };
      });
      L.ok(sh.got === 3 && Math.abs(sh.b - sh.a) < 6 && sh.left === 0, `amo: three swings of a shake reach the held voice as bursts (${sh.got}), the level holds (${sh.a.toFixed(1)} → ${sh.b.toFixed(1)} dBFS), it ends after the lift`);
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
  // Gespinst: its tile, a tap plucks and wakes the web (counted in the budget, its own mixer channel sounds), a knob
  // reaches the web, Halo moves the channel, Stille clears it, the web idles again
  {
    await page.evaluate(() => window.__M.openPanel('klang'));
    await page.click('#p-v-eng .kq-name'); await page.click('.kq-fams .chip[data-fam="erz"]'); await page.click('.kq-tile[data-k="gsp"] .kq-pick'); await page.click('.kq-done');
    const g = await page.evaluate(async () => {
      const M = window.__M, A = M.A; for (let i = 0; i < 100 && M.DSP.state !== 'ok'; i++) await window.__sleep(20);
      const sec = !M.engSecs.gsp.hidden; M.closePanel && M.closePanel();
      const tap = (f) => M.playNote('gsp', A.ctx.currentTime + 0.01, f, 0.6, 0.8, {});
      const rms = () => { const b = new Float32Array(A.analyser.fftSize); A.analyser.getFloatTimeDomainData(b); let s = 0; for (const x of b) s += x * x; return 10 * Math.log10(s / b.length + 1e-20); };
      const v = tap(M.N.notes[0].f); await window.__sleep(150); tap(M.N.notes[3].f); await window.__sleep(250);
      const web = !!(A.gsp && A.gsp.node), active = !!(A.gsp && A.gsp.active), load = M.voiceLoad(), lv = rms();
      let got = null; const pm = A.gsp.node.port.postMessage.bind(A.gsp.node.port); A.gsp.node.port.postMessage = (m) => { if (m && m.set && !got) got = m.set; pm(m); };
      M.setParam('gsp.kopplung', 0.7); M.setParam('gsp.halo', -3); await window.__sleep(400); const halo = A.gsp.out.gain.value;
      M.panic(); await window.__sleep(150); const after = rms();
      M.setParam('gsp.kopplung', 0.4); M.setParam('gsp.halo', -9);
      await window.__sleep(1500);
      return { sec, web, active, load: +load.toFixed(2), lv: +lv.toFixed(1), got, halo: +halo.toFixed(3), after: +after.toFixed(1), idle: !A.gsp.active, chan: M.mxSrcText('gsp'), voice: v && v.as };
    });
    L.ok(g.sec && g.voice === 'gsp' && g.web && g.active && g.load >= 0.8 + 1.6 && g.lv > -60, `gsp: its tile plucks, the web wakes and counts in the budget (load ${g.load}), ${g.lv} dBFS`);
    L.ok(g.got && g.got.kopplung === 0.7 && Math.abs(g.halo - Math.pow(10, -3 / 20)) < 0.05 && g.chan === 'eine Oktave', `gsp: Kopplung reaches the web (${JSON.stringify(g.got)}), Halo moves its channel (${g.halo}), the channel says „${g.chan}“`);
    L.ok(g.after < -70 && g.idle, `gsp: Stille clears the web (${g.after} dBFS), and it idles again`);
  }
  // Kehlchen: Silbe reaches a sounding voice, a shake (Gestik) starts a syllable
  { const k = await page.evaluate(async () => { const M = window.__M, A = M.A; M.setParam('v.eng', 'khl'); const v = M.playNote('khl', A.ctx.currentTime + 0.01, 880, 0.6, 0.7, {}); await window.__sleep(300);
      const got = []; const pm = v.wk.port.postMessage.bind(v.wk.port); v.wk.port.postMessage = (m) => { got.push(m); pm(m); };
      M.setParam('khl.silbe', 'triller'); M.wkShake({ v: 0.8 }); await window.__sleep(100); v.release(); M.setParam('khl.silbe', 'chip'); await window.__sleep(300);
      return { set: got.some((m) => m.set && m.set.silbe === 'triller'), syl: got.some((m) => m.silbe), as: v.as, alive: v.alive }; });
    L.ok(k.as === 'khl' && k.set && k.syl && !k.alive, `khl: Silbe reaches a sounding voice ({set}), a shake starts a syllable ({silbe}), let go – freed`); }
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
  // Böe: a knob turned under a sounding voice reaches its processor; MACRO, mixer source, MIDI group, the section's note
  const kb = await page.evaluate(async () => {
    const M = window.__M, A = M.A; M.setParam('v.eng', 'boe'); M.openPanel('klang'); await window.__sleep(100);
    const v = M.playNote('boe', A.ctx.currentTime + 0.01, 220, 0.5, 0.7, {}); await window.__sleep(300);
    let got = null; const pm = v.wk.port.postMessage.bind(v.wk.port); v.wk.port.postMessage = (m) => { if (m && m.set && !got) got = m.set; pm(m); };
    M.setParam('boe.fang', 0.8); M.setParam('boe.nachklang', 1.5); const sec = M.engSecs.boe, txt = sec ? sec.textContent : '';
    v.release(); M.setParam('boe.fang', 0.3); M.setParam('boe.nachklang', 3); M.closePanel(); await window.__sleep(200);
    return { got, macro: [M.macroId(0), M.macroId(1)], mx: M.mxSrcText('fin'), group: M.GROUP.boe, note: /Windstärke/.test(txt) && /Nachklang/.test(txt), cost: [M.VCOST1.boe, M.VCOST3.boe] };
  });
  L.ok(kb.got && kb.got.fang === 0.8 && kb.macro.join() === 'boe.wind,boe.fang' && kb.mx === 'Böe' && kb.group === 'Böe' && kb.note && kb.cost[0] > 0, `Böe: Fang reaches the sounding processor (${JSON.stringify(kb.got)}), MACRO A/B ${kb.macro}, mixer „${kb.mx}“, group „${kb.group}“, the section tells how it plays, VCOST ${kb.cost}`);
  // Amöbe: Verteilung and Punkte turned while a note sounds reach its processor; MACRO, mixer text, the section's chips
  const ka = await page.evaluate(async () => {
    const M = window.__M, A = M.A; M.setParam('v.eng', 'amo'); M.openPanel('klang'); await window.__sleep(100);
    const chips = [...document.querySelectorAll('[data-pid="amo.verteilung"] .chip, #p-amo-verteilung .chip')].map((c) => c.textContent);
    const v = M.playNote('amo', A.ctx.currentTime + 0.01, 82.4, 0.5, 0.7, {}); await window.__sleep(300);
    const got = []; const pm = v.wk.port.postMessage.bind(v.wk.port); v.wk.port.postMessage = (m) => { if (m && m.set) got.push(m.set); pm(m); };
    M.setParam('amo.verteilung', 'cauchy'); M.setParam('amo.punkte', 20); await window.__sleep(100); v.release(); M.setParam('amo.verteilung', 'linear'); M.setParam('amo.punkte', 12); M.closePanel(); await window.__sleep(1200);
    return { got, chips, macro: [M.macroId(0), M.macroId(1)], mx: M.mxSrcText('fin'), group: M.GROUP.amo, note: M.ENG_NOTE.amo, left: [...A.voices].filter((x) => x.eng === 'amo').length };
  });
  L.ok(ka.got.length >= 2 && ka.got[0].verteilung === 'cauchy' && ka.got[1].punkte === 20 && ka.left === 0, 'Amöbe: Verteilung and Punkte reach the sounding processor ({set}: ' + JSON.stringify(ka.got.slice(0, 2).map((g) => [g.verteilung, g.punkte])) + ')');
  L.ok(ka.macro.join() === 'amo.zeit,amo.punkte' && ka.mx === 'Amöbe' && ka.group === 'Amöbe' && /lebt unten/i.test(ka.note.replace('Sie lebt unten', 'lebt unten')), `Amöbe: MACRO A/B ${ka.macro}, mixer source „${ka.mx}“, MIDI group ${ka.group}, the note says it lives low`);
  // Sehne: the Steg chip reaches a sounding string; its section, MACRO, the mixer's text, the library sentences; a held
  // string follows the hand (setY → E-Bow) and the finger's slide (setF) without a new pluck
  const ks = await page.evaluate(async () => {
    const M = window.__M, A = M.A; M.setParam('v.eng', 'shn'); M.openPanel('klang'); await window.__sleep(100);
    const chips = [...document.querySelectorAll('[data-pid="shn.steg"] .chip')].map((c) => c.dataset.val).join();
    const labels = ['shn.daempfung', 'shn.steifheit', 'shn.zupfort', 'shn.hand', 'shn.ebow'].map((id) => { const el = document.querySelector(`[data-pid="${id}"] label`); return el ? el.firstChild.nodeValue : ''; });
    const note = (document.getElementById('eng-note-shn') || {}).textContent || '';
    const v = M.playNote('shn', A.ctx.currentTime + 0.01, 220, 0.5, 0.7, {}); await window.__sleep(300);
    let got = null; const pm = v.wk.port.postMessage.bind(v.wk.port); v.wk.port.postMessage = (m) => { if (m && m.set && !got) got = m.set; pm(m); };
    const chip = document.querySelector('[data-pid="shn.steg"] .chip[data-val="jawari"]'); if (chip) chip.click(); await window.__sleep(80);
    const rms = () => { const b = new Float32Array(A.analyser.fftSize); A.analyser.getFloatTimeDomainData(b); let s = 0; for (const x of b) s += x * x; return 10 * Math.log10(s / b.length + 1e-20); };
    const c0 = v.cost; v.setF(330, 0.1); v.setY(0.95); const c1 = v.cost; await window.__sleep(2200); const held = rms(); const fq = v.wk.parameters.get('freq').value; v.setY(0.5); const c2 = v.cost; v.setY(0.95);
    v.release(); await window.__sleep(700); const left = [...A.voices].filter((x) => x.alive && x.eng === 'shn').length;
    M.setParam('shn.steg', 'flach'); M.closePanel();
    return { chips, labels, note, got, held, fq, left, cost: [c0, c1, c2], tab: M.VCOST1.shn, macro: [M.macroId(0), M.macroId(1)], mx: M.mxSrcText('fin'), group: M.GROUP.shn, info: [M.ENG_INFO.shn, M.ENG_INFO.sai], hoehe: M.ENG_META.shn.hoehe };
  });
  L.ok(ks.chips === 'flach,jawari' && ks.labels.join() === 'Nachklang,Steifheit,Zupfort (vom Steg),Hand,E-Bow' && /Handballen/.test(ks.note) && /E-Bow/.test(ks.note), `Sehne: its section – Steg chips ${ks.chips}, knobs ${ks.labels.join(' / ')}, the note says how the hand plays`);
  L.ok(ks.got && ks.got.steg === 'jawari', 'Sehne: the Steg chosen while a string sounds reaches its processor ({set: steg})');
  L.ok(ks.cost[0] === ks.tab && ks.cost[1] > ks.cost[0] && ks.cost[2] === ks.cost[0], `Sehne: a voice's price follows its hand – ${ks.cost.join(' → ')} units (open, E-Bow, open; the table ${ks.tab})`);
  L.ok(Math.abs(ks.fq - 330) < 2 && ks.held > -50 && ks.left === 0, `Sehne: a held string glides (freq ${ks.fq.toFixed(1)} Hz) and is held by the E-Bow (${ks.held.toFixed(1)} dBFS after 2 s), the hand mutes it on release (voices left ${ks.left})`);
  L.ok(ks.macro.join() === 'shn.ebow,shn.daempfung' && ks.mx === 'Sehne' && ks.group === 'Sehne' && ks.hoehe === 'Hand' && /^Lebende Saite/.test(ks.info[0]) && /viele Stimmen/.test(ks.info[1]), `Sehne: MACRO A/B ${ks.macro}, mixer „${ks.mx}“, MIDI group ${ks.group}, Höhe „${ks.hoehe}“; library: Sehne „${ks.info[0]}“, Saite „${ks.info[1]}“`);
  // Zapfen: a knob turned while a voice sounds reaches its processor, the body's Nachklang follows the body, MACRO, mixer
  const kz = await page.evaluate(async () => {
    const M = window.__M, A = M.A; M.setParam('v.eng', 'zpf'); M.openPanel('klang'); await window.__sleep(100);
    const txt = () => { const el = document.querySelector('[data-pid="zpf.klang"]'); return el ? el.textContent : ''; }, rt = () => { const el = document.querySelector('[data-pid="zpf.rast"]'); return el ? el.textContent : ''; };
    const v = M.playNote('zpf', A.ctx.currentTime + 0.01, 220, 0.8, 0.7, {}); await window.__sleep(300);
    let got = null; const pm = v.wk.port.postMessage.bind(v.wk.port); v.wk.port.postMessage = (m) => { if (m && m.set && !got) got = m.set; pm(m); };
    const t0 = txt(), r0 = rt(); M.setParam('zpf.koerper', 'kuerbis'); await window.__sleep(50); const t1 = txt(); M.setParam('zpf.rast', 1); await window.__sleep(50); const r1 = rt();
    v.release(); M.setParam('zpf.koerper', 'zapfen'); M.setParam('zpf.rast', 0.7); M.closePanel(); await window.__sleep(900);
    return { got, t0, t1, r0, r1, macro: [M.macroId(0), M.macroId(1)], mx: M.mxSrcText('fin'), group: M.GROUP.zpf, left: [...A.voices].filter((x) => x.alive && x.eng === 'zpf').length };
  });
  L.ok(kz.got && kz.got.koerper === 'kuerbis' && /Nachklang \d+ ms/.test(kz.t1) && kz.t0 !== kz.t1 && /rastet ab 36 %/.test(kz.r0) && /rastet ab 18 %/.test(kz.r1), `Zapfen: Körper reaches the sounding processor, Nachklang follows the body („${(kz.t0.match(/Nachklang \d+ ms/) || [''])[0]}“ → „${(kz.t1.match(/Nachklang \d+ ms/) || [''])[0]}“), Rast says where it locks („${(kz.r0.match(/rastet[^%]*%/) || [''])[0]}“ → „${(kz.r1.match(/rastet[^%]*%/) || [''])[0]}“)`);
  L.ok(kz.macro.join() === 'zpf.rast,zpf.klang' && kz.mx === 'Zapfen' && kz.group === 'Zapfen' && kz.left === 0, `Zapfen: MACRO A/B ${kz.macro}, mixer source „${kz.mx}“, MIDI group ${kz.group}`);
  // Glut: a knob turned while a note glows reaches its processor; let go, it glows on (Nachglühen) and then ends
  const kg = await page.evaluate(async () => {
    const M = window.__M, A = M.A; M.setParam('v.eng', 'glt'); M.openPanel('klang'); await window.__sleep(100);
    const v = M.playNote('glt', A.ctx.currentTime + 0.01, 220, 0.7, 0.7, {}); await window.__sleep(600);
    let got = null; const pm = v.wk.port.postMessage.bind(v.wk.port); v.wk.port.postMessage = (m) => { if (m && m.set) got = m.set; pm(m); };   // (the last: both knobs)
    M.setParam('glt.hitze', 0.9); M.setParam('glt.nachgluehen', 1.0);
    const rms = () => { const b = new Float32Array(A.analyser.fftSize); A.analyser.getFloatTimeDomainData(b); let s = 0; for (const x of b) s += x * x; return 10 * Math.log10(s / b.length + 1e-20); };
    const lv = rms(); v.release(); await window.__sleep(500); const glow = v.alive && rms(); await window.__sleep(1800);
    const o = { got, lv, glow, alive: v.alive, macro: [M.macroId(0), M.macroId(1)], mx: M.mxSrcText('fin'), group: M.GROUP.glt, sprung: [...document.querySelectorAll('[data-pid="glt.sprung"] .chip')].map((c) => c.textContent).join('/'), note: (document.getElementById('eng-note-glt') || {}).textContent || '' };
    M.setParam('glt.hitze', 0.5); M.setParam('glt.nachgluehen', 1.5); M.closePanel();
    return o;
  });
  L.ok(kg.got && kg.got.hitze === 0.9 && kg.got.nachgluehen === 1, 'Glut: Hitze and Nachglühen turned while a note glows reach its processor ({set})');
  L.ok(kg.lv > -60 && kg.glow > kg.lv - 25 && !kg.alive, `Glut: let go it glows on (${kg.lv.toFixed(1)} → ${kg.glow && kg.glow.toFixed(1)} dBFS 0.5 s later), then the voice is freed`);
  L.ok(kg.macro.join() === 'glt.gluehen,glt.hitze' && kg.mx === 'Glut' && kg.group === 'Glut' && kg.sprung === 'Oktave/Duodezime' && /Nachglühen/.test(kg.note), `Glut: MACRO A/B ${kg.macro}, mixer „${kg.mx}“, group „${kg.group}“, Sprung chips ${kg.sprung}, its note`);
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
      const M = window.__M, A = M.A, W = [['hlm', 'hau', 220], ['rnk', 'neb', 330], ['hrz', 'sch', 440], ['mdr', 'glo', 550], ['boe', 'obt', 294], ['amo', 'tie', 110], ['gsp', 'sai', 247], ['shn', 'sai', 262], ['khl', 'swm', 523]], vs = W.map(([k, , f]) => M.playNote(k, A.ctx.currentTime + 0.01, f, 0.6, 0.7, {}));
      await window.__sleep(200); for (const v of vs) if (v && v.release && !v.released) v.release();
      return { state: M.DSP.state, as: vs.map((v) => v.as), eng: vs.map((v) => v.eng), want: W.map((w) => w[1]), keys: W.map((w) => w[0]), shnNote: !M.engSecs.shn.wkNote.hidden && M.engSecs.shn.wkNote.textContent, note: !M.engSecs.hlm.wkNote.hidden && M.engSecs.hlm.wkNote.textContent, toast: document.querySelector('#toastMsg').textContent, mx: M.mxSrcText('fin'), patch: M.P['v.eng'] };
    });
    L.ok(r.state === 'kein' && r.as.join() === r.want.join() && r.eng.join() === r.keys.join() && r.patch === 'hlm', `no AudioWorklet: the stand-ins play – ${r.keys.map((k, i) => k + ' → ' + r.as[i]).join(', ')} – the patch keeps „hlm“`);
    L.ok(/Sehne vereinfacht als Saite/.test(r.shnNote || ''), `…Sehne's section: „${r.shnNote}“`);
    L.ok(/Halm vereinfacht als Hauch/.test(r.note || '') && /kein AudioWorklet/.test(r.toast) && r.mx === 'Halm (als Hauch)', `…and says so: section „${r.note}“, toast „${r.toast}“, mixer „${r.mx}“`);
    // Zapfen: its own native stand-in – chosen by its tile (no „spielt als“), a finger (setY/setF), MIDI with the wheel,
    // Puls lanes at level 3, a knob live, the section's note, the mixer's text
    await page.click('#p-v-eng .kq-name'); await page.click('.kq-fams .chip[data-fam="holz"]');
    const tile = await page.evaluate(() => document.querySelector('.kq-tile[data-k="zpf"] .kq-i').textContent);
    await page.click('.kq-tile[data-k="zpf"] .kq-pick'); await page.click('.kq-done'); await page.evaluate(() => window.__M.closePanel && window.__M.closePanel()); await settle(page, 300);
    const box = await page.locator('#cvFx').boundingBox();
    const t0 = await page.evaluate(() => window.__M.A.ctx.currentTime);
    await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.7); await page.mouse.down(); await settle(page, 250);
    const held = await page.evaluate((t0) => { const v = [...window.__M.A.voices].find((v) => v.alive && v.eng === 'zpf' && !v.released && v.t0 >= t0 && !v.probe); return v ? { as: v.as, wk: !!v.wk, zn: !!v.zn, cost: v.cost } : null; }, t0);
    let lv = -200; for (let i = 1; i <= 8; i++) { await page.mouse.move(box.x + box.width * (0.3 + i * 0.05), box.y + box.height * (0.7 - i * 0.07)); await settle(page, 60); lv = Math.max(lv, await page.evaluate(() => { const A = window.__M.A, b = new Float32Array(A.analyser.fftSize); A.analyser.getFloatTimeDomainData(b); let s = 0; for (const x of b) s += x * x; return 10 * Math.log10(s / b.length + 1e-20); })); }
    const rate = await page.evaluate(() => { const v = [...window.__M.A.voices].find((v) => v.alive && v.eng === 'zpf' && !v.released && v.zn); return v ? v.zn.st.R : 0; });
    await page.mouse.up(); await settle(page, 1200);
    const nz = await page.evaluate(async () => {
      const M = window.__M, A = M.A, out = { after: [...A.voices].filter((v) => v.alive && v.eng === 'zpf').length };
      const v = M.playNote('zpf', A.ctx.currentTime + 0.01, 262, 0.5, 0.7, {}); await window.__sleep(300); out.held = { as: v.as, zn: !!v.zn };
      const g0 = v.zn.gN.gain.value; M.setParam('zpf.kratzen', 1); await window.__sleep(200); out.knob = [g0, v.zn.gN.gain.value]; M.setParam('zpf.kratzen', 0.3);
      v.release(); await window.__sleep(1200);
      M.setParam('v.eng', 'neb'); M.setParam('l0.eng', 'zpf'); M.setParam('l0.on', true); M.setParam('l1.eng', 'zpf'); M.setParam('l1.on', true); M.setParam('dev.q', '3'); M.seqStart(); let n = 0, over = 0;
      for (let i = 0; i < 30; i++) { await window.__sleep(50); n = Math.max(n, [...A.voices].filter((x) => x.alive && x.eng === 'zpf' && x.zn).length); over = Math.max(over, M.voiceLoad() - M.getBudget()[0]); }
      M.seqStop(); M.setParam('dev.q', '1'); M.setParam('l0.on', false); M.setParam('l1.on', false); M.setParam('v.eng', 'zpf'); await window.__sleep(1500);
      out.lanes = n; out.over = over; out.left = [...A.voices].filter((x) => x.alive && x.eng === 'zpf').map((x) => x.eng + (x.released ? '-r' : '') + ' ' + (x.endAt - A.ctx.currentTime).toFixed(2)).join(); out.note = !M.engSecs.zpf.wkNote.hidden && M.engSecs.zpf.wkNote.textContent; out.mx = M.mxSrcText('fin'); out.fb = M.kqFb('zpf'); out.label = M.engLabel('zpf');
      return out;
    });
    L.ok(!/spielt als/.test(tile) && held && held.as === 'zpf' && !held.wk && held.zn && lv > -60 && rate > 3 && nz.after === 0, `no AudioWorklet: Zapfen plays its own native stand-in (tile „${tile.slice(0, 40)}…“, cost ${held && held.cost}), a finger slides it up to ${lv.toFixed(1)} dBFS (rate ${rate.toFixed(1)}/s), lets go – freed`);
    L.ok(nz.held.as === 'zpf' && nz.held.zn && nz.knob[1] > nz.knob[0] * 2, `no AudioWorklet: Kratzen turned up reaches a sounding native voice (its noise ${nz.knob.map((x) => x.toFixed(3)).join(' → ')})`);
    L.ok(nz.lanes > 0 && nz.over <= 1e-9 && !nz.left, `no AudioWorklet: Puls lanes at level 3 play Zapfen natively (up to ${nz.lanes} voices, load − budget ≤ ${nz.over.toFixed(2)}), all end${nz.left ? ' – still alive: ' + nz.left : ''}`);
    L.ok(/Zapfen vereinfacht \(kein AudioWorklet\)/.test(nz.note || '') && nz.mx === 'Zapfen' && nz.label === 'Zapfen' && !nz.fb, `no AudioWorklet: Zapfen's section says „${nz.note}“, the mixer „${nz.mx}“, no „als …“`);
    // Glut: its own native loop – a finger and a MIDI key play it (setF/setY follow), a knob reaches it, let go it glows and ends
    {
    await page.evaluate(() => { const M = window.__M; M.closePanel && M.closePanel(); M.setParam('v.eng', 'glt'); M.openPanel('klang'); }); await settle(page, 200);
    const box = await page.locator('#cvFx').boundingBox();
    await page.evaluate(() => window.__M.closePanel()); await settle(page, 100);
    await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.3); await page.mouse.down(); await settle(page, 700);
    const g = await page.evaluate(() => { const M = window.__M, v = [...M.A.voices].find((x) => x.alive && x.eng === 'glt' && !x.released); const b = new Float32Array(M.A.analyser.fftSize); M.A.analyser.getFloatTimeDomainData(b); let s = 0; for (const x of b) s += x * x; return v ? { as: v.as, wk: !!v.wk, nat: !!v.gltN, cost: v.cost, lv: 10 * Math.log10(s / b.length + 1e-20), m: v.gltN.st.m, f: v.gltN.st.f } : null; });
    for (let i = 1; i <= 6; i++) { await page.mouse.move(box.x + box.width * (0.4 + i * 0.04), box.y + box.height * (0.3 - i * 0.04)); await settle(page, 80); }
    const g2 = await page.evaluate(() => { const v = [...window.__M.A.voices].find((x) => x.alive && x.eng === 'glt' && !x.released); return v ? { f: v.gltN.st.f, y: v.gltN.st.y, m: v.gltN.st.m } : null; });
    const kq = await page.evaluate(() => { const M = window.__M, v = [...M.A.voices].find((x) => x.alive && x.eng === 'glt' && !x.released); const q0 = v.gltN.bq.Q.value; M.setParam('glt.hitze', 1); return new Promise((res) => setTimeout(() => { res([q0, v.gltN.bq.Q.value]); M.setParam('glt.hitze', 0.5); }, 200)); });
    await page.mouse.up(); await settle(page, 600);
    const glow = await page.evaluate(() => [...window.__M.A.voices].filter((x) => x.alive && x.eng === 'glt').length);
    await settle(page, 2400);
    const after = await page.evaluate(() => ({ left: [...window.__M.A.voices].filter((x) => x.alive && x.eng === 'glt').length, note: !window.__M.engSecs.glt.wkNote.hidden && window.__M.engSecs.glt.wkNote.textContent, mx: window.__M.mxSrcText('fin'), fb: window.__M.kqFb('glt') }));
    L.ok(g && g.as === 'glt' && !g.wk && g.nat && g.lv > -60 && g2 && g2.f > g.f && g2.y > 0.6 && kq[1] > kq[0] && glow === 1 && after.left === 0, `no AudioWorklet: Glut plays its own native loop (cost ${g && g.cost}, ${g && g.lv.toFixed(1)} dBFS), the finger slides it (${g && g.f.toFixed(0)} → ${g2 && g2.f.toFixed(0)} Hz, y ${g2 && g2.y.toFixed(2)}, mode ${g2 && g2.m}), Hitze reaches it (Q ${kq.map((q) => q.toFixed(1)).join(' → ')}), let go it glows, then ends`);
    L.ok(after.note === '⌁ Dieser Browser spielt Glut vereinfacht (kein AudioWorklet).' && after.mx === 'Glut' && after.fb === '', `…its section says „${after.note}“, no stand-in named (mixer „${after.mx}“)`);
    }
    L.ok(!errors.length, 'no console errors without AudioWorklet ' + errors.join(' | '));
    await ctx.close();
  }
  // -- in a frame (claude.ai): one hint to open it in its own tab
  {
    const ctx = await browser.newContext({ viewport: { width: 800, height: 900 } }); const page = await ctx.newPage();
    await page.goto(process.env.KN_FRAME || URL_.replace(/([^/]*)-inst\/index\.html$/, '$1-frame.html'));   // a parent page from the same server (a secure context: AudioWorklet exists; kn-inst → kn-frame.html)
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
