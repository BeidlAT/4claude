// ---- Schleifen arpen (owner, 29.10.2026: „zusätzlich kann man Schleifen arpen“): the Sporenwerk takes the notes that
// sound in a Schleife now as its chord – the loop's own record (S.wn: what was played into it, in the key it follows
// now), each note counted as sounding while it is held, a struck one for a beat after its onset (half a second in a free
// loop): the chord changes as the loop goes round. arp.schl: the Fokus loop or a place of the Leiste; arp.schlStill: the
// loop itself goes quiet while the Sporenwerk plays it (its level, not its record – off again, it is back) ----
function arpLoopOf() {
  const k = P['arp.schl'], live = typeof hxLoopsLive === 'function' ? hxLoopsLive() : [];
  if (k === '0') return live.find((L) => L.id === HX.fokus) || live.find((L) => L.state === 'spielt' && L.sch.some((id) => hxWCan(HX.sch.get(id)))) || null;
  const id = HX.slot[+k - 1]; return live.find((L) => L.id === id) || null;   // (the Leiste's place k)
}
function arpLoopPool(t) {
  const L = arpLoopOf(); if (!L || L.state !== 'spielt' || !HX.node) return [];
  const f = hxF(t), k = hxPassK(L, f), a = hxPassF(L, k), b = hxPassF(L, k + 1), key = hxWKeyNow(), out = [];
  for (const id of L.sch) {
    const S = HX.sch.get(id); if (!hxWCan(S)) continue;
    const W = hxWNotesT(L, S) || S.wn, pos = ((f - a) / Math.max(1, b - a)) * W.len, win = W.u === 'b' ? 1 : 0.5;
    for (const x of W.n) {
      const end = x.t + Math.max(x.d != null ? x.d : 0, win);
      if (!(pos >= x.t - 1e-6 && pos < end) && !(x.held && pos < end)) continue;
      const fr = hxWF(L, W, x, key), d = hxDeg(fr), per = N.free ? 12 : Math.max(1, Math.round((N.notes.length - 1) / Math.max(1, P['t.range'])));
      out.push({ f: fr, idx: N.free ? Math.round(12 * Math.log2(fr / N.base)) : d.oct * per + d.deg, layers: [{ eng: hxWEng(L, x), ratio: 1, deg: 0, lvl: 1, bus: stripIn(x.src === 'eb2' ? 'eb2' : 'fin') }], x: d.x != null ? d.x : 0.5, y: x.y0 != null ? x.y0 : 0.5, vel: x.vel != null ? x.vel : 0.7, seq: x.t, key: 'L' + L.id + ':' + x.t });
    }
  }
  return out;
}
// the loop goes quiet while the Sporenwerk plays it – and comes back after (its gain through the processor, gliding)
function arpLoopQuiet() {
  const want = P['arp.on'] && P['arp.quelle'] !== 'spiel' && P['arp.schlStill'] ? arpLoopOf() : null;
  if (ARP.still && (!want || ARP.still.L !== want)) { const X = ARP.still.L; if (X.state !== 'weg') hxGain(X.id, X.d.gain, null, 0.08); ARP.still = null; }
  if (want && !ARP.still) { hxGain(want.id, 0, null, 0.08); ARP.still = { L: want }; }
}
