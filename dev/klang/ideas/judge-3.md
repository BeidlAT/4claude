# Judge 3 – Ranking aus DSP-Lead-Sicht

Datum 2026-10-17. Grundlage: 59 Kandidaten (57 Keys; glw und dun doppelt) aus inventor/composer/biologist/performer/designer/engineer.md, ihre adversarialen Prüfungen in `check/*.json` (V = aus Prüfung/Simulation übernommen, A = eigene Einschätzung) und der App-Code (`index.html`: VCOST1 0,3–1,55, Mobil-Budget 14 Einheiten, `voiceLoad()` zählt nur Stimmen, Worklet per Blob-URL mit Datei-Fallback, `steal()`/`panic()` vorhanden, `decayMul` wird nur von Engines gelesen, nie von Spuren gesetzt – V).

Maßstab (je 0–10, gewichtet): Machbarkeit 20 %, Kosten auf Mittelklasse-Android 20 %, Robustheit (Klicks, durchgehende Rückkopplung, NaN/Denormals, Pegel) 25 %, Testbarkeit (offline rendern, Tonhöhe/Pegel/Hüllkurve messbar, deterministisch) 15 %, Wahrscheinlichkeit „liefert in exzellenter Qualität“ nach den Korrekturlisten 20 %. Hart: 8 = baue ich ohne Diskussion, 6 = baue ich mit Akzeptanztests, ≤ 5 = kein Slot.

## 1. Zusammenführungen

| Ziel | Gefaltet | DSP-Grund |
|---|---|---|
| **hrz Harz** | dax (Körper „Zunge“ + 2 native Formant-Biquads), tum (Körper „Teich“, Neigung = Wasser), blz (Körper „Fell“: 5 Low-Q-Moden + Formant) | ein Prozessor `myzel-bow` (Bogentabelle + Banded-WG), Körper = Modensatz-Tabelle; alle vier Prüfungen stellen fest, dass der Charakter aus dem Bogen kommt, nicht aus dem Körper (V) |
| **hlm Halm** | loh (Rohr „Flamme“: Wärmefreisetzungs-Nichtlinearität in derselben Bohrung), blg (Rohr „Zunge“ = freie Zunge, später) | ein Prozessor `myzel-blow` mit austauschbarer Nichtlinearität; Lohe-Prüfung verlangt die Worklet-Röhre (V), Blasebalg-Körper (IIR Ordnung 20) ist numerisch unsicher und muss ohnehin in Biquads/Resonatoren im Worklet (V) |
| **glt Glut** | kre Kreislauf | identischer Zyklus (Delay → BP → tanh → G > 1); Kreislauf liefert den nativen Pfad (DelayNode ≥ 128 Frames) und die Regel „Gewinn pro Sekunde, nicht pro Umlauf“ (V beide) |
| **zpf Zapfen** | klf Kluft (Modus „Fels“ = Stick-Slip mit Hysterese im Prozessor) | beide = Rhythmus→Ton-Kontinuum durch einen Körper; Zapfen hat den nativen Mobilpfad (≈ 0,2), Kluft die bessere Physik (V) |
| **shn Sehne** | drn Dorn (Param „Steg“: gekrümmter Steg + Faden live im Loop) | ein Prozessor `myzel-string`; Dorn-Prüfung will die Live-Worklet-Variante (Cache 70 statt 39 Saiten sonst), Sehne allein ist „common“ (V) |
| **glw Glühwurm** | glw biologist + glw performer | gleicher Key; Mechanik ist Modulation → kein Engine-Slot, siehe §4 |
| **dun Düne** | dun designer + dun engineer | gleicher Key; abgelehnt |
| jrg / jhr | Name „Jahresring“ → jrg (Holzstab) | jhr abgelehnt |

## 2. Benotung aller Kandidaten

Kosten in Myzel-Einheiten L1 / L3, W = Worklet, N = nativ (aus Prüfungen, V, außer markiert A).

| Key | Name | Note | Kosten | DSP-Urteil |
|---|---|---|---|---|
| hlm | Halm (+loh, +blg) | **8,0** | 0,45 / 1,1 W | Rohrblatt im Sim auf Anhieb: Schwelle, Stimmung 1 ct mit −1,5 Samples, Einschwingen 45–235 ms (V). Nichtlinearität geklemmt (r ∈ [−1,1]), Verlustfilter < 1 → beschränkt per Konstruktion. Flöte erst mit Kompensationstabelle je Register. Testbar offline (f0, Schwelle, Ausklang). |
| rnk | Ranke | **7,5** | 0,4 / 0,55 W | Keine Audio-Rückkopplung, Scan = Wavetable-Read → Tonhöhe exakt. Physik-Update 150–400 Hz, explizit Euler stabil für k_s·dt² < 4 (A). Fixes klar: geklemmter Ring, pitchsynchrones Update, keine AGC, Hammerbreite begrenzen (Aliasing). Deterministisch bei Seed → voll testbar. |
| mdr | Moder | **7,5** | 0,55 / 0,9 W | 8 Rotationen + Leistungs-ODE auf Blockrate (billig, P_k ≥ 0 klemmen), Knistern als AM. Kein Feedback. Sim zeigt: direkter Fluss zum Grundton nötig (+7–9 dB bei 1,4 s), Verdauung aus `gate` skalieren, finish bei −60 dB (V). Messbar: Grundton-Anschwellen in dB. |
| zpf | Zapfen (+klf) | **7,5** | 0,45 / 0,85 W, nativ 0,2 | Impulse + Resonatoren, kein Feedback. Nativer Mobilpfad (Loop-Buffer + playbackRate + 3–4 Biquads) ist der robusteste Weg der Liste; Worklet für Sub-Sample-Impulse, Unregelmäßigkeit, Stick-Slip-Modus. Bebung auf die Rate, nicht die Moden (V). |
| hrz | Harz (+dax, +tum, +blz) | **7,0** | 1,05 / 1,7 W | Banded-WG + Bogentabelle = STK-Referenzcode, testbar. Schleife beschränkt (g_k < 1, bowTable ≤ 0,98, tanh). Risiken: Intonation (Delay − Biquad-Gruppenlaufzeit analytisch berechenbar), Einschwingen 1–2 s → Zupfimpuls, Modengewichte, Druck 0,15–0,7 (V). Teuerste Stimme, aber = Stimme (1,05). Bogen-Code wird von 4 Körpern geteilt → trägt den Preis. |
| jrg | Jahresring | **7,0** | 0,65 / 1,3 N | 4 Biquads + Rauschen, Euler-Bernoulli-Gewichte geprüft (Knoten bei x = 0,776, V). Null DSP-Risiko, sicherster Ship der Liste. Jahresuhr/Altern abspecken (Trefferzähler ratenbegrenzen, reversibel, Detune ≤ 35 ct). |
| shn | Sehne (+drn) | **7,0** | 0,6 / 1,2 W | KS-Waveguide = bestgetesteter DSP überhaupt; Fraktional-Delay + Allpass-Stimmung Standard; Jawari-Kontakt im Loop ist eine Clip-Nichtlinearität (beschränkt). Gemeinsamer `myzel-string` für spätere Saiten-Ideen. |
| glt | Glut (+kre) | **7,0** | 0,45 / 0,9 W, nativ 0,35 | Rückkopplung mit G > 1 ist Absicht, aber tanh im Zyklus beschränkt die Amplitude; DC-Blocker + HP im Loop Pflicht. G als Wachstum/s tonhöhenkompensiert, RMS-Governor auf den Gain, Puls injiziert Zustand (V). Nativer Fallback existiert (≥ 128 Frames). Messbar: Wachstumsrate dB/s. |
| amo | Amöbe | **6,5** | 0,3–0,5 / 1,0 W | Kein Feedback, Amplituden gespiegelt → beschränkt. Fixes: K je Periode, DC-Sperre/Normierung, Tabellen-Verteilungen (Math.tan kostet 0,66 allein, V), 2× Oversampling. Nur 50–500 Hz brauchbar → als Bass deklarieren. |
| boe | Böe | **6,5** | 0,7 / 1,2 W | 8 Resonatoren mit T60, kein Feedback, robust. Lock-in-Heuristik nach Gehör (Ein-Modus-Fang + Leck), Böen-Zupf für Puls (V). Testbar (Resonator-T60, Fang-Hysterese). Risiko ist klanglich, nicht numerisch. |
| elm | Elmsfeuer | **6,5** | 0,7 / 1,35 N | Nativ, kein Feedback, driftBuf-Muster. Zap-Puls stark. Risiko: Bogenstufe = Laser-Patch, Brummen auf f = Tiefe; Knistern muss Bogen gaten (V). Sound-Design-Risiko, kein DSP-Risiko. |
| khl | Kehlchen | **6,0** | 0,4 / 0,9 W | 27 ns/Sample, Schwelle und Chips stimmen (V). Tonhöhe weicht nichtlinear +10…+210 ct / −50…−80 ct ab → Frequenz-Nachregler im Prozessor (Periodenmessung, ε-Integrator) nötig; Periodenverdopplung nur mit zweitem Lippenpaar; gehalten braucht Silbengenerator (V). Zwei Teilsysteme vor „exzellent“. |
| nrv | Nerv | 6,0 | 0,6 / 1,0 W | Izhikevich stabil mit Klemmen, Reset-Klick ist der Klang; Regimetreppe braucht y-Kalibriertabelle (V). Überlappt Zapfen (Rhythmus→Ton). |
| gri | Grille | 6,0 | 0,28 / 0,5 W | Billigster, risikoärmster Worklet; nur Fenster-Aliasing (Formant ≤ 5 kHz). Fixes: gekoppelter, harmonisch gerasteter Formant, Maskenmuster (V). Gehalten Stimme/Obertöne-Nähe. |
| rhz | Rhizom | 6,0 | 0,65 / 1,1 W, nativ möglich | LIF-Schalter versagt → probabilistische Weitergabe (V). Sauberer Pfad: Netz als JS-Ereignisprozess im Tick, Pings nativ nach Tropfen-Muster mit Deckel; Stimme per „fertig“ beenden (sonst 8 Hits/s × 2,5 s = Budget weg). Geteilter Zustand ↔ steal/panic. |
| gsp | Gespinst | 5,5 | 0,4 + 1,65 Singleton W | Geschlossene Steg-Schleife mit KS-Spitzengewinn 65–160 → κ_crit 0,02–0,12 stimmungs- und Nachklang-abhängig (V): Rückkopplung ist hier der Mechanismus, nicht ein Nebenrisiko. Singleton nicht in `voiceLoad()`, lebt länger als Stimmen (panic/Schlafen), Umstimmen live. Drei Robustheitsfallen gleichzeitig → Reserve, nicht Set. |
| rau | Raupe | 5,5 | 0,3–0,75 W | Versagt > 440 Hz ohne PSOLA/dezimierte Kopie; Waveset-Tabelle je Material; Material-Transfer 600 KB; Stille-Suche (V). PSOLA sauber = eigenes Projekt. |
| unk | Unke | 5,5 | 0,2 / 0,4 N | Billig, robust, Hoquetus im Sim (V); aber Halteton 75 % stumm und Einzelruf = weiches Blip; eher Puls-Verhalten als Klangquelle. |
| fle | Flechte | 5,5 | 0,4 / 0,75 N | Nur Gain-Automation → robust; ODE wie geschrieben konvergiert (V), Klang = Nebel + gefiltertes Rauschen. |
| pla | Plankton | 5,5 | 0,4 (bis 2,2!) W | Kosten skalieren ×5 mit dichte × korn → Slot-Deckel zwingend (V); Puls transientenlos. |
| uhz | Unterholz | 5,5 | 0,8 / 1,5 N | Subharmonische aus gemeinsamem Takt phasenstarr und robust; unten Nebel-Cousin, Trautonium existiert. |
| blg | Blasebalg | 5,5 | 0,55 / 1,2 W | IIR Ordnung 20 unsicher (V) → in Halm als Rohrtyp. |
| blz | Balz | 5,5 | 0,5 / 0,85 W | Teilt Bogentabelle mit Harz; Ballon-Risiko → Harz-Körper „Fell“. |
| loh | Lohe | 5,5 | 0,35–0,6 | Nativ = Hauch mit Crossfade, Worklet-Röhre echt → Halm-Rohr „Flamme“. |
| klf | Kluft | 6,0 | 0,5 / 0,95 W | → Zapfen-Modus „Fels“ (Hysterese im Prozessor, Physik auf Periode normieren, V). |
| drn | Dorn | 5,5 | 0,35 N / 0,45 W | Cache-Überlauf (70 > 39 Saiten), Einpunkt-Clip = Banjo (V) → Sehne-Param „Steg“. |
| kre | Kreislauf | 5,5 | 0,45 / 0,9 N | → Glut (nativer Pfad). Shaper nie oversamplen im Zyklus (Latenz verstimmt 25 %, V). |
| dax | Dachs | 5,0 | 1,0 / 2,0 W | Fast Sinus, Hysterese liefert keine Subharmonik (V) → Harz-Körper. |
| glw | Glühwurm (vereint) | 5,0 | 0,3–0,5 | Phasenkopplung rastet nur gleiche Raten (0 % bei ±0,25 Höhe, V); Frequenz-Adaptation nötig; solo LPG-Tremolo. Mechanik = Modulation von Lanes/Fingern → Feature, kein Engine. |
| stru | Strudel | 5,0 | 0,6 / 1,4 W | Robust und testbar, aber Puls 0,2 Okt Chirp, Mitte Sinus-Orgel; Plugin-Standard. |
| ast | Geäst | 5,0 | 0,45 / 0,85 N | Lineare Detune-Rampen exakt, robust; verliert Tonhöhe ab y 0,4, Höhe formt kein Timbre. |
| trb | Trieb | 5,0 | 0,7 / 1,3 W | Robust (Rotationen), Verhalten in 5–20 s, Touch-Noten 0,5–3 s; Orgelbrei. |
| sld | Schlund | 5,0 | 1,4 / 2,2–3,1 W | Teuerste Engine; 24-Zellen-Leiter 1,08 allein (V). Stimme + Plosiv-Burst = 70 % zu ⅓. |
| kie | Kiefer | 5,0 | 0,5 / 1,0 N | Gehalten −40 dB nach 1 s ohne Atem-Erreger (V); Puls gut. |
| krs | Kreisel | 5,0 | 0,5 / 1,0 N | Gleichungen wie geschrieben kaputt (−21 HT bei y 0, +700 ct Overshoot, V); Lane-Rotoren leben 6 s. |
| wrm | Wurm | 5,0 | 0,4 N | Topologie loopt starr (V); Halteton gewöhnlich. |
| hgl | Hagel | 5,0 | 0,75 / 1,4 N | 30× Pegelschwankung ohne Normierung (V); gehalten One-Shot. |
| myk | Mykorrhiza | 4,5 | 0,3 / 0,6 N | 1/√n-Normierung bei jedem Start/Finish = Klickquelle ohne Rampen; Defaults Chaos (V); Schwarm hat Kreuz-FM. |
| brd | Brandung | 4,5 | 0,45 / 0,85 W | Unteroktav-Fenster 2–6 % des Fingerwegs, hysteretisch, 20–45 % Rauschen, Pegelsprünge 12–14 dB (V); Tabellen je form. |
| knl | Knolle | 4,5 | 0,4 + 0,3 N | Singleton-Buchführung, Zug ±35 ct kämpft mit Bend/Glides, Sub auf Handy unhörbar (V); JI-Idee = globales Feature. |
| brt | Brut | 4,5 | 0,5 N | Genom-Random-Walk zu den Klemmen (V); Timbre Schale/Glocke; Presets nicht reproduzierbar. |
| zwi | Zwiesel | 4,5 | 0,35 N | Cache-Thrash (5 Anschlagpunkte × Noten × 1–2 MB, V); Terz-Regel auf Pentatonik kaputt. |
| kps | Kapsel | 4,5 | 0,45 N | 80–160 Automations-Events/s je Stimme vom Main-Thread (Android-Risiko, A); Rohr-Singen existiert in Biquads nicht (V). |
| tum | Tümpel | 4,5 | 0,9 / 1,8 N | Pseudo-Bogen = Schale mit langsamem Einschwingen (V) → Harz-Körper. |
| dun | Düne (vereint) | 4,5 | 0,8–1,1 / 2,0 W | Angegebene 0,75 real ≈ 13 ohne Sub-Rate-Kopplung (V); K(y) = Schalter; > 250 Hz Buzz. |
| chi | Chitin | 4,5 | 0,8 / 1,7 W | Kaskade kann nicht crashen (V); Energiedeckel nötig; Gong vorhanden. |
| wal | Wal | 4,5 | 0,6 / 1,2 N | setValueCurveAtTime auf osc.frequency blockiert setF-Glide (V); nur 55–150 Hz. |
| brn | Bernstein | 4,0 | 1,1–1,7 + 8 (Kamm wie formuliert) W | FFT 4096 je Hop 270 µs gemessen (V), allokationsfrei in JS, Selbst-Hören konvergiert zu Rauschen; Körner-Echo macht 70 %. |
| frs | Frost | 4,0 | 0,65–0,95 N | Kurve endet 37–1321 ct neben dem Ton (V); Laser-Klischee → Tropfen-Material „Eis“. |
| rdl | Rudel | 4,0 | 0,95 / 2,0 N | Cartoon-Hund; Kontur-Automation kämpft mit setF (V). |
| nus | Nuss | 4,0 | 0,4 N | Physik auf falscher Skala (V); ein Prall = Kalimba → Erreger-Option. |
| snk | Schnecke | 4,0 | 0,6 W | Physik verbietet gestimmte Feder (V); Stimmformel 117 ct daneben. |
| sog | Sog | 3,5 | 0,6 N | Gesto widerspricht Release/Sustain; Brecher im Puls 200 ms spät (V). |
| hst | Hohlstamm | 3,5 | 0,7 „hard“ | Ventil spricht in 0–25 % des Rasters, 4–13 % zu hoch, Klick statt Ton im Puls (V). |
| don | Donner | 3,5 | 0,7 / 1,4 N | 10–20 lebende Stimmen je Spur sprengen 14 Einheiten (V); Grollen auf Handy unhörbar. |
| gwb | Gewölbe | 3,5 | 0,75 N | Q 400 Biquads: Bebung = Tremolo, Puls kann nicht einschwingen (V); Hauch mit mehr Bändern. |
| jhr | Jahresring (Band) | 3,0 | 0,2 + 0,4 N | 6 MB je 16-s-Stereo-Schleife, kein Bus-Slot im Budget (V); keine Klangquelle. |

## 3. Das Set (12), Reihenfolge = Bauempfehlung

| # | Key | Name | Mechanik | Typ | L1 | Ohne Worklet |
|---|---|---|---|---|---|---|
| 1 | hlm | Halm (+loh, +blg) | selbstschwingendes Rohr (Rohrblatt zuerst) | gehalten, Puls = Zungenstoß | 0,45 W | → Hauch |
| 2 | jrg | Jahresring | modaler Holzstab, Höhe = Anschlagort | geschlagen/Puls, gehalten als Stab | 0,65 N | nativ |
| 3 | rnk | Ranke | Scanned Synthesis, Finger = Hammer | beides | 0,4 W | → Nebel |
| 4 | mdr | Moder | Moden mit Energiefluss nach unten + Knistern | geschlagen/Puls | 0,55 W | → Glocke |
| 5 | zpf | Zapfen (+klf) | Kratzen/Stick-Slip, Rhythmus→Ton, Rast | beides | 0,45 W / 0,2 N | nativ |
| 6 | hrz | Harz (+dax, +tum, +blz) | Banded-WG + Bogen, 5–6 Körper | gehalten, Puls = Strich/Zupf | 1,05 W | → Schale |
| 7 | shn | Sehne (+drn) | Live-Waveguide-Saite, Hand/Flageolett/E-Bow/Jawari | beides | 0,6 W | → Saite |
| 8 | glt | Glut (+kre) | gestimmte Rückkopplung mit Nachglühen | gehalten, Puls mit Zustandsinjektion | 0,45 W | nativ 0,35 |
| 9 | amo | Amöbe | GENDY tonhöhenfest, Bass | gehalten, Puls = Zucken | 0,3–0,5 W | → Tiefe |
| 10 | boe | Böe | Äolsharfe mit Lock-in | gehalten, Puls = Böen-Zupf | 0,7 W | → Obertöne |
| 11 | elm | Elmsfeuer | Brummen→Knistern→Bogen, Zap | beides | 0,7 N | nativ |
| 12 | khl | Kehlchen | Syrinx-Lippen mit Schwelle | Puls/Sporenregen zuerst, gehalten mit Silben | 0,4 W | → Schwarm |

Reserven: **13 gsp Gespinst** (erst wenn Energie-Governor, κ_crit-Normierung und Singleton-Budget im `voiceLoad()` stehen), **14 rhz Rhizom** (als JS-Ereignisnetz + native Pings, Stimme per fertig-Nachricht), **15 gri Grille** (risikoärmster Lückenfüller, falls ein Worklet-Kandidat fällt).

Warum dieses Set:
- **Ship-Wahrscheinlichkeit zuerst:** 1–5 sind die fünf, deren Prüfungen keine ungelöste DSP-Frage offen lassen (Rohrblatt gemessen, Biquad-Stab, Scan ohne Feedback, Leistungs-ODE, Impulse+Resonatoren). Sie sind in 2–3 Wochen in Qualität da und zahlen die gemeinsame Worklet-Infrastruktur ein. 6–8 sind die Familien-Flaggschiffe mit geteiltem Code (Bogen, Saite, Schleife). 9–12 tragen Risiko im Klangdesign, nicht in der Numerik. Kehlchen ist bewusst Nr. 12: ohne Frequenz-Nachregler bleibt es Puls-Quelle.
- **Kosten:** Mittel 0,57 Einheiten je Stimme (Spanne 0,3–1,05), alles innerhalb der bestehenden VCOST1-Spanne; bei 14 Einheiten ≈ 13 Harz- oder 30 Halm-Stimmen. Kein Singleton im Set (deshalb Gespinst Reserve). L3 maximal 1,7 (Harz), unter Gong (2,8).
- **Robustheit:** nur Glut hat Rückkopplung mit Gewinn > 1 – und dort beschränkt tanh die Amplitude; alle anderen Schleifen (Harz, Halm, Sehne) haben Verluste < 1 und geklemmte Nichtlinearitäten. Kein Kandidat mit Main-Thread-Ereignisraten > 50/s je Stimme.
- **Diversität:** 3 Selbstschwinger (Halm, Harz, Kehlchen), 2 Saiten/Schleifen (Sehne, Glut), 3 Perkussion (Jahresring, Moder, Elmsfeuer), 2 Rhythmus/Material-Kontinua (Zapfen, Ranke), 2 Ambient (Böe, Amöbe). 6 gehalten-zuerst, 3 geschlagen-zuerst, 3 beides. Mit Körper-/Rohr-SELs decken 12 Einträge 20 Ideen.
- **Listen-Lösung:** Familien mit SEL (Harz 5 Körper, Halm 3 Rohre, Zapfen 4 Körper + Fels, Moder 3 Körper, Jahresring 2 Schnitte) statt Einzeleinträge.

## 4. Abgelehnt (Kurzgründe)

- **Gefaltet:** dax, tum, blz → Harz; loh, blg → Halm; kre → Glut; klf → Zapfen; drn → Sehne.
- **Feature statt Engine:** glw (Phasen-/Frequenzkopplung von Lanes und Fingern als Puls-/Gestik-Feature auf bestehende Engines), knl (zuhörender Grundton + adaptive JI im Geflecht), brt (Preset-Zucht/dice()), frs (Tropfen-Material „Eis“, negativer Chirp), nus (Kalimba/Saite-Erreger „Prallen“), jhr (Echo mit Tempo-Lock + Bandverlust).
- **Rückkopplung/Zustand als Hauptrisiko:** gsp (Reserve), myk, dun, rhz (Reserve, nur als Ereignisnetz).
- **Physik/Simulation gefallen:** brd, krs, wrm, snk, hst, fle (wie geschrieben), hgl (ohne Normierung), kps, zwi, chi, dax.
- **Zu teuer für Handy:** sld (1,4), brn (1,1–1,7 + FFT in JS), don (Spur-Polyphonie), pla (ohne Slot-Deckel bis 2,2).
- **Vorbild im Handel / kein Novum, das den Slot trägt:** stru, ast, uhz, trb, gri (Reserve), kie, wal, rdl, gwb, sog, unk, rau.

## 5. Gemeinsame Worklet-Infrastruktur (Pflicht vor Engine Nr. 1)

Ein Modul `MYZEL_DSP_SRC` als Blob-URL (Muster `TAP_SRC`/`setupCapture`, V), Datei-Fallback, mehrere `registerProcessor`.
- Basisklasse: Params `freq` (k-rate + In-Prozessor-Glide 5–20 ms), `detune` (a-rate, vom Bebung-Bus), `hoehe` (k-rate, geglättet), `gate`/`vel`; Nachrichten `burst`, `release`, `fertig` (Prozessor meldet RMS < −60 dB über 4 Blöcke → `v.cleanup()`).
- Schutz: NaN/Inf-Wächter je Block → Zustands-Reset statt Dauerstille; Denormal-Flush (Zustände |x| < 1e−20 → 0; V8 setzt kein FTZ, x86-Doubles bremsen ~100×, ARM meist nicht – A); DC-Blocker in jeder Schleife; tanh-Tabelle; Ausgangsrampe 5 ms vor Ende (Klickfreiheit).
- Bausteine: Fraktional-Delay (Lagrange 3), 2-Pol-Resonator (komplexe Rotation, 4,5 ns, V), One-Pole, Bogentabelle, Seed-PRNG (xorshift), Sinus-Tabelle.
- Testharness (OfflineAudioContext, pro Engine × 5 Tonhöhen × 3 Höhen × {gehalten, Puls 112 ms, Puls 500 ms}): f0-Fehler in Cent (Autokorrelation), Einschwingzeit bis −6 dB, Ausklang bis −60 dB, Spitzenpegel, NaN-Zähler, Kosten in ns/Sample. Akzeptanz: |f0| ≤ 5 ct (Selbstschwinger ≤ 10 ct), Einschwingen ≤ 300 ms gehalten, Puls-Hit hörbar ≥ −20 dB im Gate, keine NaN, Kosten ≤ Tabelle +15 %.
- Ohne Worklet: Zapfen/Glut/Jahresring/Elmsfeuer nativ, die übrigen auf die in §3 genannte Engine mappen und in der Bibliothek grau markieren.

## 6. Risikoregister für das Set

| Engine | Hauptrisiko | Gegenmaßnahme | Messgröße |
|---|---|---|---|
| Halm | Flöte überbläst in falschen Registern, > 1,2 kHz kippt | Rohrblatt-Default; Flöte mit Tabelle; Atem 0,05–1,15 | f0-Fehler je Register |
| Harz | Intonation, 1–2 s Einschwingen, Modus 2/3 gewinnt | Delay − Gruppenlaufzeit; Zupfimpuls; Gewichte 1/0,5/0,3; Druck 0,15–0,7 | f0, t_att, Modusverhältnis |
| Glut | statische Sättigung, Bebung verstimmt BP gegen Delay | G pro Sekunde; Glimmen-Random-Walk; beide auf einen detune | dB/s, f0 unter Bebung |
| Sehne | Zwilling von Saite bei mittlerer Höhe | Hand/E-Bow/Steg als Defaults hörbar | A/B gegen Saite |
| Moder | Grundton schwillt nicht | 70 % direkt zum Stamm, d_k ≥ 0,5/s | +dB Grundton bei 1,4 s |
| Ranke | Aliasing, Pegelschwankung | Hammerbreite ≥ 3 Massen, k_s-Klemme, keine AGC | Spektrum > 0,4 SR, Pegelspanne |
| Amöbe | > 1 kHz Zischen, DC | K je Periode, DC-Sperre, Bereich 50–500 Hz | f0-Lock, DC-Anteil |
| Böe | Totzonen = Stummheit | Grundton-Mindesterregung, Ein-Modus-Fang | Pegel über y |
| Kehlchen | Tonhöhe ±200 ct | Frequenz-Nachregler im Prozessor | f0-Fehler über (f, B) |
| Zapfen | Pulszug oben | Unregelmäßigkeit, Sub-Sample-Impulse | Spektrum-Flachheit |
| Jahresring | Altern frisst Session | Trefferzähler ratenbegrenzt, reversibel | Detune nach 10 min Puls |
| Elmsfeuer | Laser-Patch | Knistern gatet Bogen, Brummen 30–120 Hz | Hörtest früh |
