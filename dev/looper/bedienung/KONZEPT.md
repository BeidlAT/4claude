# Hexenring bedienen – ein neues Konzept

Stand 24.10.2026. Für den Besitzer. Zum Ausprobieren am Handy: `mockup.html` (ohne Ton, nur die Bedienung).

Grundlage ist der Test in `AUDIT.md`. Alles hier ist ein **Vorschlag**. Was du entscheiden musst, steht in §9.

---

## 0. In einer Minute

**Das Ziel:** Wer Myzel zum ersten Mal öffnet, nimmt eine Schleife auf, hört sie und legt eine zweite Schicht darüber, ohne etwas zu lesen.

**Drei Knöpfe, immer am selben Platz, unten im Daumenbereich:**
- **● Aufnehmen.** Der große Knopf in der Mitte: aufnehmen, fertig, Schicht darüber. Ein Ring um ihn zeigt immer, was gerade passiert.
- **⤓ Übernehmen** (früher „Korb“). Nimmt, was du gerade gespielt hast, auch ohne vorher zu drücken. Darunter steht, was ein Tipp nehmen würde: „letzte 2 Takte“.
- **↶ Zurück.** Nimmt jeden Schritt zurück und sagt, welchen.

**Darüber die Schleifen** als Ringe mit Nummer. Ein Tipp schaltet stumm oder an, „+“ beginnt eine neue Schleife.

**Ganz oben in der Leiste eine Zeile, die immer sagt, was los ist**, zum Beispiel:
- „Zählt ein: 3 · 2 · 1“
- „Nimmt auf – Takt 2“
- „Schleife 1 verstummt auf der 1“

Nichts passiert mehr still.

**Alles andere liegt im Schleifen-Blatt** (Knopf „☰ Mehr“), in benannten Gruppen mit je einem Satz Erklärung: Klang, Lebendigkeit, Mitspielen, Verwandeln, Nähren, Form.

**Vorher muss ein Fehler weg:** Am Handy lösen die Knöpfe der Leiste heute oft doppelt aus (AUDIT B1). Ohne diese Behebung hilft kein Konzept.

---

## 1. Die Grundsätze

1. **Die erste Minute.** Ein Knopf zum Aufnehmen, rot nur, solange aufgenommen wird. Der Ring um ihn zählt ein, wächst beim Aufnehmen und kreist beim Spielen.
2. **Erst das Einfache, dann die Tiefe.** In der Leiste liegt nur, was man beim Spielen braucht. Die Tiefe liegt im Blatt, nach Absicht gruppiert und nicht nach Technik.
3. **Klare Wörter.** Zuerst sagt das Wort, was passiert. Der Myzel-Name darf klein darunter stehen: „Übernehmen“ mit „Korb“ darunter, „Neu gespielt“ mit „Wuchs“ darunter.
4. **Zustand immer sichtbar.** Wartet etwas, steht da, worauf: „wartet auf die 1“, „schließt am Ende der Runde“. Jede Ansage, die heute nur der Bildschirmleser hört, erscheint auch in der Statuszeile.
5. **Wenige Gesten, immer gleich.**
   - Tippen tut, was darunter steht.
   - Halten ist nur eine Abkürzung zu etwas, das es auch per Tipp gibt, und hat einen sichtbaren Hinweis.
   - Ziehen auf einem Ring ändert die Lautstärke.
   - Kein Doppeltipp.
6. **Hilfe an Ort und Stelle.** Ein Hinweis pro Funktion, beim ersten Mal, genau dort, wo man ihn braucht. Auf jedem Blatt ein „?“.
7. **Alles verzeihen.** Jede Handlung lässt sich zurücknehmen und wird angesagt, mit „Rückgängig“ im Hinweis. Löschen fragt nicht nach, ist aber immer zurückzuholen.
8. **Überall bedienbar:** einhändig am Handy (ab 360 px), am iPad, mit Maus und Tastatur.

---

## 2. Der Bildschirm

### 2.1 Handy, hochkant

```
┌────────────────────────────────┐
│ MYZEL  Nebel ▾    ▶  ❄   REC   │
├────────────────────────────────┤
│                                │
│          Spielfeld             │
│                                │
├────────────────────────────────┤
│ ▬▭▭▭ Takt 1 · 96   Schl. 1 ◔  │ Statuszeile
│ Schleife 1 spielt – ● = Schicht│
├────────────────────────────────┤
│  (1)    (2)    (3)    ( + )    │ Schleifen
│ spielt  stumm  spielt  neu     │
├────────────────────────────────┤
│  ↶        ╭───╮       ⤓        │
│ Zurück    │ ● │    Übernehmen  │ Steuerung
│           ╰───╯   letzte 2 T.  │
│        + Schicht      ☰ Mehr   │
└────────────────────────────────┘
│ Klang Effekte Puls Mixer …     │ Tabs
```

- **Statuszeile (2 Zeilen, 36 px):**
  - links die Taktlinie (vier Striche, der aktuelle hell) mit „Takt 1 · 96“, ohne Takt „frei“;
  - rechts die aktive Schleife;
  - darunter ein Satz, was jetzt passiert und was der große Knopf tun würde.
  - Ansagen stehen hier 4 s, danach wieder der Zustand.
- **Schleifen (56 px):** Auf dem Handy passen vier Ringe, dazu „+“ für eine neue. Gibt es mehr, steht „5–8 ▸“ da. Unter jedem Ring ein Wort: was ein Tipp jetzt tut. Ein Ring ist **nie** verdeckt: Korrekturen, Form und Vorschläge stehen in der Statuszeile oder im Blatt.
- **Steuerung (76 px):** ● in der Mitte (64 px), ↶ links, ⤓ rechts, ☰ Mehr darunter rechts.
- **Zusammen etwa 170 px statt heute 56.** Das Feld wird kürzer, am 412 × 915-Handy etwa 440 statt 560 px. Eine kompakte Form mit einer Zeile (●, ⤓, ↶ und die Ringe nebeneinander) gibt es für kleine Bildschirme und bei offenem Panel. Das ist **Entscheidung E3**.

### 2.2 Handy, quer

Die Leiste wird eine Spalte rechts vom Feld, von oben nach unten: Statuszeile, Ringe zwei mal zwei, ●, ⤓ und ↶. Das Feld bleibt so breit wie möglich.

### 2.3 iPad und PC

```
┌──────────────────────────────────────────────┬─────────────────────┐
│ MYZEL  Nebel ▾                ▶  ❄   REC     │  Schleife 1  ✕      │
├──────────────────────────────────────────────┤  Nebel · 2 Takte    │
│                                              │  ─────────────────  │
│                  Spielfeld                   │  ● spielt  ○ stumm  │
│                                              │  Lautstärke ━━━━○━  │
│                                              │  Schichten: 2       │
│                                              │  ▸ Klang            │
├──────────────────────────────────────────────┤  ▸ Lebendigkeit     │
│ ▬▭▭▭ Takt 3 · 96 │ Schleife 2 verstummt auf  │  ▸ Mitspielen       │
│                  │ der 1 – ✕ abbrechen       │  ▸ Verwandeln       │
├──────────────────────────────────────────────┤  ▸ Nähren           │
│ ↶   ⤓ Übern.  (●)   (1)(2)(3)(4)(5)(6)(+) ☰ │  ▸ Feinarbeit       │
│                     spielt stumm …    Form ▸ │  Löschen · WAV · MIDI│
└──────────────────────────────────────────────┴─────────────────────┘
```

- Die Leiste hat eine Zeile, alle acht Ringe und Wörter darunter.
- Das Schleifen-Blatt öffnet sich **rechts als Spalte**. Das Feld bleibt spielbar, man sieht Feld und Einstellung zugleich.
- **Tastatur:**
  - Leertaste = ●, Ü oder E = Übernehmen;
  - 1–8 = Schleife stumm oder an;
  - Umschalt + 1–8 = ihr Blatt;
  - Strg+Z / Strg+Umschalt+Z = Zurück / Wiederholen;
  - F = Form, ? = Hilfe, Esc = Blatt schließen.
  - Jeder Knopf zeigt seine Taste im Tooltip; das „?“-Blatt listet alle.

---

## 3. Der große Knopf und seine Ringe

Ein Knopf, eine Regel: **● handelt an der aktiven Schleife.** Gibt es noch keine, nimmt er die erste auf. Danach legt er Schichten auf sie. Eine **neue** Schleife beginnt mit „+“ in der Schleifenreihe (**Entscheidung E1**).

| Zustand | Knopf und Ring | Statuszeile |
|---|---|---|
| Bereit | ● auf dunklem Grund, Wort „Aufnehmen“ | „Spiel los. ● nimmt auf, ⤓ übernimmt, was du gespielt hast.“ |
| Zählt ein (Puls läuft) | große Zahl **3 · 2 · 1** im Knopf, der Ring tickt je Schlag ein Viertel | „Zählt ein – Aufnahme beginnt auf der 1 · ↶ bricht ab“ |
| Wartet auf den ersten Ton | Ring gestrichelt, pulsiert leise | „Wartet auf deinen ersten Ton“ |
| Nimmt auf | Knopf rot, Wort „Fertig“; der Ring **wächst** (mit Takt: je Takt ein Strich; ohne Takt: Sekunden) | „Nimmt auf · Takt 2 · ● schließt“ |
| Schließt gleich | Ring rot gestrichelt bis zur Naht | „Schließt auf der 1 (Takt 5)“ |
| Spielt | Ring = **Runde**: ein Punkt kreist, Taktstriche außen; Wort „+ Schicht“ | „Schleife 1 spielt · ● legt eine Schicht darüber“ |
| Schicht läuft | Knopf mit rotem Rand und +, Wort „Fertig“; der Ring füllt sich je Runde | „Schicht auf Schleife 1 · Runde 2 · ● beendet“ |
| Angehalten (nach Stille) | ▶ im Knopf, Wort „Weiter“ | „3 Schleifen angehalten · ● spielt weiter auf der 1“ |

- Rot heißt immer: **es wird aufgenommen.** Sonst ist nichts rot.
- Halten von ● nimmt auf, solange man hält; das sagt ein Hinweis beim ersten Mal. Das ist kein Muss, denn der Tipp kann dasselbe.
- **Nach der ersten Aufnahme** steht in der Statuszeile „2 Takte · 96 BPM · **Passt nicht?**“. Ein Tipp darauf öffnet die Korrekturen mit klaren Wörtern (§4.7). Die Ringe bleiben dabei sichtbar.

---

## 4. Das Schleifen-Blatt

Es öffnet sich mit „☰ Mehr“, mit einem Tipp auf den Namen in der Statuszeile oder (Abkürzung) durch Halten eines Rings. Am Handy ist es ein Blatt von unten, das das Feld zur Hälfte frei lässt; auf iPad und PC eine Spalte rechts.

**Oben eine Reihe zum Umschalten:** Schleife 1 · 2 · 3 · … · **Form** · **Allgemein**.

### 4.1 Der Kopf (immer offen)

- Name und Klang („Schleife 1 · Nebel · 2 Takte“), Zustand als zwei große Knöpfe: **spielt / stumm**. „Angehalten“ kommt nur nach Stille vor und ist dann ein dritter.
- **Lautstärke** als Schieber.
- **Schichten:** je Zeile „Schicht 2 · überspielt“, ein Schieber, „stumm“ und **„Schicht löschen“** als Text, nie nur ✕.
- Unten: **Löschen** (rot, mit Rückgängig im Hinweis), **Als WAV speichern** (gleich als Datei), **Noten als MIDI**.

Darunter die Gruppen, zugeklappt. Jede zeigt geschlossen eine Zeile: was sie tut und was eingestellt ist. Beispiel: „Lebendigkeit – atmet“.

### 4.2 Klang der Schleife – *wie sie klingt*

- **Wiedergabe:**
  - „Genau wie gespielt“ (Abdruck);
  - „Neu gespielt von Myzel“ (Wuchs);
  - „Mit echten Stimmen“ (Live).
  - Ein Satz darunter: „Neu gespielt folgt Tonart, Tempo und Klang; es klingt wie dieselben Noten, noch einmal gespielt.“
- **Klangquelle:** die eigene, die des Spielfelds, eine andere (dieselbe Bibliothek wie überall).
- **Tonart:** „folgt“ (diatonisch) · „transponiert“ · „bleibt“.
- **Effekte:** „festgehalten, wie gehört“ (eingebrannt) · „folgen deinen Reglern“.
- **Stimmung:** „schwebt mit“ (Taumeln) · „bleibt, wie aufgenommen“.
- **Qualität:** wie gespielt · 1 · 2 · 3.
- Gibt es keine Noten, steht statt der Wahl ein Satz, **warum**: „Diese Schleife hat keine Noten (aus dem Mikrofon). Sie bleibt, wie aufgenommen.“

### 4.3 Lebendigkeit – *wie sehr sie sich von selbst verändert*

- Ein Schieber in vier Stufen, jede mit einem Satz:
  - **Gleich:** jede Runde genau gleich (Treu);
  - **Atmet:** gleiche Noten, jede Runde ein wenig anders gespielt (Lebendig);
  - **Spielt um:** leichte Noten ändern sich, die Eins bleibt (Variieren);
  - **Wandert:** Takte tauschen, kehrt immer zurück (Wandern).
- Ab „Atmet“ erscheinen drei Knöpfe **mit Text**:
  - „✓ Diese Runde behalten“;
  - „✕ Zurück zur behaltenen“;
  - „⚓ Zurück zur Aufnahme“, mit dem Satz „setzt auch Lebendigkeit auf Gleich“, wenn es das tut (AUDIT B10).
- Die Rückmeldung kommt **sofort** in der Statuszeile: „Behalten – gilt ab der nächsten Runde“.
- **Neu würfeln** gibt es nur, wenn „Neu gespielt“ an ist.

### 4.4 Mitspielen – *was die Schleife tut, wenn du spielst*

- **Rolle:** automatisch erkannt („erkannt: Melodie“), änderbar: Bass · Akkorde · Melodie · Fläche · Schlag.
- **„Darf Platz machen, wenn du spielst“** (Gärtner darf / nicht).
- **„Kommt wieder, wenn du ihr Motiv spielst“** (Wiederkehr).
- **„Begleitung vorschlagen“:** legt gestrichelte, stumme Vorschläge in die Schleifenreihe; ein Tipp schaltet sie ein.
- Wie sehr die Mitspieler überhaupt eingreifen, ist **eine** Einstellung für alle: „Allgemein → Mitspieler“.

### 4.5 Verwandeln – *die Schleife umformen; das Original bleibt*

- **Wie ein Tonband:** langsamer / schneller (½ · ⅔ · 1 · 1½ · 2), rückwärts, Band auslaufen lassen.
- **Ausschnitt:** Hälfte, Viertel, verschieben, wieder ganz. **Verdoppeln.**
- **Lücken:** Anschläge weglassen (Auslassen) oder tauschen (Würfeln).
- **Noten** (nur mit Noten): eine Stufe höher / tiefer, dünner, dichter, rückwärts (Krebs), gespiegelt (Umkehrung), Groove straffen / lockern.
- **Altern:** leiser werden (Verblassen), abnutzen (Abrieb), in die Tonleiter wachsen (Einwurzeln), zerfallen (Moder).
- **„So festhalten“** (Erstarren) und, immer sichtbar, **„Alles zurück zum Original“**.
- Nach „Band auslaufen“ steht in der Statuszeile: „Schleife 1 angehalten · Tipp auf den Ring startet sie wieder“.

### 4.6 Nähren – *die Schleife spielt in andere Teile von Myzel hinein*

- Schalter mit je einem Halbsatz:
  - Gespinst: „Saitennetz schwingt mit“;
  - Körner: „wird Kornmaterial“;
  - Rhizom: „stößt Lawinen an“, mit eigenem oder geteiltem Netz;
  - Sporenregen: „Noten werden Keime“;
  - Glut;
  - Sehne;
  - „Schleife in Schleife“.
- **Ladung** erscheint nur, wenn Gestik an ist (AUDIT B14).

### 4.7 Feinarbeit – *wenn etwas nicht sitzt*

- **Passt nicht?**
  - „Halb so schnell“ / „Doppelt so schnell“ (Tempo ½ / ×2);
  - „Ein Takt kürzer“ / „länger“;
  - „Eins früher“ / „später“;
  - „Dreiertakt“;
  - „Die Runde davor nehmen“.
- **Verschieben:** ein Schlag früher / später, fein ±5 ms (Phase).
- **Woher:** was du gespielt hast · alles, was klang · Mikrofon (Quelle).
- **Noten an MIDI-Geräte senden.**

### 4.8 Form – *Abschnitte für ein ganzes Stück*

Eigener Reiter im Blatt und ein kleiner Knopf „Form ▸“ rechts in der Schleifenreihe.

- **„Abschnitt merken“** (Lichtung): hält fest, welche Schleifen jetzt klingen. Ein Abschnitt bekommt den Namen „Abschnitt 1“, umbenennbar in „Strophe“ oder „Refrain“.
- Die Abschnitte stehen als große Knöpfe in einer Liste. Ein Tipp **wechselt auf der nächsten 1**; die Statuszeile sagt „Wechselt zu Refrain auf der 1 · ✕“.
- **Wann:** am Takt oder am Schleifenende. Steht nur da, wenn es einen Takt gibt.
- **Kern** (nur die markierten Schleifen) und **Lücke** (der letzte Schlag oder Takt setzt aus) als Knöpfe mit Satz.
- **Schluss** ist abgesetzt und rot umrandet: „am Ende“, „welkend“, „abbauend“. Ein Tipp beginnt den Schluss; die Statuszeile zählt herunter, ↶ bricht ab.
- **Folge** (Abschnitte nacheinander) und **Treffen** zugeklappt darunter.
- **Auftritt:** Setliste und Bühnenansicht (§4.9).
- Der Form-Knopf in der Leiste **öffnet nur** (kein Sofortwechsel beim Drücken, AUDIT B2). Für die Bühne gibt es „Nächster Abschnitt“ als eigenen Knopf in der Bühnenansicht und als Pedal (**Entscheidung E7**).

### 4.9 Allgemein – *für alle Schleifen*

Gruppen statt eines Blocks mit 40 Schaltern:
- **Aufnehmen:**
  - Beginn: am Takt / beim ersten Ton / sofort;
  - Einzählen: sichtbar / Vibration / hörbar;
  - Klick;
  - Länge: automatisch / wie Schleife 1 / fest;
  - „Schicht nur eine Runde“;
  - „Spielverzögerung messen“ (Klopf mit).
- **Mitspieler:** „Hört nur zu“ / „Macht Platz“ / „Antwortet“ (Gärtner), die einzelnen Verhalten, Handschrift.
- **Auftritt:**
  - Bühnenansicht: groß, wenige Hinweise. Sie ist auch über ein Symbol in der Statuszeile erreichbar.
  - Setliste: „nächstes Lied“ legt die Schleifen **mit Ansage und Rückgängig** beiseite (AUDIT B4).
  - Pedale, Tastatur.
- **Mikrofon:** an / aus, Verzögerung messen, Gesang als Noten.
- **Gerät:**
  - Gedächtnis (Humus) in Sekunden;
  - Speichergrenze;
  - Rechenzeit, in einem Satz: „Die Schleifen brauchen gerade 3 von 40 Teilen der Rechenkraft“;
  - das Fach „Gelöscht“.

---

## 5. Hilfe

**Erste Hinweise**, je einmal, als Sprechblase an der Stelle:

| Wann | Wo | Text |
|---|---|---|
| nach „Klang starten“ | ● | „Tippe, spiel etwas, tippe wieder – fertig ist die Schleife.“ |
| nach den ersten Tönen ohne Schleife | ⤓ | „Gerade etwas Schönes gespielt? Übernehmen nimmt es nachträglich.“ |
| erste Schleife spielt | ● | „Noch einmal ● legt eine Schicht darüber.“ |
| erste Schleife spielt | Ring 1 | „Tipp: stumm oder an. Ziehen: lauter oder leiser.“ |
| zweite Schleife möglich | + | „+ beginnt eine neue Schleife.“ |
| erstes ↶ | ↶ | „Zurück nimmt jeden Schritt zurück. Halten leert alles.“ |
| drei Schleifen | ☰ Mehr | „Hier kannst du jede Schleife verwandeln und lebendig machen.“ |
| erster Abschnitt möglich | Form ▸ | „Merke dir, was gerade klingt, und wechsle später dorthin.“ |

- Ein Hinweis verschwindet, sobald man das Gezeigte tut. Er kommt nie wieder.
- „Allgemein → Hinweise wieder zeigen“ setzt alle zurück.
- **„?“ auf jedem Blatt:** eine kurze Seite, was die Gruppen tun, mit den Myzel-Namen und den Tasten.

---

## 6. Gesten und Rückmeldung

**Was wann wirkt:**
- **Beim Aufsetzen**, wo der Zeitpunkt zählt: ●, ⤓, Tipp auf einen Ring.
- **Beim Loslassen** alles andere: ↶, Form, ☰, Knöpfe im Blatt.

**Eine Berührung ist eine Handlung** (AUDIT B1). Der Browser darf sie nicht ein zweites Mal auslösen.

**Halten:** nur dreimal, jedes Mal mit einem Ring, der sich füllt, und dem Hinweis beim ersten Mal:
- ● halten: nimmt auf, solange gehalten;
- Ring halten: sein Blatt;
- ↶ halten: alles leeren.

Halten auf einem Ring schaltet ihn **nicht** erst stumm (AUDIT B7): Ein Ring handelt beim Aufsetzen nur, wenn die Aktion auf die nächste 1 wartet. Ohne Takt handelt er beim Loslassen.

**Ziehen:** auf einem Ring hoch / runter = Lautstärke; die Zahl erscheint am Ring.

**Rückmeldung:**
- Jede Ansage steht 4 s in der Statuszeile.
- Handlungen, die etwas entfernen, zeigen zusätzlich einen Hinweis mit **„Rückgängig“**:
  - „Schleife 2 gelöscht · Rückgängig“;
  - „Lied 2 – 3 Schleifen beiseitegelegt · Zurückholen“.
- Auch „Abschnitt merken“ und die Setliste kommen in den Verlauf von ↶.

---

## 7. Die acht wichtigsten Abläufe

**1 · Die erste Schleife (ohne Puls)**
1. „Klang starten“. Die Sprechblase zeigt auf ●.
2. ● tippen. Der Knopf wird rot, die Statuszeile sagt „Nimmt auf · ● schließt“.
3. Etwas spielen.
4. ● tippen. Die Schleife spielt sofort, Ring 1 erscheint und kreist, die Statuszeile sagt „Schleife 1 spielt · 3,2 s · ● = Schicht“.
5. Falsch gespielt? ↶ – „Schleife 1 zurückgenommen · Wiederholen“.

**2 · Nachträglich übernehmen**
1. Einfach spielen. Unter ⤓ steht, was er nehmen würde: „letzte 2 Takte“.
2. ⤓ tippen. Die Statuszeile: „Übernimmt am Ende der Runde · ✕“. Dann: „Schleife 1 spielt“.
3. Passt die Länge nicht: „Passt nicht?“ → „Ein Takt kürzer“.

**3 · Eine Schicht darüber**
1. Die Schleife spielt, ● zeigt „+ Schicht“.
2. ● tippen. Mit Takt: „Zählt ein … Schicht beginnt auf der 1“.
3. Darüber spielen, ● tippen: „Schicht 2 auf Schleife 1“.
4. Alternativ: frei darüber spielen, ⤓ tippen. Die Statuszeile fragt 8 s lang: „Neue Schleife 2 · **als Schicht auf Schleife 1?**“ (**Entscheidung E2**).

**4 · Stumm, an, lauter**
1. Tipp auf Ring 1. Mit Takt: „Schleife 1 verstummt auf der 1 · ✕“. Ohne Takt sofort.
2. Noch ein Tipp: an.
3. Lauter oder leiser: auf dem Ring hoch- oder runterziehen.

**5 · Zurück, löschen, alles leeren**
- ↶: der letzte Schritt (er sagt welchen); ↷ erscheint daneben.
- Eine Schleife löschen: ☰ Mehr → Schleife 2 → „Löschen“ → „Schleife 2 gelöscht · Rückgängig“.
- Alles: ↶ halten, bis der Ring voll ist → „Alle Schleifen geleert · Rückgängig“.

**6 · Eine zweite Schleife im Takt**
1. Die erste Schleife gibt den Takt; die Taktlinie läuft.
2. „+“ tippen. Der Knopf zählt „3 · 2 · 1“, die Statuszeile sagt „Schleife 2 beginnt auf der 1“.
3. Spielen. Die Schleife schließt sich nach der Länge der ersten von selbst; die Statuszeile zeigt die verbleibenden Takte. Doppelt so lang: „×2“ in der Statuszeile, solange sie wartet.

**7 · Eine Schleife lebendig machen und eine schöne Runde behalten**
1. Ring halten oder ☰ Mehr → Schleife 1 → „Lebendigkeit“.
2. Schieber auf „Atmet“. Die Statuszeile: „Schleife 1 wird neu gespielt …“, dann „Schleife 1 atmet“. Der Ring atmet sichtbar.
3. Eine Runde gefällt: „✓ Diese Runde behalten“ → „Behalten – gilt ab der nächsten Runde“.
4. Zurück zum Anfang: „⚓ Zurück zur Aufnahme“.

**8 · Strophe, Refrain und Schluss**
1. Strophe klingt. Form ▸ → „Abschnitt merken“ → „Strophe“.
2. Schleifen umschalten, „Abschnitt merken“ → „Refrain“.
3. Live: Form ▸ → „Strophe“ tippen. Die Statuszeile: „Wechselt zu Strophe auf der 1 · ✕“.
4. Ende: Form ▸ → „Schluss · welkend“. Die Statuszeile zählt „Schluss in 8 Takten“.

---

## 8. Wo jede heutige Funktion hinkommt

**Zeichen:**
- **=** bleibt;
- **→** zieht um;
- **Ⓝ** neuer Name (Myzel-Name als Untertitel);
- **⊕** zusammengelegt;
- **✗** Vorschlag zum Entfernen.

Alles mit ⊕, ✗ und Ⓝ ist ein Vorschlag (§9).

**Ringleiste**

| Heute | Neu |
|---|---|
| Korb | Ⓝ „⤓ Übernehmen“, mit „Korb“ darunter; die Beschriftung sagt in Worten, was er nimmt |
| Hauptknopf „neu“ | ⊕ ● Aufnehmen: erste Schleife, dann Schichten auf die aktive |
| leere Ringe „aufnehmen“ | ⊕ ein einziges „+“ = neue Schleife |
| Einstellung „Hauptknopf: neue / dieselbe Schleife“ | ✗ entfällt: ● und + trennen das sichtbar |
| Ring tippen / ziehen / halten | = stumm·an / Lautstärke / Blatt (Halten mit Hinweis) |
| ↶ tippen, halten; ↷ | = |
| Form tippen (sofort wechseln), halten (Zeile) | → Form ▸ öffnet das Form-Blatt; Wechsel per Abschnitt-Knopf |
| Einklapp-Pfeil | ✗ in der Leiste; → „Allgemein: Leiste klein“ und automatisch |
| Seiten-Knopf „5–8“, „+3 spielen“ | = |
| Korrektur-Chips über den Ringen | → „Passt nicht?“ in der Statuszeile, dann Feinarbeit |
| Chips „→ 1, → 2“ | → Frage in der Statuszeile „als Schicht auf Schleife 1?“ |
| Chips „×1 ×2 ×4“ beim Warten | → Statuszeile |
| „Tempo behalten“ | → Statuszeile, verschwindet, sobald wieder eine Schleife spielt (AUDIT B5) |
| Auslese, „Auftakt anfügen“, „nur Bewegung“ | → Statuszeile als Angebot, danach in Feinarbeit |
| Taktlinie | → Statuszeile, mit Taktzahl und BPM |
| Hinweis „Spiel etwas Schönes …“ | ⊕ die ersten Hinweise (§5) |
| Ansagen nur für Bildschirmleser | → zusätzlich sichtbar in der Statuszeile |

**Karte → Schleifen-Blatt**

| Heute | Neu |
|---|---|
| Zustand spielt / stumm / angehalten | = Kopf; „angehalten“ nur, wenn es vorkommt |
| Fokus | Ⓝ „aktive Schleife“: Schichten von ● landen hier; Wahl im Kopf |
| Pegel, Schichten | = Kopf; Schicht-✕ → „Schicht löschen“ (AUDIT B9) |
| Phase, Korrigieren, Quelle | → Feinarbeit |
| Effektkette, Taumeln, Stufe, Folgen, Klang | → Klang der Schleife, Ⓝ |
| Wiedergabe Abdruck / Wuchs / Live | → Klang der Schleife, Ⓝ „Genau wie gespielt / Neu gespielt / Mit echten Stimmen“ |
| Eigensinn Treu / Lebendig / Variieren / Wandern | → Lebendigkeit, Ⓝ „Gleich / Atmet / Spielt um / Wandert“ |
| ✓ ✕ ⚓, Neuer Wurf | → Lebendigkeit, mit Text |
| Rolle, Gärtner darf, Wiederkehr, Begleiten, Puls lernt | → Mitspielen |
| Verwandeln (alles) | → Verwandeln, nach Absicht sortiert |
| Klang aufs Feld | → Klang der Schleife („Diesen Klang aufs Spielfeld“) |
| Als Aufnahme, MIDI | ⊕ Kopf: „Als WAV speichern“ (gleich als Datei), „Noten als MIDI“; „als Körner-Quelle“ → Nähren |
| Nähren (alle), Schleife in Schleife | → Nähren |
| Ladung | → Nähren, nur sichtbar mit Gestik |
| MIDI · Noten hinaus | → Feinarbeit |
| Zusammenlegen | → Kopf, bei den Schichten |
| Löschen | = Kopf |
| Weiter, Zurück, Wiederholen, Alle leeren (Karte oben) | ✗ doppelt zur Leiste; „Alle leeren“ → Allgemein |
| Rechenzeit, MB, Humus | → Allgemein → Gerät, in einem Satz |
| Gärtner-Stufe (unter den Karten) | → Allgemein → Mitspieler |
| Form-Abschnitt (unter den Karten) | → Form-Reiter |
| Lichtung: Hin, Takt / Schleifenende, Kern, Überschreiben, ✕ | → Form, Ⓝ „Abschnitt“; Überschreiben = „Neu merken“ |
| Lücke, Takt-Lücke | ⊕ „Lücke: ein Schlag · ein Takt“ |
| Schluss (drei Arten) | → Form, abgesetzt |
| Folge, Treffen | → Form, zugeklappt |
| Gelöscht (Fach) | → Allgemein → Gerät, und im Hinweis jeder Löschung |

**Einstellungen und Rest**

| Heute | Neu |
|---|---|
| 40 Einstellungen in einem Block | → Allgemein, in fünf Gruppen |
| Klopf mit | → Allgemein → Aufnehmen, Ⓝ „Spielverzögerung messen“ |
| Mikrofon (mit „null“, AUDIT B3) | → Allgemein → Mikrofon |
| Pedale, Bewegung, Hinlegen erntet | → Allgemein → Auftritt bzw. Aufnehmen |
| Bühnenansicht (versteckt) | → Allgemein → Auftritt und Symbol in der Statuszeile |
| Setliste | → Form → Auftritt |
| REC oben (Aufnahme in Takten) | Ⓝ „Mitschnitt“, damit es nicht mit dem Looper verwechselt wird (**E5**) |
| Puls ernten (im Puls-Panel) | = und als Angebot in ⤓, wenn der Puls läuft |

---

## 9. Zu entscheiden

- **E1 · ● legt Schichten auf die aktive Schleife, + beginnt eine neue.**
  - Heute ist der Standard „jede Aufnahme eine neue Schleife“; Überspielen ist versteckt.
  - Vorschlag: wie bei jeder Loop-Station. Eine neue Schleife ist ein Tipp auf „+“.
- **E2 · ⤓ über laufenden Schleifen.**
  - (a) wie heute eine neue Schleife, mit der Frage „als Schicht auf Schleife 1?“ in der Statuszeile;
  - (b) gleich eine Schicht auf die aktive, mit der Frage „lieber als neue Schleife?“.
  - Vorschlag: (a), weil es nichts überschreibt.
- **E3 · Die Leiste am Handy wird höher** (etwa 170 statt 56 px), das Feld kürzer.
  - Alternative: eine kompakte Zeile wie heute, nur mit Statuszeile darüber (etwa 90 px).
  - Mit dem Mockup ausprobieren.
- **E4 · Neue Namen.**
  - „Übernehmen“ (Korb), „Genau wie gespielt“ (Abdruck), „Neu gespielt“ (Wuchs), „Gleich / Atmet / Spielt um / Wandert“ (Eigensinn), „Abschnitt“ (Lichtung), „Mitspieler“ (Gärtner), „Gedächtnis“ (Humus), „Nähren“ bleibt.
  - Die Myzel-Namen stehen jeweils klein darunter.
- **E5 · REC oben heißt „Mitschnitt“.**
- **E6 · Entfernen:**
  - den Einklapp-Pfeil;
  - die Einstellung „Hauptknopf neu / dieselbe“;
  - die doppelten Knöpfe oben in der Karte;
  - „Takt-Lücke“ als eigener Knopf;
  - „Ladung“ ohne Gestik.
- **E7 · Form-Knopf öffnet nur.** Sofortwechsel per Abschnitt-Knopf, in der Bühnenansicht ein großer Knopf „Nächster Abschnitt“ und das Pedal.
- **E8 · Halten auf einem Ring ohne Takt:** handelt erst beim Loslassen (kein kurzer Aussetzer). Mit Takt bleibt es beim Aufsetzen, weil die Aktion ohnehin auf die 1 wartet.

**Nicht zu entscheiden, sondern zuerst zu tun:** AUDIT B1 (doppelte Auslösung am Handy) beheben und am echten Handy prüfen. Ebenso B2–B5 und B9–B11, denn das sind Fehler und keine Geschmacksfragen.

---

## 10. Wie es gebaut werden könnte

Etappenweise, jede für sich nützlich:

1. **Fehler** B1–B5, B9–B11. Die Ansagen in einer sichtbaren Statuszeile (eine Zeile über der heutigen Leiste). Das allein macht den Looper am Handy benutzbar.
2. **Die Leiste:** ● / + / ⤓ / ↶, die Zustandsringe, nichts verdeckt die Ringe.
3. **Das Schleifen-Blatt** mit Kopf und Gruppen; die Karte im Aufnahme-Panel entfällt.
4. **Form-Reiter, Allgemein, Hilfe und erste Hinweise.**
5. **Quer, iPad, PC:** Spalte, Tastatur-Hilfe.

Am Klang ändert keine Etappe etwas: Das ist reine Bedienung.
