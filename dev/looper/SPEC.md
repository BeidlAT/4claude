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
A.masterSum (all strips, returns; never the Hexenring strip) ─────────────── tap ──────────────────┤ "Alles"   (in 1)
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

---

## 4. Capture taps and the Hexenring strip

- **"Gespielt" (in 0):** per source strip, a tap after the mute/solo gate (`st.dry` output) for `fin`, `eb2`, `rgn`,
  `gsp` by default; `l0–l3`, `bor` join when the mask says so ("Puls mit", "Bordun mit"). The taps sum into in0. This
  is what you heard of your sources, post-fader, post-mute, dry of the insert chain and the returns.
- **"Alles" (in 1):** `A.masterSum` (all strips incl. returns). The Hexenring strip routes to a new node `A.masterIn`
  inserted between `A.masterSum` and the master chain, so loops are never in either tap.
- **Rule:** everything a Schleife produces (playback, Nähren voices, its own webs) sounds on a path no tap hears.
  Loop-driven voices (Live mode, Nähren into Rhizom/Regen) use `o.bus = stripIn('hxr')`; the Gespinst halo of a feeding
  loop comes from the loop's own web instance into `hxr`.
- **Strip `hxr`** ("Hexenring", info "Schleifen"): a `STRIPS` entry; add to `mxChannels.own` (colour, group "spiel"),
  `mxSrcText`, `MX_SRC_IDS` as needed; hidden until the first Schleife (`mxRgnSync` pattern). Default route `dir`
  (to `A.masterIn`). Its echo/hall sends are set to the gain-weighted mean of the playing loops' recorded send levels
  (each loop records the mean send level of its captured strips), ramped over 50 ms; per-loop send levels are a
  documented compromise (KONZEPT §3.3).
- Mute/solo of `hxr` work as for any strip. Meters tap as for others.

**Acceptance:** with loops playing and overdubbing, the in0/in1 taps contain no loop signal (correlation test with a
marker tone in a loop: ≤ −100 dB in the taps).

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

### 6.4 Schichten, overdub, retro layers
- Retro Schicht: "the pass" = if the decision falls in the last ¼ of the target's pass, this pass at its end (pending,
  cancellable), else the pass just completed. Its window = the target loop's last pass frames in the Gespielt ring
  (never Alles). If the target is longer than the Humus can reach, the chip is disabled.
- Punch overdub: starts at press frame (from the Humus, so no lost onset), ends at release/tap; 10-ms fades; each
  pass of a long overdub becomes its own Schicht in a group.
- Guard: no Eigensinn/Gärtner change in a loop during the three passes after a Schicht was added.

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
| `t-hx-persist.js` | reload mid-dub restores bit-exact; quota failure path; SR change resample |
| `t-hx-fuzz.js` | 2000 random sequences of all actions + Stille/presets/scenes/tempo/Schlafen/hidden tab → no stuck notes (`A.voices.size === 0` after Stille), no NaN, no exceptions |
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
