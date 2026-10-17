# Inventor-Ideen: 10 neue Klangquellen aus Reibung, Atem, Kopplung und Rückkopplung

Stand 2026-10-13. Rolle: Instrumentenerfinder / Physical-Modelling. Grundlage: `research/code-map.md` (Engine-Vertrag, Kosten), `research/synthesis.md` (Techniken, Modendaten), `research/musicians.md` (P1–P12), `research/webaudio.md` (Worklet-Kosten, Vertrag §10), `research/library-ui.md`.

Legende: **V** = verifiziert (Quelle), **A** = angenommen/eigene Ableitung, zu messen oder nach Gehör zu stimmen. Kosten in Myzel-Einheiten (1,0 = eine Nebel-Stimme Stufe 1); Worklet-Zahlen aus webaudio.md §4 (≈ 5 ns je Resonator-Sample, ≈ 30 ns je Biquad-/Tabellen-Oszillator-Sample, 0,06 je Worklet-Knoten, 0,03 je AudioParam, 1 Einheit ≈ 0,58 % eines Kerns) – alle W-Kosten sind Hochrechnungen (A) bis `v2/cost.js` sie misst.

## 0. Leitidee

Die 14 Engines sind Oszillator/Rauschen/Formant/Granular/FM (gehalten) und abklingende Teiltöne/KS/Membran/Blase (geschlagen). Es fehlt alles, was **ein Mechanismus unter der Hand** ist: Bogen, Atem, Kratzstab, Steg, Rückkopplungsschleife (synthesis.md §0, V). Jede Idee unten hat deshalb

1. eine **Schwelle** unter der Fingerhöhe (Bogendruck, Atemdruck, Schleifenverstärkung, Kopplung – P1),
2. eine Physik, die auf **Spielweise** reagiert statt auf Automation (P2), und bei zwei Engines auf **andere Finger** (P3),
3. ≤ 6 Parameter als physische Substantive mit breitem Sweet Spot (P5), Stufe 3 = mehr Moden/Stimmen, nie ein anderer Mechanismus (P12),
4. den Vertrag: `start(v,t,f,y,vel,o)`, `setF/setY`, `burstEnv` für den Puls, `v.mod()` auf eine `detune`-AudioParam (Bebung, Vibrato, Pitch-Wheel), Hüllkurven nativ auf `v.out.gain` (webaudio.md §10).

Realisierung: **ein** gemeinsames Worklet-Modul `MYZEL_DSP_SRC` (neben `myzel-tap`) mit den Prozessoren `myzel-bow` (Harz, Dachs), `myzel-blow` (Halm), `myzel-syrinx` (Kehlchen), `myzel-scrape` (Zapfen), `myzel-web` (Gespinst, Singleton), `myzel-ember` (Glut), `myzel-scan` (Ranke), `myzel-aeol` (Böe); Dorn läuft offline im DSP-Worker (`genKS`-Muster). Gemeinsame Helfer im Modul: `FracDelay`, `OnePole`, `Reso` (komplexe Rotation), `BowTable`, `TANH[2049]`, `NOISE[65536]`. Modul einmal nach `initAudio` laden (7–15 ms, V webaudio.md §3), nie im ersten Touch.

Freie Keys (geprüft per grep gegen `index.html`): `hrz dax hlm khl zpf gsp glt rnk drn boe`. Namen geprüft: „Hyphen“ ist Mixer-Vokabular (Geflecht: „Hyphen = Weg“), „Faden“ steht im Pegel-Hilfetext – beide vermieden.

---

## 1. Harz (`hrz`) – gestrichenes Glas, Schale, Stab

- **Pitch:** „Gestrichenes Glas, Schale und Stab – der Finger ist der Bogen, seine Höhe der Druck“
- **Gehalten.** Sustain: ja.
- **Klang (10 s):** Der Finger landet, erst ein Hauch Kolophonium-Zischen, dann schwillt in 300–800 ms ein reiner, singender Glaston an (nasser Finger am Weinglasrand), mit einer langsamen Schwebung (0,5–3 Hz) aus einem Modenpaar. Finger höher: Obertöne (2,32×, 4,25× …) stapeln sich, der Ton wird quietschig, ganz oben kratzt der Stick-Slip und kippt in Multiphonics. Loslassen: das Glas klingt 1 s (Glas) bis 4 s (Schale) nach.
- **Novum:** Streichen fehlt in Myzel komplett (Schale = geschlagene Teiltöne). Nächstes Vorbild: STK BandedWG / Elements „bow“ (Eurorack, kein Touch; V synthesis.md §2.10). Keine Browser-Touch-App mit echtem Stick-Slip bekannt (A). Unterschied: Druck = Fingerhöhe, Bogenbeginn = Anschlag, Neigung = Druck – das Streichen *ist* die Geste.
- **DSP (`myzel-bow`, Worklet):** Banded Waveguide (Essl/Cook, V): je Modus k ein Bandpass bei `f·r_k` (Radius `1 − π·32/SR`, V STK) + Verzögerungsleitung `SR/(f·r_k)` minus Filter-Phasenverzögerung, Rückkopplung `g_k` (0,995–0,9999 → T60). Bogen: `Δv = v_bow − Σ_k out_k`, `F = Δv·bowTable(Δv)`, `bowTable(x) = clamp((|x·slope| + 0,75)^(−4), 0,01, 0,98)`, `slope = 10 − 9·p` (V STK/Faust), `in_k = F/M + g_k·out_k`. Bogengeschwindigkeit mit Trägheit `v_bow += 0,0005·(ziel − v_bow)`. Reibgeräusch `0,002·p·noise` an der Junction. Summe → `tanh` → Ausgang.
  Modensätze (V Csound/STK, synthesis.md §2.9–2.10): Glas 1 · 2,32 · 4,25 · 6,63 · 9,38; Schale (Dubletten) 0,9961/1,0039 · 2,979/2,993 · 5,704 · 8,998/9,015; Stab 1 · 2,756 · 5,404 · 8,933; Säge 1 Modus + schwacher 2,0 + tiefes Vibrato; Teich (Waterphone) 4 Kragbalken 1 · 6,27 · 17,55 mit Zufallslängen je Note (A).
  **y** = Druck `p = 0,15 + 0,85·y`: y < 0,1 flautando (fast nur Grundton, luftig), 0,4–0,7 Sweet Spot, > 0,85 Slope klein → Dauerschlupf, Obertöne schreien, Sprung auf Modus 2. **vel** = Anfangs-Bogengeschwindigkeit (hoch = „Chop“ mit kratzigem Einsatz, tief = langsames Anschwellen). **burst** (Puls) = ein Strich: `v_bow` hoch für `gate·0,8`, dann 0 – die Moden klingen physisch nach; unter 80 ms Gate stattdessen Zupf-Impuls in die Moden (geschlagene Schale). `setF` = Delays je Block nachstimmen, `setY` = Druck, `detune`-Param skaliert alle Delays (Bebung).
  **Stufe 3:** 8 statt 4 Moden mit Dubletten ±0,4 % (Schwebung), ungerade Moden links / gerade rechts (Pseudo-Stereo ohne zweite Instanz).
- **Parameter:** Körper (SEL Glas/Schale/Stab/Säge/Teich, d: Glas), Druck 0,5, Bogen 0,5 (Tempo/Trägheit), Dämpfung 0,4, Schwebung 0,3 (Dublettenabstand), Harz 0,3 (Reibgeräusch).
- **Spiel:** Langsam anschwellen lassen, Höhe wie einen Bogenarm führen; Gestik vorneigen = Druck (Multiphonic-Kanten), Bebung = Vibrato auf gestrichenem Glas; Spalten-Glide = Glissando auf der Schale.
- **Kosten:** 4 Moden ≈ 100 ns/Sample ≈ 0,8 + Knoten/3 Params 0,15 → **≈ 1,0** (A); Stufe 3 ≈ 1,7.
- **Risiken:** Stimmgenauigkeit (Delay minus Bandpass-Gruppenlaufzeit, STK-Näherung reicht?); Einschwingzeit 100–300 ms ist für Puls-Hits zu lang → Zupf-Mischung; Pegelsprung zwischen Regimen → `tanh` + sanfte Kompression; Säge/Teich sind nach Gehör zu stimmen (keine Messdaten, V synthesis.md §6.5).

## 2. Dachs (`dax`) – Daxophon

- **Pitch:** „Daxophon – eine gestrichene Holzzunge, die knurrt, jault und spricht“
- **Gehalten.** Sustain: ja.
- **Klang:** Ein cellohaftes Knurren mit nasalem Vokal; ein Fingerzug wird zum Tierruf (Dachs, Robbe, Elefant), weil das ganze inharmonische Spektrum mit der Zungenlänge wandert, die Holzklotz-Formanten aber stehen bleiben. Tief = Wimmern/Flüstern, Mitte = singend, oben = Brüllen mit Oktav-Unterton (Periodenverdopplung). Loslassen: 0,3–0,8 s hölzerner Nachklang.
- **Novum:** Hans Reichels Daxophon (benannt nach dem Dachs – V Wikipedia-Zusammenfassung in synthesis.md §3.7) existiert in keinem Synth/Browser-Instrument (A). Unterschied zu Harz: Kragbalken-Moden 1 : 6,27 : 17,55 (Euler-Bernoulli βL = 1,875/4,694/7,855, A), feste Körperformanten, Reibungshysterese → Stimme statt Glas.
- **DSP:** derselbe Prozessor `myzel-bow` mit 3 Moden (Stufe 3: 5 + zweite Zunge ±6 ct rechts). Reibung mit Hysterese: `bowTable` mit driftendem `offset` (elasto-plastische Näherung, A) → Knurren/Subharmonische bei hohem Druck. Danach nativ: 2 Peaking-Biquads als Klotz-Formanten `F1 = 500·2^s`, `F2 = 1400·2^s` (s aus „Kehle“), Tiefpass „Holz“. Dax (Keil) = Tonhöhe über x-Spalte; „Bund“ rastet Glides auf Skalenstufen (gerillte Keilseite), „glatt“ gleitet.
  **y** = Druck: Flüstern → Singen → Knurren. **vel** = Biss (Einsatzhärte). **burst** = kurzer Strich („Bellen“), Gate ≥ 60 ms, Moden klingen nach.
- **Parameter:** Zunge (dünn/dick → Modenspreizung, T60) 0,5, Druck 0,5, Kehle 0 (Formantlage ±1 Okt.), Bund (SEL glatt/Bund, d: glatt), Knurren 0,4 (Hysterese), Holz 0,5.
- **Spiel:** Schnelle Spaltenwechsel mit Gleiten = Tierrufe; Bebung = Jaulen; vorneigen = Brüllen. Zweite Ebene mit Tiefe darunter = Monster.
- **Kosten:** 3 Moden + 2 native Biquads + Knoten ≈ **0,8**; Stufe 3 ≈ 1,5.
- **Risiken:** „Stimme“ steht und fällt mit den Formanten (nach Gehör); Subharmonik kann ins Chaos kippen → Clamp; wenn die Bibliothek zu voll ist, als Körper „Zunge“ in Harz falten (verliert Kehle/Bund).

## 3. Halm (`hlm`) – geblasenes Rohr mit Überblasen

- **Pitch:** „Grashalm und Rohr – Atem wird zum Ton, mehr Atem springt ins Überblasen“
- **Gehalten.** Sustain: ja.
- **Klang:** Unter der Schwelle nur Atem, der durch ein Rohr rauscht (rohrgefärbtes Rauschen). Beim Überschreiten „fängt“ der Ton weich: Flöte hohl und hauchig, Rohrblatt schnarrend mit ungeraden Harmonischen. Mehr Druck: Tonhöhe zieht leicht hoch, dann Sprung in die Oktave (Flöte) bzw. Duodezime (Klarinette) mit Knack; ganz oben Multiphonic/Quietschen. Loslassen: Atemstoß, kurzes Rohr-Abklingen.
- **Novum:** Hauch ist gefiltertes Rauschen ohne Selbstschwingung. Jet-/Rohrblatt-Waveguides (STK Flute/Clarinet, V synthesis.md §2.12) gibt es auf Desktop/Eurorack, in Touch-Apps mit Fingerhöhe als Atemdruck und spielbarem Registerwechsel nicht bekannt (A). Die Schwelle und das Überblasen *unter dem Finger* sind das Novum.
- **DSP (`myzel-blow`):** Bohrung = Fraktional-Delay `D = SR/f` − Kompensation, Verlust = One-Pole-Tiefpass + DC-Blocker.
  Rohrblatt (V STK Clarinet): `p_ref = −0,95·lp(bore)`, `Δp = p_ref − p_atem`, `r = clamp(0,7 − 0,3·Δp, −1, 1)`, `bore_in = p_atem + Δp·r`.
  Flöte (V STK Flute): Jet-Delay `J`, `Δp = p_atem − 0,5·lp(bore)` → J → `jet(x) = x·(x²−1)` geklemmt, `bore_in = 0,5·bore + jet`. Überblasen physikalisch statt per Trick: `J = D·0,5/(1 + 2p)` (p = Druck) – bei p ≈ 0,3 erstes Register, p ≈ 0,8 zweites (A, nach Gehör kalibrieren).
  Atem `p_atem = P·(1 + 0,15·lp(noise))`, `P = 0,25 + 0,9·y`; Zungenstoß = Druckstufe + Rauschburst.
  **y** = Atemdruck (Luft → Ton → Überblasen → Quietschen). **vel** = Zungenhärte („t“ vs „h“). **burst** = Zungenstoß für `gate`, Rohr klingt ~50 ms aus → knackiges Staccato im Puls. `detune` skaliert D.
  **Stufe 3:** zweite Bohrung ±4 ct rechts mit gemeinsamem Atem („zwei Bläser“), Rauschen feiner gefiltert.
- **Parameter:** Rohr (SEL Flöte/Rohrblatt, d: Flöte), Atem 0,5 (Schwellenlage unter dem Finger), Mund 0,4 (Rauschanteil/Ansatz), Blatt 0,5 (Blattsteifigkeit bzw. Jetbreite → Schwelle, Helligkeit), Loch 0,5 (Schleifen-Tiefpass = Material/Grifflöcher), Zunge 0,5.
- **Spiel:** Mit der Höhe atmen; Gestik vorneigen = Atem (Ocarina-Vibrato kombiniert); schnelle Höhe-Wischer = Registersprünge als Ornament; im Puls kurze Gates = Zungenschläge.
- **Kosten:** Delay + One-Pole + Nichtlinearität + Rauschen ≈ 50 ns ≈ 0,45 + 0,15 → **≈ 0,6**; Stufe 3 ≈ 1,1.
- **Risiken:** Intonation (Filterphase, Registerverstimmung) braucht Kompensationstabelle; die Schwelle muss bei y ≈ 0,3 liegen, sonst sprechen tiefe Töne nicht; hohe Töne: D < 24 Samples – im Worklet ok, Mindestdelay 2 Samples; Pegel oben → Limiter.

## 4. Kehlchen (`khl`) – Syrinx, die Vogelkehle

- **Pitch:** „Vogelkehle – zwei Stimmlippen, die Druck und Spannung zum Singen bringen“
- **Gehalten.** Sustain: ja.
- **Klang:** Ein reiner, leicht rohrblattiger Pfiff mit winzigem „Chip“-Einsatz, der weich gleitet; unten luftige Ansätze, die nicht fangen; Mitte klarer, flüssiger Ton (Amsel, Rotkehlchen – ein Theremin mit Leben); oben rau, Harmonische, Periodenverdopplung (Rabe). Stufe 3: beide Kehlseiten leicht verschieden → zweistimmiger Drosselgesang mit Schwebung. Jeder Einsatz hat Mikro-Glides, weil die Spannung mit dem Druck steigt – alles klingt gesungen.
- **Novum:** Syrinx-Modelle (Gardner/Cecchi/Magnasco/Laje/Mindlin, PRL 2001, V synthesis.md §2.20) gibt es nur in der Forschung. Myzels Körner-Textur „voegel“ ist Material, Schwarm ist FM-Chaos – keins ist eine spielbare Kehle mit Druckschwelle.
- **DSP (`myzel-syrinx`, ~20 Flops/Sample):** Lippen als Van-der-Pol-artiger Oszillator (nach Laje/Mindlin, Koeffizienten A): `ẋ = v; v̇ = −ε·x − κ·x³ − C·x²·v + B·v − D·x²·v·|x|` – `ε` Spannung (Tonhöhe, `ε ≈ (2πf)²` mit Korrekturtabelle), `B` Bronchialdruck (Hopf-Schwelle bei B = 0, Amplitude ∝ √(B/C)), `D` Rauheits-Dämpfung → Periodenverdopplung bei hohem Druck. Semi-impliziter Euler, 2 Substeps. Trachea: 2 Resonanzen (`c/4L`, L 3–7 cm → 1,2–2,8 kHz), Schnabel = Tiefpass. Unter der Schwelle: Rauschen durch Trachea (leiser Atem).
  **y** → `B = −0,3 + 1,6·y` (Atem → Chip → Ton → rau). **vel** = Druckanstieg (schnell „Chip“, langsam Schwellton). **burst** = Druckpuls über `gate` = eine Silbe (Puls = Zwitschern). Gestik vorneigen = Druck → Phrasen entstehen aus dem Neigen (echte Vögel phrasieren über Druckpulse, V Abstract); Bebung = Spannungsmodulation (`detune`).
  **Stufe 3:** zwei Lippenpaare (links/rechts, ε-Versatz 0–20 ct, Kopplung über gemeinsame Trachea).
- **Parameter:** Spannung 0,5 (Obertonkurve/Register), Druck 0,5 (Schwellenlage), Schnabel 0,5 (Trachea/Formant), Rauheit 0,3, Atem 0,3, Anstieg 0,3.
- **Spiel:** Kurze Tipps = Chips, Höhe-Wischer = Silben, Sporenregen mit Kehlchen = Vogelschwarm im Takt.
- **Kosten:** ≈ 35 ns ≈ 0,35 + 0,15 → **≈ 0,5**; Stufe 3 ≈ 0,9.
- **Risiken:** Frequenzverschiebung durch Nichtlinearität (Kalibriertabelle je ε, A); zu wenig Nichtlinearität = „Sinus mit Vibrato“ (Einheitsbrei) → Defaults in den rauen Bereich legen; Schwelle unter dem Finger muss sitzen (dice()).

## 5. Zapfen (`zpf`) – der Kratzstab über die Schuppen

- **Pitch:** „Ein Stab über die Schuppen eines Zapfens – vom Ticken zum Schnarren bis zum Ton“
- **Gehalten** (der Stab kratzt, solange der Finger liegt). Sustain: ja.
- **Klang:** Unten einzelne hölzerne Ticks (4–8/s), jeder ein kleines resonantes „Tok“ des Körpers; höher Ratsche (20 Hz) → Schnarren → ab der Mitte rastet die Schuppenrate auf Unterteilungen des Tons (f/4, f/2) und Körperton und Kratzton verschmelzen zu einem nasalen Frosch-/Zikaden-/Güiro-Schnarren; ganz oben ist die Rate der Ton selbst: ein rauer, sägender Drone mit Holzformant. Puls: „zzzip“ – ein Strich, der beschleunigt und ausläuft, am Ende ein „Tok“.
- **Novum:** Güiro/Ratsche als *tonhöhenbezogenes* Instrument, dessen Kratzrate die Fingerhöhe ist, gibt es nicht; Plaits-Partikel/Elements-Particles sind stochastisch, Pulsar-Synthese (Roads, V synthesis.md §2.2) hat das Rhythmus↔Ton-Kontinuum, aber keine Kratzphysik. In Myzel: Tropfen (zufällige Blasen), Membran (Schlag).
- **DSP (`myzel-scrape`):** Schuppengenerator: Phasenakkumulator mit Rate `R(t)`, jede Schuppe = 4-Sample-Hann-Impuls mit Amplitude `a·(1 + 0,3·schuppe[i])` (64er Tabelle leicht unregelmäßig) + kurzer Rauschburst „Kratzen“. Körper: 4 Resonatoren (Holzstab 1 · 2,572 · 4,644, V Csound; plus Hohlmodus 0,5 f), T60 50–200 ms; Stufe 3: 6 Moden, zwei Stäbe L/R mit eigener Schuppentabelle.
  **y** → `R = f·2^(−6 + 6y)` (3 Hz … f bei 220 Hz), oberhalb y 0,6 auf `f/2^n` gerastet („Rast“), darunter frei; Fingerbewegung `|dy/dt|` addiert Rate (Kratzen = Fingergeschwindigkeit, physisch). **vel** = Kraft (Impulsamplitude, Helligkeit, Rauschlänge). **burst** = Strich: `R(t) = R_max·sin²(πt/gate)` (beschleunigen/auslaufen), Tipp = 120-ms-Strich. `detune` auf Körpermoden.
- **Parameter:** Körper (SEL Zapfen/Holz/Panzer/Kürbis, d: Zapfen), Schuppen 0,3 (Unregelmäßigkeit), Rast 0,7 (Einrasten auf Unterteilungen), Klang 0,4 (Körper-T60), Strich 0,5 (Strichlänge im Puls), Kratzen 0,3.
- **Spiel:** Langsame Ticks als Selbstspieler-Puls unter einem Nebel; Ladung könnte die Rate verdichten (wie Körner, `MODT`-Ziel); im Puls mit kurzen Gates = Güiro-Pattern.
- **Kosten:** 4 Resonatoren + Impulse ≈ 25 ns ≈ 0,2 + 0,15 → **≈ 0,35**; Stufe 3 ≈ 0,6. Native Rückfallebene: Impuls-Buffer mit `playbackRate` → 3 Bandpässe (≈ 0,3, Impulsform interpoliert, A).
- **Risiken:** oben droht ein billiger Pulszug → Schuppen-Unregelmäßigkeit + Körper + Rauschen pflicht; Aliasing der Impulse (Hann-Impulse, Tiefpass); Rast-Übergang hörbar → Hysterese.

## 6. Gespinst (`gsp`) – Saiten an einem gemeinsamen Steg

- **Pitch:** „Saiten an einem Steg verwoben – jeder Ton weckt die anderen, bis das Gespinst selbst singt“
- **Gehalten** (Tipp = Zupfen, Halten = Streichen/Kratzen). Sustain: ja (`rel` 2 s, damit der Zupf nachklingt).
- **Klang:** Ein Zupf, klar – und darunter beginnen die anderen Saiten der Skala zu summen: ein Hof verwandter Tonhöhen (Quinte, Oktave am stärksten), der 3–8 s hängt. Gehalten kratzt der Finger seine Saite sanft an, das Gespinst füllt sich allmählich mit einer Akkordwolke; mehrere Finger tauschen Energie über den Steg; Puls-Schläge hinterlassen einen Resonanzteppich, der mit dem Pattern atmet. Vorneigen hebt die Kopplung – nahe der Kante singt das Gespinst von selbst, zurückneigen beruhigt es.
- **Novum:** Rings „Sympathetic Strings“ (feste Akkordtabellen, mono), Rosetones/Synestia (Desktop), Pianoteq-Resonanz (V musicians.md §2.9). Kein Touch-Instrument hat ein Netz, das **alle Finger und Spuren** teilt, **auf die Skala des Spielers** gestimmt ist und dessen Kopplung eine Gestik-Achse mit Rückkopplungskante ist (P1, P3, P8, P10).
- **DSP:** Singleton `A.gsp` = ein `AudioWorkletNode('myzel-web')` (einmal je Kontext): N = 8 (Stufe 3: 12) Waveguide-Saiten (Fraktional-Delay + One-Pole-Verlust + kleiner Dispersions-Allpass), gestimmt auf `N.notes` im Umfang der Spielfläche (Skalenwechsel: zweite Bank einblenden). Steg: `B = Σ s_i·w_i`, Rückspeisung `in_i = exc_i + κ·B/N`, `tanh` + DC-Blocker auf B, Ausgang B (ungerade Saiten links, gerade rechts) → `stripIn('fin')` (Integrationsentscheidung; alternativ eigener Mixer-Kanal).
  Je Stimme nativ: Zupf = `ksBuffer` (Saite-Muster, offline) oder gehalten = Partikel-Rauschen (Elements „particles“, V) durch Bandpass bei f; beides → `v.out` **und** über ein Send-Gain in `A.gsp` (Saite bei f antwortet, der Steg verteilt).
  **y** = Zupfposition/Helligkeit und Send-Stärke (wie hart der Steg getrieben wird); Gestik-Höhe-Offset → κ (0,1–0,6; Kante bei ≈ 0,9 der Stabilitätsgrenze → „singt von selbst“). **vel** = Energie ins Netz. **burst** = Zupf, klingt über das Gate hinaus (Puffer fester Länge).
  **Stufe 3:** 12 Saiten über zwei Oktaven, Metall-Dispersion, breiteres Stereo.
- **Parameter:** Saiten (SEL Oktave/zwei Oktaven), Kopplung 0,4, Nachklang 0,5 (Netz-T60), Erregung (SEL Zupfen/Streichen für das Halten, d: Zupfen), Metall 0,2, Steg 0,5 (Steg-Helligkeit/Sättigung).
- **Spiel:** Arpeggien hinterlassen Halo; Puls-Spur 1 mit Gespinst + Finger darüber = Fingerspiel in den Resonanzteppich; Ladung → Kopplung.
- **Kosten:** je Stimme ≈ **0,45** (Buffer/Rauschen + Bandpass + Send); Singleton ≈ 1,3 (8 Saiten) / 2,0 (12) **einmal**, solange die Engine benutzt wird – `voiceLoad()` muss das wie den Bordun fest einrechnen (Integrationspunkt, A).
- **Risiken:** Budget-Buchführung des Singletons; Rückkopplung über κ instabil → harte Grenze, `tanh`, DC-Blocker; Umstimmen bei Skalenwechsel knackt → Crossfade zweier Bänke; Netz lebt länger als die Stimmen (gewollt) – Schlafen/Panik muss es leeren.

## 7. Glut (`glt`) – Rückkopplung als Instrument

- **Pitch:** „Rückkopplung als Instrument – ein Ton, der glimmt, aufflammt, überspringt und nachglüht“
- **Gehalten.** Sustain: ja.
- **Klang:** Finger drauf: ein Klopfen, dann fast nichts – ein Summen, das sich über 1–3 s zu einem singenden Feedback-Ton aufschaukelt (Gitarre vor dem Verstärker), rein, aber lebendig. Finger höher: er flammt auf, sättigt, Obertöne, dann *springt* er in Oktave/Duodezime mit Quietschen; tiefer: fällt zurück. Loslassen stoppt nichts – er verglüht über Sekunden, weil die Schleife unter 1 sinkt. Puls: Klopfer, die aufglühen und verlöschen – ein Rhythmus aus Glut.
- **Novum:** Feedback-Instrumente (Halldorophone, No-Input, Feedback-Gitarre, V synthesis.md §2.14) sind Spielpraxis, nie Touch-Klangquelle; Plasmonic hat eine selbstschwingende Waveguide (Desktop, V musicians.md §2.6). In Myzel schwingt nichts selbst; Tiefe hat nur Drive. Unterschied: die Stimme *ist* eine Schleife mit Verstärkungskante unter dem Finger, Modensprung, Einschwingverzögerung und Nachglühen.
- **DSP (`myzel-ember`, Worklet; nativ möglich):** Schleife `x → Delay τ = 1/f → Bandpass bei f·m (Q 8–20) → tanh(h·x) → ×G → zurück`, Ausgang hinter dem Clipper durch „Kasten“ (Tiefpass + Hochpass). `G(y)`: 0,85 (y 0) → 1,0 (y 0,3, Schwelle) → 1,3 (y 0,6, gesättigt) ; ab y 0,75 springt m auf 2, ab 0,9 auf 3 (Modenhüpfen). Erreger: Klopfer = Rauschburst (vel) + Rauschteppich −70 dB, damit die Schleife immer anspringt. Release: `G → 0,9` über „Nachglühen“ (tc). Native Variante (V Spec-Zyklusregel, synthesis.md §1): `DelayNode(τ ≥ 128/SR, n Perioden) + Biquad + WaveShaper('none') + Gain`, Bebung über `Gain(−τ·ln2/1200)` von `A.pitchMod` auf `delayTime` – funktioniert, aber n > 1 Perioden bei hohen Tönen erlaubt Subharmonische f/n (Knurren, unvorhersehbar) → Worklet bevorzugt, nativ als Fallback.
  **y** = Schleifenverstärkung + Modus (Kante bei y ≈ 0,3). **vel** = Klopfstärke + kurzer G-Schub (harter Klopfer zündet schneller). **burst** = Klopfer + G 1,2 für `gate`, dann Nachglühen 1–2 s (`decayMul`). `detune` auf τ (Doppler-Glide beim Gleiten ist gewollt).
  **Stufe 3:** zwei Schleifen L/R ±5 ct mit 10 % Kreuzkopplung („zwei Verstärker“), Clipper 2× oversampled.
- **Parameter:** Glühen 0,5 (Schwellenlage), Nachglühen 1,5 s, Zunder 0,4 (Klopfer/Rauschen), Hitze 0,5 (Sättigungsfarbe), Sprung 2 (Modenhüpfen bis Harmonische 1/2/3), Kasten 0,5.
- **Spiel:** Liegenlassen und warten (P8); vorneigen = aufflammen; Bebung = Vibrato auf Feedback; Puls mit langen Gates = schwellende Glutakkorde.
- **Kosten:** ≈ 30 ns ≈ 0,3 + 0,15 → **≈ 0,45**; nativ ≈ 0,35; Stufe 3 ≈ 0,9.
- **Risiken:** Lautheitssprung beim Zünden → Ausgangs-Soft-Knee; 1–3 s Einschwingen frustriert schnelles Spiel → Puls startet mit G 1,2; y = 0 darf nicht stumm sein (dice) → Klopfer hörbar; Bebung verstimmt Bandpass gegen Delay → beide über denselben `detune`.

## 8. Ranke (`rnk`) – Scanned Synthesis, der Faden aus Massen und Federn

- **Pitch:** „Eine Ranke aus Massen und Federn, die der Finger anstößt – ihre Form wird zum Klang“
- **Gehalten** (Finger drückt dauerhaft eine Stelle). Sustain: ja.
- **Klang:** Der Ton beginnt mit einem komplexen, fast vokalen „Wow“ (die Form wabert), vereinfacht sich über 3–10 s zu einem milden, sinusnahen Ton; jede Berührung formt ihn neu (Hammer an anderer Stelle → anderes Obertonmuster). Gehalten beult der Finger die Ranke, sie schwankt zurück – langsame, organische Bewegung wie ein atmendes Orgelpfeifen-/Glas-Hybrid. Schütteln hämmert sie an. Klingt holzig-elektrisch, nach keinem Oszillator.
- **Novum:** Scanned Synthesis (Verplank/Mathews/Shaw 2000) nur in Csound/Max; keine Browser-Implementierung; NI Skanner XT ist keine (V synthesis.md §2.1). Sie wurde als **haptisches** Instrument erfunden („pushing or hitting different masses“, V ICMC 2000) – Myzels Touch ist ihr natürliches Zuhause.
- **DSP (`myzel-scan`):** N = 48 Massen (Stufe 3: 96) auf einem Ring (Scanpfad ohne Naht). Physik bei U = 150–400 Hz (alle 128–320 Samples): `a_i = k_s·(x_{i−1} − 2x_i + x_{i+1}) − k_c·x_i − d_i·v_i + F_i; v_i += a_i·dt; x_i += v_i·dt` (V Csound scansyn), je Masse ±10 % Zufall („Holz“). Hammer: Finger-Down setzt Geschwindigkeit der Massen um Position p (Breite w, Stärke vel); gehalten: Dauerkraft F an p mit kleinem Wobbeln. Scan: `φ += f/SR`, `out = lerp(x_alt, x_neu, frac)[φ·N]` (Csound-Interpolation zwischen zwei Zuständen gegen Zipper), DC-Hochpass + sanfter Tiefpass; Pegel über langsames RMS normiert.
  **y** = Hammer-/Druckposition auf dem Ring (welche Raummoden angeregt werden = Obertonmuster, musikalisch). **vel** = Hammerstärke (hart = schmal). **burst** = nur Hammer, Form klingt über „Dämpfung“ aus, `burstEnv` formt den Pegel. `detune` auf die Scanrate. Gestik-Schütteln → Zusatzhämmer (optional, wie Rassel).
  **Stufe 3:** 96 Massen, zweiter Scankopf um +½ Ring versetzt als rechter Kanal (zwei Tonabnehmer).
- **Parameter:** Masse 0,5, Feder 0,5 (Helligkeit/Wellengeschwindigkeit), Mitte 0,3 (Zentrierkraft = „Atmen“), Dämpfung 0,4 (wie lange die Form lebt), Hammer 0,5 (Breite/Härte), Holz 0,3 (Unregelmäßigkeit).
- **Spiel:** Dieselbe Note an drei Höhen = drei Instrumente; lange Haltetöne, die sich selbst verändern (P8); Puls-Hits = Hammerkaskaden, jede Stimme mit eigener Ranke (eine geteilte Ranke je Engine, die alle Hämmer trifft, wäre die P3-Variante – Option für später, A).
- **Kosten:** Physik ≈ 3 Flops/Sample + 1 Interpolation ≈ 15 ns ≈ 0,12 + 0,15 → **≈ 0,3** (billigste Engine); Stufe 3 ≈ 0,4.
- **Risiken:** Aliasing bei zackiger Form (harter Hammer, kleine Dämpfung) → Feder/Hammer klemmen; Pegel schwankt mit Form → RMS-Normierung; „nie zweimal gleich“ muss reproduzierbar genug bleiben (deterministische Hammerposition, Zufall nur in „Holz“).

## 9. Dorn (`drn`) – die Saite auf dem gekrümmten Steg (Jawari)

- **Pitch:** „Saite auf gekrümmtem Steg mit Faden – der Ton blüht nach dem Zupfen in Obertöne auf (Jawari)“
- **Geschlagen.** Sustain: nein.
- **Klang:** Ein Zupf, der dumpf beginnt und über 0,5–2 s nach oben in ein schimmerndes Sirren aufblüht – das Tanpura/Sitar-Schimmern; unten im Feld eine schlichte Saite, Mitte das klassische Jawari-Surren, oben starkes Rasseln mit Steg-Knistern; 4–8 s Sustain. Puls: Pattern aus aufblühenden Drones.
- **Novum:** Kein Mainstream-Synth hat Jawari (V synthesis.md §2.15: van Walstijn/Bridges DAFx-16/17); Rings „Sympathetic“ ≠ Jawari; Myzels Saite ist lineares KS. Unterschied: Kollisions-Nichtlinearität in der Schleife, offline gerendert → Laufzeit wie Saite.
- **DSP (offline, DSP-Worker, `genJawari(f, decay, bright, faden, kruemmung, SR)` nach `genKS`-Muster):** KS-Schleife mit (a) Dispersions-Allpass (Steifheit), (b) einseitiger Kontakt gegen den Steg: `y' = y < h ? y : h + (y − h)·r` mit `r → 0,2` bei weicher Krümmung (Hertz-Näherung `F ∝ max(0, y − h)^1,5` als Reflexionsverlust, A – das volle Modal-/Störmer-Verlet-Modell ist für offline-Rendering auch möglich, teurer in Rechenzeit, nicht in Laufzeit). Das Aufblühen entsteht physikalisch: solange die Amplitude h übersteigt, kollidiert die Saite und schiebt Energie in hohe Harmonische; fällt sie unter h, endet die Blüte und der Ton wird rein (V Mechanismus, A Näherung). Danach nativ wie Saite: Tiefpass + 2 Peaking-Biquads (Kürbis-Korpus).
  **y** = Fadenhöhe h (unten ∞ = schlicht, oben klein = starkes Sirren), **auf 5 Stufen quantisiert** (Cache). **vel** = Zupfamplitude → physikalisch längere Kollision = mehr Blüte. **burst** = Zupf, Gate egal (`decayMul`). Keine Live-Höhe nach dem Zupf (wie alle geschlagenen).
  **Stufe 3:** zwei Saiten ±3 ct L/R + mitgerenderte Oktav-Chikari-Saite.
- **Parameter:** Faden 0,5 (Höhenkurve), Krümmung 0,5 (Kontaktweichheit), Nachklang 5 s, Helligkeit 0,6, Steifheit 0,2, Körper 0,5.
- **Spiel:** Sporenregen (`RG_S`) mit Dorn = Regen aus Sirren; Puls-Spur langsam = Tanpura-Bordun, der blüht.
- **Kosten:** **0,35** (BufferSource + Filter) / Stufe 3 ≈ 1,0; Vorrechnung 5 Stufen × Skalentöne im Worker (`warmKS`-Muster).
- **Risiken:** Cache-Volumen ×5 gegenüber Saite, erster Ton wartet evtl. (Fallback nächste Saite ≤ 2 Okt. per Rate wie `ksBuffer`); billiger Clip klingt vielleicht nicht nach Jawari → Zeit für Blüte-Tuning einplanen; Alternative: als `sai.steg`-Parameter in Saite (siehe §11).

## 10. Böe (`boe`) – Äolsharfe

- **Pitch:** „Äolsharfe – der Wind lässt Saiten in den Obertönen singen, die er gerade trifft“
- **Gehalten.** Sustain: ja.
- **Klang:** Ein weiches Windrauschen, aus dem einzelne Obertöne des Tons auftauchen und hängen bleiben (2., 3., 5. …), in langsamer, unvorhersehbarer Folge an- und abschwellend, manchmal zwei, drei zugleich als Geisterakkord. Finger höher = mehr Wind: höhere Obertöne, mehr davon, dichter, lauterer Wind; ganz oben pfeifende Turbulenz; tiefer dünnt der Akkord bis auf Grundton und Summen aus. Jede Note verändert sich minutenlang von selbst.
- **Novum:** Echtzeit-Äolsharfenmodelle (Selfridge/Moffat/Reiss 2017, V synthesis.md §3.12) existieren nur in der Forschung. In Myzel: Obertöne setzt **einen** Oberton per Bandpass ins Licht (folgt sofort); Böe hat viele lange nachklingende Saiten, die nur **einrasten**, wenn die Wirbelfrequenz des Windes sie trifft – Akkorde hängen, Totzonen schweigen (P1).
- **DSP (`myzel-aeol`):** K = 8 (Stufe 3: 14) Resonatoren bei `k·f`, T60 3–6 s (komplexe Rotation, 4,5 ns je Resonator, V Bench). Wirbelfrequenz `f_shed = f·(0,7 + 7·w)`, `w` = Wind ∈ [0,1] = y + Random Walk ±0,15 (`A.driftBuf`-Muster) + Gestik. Erregung in Saite k: `e_k = exp(−((f_shed − k f)/(0,12·k f))²)` × Rauschen – liegt f_shed zwischen Harmonischen, wird nichts erregt (Totzone, die hängenden Saiten klingen aus). Lock-in mit Hysterese: einmal gefangen hält die Saite den Wirbel in ±20 % (V Physik: Strouhal/Lock-in, A Zahlen) → plötzliches Umspringen wie bei echten Äolsharfen. Windgeräusch: Bandpass bei f_shed, Q 3, leise. Der Grundton bekommt immer etwas Erregung (nie stumm, dice).
  **y** = Windstärke (Register, Dichte, Rauschen). **vel** = Anfangsböe (mehrere Harmonische sprechen sofort, dann Beruhigung). **burst** = Böe: w springt auf y und fällt über `gate` – die Saiten klingen über das Gate hinaus („Whoosh-Akkord“). `detune` auf alle Saiten. Nicht nativ bauen (PeriodicWave + Bandpass wäre Obertöne-Klon).
  **Stufe 3:** 14 Saiten, Saiten ungerade L / gerade R, zweiter Windpfad.
- **Parameter:** Saiten 8, Wind 0,4 (Grundwind), Böen 0,4 (Random-Walk-Tiefe/-Tempo), Nachklang 4 s, Rauschen 0,3, Fang 0,5 (Einrastbreite).
- **Spiel:** Liegen lassen (P8); vorneigen = Sturm; im Puls lange Gates = Böen über ein Nebel-Bett; Ladung → Böen (optionales `MODT`-Ziel).
- **Kosten:** 8 Resonatoren + Rauschen ≈ 60 ns ≈ 0,5 + 0,15 → **≈ 0,6**; Stufe 3 ≈ 1,0.
- **Risiken:** Totzonen fühlen sich wie Stummheit an → Grundton-Mindesterregung, Fang-Default breit; Katalognähe zu Obertöne muss der Text abgrenzen (Akkorde, Saiten, Wind); Random Walk langsam genug (Sloth-Zahlen, 10–60 s Orbits, V musicians.md §2.9).

---

## 11. Vertiefen statt neu (Empfehlungen, ohne die 10 zu ersetzen)

| Engine | Vertiefung | Warum / Kosten |
|---|---|---|
| Schale, Gong | **Anschlagort** (`sch.ort`, `gng.ort`): Höhe = Schlagposition, Modengewicht `|Φ_k(pos)|` (Knotenlinien löschen Moden, V synthesis.md §2.18); Gong zusätzlich Opern-Gong-Glide nach oben („Kuppel“, V §2.17) | Größter Gewinn für 0 Laufzeitkosten; macht eine eigene Chladni-Platte überflüssig |
| Saite | `sai.steg` (Jawari, offline) und `sai.steif` (Dispersions-Allpass) | Wenn Dorn keinen Platz bekommt; Laufzeit bleibt 0,35 |
| Glocke | Zweiklang-Modus (Bianzhong: Höhe wählt sui/gu-Ton, Terz auseinander, V §3.4) | 2 Oszillatorgruppen, ≈ Glocke Stufe 3 |
| Hauch | wird zum Luft-Regime von Halm; Hauch selbst unverändert lassen | Kein Umbau |
| Stimme | Kelly-Lochbaum-Trakt nur als Stufe-3-Option (2–4 Einheiten, V §2.13) | Zu teuer für Stufe 1, Pink Trombone ist bekannt → kein Novum |
| Körner | Waveset-Wiederholung als Material-Transformation offline (V §2.5) | Billig, aber Effekt, keine Klangquelle |

## 12. Übersicht

| Key | Name | Art | Mechanismus unter dem Finger (y) | Pfad | Kosten L1 / L3 (A) | Teilt |
|---|---|---|---|---|---|---|
| hrz | Harz | gehalten | Bogendruck | W `myzel-bow` | 1,0 / 1,7 | Prozessor mit Dachs |
| dax | Dachs | gehalten | Bogendruck → Knurren | W `myzel-bow` + 2 native Biquads | 0,8 / 1,5 | |
| hlm | Halm | gehalten | Atemdruck → Überblasen | W `myzel-blow` | 0,6 / 1,1 | |
| khl | Kehlchen | gehalten | Luftsackdruck → Rauheit | W `myzel-syrinx` | 0,5 / 0,9 | |
| zpf | Zapfen | gehalten (+Strich) | Kratzrate: Rhythmus → Ton | W `myzel-scrape` (nativ möglich) | 0,35 / 0,6 | |
| gsp | Gespinst | gehalten (Tipp = Zupf) | Send/Zupfort; Neigung = Kopplung | nativ je Stimme + W-Singleton `myzel-web` | 0,45 + 1,3 einmal / 0,45 + 2,0 | `ksBuffer`, `N.notes` |
| glt | Glut | gehalten | Schleifenverstärkung + Modensprung | W `myzel-ember` (nativ möglich) | 0,45 / 0,9 | |
| rnk | Ranke | gehalten | Hammer-/Druckposition | W `myzel-scan` | 0,3 / 0,4 | |
| drn | Dorn | geschlagen | Fadenhöhe (5 Stufen) | O Worker + nativ | 0,35 / 1,0 | `KS_CACHE`, `warmKS` |
| boe | Böe | gehalten | Windstärke → Einrasten | W `myzel-aeol` | 0,6 / 1,0 | `A.driftBuf`-Muster |

Verteilung: 9 gehalten, 1 geschlagen – Reibung, Atem und Kopplung sind von Natur aus Haltesachen; alle zehn spielen im Puls über `burstEnv` + physische Kurz-Erregung (Strich, Zungenstoß, Klopfer, Böe, Hammer, Zupf). Geschlagene Vielfalt liefern die anderen Ideenlisten; Dorn und Gespinst-Zupf ergänzen `RG_S` (Sporenregen).

Vertragspunkte für alle W-Engines (webaudio.md §10): 1 Knoten je Stimme, Params `detune` (k-rate, via `v.mod`), `freq`, `hoehe`, ≤ 1 weiterer; `port` für `{on, f, y, vel, gate}` / `{off, k}`; Hüllkurven nativ; `process()` gibt `false` nach 8 stillen Blöcken zurück; Denormal-Flush je Block; `renderQuantumSize` nie hart 128; Fallback ohne `audioWorklet`: Engine ausblenden (Glut, Zapfen: native Variante).

## 13. Offen / zu messen

1. Alle W-Kosten mit dem `calibrate()`-Verfahren messen (24 Stimmen offline, `research/bench/`), Phone-Faktor ×1,0–1,5 (A). Erwartung: Harz/Dachs sind die teuren, Ranke/Zapfen die billigen.
2. Singleton-Kosten (Gespinst) in `voiceLoad()` einrechnen; Verhalten bei Schlafen/Panik.
3. Intonationstabellen: Halm (Register), Kehlchen (Van-der-Pol-Shift), Harz (Delay − Filterphase).
4. Thread-Wechsel im Worklet-Modus auf Android/Safari (webaudio.md §2) mit `A.budgetScale` beobachten; Modul nur laden, wenn eine W-Engine in `v.eng/v.layer/l*.eng/rgS` steht (A: schont Nutzer ohne neue Engines).
5. Dorn: ob die einseitige Klemmung die Blüte trägt, sonst Modal-Kollision offline (teurer Render, gleiche Laufzeit).
