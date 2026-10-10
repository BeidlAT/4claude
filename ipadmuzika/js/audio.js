// Sphärenwerk – Brücke zur Klangmaschine: AudioContext, Worklet, Abgleich der Maschine, Mikrofon, Neigung.
'use strict';

// Was die Klangmaschine zuletzt gemeldet hat (etwa 30-mal pro Sekunde)
const VIS = {
  t: 0, pkL: 0, pkR: 0, gr: 1, beat: 0, bpm: 84, recPh: 0, recSec: 0,
  micDb: -120, micHz: 0, micClar: 0, hold: 0, micOn: 0,
  voices: [], hits: [], layers: [], mods: new Map(), trig: [],
};

const Audio = {
  ctx: null, node: null, ready: false, queue: [], started: false,
  eids: new Map(), mids: new Map(), types: new Map(), sent: new Map(), nextEid: 1,
  micOn: false, micStream: null, micSrc: null, micEcho: false,
  quality: 1, sr: 48000,
  layers: new Map(),
  handlers: {},

  eid(mid) {
    if (!this.eids.has(mid)) { const e = this.nextEid++; this.eids.set(mid, e); this.mids.set(e, mid); }
    return this.eids.get(mid);
  },
  midOf(eid) { return this.mids.get(eid) || null; },
  on(type, fn) { this.handlers[type] = fn; },

  async start() {
    if (this.started) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) throw new Error('Web Audio fehlt');
    const ctx = new AC({ latencyHint: 'interactive' });
    this.ctx = ctx; this.sr = ctx.sampleRate;
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* egal */ }
    if (!ctx.audioWorklet || !window.AudioWorkletNode) throw new Error('AudioWorklet fehlt');
    // eingebetteter Quelltext (Artefakt) oder engine.js neben der Seite
    const urls = [];
    const inline = document.getElementById('engine-src');
    if (inline && inline.textContent.length > 100) urls.push(URL.createObjectURL(new Blob([inline.textContent], { type: 'text/javascript' })));
    urls.push(new URL('engine.js', document.baseURI).href);
    let ok = false, lastErr = null;
    for (const u of urls) { try { await ctx.audioWorklet.addModule(u); ok = true; break; } catch (e) { lastErr = e; } }
    if (!ok) throw lastErr || new Error('Klangmaschine nicht geladen');
    const node = new AudioWorkletNode(ctx, 'sphaerenwerk', {
      numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2],
      channelCount: 1, channelCountMode: 'explicit', channelInterpretation: 'speakers',
    });
    node.port.onmessage = (e) => this.handle(e.data);
    node.connect(ctx.destination);
    this.node = node;
    this.started = true;
    // iOS: der Kontext startet nur aus einer Berührung heraus
    try { await ctx.resume(); } catch (e) { /* egal */ }
    this.ready = true;
    this.send({ t: 'quality', q: this.quality });
    this.send({ t: 'click', mode: this.clickMode() });
    this.syncAll();
    for (const m of this.queue) this.node.port.postMessage(m);
    this.queue = [];
    Machine.on((ev) => this.onMachine(ev));
    return true;
  },
  send(m, transfer) {
    if (!this.node) { if (m.t !== 'vis') this.queue.push(m); return; }
    this.node.port.postMessage(m, transfer || []);
  },

  /* --- Abgleich mit dem Zustand der Maschine --- */
  // Abgleich nach Unterschieden: Organe, die bleiben, bekommen nur ihre Reglerstände (Töne, Hall und Echo
  // klingen weiter); verschwundene werden ausgebaut, neue eingesetzt.
  syncAll() {
    const want = new Map(Machine.st.mods.map((m) => [m.id, m]));
    for (const [mid, id] of [...this.eids]) {
      const m = want.get(mid);
      if (!m || m.type !== this.types.get(mid)) { this.send({ t: 'mod-', id }); this.eids.delete(mid); this.mids.delete(id); this.types.delete(mid); this.sent.delete(mid); VIS.mods.delete(mid); }
    }
    this.sendScale(); this.sendTempo();
    for (const m of Machine.st.mods) {
      if (!this.eids.has(m.id)) { this.sendMod(m); continue; }
      const last = this.sent.get(m.id) || {};
      for (const [k, v] of Object.entries(m.vals)) if (last[k] !== v) this.send({ t: 'p', id: this.eid(m.id), k, v });
      this.sent.set(m.id, Object.assign({}, m.vals));
    }
    this.sendPatch();
  },
  sendMod(m) {
    this.send({ t: 'mod+', id: this.eid(m.id), type: m.type, p: engineSpec(m.type, m.vals) });
    this.types.set(m.id, m.type); this.sent.set(m.id, Object.assign({}, m.vals));
  },
  sendPatch() {
    const a = [], mm = [], tr = [];
    for (const c of Machine.st.cables) {
      const s = Machine.mod(c.from.m), d = Machine.mod(c.to.m);
      if (!s || !d) continue;
      const so = ORGANE[s.type], dO = ORGANE[d.type];
      if (c.kind === 'audio') a.push([this.eid(s.id), so.audioOut.findIndex((j) => j.id === c.from.p), this.eid(d.id), dO.audioIn.findIndex((j) => j.id === c.to.p)]);
      else if (c.kind === 'mod') mm.push([this.eid(s.id), so.modOut.findIndex((j) => j.id === c.from.p), this.eid(d.id), c.to.p, c.depth]);
      else tr.push([this.eid(s.id), so.trigOut.findIndex((j) => j.id === c.from.p), this.eid(d.id), dO.trigIn.findIndex((j) => j.id === c.to.p)]);
    }
    this.send({ t: 'patch', a, m: mm, tr });
  },
  sendScale() {
    const sk = Skala.build(Machine.st.skala), pd = Machine.st.pad;
    this.send({ t: 'scale', root0: sk.root0, cents: sk.cents, lo: sk.root0 * Math.pow(2, pd.from), oct: pd.oct });
  },
  sendTempo() { this.send({ t: 'tempo', bpm: Machine.st.tempo }); },
  onMachine(ev) {
    switch (ev.k) {
      case 'all': this.syncAll(); break;
      case 'add': this.sendMod(ev.m); this.sendPatch(); break;
      case 'del': { const id = this.eids.get(ev.id); if (id) { this.send({ t: 'mod-', id }); this.mids.delete(id); } this.eids.delete(ev.id); this.types.delete(ev.id); this.sent.delete(ev.id); VIS.mods.delete(ev.id); break; }
      case 'param': {
        this.send({ t: 'p', id: this.eid(ev.id), k: ev.p, v: ev.v });
        const last = this.sent.get(ev.id); if (last) last[ev.p] = ev.v;
        const m = Machine.mod(ev.id);
        if (m && m.type === 'atem' && ev.p === 'echo' && this.micOn) this.restartMic();
        break;
      }
      case 'cables': this.sendPatch(); break;
      case 'skala': case 'pad': this.sendScale(); break;
      case 'tempo': this.sendTempo(); break;
    }
  },

  /* --- Spieltöne --- */
  noteOn(n, hz, y, v) { this.send({ t: 'on', n, hz, y, v }); },
  // Bewegungen werden gesammelt und einmal pro Bild als eine Nachricht geschickt (entlastet den Audio-Thread)
  moves: new Map(),
  noteMove(n, hz, y) { this.moves.set(n, [hz, y]); },
  flush() {
    if (!this.moves.size) return;
    const a = [];
    for (const [n, [hz, y]] of this.moves) a.push(n, hz, y);
    this.moves.clear();
    this.send({ t: 'mvs', a });
  },
  noteOff(n) { if (this.moves.has(n)) this.flush(); this.send({ t: 'off', n }); },
  setHold(on) { this.send({ t: 'hold', on }); },
  setQuality(q) { this.quality = q; this.send({ t: 'quality', q }); },
  clickMode() { return Settings.get('metronom') ? 2 : Settings.get('recClick') ? 1 : 0; },

  /* --- Mikrofon --- */
  async micStart() {
    if (this.micOn) return true;
    if (IN_VIEWER) throw Object.assign(new Error('viewer'), { code: 'viewer' });
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw Object.assign(new Error('nomedia'), { code: window.isSecureContext ? 'nomedia' : 'insecure' });
    const atem = Machine.st.mods.find((m) => m.type === 'atem');
    const echo = !!(atem && atem.vals.echo >= 0.5);
    try { if (navigator.audioSession) navigator.audioSession.type = 'play-and-record'; } catch (e) { /* egal */ }
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: echo, noiseSuppression: false, autoGainControl: false, channelCount: 1 },
    });
    this.micStream = stream; this.micEcho = echo;
    this.micSrc = this.ctx.createMediaStreamSource(stream);
    this.micSrc.connect(this.node);
    this.micOn = true;
    this.send({ t: 'mic', on: true });
    try { await this.ctx.resume(); } catch (e) { /* egal */ }
    return true;
  },
  micStop() {
    if (this.micSrc) { try { this.micSrc.disconnect(); } catch (e) { /* egal */ } }
    if (this.micStream) for (const t of this.micStream.getTracks()) t.stop();
    this.micSrc = null; this.micStream = null; this.micOn = false;
    this.send({ t: 'mic', on: false });
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* egal */ }
  },
  async restartMic() { this.micStop(); try { await this.micStart(); } catch (e) { toast('Das Mikrofon ließ sich nicht neu starten.'); } },

  /* --- Neigung (Lot) --- */
  tilt: { on: false, b0: null, g0: null, last: 0 },
  async tiltStart() {
    if (this.tilt.on) return true;
    if (IN_VIEWER) throw Object.assign(new Error('viewer'), { code: 'viewer' });
    const D = window.DeviceOrientationEvent;
    if (!D) throw Object.assign(new Error('nosensor'), { code: 'nosensor' });
    if (typeof D.requestPermission === 'function') {
      const r = await D.requestPermission();
      if (r !== 'granted') throw Object.assign(new Error('denied'), { code: 'denied' });
    }
    this.tilt.on = true; this.tilt.b0 = null;
    window.addEventListener('deviceorientation', (e) => {
      if (e.beta == null) return;
      const t = this.tilt;
      if (t.b0 == null) { t.b0 = e.beta; t.g0 = e.gamma; }
      const now = performance.now();
      if (now - t.last < 30) return;
      t.last = now;
      let x = (e.gamma - t.g0) / 35, y = (e.beta - t.b0) / 35;
      const ang = (screen.orientation && screen.orientation.angle) || window.orientation || 0;
      if (ang === 90) [x, y] = [y, -x]; else if (ang === -90 || ang === 270) [x, y] = [-y, x]; else if (ang === 180) { x = -x; y = -y; }
      this.send({ t: 'tilt', x: clamp(x, -1, 1), y: clamp(y, -1, 1) });
    });
    return true;
  },
  tiltCenter() { this.tilt.b0 = null; },

  /* --- Nachrichten aus der Klangmaschine --- */
  handle(m) {
    switch (m.t) {
      case 'vis': this.parseVis(m.d); break;
      case 'lyr+': this.layers.set(m.id, { f0: m.f0, hz: m.hz }); if (this.handlers.layer) this.handlers.layer('add', m); break;
      case 'lyr-': this.layers.delete(m.id); if (this.handlers.layer) this.handlers.layer('del', m); break;
      case 'rec': if (this.handlers.rec) this.handlers.rec(m); break;
      case 'recDone': if (this.handlers.recDone) this.handlers.recDone(m); break;
      case 'note': if (m.k === 'nichts') toast('Gerade ist nichts zu fangen. Sing einen Ton und tippe dann auf Fangen.'); break;
      case 'err': console.warn('Klangmaschine:', m.msg); break;
    }
  },
  parseVis(d) {
    let k = 0;
    VIS.pkL = d[k++]; VIS.pkR = d[k++]; VIS.gr = d[k++]; VIS.beat = d[k++]; VIS.bpm = d[k++]; VIS.recPh = d[k++]; VIS.recSec = d[k++];
    VIS.micDb = d[k++]; VIS.micHz = d[k++]; VIS.micClar = d[k++]; VIS.hold = d[k++]; VIS.micOn = d[k++];
    const nv = d[k++];
    VIS.voices.length = 0;
    for (let i = 0; i < nv; i++) { VIS.voices.push({ note: d[k], hz: d[k + 1], lvl: d[k + 2], y: d[k + 3] }); k += 4; }
    const nh = d[k++];
    for (let i = 0; i < nh; i++) { VIS.hits.push({ hz: d[k], vel: d[k + 1], mat: d[k + 2], t: performance.now() }); k += 3; }
    if (VIS.hits.length > 60) VIS.hits.splice(0, VIS.hits.length - 60);
    const nl = d[k++];
    VIS.layers.length = 0;
    for (let i = 0; i < nl; i++) { VIS.layers.push({ id: d[k], hz: d[k + 1], lvl: d[k + 2], rate: d[k + 3] }); k += 4; }
    const nm = d[k++];
    for (let i = 0; i < nm; i++) {
      const id = d[k++];
      const no = d[k++]; const lv = d.subarray(k, k + no); k += no;
      const nmo = d[k++]; const mo = d.subarray(k, k + nmo); k += nmo;
      const nd = d[k++]; const dv = d.subarray(k, k + nd); k += nd;
      const mid = this.midOf(id);
      if (mid) VIS.mods.set(mid, { lv, mo, dv });
    }
    const nt = d[k++];
    for (let i = 0; i < nt; i++) { VIS.trig.push({ id: this.midOf(d[k]), port: d[k + 1], t: performance.now() }); k += 2; }
    if (VIS.trig.length > 40) VIS.trig.splice(0, VIS.trig.length - 40);
    VIS.t = performance.now();
  },
};
