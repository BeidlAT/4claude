/* ---------- Fährte in presets and scenes ---------- */
// A loop as data: its lanes as 16-bit values (±8 in steps of 1/4096) in base64, the length, how strong it was. Since the
// Hexenring it is a Schleife of Bewegung: an old preset or scene with one brings it as that (hxBewImport).
function faeEnc(v) {
  const q = new Int16Array(v.length);
  for (let i = 0; i < v.length; i++) q[i] = Math.round(clamp(v[i], -7.99, 7.99) * 4096);
  const u = new Uint8Array(q.buffer);
  let s = '';
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
  return btoa(s);
}
function faeDec(s, n) {
  try {
    const b = atob(String(s));
    if (b.length !== 2 * n) return null;
    const u = new Uint8Array(2 * n);
    for (let i = 0; i < u.length; i++) u[i] = b.charCodeAt(i);
    const q = new Int16Array(u.buffer), v = new Float32Array(n);
    for (let i = 0; i < n; i++) v[i] = q[i] / 4096;
    return v;
  } catch (e) { return null; }
}
function faeDecode(o) {
  if (!o || typeof o !== 'object' || o.v !== 1 || o.R !== FA_R || !Number.isInteger(o.n) || o.n < FA_R || o.n > 64 * FA_R || !Array.isArray(o.lanes)) return null;
  const lanes = [];
  for (const l of o.lanes) {
    if (!l || !MODT[l.k] || typeof l.s !== 'string') continue;
    const v = faeDec(l.d, o.n);
    if (v) lanes.push({ k: l.k, src: l.s, v });
  }
  if (!lanes.length) return null;
  let disp = null;
  if (o.disp && typeof o.disp === 'object') for (const k of ['tx', 'ty']) { const v = o.disp[k] && faeDec(o.disp[k], o.n); if (v) (disp || (disp = {}))[k] = v; }
  return { lanes, disp, n: o.n, g: clamp(Number(o.g) || 1, FA_END, 1) };
}
// (the old names, kept: a preset, a scene, an undo hand the Hexenring its Schleife of Bewegung)
const faeExport = () => hxBewExport();
const faeImport = (o, why) => hxBewImport(o, why);
// User presets (format 2) keep the Schleife of Bewegung and Gestik's settings. Loading one: its loop (or none) plays; its
// Gestik settings act while Gestik is on (the user's opt-in; "Rezepte der Presets" off keeps the own). Presets of format 1
// and the built-in ones without one know nothing of either: what runs goes on.
const GK_PRESET = ['neigen', 'seit', 'viele', 'beb', 'platz', 'tragen', 'lad', 'entl', 'ras', 'rasS', 'rasQ', 'tank', 'sw', 'schlaf', 'slArt', 'slTail', 'rgArt', 'rgS', 'rgQ', 'rgN', 'rgZ', 'rgO', 'rgK', 'rgP'];
function presetExtra() {
  const gk = {};
  for (const k of GK_PRESET) gk[k] = GK.p[k];
  return { fmt: 2, fae: hxBewExport(), gk };
}
// the player's own Gestik settings (what a recipe set counts as theirs underneath it), and back
function gkOwnGet() { const o = {}; for (const k of GK_PRESET) o[k] = GK.rz && k in GK.rz.own ? GK.rz.own[k] : GK.p[k]; return o; }
function gkOwnSet(o) {
  const was = GK.p.neigen;
  for (const k of GK_PRESET) if (k in o) { if (GK.rz && k in GK.rz.own) GK.rz.own[k] = o[k]; else GK.p[k] = o[k]; }
  gkCheck(); gkSave();
  gkNeigen(was);
  if (GK.R) GK.R.set({ entl: GK.p.entl });
  if (GK.on) gkUpdate(performance.now(), []);
  gkCardSync();
}
function presetExtraLoad(p) {
  if (!p || !(p.fmt >= 2)) return;
  if ('fae' in p) hxBewImport(p.fae, 'preset');
  if (p.gk && typeof p.gk === 'object' && GK.on && GK.p.rez !== false) {
    const was = GK.p.neigen;
    for (const k of GK_PRESET) if (k in p.gk) GK.p[k] = p.gk[k];
    gkCheck(); gkSave();
    gkNeigen(was);   // what tilt shapes changed: as if chosen in the card
    if (GK.R) GK.R.set({ entl: GK.p.entl });
    gkUpdate(performance.now(), []);
    gkCardSync();
  }
}
// The mixer's scenes: storing A or B while a Schleife of Bewegung plays keeps it with the scene; going to that scene (its
// side of the morph, as every choice flips at half way) brings it back. A scene stored without one leaves it alone.
function faeSceneStore(which) {
  const F = MX.snap.fae || (MX.snap.fae = {});
  const prev = F[which], x = hxBewExport();
  if (x) F[which] = x; else delete F[which];
  return prev;
}
function faeScene(which) {
  const o = MX.snap.fae && MX.snap.fae[which];
  if (o && hxBewImport(o, 'scene')) toast('Szene ' + which.toUpperCase() + ' bringt ihre Bewegung mit.', 2400);
}

