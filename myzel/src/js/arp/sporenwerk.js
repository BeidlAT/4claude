/* =====================================================================
   Sporenwerk – the arpeggiator (owner, 29.10.2026: „bau einen ausgefuchsten Arpeggiator, ganz im Myzel-Style, sehr
   speziell und ungewöhnlich … eine richtige Trickkiste“)
   ===================================================================== */
// A MIDI effect between what is played and the sound: while it is on, the notes held (the field, a keyboard, a MIDI
// controller – and/or a Schleife's notes, arp.quelle) do not sound themselves; the Sporenwerk plays them one after
// another on the beat grid (the Taktgeber's – the Puls's tempo, or a loop's), each step through every layer of the
// note (Klang and Ebene 2) as the field would, and what it plays reaches the Humus as played (it can be harvested).
//   Wuchsform (arp.form): the order – auf, ab, pendel, wie gespielt, Zufall, and the Myzel's own: Hyphe (a walk to a
//   neighbour, now and then branching into two), Spirale (outside in: lowest, highest, second lowest …), Sporenflug
//   (climbing octave by octave, thinning out the higher it gets), Pilzring (the whole chord as a quick strum, its lead
//   turning round), Wachsen (1, 1 2, 1 2 3 … – the pattern grows a note each round)
//   Raster: 1/4 … 1/32, straight, triplets or dotted; Swing; Länge (gate, over 1 legato)
//   Pilzring of steps (arp.schritte/treffer/dreh): a Euclidean ring – where it rests, the step is silent
//   Chance, Ratschen (a step struck 2–4 times inside itself, falling away – spores raining), Akzent (every Nth step),
//   Höhe-Welle (the sound's Höhe swells over the steps), Stimmen (scale tones added to each step: third, fifth, triad,
//   octave), Leiter-Wanderung (each round the whole pattern a few steps up or down the scale, back after arp.wlang
//   rounds), Mutation (the pattern grows: now and then two places swap, the ring turns, a step drops out – slowly, so
//   it stays recognisable), Halten (the chord stands until a new one comes from an empty hand)
const ARP = { still: null, tm: 0, next: 0, k: 0, round: 0, last: -1, dir: 1, i: -1, ev: [], perm: null, permN: 0, latch: [], held: [], rot: 0, drop: new Set(), hy: -1, grow: 1, gi: 0, seq: 0 };
const ARP_FORMS = ARP_FORMS_P;
const ARP_FORM_I = {
  auf: 'Von unten nach oben, Oktave für Oktave', ab: 'Von oben nach unten', pendel: 'Hinauf und wieder hinab, ohne die Enden doppelt',
  gespielt: 'In der Reihenfolge, in der du die Töne gegriffen hast', zufall: 'Jeder Schritt ein anderer Ton, nie zweimal derselbe hintereinander',
  hyphe: 'Ein Pilzfaden: Schritt für Schritt zum Nachbarton, mal hinauf, mal hinab – und manchmal verzweigt er sich in zwei Töne',
  spirale: 'Von außen nach innen: der tiefste, der höchste, der zweittiefste, der zweithöchste …', sporen: 'Sporen steigen auf: Oktave um Oktave nach oben – je höher, desto seltener',
  pilzring: 'Der ganze Akkord als schneller Anschlag, rundherum: jedes Mal führt ein anderer Ton', wachsen: 'Das Muster wächst: 1 · 1 2 · 1 2 3 … und beginnt dann von vorn',
};
// the step's length in beats (a quarter is a beat)
const arpStepB = () => +P['arp.rate'] * (P['arp.takt'] === 't' ? 2 / 3 : P['arp.takt'] === 'p' ? 1.5 : 1);
// the Euclidean ring: does step k sound?
function arpRing(k) {
  const n = Math.max(1, Math.round(P['arp.schritte'])), h = clamp(Math.round(P['arp.treffer']), 0, n), r = Math.round(P['arp.dreh']) + ARP.rot, i = (((k - r) % n) + n) % n;
  if (ARP.drop.has(i)) return false;
  return h >= n || Math.floor((i * h) / n) !== Math.floor(((i - 1) * h) / n);   // (Bresenham: h hits spread as evenly as n steps allow)
}
// a note of the pool: its pitch, its place in the scale, the layers it plays and how it was struck
function arpNote(tt) { return { f: tt.f, idx: tt.col, layers: tt.layers, x: tt.x, y: tt.my != null ? tt.my : tt.y, vel: tt.vel != null ? tt.vel : P['v.vel'], seq: tt.arpSeq || 0, key: 'tt' + tt.id }; }
// the notes it plays from now: what is held (and latched), the Schleife's (arp/schleifen.js), or both
function arpPool(t) {
  let out = [];
  if (P['arp.quelle'] !== 'schleife') {
    const live = [...touches.values()].filter((tt) => tt.arp).map(arpNote);
    if (P['arp.halten'] && live.length) ARP.latch = live.map((n) => Object.assign({}, n));
    out = live.length ? live : P['arp.halten'] ? ARP.latch : [];
  }
  if (P['arp.quelle'] !== 'spiel' && typeof arpLoopPool === 'function') out = out.concat(arpLoopPool(t));
  const seen = new Set(); out = out.filter((n) => { const k = Math.round(1200 * Math.log2(n.f)); if (seen.has(k)) return false; seen.add(k); return true; });
  return out;
}
// a scale step away from a note (semitones in the free scale), its own tuning kept
function arpDeg(n, d) {
  if (!d) return n.f;
  if (N.free) return n.f * Math.pow(2, d / 12);
  return n.f * degNote(n.idx + d).f / degNote(n.idx).f;
}
// the order of a step: which of the ladder (notes × octaves) – and sometimes two (Hyphe's branch)
function arpPick(lad, sorted) {
  const n = lad.length, form = P['arp.form'], R = Math.random;
  if (!n) return [];
  if (n === 1) return [0];
  const step = (i) => ((i % n) + n) % n;
  switch (form) {
    case 'ab': ARP.i = step(ARP.i - 1); return [ARP.i];
    case 'pendel': { if (ARP.i + ARP.dir >= n || ARP.i + ARP.dir < 0) ARP.dir = -ARP.dir; ARP.i = clamp(ARP.i + ARP.dir, 0, n - 1); return [ARP.i]; }
    case 'zufall': { let i; do i = Math.floor(R() * n); while (i === ARP.i); ARP.i = i; return [i]; }
    case 'hyphe': {
      if (ARP.hy < 0 || ARP.hy >= n) ARP.hy = Math.floor(R() * n);
      const d = R() < 0.5 ? -1 : 1, nx = ARP.hy + d >= n || ARP.hy + d < 0 ? ARP.hy - d : ARP.hy + d;
      const br = R() < 0.18 + 0.3 * P['arp.mutation'] ? [step(ARP.hy - d)] : [];   // (it branches: the other neighbour too)
      ARP.hy = nx; return [nx].concat(br.filter((x) => x !== nx));
    }
    case 'spirale': { ARP.i = (ARP.i + 1) % n; const j = ARP.i, lo = j >> 1; return [j % 2 ? n - 1 - lo : lo]; }
    case 'sporen': {
      // up the ladder, skipping more the higher it is; at the top it falls back to the ground
      let i = ARP.i + 1; while (i < n && R() < 0.75 * (i / n) * (0.4 + 0.6 * P['arp.mutation'] + 0.3)) i++;
      if (i >= n) i = 0; ARP.i = i; return [i];
    }
    case 'pilzring': { ARP.i = step(ARP.i + 1); const out = []; for (let k = 0; k < Math.min(n, 6); k++) out.push(step(ARP.i + k)); return out; }
    case 'wachsen': {
      if (ARP.gi >= ARP.grow) { ARP.gi = 0; ARP.grow = ARP.grow >= n ? 1 : ARP.grow + 1; }
      return [step(ARP.gi++)];
    }
    case 'gespielt': default: ARP.i = step(ARP.i + 1); return [ARP.i];
  }
}
// the ladder: the pool through its octaves (arp.okt, how arp.oktw goes), in the order the form reads it
function arpLadder(pool) {
  const byF = pool.slice().sort((a, b) => a.f - b.f), base = P['arp.form'] === 'gespielt' ? pool.slice().sort((a, b) => a.seq - b.seq) : byF;
  const oct = Math.max(1, Math.round(P['arp.okt'])), w = P['arp.oktw'], lad = [];
  const os = w === 'ab' ? Array.from({ length: oct }, (_, o) => -o) : Array.from({ length: oct }, (_, o) => o);
  for (const o of os) for (const n of base) lad.push({ n, o });
  if (w === 'ab') lad.sort((a, b) => b.n.f * Math.pow(2, b.o) - a.n.f * Math.pow(2, a.o));
  if (w === 'pendel' && lad.length > 2) { const back = lad.slice(1, -1).reverse(); lad.push(...back); }
  if (w === 'zufall') for (const L of lad) L.o = Math.floor(Math.random() * oct);
  // Mutation: the order as it grew – a kept permutation, now and then two places swapped
  if (P['arp.mutation'] > 0 && P['arp.form'] !== 'zufall') {
    if (!ARP.perm || ARP.permN !== lad.length) { ARP.perm = lad.map((_, i) => i); ARP.permN = lad.length; }
    return ARP.perm.map((i) => lad[i]).filter(Boolean);
  }
  return lad;
}
// once a round: the Mutation's slow growth
function arpMutate() {
  const m = P['arp.mutation'], R = Math.random;
  if (!(m > 0)) { ARP.rot = 0; ARP.drop.clear(); ARP.perm = null; return; }
  if (ARP.perm && ARP.perm.length > 1 && R() < 0.6 * m) { const a = Math.floor(R() * ARP.perm.length), b = (a + 1 + Math.floor(R() * (ARP.perm.length - 1))) % ARP.perm.length; [ARP.perm[a], ARP.perm[b]] = [ARP.perm[b], ARP.perm[a]]; }
  if (R() < 0.35 * m) ARP.rot = (ARP.rot + (R() < 0.5 ? 1 : -1)) | 0;
  const n = Math.max(1, Math.round(P['arp.schritte']));
  if (R() < 0.4 * m) { const i = Math.floor(R() * n); if (ARP.drop.has(i)) ARP.drop.delete(i); else if (ARP.drop.size < n / 3) ARP.drop.add(i); }
}
// the scale tones a step adds
const ARP_ST = { 0: [], terz: [2], quinte: [4], akkord: [2, 4], oktave: [7] };
function arpTick() {
  if (!A.ctx || !A.started || !P['arp.on']) { arpStop(); return; }
  if (typeof arpLoopQuiet === 'function') arpLoopQuiet();
  const now = A.ctx.currentTime, sb = arpStepB(), ahead = 0.12;
  const pool = arpPool(now);
  if (!pool.length) { ARP.next = 0; ARP.i = -1; ARP.hy = -1; ARP.grow = 1; ARP.gi = 0; return; }
  // the next grid step after now (a first note waits for no bar: the next step of the grid)
  if (!ARP.next || ARP.next < now - 0.05) { const b = tgBeat(now + 0.008); ARP.k = Math.ceil(b / sb - 1e-6); ARP.next = tgTime(ARP.k * sb); }
  const lad = arpLadder(pool), n = Math.max(1, Math.round(P['arp.schritte'])), wl = Math.max(1, Math.round(P['arp.wlang']));
  while (ARP.next < now + ahead) {
    const k = ARP.k, t0 = ARP.next, tn = tgTime((k + 1) * sb), dur = tn - t0;
    const sw = k % 2 ? P['arp.swing'] * 0.5 * dur : 0, t = t0 + sw;
    if (k % n === 0 && k !== ARP.last) { ARP.round++; arpMutate(); }
    ARP.last = k;
    const on = arpRing(k) && Math.random() < P['arp.chance'] + 1e-9;
    if (on) {
      const pick = arpPick(lad), shift = Math.round(P['arp.wander']) * (ARP.round % wl);   // (Leiter-Wanderung: a step further each round, home after wl)
      const acc = P['arp.akzent'] > 0 && k % Math.max(2, Math.round(P['arp.akzN'])) === 0, gate = Math.max(0.02, dur * P['arp.gate']);
      const wave = P['arp.welle'] > 0 ? 0.5 * P['arp.welle'] * Math.sin(2 * Math.PI * k / Math.max(4, 2 * n)) : 0;
      const rat = P['arp.ratsche'] > 0 && Math.random() < P['arp.ratsche'] ? 2 + Math.floor(Math.random() * 3) : 1;
      const strum = P['arp.form'] === 'pilzring' ? Math.min(0.03, dur / 8) : 0;
      pick.forEach((li, j) => {
        const L = lad[li]; if (!L) return;
        const nt = L.n, degs = [0].concat(ARP_ST[P['arp.stimmen']] || []);
        for (const d of degs) {
          const f = arpDeg(nt, shift + d) * Math.pow(2, L.o), vel = clamp(nt.vel * (acc ? 1 + 0.6 * P['arp.akzent'] : 1 - 0.25 * P['arp.akzent']) * (d ? 0.7 : 1), 0.05, 1), y = clamp(nt.y + wave, 0, 1);
          for (let r = 0; r < rat; r++) {
            const tr = t + j * strum + r * dur / rat, g = rat > 1 ? Math.min(gate, dur / rat * 0.8) : gate, vr = vel * Math.pow(0.72, r);
            for (const ly of nt.layers) hit(ly.eng, tr, lyF(ly, f, nt.idx), y, vr * ly.lvl, { pan: touchPan(nt.x), bus: ly.bus, gate: g });
          }
          ARP.ev.push({ t, f, nf: nt.f, o: L.o, li, vel, rat, acc, d, k, n: lad.length, dur });
        }
      });
    } else ARP.ev.push({ t, rest: true, k, n: lad.length, dur });
    if (ARP.ev.length > 64) ARP.ev.splice(0, ARP.ev.length - 64);
    ARP.k++; ARP.next = tgTime(ARP.k * sb);
  }
}
function arpStart() { if (!ARP.tm) { ARP.tm = setInterval(arpTick, 25); arpTick(); } }
function arpStop() { if (ARP.tm) { clearInterval(ARP.tm); ARP.tm = 0; } ARP.next = 0; if (typeof arpLoopQuiet === 'function' && ARP.still) arpLoopQuiet(); }
// on or off: the notes that are held now go over to the other side (they start or stop sounding themselves)
function arpOn(on) {
  if (on) arpStart(); else { arpStop(); ARP.latch = []; }
  for (const tt of touches.values()) {
    if (on && !tt.arp) { tt.arp = true; for (const { v } of tt.voices) if (v.alive && v.release) v.release(); tt.voices = []; }
    else if (!on && tt.arp) tt.arp = false;
  }
}
// a new note held while the Sporenwerk runs: it joins the pool instead of sounding; from an empty hand the latched
// chord gives way to the new one
function arpTake(tt) {
  if (!P['arp.on'] || P['arp.quelle'] === 'schleife') return false;
  if (![...touches.values()].some((x) => x.arp)) ARP.latch = [];
  tt.arp = true; tt.arpSeq = ++ARP.seq;
  arpStart();
  return true;
}
