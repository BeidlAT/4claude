# Designer-Ideen: zehn Klangquellen aus Wetter, Gestein, Feuer, Tiefsee und Hochspannung

Perspektive: Film-/Game-Sounddesign. Gesucht sind Quellen, die wie reale Phänomene klingen (Knarren, Domluft, Lichtbögen, Walrufe, Wolfsgeheul, singende Flammen, Donner, dröhnender Sand, Brecher, Hagel), aber auf der Spielfläche **gestimmt und spielbar** sind: Tonhöhe = Spalte, Höhe (y) = der physikalische Regler, der das Verhalten kippt (nicht nur Helligkeit, V musicians.md P1/P2). Alles hält den Engine-Vertrag aus `code-map.md` §3/§11: `start(v,t,f,y,vel,o)`, `setF`/`setY` nur mit `glideTo`/`setP`, jede tonhöhentragende `detune` über `v.mod()` (Bebung, Vibrato, Pitch-Wheel), `o.burst` → `burstEnv`, Stufe 3 (`Q.rich`) = mehr, nie anders.

Legende: **V** = verifiziert (Quelle), **A** = angenommen (eigene Rechnung, Standardwissen, nach Gehör zu kalibrieren). Kosten in Nebel-Einheiten (1,0 = eine Nebel-Stimme Stufe 1); Bausteinpreise aus `webaudio.md` §4 (V, gemessen): native Node ≈ 0,03, Biquad ≈ 0,06, Oszillator+Gain ≈ 0,09, Rausch-BufferSource ≈ 0,12 (A, aus Hauch 0,3 abgeleitet), leeres Worklet-Node ≈ 0,06, Worklet-AudioParam ≈ 0,03, 16 Worklet-Resonatoren ≈ 0,6.

Schlüssel frei (geprüft gegen die 14 Engines und die Schwester-Listen biologist/composer/inventor/performer): `klf gwb elm wal rdl loh don dun sog hgl`.

## 0. Gemeinsame Regeln und zwei gemeinsame Bausteine

1. **Totzonen-Shaper („Knisterquelle“)**: `noiseSrc → BQ lowpass(f_rate) → WaveShaper(A.ddCurve) → BQ highpass → Gain`. Die Kurve `ddCurve(x) = 0 für |x| < 0,55, sonst sign(x)·((|x|−0,55)/0,45)³` (einmal gebaut, `makeShaperCurve`, Kurven-Setzen ist teuer, V synthesis.md §1.2) macht aus glattem Rauschen **einzelne Impulse**; ihre Rate steuern Tiefpass-Cutoff und Vorverstärkung (mehr Pegel = mehr Schwellen-Überschreitungen), ihre Schärfe der Hochpass. Vier native Nodes ≈ 0,15 (A). Genutzt von Elmsfeuer, Lohe, Hagel, Donner. Rauschquellen starten mit Zufallsoffset (`ns.start(t, rand(0,1.8))`, V index 3596), damit die 2-s-Schleife (V code-map 2807) keine Muster wiederholt.
2. **`fold(f)`**: Faltung in eine Bassoktave wie `tie.base` (V code-map §4) – für Donner, Sog und das Netzbrummen von Elmsfeuer.
3. **Worklet**: zwei Prozessoren (`myzel-creak`, `myzel-dune`) im gemeinsamen Modul `MYZEL_DSP_SRC` nach `webaudio.md` §10 (ein Node je Stimme, Params `detune`/`freq`/`hoehe` k-rate, Hüllkurven nativ auf `v.out`). Beide haben einen nativen Fallback.
4. **Nie stumm** (`dice()` spielt jede Engine zufällig, V code-map §9): jede Quelle hat bei y = 0 und jeder Parameterecke einen hörbaren Grundzustand.
5. **Pegel**: Peaks auf die Referenz einpegeln (neb 0,48, hau 1,0, trp 0,67, V code-map §4); Rausch-Engines mit `tanh`-Shaper ohne Oversampling (V webaudio §7).

---

## 1. Kluft (`klf`) – Knarren, das unter Last zum Ton wird

- **Pitch:** „Knarrendes Gestein – Stick-Slip-Reibung, die vom einzelnen Ächzen bis zum kreischenden Ton dichter wird“
- **Gehalten.** `sustain: true`.
- **Klang (10 s):** Finger unten: einzelne trockene Knarrer, 2–8 pro Sekunde, jeder ein kurzer Ratsch mit fallender Tonhöhe in einem hohlen Steinkörper – unregelmäßig wie ein Schiffsrumpf, ein Eisschelf, eine alte Tür. Finger steigt: die Knarrer werden dichter (20–60/s), knattern; oben verschmelzen sie zum **Ton auf der Note**: rau, nasal, mit Flattern und einem Hauch Kreischen (Bogen auf Stein). Loslassen: zwei, drei Nachknarrer, der Körper klingt kurz nach. Puls-Stoß: ein Ruck (3–6 Knarrer und ein Rest).
- **Novum:** Stick-Slip-Reibung mit Geschwindigkeitsschwächung ist die Ursache von Türknarren, Eisschelf-Ächzen, Erdbebenruckeln und Bogenstrich (A, Standardphysik; Burridge–Knopoff-Modell). Myzel hat keine Reibung (V synthesis.md §0). Schwestern: Harz (Banded-Waveguide-Bogen auf Resonator), Zapfen (Kratzstab) – dort ist die Reibung *Anregung* eines Objekts; in Kluft ist der **Relaxationsoszillator selbst die Quelle**, und seine Rate wandert mit der Last von Rhythmus zu Tonhöhe und rastet auf der Note ein. Sounddesign-Werkzeuge liefern Knarren nur als Aufnahme (A).
- **DSP (Worklet `myzel-creak`, nativer Fallback):**
  Block auf Feder: `F = k·(u − x)`, Antrieb `u += v_d·dt`. Haften, solange `|F| < F_s`; Gleiten mit `F_k(v) = F_s·(0,4 + 0,6/(1 + |v|/v_0))` (schwächer bei Geschwindigkeit → Ruck), bis `v → 0` → wieder haften. Jeder Slip speist einen Impuls `+Δx` in (a) einen Klick-Resonator (1,5–4 kHz, 3 ms) und (b) die Körper-Modalbank (4 Moden, Stufe 3: 8; `Holz` 1 : 1,47 : 2,09 : 2,56, `Stein` 1 : 2,756 : 5,404 : 8,933, V synthesis.md §2.9 Csound/STK; `Eisen` 1 : 2,32 : 4,25 : 6,63 mit T60 ×2), gestimmt auf `f` und Nachklang 0,2–1,2 s. Tonhöhen-Lock: Gleitstrecke `L` und `v_d = f·L` → bei Dauergleiten wiederholen sich Slips mit `f`. Last `y`: Haftkraft `F_s(y) = F_0·2^(8·(1−y))` → Rate `≈ f·2^(−8(1−y))`: y 0 ≈ f/256 (1–2 Hz bei 440 Hz), y 0,5 ≈ 27 Hz (Knattern), y ≥ 0,8 → f (Ton). `F_s` zusätzlich mit Random Walk ±30 %·`Zufall` (Knarrer bleiben unregelmäßig; im Ton bleibt ±0,5 % Periodenrauschen, damit es nie zum Sägezahn wird). Ausgang `tanh`. `detune` (k-rate) auf `f` (Rate und Körper), `hoehe` = Last, `freq`.
  **y** = Last (Rate, Regelmäßigkeit, Kreischanteil). **vel** = Pegel + Anfangsruck (Serie schneller Slips, 80 ms). **burst** = `v_d` hoch für `gate`, dann Ausrollen über 0,4 s·`decayMul` (Nachknarrer); `burstEnv(min(att,0.02), gate, 0.5)`.
  Native Fallback (A): `OSC(PeriodicWave 'impuls')` mit Rate `r(y)`, FM-Jitter `noise → LP 25 Hz → Gain((1−y)·0,4·r) → osc.frequency` (a-rate erlaubt), → 4 BQ-Bandpässe als Körper. Verliert den echten Ruck, behält das Rhythmus→Ton-Kontinuum.
  **Stufe 3:** zwei Reibflächen L/R (eigene `F_s`-Walks, ±7 ct), 8 Moden, Kreuzkopplung 10 % (eine Fläche löst die andere aus → Doppelknarrer).
- **Parameter (6):** Last 0,45 (Lastoffset zu y; verschiebt die Tonschwelle), Körper SEL Holz/Stein/Eisen (Stein), Griff 0,5 (Haft-/Gleitverhältnis = Rauheit), Zufall 0,5 (Random-Walk-Tiefe), Nachklang 0,6 s, Klick 0,4. `MACRO.klf = ['klf.last','klf.griff']`.
- **Spiel:** Finger langsam heben = Rhythmus wird Ton (Kante bei ≈ 0,7, P1); Neigung (Gestik-Höhe) = Last; Schütteln = Ruck; Bebung = Vibrato des Kreischens; Puls mit kurzen Gates = Knarr-Rhythmen, lange Gates = Dauerton mit Rucken; als Ebene 2 unter Nebel = Rumpf eines Schiffs.
- **Kosten (A):** Worklet ≈ 25 Flops + 5 Resonatoren ≈ 0,06 + 0,09 (3 Params) + 0,25 → **≈ 0,45**; Fallback ≈ 0,65; Stufe 3 ≈ 0,9.
- **Risiken:** y = 0 darf nicht „nichts“ sein → Mindestrate 1,5 Knarrer/s; Rhythmus↔Ton-Übergang braucht Hysterese (±5 % Last), sonst flackert er beim Zittern der Höhe (≤ 30×/s, V code-map 9780); Ton-Phase klingt ohne Körper wie Buzz → Körper + Klick Pflicht; Worklet-Thread-Wechsel (V webaudio §2) ist eine Einmal-Entscheidung des Moduls, nicht dieser Engine.

---

## 2. Gewölbe (`gwb`) – stehende Luft in einem Dom

- **Pitch:** „Stehende Luft in einem Gewölbe – der Raum selbst findet den Ton, atmet ihn und lässt ihn nicht los“
- **Gehalten.** `sustain: true`.
- **Klang (10 s):** Finger drauf: ein kaum hörbares Luftziehen; über 1–2 s **verdichtet** sich daraus ein Ton auf der Note, wie die stehende Welle eines riesigen Raums: fast rein, aber mit langsamem Schweben, weil die Raummoden knapp neben den Harmonischen liegen (2,0 f, 1,6 f, 2,6 f …), und einem sanften Pumpen der Lautstärke (Rauschen in einer hohen Güte). Finger hoch = Druck: Quinte und Oktave schwellen, ein Zug am Portal (turbulentes Rauschband), feines Pfeifen. Loslassen: der Raum klingt 3–8 s weiter und sinkt ins Grollen. Akkorde: jeder Ton ein eigenes Gewölbe, die Räume schweben gegeneinander. Puls-Stoß: Luftstöße, die einen Nachhallhof hinterlassen.
- **Novum:** Hall macht Räume *nach* dem Klang; hier ist der Raum **die Quelle** (Lucier „I am sitting in a room“ als Instrument). Schwester Kreislauf (composer) baut eine elektrische Larsen-Schleife mit Gewinn unter dem Finger – Gewölbe ist rein akustisch: Rauschen in Hoch-Q-Raummoden, kein Feedback, kein Kippen ins Quietschen, dafür Ankunftszeit, Grundriss-Modensatz und Nachhall als Release. Hauch = Rauschen → **ein** Bandpass, sofort und beweglich (V code-map §4); Gewölbe steht, wächst und bleibt.
- **DSP (nativ):**
  `noiseSrc → Gain Luft (Hüllkurve) → N BQ bandpass (Q 40–400) → Gains → v.out`. Modensatz aus einem Quader mit L = c/2f, W = L/a, H = L/a²: `f_k = f·[1, a, 2, √(1+a²), a², 3]` (A, Standardformel `f_nml = c/2·√((n/L)²+(m/W)²+(l/H)²)`); Default a = 1,618 → 1 : 1,618 : 2 : 1,902 : 2,618 : 3 (neutrale Sexte und große Dezime – fremd, aber konsonant); a = 1,5 → 1 : 1,5 : 2 : 1,8 : 2,25 : 3. Stufe 1 nimmt die ersten 4 Moden, Stufe 3 alle 6 + (2,1,0). Jede Mode ±0,4 % fest je Stimme (Raum-Asymmetrie → Schweben), Güte `Q = 40·10^(Stein)` (40–400). Die Modengains: Grundmode 1, obere `g_k = 0,25·(1 + 2·Druck·y)/k`. Portal: `noise → BQ bandpass(f·(4 + 4y), Q 1) → Gain(Wind·y²)`. Ankunft = `adsrStart(att = Ankunft)` auf `v.out`; Release = `sustainRelease(rel = Nachhall)` (die Moden klingen physikalisch weiter: τ = Q/(π f), bei 110 Hz und Q 300 ≈ 0,9 s – tiefe Räume sind langsamer, das ist richtig so). `v.mod(bq.detune)` für alle Moden (Bebung = ein vibrierender Raum). `setF`: `glideTo` auf alle Frequenzen (der Raum ändert seine Größe). `setY`: `setP` auf die oberen Gains und das Portal.
  **y** = Druck (obere Moden, Wind, Pfeifen). **vel** = Luftmenge (Pegel) und kürzere Ankunft (hart = Türschlag: Ankunft × 0,3). **burst** = `burstEnv(min(Ankunft, gate·0,5), gate, Nachhall·0,5·decayMul)` – der Hof bleibt über das Gate hinaus.
  **Stufe 3:** 7 Moden, ungerade L / gerade R, zweite Rauschquelle (zwei Portale), ±3 ct Drift über `A.uni`.
- **Parameter (6):** Grundriss 1,618 (1,2–2,0; Seitenverhältnis = Modensatz), Stein 0,7 (Güte, exp), Druck 0,5, Wind 0,3, Ankunft 1,2 s, Nachhall 4 s. `MACRO.gwb = ['gwb.stein','gwb.druck']`.
- **Spiel:** Liegenlassen (P8: das Pumpen der Hoch-Q-Moden ist Rayleigh-Zufall, nie gleich); Akkorde langsam aufbauen; Neigung = Druck; Puls mit langen Gates = atmende Flächen; Ebene 2 unter Stimme oder Obertöne = Kathedrale.
- **Kosten (A):** Rauschen 0,12 + 4 BQ 0,24 + Portal-BQ 0,06 + 6 Gains 0,18 → **≈ 0,6**; Stufe 3 ≈ 1,2. Hängende Release-Stimmen (bis 8 s) zählen im Budget → Nachhall-Obergrenze 8 s.
- **Risiken:** Rausch-erregte Hoch-Q-Moden haben Zufallseinbrüche (Pegel geht kurz auf fast null) → ≥ 2 Moden + leises direktes Rauschbett (−40 dB); Q-Obergrenze von `BiquadFilterNode` nicht verifiziert (A: 1000 in Blink?) → bei 400 bleiben und prüfen; Abgrenzung zu Hauch im Text (steht/wächst statt bewegt) und in den Defaults (Ankunft ≥ 0,8 s).

---

## 3. Elmsfeuer (`elm`) – Netzbrummen, Knistern, Lichtbogen

- **Pitch:** „Elmsfeuer – Netzbrummen auf der Note, Korona-Knistern und Lichtbögen, die Fingerhöhe dreht die Spannung hoch“
- **Gehalten.** `sustain: true`.
- **Klang (10 s):** Unten ein hartes, kantiges Brummen auf der Note (wahlweise in die Bassoktave gefaltet), mit dünnem Obertonsirren, leicht instabil. Steigt der Finger, setzt **Knistern** ein – vereinzelte scharfe Ticks, die zum Brutzeln dicht werden. Weiter oben zünden **Lichtbögen**: ein kreischender Ton ein bis zwei Oktaven über der Note, der stottert, in Quinten und Oktaven springt (in der Tonart), abreißt und wieder zündet, mit Plasma-Rauschband; ganz oben steht der Bogen durch. Loslassen: das Brummen fällt mit einem Klick weg, letzte Knisterer. Puls-Stoß: ein Zap (Bogenzündung mit Knisterschweif).
- **Novum:** Elektrische Klänge in Apps = Verzerrer/Bitcrusher. Hier ist die **Spannungsleiter** (Brummen → Korona → Bogen) eine Fingerbewegung; Bögen singen in der Tonart (Duddells „singender Lichtbogen“ 1899, A). Myzel hat Tiefe (Growl-Bass) und Schwarm (FM-Chaos); keine Schwester-Idee ist elektrisch. Mechanismus-Unterschied zu Kluft: hier ist das Brummen immer da, das Knistern stochastisch, der Bogen ein gestufter Oberstimmen-Oszillator.
- **DSP (nativ):**
  - **Brumm:** `OSC(PeriodicWave 'elm')` (Harmonische 1–24, `1/n`, gerade Harmonische 2/4 +6 dB wie Netzbrummen) bei `f_b = Netz ? fold(f) : f`, plus die Note selbst bei −10 dB, wenn gefaltet → `WaveShaper tanh(3x) leicht asymmetrisch` → BQ highpass 30 Hz. Instabilität: `A.driftBuf`-Walk ±4 ct via `v.lnk`.
  - **Knistern (Korona):** Knisterquelle (§0.1): Tiefpass `30 + 3000·y²` Hz, Vorverstärkung `0,6 + 1,2·y` (Rate), Hochpass 1,5 kHz, Gain `Knistern·(0,2 + y)`.
  - **Lichtbogen** (ab `y > 0,55·(1 − Spannung) + 0,3`): `OSC sawtooth` bei `f·2^Reichweite`; Tonhöhensprünge über einen **Stufenpuffer** (`A.elmSteps`, 2 s, vorgerechnet: alle 30–120 ms ein Wert aus {0, +700, +1200, −500, +1900} ct) als `AudioBufferSource(loop) → Gain(1) → osc.detune` (Cent); Stottern über zwei Gate-Puffer (`A.elmGate[0/1]`, dünn/dicht, zufällige An/Aus-Blöcke) → Gains, Crossfade nach y. Bogen → BQ bandpass (`f_arc·3`, Q 2) → `tanh` → Gain(Bogen).
  - Alle Oszillator-`detune` über `v.mod()` (Brumm, Note, Bogen). `setY` → `setP` auf Knister-Cutoff/-Vorverstärkung, Bogen-Gain, Gate-Crossfade. `setF` → `glideTo` auf Brumm/Bogen.
  **y** = Spannung (Knisterdichte, Bogen an/aus, Durchzünden). **vel** = Pegel + Zündstoß (Bogen 100 ms sofort, egal wo y steht). **burst** = `burstEnv(0.002, gate, 0.15·decayMul)` mit Zündstoß und Knister-Schweif.
  **Stufe 3:** zwei Bögen L/R mit eigenen Stufenpuffern, Brumm-Shaper 2× oversampled, zweite Knisterquelle gepannt.
- **Parameter (6):** Spannung 0,5 (wo der Bogen auf der Höhe beginnt), Netz 0,4 (gefaltetes Brummen beimischen), Knistern 0,5, Bogen 0,6, Reichweite 2 (Bogenoktave 1–2), Flackern 0,5 (Gate-Dichte). `MACRO.elm = ['elm.spannung','elm.knistern']`.
- **Spiel:** Finger unten als Bass-Drone, oben als Lead-Bogen – eine Spalte, zwei Register; Neigung = Spannung; Bebung = Netzflattern; Puls = Zaps; Sporenregen ist für gehaltene Engines ein 0,22-s-Stoß (V code-map §7) → kurze Zaps, passt.
- **Kosten (A):** Brumm Osc+Shaper+HP+Gain 0,2 + Knisterquelle 0,15 + Bogen Osc+BQ+Shaper+2 Puffer+3 Gains 0,35 → **≈ 0,75** (Bogen-Kette nur, wenn `Bogen > 0`); Stufe 3 ≈ 1,4.
- **Risiken:** Bogen klingt schnell nach billigem Laser → Bandpass, Stottern, Sprünge in der Tonart, Brummen darunter; Knisterquelle mit 2-s-Schleife wiederholt bei geringer Dichte → zwei Rauschquellen mit Zufallsoffset; Brummen hart/DC → Hochpass 30 Hz, Pegelreferenz 0,45.

---

## 4. Wal (`wal`) – Tiefseeruf

- **Pitch:** „Walgesang – ein Ruf, der von unten in den Ton gleitet, pulsierend unter Wasser trägt und mit der Höhe die Form wechselt“
- **Gehalten.** `sustain: true`.
- **Klang (10 s):** Finger drauf: ein Ton hebt sich aus einer Quinte darunter in 0,3–0,8 s auf die Note, mit kleinem Überschwingen – dick, kehlig, harmonisch reich, tief formantiert – und hält mit langsamer Wellung. Unter Wasser: dumpf, mit einem verschmierten Echo, in dem die vorige Tonhöhe noch unter der neuen glimmt. Finger hoch: der Ruf wird ein Aufwärtsschrei mit **pulsierender** Phonation (8–14 Hz, Buckelwal-„Grunzen“), heller; unten ein Stöhnen, das beim Loslassen abwärts ausläuft. Gleiten ist schwer und träge: der Ruf überschießt um 30 ct und setzt sich. Akkorde = eine Schule. Puls-Stoß: Klicksalven (Pottwal-Codas) bei kurzen Gates, ganze Rufe bei langen.
- **Novum:** Stimme (Myzel) = synchroner Vokalchor mit Formanten aus y, sofort (V code-map §4). Wal = **Kontur-getriebener Ruf mit Trägheit** (Überschwingen, Artkontur), gepulster Stimmgebung und Unterwasser-Ausbreitung (Kamm + Tiefpass + Suboktave). Schwestern: Kehlchen (Vogel-Syrinx), Unke (Frosch-Antiphonie), Rudel (hier). Kein Synth liefert Walrufe skalengebunden; Sounddesigner nutzen Hydrophon-Aufnahmen und gepitchte Vokale (A).
- **DSP (nativ):**
  `OSC(PeriodicWave 'wal')` (Harmonische 1–16, `1/n^0,8`, ungerade +2 dB) → **Puls-AM**: `OSC sine (6 + 10·y Hz) → Gain(Puls·y) → amGain.gain` → 2 BQ bandpass Kehle `F1 = clamp(2,2 f, 180, 700)·2^(0,6y)`, `F2 = clamp(4,5 f, 500, 1800)·2^(0,6y)`, Q 4 → Summe → BQ lowpass `1,2 kHz + 2,4 kHz·y` (Wasser) → Kamm: `DelayNode 70–110 ms` (zufällig je Stimme) mit Rückkopplung `0,45·Wasser` und `BQ lowpass 800` in der Schleife (Zyklus ≥ 128 Frames, V webaudio §7) → `v.out`; Suboktave `OSC sine f/2` −14 dB mit gleicher Kontur. **Kontur** bei `start`: `osc.frequency.setValueCurveAtTime(f·2^(c_i/12))` mit `c = [−7 … +0,3 … 0]·Ruf` über `T = 0,3 + 0,6(1−y)` s; danach Wandern ±3,5 ct über `v.lnk(A.uni[i])`. `setF(nf, glide)`: `glideTo(frequency, nf·2^(0,3/12), max(glide, 0,25))`, dann `setTargetAtTime(nf)` 0,2 s später (Überschwingen; nur `setTargetAtTime`, nie `holdParam`, V code-map 2120). Release: `v.release = (k) => { glideTo(frequency, f·2^(−3/12), rel); sustainRelease(v, rel)(k); }`. Alle `detune` über `v.mod()`.
  **y** = Rufform (Kontur-Tempo, Puls-Rate/-Tiefe, Kehle, Wasserhelligkeit). **vel** = Pegel + Konturtiefe (hart = tiefer Ansatz). **burst** = bei `gate < 0,3`: keine Kontur, Puls-AM 12–25 Hz voll (Klicksalve); sonst komprimierte Kontur über `gate·0,6`; `burstEnv(0.01, gate, min(rel, 1)·decayMul)`.
  **Stufe 3:** zwei Rufer L/R (±6 ct, 20 ms versetzt), dritter Formant, zwei Kämme (Stereo-Wasser).
- **Parameter (6):** Ruf 0,6 (Konturtiefe 0–12 Halbtöne), Puls 0,4, Kehle 0,5 (Formantlage), Wasser 0,5 (Kamm + Dumpfheit), Tiefe 0,3 (Suboktave), Rel 0,8 s. `MACRO.wal = ['wal.ruf','wal.wasser']`.
- **Spiel:** Langsame Melodien in tiefer Lage (v.oct −1), Gleiten mit Glide ≥ 0,3 s; Neigung = Rufform; Bebung = Triller der Phonation; Puls mit kurzen Gates = Klicksalven, mit langen = Rufe; Ebene 2 unter Gewölbe = Tiefsee-Kathedrale.
- **Kosten (A):** 3 Osc 0,18 + 3 BQ 0,18 + Delay+Loop-LP 0,11 + 6 Gains 0,18 → **≈ 0,7**; Stufe 3 ≈ 1,4.
- **Risiken:** Nähe zu Stimme → tiefe Formanten, Puls und Kontur sind Pflicht (Ruf 0 = flacher „Stimme“-Klon; Default 0,6); Trägheit stört schnelles Spiel → `glide` nur anheben, wenn Ruf > 0,2; Kamm-Rückkopplung ≤ 0,7 mit Schleifen-Tiefpass.

---

## 5. Rudel (`rdl`) – heulendes Rudel

- **Pitch:** „Wolfsgeheul – Stimmen, die nacheinander einsetzen, von unten in den Ton gleiten, brechen und wieder finden“
- **Gehalten.** `sustain: true`.
- **Klang (10 s):** Eine Stimme beginnt: ein Heulen steigt aus einer Quarte darunter, schwingt über, setzt sich auf die Note mit langsamem Wobbeln; nach 0,4–1,5 s setzt eine zweite ein, etwas daneben (±20 ct) oder eine Quinte/Oktave darüber, dann eine dritte – der Akkord eines Rudels. Jede Stimme **bricht** gelegentlich (springt für 150 ms eine Oktave hoch oder eine Quinte tief, mit heiserem Flattern) und kehrt zurück. Finger hoch: mehr Stimmen, wilder, mehr Brüche, offenes „aaa“; unten ein einzelnes dunkles „ooo“. Loslassen: die Stimmen fallen nacheinander mit abwärts laufendem Schweif ab. Puls-Stoß: ein Kläffen (kurzes, steigendes Bellen).
- **Novum:** Stimme = synchroner Chor mit Vokal aus y; Rudel = **asynchrone Einsätze**, Kontur je Stimme, Registerbrüche, Maul öffnet sich während des Anstiegs (Wölfe öffnen das Maul, wenn das Heulen steigt – A). Trailer-Standard (A), in keinem Instrument gestimmt spielbar. Schwestern Unke/Kehlchen rufen antiphonal bzw. vogelartig; Rudel akkumuliert einen Chor.
- **DSP (nativ):**
  Je Heuler i (Stufe 1: 3, Stufe 3: 6): `OSC(PeriodicWave 'howl')` (Harmonische 1–12, `1/n`, 3./5. +4 dB, nasal) → 2 BQ bandpass Maul (`F1 400→900 Hz`, `F2 900→1600 Hz`, Q 5; die Frequenzen laufen mit der Kontur per `setValueCurveAtTime` hoch = Maul öffnet) → Gain (Einsatz-Fade 0,3 s bei `t_i = i·Ansatz·(1 + 0,9(1−y))·rand(0,7, 1,3)`) → `PAN((i−1)·0,45·v.width)` → `v.out`. Kontur: `frequency.setValueCurveAtTime` von `f·2^(−5/12)` über `f·2^(+0,4/12)` auf `f` in `T_i = (0,5 + 0,5(1−y))·rand(0,8, 1,25)`; danach `v.lnk(A.uni[i % 4])` (±3,5 ct) + fester Versatz `±(8 + 25·Wild)·y` ct. Intervalle der 2./3. Stimme: 0 / +700 / +1200 ct nach y (y > 0,5 Quinte, y > 0,8 Oktave). **Brüche**: `plan(v)` setzt für 12 s voraus alle 1,5–4 s je Stimme mit Wahrscheinlichkeit `Wild·y` einen Sprung (`exponentialRamp` 20 ms auf +1200 oder −700 ct, 120–200 ms, zurück) und schaltet währenddessen eine Heiser-AM zu (`OSC square 28 Hz → Gain` auf die Stimme); `setF` (`glideTo`, min 0,2 s, mit Überschwingen) bricht laufende Pläne ab (`cancelScheduledValues` passiert in `setP/glideTo` ohnehin) und plant neu – `setY` plant **nicht** neu (bis 30×/s), sondern blendet nur Stimmen 2/3 ein/aus (`setP` auf deren Gains) und ändert `Wild·y` für künftige Pläne. Atem: eine gemeinsame `noiseSrc → BQ bandpass F1 → Gain(Heiser)` für alle. Alle `detune` über `v.mod()`.
  **y** = Stimmenzahl, Wildheit, Maulöffnung. **vel** = Pegel + schnellerer Anstieg (hart = kurze Kontur, sofortiger zweiter Einsatz). **burst** = ein Heuler, Kontur auf `gate·0,6` komprimiert, keine Brüche; `burstEnv(0.01, gate, min(rel, 0.8)·decayMul)` → Kläffen.
  **Stufe 3:** 6 Heuler (je Intervall zwei, ±12 ct), 3 Formanten, breiteres Panorama, eigener Atem je Seite.
- **Parameter (6):** Stimmen 3 (1–3; Stufe 3 verdoppelt), Wild 0,5, Ansatz 0,8 s (Einsatzabstand), Maul 0,5 (Formantlage), Heiser 0,3, Rel 1,2 s. `MACRO.rdl = ['rdl.wild','rdl.maul']`.
- **Spiel:** Einen Ton halten und warten, bis das Rudel steht (P8); Akkorde mit zwei Fingern = zwei Rudel; Neigung = Wildheit; Bebung = Heulvibrato; Lage: Heulen lebt zwischen 150 und 800 Hz → Preset mit `v.oct −1`; Puls kurze Gates = Kläffen über einem Membran-Bett.
- **Kosten (A):** 3 × (Osc 0,06 + 2 BQ 0,12 + 2 Gains 0,06 + Pan 0,04) = 0,84 + Atem 0,2 → **≈ 1,0**; Stufe 3 ≈ 1,9.
- **Risiken:** Cartoon-Gefahr → langsame Konturen, Heiserkeit, nie exakte Unisono; Ereignisplanung (`plan`) muss bei `setF` sauber neu starten (Horizont 12 s, Stimmen mit `_end` nicht nötig, gehalten); Formanten über der Note bei hohen Tönen (> 1 kHz) werden dünn → Formanten mindestens `1,3 f`; Kosten nahe Stimme (1,05) – akzeptabel für drei Stimmen.

---

## 6. Lohe (`loh`) – singende Flamme

- **Pitch:** „Singende Flamme – Feuer in einem Rohr: Rauschen, das bei Hitze zum Ton erwacht, stottert und überbläst“
- **Gehalten.** `sustain: true`.
- **Klang (10 s):** Unten ein weiches Feuerrauschen mit vereinzelten Holzknackern, kein Ton. Mitte: das Rohr beginnt zu **summen** – ein hohler Ton (ungerade Harmonische, klarinettenartig, aber luftig) taucht aus dem Brausen auf, wogt in langsamen Stößen („wumm … wumm“, 1–3 Hz), weil die Flamme pulsiert. Oben: der Ton rastet ein, hell, die dritte Harmonische wächst, zuletzt kippt er auf die Duodezime (Überblasen), das Knistern wird dicht. Loslassen: der Ton stirbt in Zischen und einem letzten Knacker. Puls-Stoß: ein Gasstoß (Wumm) mit kurzem Ton.
- **Novum:** Rijke-Rohr / Pyrophon (Kastner 1875, A): thermoakustische Schwingung – ein Naturphänomen, das kein Synth modelliert. Hauch = Rauschen; Halm (inventor) = Luftstrahl-Flöte mit Überblasen durch Druck. Lohe unterscheidet sich im Erreger (Verbrennungsrauschen + Knistern), in der **Schwelle** (Rayleigh-Kriterium als y), im Stottern (langsamer Amplituden-Grenzzyklus genau an der Schwelle) und im geschlossen-offenen Rohr (nur ungerade Harmonische).
- **DSP (nativ; Worklet-Variante mit echter Rückkopplung optional):**
  - **Feuer:** `noiseSrc → BQ lowpass(120 + 600y, Q 0,7) → Gain(Glut·0,5)` → `v.out` (Bett). **Knistern:** Knisterquelle (§0.1) mit Tiefpass `200·(1 + 4y)`, Hochpass 2 kHz, Gain `Knistern·(0,3 + 0,7y)`.
  - **Rohr:** 3 BQ bandpass bei `f`, `3f·1,004`, `5f·1,01` (leichte Streckung der heißen Gassäule, A) aus dem Feuerrauschen, Güte `Q = 12 + 160·s`, Gains `[1, 0,5, 0,25]·Rohr·s`; `s = smoothstep(y_th, y_th + 0,3, y)` mit `y_th = 0,45·(1 − Hitze)`. Überblasen ab `y > 0,85`: Gain Mode 1 → 0,3, Mode 3f → 1 (`setP`).
  - **Stottern:** `OSC sine (0,8 + 2,5y Hz) → Gain(Stottern·(1 − |2s − 1|))` auf die Rohr-Gains (Chugging maximal an der Schwelle, null wenn eingerastet).
  - `v.mod(bq.detune)` auf alle drei (Bebung = Flackern), `setF` = `glideTo`, `setY` = `setP` auf Cutoffs, Q, Gains, Stotter-Rate; Ausgang `tanh`.
  **y** = Hitze (Schwelle, Rohrgüte, Überblasen, Knisterdichte). **vel** = Wumm (LP-Rauschstoß 150 ms) + Anfangsstoß des Stotterns. **burst** = Wumm + `s` für das Gate auf 1 gezwungen (Ton sofort), `burstEnv(0.01, gate, 0.3·decayMul)`.
  **Stufe 3:** 5 Rohrmoden (1, 3, 5, 7, 9), zwei Flammen L/R mit eigenen Stotterphasen, zwei Rauschquellen.
- **Parameter (6):** Hitze 0,5 (Schwellenlage), Rohr 0,6 (Rohrstärke/Güte), Stottern 0,5, Knistern 0,4, Glut 0,5 (Rauschbett), Rel 0,6 s. `MACRO.loh = ['loh.hitze','loh.stottern']`.
- **Spiel:** Finger an der Schwelle halten = pulsierender Ton (P1-Kante); Neigung = Hitze; Schütteln = Gasstoß; Puls lange Gates = Flammenorgel-Akkorde; Ebene 2 unter Kluft = Schmiede.
- **Kosten (A):** 2 Rauschquellen 0,24 + Knisterquelle (ohne Rauschen) 0,1 + LP 0,06 + 3 BQ 0,18 + Stotter-Osc+Gain 0,09 + 5 Gains 0,15 → **≈ 0,8**; Stufe 3 ≈ 1,5.
- **Risiken:** „Rauschen → Bandpass“ zum dritten Mal (Hauch, Gewölbe) → Unterscheidung über ungerade Harmonische, Schwelle, Stottern, Knistern; Stottern an der Schwelle kann rhythmisch nerven → Tiefe ≤ 0,6, Rate an y; ungesungener Zustand muss tragen (dice) → Knacker und Brausen hörbar.

---

## 7. Donner (`don`) – Gewitter auf der Note

- **Pitch:** „Donner – Knall und rollendes Grollen auf der Note, die Fingerhöhe ist die Entfernung“
- **Geschlagen.** `sustain: false`.
- **Klang (10 s):** Finger oben (nah): ein scharfer Knall, sofort ein reißendes Rollen von einer Sekunde, dann Grollen auf dem Bass der Note für 2–4 s mit Echos, die durchs Stereobild wandern. Finger unten (fern): kein Knall – erst nach einer halben Sekunde ein weiches Grollen, das anschwillt, 4–8 s rollt, tief, breit, **gestimmt** (ein Akkord aus Donnern wird harmonisch). Wiederholte Schläge überlagern sich zum Gewitter. Puls: gestimmte Donnerschläge.
- **Novum:** Donner ist der meistgenutzte Filmklang – immer als Sample (A). Tiefe = Subkick/Drone, Membran = Fell (V code-map §4). Donner: mehrstufiges stochastisches Rauschen mit **gestimmten Peaking-Resonanzen**, Entfernung als y (Knall/Verzögerung/Rolldauer), Echo-Lappen. Kein Synth bietet spielbaren, gestimmten Donner (A).
- **DSP (nativ, alle Stufen bei `start` geplant):**
  - **Knall** (y > 0,4): `noise → BQ highpass 600 → Gain` (0,5 ms Anstieg, `setTargetAtTime` 8 ms, Pegel `vel·Knall·(y−0,4)/0,6`) + **Reißen**: `noise → BQ bandpass` mit `frequency.setValueCurveAtTime(2500 → 300 Hz, 0,4 s)`, Gain-Abfall 0,5 s.
  - **Grollen:** `noise → BQ lowpass(60 + 240y, Q 1,5) → Gain` mit **Lappen-Hüllkurve**: `setValueCurveAtTime` über 48 Punkte, je Schlag neu gewürfelt als Summe von 3–5 Buckeln (0,2–0,8 s breit) über `T = Grollen·(0,5 + (1−y))·decayMul` mit Gesamtabfall → BQ peaking `f_b = Stimmung === 'tief' ? fold(f) : f`, Q 4, +12 dB·Ton → BQ peaking `2 f_b`, Q 6, +6 dB·Ton → `v.out`; dazu `OSC sine f_b` −10 dB mit derselben Lappen-Hüllkurve (macht den Schlag harmonisch). Start des Grollens bei `t + 0,05 + 0,6·(1−y)·(1 − Nähe)`.
  - **Echo:** `DelayNode 0,25–0,5 s` (zufällig) mit Rückkopplung `0,35·Weite` und `BQ lowpass 400` in der Schleife auf dem Grollen; Stufe 3 zwei Grollquellen L/R mit eigenen Lappen und Echos.
  - `v.mod()` auf Peaking-`detune` und Sub-`detune` (Bebung lässt das Gewitter wabern). `v.released = true`, alle Quellen mit `_end`, `finish(end + Echo-Schweif)`.
  **y** = Entfernung (Knall, Verzögerung, Rolldauer, Tiefpass). **vel** = Stärke (Knallgröße, Lappenzahl, Pegel). **burst**: Gate egal, `decayMul` skaliert T.
  **Stufe 3:** 2 Grollquellen L/R, 3 Peakings, 2 Echos, Reißen in Stereo.
- **Parameter (6):** Nähe 0,5 (Offset zu y), Grollen 3 s, Knall 0,6, Ton 0,5 (wie stark gestimmt), Weite 0,5 (Echo/Pan), Stimmung SEL tief/frei (tief). `MACRO.don = ['don.naehe','don.ton']`.
- **Spiel:** Puls-Spur 1/4 mit Donner (y niedrig) = fernes Gewitter als Bass; schnelle Wiederholungen = Rollen; Sporenregen (`RG_S`-Kandidat) = Wetterleuchten; Rassel-Kandidat (Schütteln = Gewitterfront).
- **Kosten (A):** 2 Rauschquellen 0,24 + HP, BP, LP, 2 Peaking 0,3 + Sub-Osc 0,06 + Delay+LP 0,11 + 5 Gains 0,15 → **≈ 0,85**; Stufe 3 ≈ 1,6. Achtung: 3–8 s lebende geschlagene Stimmen – 16 Achtel bei 120 bpm sind 13 Einheiten → Standard-Grollen 3 s, Nähe-Default 0,5, `steal` räumt `released` zuerst (V code-map §5).
- **Risiken:** „Rauschstoß“-Klischee → Lappen, gestimmte Peaks, Entfernungs-Verzögerung, Echo; Tiefbass-Aufbau bei vielen Schlägen → Hochpass 30 Hz, Peaking-Gain ≤ 12 dB, Referenzpegel 0,55; Lappen-Kurve je Schlag erzeugt 48-Float-Array (billig, aber nicht im Tick-Pfad).

---

## 8. Düne (`dun`) – singender Sand

- **Pitch:** „Singende Düne – rieselnder Sand, dessen Körner sich unter Last zu einem dröhnenden Ton gleichschalten“
- **Gehalten.** `sustain: true`.
- **Klang (10 s):** Unten trockenes Sandrieseln, körnig, unkorreliert, mit einer leisen Tonhöhen-Ahnung. Finger steigt: die Körner beginnen sich zu **synchronisieren** – aus dem Zischen schält sich ein rülpsendes, raues Brummen mit Amplitudenflattern (wie ein fernes Flugzeug), dann rastet es in einen dicken, fast reinen **Dröhnton auf der Note** mit Harmonischen; ganz oben kommt ein Brüll-Oberton mit schnellem Schweben dazu, das Rieseln ist fast weg. Gleiten mit dem Finger reißt die Synchronisation kurz auf (Sandlawine) und sie bildet sich neu. Loslassen: der Ton zerfällt in 0,5 s wieder in Rieseln. Puls-Stoß: ein Rutsch (Zischen → Dröhnen → Zischen).
- **Novum:** Dröhnende Dünen (Barchane, 70–105 Hz): die Kollisionen der Körner synchronisieren sich; die Frequenz folgt Scherrate und Korngröße (A: Douady u. a. 2006, Andreotti 2004). In keinem Synth. Glühwurm (biologist/performer) = Kuramoto-Synchronisation im **Sub-Audio** (Blitze finden den Takt); Düne = Kuramoto **bei Audiorate**: der Phasenübergang Rauschen → Ton **ist** das Instrument (P1-Kante). Körner (Myzel) spielt Texturen ab; Düne spielt nichts ab, sie koppelt N Impulsoszillatoren.
- **DSP (Worklet `myzel-dune`):**
  N = 24 Phasenoszillatoren (Stufe 3: 48) `θ_i`, Eigenfrequenz `ω_i = ω·(1 + Streuung·ξ_i)` (ξ gaußsch, fest je Stimme) + Phasendiffusion `D·rand` je Sample; Mittelfeld `R·e^{iψ} = (1/N)·Σ e^{iθ_i}` (ein Durchlauf, Sin/Cos-Tabelle 1024); Update `θ_i += dt·(ω_i + K·R·sin(ψ − θ_i))`. Jeder Oszillator stößt pro Umlauf einen **Kornimpuls** aus: `p(θ) = ((1 − cos θ)/2)^(2 + 6·Körnung)` (Tabelle) mit zufälliger Amplitude 0,6–1 → Summe/N. Kritische Kopplung `K_c ≈ 2·Streuung·ω` (A, Kuramoto-Standard für Lorentz-Verteilung) → `K(y) = K_c·(0,2 + 2,3·y·Last)`: Übergang bei y ≈ 0,35, bei y = 1 nur `R ≈ 0,85` (nie 1,0 → nie steriler Pulszug). Rieseln: weißes Rauschen × `(1 − R)·Rieseln` im Prozessor addiert (der Ordnungsparameter steuert das Rauschen – das macht den Übergang dramatisch). Danach Einpol-Tiefpass (Sandkörper), nativ dahinter `BQ peaking(f, Q 5, +8 dB·Boden)` → `v.out`. Params: `freq`, `detune` (k-rate, → ω), `hoehe` (→ K). `R` wird 10×/s per `port` gemeldet (optionales Visual).
  **y** = Last/Kopplung (Rieseln → Brummen → Dröhnen → Brüllen). **vel** = Anfangsrutsch (K kurz über Ziel, dann Beruhigung) + Pegel. **burst** = K-Rampe 0 → `K(y)` über `gate·0,7`, Release über 0,3 s·`decayMul`; `burstEnv(min(att, gate·0,3), gate, 0.4·decayMul)`.
  Native Fallback (A): Crossfade `noise ↔ OSC(PeriodicWave 'puls')` nach y mit Jitter-FM (`noise → LP 40 Hz → osc.frequency`) – spielbar, ohne den Übergangszauber.
  **Stufe 3:** 48 Oszillatoren in zwei Populationen L/R mit 5 % Kreuzkopplung (Stereo-Dröhnen mit Schwebung).
- **Parameter (6):** Last 0,5 (Kopplungsskala/Schwelle), Streuung 0,25 (Wildheit der freien Körner), Körnung 0,5 (Impulsbreite = Helligkeit), Rieseln 0,5, Boden 0,4 (Körperresonanz), Rel 0,5 s. `MACRO.dun = ['dun.last','dun.streuung']`.
- **Spiel:** Finger langsam heben und den Moment des Einrastens suchen; Neigung = Last; Schütteln = Lawine (K kurz auf 0); Bebung = Vibrato des Dröhnens; als Bass (v.oct −1) mit Nebel; Puls lange Gates = Dröhn-Akkorde, kurze = Rutsche.
- **Kosten (A):** 24 Oszillatoren × ~10 Flops + Mittelfeld ≈ 2× die 16-Resonator-Bank (0,6, V webaudio §4) → ≈ 0,6 + 3 Params 0,09 + Peaking/Gains 0,1 → **≈ 0,75**; Stufe 3 ≈ 1,4. **Messen** (Bench `research/bench/wa_bench.html`).
- **Risiken:** Volle Synchronisation = Pulszug = Buzz → R gedeckelt, Phasendiffusion, Amplituden-/Breitenzufall je Korn, Körper-Tiefpass; Übergang zu schlagartig → `Streuung` 0,25 und `K(y)` flach über y 0,25–0,6; CPU bei 48 Oszillatoren nur Stufe 3 (Desktop); Worklet-Fallback klingt deutlich schlechter – Engine im Fallback als „vereinfacht“ markieren.

---

## 9. Sog (`sog`) – Anlauf und Brecher in einer Geste

- **Pitch:** „Sog – beim Halten zieht sich die Welle zurück und steigt, beim Loslassen bricht sie auf der Note“
- **Gehalten**, mit umgekehrter Hüllkurve: Halten = Spannung, Loslassen = Höhepunkt. `sustain: true` (eigenes `v.release`).
- **Klang (10 s):** Finger drauf: ein zurückweichendes Zischen und ein steigender, gespannter Ton auf der Note – Harmonische stapeln sich nach oben, ein Tremolo beschleunigt, der Bandpass im Rauschen klettert – solange man hält (1–6 s, dann hält es oben mit Zittern). Loslassen: der **Brecher**: ein Subschlag auf der Note mit fallender Tonhöhe, ein breitbandiger Aufschlag, dann eine Gischtwand, die 2–4 s ausläuft. Je länger gehalten, desto größer der Brecher; ein kurzer Tipp ist nur ein Platscher. Puls: die Welle läuft über das Gate und bricht an seinem Ende (10 % vor dem nächsten Schritt – ein Vorschlag, der auf den Schlag zu fällt).
- **Novum:** Der Trailer-„Riser + Hit“ ist überall zwei Sample-Ebenen; als **eine Haltegeste**, deren Aufschlag das Loslassen auslöst und die Haltezeit skaliert, existiert er nirgends (A). In Myzel klingt jede Engine beim Loslassen ab; Sog kehrt die Hüllkurve um. Brandung (composer) hat einen „Brecher“-Stoß, ist aber ein Duffing-Chaos-Oszillator – anderer Mechanismus, andere Geste.
- **DSP (nativ):**
  - **Anlauf** (bei `start`): `noise → BQ bandpass` (`frequency` per `setTargetAtTime` von `2f` auf `16f`, `tc = Dauer/3`; Q `3 + 6y`) → Gain (Anstieg `linearRamp` über `Dauer·(1 − 0,5·vel)`); `OSC(PeriodicWave 'sog', Harmonische 1–8, 1/n)` bei `f` → Gain (Anstieg wie oben) mit Tremolo `OSC sine 5 → 11 Hz (setTargetAtTime, tc Dauer/3) → Gain(Zug·0,5)`; Suboktave `OSC sine f/2` blendet in der zweiten Hälfte ein. Obergrenze: nach `Dauer` bleiben alle Ziele stehen (Zittern bleibt). `v.mod()` auf alle `detune`.
  - **Brecher** (in `v.release(k)` bei `t_r`, Haltefaktor `H = clamp((t_r − t0)/Dauer, 0,15, 1)`): `OSC sine` bei `fold(f)` mit `exponentialRamp` von `2,5·f_b` auf `f_b` in 80 ms, Gain `Wucht·H·vel` → Abfall `0,3 + 0,8·H` s; Aufschlag `noise → BQ highpass 3 kHz` 80 ms (`Gischt`); Schaum `noise → BQ lowpass 4 kHz → Gain` Abfall `Schaum·H` s; alle neuen Nodes über `v.n()/v.s()` mit `_end`; Anlauf-Gains fallen in 30 ms; `v.finish(t_r + Schaum·H·1,3)`. `v.out.gain` bleibt 1 – keine `sustainRelease`. MIDI-Release-Faktor `k` skaliert den Schaum.
  **y** = Höhe des Anlaufs (Bandpass-Ziel, Q, Subtiefe, Tremolo-Endrate). **vel** = Tempo des Anlaufs + Brecherpegel. **burst** = Anlauf auf `gate·0,9` komprimiert, Release automatisch bei `t + gate·0,9` → Brecher; `decayMul` skaliert Schaum.
  **Stufe 3:** Stereo-Gischt (zwei Rauschquellen L/R), zweiter Obertonoszillator ±5 ct, Sub durch `tanh`-Shaper (2×) für mehr Wucht.
- **Parameter (6):** Dauer 3 s (voller Anlauf), Wucht 0,6 (Brechergröße), Gischt 0,5, Schaum 2,5 s, Zug 0,5 (Tremolo/Spannung), Tiefe 0,5 (Subanteil). `MACRO.sog = ['sog.dauer','sog.wucht']`.
- **Spiel:** Halten, Spannung aufbauen, loslassen auf den Schlag; mehrere Finger = Wellen, die nacheinander brechen; Neigung = Anlaufhöhe; Puls mit ganzen Takten als Gate = Brecher auf die Eins; Ebene 2 unter Tiefe = Kinobass.
- **Kosten (A):** Anlauf: Rauschen 0,12 + BP 0,06 + 2 Osc 0,12 + Tremolo 0,09 + 3 Gains 0,09 ≈ 0,5; Brecher (nur nach Release, 1–4 s): Osc + 2 Rauschen + HP + LP + 3 Gains ≈ 0,5 → **≈ 0,6 im Mittel** (`VCOST1` 0,6); Stufe 3 ≈ 1,2.
- **Risiken:** Stehlen mitten im Anlauf verliert den Brecher (`vFade`) – akzeptabel; Lautheitssprung beim Brecher → Pegel über `H` und `vel`, Referenz 0,6; die Geste widerspricht der Erwartung „loslassen = leiser“ → `ENG_INFO` sagt es, Spielhilfe-Zeile; lange Schweife belegen Stimmen → `Schaum` ≤ 5 s.

---

## 10. Hagel (`hgl`) – Hagelschauer auf gestimmter Fläche

- **Pitch:** „Hagel – Körner prasseln auf Blech, Holz oder Glas, und die Fläche klingt auf der Note“
- **Geschlagen.** `sustain: false`.
- **Klang (10 s):** Ein Tipp: ein dichter Stoß harter Aufschläge (10–60 in 0,1–0,6 s) auf einer Fläche, die auf die Note gestimmt ist – die Fläche klingt als Akkord ihrer Moden nach (Blech: unharmonisches Scheppern, Holz: dumpfes Klopfen, Glas: helles Klirren). Finger oben = kleine Körner: schnell, leicht, hohe Ticks (Graupel); unten = große: langsam, schwer, jeder mit Nachklang und einem Wumm. Harter Anschlag = dichterer, längerer Schauer. Wiederholte Tipps = Sturm auf dem Dach. Puls: gestimmte Hagelrhythmen (sehr gut auf Sechzehnteln).
- **Novum:** Tropfen = Luftblasen mit Chirp (V code-map §4), Körner = Texturkörner, Membran = ein Fell. Hagel = **stochastischer Aufschlag-Cluster auf gestimmtem Material** – das Dach ist das Instrument, die Korngröße liegt unter dem Finger. Schwester Kapsel (performer) = Shaker, gehalten, ohne gestimmte Fläche. Sample-Bibliotheken haben Hagel, kein Synth gestimmt und materialwählbar (A).
- **DSP (nativ):**
  Knisterquelle (§0.1) als Kornstrom: `noise → BQ lowpass(300·(0,3 + 2y)) → WaveShaper(A.ddCurve) → BQ highpass(800·(1 + 3y)) → Gain` mit Schauer-Hüllkurve (`linearRamp` 5 ms, `setTargetAtTime` 0 ab `t + 0,02`, `tc = Schauer·(0,4 + 0,8·vel)·(1,3 − 0,6y)/3`). Dieser Strom geht (a) direkt an `v.out` (`Prasseln`) und (b) in die **Fläche**: 4 BQ bandpass bei `f·ratio` (Blech 1 : 1,58 : 2,3 : 3,1, Q 25–60, A nach Gehör; Holz 1 : 1,47 : 2,09 : 2,56, Q 8, V synthesis.md §2.9; Glas 1 : 2,32 : 4,25 : 6,63, Q 80, V), Gains `Klang·[1, 0,6, 0,4, 0,25]·Nachklang` → `v.out`. Großkorn-Wumm: `OSC sine f/2`, 60 ms, Pegel `(1 − y)·0,5·vel` beim Einsatz. `v.mod()` auf die Moden-`detune` und den Wumm. `v.released = true`, Rauschen mit `_end` am Hüllkurven-Ende, `finish(end + T60)`.
  **y** = Korngröße (Rate, Schärfe, Wumm, Schauerlänge). **vel** = Dichte, Länge, Pegel. **burst**: Gate egal, `decayMul` skaliert die Schauerlänge.
  **Stufe 3:** zwei Kornströme L/R (verschiedene Rauschoffsets), 6 Moden, Moden ungerade L / gerade R.
- **Parameter (6):** Fläche SEL Blech/Holz/Glas (Blech), Korn 0,5 (Größenoffset zu y), Schauer 0,35 s, Klang 0,5 (Flächen-Nachklang), Prasseln 0,6 (direkter Aufschlag), Nachklang 0,5 (Güteskala). `MACRO.hgl = ['hgl.korn','hgl.klang']`.
- **Spiel:** Puls 1/16 mit Hagel auf Blech = Dachrhythmus, Höhe wandert durch Korngrößen; Sporenregen (`RG_S`-Kandidat) = Eisregen; Rassel-Kandidat (Schütteln = Hagelstoß); mit Donner auf einer zweiten Spur = Unwetter.
- **Kosten (A):** Rauschen 0,12 + LP/Shaper/HP 0,15 + 4 BQ 0,24 + Wumm-Osc 0,06 + 5 Gains 0,15 → **≈ 0,7**; Stufe 3 ≈ 1,3. Stimmen leben 0,3–1,5 s.
- **Risiken:** Pegel des Totzonen-Ausgangs hängt vom Rausch-RMS ab → einmal normieren (Kurve so skalieren, dass ein typischer Impuls 1,0 erreicht); Blech kann nach Gong klingen → Q niedriger, T60 ≤ 0,8 s; Wasser als vierte Fläche wäre Tropfen-Dopplung → bewusst weggelassen.

---

## 11. Übersicht

| Key | Name | Spielweise | y = | Mechanismus-Kern | Pfad | Kosten L1 / L3 (A) | Gestik-Hooks |
|---|---|---|---|---|---|---|---|
| klf | Kluft | gehalten | Last: Knarr-Rate → Ton | Stick-Slip-Relaxationsoszillator + Modalkörper | W `myzel-creak` (N-Fallback) | 0,45 / 0,9 | Neigung Last, Schütteln Ruck |
| gwb | Gewölbe | gehalten | Druck: obere Raummoden, Wind | Rauschen in Hoch-Q-Raummoden (Quader-Modensatz), Ankunft/Nachhall | N | 0,6 / 1,2 | Neigung Druck |
| elm | Elmsfeuer | gehalten | Spannung: Brumm → Knistern → Bogen | Netzbrummen + Totzonen-Knistern + gestufter Bogen in der Tonart | N | 0,75 / 1,4 | Neigung Spannung |
| wal | Wal | gehalten | Rufform, Puls, Kehle | Konturruf mit Überschwingen, Puls-AM, Unterwasser-Kamm | N | 0,7 / 1,4 | Bebung = Triller |
| rdl | Rudel | gehalten | Stimmenzahl, Wildheit, Maul | asynchrone Heuler mit Kontur, Brüchen, Maulöffnung | N | 1,0 / 1,9 | Neigung Wild |
| loh | Lohe | gehalten | Hitze: Schwelle, Stottern, Überblasen | Verbrennungsrauschen → ungerade Rohrmoden, Grenzzyklus an der Schwelle | N (W optional) | 0,8 / 1,5 | Neigung Hitze, Schütteln Wumm |
| don | Donner | geschlagen | Entfernung | Knall/Reißen/Lappen-Grollen, gestimmte Peakings, Echo | N | 0,85 / 1,6 | `RG_S`, Rassel |
| dun | Düne | gehalten | Last: Rieseln → Dröhnen | Kuramoto-Synchronisation von 24 Kornimpuls-Oszillatoren bei Audiorate | W `myzel-dune` (N-Fallback) | 0,75 / 1,4 | Neigung Last, Schütteln Lawine |
| sog | Sog | gehalten (Release = Brecher) | Anlaufhöhe | steigende Spannung, Haltezeit skaliert den Aufschlag | N | 0,6 / 1,2 | Neigung Anlauf |
| hgl | Hagel | geschlagen | Korngröße | Totzonen-Kornstrom auf gestimmter Modalfläche | N | 0,7 / 1,3 | `RG_S`, Rassel |

Familien-Vorschlag für die Bibliothek (nur Tags, Reihenfolge bleibt `ENG_OPTS`): **Wetter** (Donner, Hagel, Elmsfeuer, Sog), **Erde und Feuer** (Kluft, Düne, Lohe, Gewölbe), **Wesen** (Wal, Rudel).

## 12. Vertiefen statt neu (Empfehlungen; die zehn bleiben)

1. **Tiefe → „Horn“-Schattierung** statt einer Nebelhorn-Engine: ein Param `tie.horn` (Diaphon-Grunzen: Tonhöhenfall 2 Halbtöne über 120 ms am Ende, Trichter-Formant 180–350 Hz) gäbe den Trailer-Braam für ≈ 0,1 Zusatzkosten. Eine eigene Engine „Nebelhorn“ würde zudem mit „Nebel“ im Picker kollidieren.
2. **Stimme → „Ansatz“** (Konturanstieg mit Überschwingen wie bei Wal, 0–7 Halbtöne, Zeit 0,1–0,8 s): macht den Chor lebendig, kostet nichts, nimmt Wal aber nicht die Puls-Phonation und das Wasser.
3. **Schwarm → „Knistern“**: die Totzonen-Knisterquelle als Insektenknacken (Zikaden-Klicks) – ein Param, 0,15 Einheiten.
4. **Hauch**: kein Gewölbe-Modus in Hauch – Ankunft/Nachhall/Modensatz ändern das Verhalten so grundlegend, dass ein Param-Schalter die Hauch-Defaults verfälschen würde; neue Engine ist richtig.
5. **Gong**: hat Bend und Bloom; ein „Opern-Gong“-Glide (Chaigne, V synthesis.md §2.17) wäre ein Param (`gng.glide` existiert bereits als Richtung) – keine neue Engine nötig.

## 13. Integration (über `code-map.md` §11 hinaus)

- **Gemeinsam:** `A.ddCurve` (einmal nach `initAudio`), `A.elmSteps/A.elmGate` (bei erstem Elmsfeuer), `fold(f)` aus `tie.base` herausziehen; PeriodicWaves `elm`, `wal`, `howl`, `sog`, `impuls`, `puls` im `A.waves`-Cache (V code-map 2809: wird in `initAudio` geleert → lazy bauen).
- **Worklet:** `MYZEL_DSP_SRC` mit `myzel-tap`, `myzel-creak`, `myzel-dune`; Laden direkt nach `initAudio` (V webaudio §1.5); bei Fehlschlag Engine-Flag `fallback` → native Variante, einmaliger Toast „vereinfacht“.
- **Gestik-Listen:** `RG_S` + `don`, `hgl`; Rassel-Liste (10527) + Validierung (8816) + `don`, `hgl`; Formen-Ziele (`MODT`/`MOD_EQ`/`LAD_AMT`): `dun.last` („Sand verdichten“) und `gwb.druck` als optionale Ladung-Ziele.
- **Puls:** Sog bricht bei `gate·0,9` → Hinweis im Spur-Tab; Donner/Hagel sind Spur-Defaults-tauglich (`LANE_DEF`-Vorschlag: Spur 2 Hagel).
- **Presets (Vorschlag):** „Gewitterfront“ (Donner + Hagel auf Spuren, Nebel gehalten), „Dom“ (Gewölbe + Wal als Ebene 2), „Hochspannung“ (Elmsfeuer + Kluft), „Wüstennacht“ (Düne + Rudel), „Brandung“-Name vermeiden (composer).
- **safeify:** `gwb.stein` ≤ 0,9 auf Mobil, `don.grollen` ≤ 5 s, `sog.schaum` ≤ 4 s, `rdl.stimmen` bei Stufe 1 ≤ 3.
- **Texte:** Spielhilfe-Zeile „Halten und loslassen: Sog bricht beim Loslassen“; Gerät-Text nennt Donner/Hagel als teure Spuren-Engines.

## 14. Offen / zu messen

1. Worklet-Kosten `myzel-creak` (≈ 25 Flops + 5 Resonatoren) und `myzel-dune` (24/48 Oszillatoren) auf Mid-Range-Android – Bench nach `webaudio.md` §8.
2. Q-Obergrenze/Stabilität von `BiquadFilterNode` bandpass bei Q 300–400 und 40–110 Hz in Blink/WebKit (Gewölbe, Lohe) – A, prüfen.
3. Totzonen-Shaper: Impulsrate als Funktion von Cutoff/Vorverstärkung einmal tabellieren (Elmsfeuer, Lohe, Hagel, Donner teilen die Kurve).
4. Kuramoto-Übergangslage (`K(y)`) und Blech-Modenverhältnisse nach Gehör kalibrieren (A).
5. Rudel-Ereignisplanung (`plan`) gegen `setF`-Abbrüche und MIDI-Retrigger testen; Sog gegen Sustain-Pedal (Release-Faktor) und `panic()`.
