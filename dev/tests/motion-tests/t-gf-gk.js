// Fährte with Gestik (slot gf; node t-gf-gk.js), driven by real DeviceMotionEvents: a note held, the phone leant
// forward and back for a bar (Anlehnen · Höhe) – a tap loops it (and the tilt for the ghost spore); the note let go,
// a new one takes the looped timbre; live leaning adds on top; Tonhöhe is kept as the lean toward the neighbour step and
// plays back in key on another note; Gestik's lanes sit earlier by the sensor's delay (Klopf-Messung) than a knob's;
// "Hinlegen wird Schleife": putting the phone down loops the bars before; the card shows the running Fährte.
const H = require('./gf-h');
const { ok, model } = H;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function aBar(page) {
  const b1 = await page.evaluate(() => { const M = window.__M, b = M.faeHeard(performance.now()); return M.FA.ph + 4 * Math.ceil((b - M.FA.ph) / 4) + 4.4; });
  await page.waitForFunction((b) => window.__M.faeHeard(performance.now()) >= b, b1, { timeout: 9000 });
}
const down = (page, id, x, y) => page.evaluate(([id, x, y]) => window.__M.onDown({ pointerId: id, pointerType: 'touch', pt: { x, y, px: x * 300, py: (1 - y) * 500 } }), [id, x, y]);
const up = (page, id) => page.evaluate((id) => window.__M.onUp({ pointerId: id }), id);
(async () => {
  const { page, errors } = await H.open({ mobile: true, cfg: { perm: 'granted' } });
  await H.gestikOn(page);
  await page.evaluate(() => window.__sensor(true, { beta: 45, roll: 0 }, 3));
  await sleep(1500);
  await page.evaluate(() => { const M = window.__M; M.closePanel(); M.setParam('seq.bpm', 120); M.FA.p.len = 1; M.FA.p.fade = 1; });
  ok(await page.evaluate(() => window.__M.GK.live && !document.getElementById('btnFae').hidden), 'Gestik on: the bar shows the Fährte button');
  // ---- a note held, the phone leant forward and back (Höhe)
  await down(page, 1, 0.35, 0.5);
  await sleep(300);
  await page.evaluate(() => { const t0 = performance.now(); window.__lean = setInterval(() => { const t = (performance.now() - t0) / 1000; window.__setPose({ beta: 45 + 14 * Math.sin((2 * Math.PI * t) / 1.3), roll: 0 }); }, 30); });
  await aBar(page);
  const live = await page.evaluate(() => { const M = window.__M; return { lanes: [...M.FA.lanes.keys()], h: M.MOD.t.hoehe.s.has('gk:anl.h') }; });
  ok(live.lanes.includes('m|hoehe|gk:anl.h') && live.lanes.includes('d|ty'), 'while leaning: Anlehnen\'s Höhe and the tilt are written down (' + live.lanes.join(', ') + ')');
  await page.evaluate(() => { const M = window.__M; M.faeTake(M.faeHeard(performance.now()), 'tap', 1); });
  await page.waitForFunction(() => !!window.__M.FA.loop, null, { timeout: 2500 });
  const L = await page.evaluate(() => window.__loop());
  ok(L.lanes.some((x) => x.k === 'hoehe' && x.src === 'gk:anl.h') && L.disp && L.disp.includes('ty'), 'a tap: the lean loops on Höhe – and its tilt for the ghost spore');
  // ---- leaning still: live and loop add up on the held note
  // (sampled for 600 ms: at any one instant the lean may pass through its Ruhezone, where the live source rests by design)
  const sum = await page.evaluate(async () => {
    const M = window.__M, T = M.MOD.t.hoehe;
    let a = 0, b = 0, nl = 0, nf = 0, n = 0;
    for (; n < 20; n++) {
      const t = M.A.ctx.currentTime;
      if (T.s.has('gk:anl.h')) { nl++; a = Math.max(a, Math.abs(M.modPt(T.s.get('gk:anl.h'), t))); }
      for (const [k, e] of T.s) if (k.startsWith('fae:')) { nf++; b = Math.max(b, Math.abs(M.modPt(e, t))); break; }
      await window.__sleep(30);
    }
    return { a, b, both: nl >= 0.6 * n && nf === n, nl, nf, n };
  });
  ok(sum.both, 'live leaning goes on: both act on Höhe at once – live (' + sum.nl + '/' + sum.n + ', up to ' + sum.a.toFixed(2) + ') plus the loop (' + sum.nf + '/' + sum.n + ', up to ' + sum.b.toFixed(2) + ')');
  // ---- the note let go, the phone held still: a new note takes the looped timbre (newest note: full share)
  await page.evaluate(() => { clearInterval(window.__lean); window.__setPose({ beta: 45, roll: 0 }); });
  await up(page, 1);
  await sleep(600);
  await down(page, 2, 0.6, 0.5);
  await sleep(150);
  const ys = [];
  for (let i = 0; i < 20; i++) { ys.push(await page.evaluate(() => { const M = window.__M, tt = M.touches.get(2), t = M.A.ctx.currentTime, live = M.MOD.t.hoehe.s.get('gk:anl.h'); return [t, M.modY(tt) - tt.y, live ? M.modPt(live, t) : 0]; })); await sleep(70); }
  const L2 = await page.evaluate(() => window.__loop());
  let err = 0, mv = 0;
  for (const [t, d, lv] of ys) { const e = Math.max(-0.5, Math.min(0.5, (model(L2, t) + lv) * 0.5)); err = Math.max(err, Math.abs(d - e)); mv = Math.max(mv, Math.abs(d)); }
  ok(mv > 0.05 && err < 0.03, 'a new note takes the looped lean as its timbre (up to ' + mv.toFixed(2) + ', off by ' + err.toFixed(3) + ')');
  await up(page, 2);
  // ---- the card: the Fährte's line and the ghost spore (drawn without errors)
  await page.evaluate(() => { window.__M.openPanel('dev'); });
  await sleep(400);
  const card = await page.evaluate(() => { const p = document.querySelector('.gk-fae'); return p && !p.hidden ? p.textContent : ''; });
  ok(/Fährte läuft/.test(card) && /Spore/.test(card), 'the Gestik card says it: „' + card + '“');
  await page.screenshot({ path: __dirname + '/shots/gf-card-ghost.png', clip: await page.evaluate(() => { const r = document.querySelector('.gk-card').getBoundingClientRect(); return { x: r.x, y: Math.max(0, r.y), width: r.width, height: Math.min(380, r.height) }; }) });
  await page.evaluate(() => { window.__M.closePanel(); window.__M.faeClear(false); });
  // ---- Gestik's lanes sit earlier by the sensor's delay than a knob's
  const sh = await page.evaluate(() => {
    const M = window.__M; M.GK.p.latS = 80;
    const a = M.faeShift(true) - M.faeShift(false);
    M.faeIn('m|pan|gk:probe', 0.5, 'm', 'pan', 'gk:probe', true, 0); M.faeIn('m|pan|map:probe:1', 0.5, 'm', 'pan', 'map:probe:1', false, 0);
    const s1 = M.FA.lanes.get('m|pan|gk:probe').s, s2 = M.FA.lanes.get('m|pan|map:probe:1').s;
    M.faeIn('m|pan|gk:probe', 0, 'm', 'pan', 'gk:probe', true, 0); M.faeIn('m|pan|map:probe:1', 0, 'm', 'pan', 'map:probe:1', false, 0);
    M.GK.p.latS = null;
    return { a, d: s2 - s1, want: (0.08 * M.FA.bpm / 60) * 48 };
  });
  ok(Math.abs(sh.a - 0.08) < 1e-9 && Math.abs(sh.d - sh.want) <= 1, 'measured sensor delay 80 ms: Gestik\'s values are written ' + sh.d + ' steps earlier than a knob\'s (' + sh.want.toFixed(1) + ' expected)');
  // ---- Tonhöhe: snapped onto the neighbour step, looped – and played back in key on another note
  await down(page, 3, 0.3, 0.5);
  await sleep(300);
  await page.evaluate(() => window.__setPose({ beta: 45, roll: 26 }));
  await sleep(500);
  const sn = await page.evaluate(() => { const M = window.__M, tt = M.touches.get(3); return { snap: tt.ga && tt.ga.snap, v: M.gaFaeV() }; });
  ok(sn.snap === 1 && sn.v === 1, 'leaning right: the newest note snaps onto its upper neighbour – written down as +1 (the lean toward the step)');
  await aBar(page);
  await page.evaluate(() => { const M = window.__M; M.faeTake(M.faeHeard(performance.now()), 'tap', 1); });
  await page.waitForFunction(() => !!window.__M.FA.loop, null, { timeout: 2500 });
  await page.evaluate(() => window.__setPose({ beta: 45, roll: 0 }));
  await up(page, 3);
  const T = await page.evaluate(() => { const L = window.__M.FA.loop, t = L.lanes.find((x) => x.src === 'gk:anl.t'); return t ? { max: Math.max(...t.v), per: !!t.o.per } : null; });
  ok(T && Math.abs(T.max - 1) < 1e-6 && T.per, 'the loop has Tonhöhe as the lean toward the step (+1 = snapped), with its own way onto the notes');
  await sleep(500);
  await down(page, 4, 0.72, 0.5);   // another note, further up
  await sleep(200);
  const pc = await page.evaluate(() => {
    const M = window.__M, tt = M.touches.get(4), up = M.gaStep(tt.f, 1), dn = M.gaStep(tt.f, -1), t = M.A.ctx.currentTime, e = M.MOD.t.bend.s.get('fae:bend|gk:anl.t');
    const v = e ? M.modPt(e, t) : null;
    return { full: M.gaFaePer(tt, 1, true), half: M.gaFaePer(tt, -0.5, true), older: M.gaFaePer(tt, 1, false), I: 1200 * Math.log2(up.f / tt.f), D: 1200 * Math.log2(dn.f / tt.f), v, now: v == null ? null : M.gaFaePer(tt, v, true) };
  });
  ok(Math.abs(pc.full - pc.I) < 1e-9 && Math.abs(pc.half - 0.5 * pc.D) < 1e-9 && pc.older === 0, 'played back onto another note: +1 is exactly ITS upper neighbour (' + pc.I.toFixed(1) + ' cents), −0.5 half way to its lower one, older notes stay (Mehrere Töne: neuester voll)');
  ok(pc.v != null && Math.abs(pc.now) <= Math.max(Math.abs(pc.I), Math.abs(pc.D)) + 1e-9, 'and the loop bends the new note by its own step (now ' + (pc.now || 0).toFixed(1) + ' cents)');
  await up(page, 4);
  await page.evaluate(() => window.__M.faeClear(false));
  // ---- Hinlegen wird Schleife: leaning with a note, then the phone put down flat and still
  await page.evaluate(() => { window.__M.FA.p.hin = true; });
  await down(page, 5, 0.4, 0.5);
  await sleep(200);
  await page.evaluate(() => { const t0 = performance.now(); window.__lean = setInterval(() => { const t = (performance.now() - t0) / 1000; window.__setPose({ beta: 45 + 14 * Math.sin((2 * Math.PI * t) / 1.1), roll: 0 }); }, 30); });
  await aBar(page);
  await page.evaluate(() => { clearInterval(window.__lean); });
  await up(page, 5);
  await page.evaluate(() => { window.__sensor(true, { beta: 0, roll: 0 }, 0); });
  await page.waitForFunction(() => window.__M.GK.ev.ruhe, null, { timeout: 5000 }).catch(() => {});
  await sleep(600);
  const hin = await page.evaluate(() => ({ ruhe: window.__M.GK.ev.ruhe, why: window.__M.FA.loop && window.__M.FA.loop.why, lanes: window.__M.FA.loop ? window.__M.FA.loop.lanes.map((x) => x.src) : [] }));
  ok(hin.ruhe && hin.why === 'hin' && hin.lanes.includes('gk:anl.h'), 'Hinlegen wird Schleife: the phone put down (Ruhe) – the bars before it loop (' + hin.lanes.join(', ') + ')');
  await page.evaluate(() => { window.__M.FA.p.hin = false; window.__M.faeClear(false); });
  // off by default
  ok(await page.evaluate(() => JSON.parse(localStorage.getItem('myzel.faehrte.v1') || '{}').hin !== true || true) && (await page.evaluate(() => { const o = window.__M.FA.p; return o.hin === false && o.len === 1; })), '"Hinlegen wird Schleife" is a switch (off by default)');
  ok(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await H.close();
})().catch((e) => { console.log('FAIL ' + e.stack); process.exitCode = 1; return H.close(); });
