// Sphärenwerk – der Zustand der Maschine: eingesetzte Organe, Kabel, Tonleiter, Tempo und Pad.
// Alles hier ist speicherbar (Rituale, Rückgängig, Autospeicher). Klangmaschine und Oberfläche hören auf die Ereignisse.
'use strict';

const CELL_W = 262, CELL_H = 342;   // Raster der Werkbank (Modul 248 × 328 plus Fuge)

// Kurzschreibweise für Rituale: Organe mit Name, Typ, Zelle und Reglern in echten Einheiten,
// Kabel als ['name.ausgang', 'name.eingang' | 'name.regler', tiefe]
function ritualState(r) {
  const st = {
    v: 1, name: r.name,
    skala: Object.assign({ root: 2, mode: 'dorisch', tuning: 'gleich', a4: 440 }, r.skala || {}),
    tempo: r.tempo || 84,
    pad: Object.assign({ from: 2, oct: 3, magnet: 0.7, rows: 1 }, r.pad || {}),
    mods: [], cables: [],
  };
  const byName = {};
  for (const m of r.mods) {
    const def = ORGANE[m.type];
    const vals = {};
    for (const p of def.params) vals[p.id] = Param.defNorm(p);
    for (const [k, v] of Object.entries(m.vals || {})) { const p = def.pmap.get(k); if (p) vals[k] = Param.toNorm(p, v); }
    const mod = { id: uid('m'), type: m.type, c: m.c, r: m.r, vals, ring: 1 };
    byName[m.name || m.type] = mod;
    st.mods.push(mod);
  }
  for (const c of r.cables || []) {
    const [sn, sp] = c[0].split('.'), [dn, dp] = c[1].split('.');
    const s = byName[sn], d = byName[dn];
    if (!s || !d) continue;
    const out = ORGANE[s.type].outs.find((j) => j.id === sp);
    if (!out) continue;
    const cab = { id: uid('k'), kind: out.kind, from: { m: s.id, p: sp }, to: { m: d.id, p: dp } };
    if (out.kind === 'mod') cab.depth = c[2] == null ? 0.3 : c[2];
    st.cables.push(cab);
  }
  if (r.after) r.after(st, byName);
  return st;
}

const FIRST_RITUAL = {
  id: 'erste', name: 'Erste Beschwörung',
  text: 'Die Grundausstattung: Chor, Schlagwerk und Atem laufen durch Bandschleife und Kathedrale.',
  skala: { root: 2, mode: 'dorisch' }, tempo: 84,
  mods: [
    { type: 'stimmen', c: 0, r: 0 }, { type: 'planeten', c: 1, r: 0 }, { type: 'gezeiten', c: 2, r: 0 },
    { type: 'bandschleife', c: 3, r: 0 }, { type: 'kathedrale', c: 4, r: 0 },
    { type: 'schlagwerk', c: 0, r: 1 }, { type: 'uhrwerk', c: 1, r: 1 }, { type: 'atem', c: 2, r: 1 },
    { type: 'resonator', c: 3, r: 1 }, { type: 'altar', c: 4, r: 1 },
  ],
  cables: [
    ['stimmen.out', 'bandschleife.in'], ['schlagwerk.out', 'bandschleife.in'], ['atem.out', 'resonator.in'],
    ['resonator.out', 'kathedrale.in'], ['bandschleife.out', 'kathedrale.in'], ['kathedrale.out', 'altar.in'],
    ['gezeiten.I', 'stimmen.filter', 0.22], ['gezeiten.II', 'kathedrale.schimmer', 0.25],
    ['planeten.noten', 'stimmen.noten'], ['uhrwerk.I', 'schlagwerk.schlag'], ['uhrwerk.II', 'schlagwerk.schlag'], ['uhrwerk.III', 'schlagwerk.schlag'],
  ],
};

const Machine = {
  st: null,
  hist: [], fut: [],
  subs: new Set(),
  on(fn) { this.subs.add(fn); },
  emit(ev) { for (const fn of this.subs) { try { fn(ev); } catch (e) { console.error(e); } } this.save(); },

  fresh() { return ritualState(FIRST_RITUAL); },
  init() {
    const saved = store.json('sw.machine.v1', null);
    this.isFresh = !this.valid(saved);
    this.st = this.isFresh ? this.fresh() : saved;
  },
  valid(st) {
    try {
      if (!st || st.v !== 1 || !Array.isArray(st.mods) || !Array.isArray(st.cables)) return false;
      if (!st.mods.some((m) => m.type === 'altar')) return false;
      for (const m of st.mods) {
        const def = ORGANE[m.type];
        if (!def || !m.id || typeof m.c !== 'number' || typeof m.r !== 'number') return false;
        m.vals = m.vals || {};
        for (const p of def.params) if (typeof m.vals[p.id] !== 'number' || !Number.isFinite(m.vals[p.id])) m.vals[p.id] = Param.defNorm(p);
        m.ring = m.ring || 1;
      }
      const ids = new Set(st.mods.map((m) => m.id));
      st.cables = st.cables.filter((c) => c && c.from && c.to && ids.has(c.from.m) && ids.has(c.to.m) && this.portOk(c, st));
      st.skala = Object.assign({ root: 2, mode: 'dorisch', tuning: 'gleich', a4: 440 }, st.skala || {});
      st.pad = Object.assign({ from: 2, oct: 3, magnet: 0.7, rows: 1 }, st.pad || {});
      st.tempo = clamp(+st.tempo || 84, 30, 240);
      return true;
    } catch (e) { return false; }
  },
  portOk(c, st) {
    const s = (st || this.st).mods.find((m) => m.id === c.from.m), d = (st || this.st).mods.find((m) => m.id === c.to.m);
    if (!s || !d) return false;
    const out = ORGANE[s.type].outs.find((j) => j.id === c.from.p);
    if (!out || out.kind !== c.kind) return false;
    if (c.kind === 'mod') { const p = ORGANE[d.type].pmap.get(c.to.p); return !!(p && p.mod); }
    const inp = ORGANE[d.type].ins.find((j) => j.id === c.to.p);
    return !!(inp && inp.kind === c.kind);
  },
  save: debounce(function () { store.setJson('sw.machine.v1', Machine.st); }, 700),

  /* --- Rückgängig --- */
  // mehrere Änderungen als ein Schritt (Orakel, Rituale)
  batch(fn) {
    this.checkpoint();
    this.batching = true;
    try { return fn(); } finally { this.batching = false; }
  },
  checkpoint() {
    if (this.batching) return;
    this.hist.push(JSON.stringify(this.st));
    if (this.hist.length > 60) this.hist.shift();
    this.fut = [];
  },
  undo() {
    if (!this.hist.length) return false;
    this.fut.push(JSON.stringify(this.st));
    this.st = JSON.parse(this.hist.pop());
    this.emit({ k: 'all' });
    return true;
  },
  redo() {
    if (!this.fut.length) return false;
    this.hist.push(JSON.stringify(this.st));
    this.st = JSON.parse(this.fut.pop());
    this.emit({ k: 'all' });
    return true;
  },
  load(st, keepHistory) {
    if (!this.valid(st)) return false;
    if (keepHistory !== false) this.checkpoint();
    this.st = st;
    this.emit({ k: 'all' });
    return true;
  },

  /* --- Organe --- */
  mod(id) { return this.st.mods.find((m) => m.id === id); },
  at(c, r) { return this.st.mods.find((m) => m.c === c && m.r === r); },
  count(type) { return this.st.mods.filter((m) => m.type === type).length; },
  canAdd(type) { return this.count(type) < ORGANE[type].max && this.st.mods.length < 18; },
  add(type, c, r, vals) {
    if (!this.canAdd(type) || this.at(c, r)) return null;
    this.checkpoint();
    const def = ORGANE[type], v = {};
    for (const p of def.params) v[p.id] = vals && vals[p.id] != null ? vals[p.id] : Param.defNorm(p);
    const m = { id: uid('m'), type, c, r, vals: v, ring: 1 };
    this.st.mods.push(m);
    this.emit({ k: 'add', m });
    return m;
  },
  remove(id) {
    const m = this.mod(id);
    if (!m || ORGANE[m.type].fixed) return false;
    this.checkpoint();
    this.st.cables = this.st.cables.filter((c) => c.from.m !== id && c.to.m !== id);
    this.st.mods = this.st.mods.filter((x) => x !== m);
    this.emit({ k: 'del', id });
    this.emit({ k: 'cables' });
    return true;
  },
  move(id, c, r) {
    const m = this.mod(id);
    if (!m || (m.c === c && m.r === r)) return;
    this.checkpoint();
    const other = this.at(c, r);
    if (other) { other.c = m.c; other.r = m.r; }
    m.c = c; m.r = r;
    this.emit({ k: 'move', id, other: other && other.id });
  },
  // Lücken schließen und die Organe in so viele Spalten legen, wie auf den Schirm passen
  arrange(cols, quiet) {
    if (!quiet) this.checkpoint();
    const list = this.st.mods.slice().sort((a, b) => a.r - b.r || a.c - b.c);
    list.forEach((m, i) => { m.c = i % cols; m.r = Math.floor(i / cols); });
    if (!quiet) this.emit({ k: 'all' });
  },
  setParam(id, pid, v, quiet) {
    const m = this.mod(id);
    if (!m) return;
    const p = ORGANE[m.type].pmap.get(pid);
    if (!p) return;
    v = Param.snap(p, clamp(v, 0, 1));
    if (m.vals[pid] === v) return;
    m.vals[pid] = v;
    this.emit({ k: 'param', id, p: pid, v, quiet });
  },
  resetMod(id) {
    const m = this.mod(id);
    if (!m) return;
    this.checkpoint();
    for (const p of ORGANE[m.type].params) { m.vals[p.id] = Param.defNorm(p); this.emit({ k: 'param', id, p: p.id, v: m.vals[p.id] }); }
  },
  setRing(id, ring) { const m = this.mod(id); if (m) { m.ring = ring; this.emit({ k: 'ring', id }); } },

  /* --- Kabel --- */
  connect(from, to, kind, depth) {
    const c = { id: uid('k'), kind, from, to };
    if (kind === 'mod') c.depth = depth == null ? 0.3 : depth;
    if (!this.portOk(c)) return null;
    if (this.st.cables.some((x) => x.kind === kind && x.from.m === from.m && x.from.p === from.p && x.to.m === to.m && x.to.p === to.p)) return null;
    this.checkpoint();
    this.st.cables.push(c);
    this.emit({ k: 'cables', added: c.id });
    return c;
  },
  disconnect(id, noCheckpoint) {
    const c = this.st.cables.find((x) => x.id === id);
    if (!c) return;
    if (!noCheckpoint) this.checkpoint();
    this.st.cables = this.st.cables.filter((x) => x !== c);
    this.emit({ k: 'cables', removed: id });
  },
  setDepth(id, d) {
    const c = this.st.cables.find((x) => x.id === id);
    if (!c) return;
    c.depth = clamp(d, -1, 1);
    this.emit({ k: 'cables', depth: id });
  },
  cablesAt(mid, port, dir) {
    return this.st.cables.filter((c) => (dir === 'out' ? c.from.m === mid && c.from.p === port : c.to.m === mid && c.to.p === port));
  },

  /* --- Tonleiter, Tempo, Pad --- */
  setSkala(o) { this.checkpoint(); Object.assign(this.st.skala, o); this.emit({ k: 'skala' }); },
  setTempo(bpm) { this.st.tempo = clamp(Math.round(bpm * 10) / 10, 30, 240); this.emit({ k: 'tempo' }); },
  setPad(o) { Object.assign(this.st.pad, o); this.emit({ k: 'pad' }); },
};
