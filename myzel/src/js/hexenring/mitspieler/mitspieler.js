/* ---- Etappe 3 · Mitspieler (SPEC §12.2–§12.5, KONZEPT §5): Variieren and Wandern (a living loop's notes change on weak
   positions, drawn back to its anchor), the roles, the Gärtner (schaut zu · pflegt · antwortet: Platz machen, die anderen
   spielen, Antworten, Begleiten with Klangverwandtschaft, Wiederkehr), Puls lernt, the Knospen and the Handschrift.
   The rules (owner): the player stays in charge – everything the machine wants to change is shown before it sounds and can
   be refused at once (✕, ⚓, ↶, a tap on the ring); Eigensinn is the ceiling – a Treu or Lebendig loop's notes never
   change, the Gärtner only lowers, raises or pauses it; every note made is in the scale; nothing here touches a source's
   sound or level of quality – what sounds anew is rendered (Wuchs) or played by real voices, as the player's own. ---- */

// ---- shared: a seeded random (mulberry32), a note's scale index, the metre ----
const hxRng = (s) => { let h = (s | 0) || 1; return () => { h = (h + 0x6d2b79f5) | 0; let t = Math.imul(h ^ (h >>> 15), 1 | h); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const hxEigN = (L) => Math.max(0, HX_EIG.indexOf((L && L.eig) || 'treu'));   // 0 Treu · 1 Lebendig · 2 Variieren · 3 Wandern
const hxVPer = (W) => (W.key.free ? 12 : W.key.per);
const hxVIdx = (W, x) => (x.oct || 0) * hxVPer(W) + (x.deg || 0);
// a position's weight in the bar (sixteenths): the 1, the middle of a 4/4 bar, the beats, the eighths, the rest
function hxVMet(t, bpb) { const b = bpb || 4, n = 4 * b, p = ((Math.round(t * 4) % n) + n) % n; return p === 0 ? 1 : b === 4 && p === 8 ? 0.9 : p % 4 === 0 ? 0.7 : p % 2 === 0 ? 0.5 : 0.3; }
// a pitch moved to scale index J – its glide curve moves with it (a curve holds Hz)
function hxVPitch(W, x, J) { const f0 = x.f, y = hxNtPitch(W, Object.assign({}, x), J), r = y.f / f0; y.cf = (x.cf || []).map(([dt, v]) => [dt, v * r]); return y; }
const hxVSort = (n) => n.sort((a, b) => a.t - b.t || hxVIdxRaw(a) - hxVIdxRaw(b));
const hxVIdxRaw = (x) => (x.oct || 0) * 64 + (x.deg || 0);
// a note's identity for comparing two passes: its place (an eighth of a 32nd) and its scale index
const hxVKey = (W, x) => Math.round(x.t * (W.u === 'b' ? 8 : 20)) + ':' + hxVIdx(W, x);
// how far two note lists are apart: 1 − the share of notes they have in common (0 the same, 1 nothing alike)
function hxVDist(W, a, b) {
  if (!a.length && !b.length) return 0;
  const s = new Map(); for (const x of a) { const k = hxVKey(W, x); s.set(k, (s.get(k) || 0) + 1); }
  let c = 0; for (const x of b) { const k = hxVKey(W, x), v = s.get(k); if (v) { c++; s.set(k, v - 1); } }
  return 1 - (2 * c) / (a.length + b.length);
}

