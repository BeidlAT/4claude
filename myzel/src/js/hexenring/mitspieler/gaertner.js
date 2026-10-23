// ---- the Gärtner (SPEC §12.3): decisions at bar lines only, one bar of hysteresis, shown a bar ahead; Treu and Lebendig
// loops only lower, rise or pause (never their notes), Variieren and Wandern also thin or fill. Never a loop the player
// muted, never one he excluded, never the live sound ----
const HX_GST = ['schaut', 'pflegt', 'antwortet'], HX_GSTW = { schaut: 'schaut zu', pflegt: 'pflegt', antwortet: 'antwortet' };
const HXG = { E: 0, Es: 0, r0: null, want: 'still', bar: null, plan: null, tE: 0, live: null, liveF: null };
const hxGdStep = () => Math.max(0, HX_GST.indexOf(P['hx.gaertner']));
// the bar the Gärtner thinks in: the Takt's, else two seconds
const hxGdBarLen = () => (hxGrid() ? (4 * 60) / tgBpm(hxNowT()) : 2);
function hxGdBarAt(t) { if (hxGrid()) { const b = Math.floor(tgBeat(t) / 4 + 1e-9); return { i: b, t: tgTime(b * 4), next: tgTime((b + 1) * 4) }; } const i = Math.floor(t / 2); return { i, t: i * 2, next: (i + 1) * 2 }; }
// the energy of the playing (SPEC §12.3): notes per second, velocity, register, polyphony, Ladung – over the last two bars
function hxGdEnergy(now) {
  const B = hxGdBarLen(), ns = hxLiveNotes(now - 2 * B, now + 0.01), F = hxRoleFeat(ns, (2 * B * (hxGrid() ? tgBpm(now) / 60 : 2)));
  const lad = typeof LAD !== 'undefined' ? LAD.lvl || 0 : 0;
  if (!F) return { E: 0.1 * lad, F: null, n: 0 };
  const nps = ns.length / (2 * B);
  return { E: clamp(0.4 * Math.min(1, nps / 5) + 0.25 * F.vel + 0.15 * clamp((F.med - 40) / 48, 0, 1) + 0.1 * Math.min(1, (F.poly - 1) / 2) + 0.1 * lad, 0, 1), F, n: ns.length };
}
// what the player does over the last bar: a role, or „still“ (no note began and none sounds)
function hxGdLiveRole(t0, t1) {
  const ns = hxLiveNotes(t0, t1), held = hxNotes(t0, t1, 0, true).some((e) => e.src !== 'bor' && e.t0 < t1 && (e.t1 == null ? e.hold : e.t1 > t1 - 0.05));
  if (!ns.length && !held) return 'still';
  if (ns.length < 2) return HXG.r0 && HXG.r0 !== 'still' ? HXG.r0 : 'melodie';
  const F = hxRoleFeat(ns, (t1 - t0) * (hxGrid() ? tgBpm(t1) / 60 : 2));
  return F ? hxRoleScore(F).role : 'still';
}
// may the Gärtner touch this loop now? (playing, not excluded, not a suggestion, not muted by the player, not right after a
// new Schicht – §6.4 –, not under a ✕ of the last eight bars)
function hxGdMay(L, b) {
  if (!L || L.bew || L.state === 'weg' || L.slot == null) return false;
  const mi = hxMi(L);
  if (mi.gOff || mi.sugg || L.state !== 'spielt' || L.pendTo) return false;
  if (!hxGuardOk(L)) return false;
  if (mi.gHold != null && b < mi.gHold) return false;
  return true;
}
// what each loop should do for the coming bar: {gt (its level × gt), gd (Variieren/Wandern: −1 thinner … +1 fuller), word}
function hxGdTarget(L, want, E, F) {
  const st = hxGdStep(), role = (hxRoleOf(L) || {}).role, eig = hxEigN(L);
  let gt = 1, gd = 0, word = '';
  if (st >= 1 && P['hx.gRollen']) {   // die anderen spielen
    if (want === 'melodie' && role === 'melodie') { if (eig >= 2) { gd = -1; word = 'macht Platz'; } else { gt = dbToGain(-6); word = 'macht Platz'; } }
    else if (want === 'bass' && role === 'bass') { gt = 0; word = 'macht Platz'; }
    else if (want === 'akkorde' && role === 'akkorde') { if (eig >= 2) gd = -0.6; else gt = dbToGain(-4); word = 'macht Platz'; }
  }
  if (st >= 1 && P['hx.gPlatz'] && gt > 0) {   // Platz machen: dense playing thins (or lowers, in your register most), sparse lets fills in
    if (eig >= 2) gd = clamp(gd + clamp((0.35 - E) * 2.5, -1, 1), -1, 1);
    else if (E > 0.35) { const ov = F && role ? 1 - clamp(Math.abs(((hxRoleOf(L) || {}).F || {}).med - F.med) / 24 || 0, 0, 0.7) : 0.6, db = -4 * clamp((E - 0.35) / 0.45, 0, 1) * ov, q = Math.round(db / 2) * 2; if (q < 0) { gt *= dbToGain(q); word = word || 'macht Platz'; } }
    if (eig >= 2 && Math.abs(gd) >= 0.3 && !word) word = gd > 0 ? 'füllt' : 'macht Platz';
  }
  return { gt: gt < 1e-3 ? 0 : gt, gd: Math.round(gd * 10) / 10, word };
}
// every bar line: the live role (held a bar), the energy, and a plan for the next bar line when anything changes
function hxGdBar(B, now) {
  const len = B.next - B.t, prevB = { t: B.t - len, next: B.t };
  const r1 = hxGdLiveRole(prevB.t, prevB.next), held = HXG.r0 != null && r1 === HXG.r0;
  HXG.r0 = r1;
  if (held || HXG.want == null) HXG.want = r1;
  const en = hxGdEnergy(B.t); HXG.Es = 0.55 * HXG.Es + 0.45 * en.E; HXG.E = en.E; HXG.liveF = en.F;
  if (hxGdStep() >= 2) { hxWkBar(B, now); hxBeglAuto(); }
  if (hxGdStep() < 1) { if (hxLoopsLive().some((L) => (L.gg != null && L.gg !== 1) || L.gdv)) hxGdReset(); return; }
  const tB = B.next, bt = hxGrid() ? tgBeat(now) : now, items = [];
  for (const L of hxLoopsLive()) {
    if (!hxGdMay(L, bt)) continue;
    const T = hxGdTarget(L, HXG.want, HXG.Es, en.F), g0 = L.gg != null ? L.gg : 1, d0 = L.gdv || 0;
    if (Math.abs(gainToDb(Math.max(T.gt, 1e-4)) - gainToDb(Math.max(g0, 1e-4))) > 0.5 || Math.abs(T.gd - d0) >= 0.3) items.push({ key: L.key, gt: T.gt, gd: T.gd, word: T.word, g0, d0 });
  }
  if (!items.length) return;
  HXG.plan = { t: tB, b: hxGrid() ? Math.round(tgBeat(tB)) : null, items };
  if (!HX.chips || HX.chips.kind === 'gd') HX.chips = { kind: 'gd', until: performance.now() + Math.max(2500, (tB - now + 1.5) * 1000) };
  hxSay('Gärtner: ' + items.map((x) => { const L = hxByKey(x.key); return L ? hxName(L) + ' ' + (x.gt === 0 ? 'pausiert' : x.word || 'wie gespielt') : ''; }).filter(Boolean).join(', ') + (HXG.plan.b != null ? ' ab Takt ' + hxBarNo(HXG.plan.b) : ''));
  hxRailDirty(); hxCardDirty();
}
// the plan at its bar line: each level a 40-ms ramp (equal power is a gain ramp of one loop), the density for its next passes
function hxGdApply(now) {
  const G = HXG.plan; if (!G || now < G.t - 0.06) return;
  HXG.plan = null;
  for (const x of G.items) {
    const L = hxByKey(x.key); if (!L || !hxGdMay(L, hxGrid() ? tgBeat(now) : now)) continue;
    L.gg = x.gt; L.gdv = x.gd; L.stance = x.word || '';
    hxGain(L.id, L.gain, Math.max(now + 0.005, G.t - 0.02), 0.04);
    if (x.gd !== x.d0) for (const id of L.sch) { const S = HX.sch.get(id); if (S && S.vc) { const kN = hxPassK(L, Math.round(hxF(now))) + 2; for (const k of [...S.vc.m.keys()]) if (k >= kN) S.vc.m.delete(k); } }   // (passes not yet rendered grow with the new density)
  }
  if (HX.chips && HX.chips.kind === 'gd') HX.chips = null;
  hxRailDirty(); hxCardDirty();
}
// ✕: the Gärtner's change of this loop – planned, or made – is taken back at once; for eight bars he leaves it alone
function hxGdNein(L, quiet) {
  const b = hxGrid() ? tgBeat(hxNowT()) : hxNowT(), mi = hxMi(L);
  if (HXG.plan) { HXG.plan.items = HXG.plan.items.filter((x) => x.key !== L.key); if (!HXG.plan.items.length) { HXG.plan = null; if (HX.chips && HX.chips.kind === 'gd') HX.chips = null; } }
  mi.gHold = b + (hxGrid() ? 32 : 16);
  if ((L.gg != null && L.gg !== 1) || L.gdv) { L.gg = 1; L.gdv = 0; hxGain(L.id, L.gain, null, 0.03); for (const id of L.sch) { const S = HX.sch.get(id); if (S && S.vc) { const kN = hxPassK(L, Math.round(hxF(hxNowT()))) + 2; for (const k of [...S.vc.m.keys()]) if (k >= kN) S.vc.m.delete(k); } } }
  L.stance = '';
  if (!quiet) hxSay(hxName(L) + ': Gärtner zurückgenommen – acht Takte nicht');
  hxRailDirty(); hxCardDirty();
}
// all of it back (the Gärtner set to „schaut zu“, a behaviour switched off): at once, the levels as the player left them
function hxGdReset() {
  HXG.plan = null; if (HX.chips && HX.chips.kind === 'gd') HX.chips = null;
  for (const L of hxLoopsLive()) { if ((L.gg != null && L.gg !== 1) || L.gdv) { L.gg = 1; L.gdv = 0; hxGain(L.id, L.gain, null, 0.03); } L.stance = ''; }
  hxRailDirty(); hxCardDirty();
}
// ✓ on the plan: keep it (the chips go; it happens at its bar line)
function hxGdLob() { if (!HXG.plan) return false; if (HX.chips && HX.chips.kind === 'gd') HX.chips = null; hxSay('Gärtner: behalten'); hxRailDirty(); return true; }
// the word under a ring: its stance (the Gärtner's, a suggestion, a Wiederkehr, an answer in its voice)
function hxStance(L) {
  const mi = L.mi || {};
  if (mi.sugg) return 'Vorschlag';
  if (HXW_K.wk && HXW_K.wk.key === L.key) return 'kehrt wieder';
  if (HXA.cur && !HXA.cur.stop && HXA.cur.loop === L.key) return 'antwortet';
  if (HXG.plan && HXG.plan.items.some((x) => x.key === L.key)) { const x = HXG.plan.items.find((y) => y.key === L.key); return x.gt === 0 ? 'pausiert gleich' : x.word || 'folgt'; }
  if (L.gg === 0) return 'pausiert';
  return L.stance || '';
}

