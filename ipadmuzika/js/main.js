// Sphärenwerk – Steuerung: Erwecken, obere Leiste, Werk und Pad, Halten, Mikro, Tempo, Tonleiter,
// Rituale, Einstellungen und Handbuch. Eine einzige Zeichenschleife bedient alle Anzeigen.
'use strict';

const Settings = {
  d: {
    quality: 'auto', grafik: 'fein', beschriftung: 'beides', leiste: 'links', geistTakte: 2,
    recMode: 'takt', recBars: 4, recCount: true, recFold: true, recTail: 1, recClick: true, recFmt: 's24', recNorm: false,
    metronom: false, gesehen: false,
  },
  v: {},
  init() { this.v = Object.assign({}, this.d, store.json('sw.settings.v1', {})); },
  get(k) { return this.v[k]; },
  set(k, val) { this.v[k] = val; store.setJson('sw.settings.v1', this.v); },
};

const App = {
  view: 'werk', hold: false, frameN: 0, wake: null,

  boot() {
    Settings.init();
    Machine.init();
    readPalette();
    // erster Start im Hochformat: die Organe in drei Spalten legen
    if (Machine.isFresh && window.innerWidth < window.innerHeight) Machine.arrange(window.innerWidth < 640 ? 2 : 3, true);
    Werk.init();
    Pad.init();
    Pad.attach($('#mini'), 'mini');
    Recorder.init();
    this.bindBar();
    this.bindStrip();
    this.bindKeys();
    this.updateChips();
    Machine.on((ev) => { if (ev.k === 'skala' || ev.k === 'tempo' || ev.k === 'all') this.updateChips(); });
    $('#btnAwaken').addEventListener('click', () => this.awaken());
    $('#startNote').textContent = IN_VIEWER
      ? 'In dieser Vorschau bleibt das Mikrofon aus. Als eigene Webseite in Safari geöffnet, läuft auch deine Stimme durch die Maschine.'
      : IS_IOS && !STANDALONE ? 'Tipp: Über „Teilen → Zum Home-Bildschirm“ läuft das Sphärenwerk als eigene App im Vollbild.' : 'Kopfhörer bringen Tiefe und Raum am besten zur Geltung, und mit Mikrofon verhindern sie Rückkopplung.';
    document.addEventListener('visibilitychange', () => this.onVisible());
    requestAnimationFrame((t) => this.frame(t));
    for (const id of ['bar', 'main']) $('#' + id).inert = true;
    try { $('#btnAwaken').focus({ preventScroll: true }); } catch (e) { /* egal */ }
  },

  async awaken() {
    if (Audio.ready) { this.hideStart(); return; }
    const btn = $('#btnAwaken');
    btn.disabled = true; btn.textContent = 'Erwacht …';
    try {
      Audio.quality = this.pickQuality();
      await Audio.start();
      this.hideStart();
      this.keepAwake();
      Audio.ctx.onstatechange = () => this.onCtxState();
      if (!Settings.get('gesehen')) { Settings.set('gesehen', true); setTimeout(() => toast('Spiel unten auf dem Pad. Am Namensschild eines Organs ziehen ordnet um, ↻ dreht es um.', 6500), 600); }
    } catch (e) {
      console.error(e);
      btn.disabled = false; btn.textContent = 'Noch einmal versuchen';
      $('#startNote').textContent = 'Die Klangmaschine ließ sich nicht starten (' + (e.message || e) + '). Safari ab iPadOS 15 wird gebraucht.';
    }
  },
  hideStart() {
    $('#start').hidden = true;
    for (const id of ['bar', 'main']) $('#' + id).inert = false;
  },
  // Rechenleistung grob schätzen und die Klangqualität danach wählen
  pickQuality() {
    const q = Settings.get('quality');
    if (q !== 'auto') return q;
    const t0 = performance.now(), a = new Float32Array(4096);
    let x = 0, n = 0;
    while (performance.now() - t0 < 24) {
      for (let i = 0; i < 4096; i++) { x = x * 0.999 + Math.sin(i * 0.01) * 0.001; a[i] = x; }
      n++;
    }
    const rate = n / 24;
    return rate > 9 ? 2 : rate > 4 ? 1 : 0;
  },
  async keepAwake() {
    try { if ('wakeLock' in navigator) this.wake = await navigator.wakeLock.request('screen'); } catch (e) { /* egal */ }
  },
  onVisible() {
    if (document.visibilityState !== 'visible' || !Audio.ctx) return;
    Audio.ctx.resume().catch(() => {});
    this.keepAwake();
    setTimeout(() => this.onCtxState(), 900);
  },
  onCtxState() {
    const st = Audio.ctx ? Audio.ctx.state : 'running';
    $('#resume').hidden = st === 'running' || document.visibilityState !== 'visible';
  },

  /* --- obere Leiste --- */
  bindBar() {
    $('#btnMenu').addEventListener('click', (e) => this.menu(e));
    $('#chipSkala').addEventListener('click', () => this.skalaSheet());
    $('#chipTempo').addEventListener('click', () => this.tempoSheet());
    for (const b of $$('.b-hold')) b.addEventListener('click', () => this.toggleHold());
    for (const b of $$('.b-mic')) b.addEventListener('click', () => this.toggleMic());
    for (const b of $$('.b-rec')) {
      b.addEventListener('click', () => Recorder.toggle());
      b.addEventListener('contextmenu', (e) => { e.preventDefault(); Recorder.sheet(); });
    }
    for (const b of $$('.b-recset')) b.addEventListener('click', () => Recorder.sheet());
    $('#btnPad').addEventListener('click', () => this.setView('pad'));
    $('#btnResume').addEventListener('click', () => { Audio.ctx.resume().then(() => this.onCtxState()); });
    // Werkbank-Leiste
    $('#wUndo').addEventListener('click', () => { if (!Machine.undo()) toast('Nichts mehr rückgängig zu machen.'); });
    $('#wRedo').addEventListener('click', () => { if (!Machine.redo()) toast('Nichts zum Wiederholen.'); });
    $('#wOut').addEventListener('click', () => Werk.zoomAt(1 / 1.2, Werk.W / 2, Werk.H / 2));
    $('#wIn').addEventListener('click', () => Werk.zoomAt(1.2, Werk.W / 2, Werk.H / 2));
    $('#wFit').addEventListener('click', () => Werk.fit());
    $('#wArrange').addEventListener('click', () => { Machine.arrange(Math.max(2, Math.floor((Werk.W - 20) / (CELL_W * 0.8)))); setTimeout(() => Werk.fit(), 50); });
    $('#miniBig').addEventListener('click', () => this.setView('pad'));
  },
  updateChips() {
    const sk = Skala.build(Machine.st.skala);
    $('#chipSkala').replaceChildren(h('span', { class: 'chip-k' }, 'Skala'), h('span', null, (sk.scale.ratios ? NOTE_NAMES[sk.root] + ' · ' : NOTE_NAMES[sk.root] + ' ') + sk.scale.name));
    $('#chipTempo').replaceChildren(h('span', { class: 'chip-k' }, 'Tempo'), h('span', { class: 'num' }, String(Machine.st.tempo).replace('.', ',')));
  },
  toggleHold(force) {
    if (!Audio.ready) { this.awaken(); return; }
    this.hold = force != null ? force : !this.hold;
    Audio.setHold(this.hold);
    Pad.onHold(this.hold);
    for (const b of $$('.b-hold')) b.setAttribute('aria-pressed', String(this.hold));
  },
  async toggleMic() {
    if (!Audio.ready) { await this.awaken(); if (!Audio.ready) return; }
    if (Audio.micOn) { Audio.micStop(); this.micState(); return; }
    try {
      await Audio.micStart();
      if (!Machine.st.mods.some((m) => m.type === 'atem')) toast('Das Mikro ist an, aber es ist kein Atem-Organ eingesetzt.', 5000, { label: 'Atem einsetzen', fn: () => { const c = Oracle.freeCell(); if (c) { const m = Machine.add('atem', c[0], c[1]); if (m) Werk.autoPatch(m); } } });
      else toast(App.hold ? 'Mikro an. HALTEN ist gedrückt: Jeder gesungene Ton bleibt stehen.' : 'Mikro an. Drück HALTEN, und jeder gesungene Ton bleibt stehen.', 4500);
    } catch (e) {
      const msg = e.code === 'viewer' ? 'Hier in der Vorschau ist das Mikrofon gesperrt. Öffne das Sphärenwerk als eigene Webseite in Safari.'
        : e.code === 'insecure' ? 'Das Mikrofon geht nur über eine sichere Verbindung (https).'
          : e.name === 'NotAllowedError' ? 'Der Zugriff aufs Mikrofon wurde abgelehnt. In Safari unter „aA → Website-Einstellungen“ erlauben.'
            : e.name === 'NotFoundError' ? 'Es wurde kein Mikrofon gefunden.' : 'Das Mikrofon ließ sich nicht öffnen.';
      toast(msg, 6500);
    }
    this.micState();
  },
  micState() { for (const b of $$('.b-mic')) b.setAttribute('aria-pressed', String(Audio.micOn)); },
  recState() {
    for (const b of $$('.b-rec')) { b.dataset.state = Recorder.state; }
    this.recLabel();
  },
  recLabel() {
    const st = Recorder.state;
    let txt = 'Aufnahme';
    if (st === 'count' || (st === 'rec' && VIS.recPh === 1)) { const b = Math.floor(VIS.beat); txt = 'Einzählen ' + Math.max(1, -b); }
    else if (st === 'rec') {
      if (Recorder.cur && Recorder.cur.mode === 'takt') {
        const bar = Math.floor(VIS.beat / 4) + 1, bars = Recorder.cur.bars;
        txt = VIS.recPh === 3 ? 'Nachklang' : 'Takt ' + Math.min(bar, bars) + '/' + bars;
      } else txt = fnum1(VIS.recSec, 0) + ' s';
    }
    for (const b of $$('.b-rec .lbl')) b.textContent = txt;
  },
  ghostState() {
    const b = $('#sGhost');
    if (!b) return;
    b.setAttribute('aria-pressed', String(!!Ghost.rec || Ghost.layers.length > 0));
    $('#sGhost .lbl').textContent = Ghost.rec ? 'Geist hört zu' : Ghost.layers.length ? 'Geister ' + Ghost.layers.length : 'Geist';
  },

  /* --- Ansichten --- */
  setView(v) {
    if (v === this.view) return;
    this.view = v;
    const pv = $('#padView');
    if (v === 'pad') {
      pv.hidden = false; Werk.shown = false;
      pv.classList.toggle('right', Settings.get('leiste') === 'rechts');
      Pad.attach($('#padHost'), 'full');
      try { $('#sWerk').focus({ preventScroll: true }); } catch (e) { /* egal */ }
    } else {
      pv.hidden = true; Werk.shown = true; Werk.wake();
      Pad.attach($('#mini'), 'mini');
    }
    this.syncStrip();
  },
  bindStrip() {
    $('#sWerk').addEventListener('click', () => this.setView('werk'));
    const gb = $('#sGhost');
    dragger(gb, { tap: () => Ghost.start(), longpress: () => { Ghost.clear(); toast('Alle Geister sind fort.'); }, threshold: 12 });
    $('#sRelease').addEventListener('click', () => { Pad.releaseAll(); Audio.send({ t: 'lyr', op: 'all' }); Audio.send({ t: 'allOff' }); });
    $('#sOctDown').addEventListener('click', () => Machine.setPad({ from: Math.max(0, Machine.st.pad.from - 1) }));
    $('#sOctUp').addEventListener('click', () => Machine.setPad({ from: Math.min(6, Machine.st.pad.from + 1) }));
    $('#sMagnet').addEventListener('input', (e) => { Machine.setPad({ magnet: parseFloat(e.target.value) / 100 }); this.syncStrip(); });
    $('#sRows').addEventListener('click', () => { const r = (Machine.st.pad.rows % 4) + 1; Machine.setPad({ rows: r }); Pad.layout(); this.syncStrip(); });
    $('#sRange').addEventListener('click', () => { const o = Machine.st.pad.oct >= 5 ? 1 : Machine.st.pad.oct + 1; Machine.setPad({ oct: o }); this.syncStrip(); });
    Machine.on((ev) => { if (ev.k === 'pad' || ev.k === 'all') this.syncStrip(); });
  },
  syncStrip() {
    const pd = Machine.st.pad;
    $('#sMagnet').value = Math.round(pd.magnet * 100);
    $('#sMagnetV').textContent = pd.magnet >= 0.99 ? 'fest' : pd.magnet <= 0.01 ? 'frei' : Math.round(pd.magnet * 100) + ' %';
    $('#sRows .lbl').textContent = pd.rows === 1 ? 'Fläche' : pd.rows + ' Reihen';
    $('#sRange .lbl').textContent = pd.oct + (pd.oct === 1 ? ' Oktave' : ' Oktaven');
    $('#sOct').textContent = 'ab ' + NOTE_NAMES[Machine.st.skala.root] + pd.from;
  },
  bindKeys() {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { if (Sheet.isOpen) Sheet.close(); else if (!$('#oracle').hidden) Oracle.hide(); else Pop.close(); return; }
      if (e.target.closest('input, select, textarea')) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) Machine.redo(); else Machine.undo(); return; }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === ' ') { e.preventDefault(); this.toggleHold(); }
      else if (e.key === 'p') this.setView(this.view === 'pad' ? 'werk' : 'pad');
      else if (e.key === 'm') this.toggleMic();
      else if (e.key === 'r') Recorder.toggle();
      else if (e.key === 'o') Oracle.draw();
    });
  },

  /* --- Menü und Blätter --- */
  menu(e) {
    const r = e.currentTarget.getBoundingClientRect();
    const item = (label, fn, note) => h('button', { type: 'button', class: 'menu-i', onclick: () => { Pop.close(); fn(); } }, h('span', null, label), note ? h('small', null, note) : null);
    Pop.open(r.left + 120, r.bottom, h('div', { class: 'menu' },
      item('Rituale', () => this.ritualSheet(), 'fertige Maschinen laden und eigene sichern'),
      item('Orakel befragen', () => Oracle.draw(), 'eine Karte ziehen'),
      item('Aufnahmen', () => Recorder.sheet(), 'für Loopy Pro'),
      item('Einstellungen', () => this.settingsSheet()),
      item('Handbuch', () => this.helpSheet()),
      item('Stille', () => { Audio.send({ t: 'panic' }); Pad.releaseAll(); Ghost.clear(); if (this.hold) this.toggleHold(false); toast('Alles verstummt.'); }, 'alle Töne, Hall und Echos sofort aus'),
    ), { below: true });
  },
  skalaSheet() {
    const st = Machine.st.skala;
    const body = h('div', { class: 'skala' });
    const wheel = h('div', { class: 'wheel', role: 'radiogroup', 'aria-label': 'Grundton' });
    NOTE_NAMES.forEach((n, i) => {
      const a = (i / 12) * TAU - Math.PI / 2;
      const b = h('button', { type: 'button', class: 'wheel-n', role: 'radio', 'aria-checked': String(i === st.root), style: { left: (50 + Math.cos(a) * 41) + '%', top: (50 + Math.sin(a) * 41) + '%' }, onclick: () => { Machine.setSkala({ root: i }); this.skalaSheet(); } }, n);
      wheel.append(b);
    });
    const sk = Skala.build(st);
    const center = h('div', { class: 'wheel-c' });
    for (let i = 0; i < sk.n; i++) {
      const d = Skala.degree(i);
      center.append(h('span', { class: 'deg', style: { color: d.color }, title: d.name }, svgIcon(d.path, 'deg-ico'), h('b', null, Skala.degreeNoteName(sk, i))));
    }
    wheel.append(center);
    body.append(wheel,
      h('div', { class: 'field' }, h('span', { class: 'field-l' }, 'Tonleiter'), chips(SCALES.map((s) => ({ id: s.id, label: s.name })), st.mode, (v) => { Machine.setSkala({ mode: v }); this.skalaSheet(); })),
      h('div', { class: 'field' }, h('span', { class: 'field-l' }, 'Stimmung'), chips(TUNINGS.map((t) => ({ id: t.id, label: t.name })), st.tuning, (v) => { Machine.setSkala({ tuning: v }); this.skalaSheet(); })),
      h('div', { class: 'field' }, h('span', { class: 'field-l' }, 'Kammerton'), chips([415, 432, 440, 442].map((f) => ({ id: f, label: 'A = ' + f + ' Hz' })), st.a4, (v) => { Machine.setSkala({ a4: v }); })),
      h('p', { class: 'sheet-note' }, 'Jede Stufe trägt das Zeichen eines Himmelskörpers, wie in der alten Lehre von der Sphärenmusik: Sonne, Mond, Merkur, Venus, Mars, Jupiter, Saturn. Dieses Raster liegt überall auf dem Pad, auf den Saiten, den Planeten und den Ringen.'));
    Sheet.open('Skala', body, { wide: true });
  },
  tempoSheet() {
    let taps = [];
    const big = h('div', { class: 'tempo-big num' }, String(Machine.st.tempo).replace('.', ','));
    const set = (v) => { Machine.setTempo(v); big.textContent = String(Machine.st.tempo).replace('.', ','); sl.value = Machine.st.tempo; };
    const sl = h('input', { type: 'range', id: 'tempoRange', min: 30, max: 240, step: 1, value: Machine.st.tempo, 'aria-label': 'Tempo' });
    sl.addEventListener('input', () => set(parseFloat(sl.value)));
    const tap = h('button', { type: 'button', class: 'btn tap', onclick: () => {
      const now = performance.now();
      taps = taps.filter((t) => now - t < 2500); taps.push(now);
      if (taps.length >= 2) { const d = (taps[taps.length - 1] - taps[0]) / (taps.length - 1); set(Math.round(60000 / d)); }
    } }, 'Antippen im Takt');
    const metro = Settings.get('metronom');
    Sheet.open('Tempo', h('div', { class: 'tempo' },
      h('div', { class: 'tempo-row' }, h('button', { type: 'button', class: 'btn round', onclick: () => set(Machine.st.tempo - 1), 'aria-label': 'langsamer' }, '−'), big, h('button', { type: 'button', class: 'btn round', onclick: () => set(Machine.st.tempo + 1), 'aria-label': 'schneller' }, '+')),
      h('div', { class: 'tempo-unit' }, 'Schläge pro Minute'), sl, tap,
      h('div', { class: 'field' }, h('span', { class: 'field-l' }, 'Metronom'), chips([{ id: false, label: 'aus' }, { id: true, label: 'an (nie in der Aufnahme)' }], metro, (v) => { Settings.set('metronom', v); Audio.send({ t: 'click', mode: v ? 2 : (Settings.get('recClick') ? 1 : 0) }); })),
      h('p', { class: 'sheet-note' }, 'Stell hier dasselbe Tempo ein wie in Loopy Pro. Uhrwerk, Bandschleife im Takt, Geisterhand und Takt-Aufnahmen folgen ihm.')));
  },
  ritualSheet() {
    const list = h('div', { class: 'rituals' });
    for (const r of RITUALE) {
      list.append(h('button', { type: 'button', class: 'ritual', onclick: () => {
        const st = ritualState(r);
        Machine.load(st); Pad.layout(); Werk.fit(); Sheet.close(); this.toggleHold(false);
        toast('Ritual geladen: ' + r.name, 3500, { label: 'Rückgängig', fn: () => Machine.undo() });
      } }, h('span', { class: 'ritual-n' }, r.name), h('span', { class: 'ritual-t' }, r.text)));
    }
    const own = store.json('sw.rituale.v1', []);
    const mine = h('div', { class: 'rituals mine' });
    if (!own.length) mine.append(h('p', { class: 'empty' }, 'Noch keine eigenen Rituale. Sichere die jetzige Maschine unten mit einem Namen.'));
    own.forEach((r, i) => {
      mine.append(h('div', { class: 'ritual own' },
        h('button', { type: 'button', class: 'ritual-load', onclick: () => { const st = JSON.parse(JSON.stringify(r.st)); if (Machine.load(st)) { Pad.layout(); Werk.fit(); Sheet.close(); toast('Ritual geladen: ' + r.name); } else toast('Dieses Ritual ließ sich nicht laden.'); } },
          h('span', { class: 'ritual-n' }, r.name), h('span', { class: 'ritual-t' }, new Date(r.date).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' }))),
        h('button', { type: 'button', class: 'btn small', onclick: () => this.exportRitual(r) }, 'Als Datei'),
        confirmButton('Löschen', 'Wirklich?', () => { own.splice(i, 1); store.setJson('sw.rituale.v1', own); this.ritualSheet(); }, 'small warn')));
    });
    const name = h('input', { type: 'text', id: 'ritualName', placeholder: 'Name des Rituals', maxlength: 40, value: '' });
    const save = h('button', { type: 'button', class: 'btn primary', onclick: () => {
      const n = name.value.trim() || 'Ritual vom ' + new Date().toLocaleDateString('de-DE');
      own.push({ name: n, date: Date.now(), st: JSON.parse(JSON.stringify(Machine.st)) });
      if (!store.setJson('sw.rituale.v1', own)) toast('Der Speicher des Browsers ist voll.'); else toast('Gesichert: ' + n);
      this.ritualSheet();
    } }, 'Jetzige Maschine sichern');
    const file = h('input', { type: 'file', id: 'ritualFile', accept: '.json,application/json', class: 'vh' });
    file.addEventListener('change', async () => {
      const f = file.files && file.files[0]; if (!f) return;
      try {
        const data = JSON.parse(await f.text());
        const st = data.st || data;
        if (!Machine.valid(st)) throw new Error('ungültig');
        own.push({ name: data.name || f.name.replace(/\.json$/, ''), date: Date.now(), st });
        store.setJson('sw.rituale.v1', own); toast('Ritual eingelesen.'); this.ritualSheet();
      } catch (e) { toast('Diese Datei ist kein Sphärenwerk-Ritual.'); }
    });
    Sheet.open('Rituale', h('div', null,
      h('p', { class: 'sheet-note' }, 'Ein Ritual ist eine ganze Maschine: Organe, Kabel, Regler, Tonleiter und Tempo. Laden lässt sich rückgängig machen.'),
      list, h('h3', { class: 'sub' }, 'Eigene Rituale'), mine,
      h('div', { class: 'save-row' }, name, save),
      h('label', { class: 'btn small filebtn', for: 'ritualFile' }, 'Ritual aus Datei einlesen'), file), { wide: true });
  },
  async exportRitual(r) {
    const blob = new Blob([JSON.stringify({ app: 'Sphärenwerk', v: 1, name: r.name, st: r.st }, null, 1)], { type: 'application/json' });
    const res = await Files.offer('sphaerenwerk-ritual-' + slug(r.name) + '.json', blob, 'application/json');
    if (res === 'error') toast('Speichern ist hier gerade nicht möglich.');
  },
  settingsSheet() {
    const q = Settings.get('quality');
    Sheet.open('Einstellungen', h('div', { class: 'settings' },
      h('div', { class: 'field' }, h('span', { class: 'field-l' }, 'Klangqualität'), chips([{ id: 'auto', label: 'Automatisch' }, { id: 2, label: 'Hoch' }, { id: 1, label: 'Mittel' }, { id: 0, label: 'Sparsam' }], q, (v) => {
        Settings.set('quality', v); const qq = v === 'auto' ? this.pickQuality() : v; Audio.setQuality(qq); toast('Klangqualität: ' + ['sparsam', 'mittel', 'hoch'][qq]);
      })),
      h('p', { class: 'sheet-note' }, 'Hoch: 16 Stimmen und dichte Körner beim Halten. Bei Aussetzern auf älteren iPads Mittel oder Sparsam wählen.'),
      h('div', { class: 'field' }, h('span', { class: 'field-l' }, 'Grafik'), chips([{ id: 'fein', label: 'Fein' }, { id: 'sparsam', label: 'Sparsam' }], Settings.get('grafik'), (v) => { Settings.set('grafik', v); Pad.resize(); })),
      h('div', { class: 'field' }, h('span', { class: 'field-l' }, 'Beschriftung'), chips([{ id: 'beides', label: 'Zeichen und Noten' }, { id: 'noten', label: 'Noten' }, { id: 'zeichen', label: 'Zeichen' }], Settings.get('beschriftung'), (v) => Settings.set('beschriftung', v))),
      h('div', { class: 'field' }, h('span', { class: 'field-l' }, 'Leiste im Pad'), chips([{ id: 'links', label: 'links' }, { id: 'rechts', label: 'rechts' }], Settings.get('leiste'), (v) => { Settings.set('leiste', v); $('#padView').classList.toggle('right', v === 'rechts'); })),
      h('div', { class: 'field' }, h('span', { class: 'field-l' }, 'Geisterhand'), chips([1, 2, 4].map((b) => ({ id: b, label: b + (b === 1 ? ' Takt' : ' Takte') })), Settings.get('geistTakte'), (v) => Settings.set('geistTakte', v))),
      h('h3', { class: 'sub' }, 'Werkstatt'),
      h('div', { class: 'acts-row' }, confirmButton('Maschine neu aufbauen', 'Wirklich alles zurücksetzen?', () => { Machine.load(Machine.fresh()); Werk.fit(); Sheet.close(); toast('Die Maschine steht wieder im Grundzustand.', 4000, { label: 'Rückgängig', fn: () => Machine.undo() }); }, 'warn'))));
  },
  helpSheet() {
    const sec = (title, ...ps) => h('section', { class: 'help-s' }, h('h3', null, title), ...ps.map((p) => h('p', null, p)));
    Sheet.open('Handbuch', h('div', { class: 'help' },
      sec('Spielen', 'Unten liegt das Pad, mit PAD wird es bildschirmfüllend. Waagrecht spielst du die Tonhöhe, senkrecht die Klangfarbe: unten dunkel und weich, oben hell und mit mehr Glanz. Jeder Finger ist eine eigene Stimme.',
        'Die Lichtlinien sind das Raster der Tonleiter. Der Magnet bestimmt, wie stark ein Ton einrastet: „frei“ gleitet stufenlos, „fest“ springt von Ton zu Ton, dazwischen gleitest du und landest beim Ruhen sauber auf dem nächsten Ton. Mit dem Apple Pencil steuert der Druck die Stärke.'),
      sec('Halten', 'Ist HALTEN gedrückt, bleibt jeder Ton nach dem Loslassen als leuchtende Kugel stehen. Zieh an einer Kugel, um sie zu verschieben; tipp sie kurz an, um sie zu lösen. HALTEN aus löst alles.',
        'Mit eingeschaltetem MIKRO fängt HALTEN auch deine Stimme: Jeder gesungene Ton wird eingefroren, auf die Tonleiter gestimmt und klingt als eigene Kugel weiter. Auch diese Kugeln lassen sich verschieben: waagrecht ändert die Tonhöhe, senkrecht die Lautstärke.'),
      sec('Die Maschine', 'Jedes Organ ist eine Platte mit Drehreglern und Buchsen. Drehen: Finger auf den Regler und nach oben oder unten ziehen; weiter seitlich ziehen dreht fein. Doppeltippen setzt zurück.',
        'Kabel: Von einer Buchse zur passenden anderen ziehen. Kupfer trägt Klang, Grünspan trägt Modulation (zu den kleinen Buchsen an den Reglern), Violett trägt Auslöser. Ein gestecktes Kabel ziehst du an seiner Eingangsbuchse wieder heraus oder steckst es um. Ein Tipp aufs Kabel öffnet seine Tiefe.',
        'Umbau: Am Namensschild ziehen ordnet ein Organ um. ↻ dreht es um: Auf der Rückseite liegen weitere Regler, Zurücksetzen und Ausbauen. In freie Felder (+) setzt du neue Organe ein.'),
      sec('Aufnehmen für Loopy Pro', 'Stell im Sphärenwerk dasselbe Tempo ein wie in Loopy Pro. AUFNAHME zählt einen Takt ein, nimmt genau die gewählte Zahl an Takten auf und faltet den Nachklang in den Anfang, damit die Schleife ohne Naht weiterklingt.',
        'Unter „Aufnahmen“ kannst du jede Schleife zur Probe endlos hören und als WAV sichern. In Loopy Pro importierst du die Datei aus der Dateien-App in einen Clip.'),
      sec('Geisterhand und Orakel', 'GEIST im Vollbild-Pad nimmt deine Gesten ab dem nächsten Takt auf und spielt sie danach in Schleife weiter, bis zu drei Geister übereinander. Lange drücken räumt sie weg.',
        'Das Orakel im Menü zieht eine Karte. Manche Karten sind Anweisungen an dich, die meisten bauen die Maschine um. Alles lässt sich zurücknehmen.'),
      sec('Tipps fürs iPad', 'Für das Spiel mit vier oder fünf Fingern: In den iPad-Einstellungen unter „Multitasking & Gesten“ die Gesten ausschalten. Mit Mikrofon Kopfhörer tragen, sonst kann es rückkoppeln. Als App auf dem Home-Bildschirm läuft das Sphärenwerk im Vollbild.',
          'Tasten: Leertaste HALTEN, P Pad, M Mikro, R Aufnahme, O Orakel, ⌘Z Rückgängig.')), { wide: true });
  },

  /* --- Zeichenschleife --- */
  frame(t) {
    this.frameN++;
    try {
      if (this.view === 'werk') {
        Werk.frame(t);
        if (this.frameN % 2 === 0) Werk.slow(t);
      }
      Pad.frame(t);
      if (this.frameN % 4 === 0) {
        if (Recorder.state !== 'idle') this.recLabel();
        const lv = clamp((VIS.micDb + 60) / 60, 0, 1);
        for (const b of $$('.b-mic')) b.style.setProperty('--lv', Audio.micOn ? lv.toFixed(2) : 0);
      }
    } catch (e) { console.error(e); }
    requestAnimationFrame((tt) => this.frame(tt));
  },
};

window.addEventListener('DOMContentLoaded', () => App.boot());
