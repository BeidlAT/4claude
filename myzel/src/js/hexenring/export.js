// ---- §14 export: a loop as a take (its steady pass rendered by the processor – seams and Ausklänge as they sound –
// seamless, so the take plays as a loop: WAV, ZIP, Körner from the Aufnahme panel), its notes as a Standard MIDI File
// (format 1, a track per Schicht, the tempo map from the Taktgeber) ----
async function hxExportTake(L) {
  const sch = hxBandReady(L); if (!sch) return null;
  const aud = sch.filter((S) => !S.mute);
  if (!aud.length) { toast('Alle Schichten sind stumm.'); return null; }
  const k = hxPassK(L, Math.round(hxF(hxNowT()))), Lf = hxPassF(L, k + 1) - hxPassF(L, k), sp = L.sp || 1, tail = Math.max(0, ...aud.map((S) => (S.aus ? S.aus.len : 0)));
  const passes = Math.ceil(tail / Lf) + 2, ctx = new OfflineAudioContext(2, Lf * (passes + 2), SR);
  if (!(await ensureDSP(ctx))) return null;
  const ver = (S) => (S.baked && S.bak ? S.bak : S.aud);
  const msgs = [{ loop: { id: 1, lock: 'frei', L: Lf, ph0: 0, gain: L.gain != null ? L.gain : 1 } }];
  aud.forEach((S, i) => msgs.push({ schicht: { loop: 1, id: i + 1, chunks: ver(S), n: S.n, pre: S.pre, len: S.len, ausklang: S.aus ? { off: S.aus.off, len: S.aus.len, fade: Math.min(Math.round(0.03 * SR), S.aus.len) } : null, gain: S.gain, join: S.join, X: S.X, rho: S.rho, zo: S.zo || 0, kc: (S.baked ? S.kcB : S.kc) || 0, fin: 0 } }));
  if (sp !== 1) msgs.push({ band: { loop: 1, vs: sp, T: 1, f: 0 } });
  if (L.vb != null && L.vb < 1) msgs.push({ vb: aud.map((S, i) => ({ schicht: i + 1, fb: L.vb })) });
  const node = new AudioWorkletNode(ctx, 'myzel-ring', { numberOfInputs: 2, numberOfOutputs: 2, outputChannelCount: [2, 2], channelCount: 2, channelCountMode: 'explicit', processorOptions: { humusS: 2, chunk: HX_CH, msgs } });
  node.connect(ctx.destination, 0); node.connect(ctx.destination, 1);
  const buf = await ctx.startRendering(), Lc = buf.getChannelData(0), Rc = buf.getChannelData(1), a = passes * Lf;
  const tL = [], tR = []; let pk = 0;
  for (let o = 0; o < Lf; o += 16384) { const n = Math.min(16384, Lf - o), l = Lc.slice(a + o, a + o + n), r = Rc.slice(a + o, a + o + n); tL.push(l); tR.push(r); for (let i = 0; i < n; i++) pk = Math.max(pk, Math.abs(l[i]), Math.abs(r[i])); }
  const bars = hxTakt(L) ? Math.round((L.d.beats / (L.bpb || 4)) * 100) / 100 : 0, bpm = hxTakt(L) ? tgBpm(hxNowT()) : 0;
  const take = { id: Date.now(), name: hxName(L) + (hxEngName(L) ? ' · ' + hxEngName(L) : '') + (bars ? ' · ' + bars + (bars === 1 ? ' Takt' : ' Takte') + ' · ' + Math.round(bpm) + ' BPM' : ''), sr: SR, L: tL, R: tR, frames: Lf, peak: pk, date: new Date(), patch: patchValues(), comp: null, compExt: '', saved: false, done: true, bars: bars || 0, bpm, seamless: true };
  idbDo('takes', 'readwrite', (st) => st.put(takeMeta(take)));
  const segs = []; for (let i = 0; i < tL.length; i += 16) segs.push([segs.length, i, Math.min(tL.length, i + 16)]);
  for (const [i, from, to] of segs) putSegment(take, i, from, to);
  takes.unshift(take); renderTakes();
  toast(hxName(L) + ' ist jetzt eine Aufnahme – unter „Aufnahme“ anhören, als WAV speichern oder als Körner-Quelle.', 4000, { label: 'Zeigen', fn: () => openPanel('rec') });
  hxSay(hxName(L) + ' als Aufnahme');
  return take;
}
// a Standard MIDI File (format 1): track 0 the tempo map (the Taktgeber's segments over the export, one pass of the
// longest loop) and the meter, then a track per Schicht with its notes (Wuchs records, the tools applied) – velocity,
// length, the pitch as the nearest key with its bend in a pitch-bend before the note (±2 semitones)
function hxMidiOf(Ls) {
  const PPQ = 480, tracks = [], vlq = (v) => { const b = [v & 127]; while ((v >>= 7)) b.unshift((v & 127) | 128); return b; };
  const t0 = hxNowT(), b0 = Math.ceil(tgBeat(t0) / 4) * 4, bpm0 = tgBpm(t0);
  const tm = [0, 0xff, 0x51, 3, ...((u) => [(u >> 16) & 255, (u >> 8) & 255, u & 255])(Math.round(60000000 / bpm0)), 0, 0xff, 0x58, 4, (Ls[0] && Ls[0].bpb) || 4, 2, 24, 8];
  tracks.push(tm.concat([0, 0xff, 0x2f, 0]));
  for (const L of Ls) for (const id of L.sch) {
    const S = HX.sch.get(id), W = S && hxWNotesT(L, S); if (!W || !W.n.length) continue;
    const toTick = (x) => Math.max(0, Math.round((W.u === 'b' ? x : (x * bpm0) / 60) * PPQ)), ev = [];
    // (each sounding note its own channel – a just or free pitch is its key and its own bend, a chord's notes never share one)
    const CH = [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15], busy = new Map();
    for (const n of W.n.slice().sort((a, b) => a.t - b.t)) {
      if (n.eng === 'bor' || !(n.f > 0)) continue;
      const m = 69 + 12 * Math.log2(n.f / 440), key = clamp(Math.round(m), 0, 127), bend = clamp(Math.round(8192 + ((m - key) / 2) * 8192), 0, 16383), v = clamp(Math.round((n.vel || 0.6) * 127), 1, 127);
      const a = toTick(n.t), b = Math.max(a + 1, toTick(n.t + (n.d != null ? n.d : n.burst || !n.hold ? 0.25 : 1)));
      let c = CH.find((x) => !busy.has(x) || busy.get(x) <= a); if (c == null) c = CH.reduce((p, x) => (busy.get(x) < busy.get(p) ? x : p), CH[0]);
      busy.set(c, b);
      ev.push([a, 0, [0xe0 | c, bend & 127, bend >> 7]], [a, 1, [0x90 | c, key, v]], [b, 2, [0x80 | c, key, 0]]);
    }
    ev.sort((x, y) => x[0] - y[0] || (x[1] === 2 ? -1 : y[1] === 2 ? 1 : x[1] - y[1]));
    const name = [...new TextEncoder().encode(hxName(L) + ' · Schicht ' + (L.sch.indexOf(id) + 1) + ' · ' + (ENG_NAME[W.n[0].eng] || W.n[0].eng))];
    const out = [0, 0xff, 0x03, ...vlq(name.length), ...name]; let last = 0;
    for (const [t, , d] of ev) { out.push(...vlq(t - last), ...d); last = t; }
    tracks.push(out.concat([0, 0xff, 0x2f, 0]));
  }
  if (tracks.length < 2) return null;
  void b0;
  const head = [0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 1, 0, tracks.length, PPQ >> 8, PPQ & 255], parts = [new Uint8Array(head)];
  for (const t of tracks) parts.push(new Uint8Array([0x4d, 0x54, 0x72, 0x6b, (t.length >>> 24) & 255, (t.length >>> 16) & 255, (t.length >>> 8) & 255, t.length & 255]), new Uint8Array(t));
  return new Blob(parts, { type: 'audio/midi' });
}
function hxExportMidi(L) {
  const b = hxMidiOf(L ? [L] : hxLoopsLive().filter((x) => !x.bew));
  if (!b) { toast('Diese Schleife hat keine Noten – als Aufnahme exportieren geht.'); return null; }
  offerFile('myzel-' + (L ? 'schleife-' + (L.slot + 1) : 'hexenring') + '-' + stamp(new Date()) + '.mid', b);
  hxSay('MIDI-Datei'); return b;
}

// ---- §13 Klang aufs Feld: the field plays a loop's source (and Ebene 2 the one of its second layer) ----
function hxKlangFeld(L) {
  const evs = (L.sch.map((id) => HX.sch.get(id)).find((S) => S && S.wn) || {}).wn;
  const pick = (src) => { const c = {}; for (const n of (evs && evs.n) || []) if (n.src === src && ENGINES[n.eng]) c[n.eng] = (c[n.eng] || 0) + 1; let b = null; for (const k in c) if (!b || c[k] > c[b]) b = k; return b; };
  const e1 = (L.klang && L.klang !== 'eigen' && L.klang !== 'feld' && ENGINES[L.klang] ? L.klang : null) || pick('fin') || (ENGINES[L.eng] ? L.eng : null), e2 = pick('eb2');
  if (!e1) { toast('Diese Schleife hat keine Klangquelle, die das Feld spielen kann.'); return false; }
  remember();
  if (P['v.eng'] !== e1) setParam('v.eng', e1);
  if (e2 && P['v.layer'] !== e2) setParam('v.layer', e2);
  if (typeof refreshEngineUI === 'function') refreshEngineUI();
  hxSay('Das Feld spielt ' + (ENG_NAME[e1] || e1)); toast('Das Feld spielt jetzt ' + (ENG_NAME[e1] || e1) + (e2 ? ' (Ebene 2: ' + (ENG_NAME[e2] || e2) + ')' : '') + '.', 2200, { label: 'Rückgängig', fn: undo });
  return true;
}

// ---- §13 Puls ernten: the last N bars of the Puls's lanes – their notes (their throw) and their audio, from the
// Humus's third ring (the lanes' strips, always) – as a Schleife from the bar line; „danach stumm“: the Puls stops there ----
function hxPulsErnten(N, stumm) {
  if (!HX.node || HX.state !== 'ok') { toast('Der Hexenring ist noch nicht bereit.'); return null; }
  const T = hxHeard(), B = hxBarOf(T, HX_GRACE), Eb = B.b, w0 = tgTime(Eb - 4 * N), w1 = tgTime(Eb);
  const evs = hxNotes(w0 - 0.03, w1, 2, true).filter((e) => e.t0 >= w0 - 0.03 && e.t0 < w1 - 0.01);
  if (!evs.length && hxLvlAt(w0, w1, 2) < HX_LVL_ON) { toast('In diesen Takten hat der Puls nicht gespielt.'); return null; }
  const plan = { kind: 'grid', in: 2, w0, w1, b0: Eb, beats: 4 * N, bars: N, lock: 'takt', entry: { b: B.b, t: B.t, now: B.now }, evs, label: N + ' T' };
  const L = hxHarvest(plan, { kind: 'puls' });
  if (!L) return null;
  L.puls = true; L.eig = L.eig || 'treu';
  if (stumm && SEQ.on) { const nb = B.now ? Eb : Eb; SEQ.stopB = B.now ? Math.ceil(tgBeat(hxNowT() + HX_LEAD) / 4 - 1e-9) * 4 : nb; hxSay('Puls danach stumm'); }
  hxSay(hxName(L) + ': Puls geerntet, ' + N + (N === 1 ? ' Takt' : ' Takte'));
  return L;
}
function hxPulsErnteSec() {
  const box = h('div', { class: 'hx-pe' });
  const draw = () => {
    const st = h('button', { type: 'button', class: 'chip', 'aria-pressed': P['hx.pulsStumm'] ? 'true' : 'false' }, 'danach stumm');
    st.addEventListener('click', () => { setParam('hx.pulsStumm', !P['hx.pulsStumm']); draw(); });
    box.replaceChildren(h('div', { class: 'hx-row' }, h('span', { class: 'lab' }, 'Puls ernten'), h('div', { class: 'chips small' },
      ...[1, 2, 4].map((n) => { const b = h('button', { type: 'button', class: 'chip' }, n + (n === 1 ? ' Takt' : ' Takte')); b.addEventListener('click', () => hxPulsErnten(n, P['hx.pulsStumm'])); return b; }), st)),
      h('p', { class: 'note' }, 'Hält die letzten Takte des Puls fest – genau diese Schläge, mit ihrem Wurf – als Schleife im Hexenring.'));
  };
  draw();
  return box;
}

