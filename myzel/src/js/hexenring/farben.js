// ---- (owner, 26.10.2026: „die Schleifen einfärben für mehr Übersicht in der Leiste – passende Farben für die GUI,
// überrasch mich mit einer kreativen Lösung“) Pigmente: every Schleife wears the colour of a fungus – twelve pigments
// that sit on Myzel's dark loam. Unchosen, a Schleife takes its pigment from its own sound: the brightness of its
// audio (how often its wave crosses zero – a dark drone a deep indigo or a brick red, a bright bell a sulphur yellow
// or the pale birch polypore), the nearest one no other Schleife wears yet. The pigment colours its ring in the
// Ringleiste (and its glow while it plays), its strip in the mixer and the Pult, its name in the editor; the ring's
// menu, the editor's swatch and the card choose another. Stored with the Schleife. ----
const HX_PIG = [   // from the darkest sound to the brightest
  { k: 'indigo', n: 'Indigo-Milchling', c: '#7d8cff' },
  { k: 'lila', n: 'Violetter Lacktrichterling', c: '#b58cff' },
  { k: 'ziegel', n: 'Ziegelroter Schwefelkopf', c: '#d0674c' },
  { k: 'zunder', n: 'Zunderschwamm', c: '#d98a4e' },
  { k: 'gruenspan', n: 'Grünspan-Träuschling', c: '#3fc6b0' },
  { k: 'moos', n: 'Moos', c: '#93d06c' },
  { k: 'fliegenpilz', n: 'Fliegenpilz', c: '#ff5f4f' },
  { k: 'roetling', n: 'Rosa Rötling', c: '#ff8fa6' },
  { k: 'pfifferling', n: 'Pfifferling', c: '#ffbe45' },
  { k: 'schwefel', n: 'Schwefelporling', c: '#e6df5a' },
  { k: 'flechte', n: 'Flechte', c: '#86f0d0' },
  { k: 'birke', n: 'Birkenporling', c: '#eadfcd' },
];
const hxPigOf = (k) => HX_PIG.find((p) => p.k === k) || null;
// the brightness of a Schicht's window, 0 (dark) … 1 (bright): its zero crossings per second on a log scale (80 Hz … 4 kHz)
function hxBright(S) {
  if (!S || !S.aud) return null;
  let zc = 0, prev = 0, n = 0;
  const a = S.pre, b = S.pre + S.len;
  for (let i = a; i < b; i += 2) { const ch = S.aud[Math.floor(i / HX_CH)]; if (!ch) continue; const j = i % HX_CH, v = ch[0][j] + ch[1][j]; if (Math.abs(v) < 1e-4) continue; if ((v > 0) !== (prev > 0) && prev !== 0) zc++; prev = v; n++; }
  if (n < 1000) return null;
  const hz = (zc / 2) / (n * 2 / SR);
  return clamp((Math.log2(Math.max(1, hz)) - Math.log2(80)) / (Math.log2(4000) - Math.log2(80)), 0, 1);
}
// a Schleife's pigment: chosen, else its own sound's (the nearest one free)
function hxPig(L) {
  if (!L) return HX_PIG[8];
  if (L.col) return hxPigOf(L.col) || HX_PIG[8];
  if (!L.colA) {
    const br = hxBright(HX.sch.get(L.sch[0]));
    if (br == null) return HX_PIG[8];   // (still recording: Pfifferling, the Hexenring's own)
    const used = new Set(); for (const X of HX.loops.values()) if (X !== L && X.state !== 'weg') { const k = X.col || X.colA; if (k) used.add(k); }
    const want = Math.round(br * (HX_PIG.length - 1));
    let pick = want;
    for (let d = 0; d < HX_PIG.length; d++) { const a = want - d, b = want + d; if (a >= 0 && !used.has(HX_PIG[a].k)) { pick = a; break; } if (b < HX_PIG.length && !used.has(HX_PIG[b].k)) { pick = b; break; } }
    L.colA = HX_PIG[pick].k; hxSaveMeta(L.id);
  }
  return hxPigOf(L.colA) || HX_PIG[8];
}
const hxCol = (L) => hxPig(L).c;
const hxRgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a.toFixed(3) + ')'; };
// choose one (null: back to its sound's); one step in the history
function hxColSet(L, k) {
  if (!L) return;
  const was = L.col || null, key = L.key;
  const put = (X, v) => { X.col = v || null; hxSaveMeta(X.id); hxRailDirty(); hxCardDirty(); if (HXE.ed && !HXE.ed.hidden) HXE.rsig = ''; };
  put(L, k);
  hxHist({ kind: 'farbe', label: hxName(L) + ': Farbe ' + (k ? hxPigOf(k).n : 'aus dem Klang'), undo() { const X = hxByKey(key); if (X) put(X, was); }, redo() { const X = hxByKey(key); if (X) put(X, k); } });
  hxSay(hxName(L) + ': ' + (k ? hxPigOf(k).n : 'Farbe aus dem Klang'));
}
// the swatches (the ring's menu, the editor): twelve pigments and „aus dem Klang“
function hxColRow(L, after) {
  const row = h('div', { class: 'hx-pig', role: 'group', 'aria-label': 'Farbe von ' + hxName(L) });
  const cur = hxPig(L).k;
  for (const p of HX_PIG) {
    const b = h('button', { type: 'button', class: 'hx-pig-s', style: '--p:' + p.c, title: p.n, 'aria-label': 'Farbe ' + p.n, 'aria-pressed': String(cur === p.k && !!L.col) });
    if (cur === p.k) b.classList.add('cur');
    b.addEventListener('click', () => { hxColSet(L, p.k); if (after) after(); });
    row.append(b);
  }
  const auto = h('button', { type: 'button', class: 'hx-pig-a', title: 'Die Farbe aus dem Klang der Schleife – dunkle Klänge tiefe Pigmente, helle leuchtende', 'aria-pressed': String(!L.col) }, 'aus dem Klang');
  auto.addEventListener('click', () => { hxColSet(L, null); if (after) after(); });
  row.append(auto);
  return row;
}
