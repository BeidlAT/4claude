// Glut demos for the ear (WAV + spectrogram in ../demo/): a held flare with Glimmen, the jump and the afterglow; a level-3
// chord; Puls hits; Hitze; Sprung 2; the native loop doing the same gesture.   node demo-glt.js
process.env.SEED_BLOBS = '';
const { chromium, openInst } = require('../../v2/lib');
const L = require('./dsplib'), path = require('path');
const URL_ = process.env.KD_URL || 'http://127.0.0.1:8790/kd-glt-inst/index.html';
const OUT = path.join(__dirname, '..', 'demo');
// a render: notes [[t, f, y, {rel, burst, gate, moves: [[t, y]]}]], params, level, native
async function render(page, o) {
  const r = await page.evaluate(async (o) => {
    const M = window.__M; M.P['dev.q'] = o.q || '1';
    const ctx = await window.__off(48000, o.dur, Object.assign({ 'dev.lat': 'std', 'v.eng': 'glt' }, o.params || {}, o.nat ? { 'v.eng': 'neb' } : {}));
    M.getQ().budget = 1e4; if (!o.nat) await M.ensureDSP(ctx);
    const at = (t, fn) => { ctx.suspend(Math.round(t * 375) / 375).then(() => { fn(); ctx.resume(); }); ctx.suspend(Math.round(t * 375) / 375 + 1 / 375).then(() => ctx.resume()); };
    for (const [t, f, y, n] of o.notes) {
      let v = null;
      at(t, () => { v = n.burst ? M.hit('glt', ctx.currentTime, f, y, n.vel || 0.75, { gate: n.gate }) : M.playNote('glt', ctx.currentTime, f, y, n.vel || 0.75, { pan: n.pan || 0 }); });
      for (const [tm, yy] of n.moves || []) at(tm, () => { if (v && v.setY) v.setY(yy); });
      if (n.rel != null) at(n.rel, () => { if (v && v.release) v.release(); });
    }
    const b = await ctx.startRendering();
    return { L: Array.from(b.getChannelData(0)), R: Array.from(b.getChannelData(1)) };
  }, o);
  const file = path.join(OUT, o.name + '.wav'); L.wav(file, Float32Array.from(r.L), Float32Array.from(r.R), 48000); L.spectro(file);
  console.log(o.name + ': peak ' + L.db(Math.max(L.peak(Float32Array.from(r.L)), L.peak(Float32Array.from(r.R)))).toFixed(1) + ' dBFS → ' + file);
}
const sweep = (t0, y0, t1, y1, steps = 20) => Array.from({ length: steps + 1 }, (_, i) => [t0 + (t1 - t0) * i / steps, y0 + (y1 - y0) * i / steps]);
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const { page } = await openInst(browser, URL_, false);
  // 1. one finger: a ping low (y 0.15), the flare to 0.6 (grows, swings in, breathes), up to the twelfth (0.95), back, let go
  const gesture = [[0.2, 147, 0.15, { moves: [...sweep(1.5, 0.15, 2.0, 0.6), [7.0, 0.95], [9.0, 0.6]], rel: 11 }]];
  await render(page, { name: 'glt-1-finger-flare-jump-afterglow', dur: 13.5, notes: gesture, params: { 'rev.mix': 0.25 } });
  await render(page, { name: 'glt-1n-native-same-gesture', dur: 13.5, notes: gesture, params: { 'rev.mix': 0.25 }, nat: true });
  // 2. a chord at level 3 (two loops per note, L/R), glowing on 4 s
  await render(page, { name: 'glt-2-chord-L3', q: '3', dur: 12, params: { 'glt.nachgluehen': 4, 'rev.mix': 0.35 }, notes: [[0.2, 110, 0.65, { rel: 6.5, pan: -0.3 }], [0.7, 164.8, 0.65, { rel: 6.5 }], [1.2, 277.2, 0.7, { rel: 6.5, pan: 0.3 }]] });
  // 3. Puls: sixteenths at 120 bpm (gate 0.11), every fourth a long gate (0.5 s: a swelling chord tone)
  { const notes = [], sc = [220, 261.6, 293.7, 329.6, 392, 440]; for (let i = 0; i < 32; i++) notes.push([0.2 + i * 0.125, sc[(i * 5) % 6] * (i % 8 < 4 ? 1 : 0.5), 0.6, { burst: true, gate: i % 4 === 0 ? 0.5 : 0.11 }]);
    await render(page, { name: 'glt-3-puls-sixteenths', dur: 7.5, notes, params: { 'rev.mix': 0.2 } }); }
  // 4. Hitze 0 / 0.5 / 1 on the same note (y 0.7), one after the other
  for (const h of [0, 0.5, 1]) await render(page, { name: 'glt-4-hitze-' + h, dur: 4, notes: [[0.2, 196, 0.7, { rel: 3 }]], params: { 'glt.hitze': h } });
  // 5. Sprung 2 (octave): up and down twice
  await render(page, { name: 'glt-5-sprung-oktave', dur: 9, notes: [[0.2, 196, 0.6, { moves: [[2, 0.82], [3.5, 0.6], [5, 0.82], [6.5, 0.6]], rel: 7.5 }]], params: { 'glt.sprung': '2' } });
  // 6. the threshold: a finger resting just above it (y 0.33) – Glimmen makes it swell and sink
  await render(page, { name: 'glt-6-threshold-glimmen', dur: 12, notes: [[0.2, 220, 0.33, { rel: 10 }]] });
  await browser.close();
})();
