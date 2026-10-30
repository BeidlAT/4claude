# Hüllkurven für jede Klangquelle – Recherche und Vorschlag (30.10.2026)

Besitzer, 30.10.2026: „mehr Gestaltungsmöglichkeit bei den einzelnen Klangquellen … Attack, Sustain, Release … ADSR,
Hüllkurven … auch erweiterte Funktionen, ‚Frickler-Stoff‘.“ **Noch nichts gebaut** – Grundlage für die Entscheidung.

*Hüllkurve* = wie sich ein Wert über die Dauer eines Tons bewegt. *ADSR*: Attack (Einschwingen), Decay (Abfall nach der
Spitze), Sustain (Haltepegel, solange die Taste liegt), Release (Ausklingen nach dem Loslassen).

## Was Myzel heute hat

- **50 Klangquellen**, 34 halten (`sustain: true`), 16 werden angeschlagen. 17 sind nativ (`engines/engines.js`),
  33 laufen als Worklet-Prozessor (`dsp/*.js`, gemeinsamer Vertrag `dsp/contract.js`).
- **Lautstärke** jeder Stimme läuft über `v.out.gain` (`voices/voice.js`, `Voice`). Helfer dort: `adsrStart` (lineares
  Einschwingen auf `peak`), `sustainRelease` (Ausklingen per `setTargetAtTime`, Loslass-Tempo kürzt es), `burstEnv`
  (Puls-Schlag: Einschwingen–Gate–Ausklingen), `envAt` (Pegel rechnen, weil Firefox kein `cancelAndHoldAtTime` hat),
  `kill()` (35 ms aus, beim Stimmenklau in `voices/alloc.js` `steal`). Worklet-Stimmen: `wkVoice`, gehalten
  `wkHold` (`engines/rhizom.js`), angeschlagen `wkRing` (Pegel steht, der Prozessor klingt selbst aus).
- **Einschwingen/Ausklingen als Regler nur bei 8 Quellen** (`core/params.js`): `neb/kor/hau/obt/stm/swm/amo .att/.rel`,
  `tie.rel`; Abklingzeit `glo/mem/sai/sch/gng/klb/trp .decay`; „Nachklang“ bei Moder, Böe, Gespinst und den
  Worklet-Schlägern (`hng/gml/sit/tbl/kas/kto/spu .nachklang`, `gbs.ausklang`). Alle anderen gehaltenen
  Worklet-Quellen haben **feste** Werte im Code (z. B. Halm 4 ms / 80 ms, `wkHold(v, t, peak, 0.004, rel)`).
  Decay und Sustain im ADSR-Sinn hat **keine** Quelle.
- **Anschlag** (`vel`) wirkt nur auf den Spitzenpegel; Zeiten hängen nirgends davon ab.
- **Höhe** (`y`, Fingerhöhe) ist die Klangfarben-Achse jeder Quelle: Worklets haben dafür den Parameter `hoehe`
  (k-rate, d. h. ein Wert je 128 Samples), native Quellen `v.setY` (11 Stück, mit 40 ms Glättung über `setP`).
- **Bewegung** (`mov.vib/drift/pan`): globale LFOs auf den Tonhöhen-Bus (`v.mod`), nicht je Stimme.
- **Formen** (`mod/mod.js`, `MOD`, `modSet`/`modVal`): Summen-Ebene ohne Preset-Änderung; Ziele `hoehe`, `bend`,
  Filter, Hall … Quellen: Gestik, Fährte, Controller, Touché (`midi/touche.js`). Global oder „neuester Ton“ – keine
  echte Modulation je Stimme. MPE (Druck/Slide je Note) kommt in `midi/input.js` an und geht auf Höhe/Ausdruck.
- **Mixer-Kanal:** Transienten-Former `x….att/.aus` (`myzel-trans`) formt Anfang/Ausklang *nachträglich* für die
  ganze Gruppe – kein Ersatz für eine Hüllkurve je Ton. Puls (`puls/scheduler.js`) und Sporenwerk kennen schon
  Gate-Länge, Wahrscheinlichkeit (`prob`) und Ratschen (`arp.ratsche`).

## Was es anderswo gibt

| Instrument | Hüllkurven | Besonderes |
|---|---|---|
| Vital | DAHDSR, Kurvenstärke je Abschnitt | LFO zeichenbar, als Hüllkurve, Schleife; Zufall: S&H, Perlin, **Lorenz**; Matrix-Tab |
| Serum 2 | ADSR mit Kurven | LFO im „Envelope“-Modus mit Schleifenpunkt, Kurven ziehen, Matrix mit Kurve je Weg |
| Bitwig | ADSR, AHDSR, 4-Stage (Schleife, Takt), Segments/Curves (MSEG) | ~30 Modulatoren an jedem Regler, Hüllkurvenfolger |
| Phase Plant | Hüllkurven + „Curve“ | gezeichnete Formen mit Schleifenmodi |
| Ableton Operator | Mehrstufig | Schleifen-Modi None/Loop/Beat/Sync/Trigger |
| Animoog Z (iPad) | DAHDSR ×3 (Amp, Filter, Mod) | Schleife und Takt je Hüllkurve, Modulation je Finger |
| Buchla 281 | Rise/Fall-Funktionen | Modi Transient / Sustained / Cyclic, Paare um 90° versetzt |
| Make Noise Maths | Rise/Fall, Kurve log↔exp | Cycle = wird zum LFO, bis in den Hörbereich |
| Mutable Stages | Segmente frei kombinierbar | Schleife über Segmente, solange das Gate liegt |
| Elektron | ADSR | Parameter-Locks je Schritt, Bedingungen, Wahrscheinlichkeit |
| MPE-Controller | – | Druck, Slide, Lift je Note als Modulationsquelle |

*MSEG* = Mehrpunkt-Hüllkurve, frei gezeichnet. *Modulationsmatrix* = Tabelle „Quelle → Ziel, Menge“.

## Was in Myzel geht und Sinn ergibt

### Stufe 1 – klassisches ADSR je Klangquelle (Lautstärke)
- Je Quelle vier Regler **Einschwingen, Abfallen, Halten (Pegel), Ausklingen**, dazu **Kurve** (weich–linear–knackig)
  und **Anschlag → Zeit** (fester Anschlag = schnelleres Einschwingen) und **Tonhöhe → Zeit** (hohe Töne kürzer, wie
  bei echten Instrumenten). Grundwerte = heutiger Klang, auf Grundwert bitgleich (wie Sättigung/Transienten-Former).
- Die bestehenden `….att/.rel` werden Teil davon (gleiche Schlüssel, alte Presets bleiben gleich); die festen Werte
  der Worklet-Quellen werden zu Grundwerten.
- **Angeschlagene Quellen:** dort heißt es *Abklingen* und *Abdämpfen beim Loslassen* (optional: wie ein Klavierdämpfer,
  Ausklingen ab Note-off statt durchklingen). Sustain gibt es dort nicht.
- **Puls:** `burstEnv` nimmt dieselbe Hüllkurve mit der Gate-Länge des Schritts.

### Stufe 2 – zweite Hüllkurve mit Ziel-Wahl
- Hüllkurve 2 mit Ziel **Helligkeit/Höhe** (bei jeder Quelle vorhanden – das Naheliegendste), **Tonhöhe** (Pitch-
  Sweep, Kick-artig, ± Halbtöne) oder **quellen-eigenes Ziel** (z. B. Halm: Atemdruck, Harz: Bogendruck, Saite:
  Dämpfung, Glocke: FM-Index). Menge ±, Anschlag → Menge.
- Für Klangqualität entscheidend: Höhe heute k-rate bzw. mit 40 ms geglättet – für einen knackigen Filter-Sweep zu träge.
  Die Hüllkurve muss **im Prozessor je Sample** laufen (Worklets) bzw. **direkt auf die AudioParams** der nativen Quelle
  (je Quelle ein kleiner Adapter `v.env2(t, kurve)`).

### Stufe 3 – Frickler
- **Zeichenbare Mehrpunkt-Hüllkurve** (bis ~16 Punkte, Kurve je Abschnitt), mit **Halte-Schleife** (Abschnitt wiederholt,
  solange die Taste liegt, danach Ausklingen – wie Stages) und **Zyklus** (läuft frei als LFO, wie Maths/Buchla),
  frei in Sekunden oder **im Takt** des Puls.
- **Zufall:** S&H-Stufen, weiches Rauschen (Perlin), **Lorenz-Chaos** – je Stimme anders (eigener `seed` gibt es schon).
- **Kleine Modulationsmatrix je Klangquelle:** Quellen = Hüllkurve 1/2, MSEG, Zufall, Anschlag, Tonhöhe, Druck/Slide
  (MPE), Touché-Achsen, Gestik; Ziele = Pegel, Höhe, Tonhöhe, Panorama, quellen-eigene Regler. Je Weg Menge und Kurve.
  Das ergänzt Formen (global) um **echte Modulation je Stimme**.
- **Puls/Sporenwerk:** Hüllkurven-Werte als Parameter-Lock je Schritt, Hüllkurve mit Wahrscheinlichkeit, Ratschen
  innerhalb einer Hüllkurve (neu anschlagen statt neu starten).
- **Druck → Hüllkurve:** bei MPE/Touché kann der Druck den Halte-Pegel *ersetzen* („Streichen“ gibt es schon als Idee).

## Bedienung (Touch, Myzel-Stil)
- Ein **Bild der Kurve** in der Klangquellen-Karte, Punkte direkt mit dem Finger ziehen (waagrecht = Zeit, senkrecht =
  Pegel), Kurvenstärke durch Ziehen der Linienmitte (wie Serum). Griffe ≥ 44 px auf `pointer: coarse`, Zeitachse
  logarithmisch, damit 5 ms und 8 s beide greifbar sind. Daneben die Zahlen-Regler für die Tastatur (PC/Firefox).
- **Leuchtender Punkt läuft mit**, solange ein Ton klingt (Rückmeldung je Stimme vom Prozessor, nur für die Anzeige).
- Stufe 3 hinter „Mehr …“ einklappbar – die Karte bleibt für den, der nur spielen will, so ruhig wie heute.
- Wörter: Einschwingen · Abfallen · Halten · Ausklingen · Kurve · Schleife · Zyklus · Zufall.

## Aufwand und Risiken
- **Quellen mit eigener Physik:** Eine Lautstärke-Hüllkurve auf `v.out` ist bei Halm, Harz, Kehlchen, Didgeridoo &
  Co. nur ein *Fader* – das Rohr spricht trotzdem mit seinem eigenen Einschwingen an. Klanglich besser (Besitzer-Regel):
  Einschwingen geht auf die **Anregung** (Atem, Bogendruck, Hammerhärte), der Ausgangspegel nur als Sicherung.
  Bei Schlägern wirkt „Ausklingen“ als **Resonator-Dämpfung** im Prozessor (hohe Teiltöne sterben zuerst, wie eine Hand
  auf der Saite) statt als Pegel-Blende. Das heißt: 33 Prozessoren je einzeln anfassen – der größte Posten. Jede
  Quelle bekommt eine Zeile „Was die Hüllkurve hier bewegt“.
- **Firefox (Hauptbrowser) hat kein `cancelAndHoldAtTime`** (MDN-Kompatibilitätsdaten). Mehrstufige Kurven mit
  Exponential-Abschnitten auf AudioParams ließen sich dort nicht klickfrei unterbrechen (Loslassen im Decay, Neuanschlag,
  Stimmenklau) – `envAt` kann heute nur das lineare Einschwingen nachrechnen. **Darum: die Hüllkurve rechnet im
  Worklet**, sample-genau, Zustand immer bekannt, Neuanschlag ab aktuellem Pegel. Für Worklet-Quellen in `contract.js`
  (gemeinsam für alle 33, neue Nachrichten `{env:…}`), für die 17 nativen ein kleiner Prozessor `myzel-huelle` je
  Stimme, dessen Ausgang `v.out.gain` steuert (a-rate). Ohne AudioWorklet: heutiger Weg als Ersatz.
- `setValueCurveAtTime` (überall vorhanden) taugt für gezeichnete Kurven nicht: Überschneidungen sind verboten,
  Unterbrechen ist genau das Firefox-Problem.
- **Rechenlast:** im bestehenden Prozessor ein paar Multiplikationen je Sample – nicht messbar. Ein zusätzlicher Knoten je
  nativer Stimme kostet den Aufruf-Overhead eines AudioWorkletNode; Matrix/Zufall/MSEG je Stimme etwas mehr. Ehrlich mit
  `dev/tests/klang/tests/cost.js` messen und in `VCOST` eintragen – kein Grund, etwas wegzulassen. Kein Müll im
  Audio-Thread (feste Float32Arrays, siehe `dev/tests/worklet-gc/`).
- **Tests:** Hüllkurven-Form je Quelle offline rendern (t90, −60-dB-Zeit), Klick-Test bei Loslassen in jedem Abschnitt,
  Neuanschlag, Stimmenklau; auf Grundwerten bitgleich zu heute. Läuft nur in Chromium – Firefox muss der Besitzer hören.
- **Reihenfolge:** Stufe 1 (Hüllkurve in `contract.js` + `myzel-huelle`, UI-Kurve) → Stufe 2 (Ziel Höhe/Tonhöhe, dann
  Anregung je Quelle) → Stufe 3. Jede Stufe ändert den Klang nur, wenn man dreht.

## Quellen
- MDN Browser-Kompatibilität AudioParam (`cancelAndHoldAtTime`: Chrome 57, Safari 14.1, Firefox nein – Bug 1308431):
  https://github.com/mdn/browser-compat-data/blob/main/api/AudioParam.json · https://bugzil.la/1308431
- MDN AudioParam (a-rate/k-rate, setTargetAtTime, setValueCurveAtTime): https://developer.mozilla.org/docs/Web/API/AudioParam
- Web-Audio-Spezifikation: https://webaudio.github.io/web-audio-api/
- Vital (Quelltext, Random-LFO mit Lorenz): https://github.com/mtytel/vital · https://forum.vital.audio/t/is-there-any-documentation/6814
- Vital Modulation (Kurs): https://dsu-digital-sound-design.github.io/f-22-DAD-222-Audio-Production-I/lectures/week-11/vital-pt-3
- Serum (Envelope-Modus, Schleifenpunkt, Kurven): https://cymatics.fm/blogs/production/serum-tutorial-25-tips ·
  https://www.musicradar.com/how-to/how-to-understand-xfer-records-serums-modulation-setup
- Bitwig Modulatoren: https://bitwig.com/userguide/latest/modulator · https://www.bitwig.com/en/bitwig-studio/devices/modulators.html
- Phase Plant: https://kilohearts.com/products/phase_plant · https://www.gearnews.com/kilohearts-announce-v2-massive-free-update-for-all-plug-ins
- Minimal Audio (Hüllkurven-Schleife, Kurve): https://manual.minimal.audio/current-manual/modulation/envelope
- Ableton Operator Schleifen-Modi: https://musicradar.com/how-to/the-definitive-guide-on-how-to-use-operator-in-ableton-live
- Animoog Z: https://www.synthtopia.com/content/2021/11/23/moog-music-releases-animoog-z-new-sound-design-production-performance-app/
- Buchla 281: https://buchla.com/product/281/ · https://helpwiki.evergreen.edu/wiki/images/3/30/Buchla_281_Quad_Function_Generator.pdf
- Make Noise Maths: https://www.manualsdir.com/manuals/698361/make-noise-maths.html?page=5
- Mutable Instruments Stages: https://mutable-instruments.net/modules/stages/downloads/stages_quickstart.pdf
- Elektron P-Locks/Bedingungen: https://www.elektronauts.com/t/trig-condition-vs-probability/133488
- MPE: https://midi.org/midi-polyphonic-expression-mpe
- Chaos-Modulatoren: https://store.cherryaudio.com/modules/f-chaosc · https://patchstorage.com/chaotic-attractor-pack-faithful-recreations-of-3-dynamical-systems-to-use-as-lfos-sound-generators-or-as-is/
