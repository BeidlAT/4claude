/* ---------- Ladung and Schlafen in the card ---------- */
const LAD_TXT = 'Schütteln wie ein Ei-Shaker lädt das Myzel auf: Körner dichter, Tropfen-Regen, der Puls voller und heller, das Echo leiert, das Geflecht glüht. Danach entlädt es sich über die eingestellte Zeit.';
const SLP_TXT = { kadenz: 'Display nach unten: das Echo friert ein, der Klang blendet in 3 s in den Schweif, der Puls endet am Taktende. Über ein Keyboard spielst du weiter über dem Schweif. Zurückdrehen weckt alles, wie es war – nach einem langen Schlaf (über 20 s) wacht Myzel still auf, ▶ startet den Puls.',
  stille: 'Display nach unten: sofort Stille, der Puls hält an. Zurückdrehen weckt alles, wie es war.',
  szene: 'Display nach unten: der Mixer gleitet in seine Szene B (ohne verstellt zu werden), der Puls spielt weiter. Zurückdrehen führt zurück.' };
function ladCardUI(C, it) {
  const row = (lab, el) => h('div', { class: 'gk-set' }, h('div', { class: 'lab' }, lab), el);
  const set = (k) => (v) => { gkSet(k, v); gkCardSync(); };
  const er = h('input', { type: 'range', min: 0, max: 100, step: 1, value: gkEntlX(GK.p.entl), 'aria-label': 'Entladung der Ladung' }), eo = h('span', { class: 'val' });
  const eSync = () => { eo.textContent = dec(String(GK.p.entl)) + ' s'; er.style.setProperty('--p', er.value + '%'); };
  er.addEventListener('input', () => { gkSet('entl', gkEntl(+er.value)); eSync(); gkCardSync(); });
  eSync();
  C.eTxt = h('p', { class: 'note' }); C.lTxt = h('p', { class: 'note' });
  C.ras = kcSwitch('Rassel-Schläge', GK.p.ras, set('ras'), { aria: 'Rassel-Schläge: jeder Schüttel-Höhepunkt spielt einen Schlag im Raster', key: it.key + ':ras' });
  C.tank = kcSwitch('Tank', GK.p.tank, set('tank'), { aria: 'Tank: die Ladung schaltet Puls-Spuren nacheinander dazu', key: it.key + ':tank' });
  C.sw = kcSwitch('Schwenken', GK.p.sw, set('sw'), { aria: 'Schwenken: kreisen wie ein Weinglas lässt gehaltene Töne singen', key: it.key + ':sw' });
  C.rasS = gkChips('Klang der Rassel', [['trp', 'Tropfen'], ['mem', 'Membran'], ['sch', 'Schale'], ['jrg', 'Jahresring'], ['mdr', 'Moder'], ['rhz', 'Rhizom']], () => GK.p.rasS, set('rasS'));
  C.rasQ = gkChips('Raster der Rassel', [['16', '1/16'], ['32', '1/32'], ['frei', 'frei']], () => GK.p.rasQ, set('rasQ'));
  C.rasBox = h('div', { class: 'gk-sub' }, row('Klang', C.rasS), row('Raster', C.rasQ));
  C.rTxt = h('p', { class: 'note' }); C.tTxt = h('p', { class: 'note' }); C.sTxt = h('p', { class: 'note' }); C.ladSum = h('span', { class: 'gk-sum' });
  return h('details', { class: 'kc-more gk-anl gk-lad', open: KC.open.gkl || null, ontoggle: (e) => { kcKeep('gkl', e.target.open); gkCardSync(); } }, h('summary', null, 'Ladung einstellen', C.ladSum),
    h('p', { class: 'note' }, LAD_TXT), C.lTxt, h('div', { class: 'kc-rng gk-entl' }, h('span', null, 'Entladung'), er, eo), C.eTxt,
    h('div', { class: 'kc-opts' }, C.ras), C.rasBox, C.rTxt, h('div', { class: 'kc-opts' }, C.sw), C.sTxt, h('div', { class: 'kc-opts' }, C.tank), C.tTxt);
}
function slpCardUI(C) {
  C.slArt = gkChips('Schlafen bedeutet', [['kadenz', 'Freeze-Kadenz'], ['stille', 'Stille'], ['szene', 'Szene B']], () => GK.p.slArt, (v) => { gkSet('slArt', v); gkCardSync(); });
  C.slTail = gkChips('Schweif', [['aus', 'klingt aus (30 s)'], ['halt', 'hält']], () => GK.p.slTail, (v) => { gkSet('slTail', v); gkCardSync(); });
  C.slTailRow = h('div', { class: 'gk-set' }, h('div', { class: 'lab' }, 'Schweif'), C.slTail);
  C.slTxt = h('p', { class: 'note' }); C.slWarn = h('p', { class: 'note warn' }); C.slSum = h('span', { class: 'gk-sum' });
  return h('details', { class: 'kc-more gk-anl gk-slp', open: KC.open.gks || null, ontoggle: (e) => { kcKeep('gks', e.target.open); gkCardSync(); } }, h('summary', null, 'Schlafen einstellen', C.slSum),
    h('div', { class: 'gk-set' }, h('div', { class: 'lab' }, 'Umdrehen bedeutet'), C.slArt), C.slTailRow, C.slTxt, C.slWarn,
    h('p', { class: 'note' }, 'Liegt das Gerät mit dem Display nach oben still, ruht die Gestik nur – das Symbol oben schläft. Über den Lautsprecher des Handys dämpft das Umdrehen den Klang; mit Kopfhörer oder Kabel ist das egal, sonst passt Szene B besser.'));
}
function ladCardSync(C, noGyro) {
  const p = GK.p, tx = (el, t) => { if (el.textContent !== t) el.textContent = t; }, sw = (el, v) => { if (el.getAttribute('aria-checked') !== String(v)) el.setAttribute('aria-checked', String(v)); };
  sw(C.ladSw, p.lad); sw(C.slpSw, p.schlaf); sw(C.ras, p.ras); sw(C.tank, p.tank); sw(C.sw, p.sw);
  C.rasS.sync(); C.rasQ.sync(); C.slArt.sync(); C.slTail.sync();
  C.slTailRow.hidden = p.slArt !== 'kadenz';
  C.lad.classList.toggle('off', !p.lad); C.slp.classList.toggle('off', !p.schlaf);
  C.rasBox.hidden = !p.ras;
  tx(C.eTxt, GK.live && !GK.dmSeen ? 'Dieses Gerät meldet nur seine Lage, keine Beschleunigung – Schütteln lädt hier nichts auf (Neigen, Wenden und Ruhe gehen).'
    : p.entl < 1 ? 'Kurz: eine echte Rassel – sie klingt nur, solange du schüttelst.' : p.entl >= 15 ? 'Lang: ein Aufbau über viele Takte, während deine Hände längst wieder spielen.' : 'Nach dem Schütteln entlädt es sich über ' + dec(String(p.entl)) + ' s.');
  // what the charge does in the sound that plays now
  const has = [SEQ.on && 'der Puls voller und heller', (P['v.eng'] === 'kor' || P['v.layer'] === 'kor') && 'Körner dichter', (P['v.eng'] === 'trp' || P['v.layer'] === 'trp') && 'Tropfen-Regen', gspInUse() && 'Gespinst koppelt stärker', rhzInUse() && 'das Rhizom reizbarer'].filter(Boolean);
  tx(C.lTxt, has.length ? 'In diesem Klang: ' + has.join(', ') + ', das Echo leiert.' : 'In diesem Klang: gehaltene Töne heller, mehr Echo und Schweben – mit Puls, Körnern oder Tropfen wirkt mehr.');
  tx(C.rTxt, p.ras ? 'Jeder Schüttel-Höhepunkt spielt einen Schlag, ' + (p.rasQ === 'frei' ? 'ohne Raster (für langsame Tempi).' : 'auf die nächste ' + (p.rasQ === '32' ? '1/32' : '1/16') + ' des Pulses gelegt.') + ' Er läuft über den Kanal „Klang“.' : 'Rassel-Schläge: jeder Schüttel-Höhepunkt spielt zusätzlich einen Tropfen, eine Membran, eine Schale, den Holzstab (Jahresring) oder eine Kompostglocke (Moder) im Raster.');
  const st = GK.R && GK.R.st;
  C.sw.disabled = !!noGyro;
  tx(C.sTxt, noGyro ? 'Schwenken braucht ein Gyroskop – dieses Gerät hat keins.' : 'Schwenken: lass das Gerät kreisen wie ein Weinglas – gehaltene Töne schwellen an und ihre Obertöne steigen. Schnellere Kreise schweben mehr, die Richtung verstimmt leicht nach oben oder unten.' + (LAD.glas > 0.02 ? ' Jetzt: ' + Math.round(LAD.glas * 100) + ' %.' : ''));
  tx(C.tTxt, 'Tank: die Ladung schaltet Puls-Spuren nacheinander dazu – nur auf deinem Arrangement; entladen ist es wieder genau wie vorher.' + (LAD.tk ? ' Jetzt +' + LAD.tk + (LAD.tk === 1 ? ' Spur' : ' Spuren') + (LAD.tStart ? ', der Puls läuft dafür.' : '.') : ''));
  tx(C.ladSum, !p.lad ? ' · aus' : ' · ' + dec(String(p.entl)) + ' s' + (p.ras ? ' · Rassel' : '') + (p.tank ? ' · Tank' : '') + (p.sw && !noGyro ? ' · Schwenken an' : ''));   // (how full it is shows the Wasserwaage's ring)
  tx(C.slTxt, SLP_TXT[p.slArt]);
  const same = p.slArt === 'szene' && MX.snap.a && !mxSnapDiff();
  C.slWarn.hidden = !same;
  tx(C.slWarn, same ? 'Szene A und B sind im Mixer noch gleich – bis du eine Szene B speicherst, friert Umdrehen ein (Freeze-Kadenz).' : '');
  tx(C.slSum, !p.schlaf ? ' · aus' : ' · ' + { kadenz: 'Freeze-Kadenz', stille: 'Stille', szene: 'Szene B' }[p.slArt] + (SLP.on ? ' · schläft' : ''));
}

