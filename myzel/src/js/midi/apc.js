/* ---------- APC40 MK2: its 40 clip pads put to other uses ---------- */
// (owner, 26.10.2026: „das APC40 MK2 zweckentfremden – was können wir mit den Clip-Tasten Kreatives anstellen?“ –
// „alle fünf Ideen einbauen, die Modi wählt man in der App“) Five modes for the 8×5 grid, chosen in the Gerätebild or
// with the five Scene buttons at its right:
//   Hexenring-Raster – rows 1–3 are the 24 Plätze in their Pigmente (tap as the ring, Shift: Solo); row 4 the Korb,
//     the Hauptknopf, ↶ ↷, all end / all begin, the next Lichtung, Puls ernten; row 5 harvests the last 1 … 128 bars
//   Humus-Zeitreise – the 40 pads are the last 40 bars of the Humus, lit by how loud each was: a pad harvests its bar,
//     held with a second the range between; ◀ ▶ reach 40 bars further back
//   Myzelnetz – pads seed hyphae; on every step they grow into a free neighbour, age and become Humus; each new tip
//     sounds its place in the scale (the Klangquelle) – Play starts and stops it, ◀ ▶ its speed, ▲ ▼ how eager it grows
//   Tonnetz – an isomorphic keyboard: a semitone to the right, a fourth upwards; the scale's tones lit, its root
//     brightest; ◀ ▶ a semitone, ▲ ▼ an octave
//   Puls-Sequenzer – five lanes of eight eighths on the Taktgeber's bar: rows 1–4 the Puls's four lanes (their sound,
//     note and channel), row 5 the Klangquelle's root; Play starts and stops it, Shift + pad clears a row
// The Netz and the Sequenzer go on while another mode is shown. The pads' colours go back to the device (Note On:
// velocity the colour, the channel solid, pulsing or blinking), after Myzel asks it into the mode where the computer
// leads its lights (SysEx – the browser asks once). Faders, knobs and the other buttons keep their bindings.
const APC = { mode: 'raster', src: null, out: null, shift: false, sx: 'nein', led: new Map(), held: new Map(), tm: 0, ui: null, zOff: 0, tn: { semi: 0, oct: 0 },
  net: { on: false, c: new Int8Array(40), n: 0, div: 0.5, grow: 0.55, flash: new Float64Array(40) },
  seq: { on: false, p: [0, 1, 2, 3, 4].map(() => new Array(8).fill(false)), n: 0, cur: -1 } };
const APC_KEY = 'myzel.apc.v1';
const APC_MODES = [['raster', 'Hexenring-Raster'], ['zeit', 'Humus-Zeitreise'], ['netz', 'Myzelnetz'], ['ton', 'Tonnetz'], ['puls', 'Puls-Sequenzer']];
const APC_WHAT = {
  raster: 'Reihe 1–3: die 24 Plätze in ihren Farben (tippen wie der Ring, mit Shift Solo). Reihe 4: Korb, Hauptknopf, ↶, ↷, alle enden, alle beginnen, nächste Lichtung, Puls ernten. Reihe 5: die letzten 1, 2, 4, 8, 16, 32, 64, 128 Takte ernten.',
  zeit: 'Die 40 Pads sind die letzten 40 Takte des Humus, so hell, wie laut sie waren. Ein Pad erntet seinen Takt; eines halten und ein zweites drücken erntet alles dazwischen. ◀ ▶ reichen 40 Takte weiter zurück.',
  netz: 'Pads säen Hyphen. Bei jedem Schritt wachsen sie in ein freies Nachbarfeld, altern und werden Humus; jede neue Spitze klingt ihren Ort in der Tonleiter. Play: an / aus · ◀ ▶ Tempo · ▲ ▼ Wuchslust · Shift + Pad: alles leeren.',
  ton: 'Ein Halbton nach rechts, eine Quarte nach oben – jede Akkordform greift sich überall gleich. Die Töne der Tonleiter leuchten, der Grundton am hellsten. ◀ ▶ Halbton · ▲ ▼ Oktave.',
  puls: 'Fünf Spuren, acht Achtel, auf dem Takt des Taktgebers: Reihe 1–4 die vier Puls-Spuren (ihr Klang, ihr Ton, ihr Kanal), Reihe 5 der Grundton der Klangquelle. Play: an / aus · Shift + Pad: die Reihe leeren.'
};
// the device's colour table (velocity → colour, as Akai's and Novation's grids share it)
const APC_PAL = ('000000 1e1e1e 7f7f7f ffffff ff4c4c ff0000 590000 190000 ffbd6c ff5400 591d00 271b00 ffff4c ffff00 595900 191900 '
  + '88ff4c 54ff00 1d5900 142b00 4cff4c 00ff00 005900 001900 4cff5e 00ff19 00590d 001902 4cff88 00ff55 00591d 001f12 '
  + '4cffb7 00ff99 005935 001912 4cc3ff 00a9ff 004152 001019 4c88ff 0055ff 001d59 000819 4c4cff 0000ff 000059 000019 '
  + '874cff 5400ff 190064 0f0030 ff4cff ff00ff 590059 190019 ff4c87 ff0054 59001d 220013 ff1500 993500 795100 436400').split(' ').map((x) => parseInt(x, 16));
// the nearest of the table to a colour (k: its brightness, 1 full), by hue more than by brightness
function apcVel(hex, k = 1) {
  const n = typeof hex === 'number' ? hex : parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) * k, g = ((n >> 8) & 255) * k, b = (n & 255) * k;
  let best = 0, bd = Infinity;
  for (let i = 1; i < APC_PAL.length; i++) {
    const p = APC_PAL[i], pr = (p >> 16) & 255, pg = (p >> 8) & 255, pb = p & 255;
    const d = 2 * (pr - r) ** 2 + 4 * (pg - g) ** 2 + 3 * (pb - b) ** 2;
    if (d < bd) { bd = d; best = i; }
  }
  return best;
}
const apcIsDev = (src) => !!src && !!src.name && profModel(src).id === 'apc40mk2';
const apcPadOf = (num) => (num >= 0 && num < 40 ? (4 - Math.floor(num / 8)) * 8 + (num % 8) : -1);   // note → pad (row 0 on top)
const apcNoteOf = (k) => (4 - Math.floor(k / 8)) * 8 + (k % 8);
function apcLoad() {
  try {
    const o = JSON.parse(localStorage.getItem(APC_KEY) || 'null');
    if (!o) return;
    if (o.mode === 'aus' || APC_MODES.some((m) => m[0] === o.mode)) APC.mode = o.mode;
    if (Array.isArray(o.seq) && o.seq.length === 5) APC.seq.p = o.seq.map((r) => Array.from({ length: 8 }, (_, i) => !!(r && r[i])));
    if (o.div) APC.net.div = clamp(Number(o.div) || 0.5, 0.25, 1);
    if (o.grow) APC.net.grow = clamp(Number(o.grow) || 0.55, 0.2, 0.95);
    if (o.tn) APC.tn = { semi: clamp(o.tn.semi | 0, -11, 11), oct: clamp(o.tn.oct | 0, -2, 2) };
  } catch (e) {}
}
function apcSave() { try { localStorage.setItem(APC_KEY, JSON.stringify({ mode: APC.mode, seq: APC.seq.p, div: APC.net.div, grow: APC.net.grow, tn: APC.tn })); } catch (e) {} }
// a port came or went (midiScan): the APC found, its lights started
function apcScan() {
  if (!APC.loaded) { APC.loaded = true; apcLoad(); }
  let s = null;
  for (const x of MIDI.srcs.values()) if (x.enabled !== false && apcIsDev(x)) { s = x; break; }
  if (s !== APC.src) { APC.src = s; APC.led.clear(); APC.held.clear(); if (s) apcSysex(false); }
  APC.out = s ? kcOut(s) : null;
  clearInterval(APC.tm); APC.tm = 0;
  if (s || APC.ui) APC.tm = setInterval(apcFrame, 60);
}
// the mode where the computer leads every light (Alternate Ableton Live mode): a SysEx message, which needs the
// browser's leave – asked for when the player chooses it (ask), else only where it was granted before
async function apcSysex(ask) {
  if (!APC.src || !navigator.requestMIDIAccess) return;
  const send = () => { const o = kcOut(APC.src); if (o && o.port) { midiSend(o, [0xf0, 0x47, 0x7f, 0x29, 0x60, 0x00, 0x04, 0x42, 0x08, 0x04, 0x01, 0xf7]); APC.sx = 'ja'; APC.led.clear(); } };
  if (APC.sxAcc) { send(); return; }
  try {
    if (!ask) { const st = await navigator.permissions.query({ name: 'midi', sysex: true }); if (!st || st.state !== 'granted') { APC.sx = APC.sx === 'nein' ? 'frag' : APC.sx; apcUiDirty(); return; } }
    const acc = await navigator.requestMIDIAccess({ sysex: true });
    APC.sxAcc = true; midiUse(acc); send();
  } catch (e) { APC.sx = 'abgelehnt'; }
  apcUiDirty();
}

// ---- input: the pads, the Scene buttons, Shift, the arrows and Play; everything else goes on to the bindings ----
function apcIn(src, ev) {
  if (APC.mode === 'aus' || !apcIsDev(src) || ev.ch !== 0) return false;
  if (ev.type !== 'on' && ev.type !== 'off') return false;
  const down = ev.type === 'on' && ev.val > 0, n = ev.num;
  if (n === 98) { APC.shift = down; return true; }
  if (n >= 82 && n <= 86) { if (down) apcModeSet(APC_MODES[n - 82][0]); return true; }
  if (n === 91) { if (down) apcPlay(); return true; }
  if (n >= 94 && n <= 97) { if (down) apcArrow({ 94: 'auf', 95: 'ab', 96: 'rechts', 97: 'links' }[n]); return true; }
  const k = apcPadOf(n);
  if (k < 0) return false;
  apcPad(k, down, ev.t);
  return true;
}
function apcModeSet(m) {
  if (m === APC.mode) return;
  if (APC.mode === 'ton') apcTonAllOff();
  APC.mode = m; APC.held.clear(); apcSave(); apcUiDirty();
  const nm = (APC_MODES.find((x) => x[0] === m) || [0, 'aus'])[1];
  if (typeof hxSay === 'function') hxSay('APC40: ' + nm);
  toast('APC40: ' + nm, 1800);
}
function apcPlay() {
  if (APC.mode === 'netz') apcNetRun(!APC.net.on);
  else if (APC.mode === 'puls') apcSeqRun(!APC.seq.on);
  else if (APC.seq.on || APC.net.on) { apcSeqRun(false); apcNetRun(false); }
  else if (A.started && HX.node) hxWeiter();
}
function apcArrow(d) {
  const sgn = d === 'rechts' || d === 'auf' ? 1 : -1;
  if (APC.mode === 'zeit' && (d === 'links' || d === 'rechts')) { APC.zOff = Math.max(0, APC.zOff - sgn * 40); toast(APC.zOff ? 'Zeitreise: ' + APC.zOff + ' Takte weiter zurück' : 'Zeitreise: die letzten 40 Takte', 1500); }
  else if (APC.mode === 'netz' && (d === 'links' || d === 'rechts')) { const L = [0.25, 0.5, 1], i = clamp(L.indexOf(APC.net.div) + sgn, 0, 2); APC.net.div = L[i]; toast('Myzelnetz: ' + ['Sechzehntel', 'Achtel', 'Viertel'][i], 1500); }
  else if (APC.mode === 'netz') { APC.net.grow = clamp(Math.round((APC.net.grow + sgn * 0.1) * 100) / 100, 0.2, 0.95); toast('Myzelnetz: Wuchslust ' + Math.round(APC.net.grow * 100) + ' %', 1500); }
  else if (APC.mode === 'ton') { apcTonAllOff(); if (d === 'links' || d === 'rechts') APC.tn.semi = clamp(APC.tn.semi + sgn, -11, 11); else APC.tn.oct = clamp(APC.tn.oct + sgn, -2, 2); toast('Tonnetz: ' + apcTonName(apcTonNote(32)) + ' unten links', 1500); }
  apcSave(); apcUiDirty();
}
// a pad pressed or let go (from the device, or a click on its picture in the Gerätebild)
function apcPad(k, down, t) {
  const m = APC.mode;
  if (m === 'aus') return;
  if (m === 'ton') { apcTon(k, down, t); return; }
  if (!down) { if (m === 'zeit') apcZeitUp(k); else if (m === 'raster') apcRasterUp(k, t); APC.held.delete(k); return; }
  APC.held.set(k, { t: performance.now(), used: false });
  if (m === 'raster') apcRaster(k, t);
  else if (m === 'zeit') apcZeitDown(k);
  else if (m === 'netz') apcNetSeed(k);
  else if (m === 'puls') apcSeqPad(k);
}
const apcEv = (k, t) => hxEvOf({ src: APC.src, ev: { t: t || performance.now() } }, 'apc' + k);
const apcReady = () => { if (!A.started) { midiHint(); return false; } if (!HX.node) { toast('Der Hexenring ist noch nicht bereit.'); return false; } return true; };

// ---- Hexenring-Raster ----
const APC_ROW4 = [['Korb', 9], ['Hauptknopf', 5], ['↶ Zurück', 2], ['↷ Wiederholen', 2], ['Alle enden', 60], ['Alle beginnen', 21], ['Nächste Lichtung', 37], ['Puls ernten', 49]];
const APC_BARS = [1, 2, 4, 8, 16, 32, 64, 128];
function apcRaster(k, t) {
  if (!apcReady()) return;
  const e = apcEv(k, t);
  if (k < 24) { if (k >= HX_SLOTS) return; if (APC.shift) hxRingSolo(k, e); else hxRingTap(k, e); return; }
  if (k < 32) {
    const f = k - 24;
    if (f === 0) hxKorbPress(e); else if (f === 1) hxHaupt(e); else if (f === 2) hxUndoStep(); else if (f === 3) hxRedoStep();
    else if (f === 4) hxAlleEnde(); else if (f === 5) hxWeiter(); else if (f === 6) hxFormTap(); else hxPulsErnten(2, P['hx.pulsStumm']);
    return;
  }
  const n = APC_BARS[k - 32], b1 = Math.floor(tgBeat(hxNowT()) / 4 + 1e-9) * 4;
  apcHarvest(b1 - 4 * n, b1);
}
function apcRasterUp(k, t) { const e = apcEv(k, t); if (k === 24) hxKorbRelease(e); else if (k === 25) hxHauptUp(e); }
// a harvest of the bars [b0, b1) (beats), entering at the next bar line
function apcHarvest(b0, b1) {
  if (!apcReady()) return null;
  const now = hxNowT(), inp = hxInp(), w0 = tgTime(b0), w1 = tgTime(b1);
  if (w0 < hxT(hxOldestF())) { toast('So weit reicht der Humus nicht zurück (' + P['hx.humus'] + ' s).', 3000); return null; }
  if (hxLvlAt(w0, w1, inp) < HX_LVL_ON && !hxNotes(w0, w1, inp, true).length) { toast('In diesen Takten liegt nichts im Humus.', 2500); return null; }
  const bars = Math.round((b1 - b0) / 4), nb = Math.ceil(tgBeat(now + HX_LEAD) / 4 - 1e-9) * 4;
  return hxHarvest({ kind: 'grid', in: inp, w0, w1, b0: nb, beats: b1 - b0, bars, lock: 'takt', entry: { b: nb, t: tgTime(nb), now: false, start: true } });
}

// ---- Humus-Zeitreise ----
const apcZeitBar = (k) => Math.floor(tgBeat(hxNowT()) / 4 + 1e-9) * 4 - 4 * (40 + APC.zOff - k);   // pad k's bar (its first beat); the newest whole bar bottom right
function apcZeitDown(k) {
  const other = [...APC.held.keys()].find((j) => j !== k && !APC.held.get(j).used);
  if (other == null) return;
  const a = Math.min(other, k), b = Math.max(other, k);
  APC.held.get(other).used = true; APC.held.get(k).used = true;
  if (apcReady()) apcHarvest(apcZeitBar(a), apcZeitBar(b) + 4);
}
// the 40 bars' peaks in one pass over the level ring (four times a second – it holds 15 minutes)
function apcZeitLv() {
  const now = performance.now(), b0 = apcZeitBar(0);
  if (APC.zLv && now - APC.zLvT < 250 && APC.zLvB === b0) return APC.zLv;
  const lv = new Float32Array(40), inp = hxInp(), d = (inp | 0) === 3 ? hxMicRt() / SR : 0, ts = [];
  for (let k = 0; k <= 40; k++) ts.push(tgTime(b0 + 4 * k) + d);
  for (const x of HX.lvl) {
    if (!x || x[0] < ts[0] || x[0] >= ts[40]) continue;
    let lo = 0, hi = 40;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (x[0] >= ts[mid]) lo = mid; else hi = mid; }
    lv[lo] = Math.max(lv[lo], x[1 + (inp | 0)] || 0);
  }
  APC.zLv = lv; APC.zLvT = now; APC.zLvB = b0;
  return lv;
}
function apcZeitUp(k) { const H = APC.held.get(k); if (H && !H.used && apcReady()) { const b = apcZeitBar(k); apcHarvest(b, b + 4); } }

// ---- Myzelnetz: a cell is 0 (free), 1 … 5 (alive, its age) or −1 … −3 (Humus, resting before it is free again) ----
const APC_NET_LIFE = 5;
function apcNetSeed(k) {
  const N0 = APC.net;
  if (APC.shift) { N0.c.fill(0); apcUiDirty(); return; }
  N0.c[k] = 1; N0.flash[k] = performance.now();
  if (A.started) apcNetSound(k, A.ctx.currentTime + 0.01, 1);
  if (!N0.on) apcNetRun(true);
}
function apcNetRun(on) {
  const N0 = APC.net;
  if (on && !A.started) { midiHint(); return; }
  N0.on = on;
  if (on) { ensureRunning(); N0.n = Math.ceil(beatAt(A.ctx.currentTime + 0.02) / N0.div - 1e-9); }
  hxSay && hxSay('Myzelnetz ' + (on ? 'wächst' : 'ruht')); apcUiDirty();
}
// a cell's tone: its column a step, its row (from below) three – the scale's own notes
function apcNetF(k) {
  const col = k % 8, row = 4 - Math.floor(k / 8), len = N.notes.length;
  if (!len) return 220;
  const i = col + row * 3;
  return N.notes[i % len].f * Math.pow(2, Math.floor(i / len));
}
function apcNetSound(k, t, v) {
  const col = k % 8, row = 4 - Math.floor(k / 8);
  hit(P['v.eng'], t, apcNetF(k), 0.25 + row * 0.15, P['v.vel'] * v * 0.75, { pan: (col - 3.5) / 6, gate: Math.max(0.12, APC.net.div * 60 / seqBpm() * 1.6) });
  noteEvent(t);
}
function apcNetStep(t) {
  const c = APC.net.c, nx = Int8Array.from(c), born = [];
  for (let k = 0; k < 40; k++) {
    const v = c[k];
    if (v < 0) { nx[k] = v + 1; continue; }
    if (v === 0) continue;
    nx[k] = v >= APC_NET_LIFE ? -3 : v + 1;   // (old hyphae become Humus)
    if (v <= 2 && Math.random() < APC.net.grow) {   // a young tip grows into a free neighbour
      const col = k % 8, row = Math.floor(k / 8), nb = [];
      if (col > 0) nb.push(k - 1); if (col < 7) nb.push(k + 1); if (row > 0) nb.push(k - 8); if (row < 4) nb.push(k + 8);
      const free = nb.filter((j) => c[j] === 0 && nx[j] === 0);
      if (free.length) { const j = free[Math.floor(Math.random() * free.length)]; nx[j] = 1; born.push(j); }
    }
  }
  APC.net.c = nx;
  // at most three new tips sound at once (a dense net would only blur)
  for (let i = born.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [born[i], born[j]] = [born[j], born[i]]; }
  born.slice(0, 3).forEach((k, i) => { apcNetSound(k, t + i * 0.004, 0.8 - i * 0.15); APC.net.flash[k] = performance.now() + Math.max(0, (t - A.ctx.currentTime) * 1000); });
  if (!nx.some((v) => v > 0)) { APC.net.on = false; apcUiDirty(); }   // (all Humus: it rests until seeded again)
}

// ---- Tonnetz ----
const apcTonNote = (k) => 12 * (P['t.oct'] + 1 + APC.tn.oct) + Number(P['t.root']) + APC.tn.semi + (k % 8) + 5 * (4 - Math.floor(k / 8));
const apcTonName = (m) => NOTE_NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);
function apcTonPcs() {
  const r = Number(P['t.root']), s = new Set();
  if (N.free) { for (let i = 0; i < 12; i++) s.add(i); return s; }
  for (const nt of N.notes) s.add(((Math.round(nt.semi) + r) % 12 + 12) % 12);
  return s;
}
function apcTon(k, down, t) {
  if (!A.started) { midiHint(); return; }
  const cs = chState(APC.src || APC.uiSrc || (APC.uiSrc = { key: 'apc-bild', name: 'APC40 (Bild)', kind: 'ui', dir: 'in', chs: [], enabled: true }), 0);   // (no device: the picture's own, outside the port list)
  if (down) { const m = apcTonNote(k); APC.held.set(k, { m }); midiNoteOn(cs, m, 112, t); }
  else { const H = APC.held.get(k); APC.held.delete(k); if (H) midiNoteOff(cs, H.m, 64); }
}
function apcTonAllOff() { for (const [k] of APC.held) apcTon(k, false); APC.held.clear(); }

// ---- Puls-Sequenzer: eight eighths on the Taktgeber's bar ----
function apcSeqPad(k) {
  const r = Math.floor(k / 8), s = k % 8, p = APC.seq.p;
  if (APC.shift) p[r].fill(false); else p[r][s] = !p[r][s];
  apcSave(); apcUiDirty();
  if (!APC.seq.on && p.some((x) => x.some(Boolean))) apcSeqRun(true);
}
function apcSeqRun(on) {
  if (on && !A.started) { midiHint(); return; }
  APC.seq.on = on; APC.seq.cur = -1;
  if (on) { ensureRunning(); APC.seq.n = Math.ceil(beatAt(A.ctx.currentTime + 0.02) / 0.5 - 1e-9); }
  hxSay && hxSay('Puls-Sequenzer ' + (on ? 'läuft' : 'steht')); apcUiDirty();
}
// a Puls lane's own tone (its degree and octave, without its walk)
function apcLaneF(i) {
  const pre = 'l' + i + '.', len = N.free ? 12 * P['t.range'] + 1 : N.notes.length, idx = clamp(P[pre + 'deg'], 0, Math.max(0, len - 1));
  return (N.free ? N.base * ratioForSemi(idx) : N.notes[idx] ? N.notes[idx].f : N.base) * Math.pow(2, P[pre + 'oct']);
}
function apcSeqStep(s, t) {
  const stepDur = 0.5 * 60 / seqBpm(), p = APC.seq.p;
  for (let i = 0; i < 4; i++) {
    if (!p[i][s]) continue;
    const pre = 'l' + i + '.';
    hit(P[pre + 'eng'], t, apcLaneF(i), P[pre + 'bright'], P[pre + 'vol'] * (1 - P['v.human'] * 0.25 * Math.random()), { pan: P[pre + 'pan'], gate: stepDur * 0.9, bus: stripIn('l' + i) });
    visPush({ t, kind: 'hit', x: 0.1 + i * 0.25, y: 0.15 + P[pre + 'bright'] * 0.7, lane: i, s: P[pre + 'vol'] });
  }
  if (p[4][s]) hit(P['v.eng'], t, N.notes.length ? N.notes[0].f : N.base, 0.4, P['v.vel'], { gate: stepDur * 0.9 });
  if (p.some((r) => r[s])) noteEvent(t);
}
// the scheduler's tick (tickRun): both clocks on the Taktgeber's beat, a little ahead
function apcTick(horizon) {
  const now = A.ctx.currentTime;
  if (APC.seq.on) {
    const S = APC.seq;
    if (timeAt(S.n * 0.5) < now - 0.25) S.n = Math.ceil(beatAt(now) / 0.5);   // (after a stall, skip instead of bursting)
    let t;
    while ((t = timeAt(S.n * 0.5)) < horizon) { const s = ((S.n % 8) + 8) % 8; apcSeqStep(s, Math.max(t, now)); S.cur = s; S.n++; }
  }
  if (APC.net.on) {
    const Nn = APC.net;
    if (timeAt(Nn.n * Nn.div) < now - 0.25) Nn.n = Math.ceil(beatAt(now) / Nn.div);
    let t;
    while (Nn.on && (t = timeAt(Nn.n * Nn.div)) < horizon) { apcNetStep(Math.max(t, now)); Nn.n++; }
  }
}

// ---- lights: what every pad shows, sent where it changed (velocity the colour; channel 0 solid, 7 / 9 pulsing, 13 blinking) ----
function apcLights() {
  const pads = new Array(40).fill(null), m = APC.mode, now = performance.now();
  const set = (k, v, ch = 0) => { pads[k] = [v, ch]; };
  if (m === 'raster') {
    const z = A.started && HX.node ? hxZiel() : -1;
    for (let k = 0; k < 24; k++) {
      if (k >= HX_SLOTS) { set(k, 0); continue; }
      const L = hxRingL(k), rec = HX.rec && HX.rec.slot === k;
      if (rec) { set(k, 5, 9); continue; }
      if (!L) { set(k, k === z ? 1 : 0); continue; }
      const c = hxCol(L), st = L.pendTo || L.state;
      if (HX.solo && HX.solo.id === L.id) set(k, apcVel(c), 7);
      else if (HX.pend.some((p) => p.loop === L.id)) set(k, apcVel(c), 13);   // (waiting for its bar line)
      else set(k, st === 'spielt' ? apcVel(c) : apcVel(c, 0.3));
    }
    APC_ROW4.forEach(([, v], i) => set(24 + i, i === 0 && HXKB.h ? 3 : i === 1 && HX.rec ? 5 : v, i === 1 && HX.rec ? 9 : 0));
    const b1 = Math.floor(tgBeat(hxNowT()) / 4 + 1e-9) * 4, old = A.started && HX.node ? hxT(hxOldestF()) : Infinity;
    APC_BARS.forEach((n, i) => set(32 + i, tgTime(b1 - 4 * n) >= old ? [21, 17, 16, 13, 12, 8, 9, 60][i] : 0));
  } else if (m === 'zeit') {
    const old = A.started && HX.node ? hxT(hxOldestF()) : Infinity, lv = apcZeitLv();
    for (let k = 0; k < 40; k++) {
      const b = apcZeitBar(k), w0 = tgTime(b);
      if (!A.started || !HX.node || w0 < old) { set(k, 0); continue; }
      if (APC.held.has(k)) { set(k, 3); continue; }
      const l = lv[k], db = l > 0 ? 20 * Math.log10(l) : -120;
      set(k, l < HX_LVL_ON ? (b % 16 === 0 ? 1 : 0) : db > -18 ? 8 : db > -28 ? 9 : db > -40 ? 10 : 11);
    }
  } else if (m === 'netz') {
    for (let k = 0; k < 40; k++) {
      const v = APC.net.c[k], fl = now - APC.net.flash[k];
      set(k, fl >= 0 && fl < 140 ? 3 : v > 0 ? [0, 17, 21, 22, 23, 23][v] || 23 : v < 0 ? 11 : 0);
    }
  } else if (m === 'ton') {
    const pcs = apcTonPcs(), r = Number(P['t.root']), playing = new Set([...APC.held.values()].map((H) => H.m));
    for (let k = 0; k < 40; k++) { const n = apcTonNote(k), pc = ((n % 12) + 12) % 12; set(k, playing.has(n) ? 3 : pc === ((r % 12) + 12) % 12 ? 41 : pcs.has(pc) ? 43 : 0); }
  } else if (m === 'puls') {
    const lane = [9, 37, 49, 21, 13];
    for (let k = 0; k < 40; k++) { const r = Math.floor(k / 8), s = k % 8, on = APC.seq.p[r][s], head = APC.seq.on && s === APC.seq.cur; set(k, on ? (head ? 3 : lane[r]) : head ? 1 : 0); }
  }
  return pads;
}
function apcFrame() {
  if (!APC.src && !APC.ui) { clearInterval(APC.tm); APC.tm = 0; return; }
  if (APC.ui && APC.ui.isConnected) apcUiPaint();
  else if (APC.ui) APC.ui = null;
  if (APC.mode === 'aus' && !APC.offSent) { APC.offSent = true; apcSendAll(new Array(40).fill([0, 0]), true); return; }
  if (APC.mode === 'aus') return;
  APC.offSent = false;
  apcSendAll(apcLights(), false);
}
function apcSendAll(pads, off) {
  const o = APC.out;
  if (!o || !o.port) return;
  const put = (key, bytes) => { const s = bytes.join(','); if (APC.led.get(key) !== s) { APC.led.set(key, s); midiSend(o, bytes); } };
  pads.forEach((p, k) => {
    const n = apcNoteOf(k), [v, ch] = p || [0, 0];
    put('p' + n, [0x90, n, v]);   // the colour, solid
    put('b' + n, ch ? [0x90 | ch, n, v] : [0x90, n, v]);   // then pulsing or blinking (the same colour)
  });
  APC_MODES.forEach((x, i) => put('s' + i, [0x90, 82 + i, !off && APC.mode === x[0] ? 1 : 0]));
  put('play', [0x90, 91, !off && (APC.seq.on || APC.net.on) ? 1 : 0]);
}

// ---- in the Gerätebild: the mode, its pads as a picture you can click, the lights ----
function apcUiDirty() { APC.uiSig = ''; }
function apcModesRow(src) {
  if (!APC.loaded) { APC.loaded = true; apcLoad(); }
  const el = h('div', { class: 'apc' });
  APC.ui = el; APC.uiSig = '';
  if (!APC.tm) APC.tm = setInterval(apcFrame, 60);
  apcUiBuild();
  return el;
}
function apcUiBuild() {
  const el = APC.ui;
  if (!el) return;
  const b = (t, fn, tip, cls) => { const x = h('button', { type: 'button', class: 'btn' + (cls ? ' ' + cls : ''), title: tip || '' }, t); x.addEventListener('click', fn); return x; };
  const modes = h('div', { class: 'apc-modes', role: 'group', 'aria-label': 'Modus der Clip-Pads' });
  for (const [k, n] of [['aus', 'Aus']].concat(APC_MODES)) {
    const x = b(n, () => { if (k !== 'aus' && APC.sx !== 'ja') apcSysex(true); apcModeSet(k); apcUiBuild(); }, k === 'aus' ? 'Die Pads wirken wieder wie zugewiesen' : APC_WHAT[k], APC.mode === k ? 'primary' : 'ghost');
    x.setAttribute('aria-pressed', String(APC.mode === k));
    modes.append(x);
  }
  const grid = h('div', { class: 'apc-grid', 'aria-label': 'Die 40 Pads – klickbar' });
  APC.cells = [];
  for (let k = 0; k < 40; k++) {
    const c = h('button', { type: 'button', class: 'apc-pad', 'aria-label': 'Pad ' + (Math.floor(k / 8) + 1) + '·' + ((k % 8) + 1) });
    c.addEventListener('pointerdown', (e) => { e.preventDefault(); try { c.setPointerCapture(e.pointerId); } catch (x) {} apcPad(k, true); });
    const up = () => apcPad(k, false);
    c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up);
    APC.cells.push(c); grid.append(c);
  }
  const run = APC.mode === 'netz' ? b(APC.net.on ? 'Netz anhalten' : 'Netz wachsen lassen', () => { apcNetRun(!APC.net.on); apcUiBuild(); }, 'Wie Play am APC')
    : APC.mode === 'puls' ? b(APC.seq.on ? 'Sequenzer anhalten' : 'Sequenzer starten', () => { apcSeqRun(!APC.seq.on); apcUiBuild(); }, 'Wie Play am APC')
    : null;
  const clr = APC.mode === 'puls' ? b('Muster leeren', () => { APC.seq.p.forEach((r) => r.fill(false)); apcSave(); }, '', 'ghost') : APC.mode === 'netz' ? b('Netz leeren', () => APC.net.c.fill(0), '', 'ghost') : null;
  const lights = !APC.src ? 'Kein APC40 MK2 verbunden – die Pads unten lassen sich trotzdem anklicken.'
    : APC.sx === 'ja' ? 'Die Lichter am APC folgen Myzel.'
    : APC.sx === 'abgelehnt' ? 'Der Browser hat SysEx abgelehnt: die Pads wirken, ihre Lichter bleiben aus (Website-Einstellungen → MIDI).'
    : 'Damit die Pads leuchten, braucht Myzel einmal die SysEx-Erlaubnis des Browsers.';
  const sx = APC.src && APC.sx !== 'ja' ? b('Lichter einschalten', () => apcSysex(true), 'Fragt den Browser nach SysEx und schaltet das APC in den Modus, in dem der Computer die Lichter führt') : null;
  el.replaceChildren(h('h4', null, 'APC40 MK2 · Clip-Pads'), modes,
    h('p', { class: 'cb-note' }, APC.mode === 'aus' ? 'Die Pads wirken wie zugewiesen. Mit den fünf Scene-Tasten rechts am Gerät wählst du einen Modus.' : APC_WHAT[APC.mode] + ' Scene 1–5 am Gerät wechseln den Modus.'),
    h('div', { class: 'apc-row' }, grid, h('div', { class: 'apc-side' }, ...[run, clr, sx].filter(Boolean), h('p', { class: 'cb-note' }, lights, ' (Ungetestet am echten Gerät.)'))));
  APC.uiSig = '';
}
function apcUiPaint() {
  const pads = APC.mode === 'aus' ? new Array(40).fill(null) : apcLights();
  if (!APC.cells) return;
  pads.forEach((p, k) => {
    const v = p ? p[0] : 0, c = APC.cells[k], hex = '#' + APC_PAL[v].toString(16).padStart(6, '0'), cls = p && p[1] ? (p[1] >= 11 ? 'blink' : 'puls') : '';
    if (c.dataset.c !== hex + cls) { c.dataset.c = hex + cls; c.style.setProperty('--l', v ? hex : 'transparent'); c.classList.toggle('lit', !!v); c.classList.toggle('blink', cls === 'blink'); c.classList.toggle('puls', cls === 'puls'); }
  });
}
