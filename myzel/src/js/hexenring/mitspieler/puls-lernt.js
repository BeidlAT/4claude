// ---- Puls lernt (SPEC §12.3): the Euclidean rhythm (8, 12 or 16 steps a bar; pulses, rotation) nearest a bass or
// percussion loop's onsets (Hamming distance over its most frequent bar), its most frequent note – written into a lane
// of the Puls on request (↶ in the patch's history) ----
function hxPulsFit(L) {
  const S = L && L.sch.map((id) => HX.sch.get(id)).find((x) => x && x.wn && x.wn.u === 'b');
  if (!S) return null;
  const W = S.wn, bpb = L.bpb || 4, bars = Math.max(1, Math.round(W.len / bpb)), ons = W.n.filter((x) => !x.held).map((x) => x.t);
  if (ons.length < 2) return null;
  let best = null;
  for (const [steps, div] of [[8, '0.5'], [12, '0.3333'], [16, '0.25']]) {
    const st = bpb / steps, pats = {};
    for (let b = 0; b < bars; b++) { const p = new Array(steps).fill(0); for (const t of ons) if (t >= b * bpb - st / 2 && t < (b + 1) * bpb - st / 2) p[clamp(Math.round((t - b * bpb) / st), 0, steps - 1)] = 1; const k = p.join(''); pats[k] = (pats[k] || 0) + 1; }
    const pat = Object.keys(pats).sort((a, b) => pats[b] - pats[a])[0].split('').map(Number);
    const err = ons.reduce((a, t) => a + Math.abs(t / st - Math.round(t / st)), 0) / ons.length;   // (how well the grid itself fits)
    for (let k = 1; k <= steps; k++) for (let r = 0; r < steps; r++) {
      const e = euclid(steps, k, r); let h = 0; for (let i = 0; i < steps; i++) if (!!e[i] !== !!pat[i]) h++;
      const sc = h / steps + 0.6 * err + 0.01 * (steps / 16);
      if (!best || sc < best.sc) best = { steps, puls: k, rot: r, div, ham: h, sc, pat: pat.join('') };
    }
  }
  const c = {}; for (const x of W.n) { const I = hxVIdx(W, x); c[I] = (c[I] || 0) + 1; }
  const I = +Object.keys(c).sort((a, b) => c[b] - c[a])[0], per = hxVPer(W), len = N.free ? 12 * P['t.range'] + 1 : N.notes.length;
  let oct = 0, deg = I; while (deg >= len && oct < 2) { deg -= per; oct++; } while (deg < 0 && oct > -2) { deg += per; oct--; }
  const ec = {}; for (const x of W.n) ec[x.eng] = (ec[x.eng] || 0) + 1;
  return Object.assign(best, { deg: clamp(deg, 0, Math.max(0, len - 1)), oct, eng: Object.keys(ec).sort((a, b) => ec[b] - ec[a])[0] });
}
function hxPulsLernt(L, lane) {
  const F = hxPulsFit(L); if (!F) { toast('In dieser Schleife ist kein Rhythmus zu lesen.'); return null; }
  const p = 'l' + lane + '.';
  remember();
  for (const [k, v] of [['steps', F.steps], ['puls', F.puls], ['rot', F.rot], ['div', F.div], ['deg', F.deg], ['oct', F.oct], ['on', true]]) setParam(p + k, v);
  if (ENGINES[F.eng] && P[p + 'eng'] !== F.eng) setParam(p + 'eng', F.eng);
  hxSay('Puls lernt: Spur ' + (lane + 1) + ', ' + F.puls + ' aus ' + F.steps);
  toast('Spur ' + (lane + 1) + ' spielt jetzt ' + F.puls + ' aus ' + F.steps + ' (Versatz ' + F.rot + ') wie ' + hxName(L) + '.', 3000, { label: 'Rückgängig', fn: undo });
  return F;
}

