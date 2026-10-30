// ---- Takt sehen (owner, 30.10.2026: „dass man als Spieler Tempo und Takt sieht, wenn man die Option einschaltet – der
// Bildschirm pulsiert dezent im Takt, Myzel-Stil; der erste Taktanschlag hat eine eigene Farbe, färbt den Bildschirm
// leicht, die anderen Anschläge farblich neutral und dezenter … und unten links dreht sich ein Kreis um den eingestellten
// Takt, eine Umrundung ist die eingestellte Taktlänge“) hx.taktbild: on every beat a glow from the screen's edges, in the
// heard time (the beat the ear hears, not the one scheduled): the one in Sporen-Orange – as the Taktlinie colours the
// bars' ones – the others in the Hyphen-white, fainter; a soft rise (25 ms) and a fall within the beat. Around the
// Länge button a ring fills once per new loop's length (fest: its bars; otherwise loop 1's, or one bar), ticks at its
// bar lines. Only while a Takt runs; drawn over everything, never in the way (pointer-events: none). ----
const HXTB = { el: null, a: null, z: null, ring: null, arc: null, dot: null, ticks: null, tk: '', shown: false };
function hxTbBuild() {
  if (HXTB.el) return;
  HXTB.el = h('div', { class: 'hx-tb', 'aria-hidden': 'true' }, (HXTB.a = h('i', { class: 'eins' })), (HXTB.z = h('i', { class: 'zz' })));
  document.body.append(HXTB.el);
  const b = HXU.len; if (!b) return;
  const NS = 'http://www.w3.org/2000/svg', el = (n, a) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); return e; };
  HXTB.ring = el('svg', { class: 'hx-tbr', viewBox: '0 0 100 100', 'aria-hidden': 'true' });
  HXTB.ring.append(el('circle', { class: 'trk', cx: 50, cy: 50, r: 45 }), (HXTB.ticks = el('g', {})), (HXTB.arc = el('circle', { class: 'arc', cx: 50, cy: 50, r: 45, pathLength: 1, transform: 'rotate(-90 50 50)' })), (HXTB.dot = el('circle', { class: 'dot', cx: 50, cy: 5, r: 3.6 })));
  b.prepend(HXTB.ring);
}
// beats a round of the ring: the set length (fest), else loop 1's (a Takt loop), else one bar
function hxTbBeats() {
  if (P['hx.laenge'] === 'fest') return 4 * Math.max(1, P['hx.festT']);
  const L = hxLoopsLive().filter((X) => hxTakt(X)).sort((a, b) => a.slot - b.slot)[0];
  return L && L.d.beats > 0 ? L.d.beats : 4;
}
function hxTbFrame() {
  const on = !!P['hx.taktbild'] && !!A.ctx && A.ctx.state === 'running' && hxGrid();
  if (!on) { if (HXTB.shown) { HXTB.shown = false; HXTB.el.hidden = true; if (HXTB.ring) HXTB.ring.classList.remove('an'); } return; }
  hxTbBuild();
  if (!HXTB.shown) { HXTB.shown = true; HXTB.el.hidden = false; if (HXTB.ring) HXTB.ring.classList.add('an'); }
  const b = tgBeat(heardT()), k = Math.floor(b + 1e-6), sb = 60 / Math.max(20, tgBpm(heardT()));
  const t = (b - k) * sb, tau = Math.min(0.24, 0.4 * sb), env = Math.min(1, t / 0.025) * Math.exp(-t / tau), one = ((k % 4) + 4) % 4 === 0;
  HXTB.a.style.opacity = one ? env.toFixed(3) : '0';
  HXTB.z.style.opacity = one ? '0' : env.toFixed(3);
  if (!HXTB.ring) return;
  const n = hxTbBeats(), bars = Math.max(1, Math.round(n / 4)), p = (((b % n) + n) % n) / n;
  if (HXTB.tk !== String(bars)) {   // a tick at each bar line of the round (up to 16)
    HXTB.tk = String(bars); HXTB.ticks.replaceChildren();
    if (bars > 1 && bars <= 16) for (let i = 0; i < bars; i++) { const a = (i / bars) * 2 * Math.PI, l = document.createElementNS('http://www.w3.org/2000/svg', 'line'); l.setAttribute('x1', 50 + 41 * Math.sin(a)); l.setAttribute('y1', 50 - 41 * Math.cos(a)); l.setAttribute('x2', 50 + 49 * Math.sin(a)); l.setAttribute('y2', 50 - 49 * Math.cos(a)); HXTB.ticks.append(l); }
  }
  HXTB.arc.style.strokeDasharray = p.toFixed(4) + ' 1';
  const a = p * 2 * Math.PI; HXTB.dot.setAttribute('cx', (50 + 45 * Math.sin(a)).toFixed(2)); HXTB.dot.setAttribute('cy', (50 - 45 * Math.cos(a)).toFixed(2));
  HXTB.ring.style.setProperty('--tbp', one ? env.toFixed(3) : (0.45 * env).toFixed(3));   // (the ring breathes with the beat too)
}
