// Sporenregen's own channel strip "Regen" (slot gs; node t-gs-strip.js): in the Spiel group of the mixer – in the Pult,
// the Geflecht and its Fruchtkörper, in its own colour, an empty mushroom while it does not rain; the rain's strikes and
// only they pass it: its level, mute and solo act on the rain alone, Pumpen, sends and EQ are its own; a recording
// (and an armed one, in bars too) takes the rain like any note.
const { open, ok, close, rain } = require('./gs-h');
(async () => {
  const { page, errors } = await open({ mobile: true, cfg: { seed: 12 } });
  await page.evaluate(() => {
    const M = window.__M;
    for (const [k, v] of [['l0.on', false], ['l1.on', false], ['l2.on', false], ['l3.on', false], ['bor.on', false], ['seq.bpm', 96], ['dly.mix', 0], ['rev.mix', 0]]) M.setParam(k, v);
    // the RMS of a node over ms (an analyser hung beside it)
    window.__rms = async (node, ms) => {
      const c = M.A.ctx, an = c.createAnalyser(); an.fftSize = 2048; node.connect(an);
      const b = new Float32Array(2048); let s = 0, n = 0;
      for (let t = 0; t < ms; t += 40) { an.getFloatTimeDomainData(b); for (let i = 0; i < b.length; i++) s += b[i] * b[i]; n += b.length; await window.__sleep(40); }
      try { node.disconnect(an); } catch (e) {}
      return 10 * Math.log10(s / n + 1e-20);
    };
  });
  // the strip, before any rain: in the mixer, an empty mushroom
  let r = await page.evaluate(async () => {
    const M = window.__M;
    M.openPanel('mix'); await window.__sleep(900);
    const st = document.querySelector('.mx-st[data-k="rgn"]');
    const order = [...document.querySelectorAll('.mx-st[data-k]')].map((e) => e.dataset.k);
    return { has: !!st, name: st && st.querySelector('.mx-nm').textContent, src: st && st.querySelector('.mx-sh').textContent, off: st && st.classList.contains('srcoff'), order, strips: M.MIX.list.map((s) => s.k), info: M.MX.ch.rgn && M.MX.ch.rgn.c };
  });
  ok(r.has && /Regen/.test(r.name) && r.off && /aus/.test(r.src), 'the mixer\'s Pult has a strip „Regen“ – an empty mushroom („aus“) while it does not rain');
  ok(r.order.indexOf('rgn') === r.order.indexOf('eb2') + 1 && r.strips.includes('rgn'), 'it stands in the Spiel group, after Ebene 2 (' + r.order.join(' ') + ')');
  ok(r.info && r.info.g === 'spiel' && r.info.kind === 'src' && /^#ee82d9$/i.test(r.info.col), 'its colour is its own (' + (r.info && r.info.col) + '), the rain\'s spores in the field wear it too');
  await page.evaluate(() => window.__M.closePanel());
  await rain(page, { rgO: 0.8, rgK: 8, rgS: 'glo' });
  await page.evaluate(async () => {
    for (const x of [0.15, 0.35, 0.55, 0.75]) { window.__key(x, 0.5, 'c' + x); window.__up('c' + x); }
    window.__tilt(0.9, 0);
    await window.__sleep(2500);   // the struck notes of the field have faded
  });
  r = await page.evaluate(async () => {
    const M = window.__M, S = M.MIX.s;
    const rgn = await window.__rms(S.rgn.dry, 2000), fin = await window.__rms(S.fin.dry, 1500), out = await window.__rms(M.A.out, 1500);
    M.openPanel('mix'); await window.__sleep(900);
    const st = document.querySelector('.mx-st[data-k="rgn"]');
    const o = { rgn, fin, out, off: st.classList.contains('srcoff'), src: st.querySelector('.mx-sh').textContent };
    // the Geflecht: its column and tag
    const gb = [...document.querySelectorAll('button')].find((b) => /^geflecht$/i.test(b.textContent.trim()));
    if (gb) gb.click();
    await window.__sleep(700);
    o.tag = [...document.querySelectorAll('.mxg-tag')].map((t) => t.querySelector('b').textContent);
    o.tagOff = [...document.querySelectorAll('.mxg-tag')].find((t) => t.querySelector('b').textContent === 'Regen');
    o.tagOff = o.tagOff ? o.tagOff.classList.contains('srcoff') : null;
    const pb = [...document.querySelectorAll('button')].find((b) => /^pult$/i.test(b.textContent.trim()));
    if (pb) pb.click();
    await window.__sleep(500);
    // its Fruchtkörper: Quelle says what rains, the strike chosen there is Sporenregen's
    document.querySelector('.mx-st[data-k="rgn"] .mx-sh').click();
    await window.__sleep(800);
    const q = document.querySelector('.mxd-qbody[data-k="rgn"]');
    o.q = q && q.isConnected && q.textContent;
    // (klang stage 1b: the strike is the Klangquelle row – its library, Kalimba's tile – instead of chips)
    const nm = q && q.querySelector('.kq-name');
    if (nm) { nm.click(); await window.__sleep(100); document.querySelector('.kq-fams .chip[data-fam="erz"]').click(); document.querySelector('.kq-tile[data-k="klb"] .kq-pick').click(); }
    o.rgS = M.GK.p.rgS;
    if (nm) { document.querySelector('.kq-tile[data-k="glo"] .kq-pick').click(); M.kqClose(); }
    M.closePanel();
    return o;
  });
  ok(r.rgn > -60 && r.fin < -100, 'the strikes pass the strip „Regen“ (' + r.rgn.toFixed(1) + ' dB) – not „Klang“ (' + (r.fin < -150 ? '−∞' : r.fin.toFixed(1)) + ' dB)');
  ok(!r.off && /Glocke/.test(r.src), 'raining, it is a full mushroom; it says what strikes (' + r.src.trim() + ')');
  ok(r.tag.includes('Regen') && r.tagOff === false, 'the Geflecht has its column too (' + r.tag.join(' · ') + ')');
  ok(/Sporenregen/.test(r.q || '') && r.rgS === 'klb', 'its Fruchtkörper: Quelle tells what rains, and the strike chosen there is the rain\'s (Kalimba)');
  // level, mute, solo: the rain alone
  r = await page.evaluate(async () => {
    const M = window.__M, out = () => window.__rms(M.A.out, 1500), o = {};
    o.on = await out();
    M.setParam('xrgn.vol', -60); await window.__sleep(150); o.off = await out();
    M.setParam('xrgn.vol', -12); await window.__sleep(150); o.m12 = await out();
    M.setParam('xrgn.vol', 0); M.setParam('xrgn.mute', true); await window.__sleep(150); o.mute = await out();
    M.setParam('xrgn.mute', false);
    M.setParam('xfin.solo', true); await window.__sleep(150); o.soloFin = await out();
    M.setParam('xfin.solo', false); M.setParam('xrgn.solo', true);
    window.__key(0.95, 0.9, 'held', 'mouse');   // a held note on Klang (Nebel)
    await window.__sleep(150); o.soloRgn = await out(); o.finAtSolo = await window.__rms(M.MIX.s.fin.dry, 600); o.finGate = M.MIX.s.fin.dry.gain.value;
    M.setParam('xrgn.solo', false); window.__up('held');
    return o;
  });
  ok(r.on > -70 && r.off < -100, 'its fader down (−∞): the rain is gone from the sum (' + r.on.toFixed(1) + ' → ' + (r.off < -150 ? '−∞' : r.off.toFixed(1)) + ' dB)');
  ok(r.m12 < r.on - 6 && r.m12 > -100, '−12 dB on its fader: the rain quieter (' + r.m12.toFixed(1) + ' dB)');
  ok(r.mute < -100, 'muted: silent');
  ok(r.soloFin < -100, 'another channel soloed (Klang): the rain is silent');
  ok(r.soloRgn > -70 && r.finGate === 0, '„Regen“ soloed: the rain plays, a held note on Klang is muted');
  // its own Pumpen, sends and EQ
  r = await page.evaluate(async () => {
    const M = window.__M, S = M.MIX.s.rgn;
    M.setParam('xrgn.dly', 0); M.setParam('xrgn.lo', 6); M.setParam('xrgn.duck', 0.8);
    M.setParam('l0.on', true); M.setParam('l0.prob', 1); M.setParam('l0.puls', 8); M.setParam('mix.duckSrc', '0'); M.setParam('xl0.mute', true);
    M.seqStart();
    let depth = 0;
    for (let i = 0; i < 40; i++) { await window.__sleep(25); depth = Math.max(depth, M.duckDepth(S, M.A.ctx.currentTime)); }
    M.seqStop();
    const o = { eS: S.eS.gain.value, proc: S.procOn, depth, finDuck: M.duckDepth(M.MIX.s.fin, M.A.ctx.currentTime) };
    for (const [k, v] of [['xrgn.dly', 1], ['xrgn.lo', 0], ['xrgn.duck', 0], ['l0.on', false], ['xl0.mute', false]]) M.setParam(k, v);
    return o;
  });
  ok(r.eS === 0 && r.proc && r.depth > 0.3, 'its own Echo send (0), EQ (Tiefen +6 dB: its block switched in) and Pumpen (pulled down to ' + Math.round((1 - r.depth) * 100) + ' % by Spur 1)');
  // recordings take it: armed, the rain's first strike starts the take
  r = await page.evaluate(async () => {
    const M = window.__M;
    M.setParam('rec.arm', true); M.setParam('rec.len', 'free');
    window.__tilt(0, 0); await window.__sleep(2500);
    M.recToggle();
    for (let i = 0; i < 100 && M.CAP.state !== 'armed'; i++) await window.__sleep(30);
    const armed = M.CAP.state;
    window.__tilt(0.9, 0);
    for (let i = 0; i < 150 && M.CAP.state === 'armed'; i++) await window.__sleep(20);
    const state = M.CAP.state;
    await window.__sleep(2000);
    const peak = M.CAP.rec && M.CAP.rec.peak, frames = M.CAP.rec && M.CAP.rec.frames;
    M.recToggle();
    return { armed, state, peak, frames };
  });
  ok(r.armed === 'armed' && r.state === 'rec' && r.peak > 0.001 && r.frames > 48000, 'an armed recording starts with the rain\'s first strike and takes it (peak ' + (r.peak || 0).toFixed(3) + ')');
  r = await page.evaluate(async () => {
    const M = window.__M;
    for (let i = 0; i < 200 && M.CAP.state !== 'idle'; i++) await window.__sleep(30);
    M.setParam('rec.len', 'bars'); M.setParam('rec.bars', 1);
    window.__tilt(0, 0); await window.__sleep(2500);
    M.recToggle();
    for (let i = 0; i < 100 && M.CAP.state === 'idle'; i++) await window.__sleep(30);
    const armed = M.CAP.state;
    window.__tilt(0.9, 0);
    for (let i = 0; i < 150 && M.CAP.state === armed; i++) await window.__sleep(20);
    return { armed, state: M.CAP.state };
  });
  ok(r.armed === 'armed' && r.state !== 'armed' && r.state !== 'idle', 'Aufnahme in Takten, armed: the rain\'s strike starts it too (' + r.armed + ' → ' + r.state + ')');
  ok(errors.length === 0, 'no errors in the page' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  await close();
})().catch(async (e) => { console.log('FAIL ' + e.stack); process.exitCode = 1; await close(); });
