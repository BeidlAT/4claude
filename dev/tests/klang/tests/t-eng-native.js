// Stage 2's native engines in a live (real-time) session (klang SPEC §7.2 t-eng-live, §6.6–6.7): Elmsfeuer and
// Jahresring chosen by their tile, a finger held and moved (Elmsfeuer: setF/setY; Jahresring: a hit), let go, a MIDI
// keyboard with the wheel, Puls lanes at level 3; Elmsfeuer's jumps and a knob that follows live; Jahresring's year
// (runs with the sound, stands while it is suspended or the page hidden), its section text, Verjüngen, Schlafen,
// the Rassel; and both without AudioWorklet (they need none).   node t-eng-native.js   (slot kn-inst, run-all.sh)
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const L = require('./dsplib');
const URL_ = process.env.KN_URL || 'http://127.0.0.1:8790/kn-inst/index.html';
async function open(browser, o = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
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
    window.__lvl = () => { const A = window.__M.A, b = new Float32Array(A.analyser.fftSize); A.analyser.getFloatTimeDomainData(b); let s = 0; for (const x of b) s += x * x; return 10 * Math.log10(s / b.length + 1e-20); };
  }, !!o.noWorklet);
  await page.goto(URL_); await page.waitForFunction(() => !!window.__M);
  return { page, errors, ctx };
}
const settle = (page, ms) => page.evaluate((ms) => window.__sleep(ms), ms);
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const { page, errors, ctx } = await open(browser);
  await page.click('#btnStart'); await settle(page, 700);
  for (const key of ['elm', 'jrg']) {
    await page.evaluate(() => window.__M.openPanel('klang'));
    await page.click('#p-v-eng .kq-name'); await page.click('.kq-fams .chip[data-fam="alle"]'); await page.click(`.kq-tile[data-k="${key}"] .kq-pick`); await page.click('.kq-done');
    const st = await page.evaluate((key) => { const M = window.__M; return { eng: M.P['v.eng'], sec: !M.engSecs[key].hidden, want: M.dspWanted(), chip: document.querySelector('#engName').textContent, fb: M.kqFb(key) }; }, key);
    L.ok(st.eng === key && st.sec && !st.want && !st.fb, `${key}: its tile selects it, its section shows, no module wanted, no stand-in (${st.chip})`);
    await page.evaluate(() => window.__M.closePanel && window.__M.closePanel());
    await settle(page, 200);
    const box = await page.locator('#cvFx').boundingBox();
    await settle(page, key === 'jrg' ? 2600 : 900);   // (the tile's probe has ended)
    const t0 = await page.evaluate(() => window.__M.A.ctx.currentTime);
    await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.2); await page.mouse.down(); await settle(page, 120);
    const held = await page.evaluate(([key, t0]) => { const v = [...window.__M.A.voices].find((v) => v.alive && v.eng === key && v.t0 >= t0 && !v.probe); return v ? { as: v.as, wk: !!v.wk, cost: v.cost, released: v.released } : null; }, [key, t0]);
    let lv = -200;
    for (let i = 1; i <= 8; i++) { await page.mouse.move(box.x + box.width * (0.3 + i * 0.05), box.y + box.height * (0.2 + i * 0.08)); await settle(page, 60); lv = Math.max(lv, await page.evaluate(() => window.__lvl())); }
    await page.mouse.up(); await settle(page, key === 'jrg' ? 2600 : 900);
    const after = await page.evaluate((key) => [...window.__M.A.voices].filter((v) => v.eng === key && v.alive).length, key);
    L.ok(held && held.as === key && !held.wk && held.released === (key === 'jrg') && lv > -60 && after === 0, `${key}: a finger plays it natively (cost ${held && held.cost}${key === 'jrg' ? ', struck' : ', held: slides up the field'}) at up to ${lv.toFixed(1)} dBFS, lets go – voices freed ` + JSON.stringify({ held, after }));
    await page.evaluate(() => { window.__send([0x90, 60, 100]); }); await settle(page, 200);
    await page.evaluate(() => { window.__send([0xe0, 0x7f, 0x7f]); }); await settle(page, 150);
    const midi = await page.evaluate((key) => { const v = [...window.__M.A.voices].find((v) => v.alive && v.eng === key); return v ? { as: v.as, bend: window.__M.A.bendCents } : null; }, key);
    await page.evaluate(() => { window.__send([0xe0, 0, 0x40]); window.__send([0x80, 60, 0]); }); await settle(page, key === 'jrg' ? 2600 : 900);
    L.ok(midi && midi.as === key && midi.bend > 100, `${key}: a MIDI key plays it, the wheel bends it (${midi && midi.bend} ct on the bus)`);
    const busy = await page.evaluate(async (key) => {
      const M = window.__M; M.setParam('v.eng', 'neb'); M.setParam('v.layer', key); M.setParam('l0.eng', key); M.setParam('l0.on', true); M.setParam('l1.eng', key); M.setParam('l1.on', true);
      M.setParam('dev.q', '3'); M.seqStart(); let maxV = 0, maxL = 0, n = 0;
      for (let i = 0; i < 40; i++) { await window.__sleep(50); maxV = Math.max(maxV, M.A.voices.size); maxL = Math.max(maxL, M.voiceLoad()); n = Math.max(n, [...M.A.voices].filter((v) => v.eng === key && v.alive).length); }
      M.seqStop(); M.setParam('dev.q', '1'); M.setParam('l0.on', false); M.setParam('l1.on', false); M.setParam('v.layer', 'off'); M.setParam('v.eng', key);
      await window.__sleep(key === 'jrg' ? 3500 : 900);
      return { maxV, maxL: +maxL.toFixed(2), vb: M.getBudget()[0], n, left: M.A.voices.size, mx: M.mxSrcText('l0') };
    }, key);
    L.ok(busy.n > 0 && busy.maxL <= busy.vb + 1e-9 && busy.left === 0, `${key}: Puls lanes at level 3 play it (up to ${busy.n} voices, max load ${busy.maxL} ≤ ${busy.vb}), all end`);
  }
  // Elmsfeuer: a held arc jumps now and then (elmTick), a knob turned while it sounds reaches it (v.upd)
  { const r = await page.evaluate(async () => {
      const M = window.__M, A = M.A; M.setParam('v.eng', 'elm');
      const v = M.playNote('elm', A.ctx.currentTime + 0.01, 220, 0.9, 0.7, {}); let n = 0; const j = v.jump; v.jump = (at) => { n++; j(at); };
      await window.__sleep(4000); const jumps = n;
      const c0 = v.parts.sides[0].cg.gain.value; M.setParam('elm.knistern', 0); await window.__sleep(300); const c1 = v.parts.sides[0].cg.gain.value; M.setParam('elm.knistern', 0.5);
      v.release(); await window.__sleep(900);
      return { jumps, c0, c1, held: M.ELM.held.size, left: A.voices.size, macro: [M.macroId(0), M.macroId(1)], mx: M.mxSrcText('fin'), group: M.GROUP.elm + '/' + M.GROUP.jrg };
    });
    L.ok(r.jumps >= 4 && r.jumps <= 12 && r.held === 0, `elm: a held arc jumps ${r.jumps}× in 4 s (≤ 3/s), forgotten after the release`);
    L.ok(r.c0 > 0.01 && r.c1 < 0.002 && r.left === 0, `elm: Knistern turned to 0 while it sounds silences the corona (${r.c0.toFixed(3)} → ${r.c1.toFixed(4)})`);
    L.ok(r.macro.join() === 'elm.spannung,elm.knistern' && r.mx === 'Elmsfeuer' && r.group === 'Elmsfeuer/Jahresring', `MACRO A/B ${r.macro}, mixer source „${r.mx}“, MIDI groups ${r.group}`); }
  // Jahresring: the year runs with the sound (Jahr 0.5 min: 1/30 of the year per second), stands while suspended or hidden
  { const r = await page.evaluate(async () => {
      const M = window.__M, A = M.A; M.setParam('v.eng', 'jrg'); M.setParam('jrg.jahreszeit', 'lauf'); M.setParam('jrg.jahr', 0.5);
      const d = (a, b) => (((b - a) % 1) + 1) % 1;
      const s0 = A.season; await window.__sleep(1500); const s1 = A.season;
      await A.ctx.suspend(); await window.__sleep(1200); const s2 = A.season;
      await A.ctx.resume(); await window.__sleep(600); const s3 = A.season;
      Object.defineProperty(document, 'hidden', { value: true, configurable: true }); await window.__sleep(800); const s4 = A.season;
      delete document.hidden; await window.__sleep(400); const s5 = A.season;
      M.setParam('jrg.jahr', 4);
      return { run: d(s0, s1) * 30, sus: d(s1, s2) * 30, back: d(s2, s3) * 30, hid: d(s3, s4) * 30, again: d(s4, s5) * 30 };
    });
    L.ok(r.run > 1.2 && r.run < 1.8, `jrg: the year runs with the sound (${r.run.toFixed(2)} s of 1.5 s on a 30-s year)`);
    L.ok(r.sus < 0.05 && r.back > 0.35 && r.back < 0.9, `jrg: it stands while the sound is suspended (${r.sus.toFixed(3)} s in 1.2 s) and goes on without a jump (${r.back.toFixed(2)} s in 0.6 s)`);
    L.ok(r.hid < 0.05 && r.again > 0.2, `jrg: it stands while the page is hidden (${r.hid.toFixed(3)} s in 0.8 s), then runs again`); }
  // the section: „Jetzt: … (m:ss im Jahr) · Ringe: n“, Verjüngen, a fixed season, Schlafen
  { await page.evaluate(() => window.__M.openPanel('klang')); await settle(page, 1300);
    const t1 = await page.evaluate(() => { const M = window.__M; M.A.jrgAge = 412; return true; }) && await page.evaluate(async () => { await window.__sleep(1200); return window.__M.engSecs.jrg.jrgNow.textContent; });
    await page.getByRole('button', { name: 'Verjüngen' }).click(); await settle(page, 100);
    const t2 = await page.evaluate(() => [window.__M.engSecs.jrg.jrgNow.textContent, window.__M.A.jrgAge, document.querySelector('#toastMsg').textContent]);
    await page.evaluate(() => window.__M.setParam('jrg.jahreszeit', 'winter')); await settle(page, 100);
    const t3 = await page.evaluate(() => [window.__M.engSecs.jrg.jrgNow.textContent, window.__M.A.season]);
    await page.evaluate(() => window.__M.setParam('jrg.jahreszeit', 'lauf'));
    L.ok(/^Jetzt: (Frühling|Sommer|Herbst|Winter) \(\d+:\d\d im Jahr\) · Ringe: 412$/.test(t1), `jrg: the section tells the year and the rings: „${t1}“`);
    L.ok(/Ringe: 0$/.test(t2[0]) && t2[1] === 0 && /jung/.test(t2[2]), `jrg: Verjüngen – „${t2[0]}“, toast „${t2[2]}“`);
    L.ok(t3[0] === 'Jetzt: Winter (fest) · Ringe: 0' && t3[1] === 0.75, `jrg: a fixed season: „${t3[0]}“, the year goes on from there (${t3[1]})`);
    await page.evaluate(() => window.__M.closePanel && window.__M.closePanel());
    const sl = await page.evaluate(async () => { const M = window.__M; M.A.jrgAge = 99; M.slpEnter(); await window.__sleep(200); const a = M.A.jrgAge; M.slpWake(); await window.__sleep(300); return a; });
    L.ok(sl === 0, `jrg: Schlafen makes the bar young again (age ${sl})`);
    const rs = await page.evaluate(() => { const M = window.__M; M.GK.p.rasS = 'jrg'; M.gkCheck(); const a = M.GK.p.rasS; M.GK.p.rasS = 'elm'; M.gkCheck(); const b = M.GK.p.rasS; M.GK.p.rasS = 'trp'; return [a, b, M.RG_S.map((x) => x[0]).includes('jrg'), M.RG_S.map((x) => x[0]).includes('elm')]; });
    L.ok(rs[0] === 'jrg' && rs[1] === 'trp' && rs[2] && !rs[3], `the Rassel takes Jahresring (not Elmsfeuer: ${rs[1]}), the Sporenregen strikes it, never the held Elmsfeuer`); }
  const errs = errors.filter((e) => !/myzel-dsp\.js|Failed to load resource/.test(e));
  L.ok(!errs.length, 'no console errors ' + errs.join(' | '));
  await ctx.close();
  // -- without AudioWorklet: both play as they are, nothing said
  { const { page, errors, ctx } = await open(browser, { noWorklet: true });
    await page.click('#btnStart'); await settle(page, 300);
    const r = await page.evaluate(async () => {
      const M = window.__M, A = M.A; M.setParam('v.eng', 'elm');
      const v = M.playNote('elm', A.ctx.currentTime + 0.01, 220, 0.8, 0.7, {}), w = M.playNote('jrg', A.ctx.currentTime + 0.01, 330, 0.3, 0.7, {});
      await window.__sleep(300); const lv = window.__lvl(); v.release(); await window.__sleep(2500);
      return { as: [v.as, w.as], lv, left: A.voices.size, fb: [M.kqFb('elm'), M.kqFb('jrg')], toast: document.querySelector('#toastMsg').textContent };
    });
    L.ok(r.as.join() === 'elm,jrg' && r.lv > -60 && r.left === 0 && !r.fb[0] && !r.fb[1] && !/vereinfacht|AudioWorklet/.test(r.toast), `no AudioWorklet: Elmsfeuer and Jahresring play as themselves (${r.lv.toFixed(1)} dBFS), no stand-in, nothing to say`);
    L.ok(!errors.length, 'no console errors without AudioWorklet ' + errors.join(' | '));
    await ctx.close(); }
  await browser.close();
  process.exit(L.summary() ? 1 : 0);
})().catch((e) => { console.log('FAIL fatal ' + (e && e.stack || e)); process.exit(1); });
