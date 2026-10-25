/* ---------- Expressive E Touché: four Spielweisen (owner, 25.10.2026) ---------- */
// Its knob sends nothing (sensitivity, push = freeze), so the Spielweise is chosen in Myzel: the device card's chips,
// F1–F4, or any control learned to „Touché: Spielweise …“. Its four directions (0 at rest … 1 pressed) reach Formen as
// the sources 'map:tch:…' – never the preset, and the Fährte and the Hexenring's Bewegung write them down like any
// controller's; a switch carries what the hand holds over into the new Spielweise.
//   Finger       away/toward Höhe ±, left/right the newest note's pitch ±1 semitone
//   Atem         at rest soft; away swells (Ausdruck up to full, a little Höhe), toward damps dark (Filter); left/right a
//                vibrato on every held note, deeper the harder – left slower, right faster
//   Raum         away Hall, toward Echo, left/right Panorama
//   Verwandlung  away toward scene B, toward you toward scene A (the A/B-Morph), left/right the Filter
const TCH_W = [['finger', 'Finger'], ['atem', 'Atem'], ['raum', 'Raum'], ['verw', 'Verwandlung']];
const TCH = { v: { weg: 0, her: 0, li: 0, re: 0 }, ph: 0, t: 0, raf: 0, vib: 0, rate: 5.5 };
const TCH_SRC = [['h', 'hoehe'], ['b', 'bend'], ['e', 'expr'], ['f', 'flt'], ['r', 'rev'], ['d', 'dly'], ['p', 'pan'], ['m', 'morph']];
// only while a Touché is there: unplugged (or its profile off), nothing of it stays – Atem's soft rest neither
const tchLive = () => { for (const s of MIDI.srcs.values()) if (s.enabled && !s.dup && (mapOf(s), s.prof && s.prof.id === 'tch' && profOn(s))) return true; return false; };
function tchApply() {
  const live = tchLive(); TCH.live = live;
  const { weg, her, li, re } = TCH.v, w = live ? P['midi.tch'] : '', o = {};
  if (w === 'finger') { o.h = weg - her; o.b = 0.5 * (re - li); }
  else if (w === 'atem') { o.e = clamp(-0.55 + 0.95 * weg - 0.45 * her, -1, 1); o.h = 0.35 * weg; o.f = -0.85 * her; }
  else if (w === 'raum') { o.r = 0.85 * weg; o.d = 0.85 * her; o.p = re - li; }
  else if (w === 'verw') { o.m = weg - her; o.f = re - li; }
  for (const [n, k] of TCH_SRC) modSet('map:tch:' + n, k, o[n] || 0);
  // Atem's vibrato: depth from the harder side, ±50 cents at most; its rate 3.5 … 7.5 Hz
  TCH.vib = w === 'atem' ? Math.max(li, re) : 0; TCH.rate = 5.5 + 2 * (re - li);
  if (TCH.vib > 0.002) { if (!TCH.raf) { TCH.t = performance.now(); TCH.raf = requestAnimationFrame(tchVibFrame); } }
  else modSet('map:tch:v', 'bend', 0);
}
function tchVibFrame(ts) {
  TCH.raf = 0;
  if (!(TCH.vib > 0.002) || P['midi.tch'] !== 'atem') { modSet('map:tch:v', 'bend', 0); return; }
  const dt = Math.min(0.1, (ts - TCH.t) / 1000); TCH.t = ts;
  TCH.ph = (TCH.ph + dt * TCH.rate * Math.PI * 2) % (Math.PI * 2);
  modSet('map:tch:v', 'bend', 0.25 * TCH.vib * Math.sin(TCH.ph), { older: 1 });
  TCH.raf = requestAnimationFrame(tchVibFrame);
}
function tchSet(dir, n) { if (TCH.v[dir] === n) return; TCH.v[dir] = n; tchApply(); }
function tchWeise(w, say) {
  if (!TCH_W.some((x) => x[0] === w)) return;
  if (P['midi.tch'] !== w) setParam('midi.tch', w);
  tchApply();
  if (say) toast('Touché: ' + TCH_W.find((x) => x[0] === w)[1] + (w === 'atem' ? ' – in Ruhe leise, weg drücken lässt den Ton anschwellen' : w === 'verw' && !((MX.snap.a || (mxSnapLoad(), MX.snap.a)) && MX.snap.b) ? ' – speichere im Mixer Szene A und B, dann verwandelt es zwischen ihnen' : ''), 2400);
  for (const b of document.querySelectorAll('[data-kc*=":tch"]')) b.setAttribute('aria-pressed', String(b.dataset.kc.endsWith(':tch' + w)));   // (the card's chips)
}
const tchStep = (d) => { const i = TCH_W.findIndex((x) => x[0] === P['midi.tch']); tchWeise(TCH_W[(i + d + TCH_W.length) % TCH_W.length][0], true); };
for (const [dir, nm] of [['weg', 'weg drücken'], ['her', 'heran ziehen'], ['li', 'nach links'], ['re', 'nach rechts']])
  midiTarget('tch.' + dir, 'Touché: ' + nm + ' (je nach Spielweise)', null, { group: 'Spielweise', cont: true, noTake: true, get: () => TCH.v[dir], set: (n) => tchSet(dir, n) });
TCH_W.forEach(([w, nm], i) => midiTarget('tch.' + (i + 1), 'Touché: Spielweise ' + nm, (v) => { if (v >= 0.5) tchWeise(w, true); }, { group: 'Spielweise', button: true }));
midiTarget('tch.next', 'Touché: nächste Spielweise', (v) => { if (v >= 0.5) tchStep(1); }, { group: 'Spielweise', button: true });
// F1–F4 on the computer keyboard, while a Touché is there (not while typing, not while learning)
window.addEventListener('keydown', (e) => {
  const m = /^F([1-4])$/.exec(e.key);
  if (!m || !TCH.live || e.ctrlKey || e.altKey || e.metaKey || e.shiftKey || LEARN.on || /^(INPUT|TEXTAREA|SELECT)$/.test((e.target && e.target.tagName) || '') || (e.target && e.target.isContentEditable)) return;
  e.preventDefault();
  if (!e.repeat) tchWeise(TCH_W[+m[1] - 1][0], true);
});
// a Touché plugged in or out, the Spielweise chosen anywhere (the card, the settings): applied anew
setInterval(() => {
  if (!TCH.bound && typeof bindCtl === 'function') { TCH.bound = true; bindCtl('midi.tch', () => tchApply()); }
  if (A.started && tchLive() !== !!TCH.live) { if (!TCH.live) TCH.v = { weg: 0, her: 0, li: 0, re: 0 }; tchApply(); }
}, 1000);
