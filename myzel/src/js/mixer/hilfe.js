/* =====================================================================
   "?" – what the pictures mean
   ===================================================================== */
const MX_LEGEND = [
  ['cap', 'Hut = Regler', 'Ziehe den Hut oder irgendwo am Stiel: der Pegel folgt relativ und springt nie. Halte kurz still, dann wird es fein. Doppeltippe die Zahl unter dem Stiel für 0 dB.'],
  ['stem', 'Licht im Stiel = Pegel', 'Der leuchtende Körper ist der mittlere Pegel, der weiße Faden die Spitze, die kleine Spore die gehaltene Spitze – warmweiß um 0 dB, rot darüber. Die Zahl oben ist die höchste Spitze; nach einer Übersteuerung wird sie zu einem roten CLIP, bis du sie tippst. Der rosa Balken zeigt, wie weit Pumpen oder Verdichtung absenken.'],
  ['knob', 'Lamellen-Regler', 'Die Lamellen leuchten von der Mitte (Balance) oder vom Anfang bis zum Wert. Ziehe nach oben oder unten; die Mitte und 100 % rasten ein. Doppelklick oder Entf setzt den Grundwert. Was der zweite Regler jedes Kanals steuert, wählst du oben bei „2. Regler“.'],
  ['rails', 'Schienen = Weg', '„kette“ führt durch Verzerrung (V), Ring (R), Filter (F), Phaser (P) und Schweben (S) – leuchtende Perlen sind an –, „direkt“ an ihnen vorbei in die Summe. Tippe den Knoten unter einem Kanal, um ihn umzustecken.'],
  ['spores', 'Sporen = Signal', 'Sporen fließen mit dem Signal; jeder Schlag einer Puls-Spur schickt einen Lichtpuls. Bögen unter den Schienen zeigen, wie viel der gewählte Kanal in Echo und Hall schickt.'],
  ['body', 'Fruchtkörper = Summe', 'Die Lamellen sind das Spektrum der Summe, jede in der Farbe des Kanals, der diese Frequenz füllt; was Echo und Hall beitragen – der Raum –, steht als Punkte an ihrer Spitze. Innen das Stereobild, unten die Korrelation: rechts gleichphasig, links gegenphasig.'],
  ['empty', 'Leerer Hut = Quelle aus', 'Nur der Umriss des Hutes und „aus“ im Stiel: die Klangquelle des Kanals ist ausgeschaltet (Ebene 2, eine Spur, der Bordun – beim Puls alle vier Spuren). Er bleibt einstellbar.'],
  ['dorm', 'Ruhend = still', 'Grauer Stiel, entfärbter Hut, blasser Name: der Kanal ist stumm oder schweigt wegen eines Solos. Leuchtet oben „solo“, ist irgendwo ein Solo an – tippe es, um alle aufzuheben.'],
  ['ab', 'A und B', 'Tippe A oder B, und der ganze Mix gleitet dorthin; halte eine Sekunde, bis der Ring sich schließt, um den jetzigen Mix zu speichern. Dazwischen überblendest du mit einem Zug zur Seite. Beim Überblenden zeigen a/b-Marken, wohin es geht.'],
];
// the Geflecht reads differently: its own entries, shown while it is the view
const MX_LEGEND_G = [
  ['gcol', 'Spalte = Kanal', 'Jeder Kanal hat seine feste Spalte, in der Reihenfolge des Pults – nichts kann sich überdecken. Ziehe irgendwo in der Spalte: hoch und runter für den Pegel, seitwärts für die Balance. Die ersten Millimeter entscheiden die Richtung, dann bleibt sie. Halte kurz still, dann wird es fein.'],
  ['gspore', 'Spore = Regler', 'Ihre Höhe ist der Pegel (dieselbe Skala wie die Stiele), ihr Versatz in der Spalte die Balance. Glanz und Größe atmen mit dem Pegel; darunter steigt das Licht dessen, was wirklich herauskommt. Eine hohle Spore: die Klangquelle ist aus.'],
  ['gsoil', 'Boden = aus', 'Bei −48 dB ruht die Spore auf dem Boden. Halte dort kurz, dann sinkt sie ein: der Kanal ist aus. Stumm (M) lässt sie dagegen stehen und macht sie grau.'],
  ['rails', 'Hyphen = Weg', 'Unter der Erde laufen die Kanäle durch den Knoten „kette“ – seine fünf Perlen sind Verzerrung, Ring, Filter, Phaser und Schweben – oder darunter direkt in die Wurzel der Summe.'],
  ['spores', 'Fäden = Sends', 'Gestrichelte Fäden führen zu Echo (Ringe) und Hall (Wolke), so dick wie Send mal Pegel, hell nur für den gewählten Kanal. Jeder Schlag einer Puls-Spur läuft als Lichtpuls hinab; ein rosa Balken neben dem Licht zeigt, wie weit Pumpen absenkt.'],
  ['body', 'Wurzel = Summe', 'Die Wurzel ist der Fruchtkörper der Summe: ihr Spektrum in den Farben der Kanäle, der Raum (Echo, Hall) als Punkte, innen das Stereobild. In den Ecken: Lautheit, Summe mit Verdichtung, integriert mit Spitze, Korrelation.'],
  ['gtap', 'Tippen, halten', 'Tippe eine Spalte, um den Kanal zu wählen und ein rotes Übersteuern zu löschen; zweimal tippen öffnet seinen Fruchtkörper. Lange drücken oder Rechtsklick: Stumm, Solo, 0 dB, Mitte.'],
  ['ab', 'A und B', 'Beim Überblenden zeigen a/b-Marken in jeder Spalte, wohin die Spore wandert – kräftig für den gewählten Kanal.'],
];
function mxLegendBuild() {
  const close = h('button', { type: 'button', class: 'mxl-x', 'aria-label': 'Erklärung schließen', onclick: () => mxLegend(false), html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>' });
  const list = (L) => h('ul', null, L.map(([kind, title, text]) => {
    const fig = kind === 'cap' || kind === 'empty' ? h('span', { class: 'mxl-fig cap' + (kind === 'empty' ? ' empty' : ''), style: '--c:' + (kind === 'empty' ? '#c9dc82' : '#ffb35c'), html: mxCapSvg(false) + (kind === 'empty' ? '<i>aus</i>' : '') }) : h('canvas', { class: 'mxl-fig', 'data-kind': kind, width: 120, height: 144 });
    return h('li', null, fig, h('div', null, h('b', null, title), h('p', null, text)));
  }));
  MX.legT = h('h3', { id: 'mxlTitle' }); MX.legLead = h('p', { class: 'mxl-lead' });
  MX.legP = list(MX_LEGEND); MX.legG = list(MX_LEGEND_G);
  const el = h('div', { class: 'mxl', role: 'dialog', 'aria-modal': 'false', 'aria-labelledby': 'mxlTitle', hidden: true },
    h('div', { class: 'mxl-in' }, h('div', { class: 'mxl-h' }, MX.legT, close), MX.legLead, MX.legP, MX.legG));
  return el;
}
function mxLegend(open) {
  const L = MX.leg;
  if (!L) return;
  L.hidden = !open;
  MX.legBtn.setAttribute('aria-expanded', String(!!open));
  if (open) {
    const g = MX.view === 'geflecht';
    MX.legP.hidden = g; MX.legG.hidden = !g;
    MX.legT.textContent = g ? 'so liest du das geflecht' : 'so liest du den mixer';
    MX.legLead.textContent = g ? 'Das Geflecht zeigt den Mix als Myzel: oben die Sporen, eine Spalte je Kanal, unten im Boden die Wege in die Summe. Für genaue Arbeit ist das Pult da, für alles Weitere der Fruchtkörper.'
      : 'Jeder Kanal ist ein Pilz. Tippe seinen Namen, und sein Fruchtkörper öffnet sich: Klangbild, Formen, Wege und Quelle.' + (MIDI.ports.size ? ' „MIDI“: Regler und Fader deines Keyboards oder Controllers einem Fader, Regler oder Knopf hier zuweisen.' : '');
    for (const cv of L.querySelectorAll('ul:not([hidden]) canvas[data-kind]')) mxLegendFig(cv);
    L.querySelector('.mxl-x').focus({ preventScroll: true });
  } else MX.legBtn.focus({ preventScroll: true });
}
// the little pictures, drawn once each time the legend opens
function mxLegendFig(cv) {
  const kind = cv.dataset.kind, w = 60, hh = 72, c = mxFit(cv, w, hh), cx = w / 2;
  c.clearRect(0, 0, w, hh);
  const stem = (x, y0, y1, sw) => { c.fillStyle = '#0d0a08'; c.beginPath(); c.roundRect(x - sw / 2, y0, sw, y1 - y0, sw / 2); c.fill(); c.strokeStyle = 'rgba(240,230,216,.18)'; c.lineWidth = 1; c.stroke(); };
  if (kind === 'stem') {
    stem(cx, 8, 66, 14);
    const g = c.createLinearGradient(0, 66, 0, 12); g.addColorStop(0, 'rgba(255,179,92,.15)'); g.addColorStop(0.7, 'rgba(255,179,92,.85)'); g.addColorStop(0.85, 'rgba(255,240,222,.95)'); g.addColorStop(1, 'rgba(255,91,77,1)');
    c.fillStyle = g; c.fillRect(cx - 5, 34, 4, 31); c.fillRect(cx + 1, 38, 4, 27);
    c.fillStyle = 'rgba(255,248,236,.95)'; c.fillRect(cx - 5, 26, 4, 1.3); c.fillRect(cx + 1, 29, 4, 1.3);
    c.beginPath(); c.arc(cx - 3, 19, 1.7, 0, MX_TAU); c.fill();
    c.fillStyle = 'rgba(255,91,77,.95)'; c.beginPath(); c.ellipse(cx, 6, 10, 2.4, 0, 0, MX_TAU); c.fill();
    c.fillStyle = 'rgba(255,143,158,.9)'; c.fillRect(cx + 10, 22, 2, 12);
  } else if (kind === 'knob') {
    const K = { cv: h('canvas'), size: 48, col: '#6cc9ef', id: 'xfin.pan' };
    mxKnobDraw(K, 0.72, false, 0, null);
    c.drawImage(K.cv, cx - 24, 12, 48, 48);
  } else if (kind === 'rails') {
    c.setLineDash([1.5, 4]); c.lineWidth = 1;
    c.strokeStyle = 'rgba(255,179,92,.5)'; c.beginPath(); c.moveTo(2, 40); c.lineTo(58, 40); c.stroke();
    c.strokeStyle = 'rgba(240,230,216,.4)'; c.beginPath(); c.moveTo(2, 58); c.lineTo(58, 58); c.stroke(); c.setLineDash([]);
    c.strokeStyle = 'rgba(134,240,208,.6)'; c.beginPath(); c.moveTo(20, 6); c.bezierCurveTo(18, 20, 22, 30, 20, 40); c.stroke();
    c.fillStyle = '#86f0d0'; c.beginPath(); c.arc(20, 40, 3.8, 0, MX_TAU); c.fill();
    c.strokeStyle = 'rgba(240,230,216,.3)'; c.beginPath(); c.arc(20, 58, 3.2, 0, MX_TAU); c.stroke();
    c.font = '400 8px ' + COL.fontNum; c.fillStyle = 'rgba(255,179,92,.8)'; c.fillText('kette', 28, 36); c.fillStyle = 'rgba(240,230,216,.6)'; c.fillText('direkt', 28, 54);
  } else if (kind === 'spores') {
    c.strokeStyle = 'rgba(196,168,255,.4)'; c.lineWidth = 1.1; c.beginPath(); c.moveTo(cx, 4); c.bezierCurveTo(cx - 3, 28, cx + 3, 46, cx, 68); c.stroke();
    c.globalCompositeOperation = 'lighter';
    for (const [y, s] of [[16, 5], [34, 4], [52, 6]]) { c.drawImage(mxGlow('#c4a8ff'), cx - s * 2, y - s * 2, s * 4, s * 4); c.fillStyle = '#c4a8ff'; c.fillRect(cx - 1, y - 1, 2, 2); }
    c.drawImage(mxGlow('#fff6ea'), cx - 14, 44 - 14, 28, 28);
    c.globalCompositeOperation = 'source-over';
    c.setLineDash([2, 3]); c.strokeStyle = 'rgba(108,201,239,.6)'; c.beginPath(); c.moveTo(cx, 62); c.bezierCurveTo(cx + 12, 66, cx + 20, 66, 58, 62); c.stroke(); c.setLineDash([]);
  } else if (kind === 'body') {
    const R = 26, cy = 36, cols = ['#f0e6d8', '#f0e6d8', '#ffb35c', '#ffb35c', '#86f0d0', '#c4a8ff', '#6cc9ef', '#6cc9ef', '#d6cbff', '#d6cbff', '#86f0d0', '#ff8f9e'];
    for (let i = 0; i < 36; i++) {
      const a = Math.PI / 2 + (MX_TAU - 300 * Math.PI / 180) / 2 + i / 35 * 300 * Math.PI / 180, l = 0.3 + 0.7 * Math.abs(Math.sin(i * 0.7) * Math.cos(i * 0.23));
      c.strokeStyle = cols[Math.floor(i / 3)]; c.globalAlpha = 0.85; c.lineWidth = 1.3;
      c.beginPath(); c.moveTo(cx + Math.cos(a) * R * 0.64, cy + Math.sin(a) * R * 0.64); c.lineTo(cx + Math.cos(a) * R * (0.64 + 0.34 * l), cy + Math.sin(a) * R * (0.64 + 0.34 * l)); c.stroke();
    }
    c.globalAlpha = 1;
    c.strokeStyle = 'rgba(255,236,214,.5)'; c.lineWidth = 0.8; c.beginPath();
    for (let i = 0; i < 40; i++) { const a = i * 2.4, r = 2 + (i % 7) * 1.6; i ? c.lineTo(cx + Math.sin(a) * r * 0.6, cy - Math.cos(a) * r) : c.moveTo(cx, cy); }
    c.stroke();
    c.fillStyle = '#86f0d0'; c.beginPath(); c.arc(cx + 8, cy + R * 0.9, 2.4, 0, MX_TAU); c.fill();
  } else if (kind === 'dorm') {
    stem(cx, 22, 66, 12);
    c.fillStyle = 'rgba(118,106,97,.35)'; c.fillRect(cx - 4, 44, 3, 21); c.fillRect(cx + 1, 47, 3, 18);
    c.fillStyle = '#3a312b'; c.strokeStyle = 'rgba(150,138,128,.7)';
    c.beginPath(); c.moveTo(cx - 20, 26); c.bezierCurveTo(cx - 20, 10, cx + 20, 10, cx + 20, 26); c.closePath(); c.fill(); c.stroke();
  } else if (kind === 'gcol' || kind === 'gspore') {
    // a column: its dotted thread, the light rising, the spore above with its glow
    c.setLineDash([1, 4]); c.strokeStyle = 'rgba(240,230,216,.18)'; c.beginPath(); c.moveTo(cx, 4); c.lineTo(cx, 62); c.stroke(); c.setLineDash([]);
    const g = c.createLinearGradient(0, 62, 0, 20); g.addColorStop(0, 'rgba(196,168,255,.15)'); g.addColorStop(1, 'rgba(196,168,255,.85)');
    c.fillStyle = g; c.fillRect(cx - 2.5, 34, 2, 28); c.fillRect(cx + 0.5, 38, 2, 24);
    const sx = kind === 'gspore' ? cx + 7 : cx;
    c.strokeStyle = 'rgba(196,168,255,.45)'; c.beginPath(); c.moveTo(sx, 20); c.bezierCurveTo(sx, 34, cx, 40, cx, 62); c.stroke();
    c.globalCompositeOperation = 'lighter'; c.drawImage(mxGlow('#c4a8ff'), sx - 16, 4, 32, 32); c.globalCompositeOperation = 'source-over';
    c.drawImage(mxgCore('#c4a8ff'), sx - 6.5, 13.5, 13, 13);
    if (kind === 'gcol') { c.strokeStyle = 'rgba(240,230,216,.5)'; c.beginPath(); c.moveTo(cx + 14, 10); c.lineTo(cx + 14, 30); c.moveTo(cx + 11, 13); c.lineTo(cx + 14, 10); c.lineTo(cx + 17, 13); c.moveTo(cx + 11, 27); c.lineTo(cx + 14, 30); c.lineTo(cx + 17, 27); c.stroke(); }
    else { c.strokeStyle = 'rgba(196,168,255,.6)'; c.beginPath(); c.moveTo(cx - 12, 34); c.lineTo(cx + 12, 34); c.moveTo(cx, 31.5); c.lineTo(cx, 36.5); c.stroke(); }
    c.fillStyle = 'rgba(46,32,22,.9)'; c.fillRect(0, 62, w, 10); c.strokeStyle = 'rgba(240,230,216,.25)'; c.beginPath(); c.moveTo(0, 62.5); c.lineTo(w, 62.5); c.stroke();
  } else if (kind === 'gsoil') {
    c.fillStyle = 'rgba(46,32,22,.9)'; c.fillRect(0, 50, w, 22); c.strokeStyle = 'rgba(240,230,216,.25)'; c.beginPath(); c.moveTo(0, 50.5); c.lineTo(w, 50.5); c.stroke();
    c.setLineDash([1, 3]); c.strokeStyle = 'rgba(255,143,158,.5)'; c.beginPath(); c.moveTo(0, 40.5); c.lineTo(w, 40.5); c.stroke(); c.setLineDash([]);
    c.drawImage(mxgCore('#86f0d0'), 13, 34, 13, 13);
    c.strokeStyle = 'rgba(255,143,158,.9)'; c.lineWidth = 1.6; c.beginPath(); c.arc(19.5, 40.5, 10, -Math.PI / 2, Math.PI * 0.9); c.stroke(); c.lineWidth = 1;
    c.save(); c.beginPath(); c.rect(30, 0, 30, 50); c.clip(); c.drawImage(mxgCore('#86f0d0'), 38, 44, 13, 13); c.restore();
    c.font = '400 8px ' + COL.fontNum; c.fillStyle = 'rgba(255,143,158,.8)'; c.fillText(MX_MINUS + '48', 2, 30);
  } else if (kind === 'gtap') {
    c.strokeStyle = 'rgba(240,230,216,.2)'; c.strokeRect(14.5, 6.5, 31, 58);
    c.drawImage(mxgCore('#ffb35c'), cx - 6, 20, 12, 12);
    for (const [r, a] of [[9, 0.7], [15, 0.35]]) { c.strokeStyle = 'rgba(240,230,216,' + a + ')'; c.beginPath(); c.arc(cx, 48, r, 0, MX_TAU); c.stroke(); }
    c.fillStyle = 'rgba(240,230,216,.85)'; c.beginPath(); c.arc(cx, 48, 4, 0, MX_TAU); c.fill();
  } else if (kind === 'ab') {
    stem(cx, 6, 66, 12);
    for (const [y, col, t] of [[24, '#ffb35c', 'a'], [44, '#86f0d0', 'b']]) { c.fillStyle = col; c.fillRect(cx + 8, y - 1, 7, 2); c.font = '500 8px ' + COL.fontNum; c.fillText(t, cx + 17, y + 3); }
    c.fillStyle = '#d9b07a'; c.beginPath(); c.arc(cx - 14, 34, 5, 0, MX_TAU); c.fill();
  }
}

