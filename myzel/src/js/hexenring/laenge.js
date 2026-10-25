// ---- (owner, 25.10.2026) „Beim Looper fehlt die Einstellung für die Taktlänge der Schleifen … und als Spieler sollte man
// sehen, wo man im Takt ist, wo man in der Schleife ist, wenn man sie einspielt.“ The length of a new Schleife sits at the
// rail beside the Hauptknopf (auto · 1 … 16 Takte – hx.laenge, hx.festT; „wie Schleife 1“ shows while it is set); its
// popover also holds the tempo a first loop is counted in at, the count-in and the click. A fixed length closes by
// itself – without a Takt yet one is set at the Puls's tempo and one bar counted in (grammar.js, as the Raster). While a
// loop is counted in, played in or overdubbed, the field shows where you are (hxPosDraw): its bars as boxes of beats
// filling up, „Takt 2 von 4“ – the rail's Taktlinie shows the same beats. ----
const HX_LEN_Q = [1, 2, 3, 4, 6, 8, 12, 16];   // the quick lengths (any 1 … 16 in the card's settings)
const HX_LEN_K = ['auto', 1, 2, 3, 4, 6, 8, 12, 16];   // a knob's steps (MIDI)
const HXLEN = { open: false, kb: false, rep: 0 };
const hxTakteA = (n) => (n === 1 ? 'einen Takt' : dec(+n.toFixed(2)) + ' Takte');   // (accusative: „nimmt 4 Takte auf“)
const hxTakteD = (n) => (n === 1 ? 'einem Takt' : dec(+n.toFixed(2)) + ' Takten');   // (dative: „nach 4 Takten“)
const hxLenSay = () => { const l = P['hx.laenge'], n = P['hx.festT']; return l === 'fest' ? n + (n === 1 ? ' Takt' : ' Takte') : l === 'wie1' ? 'wie Schleife 1' : 'automatisch'; };
function hxLenSet(v) {
  if (v === 'auto' || v === 'wie1') setParam('hx.laenge', v);
  else { setParam('hx.festT', clamp(Math.round(+v), 1, 16)); setParam('hx.laenge', 'fest'); }
}
function hxLenBuild() {
  const b = HXU.len, pop = HXU.lenPop; if (!b || !pop) return;
  b.addEventListener('click', (e) => { HXLEN.kb = e.detail === 0; hxLenOpen(); });
  b.addEventListener('contextmenu', (e) => e.preventDefault());
  pop.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); hxLenOpen(false); b.focus(); } });
  // a press anywhere else closes it (the rail's own buttons act as always)
  document.addEventListener('pointerdown', (e) => { if (HXLEN.open && !pop.contains(e.target) && !b.contains(e.target)) hxLenOpen(false); }, true);
  window.addEventListener('keydown', (e) => { if (HXLEN.open && e.key === 'Escape' && !pop.contains(e.target)) hxLenOpen(false); });
  window.addEventListener('resize', () => { if (HXLEN.open) hxLenPlace(); });
  const stop = () => { clearTimeout(HXLEN.rep0); clearInterval(HXLEN.rep); };
  for (const ev of ['pointerup', 'pointercancel', 'blur']) window.addEventListener(ev, stop, true);   // (a held tempo step ends wherever it is let go)
  for (const id of ['hx.laenge', 'hx.festT', 'seq.bpm', 'hx.ein', 'hx.klick']) bindCtl(id, () => { hxLenFace(); if (HXLEN.open) hxLenUpd(); });
}
// the button's face: the bars a new recording will take (big), „Takte“ under it; auto / =1 otherwise
function hxLenFace() {
  const b = HXU.len; if (!b) return;
  const l = P['hx.laenge'], n = P['hx.festT'], k = l + n;
  if (b.dataset.k !== k) {
    b.dataset.k = k; b.dataset.l = l;
    b.replaceChildren(h('b', null, l === 'fest' ? String(n) : l === 'wie1' ? '=1' : 'auto'), h('span', { class: 'w' }, l === 'fest' ? (n === 1 ? 'Takt' : 'Takte') : 'Länge'));
  }
  const aria = 'Länge neuer Schleifen: ' + hxLenSay() + ' – Auswahl öffnen';
  if (b.getAttribute('aria-label') !== aria) b.setAttribute('aria-label', aria);
  const tip = 'Länge der nächsten Schleife: ' + hxLenSay() + '. Klicken: Länge, Tempo, Einzählen und Klick wählen.' + (l === 'fest' ? ' Die Aufnahme schließt nach ' + hxTakteD(n) + ' von selbst.' : '');
  if (b.title !== tip) b.title = tip;
}
function hxLenOpen(on) {
  const pop = HXU.lenPop, b = HXU.len; if (!pop || !b) return;
  if (on == null) on = pop.hidden;
  if (on && (!A.started || b.hidden || !b.offsetParent)) return;
  HXLEN.open = !!on; pop.hidden = !on; b.setAttribute('aria-expanded', String(!!on));
  if (!on) return;
  hxLenRender(); hxLenPlace();
  if (HXLEN.kb) { const f = pop.querySelector('[aria-pressed="true"]') || pop.querySelector('button'); if (f) f.focus(); }
}
// above its button, inside the rail
function hxLenPlace() {
  const pop = HXU.lenPop, b = HXU.len, rail = HXU.rail; if (!pop || pop.hidden) return;
  const x = b.offsetLeft + b.offsetWidth / 2 - 46, max = Math.max(6, rail.clientWidth - pop.offsetWidth - 6);
  pop.style.left = Math.round(clamp(x, 6, max)) + 'px';
}
function hxLenRender() {
  const pop = HXU.lenPop; if (!pop || pop.hidden) return;
  const l = P['hx.laenge'], n = P['hx.festT'], grid = hxGrid();
  const chip = (t, on, fn, tip, aria, g, v) => { const c = h('button', { type: 'button', class: 'chip', 'aria-pressed': on ? 'true' : 'false', title: tip, 'aria-label': aria || null, 'data-g': g || null, 'data-v': v != null ? String(v) : null }, t); c.addEventListener('click', fn); return c; };
  const row = (lab, tip, ...kids) => h('div', { class: 'hx-lrw' }, h('span', { class: 'lab', title: tip }, lab), h('div', { class: 'chips' }, ...kids));
  const qs = HX_LEN_Q.includes(n) ? HX_LEN_Q : HX_LEN_Q.concat(n).sort((a, b) => a - b);
  HXLEN.sig = hxLenSig();   // (what the popover's build depends on – anything else updates in place: hxLenUpd)
  const len = row('Länge', 'Wie lang die nächste Schleife wird.',
    chip('auto', l === 'auto', () => hxLenSet('auto'), 'Automatisch: die erste Schleife so lang, wie du spielst (● beginnt, ● schließt); jede weitere so lang wie Schleife 1 – oder du schließt früher.', 'Länge automatisch', 'len', 'auto'),
    l === 'wie1' ? chip('wie 1', true, () => hxLenSet('wie1'), 'Wie Schleife 1: jede neue Schleife wird so lang wie die erste.', 'Länge wie Schleife 1', 'len', 'wie1') : null,
    ...qs.map((k) => chip(String(k), l === 'fest' && n === k, () => hxLenSet(k), (k === 1 ? 'Ein Takt' : k + ' Takte') + ': die Aufnahme schließt nach genau ' + hxTakteD(k) + ' von selbst.', 'Länge ' + (k === 1 ? 'ein Takt' : k + ' Takte'), 'len', k)));
  // the tempo: without a Takt the one the first loop is counted in at (the Puls's); with one, what runs
  let tempo;
  if (grid) {
    const who = SEQ.ext ? 'nach der MIDI-Uhr' : SEQ.on ? 'Puls' : TG.hxOn ? 'aus den Schleifen' : 'Takt';
    tempo = row('Tempo', 'Das Tempo, in dem die Schleife aufgenommen wird – es läuft schon.', (HXLEN.bpm = h('b', { class: 'hx-bpmv' }, hxLenBpm())), h('span', { class: 'hx-ms' }, who));
  } else {
    const step = (t, d) => {
      const c = h('button', { type: 'button', class: 'chip', title: d < 0 ? 'Langsamer (gehalten: weiter)' : 'Schneller (gehalten: weiter)', 'aria-label': d < 0 ? 'Tempo langsamer' : 'Tempo schneller' }, t);
      const go = () => setParam('seq.bpm', clamp(Math.round(P['seq.bpm']) + d, PD['seq.bpm'].min, PD['seq.bpm'].max));
      c.addEventListener('pointerdown', (e) => { if (e.button > 0) return; e.preventDefault(); go(); clearInterval(HXLEN.rep); clearTimeout(HXLEN.rep0); HXLEN.rep0 = setTimeout(() => { HXLEN.rep = setInterval(go, 70); }, 380); });
      for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) c.addEventListener(ev, () => { clearTimeout(HXLEN.rep0); clearInterval(HXLEN.rep); });
      c.addEventListener('click', (e) => { if (e.detail === 0) go(); });   // (a key: Enter or Space)
      return c;
    };
    tempo = row('Tempo', 'Gibt es noch keinen Takt, zählt Myzel in diesem Tempo ein – es ist das Tempo des Pulses.', step('−', -1), (HXLEN.bpm = h('b', { class: 'hx-bpmv', 'aria-live': 'polite' }, hxLenBpm())), step('+', 1));
  }
  const vib = MOBILE && !!navigator.vibrate;
  const ein = row('Einzählen', 'Wie Myzel vor der Aufnahme einzählt.', ...[['aus', 'aus'], ['sicht', 'sichtbar'], vib ? ['vib', 'Vibration'] : null, ['ton', 'hörbar']].filter(Boolean)
    .map(([v, t]) => chip(t, P['hx.ein'] === v, () => setParam('hx.ein', v), { aus: 'Nicht einzählen: das Feld zeigt die Zählzeiten trotzdem.', sicht: 'Die Zählzeiten groß auf dem Feld.', vib: 'Das Gerät vibriert auf jeder Zählzeit.', ton: 'Ein Klick auf jeder Zählzeit vor der Aufnahme.' }[v], 'Einzählen ' + t, 'ein', v)));
  const kl = row('Klick', 'Ein hörbarer Klick zum Mitspielen (nur für dich – er kommt nicht in die Schleife).', ...[['aus', 'aus'], ['zaehl', 'Einzählen'], ['ein', 'immer']]
    .map(([v, t]) => chip(t, P['hx.klick'] === v, () => setParam('hx.klick', v), { aus: 'Kein Klick.', zaehl: 'Ein Klick nur beim Einzählen.', ein: 'Ein Klick auf jedem Schlag, solange ein Takt läuft.' }[v], 'Klick ' + t, 'kl', v)));
  const more = h('button', { type: 'button', class: 'hx-lenmore', title: 'Alle Einstellungen der Aufnahme in der Karte: Beginn, Raster, Hauptknopf, Puls und Bordun mit, Speicher …' }, 'Alle Einstellungen …');
  more.addEventListener('click', () => {
    hxLenOpen(false); hxCardOpen();
    setTimeout(() => { const fb = HXK.sec && HXK.sec.querySelector('[aria-controls="kc-hxset"]'); if (!fb) return; if (fb.getAttribute('aria-expanded') !== 'true') fb.click(); fb.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, 220);
  });
  pop.replaceChildren(h('div', { class: 'hx-lh' }, 'Neue Schleife'), len, tempo, ein, kl, (HXLEN.note = h('p', { class: 'note' }, hxLenNote())), more);
}
const hxLenSig = () => { const n = P['hx.festT']; return hxGrid() + '|' + (HX_LEN_Q.includes(n) ? '' : n) + '|' + (P['hx.laenge'] === 'wie1'); };
const hxLenBpm = () => (hxGrid() ? dec(tgBpm(hxNowT()).toFixed(1)) : Math.round(P['seq.bpm'])) + ' BPM';
// a setting changed while it is open: in place (a held tempo step keeps its button), rebuilt only when its rows change
function hxLenUpd() {
  const pop = HXU.lenPop; if (!pop || pop.hidden) return;
  if (HXLEN.sig !== hxLenSig()) { const a = document.activeElement, f = a && pop.contains(a) ? (a.dataset.g ? '[data-g="' + a.dataset.g + '"][data-v="' + a.dataset.v + '"]' : null) : null; hxLenRender(); if (f) { const e = pop.querySelector(f); if (e) e.focus(); } return; }
  const l = P['hx.laenge'], n = P['hx.festT'], on = { len: l === 'fest' ? String(n) : l, ein: P['hx.ein'], kl: P['hx.klick'] };
  for (const c of pop.querySelectorAll('.chip[data-g]')) { const v = String(on[c.dataset.g] === c.dataset.v); if (c.getAttribute('aria-pressed') !== v) c.setAttribute('aria-pressed', v); }
  if (HXLEN.bpm) { const t = hxLenBpm(); if (HXLEN.bpm.textContent !== t) HXLEN.bpm.textContent = t; }
  if (HXLEN.note) { const t = hxLenNote(); if (HXLEN.note.textContent !== t) HXLEN.note.textContent = t; }
}
// what the next recording does, in one sentence
function hxLenNote() {
  const l = P['hx.laenge'], n = P['hx.festT'], grid = hxGrid(), R = HX.rec, L1 = hxLoopsLive().filter((L) => hxTakt(L) && !(R && R.loopKey === L.key)).sort((a, b) => a.made - b.made)[0];
  if (l === 'fest') return grid ? 'Die Aufnahme beginnt mit dem nächsten Takt und schließt nach ' + hxTakteD(n) + ' von selbst – die Schleife spielt sofort weiter.'
    : 'Tippe ● oder die Leertaste: Myzel zählt einen Takt ein und nimmt genau ' + hxTakteA(n) + ' auf, dann spielt die Schleife.';
  if (L1) return 'Neue Schleifen werden so lang wie ' + hxName(L1) + ' (' + hxTakteA(L1.d.beats / 4) + ') und schließen von selbst – oder du tippst ● früher.';
  return 'Die Schleife wird so lang, wie du spielst: ● beginnt, ● schließt' + (grid ? ' – auf dem Takt.' : '.');
}
// (the length changed while a recording waits or runs with a Takt) it takes the new length – if its new end is still ahead
function hxLenLive() {
  const R = HX.rec; if (!R || !R.grid || R.b0 == null || R.close != null || R.phase === 'listen') return;
  const base = hxBase();
  if (base === R.base) return;
  if (base && tgTime(R.b0 + base * R.mult) < hxNowT() + HX_LEAD) return;   // (it would end in the past: the next recording takes it)
  R.base = base;
  if (base) hxRecAuto();
  else { if (R.loopKey) { hxUnmake(hxByKey(R.loopKey)); R.loopKey = null; } R.w1 = null; if (HX.chips && HX.chips.kind === 'mult') HX.chips = null; }
  hxRailDirty();
}
// a knob or a button on a controller: the length in steps (auto, 1, 2, 3, 4, 6, 8, 12, 16 bars)
function hxLenIdx() { if (P['hx.laenge'] !== 'fest') return 0; const n = P['hx.festT']; let i = 1; for (let k = 1; k < HX_LEN_K.length; k++) if (HX_LEN_K[k] <= n) i = k; return i; }
function hxLenStep(d) { const i = clamp(hxLenIdx() + Math.sign(d), 0, HX_LEN_K.length - 1); hxLenSet(HX_LEN_K[i]); hxSay('Länge: ' + hxLenSay()); }
midiTarget('hx.len', 'Länge neuer Schleifen (auto · 1 bis 16 Takte)', null, { group: 'Hexenring', cont: true, get: () => hxLenIdx() / (HX_LEN_K.length - 1),
  set: (n2) => { const v = HX_LEN_K[Math.min(HX_LEN_K.length - 1, Math.floor(clamp(n2, 0, 1) * HX_LEN_K.length))]; if (v !== (P['hx.laenge'] === 'fest' ? P['hx.festT'] : 'auto')) { hxLenSet(v); hxSay('Länge: ' + hxLenSay()); } }, step: hxLenStep });
midiTarget('hx.len.next', 'Länge neuer Schleifen: länger', (v) => { if (v >= 0.5) hxLenStep(1); }, { group: 'Hexenring', button: true });
midiTarget('hx.len.prev', 'Länge neuer Schleifen: kürzer', (v) => { if (v >= 0.5) hxLenStep(-1); }, { group: 'Hexenring', button: true });

// ---- where you are while you play a loop in: kind ein (counted in) · ton (waits for the first note) · rec (with a Takt:
// its beats; beats 0 = open, it closes when you tap) · frei (no Takt: seconds) · ueber (an overdub: the loop's pass) ----
function hxRecPos(t) {
  const R = HX.rec, P0 = HX.punch;
  if (R) {
    const slot = R.slot;
    if (R.phase === 'listen') return { kind: 'ton', slot };
    if (!R.grid || R.b0 == null) return { kind: 'frei', slot, s: R.phase === 'rec' ? Math.max(0, t - R.t0) : 0 };
    const beats = R.close != null ? R.close - R.b0 : R.base ? R.base * R.mult : 0, b = tgBeat(t) - R.b0;
    if (b < 0 || R.phase === 'wait') return { kind: 'ein', slot, left: Math.max(1, Math.ceil(-b - 1e-6)), b: Math.min(0, b), beats, bpb: 4, bar0: hxBarNo(R.b0) };
    const bar = Math.floor(b / 4 + 1e-9) + 1;
    return { kind: 'rec', slot, b, beats, bpb: 4, bar, beat: Math.floor(b - 4 * (bar - 1) + 1e-9) + 1 };
  }
  if (P0) {
    const L = HX.loops.get(P0.loop); if (!L) return null;
    const ph = clamp(hxPhase(L, t), 0, 1), runde = Math.max(1, P0.sks.length);
    if (!hxTakt(L)) return { kind: 'ueber', slot: L.slot, ph, runde, len: hxLen(L), beats: 0 };
    const bpb = L.bpb || 4, beats = L.d.beats, b = ph * beats, bar = Math.floor(b / bpb + 1e-9) + 1;
    return { kind: 'ueber', slot: L.slot, ph, runde, b, beats, bpb, bar, beat: Math.floor(b - bpb * (bar - 1) + 1e-9) + 1 };
  }
  return null;
}
// the words of a position: what runs (left) and where it stands (right)
function hxPosWords(p) {
  const n = 'Schleife ' + (p.slot + 1), bars = p.beats ? p.beats / (p.bpb || 4) : 0, of = bars ? ' / ' + dec(+bars.toFixed(2)) : '';
  if (p.kind === 'ein') return ['Einzählen · ' + n, String(p.left), 'beginnt mit Takt ' + p.bar0 + (bars ? ' · ' + hxTakteA(bars) : '')];
  if (p.kind === 'ton') return ['Bereit · ' + n, '', 'beginnt mit deinem ersten Ton'];
  if (p.kind === 'frei') return ['Aufnahme · ' + n, fmtDur(p.s).replace(/,\d$/, ''), '● schließt'];
  if (p.kind === 'ueber') return ['Überspielen · ' + n + (p.runde > 1 ? ' · Runde ' + p.runde : ''), p.beats ? 'Takt ' + p.bar + of : Math.round(p.ph * 100) + ' %', p.beats ? 'Schlag ' + p.beat : ''];
  return ['Aufnahme · ' + n, 'Takt ' + p.bar + of, 'Schlag ' + p.beat];
}
// drawn on the field, at its top (every frame while something is recorded): the words, then the beats as cells in bars
function hxPosDraw(c, w, h) {
  if (!A.ctx || (!HX.rec && !HX.punch)) return;
  const p = hxRecPos(heardT()); if (!p) return;
  const [who, big, sub] = hxPosWords(p), ein = p.kind === 'ein' || p.kind === 'ton', col = ein ? HXC.spore : HXC.rec;
  const bpb = p.bpb || 4, open = p.kind === 'rec' && !p.beats;
  // the cells: the loop's beats; an open recording shows the bars so far (the last 16) and the one running
  let n = p.beats ? Math.ceil(p.beats - 1e-9) : open ? 4 * Math.min(16, Math.floor(p.b / 4 + 1e-9) + 1) : 0, off = 0;
  if (open && p.b >= 64) off = 4 * (Math.floor(p.b / 4 + 1e-9) + 1) - 64;
  const maxW = Math.min(w - 20, 680), gap = 2, bgap = 6, groups = n ? Math.ceil(n / bpb) : 0;
  const cw = n ? clamp((maxW - 28 - (groups - 1) * bgap - (n - groups) * gap) / n, 4, 22) : 0;
  const rowW = n ? n * cw + (n - groups) * gap + (groups - 1) * bgap : 0;
  const fui = HXU.font || (HXU.font = CSSV('--font-ui'));
  c.save(); c.globalCompositeOperation = 'source-over';
  c.font = '600 11px ' + fui; const wWho = c.measureText(who.toUpperCase()).width;
  c.font = '600 17px ' + COL.fontNum; const wBig = c.measureText(big).width;
  c.font = '500 12px ' + fui; const wSub = sub ? c.measureText(sub).width : 0;
  const W = Math.min(maxW, Math.max(rowW + 28, wWho + wBig + wSub + 74, 240)), H = n ? 62 : 40, x0 = Math.round((w - W) / 2), y0 = 10;
  c.fillStyle = 'rgba(17,13,11,0.86)'; c.strokeStyle = ein ? 'rgba(255,179,92,0.55)' : 'rgba(255,91,77,0.6)'; c.lineWidth = 1;
  c.beginPath(); if (c.roundRect) c.roundRect(x0 + 0.5, y0 + 0.5, W - 1, H - 1, 10); else c.rect(x0 + 0.5, y0 + 0.5, W - 1, H - 1); c.fill();
  HXLEN.box = { x0, y0, W, H, n, cw, kind: p.kind };   // (where it stood – the tests look there)
  if (p.kind === 'ton') c.setLineDash([3, 4]); c.stroke(); c.setLineDash([]);
  // the dot: red and breathing while it records, the count-in's orange while it waits
  const now = performance.now(), pu = REDUCED || ein ? 1 : 0.65 + 0.35 * Math.cos(now / 160);
  c.fillStyle = col; c.globalAlpha = pu; c.beginPath(); c.arc(x0 + 16, y0 + 20, 5, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1;
  c.textBaseline = 'middle'; c.textAlign = 'left';
  c.font = '600 11px ' + fui; c.fillStyle = 'rgba(240,230,216,0.78)'; c.fillText(who.toUpperCase(), x0 + 28, y0 + 20.5);
  c.textAlign = 'right';
  if (sub) { c.font = '500 12px ' + fui; c.fillStyle = 'rgba(168,152,138,0.95)'; c.fillText(sub, x0 + W - 14, y0 + 20.5); }
  if (big) { c.font = '600 17px ' + COL.fontNum; c.fillStyle = ein ? HXC.spore : HXC.hypha; c.fillText(big, x0 + W - 14 - (sub ? wSub + 10 : 0), y0 + 20.5); }
  if (n) {
    const cur = p.kind === 'ein' ? -1 : Math.floor((p.b || 0) + 1e-9) - off, fr = p.kind === 'ein' ? 0 : (p.b || 0) - Math.floor((p.b || 0) + 1e-9);
    let x = x0 + Math.round((W - rowW) / 2); const y = y0 + 38, ch = 14;
    for (let i = 0; i < n; i++) {
      if (i && (i + off) % bpb === 0) x += bgap - gap;
      const one = (i + off) % bpb === 0;
      if (i < cur) { c.fillStyle = 'rgba(255,91,77,0.7)'; c.fillRect(x, y, cw, ch); }
      else if (i === cur) { c.fillStyle = 'rgba(255,91,77,0.35)'; c.fillRect(x, y, cw, ch); c.fillStyle = HXC.rec; c.fillRect(x, y, Math.max(2, cw * fr), ch); }
      else { c.strokeStyle = one ? 'rgba(255,179,92,0.7)' : 'rgba(168,152,138,0.55)'; c.lineWidth = 1; c.strokeRect(x + 0.5, y + 0.5, cw - 1, ch - 1); }
      if (one && cw >= 9 && i !== cur) { c.font = '500 9px ' + COL.fontNum; c.textAlign = 'left'; c.fillStyle = i < cur ? 'rgba(20,15,12,0.85)' : 'rgba(255,179,92,0.85)'; c.fillText(String((i + off) / bpb + 1), x + 2, y + ch / 2 + 0.5); }
      x += cw + gap;
    }
  }
  c.restore();
}
