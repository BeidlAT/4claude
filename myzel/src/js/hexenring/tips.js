// ---- (25.10.2026, owner) the looper explains itself: every control of the Ringleiste and of the card shows in simple
// words what it is for when the mouse rests on it (the title attribute). A control's tip comes from HX_TIP by its row
// and its text ('Row|Text'), by its section's heading ('Section|Text'), by its text alone, else from its aria-label (most
// chips carry an explaining one) – and the row's own tip ('@Row') stands on the row's label and is the last resort. The
// settings of the looper get theirs by parameter (HX_TIP_P). hxTips(root) after every render; the rail sets its own. ----
const HX_TIP = {
  'Alle aufklappen': 'Öffnet die Karten aller Schleifen – alle Einstellungen auf einen Blick.', 'Alle zuklappen': 'Klappt die Karten aller Schleifen zu – nur ihre Kopfzeilen bleiben.',   // (28.10.2026)
  // the rows of a loop's card
  '@Zustand': 'Ob die Schleife gerade klingt: spielt, stumm (läuft lautlos im Takt weiter) oder angehalten (steht still).',
  '@Pegel': 'Wie laut die ganze Schleife ist.',
  '@Schichten': 'Jede Aufnahme, die auf dieser Schleife liegt. Jede einzeln leiser, stumm oder löschen.',
  '@Phase': 'Die Schleife zeitlich verschieben, wenn sie nicht genau im Takt sitzt: um einen Schlag oder fein um 5 Millisekunden.',
  '@Korrigieren': 'Hat Myzel Tempo, Länge oder die Eins falsch erkannt, korrigierst du es hier.',
  '@Quelle': 'Woraus die Schleife aufgenommen ist: nur dein Spiel, alles was klang (auch andere Schleifen) oder das Mikrofon.',
  '@Effektkette': 'Ob Filter, Echo, Hall und Co. fest in der Schleife stecken oder ob die Schleife deinen Reglern folgt.',
  '@Taumeln': 'Ob die Schleife in der Tonhöhe mitschwebt, wenn dein Live-Spiel leicht schwankt – dann passen beide zusammen.',
  '@Wiedergabe': 'Wie die Schleife klingt: genau die Aufnahme, von Myzel aus den Noten neu gespielt, oder live mit echten Stimmen.',
  '@Wuchs': 'Neu spielen kann Myzel nur Schleifen, deren Noten es kennt – also was du mit Myzels Klängen gespielt hast.',
  '@Eigensinn': 'Wie sehr sich die Schleife von selbst verändert: gleich, ein wenig atmend, umspielend oder wandernd.',
  '@Stufe': 'In welcher Klangqualität Myzel die Schleife neu spielt (1 einfach bis 3 voll).',
  'Gärtner|@Stufe': 'Wie sehr die Schleifen auf dich hören: nur zuschauen, Platz machen oder dir antworten.',
  '@Folgen': 'Was die Schleife tut, wenn du die Tonart wechselst: mitgehen, als Ganzes verschieben oder bleiben.',
  '@Klang': 'Mit welcher Klangquelle Myzel die Noten spielt.',
  '@Rolle': 'Was die Schleife im Stück ist – Bass, Akkorde, Melodie, Fläche oder Schlag. Der Gärtner richtet sich danach.',
  '@Gärtner': 'Ob der Gärtner diese Schleife beim Spielen verändern darf, und ob sie von selbst wiederkommen darf.',
  '@Vorschlag': 'Eine Begleitung, die der Gärtner vorschlägt – noch stumm.',
  '@Nähren': 'Die Schleife spielt in andere Teile von Myzel hinein, die dann mit ihr mitklingen.',
  '@Netz': 'Ob die Schleife ein eigenes Rhizom-Netz anstößt oder dasselbe wie dein Spiel.',
  '@Sammeln': 'Eine neue Schleife, die diese hier in jedem Durchgang aufnimmt und langsam verwehen lässt.',
  '@Sammelt': 'Diese Schleife nimmt eine andere in jedem Durchgang auf. Wie viel bleibt, stellst du hier ein.',
  '@Ladung': 'Ob Schütteln (Gestik) diese Schleife brodeln lässt. Wirkt nur mit Gestik.',
  '@MIDI': 'Die Noten der Schleife an angeschlossene MIDI-Geräte schicken, während sie spielt.',
  '@Band': 'Die Schleife wie ein Tonband: langsamer und tiefer, schneller und höher, rückwärts oder auslaufen lassen.',
  '@Trimmen': 'Nur einen Teil der Schleife spielen – die Hälfte oder ein Viertel, verschiebbar.',
  '@Auslassen': 'Lässt zufällig einige Anschläge weg.',
  '@Würfeln': 'Vertauscht zufällig die Plätze einiger Anschläge.',
  '@Verblassen': 'Jede Schicht wird mit jedem Durchgang ein wenig leiser – die neueste bleibt vorn.',
  '@Abrieb': 'Die Schleife nutzt sich ab wie ein altes Tonband, immer an denselben Stellen.',
  '@Einwurzeln': 'Die Schleife klingt in jedem Durchgang durch ein auf die Tonleiter gestimmtes Saitennetz und wächst so in die Tonart hinein.',
  '@Moder': 'Die hohen Töne zerfallen nach und nach zu Knistern, die Tiefe wird warm.',
  '@Tempowechsel': 'Was eine Aufnahme ohne Noten tut, wenn sich das Tempo ändert: an ihren Schlägen neu ins Tempo gesetzt oder frei weiterlaufend.',
  '@Noten': 'Die Noten der Schleife umformen: höher oder tiefer in der Tonart, dünner, dichter, rückwärts, gespiegelt.',
  '@Groove': 'Das Timing straffer oder lockerer machen – nach deinem eigenen Gefühl.',
  '@Spielverzögerung': 'Wie spät dein Spiel nach dem gehörten Schlag ankommt. Einmal messen, dann sitzen Schleifen genau auf dem Schlag.',
  '@Mikrofon': 'Das Mikrofon für Schleifen aus Gesang oder Instrument. Es ist nur zum Aufnehmen da, du hörst es nicht.',
  '@Korb nimmt': 'Was der Korb übernimmt, solange das Mikrofon an ist: das Mikrofon oder dein Spiel.',
  '@Pedale': 'Welche Fußschalter du hast – Myzel legt die Aufnahme-Funktionen darauf.',
  '@Handschrift': 'Myzel merkt sich deine Spielweise – Tempi, Grooves, Tonleitern – nur auf diesem Gerät.',
  '@Lichtung': 'Eine gemerkte Lichtung: welche Schleifen in diesem Teil deines Stücks klingen.',
  '@Gesetzt': 'Das gesetzte Treffen: wann sich alle freien Schleifen wieder gemeinsam treffen.',
  '@Setzen in': 'In wie vielen Minuten sich die Schleifen genau einmal treffen sollen.',
  '@Fruchten': 'Was beim Treffen geschieht.',
  // a loop's card: the chips and buttons
  'Zustand|spielt': 'Die Schleife klingt.',
  'Zustand|stumm': 'Lautlos – sie läuft im Takt weiter und ist sofort wieder da.',
  'Zustand|angehalten': 'Steht still. Mit „spielt“ beginnt sie wieder auf der nächsten Eins.',
  'Fokus': 'Diese Schleife bekommt die nächsten Schichten, wenn du überspielst.',
  'Schichten|Stumm': 'Diese Schicht stumm schalten.',
  'Schichten|✕': 'Diese Schicht löschen. Mit „Zurück“ holst du sie wieder.',
  'Knospen|✕': 'Diese geplante Änderung der Noten ablehnen.',
  'Phase|−1 Schlag': 'Einen Schlag früher.',
  'Phase|+1 Schlag': 'Einen Schlag später.',
  'Phase|−5 ms': 'Ein klein wenig früher.',
  'Phase|+5 ms': 'Ein klein wenig später.',
  'Tempo ½': 'Das Tempo war doppelt so schnell erkannt: halbieren.',
  'Korrigieren|×2': 'Das Tempo war halb so schnell erkannt: verdoppeln.',
  'Länge −1': 'Die Schleife einen Takt kürzer.',
  'Länge +1': 'Die Schleife einen Takt länger.',
  'Eins ←': 'Die Eins einen Schlag früher setzen.',
  'Eins →': 'Die Eins einen Schlag später setzen.',
  '3er': 'Als Dreiertakt nehmen (wie ein Walzer).',
  '4er': 'Als Vierertakt nehmen.',
  'Runde davor': 'Statt der letzten Wiederholung die davor nehmen.',
  'Quelle|Gespielt': 'Nur was du gespielt hast.',
  'Quelle|Alles': 'Alles, was klang – auch andere Schleifen, Echo und Hall.',
  'Quelle|Mikro': 'Das Mikrofon.',
  'eingebrannt': 'Die Effekte stecken fest in der Schleife – Regler und Presets ändern sie nicht mehr.',
  'folgt': 'Die Schleife läuft ohne Effekte durch die Effektkette und folgt deinen Reglern.',
  'Taumeln|mit': 'Schwebt in der Tonhöhe mit deinem Live-Spiel mit.',
  'eigene Stimmung': 'Bleibt genau in der Stimmung der Aufnahme.',
  'Abdruck': 'Genau so, wie du gespielt hast.',
  'Wiedergabe|Wuchs': 'Myzel spielt die Noten neu – so folgen sie Tonart, Tempo und Klang.',
  'Wiedergabe|Live': 'Echte Stimmen spielen die Noten, wie beim Live-Spiel.',
  'Treu': 'Jede Runde genau gleich.',
  'Lebendig': 'Gleiche Noten, jede Runde ein wenig anders gespielt – wie ein Mensch.',
  'Variieren': 'Einzelne Noten auf leichten Zählzeiten ändern sich, die Eins bleibt.',
  'Wandern': 'Ganze Halbtakte tauschen ihren Platz, die Schleife kommt immer wieder zurück.',
  'Stufe|wie gespielt': 'In der Qualität, in der sie aufgenommen wurde.',
  'diatonisch': 'Geht in der neuen Tonleiter mit.',
  'transp.': 'Wird als Ganzes in die neue Tonart verschoben.',
  'fest': 'Bleibt in ihrer Tonart.',
  'eigener': 'Mit dem Klang, mit dem du sie aufgenommen hast.',
  'Klang|Spielfeld': 'Mit dem Klang, der gerade auf dem Spielfeld eingestellt ist.',
  'Klang|SELECT': 'Eine andere Klangquelle für diese Schleife wählen.',
  'Neuer Wurf': 'Die Noten mit neuem Zufall neu spielen lassen.',
  '▶ Weiter': 'Angehaltene Schleifen spielen auf der nächsten Eins weiter.',
  '↶ Zurück': 'Den letzten Schritt zurücknehmen.',
  '↷ Wiederholen': 'Den zurückgenommenen Schritt wiederherstellen.',
  'Alle leeren': 'Alle Schleifen löschen. Mit „Zurück“ holst du sie wieder.',
  'Zusammenlegen': 'Alle Schichten zu einer zusammenfügen – klingt gleich und braucht weniger Rechenzeit.',
  'Löschen': 'Diese Schleife löschen. Unter „Gelöscht“ und mit „Zurück“ holst du sie wieder.',
  'Auslese aus': 'Aus deinen Wiederholungen die eine, die am besten zu allen passt.',
  'Gemeinte Fassung (Wuchs)': 'Was alle deine Versuche gemeinsam haben – von Myzel sauber neu gespielt.',
  'Gemeint': 'Was alle deine Versuche gemeinsam haben – von Myzel sauber neu gespielt.',
  'Auftakt anfügen': 'Die Töne kurz vor der Eins mit in die Schleife nehmen.',
  'Erstarren': 'Die Runde, die gerade klingt, wird zur festen Aufnahme.',
  'Klang aufs Feld': 'Das Spielfeld spielt ab jetzt mit dem Klang dieser Schleife.',
  'Als Aufnahme': 'Die Schleife als Audiodatei speichern (WAV).',
  'MIDI': 'Die Noten der Schleife als MIDI-Datei speichern.',
  'Pegel|RANGE': 'Wie laut die ganze Schleife ist.',
  'Schichten|RANGE': 'Wie laut diese Schicht ist.',
  'Tempo behalten': 'Das Tempo dieser Schleife für den Takt behalten, auch wenn du sie zurücknimmst.',
  'schaut zu': 'Der Gärtner hört nur zu und verändert nichts.',
  'pflegt': 'Der Gärtner macht Platz, wenn du spielst: Schleifen werden leiser oder pausieren.',
  'antwortet': 'Wie „pflegt“ – und hörst du auf zu spielen, antwortet er aus deinem Material.',
  'rückwärts': 'Spielt rückwärts, ab der nächsten Naht.',
  'Stopp': 'Das Band läuft aus wie bei einem Tonbandgerät und hält an.',
  'Verdoppeln': 'Die Schleife doppelt so lang machen – sie wiederholt sich.',
  'Würfeln|neu': 'Neu würfeln.',
  'Auffrischen': 'Wieder wie neu.',
  'Schnitt': 'Für Rhythmisches: an den Schlägen neu ins Tempo gesetzt, die Tonhöhe bleibt.',
  'Tempowechsel|frei': 'Für Flächen: läuft in ihrer eigenen Länge weiter.',
  'Noten|wie gespielt': 'Die Noten wieder so, wie du sie gespielt hast.',
  'straffen': 'Das Timing straffer, nach deinem eigenen Groove.',
  'lockern': 'Das Timing lockerer.',
  'Puls übernimmt': 'Der Puls swingt dann so wie diese Schleife.',
  'Rolle|auto': 'Myzel erkennt die Rolle selbst.',
  'Rolle|Bass': 'Diese Schleife ist der Bass.',
  'Rolle|Akkorde': 'Diese Schleife spielt die Akkorde.',
  'Rolle|Melodie': 'Diese Schleife ist die Melodie.',
  'Rolle|Fläche': 'Diese Schleife ist eine Klangfläche im Hintergrund.',
  'Rolle|Schlag': 'Diese Schleife ist der Rhythmus.',
  'Stufe|1': 'Einfacher Klang – braucht am wenigsten Rechenzeit.',
  'Stufe|2': 'Mittlerer Klang.',
  'Stufe|3': 'Voller Klang – der reichste, braucht am meisten Rechenzeit.',
  'Gärtner|darf': 'Der Gärtner darf diese Schleife leiser machen oder pausieren, wenn du spielst.',
  'Gärtner|nicht': 'Der Gärtner lässt diese Schleife in Ruhe.',
  'darf wiederkehren': 'Die Schleife kommt von selbst zurück, wenn du ihr Motiv spielst.',
  'Gärtner|✕': 'Was der Gärtner an dieser Schleife geändert hat, zurücknehmen.',
  'Spur': 'Diese Puls-Spur lernt den Rhythmus der Schleife.',
  'Begleiten': 'Myzel schlägt Bass und Akkorde zu dieser Melodie vor – erst stumm, ein Tipp schaltet sie ein.',
  'Einschalten': 'Den Vorschlag als Schleife spielen lassen.',
  'Verwerfen': 'Den Vorschlag wegwerfen.',
  'Schleife …': 'Eine neue Schleife, die diese hier in jedem Durchgang aufnimmt.',
  'Gesang als Noten': 'Aus deinem Gesang werden Noten – dann spielt Myzel sie mit seinen Klängen.',
  'Verwandeln': 'Die Schleife umformen – wie ein Tonband, als Ausschnitt, alternd, in ihren Noten. Das Original bleibt immer erhalten.',
  'Einstellungen': 'Einstellungen, die für alle Schleifen gelten.',
  // the form, the Folge, Treffen, the Setliste, the graveyard
  'Merken': 'Merkt sich, welche Schleifen jetzt klingen – als Lichtung, einen Teil deines Stücks.',
  'Form|Kern': 'Nur die Kern-Schleifen spielen lassen, ab der nächsten Eins.',
  'Zurück vom Kern': 'Wieder alle Schleifen wie vorher, ab der nächsten Eins.',
  'Form|Lücke': 'Der letzte Schlag vor der Eins setzt aus – wie ein Atemholen.',
  'Takt-Lücke': 'Der letzte Takt vor der Eins setzt aus.',
  'Schluss': 'Das Stück beenden – so, wie unter Einstellungen gewählt.',
  'Schluss abbrechen': 'Den Schluss abbrechen, alles spielt weiter.',
  'Lichtung|Hin': 'Zu dieser Lichtung wechseln.',
  'Lichtung|Takt': 'Wechselt am nächsten Takt.',
  'Lichtung|Schleifenende': 'Wechselt, wenn die längste Schleife zu Ende ist.',
  'Lichtung|Kern': 'Diese Lichtung als Kern markieren – „Kern“ springt dann zu ihr.',
  'Lichtung|Überschreiben': 'Mit dem, was jetzt klingt, neu merken.',
  'Lichtung|✕': 'Diese Lichtung löschen.',
  '↺ im Kreis': 'Die Folge immer wieder von vorn spielen.',
  'Folge starten': 'Spielt die Lichtungen nacheinander ab, jede so viele Durchgänge wie eingestellt.',
  'Folge anhalten': 'Die Folge anhalten.',
  'Treffen setzen': 'Die freien Schleifen bekommen Längen, mit denen sie sich genau einmal wieder gemeinsam treffen.',
  'Laden': 'Dieses Lied laden: Preset, Tempo und seine Schleifen.',
  'Dieses Lied hinzufügen': 'Das jetzige Lied – Preset, Tempo, Lichtungen – in die Setliste aufnehmen.',
  'Nächstes Lied': 'Zum nächsten Lied. Die Schleifen dieses Lieds werden beiseitegelegt und kommen zurück, wenn es wieder dran ist.',
  'Zurückholen': 'Diese gelöschte Schleife zurückholen.',
  'Endgültig entfernen': 'Die gelöschten Schleifen endgültig entfernen.',
  // the Gärtner, the Handschrift, Klopf mit, the microphone
  '✕ ablehnen': 'Was der Gärtner vorhat, ablehnen.',
  '✓ behalten': 'Was der Gärtner gemacht hat, behalten.',
  'Sitzung übernehmen': 'Was du heute gespielt hast, in deine Handschrift übernehmen.',
  'Vergessen': 'Die Handschrift löschen.',
  'Handschrift|Export': 'Die Handschrift als Datei sichern.',
  'Handschrift|Import': 'Eine Handschrift aus einer Datei laden.',
  'Klopf mit': 'Misst, wie spät dein Spiel ankommt: acht Mal im Takt eines Klicks tippen.',
  'Auf 0': 'Die gemessene Verzögerung vergessen.',
  'Tipp mit dem Klick': 'Hier zu jedem Klick tippen.',
  'Korb nimmt|Mikro': 'Der Korb übernimmt das Mikrofon.',
  'Korb nimmt|Gespielt': 'Der Korb übernimmt dein Spiel.',
};
// the settings of the looper, by parameter
const HX_TIP_P = {
  'hx.modus': 'Was der runde Knopf tut: jedes Mal eine neue Schleife aufnehmen oder über die Fokus-Schleife spielen.',
  'hx.start': 'Wann eine Aufnahme beginnt: auf der nächsten Eins, mit deinem ersten Ton oder sofort.',
  'hx.raster': 'Worauf eine Aufnahme beginnt und endet: Frei – du bestimmst es selbst; Takt, ½ Takt oder ¼ – genau auf diesem Raster, auch die erste Schleife (ohne Takt zählt Myzel einen Takt im Puls-Tempo ein).',
  'hx.ein': 'Ob vor der Aufnahme eingezählt wird – sichtbar, mit Vibration oder hörbar.',
  'hx.klick': 'Ein hörbarer Klick zum Mitspielen: nur beim Einzählen oder durchgehend.',
  'hx.laenge': 'Wie lang neue Schleifen werden: automatisch erkannt, so lang wie Schleife 1 oder fest.',
  'hx.festT': 'Die feste Länge neuer Schleifen in Takten.',
  'hx.pulsMit': 'Der Puls wird mit aufgenommen, wenn du eine Schleife übernimmst.',
  'hx.borMit': 'Der Bordun wird mit aufgenommen, wenn du eine Schleife übernimmst.',
  'hx.autoclose': 'Die Aufnahme schließt sich von selbst, wenn du den Anfang wiederholst.',
  'hx.runde': 'Überspielen endet nach einer Runde von selbst.',
  'hx.rail': 'Die Leiste mit den Schleifen unter dem Spielfeld: groß oder klein.',
  'hx.humus': 'Wie viele Sekunden Myzel im Hintergrund mithört – so weit zurück kann der Korb übernehmen.',
  'hx.mem': 'Wie viel Arbeitsspeicher die Schleifen höchstens belegen dürfen.',
  'hx.beginn': 'Wie neue Schleifen spielen: genau wie gespielt oder gleich von Myzel neu gespielt.',
  'hx.stufe': 'In welcher Klangqualität Myzel Schleifen neu spielt.',
  'hx.tonartAmTakt': 'Wechselst du die Tonart, folgen die Schleifen erst am nächsten Takt – nicht mitten in der Phrase.',
  'hx.regel': 'Wann zu einer Lichtung gewechselt wird: am nächsten Takt oder wenn die längste Schleife zu Ende ist.',
  'hx.lichMix': 'Eine Lichtung merkt sich auch die Einstellungen im Mixer.',
  'hx.lichPuls': 'Eine Lichtung merkt sich, ob der Puls läuft.',
  'hx.lueckeT': 'Wie lang eine Lücke ist: ein Schlag oder ein Takt.',
  'hx.schluss': 'Wie das Stück endet: jede Schleife an ihrem Ende, langsam welkend oder abbauend (die jüngste zuerst).',
  'hx.welk': 'Über wie viele Takte der welkende Schluss geht.',
  'hx.traeg': 'Wie träge das Band beim Tempowechsel reagiert – wie ein Motor, der anläuft.',
  'hx.stopp': 'Wie lange das Band beim Bandstopp ausläuft.',
  'hx.buehne': 'Große Ringe und wenige Hinweise – für den Auftritt.',
  'hx.pulsStumm': 'Der Puls wird stumm, nachdem du ihn als Schleife geerntet hast.',
  'hx.gaertner': 'Wie sehr die Schleifen auf dich hören: nur zuschauen, Platz machen oder dir antworten.',
  'hx.gPlatz': 'Spielst du dicht, werden Schleifen in deiner Lage leiser.',
  'hx.gRollen': 'Gehst du in den Bass, die Melodie oder die Akkorde, macht die Schleife mit dieser Rolle Platz.',
  'hx.gAntw': 'Hörst du nach einer Phrase auf, antwortet der Gärtner aus deinem eigenen Material.',
  'hx.gBegl': 'Der Gärtner schlägt zu Melodien Bass und Akkorde vor.',
  'hx.gWk': 'Schleifen kommen wieder, wenn du ihr Motiv spielst.',
  'hx.gStimme': 'Mit welchem Klang der Gärtner antwortet.',
  'hx.hand': 'Myzel merkt sich deine Spielweise – nur auf diesem Gerät.',
};
// the key parts of a control: its row's label, its section's heading, its own text – plain (numbers, values after „·“ and
// „:“, a counter like „→ 2“ or „Spur 3“ dropped)
function hxTipNorm(t) { return String(t || '').replace(/\s*[·:].*$/, '').replace(/\s+\d+$/, '').trim(); }
function hxTipRow(el) {
  const r = el.closest('.hx-row, .hx-lrow, .hx-srow');
  if (r && r.closest('.hx-sch')) { const s = r.closest('.hx-sch').querySelector('.lab'); return s && /Knospen/.test(s.textContent) ? 'Knospen' : 'Schichten'; }
  if (r && r.classList.contains('hx-lrow')) return r.closest('.hx-form-sec') && !r.closest('.hx-folge') ? 'Lichtung' : '';
  const lab = r && r.querySelector(':scope > .lab');
  if (!lab) return '';
  const t = lab.textContent.trim();
  return /^\d+ Schichten$|^Schicht$/.test(t) ? 'Schichten' : hxTipNorm(t);
}
function hxTipSec(el) {
  if (el.closest('.hx-folge')) return 'Folge';
  if (el.closest('.hx-gd')) return 'Gärtner';
  if (el.closest('.hx-form-sec')) return 'Form';
  return '';
}
function hxTipFor(el) {
  const row = hxTipRow(el), sec = hxTipSec(el), raw = el.tagName === 'SELECT' ? 'SELECT' : el.tagName === 'INPUT' ? 'RANGE' : (el.textContent || '').trim(), t = hxTipNorm(raw) || raw;
  const own = HX_TIP[row + '|' + t] || HX_TIP[sec + '|' + t] || HX_TIP[t];
  if (own) return own;
  const a = el.getAttribute('aria-label');
  if (a && a.trim() !== raw) return a;
  return HX_TIP[sec + '|@' + row] || HX_TIP['@' + row] || '';
}
function hxTips(root) {
  if (!root) return;
  for (const el of root.querySelectorAll('button, select, input[type="range"]')) { const t = hxTipFor(el); if (t && el.title !== t) el.title = t; }
  for (const lab of root.querySelectorAll('.hx-row > .lab, .hx-sch > .lab, .hx-lrow > .lab')) {
    const r = lab.parentElement, row = r.classList.contains('hx-sch') ? 'Schichten' : r.classList.contains('hx-lrow') ? (r.closest('.hx-form-sec') && !r.closest('.hx-folge') ? 'Lichtung' : '') : hxTipNorm(lab.textContent), t = HX_TIP[hxTipSec(lab) + '|@' + row] || HX_TIP['@' + row];
    if (t && lab.title !== t) lab.title = t;
  }
  for (const id in HX_TIP_P) {
    const el = document.getElementById(domId(id)); if (!el || !root.contains(el)) continue;
    const w = el.closest('.ctl') || el;
    for (const x of [w, ...w.querySelectorAll('label, button, input')]) x.title = HX_TIP_P[id];
  }
}
// keep a root's tips current: after every change below it (a render, a chip row), once per frame
function hxTipsWatch(root) {
  if (!root || !window.MutationObserver) { hxTips(root); return; }
  let q = false;
  new MutationObserver(() => { if (q) return; q = true; requestAnimationFrame(() => { q = false; hxTips(root); }); }).observe(root, { childList: true, subtree: true });
  hxTips(root);
}
// the Ringleiste's own buttons: what each does now (from hxRailState)
function hxRailTips(hw) {
  const set = (el, t) => { if (el && el.title !== t) el.title = t; };
  set(HXU.korb, 'Übernehmen (Korb): nimmt, was du gerade gespielt hast, als Schleife – auch ohne vorher zu drücken. Die Zeile darunter sagt, was ein Tipp nehmen würde.');
  set(HXU.haupt, ({ neu: 'Aufnehmen: tippen, spielen, noch einmal tippen – fertig ist die Schleife. Halten nimmt auf, solange du hältst.', 'überspielen': 'Überspielen: legt eine neue Schicht auf die Fokus-Schleife. Noch einmal tippen beendet.', 'schließen': 'Die Aufnahme beenden – die Schleife spielt sofort.', abbrechen: 'Das Warten auf die Eins abbrechen.', weiter: 'Angehaltene Schleifen spielen auf der nächsten Eins weiter.', beenden: 'Das Überspielen beenden.' })[hw] || '');
  set(HXU.undo, 'Zurück: nimmt den letzten Schritt zurück (oder bricht ab, was gerade wartet). 1,5 Sekunden halten: alle Schleifen leeren.');
  set(HXU.redo, 'Wiederholen: den zurückgenommenen Schritt wiederherstellen.');
  set(HXU.form, 'Form: wechselt zur nächsten Lichtung – einem gemerkten Teil deines Stücks. Halten: die Zeile mit Merken, Kern, Lücke und Schluss.');
  set(HXU.pg, 'Die nächsten Plätze zeigen – die Zahl sagt welche, „+2 spielen“: zwei Schleifen auf den anderen Seiten spielen.');
  set(HXU.fold, 'Die Leiste ein- oder ausklappen.');
  for (let i = 0; i < HX_SLOTS; i++) {
    const b = HXU.rings[i], L = HX.loops.get(HX.slot[i]), R = HX.rec;
    set(b, R && R.slot === i ? (R.phase === 'rec' ? 'Nimmt auf – tippen beendet die Aufnahme.' : 'Wartet auf die Eins – tippen bricht ab.')
      : !L ? 'Leerer Platz ' + (i + 1) + ': tippen nimmt hier eine neue Schleife auf.'
        : 'Schleife ' + (i + 1) + (L.state === 'spielt' ? ' spielt' : L.state === 'stumm' ? ' ist stumm' : ' ist angehalten') + '. Tippen: ' + (L.state === 'spielt' ? 'stumm' : L.state === 'stumm' ? 'wieder an' : 'weiterspielen') + ' (mit Takt auf der nächsten Eins). Hoch- oder runterziehen: lauter oder leiser. Halten oder Rechtsklick: ihr Menü – bearbeiten, Karte, Solo, Export, Farbe, Löschen.');
  }
}
