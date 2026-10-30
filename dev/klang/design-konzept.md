# Design-Konzept: die Seiten im Myzel-Stil (30.10.2026)

Besitzer, 30.10.2026: „Wir sollten die Effekt-Seite noch überarbeiten. Sie sieht sehr basic aus, im Vergleich zum Mixer
oder Arp ziemlich mau, was die Optik betrifft. Und das gilt auch für andere Bereiche, die wie die Effekt-Seite gestaltet
sind. Arbeite ein neues Design-Konzept für diese Bereiche aus. Achte auf Usability, Übersichtlichkeit, Design, unique,
den individuellen Charakter von Myzel. Setze ihn fort auf diese Bereiche und wo es sonst noch notwendig ist, baue ihn
aus und mach Myzel zu einem Gesamtkunstwerk.“

Code: `myzel/src/css/modul.css` (Sprache aller Seiten), `myzel/src/js/ui/modul.js` (Effekte-Seite), `buildFx` in
`js/ui/klangquellen.js`. Nur Oberfläche – kein Klang, keine Grundwerte, keine Parameter-IDs geändert.

## Grundsätze
1. **Ein Instrument, eine Sprache.** Was der Mixer, das Sporenwerk und die Klangwelten schon sprechen, sprechen jetzt
   auch die schlichten Seiten: dunkler Lehm (`--loam`, `--bark`), Licht nur dort, wo etwas wirkt (biolumineszent),
   Gruppennamen in der Display-Schrift (Major Mono Display, klein geschrieben, wie „spiel · puls · grund“ im Mixer),
   Zahlen in Martian Mono, Fließtext in Instrument Sans.
2. **Farbe heißt Herkunft.** Jeder Abschnitt trägt eine eigene Farbe (`--ac`); Regler, gewählte Chips, Schalter und
   Werte nehmen sie an. Die Rückwege haben dieselben Farben wie ihre Kanäle im Mixer (Echo `#6cc9ef`, Hall `#d6cbff`,
   Effekt `#9fe3b0`, Effekt 2 `#f2a8d8`, Summe `#f0e6d8`), die Puls-Spuren ihre Spur-Farben, Bordun sein Blau, die
   Zweite Ebene das Grün ihres Mixer-Kanals, die Aufnahme das Rot von REC, Gerät das Lumen von „Zuweisen“.
3. **Licht zeigt Wirkung.** Ein Effekt mit Anteil 0 „ruht“: gestrichelter Ring, gedämpftes Bild, Abzeichen „aus“. Je
   mehr Anteil, desto heller leuchten sein Ring, sein Rahmen und sein Knoten im Faden. Bedienbar bleibt alles.
4. **Sehen, was ein Regler tut.** Jedes Effekt-Modul hat ein kleines Bild seiner Wirkung, aus denselben Formeln wie
   der Klang (Verzerrungskurve aus `driveCurve`, Filter und Phaser als Biquad-Antwort nach Web-Audio-Spezifikation,
   Echo-Abgriffe aus `dlyTime()`, Hall aus Raum und Nachhallzeit).
5. **Ruhe für den Klang.** Kein Bild läuft pro Frame. Gezeichnet wird nur, wenn sich ein Regler des Moduls ändert und
   die Karte sichtbar ist (IntersectionObserver), höchstens einmal pro Frame gebündelt. Damit kostet die Seite im
   Akku-Modus und unter Last nichts zusätzlich. `prefers-reduced-motion`: keine Übergänge, kein Aufleuchten, Sprung
   statt Scrollen.
6. **Nichts geht verloren.** Alle Regler, IDs, Beschriftungen und `aria`-Namen bleiben; Abschnitte bleiben
   `.sec > .sec-h > h3` mit unverändertem Titeltext (Tests und MIDI-„Zuweisen“ finden sie wie bisher).

## Bausteine
- **Karte (alle Seiten).** Jeder Abschnitt (`section()`) ist eine Karte: Radius 16, Rand `rgba(hypha, .075)`, ein
  Hauch der Abschnittsfarbe von oben. Kopf: Leuchtpunkt in `--ac` + Titel in der Display-Schrift; Untertitel klein
  rechts. Klappbare Abschnitte (Gerät) und verschachtelte (Hexenring → Einstellungen) passen sich an.
- **Faden-Regler (alle Seiten, auch die Schnellleiste).** Spur als dunkle Rille, gefüllter Teil als Verlauf in
  `--ac`; der Griff eine Spore: dunkler Kern mit hellem Punkt, Ring in `--ac`, Glimmen; beim Ziehen gefüllt. Firefox
  (`::-moz-range-*`) und Chromium gleich. Höhe 32 px (Berührfläche wie bisher).
- **Modul-Karte (Effekte).** Kopf: Glyphe im Ring (glimmt mit dem Anteil) · Name · Untertitel (zweizeilig) ·
  Abzeichen (Anteil, beim Filter die Frequenz, bei Bewegung „Kreisen“, bei der Summe der Pegel). Darunter das Bild
  (62 px, dunkles Fenster wie eine Klangwelt, Beschriftung oben rechts), dann die Regler wie bisher.
- **Mini-Bilder.** Verzerrung: Welle durch den Former · Ring: Welle × Träger · Filter: Frequenzgang + Band der
  langsamen Welle · Phaser: die Kerben der sechs Allpässe, Mitte und beide Enden des Wobbelns · Schweben: Schwebung ·
  Bewegung: Vibrato/Taumeln und die Kreisbahn L–R · Echo: Abgriffe links hoch, rechts runter (Ping-Pong), Rückkopplung ·
  Hall: Abklingen in dB über die Nachhallzeit nach der Vorverzögerung, Sporen-Staub, Dämpfung verdunkelt · Effekt/Effekt
  2: je Art (Netz-Resonanzen, Wolken-Körner, Spektral-Fläche, Oktav-Treppe, Vokal-Formanten, Harmonizer-Stimmen) ·
  Summe: Klangregelung (zwei Kuhschwänze) und Verdichtungs-Knie.
- **Faden (Signalweg).** Oben auf der Seite: die sechs Glieder in Reihe (Verzerrung → Ring → Filter → Phaser →
  Schweben → Kreisen) als Knoten auf einer Hyphe, darunter die parallele Kapsel (Echo, Hall, Effekt, Effekt 2) mit
  Send-Faden und Rückweg in die Summe. Knoten glimmen mit dem Anteil, ruhende sind gestrichelt; der Knoten der Karte im
  Blick ist umringt. Tippen springt zur Karte (sie leuchtet kurz auf, der Fokus geht auf ihren ersten Regler).
  Ist der Faden weggescrollt, hält sich oben eine kleine Leiste mit allen elf Knoten und dem Namen der aktuellen Karte.
- **Gruppen-Zeilen.** Zwischen den Karten wie im Mixer: „färbung – in reihe“, „räume – parallel“, „ausgang“.
- **Seitenkopf.** Unter dem Titel eine feine Linie mit einem Sporen-Schimmer.

## Welche Seite bekommt was
| Seite | Änderung |
|---|---|
| Effekte | Faden, Modul-Karten mit Bildern und Abzeichen, Gruppen; Reihenfolge = Signalweg (Bewegung/„Kreisen“ steht jetzt nach Schweben, vor den Räumen) |
| Klang | Karten; Klangquelle und Klangfarben-Abschnitt in Spore, Glyphe der Quelle in der Farbe; Zweite Ebene in ihrer Mixer-Farbe |
| Puls | Karten; „Spuren“ nimmt die Farbe der gewählten Spur an (Regler, Chips), der Spur-Kopf reicht bis an den Kartenrand; Bordun blau |
| Aufnahme | Karten; Hexenring in seiner Mixer-Farbe, Aufnahme in REC-Rot |
| Gerät | Karten, klappbare Abschnitte als flache Karten, Lumen |
| Presets, Sporenwerk | Karten und Regler wie überall; Klangwelten-Bilder und das lebende Bild des Sporenwerks bleiben |
| Mixer, Ringleiste | unverändert (eigene Sprache, Vorbild); nur die gemeinsamen Regler im Detail-Blatt und die Schnellleiste haben den neuen Griff |

## Bildschirmfotos (vorher/nachher)
Scratchpad `design/before/` und `design/after/`: `<Seite>-1920x1080.png`, `<Seite>-1366x1024.png`, gescrollt
`-s2…-s7` (Seiten: Effekte, Klang, Puls, Mixer, Sporenwerk, Aufnahme, Presets, Gerät). Skript `design/shot.js`.

## Offen / möglich später
- Klang-Seite: ein Bild je Klangquelle (Hüllkurve, Spektrum) wie bei den Effekten.
- Effekte: Karten einklappen (bewusst nicht: Tests und „Zuweisen“ brauchen sichtbare Regler; der Faden ersetzt das
  Suchen).
