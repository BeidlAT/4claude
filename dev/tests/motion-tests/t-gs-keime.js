// Sporenregen, the Keime (slot gs; node t-gs-keime.js): every note leaves a Keim at its place on the field – a finger,
// a key of the computer, a MIDI keyboard; held ones while they sound, played ones for 2/4/8 bars; the same note again
// takes its Keim; at most 24. The Puls seeds only with "Puls sät mit". Nothing of it is in the patch; Gestik off ends
// the rain; "Stille" takes the Keime.
const { open, ok, close, rain } = require('./gs-h');
(async () => {
  const { page, errors } = await open({ cfg: { ins: [['k1', 'Testkeyboard']] } });
  await page.evaluate(() => { const M = window.__M; M.setParam('seq.bpm', 90); M.setParam('l0.on', false); M.setParam('l1.on', false); M.setParam('l2.on', false); M.setParam('l3.on', false); });
  const before = await page.evaluate(() => ({ p: JSON.stringify(window.__M.P), preset: window.__M.UI.preset }));
  await rain(page);
  let r = await page.evaluate(async () => {
    const M = window.__M;
    const o = { on: M.RG.on, vis: M.VIS.rg, cl: M.gkCl(), clutch: M.GK.p.clutch };
    window.__key(0.3, 0.4, 'f1');
    await window.__sleep(80);
    const k = M.RG.k[0];
    o.n1 = M.RG.k.length; o.held = !!k.tt && k.end == null; o.u = k.u; o.v = k.v; o.f = k.f; o.tf = M.touches.get('f1').f;
    window.__up('f1');
    const b = M.beatAt(M.A.ctx.currentTime);
    o.end = k.end - b; o.tt = k.tt;
    window.__key(0.31, 0.45, 'f2'); await window.__sleep(40); window.__up('f2');
    o.n2 = M.RG.k.length; o.same = M.RG.k[0] === k;
    window.__key(0.3, 0.75, 'f3'); await window.__sleep(40); window.__up('f3');   // the same column, higher up: a Keim of its own
    o.n3 = M.RG.k.length;
    return o;
  });
  ok(r.on && r.vis && r.cl === 'immer' && r.clutch === 'toene', 'Sporenregen chosen: the rain runs and shows; it acts always (the stored clutch stays „Mit Tönen“)');
  ok(r.n1 === 1 && r.held && Math.abs(r.u - 0.3) < 1e-9 && Math.abs(r.v - 0.4) < 1e-9 && r.f === r.tf, 'a finger leaves a Keim where it plays, held while it sounds (its note ' + r.f.toFixed(1) + ' Hz)');
  ok(Math.abs(r.end - 16) < 0.05 && r.tt === null, 'let go: the Keim stays 4 bars (16 beats) more (' + r.end.toFixed(3) + ')');
  ok(r.n2 === 1 && r.same, 'the same note again (its column, about its height) takes that Keim – none beside it');
  ok(r.n3 === 2, 'the same column higher up: a Keim of its own');
  // a sliding finger: its Keim follows while held
  r = await page.evaluate(async () => {
    const M = window.__M;
    window.__key(0.6, 0.3, 'g1'); await window.__sleep(60);
    const tt = M.touches.get('g1'), k = M.RG.k.find((x) => x.tt === tt);
    M.moveTouch(tt, { x: 0.66, y: 0.5, px: 0.66 * M.VIS.w, py: 0.5 * M.VIS.h });
    await window.__sleep(80);
    const o = { u: k.u, v: k.v, f: k.f, tf: tt.f };
    window.__up('g1');
    return o;
  });
  ok(Math.abs(r.u - 0.66) < 1e-9 && Math.abs(r.v - 0.5) < 1e-9 && r.f === r.tf, 'a held Keim follows its sliding finger (u ' + r.u + ', v ' + r.v + ')');
  // a MIDI keyboard and the computer's keys
  r = await page.evaluate(async () => {
    const M = window.__M, n0 = M.RG.k.length;
    window.__send([0x90, 62, 100]); await window.__sleep(60);
    const tt = [...M.touches.values()].find((x) => String(x.id).startsWith('midi'));
    const k = M.RG.k.find((x) => x.tt === tt);
    const o = { n: M.RG.k.length - n0, u: k && k.u, v: k && k.v, f: k && k.f, tu: tt && tt.x, tf: tt && tt.f, ty: tt && tt.y };
    window.__send([0x80, 62, 0]); await window.__sleep(40);
    o.rel = k && k.tt === null && k.end != null;
    return o;
  });
  ok(r.n === 1 && Math.abs(r.u - r.tu) < 1e-9 && r.f === r.tf && Math.abs(r.v - r.ty) < 1e-9 && r.rel, 'a MIDI keyboard key leaves a Keim at its column and height (' + (r.v || 0).toFixed(2) + '), let go it stays');
  await page.focus('#cvFx'); await page.keyboard.down('KeyD'); await page.waitForTimeout(60);
  r = await page.evaluate(() => { const M = window.__M; const tt = M.touches.get('key-KeyD'); return { held: !!tt && M.RG.k.some((k) => k.tt === tt) }; });
  await page.keyboard.up('KeyD'); await page.waitForTimeout(40);
  ok(r.held, 'a key of the computer leaves a Keim too');
  // the Puls: only with "Puls sät mit"
  r = await page.evaluate(async () => {
    const M = window.__M;
    M.RG.k.length = 0;
    for (const [k, v] of [['l0.on', true], ['l0.prob', 1], ['l0.puls', 4], ['l0.steps', 8], ['l0.div', '0.25'], ['v.human', 0]]) M.setParam(k, v);
    M.seqStart();
    await window.__sleep(1200);
    const off = M.RG.k.length;
    M.gkSet('rgP', true);
    await window.__sleep(1200);
    const ks = M.RG.k.slice(), now = M.A.ctx.currentTime;
    M.seqStop();
    return { off, on: ks.length, ahead: ks.some((k) => k.t0 > now - 1.3), ends: ks.map((k) => k.end - M.beatAt(k.t0)), tts: ks.every((k) => !k.tt) };
  });
  ok(r.off === 0, '„Puls sät mit“ off (the default): the Puls leaves no Keime');
  ok(r.on > 0 && r.tts && r.ends.every((e) => Math.abs(e - 16) < 1e-6), '„Puls sät mit“ on: its notes become Keime from the moment they sound, for 4 bars (' + r.on + ')');
  // Keime bleiben 2 Takte at 200 BPM: gone after 8 beats (2.4 s)
  r = await page.evaluate(async () => {
    const M = window.__M;
    M.gkSet('rgP', false); M.RG.k.length = 0; M.gkSet('rgK', 2); M.setParam('seq.bpm', 200);
    await window.__sleep(100);
    window.__key(0.5, 0.5, 'h1'); await window.__sleep(30); window.__up('h1');
    const n0 = M.RG.k.length;
    await window.__sleep(1800);
    const n1 = M.RG.k.length;
    await window.__sleep(1000);
    return { n0, n1, n2: M.RG.k.length };
  });
  ok(r.n0 === 1 && r.n1 === 1 && r.n2 === 0, 'Keime bleiben 2 Takte (200 BPM): there after 1.8 s, gone after 2.8 s');
  // at most 24: the oldest let go makes room
  r = await page.evaluate(async () => {
    const M = window.__M;
    M.gkSet('rgK', 8); M.setParam('seq.bpm', 90);
    for (let i = 0; i < 30; i++) { const x = (i % 15) / 15 + 0.03, y = i < 15 ? 0.2 : 0.7; window.__key(x, y, 'm' + i); window.__up('m' + i); }
    await window.__sleep(60);
    return { n: M.RG.k.length, first: M.RG.k[0].u };
  });
  ok(r.n === 24, 'at most 24 Keime (30 notes played): the oldest go');
  // the sustain pedal (Festhalten) holds the rain's slope: the phone may be put down, it rains on as it did
  r = await page.evaluate(async () => {
    const M = window.__M;
    M.gkSet('ped', true);   // (since the fix phase the pedal holds Gestik only with „Haltepedal hält fest“)
    window.__tilt(0.6, 0); await window.__sleep(300);
    window.__send([0xb0, 64, 127]); await window.__sleep(100);
    window.__tilt(0, 0); await window.__sleep(500);
    const held = { mode: M.GK.mode, rgx: M.modVal('rgx') };
    window.__send([0xb0, 64, 0]); await window.__sleep(600);
    M.gkSet('ped', false);
    return { held, after: M.modVal('rgx'), mode: M.GK.mode };
  });
  ok(r.held.mode === 'hold' && Math.abs(r.held.rgx - 0.6) < 1e-9 && r.after === 0, 'the sustain pedal holds the rain\'s slope (' + r.held.rgx + ' while the hand is level); let go it comes to rest');
  // Stille takes the Keime; nothing of this is in the patch; Gestik off ends the rain
  r = await page.evaluate(async () => {
    const M = window.__M;
    M.panic(); await window.__sleep(60);
    const afterPanic = M.RG.k.length;
    window.__key(0.4, 0.4, 'z1'); await window.__sleep(30); window.__up('z1');
    M.gkDisable(); await window.__sleep(120);
    return { afterPanic, on: M.RG.on, vis: M.VIS.rg, k: M.RG.k.length, sp: M.RG.sp.length, lx: M.VIS.lx, ly: M.VIS.ly, src: M.MOD.t.rgx.s.size + M.MOD.t.rgy.s.size,
      pd: Object.keys(M.PD).filter((k) => /^rg|regen|keim/i.test(k) || /^xrgn\.(?!vol|pan|mute|solo|route|dly|rev|lc|hc|lo|mid|midf|hi|sat|wid|duck)/.test(k)) };
  });
  ok(r.afterPanic === 0, '„Stille“ takes every Keim');
  ok(!r.on && !r.vis && r.k === 0 && r.sp === 0 && r.lx === 0 && r.ly === 0 && r.src === 0, 'Gestik off: the rain ends – no Keime, no spores, the hyphae upright, nothing on its targets');
  ok(r.pd.length === 0, 'Sporenregen keeps nothing in the patch (only the mixer strip „Regen“ has parameters there)');
  const after = await page.evaluate(() => ({ p: JSON.parse(JSON.stringify(window.__M.P)), preset: window.__M.UI.preset, stored: JSON.parse(localStorage.getItem('myzel.gestik.v1')) }));
  const b = JSON.parse(before.p), diff = Object.keys(b).filter((k) => !['seq.bpm', 'l0.on', 'l0.prob', 'l0.puls', 'l0.steps', 'l0.div', 'v.human', 'bor.on'].includes(k) && JSON.stringify(b[k]) !== JSON.stringify(after.p[k]));
  ok(diff.length === 0, 'raining wrote nothing into the patch (besides what the test set itself)' + (diff.length ? ': ' + diff.join(', ') : ''));
  ok(after.stored && after.stored.neigen === 'regen' && after.stored.rgK === 8, 'Sporenregen\'s settings live in Gestik\'s own store (myzel.gestik.v1)');
  ok(errors.length === 0, 'no errors in the page' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  await close();
})().catch(async (e) => { console.log('FAIL ' + e.stack); process.exitCode = 1; await close(); });
