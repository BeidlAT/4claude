// ---- the card (SPEC §16, first version): a section „Hexenring“ on top of the Aufnahme panel – per Schleife its
// Schichten (level, mute, delete), length, phase, corrections, source, Zusammenlegen, Löschen; the graveyard; the
// global settings. Every hold of the Ringleiste has its tap here (Weiter, Zurück, Wiederholen, Alle leeren). ----
const HXK = { sec: null, list: null, acts: null, grave: null, sub: null, mem: null, dirty: true, t: 0 };
function hxCardSec() {
  HXK.sub = h('p', null, '');
  HXK.acts = h('div', { class: 'hx-acts' });
  HXK.list = h('div', { class: 'hx-cards' });
  HXK.grave = h('div', { class: 'hx-grave' });
  HXK.mem = h('p', { class: 'note' }); HXK.cost = h('p', { class: 'note', id: 'hxCost' });
  HXK.form = h('div', { class: 'hx-form-sec' });   // (step 1d: Lichtungen, Kern, Lücke, Schluss)
  HXK.gd = h('div', { class: 'hx-form-sec hx-gd' });   // (Etappe 3: the Gärtner)
  const set = foldSec('hxset', 'Einstellungen', [
    grid(ctl('hx.modus'), ctl('hx.start'), ctl('hx.raster'), ctl('hx.ein'), ctl('hx.klick'), ctl('hx.laenge'), ctl('hx.festT'), ctl('hx.pulsMit'), ctl('hx.borMit'), ctl('hx.autoclose'), ctl('hx.runde'), ctl('hx.rail'), ctl('hx.humus'), ctl('hx.ernte'), ctl('hx.mem')),
    h('div', { class: 'lab hx-sub' }, 'Wuchs'), grid(ctl('hx.beginn'), ctl('hx.stufe'), ctl('hx.tonartAmTakt')),   // (step 2a)
    h('div', { class: 'lab hx-sub' }, 'Form'), grid(ctl('hx.regel'), ctl('hx.lichMix'), ctl('hx.lichPuls'), ctl('hx.lueckeT'), ctl('hx.schluss'), ctl('hx.welk')),
    h('div', { class: 'lab hx-sub' }, 'Mitspieler'), grid(ctl('hx.gPlatz'), ctl('hx.gRollen'), ctl('hx.gAntw'), ctl('hx.gBegl'), ctl('hx.gWk'), ctl('hx.gStimme'), ctl('hx.hand')), (HXK.hand = h('div', { class: 'hx-klopf' })),   // (Etappe 3)
    h('div', { class: 'lab hx-sub' }, 'Band und Bühne'), grid(ctl('hx.traeg'), ctl('hx.stopp'), ctl('hx.buehne')),   // (step 2b)
    (HXK.setl = h('div', { class: 'hx-setw' })),
    (HXK.klopf = h('div', { class: 'hx-klopf' })),
    (HXK.mic = h('div', { class: 'hx-micw' })),   // (step 4: the microphone)
    (HXK.ped = h('div', { class: 'hx-ped' })),
    (HXK.bew = h('div', { class: 'hx-bew' })),
    HXK.mem,
    h('p', { class: 'note' }, 'Der Korb erntet, was du gespielt hast („Gespielt“: deine Klangquellen nach Stumm und Solo, ohne Echo und Hall); „Alles“ wählst du pro Schleife – es hört auch die Schleifen mit, wie ein Zusammenmischen. Die Humus-Länge gilt ab dem nächsten Klangstart.'),
  ]);
  HXK.sec = h('div', { class: 'sec hx-sec', id: 'hxSec' }, h('div', { class: 'sec-h' }, h('h3', null, 'Hexenring'), HXK.sub), HXK.acts, HXK.cost, HXK.list, HXK.gd, HXK.form, HXK.grave, set);
  HXK.dirty = true; hxCardRender();
  hxTipsWatch(HXK.sec);   // (25.10.2026: every control explains itself on hover)
  hxBlitzOn(HXK.sec);   // (25.10.2026: every press flashes)
  return HXK.sec;
}
// Spielverzögerung in the card: „Klopf mit“ – while it runs, a big pad to tap (press-acting) with the taps counted
function hxKlopfRender() {
  const box = HXK.klopf; if (!box) return;
  const K = HX.klopf, lat = hxLat();
  if (K) {
    const pad = h('button', { type: 'button', class: 'btn primary hx-kpad', 'aria-label': 'Hier auf jeden Klick tippen' }, 'Tipp mit dem Klick · ' + K.taps.length + ' von ' + HX_KLOPF);
    pad.addEventListener('pointerdown', (e) => { if (e.button > 0) return; e.preventDefault(); hxKlopfTap(e); });
    hxKeyClick(pad, () => hxKlopfTap(null));
    const stop = h('button', { type: 'button', class: 'btn ghost' }, 'Abbrechen'); stop.addEventListener('click', () => { HX.klopf = null; hxCardDirty(); });
    box.replaceChildren(h('div', { class: 'hx-row' }, h('span', { class: 'lab' }, 'Spielverzögerung'), h('div', { class: 'hx-kb' }, pad, stop)));
    return;
  }
  const go = h('button', { type: 'button', class: 'btn' }, 'Klopf mit'); go.addEventListener('click', hxKlopfStart);
  const reset = lat ? h('button', { type: 'button', class: 'btn ghost' }, 'Auf 0') : null; if (reset) reset.addEventListener('click', () => { hxDev('lat', 0); hxCardDirty(); });
  box.replaceChildren(h('div', { class: 'hx-row' }, h('span', { class: 'lab' }, 'Spielverzögerung'), h('div', { class: 'hx-kb' }, h('span', { class: 'hx-ms' }, lat ? Math.round(lat * 1000) + ' ms' : 'nicht gemessen'), go, reset)),
    h('p', { class: 'note' }, 'Acht Tipper zu einem Klick: wie spät dein Spiel nach dem gehörten Schlag im Humus ankommt. Schleifen, die du zum laufenden Puls erntest, sitzen dann dort, wo du spielen wolltest.'));
}
function hxCardDirty() { HXK.dirty = true; if (UI.panel === 'rec') { clearTimeout(HXK.tm); HXK.tm = setTimeout(hxCardRender, 120); } }
function hxCardOpen(slot) {
  if (UI.panel !== 'rec') openPanel('rec');
  hxCardRender();
  const el = slot != null && document.getElementById('hxc-' + slot);
  setTimeout(() => { const t = el || HXK.sec; if (t) { t.scrollIntoView({ block: 'start', behavior: 'smooth' }); if (el) el.classList.add('flash'); setTimeout(() => el && el.classList.remove('flash'), 900); } }, 60);
}
function hxCardFrame() {   // the live words (state, MB) – a few times a second
  if (!HXK.sec || performance.now() - HXK.t < 300) return;
  HXK.t = performance.now();
  if (HXK.dirty) { hxCardRender(); return; }
  for (const L of hxLoopsLive()) { const m = document.getElementById('hxm-' + L.slot); if (m) { const t = hxCardMeta(L); if (m.textContent !== t) m.textContent = t; } }
  hxCardSub();
}
const hxStateWord = (L) => ({ spielt: 'spielt', stumm: 'stumm', angehalten: 'angehalten' })[L.state] || L.state;
function hxCardMeta(L) {
  const p = HX.pend.find((x) => x.loop === L.id);
  return hxLenText(L) + (hxTakt(L) ? ' · ' + dec(tgBpm(hxNowT()).toFixed(1)) + ' BPM' : '') + ' · ' + hxStateWord(L) + (p ? ' (' + p.label + ')' : '') + (HX.fokus === L.id ? ' · Fokus' : '') + (L.src ? ' · Alles' : '');
}
function hxCardSub() {
  const n = hxLoopsLive().length, mb = Math.round(hxMemUsed() / 1048576);
  const t = (n ? n + (n === 1 ? ' Schleife' : ' Schleifen') + ' · ' : '') + mb + ' MB · Humus ' + P['hx.humus'] + ' s';
  if (HXK.sub.textContent !== t) HXK.sub.textContent = t;
  // (Leistung, 23.10.2026) the share of the device's budget the loops take now – the same count that leaves the rest to the
  // live playing (units: one simple voice each); a halted loop costs nothing
  const c = hxLoad(), ct = HX.node ? 'Rechenzeit: Schleifen und Humus ' + dec(c.toFixed(1)) + ' von ' + VBUDGET + ' Einheiten' + (c >= VBUDGET ? ' – für dein Live-Spiel bleibt nur, was das Gerät darüber hinaus schafft' : ' – für dein Live-Spiel bleiben ' + dec((VBUDGET - c).toFixed(1))) + '.' : '';
  if (HXK.cost && HXK.cost.textContent !== ct) HXK.cost.textContent = ct;
  const mt = 'Belegt: ' + mb + ' von ' + P['hx.mem'] + ' MB (Schleifen, ihre Kopien, Gelöschte, Verlauf, Aufnahmen, Humus).' + (HX.saveFail ? ' Der Gerätespeicher ist voll – neue Schichten werden nicht mehr gesichert.' : IDB.ok ? ' Schleifen werden auf diesem Gerät gesichert und kommen nach einem Neuladen zurück.' : ' Diese Ansicht kann Schleifen nicht sichern.') + (HX.est ? ' Gerätespeicher: ' + HX.est : '')
    + (HXW.st === 'kein' ? ' Einbrennen und der Ausklang aus den Noten gehen in dieser Ansicht nicht (kein Werk-Rahmen): Schleifen folgen der Effektkette.' : '');
  if (HXK.mem.textContent !== mt) HXK.mem.textContent = mt;
  HXK.mem.classList.toggle('warn', !!(HX.saveFail || HX.memFull));
}
function hxCardRender() {
  if (!HXK.sec) return;
  HXK.dirty = false;
  const btn = (t, fn, o = {}) => { const b = h('button', { type: 'button', class: 'btn' + (o.cls ? ' ' + o.cls : ''), 'aria-label': o.aria || null, disabled: o.dis || null }, t); b.addEventListener('click', fn); return b; };
  // tap paths for every hold
  const ang = hxLoopsLive().some((L) => L.state === 'angehalten');
  HXK.acts.replaceChildren(...[   // (Etappe 3: null filtered – replaceChildren wrote it as the text „null“ when nothing was angehalten)
    ang ? btn('▶ Weiter', hxWeiter, { cls: 'primary', aria: 'Weiter: angehaltene Schleifen beginnen auf der nächsten Eins' }) : null,
    btn('↶ Zurück', hxUndoStep, { dis: !HX.hist.length && !HX.pend.length }),
    btn('↷ Wiederholen', hxRedoStep, { dis: !HX.redo.length }),
    btn('Alle leeren', () => hxLeeren(), { cls: 'ghost danger', dis: !hxLoopsLive().length })].filter(Boolean));
  hxKlopfRender(); hxCardPed(); hxCardBew(); if (HXK.mic) HXK.mic.replaceChildren(hxCardMic(btn));   // (step 4)
  const loops = hxLoopsLive().sort((a, b) => a.slot - b.slot);
  HXK.list.replaceChildren();
  if (!loops.length) HXK.list.append(h('div', { class: 'empty' }, 'Noch keine Schleife. Spiel etwas und tippe den Korb unter dem Spielfeld – oder tippe den runden Knopf daneben, spiel und tippe noch einmal.'));
  for (const L of loops) HXK.list.append(hxCardOne(L, btn));
  hxCardForm(btn);   // (step 1d)
  hxCardGd(btn); hxCardHand(btn);   // (Etappe 3)
  if (HXK.setl) HXK.setl.replaceChildren(hxCardSet(btn));   // (step 2b)
  // the graveyard (this session)
  HXK.grave.replaceChildren();
  if (HX.grave.length) {
    const rows = HX.grave.map((g) => h('div', { class: 'hx-gr' }, h('span', null, 'Schleife ' + ((g.snap.slot || 0) + 1) + ' · ' + (ENG_NAME[g.snap.eng] || '') + ' · ' + new Date(g.t).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })),
      btn('Zurückholen', () => { HX.grave = HX.grave.filter((x) => x !== g); const L = hxRebuild(g.snap); if (L) hxHist({ kind: 'neu', label: hxName(L) + ' zurückgeholt', snaps: [], undo() { const X = hxByKey(L.key); if (X) { this.snaps = [hxSnap(X)]; HX.grave.unshift({ snap: this.snaps[0], t: Date.now() }); hxDrop(X); } }, redo() { if (this.snaps[0]) { HX.grave = HX.grave.filter((x) => x.snap !== this.snaps[0]); hxRebuild(this.snaps[0]); } } }); hxCardDirty(); })));
    HXK.grave.append(h('div', { class: 'hx-gh' }, h('b', null, 'Gelöscht'), h('span', null, ' – bis zum Ende der Sitzung'), btn('Endgültig entfernen', hxGraveClear, { cls: 'ghost danger' })), ...rows);
  }
  hxCardSub();
}
// (step 1d) the form in the card: the Lichtungen (switch, rule, Kern, overwrite, delete) and the tap paths of the row
function hxCardForm(btn) {
  const box = HXK.form; if (!box) return;
  box.replaceChildren();
  if (!hxLoopsLive().length && !HX.lich.length) return;
  const chip = (t, on, fn, aria) => { const b = h('button', { type: 'button', class: 'chip', 'aria-pressed': on ? 'true' : 'false', 'aria-label': aria || null }, t); b.addEventListener('click', fn); return b; };
  const wait = HX.pend.find((p) => p.kind === 'licht');
  const rows = HX.lich.map((Li) => {
    const n = Object.values(Li.loops).filter((w) => w.on).length;
    return h('div', { class: 'hx-lrow' + (HX.lichCur === Li.id ? ' cur' : '') },
      h('span', { class: 'lab' }, Li.name + (wait && wait.lich === Li.id ? ' (' + wait.label.replace(/^.*? ab /, 'ab ') + ')' : HX.lichCur === Li.id ? ' · jetzt' : '')),
      h('span', { class: 'hx-ms' }, n + (n === 1 ? ' Schleife' : ' Schleifen') + (Li.mix ? ' · Mixer' : '') + (Li.puls != null ? ' · Puls ' + (Li.puls ? 'an' : 'aus') : '')),
      h('div', { class: 'chips small' },
        chip('Hin', false, () => { hxLichGo(Li); hxCardDirty(); }, Li.name + ' – wechseln ' + HX_REGEL[Li.rule]),
        chip('Takt', Li.rule === 'takt', () => { Li.rule = 'takt'; hxFormSave(); hxCardDirty(); hxRailDirty(); }, Li.name + ' wechselt am Takt'),
        chip('Schleifenende', Li.rule === 'ende', () => { Li.rule = 'ende'; hxFormSave(); hxCardDirty(); hxRailDirty(); }, Li.name + ' wechselt am Ende der längsten Schleife'),
        chip('Kern', !!Li.kern, () => { for (const x of HX.lich) x.kern = x === Li ? !Li.kern : false; hxFormSave(); hxCardDirty(); hxRailDirty(); }, Li.name + ' als Kern'),
        chip('Überschreiben', false, () => { Li.loops = hxLichNow(); if (P['hx.lichMix']) Li.mix = mxSnapTake(); if (P['hx.lichPuls']) Li.puls = !!SEQ.on; HX.lichCur = Li.id; hxFormSave(); hxCardDirty(); hxSay(Li.name + ' neu gemerkt'); }, Li.name + ' mit dem, was jetzt klingt, überschreiben'),
        h('button', { type: 'button', class: 'chip danger', 'aria-label': Li.name + ' löschen', onclick: () => hxLichDel(Li) }, '✕')));
  });
  box.append(h('div', { class: 'hx-gh' }, h('b', null, 'Form'), h('span', null, HX.lich.length ? ' – Lichtungen: welche Schleifen klingen' : ' – noch keine Lichtung')),
    ...rows,
    h('div', { class: 'hx-acts' }, btn('Merken', () => { hxLichMerken(); hxCardDirty(); }, { cls: 'primary' }), btn(HX.kernBack ? 'Zurück vom Kern' : 'Kern', () => { hxKern(); hxCardDirty(); }),
      btn('Lücke', () => hxLuecke(1)), btn('Takt-Lücke', () => hxLuecke(4)), HX.schluss ? btn('Schluss abbrechen', () => { hxSchlussAb(); hxCardDirty(); }, { cls: 'ghost danger' }) : btn('Schluss · ' + { ende: 'am Ende', welkend: 'welkend', abbauend: 'abbauend' }[P['hx.schluss']], () => { hxSchluss(); hxCardDirty(); })),
    hxCardFolge(btn) || '', hxCardTreffen(btn) || '');   // (step 2b; step 4: Treffen)
}
// (step 1d) a Schleife of Bewegung's card: what it moves, its state, Verblassen, Löschen
function hxCardBewOne(L, btn, chip) {
  const row = (lab, ...kids) => h('div', { class: 'hx-row' }, h('span', { class: 'lab' }, lab), h('div', { class: 'chips small' }, ...kids));
  const st = (to, t) => chip(t, L.state === to, () => { if (to === L.state) return; if (to === 'angehalten') hxState(L.id, 'angehalten'); else if (L.state === 'angehalten') hxReenter([L]); else hxState(L.id, to, null, { X: 0.02 }); hxCardDirty(); hxRailDirty(); });
  const B = L.bew, g = A.ctx ? clamp(hxBewGain(L, faeB(A.ctx.currentTime)), 0, 1) : B.g0;
  return h('div', { class: 'hx-card' + (HX.fokus === L.id ? ' fok' : ''), id: 'hxc-' + L.slot },
    h('div', { class: 'hx-ch' }, h('b', null, hxName(L) + ' · Bewegung'), h('span', { class: 'meta', id: 'hxm-' + L.slot }, hxCardMeta(L))),
    h('p', { class: 'note' }, B.lanes.length ? 'Bewegt: ' + hxBewNames(L).join(', ') + ' – live obendrauf.' : 'Wird mitgeschrieben …'),
    row('Zustand', st('spielt', 'spielt'), st('stumm', 'stumm'), st('angehalten', 'angehalten')),
    row('Verblassen', ...[[0.6, '× 0,6'], [0.75, '× 0,75'], [0.85, '× 0,85'], [0.95, '× 0,95'], [1, 'nie']].map(([v, t]) => chip(t, Math.abs(B.fade - v) < 1e-6, () => { const b = A.ctx ? faeB(A.ctx.currentTime) : B.gs; B.g0 = hxBewGain(L, b); B.gs = b; B.fade = v; B.re = true; hxSaveMeta(L.id); hxCardDirty(); }, 'Verblassen ' + t)), h('span', { class: 'hx-ms' }, Math.round(g * 100) + ' %')),
    h('div', { class: 'hx-row end' }, btn('Löschen', () => hxDelete(L), { cls: 'ghost danger' })));
}
// (step 2a) the card's Wuchs: how it plays (Abdruck · Wuchs, and why it grows), Eigensinn, Stufe, Folgen, Klang, the throw
// and ✓ ✕ ⚓ – only for a loop with notes it can play anew (Gespielt)
function hxCardWuchs(L, sch, chip, row, btn) {
  if (!sch.some(hxWCan)) return [h('div', { class: 'hx-row' }, h('span', { class: 'lab' }, 'Wuchs'), h('span', { class: 'hx-ms' }, L.src ? 'aus „Alles“: bleibt ein Abdruck' : 'ohne Noten: bleibt ein Abdruck'))];
  const st = hxWQ(L), stufe = L.stufe || null, klang = L.klang || 'eigen';
  const on = hxWAktiv(L), w = L.wwhy || {}, word = hxWWord(L), why = [hxWTonOff(L) && 'folgt der Tonart', w.tempo && 'folgt dem Tempo', klang !== 'eigen' && 'anderer Klang'].filter(Boolean).join(', ');
  const no = !hxwOk();
  const sel = h('select', { class: 'hx-eng', 'aria-label': 'Klang: eine Quelle wählen' }, h('option', { value: '' }, 'Quelle …'), ...ENG_OPTS.map(([k, n]) => h('option', { value: k, selected: klang === k ? '' : null }, n)));
  sel.addEventListener('change', () => { if (sel.value) hxWSet(L, 'klang', sel.value); });
  const lebt = hxEigN(L) >= 1 && on && !L.live;   // (step 4: Live – ✓ ✕ need rendered passes)
  return [
    row('Wiedergabe', chip('Abdruck', !on && !L.live, () => hxAbdruck(L), 'Wiedergabe: Abdruck – genau wie gespielt (setzt Klang, Folgen der Tonart, Eigensinn und Notenänderungen zurück)'),
      chip('Wuchs', on && !L.live, () => hxWSet(L, 'wahl', true), 'Wiedergabe: Wuchs – Myzel spielt die Noten neu' + (no ? ' (ohne Werk-Rahmen: mit echten Stimmen)' : '')),
      chip('Live', !!L.live, () => hxWSet(L, 'live', !L.live), 'Wiedergabe: Live – echte Stimmen spielen die Noten, im Takt vorausgeplant; sie kosten Stimmen und weichen deinem Spiel'),   // (step 4: SPEC §10.6)
      h('span', { class: 'hx-ms' }, (no && on ? 'ohne Werk-Rahmen: ' : '') + word + (why && on ? (word ? ' · ' : '') + why : ''))),
    row('Eigensinn', ...HX_EIG.map((e) => chip(HX_EIGW[e], (L.eigWant || L.eig || 'treu') === e, () => hxWSet(L, 'eig', e), 'Eigensinn ' + HX_EIGW[e] + { treu: ': gleiche Noten, gleicher Wurf', lebendig: ': neuer Wurf in jedem Durchgang', variieren: ': Noten auf leichten Zeiten ändern sich', wandern: ': Halbtakte tauschen, immer zurück zum Anker' }[e])), L.eigWant ? h('span', { class: 'hx-ms' }, 'nach drei Runden') : null),
    row('Stufe', ...[['gespielt', 'wie gespielt'], ['1', '1'], ['2', '2'], ['3', '3']].map(([k, t]) => chip(t, (stufe || P['hx.stufe']) === k, () => hxWSet(L, 'stufe', k === P['hx.stufe'] ? null : k), 'Klangstufe ' + t + (k === 'gespielt' ? ' (' + (L.q || '?') + ')' : ''))), h('span', { class: 'hx-ms' }, on ? 'Stufe ' + st : '')),
    row('Folgen', ...[['diatonisch', 'diatonisch'], ['transponieren', 'transp.'], ['fest', 'fest']].map(([k, t]) => chip(t, (L.ton || 'diatonisch') === k, () => hxWSet(L, 'ton', k), 'Tonart: ' + k))),
    row('Klang', chip('eigener', klang === 'eigen', () => hxWSet(L, 'klang', 'eigen'), 'Klang: der eigene'), chip('Spielfeld', klang === 'feld', () => hxWSet(L, 'klang', 'feld'), 'Klang: folgt dem Spielfeld'), sel),
    h('div', { class: 'hx-row end' }, btn('Neuer Wurf', () => hxWSet(L, 'wurf'), { aria: 'Neuer Wurf: die Noten mit neuem Zufall' }),
      lebt && !no ? btn('✓', () => hxWLob(L), { aria: 'Behalten: diese Runde gefällt dir – sie wird die neue Grundlage' }) : null, lebt && !no ? btn('✕', () => hxWNein(L), { aria: 'Ablehnen: zurück zur Runde, die du behalten hast' }) : null,
      on ? btn('⚓', () => hxWAnker(L), { aria: 'Zurück zur ursprünglichen Aufnahme' }) : null),
  ];
}
// the loop's chain: burnt in (the bake) or following the live chain – and where its Schichten are
function hxCardChain(L, sch, chip, row) {
  const ch = sch.filter((S) => S.chain);
  if (!ch.length) return row('Effektkette', h('span', { class: 'hx-ms' }, L.src ? 'in „Alles“ schon gehört' : 'nicht im Weg (direkt)'));
  const wait = !L.folgt && ch.some((S) => !S.baked), no = !hxwOk();
  return row('Effektkette', chip('eingebrannt', !L.folgt, () => hxFolgt(L, false), 'Effektkette eingebrannt: Regler und Presets ändern die Schleife nicht'), chip('folgt', !!L.folgt, () => hxFolgt(L, true), 'Folgt der Effektkette: die Schleife läuft trocken durch die Live-Kette'),
    no && !L.folgt ? h('span', { class: 'hx-ms' }, 'Einbrennen geht hier nicht – sie folgt der Kette') : wait ? h('span', { class: 'hx-ms' }, 'wird eingebrannt …') : null);
}
function hxCardOne(L, btn) {
  const chip = (t, on, fn, aria) => { const b = h('button', { type: 'button', class: 'chip', 'aria-pressed': on ? 'true' : 'false', 'aria-label': aria || null }, t); b.addEventListener('click', fn); return b; };
  if (L.bew) return hxCardBewOne(L, btn, chip);   // (step 1d: a Schleife of Bewegung)
  const k = hxCorrs(L), row = (lab, ...kids) => h('div', { class: 'hx-row' }, h('span', { class: 'lab' }, lab), h('div', { class: 'chips small' }, ...kids));
  const lvl = h('input', { type: 'range', min: 0, max: 1000, step: 1, 'aria-label': 'Pegel ' + hxName(L) });
  const toN = (g) => Math.round(clamp((gainToDb(Math.max(g, 1e-6)) + 40) / 46, 0, 1) * 1000), fromN = (v) => (v <= 0 ? 0 : dbToGain((v / 1000) * 46 - 40));
  lvl.value = toN(L.gain); lvl.style.setProperty('--p', lvl.value / 10 + '%');
  lvl.addEventListener('input', () => { hxLevel(L, fromN(+lvl.value)); lvl.style.setProperty('--p', lvl.value / 10 + '%'); });
  const sch = L.sch.map((id) => HX.sch.get(id)).filter(Boolean);
  const KIND = { ernte: 'Ernte', retro: 'Durchgang', punch: 'Überspielt', aufnahme: 'Aufnahme', sediment: 'Zusammengelegt' };
  const schRows = sch.map((S, i) => {
    const r = h('input', { type: 'range', min: 0, max: 1000, step: 1, 'aria-label': 'Pegel Schicht ' + (i + 1) });
    r.value = toN(S.gain); r.style.setProperty('--p', r.value / 10 + '%');
    r.addEventListener('input', () => { hxSchLevel(S, fromN(+r.value)); r.style.setProperty('--p', r.value / 10 + '%'); });
    const m = chip('Stumm', S.mute, () => { hxSchLevel(S, null, !S.mute); m.setAttribute('aria-pressed', String(S.mute)); }, 'Schicht ' + (i + 1) + ' stumm');
    const d = h('button', { type: 'button', class: 'chip danger', 'aria-label': 'Schicht ' + (i + 1) + ' löschen' }, '✕'); d.addEventListener('click', () => hxSchDel(S));
    return h('div', { class: 'hx-srow' }, h('span', { class: 'lab' }, (i + 1) + ' · ' + (KIND[S.kind] || S.kind) + (S.group ? ' ' + S.group : '') + (S.aud ? '' : ' …')), r, m, d);
  });
  const st = (to, t) => chip(t, L.state === to, () => {
    if (to === L.state) return;
    if (to === 'angehalten') hxState(L.id, 'angehalten');
    else if (L.state === 'angehalten') hxReenter([L]);
    else hxState(L.id, to, null, { X: 0.02 });
    hxCardDirty(); hxRailDirty();
  });
  const head = h('div', { class: 'hx-ch' }, h('b', null, hxName(L) + (hxEngName(L) ? ' · ' + hxEngName(L) : '')), h('span', { class: 'meta', id: 'hxm-' + L.slot }, hxCardMeta(L)));
  return h('div', { class: 'hx-card' + (HX.fokus === L.id ? ' fok' : ''), id: 'hxc-' + L.slot },
    head,
    row('Zustand', st('spielt', 'spielt'), st('stumm', 'stumm'), st('angehalten', 'angehalten'), chip('Fokus', HX.fokus === L.id, () => { HX.fokus = L.id; hxCardDirty(); hxRailDirty(); }, 'Als Fokus wählen (bekommt die Schichten)')),
    h('div', { class: 'hx-row' }, h('span', { class: 'lab' }, 'Pegel'), lvl),
    h('div', { class: 'hx-sch' }, h('div', { class: 'lab' }, sch.length === 1 ? 'Schicht' : sch.length + ' Schichten'), ...schRows),
    row('Phase', chip('−1 Schlag', false, () => hxNudge(L, -60 / tgBpm(hxNowT()))), chip('−5 ms', false, () => hxNudge(L, -0.005)), chip('+5 ms', false, () => hxNudge(L, 0.005)), chip('+1 Schlag', false, () => hxNudge(L, 60 / tgBpm(hxNowT()))), h('span', { class: 'hx-ms' }, L.nudge ? hxMs(L.nudge) : '')),
    row('Korrigieren', k.tempo ? chip('Tempo ½', false, () => hxKorr(L, 'h2')) : null, k.tempo ? chip('×2', false, () => hxKorr(L, 'x2'), 'Tempo verdoppeln') : null,
      k.len && k.minus ? chip('Länge −1', false, () => hxKorr(L, 'l-')) : null, k.len ? chip('Länge +1', false, () => hxKorr(L, 'l+')) : null,
      k.eins ? chip('Eins ←', false, () => hxKorr(L, 'e<')) : null, k.eins ? chip('Eins →', false, () => hxKorr(L, 'e>')) : null,
      k.drei ? chip((L.bpb || 4) === 3 ? '4er' : '3er', false, () => hxKorr(L, '3er')) : null, k.davor ? chip('Runde davor', false, () => hxKorr(L, 'davor')) : null,
      !k.tempo && !k.len && !k.eins && !k.davor ? h('span', { class: 'hx-ms' }, sch.length > 1 ? 'nur mit einer Schicht' : 'nicht mehr im Humus') : null),
    L.acc ? null : L.src === 2 ? row('Quelle', h('span', { class: 'hx-ms' }, 'Puls (seine Spuren)')) : row('Quelle', chip('Gespielt', !L.src, () => hxKorr(L, 'in0'), 'Quelle: was du gespielt hast'), chip('Alles', L.src === 1, () => hxKorr(L, 'in1'), 'Quelle: alles, was klingt (auch die Schleifen)'), HX.mic.ring ? chip('Mikro', L.src === 3, () => hxKorr(L, 'in3'), 'Quelle: das Mikrofon') : null),   // (step 2b: a Puls harvest; step 4: the Mikro)
    hxCardChain(L, sch, chip, row),
    row('Taumeln', chip('mit', hxTauOn(L), () => hxTaumelnSet(L, true), 'Taumeln: die Schleife taumelt mit dem Live-Spiel'), chip('eigene Stimmung', !hxTauOn(L), () => hxTaumelnSet(L, false), 'Taumeln aus: sie bleibt in ihrer Stimmung'), HX.tauRest && L.taumeln !== false ? h('span', { class: 'hx-ms' }, 'ruht – das Handy ist ausgelastet') : null),
    ...hxCardWuchs(L, sch, chip, row, btn),
    ...hxCardMit(L, chip, row, btn),   // (Etappe 3: role, Gärtner, Wiederkehr, Begleiten, Puls lernt)
    hxCardTools(L, sch, chip, row, btn),   // (step 2b)
    ...hxCardEco(L, sch, chip, row, btn),   // (step 4: Nähren, Schleife in Schleife, Ladung, MIDI, Gesang als Noten, the vetoes)
    L.ausl ? h('div', { class: 'hx-row end' }, L.ausl.w0 != null ? btn('Auslese aus ' + L.ausl.k + ' · ' + L.ausl.p + ' %', () => hxAusleseDo(L)) : null, L.ausl.cons ? btn('Gemeinte Fassung (Wuchs)', () => hxAusleseWuchs(L), { aria: 'Auslese aus ' + L.ausl.k + ': was alle Versuche gemeinsam haben, neu gespielt' }) : null) : null,
    L.auf ? h('div', { class: 'hx-row end' }, btn('Auftakt anfügen', () => { const ap = L.auf; L.auf = null; hxAuftakt(L, ap); })) : null,
    h('div', { class: 'hx-row end' }, sch.filter((S) => !S.mute).length > 1 ? btn('Zusammenlegen', () => hxMerge(L)) : null, btn('Löschen', () => hxDelete(L), { cls: 'ghost danger' })));
}

