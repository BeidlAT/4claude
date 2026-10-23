// ---- roles (SPEC §12.3): a hand-tuned score per role from the notes – register, polyphony, length, density, the share on
// the beats, range, how the source plays – with a confidence; the player's tap in the card overrides it. The same over the
// last bars of live playing is the live role ----
const HX_ROLES = ['bass', 'akkorde', 'melodie', 'flaeche', 'schlag'], HX_ROLEW = { bass: 'Bass', akkorde: 'Akkorde', melodie: 'Melodie', flaeche: 'Fläche', schlag: 'Schlag' };
const hxSig = (x) => 1 / (1 + Math.exp(-x));
const hxMidi = (f) => 69 + 12 * Math.log2(Math.max(1, f) / 440);
// notes {t (beats), d (beats or null), f, vel, eng} over `len` beats
function hxRoleFeat(ns, len) {
  if (!ns.length) return null;
  const m = ns.map((x) => hxMidi(x.f)).sort((a, b) => a - b), med = m[m.length >> 1], range = m[m.length - 1] - m[0];
  const dur = ns.reduce((a, x) => a + (x.d != null ? Math.min(x.d, 8) : 0.4), 0) / ns.length;
  let poly = 0; for (const x of ns) poly += ns.filter((y) => y.t <= x.t + 0.03 && (y.d != null ? y.t + y.d : y.t + 0.4) > x.t + 0.01).length; poly /= ns.length;
  const dens = ns.length / Math.max(0.5, len), strong = ns.filter((x) => Math.abs(x.t - Math.round(x.t)) < 0.06).length / ns.length;
  const c = {}; for (const x of ns) { const a = (ENG_META[x.eng] || {}).art || 'haelt'; c[a] = (c[a] || 0) + 1; }
  const art = (c.schlaegt || 0) > (c.haelt || 0) ? 'schlaegt' : 'haelt';
  return { med, range, dur, poly, dens, strong, art, vel: ns.reduce((a, x) => a + (x.vel || 0.6), 0) / ns.length };
}
function hxRoleScore(F) {
  const s = {
    bass: 2.4 * hxSig((50 - F.med) / 4) + 0.5 * hxSig((1.4 - F.poly) / 0.2) + 0.3 * F.strong - 0.6 * hxSig((F.poly - 1.8) / 0.2),
    akkorde: 2.4 * hxSig((F.poly - 1.8) / 0.25) + 0.4 * hxSig((F.med - 48) / 5),
    melodie: 1.1 * hxSig((1.4 - F.poly) / 0.2) + 1.1 * hxSig((F.med - 57) / 4) + 0.6 * hxSig((F.range - 5) / 2) + 0.4 * hxSig((F.dens - 0.6) / 0.3) - 0.9 * hxSig((F.dur - 2.5) / 0.6),
    flaeche: 2 * hxSig((F.dur - 2) / 0.5) + (F.art === 'haelt' ? 0.5 : 0) + 0.4 * hxSig((0.7 - F.dens) / 0.25),
    schlag: (F.art === 'schlaegt' ? 1.1 : 0) + 1.2 * hxSig((0.35 - F.dur) / 0.1) + 0.7 * hxSig((3 - F.range) / 1.5) + 0.5 * hxSig((F.dens - 1.2) / 0.4),
  };
  const r = HX_ROLES.slice().sort((a, b) => s[b] - s[a]);
  return { role: r[0], conf: clamp((s[r[0]] - s[r[1]]) / Math.max(0.5, s[r[0]]), 0, 1), s };
}
// a loop's notes in beats (its first Schicht's for Wuchs, else what the ring shows)
function hxRoleNotes(L) {
  const out = []; let len = 0;
  for (const id of L.sch) { const S = HX.sch.get(id), W = S && S.wn; if (!W || !W.n.length) continue; const k = W.u === 'b' ? 1 : tgBpm(hxNowT()) / 60; len = Math.max(len, W.len * k); for (const x of W.n) out.push({ t: x.t * k, d: x.d != null ? x.d * k : null, f: x.f, vel: x.vel, eng: x.eng }); }
  if (!out.length && L.notes && L.notes.length) { const lb = hxTakt(L) ? L.d.beats : hxLen(L) * tgBpm(hxNowT()) / 60; len = lb; for (const x of L.notes) out.push({ t: x.ph * lb, d: x.d != null ? (x.d * tgBpm(hxNowT())) / 60 : null, f: x.f, vel: x.v, eng: x.eng }); }
  return { ns: out, len };
}
function hxRoleOf(L) {
  if (!L || L.bew) return null;
  const mi = hxMi(L);
  if (mi.rolle) return { role: mi.rolle, conf: 1, user: true };
  const sig = L.sch.join(',') + '|' + (L.notes || []).length;
  if (mi.rc && mi.rc.sig === sig) return mi.rc.r;
  const { ns, len } = hxRoleNotes(L), F = hxRoleFeat(ns, len), r = F ? Object.assign(hxRoleScore(F), { F }) : null;
  mi.rc = { sig, r }; return r;
}
const hxMi = (L) => L.mi || (L.mi = {});
// the player's notes now (Gespielt – never a loop's, an answer's or the Bordun), in beats from t0
function hxLiveNotes(t0, t1) {
  const g = hxGrid(), b0 = g ? tgBeat(t0) : t0 * 2;
  return hxNotes(t0, t1, 0, true).filter((e) => e.src !== 'bor' && e.t0 >= t0).map((e) => ({ t: (g ? tgBeat(e.t0) : e.t0 * 2) - b0, d: e.t1 != null ? (g ? tgBeat(e.t1) - tgBeat(e.t0) : (e.t1 - e.t0) * 2) : e.hold ? 1 : null, f: e.f, vel: e.vel, eng: e.eng, y: e.y0 }));
}

