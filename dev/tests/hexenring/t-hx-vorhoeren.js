// Vorhören and „on the fly“ (owner, 26.10.2026: „der Klang verändert sich erst, wenn die Schleife fertig gespielt hat –
// on the fly wäre besser; prüfe, ob wirklich alle Einstellungen eine Wirkung haben (Stufe −1, Krebs, dünner); in der
// Schleifen-Ansicht ein Play und Stopp, und auf eine beliebige Stelle klicken und es spielt dort weiter“):
//   1. every tool of the editor changes what sounds – the rendered pass differs from before (the notes' tools too, and
//      their marks move), each undone by ↶
//   2. heard at once: the notes' tools, a stretch, rückwärts swap mid-pass; Weglassen changes the level within the pass
//   3. the processor's mid-pass changes are crossfaded – a sine stays smooth (no click) through a slice change and a swap
//   4. the transport: ▶ plays the rendered pass (the loop itself silent meanwhile), a click jumps there, a selection
//      repeats, Space toggles, ■ halts the loop too (owner, 30.10.2026); an edit while it plays takes over at the same place; the zoom
//                                                                    node t-hx-vorhoeren.js   (screenshots out/pv-*.png)
const G = require('./hx-g'), H = require('./hx-h');
const { ok } = H;
(async () => {
  const { page, errors } = await G.open({ w: 1440, h: 900 });
  await page.evaluate(async () => {
    const M = window.__M, A = M.A;
    await window.__reset(); window.__grid(110); await window.__sleep(300);
    M.setParam('hx.laenge', 'fest'); M.setParam('hx.festT', 4);
    const B0 = Math.ceil(M.tgBeat(A.ctx.currentTime + 0.3) / 4) * 4;
    window.__riff(M.tgTime(B0), 60 / 110, [0, 4, 7, 4, 2, 5, 9, 5, 7, 4, 0, 2, 4, 7, 9, 11], 1, { eng: 'klb', dur: 0.3 }); await window.__until(M.tgTime(B0 + 16) + 0.06);
    M.hxKorb(null); await window.__sleep(7000); M.HX.chips = null; M.setParam('hx.laenge', 'auto'); M.hxRailDirty(); await window.__sleep(300);
    M.hxEdOpen(M.hxLoopsLive()[0]); await window.__sleep(600);
  });
  // helpers in the page: the rendered pass when it is current, its fingerprint
  await page.evaluate(() => {
    const M = window.__M;
    window.__rw = async () => { await window.__sleep(150); for (let i = 0; i < 120 && !(M.HXE.rw && M.HXE.rw.sig === M.HXE.rsig && !M.HXE.rw.none && M.HXE.rw.buf); i++) await window.__sleep(100); const r = M.HXE.rw; if (!r || r.none || r.sig !== M.HXE.rsig) return null; const d = r.buf.getChannelData(0); let h = 0, e = 0; for (let i = 0; i < d.length; i += 97) { h = (h * 31 + Math.round(d[i] * 1e5)) | 0; e += Math.abs(d[i]); } return { h, e: +e.toFixed(3), n: d.length }; };
    window.__wu = async (L) => { await window.__sleep(80); for (let i = 0; i < 200 && L.sch.some((id) => { const S = M.HX.sch.get(id); return S && S.wBusy; }); i++) await window.__sleep(50); };
  });
  // 1. every tool has an effect
  const fx = await page.evaluate(async () => {
    const M = window.__M, L = M.hxLoopsLive()[0], o = { tools: {} }, base = await window.__rw();
    o.base = base;
    const tools = [
      ['Stufe −1', () => M.hxNtSet(L, 'tr', -1)], ['Stufe +1', () => M.hxNtSet(L, 'tr', 1)], ['dünner', () => M.hxNtSet(L, 'dens', -1)], ['dichter', () => M.hxNtSet(L, 'dens', 1)],
      ['Krebs', () => M.hxNtSet(L, 'krebs')], ['Umkehrung', () => M.hxNtSet(L, 'umk')],
      ['Band ½', () => M.hxSpeed(L, 0.5)], ['Band ×2', () => M.hxSpeed(L, 2)], ['rückwärts', () => M.hxRev(L)],
      ['Weglassen', () => M.hxSlcSet(L, 'pd', 0.3)], ['Tauschen', () => M.hxSlcSet(L, 'pw', 0.3)], ['verblassen', () => M.hxVbSet(L, 0.75)], ['Abrieb', () => M.hxAbSet(L, 0.25)],
      ['Trimmen ½', () => M.hxBandTrim(L, 'h')], ['Abschnitt leiser', () => M.hxRegionEdit(L, 0.25, 0.5, 'gain', 0.5)], ['Abschnitt ×2', () => M.hxRegionEdit(L, 0, 0.25, 'band', 2)],
    ];
    for (const [k, fn] of tools) {
      const n0 = M.HX.hist.length, marks0 = JSON.stringify(M.hxEdNtMarks ? 0 : 0);
      fn(); await window.__wu(L); const r = await window.__rw();
      const nt = /Stufe|dünner|dichter|Krebs|Umkehrung/.test(k), mk = nt ? M.HXE.cv && document.querySelector('.hx-ed') && JSON.stringify((window.__M.hxLoopsLive()[0].nt || {})) : '';
      o.tools[k] = { changed: !!r && !!base && r.h !== base.h, step: M.HX.hist.length - n0, nt: mk || undefined };
      M.hxUndoStep(); await window.__wu(L); await window.__sleep(150);
      const b = await window.__rw(); o.tools[k].back = !!b && b.h === base.h; if (!o.tools[k].back) o.tools[k].why = { beats: L.d.beats, sp: L.sp, e: b && b.e, e0: base.e, rs: M.HXE.rsig.slice(0, 300) };
    }
    return o;
  });
  const bad = Object.entries(fx.tools).filter(([, v]) => !v.changed || v.step !== 1).map(([k]) => k), notBack = Object.entries(fx.tools).filter(([, v]) => !v.back).map(([k]) => k);
  ok(fx.base && !bad.length, `every tool changes what sounds (the rendered pass), one step each – ${Object.keys(fx.tools).length} tools${bad.length ? '; no effect: ' + bad.join(', ') : ''}`);
  ok(!notBack.length, `… and ↶ gives the pass back exactly${notBack.length ? ' – not: ' + notBack.join(', ') + ' ' + JSON.stringify(fx.tools[notBack[0]]) + ' base ' + JSON.stringify(fx.base) : ''}`);
  // 1b. the notes' marks follow their tools
  const mk = await page.evaluate(async () => {
    const M = window.__M, L = M.hxLoopsLive()[0];
    const a = M.hxEdNtMarks(L); M.hxNtSet(L, 'tr', -2); await window.__wu(L); const b = M.hxEdNtMarks(L); M.hxNtSet(L, 'dens', -1); await window.__wu(L); const c = M.hxEdNtMarks(L);
    M.hxUndoStep(); await window.__wu(L); M.hxUndoStep(); await window.__wu(L);
    return { a, low: b && b.now.reduce((s, n) => s + n.r, 0) < b.was.reduce((s, n) => s + n.r, 0), n: b && b.now.length, thin: c && c.now.length, was: c && c.was.length };
  });
  ok(mk.a === null && mk.low && mk.n === mk.was && mk.thin < mk.was, `the notes' marks show what plays: none reshaped – the played ones; Stufe −2 lower, dünner fewer (${JSON.stringify(mk)})`);
  // 2. heard at once
  const now = await page.evaluate(async () => {
    const M = window.__M, A = M.A, L = M.hxLoopsLive()[0], S = () => M.HX.sch.get(L.sch[0]), o = {};
    M.hxEdClose(); await M.HX.rxQ; await window.__sleep(200);   // (28.10.2026: in the editor a stretch's edit starts the Vorhören – here the loop itself is heard)
    // (early in a pass, so its seam is far)
    const P = M.hxLen(L); while (M.hxPhase(L, A.ctx.currentTime) > 0.15) await window.__sleep(30);
    const n0 = M.HX.hist.length;
    o.ok = M.hxRegionEdit(L, 0.5, 0.75, 'rev', 0); o.rx = +(M.hxT(S().swapF) - A.ctx.currentTime).toFixed(2);
    M.hxUndoStep(); await window.__sleep(100); o.rxU = +(M.hxT(S().swapF) - A.ctx.currentTime).toFixed(2);
    M.hxRev(L); o.rev = +(M.hxT(S().swapF) - A.ctx.currentTime).toFixed(2); M.hxUndoStep(); await window.__sleep(100);
    M.hxNtSet(L, 'krebs'); await window.__wu(L); o.nt = +(M.hxT(S().swapF) - A.ctx.currentTime).toFixed(2); o.ntPlay = S().play;
    M.hxUndoStep(); await window.__wu(L); o.steps = M.HX.hist.length - n0;
    o.P = +P.toFixed(2);
    M.hxEdOpen(L); await window.__sleep(600);
    return o;
  });
  ok(now.ok && now.nt < 0.3 && now.ntPlay === 'wu' && now.rx < 0.2 && now.rxU < 0.2 && now.rev < 0.2 && now.steps === 0, `heard at once, mid-pass: a stretch rückwärts and its ↶, the whole rückwärts, Krebs as soon as it is rendered (s until heard: ${JSON.stringify(now)}; the pass is ${now.P} s)`);
  const lvl = await page.evaluate(async () => {
    const M = window.__M, A = M.A, L = M.hxLoopsLive()[0];
    while (M.hxPhase(L, A.ctx.currentTime) > 0.1) await window.__sleep(30);
    const avg = (m) => { const v = m.map((x) => x[1]).filter((x) => x != null); return v.reduce((a, b) => a + b, 0) / Math.max(1, v.length); };
    const k0 = M.hxPassK(L, Math.round(M.hxF(A.ctx.currentTime)));
    const a = avg(await window.__meter(L.id, 1600)); M.hxSlcSet(L, 'pd', 0.5); await window.__sleep(120); const b = avg(await window.__meter(L.id, 1600));
    const k1 = M.hxPassK(L, Math.round(M.hxF(A.ctx.currentTime)));
    M.hxUndoStep(); await window.__sleep(200);
    return { a: +a.toFixed(4), b: +b.toFixed(4), same: k0 === k1 };
  });
  ok(lvl.same && lvl.b < lvl.a * 0.85, `Weglassen 50 % – the level drops within the same pass (${JSON.stringify(lvl)})`);
  // 3. the processor's mid-pass changes, crossfaded: a 220-Hz sine through a slice change and a swap
  const xf = await page.evaluate(async () => {
    const M = window.__M, SR = M.A.ctx.sampleRate, Lf = 2 * SR, n = Lf + 1024, CH = 8192;
    const mk = (ph) => { const ch = []; for (let f = 0; f < n; f += CH) { const a = new Float32Array(CH), b = new Float32Array(CH); for (let i = 0; i < CH; i++) { const v = 0.5 * Math.sin(2 * Math.PI * 220 * (f + i) / SR + ph); a[i] = v; b[i] = v; } ch.push([a, b]); } return ch; };
    const run = async (mid) => {
      const ctx = new OfflineAudioContext(2, 3 * Lf, SR); await M.ensureDSP(ctx);
      const msgs = [{ loop: { id: 1, lock: 'frei', L: Lf, ph0: 0, gain: 1 } }, { schicht: { loop: 1, id: 1, chunks: mk(0), n, pre: 0, len: Lf, ausklang: null, gain: 1, join: 'xf', X: 480, rho: 0, zo: 0, kc: 0, fin: 0 } }];
      const node = new AudioWorkletNode(ctx, 'myzel-ring', { numberOfInputs: 2, numberOfOutputs: 2, outputChannelCount: [2, 2], channelCount: 2, channelCountMode: 'explicit', processorOptions: { humusS: 2, chunk: CH, msgs } });
      node.connect(ctx.destination, 0); node.connect(ctx.destination, 1);
      const at = Math.round(Lf * 1.37 / 128) * 128;
      ctx.suspend(at / SR).then(() => { mid(node, at); ctx.resume(); });
      const buf = await ctx.startRendering(), d = buf.getChannelData(0);
      let jump = 0, base = 0; for (let i = at - 3000; i < at + 3000; i++) jump = Math.max(jump, Math.abs(d[i] - d[i - 1]));
      for (let i = Lf + 2000; i < Lf + 8000; i++) base = Math.max(base, Math.abs(d[i] - d[i - 1]));
      let e = 0; for (let i = at + 2000; i < at + 6000; i++) e += Math.abs(d[i]);
      return { jump: +jump.toFixed(4), base: +base.toFixed(4), e: +(e / 4000).toFixed(3) };
    };
    const sl = await run((node) => node.port.postMessage({ slice: { loop: 1, u: [0, 0.25, 0.5, 0.75], schnitt: 0, pd: 0, pw: 1, ps: 0, seed: 7, now: 1 } }));
    const off = await run((node) => node.port.postMessage({ slice: { loop: 1, u: [0, 0.25, 0.5, 0.75], schnitt: 0, pd: 0.99, pw: 0, ps: 0, seed: 3, now: 1 } }));
    const sw = await run((node, at) => { const ch = mk(2.1); node.port.postMessage({ replace: { loop: 1, schicht: 1, chunks: ch, n, pre: 0, len: Lf, ausklang: null, f: at + 256, join: 'xf', X: 480, XM: Math.round(0.025 * SR), rho: 0, zo: 0, kc: 0, out: 0, dd: 1 } }, ch.flatMap((c) => [c[0].buffer, c[1].buffer])); });
    return { sl, off, sw };
  });
  ok(xf.sl.jump < 2.5 * xf.sl.base && xf.sw.jump < 2.5 * xf.sw.base, `a slice change and a swap mid-pass are crossfaded – no click in a sine (largest step ${xf.sl.jump} and ${xf.sw.jump} against ${xf.sl.base} in the steady sine)`);
  ok(xf.off.e < 0.05 && xf.off.jump < 2.5 * xf.off.base, `Weglassen 99 % now: silent at once, faded out (${JSON.stringify(xf.off)})`);
  // 4. the transport
  const tp = await page.evaluate(async () => {
    const M = window.__M, A = M.A, L = M.hxLoopsLive()[0], o = {};
    const an = A.ctx.createAnalyser(); an.fftSize = 2048; const d = new Float32Array(2048), rms = () => { an.getFloatTimeDomainData(d); let s = 0; for (const v of d) s += v * v; return Math.sqrt(s / d.length); };
    document.querySelector('.hx-pv-play').click(); await window.__sleep(150);
    o.play = { pv: !!M.HXE.pv, mute: !!L.pvMute, btn: document.querySelector('.hx-pv-play').textContent };
    M.HXE.pv.out.g.connect(an); await window.__sleep(250); o.play.rms = +rms().toFixed(4);
    const p0 = M.hxPvPos(); await window.__sleep(500); o.play.adv = +(M.hxPvPos() - p0).toFixed(3);
    o.play.lt = document.querySelector('.hx-pv-t').textContent;
    // a click at ¾ of the waveform: it plays from there
    const cv = document.querySelector('.hx-ed-cv').getBoundingClientRect();
    return { o, cv: { x: cv.left, y: cv.top, w: cv.width, h: cv.height } };
  });
  await page.mouse.click(tp.cv.x + tp.cv.w * 0.75, tp.cv.y + tp.cv.h / 2); await page.waitForTimeout(120);
  const tp2 = await page.evaluate(async () => {
    const M = window.__M, L = M.hxLoopsLive()[0], o = {};
    o.at = +M.hxPvPos().toFixed(3);
    // a selection repeats: Takt 2 (beats 5–8), played past its end
    M.HXE.sel = { a: 0.25, b: 0.5 }; M.hxEdRender(); await window.__sleep(80); M.hxPvJump(0.3); await window.__sleep(80);
    const seen = []; for (let i = 0; i < 30; i++) { seen.push(M.hxPvPos()); await window.__sleep(100); }
    o.rep = { min: +Math.min(...seen).toFixed(3), max: +Math.max(...seen).toFixed(3), wrapped: seen.some((x, i) => i && x < seen[i - 1] - 0.05) };
    // an edit while it plays: the new pass takes over where it plays
    M.HXE.sel = null; M.hxEdRender(); await window.__sleep(80); const b0 = M.HXE.pv.buf;
    M.hxSlcSet(L, 'pd', 0.5); for (let i = 0; i < 80 && M.HXE.pv && M.HXE.pv.buf === b0; i++) await window.__sleep(50);
    const pA = M.hxPvPos(); await window.__sleep(100); const pB = M.hxPvPos();
    o.swap = { swapped: !!M.HXE.pv && M.HXE.pv.buf !== b0, cont: pB - pA > 0.005 && pB - pA < 0.04 };
    M.hxUndoStep(); await window.__sleep(200);
    return o;
  });
  await page.screenshot({ path: 'out/pv-play.png' });
  await page.focus('.hx-ed-wave'); await page.keyboard.press('Space'); await page.waitForTimeout(150);
  const tp3 = await page.evaluate(async () => { const M = window.__M, L = M.hxLoopsLive()[0]; return { pv: !!M.HXE.pv, mute: !!L.pvMute, st: L.state, at: +M.hxPvPos().toFixed(3), rec: !!M.HX.rec }; });
  await page.keyboard.press('Space'); await page.waitForTimeout(400);
  const tp4 = await page.evaluate(async () => { const M = window.__M; return { pv: !!M.HXE.pv }; });
  ok(tp.o.play.pv && tp.o.play.mute && tp.o.play.rms > 0.005 && tp.o.play.adv > 0.02 && /Stopp/.test(tp.o.play.btn) && /Takt \d · Schlag \d · 0:0\d,\d \/ 0:08,\d/.test(tp.o.play.lt), `▶ plays the rendered pass, the loop itself silent meanwhile; the clock runs (${JSON.stringify(tp.o.play)})`);
  ok(Math.abs(tp2.at - 0.75) < 0.03, `a click into the waveform plays from there (${tp2.at})`);
  ok(tp2.rep.min >= 0.25 - 0.005 && tp2.rep.max <= 0.5 + 0.005 && tp2.rep.wrapped, `a selection repeats while it plays (${JSON.stringify(tp2.rep)})`);
  ok(tp2.swap.swapped && tp2.swap.cont, `an edit while it plays: the new pass takes over at the same place (${JSON.stringify(tp2.swap)})`);
  ok(!tp3.pv && !tp3.mute && tp3.st === 'angehalten' && !tp3.rec && tp4.pv, `Space in the editor stops (the loop halts too – owner, 30.10.2026 –, nothing recorded) and plays again (${JSON.stringify(tp3)}, ${JSON.stringify(tp4)})`);
  // 5. the zoom
  const cvb = await (await page.$('.hx-ed-cv')).boundingBox();
  await page.mouse.move(cvb.x + cvb.width * 0.5, cvb.y + 40);
  await page.keyboard.down('Control'); await page.mouse.wheel(0, -400); await page.keyboard.up('Control'); await page.waitForTimeout(250);
  const z = await page.evaluate(async () => {
    const M = window.__M, o = {}; o.w = M.HXE.zv && +(M.HXE.zv[1] - M.HXE.zv[0]).toFixed(3); o.ganz = [...document.querySelectorAll('.hx-ed-zoom .btn')].some((b) => b.textContent === 'ganz');
    M.HXE.sel = { a: 0.5, b: 0.5625 }; M.hxEdRender(); await window.__sleep(80); [...document.querySelectorAll('.hx-ed-zoom .btn')].find((b) => b.textContent === 'Auswahl').click(); await window.__sleep(200); o.sel = M.HXE.zv && M.HXE.zv.map((x) => +x.toFixed(3));
    return o;
  });
  await page.screenshot({ path: 'out/pv-zoom.png' });
  // a drag in the zoomed view chooses within it
  await page.mouse.move(cvb.x + cvb.width * 0.2, cvb.y + 50); await page.mouse.down(); await page.mouse.move(cvb.x + cvb.width * 0.8, cvb.y + 50, { steps: 5 }); await page.mouse.up(); await page.waitForTimeout(200);
  const z2 = await page.evaluate(async () => { const M = window.__M, o = { sel: M.HXE.sel }; [...document.querySelectorAll('.hx-ed-zoom .btn')].find((b) => b.textContent === 'ganz').click(); await window.__sleep(150); o.whole = M.HXE.zv; M.hxPvStop(); return o; });
  ok(z.w && z.w < 0.6 && z.ganz && z.sel && z.sel[0] < 0.5 && z.sel[1] > 0.5625 && z.sel[1] - z.sel[0] < 0.1, `Strg+Mausrad zooms (view ${z.w}), „Auswahl“ shows the stretch large (${JSON.stringify(z.sel)})`);
  ok(z2.sel && z2.sel.a >= z.sel[0] - 1e-6 && z2.sel.b <= z.sel[1] + 0.07 && z2.whole === null, `a drag in the zoomed view chooses inside it; „ganz“ shows the whole again (${JSON.stringify(z2)})`);
  // the editor closed: the preview ends, the loop sounds
  const cl = await page.evaluate(async () => { const M = window.__M, L = M.hxLoopsLive()[0]; M.hxPvPlay(0); await window.__sleep(200); const a = !!M.HXE.pv; M.hxEdClose(); await window.__sleep(100); return { a, pv: !!M.HXE.pv, mute: !!L.pvMute }; });
  ok(cl.a && !cl.pv && !cl.mute, `closing the editor ends Vorhören, the loop sounds again (${JSON.stringify(cl)})`);
  ok(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await H.close(); process.exit(H.summary() ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
