# Ingenieurs-Ideen: neun Klangquellen, die die Plattform ausreizen

Perspektive: skeptischer Web-Audio-DSP-Ingenieur. Stand 2026-10-13. Grundlage: `research/code-map.md` (Engine-Vertrag, Kosten, Worklet-Lader), `research/webaudio.md` (Messwerte, Thread-Modell, Vertrag für Worklet-Engines), `research/synthesis.md` (Techniken, Modendaten, Quellcode unter `research/src/`), `research/musicians.md` (P1–P12). Die vier anderen Ideenlisten (`biologist.md`, `composer.md`, `inventor.md`, `performer.md`) habe ich gelesen; die neun hier sind weder mit deren 40 Keys/Namen noch mit den 14 Engines identisch (Abgrenzung je Idee).

Legende: **V** = verifiziert (Quelle), **A** = angenommen/abgeleitet (eigene Rechnung oder Standardwissen). Kosten in Myzel-Einheiten (1,0 = eine Nebel-Stimme Stufe 1), immer L1 / L3.

---

## 0. Was die Plattform wirklich kann – und was ich daraus baue

Fünf harte Fakten bestimmen jede Idee (alle V, sofern nicht anders markiert):

1. **Zyklus-Regel.** Ein DelayNode in einer Rückkopplungsschleife hat mindestens 128 Frames = 2,667 ms Verzögerung; Schleifen ohne DelayNode sind stumm (V wa §7, Spec `index.bs` 7768/12282). Native Rückkopplung ist also nur für Umlaufzeiten ≥ 2,667 ms sauber – das heißt nicht „keine Physik nativ“, sondern: **tiefe Rohre, lange Saiten und Mehrperioden-Schleifen gehen nativ**, alles Kurze geht ins Worklet. → Hohlstamm (§1) nutzt das aus.
2. **Worklet-Kosten sind klein und bekannt.** Leerer Prozessor 0,06, je AudioParam 0,03, 16 Resonatoren 0,61, Waveguide 0,24; 1 Einheit ≈ 0,58 % eines Kerns ≈ **121 ns je Sample bei 48 kHz** (V wa §4, gemessen). Meine Formel für alle W-Schätzungen: `Kosten ≈ ns/Sample ÷ 121 + 0,06 (Node) + 0,03·Params`, mit ≈ 5 ns je Resonator-Sample, ≈ 30 ns je Biquad-Sample, ≈ 0,5–0,6 ns je einfachem Flop (V wa §4, `dsp_bench.js`). Handy-Korrektur ×1,0–1,5 (A).
3. **Offline ist gratis.** Jede noch so teure Physik, die *nach* dem Anschlag nicht mehr geformt werden muss, wird im DSP-Worker gerendert und als BufferSource gespielt: 0,35 Einheiten, Cache `KS_CACHE`-Muster, Nachbar-Tonhöhe per `playbackRate` (V code-map §2 `ksBuffer`). → Nuss (§9), und die Vertiefungen in §11.
4. **Faltung ist nur für kurze Körper billig.** ConvolverNode-Kosten ∝ IR-Länge (V synthesis §1 Padenot); ein 100–150-ms-Körper ist 20–30× kürzer als der Hall. Ein IIRFilterNode (Ordnung ≤ 20, Koeffizienten unveränderlich, V wa §7) hält 10 feste Moden in **einem** Node – für unbewegliche Körper die billigste Lösung. → Blasebalg (§5).
5. **Ein Modul, viele Prozessoren, ein Thread-Wechsel.** Sobald ein Worklet existiert, rendert Chrome-im-Frame/Safari den ganzen Graphen auf dem Worklet-Thread (V code-map 5164; wa §2). Deshalb: ein gemeinsames Modul `MYZEL_DSP_SRC` (neben `TAP_SRC`), geladen, sobald eine Worklet-Engine **gewählt** wird (Chip, Preset, Spur) oder der wiederhergestellte Patch eine enthält – nie erst beim ersten Ton (addModule 7–15 ms, V wa §3) und nicht pauschal bei `initAudio`, damit rein native Sitzungen in Safari/Frames auf dem Echtzeit-Thread bleiben (A: Abwägung gegen wa §1.5, die „immer bei initAudio“ empfiehlt; beides ist vertretbar, meins hält den Status quo für Nutzer ohne Worklet-Engine).

### 0.1 Gemeinsames Modul `MYZEL_DSP_SRC` (Entwurf)

```
Modul-Scope (einmal je Kontext, V wa §3):
  SIN[4097], TANH[2049], POW4[1025] (Bogentabelle), NOISE[65536], LF[2048] (Glottispuls)
  class Reso   – komplexe Rotation: re'=re·c−im·s, im'=re·s+im·c, ×r;  r = 0.001^(1/(t60·SR)) (V src/faust_physmodels.lib 712)
  class FracDelay – Ringpuffer, lineare/Lagrange-Interpolation, setDelay(samples)
  class OnePole, class Allpass1 (Dispersion), class DcBlock
  NERV = Float32Array(64)  – Membranpotenziale (Kopplung Nerv, §7); RING entfällt hier (composer.md hat `myzel-ohr`)
registerProcessor('myzel-tap', …)          // bestehend
registerProcessor('myzel-tract', …)        // Schlund
registerProcessor('myzel-string', …)       // Sehne
registerProcessor('myzel-plate', …)        // Chitin (und Gong-Vertiefung, §11)
registerProcessor('myzel-reed', …)         // Blasebalg
registerProcessor('myzel-rub', …)          // Balz  (teilt Bogentabelle mit inventor.md `myzel-bow`; könnte derselbe Prozessor mit Modensatz „Fell“ sein)
registerProcessor('myzel-nerv', …)         // Nerv
registerProcessor('myzel-dune', …)         // Düne
Prozessor-Vertrag (V wa §10): parameterDescriptors ≤ 4 (detune k-rate, freq k-rate, hoehe k-rate, + 1), Zustand im Konstruktor, Port-Nachrichten {on,f,y,vel,gate} / {off,k} / {set}, Blockgröße aus outputs[0][0].length, Denormal-Flush je Block, return false nach 8 stillen Blöcken, Hüllkurven nativ auf v.out.gain.
```

Fallback ohne `audioWorklet`: Engine in der Bibliothek ausgeblendet oder deklarierter nativer Ersatz (`ENGINES.xyz.fallback`), nie ScriptProcessor (V wa §9). Hohlstamm und Nuss brauchen kein Worklet.

### 0.2 Was jede Idee erfüllt

Vertrag `start(v,t,f,y,vel,o)` mit `o.burst/gate/decayMul` (V code-map §3); gehalten: `setF(nf, glide)` nur über `glideTo`/`setP` (nie `holdParam`, V 2120–2125), `setY` bis 30×/s; Bebung/Vibrato/Pitch-Wheel über **eine** `detune`-AudioParam je Stimme via `v.mod()` (V code-map 3464); Stufe 3 = mehr Moden/Stimmen, nie ein anderer Mechanismus (P12); Kante unter der Höhe (P1); kein stummer Parameterwinkel (`dice()` spielt alles, V code-map §9); Peak auf die Loudness-Referenz der 14 Engines eingepegelt (V code-map §4).

---

## 1. Hohlstamm (`hst`) – Lippen am hohlen Stamm (Didgeridoo, nativ)

- **Pitch:** „Hohler Stamm, mit den Lippen angeblasen – ein Bass-Drone mit Kehle, der anspricht, knurrt und überbläst“
- **Art:** gehalten (`sustain: true`). Pfad: **nativ** (Rückkopplung über DelayNode).
- **Klang (10 s):** Atem und ein Flattern, dann „fängt“ das Rohr nach 150–400 ms: ein fetter, schnarrender Bass-Drone mit nur ungeraden Obertönen sitzt da. Finger höher = der Mund öffnet sich, ein Vokalformant wandert u–o–a–e über den Drone; ganz oben spannen sich die Lippen und das Rohr springt in den nächsten Modus (eine Duodezime höher, der „Toot“). Darunter ein langsames Wabern (Zirkularatmung). Loslassen: der Ton reißt mit einem weichen „p“ ab.
- **Novum:** Myzel hat keine selbsterregte Schwingung; Tiefe ist Oszillator + Drive (V code-map §4). Vorbilder: STK `Brass`/`Clarinet` (V src), Faust `pm.brassModel` (V synthesis §2.12) – Desktop/Eurorack, nie Touch. inventor.md „Halm“ ist Flöte/Klarinette im Worklet mit Überblasen; Hohlstamm ist das Gegenteil: **Lippenventil + langes Rohr, nativ, Bass, mit Mundformanten** – die Vokalisation ist der Didgeridoo-Trick, den kein Blasmodell in Apps hat (A).
- **DSP (nativ, je Stimme):** STK-Brass-Topologie (V src/stk_Brass.h 100–113): `Δp = p_Mund − 0,85·bore`, `lip = clamp(BQ_lip(Δp)², 0, 1)`, `in = lip·p_Mund + (1 − lip)·bore`, `bore = Delay(τ)(DcBlock(in))`. Schleife τ = **zwei Perioden** + Korrektur (STK: `SR/f·2 + 3`, V src/stk_Brass.cpp 75) – der Lippenresonator bei f (Radius 0,997, V) wählt den Modus. Damit ist τ ≥ 2,667 ms für f ≤ 750 Hz (A: Rechnung aus der Zyklus-Regel); gefaltet wird trotzdem wie bei Tiefe in 40–180 Hz (`base(f)`-Muster mit `N.base`, V index 4400) – ein hohler Stamm ist ein Bassinstrument.
  Knoten: ConstantSource `p` (Mundruck, Rampe `att` = Ansprache), `noise→G(0,03·vel)` (Atem in Δp), `sum`, `BQ_lip` (bandpass f_L, Q 4), WaveShaper (x ↦ clamp(x², 0, 1)), Multiplikation `lip·p` = GainNode mit `gain ← lip` (Signal auf AudioParam, Muster wie FM in Glocke/Schwarm, V code-map §4), `(1−lip)·bore` = Gain mit `gain ← ConstantSource(1) + lip·(−1)`, `Delay(τ)`, `BQ_bore` (lowpass 8·f, Rohrverlust), `BQ_dc` (highpass 20 Hz), Mund = 1 (L1) bzw. 2 (L3) Peaking-Biquads F1 300→900 Hz, F2 800→2400 Hz nach y (+9 dB, Q 4) auf dem Ausgang, dann `v.out`.
  **y:** 0–0,8 Mundformant (u→e); 0,8–1 Lippenspannung: `f_L = f·3^((y−0,8)/0,2)` → Sprung auf den dritten Modus (Duodezime; geschlossen-offen = ungerade Harmonische). **vel:** Mundruck 0,4–1 (leise = Ansprache dauert, kratzt; laut = sofort, fetter). **burst:** Druckpuls für `gate` + Zungenstoß = 2-ms-Klick in die Schleife, damit das Rohr sofort anspricht; `burstEnv` auf `v.out`; `finish` stoppt Quellen, die Schleife stirbt über `BQ_bore` (Verlust < 1) binnen 50 ms. **setF:** `glideTo(delay.delayTime, τ_eff)` mit `τ_eff = 2/f − (φ_lip(f)+φ_bore(f))/(2πf)` (Phasenverzögerungen analytisch aus den Biquad-Koeffizienten, A), `glideTo(BQ_lip.frequency)`. **Bebung:** `A.pitchMod → G(−τ·ln2/1200) → delay.delayTime` (linear, < 0,3 % Fehler bis ±100 ct, A) + `v.mod(BQ_lip.detune)`; der Gain wird bei jedem setF nachgezogen. Zirkularatmung: `hst.atem` = 0,5–3 Hz Sinus-LFO (±4 % Druck, ±10 % F1).
  **Stufe 3:** zwei Rohre L/R (±3 ct via `A.uni`, V index 2840), zweiter Mundformant, Atemrauschen stereo.
- **Parameter (6):** Oktave (−2…0, d −1), Ansprache 0,25 s, Lippe 0,5 (Q des Lippenfilters: weich ↔ schnarrend), Mund 0,5 (Formant-Tiefe), Atem 0,4 (LFO + Rauschen), Rel 0,15 s.
- **Spiel:** Liegen lassen, Höhe als Mund bewegen = sprechender Drone; Gestik vorneigen = Mund auf, Schütteln = Zungenstöße (Rassel-Pfad `hit`), Bebung = Vibrato in der Kehle. Puls-Spur mit kurzen Gates = Didgeridoo-Rhythmus („dit-dit-doo“). Zweite Ebene Hauch darüber = Atem.
- **Kosten (A):** 5 Biquads 0,4 + Delay 0,05 + Shaper 0,03 + 2 Quellen 0,1 + 5 Gains/Const 0,15 ≈ **0,65 / 1,3**.
- **Risiken:** Stimmgenauigkeit der Schleife (Phasenverzögerung von drei Filtern + DelayNode-Interpolation) → einmaliger Offline-Abgleich je Oktave in `calibrate()`-Manier; Ansprachezeit 150–400 ms ist bei schnellem Spiel lästig → Zungenstoß-Klick im Burst; Pegel springt beim Modenwechsel → weiche Kompression (`tanh` im Ausgang); Loudness bei f < 60 Hz auf Handylautsprechern unhörbar → Mundformanten tragen den Ton (gewollt).
- **Integration:** `MACRO.hst = ['hst.mund','hst.lippe']`; Rassel-Liste (`GK.p.rasS`, V code-map 8816) um `hst` erweitern (Zungenstoß); `safeify`: `hst.lippe` ≤ 0,9 (Dauerschnarren).

## 2. Schlund (`sld`) – ein Rachen aus Röhrenstücken (Kelly-Lochbaum, Worklet)

- **Pitch:** „Ein Rachen aus 24 Röhrenstücken – Zunge, Lippen, Nase unter dem Finger: Vokale, Zischen, Plosive“
- **Art:** gehalten. Pfad: **W `myzel-tract`**.
- **Klang (10 s):** Ein einzelner Mund dicht am Ohr. Unten ein dunkles „mm/uu“, in der Mitte offenes „aa“, höher „ii“, ganz oben wird die Enge zum „ss/sch“ – der Vokal kippt ins Zischen (Kante). Leise gespielt flüstert er (nur Atem durch den Trakt), hart gedrückt presst er. Puls-Schläge sind Plosive: „p-a“, „t-i“, „k-u“ – Silben im Takt. Neigen = Nase (näseln) oder Lippen (runden). Bebung = Vibrato.
- **Novum:** Stimme ist ein Formantfilter-Chor (5 Vokale, 6 Sänger, V code-map §4); Schlund ist **ein Rohrmodell** mit Enge-Turbulenz, Plosiven und Velum – Konsonanten kann in Myzel sonst nichts. Pink Trombone (2017, Web; Xfer-Port 2026, V synthesis §2.13) ist bekannt – aber als Instrument mit Tonhöhenfläche, Puls-Silben und Gestik-Nase nicht (A). inventor.md und performer.md haben den Trakt mit „2–4 Einheiten“ verworfen (V deren §11/§12); meine Rechnung unten kommt mit **24 Zellen bei 1 Schritt/Sample** auf ≈ 1,2 – die Physik der Zellenlänge erlaubt das (siehe Kosten).
- **DSP (`myzel-tract`):** Kelly-Lochbaum-Leiter nach Pink Trombone (V src/pt_mod_Tract2.ts): Reflexion `r_i = (a_{i−1} − a_i)/(a_{i−1} + a_i)`, Glottisreflexion 0,75, Lippen −0,85, Verlust 0,999 je Zelle (V Z. 31–32, 159–160); Nase 28 Zellen ab Velum (V Z. 29) nur Stufe 3. **Zellenzahl:** eine Zelle = Δx = c/SR je Schritt (Umlauf 2 Zellen = 2 Samples) → bei 48 kHz 7,1 mm; 24 Zellen = 17 cm Erwachsenentrakt bei **einem** Schritt je Sample (A: Rechnung; PT rechnet 44 Zellen × 2 Schritte/Sample = gleiche Länge bei doppelter Auflösung, V synthesis §2.13 „doppelte Rate“ A). Zungenform: PT-Kurve über Zungenindex/-durchmesser (bladeStart 10 → tip 32 → lips 39 von 44, V Z. 26–28; auf 24 skaliert), Reflexionen je Block neu, Flächen per Einpol geglättet (statt PT-Lerp je Sample – spart 24×2 Flops). Glottis: LF-Puls-Tabelle `LF[2048]` bei f·2^(detune/1200), Spannung (vel) mischt Puls gegen Aspirationsrauschen; Turbulenz an der engsten Stelle `0,66·noise·intensity·noiseMod` (V Z. 227). Plosiv: Verschluss (Fläche → 0) 20 ms, dann Öffnung + 10-ms-Rauschburst (PT-Transienten). Ausgang: Lippenradiation = Differenz (Hochpass) + Nasenausgang.
  **y:** Vokalpfad durch PTs 2-D-Zungenraum (uu → oo → aa → ee → ii, A gewählt), ab 0,85 Zungenspitze → Enge → Frikativ. **vel:** Spannung/Lautstärke (0,2 = Flüstern, 1 = Pressstimme). **burst:** Plosiv + Vokal für `gate`, `burstEnv`. **setF:** `freq`-Param; **Bebung:** `detune`. Gestik-Höhe-Offset verschiebt den Vokal; Param `nase` und `lippen` sind Gestik-Ziele (MODT).
  **Stufe 3:** Nase (14 Zellen), 44 Zellen × 2 Schritte (PT-exakt, feinere Zunge), Aspirationsrauschen stereo.
- **Parameter (6):** Zunge 0,5 (Pfad-Offset), Kehle 0,6 (Grundspannung), Nase 0,2 (Velum), Lippen 0,3 (Rundung), Atem 0,3 (Aspiration), Rel 0,3 s.
- **Spiel:** Langsam durch die Höhe = „Vokalfahrt“, oben zischen; Puls-Spur Schlund = rhythmische Silben (Gate kurz = „t“, lang = „taa“); mit Obertöne als Ebene 2 = Kehlgesang mit Mund.
- **Kosten (A):** 24 Junctions ≈ 8 Ops ≈ 110 ns + Glottis/Rauschen 20 ns ≈ 130 ns → 1,07 + 0,06 + 0,09 ≈ **1,2 / 2,4** (Stufe 3 wie Stimme 2,4).
- **Risiken:** Bibliothek liest es als „Stimme 2“ → Untertitel betont „spricht“, Familie „Atem“ neben Stimme/Obertöne; Zellenzahl 24 → grobe Zungenformen (7 mm) – Vokale ok, Frikative stumpfer (A); Pegel der Turbulenz an der Enge kann springen → Rauschen auf den Trakt-Pegel normieren; Aliasing im Glottispuls bei hohem f → Tabelle bandbegrenzt je Oktave (wie PeriodicWave, 4 Tabellen).

## 3. Sehne (`shn`) – die Saite, die unter dem Finger lebt (Waveguide, Worklet)

- **Pitch:** „Eine Saite, die der Finger zupft, gleitend zieht, mit der Handkante dämpft, als Flageolett berührt und endlos anstreicht“
- **Art:** gehalten (`sustain: true` – der Finger bleibt auf der klingenden Saite; Loslassen = Dämpfen). Pfad: **W `myzel-string`**.
- **Klang (10 s):** Ein heller, leicht metallischer Zupf. Finger seitwärts: echtes Glissando mit dem Glanz einer steifen Saite (kein Neuanschlag). Finger tiefer: Handballen dämpft – aus Klingen wird Thud. Finger auf 0,7–0,85: eine leichte Berührung am Knoten – der Grundton stirbt, die Oktave/Quinte/Doppeloktave singt (Flageolett). Ganz oben: ein E-Bow legt Energie nach – die Saite schwillt an und hält ewig, mit einem leisen Rückkopplungs-Quietschen an der Kante, das oben in die Oktave kippt. Bebung = Fingervibrato auf der Saite.
- **Novum:** Saite ist eine offline gerenderte KS-Saite – kein Gleiten (Spaltenwechsel = Neuanschlag), keine lebende Dämpfung, kein Flageolett, kein E-Bow (V code-map §4/§6). GeoShred lebt von genau dieser Spielweise (V musicians §2.8 „pitch-rounding almost magic“) – als Myzel-Quelle mit Höhe als Hand fehlt es. Abgrenzung: inventor „Harz“ = Bogen auf Glas/Schale/Stab, „Dorn“ = Jawari offline, „Gespinst“ = Mitschwinger-Netz; biologist „Frost“ = Dispersion offline; performer „Schnecke“ = Feder. Sehne ist die **live** gespielte Saite.
- **DSP (`myzel-string`):** Bidirektionaler Waveguide (zwei Wanderwellen) mit **zwei Segmenten** und einer Fingerjunction bei `x_f`: `s = v⁺ + v⁻; v⁺ ← v⁺ − k·s; v⁻ ← v⁻ − k·s` (Dämpfer-Junction, A: aus der Wellenimpedanz; Moden mit Knoten bei `x_f` haben s = 0 und bleiben ungedämpft → **das Flageolett entsteht physikalisch**, nicht per Filter). Steg: Einpol-Tiefpass (Helligkeit/T60) + Verlust `g = 10^(−3/(T60·f))` je Umlauf (V index 4620 `genKS`), Dispersion: 2 Allpässe erster Ordnung mit Rings-Formel `ap = −0,618·d/(0,15+|d|)` (V src/mi_rings_string.cc, synthesis §2.16), FracDelay mit Lagrange-3; Gesamtlänge `SR/f − Gruppenlaufzeiten`. Zupf: 1 Periode gefiltertes Rauschen (vel = Helligkeit) mit Kammfilter der Zupfposition (wie `genKS` `pos`, V index 4624–4626) in beide Richtungen. **E-Bow:** Abgriff am Steg → `tanh(G·x)` (Tabelle) → Einpol-Bandpass bei f (oder 2f bei y > 0,95) → zurück an der Zupfposition mit Gain `g_eb(y)`; oberhalb der Schwelle wird die Schleifenverstärkung > 1, `tanh` begrenzt (Kante; Lyra-/Larsen-Gefühl ohne eigene Engine).
  **y:** 0–0,3 Handballen (k_Steg: Thud → offen), 0,3–0,7 offen (Zupfposition wandert leicht), 0,7–0,85 Flageolett (`x_f` = ½, ⅓, ¼; k = `flageolett`), 0,85–1 E-Bow. **vel:** Zupfhärte/Helligkeit. **burst:** Zupf, Gate = Handdämpfung danach (kurzes Gate = Palm-Mute-Riff), `burstEnv` auf `v.out`. **setF:** `freq`-Param (Delay je Block nachgezogen → sauberes Glissando). **Bebung:** `detune`. **release:** Dämpfer k → 0,3 für `rel`, `v.out` fällt mit `sustainRelease`.
  **Stufe 3:** zwei Saiten L/R ±3 ct (Doppelchor) + Korpus (2 Reso im Worklet bei 180/420 Hz, T60 80 ms).
- **Parameter (6):** Dämpfung 2,5 s (T60 offen), Steifheit 0,25 (Dispersion), Zupfort 0,13, Flageolett 0,3, E-Bow 0,5 (Schwelle/Gain), Rel 0,25 s.
- **Spiel:** Slide-Melodien in einer Spalte-zu-Spalte-Bewegung, Vibrato per Bebung, Flageolett-Akkorde, mit E-Bow Drones aus gezupften Tönen; Puls-Spur mit kurzem Gate = gedämpfter Bass.
- **Kosten (A):** 4 Delay-Reads 24 Flops + Junction 6 + Steg 3 + 2 Allpässe 8 + E-Bow 8 ≈ 50 Flops ≈ 35 ns → 0,29 + 0,06 + 0,09 ≈ **0,45 / 0,9**.
- **Risiken:** Gleiten ändert die Delaylänge je Block → bei schnellen Slides Pitch-Stufen (2,7 ms) – FracDelay-Ziel je Sample interpolieren (billig); E-Bow-Rückkopplung + Flageolett zugleich kann Moden wechseln (gewollt, aber Pegel) → RMS-Kappung im Worklet; Saite (offline) wird zum „billigen Zwilling“ → Bibliothek: Sehne = „lebendig“, Saite = „viele Stimmen“ (0,35).
- **Integration:** `MACRO.shn = ['shn.ebow','shn.daempfung']`; `RG_S`: nein (gehalten); Rassel: nein.

## 4. Chitin (`chi`) – der gewölbte Panzer (nichtlineare Modalplatte, Worklet)

- **Pitch:** „Ein gewölbter Chitinpanzer – geschlagen blüht er nach oben auf, gerieben flirrt er bis ins Chaos“
- **Art:** gehalten (Tipp = Schlag + Nachklang; Finger bleibt = Reiben). Pfad: **W `myzel-plate`**.
- **Klang (10 s):** Schlag: erst ein heller Tick, dann **blüht** der Klang 300–500 ms lang nach oben auf – Energie wandert in hohe Moden wie beim Crash-Becken, die tiefsten Moden sacken bei hartem Schlag leicht ab (Opern-Gong-Glide), dann ein langes, schillerndes Ausklingen mit schwebenden Dubletten. Finger drauf lassen und reiben (Höhe): leise = weiches Schimmern; höher = die Kaskade nährt sich selbst – **Wellenturbulenz**, ein zischendes, brodelndes Flirren ohne feste Tonhöhe (Kante ≈ 0,7); wieder tiefer = beruhigt sich zum Ton.
- **Novum:** Gong fälscht das Aufblühen mit verzögertem Einblenden (V code-map §4 „bloom“); Schale/Glocke sind linear. Die echte Physik (Chaigne/Touzé: Energieaustausch, dann Wellenturbulenz, Kaskade ~0,5 s, Glide abwärts ≈ 20 %, V synthesis §2.17) existiert nur als Forschungscode. Abgrenzung: biologist „Moder“ (Verdauung), „Jahresring“ (Holz/Jahreszeiten), performer „Zwiesel“ (Zweiklang offline). Chitin ist **Position + Kaskade + Reiben**.
- **DSP (`myzel-plate`):** M = 12 (L3: 24) `Reso` mit Plattenmoden `f_k = f·(1 + c·k)^1,3` (Wölbung c, A: Kirchhoff-nahe Streckung), Dubletten ±0,3 % je Note neu gewürfelt (Schwebung, „kein Panzer gleicht dem anderen“), `t60_k = T60/(1 + 0,3k)`. **Anregungsgewicht nach Position:** `g_k = |sin(π·m_k·y + φ_k)|` aus einem (m,n)-Index je Mode (Chladni-Muster, V synthesis §2.18) – auf Knotenlinien verschwindet eine Mode: der Finger wählt den Klang physikalisch. **Kaskade:** Plattenauslenkung `u = Σ x_k`, `nl = β·u³/(1 + u²)` (sättigend, Tabelle), zurück in alle Moden mit `w_k ∝ k` (hohe Moden bekommen mehr → Bloom); **Pitch-Sag:** je Block `ω_k ← ω_k·(1 − ε·rms(u)²)` (Duffing-weich, V synthesis §2.17 Näherung). Reiben: Rauschen × y durch Einpol + Elements-„particle“-Telegraph (Zustand flippt zufällig, V src/mi_elements_exciter.cc 214–240) in die Moden mit `g_k`.
  **y:** Anschlag-/Reibposition (Moden an/aus) **und** Reibdruck (Kaskadentreiber); Kante bei β·rms² ≈ 1. **vel:** Impulsbreite (weich = dunkler Schlägel) und Energie (Sag-Tiefe). **burst:** Schlag, Gate = Abdämpfen (kurz = „Chick“, lang = offen), `burstEnv`. **setF:** `freq` (alle Moden gleiten – unphysikalisch, aber musikalisch: „der Panzer schrumpft“). **Bebung:** `detune`. **release:** natürlicher Nachklang über `rel` = T60.
  **Stufe 3:** 24 Moden, ungerade Moden L / gerade R (Dubletten-Stereo ohne zweite Instanz), Kaskade mit 2. Ordnung (quadratischer Term → Differenztöne).
- **Parameter (6):** Wölbung 0,5, Dicke 0,5 (T60 2 s ↔ 8 s, Helligkeit), Schlag 0,5 (Härte), Chaos 0,4 (β), Schwebung 0,3, Rel (= Dämpfen beim Loslassen) 1,5 s.
- **Spiel:** Dieselbe Note an fünf Höhen = fünf Instrumente; Reiben + Vorneigen = Turbulenz; Puls mit Gate-Längen = Becken-Hi-Hat-Sprache; Stufe 3 Panzer-Drone als Fläche.
- **Kosten (A):** 12 Reso 54 ns + Kaskade 12·2 + Tabelle ≈ 15 ns + Exciter 5 ≈ 75 ns → 0,62 + 0,06 + 0,09 ≈ **0,75 / 1,6**.
- **Risiken:** Instabilität der kubischen Rückkopplung → sättigende Form + Energiekappung je Block (Σ|x_k|² > E_max ⇒ ×0,5); Sag per Koeffizientenupdate je Block kann zippern → Rotation mit Lerp über den Block; Moden > 0,45·SR weglassen (V code-map §11.5).
- **Integration:** `RG_S` (Sporenregen) ja – als `hit()` mit 0,22 s ist es ein Becken-Chick (V code-map 8772); Rassel ja; `MACRO.chi = ['chi.chaos','chi.woelbung']`; `safeify`: `chi.chaos` ≤ 0,8.

## 5. Blasebalg (`blg`) – freie Zunge und Balg (Harmonium, Worklet + fester Körper)

- **Pitch:** „Ein Balg und eine freie Zunge: Atem, der zum Ton wird, Druck, der ihn würgt – Harmonium und Sho, die atmen“
- **Art:** gehalten. Pfad: **W `myzel-reed`** + Körper als **IIRFilterNode** (L3 optional ConvolverNode).
- **Klang (10 s):** Unten nur Balgwind (Luft durch den Schlitz, kein Ton). Mehr Druck: die Zunge **spricht spät an** und von unten (50–150 ms Tonhöhen-Dip), setzt sich zu einem warmen, leicht näselnden Zungenton mit den Holzresonanzen des Kastens. Mehr Druck: heller, lauter, Tonhöhe sackt; ganz oben **würgt** die Zunge – sie stottert, fällt ab, verstummt (die klassische Überdruck-Kante). Puls-Schläge sind Balgstöße: jeder spricht die Zunge neu an (Bellows-Shake-Tremolo der Akkordeonisten). Neigen = Balgdruck. Bebung = Druckwobbeln (freie Zungen biegen kaum – das ist physikalisch richtig und klingt echt).
- **Novum:** Hauch ist gefiltertes Rauschen, inventor „Halm“ ein Rohr mit Überblasen, Hohlstamm (§1) ein Lippenrohr; **die freie Zunge** (Harmonium, Akkordeon, Sho/Sheng, Mundharmonika) mit Druckschwelle, Ansprache-Dip und Würgen gibt es in keiner Touch-App als Physik (A; Sampler ja). Der Reiz ist die Balg-Geste (Tilt/Puls) am Hopf-Punkt (P1).
- **DSP (`myzel-reed`):** Zunge als Masse-Feder: `x'' = −ω_r²x − 2ζω_r x' + (A/m)·Δp`, `ω_r = 2πf·2^(detune/1200)` (die Zunge bestimmt die Tonhöhe – anders als Rohrmodelle); Strömung `U = C·w·max(0, h0 + x)·sgn(Δp)·√|Δp|` (Bernoulli-Ventil, Tabelle für √), die Zunge schlägt durch den Schlitz (x < −h0 → U = 0) → Pulsfolge; Kammer `p_c' = (U_balg − U)/C_c`, `Δp = p_balg − p_c` (Druck-Strömungs-Kopplung liefert die Einsatzschwelle p_th als Hopf-Bifurkation, A: Tarnopolsky/Fletcher-Klasse, nicht in `research/` belegt); **Würgen** explizit: statische Auslenkung `x_0 = κ·Δp` schiebt die Zunge bei hohem Druck aus dem Schlitzbereich → Amplitude → 0 (steuerbar, physikalisch plausibel). Ausgang = U (Pulsfolge) + Windrauschen `∝ √Δp·(1−r)`.
  **Körper:** ein `IIRFilterNode` (Ordnung 20 = 10 feste Moden eines Holzkastens, Verhältnisse 1 : 1,47 : 2,09 : 2,56 … (V src/cs_manual_modal3.xml Holzplatten) um 180 Hz, T60 40–120 ms); Koeffizienten unveränderlich = unpitched Körper, einmal berechnet (`A.blgIIR` je Stufe), Stabilität mit Margin (Radius ≤ 0,995; V wa §7: keine Stabilitätsprüfung in Blink). Stufe 3 statt dessen Convolver mit 120-ms-IR aus dem DSP-Worker (`genIR`-Muster, V index 2191) – **nur wenn die Bench es trägt**.
  **y:** Balgdruck `p_balg = 0,2 + 1,1·y` mit Schwelle p_th ≈ 0,35 (Ansprache ab y ≈ 0,15) und Würgen ab y ≈ 0,9. **vel:** Balggeschwindigkeit (hart = Druck sofort, Dip kurz; weich = langsamer Einsatz). **burst:** Druckpuls über `gate` (Balgstoß), `burstEnv`. **setF:** `freq`. **Bebung:** `detune` (klein) + 30 % als Druckmodulation.
  **Stufe 3:** zweite Zunge „Register“ (Oktave oder Quinte, ±3 ct), Convolver-Körper stereo.
- **Parameter (6):** Druck 0,5 (Grundlage, Tilt-Ziel), Ansprache 0,5 (ζ: 30–150 ms), Register (SEL 8′ / 16′+8′ / 8′+5⅓′ – zweite Zunge nur L3, sonst Farbe), Balg 0,4 (Trägheit des Drucks), Kasten 0,5 (Körpermischung), Rel 0,2 s.
- **Spiel:** Drones mit Balgatmung (Tilt langsam hin und her), Puls-Spur = Bellows-Shake, Akkorde = Sho-Cluster (Stufe 3), unten = Windgeräusch als Pause.
- **Kosten (A):** Zunge ≈ 25 Flops ≈ 15 ns → 0,12 + 0,06 + 0,09; IIR ≈ 0,12 (ein Node, ≈ 10 Biquad-Rechnungen nativ); 2 Gains → **≈ 0,45 / 1,0** (Convolver +0,3 A, messen).
- **Risiken:** Die Zungen-ODE braucht ≥ 2 Schritte je Sample für f > 1 kHz (Stabilität des expliziten Integrators) → semi-implizit (Verlet) oder Zungenbereich bis 1,2 kHz + Fold; ob Schwelle/Würgen im Modell *von selbst* sauber kommen, ist A → explizite `x_0`-Kopplung sichert es; IIR-Körper ohne Stabilitätsprüfung → Koeffizienten vorab in JS auf |Pole| prüfen.
- **Integration:** `hst`/`blg`/`sld` → Gestik-Rassel nicht; `MACRO.blg = ['blg.druck','blg.kasten']`; `MODT`-Ziel `blgP` (Druck) für Ladung („Balg pumpt“).

## 6. Balz (`blz`) – die Reibtrommel (Cuíca, Worklet)

- **Pitch:** „Reibtrommel – ein Stab reibt das Fell, und das Fell stöhnt, lacht und brüllt (Cuíca, Löwengebrüll)“
- **Art:** gehalten. Pfad: **W `myzel-rub`** (teilt Bogentabelle/Reso mit inventor „Harz“; kann ein Prozessor mit Modensatz „Fell“ sein).
- **Klang (10 s):** Finger drauf: der Stab beginnt zu reiben – ein tiefes Stöhnen, das mit dem Druck steigt; die Hand auf dem Fell (Höhe) biegt die Tonhöhe hoch und macht aus „uuh“ ein „wah“. Kurze schnelle Striche (Puls) = das Lachen der Cuíca („ha-ha-ha“); fester Druck tief = Löwengebrüll (Brummtopf). Antippen = dumpfer Fellschlag.
- **Novum:** Membran ist ein geschlagenes Fell (V code-map §4); Reibung fehlt in allen 14 (V synthesis §0). inventor „Harz“ streicht Glas/Schale/Stab (Modensätze 1 : 2,32 … bzw. Dubletten), „Zapfen“ kratzt; performer „Kiefer“ ist Maultrommel. Das Fell mit dem Stab in der Mitte hat **wenige, unharmonische Moden und eine Hand als Formant** – das tierisch-stimmhafte Lachen, das keine App hat (A).
- **DSP (`myzel-rub`):** Stick-Slip mit STK-Bogentabelle `y = clamp((|Δv·slope| + 0,75)^−4, 0,01, 0,98)` (V src/stk_BowTable.h; `POW4`-Tabelle), `slope = 10 − 9·p` (V synthesis §2.10); `Δv = v_stab − Σ_k out_k`, Kraft in die Moden. Fell am Zentrum angeregt → nur achsensymmetrische Moden (0,n): 1 : 2,296 : 3,600 : 4,903 (Bessel-Nullstellen, A: Standardwissen) + zwei (1,n)-Moden (1,593 ; 2,917) mit kleinem Gewicht für die Hand außerhalb der Mitte; `Reso` je Mode, T60 0,3–1,2 s. Stab: Zielgeschwindigkeit mit Trägheit `v += 0,0005·(ziel − v)` (V STK 0,9995-Muster), Richtungswechsel alle 0,5–1,5 s (Hand geht hin und her → „uh-uh“), Random-Walk ±10 % („Rubbeln“). **Hand:** y → Spannung/Masse: alle `f_k` × 2^(y·0,4) (bis +480 ct, Cuíca-Biegung) und T60 × (1 − 0,6y) + ein Einpol-Formant bei 600–1800 Hz (die Handhöhle, „wah“). Ausgang durch `tanh`.
  **y:** Hand (Tonhöhenbiegung + Formant + Dämpfung) – die Stimme der Cuíca. **vel:** Stabdruck p (leise = Hauchen/Flautando, laut = Brüllen). **burst:** ein Strich über `gate` (kurz = „ha“, lang = „haaa“), Pulsdichte macht das Lachen; `burstEnv`. **setF:** `freq`. **Bebung:** `detune` (Stabvibrato). Gestik vorneigen = Druck.
  **Stufe 3:** 8 Moden, Kessel als 2 Reso (Helmholtz 90 Hz + Schale 1,2 kHz), L/R-Dubletten.
- **Parameter (6):** Druck 0,5, Strich 0,5 (Richtungswechsel-Rate), Hand 0,5 (Biegungstiefe), Fell 0,5 (T60/Härte), Kessel 0,4, Rel 0,3 s.
- **Spiel:** Höhe als Hand wie beim Wah-Pedal, Puls-Spur mit Dichte = Lachen, tief + fest + lang = Raubtier; gut im Regen? nein (gehalten).
- **Kosten (A):** 5 Reso 23 ns + Bogen 5 + Stab 3 + Formant 3 ≈ 35 ns → 0,29 + 0,15 ≈ **0,45 / 0,8**.
- **Risiken:** Stick-Slip auf einer Membran mit wenigen Moden kann in Dauerschlupf (Kratzen) kippen → `slope`-Bereich begrenzen, Rauschen zumischen; Biegung per Koeffizientenupdate je Block → Lerp; „Brüllen“ braucht Pegelkontrolle (`tanh` + Peak auf mem-Referenz 0,62).
- **Integration:** `MACRO.blz = ['blz.hand','blz.druck']`; Rassel: nein; Gestik-Neigung → `druck` (MODT).

## 7. Nerv (`nrv`) – der feuernde Nerv (Izhikevich-Neuron, Worklet, gekoppelt)

- **Pitch:** „Ein Nerv, der feuert: aus Reizstrom wird Puls, aus Puls wird Ton, aus Ton werden Salven – und Nerven stecken sich an“
- **Art:** gehalten. Pfad: **W `myzel-nerv`**, Kopplung über Modul-Scope `NERV[]`.
- **Klang (10 s):** Finger drauf = Strom fließt: unten ein langsames Ticken (10–30 Hz, Unter-Audio), Höhe hoch = regelmäßiges Feuern beschleunigt in einen gestimmten, sägenden Summton (kalibriert auf die Note); 0,5–0,8 = **Bursting**: der Ton kommt in rhythmischen Salven (Chattering) – Rhythmus in der Note; > 0,85 = chaotisches Feuern, ein knisterndes, lebendes Rauschen. Puls-Schlag = Strompuls: eine Salve, dann Stille, dann **ein Nachschlag von selbst** (Post-inhibitory rebound). Zwei Finger: elektrisch gekoppelt – sie synchronisieren (gleiche Tonhöhe) oder wechseln sich ab (hemmend) – das Intervall entscheidet.
- **Novum:** Spiking-Neurone als Audio-Oszillator mit Erregbarkeit (Schwelle, Refraktärzeit, Rebound, Bursting) gibt es in keinem Synth (A). Abgrenzung: composer „Grille“ (Pulsar-Fenster), biologist „Glühwurm“/„Unke“ (Rhythmus-Synchronisation, Rufe), performer „Wurm“ (Rungler), composer „Brandung“ (Duffing). Nerv ist ein **Relaxationsoszillator mit Regimewechseln**, der Mechanismus ist biologisch (musicians §7.10).
- **DSP (`myzel-nerv`):** Izhikevich: `v' = 0,04v² + 5v + 140 − u + I; u' = a(bv − u); v ≥ 30 ⇒ v = c, u += d` (A: Standardmodell, Zeit in ms); Zeitskalierung `dt_eff = dt·s`, s so, dass Feuerrate = f: **Kalibriertabelle** `I(f)` einmal im Modul-Scope (Modell offline 64 Stromwerte laufen lassen, Rate messen, invertieren) + schwache sinusförmige Treibung bei f (Entrainment, hält die Rate exakt auf der Skala). Regime nach y: Parameterpfad (a,b,c,d) regular spiking (0,02; 0,2; −65; 8) → intrinsically bursting (0,02; 0,2; −55; 4) → chattering (0,02; 0,2; −50; 2) → fast spiking + Rauschstrom (A: Izhikevich-2003-Tabelle). Ausgang: `Körper` SEL: (a) v(t) selbst (DcBlock + Softclip = lebende Säge), (b) Spikes → 2 `Reso` bei f, 2f (T60 30 ms) = tonaler Körper (Standard: Tonhöhe bleibt auch im Bursting hörbar). **Kopplung:** je Block schreibt jeder Prozessor sein v nach `NERV[slot]`, liest die anderen: `I_c = g·Σ(v_j − v_i)` (Gap Junction, Blockrate 2,7 ms reicht für Synchronisation, A); `g` = Param `kopplung` (negativ = hemmend; Option „ausweichend“: Jamming Avoidance wie beim Zitteraal, A). Puls-Hits schreiben in dasselbe Feld (P3).
  **y:** Regimepfad (Tick → Ton → Salven → Chaos); Kante bei 0,5 (Bursting setzt ein). **vel:** Stromstoß-Überschuss, der mit `rel` abklingt. **burst:** Strompuls für `gate` + Rebound. **setF:** `freq` → I(f) + s. **Bebung:** `detune` (auf s).
  **Stufe 3:** zwei Neurone L/R, gegenseitig gekoppelt (g_in), eigenes Rauschen; Körper 4 Reso.
- **Parameter (6):** Strom 0,5 (Grund-I), Kopplung 0,3 (−1…1), Körper (SEL Nackt/Resonanz, d Resonanz), Rauschen 0,2, Rebound 0,5, Rel 0,4 s.
- **Spiel:** Akkorde liegen lassen und hören, wer wen mitnimmt; Puls-Spur Nerv unter Nerv-Akkord = der Rhythmus feuert in die Haltenden; Höhe langsam = vom Ticken zum Ton (Risset-artig ohne Illusion).
- **Kosten (A):** ODE 12 Flops + 2 Reso 9 ns + Clip 4 ≈ 20 ns → 0,17 + 0,15 ≈ **0,32 / 0,6**.
- **Risiken:** Timbre im Regime „regular“ ist sägenah (Einheitsbrei-Gefahr) → Resonanz-Körper als Default, Bursting als Charakter; Kalibrierung driftet mit Kopplung/Rauschen (gewollt leicht, aber skalenbewusst: Entrainment-Term begrenzt die Abweichung auf ±30 ct, A); expliziter Euler bei kleinem s stabil, bei s groß (hohe Noten) Schrittweite kappen (2 Substeps).
- **Integration:** `MACRO.nrv = ['nrv.strom','nrv.kopplung']`; `MODT`-Ziel `nrvI` (Ladung: „Nerven feuern dichter“).

## 8. Düne (`dun`) – die singende Düne (Kuramoto bei Audiorate, Worklet)

- **Pitch:** „Singende Düne: Tausende Sandkörner rutschen – aus Rauschen wird, wenn sie sich einigen, ein Ton“
- **Art:** gehalten. Pfad: **W `myzel-dune`**.
- **Klang (10 s):** Finger drauf = Sand beginnt zu rutschen: ein körniges Zischen. Höhe hoch = die Körner koppeln – binnen ~1 s **verdichtet sich das Zischen zu einem tiefen, rauen Brummen auf der Note** (der „Boom“ der singenden Dünen), das Zischen atmet weiter darum; ganz oben ein großer, fast reiner Brummton mit langsamer Rauheit; Höhe runter = es zerfällt wieder in Rauschen. Puls-Schlag = eine Rutschung: beginnt als Zischen und **findet im Gate ihre Tonhöhe** – ist das Gate kurz, rastet sie nie ein (ein Zischpuff). Neigen = Hangneigung (mehr rutscht), Schütteln = neue Lawine.
- **Novum:** Singende Dünen entstehen durch Synchronisation der Kornkollisionen (Douady et al., PRL 2006 „Song of the dunes as a self-synchronized instrument“ – A: aus dem Gedächtnis, nicht in `research/` belegt). Als Synthese: **Kuramoto bei Audiorate** – Tonhöhe entsteht aus Rauschen durch Ordnung. biologist/performer „Glühwurm“ synchronisieren Blitze bei **Rhythmusrate** (V deren §1); Körner ist asynchrone Granularsynthese ohne Ordnung; Schwarm ist FM. Nichts im Markt (A).
- **DSP (`myzel-dune`):** N = 16 (L3: 48) Phasen φ_i, Eigenraten `ω_i = 2πf·2^(detune/1200)·(1 + σ·ξ_i)`, σ = Streuung; Mittelfeld `r·e^{iψ} = (1/N)Σ e^{iφ_j}` alle 8 Samples (cos/sin-Tabelle), Kuramoto `φ_i += ω_i·dt + K(y)·r·sin(ψ − φ_i)·dt`; bei Phasenüberlauf emittiert Korn i einen **Kollisionsimpuls** (Zufallsamplitude 0,5–1) in ein Sandbett: 2 `Reso` (f, 1,5f; T60 15 ms) + Einpol-Tiefpass; dazu Rieselrauschen `∝ rate·(1 − r)`. Kritische Kopplung `K_c ≈ 2σ·ω` (A, Kuramoto-Standard für Lorentz-Streuung) liegt bei y ≈ 0,45 → Einrasten als Kante; Einrastzeit ∝ 1/(K − K_c) → die Puls-Gate-Länge entscheidet, ob es singt.
  **y:** Kopplung K (Zischen ↔ Brummen). **vel:** Lawinengröße = Kollisionsrate/Pegel und σ-Zuwachs (große Lawine = breiter, braucht länger). **burst:** Rutschung ab r = 0 über `gate`, `burstEnv`; **Phasen bleiben zwischen Hits erhalten** (Puls-Spur: jede Rutschung beginnt da, wo die letzte endete – P8). **setF:** `freq`. **Bebung:** `detune` auf alle ω_i. Gestik-Schütteln → Phasen neu würfeln (`{set:{shake:1}}`).
  **Stufe 3:** N = 48, Körner mit ξ > 0 nach L, ξ < 0 nach R (die Düne ist breit), drittes Reso 2,2f.
- **Parameter (6):** Streuung 0,08 (σ), Kopplung 0,5 (K-Skala), Lawine 0,5 (Rate), Sandbett 0,5 (Tiefpass/Reso-Q), Rieseln 0,4, Rel 0,6 s.
- **Spiel:** Tiefe Noten (die echte Düne singt bei 70–105 Hz, V synthesis-nah; hier frei), lange Haltetöne mit langsamer Höhe; Puls mit langen Gates = atmende Brummakkorde; Oktave der Spielfläche tief wählen.
- **Kosten (A):** 16 Phasen 48 Flops + Kopplung/Mittelfeld (≈ 150 Flops / 8) 19 + Impulse 5 ≈ 72 Flops ≈ 40 ns + 2 Reso 9 ns ≈ 50 ns → 0,41 + 0,15 ≈ **0,5 / 1,2**.
- **Risiken:** Bei kleinem N ist das Brummen periodisch-sauber (zu „synthetisch“) → Jitter der Impulsamplituden/-zeiten (±5 %) hält die Rauheit; Namensnähe zu „Körner“ (Sand*körner*) → Untertitel sagt „Sand“, nicht „Körner“; Einrastzeit bei σ groß > 2 s → `kopplung` skaliert K über K_c.
- **Integration:** `MACRO.dun = ['dun.kopplung','dun.lawine']`; `MODT`-Ziel `dunK` (Ladung: „Düne rastet ein“); `safeify`: `dun.streuung` ≤ 0,25.

## 9. Nuss (`nus`) – die fallende Nuss (Prallkaskade, offline)

- **Pitch:** „Eine Nuss fällt aufs Holz: hüpft, prasselt, rollt aus – jeder Schlag ist eine ganze Kaskade“
- **Art:** geschlagen. Pfad: **O** (DSP-Worker, `KS_CACHE`-Muster) + BufferSource.
- **Klang (10 s):** Ein holziges „Tock“, dann eine sich beschleunigende Reihe kleinerer Tocks (tock… tock.. tock.tock.tocktocktock-brrr), die in ein kurzes Rollen mündet. Höhe = Fallhöhe/Elastizität: unten ein toter Plumps (ein Schlag), Mitte 5–8 Hüpfer, oben eine lange Prasselkaskade, die als Surren endet. Anschlag = Nussgröße (groß = tiefer, länger, weniger Hüpfer). Spalte = Tonhöhe des Bretts (Holzstabmoden), die Nuss selbst klingt fix hoch (2,5–4 kHz, je Note leicht anders).
- **Novum:** Rhythmus **innerhalb** eines Schlags aus Physik (geometrische Prallzeiten) – Elements/Chromaphone haben „bouncy particles“/Mallet-Bounce als Erreger (V musicians §2.5/§2.9), als Touch-Quelle mit Höhe = Fallhöhe fehlt es (A). Novum **mittel** – aufgenommen, weil es den O-Pfad perfekt zeigt (jede Physik zum Preis von 0,35) und der Puls daraus Polyrhythmen macht. Abgrenzung: Tropfen (Blasen), performer „Kapsel“ (Shaker), Sporenregen-Keime (Makro-Hüpfen im Raster, V code-map §7) – Nuss hüpft im Mikro.
- **DSP (Worker `genNuss(f, yq, sizeq, sr)`):** Prallzeiten `t_n = t_{n−1} + 2v_{n−1}/g`, `v_n = e·v_{n−1}`, e = 0,45 + 0,4·y, `v_0 = √(2g·h_0)`, h_0 = 0,05 + 0,6·y m; Abbruch bei v < v_min → Rollphase (100–300 ms tiefpassgefiltertes Rauschen mit der tiefsten Brettmode). Kontakt n: Hertz-Impuls (Halbsinus, Dauer `τ_c ∝ v^−1/5` ≈ 0,3–1 ms, Amplitude ∝ v^6/5, A: Hertz-Kontakt) in (a) Brett: 3 Moden Holzstab 1 : 2,572 : 4,644 (V src/cs_manual_modal3.xml) um f, T60 0,25–0,6 s, Gewichte je Prall zufällig ±30 % (Aufschlagort wandert), (b) Nuss: 1–2 Moden 2,5–4 kHz, T60 20 ms, (c) Zeitjitter ±3 %. Zwei Varianten je Key, abwechselnd gespielt. Cache-Key `(round(f·10), yq ∈ 0..5, sizeq ∈ 0..2, SR)`, LRU wie `KS_CACHE` (80 Puffer / 1e7 Frames, V index 4655), Nachbar bis ±2 Halbtöne per `playbackRate` (die Prallzeiten skalieren mit – ab 3 Halbtönen hörbar, deshalb enger als Saites ±2 Oktaven), `warmNuss()` wie `warmKS` für die Skalentöne (V index 4685).
  **y:** Fallhöhe/Elastizität (quantisiert 6 Stufen). **vel:** Größe (3 Stufen) + Pegel. **burst/Puls:** jeder Schritt ein Fall; Gate kürzer als die Kaskade = „gefangen“ (`v.out` schließt). `decayMul` skaliert e. Stufe 3: Stereo-Render (Nuss wandert L→R über die Pralle), 4 Brettmoden.
- **Parameter (5):** Holz 0,5 (Brett-T60/Helligkeit), Elastisch 0,5 (e-Skala), Nuss 0,5 (Eigenresonanz), Rollen 0,4, Spread 0,3 (Zeitjitter).
- **Spiel:** Puls-Spuren mit Nuss = Polyrhythmen aus Physik; Sporenregen mit Nuss (`RG_S`) = Herbst; Rassel ja (Gestik-Schütteln = Nüsse); Wirbel (`rollTick`) = Nussregen.
- **Kosten:** **0,35 / 0,5** (V: wie Saite, BufferSource + Gain); Offline ≈ 5 ms je Puffer (A).
- **Risiken:** Cache-Größe (30 Noten × 6 × 3 × 2 Varianten = 1080 Keys) → `warmNuss` nur y-Stufe des aktuellen Fingers/der Spur + Nachbarn, Rest on demand; Prallzeiten per `playbackRate` verschoben → enge Nachbarschaft; „niedliches“ Image → Untertitel ernst, tiefe Presets (große Nüsse auf dickem Holz = Marimba-Rimshot-Kaskaden).
- **Integration:** `RG_S` + Rassel-Liste + Validierung (V code-map 8772/8816/10527); `MACRO.nus = ['nus.elastisch','nus.holz']`; `DSP_FN`/Worker-Quellenliste um `genNuss` (V index 2769/2773, keine Closures).

---

## 10. Übersicht

| Key | Name | Art | Mechanismus unter y | Kante | Pfad | Kosten L1 / L3 (A) | Koppelt |
|---|---|---|---|---|---|---|---|
| hst | Hohlstamm | gehalten | Mund-Formant → Lippenspannung | Modensprung y ≈ 0,8; Ansprache | nativ (Delay-Zyklus, ≤ 750 Hz, gefaltet) | 0,65 / 1,3 | – (L3-Option: zwei Rohre ziehen sich) |
| sld | Schlund | gehalten | Zunge (Vokal → Frikativ) | Enge y ≈ 0,85 | W `myzel-tract` | 1,2 / 2,4 | – |
| shn | Sehne | gehalten | Hand: Dämpfen → offen → Flageolett → E-Bow | Flageolett 0,7, E-Bow 0,85 | W `myzel-string` | 0,45 / 0,9 | – |
| chi | Chitin | gehalten (Tipp = Schlag) | Position + Reibdruck → Kaskade | Turbulenz y ≈ 0,7 | W `myzel-plate` | 0,75 / 1,6 | – |
| blg | Blasebalg | gehalten | Balgdruck: Wind → Ton → Würgen | Hopf 0,15, Würgen 0,9 | W `myzel-reed` + IIRFilterNode | 0,45 / 1,0 | – |
| blz | Balz | gehalten | Hand: Biegung + Formant | Dauerschlupf bei hohem Druck | W `myzel-rub` | 0,45 / 0,8 | – |
| nrv | Nerv | gehalten | Regime: Tick → Ton → Salven → Chaos | Bursting 0,5 | W `myzel-nerv` | 0,32 / 0,6 | ja (Modul-Scope `NERV`) |
| dun | Düne | gehalten | Kopplung: Rauschen → Ton | K_c y ≈ 0,45 | W `myzel-dune` | 0,5 / 1,2 | – |
| nus | Nuss | geschlagen | Fallhöhe → Kaskadenlänge | – (Physik) | O Worker + BufferSource | 0,35 / 0,5 | – |

Verteilung: 8 gehalten, 1 geschlagen; 2 ohne Worklet (hst, nus), 7 Prozessoren in einem Modul. Alle neun spielen im Puls über `burstEnv` mit physischer Kurzform (Zungenstoß, Plosiv, Zupf, Schlag, Balgstoß, Strich, Salve, Rutschung, Fall). Novitäts-Checkliste (musicians §7.9: koppelt / Kante / lebt unbespielt / Mechanismus wechselt mit y·vel / unzerbrechlich / ≤ 1,5): nrv 6/6, chi 5/6, dun 5/6, shn 5/6, blg 5/6, hst 4/6, blz 4/6, sld 4/6, nus 3/6 (Streichkandidat, falls acht genügen).

Loudness-Referenz (V code-map §4): Peaks an neb 0,48 / hau 1,0 / mem 0,62 / sai 1,5 anlehnen; Worklet-Ausgang auf −12 dBFS RMS normiert, `v.out`-Peak wie Hauch.

**Bench-Pflicht vor dem Einbau** (V wa §8): je Engine 24 Stimmen offline gegen Nebel (`research/bench/wa_bench.html`-Muster, `OfflineAudioContext(2, 96000, 48000)`, min aus 2 Läufen), Stufe 3 separat; dazu drei Einzelmessungen, von denen Entscheidungen abhängen: ConvolverNode mit 120-ms-IR je Stimme (Blasebalg L3), IIRFilterNode Ordnung 20 (Blasebalg L1), nativer Zyklus mit 5 Biquads + Shaper + 3 Signal-auf-Param-Gains (Hohlstamm).

---

## 11. Vertiefen statt neu (ohne die neun zu ersetzen)

| Engine | Vertiefung | Warum / Pfad | Kosten |
|---|---|---|---|
| **Gong** | echte Kaskade + Pitch-Sag statt „bloom“-Einblenden | `myzel-plate` (§4) mit Gong-Modensätzen als Stufe-3-Pfad; die Gong-PeriodicWave-Gruppen bleiben Stufe 1 | L3 1,6 statt 2,8 – billiger **und** echter |
| **Saite** | Hammer-Nichtlinearität (Kraft ∝ Kompression^1,5, harter Anschlag = hell) + Spannungsmodulation (Tonhöhe sinkt beim Ausklingen) + 2 gekoppelte Saiten ±2 ct | offline in `genKS` (V code-map §2), Cache um `vel`-Stufe (3) | 0,35 |
| **Membran** | Sprechtrommel: Höhe biegt die Tonhöhe **während** des Klingens (Spannungsschnüre), Schnarrsaite als Kollisions-Rauschen | nativ: `detune` der Moden-Oszillatoren live per `setY` (`setP`), Schnarren = Noise-Gate vom Fellsignal | +0,1 |
| **Obertöne** | Kargyraa-Register: Periodenverdopplung der Stimmlippen bei y > 0,9 (Sub-Oktave mit Rauheit) | Glottis-Wave + Halbrate-Shaper (`A.waves.obtGlottis` Variante mit jeder zweiten Periode gewichtet) | +0,05 |
| **Stimme** | Plosive/Frikative aus §2 als Burst-Vorsilbe (`stm.konsonant` SEL) | 10-ms-Rauschburst durch die bestehenden Formant-Biquads | +0 |
| **Körner** | pitchsynchroner Modus (PSOLA): Pitchmarken offline, Körner = 2 Perioden Hann an Zielperiode | Worker (Marken) + `spawnGrain` mit periodensynchronen Zeiten; composer „Raupe“ liegt nahe – abstimmen | 0,6 |
| **Tiefe** | gemeinsamer Fold-Helfer mit Hohlstamm (§1), optional Rohr-Modus = Hohlstamm-Fallback bei fehlendem Worklet? (nicht nötig: Hohlstamm ist nativ) | Refactor `base(f)` nach außen | 0 |
| **Hauch** | fester Körper (Muschel/Schädel) als IIRFilterNode Ordnung 20 statt 1 Bandpass | 1 Node | +0,1 |

**Plattform-Trick jenseits der neun (A, empfohlen zu messen):** *Einfrieren geschlagener Stufe-3-Stimmen.* Ein `OfflineAudioContext` rendert die **nativen** Knoten einer geschlagenen Stimme (z. B. Gong L3, 2,8 Einheiten) in ~30 ms je Sekunde Audio, Cache je Tonhöhe/Höhe-Stufe → Wiedergabe als BufferSource für 0,35. Risiko: Kontexterzeugung je Render (~ms), Zufallsanteile (Klick, Schlägelrauschen) werden gleich → 2–3 Varianten; Gestik-Bebung kommt dann nur über `detune` der BufferSource (k-rate, V wa §7) – für Nachklänge ausreichend.

---

## 12. Offen / zu messen

1. **Kosten** aller sieben Prozessoren auf Mid-Range-Android (Snapdragon 695-Klasse, V wa §4 Skalierung ×1,0–1,5) – meine Zahlen sind aus der Flop-Formel abgeleitet (A).
2. **Hohlstamm nativ:** Stimmgenauigkeit der Schleife mit drei Filtern; Verhalten der Signal-auf-AudioParam-Multiplikationen bei Blockgrenzen (a-rate, V Spec) – Prototyp als Erstes, weil es die einzige neue *native* Rückkopplungs-Engine ist.
3. **IIRFilterNode** Ordnung 20 mit 10 Moden: numerische Stabilität in float (Blink rechnet double, V wa §7) und Kosten.
4. **ConvolverNode 120 ms je Stimme:** Kosten; falls > 0,4, bleibt der Körper IIR.
5. **Freie-Zungen-ODE:** ob Schwelle und Würgen ohne die explizite `x_0`-Kopplung entstehen (A); Integrator-Stabilität bis 1,2 kHz.
6. **Düne:** Einrastzeiten vs. σ und N nach Gehör; ob N = 16 bei Stufe 1 schon „singt“.
7. **Nerv:** Kalibriertabelle I(f) je Regimepunkt (die Rate hängt von a,b,c,d ab → 2-D-Tabelle y × f, 8 × 64 Werte, offline im Modul-Scope ≈ 20 ms, A).
8. **Schlund:** 24 Zellen gegen 44 × 2 Schritte hörbar vergleichen (Frikative), Entscheidung Stufe-1-Zellenzahl.
9. **Thread-Wechsel-Politik** (§0.5): Laden bei Auswahl vs. bei `initAudio` – mit `playbackStats` (Chrome 146+, V wa §2) auf Android messen, ob der Wechsel mitten im Spiel Underruns macht.
10. Quellen, die ich aus dem Gedächtnis zitiere (A): Douady 2006 (Dünen), Izhikevich 2003 (Neuron), Hertz-Kontakt, Bessel-Verhältnisse der Kreismembran, Tarnopolsky/Fletcher (freie Zunge), Kuramoto-K_c – vor dem Spec-Text gegenprüfen.
