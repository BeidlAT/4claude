# Myzel – Ideen und Pläne für nach dem Looper

Gesammelt aus den Gesprächen mit dem Besitzer (Oktober 2026). Reihenfolge = vereinbarte Priorität. Diese Datei ist das
Gedächtnis dafür; jede neue Sitzung liest sie zusammen mit `dev/HANDOFF.md`.

## Vereinbarte Reihenfolge

1. **Looper (Hexenring) fertig bauen, alle Testzeilen grün, veröffentlichen.** Erst wenn alles fertig ist; der Besitzer
   testet dann selbst in der App (iPad Pro, Android-Handy, Desktop-PC).
2. **Module.** `myzel/index.html` in Module aufteilen (HTML-Gerüst, CSS, JavaScript-Module je Bereich: Klangquellen,
   DSP, Mischpult, Gestik, MIDI, Puls, Hexenring …), mit einem Build-Schritt, der Zeichen für Zeichen dieselbe App
   erzeugt. Das Werkzeug dafür liegt fertig in `dev/tools/split/` (README mit Checkliste, Umstellung ≈ 1–2 h). Danach
   können mehrere Bauabschnitte parallel arbeiten.
3. **Bibliothek freier Aufnahmen**, klein und kuratiert, bei Bedarf nachgeladen und offline gespeichert:
   - Feldaufnahmen für die Körner (Wald, Wasser, Wind, Vögel, Stimmen, Glas …);
   - Impulsantworten echter Räume für den Hall (Kirche, Höhle, Treppenhaus, Wald);
   - Resonanzkörper und Anregungen für die physikalischen Modelle (Holzkasten, Schale, Decke, Anschläge).
   Nur frei verwendbare Lizenzen (z. B. CC0) – das Repository ist öffentlich. Qualität vor Menge.
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
