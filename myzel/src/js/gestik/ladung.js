/* ---------- Ladung: Schütteln lädt das Myzel auf ---------- */
// One to three seconds of shaking like an egg shaker charge a store – the recogniser's Ladung: motion energy above the
// personal handling floor, so lifting, carrying or walking do not charge it – which drains over the Entladung (0.3 s: a
// real rattle that sounds only while shaking; 30 s: a capacitor building over many bars while the hands are back on
// the keys). It needs no clutch (only the Wächter lets it go) and moves targets of the mod layer that are read where
// they are scheduled anyway, so it costs nothing and never touches the patch: the grains denser and wider, the Tropfen
// rain denser, the Puls fuller and brighter, the echo starts to wow, Ausdruck a little louder; the Geflecht glows and a
// ring around the Gestik symbol in the bar fills like a tank. Big screens get a gentler share (an iPad on a stand is
// bumped while playing, and nobody shakes it hard).
// Schwenken (circling the phone like a wine glass; needs a gyroscope) fills a second, calm store: held notes swell and
// their overtones rise, like a rubbed glass rim or a singing bowl; the speed of the circles sets the shimmer
// (Schweben), their direction detunes a little – clockwise up, the other way down.
// Rassel-Schläge (optional): each swing of a shake strikes a Tropfen, Membran, Schale, Jahresring or Moder – timed at the top of the
// swing's acceleration, not at its reversal – laid onto the next 1/16 (or 1/32, or free at slow tempi) of the Puls's
// clock, at most one per step. They play on the Klang strip like the field's own notes: mixer, sends and recordings
// take them as any note.
// Tank (a recipe – off unless switched on): the charge switches Puls lanes in one after another – the lanes the
// arrangement has off (or, with the Puls stopped, all its lanes, the Puls started for them) – and takes them out again
// as it drains, until exactly the arrangement is back.
const LAD_AMT = { korD: 0.8, korS: 0.7, trp: 0.8, pulsD: 0.7, pulsH: 0.5, wow: 0.6, expr: 0.35, gspK: 0.6, rhzR: 0.6 };
const LAD_DET = 12;   // Schwenken: cents of detune at a full store
// now, oL, oT: the update done; k, kT: the share and when the screen was measured; lvl: the charge as it acts; glas:
// Schwenken's store as it acts; shim, dir: its shimmer and direction; ro, go, sh, di: what the routes give (20 times a
// second), rT: when they took it; hits: the last Rassel strikes (time, beat, strength), n: how many so far; lastT: the step struck last;
// vs: the rattle's voices; tk: lanes the Tank added; tStart: the Tank started the Puls; tUser: the player stopped it
// meanwhile (the Tank rests until drained)
const LAD = { now: -1, oL: -1, oT: -1, k: 1, kT: -1e9, ro: 0, go: 0, sh: 0, di: 0, rT: -1e9, lvl: 0, glas: 0, shim: 0, dir: 0, hits: [], lastT: null, vs: [], tk: 0, tStart: false, tUser: false, n: 0 };
const ladOn = () => GK.on && GK.p.lad;
const swOn = () => ladOn() && GK.p.sw;
// the share: a big screen's gentler one (the screen's size is read once a second, not for every sample)
const ladK = () => { const t = performance.now(); if (t - LAD.kT > 1000) { LAD.kT = t; LAD.k = gkBig() ? 0.6 : 1; } return LAD.k; };
// The routes give their values in steps of 1/512: a store that drains slowly then moves its sound every other frame or
// less instead of every frame (inaudible – each step glides in 25 ms). Below 1 % a store counts as empty – the last
// crumbs of a long Entladung (or of handling) keep no source on the layer, and it is exactly at rest.
const ladQ = (x) => Math.round(x * 512) / 512;
const ladE = (x) => (x < 0.01 && x > -0.01 ? 0 : x);
// once per Gestik update (whichever asks first; two updates may share a timestamp, so the values decide too): the
// stores as they act, the Tank, the Geflecht's glow
function ladTick(now) {
  if (LAD.now === now && LAD.oL === GK.out.ladung && LAD.oT === GK.last) return;
  const dt = LAD.now > 0 ? clamp((now - LAD.now) / 1000, 0, 0.2) : 0;
  LAD.now = now; LAD.oL = GK.out.ladung; LAD.oT = GK.last;
  const st = GK.R && GK.R.st, fresh = GK.live && now - GK.last < 250 && document.visibilityState === 'visible';
  const sw = swOn() && st && st.gyro && fresh ? st.sw : 0;
  LAD.glas = ladE(sw >= LAD.glas ? sw : Math.max(sw, LAD.glas - dt / 0.3));   // the Wächter: gone within 300 ms
  LAD.shim = st ? 0.2 + 0.5 * clamp((st.swHz - 0.6) / 2, 0, 1) : 0;
  LAD.dir = st ? clamp(st.swDir, -1, 1) : 0;
  LAD.lvl = ladOn() ? GK.out.ladung : 0;
  // what the routes give: both stores are slow envelopes, so 20 updates a second are plenty (each glides in 25 ms) –
  // at once for a jump (a rattle's Entladung), for empty and for full
  const lv = ladE(LAD.lvl), gv = LAD.glas;
  if (lv !== LAD.ro || gv !== LAD.go || (gv && (LAD.shim !== LAD.sh || LAD.dir !== LAD.di))) {
    if (now - LAD.rT >= 50 || Math.abs(lv - LAD.ro) > 0.05 || Math.abs(gv - LAD.go) > 0.05 || !lv !== !LAD.ro || !gv !== !LAD.go || lv === 1 || gv === 1) { LAD.ro = lv; LAD.go = gv; LAD.rT = now; LAD.sh = LAD.shim; LAD.di = LAD.dir; }
  }
  ladTank();
  if (LAD.lvl > 0.005 || LAD.glas > 0.005) VIS.gk = true;
  VIS.lad = LAD.lvl; VIS.glas = LAD.glas;
}
for (const k in LAD_AMT) gkRoute('lad.' + k, { axis: 'ladung', target: k, on: ladOn, fn: (o, raw, now) => (ladTick(now), ladQ(LAD.ro * LAD_AMT[k] * ladK())) });
// A sound with nothing to make denser – no grains or Tropfen (as the Klang or Ebene 2), the Puls standing – would only
// wow a little: then the charge goes where any held sound answers – brighter (Höhe), more echo, more shimmer
const ladFull = () => SEQ.on || ['kor', 'trp'].includes(P['v.eng']) || (P['v.layer'] !== 'off' && ['kor', 'trp'].includes(P['v.layer']));
const ladDry = () => ladOn() && !SLP.on && !ladFull();   // (asleep the Puls stops by itself: no reason to start)
for (const [k, t, a] of [['fh', 'hoehe', 0.55], ['fd', 'dly', 0.35], ['fc', 'cho', 0.5]]) gkRoute('lad.' + k, { axis: 'ladung', target: t, on: ladDry, fn: (o, raw, now) => (ladTick(now), ladQ(LAD.ro * a * ladK())), opts: t === 'hoehe' ? { older: 1 } : undefined });
gkRoute('sw.expr', { target: 'expr', on: swOn, fn: (o, raw, now) => (ladTick(now), ladQ(LAD.go * 0.6)) });
gkRoute('sw.h', { target: 'hoehe', on: swOn, fn: (o, raw, now) => (ladTick(now), ladQ(LAD.go * 0.45)), opts: { older: 1 } });
gkRoute('sw.cho', { target: 'cho', on: swOn, fn: (o, raw, now) => (ladTick(now), ladQ(LAD.go * LAD.sh)) });
gkRoute('sw.bend', { target: 'bend', on: swOn, fn: (o, raw, now) => (ladTick(now), ladQ(LAD.go * LAD.di)), opts: { per: (tt, v) => (tt.mpe ? 0 : v * LAD_DET) } });
// a Rassel strike for a swing's top: on the grid of the Puls's clock (it runs on, as the Puls's own beat, when the Puls
// is stopped), never in the past, one per step; its pitch a held note's or a step of the scale in the middle. The
// voices: at most 6 strikes ring at once, and room is made from the rattle's own (the oldest fades out in ~25 ms, vFade),
// then from tails already fading – never by stealing a held note; with only held notes left in the budget the rattle stays silent.
const LAD_VMAX = 6;
function ladRassel(e) {
  if (!GK.p.ras || !ladOn() || SLP.on || !A.started || !A.ctx || A.ctx.state !== 'running') return;
  ctxSync();
  const now = A.ctx.currentTime, te = ctxAt(e.t), q = GK.p.rasQ, eng = GK.p.rasS, cost = Q.cost[eng] || 1;
  const full = () => A.voices.size >= MAXV || voiceLoad() + cost > VBUDGET;
  let t = now + 0.01, b = null;
  if (q !== 'frei') {   // the Puls's own grid, its swing included (rgAt): the nearest step, never one already due
    const d = q === '32' ? 0.125 : 0.25;
    let n = Math.round(beatAt(te) / d);
    while (rgAt(n, d) < now + 0.008) n++;
    t = rgAt(n, d); b = n * d;
    if (LAD.lastT != null && Math.abs(t - LAD.lastT) < 1e-4) return;   // one strike per step
  }
  LAD.vs = LAD.vs.filter((v) => v.alive && A.voices.has(v));
  while (LAD.vs.length && (LAD.vs.length >= LAD_VMAX || full())) { const v = LAD.vs.shift(); vFade(v); A.voices.delete(v); }
  while (full() && steal(true, true));   // then a fading tail (a running Puls keeps the budget full of ringing Kalimbas) – never a held note
  if (full()) return;
  LAD.lastT = t;
  const held = [];
  for (const tt of touches.values()) if (!tt.mpe && tt.f > 0) held.push(tt);
  let f, x;
  if (held.length) { const tt = held[Math.floor(Math.random() * held.length)]; f = tt.f; x = tt.x; }
  else {
    const n = N.free ? 12 * P['t.range'] + 1 : N.notes.length, i = clamp(Math.floor(n * (0.4 + 0.45 * Math.random())), 0, n - 1);
    f = N.free ? N.base * ratioForSemi(i) : N.notes[i].f; x = noteX(i);
  }
  const k = clamp(e.v, 0, 1), y = 0.35 + 0.5 * k, vel = 0.3 + 0.5 * k;
  const vo = hit(eng, t, f, y, vel, { pan: (Math.random() - 0.5) * 0.8, bus: stripIn('fin'), hxSrc: 'ras' });   // (Hexenring: the Rassel's notes are its own source)
  if (vo) LAD.vs.push(vo);
  noteEvent(t);
  visPush({ t, kind: 'hit', x, y, s: vel });
  LAD.hits.push({ t, b, te, v: k }); LAD.n++;
  if (LAD.hits.length > 32) LAD.hits.shift();
}
// The Tank: lane j of n comes in at 0.12 + 0.7·j/n of the charge and leaves 0.06 below that. The Puls reads the lanes
// through SEQ.tk while the Tank holds any (null otherwise: exactly the patch's lanes).
function ladTank() {
  if (SLP.on) return;   // asleep it holds still: Schlafen ends the Puls its own way
  if (LAD.tStart && !SEQ.on) { LAD.tStart = false; LAD.tUser = true; }   // the player (or Schlafen) stopped the Puls: it stays stopped
  const L = GK.p.tank && ladOn() && A.started && !SEQ.ext ? LAD.lvl : 0;
  if (LAD.tUser && L < 0.05) LAD.tUser = false;
  if (!L && !LAD.tk && !SEQ.tk) return;
  const all = LAD.tStart || !SEQ.on, cand = [0, 1, 2, 3].filter((i) => P['l' + i + '.puls'] > 0 && (all || !P['l' + i + '.on'])), n = cand.length;
  let c = Math.min(LAD.tk, n);
  if (!LAD.tUser) {
    while (c < n && L >= 0.12 + (0.7 * c) / n) c++;
    while (c > 0 && L < 0.12 + (0.7 * (c - 1)) / n - 0.06) c--;
  } else c = 0;
  LAD.tk = c;
  if (!c) {
    SEQ.tk = null;
    if (LAD.tStart) { LAD.tStart = false; if (SEQ.on) seqStop(); }
    return;
  }
  const tk = [0, 1, 2, 3].map((i) => !all && !!P['l' + i + '.on']);
  for (let j = 0; j < c; j++) tk[cand[j]] = true;
  if (!SEQ.tk || SEQ.tk.some((x, i) => x !== tk[i])) SEQ.tk = tk;
  if (!SEQ.on && !LAD.tStart) { seqStart(); LAD.tStart = SEQ.on; }
}

