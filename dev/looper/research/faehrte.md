# Fährte – forensic report

Prepared 18.10.2026 for the looper decision. The owner's complaint: „Die Fährte funktioniert in der Form nicht richtig oder unzuverlässig.“ He wants a real looper.

Sources:
- the code in `myzel/index.html` (search by name, line numbers ≈ today's file);
- `dev/gestik/konzept.md` §4.4 and `dev/gestik/DECISIONS.md`;
- the Gestik test suites;
- my own reproductions in the instrumented slot `fx`.

## 0. Verdict in five lines

1. **The Fährte works as it was built, but it was built as an automation looper, not a looper.** All 137 checks of its own suites (`t-gf-*`) pass, along with 132 more from the suites that touch it. It loops *movement that shapes the sound* (Formen deflections, a few knobs, the finger's height). It never loops notes, the Puls, the sound source or audio.
2. A musician who taps the loop button after playing notes gets one of two results. Either a toast says nothing moved, or a toast says „läuft als Schleife“ while nothing audible repeats. Both happened in reproduction B. That alone explains „funktioniert nicht“.
3. **Why it feels unreliable even as an automation looper:**
   - With the Puls off, the bar grid is invisible.
   - The window is „the last *completed* bars before the last bar line“, so a gesture made in the current bar is not taken (C2), and a gesture across a bar line is cut and jumps at the seam (C).
   - By default it fades away (×0.85 a pass).
   - On a phone without Gestik the button is hidden.
   - Hold does not mean „record while held“.
   - A double tap clears.
4. **Real defects found:**
   - **D:** after a preset load, undo, Mutieren or Würfeln, a parameter lane keeps the old value. A 3 % knob nudge then loops as a 2-octave filter drop.
   - **L:** stalls longer than ≈ 0.4 s freeze the loop and make it jump. The design claims stall-proof playback, but that holds only up to about 0.4 s.
   - **E:** the loop survives „Stille“ and built-in presets.
   - **H:** a toggle-mode pad always arms a recording.
   - **G:** knob sweeps beyond ±2 octaves come back clipped.
5. **Reusable for a looper:** the clock (the Puls's beat, its own beat while the Puls stands, the external MIDI clock), the heard-time latency mapping, the look-ahead scheduler that lays automation onto AudioParams, the 16-bit lane serialisation in presets and scenes, and the always-on retroactive ring idea. Retire the Fährte as a separate button with its own gesture grammar, and fold its automation recording into the new looper as an optional „Bewegung“ layer on the looper's clock.

---

## 1. How the Fährte works (plain terms)

The code is the section `/* ---------- Fährte: Bewegung wird nie vergessen ---------- */` (≈ 15360–15750). Its state is `FA` (≈ 13849, declared with the mod layer). Its constants:

| Constant | Value | Meaning |
|---|---|---|
| `FA_R` | 48 | steps per beat |
| `FA_RING` | 32 beats | the ring holds 8 bars |
| `FA_AHEAD` | 0.5 s | how far ahead points are laid |
| `FA_END` | 0.04 | a loop below this strength is removed |
| `FA_KEY` | `myzel.faehrte.v1` | storage key |

### 1.1 What it writes down – always, without arming

Every value is written onto a grid of 48 steps per beat, held until the next value. The ring holds 8 bars; at most 48 lanes exist (`faeGc` drops idle ones). Four kinds of lane:

| Lane kind | Written by | What it is | Plays back on |
|---|---|---|---|
| `m` – mod-layer sources | `modSet` → `faeM` → `faeIn`, filtered by `faeOk(n)` = `gk:*` (except `gk:slp`) or `map:*` | Gestik's functions (Anlehnen Höhe/Tonhöhe, Bebung, Ladung's targets, Sporenregen slope) and **any control learned onto a „Formen“ target**, as the value that reached the layer (after Ruhezone, Glätte, Kurve, clutch) | the same Formen target |
| `p` – parameters | `setParam` → `faeP` (only ids in `FAE_PAR`), and `mxMorphApply` → `faeP('morph')` | 9 knobs: `flt.freq`, `rng.freq`, `bor.cut`, `kor.dens`, `kor.scat`, `trp.rain`, `dly.mix`, `rev.mix`, `cho.mix`; plus the mixer's A/B morph. Stored as log2 for frequencies and densities | the Formen counterpart (`flt`, `rng`, `bor`, `korD` …), **relative to the knob's value at the end of the window**, scaled by `FAE_PAR[id][2]` |
| `y` – finger height | `faeY` (every scheduler tick, 25 ms) | the **newest** touch's height against its own start, ×2, clamped ±1 (field finger, keyboard key + mod wheel, X-Y pad „als Finger“) | Formen `hoehe` (timbre of *held* notes) |
| `d` – tilt display | `faeGk` | Gestik's tiltX/Y | only the ghost spore in the Wasserwaage |

Everything else is not written down (see §2).

### 1.2 The clock it follows (`faeClock`, `faeB`/`faeT`, `faeAlign`)

- **While the Puls runs:** the Puls's beat (`SEQ.anchorT/anchorB/bpm`, `beatAt`/`timeAt`), kept at a fixed distance `FA.d`. This includes an external MIDI clock (`clkPulse`/`clkFollow`), whose phase-locked loop re-anchors `SEQ` on every pulse.
- **While the Puls stands:** its own count at the Puls tempo (`seqBpm()`), started at the first tick after sound start (`FA.t0 = now`, `FA.ph = 0`). These bar lines exist only inside the Fährte; nothing on screen shows them.
- **Puls (re)start or a clock jump > 1/8 beat:** `faeAlign` moves a running loop and any recording window onto the new bar lines, by up to ±2 beats.
- **Tempo change:** the loop lives in beats, so it follows (re-anchored, points re-laid when they move more than 0.5 ms).

### 1.3 The gestures (`faePress`, `faeRelease`, `faeTap`, `faeHold`, `faeTake`, `faeWin`, `faeDub`)

The same gestures apply on the bar's button `#btnFae`, on the Gerät panel's „Fährte“ button, on the Gestik card's button, and on a learned pad (MIDI target `fae`, always learned as `momentary`). The three single-action MIDI targets `fae.take`, `fae.rec` and `fae.clear` have no gesture.

- **Tap:** the tap waits 400 ms (in case it becomes a double tap), then `faeTake(bh)` with the beat *heard* at the press. The loop is the `len` bars (1/2/4, default 2) **ending at the bar line at or before the tap**. Within ¼ beat before a bar line, the tap means that bar line. The loop is cut once everything up to that bar line is written down (`faeReady`, `faePend`).
  - If no lane moved more than 1e-3 in the window: toast „… hat sich nichts bewegt, was den Klang formt.“
  - A tap while a loop runs **replaces** it, with an undo button for 4.5 s.
- **Hold (≥ 400 ms):** arms a recording **from the next bar line** (within ¼ beat after a bar line: from that one), lasting `len` bars. Releasing does nothing. A tap during the recording cancels it.
- **Hold while a loop runs = overdub:** one pass of the loop's length from the next bar line. Afterwards the old lanes are multiplied by the strength they have at that moment, the new lanes are added, and the strength goes back to 1.
- **Double tap (second press within 400 ms):** `faeClear(true)`, toast „Fährte gelöscht.“ with Rückgängig.
- **„Hinlegen wird Schleife“** (default off): Gestik's Ruhe event takes the bars before a point 2.2 s before the phone was put down.

### 1.4 Playback (`faeRun`, `faeLay`, `faeTick`, mod layer `modSet`/`modParam`/`modFlush`)

- **Where it plays:** the loop is a set of mod-layer sources named `fae:<target>|<src>`. Every scheduler tick (25 ms, a Worker timer, `tick` → `faeTick`), `faeLay` lays one point per step and lane up to 0.5 s ahead.
- **Audio targets** (Filter, Ring, Bordun, Echo/Hall send, Schweben, Panorama, Phaser, Leiern): `modParam` turns the points into `linearRampToValueAtTime` on a ConstantSource that is summed into the param. Only points ≤ now + 0.4 s are scheduled.
- **Tonhöhe and Ausdruck** are laid onto their params ahead. **Höhe** and the **morph** are set from the scheduler on the main thread (`modNotes(now, true)`, `modMorph`).
- **JS targets** (Körner, Tropfen, Puls-Dichte/-Helligkeit, Sporenregen slope, Gespinst, Rhizom) read `modVal(k, t)` where they schedule.
- **Live movement adds on top.** Every target clamps the sum to ±1; Filter ±1 = ±2400 cents.
- **Verblassen:** strength = `g0 · fade^((beat − gs)/len)`, default fade 0.85 per pass. Full strength sits at the window's end bar line, so a loop starts already partly faded (84 % in B). Below 4 % the loop is removed (`faeEnd`).
- **Gestik off:** lanes from `gk:*` rest (`faeLay` skips them, `gkDisable` clears them); knob and field lanes play on.

### 1.5 Latency shift (`faeShift`, `faeHeard`)

- Every value is written at the beat the player **heard** while moving: `baseLatency + outputLatency + graphLatency()` (the oversampled drive: 128 or 192 frames), plus for Gestik the sensor delay (Klopf-Messung, else 40 ms), plus a ±20 ms trim.
- The tap's beat uses the same heard-time mapping.
- Playback lays points at the beat's audio time, so the loop sounds where the music was heard („genauer als beim Spielen“).
- `ctxSync`/`ctxAt` map `performance.now()` to the audio clock.

### 1.6 Storage

- `myzel.faehrte.v1` keeps only the settings: `len`, `fade`, `trim`, `hin`, `seen`.
- **The running loop is not stored.** A reload loses it.
- A loop is kept only inside:
  - user presets of format 2 (`presetExtra` → `faeExport`: 16-bit base64 lanes, ≈ 600 characters per lane and bar);
  - the mixer's scenes A/B (`MX.snap.fae`, `faeSceneStore`; crossing the morph's half way imports that scene's loop, `faeScene`);
  - undo history of preset loads.
- Built-in presets and format-1 presets leave a running loop alone. One exception: the demo preset „Sporenregen + Fährte“ brings a loop on Gestik lanes (`rzDemoFae`).

### 1.7 UI states (`faeState`, `FAE_ST`, `faeUI`, `faeFrame`, `faeSecUI`)

- **Button states:** `''` (writing down, grey), `pend` (tap being taken, red), `arm`/`oda` (waiting for the bar line, blinking red), `rec`/`od` (recording, red ring), `play` (lumen icon plus a ring showing the position in the loop).
- **On the field,** top left, 10 px uppercase: „Fährte · 2 Takte · 85 %“ (`#faeTag`).
- **Gerät panel section:** length, Verblassen, trim, help text.
- **Visibility:**
  - The bar button shows only when sound is started **and** (Gestik on, or a MIDI/BLE device connected, or a loop or recording exists, or one was ever made: `FA.p.seen`).
  - The panel section shows only with Gestik on or `seen`.

---

## 2. The expectation gap: what a „loop“ is to a musician, and what the Fährte loops

A musician who taps „loop“ expects that **what they just played comes back**: the notes, in time, until stopped. The Fährte loops something else.

| What the player did | Looped by the Fährte? |
|---|---|
| Notes on the field (taps, chords, melodies) | **No.** Only the newest finger's *height change since it landed* (`y` lane → Höhe). Clean taps give nothing; taps with 2 px of drift give an inaudible Höhe wobble (B). |
| Notes from a MIDI keyboard | **No** (the keys are `touches`; only their mod-wheel/aftertouch height as `y`). |
| Held notes / chords | **No.** A looped Höhe or Tonhöhe acts only on notes held *at playback time* (`modNotes` walks `touches`). With no finger down, the loop is silent (test t-gf-pc: „a key held later: its timbre follows the looped pad“). |
| Pitch-bend wheel | No. |
| The Puls (the four Euclid lanes) | No. The Puls runs on its own and is generative (probability, walk), so its notes change anyway. Only the Formen targets Puls-Dichte/-Helligkeit, if moved by a control bound to them. |
| Bordun on/off, Freeze | No (Bordun filter `bor.cut`: yes). |
| The sound source, engine, octave, preset | No. The loop keeps deflecting whatever sound is loaded. |
| Engine macros A/B (2 of the 8 default knobs of every KORG keyboard, `BANK8`) | **No** – not in `FAE_PAR`, no Formen target. |
| Mixer faders, pans, sends, EQ | No. Only the A/B morph. konzept §4.4 and DECISIONS D1 promise „Mixer-Fader“ and „ANY continuous source“; the build does not do this. |
| Filter, Ring, Bordun filter, Körner density/scatter, Tropfen, Echo/Hall/Schweben amount | Yes, when moved with a knob or slider (`setParam`) – relative to where the knob ends, clamped at Formen's ±1 (G). |
| Gestik (Anlehnen, Bebung, Ladung, Sporenregen slope) | Yes (only while Gestik is on). |
| A knob or X-Y pad learned onto a Formen target | Yes. |
| Audio (the mix) | No. The REC button's „Aufnahme in Takten“ records audio to a take, and the take preview loops a bar take (`previewTick`), but straight to the output, unsynced and outside the mixer – not a live looper. |

So on a phone without Gestik, or on a PC where the player only plays keys, **there is nothing the Fährte can loop.** On a PC with a KORG keyboard, half the default knobs are ignored. konzept §4.4's own limit, „Es muss immer sichtbar sein, was live ist und was Schleife“, is not met for *what* loops: neither the toast nor the tag names the lanes.

---

## 3. Reliability problems, with evidence

Severity: **A** explains „funktioniert nicht“, **B** makes it feel unreliable, **C** is an edge case or polish.

The reproductions are in `/tmp/claude-0/-home-user-4claude/31b62666-e283-5142-ac94-5f41b61da83b/scratchpad/fx/`:
- `repro.js` (A–I), `repro2.js` (J, L, F2), `repro3.js` (C2), `stall.js`;
- slot `fx-inst`, run `node repro.js B` etc. from that folder, with the server on :8790.

### 3.1 [A] Notes are not looped; a „successful“ loop can be inaudible (repro B)

Setup: 14 notes played on the field with the mouse, then a Fährte tap (1 bar).

- **Clean taps:** no loop; toast „Fährte: im letzten Takt hat sich nichts bewegt, was den Klang formt.“
- **The same with 2 px of finger drift per note:**
  - loop created, lane `hoehe<-y`, peak 0.006 (= 0.003 field heights);
  - toast „Fährte: der letzte Takt läuft als Schleife.“, tag „Fährte · 1 Takt · 84 %“;
  - 0 held touches, 0 sounding voices.

Cause: `faeCut` accepts any lane whose peak exceeds `1e-3`, and `faeY` writes the newest finger's drift. The toast and the tag never say *what* loops. The loop is silent without held notes.

### 3.2 [A] „The last bars“ means the last *completed* bars before the last bar line (repro C2)

Setup: a filter swell on beats 0.3–2.3 of a bar; the Fährte tapped on beat 3 of the same bar (1 bar).

Result: **no loop**, toast „im letzten Takt hat sich nichts bewegt“.

Cause: `faeTake` sets the window end to `E = FA.ph + 4·floor((bh − ph)/4)`, the bar line *before* the tap, and moves it forward only within ¼ beat of the next bar line. A gesture made in the current bar is still in the ring, but the tap takes the bar before it. A second tap to retry within 400 ms is a double tap and clears.

### 3.3 [A] With the Puls off, the bar grid is invisible and arbitrary – gestures get cut, the seam jumps (repro C)

- The Fährte counts its own bars at the Puls tempo (84 BPM, 2.86 s a bar), starting at the first tick after sound start (`faeClock`: `FA.t0 = now`, `FA.ph = 0`). Nothing on screen shows them; `faeFrame` draws only while a loop runs.
- Setup: a 1.6 s swell (peak 0.8) started 1.0 s before an unseen bar line, tapped 0.3 s after it ended.
- Result:
  - the loop holds only the rise (first value 0.000, last 0.739);
  - every pass the filter jumps by **1773 cents** at the seam (a 15 ms ramp, one step);
  - the swell's fall is lost.
- There is no crossfade or smoothing at the seam, and no alignment of the loop to where the gesture really was.

### 3.4 [A/B] It fades away by default (repro I)

The defaults are Verblassen ×0.85 and 2 bars at 84 BPM, so one pass is 5.7 s:

| Passes | Time | Strength |
|---|---|---|
| 1 | 6 s | 85 % |
| 2 | 11 s | 72 % |
| 4 | 23 s | 52 % |
| 8 | 46 s | 27 % |
| 20 | 114 s | removed |

- The loop also starts already partly faded (`gs` is the window's end bar line, before the tap).
- A musician reads „it got quieter and stopped“ as broken. konzept §4.4 chose this on purpose („wie ein Echo“), but for a looper it is the wrong default.

### 3.5 [A] The button is hidden where it is most needed (repro A)

| Device | Bar button | Panel section |
|---|---|---|
| Phone, no Gestik, no MIDI | hidden | hidden |
| Desktop, no MIDI | hidden | hidden |
| Desktop + MIDI keyboard | visible (icon only, no label; the `title` tooltip does not exist on touch) | hidden until a first loop was made (`faeShown` needs Gestik or `seen`) |

The iPad has no Web MIDI, so the button is hidden there unless Gestik is on. The help text („So geht die Fährte“) lives in that hidden section.

Code: `faeUI`: `show = A.started && (GK.on || MIDI.ports.size || BLE.devs.size || FA.loop || FA.win || FA.p.seen)`.

### 3.6 [B] Hold is not „record while held“ (repros F, F2)

- Hold arms a recording of fixed length **from the next unseen bar line**. Release changes nothing.
- Five presses at random times: the recording started after 1.74, 2.61, 1.22, 1.70, 2.51 s. The sixth landed just after a bar line and started from it (−0.07 s, i.e. already running). Range: anything from 0 to a whole bar (2.86 s).
- Then it runs `len` bars (5.71 s for 2 bars) „whatever the hand does“.
- While waiting, the bar button blinks red with no countdown; only the hidden panel says „Nimmt ab dem nächsten Takt … auf“.

### 3.7 [B] Gesture conflicts (repros F, H; code)

- **A tap takes effect 400 ms late** (double-tap detection, `faeTap`), and up to ¼ beat later if near a bar line. No instant feedback beyond the red `pend` colour.
- **Double tap destroys.** With a loop running and an overdub armed, two quick taps meant to cancel: the first cancels the recording, the second clears the loop (F: loop still there = false, toast „Fährte gelöscht.“; undo for 4.5 s).
- **A tap while a loop runs replaces it** with the last bars of *live* movement. After 3.1 that can be a near-empty Höhe wobble („Die vorige ist ersetzt.“).
- **Toggle-mode pads (H).** A pad that sends CC 127 on one press and 0 on the next (the toggle mode of many KORG pads) is learned as `momentary` (`learnDone`: `key === 'fae' ? 'momentary'`).
  - First short press → `''`, then after 500 ms **`rec`**: a hold, the recording is armed.
  - The next press sends 0, a „release“, so nothing happens.
  - That pad can never tap or clear.

### 3.8 [B] Bug: phantom jumps in parameter lanes after a preset load, undo, Mutieren or Würfeln (repro D)

Setup:
1. Filter knob set to 700 Hz.
2. Preset „Tiefsee“ loaded (Filter 7000 Hz).
3. Knob nudged by 3 % to 7210 Hz.
4. Fährte tapped (2 bars).

Result:
- the loop's Filter lane holds the **old 700 Hz** until the nudge (deepest step −1.68 = −4037 cents);
- Formen clamps that, so **every pass pulls the filter down 2 octaves** for part of the loop;
- what was heard was a 3 % nudge.

Cause:
- `p` lanes learn values only through `setParam` → `faeP`.
- `loadValues` (used by `loadPreset`, `undo`, `mutate`, `dice`) writes `P` directly. The lane's held value `L.v` stays stale.
- At the next knob touch, `faeIn` fills the gap with the old value.
- A param lane lives 32 beats after its last write (`faeGc`: 23 s at 84 BPM).

### 3.9 [B] Parameter loops are clipped and partial (repro G; code)

- **Clipped.** The knob swept 8000 → 150 → 8000 Hz (5.7 octaves). The lane holds −5.74 octaves, but playback reaches only −2.00 octaves (Formen's ±1 clamp): the loop goes down to 2000 Hz, the hand went to 150 Hz.
  - The same clamp applies to mix amounts relative to the knob's end position (`mixRel`), and to the sum of live and loop.
- **Partial.** Only 9 parameters plus the morph are written down (`FAE_PAR`). On a KORG keyboard's default bank (`BANK8`), knobs 2, 3, 6 and 7 (macro A, macro B, layer level, Puls volume) loop nothing.

### 3.10 [B] The loop survives Stille, preset changes and engine changes (repro E; code)

- **After „Stille“** (`panic`): the loop still runs and still moves the Filter by ±1440 cents. `panic` stops notes, Bordun, echo, hall and Puls, but never calls `faeClear`, and its toast does not mention the Fährte.
- **After loading the built-in preset „Tiefsee“:** the loop still runs and deflects the *new* sound's filter. The only sign is the 10 px tag „Fährte · 1 Takt“ (by design: `presetExtraLoad` ignores presets without `fmt ≥ 2`).
- **Gestik lanes rest while Gestik is off, yet the tag still says the loop runs.** Loading the demo „Sporenregen + Fährte“ without Gestik shows „Fährte · 2 Takte“ while its two lanes (`gk:regen.x/y`) do nothing (code: `faeUI` shows the tag whenever `FA.loop` exists, `faeLay` skips `gk:` lanes while Gestik is off).
- **Schlafen** keeps the loop running (konzept: intended).

### 3.11 [B] Puls start, restart or Stille shifts the loop by up to half a bar (test `t-gf-loop`, code)

- When the Puls starts, `faeClock` sees `!FA.pon` and `faeAlign` moves a running loop onto the Puls's bar lines. The test logged a shift of −1.08 beats.
- Every Puls stop and restart does it again: Stille, Schlafen's wake, a MIDI Start or Song Position.
- To the player the modulation suddenly sits elsewhere against the music.

### 3.12 [B] Stalls longer than ≈ 0.4 s freeze the loop and make it jump (repro L)

Setup: a 120 BPM loop on the Filter, the main thread blocked for a given time, the audio thread sampled by a worklet probe.

| Main thread blocked | Error against the loop |
|---|---|
| 300 ms | 0 cents |
| 450 ms | max 289 cents |
| 700 ms | max 2296 cents |
| 1200 ms | max 2378 cents |

Cause:
- `FA_AHEAD` is 0.5 s, but `modParam` schedules only points ≤ now + 0.4 s.
- `tick`'s horizon is ≤ 0.35 s.
- Höhe and the morph are set on the main thread at all, so any stall stops them.

Opening the mixer panel blocks the main thread 183 ms on this 4-core machine (`stall.js`); a mid-range phone is several times slower. The design's claim „a page that stalls keeps playing them“ holds only up to ≈ 0.4 s.

### 3.13 [B/C] Latency compensation is only as good as the browser's numbers (code)

- `faeShift` relies on `AudioContext.outputLatency`, which some browsers do not provide (historically Safari) and which need not include a Bluetooth headset's ≈ 150–250 ms. The trim is only ±20 ms.
- Touch input latency (≈ 30–80 ms on phones) is not counted for the finger's lane. Gestik counts its sensor delay.
- If `outputLatency` changes mid-session (headphones plugged in), write positions jump.
- Wrong numbers make the loop „leicht daneben“ (konzept's own limit).

### 3.14 [C] Overdub surprises (code: `faeDub`)

- The old layers are baked at the strength they have at the pass's end, and then the fade restarts at 1. Overdubbing a 30 % loop makes its old part 30 % for ever, the new part 100 %.
- Only *live* sources are taken. A phone held still but tilted adds a constant offset to the whole loop.
- An overdub pass is always exactly one loop length; there is no „keep overdubbing“.

### 3.15 [C] Visual feedback gaps (code: `faeUI`, `faeFrame`, `faeText`)

- No bar position or count-in while nothing loops, and none while a first recording runs (the ring is drawn only with a loop).
- No names of what loops: the panel lists „Schreibt mit: …“ only *before* a loop exists.
- The tag is 10 px at the field's corner.
- The button is an icon of 36 × 38 px.

### 3.16 [C] Storage and background

- **Reload:** a reload loses the running loop and all history (only `FA.p` is stored).
- **Hidden page:** if nothing else runs (no Puls, Bordun, freeze or recording), Myzel suspends the AudioContext. The loop pauses with it and goes on, unshifted, when the page is visible again.
- **MIDI while hidden:** knob moves arriving from MIDI while the context is suspended are written with a stale `ctxAt` offset, so they land at future steps (minor; found by reading the code, not reproduced).

### 3.17 What is sound (measured)

- **Own suites:** the Fährte's suites, run on today's file, all pass.

  | Suite | PASS |
  |---|---|
  | `t-gf-loop` | 24 |
  | `t-gf-pc` | 24 |
  | `t-gf-save` | 28 |
  | `t-gf-gk` | 14 |
  | `t-gf-funk` | 30 |
  | `t-gf-parity` | 9 |
  | `t-gf-cost` | 8 |

  They show:
  - the waveform comes back where it was played (best match 11 ms, one tick 25 ms);
  - the audio thread plays the laid points exactly (mean error 0);
  - Verblassen is exact;
  - overdub sums correctly;
  - tempo 120 → 90 is followed mid-pass;
  - a 300 ms stall is bridged;
  - the patch is never written;
  - the loop saves and loads exactly (1/4096);
  - scenes carry their loops.
- **Other suites touching the Fährte:** `t-gx-live` 31, `t-gs-regen` 24, `t-gs-rezept` 27, `t-gu-ui` 50 (132 PASS).
  - `t-gs-regen`'s first run failed two Sporenregen rows (the direction rows, not Fährte rows) while other suites ran beside it. Run alone it was green: the known flake under load from HANDOFF.
- **External MIDI clock (repro J):** pulse stamps exact or jittered ±1/2/4 ms.
  - The loop is laid anew 1.5–3.3 times a second.
  - No render quantum moves faster than the loop itself can (0 discontinuities; baseline with the internal Puls: 0 re-lays).
  - Mean deviation ≤ 20 cents with ±2–4 ms jitter.
  - The clock following is sound.

---

## 4. Verdict: what to keep, what to retire

### Keep (sound, reusable for a looper)

- **The beat clock.** Three parts:
  - the Puls's beat while it runs, its own count at the Puls tempo while it stands, never jumping on tempo changes (`faeClock`, `faeB`/`faeT`, `beatAt`/`timeAt`, `seqRetempo`);
  - the external MIDI clock PLL (`clkPulse`/`clkFollow`), measured robust;
  - the realignment logic, as a tool, not as a silent half-bar jump.
- **Heard-time mapping:**
  - `ctxSync`/`ctxAt`/`perfAt` (performance time ↔ audio time without jumps);
  - `faeHeard`/`faeShift` and `heardT`/`nextDownbeat`/`latF` from the bar recorder.
  - A note looper needs exactly this to place a played note where it was heard.
- **Look-ahead scheduling:**
  - `tick` (a Worker timer, horizon grown with measured jitter);
  - the Puls's pattern of `hit(…, t)` at exact audio times;
  - `faeLay` → `modSet(…, {at})` → `modParam` ramps for automation.
  - A note looper schedules its events the same way. Raise the 0.4 s scheduling window to the full ahead time, and lay Höhe ahead, if stalls matter.
- **Mod-layer automation playback** (`modSet` with `at`, `modParam`, `modBendAhead`, `modExprAhead`): a ready engine for an optional automation layer of a loop. The patch is never written.
- **Serialisation:** `faeEnc`/`faeDec`/`faeExport`/`faeDecode` (16-bit base64 lanes), preset format 2 (`presetExtra`/`presetExtraLoad`), scene storage (`faeSceneStore`/`faeScene`), undo integration. The pattern carries over to note events and audio-loop metadata.
- **Retroactive capture:** the always-running ring is the right idea (Ableton „Capture“) and worth keeping for a looper. Notes need an event list, not a 48-step value grid.
- **Audio side** (not the Fährte, but relevant): the capture tap (`CAP`, `setupCapture`, the worklet `myzel-tap`, an 8 s ring, frame-accurate `beginBar`/`barGrid`) and the bar-take loop preview (`previewTick`). These are the starting point if the looper should also loop audio.

### Retire or fold into the new looper

- **The Fährte as a separate button with its own gesture grammar:** tap = retro-take after 400 ms, hold = arm a fixed length from an unseen bar line, double tap = clear, and on pads a mandatory `momentary` mapping. A looper needs explicit, instant states: record, play, overdub, stop, clear, undo, each visible and each on its own pad.
- **The invisible own bar grid while the Puls stands.** A looper either shows its grid (count-in or metronome) or lets the first loop's length define the tempo.
- **„Completed bars before the last bar line“ as the window.** It must include what was just played, up to now.
- **Verblassen as the default.** Keep it as an option (×0.85 is a nice effect), default „nie“.
- **The hidden-button rule.** A looper is a first-class control on every device.
- **„Stille“ leaving loops running.** A panic must stop the looper too.
- **Parameter lanes that learn only through `setParam`** (bug 3.8), and **the ±2-octave clamp** for knob recordings (3.9). If automation is kept, record absolute values per loop layer or resync lanes on `loadValues`.
- **The finger-height lane as a loop of its own.** In a note looper the finger's height belongs to the recorded notes (per-note y over time), not to a global Höhe deflection that only affects whatever is held later.

**Recommendation:**
- Build the looper on the shared beat clock and the look-ahead scheduler.
- Record notes, field and keyboard, as timed events with their per-note expression (y, bend, pressure) in heard time.
- Offer the Fährte's lanes as an optional „Bewegung mit aufnehmen“ layer that belongs to the loop: same length, same clock, cleared with it, no default fade.
- Then remove the Fährte button, its section and its MIDI targets, or map `fae*` onto the looper's actions for old learned pads. Keep loading old format-2 presets and scenes with a `fae` loop by converting them into a looper automation layer.
