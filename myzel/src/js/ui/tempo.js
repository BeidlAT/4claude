/* ---------- (owner, 27.10.2026: „eine zentrale BPM-Anzeige, dort auch änderbar – professionell, nach Branchenstandard,
   mit dem gewissen Myzel-Extra“) the Taktgeber in the bar: the tempo as it runs (the Puls, a Schleife that gives it, an
   outside MIDI clock), one decimal; a ring that pulses with the beat – the One in lumen, the others in spore – and
   says where the bar stands. As a DAW's transport field: drag up/down (Shift: tenths), the wheel, the arrow keys (Shift:
   tenths, Bild ↑↓: ten), a double click or Enter to type it, TAP to tap it; a click opens the rest – −/+, ½× and 2×,
   „Tempo halten“. From an outside clock it only shows. ---------- */
const TMP = { el: null, num: null, src: null, cv: null, pop: null, drag: null, shown: '', srcShown: '', beat: -1, inp: null };
const tempoNow = () => (SEQ.ext ? SEQ.ext.bpm : A.ctx ? tgBpm(A.ctx.currentTime) : TG.hxOn ? TG.hx : P['seq.bpm']);
const tempoSrc = () => (SEQ.ext ? 'MIDI-Uhr' : TG.hxOn ? 'Schleife' : SEQ.on ? 'Puls' : hxGrid() ? 'Takt' : 'frei');
const tempoFmt = (v) => dec((Math.round(v * 10) / 10).toFixed(1));
// the tempo set by hand: the Taktgeber takes it (a Schleife that gave it lets go – as the slider does)
function tempoSet(v) {
  if (SEQ.ext) { toast('Das Tempo kommt von der MIDI-Uhr deines Geräts – dort änderst du es.', 3500); return; }
  const d = PD['seq.bpm'];
  v = clamp(Math.round(v * 10) / 10, d.min, d.max);
  if (P['seq.bpm'] === v && TG.hxOn && Math.abs(TG.hx - v) > 0.01) { P['seq.bpm'] = v; for (const fn of CTL['seq.bpm'] || []) fn(v, null); onParamChanged('seq.bpm'); clearTimeout(saveTimer); saveTimer = setTimeout(saveState, 400); }
  else setParam('seq.bpm', v);
  tempoDraw(true);
}
function tempoBuild() {
  const bar = $('#bar'); if (!bar || TMP.el) return;
  const cv = h('canvas', { class: 'tmp-ring', width: 64, height: 64, 'aria-hidden': 'true' });
  const num = h('span', { class: 'tmp-n' }, '–'), unit = h('span', { class: 'tmp-u' }, 'BPM'), src = h('span', { class: 'tmp-s' }, '');
  const val = h('div', { class: 'tmp-v', role: 'spinbutton', tabindex: '0', 'aria-label': 'Tempo in BPM', 'aria-valuemin': PD['seq.bpm'].min, 'aria-valuemax': PD['seq.bpm'].max,
    title: 'Tempo – ziehen oder Mausrad (Umschalt: Zehntel), Doppelklick zum Eintippen, Klick für mehr' }, h('span', { class: 'tmp-row' }, num, unit), src);
  const tap = h('button', { type: 'button', class: 'tmp-tap', title: 'Tempo eintippen: mindestens zweimal im Takt tippen', 'aria-label': 'Tempo eintippen' }, 'TAP');
  tap.addEventListener('pointerdown', (e) => { e.preventDefault(); tapTempo(); tap.classList.remove('hit'); void tap.offsetWidth; tap.classList.add('hit'); tempoDraw(true); });
  const el = h('div', { class: 'tmp', id: 'tempo' }, cv, val, tap);
  Object.assign(TMP, { el, num, src, cv, val });
  bar.insertBefore(el, $('#btnPuls'));
  // drag: 1 BPM per 4 px (Shift: a tenth); a click without a move opens the panel
  val.addEventListener('pointerdown', (e) => {
    if (e.button > 0 || TMP.inp) return;
    TMP.drag = { y: e.clientY, v: tempoNow(), moved: false, id: e.pointerId };
    try { val.setPointerCapture(e.pointerId); } catch (x) {}
  });
  val.addEventListener('pointermove', (e) => {
    const D = TMP.drag; if (!D || D.id !== e.pointerId) return;
    const dy = D.y - e.clientY; if (!D.moved && Math.abs(dy) < 3) return;
    D.moved = true; val.classList.add('drag');
    tempoSet(D.v + (e.shiftKey ? dy * 0.025 : Math.round(dy / 4)));
  });
  const end = (e) => { const D = TMP.drag; if (!D || D.id !== e.pointerId) return; TMP.drag = null; val.classList.remove('drag'); if (!D.moved && e.type === 'pointerup') tempoPop(); };
  val.addEventListener('pointerup', end); val.addEventListener('pointercancel', end);
  val.addEventListener('dblclick', (e) => { e.preventDefault(); tempoPopClose(); tempoEdit(); });
  val.addEventListener('wheel', (e) => { e.preventDefault(); const s = Math.sign(-e.deltaY || e.deltaX); if (s) tempoSet(tempoNow() + s * (e.shiftKey ? 0.1 : 1)); }, { passive: false });
  val.addEventListener('keydown', (e) => {
    const st = e.shiftKey ? 0.1 : 1;
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') tempoSet(tempoNow() + st);
    else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') tempoSet(tempoNow() - st);
    else if (e.key === 'PageUp') tempoSet(tempoNow() + 10);
    else if (e.key === 'PageDown') tempoSet(tempoNow() - 10);
    else if (e.key === 'Enter') tempoEdit();
    else return;
    e.preventDefault(); e.stopPropagation();
  });
  tempoDraw(true);
}
// typed: the number in place, Enter takes it, Escape leaves it
function tempoEdit() {
  if (TMP.inp) return;
  if (SEQ.ext) { tempoSet(0); return; }   // (it says where the tempo comes from)
  const inp = h('input', { type: 'text', inputmode: 'decimal', class: 'tmp-in', value: tempoFmt(tempoNow()), 'aria-label': 'Tempo eintippen' });
  TMP.inp = inp; TMP.val.classList.add('edit'); TMP.val.append(inp); inp.focus(); inp.select();
  const done = (ok) => { if (!TMP.inp) return; const v = parseFloat(inp.value.replace(',', '.')); TMP.inp = null; inp.remove(); TMP.val.classList.remove('edit'); if (ok && Number.isFinite(v)) tempoSet(v); TMP.val.focus(); };
  inp.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') done(true); else if (e.key === 'Escape') done(false); });
  inp.addEventListener('blur', () => done(true));
}
// the panel under it: −/+, ½× and 2×, „Tempo halten“, where the tempo comes from
function tempoPop() {
  if (TMP.pop) { tempoPopClose(); return; }
  const b = (t, fn, tip) => h('button', { type: 'button', class: 'btn ghost', title: tip || '', onclick: () => { fn(); tempoPopSync(); } }, t);
  const keep = h('button', { type: 'button', class: 'chip', role: 'switch', onclick: () => { TG.keep = !TG.keep; if (TG.keep && !TG.hxOn && !SEQ.ext) { TG.hx = tempoNow(); } tempoPopSync(); } }, 'Tempo halten');
  const info = h('p', { class: 'note tmp-info' });
  const pop = h('div', { class: 'tmp-pop', role: 'dialog', 'aria-label': 'Tempo' },
    h('div', { class: 'row' }, b('− 1', () => tempoSet(tempoNow() - 1), 'Ein BPM langsamer'), b('− 0,1', () => tempoSet(tempoNow() - 0.1)), b('+ 0,1', () => tempoSet(tempoNow() + 0.1)), b('+ 1', () => tempoSet(tempoNow() + 1), 'Ein BPM schneller')),
    h('div', { class: 'row' }, b('½ ×', () => tempoSet(tempoNow() / 2), 'Halbes Tempo'), b('2 ×', () => tempoSet(tempoNow() * 2), 'Doppeltes Tempo'), b('Eintippen', () => { tempoPopClose(); tempoEdit(); }), keep),
    info);
  TMP.pop = Object.assign(pop, { keep, info });
  document.body.append(pop);
  const r = TMP.el.getBoundingClientRect(); pop.style.left = Math.max(8, Math.min(innerWidth - 330, r.left)) + 'px'; pop.style.top = (r.bottom + 6) + 'px';
  tempoPopSync();
  setTimeout(() => document.addEventListener('pointerdown', tempoPopOut, true), 0);
}
function tempoPopSync() {
  const p = TMP.pop; if (!p) return;
  p.keep.setAttribute('aria-checked', String(!!TG.keep)); p.keep.classList.toggle('on', !!TG.keep);
  const s = tempoSrc();
  p.info.textContent = s === 'MIDI-Uhr' ? 'Das Tempo kommt von der MIDI-Uhr deines Geräts.' : s === 'Schleife' ? 'Eine Schleife gibt das Tempo – stellst du es hier, folgen die Schleifen dem neuen Tempo.' : s === 'Puls' ? 'Der Puls läuft in diesem Tempo.' : 'Puls und Schleifen beginnen in diesem Tempo.';
}
function tempoPopOut(e) { if (TMP.pop && !TMP.pop.contains(e.target) && !TMP.el.contains(e.target)) tempoPopClose(); }
function tempoPopClose() { if (!TMP.pop) return; TMP.pop.remove(); TMP.pop = null; document.removeEventListener('pointerdown', tempoPopOut, true); }
// every frame: the number when it changes, the ring with the beat
function tempoDraw(force) {
  if (!TMP.el) return;
  const v = tempoNow(), t = tempoFmt(v), s = tempoSrc();
  if (force || t !== TMP.shown) { TMP.shown = t; TMP.num.textContent = t; TMP.val.setAttribute('aria-valuenow', String(Math.round(v * 10) / 10)); TMP.val.setAttribute('aria-valuetext', t + ' BPM, ' + s); }
  if (force || s !== TMP.srcShown) { TMP.srcShown = s; TMP.src.textContent = s; TMP.el.dataset.src = s; if (TMP.pop) tempoPopSync(); }
  const c = TMP.cv.getContext('2d'), W = 64, run = !!A.ctx && (SEQ.on || hxGrid() || !!SEQ.ext);
  const b = run ? tgBeat(heardT()) : 0, bpb = 4, k = Math.floor(((b % bpb) + bpb) % bpb), f = b - Math.floor(b);
  if (!force && !run && TMP.beat === -2) return;
  TMP.beat = run ? k : -2;
  c.clearRect(0, 0, W, W);
  const cx = 32, cy = 32, R = 24, gap = 0.22, pu = run && !REDUCED ? Math.exp(-6 * f) : 0;
  for (let i = 0; i < bpb; i++) {
    const a0 = -Math.PI / 2 + i * 2 * Math.PI / bpb + gap / 2, a1 = a0 + 2 * Math.PI / bpb - gap, on = run && i === k;
    c.beginPath(); c.arc(cx, cy, R, a0, a1);
    c.lineWidth = on ? 6 + 2 * pu : 4; c.lineCap = 'round';
    c.strokeStyle = on ? (i === 0 ? 'rgba(134,240,208,' + (0.75 + 0.25 * pu) + ')' : 'rgba(255,179,92,' + (0.7 + 0.3 * pu) + ')') : 'rgba(168,152,138,' + (run ? 0.35 : 0.22) + ')';
    c.stroke();
  }
  // the spore in the middle: it swells on every beat (the One more), dim when nothing runs
  const sp = 5 + (run ? 4 * pu * (k === 0 ? 1.4 : 1) : 0);
  c.beginPath(); c.arc(cx, cy, sp, 0, 2 * Math.PI);
  c.fillStyle = run ? (k === 0 ? 'rgba(134,240,208,' + (0.5 + 0.5 * pu) + ')' : 'rgba(255,179,92,' + (0.45 + 0.55 * pu) + ')') : 'rgba(168,152,138,0.35)';
  c.fill();
}
