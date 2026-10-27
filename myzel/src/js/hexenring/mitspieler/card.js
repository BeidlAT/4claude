// ---- the card: the Gärtner (its step and what it sees), each loop's role, its freedom, Wiederkehr, Begleiten, Puls lernt;
// the Handschrift in the settings ----
function hxCardGd(btn) {
  const box = HXK.gd; if (!box) return;
  const chip = (t, on, fn, aria) => { const b = h('button', { type: 'button', class: 'chip', 'aria-pressed': on ? 'true' : 'false', 'aria-label': aria || null }, t); b.addEventListener('click', fn); return b; };
  if (!hxLoopsLive().length && hxGdStep() === 0) { box.replaceChildren(); return; }
  const st = P['hx.gaertner'], E = Math.round(HXG.Es * 100), lr = HXG.want && HXG.want !== 'still' ? HX_ROLEW[HXG.want] : 'still';
  const plan = HXG.plan ? HXG.plan.items.map((x) => { const L = hxByKey(x.key); return L ? hxName(L) + ' ' + (x.gt === 0 ? 'pausiert' : x.word || 'wie gespielt') : ''; }).filter(Boolean).join(', ') : '';
  box.replaceChildren(...[h('div', { class: 'hx-gh' }, h('b', null, 'Gärtner'), h('span', null, ' – wie sehr die Schleifen auf dich hören')),
    h('div', { class: 'hx-row', 'data-ww': 'hx.gaertner' }, h('span', { class: 'lab' }, 'Stufe'), h('div', { class: 'chips small' }, ...HX_GST.map((k) => chip(HX_GSTW[k], st === k, () => setParam('hx.gaertner', k), 'Gärtner ' + HX_GSTW[k])))),
    st !== 'schaut' ? h('p', { class: 'note' }, 'Du spielst: ' + lr + ' · Energie ' + E + ' %' + (plan ? ' · geplant: ' + plan : '') + (HXA.n + HXA.hsN < 40 && st === 'antwortet' ? ' · zum Antworten noch ' + (40 - HXA.n - HXA.hsN) + ' Töne' : '')) : null,
    HXG.plan || HXW_K.wk || hxAntOn() ? h('div', { class: 'hx-row end' }, btn('✕ ablehnen', () => { hxMachNein(); hxCardDirty(); }, { aria: 'Was der Gärtner plant, ablehnen' }), btn('✓ behalten', () => { hxMachLob(); hxCardDirty(); })) : null].filter(Boolean));
  wwMarkIn(box);
}
function hxCardMit(L, chip, row, btn) {
  if (L.bew) return [];
  const mi = hxMi(L), r = hxRoleOf(L), sch = L.sch.map((id) => HX.sch.get(id)).filter(Boolean), notes = sch.some(hxWCan);
  const out = [];
  if (mi.sugg) out.push(h('div', { class: 'hx-row' }, h('span', { class: 'lab' }, 'Vorschlag'), h('div', { class: 'chips small' }, h('span', { class: 'hx-ms' }, 'Begleitung (' + (HX_ROLEW[mi.sugg] || mi.sugg) + '), stumm'),
    chip('Einschalten', false, () => { if (L.state === 'angehalten') hxReenter([L]); else hxState(L.id, 'spielt', null, { X: 0.02 }); hxSuggTake(L); }, 'Vorschlag einschalten'), chip('Verwerfen', false, () => hxDrop(L), 'Vorschlag verwerfen'))));
  out.push(row('Rolle', chip('auto' + (r && !mi.rolle ? ': ' + HX_ROLEW[r.role] + (r.conf < 0.25 ? '?' : '') : ''), !mi.rolle, () => { mi.rolle = null; mi.rc = null; hxSaveMeta(L.id); hxCardDirty(); }, 'Rolle automatisch'),
    ...HX_ROLES.map((k) => chip(HX_ROLEW[k], mi.rolle === k, () => { mi.rolle = k; hxSaveMeta(L.id); hxCardDirty(); hxSay(hxName(L) + ': Rolle ' + HX_ROLEW[k]); }, 'Rolle ' + HX_ROLEW[k]))));
  const sw = hxStance(L);
  out.push(row('Gärtner', chip('darf', !mi.gOff, () => { mi.gOff = false; hxSaveMeta(L.id); hxCardDirty(); }, 'Der Gärtner darf diese Schleife leiser, lauter, stumm machen' + (hxEigN(L) >= 2 ? ' und ausdünnen' : '')), chip('nicht', !!mi.gOff, () => { mi.gOff = true; if ((L.gg != null && L.gg !== 1) || L.gdv) hxGdNein(L, true); hxSaveMeta(L.id); hxCardDirty(); }, 'Der Gärtner lässt diese Schleife in Ruhe'),
    chip('darf wiederkehren', !!mi.wk, () => { mi.wk = !mi.wk; hxSaveMeta(L.id); hxCardDirty(); }, 'Wiederkehr: kommt zurück, wenn du ihr Motiv spielst'), sw ? h('span', { class: 'hx-ms' }, sw) : null,
    L.gg != null && L.gg !== 1 || L.gdv ? chip('✕', false, () => hxGdNein(L), 'Gärtner zurücknehmen') : null));
  if (notes && hxTakt(L)) out.push(h('div', { class: 'hx-row end' },
    !mi.sugg && (r && r.role === 'melodie') ? btn('Begleiten', () => hxBegleiten(L), { aria: 'Bass und Akkorde zu dieser Melodie vorschlagen (stumm)' }) : null,
    r && ['bass', 'schlag'].includes(r.role) ? h('span', { class: 'chips small' }, h('span', { class: 'hx-ms' }, 'Puls lernt:'), ...[0, 1, 2, 3].map((i) => chip('Spur ' + (i + 1), false, () => hxPulsLernt(L, i), 'Spur ' + (i + 1) + ' des Puls lernt den Rhythmus dieser Schleife'))) : null));
  return out;
}
function hxCardHand(btn) {
  const box = HXK.hand; if (!box) return;
  const on = P['hx.hand'] === 'an', hs = HX.hs;
  const imp = h('input', { type: 'file', accept: 'application/json,.json', hidden: '' }); imp.addEventListener('change', () => { if (imp.files[0]) hxHandImport(imp.files[0]); imp.value = ''; });
  box.replaceChildren(h('div', { class: 'hx-row' }, h('span', { class: 'lab' }, 'Handschrift'), h('div', { class: 'hx-kb' }, h('span', { class: 'hx-ms' }, on ? (hs ? Math.round((hs.bytes || 0) / 1024) + ' kB · ' + (hs.n || 0) + (hs.n === 1 ? ' Sitzung' : ' Sitzungen') : 'noch leer') : 'aus'),
    on ? btn('Sitzung übernehmen', () => hxHandTake(null)) : null, on ? btn('Vergessen', () => toast('Die Handschrift vergessen?', 8000, { label: 'Vergessen', fn: hxHandForget }), { cls: 'ghost danger' }) : null,
    on ? btn('Export', hxHandExport) : null, btn('Import', () => imp.click()), imp)),
    h('p', { class: 'note' }, 'Die Handschrift merkt sich dich, nur auf diesem Gerät: deine Tempi, Grooves, Tonleitern, Klänge, Wendungen und was du behalten oder abgelehnt hast. Dann kennt die Takt-Erkennung dein Tempo, und der Gärtner antwortet ab der ersten Minute. Am Ende einer Sitzung fragt Myzel, ob sie übernommen wird.'));
}
// the rail's chips while the machine plans: what, and ✕ per loop · ✓
function hxChipsMach(chip, box) {
  const C = HX.chips;
  if (C.kind === 'gd' && HXG.plan) {
    const G = HXG.plan;
    box.append(h('span', { class: 'hx-cw' }, 'Gärtner' + (G.b != null ? ' ab Takt ' + hxBarNo(G.b) : '')));
    for (const x of G.items) { const L = hxByKey(x.key); if (L) chip('✕ ' + (L.slot + 1), () => { hxGdNein(L); HXU.sig = ''; hxRailDirty(); }, { aria: 'Ablehnen: ' + hxName(L) + ' ' + (x.gt === 0 ? 'pausiert' : x.word || 'wie gespielt') }); }
    chip('✓', () => { hxGdLob(); HXU.sig = ''; hxRailDirty(); }, { cls: 'pri', aria: 'Behalten' });
    return true;
  }
  if (C.kind === 'wk' && HXW_K.wk) { const L = hxByKey(HXW_K.wk.key); box.append(h('span', { class: 'hx-cw' }, (L ? hxName(L) : 'Schleife') + ' kehrt wieder' + (HXW_K.wk.b != null ? ' ab Takt ' + hxBarNo(HXW_K.wk.b) : ''))); chip('✕', () => { hxWkNein(); HXU.sig = ''; hxRailDirty(); }, { cls: 'pri', aria: 'Wiederkehr ablehnen' }); chip('✓', () => { hxMachLob(); HXU.sig = ''; }, { aria: 'Wiederkehr behalten' }); return true; }
  if (C.kind === 'ant' && hxAntOn()) { box.append(h('span', { class: 'hx-cw' }, 'Antwort · ' + HXA.cur.n + ' Töne')); chip('✕', () => { hxAntStop('abgelehnt'); HXU.sig = ''; hxRailDirty(); }, { cls: 'pri', aria: 'Antwort abbrechen' }); return true; }
  return false;
}

