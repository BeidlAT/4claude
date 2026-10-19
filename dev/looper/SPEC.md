# Hexenring – build specification

Binding for every builder. Source of intent: `dev/looper/KONZEPT.md` (German, owner-facing; §12 holds the owner's
decisions of 18.10.2026). Evidence: `research/*.md`, `ideas/*.md` (proposals), `ideas/check-*.md` (reviews with
measurements). Code names refer to `myzel/index.html` – **search by name, line numbers drift**. Where this spec and the
concept disagree, the concept's §12 decisions win; otherwise this spec wins.

**Standing rules (owner, CLAUDE.md):** best sound quality always; cost is measured and entered honestly (VCOST /
`voiceLoad`), never a reason to simplify a sound; if two goals conflict, stop and report the conflict instead of
deciding. UI German, short words. Develop on the session branch; commit with the trailers given in the session.

**Target devices (owner):** a current iPad Pro and desktop PCs first; the build/test machine is the reference. Phones
must keep working (no regressions), but the Hexenring may assume a strong device for its defaults (best quality level
for loops, audio Humus on from the first note).

---

## 0. Map of the work

| Part | § | Etappe |
|---|---|---|
| Taktgeber (one clock that never jumps; the Puls follows it) | 2 | 1 |
| `myzel-ring` processor (capture, Humus, Schleifen, Schichten, seams, playback) | 3 | 1 |
| Capture taps and the Hexenring strip | 4 | 1 |
| Notes Humus and Bewegung | 5 | 1 |
| Grammar: Korb, Hauptknopf, Ziel/Fokus, chips, states, undo | 6 | 1 |
| Seams | 7 | 1 |
| Werk-Rahmen (hidden render frame) | 8 | 1 (bake) / 2a (Wuchs) |
| Abdruck bake (effect chain burnt in), Taumeln | 9 | 1 / 2a |
| Wuchs | 10 | 2a |
| Audio loops on tempo change | 11 | 2b |
| Intelligence | 12 | 1 (Ohr basics) / 2b / 3 |
| Form | 13 | 1 / 2b |
| Tools | 14 | 2b |
| Ecology | 15 | 4 |
| UI | 16 | all |
| Controls | 17 | 1 |
| Mixer, lifecycle, presets, Fährte migration | 18 | 1 |
| Persistence | 19 | 1 |
| Parameters | 20 | all |
| Cost | 21 | all |
| Tests | 22 | all |
| Build order, risks | 23 | – |

All new code lives in one clearly delimited section `/* ---------- Hexenring ---------- */` (plus the processor
inside `myzelDsp()`), prefix `hx` for functions and `HX` for state, `hx.*` for parameters and MIDI targets. Hooks into
existing code are minimal and commented with `// Hexenring:`.

---

## 1. Architecture

```
voices ─► strips fin · eb2 · rgn · gsp (· l0–l3 · bor, by mask) ── tap after the mute/solo gate ──┐ "Gespielt" (in 0)
A.masterIn (everything heard, the Schleifen too – step 1b) ── myzel-ring-in, at the same frame ───┤ "Alles"   (ring 1)
                                                                                                    ▼
                       ┌──────────── myzel-ring (AudioWorklet, live context) ───────────────┐
                       │ Humus rings (2 × 64 s stereo) · Schleifen/Schichten · seams · clock │
Werk-Rahmen (iframe) ══╡ MessagePort: baked Abdrücke, Wuchs blocks                          │
                       └── out 0 (burnt-in loops) ─► strip "Hexenring" (route dir) ─► A.masterIn
                           out 1 (loops that follow the live chain) ─► A.voiceBus (insert chain)
A.masterIn = the master's input (new node after A.masterSum): masterSum → masterIn → lowSh …
```

- **Audio thread:** `myzel-ring` records, holds the Humus, plays Schichten, places pass starts from the clock
  segments, crossfades. It never allocates while running, never waits for the main thread, makes no musical decision.
- **Main thread:** notes/Bewegung capture, Taktgeber, grammar and UI, harvest decisions, seam choice, persistence,
  intelligence (≤ 20 ms per decision, never in the audio path).
- **Werk-Rahmen:** a hidden same-origin iframe running a second copy of `index.html` in a render-only mode (§8). It
  renders offline (bake, Wuchs) and streams blocks to `myzel-ring` through a transferred MessagePort.
- **Determinism:** live engines are not re-seeded. Reproducibility lives in the Werk-Rahmen only: a Wuchs pass is a
  deterministic offline render of a note list with a pass seed (`Math.random` replaced by a seeded xorshift for the
  render; state that the engines build lazily is pre-built there) – see §10.

---

## 2. Taktgeber (`TG`)

**Model.** A piecewise-linear beat map: segments `{t, b, bpm}` (audio time, beat, tempo; exact float). `TG.beatAt(t)`,
`TG.timeAt(b)`, `TG.bpmAt(t)`. A tempo change appends a segment starting at a *future* time `t1` with
`b1 = beatAt(t1)`; only the slope changes, the beat never jumps. Meter: 4/4 (beats per bar `TG.bpb = 4`; 3/4 allowed
from the "3er" correction for loops, the global clock stays 4).

**Who leads.**
- External MIDI clock (`midi.clock = follow`, `CLK.run`): the external device. `clkFollow` must stop re-anchoring
  `SEQ` to past pulse times; instead its PLL output becomes TG segments slewing over ≥ 1 beat into the future.
- Otherwise TG leads, and **`SEQ` reads TG** (`beatAt/timeAt` delegate to TG). `seqStart` aligns to the next TG bar
  line (no more `anchorT = now + 0.06` jump) unless no loop exists and the user starts the Puls fresh (then TG may be
  re-anchored at start, as today, because nothing depends on it).
- `seqRetempo` becomes `TG.retempo(bpm, at)`; Sporenregen (`rgRebase`), `clkOutTick`, `faeClock`, the bar recorder
  (`barGrid`, `nextDownbeat`) read TG.
- **Fractional tempo:** TG holds the exact tempo. `P['seq.bpm']` (step 1) shows/sets the rounded value; while a loop
  defined the tempo (`TG.src = 'hx'`), the slider shows the exact value (one decimal) and moving it retempos TG; presets
  store the exact value in `hx` data, not in `seq.bpm`.
- **Tempo release:** when the last Schleife is cleared and `TG.src === 'hx'`, the tempo returns to `seq.bpm` unless the
  chip "Tempo behalten" was tapped.

**Spielverzögerung.** `HX.lat` (seconds, per device, stored in `myzel.hx.dev.v1`): measured by a tap test in the card
("Klopf mit": 8 taps to a click; median of tap time − click heard time). Default 0. Applied as the default phase of a
Schleife harvested against a running grid (Puls/external), i.e. events and audio are read `HX.lat` earlier. Never
applied to the audio relation itself (internal capture is aligned by construction).

**Acceptance.**
- `midi-tests` and `motion-tests` green (the Puls, Rassel, Regen, Fährte-derived tests that read the clock).
- 1 h simulated run with tempo changes and ±0.2 % wander: every pass start of a Takt-locked Schleife within ½ frame of
  `round(frameAt(b0 + k·L))` (port `ideas/engineer-experiments/e4-drift.js`).
- Puls start while loops play: the Puls's first step lands on a TG bar line (≤ 1 frame).

**As built (step 1a).** The beat map keeps a *continuous* beat that never jumps at all; the musical beat (bar lines at
its multiples of 4) is the continuous one minus an origin `TG.o`. The origin moves only at a fresh Puls start without a
Schleife (as the letter allows), at a device's Start/Continue/late downbeat, and – with a Schleife – by whole bars when
the Puls joins the grid at its next bar line (it counts from 0 there, so MIDI clock out still sends Start). So "TG may be
re-anchored at start" became an origin move: the Humus's Bewegung, the Fährte's lanes and every loop phase keep their
beats. Main-thread tempo changes take effect `TG_LEAD` = 30 ms ahead. `SEQ.anchorT/anchorB/bpm` are accessors (the last
re-anchoring; the nominal tempo – a device's while it leads, not a slew's slope); a direct write re-anchors the map
there as before (old tests write them). `faeB/faeT` are the continuous beat, `FA.t0/b0/bpm` mirror the segment sounding.
MIDI clock out lies on the Taktgeber's musical grid running or standing. Fractional tempo: `hxTempo(bpm)` (TG.src 'hx');
`seqBpm()` returns it, `P['seq.bpm']` keeps the patch's whole number, the slider, the Puls ring and the mixer show one
decimal, a slider move takes the tempo back (src 'seq'), a preset leaves it, the last Schleife cleared releases it
(`TG.keep` = „Tempo behalten“). MIDI clock follow: the PLL's phase reaches TG as two segments from now + 30 ms (a slope,
then the tempo) over `max(1 beat, 10·|error|)`; errors under 1 ms only update the tempo (≥ 0.01 BPM). Measured
(t-hx-clock, 118.7 BPM ±1.5 ms jitter): TG on the device's beat mean 0.5 ms / max ≈ 1 ms, Puls sixteenths mean 0.5 ms,
a loop's pass starts within 0.9 ms of the device's bar lines, slopes within 0.3–2 %, the past never rewritten.
**Conflict (reported):** when the audio clock stalls (the headless test device: 3–70 ms), the device's beat moves by the
stall in audio time and TG slews back over ≥ 1 beat instead of jumping; `midi-tests/t-clock.js` asks the Puls's hits
within 6 ms of the device's sixteenths and failed 2 of 5 runs where a stall fell into its window (the old code
re-anchored at once). The spec's slews were kept; the owner decides. `HX.lat` (Spielverzögerung) comes with the grammar.

**As built (step 1b).** The owner's decision on the conflict above: small phase errors still slew over ≥ 1 beat; an
error > 15 ms – and any error that comes from our own clock (the audio↔performance mapping moved since the last pulse:
an audio stall, not the device) – is corrected within ¼ beat (`tgFollow(…, moved)`: a slope over `max(50 ms,
|error|/0.6)`, ≤ ¼ beat, never below 40 % of the tempo). The beat still never jumps; a Takt Schleife's next seam simply
comes that much earlier or later (its crossfade joins it). Two more pieces were needed: `ctxSync` walks a stall under
100 ms (before: a jump from 15 ms on – the clock-out check „stamps step ≤ 1 ms“ failed on such stalls), at ≤ 1.5 % of the
time passing and ≤ 0.4 ms a call, however often it is called (before: up to 1 ms a call – with two calls between two
clock pulses the checks on the pulses' gaps, within 0.6 / 1.1 ms, failed now and then); a 15-ms stall is walked in a
second. After a jump (a stall ≥ 100 ms) `tick()` re-reads the device's clock (`clkFollow`) before the Puls schedules.
A moved mapping makes `tgFollow` fast only when the error is over 3 ms (below, it slews as any small error – fast
corrections of mere jitter bent a following Fährte). Measured on two machines (the second, after a container restart,
stalls 3–19 ms several times a second): `midi-tests/t-clock` 29/29 in 7 runs on the first (with a 2.5-% walk) and, as built, 5 of 5 on the second
(the pulses' gaps after Stop within 0.4 ms); a diagnostic of its Puls window with such stalls inside it: the Puls's hits
within 0.46–2.9 ms (max) of the device's sixteenths (step 1a: up to 7.5 ms; the check allows 6).
`t-hx-clock` green (19/19, now 20/20; two runs of twelve had too few calm samples for its device-clock rows – 8 or 9 of > 20 –
while the audio clock walked; their errors were ≤ 1 ms all the same, and over all samples ≤ 3.3 ms – the suite now
asks for ≥ 8 calm sixteenths and one pass, and checks every sample within the 6 ms of `midi-tests/t-clock`). A free first Schleife sets the Takt at its entry: the tempo from the Takt finder, the bar
line (origin) at its seam (`hxTaktSet`). Tempo corrections (½, ×2, the finder's 3/4 reading) act at the loop's next seam
(a bar line): the new slope and the loop's beats in one message (`hxBatch`), so its seams stay on bar lines.

**As built (step 1c): Spielverzögerung.** „Klopf mit“ in the card (`hxKlopfStart`): twelve clicks at 100 BPM on the click
path (§6.3), the first four to settle in; each tap (press-acting, its event time mapped onto the audio clock) is taken
against the nearest click, from −150 to +450 ms; after eight the median is `lat` in `myzel.hx.dev.v1` (`hxLat()`, 0–400
ms; fewer than four: „noch einmal“). Measured against the click's time *on the audio clock*, not its heard time: the
output latency is part of what a note played to the click is late by, and a loop must take it out too (the letter's
„heard time“ would leave it in). A harvest of kind `grid` (a Takt) while the Puls or a device's clock runs reads its
window `lat` later (`hxHarvest`); the loop's phase shows it (`L.nudge = −lat`: the card's Phase, ±5 ms and undo as any
nudge). Audio and notes are read together, so nothing else moves. t-hx-taps: taps 70 ms after their clicks → 75 ms;
bursts played 70 ms after the beats sound on the beats in the loop (within 0.1 ms).

---

## 3. `myzel-ring` – the looper processor

Registered inside `myzelDsp()` (class `MyzelRing`, name `'myzel-ring'`). The module is loaded at audio start
(`start()` → `ensureDSP()`), because the Humus records from the first note (owner decision). No closures from outside
`myzelDsp`.

**Node.** `new AudioWorkletNode(ctx, 'myzel-ring', { numberOfInputs: 2, numberOfOutputs: 2, outputChannelCount: [2, 2],
channelCount: 2, channelCountMode: 'explicit', processorOptions: { sr, humusS, chunk } })`.

**Frames.** The processor counts its own frames (as `MyzelTap`); `currentFrame` can stall. It reports `{frame, t}`
pairs every 0.25 s so the main thread can map audio time ↔ frame exactly.

**Memory.** Chunk pool: Float32Array pairs of `CH = 8192` frames, allocated on the main thread and transferred in
(`{pool: [[L,R], …]}`), returned when freed (`{free: [...]}`). Humus: two rings (in0, in1) of `ceil(humusS·SR/CH)`
chunks each. The processor never allocates in `process()`.

**Model in the processor.**
- `Schleife {id, L (frames), phase0 (frame of pass 0 start), lock: 'takt'|'frei', gain, pan, out: 0|1, state:
  'spielt'|'stumm'|'angehalten', fadeState, schichten[]}`.
- `Schicht {id, chunks[] (refs), len, margin {pre, post}, ausklang {chunks, len}, gain, mute, age, wear, src: 'abdruck'
  |'wuchs'}` – a Schicht's audio is `len` frames starting at the loop's musical phase 0 plus margins; `ausklang` is the
  tail past the end (§7).
- Pass k of a Takt Schleife starts at `F(k) = round(frameAt(TG.b0 + k·beats))` computed from the clock segments the main
  thread sends (`{seg:{f, b, fpb}}` ahead of time), never by counting. A Frei Schleife: `F(k) = phase0 + k·L`.

**Messages (main → processor), each applied at its frame `f` (or at once):**
`{pool}`, `{seg}`, `{grab:{id, in, f0, f1, pre, post, tail}}` (copy a window of a Humus ring into fresh chunks, reply
`{grabbed:{id, chunks}}` transferring copies to the main thread for baking/storage), `{loop:{…}}` (create),
`{schicht:{loop, id, chunks, len, margin, ausklang, f}}`, `{replace:{loop, schicht, chunks, f}}` (swap audio at a seam,
e.g. baked or Wuchs version), `{state:{loop, to, f}}`, `{gain:{loop|schicht, g, f, ramp}}`, `{undo:{schicht, f}}`
(remove with the seam fade), `{clear:{loop|all, f}}`, `{stream:{loop, port}}` (attach a Wuchs stream, §10),
`{rate:{loop, cents}}` (Taumeln compensation / MIDI-clock nachführen, §9), `{report:1}`.

**Replies:** `{frame,t}`, `{grabbed}`, `{passStart:{loop, k, f}}` (for UI/scheduling), `{meter:{loops:[rms,peak]}}`
(≈ 15 Hz), `{late:{loop, k}}` (Wuchs block missed), `{freed}`.

**Playback.** Sum of the loop's Schichten (each `gain × fbAge`), plus the previous pass's Ausklang overlap (§7), through
the seam law; then loop gain/pan; to out0 (burnt-in) or out1 (follows the live chain). Every state change, undo, mute,
punch and source switch uses the **smooth equal-power law** `g_in = sin(π/2 · s(x))`, `g_out = cos(π/2 · s(x))`,
`s(x) = (1 − cos πx)/2`, length 10 ms default (40 ms for sustained material, chosen by the main thread).

**Resampling.** One windowed-sinc polyphase resampler (32 taps × 256 phases, Kaiser β 8) shared by all uses: Taumeln
compensation and MIDI-clock nachführen (ratio within ±1 %), tape speed steps (§14), sample-rate conversion on restore.
Its cost is measured and entered (§21).

**Acceptance.**
- A Schicht whose samples hold their own index replays every pass bit-exactly at `F(k)` for 1 h with tempo segments.
- Seam/undo/mute/punch: third-difference peak ≤ 1.5 × mid-pass on the E10 signal set, and short-term RMS continuity
  ±1 dB over 10-ms windows on real Gong, Harz and Bordun material.
- No allocation in `process()` (instrumented check: pool counts constant during a 10-min run).
- Main thread blocked 2 s: playback continues without a gap.

**As built (step 1a).** `class Ring` in `myzelDsp()` (`'myzel-ring'`), node made in `start()` (`hxStart` → quiet
`ensureDSP` → `hxNode`). Chunks of 8192 frames; the page makes the two Humus rings (`hx.humus`, rec param, 64 s) and
moves them over; a grab brings its own empty chunks (`{grab:{…, dst}}`), filled two chunks per block, oldest first, and
returned filled – the processor needs no spare pool. Messages as listed (`{stream}` stored, unused until step 2;
`{late}` not sent yet); replies `{frame,t}`, `{passStart}`, `{grabbed}`, `{freed}` (every chunk handed back by transfer),
`{meter}` (15 Hz), `{report}`. A Schicht: `join` 'xf' (warm: the pass that ended continues under the new start), 'ola'
(cold: its Ausklang `{off,len}` – in its own chunks or a window of the Schicht's – overlap-added from its second seam on;
never at its first), 'cut' (tests); an entry fade-in (`fin`, default X) from silence. **Seam law:** the smooth equal-power
pair normalised by the two sides' correlation ρ, `k = 1/√(1 + 2ρ·sin·cos)` (ρ 0 equal power, 1 equal gain, negative a
lift ≤ ×2) – the letter's "toward equal gain with correlation" extended to negative ρ (measured on Gong: ρ −0.22); the
page measures ρ from the Schicht's own seam (`hxRho`, default for 'xf'). Stop at a seam (`angehalten`): the Ausklang rings
once outside the loop's state gain; without one, the pass's own continuation fades over X. A swap at a seam is joined by
the seam's own crossfade (old version as the continuation), mid-pass the versions cross at the same place. Resampler:
cut-off at the source's Nyquist, every phase normalised to unit DC gain, linear between phases; `{rate}` ±20 ct, glides
over 50 ms; r = 1 reads frame for frame (bit-exact). Measured (t-hx-proc): one hour, 2402 segments: 631 passes within
±0.499 frames of `round(frameAt(k·beats))`, 0 wrong frames, passStart reports exact (20 s render); 10 min of grabs,
Schichten and undos (145 cycles): the Humus's 750 chunks constant, every chunk accounted for, 0 typed arrays made in
`process()` (an instrumented build counts them); E10 set (sine, DC, chord): seams 1.01–1.21× mid-pass, entries ≤ 1.02×;
mute, undo, stop, swap ≤ 1.0× with the gain only falling; Gong/Harz/Bordun rendered by the app: seams 0.88–0.99× the
material's own third difference there, RMS within −0.18…+0.18 dB of the two sides; resampler ±17 ct flat within
0.001 dB to 20 kHz, residual −94.5 dB (1 kHz) … −82.5 dB (20 kHz); the page blocked 2 s: no wrong frame.

**As built (step 1b).** Added for the grammar (all in messages, nothing allocated in `process()`): a Schicht may enter at
the start of a given pass (`seamK`: a delayed harvest, a punch's pass, a retro Schicht in the last quarter); it may be
**filled live** from a Humus ring while it already plays (`fill: {in, f0, gate}` with its own chunks and a `copy` set
returned as `{filled}` when complete – its frames are read a whole pass after they were captured, so the copy is always
ahead; a harvest's entry is therefore exact even when its window ends in the future, e.g. „ab Takt 9“); a punch's gate
(the smooth law over 10 ms at the press frame, `{gate:{b}}` at the release – frames already copied past it are faded in
the message); `{geom}` (a re-cut's length or a tempo correction's beats, keeping the seam ahead where it is, at once or at
a frame); `{aus}` (the seam's character once the window's end has sounded: join, X, ρ; the Ausklang cut at the first
foreign onset with a 30-ms fade – read as it is now by the tails – and the fill trimmed to what is still needed); `{rs}`
(a sample-rate conversion job: the resampler's design with a longer kernel – 160 taps × 256 phases, Kaiser β 10, the
cut at 0.955 × the lower Nyquist, so nothing folds down and no image comes up; `blk` frames a block; the page runs it in
an offline render of its own – ≈ 0.6 ms per 512 frames here, too much for the live thread; measured 96 kHz → 44.1 kHz:
1 kHz and 18 kHz within 0.001 dB, a 30-kHz tone −155 dB where it would fold);
`{state}` with `ph0` (a Frei loop from its start); a re-entry still pending is dropped by any other state. The `pp` rule
changed from „played the whole pass“ to „sounded into this seam“: a Schicht that entered mid-pass with its fade-in (a
harvest „sofort, im Takt“, a retro Schicht) is joined at its first seam by the crossfade/Ausklang – before, it jumped
from its end to its start. The meter carries both rings' input level (15 Hz; the Korb's „leer“ and a phrase's ring end).
t-hx-proc stays green (33/33; its Gong row scatters with the material, see §22).

**As built (step 1c).** Two outputs per Schicht, not per loop: `S.out` 0|1 (`V[0]`, `V[1]` per-output sums, each output
written only when used), so a loop's dry Schicht (out 1, through the live chain's copy) and its baked one (out 0) can
cross at a seam – `{replace}` carries `out`, the seam crossfades the two versions across the outputs. Per Schicht the
seam's place `zo` (Nahtwahl, frames after the bar line: the pass that ended goes on to `pre + len + zo`, the start
reads from `pre + zo`) and its gain curve `kc` (§7), both adopted at a pass start (`zoN`, `kcN`). Taumeln (§9) in the
processor: input 1 carries the live drift (`A.driftG`, cents); its value at each quantum is kept in a ring and copied with
every grab and live fill into the Schicht (`dr`: one value per 128 frames, stored with it); a Schicht with Taumeln on
reads at `2^((d_now − d_rec(pos))/1200)` (per quantum, through the shared resampler; `{tau:{loop, on}}`), bit-exact
again when the two agree. Stop at a seam: the Ausklänge of earlier passes still ringing become free tails and ring out
(before, they were cut at the stop). `{aus}` gained `zo`, `kc`; `{schicht}`/`{replace}` `out`, `zo`, `kc`, `dr`.

---

## 4. Capture taps and the Hexenring strip

- **"Gespielt" (in 0):** per source strip, a tap after the mute/solo gate (`st.dry` output) for `fin`, `eb2`, `rgn`,
  `gsp` by default; `l0–l3`, `bor` join when the mask says so ("Puls mit", "Bordun mit"). The taps sum into in0. This
  is what you heard of your sources, post-fader, post-mute, dry of the insert chain and the returns.
- **"Alles" (ring 1):** everything heard, the Schleifen included (owner's decision, step 1b: true resampling – an
  Alles harvest while loops play is a bounce): `A.masterIn`, the master's input, where `A.masterSum` (all strips incl.
  returns) and the Hexenring strip join. Written by its own node `myzel-ring-in` downstream of `A.masterIn`, aligned to
  the frame with in0. The retro Schicht and the default harvest always take Gespielt.
- **Rule:** everything a Schleife produces (playback, Nähren voices, its own webs) sounds on a path the Gespielt tap
  does not hear.
  Loop-driven voices (Live mode, Nähren into Rhizom/Regen) use `o.bus = stripIn('hxr')`; the Gespinst halo of a feeding
  loop comes from the loop's own web instance into `hxr`.
- **Strip `hxr`** ("Hexenring", info "Schleifen"): a `STRIPS` entry; add to `mxChannels.own` (colour, group "spiel"),
  `mxSrcText`, `MX_SRC_IDS` as needed; hidden until the first Schleife (`mxRgnSync` pattern). Default route `dir`
  (to `A.masterIn`). Its echo/hall sends are set to the gain-weighted mean of the playing loops' recorded send levels
  (each loop records the mean send level of its captured strips), ramped over 50 ms; per-loop send levels are a
  documented compromise (KONZEPT §3.3).
- Mute/solo of `hxr` work as for any strip. Meters tap as for others.

**Acceptance:** with loops playing and overdubbing, the in0 tap contains no loop signal (correlation test with a
marker tone in a loop: ≤ −100 dB in the tap); ring 1 holds the loops at their level and is frame-aligned with ring 0
(step 1b).

**As built (step 1a).** Taps after `st.dry` as specified; a masked-out strip has no tap node at all (`hxMask`, 3-ms
ramps). The strip `hxr` stands after „Regen“ in the Spiel group, hidden until the first Schleife (`mxRgnSync`); its
params are `rec` (out of patches – a preset never changes running loops); route `dir` → `A.masterIn`; set to the chain it
goes through its own chain copy that also ends at `A.masterIn`; its sends take its own signal. **Out 1** plays through its
own chain copy (the live chain's settings and modulators) into the strip – not `A.voiceBus` as drawn in §1, because
`A.voiceBus` ends in `A.masterSum`, where „Alles“ listens; the difference: the drive acts on the loops alone, not on their
sum with the live playing. **Conflict (reported):** the strip's echo and hall sends feed the shared returns, which are
part of `A.masterSum` – so „Alles“ hears the loops' echo/hall; the rule "no tap hears a Schleife" holds for the dry loops
only (separate returns for the loops would be needed; the echo is not linear). Measured (t-hx-taps, sends at 0, live
Bordun and notes going on): a marker in two loops (out 0, out 1) −130 dB under the loops in „Gespielt“, −127 dB in
„Alles“; a muted strip is silent in both rings. The module now loads at sound start; tests that encoded the lazy rule were
updated: `klang/tests/t-parity.js` (old engines: the module loads once, at sound start; their voices stay native),
`klang/tests/t-lib-fb.js` (the module stands before the first probe), `motion-tests/t-gl-parity.js` (one strip more,
unity), `motion-tests/t-gs-raster.js` (the budget holds the capture: one held note fewer fits).

**As built (step 1b): „Alles“ hears the Schleifen** (owner's decision: true resampling – an Alles harvest while loops
play is a bounce; the retro Schicht and the default harvest always take Gespielt). Ring 1 now records `A.masterIn` (the
master's input: every strip, the returns, the strip „Hexenring“). That path runs through the processor's own output, so
it cannot be the processor's input without a cycle (a cycle needs a DelayNode, and Chrome made its delay depend on the
graph: −128, 0 or +128 frames in tests). Instead a small node of its own, `myzel-ring-in` (in `myzelDsp()`), downstream
of `A.masterIn` (its output silent into the destination, so it is pulled every quantum), writes the Ring's ring 1 through
a registry in the worklet scope (`RINGS[rid]`) at the Ring's own frame count (`currentFrame + cfOff`) – both rings stay
aligned to the frame whichever node runs first (t-hx-taps: white noise into both taps, lag 0, the rest 1.3–1.7e-4 at a
peak of 0.10 – the field's last notes reaching the master through the insert chain). The step-1a conflict (the loops'
echo and hall in „Alles“) is gone with it: Alles is meant to hear everything. A marker in the loops sits 0 dB from the
strip's in Alles and −130 dB under the loops in Gespielt; a muted strip is in neither. The per-loop card offers
Gespielt/Alles as a re-cut from the other ring while the Humus holds the window.

---

## 5. Notes Humus and Bewegung

**Event model** (`HX.ev` ring, 2 min, objects reused):
`{id, t0 (ctx time of the voice start), t1 (release time or null), src ('fin'|'eb2'|'rgn'|'l0'…|'bor'|'ras'), eng,
f, deg, oct, alt, x, y0, vel, pan, layer, gate, burst, curves: {y: [[t, v]…], f: [[t, f]…], pp, mb}, probe:false}`.
- `deg/oct/alt`: relative to `N` at `t0` (`N.notes`, scale root); `alt` ≠ 0 for chromatic notes (MIDI "Chromatisch").
- Capture points: wrap `playNote` (all voices, gives `t`, `eng`, `f`, `y`, `vel`, `o.bus` → src, `o.gate/burst`) and
  the returned voice's `setF`/`setY`/`release`; skip `kqHear` probes (`v.probe`) and voices whose `o.bus` is `hxr`
  (loop-made). Onsets inside voices (Rhizom pings, grains, crackle) are not events; seam logic gets them from audio
  onset detection (§7).
- **Bewegung:** the Fährte's always-on lanes (`faeIn`, 48 steps per beat) become the Humus's movement ring, keyed by the
  Taktgeber's beat; values stored **absolute** (fixes Fährte defects D, G); `loadValues`, presets, undo, Mutieren and
  Würfeln resync the knob lanes (fix D).

**Acceptance:** after playing a 2-bar phrase with finger, MIDI and Puls, `HX.ev` holds every note with correct
`t0/t1/deg`, the Puls notes with src `l0…`, no probes; a loop's own Live/Nähren voices are absent.

**As built (step 1a).** `HX.ev`: 4096 reused objects, 120 s, no reference to the voice kept (the Gestik soak's heap grew
3.4 MB in 2.5 min while events held their voices; now 1.1 MB); a voice's `setF/setY/release` are wrapped (a curve point at
most every 5 ms, a long hold thinned to every other point at 256); `src` from `o.bus` (`o.hxSrc` 'ras' from the Rassel); struck notes keep `t1` null and their `gate` (the Puls
step's); the Bordun is one event (`startBordun/stopBordun`); probes, `hxr`-bus voices and offline renders are left out;
`hxEvents(t0, t1, held)` returns plain records. Bewegung: `FA_RING` 400 beats (2 min at 200 BPM), `hxMv(t0, t1)` gives
every lane's steps with knobs in their own unit (Hz, share) – a sweep 8000 → 150 → 8000 Hz is kept whole (G); the Fährte's
own playback still clamps to Formen (it is retired in step 3). `loadValues` writes the changed `FAE_PAR` knobs into
their lanes at once (D): after a preset the lane holds the preset's value, a 3 % nudge stays 3 % (t-hx-humus).

---

## 6. Grammar, states, history

### 6.1 Targets and gestures
Exactly the table in KONZEPT §2.2. Implementation notes:
- Press-acting: Korb, Hauptknopf, rings act on `pointerdown`; timing in heard time `heardT()`; grace: a press ≤ ⅛ bar
  (max 250 ms; rings max 150 ms) after a bar line means that bar line.
- Hold thresholds: 0.5 s (Hauptknopf push-to-talk, ring card), 1.5 s (↶ = alle leeren, with a filling ring).
  Vertical drag > 12 px on a ring = level. No speed-based distinctions.
- No double-tap anywhere on screen.
- Every pending action is visible (dashed, countdown "ab Takt 9") and cancellable by a second tap or ↶.

### 6.2 Ernten (Korb)
Rule table KONZEPT §2.3, plus:
- **Window length (auto):** candidates 1, 2, 4, 8 bars (grid) or the repetition length (no grid); scored by phrase
  boundary at both ends (gap before the first onset ≥ 0.3 s or a bar line), repetition found (§12.1b), no note cut at
  the end (a held note crossing the end counts against). Options in the card: "wie Schleife 1", "fest N Takte".
- **Entry:** as in the table; the loop's first pass after a delayed entry continues seamlessly from the live playing:
  the processor starts the Schicht at the seam frame; the Ausklang of the live notes rings on naturally.
- **Precedence** (from `check-performer.md` M1): Korb during a recording or a wait replaces the recording; a second Korb
  tap over the same window is a re-cut (never a second loop); Hauptknopf during auto-length closes at the next bar line;
  push-to-talk minimum one beat; full slots: label "voll", nothing overwritten.
- **Result:** a new Schleife in the Ziel (mode "neue Schleife") or a Schicht in the Fokus (mode "dieselbe Schleife").
  After every harvest the chips `→ 1 · → 2 …` (playing loops) appear for 8 s: a tap turns the harvest into a Schicht of
  that loop, re-cut from the Humus to that loop's last pass (§6.4).
- **Corrections** (8 s, inside the Ringleiste, then in the card): `Tempo ½ · ×2 │ Länge −1 · +1 │ Eins ← → │ 3er │ Runde
  davor`; each re-cuts from the Humus without stopping the music (the playing Schicht is replaced at the next seam;
  for tempo corrections TG is retempo'd at once with the loop).
- **Korb label:** always what a tap would take now: "2 T · 91", "4 T", "frei · 26 s", "ab Takt 9", "voll", "leer".
  It lights (lumen) when a repetition of material not already in a Schleife is detected.

### 6.3 Hauptknopf, Ziel, Fokus, modes
KONZEPT §2.2. Start option `hx.start = takt | ton | sofort` (at the next bar line, at the first note event via
`noteEvent`, at once). Count-in: `hx.ein = aus | sicht | vib | ton` (visual big number in the field centre and on the
button; Android vibration; audible click). Click: `hx.klick = aus | zaehl | ein` (a click voice on an internal path, never
tapped). In mode "neue Schleife" later recordings auto-close after the base length × the chosen multiple (×1/×2/×4
chips while waiting).

**As built (step 1c).** `hx.ein` (Einzählen: aus · sicht · vib · ton, default sicht) and `hx.klick` (Klick: aus · beim
Einzählen · auf den Zählzeiten, default aus) in the card's settings. The click (`hxClickAt`: a 1568-Hz sine burst, 2093 Hz
on the 1, 1.5-ms rise, 12-ms decay) goes into `A.monSt` – after the master, before the destination: neither Humus tap nor
the recorder hears it (t-hx-taps: ≤ −130 dB under the monitor's click in Gespielt and in the master's input). Scheduled
in `hxTick` on the Taktgeber's beats (`zaehl`/`ton`: before a waiting recording's bar; `ein`: every beat while a Takt
runs). `vib`: `navigator.vibrate` timed to the heard beat (where a device has it; the number shows anyway). The big
count-in number only when `hx.ein` is not „aus“.

### 6.4 Schichten, overdub, retro layers
- Retro Schicht: "the pass" = if the decision falls in the last ¼ of the target's pass, this pass at its end (pending,
  cancellable), else the pass just completed. Its window = the target loop's last pass frames in the Gespielt ring
  (never Alles). If the target is longer than the Humus can reach, the chip is disabled.
- Punch overdub: starts at press frame (from the Humus, so no lost onset), ends at release/tap; 10-ms fades; each
  pass of a long overdub becomes its own Schicht in a group.
- Guard: no Eigensinn/Gärtner change in a loop during the three passes after a Schicht was added.

**As built (step 1d).** The guard: `hxGuardSet(L, k)` when a Schicht joins a loop that has one (`hxSchNew`, not for a
rebuilt one) – `L.guardK` = its entry pass + 3; `hxEigSet` holds a change asked meanwhile (`L.eigWant`) and `hxGuardTick`
applies it once the loop's pass reaches `guardK` (the Gärtner, Etappe 3, takes the same hook). „Eine Runde“ (`hx.runde`,
off by default, in the card's settings): a punch in „dieselbe Schleife“ ends by itself one pass after its press
(`P0.end`, the processor told 30 ms ahead) – its Schichten a group as any punch's.

### 6.5 States and clearing
`stumm` (phase runs) vs `angehalten` (re-enter from its start on the next 1) exactly as KONZEPT §2.5. Stille
(`panic`): all Schleifen `angehalten`, buffers kept, toast "N Schleifen angehalten · Weiter · Leeren". Löschen: one loop
(card) → Humus graveyard (session); alle leeren (↶ hold 1.5 s). Undoable.

### 6.6 History
One Hexenring history (content steps: new Schleife, Schicht, harvest, re-cut, delete, sound/follow change, Erstarren,
Verdoppeln, Zusammenlegen). Mute, level, Lichtung switches are performance and not in it. ↶ cancels the user's own
newest pending action first. ↷ next to ↶ for 8 s. Depth limited only by the memory cap (oldest states reclaimed). The
patch undo (`HIST`) stays separate; the toast after a Hexenring undo says "Schleife: …".

**Acceptance (Playwright, see §22):** every row of the grammar and rule tables, the precedence list, stumm vs
angehalten re-entry phases, Stille → Weiter / Leeren, alle leeren + undo, tempo release.

**As built (step 1b).** The whole grammar is on the main thread (`hxKorb`, `hxHaupt`, `hxRingTap`, `hxUndoStep`, …); every
start, entry and swap reaches the processor as a frame of its own clock. Where the build fills in the letter (each
measured in t-hx-ernten 33/33 and t-hx-grammar 30/30):
- **Korb plan** (`hxKorbPlan(T)`, recomputed 4×/s for the label): with a Takt – a tap ≤ min(⅛ bar, 250 ms) after a bar line
  takes N bars up to it and enters at once in phase; later, N bars up to the next bar line, entering there (pending,
  „ab Takt N“, a second tap or ↶ cancels); the player stopped (rest ≥ max(1 bar, 2 s) after the ring end) – the bars of
  the phrase with its ring, from its start on the next 1. Without a Takt – a repetition: the running cycle, entering where
  it ends (anchored at the first note of the first repetition); none: from the first note after ≥ 1 s without a note
  sounding to the tap (or to the phrase's ring end when stopped ≥ 2 s), from its start right after the tap (40 ms ahead).
  „Sounding“: a held voice until its release; a struck one (no release) 0.25 s, then the input level (≤ −55 dBFS).
  Nothing in the Humus: a hint. Eight loops (mode neu): „voll“.
- **Length** (auto): N ∈ {1, 2, 4, 8} scored +3 when the repetition's cycle is N bars (+1.5 a multiple), +2 for a phrase
  boundary at its start (the phrase begins in its first bar – or a repetition's cycle begins there), −2 when it cuts a
  phrase that began earlier, a slight prior for 2 and 4, −¼·log2 N. „fest N Takte“ and „wie Schleife 1“ as options.
  Ernte-Länge for the first free loop comes from the Takt finder (§12.1).
- **Precedence:** the Korb during a recording or a wait replaces it; a second tap over the same window (same end within
  60 ms, < 20 s later) is no second Schleife (a re-cut when its start differs); a second tap on a waiting harvest cancels.
- **Seam of a harvest** (§7 basics, the Werk-Rahmen's tail render follows in step 2): a probe of 40 ms at the window's
  start and after its end decides cold (start ≥ 10 dB under what followed, and ≥ 30 ms of Ausklang) → overlap-added
  Ausklang, else the crossfade (40 ms for sustained sound, else 10 ms, never into the next onset) with measured ρ; the
  Ausklang ends 5 ms before the first foreign onset (≤ 6 s).
- **Hauptknopf:** start takt (the bar line; within the grace the one just passed, from the Humus), ton (the first note of a
  captured source; with a Takt its bar line), sofort (with a Takt: its bar line); without a Takt the window starts at the
  first note after the press (≤ 1.5 s). With a base length (the first Takt loop, or „fest“) the Schleife is made at the
  start and enters at its end (×1/×2/×4 chips while it waits and records); a tap during it closes at the next bar line;
  without a base a tap closes there; without a Takt at the tap (Takt finder). Held ≥ 0.5 s and ≥ a beat: release closes
  (with a Takt at the nearest bar line). An empty ring tapped records into it.
- **„dieselbe Schleife“:** the Hauptknopf punches the Fokus from the press frame (10-ms smooth gate), one Schicht per pass
  (`join 'cut'`: the group's sum is continuous by construction), each entering at the start of the pass after its own;
  one history step per punch; the Korb layers by the retro rule. Without a Fokus it records a new loop.
- **Retro rule / „→ N“:** decided in the last ¼ of the target's pass → this pass, entering at its end (pending); else the
  pass just completed, entering at once (10-ms fade-in). „→ N“ uses the harvest's press time; the harvest is undone.
- **States:** a ring tap within min(⅛ bar, 150 ms) after a bar line acts there (now), else at the next one (pending, a grey
  wedge); a Frei loop without a Takt at once (40 ms). angehalten → from its start on the next 1. A hold (0.5 s) or a
  vertical drag (> 12 px: level) takes the press's action back (pending cancelled, a fade reversed).
- **Stille:** the toast „N Schleifen angehalten – … · Weiter · Leeren“ (`toast()` takes two actions now); the Hauptknopf
  shows ▶ („weiter“) while any is angehalten after Stille; Weiter = all from their starts on the same 1.
- **History:** content steps (harvest, Schicht/punch group, re-cut, delete, alle leeren, Zusammenlegen, Zurückholen); a
  correction's undo goes back to the exact earlier audio at the next seam. ↶ cancels the newest pending action first (and
  a waiting recording), held 1.5 s (a red ring fills) = alle leeren; ↷ for 8 s. Snapshots keep the page's copy of the
  audio; a step whose audio was still being recorded redoes as a re-cut from the Humus. The memory cap reclaims the oldest
  steps' audio first.
- **Tempo release:** the last Schleife gone while one gave the tempo: it is held 8 s (`TG.keep`) with the chip „Tempo
  behalten · 91“; not tapped, it goes back to the slider.
- Not yet: `HX.lat` (Spielverzögerung, „Klopf mit“), count-in by vibration or click (`hx.ein`, `hx.klick`), the guard
  against Eigensinn changes after a Schicht (nothing varies yet), „eine Runde“ for punches – later steps.

---

## 7. Seams

- **Margins:** every Schicht stores `pre` (½ bar or 1 s from the Humus before phase 0) and `post` (½ bar or 1 s).
- **Cut choice (Nahtwahl):** the musical phase stays on the bar line; the buffer cut may rotate within the margins
  only inside material confirmed as a repetition (§12.1b); else cut at phase 0. Forbidden zones: 5 ms before to 60 ms
  after an onset, where onsets = note list ∪ audio onset detector (spectral flux on the grabbed window, per-source
  attack offsets for bowed/blown/swelling sources: Harz, Halm, Böe, Moder swell, Glut).
- **Joining:** at each seam the previous pass's continuation (its Ausklang) overlaps the next start:
  - cold start (start holds no ring-in, ≥ 10 dB below the continuation): overlap-add the Ausklang;
  - warm start: smooth equal-power crossfade 10–40 ms, law moving toward equal gain with measured correlation.
  - First-pass rule: at the end of the recorded pass the live voices still ring; the processor adds no Ausklang at the
    first seam.
- **Ausklang source:** the Humus after the window end, until the first foreign onset (new note on any captured strip
  or an audio onset not explained by the tail's decay); at that point: if the loop has notes, the remaining tail is
  rendered from the cut-off notes in the Werk-Rahmen (§8) and spliced behind a 30-ms crossfade; otherwise fade it over
  30 ms.
- **Auftakt:** notes and audio in the ½ bar before phase 0 are laid onto the end of the loop only if the end window
  holds no onsets; else offered as a chip "Auftakt anfügen".
- **Stop:** a stopped/angehalten loop plays its stored Ausklang once. Stille additionally flushes echo/hall (as today).
- **Wuchs ties:** notes held across one seam ring on (pass k's voice rings in its tail). Notes held ≥ the loop length are
  re-struck per pass (limit; documented).

**As built (step 1c).** `hxProbe` runs once the window's end and the room after it have sounded (w1 + Zc + 85 ms): it
grabs both regions (the start and what followed the end), decides cold/warm (the start ≥ 10 dB under the continuation and
≥ 30 ms of Ausklang → `ola`; else `xf`: 40 ms for sustained sound, 10 ms otherwise, never into a foreign onset), the
Nahtwahl and the gain curve, and sends `{aus}`.
- **Margins** as in 1b (½ bar or 1 s each side).
- **Nahtwahl** (`hxNaht`): only where the repetition is confirmed – the notes after the window's end are those after its
  start, one length later; the seam then moves forward by `zo` ∈ (0, Zc], Zc = min(½ bar | 0.5 s, 0.4 · length, post −
  0.1 s), to the quietest place where both sides agree (cost = power · (1.25 − ρ) · a small distance penalty), taken only
  when ≥ 1.3× better than the bar line. Forbidden: 5 ms before to 60 ms after any onset of the notes ∪ the spectral-flux
  detector (FFT 512, hop 128, on the grabbed audio) – the latter shifted by a per-source attack (`HX_ATT`: Harz 0.25 s,
  Halm 0.12, Böe 0.4, Moder 0.3, Glut 0.3, Kehle 0.06, Amöbe 0.05). The musical phase stays on the bar line. t-hx-seams:
  a strike on every bar line in a repetition → the seam 419 ms in, its fade clear of every zone; no repetition → 0.
- **Time-local level** (owner's step-1b point: the Gong dipped to −1.7 dB): `hxSeamK` computes K + 1 gains over the fade
  (one per 32 frames; 1 at both ends) so the output's short-term power (10-ms Hann windows, stereo) equals the
  equal-power blend of the two sides' own there; four iterations, smoothed twice each, clamped 0.5–2; the processor
  interpolates it. It replaces the single-ρ law wherever a curve is sent (seams, the bake swap, the Ausklang splice);
  the ρ law stays for gestures without a probe. t-hx-seams, 10 random runs each of Gong, Harz, Bordun and Böe material
  rendered by the app: short-term RMS within −0.85 … +0.75 dB of the two sides at every seam (±1); third difference ≤
  1.26× the material's – normalised by the curve's largest gain (up to 1.44 on an anti-correlated Bordun seam: holding
  the level there lifts both sides, a slow gain and no click; un-normalised one run of ten reached 1.51).
- **First-pass rule** as written: the first pass (its seam is the window's end, the live voices still ringing) plays the
  start alone (t-hx-seams: exact), every later one the start + the Ausklang (exact).
- **Ausklang until the first foreign onset:** a note of a source the Schicht captured (`hxForeign`), or – a loop without
  notes – an onset of the flux detector in the audio after the window's end (`hxAusWatch`, four times a second); cut
  5 ms before it, 30-ms fade. With notes the rest is rendered (`hxTail`): the notes that sounded into the window's end
  (struck up to 12 s before it, held ones with their curves) in the Werk-Rahmen's `tail` job with the patch, the quality
  level, the Jahresring's age and season and the mask; level-matched on the 60 ms before, spliced behind a 30-ms
  crossfade with the seam's own gain curve (a plain equal-power fade bulged +1.9 dB: the render is the same notes'
  sibling, partly correlated), until −90 dB or 12 s. Measured: −31.0 → −31.5 → −31.2 dBFS through the splice.
- **Auftakt** (`hxAuftaktPlan`): notes struck in the h = min(½ bar | 1 s, ½ length) before phase 0 after a ≥ 0.3-s rest
  (a note held on into the window is the window's own); laid onto the end as a Schicht of its own (kind `auftakt`, read
  from len − n to len) only if the end's last h holds no onset (notes ∪ flux); else the chip „Auftakt anfügen“ (the rail's
  chips and the card).
- **Stop:** angehalten at its seam the loop plays its stored Ausklang once; the Ausklänge of the passes before ring out
  with it (t-hx-seams: within 1.5e-9 of the sum, then silence).

---

## 8. Werk-Rahmen

**Boot.** `hxWerk()` creates `<iframe hidden src="<location without hash>?werk=1">` (same origin; on `file://` it is a
unique origin – everything goes through `postMessage` with transferred ports, never `contentWindow` access). In the
child, `?werk=1` means: no UI build (or a minimal hidden DOM), no storage writes, no MIDI, no Gestik, no live
AudioContext, no service worker registration; it exposes a message API on a transferred MessagePort.

**Determinism setup in the child.** At boot: seed all lazily built shared state with fixed seeds and build it eagerly:
`A.uni`, drift buffers, Schwarm chirp buffers, Körner textures (await), KS cache: exact buffers computed synchronously
(no neighbouring-buffer substitution in werk mode), Jahresring: age/season passed in the job, wall-clock rate limit off,
Gespinst: one own web per render context, built and awaited before rendering, Rhizom: own net per render.

**Jobs** (`{job, id, …}` → replies on the port; audio transferred):
- `bake` – `{audio: [L, R], sr, chain: {snapshot, lanes, lfoPhases, t0}}` → the audio through the chain copy with the
  recorded settings/automation and LFO phases; returns `[L, R]`.
- `wuchs` – `{notes, params (snapshot of every P the involved engines read), q (quality level), seed, dur, tail, sr,
  phaseMods (vibrato/drift/uni phases at pass start), stream: port?}` → renders an OfflineAudioContext of
  `dur + tail`, either returning buffers or streaming blocks of 8192 frames to `myzel-ring` through the given port with
  pacing (`suspend` every 0.25 s, keep ≤ 1.25 s ahead of the live frame reported by `myzel-ring`).
- `tail` – like `wuchs` for the cut-off notes of an Ausklang (§7).
- `ping` – health.

**Isolation acceptance (port `check-engineer-experiments/c1-swap.js`):** while the Werk-Rahmen renders Gong, Gespinst,
Elmsfeuer, Jahresring and Rhizom jobs, the live instrument keeps every voice (no steal), its Gespinst web, its Rhizom
charges, its Jahresring age, its `A.elmDrift`; live underruns not increased (headless check: callback gaps).

**Fallback** (no iframe, e.g. a sandbox forbids it): bake disabled → loops play via out1 (follow the live chain) with a
note in the card; Wuchs unavailable → Live mode (§10.6) offered instead.

**As built (step 1c).** `HXW.on` (`?werk=1`) is read before anything else: `store.set` refuses, the boot builds no UI, no
MIDI, no Gestik, no live context, and `pwa/build.py` registers no service worker there; `hxwBoot` answers on the
transferred port (`ready`) once its shared state is built: `hxwShared` with fixed seeds – `A.uni`, the drift buffers,
Schwarm's chirps and flutter, Klangbrett's knock, Obertöne' walk, Elmsfeuer's loops, Jahresring's impulses, Zupf's
buffers, the Körner textures (awaited); the KS cache exact (no neighbour substitution), Jahresring without the wall
clock (age and season from the job), Gespinst and Rhizom one own web / net per render. Every job seeds `Math.random`
(xorshift) from its seed. Boot: 204 ms to `ready` here; started by the first job (a harvest's bake or tail: `hxwCall` →
`hxWerk()`), the parent gives up after 4 s without an answer (45 s overall) → fallback. Jobs: `ping`; `bake` (§9); `tail` and `wuchs` (`hxwNotes`: the
whole app graph built offline via `initAudio` on `HXW.ctx`, tapped at `A.hxIn0`; notes, curves and releases at
`suspend`s per block; grains and Rhizom ticks every 25 ms; returns L/R from `from`) – streaming to the processor comes
with Wuchs (step 4). Isolation (t-hx-werk, the c1-swap port): a full live budget (39 Nebel notes, load 39.93 of 40) keeps
every voice while 12 Gong voices render; the live Gespinst web, `A.elmDrift`, the Jahresring's age and season and the
Rhizom's queued charges stay; no live callback gap > 30 ms more. Determinism (same seed twice, level 3, a phrase):
26 of 28 sources within −100 dB (worst Gong −102.7; Halm, Ranke, Sehne, Kehle bit-exact). **Exceptions (for the
owner):** Schwarm (+0.7 dB – a different performance) and Tropfen (−94.5 dB): Chromium sums three or more connections
into one input in no fixed order; the ulp differences are amplified by Schwarm's chaotic FM loop and Tropfen's chirped
droplets (reproduced in a plain page; a rewiring of Schwarm's fan-in did not remove it and was reverted). Render time
per second of audio (level 3, a 4-note phrase): median 0.062 s, max 0.134 s (Harz, Schwarm); a bake ≈ 0.05 s per
second. Fallback (t-hx-werk: the frame's URL blocked): the bake is off, loops play dry through the live chain (out 1),
the card says „Einbrennen und der Ausklang aus den Noten gehen in dieser Ansicht nicht (kein Werk-Rahmen): Schleifen
folgen der Effektkette.“

---

## 9. Abdruck bake and Taumeln

- **Chain state recording:** the main thread logs, in the Humus timebase, the chain-relevant values: `fx.*` params of
  drive, ring, filter (type, cutoff, res, LFO rate/depth), phaser, chorus, Kreisen, their mod-layer deflections
  (`modVal`), and the start time and rate history of every chain LFO (to derive phases). Snapshot at window start +
  change list.
- **Bake:** on harvest the grabbed dry Abdruck (with margins and Ausklang) is sent to the Werk-Rahmen `bake` job; the
  result replaces the dry Schicht at the next seam (`{replace}`), and the loop moves from out1 to out0 at that seam
  (crossfade). Until then the first pass plays dry through the live chain (out1) – indistinguishable because the chain
  state is still that of the recording moment.
- **Option per loop:** "folgt der Effektkette" keeps it on out1, unbaked.
- **Taumeln per loop** (`loop.taumeln`, default on): `A.driftSrc` is deterministic (buffer + `driftRate` history), so the
  main thread knows the drift `d_rec(t)` at recording and `d_now(t)`; for an Abdruck loop it sends `{rate:{cents:
  d_now − d_rec(phase)}}` updates (ramped, ≥ 10 Hz) and the processor resamples by that ratio. Off: no compensation, the
  loop keeps its recorded tuning. For Wuchs: on = render with the live drift phase; off = render with drift 0.

**Acceptance:** after harvest, sweeping the live filter does not change a baked loop (spectral check); a loop recorded
with the filter LFO running and baked shows the same LFO phase as the recording (correlation ≥ 0.99 of the envelope);
with Taumeln on, a held A4 in a loop and the same live note beat < 0.3 Hz.

**As built (step 1c).** Chain state: the chain's `upd*` functions log every change (`HXL.ev`, Humus time: drive, ring,
filter, phaser, chorus, Kreisen) and the mod layer's deflections of filter, phaser, ring, pan and chorus as ramps and
points (`HXL.mod`); LFO phases from their start time (`A.lfoT0`) and rate history (`HXP`). `hxChainRec(ta, tb)` → a
snapshot, the changes, the mod lines, each LFO's phase at the window. The `bake` job renders the dry Abdruck (pre +
len + post + Ausklang) through `makeChain` in the Werk-Rahmen: the snapshot set at once, the changes at their frames
(`suspend`), the mod lines as ConstantSources, each LFO a PeriodicWave started at its recorded phase. The baked version
replaces the dry one at the next seam (`hxSchPlay`: out 1 → out 0, the seam's crossfade with its gain curve), is saved
beside the dry (§19), and re-made when a re-cut changes the audio. „folgt der Effektkette“ (`hxFolgt`) keeps or puts the
loop on out 1, dry; Zusammenlegen asks for baked Schichten first (or folgt). Taumeln: the letter's main-thread estimate
of the drift was replaced by the processor's own input (§3) – a model of the AudioBufferSource's playbackRate integral
was off by up to 0.9 s of the drift buffer live; the processor reads the drift that really sounded. Measured
(t-hx-bake): baked vs the live chain heard then −46.5 dB sample for sample; LFO envelope correlation 0.9999 (it swings
7.7 dB; shifted 0.15–0.4 s it would be ≤ 0.21); a baked pass after the live filter, ring and drive moved, and while a
preset loads: identical (0 difference); folgt: the filter's 400 Hz → 6 kHz moves it (brightness 310 → 925 Hz); the
swap out 1 → out 0 at a seam: third difference 0.97–0.99× mid-pass, RMS −0.42 … +0.89 dB; Taumeln on: a held A4 against
the same live note beats 0.001 Hz (drift ±8 ct at 2.5 Hz); off: up to 1.7 Hz.

**As built (step 1d): one resampling per loop.** (a) **Summed reads.** `span()` groups the reads of a loop that have the
same rate and the same fractional phase, per output pair and class (under the state's gain / free): their sources are
summed sample by sample into a scratch chunk (`grp`/`grpRun`) and resampled once – the resampler is linear, so this is
their sum read one by one (t-hx-taumeln: four Schichten at a loop rate of 17 ct, −143 dB from step 1c's way). A read
whose gain moves within the span (a fade, a seam's crossfade, a version crossing), one that enters mid-span or reads at
rate 1 (bit-exact copy) reads on its own as before. The loop's own rate (MIDI clock nachführen) is shared at once.
(b) **De-drifted Schichten.** Taumeln gave every Schicht a rate of its own (the drift now against the drift *it* was
played with), so none could share. Each complete version of a Schicht is therefore de-drifted once, offline, in the
processor: `ddAsk` (a fill complete, or the page's audio; a dry version that will be baked waits for its baked one –
`dd: 0`) → the page lends the chunks (`{ddReq}` → `{ddGo}`) → `ddJob` after every other job (φ' = 2^(−d(φ)/1200),
anchored at the pass start `pre`; knots every 32 frames by midpoint steps, backward through `pre` and forward to the
source's end; the 160-tap kernel of the restore conversion at 0.97 of Nyquist; 64 frames a quantum – 256 overloaded
this machine's audio thread until scheduled notes stayed silent) → `S.ddN`, taken over at the Schicht's next pass start
(`ddAdopt`: the old version goes on as that seam's continuation and in the Ausklänge already ringing, read as before,
then back to the page). A de-drifted version reads at the live drift alone (`dvF`), so a loop's Schichten share one rate
and (a) sums them; its own drift re-indexed (`dr0`) serves Taumeln off until the next seam (below) and the reads of versions it replaced
(`rX`). A
new version (a bake, a re-cut, ↶) reads as played until its own de-drifted one comes. Taumeln off: from the next seam each
de-drifted Schicht gets its own audio back from the page (`hxTauOrig`) – as recorded, bit for bit, read without
resampling (the de-drifted version read against its own drift would be resampled and ~ −69 dB off); a job finished
meanwhile is dropped (`advance`); Taumeln on again: de-drifted anew. The page keeps the original audio
– storage, undo, bake, re-cuts are unchanged; the de-drifted version is the processor's alone, made again after a
reload. **The sound.** Measured against the exact path (analytic tones, the drift as the processor reads it): the
de-drifted read −69 dB; step 1c's read, which took the drift at each span's start, lagged it by up to ½ frame (−30 dB at
±8 ct, 2.5 Hz) – it now takes it at the span's middle (−59.6 dB; that is also what plays before a version is
de-drifted); no click where it takes over (the largest step around each pass start 1.00× step 1c's). Two places differ
from step 1c by design and are more right, not less: the Ausklänge and a seam's continuation after the pass end are
de-drifted along their own time (step 1c read them at the drift of the new pass's start), and the span reads the drift
at its middle. A Schicht that enters mid-pass (an Auftakt: `pre` < 0, its anchor before its buffer) is integrated forward
from the anchor to its first knot; a job whose knots or frames are not finite is dropped, never taken over (t-hx-fuzz
found that case: the Auftakt's de-drifted version came out NaN). A version replaced while an Ausklang still reads it is
kept (`S.park`) until none does (step 1c gave it back at once – a detached buffer reads as NaN), and what a span gives
back to the page goes only after its summed reads (`gvQ`: an Ausklang ending in the span had its last read waiting in
a group when its version went back – the fuzz's second NaN). (c) **Cost**
(§21): a loop counts one resampling per output once its Schichten are de-drifted (before: one per Schicht); a de-drift
job counts `HX_COST.dd` while it works (one at a time).

---

## 10. Wuchs

### 10.1 When a Schleife grows
- Start setting `hx.beginn = abdruck | wuchs` (owner: a setting; default abdruck).
- Automatically when it must follow (key, tempo, sound change), when Eigensinn > Treu, after Auslese-consensus or a note
  tool (§14), or when the user chooses "Wuchs" in the card.

### 10.2 Quality setting
`hx.stufe = gespielt | 1 | 2 | 3` (owner: manual; default 3). "gespielt" = the level the loop was played at. Rendered
in the Werk-Rahmen with `Q = QP[n]` (no `A.lite`, budget ∞).

### 10.3 Render plan
- **Treu:** render once per change (seed fixed), store as the loop's Wuchs Schicht(s), then play like an Abdruck.
- **Lebendig and above:** per pass, a new seed per pass (Lebendig: notes fixed; Variieren/Wandern: notes from §12.2);
  streamed ≈ 1 s ahead; each Schicht its own stream (so undo/mute are instant) or, if streams > 4 per loop, a summed
  stream plus each Schicht's Abdruck kept to bridge an undo until the next re-render.
- **Wurf/✓:** a rendered pass's `{seed, notes}` can become the anchor (exact); a live pass is kept as its Abdruck.
- **Note (step 1d, for 2a/3):** ✓ (Lob) keeps a rendered pass by storing its **audio** as the anchor – the pass as it
  sounded, an Abdruck – not its `{seed, notes}` for a re-render: Schwarm and Tropfen do not render bit-identically from the
  same seed (§8 As built 1c), so only the audio is what was praised.
- **Tails:** each pass renders `dur + tail` (tail = until −90 dB or 12 s max); overlapping passes are summed by the
  processor (k streams).
- **Late blocks:** if a block misses its frame, the processor plays the loop's last complete pass at that position –
  except right after a follow change (key/tempo): then it fades the loop out until the new pass arrives (never the old
  key against the new harmony).
- **Pacing** follows the live frame reported by `myzel-ring`, not wall time.

### 10.4 Following
- Key/scale: per loop `folgt = diatonisch | transponieren | fest` (default diatonisch). A scale/root change while loops
  play is announced: "Schleifen folgen ab Takt 9 · ✕"; the field's change and the loops' change land on the same bar
  line (option `hx.tonartAmTakt`, default on) at the first seam ≥ lead away; long loops may switch at a rest inside the
  pass.
- Tempo: a loop with notes switches to Wuchs at the tempo change point (pre-rolled render heard from that point).
- Sound: per loop `klang = eigen | feld`; card: any of the 28 sources.

### 10.5 CPU guard (owner rule)
`watchUnderruns` must no longer cut the live budget or set `A.lite` because of Wuchs load. New order on an underrun:
pause Lebendig renders (loops fall back to their cached Treu/Abdruck) → reduce concurrent streams → only then (and only
if no Wuchs ran) the old behaviour. Predict render time from `CAL.unit` × load × duration; refuse to start a living
render the device cannot sustain (card: "lebt, sobald Rechenzeit frei ist").

### 10.6 Live mode (Etappe 4, and fallback)
Notes replayed through real voices scheduled ahead in `tick()` (like the Puls), `o.bus = stripIn('hxr')`, `v.loop =
true`; loop voices are stolen before live ones (`steal` prefers `v.loop`); MIDI out of loop notes optional.

**Acceptance:** Wuchs-vs-Wuchs identity (same seed) ≤ −100 dB for the 22 sources that pass today, and after the state
work also for Körner, Saite, Schwarm, Gespinst, Jahresring, Tropfen (or documented exceptions); the live instrument is
untouched during renders (§8); key change: no pass in the old key after the announced bar; undo of a Schicht in a living
loop is inaudible within 10 ms.

---

## 11. Audio loops on a tempo change (owner: "what makes most sense")

Loops without notes (source Alles/Mikro, or a Gespielt loop whose notes were dropped):
- classify at harvest: **rhythmic** if ≥ 4 onsets per bar with pulse clarity ≥ threshold (autocorrelation peak/mean of
  the onset envelope), else **Fläche**;
- rhythmic → **Schnitt:** slice at onsets (each slice from onset to the next onset, plus its natural decay into the gap
  as available), re-place slices on the new grid (beats), crossfade 5–20 ms at overlaps, fill gaps with the slice's own
  decay; never time-stretch;
- Fläche → keeps its length and runs **frei** from that point (its ring shows "frei").
Acceptance: a recorded drum-like loop re-placed at ±10 % tempo stays on the grid (onset error ≤ 2 ms) with no slice
pitch change; a pad keeps its exact samples.

---

## 12. Intelligence

### 12.1 Ohr (Etappe 1 unless noted)
- **a) Takt finden** – `research/intelligence.md` §5.1a: score `S(n)` over beat counts with onset fit (σ 25 ms,
  velocity-weighted), IOI histogram, accents (loud/low on downbeats), tempo prior (log-normal at 100 BPM; later the
  Handschrift's), bar prior (1/2/4/8; 3/4). Top-1 used, top-2/3 as corrections. Pulse clarity low → frei.
- **b) Wiederholung** – suffix of ≥ 5 events / ≥ 1 s matches the start or the previous cycle: same degree (or interval)
  sequence, IOI ratios ±15 %. Drives the Korb light and the repetition length; optional auto-close (`hx.autoclose`).
- **c) Auslese** – k ≥ 3 repetitions aligned by DTW on (onset, degree); clusters present in ≥ ⌈k/2⌉ survive with median
  timing/velocity. Etappe 1: offer the real repetition closest to the consensus (exact Abdruck). Etappe 2b: the
  consensus itself (Wuchs). Chip "Auslese aus k · p %" (p = agreement), only if p ≥ 80 %; never automatic.
- **d) Groove** (2b) – template per metric position (mean offset, velocity, spread), swing ratio; quantise
  `t' = grid + (1 − q)·δ + q·template`, q default 0; "Puls übernimmt Groove".
- **e) Spielverzögerung** – §2.

**As built (step 1b): a) and b).** `hxTaktFinden(onsets, L)`: n = 3…64 beats in meters 4 and 3 (whole bars), 40–220
BPM; S = 3·fit (onsets on the beat or ÷2 ÷4 ÷3, weights 1/.8/.55/.5, σ 25 ms, velocity-weighted) + 0.6·fit on the beat +
1.5·IOI agreement (T, T/2, 2T, T/4, 1.5T) + 4·accent (loud and low onsets on the candidate's downbeats vs all) + 0.3·tempo
prior (log-normal at 100, σ 0.45) + 0.6·bar prior (1/2/4/8; 3er −0.4); weights fitted on t-hx-ohr's phrases. Clarity =
the best's mean fit; < 0.55 → frei. The length is refitted from the onsets near beats and half beats (`hxTaktLen`, ±8 %):
the tap's error does not become the tempo. Measured (t-hx-ohr, 360 phrases 60–180 BPM, six patterns incl. a waltz, 1/2/4
bars, ±25 ms humanised, the window's end ±40 ms): top-1 85.0 %, top-3 100 %, octave errors 15.0 % (all at 60–96 BPM: an
even line of eighths at 60 is a line of quarters at 120 unless its accents say otherwise – „Tempo ½ · ×2“ is one tap), the
fitted length mean 9.6 ms off (max 47 ms); random onsets read frei 39/40, a steady line clear 40/40. Known limit: a short
rubato phrase (≈ 7 notes in 3 s) can find a grid by chance at one window length and not at the next (clarity 0.35–0.64
for the same phrase as the tap moves by 10 ms) – then the loop is a Takt loop of that tempo, its length within ±8 %;
„Tempo ½ · ×2“ and ✕ undo it. More notes make it sturdier. `hxWiederholung(onsets)`: chords
within 30 ms are one event (degrees, or the same intervals when transposed); the suffix of max(m, 5) events, ≥ 1 s, equals
the events m before with every IOI within ±15 % – the smallest such m with a cycle ≥ 1 s; the region reaches back to the
first repetition's first note (its anchor); „the start“ variant for auto-close (`hx.autoclose`, default off) and for a
phrase whose second cycle has begun. It drives the Korb's light (lumen; not when the cycle is in a Schleife already: its
degrees as a rotation of a loop's notes, or harvested from this very playing) and the lengths above.

**As built (step 1c): the margin.** `hxTaktFinden` also returns `margin` = the best reading's score minus the best
reading *of another pulse* (a grid whose beat count is not the best's × 2^k – the same grid at half or double tempo or in
the other metre is no rival; the corrections offer it). `hxTaktOk(tk)`: clarity ≥ 0.55 and margin ≥ 0.8 (`HX_MARGIN`),
else frei – in every harvest path. Fitted on t-hx-ohr's 360 phrases (it keeps 291 of the 292 that read clear) and 2000
short free phrases (2–6 notes, every IOI free 0.12–1.2 s, the tap 0.3–1.5 s after the last): a chance grid 548 → 232
times (11.6 %). By notes: 2 – never (fewer than 3 onsets), 3 – 30 %, 4 – 16 %, 5 – 8 %, 6 – 5 %. Three notes stay the
hardest: a bar of three quarters must still read as one.

**As built (step 1d): c) Auslese, Etappe 1.** `hxAuslese(cycles)` (k ≥ 3, each a list of `{t, d, v}`): the medoid
cycle by summed DTW cost (`hxDtw`: onset distance in 50-ms units, capped at 2, + 1 for another degree; gap 1.5) is the
reference; every other cycle is aligned to it, matched pairs (cost < 1) form clusters; clusters present in ≥ ⌈k/2⌉
cycles survive with median time and velocity – the consensus; p = the mean F-measure of each cycle against it; `best` =
the real cycle closest to it (DTW cost, the later one on a tie). `hxAusleseFor(L, rep)` once the harvest's window has
sounded (its repetition `L.rep` from the Korb's plan; the cycles stepped back by the period while the repetition and the
Humus reach): from p ≥ `HX_AUSL_P` (80) and when the best is not the harvest itself, `L.ausl = {k, p, w0, w1}` – the chip
„Auslese aus k · p %“ in the harvest's row and a button in the card; never by itself. `hxAusleseDo`: that repetition's
window from the Humus becomes the Schicht at the next seam (`hxSchSwap`, ↶ goes back). Measured (t-hx-ohr): synthetic –
a wrong note and a sloppy cycle among 4 → the consensus is the figure (median timing within 3 ms), p 97 %, a clean cycle
chosen; a missing note stays in the consensus; unrelated cycles p ≤ 25 %; k = 2 none. Live – four bars, the last sloppy
(every second note 30 ms late): the Korb takes the last bar, „Auslese aus 4 · 100 %“ offers bar 3; tapped, its audio;
↶ back; a line that never repeats offers nothing. (The consensus itself as Wuchs: 2b.)

### 12.2 Eigensinn (Etappe 2a: Treu/Lebendig; Etappe 3: Variieren/Wandern)
- Lebendig: new seed per pass; timing breath: offsets from the loop's groove spread × ⅓ with 1/f-like noise (pink by
  Voss-McCartney), seeded per pass.
- Variieren: operators on weak positions (neighbour degree ±1/±2 keeping contour sign, Euclidean redistribution keeping
  onset count, thinning by metric weight × velocity, filling with passing tones between notes ≥ a third apart, octave
  displacement within the source's range, ornaments incl. Wirbel); 16 candidates per pass, score
  `α·consistency + (1−α)·novelty + β·fit − γ·repeat`, softmax with temperature by step, seeded; elastic return to the
  anchor with probability ∝ distance × (1 − step).
- Wandern: plus half-bar swaps with matching boundary degrees (factor-oracle jumps over the session's material).
- ✓ (Lob): current pass (seed + notes) → anchor. ✕: revert to anchor at the next bar; operator weight × 0.5 for the
  session; two ✕ in 4 bars → Treu for 8 bars (countdown on the ring). ⚓ in the card: back to the original at once.

### 12.3 Gärtner (Etappe 3)
Steps `schaut zu` (default) · `pflegt` · `antwortet`, cumulative; `hx.gaertner`. Rule: Eigensinn is the ceiling – the
Gärtner may only change gain/mute of a Treu loop.
- Roles per loop (Bass, Akkorde, Melodie, Fläche, Schlag): hand-tuned weighted score of median pitch, polyphony,
  duration/beat, density, strong-beat share, pitch range, source art (`ENG_META[k].art`); confidence; user override in
  the card. Live role over the last 1–2 bars.
- Platz machen: live energy `E` (notes/s, velocity, register, polyphony, Ladung; smoothed); loops with Eigensinn ≥
  Variieren thin/fill accordingly; others only gain (−0…−4 dB).
- Die anderen spielen: as KONZEPT §5.3, bar-line changes with one bar hysteresis, 20–50 ms equal-power fades.
- Antworten: phrase segmentation (LBDM-style boundary score, gap > max(0.3 s, 2 × median IOI)); variable-order Markov /
  factor oracle on tokens (degree interval, duration class, metric class; fallback contour); beam search with
  constraints (length ±1 bar of the call, start on the next beat, end on a stable degree on a strong beat, ≤ 6 tokens
  verbatim); voice = the source of a chosen loop or the field; silent below 40 events (or Handschrift); yields when the
  player resumes. Rendered via Wuchs (or Live).
- Begleiten: per bar Viterbi over "Klangfelder" (2–4 tones of the current scale), emission = melody tones on strong
  beats, transition = smooth voice leading + Handschrift progressions; **Klangverwandtschaft**: Sethares roughness
  over partial pairs of the melody source and the accompanying source (partial tables ≈ 10 partials per source/body,
  measured once with the bench and stored as a constant table `HX_PART`). Result: suggestion loops (dashed, muted).
- Wiederkehr: only loops marked "darf wiederkehren"; activation from oracle matches of live phrases, half-life 8 bars,
  threshold → returns at the next 4-bar line, announced a bar ahead; never a loop muted by the user in the last 8 bars.
- Puls lernt: fit Euclidean (steps 8/12/16, pulses, rotation, Raster) to a Bass/Schlag loop's onsets by Hamming distance;
  most frequent degree; writes the lane's params on request.

### 12.4 Knospen (Etappe 3)
Field overlay: a bud at the top edge of the column of each changed note one bar ahead (canvas, no pointer events);
chains for answers; a forming ring for Wiederkehr. Ringleiste: buds before the playhead, a stance word. Chips
`✕ n · ✓` while plans are pending. MIDI/pedal targets `hx.lob`, `hx.nein`, `hx.anker`.

### 12.5 Handschrift (Etappe 3)
IndexedDB store `handschrift` (≤ 1 MB): token counts (pruned VOM), groove templates per tempo band, tempi/scales/
sources histograms, progressions, operator weights from ✓/✕. Off by default (`hx.hand = aus`); session-end prompt;
Vergessen; export/import JSON.

---

## 13. Form (Etappe 1; Folge and Klang aufs Feld in 2b)

- **Lichtung** `{id, name, loops: {id: {on, gain, eigensinn}}, mixScene?, puls?, rule: 'takt'|'laengste'}`; form
  button tap = next Lichtung at the next 1 (pending visible); hold = row (Lichtungen, merken, Kern, Lücke, Schluss).
  Mixer scenes A/B may carry a Lichtung id; the morph fades only levels.
- **Folge:** `[{lichtung, passes}]`, optional loop.
- **Kern:** a Lichtung flagged Kern; toggles to it and back on the 1.
- **Lücke:** all loops gain → 0 for the last beat (or bar, chip) before the next 1, back on the 1 (hard but with 3-ms
  fades).
- **Schluss:** `ende` (each loop stops at its end with Ausklang), `welkend` (over 4–16 bars: gain, brightness via a
  1-pole LP in the processor, random slice drop-outs), `abbauend` (one loop per pass, youngest first).
- **Schlafen/Wenden** (`slpEnter/slpWake`): loops `angehalten` at their next bar line with Ausklang into the frozen echo;
  on wake: count "3 · 2 · 1" in the field, re-enter on the next 1; long sleep (`SLP_LONG`) only keeps them angehalten.
- **Puls ernten** (2b): in the Puls panel; harvests the last N bars of l0–l3 as a loop (notes + audio from the lanes'
  strips), with "Puls danach stumm?".
- **Klang aufs Feld** (2b): card action – sets `v.eng` (and Ebene 2 if the loop has it) to the loop's source.

**As built (step 1d).** `HX.lich`: `{id, name, loops: {key: {on, g, e}}, rule: 'takt'|'ende', mix, puls, kern}` – kept by
the Schleifen's keys, stored with the session record (`'_s'` in IndexedDB, with `lichCur`) and back after a reload.
`hxLichMerken` takes what sounds now (and, with `hx.lichMix`, the mixer scene – `mxSnapTake`; with `hx.lichPuls`, the
Puls on/off); `hx.regel` is a new one's rule. `hxLichGo(Li)`: the moment from the rule (`hxLichT`: the next bar line ≥
`HX_LEAD`, or the next seam of the longest Schleife; no Takt and only free loops: at once), every state and level sent
for that moment's frames (`hxState`/`hxGain` with `at`; an angehalten one re-enters from its start; the processor ignores
a state change for a loop it is clearing – a Schleife deleted just before the 1, still fading out there, came back on it
before, sounding without a ring and never giving its buffers back: found by the fuzz, t-hx-form checks it), Eigensinn through
the guard, the Puls started just ahead so it joins on that bar line (or `SEQ.stopB`), the scene's values at the moment
(`hxFormTick`); a pending entry `licht` (its cancel puts back what it changed). The form button `#hxForm` at the rail's
right end: tap = the next Lichtung, cyclic (`hxFormTap`; tapped while one waits: cancelled; none yet: the row); held
0.5 s = the row in the rail where the rings are (`HX.chips.kind 'form'`: the Lichtungen as `n · Takt|Ende (· Kern)`,
merken, Kern / Kern ↩, Lücke, Takt-Lücke, Schluss · welkend · abbauend or Schluss ✕); its glyph is the clearing with
the current Lichtung's number (dashed while one waits), its word `ab T n` / Schluss / `L n` / Form, its label says
what a tap does. Kern: a Lichtung flagged in the card; `hxKern` goes there on the next 1 and remembers where from
(`HX.kernBack`), the same gesture goes back. Lücke (`hxLuecke(1|4)`): every playing loop's state to 0 for the last beat
or bar before the next 1 and back on it, fades of `round(0.003·SR)` frames (t-hx-form reads the processor's messages:
out and back exactly there, silent between). Schluss (`hxSchluss`, `hx.schluss`): `ende` – each loop angehalten at its
own next seam (its Ausklang rings); `welkend` over `hx.welk` bars (4–16, default 8) from the next bar line – the
processor's `wilt` per loop: gain on the cos law, a one-pole low pass falling exponentially 16 kHz → 250 Hz, slices of a
sixteenth dropped by a seeded hash with probability 0.7·x^1.3 (3-ms ramps; the same seed renders the same, checked
offline), angehalten at the end (`{wilted}`); `abbauend` – one loop less per pass of the longest, the youngest first;
tapped again: cancelled; Stille cancels it. Mixer scenes A/B carry the current Lichtung (`MX.snap.lch`, stored and
swapped with the scene): both carrying one, the morph fades only the loops' levels (equal power, off = silent) and sets
states and Eigensinn at its ends; one carrying one, crossing half way switches there. Schlafen/Wenden
(`hxSlpEnter`/`hxSlpWake` from `slpEnter`/`slpWake`, not for the art „Szene“, whose scene does it): the playing loops
angehalten at the next bar line – the processor's `state` with `tail`: what sounds rings on, free of the state, fading,
with the Ausklänge still ringing, into the frozen echo; awake: „3 · 2 · 1“ in the field (`HX.wake`) and back on the
next 1; after `SLP_LONG` they stay angehalten. Folge, Puls ernten, Klang aufs Feld: 2b.

---

## 14. Tools (Etappe 2b)

- Tape (Abdruck): speed steps (octaves, fifths; inertia 0.2–2 s; pitch follows; polyphase resampler), reverse at the
  seam, Bandstopp (exp. slowdown over 0.3–2 s as a cadence), Trimmen (sub-loop ½/¼, start shift), Auslassen/Würfeln
  (onset slices, probability, seeded, micro-fades), Verdoppeln (multiply by repetition), Verblassen (gain fb^age per
  Schicht, non-destructive), Abrieb-Band (wear map per position: LP + gain + short dropouts, deepening at the same
  spots, seeded; reversible).
- Notes (Wuchs): transpose by degrees, change source, thin/fill, groove tighten/loosen, retrograde, inversion in the
  scale; Erstarren (a Wuchs pass → Abdruck Schicht).
- Zusammenlegen (Sediment): sum Schichten exactly (float), keep for undo until memory needs it.
- Export: a loop → take (`takes.unshift`) → WAV/ZIP/Körner; notes → Standard MIDI File (format 1, one track per
  Schicht, tempo map from TG).
- Bühnenansicht: switch in the card/panel: big rings, pedal legend, few toasts, sheet only on long press; Setliste
  (presets + tempo + Lichtungen; "nächstes Lied" archives loops to the Humus graveyard and loads the next).

---

## 15. Ecology (Etappe 4; Nähren Gespinst/Körner in Etappe 1)

- **Nähren:** per loop `naehrt: {gsp, kor, rhz, rgn, glt, shn}`.
  - gsp: an own `myzel-web` instance per feeding loop (tuned like the live web, `gspFreqs`), input = the loop's output
    (a send from the processor, out of tap reach), output → `hxr`; cost = `GSP_COST` per instance (counted in
    `voiceLoad` while it rings).
  - kor: loop → `takeToGrains` material (Körner source "Schleife N").
  - rhz: each loop note strikes a Rhizom voice on `hxr` (shares the live net – document; or the loop's own net in Wuchs).
  - rgn: loop notes plant Keime (`rgSeed`).
  - glt, shn: the processors `myzel-ember` and `myzel-string` get an audio input (`numberOfInputs: 1`) and an injection
    point (gain); the loop feeds it through a send; re-measure their cost and the bench rows.
  - Schleife → Schleife: B records A's output each pass with feedback < 1 and a soft limiter (inside the processor).
- **Treffen:** show the next common downbeat of all/each pair of playing loops (LCM of bar lengths; for frei loops the
  common start time within 30 ms). **Treffen setzen:** for frei loops started at s_i, choose lengths
  `L_i = (T − s_i)/k_i` with distinct primes k_i so that no pair coincides before T (verify by enumeration); only the
  silence after each phrase is extended/shortened (loop length = phrase + gap); Fruchten option at T (all anchors, web
  bloom, planned scale change).
- **Einwurzeln:** per pass, the loop's output through an own scale-tuned web, re-recorded into the loop with loudness
  kept (depth per pass 0.02–0.2); retunes with the scale (`gspRetune` analogue); cost ≈ one web.
- **Abrieb-Moder:** per pass, in a Worker: STFT, partials above a falling cutoff gated sparsely with randomised phase
  (crackle at their pitches), low shelf warming; swapped at the seam; clean Schicht kept.
- **Mikro-Schleifen:** mic tap (existing `MIC`, mono → stereo) as in2 of `myzel-ring` (third input added in Etappe 4),
  round trip measured by a click (the `gkKlopf` precedent), echo cancellation off, Bluetooth warning (outputLatency >
  80 ms refuses overdub); **Gesang als Noten:** monophonic YIN pitch tracking + onset segmentation in a Worker → notes
  with deg/oct relative to the scale (median pitch per note, glides as f curves) → Wuchs on any source.
- **Live mode:** §10.6.

**As built (step 1d): Nähren · Gespinst and Körner.** The processor has a third output: a pair per slot (`2 ·
HX_SLOTS` channels), each loop's output post level, state and Schluss into its own pair while it feeds (`{send: {loop,
ch, g, X}}`, 30-ms fades; zeroed only while a send sounds) – nothing taps it, so neither the Humus („Gespielt“) nor a
recording hears it (t-hx-oeko: „Gespielt“ exactly silent while the Schleife and its web sound, and while it feeds the Körner). `hxNaehrGsp(L, on)`: a `myzel-web` of its own (`hxWebMake`, the live web's parameters and
`gspFreqs`, `gspSet/gspRetune/gspClear` reach every loop's web, `gsp.halo` its out gain) fed from that pair through a
splitter (`HXN.split`), its halo into `hxr`; off: the send fades, the web rings out for 3 s and goes. Its cost
`GSP_COST[rich]` while it reports itself active (`hxWebsCost`, in `hxLoad` → `voiceLoad`). Stored with the loop
(`naehrt`), back after a reload. `hxNaehrKor(L, on)`: the loop's steady pass – its audible Schichten summed over one pass
(the baked versions where baked, ≤ `USER_MAX_S`), peak-normalised to 0.8 with 10-ms edges, its pitch reference the median
of its notes (else `guessPitch`) – as `HXN.kor.tex`; the Körner's new source „Schleife“ (`kor.src`, a live source) reads
it (`korSource`); one Schleife feeds them at a time; off: back to Glasharfe. The card's row „Nähren: Gespinst ·
Körner“. Not yet (Etappe 4): rhz, rgn, glt, shn, Schleife → Schleife.

---

## 16. UI

- **Ringleiste** `#hxRail` (role toolbar) inside `.main` between `#stage` and `#sheet` (portrait), in the stage column in
  landscape/≥ 900 px; 56 px; folded 24 px (Korb and Hauptknopf stay); shown once sound starts. Buttons are real
  `<button>`s over one canvas `#hxCv` redrawn in `frame()`. Contents: Korb (label), Hauptknopf (ring-with-dot glyph, red
  only while recording), rings (4 per page on phones, 8 on iPad/PC; "+N spielen" pager), ↶ (↷ for 8 s), form button.
  Taktlinie on the top edge (beats, the 1 in spore orange; dotted "frei").
- **Rings:** notes as spores (radius = pitch class position within the loop's range), playhead, bar ticks, one thin
  inner ring per Schicht, state glyphs (never colour alone): leer dashed "+", Ziel dashed orange "+", Fokus bracket,
  wartet (countdown arc), nimmt auf (red disc filling), spielt, stumm (hollow, stroke, head runs), angehalten (▶), Wuchs
  (spores with fine hyphae), lebendig (breathing), Gärtner stance word. Word under each ring.
- **Correction strip / chips / machine chips:** replace the rings area for their lifetime; never over the field.
- **Field overlay:** loop notes as dotted fairy rings with the loop number at their column/height when they sound
  (`visPush` kind `hx`); Knospen (§12.4); count-in number.
- **Card** (Aufnahme panel, new top section "Hexenring"): per loop: Schichten (level, mute, delete), Länge, Phase
  (5-ms/beat nudge), Verdoppeln, Korrekturen, Quelle (Gespielt/Alles; Puls mit, Bordun mit), Effektkette (eingebrannt /
  folgt), Taumeln an/aus, Wiedergabe (Abdruck/Wuchs), Stufe, Folgen, Klang, Eigensinn, Rolle, Nähren, Verwandeln,
  Schluss-Art, Export, Löschen; global: Modus, Start, Einzählen, Klick, Länge, Humus-Länge, Speichergrenze (with MB
  used), Gärtner, Handschrift, Spielverzögerung (Klopf mit), Pedale, Bühnenansicht. German labels, short.
- **Coach mark** once (first start): „Spiel etwas Schönes, dann tippe den Korb.“
- **Accessibility:** toolbar semantics, live region announcing state changes (not beats), no required hold (each hold
  has a tap path in the card), contrast ≥ 4.5 for text / 3 for strokes, reduced motion: playhead steps per beat.
- The Fährte button `#btnFae`, its tag and its panel section are removed (§18).

**As built (step 1b).** `#hxRail` (role toolbar, ← → between its buttons, one tab stop) sits with `#stage` in a new column
`#stcol` (portrait: the panel below the column; landscape/≥ 900 px: beside it – no other layout rule changed). 56 px;
folded 26 px (Korb, Hauptknopf, ring dots, ↶). Real buttons over `#hxCv`, drawn in `frame()` from cached button positions:
the Taktlinie on the top edge (four beats of the bar, the 1 spore-orange, the heard beat lit; dotted while frei), the Korb
(a basket, lumen glow; its word = the plan's label or the pending „ab Takt N“), the Hauptknopf (ring with a creme dot; red
disc + progress only while recording, dashed red with the beats left while waiting, waves while listening, a red ring
with + while punching, ▶ after Stille, an inner ring in mode „dieselbe“), the rings (spores: angle = phase, radius =
pitch in the loop's range, size = velocity; playhead; bar ticks; one thin inner ring per further Schicht; stumm hollow
with a stroke and the head running; angehalten ▶; pending a grey wedge to its bar line; Fokus brackets; Ziel dashed
orange „+“; recording red disc; waiting dashed red with an arc; level while dragged; its number), the word under each
ring (aufnehmen · schließen · abbrechen · stumm · an · weiter), ↶ (a red ring filling while held), ↷, the pager („+N
spielen“ / „Seite“), the fold chevron on the Taktlinie. 4 rings a page when 8 × 44 px do not fit (phones), else 8. The chips
(→ N, corrections, ×1 ×2 ×4, „Tempo behalten“, ✕) replace the rings for 8 s (scrolling sideways inside the rail).
Field: `visPush` kind `hx` – dotted fairy rings with the loop's number at the note's column and height as it sounds
(scheduled ahead in `hxTick`); the count-in number in the field's centre. Coach mark once (`myzel.hx.dev.v1`). The card:
the section „Hexenring“ on top of the Aufnahme panel – Weiter / Zurück / Wiederholen / Alle leeren (the tap paths of every
hold), per Schleife state chips and Fokus, level, its Schichten (level, Stumm, ✕), phase (±5 ms, ±1 beat: the Schichten
read earlier or later, crossed at once), the corrections, Quelle Gespielt/Alles, Zusammenlegen, Löschen; the graveyard
(Zurückholen, Endgültig entfernen); settings (`hx.modus/start/laenge/festT/pulsMit/borMit/autoclose/rail/humus/mem`, the
memory used, the device storage estimate). A polite live region says each change (never beats). Screenshots at 360×740,
390×844, 820×1180, 1366×768 and 740×360 (t-hx-ui 56/56): the rail under the field and never over it, the chips inside it,
no sideways scrolling, the panel below or beside with the rail at the field.
The tall sheets (mixer; the sound library) used to leave the field 118 px (132 above 780 px of height); with the rail
visible they now leave that plus the rail's height (`--hxr` on `#app`: 56, folded 26) – before, the rail overflowed
under the sheet. **Conflict (reported, for the owner):** on a 360 × 740 phone the field (118 px) + the rail (56 px) + the
library cannot all fit with every tile of a family in view: the library sheet is 460 px instead of 516, and Dunst
shows 3 of its 4 tiles without scrolling (`klang/tests/t-lib-shots` „p360: every tile of the family in view“ fails,
3/4). The other choices – hide or fold the rail while the library is open, or a smaller field – each break a rule of
their own; the build keeps the rail as set and lets the list scroll. With the mixer open, a 390 × 844 phone now has the
mixer's „side“ strips (knobs beside the stem, as on 360 × 740) instead of „classic“ (`mixui/f/func.js` scrolls by the
strip's box now). Drawing: the rail's canvas is drawn only while something moves (a playhead, a recording or wait, a
pending wedge, a hold, a level) or when what it shows changed – idle it cost 0.31 ms a frame on a 4× throttled CPU, now
0.04 ms (two loops playing: 0.32 ms); the Korb's plan (every 250 ms) 0.4–1.5 ms there. Without that, `motion-tests/
t-gf-cost`'s main-thread budgets (a flush < 0.3 ms) failed.

**As built (step 1c).** Folded height 24 px (the letter). A screen under 800 px high folds the rail by itself while a
panel is open (`hxRailAuto`: the mixer, the library, any sheet; Korb, Hauptknopf, the rings' dots and ↶ stay); its fold
button opens it for that panel, the setting `hx.rail` is untouched. With the rail there, a portrait screen ≤ 780 px high
tightens the library's head rows a little (head 44 px, search and family row closer; every target keeps 44 px):
`klang/tests/t-lib-shots` p360 4/4 tiles in view, the field 118 px (the §16 conflict of step 1b is gone). The card gained:
Effektkette (eingebrannt · folgt; without a Werk-Rahmen the note why), Taumeln an/aus, „Auftakt anfügen“ when offered,
and in the settings Einzählen, Klick and „Klopf mit“ (with the measured Spielverzögerung).

**As built (step 1d).** The form button `#hxForm` (40 px) at the rail's right end, hidden folded; on screens ≤ 400 px wide
the rail's buttons narrow (Korb 48, Hauptknopf 38, ↶ ↷ 30, Form 36, page 32, rings ≥ 34) so all fit at 360 px. The
auto-fold is computed from the layout, not the screen: with a panel open the rail folds only when the field would
otherwise be shorter than 260 px (`hxRailAuto`: the stage's height with the rail open, `HX_FIELD_MIN`; re-checked a frame
after it shows) – t-hx-ui: 360×740 and 390×844 fold (208, 256 px), iPad and the 1366×768 PC stay open (410, 545 px), a
phone turned folds. The form row and the Auslese chip in the rail (§13, §12.1); the card: the form section (Lichtungen –
Hin, Takt/Schleifenende, Kern, Überschreiben, ✕ – and Merken, Kern, Lücke, Takt-Lücke, Schluss), „Nähren“, „Auslese“,
a Schleife of Bewegung's own card (what it moves, Verblassen, the lanes drawn on its ring), the settings' „Form“ grid
(`hx.regel`, `hx.lichMix`, `hx.lichPuls`, `hx.lueckeT`, `hx.schluss`, `hx.welk`), `hx.runde`, Pedale, Bewegung (the trim,
„Hinlegen erntet“).

---

## 17. Controls

- `midiTarget` entries: `hx.korb` (momentary-capable: tap = harvest; hold = layer while held), `hx.haupt` (press/
  release: tap/push-to-talk), `hx.zurueck`, `hx.wieder`, `hx.leeren`, `hx.schicht` (retro Schicht into Fokus, commit at
  release), `hx.form` (next Lichtung), `hx.kern`, `hx.luecke`, `hx.schluss`, `hx.lob`, `hx.nein`, `hx.anker`,
  `hx.ring.1–8` (state tap), `hx.ring.n.pegel` (cont), `hx.ring.n.eigensinn` (cont), `hx.gaertner` (cont).
  `learnDone`'s momentary exception covers `hx.korb`, `hx.haupt`, `hx.schicht`. Old `fae*` bindings migrate:
  `fae`/`fae.take` → `hx.korb`, `fae.rec` → `hx.haupt`, `fae.clear` → `hx.zurueck`.
- **Pedal rule** (KONZEPT §8): a second meaning only when the first is silent or pending. The learn step for a pedal
  tests hold (press ≥ 0.6 s must arrive as down … up); otherwise offers the tap-only profile. Profiles as in the table.
- **Key pedals / keyboard:** a capture-phase `keydown`/`keyup` listener on `window` for learned pedal keys (PageUp/Down,
  arrows, Space, any key) that acts and `preventDefault`s before focused controls see them (except text inputs);
  Ringleiste buttons blur after pointerup. Defaults (PC): Space = Hauptknopf, E = Korb, 1–8 rings, Ctrl+Z / Ctrl+Shift+Z.
  The note row keeps playing notes.
- **nanoKONTROL2 page** on SET (profile `nk2`): toggles a Hexenring bind set (R1–8 rec/close/punch, M stumm am Takt,
  S solo, faders levels, knobs Eigensinn, CYCLE Korb, ◀◀ ▶▶ undo/redo, MARKER Lichtung ◀ ▶, ■ ▶ all end/start at the
  bar, TRACK ◀ ▶ ✕/✓); SET LED via MIDI out when available; field hint "nanoKONTROL2: Seite Hexenring".
- **nanoKEY Studio:** chip "Pads: Spuren / Hexenring" (pads 1–4 rings, 5 Korb, 6 undo, 7 next Lichtung, 8 Stille).
- **Gestik:** no new gesture. Wenden = Schlafen behaviour (§13). Ladung on loops only if enabled per loop
  (`loop.ladung`), effect: Lebendig+ loops vary more, Abdruck loops get grid-sliced drop-outs/stutters, decaying with the
  Entladung. Ruhe → harvest only as an opt-in (old "Hinlegen wird Schleife").

**As built (step 1d).** Targets (`midiTarget`, group Hexenring): `hx.korb` (press: harvest; held ≥ ½ s: the Korb's
layer – what is played meanwhile becomes Schichten of the Fokus, the harvest it began cancelled), `hx.haupt` (press and
release: tap or push-to-talk), `hx.schicht` (retro Schicht, committed at release), `hx.zurueck`, `hx.wieder`,
`hx.leeren`, `hx.form`, `hx.licht.prev/next`, `hx.kern`, `hx.luecke`, `hx.schluss`, `hx.alle.ende/an` (all end at
the next bar line – on their seam, or ringing out with their Ausklang / all from their start on the next 1), `hx.lob`,
`hx.nein`, `hx.anker` (hooks for Wuchs: „Nichts zu entscheiden“ until 2a), `hx.gaertner` (continuous, schaut · pflegt ·
antwortet – a value only until Etappe 3), `hx.hin` (Ruhe's „Hinlegen erntet“), `hx.nkset`, `hx.ring.N` (state tap), `.rec`
(record into it / close), `.solo`, `.pegel` and `.eigensinn` (continuous), and the pedals' own `hx.pedb`, `hx.pedd`
(tap one thing, hold another). `learnDone` learns `HX_MOMENT` (korb, haupt, schicht, pedb, pedd) momentary.
`mapClean` migrates old bindings (`FAE_TO_HX`: fae, fae.take → hx.korb; fae.rec → hx.haupt; fae.clear → hx.zurueck), and
the device setting „Hinlegen wird Schleife“ became the binding of Ruhe to `hx.hin` (opt-in, off by default; its switch
„Hinlegen erntet“ in the card where Gestik can be). Pedals (card, „Pedale“): profiles `HX_PEDP` – Korb · Aufnahme (one
switch), zwei (A Korb, B Schicht / held: ↶), drei (+ C Hauptknopf), vier (+ D next Lichtung / held long: Schluss); the
learn (`hxPedLearn`) asks for each switch's press, then a hold of ≥ 0.6 s that must arrive as down … up; a pedal that
sends only one event (a tap) gets the offer „Nur tippen übernehmen“ with what is lost said in words; learned keys are a
key map (`hxDev('ped')`), learned MIDI pedals ordinary bindings. Keys: one capture-phase `keydown`/`keyup` listener on
`window` (`hxKeyDown`): learned pedal keys act and `preventDefault` before any focused control (not in text inputs) – a
page turner's PageDown/arrows never step a focused mixer knob (t-hx-ctl presses them on a focused knob); Space =
Hauptknopf (held: push-to-talk), E = Korb, 1–8 rings (only when no control has focus, or inside the rail), Ctrl+Z /
Ctrl+Shift+Z (Ctrl+Y) – the note row keeps its notes. Rail buttons blur after pointerup. nanoKONTROL2: SET toggles its
page (`hxNkPage`; profile `nk2` gained the bind `cc 60 → hx.nkset`, `HX_NK2`: faders levels, knobs Eigensinn, S solo,
M ring tap (stumm at the bar), R rec/close/punch, CYCLE Korb momentary, ◀◀ ▶▶ ↶ ↷, MARKER ◀ ▶ Lichtung, ■ ▶ all end/start,
TRACK ◀ ▶ ✕ ✓); the SET LED via MIDI out (`midiSend`, CC 60 127/0) when the device has an output; the field's tag
`#hxTag` „nanoKONTROL2: Seite Hexenring“; its card says it. nanoKEY Studio: the chip „Pads: Spuren / Hexenring“ in its
card (`hxPadsSet`, `HX_PADFN`: pads 1–4 rings, 5 Korb momentary, 6 ↶, 7 next Lichtung, 8 Stille).

---

## 18. Mixer, lifecycle, presets, Fährte migration

- `voiceLoad()` adds the Hexenring's measured cost while the module runs (capture) and per playing Schicht/stream
  (§21), plus own webs.
- Visibility keep-alive: add "Hexenring spielt oder nimmt auf (Humus)"; when hidden with nothing playing, the Humus may
  pause (no audio capture while suspended).
- `panic` (Stille): §6.5. `slpEnter/slpWake`: §13. `applyQuality`: does not touch loops (Wuchs uses `hx.stufe`).
  `restartAudio`: persist loops first, allow the reload, warn that the Humus is lost.
- **Presets:** `loadPreset` never stops or changes running loops (burnt-in chain); user presets (format 3) may store a
  Hexenring template (loop slots, sources, lengths, Lichtungen) and loop references (IndexedDB ids), never audio.
  Format-2 presets with a Fährte loop import it as a Schleife holding only Bewegung.
- **Scenes** A/B store loop gains/mutes/Eigensinn and may reference a Lichtung.
- **Fährte retirement:** remove `#btnFae`, `#faeTag`, `faeWire`, its panel section, `faeTake/faeRec/faeClear` UI paths;
  keep `faeClock` logic inside TG and the lane recording inside the Humus; port the 137 `t-gf-*` checks to Hexenring
  equivalents (Bewegung layer, clock, latency shift, save format) and delete the obsolete ones with a list of what each
  covered.

**As built (step 1a).** `voiceLoad()` adds `hxLoad()`: `HX_COST.capture` while the node exists, `schicht` per Schicht of
a playing loop, `rs` per Schicht of a resampled one. Keep-alive: a playing Schleife keeps the context awake (`hxBusy`).
`panic` sets every Schleife `angehalten` (buffers kept; the toast and „Weiter“ come with the Ringleiste).

**As built (step 1b).** `panic` → `hxStille()`: recordings and punches end, pending state changes are dropped, every
Schleife angehalten; its toast becomes „N Schleifen angehalten – … · Weiter · Leeren“.

**As built (step 1d): the Fährte's retirement.** Gone: `#btnFae`, `#faeTag`, the Gerät panel's section (`faeSecUI`),
the Gestik card's Fährte button, every tap/hold/double-tap path (`faeTake/faeRec/faeClear/faePress/…`), their CSS. Kept:
the clock inside the Taktgeber (`faeClock` mirrors the sounding segment; `faeB/faeT` are the continuous beat), the lanes
in the Humus (`FA.lanes`, written by `faeIn/faeP/faeY/faeGk` as before, `faeShift` – output latency, for Gestik also the
sensor's, ± the trim – and `faeReady`), the 16-bit save format (`faeEnc/faeDec/faeDecode`). **A Schleife of Bewegung**
(`L.bew = {lanes, disp, n, g0, gs, fade, why, ev}`, engine name „Bewegung“) takes the Fährte loop's place: a Schleife in a
slot, in beats (`lock 'takt'`), no audio, its lanes laid on the mod layer half a second ahead as sources
`hxb<id>:<k>|<src>` (`hxBewLay` each scheduler tick; laid anew only when its state moved or the clock moved the points
ahead by more than 0.5 ms – a device's clock nudges its tempo every pulse), its strength falling by its Verblassen per
pass (under 4 %: angehalten), its states at their moments (`hxBewState`), silent in a Lücke, fading with a Schluss
„welkend“; Gestik's lanes rest while Gestik is off. It comes (a) from the Korb when the Humus heard nothing but movement
(`hxBewPlan` – the bars up to the bar line by the Korb's grid rule, 2 or the set length; `hxBewHarvest` fills its lanes
once Gestik's delayed ones are in), (b) from the chip „nur Bewegung“ after any harvest whose window holds movement
(`hxBewOnly`: that window as a Schleife of Bewegung in the sound's place, ↶ brings the sound back) – the way to loop a
lean, a knob or the finger's height onto what is played live, as the Fährte did, (c) from a format-2 preset, a mixer
scene or a file with a Fährte loop (`hxBewImport`, in the place of the one it replaces, on the current bar; `null`
removes it; `presetExtra`/`faeSceneStore` export the newest). A lane counts as movement only when it changed at least
twice in the window (a preset or a value set once is a jump, not a gesture – it would replay every pass). **Which lanes
replay live:** only a Schleife of Bewegung's – moving the instrument is all it is. An audio Schleife never moves the live
instrument: its Bewegung (`L.mv`) is in its sound already – voice lanes (height, Ausdruck, bends) drive its own notes when
it grows (Wuchs, 2a), chain lanes are baked into it or it follows the live chain, echo, hall and the A/B morph act on the
whole mix and stay the player's. A device's Start moves the origin as for audio Schleifen (§2 1a: loops keep their beats). It
takes no sound: never the Fokus (`hxFok`, `hxLoopMake`), so „dieselbe Schleife“, a held Korb and a ring's R record or
harvest a new Schleife instead of overdubbing it (`hxPunchStart`, `hxRetroPlan` refuse it) – the fuzz had found Schichten
of audio punched into one.
Migration: old bindings (§17), „Hinlegen wird Schleife“ → the Ruhe binding, presets/scenes/files as above (the built-in
„Sporenfährte“ is „Sporenregen + Bewegung“, its recipe and its Schleife). The Gestik card's line names the playing
Schleife of Bewegung; its tilt (`disp`) still draws the ghost spore.

**The Fährte's 137 checks (`t-gf-loop` 24, `t-gf-pc` 24, `t-gf-save` 28, `t-gf-gk` 14, `t-gf-funk` 30, `t-gf-parity` 9,
`t-gf-cost` 8) – where they went.** Kept and adapted: `t-gf-funk` (unchanged), `t-gf-parity` (no Schleife, no
`hxb` source wakes; the bar as before), `t-gf-cost` (a 4-bar Schleife of Bewegung of 8 lanes instead of the loop; its rows
flake on this machine as on the step-1c build), and in other suites `t-gq-soak` (the Korb takes the bars three times,
Leeren once; heap measured after ↶'s snapshots are dropped), `t-gs-regen`/`t-gs-rezept` (the demo's Schleife of
Bewegung leans the rain), `t-gu-ui` (the buttons gone, Spielhilfe and hint texts), `t-gx-live` (a Schleife of
Bewegung's Gestik lanes rest while Gestik is off, ↶ after deleting it, its ring instead of the tag). Ported into
`t-hx-bew` (66 checks): the layer written by itself, the Korb's bar, playback where played (≤ 25 ms) and exact on the
audio thread, Verblassen ×0.5, the patch never written, tempo 120 → 90, a 300-ms stall, the Puls starting (it joins the
Schleife's grid), deleting it (the Filter back exactly), nothing moved → leer, an external clock (100 → 110 BPM, its bar
lines, its beat), the X-Y pad (lane y in the audio Schleife; „nur Bewegung“: a key held later takes it), a knob
(relative, on top, turned again), a pad on the Korb (Bewegung, no note), Gestik (latency shift 80 ms, Anlehnen's height
and the tilt, „nur Bewegung“, live on top, a new note takes the lean, the card's line, ↶/↷, Tonhöhe as the lean toward
the step and played back in key, „Hinlegen erntet“), the save format (format 2 small, loading on the current bar,
format 1 and built-ins leave it, format 2 without one removes it, Rückgängig, the file v2/v1, scenes A/B store/go/morph/
swap/stored, reload, broken data ignored). Deleted as obsolete (the gestures they tested are gone): `t-gf-loop`'s overdub
pass (hold arms a pass, „old + new“) and its double-tap clear; `t-gf-pc`'s bar button on a PC, the Gerät panel's text,
the pad's hold-to-record, letting go, hold-while-looping and double tap; `t-gf-save`'s „toast with Rückgängig“ for the
Fährte's own clear (↶ covers it); `t-gf-gk`'s „Hinlegen wird Schleife is a switch“ (now a binding, off by default) – and
the tools `gf-block.js`, `gf-ui.js`, `gf-smoke.js`, `shot-gf.js`.

---

## 19. Persistence

- IndexedDB `myzel` → version 2: new stores `rings` (keyPath `id`: loop metadata, Schichten metadata, notes, Bewegung,
  seeds, Lichtungen, TG tempo map) and `ringsegs` (keyPath `[ring, schicht, i]`: audio in ≈ 4-s segments, Float32).
  `onupgradeneeded` creates only missing stores; `restoreTakes` skips ring data; `onblocked` → toast.
- Writes after each Schicht, in idle time, segment by segment; `navigator.storage.persist()` requested at the first
  loop; `estimate()` shown in the card. On reload/crash: "Hexenring wiederhergestellt" (loops angehalten, ▶ Weiter).
- Sample rate stored per Schicht; restore on another rate resamples with the polyphase resampler.
- Memory cap `hx.mem` (default 1.5 GB on desktop, 600 MB on iPad, 300 MB on phones) shared with takes; at the cap:
  offer Zusammenlegen / delete old graveyard entries; never silently drop audio.

**As built (step 1b).** `idbOpen` opens version 2 and creates only missing stores (a version-1 database keeps its takes;
`restoreTakes` reads only `takes`); `onblocked` toasts and the open completes once the old tab lets go; an old tab is told
on `onversionchange`. A Schleife's record `rings` {id = its key, geometry (the musical b0), bars, notes, Bewegung, cut,
source, tempo, the Takt finder's readings, Schichten with join/X/ρ/Ausklang/gain/mute/kind/group/sr and how many segments
are stored}; a session record `_s` (the Takt's tempo, keep, the Fokus). The audio goes as 4-s segments of the page's copy,
one per idle moment (`requestIdleCallback`), after each Schicht's live fill completed; a Schleife deleted (or undone) is
removed from the stores, one brought back is written again. Restore: after sound starts, every Schicht whose segments are
all there comes back bit-exact into its slot, angehalten, with the tempo they were made in; toast „Hexenring
wiederhergestellt: N Schleifen, angehalten · ▶ Weiter“, the Hauptknopf ▶. A Schicht stored at another rate goes through
the processor's resampler (`{rs}`) in an offline render of its own (never the live audio thread), every frame count
scaled; one that could not be converted stays out of its loop (never at the wrong speed) and the toast says so. Quota: a failed write → toast „Der Gerätespeicher ist voll –
neue Schichten werden nicht mehr gesichert. Sie spielen weiter. · Aufräumen“, nothing in RAM touched. The memory cap
`hx.mem` (default 1500 / 600 iPad / 300 phone MB) counts the processor's and the page's copy of every Schicht, the
graveyard, the history's audio, the takes in RAM and the Humus; at the cap the oldest history states give back their
audio, then a new harvest/recording is refused with „Speichergrenze erreicht … · Aufräumen“ (the card: Endgültig
entfernen, Zusammenlegen) – nothing is dropped by itself. Zusammenlegen renders the loop's steady pass with the processor
offline (Ausklänge of earlier passes in it) and joins it to itself (ρ 1): exact (t-hx-persist: 3.7e-9 at a peak of 0.51);
the first pass after an angehalten re-entry then carries the earlier passes' tails (a documented difference). A reload
in the middle of a punch: the finished Schichten back bit-exact (hashes equal), the running pass is lost with the Humus.
22 050 Hz → 44 100 Hz: a 1-kHz sine back at 1000 Hz, 0.3000; 96 kHz → 44 100 Hz: 1 and 18 kHz within 0.001 dB, a 30-kHz
tone not folded (−155 dB at 14.1 kHz) (t-hx-persist 15/15).

**As built (step 1c).** A baked version is stored beside the dry one (`ringsegs` under the Schicht's key + `~b`, its own
segment count), with the Schicht's `zo`, `kc` (dry and baked curves) and `dr`; a restore brings back both and plays the
baked one; restored on another rate the baked version is dropped (re-baked from the converted dry) and `zo` scaled.
The dry and baked counters are separate (a bake's save once reset the dry's – a reload mid-overdub lost a Schicht;
t-hx-persist 15/15 again).

---

## 20. Parameters (`PD`, all `rec:1` unless noted – kept out of patches; loop-local values live in loop objects)

`hx.on` (BOOL, default true), `hx.modus` (neu|dieselbe), `hx.start` (takt|ton|sofort), `hx.ein` (aus|sicht|vib|ton),
`hx.klick` (aus|zaehl|ein), `hx.laenge` (auto|wie1|fest), `hx.festT` (1–16), `hx.beginn` (abdruck|wuchs),
`hx.stufe` (gespielt|1|2|3, default 3), `hx.humus` (16–300 s, default 64), `hx.mem` (MB), `hx.autoclose` (BOOL),
`hx.tonartAmTakt` (BOOL, true), `hx.gaertner` (schaut|pflegt|antwortet), `hx.hand` (aus|an), `hx.buehne` (BOOL),
`hx.rail` (offen|klein). Device values in `myzel.hx.dev.v1`: `lat`, pedal profiles.

---

## 21. Cost

Measure with the `klang/tests/cost.js` method (extend it: `ENGS=hxr…` candidates) and enter honestly:
- `HX_COST.capture` (the processor with both taps, idle loops 0),
- `HX_COST.schicht` (per playing Schicht incl. seam overlap and resampler when active),
- `HX_COST.stream` (per Wuchs stream),
- own webs: `GSP_COST` each.
Count in `voiceLoad()`. The Werk-Rahmen's CPU is not voice budget; it is governed by §10.5. Report all numbers in the
HANDOFF.

**As built (step 1a).** Measured with `klang/tests/cost.js` (candidates `hxq/hxn/hxc/hx0/hxs/hxr`, nodes built before
the render), two runs on this machine: capture (the node with both rings recording and its Gespielt taps) 0.59 / 0.55,
of it the taps ≈ 0.1; a playing Schicht 0.19 / 0.27; resampling a Schicht +0.75 / +0.83. Entered (higher + 15 %):
`HX_COST = { capture: 0.68, schicht: 0.31, rs: 0.95 }` – the capture runs from the first note, so a phone's level-1 budget
(14) has ≈ 5 % less room for voices.

**As built (step 1b).** `hxc` now builds what the app builds: the Ring with `rid` and its `myzel-ring-in` node fed
by the sources (silent into the destination). Two runs: capture 0.81 / 0.71 (the node of its own and both rings' input
level for the meter on top of step 1a's 0.59 / 0.55), a playing Schicht 0.19 / 0.21, resampling +0.79 / +0.84. Entered
(higher + 15 %, the Schicht keeps step 1a's higher run): `HX_COST = { capture: 0.93, schicht: 0.31, rs: 0.96 }` – a
phone's level-1 budget (14) has ≈ 7 % less room for voices while the Humus records. A sample-rate conversion on restore
(`{rs}`, 160 taps, ≈ 0.6 ms per 512 frames on this machine – some 30 units while it ran) is not on the live audio thread
at all: it runs in an offline render of its own.

**As built (step 1c).** Re-measured with `cost.js` (three runs; the second's baseline came out negative – a disturbed
round – so its capture is taken with the baseline at 0): capture 0.93 / 1.08 / 0.88, a playing Schicht 0.34 / 0.36 /
0.28 (more than 1b's 0.19–0.21: per-Schicht outputs, the seam's place and gain curve, the Taumeln check), resampling
+1.04 / +1.03, and new: the live chain's copy for out 1 (`hxf` − `hxz`, `fx1`: counted while any Schicht plays dry on
out 1 – a first pass before its bake, a loop that follows the chain, no Werk-Rahmen) 2.45 / 2.33. Entered (higher +
15 %): `HX_COST = { capture: 1.07, schicht: 0.41, rs: 1.19, fx1: 2.81 }`. Taumeln on (the default) with the drift on
(`mov.drift` default 6 ct) resamples every playing Schicht all the time, so each counts schicht + rs = 1.6 units – on a
phone at level 1 (budget 14) the capture and four playing Schichten take 7.5, about half the room for live voices.
Measured and entered, not traded: Taumeln off for a loop (or the drift at 0) gives its 1.19 back. The Werk-Rahmen's
renders are not voice budget (§10.5): at level 3 a phrase renders at 0.062 s per second of audio (median; max 0.134 s,
Harz and Schwarm), a bake at ≈ 0.05 s per second – offline, on the browser's rendering thread, beside the live one.

**As built (step 1d).** Re-measured together with `cost.js` (three runs, table units = raw × each run's scale 0.89 /
1.02 / 0.82): capture 0.97 / 1.15 / 0.85, a playing Schicht 0.34 / 0.31 / 0.27, resampling +0.94 / +1.14 / +0.92, the
chain's copy 2.35 / 2.11 / 1.88; new: `hxm` (a loop of four Schichten at one rate, summed and resampled once) 1.52 /
1.63 / 1.46 against `hxp` (the same four resampled one by one, step 1c's way) 4.34 / 4.53 / 3.70 – about 65 % less;
`hxd` − `hxr` (a de-drift job working, 64 frames × 160 taps a quantum) 2.88 / 3.04 / 2.68. Entered (higher + 15 %):
`HX_COST = { capture: 1.33, schicht: 0.39, rs: 1.32, fx1: 2.71, dd: 3.5 }`. Counted (`hxCount`): every playing Schicht
`schicht`; a loop's reads at one rate `rs` once per output (its Schichten de-drifted, or the loop's own rate); a Schicht
still read against its own drift `rs` of its own; one working de-drift job `dd`. The model is above what was measured
(four summed: 4 × 0.39 + 1.32 = 2.88 counted, ≤ 1.63 measured), so the count errs to the safe side. With Taumeln on (the
default) a loop of four Schichten counts 2.88 instead of step 1c's 4 × 1.6 = 6.4 – on a phone at level 1 (budget 14) the
capture and that loop take 4.2, no longer half the room for live voices. Nähren · Gespinst: `GSP_COST` per web while it
rings (the live web's measured cost, §15).

---

## 22. Tests (new suite `dev/tests/hexenring/`, run by `run-all.sh`; Playwright on an instrumented slot `hx`)

| Suite | Proves |
|---|---|
| `t-hx-proc.js` | processor: bit-exact replay at `F(k)` for 1 h simulated with tempo segments and wander; pool constant; stall 2 s without gap; seam law (third difference ≤ 1.5×, RMS continuity ±1 dB on Gong/Harz/Bordun); undo/mute/punch fades |
| `t-hx-taps.js` | no loop signal in the taps (marker tone ≤ −100 dB); Gespielt is post-mute; Alles excludes the strip |
| `t-hx-clock.js` | TG never jumps; Puls start joins the grid; MIDI clock follow; fractional tempo; tempo release |
| `t-hx-ernten.js` | every row of the harvest table (grid/no grid/repetition/silence/nothing), corrections, precedence list, Korb labels |
| `t-hx-grammar.js` | Hauptknopf tap/hold, modes, Ziel/Fokus, →N chips, retro Schicht rule, stumm vs angehalten re-entry phases, Stille → Weiter/Leeren, alle leeren + undo, history/↷ |
| `t-hx-seams.js` | Ausklang fold (cold/warm), first-pass rule, foreign onset cut + tail render, Auftakt rule, Nahtwahl only in repetitions, stop with Ausklang |
| `t-hx-bake.js` | baked loop ignores live chain moves; LFO phase kept; first pass via live chain then switch inaudible (≤ 1.5× seam metric) |
| `t-hx-werk.js` | Werk-Rahmen isolation (c1-swap port), determinism per source, streaming under main-thread stall within the lead, fallback without iframe |
| `t-hx-wuchs.js` | Treu once; Lebendig per pass; follow key at the announced bar with no old-key pass; tempo change switch; undo instant in Wuchs; Taumeln on/off |
| `t-hx-audio-tempo.js` | Schnitt for rhythmic loops, frei for pads |
| `t-hx-ohr.js` | Takt finden on synthetic and recorded phrases (top-1/top-3 incl. octave errors), repetition detection, Auslese |
| `t-hx-form.js` | Lichtungen, Folge, Kern, Lücke, Schluss variants, Schlafen/Wenden |
| `t-hx-ctl.js` | MIDI targets, learn momentary, pedal profiles incl. hold test, key capture beats focused knobs, nanoKONTROL2 page |
| `t-hx-bew.js` | (step 1d) the Fährte's checks ported to Schleifen of Bewegung: the layer, the Korb, playback, clock, latency shift, save format (§18) |
| `t-hx-taumeln.js` | (step 1d) one resampling per loop: summed reads = separate ones; de-drifted Schichten nearer the exact path than step 1c's read; cost (§9, §21) |
| `t-hx-persist.js` | reload mid-dub restores bit-exact; quota failure path; SR change resample |
| `t-hx-fuzz.js` | 2000 random sequences of all actions + Stille/presets/scenes/tempo/Schlafen/hidden tab → no stuck notes (`A.voices.size === 0` after Stille), no NaN, no exceptions; (step 1d) the books match – every Schicht with its Schleife, every cleared Schleife given back –, memory within the Speichergrenze |
| `t-hx-ki.js` | Eigensinn operators keep scale/strong beats, MaxOrder ≤ 6, roles, Platz machen, die anderen spielen, answers' constraints, Begleiten in scale, Wiederkehr rules, Puls lernt |
| `t-hx-oeko.js` | Nähren paths never re-captured; Treffen setzen meets exactly once at T; Einwurzeln follows a scale change; Mikro latency ±1 ms with a DelayNode loopback; YIN notes |
| bench | `cost.js` rows for the processor, streams, webs; `bench.js` rows for Glut/Sehne after their inputs |

Also: every existing suite (`reg.sh`, `klang/tests/run-all.sh`, smoke-all) stays green; Fährte checks ported (§18).

---

## 23. Build order and risks

1. TG + processor + taps + Humus (audio, notes, Bewegung) + strip + minimal Ringleiste + Korb/Hauptknopf + states +
   history + persistence; tests proc/taps/clock/ernten/grammar/persist.
2. Werk-Rahmen (boot, isolation, bake job) + bake + Taumeln + seams (Ausklang tail render needs the Werk-Rahmen);
   tests werk/bake/seams.
3. Ohr basics, corrections, Auslese (best pass), form, card, controls, pedals, nanoKONTROL2, Fährte migration, Nähren
   Gespinst/Körner, Schlafen; tests ohr/form/ctl/fuzz.
4. Wuchs (render plans, streaming, CPU guard, following, Lebendig/Wurf/✓, settings); tests wuchs.
5. 2b tools, audio tempo, groove, consensus, export, Bühnenansicht.
6. 3 Mitspieler.
7. 4 Ökologie.
8. Regression, docs, HANDOFF, publish.

**Risks:** the Werk-Rahmen (iframe boot cost, memory, determinism of all 28 sources, Safari); TG refactor breaking Puls/
MIDI tests; the UI fitting 360 px; the effort of Etappe 3. Each builder reports conflicts with the owner's rules instead
of deciding them.

### As built (step 1a): suite `dev/tests/hexenring/` (`run-all.sh`)
`t-hx-proc` (32 checks: the hour, Frei, pool, E10 seams, mute/undo/stop/swap, Gong/Harz/Bordun, Ausklang, resampler,
2-s stall), `t-hx-taps` (11), `t-hx-clock` (19), `t-hx-humus` (11: §5). Helpers in `hx-h.js` (offline ring contexts, an
index checker and a recorder processor); the MIDI parts use `midi-tests/h.js` on the hx slot.

### As built (step 1b): suites
`t-hx-ernten` (33: the table's rows, labels, light, lengths, precedence, every correction re-cut without a gap and its
undo), `t-hx-grammar` (30: Hauptknopf tap / push-to-talk / short press / count-in / ×2 / close during auto-length,
stumm vs angehalten phases, Stille → Weiter / Leeren, ↶ held, ↷, tempo release, punch groups, „→ N“, the retro rule,
Ziel, delete and Zurückholen – real pointer presses where the gesture matters), `t-hx-ohr` (13), `t-hx-persist` (15),
`t-hx-ui` (56, screenshots in `out/ui-*.png`; with the mixer open too). Helpers for them in `hx-g.js`. `t-hx-taps` gained the Alles alignment
(12), `t-hx-clock` an all-samples row (20, see §2). `t-hx-proc`, `t-hx-humus` unchanged and green – except one row
that scatters with its material:
the Gong renders differently each time (its strike is random), and over six runs of `t-hx-proc` its seams' short-term
RMS dipped −0.1 … −1.7 dB (ρ −0.8 … +0.5) against the ±1 dB of §7 – two runs failed it. The seam law of step 1a
(one ρ for the whole fade) is unchanged in 1b; a ρ weighted like the cross term or per channel helps only a little (an
offline simulation on eight Gong renders), a time-local normalisation would be the remedy – for the owner to decide.
Other suites touched by 1b: the Ringleiste takes 56 px from the field, so the parity tests against older builds
(`midi-tests/t-parity`, `motion-tests/t-gk-parity`, `t-gf-parity`, `t-gs-parity`) grow the window by the rail's height
(`fieldAsBefore`) – the field is the one before, pixel for pixel, and they compare bit for bit as before;
`motion-tests/t-gl-ladung` allows the key `myzel.hx.dev.v1` (the coach mark, seen once: a device flag, not the patch).
`mixui/f/func.js` scrolls Spur 1 into view by the strip's box (the mixer's „side“ strips on a 390 × 844 phone, §16).
`klang/tests/t-lib-shots` „p360: every tile of the family in view“ fails (3/4) – the conflict in §16, for the owner.
After a container restart the build machine stalls its audio several times a second (3–19 ms); there the Gestik
suites' timing and cost rows (`t-gm-stream`, `t-gm-cost`, `t-gl-schlafen`, `t-gf-cost`, `t-gs-cost`, `t-gx-live`'s chord
order, `t-gf-loop`'s followed tempo) fail now and then on the step-1a build as well – compared run for run, not 1b.

### As built (step 1c): suites
`t-hx-werk` (15: boot, render-only, isolation, callback gaps, determinism of 28 sources – two documented exceptions –,
fallback), `t-hx-bake` (13: dry first pass then baked, the LFO's phase, live moves and presets leave a baked loop, folgt,
the swap's seam offline and live, Taumeln on/off), `t-hx-seams` (17: Gong/Harz/Bordun/Böe ×10 random runs; cold/warm,
the first-pass rule, the foreign onset's cut and the rendered rest, a window without notes, the Auftakt and its chip,
Nahtwahl, stop; `PARTS`, `KINDS`, `RUNS` to run a part). `t-hx-taps` +5 (the click on its path, the count-in, „Klopf
mit“, a harvest against the Puls with the Spielverzögerung: 17), `t-hx-ohr` +2 (the margin: 15), `t-hx-ui` +8 (the
auto-fold at every size: 64), `t-hx-persist` reads the playing (baked) versions. `hx-h.js` gained the recorder
`hx-recf` (the frame it began at). The klang `cost.js` gained `hxf`/`hxz` (the chain's copy, §21). Fixed on the way:
a harvest of sound without notes against a fixed length (`hx.laenge` fest) took up to 4 bars instead of the set ones;
the chain log's 180 s are trimmed in one cut per 20 s (before: a cut on every write – once a Gestik binding had written
for three minutes, every frame would have copied the whole list). Regression (`reg.sh`, `klang/tests/run-all.sh`,
`smoke-all`): green except rows that fail on step 1b's build as well, compared run for run on the same machine
(`t-gm-stream`, `t-gm-cost`, `t-gl-schlafen`'s „woken“, `t-gf-loop`'s followed tempo, `t-gf-cost`, `t-gs-regen`,
`t-gs-cost`, `v2/bars` G's onset, `klang/t-eng-native`'s 6-s hold – each passes or fails alike on both); `t-gs-raster`
„held notes fill the voice budget“ now rounds the Hexenring's share up to a whole unit for that check (with the capture
at 1.07 the whole notes left room the rain took). `klang/t-parity` and `midi-tests/t-parity` needed no change.

### As built (step 1d): suites
`t-hx-form` (30: Lichtungen merken and the form button – a real press, pending on it, a second tap cancels, held: the
row –, am Takt / am Schleifenende, Kern there and back, Lücke from the processor's frames, Schluss am Ende / welkend
(seeded) / abbauend, scenes carrying Lichtungen, Schlafen and Wenden, the §6.4 guard, „eine Runde“, a Schleife deleted
just before a Lichtung's switch to it, one cleared before its first pass, the form after a reload), `t-hx-ctl` (23: the
`hx.*` targets, momentary learn, pads, the Fährte's bindings migrated, pedal profiles with the hold test, the
capture-phase keys before a focused knob, the computer's keys, the nanoKONTROL2 page, the nanoKEY chip), `t-hx-bew`
(66: the Fährte's checks ported – the list in §18 –, a Schleife of Bewegung never the Fokus), `t-hx-oeko` (13: Nähren ·
Gespinst and Körner, never re-captured), `t-hx-fuzz` (7: 2000 random actions in 100 sequences with reloads – no stuck
note, no NaN, no exception, the books match, memory bounded), `t-hx-taumeln` (14: §9's summed reads and de-drifted
Schichten offline against step 1c's paths and the exact one, a negative `pre`, live: the lent chunks, the cost, Taumeln
off). `t-hx-ohr` +12 (the Auslese: 27), `t-hx-ui` +5 (the 260-px rule, the form button: 69). The klang `cost.js` gained
`hxm`, `hxp`, `hxd` (§21). Deleted with the Fährte's UI: `motion-tests/t-gf-loop`, `t-gf-pc`, `t-gf-save`, `t-gf-gk`
and the scripts `gf-block`, `gf-ui`, `gf-smoke`, `shot-gf` (their checks: §18); `t-gf-cost`, `t-gf-parity`, `t-gq-soak`,
`t-gs-regen`, `t-gs-rezept`, `t-gu-ui`, `t-gx-live` adapted (a Schleife of Bewegung where they used the Fährte's loop).
**Found by the fuzz and fixed** (each with its own check now): a negative index in `drAt` (a Schicht whose window
reached before the Humus read its Taumeln as NaN); an Auftakt's de-drift (`pre` < 0: knots from before the buffer); a
version given back while a summed read still waited for it (`gvQ`, `S.park`); a loop being cleared revived by a state
change already queued (a Lichtung's switch on the 1 – it sounded on without a ring, its buffers never came back); a loop
cleared before its first pass never freed; Schichten taken back while their loop faded left in the page's books; a
Schleife of Bewegung as the Fokus (sound punched into it). Also: Taumeln off gives a de-drifted Schicht its own audio
back (§9). **Regression** (`reg.sh`, `klang/tests/run-all.sh` with `SKIP_BENCH=1`, `smoke-all`, all Hexenring suites):
green except rows that fail on step 1c's build as well, compared run for run on the same machine – `t-gm-stream`'s
„the sound moved all the time“, `t-gl-schlafen`'s „woken“, `t-gf-cost`'s and `t-gs-cost`'s timing rows,
`klang/t-eng-live`'s khl Puls row (a voice left), and in the Hexenring suites `t-hx-bake`'s pass comparisons and its
live swap seam, `t-hx-werk`'s determinism (zpf, once) and `t-hx-bew`'s external clock (once) – each passed alone or
failed on the earlier build too (`t-hx-bake`: on step 1d's first commit, before one resampling per loop); `v2/bars` G („armed recording starts on the
first note“, < 256 samples) lands at about 60 samples or one or two render quanta later – 142 on step 1c's build, 184
and 270 on step 1d's first commit, 186–279 on the later ones (alternating builds on the same machine; the main thread
spends 3–4 ms in `onDown`, the note's start meets the next render callback or the one after). `klang/t-lib-shots` „p360“ passed this time. `smoke-all`: 28 sources, none
silent.
