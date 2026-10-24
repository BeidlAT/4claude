# Hexenring – Bedienung im Test: was ein Neuling erlebt

Stand 24.10.2026, App-Stand `ffc4649` (Branch `ccr-183ec81a-rkp3np`). Für den Besitzer.

**So wurde getestet.**
- Mit Playwright (Chromium), immer mit frischem Profil, nur über das, was man sieht: tippen, halten, ziehen, Tasten. Keine internen Aufrufe.
- **Handy:** 412 × 915, Touch, Android-Kennung. **PC:** 1280 × 800, Maus. Dazu ein Blick auf 360 px Breite.
- **Klang:** Am Ausgang der App hing ein Messpunkt (Pegel, Helligkeit). „Hörbar“ heißt hier: am Ausgang gemessen. Bei „Lebendig“ wurde verglichen, wie ähnlich sich aufeinanderfolgende Durchgänge sind.
- Bilder: `audit/` (JPEG, verkleinert). Die Testskripte liegen in `audit/skripte/` (der Fehler B1 lässt sich mit `node audit/skripte/repro-doppeltipp.js` in einer Minute nachstellen).

**Grenzen.**
- Das Handy ist nachgebildet: Touch-Ereignisse, Bildschirm und Kennung stimmen, Rechenleistung und Lautsprecher nicht. Fehler B1 kommt aus dem Browser-Kern (Blink), der auf echten Android-Handys derselbe ist. **Am echten Handy bitte einmal bestätigen** (Schritte unten).
- Mikrofon: nur ein künstliches Testgerät. Gestik (Ladung, Schlafen): nicht testbar.
- Mitspieler und Ökologie wurden angespielt, nicht erschöpfend geprüft (Gärtner „antwortet“, Begleiten, Nähren ins Gespinst; Treffen, Schleife in Schleife und Rhizom-Netz nur gesichtet).

---

## Das Wichtigste in fünf Sätzen

1. **Am Handy lösen die Hauptknöpfe oft doppelt aus.** Ein Tipp auf den Korb erntet und bricht sofort wieder ab („Ernte abgebrochen“, Stille). Ein Tipp auf „schließen“ schließt die Schleife und startet gleich eine neue Aufnahme. Ein Tipp auf ↶ nimmt zwei Schritte zurück. Am PC mit der Maus geht alles. **Das erklärt sehr wahrscheinlich deinen Eindruck, dass vieles „gar nicht geht“** (Fehler B1).
2. **Fast alle Rückmeldungen sind unsichtbar.** 147 Ansagen wie „Ernte abgebrochen“, „Schleife 1 verstummt mit Takt 15“ oder „Aufnahme beginnt mit Takt 2“ gehen nur an Bildschirmleser. Wer sieht, bekommt sie nicht.
3. **Die Funktionen selbst arbeiten (am PC geprüft):** aufnehmen, ernten, stumm, Schichten, Rückgängig, Wuchs, Lebendig, Band, Nähren, Gärtner, Lichtungen, Export. Messbar und hörbar.
4. **Die Bedienung ist für Neulinge nicht zu durchschauen:** zwei Arten aufzunehmen nebeneinander (Korb und Hauptknopf) und dazu vier „aufnehmen“-Ringe; Fachwörter (Humus, Naht, Wurf, Eigensinn, Abdruck); eine Karte mit 108 Knöpfen pro Schleife, 1 233 px hoch, am Handy in einem Fenster von etwa 340 px.
5. **Wichtige Funktionen liegen versteckt:** klassisches Überspielen nur über eine Einstellung, die Form-Zeile nur durch Halten, die Bühnenansicht ganz unten in den Einstellungen.

---

## Funktion für Funktion

**Zeichen:** ✓ ja · ~ teilweise · ✗ nein. „Geht“ heißt: tut, was die Beschriftung verspricht, hörbar und sichtbar. Wo Handy und PC sich unterscheiden, steht beides da.

| Funktion | Findbar? | Geht? | Zustand sichtbar? | Befund |
|---|---|---|---|---|
| Erster Blick nach „Klang starten“ | ~ | – | – | Die Ringleiste erscheint unter dem Feld: Korb „leer“, Knopf „neu“, vier (PC: acht) Ringe „aufnehmen“, ↶, „Form“. Ein Hinweis „Spiel etwas Schönes, dann tippe den Korb.“ verschwindet nach 14 s und kommt nie wieder. Auf dem Startbildschirm kommt der Looper nicht vor. Fünf Dinge heißen sinngemäß „aufnehmen“, dazu REC oben. Bild 01. |
| Hauptknopf „neu“: aufnehmen und schließen (ohne Takt) | ~ (Punkt im Kreis, Wort „neu“) | PC ✓ · Handy ✗ | ~ | PC: Aufnahme beginnt sofort (rote Scheibe mit Sekunden), zweiter Klick schließt, die Schleife spielt (gemessen). Handy: der Tipp auf „schließen“ schließt und startet sofort eine neue Aufnahme, ohne Takt entstehen 0,3-s-Schleifen (B1). |
| Hauptknopf mit Takt (Puls läuft): Einzählen | ~ | ✓ | ~ | Er wartet auf die nächste Eins. Sichtbar ist nur eine kleine rote Zahl der verbleibenden Schläge im gestrichelten Kreis. Wörter abgeschnitten („abbrech…“). „Aufnahme beginnt mit Takt 2“ hört nur der Bildschirmleser. Die erste Aufnahme schließt sich nicht von selbst. Bild 03. |
| Korb (Übernehmen, was gerade gespielt wurde) | ~ (Korb-Symbol, Wort „leer“, Hinweis) | PC ✓ · Handy ✗ | ~ | PC: nach dreimal gespielter Figur zeigt er „1 T · 112“, ein Klick → „an der Naht“ → die Schleife setzt ein (gemessen). Handy: in 3 von 3 Versuchen „Ernte abgebrochen“, danach Stille (B1). Die Beschriftung ist Fachsprache („frei · 2,2 s“, „an der Naht“, „1 T · 177“), und sie widerspricht sich (B6). Leerer Korb: verständlicher Hinweis („Im Humus liegt noch nichts …“). Bild 02. |
| Leerer Ring „aufnehmen“ | ✓ | ✓ | ✓ | Zweiter Weg zur Aufnahme, gleich wie „neu“. Für Neulinge unklar, worin sich „neu“ und „aufnehmen“ unterscheiden. |
| Korrekturen nach der Ernte (Tempo ½, ×2, +1, Eins ←, →, 3er, Runde davor) | ✓ (drängen sich auf) | ✓ | ✗ | Sie verdecken 8 s und länger alle Ringe; in der Zeit ist die neue Schleife weder sichtbar noch stummschaltbar. Die Wörter sagen einem Neuling nichts. Bild 04. |
| Stumm / an (Tipp auf den Ring) | ~ (Wort „stumm“ unter dem Ring) | ✓ Handy und PC | ✓ | Wirkt am Taktstrich; bis dahin steht „abbrechen“ und ein grauer Keil. Gut gelöst. Ohne Takt sofort. Die Ansage „verstummt mit Takt 15“ ist unsichtbar. |
| Pegel (Ring ziehen) | ✗ (nirgends angedeutet) | nicht geprüft | ~ | Nur aus dem Konzept bekannt. |
| Karte öffnen (Ring halten) | ✗ (kein Hinweis; Aufnahme-Tab als Umweg) | ✓ | – | Halten öffnet die Karte. Ohne Takt schaltet der Druck den Ring aber erst kurz stumm und wieder an (B7). |
| Rückgängig ↶ / Wiederholen ↷ | ✓ | PC ✓ · Handy ✗ | ✓ (Toast) | PC: nimmt die Ernte zurück, ↷ erscheint, mit Toast. Handy: ein Tipp nahm zwei Schritte zurück (B1). Nach ↷ bleibt der Chip „Tempo behalten“ stehen (B5). |
| Alle leeren (↶ 1,5 s halten) | ✗ (nur in der Beschriftung für Bildschirmleser und in der Karte) | ✓ | ✓ | Ein roter Kreis füllt sich. Toast „Alle Schleifen geleert.“, rückgängig zu machen. |
| Löschen (Karte) | ~ (ganz unten in der Karte) | ✓ | ✓ | Mit ↶ zurückzuholen, dazu das Fach „Gelöscht“. Das rote ✕ neben einer Schicht löscht bei nur einer Schicht die ganze Schleife (B9). |
| Stille (Lautsprecher-Knopf) | ✓ | ✓ | ✓ | Hält Schleifen an, Toast mit „Weiter · Leeren“; der Hauptknopf zeigt ▶ „weiter“. Gut. |
| Schicht per Korb („→ 1“) | ✗ | ✓ (PC) | ~ | Über einer Schleife spielen, Korb, dann den Chip „→ 1“. Der Korb legt dabei zuerst eine **neue** Schleife an (Ansage „Schleife 2 beginnt …“), „→ 1“ macht daraus eine Schicht. Zwei Schritte, Bedeutung des Chips unklar. Gemessen: lauter, heller, Karte zeigt „2 Schichten“. |
| Klassisches Überspielen (Hauptknopf „überspielen“) | ✗ (nur über Einstellungen → „Dieselbe Schleife“) | ✓ (PC) | ✓ (rot mit +, „beenden“) | Funktioniert gut, ist aber versteckt. Jede Runde wird eine eigene Schicht (4 Schichten nach zwei Runden). |
| Karte: Zustand, Pegel, Schichten | ✓ | ✓ | ✓ | Verständlich. |
| Karte: Phase, Korrigieren, Quelle, Effektkette, Taumeln | ~ | nicht im Detail | ~ | Fachwörter ohne Erklärung. „wird eingebrannt …“ stand im Test 13–35 s und länger, ohne Fortschritt (B8). |
| Karte: Wiedergabe Abdruck / Wuchs | ~ | ✓ | ✓ | „Wuchs“ → „wächst …“ → „Wuchs“. Treu klingt Durchgang für Durchgang gleich (Ähnlichkeit 0,95–0,98 wie der Abdruck). Fehlt bei manchen Schleifen ohne Erklärung („ohne Noten“, einmal bei einer gespielten Figur; B8). |
| Karte: Treu / Lebendig (Eigensinn) | ~ | ✓ | ✓ („lebt“, atmender Ring) | Lebendig ist messbar lebendig: Ähnlichkeit der Durchgänge 0,83 statt 0,96. |
| Karte: ✓ ✕ ⚓ | ✗ (nur bei Lebendig, ganz unten) | ~ | ~ | ✓ antwortet erst ein, zwei Sekunden später, nach dem nächsten Tipp (B11). ⚓ stellt ungefragt auch Wuchs und Lebendig ab (B10). „Neuer Wurf“ schaltet still von Abdruck auf Wuchs (B10). |
| Karte: Variieren / Wandern | ~ | nicht im Detail | ~ | Wörter ohne Erklärung, keine Vorschau, was passieren wird. |
| Karte: Verwandeln (Band, rückwärts, Stopp, Trimmen, Verdoppeln, Auslassen, Würfeln, Verblassen, Abrieb, Einwurzeln, Moder, Noten, Groove) | ~ (zugeklappt) | ✓ (Stichproben) | ~ | Band ½: eine Oktave tiefer (Helligkeit 1 310 → 726 Hz). Rückwärts und zurück: ✓. „Stopp“ hält die Schleife an, danach steht nicht da, wie sie wieder anläuft (nur „Zustand: spielt“ oder der Hauptknopf „weiter“). |
| Karte: Nähren (Gespinst, Körner, Rhizom, Regen, Glut, Sehne, Schleife in Schleife) | ~ | ✓ (Gespinst geprüft) | ✓ | Gespinst: hörbar dazu (+18 % Pegel). Der Rest nur gesichtet. Was „Nähren“ bedeutet, steht nirgends. |
| Karte: Ladung | ~ | ✗ am PC | ~ | Toast: geht nur mit Gestik. Am PC eine Sackgasse, der Schalter ist trotzdem da. |
| Mitspieler: Rolle, Gärtner darf/nicht, Begleiten | ~ | ~ | ~ | „Begleiten“ erscheint nur bei manchen Schleifen. Keine Erklärung, was eine Rolle bewirkt. |
| Gärtner (schaut zu · pflegt · antwortet) | ✗ (in der Karte unter allen Schleifen) | ✓ | ✓ (Zeile „Du spielst: …“, Chips) | „antwortet“ zählt sichtbar „zum Antworten noch 37 Töne“, antwortet dann hörbar (Pegel ×2,6). Während er antwortet, verdeckt der Chip „✕ Antwort abbrechen“ die Ringe. Bild 11. |
| Mikro | ✗ (Einstellungen, ganz unten) | ~ | ✓ („● Mikro“ im Feld) | Einschalten geht. Unter „Mikrofon“ steht sichtbar das Wort **„null“** (B3). Der Toast sagt „Mikro in der Ringleiste“, es steht aber im Feld (B15). Verzögerung messen: mit dem Testgerät nicht möglich (erwartbar). Bild 08. |
| Lichtungen: merken, wechseln (Form-Knopf) | ✗ (Wort „Form“) | ~ | ~ | Ein Tipp ohne Lichtung öffnet die Zeile. Merken ✓ (Toast). Wechsel ✓ (am PC gemessen: stumme Schleife kommt wieder). Aber: **Halten, um die Zeile zu öffnen, schaltet ohne Takt sofort zur nächsten Lichtung** (B2). Merken ist nicht rückgängig zu machen. Die Zeile verdeckt die Ringe; um eine Schleife für die nächste Lichtung stummzuschalten, muss man sie schließen und wieder öffnen. „Schluss“ steht gleichrangig neben „merken“. Bild 07. |
| Kern, Lücke, Schluss, Folge, Treffen | ✗ | nicht im Detail | ~ | Nur gesichtet. |
| Bühnenansicht | ✗ (Einstellungen → „Band und Bühne“) | ~ | ~ | Leiste wird höher, eine winzige Legende „Pedale: in der Karte zuweisen“ liegt über dem Korb. Große Ringe nicht erkennbar. Bild 08. |
| Setliste | ✗ | ✗ | ~ | „Dieses Lied hinzufügen“ ✓. **„Nächstes Lied“ bei einem Lied und „Laden“ des aktuellen Lieds räumen alle Schleifen weg** (B4). |
| Export: „Als Aufnahme“, „MIDI“ | ~ (in „Verwandeln“) | ✓ | ~ | MIDI: Datei wird heruntergeladen ✓. „Als Aufnahme“ legt eine Aufnahme weiter unten im Panel an; für die WAV-Datei braucht es dort noch „WAV speichern“. |
| Aufnahme in Takten (REC oben) | ~ | ✓ | ✓ („1/8“ auf REC) | Funktioniert. Verwechslungsgefahr: REC oben und „Aufnahme läuft“ des Loopers sind zwei verschiedene Dinge mit demselben Wort. |
| Tastatur (Leertaste, E, 1–8, Strg+Z) | ✗ (nur im Text bei den Pedalen) | ✓ (Leertaste geprüft) | ✓ | Gut, aber nirgends sichtbar erklärt. |
| Einstellungen | ~ | – | – | 40 Schalter in einem Block, Fachsprache („Humus-Länge“, „Gespielt hört die Spuren“). Darunter wichtige Bedienwege (Überspielen, Bühne, Setliste, Mikro, Pedale). |
| 360 px Breite | – | ~ | ~ | Wörter abgeschnitten („aufnehm…“), der Einklapp-Pfeil liegt auf dem Form-Knopf (B13). Bild 09. |
| Handy: Auslastung | – | ? | ✓ | Nach zwei 0,3-s-Schleifen (aus B1) meldete die Nachbildung „Das Handy ist mit den Schleifen ausgelastet“. Der Toast legt sich über die Leiste. Ob das am echten Handy auch so käme, ist offen (die Testmaschine selbst hat Aussetzer). Bild 10. |

---

## Echte Fehler, mit Schritten zum Nachstellen

### B1 · Handy: Ringleisten-Knöpfe lösen doppelt aus (kritisch)

**Was passiert:**
- **Korb:** erntet und bricht sofort ab, „Ernte abgebrochen“, Stille.
- **Hauptknopf „schließen“:** schließt und startet gleich eine neue Aufnahme. Ohne Takt entstehen dabei 0,3-s-Schleifen; mit Takt wartet sofort die nächste Aufnahme mit „×1 ×2 ×4“.
- **↶:** nimmt zwei Schritte zurück.
- Der Form-Knopf ist nach demselben Muster gebaut.

**Nachstellen (Handy, Chrome):**
1. Klang starten.
2. Eine kurze Figur dreimal spielen.
3. Den Korb antippen.

Erwartet: die Schleife setzt an der Naht ein. Tatsächlich: nichts, und der Bildschirmleser sagt „Ernte abgebrochen“. Automatisch: `node audit/skripte/repro-doppeltipp.js` (Touch: `click detail=0 | Ernte abgebrochen`; Maus: `Schleife 1 beginnt …`).

**Ursache:**
- `js/hexenring/ringleiste.js`, `press()`: der Knopf handelt schon beim Aufsetzen (`pointerdown`). Ein `click` mit `detail === 0` gilt als Tastendruck und handelt **noch einmal**. Dasselbe Muster haben die Ringe, ↶ und der Form-Knopf.
- Ändert sich beim Aufsetzen das Layout der Leiste (Ringe ↔ Chips, ein neues Wort), schickt Chromium nach einem Touch-Tipp ein `click` mit `detail = 0`. Mit einer Minimalseite nachgestellt: Maus `detail 1`, Touch `detail 0`.
- Die Testsuiten klicken mit der Maus, darum fiel es nicht auf.

**Vorschlag zur Behebung:**
- Tastatur nicht über `click.detail` erkennen, sondern über `keydown` (Enter, Leertaste).
- Oder jeden `click` verwerfen, der bis 800 ms nach einem `pointerdown` auf demselben Knopf kommt.

**Am echten Handy prüfen:** dieselben drei Schritte. Kommt „nichts“ heraus, ist es dieser Fehler.

### B2 · Form-Knopf halten schaltet die Lichtung um

**Nachstellen:**
1. Ohne Puls eine Schleife aufnehmen.
2. Form-Knopf antippen, „merken“ (Lichtung 1). Zeile schließen.
3. Die Schleife stummschalten.
4. Form-Knopf **halten**, um die Zeile zu öffnen.

**Was passiert:** Die Schleife ist sofort wieder an. Der Tipp beim Aufsetzen springt zu Lichtung 1. Ohne Takt heißt das „gleich“, das spätere Abbrechen beim Halten kommt zu spät. Wer danach „merken“ tippt, speichert unbemerkt dasselbe wie in Lichtung 1.

**Dazu:** Die Chips heißen „1 · Takt“ („wechselt am Takt“), auch wenn es keinen Takt gibt.

### B3 · Das Wort „null“ im Mikrofon-Abschnitt

**Nachstellen:** Aufnahme → Einstellungen → Mikrofon (aus). Unter der Zeile steht „null“.

**Ursache:** `js/hexenring/oekologie/card.js`, `hxCardMic`: `box.append(…, korb)` mit `korb = null`. `append` schreibt `null` als Text. Bild 08.

### B4 · Setliste räumt die Schleifen weg

**Nachstellen:**
1. Eine Schleife aufnehmen.
2. Einstellungen → „Dieses Lied hinzufügen“.
3. „Nächstes Lied“ (bei nur einem Lied) oder „Laden“.

**Was passiert:**
- Die Schleife verstummt und ist aus der Leiste verschwunden.
- Der Toast „Lied 1 – 1 Schleifen von früher“ mit „Zurückholen“ steht nur 3 s da.
- ↶ holt sie nicht zurück (es nahm einen anderen Schritt zurück).
- Wiederfinden lässt sie sich nur im Fach „Gelöscht“ ganz unten.

### B5 · „Tempo behalten“ bleibt nach ↷ stehen

**Nachstellen:**
1. Eine Schleife aufnehmen.
2. ↶ antippen: der Chip „Tempo behalten · 108,4“ erscheint.
3. ↷ antippen: die Schleife ist wieder da, der Chip bleibt und verdeckt ihren Ring.

### B6 · Der Korb widerspricht sich

- Nach einer Aufnahme zeigt der Korb „2 T“, die Ansage sagt „1 Takt“.
- Über einer Schleife mit 113 BPM zeigt der Korb „1 T · 177“.
- Ein Neuling kann daraus nicht ablesen, was ein Tipp nehmen würde. Genau das soll die Beschriftung laut Konzept leisten.

### B7 · Ring halten erzeugt einen kurzen Aussetzer

Ohne Takt schaltet der Druck die Schleife sofort stumm. Erst nach 0,5 s (Halten → Karte) schaltet sie wieder an. Bildschirmleser: „Schleife 1 stumm“.

### B8 · Wuchs fehlt manchmal, Einbrennen ohne Fortschritt

- Einmal von etwa acht Aufnahmen stand bei einer gespielten Figur „Wuchs: ohne Noten: bleibt ein Abdruck“. Wuchs und Lebendig waren dann nicht wählbar, ohne Grund.
- „wird eingebrannt …“ stand in jedem Lauf 13 s und länger da, einmal über 35 s, ohne Fortschritt.
- Beides ist nicht sicher reproduzierbar. Es kann an der Testmaschine liegen.

### B9 · ✕ heißt in der Karte zweierlei

- Rotes ✕ neben einer Schicht: **löscht die Schicht**. Bei nur einer Schicht löscht es die ganze Schleife (im Test so passiert: „Schleife 1 gelöscht“).
- ✕ neben ✓: **lehnt einen Durchgang ab**.

Das ist gleiches Zeichen, gegensätzliche Folge, kein Nachfragen. Rückgängig geht.

### B10 · ⚓ und „Neuer Wurf“ ändern mehr, als sie sagen

- ⚓ („Anker: zurück zum Original“) stellt auch Wiedergabe auf Abdruck und Eigensinn auf Treu.
- „Neuer Wurf“ auf einer Abdruck-Schleife schaltet still auf Wuchs.

### B11 · ✓ antwortet verspätet

Der Toast „dieser Durchgang ist der Anker“ kam erst nach dem nächsten Tipp (nach ✕). So wirkt es, als hätte ✕ ihn ausgelöst.

### B12 · Chips verdecken die Ringe

Korrekturen nach der Ernte (über 8 s), die Form-Zeile und „Antwort abbrechen“ ersetzen die Ringe. Solange sie stehen, ist keine Schleife zu sehen oder stummzuschalten. Bild 04.

### B13 · Einklapp-Pfeil liegt auf dem Form-Knopf

Der Pfeil (28 × 16 px) sitzt oben auf dem Form-Knopf (Handy, PC, 360 px). Wer oben auf „Form“ tippt, klappt die Leiste ein.

### Kleinere Befunde

- B14: „Ladung“ ist am PC wählbar, wirkt aber nur mit Gestik.
- B15: Der Toast nennt „Mikro in der Ringleiste“, das Zeichen steht im Feld.
- B16: Grammatik: „alle 1 Schleifen geleert“, „1 Schleifen von früher“.

---

## Was das für das neue Konzept heißt

- **Erst B1 beheben.** Ohne das bleibt jede Bedienung am Handy ein Glücksspiel. Danach am echten Handy prüfen.
- **Sichtbar sagen, was passiert.** Die 147 Ansagen gehören zusätzlich in eine sichtbare Zeile, nicht nur zum Bildschirmleser.
- **Ein Weg zum Aufnehmen**, ein zweiter (Übernehmen) klar daneben. Überspielen am selben Knopf.
- **Die Ringe nie verdecken.** Korrekturen und Form in eine eigene Zeile oder ein Blatt.
- **Die Karte gliedern:** wenige Dinge oben, der Rest in benannten Gruppen mit je einem Satz Erklärung.

Der Vorschlag dazu steht in `KONZEPT.md`, zum Ausprobieren in `mockup.html`.
