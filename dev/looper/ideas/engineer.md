# Hexenring – the engineer's proposal

Stance: the engineer who has to make the looper *solid*, and musically excellent at the same time. **(V)** marks what I
verified in this session; **(A)** marks an assumption that still needs a phone. The setup was headless Chromium on a
4-core Xeon at 2.1 GHz, slot `eng`; the scripts are in
`/tmp/claude-0/-home-user-4claude/31b62666-e283-5142-ac94-5f41b61da83b/scratchpad/eng/`. Code names refer to
`myzel/index.html` (search by name).

---

## 1. The idea in one paragraph

A fairy ring („Hexenring“) is the trace of a mycelium growing from one centre. It repeats, yet every year it is a new
generation of mushrooms. That is this looper.

**Every pass you play is captured twice, sample-aligned:**
- as the exact sound, the *Abdruck* (like a spore print);
- as the score that made it: the notes, each with its own random seed.

A Schleife can repeat its Abdruck bit for bit, or *grow again* from its notes every pass (*Wuchs*). In Wuchs, the same
engines re-play the notes, **rendered ahead of time on a background thread at the best quality level**. Ten living layers
therefore take no voice from the live playing.

**Wildwuchs** is one dial per Schleife. It goes from "identical every time" (same seeds: the same Gong shimmer, the same
Rhizom avalanche) to "a new generation every pass", always breathing back towards the original.

Because the score exists, a tempo or key change never stretches audio. The Schleife re-grows at the new tempo, in the new
key, with the same musical decisions. Nothing is missed: the *Humus* holds the last minute of audio, notes and movement.
Every seam is *placed* where the music allows and *joined* by a measured law.

The musician gets what loopers promise and seldom keep: exact when you need to trust it, alive when you want an ecology,
never wrong in time.

## 2. Names

| Name | What it is |
|---|---|
| **Hexenring** | The looper: button, mixer channel, panel section. Never shortened to „Ring“, the ring modulator's name. |
| **Schleife** | One loop: one length, its Schichten, its mode. Gestik §11 reserves the word for audio loops, and every Schleife here has audio. |
| **Kranz** | The row of Schleifen, drawn as small rings along the field's top edge |
| **Schicht** | One layer: the first pass or one overdub, kept as a delta |
| **Abdruck** | Playback mode: the exact recorded sound |
| **Wuchs** | Playback mode: re-grown from the notes every pass, rendered ahead |
| **Wildwuchs** | 0–100 %: the share of notes that grow anew each pass |
| **Humus** | The always-on memory: 64 s of audio, 2 min of notes and movement |
| **Heben** | Lifting what you just played out of the Humus into a Schleife |
| **Naht** | A seam |
| **Fährte** | A Schleife's movement layer: Gestik, knobs, faders. The old Fährte lives on here. |
| **Verblassen / Abnutzung** | Fade per pass / wear per pass (darker, softer). Both stay reversible until merged. |
| **Sediment** | Old Schichten merged exactly into one, to free memory |
| **Takt** | The shared beat clock that never jumps (from `faeClock`) |

## 3. How it plays

### 3.1 The first minute, phone alone
1. **Sound on.** The Hexenring button replaces `#btnFae` and is **always visible**. Its rim shows the bar phase, so the
   grid is visible before any loop exists.
2. **Play a figure, then tap: Heben.** The phrase you just played becomes a Schleife.
   - It closes at the end of the bar you are in. A tap within ¼ bar after a bar line closes at that line (heard time,
     `heardT`).
   - While the bar still has to finish, the rim counts down. A second tap cancels.
   - The length comes from the notes: back to the first onset after a rest, rounded to 1/2/4/8 bars. The toast offers ×2
     and ÷2.
   - Without the Puls and without a Schleife, the tempo is inferred from the notes (intelligence §5.1a) and becomes the
     Takt.
3. **The Schleife plays its Abdruck at once,** as the next pass of what you heard. It appears in the Kranz.

### 3.2 Gestures

| Where | Gesture | Effect |
|---|---|---|
| Button | tap | Heben |
| Button | hold | Records while held: from the bar line before the press (taken from the Humus, so the pick-up is included) to the bar line after release. Free length without a clock. |
| Ring | tap | Mute or unmute at its next Naht. The pending action is shown. |
| Ring | hold | Overdub while held. Punch in and out in heard time, never quantised (SooperLooper's rule). |
| Ring | double tap | Undo the last Schicht (redo is in the toast). Also cancels a pending action. |
| Ring | swipe up | The card: Abdruck/Wuchs, Wildwuchs, Verblassen, Abnutzung, ×2 ÷2, key and sound following, sources, tempo behaviour, export, delete with undo |
| Ring onto ring | drag | Merge: it becomes a Schicht of the other ring |
| Stille | – | Every Schleife falls silent with a 10-ms fade. The buffers stay; the button brings them back at the next bar. This fixes Fährte defect E. |

No gesture takes Wenden, Schütteln or Ruhe. Zuweisen can bind them to `hex.*` like any pad.

### 3.3 MIDI keyboard, PC
- **Targets:**
  - `hex.heben` (tap/hold; learned as momentary, like `fae` in `learnDone`);
  - `hex.dub` (momentary);
  - `hex.undo`, `hex.stumm.1–8`, `hex.wahl±`, `hex.stopp`.
- **nanoKONTROL2** (free keys today): ◀◀ undo, ▶▶ Heben, SET dub, R1/R2/R8 mute rings 1–3.
- **microKEY:** the sustain jack, through Zuweisen, is a foot switch (tap = Heben, hold = dub).
- **PC:** Enter = Heben, Backspace = undo.
- Old `fae` pads map onto `hex.*`.

### 3.4 Seams and grid, as the player hears them
**Seams.**
- A Gong ringing past the bar line rings on into the next pass.
- A held note is not struck again.
- A drone has no dip.
- How this works: §7.4.

**Grid.**
- The grid belongs to the running Puls or an external clock; otherwise to the first Schleife.
- Once Schleifen exist, a Puls start *joins their grid* at the next bar line. Today the Fährte instead shifts its loops by
  up to half a bar (Fährte defect 3.11).

**Lengths.**
- Later Schleifen take ×1–8 or ½, ¼ of the bar and lock sample-exactly.
- Any Schleife can be *frei*: its own length, drifting against the others (Eno, Reich).

## 4. What it records and how it plays back

### 4.1 One pass, captured twice
| Part | Content | Size |
|---|---|---|
| Abdruck | stereo audio of the chosen sources, plus margins: pre-roll from the Humus, continuation after the end | 384 KB/s (Float32) |
| Notes | **at the voice layer**: every `playNote`/`hit` call (time, engine, f, y, velocity, pan, gate, burst, bend, strip) and the voice's later `setF`/`setY`/`release`. Each note also has its degree, octave, layer ratio and **seed**. Engine knobs: a snapshot plus changes. | ≈ 30–60 B per event |
| Fährte | mod-layer and knob lanes, as **absolute** values | ≈ 600 B per lane and bar |
| Takt | tempo, beats, phase, cut offset | – |

The voice layer sees every source (code-map §1.7): fingers, keys, MIDI/MPE, Ebene 2, Puls lanes, Sporenregen, Rassel,
Wirbel and strum. Rhizom's cascades and Körner's grains are regrown from their voice's seed. Library previews are skipped.

### 4.2 Where the sound is tapped
```
voices ─► strips fin · eb2 · rgn · gsp (· l0–l3 · bor) ─[pre-Pumpen tap: „Gespielt“]─┐
A.masterSum ─────────────────────────────────────────────[tap: „Alles“]─────────────┤
mic (measured round trip subtracted) ─────────────────────[tap: „Mikro“]────────────┤
                                                                                    ▼
Wuchs renderer (OfflineAudioContext, own thread) ══MessageChannel══►  myzel-ring
                                                         out0 ─► strip „Hexenring“ ─► chain, sends ─► A.masterSum
                                                         out1 ─► A.ringSum ─► joins the master input (not re-captured)
```

**„Gespielt“** (the default, „only what you play“)
- Each source strip is tapped after its EQ, width and fader, before Pumpen and mute.
- Playback runs through the strip „Hexenring“ (route `fx`). It passes the live insert chain and the sends the way the
  original did, so nothing is processed twice.
- The ring's own strip is not an input, so an overdub never feeds back.
- Echo and hall stay live, so their tails cross every seam naturally.
- The Puls and the Bordun keep running and are left out unless chosen.

**„Alles“** (resampling)
- Taps the pre-master sum: the effects, the Puls and the other Schleifen.
- Plays back after the sum. The master applies once.

**„Mikro“**
- The mic is shifted by the measured round trip, with echo cancellation off.

### 4.3 Playback modes
| Mode | Sound | Follows | Live cost |
|---|---|---|---|
| **Abdruck** (default: what loops is what you heard) | bit-exact | – (tempo: §4.4) | ≈ 0.13 units per Schicht (V) |
| **Wuchs** | the same engines re-playing the notes ≈ 1 s ahead, at the best level the device sustains | key, tempo, sound (within ≈ 1 s) | **0 voices** (background thread) |
| **Live** | real voices scheduled by `tick()`, like the Puls | at once: knobs, Gestik on held notes, MIDI out | the notes' VCOST |

**Switching** between modes happens at a Naht, with a crossfade.

**Wildwuchs** works per pass:
- Each note gets a fresh seed with probability *w*.
- A changed note returns to its first seed with probability *r* („Rückkehr“).
- „Behalten“ makes the current pass the new anchor.

This is the substrate the co-player intelligence needs (intelligence §5.3): variations rendered ahead, never on the live
budget.

### 4.4 Tempo, key, sound – owner's rule: re-play rather than stretch, and flag every stretch
| Change | Wuchs | Abdruck *with* notes | Abdruck without notes (Alles, Mikro) |
|---|---|---|---|
| MIDI-clock wander < 0.5 % | follows | original speed, re-phased at each Naht to ≤ ½ frame (V) | same |
| Tempo change | re-grows at the new tempo (times in beats, tails physical) | **becomes Wuchs with the same seeds** at the next Naht (the same performance, new tempo); back to the print when the tempo returns | **decision:** keep its tempo / Band (pitch follows) / Schnitt (onset slices re-placed) / Dehnen (best stretch) |
| Key | re-mapped by degree: diatonic, transposed or fixed (intelligence §5.1d) | becomes Wuchs | stays |
| Source | „eigener Klang“ (default) or „folgt dem Klang“ | stays | stays |

## 5. Musical depth

- **Abdruck as tape:**
  - speed with inertia, in octave and fifth steps (pitch coupled; windowed-sinc polyphase resampler);
  - reverse at the Naht, Stopper (tape stop as a cadence), Trimmer (a loop inside the loop);
  - Dropper and Scrambler cut **at the recorded onsets**, each cut with a micro-fade;
  - Verblassen (Frippertronics) and Abnutzung (Basinski), both reversible.
- **Notes:**
  - transposition by scale degree, another engine, thinning or filling;
  - tighten or loosen towards your own groove template; retrograde and inversion in the scale;
  - Wildwuchs;
  - „Erstarren“ freezes a Wuchs pass into a new Abdruck.
- **Form:**
  - lengths ×3 or ×5 for polymeter; *frei* rings for phasing;
  - scenes A/B hold each ring's mute, level and Wildwuchs, and the morph crossfades them;
  - series (a ring follows another after N passes);
  - momentary rings.
- **The instrument:**
  - *Schlafen*: rings fade with the cadence or freeze into the echo.
  - *Puls*: „Puls festhalten“ records lanes as notes, so one Euclidean moment stays.
  - *Sporenregen* and *Rassel*: their strikes are ordinary notes.
  - *Gespinst*: the Hexenring strip can send into the web, so loops make the strings ring.
  - *Gestik*: new Formen targets (ring speed, Wildwuchs, Abnutzung) – deflections only.
  - *Presets*: they reference ring sets.
- **Intelligence:**
  - from v1, as a service: bar and tempo inference, phrase detection, „du wiederholst dich – schließen?“, choosing the
    seam;
  - later, as a co-player behind an Eigensinn control, on the same notes and the same renderer.

## 6. What is new

1. **Dual capture you can switch, both ways.**
   - Ableton Capture + Freeze, the Deluge and the Octatrack keep *one* of the two forms.
   - Here every Schicht has both, aligned.
2. **Living loops rendered ahead.**
   - Physical models are re-performed every pass at the top level, on a background thread, at zero live-voice cost.
   - We found no looper that does this.
   - It dissolves the owner's dilemma (event loops cost voices; audio loops cannot follow) for every source that renders
     faster than real time.
3. **Per-note seeded determinism.**
   - One dial from identical to new, with an elastic return.
4. **Seams by construction.**
   - Wuchs passes overlap like a real performance.
   - Abdruck seams are placed from the notes and joined by a law chosen from the measured material.
   - Elsewhere the user picks a crossfade length.
5. **A tempo change is answered by re-performance, not by stretching.**
6. **Retroactive capture of audio, notes and movement together,** with the length inferred from the phrase.

## 7. Feasibility: the architecture

### 7.1 Threads
| Thread | Does | Must never |
|---|---|---|
| Audio, real time (`myzel-ring`) | capture, Humus, Schichten, Nähte, clock segments, meters, Wuchs queues | allocate; wait for the main thread; decide musically |
| Main | notes and Fährte recording, Takt, UI, Live mode (`tick`), choosing seams, IndexedDB, building Wuchs voices | be on the playback path |
| Wuchs (OfflineAudioContext) | renders the voices of the next ≈ 1 s, paced | run without a pass to fall back on |

`myzel-ring` is registered in `myzelDsp` (`ensureDSP`). It loads with the first worklet engine or the first Heben, for
the same reason as the tap: the thread move on Safari and Chrome-in-iframe. The notes Humus runs on the main thread and
is always on. Even before the worklet exists, Heben can re-grow a phrase from its notes.

### 7.2 Takt: one clock that never jumps
- **Shape:** `faeClock` becomes `Takt`, a continuous piecewise-linear beat(t). A new segment starts at a future frame
  with the old beat there; only the slope changes.
- **Phase corrections** – from the MIDI-clock PLL, whose `clkFollow` re-anchors `SEQ` on every pulse – become slews
  over at least one beat.
- **On the audio thread:** the segments `{f, b, fpb}` reach `myzel-ring` ahead of time. Pass *k* starts at
  `round(frameAt(b0 + k·beats))`, computed afresh each time, never counted.
- **(V)** One hour, 631 passes, a tempo change and 20 minutes of ±0.2 % wander (2,402 segments): every pass started
  within **±0.499 frames** of the exact bar line, and **0** frames inside the passes were wrong.
  - A naive integer counter: 57 frames (1.2 ms) late after 20 minutes at a constant tempo, then lost at the tempo change.
  - The hour renders in 23 s, which is fast enough for every test run (`e4-drift.js`).
- **External Start/SPP:** the rings re-phase at their next Naht with one crossfade, and a toast says so.

### 7.3 `myzel-ring`
- **Inputs:** up to 11 stereo inputs (9 strip taps, the sum, the mic); a mask per Schleife chooses them.
  - **(V)** Capturing 9 stereo inputs costs ≈ 0.40 Nebel units (prototype, `e3-cost.js`).
- **Tape of chunks:** 8,192-frame stereo chunks, allocated on the main thread and transferred in.
  - The Humus is a ring of chunks. Heben **pins** the window's chunks: no copy.
  - Backups are copies into scratch buffers the main thread supplied, so the audio thread never allocates.
  - The processor counts frames itself, as `TAP_SRC` does (`currentFrame` can stall in Chromium).
- **Layers as deltas:** a Schicht is a list of chunk references with gain, age, wear state and mute.
  - Undo removes a Schicht with a 10-ms smooth fade. The undo depth is limited only by the memory cap.
  - **(V)** ≈ 0.13 units per playing stereo Schicht; 16 Schichten plus capture ≈ 2.5 units.
- **Feedback:** Verblassen is a gain fbᵃᵍᵉ per Schicht, computed rather than re-written. 100 % stays exact in float; a
  headroom meter watches level creep.
- **Sediment:** Schichten with the same decay sum into one that keeps decaying the same way. This is exact up to float
  rounding. Abnutzung, applied as one identical filter stage per pass, merges exactly too.
  - Endless Frippertronics stays bounded: 16 undoable Schichten + 1 Sediment ≈ 50 MB for a 7.7-s Schleife.
- **Outputs:** out0 (dry captures) goes to the Hexenring strip; out1 („Alles“) goes to `A.ringSum`. Each Schleife has
  its own level and pan.
- **Cost:** counted in `voiceLoad()` while rings play, like `A.gsp.cost`.

### 7.4 Nähte
**Placing the cut (Nahtwahl).** The Schleife's *musical* phase stays on the bar line, but the *buffer* is cut where the
margins allow (± ½ bar). The cut point is where energy is low and both sides match. Cuts are forbidden from 5 ms before an
onset to 60 ms after it; the notes give the onsets exactly.

**Joining.** At the end of every pass the looper played, that pass's recorded continuation meets the next start:
- **cold start** (the start holds no ring-in, measured ≥ 10 dB below the continuation): **overlap-add** the whole
  continuation – `foldTail`, done per pass;
- **warm start** (the player was already playing before the window): a smooth equal-power crossfade of 10–40 ms. Its
  law moves towards equal gain as the measured correlation rises.

**First-pass rule.** At the end of the *recorded* pass the live voices are still ringing, so the looper adds nothing. The
continuation joins from the second Naht on. The bar recorder could ignore this, because takes are heard later.

**Foreign onsets.** A continuation ends at the first foreign onset, with a 30-ms fade. For Schichten with notes, the rest
of the tail is rendered from the loop's own notes.

**(V) Clicks** (`e10-click.js`). Test signal: a sine with a non-integer number of cycles per pass, plus 30 Hz. Measure:
the 3rd-difference peak at the seam against mid-pass.

| Join at the seam | Peak against mid-pass |
|---|---|
| hard cut | 18,000× (+6.9 dB above the signal) |
| sin/cos crossfade, 10 ms | 4.6× |
| **smooth equal-power**, `g = sin/cos(π/2·(1 − cos πx)/2)`, 10 ms | **1.2×** |
| smooth equal-power, 40 ms | 1.0× |

That law serves every Naht, mute, undo, punch and mode switch.

### 7.5 The Wuchs renderer
- **The context:** one OfflineAudioContext per Wuchs Schleife, per pass or per few passes.
  - **(V)** A new context plus the 227-KB engine module costs 23–33 ms (`e7-setup.js`).
- **A lean graph:** voices, offline copies of their source strips, a sink. The chain, echo, hall and master stay live.
- **Building voices:** through `calibrate()`'s synchronous context swap (`A.ctx`, `pitchMod`, `notePitch`, `Q`).
  - `grainTick` and `rhzRun` run in virtual time.
  - Releases and moves need an `at` time; today they act at `currentTime`.
- **Pacing:** suspends every 0.25 s keep the render ≈ 1 s ahead of real time, and changes apply from the suspend's
  frame.
  - **(V)** Measured (`e2-stream.js`):
    - blocks arrive while it renders;
    - 40 suspends add no measurable time;
    - the lead held ≤ 1.25 s against a 1.0-s target;
    - a change was exact from its frame.
- **Transport:** a MessageChannel transferred into both worklets.
  - **(V)** 703 of 703 blocks arrived worklet to worklet, 85 of them during a 600-ms block of the main thread
    (`e9-direct.js`).
- **Late blocks:** the previous pass plays at that position (crossfaded) and the miss is counted. There is never a gap.
- **Speed (V, `e1-render.js`)**, for a 2-bar pass at 84 BPM (22 notes with chords, level 3):
  - the voices render at 0.04× real time (Sehne, Halm) to 0.21× (Gong), i.e. 6.5–31 Nebel units on average (one Nebel
    unit here = 6.7 ms per voice-second);
  - the full Myzel graph would add 0.115×, which is why the renderer builds a lean one;
  - render time = load × `CAL.unit` × duration, so each device predicts its own from its calibration;
  - a Schleife that cannot keep up stays Abdruck, and its sound is never reduced.
- **Other threads:**
  - **(V)** A heavy offline render left a live worklet undisturbed: its largest gap between callbacks was 21 ms, against
    45 ms without the render, and it never lagged (`e2b-contend.js`).
  - **(A)** On big.LITTLE phones the render may land on a slow core.
- **Delta re-growth** (low Wildwuchs): new pass = last pass − the old versions of the changed notes + their new versions.
  - **(V)** Superposition holds to −104…−122 dB (`e8-determ.js`).

### 7.6 Seeded randomness
- **Plan:** of the file's 177 `Math.random` calls, those in voice paths (`rand`, `pick`, human jitter, pan, `wkSeed`,
  grains, Rhizom, Puls walk) go through an `RNG` indirection. While a voice starts, and during its later work, `RNG` is that voice's
  PRNG, seeded from its note. The worklet processors already use seeded PRNGs.
- **(V)** Same seeds, same block alignment: re-renders agree to −108…−144 dB. That is not bit-exact, but far below
  hearing.
- **(V)** The same notes 37 frames off the 128-frame grid differ by only −9…−38 dB. k-rate parameters and the phase of
  the shared LFOs matter.
  - So each Wuchs pass starts at frame 0 of its context, with the shared modulators at a fixed phase. Identity then
    holds by construction.
- **(V)** Shared random tables created lazily at the first note broke superposition entirely (0…+5 dB).
  - Rule: build them at init, from fixed seeds.
  - Körner's textures, generated asynchronously, need the same.

### 7.7 Latency
- **Internal capture needs no compensation.** The loop replays what was rendered, at the same clock position, through
  the same chain, so it lands exactly where the original was heard. Compensating would be the classic double
  compensation.
- **Notes are stamped at render time.**
  - **(V)** `start(currentTime)` from the main thread began exactly at `round(currentTime·SR)` in 55–59 of 60 cases
    (two runs), the rest 384 frames (8.7 ms) late. Scheduled ahead: 60 of 60 exact (`e5-stamp.js`).
  - The Abdruck is the authority; Wuchs replays without that jitter.
- **Heben and punch** are read in heard time, with a ¼-bar tolerance at bar lines. Touch latency (≈ 30–80 ms,
  unmeasured) cannot flip a bar.
- **Mic:** a loopback click measures the round trip (the `gkKlopf` precedent) per output device. With
  `outputLatency` > 100 ms (Bluetooth), mic overdub is refused, with the reason.
- **Fährte:** `faeShift` as today.

### 7.8 Voice budget
- **`myzel-ring`:** ≈ 0.4 units + 0.13 per Schicht (V, prototype; to be measured on the owner's phones).
- **Wuchs:** 0.
- **Live:** the honest VCOST of its notes.
  - Loop voices are stolen before fingers (`v.loop`, soft `vFade`).
  - If they do not fit, the card suggests Wuchs: the same sound.

### 7.9 Memory and format
- **Rate:** Float32 stereo is 384 KB/s.
- **A typical evening:**

  | Part | Size |
  |---|---|
  | 6 Schleifen × 4 Schichten × 7.7 s | ≈ 71 MB |
  | Humus | 25 MB |
  | Wuchs queues | 3 MB |
  | **Total** | **≈ 100 MB** |

- **Cap:** 300 MB, adjustable. When it is reached, the looper offers Sediment.
- **(V) Formats** on real Myzel audio: Gong, Glocke and Harz at level 3 with hall, analysed in 256-frame blocks
  (`e6-format.js`).

| Format | B/frame | Error floor | Worst block |
|---|---|---|---|
| Float32 | 8 | – | exact |
| Int16 + TPDF | 4 | −96.3 dBFS | **−4 dB SNR** in quiet tails |
| Int24 | 6 | −144.5 dBFS | 43 dB SNR |
| **Block-float Int16** (power-of-two scale per 256 frames) | 4.008 | −111…−112 dBFS | **79–80 dB SNR in every block** |

- **Recommendation:** Float32. Block-float Int16 halves the memory and stays ≥ 79 dB below the signal everywhere; it is
  used only with the owner's consent.

### 7.10 Persistence, background, lifecycle
- **IndexedDB `myzel` v2:**
  - adds the stores `rings` (metadata, notes, seeds, Fährte, Takt, seam parameters) and `ringsegs` (audio chunks);
  - `onupgradeneeded` creates only the missing stores, and `restoreTakes` skips them;
  - writes happen incrementally, after each Schicht;
  - a reload or crash ends with „Hexenring wiederhergestellt“;
  - if storage fails (`IDB.failed`), the rings stay in RAM, and the app says so.
- **Presets and scenes** reference ring sets.
- **Export:** WAV through the takes pipeline; the notes as a MIDI file; the whole set as a ZIP.
- **Visibility:** „Hexenring plays or records“ joins the visibility keep-alive.
  - The Abdruck lives on the audio thread, beyond any timer throttling.
  - Wuchs falls back to the last pass.
  - Fährte lanes on AudioParams are laid one whole pass ahead as curves, so stalls up to a pass are bridged. Today the
    limit is 0.4 s (defect L).
- **Interruptions:** everything lives in audio time, so after an OS interruption the rings resume in phase.
- **(A)** On a locked screen, iOS PWAs may stop audio; Android Chrome keeps a playing context running.
- **Lifecycle:** Stille, Schlafen, `applyQuality`, `restartAudio` (persist first) and scene changes each get a defined
  behaviour.

### 7.11 Migrating the Fährte
1. **Recording:** the always-on lane recording becomes the movement part of the Humus. Heben copies the window into the
   Fährte layer:
   - as absolute values (fixes G);
   - resynced on `loadValues` (fixes D).
2. **Clock:** `faeClock` becomes the Takt. Instead of `faeAlign`'s silent jump, the Puls joins the grid.
3. **Controls:**
   - `#btnFae` and its panel section go.
   - `fae`/`fae.take` → `hex.heben`, `fae.rec` → `hex.dub`, `fae.clear` → `hex.undo`.
   - „Hinlegen wird Schleife“ becomes a Zuweisen option for Ruhe.
4. **Old presets:** format-2 presets and scenes with a `fae` loop import as a Schleife holding only its Fährte layer.
5. **Tests:** the 137 `t-gf-*` checks are ported.

### 7.12 Test plan (automated: Playwright + offline renders)
| Proves | How | Pass |
|---|---|---|
| Exact Nähte, no drift | **Setup:** layers whose samples hold their own index; an independent checker processor. **Run:** 1 h with tempo changes, wander and recorded real MIDI-clock logs (E4). | starts ≤ ½ frame, 0 wrong frames |
| No clicks | **Material:** non-integer cycles, 30 Hz, DC, transients at the cut. **Where:** every Naht, punch, mute, undo and mode switch. **Detector:** 3rd difference (E10). **By ear:** the owner's ABX on WAVs. | ≤ 1.5× mid-pass |
| Capture aligned | a Puls impulse lane captured and replayed against the live Puls | ≤ 1 frame |
| No stuck notes | fuzz Heben, dub, undo, mute, Stille, scenes, tempo, presets, Schlafen and hidden page, then Stille | `A.voices.size === 0`; every note-on has its release |
| Determinism | double renders and superposition (E8) | ≤ −100 dB |
| Wuchs under load | a throttled CPU and a 2-s stall | no gap, misses counted |
| Memory | 30 min of overdub at 0.85 | bounded; Sediment null test ≤ −120 dB |
| Persistence | reload mid-dub; a full quota | restored bit-exact |
| Mic | a DelayNode in place of the air, then devices | ±1 ms |
| Cost | `cost.js` on the owner's phones | entered in `voiceLoad` |

### 7.13 Build order
0. **Measuring day on the owner's phones:**
   - Wuchs throughput;
   - Safari offline rendering with a worklet;
   - screen lock;
   - memory.
1. **Takt, `myzel-ring` and Abdruck:**
   - the Gespielt capture;
   - Heben, hold, dub, undo, mute;
   - Nähte, Humus, persistence, Stille;
   - tests E4 and E10.
2. **Notes and Wuchs:**
   - notes recorded at the voice layer, seeded RNG;
   - the Wuchs renderer and Wildwuchs;
   - following key and tempo;
   - the Fährte migration.
3. **The rest:**
   - tape gestures, slices, form;
   - Live mode and MIDI out;
   - Alles and Mikro;
   - export.
4. **Co-player intelligence**, as its own concept.

## 8. Risks, honest limits, questions

**Risks and limits**
- **The engines assume one live context.**
  - The swap works (calibrate, the test harness).
  - Every per-tick scheduler (grains, Rhizom, rolls) needs a virtual-time path, and releases and moves need an `at` time.
  - This is the biggest refactor; Phase 2 stands or falls with it.
- **Phone throughput is unmeasured.** My numbers come from a server core; a mid-range phone may be 2–4× slower (A).
  - Dense level-3 Gong passes may not fit on a slow phone; they then stay Abdruck.
- **Wuchs answers knob moves ≈ 1 s late**, the render lead. Live mode answers at once, at its voice cost.
- **Gespinst in Wuchs** rings from the loop's own notes only. Live, the web couples everything; the difference is
  audible only in the halo.
- **„Gespielt“ is post-fader:** a Schleife recorded with a closed fader is silent. The UI says so.
- **Pure audio (Alles, Mikro)** cannot follow a key change, and it follows tempo only by the method chosen in question 4.
- **Platform (A):**
  - A worklet that exists from the start moves Safari to the worklet thread.
  - iOS background audio and IndexedDB eviction are up to the browser.
- **Bit-exactness:** re-renders agree to −108 dB, not bit for bit. Only the Abdruck is exact.

**Questions for the owner**
1. Float32 (exact, ≈ 100 MB on a typical evening) or block-float Int16 (half the memory, ≥ 79 dB under the signal
   everywhere, measured)?
2. Should Wuchs render at level 3 when the phone plays live at level 1? It sounds better than what was played: a loop
   "blooms" as it switches from Abdruck to Wuchs.
3. After recording: Abdruck (trust) or Wuchs at Wildwuchs 0?
4. Pure audio loops at a tempo change: keep their tempo, Band, Schnitt or Dehnen?
5. Should the audio Humus be on from the first note (best capture; the thread move on iOS) or start with the first
   Heben? The notes Humus is always on.
6. A memory cap of 300 MB by default?
7. How many Live-mode voices may a Schleife take before the card recommends Wuchs?
8. Should the Fährte button go entirely, as the forensic report recommends?
