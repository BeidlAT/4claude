# Klang als Prozess – zehn neue Klangquellen für Myzel (Perspektive: spektral-algorithmische Komposition)

Stand 2026-10-13. Blick: Risset (Illusionen, Mutationen), Xenakis (Stochastik, Siebe, Glissando-Massen), Roads (Mikroklang, Pulsare), Truax (Körner als Strom), Oliveros (lange Töne, Hören auf den Raum), Lucier/Tudor (Rückkopplung als Instrument), Wishart (Wavesets).

Legende: **V** = verifiziert (Quelle in Klammern: `code-map §…` = `research/code-map.md`, `syn §…` = `research/synthesis.md`, `mus §…/P…` = `research/musicians.md`, `wa §…` = `research/webaudio.md`, `index:Zeile` = `/home/user/4claude/myzel/index.html`), **A** = angenommen/eigene Schätzung (muss gemessen oder nach Gehör gestimmt werden). Kosten in Myzel-Einheiten (1,0 = eine Nebel-Stimme Stufe 1, V code-map §2).

## 0. Leitidee und gemeinsame Regeln

Die 14 vorhandenen Engines sind *Objekte* (Oszillatoren, Filter, Teiltöne, Saiten, Felle) – V code-map §4. Die zehn hier sind *Prozesse*: jede Stimme ist ein Vorgang, der sich hörbar entfaltet, auch wenn der Finger still hält (mus P8 „keep unfolding“, V). Jeder Prozess hat eine Kippstelle, die die Fingerhöhe überschreitet (mus P1 „edge-like interaction“, V) und keinen toten Bereich (`dice()` spielt jede Engine zufällig, V code-map §9).

Gemeinsame Abbildung (gilt für alle zehn, Vertrag V code-map §3/§11):
- **x = Tonhöhe** (`setF`, Gleiten), **Höhe y = der Prozessparameter**, nie nur ein Filter. **Anschlag vel** = Energie, die der Prozess bekommt (Überschuss, der abklingt – Lyra-Prinzip, V mus §2.1).
- **Bebung/Vibrato/Pitch-Wheel**: Worklet-Engines haben einen k-rate-AudioParam `detune` (Cent), den `v.mod()` an den Bus hängt (V wa §10); native Engines hängen jede tonhöhentragende `detune` an `v.mod()`. Gestik-Neigung kommt als Höhen-Offset herein (V code-map §6) – bei Prozessen heißt das: Neigen = Richtung, Chaos, Fächer, Kopplung, Schleifengewinn.
- **Puls-Stoß** (`hit()` → `burstEnv`, gate 0,22 s oder 0,9·Schrittdauer, V code-map §5/§6): kein verkürzter Haltton, sondern ein *Ausschnitt des Prozesses* (ein Zirp, ein Riss, ein Zucken, eine Silbe, ein Blitz der Vergangenheit, ein Schlag ins Feld, ein Brecher, ein Puff, ein Fächer, ein Quietscher).
- **Stufe 3** verdoppelt den Prozess L/R mit abweichendem Seed/Parameter (±3–4 ct über `A.uni`, V index:2840) – nie ein anderer Mechanismus (mus P12).
- **Pfad**: W = Prozessor im gemeinsamen Worklet-Modul `MYZEL_DSP_SRC` (einmal nach `initAudio` laden, ein Node je Stimme, ≤ 4 AudioParams, Hüllkurve bleibt nativ auf `v.out.gain` – V wa §1/§10). N = native Nodes. Messwerte: leerer Worklet-Node 0,06, je AudioParam 0,03, 16 Resonatoren 0,61, Waveguide 0,24 (V wa §4) – alle W-Kosten unten sind daraus abgeleitet (A, Bench `research/bench/` nachmessen).

Gemeinsame Infrastruktur, die drei der Ideen brauchen (A, Entwurf):
- `myzel-ohr`: ein Prozessor, eine Instanz, Eingang `A.insertOut` (trocken, vor Delay/Hall), schreibt einen **Modul-globalen Ring** `RING` (mono, 8 s). Alle Prozessoren desselben Moduls lesen ihn ohne Kopie (ein `AudioWorkletGlobalScope` je Kontext, V wa §3). Zweite Instanz für das Mikrofon (`MIC.src`) möglich.
- `MAT`: Modul-globale Tabelle Material-Key → Float32Array (mono). Der Haupt-Thread postet das aktuelle Körner-Material (`korSource()`, V index:4744) einmal je Wechsel über den Port irgendeines Nodes.
- `SCALE`: die Tonleiter als Verhältnis-Liste (`N.notes`, V index:2013/2056) wird bei Note-on mitgeschickt (für Siebe).

Die acht Prozess-Familien des Auftrags → Engines: Pulsar-Ketten → **Grille**; endlose Glissandi → **Strudel**, **Geäst**; stochastische Wolken → **Plankton** (Körner-Ebene), **Amöbe** (Wellenform-Ebene); spektrales Einfrieren → **Bernstein**; Waveset-Mutation → **Raupe**; gezähmtes Chaos → **Brandung**; Kreuzsynthese zwischen gehaltenen Tönen → **Mykorrhiza** (Zeitbereich), **Bernstein** (Kamm = Vergangenheit × Gegenwart); Illusionen → **Strudel** (Shepard + Risset-Rhythmus), **Kreislauf** (Larsen/Lucier).

Namensprüfung (V, grep `index.html` und `ideas/*.md`, 2026-10-13): Ursprünglich „Zirpen“ und „Wurzeln“ – beide kollidieren: „Zirpen“ ist das Label von `swm.chirp` (V index:1797), „Wurzel“ ist im Mixer die Summe („Wurzel = Summe“, V index:16739/16741); „Zikade“ ist als Körner-Textur `zikaden` und Preset `zikadennacht` belegt (V index:1722/17375). Daher **Grille** `gri` und **Mykorrhiza** `myk`. Alle zehn Keys (gri stru amo rau brn myk brd pla ast kre) sind in `index.html` frei und kollidieren nicht mit biologist/inventor/performer (glw trb mdr knl fle jrg brt unk rhz frs / hrz dax hlm khl zpf gsp glt rnk drn boe / glw tum snk wrm zwi krs uhz kie kps jhr); Namen ebenfalls (performer „Kreisel“ ≠ „Kreislauf“, beide bleiben).

---

## 1. Grille `gri` – Pulsar-Synthese (Roads)

**Pitch (ENG_INFO):** „Grille aus Pulsaren – Impulsketten, deren Formant die Fingerhöhe stimmt, von Rhythmus bis Ton“

**Klang (10 s):** Ein Ton, der aus winzigen, gleichen Impulsen besteht – hohl und rund unten, nasal-pfeifend oben, als würde eine Grille den Vokal wechseln. Ein paar Impulse fehlen zufällig (Knistern). Mit Teilung 8 zerfällt der Ton in ein hörbares Flattern, das Puls und Tonhöhe zugleich ist. Ein Puls-Stoß ist ein einzelner Zirp.

**Novum:** Pulsar = Pulsaret (Dauer d) + Stille; Grundton 1/p und Formant 1/d unabhängig, plus Masking (V syn §2.2). Nächstes: Plaits „VOSIM/Pulsar“ (nur ein Fenstermodus), nuPG/Nuklear (Desktop), keine Browser-Implementierung gefunden (V syn §2.2/§5). Unterschied: Formant unter dem Finger, stochastisches und Burst-Masking als Spielparameter, Rhythmus↔Ton-Kontinuum im Puls – Myzels „Stimme“ ist ein Formantfilter (V code-map §4), hier ist der Formant exakt und masken-rhythmisch. Myzels Körner-Textur „Zikaden“ (V index:1722/2676) ist ein gesampelter Chor als Material, keine tonhöhenfeste Pulsar-Quelle.

**DSP (W, `myzel-gri`):** Params `detune`, `freq`, `hoehe` (k-rate). Zustand: Phase φ_p der Pulsar-Periode p = 1/f_p mit f_p = freq·2^(detune/1200)/Teilung. Bei jedem Periodenbeginn: Maske entscheiden (stochastisch mit Wahrscheinlichkeit `maske`; Burst-Muster m:n über Zähler) und ein Pulsaret starten: Dauer d = 1/f_f, Formant f_f = 180·2^(4,8·y) Hz (180 Hz…5 kHz, log). Sample = win(τ/d)·sin(2π·f_f·τ), τ seit Pulsaret-Start; Fenster `fenster`: Gauss (enger Formant), Hann, „Zahn“ (steiler Anstieg, exponentieller Abfall – breiter, heller). Falls d > p (f_f < f_p) überlappen zwei Pulsarets (zwei Slots, OPulWM, V syn §2.2). RMS-Ausgleich ≈ √(d/p), geklemmt. vel = Pegel + Maske-Wahrscheinlichkeit kurz gesenkt (harter Anschlag = dichter). Burst: Burst-Masking an für die Gate-Dauer = ein „Zirp“ (Grillen-Chirp). **Stufe 3:** zwei Züge L/R mit eigenem Zufall (Kanal-Masking, Roads) und ein zweiter Formant bei 1,5·f_f (−6 dB) → vokalischer.

| Param | Bereich | Default |
|---|---|---|
| `gri.fenster` SEL Gauss/Hann/Zahn | | Gauss |
| `gri.takt` SEL aus/2:1/3:1/2:2/5:3 (Burst-Maske) | | aus |
| `gri.teilung` SEL 1/2/4/8/16 (Pulsarrate = f/…) | | 1 |
| `gri.maske` | 0–0,9 | 0,15 |
| `gri.att` / `gri.rel` | s | 0,01 / 0,25 |

**Spielen:** gehalten = Formant mit dem Finger ziehen (y), Gleiten verschiebt nur die Pulsarrate – der Vokal bleibt (das ist das FOF-Versprechen, V syn §2.3). Gestik-Neigung = Vokalwechsel; Bebung = Vibrato der Rate. Puls-Spur: Takt 3:1 + Teilung 4 = Grillen-Nacht im Tempo.

**Kosten (A):** 0,3 / Stufe 3 0,55. **Risiken:** „Zahn“-Fenster aliast leicht (Teil des Charakters, sonst Formant-Obergrenze 5 kHz); bei Teilung 16 und hohen Noten fällt die Rate unter 20 Hz → Pegelausgleich muss den Klick-Charakter abfangen.

---

## 2. Strudel `stru` – endloses Glissando (Shepard–Risset) und endloses Accelerando

**Pitch:** „Endloses Glissando nach Shepard und Risset – die Fingerhöhe treibt es auf- oder abwärts“

**Klang (10 s):** Ein Orgelton aus Oktaven, der – Finger oben – unaufhörlich steigt, ohne je höher zu werden; die Oktaven tauchen unten auf und verblassen oben. Finger in der Mitte: er steht. Mit „Takt“ pulsiert er dazu in einem Tremolo, das endlos beschleunigt (Risset-Rhythmus), ohne je schneller zu werden. Ein Puls-Stoß ist ein kurzer Riss nach oben.

**Novum:** Shepard/Risset (V syn §2.7: N oktavversetzte Partiale aus einem Phasor, Glockenkurve über log f; Risset 1968/69 kontinuierlich, dazu das rhythmische Pendant). Nächstes: Max/SC-Patches, Audio-Weaver-Modul, als *spielbare* Quelle auf dem Handy nicht vorhanden (V syn §2.7). Unterschied: Richtung und Tempo aus der Fingerhöhe/Neigung, Glockenmitte = gespielte Note (Chroma *und* Höhe folgen x), Risset-Rhythmus im Puls-Tempo.

**DSP (W, `myzel-stru`):** Params `detune`, `freq`, `hoehe`. N = 6 Partiale (Stufe 3: 9), gemeinsamer Oktav-Offset φ, Rate v = 2·tempo·s(y−0,5) Oktaven/s mit Totzone ±0,08 und kubischem Anstieg (A). Partial k: pos_k = ((k+φ) mod N) − N/2, f_k = f_c·2^pos_k, f_c = freq·2^(detune/1200). Amplitude a_k = cos²(π·pos_k/(2B)) für |pos_k| < B, sonst 0 (B = `breite` in Oktaven) – beim Umlauf ist die Amplitude 0, der Phasenakkumulator läuft weiter → kein Klick. Sinus über Modul-Tabelle. `farbe`: zweite Reihe bei 3·f_k mit Gewicht 0,3·farbe (glasig). `takt`: Tremolo m = 1 − takt·(1 − Σ_j b_j·(½−½cos 2πψ_j)/Σ b_j), drei Lagen j ∈ {−1,0,1} mit Raten r₀·2^(j+ψ), r₀ = `seq.bpm`/60 (Viertel, V index:1856), ψ läuft mit derselben Rate v wie φ – das Tremolo beschleunigt mit dem Steigen. Burst: v = ±8·tempo, über die Gate-Dauer auf 0 abklingend (Riss), φ zufällig gestartet (nie zwei gleiche Stöße, mus P4). **Stufe 3:** 9 Partiale, zweiter Satz ±4 ct L/R, 5 Tremolo-Lagen.

| Param | Bereich | Default |
|---|---|---|
| `stru.tempo` | 0,05–2 Okt/s | 0,3 |
| `stru.breite` | 1–3,5 Okt | 2,2 |
| `stru.farbe` | 0–1 | 0,25 |
| `stru.takt` | 0–1 | 0 |
| `stru.att` / `stru.rel` | s | 0,15 / 1,2 |

**Spielen:** Höhe über Mitte = steigen, unter Mitte = sinken, Mitte = Oktav-Orgel; Gestik-Neigung nach vorn = Aufstieg des ganzen Akkords – ein Akkord aus drei Fingern steigt gemeinsam. Bebung wirkt auf alle Partiale. Puls: mit `takt` 1 wird jede Lane ein Accelerando, das nie ankommt.

**Kosten (A):** 0,4 / 0,8 (6–12 Tabellen-Reads + 3 Tremolos; native Alternative mit 6 Oszillatoren und geplanten Rampen ≈ 1,5–2, V syn §2.7 – W klar besser). **Risiken:** Die Illusion braucht Partiale über den Hörbereich – auf Handy-Lautsprechern fehlen die tiefen Oktaven (Glockenmitte = Note mildert). Stillstand erfordert die Mitte zu treffen (Totzone). `seq.bpm` ändert sich → ψ-Raten sanft nachziehen.

---

## 3. Amöbe `amo` – dynamische stochastische Synthese (Xenakis GENDY)

**Pitch:** „Stochastische Wellenform nach Xenakis – ein Polygon, das jede Periode seine Gestalt ändert“

**Klang (10 s):** Ein sägender, lebendiger Summton, dessen Obertöne wie unter einer Lupe zittern; Finger unten: fast stabil, ein fremder Orgelton; Finger oben: die Wellenform tobt, Ausreißer knistern, der Ton wird zu rauem Rauschen mit Tonhöhe. Nie zweimal gleich, nie weglaufend (Rückkehr).

**Novum:** GENDY: Polygonzug aus K Punkten, Amplitude/Dauer je Punkt random-walken je Zyklus aus wählbarer Verteilung, Spiegel-Barrieren; Gendy3 normiert die Periode → stabile Tonhöhe (V syn §2.4, SC-Quelle). Nächstes: SC/Csound-UGens, Gendy.js (Georgia Tech, Code nicht gefunden) – auf Touch-Instrumenten unbekannt (V syn §2.4). Unterschied: Schrittweite unter dem Finger, „Rückkehr“ zum Seed-Polygon (gezähmt), Cauchy-Ausreißer als Charakter.

**DSP (W, `myzel-amo`):** Params `detune`, `freq`, `hoehe`. K Punkte (amp_i ∈ [−1,1], dur_i mit Σdur = 1). Je Periode T = SR/f: amp_i ← spiegel(amp_i + a·D), dur_i ← spiegel(dur_i + d·D), dur renormieren (Gendy3); Rückkehr: amp_i += rueck·0,1·(amp⁰_i − amp_i) (Seed-Polygon aus vel: harter Anschlag = extremere Startform). a = 0,02 + 0,6·y², d = 0,3·`zeit`. D aus `verteilung`: linear (gleichverteilt), cauchy (tan(π(u−½)), geklemmt ±4 – Ausreißer), logist, sinus (Nachbarpunkt der Vorperiode als Treiber – Xenakis' „SINUS“ = externes Signal). Ausgabe: lineare Interpolation, 2× überabgetastet + Halbband-Mittel gegen Aliasing (A), Einpol-Tiefpass bei min(8f, 0,4·SR). Burst: die ersten drei Perioden mit a·4 (Zucken). **Stufe 3:** zwei Amöben L/R ±3 ct, eigene Seeds, K bis 24; rechts die Gendy2-Variante (Random-Walk der Deltas, V syn §2.4) → L/R verschieden lebendig.

| Param | Bereich | Default |
|---|---|---|
| `amo.punkte` | 3–24 (step 1) | 12 |
| `amo.zeit` | 0–1 | 0,15 |
| `amo.verteilung` SEL linear/cauchy/logist/sinus | | cauchy |
| `amo.rueck` | 0–1 | 0,3 |
| `amo.att` / `amo.rel` | s | 0,02 / 0,3 |

**Spielen:** Höhe = Unruhe; Gestik-Schütteln (Höhen-Offset-Spitzen) = kurze Ausbrüche, die wegen Rückkehr wieder heilen; Bebung normal. Puls: jeder Stoß zuckt anders. Mit Tiefe-Oktave als Bass: ein Xenakis-Bass.

**Kosten (A):** 0,25 / 0,5. **Risiken:** Aliasing bei hohen Noten (Überabtastung reicht, A); bei `zeit` hoch verschwimmt die Tonhöhe trotz Normierung (Absicht – Spielhilfe sagt es).

---

## 4. Raupe `rau` – Waveset-Wiederholung auf Tonhöhe (Wishart)

**Pitch:** „Wavesets aus dem Körner-Material, auf die Tonhöhe gerastet und wiederholt bis zum Stottern“

**Klang (10 s):** Das Körner-Material (Glasharfe, Chor, Mikrofon, das eigene Echo) spricht die Note – jede Welle des Materials wird auf die Periode des Tons gezogen. Finger unten: das Material rinnt Welle für Welle durch, schnarrend-stimmhaft; Finger oben: jede Welle wird 64-mal wiederholt – stotternde, flötende Töne, die beim Weiterkriechen in die nächste Welle kippen (Wisharts „tin-whistle“). Ein Puls-Stoß ist eine Silbe.

**Novum:** Waveset-Verzerrung (Nulldurchgang zu Nulldurchgang, Wiederholung n×, V syn §2.5: CDP, SC Wavesets, „Dent“). Unterschied: live, mit **Pitch-Lock** (jede Waveset-Wiederholung dauert genau eine Periode der Note – PSOLA-artig, aber auf Wavesets), Wiederholungszahl unter dem Finger, Material = Myzels Bibliothek inkl. Mikrofon/Echo. In Apps praktisch nicht vorhanden (V syn §2.5).

**DSP (W, `myzel-rau`):** Params `detune`, `freq`, `hoehe`. Material aus `MAT[key]` (Körner-Quelle `kor.src`, kein eigener Param; Echo/Mikro aus `RING`). Kopf p im Material; Waveset [s0,s1) = nächste zwei positiv gehenden Nulldurchgänge ab p (Länge L, 8…4096 Samples; Wavesets kürzer als `sieb` ms werden mit dem nächsten verschmolzen = Wisharts Größenfilter → tonaler). Lesezeiger läuft mit Rate L/T, T = SR/(freq·2^(detune/1200)) → eine Wiederholung = eine Periode. R = round(2^(6y)) Wiederholungen (1…64), dann s0 ← s1 (`richtung` vor/zurück/pendel). Pro Waveset: Pegel auf Ziel-RMS normieren (max +12 dB), Einpol-Tiefpass bei 0,4·SR·T/L gegen Aliasing beim Stauchen, Übergang per Raised-Cosine der Länge `glatt`·T (0 = harte Schnitte, authentisch klickend). vel = Pegel + Startversatz bis 0,1 s (Stöße variieren). Burst: Gate-Dauer mit R aus der Puls-Helligkeit. **Stufe 3:** zwei Köpfe L/R (Versatz 10 ms, R und 1,5·R) → stereo stotternd.

| Param | Bereich | Default |
|---|---|---|
| `rau.stelle` | 0–1 (Start im Material) | 0,3 |
| `rau.richtung` SEL vor/zurück/pendel | | vor |
| `rau.sieb` | 0,2–10 ms | 1 |
| `rau.glatt` | 0–1 | 0,25 |
| `rau.att` / `rau.rel` | s | 0,01 / 0,2 |

**Spielen:** Höhe = Stottergrad; Gleiten = das Material gleitet mit (der Formant wandert mit, anders als bei Körnern); Gestik-Neigung = Kriechen beschleunigen (y). Mikrofon als Material: die eigene Stimme als pitch-gerastete Flöte. Echo als Material: die Raupe frisst sich durch das, was eben erklang.

**Kosten (A):** 0,3 / 0,55. **Risiken:** Stille im Material → Nulldurchgangssuche begrenzen (max 4096, dann als Waveset nehmen); Material-Transfer nur einmal je Wechsel (3,2 s Textur ≈ 600 KB, A); Echo-Ring: nur mit `myzel-ohr` (sonst Fallback `glas`).

---

## 5. Bernstein `brn` – spektrales Einfrieren der eigenen Vergangenheit

**Pitch:** „Friert das Spektrum dessen ein, was eben erklang – die Fingerhöhe greift in die Vergangenheit“

**Klang (10 s):** Was vor Sekunden gespielt wurde, hängt als stehende, schimmernde Fläche in der Luft – ohne Rhythmus, ohne Körnung, phasenlos wie Paulstretch. Der Finger wandert in der Höhe durch die letzten Sekunden: der Akkord von vorhin, dann der Gong, dann die Stille (ein Hauch des Hall-losen Raums). Die Spalte transponiert ihn; mit „Kamm“ singt die Vergangenheit die Note. Puls-Stöße sind Blitze aus der jeweils aktuellen Vergangenheit – Myzel remixt sich selbst.

**Novum:** PV_Freeze/Paulstretch/NessStretch (V syn §2.8), Apps Frostbite/isxynth (Effekte, V syn §2.8). Unterschied: eine *Klangquelle*, deren Material das eigene Spiel ist; Höhe = Zeitpunkt in der Vergangenheit (Scrubbing ohne Zeit), Kamm = Kreuzsynthese Vergangenheit × gespielte Note, Puls spielt die Vergangenheit rhythmisch. „Friere ein, was du gerade gespielt hast“ als Quelle ist selten (V syn §2.8), per Finger unbekannt (A).

**DSP (W, `myzel-ohr` + `myzel-brn`):** Ohr schreibt `RING` (8 s, mono, V oben). Stimme: Params `detune`, `freq`, `hoehe`. Fensterlänge N (`fenster` 2048/4096/8192), Hop N/2. Ziel-Rahmen: Start = Schreibzeiger − (0,3 + y·`vergangenheit`)·SR − N (nie jünger als 0,3 s, sonst friert die Stimme sich selbst sofort ein). Analyse bei Note-on und bei Rahmenwechsel (max. alle 2 Hops): M_k = |FFT(hann·RING[Rahmen])| (ein reelles FFT ≈ 100–200 µs JS, A), Magnituden auf Rahmen-RMS normiert; neue Magnituden werden je Hop zu 50 % eingeblendet → Morph beim Scrubben. Synthese je Hop: Y_k = M'_k·e^{iθ_k}, θ_k ~ U(0,2π) frisch je Hop (Paulstretch-Prinzip, V syn §2.8), IFFT, Hann, Overlap-Add. Tonhöhe: r = f/f_ref, f_ref = mittlere Note der Tonleiter (wie Körner-Echo `ref`, V index:4758): M'_k = M[k/r] (Verschieben, Material bleibt Material), dann M'_k ← M'_k·((1−kamm) + kamm·C_k) mit Kamm C_k = Σ_n Gauss((k·SR/N − n·f)/(0,08·f)) (Vocoder: die Vergangenheit als Hüllkurve auf den Harmonischen der Note); `schaerfe` s: M'_k ← M'^s_k renormiert (<1 schmiert zur Wolke, >1 lässt nur die Gipfel – der Akkord kristallisiert). Bebung/Vibrato: r folgt `detune` (Spektrum-Verschiebung je Hop, k-rate reicht). Leerer Ring (Rahmen < −60 dB): Material aus `MAT` (aktuelle Körner-Textur, Position = y) → klingt immer (`dice()`). Burst: ein Rahmen, Gate-Dauer, Hüllkurve nativ. **Stufe 3:** zwei unabhängige Phasensätze L/R (zweite IFFT) → breit; „Flimmern“: 32 Band-Random-Walks ±30 % auf M' (langsames Glitzern); `fenster` grob erlaubt.

| Param | Bereich | Default |
|---|---|---|
| `brn.vergangenheit` | 1–8 s (Reichweite der Höhe) | 4 |
| `brn.kamm` | 0–1 | 0,4 |
| `brn.schaerfe` | 0,5–2 | 1,2 |
| `brn.fenster` SEL fein/mittel/grob | | mittel |
| `brn.att` / `brn.rel` | s | 0,3 / 1,5 |

**Spielen:** zuerst etwas spielen (oder Puls laufen lassen), dann Bernstein halten und mit der Höhe in die Vergangenheit greifen; Gestik-Neigung = Zeitreise; zweite Ebene = Bernstein unter einer anderen Quelle: jeder Ton zieht seinen eigenen Schatten nach. Lucier-Effekt: Bernstein hört sich selbst (Ring enthält den Mix) – jede Generation verliert Detail (Normierung verhindert Pegel-Wegläufe).

**Kosten (A):** 0,7 / 1,2 je Stimme (23 IFFT/s à ~150 µs auf Handy-Klasse, plus FFT bei Rahmenwechsel) + Ohr 0,1 einmalig. Spitzen: eine IFFT 4096 im Block ≈ 150 µs von 2,67 ms (V wa §1 Budget); 8192 nur Stufe 3. **Risiken:** FFT in JS allokationsfrei (Twiddles im Modul-Scope); Ohr-Eingang wählen (trocken vs. mit Hall – Hall-Fahnen einzufrieren ist schön, aber Pegel-Normierung dann nötig); Datenschutz: Ring bleibt im Audio-Thread, nichts wird gespeichert (sagen).

---

## 6. Mykorrhiza `myk` – gehaltene Töne modulieren einander (Kreuz-FM-Feld)

**Pitch:** „Gehaltene Töne modulieren einander durch ein gemeinsames Pilznetz – wie Bäume über Mykorrhiza“

**Klang (10 s):** Ein Finger: ein reiner Ton, der mit der Höhe über ein Brummen in metallisches Eigen-FM kippt. Zweiter Finger: beide färben sich gegenseitig – eine Quinte klingt wie eine Orgel mit Obertönen, ein Halbton wie zwei streitende Glocken. Ein Puls-Schlag ins Feld lässt die gehaltenen Töne für eine Sekunde aufzucken und wieder beruhigen. Loslassen: der Einfluss verklingt mit der Hüllkurve.

**Novum:** Stimmen-Interaktion ist der Mechanismus hinter „unlike anything else“ (Lyra-8, Mononoke, Rings; mus P3/§4.3, V) und fehlt in Apps außer Mononoke (Drone, V mus §5). Unterschied: Kopplung auf Myzels Tonleiter-Raster (Lyras Wiederholbarkeits-Klage entfällt, V mus §2.1), hüllkurven-gegatet wie bei Lyra („influence decreases with the envelope“, V mus §2.1), und der Puls schlägt ins selbe Feld.

**DSP (N):** Lazy-Singletons beim ersten Start: `A.mykField` = G(1/√n), `A.mykSat` = WaveShaper(tanh), `A.mykDly` = Delay(128/SR); `A.mykField → mykSat → mykDly`. Je Stimme: `osc` (Farbe sine/triangle/organ) → sanfter Shaper (tanh·1,2) → `v.out`; **`v.out → A.mykField`** (so gatet die Hüllkurve den Einfluss). Modulator: `mykDly → modG → osc.frequency` (a-rate FM), zusätzlich eigener Anteil abgezogen: `v.out → ownDly(128/SR) → G(−(1−eigen)) → modG`. modG.gain = idx·f mit idx = kopplung·y + Überschuss(vel), Überschuss klingt mit `nachklang` ab (setTargetAtTime); `setF` zieht `osc.frequency` und modG nach; `v.mod(osc.detune)`. Zyklus-Regel: jeder Rückweg läuft durch einen DelayNode (≥ 1 Quantum, V wa §7) → erlaubt; 2,67 ms Verzögerung sind für FM eine Phasenlage (Schwarm macht dasselbe, V code-map §4). Burst: Stoß = Überschuss ×2, der über `nachklang` abklingt – der Schlag spricht durch die Haltenden. **Stufe 3:** zwei Oszillatoren L/R (±3 ct via `A.uni`) mit `eigen` 0,3/0,7 und ein zweiter Delay-Abgriff (2 Quanten) für R → das Feld wird breit.

| Param | Bereich | Default |
|---|---|---|
| `myk.kopplung` | 0,3–6 (Index bei y = 1) | 2,2 |
| `myk.eigen` | 0–1 (Selbstanteil) | 0,35 |
| `myk.farbe` SEL Sinus/Dreieck/Orgel | | Sinus |
| `myk.nachklang` | 0,1–5 s | 1,2 |
| `myk.att` / `myk.rel` | s | 0,05 / 0,8 |

**Spielen:** Intervalle haben Farbe (konsonant = harmonische Seitenbänder, dissonant = Klirren); Höhe = Kopplungsstärke; Gestik-Neigung = das ganze Geflecht erregen (Strega-„agitation“, V mus §2.4); Bebung normal. Puls-Lane mit Mykorrhiza unter einem gehaltenen Mykorrhiza-Akkord: der Rhythmus wird zur Modulation des Akkords (mus P3).

**Kosten (A):** 0,35 / 0,7 (osc 0,09 + 3 Gains + Shaper + eigener Delay) + Feld 0,1 einmalig. **Risiken:** viele Finger → Feld dicht: Normierung 1/√n bei jedem Start/Finish; FM-Index bei hohen Noten begrenzen (dev < 0,18·SR wie Glocke, V index:3617); Cent-Bus und FM-Bus beide an der Frequenz – FM über `frequency`, Bebung über `detune` (getrennte Params, kein Konflikt).

---

## 7. Brandung `brd` – gezähmtes Chaos (getriebener Duffing-Oszillator, Periodenverdopplung)

**Pitch:** „Gezähmtes Chaos – ein Ton, der mit der Fingerhöhe in Unteroktaven kippt und bricht“

**Klang (10 s):** Unten ein warmer, leicht verzerrter Ton auf der Note. Beim Heben taucht plötzlich die Oktave darunter auf (Periode 2), dann zwei Oktaven (Periode 4), dann bricht die Welle: ein rauschendes Tosen, in dem die Note noch steht, dazwischen Fenster, in denen ein tieferes Intervall (Periode 3) kurz aufblitzt. Senken: die Welle beruhigt sich in der Gegenrichtung. Ein Puls-Stoß ist ein Brecher, der sich zurückzieht.

**Novum:** Chaos-Oszillatoren (Lorenz, Hénon, Chua, Benjolin) sind bekannt, aber nicht tonhöhenfest (V syn §2.6/§5). Unterschied: der Antrieb *ist* die Note, die Zeitachse skaliert mit ihr (Bifurkationen liegen für jede Note an derselben Fingerhöhe), die Periodenverdopplungs-Kaskade wird zur Spielgeste (Unteroktaven), Zustand geklemmt (gezähmt). Kein Touch-Instrument hat eine Bifurkationskaskade unter dem Finger (A).

**DSP (W, `myzel-brd`):** Params `detune`, `freq`, `hoehe`. Dimensionsloser Duffing ẍ + δẋ + αx + βx³ = γ·cos τ, β = 1, τ += h je Sample mit h = 2π·f/SR (f = freq·2^(detune/1200)) – semi-implizites Euler mit 2 Teilschritten (4 ab 1 kHz). δ = `daempfung`, α = −`form` (−1 Mulde → +1 Doppelmulde; bei α=−1, δ=0,3 ist die Route Periode 1 → 2 → 4 → Chaos → Periode-3-Fenster über γ ≈ 0,2…0,65 – A, Lage der Kippstellen nach Gehör/Bench kalibrieren, Tabelle je `form`). γ = 0,15 + 0,55·`tiefe`·y + Überschuss(vel), Überschuss klingt in 0,3 s ab (harter Anschlag bricht sofort, V mus §7.2 „velocity selects behaviour“). Ausgabe o = mischung·x/1,5 + (1−mischung)·cos τ (die Note bleibt hörbar), tanh, DC-Block. Klemmen |x| ≤ 3, |ẋ| ≤ 6, NaN → Reset; Denormal-Flush je Block (V wa §3). Burst: γ-Hüllkurve von γ_max·vel auf γ_min über das Gate (ein Brecher). **Stufe 3:** zwei Systeme L/R, δ_R = 1,1·δ, schwache Kopplung κ(x_R − x_L), κ = 0,05 → korreliertes Stereo-Chaos.

| Param | Bereich | Default |
|---|---|---|
| `brd.form` | −1…1 (Mulde → Doppelmulde) | 0,6 |
| `brd.daempfung` | 0,1–0,6 | 0,3 |
| `brd.tiefe` | 0–1 (wie weit die Höhe treibt) | 0,8 |
| `brd.mischung` | 0–1 | 0,7 |
| `brd.att` / `brd.rel` | s | 0,03 / 0,5 |

**Spielen:** Höhe langsam heben und auf die Unteroktave warten (Kippstelle fühlbar); Gestik-Neigung = die See aufwühlen; Bebung = der Antrieb vibriert, der Oszillator folgt mit Verzug (organisch). Als Bass (Tiefe-Oktave): Sub-Oktaven, die sich von selbst einstellen.

**Kosten (A):** 0,35 / 0,6 (≈ 40 Flops × Teilschritte). **Risiken:** Kippstellen verschieben sich mit `form`/`daempfung` (kalibrierte Tabelle, sonst liegt die Kaskade außerhalb der Fingerhöhe); numerische Stabilität bei hohen Noten (Teilschritte, Klemmen); Pegelsprung beim Brechen (RMS-Nachführung 50 ms).

---

## 8. Plankton `pla` – stochastische Sinus-Wolke auf dem Sieb der Tonleiter (Xenakis, Truax)

**Pitch:** „Stochastische Wolke aus Sinuskörnern auf dem Sieb der Tonleiter“

**Klang (10 s):** Finger unten: ein Ton, der aus Dutzenden kurzer, sich überlappender Sinusfunken besteht – ein schimmerndes Unisono, Risset-nah. Finger oben: die Funken streuen über zwei Oktaven, jeder auf einer Note der Tonleiter – ein leuchtender Tonleiter-Nebel, dessen Dichte und Breite von selbst langsam atmen. Puls-Stoß: ein Puff Funken, der nachglimmt.

**Novum:** Granulare Wolken aus synthetischen Körnern mit Tendenzmasken (Roads/Truax) und Siebe (Xenakis) sind Komponisten-Werkzeuge, nicht Touch-Quellen. Abgrenzung in Myzel: Körner = gesampeltes Material (V code-map §4), Tropfen = Chirps auf Tonleiter-Noten mit Regen (V code-map §4), Schwarm = FM-Insekten. Plankton = reine, phasenfreie Sinusfunken, gesiebt, mit langsamem Eigenleben – „granular that does not sound like granular“ (mus §3 Kritik, V).

**DSP (W, `myzel-pla`):** Params `detune`, `freq`, `hoehe`. 24 Korn-Slots (Stufe 3: 64), Poisson-Scheduler im Block mit Rate ρ = `dichte`·(1 + 0,5·vel); Korn: f_g = f·2^x, x ~ N(0, σ), σ = `spanne`·y Oktaven; `sieb` an: x auf die Tonleiter gerastet (Verhältnis-Liste `SCALE` aus `N.notes`, Oktaven frei) – ein Xenakis-Sieb; sonst ±6 ct Mikro-Verstimmung; Dauer d = `korn`·U(0,6; 1,4), Hann-Hüllkurve, Amplitude U(0,5; 1)/√(ρ·korn) (Lautheitsausgleich); Oszillator = rekursiver Sinus (komplexe Rotation, ≈ 5 ns/Sample, V wa §4), `detune` wird je Block auf alle aktiven Körner angewandt (eine Rotation je Korn). Tendenzmasken: ρ(t), σ(t) random-walken ±25 % mit Perioden 15–40 s (Sloth-Zahlen, V mus §2.9) – das Eigenleben. Burst: ρ×3 für das Gate; `finish` erst nach Gate + 1,4·korn (Körner glimmen nach). **Stufe 3:** 64 Slots, Pan je Korn (die Wolke hat Raum), „Glas“-Körner (ungerade Harmonische) im oberen Drittel.

| Param | Bereich | Default |
|---|---|---|
| `pla.dichte` | 4–200 /s (exp) | 35 |
| `pla.korn` | 20–500 ms | 140 |
| `pla.spanne` | 0,25–3 Okt | 1,5 |
| `pla.sieb` BOOL | | an |
| `pla.att` / `pla.rel` | s | 0,2 / 1,0 |

**Spielen:** Höhe = Streuung (Unisono → Wolke); Gleiten zieht das Zentrum, alte Funken bleiben (Kometenschweif); Gestik-Neigung = die Wolke öffnen; Ladung könnte `pla.dichte` verdichten wie Körner (`LAD_AMT`-Ziel, V code-map §7). Zwei Finger = zwei Wolken, die sich gesiebt durchdringen.

**Kosten (A):** 0,5 / 1,0 (mittlere gleichzeitige Körner ρ·korn ≈ 5; Obergrenze durch Slots). **Risiken:** Dichte × Dauer kann die Slots füllen (Rate deckeln: ρ ≤ Slots/korn); Sieb bei freier Stimmung (`N.free`, V index:2013) → Halbtonraster als Ersatz.

---

## 9. Geäst `ast` – Arboreszenzen (Xenakis), Glissando-Massen (Ligeti, Penderecki)

**Pitch:** „Verästelte Glissandi – Stimmen, die sich vom Ton verzweigen und zu ihm zurückfinden“

**Klang (10 s):** Sechs Stimmen beginnen auf der Note, lösen sich in geraden Glissandi (Linien, keine Kurven), kreuzen einander, bilden Cluster, verzweigen sich paarweise und streben zum Ton zurück – ein kleines „Metastaseis“ unter einem Finger. Finger unten: nur atmende Mikro-Verstimmung; oben: ein Fächer über zwei Oktaven. Puls-Stoß: ein Pfeil, der sich während des Schlags auffächert.

**Novum:** Massen-Glissandi sind Ikonen der Spektralmusik, kein Synth spielt sie als Stimme; Supersaw/Nebel verstimmen statisch (V code-map §4), Photophore lässt Oszillatoren flocken ohne Wurzelton (V mus §2.8). Unterschied: geradlinige Bewegung in Tonhöhe/Zeit (Regelflächen), Verzweigung aus gemeinsamen Punkten, Rückkehr zur gespielten Note, Fächerweite unter dem Finger.

**DSP (W, `myzel-ast`; native Alternative möglich):** Params `detune`, `freq`, `hoehe`. n = 6 Linien (Stufe 3: 12). Linie i: Versatz p_i (Halbtöne), Ziel q_i, Geschwindigkeit u_i = `tempo`·U(0,5; 1,5) Halbtöne/s, konstant bis zum Ziel (gerade Glissandi). Am Ziel: neues q_i ~ N(0, σ)·(1 − 0,8·`heimkehr`), σ = 12·`spanne`·y; mit p = 0,3 „Verzweigung“: q_i wird die aktuelle Tonhöhe einer anderen Linie (zwei Linien laufen vom selben Punkt auseinander). f_i = f·2^(p_i/12), f = freq·2^(detune/1200). Wellenform `farbe` aus Modul-Tabellen (Sinus/Dreieck/Säge bandbegrenzt je Oktave/Glas), Summe/√n, Zweipol-Tiefpass bei 8f. Burst: alle Linien bei 0, σ von 0 auf voll über das Gate, u×4 (Pfeil). vel = Geschwindigkeit + Pegel. **Stufe 3:** 12 Linien, Pan folgt p_i (der Fächer ist links-rechts hörbar), zwei Grund-Seeds L/R.

| Param | Bereich | Default |
|---|---|---|
| `ast.tempo` | 0,5–24 HT/s | 3 |
| `ast.spanne` | 0,25–2 Okt | 1 |
| `ast.heimkehr` | 0–1 (Rückkehr zum Ton) | 0,5 |
| `ast.farbe` SEL Sinus/Dreieck/Säge/Glas | | Dreieck |
| `ast.att` / `ast.rel` | s | 0,3 / 1,5 |

**Spielen:** Höhe = Fächerweite; Gleiten zieht den Stamm, die Äste folgen mit Verzug (Portamento der Masse); Gestik-Neigung = Fächer öffnen/schließen, Bebung = Vibrato der Masse. Tempo langsam (1 HT/s) + Breite klein = Ligeti-Cluster; Tempo 20 + Breite 2 = Sirenen.

**Kosten (A):** 0,35 / 0,75 (6–12 Tabellen-Oszillatoren + Filter; nativ 6 OscillatorNodes mit geplanten Exponentialrampen ≈ 0,7, dann ohne Worklet). **Risiken:** Säge aliast bei hohen Ästen (Tabellen je Oktave); Cluster-Pegel schwankt (Summe/√n + sanfter Limiter).

---

## 10. Kreislauf `kre` – Rückkopplung als Klangquelle (Larsen, Lucier, No-Input)

**Pitch:** „Rückkopplung als Klangquelle – ein Ton, der anschwillt, kippt und nachheult“

**Klang (10 s):** Ein Klopfen, dann wächst aus dem Nichts ein Pfeifton auf der Note – erst rein, dann sättigend, mit Obertönen, die sich einschleichen; hebt der Finger weiter, springt er eine Oktave oder in einen Nachbarmodus wie ein Mikrofon vor dem Lautsprecher. Senkt man ihn unter die Mitte, klingt er aus wie ein Raum, der nachhallt (Lucier). Loslassen beendet nichts abrupt: der Heulton verzieht sich. Puls-Stoß: ein Quietscher.

**Novum:** Larsen/No-Input/Halldorophon (V syn §2.14), Plasmonic (selbstoszillierender Waveguide, „unreachable in other synths“, V mus §2.6). Unterschied: native Web-Audio-Schleife als spielbare Quelle, Schleifengewinn unter dem Finger (unten abklingend, oben anschwellend, Kippstelle in der Mitte), Anschlag = Zeit bis zum Ton, Raum-Kamm für die Modensprünge. In Apps nicht vorhanden (A).

**DSP (N):** Zyklus je Stimme: `sum → BQ bandpass(f, Q = schaerfe) → WaveShaper(tanh, Drive 1 + 4·biss) → G(g) → Delay(τ) → HP(20 Hz) → sum`; τ = n/f mit n = ceil(128·f/SR) Perioden (Delay in Zyklen ≥ 1 Quantum, V wa §7 Spec) – die Moden der Schleife liegen bei k·f/n, der Bandpass wählt f (Q 14 → Nachbarn −17 dB bei f = 2 kHz, n = 6; A). Anregung: Rauschstoß 30 ms + Klick (`klopfen`·vel). Ausgang nach dem Shaper → Tiefpass(6f) → `v.out`. Gewinn: g(y) = 0,99 + (y/0,45)·0,01 für y < 0,45 (Ring klingt in ~0,3–3 s aus), darüber g = 1 + (y − 0,45)/0,55·(`anschwellen` − 1) (e-Faltungszeit τ/ln g: bei 1,12 und 440 Hz ≈ 40 ms → voller Ton nach ~0,4 s, A). `raum`: zweiter, fester Delay 7–13 ms (zufällig je Stimme) parallel mit Gain 0,3·raum → Raum-Kamm, der beim Anschwellen die Modenwahl verschiebt (Oktavsprünge). Tonhöhe: `setF` setzt BQ und τ; Bebung: `v.mod(bq.detune)` zieht die Oszillation (~90 %, A) **und** der Cent-Bus steuert τ exakt: `A.pitchMod → G(1/1200) → WaveShaper(x ↦ τ·2^(−x), Kurve bei jedem setF neu) → delay.delayTime` (Muster wie Obertöne, V index:4061). Release: g → 0,97 über rel/2, `v.out` fällt mit rel. Burst: Klopfen stark, g = `anschwellen` für das Gate, dann 0,96 (Quietscher). **Stufe 3:** zwei Schleifen L/R mit n und n+1 Perioden (verschiedene Modensätze, eigener Raum) → ein Duett, das schwebt; Shaper mit 2× Oversampling (V wa §7: nur dort).

| Param | Bereich | Default |
|---|---|---|
| `kre.anschwellen` | 1,01–1,4 | 1,12 |
| `kre.schaerfe` | 3–40 (Q) | 14 |
| `kre.biss` | 0–1 | 0,5 |
| `kre.klopfen` | 0–1 | 0,6 |
| `kre.raum` | 0–1 | 0,3 |
| `kre.rel` | s | 0,6 |

**Spielen:** Geduld: leise anschlagen und warten, bis der Ton kommt; Höhe = Gewinn (Kippstelle bei 45 %); Gestik-Neigung = Mikrofon zum Lautsprecher neigen; Schütteln = Modensprünge. Akkorde: jede Schleife heult für sich, zusammen ein Larsen-Chor. Oliveros-Modus: Höhe knapp unter der Mitte halten → ewig nachklingender Raum.

**Kosten (A):** 0,45 / 0,9 (BQ, Shaper, 3 Gains, Delay, HP, Tiefpass, Rauschquelle, Cent→τ-Shaper). **Risiken:** Pegel – tanh begrenzt, zusätzlich RMS-Kappung im Zyklus; Frequenz-Quantisierung entfällt (Delay ist a-rate fein, nur Minimum 128 Frames, V wa §7); Stehlen mitten im Heulen → `vFade` (V code-map §2); hohe Noten mit großem n lassen Nachbarmoden näher rücken (Q mit f anheben).

---

## 11. Übersicht

| Key | Name | Familie | Pfad | Kosten L1 / L3 (A) | Höhe = | Puls-Stoß = |
|---|---|---|---|---|---|---|
| gri | Grille | Pulsar | W | 0,3 / 0,55 | Formant | ein Zirp |
| stru | Strudel | Illusion | W | 0,4 / 0,8 | Richtung/Tempo | Riss |
| amo | Amöbe | Stochastik | W | 0,25 / 0,5 | Unruhe | Zucken |
| rau | Raupe | Waveset | W | 0,3 / 0,55 | Wiederholungen | Silbe |
| brn | Bernstein | Spektral-Freeze | W (+Ohr) | 0,7 / 1,2 (+0,1) | Zeit zurück | Blitz der Vergangenheit |
| myk | Mykorrhiza | Kopplung | N | 0,35 / 0,7 (+0,1) | Kopplung | Schlag ins Feld |
| brd | Brandung | Chaos | W | 0,35 / 0,6 | Antrieb (Kaskade) | Brecher |
| pla | Plankton | Wolke | W | 0,5 / 1,0 | Streuung | Puff |
| ast | Geäst | Glissando-Masse | W (N möglich) | 0,35 / 0,75 | Fächer | Pfeil |
| kre | Kreislauf | Rückkopplung | N | 0,45 / 0,9 | Schleifengewinn | Quietscher |

Alle zehn `sustain: true` (Prozesse leben vom Halten); kurzer Tipp endet über `sustainRelease` ≥ halber Peak (V index:3498). Für Sporenregen (`RG_S`, nur geschlagene, V code-map §7) bleiben die bestehenden; wer eine Prozess-Quelle im Regen will, bekommt sie über `hit()` als Stoß (0,22 s) – bei Grille, Plankton, Geäst, Brandung ist das musikalisch (Zirp, Puff, Pfeil, Brecher) und sollte für `RG_S` freigegeben werden (A).

Worklet-Entscheidung: acht Prozessoren in einem Modul (plus `myzel-tap`, `myzel-ohr`), geladen nach `initAudio` – der Thread-Wechsel passiert einmal, nicht beim ersten Ton (V wa §2/§10). Fallback ohne `audioWorklet`: Mykorrhiza, Kreislauf, Geäst (nativ) bleiben; die übrigen werden in der Bibliothek ausgeblendet (V wa §9).

Bench-Pflicht vor dem Einbau (V wa §8): jede W-Engine 24 Stimmen offline gegen Nebel; Startwerte `VCOST1/VCOST3` aus der Tabelle; Handy-Korrektur ×1,0–1,5 (A).

## 12. Vertiefen statt neu – wo eine bestehende Engine den Prozess tragen könnte

- **Körner** könnte Waveset-Wiederholung und Paulstretch als Material-Transformation bekommen (O-Pfad, V syn §2.5/§2.8). Verworfen als Ersatz: Raupe braucht den Pitch-Lock pro Periode und Bernstein das Scrubbing ohne Zeit – beides geht nicht über `spawnGrain` (Puffer sind beim Start „acquired“, V syn §1.3). Als *Zusatz* trotzdem sinnvoll (eine Körner-Quelle „Eingefroren“ aus dem Worker).
- **Obertöne**: ein „Steigen“-Modus (Rissets endloser Klangfarben-Aufstieg: die Spotlights wandern unendlich die Teiltonreihe hinauf, Tonhöhe fest) wäre die Timbre-Schwester des Strudels und passt in `obt.wander` (zwei PeriodicWaves im Crossfade, V syn §1.2 Wave-Cache). Empfohlen als Vertiefung statt elfter Engine.
- **Schwarm**: Blackwell/Young-Schwarmgranulation (Partikel ziehen zu anderen gehaltenen Tönen, V syn §2.20) würde ihm Stimmen-Interaktion geben – schwächer als Mykorrhiza, aber billig.
- **Gong**: echte kubische Modenkopplung im Worklet (V syn §2.17) statt „bloom“ – Qualität, kein Novum.
- **Saite**: Jawari/Tanpura offline in `genKS` (V syn §2.15) – hohes Novum, aber Objekt, nicht Prozess (anderer Ideations-Blick).
- **Nebel** könnte Geästs Bewegung als „Wandern“ bekommen; die Verzweigung und Rückkehr machen aber die Engine aus – getrennt lassen.

## 13. Reihenfolge-Empfehlung (Wirkung je Aufwand)

1. **Mykorrhiza** (nativ, sofort, erfüllt P3 – der am meisten vermisste Mechanismus).
2. **Kreislauf** (nativ, Larsen-Quelle, Oliveros/Lucier-Geste).
3. **Strudel**, **Grille**, **Amöbe**, **Brandung** (ein Modul, vier kleine Prozessoren, je ≤ 60 Zeilen DSP, A).
4. **Geäst**, **Plankton** (Tabellen-Oszillatoren, Scheduler im Block).
5. **Raupe**, **Bernstein** (brauchen `MAT`/`RING`/`myzel-ohr` und die FFT – Flaggschiffe für Sounddesigner, zuletzt).
