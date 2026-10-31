# Routing je Kanal durch einzelne Effekte – Recherche, Brainstorming, Vorschlag (31.10.2026)

Besitzer: „Eine Schleife geht nur durch einen Effekt, wenn man das möchte. Das soll unten (Leiste KETTE/DIREKT im Pult)
alles zum Setzen sein – ohne dass es umständlich/ungenau wird wegen wenig Platz. Sieh dir Branchenlösungen an, dann
brainstorme, wie Myzel ein herausragendes Ergebnis bekommt, das sich abhebt.“
Vorher (bestätigt): Schleifen bekommen im Pult KETTE/DIREKT wie jede Spur; nach einer Aufnahme mit Effekten stellt Myzel
die Schleife von selbst auf Direkt; auf Kette läuft ihr Klang, wie er ist, noch einmal durch die Kette. Das „K“ entfällt.

## Heute
Eine gemeinsame, serielle Kette: Verzerrung (V) → Ring (R) → Filter (F) → Phaser (P) → Schweben (S) (→ Auto-Pan), danach
die Sends Echo, Hall und der Rückweg Wandel. Je Kanal nur zwei Wege: KETTE (alles) oder DIREKT (nichts) – zwei Punktreihen
unten im Pult, rechts auf der Kettenschiene die Perlen V R F P S.

## Wie es andere lösen (Kurzfassung der Recherche)
| Muster | Beispiele | gut | schwach |
|---|---|---|---|
| Send-Regler je Kanal | Ableton, Bitwig, Logic, AUM, Digitakt, OP-Z | stufenlos, bekannt | braucht Höhe; nur für parallele Effekte (Hall, Echo), nicht für Farb-Effekte in Reihe |
| Inserts je Kanal | MPC, Octatrack, Tonverk, RC-505, Loopy Pro | Reihenfolge je Kanal | eine Effekt-Instanz pro Kanal; viele Kanäle = viel Klickarbeit |
| Busse mit eigenen Effekten | SP-404 (Bus 1/2/Dry), Tonverk, Loopy Pro | wenige benannte Wege, schnell | jede neue Kombination braucht einen neuen Bus |
| Matrix-Gitter | Reaper, AUM, RME TotalMix | ein Klick je Kreuzungspunkt, Überblick | unbeschriftetes Kästchenmeer, eigenes Fenster, auf Touch winzig |
| Kabel | Reason, VCV, Max, FL-Pfeile | anschaulich | Kabelsalat, ungenau auf Touch |
| Effekt-Schalter | Bitwig (Send per Klick an/aus), Reason (nummerierte Send-Tasten) | binär, schnell, kompakt | keine Menge ohne zweite Geste |
| Ketten-Wähler | Ableton Chain Selector | ein Wert, automatisierbar | abstrakt |

Herausragende Einzelideen: **OP-Z** – Effekt wählen, dann zeigt die Tastenreihe alle Spuren für diesen Effekt
(effekt-zentrierte Sicht); **Studio One Fader-Flip** und **RME** – nur Beteiligtes zeigen, Rest abdunkeln; **FL Studio**
„nur zu diesem“; **Line 6 Helix** – Topologie durch eine Geste; **Elektron** – Routing im Takt sequenzieren;
**Loopy Pro** – Nutzer bauen „Schleife nur durch Effekt X“ mühsam über Busse nach und wünschen sich ein sichtbares
Schaltbild (offene Lücke dort).

## Brainstorming für Myzel
1. **Fünf Perlen je Kanal** in der Kette-Reihe (V R F P S klein in der Spalte). Lesbar, aber auf 12-px-Punkten am iPad
   fummelig. → nur als *Anzeige*, nicht als Hauptbedienung.
2. **Effekt-Blick (OP-Z/Fader-Flip):** die Perlen V R F P S rechts auf der Kettenschiene werden zu Wählern. Eine Perle
   antippen → die Kette-Reihe zeigt für jeden Kanal nur noch „geht durch diesen Effekt? ja/nein“, unbeteiligte Kanäle
   dunkeln ab. Ein Klick je Kanal schaltet, Ziehen über mehrere Kanäle malt an/aus. Große Treffer (ein Punkt pro Kanal wie
   heute) – genau, auch am iPad.
3. **Ring-Punkt als Überblick:** ohne gewählten Effekt zeigt jeder Kanal-Punkt einen Ring aus fünf Segmenten (V R F P S),
   leuchtend, was er durchläuft. Ganz voll = KETTE, leer = DIREKT. Man sieht das ganze Routing auf einen Blick.
4. **Myzel-Fäden:** die Hyphe eines Kanals führt sichtbar nur zu den Perlen, durch die er läuft (heute ein Kabel zur
   Kette) – das Schaltbild, das Loopy-Pro-Nutzer vermissen, ist bei Myzel die Leiste selbst.
5. **Abkürzungen:** Alt-Klick auf eine Perle im Effekt-Blick = „nur dieser Kanal“ (FL); Doppelklick auf den Kanal-Punkt =
   volle Kette; DIREKT-Punkt = keine. Tastatur: Kanal gewählt, Taste V/R/F/P/S schaltet den Effekt (die Buchstaben der
   Perlen).
6. **Halten statt Schalten (Looper-Spiel):** Perle gedrückt halten = Effekt für diesen Kanal nur so lange (wie die
   Spuren-Effekte am RC-505, momentan statt rastend). Live ein Loop kurz durch den Ring schicken.
7. **Routing in den Mixer-Szenen A/B:** jede Szene merkt sich die Masken; der A/B-Morph (und Touché „Verwandlung“) blendet
   Wege weich über – ein Effekt wächst in einen Kanal hinein statt hart umzuschalten. Das kann keines der Referenzprodukte.
8. **Menge je Kanal (später):** ein leuchtender Punkt senkrecht ziehen = wie viel dieser Kanal durch den Effekt geht
   (Bitwig: an/aus getrennt von Menge). Zuerst nicht – die Leiste bleibt ruhig.
9. **Schleifen:** nach Aufnahme mit Effekten → Direkt (wie besprochen); die Ernte nimmt die Maske mit; Hexenring-Kanal
   setzt alle Schleifen auf einmal (wie heute).

## Vorschlag
Kombination aus 2 + 3 + 4 + 5, später 6 und 7:
- **Überblick:** Ring-Punkt je Kanal (fünf Segmente) + Fäden zu den Perlen.
- **Bearbeiten:** Perle auf der Kettenschiene antippen = Effekt-Blick; Kanäle klicken oder überstreichen. Esc/erneuter
  Klick verlässt ihn. Alt-Klick = nur dieser. Kein neues Fenster, kein zusätzlicher Platz.
- **Abwärtskompatibel:** KETTE = alle fünf, DIREKT = keiner; alte Presets und Mixer-Stände bleiben, wie sie sind.

## Technik (machbar)
- Die Kette ist seriell und gemeinsam. Kanäle mit verschiedenen Masken brauchen eigene Wege: **eine Kettenkopie je
  Maske, die gerade benutzt wird** (automatisch gebaut und abgebaut, „virtueller Bus“). Alle Kopien folgen denselben
  Reglern – der Hexenring nutzt so eine Kopie heute schon (`hxChain`). In einer Kopie sind die abgewählten Stufen
  überbrückt (ihr Trocken-Anteil 1, nass 0).
- Umschalten gleitet (≈ 20 ms Überblendung), damit nichts knackt.
- Schleifen: der Ring-Prozessor hat heute zwei Ausgänge (direkt, Kette). Für Masken je Schleife bekommt er einen Ausgang
  je benutzter Maske (Schleifen mit gleicher Maske teilen ihn) – der größte Umbau-Teil.
- Kosten: eine Kopie kostet so viel wie die Kette (Einheiten werden ehrlich gemessen und eingetragen; nach der Regel des
  Besitzers kein Grund, etwas wegzulassen).

## Reihenfolge
1. Schleifen: KETTE/DIREKT im Pult je Schleife, „K“ weg, nach Aufnahme mit Effekten automatisch Direkt.
2. Masken je Kanal (Ring-Punkt, Effekt-Blick, Fäden, Abkürzungen) – zuerst Live-Kanäle, dann Schleifen.
3. Halten statt Schalten, Routing in den Szenen A/B.

Quellen u. a.: Ableton Chain Selector https://help.ableton.com/hc/en-us/articles/360000727359 · Bitwig Mix View
https://bitwig.com/userguide/latest/the_mix_view · Reaper Routing Matrix https://www.cockos.com/wiki/index.php/Routing_Matrix ·
FL Studio Mixer https://www.image-line.com/fl-studio-learning/fl-studio-online-manual/html/mixer_mixermenu.htm · SP-404MKII
https://static.roland.com/manuals/sp-404mk2_reference_v550/en-US/7954343578531723.html · OP-Z https://teenage.engineering/guides/op-z/tracks
· Line 6 Helix https://manuals.line6.com/en/helix-stadium/live/signal-path-routing · RME TotalMix
https://docs.rme-audio.de/aoxd/810-1c_totalmix_user_interface/ · Loopy Pro Forum https://forum.loopypro.com/discussion/64037
