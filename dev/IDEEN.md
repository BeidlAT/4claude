# Myzel – Ideen und Pläne für nach dem Looper

Gesammelt aus den Gesprächen mit dem Besitzer (Oktober 2026). Reihenfolge = vereinbarte Priorität. Diese Datei ist das
Gedächtnis dafür; jede neue Sitzung liest sie zusammen mit `dev/HANDOFF.md`.

**Ausrichtung (entschieden 24.10.2026):** Hauptgerät ist der PC mit Keyboard – dafür wird entwickelt, gemessen und
optimiert. Das iPad läuft über die Web-App mit. Das Handy wird nicht weiter verfolgt (keine eigene Arbeit dafür).

## Vereinbarte Reihenfolge

1. **Looper (Hexenring) fertig bauen, alle Testzeilen grün, veröffentlichen.** Erst wenn alles fertig ist; der Besitzer
   testet dann selbst in der App (iPad Pro, Android-Handy, Desktop-PC).
2. **Module.** `myzel/index.html` in Module aufteilen (HTML-Gerüst, CSS, JavaScript-Module je Bereich: Klangquellen,
   DSP, Mischpult, Gestik, MIDI, Puls, Hexenring …), mit einem Build-Schritt, der Zeichen für Zeichen dieselbe App
   erzeugt. Das Werkzeug dafür liegt fertig in `dev/tools/split/` (README mit Checkliste, Umstellung ≈ 1–2 h). Danach
   können mehrere Bauabschnitte parallel arbeiten. **Erledigt (23.10.2026):** die Quelle ist `myzel/src/` (182 Dateien),
   `python3 myzel/build.py myzel/src myzel/index.html` baut daraus Byte für Byte dieselbe App.
3. **Bibliothek freier Aufnahmen**, klein und kuratiert, bei Bedarf nachgeladen und offline gespeichert:
   - Feldaufnahmen für die Körner (Wald, Wasser, Wind, Vögel, Stimmen, Glas …);
   - Impulsantworten echter Räume für den Hall (Kirche, Höhle, Treppenhaus, Wald);
   - Resonanzkörper und Anregungen für die physikalischen Modelle (Holzkasten, Schale, Decke, Anschläge).
   Nur frei verwendbare Lizenzen (z. B. CC0) – das Repository ist öffentlich. Qualität vor Menge.
   *Stand 25.10.2026 (Besitzer):* noch nicht gebaut, das Projekt bleibt vorerst offen. Gewünscht sind alle vier
   Verwendungen: spielbar auf dem Feld (eigene Klangquelle), als Körnerwolke, als Atmosphäre im Hintergrund (wie der
   Bordun, mit Formen/Touché beweglich) und echte Räume für den Hall. Woher die Aufnahmen kommen, ist offen (eigene,
   CC0, Import in der App). Hinweis: aus der Claude-Umgebung sind Freesound, Archive.org und Wikimedia gesperrt – die
   Dateien müsste der Besitzer hochladen.
4. **Stimme als Instrument (Ausdruck, nicht Noten).** Der Verlauf der Stimme – Tonhöhe, Lautstärke, Helligkeit, Moment
   für Moment – steuert ein Instrument fortlaufend, z. B. die Fingerhöhe von Halm, Harz oder Sehne (ohne neuronales Netz
   möglich). Später vielleicht ein kleines neuronales Modell nach Art von DDSP („sing, und es klingt wie Harz“) – im
   Browser grenzwertig, auf iPad Pro und Desktop machbar. (Abgrenzung: „Gesang als Noten“ aus Etappe 4 macht aus Gesang
   Noten fürs Komponieren; hier geht es ums Spielen mit dem Ausdruck der Stimme.)
5. **Neue Klangerzeugung – Hörprototyp (niedrige Priorität, zuletzt).** Eine der Ideen als Hörprobe bauen, der Besitzer
   entscheidet nach dem Klang:
   - *Wachsender Klangkörper:* ein Netz aus schwingenden Röhren (Wellenleiter), das sich beim Spielen wie Pilzfäden
     verzweigt und in der Stille verkümmert – die Form des Instruments ist der Spielverlauf.
   - *Gedächtnis-Resonator:* ein Resonanzkörper, dessen Eigentöne aus dem Humus gelernt werden – das Instrument stimmt
     sich langsam auf den Spieler ein.
   - *Symbiose:* zwei Klangquellen, gekoppelt wie Räuber und Beute (Lotka-Volterra); man greift in ein Ökosystem ein.
   - *Kompost-Synthese:* ein Klang zerfällt in Teiltöne, aus den Resten wächst Neues.
   Die ersten beiden gelten als die aussichtsreichsten.

## Looper – für später (Besitzer, 25.10.2026)

- **Schleifen im Mixer:** *gebaut 25.10.2026* – Mixer-Ansicht „Schleifen“ (Pegel, Balance, Stumm, Solo, Anzeige je
  Schleife; „Alle“). Offen, falls gewünscht: Echo/Hall-Anteil und Klangregelung je Schleife (bräuchte eigene Ausgänge
  des Prozessors).
- **Rechtsklick auf eine Schleife:** *gebaut 25.10.2026* – Menü und Fenster „Ansehen und bearbeiten“ (Wellenform,
  Noten, Schichten, Schnitt auf ganze Schläge, Band, Zeit, Noten-Werkzeuge). Denkbar später: Noten einzeln verschieben
  oder löschen, Schichten gegeneinander verschieben, Ein-/Ausblenden zeichnen.

## Touché SE – neues Terrain (Brainstorming 25.10.2026, Besitzer: „merk dir alle“)

Das Touché liefert vier Richtungen (weg, heran, links, rechts; die Seiten des SE haben viel kürzeren Weg – eingemessen
wird je Richtung, die rohe, feine Seite bleibt als eigener Modus). Daraus drei Achsen: links↔rechts, weg↔heran, Druck.
Gebaut (25.10.2026): Finger, Atem, Raum, Verwandlung, dazu 1, 5, 10 (siehe `dev/HANDOFF.md`). Offen sind die übrigen.

*A. Das Touché gibt den Klang, statt ihn nur zu formen*
1. **Streichen und Anblasen** – die Tasten wählen den Ton, erst die Hand bringt ihn zum Klingen (Bogen: Druck, Tempo,
   Kontaktstelle; Atem: Luftdruck, Lippenspannung); ohne Druck still. *(gebaut)*
2. **Trommelfell** – kurz antippen ist ein Schlag, die Stärke aus der Geschwindigkeit des Drucks; vier Richtungen vier
   Klänge oder Mitte/Rand des Fells; liegen bleiben dämpft.
3. **Bebung aus der Hand** – zitternder Druck wird zum Beben von Lautstärke und Tonhöhe, wie am Clavichord, ohne LFO.

*B. Mit der Zeit spielen*
4. **Durch den Humus fahren** – die Hand fährt wie ein Tonkopf durch das eben Gespielte (seitlich Stelle und Richtung,
   Druck Lautstärke), auch als Körnerwolke an der Stelle.
5. **Schleife wie eine Platte** – weg bremst bis zum Bandstopp, heran beschleunigt, seitlich vor und zurück schieben
   wie Scratchen. *(gebaut)*
6. **Einfrieren und Malen** – Druck friert den Klang ein und verschmiert ihn; seitlich zieht man ihn in der Tonhöhe.

*C. Räume und Netze*
7. **Echter Ort im Raum** – weg = fern und verhallt (gedämpft), heran = nah und trocken, seitlich wandert er; eine
   Bewegung im Raum statt zwei Regler.
8. **Gespinst und Rhizom reizen** – Druck regt das Klangnetz an, seitlich die Kopplung.
9. **Sporenregen neigen** – das Touché als Wasserwaage für den Regen, Druck = Dichte.

*D. Neue Klangfarben*
10. **Vokalraum** – die Handposition wählt den Vokal (a–e–i–o–u), Druck öffnet den Mund. *(gebaut)*
11. **Zwischen zwei Klangquellen** – Druck blendet Ebene 2 ein, seitlich wird gemischt.
12. **Obertöne kneten** – seitlich gerade/ungerade Obertöne betonen, weg macht den Klang rauer.

*E. Aus einem Ton wird mehr*
13. **Auffächern** – Druck fächert einen Ton in verstimmte Stimmen oder Oktaven auf.
14. **Arpeggio aus der Hand** – die Handposition bestimmt Tempo und Richtung eines Arpeggios über den gehaltenen Akkord.

## Längerfristig

- **Eigenständige App mit nativer Klang-Engine.** Mischform: Oberfläche bleibt Web, die Klang-Engine wird nativ (C++,
  z. B. JUCE), ein Kern für iPad (App + AUv3, z. B. in AUM, Loopy Pro, GarageBand) und Desktop (App + VST3). Gewinn:
  Leistung, Latenz, Plugin-Formate, MIDI am iPad, Audio im Hintergrund. Erst wenn das Instrument inhaltlich steht. Ein
  bloßer App-Store-Rahmen um die Web-App bringt klanglich nichts. Die gemeinsame Worklet-Schnittstelle der Klangquellen
  erleichtert das Portieren.
- **Spielphase statt nächster Funktion:** nach dem Looper ausgiebig spielen, melden, was stört, fehlt oder nie benutzt
  wird; nachschärfen und ausmisten.
- **Guter Einstieg:** eine geführte erste Minute und Presets, die zeigen, was Myzel kann, ohne dass man etwas verstehen
  muss – die vielen Begriffe sind sonst eine Hürde.

## Fürs Ohr des Besitzers beim ersten Test

- Bandträgheit beim Tempoändern einer Schleife: schießt etwa 22 % des Schritts über – passt das?
- Gärtner „pflegt“: Soll die Bass-Schleife beim eigenen Bassspiel pausieren (so gebaut) oder nur leiser werden?
- Wie musikalisch klingen Antworten und Variationen (Etappe 3)?
- Mikrofon und Gesang: einmal mit, einmal ohne Kopfhörer probieren (nur emuliert getestet).
- Die bisher offenen Bestätigungen aus `dev/HANDOFF.md` (z. B. nur Schleifen aus Bewegung bewegen das Live-Instrument).

## Hinweise

- Datenschutz: keine Gerätemodelle, E-Mail-Adressen oder Zugangsdaten in Dateien, Kommentaren oder Commit-Nachrichten
  (öffentliches Repository). Auf GitHub „Keep my email addresses private“ einschalten, dann tragen künftige Merges eine
  anonyme Adresse.
