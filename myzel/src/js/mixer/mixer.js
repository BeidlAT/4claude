/* =====================================================================
   Mixer – the Myzel-Mixer
   ===================================================================== */
// Every channel is a mushroom. The fader track is the stem with the level glowing inside it, the fader cap is the
// cap, the knobs are gill fans. The Summe is the fruiting body seen from below (radial spectrum = gills, coloured by
// the channel that fills each band, goniometer = hyphae), and underneath, in the soil, the routing runs as mycelium
// on two rails: "kette" (through the insert chain) and "direkt" (straight into the sum). The second view, the Geflecht,
// shows the same mix as mycelium: one fixed column per channel with its spore at the fader's height, the routing
// underground, the fruiting body as the Summe's root.
// Hooks for the other parts of the mixer (everything lives in this closure):
//   MXV.views.<key> = { label, build(host), open(), close(), frame(dt, ts), select(k), layout(), pulse(k) }   a view
//   of the mixer body (layout: after the panel changed size; pulse: a Puls hit on lane strip k)
//   MXV.detail = { build(host), open(k), close(), frame(dt, ts) }                          the channel detail view
//   selectChannel(k) · openDetail(k) · closeDetail() · MX.sel · MXC / MXK (channels in console order)
//   MX.ch[k].lv – live levels as positions on the shared fader law (mxPos / mxDb): pk, rms, hp (hold) for L and R,
//   max (sample peak since reset), clip (latched), gr (Pumpen / compressor reduction, dB), lvl (0…1 brightness);
//   MX.ch[k].dorm – silenced by mute or solo; mxVolId / mxMuteId / mxSoloId(k); mxTip(host, anchor, txt, fine).
const ICON_MIX = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6 20V11M12 20V7M18 20v-6"/><path d="M3.5 11a2.5 2 0 0 1 5 0zM9.5 7a2.5 2 0 0 1 5 0zM15.5 14a2.5 2 0 0 1 5 0z"/></svg>';
PANELS.splice(PANELS.findIndex((p) => p.key === 'puls') + 1, 0, { key: 'mix', title: 'Mixer', icon: ICON_MIX, build: buildMixer, open: mixerOpen, close: mixerClose, frame: mixerFrame });

const MXV = { views: {}, order: ['pult', 'geflecht'], detail: null };
const MX_TAU = Math.PI * 2, MX_MINUS = '−';

/* ---------- channels ---------- */
// The console's channels: the app's strips plus the Puls group (a VCA over Spur 1–4) and the Summe. Colours: the
// lanes keep the app's, the rest are chosen so no two neighbours or layers read alike – Bordun is a deep cobalt, well
// apart from Spur 3's lilac and Hall's pale violet (ΔE ≥ 34), so the colour-by-origin spectrum stays readable.
const MXC = [], MXK = {};
const MX_GROUPS = [['spiel', 'spiel'], ['puls', 'puls'], ['grund', 'grund'], ['rueck', 'rückwege'], ['sum', 'summe']];
const MX_DORM = [118, 106, 97];
function mxChannels() {
  const own = { fin: ['spiel', '#f0e6d8'], eb2: ['spiel', '#c9dc82'], rgn: ['spiel', RG_COL], hxr: ['spiel', '#e9a35e'], bor: ['grund', '#5a7cff'], gsp: ['grund', '#b9a46e'], dly: ['rueck', '#6cc9ef'], rev: ['rueck', '#d6cbff'], fx: ['rueck', '#9fe3b0'] };
  for (const st of STRIPS) {
    if (st.k === 'bor') MXC.push({ k: 'puls', name: 'Puls', g: 'puls', kind: 'puls', col: '#f2cf86' });
    const lane = st.lane != null;
    MXC.push({ k: st.k, name: st.name, g: lane ? 'puls' : own[st.k][0], kind: st.ret ? 'ret' : lane ? 'lane' : 'src', lane: st.lane, col: lane ? COL.lanes[st.lane] : own[st.k][1], st });
  }
  MXC.push({ k: 'sum', name: 'Summe', g: 'sum', kind: 'sum', col: '#f0e6d8' });
  MXC.forEach((c, i) => { c.i = i; c.rgb = mxRgb(c.col); c.c1 = mxRgba(c.rgb, 1); c.c55 = mxRgba(c.rgb, 0.55); MXK[c.k] = c; });
}
const mxVolId = (k) => (k === 'sum' ? 'mst.vol' : k === 'puls' ? 'mix.pulsVol' : 'x' + k + '.vol');
const mxMuteId = (k) => (k === 'puls' ? 'mix.pulsMute' : k === 'sum' ? null : 'x' + k + '.mute');
const mxSoloId = (k) => (k === 'puls' || k === 'sum' ? null : 'x' + k + '.solo');
// what the second knob of every strip controls, chosen in the head: [suffix, chip label, printed name, colour]
const MX_LAYERS = [['dly', 'Echo', 'Echo', '#6cc9ef'], ['rev', 'Hall', 'Hall', '#d6cbff'], ['fx', 'Effekt', 'Effekt', '#9fe3b0'], ['duck', 'Pumpen', 'Pumpen', '#ff8f9e'], ['wid', 'Breite', 'Breite', '#f0e6d8']];
const MX_LAYER_ARIA = { dly: 'Echo-Send', rev: 'Hall-Send', fx: 'Effekt-Send', duck: 'Pumpen', wid: 'Stereobreite' };
const MX_BOR = { 1: '1:1', 1.5: '3:2', 1.3333: '4:3', 2: '2:1', 1.75: '7:4', 1.2: '6:5' };

/* ---------- helpers ---------- */
function mxRgb(hex) { const n = parseInt(String(hex).trim().slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
const mxRgba = (c, a) => 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
const mxDpr = () => Math.min(2, window.devicePixelRatio || 1);
function mxFit(cv, w, hh, top = 0, dpr = mxDpr()) {
  const W = Math.max(1, Math.round(w * dpr)), H = Math.max(1, Math.round(hh * dpr));
  if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
  const c = cv.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, -top * dpr);
  return c;
}
// The rack's layers only cover the band where something is drawn (stems and soil, from MX.top down), and the live
// layer of a touch device is drawn at 1.5× – its glows are soft anyway; this keeps the pixels to push small.
const MX_LDPR = () => Math.min(mxDpr(), MOBILE ? 1.5 : 2);
// a soft round light, drawn with drawImage – far cheaper per frame than a gradient
const MX_GLOW = {};
function mxGlow(col) {
  let g = MX_GLOW[col];
  if (g) return g;
  g = document.createElement('canvas'); g.width = g.height = 64;
  const c = g.getContext('2d'), rgb = mxRgb(col), r = c.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, mxRgba(rgb, 0.55)); r.addColorStop(0.35, mxRgba(rgb, 0.16)); r.addColorStop(1, mxRgba(rgb, 0));
  c.fillStyle = r; c.fillRect(0, 0, 64, 64);
  return (MX_GLOW[col] = g);
}
// the same light pre-rendered at the size it is drawn (in device pixels), so drawing it is a plain copy
function mxGlowAt(col, w, hh, dpr) {
  const g = document.createElement('canvas');
  g.width = Math.round(w * dpr); g.height = Math.round(hh * dpr);
  g.getContext('2d').drawImage(mxGlow(col), 0, 0, g.width, g.height);
  return g;
}
// every channel's lights for the live layer, made once per layout: cap, level tip, spores, pulse
const MX_SPR = { dpr: 0 };
function mxSprites() {
  const dpr = MX_LDPR();
  if (MX_SPR.dpr === dpr) return;
  MX_SPR.dpr = dpr;
  const make = (col, m) => ({ cap: mxGlowAt(col, m ? 120 : 92, m ? 96 : 73.6, dpr), tip: mxGlowAt(col, m ? 62 : 44, m ? 62 : 44, dpr), p1: mxGlowAt(col, 9, 9, dpr), p2: mxGlowAt(col, 12, 12, dpr), pulse: mxGlowAt(col, 28, 28, dpr), knot: mxGlowAt(col, 32, 32, dpr) });
  for (const c of MXC) c.spr = make(c.col, c.kind === 'sum');
  MX_SPR.dorm = make('#766a61', false); MX_SPR.dormM = make('#766a61', true);
  MX_SPR.clip = mxGlowAt('#ff5b4d', 44, 44, dpr);
}
// The fader law, shared by stems, meters, knobs of level and the bridge, so a level reads the same everywhere:
// −60 dB (= off) at the bottom, 0 dB at 80 %, +6 dB on top; the usual mixing range gets most of the travel.
const MX_LAW = [[-60, 0], [-48, 0.08], [-36, 0.17], [-24, 0.3], [-18, 0.385], [-12, 0.49], [-6, 0.635], [0, 0.8], [6, 1]];
function mxPos(db) {
  if (!(db > -60)) return 0;
  if (db >= 6) return 1;
  for (let i = 1; i < MX_LAW.length; i++) {
    const b = MX_LAW[i];
    if (db <= b[0]) { const a = MX_LAW[i - 1]; return a[1] + (b[1] - a[1]) * (db - a[0]) / (b[0] - a[0]); }
  }
  return 1;
}
function mxDb(p) {
  if (p <= 0) return -60;
  if (p >= 1) return 6;
  for (let i = 1; i < MX_LAW.length; i++) {
    const b = MX_LAW[i];
    if (p <= b[1]) { const a = MX_LAW[i - 1]; return a[0] + (b[0] - a[0]) * (p - a[1]) / (b[1] - a[1]); }
  }
  return 6;
}
const mxPosA = (a) => (a > 0.001 ? mxPos(20 * Math.log10(a)) : 0);      // amplitude → position
const mxPosP = (ms) => (ms > 1e-6 ? mxPos(10 * Math.log10(ms)) : 0);    // mean square → position
// "−4,0" · "+2,5" · "0,0" · "−∞"
function mxDbTxt(v, d = 1) {
  if (!(v > FADER_OFF)) return MX_MINUS + '∞';
  const r = Number(v.toFixed(d));
  return (r > 0 ? '+' : r < 0 ? MX_MINUS : '') + dec(Math.abs(r).toFixed(d));
}
const mxDbAria = (v) => (v > FADER_OFF ? mxDbTxt(v) + ' Dezibel' : 'aus');
const mxPanTxt = (v) => { const p = Math.round(v * 100); return p ? (p < 0 ? 'L' : 'R') + Math.abs(p) : 'C'; };
const mxPanAria = (v) => { const p = Math.round(v * 100); return p ? Math.abs(p) + ' Prozent ' + (p < 0 ? 'links' : 'rechts') : 'Mitte'; };
const mxLufsTxt = (v) => (v > -70 ? (v < 0 ? MX_MINUS : '') + dec(Math.abs(v).toFixed(1)) : MX_MINUS + '∞');
// One rule for the readouts of every view. Correlation: wide ambience normally sits between 0 and +0,3, so only a
// negative value warns (rose), below −0,3 it is a fault (rec); with no signal there is nothing to correlate ("—").
// Gain reduction is information, never a fault: always rose. cls: '' | 'ok' | 'gr' | 'over' | 'q'
function mxCorr(cr, s) {
  if (!(s > -70) || cr == null) return { t: '—', cls: 'q', col: '#7d6f64' };
  const t = (cr < 0 ? MX_MINUS : '+') + dec(Math.abs(cr).toFixed(2));
  return cr < -0.3 ? { t, cls: 'over', col: '#ff5b4d' } : cr < 0 ? { t, cls: 'gr', col: '#ff8f9e' } : { t, cls: 'ok', col: '#86f0d0' };
}
const mxGrTxt = (gr) => (gr > 0.05 ? MX_MINUS + dec(gr.toFixed(1)) + ' dB' : '0,0 dB');
const mxGrCls = (gr) => (gr > 0.5 ? 'gr' : '');
const mxEase = (u) => (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);
function mxBuzz() { try { if (navigator.vibrate) { navigator.vibrate(8); if (GK.on) GK.lockT = Math.max(GK.lockT, performance.now() + 70); } } catch (e) {} }   // Gestik: the motor shakes the sensors

/* ---------- state ---------- */
const MX = {
  root: null, open: false, sel: 'fin', layer: 'dly', view: 'pult', tgt: -14, wide: false, strip: 'classic',
  ch: {},              // per channel: elements, geometry and live levels (lv)
  owners: new Set(),   // who wants the meter taps: the mixer, the Puls block
  dirtyStatic: true, scrollable: false,
  hitT: [0, 0, 0, 0], hitQ: [[], [], [], []], flash: [0, 0, 0, 0], hitLog: [[], [], [], []],
  snap: { a: null, b: null, m: 0 }, mUI: 0, edits: false, seen: {}, applying: false, morphUI: false, mDrag: null,
  glide: null, morphAt: 0, morphPend: null, ghost: false, numT: 0, detailK: null, solo: [false, false],
};
function mxInit() {
  if (MXC.length) return;
  mxChannels();
  for (const c of MXC) MX.ch[c.k] = { c, k: c.k, dorm: false, lv: { pk: [0, 0], rms: [0, 0], hp: [0, 0], ht: [0, 0], hv: [0, 0], max: 0, ack: -1e9, clip: false, lvl: 0, gr: 0, dom: 0 } };
  const l = store.get('myzel.mixlayer');
  if (MX_LAYERS.some((x) => x[0] === l)) MX.layer = l;
  const t = Number(store.get('myzel.mixtarget'));
  if ([-10, -14, -16, -23].includes(t)) MX.tgt = t;
  mxSnapLoad();
}

/* ---------- meters ---------- */
// The taps cost a little, so they exist only while someone shows meters; the mixer and the Puls block count.
function mxTaps(who, on) {
  if (on) MX.owners.add(who); else MX.owners.delete(who);
  meterTaps(MX.owners.size > 0);
  if (!MX.owners.size && MX.grT && MX.grT.on) { try { A.cmpRatio.disconnect(MX.grT.a); } catch (e) {} MX.grT.on = false; }
}
// The Summe compressor's reduction. Its gain is driven by a signal, so A.cmpVca.gain.value only reports the resting
// value; a tiny analyser listens to the control signal u in front of the gain curve 10^(−CMP_DB·u/20) instead:
// the reduction is CMP_DB·u dB. It is connected only while meters are on screen.
function mxGR() {
  if (!A.ctx || !A.cmpRatio) return 0;
  let G = MX.grT;
  if (!G || G.ctx !== A.ctx) { const a = A.ctx.createAnalyser(); a.fftSize = 32; G = MX.grT = { a, ctx: A.ctx, buf: new Float32Array(32), on: false }; }
  if (!G.on) { A.cmpRatio.connect(G.a); G.on = true; }
  G.a.getFloatTimeDomainData(G.buf);
  let u = 0;
  for (let i = 0; i < 32; i++) if (G.buf[i] > u) u = G.buf[i];
  return CMP_DB * clamp(u, 0, 1);
}
function mxMeterFrame(dt) {
  if (MX.owners.size && A.ctx && !MIX.meter) meterTaps(true);
  mixMeters(dt);
  mxLevels(dt);
  mxDormantAll();
  mxHits(dt);
}
// Live levels of every channel, read once per frame and shared by all views.
function mxLevels(dt) {
  const live = !!(A.ctx && MIX.meter && A.mm), now = live ? A.ctx.currentTime : 0, t = performance.now() / 1000;
  for (const c of MXC) {
    const L = MX.ch[c.k].lv;
    let a0 = 0, a1 = 0, q0 = 0, q1 = 0, clipT = -1e9, gr = 0;
    if (live) {
      if (c.kind === 'sum') {
        const m = A.mm; a0 = m.pk[0]; a1 = m.pk[1]; q0 = m.rms[0]; q1 = m.rms[1]; clipT = m.clipT;
        gr = mxGR();
      } else if (c.kind === 'puls') {
        // the group meter is the loudest lane you hear – and takes that lane's colour. The lane taps sit before mute,
        // so lanes that are switched off, muted or silenced by a solo are left out; when the lanes heard change, the
        // held peak starts again (it would still show what a lane now silent played)
        let best = 0, heard = 0;
        for (let i = 0; i < 4; i++) if (P['l' + i + '.on'] && !mxLaneQuiet(i)) heard |= 1 << i;
        if (heard !== L.heard) { L.heard = heard; L.max = 0; L.hp[0] = L.hp[1] = 0; }
        for (let i = 0; i < 4; i++) {
          const st = MIX.s['l' + i], m = st && st.m;
          if (!m || !(heard & (1 << i))) continue;
          a0 = Math.max(a0, m.pk[0]); a1 = Math.max(a1, m.pk[1]); q0 = Math.max(q0, m.rms[0]); q1 = Math.max(q1, m.rms[1]);
          if (m.clipT > clipT) clipT = m.clipT;
          if (m.rms[0] + m.rms[1] > best) { best = m.rms[0] + m.rms[1]; L.dom = i; }
        }
      } else {
        const st = MIX.s[c.k], m = st && st.m;
        if (m) { a0 = m.pk[0]; a1 = m.pk[1]; q0 = m.rms[0]; q1 = m.rms[1]; clipT = m.clipT; }
        if (st) { const d = duckDepth(st, now); gr = d > 0.001 ? -20 * Math.log10(1 - d) : 0; }
      }
    }
    L.pk[0] = mxPosA(a0); L.pk[1] = mxPosA(a1); L.rms[0] = mxPosP(q0); L.rms[1] = mxPosP(q1);
    if (a0 > L.max) L.max = a0;
    if (a1 > L.max) L.max = a1;
    L.clip = clipT > L.ack;
    L.gr = gr >= L.gr ? gr : L.gr + (gr - L.gr) * Math.min(1, dt / 0.25);   // quick down, ~¼ s back
    const q = Math.max(q0, q1);
    L.lvl = q > 1e-7 ? clamp((10 * Math.log10(q) + 44) / 38, 0, 1) : 0;
    // the peak-hold spore hangs for 1.6 s, then falls with gravity
    for (let s = 0; s < 2; s++) {
      const p = L.pk[s];
      if (p >= L.hp[s]) { L.hp[s] = p; L.ht[s] = t; L.hv[s] = 0; }
      else if (t - L.ht[s] > 1.6) {
        if (REDUCED) L.hp[s] = p;
        else { L.hv[s] += dt * 0.9; L.hp[s] = Math.max(p, L.hp[s] - L.hv[s] * dt); }
      }
    }
  }
}
function mxPeakReset(k) {
  const L = MX.ch[k].lv;
  L.max = 0; L.ack = A.ctx ? A.ctx.currentTime : 0; L.hp[0] = L.hp[1] = 0;
  MX.numT = 0;
}
// silenced by mute, by someone else's solo (a soloed return dries the channels off) or the Puls group's mute –
// computed from the params like the audio does, so it is right at once and also before the sound starts
function mxDormant(k) {
  if (k === 'sum') return false;
  if (k === 'puls') {
    // the group is still when it is muted, or when every lane that plays is muted or solo-silenced
    if (P['mix.pulsMute']) return true;
    let on = 0, live = 0;
    for (let i = 0; i < 4; i++) if (P['l' + i + '.on']) { on++; if (!mxLaneQuiet(i)) live++; }
    return on > 0 && live === 0;
  }
  const c = MXK[k], p = 'x' + k + '.', [src, ret] = MX.solo;
  if (P[p + 'mute']) return true;
  if (c.kind === 'ret') return ret && !P[p + 'solo'];
  if ((src || ret) && !P[p + 'solo']) return true;
  return c.kind === 'lane' && !!P['mix.pulsMute'];
}
// a lane silenced by its own mute or by a solo elsewhere (not by the group's mute)
function mxLaneQuiet(i) {
  const p = 'xl' + i + '.';
  return !!P[p + 'mute'] || ((MX.solo[0] || MX.solo[1]) && !P[p + 'solo']);
}
function mxDormantAll() {
  let src = false, ret = false, key = '';
  for (const st of STRIPS) if (P['x' + st.k + '.solo']) { if (st.ret) ret = true; else src = true; key += st.k; }
  MX.solo[0] = src; MX.solo[1] = ret;
  if (key !== MX.soloKey) { MX.soloKey = key; mxSoloSync(); }
  for (const c of MXC) {
    const S = MX.ch[c.k], d = mxDormant(c.k);
    if (S.dorm === d) continue;
    S.dorm = d; MX.dirtyStatic = true;
    if (S.el) S.el.classList.toggle('dormant', d);
    if (S.pb) S.pb.el.classList.toggle('dormant', d);
    if (MXG.cols.length) { const C = MXG.cols[c.i]; C.tag.classList.toggle('dormant', d); C.aria = ''; MXG.geo = true; }
  }
}
// Puls hits: the play field consumes VIS.events when they are due, so the mixer notes them while they are still
// ahead and fires its own flashes when the audio clock reaches them
function mxHits(dt) {
  for (let i = 0; i < 4; i++) if (MX.flash[i] > 0) MX.flash[i] = Math.max(0, MX.flash[i] - dt * 3.2);
  if (!A.ctx) return;
  const now = A.ctx.currentTime;
  for (const ev of VIS.events) {
    if (ev.kind !== 'hit' || ev.lane == null) continue;
    const i = ev.lane;
    if (ev.t > MX.hitT[i] || ev.t < MX.hitT[i] - 30) { MX.hitT[i] = ev.t; if (MX.hitQ[i].length < 8) MX.hitQ[i].push(ev.t); }
  }
  for (let i = 0; i < 4; i++) {
    const q = MX.hitQ[i];
    while (q.length && q[0] <= now) {
      const t = q.shift(), lg = MX.hitLog[i];
      MX.flash[i] = 1;
      if (lg.length > 15) lg.shift();
      lg.push(t);
      if (MX.open && !REDUCED && !MX.detailK) mxPulse('l' + i);
    }
  }
}

