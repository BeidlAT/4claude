# Brief for building one Myzel sound source (klang stages 4–6, reserves)

You build ONE new sound source ("engine") for Myzel, a touch instrument in a single HTML file
(`myzel/index.html`, ~1.4 MB, vanilla JS + Web Audio, German UI). Read this whole brief first, then the
binding documents below. You work in your own git worktree (the path you were started in) – never in
`/home/user/4claude` itself, never on another branch, never push. Commit your work in your worktree when done
(one or a few commits, message trailer below) and report the commit hash.

## The owner's standing rule (binding, whole project)

**Always the best sound quality.** Build the engine with its FULL planned sound (SPEC §3.x and the check
files' fixes) and better where you can. Cost ("Einheiten", VCOST) is measured and entered honestly, but is
NEVER a reason to simplify or leave out a part of the sound. If two goals of the plan conflict (e.g. an
acceptance row cannot be met without changing the sound concept), do not decide alone: describe the conflict
with measurements in your final report. The three quality levels must be respected: level 1 (phones), 2, 3
(`Q.rich`: richer voices, stereo) – level 1 must stay sensible on a phone (a level-1 voice of a new engine
typically 0.5–1.6 units; the mobile level-1 budget is 14 units).

## Binding documents (read)

- `dev/klang/SPEC.md` – §0 decisions, §2 the shared worklet module and processor contract, **§3.x your
  engine** (signal flow, params, acceptance rows), §5 presets (only read), §6 integration checklist,
  §7 test plan, §8 risks.
- `dev/klang/KONZEPT.md` §2.x – the owner's German description of your engine (what it must sound like,
  what Höhe/Puls/Gestik do). The sound must match this.
- `dev/klang/ideas/check/*.json` – the adversarial checks; grep for your key and its folded-in ideas (SPEC §0
  lists what was folded in). Their `fixes` are acceptance criteria; their `measurements` are hard-won facts.
- `dev/HANDOFF.md` – "Notes from stage 1/2/3": lessons. Stage 3 (Harz) is the most recent worklet engine:
  read `class Bow` (myzel-bow) in `myzel/index.html` as the model for a worklet processor, and `class Blow`
  (Halm) / `class Scan` (Ranke) for more patterns; `ENGINES.jrg` / `ENGINES.elm` for native engines.

## Engine contract (existing code – search by name)

- `ENGINES[k] = { sustain, needs:'worklet', fallback:'<native key>', start(v, t, f, y, vel, o) }`.
  Held engines (`sustain: true`) set `v.setF`, `v.setY`, `v.release` (or use `wkHold`/`burstEnv`);
  struck engines set `v.released = true` and `v.finish(endTime)`. `o = {burst, gate, decayMul, pan, bus, bend}`.
  Puls hits call `hit()` → for held engines `{burst:true, gate}`.
- Worklet engines: `wkVoice(v, 'myzel-xyz', f, y, { prm: wkPrm('xyz'), seed: wkSeed(), on: {...} })`,
  `wkHold`, `wkPrm`; the processor class extends `MyzelProc` inside `function myzelDsp()` and is registered
  in the `registerProcessor` loop at its end. Everything inside `myzelDsp()` runs in the AudioWorklet scope:
  no access to anything outside it. Available helpers there: `tanh`, `cents`, `SIN`, `NOISE`, `PRNG`,
  `OnePole`, `DcBlock`, `Allpass1`, `FracDelay`, `Reso`, `Biquad`, `flush`, `pd1`.
- **MyzelProc owns these fields – never reuse the names in your class:** `po, q, act, off, silent, dead, lite,
  f, y, gN, gS, g, clearing`. (Harz's first draft used `this.g` for loop gains and broke.)
  `this.f`/`this.y` hold the k-rate freq (incl. detune) and hoehe each block. Messages: `{on}`, `{off}`,
  `{set}`, `{clear}`, `{lite}`, `{kill}`, plus your own via `extra(m)`.
- Native engines: nodes via `v.n(...)`, sources via `v.s(...)`, pitch through `v.mod(param)`
  (`detune` AudioParams), helpers `BQ, G, PAN, OSC, noiseSrc, setP, glideTo, adsrStart, sustainRelease,
  burstEnv`.
- **Integration points** (one each; follow how `hrz`/`jrg` were added):
  `ENG_META` line (family, art haelt/schlaegt/beides, sentence ≤ 52 chars, tags, `hoehe` word, `regen`, probe
  `hear`, level-3 text `rich`), `ENGINES` entry, params (≤ 6, `NUM`/`SEL ... {chips:1}`, German labels,
  insert after the previous engine's params), `GROUP` name, `VCOST1/VCOST3` (measured), `MACRO` (two ids),
  `ENG_NOTE` (German, how it plays), remove the key from `ENG_LATER`, `onParamChanged` live updates (worklet:
  add your key to the `case 'hlm': case 'rnk': case 'hrz':` line), glyph `g-<key>` already in the sprite.
  Struck engines with `regen` 1 join the Sporenregen automatically (`RG_S` is derived); the Rassel list is
  `['trp','mem','sch','jrg']` (SPEC may add yours).
- German UI texts: short, plain, "du"; the owner reads them.

## Test sandbox (shared machine – stay in your lane)

Scratch root: `S=/tmp/claude-0/-home-user-4claude/c8d0b4bd-0d4c-545f-b176-6770c99f7009/scratchpad`.
- A static server already serves `$S/v2` on `http://127.0.0.1:8790` – never stop it, never start another
  on 8790.
- Build your test slots with the shared script (read-only, do not edit it):
  `sh $S/v2/mk.sh <your-worktree>/myzel kd-<key>` and `... kn-<key>` → served at
  `http://127.0.0.1:8790/kd-<key>-inst/index.html` (internals on `window.__M`).
- Copy the test suite: `mkdir -p $S/k-<key> && cp -r $S/klang/tests $S/k-<key>/tests` and work ONLY in your
  copy (the relative `require('../../v2/lib')` resolves to `$S/v2/lib.js`). Do not edit files in
  `$S/klang/tests`, `$S/v2/*.js` or `$S/v2/mk.sh` (other builders use them).
- Point the suites at your build: `KD_URL=http://127.0.0.1:8790/kd-<key>-inst/index.html` (bench, cost),
  `KN_URL=.../kn-<key>-inst/index.html` (t-eng-live, t-eng-native), `MYZEL_SRC=<your-worktree>/myzel/index.html`
  (dsplib: the Node harness that runs `myzelDsp()` processors in Node – fast iteration, see
  `t-dsp.js`, `proto-hrz.js`, `sweep-hrz.js` (constant variants by source replacement), `tim-hrz.js`).
- `window.__M` exports what `mk.sh` lists; if you need internals in a browser test, reach them through objects
  already exported (e.g. attach a `v.parts` object to your voice, as Elmsfeuer does) – do not edit mk.sh.
- Syntax check: `sh $S/motion-tests/syn.sh <your-worktree>/myzel/index.html`.
- Extend in YOUR copy: `bench.js` (an entry in table `T` and an `if (key === '<key>') { ... }` block with every
  acceptance row of your SPEC section and the checks' fixes), `t-dsp.js` (worklet: contract, 40 random knob
  sets bounded/finite/ending, your specific DSP facts), `t-eng-live.js` (finger, MIDI, lanes at level 3,
  knob live, fallback without worklet), the library tests' counts (`t-lib-lib` tile count, `t-lib-row` ENG_OPTS
  order, `t-lib-a11y` family filter, `t-lib-fb` "N Quellen"), `t-lib-migr` (it uses an unbuilt key as its
  example of "a later version's source": if that key is yours, switch it to `unk`).
  Run: `node bench.js <key>` (COST_ROUNDS=3 is enough while iterating), `node t-dsp.js`, `node t-eng-live.js`,
  the library suites. The machine has 4 cores and other builders run at the same time: cost numbers scatter
  ±20–40 % – report them as measured, the owner's integrator re-measures at the end.
- Listening: you cannot listen, so measure what the KONZEPT promises (band energies, envelopes, event
  rates, pitch tracks, stereo correlation) and look at spectrograms (`ffmpeg ... showspectrumpic`, the Read
  tool shows PNGs). Render a few demo WAVs into `$S/k-<key>/demo/`.

## Lessons from stages 1–3 (each cost hours – apply them)

1. **Narrow resonators need in-band excitation.** A noise burst into a 32-Hz band loses ~60 dB; seed a band
   with its own sinusoid (Harz) or excite through a mallet low-pass wide enough.
2. **Loops: count the group delay.** A loop with a narrow band-pass decays per (period + the band's group
   delay ≈ 1/(π·BW)), not per period: T60 came out 4–5× too long until the loss used it.
3. **L1/L3 loudness parity** (bench: ±1.5 dB): measure per channel, averaged over several seeds, with short AND
   held notes, at pan 0 and ±0.4. A stereo voice passes the voice's StereoPanner, which folds one side into the
   other off centre: two **coherent** channels sum up to +2 dB louder there. Make L and R decorrelated (e.g. the
   softer side a quarter period late, all-pass for broadband parts) – see `class Bow` render. More bands at L3
   that couple at an exciter change the onset dynamics – measure the swell and the ring separately.
4. **Chromium cuts a native BiquadFilter's output** after its own tail estimate once its input is silent
   (high-Q band-pass excited by a click: cut long before the mode rang out). Keep native resonators' input
   alive with a −140 dB looping trickle (`jrgImp` in Jahresring).
5. **Measure the right thing.** A power-weighted spectral centroid is dominated by low partials (it once
   "showed" that Höhe did nothing when band energies 2–8 kHz moved 12–25 dB). Use band energies, harmonic
   levels, envelopes.
6. A listener/pickup that moves around a pattern shifts the pitch of travelling components (Doppler) –
   implement movement as amplitude where the physics allows.
7. Offline contexts deliver port messages only at the next `suspend()`; the note-on travels in
   `processorOptions.on` (see bench `one()`: suspends after messages).
8. Loudness: the bench's standard phrase (0.4-s notes every 0.5 s across the field) must match the
   references (Nebel/Glocke/Membran) within ±2 dB – calibrate the engine's peak constant, keep peak ≤ −1 dBFS.
9. Release: the bench checks the voice ends and is freed; struck engines: `v.finish` after the ring;
   worklet: the processor posts `{done}` after −100 dB for 8 blocks.
10. Keep allocations out of the audio loop (no closures/arrays per sample; per block only if small).
11. **Test helpers: round sample indices.** `L.rms(x, t * SR, …)` with t = 0.3 reads `x[14400.000000000002]` →
    undefined → NaN (a whole row failed on it). Always `Math.round(t * SR)`.
12. **Pitch of a noisy self-oscillator: measure its fundamental's spectral line** (the bench's `peakHz`), not a
    harmonic comb – noise rings the resonator's own, slightly stretched modes and biased the comb by −3…−13 ct while
    the line was within 0.3 ct (Halm's flame).
13. **A loop started from noise can catch the wrong mode** (Halm's flute: the twelfth on low notes). Start it from one
    period of its own tone; fade the output in instead of starting the loop late.
14. **Check signs where two outputs sum** (Halm's flame summed the tube's two ends with the wrong sign: the
    fundamental cancelled by 40 dB and it looked like a level problem for an hour).
15. `ffmpeg showspectrumpic` with `stop=` mislabels the frequency axis (a 220-Hz sine drawn at ≈ 400 Hz): use the full
    band or measure numerically.
16. Halm's Flöte/Flamme (latest commit) show two more patterns: a frequency-locked loop that trims a delay line by the
    measured period (`FluteLoop`, `FlameTube` – adapts only when two successive periods agree), and a mode flip done
    by briefly letting the old mode out and seeding the new one.

## What to deliver

- Your engine fully built and integrated in `myzel/index.html` in your worktree, all its acceptance rows
  passing in your bench copy, t-dsp/t-eng-live/library suites green in your copy, a commit in your worktree.
- Comments in the code's style: English, explaining why (measurements), as the surrounding engines do.
- In your final report (English, concise): the commit hash and worktree path; what you built per SPEC part;
  every place you differ from SPEC's letter and why (measured); the bench results (PASS/FAIL lines); measured
  cost L1/L3; the VCOST you entered; open points to judge by ear; any conflict for the owner. Also list the
  exact test-file changes (the integrator merges them into the main suite) – keep them in your copy
  `$S/k-<key>/tests/` and name the files.

Commit message trailer (exactly):
```
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_016SAT25XgEqkw8Y7Us7GPFP
```
