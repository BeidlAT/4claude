// Ladung live (slot gl): shaking (real DeviceMotionEvents) charges the store, the mod targets follow it with their
// amounts (Körner, Tropfen, Puls, Leiern, Ausdruck), it drains over the Entladung, the Geflecht glows and the ring of the
// symbol in the bar fills; walking and handling on the table do not charge; the switch, a learned binding of Ladung
// ("Eigene"), the Wächter; a big screen gets a gentler share; the patch is never written; a recording in bars made
// while charging keeps its exact length and beats; the card.   node t-gl-ladung.js
const { open, ok, close, probes, drivers, M, play, gestik, L } = require('./gl-h');
const near = (a, b, e) => Math.abs(a - b) <= e;
// a sampler in the page: what Ladung gives and moves, every 40 ms
const sampler = (page) => page.evaluate(() => {
  const M = window.__M, t0 = performance.now(); window.__smp = [];
  clearInterval(window.__si);
  window.__si = setInterval(() => { const o = { t: performance.now(), el: performance.now() - t0, lad: M.GK.out.ladung, lvl: M.LAD.lvl, ro: M.LAD.ro }; for (const k in M.LAD_AMT) o[k] = M.modVal(k); window.__smp.push(o); }, 40);
});
const samples = (page) => page.evaluate(() => { clearInterval(window.__si); return window.__smp; });
(async () => {
  {
    const { page, errors } = await open({ mobile: true, cfg: { perm: 'granted' } });
    await probes(page); await drivers(page);
    await page.evaluate(async () => { const M = window.__M; M.loadPreset(M.PRESETS.find((p) => p.key) || M.PRESETS[0]); await window.__sleep(800); });
    await gestik(page);
    const before = await page.evaluate(() => {
      const M = window.__M, W = (window.__w = { set: {}, toast: 0 });
      const si = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k, v) { W.set[k] = (W.set[k] || 0) + 1; return si.call(this, k, v); };
      new MutationObserver(() => { if (document.querySelector('#toast').classList.contains('show')) W.toast++; }).observe(document.querySelector('#toast'), { attributes: true, attributeFilter: ['class'] });
      return { P: window.__g.patch(), preset: M.UI.preset, ir: M.A.irJob };
    });
    ok(await page.evaluate(() => !document.querySelector('#btnGk').hidden && window.__M.GK.p.lad === true), 'Gestik on: the symbol shows in the bar, Ladung is on by default');
    // ---- a 2 s shake ----
    await sampler(page);
    await play(page, 5.5, M.shake(2, 16, 5, 0.3));
    const s = await samples(page);
    const pk = s.reduce((m, x) => (x.lad > m.lad ? x : m), s[0]);
    ok(pk.lad > 0.6, 'shaking for 2 s charges the Ladung (' + pk.lad.toFixed(2) + ')');
    const q = (x) => Math.round(x * 512) / 512, e = (x) => (x < 0.01 ? 0 : x);
    const amtOk = s.every((x) => Object.keys(x).filter((k) => !['t', 'el', 'lad', 'lvl', 'ro'].includes(k)).every((k) => near(x[k], q(x.ro * { korD: 0.8, korS: 0.7, trp: 0.8, pulsD: 0.7, pulsH: 0.5, wow: 0.6, expr: 0.35 }[k]), 1e-9)));
    ok(amtOk && s.every((x) => Math.abs(x.ro - e(x.lvl)) <= 0.05 + 1e-9), 'Körner-Dichte ×0.8, -Streuung ×0.7, Tropfen-Regen ×0.8, Puls-Dichte ×0.7, -Helligkeit ×0.5, Leiern ×0.6, Ausdruck ×0.35 of the charge (20 times a second, in steps of 1/512, empty below 1 %), every sample (' + s.length + ')');
    ok(pk.korD > 0.45 && pk.wow > 0.35 && pk.expr > 0.2, 'at the top: Körner-Dichte ' + pk.korD.toFixed(2) + ', Leiern ' + pk.wow.toFixed(2) + ', Ausdruck ' + pk.expr.toFixed(2));
    // the discharge with the default Entladung (8 s): e^-1 after 8/3 s
    const i0 = s.findIndex((x) => x.t > pk.t + 600), x0 = s[i0], x1 = s.find((x) => x.t >= x0.t + 1500);
    const want = Math.exp(-(x1.t - x0.t) / 1000 / (8 / 3));
    ok(x0 && x1 && near(x1.lad / x0.lad, want, 0.06), 'it drains over the Entladung (8 s): after ' + Math.round(x1.t - x0.t) + ' ms ' + (100 * x1.lad / x0.lad).toFixed(0) + ' % left (expected ' + (100 * want).toFixed(0) + ' %)');
    // the visuals: the Geflecht glows, the ring fills
    await play(page, 1.6, M.shake(1.3, 16, 5, 0.1));
    const vis = await page.evaluate(() => { const M = window.__M, b = document.querySelector('#btnGk'); return { gk: M.VIS.gk, lad: M.VIS.lad, sv: M.VIS.sv, sa: M.VIS.sa, ring: +b.querySelector('.lad').getAttribute('stroke-dasharray').split(' ')[0], st: b.dataset.st, label: b.getAttribute('aria-label') }; });
    ok(vis.gk && vis.lad > 0.4 && vis.sv > 1.5 && vis.sa > 1.3, 'the Geflecht glows: spores rise faster (×' + vis.sv.toFixed(1) + ') and brighter (×' + vis.sa.toFixed(1) + '), hyphae sprout from them');
    ok(vis.ring >= 40 && vis.ring <= 100, 'the ring around the symbol fills like a tank (' + vis.ring + ' %)');
    ok(/^Gestik: /.test(vis.label), 'the symbol says what Gestik does: „' + vis.label + '“');
    // ---- Entladung 0.3 s: a rattle ----
    await page.evaluate(() => window.__M.gkSet('entl', 0.3));
    await sampler(page);
    await play(page, 3, M.shake(1.5, 16, 5, 0.3));
    const r = await samples(page);
    const rp = r.reduce((m, x) => (x.lad > m.lad ? x : m), r[0]), after = r.find((x) => x.el > 1800 + 600);
    ok(rp.lad > 0.3 && after && after.lad < 0.03 && after.korD < 0.03, 'Entladung 0.3 s: a rattle – it sounds while shaking (' + rp.lad.toFixed(2) + ') and is gone 0.6 s after the shake (' + (after ? after.lad.toFixed(3) : '?') + ')');
    // ---- Entladung 30 s: a capacitor ----
    await page.evaluate(() => window.__M.gkSet('entl', 30));
    await play(page, 3.5, M.shake(2, 16, 5, 0.3));
    const c1 = await page.evaluate(() => window.__M.GK.out.ladung);
    await play(page, 3, M.hold(45));
    const c2 = await page.evaluate(() => window.__M.GK.out.ladung);
    ok(c1 > 0.5 && c2 / c1 > 0.65 && c2 / c1 < 0.85, 'Entladung 30 s: a capacitor – 3 s later still ' + (100 * c2 / c1).toFixed(0) + ' % (≈ 74 %)');
    await page.evaluate(() => { window.__M.gkSet('entl', 8); window.__M.GK.R.st.lad = 0; });
    await play(page, 0.5, M.hold(45));
    // ---- what must not charge ----
    await sampler(page);
    await play(page, 12, M.walk());
    let w = await samples(page);
    ok(Math.max(...w.map((x) => x.lad)) < 0.08 && Math.max(...w.map((x) => x.korD)) < 0.07, 'walking for 12 s with the phone in hand: no charge (max ' + Math.max(...w.map((x) => x.lad)).toFixed(3) + ')');
    await sampler(page);
    for (let i = 0; i < 3; i++) { await play(page, 1.8, (t) => ({ beta: 45 - 45 * L.smooth(0.2, 1, t), lin: [0, 0, t > 1 && t < 1.03 ? 5 : 0] })); await play(page, 1.5, (t) => ({ beta: 45 * L.smooth(0.2, 1, t), lin: [0, 1.2 * Math.sin(Math.PI * Math.min(1, Math.max(0, (t - 0.2) / 0.8))), 2 * Math.sin(Math.PI * Math.min(1, Math.max(0, (t - 0.2) / 0.8)))] })); }
    w = await samples(page);
    ok(Math.max(...w.map((x) => x.lad)) < 0.08, 'put down on the table and picked up again, three times: no charge (max ' + Math.max(...w.map((x) => x.lad)).toFixed(3) + ')');
    // ---- the switch ----
    await page.evaluate(() => window.__M.openPanel('dev'));
    await page.waitForSelector('.gk-card [data-kc$=":lad"]');
    await page.click('.gk-card [data-kc$=":lad"]');
    await play(page, 2.6, M.shake(2, 16, 5, 0.3));
    const off = await page.evaluate(() => { const M = window.__M; const o = { lad: M.GK.out.ladung, p: M.GK.p.lad, vis: M.VIS.lad }; for (const k in M.LAD_AMT) o[k] = M.modVal(k); return o; });
    ok(!off.p && off.lad > 0.4 && Object.keys(off).filter((k) => !['lad', 'p', 'vis'].includes(k)).every((k) => off[k] === 0) && off.vis === 0, 'Ladung off: the axis still charges (' + off.lad.toFixed(2) + ' – for assignments), nothing moves, the Geflecht stays calm');
    await page.click('.gk-card [data-kc$=":lad"]');
    // ---- a learned binding of Ladung wins ("Eigene") ----
    await page.evaluate(() => { const M = window.__M; M.MAP.user.push({ dev: 'Gestik', ch: -1, type: 'axis', num: 4, target: 'mod.flt', mode: 'abs' }); M.MAP.v++; });
    await play(page, 2.6, M.shake(2, 16, 5, 0.3));
    const own = await page.evaluate(() => { const M = window.__M; return { korD: M.modVal('korD'), wow: M.modVal('wow'), flt: M.modVal('flt'), lad: M.GK.out.ladung }; });
    ok(own.korD === 0 && own.wow === 0 && own.flt > 0.3, 'Ladung assigned to the Filter (Eigene): the binding acts (' + own.flt.toFixed(2) + '), Ladung’s own targets rest');
    await page.evaluate(() => { const M = window.__M; M.MAP.user.length = 0; M.MAP.v++; });
    // ---- the Wächter: the sensor falls silent while charged ----
    await play(page, 2.4, M.shake(2, 16, 5, 0.2));
    const w0 = await page.evaluate(() => window.__M.modVal('korD'));
    await page.waitForTimeout(700);
    const w1 = await page.evaluate(() => { const M = window.__M; return { korD: M.modVal('korD'), lad: M.GK.out.ladung, raw: M.GK.raw.ladung, ico: document.querySelector('#btnGk .lad').getAttribute('stroke-dasharray') }; });
    ok(w0 > 0.3 && w1.korD === 0 && w1.lad === 0 && w1.raw > 0.2 && w1.ico === '0 100', 'the sensor falls silent (screen off, app in the background): within 0.7 s everything is back at rest (Körner ' + w0.toFixed(2) + ' → 0, ring empty)');
    await play(page, 1, M.hold(45));
    // ---- the patch ----
    const aft = await page.evaluate(() => ({ P: window.__g.patch(), preset: window.__M.UI.preset, ir: window.__M.A.irJob, w: window.__w }));
    const patchKeys = Object.keys(aft.w.set).filter((k) => k !== 'myzel.gestik.v1' && k !== 'myzel.midimap.v1');
    ok(aft.P === before.P && aft.preset === before.preset && aft.ir === before.ir && !patchKeys.length && !aft.w.toast, 'the patch is never written: values, preset mark, no save (' + (patchKeys.join(', ') || 'only Gestik’s own settings') + '), no toast, no new hall');
    ok(!errors.length, 'no errors ' + errors.join(' | '));
    await page.context().close();
  }
  // ---- a big screen (an iPad on a stand): a gentler share ----
  {
    const { page, errors } = await open({ cfg: { perm: 'granted' } });
    await gestik(page);
    await sampler(page);
    await play(page, 3, M.shake(2, 16, 5, 0.3));
    const s = await samples(page);
    const big = await page.evaluate(() => window.__M.gkBig());
    const q = (x) => Math.round(x * 512) / 512, e = (x) => (x < 0.01 ? 0 : x);
    ok(big && s.every((x) => near(x.korD, q(x.ro * 0.8 * 0.6), 1e-9) && near(x.wow, q(x.ro * 0.6 * 0.6), 1e-9)) && Math.max(...s.map((x) => x.lvl)) > 0.5, 'a big screen (by size): the same charge, 60 % of the share (Körner ' + Math.max(...s.map((x) => x.korD)).toFixed(2) + ')');
    ok(!errors.length, 'no errors ' + errors.join(' | '));
    await page.context().close();
  }
  // ---- a recording in bars while the Ladung charges: exact length, hits on the beats ----
  {
    const { page, errors } = await open({ cfg: { perm: 'granted' } });
    await gestik(page);
    await page.evaluate(async () => {
      const M = window.__M, set = (k, v) => M.setParam(k, v);
      window.__untilIdle = async (max = 20000) => { const t0 = performance.now(); while ((M.CAP.state !== 'idle' || M.CAP.finishing) && performance.now() - t0 < max) await window.__sleep(50); };
      window.__onsets = (L, thr = 0.02, gap = 2000) => { const out = []; let last = -1e9; for (let i = 0; i < L.length; i++) if (Math.abs(L[i]) > thr && i - last > gap) { out.push(i); last = i; } else if (Math.abs(L[i]) > thr) last = i; return out; };
      set('rev.mix', 0); set('dly.mix', 0); set('cho.mix', 0); set('pha.mix', 0); set('drv.mix', 0.35); set('bor.on', false); set('dly.wow', 0);
      set('seq.bpm', 120); set('seq.swing', 0); set('v.human', 0);
      for (let i = 1; i < 4; i++) set('l' + i + '.on', false);
      set('l0.on', true); set('l0.eng', 'mem'); set('l0.steps', 4); set('l0.puls', 4); set('l0.rot', 0); set('l0.div', '1'); set('l0.prob', 1); set('l0.walk', 0); set('l0.vol', 0.9);
      set('rec.len', 'bars'); set('rec.tail', false); set('rec.arm', false); set('rec.bars', 2);
      M.seqStart(); await window.__sleep(1000);
      M.recToggle();
    });
    const shook = play(page, 4.2, M.shake(3.2, 16, 5, 0.1));
    const r = await page.evaluate(async () => {
      const M = window.__M; await window.__sleep(1500); const lad = M.GK.out.ladung, pd = M.modVal('pulsD');
      await window.__untilIdle(); M.seqStop();
      const tk = M.takes[0]; let n = 0; for (const a of tk.L) n += a.length; const L = new Float32Array(n); let o = 0; for (const a of tk.L) { L.set(a, o); o += a.length; }
      return { lad, pd, frames: tk.frames, bars: tk.bars, sr: M.A.ctx.sampleRate, on: window.__onsets(L) };
    });
    await shook;
    const barF = 4 * 60 / 120 * r.sr, beats = r.on.map((x) => x / (barF / 4));
    ok(r.lad > 0.3 && r.pd > 0.2, 'during the recording the Ladung charges (' + r.lad.toFixed(2) + ', Puls-Dichte ' + r.pd.toFixed(2) + ')');
    ok(r.frames === Math.round(2 * barF) && r.bars === 2, 'the recording keeps its exact length: ' + r.frames + ' frames = 2 bars');
    ok(r.on.length >= 8 && beats.every((b) => Math.abs(b - Math.round(b)) < 0.02) && r.on[0] < 200, 'the Puls’s hits stay on the beats (' + r.on.length + ' onsets, first at sample ' + r.on[0] + ')');
    ok(!errors.length, 'no errors ' + errors.join(' | '));
    await page.context().close();
  }
  // ---- the card ----
  {
    const { page, errors } = await open({ mobile: true, cfg: { perm: 'granted' } });
    await gestik(page);
    await page.evaluate(() => window.__M.openPanel('dev'));
    await page.waitForSelector('.gk-card .gk-lad');
    const card = await page.evaluate(async () => {
      const M = window.__M, C = M.GK.card;
      C.lad.open = true; M.gkCardSync();
      const rng = C.lad.querySelector('input[type=range]');
      rng.value = 100; rng.dispatchEvent(new Event('input'));
      const e30 = { p: M.GK.p.entl, r: M.GK.R.opts.entl, txt: C.eTxt.textContent };
      rng.value = 0; rng.dispatchEvent(new Event('input'));
      const e03 = { p: M.GK.p.entl, txt: C.eTxt.textContent };
      rng.value = 70; rng.dispatchEvent(new Event('input'));
      return { e30, e03, sum: C.ladSum.textContent, sw: [...C.el.querySelectorAll('.kc-opts .sw .lab')].map((x) => x.textContent), inLad: !!C.lad.querySelector('.gk-entl'), outside: C.el.querySelectorAll('.gk-entl').length, rasHidden: C.rasBox.hidden, stored: JSON.parse(localStorage.getItem('myzel.gestik.v1')).entl };
    });
    ok(card.e30.p === 30 && card.e30.r === 30 && /Aufbau über viele Takte/.test(card.e30.txt) && card.e03.p === 0.3 && /Rassel/.test(card.e03.txt) && card.stored === 7.5, 'the Entladung slider: 0.3 s (a rattle) … 30 s (many bars), the recogniser follows, stored (' + card.stored + ' s)');
    ok(card.inLad && card.outside === 1, 'the Entladung lives in „Ladung einstellen“');
    ok(['Ladung', 'Schlafen', 'Rassel-Schläge', 'Schwenken', 'Tank'].every((x) => card.sw.includes(x)) && card.rasHidden, 'switches: ' + card.sw.join(', ') + ' – the Rassel’s options fold away while it is off');
    ok(/Ladung/.test(await page.locator('.gk-card .gk-lad summary').textContent()) && /7,5 s/.test(card.sum), 'the summary says what is set: „' + card.sum.trim() + '“');
    // the symbol in the bar opens the card
    await page.evaluate(() => window.__M.closePanel());
    await page.click('#btnGk');
    await page.waitForTimeout(300);
    const tap = await page.evaluate(() => { const M = window.__M, r = M.GK.card.el.getBoundingClientRect(), b = document.querySelector('#sheetBody').getBoundingClientRect(); return { panel: M.UI.panel, top: r.top - b.top }; });
    ok(tap.panel === 'dev' && Math.abs(tap.top) < 40, 'a tap on the symbol in the bar opens the Gestik card (' + tap.panel + ', ' + Math.round(tap.top) + ' px from the top)');
    ok(!errors.length, 'no errors ' + errors.join(' | '));
    await page.context().close();
  }
  await close();
})().catch(async (e) => { console.error(e); process.exitCode = 1; await close(); });
