/* ---------- Expressive E Touché: four Spielweisen (owner, 25.10.2026) ---------- */
// Its knob sends nothing (sensitivity, push = freeze), so the Spielweise is chosen in Myzel: the device card's chips,
// F1–F4, or any control learned to „Touché: Spielweise …“. Its four directions (0 at rest … 1 pressed) reach Formen as
// the sources 'map:tch:…' – never the preset, and the Fährte and the Hexenring's Bewegung write them down like any
// controller's; a switch carries what the hand holds over into the new Spielweise.
//   Finger       away/toward Höhe ±, left/right the newest note's pitch ±1 semitone (fine – the owner keeps it so)
//   Atem         away swells (Ausdruck, Höhe), toward damps dark (Ausdruck, Filter); left/right a vibrato on every held
//                note, deeper the harder – left slower, right faster
//   Raum         away Hall, toward Echo, left/right Panorama
//   Verwandlung  away toward scene B, toward you toward scene A (the A/B-Morph), left/right the Filter
//   Gleiten      as Finger, but left/right glide the newest note a fifth either way – the hand across the field
//   Streichen    the hand gives the sound (IDEEN Touché 1): without pressure silent; away is the bow's (the breath's)
//                pressure – the held notes' height set from it, so Halm, Harz, Kehlchen, Böe, Glut speak as bowed or
//                blown – toward plays it light and airy; left/right intonation ±1 semitone
//   Platte       the hand on a loop's tape (IDEEN Touché 5): away brakes down to nearly standing, toward pushes up to
//                double speed, left/right small shoves; let go, the motor takes it back to its speed (the Fokus loop,
//                else the newest that plays; the ring's processor glides straight: band {lin})
//   Vokal        a mouth over the sound (IDEEN Touché 10): any pressure opens it (three formants in the insert chain),
//                away/toward the jaw (a ↔ i/u), left/right the tongue (u/o ↔ e/i)
// F5–F12 (owner, 26.10.2026: „viel weitreichendere Klangformung – jede F-Taste klingt fundamental anders“), each shaping
// the sound being played in depth – js/midi/touche-fx.js (the insert) and js/dsp/touche-fx.js (the processor):
//   Körner (F5) a grain cloud of what was just played · Eis (F6) freeze and paint · Obertöne (F7) even/odd harmonics,
//   drive, folding · Fächer (F8) detuned pair, octaves, fifth · Ort (F9) a place in space, binaural, far and near ·
//   Stottern (F10) repeats in the Puls's tempo · Resonanz (F11) six strings tuned to the held notes · Arpeggio (F12)
const TCH_W = [['finger', 'Finger'], ['atem', 'Atem'], ['raum', 'Raum'], ['verw', 'Verwandlung'], ['gleiten', 'Gleiten'], ['streichen', 'Streichen'], ['platte', 'Platte'], ['vokal', 'Vokal'],
  ['koerner', 'Körner'], ['eis', 'Eis'], ['oberton', 'Obertöne'], ['faecher', 'Fächer'], ['ort', 'Ort'], ['stottern', 'Stottern'], ['resonanz', 'Resonanz'], ['arp', 'Arpeggio']];
// the key of a Spielweise: F1–F4, Umschalt+F1–F4, F5–F12
const tchKey = (i) => (i < 4 ? 'F' + (i + 1) : i < 8 ? 'Umschalt+F' + (i - 3) : 'F' + (i - 3));
const TCH = { v: { weg: 0, her: 0, li: 0, re: 0 }, ph: 0, t: 0, raf: 0, vib: 0, rate: 5.5 };
const TCH_SRC = [['h', 'hoehe'], ['b', 'bend'], ['e', 'expr'], ['f', 'flt'], ['r', 'rev'], ['d', 'dly'], ['p', 'pan'], ['m', 'morph'], ['g', 'bend'], ['s', 'hoehe'], ['w', 'vok'], ['o', 'vokO'], ['u', 'vokV']];
// Gleiten: the newest note, a fifth (700 cents) at full; Streichen: every held note's height set to the bow's (field units)
const TCH_OPT = { g: { per: (tt, v, nw) => (nw ? v * 700 : 0) }, s: { per: (tt) => (TCH.sy - tt.y) / MOD_HSPAN } };
// only while a Touché is there: unplugged (or its profile off), nothing of it stays
const tchLive = () => { for (const s of MIDI.srcs.values()) if (s.enabled && !s.dup && (mapOf(s), s.prof && s.prof.id === 'tch' && profOn(s))) return true; return false; };
function tchApply() {
  const live = tchLive(); TCH.live = live;
  const { weg, her, li, re } = TCH.v, w = live ? P['midi.tch'] : '', o = {};
  if (w === 'finger') { o.h = weg - her; o.b = 0.5 * (re - li); }
  else if (w === 'atem') { o.e = clamp(weg - 0.6 * her, -1, 1); o.h = 0.5 * weg; o.f = -0.85 * her; }
  else if (w === 'raum') { o.r = 0.85 * weg; o.d = 0.85 * her; o.p = re - li; }
  else if (w === 'verw') { o.m = weg - her; o.f = re - li; }
  else if (w === 'gleiten') { o.h = weg - her; o.g = re - li; }
  else if (w === 'streichen') { const p = Math.max(weg, her); o.e = p - 1; TCH.sy = clamp(0.08 + 0.92 * weg, 0, 1); o.s = 0.5 + 0.5 * TCH.sy; o.b = 0.5 * (re - li); }   // (o.s only keeps the source alive and moving; its per sets the height)
  else if (w === 'vokal') { o.w = Math.max(weg, her, li, re); o.o = weg - her; o.u = re - li; }
  else if (w === 'ort') o.r = 0.8 * Math.pow(weg, 1.2) - 0.25 * her;   // (far away: the hall comes up; close: drier)
  if (typeof tfxSet === 'function') tfxSet(w, { weg, her, li, re });   // (F5–F12: the insert, the place, the arpeggio)
  for (const [n, k] of TCH_SRC) modSet('map:tch:' + n, k, o[n] || 0, TCH_OPT[n]);
  tchPlatte(w === 'platte' ? (1 - 0.97 * weg) * (1 + her) * (1 + 0.3 * (re - li)) : 1);
  // Atem's vibrato: depth from the harder side, ±50 cents at most; its rate 3.5 … 7.5 Hz
  TCH.vib = w === 'atem' ? Math.max(li, re) : 0; TCH.rate = 5.5 + 2 * (re - li);
  if (TCH.vib > 0.002) { if (!TCH.raf) { TCH.t = performance.now(); TCH.raf = requestAnimationFrame(tchVibFrame); } }
  else modSet('map:tch:v', 'bend', 0);
}
// Platte: the loop under the hand and the speed asked (1 = its own); sent when it moved, gliding 30 ms (let go: 120 ms,
// the motor), only as fast as the page can say it
function tchPlatte(k) {
  if (typeof HX === 'undefined' || !HX.node) return;
  const P0 = TCH.pl;
  if (k === 1 && !P0) return;
  let L = P0 && HX.loops.get(P0.id);
  if (!L || L.state !== 'spielt') { const F = HX.fokus && HX.loops.get(HX.fokus); L = F && F.state === 'spielt' && !F.bew ? F : hxLoopsLive().filter((x) => x.state === 'spielt' && !x.bew).sort((a, b) => b.made - a.made)[0]; }
  if (!L) { TCH.pl = null; return; }
  if (P0 && P0.id !== L.id) { const X = HX.loops.get(P0.id); if (X) hxPost({ band: { loop: X.id, f: Math.round(hxF(hxNowT() + HX_LEAD)), vs: X.sp || 1, T: Math.round(0.12 * SR), lin: 1 } }); }
  const base = L.sp || 1, vs = clamp(base * k, 0.03, 2.4), rest = k === 1;
  if (P0 && P0.id === L.id && Math.abs(P0.vs - vs) < 0.004) return;
  hxPost({ band: { loop: L.id, f: Math.round(hxF(hxNowT() + HX_LEAD)), vs, T: Math.round((rest ? 0.12 : 0.03) * SR), lin: 1 } });
  TCH.pl = rest ? null : { id: L.id, vs };
  if (!P0 && !rest && typeof hxSay === 'function') hxSay('Hand auf ' + hxName(L));
}
function tchVibFrame(ts) {
  TCH.raf = 0;
  if (!(TCH.vib > 0.002) || P['midi.tch'] !== 'atem') { modSet('map:tch:v', 'bend', 0); return; }
  const dt = Math.min(0.1, (ts - TCH.t) / 1000); TCH.t = ts;
  TCH.ph = (TCH.ph + dt * TCH.rate * Math.PI * 2) % (Math.PI * 2);
  modSet('map:tch:v', 'bend', 0.25 * TCH.vib * Math.sin(TCH.ph), { older: 1 });
  TCH.raf = requestAnimationFrame(tchVibFrame);
}
// the hardest press seen per direction (stored on this device; „Neu einmessen“ forgets it): a value is its share of it.
// It starts at a quarter of the range and never goes below an eighth (the skin's noise must not become a gesture).
const TCH_PK0 = 0.25;
TCH.pk = (() => { try { const o = JSON.parse(store.get('myzel.tch.pk') || 'null'); if (o && typeof o === 'object') return Object.assign({ weg: TCH_PK0, her: TCH_PK0, li: TCH_PK0, re: TCH_PK0 }, o); } catch (e) {} return { weg: TCH_PK0, her: TCH_PK0, li: TCH_PK0, re: TCH_PK0 }; })();
function tchCal(dir, raw) {
  if (raw > TCH.pk[dir]) { TCH.pk[dir] = raw; clearTimeout(TCH.pkT); TCH.pkT = setTimeout(() => store.set('myzel.tch.pk', JSON.stringify(TCH.pk)), 800); }
  return clamp(raw / Math.max(0.125, TCH.pk[dir]), 0, 1);
}
function tchEinmessen() { TCH.pk = { weg: TCH_PK0, her: TCH_PK0, li: TCH_PK0, re: TCH_PK0 }; store.set('myzel.tch.pk', JSON.stringify(TCH.pk)); toast('Touché neu einmessen: drück jede Richtung einmal kräftig – weg, heran, links, rechts.', 4000); }
function tchSet(dir, raw) { TCH.raw = TCH.raw || {}; TCH.raw[dir] = raw; const n = tchCal(dir, raw); if (TCH.v[dir] === n) return; TCH.v[dir] = n; tchApply(); }
function tchWeise(w, say) {
  if (!TCH_W.some((x) => x[0] === w)) return;
  if (P['midi.tch'] !== w) setParam('midi.tch', w);
  tchApply();
  const note = w === 'verw' && !((MX.snap.a || (mxSnapLoad(), MX.snap.a)) && MX.snap.b) ? ' – speichere im Mixer Szene A und B, dann verwandelt es zwischen ihnen'
    : w === 'streichen' ? ' – ohne Druck still: deine Hand bringt den Ton zum Klingen' : w === 'platte' ? ' – die Hand liegt auf der Fokus-Schleife (sonst der neuesten, die spielt)' : TCH_SAY[w] ? ' – ' + TCH_SAY[w] : '';
  if (say) toast('Touché: ' + TCH_W.find((x) => x[0] === w)[1] + note, 2600);
  for (const b of document.querySelectorAll('[data-kc*=":tch"]')) b.setAttribute('aria-pressed', String(b.dataset.kc.endsWith(':tch' + w)));   // (the card's chips)
}
// what a Spielweise of F5–F12 does, in a word (the toast; the device card says it whole)
const TCH_SAY = { koerner: 'eine Körnerwolke aus dem eben Gespielten', eis: 'Drücken friert den Klang ein, seitlich malst du ihn in der Höhe', oberton: 'Obertöne kneten: links gerade, rechts ungerade, weg Antrieb, heran falten',
  faecher: 'ein Ton fächert sich auf: Stimmen, Oktaven, Quinte', ort: 'der Klang an einem Ort im Raum – weit weg, nah am Ohr, rundherum', stottern: 'Drücken wiederholt den Moment im Tempo – links lang, rechts kurz',
  resonanz: 'Saiten, gestimmt auf deine Töne, schwingen mit', arp: 'ein Arpeggio aus der Hand über die gehaltenen Töne' };
const tchStep = (d) => { const i = TCH_W.findIndex((x) => x[0] === P['midi.tch']); tchWeise(TCH_W[(i + d + TCH_W.length) % TCH_W.length][0], true); };
for (const [dir, nm] of [['weg', 'weg drücken'], ['her', 'heran ziehen'], ['li', 'nach links'], ['re', 'nach rechts']])
  midiTarget('tch.' + dir, 'Touché: ' + nm + ' (je nach Spielweise)', null, { group: 'Spielweise', cont: true, noTake: true, get: () => (TCH.raw && TCH.raw[dir]) || 0, set: (n) => tchSet(dir, n) });
TCH_W.forEach(([w, nm], i) => midiTarget('tch.' + (i + 1), 'Touché: Spielweise ' + nm, (v) => { if (v >= 0.5) tchWeise(w, true); }, { group: 'Spielweise', button: true }));
midiTarget('tch.next', 'Touché: nächste Spielweise', (v) => { if (v >= 0.5) tchStep(1); }, { group: 'Spielweise', button: true });
// F1–F4 and Umschalt + F1–F4 on the computer keyboard, while a Touché is there (not while typing, not while learning)
window.addEventListener('keydown', (e) => {
  const m = /^F([1-9]|1[0-2])$/.exec(e.key), fk = m ? +m[1] : 0;
  if (!m || (fk > 4 && e.shiftKey) || !TCH.live || e.ctrlKey || e.altKey || e.metaKey || LEARN.on || /^(INPUT|TEXTAREA|SELECT)$/.test((e.target && e.target.tagName) || '') || (e.target && e.target.isContentEditable)) return;
  e.preventDefault();
  if (!e.repeat) tchWeise(TCH_W[fk <= 4 ? fk - 1 + (e.shiftKey ? 4 : 0) : fk + 3][0], true);   // (F5–F12: the browser's own uses of them – reload, full screen, tools – give way while a Touché is there)
});
// a Touché plugged in or out, the Spielweise chosen anywhere (the card, the settings): applied anew
setInterval(() => {
  if (!TCH.bound && typeof bindCtl === 'function') { TCH.bound = true; bindCtl('midi.tch', () => tchApply()); }
  if (A.started && tchLive() !== !!TCH.live) { if (!TCH.live) TCH.v = { weg: 0, her: 0, li: 0, re: 0 }; tchApply(); }
}, 1000);
