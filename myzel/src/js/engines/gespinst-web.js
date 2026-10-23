// ---- Gespinst's web (SPEC §3.11): one myzel-web node for every Gespinst voice – fingers, Ebene 2, the lanes, the rain.
// Each voice sends into its own channel's send (post-fader: a muted or soloed-away lane feeds nothing), the channels'
// sends sum into the web, the web returns on its own mixer channel „Gespinst“ (Halo = its level). Built at the first
// Gespinst note once the module is there; counted in the budget while it rings (it idles itself after Ruhe); rebuilt
// when the level (8 or 12 strings) changes; retuned (a 90-ms glide) with the field's scale; {clear} at Stille/Schlafen.
// (the web's cost: 24 webs against 24 Nebel voices, the voices' method – 1.82–2.15 / 2.51–2.70 measured, the highest + 15 %)
const GSP_PEAK = 1.5, GSP_COST = [2.47, 3.11];
const gspInUse = () => [P['v.eng'], P['v.layer'], ...[0, 1, 2, 3].map((i) => P['l' + i + '.on'] && P['l' + i + '.eng']), RG.on && GK.p && GK.p.rgS].includes('gsp');
// the strings: the first N degrees of the field's scale from its base octave (Saiten „Zwei Oktaven“: every other one,
// over two octaves); a free field has no scale – the root's harmonics then
function gspFreqs() {
  const n = Q.rich ? 12 : 8, base = N.base * Math.pow(2, P['v.oct']), out = [];
  if (N.free || N.notes.length < 2) { const H = [1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24]; for (let i = 0; i < n; i++) out.push(base * H[i]); return out; }
  const per = N.notes.length - 1, step = P['gsp.saiten'] === 'zwei' ? 2 : 1, rng = Math.max(1, P['t.range']), sc = per / rng;   // (degrees per octave)
  for (let j = 0; out.length < n; j += step) out.push(N.notes[j % sc].f * Math.pow(2, Math.floor(j / sc) + P['v.oct']));
  return out;
}
const gspKop = () => clamp(P['gsp.kopplung'] + (MOD.t.gspK && MOD.t.gspK.s.size ? 0.6 * modVal('gspK') : 0), 0, 1);   // (Gestik: tilt and Ladung move it)
const gspPrm = () => ({ kopplung: gspKop(), nachklang: P['gsp.nachklang'], metall: P['gsp.metall'], steg: P['gsp.steg'] });
function gspWeb() {
  if (!A.ctx || !A.ctx.__dspOK || A.workletBroken.has('gsp')) return null;
  if (A.gsp && A.gsp.ctx === A.ctx && A.gsp.rich === !!Q.rich) return A.gsp;
  if (A.gsp) gspDrop();
  try {
    const node = new AudioWorkletNode(A.ctx, 'myzel-web', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2], channelCount: 2, channelCountMode: 'explicit',
      processorOptions: { rich: !!Q.rich, lite: A.lite ? 1 : 0, prm: gspPrm(), freqs: gspFreqs(), seed: wkSeed() } });
    const inp = G(1), out = G(dbToGain(P['gsp.halo']));
    inp.connect(node); node.connect(out).connect(stripIn('gsp'));
    if (IDLE.keeper && IDLE.ctx === A.ctx) node.connect(IDLE.keeper.gain);   // Ruhe: the web keeps its time while the rest sleeps
    const W = A.gsp = { node, inp, out, ctx: A.ctx, rich: !!Q.rich, active: false, cost: GSP_COST[Q.rich ? 1 : 0], kop: gspKop() };
    node.port.onmessage = (e) => { const m = e.data; if (!m || A.gsp !== W) return; if (m.active) W.active = true; if (m.idle) W.active = false; };
    node.onprocessorerror = () => { A.workletBroken.add('gsp'); console.warn('Klangquelle gsp: Prozessorfehler'); gspDrop(); dspState(DSP.state); };
    for (const st of MIX.src) if (st.gS) { try { st.gS.disconnect(); } catch (e) {} st.gS.connect(inp); }
    return W;
  } catch (e) { console.warn(e); return null; }
}
function gspDrop() {
  const W = A.gsp; if (!W) return;
  A.gsp = null;
  try { W.node.port.postMessage({ kill: 1 }); W.inp.disconnect(); W.node.disconnect(); W.out.disconnect(); } catch (e) {}
}
// a channel's send into the web (made once per channel; its gain follows the channel's fader, mute and solo – gspGate)
function gspSend(bus) {
  const st = MIX.src.find((x) => x.in === bus) || MIX.s.fin;
  if (!st.gS) { st.gS = G(0); gspGate(st, setNow); if (A.gsp) st.gS.connect(A.gsp.inp); }
  return st.gS;
}
function gspGate(st, set) { if (st.gS) set(st.gS.gain, st.silent ? 0 : stripGain(st)); }
const gspSet = () => { if (A.gsp) { A.gsp.kop = gspKop(); A.gsp.node.port.postMessage({ set: gspPrm() }); } hxWebsMsg({ set: gspPrm() }); };   // (Hexenring: the loops' own webs too)
const gspRetune = () => { if (A.gsp) A.gsp.node.port.postMessage({ tune: gspFreqs(), glide: true }); hxWebsMsg({ tune: gspFreqs(), glide: true }); };
const gspClear = () => { if (A.gsp) A.gsp.node.port.postMessage({ clear: 1 }); hxWebsMsg({ clear: 1 }); };
// Gestik's coupling (tilt, Ladung): the web hears it about 20 times a second while it rings
function gspTick() { const W = A.gsp; if (W && W.active && Math.abs(gspKop() - W.kop) > 0.005) gspSet(); }

