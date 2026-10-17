# Myzel – zwölf neue Klangquellen: das Konzept

Stand 2026-10-17. Für den Besitzer. Grundlage: die Recherche (`research/`), 59 Kandidaten aus sechs Blickwinkeln (`ideas/`), 59 gegnerische Prüfungen mit Simulationen und Messungen (`ideas/check/`), drei unabhängige Jurys (`ideas/judge-1..3.md`) und der Entwurf der Bibliotheks-Oberfläche (`ideas/ui-final.md`). Kennzeichnung: **(V)** = in Quelle, Code oder Messung belegt, **(A)** = Annahme oder Entwurfsentscheidung.

## 1. Das Set in einem Blick

| # | Name | Familie | Spielweise | Was es ist | Kosten (1 = eine Nebel-Stimme) |
|---|---|---|---|---|---|
| 1 | **Harz** | Holz | hält | gestrichenes Glas, Schale, Stab, Holzzunge, Wasserstäbe – der Finger ist der Bogen | 1,05 |
| 2 | **Halm** | Luft | hält | Rohrblatt (und Flöte, Flamme) – der Atem ist die Fingerhöhe | 0,45 |
| 3 | **Glut** | Erde | hält | gestimmte Rückkopplung, die unter dem Finger zündet und nachglüht | 0,45 |
| 4 | **Böe** | Luft | hält | Äolsharfe – Saiten rasten im Wind ein, Akkorde bleiben hängen | 0,7 |
| 5 | **Amöbe** | Dunst | hält | Bass aus Zufall nach Xenakis – jede Welle anders, der Ton bleibt | 0,35 |
| 6 | **Ranke** | Holz | beides | ein Ring aus Massen und Federn, den der Finger anstößt | 0,4 |
| 7 | **Sehne** | Holz | beides | lebende Saite: Gleiten, Handkante, Flageolett, E-Bow, Jawari-Steg | 0,6 |
| 8 | **Zapfen** | Holz | beides | ein Stab über Schuppen – vom Ticken zum Schnarren bis zum Ton | 0,45 |
| 9 | **Elmsfeuer** | Luft | beides | Netzbrummen, Knistern, Lichtbogen – der Zap im Puls | 0,7 |
| 10 | **Moder** | Erde | schlägt | Kompostglocke – Glanz zerfällt zu Knistern, der Grundton schwillt an | 0,55 |
| 11 | **Gespinst** | Erz | schlägt | ein Netz aus Saiten, das Finger, zweite Ebene und Puls teilen | 0,4 + Netz 1,65 |
| 12 | **Jahresring** | Holz | schlägt | Holzstab – wo du triffst, bestimmt den Klang; ein Jahr in vier Minuten | 0,65 |
| R1 | Kehlchen | Luft | hält | Vogelkehle – zwei Lippen, die ab einer Schwelle singen | 0,4 |
| R2 | Rhizom | Erde | schlägt | ein Schlag läuft als Lawine durch die Tonstufen | 0,3–0,65 |

Mit den 14 bestehenden Quellen sind es 26, mit den Reserven 28.

### Warum genau diese zwölf

Drei Jurys haben unabhängig gewertet (Klangdesign, Produkt, DSP-Leitung). Die Regel war einfach:

- **Sieben Quellen stehen in allen drei Sets:** Harz, Halm, Böe, Amöbe, Ranke, Sehne, Moder. Sie sind gesetzt.
- **Fünf stehen in zwei von drei Sets:** Gespinst, Glut, Zapfen, Elmsfeuer, Kehlchen. Damit wären es zwölf.
- **Eine Korrektur für die Balance:** Diese zwölf wären zehn gehaltene und zwei geschlagene Quellen. Myzel hat heute sieben gehaltene und sieben geschlagene; der Auftrag will etwa 7 : 5. Kehlchen ist von den fünf die Quelle mit den meisten offenen Baustellen laut Prüfung (die Tonhöhe weicht je nach Druck um bis zu zwei Halbtöne ab und braucht einen Nachregler; gehalten ist es ohne eingebauten Silben-Generator ein Theremin). Jahresring ist das Gegenteil: nativ gebaut, kein numerisches Risiko, die fehlende Holz-Familie, und die erste geschlagene Quelle in Myzel, bei der die Fingerhöhe den **Anschlagort** wählt (V: die Knotenlinie des Stabs ist nachgerechnet). Also: Jahresring hinein, Kehlchen als erste Reserve. Ergebnis: sechs gehaltene, drei beides, drei geschlagene.
- **Reserve 2 ist Rhizom:** in einer Jury im Set, in den beiden anderen Reserve; als Puls- und Regen-Instrument stark, gehalten passiert nichts.

Was die zwölf gemeinsam neu bringen, fehlt den 14 bestehenden komplett (V `research/synthesis.md` §0): **Reibung** (Harz), **selbstschwingende Luft** (Halm), **Rückkopplung als Instrument** (Glut), **Einrasten und Gedächtnis** (Böe), **stochastische Wellenform mit fester Tonhöhe** (Amöbe), **Massen-Feder-Physik unter der Hand** (Ranke), **eine lebende Saite** (Sehne), **Rhythmus, der zum Ton wird** (Zapfen), **Elektrizität** (Elmsfeuer), **Perkussion mit umgekehrter Hüllkurve** (Moder), **Töne, die einander hören** (Gespinst), **Anschlagort und verstreichende Spielzeit** (Jahresring). Keine der zwölf doppelt eine bestehende Quelle; keine doppelt eine andere der zwölf.

Vier Quellen tragen mehrere Ideen in einem Listeneintrag: Harz hat fünf Körper (darunter das Daxophon als „Zunge“ und das Waterphone als „Teich“), Halm drei Rohre, Zapfen fünf Körper (darunter „Fels“, das knarrende Gestein), Moder drei Körper. So decken zwölf Einträge rund zwanzig Ideen ab.

---

## 2. Die zwölf Quellen

Zu jeder Quelle: was man hört, was Finger, Höhe, Puls und Gestik tun, warum es das so noch nicht gibt, die Regler. „Höhe“ ist immer die Fingerhöhe auf dem Feld; „Neigen“ ist die Gestik, die der Höhe einen Versatz gibt.

### 2.1 Harz · Holz · hält
**Gestrichenes Glas, Schale, Stab – Druck ist Höhe.**

Man hört zuerst fast nichts: ein Hauch von Reibung, ein Kratzen am Rand. Dann fängt der Ton, wie bei einem nassen Finger auf dem Glasrand – ein reiner, leicht schwebender Ton, der in einer halben Sekunde anschwillt und dann steht, solange der Finger bleibt. Je höher der Finger, desto mehr Druck: Der Ton wird körniger, die Reibung hörbar, bis ganz oben Kratzen und Schlupf den Ton zerreißen. Loslassen hebt den Bogen ab; die Moden klingen nach (Glas kurz, Schale lang).

Fünf Körper: **Glas** (Weinglas, Teiltöne 1 · 2,32 · 4,25 · 6,63, V), **Schale** (tibetische Schale mit Dubletten, die schweben, V), **Stab** (gestrichener Metallstab, V), **Zunge** (Hans Reichels Daxophon: ein einseitig eingespannter Holzbalken mit zwei festen Formanten, der knurrt und spricht; Modenverhältnisse 1 : 6,27 : 17,55, A) und **Teich** (Waterphone-Stäbe, lange Nachklänge, A). Die Prüfung hat gemessen: nirgends gibt es eine Touch-App mit Reibungs-Glas oder -Schale (V `ideas/check/inventor-hrz.json`); das Daxophon existiert in keinem Synth, keiner App, nicht einmal als Sample-Library (V).

- **Finger:** Aufsetzen = Bogen setzt an (mit kurzem Zupfimpuls, damit die Moden sofort sprechen). Spaltenwechsel = Glissando auf der Schale.
- **Höhe:** Bogendruck – unten flautando, Mitte Sweet Spot, oben rau. **Anschlag:** Bogengeschwindigkeit.
- **Puls:** jeder Schlag ein Strich; unter 300 ms Gate ein Zupf mit Strich, die Moden klingen nach.
- **Gestik:** Vorneigen = mehr Druck (Kante zum Kratzen), Bebung = Vibrato auf gestrichenem Glas.
- **Regler (6):** Körper (Glas/Schale/Stab/Zunge/Teich), Druck, Bogen, Dämpfung, Schwebung, Harz (die hörbare Reibung).

Ehrlich: Die Simulation zeigt, dass der Druck allein die Obertöne kaum ändert (V). Die Rauheit kommt deshalb aus der Reibkraft selbst, die mit „Harz“ in den Ausgang gemischt wird – das ist messbar und klingt nach Bogen.

### 2.2 Halm · Luft · hält
**Rohrblatt, Flöte, Flamme – der Atem ist die Höhe.**

Finger unten: nur Luft, ein gefiltertes Zischen durch ein Rohr. Ab etwa einem Viertel der Höhe springt der Ton an, hölzern und hohl wie eine Klarinette im tiefen Register, mit ungeraden Obertönen. Mehr Höhe = mehr Atem: lauter, heller, kantiger. Ganz oben wird das Blatt gequetscht – der Ton würgt, kippt, kommt wieder. Loslassen: ein knackiges Ende in wenigen Millisekunden, kein Nachklang. Ein Zungenstoß beim Aufsetzen.

Das Rohrblatt-Modell (V STK-Klarinette) hat die Prüfung auf Anhieb bestanden: Schwelle messbar, Stimmung auf 1 Cent, Einschwingen 45–235 ms, Ausklingen 5–55 ms (V `inventor-hlm.json`). Die **Flöte** (physikalisches Überblasen in die Oktave) und die **Flamme** (Rijke-Rohr, ein Ton aus Hitze) sind zwei weitere Rohre im selben Eintrag; beide sind riskanter und werden nur freigeschaltet, wenn sie die Abnahme bestehen. Blasinstrumente gibt es in Desktop-Synths (SWAM, Respiro) – aber keine Touch-App, in der die Fingerhöhe der Atem mit Schwelle und Register ist (V).

- **Finger:** Aufsetzen = Zungenstoß; Gleiten = Glissando im Rohr.
- **Höhe:** Atemdruck (Luft → Ton → Würgen). **Anschlag:** Zungenhärte.
- **Puls:** Zungenstöße; der Atem startet im Sweet Spot, kurze Gates bekommen einen Klick.
- **Gestik:** Vorneigen = mehr Atem (mit Ocarina-Vibrato), Bebung = Atemvibrato.
- **Regler (6):** Rohr (Rohrblatt/Flöte/Flamme), Atem, Mund, Blatt, Luft, Zunge.

### 2.3 Glut · Erde · hält
**Gestimmte Rückkopplung, die nachglüht.**

Finger unten: ein leises Klopfen in einer Schleife, ein gedämpfter Ping auf der Note. Ab etwa einem Drittel der Höhe kippt die Schleife: Der Ton beginnt von selbst zu wachsen, erst ein Pfeifen, dann ein satter, leicht gesättigter Ton, der sich einpendelt. Weiter oben springt er in den zweiten oder dritten Modus (Oktave, Duodezime) – wie eine Gitarre vor dem Verstärker, die ihren Oberton findet. Loslassen stoppt nichts: Der Ton verglüht über Sekunden („Nachglühen“). Darunter liegt ein langsames Glimmen – die Verstärkung wandert von selbst, der Ton atmet.

Rückkopplung als Spielpraxis (Halldorophone, No-Input-Mixing, Feedback-Gitarre) ist bekannt; Plasmonic hat eine selbstschwingende Waveguide auf dem Desktop (V). Keine App setzt je Finger eine gestimmte Schleife, deren Verstärkung unter dem Finger liegt (V `inventor-glt.json`). Die Prüfung verlangt: Wachstum pro Sekunde definieren (sonst dauert das Zünden bei 55 Hz sechzehnmal länger als bei 880 Hz), ein Glimmen-Zufallswandern, und im Puls den Schleifenzustand direkt setzen – alles eingeplant.

- **Finger:** Aufsetzen = Klopfer in die Schleife. Liegen lassen und warten ist die Spielweise.
- **Höhe:** Schleifenverstärkung und Modus. **Anschlag:** Klopfstärke.
- **Puls:** jeder Stoß zündet sofort (Zustand wird gesetzt), dann Nachglühen – lange Gates = schwellende Glutakkorde.
- **Gestik:** Vorneigen = aufflammen, Zurückneigen = verglühen; Bebung = Vibrato auf Feedback.
- **Regler (6):** Glühen, Nachglühen, Zunder, Hitze, Sprung (2 oder 3), Kasten.

### 2.4 Böe · Luft · hält
**Äolsharfe – Saiten rasten im Wind ein und hängen nach.**

Ein Rauschen wie Wind an einer Kante, und darin ein Ton, der nicht angeschlagen, sondern **gefangen** wird: Trifft die Wirbelfrequenz des Windes eine Saite, rastet diese ein und singt – lange, mit vier bis sechs Sekunden Nachklang. Die Fingerhöhe ist die Windstärke: Mehr Wind = höhere Wirbel = die nächste Saite (der nächste Oberton) fängt. Zwischen zwei Obertönen liegt eine Totzone: Der Wind streift, nichts fängt – aber die vorher gefangenen Saiten klingen noch. So entstehen Akkorde aus Erinnerung: Man fährt mit dem Finger durch die Obertöne und hinterlässt einen Geisterakkord aus Quinte, Oktave, Terz, der minutenlang nachhängt und von selbst umspringt, wenn Böen kommen.

Das Lock-in-Modell ist in der Forschung veröffentlicht (Selfridge et al. 2017, V), als spielbares Touch-Instrument gibt es es nicht (V `inventor-boe.json`). Die Prüfung hat zwei Fehler im Entwurf gefunden und gelöst: Die Erregung muss eine Saite fangen (nicht ein Band von Nachbarn verschmieren), und im Puls braucht die Böe einen eigenen „Böen-Zupf“ (zehnfache Erregung im Gate), sonst wird sie zum Hauch-Wusch.

- **Finger:** Aufsetzen = Böe beginnt; liegen lassen.
- **Höhe:** Windstärke – welche Saite fängt. **Anschlag:** Anfangsböe.
- **Puls:** Böen-Zupf: ein Windstoß, der Saiten über das Gate hinaus klingen lässt.
- **Gestik:** Vorneigen = Sturm (höhere Obertöne), Bebung auf alle Saiten.
- **Regler (6):** Wind, Böen, Nachklang, Rauschen, Fang, Dunkel.

### 2.5 Amöbe · Dunst · hält
**Bass aus Zufall – jede Welle anders, der Ton bleibt.**

Ein sägender, lebendiger Summton in der Basslage. Die Wellenform ist ein Polygon aus zwölf Punkten, das in jeder Periode seine Gestalt ändert (Xenakis’ GENDY, V), aber die Periode selbst bleibt – also steht die Tonhöhe, während die Obertöne wie unter einer Lupe zittern. Finger unten: fast ruhig, ein fremder Orgelton. Mitte: die Obertöne wandern, Ausreißer knistern. Oben: die Wellenform tobt, der Ton wird zu rauem Rauschen mit Tonhöhe. Nach jedem Ausbruch kehrt die Form zu ihrem Ausgangspolygon zurück („Rückkehr“) – Schütteln erzeugt Ausbrüche, die heilen.

GENDY ist quelloffen und als freies Plugin erhältlich (Xenos, V); ein Touch-GENDY gab es 2009 auf dem iPhone (V `composer-amo.json`). Neu ist die Kombination: Tonhöhe fest unter dem Finger, Höhe = Unruhe, heilende Ausbrüche, jeder Puls-Stoß anders gesät. Die Prüfung sagt klar: Das lebt von 50 bis 500 Hz; darüber hat ein Polygon zu wenige Abtastpunkte je Segment. Deshalb ist die Amöbe als Bass deklariert (Presets setzen die Oktave tiefer) und begrenzt die Punktezahl automatisch nach Tonhöhe.

- **Finger:** Aufsetzen sät das Polygon (harter Anschlag = extremere Form).
- **Höhe:** Unruhe (Schrittweite der Zufallswanderung). **Anschlag:** Startform.
- **Puls:** ein kurzes Zucken (30–40 ms wilder Lauf), jeder Stoß neu gesät.
- **Gestik:** Schütteln = Ausbruch, der heilt; Vorneigen = unruhiger.
- **Regler (6):** Punkte, Zeit, Verteilung (linear/Cauchy/logistisch/Sinus), Rückkehr, Einschwingen, Ausklingen.

### 2.6 Ranke · Holz · beides
**Ein Ring aus Massen, den der Finger anstößt.**

Scanned Synthesis (Verplank, Mathews, Shaw 2000, V): 48 Massen hängen an Federn in einem Ring. Der Finger ist ein Hammer – er stößt eine Beule hinein. Die Beule läuft, zerfließt, prallt, und die Form des Rings wird in jeder Periode einmal als Wellenform abgetastet. Was man hört: einen Ton, der nach keinem Oszillator klingt, holzig-elektrisch, dessen Obertöne **zusammenhängend atmen** – jede Ringmode ein Oberton, jede mit ihrer eigenen langsamen Rate. Ein harter, schmaler Hammer gibt einen scharfen, pulsartigen Zyklus, der in 50–300 ms zu einem runderen Ton zerfließt; ein breiter, weicher Hammer einen dumpfen „Boing“. Gehalten hält ein leiser Zufallsdruck den Ring in Bewegung; die Form ändert sich über 3–10 s von selbst.

Es gibt Scanned Synthesis in Csound, als Eurorack-Modul (Qu-Bit Scanned) und als Desktop-Plugin (Nettle, Enzyme); im Browser und auf dem Handy nicht (V `inventor-rnk.json`). Die Erfinder haben es ausdrücklich als haptisches Instrument gedacht („pushing or hitting different masses“, V ICMC 2000). Die Prüfung hat einen Physikfehler korrigiert: Auf einem perfekt gleichmäßigen Ring wäre die Hammerposition unhörbar; deshalb wird eine Masse festgeklemmt (stehende Wellen) und die Höhe steuert Hammerbreite und Dämpfung statt der Position.

- **Finger:** Aufsetzen = Hammerschlag; Halten = Streicheln (leiser Dauerdruck).
- **Höhe:** Hammerbreite und Dämpfung (unten breit und weich, oben schmal und hell). **Anschlag:** Hammerstärke.
- **Puls:** Hammerkaskaden; für kurze Gates läuft die Physik dreimal schneller, damit das Zerfließen im Gate hörbar ist.
- **Gestik:** Schütteln = Zusatzhämmer, Bebung = Abtastrate.
- **Regler (6):** Masse, Feder, Mitte, Dämpfung, Hammer, Holz (Unregelmäßigkeit der Massen).

### 2.7 Sehne · Holz · beides
**Lebende Saite – Handkante, Flageolett, E-Bow, Steg.**

Myzels Saite ist eine fertig gerechnete Aufnahme eines Zupfs: Spaltenwechsel = neuer Anschlag, keine lebende Dämpfung (V code-map). Sehne ist die Saite, die **unter dem Finger** lebt: Zupf beim Aufsetzen, dann echtes Gleiten mit dem Glanz einer steifen Saite (kein Neuanschlag), die Hand als Höhe. Unten: Handballen dämpft – aus Klingen wird ein Thud. Mitte: die offene Saite. Bei etwa drei Vierteln: eine leichte Berührung am Knoten – der Grundton stirbt, Oktave oder Quinte singt (Flageolett, physikalisch an einer Fingerjunction, nicht per Filter). Ganz oben: ein E-Bow legt Energie nach – die sterbende Saite schwillt wieder an und hält endlos, mit einem leisen Quietschen an der Kante. Der Steg ist wählbar: **flach** oder **Jawari** (der gekrümmte Steg der Tanpura: der Zupf blüht nach oben in ein Sirren auf).

Eine lebende Waveguide-Saite ist in Tension, Sculpture, Rings und GeoShred Standard (V `engineer-shn.json`) – Sehne macht keine Wellen als Saite, sondern weil Myzel keine lebende Saite hat und weil Hand, Flageolett, E-Bow und Jawari auf **einer** Fingerachse liegen. Die Bibliothek stellt es so dar: Sehne = lebendig, Saite = viele Stimmen (0,35).

- **Finger:** Zupf; Gleiten = Glissando; Loslassen = Hand dämpft.
- **Höhe:** die Hand (Ballen → offen → Flageolett → E-Bow). **Anschlag:** Zupfhärte.
- **Puls:** Zupf mit Handdämpfung nach dem Gate – kurze Gates sind ein Palm-Mute-Riff.
- **Gestik:** Bebung = Fingervibrato; Vorneigen = Hand nach oben (zum Flageolett, E-Bow).
- **Regler (6):** Dämpfung, Steifheit, Zupfort, Hand, E-Bow, Steg (flach/Jawari).

### 2.8 Zapfen · Holz · beides
**Kratzen, das zum Ton wird – Rhythmus unter dem Finger.**

Ein Stab über die Schuppen eines Kiefernzapfens. Finger unten: einzelne Ticks, drei bis zehn in der Sekunde, jeder ein kleines Holzklopfen mit gestimmtem Nachklang. Höher: das Ticken verdichtet sich zum Schnarren (Güiro), noch höher rastet die Rate auf Teiler der Note ein („Rast“: f/8, f/4, f/2) – und ganz oben ist die Kratzrate die Note selbst: ein roher, sägender Ton mit Holzformant. Die Schuppen sind unregelmäßig (±2–5 %), deshalb bleibt es oben ein Kratzen und wird kein billiger Pulszug. Fünf Körper: Zapfen, Holz, Panzer (Chitin), Kürbis, **Fels** (das knarrende Gestein: Stick-Slip mit Hysterese, vom Knarren zum Ton).

Güiro-Modelle (STK/Csound), das Rhythmus-zu-Ton-Kontinuum der Pulsar-Synthese und Kratz-Forschung existieren; kein Touch-Instrument legt die Kratzrate auf die Fingerhöhe mit Rastleiter und gestimmtem Körper (V `inventor-zpf.json`). Wichtig aus der Prüfung: Bebung muss die Rate bewegen, nicht den Körper, sobald die Rate zur Tonhöhe geworden ist – so gebaut.

- **Finger:** Aufsetzen = Stab setzt an; Fingergeschwindigkeit addiert Kratzen.
- **Höhe:** Kratzrate (Ticken → Schnarren → Rast → Ton). **Anschlag:** Kraft (Impulshärte, Rauschen).
- **Puls:** ein Strich – beschleunigen, auslaufen (sin²-Kurve); 30–60-ms-Gates werden ein Fünf-Tick-Blip.
- **Gestik:** Vorneigen = schneller; Ladung kann die Rate verdichten.
- **Regler (6):** Körper, Schuppen, Rast, Klang, Strich, Kratzen.

### 2.9 Elmsfeuer · Luft · beides
**Brummen, Knistern, Lichtbogen – der Zap im Puls.**

Unten ein hartes Netzbrummen, in die Bassoktave gefaltet, mit dünnem Sirren, leicht instabil. Steigt der Finger, setzt Korona-Knistern ein: vereinzelte scharfe Ticks, die zum Brutzeln dicht werden. Weiter oben zünden Lichtbögen: ein kreischender Ton ein bis zwei Oktaven über der Note, der stottert, in Quinten und Oktaven springt (in der Tonart), abreißt, wieder zündet – ganz oben steht der Bogen durch. Das Knistern **steuert** den Bogen (ohne Knistern kein Bogen), die Sprünge sind selten (unter drei pro Sekunde), das Brummen bleibt darunter – das trennt es vom Laser-Klischee. Loslassen: das Brummen fällt mit einem Klick weg, letzte Knisterer. Im Puls: ein Zap – Bogenzündung mit Knisterschweif, bei jedem Tempo.

Ein Lichtbogen als physikalisches Modell ist drei Wochen alt (Nikolator, V); ein Hardware-Plasma gibt es (Gamechanger Plasma Voice). Niemand bietet Brummen → Korona → Bogen als eine Fingerachse (V `designer-elm.json`). Vollständig mit Standard-Bausteinen gebaut – kein Worklet nötig.

- **Finger:** Aufsetzen = Zündstoß. Eine Spalte, zwei Register (unten Bass-Drone, oben Lead).
- **Höhe:** Spannung (Knisterdichte, Bogen). **Anschlag:** Pegel und Zündstoß.
- **Puls:** Zaps; jeder Stoß mit anderem Sprungmuster.
- **Gestik:** Vorneigen = Spannung hoch; Bebung = Netzflattern.
- **Regler (6):** Spannung, Netz, Knistern, Bogen, Reichweite (1–2 Oktaven), Flackern.

### 2.10 Moder · Erde · schlägt
**Kompostglocke – Glanz zerfällt zu Knistern, Brummen.**

Ein klarer Schlag, glockig oder hölzern, acht Teiltöne, hell. Aber statt auszuklingen werden die hohen Teiltöne in ein bis drei Sekunden **gefressen**: Jeder zerbröselt in ein feines Knistern auf seiner eigenen Tonhöhe und verschwindet – während der Grundton **anschwillt** (gemessen +7 bis +9 dB nach 1,4 s, V). Der Klang sinkt und wärmt sich: eine umgekehrte Hüllkurve. Nach vier bis sechs Sekunden bleibt ein rundes Brummen, das zuletzt trocken verseufzt. Höhe = Feuchte: nass oben (schnelle Verdauung, kräftiges Knistern, dickes Brummen), trocken unten (fast eine normale Glocke mit langsamer Verdunkelung). Drei Körper: Glocke, Holz, Knochen.

Abklingen ist in allen Synths exponentiell; Energieaustausch zwischen Moden gibt es nur in der Forschung und immer nach oben (Gong-Kaskaden). Verdauung nach unten mit gestimmtem Knistern ist unbesetzt (V `biologist-mdr.json`). Die Prüfung hat den Kern korrigiert: Die Energie fließt direkt zum Grundton (nicht Kette über Nachbarn), und die Verdauung skaliert mit dem Puls-Schritt (kurze Schritte = schneller Kompost), sonst frisst ein schneller Puls das Stimmenbudget.

- **Finger:** Tipp = Schlag; die Höhe beim Tipp wählt die Feuchte. **Anschlag:** Energie (leise Schläge haben wenig zu kompostieren).
- **Puls:** jeder Schlag eine kleine Kompostglocke; dichte Schläge legen ihre Brummen zu einem warmen Bett unter eine knisternde Decke.
- **Gestik:** Neigen = Wetter (Feuchte); Sporenregen aus Kompostglocken = Knisterregen; Rassel-Kandidat.
- **Regler (6):** Körper, Pilz, Knistern, Schwellen, Nachklang, Schlägel.

### 2.11 Gespinst · Erz · schlägt
**Ein Netz aus Saiten, das Finger und Puls teilen.**

Acht Saiten, gestimmt auf die Tonleiter der Spielfläche, hängen an einem gemeinsamen Steg. Alles, was in Myzel in diese Quelle spielt – deine Finger, die zweite Ebene, alle vier Puls-Spuren, der Sporenregen – schickt seine Energie in dasselbe Netz. Ein Zupf auf der Grundstufe: ein heller Zupf, und dahinter erwachen Oktave und Quinte als Halo. Ein Arpeggio hinterlässt einen Teppich verwandter Tonhöhen. Zwei gehaltene Finger tauschen Energie über den Steg. Dreht man die Kopplung hoch, nähert sich das Netz der Kante, an der es von selbst zu singen beginnt – und ein Wächter hält es genau davor.

Sympathetische Saiten gibt es in Rings, GeoShred, Superchord, Rosetones und (2026) Synpathy (V `inventor-gsp.json`). Neu ist die Ökologie: Finger, zweite Ebene und Sequencer-Spuren teilen **ein** Netz, dessen Kopplung auf der Neigungsachse liegt. Die Prüfung hat den gefährlichsten Fehler gefunden: Die Stabilitätsgrenze der Kopplung liegt je nach Stimmung bei 0,02–0,12, nicht bei 0,1–0,6 – der Regler wird deshalb auf die berechnete Grenze normiert, ein Energiewächter senkt die Kopplung, wenn das Netz ohne Eingang anwächst, und das Netz zählt im Stimmenbudget mit (als fester Posten, 1,65 Einheiten, solange es klingt). Das Netz hat einen eigenen Mixer-Kanal „Gespinst“.

- **Finger:** Tipp = Zupf ins Netz; Höhe beim Tipp = Zupfhelligkeit und wie viel Energie ins Netz geht. **Anschlag:** Energie (quadratisch).
- **Puls:** die Spielweise, für die es gebaut ist – vier Spuren, die einander über das Netz hören; Sporenregen aus Zupfern in das Netz.
- **Gestik:** Vorneigen = Kopplung hoch (Kante), Zurückneigen = beruhigen; Ladung → Kopplung.
- **Regler (6):** Saiten (eine/zwei Oktaven), Kopplung, Nachklang, Metall, Steg, Halo (Pegel des Netzes).

### 2.12 Jahresring · Holz · schlägt
**Holzstab – wo du triffst, bestimmt den Klang.**

Ein Holzstab unter dem Schlägel, zwischen Marimba und Schlitztrommel. Die Fingerhöhe ist der Anschlagort: Mitte = voller, runder Grundton; zum Ende hin heller; genau auf der Knotenlinie (etwas über der Mitte) verschwindet der Grundton und nur ein hohles Klopfen bleibt – ein kontinuierlicher Weg durch sechs Knotenlinien (V nachgerechnet nach Euler–Bernoulli). „Schnitt“ blendet zwischen freiem Stab und unterschnittener Marimba. Dazu lebt der Stab in einem Jahr, das in vier Minuten vergeht: Frühling dünn und hell, die Tonhöhe sackt beim Anschlag kurz von oben herab; Sommer warm und lang; Herbst trocken, nach jedem Schlag ein Laubrascheln, Moden leicht verstimmt; Winter spröde und gläsern, die Obertöne zwei Prozent zu hoch, ein winziger Eisriss als zweiter Impuls. Spielen lässt den Stab altern – gedrosselt, umkehrbar, höchstens sechs Cent.

Anschlagort auf einem Stab ist Lehrbuch-Physik (Csound marimba, Rings Position, V); eine Jahresuhr aus gespielter Zeit hat kein Instrument (V `biologist-jrg.json`). Die Identität liegt auf dem Positions-Sweep, die Jahreszeiten sind die Kür; die Prüfung hat das Altern gedrosselt und umkehrbar gemacht.

- **Finger:** Tipp = Schlag; Höhe = Schlägelposition Mitte → Ende. **Anschlag:** Schlägelhärte.
- **Puls:** der sicherste Puls-Hit des Sets; eine laufende Spur wandert durch die Jahreszeiten.
- **Gestik:** Neigen verschiebt den Schlägel über den Stab; Sporenregen aus Holz; Rassel-Kandidat.
- **Regler (6):** Jahr (Minuten, 0 = Stillstand), Jahreszeit (Lauf oder fest), Schnitt, Holz, Schlägel, Laub.

### 2.13 Die Reserven

**Kehlchen (Luft, hält):** Zwei Stimmlippen einer Vogelkehle (Syrinx-Modell, Forschung, V). Unter der Schwelle Atem, dann ein Chip, dann ein klarer Ton, oben rau. Als Puls-Quelle sofort überzeugend (gemessen: Chip-Einsätze 1–64 ms, V); gehalten ist es ein Theremin, solange kein eingebauter Silben-Generator die 20–50-Hz-Motorgesten eines Vogels liefert, und die Tonhöhe braucht einen Nachregler im Prozessor. Kommt, wenn beides gebaut und geprüft ist – oder wenn eine Worklet-Quelle des Sets fällt.

**Rhizom (Erde, schlägt):** Ein Tipp: ein Holz-Ping auf der Note – und dann läuft eine Lawine durch die Nachbarstufen der Tonleiter, mal ein Nachbar, mal die ganze Wiese; danach ist das Netz erschöpft und muss sich erholen. Finger und Spuren teilen dasselbe Netz. In der Simulation funktioniert die probabilistische Weitergabe genau so (V); gehalten passiert nichts. Kommt als Puls- und Regen-Instrument.

---

## 3. Wie die Quellen verwaltet werden

Heute stehen 14 Chips an sieben Stellen (Spielfläche, zweite Ebene, vier Spuren, Mixer-Fruchtkörper): 160 Pixel je Gruppe, auf einem 360-Pixel-Handy 63 % des sichtbaren Panels (V `research/code-map.md` §8). Mit 26 Quellen wären es 240–280 Pixel je Gruppe – die Auswahl allein füllte das Panel. Die Lösung (`ideas/ui-final.md`, V geprüft gegen Code und Screenshots):

**Eine Zeile statt Chips.** An jeder der sieben Stellen steht eine 44 Pixel hohe Zeile: links ‹, rechts ›, in der Mitte Glyphe, Name, Familie und der Satz („◌ Nebel · Dunst – Schwebende Flächen aus verstimmten Oszillatoren“). ‹ › schreiten zur Nachbarquelle und spielen dabei eine kurze Probe – wie am OP-1 oder an Plaits. Tipp auf den Namen öffnet die Bibliothek. Langdruck auf den Namen = Probe ohne Öffnen. Ein Würfel neben der Zeile wählt eine Überraschung (nur die Quelle, nicht die Regler) mit Rückgängig. Die Sektion „Klangquelle“ schrumpft von 355 auf 132 Pixel.

**Die Bibliothek** öffnet im Panel, nicht als Overlay: Das Panel wächst wie beim Mixer, die Spielfläche bleibt etwa 130 Pixel hoch spielbar – man tippt eine Kachel und probiert sie sofort mit dem Finger auf dem Feld. Oben Suche, darunter die Familienreihe (★ Favoriten · ⟲ Zuletzt · Alle · Luft · Dunst · Holz · Erz · Erde), darunter die Kacheln: Glyphe, Name, Spielweise (hält/schlägt/beides), Kosten-Punkte (●○○ ≤ 0,5 · ●●○ ≤ 1 · ●●● > 1, mit „etwa 13 Stimmen auf diesem Gerät“), der Satz, ★ und ▶. Die Bibliothek öffnet auf der **Familie der gewählten Quelle** – die Geschwister sind sofort da, sieben Kacheln passen ohne Scrollen. Tipp = wählen und kurz hören (mit den Reglern des Patches, also hört man z. B. den gewählten Harz-Körper); Langdruck = halten, senkrechtes Ziehen = Höhe hören. „Fertig“, Zurück, Esc oder Wischen schließt.

**Fünf Familien** nach Welt und Material, nicht nach Spielweise – die Spielweise steht als Wort auf der Kachel, weil sie das Verhalten der Spielfläche ändert:

| Familie | Untertitel | Quellen |
|---|---|---|
| Luft | Atem, Wind, Stimmen, Funken | Hauch, Obertöne, Stimme, Halm, Böe, Elmsfeuer (+ Kehlchen) |
| Dunst | Wolken aus Teilchen und Zufall | Nebel, Körner, Schwarm, Amöbe |
| Holz | Saiten, Stäbe, Bogen | Harz, Sehne, Zapfen, Ranke, Saite, Jahresring |
| Erz | Metall, das nachklingt | Glocke, Schale, Gong, Kalimba, Gespinst |
| Erde | Felle, Tiefe, Fäulnis, Wasser | Tiefe, Glut, Membran, Tropfen, Moder (+ Rhizom) |

**Innerhalb der Quellen** bleiben die Unterwahlen (Harz-Körper, Halm-Rohr, Zapfen-Körper, Moder-Körper, Sehne-Steg, Jahreszeit) Chips als erste Zeile der Regler-Sektion – fünf Chips sind kein Platzproblem, und so trägt ein Listeneintrag mehrere Instrumente.

**Für den Sporenregen** (nur schlagende Quellen) zeigt dieselbe Bibliothek die gehaltenen Quellen grau mit Begründung, statt sie zu verstecken. Alte Presets und Exporte laden unverändert; ein Preset mit einer Quelle, die diese Version nicht hat (etwa eine ungebaute Reserve), sagt es einmal in einem Hinweis und fällt auf Nebel zurück.

**Hilfetexte** (Spielhilfe, Gerät, Startbildschirm, README) werden aus den Familien erzeugt, statt Quellen aufzuzählen.

---

## 4. Was bewusst weggelassen wurde

Von 59 Kandidaten sind 12 im Set, 2 in Reserve, 9 in andere Quellen eingefaltet, der Rest abgelehnt. Die Kurzgründe (alle aus den Prüfungen, V, Einzelheiten in `ideas/judge-1..3.md`):

- **Eingefaltet:** Dachs → Harz-Körper „Zunge“; Tümpel → Harz-Körper „Teich“; Lohe → Halm-Rohr „Flamme“; Blasebalg (freie Zunge) → späteres Halm-Rohr; Kreislauf → Glut (liefert den nativen Rückfall); Kluft → Zapfen-Körper „Fels“; Dorn → Sehne-Steg „Jawari“; Balz (Reibtrommel) → späterer Harz-Körper „Fell“, wenn der Bogen-Code steht; Schnecke (Feder) → verworfen, die Physik erlaubt keine gestimmte Feder.
- **Feature statt Quelle:** Glühwurm (Phasenkopplung von Spuren und Fingern – als Puls-/Gestik-Funktion auf bestehende Quellen besser), Knolle (zuhörender Grundton, adaptive reine Stimmung – gehört ins Geflecht), Brut (Vererbung – ein Preset-Spiel), Frost (Tropfen-Material „Eis“), Nuss (Kalimba-Erreger „Prallen“), Jahresring-Bandschleife (Echo mit Takt-Lock).
- **Vorbild im Handel, Versprechen nicht haltbar oder Rollendoppler:** Strudel (Shepard-Glissando ist Plugin-Standard, Mitte steril), Bernstein (die Vergangenheit einfrieren – Körner „Echo“ macht 70 % davon, FFT in JavaScript doppelt so teuer wie behauptet), Mykorrhiza (mit einem Finger langweilig, Gespinst ist das bessere Netz), Grille (Puls-Zirp gut, gehalten Stimme/Obertöne-Gebiet), Raupe (versagt über 440 Hz ohne aufwendige Analyse), Unke/Flechte/Plankton/Wal/Trieb/Geäst (Flächen- oder Weltbau-Quellen, deren Rolle Böe, Glut, Ranke decken), Nerv/Düne/Brandung/Kreisel/Wurm (Simulation gefallen oder Kalibrierung nötig, bevor man weiß, ob es spielbar ist), Schlund (teuerste Quelle, 1,4), Chitin (teuer, die Kaskade kann nicht „crashen“), Hagel/Kiefer/Kapsel/Zwiesel/Rudel/Donner/Sog/Gewölbe/Hohlstamm/Unterholz (je eine starke Seite ohne das Novum, das den Platz trägt, oder auf dem Handy-Lautsprecher unhörbar).

Die Logik dahinter: Jeder Platz im Set muss einen **Mechanismus** tragen, den keine App hat, in allen vier Spielweisen (gehalten, geschlagen, Puls, Gestik) etwas tun, auf einem Mittelklasse-Handy bezahlbar sein und in der Prüfung keinen unbehebbaren Fehler haben. Wer das nur in einer Spielweise schafft, ist ein Feature.

---

## 5. Ehrliche Grenzen

- **Rechenlast.** Die Einheit ist eine Nebel-Stimme der Stufe 1; ein Handy der Stufe 1 hat 14 Einheiten (V code-map). Die zwölf kosten 0,35 bis 1,05 je Stimme – alle im Rahmen der bestehenden Quellen (Gong kostet 1,55). Harz ist die teuerste (≈ 13 Stimmen auf einem Handy), Amöbe und Ranke die billigsten (≈ 35–40). Gespinst kostet zusätzlich 1,65 für das Netz, solange es klingt – 12 % des Handy-Budgets, fest reserviert. Alle Worklet-Zahlen sind auf einem Server-Kern gemessen (V `research/bench/`); auf einem Snapdragon-695-Handy ist mit Faktor 1,0–1,5 zu rechnen (A) – das gilt für die Nebel-Einheit genauso, also bleibt das Verhältnis.
- **Der Worklet-Thread.** Neun der zwölf brauchen sample-genaue Rechnung in einem AudioWorklet (Harz, Halm, Glut, Böe, Amöbe, Ranke, Sehne, Zapfen, Moder, Gespinst); Elmsfeuer und Jahresring sind nativ. Sobald ein Worklet existiert, rechnet Chrome in einem Frame und Safari den **ganzen** Klang auf dem Worklet-Thread, der eine niedrigere Priorität hat als der Echtzeit-Audiothread (V `research/webaudio.md` §2). Im eigenen Tab in Chrome ist das ein Echtzeit-Thread; in der claude.ai-Ansicht (Frame) nicht. Deshalb wird das Modul erst geladen, wenn eine Worklet-Quelle gewählt ist – wer nur die alten Quellen spielt, bleibt auf dem alten Weg. Auf Android wird gemessen, ob der Wechsel Aussetzer macht; die bestehende Aussetzer-Bremse (Budget × 0,8) greift auch hier.
- **Ohne Worklet** (alte WebViews, blockierte Blob-URLs): Elmsfeuer, Jahresring, Zapfen und Glut spielen nativ; die anderen fallen auf die nächste bestehende Quelle zurück (Harz → Schale, Halm → Hauch, Sehne → Saite, Gespinst → Saite, Moder → Glocke, Böe → Obertöne, Ranke → Nebel, Amöbe → Tiefe) – die Kachel sagt es („⌁ spielt als Schale“), das Preset bleibt unverändert.
- **Stufe 3** verdoppelt jede Quelle (zwei Bögen, zwei Rohre, zwei Schleifen, mehr Moden, Stereo) zu etwa zweifachen Kosten – nie ein anderer Mechanismus. Harz kostet dann 1,75, unter Gong (2,8).
- **Einschwingzeiten** sind Physik: Harz braucht 0,3–0,8 s bis zum vollen Ton, Glut Sekunden bis zum Zünden, Böe lebt in Nachklängen. Im Puls bekommen alle drei einen Sonderweg (Zupfimpuls, Zustandsinjektion, Böen-Zupf), damit ein Sechzehntel hörbar ist – aber ihr Charakter ist das Liegenlassen.
- **Handy-Lautsprecher** verlieren alles unter etwa 300 Hz: Amöbe-Bass, Moder-Brummen und das gefaltete Netzbrummen des Elmsfeuers sind nur mit Kopfhörer oder Box ganz da.
- **Stimmung:** Selbstschwinger sind nie exakt – Harz wird je Modus korrigiert (gemessen +2 bis +12 Cent ohne Korrektur), Halm stimmt auf 1 Cent, die Flöte nur mit Registertabelle, Zapfen oben ±5 Cent. Abnahmekriterium: ±5 Cent, Selbstschwinger ±10.
- **Was noch nach Gehör entschieden werden muss:** die Körper „Zunge“ und „Teich“ von Harz, Flöte und Flamme von Halm, der Lichtbogen von Elmsfeuer, die Fang-Hysterese der Böe, die Verdauungsraten von Moder, die Jahreszeiten-Anker. Alles andere ist gemessen oder simuliert.

---

## 6. Der Plan

**Bauordnung** (nach Risiko und geteiltem Code; Details in `SPEC.md`):

1. **Gemeinsames Worklet-Modul** mit Prozessor-Vertrag, Bausteinen (Resonator, Bruchteil-Delay, Bogentabelle, Tabellen), Wächtern (NaN, Denormals, DC) und Mess-Harness – Pflicht vor der ersten Quelle.
2. **Halm** (Rohrblatt) und **Ranke** – billig, früh hörbar, zahlen das Modul ein.
3. **Elmsfeuer** und **Jahresring** – nativ, kein Worklet-Risiko; dazu die Bibliotheks-Oberfläche, weil ab hier 18 Quellen in der Liste stehen.
4. **Harz** mit Glas, Schale, Stab (Bogen-Code), dann Zunge und Teich nach Gehör.
5. **Moder**, **Böe** (Resonator-Klasse), **Amöbe**.
6. **Zapfen** (mit nativem Rückfall), **Sehne** mit beiden Stegen, **Glut** (mit nativem Rückfall).
7. **Gespinst** zuletzt: Netz, Wächter, Budget-Buchführung, Mixer-Kanal.
8. Presets (Glaswiese, Kompostgarten, Atemrohr, Hochspannung, Gespinstgarten), Gestik-Rezepte, Texte, README.
9. Reserven, wenn Zeit und Abnahme es zulassen: Kehlchen (Silben-Generator, Nachregler), Rhizom (Ereignisnetz).

**Abnahme je Quelle** (automatisch, offline gerendert): Lautheit innerhalb ±2 dB der Referenzen, Spitze unter −1 dBFS, kein NaN, kein Gleichstrom, Klangfarbe steigt mit der Höhe, Kosten im Ziel, Stufe 3 innerhalb ±1,5 dB, Halten/Stoß/Loslassen wie spezifiziert, Tonhöhe im Toleranzband, Spektrogramm zur Sichtprüfung – plus die Korrekturen aus den Prüfungen als Pflichtkriterien (sonst „Schale mit langsamem Einschwingen“, „Obertöne mit Rauschen“, „Glocke mit Tiefpassfahrt“). Keine Quelle kommt ohne bestandene Abnahme in die Bibliothek. Dann Playwright-Tests der Bibliothek auf 360×740, 390×844 und Desktop, die bestehenden Regressionen (Mixer, MIDI, Gestik), ein Hörtest je Quelle in allen vier Spielweisen, und die Veröffentlichung.
