# Röhre & Vintage in der Verzerrung (31.10.2026)

Besitzer: „Können wir hochwertige Röhrensimulationen o. ä. einbauen? Auch in Richtung Vintage. Recherchiere, was sich
umsetzen lässt – schreib eigenen Code, von Grund auf, im Myzel-Stil, unique.“

## Gebaut: Prozessor `myzel-roehre` (`myzel/src/js/dsp/roehre.js`), vier neue Arten
| Art | Modell | Farbe |
|---|---|---|
| Vorstufe | zwei 12AX7-Stufen: Koren-Anodenkennlinie gegen die Lastgerade (250 V, 100 kΩ, Kathode 1,5 kΩ) als Tabelle; Koppelkondensator 22 nF, Gitterableitwiderstand 1 MΩ, Gitterstrom (Dempwolf/Zölzer), je Probe zwei Newton-Schritte nur wenn das Gitter leitet → Arbeitspunktverschiebung („blocking“, Aufblühen, pegelabhängige gerade Obertöne); Miller-Tiefpass | dunkel/voll → offen/straff (Kathoden-Bypass als Bass-Schnitt 18 → 250 Hz, Miller 5 → 17 kHz) |
| Endstufe | Phasendreher, Gegentakt nach Child-Gesetz (Tabelle), Ruhestrom wird mit der Stärke kälter (Übernahme-Körnung), Hälften 2 % ungleich, Versorgung als weiche Decke (tanh), Sag (Hüllkurve, Decke sinkt), Ausgangsübertrager (Eisen) | Halbleiter-Gleichrichter (Sag −0,7 dB) → Röhrengleichrichter (−3,6 dB, langsam, „atmet“) |
| Übertrager | Eingangsübertrager (Fluss = Integral der Spannung, Sättigung mit φ³ – Bässe zuerst), Class-A (2./3. Oberton, weich begrenzt), Ausgangsübertrager | wenig Eisen/sauber → viel Eisen/dicht |
| Tonband | Aufnahme-Vorverzerrung (NAB/CCIR-Zeitkonstanten), Magnetisierung über anhysteretische Kurve mit ratenunabhängiger Hysterese + Vormagnetisierung (leise bleibt sauber), Wiedergabe-Entzerrung, Kopfresonanz + Senke, Spalt-/Abstandsverlust, Subsonic-Filter, Leiern (0,55 Hz) und Flattern (7,3 Hz) für beide Kanäle gleich | Geschwindigkeit 7,5 → 15 → 30 ips |

Gemeinsam: 4× Überabtastung (zwei linearphasige Kaiser-Halbbänder, 95 und 31 Abgriffe: −92 dB ab 28 kHz bzw. −84 dB ab
72 kHz, flach bis 20 kHz, ≈ 1,1 ms Verzögerung – der WaveShaper der „Röhre“ hatte 4 ms); Anteil wird im überabgetasteten
Bereich gemischt (kein Kammfilter); ADAA erster Ordnung (Parker/Zavalishin/Le Bivic) auf Triodentabelle, Gegentakt und
Bandkennlinie; lineare Klangfilter und Leiern auf Grundrate; automatischer Pegelausgleich je Einstellung (Modell auf
Testsignal, über Blöcke verteilt); Gleichanteil-Filter; Zustände, die weglaufen, starten neu; nach 1 s Stille ruht er.
Ohne AudioWorklet steht die alte „Röhre“ ein.

## Gemessen (Node, `dev`-Messskript; Browser-Test `dev/tests/midi-tests/t-roehre.js` 13/13, nur Chromium)
- Obertöne bei 187,5 Hz, −12 dBFS: Vorstufe H2 −29 dB (Stärke 0,25) → −3 dB (0,95); Endstufe ungerade (H3 −26 → −10 dB,
  H2 < −50); Übertrager H2 −30 dB leise, H3 −14 dB laut; Tonband ungerade (H3 −38 → −13 dB).
- Leise (−40 dBFS): Klirr 54–120 dB unter dem Ton.
- Aliasing, 7,1 kHz voll angefahren, Stärke 0,6: Vorstufe −61 dB, Endstufe −101 dB; bei Stärke 0,95 (extrem): −36 / −47 dB.
- Tonband-Frequenzgang (−40 dBFS, rel. 1 kHz): 7,5 ips +1,4 dB @30 Hz, −4 dB @10 kHz, −13 dB @15 kHz; 15 ips +1,9 dB @50–70 Hz,
  −4,5 dB @15 kHz; 30 ips +2,2 dB @110 Hz, −3 dB @15 kHz.
- Kosten (Einheiten = Nebel-Stimmen, gegen Sättigung 1,41): Vorstufe 8,4, Endstufe 6,3, Übertrager 3,0, Tonband 7,5 – je Kette,
  die ihn laufen hat (`FX_COST.roehre`, in `fxLoad`).

## Gefundene und behobene Fehler beim Bauen
- Zweite Überabtaststufe lief über zwei getrennte Filter (je nur jede zweite Probe) → Spiegelbilder; ein Filter je Stufe.
- Endstufe ohne obere Begrenzung + Sag schaukelte sich auf → Versorgung als weiche Decke.
- ADAA-Integral der Triode außerhalb der Tabelle abgeschnitten → fortgeführt.
- Bandhysterese zu träge → Auslöschung in den Höhen bei leisen Signalen → Vormagnetisierung (25 µs), kleinerer Schleifenanteil.

## Offen / Ideen
- Ohr des Besitzers in Firefox; Feinabstimmung der Charaktere.
- Mögliche weitere Arten: Germanium-Diode/Fuzz (Recherche Abschnitt 5), Vari-Mu/Opto-„Kleber“.
- Volle Jiles-Atherton-Hysterese (Chowdhury) wäre genauer, kostet ~2× – nur auf Wunsch.

Quellen: Koren (Tube-SPICE), Dempwolf & Zölzer DAFx 2011, Pakarinen & Yeh CMJ 2009, de Paiva et al. EURASIP 2011
(Übertrager), Chowdhury DAFx 2019 (Band), Parker/Zavalishin/Le Bivic DAFx 2016 (ADAA).
