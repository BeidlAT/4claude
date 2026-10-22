# Hexenring – the listening looper

Inventor's proposal for Myzel's looper · 18.10.2026 · Basis: `BRIEF.md`, all of `dev/looper/research/*.md`, greps of `myzel/index.html` (24 012 lines). **(V)** = verified in the code or the research, **(A)** = assumption or design choice.

---

## 1. The idea in one paragraph

A fairy ring is mycelium you never see that brings the same mushrooms back in a circle, a little further out every year. Hexenring is a looper built the same way. It listens all the time, underground, and what you played comes back in a circle – the same, and never quite the same. Its loops („Triebe") are not recordings but **re-performances**: every pass is played again by Myzel's own physical models from the notes, gestures and chance you gave it. So a loop follows the scale, the tempo and the source you change, ties its notes across the seam and never cuts a tail. On this living material sits a musician's ear. It finds the bar in a free phrase, closes the loop when you repeat yourself, keeps the version of a figure you *meant* out of four attempts, and knows which part is the bass. Only as far as one control, **Eigensinn**, allows, it plays the parts you are not playing, answers when you pause, makes room when you push, and brings back an old loop when your playing calls for it. Everything it is about to do germinates visibly one bar ahead, and one tap keeps it or refuses it. It remembers you across evenings („Handschrift"). And it treats the unpredictability of the 28 sources as its lowest register of freedom: a pass in which the Böe caught the perfect fifth can be kept, exactly, by praising it.

## 2. Names

| Name | What it is | Why |
|---|---|---|
| **Hexenring** | the looper | a fairy ring returns the same fruit in a circle, growing outward |
| **Trieb** (pl. Triebe) | one loop, re-performed by voices | a shoot that grows again every pass; also an urge – it has a will |
| **Abdruck** | a Trieb's audio print | the spore print: the exact trace of one pass |
| **Schleife** | a pure audio loop (mic, textures that are not notes) | reserved for audio loops (Gestik konzept §11) (V) |
| **Fährte** | a Trieb's movement layer | the button goes, the word stays |
| **Ernten** | the capture gesture | you harvest what has already grown |
| **Auslese** | a loop built from the consensus of your repetitions | the best, picked from several attempts |
| **Eigensinn** | how much the looper may do on its own: **Treu · Lebendig · Variieren · Antworten · Eigenwillig** | the research's „Atmen" step is renamed: „Atmen" labels `bor.breath` (V) |
| **Anker · Lob · Nein** | the original · keep · refuse | as in the research |
| **Wurf** | the chance of one pass (the seeds of all its voices) | „ein guter Wurf" |
| **Vorahnung** | the forecast: changes germinate a bar ahead | |
| **Wiederkehr** | an old Trieb returns because your playing calls it | |
| **Handschrift** | your musical memory across sessions | |
| **Träumen** | a Schlafen option: the looper dreams of the session | |

None of these occurs in `index.html` (V, grep). Avoided on purpose: „Fang" (a Böe knob), „Atmen" (Bordun), „Spur" (Puls lanes), „Ring", „Kreisen".

---

## 3. How it plays

### 3.1 The first tap (phone alone)

Hexenring listens from the moment the sound starts. An event ring keeps the last five minutes of everything played, at about 30 bytes per event (A). Nothing is armed.

- **Tap the round Hexenring button = Ernten.** It takes the Fährte's slot in the bar and is always visible.
  - The last phrase becomes Trieb 1 and plays **at once, in phase**, exactly where your next repetition would have begun. A late tap enters mid-pass at the right point. There is no downbeat to hit.
  - With the Puls or MIDI clock running, the Trieb is the last 1, 2, 4 or 8 bars, chosen by a phrase-boundary score, by repetition and by not cutting a note. The window ends at the bar line *after* the phrase, so what you just played is always included (this fixes Fährte defect C2 (V `faehrte.md` §3.2)).
  - Without a clock, §5.1a finds the tempo and the bars from the phrase itself.
  - If you played the figure several times, Auslese builds the version you meant (§5.1c).
- **All corrections are one swipe on the field tag** („Trieb 1 · 2 Takte · 92 · Bass"): ×2, ÷2, 3er-Takt, ±1 Takt, or „letzte Fassung" instead of Auslese.
- **Hold = record while held**, with 130 ms of pre-roll like REC's armed start (V). Release closes the Trieb, rounded to the bar.
- **Selbst schließen** (option): the ring pulses once when it hears you repeat. With the option on, the Trieb closes by itself after your second repetition.
- **Undo** comes through the existing toast with „Rückgängig" (V). No double tap destroys anything (unlike the Fährte (V `faehrte.md` §3.7)).

### 3.2 Layers, overdub, stop, seams

- **Tap while Triebe play** to harvest a new Trieb from what *you* played over them. Triebe are events, so the looper never re-records itself: no feedback, no level creep (loopers.md §3.11).
- **Hold while Triebe play** to overdub into the newest Trieb. Overdubs are never quantised (SooperLooper's rule) and can be undone as a layer.
- **Lengths per Trieb:**
  - *Takt*: ×½ to ×4 of the first Trieb, so polymeter is allowed;
  - *frei*: its own length (Eno);
  - *Phase*: a copy drifting 1/48 beat per pass (Reich), exact because events need no stretching.
- **Stopping:** a stopped Trieb issues no new notes after its seam, and its real tails ring out. **„Stille" stops all Triebe** (this fixes Fährte defect E (V §3.10)).
- **Seams:**
  - a note held across the seam stays one note;
  - releases ring past the seam as they would live;
  - Fährte lanes are matched in value and slope;
  - an Abdruck gets margins, `foldTail` (V) and an equal-power crossfade of 5–30 ms.

### 3.3 MIDI keyboards and the PC

- **Learnable targets:** `hr.ernten`, `hr.dub`, `hr.lob`, `hr.nein`, `hr.anker`, `hr.undo`, `hr.eigensinn` and a mute per Trieb. `hr.ernten` is momentary, so it joins `learnDone`'s momentary exception (V).
- **Defaults on free controls** (V code-map §5):
  - the microKEY sustain jack = Ernten;
  - nanoKONTROL2: ◀◀ = Nein, ▶▶ = Lob, SET = Ernten, R1 = Anker, R2 = Undo;
  - a knob = Eigensinn.
- **On a PC or tablet,** the Hexenring section of the Aufnahme panel shows the Triebe as concentric rings with their notes as spores. Tapping a ghost on a ring vetoes that one change.

### 3.4 Tempo and bars

- **Puls or MIDI clock running:** the clock wins.
- **Puls stopped:** the first Trieb's tempo sets the shared Takt clock. This is the Fährte's never-jumping clock, factored out (V `faeClock`). A later Puls start lands on the Trieb's bar line; `seqStart(b0, t0)` already takes both (V).
- **Weak pulse** (rubato, drones): the Trieb is *frei*. Nothing forces a grid on ambient playing.

---

## 4. What it records and how it plays back

**Each Trieb holds three strands.**

1. **Events.**
   - For each note: `{deg, oct, alt}` and the frequency, velocity, Höhe *over time*, bend and MPE, the release, the source with its parameters, and its seed (its share of the **Wurf**).
   - Puls, Regen and Rassel hits are caught through a `playNote`/`hit` wrapper together with their lane, so a lucky bar of the generative Puls can be kept (V hooks, code-map §1.7; library probes from `kqHear` are excluded).
   - Times are stamped at render time, the `A.ctx.currentTime` of `onDown`; MIDI notes start there too (V). A replay therefore sits where the note was heard, with no second latency shift (loopers.md §3.1).
2. **Abdruck.** The audio of one pass from the Trieb's own bus, inside a new mixer strip „Hexenring". It is recorded from the Trieb's first re-performed pass, so it never contains the live hand or another Trieb.
3. **Fährte.** Movement lanes on the Trieb's clock. They are cleared with the Trieb and do not fade by default.

**Playback.**
- *Gespielt* (the default): re-performed by voices, scheduled ahead like `seqTick` (V).
- *Abdruck*: sample-exact, in a looper worklet.
- **The rule:** an Abdruck sleeps, and Gespielt lives. Anything that would change a note wakes the Trieb into Gespielt at its next seam.

**Schleifen** (mic, Körner textures, Bordun, freeze) are pure audio from a pre-master tap (code-map §8A).
- They get audio service only: seams snapped to onsets (SuperFlux), tempo by onset autocorrelation, and slice reordering at Variieren.
- Later, a hand-ported Basic Pitch could turn a sung Schleife into a Trieb (intelligence.md §5.7).

**Following changes.**
- **Scale:** per Trieb *Diatonisch* (the default), *Transponieren* or *Fest*, applied at the next seam. This works for every `SCALES` entry, including the pentatonics, Pelog and the harmonic series (V).
- **Tempo:** Gespielt Triebe live in beats and follow without stretching, and an Abdruck wakes. Audio Schleifen need an owner decision (§10).
- **Source:** a Trieb keeps its own unless set to „folgt der Spielfläche". The ‹ › in its row re-voices the same notes on another source.

---

## 5. The musical depth: an ear, a memory, a will

### 5.1 Service intelligence: always on, never changes your notes

| Job | Algorithm | Cost |
|---|---|---|
| **a. Takt finden** | Each candidate beat count n (2–64; 40–220 BPM) is scored by:<br>• onset fit to subdivisions (Gaussian, σ ≈ 25 ms, velocity-weighted);<br>• IOI-histogram agreement;<br>• loud and low notes on downbeats;<br>• a log-normal tempo prior **from your Handschrift**, so your own tempi count;<br>• a bar prior (1/2/4/8; 3/4).<br>The top three become tag alternatives. If pulse clarity (peak-to-mean) is low, the Trieb is *frei*. | < 1 ms |
| **b. Selbst schließen** | A factor oracle checks whether the current suffix (≥ 5 events, ≥ 1 s) is a prefix of the phrase's start: same degree or interval sequence, IOI ratios within ±15 %. | µs per note |
| **c. Auslese** | The k repetitions are aligned by dynamic time warping on (onset, degree), and notes are clustered across them (same degree, ±1/16 beat). Clusters in at least ⌈k/2⌉ repetitions survive, with median timing and velocity and the Höhe curve of the most typical instance. Offered when k ≥ 3 and agreement ≥ 80 %; otherwise the last repetition is used. | ≈ 1–10 ms (A) |
| **d. Groove** | Per metric position, mean offset, velocity and spread give your template and swing ratio. Quantising moves notes toward *your* template: `t' = grid + (1−q)·δ + q·template`, q = 0 by default. The template carries over to the Puls (`seq.swing` (V)) and to every generated note. | µs |
| **e. Rollen** | Register, polyphony, duration per beat, density, share on strong beats and pitch range are combined with the source's nature (`ENG_META` art (V)): Amöbe and Tiefe lean bass; held Böe, Nebel and Harz lean Fläche; Membran and Zapfen lean Schlag. The result is Bass · Akkorde · Melodie · Fläche · Schlag, with a confidence. One tap overrides; the weights are later fitted to the owner's labelled takes. | µs |
| **f. Puls lernt deine Schleife** | A Euclidean rhythm (8/12/16 steps, pulses, rotation, Raster) is fitted to a Schlag or Bass Trieb's onsets by Hamming distance, plus its most frequent degree. The fitted lane's walk and probability then continue your rhythm. | < 1 ms |

### 5.2 Eigensinn: one control for the will

Eigensinn is set per Trieb, and a global master scales all of them: one fader for how free the band is.

| Step | What the looper may do |
|---|---|
| **Treu** (0) | Notes and Wurf fixed: the same physical-model performance every pass. The Abdruck may stand in. |
| **Lebendig** (default, ≈ 15 %) | Notes fixed, a new Wurf each pass (the sources' own chance). Timing breathes around your groove with 1/f-correlated offsets at a third of your own spread, which listeners prefer to random humanising (Hennig 2011, intelligence.md §5.1e). |
| **Variieren** | GenJam-style operators on weak positions: a neighbour degree with the contour kept, Euclidean redistribution, thinning by metric weight × velocity, passing tones, octave displacement, ornaments (Wirbel). Each pass, 16 candidates are scored by consistency with the Anker, novelty, fit and a repeat penalty; a softmax with the Trieb's seeded random generator picks one. An elastic pull returns toward the Anker. |
| **Antworten** | Role play, energy following, answers, accompaniment suggestions, Wiederkehr (§5.3). |
| **Eigenwillig** | Oracle recombination across the session, and Voyager's stances: now and then *Kontra* (it thickens when you thin) or *ignore* for a phrase. The Anker still pulls. |

### 5.3 The co-player's faculties

**Die anderen spielen** (the Reflexive Looper idea). The same features over your last 1–2 bars give your live role. Changes fall only on bar lines, with one bar of hysteresis:
- you play melody: Bass, Akkorde and Fläche play, and melody Triebe thin to their strong notes;
- you play in the bass: bass Triebe fade out at the bar (a 20–50 ms equal-power fade on the Trieb's bus);
- you stop: everyone plays.

**Energie.** E is a smoothed mix of notes per second, velocity, register, polyphony and Ladung.
- *Platz machen* is the default at Antworten: dense playing thins the Triebe, sparse playing lets fills in. *Folgen* and *Kontra* can be chosen instead.
- It acts on notes and arrangement, never on sound quality.

**Antworten** (the Continuator, beat-synchronous). A factor oracle learns tokens (degree interval, duration class, metric class; contour as fallback) from everything you play.
- **When:** after your phrase ends, meaning a gap longer than max(0.3 s, 2 × the median IOI) and a high LBDM boundary score.
- **What:** a beam search finds an answer that is as long as the call (±1 bar), starts on the next beat, ends on a stable degree on a strong beat, and copies at most six tokens verbatim (MaxOrder).
- **Ahead:** if a scene or scale change is pending, the answer fits the coming harmony (ImproteK's scenario).
- **Yielding:** when you resume, the sounding note finishes and no new ones start.
- **Voice:** your own source (a mirror) or Ebene 2's (a dialogue).
- It stays silent until it has about 40 events, unless the Handschrift supplies them.

**Begleiten with Klangverwandtschaft.** From a melody Trieb, Viterbi runs over *Klangfelder*: sets of 2–4 tones of the current scale rather than diatonic triads, because Myzel's default scale is a pentatonic and many of its scales are not diatonic (V `SCALES`).
- **Emission and transition:** melody tones that belong to the field score on strong beats; transitions favour smooth voice leading and your own progressions from the Handschrift.
- **New: roughness in the actual timbres** (after Sethares). Each field is scored by Σ a·b·(e^(−3.5·s·Δf) − e^(−5.75·s·Δf)) over partial pairs of the melody source and the accompanying source.
  - Against a Glocke, a Gong or a winter Jahresring with stretched partials, it picks voicings that do not beat.
  - In the harmonic-series scale, it finds the series' own chords.
  - The partial tables (≈ 10 partials per source and body) are measured once offline with the existing bench (A).
- **Bass:** roots on strong beats with approach tones, in your groove.
- **Delivery:** results arrive as **dashed suggestion Triebe** – muted, with ghosts – and one tap turns each on (Cococo: piece by piece).

**Wiederkehr** (Somax-style activation, for whole loops).
- Every Trieb of the session, muted and old ones included, carries an activation.
- Live phrases matched against its tokens through the oracle raise it; it halves every 8 bars.
- Above a threshold the Trieb returns at the next 4-bar line, announced a bar ahead. Play the opening's motif at minute 12, and the opening's bass comes back.
- This is recapitulation from your own material, the one kind of form a local model can honestly offer.

### 5.4 Zeigen: see it coming, refuse it

- **Vorahnung.** Only *changes* are shown.
  - A bar before a changed note sounds, a germ swells at the top edge of its column and bursts when the note sounds. The columns are scale degrees, so the place is the pitch.
  - Answers germinate as a chain. A Wiederkehr appears as a ring forming at the edge.
  - Nothing takes pointer events, so the field stays playable (the `#faeTag` pattern (V)).
- **Lob and Nein.** While a note change is pending, and for two bars after, ✓ and ✕ sit beside the field tag (and on pads). At Lebendig a dim ✓ stays there: „diesen Durchgang behalten".
  - **Lob:** the sounding pass, *including its Wurf*, becomes the Anker.
  - **Nein:** back to the Anker at the next bar, and that operator's weight drops. Two Neins within four bars set the Trieb to Treu for eight bars.
  - **Anker** restores the original.
- **Absicht.** One glyph per Trieb shows its stance: folgt · antwortet · macht Platz · widerspricht · träumt. Showing an AI drummer's state correlated with musicians' flow (McCormack et al. 2019).
- **History.** Every pass can be rebuilt from Anker, operators and Wurf: a scrollable timeline per Trieb.

### 5.5 The sources' chance is part of the intelligence

Myzel's sources never repeat themselves (V KONZEPT). An audio looper freezes that, and a note looper scatters it through `Math.random`. Hexenring makes chance a register of its own: a pass's **Wurf** is the seeds of all its voices.
- **Seeds:** worklet sources already take a seed per note into a xorshift generator (V `wkSeed`, `class PRNG`). The looper passes its own.
- **At Treu** the Wurf is fixed: the Böe catches the same strings, and the Rhizom avalanche runs the same path.
- **At Lebendig** each pass gets a new Wurf. Only the physics varies.
- **Lob keeps a lucky Wurf.** Breeding a loop by praising its best passes needs no AI, only seeded chance, and no looper offers it.
- **Limit:** shared state (Gespinst's web, Jahresring's year, Rhizom's exhaustion) makes a Treu pass near-identical, not bit-identical.

### 5.6 Handschrift: memory across sessions

- **Stored** locally in IndexedDB (≤ 1 MB (A)): the token corpus as pruned variable-order counts, groove templates per tempo band, favourite tempi, scales and sources, Klangfeld progressions, and the operator weights learned from Lob and Nein.
- **Used** as the tempo prior, for answers from the first minute (your own past solves the cold start, instead of a foreign neural prior), for the groove of generated notes, and in choosing operators.
- **Controlled** by:
  - a scope chip per Trieb: „dieser Trieb · heute · Handschrift";
  - „Sitzung übernehmen?" at the end of a session (opt-in);
  - Vergessen;
  - JSON export and import. Another player's Handschrift is used only by explicit choice.

### 5.7 Ties to the instrument

- **Puls:** §5.1f, groove transfer, and lucky Puls bars kept by Ernten.
- **Gestik:**
  - Ladung can be assigned as a target of Eigensinn: shaking grants the band temporary licence that drains over bars, in line with Ladung's meaning (Gestik konzept §2).
  - Fährte is a layer of the Trieb.
  - „Hinlegen wird Ernten" (opt-in) reuses the existing Ruhe path (V).
- **Schlafen:** Triebe end at their seam. A new option, **Träumen**: under the freeze tail, the oracle plays a sparse walk through the session's material until you wake it. `slArt` today offers kadenz, stille and szene (V).
- **Sporenregen:** a Trieb may seed Keime, so tilting arpeggiates the loop's harmony.
- **Rhizom, Gespinst:** Triebe strike and send like fingers; the web hears loops and hand together (A).
- **Mixer:** a strip „Hexenring" (route `dir`, per-Trieb levels, Pumpen keyed from a Schlag Trieb); `mxChannels.own` must learn its key (V code-map §3).
- **Scenes, presets, form:**
  - scenes A/B store Trieb mutes, levels and Eigensinn, and the morph crossfades them;
  - presets carry a *Mitspieler-Rezept* (Eigensinn, role policy, accompaniment style); the Triebe belong to the piece and survive a reload;
  - form comes from *Reihen* (Triebe alternating after n passes), follow actions, optional „Verblassen" (default off) and Wiederkehr.

---

## 6. Three interactions, minute by minute

### A. „Nachtwald" – phone alone, headphones, no Puls
- **0:00** On Böe she plays a slow three-note figure twice. On the second time, the ring pulses: it heard the repeat.
- **0:40** She taps. Pulse clarity is low, so Trieb 1 is *frei*: 11.3 s, role Fläche, entering where her third repetition would have. At Lebendig the wind catches other strings each pass.
- **2:00** One pass leaves a fifth hanging. She taps the dim ✓: that Wurf becomes the Anker, and the elastic pull keeps coming home to it.
- **3:00** On Amöbe, two octaves down, she plays a two-note drone of 7.4 s and taps: Trieb 2, *frei*. Against 11.3 s, the two never meet the same way twice (Eno).
- **5:00** She sets Trieb 1 to Variieren. A germ swells at the top of the fourth column a pass ahead; she taps ✕, it reverts, and that operator is used less.
- **6:30** She changes Moll-Pentatonik to Hirajōshi. Both Triebe follow at their seams, keeping their degrees.
- **8:00** Phone face down, with Schlafen set to Träumen. The Triebe end, the freeze holds, and sparse Böe notes recall the evening through the hall.
- **9:30** She picks it up, and the Triebe return with a spore bloom.

### B. „Groove" – phone + microKEY Air (sustain jack = Ernten), Puls at 96
- **0:00** Puls lanes run on Membran and Zapfen. On Amöbe she plays a two-bar bass line four times, with a slip in the third.
- **0:50** Pedal. Auslese from four (91 % agreement): the slip is gone, and her 58 % swing is kept. The tag reads „Trieb 1 · 2 Takte · Bass · Auslese aus 4".
- **1:40** Four bars of chords on Harz Glas, pedal: Trieb 2, Akkorde, at 5.1 units (three Harz voices at 1.71 each (V `VCOST1`)).
- **2:30** She solos on Kalimba with the global Eigensinn at Antworten. When she dips into the bass, Trieb 1 fades at the bar and returns when she climbs.
- **4:00** She pauses for two bars. Germs chain across the top edge, and the answer comes on Kalimba, ending on the root. She takes up its last two notes.
- **5:00** Begleiten offers a dashed Klangfeld Trieb on Böe, voiced for low roughness against Kalimba's partials. She turns it on and leaves the bass suggestion off.
- **6:00** When she plays dense, the chords thin out; when she plays sparsely, they fill in.
- **7:00** „Puls lernt": lane 1 becomes E(5,16) with rotation 3 on her bass rhythm, then wanders on its own walk.
- **8:00** She shakes the phone (Ladung → Eigensinn): eight bars of Eigenwillig with one Kontra phrase, then back as the charge drains.

### C. „Abendset" – Windows PC, nanoKONTROL2 + nanoKEY Studio, three weeks of Handschrift
- **0:00** The Handschrift loads: tempi 84–100 BPM, Dorisch, Sehne and Jahresring.
- **1:00** A free intro on Sehne, then SET: 88 BPM, 4 bars – his tempo prior beat the 176 BPM reading. The Takt clock is set; the Puls stays off.
- **3:00** He adds a Jahresring ostinato and an Amöbe bass and stores all three in Szene A. The faders are the Trieb levels, and one knob is the global Eigensinn.
- **6:00** He sets the ostinato to Variieren. Ghosts sit on the panel's rings; he answers with ◀◀ Nein and ▶▶ Lob.
- **9:00** Szene B, root up a fourth: the bass re-roots at its seam, and the melody Triebe keep their degrees.
- **12:00** He plays the intro's motif again. The intro Trieb's ring forms at the edge, and it returns at the four-bar line – an unplanned recapitulation. ▶▶.
- **18:00** He sets Verblassen on all Triebe and presses R8 (Zuweisen = Schlafen), which goes into Träumen.
- **After the set:** „Sitzung in die Handschrift übernehmen?" Yes. Each Trieb exports as MIDI and, through its Abdruck, as a WAV take (`encodeWav` exists (V)).

---

## 7. What is new

Compared with the ≈ 40 devices in loopers.md and the systems in intelligence.md:

1. **Auslese.** A live loop built from the consensus of your repetitions. Retrospective loopers take the last cycle; DAWs comp by hand.
2. **The Wurf.** The seeded chance of physical models becomes a register of variation, and Lob keeps a lucky pass exactly. No looper re-performs physical models with reproducible chance.
3. **Klangverwandtschaft.** Accompaniment voiced by roughness in the actual sources' spectra and Myzel's scales. Sethares' theory exists; we know of no looper or accompanist that uses it.
4. **Wiederkehr.** Somax-style activation for whole loops: recapitulation that emerges from your motifs.
5. **Vorahnung in the playing surface.** Plans germinate in the pitch column where they will sound. ReaLJam and Agents in Concert use a separate display.
6. **Handschrift as the prior.** The cold start is solved by your own past: local, forgettable, and with no neural checkpoint.
7. **Embodied initiative.** Ladung lends Eigensinn that drains over bars, and Träumen is a way to end.
8. **Puls lernt deine Schleife.** A Euclidean sequencer fitted to your loop, which then carries it on generatively.

---

## 8. How we will know it is musical

- **Deterministic tests** (seeded, `dev/tests`):
  - tempo and bar inference on 40+ free takes by the owner (top-1 and top-3, octave errors counted);
  - loop-close error in ms;
  - Auslese on takes with injected slips (slips removed, groove correlation ≥ 0.9 (A target));
  - 100 % scale conformity;
  - variation distances (degree edits, onsets, pitch-class histogram) inside a band per Eigensinn step;
  - MaxOrder ≤ 6;
  - Treu with a fixed Wurf renders bit-identically offline for worklet sources;
  - under 20 ms of analysis per Ernten on a mid-range Android, no dropouts, and the voice load per Trieb.
- **Wizard-of-Oz before code:** for each co-player behaviour, the owner jams while a scripted or human „looper" plays it. Only what he wants back gets built.
- **The owner's blind A/B listening** is the binding test: the Eigensinn steps, Auslese against the last take, Klangverwandtschaft against plain triads.
- **In the instrument:** a local log of Lob, Nein, Anker and time per Eigensinn step, exportable on request.
  - A high Nein rate for one operator is a defect report.
  - Acceptance follows Rowe's rule: whatever you play to it, it does something reasonable.
- **Weeks of use**, with FSS-2 flow items and four questions after jams: Did it listen? Could you predict it? Were you in control? Was it boring?

---

## 9. Feasibility sketch

- **Recording** (main thread): wrappers at `onDown/moveTouch/onUp` and `playNote/hit` (V, code-map §1.7). The event ring takes about 100–300 KB (A). A retroactive *audio* ring (32–64 s, 12–25 MB (V code-map)) is needed only if retroactive Schleifen are wanted.
- **Playback:**
  - `hrTick(horizon)` runs in `tick()` beside `seqTick` and calls `playNote/hit` at exact future times (V: both take `t`).
  - The horizon is at most 0.35 s (V), so a longer main-thread stall drops Gespielt notes, as it does for the Puls. An Abdruck plays on the audio thread and survives.
- **Analysis** (main thread or Blob Worker), applied at the next bar; target < 20 ms per capture (A).
- **Audio:**
  - one lazily loaded worklet processor, `myzel-ring`, records the Trieb buses into preallocated buffers and plays Abdrücke and Schleifen with seam crossfades;
  - its measured cost enters `voiceLoad()`, like the Gespinst web's (V precedent);
  - memory is 384 KB/s in stereo float (V), so an 8-bar Abdruck at 92 BPM takes about 8 MB.
- **Seeds:** worklet sources take seeds today (V `wkSeed`). Native sources need a seeded `rnd()` per voice in their start code; the file has 177 `Math.random` calls (V), and how many sit inside engines was not counted (A).
- **Storage:** IndexedDB `myzel` v2 with the stores `triebe` and `handschrift` (A).
- **Size:** about 2,500–3,500 lines, roughly 70–110 KB (A).
- **Stages** (the co-player stages each only after their Wizard-of-Oz test):
  1. Ernten, Takt finden, Auslese, scale following, groove, Abdruck, the mixer strip, the MIDI targets, the Wurf.
  2. Eigensinn up to Variieren, Vorahnung, Lob/Nein, Rollen, „Puls lernt".
  3. Antworten, Begleiten, Wiederkehr, Handschrift, Träumen.

---

## 10. Risks, honest limits, questions for the owner

**Limits**
- **Voices.** Gespielt Triebe cost voices at full engine quality. Two Triebe of three Harz voices each take 10.3 of the phone's 14 units (V `VCOST1`, `VBUDGET`). Live notes must keep priority.
- **Inference is ambiguous.** Octave errors will happen, so the tag swipe is part of the feature.
- **Form.** Beyond scenes, Reihen and Wiederkehr, the looper plans no song. Answers are locally plausible but globally aimless.
- **Harmony** is scale-field harmony: correct, sometimes plain.
- **Shared state** makes Treu near-exact, not exact. A Gespinst Trieb's Abdruck holds only its dry voices.
- **Platforms.** The iPad has no Web MIDI; the claude.ai view blocks mic and motion and may lack storage (V code-map §7).
- **Effort.** Seeding the native sources touches many engines, and Klangverwandtschaft needs measured partial tables.

**Questions for you**
1. **Voice budget.** May an unchanged Treu Trieb play its Abdruck – the real pass, recorded at full quality, but frozen – to free voices? Automatically, or only when you switch it? Or should every Trieb always be re-performed, accepting fewer layers on the phone?
2. **Tempo changes with audio Schleifen.** Lock the tempo, repitch them (varispeed), or time-stretch them (a sound-quality decision)?
3. **Order.** Service intelligence first, and the co-player only after Wizard-of-Oz tests?
4. **Default Eigensinn.** Lebendig or Treu?
5. **Handschrift.** On by default with an opt-in per session, or off?
6. **Extras.** Do you want Ladung → Eigensinn, and Träumen?
7. **Names.** Do Hexenring, Trieb, Abdruck, Ernten, Auslese, Eigensinn, Wurf, Vorahnung, Wiederkehr, Handschrift and Träumen fit?
8. **The Fährte.** Retire its button and convert old Fährte loops into Trieb layers?
