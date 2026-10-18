// Rassel-Schläge (slot gl): each swing of a shake strikes a Tropfen (Membran, Schale, Moder) – stamped at the top of the
// swing's acceleration, laid on the next 1/16 (1/32, or free) of the Puls's clock, never in the past, one per step, on
// the Klang strip; a held note gives its pitch; off: nothing; the Puls stopped: its beat clock still sets the grid.
//   node t-gl-rassel.js
const { open, ok, close, drivers, M, play, gestik } = require('./gl-h');
// every start of the three strike engines: when, which pitch, on which strip
const spy = (page) => page.evaluate(() => {
  const M = window.__M; window.__st = [];
  for (const e of ['trp', 'mem', 'sch', 'mdr', 'glo']) {
    const E = M.ENGINES[e];
    if (E.__spy) continue;
    const o = E.start; E.__spy = true;
    E.start = function (v, t, f, y, vel, opt) { window.__st.push({ e, t, f, y, vel, fin: !!opt && opt.bus === M.MIX.s.fin.in, now: M.A.ctx.currentTime }); return o.apply(this, arguments); };
  }
});
// (the grid is the Puls's own, its swing included: a strike sits at rgAt – the time the Puls gives that step)
const grab = (page) => page.evaluate(() => { const M = window.__M; return { hits: M.LAD.hits.map((h) => Object.assign({}, h, { beat: M.beatAt(h.t), g16: h.b == null ? null : M.rgAt(Math.round(h.b / 0.25), 0.25), g32: h.b == null ? null : M.rgAt(Math.round(h.b / 0.125), 0.125) })), st: window.__st.splice(0), bpm: M.SEQ.bpm }; });
const onGrid = (b, d) => Math.abs(b / d - Math.round(b / d)) < 1e-6;
(async () => {
  const { page, errors } = await open({ mobile: true, cfg: { perm: 'granted' } });
  await drivers(page);
  await gestik(page);
  await spy(page);
  // the Puls runs at 96 BPM with every lane off (its clock only)
  await page.evaluate(() => { const M = window.__M; M.setParam('seq.bpm', 96); for (let i = 0; i < 4; i++) M.setParam('l' + i + '.on', false); M.seqStart(); });
  // off by default: nothing
  await play(page, 2.5, M.shake(2, 16, 5, 0.2));
  let r = await grab(page);
  ok(!r.hits.length && !r.st.length, 'Rassel-Schläge are off by default: a shake strikes nothing');
  // on (the card's switch), 1/16
  await page.evaluate(() => window.__M.openPanel('dev'));
  await page.evaluate(() => { const C = window.__M.GK.card; C.lad.open = true; });
  await page.click('.gk-card [data-kc$=":ras"]');
  await page.evaluate(() => { window.__M.closePanel(); window.__M.LAD.hits.length = 0; });
  await play(page, 3, M.shake(2.4, 16, 5, 0.2));
  r = await grab(page);
  const d16 = 0.25, sixteenth = 60 / r.bpm / 4;
  ok(r.hits.length >= 10, 'a 2.4 s shake: ' + r.hits.length + ' strikes (one per swing, from when the shake is recognised)');
  ok(r.hits.every((h) => onGrid(h.b, d16) && Math.abs(h.t - h.g16) < 1e-6), 'every strike lies on a 1/16 of the Puls’s clock, swung as the Puls swings it (at rgAt)');
  ok(r.hits.every((h) => h.t > h.te && h.t - h.te < sixteenth + 0.12), 'each is the step after the swing’s top – never before it, at most a 1/16 + 120 ms later (' + Math.round(Math.max(...r.hits.map((h) => h.t - h.te)) * 1000) + ' ms max)');
  ok(new Set(r.hits.map((h) => h.t.toFixed(5))).size === r.hits.length, 'at most one strike per step');
  ok(r.st.length === r.hits.length && r.st.every((s) => s.e === 'trp' && s.fin && s.t >= s.now), 'each is a Tropfen on the Klang strip, scheduled ahead (' + r.st.length + ' starts, never in the past)');
  const harder = r.hits.slice().sort((a, b) => b.v - a.v);
  ok(r.st.every((s) => s.vel >= 0.3 && s.vel <= 0.8 && s.y >= 0.35 && s.y <= 0.85), 'strength → velocity 0.3–0.8 and brightness (' + harder[0].v.toFixed(2) + ' strongest)');
  // a held note gives the pitch
  const f = await page.evaluate(() => { const tt = window.__a.note(901, 0.62, 0.5); return tt.f; });
  await play(page, 2.5, M.shake(2, 16, 5, 0.2));
  r = await grab(page);
  ok(r.st.length >= 6 && r.st.every((s) => Math.abs(s.f - f) < 1e-6), 'with a note held, the strikes take its pitch (' + f.toFixed(1) + ' Hz)');
  await page.evaluate(() => window.__a.up(901));
  // without a note: steps of the scale in the middle of the field
  await play(page, 2.5, M.shake(2, 16, 5, 0.2));
  r = await grab(page);
  const fs = await page.evaluate(() => window.__M.N.notes.map((n) => n.f));
  ok(r.st.length >= 6 && r.st.every((s) => fs.some((x) => Math.abs(x - s.f) < 1e-6)) && new Set(r.st.map((s) => s.f)).size > 1, 'without a note: steps of the current scale (' + new Set(r.st.map((s) => s.f.toFixed(0))).size + ' different)');
  // Membran, 1/32
  await page.evaluate(() => { const M = window.__M; M.gkSet('rasS', 'mem'); M.gkSet('rasQ', '32'); M.LAD.hits.length = 0; });
  await play(page, 3, M.shake(2.4, 22, 6, 0.2));
  r = await grab(page);
  ok(r.st.length >= 8 && r.st.every((s) => s.e === 'mem') && r.hits.every((h) => onGrid(h.b, 0.125) && Math.abs(h.t - h.g32) < 1e-6) && r.hits.some((h) => !onGrid(h.b, 0.25)), 'Membran on 1/32: ' + r.hits.length + ' strikes, all on 1/32, some between the 1/16');
  // Schale, free
  await page.evaluate(() => { const M = window.__M; M.gkSet('rasS', 'sch'); M.gkSet('rasQ', 'frei'); M.LAD.hits.length = 0; });
  await play(page, 3, M.shake(2.4, 16, 5, 0.2));
  r = await grab(page);
  ok(r.st.length >= 8 && r.st.every((s) => s.e === 'sch') && r.hits.every((h) => h.b === null && h.t - h.te < 0.15), 'Schale, frei: at once after each top (≤ ' + Math.round(Math.max(...r.hits.map((h) => h.t - h.te)) * 1000) + ' ms), no grid');
  // Moder (klang stage 4): chosen, its module loads at once (no stand-in Glocke); a Kompostglocke per swing on the 1/16,
  // on its own processor, at most six ringing (LAD_VMAX)
  await page.evaluate(() => { const M = window.__M; M.gkSet('rasS', 'mdr'); M.gkSet('rasQ', '16'); M.LAD.hits.length = 0; });
  const ld = await page.evaluate(async () => { const M = window.__M; for (let i = 0; i < 150 && !(M.A.ctx && M.A.ctx.__dspOK); i++) await new Promise((r) => setTimeout(r, 20)); return !!M.A.ctx.__dspOK; });
  let wk = true, most = 0;
  await play(page, 3, M.shake(2.4, 16, 5, 0.2));
  ({ wk, most } = await page.evaluate(() => { const vs = [...window.__M.A.voices].filter((v) => v.alive && v.eng === 'mdr'); return { wk: vs.every((v) => v.as === 'mdr' && !!v.wk), most: vs.length }; }));
  r = await grab(page);
  ok(ld && r.st.length >= 8 && r.st.every((s) => s.e === 'mdr' && s.fin && s.t >= s.now) && r.hits.every((h) => onGrid(h.b, 0.25)) && wk && most <= 6, 'Moder: its module loaded when chosen (' + ld + '), ' + r.st.length + ' Kompostglocken on the 1/16, each on its processor, ' + most + ' ringing at the end (≤ 6)');
  // the Puls stopped: its beat clock still sets the grid
  await page.evaluate(() => { const M = window.__M; M.seqStop(); M.gkSet('rasS', 'trp'); M.gkSet('rasQ', '16'); M.LAD.hits.length = 0; });
  await play(page, 2.6, M.shake(2, 16, 5, 0.2));
  r = await grab(page);
  ok(r.hits.length >= 6 && r.hits.every((h) => onGrid(h.b, 0.25) && Math.abs(h.t - h.g16) < 1e-6), 'the Puls stopped: still on the 1/16 of its tempo (' + r.hits.length + ' strikes)');
  // the switch off again
  await page.evaluate(() => { const M = window.__M; M.gkSet('ras', false); M.LAD.hits.length = 0; });
  await play(page, 2.5, M.shake(2, 16, 5, 0.2));
  r = await grab(page);
  ok(!r.hits.length && !r.st.length, 'switched off: no strikes');
  // walking and knocks: no peaks, no strikes
  await page.evaluate(() => window.__M.gkSet('ras', true));
  await play(page, 10, M.walk());
  await play(page, 4, (t) => { const p = (t * 1000) % 300; return { beta: 0, lin: [0, 0, p < 12 ? 11 * (p < 6 ? 1 : -1) : 0] }; });
  r = await grab(page);
  ok(!r.hits.length, 'walking for 10 s and knocks on the table: no strike');
  ok(!errors.length, 'no errors ' + errors.join(' | '));
  await close();
})().catch(async (e) => { console.error(e); process.exitCode = 1; await close(); });
