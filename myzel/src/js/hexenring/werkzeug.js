// ---- the card (step 2b): „Verwandeln“ per Schleife – the tape, the slices, the ageing, the notes, the groove, a tempo
// change, Klang aufs Feld, Export; the Folge in the form; the Band, the Bühnenansicht and the Setliste in the settings ----
const HX_TB = ['sp', 'rev', 'revW', 'trim', 'dbl', 'vb', 'ab', 'slc', 'art', 'artK', 'aon', 'aon0', 'notes0', 'tempoArt', 'nt', 'frei', 'puls'];
function hxTbOf(L) { const o = {}; for (const k of HX_TB) if (L[k] != null && L[k] !== false) o[k] = typeof L[k] === 'object' ? JSON.parse(JSON.stringify(L[k])) : L[k]; return Object.keys(o).length ? o : null; }
function hxTbSend(L) { if (!HX.node || L.bew) return; if ((L.sp || 1) !== 1) hxPost({ band: { loop: L.id, vs: L.sp, T: 1 } }); hxBandSend(L); hxBandApply(L); }
function hxCardTools(L, sch, chip, row, btn) {
  const sp = L.sp || 1, slc = L.slc || {}, nt = L.nt || {}, notes = sch.some(hxWCan), audio = !notes, tk = hxTakt(L);
  const kids = [
    row('Band', ...HX_SP.map(([v, t]) => chip(t, Math.abs(sp - v) < 1e-6, () => hxSpeed(L, v), 'Bandgeschwindigkeit ' + t + (v === 1 ? '' : v < 1 ? ' – tiefer und langsamer' : ' – höher und schneller'))),
      chip('rückwärts', !!L.rev, () => hxRev(L), 'Rückwärts – sofort, ab der gespiegelten Stelle'), chip('Stopp', false, () => hxBandstopp([L]), 'Bandstopp: das Band läuft aus')),
    row('Trimmen', chip('½', !!(L.trim && L.trim.f === 0.5), () => hxBandTrim(L, 'h'), 'Trimmen: die halbe Schleife'), chip('¼', !!(L.trim && L.trim.f === 0.25), () => hxBandTrim(L, 'v'), 'Trimmen: ein Viertel'),
      L.trim ? chip('◀', false, () => hxBandTrim(L, '<'), 'Ausschnitt früher') : null, L.trim ? chip('▶', false, () => hxBandTrim(L, '>'), 'Ausschnitt später') : null, L.trim ? chip('ganz', false, () => hxBandTrim(L, 'ganz'), 'Wieder ganz') : null,
      chip('Verdoppeln', false, () => hxDouble(L), 'Verdoppeln: doppelt so lang durch Wiederholung')),
    row('Auslassen', ...HX_SLP.map(([v, t]) => chip(t, (slc.pd || 0) === v, () => hxSlcSet(L, 'pd', v), 'Auslassen: ' + t + ' der Anschläge fallen weg'))),
    row('Würfeln', ...HX_SLP.map(([v, t]) => chip(t, (slc.pw || 0) === v, () => hxSlcSet(L, 'pw', v), 'Würfeln: ' + t + ' der Anschläge tauschen den Platz')), (slc.pd || slc.pw) ? chip('neu', false, () => hxSlcSet(L, 'neu'), 'Neu würfeln') : null),
    row('Verblassen', ...HX_VB.map(([v, t]) => chip(t, (L.vb != null ? L.vb : 1) === v, () => hxVbSet(L, v), 'Verblassen ' + t + ': jede Schicht pro Durchgang leiser'))),
    row('Abrieb', ...HX_ABR.map(([v, t]) => chip(t, ((L.ab && L.ab.rate) || 0) === v, () => hxAbSet(L, v), 'Abrieb ' + t + ': das Band nutzt sich an denselben Stellen ab')), L.ab ? chip('Auffrischen', false, () => hxAbSet(L, 0, true), 'Auffrischen: wie neu') : null),
    ...hxCardZers(L, chip, row),   // (step 4: Einwurzeln, Abrieb nach Moder)
  ];
  if (audio && tk) kids.push(row('Tempowechsel', chip('Schnitt', (L.tempoArt || L.art) === 'schlag', () => hxTempoArtSet(L, 'schlag'), 'Neues Tempo: an den Anschlägen neu ins Raster gesetzt'), chip('frei', (L.tempoArt || L.art) === 'flaeche', () => hxTempoArtSet(L, 'flaeche'), 'Neues Tempo: läuft in seinem eigenen weiter'),
    h('span', { class: 'hx-ms' }, L.art ? (L.art === 'schlag' ? 'rhythmisch' : 'Fläche') + (L.tempoArt && L.tempoArt !== L.art ? ' · gewählt' : ' · erkannt') : '')));
  if (notes) {
    kids.push(row('Noten', chip('Stufe −1', false, () => hxNtSet(L, 'tr', -1), 'Eine Stufe tiefer in der Tonart'), chip('Stufe +1', false, () => hxNtSet(L, 'tr', 1), 'Eine Stufe höher'),
      chip('dünner', (nt.dens || 0) < 0, () => hxNtSet(L, 'dens', -1), 'Ausdünnen: die schwächsten Töne weg'), chip('dichter', (nt.dens || 0) > 0, () => hxNtSet(L, 'dens', 1), 'Füllen: Durchgangstöne'),
      chip('Krebs', !!nt.krebs, () => hxNtSet(L, 'krebs'), 'Krebs: rückwärts gespielt'), chip('Umkehrung', !!nt.umk, () => hxNtSet(L, 'umk'), 'Umkehrung in der Tonleiter'), hxNtOn(L) ? chip('wie gespielt', false, () => hxNtSet(L, 'zurueck'), 'Die Noten wie gespielt') : null,
      h('span', { class: 'hx-ms' }, nt.tr ? 'Stufe ' + (nt.tr > 0 ? '+' : '') + nt.tr : '')));
    const S0 = sch.find(hxWCan), G = S0 && hxGrooveOf(S0.wn, L.bpb);
    if (tk) kids.push(row('Groove', chip('straffen', (nt.gq || 0) > 0, () => hxNtSet(L, 'gq', 0.5), 'Nach deinem eigenen Groove straffen'), chip('lockern', (nt.gq || 0) < 0, () => hxNtSet(L, 'gq', -0.5), 'Lockern'),
      chip('Puls übernimmt', false, () => hxGroovePuls(L), 'Der Puls swingt wie diese Schleife'),
      h('span', { class: 'hx-ms' }, G && (G.sw16 != null || G.sw8 != null) ? 'Swing ' + Math.round(100 * clamp(G.sw16 != null && Math.abs(G.sw16) > 1e-4 ? (2 * G.sw16) / 0.25 : (2 * (G.sw8 || 0)) / 0.5, 0, 0.6)) + ' %' : '')));
  }
  kids.push(h('div', { class: 'hx-row end' }, btn('Grundeinstellung', () => hxDefaults(L), { aria: 'Alle Bearbeitungen zurück auf die Grundeinstellung (↶ holt sie zurück)' }), notes && hxWAktiv(L) ? btn('Erstarren', () => hxErstarren(L), { aria: 'Erstarren: dieser Wuchs-Durchgang wird der Abdruck' }) : null,
    btn('Klang aufs Feld', () => hxKlangFeld(L), { aria: 'Das Spielfeld spielt die Klangquelle dieser Schleife' }),
    btn('Als Aufnahme', () => hxExportTake(L), { aria: 'Als Aufnahme exportieren: WAV, ZIP, Körner' }), notes ? btn('MIDI', () => hxExportMidi(L), { aria: 'Die Noten als MIDI-Datei' }) : null));
  const sec = foldSec('hxt' + L.slot, 'Verwandeln', kids);
  const on = [sp !== 1 && 'Band ' + HX_SP.find((x) => Math.abs(x[0] - sp) < 1e-6)[1], L.rev && 'rückwärts', L.trim && 'getrimmt', (L.dbl || 1) > 1 && '×' + L.dbl, slc.pd && 'Auslassen', slc.pw && 'Würfeln', L.vb != null && L.vb < 1 && 'Verblassen', L.ab && 'Abrieb', L.einw && 'Einwurzeln', L.moder && 'Moder', hxNtOn(L) && 'Noten', L.frei === 'tempo' && 'frei', L.gap && 'Treffen'].filter(Boolean);
  sec.sub.textContent = on.join(' · ');
  return sec;
}
function hxCardFolge(btn) {
  if (!HX.lich.length) return null;
  const F = HX.fl || { items: [], loop: false }, chip = (t, on, fn, aria) => { const b = h('button', { type: 'button', class: 'chip', 'aria-pressed': on ? 'true' : 'false', 'aria-label': aria || null }, t); b.addEventListener('click', fn); return b; };
  const items = F.items.map((it, i) => { const Li = hxLichOf(it.lich); if (!Li) return null;
    return h('div', { class: 'hx-lrow' + (F.on && F.i === i ? ' cur' : '') }, h('span', { class: 'lab' }, (i + 1) + '. ' + Li.name + ' ×' + it.n),
      h('div', { class: 'chips small' }, chip('−', false, () => { it.n = Math.max(1, it.n - 1); hxFolgeSet(F.items, F.loop); }, 'Ein Durchgang weniger'), chip('+', false, () => { it.n = Math.min(64, it.n + 1); hxFolgeSet(F.items, F.loop); }, 'Ein Durchgang mehr'),
        h('button', { type: 'button', class: 'chip danger', 'aria-label': 'Aus der Folge nehmen', onclick: () => { F.items.splice(i, 1); hxFolgeSet(F.items, F.loop); } }, '✕'))); }).filter(Boolean);
  const sel = h('select', { class: 'hx-eng', 'aria-label': 'Lichtung zur Folge hinzufügen' }, h('option', { value: '' }, '+ Lichtung …'), ...HX.lich.map((Li) => h('option', { value: Li.id }, Li.name)));
  sel.addEventListener('change', () => { if (sel.value) { F.items.push({ lich: sel.value, n: 4 }); hxFolgeSet(F.items, F.loop); } });
  return h('div', { class: 'hx-folge' }, h('div', { class: 'hx-gh' }, h('b', null, 'Folge'), h('span', null, F.items.length ? ' – ' + F.items.map((it) => { const Li = hxLichOf(it.lich); return (Li ? Li.name.replace('Lichtung ', '') : '?') + ' ×' + it.n; }).join(' → ') + (F.loop ? ' ↺' : '') : ' – Lichtungen nacheinander, mit Durchgängen')),
    ...items, h('div', { class: 'hx-acts' }, sel, chip('↺ im Kreis', !!F.loop, () => hxFolgeSet(F.items, !F.loop), 'Folge im Kreis'), F.items.length ? (F.on ? btn('Folge anhalten', () => hxFolgeStop()) : btn('Folge starten', () => hxFolgeStart(), { cls: 'primary' })) : null));
}
function hxCardSet(btn) {
  const S = hxSetGet(), box = h('div', { class: 'hx-setl' });
  box.append(h('div', { class: 'hx-gh' }, h('b', null, 'Setliste'), h('span', null, S.list.length ? ' – ' + S.list.length + (S.list.length === 1 ? ' Lied' : ' Lieder') : ' – Presets mit Tempo und Lichtungen')));
  S.list.forEach((e, i) => box.append(h('div', { class: 'hx-lrow' + (S.cur === i ? ' cur' : '') }, h('span', { class: 'lab' }, (i + 1) + '. ' + e.name), h('span', { class: 'hx-ms' }, (e.preset ? (PRESETS.find((p) => p.key === e.preset) || {}).name || e.preset : 'eigener Klang') + ' · ' + dec(e.bpm) + ' BPM'),
    h('div', { class: 'chips small' }, h('button', { type: 'button', class: 'chip', onclick: () => hxSetGo(i) }, 'Laden'), h('button', { type: 'button', class: 'chip danger', 'aria-label': e.name + ' aus der Setliste', onclick: () => { S.list.splice(i, 1); if (S.cur >= S.list.length) S.cur = S.list.length - 1; hxSetSave(); hxCardDirty(); } }, '✕')))));
  box.append(h('div', { class: 'hx-acts' }, btn('Dieses Lied hinzufügen', () => hxSetAdd()), S.list.length ? btn('Nächstes Lied', () => hxSetNext(), { cls: 'primary' }) : null));
  return box;
}

/* ---- Step 2b, Werkzeug (SPEC §11, §12.1c/d, §13 Folge/Puls ernten/Klang aufs Feld, §14, §16 Bühnenansicht): the tape's
   gestures on what plays (speed with its inertia, Bandstopp, rückwärts, Trimmen, Verdoppeln, Verblassen, Abrieb,
   Auslassen, Würfeln – the real-time ones in the processor, under every version a Schicht plays; the others a new
   version swapped at the seam, ↶ back), audio loops on a tempo change (Schnitt for rhythmic ones, frei for pads), the
   notes' tools (Wuchs), the Auslese's consensus, the groove, export, Folge, Puls ernten, Klang aufs Feld, the
   Bühnenansicht with its Setliste. ---- */
const HX_SP = [[0.5, '½'], [2 / 3, '⅔'], [1, '×1'], [1.5, '1½'], [2, '×2']];
const HX_PULS_K = 0.5;   // pulse clarity (the onset train's autocorrelation at its best lag against itself) from which a loop counts as rhythmic
// ---- a loop's audio onsets and its kind (§11): rhythmic – ≥ 4 onsets a bar with a clear pulse – or a Fläche ----
// onsets (frames into x) refined to the attack: the first frame of the rise where the 1-ms envelope passes 30 % of its
// peak just after the flux's frame (the flux's hop is 128 frames: an onset to within a few samples)
function hxOnsetsAt(x, floor) {
  const on = hxFlux(x, floor), out = [], a = Math.exp(-1 / (0.001 * SR));
  for (const f of on) {
    const i0 = Math.max(0, f - 384), i1 = Math.min(x.length, f + 512), env = new Float32Array(i1 - i0);
    let e = 0; for (let i = i0; i < i1; i++) { const v = Math.abs(x[i]); e = v > e ? v : a * e + (1 - a) * v; env[i - i0] = e; }
    let pk = 0, pi = 0; for (let i = Math.max(0, f - i0 - 128); i < env.length; i++) if (env[i] > pk) { pk = env[i]; pi = i; }
    let j = pi; while (j > 0 && env[j - 1] > 0.3 * pk) j--;
    const t = i0 + j;
    // (an attack: the 30 ms after it at least 6 dB over the 40 ms before it – a pad's beating, a swell, is no onset)
    const rm = (a, b) => { let s2 = 0, c = 0; for (let i = Math.max(0, a); i < Math.min(x.length, b); i++) { s2 += x[i] * x[i]; c++; } return c ? Math.sqrt(s2 / c) : 0; };
    if (rm(t, t + 0.03 * SR) < 2 * rm(t - 0.05 * SR, t - 0.01 * SR)) continue;
    if (!out.length || t - out[out.length - 1] > 0.03 * SR) out.push(t);
  }
  return out;
}
// the pulse's clarity of an onset train over a loop (circular: it repeats) – Gaussians of 10 ms at each onset, weighted
// by its level (its mean taken out: the envelope's own swing), autocorrelated at lags 0.1 … 2 s: the best lag against
// the train with itself (1: every onset finds one a lag later, as loud; a random train finds few)
function hxClarity(ons, w, len) {
  const H = 128, N = Math.max(8, Math.ceil(len / H)), e = new Float32Array(N), sg = (0.01 * SR) / H;
  ons.forEach((f, i) => { const c = f / H; for (let d = -Math.ceil(3 * sg); d <= Math.ceil(3 * sg); d++) { const j = ((Math.round(c) + d) % N + N) % N; e[j] += w[i] * Math.exp(-0.5 * Math.pow((Math.round(c) + d - c) / sg, 2)); } });
  let m = 0; for (let i = 0; i < N; i++) m += e[i]; m /= N; for (let i = 0; i < N; i++) e[i] -= m;
  let z = 0; for (let i = 0; i < N; i++) z += e[i] * e[i];
  const a = Math.max(1, Math.round((0.1 * SR) / H)), b = Math.min(N - 1, Math.round((2 * SR) / H));
  let best = 0;
  for (let L = a; L <= b; L++) { let s = 0; for (let i = 0; i < N; i++) s += e[i] * e[(i + L) % N]; if (s > best) best = s; }
  return z > 0 ? best / z : 0;
}
function hxArtOf(L, S) {
  const aud = S && (S.baked && S.bak ? S.bak : S.aud); if (!aud || !S.len) return null;
  const x = hxMono(aud, S.pre, S.len), ons = hxOnsetsAt(x).filter((f) => f >= 0 && f < S.len);
  const w = ons.map((f) => { let m = 0; for (let i = f; i < Math.min(x.length, f + Math.round(0.03 * SR)); i++) m = Math.max(m, Math.abs(x[i])); return m; });
  const bars = hxTakt(L) ? L.d.beats / (L.bpb || 4) : S.len / SR / (hxBar() || 2), per = ons.length / Math.max(0.25, bars), k = hxClarity(ons, w, S.len);
  return { art: per >= 4 && k >= HX_PULS_K ? 'schlag' : 'flaeche', per, k, u: ons.map((f) => f / S.len) };
}
// the slices a loop plays its tools with: its notes' onsets (a chord within 30 ms is one), else its audio's – always a
// slice from the loop's start (what sounds before the first onset is never lost)
function hxBandU(L) {
  let u = [];
  if (L.notes && L.notes.length) { const ph = L.notes.map((n) => n.ph).sort((a, b) => a - b); for (const p of ph) if (!u.length || p - u[u.length - 1] > 0.03 / Math.max(0.05, hxLen(L))) u.push(p); }
  if (L.aon && (!u.length || !hxBandNotes(L))) u = L.aon.slice();
  u = u.filter((p) => p >= 0 && p < 1);
  if (!u.length || u[0] > 0.004) u.unshift(0);
  return u;
}
const hxBandNotes = (L) => L.sch.some((id) => hxWCan(HX.sch.get(id)));
// Schnitt: an audio loop of the rhythmic kind is re-placed by slices when its pass is not its own length (the processor
// decides at each pass start) – loops with notes grow in the new tempo instead (Wuchs)
const hxSchnitt = (L) => !L.bew && (L.tempoArt || L.art) === 'schlag' && !hxBandNotes(L);
// now (owner, 26.10.2026: „on the fly“): Weglassen and Tauschen from this moment, crossfaded – not while a new length
// waits for its seam (the slices are the coming pass's)
function hxBandSend(L, now) {
  if (!L || L.bew || !HX.node) return;
  hxPost({ slice: Object.assign(hxBandSliceOf(L) || { loop: L.id, off: 1 }, now && !L.prev ? { now: 1 } : null) });
}
// the slices a loop plays as the processor gets them (null: none) – the editor's waveform renders with the same
function hxBandSliceOf(L) {
  const sl = L.slc || {}, sch = hxSchnitt(L), lq = L.ladung && !L.acc && !hxWAktiv(L) && !L.live ? L.ladQ || 0 : 0, on = sch || sl.pd > 0 || sl.pw > 0 || lq > 0;   // (step 4: Ladung boils an Abdruck – drop-outs and stutters on the grid)
  if (lq > 0 && !L.ladSeed) L.ladSeed = ((Math.random() * 2147483646) | 0) + 1;
  return on ? { loop: L.id, u: lq > 0 && !sch ? hxLadU(L) : hxBandU(L), schnitt: sch ? 1 : 0, pd: Math.max(sl.pd || 0, 0.3 * lq), pw: sl.pw || 0, ps: 0.45 * lq, seed: lq > 0 ? (sl.seed || 1) ^ L.ladSeed : sl.seed || 1 } : null;
}
// once a loop's first Schicht is filled: its kind and onsets (for the tools and a tempo change); and what it plays with
function hxBandFill(S) {
  const L = HX.loops.get(S.loop); if (!L || L.bew || L.sch[0] !== S.id) return;
  const r = hxArtOf(L, S);
  if (r) { L.art = r.art; L.artK = r.k; L.aon = r.u; }
  hxBandSend(L); hxBandApply(L);
  hxSaveMeta(L.id);
}
// a loop's settings again (a new Schicht, a reload, a rebuild): Verblassen, Abrieb, the slices
function hxBandApply(L, only) {
  if (!L || L.bew || !HX.node) return;
  const ids = only ? [only] : L.sch;
  if (L.vb != null && L.vb < 1) hxPost({ vb: ids.map((id) => ({ schicht: id, fb: L.vb })) });
  if (L.ab && L.ab.rate > 0) hxPost({ abr: ids.map((id) => ({ schicht: id, rate: L.ab.rate, seed: L.ab.seed })) });
}

// ---- §11: audio loops on a tempo change – a Fläche runs frei from that point at its own length (its ring says so),
// a rhythmic loop stays in the Takt and is re-placed by slices (the processor, every pass, while the pass is not its
// own length; back at its tempo, the tape as it is) ----
function hxTempoAudio() {
  if (!HX.node) return;
  const now = hxNowT(), f = Math.round(hxF(now)), bpm = tgBpm(now + 0.05);
  for (const L of hxLoopsLive()) {
    if (L.bew || !hxTakt(L) || hxBandNotes(L) || (L.sp || 1) !== 1) continue;
    if ((L.tempoArt || L.art) !== 'flaeche') continue;
    if (Math.abs(bpm / (L.bpm || bpm) - 1) < 0.005) continue;   // (its own tempo – a device's clock wobbling: it stays in the Takt)
    const S = HX.sch.get(L.sch[0]); if (!S) continue;
    const k = hxPassK(L, f), s0 = hxPassF(L, k), Lf = S.len;
    hxPost({ geom: { loop: L.id, lock: 'frei', L: Lf } });
    L.d = Object.assign({}, L.d, { lock: 'frei', L: Lf, ph0: s0 - k * Lf }); L.prev = null; L.frei = 'tempo';
    hxSay(hxName(L) + ' läuft frei weiter'); hxSaveLoop(L); hxRailDirty(); hxCardDirty();
  }
}
// the card's choice, over the analysis: Schnitt or frei (a frei one back into the Takt is a new harvest)
function hxTempoArtSet(L, a) { L.tempoArt = a; hxBandSend(L); hxSaveMeta(L.id); hxCardDirty(); hxSay(hxName(L) + ': beim Tempowechsel ' + (a === 'schlag' ? 'Schnitt' : 'frei')); }

