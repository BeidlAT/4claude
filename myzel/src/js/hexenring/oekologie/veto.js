// ---- per-note vetoes (KONZEPT §5.4: „Einzelne Noten ablehnen geht auf iPad und PC in der Karte“): the changes a varied
// loop plans for its next passes, each with ✕ – the note goes back to what the pass before had there (or leaves), the
// passes after it grow from the pass so corrected, a pass already rendering is rendered again; the operator that made it
// counts a little less for the session ----
function hxVetoList(L) {
  if (L.bew || hxEigN(L) < 2 || L.state !== 'spielt' || !(hxWLebt(L) || hxWLm(L))) return [];
  const now = hxNowT(), kNow = hxPassK(L, Math.round(hxF(now))), out = [];
  for (let k = kNow + 1; k <= kNow + 2; k++) {
    if (hxPassF(L, k) < hxF(now + 0.15)) continue;
    for (const id of L.sch) {
      const S = HX.sch.get(id); if (!hxWCan(S)) continue;
      const W0 = hxWBase(L, S); if (!W0 || !W0.n.length) continue;
      hxVarW(L, S, k, W0);
      const r = S.vc && S.vc.m.get(k); if (!r || !r.chg) continue;
      for (const x of r.chg) out.push({ S, k, x, W0, r });
    }
  }
  return out;
}
function hxVetoText(L, v) {
  const W = v.W0, x = v.x, key = hxWKeyNow(), f = hxWF(L, W, x, key), m = 69 + 12 * Math.log2(f / 440), nm = NOTE_NAMES[((Math.round(m) % 12) + 12) % 12] + (Math.floor(Math.round(m) / 12) - 1);
  const pos = W.u === 'b' ? 'Takt ' + hxBarNo(L.d.b0 - TG.o + v.k * L.d.beats + x.t) + ' · ' + dec((1 + ((x.t % (L.bpb || 4)) + (L.bpb || 4)) % (L.bpb || 4)).toFixed(2).replace(/\.?0+$/, '')) : dec(x.t.toFixed(2)) + ' s';
  return nm + ' · ' + pos;
}
function hxVeto(L, v) {
  const S = v.S, C = S.vc, r = C && C.m.get(v.k); if (!r) return false;
  const W = v.W0, key = hxVKey(W, v.x), i = r.n.findIndex((x) => hxVKey(W, x) === key); if (i < 0) return false;
  const prev = (C.m.get(v.k - 1) || { n: W.n }).n, t = v.x.t, same = (x) => Math.abs(x.t - t) < (W.u === 'b' ? 1 / 16 : 0.04);
  const n = r.n.filter((x, j) => j !== i), back = prev.filter((x) => same(x) && !n.some((y) => hxVKey(W, y) === hxVKey(W, x)));
  r.n = hxVSort(n.concat(back.map((x) => Object.assign({}, x))));
  r.chg = r.chg.filter((x) => hxVKey(W, x) !== key); r.W = Object.assign({}, W, { n: r.n });
  for (const x of [...C.m.keys()]) if (x > v.k) C.m.delete(x);   // (the passes after it grow from the corrected one)
  for (const op of r.ops || []) if (op !== 'ret' && op !== 'nein') HX.vw[op] = clamp((HX.vw[op] != null ? HX.vw[op] : 1) * 0.85, 0.05, 2);
  for (const [kk] of HX.kn) if (kk.startsWith('v:' + S.key + ':' + v.k + ':')) HX.kn.delete(kk);
  hxPassNotesDrop(L);
  if (hxWLebt(L) && S.wk != null && S.wk >= v.k && hxPassF(L, v.k) > hxF(hxNowT() + 0.05)) hxWSlot(L, S, v.k, {});   // (rendering already: rendered again – the new render takes the pass's slot)
  hxSay(hxName(L) + ': eine Note abgelehnt'); hxCardDirty();
  return true;
}

