/* ---------- grain sources ---------- */
const TEX_F = 220;
function reversed(buf) {
  const r = A.ctx.createBuffer(buf.numberOfChannels, buf.length, buf.sampleRate);
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const s = buf.getChannelData(c), d = r.getChannelData(c), n = s.length;
    for (let i = 0; i < n; i++) d[i] = s[n - 1 - i];
  }
  return r;
}
function texture(kind) {
  if (A.tex[kind]) return A.tex[kind];
  if (!A.texWait[kind]) {
    A.texWait[kind] = dspJob('tex', [kind, SR, TEX_F]).then((ch) => {
      if (!A.ctx) return;
      const buf = toBuffer(ch);
      A.tex[kind] = { buf, rev: reversed(buf), ref: TEX_F };
      // fingers that started on the fallback switch to the material they asked for
      if (kind === P['kor.src']) for (const v of A.grainVoices) v.kor.buf = null;
    });
  }
  return null;
}
// at start only the fallback and the chosen material; every other texture renders (in the worker) when it is chosen
function preloadTextures() { if (!LIVE_SRC.has(P['kor.src'])) texture(P['kor.src']); texture('glas'); }
// sources that are not generated: a loaded file (or take) and the live microphone
const LIVE_SRC = new Set(['echo', 'datei', 'mikro', 'schleife']);   // (Hexenring: a Schleife's own sound – Nähren)
function korSource() {
  if (P['kor.src'] === 'datei') {
    if (A.userTex) return A.userTex;
    if (!A.userTexWarned) { A.userTexWarned = true; toast('Noch keine eigene Datei geladen – unter „Klang → Körner“ auf „Audiodatei laden …“ tippen.', 5000); }
  }
  if (P['kor.src'] === 'mikro') {
    const m = micSource();
    if (m) return m;
  }
  if (P['kor.src'] === 'schleife') {   // Hexenring: the Schleife that nährt the Körner
    const t = hxKorTex();
    if (t) return t;
    if (!A.hxKorWarned) { A.hxKorWarned = true; toast('Noch nährt keine Schleife die Körner – in ihrer Karte „Nähren: Körner“ einschalten.', 4500); }
  }
  if (P['kor.src'] === 'echo') {
    if (!CAP.node) ensureCapture();
    const now = A.ctx.currentTime;
    if (A.echoCache && now - A.echoCache.at < 1.2) return A.echoCache;
    const e = echoBuffer();
    if (e) { A.echoCache = { buf: e, rev: reversed(e), ref: N.notes[Math.floor(N.notes.length / 2)].f, at: now }; return A.echoCache; }
    if (!A.echoWarned) { toast('Das Echo ist noch leer – spiele zuerst etwas, dann greifen die Körner darauf zu.'); A.echoWarned = true; }
  }
  const want = LIVE_SRC.has(P['kor.src']) ? 'glas' : P['kor.src'];
  return texture(want) || A.tex.glas || Object.values(A.tex)[0] || null;
}
