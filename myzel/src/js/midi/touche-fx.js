/* ---------- Touché F5–F12: the sound shaped in depth (owner, 26.10.2026) ---------- */
// „Mit dem Touché viel weitreichendere Klangformung – acht weitere F-Tasten, jede klingt fundamental anders“ – chosen:
// each shapes the sound being played (not a sound of its own). Five live in the processor myzel-tfx (js/dsp/touche-fx.js),
// one is a place in space (the browser's own binaural panner), two play the instrument itself: Fächer (more voices of
// each held note – a pitch shifter on the signal warbled, real voices are as clean as the note) and the Arpeggio. The insert sits in
// the strips Klang and Ebene 2 (st.tD dry / st.tW wet, see buildStrips): made when such a Spielweise is chosen, taken in
// when the hand moves, out again once it has been at rest a moment and every tail has rung out – then the strip is
// exactly as before (the Touché's rule: at rest no Spielweise changes the sound). A Schleife records what it does (the
// Gespielt tap follows the strip).
const TFX_WK = ['koerner', 'eis', 'oberton', 'stottern', 'resonanz'];
const TFX = { mode: '', ins: new Map(), busy: false, arp: { next: 0, i: 0, dir: 1, tm: 0, last: 0 } };
const tfxStrips = () => ['fin', 'eb2'].map((k) => MIX.s[k]).filter((st) => st && st.tW);
// the beat (Stottern, Arpeggio): the Puls's tempo, else its setting
const tfxBeat = () => 60 / (typeof tgBpm === 'function' && A.ctx ? tgBpm(A.ctx.currentTime) : P['seq.bpm'] || 100);
// what the strings of Resonanz are tuned to: the held notes (up to six, octaves to fill), else the key's root triad
function tfxFreqs() {
  const fs = [...new Set([...touches.values()].map((tt) => Math.round(tt.f * 100) / 100))].sort((a, b) => a - b).slice(0, 6);
  if (!fs.length) { const n = N.notes || [], r = n.length ? n[Math.min(n.length - 1, Math.floor(n.length / 3))].f : 220; fs.push(r, r * 1.2599, r * 1.4983); }
  const out = fs.slice(); for (let k = 0; out.length < 6; k++) out.push(fs[k % fs.length] * (k % 2 ? 0.5 : 2));
  return out.map((f) => { while (f > 1500) f /= 2; while (f < 55) f *= 2; return f; });
}
// one strip's insert for a Spielweise: the processor, or the place in space (a delay for the distance – its Doppler –,
// the air's low pass, the nearness's low shelf, the HRTF panner) beside a dry path that holds everything at rest
function tfxMake(st, w) {
  const ctx = A.ctx;
  if (TFX_WK.includes(w)) {
    if (!ctx.__dspOK) return null;
    let node; try { node = new AudioWorkletNode(ctx, 'myzel-tfx', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2], channelCount: 2, channelCountMode: 'explicit' }); } catch (e) { console.warn(e); return null; }
    const I = { w, node, out: node, idle: true, at: performance.now() };
    node.port.onmessage = (e) => { if (e.data && e.data.idle != null) { I.idle = !!e.data.idle; I.at = performance.now(); } };
    node.port.postMessage({ mode: w });
    st.in.connect(node);
    return I;
  }
  if (w === 'ort') {
    const inG = G(1), dG = G(1), wG = G(0), out = G(1), dl = ctx.createDelay(0.2), air = BQ('lowpass', 20000, 0.5), near = BQ('lowshelf', 160, 0.7), pn = ctx.createPanner();
    near.gain.value = 0; pn.panningModel = 'HRTF'; pn.distanceModel = 'inverse'; pn.refDistance = 1; pn.rolloffFactor = 0.55; pn.maxDistance = 60;
    if (pn.positionX) { pn.positionX.value = 0; pn.positionY.value = 0; pn.positionZ.value = -1; } else pn.setPosition(0, 0, -1);
    dl.delayTime.value = 1 / 343;
    st.in.connect(inG); inG.connect(dG).connect(out); inG.connect(dl).connect(air).connect(near).connect(pn).connect(wG).connect(out);
    return { w, inG, dG, wG, out, dl, air, near, pn, idle: true, at: performance.now() };
  }
  return null;
}
function tfxDrop(st, I, later) {
  const go = () => { try { st.in.disconnect(I.node || I.inG); } catch (e) {} try { (I.out).disconnect(); } catch (e) {} if (I.node) { try { I.node.port.postMessage({ kill: 1 }); } catch (e) {} } };
  if (later) setTimeout(go, 80); else go();
}
// in or out of the strip's path: a swap of the two gains in the same quantum (the insert's output is its input at rest)
function tfxIn(st, I, on) {
  if (I.inPath === on) return;
  I.inPath = on;
  const t = A.ctx.currentTime + 0.02;
  if (on) I.out.connect(st.tW);
  st.tD.gain.cancelScheduledValues(0); st.tW.gain.cancelScheduledValues(0);
  st.tD.gain.setValueAtTime(on ? 0 : 1, t); st.tW.gain.setValueAtTime(on ? 1 : 0, t);
  if (!on) setTimeout(() => { if (!I.inPath) { try { I.out.disconnect(st.tW); } catch (e) {} } }, 120);
  if (on && IDLE.on) idleWake();
}
// the Spielweise and the hand, from tchApply: the inserts made or dropped, the controls sent, Ort and Arpeggio moved
function tfxSet(w, v) {
  if (!A.ctx || !MIX.s.fin) return;
  const mine = TFX_WK.includes(w) || w === 'ort' ? w : '';
  if (mine !== TFX.mode) {
    for (const st of tfxStrips()) { const I = TFX.ins.get(st.k); if (I) { tfxIn(st, I, false); tfxDrop(st, I, true); TFX.ins.delete(st.k); } }
    TFX.mode = mine;
  }
  const p = Math.max(v.weg, v.her, v.li, v.re);
  if (mine) {
    for (const st of tfxStrips()) {
      if (st.k === 'eb2' && P['v.layer'] === 'off') continue;   // (Ebene 2 silent: no insert of its own)
      let I = TFX.ins.get(st.k);
      if (!I) { I = tfxMake(st, mine); if (!I) continue; TFX.ins.set(st.k, I); }
      if (p > 0) { tfxIn(st, I, true); I.at = performance.now(); }
      if (I.node) I.node.port.postMessage({ c: [v.weg, v.her, v.li, v.re], beat: tfxBeat(), freqs: mine === 'resonanz' ? tfxFreqs() : undefined });
      else if (mine === 'ort') tfxOrt(I, v, p);
    }
  }
  TFX.busy = !!mine && p > 0;
  tfxArp(w === 'arp' ? v : null);
  tfxFan(w === 'faecher' ? v : null);
}
// Ort: weg – far away (up to 25 m: quieter, the air takes the top, more hall, the sound arrives later – moving, it
// bends like a passing train), heran – close to the ear (warm low end, drier), links/rechts – around the head (±100°)
function tfxOrt(I, v, p) {
  const t = A.ctx.currentTime, d = Math.max(0.35, 1 + 24 * Math.pow(v.weg, 1.5) - 0.65 * v.her), az = (v.re - v.li) * 1.75, k = Math.min(1, p * 6);
  const x = d * Math.sin(az), z = -d * Math.cos(az);
  if (I.pn.positionX) { I.pn.positionX.setTargetAtTime(x, t, 0.04); I.pn.positionZ.setTargetAtTime(z, t, 0.04); } else I.pn.setPosition(x, 0, z);
  I.dl.delayTime.setTargetAtTime(Math.min(0.15, d / 343), t, 0.06);
  I.air.frequency.setTargetAtTime(Math.max(1800, 20000 / (1 + 0.33 * (d - 1))), t, 0.05);
  I.near.gain.setTargetAtTime(7 * v.her, t, 0.05);
  // (the panner's distance law takes 0.55 of it: the level still falls far away, the hall comes up – modSet rev)
  I.dG.gain.setTargetAtTime(1 - k, t, 0.012); I.wG.gain.setTargetAtTime(k * (1 + 0.25 * v.her), t, 0.012);
  I.idle = p === 0;
}
// every 250 ms: an insert at rest long enough (its processor idle, Ort let go for 300 ms) leaves the path
setInterval(() => {
  if (!A.ctx) return;
  for (const st of tfxStrips()) {
    const I = TFX.ins.get(st.k); if (!I || !I.inPath) continue;
    const still = TCH.v.weg === 0 && TCH.v.her === 0 && TCH.v.li === 0 && TCH.v.re === 0;
    if (still && I.idle && performance.now() - I.at > 300) tfxIn(st, I, false);
  }
  TFX.busy = [...TFX.ins.values()].some((I) => I.inPath);
}, 250);
// ---- Arpeggio: the held notes played one after another, from the hand – the pressure starts it (and is its strength),
// weg its speed (on the Puls's grid while it runs: 2, 3, 4, 6, 8 per beat; else 3 … 16 a second), heran its range (one to
// three octaves) and shorter notes, rechts upward, links downward, neither up and down, both at once at random. Each
// step strikes every layer of the note (Klang and Ebene 2) as the field would; the held notes go on sounding. ----
function tfxArp(v) {
  const R = TFX.arp, p = v ? Math.max(v.weg, v.her, v.li, v.re) : 0;
  R.v = v; R.p = p;
  if (!v || p < 0.04) { if (R.tm) { clearInterval(R.tm); R.tm = 0; } R.next = 0; return; }
  if (!R.tm) { R.tm = setInterval(tfxArpTick, 25); tfxArpTick(); }
}
function tfxArpStep() {
  const v = TFX.arp.v, run = SEQ.on && typeof tgBeat === 'function';
  if (run) { const per = [2, 3, 4, 6, 8][Math.round(v.weg * 4)]; return { grid: per }; }
  return { dt: 1 / (3 + 13 * Math.pow(v.weg, 1.2)) };
}
function tfxArpTick() {
  const R = TFX.arp, v = R.v; if (!v || !A.ctx) return;
  const held = [...touches.values()].filter((tt) => tt.layers && tt.layers.length).sort((a, b) => a.f - b.f);
  if (!held.length) { R.next = 0; return; }
  const now = A.ctx.currentTime, S = tfxArpStep(), oct = 1 + Math.round(2 * v.her);
  const seq = []; for (let o = 0; o < oct; o++) for (const tt of held) seq.push([tt, o]);
  const stepAt = (t) => { if (!S.grid) return t + S.dt; const b = tgBeat(t); return tgTime((Math.floor(b * S.grid + 1e-6) + 1) / S.grid); };
  if (!R.next || R.next < now) R.next = S.grid ? stepAt(now + 0.012) : now + 0.012;
  while (R.next < now + 0.1) {
    const t = R.next, n = seq.length, s = v.re - v.li;
    let i;
    if (Math.min(v.li, v.re) > 0.3) i = Math.floor(Math.random() * n);
    else if (s > 0.25) { R.dir = 1; i = R.i = (R.i + 1) % n; }
    else if (s < -0.25) { R.dir = -1; i = R.i = (R.i - 1 + n) % n; }
    else { if (n > 1 && (R.i + R.dir >= n || R.i + R.dir < 0)) R.dir = -R.dir; i = R.i = Math.max(0, Math.min(n - 1, R.i + R.dir)); }
    const [tt, o] = seq[i], nt = stepAt(t), dur = Math.max(0.03, (nt - t) * (0.85 - 0.55 * v.her)), vel = 0.3 + 0.65 * Math.pow(R.p, 0.8);
    for (const ly of tt.layers) {
      const f = lyF(ly, tt.f, tt.col) * Math.pow(2, o) * (tt.mb ? Math.pow(2, tt.mb / 12) : 1);
      hit(ly.eng, t, f, tt.my != null ? tt.my : tt.y, vel * ly.lvl, { pan: touchPan(tt.x), bus: ly.bus, gate: dur });
    }
    R.next = nt;
  }
}
// ---- Fächer: each held note fans out into voices of its own, played by its own sound (every layer): weg a pair detuned
// either side (6 … 18 cents, wide apart), links the octave below, rechts the octave above, heran the fifth (3:2). A voice
// is started the first time its direction is pressed and stays with the note (its level follows the hand, 30 ms; it
// takes the note's Höhe and Tonhöhe as the note does) – let go of the note, it ends with it. A struck sound (Kalimba,
// Glocke …) strikes its voice as the direction comes in. Leaving the Spielweise, the voices fade and end. ----
const TFX_FAN = [['du', 1, 0.75], ['dd', 1, -0.75], ['lo', 0.5, -0.2], ['hi', 2, 0.2], ['q', 1.5, 0.35]];
const tfxFanLv = (k, v) => (k === 'du' || k === 'dd' ? v.weg : k === 'lo' ? v.li : k === 'hi' ? v.re : v.her);
TFX.fans = new Set();
function tfxFan(v) {
  if (!A.ctx) return;
  const now = A.ctx.currentTime;
  if (!v) { for (const tt of TFX.fans) tfxFanEnd(tt, now); return; }
  for (const tt of touches.values()) {
    if (!tt.layers || !tt.layers.length) continue;
    const F = tt.fan || (tt.fan = {});
    TFX.fans.add(tt);
    for (const [k, ratio, pan] of TFX_FAN) {
      const lv = tfxFanLv(k, v);
      let C = F[k];
      const det = k === 'du' ? Math.pow(2, (6 + 12 * v.weg) / 1200) : k === 'dd' ? Math.pow(2, -(6 + 12 * v.weg) / 1200) : 1;
      const strike = (C2) => tt.layers.forEach((ly, j) => {
        const f = lyF(ly, tt.f, tt.col) * ratio * det * (tt.mb ? Math.pow(2, tt.mb / 12) : 1), y = tt.my != null ? tt.my : tt.y, vel = noteVel(tt) * ly.lvl, o = { pan: clamp(touchPan(tt.x) + pan, -1, 1), bend: tt.fb || tt.bend, bus: C2.g[j] };
        if (ENGINES[ly.eng] && ENGINES[ly.eng].sustain) { if (!C2.sus[j]) { const vv = playNote(ly.eng, now, f, y, vel, o); if (vv) { C2.sus[j] = vv; tt.voices.push({ v: vv, ly, fan: k }); } } }
        else hit(ly.eng, now, f, y, vel * Math.max(0.35, lv), o);
      });
      if (!C && lv > 0.02) { C = F[k] = { g: tt.layers.map((ly) => { const g = G(0); g.connect(ly.bus); return g; }), sus: [], lv: 0 }; strike(C); }
      else if (C && lv > 0.05 && C.lv <= 0.05) strike(C);   // (a struck sound strikes again as the direction comes back; a held one goes on)
      if (C) { for (const g of C.g) g.gain.setTargetAtTime(lv, now, 0.03); C.lv = lv; }
    }
  }
}
// leaving Fächer (or the note gone): its voices fade and end, their gains go
function tfxFanEnd(tt, now) {
  const F = tt.fan; TFX.fans.delete(tt); if (!F) return; tt.fan = null;
  for (const k in F) { const C = F[k]; for (const g of C.g) g.gain.setTargetAtTime(0, now, 0.04); for (const vv of C.sus) if (vv && vv.alive && vv.release) vv.release(); setTimeout(() => { for (const g of C.g) { try { g.disconnect(); } catch (e) {} } }, 6000); }
  tt.voices = tt.voices.filter((x) => !x.fan);
}
// a held note let go: its fan's gains go once its voices have ended (they ended with the note – onUp releases them)
setInterval(() => { if (!A.ctx) return; for (const tt of TFX.fans) if (!touches.has(tt.id) || touches.get(tt.id) !== tt) tfxFanEnd(tt, A.ctx.currentTime); }, 500);
// a note pressed while the hand holds still: Fächer gives it its voices, Resonanz tunes to it (the hand's own changes come
// through tchApply)
setInterval(() => {
  if (!A.ctx || !TCH.live) return;
  const w = P['midi.tch'];
  if (w === 'faecher' && touches.size) tfxFan(TCH.v);
  else if (w === 'resonanz' && TFX.mode === 'resonanz') { const fq = tfxFreqs(), k = fq.join(); if (k !== TFX.fqK) { TFX.fqK = k; for (const I of TFX.ins.values()) if (I.node) I.node.port.postMessage({ freqs: fq }); } }
}, 80);
