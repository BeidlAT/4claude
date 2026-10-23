// ---- Nähren (SPEC §15): Rhizom – each loop note strikes a Rhizom voice on the Hexenring's way. The net is a choice per
// loop (owner, 21.10.2026; L.rhzNetz): „eigen“ (the default) – a net of the loop's own (rhzOwn: the field's degrees, but
// the loop's avalanches and exhaustion stay the loop's, so the player's playing is untouched by them, as a Werk-Rahmen
// render's own net) – or „geteilt“, step 4's way: the loop strikes the live net, avalanches and exhaustion shared with the
// player. A switch takes the next strike; voices already ringing finish on the net they began in. Regen – each loop note plants a Keim
// (rgSeed) while the Sporenregen runs; a spore striking it sounds on the Hexenring's way too ----
function hxNaehrRhz(L, n, t) {
  if (!ENGINES.rhz) return;
  const o = { pan: n.pan || 0, bus: hxFeedBus(), loop: true, hxSrc: 'hxr', rhzNet: L.rhzNetz === 'geteilt' ? null : 'hx:' + L.id }, v = hit('rhz', t, n.f, n.y, n.vel, o);
  HX.rhzN = (HX.rhzN || 0) + 1; const lg = HX.rhzLog || (HX.rhzLog = []); lg.push({ t, v: !!v, loop: !!(v && v.loop), bus: o.bus, cost: v ? v.cost : 0, net: v && v.rz ? (v.rz.sp === RHZ.sp ? 'live' : v.rz.sp === (RHZ.own && RHZ.own.get(o.rhzNet)) ? o.rhzNet : '?') : null }); if (lg.length > 64) lg.shift();   // (the last strikes, for the card's tests)
}
// a loop gone or no longer nourishing Rhizom: its net goes with it
function hxRhzNetDrop(L) { if (RHZ.own) RHZ.own.delete('hx:' + L.id); }
// the card's „Netz: eigen · geteilt“ (↶/↷ take it back)
function hxRhzNetz(L, m, quiet) {
  const was = L.rhzNetz === 'geteilt' ? 'geteilt' : 'eigen'; m = m === 'geteilt' ? 'geteilt' : 'eigen';
  if (m === was) return false;
  L.rhzNetz = m; if (m === 'geteilt') hxRhzNetDrop(L);   // (its own net rests until it is chosen again – made afresh then)
  if (!quiet) {
    const lk = L.key, go = (x) => () => { const Y = hxByKey(lk); if (Y) hxRhzNetz(Y, x, true); };
    hxHist({ kind: 'rhzNetz', label: hxName(L) + ': Rhizom-Netz ' + m, undo: go(was), redo: go(m) });
    hxSay(hxName(L) + ': Rhizom ' + (m === 'eigen' ? 'im eigenen Netz' : 'im Netz deines Spiels'));
  }
  hxSaveMeta(L.id); hxCardDirty();
  return true;
}
function hxNaehrRgn(L, n, t) {
  if (!RG.on) return;
  const n0 = RG.kn, k = rgSeed({ tt: null, u: clamp(n.x, 0, 1), v: clamp(n.y, 0.04, 0.96), f: n.f, t0: t, end: beatAt(t) + 4 * GK.p.rgK, hue: VIS.hueAt(n.x), w: n.vel });
  if (k && (RG.kn > n0 || k.hx)) k.hx = L.key;   // (a Keim the player planted stays the player's)
  HX.rgnN = (HX.rgnN || 0) + 1;
}

// ---- Nähren · Glut and Sehne (SPEC §15): a Hof of their voices, held, fed by the Schleife through its send (output 2,
// out of tap reach) – each voice's processor takes the loop's audio as its input (an injection point): Sehne's strings
// ring in sympathy with what of the loop falls on their modes (no pluck: they start silent), Glut's tuned feedback
// catches the loop's partials near its mode and glows on (below its threshold: the loop is the tinder). Tuned to the
// loop's most played degrees (an audio loop: root, third and fifth of the scale) and retuned with the scale; into the
// strip „Hexenring“; each voice costs its measured price (HX_COST.hof), counted in voiceLoad() while it rings ----
HXN.feed = new Map();   // loop id + ':' + kind → { kind, key, vs: [{ node, pf, I }], mg, out, ctx, cost, sig }
const HX_FEED = {
  shn: { proc: 'myzel-string', n: 4, y: 0.5, inj: 0.06, lvl: 0.7, name: 'Sehne' },   // (inj: a sine on the string's note comes out as loud as it went in, 6 % off it 32 dB less – t-hx-oeko2)
  glt: { proc: 'myzel-ember', n: 2, y: 0.22, inj: 0.1, lvl: 0.8, name: 'Glut' },   // (y 0.22: below the threshold, the loop is its tinder; on its note a sine comes out as loud as it went in, 6 % off ≈ 28 dB less)
};
// the degrees a Hof is tuned to (scale indices of the field): the loop's most played ones, else root, third, fifth (+ octave)
function hxFeedIdx(L, kind) {
  const per = hxScPer(), want = HX_FEED[kind].n, c = new Map();
  for (const n of L.notes || []) { if (!(n.f > 0) || n.deg == null) continue; const I = (n.oct || 0) * per + n.deg; c.set(I, (c.get(I) || 0) + (n.v != null ? n.v : 0.7)); }
  let I = [...c.entries()].sort((a, b) => b[1] - a[1]).map((x) => x[0]).slice(0, want);
  if (!I.length) { const t = N.free ? [0, 4, 7, 12] : [0, Math.min(2, per - 1), Math.min(4, per - 1), per]; I = t.slice(0, want); }
  while (I.length < want) I.push(I[I.length % Math.max(1, I.length)] + per);
  return I;
}
function hxFeedMake(L, kind) {
  const F = HX_FEED[kind];
  if (!A.ctx || !A.ctx.__dspOK || !HX.node || !ENGINES[kind] || A.workletBroken.has(kind)) return null;
  hxWakeRing();
  try {
    const sp = hxSplit(), mg = A.ctx.createChannelMerger(2), i = L.slot, out = G(F.lvl), rich = !!Q.rich, vs = [];
    sp.connect(mg, 2 * i, 0); sp.connect(mg, 2 * i + 1, 1);
    out.connect(stripIn('hxr'));
    const I = hxFeedIdx(L, kind), t = A.ctx.currentTime + 0.03;
    I.forEach((ix, j) => {
      const f = clamp(hxIdxF(ix), 30, 4000), prm = wkPrm(kind);
      const node = new AudioWorkletNode(A.ctx, F.proc, { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [rich ? 2 : 1], channelCount: 2, channelCountMode: 'explicit', channelInterpretation: 'speakers',
        processorOptions: { rich, lite: A.lite ? 1 : 0, prm, seed: wkSeed(), inj: F.inj, on: { on: t, f, y: F.y, vel: kind === 'glt' ? 0 : 0.5, silent: 1, seed: wkSeed() } } });
      const pf = node.parameters.get('freq'); pf.value = f; node.parameters.get('hoehe').value = F.y;
      const pan = PAN(clamp((j / Math.max(1, I.length - 1) - 0.5) * 0.8, -1, 1));
      mg.connect(node); node.connect(pan).connect(out);
      node.onprocessorerror = () => { console.warn('Hexenring: ' + F.name + ' einer Schleife – Prozessorfehler'); hxFeedDrop(L.id, kind); };
      vs.push({ node, pf, I: ix, pan });
    });
    return { kind, key: L.key, vs, mg, out, ctx: A.ctx, cost: vs.length * HX_COST.hof[kind][rich ? 1 : 0], sig: hxFeedSig() };   // (measured as built: HX_COST.hof)
  } catch (e) { console.warn(e); return null; }
}
const hxFeedSig = () => N.notes.map((x) => x.f.toFixed(2)).join(',');   // (the field's notes as built – an announced key changes them at its bar line)
function hxFeedDrop(id, kind, later) {
  const k = id + ':' + kind, F = HXN.feed.get(k); if (!F) return;
  HXN.feed.delete(k);
  const kill = () => { try { F.mg.disconnect(); F.out.disconnect(); for (const v of F.vs) { v.node.port.postMessage({ kill: 1 }); v.node.disconnect(); v.pan.disconnect(); } } catch (e) {} };
  if (later) { setP(F.out.gain, 0, 0.6); setTimeout(kill, 3000); } else kill();   // (switched off: it rings out first)
}
// a new scale: every Hof glides to its degrees there (as the live web retunes)
function hxFeedRetune() {
  const sig = hxFeedSig();
  for (const F of HXN.feed.values()) {
    if (F.sig === sig || F.ctx !== A.ctx) continue;
    F.sig = sig; const t = A.ctx.currentTime;
    for (const v of F.vs) { const f = clamp(hxIdxF(v.I), 30, 4000); v.pf.cancelScheduledValues(t); v.pf.setValueAtTime(v.pf.value, t); v.pf.setTargetAtTime(f, t, 0.08); }
  }
}
const hxFeedCost = () => { let c = 0; for (const F of HXN.feed.values()) if (F.ctx === A.ctx) c += F.cost; return c; };
// the loop's send (output 2): on while it feeds a web or a Hof
function hxSendSync(L) {
  const n = L.naehrt || {}, on = !!(n.gsp || n.glt || n.shn) && L.slot != null;
  if (on !== !!L.sendOn) { L.sendOn = on; hxPost({ send: on ? { loop: L.id, ch: L.slot, g: 1, X: Math.round(0.03 * SR) } : { loop: L.id, ch: -1, X: Math.round(0.03 * SR) } }); }
}
// Nähren for one of rhz · rgn · glt · shn (gsp and kor: hxNaehrGsp, hxNaehrKor)
function hxNaehr(L, kind, on, quiet) {
  if (!L || L.bew) return false;
  if (kind === 'gsp') return hxNaehrGsp(L, on);
  if (kind === 'kor') return hxNaehrKor(L, on);
  if (kind === 'acc') return on ? !!hxAccMake(L) : false;
  L.naehrt = Object.assign({}, L.naehrt, { [kind]: !!on });
  const nm = { rhz: 'Rhizom', rgn: 'den Regen', glt: 'die Glut', shn: 'die Sehne' }[kind];
  if (kind === 'glt' || kind === 'shn') {
    if (on) { if (!HXN.feed.has(L.id + ':' + kind)) { const F = hxFeedMake(L, kind); if (!F) { L.naehrt[kind] = false; toast(HX_FEED[kind].name + ' geht hier nicht (kein AudioWorklet).', 3000); hxCardDirty(); return false; } HXN.feed.set(L.id + ':' + kind, F); } }
    else hxFeedDrop(L.id, kind, true);
    hxSendSync(L);
  }
  if (kind === 'rhz' && !on) hxRhzNetDrop(L);
  if (kind === 'rgn' && on && !RG.on && !quiet) toast('Die Keime wachsen, sobald der Sporenregen läuft (Gestik: Neigen → Sporenregen).', 4000);
  if (L.fd) L.fd[kind] = 0;
  if (!quiet) { hxSay(hxName(L) + (on ? ' nährt ' + nm : ': ' + nm.replace(/^(den|die) /, '') + ' aus')); hxSaveMeta(L.id); }
  hxCardDirty();
  return true;
}

// what a loop keeps of its ecology (the record, the snapshot): Live, MIDI out, Ladung, Zersetzung, a Sammelschleife's source
function hxEcoOf(L) {
  const o = {};
  if (L.live) o.live = 1; if (L.midi) o.midi = 1; if (L.rhzNetz === 'geteilt') o.rhzNetz = 'geteilt'; if (L.ladung) o.ladung = 1; if (L.einw) o.einw = L.einw; if (L.moder) o.moder = Object.assign({}, L.moder); if (L.gesang) o.gesang = 1;
  if (L.acc) o.acc = { src: L.acc.src, fb: L.acc.fb, ratio: L.acc.ratio, on: !!L.acc.on };
  return Object.keys(o).length ? o : null;
}
function hxEcoSet(L, e) {
  if (!e) return;
  L.live = !!e.live; L.midi = !!e.midi; L.rhzNetz = e.rhzNetz === 'geteilt' ? 'geteilt' : 'eigen'; L.ladung = !!e.ladung; L.einw = e.einw || 0; L.moder = e.moder ? Object.assign({}, e.moder) : null; L.gesang = !!e.gesang;
  if (e.acc) { L.acc = Object.assign({}, e.acc); L.taumeln = false; setTimeout(() => { if (hxByKey(L.key) === L) hxAccLink(L); }, 0); }
}
