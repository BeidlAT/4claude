# Performer-Ideen: zehn Klangquellen, für die man das Rig zu Hause lässt

Perspektive: Live-Spieler:in für Ambient/Psychedelik/Experiment mit Lyra-8, Plaits/Rings/Beads, OP-1, No-Input-Mixer, Tonbandschleifen und Eurorack. Leitfrage: Was müsste Myzel können, damit das Handy auf der Bühne das Rig ersetzt – ausdrucksstark, tief, leicht unberechenbar, sofort musikalisch, stark unter Puls und Gestik, anders als alles im Koffer? Antwort: zehn Quellen, jede ein **Mechanismus** (kein Preset), jede mit einer Kante, an der das Verhalten kippt.

Legende: **V** = verifiziert (Quelle in Klammern: `research/*.md` §, `index.html` Zeile), **A** = angenommen/abgeleitet. Kosten in Myzel-Einheiten (1,0 = Nebel-Stimme Stufe 1). Kostenskala (V `research/webaudio.md` §4, Chrome x86; Phone ×1–1,5 A): ≈0,03 je nativem Node, Biquad ≈0,06, OSC+Gain ≈0,09, leerer Worklet-Node 0,06, je AudioParam 0,03, 16-Moden-Worklet 0,6, Waveguide-Worklet 0,24.

## 0. Regeln, die alle zehn einhalten

Abgeleitet aus `research/musicians.md` §1 (V) und dem Engine-Vertrag (`research/code-map.md` §3–§6, V):

- **Kante (P1):** die Höhe führt in jeder Quelle an einen Umschlagpunkt (Glut→Blitz, Saite→Feder, Grundton→Terz, Stab→Schrei, Ton→Mixtur, Ton→Havarie, Hauchen→Schreien, Grundton→Oberton, Rieseln→Rauschen, sauber→Bandsättigung).
- **Stimmen reden miteinander (P3):** Glühwurm (Phasen), Tümpel (Wasser), Wurm (Register je Bus), Kreisel (Rotor je Spur), Jahresring (Band) halten **geteilten Zustand** – lazy Singletons wie `A.obtWalk`/`A.swmFly` (V code-map §4), angelegt nach `initAudio` (`A.waves` wird dort geleert, V 2809).
- **Weiterleben (P8):** Zustand bleibt zwischen Puls-Schlägen: Register, Rotor, Wasser, Band, Vactrol-Wärme.
- **Gestik ist der Controller (P9):** Neigung = Energie (Wasser, Saat, Luftdruck, Feder biegen), Schütteln = Stoß (`schuetteln`-Event, V 8604), Drehen = Schwung (`GK_AX` enthält `drehen`, V 8768), Bebung = Detune-Bus über `v.mod()` (V 3464) – jede tonhöhentragende `detune` hängt daran.
- **Unkaputtbar (P11):** Tonleiter-Rasterung in jedem Chaos-Bereich (Wurm-Stufen, Kreisel-Schnappen, Zwiesel-Terz, Kiefer-Obertonreihe, Tümpel-Stimmung „rein“), Rückkopplung nur durch tanh-Tabellen, keine stummen Parameter-Ecken (`dice()` spielt jede Engine zufällig, V code-map §9).
- **Vertrag:** `start(v,t,f,y,vel,o)`; gehalten `setF/setY` nur über `setP`/`glideTo` (nie `holdParam`, V code-map Risiken), `v.release = sustainRelease(...)`, Stoß über `burstEnv` mit `o.gate/o.decayMul`; geschlagen `v.released = true` sofort (sonst gilt die Stimme als gehalten, V 5005). Geschlagene Stimmen bekommen **kein** `setY` nach dem Schlag (`triggerPerc` legt sie nicht in `tt.voices`, V 6073–6084) → Quellen, deren Ausdruck *nach* dem Anschlag liegt (Kiefer, Tümpel), sind `sustain:true` mit eigener Abklingkurve.
- **Keys** geprüft (grep `index.html`, 0 Treffer): `glw snk zwi tum uhz wrm krs kie kps jhr`; keine Kollision mit `composer.md` (zir stru amo rau brn wrz brd pla ast kre) und `inventor.md` (hrz dax hlm khl zpf gsp glt rnk drn boe). **Namen** geprüft (grep): keine Treffer; „Wurzel“ ist Mixer-Vokabular (V 16739/16741) → „Unterholz“ statt „Wurzel“ für die Untertöne.

Reihenfolge unten = Bühnenwert je Aufwand (meine Einschätzung, A).

---

## 1. Glühwurm `glw` – Leuchtkäfer, die zueinander finden

**Pitch:** „Blinkende Töne hinter Lichtschleusen – mehrere Finger finden ihren gemeinsamen Takt“

**Klang (10 s):** Ein runder, weicher Ton (Dreieck durch eine leichte Falte) glimmt im Takt: Aufblitzen in 3 ms, langsam sinkendes Nachglühen, bei dem Lautstärke und Helligkeit gemeinsam fallen (Vactrol-Lowpass-Gate, der „Buchla-Bongo“-Charakter). Ein Finger = pulsierende Fläche. Zwei bis fünf Finger: ihre Blinkraten ziehen sich über 5–20 s an, bis sie synchron oder in festen Mustern blinken; ein neuer Finger stört, alles ordnet sich neu. Läuft der Puls, hört die Wiese ihn als großen Leuchtkäfer und rastet ins Raster ein. Zwischen den Blitzen bleibt eine Glut – nie ganz dunkel.

**Novum:** Vactrol-LPG („living, breathing, non-linear response“, V `musicians.md` §2.9) hat jedes Eurorack; Photophore schwärmt räumlich, Mononoke koppelt per FM (V `musicians.md` §2.8). **Synchronisation von Stimmen über Phasenkopplung** (Kuramoto-Modell, A: Standardwissen; Vorbild Leuchtkäfer-Synchronisation) gibt es in keinem Instrument (A). Mechanismus ist biologisch, Name folgt dem Mechanismus (`musicians.md` §7.10).

**DSP (N, Stufe 1 ≈ 6 Nodes + Automation):**
- Ton: `OSC('triangle', f)` → Falte: WaveShaper mit geteilter Kurve `c(x) = (1−fold)·x + fold·sin(1.5πx)` (`makeShaperCurve`, Muster `tie.curve`, V 4442), Vorverstärkung `pre = 0.6 + 1.6·fold·y` → LPG = `BQ('lowpass')` + Gain `g` → `v.out`. `v.mod(osc.detune)`.
- Vactrol je Blitz bei `t_b`: `g.setTargetAtTime(peak, t_b, 0.003)`, `g.setTargetAtTime(glut, t_b+0.012, τ_off)`; Cutoff gleichlaufend `fc = f·(1.5 + 10·env)` mit denselben zwei Aufrufen auf `frequency`. `τ_off = glow·(0.08 + 0.5·(1−y))·(1 + 1.5·heat)`; `heat += 0.25·heatP` je Blitz, zerfällt mit 3 s → schnelle Folgen = dunklere, längere Schwänze (Vactrol-Gedächtnis). `glut` (0…0.4) hält die Fläche.
- Phase: je Stimme `θ`, `ω = 2π·rate·2^(2(y−0.5))·(1 ± 0.08 zufällig)`. Kuramoto in `tick()` (25 ms, geteilte Liste `A.glwField`): `θ_i += dt·(ω_i + (K/N)·Σ_j sin(θ_j−θ_i) + K_p·sin(θ_p−θ_i))`; `θ_p` = Puls-Phase (`beatAt(now)` auf den Takt-Teiler), nur wenn `SEQ.on`. Nulldurchgang → Blitz zum vorausberechneten Zeitpunkt im Horizont (Muster `grainTick`, V code-map §2).
- Rate-Raster: bei laufendem Puls snappt `rate` auf 1/1…1/16 der Schlagdauer, sonst frei in Hz.
- **y:** Rate (×0.5…×2), Falte (Helligkeit), Nachglühen (unten lang, oben kurz): unten langsames dunkles Atmen, oben helles Flackern. **vel:** Blitzpegel und Startphase (hart = sofortiger Blitz, weich = Beginn in der Glut).
- **Burst:** genau ein Blitz, `τ_off = gate·0.6·decayMul`, `burstEnv` als Rahmen; der Schlag stößt alle gehaltenen Glühwürmer an (`θ_i += 0.5·K_p·sin(θ_p−θ_i)`) – Puls-Muster treiben die Flächen.
- **Gestik:** Neigung → Höhe; Bebung → Detune-Bus; Schütteln → „Aufscheuchen“ (Phasen würfeln, Hook am `schuetteln`-Event).
- **Stufe 3:** zwei Oszillatoren ±4 ct (`A.uni`) links/rechts, je Finger zwei eigene Käfer, die erst zueinander finden → Stereo-Blinken; Falte mit `oversample '2x'`.

**Params (6):** `glw.rate` 0.3–8 Hz (d 1.5) · `glw.coup` Kopplung 0–3 (d 0.8) · `glw.glow` Nachglühen 0.2–4 (d 1) · `glw.fold` Falte 0–1 (d 0.35) · `glw.heat` Wärme 0–1 (d 0.5) · `glw.rel` Loslassen 0.1–6 s (d 1.2). Makros: `glw.coup`, `glw.glow`.

**Spiel:** Akkord halten, Puls dazu – nach einem Takt pulsiert der Akkord im Raster. Oben im Feld = Tremolo-Fläche ohne Leslie. Fingerzahl ist die Komplexität (Stereo-Field-Gefühl, `musicians.md` §2.4).

**Kosten (A):** L1 ≈ 0.35 (OSC, Shaper, BQ, 2 Gain; ≤ 16 Automationsaufrufe/s je Stimme), L3 ≈ 0.8.

**Risiken:** Kann als „LFO-Tremolo“ durchgehen, wenn die Synchronisation nicht hörbar wird → Kopplung kräftig, Glimmen im Spielfeld zeichnen (`visPush`). Gelöste Stimmen glühen weiter → `finish` erst nach `rel`. Neuer Tick-Hook (`ENGINES.glw.tick(horizon)` in `tick()`, V 6040).

---

## 2. Tümpel `tum` – Waterphone, das Wasser kommt aus der Neigung

**Pitch:** „Bronzestäbe in einer Wasserschale – Tippen klirrt, Halten streicht, Kippen lässt das Wasser schwappen“

**Klang (10 s):** Tippen: metallische, unharmonische Stabklänge (Kragbalken-Teiltöne), die in einer hohlen Schale nachhallen. Halten: ein Bogen schwillt an, einzelne Stäbe singen und verlöschen wie Stimmen, dazu Bogenkratzen; oben im Feld schreien alle Stäbe samt hohem Teilton. Kippt man das Handy, schwappt Wasser: alle Stäbe gleiten langsam (±30–80 ct), die Schalenresonanz wandert – das Horror-Glissando; das Schwappen schwingt nach, wenn man still hält.

**Novum:** Waterphone (Waters, ~1967: Schale + Hals + 25–55 Stäbe, Wasser → „aquatic effects and variations of pitch“, V `synthesis.md` §3.9). Kein Synth/App modelliert es; **Wasser als Neigungssensor** ist im Markt unbesetzt (V `synthesis.md` §5 „Waterphone mit Neigungs-Wasser“). Abgrenzung zu Schale: inharmonische Stäbe + Glissando + Bogen statt harmonischer Schalenteiltöne.

**DSP (N):**
- Stäbe: Stufe 1 drei Stäbe + ein Kragbalken-Teilton, Stufe 3 fünf Stäbe + zwei Teiltöne; Kragbalken-Verhältnis 1 : 6.27 : 17.55 (Euler-Bernoulli, A `synthesis.md` §3.7). Stab k: `OSC('sine', f·ρ_k)`; Stimmung `ρ_k`: `rein` = nächste Skalentöne über f (wie `trp.inKey`, V 4517), `schief` (Default) = Skalentöne ±40 ct fest je Note (Hash aus Spaltenindex → reproduzierbar), `wild` = ±150 ct. Alle `v.mod(osc.detune)`.
- Anregung A, Schlägel: je Stab Gain-Hüllkurve `setValueAtTime(a_k·vel, t)`, `setTargetAtTime(0, t, decay_k/6.9)`, `decay_k = nachklang·(1/√ρ_k)`; plus Klopf-Rauschen 6 ms durch Schalen-Biquad.
- Anregung B, Bogen (Pseudo-Streichen ohne Schleife, A `synthesis.md` §2.9): Bogen-Hüllkurve `b(t)` mit Anstieg 0.25 s ab Fingerhalt; Stabpegel `a_k = b·w_k(y)·flutter_k`, `w_k(y)`: unten singt ein Stab (`k=0`), mit y kommen die anderen und der 6.27-Teilton; `flutter_k` = `A.uni[k]`-LFOs (V 2840) als Gain-Modulation (Stäbe kommen und gehen). Kratzen: `noiseSrc → BQ('bandpass', f·ρ_0, Q 12) → Gain(bogen·y)`. Kurzer Tipp (Loslassen < 150 ms): Bogen bleibt unter der Schwelle – nur Schlägel (Dauer wählt den Mechanismus, P2).
- Wasser: geteilter Zustand `A.tumWater = {x, v}` (gedämpfter Oszillator, `ω = 2π·0.8 Hz, ζ = 0.15`), in `tick()` integriert, angetrieben von der **Neigungsänderung** über ein neues Formen-Ziel `tum` (`MODT`/`MOD_EQ`/`FAE_PAR`, Muster `trp`, V code-map §7) – ohne Gestik schwappt `A.driftBuf` leise (V 2818). Wirkung: ein `ConstantSource → Gain(60·wasser)` in jede Stab-`detune` (Cent) plus Schalen-`frequency`.
- Schale: `BQ('peaking', 180·(1 + 0.3·x_wasser), Q 3, +6 dB)` → Tiefpass 6 kHz → `v.out`.
- **y:** Bogendruck (Stabzahl, Teilton, Kratzen) und Schlägel-Härte. **vel:** Schlägelpegel, Bogen-Anstiegszeit (hart = schneller).
- **Burst:** Schlägel; bei `gate ≥ 0.3 s` ein kurzer Bogenstrich (Anstieg 0.1 s, Ende am Gate) → lange Puls-Schritte streichen, kurze klirren.
- **Gestik:** Neigung → Schwappen (Formen-Ziel) + Höhe; Bebung → Detune-Bus; Schütteln → Platschen (Rauschstoß + Wasserstoß).
- **Stufe 3:** fünf Stäbe + zwei Teiltöne, L/R verteilt, zweite Schalenresonanz.

**Params (6):** `tum.staebe` 2–6 (d 3) · `tum.stimmung` SEL rein/schief/wild (d schief) · `tum.wasser` 0–1 (d 0.6) · `tum.bogen` Kratzen 0–1 (d 0.4) · `tum.nachklang` 0.5–8 s (d 3) · `tum.schale` 0–1 (d 0.5).

**Spiel:** Horrorfilm-Drones mit dem Handy in der Hand; Puls-Spur mit langen Schritten = gestrichene Akkordwolke; Sporenregen tippt Stäbe an.

**Kosten (A):** L1 ≈ 1.0 (4 OSC + Rauschen + 3 BQ + Gains), L3 ≈ 1.8.

**Risiken:** Pseudo-Bogen aus Sinus-Schwellern kann synthetisch wirken → Kratzband, Flattern, ±3 ct Zufall je Stab Pflicht; echtes Streichen erst mit Banded-Waveguide-Worklet (inventor `hrz`) – Tümpel kann später dessen Prozessor nutzen. Neues Formen-Ziel + Tick-Hook. Kosten der L3-Variante nahe Gong.

---

## 3. Schnecke `snk` – die Feder als Saite

**Pitch:** „Federhall als Instrument – jeder Anschlag zerfließt in zirpende Echos, gestimmt auf den Ton“

**Klang (10 s):** Tipp: ein kurzes „tschik“, das sofort in ein steigendes Zirpen zerläuft und als metallisch atmende Saite nachklingt, die mit jedem Umlauf stärker verschmiert – das „boing“ eines Federhalls, auf die Note gestimmt. Tiefe Töne: einzelne Boings als Rhythmus; hohe: gläserne, leicht verstimmte Glockensaite. Wischen über Spalten = Kaskaden. Höhe biegt die Feder (Zirplänge).

**Novum:** Federhall-Modelle sind Effekte (Allpass-Kaskaden, Välimäki/Parker 2010, A: nicht in den Research-Quellen); Kaivo hat Feder-Resonatoren, Desktop, CPU-hungrig (V `synthesis.md` §5). Eine **gestimmte** Feder unter dem Finger mit Zirprichtung/-stärke als Höhe, Puls-fähig: nicht vorhanden (A). Name: die Schnecke (Cochlea) ist die dispersive Spirale des Ohrs – Dispersion = Mechanismus.

**DSP (W `myzel-snk`, N-Fallback):**
- Schleife: `y[n] = x[n] + g·tanh(LP(AP_M(y[n−D])))`; `AP_M` = M Allpässe 1. Ordnung `H(z) = (a + z⁻¹)/(1 + a·z⁻¹)`, `a ∈ [−0.85, 0.85]`; Gruppenlaufzeit `τ(ω) = (1−a²)/(1 + 2a·cos ω + a²)` Samples: `a > 0` verzögert Höhen → steigendes Zirpen, `a < 0` fallend (A: Standard-Allpass-Rechnung).
- Stimmung: `D = SR/f' − M·τ(2πf'/SR)`, `f' = f·2^(detune/1200)`, lerp-Delay; `D ≥ 2` erzwingen, indem `a` zu hohen Tönen hin schrumpft → hohe Töne werden saitiger (physikalisch plausibel, A).
- Nachklang: `g = 10^(−3·D/(SR·T60))`, `T60 = nachklang·decayMul·(330/f)^0.3`; jeder Umlauf durch die Kaskade verlängert die Zirpe (Federverhalten).
- Anregung: Rauschstoß `2 + 6·vel` ms + DC-freier Klick, Pegel vel. Körper (optional, N): 2 Biquads (Tank 120 Hz, 2.4 kHz) nach dem Worklet.
- **y:** `|a|` 0.15…0.85 (Saite → Feder), Vorzeichen aus `drall`. **vel:** Stoßlänge/Pegel.
- **Burst:** wie Schlag; `gate` ignoriert, `decayMul` auf T60; Spur-Helligkeit = Dispersion.
- **Gestik:** Bebung über AudioParam `detune` (k-rate, `v.mod`) → D je Block neu; Neigung → Höhe = Feder biegen (Zirpe wandert hörbar); Schütteln → „Tank-Tritt“ (Rauschstoß in alle lebenden Federn, optional).
- **Stufe 3:** zwei Federn L/R (`a` ±5 %, M = 16 statt 8, ±3 ct `A.uni`).
- **N-Fallback:** DelayNode-Schleife (≥128 Samples, V `webaudio.md` §7 → sample-genau nur f ≤ 375 Hz @48 k; darüber Schleife = k Perioden mit Bandpass auf f, Subvielfache als leiser Unterton, A) + 8 `BQ('allpass')`.

**Params (6):** `snk.nachklang` 0.3–8 s (d 2.5) · `snk.drall` −1…1 (d +0.6) · `snk.zacken` SEL 4/8/16 (d 8) · `snk.daempf` 1–12 kHz (d 5) · `snk.anschlag` 1–20 ms (d 4) · `snk.koerper` 0–1 (d 0.3).

**Spiel:** Dub-Basslinien mit „boing“, Wirbel = Federbett; mit Echo-Kanal des Mixers (`dly`) Spring-Dub ohne Hardware.

**Kosten:** W L1 ≈ 0.35 (M=8 ≈ 40 Flops/Sample; Referenz Waveguide 0.24, V `webaudio.md` §4) + Körper 0.12; L3 ≈ 0.8; N-Fallback ≈ 0.55.

**Risiken:** Worklet = Thread-Wechsel (V `webaudio.md` §2) → gemeinsames Modul bei `initAudio` laden, nie beim ersten Ton. Stimmung bei starker Dispersion nur am Grundton exakt (Teiltöne inharmonisch – gewollt). `g ≤ 0.995`, DC-Blocker, Denormal-Flush je Block (V `webaudio.md` §3).

---

## 4. Wurm `wrm` – der Rungler in der Tonart

**Pitch:** „Ein Schieberegister frisst seinen eigenen Schwanz – gestufte Havarie, die in der Tonleiter bleibt“

**Klang (10 s):** Ein roher, leicht nasaler Ton (Dreieck durch ein resonantes Tiefpassfilter), der durch seine eigenen Noten stottert: unten im Feld ein stabiler Ton mit kaum hörbarem Flackern; nach oben hin schaltet ein 8-Bit-Register Tonhöhe (in Skalenstufen) und Filter in Sprüngen um – eine selbst-sequenzierende, blubbernde Figur, die nie zufällig und nie identisch ist: Muster entstehen, halten einen Takt, entgleisen, kommen wieder. Zwischen Puls-Schlägen kriecht der Wurm weiter.

**Novum:** Benjolin/Rungler (Hordijk: 8-Bit-Schieberegister, von Osz. A getaktet, Osz. B als Daten, 3-Bit-DAC zurück auf beide Frequenzen, V `synthesis.md` §2.6) ist ein Eurorack-Klassiker, als Touch-Instrument nicht vorhanden (V `synthesis.md` §2.6 „Apps: kaum“). Neu: **Rasterung auf die Tonleiter** (Meld-Lehre „unusual input comes out as music“, V `musicians.md` §2.9), Havarie-Tiefe als Höhe, Register persistiert je Bus über Puls-Schläge. Abgrenzung: Schwarm = glattes FM-Chaos; composer `brd` = Duffing; Wurm = gestuft, sequenzerartig.

**DSP (N + JS, Stufe 3 W):**
- Audio: `OSC('triangle', f)` → `BQ('lowpass', fc, biss)` → WaveShaper tanh (weich) → `v.out`; `v.mod(osc.detune)`.
- Rungler in `tick()`: Takt B mit Rate `takt` (0.25–40 Hz; bei `SEQ.on` auf Puls-Teiler gerastert); Flanken `t_k = t_0 + k/f_B` vorausberechnet. Je Flanke Datenbit = Komparator der beiden Dreiecke an `t_k`: `bit = tri(θ_A) > tri(θ_B)` mit JS-geführten Phasen (deterministisch, Audio muss nicht gelesen werden). Register `R = (R << 1 | bit) & 0xFF`; DAC `r = (R & 7)/7`; Zufalls-Bitflip mit 2 % je Schritt (Schaltungsrauschen, verhindert Fixpunkte).
- Rückkopplung: Tonhöhe `deg = round((r − 0.5)·2·spanne·y)` Skalenstufen → `osc.frequency.setValueAtTime(f_deg, t_k)` (oder `linearRamp` über `gleiten`); Filter `fc = f·2^(1 + 3·r·y)`; Takt `f_B' = f_B·2^(kopplung·y·(r − 0.5))` – das Warpen des eigenen Takts ist die Chaosquelle.
- Register je **Bus** (`A.wrmReg[bus]`): Puls-Schläge derselben Spur setzen das Muster fort.
- **y:** Havarie-Tiefe (Spanne, Filtersprung, Takt-Rückkopplung) – 0 = reiner Ton, 1 = volle Benjolin. **vel:** Pegel + Startposition im Register (harter Anschlag kippt mehr Bits).
- **Burst:** ein „Zug“: Register rückt `n = max(1, floor(gate·f_B))` Schritte im Gate → ein Schlag spielt 1–4 Stufen (Sequenzer im Sequenzer), `burstEnv` als Rahmen.
- **Gestik:** Neigung → Höhe; Bebung → Detune-Bus; Schütteln → Register spiegeln.
- **Stufe 3 (W `myzel-wrm`):** Audio-Rate-Rungler (zwei Dreiecke, Register, DAC, SVF in JS, ≈0.3) für den Knister-Bereich `f_B > 50 Hz`; zweiter Wurm rechts mit 7-Bit-Register (Polyrhythmus).

**Params (6):** `wrm.takt` 0.25–40 Hz (d 6) · `wrm.spanne` ±1…±7 Stufen (d 4) · `wrm.biss` Q 1–12 (d 5) · `wrm.kopplung` 0–1 (d 0.5) · `wrm.gleiten` 0–200 ms (d 20) · `wrm.rel` 0.05–4 s (d 0.4).

**Spiel:** Ein Finger = Bassline-Generator in der Tonart; zwei Finger = zwei Würmer, die sich (über den Puls-Teiler) rhythmisch verzahnen. Puls-Spur: jeder Schlag ein neues Fragment derselben Figur.

**Kosten (A):** L1 ≈ 0.4 (OSC, BQ, Shaper, Gain + JS-Tick), L3 ≈ 0.6 + Filter.

**Risiken:** Entscheidungen alle 25 ms, Ereignisse aber vorausgeplant (kein Jitter; A); Fixpunkte (alle Bits gleich) → Bitflip-Rauschen; der „Takt in Hz“ ohne Puls braucht ein Raster, damit zwei Finger zusammenspielen.

---

## 5. Zwiesel `zwi` – die Zweiklang-Glocke

**Pitch:** „Bronzeglocke mit zwei Tönen – unten der Grundton, oben die Terz, beides aus einem Schlag“

**Klang (10 s):** Ein Schlag unten im Feld: tiefe Bronzeglocke mit langsam schwebenden Dubletten. Derselbe Schlag oben: dieselbe Glocke, eine Terz höher, dieselben oberen Teiltöne. In der Mitte: beide Töne zugleich – ein Zweiklang aus einem Objekt, dessen gemeinsame Obertöne ineinander schweben. Nach 5 s bleiben die Dubletten als langsames Pulsieren.

**Novum:** Bianzhong (Zeng-Hou-Yi, ~433 v. Chr.): mandelförmiger Querschnitt, A-Ton (sui) und B-Ton (gu) große/kleine Terz auseinander, Cluster 300/400 Cent (V `synthesis.md` §3.4, Rossing). „Zweiklang-Objekte fehlen“ in allen Mainstream-Synths (V `synthesis.md` §5). Myzels Glocke ist FM, Schale harmonisch-schwebend – Zwiesel ist additive Bronze mit zwei Grundtönen.

**DSP (O bevorzugt, N möglich):**
- Moden (V Csound-Handglocke, `synthesis.md` §2.9): A-Gruppe 1, 1.0019 (Dublette), 1.794/1.801, 2.520/2.522, 2.991/2.994, 3.786/3.806. B-Gruppe: `f_B = f_A·2^(spalt/1200)` mit eigener Dublette; die Moden ab 1.79 teilen sich beide Töne (ein Körper). Gewichte: `w_A = cos²(πy/2)`, `w_B = sin²(πy/2)`, geteilte Moden `0.6 + 0.4·|2y−1|`.
- Tonleiter: `spalt = 'terz'` (Default) → `f_B` = nächste Skalennote ≥ 2 Stufen über A (`N.notes`, Muster `trp.inKey`, V 4517): die zweite Stimme ist immer in der Tonart; sonst 300/400/450 ct fest.
- O-Pfad: Worker rendert `Σ a_k·e^(−t/τ_k)·sin(2π f_k t + φ_k)` (12–14 Moden, `τ_k = T60_k/6.9`, `T60_k ∝ 1/√(f_k/f_A)`) je (`f_A`, y auf 5 Anschlagpunkte quantisiert, Stufe) in einen Puffer; LRU-Cache + Nachbarsuche ≤ 2 Oktaven per `playbackRate` (Muster `ksBuffer`, V code-map §2), Vorwärmen wie `warmKS` (V 4685). Laufzeit: BufferSource + Tiefpass (vel = Härte 2–9 kHz) + Klopf-Rauschen 8 ms. Bebung: `src.detune` (k-rate) via `v.mod`.
- N-Pfad: 6 Oszillatoren (A, A′, B, B′, 2 geteilte) wie Schale.
- **y:** Anschlagpunkt (A/B/beides). **vel:** Härte (Tiefpass, Klopfpegel).
- **Burst:** Schlag; `decayMul`; Spur-Helligkeit = Anschlagpunkt → Formen · Puls-Helligkeit lässt eine Spur Terzen aus einer Note spielen.
- **Gestik:** Neigung → Höhe = Kippen wählt die Stimme; Sporenregen-tauglich (`RG_S`).
- **Stufe 3:** zwei Glocken L/R mit gespiegelten Dubletten-Abständen (Stereo-Schwebung) + 2 Moden mehr.

**Params (6):** `zwi.spalt` SEL terz/300/400/450 (d terz) · `zwi.nachklang` 1–12 s (d 5) · `zwi.schwebung` 0–8 ct (d 2.5) · `zwi.haerte` 0–1 (d 0.5) · `zwi.teilen` 0–1 (d 0.6) · `zwi.glanz` 0–1 (d 0.4).

**Spiel:** Wirbel (Roll) beim Hoch-/Runterziehen schlägt abwechselnd beide Töne → Terz-Tremolo aus einem Finger; Gamelan-/Carillon-Linien in Terzen mit einer Hand.

**Kosten:** O 0.35 / 0.7 (wie Saite, V code-map §4); N 1.3 / 2.4.

**Risiken:** O-Cache × 5 Anschlagpunkte × Skalentöne (Vorwärmen, erste Note synchron wie Saite); `playbackRate`-Transposition verändert den Nachklang (±1 Oktave akzeptabel, A); die Abgrenzung zu Glocke/Schale muss im Klang (Bronze-Dubletten, Zweiklang) hörbar sein.

---

## 6. Kreisel `krs` – Brummkreisel: Sirene mit Schwung

**Pitch:** „Ein Brummkreisel, den man pumpt – der Ton muss erst Fahrt aufnehmen und läuft nach, wenn man loslässt“

**Klang (10 s):** Hohles, hupendes Sirenen-Tuten (Lochscheibe) mit Luftzischen. Finger drückt: der Rotor nimmt über 0.3–3 s Fahrt auf, die Tonhöhe steigt bis zur Note, der Ton wird fest und brassig, wackelt leicht (Präzession). Loslassen: der Kreisel läuft nach, die Tonhöhe sackt über Sekunden ab, dünner werdend. Am Puls: jeder Schlag ein Pumpstoß – dichte Schläge treiben ihn bis zum Schreien hoch, spärliche lassen ihn tief hupen. **Die Dichte des Puls bestimmt die Tonhöhe.**

**Novum:** Sirenen mit Trägheit gibt es als Effekt (A), nicht als spielbare Quelle, bei der die Note *erarbeitet* wird; Tiefe (808-Sturz) fällt, Kreisel steigt. „Edge-like interaction“ (V `musicians.md` §4.1): die Note erreicht man nur mit Energie. Zustand lebt zwischen Schlägen (P8).

**DSP (N + JS):**
- Rotor je Finger (`v.rotor`) bzw. je Spur-Bus geteilt (`A.krsRotor[bus]`): `dω/dt = (pump·drehmoment − reib·ω − reib2·ω²)/traegheit`, Ziel `ω* = f` (die Note = volle Fahrt: Übersetzung). Integration in `tick()`, Ausgabe je Tick `setTargetAtTime(ω·k, t, 0.03)` auf alle Frequenzen.
- Stimme: `OSC(wave 'sirene', ω)` (PeriodicWave, 10 Harmonische ∝ 1/n, geteilt in `A.waves`) + `OSC('sirene', 1.5ω)` (zweite Lochreihe, Pegel `y²`) + Stufe 3 `2ω`; Luft: `noiseSrc → BQ('bandpass', 8ω, Q 2) → Gain(luft·(1 − 0.6y))`; Präzession: `OSC('sine', 0.5–3 Hz) → Gain(wackeln·(1 − ω/ω*)) → detune` aller Oszillatoren (wackelt mehr, wenn langsam). Alle `v.mod(detune)`.
- Schnappen: Zusatzterm `+ schnapp·(ω* − ω)` sobald `|ω − ω*| < 30 ct` → die Note rastet ein (P11).
- Pumpe: gehalten `pump = 0.3 + 0.7·y`; Stoß `Δω = kick·vel·(0.3 + 0.7·y)`.
- **y:** Luftdruck – unten hauchig, hohl, leise (fast nur Zischen), oben hart, laut, brassig mit zweiter Lochreihe; außerdem Drehmoment (schnelleres Hochlaufen). **vel:** Stoßstärke.
- **Burst:** Pumpstoß + „Chuff“ (Rauschstoß 20 ms); die Stimme summt mit dem geteilten Rotor bis `nachlauf` s oder bis `ω < 0.1·ω*` (`finish`), `burstEnv` nur als Deckel → eine Spur erzeugt ein durchgehendes, atmendes Hupen aus ihrem Muster.
- **Gestik:** Neigung → Höhe; **Drehen** (`GK_AX.drehen`, V 8768) → Pumpe (Handy drehen = Kreisel andrehen, Formen-Ziel `krs`); Bebung → Detune-Bus.
- **Stufe 3:** drei Lochreihen (1 : 1.5 : 2), zwei Kreisel L/R mit 5 % verschiedener Trägheit (sie laufen auseinander → schwebender Sirenenchor).

**Params (6):** `krs.traegheit` 0.2–4 s (d 1) · `krs.reibung` Nachlauf 0.5–8 s (d 2) · `krs.loecher` 1–3 (d 2) · `krs.luft` 0–1 (d 0.4) · `krs.wackeln` 0–1 (d 0.3) · `krs.nachlauf` 0–6 s (d 2.5).

**Spiel:** Sirenen-Drones (Sunn-O)))-Gefühl), Puls-Spur als „Atem“: 16tel-Bursts lassen ihn steigen, Pausen sinken. Melodien sind „verdient“ – mit `schnapp` trotzdem sauber.

**Kosten (A):** L1 ≈ 0.5 (2 OSC + Rauschen + BQ + LFO + Gains), L3 ≈ 1.0. Lange lebende Spur-Stimmen zählen im Budget.

**Risiken:** Nachlauf kann nerven → `reibung` moderat, Nachlauf-Stimme stirbt bei `ω < 0.1·ω*`; geteilter Rotor je Spur braucht Lebensdauer-Logik (eine Stimme je Spur, Schläge füttern sie); Tonhöhe nie „sofort“ – für Tastatur-Spieler ggf. `traegheit` klein.

---

## 7. Unterholz `uhz` – Mixtur-Trautonium

**Pitch:** „Untertöne statt Obertöne – ein Finger spielt einen Moll-Akkord nach unten, durch Formantfilter, auf einem Band“

**Klang (10 s):** Ein raspelnder Sägezahn, unter dem phasenstarr geteilte Untertöne (f/2, f/3, f/4, f/5) liegen – ein dunkler, holziger Orgelakkord, der mit der Fingerhöhe nach unten „aufgeht“: unten reiner Ton, nach oben kommt ein Unterton nach dem anderen, oben der volle Mixtur-Akkord mit hochgeschobenen Formanten. Gleiten über Spalten = das Trautonium-Portamento; Bebung = Salas Bandvibrato. Am Puls: Salas „Schlagwerk“ – gezupfte, holzige Stöße.

**Novum:** Trautonium (Trautwein 1930, Mixtur-Trautonium Sala; Hitchcocks „Die Vögel“, A: Standardwissen). Myzel hat Obertöne und Tiefe, aber keine **Untertonreihe**; Emulationen sind selten (A), keine auf einem Tonraster mit Höhe = Mixtur. Abgrenzung zu Nebel: keine verstimmten Flächen, sondern exakt geteilte Untertöne mit festen Formanten.

**DSP (N):**
- Master `OSC('sawtooth', f)`; Untertöne `OSC('square', f/n)` für n aus der Mixtur, Pegel `g_n(y) = smoothstep((y − y_n)/0.2)·0.7/√n` mit `y_n` gestaffelt (n=2: 0.15, 3: 0.35, 4: 0.55, 5: 0.75). Frequenzverhältnisse exakt → relative Phase bleibt stehen (A: gleiche Clock, kein Drift). Alle `v.mod(detune)`; `setF` gleitet alle gemeinsam.
- Mixturen (SEL): `moll` [1, ½, ⅓, ¼, ⅕] (f/4·f/5·f/6 = Molldreiklang unter dem Ton), `oktaven` [1, ½, ¼, ⅛], `weit` [1, ⅓, ⅕, ⅐] (ungerade: hohl), `sala` [1, ½, ⅓, ⅕, ⅙] (Salas Mixtur-Register, A).
- Formantfilter: zwei `BQ('bandpass')` parallel (F1 `formant1`, F2 `formant2`, Q `resonanz`), `F·2^(0.5·y)`, plus 15 % trockener Weg → `v.out`.
- **y:** Mixtur öffnet, Formanten steigen. **vel:** Pegel; im Stoß Schärfe des Schlagwerks.
- **Burst:** „Schlagwerk“: `burstEnv(att 3 ms, gate·0.5, rel·decayMul)` + Filterhüllkurve (Q kurz hoch, Frequenz 1 Oktave runter) → Pizzicato-Bong.
- **Gestik:** Bebung → Detune-Bus (das Trautonium-Vibrato); Neigung → Höhe (Mixtur auf/zu).
- **Stufe 3:** zweiter Master +4 ct (`A.uni`) L/R, Untertöne mittig, sechs Stimmen, dritter Formant.

**Params (6):** `uhz.mixtur` SEL moll/oktaven/weit/sala (d moll) · `uhz.formant1` 200–1200 Hz (d 450) · `uhz.formant2` 1–4 kHz (d 1800) · `uhz.resonanz` Q 1–12 (d 4) · `uhz.att` 0.003–1 s (d 0.02) · `uhz.rel` 0.05–4 s (d 0.3).

**Spiel:** Monophone Linien mit Akkordgewicht; Gleiten (`v.glide`) hoch für den Bandcharakter; zwei Finger = zwei Mixturen = Cluster.

**Kosten (A):** L1 ≈ 0.9 (5 OSC + 2 BQ + 7 Gain), L3 ≈ 1.6.

**Risiken:** „Oszillator + Filter“-Verdacht (P7a) → Identität liegt in Mixtur-unter-dem-Finger und Schlagwerk; Rechteck-Untertöne matschen → tiefe Untertöne (n ≥ 4) als Dreieck; Untertöne liegen oft außerhalb der Tonleiter (gewollt, Reinheit der Reihe).

---

## 8. Kiefer `kie` – Maultrommel, der Mund ist die Höhe

**Pitch:** „Gezupfte Stahlzunge, der Mund wählt den Oberton – die Fingerhöhe formt das Wah über dem Bordun“

**Klang (10 s):** Twang: eine gezupfte, schnarrende Metallzunge (hell, obertonreich, kurzer unharmonischer Klirrton), die durch eine Mundhöhle klingt; die Höhe fährt die Resonanz die Obertonreihe entlang – „boing-ow-wa“, eine Obertonmelodie über dem festen Grundton. Hält man den Finger, klingt die Zunge 1–3 s aus, die Helligkeit schließt sich; Loslassen dämpft wie geschlossene Lippen. Ein Wisch über Spalten zupft neu.

**Novum:** Maultrommel/Khomus: ein Grundton, Melodie nur aus Obertönen über den Mundraum (A: Standardwissen); **chromatisch** auf einem Tonraster mit Mund = Höhe und Neigung gibt es nicht (A; Sample-Libraries existieren, A). Abgrenzung zu Obertöne: gezupft, schnarrend, abklingend („Obertöne geschlagen“); zu Kalimba: Formantmelodie statt Zungenklang. Name: Kiefer = Kinnlade und Baum.

**DSP (N, `sustain:true`):**
- Zunge: `OSC('sawtooth', f)` (bei `zunge` > 0.5 `A.waves.tine`-ähnliche pulsige Welle) → `BQ('lowpass')`, der mit dem Abklingen schließt (`frequency.setTargetAtTime(f·3, t+0.01, nachklang/3)` von `f·(8 + 20·vel)`), + Klirrteilton `OSC('sine', 6.27f)` 60 ms (Kragbalken, A) + Zupf-Klick (Rauschen 5 ms). `v.mod` auf beide `detune`.
- Mund: parallel `BQ('bandpass', h·f, Q mund)` mit `h = round(2 + obertoene·y)` (Obertonreihe, rein gestimmt) – der Sprung zwischen Obertönen wird mit `setP(frequency, …, 0.035)` geglättet (das „Wah“) – und Kehle `BQ('bandpass', 500, Q 1.5)`·`kehle` → `v.out`.
- Hüllkurve auf `v.out.gain`: Zupf `setValueAtTime(peak·vel)`, `setTargetAtTime(0, t, nachklang/6.9)`; `release` = Dämpfen (`setTargetAtTime(0, now, 0.03)`), kein Sustain – gehalten heißt: ausklingen lassen und den Mund bewegen.
- **y:** Oberton `h` (2…2+Spanne). **vel:** Pegel, Anfangshelligkeit, Klick.
- **Burst:** Zupf mit `decayMul`; Spur-Helligkeit = Oberton → Khomus-Riffs über einem Bordun aus einer Spur.
- **Gestik:** Neigung → Höhe = der Mund bewegt sich mit dem Handy (sehr direkt); Bebung → Detune (Zunge) + leichte Formant-Wobbel.
- **Stufe 3:** zwei Zungen L/R (Oktave oder +5 ct), zweiter Mundformant (Nasal).

**Params (6):** `kie.zunge` Schnarren 0–1 (d 0.5) · `kie.nachklang` 0.3–5 s (d 1.6) · `kie.mund` Q 4–20 (d 10) · `kie.kehle` 0–1 (d 0.3) · `kie.biss` Klick 0–1 (d 0.5) · `kie.obertoene` Spanne 4–14 (d 10).

**Spiel:** Psychedelische Obertonriffs mit einem Finger (unten/oben wischen = Melodie), Bordun aus dem Mixer (`bor`) als Grundton, Puls zupft.

**Kosten (A):** L1 ≈ 0.45 (2 OSC + 3 BQ + Rauschen + Gains), L3 ≈ 0.9.

**Risiken:** Sägezahn-durch-Bandpass klingt schnell nach „Wah-Synth“ → Klirrteilton, schließender Tiefpass, Klick und Schnarr-Shaper sind Pflicht; Nähe zu Obertöne im Obertonmapping (dort gehalten, hier gezupft – im Bibliotheks-Text klar trennen).

---

## 9. Kapsel `kps` – Samenkapsel: Regenmacher durch ein gestimmtes Rohr

**Pitch:** „Samen rieseln durch ein Rohr – Kippen schüttet, dichtes Rieseln bringt das Rohr zum Singen“

**Klang (10 s):** Trockenes Rieseln vieler kleiner Körner (Regenmacher, Cabasa) durch ein Rohr, das auf die Note gestimmt ist: unten im Feld tickern einzelne Samen und das Rohr antwortet mit einer leisen Tonspur; nach oben wird das Rieseln zum Schütten, und ab einer Dichte singt das Rohr – ein gepitchtes Rauschen mit Holzkörper. Die Samen klumpen (Lawinen) und laufen 1–2 s nach, wenn man das Handy wieder gerade hält.

**Novum:** Elements’ „particles“-Exciter → Resonator (V `synthesis.md` §2.9) ist der nächste Verwandte; **Neigung als Schüttwinkel** mit Lawinenstatistik und Nachlauf ist neu (A). Abgrenzung: Hauch = stationäres gefiltertes Rauschen, Körner = Samples, Tropfen = Blasen; Kapsel = diskrete Ereignisse mit Physik.

**DSP (N):**
- Samen: ein `noiseSrc` → Gain `s` (Klick-Fenster per Automation) → Split: `BQ('highpass', 1500)` (helle Samen) und direkt (dunkle) → Rohr. In `tick()` je Stimme Ereignisse im Horizont als Poisson-Prozess mit Rate `λ(t) = dichte·r(t)·(1 + lawine·L(t))`, je Ereignis `s.setValueAtTime(a, t_e)`, `s.setTargetAtTime(0, t_e, 0.0005 + 0.0025·koerner)`, Pegel `a` zufällig 0.3–1 (Muster `trp.tick`, V 4567). `r(t)` folgt `y` mit Verzögerung 0.4 s (Samen setzen sich in Bewegung), `L(t)` = Klumpen: mit Wahrscheinlichkeit 0.1/Tick 50–150 ms ×3.
- Rohr: `BQ('bandpass', f, Q rohr)` + `BQ('bandpass', 3f, Q rohr/2)` (geschlossenes Rohr: ungerade Harmonische) + `BQ('lowpass', holz)` → `v.out`; Bebung über `v.mod(bp.detune)`; `setF` per `glideTo`. Bei `f ≤ 375 Hz` optional DelayNode-Kamm als echtes Rohr (V `webaudio.md` §7).
- Kante: das Rohr singt erst, wenn `λ` hoch ist (die Klick-Energie reicht zum Klingen) – P1.
- **y:** Schüttwinkel = Rate (0.5…60/s). **vel:** Samenpegel und Startrate (hart = sofort Schütten).
- **Burst:** ein Schütteln: 60–150 ms Dichte 1 mit Abfall → gepitchter Shaker/Cabasa-Schlag; `burstEnv` als Rahmen. **Rassel-Kandidat** (`ladRassel`, V 10233; Liste 10527 + Validierung 8816).
- **Gestik:** Neigung → Höhe = Schütten (ohne neues Ziel); Bebung → Rohr-Detune; Schütteln → Stoß.
- **Stufe 3:** zwei Rohre L/R ±6 ct, dritte Resonanz (5f), Rate ×1.75 (wie `korDens`).

**Params (6):** `kps.dichte` max. Rate 5–80/s (d 40) · `kps.koerner` Samengröße 0–1 (d 0.4) · `kps.rohr` Q 10–80 (d 35) · `kps.holz` Tiefpass 1–10 kHz (d 4) · `kps.lawine` 0–1 (d 0.5) · `kps.rel` Nachlauf 0.2–3 s (d 1).

**Spiel:** Perkussive Drone-Schicht, die man mit dem Handgelenk „gießt“; Puls-Spur = gepitchter Shaker in der Tonart.

**Kosten (A):** L1 ≈ 0.35 (Rauschen + 4 BQ + 2 Gain + ≤120 Automationsereignisse/s), L3 ≈ 0.7.

**Risiken:** Automationsereignisse (≈120/s je Stimme × 10 Stimmen) → messen; gegatetes Rauschen kann nach „Gate“ klingen statt nach Samen → zwei Tönungen, zufällige Längen, Lawinen; Abgrenzung zu Hauch muss in der Statistik hörbar bleiben.

---

## 10. Jahresring `jhr` – die Bandschleife, die sich erinnert

**Pitch:** „Was du spielst, legt sich als Ring um die Schleife – jede Runde dunkler, wärmer, leiser, im Takt des Puls“

**Klang (10 s):** Ein schlichter, elektrischer Orgelton (die Lyra-„tone generators“, V `musicians.md` §2.1) wird auf ein Band geschrieben; der direkte Ton ist leise, die Schleife ist das Instrument: nach einem Takt kommt der Ton zurück, mit Bandsättigung, Höhenverlust, Rauschen und Wow; dann wieder, dunkler; neue Töne legen sich als neue Ringe darüber – nach 20 s ein atmender Akkord aus Generationen, der über eine Minute verlischt. Kippen ändert die Bandgeschwindigkeit: alles rutscht (Doppler), ältere Ringe kommen verschoben zurück.

**Novum:** Frippertronics/Tonbandschleifen gibt es als Effekt-Apps (A); hier ist die Schleife **Teil der Klangquelle**: je Bus geteilt, Länge am Puls-Takt, Generationsverlust je Ring, Neigung = Varispeed, Schütteln = Löschkopf. Grenzfall zum Effekt – siehe §11 (Vertiefen: Körner-„echo“).

**DSP (N, geteilt je Bus):**
- Schleife `A.jhr[bus]` (lazy, höchstens 3): `DelayNode(16 s)`, `delayTime = laenge` (Takte × `60/SEQ.bpm` × Schläge, oder Sekunden ohne Puls) → `BQ('lowpass', verlust)` → WaveShaper tanh (Band) → `Gain(verblassen)` → zurück in den Delay; Rauschen `noiseSrc → Gain(0.002·verblassen)` in die Schleife; Wow: `OSC('sine', 0.3) → Gain(wow·0.001)` auf `delayTime`; Varispeed: Formen-Ziel `jhr` (Neigung) → `delayTime`-Rampe ±8 % (Doppler-Tonhöhe, V Spec-Verhalten A). Ausgang → `stripIn(bus)`.
- Stimme: `OSC(A.waves.organ, f)` → `Gain(direkt)` → `v.out` (direkt, gepannt) **und** `v.out → Gain(1) → Schleifen-Eingang` (mono; Node per `v.n` registriert, `cleanup` trennt). `v.mod(osc.detune)`. Hüllkurve `adsrStart/sustainRelease`.
- **y:** Bandpegel: unten sauber und leise, oben übersteuert und komprimiert (Vorverstärkung in den tanh, 0.3…2.5) – die Sättigung ist das Timbre und prägt alle folgenden Ringe. **vel:** Pegel.
- **Burst:** Puls-Schläge schreiben kurze Blips → die Schleife wird rhythmisch (Länge = Takt ⇒ exakte Wiederholung mit Verfall), `burstEnv`.
- **Gestik:** Neigung → Varispeed (Formen-Ziel); Schütteln → Löschen (Rückkopplung 1 s auf 0); Bebung → Detune-Bus.
- **Stufe 3:** Stereo-Schleife mit zwei leicht verschiedenen Längen L/R (Pingpong-Phasen), 2× Oversampling am Band.

**Params (6):** `jhr.laenge` SEL 1/2/4 Takte oder 1–12 s (d 2 Takte) · `jhr.verblassen` 0.3–0.97 (d 0.82) · `jhr.verlust` Tiefpass je Runde 2–12 kHz (d 6) · `jhr.band` Sättigung 0–1 (d 0.5) · `jhr.direkt` 0–1 (d 0.25) · `jhr.wow` 0–1 (d 0.3).

**Spiel:** Eno/Fripp-Setup ohne zwei Revox: Ton legen, warten, nächsten legen; Puls baut Loops aus Stößen; kippen = Bandbremse.

**Kosten (A):** je Stimme ≈ 0.15, Schleife einmal ≈ 0.35 (nicht je Stimme – Budget-Buchung klären, `Q.cost` ist je Stimme).

**Risiken:** Grenzfall Effekt vs. Quelle; Überschneidung mit Mixer-Echo (`dly`) und Körner-`echo` (V code-map §2 `LIVE_SRC`); Speicher 16 s Stereo ≈ 6 MB je Schleife; Tempowechsel erzeugt Doppler (charakteristisch, aber ungefragt); Ausgang hängt an einem Bus, nicht an der Stimme (Ebene 2 vs. Spielfläche getrennte Schleifen).

---

## 11. Vertiefen statt neu – wo eine bestehende Engine den Performer-Wunsch besser trägt

| Bestehende Engine | Vertiefung | Warum ggf. besser als eine neue |
|---|---|---|
| **Körner** (`echo`-Quelle) | Generationsverlust, Taktlänge, Varispeed, Löschkopf → der Kern von Jahresring | Spart eine Engine; Jahresring bleibt dann die „Performer-Form“ (Orgelton + Band) – wenn nur eines gebaut wird: Körner vertiefen. |
| **Stimme** | Kelly-Lochbaum-Trakt (V `synthesis.md` §2.13, Pink-Trombone-Worklet existiert, V `webaudio.md` §6) | Zungenkontinuum statt 5 Vokale; aber 2–4 Einheiten (V/A) – teurer als jede Quelle hier. Kein Performer-Pflichtstück. |
| **Saite** | Jawari/Dispersion/Spannungsmodulation offline in `genKS` (V `synthesis.md` §2.15–2.16) | 0.35 Laufzeit; inventor `drn`/`gsp` decken es ab. |
| **Schale** | Hang-Tonfeld (1:2:3 + Helmholtz, V `synthesis.md` §3.3) | Solide, aber kein Novum; als Preset/Param „Hang“ in Schale statt eigener Engine. |
| **Membran** | Talking Drum: Höhe = Fellspannung *während* des Klingens (braucht `sustain:true`-Variante) | Sehr ausdrucksstark; kleine Änderung. |
| **Nebel** | „Glühwurm-Modus“ (LPG-Blinken) als Nebel-Param? | Nein – die Synchronisation braucht geteilten Zustand und eigene Hüllkurven; eigene Engine ist sauberer. |

---

## 12. Übersicht

| # | Key | Name | Art | Höhe = | Puls-Stoß = | Geteilter Zustand | Pfad | Kosten L1 / L3 (A) |
|---|---|---|---|---|---|---|---|---|
| 1 | `glw` | Glühwurm | gehalten | Rate, Falte, Nachglühen | ein Blitz, stößt alle Phasen | Phasenfeld + Puls-Phase | N + Tick | 0.35 / 0.8 |
| 2 | `tum` | Tümpel | gehalten (Tipp = Schlägel) | Bogendruck | Schlägel, langer Schritt streicht | Wasser (Neigung) | N + Tick + Formen-Ziel | 1.0 / 1.8 |
| 3 | `snk` | Schnecke | geschlagen | Dispersion (Saite→Feder) | Schlag | – | W (N-Fallback) | 0.35+0.12 / 0.8 |
| 4 | `wrm` | Wurm | gehalten | Havarie-Tiefe | ein Register-Zug (1–4 Stufen) | Register je Bus | N + Tick (L3 W) | 0.4 / 0.6 |
| 5 | `zwi` | Zwiesel | geschlagen | Anschlagpunkt A/B | Schlag | – | O (N möglich) | 0.35 / 0.7 |
| 6 | `krs` | Kreisel | gehalten | Luftdruck | Pumpstoß, Hum bis Nachlauf | Rotor je Spur | N + Tick (+ Drehen) | 0.5 / 1.0 |
| 7 | `uhz` | Unterholz | gehalten | Mixtur öffnet, Formanten | Schlagwerk-Pizzicato | – | N | 0.9 / 1.6 |
| 8 | `kie` | Kiefer | gehalten (zupft, klingt aus) | Oberton des Mundes | Zupf | – | N | 0.45 / 0.9 |
| 9 | `kps` | Kapsel | gehalten | Schüttwinkel | Schütteln (Shaker) | – | N + Tick | 0.35 / 0.7 |
| 10 | `jhr` | Jahresring | gehalten | Bandpegel/Sättigung | Blip auf die Schleife | Band je Bus | N (geteilt) | 0.15 + 0.35 / 0.5 |

Verteilung: 8 gehalten, 2 geschlagen (Sporenregen/`RG_S`: `snk`, `zwi`; Rassel-Kandidat: `kps`). Bibliotheks-Familien (Vorschlag für die UI-Arbeit, A): *Lebewesen* (glw, wrm, kps), *Wasser & Metall* (tum, snk, zwi), *Atem & Schwung* (krs, uhz, kie), *Band* (jhr).

Novum-Checkliste (`musicians.md` §7.9: koppelt / Kante / lebt weiter / Mechanismus wechselt mit y·vel / unkaputtbar / ≤1.5): glw 6/6, tum 5/6, snk 4/6, wrm 6/6, zwi 4/6, krs 6/6, uhz 4/6, kie 4/6, kps 5/6, jhr 5/6 (A).

---

## 13. Gemeinsame Integrationspunkte (über die Checkliste in `code-map.md` §11 hinaus)

1. **Engine-Tick:** `tick()` (V 6040) ruft zusätzlich `for (const k of ['glw','tum','wrm','krs','kps']) ENGINES[k].tick?.(horizon)` – alle planen Ereignisse im Horizont voraus (Muster `grainTick`), nie „jetzt“.
2. **Formen-Ziele:** `tum` (Wasser, aus Neigungs*änderung*), `krs` (Pumpe aus `drehen`), `jhr` (Varispeed) in `MODT`/`MOD_EQ`/`FAE_PAR`/`LAD_AMT`; `ladFull` ergänzen, wo Verdichtung sinnvoll ist (`kps` wie Körner: Ladung = dichter).
3. **Gestik-Events:** `schuetteln` → `glw` (Phasen würfeln), `tum` (Platschen), `snk` (Tank-Tritt), `wrm` (Register spiegeln), `jhr` (Löschen); Hook an 8604/11770.
4. **Listen:** `RG_S` += `snk`, `zwi`; Rassel-Liste (10527) + Validierung (8816) += `kps`; `MACRO.*` je Engine (7050); `VCOST1/3` messen (`v2/cost.js`), nie den Fallback 1.0 lassen (V 5015).
5. **Worklet-Modul:** `snk` (und `wrm` Stufe 3) im gemeinsamen `MYZEL_DSP_SRC` neben `myzel-tap`, Laden bei `initAudio`, Vertrag `webaudio.md` §10; ohne `audioWorklet` → `snk` N-Fallback, `wrm` bleibt L1.
6. **Offline-Worker:** `zwi`-Renderer als eigenständige Funktion in `DSP_FN` + Worker-Quellenliste (keine Closures, V code-map §2), Cache wie `KS_CACHE`.
7. **Geteilte Nodes im Budget:** `jhr`-Schleife und `tum`-Wasser-Quelle sind nicht je Stimme; Vorschlag: feste Zuschlagsbuchung beim ersten Nutzer (`voiceLoad()` + konstanter Anteil), damit Stufe 1 mobil (14 Einheiten, V 2083) ehrlich bleibt.

## 14. Reihenfolge (Wirkung je Aufwand, A)

1. **Glühwurm** – billig, neu, trägt Puls und Mehrfinger-Spiel; der „Myzel-Moment“ auf der Bühne.
2. **Wurm** – billig, sofort musikalisch, Bassline-Generator in der Tonart.
3. **Zwiesel** – offline 0.35, eindeutiges Novum, Sporenregen-tauglich.
4. **Tümpel** – Gestik-Aushängeschild, teurer.
5. **Kreisel** – Puls-Dichte als Tonhöhe, einzigartig.
6. **Schnecke** – erster Worklet-Prozessor; danach steht das Modul für inventor-`hrz` u. a.
7. **Kiefer**, 8. **Kapsel**, 9. **Unterholz** – solide Farben mit klarer Kante.
10. **Jahresring** – nur, wenn Körner-`echo` nicht vertieft wird.

## 15. Offen / zu messen
- Automationslast (`kps` ≤120 Ereignisse/s je Stimme, `glw` ≤16/s) auf Mid-Range-Android – Bench `v2/cost.js`.
- Worklet-Kosten `snk` M=8/16 und `wrm`-Audio-Rate auf ARM (`webaudio.md` §8-Harness).
- `zwi`-Cache-Größe (5 Anschlagpunkte × Skalentöne × Stufe) und Vorwärmzeit.
- Kuramoto-Parameter (K, K_p), bis Synchronisation in < 15 s hörbar ist, ohne „einzurasten wie ein LFO“.
- Rotor-Lebensdauer je Spur (`krs`) gegen Budget und `steal()`.
- Alle Produkt-Aussagen „nicht vorhanden“ sind A (Recherche konnte 2026 keine Seiten laden, V `musicians.md` Vorbemerkung).
