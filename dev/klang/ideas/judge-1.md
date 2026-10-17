# Judge 1 – Ranking der Klangquellen-Kandidaten (Sound-Designer-Blick)

Datum 2026-10-17. Grundlage: 59 Kandidaten aus inventor/composer/biologist/performer/designer/engineer.md und ihre adversarialen Prüfungen in `check/*.json` (V = aus den Prüfungen übernommen; A = eigene Einschätzung). Maßstab: klangliche Eigenständigkeit (40 %), Spielbarkeit gehalten + geschlagen + Puls + Gestik (35 %), Erstberührungs-Wow für Musiker (25 %); Kosten und Risiko als Abzug. Hart benotet: 8 = Pflichtkauf, 6 = gut mit Korrekturen, ≤ 5 = kein eigener Slot.

## 1. Zusammenführungen (Near-Duplicates)

| Ziel | Aufgenommen | Warum |
|---|---|---|
| **hrz Harz** | dax Dachs (Körper „Zunge“ + Kehle-Formanten), tum Tümpel (Körper „Teich“, Neigung = Wasser ±1 Okt auf Schale) | ein Bogen-Prozessor `myzel-bow`, Körper-SEL statt drei Listeneinträge (V: alle drei Prüfungen empfehlen das Falten) |
| **hlm Halm** | loh Lohe (Rohr „Flamme“: Rijke-Rohr mit Wärmefreisetzungs-Nichtlinearität, Knistern) | ein Rohr-Prozessor `myzel-blow`; Lohe-Prüfung verlangt ohnehin die Worklet-Röhre (V) |
| **glt Glut** | kre Kreislauf | identischer Mechanismus (Delay → Bandpass → tanh → G > 1 unter dem Finger); Glut-Spec hat Nachglühen + Modensprung, Kreislauf liefert den nativen Fallback und die Gewinn-pro-Sekunde-Regel (V) |
| **zpf Zapfen** | klf Kluft (Körper „Fels“ = Stick-Slip mit Hysterese im Prozessor) | beide = Rhythmus→Ton-Kontinuum aus Reibung/Kratzen mit Körper; Zapfen hat Rast-Leiter + nativen Pfad, Kluft die bessere Physik (V) |
| **shn Sehne** | drn Dorn (Param „Steg“: gekrümmter Steg + Faden, live) | Sehne allein ist „common“ (V), mit Jawari-Steg und Flageolett-Junction wird die Live-Saite einzigartig; Dorn-Prüfung will ohnehin die Live-Worklet-Variante (V) |
| **glw Glühwurm** | glw (biologist) + glw (performer) | gleicher Name/Key, zwei Mechanismen (Population im Finger vs. Finger als Population); vereint: Frequenz-Adaptation statt reiner Phasenkopplung (V performer-Sim) |
| **dun Düne** | dun (designer) + dun (engineer) | gleicher Key; vereint, bleibt abgelehnt (s. u.) |
| jrg vs. jhr | Name „Jahresring“ geht an jrg (Holzstab) | jhr (Bandschleife) abgelehnt |

## 2. Benotung aller Kandidaten

Kosten in Myzel-Einheiten (L1 / L3), aus den Prüfungen (V).

| Key | Name | Note | Kosten | Kurzurteil |
|---|---|---|---|---|
| hrz | Harz (+dax, +tum) | **8,0** | 1,05 / 1,7 W | Myzels erste echte Reibung; Druck = Höhe ist die Geste; Korrekturliste klar (Modengewichte, Druck 0,15–0,7, Reibkraft in den Ausgang, Zupfimpuls < 300 ms) |
| mdr | Moder | **7,5** | 0,55 / 0,9 W | einzige Perkussion mit umgekehrter Hüllkurve + gestimmtem Knistern; Kern braucht direkten Energiefluss zum Stamm (V Sim), dann unverwechselbar |
| rnk | Ranke | **7,5** | 0,4 / 0,55 W | klingt nach keinem Oszillator, billigste Worklet-Engine, Finger-als-Hammer unbesetzt; Ring klemmen, pitchsynchron, keine AGC |
| gsp | Gespinst | **7,5** | 0,4 + 1,65 Singleton W | einzige Engine, bei der Puls-Pattern und Akkorde einander anregen; κ auf κ_crit normieren + Energie-Governor zwingend |
| hlm | Halm (+loh) | **7,5** | 0,45 / 1,1 W | Rohrblatt funktioniert auf Anhieb, billigste der Winde; Flöte/Flamme risikoreicher, als Rohr-SEL hinter dem sicheren Rohrblatt |
| khl | Kehlchen | **7,0** | 0,4 / 0,9 W | als Puls-Quelle (Chips, Sporenregen-Schwarm) sofort überzeugend; gehalten braucht Silben-Generator + 2-D-Tonhöhenkorrektur |
| shn | Sehne (+drn) | **7,0** | 0,6 / 1,2 W | Myzel hat keine Live-Saite; Glide, Handkante, E-Bow, Jawari-Steg; allein wäre sie „Saite 2“ |
| glt | Glut (+kre) | **7,0** | 0,45 / 0,9 W (nativ 0,35) | Liegenlassen-und-Warten-Instrument; lebt in Übergängen → G pro Sekunde, Glimmen-Random-Walk, Puls injiziert Schleifenzustand |
| zpf | Zapfen (+klf) | **7,0** | 0,45 / 0,85 W, nativ 0,2 | Rhythmus→Ton unter dem Finger mit Rast-Leiter; Strich-Puls stark; Unregelmäßigkeit + Sub-Sample-Impulse + Bebung auf Rate Pflicht |
| elm | Elmsfeuer | **7,0** | 0,7 / 1,35 N | neues Klanggebiet (Brummen → Knistern → Bogen), Zap als Puls-Hit ohne Vorbild in Myzel; Bogen-Stufe früh anhören |
| boe | Böe | **6,5** | 0,7 / 1,2 W | hängende Akkorde + Totzonen = Ambient-Gedächtnis; zwei Fixes (Ein-Modus-Fang, Böen-Zupf für Puls), sonst „Obertöne mit Rauschen“ |
| amo | Amöbe | **6,5** | 0,3–0,5 / 1,0 W | der Xenakis-Bass, Verhaltensneuheit unter dem Finger; nur 50–500 Hz, K je Periode, DC/Pegel-Normierung |
| rhz | Rhizom | **6,5** | 0,65 / 1,1 W (oder nativ nach Tropfen-Muster) | Erstberührung: ein Schlag läuft durch die Skala – stark; gehalten passiert nichts → Reserve |
| rau | Raupe | **6,5** | 0,3–0,4 W | eigene Stimme/Echo als pitch-gerastete Stotterflöte; versagt > 440 Hz ohne PSOLA/Dezimierung → Reserve |
| jrg | Jahresring | **6,5** | 0,65 / 1,3 N | fehlende Holzstab-Familie + Anschlagort mit Knotenlinie (echt, V); Jahresuhr ist Gimmick → Reserve |
| glw | Glühwurm (vereint) | 6,0 | 0,3–0,5 | Sync-Mechanik ist Modulation, nicht Timbre; solo ein LPG-Tremolo-Pad (V); besser als Puls-/Gestik-Feature auf bestehenden Engines |
| unk | Unke | 6,0 | 0,2 / 0,4 N | Hoquetus entsteht (V Sim), Welt-Bau-Engine; Einzelruf = weiches „oop“, zu nah an Kehlchen-Rolle |
| blz | Balz | 6,0 | 0,5 / 0,85 W | Cuíca-Formant als Touch-Achse ist gut; Ballon-Risiko, hängt am Harz-Bogen-Code; zweite Reibungs-Engine sprengt die Diversität |
| fle | Flechte | 6,0 | 0,4 / 0,75 N | Atmen über Finger geteilt ist schön, aber ODE wie spezifiziert konvergiert (V Sim); Glut/Böe decken „liegen lassen“ |
| pla | Plankton | 6,0 | 0,4 W | gesiebte Sinuswolke gehalten hübsch, Puls transientenlos, Bloom-Klischee-Nähe |
| nrv | Nerv | 6,0 | 0,6 / 1,0 W | Bursting-Identität echt, Regimetreppe braucht Kalibrier-Tabelle; Zapfen deckt Rhythmus→Ton |
| krs | Kreisel | 6,0 | 0,5 / 1,0 N | physischster Performer-Gedanke, Gleichungen wie geschrieben kaputt (V), Motor Synth existiert |
| dax | Dachs | 6,0 | 1,0 W | echtes Novum, aber DSP liefert die Stimme nicht (fast Sinus, V) → in Harz gefaltet |
| loh | Lohe | 6,0 | 0,35–0,6 | „new“, Schwellen-Jagd gut, Puls schwach → in Halm gefaltet |
| gri | Grille | 5,5 | 0,28 W | Puls-Zirp stark, gehalten Stimme/Obertöne-Gebiet; Schwarm hat schon Grille |
| blg | Blasebalg | 5,5 | 0,55 / 1,2 W | Harmonium-Atem schön, Körper neu zu bauen, Halm deckt Atem = Höhe |
| hgl | Hagel | 5,5 | 0,75 / 1,4 N | Puls zu Hause, gehalten One-Shot; dicht = Hauch mit Resonatoren |
| kie | Kiefer | 5,5 | 0,5 / 1,0 N | Puls-Riffs gut, gehalten stumm ohne Atem-Umbau; Jaw Harp Synth existiert auf iPhone |
| kps | Kapsel | 5,5 | 0,45 N | Kippen-und-Schütten ist Gestik-Gold, aber Rohr-Singen existiert in Biquads nicht (V) |
| zwi | Zwiesel | 5,5 | 0,35 N | Zweiklang aus einem Schlag nett; Cache-Problem, pentatonische Terz-Regel kaputt, „Glocke mit Terz“ |
| kre | Kreislauf | 5,5 | 0,45 N | → Glut |
| klf | Kluft | 6,0 | 0,5 W | → Zapfen |
| drn | Dorn | 6,0 | 0,35 N / 0,45 W | → Sehne |
| tum | Tümpel | 5,0 | 0,9 N | Pseudo-Bogen = Schale mit langsamem Einschwingen (V) → Harz-Körper „Teich“ |
| stru | Strudel | 5,0 | 0,6 / 1,4 W | Shepard ist Plugin-Standard; Mitte steril, Puls schwach; nur mit Nicht-Oktav-Abstand interessant |
| ast | Geäst | 5,0 | 0,45 N | Textur, verliert Tonhöhe ab y 0,4, Höhe formt kein Timbre |
| brn | Bernstein | 5,0 | 1,1–1,7 W | Zeitreise-Idee stark, aber Körner-Echo macht 70 % davon, FFT in JS doppelt so teuer wie behauptet |
| myk | Mykorrhiza | 5,0 | 0,3 N | mit einem Finger langweilig, Defaults chaotisch (V); Schwarm hat Kreuz-FM, Gespinst ist das bessere Netz |
| brd | Brandung | 5,0 | 0,45 W | Unteroktav-Fenster 2–6 % des Fingerwegs, 20–45 % Rauschen (V Sim); Versprechen nicht haltbar |
| trb | Trieb | 5,0 | 0,7 / 1,3 W | Orgelbrei-Risiko, Verhalten in 5–20 s, Touch-Noten dauern 0,5–3 s |
| knl | Knolle | 5,0 | 0,4 + 0,3 N | als Klangquelle Nebel-Gebiet; die Idee (zuhörender Grundton + adaptive JI) gehört als globales Feature ins Geflecht/Pult |
| brt | Brut | 5,0 | 0,5 N | Vererbung ist Meta-Mechanik, Timbre = Schale/Glocke; eher Preset-/dice()-Feature |
| sld | Schlund | 5,0 | 1,4 / 2,2 W | einzige, die „ta“ sagt, aber teuerste Engine und gehalten dünnere Stimme |
| chi | Chitin | 5,0 | 0,8 / 1,7 W | Kaskade kann nicht crashen (V), Gong vorhanden, teuer |
| wal | Wal | 5,0 | 0,6 N | nur 55–150 Hz legato überzeugend |
| uhz | Unterholz | 5,0 | 0,8 N | Trautonium existiert als Hardware/Plugin, unten Nebel-Cousin |
| snk | Schnecke | 5,0 | 0,65 W | Physik verbietet die gestimmte Feder; Redesign = „Saite im Federtank“ = Effekt |
| wrm | Wurm | 5,0 | 0,4 N | Turing-Machine-Idiom, Halteton gewöhnlich |
| dun | Düne (vereint) | 4,5 | 0,8–1,1 / 2,0 W | KURARE/Foxfire existieren, Übergang matschig, Puls kann nicht einrasten; Zapfen + Glühwurm decken beides |
| rdl | Rudel | 4,5 | 0,95 N | Cartoon-Hund-Risiko, Höhe wählt Harmonie statt Timbre |
| hst | Hohlstamm | 4,0 | 0,7 „hard“ | Ventil spricht in 0–25 % des Rasters (V Sim); Halm hat das weitere Fenster |
| don | Donner | 4,0 | 0,7 / 1,4 N | Spur mit 10–20 lebenden Stimmen sprengt Mobil-Budget, Grollen auf Handy unhörbar |
| sog | Sog | 4,0 | 0,6 N | Geste widerspricht Release/Sustain/Ambient-Konvention; Trailer-Vokabular |
| nus | Nuss | 4,0 | 0,4 N | drei Prallen = „Bouncing-Ball-Sample“; als Erreger „Prallen“ in Kalimba/Saite |
| frs | Frost | 4,0 | 0,65 N | fallender Chirp = Laser-Klischee; 70 % davon = Tropfen mit Material Wasser/Eis |
| gwb | Gewölbe | 3,5 | 0,75 N | Hauch mit mehr Bändern und Q 400; Puls versagt komplett |
| jhr | Jahresring (Band) | 3,0 | 0,2 + 0,4 N | keine Klangquelle, Echo mit Tempo-Lock + Bandverlust leistet dasselbe |

## 3. Das Set (12) – Reihenfolge = Empfehlung

| # | Key | Name | Familie / Rolle | Typ | Kosten L1 |
|---|---|---|---|---|---|
| 1 | hrz | Harz | Reibung (Glas/Schale/Stab/Zunge/Teich) | gehalten, Puls = Striche/Zupf | 1,05 W |
| 2 | mdr | Moder | Perkussion mit umgekehrter Hüllkurve | geschlagen, Puls stark | 0,55 W |
| 3 | rnk | Ranke | Scanned Synthesis, Finger = Hammer | beides | 0,4 W |
| 4 | gsp | Gespinst | geteiltes Resonanznetz (Singleton) | geschlagen/Puls stark, gehalten im Worklet | 0,4 + 1,65 W |
| 5 | hlm | Halm | selbstschwingende Winde (Rohrblatt/Flöte/Flamme) | gehalten, Puls = Zungenstoß | 0,45 W |
| 6 | khl | Kehlchen | Syrinx | Puls-Chips, gehalten mit Silben | 0,4 W |
| 7 | shn | Sehne | Live-Saite mit Hand, Flageolett, E-Bow, Jawari-Steg | beides | 0,6 W |
| 8 | glt | Glut | gestimmte Rückkopplung mit Nachglühen | gehalten, Puls mit Zustandsinjektion | 0,45 W / 0,35 N |
| 9 | zpf | Zapfen | Kratzen/Stick-Slip, Rhythmus→Ton, Rast-Leiter | beides, nativer Pfad | 0,45 W / 0,2 N |
| 10 | elm | Elmsfeuer | Elektrizität: Brummen→Knistern→Bogen, Zap | beides | 0,7 N |
| 11 | boe | Böe | Äolsharfe mit Lock-in-Gedächtnis | gehalten, Böen-Zupf im Puls | 0,7 W |
| 12 | amo | Amöbe | GENDY-Bass, tonhöhenfest | gehalten (Bass), Puls = Zucken | 0,3–0,5 W |

Reserven (in Reihenfolge): **13 rhz Rhizom** (Puls-/Regen-Star, gehalten = Ladungs-Tröpfeln nötig), **14 rau Raupe** (Stimme/Echo als Stotterflöte; braucht PSOLA-Pfad), **15 jrg Jahresring** (Holzstab mit Anschlagort; Jahresuhr abspecken).

Warum dieses Set und nicht die 12 höchsten Noten:
- **Diversität der Mechanik:** 4 physikalische Selbstschwinger (Harz, Halm, Kehlchen, Glut), 2 Saiten-/Netz-Resonatoren (Sehne, Gespinst), 2 Perkussion-Neuheiten (Moder, Elmsfeuer), 2 Rhythmus/Material-Kontinua (Zapfen, Ranke), 2 Ambient-Organismen (Böe, Amöbe). Kein Vertreter doppelt (deshalb Nerv/Düne/Grille raus, Unke/Balz hinter Kehlchen/Harz).
- **Gehalten vs. geschlagen:** 8 primär gehalten, 2 primär geschlagen (Moder, Gespinst), 2 beides (Elmsfeuer, Zapfen) – Myzel hat bereits 7 geschlagene Engines, der Mangel liegt bei lebendigen Haltetönen.
- **Familien als Listenlösung:** Harz (5 Körper), Halm (3 Rohre), Zapfen (4 Körper), Moder (3 Körper) tragen je einen Listeneintrag; 12 Einträge statt 17.
- **Realistisch:** Summe L1-Kosten ≈ 0,3–1,05 je Stimme (nur Harz und Gespinst-Singleton über 1,0); 10 Worklet-Prozessoren in einem gemeinsamen Modul (A: ~2 000 Zeilen DSP), Fallback ohne Worklet: Glut, Zapfen, Elmsfeuer nativ, die übrigen auf die nächste bestehende Engine mappen (Harz→Schale, Halm→Hauch, Sehne→Saite, Kehlchen→Schwarm, Moder→Glocke, Böe→Obertöne, Ranke/Amöbe→Nebel). Bauordnung: Harz zuerst (Bogen-Code), dann Halm, Ranke, Moder (schnelle Wins), Gespinst zuletzt (Budget-Buchführung).
- **Akzeptanzkriterien** = die Korrekturlisten der Prüfungen; keine Engine darf ohne sie in die Bibliothek (sonst „Schale mit langsamem Einschwingen“, „Obertöne mit Rauschen“, „Glocke mit Tiefpassfahrt“).

## 4. Abgelehnt (Kurzgründe)

- **glw Glühwurm** (vereint): Sync ist Modulation, nicht Klang; solo LPG-Tremolo; ohne Frequenz-Adaptation keine Synchronisation bei verschiedenen Höhen (V). Empfehlung: als Puls-/Gestik-Feature „Glühwurm“ (Phasenkopplung von Lanes + Fingern) auf bestehende Engines.
- **dax, loh, tum, kre, klf, drn**: in Harz/Halm/Glut/Zapfen/Sehne gefaltet (s. §1).
- **unk, blz, fle, pla, nrv, krs**: gut, aber Rollendoppler im Set (Kehlchen, Harz, Glut/Böe, Plankton↔Tropfen/Körner, Zapfen, Glut).
- **gri, blg, hgl, kie, kps, zwi**: je eine starke Seite (Puls) und eine schwache (gehalten) ohne Novum, das den Slot trägt.
- **stru, ast, brn, myk, brd, trb, brt, sld, chi, wal, uhz, snk, wrm, dun, rdl, hst, don, sog, nus, frs, gwb, jhr**: siehe Tabelle §2 – Vorbilder im Handel, Versprechen in der Simulation gefallen, zu teuer, oder besser als Parameter/Feature (knl → globales JI-Feature, frs → Tropfen „Eis“, nus → Kalimba-Erreger „Prallen“, jhr → Echo mit Tempo-Lock, brt → Preset-Zucht).
