// ---- Schleife in Schleife (SPEC §15; Riley's time-lag accumulator): a new loop B, longer or shorter than A, records what
// A plays every pass with feedback fb < 1 through a soft ceiling – inside the processor ({acc}), read before written, so
// B plays A one pass of B later, fading by fb each pass: a cloud that meets itself anew. „Festhalten“ stops the
// recording (B keeps its tape); the tape is copied out now and then to be kept (a reload brings it back) ----
const HX_ACC_R = [[2 / 3, '⅔'], [5 / 4, '1¼'], [3 / 2, '1½'], [7 / 4, '1¾'], [2, '×2']];
const HX_ACC_FB = [0.5, 0.7, 0.85, 0.95];
function hxAccMake(A, ratio, fb) {
  if (!A || A.bew || !HX.node) return null;
  const slot = hxZiel(); if (slot < 0) { toast('Alle ' + HX_SLOTS + ' Plätze sind belegt – für die Sammelschleife braucht es einen freien.'); return null; }
  ratio = ratio || 1.5; fb = fb != null ? fb : 0.7;
  const Lf = Math.max(Math.round(0.5 * SR), Math.round(hxLen(A) * ratio * SR)), n = Lf + Math.round(0.02 * SR);
  if (!hxMemOk(2 * n)) return null;
  const sw = hxNextSeam(A), [aud] = hxChunks(n);
  const B = hxLoopMake({ slot, lock: 'frei', Lf, ph0: sw.f, eng: A.eng, notes: [], src: A.src || 0, taumeln: false, fokus: false, wwhy: {} });
  B.acc = { src: A.key, fb, ratio, on: true }; B.taumeln = false;
  const c = { in: A.src || 0, w0: 0, w1: Lf, f0: 0, pre: 0, len: Lf, post: n - Lf, n, aus: null, stale: true };
  const sid = hxSchNew(B.id, c, { aud, join: 'cut', X: 0.005, rho: 0, kind: 'sammel', fin: 0, probe: false, chain: false });
  const S = HX.sch.get(sid); S.accLive = true;
  hxPost({ acc: { loop: B.id, src: [A.id], fb, gi: 1 } });
  const bk = B.key;
  hxHist({ kind: 'neu', label: hxName(B) + ' sammelt ' + hxName(A), undo() { const X = hxByKey(bk); if (X) hxDrop(X); }, redo() { toast('Die Sammelschleife neu anlegen: in der Karte von ' + hxName(A) + '.'); } });
  hxSay(hxName(B) + ' sammelt ' + hxName(A) + ' – ' + dec((Lf / SR).toFixed(1)) + ' s, Rückführung ' + dec(fb)); hxSaveMeta(B.id); hxCardDirty(); hxRailDirty();
  return B;
}
// its feedback, on and off (Festhalten keeps the tape as it is), its tape cleared
function hxAccSet(B, what, v) {
  const R = B && B.acc; if (!R) return;
  const A = hxByKey(R.src);
  if (what === 'fb') R.fb = v;
  if (what === 'on') { R.on = !!v; if (!v) hxAccCopy(B, true); }
  if (what === 'leer') { const S = HX.sch.get(B.sch[0]); if (S) { const [z] = hxChunks(S.n); hxSchSwap(S, Object.assign({}, S.cut, { stale: true }), { aud: z, f: hxNextSeam(B).f, join: 'cut', X: S.X, rho: 0 }); S.accLive = true; setTimeout(() => hxAccLink(B), 0); } }
  hxAccLink(B);
  hxSaveMeta(B.id); hxCardDirty();
  hxSay(hxName(B) + ': ' + (what === 'fb' ? 'Rückführung ' + dec(v) : what === 'on' ? (v ? 'sammelt wieder' : 'festgehalten') : 'geleert') + (A ? '' : ' (ihre Quelle ist weg)'));
}
function hxAccLink(B) { const R = B.acc, A = R && hxByKey(R.src); hxPost({ acc: R && R.on && A ? { loop: B.id, src: [A.id], fb: R.fb, gi: 1 } : { loop: B.id, off: 1 } }); }
// the tape copied out (to keep it: the page's copy, saved; at Festhalten, every half minute while it records)
function hxAccCopy(B, save) {
  const S = B && HX.sch.get(B.sch[0]); if (!S || S.accBusy) return;
  S.accBusy = true;
  const [dst, tr] = hxChunks(S.n);
  HX.wait.set('acc' + S.id, (d) => { S.accBusy = false; if (!d || d.err || !HX.sch.has(S.id)) return; S.aud = d.chunks; S.saved = 0; S.accLive = !!(B.acc && B.acc.on); S.accT = performance.now(); if (save !== false) hxSaveSch(S); });
  if (!hxPost({ accCopy: { schicht: S.id, dst } }, tr)) { S.accBusy = false; HX.wait.delete('acc' + S.id); }
}
function hxAccTick() {
  const pn = performance.now();
  for (const B of hxLoopsLive()) { if (!B.acc || !B.acc.on) continue; const S = HX.sch.get(B.sch[0]); if (S && !S.accBusy && pn - (S.accT || 0) > 30000) { S.accT = pn; hxAccCopy(B); } }
}
// after a reload or a rebuild: the Sammelschleifen find their sources again
function hxAccRelink() { for (const B of hxLoopsLive()) if (B.acc) hxAccLink(B); }

