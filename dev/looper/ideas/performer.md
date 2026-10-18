# Hexenring – a looper you can trust for a whole set

*The performer's proposal.* I judge every idea by one question: would I risk it in front of an audience for a whole set, with a phone in one hand (or on a stand), maybe a nanoKEY Studio and a foot switch, and no second chance? **(V)** marks facts read in `myzel/index.html` or in the research. **(A)** marks assumptions to measure.

---

## 1. The idea in one paragraph

Hexenring never asks you to press anything *before* you play. It always listens, to the sound and to the notes, so a loop is something you **harvest** after it happened. You play your figure until it grooves and tap; the loop takes over seamlessly where your hands stop, and the tempo and bar come from what you played. **Every pass you play over a loop is a proposal:** tap after a good one and it becomes a layer, so a ruined overdub cannot happen. Each loop is kept twice:
- as its exact sound (**Abdruck**: the one-off breath of a Halm, the bloom of a Glut chord, a Rhizom avalanche);
- as the notes that made it (**Lebendig**: re-played by the engine, so it can change key or source, breathe, vary or answer you).

Form comes from playing: each Strang carries its own sound, sections are snapshots you mark while you build, the drop is turning the phone face down and back up, the ending is letting the ring wilt. Nothing is ever lost: undo is instant, a cleared loop falls into the Humus and can be dug out, a reload restores the set. The intelligence serves first (tempo, seams, scale) and plays along only as far as you allow, showing its plan a bar ahead.

---

## 2. Names

| Name | What it is | Why |
|---|---|---|
| **Hexenring** | the looper | A fairy ring: the mycelium grows outward in a circle, and the mushrooms return at the same place ring after ring. Repetition that grows. |
| **Schleife** | one loop | Reserved for audio loops (Gestik concept §11). |
| **Strang** (1–4, up to 6) | a loop track: one part, one sound | Mycelial cords (Myzelstränge) carry everything. |
| **Schicht** | one overdub layer | Soil layers. |
| **Ernten** | turn what you just played into a loop or a layer | You harvest what has grown. |
| **Humus** | the set's memory: the last 64 s of sound, all notes, every cleared Schleife | Nothing that falls is lost. |
| **Abdruck** / **Lebendig** | the exact sound / the notes re-played by the engine | A spore print identifies a mushroom exactly. |
| **Schub** (A, B, C …) | a section | Mushrooms come in flushes (Schübe) from the same mycelium. |
| **Kern**, **Lücke**, **Atempause** | the core Stränge; a hard gap before the 1; the face-down drop | |
| **Schluss**, **Welken** | stop with the tails ringing; dissolve over passes | |
| **Vorrang**, **Eigensinn** | how much loops make room for live playing; how much a loop may live on its own | |
| **Werkstatt** / **Bühne** | rehearsal / stage | „Probe“ is already the library preview. |

None of these appears in `index.html` today, except „Schicht“ inside the internal term „Mod-Schicht“ (V, grep).

---

## 3. How it plays

### 3.1 The strip: everything one thumb needs

Once the looper is on, a strip about 56 px high sits between the field and the tabs, under the left or the right thumb. Its icon in the bar replaces `#btnFae` and shows the main loop's phase.

```
[ ERNTEN · 2 T ]   (1)  (2)  (3)  (4)     A ▸ B     ● ○ ○ ○  91
```

- **Each ring is a Strang.** It shows:
  - the source's glyph in the centre (the sprite holds all of them, V);
  - the playhead, bar ticks and one thin inner ring per Schicht;
  - a state colour: dashed = empty, pulsing with a digit = waiting, red = recording, grey = muted;
  - a breathing glyph for Lebendig and a still one for Abdruck.
- **Under every ring, one word says what a tap does now:** „ernten“, „aufnehmen“, „schließen“, „stumm“ or „an“. This replaces the Fährte's hidden modes.
- **The beat dots and the tempo** are visible whenever a clock exists, with or without the Puls.

| On a ring | Does |
|---|---|
| tap | Empty: ernten (or arm a recording if nothing can be harvested). Recording: close. Playing: mute/unmute at the bar line, tails ring. |
| hold | While held: overdub (playing ring), or a free loop as long as the hold (empty ring) – SooperLooper's momentary command |
| hold ≥ 1 s on an empty ring, without playing | Count-in (visual; on Android also a vibration in the hand), then N bars from the 1; closes itself |
| swipe down / up | Undo / redo the last Schicht, at once, with a 30 ms fade |
| drag along the ring | Take the pass before, or nudge the phase |
| two-finger tap | Stop at the loop's end, tails ring |

**Strang wählt Klang.** Each Strang remembers its sound (source, Ebene 2, octave, a few knobs). Touching ring 2 switches the field to its Amöbe bass. For a soloist on a phone this matters more than any effect: four sounds in a song no longer means four trips into the library.

### 3.2 The first loop: harvest instead of count-in

The late first downbeat is looping's most frequent failure (`loopers.md` §3.11). Hexenring removes the moment where you have to hit anything:

1. **Just play.** The Humus keeps the looper input's last 64 s and every note with degree, velocity and timing.
2. **When you repeat a figure, the button lights up** with what it would take: „Ernten · 2 T · 91“. This is repetition and bar inference on exact note data (`intelligence.md` §5.1a–b), no audio analysis.
3. **Tap at any moment**, mid-phrase too. The Schleife is the last full cycle ending at the tap. It continues **phase-locked from now**, as if you had kept playing (Loopy's immediate retrospective mode). Stop on any beat; the loop carries on.
4. **For 8 s, chips correct it:** ÷2, ×2, ±1 Takt, „Runde davor“ (the cycle before) and „Eins ↔“ (move the downbeat). Octave errors in tempo will happen, so the fix takes one tap.
5. **The first loop sets the clock.** The Puls tempo and phase follow exactly (fractional BPM), and so does MIDI clock out.

The classic ways stay: hold for a count-in, or arm a recording that starts on your first note with pre-roll (the existing armed REC, V).

**With the Puls or MIDI clock running**, a harvest takes the last N bars *up to the bar line just heard, including the current bar*. A tap up to 200 ms late means that downbeat (`nextDownbeat`, V). This fixes the Fährte's „last completed bar“ window (forensic report C2).

### 3.3 Layers: every pass is a proposal

- **Ernten on a playing Strang:** the last cycle of live playing becomes a new Schicht, already aligned, because it was played against the loop. Jam freely and keep only the good pass.
- **Hold to overdub** gives the classic punch, with 10 ms crossfades at both ends.
- **Undo and redo act at once**, not at the loop's end: a wrong note repeating is the worst thing on stage.
  - Every Schicht is stored separately (its own level and mute in Werkstatt).
  - **Verdichten** bounces Schichten together.
- **Verblassen** (decay per pass, Frippertronics) is per Strang. The default is „nie“.
- **Clearing** sends a Schleife to the Humus, retrievable until the set ends.

### 3.4 Seams worthy of a Gong and a Glut

- **Ausklang:** what rings past the loop's end (a Moder swell, a Böe ghost chord, the hall) is taken from the Humus and folded onto the start from the second pass on. The notes say where to stop folding: at the first new note you play after closing. Only the old ring-out is folded, never your next phrase.
- **Auftakt:** a pickup played before the 1 is folded onto the loop's end, so „und-EINS“ melodies come round correctly (the Deluge's margins, made musical).
- **The crossfade fits the material:** about 5 ms for Zapfen clicks, 30–120 ms for wind and drones. On the grid the length never changes.
- **Lebendig:** a note held across the seam is tied, never re-struck, so a Glut keeps glowing.
- **Stopping never cuts a tail:** the stored Ausklang plays once after the last pass.
- **Mute** lets tails ring by default; the hard cut is the Lücke.

### 3.5 Tempo and bars

- **Puls or MIDI clock:** their grid; with MIDI clock each pass is re-phased at its start („play sync“), never stretched.
- **Nothing running:** the first harvest sets the clock (§3.2), or tap tempo plus a count-in.
- **Frei:** a Strang without grid, at its own length (Eno, Hainbach), turning at its own speed.

Takt Stränge are multiples of the first loop (×1, ×2, ×3, ×4, ×6, ½), so polymeter is one choice per Strang.

### 3.6 Form: sections, drops, builds, endings

- **Schübe are made while you play.** Build the verse, then long-press „A“: „Strophe gemerkt“. Mute the chords, harvest a melody, mark „B“. Tapping a chip switches at the next 1, with a countdown. A Schub may also recall mixer scene A or B.
- **Kern** drops to the core Stränge for a breakdown; the same action brings everything back on the 1.
- **Lücke** cuts all loops hard for the last beat or bar; they return on the 1 by themselves.
- **Atempause (Wenden):** turn the phone face down while loops run.
  - Following Schlafen's cadence, the loops end with their bar and breathe into the frozen echo and hall.
  - Turn it back up: the field counts „3 · 2 · 1“, and the Schub re-enters on the next downbeat of a clock that never stopped, with Schlafen's spore bloom.
  - Motion never sets the downbeat (Gestik rule 2); the grid does.
- **Builds:** a shake (Ladung) makes the Stränge that allow it boil for a few bars (§6.2), together with the Puls and filter that Ladung already drives.
- **Endings**, one action each:
  - **Schluss:** each Strang stops at its end and its tail rings;
  - **Welken:** level, brightness and pieces fall away over 4–16 passes (Basinski);
  - **Abbau:** one Strang drops per cycle, the last recorded first;
  - **Bandstopp:** a tape stop, as a Zuweisen target.
- **Bauplan** (set in Werkstatt), for hands-free building: „2 T Jahresring → 4 T Amöbe → 4 T Gespinst“. One tap starts a count-in. Then it records and switches Strang and sound at each bar line (Loopy's record chaining), with both hands on the field.

### 3.7 Control without looking

**Retroactive grace.** The Fährte delayed every tap by 400 ms to detect double taps (forensic report §3.7). Hexenring does not wait: what a harvest takes is fixed at the press, and the Humus holds it. A double tap can re-interpret the first press without audible loss; at most a new Schicht fades in 0.3 s later, at its right phase.

| Device | Grammar |
|---|---|
| **One foot switch** (sustain jack of the nanoKEY Studio or microKEY via Zuweisen; any MIDI pedal) | tap = Ernten · hold = record while held · double = undo (again = redo) · hold 2 s = Kern / all back |
| **Two switches** (Bluetooth page-turner: arrow or PageUp/Down keys) | A as above. B: tap = next Strang with its sound · double = next Schub · hold = Schluss |
| **nanoKEY Studio** | All 8 pads are taken (V). A chip „Pads: Spuren / Hexenring“ gives pads 1–4 Stränge, 5 Ernten, 6 Rückgängig, 7 Schub, **8 stays Stille**. |
| **nanoKONTROL2** | Free buttons (V): ◀◀ Rückgängig · ▶▶ Ernten · SET Lob · R1 Kern · R2 Lücke · R8 Schluss. A chip „Fader: Mixer / Hexenring“ puts Strang levels on faders 1–6. |
| **Computer keyboard** | The home row plays notes (V `KEYROW`). Space, the arrows and PageUp/Down act as pedals when no control has focus. |

The page-turner matters most on the iPad and iPhone: Safari has no Web MIDI (V), so a Bluetooth page-turner (a keyboard to the browser) is the only pedal there (A: device test). Every action is also a `midiTarget`. The `learnDone` momentary exception for `fae` (V) moves to the Hexenring targets.

### 3.8 Exit strategies

| What went wrong | One move |
|---|---|
| A bad overdub | Swipe down or double tap: gone at once. Redo if it was good after all. |
| A clam in the loop | „Runde davor“, or mute at the bar line and harvest again |
| Wrong tempo or length inferred | ÷2 / ×2 / ±1 Takt |
| The loop sits off the Puls | Drag along the ring: 5 ms steps or a whole beat |
| The whole thing is a mess | Kern, or an Atempause and a fresh start on the 1 |
| A loop was cleared by mistake | Bring it back from the Humus |
| Something is out of control | Stille stops the loops too (unlike the Fährte, forensic report E). The buffers stay; one tap restarts them. |
| A reload, a crash, a phone call | Schleifen are stored in IndexedDB as they are made and restored with their Schübe. Playing loops keep the context awake at screen lock (added to the visibility rule, V). |
| Bluetooth headphones | A warning above ≈ 80 ms output latency: playing in time over Bluetooth is unrealistic. |

### 3.9 Loops against live playing

- A loop returns at **the level it was heard**, with headroom for overdubs and only a transparent ceiling: no hidden squashing (owner's rule).
- **Vorrang** (off by default): while you play live, Stränge marked „Begleitung“ dip 0–6 dB (200 ms down, 1.5 s back), as a front-of-house engineer would do for a looping act.
- Each Strang has a level (vertical drag on its ring) and a pan. All Stränge sum into one mixer strip, „Hexenring“, with Pumpen, EQ, sends and solo.

### 3.10 Werkstatt, Bühne, and what is visible at a glance

- **Werkstatt** (rehearsal) edits everything:
  - windows, and the Humus as a 64-s timeline of sound and notes to dig out any moment;
  - per-Schicht levels, input, length and sound per Strang;
  - the Bauplan, named Schübe, the pedal map, Eigensinn, the co-player's suggestions;
  - „Lied speichern“.
- **Bühne** (stage) locks the layout:
  - the sheet opens only on a long press;
  - big rings and a small pedal legend;
  - no menus, few toasts, every action quantised and undoable, Stille always reachable.
  - **Setliste:** „nächstes Lied“ moves the Schleifen to the Humus and loads the next preset, tempo and template.
  - With a keyboard, a **ring view** replaces the field with large rings readable from 60 cm.
- **Always visible:** the beat and the 1, what each tap will do, every pending action with its countdown, the current and next Schub. Loop notes show as ghost glows on the field, distinct from live notes (Hexenring knows the notes even of Abdruck loops). This finally meets the Gestik concept's „was live ist und was Schleife“ (§4.4).

---

## 4. Three performances

**A · A five-minute song, phone alone in the left hand.** Lied „Laubhütte“: Strang 1 Jahresring, 2 Amöbe an octave down, 3 Gespinst, 4 Halm Flöte. No Puls.
- **0:00** A 2-bar Jahresring figure, rubato, then steady. On the third time round the button shows „2 T · 91“. My thumb taps on beat 3; the loop just continues and the beat dots appear.
- **0:25** Ring 2: the field becomes Amöbe. I find a 4-bar line, play it once cleanly, tap.
- **0:55** Ring 3, Gespinst chords. The first pass has a clam; the second is good: tap. I add harmonics; on the third pass the web blooms by itself: tap, Schicht 2.
- **1:30** Long press „A“. Then ring 3 mutes at the bar line, its halo ringing out. A Halm melody goes on ring 4. Long press „B“.
- **2:30** „A“: back to the verse at the next 1.
- **3:00** A two-second shake. The Amöbe (Lebendig, „Atmen“) roughens, the Jahresring stutters a few beats, the filter climbs. It settles over eight bars.
- **3:20** „B“, and on beat 3 of its last bar I turn the phone face down: two bars of frozen shimmer. I turn it back: „3 · 2 · 1“, and the chorus lands with a spore bloom.
- **4:20** Welken over eight passes, the Jahresring last. One live Kalimba note, then the phone face down.

„Set mitschneiden“ started the REC take with the first harvest.

**B · An ambient set, 30 minutes: microKEY Air, a foot switch on its sustain jack, the phone on a stand.** All Stränge are free; no Puls.
- I hold the pedal over a Böe chord: 13.2 s, 120 ms crossfade. Then a Glut swell of 17 s and Kehlchen calls of 23 s.
- Three incommensurable lengths make chords that form and dissolve (Eno's „2/1“). The ring view shows three rings turning at different speeds: phasing you can see.
- The Böe Strang has Verblassen 0.92 and a little wear, so every pass is a shade darker.
- The Glut Strang is Lebendig with tied seams, a drone that never repeats.
- I play over everything. A beautiful pass gets a pedal tap; a regret gets a double tap.
- At the end, a 2-s hold starts a one-minute Welken.

**C · A jam where the looper answers: PC, nanoKEY Studio, nanoKONTROL2, Puls at 104, MIDI clock out to a drum machine.**
- The Puls rolls a great 2-bar pattern. ▶▶ harvests it as Strang 1 (**Puls ernten**: Lebendig, fixed seed, exactly those hits). I raise the lanes' probability for a wilder live layer on top.
- A bass from the keys goes to Strang 2.
- Strang 4 is the **Mitspieler**, „Antworten“, voiced on Sehne. I play a 2-bar phrase and stop. At the bar line it answers from my own notes, with the contour kept and the degrees varied. Its notes glow on the field a bar ahead.
- I like an answer: SET = Lob, and it becomes the anchor. „Vierer tauschen“ alternates us every 4 bars; an arc on its ring shows whose turn it is.
- When I solo, „die anderen spielen“ thins my old melody layer and keeps the bass; when I stop, everything returns at the bar line.

---

## 5. What it records and how it plays back

**Input per Strang**, set by a chip. The Humus listens to the selected input:
- **Gespieltes** (default): the strips Klang, Ebene 2 and Regen, dry after their faders. The loop replays through the *live* echo and hall, so loops and hands share one room, and the self-looping Puls and Bordun are not doubled into it.
- **Alles:** the full mix before the master; the loop plays dry into the master, exactly as heard.
- **Wahl:** any strips, for example only the Puls lanes.

**Abdruck and Lebendig.** Every Schleife records the audio *and* the events of the same pass: notes with Höhe, bend and pressure over time, plus the Puls, Regen and Rassel hits.
- **Abdruck (default)** plays the audio. It needs almost no voice budget, so live playing never loses voices to loops.
- **Lebendig** re-plays the events through the engines: it follows the scale, swaps the source, varies and answers.
  - **Saat fest:** the same randomness every pass, so the same Rhizom avalanche.
  - **Saat frei:** the notes stay and the physics improvises.
- **Abdrucken** prints a Lebendig loop during its next pass and switches at the following 1. **Wiederbeleben** goes back. Both are lossless, because the events are always kept.

**Bewegung.** The Fährte's lanes (Gestik Formen, knob sweeps) can be kept with a take as a Schicht: same clock, cleared with it, no fade. In „Alles“ the sweep is already in the sound.

**Following changes:**
- **Key:** Lebendig follows (diatonic by default, transposed, or fixed). For „last chorus a step up“, Abdruck Stränge that carry events are re-played for one pass and printed again („umdrucken“). Mic Stränge stay, and the looper says so.
- **Tempo:** Lebendig follows. Abdruck locks the tempo control while it plays; varispeed exists only as an effect (Bandstopp).
- **Source:** a Lebendig Strang keeps its recorded source but reads that source's *current* knobs (A: engines read global params). The print freezes them.

**The sources in a loop: what a performer will notice**

| Sources | In a loop |
|---|---|
| Glut, Harz, Sehne E-Bow, Halm | Slow onsets and endless holds: Lebendig ties them across the seam. |
| Böe, Moder, Gong, Gespinst halo | Long tails: the Ausklang fold is essential, and stopping lets them ring. |
| Amöbe, Elmsfeuer, Rhizom | Never twice the same: Abdruck keeps the lucky pass, Saat frei makes a living part. |
| Zapfen, Jahresring, Membran | Tight grooves with short crossfades. A Lebendig Jahresring ages through its year, a 4-minute form of its own. |
| Kehlchen | Calls, made for call and response with yourself. |

---

## 6. Musical depth

### 6.1 Intelligence: helps, never steers unasked

**Service** is always on and never adds or removes a note (`intelligence.md` §5.1):
- repetition and bar/tempo inference with alternatives;
- edges snapped to your onsets;
- tied seams and tail folding guided by the notes;
- scale following and the groove template.

On request the Puls takes your loop's swing (groove transfer).

**Co-play** is set by Eigensinn per Strang, default 0 = Treu (scale from `intelligence.md` §4.2):
- **Atmen:** micro-timing from your own groove.
- **Variieren:** weak beats vary; strong beats and contour stay.
- **Antworten:** the Mitspieler answers in your gaps from your own notes (Continuator / factor oracle), and „die anderen spielen“ brings in the parts you are not playing.
- **Eigenwillig:** Voyager-like stances, pulled back elastically to the anchor.

**The performer's guardrails:**
- Changes only on bar lines, one Strang at a time.
- Nothing changes in the three passes after a recording or the bar before a Schub change.
- Every generated note is in the scale.
- The Mitspieler is silent until it has enough material.
- **Zurück** restores the anchor in one tap. **Lob** makes the current variant the anchor; **Nein** reverts it.
- **The plan is visible:** ghost notes a bar ahead, plus one word on the ring („hört“, „wartet“, „antwortet“).

Suggestions such as „Begleitung aus meiner Melodie“ (chords, bass, a Puls from your accents) appear only in Werkstatt, as muted ghost Stränge switched on one at a time. On stage, one learnable knob rides the Eigensinn levels you chose.

### 6.2 Ties into the instrument

- **Puls:** one shared clock that never jumps. Starting the Puls after a free loop starts it in phase (today `seqStart` re-anchors, V). **Puls ernten** freezes a lucky pass of the generative sequencer.
- **Gestik** gets no new gesture; each existing one keeps one meaning:
  - **Wenden** = Atempause while loops run. A long sleep stays the end of the set.
  - **Ladung** = loops boil, decaying with the Entladung. Lebendig Stränge with Eigensinn > 0 vary more; Abdruck Stränge get beat-sliced drop-outs and stutters on the grid. Treu Stränge never move.
  - **Ruhe** = opt-in „Ablegen erntet“: putting the phone down harvests what you just played (the old „Hinlegen wird Schleife“).
  - **Neigen and Drehen** act on the looper only through Zuweisen (Vorrang, Strang level, Bandstopp).
  - Haptic ticks briefly blind the shake and flip detection, as `mxBuzz` already does (V).
- **Sporenregen:** Lebendig notes can seed Keime, and a good rain can be harvested (Regen is part of „Gespieltes“).
- **Rhizom and Gespinst:** Lebendig loops strike the same net and web as your hands. Loops tire the Rhizom net, and the Gespinst halo grows around loops and live notes together.
- **Mixer and presets:** the Hexenring strip stays hidden until used (the Regen strip's precedent, V). A Lied or preset carries a template (Stränge, sounds, lengths, Schübe, pedal map) and references to stored Schleifen, never the audio. **Aufnahme in Takten** stays the set recorder.
- **Fährte:** retired as a button. Its lanes become the Bewegung Schicht, its MIDI targets map to Ernten, and old presets load their loop as a Bewegung Schicht.

---

## 7. What is new

Measured against `loopers.md` and `intelligence.md`:

1. **Retroactive overdub of audio**, aligned, with tail and pickup folding guided by the notes. Loopy and Ableton Capture take *new* clips in retrospect; I found no one keeping overdub passes this way.
2. **A first loop with no critical moment:** repetition found in exact note data, the tap anywhere, phase-locked takeover, every inference correctable.
3. **Abdruck and Lebendig per loop, lossless both ways, for 28 physical and chaotic models**, including notes kept while the physics improvises.
4. **Strang wählt Klang:** four-sound songs on a phone without menus.
5. **Form from playing:** Schübe marked during the build; the drop is a flip that lands on the grid.
6. **Retroactive grace:** instant pedal actions with double-tap meaning.
7. **Ladung makes loops boil and settle:** motion as energy for loops.
8. **The Humus and Puls ernten:** nothing in a set is unrecoverable, not even a lucky generative pass.

---

## 8. Feasibility sketch

- **Audio** (`code-map.md` §8A):
  - A looper AudioWorklet processor records into preallocated Float32 buffers and plays the Stränge sample-exactly from `{t}` messages, with crossfades and per-Schicht gains. Playback is immune to main-thread stalls, so the Fährte's 0.4-s limit is gone.
  - It loads lazily when the looper is switched on: any worklet moves Safari and Chrome-in-a-frame onto the worklet thread (V).
  - The **input taps** sit before the loop playback, so the Humus never hears the loops. This is what makes retroactive overdub possible.
    - „Alles“ taps `A.masterSum`, with a new `A.masterIn` (V insert point).
    - „Gespieltes“ taps `st.duck` (V meter pattern).
  - Playback goes to a new `STRIPS` entry. `mxChannels.own` and `mxSrcText` need it, or the mixer throws (V).
  - `beginBar`, `foldTail`, `nextDownbeat` and `heardT` give exact windows and the fold (V).
- **Latency:** Myzel's own sound is aligned by construction, because the player already plays into the instrument's latency (`loopers.md` §3.1). Only boundary presses are mapped to heard time (`heardT`, V), and the snap to onsets absorbs touch latency.
- **Events:** taken at `onDown/moveTouch/onUp` plus a `playNote` wrapper for the Puls, Regen and Rassel, excluding library previews (V). Lebendig re-plays as synthetic touches on a bus of its own, so it can be printed (one limit: Gespinst's single shared web). **Seeded randomness** must replace `Math.random` in the voices (V), and this is the largest refactor.
- **Clock:** one Takt clock factored out of `faeClock` (V), at the loop's exact fractional tempo. `seq.bpm` steps by 1 today (V).
- **Memory** (V: 384 KB/s for 48 kHz stereo float32):
  - Humus 64 s ≈ 25 MB; a 4-bar Schicht at 91 BPM ≈ 4 MB; a dense song ≈ 50–65 MB.
  - The total is shown in Werkstatt. Float32 throughout.
  - IndexedDB segments, as the take backup already does (V).
- **Cost:** measured with the `cost.js` method and counted in `voiceLoad()` while loops play, like Gespinst's web (V). Lebendig costs real voices (budget 14 on a level-1 phone, V).
- **Controls:** `midiTarget` entries (V), and a pedal key handler that acts only when no control has focus (A).
- **Intelligence:** main thread or a Worker, under 20 ms per take, never on the audio thread.

---

## 9. Risks, honest limits, questions for the owner

**Limits:**
- **„Gespieltes“ cannot keep the insert chain's movement per source.** The chain sits on the sum (V), so a looped filter sweep is either baked in („Alles“) or re-applied to everything (Bewegung).
- **Lebendig shares knobs with live playing until printed** (A).
- **Phone memory and IndexedDB quotas** need measuring; the Humus length is a setting.
- **Inference will sometimes miss** sparse rubato or a high ostinato. The chips are part of the feature.
- **Motion is slow** (60 Hz, 40–100 ms): it arms and shapes, and the grid lands the hit.
- **Face down muffles the phone's speaker.** With a speaker, put the Atempause on a pedal.
- **Seeded voices and the Lebendig bus are real refactors.**

**Questions:**
1. **Abdruck by default, Lebendig by choice**, to keep live voices safe on a 14-unit phone? And when the budget is full, which yields first, loop voices or live voices? I would protect live playing.
2. **Tempo or key changes with Abdruck loops:** lock the tempo and „umdrucken“ the key from events, or allow time-stretch or varispeed? This is your sound-quality decision.
3. **The Humus:** 64 s of float audio (≈ 25 MB) while the looper is on, or longer?
4. **Default input:** „Gespieltes“ (the room stays live) or „Alles“ (exactly as heard)?
5. **Sustain jack as the loop pedal** when the looper is on? You would lose it for notes.
6. **Wenden while loops play = Atempause**, as the default?
7. **A haptic count-in and beat on Android**, given that the vibration briefly blinds the shake and flip detection?
8. **The Mitspieler (above „Atmen“) in version 1**, or after the service intelligence has proven itself?
9. **Mic Stränge (voice, whistling) as a later stage?** They need headphones and a latency measurement.
