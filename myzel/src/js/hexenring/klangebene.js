// ---- Klangfarbe der ganzen Schleife (owner, 30.10.2026: „anklicken – und wenn man es rückgängig haben will, einfach
// wieder dort klicken … für alle Einträge“): Tonhöhe, Verstimmen, Verwandeln and Färben over the whole loop are a
// layer of their own (L.rx), not steps written into the audio. Each row is a switch: the chip shows what is on, the same
// chip again takes it back. The result is worked out anew every time – from the audio before the layer (S.rxB, kept
// beside the Schicht and stored with it, ~r / ~q) and, for a Wuchs version, from its own render (V.aud0) – so a
// Noten-Werkzeug that grows a new version keeps the colour (before, the version came without it: the Verwandlung
// vanished, „dünner“ played the original again). The same ops in the same Workers as the stretch edits (abschnitt.js,
// abschnitt-werk.js, verwandeln.js); the stretch edits of a chosen part stay steps. ----
const hxRxOf = (L) => Object.assign({ pitch: 0, ct: 0, verw: null, farb: null }, L.rx || {});
const hxRxOn = (rx) => !!(rx && (rx.pitch || rx.ct || rx.verw || rx.farb));
const hxRxSig = (rx) => (hxRxOn(rx) ? [rx.pitch || 0, rx.ct || 0, rx.verw || '', rx.farb || ''].join(':') : '');
// the layer's ops, in order: the pitch (semitones and cents as one), the Verwandlung, the Färbung
function hxRxOps(rx) { const o = []; if (rx.pitch || rx.ct) o.push(['pitch', (rx.pitch || 0) + (rx.ct || 0) / 100]); if (rx.verw) o.push([rx.verw, 0]); if (rx.farb) o.push([rx.farb, 0]); return o; }
// a chunk list of n frames through the layer (the stretch pre … pre + len; the ops of HX_RX_WHOLE take all of it)
async function hxRxRender(ch, n, pre, len, rx, seed) {
  let cur = ch;
  for (const [op, v] of hxRxOps(rx)) {
    const [r0, r1] = HX_RX_WHOLE.has(op) ? [0, n] : [pre, Math.min(n, pre + len)]; if (r1 - r0 < 64) continue;
    cur = hxRwPut(cur, r0, await hxRw(cur, r0, r1, op, v, [], seed));
  }
  return cur;
}
const HX_RX_WORDS = { nebel: 'Nebel', sporen: 'Sporen', keimen: 'Keimen', wurzel: 'Wurzel', krone: 'Krone', erde: 'Erde', licht: 'Licht', welken: 'Welken', spriessen: 'Sprießen' };
function hxRxLabel(rx) { const w = []; if (rx.pitch) w.push(hxRxPitchName(rx.pitch)); if (rx.ct) w.push(hxRxPitchName(rx.ct / 100)); if (rx.verw) w.push(HX_RX_WORDS[rx.verw] || rx.verw); if (rx.farb) w.push(HX_RX_WORDS[rx.farb] || rx.farb); return w.length ? w.join(', ') : 'Klangfarbe aus'; }
// a switch: the same value again takes the row back, another one sets it
function hxRxToggle(L, kind, v) {
  const was = hxRxOf(L), to = Object.assign({}, was);
  to[kind] = was[kind] === v ? (kind === 'pitch' || kind === 'ct' ? 0 : null) : v;
  return hxRxLayer(L, to);
}
// the layer set: every Schicht's audio (dry and baked) from its base, a Wuchs version from its own render – written at
// the next seam, or now, as the stretch edits are (hxSwapAt); one step for ↶ ↷ (the layer before, the layer after)
async function hxRxLayer(L, to, o = {}) {
  if (!L || L.bew || !HX.node) return false;
  hxRxWait();
  const sch = hxBandReady(L); if (!sch) return false;
  if (L.rxBusy) { L.rxAgain = to; return true; }
  const was = hxRxOf(L), key = L.key, seed = L.rxSeed || (L.rxSeed = ((Math.random() * 2147483646) | 0) + 1), sig = hxRxSig(to), on = hxRxOn(to);
  L.rxBusy = true; L.rx = on ? Object.assign({}, to) : null; hxEdRender();   // (the chips show it at once)
  try {
    const jobs = [];
    for (const S of sch) {
      // its base: the audio before the layer; gone (a cut, a reload without it): what plays now counts as the base
      if (!S.rxB || S.rxB.n !== S.n) S.rxB = { aud: S.aud, bak: S.bak || null, n: S.n };
      const B = S.rxB, ver = S.ver || 0;
      const aud = on ? await hxRxRender(B.aud, S.n, S.pre, S.len, to, seed) : B.aud;
      const bak = B.bak ? (on ? await hxRxRender(B.bak, S.n, S.pre, S.len, to, seed) : B.bak) : null;
      const vs = [];
      for (const w of ['wu', 'anc']) { const V = S[w]; if (!V || !V.aud) continue; V.aud0 = V.aud0 || V.aud; vs.push([w, on ? await hxRxRender(V.aud0, V.n, V.pre || 0, V.len, to, seed) : V.aud0]); }
      jobs.push({ S, ver, aud, bak, vs });
    }
    if (hxByKey(key) !== L || L.state === 'weg') return false;
    const sw = hxSwapAt(L), done = [];
    for (const j of jobs) {
      const S = j.S; if (!HX.sch.has(S.id) || (S.ver || 0) !== j.ver) continue;   // (changed meanwhile – the next set takes it)
      for (const [w, a] of j.vs) { S[w].aud = a; S[w].rxs = sig; }
      const Xf = S.X || Math.round(0.01 * SR), g = { pre: S.pre, len: S.len, X: Xf, zo: S.zo || 0 };
      done.push([S.key, S.aud, j.aud, S.bak, j.bak]);
      if (S.play && S.play !== 'ab') {   // (a version plays: it is sent anew; the Abdruck takes the layer too, for when the version ends)
        S.aud = j.aud; S.bak = j.bak; S.kc = hxSeamOf(g, j.aud); S.kcB = j.bak ? hxSeamOf(g, j.bak) : null; S.saved = 0; if (j.bak) S.savedB = 0;
        hxWPlay(S, S.play, sw.f, false, !!sw.now); continue;
      }
      const c = Object.assign({}, S.cut, { pre: S.pre, len: S.len, n: S.n, aus: S.aus ? Object.assign({}, S.aus) : null, stale: true });
      hxSchSwap(S, c, { aud: j.aud, bak: j.bak, f: sw.f, now: !!sw.now, join: 'xf', X: Xf, rho: hxRho(j.bak && S.chain && !L.folgt ? j.bak : j.aud, S.n, S.pre, S.len, Xf), zo: S.zo || 0, kc: hxSeamOf(g, j.aud), kcB: j.bak ? hxSeamOf(g, j.bak) : null, dr: S.dr, rx: true });
    }
    if (L.tr0) L.tr0 = Object.assign({}, L.tr0, { sch: L.tr0.sch.map((s) => { const d = done.find((x) => x[0] === s.key && x[1] === s.aud); return d ? Object.assign({}, s, { aud: d[2], bak: s.bak === d[3] ? d[4] : s.bak }) : s; }) });   // (a trimmed loop: its whole carries the layer too)
    if (!o.noHist) { const w1 = Object.assign({}, to); hxHist({ kind: 'rx', label: hxName(L) + ': ' + hxRxLabel(to), undo() { const Y = hxByKey(key); if (Y) hxRxLayer(Y, was, { noHist: true }); }, redo() { const Y = hxByKey(key); if (Y) hxRxLayer(Y, w1, { noHist: true }); } }); }
    hxSay(hxName(L) + ': ' + hxRxLabel(to)); hxSaveLoop(L); hxEdTouch(L); hxCardDirty(); hxRailDirty();
    return true;
  } finally { L.rxBusy = false; hxEdRender(); if (L.rxAgain) { const t = L.rxAgain; L.rxAgain = null; hxRxLayer(L, t, { noHist: true }); } }
}
// a Wuchs version just rendered takes the layer (hxWRenderFor), its own render kept beside it
async function hxRxOnV(L, V) {
  const rx = hxRxOf(L); if (!V || !V.aud || !hxRxOn(rx)) return V;
  V.aud0 = V.aud; V.aud = await hxRxRender(V.aud0, V.n, V.pre || 0, V.len, rx, L.rxSeed || 1); V.rxs = hxRxSig(rx);
  return V;
}
