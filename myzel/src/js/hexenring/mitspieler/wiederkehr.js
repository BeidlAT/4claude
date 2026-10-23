// ---- Wiederkehr (SPEC §12.3): a loop marked „darf wiederkehren“ that rests gathers activation when live phrases match its
// motif (steps and metric places, the longest common run); it halves every eight bars; over the threshold it comes back at
// the next four-bar line, announced a bar ahead (a ring forms at the field's edge; ✕ refuses). Never a loop the player
// muted in the last eight bars ----
const HXW_K = { wk: null };
function hxWkTok(I0, I1, b1) { return clamp(I1 - I0, -7, 7) + ':' + hxMcOf(b1); }
function hxWkSeq(L) {
  const mi = hxMi(L); if (mi.wkSeq && mi.wkSeq.src === L.sch.join(',')) return mi.wkSeq.s;
  const S = L.sch.map((id) => HX.sch.get(id)).find((x) => x && x.wn && x.wn.u === 'b'); if (!S) return null;
  const W = S.wn, ns = W.n.filter((x) => !x.held).sort((a, b) => a.t - b.t), top = [];
  for (const x of ns) { const p = top[top.length - 1]; if (p && Math.abs(p.t - x.t) < 0.03) { if (hxVIdx(W, x) > p.I) p.I = hxVIdx(W, x); } else top.push({ t: x.t, I: hxVIdx(W, x) }); }
  const s = []; for (let i = 0; i < top.length * 2; i++) { const a = top[i % top.length], b = top[(i + 1) % top.length]; s.push(hxWkTok(a.I, b.I, b.t)); }   // (cyclic: twice round)
  mi.wkSeq = { src: L.sch.join(','), s }; return s;
}
// (step 4) without a Takt – a free loop, or no grid at all: the motif as steps and durations (its seconds), as answers hear
// a free phrase (the IOI's class at two beats a second)
const hxWkTokD = (I0, I1, ioi) => clamp(I1 - I0, -7, 7) + ':d' + hxDcOf(ioi * 2);
function hxWkSeqD(L) {
  const mi = hxMi(L); if (mi.wkSeqD && mi.wkSeqD.src === L.sch.join(',')) return mi.wkSeqD.s;
  const S = L.sch.map((id) => HX.sch.get(id)).find((x) => x && x.wn && x.wn.n.length); if (!S) return null;
  const W = S.wn, sec = W.u === 'b' ? 60 / tgBpm(hxNowT()) : 1, ns = W.n.filter((x) => !x.held).sort((a, b) => a.t - b.t), top = [];
  for (const x of ns) { const p = top[top.length - 1], t = x.t * sec; if (p && Math.abs(p.t - t) < 0.03) { if (hxVIdx(W, x) > p.I) p.I = hxVIdx(W, x); } else top.push({ t, I: hxVIdx(W, x) }); }
  if (top.length < 2) return null;
  const P0 = W.len * sec, s = [];
  for (let i = 0; i < top.length * 2; i++) { const a = top[i % top.length], b = top[(i + 1) % top.length]; let d = b.t - a.t; if (d <= 0) d += P0; s.push(hxWkTokD(a.I, b.I, d)); }
  mi.wkSeqD = { src: L.sch.join(','), s }; return s;
}
function hxWkMatch(live, seq) { let best = 0; for (let i = 0; i < live.length; i++) for (let j = 0; j < seq.length; j++) { let k = 0; while (i + k < live.length && j + k < seq.length && live[i + k] === seq[j + k]) k++; if (k > best) best = k; } return best; }
function hxWkBar(B, now) {
  if (!P['hx.gWk']) return;
  const grid = hxGrid(), b = tgBeat(now), lv = HXA.notes.filter((x) => x.t > now - 4 * hxGdBarLen()), lg = lv.filter((x) => x.g), live = [], liveD = [];
  for (let i = 1; i < lg.length; i++) live.push(hxWkTok(lg[i - 1].I, lg[i].I, lg[i].b));
  for (let i = 1; i < lv.length; i++) liveD.push(hxWkTokD(lv[i - 1].I, lv[i].I, lv[i].t - lv[i - 1].t));   // (step 4: without a Takt)
  for (const L of hxLoopsLive()) {
    const mi = hxMi(L); if (!mi.wk || L.bew) continue;
    const takt = hxTakt(L) && grid;   // (step 4: a free loop – or no grid – by its own passes)
    mi.act = (mi.act || 0) * Math.pow(0.5, 1 / 8);
    if (L.state === 'spielt' || (mi.uMute != null && b - mi.uMute < 32) || (mi.wkHold != null && b < mi.wkHold)) { if (L.state === 'spielt') mi.act = 0; continue; }
    const seq = takt ? hxWkSeq(L) : hxWkSeqD(L), lt = takt ? live : liveD; if (!seq || lt.length < 3) continue;
    const m = hxWkMatch(lt.slice(-12), seq); if (m >= 3) mi.act += (m - 2) * 0.5;
    if (mi.act >= 1 && !HXW_K.wk) {
      let t4, b4 = null;
      if (takt) { b4 = Math.ceil((b + 4) / 16 - 1e-9) * 16; t4 = tgTime(b4); }   // (the next four-bar line at least a bar away)
      else if (L.state === 'stumm') { const f = Math.round(hxF(now + hxGdBarLen())); t4 = hxT(hxPassF(L, hxPassK(L, f) + 1)); }   // (its own next pass at least a „bar“ – 2 s, or a bar of the grid – away)
      else t4 = grid ? tgTime(Math.ceil(tgBeat(now + hxGdBarLen()) - 1e-9)) : now + hxGdBarLen();   // (angehalten: from its start, a beat of the grid or 2 s ahead)
      HXW_K.wk = { key: L.key, t: t4, b: b4, tA: t4 - hxGdBarLen() };
      mi.act = 0;
      hxKnAdd('wk:' + L.key + ':' + Math.round(t4 * 100), null, t4, Math.max(now, t4 - hxGdBarLen()), 'wk', null, L.slot);
      if (!HX.chips || HX.chips.kind === 'gd') HX.chips = { kind: 'wk', until: performance.now() + (t4 - now + 1) * 1000 };
      hxSay(hxName(L) + ' kehrt wieder ' + (b4 != null ? 'ab Takt ' + hxBarNo(b4) : 'in ' + Math.max(1, Math.round(t4 - now)) + ' s')); hxRailDirty();
    }
  }
}
function hxWkTick(now) {
  const K = HXW_K.wk; if (!K) return;
  const L = hxByKey(K.key);
  if (!L || L.state === 'spielt') { HXW_K.wk = null; hxRailDirty(); return; }
  if (now < K.t - 0.08) return;
  HXW_K.wk = null; HX.gdAct = true;
  try {
    if (L.state === 'angehalten') { if (K.b != null && hxTakt(L)) { hxState(L.id, 'spielt', K.t, { b0: K.b, X: 0.01 }); L.d.b0 = K.b + TG.o; } else hxReenterAt([L], null, K.t, true); }   // (step 4: a free one from its start)
    else hxState(L.id, 'spielt', K.t, { X: 0.03 });
  } finally { HX.gdAct = false; }
  L.stance = 'kehrt wieder'; setTimeout(() => { if (L.stance === 'kehrt wieder') { L.stance = ''; hxRailDirty(); } }, 4000);
  if (HX.chips && HX.chips.kind === 'wk') HX.chips = null;
  hxSay(hxName(L) + ' ist wieder da'); hxRailDirty(); hxCardDirty();
}
function hxWkNein() { const K = HXW_K.wk; if (!K) return false; HXW_K.wk = null; const L = hxByKey(K.key); if (L) hxMi(L).wkHold = tgBeat(hxNowT()) + 32; for (const [k, b] of HX.kn) if (b.kind === 'wk') HX.kn.delete(k); if (HX.chips && HX.chips.kind === 'wk') HX.chips = null; hxSay('Wiederkehr abgelehnt'); hxRailDirty(); return true; }

