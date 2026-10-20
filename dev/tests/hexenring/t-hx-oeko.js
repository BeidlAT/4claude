// Hexenring – the first ecology (SPEC §15; tests §22). Nähren · Gespinst: a feeding Schleife gets a web of its own
// (myzel-web, tuned as the field's – gspFreqs –, retuned with it), fed from the processor's output 2 (a send post level
// and state that no tap hears) into the strip „Hexenring“; while it rings it costs GSP_COST in voiceLoad(); off, it
// rings out and goes. Nähren · Körner: the Schleife's pass as grain material – „Schleife“ as the Körner's source,
// grains played on it are of it. Neither is ever re-captured: the Humus's „Gespielt“ ring stays silent while they
// sound and nothing is played; the card's switches; a reload brings the web back.
//   node t-hx-oeko.js
const G = require('./hx-g'), H = require('./hx-h');
const { ok } = H;
const BPM = 120;
(async () => {
  let { page, errors } = await G.open({ w: 1280, h: 800 });
  const ev = (fn, a) => page.evaluate(fn, a);
  const setup = () => ev(async (BPM) => {
    const M = window.__M, A = M.A, ctx = A.ctx;
    const REC = `class HxRecG extends AudioWorkletProcessor {
      constructor() { super(); this.b = []; this.port.onmessage = () => { this.port.postMessage(this.b); this.b = []; }; }
      process(inp) { const a = inp[0]; this.b.push([currentFrame, a && a[0] ? a[0].slice() : new Float32Array(128)]); return true; }
    }
    registerProcessor('hx-recg', HxRecG);`;
    await ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([REC], { type: 'text/javascript' })));
    // the RMS of what a node puts out over ms (frames the machine dropped are left out)
    window.__rmsOf = (node, ms, out = 0) => new Promise((res) => {
      const r = new AudioWorkletNode(ctx, 'hx-recg', { numberOfInputs: 1, numberOfOutputs: 1, channelCount: 2, channelCountMode: 'explicit' }), z = ctx.createGain();
      z.gain.value = 0; node.connect(r, out); r.connect(z).connect(ctx.destination);
      setTimeout(() => { r.port.onmessage = (e) => { try { node.disconnect(r); r.disconnect(); } catch (x) {} let s = 0, n = 0; for (const [, l] of e.data) for (const x of l) { s += x * x; n++; } res(n ? Math.sqrt(s / n) : -1); }; r.port.postMessage(1); }, ms);
    });
    // the Humus's ring „Gespielt“ (in 0) over the last s seconds: its RMS
    window.__gespielt = async (s) => {
      const t1 = A.ctx.currentTime - 0.1, g = await M.hxGrab({ t0: t1 - s, t1, in: 0 });
      if (!g) return -1;
      let q = 0, n = 0;
      for (let i = 0; i < g.n; i++) { const c = g.chunks[Math.floor(i / M.HX_CH)]; if (!c) continue; const a = c[0][i % M.HX_CH], b = c[1][i % M.HX_CH]; q += a * a + b * b; n += 2; }
      return n ? Math.sqrt(q / n) : -1;
    };
    window.__mk = async (bars, degs, eng) => {
      M.setParam('hx.laenge', 'fest'); M.setParam('hx.festT', bars);
      const B0 = Math.ceil(M.tgBeat(A.ctx.currentTime + 0.25) / 4) * 4, beat = 60 / BPM;
      const list = []; for (let i = 0; i < 4 * bars; i++) list.push([M.tgTime(B0) + i * beat, degs[i % degs.length], i % 4 ? 0.6 : 0.95, 0.25]);
      window.__play(list, { eng: eng || 'glo' });
      await window.__until(M.tgTime(B0 + 4 * bars) + 0.04);
      const n = M.hxLoopsLive().length;
      M.hxKorb(null);
      await window.__sleep(150);
      return M.hxLoopsLive().length > n ? M.hxLoopsLive().sort((a, b) => b.made - a.made)[0].slot : -1;
    };
  }, BPM);
  await setup();
  await ev(async (BPM) => { await window.__reset(); window.__grid(BPM); await window.__sleep(400); }, BPM);

  // ---- a Schleife; the card's switch „Nähren: Gespinst“ (a real click) ----
  let r = await ev(async () => {
    const M = window.__M, o = {};
    const s = await window.__mk(2, [0, 4, 7, 11, 7, 4, 2, 0], 'klb');
    o.slot = s;
    o.g0 = await window.__gespielt(1.5);   // (the ring hears what is played)
    await window.__sleep(4500);   // (the notes played have died away: what sounds now is the Schleife alone)
    M.hxCardOpen(s); await window.__sleep(400);
    return o;
  });
  const slot = r.slot;
  ok(slot >= 0 && r.g0 > 1e-3, `a Schleife of two bars (Kalimba) plays (what was played is in „Gespielt“: RMS ${r.g0.toExponential(1)})`);
  await page.click('.hx-card button[aria-label^="Nähren: ein eigenes Saitennetz"]');
  await page.waitForTimeout(200);
  r = await ev(async (slot) => {
    const M = window.__M, L = M.HX.loops.get(M.HX.slot[slot]), W = M.HXN.webs.get(L.id), o = { on: !!(L.naehrt && L.naehrt.gsp), web: !!W, pressed: document.querySelector('.hx-card button[aria-label^="Nähren: ein eigenes Saitennetz"]').getAttribute('aria-pressed') };
    if (!W) return o;
    for (let i = 0; i < 60 && !W.active; i++) await window.__sleep(50);
    o.active = W.active;
    o.out = await window.__rmsOf(W.out, 1500);
    o.loop = await window.__rmsOf(M.HX.node, 1500, 0);
    o.cost = M.hxWebsCost(); o.want = M.GSP_COST[M.getQ().rich ? 1 : 0]; o.load = M.voiceLoad(); W.active = false; o.load0 = M.voiceLoad(); W.active = true;
    o.gesp = await window.__gespielt(2.5);
    return o;
  }, slot);
  ok(r.on && r.web && r.pressed === 'true', `the card's switch: „Nähren: Gespinst“ on – the Schleife has a web of its own (pressed: ${r.pressed})`);
  ok(r.active && r.out > 1e-4, `  it rings with the Schleife: the web's halo ${(20 * Math.log10(r.out)).toFixed(1)} dBFS into the strip „Hexenring“ (the Schleife ${(20 * Math.log10(r.loop)).toFixed(1)} dBFS)`);
  ok(Math.abs(r.cost - r.want) < 1e-9 && Math.abs(r.load - r.load0 - r.want) < 1e-6, `  its cost counted while it rings: ${r.cost.toFixed(2)} Einheiten (GSP_COST) in voiceLoad() (${r.load0.toFixed(2)} → ${r.load.toFixed(2)})`);
  ok(r.gesp >= 0 && r.gesp < 1e-5, `  never re-captured: the Humus's „Gespielt“ heard nothing of the Schleife or its web (RMS ${r.gesp.toExponential(1)} over 2.5 s)`);
  // retuned with the field: a new scale reaches every loop's web
  r = await ev(async (slot) => {
    const M = window.__M, L = M.HX.loops.get(M.HX.slot[slot]), W = M.HXN.webs.get(L.id), got = [], pm = W.node.port.postMessage.bind(W.node.port);
    W.node.port.postMessage = (m, t) => { got.push(m); return pm(m, t); };
    const sc = M.P['t.scale'], alt = Object.keys(M.SCALES).find((k) => k !== sc);
    M.setParam('t.scale', alt);
    // (step 2a: while a Schleife with notes plays, the field's scale and the loops' change on the announced bar line)
    for (let i = 0; i < 200 && M.HX.folge; i++) await window.__sleep(50);
    await window.__sleep(100);
    const tune = got.find((m) => m && m.tune), want = M.gspFreqs();
    M.setParam('t.scale', sc);
    for (let i = 0; i < 200 && M.HX.folge; i++) await window.__sleep(50);
    W.node.port.postMessage = pm;
    return { tune: !!tune, same: tune && JSON.stringify(tune.tune.map((f) => +f.toFixed(3))) === JSON.stringify(want.map((f) => +f.toFixed(3))), n: want.length };
  }, slot);
  ok(r.tune && r.same, `  a new scale: the web is retuned with the field's (${r.n} strings, gspFreqs)`);
  // a reload: the web comes back with the Schleife
  await page.reload(); await page.waitForFunction(() => !!window.__M);
  await H.tools(page); await G.gtools(page);
  await page.click('#btnStart'); await page.waitForFunction(() => window.__M.HX.state === 'ok', null, { timeout: 8000 });
  await setup();
  r = await ev(async () => {
    const M = window.__M;
    for (let i = 0; i < 80 && !M.hxLoopsLive().length; i++) await window.__sleep(100);
    await window.__sleep(800);
    const L = M.hxLoopsLive()[0];
    return { loops: M.hxLoopsLive().length, on: !!(L && L.naehrt && L.naehrt.gsp), web: !!(L && M.HXN.webs.get(L.id)) };
  });
  ok(r.loops === 1 && r.on && r.web, `after a reload the Schleife comes back feeding its web (${JSON.stringify(r)})`);
  // off: the send fades, the web rings out and goes – its cost with it
  r = await ev(async () => {
    const M = window.__M, L = M.hxLoopsLive()[0];
    M.hxNaehrGsp(L, false);
    const a = M.HXN.webs.has(L.id);
    await window.__sleep(3400);
    return { a, cost: M.hxWebsCost(), on: !!(L.naehrt && L.naehrt.gsp) };
  });
  ok(!r.a && r.cost === 0 && !r.on, '  off: the web rings out and goes, its cost with it');

  // ---- Nähren · Körner: the pass as grain material ----
  r = await ev(async () => {
    const M = window.__M, L = M.hxLoopsLive()[0], o = {};
    M.hxCardOpen(L.slot); await window.__sleep(300);
    document.querySelector('.hx-card button[aria-label^="Nähren: die Schleife wird Kornmaterial"]').click();
    await window.__sleep(200);
    const T = M.hxKorTex(), S = M.HX.sch.get(L.sch[0]);
    o.src = M.P['kor.src']; o.tex = !!T; o.n = T && T.buf.length; o.len = S && S.len; o.ref = T && +T.ref.toFixed(2);
    o.korSrc = M.korSource() === T;
    o.name = (M.HXN.kor || {}).name;
    await window.__sleep(2700);
    o.gesp = await window.__gespielt(2.5);   // (the material switched on, nothing played: nothing heard)
    // a Körner note on it: its grains are of the Schleife
    const v = M.playNote('kor', M.A.ctx.currentTime + 0.05, M.N.notes[4].f, 0.5, 0.8, { bus: M.stripIn('fin') });
    await window.__sleep(600);
    const gv = [...M.A.grainVoices][0];
    o.grain = !!(gv && (gv.kor.buf === T.buf || gv.kor.rev === T.rev));
    o.grains = M.A.grains;
    if (v && v.release) v.release();
    await window.__sleep(4000);
    return o;
  });
  ok(r.src === 'schleife' && r.tex && r.n === r.len && r.korSrc, `the card's switch „Nähren: Körner“: the Körner's source is „Schleife“ – one pass of it (${r.n} frames), its pitch reference ${r.ref} Hz`);
  ok(r.gesp >= 0 && r.gesp < 1e-5, `  the material itself is never re-captured: „Gespielt“ silent while nothing is played (RMS ${r.gesp.toExponential(1)})`);
  ok(r.grain && r.grains > 0, `  a Körner note played on it: its grains are of ${r.name} (played, they are heard as any note)`);
  r = await ev(async () => { const M = window.__M, L = M.hxLoopsLive()[0]; M.hxNaehrKor(L, false); return { src: M.P['kor.src'], tex: !!M.hxKorTex() }; });
  ok(r.src === 'glas' && !r.tex, '  off: the Körner go back to Glasharfe');
  ok(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await H.close();
  process.exit(H.summary() ? 1 : 0);
})().catch(async (e) => { console.log('FAIL fatal ' + (e && e.stack || e)); await H.close(); process.exit(1); });
