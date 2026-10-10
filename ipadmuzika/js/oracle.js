// Sphärenwerk – das Orakel. Eigene Karten im Geist der „Oblique Strategies“ von Brian Eno und Peter Schmidt:
// Manche sind Anweisungen an dich, die meisten bauen die Maschine wirklich um (mit Rückgängig).
'use strict';

const Oracle = {
  find(type) { return Machine.st.mods.find((m) => m.type === type); },
  set(type, vals) {
    const m = this.find(type);
    if (!m) return false;
    for (const [k, v] of Object.entries(vals)) { const p = ORGANE[type].pmap.get(k); if (p) Machine.setParam(m.id, k, Param.toNorm(p, v)); }
    return true;
  },
  ensure(type) {
    let m = this.find(type);
    if (m) return m;
    const cell = this.freeCell();
    if (!cell || !Machine.canAdd(type)) return null;
    m = Machine.add(type, cell[0], cell[1]);
    if (m) Werk.autoPatch(m);
    return m;
  },
  freeCell() {
    const mods = Machine.st.mods;
    let mc = 0, mr = 0; for (const m of mods) { mc = Math.max(mc, m.c); mr = Math.max(mr, m.r); }
    for (let r = 0; r <= mr + 1; r++) for (let c = 0; c <= mc + 1; c++) if (!Machine.at(c, r) && mods.some((m) => Math.abs(m.c - c) + Math.abs(m.r - r) === 1)) return [c, r];
    return null;
  },
  cards: [
    { t: 'Ein Ton genügt.', a() { const held = Pad.orbs.filter((o) => o.kind === 'note' && !o.dying); held.slice(1).forEach((o) => Pad.releaseOrb(o)); Oracle.set('planeten', { planeten: 1 }); return held.length > 1 ? 'Alle gehaltenen Töne bis auf einen sind gelöst.' : 'Die Planeten singen nur noch mit einer Stimme.'; } },
    { t: 'Lass den Raum spielen, nicht die Töne.', a() { Oracle.set('kathedrale', { mischung: 0.85, raum: 0.92 }); return 'Die Kathedrale nimmt fast alles auf.'; } },
    { t: 'Was du festhältst, lass langsam los.', a() { Oracle.set('stimmen', { ausklang: 14 }); return 'Die Stimmen klingen jetzt vierzehn Sekunden nach.'; } },
    { t: 'Höre auf das, was zurückkommt.', a() { Oracle.set('bandschleife', { rueckkopplung: 0.86, mischung: 0.5 }); return 'Die Bandschleife wirft fast alles zurück.'; } },
    { t: 'Die Maschine träumt allein weiter.', a() { Oracle.ensure('planeten'); Oracle.set('planeten', { lauf: 1, umlauf: 24 }); return 'Die Planeten laufen. Nimm die Hände vom Pad.'; } },
    { t: 'Spiele nur mit einem Finger.' },
    { t: 'Sing den Ton, den du nicht hörst.' },
    { t: 'Der tiefste Ton schweigt.', a() { const m = Oracle.find('stimmen'); if (!m) return null; const p = ORGANE.stimmen.pmap.get('oktave'); Machine.setParam(m.id, 'oktave', Param.toNorm(p, Math.min(2, Param.fromNorm(p, m.vals.oktave) + 1))); return 'Die Stimmen klingen eine Oktave höher.'; } },
    { t: 'Vertausche Himmel und Erde.', a() { const f = Machine.st.pad.from; Machine.setPad({ from: f >= 4 ? 1 : f + 1 }); return 'Das Pad liegt jetzt in einer anderen Oktave.'; } },
    { t: 'Lass das Uhrwerk atmen.', a() { Oracle.ensure('uhrwerk'); Oracle.set('uhrwerk', { swing: 0.42, lauf: 1 }); return 'Das Uhrwerk läuft mit Swing.'; } },
    { t: 'Öffne eine neue Kammer.', a() { const free = Object.keys(ORGANE).filter((t) => !Oracle.find(t) && Machine.canAdd(t) && t !== 'lot'); if (!free.length) return null; const t = free[Math.floor(Math.random() * free.length)]; const m = Oracle.ensure(t); return m ? ORGANE[t].name + ' ist eingezogen.' : null; } },
    { t: 'Der Zufall spielt mit.', a() { const m = Oracle.ensure('irrlicht'); const st = Oracle.find('stimmen'); if (m && st) Machine.connect({ m: m.id, p: 'zufall' }, { m: st.id, p: 'glanz' }, 'mod', 0.35); Oracle.set('irrlicht', { funken: 0.5 }); return 'Das Irrlicht bewegt den Glanz der Stimmen und streut Funken.'; } },
    { t: 'Halte die Zeit an.', a() { Oracle.set('kathedrale', { ewigkeit: 1 }); return 'Die Kathedrale steht still. Ewigkeit am Regler wieder lösen.'; } },
    { t: 'Wechsle die Tonart, nicht die Stimmung.', a() { Machine.setSkala({ root: (Machine.st.skala.root + 7) % 12 }); return 'Der Grundton ist eine Quinte gewandert.'; } },
    { t: 'Erinnere dich an die Stille zwischen den Tönen.', a() { Oracle.set('stimmen', { anstieg: 2.5 }); Oracle.set('planeten', { zufall: 0.55 }); return 'Die Töne kommen langsamer, die Planeten schweigen öfter.'; } },
    { t: 'Gib dem Glas eine Stimme.', a() { Oracle.set('schlagwerk', { material: 1, schichtung: 0.65 }); return 'Das Schlagwerk ist aus Glas und klingt bei jeder Berührung mit.'; } },
    { t: 'Lass den Nebel singen.', a() { Oracle.ensure('nebel'); Oracle.set('nebel', { singen: 0.88, pegel: 0.45 }); return 'Der Nebel singt in der Tonleiter.'; } },
    { t: 'Atme durch die Maschine.', a() { Oracle.set('resonator', { mischung: 0.8, klingen: 8 }); return Audio.micOn ? 'Die Saiten des Resonators klingen lange mit.' : 'Schalte oben das MIKRO ein; die Saiten warten.'; } },
    { t: 'Wiederhole, bis es fremd klingt.', a() { Oracle.set('bandschleife', { takt: 1, zeit: 0.78, rueckkopplung: 0.93 }); return 'Die Bandschleife kreist einen Takt lang, fast endlos.'; } },
    { t: 'Nimm etwas weg.', a() { const a = Machine.st.cables.filter((c) => c.kind === 'audio'); if (a.length < 3) return null; const c = a[Math.floor(Math.random() * a.length)]; const name = Werk.cableName(c); Machine.disconnect(c.id, true); return 'Gelöst: ' + name; } },
    { t: 'Spiel erst lang, dann kurz.' },
    { t: 'Die Obertöne kennen den Weg.', a() { Machine.setSkala({ mode: 'obertoene' }); return 'Die Tonleiter folgt jetzt der Obertonreihe.'; } },
    { t: 'Zähle nicht.', a() { Oracle.ensure('uhrwerk'); Oracle.set('uhrwerk', { teilung: 3, swing: 0.2, lauf: 1 }); return 'Das Uhrwerk schlägt in Triolen.'; } },
    { t: 'Folge dem Mond.', a() { const g = Oracle.ensure('gezeiten'), st = Oracle.find('stimmen'); if (!g || !st) return null; Machine.connect({ m: g.id, p: 'III' }, { m: st.id, p: 'glanz' }, 'mod', 0.4); return 'Der dritte Mond bewegt jetzt den Glanz der Stimmen.'; } },
    { t: 'Verdopple die Langsamkeit.', a() { Machine.setTempo(Math.max(30, Machine.st.tempo / 2)); return 'Das Tempo ist halbiert: ' + Machine.st.tempo + ' BPM.'; } },
    { t: 'Vertraue dem Fehler.', a() { const ms = Machine.st.mods.filter((m) => m.type !== 'altar'); const m = ms[Math.floor(Math.random() * ms.length)]; const ps = ORGANE[m.type].params.filter((p) => p.mod); for (let i = 0; i < 2; i++) { const p = ps[Math.floor(Math.random() * ps.length)]; Machine.setParam(m.id, p.id, clamp(m.vals[p.id] + (Math.random() - 0.5) * 0.4, 0, 1)); } return ORGANE[m.type].name + ' wurde ein wenig verstellt.'; } },
  ],
  last: -1,
  draw() {
    let i;
    do { i = Math.floor(Math.random() * this.cards.length); } while (i === this.last && this.cards.length > 1);
    this.last = i;
    const card = this.cards[i];
    let note = null;
    const before = Machine.hist.length;
    if (card.a) { note = Machine.batch(() => card.a()); if (note == null) Machine.hist.length = before; }
    const changed = card.a && note != null;
    this.show(card.t, changed ? note : card.a ? 'Die Maschine fand dafür nichts zu tun. Nimm die Karte als Anweisung an dich.' : 'Eine Anweisung an dich.', changed);
  },
  show(text, note, changed) {
    const el = $('#oracle');
    const card = h('div', { class: 'ocard', role: 'dialog', 'aria-label': 'Orakelkarte' },
      h('div', { class: 'ocard-in' },
        h('div', { class: 'ocard-back' }, svgIcon('M12 2.5l2.6 6.4 6.9.5-5.3 4.4 1.7 6.7L12 16.8l-5.9 3.7 1.7-6.7-5.3-4.4 6.9-.5Z', 'ocard-star'), h('span', null, 'Orakel')),
        h('div', { class: 'ocard-front' },
          h('p', { class: 'ocard-t' }, text),
          h('p', { class: 'ocard-n' }, note),
          h('div', { class: 'ocard-a' },
            changed ? h('button', { type: 'button', class: 'btn', onclick: () => { Machine.undo(); this.hide(); toast('Zurückgenommen.'); } }, 'Zurücknehmen') : null,
            h('button', { type: 'button', class: 'btn', onclick: () => { this.hide(); setTimeout(() => this.draw(), 260); } }, 'Noch eine Karte'),
            h('button', { type: 'button', class: 'btn primary', onclick: () => this.hide() }, changed ? 'Annehmen' : 'Verstanden')))));
    el.replaceChildren(h('div', { class: 'sheet-veil', onclick: () => this.hide() }), card);
    el.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => card.classList.add('turned')));
  },
  hide() { const el = $('#oracle'); el.hidden = true; el.replaceChildren(); },
};
