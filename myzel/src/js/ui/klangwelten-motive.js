/* ---------- Klangwelten: the worlds' motifs and colours ---------- */
// Each motif draws its world above the soil (kbDraw adds the soil, grain and vignette): (c, w, h, S, t, R) – S the
// preset read (colours a, b, sky; its scale, lanes, tempo, room), t seconds (moving only under the pointer), R a
// random source fixed per preset (the same picture every time). Beats come from the preset's own tempo.
const KB_ART = {
  leer: { m: 'leer', a: '#c9a27a', b: '#f0e6d8', sky: '#110d0a', hz: 0.7 },
  tiefsee: { m: 'tiefe', a: '#3fb3c9', b: '#2b6cff', sky: '#05222c', hz: 0.86 },
  tempel: { m: 'glocken', a: '#e8b45a', b: '#ff8a4c', sky: '#1f1308' },
  pilzregen: { m: 'regen', v: 'pilz', a: '#93d06c', b: '#ffb35c', sky: '#0f1a10' },
  kristall: { m: 'kristall', a: '#9fe8ff', b: '#d6cbff', sky: '#0a1620' },
  sporen: { m: 'sporen', a: '#c48cff', b: '#ff8fc8', sky: '#170c22' },
  ritual: { m: 'schalen', a: '#f2b84b', b: '#ff7a45', sky: '#1e1106' },
  maschine: { m: 'zahnrad', a: '#d98a4e', b: '#8fd3ff', sky: '#161210' },
  sonnenwind: { m: 'wind', v: 'sonne', a: '#ffbe45', b: '#ff7f50', sky: '#2c1606' },
  obertonhoehle: { m: 'oberton', a: '#e6c35a', b: '#c97a3a', sky: '#161007' },
  geisterchor: { m: 'chor', a: '#d6cbff', b: '#9fb7ff', sky: '#0f0e1f' },
  regenwald: { m: 'regen', v: 'wald', a: '#5fd08a', b: '#c9dc82', sky: '#08180e' },
  kalimbatraum: { m: 'kalimba', a: '#ffa45c', b: '#ffd27a', sky: '#1c110a' },
  kurzwelle: { m: 'radio', a: '#7dffb2', b: '#ffd166', sky: '#06150e' },
  zikadennacht: { m: 'nacht', a: '#e6df5a', b: '#5a7cff', sky: '#070b1e' },
  gongbad: { m: 'gong', a: '#d9a441', b: '#ff8a3d', sky: '#180d05' },
  glaswiese: { m: 'glas', a: '#86f0d0', b: '#c9f2ff', sky: '#08171b' },
  gespinstgarten: { m: 'netz', a: '#e8f0dc', b: '#93d06c', sky: '#0d130d' },
  kompostgarten: { m: 'kompost', a: '#d98a4e', b: '#b9a46e', sky: '#160d07' },
  atemrohr: { m: 'rohr', a: '#b8d46a', b: '#ff9f5a', sky: '#11150a' },
  hochspannung: { m: 'blitz', a: '#8fb8ff', b: '#d08cff', sky: '#080a1c' },
  wurzelnetz: { m: 'wurzel', a: '#e0a35e', b: '#ffd27a', sky: '#130c07', hz: 0.3, soil: false },
  vogelhain: { m: 'vogel', a: '#c9e26a', b: '#ffd166', sky: '#0c170d' },
  sporenfaehrte: { m: 'faehrte', a: '#ff9f6b', b: '#ffd166', sky: '#170d0c' },
  ganges: { m: 'fluss', a: '#ffb05c', b: '#ff6f91', sky: '#2c1022', hz: 0.62, soil: false },
  balinacht: { m: 'gamelan', a: '#e8b84a', b: '#6c7cff', sky: '#0a0a26' },
  traumzeit: { m: 'traumzeit', a: '#e0703a', b: '#ffcf7a', sky: '#200c06', hz: 0.74 },
  steppenwind: { m: 'steppe', a: '#e6cf8a', b: '#9fd0ff', sky: '#151c24', hz: 0.76 },
  kirschbluete: { m: 'kirsche', a: '#ffb3c8', b: '#fff0f4', sky: '#130c1a' },
  handpankreis: { m: 'handpan', a: '#9fc4e8', b: '#e8d3a0', sky: '#0b131a', soil: false },
  nordlichtfeld: { m: 'nordlicht', a: '#62f0a8', b: '#b58cff', sky: '#050e18' },
  schimmerdom: { m: 'dom', a: '#fff1c4', b: '#cfe8ff', sky: '#0f0e18' },
  aetherfunk: { m: 'aether', a: '#7af0d8', b: '#ffb35c', sky: '#071514' },
  tiefseegesang: { m: 'wal', a: '#5aa8ff', b: '#3fe0d0', sky: '#030c20', hz: 0.9 },
  endlosetreppe: { m: 'treppe', a: '#b58cff', b: '#ff8fd6', sky: '#100a20', soil: false },
  seltsamerattraktor: { m: 'attraktor', a: '#ff5fd2', b: '#5ff0ff', sky: '#0f0616', soil: false },
  tunnelblick: { m: 'tunnel', a: '#4fe0ff', b: '#c48cff', sky: '#05101c', soil: false },
  zeitlupe: { m: 'nordlicht', v: 'zeit', a: '#ffb3a0', b: '#c9a0ff', sky: '#150c16' },
  westkuestenbongos: { m: 'westkueste', a: '#ff8a3d', b: '#3fa9ff', sky: '#100d16' },
  kurzschluss: { m: 'glitch', a: '#ff4f5e', b: '#4ff0ff', sky: '#0d0a10', soil: false },
  kassettendeck: { m: 'kassette', a: '#f0c27a', b: '#e07a5f', sky: '#18110b' },
  achtbithimmel: { m: 'pixel', a: '#7fd8ff', b: '#ff7ac8', sky: '#0a0a2c', hz: 0.84 },
  mitternachtstrap: { m: 'trap', a: '#b06cff', b: '#ff4f8b', sky: '#0c0614' },
  silbenregen: { m: 'regen', v: 'silben', a: '#ff8fc8', b: '#7af0e0', sky: '#130b1a' },
  spieluhrtraum: { m: 'spieluhr', a: '#ffd1dc', b: '#bfe3ff', sky: '#16111c' },
  chillhopabend: { m: 'fenster', a: '#ffb35c', b: '#8fb8ff', sky: '#130e16' },
  pilzorakel: { m: 'orakel', a: '#ff5fa0', b: '#8cff8c', sky: '#13081a' },
  polarfunk: { m: 'nordlicht', v: 'polar', a: '#9feaff', b: '#c48cff', sky: '#060f1a' },
};
const KB_M = {};
const kbBeat = (S, t) => (t * S.bpm) / 60;

// Leere Erde: bare soil, one seed glowing, the faint ring of what may grow – under the pointer it sprouts
KB_M.leer = (c, w, h, S, t) => {
  const hz = S.hz * h, X = w / 2, b = 0.5 + 0.5 * Math.sin(t * 0.9), g = Math.max(0, Math.min(1, (t - KB_STILL) / 5));
  kbRing(c, X, hz, h * 0.42, S.b, 0.05, 0.8);
  kbRing(c, X, hz, h * 0.26, S.b, 0.07, 0.6);
  c.globalCompositeOperation = 'lighter';
  kbGlow(c, X, hz, h * (0.28 + 0.06 * b), S.a, 0.22);
  if (g > 0) {
    const top = hz - h * 0.3 * g, sway = Math.sin(t * 0.7) * 3 * g;
    c.strokeStyle = kbA('#cfe8a8', 0.85); c.lineWidth = 1.1; c.lineCap = 'round';
    c.beginPath(); c.moveTo(X, hz - 1); c.quadraticCurveTo(X - 3, (hz + top) / 2, X + sway, top); c.stroke();
    if (g > 0.35) { const k = (g - 0.35) / 0.65, L = h * 0.07 * k; c.fillStyle = kbA('#b8e08a', 0.85); for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(X + sway, top); c.quadraticCurveTo(X + sway + sd * L * 0.7, top - L * 0.9, X + sway + sd * L * 1.3, top - L * 0.2); c.quadraticCurveTo(X + sway + sd * L * 0.5, top + L * 0.2, X + sway, top); c.fill(); } }
  }
  kbGlow(c, X, hz - 1, 5, '#fff3dc', 0.85);
  kbDot(c, X, hz - 1, 1.6, '#fffaf0', 0.95);
};

// Tiefsee: light falling through water, rising bubbles, two far bowls breathing with the heartbeat
KB_M.tiefe = (c, w, h, S, t, R) => {
  c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 4; i++) {
    const x = w * (0.18 + 0.22 * i + 0.05 * Math.sin(t * 0.25 + i * 1.7)), sp = w * (0.05 + 0.03 * R());
    const g = c.createLinearGradient(0, 0, 0, h * 0.85); g.addColorStop(0, kbA(S.a, 0.16)); g.addColorStop(1, kbA(S.a, 0));
    c.fillStyle = g; c.beginPath(); c.moveTo(x - sp * 0.4, 0); c.lineTo(x + sp * 0.4, 0); c.lineTo(x + sp * 2.2 + w * 0.06, h * 0.85); c.lineTo(x - sp * 0.6 + w * 0.06, h * 0.85); c.fill();
  }
  const hb = kbHit(kbBeat(S, t) / 2);
  kbGlow(c, w * 0.32, h * 0.62, h * 0.18, S.b, 0.18 + 0.2 * hb);
  kbGlow(c, w * 0.7, h * 0.56, h * 0.13, S.a, 0.14 + 0.18 * hb);
  c.globalCompositeOperation = 'source-over';
  for (const [x, y, rx] of [[w * 0.32, h * 0.62, h * 0.11], [w * 0.7, h * 0.56, h * 0.08]]) { c.strokeStyle = kbA(S.a, 0.4); c.lineWidth = 0.8; c.beginPath(); c.ellipse(x, y, rx, rx * 0.32, 0, 0, KB_TAU); c.stroke(); }
  for (let i = 0; i < 16; i++) {
    const x0 = w * R(), sp = 6 + 10 * R(), ph = R(), y = h * 0.86 - (((t * sp) / h + ph) % 1) * h * 0.86, x = x0 + 3 * Math.sin(t * 1.5 + i);
    kbRing(c, x, y, 0.8 + 1.6 * R(), '#d8f6ff', 0.35 * (y / h), 0.6);
  }
};

// Tempelglocken: two bells, their rings wandering left and right (ping-pong)
KB_M.glocken = (c, w, h, S, t, R) => {
  const b = kbBeat(S, t) / 2, pts = [[w * 0.3, h * 0.36], [w * 0.7, h * 0.42]];
  c.globalCompositeOperation = 'lighter';
  pts.forEach(([x, y], j) => {
    for (let k = 0; k < 4; k++) { const f = (b + j * 0.5 + k / 4) % 1, r = h * (0.12 + 0.62 * f); kbRing(c, x, y + h * 0.12, r, j ? S.b : S.a, 0.32 * (1 - f) ** 1.6, 1); }
    kbGlow(c, x, y + h * 0.05, h * 0.28, S.a, 0.2 + 0.25 * kbHit(b + j * 0.5));
  });
  c.globalCompositeOperation = 'source-over';
  pts.forEach(([x, y], j) => {
    const s = h * (j ? 0.15 : 0.19), g = c.createLinearGradient(x - s, 0, x + s, 0);
    g.addColorStop(0, kbMix(S.a, '#3a2410', 0.55)); g.addColorStop(0.45, kbMix(S.a, '#fff3d6', 0.25)); g.addColorStop(1, kbMix(S.a, '#2a1808', 0.6));
    c.fillStyle = g; c.beginPath();
    c.moveTo(x - s * 0.16, y - s * 0.62); c.bezierCurveTo(x - s * 0.55, y - s * 0.55, x - s * 0.5, y + s * 0.2, x - s * 0.95, y + s * 0.62);
    c.lineTo(x + s * 0.95, y + s * 0.62); c.bezierCurveTo(x + s * 0.5, y + s * 0.2, x + s * 0.55, y - s * 0.55, x + s * 0.16, y - s * 0.62); c.closePath(); c.fill();
    c.strokeStyle = kbA('#fff1c8', 0.5); c.lineWidth = 0.7; c.beginPath(); c.moveTo(x - s * 0.9, y + s * 0.5); c.lineTo(x + s * 0.9, y + s * 0.5); c.stroke();
    c.strokeStyle = kbA(S.a, 0.5); c.beginPath(); c.moveTo(x, y - s * 0.62); c.lineTo(x, 0); c.stroke();
  });
};

// Silbenregen: syllables falling in the Puls's lanes, soft trails behind them, rings where they land
KB_M.regen = (c, w, h, S, t, R) => {
  const hz = S.hz * h, lanes = S.on.length ? S.on : [{ col: S.a, steps: 8, puls: 3, rot: 0, div: 0.5 }], b = kbBeat(S, t), sy = ['ta', 'ka', 'si', 'cho', 'mu', 're'];
  if (S.va === 'wald') {
    c.fillStyle = kbA(kbMix(S.a, '#04100a', 0.7), 0.95);
    for (const [x, y, a, s] of [[-0.04, 0.12, 0.5, 0.42], [1.02, 0.02, 2.5, 0.48], [0.94, 0.5, 2.9, 0.3], [0.02, 0.58, 0.1, 0.28]]) {
      c.save(); c.translate(w * x, h * y); c.rotate(a); const L = h * s * 1.6;
      c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(L * 0.5, -L * 0.32, L, 0); c.quadraticCurveTo(L * 0.5, L * 0.32, 0, 0); c.fill();
      c.strokeStyle = kbA(S.a, 0.25); c.lineWidth = 0.6; c.beginPath(); c.moveTo(0, 0); c.lineTo(L * 0.95, 0); c.stroke(); c.restore();
    }
  }
  lanes.forEach((L, j) => {
    const pat = euclid(L.steps, L.puls, L.rot), n = pat.length, x0 = w * (0.14 + (0.72 * (j + 0.5)) / lanes.length);
    for (let k = 0; k < n; k++) {
      if (!pat[k]) continue;
      const ph = ((b / Math.max(0.25, L.div || 0.5) - k) / n) % 1, f = ph < 0 ? ph + 1 : ph, x = x0 + (k / n - 0.5) * w * (0.2 / lanes.length + 0.08), y = h * 0.05 + f * (hz - h * 0.05);
      if (f < 0.92) {
        if (S.va === 'silben') {
          const g = c.createLinearGradient(0, y - h * 0.12, 0, y - h * 0.05); g.addColorStop(0, kbA(L.col, 0)); g.addColorStop(1, kbA(L.col, 0.35)); c.strokeStyle = g; c.lineWidth = 1; c.beginPath(); c.moveTo(x, y - h * 0.12); c.lineTo(x, y - h * 0.05); c.stroke();
          c.fillStyle = kbA(L.col, 0.8); c.font = '500 ' + Math.round(h * 0.06) + 'px ' + (COL.fontNum || 'monospace'); c.textAlign = 'center'; c.fillText(sy[(k + j) % sy.length], x, y);
        } else { c.strokeStyle = kbA(L.col, 0.75); c.lineWidth = 1.1; c.beginPath(); c.moveTo(x, y - h * 0.05); c.lineTo(x, y); c.stroke(); kbDot(c, x, y, 1.3, L.col, 0.95); }
      } else { const q = (f - 0.92) / 0.08; c.strokeStyle = kbA(L.col, 0.6 * (1 - q)); c.lineWidth = 0.8; c.beginPath(); c.ellipse(x, hz, 2 + q * w * 0.06, 1 + q * 2.5, 0, 0, KB_TAU); c.stroke(); }
    }
  });
  if (S.va === 'pilz') {
    for (const [x, s] of [[0.2, 0.13], [0.52, 0.19], [0.8, 0.11]]) {
      const X = w * x, H2 = h * s;
      const sg = c.createLinearGradient(X - H2 * 0.12, 0, X + H2 * 0.12, 0); sg.addColorStop(0, '#f4ecdc'); sg.addColorStop(1, '#a89c86');
      c.fillStyle = sg; c.beginPath(); c.moveTo(X - H2 * 0.1, hz - H2 * 0.9); c.lineTo(X - H2 * 0.13, hz); c.lineTo(X + H2 * 0.13, hz); c.lineTo(X + H2 * 0.1, hz - H2 * 0.9); c.fill();
      const cg = c.createRadialGradient(X - H2 * 0.25, hz - H2 * 1.2, H2 * 0.05, X, hz - H2 * 0.9, H2 * 0.8); cg.addColorStop(0, kbMix(S.b, '#ffe6c0', 0.3)); cg.addColorStop(1, kbMix(S.b, '#3a1a08', 0.45));
      c.fillStyle = cg; c.beginPath(); c.ellipse(X, hz - H2 * 0.9, H2 * 0.75, H2 * 0.45, 0, Math.PI, 0); c.closePath(); c.fill();
      for (let k = 0; k < 3; k++) kbDot(c, X + (k - 1) * H2 * 0.3, hz - H2 * (1.05 + 0.08 * (k % 2)), H2 * 0.07, '#fff6e0', 0.75);
    }
  }
};

// Kristallhöhle: shards from floor and ceiling, glints, five plucked strings in the light
KB_M.kristall = (c, w, h, S, t, R) => {
  const hz = S.hz * h;
  const shard = (x, y, wd, ht, up) => {
    const g = c.createLinearGradient(x, y, x, y - ht * up); g.addColorStop(0, kbA(S.a, 0.15)); g.addColorStop(1, kbA(kbMix(S.a, '#ffffff', 0.5), 0.75));
    c.fillStyle = g; c.beginPath(); c.moveTo(x - wd, y); c.lineTo(x + wd * 0.2, y - ht * up); c.lineTo(x + wd, y); c.closePath(); c.fill();
    c.strokeStyle = kbA('#ffffff', 0.35); c.lineWidth = 0.5; c.beginPath(); c.moveTo(x - wd * 0.2, y); c.lineTo(x + wd * 0.2, y - ht * up); c.stroke();
  };
  for (let i = 0; i < 9; i++) shard(w * (0.04 + 0.92 * R()), hz + 1, w * (0.015 + 0.03 * R()), h * (0.12 + 0.3 * R()), 1);
  for (let i = 0; i < 7; i++) shard(w * (0.04 + 0.92 * R()), -1, w * (0.012 + 0.025 * R()), h * (0.08 + 0.2 * R()), -1);
  const b = kbBeat(S, t);
  c.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 5; k++) {
    const x = w * (0.38 + k * 0.06), amp = 2.4 * kbHit(b / 2 + k * 0.37), pts = [];
    for (let j = 0; j <= 20; j++) { const y = h * 0.14 + (j / 20) * (hz - h * 0.2); pts.push([x + amp * Math.sin((j / 20) * Math.PI) * Math.sin(t * 40 + k), y]); }
    kbLine(c, pts, S.b, 0.45 + 0.4 * amp / 2.4, 0.6);
  }
  for (let i = 0; i < 7; i++) { const tw = Math.max(0, Math.sin(t * 1.7 + i * 1.9)); kbGlow(c, w * R(), h * (0.1 + 0.6 * R()), 4 + 4 * tw, '#ffffff', 0.4 * tw); }
};

// Sporenwolke: a mushroom on the horizon breathing out a cloud of grains, tuned by the overtone series
KB_M.sporen = (c, w, h, S, t, R) => {
  const hz = S.hz * h, X = w * 0.5, cap = h * 0.22;
  c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 160; i++) {
    const a = R() * KB_TAU, rr = R() ** 0.7, life = (t * 0.06 + R()) % 1, x = X + Math.cos(a) * w * 0.42 * rr + Math.sin(t * 0.4 + i) * 3, y = hz - cap * 1.25 - h * 0.5 * rr * (0.6 + 0.4 * Math.sin(a) ** 2) - life * h * 0.08;
    kbDot(c, x, y, 0.5 + 0.9 * R(), i % 3 ? S.a : S.b, (0.25 + 0.6 * R()) * (1 - life * 0.6));
  }
  kbGlow(c, X, hz - cap * 1.3, h * 0.42, S.a, 0.2);
  c.globalCompositeOperation = 'source-over';
  // the stem, a little bent, lit from the left
  const sg = c.createLinearGradient(X - cap * 0.2, 0, X + cap * 0.2, 0); sg.addColorStop(0, kbMix(S.a, '#f4ecff', 0.75)); sg.addColorStop(1, kbMix(S.a, '#3a2850', 0.55));
  c.fillStyle = sg; c.beginPath(); c.moveTo(X - cap * 0.12, hz - cap); c.quadraticCurveTo(X - cap * 0.2, hz - cap * 0.4, X - cap * 0.2, hz); c.lineTo(X + cap * 0.18, hz); c.quadraticCurveTo(X + cap * 0.14, hz - cap * 0.5, X + cap * 0.12, hz - cap); c.fill();
  // the cap from below: gills fanning out, its rim lit
  const capY = hz - cap * 0.95;
  const cg = c.createRadialGradient(X - cap * 0.4, capY - cap * 0.5, cap * 0.1, X, capY, cap * 1.3); cg.addColorStop(0, kbMix(S.a, '#ffffff', 0.35)); cg.addColorStop(0.6, kbMix(S.a, '#2a1440', 0.35)); cg.addColorStop(1, kbMix(S.a, '#120820', 0.7));
  c.fillStyle = cg; c.beginPath(); c.ellipse(X, capY, cap * 1.25, cap * 0.68, 0, Math.PI, 0); c.quadraticCurveTo(X, capY + cap * 0.22, X - cap * 1.25, capY); c.fill();
  for (let k = 1; k < 14; k++) { const f = k / 14 * 2 - 1; c.strokeStyle = kbA(S.b, 0.3); c.lineWidth = 0.5; c.beginPath(); c.moveTo(X + cap * 1.2 * f, capY + 1); c.lineTo(X + cap * 0.14 * f, capY + cap * 0.17); c.stroke(); }
  c.strokeStyle = kbA(kbMix(S.a, '#ffffff', 0.4), 0.7); c.lineWidth = 0.9; c.beginPath(); c.ellipse(X, capY, cap * 1.25, cap * 0.68, 0, Math.PI * 1.05, Math.PI * 1.6); c.stroke();
};

// Klangschalen-Ritual: two singing bowls, their standing waves rising
KB_M.schalen = (c, w, h, S, t, R) => {
  const hz = S.hz * h, b = kbBeat(S, t);
  [[w * 0.33, h * 0.17, 0], [w * 0.68, h * 0.13, 0.5]].forEach(([x, s, o]) => {
    c.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 4; k++) { const f = (b / 4 + o + k / 4) % 1; c.strokeStyle = kbA(S.a, 0.35 * (1 - f)); c.lineWidth = 0.8; c.beginPath(); c.ellipse(x, hz - s * 0.9 - f * h * 0.45, s * (1 + f * 0.8), s * 0.22 * (1 + f * 0.8), 0, 0, KB_TAU); c.stroke(); }
    kbGlow(c, x, hz - s * 0.9, s * 2.2, S.a, 0.22);
    c.globalCompositeOperation = 'source-over';
    const g = c.createLinearGradient(x - s, 0, x + s, 0); g.addColorStop(0, kbMix(S.a, '#2a1606', 0.6)); g.addColorStop(0.4, kbMix(S.a, '#fff0c8', 0.15)); g.addColorStop(1, kbMix(S.a, '#1a0d04', 0.7));
    c.fillStyle = g; c.beginPath(); c.moveTo(x - s, hz - s * 0.9); c.quadraticCurveTo(x - s * 0.95, hz - 1, x, hz - 1); c.quadraticCurveTo(x + s * 0.95, hz - 1, x + s, hz - s * 0.9); c.closePath(); c.fill();
    c.strokeStyle = kbA('#fff0c8', 0.7); c.lineWidth = 0.8; c.beginPath(); c.ellipse(x, hz - s * 0.9, s, s * 0.22, 0, 0, KB_TAU); c.stroke();
    c.strokeStyle = kbA('#1a0d04', 0.9); c.lineWidth = 1.6; c.beginPath(); c.moveTo(x + s * 1.1, hz - 2); c.lineTo(x + s * 1.6, hz - s * 0.5); c.stroke();
  });
};

// Maschinenträume: the Puls's lanes as gears – teeth where it strikes – turning in its tempo, tape wobbling past
KB_M.zahnrad = (c, w, h, S, t, R) => {
  const lanes = S.on.length ? S.on : [{ col: S.a, steps: 12, puls: 5, rot: 0, div: 0.5 }], b = kbBeat(S, t), pos = [[0.3, 0.45, 0.27], [0.62, 0.35, 0.2], [0.72, 0.68, 0.15], [0.42, 0.72, 0.12]];
  lanes.slice(0, 4).forEach((L, j) => {
    const [px, py, pr] = pos[j], x = w * px, y = h * py, r = h * pr, pat = euclid(L.steps, L.puls, L.rot), rot = (j % 2 ? -1 : 1) * (b * (L.div || 0.25)) / L.steps * KB_TAU;
    c.strokeStyle = kbA(kbMix(L.col, '#9a8d80', 0.5), 0.5); c.lineWidth = 1.2; c.beginPath(); c.arc(x, y, r, 0, KB_TAU); c.stroke();
    c.lineWidth = 0.6; c.beginPath(); c.arc(x, y, r * 0.35, 0, KB_TAU); c.stroke();
    for (let k = 0; k < pat.length; k++) {
      const a = rot + (k / pat.length) * KB_TAU, x1 = x + Math.cos(a) * r, y1 = y + Math.sin(a) * r;
      c.strokeStyle = kbA(L.col, pat[k] ? 0.95 : 0.3); c.lineWidth = pat[k] ? 2 : 1; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x + Math.cos(a) * (r + (pat[k] ? 5 : 2.5)), y + Math.sin(a) * (r + (pat[k] ? 5 : 2.5))); c.stroke();
      c.strokeStyle = kbA(L.col, 0.15); c.lineWidth = 0.5; c.beginPath(); c.moveTo(x + Math.cos(a) * r * 0.35, y + Math.sin(a) * r * 0.35); c.lineTo(x1, y1); c.stroke();
    }
    c.globalCompositeOperation = 'lighter'; kbGlow(c, x, y, r * 0.5, L.col, 0.25); c.globalCompositeOperation = 'source-over';
  });
  const pts = []; for (let i = 0; i <= 40; i++) pts.push([(i / 40) * w, h * 0.12 + 2.5 * Math.sin(i * 0.5 + t * 2) + 1.5 * Math.sin(i * 0.17 - t)]);
  kbLine(c, pts, S.b, 0.45, 1.2);
};

// Sonnenwind: a low sun, wind streaming over the warm plane
KB_M.wind = (c, w, h, S, t, R) => {
  const hz = S.hz * h;
  if (S.va === 'sonne') kbSun(c, w * 0.68, hz - h * 0.06, h * 0.12, S.a, 1);
  c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 9; i++) {
    const y0 = h * (0.16 + 0.07 * i), ph = R() * 10, pts = [];
    for (let k = 0; k <= 30; k++) { const x = (k / 30) * w * 1.1 - w * 0.05; pts.push([x, y0 + Math.sin(x / w * 5 + ph + t * 0.6) * h * 0.03 + Math.sin(x / w * 13 + ph * 2 - t * 1.4) * h * 0.008]); }
    const col = i % 3 ? S.a : S.b, g = c.createLinearGradient(0, 0, w, 0), sh = ((t * 0.12 + i * 0.13) % 1);
    g.addColorStop(0, kbA(col, 0)); g.addColorStop(Math.max(0, sh - 0.25), kbA(col, 0.05)); g.addColorStop(sh, kbA(col, 0.5)); g.addColorStop(Math.min(1, sh + 0.2), kbA(col, 0.05)); g.addColorStop(1, kbA(col, 0));
    c.strokeStyle = g; c.lineWidth = 0.9; c.beginPath(); pts.forEach(([x, y], k) => (k ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke();
  }
};

// Obertonhöhle: the mouth of a cave, its overtones as the harmonic ladder (1/n) – one of them whistling bright
KB_M.oberton = (c, w, h, S, t, R) => {
  const hz = S.hz * h, X = w * 0.5, top = h * 0.1, sing = 3 + Math.floor((t * 0.5) % 7);
  c.fillStyle = 'rgba(4,3,2,0.6)'; c.beginPath(); c.moveTo(X - w * 0.36, hz); c.quadraticCurveTo(X - w * 0.34, top, X, top); c.quadraticCurveTo(X + w * 0.34, top, X + w * 0.36, hz); c.fill();
  c.strokeStyle = kbA(S.b, 0.45); c.lineWidth = 1; c.stroke();
  c.fillStyle = kbA(kbMix(S.b, '#0a0603', 0.82), 0.95);
  for (let i = 0; i < 11; i++) { const f = i / 10 - 0.5, x = X + f * w * 0.56, y = top + 1 + (f * 2) ** 2 * h * 0.2, L = h * (0.03 + 0.06 * R()); c.beginPath(); c.moveTo(x - 2.2, y - 3); c.lineTo(x, y + L); c.lineTo(x + 2.2, y - 3); c.fill(); }
  c.globalCompositeOperation = 'lighter';
  for (let n = 1; n <= 14; n++) {
    const y = hz - (hz - top - 10) * (1 - 1 / n), half = w * 0.3 * Math.sqrt(Math.max(0, 1 - ((hz - y) / (hz - top)) ** 2)) * 0.92, on = n === sing;
    kbLine(c, [[X - half, y], [X + half, y]], on ? '#fff6dc' : S.a, on ? 0.95 : 0.42 - n * 0.02, on ? 1.4 : 0.7);
    if (on) kbGlow(c, X, y, w * 0.22, S.a, 0.38);
  }
  c.fillStyle = kbA(S.a, 0.7); c.font = '500 ' + Math.round(h * 0.06) + 'px ' + (COL.fontNum || 'monospace'); c.textAlign = 'left'; c.fillText(sing + '. Oberton', X + w * 0.2, h * 0.2);
  kbGlow(c, X, hz - 2, w * 0.3, S.b, 0.18 + 0.15 * kbHit(kbBeat(S, t) / 4));
};

// Geisterchor: veils of voices breathing, far bowls glinting
KB_M.chor = (c, w, h, S, t, R) => {
  const hz = S.hz * h;
  c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 6; i++) {
    const x = w * (0.14 + 0.145 * i), ht = h * (0.45 + 0.2 * Math.sin(i * 1.7 + t * 0.35)), wd = w * 0.07;
    const g = c.createLinearGradient(0, hz - ht, 0, hz); g.addColorStop(0, kbA(i % 2 ? S.b : S.a, 0)); g.addColorStop(0.35, kbA(i % 2 ? S.b : S.a, 0.22)); g.addColorStop(1, kbA(S.a, 0.05));
    c.fillStyle = g; c.beginPath(); c.moveTo(x - wd, hz);
    for (let k = 0; k <= 12; k++) { const y = hz - (k / 12) * ht; c.lineTo(x - wd * (1 - k / 14) + Math.sin(k * 0.9 + t + i) * 2.5, y); }
    for (let k = 12; k >= 0; k--) { const y = hz - (k / 12) * ht; c.lineTo(x + wd * (1 - k / 14) + Math.sin(k * 0.9 + t * 1.2 + i) * 2.5, y); }
    c.fill();
    const o = ['u', 'o', 'a', 'e', 'i'][(i + Math.floor(t * 0.4)) % 5];
    c.fillStyle = kbA('#ffffff', 0.18); c.font = 'italic 400 ' + Math.round(h * 0.11) + 'px ' + (CSSV('--font-display') || 'serif'); c.textAlign = 'center'; c.fillText(o, x, hz - ht * 0.55);
  }
  kbGlow(c, w * 0.85, hz - 4, 6, '#ffffff', 0.4);
};

// Kalimbatraum: the tines over the sound hole, two rhythms circling five against seven
KB_M.kalimba = (c, w, h, S, t, R) => {
  const hz = S.hz * h, X = w * 0.5, n = 11, b = kbBeat(S, t), top = h * 0.4;
  const bg = c.createLinearGradient(0, top, 0, hz); bg.addColorStop(0, kbMix(S.a, '#5a3518', 0.45)); bg.addColorStop(1, kbMix(S.a, '#1e1008', 0.75));
  c.fillStyle = bg; c.beginPath(); c.roundRect ? c.roundRect(X - w * 0.3, top, w * 0.6, hz - top + 4, [14, 14, 4, 4]) : c.rect(X - w * 0.3, top, w * 0.6, hz - top); c.fill();
  c.strokeStyle = kbA(S.b, 0.35); c.lineWidth = 0.8; c.stroke();
  kbDot(c, X, hz - (hz - top) * 0.28, h * 0.045, '#0c0604', 0.95); kbRing(c, X, hz - (hz - top) * 0.28, h * 0.045, S.b, 0.4, 0.6);
  for (let k = 0; k < n; k++) {
    const o = k - (n - 1) / 2, len = h * (0.34 - Math.abs(o) * 0.03) + (Math.abs(o) % 2) * h * 0.018, x = X + o * w * 0.042, lit = kbHit(b * (k % 2 ? 5 / 7 : 1) + k * 0.13), y1 = top + h * 0.13;
    const g = c.createLinearGradient(x - 2, 0, x + 2, 0); g.addColorStop(0, kbMix(S.b, '#5a4a30', 0.4)); g.addColorStop(0.5, kbMix(S.b, '#ffffff', 0.55)); g.addColorStop(1, kbMix(S.b, '#5a4a30', 0.4));
    c.fillStyle = g; c.fillRect(x - 1.5, y1 - len * 0.62, 3, len * 0.62 + 4);
    c.globalCompositeOperation = 'lighter'; kbGlow(c, x, y1 - len * 0.62, 7, S.b, 0.5 * lit); c.globalCompositeOperation = 'source-over';
  }
  c.fillStyle = kbA('#1a0e06', 0.95); c.fillRect(X - w * 0.27, top + h * 0.11, w * 0.54, 3);
  [[5, w * 0.17, S.a], [7, w * 0.24, S.b]].forEach(([m, r, col], j) => {
    const a = (b / m) * KB_TAU * (j ? -1 : 1); c.globalCompositeOperation = 'lighter';
    c.strokeStyle = kbA(col, 0.14); c.lineWidth = 0.6; c.beginPath(); c.ellipse(X, h * 0.2, r, r * 0.3, 0, 0, KB_TAU); c.stroke();
    for (let k = 0; k < m; k++) kbDot(c, X + Math.cos(a + (k / m) * KB_TAU) * r, h * 0.2 + Math.sin(a + (k / m) * KB_TAU) * r * 0.3, 1.5, col, 0.85);
    c.globalCompositeOperation = 'source-over';
  });
};

// Kurzwellenritual: the dial sweeping through static, a far station's carrier rising out of the noise
KB_M.radio = (c, w, h, S, t, R) => {
  const hz = S.hz * h, R2 = kbRng(S.seed + Math.floor(t * 12));
  for (let y = 4; y < hz - 2; y += 3) { c.fillStyle = kbA(S.a, 0.03 + 0.07 * R2()); c.fillRect(0, y, w, 1); }
  const X = w * 0.5, Y = hz - 2, r = h * 0.52, a = Math.PI * (1.15 + 0.7 * (0.5 + 0.5 * Math.sin(t * 0.35)));
  c.strokeStyle = kbA(S.b, 0.5); c.lineWidth = 0.8; c.beginPath(); c.arc(X, Y, r, Math.PI * 1.08, Math.PI * 1.92); c.stroke();
  for (let k = 0; k <= 24; k++) { const q = Math.PI * (1.1 + 0.8 * k / 24), l = k % 4 ? 3 : 6; c.beginPath(); c.moveTo(X + Math.cos(q) * r, Y + Math.sin(q) * r); c.lineTo(X + Math.cos(q) * (r - l), Y + Math.sin(q) * (r - l)); c.stroke(); }
  c.globalCompositeOperation = 'lighter';
  c.strokeStyle = kbA(S.a, 0.9); c.lineWidth = 1.2; c.beginPath(); c.moveTo(X, Y); c.lineTo(X + Math.cos(a) * r * 1.02, Y + Math.sin(a) * r * 1.02); c.stroke();
  const pts = []; for (let k = 0; k <= 80; k++) { const x = (k / 80) * w; pts.push([x, h * 0.3 + Math.sin(x * 0.4 + t * 9) * h * 0.04 * Math.exp(-(((x - w * 0.62) / (w * 0.12)) ** 2)) + (R2() - 0.5) * 2]); }
  kbLine(c, pts, S.a, 0.6, 0.8);
  kbGlow(c, X, Y, 6, S.a, 0.7);
};

// Zikadennacht: crescent moon, stars, the cicadas a shimmering band in the grass, the drone low
KB_M.nacht = (c, w, h, S, t, R) => {
  const hz = S.hz * h;
  for (let i = 0; i < 40; i++) { const tw = 0.4 + 0.6 * Math.sin(t * 2 + i * 1.3) ** 2; kbDot(c, w * R(), hz * 0.8 * R(), 0.4 + 0.6 * R(), '#e8ecff', 0.6 * tw); }
  c.globalCompositeOperation = 'lighter'; kbGlow(c, w * 0.78, h * 0.22, h * 0.3, S.b, 0.16); c.globalCompositeOperation = 'source-over';
  c.fillStyle = kbMix(S.a, '#ffffff', 0.55); c.beginPath(); c.arc(w * 0.78, h * 0.22, h * 0.09, 0, KB_TAU); c.fill();
  c.fillStyle = S.sky; c.beginPath(); c.arc(w * 0.78 + h * 0.035, h * 0.22 - h * 0.02, h * 0.085, 0, KB_TAU); c.fill();
  c.strokeStyle = kbA(kbMix(S.a, '#203018', 0.7), 0.9); c.lineWidth = 0.8;
  for (let i = 0; i < 60; i++) { const x = w * R(), ht = h * (0.05 + 0.1 * R()), lean = (R() - 0.5) * 6; c.beginPath(); c.moveTo(x, hz + 1); c.quadraticCurveTo(x + lean * 0.3, hz - ht * 0.6, x + lean, hz - ht); c.stroke(); }
  c.globalCompositeOperation = 'lighter';
  const R3 = kbRng(S.seed + Math.floor(t * 20));
  for (let i = 0; i < 46; i++) kbDot(c, w * R(), hz - h * 0.12 * R(), 0.7, S.a, 0.25 + 0.7 * R3() * R3());
};

// Gongbad: the big gong hanging, its hammered rings, overtones blooming after the stroke
KB_M.gong = (c, w, h, S, t, R) => {
  const X = w * 0.5, Y = h * 0.44, r = h * 0.3, b = kbBeat(S, t) / 9, hit = kbHit(b);
  c.strokeStyle = kbA(S.a, 0.6); c.lineWidth = 1.4; c.beginPath(); c.moveTo(w * 0.18, h * 0.06); c.lineTo(w * 0.82, h * 0.06); c.stroke();
  c.lineWidth = 0.6; c.beginPath(); c.moveTo(X - r * 0.5, h * 0.06); c.lineTo(X - r * 0.35, Y - r * 0.95); c.moveTo(X + r * 0.5, h * 0.06); c.lineTo(X + r * 0.35, Y - r * 0.95); c.stroke();
  c.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 5; k++) { const f = ((b * 2 + k / 5) % 1); kbRing(c, X, Y, r * (1 + f * 1.4), S.b, 0.22 * (1 - f) ** 2, 1); }
  kbGlow(c, X, Y, r * 2.2, S.a, 0.16 + 0.22 * hit);
  c.globalCompositeOperation = 'source-over';
  const g = c.createRadialGradient(X - r * 0.3, Y - r * 0.3, r * 0.1, X, Y, r);
  g.addColorStop(0, kbMix(S.a, '#fff2d0', 0.45)); g.addColorStop(0.55, kbMix(S.a, '#3a2008', 0.25)); g.addColorStop(1, kbMix(S.a, '#140a02', 0.7));
  c.fillStyle = g; c.beginPath(); c.arc(X, Y, r, 0, KB_TAU); c.fill();
  for (let k = 1; k < 7; k++) kbRing(c, X, Y, r * k / 7, '#fff2d0', 0.12, 0.5);
  kbDot(c, X, Y, r * 0.16, kbMix(S.a, '#fff6dc', 0.5), 0.9);
};

// Glaswiese: blades of glass bending in the wind, an aeolian harp's strings across
KB_M.glas = (c, w, h, S, t, R) => {
  const hz = S.hz * h;
  for (let i = 0; i < 26; i++) {
    const x = w * (i + R()) / 26, ht = h * (0.2 + 0.45 * R()), lean = Math.sin(t * 0.8 + x * 0.05) * 6 + (R() - 0.5) * 8, wd = 1.2 + 2 * R();
    const g = c.createLinearGradient(0, hz, 0, hz - ht); g.addColorStop(0, kbA(S.a, 0.1)); g.addColorStop(1, kbA(kbMix(S.a, '#ffffff', 0.6), 0.6));
    c.fillStyle = g; c.beginPath(); c.moveTo(x - wd, hz); c.quadraticCurveTo(x + lean * 0.3, hz - ht * 0.6, x + lean, hz - ht); c.quadraticCurveTo(x + lean * 0.3 + wd * 0.5, hz - ht * 0.6, x + wd, hz); c.fill();
  }
  c.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 4; k++) { const pts = []; for (let j = 0; j <= 30; j++) { const x = (j / 30) * w; pts.push([x, h * (0.1 + k * 0.03) + x * 0.1 + Math.sin(j * 0.6 + t * (3 + k)) * 1.1]); } kbLine(c, pts, S.b, 0.22, 0.6); }
  for (let i = 0; i < 6; i++) { const tw = Math.max(0, Math.sin(t * 1.3 + i * 2.3)); kbGlow(c, w * R(), hz - h * 0.4 * R(), 5, '#ffffff', 0.5 * tw); }
};

// Gespinstgarten: a web of strings, dew on it, one thread trembling where it was plucked
KB_M.netz = (c, w, h, S, t, R) => {
  const X = w * 0.52, Y = h * 0.42, n = 11, rr = h * 0.46, b = kbBeat(S, t), plk = Math.floor(b) % n, f = kbHit(b);
  const spoke = []; for (let k = 0; k < n; k++) spoke.push(-Math.PI / 2 + (k / n) * KB_TAU + (R() - 0.5) * 0.2);
  c.strokeStyle = kbA(S.a, 0.5); c.lineWidth = 0.6;
  spoke.forEach((a) => { c.beginPath(); c.moveTo(X, Y); c.lineTo(X + Math.cos(a) * rr * 1.4, Y + Math.sin(a) * rr * 1.1); c.stroke(); });
  for (let ring = 1; ring <= 7; ring++) {
    const r0 = rr * ring / 7;
    c.beginPath();
    spoke.forEach((a, k) => { const vib = k === plk || (k + 1) % n === plk ? Math.sin(t * 30) * 2.5 * f : 0, x = X + Math.cos(a) * r0 * 1.15, y = Y + Math.sin(a) * r0 * 0.9 + vib; k ? c.lineTo(x, y) : c.moveTo(x, y); });
    c.closePath(); c.strokeStyle = kbA(S.a, 0.22 + 0.04 * ring); c.stroke();
  }
  c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 18; i++) { const k = Math.floor(R() * n), rg = 1 + Math.floor(R() * 7), a = spoke[k], x = X + Math.cos(a) * rr * rg / 7 * 1.15, y = Y + Math.sin(a) * rr * rg / 7 * 0.9; kbGlow(c, x, y, 3.5, S.b, 0.55); kbDot(c, x, y, 0.8, '#ffffff', 0.8); }
};

// Kompostgarten: autumn – leaves falling, half-buried bells decaying into the soil, a stick tapping
KB_M.kompost = (c, w, h, S, t, R) => {
  const hz = S.hz * h, b = kbBeat(S, t);
  c.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 3; k++) { const x = w * (0.22 + 0.27 * k), f = (b / 3 + k / 3) % 1; for (let j = 0; j < 3; j++) kbRing(c, x, hz - h * 0.06, h * (0.05 + f * 0.3 + j * 0.03), S.b, 0.3 * (1 - f) * (1 - j * 0.3), 0.7); }
  c.globalCompositeOperation = 'source-over';
  [[0.22, 0.12, -0.5], [0.49, 0.09, 0.3], [0.76, 0.1, 0.7]].forEach(([x, s, a]) => {
    const X = w * x, Hh = h * s; c.save(); c.translate(X, hz + Hh * 0.2); c.rotate(a);
    const g = c.createLinearGradient(-Hh, 0, Hh, 0); g.addColorStop(0, kbMix(S.b, '#2a1a08', 0.6)); g.addColorStop(0.45, kbMix(S.b, '#f0dca0', 0.25)); g.addColorStop(1, kbMix(S.b, '#1a1004', 0.7));
    c.fillStyle = g; c.beginPath(); c.moveTo(-Hh * 0.2, -Hh); c.quadraticCurveTo(-Hh * 0.55, -Hh * 0.6, -Hh * 0.7, 0); c.lineTo(Hh * 0.7, 0); c.quadraticCurveTo(Hh * 0.55, -Hh * 0.6, Hh * 0.2, -Hh); c.closePath(); c.fill();
    c.fillStyle = kbA(kbMix(S.a, '#4a6a2a', 0.5), 0.6); c.fillRect(-Hh * 0.5, -Hh * 0.35, Hh * 0.4, Hh * 0.12);
    c.restore();
  });
  for (let i = 0; i < 14; i++) {
    const x0 = w * R(), sp = 0.05 + 0.08 * R(), f = (t * sp + R()) % 1, y = -h * 0.05 + f * (hz + h * 0.05), x = x0 + Math.sin(t * 1.2 + i) * 8, a = t * (1 + R()) + i;
    c.save(); c.translate(x, y); c.rotate(a); c.fillStyle = kbA(i % 3 ? S.a : kbMix(S.a, '#ffd166', 0.5), 0.85);
    c.beginPath(); c.moveTo(0, -4); c.quadraticCurveTo(3, 0, 0, 4); c.quadraticCurveTo(-3, 0, 0, -4); c.fill(); c.restore();
  }
  for (let i = 0; i < 12; i++) { const x = w * R(); c.save(); c.translate(x, hz - 1); c.rotate((R() - 0.5) * 0.6 + Math.PI / 2); c.fillStyle = kbA(kbMix(S.a, '#7a4a1a', 0.4), 0.85); c.beginPath(); c.ellipse(0, 0, 1.6, 3.6, 0, 0, KB_TAU); c.fill(); c.restore(); }
  c.strokeStyle = kbA(kbMix(S.b, '#ffffff', 0.2), 0.8); c.lineWidth = 2.2; c.lineCap = 'round';
  const tap = kbHit(b); c.beginPath(); c.moveTo(w * 0.9, hz - h * 0.4 - tap * 3); c.lineTo(w * 0.8, hz - h * 0.12 - tap * 4); c.stroke();
};

// Atemrohr: a reed pipe, breath streaming in, the feedback an octave below as a glowing loop
KB_M.rohr = (c, w, h, S, t, R) => {
  const Y = h * 0.36, x0 = w * 0.18, x1 = w * 0.86, r = h * 0.045;
  c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 36; i++) { const f = (t * 0.4 + R()) % 1, x = x0 - w * 0.16 + f * w * 0.17, y = Y + (R() - 0.5) * r * 3 * (1 - f); kbDot(c, x, y, 0.8, S.a, 0.7 * f); }
  const lp = h * 0.62;
  kbGlow(c, w * 0.52, lp, h * 0.28, S.b, 0.16 + 0.12 * Math.sin(t * 1.4) ** 2);
  for (let k = 0; k < 3; k++) { c.strokeStyle = kbA(S.b, 0.45 - k * 0.12); c.lineWidth = 1; c.beginPath(); c.ellipse(w * 0.52, lp, w * (0.12 + k * 0.05), h * (0.06 + k * 0.025), 0, 0, KB_TAU); c.stroke(); }
  for (let i = 0; i < 3; i++) { const a = t * 1.2 + (i * KB_TAU) / 3; kbDot(c, w * 0.52 + Math.cos(a) * w * 0.12, lp + Math.sin(a) * h * 0.06, 1.4, S.b, 0.9); }
  c.globalCompositeOperation = 'source-over';
  const g = c.createLinearGradient(0, Y - r, 0, Y + r); g.addColorStop(0, kbMix(S.a, '#fff8d8', 0.55)); g.addColorStop(0.35, kbMix(S.a, '#6a6a28', 0.35)); g.addColorStop(1, kbMix(S.a, '#141a06', 0.82));
  c.fillStyle = g; c.beginPath(); c.roundRect ? c.roundRect(x0, Y - r, x1 - x0, r * 2, r) : c.rect(x0, Y - r, x1 - x0, r * 2); c.fill();
  for (let k = 0; k < 4; k++) { const x = x0 + (x1 - x0) * (0.2 + k * 0.22); c.fillStyle = kbA('#1a1408', 0.5); c.fillRect(x, Y - r, 1.4, r * 2); }
  for (let k = 0; k < 6; k++) { const x = x0 + (x1 - x0) * (0.42 + k * 0.08); c.fillStyle = '#100c05'; c.beginPath(); c.ellipse(x, Y - r * 0.2, r * 0.32, r * 0.24, 0, 0, KB_TAU); c.fill(); }
  c.fillStyle = kbMix(S.b, '#3a2008', 0.4); c.beginPath(); c.moveTo(x0 + 1, Y - r * 0.7); c.lineTo(x0 - w * 0.05, Y - r * 0.25); c.lineTo(x0 - w * 0.05, Y + r * 0.25); c.lineTo(x0 + 1, Y + r * 0.7); c.fill();
};

// Hochspannung: two towers, arcs jumping between them, corona glowing
KB_M.blitz = (c, w, h, S, t, R) => {
  const hz = S.hz * h, A0 = [w * 0.2, hz - h * 0.42], A1 = [w * 0.8, hz - h * 0.36];
  [A0, A1].forEach(([x, y]) => { c.strokeStyle = kbA('#c8d4ff', 0.5); c.lineWidth = 1; c.beginPath(); c.moveTo(x - 6, hz); c.lineTo(x, y + 4); c.lineTo(x + 6, hz); c.moveTo(x - 4, (y + hz) / 2); c.lineTo(x + 4, (y + hz) / 2); c.stroke(); });
  c.globalCompositeOperation = 'lighter';
  [A0, A1].forEach(([x, y], j) => { kbGlow(c, x, y, h * 0.16, j ? S.b : S.a, 0.4 + 0.2 * Math.sin(t * 7 + j)); kbDot(c, x, y, 2.4, '#ffffff', 0.9); });
  const R2 = kbRng(S.seed + Math.floor(t * 9));
  for (let k = 0; k < 3; k++) {
    const pts = [A0]; let [x, y] = A0; const n = 14;
    for (let i = 1; i < n; i++) { const f = i / n; x = A0[0] + (A1[0] - A0[0]) * f; y = A0[1] + (A1[1] - A0[1]) * f - Math.sin(f * Math.PI) * h * (0.1 + 0.08 * k) + (R2() - 0.5) * h * 0.08; pts.push([x, y]); }
    pts.push(A1);
    kbLine(c, pts, k ? S.b : S.a, 0.35, 4); kbLine(c, pts, '#ffffff', 0.8 - k * 0.25, 0.9);
  }
};

// Wurzelnetz: a root lattice growing down from the surface, avalanches running along it as light
KB_M.wurzel = (c, w, h, S, t, R) => {
  const top = S.hz * h, segs = [];
  const gd = c.createLinearGradient(0, top, 0, h); gd.addColorStop(0, kbMix(S.a, '#2a1a10', 0.8)); gd.addColorStop(0.2, '#140d09'); gd.addColorStop(1, '#0a0705');
  c.fillStyle = gd; c.fillRect(0, top, w, h - top); c.fillStyle = kbA(S.a, 0.3); c.fillRect(0, top, w, 0.7);
  for (let i = 0; i < 5; i++) { const x = w * (0.1 + 0.2 * i + 0.05 * R()), s2 = h * (0.06 + 0.05 * R()); c.fillStyle = kbA(kbMix(S.a, '#8cc46a', 0.6), 0.55); c.beginPath(); c.moveTo(x, top); c.quadraticCurveTo(x - s2 * 0.6, top - s2, x - s2 * 0.2, top - s2 * 1.4); c.quadraticCurveTo(x + s2 * 0.1, top - s2 * 0.8, x, top); c.fill(); }
  const grow = (x, y, a, len, d) => { const x1 = x + Math.cos(a) * len, y1 = y + Math.sin(a) * len; segs.push([x, y, x1, y1, d]); if (d < 5) { const n = R() < 0.65 ? 2 : 1; for (let k = 0; k < n; k++) grow(x1, y1, a + (k ? 1 : -1) * (0.25 + R() * 0.5), len * (0.68 + 0.15 * R()), d + 1); } };
  for (let i = 0; i < 3; i++) grow(w * (0.25 + 0.25 * i), top, Math.PI / 2 + (R() - 0.5) * 0.4, h * 0.17, 0);
  c.lineCap = 'round';
  segs.forEach(([x0, y0, x1, y1, d]) => { c.strokeStyle = kbA(kbMix(S.a, '#5a3518', 0.35), 0.85 - d * 0.1); c.lineWidth = Math.max(0.5, 3.2 - d * 0.6); c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); });
  c.globalCompositeOperation = 'lighter';
  const b = kbBeat(S, t);
  segs.forEach(([x0, y0, x1, y1, d], k) => { const f = (b * 0.5 - d * 0.18 + (k % 3) * 0.05) % 1, g = f < 0 ? f + 1 : f; if (g < 0.2) { const q = g / 0.2; kbGlow(c, x0 + (x1 - x0) * q, y0 + (y1 - y0) * q, 5, S.b, 0.7 * (1 - d / 6)); } });
  for (let i = 0; i < 18; i++) kbDot(c, w * R(), top * R(), 0.6, S.b, 0.4);
};

// Vogelhain: a branch with a bird on it, its song drawn as a sonogram – chirps rising and falling across the sky
KB_M.vogel = (c, w, h, S, t, R) => {
  const b = kbBeat(S, t);
  c.globalCompositeOperation = 'lighter'; kbGlow(c, w * 0.62, h * 0.26, h * 0.3, S.b, 0.12); c.globalCompositeOperation = 'source-over';
  c.strokeStyle = kbA(kbMix(S.a, '#2a3812', 0.6), 0.95); c.lineWidth = 2.6; c.lineCap = 'round';
  c.beginPath(); c.moveTo(w * 1.02, h * 0.2); c.quadraticCurveTo(w * 0.72, h * 0.27, w * 0.44, h * 0.36); c.stroke();
  c.lineWidth = 1.2; c.beginPath(); c.moveTo(w * 0.72, h * 0.27); c.quadraticCurveTo(w * 0.64, h * 0.18, w * 0.58, h * 0.13); c.stroke();
  for (let i = 0; i < 8; i++) { const x = w * (0.47 + 0.065 * i), y = h * (0.35 - 0.02 * i); c.fillStyle = kbA(kbMix(S.a, '#3a6a1a', 0.35), 0.85); c.beginPath(); c.ellipse(x, y + 5, 2.4, 5.4, 0.5 + (i % 2) * 0.5, 0, KB_TAU); c.fill(); }
  // the bird, singing (beak open on the beat)
  const bx = w * 0.62, by = h * 0.285, op = kbHit(b) * 0.8, bodyC = kbMix(S.a, '#efe6c8', 0.35);
  c.fillStyle = bodyC; c.beginPath(); c.ellipse(bx, by - 5, 7, 4.6, -0.35, 0, KB_TAU); c.fill();
  c.beginPath(); c.arc(bx + 5.5, by - 9, 3, 0, KB_TAU); c.fill();
  c.beginPath(); c.moveTo(bx - 5, by - 3); c.lineTo(bx - 13, by + 1); c.lineTo(bx - 6, by - 6); c.fill();
  c.fillStyle = kbMix(S.b, '#ff9a3a', 0.4); c.beginPath(); c.moveTo(bx + 8, by - 9.6); c.lineTo(bx + 12.5, by - 9.5 - op * 1.6); c.lineTo(bx + 8, by - 8.6); c.lineTo(bx + 12, by - 8 + op * 1.6); c.lineTo(bx + 8, by - 8); c.fill();
  kbDot(c, bx + 6.4, by - 9.6, 0.7, '#120c06', 1);
  c.strokeStyle = kbA(kbMix(S.a, '#4a3a1a', 0.5), 1); c.lineWidth = 0.8; c.beginPath(); c.moveTo(bx - 1, by - 1); c.lineTo(bx - 1, by + 2); c.moveTo(bx + 2, by - 1); c.lineTo(bx + 2, by + 2); c.stroke();
  c.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 9; k++) {
    const x = w * (0.04 + 0.1 * k), up = R() < 0.5, ht = h * (0.06 + 0.1 * R()), y = h * (0.46 + 0.26 * R()), lit = kbHit(b * 0.5 + k * 0.23), pts = [];
    for (let j = 0; j <= 10; j++) { const f = j / 10; pts.push([x + f * w * 0.05, y - (up ? f : 1 - f) * ht - Math.sin(f * Math.PI) * ht * 0.3]); }
    kbLine(c, pts, k % 3 ? S.a : S.b, 0.35 + 0.55 * lit, 1.1);
  }
};

// Sporenregen + Bewegung: the gesture's path through the air, spores loosening from it and falling
KB_M.faehrte = (c, w, h, S, t, R) => {
  const hz = S.hz * h, P0 = (f) => [w * (0.08 + 0.84 * f), h * (0.5 - 0.28 * Math.sin(f * Math.PI * 1.6 + 0.4) + 0.08 * Math.sin(f * 9 + t * 0.6))];
  c.globalCompositeOperation = 'lighter';
  const head = (t * 0.18) % 1;
  for (let k = 0; k < 60; k++) { const f = k / 60, [x, y] = P0(f), near = Math.max(0, 1 - Math.abs(f - head) * 5); kbDot(c, x, y, 1 + 1.2 * near, k % 2 ? S.a : S.b, 0.25 + 0.6 * near); }
  const [hx, hy] = P0(head); kbGlow(c, hx, hy, 14, S.b, 0.6);
  for (let i = 0; i < 28; i++) { const f = R(), [x, y] = P0(f), fall = (t * (0.15 + 0.2 * R()) + R()) % 1, yy = y + fall * (hz - y); kbDot(c, x + Math.sin(t + i) * 3, yy, 0.9, S.a, 0.7 * (1 - fall)); }
};

// Ganges-Dämmerung: a low sun over the river, temples on the far bank, lamps floating, the Teental's 16 beats as a ring
KB_M.fluss = (c, w, h, S, t, R) => {
  const hz = S.hz * h, sx = w * 0.42, sy = hz - h * 0.1;
  const sky = c.createLinearGradient(0, 0, 0, hz); sky.addColorStop(0, kbA(S.b, 0.0)); sky.addColorStop(1, kbA(S.b, 0.38)); c.fillStyle = sky; c.fillRect(0, 0, w, hz);
  kbSun(c, sx, sy, h * 0.1, S.a, 1);
  c.fillStyle = kbA('#1a0812', 0.96);
  const temple = (x, s) => { c.fillRect(x - s * 0.5, hz - s * 0.5, s, s * 0.5 + 1); c.beginPath(); c.moveTo(x - s * 0.32, hz - s * 0.5); c.quadraticCurveTo(x - s * 0.2, hz - s * 1.3, x, hz - s * 1.55); c.quadraticCurveTo(x + s * 0.2, hz - s * 1.3, x + s * 0.32, hz - s * 0.5); c.fill(); };
  c.fillRect(0, hz - h * 0.025, w, h * 0.025 + 1);
  temple(w * 0.12, h * 0.1); temple(w * 0.2, h * 0.07); temple(w * 0.72, h * 0.12); temple(w * 0.84, h * 0.08); c.fillRect(w * 0.6, hz - h * 0.05, w * 0.06, h * 0.05);
  const water = c.createLinearGradient(0, hz, 0, h); water.addColorStop(0, kbA(kbMix(S.b, '#1a0a14', 0.7), 1)); water.addColorStop(1, '#0a0508'); c.fillStyle = water; c.fillRect(0, hz, w, h - hz);
  c.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 12; k++) { const y = hz + 3 + k * (h - hz) / 13, wd = h * 0.1 * (1 - k / 16) * (0.7 + 0.3 * Math.sin(t * 2 + k * 1.7)); kbLine(c, [[sx - wd + Math.sin(t + k) * 3, y], [sx + wd + Math.sin(t + k) * 3, y]], S.a, 0.55 - k * 0.035, 1.1); }
  for (let i = 0; i < 7; i++) { const x = (w * R() + t * 4) % w, y = hz + (h - hz) * (0.25 + 0.6 * R()); kbGlow(c, x, y, 4, '#ffcf6a', 0.75); kbLine(c, [[x, y + 2], [x, y + 7]], '#ffcf6a', 0.3, 1); }
  const X = w * 0.86, Y = h * 0.2, rr = h * 0.11, beat = Math.floor(kbBeat(S, t) * 2) % 16;
  for (let k = 0; k < 16; k++) { const a = -Math.PI / 2 + (k / 16) * KB_TAU, clap = k === 0 || k === 4 || k === 12, wave = k === 8; kbDot(c, X + Math.cos(a) * rr, Y + Math.sin(a) * rr, clap ? 1.8 : wave ? 1.4 : 0.9, k === beat ? '#ffffff' : clap ? S.a : S.b, k === beat ? 0.95 : wave ? 0.35 : 0.6); }
};

// Bali-Nacht: kettle gongs in a row under a deep night, each pair shimmering against itself
KB_M.gamelan = (c, w, h, S, t, R) => {
  const hz = S.hz * h, n = 7, b = kbBeat(S, t);
  for (let i = 0; i < 34; i++) kbDot(c, w * R(), hz * 0.7 * R(), 0.5 + 0.5 * R(), '#dfe4ff', 0.3 + 0.4 * Math.sin(t + i) ** 2);
  c.globalCompositeOperation = 'lighter'; kbGlow(c, w * 0.5, hz, w * 0.55, S.b, 0.16); c.globalCompositeOperation = 'source-over';
  for (let k = 0; k < n; k++) {
    const x = w * (0.1 + 0.8 * k / (n - 1)), r = h * 0.075, y = hz - r * 0.55, lit = kbHit(b * 0.5 + k * 0.29);
    c.globalCompositeOperation = 'lighter';
    kbGlow(c, x, y - r * 0.4, r * 2.6, S.a, 0.15 + 0.4 * lit);
    const beatPh = Math.sin(t * 6 + k) * 0.5 + 0.5; kbRing(c, x, y - r * 0.4, r * (1.4 + 0.6 * lit), S.a, 0.2 * lit * beatPh, 0.8); kbRing(c, x, y - r * 0.4, r * (1.55 + 0.6 * lit), S.a, 0.2 * lit * (1 - beatPh), 0.8);
    c.globalCompositeOperation = 'source-over';
    const g = c.createRadialGradient(x - r * 0.3, y - r * 0.6, 0, x, y - r * 0.2, r * 1.1); g.addColorStop(0, kbMix(S.a, '#fff1c8', 0.35)); g.addColorStop(1, kbMix(S.a, '#2a1806', 0.65));
    c.fillStyle = g; c.beginPath(); c.ellipse(x, y, r, r * 0.55, 0, Math.PI, 0); c.lineTo(x + r, y + r * 0.25); c.lineTo(x - r, y + r * 0.25); c.fill();
    kbDot(c, x, y - r * 0.55, r * 0.28, kbMix(S.a, '#fff6dc', 0.4), 0.95);
  }
};

// Traumzeit: red earth, a big low sun, the drone a long breathing wave, clapsticks counting
KB_M.traumzeit = (c, w, h, S, t, R) => {
  const hz = S.hz * h;
  kbSun(c, w * 0.3, hz - h * 0.02, h * 0.17, S.a, 0.95);
  c.globalCompositeOperation = 'lighter';
  [[0.3, 1, 0.75, 1.7], [0.36, 2, 0.32, 1], [0.24, 0.5, 0.25, 0.8]].forEach(([y0, fq, al, lw], k) => {
    const pts = []; for (let j = 0; j <= 90; j++) { const f = j / 90, gr = 1 + 0.4 * Math.sin(t * 0.6 + k); pts.push([f * w, h * y0 + Math.sin(f * KB_TAU * fq + t * 1.2 + k) * h * 0.045 * gr * Math.sin(f * Math.PI)]); }
    kbLine(c, pts, k ? S.b : S.a, al * 0.35, lw * 3); kbLine(c, pts, k ? S.b : S.a, al, lw);
  });
  c.globalCompositeOperation = 'source-over';
  c.fillStyle = kbA('#1a0804', 0.95);
  for (let i = 0; i < 4; i++) { const x = w * (0.55 + 0.12 * i + 0.04 * R()), s = h * (0.04 + 0.04 * R()); c.beginPath(); c.moveTo(x - s * 1.6, hz + 1); c.quadraticCurveTo(x, hz - s * 1.2, x + s * 1.6, hz + 1); c.fill(); }
  const b = Math.floor(kbBeat(S, t)) % 8;
  for (let k = 0; k < 8; k++) { const x = w * (0.08 + k * 0.035), on = k === b; c.strokeStyle = kbA(S.b, on ? 0.95 : 0.4); c.lineWidth = 1.4; c.beginPath(); c.moveTo(x - 2, hz - 5 - (on ? 2 : 0)); c.lineTo(x + 2, hz - 11 - (on ? 2 : 0)); c.stroke(); }
};

// Steppenwind: far mountains in the haze, a yurt in the grass, the jaw harp's overtone melody drawn across the sky
KB_M.steppe = (c, w, h, S, t, R) => {
  const hz = S.hz * h;
  c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 4; i++) { const y = h * (0.08 + 0.06 * i), x = ((t * 5 + R() * w * 1.4) % (w * 1.4)) - w * 0.2; kbGlow(c, x, y, w * 0.14, '#dfe8f2', 0.06); }
  c.globalCompositeOperation = 'source-over';
  [[0.18, 0.5, 0.13], [0.1, 0.72, 0.09]].forEach(([amp, mix, a0], j) => {
    const g = c.createLinearGradient(0, hz - h * 0.25, 0, hz); g.addColorStop(0, kbA(kbMix(S.sky, S.b, mix * 0.5), 0.9)); g.addColorStop(1, kbA(kbMix(S.sky, '#0e1216', 0.3), 0.95));
    c.fillStyle = g; c.beginPath(); c.moveTo(0, hz);
    for (let x = 0; x <= w + 1; x += w / 18) c.lineTo(x, hz - h * (a0 * (1 - j * 0.2) + amp * Math.abs(Math.sin(x * (0.017 + j * 0.01) + 1.3 + j)) * (0.6 + 0.4 * Math.sin(x * 0.05 + j))));
    c.lineTo(w, hz); c.fill();
  });
  const yx = w * 0.72, ys = h * 0.075;
  c.fillStyle = kbMix(S.a, '#f4ead4', 0.55); c.beginPath(); c.moveTo(yx - ys, hz + 1); c.lineTo(yx - ys * 0.95, hz - ys * 0.65); c.quadraticCurveTo(yx, hz - ys * 1.45, yx + ys * 0.95, hz - ys * 0.65); c.lineTo(yx + ys, hz + 1); c.fill();
  c.strokeStyle = kbA('#8a6a40', 0.6); c.lineWidth = 0.7; c.beginPath(); c.moveTo(yx - ys * 0.95, hz - ys * 0.65); c.lineTo(yx + ys * 0.95, hz - ys * 0.65); c.stroke();
  c.globalCompositeOperation = 'lighter'; kbGlow(c, yx, hz - ys * 0.25, ys * 0.8, '#ffb35c', 0.5); c.globalCompositeOperation = 'source-over';
  c.fillStyle = kbA('#ffb35c', 0.9); c.fillRect(yx - ys * 0.16, hz - ys * 0.45, ys * 0.32, ys * 0.45 + 1);
  c.strokeStyle = kbA(kbMix(S.a, '#4a4020', 0.45), 0.85); c.lineWidth = 0.8;
  for (let i = 0; i < 70; i++) { const x = w * R(), ht = h * (0.03 + 0.06 * R()), lean = 4 + Math.sin(t * 1.4 + x * 0.04) * 3; c.beginPath(); c.moveTo(x, hz + 1); c.quadraticCurveTo(x + lean * 0.4, hz - ht * 0.5, x + lean, hz - ht); c.stroke(); }
  c.globalCompositeOperation = 'lighter';
  const lev = (seg) => 5 + (kbHash(S.key + seg) % 6), pts = [];
  for (let j = 0; j <= 160; j++) { const f = j / 160, u = f * 8 + t * 0.5, s0 = Math.floor(u), q = u - s0, e = q < 0.55 ? 0 : (1 - Math.cos(((q - 0.55) / 0.45) * Math.PI)) / 2, n = lev(s0) + (lev(s0 + 1) - lev(s0)) * e; pts.push([f * w, h * 0.34 - (n - 5) * h * 0.022 + Math.sin(f * 140 + t * 6) * h * 0.006]); }
  kbLine(c, pts, S.a, 0.25, 3); kbLine(c, pts, S.a, 0.85, 1);
};

// Kirschblüte: a blossoming branch, petals falling over the koto's strings and bridges
KB_M.kirsche = (c, w, h, S, t, R) => {
  const hz = S.hz * h;
  c.strokeStyle = kbA(S.a, 0.35); c.lineWidth = 0.6;
  for (let k = 0; k < 13; k++) { const y0 = hz - 2 - k * 1.6; c.beginPath(); c.moveTo(w * 0.05, y0); c.lineTo(w * 0.95, y0 - h * 0.08); c.stroke(); kbDot(c, w * (0.3 + 0.04 * (k % 7)), y0 - h * 0.03 - 1, 1.1, '#fff6ea', 0.6); }
  c.strokeStyle = kbA('#2a1612', 0.95); c.lineWidth = 3; c.lineCap = 'round';
  c.beginPath(); c.moveTo(-2, h * 0.08); c.quadraticCurveTo(w * 0.3, h * 0.12, w * 0.55, h * 0.3); c.stroke();
  c.lineWidth = 1.6; c.beginPath(); c.moveTo(w * 0.3, h * 0.14); c.quadraticCurveTo(w * 0.42, h * 0.04, w * 0.58, h * 0.06); c.stroke();
  const flower = (x, y, s, a) => { c.save(); c.translate(x, y); c.rotate(a); c.fillStyle = kbA(S.a, 0.92); for (let k = 0; k < 5; k++) { c.rotate(KB_TAU / 5); c.beginPath(); c.ellipse(0, -s, s * 0.6, s, 0, 0, KB_TAU); c.fill(); } kbDot(c, 0, 0, s * 0.35, '#ffe08a', 0.9); c.restore(); };
  for (let i = 0; i < 9; i++) { const f = R(); flower(w * (0.06 + 0.5 * f), h * (0.09 + 0.2 * f * f) + (R() - 0.5) * 8, 2.2 + 1.6 * R(), R() * 3); }
  for (let i = 0; i < 14; i++) { const f = (t * (0.05 + 0.05 * R()) + R()) % 1, x = w * (0.1 + 0.8 * R()) + Math.sin(t * 1.3 + i) * 10 + f * 20, y = h * 0.1 + f * (hz - h * 0.12); c.save(); c.translate(x, y); c.rotate(t * 2 + i); c.fillStyle = kbA(S.a, 0.8 * (1 - f * 0.4)); c.beginPath(); c.ellipse(0, 0, 1.4, 2.6, 0, 0, KB_TAU); c.fill(); c.restore(); }
};

// Handpan-Kreis: the steel seen from above – the ding in the middle, its tone fields around (one per note of its scale)
KB_M.handpan = (c, w, h, S, t, R) => {
  const X = w * 0.5, Y = h * 0.5, r = h * 0.43, n = Math.max(7, Math.min(9, S.nNotes + 3)), b = kbBeat(S, t);
  const g = c.createRadialGradient(X - r * 0.35, Y - r * 0.4, r * 0.1, X, Y, r);
  g.addColorStop(0, kbMix(S.a, '#ffffff', 0.35)); g.addColorStop(0.5, kbMix(S.a, '#203040', 0.55)); g.addColorStop(1, kbMix(S.a, '#05080c', 0.82));
  c.fillStyle = g; c.beginPath(); c.arc(X, Y, r, 0, KB_TAU); c.fill();
  kbRing(c, X, Y, r, '#ffffff', 0.25, 0.8);
  const fld = (x, y, rx, lit) => { c.globalCompositeOperation = 'lighter'; kbGlow(c, x, y, rx * 2, S.b, 0.45 * lit); c.globalCompositeOperation = 'source-over'; c.strokeStyle = kbA(kbMix(S.b, '#ffffff', 0.4), 0.55 + 0.4 * lit); c.lineWidth = 0.8; c.beginPath(); c.ellipse(x, y, rx, rx * 0.8, Math.atan2(y - Y, x - X), 0, KB_TAU); c.stroke(); };
  fld(X, Y, r * 0.24, kbHit(b / 4));
  for (let k = 0; k < n; k++) { const a = -Math.PI / 2 + (k / n) * KB_TAU, x = X + Math.cos(a) * r * 0.66, y = Y + Math.sin(a) * r * 0.66; fld(x, y, r * 0.14, kbHit(b - k * 1.37)); }
};

// Nordlicht: curtains of light wandering over the field, stars behind; Zeitlupe slower and warm with a splash frozen
// mid-air, Polarfunk with ice and the circuit's sparks
KB_M.nordlicht = (c, w, h, S, t, R) => {
  const hz = S.hz * h, sl = S.va === 'zeit' ? 0.25 : 1;
  for (let i = 0; i < 30; i++) kbDot(c, w * R(), hz * 0.85 * R(), 0.4 + 0.5 * R(), '#e8f0ff', 0.3 + 0.4 * Math.sin(t * 1.5 * sl + i) ** 2);
  if (!S.strip) { const g = document.createElement('canvas'); g.width = 1; g.height = 64; const x = g.getContext('2d'), gr = x.createLinearGradient(0, 0, 0, 64); gr.addColorStop(0, kbA(S.b, 0)); gr.addColorStop(0.2, kbA(S.b, 0.1)); gr.addColorStop(0.6, kbA(S.a, 0.16)); gr.addColorStop(1, kbA(S.a, 0)); x.fillStyle = gr; x.fillRect(0, 0, 1, 64); S.strip = g; }
  c.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 3; k++) {
    const base = h * (0.16 + 0.1 * k), amp = h * 0.08, ph = R() * 10;
    for (let x = 0; x < w; x += 2.2) {
      const y0 = base + Math.sin(x / w * 4 + ph + t * 0.35 * sl) * amp + Math.sin(x / w * 11 + ph * 2 - t * 0.6 * sl) * amp * 0.25, len = h * (0.22 + 0.12 * Math.sin(x / w * 7 + ph + t * 0.5 * sl));
      c.drawImage(S.strip, x, y0, 1.5, len);
    }
  }
  c.globalCompositeOperation = 'source-over';
  if (S.va === 'polar') {
    c.fillStyle = kbA('#dff4ff', 0.55); for (let i = 0; i < 5; i++) { const x = w * (0.04 + 0.21 * i), wd = w * (0.08 + 0.07 * R()); c.beginPath(); c.moveTo(x, hz + 1); c.lineTo(x + wd * 0.25, hz - 5 - 4 * R()); c.lineTo(x + wd * 0.6, hz - 3); c.lineTo(x + wd, hz + 1); c.fill(); }
    const R2 = kbRng(S.seed + Math.floor(t * 6)); c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 7; i++) { const x = w * R2(), y = h * 0.65 * R2(); c.fillStyle = kbA(i % 2 ? S.b : S.a, 0.75); c.fillRect(Math.round(x), Math.round(y), 2 + Math.round(8 * R2()), 1); }
  }
  if (S.va === 'zeit') {
    // a drop's crown, frozen
    const X = w * 0.5, Y = hz - 1, rx = w * 0.13, ry = h * 0.035, dropY = h * 0.26 + Math.sin(t * 0.15) * 2;
    c.strokeStyle = kbA(kbMix(S.a, '#ffffff', 0.5), 0.75); c.lineWidth = 1; c.beginPath(); c.ellipse(X, Y, rx, ry, 0, 0, KB_TAU); c.stroke();
    for (let k = 0; k < 13; k++) {
      const a = Math.PI + (k / 12) * Math.PI, bx = X + Math.cos(a) * rx, by = Y + Math.sin(a) * ry, ht = h * (0.07 + 0.05 * Math.sin(k * 2.1) ** 2), lean = Math.cos(a) * 5;
      c.strokeStyle = kbA(kbMix(S.a, '#ffffff', 0.45), 0.7); c.lineWidth = 1.4; c.beginPath(); c.moveTo(bx, by); c.quadraticCurveTo(bx + lean * 0.4, by - ht * 0.6, bx + lean, by - ht); c.stroke();
      kbDot(c, bx + lean * 1.1, by - ht - 3, 1.5, kbMix(S.a, '#ffffff', 0.6), 0.85);
    }
    c.fillStyle = kbA(kbMix(S.a, '#ffffff', 0.5), 0.85); c.beginPath(); c.moveTo(X, dropY - h * 0.07); c.quadraticCurveTo(X + 5, dropY - 1, X, dropY + 4); c.quadraticCurveTo(X - 5, dropY - 1, X, dropY - h * 0.07); c.fill();
    c.fillStyle = kbA(S.a, 0.7); c.font = '500 ' + Math.round(h * 0.055) + 'px ' + (COL.fontNum || 'monospace'); c.textAlign = 'right'; c.fillText('½×', w * 0.95, h * 0.12);
  }
};

// Schimmerdom: arches of a dome, sparks rising and doubling – each an octave above the last
KB_M.dom = (c, w, h, S, t, R) => {
  const hz = S.hz * h, X = w * 0.5;
  for (let k = 0; k < 4; k++) { const r = h * (0.3 + 0.12 * k); c.strokeStyle = kbA(S.b, 0.32 - k * 0.06); c.lineWidth = 0.8; c.beginPath(); c.arc(X, hz, r, Math.PI, 0); c.stroke(); }
  for (let k = 0; k < 9; k++) { const a = Math.PI + (k / 8) * Math.PI; c.strokeStyle = kbA(S.b, 0.12); c.beginPath(); c.moveTo(X + Math.cos(a) * h * 0.3, hz + Math.sin(a) * h * 0.3); c.lineTo(X + Math.cos(a) * h * 0.66, hz + Math.sin(a) * h * 0.66); c.stroke(); }
  c.globalCompositeOperation = 'lighter';
  kbGlow(c, X, hz, h * 0.4, S.a, 0.25);
  for (let i = 0; i < 5; i++) {
    const x = X + (R() - 0.5) * w * 0.6, f = (t * 0.12 + R()) % 1;
    for (let o = 0; o < 4; o++) { const y = hz - (hz - h * 0.06) * (1 - 1 / 2 ** (o + f * 0.999)) ; kbGlow(c, x + o * 1.5, y, 4 - o * 0.6, '#ffffff', (0.7 - o * 0.15) * (1 - f * 0.5)); }
  }
};

// Ätherfunk: the Palme's string fan, a wave gliding with its vibrato on the old green screen
KB_M.aether = (c, w, h, S, t, R) => {
  const hz = S.hz * h, X = w * 0.78, Y = hz - 2;
  c.strokeStyle = kbA(S.b, 0.55); c.lineWidth = 0.6;
  for (let k = 0; k < 12; k++) { const a = Math.PI * (1.2 + 0.6 * k / 11); c.beginPath(); c.moveTo(X, Y); c.quadraticCurveTo(X + Math.cos(a) * h * 0.4, Y + Math.sin(a) * h * 0.25, X + Math.cos(a) * h * 0.55, Y + Math.sin(a) * h * 0.62); c.stroke(); }
  c.fillStyle = kbA(S.b, 0.8); c.fillRect(X - 3, Y - 6, 6, 6);
  c.globalCompositeOperation = 'lighter';
  for (let y = 0; y < hz; y += 3) { c.fillStyle = kbA(S.a, 0.025); c.fillRect(0, y, w, 1); }
  const pts = []; for (let j = 0; j <= 100; j++) { const x = (j / 100) * w * 0.7, gl = 0.08 + 0.04 * Math.sin(t * 0.5 + j / 30); pts.push([x, h * 0.42 + Math.sin(x * gl * 3 + t * 4) * h * (0.12 + 0.02 * Math.sin(t * 6))]); }
  kbLine(c, pts, S.a, 0.25, 4); kbLine(c, pts, S.a, 0.9, 1.1);
};

// Tiefseegesang: the whale far below, its song drawn as long arcs, a heartbeat rising from the deep
KB_M.wal = (c, w, h, S, t, R) => {
  c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 3; i++) { const g = c.createLinearGradient(0, 0, 0, h * 0.7); g.addColorStop(0, kbA(S.b, 0.1)); g.addColorStop(1, kbA(S.b, 0)); c.fillStyle = g; const x = w * (0.25 + 0.25 * i) + Math.sin(t * 0.2 + i) * 6; c.beginPath(); c.moveTo(x - 6, 0); c.lineTo(x + 6, 0); c.lineTo(x + 30, h * 0.7); c.lineTo(x + 6, h * 0.7); c.fill(); }
  for (let k = 0; k < 4; k++) { const pts = [], ph = R() * 6, y0 = h * (0.1 + 0.07 * k); for (let j = 0; j <= 40; j++) { const f = j / 40; pts.push([w * (0.05 + 0.9 * f), y0 + Math.sin(f * Math.PI * (1.2 + k * 0.3) + ph + t * 0.3) * h * 0.05]); } kbLine(c, pts, S.b, 0.28 + 0.2 * Math.sin(t * 0.5 + k) ** 2, 1); }
  const hb = (kbBeat(S, t) / 2) % 1; for (let k = 0; k < 2; k++) { const f = (hb + k * 0.5) % 1; c.strokeStyle = kbA(S.a, 0.28 * (1 - f)); c.lineWidth = 1; c.beginPath(); c.ellipse(w * 0.5, h * 0.98, w * (0.1 + f * 0.5), h * (0.03 + f * 0.12), 0, Math.PI, 0); c.stroke(); }
  c.globalCompositeOperation = 'source-over';
  // a humpback: long body, the long pectoral fin, the fluke
  const X = w * 0.48 + Math.sin(t * 0.15) * 6, Y = h * 0.6, L = w * 0.62;
  c.save(); c.translate(X, Y); c.rotate(-0.06);
  c.fillStyle = kbA(kbMix(S.a, '#020a16', 0.72), 0.95); c.beginPath();
  c.moveTo(-0.5 * L, 0.01 * L);
  c.quadraticCurveTo(-0.46 * L, -0.07 * L, -0.25 * L, -0.08 * L);
  c.quadraticCurveTo(0.05 * L, -0.09 * L, 0.18 * L, -0.06 * L);
  c.lineTo(0.22 * L, -0.085 * L); c.lineTo(0.26 * L, -0.05 * L);
  c.quadraticCurveTo(0.36 * L, -0.03 * L, 0.42 * L, -0.01 * L);
  c.quadraticCurveTo(0.48 * L, -0.09 * L, 0.56 * L, -0.11 * L); c.quadraticCurveTo(0.53 * L, -0.04 * L, 0.5 * L, 0.0 * L);
  c.quadraticCurveTo(0.54 * L, 0.05 * L, 0.57 * L, 0.11 * L); c.quadraticCurveTo(0.48 * L, 0.08 * L, 0.42 * L, 0.02 * L);
  c.quadraticCurveTo(0.2 * L, 0.06 * L, -0.12 * L, 0.08 * L);
  c.quadraticCurveTo(-0.16 * L, 0.2 * L, -0.02 * L, 0.27 * L); c.quadraticCurveTo(-0.15 * L, 0.24 * L, -0.24 * L, 0.08 * L);
  c.quadraticCurveTo(-0.42 * L, 0.07 * L, -0.5 * L, 0.01 * L); c.fill();
  c.strokeStyle = kbA(S.a, 0.4); c.lineWidth = 0.7; c.stroke();
  c.strokeStyle = kbA(S.a, 0.18); for (let k = 0; k < 5; k++) { c.beginPath(); c.moveTo(-0.44 * L + k * 3, 0.03 * L); c.lineTo(-0.2 * L + k * 3, 0.06 * L); c.stroke(); }
  kbDot(c, -0.38 * L, -0.015 * L, 1.1, S.b, 0.8);
  c.restore();
  c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 20; i++) kbDot(c, w * R(), h * (0.4 + 0.5 * R()), 0.6, S.b, 0.3 + 0.3 * Math.sin(t + i) ** 2);
};

// Endlose Treppe: a spiral staircase seen from the side – steps forever rising, fading in below and out above
KB_M.treppe = (c, w, h, S, t, R) => {
  const X = w * 0.5, rad = w * 0.24, n = 26, per = 9, dy = (h * 0.9) / n, off = (t * 0.7) % 1, steps = [];
  for (let i = -2; i < n + 2; i++) { const k = i + off, a = (k / per) * KB_TAU, y = h * 0.96 - k * dy, f = k / n; if (f < -0.02 || f > 1.02) continue; steps.push({ a, y, fade: Math.sin(Math.max(0, Math.min(1, f)) * Math.PI) ** 0.8, front: Math.sin(a) }); }
  c.globalCompositeOperation = 'lighter';
  kbGlow(c, X, h * 0.06, h * 0.32, S.b, 0.2);
  const draw = (s) => {
    const xo = X + Math.cos(s.a) * rad, d = 0.5 + 0.5 * s.front, col = kbMix(S.b, S.a, d), al = (0.15 + 0.7 * d) * s.fade;
    c.fillStyle = kbA(col, al * 0.55); c.beginPath(); c.moveTo(X, s.y); c.lineTo(xo, s.y - (d - 0.5) * 3); c.lineTo(xo, s.y + 3 - (d - 0.5) * 3); c.lineTo(X, s.y + 3); c.fill();
    c.strokeStyle = kbA(col, al); c.lineWidth = 0.7 + d; c.beginPath(); c.moveTo(X, s.y); c.lineTo(xo, s.y - (d - 0.5) * 3); c.stroke();
    kbDot(c, xo, s.y - (d - 0.5) * 3, 0.8 + d, '#ffffff', al * 0.7);
  };
  steps.filter((s) => s.front < 0).forEach(draw);
  kbLine(c, [[X, 0], [X, h]], S.b, 0.35, 1.4);
  steps.filter((s) => s.front >= 0).forEach(draw);
  const rail = steps.map((s) => [X + Math.cos(s.a) * rad, s.y - h * 0.08]);
  for (let i = 1; i < rail.length; i++) { const d = 0.5 + 0.5 * steps[i].front; kbLine(c, [rail[i - 1], rail[i]], S.a, 0.25 * d * steps[i].fade, 0.8); }
};

// Seltsamer Attraktor: the Rössler system itself, fitted into the picture (drawn once per size), a light running along it
KB_M.attraktor = (c, w, h, S, t, R) => {
  if (!KB.rossler) {
    const P = []; let x = 1, y = 1, z = 1; const dt = 0.012;
    for (let i = 0; i < 9000; i++) { const dx = -y - z, dy = x + 0.2 * y, dz = 0.2 + z * (x - 5.7); x += dx * dt; y += dy * dt; z += dz * dt; if (i > 600 && i % 2 === 0) P.push([x + y * 0.42, y * 0.5 - z * 0.75, z]); }
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const [px, py] of P) { x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py); }
    KB.rossler = { P, x0, x1, y0, y1 };
  }
  const { P, x0, x1, y0, y1 } = KB.rossler, sc = Math.min((w * 0.86) / (x1 - x0), (h * 0.84) / (y1 - y0)), ox = (w - (x1 - x0) * sc) / 2 - x0 * sc, oy = (h - (y1 - y0) * sc) / 2 - y0 * sc;
  const dpr = c.getTransform ? c.getTransform().a : 1, key = w + 'x' + h + '@' + dpr;
  if (!S.att || S.att.k !== key) {
    const cv = document.createElement('canvas'); cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); const x = cv.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0);
    x.globalCompositeOperation = 'lighter'; x.lineWidth = 0.6;
    for (const hi of [false, true]) { x.strokeStyle = kbA(hi ? S.b : S.a, hi ? 0.55 : 0.2); x.beginPath(); for (let i = 1; i < P.length; i++) { const p = P[i - 1], q = P[i]; if ((q[2] > 2) !== hi) continue; x.moveTo(ox + p[0] * sc, oy + p[1] * sc); x.lineTo(ox + q[0] * sc, oy + q[1] * sc); } x.stroke(); }
    S.att = { k: key, cv };
  }
  c.globalCompositeOperation = 'lighter';
  kbGlow(c, w * 0.5, h * 0.55, h * 0.5, S.a, 0.12);
  c.drawImage(S.att.cv, 0, 0, w, h);
  const k = Math.floor((t * 160) % P.length), p = P[k]; kbGlow(c, ox + p[0] * sc, oy + p[1] * sc, 10, '#ffffff', 0.8);
};

// Tunnelblick: rings rushing toward you, their colour sweeping like the flanger's comb
KB_M.tunnel = (c, w, h, S, t, R) => {
  const X = w * 0.5, Y = h * 0.48;
  c.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 18; k++) {
    const f = ((k / 18 + t * 0.12) % 1), s = 0.02 + f ** 2.2 * 1.6, col = kbMix(S.a, S.b, 0.5 + 0.5 * Math.sin(k * 0.8 + t * 1.3));
    c.strokeStyle = kbA(col, 0.55 * Math.min(1, f * 3) * (1 - f * 0.3)); c.lineWidth = 0.6 + f * 2;
    c.beginPath(); c.ellipse(X + Math.sin(t * 0.4 + f * 3) * 6 * f, Y, w * 0.5 * s, h * 0.38 * s, 0, 0, KB_TAU); c.stroke();
  }
  kbGlow(c, X, Y, h * 0.12, '#ffffff', 0.5);
};

// Westküsten-Bongos: patch cords looping across a panel, a folded wave on the scope, pings blinking per lane
KB_M.westkueste = (c, w, h, S, t, R) => {
  const hz = S.hz * h, cols = [S.a, S.b, '#ffd166', '#ff5f7a'];
  for (let k = 0; k < 5; k++) { const x0 = w * (0.05 + 0.2 * R()), y0 = h * (0.1 + 0.3 * R()), x1 = w * (0.6 + 0.35 * R()), y1 = h * (0.1 + 0.4 * R()); c.strokeStyle = kbA(cols[k % 4], 0.8); c.lineWidth = 2; c.lineCap = 'round'; c.beginPath(); c.moveTo(x0, y0); c.bezierCurveTo(x0 + w * 0.05, hz * (0.9 + 0.1 * R()), x1 - w * 0.05, hz * (0.85 + 0.1 * R()), x1, y1); c.stroke(); kbDot(c, x0, y0, 2.4, '#e8e2da', 0.9); kbDot(c, x1, y1, 2.4, '#e8e2da', 0.9); }
  const X = w * 0.5, Y = h * 0.36, r = h * 0.2;
  c.fillStyle = 'rgba(6,10,8,0.85)'; c.beginPath(); c.arc(X, Y, r, 0, KB_TAU); c.fill(); kbRing(c, X, Y, r, '#9a8d80', 0.6, 1);
  c.globalCompositeOperation = 'lighter';
  const fold = 1.5 + 1.2 * Math.sin(t * 0.8), pts = []; for (let j = 0; j <= 60; j++) { const f = j / 60, v = Math.sin(Math.sin(f * KB_TAU * 2 + t * 3) * fold * Math.PI / 2); pts.push([X - r * 0.8 + f * r * 1.6, Y + v * r * 0.55]); }
  kbLine(c, pts, '#7dffb2', 0.85, 1);
  const b = kbBeat(S, t); (S.on.length ? S.on : [{ col: S.a, steps: 8, puls: 3, rot: 0, div: 0.25 }]).forEach((L, j) => { const pat = euclid(L.steps, L.puls, L.rot), k = Math.floor(b / (L.div || 0.25)) % pat.length; kbGlow(c, w * (0.12 + 0.08 * j), hz - 6, 6, L.col, pat[k] ? 0.9 : 0.15); });
};

// Kurzschluss: the toy's shape torn into shifted slices, colour split, sparks
KB_M.glitch = (c, w, h, S, t, R) => {
  const R2 = kbRng(S.seed + Math.floor(t * 8));
  for (let y = 0; y < h; y += 2) { c.fillStyle = 'rgba(255,255,255,0.022)'; c.fillRect(0, y, w, 1); }
  for (let i = 0; i < 12; i++) { const y = h * R(), hh = 2 + h * 0.06 * R(), dx = (R2() - 0.5) * w * 0.15; c.fillStyle = kbA(i % 3 ? S.a : S.b, 0.32 + 0.3 * R()); c.fillRect(w * 0.2 * R() + dx, y, w * (0.2 + 0.45 * R()), hh); }
  c.globalCompositeOperation = 'lighter';
  const X = w * 0.5, Y = h * 0.48;
  [[-2, S.a], [2, S.b]].forEach(([o, col]) => { c.strokeStyle = kbA(col, 0.8); c.lineWidth = 2; c.strokeRect(X - w * 0.12 + o, Y - h * 0.2, w * 0.24, h * 0.4); kbRing(c, X + o, Y - h * 0.05, h * 0.07, col, 0.8, 2); c.beginPath(); c.moveTo(X - w * 0.06 + o, Y + h * 0.1); c.lineTo(X + w * 0.06 + o, Y + h * 0.1); c.stroke(); });
  for (let i = 0; i < 12; i++) { const x = w * R2(), y = h * R2(); c.fillStyle = kbA('#ffffff', 0.8 * R2()); c.fillRect(Math.round(x / 3) * 3, Math.round(y / 3) * 3, 3, 3); }
};

// Kassettendeck: a cassette, its reels turning (a little unsteady), the tape packs, the written label
KB_M.kassette = (c, w, h, S, t, R) => {
  const X = w * 0.5, Y = h * 0.44, cw = w * 0.6, ch = h * 0.48, wob = 1 + 0.06 * Math.sin(t * 2.3);
  const body = c.createLinearGradient(0, Y - ch / 2, 0, Y + ch / 2); body.addColorStop(0, kbMix(S.a, '#3a2618', 0.6)); body.addColorStop(1, kbMix(S.a, '#140c06', 0.82));
  c.fillStyle = body; c.beginPath(); c.roundRect ? c.roundRect(X - cw / 2, Y - ch / 2, cw, ch, 6) : c.rect(X - cw / 2, Y - ch / 2, cw, ch); c.fill();
  c.strokeStyle = kbA(S.a, 0.45); c.lineWidth = 0.9; c.stroke();
  const lab = c.createLinearGradient(0, Y - ch * 0.42, 0, Y + ch * 0.1); lab.addColorStop(0, kbMix(S.a, '#fff4e0', 0.55)); lab.addColorStop(1, kbMix(S.a, '#f0d8b0', 0.4));
  c.fillStyle = lab; c.beginPath(); c.roundRect ? c.roundRect(X - cw * 0.43, Y - ch * 0.42, cw * 0.86, ch * 0.56, 3) : c.rect(X - cw * 0.43, Y - ch * 0.42, cw * 0.86, ch * 0.56); c.fill();
  c.strokeStyle = kbA('#6a4a2a', 0.35); c.lineWidth = 0.6; for (let k = 0; k < 2; k++) { c.beginPath(); c.moveTo(X - cw * 0.38, Y - ch * (0.3 - k * 0.1)); c.lineTo(X + cw * 0.38, Y - ch * (0.3 - k * 0.1)); c.stroke(); }
  c.fillStyle = kbA('#5a2a14', 0.75); c.font = 'italic 500 ' + Math.round(h * 0.06) + 'px ' + (CSSV('--font-display') || 'serif'); c.textAlign = 'left'; c.fillText(S.va === 'chill' ? 'abend · ' + Math.round(S.bpm) : 'side A · ' + Math.round(S.bpm), X - cw * 0.37, Y - ch * 0.33);
  c.fillStyle = kbA(S.b, 0.9); c.fillRect(X + cw * 0.3, Y - ch * 0.42, cw * 0.13, ch * 0.56);
  c.fillStyle = 'rgba(10,6,4,0.92)'; c.beginPath(); c.roundRect ? c.roundRect(X - cw * 0.3, Y - ch * 0.12, cw * 0.6, ch * 0.24, ch * 0.12) : c.rect(X - cw * 0.3, Y - ch * 0.12, cw * 0.6, ch * 0.24); c.fill();
  [[-1, 0.62], [1, 0.38]].forEach(([sd, pack], j) => {
    const x = X + sd * cw * 0.19, y = Y, rh = ch * 0.085, a = t * 2.2 * wob * (j ? 1.3 : 1);
    kbDot(c, x, y, rh * (1.2 + pack * 1.4), kbMix(S.a, '#3a1e0e', 0.7), 0.95);
    kbDot(c, x, y, rh, '#f4ece0', 0.95);
    c.strokeStyle = '#2a1a10'; c.lineWidth = 1; for (let k = 0; k < 6; k++) { const q = a + (k / 6) * KB_TAU; c.beginPath(); c.moveTo(x + Math.cos(q) * rh * 0.45, y + Math.sin(q) * rh * 0.45); c.lineTo(x + Math.cos(q) * rh * 0.95, y + Math.sin(q) * rh * 0.95); c.stroke(); }
  });
  c.fillStyle = kbA(kbMix(S.a, '#1a1008', 0.6), 0.95); c.beginPath(); c.moveTo(X - cw * 0.32, Y + ch / 2); c.lineTo(X - cw * 0.26, Y + ch * 0.3); c.lineTo(X + cw * 0.26, Y + ch * 0.3); c.lineTo(X + cw * 0.32, Y + ch / 2); c.fill();
  for (const sx of [-0.2, 0, 0.2]) kbDot(c, X + cw * sx, Y + ch * 0.4, 1.4, '#0a0604', 0.9);
  for (const [sx, sy2] of [[-0.46, -0.42], [0.46, -0.42], [-0.46, 0.42], [0.46, 0.42]]) kbDot(c, X + cw * sx, Y + ch * sy2, 1.1, kbMix(S.a, '#ffffff', 0.3), 0.6);
};

// Achtbit-Himmel: dithered sky, pixel moon and mountains, the arpeggio climbing as blocks, the triangle bass zigzagging
KB_M.pixel = (c, w, h, S, t, R) => {
  const p = 3, hz = S.hz * h, b = kbBeat(S, t), snap = (v) => Math.round(v / p) * p;
  for (let band = 0; band < 5; band++) { const y = snap(hz * (0.45 + band * 0.11)); c.fillStyle = kbA(kbMix(S.a, S.sky, 0.6 - band * 0.08), 0.35); for (let yy = y; yy < y + p * 4; yy += p) for (let x = ((yy / p) % 2) * p; x < w; x += p * 2) c.fillRect(x, yy, p, p); c.fillRect(0, y + p * 4, w, hz - y - p * 4 + 2); }
  for (let i = 0; i < 30; i++) { const on = Math.sin(t * 2 + i * 1.7) > -0.3, x = snap(w * R()), y = snap(hz * 0.45 * R()); if (on) { c.fillStyle = kbA('#e8f0ff', 0.5 + 0.5 * R()); c.fillRect(x, y, p - 1, p - 1); } }
  const mx = snap(w * 0.8), my = snap(h * 0.18); c.fillStyle = '#fff4c8';
  for (let y = -5; y <= 5; y++) for (let x = -5; x <= 5; x++) if (x * x + y * y <= 26 && (x - 2) * (x - 2) + (y + 2) * (y + 2) > 14) c.fillRect(mx + x * p, my + y * p, p, p);
  c.fillStyle = kbA(kbMix(S.b, '#140a2a', 0.7), 1); for (let x = 0; x < w; x += p) { const ht = Math.round((h * 0.12 * (0.5 + 0.5 * Math.sin(x * 0.04) * Math.cos(x * 0.013 + 1))) / p) * p; c.fillRect(x, hz - ht, p, ht + 1); }
  const step = Math.floor(b * 4) % 8, arp = [0, 2, 4, 7, 4, 2, 5, 9];
  for (let k = 0; k < 8; k++) { const x = snap(w * (0.1 + k * 0.1)), y = snap(hz - h * 0.2 - arp[k] * p * 1.4); c.fillStyle = k === step ? '#ffffff' : k % 2 ? S.a : S.b; c.fillRect(x, y, p * 4, p * 2); }
  c.fillStyle = S.a; for (let x = 0; x < w; x += p) { const y = snap(hz - p * 3 - Math.abs(((x / p + Math.floor(b * 8)) % 8) - 4) * p * 0.7); c.fillRect(x, y, p - 1, p - 1); }
};

// Mitternachtstrap: the city at midnight, the 808 sliding down as one thick glowing curve, hi-hat rolls above
KB_M.trap = (c, w, h, S, t, R) => {
  const hz = S.hz * h, b = kbBeat(S, t);
  c.fillStyle = kbA('#05030a', 0.95);
  for (let x = 0; x < w;) { const bw = 6 + 14 * R(), bh = h * (0.08 + 0.22 * R()); c.fillRect(x, hz - bh, bw, bh + 1); for (let k = 0; k < 4; k++) if (R() < 0.45) kbDot(c, x + 3 + R() * (bw - 6), hz - bh * R(), 0.7, S.b, 0.6 + 0.3 * Math.sin(t + k)); c.fillStyle = kbA('#05030a', 0.95); x += bw + 1; }
  c.globalCompositeOperation = 'lighter';
  const pts = []; const gl = (b / 2) % 1; for (let j = 0; j <= 60; j++) { const f = j / 60; pts.push([w * f, h * (0.4 + 0.18 * Math.min(1, Math.max(0, (f - gl * 0.6) * 2))) + Math.sin(f * 30 - t * 10) * h * 0.012]); }
  kbLine(c, pts, S.a, 0.25, 6); kbLine(c, pts, S.a, 0.9, 1.4);
  const roll = Math.floor(b * 4) % 4 === 3;
  for (let k = 0; k < 32; k++) { const x = w * (0.08 + 0.84 * k / 32), on = roll ? true : k % 2 === 0; kbLine(c, [[x, h * 0.12], [x, h * 0.12 + (on ? 5 : 2)]], S.b, on ? 0.7 : 0.25, 1); }
};

// Spieluhrtraum: the pinned cylinder turning (slowing as the spring runs down), the comb's teeth, the key that winds it
KB_M.spieluhr = (c, w, h, S, t, R) => {
  const hz = S.hz * h, X = w * 0.44, Y = h * 0.4, cw = w * 0.42, cr = h * 0.11, sl = 1 / (1 + Math.max(0, t - KB_STILL) * 0.05), a = t * 0.8 * sl;
  const box = c.createLinearGradient(0, Y + cr, 0, hz); box.addColorStop(0, kbMix(S.a, '#6a3a28', 0.55)); box.addColorStop(1, kbMix(S.a, '#2a140c', 0.75));
  c.fillStyle = box; c.fillRect(X - cw * 0.62, Y + cr * 0.6, cw * 1.3, hz - Y - cr * 0.6 + 1);
  c.strokeStyle = kbA(S.a, 0.4); c.lineWidth = 0.8; c.strokeRect(X - cw * 0.62, Y + cr * 0.6, cw * 1.3, hz - Y - cr * 0.6);
  const g = c.createLinearGradient(0, Y - cr, 0, Y + cr); g.addColorStop(0, kbMix(S.b, '#ffffff', 0.5)); g.addColorStop(0.45, kbMix(S.b, '#8aa0b0', 0.3)); g.addColorStop(1, kbMix(S.b, '#1a2430', 0.75));
  c.fillStyle = g; c.fillRect(X - cw / 2, Y - cr, cw, cr * 2);
  c.beginPath(); c.ellipse(X + cw / 2, Y, cr * 0.32, cr, 0, -Math.PI / 2, Math.PI / 2); c.fill();
  c.fillStyle = kbMix(S.b, '#e8f0f8', 0.4); c.beginPath(); c.ellipse(X - cw / 2, Y, cr * 0.32, cr, 0, 0, KB_TAU); c.fill();
  for (let i = 0; i < 44; i++) { const u = R(), q = (R() * KB_TAU + a) % KB_TAU, vis = Math.cos(q); if (vis < 0.05) continue; kbDot(c, X - cw / 2 + u * cw, Y - Math.sin(q) * cr * 0.95, 0.9, '#fffaf0', 0.4 + 0.6 * vis); }
  const comb = c.createLinearGradient(0, Y + cr, 0, Y + cr + h * 0.2); comb.addColorStop(0, '#f2f4f6'); comb.addColorStop(1, '#8a949c');
  c.fillStyle = comb; for (let k = 0; k < 18; k++) { const x = X - cw / 2 + (k + 0.5) * cw / 18, len = h * (0.06 + 0.1 * (1 - k / 18)); c.fillRect(x - 0.9, Y + cr + 1, 1.8, len); }
  c.fillRect(X - cw / 2, Y + cr + h * 0.15, cw, 3);
  c.save(); c.translate(X + cw * 0.72, Y); c.rotate(a * 0.5); c.strokeStyle = kbA('#e8d8c0', 0.85); c.lineWidth = 1.4; c.beginPath(); c.moveTo(-6, 0); c.lineTo(6, 0); c.stroke(); c.fillStyle = kbA('#e8d8c0', 0.85); c.beginPath(); c.ellipse(9, -5, 4, 5.5, 0.3, 0, KB_TAU); c.ellipse(9, 5, 4, 5.5, -0.3, 0, KB_TAU); c.fill(); c.restore();
  c.globalCompositeOperation = 'lighter'; for (let i = 0; i < 8; i++) { const f = (t * 0.1 + R()) % 1; c.fillStyle = kbA(i % 2 ? S.a : S.b, 0.6 * (1 - f)); c.font = Math.round(h * 0.085) + 'px serif'; c.fillText('♪', w * (0.08 + 0.84 * R()), h * (0.28 - 0.25 * f)); }
};

// Pilzorakel: the oracle's mushroom, rings of its trance turning round it
KB_M.orakel = (c, w, h, S, t, R) => {
  const hz = S.hz * h, X = w * 0.5, cap = h * 0.28;
  c.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 7; k++) { const r = h * (0.18 + 0.08 * k), a0 = t * (k % 2 ? 0.3 : -0.25) + k; c.strokeStyle = kbA(k % 2 ? S.a : S.b, 0.32 - k * 0.03); c.lineWidth = 1; c.setLineDash([2 + k, 4 + k * 2]); c.lineDashOffset = -a0 * 20; c.beginPath(); c.ellipse(X, hz - cap * 1.05, r * 1.4, r * 0.9, 0, 0, KB_TAU); c.stroke(); }
  c.setLineDash([]);
  kbGlow(c, X, hz - cap, h * 0.5, S.a, 0.25);
  c.globalCompositeOperation = 'source-over';
  const sg = c.createLinearGradient(X - cap * 0.25, 0, X + cap * 0.25, 0); sg.addColorStop(0, '#fbf6f0'); sg.addColorStop(0.6, kbMix(S.b, '#d8d0c4', 0.85)); sg.addColorStop(1, '#8a8278');
  c.fillStyle = sg; c.beginPath(); c.moveTo(X - cap * 0.16, hz - cap * 0.9); c.quadraticCurveTo(X - cap * 0.26, hz - cap * 0.3, X - cap * 0.24, hz); c.lineTo(X + cap * 0.24, hz); c.quadraticCurveTo(X + cap * 0.26, hz - cap * 0.3, X + cap * 0.16, hz - cap * 0.9); c.fill();
  c.strokeStyle = kbA('#f0e8e0', 0.6); c.lineWidth = 1; c.beginPath(); c.ellipse(X, hz - cap * 0.62, cap * 0.22, cap * 0.05, 0, 0, Math.PI); c.stroke();
  const g = c.createRadialGradient(X - cap * 0.3, hz - cap * 1.4, cap * 0.1, X, hz - cap, cap * 1.2); g.addColorStop(0, kbMix(S.a, '#ffffff', 0.25)); g.addColorStop(1, kbMix(S.a, '#300818', 0.5));
  c.fillStyle = g; c.beginPath(); c.ellipse(X, hz - cap * 0.9, cap * 1.05, cap * 0.75, 0, Math.PI, 0); c.closePath(); c.fill();
  for (let i = 0; i < 9; i++) { const a = Math.PI + (0.12 + 0.76 * R()) * Math.PI, r = R() * 0.85; kbDot(c, X + Math.cos(a) * cap * r, hz - cap * 0.9 + Math.sin(a) * cap * 0.7 * r, 1.4 + 2 * R(), '#fff2f6', 0.9); }
};

// Chillhop-Abend: a window at night – rain on the glass, the moon and the city's lights, tea steaming on the sill
KB_M.fenster = (c, w, h, S, t, R) => {
  const hz = S.hz * h, x0 = w * 0.18, x1 = w * 0.82, y0 = h * 0.08, y1 = hz - h * 0.12;
  c.globalCompositeOperation = 'lighter'; kbGlow(c, w * 0.02, hz, h * 0.9, S.a, 0.16); c.globalCompositeOperation = 'source-over';
  const out = c.createLinearGradient(0, y0, 0, y1); out.addColorStop(0, kbMix(S.b, '#05060f', 0.82)); out.addColorStop(1, kbMix(S.b, '#1a1a30', 0.7)); c.fillStyle = out; c.fillRect(x0, y0, x1 - x0, y1 - y0);
  c.save(); c.beginPath(); c.rect(x0, y0, x1 - x0, y1 - y0); c.clip();
  kbSun(c, x1 - w * 0.12, y0 + h * 0.12, h * 0.055, kbMix(S.b, '#ffffff', 0.5), 0.9);
  c.fillStyle = 'rgba(6,6,14,0.95)'; for (let x = x0; x < x1;) { const bw = 5 + 10 * R(), bh = h * (0.05 + 0.12 * R()); c.fillRect(x, y1 - bh, bw, bh); for (let k = 0; k < 3; k++) if (R() < 0.5) { c.fillStyle = kbA(S.a, 0.7); c.fillRect(x + 1 + R() * (bw - 3), y1 - bh * R(), 1.5, 1.5); c.fillStyle = 'rgba(6,6,14,0.95)'; } x += bw + 1; }
  c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 26; i++) { const x = x0 + (x1 - x0) * R(), sp = 30 + 40 * R(), y = y0 + ((t * sp + R() * 200) % (y1 - y0)); kbLine(c, [[x, y], [x - 1.5, y + 6]], S.b, 0.35, 0.7); }
  for (let i = 0; i < 12; i++) kbDot(c, x0 + (x1 - x0) * R(), y0 + (y1 - y0) * R(), 1 + R(), '#dfe8ff', 0.25);
  c.restore();
  c.globalCompositeOperation = 'source-over';
  c.strokeStyle = kbA(kbMix(S.a, '#3a2a1a', 0.5), 1); c.lineWidth = 3; c.strokeRect(x0, y0, x1 - x0, y1 - y0);
  c.lineWidth = 2; c.beginPath(); c.moveTo((x0 + x1) / 2, y0); c.lineTo((x0 + x1) / 2, y1); c.moveTo(x0, (y0 + y1) / 2); c.lineTo(x1, (y0 + y1) / 2); c.stroke();
  c.fillStyle = kbMix(S.a, '#4a3020', 0.55); c.fillRect(x0 - w * 0.04, y1, (x1 - x0) + w * 0.08, h * 0.035);
  const mx = w * 0.32, my = y1;
  c.fillStyle = kbMix(S.a, '#f4ead8', 0.45); c.beginPath(); c.roundRect ? c.roundRect(mx - 7, my - 13, 14, 13, 2) : c.rect(mx - 7, my - 13, 14, 13); c.fill();
  c.strokeStyle = kbMix(S.a, '#f4ead8', 0.45); c.lineWidth = 1.6; c.beginPath(); c.arc(mx + 8, my - 7, 3.4, -Math.PI / 2, Math.PI / 2); c.stroke();
  c.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 3; k++) { const pts = []; for (let j = 0; j <= 12; j++) { const f = j / 12; pts.push([mx - 3 + k * 3 + Math.sin(f * 6 + t * 1.5 + k) * 2.5, my - 15 - f * h * 0.16]); } kbLine(c, pts, '#ffffff', 0.18, 1); }
  c.globalCompositeOperation = 'source-over';
  const px = w * 0.68; c.fillStyle = kbMix(S.a, '#7a4028', 0.4); c.fillRect(px - 6, my - 9, 12, 9);
  c.fillStyle = kbA('#6aa860', 0.9); for (let k = 0; k < 6; k++) { const a = -Math.PI / 2 + (k - 2.5) * 0.35; c.beginPath(); c.ellipse(px + Math.cos(a) * 7, my - 9 + Math.sin(a) * 9, 2, 5, a + Math.PI / 2, 0, KB_TAU); c.fill(); }
};
