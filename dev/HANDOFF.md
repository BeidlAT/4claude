# Übergabe: Myzel – neue Klangquellen (Stand 18.10.2026, alle Klangquellen gebaut, Kosten auf ruhiger Maschine gemessen)

## Für den Besitzer

Alle Klangquellen der Planung sind gebaut, getestet und auf dem Branch gepusht – 28 Quellen in fünf Familien:
- **Etappen 1–3** (schon veröffentlicht): das DSP-Modul, Halm, Ranke, die Bibliothek, Elmsfeuer, Jahresring, Harz.
- **Halm** hat dazu Flöte (mit Überblasen) und Flamme (ein singendes Rijke-Rohr) bekommen.
- **Etappe 4:** Moder (Kompostglocke), Böe (Äolsharfe), Amöbe (Bass aus Zufall).
- **Etappe 5:** Sehne (lebende Saite mit Handballen, Flageolett, E-Bow, Jawari), Zapfen (Kratzen, das zum Ton wird, fünf Körper), Glut (gestimmte Rückkopplung, die nachglüht).
- **Etappe 6:** Gespinst (ein Netz aus Saiten mit eigenem Mixer-Kanal).
- **Reserven:** Kehlchen (Vogelkehle mit Chip, Triller, Ruf) und Rhizom (Lawinen durch die Tonleiter).
- **Presets:** Glaswiese, Kompostgarten, Atemrohr, Hochspannung, Gespinstgarten, Wurzelnetz, Vogelhain – jedes mit Gestik-Rezept.
- **Kosten:** Alle neuen Quellen sind auf ruhiger Maschine nachgemessen und ehrlich eingetragen (jeder Körper, jeder Steg, jede Silbe). Das ändert nur, wie viele Stimmen gleichzeitig spielen dürfen, nicht den Klang. Rhizom war zu billig eingetragen, das Gespinst-Netz, Elmsfeuer und Gluts Ersatz ohne Rechenkern zu teuer.

Offen sind nur noch Dinge fürs Ohr und ein paar Entscheidungen (unten bei „Owner's calls“), dazu die Veröffentlichung: Die App unter beidlat.github.io aktualisiert sich, sobald dieser Branch in den Standard-Branch übernommen ist (ein Pull Request, den du öffnest oder bei mir bestellst).

So geht es in einer neuen Sitzung weiter: Öffne eine neue Claude-Code-Sitzung auf diesem Repository und diesem Branch und schicke diesen Satz:

> Lies dev/HANDOFF.md und mach mit den offenen Punkten der Klangquellen weiter.

## For the next session (English working notes)

**Branch:** the one named in the session (stage 1 was on `ccr-c7c5d0a6-cus3ip`, stages 2 and 3 on `ccr-d21a93b2-oncy3v` – after the owner merged stage 2 (PR #1) into the default branch `ccr-c7c5d0a6-cus3ip`, the branch was restarted from it for stage 3) – develop, commit and push only there; no PR unless asked. The Pages app updates when the owner merges a stage into the default branch (a PR they open or ask for).

Commit trailers:
```
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: <this session's URL>
```

**App:** `myzel/index.html`, a single file of about 1.4 MB (German UI, vanilla JS + Web Audio). Each push deploys GitHub Pages (https://beidlat.github.io/4claude/) – only from the branches listed in `.github/workflows/pages.yml`, and only if the repository's `github-pages` environment allows that branch (Settings → Environments → github-pages → deployment branches). Stage 2's branch was refused there (run 18 failed before a runner started): the owner has to allow it (or a pattern `ccr-*`), then re-run the workflow.

**claude.ai version:** the artifact https://claude.ai/artifact/HNZYLEaUvtCfkyYWi3SuDr, private, capability `downloads` – still stage 1.
- Republish it with the Artifact tool: `url` + `file_path` = `myzel/index.html`.
- A new conversation must first `read` the artifact, then publish. The tool asks for every line of the live version (and of a file Claude did not write in the session) to be read first – at 1.4 MB that is ≈ 870 k tokens, more than a session holds; stage 2 therefore did not republish. Ask the owner how to go on (a session only for that, or the Pages app alone).

**Workflow etiquette:**
- Build stage by stage, as the owner chose. Each stage is built, tested, committed, pushed and published before the next one starts.
- Report to the owner in German, briefly.
- **Best sound quality first (owner, 17.10.2026, for the whole project):** cost targets in SPEC and in the bench are measured and reported, never a reason to simplify a sound. Build every engine with its full planned sound (and better where possible); enter the measured VCOST honestly. If two goals of the plan conflict, ask the owner before deciding.
- The earlier usage-limit trouble came from the model in use then; there is no need to economise on tokens or subagents.

### Documents (binding)
- `dev/klang/SPEC.md` – the build spec:
  - §2: the shared worklet module (already built – read the code: `myzelDsp`, `MYZEL_DSP_SRC`, `ensureDSP`, `MyzelProc`, `wkPlays`, `engLabel`).
  - §3.x: each engine.
  - §4: library (built).
  - §5: presets.
  - §6: integration checklist.
  - §7: tests.
  - §8: build order and risk register.
- `dev/klang/KONZEPT.md` – the German concept the owner has read (names, sounds, families, honest limits).
- `dev/klang/ideas/check/*.json` – the adversarial checks per engine. Their required fixes are acceptance criteria.
- `dev/klang/ideas/judge-*.md`, `ui-final.md`, `dev/klang/research/*.md` – background (`code-map.md` maps the code; line numbers drift, so search by name).
- `dev/gestik/` – the Gestik concept and decisions (done earlier).

### Test infrastructure
Run once per session:
```
sh dev/setup-tests.sh <scratchpad-dir>
```
It does the following:
- copies `dev/tests/*` there and rewrites the old absolute paths;
- regenerates the parity baselines from git;
- starts `python3 -m http.server 8790` serving `<scratch>/v2`.

Then use these:
- `sh <scratch>/v2/mk.sh /home/user/4claude/myzel <slot>` builds `<scratch>/v2/<slot>/` and `<slot>-inst/`; the latter exposes internals on `window.__M` and its export list grows via guarded blocks.
- Playwright is at `/opt/node22/lib/node_modules/playwright`. Use Chromium args `['--autoplay-policy=no-user-gesture-required']` and start the sound with `#btnStart`.
- The suites:
  - `klang/tests/run-all.sh` covers stages 1–3 and the library. `SKIP_BENCH=1` skips the offline bench (≈ 30 min for five engines); `bench.js` is the per-engine acceptance bench (`node bench.js elm jrg` for single engines), so extend it for each new engine – its table `T` takes `native`, `struck`, `pp` (params for the pitch checks) and `cost` (env for `cost.js`).
  - `klang/tests/t-eng-native.js`: stage 2 live (Elmsfeuer, Jahresring: finger, MIDI, lanes, jumps, the year clock, Verjüngen, Schlafen, Rassel, no worklet). `t-eng-live.js`: the worklet engines live (Halm, Ranke, Harz). `t-dsp.js`: their processors in Node.
  - `klang/tests/proto-hrz.js`, `sweep-hrz.js` (constants varied by replacing them in the source), `tim-hrz.js`, `burst-hrz.js`, `pan-hrz.js`, `demo-hrz.js`: the Node tools Harz was tuned with – quick to re-run when a processor changes.
  - `v2/func.js` needs slot `new` (→ `new-inst`). Other v2 suites: `fixes`, `mobile`, `bars`, `bars2`, `integrity`, `sources`, `live2`, `presets`, `smoke`, and `SEED_BLOBS=1 NO_RAF=1 node mixfunc.js mnew-inst` (slot `mnew`).
  - `mixui/f/func.js` needs slot `mix`.
  - `midi-tests/run-all.sh`.
  - `motion-tests/run-all.sh` is long; a few timing checks flake under load, so re-run those alone.
- Syntax check: `sh <scratch>/motion-tests/syn.sh myzel/index.html`.
- `sh <scratch>/reg.sh` runs every regression suite after a stage (v2, mixfunc, mixui, MIDI, Gestik) into `<scratch>/reglogs/`, summary on stdout.
- Cost (`klang/tests/cost.js`): this machine's render times scatter by ±20 % between runs. The script keeps each candidate's fastest of N interleaved rounds and scales by the **median** of the held native references; struck engines need `DUR` inside their voices' life (Jahresring: `DUR=2 PARAMS='{"jrg.holz":1,"jrg.jahreszeit":"sommer"}'`; Rhizom: see the final calibration below). A singleton (Gespinst's web) is measured as 24 of them (`NW=24`). Re-run before believing a single number – busy builders skewed it by up to 1.7×; on a quiet machine two runs agree within ≈ 10 %. `recal.js` is the full calibration.

### Notes from stage 1
- **OfflineAudioContext:** port messages to a processor only arrive at the next `suspend()`. The note-on therefore travels in `processorOptions.on`; tests add a suspend one block after a message (see `klang/tests/bench.js`).
- **Adding an engine:**
  - one `ENG_META` line (family, Spielweise, sentence, tags, Höhe word, `regen`, probe gate, level-3 text);
  - an `ENGINES` entry, which for a worklet engine has `needs:'worklet'` and `fallback:'<native key>'`;
  - the params (≤ 6), `VCOST1/3` (measured against 24 Nebel voices, interleaved), `MACRO`, `ENG_NOTE`.
  - All 26 glyphs are already in the sprite. `ENG_LATER` names the unbuilt keys; remove a key from it when it ships.
- **Open from stage 1:**
  - Ranke's held flutter has to be judged by ear.
  - Halm level 1 costs 0.59 (final calibration) against the 0.55 target.
  - Long-press drag scrolling on real phones is untested.
  - Worklet load time and thread move on a mid-range Android are not measured.

### Notes from stage 2 (Elmsfeuer, Jahresring)
- **Built to SPEC §3.9/§3.12 with their full sound** (a first version had simplified both to reach SPEC's cost targets; the owner rejected that – best sound first). Cost as measured: Elmsfeuer ≈ 1.0–1.6 units at level 1 with its arc (≈ 2–4 at level 3), Jahresring ≈ 0.8–1.1 while its modes ring (≈ 2–2.7 at level 3); VCOST 1.8/4.2 and 1.2/2.9 – the final calibration on a quiet machine measured 0.93–0.95 / 2.0–2.2 and 0.82–0.98 / 2.05–2.32 (VCOST now 1.09/2.51 and 1.13/2.67). The bench reports cost as INFO, it no longer fails on it.
- **Chromium cuts a BiquadFilter's output** after its own tail estimate once its input is silent – for a high-Q band-pass excited by a click that is long before the mode has rung out (Q 150 at 440 Hz: cut at 0.29 s, T60 0.75 s). Jahresring's contact source loops a −140 dB trickle until the voice ends (`jrgImp`). Any future native resonator needs the same.
- **Where the build differs from SPEC's letter, and why** (each measured): the hum is one PeriodicWave with SPEC's lopsided tanh baked in (same sound as two oscillators and a shaper, without aliasing or offset); the corona's pre-gain is set so the threshold lies z = 4.1 → 1.4 standard deviations out (SPEC's 0.6 + 1.2·y gave almost no ticks; the acceptance asks 50–300/s) and its level `knistern·(0.2 + y)` is evened out with the density (else the ticks low are inaudible and the fizz high buries the arc); the arc's follower has a soft ceiling (bursts of ticks would pop) and its tanh is oversampled (2×, level 3 4×); a high-pass after the arc's tanh takes its offset; the shared loops (steps, two gates) are 16 s, not 2 s (the check's „repeats audibly“), the steps capped at 2.7 jumps/s; zap steps stay in key (KONZEPT „in der Tonart“ over SPEC's „depth ∝ vel“); a zap halves the hum so the arc leads. Jahresring: the mallet is its contact (a click, the same every hit) plus SPEC's 2–6 ms noise burst, so no hit comes out weak; a soft mallet weakens the upper modes and the box opens toward the bar's end (both for SPEC's „centre round, end bright“); the knock passes the box (SPEC's „knock noise“); the ice crack adds a 2-ms tick past the box so it is heard.
- **Native cost is per node, ~6–10 ns each** (≈ 0.05–0.07 units), more than SPEC's 0.03/AudioParam.
- The year starts where the calendar stands (5 May = spring), runs in `tick()` (`jrgClock`) only while the context runs and the page is visible, hits add ≤ 2/s. Age resets with Verjüngen, Schlafen and panic.
- **Library texts:** `famPlay()` names a family by the way most of its sources play (Elmsfeuer, „beides“, would otherwise have moved Luft into „Tippen und Wischen“).
- **By ear, still open:** the arc's character, the crackle density at default height, the Jahresring box/tube/knock balance, leaves and ice levels.

### Notes from stage 3 (Harz)
- **Built to SPEC §3.1 with every acceptance row and the check's fixes** (inventor-hrz, inventor-dax, performer-tum), all five bodies. Measured (bench, out/hrz): in tune within 1.9 ct without Schwebung at 110–1568 Hz; t90 0.2–0.6 s; mode 2 ≥ 34 dB under mode 1 at y 0.1/0.85; h2/h3 rise with Höhe; the ring after release within 0–15 % of the Dämpfung mapping; level 3 within ±0.4 dB of level 1 at any pan; cost ≈ 0.9–1.4 units at level 1, 1.7–2.9 at level 3 (VCOST 1.6/3.3, the highest run + 15 %; final calibration over all five bodies 1.11–1.49 / 1.97–3.35, VCOST 1.71/3.85).
- **Where the build differs from SPEC's letter, and why** (each measured in Node, `klang/tests/*-hrz.js`):
  - the onset seed is one period of each band's own sine, not low-passed noise (a noise burst falls mostly outside the 32-Hz bands: −62 dB, t90 1–1.7 s);
  - a pass loses g per period **plus the band-pass's group delay** 1/(π·32 Hz) ≈ 10 ms (else the ring after release was 4–5× the Dämpfung mapping); D = SR/f exactly (the RBJ band has zero phase at its centre), no τ_bp subtracted;
  - Glas/Schale: the bow's contact stays where it set on; the finger's circling is heard as the pattern (S) turning past two listeners a quarter turn apart (level 1: one) – as amplitude, because turning the listeners around a fixed pattern shifted the pitch of its travelling share by n·rot (up to 20 ct) and a moving contact broke the swell; the doublets' share O is picked up a quarter period late (else ±2.5 dB note to note); the right listener takes S late and O now (two coherent channels sum up to 2 dB louder off centre in the voice's StereoPanner); level 3 single bands: equal power 1.31/0.53, the softer side a quarter period late; the lifted finger stops circling;
  - Schale: the measured 180-mm bowl's ratios 1 : 2.778 : 5.181 : 8.163 : 11.661 instead of STK's 2.986 (near 3: the stick-slip's 3rd harmonic locked mode 2 in, −11 dB and −9 ct at 110 Hz);
  - the friction path: level `harz · (0.2 + 2.5·p²) · 5.5` through each body's high-pass (Glas 1500, Schale 800, Stab 300, Zunge 60, Teich 500 Hz) – SPEC's 0.5·(0.3 + 0.7p) left it 20 dB under the tone (h2 −50 dB, Höhe did nothing audible); a rough contact (the pressure trembling with low-passed noise, ±0.25·(0.3 + Harz)·(0.3 + p), at the very top +0.8) gives grain and the tearing; pressing harder plays louder (`0.55 + 0.9p` on the bow speed), Dauerschlupf ×1.4 above y 0.9 (SPEC 1.8: +5 dB jump);
  - Dämpfung is a damping (more = shorter: `0.4 + 6(1 − d)²` s × the body's ring – Glas 0.6, Schale 2.5, Stab 1.6, Zunge 0.35, Teich 2), as Ranke's; default 0.6 = SPEC's 1.36 s; the native release is six times slower than the ring (the processor ends the voice when silent);
  - Zunge: formants inside the processor that open with the pressure (u → a: F1 350–750, F2 900–1800 Hz, +9 dB, then 3.5 kHz), the bite seeds the upper modes, the growl is the bow arm at 25–45 Hz from y 0.55; **no second tongue at level 3** (under the shared bow it locked to the first – no beating – and only changed the swell/ring between the levels; tried bowed, weakly bowed, sympathetic);
  - Teich: a neighbour rod (1.031 ± 3 %, level 3 its second mode and a third rod), the bowl's resonance inside the processor, water as a damped 0.8-Hz slosh stirred by every stroke and a little noise – it bends the rods apart (±25 ct × (0.15 + 0.85·Schwebung)) and moves the bowl (± that share of an octave); from y 0.85 the bow is drawn to the rod's second mode, from ≈ 0.95 it screams there (bistable, as bowed rods);
  - L3 stereo: see above; level 3 Glas/Schale every mode a pair (10 bands), Stab 6, Zunge 4, Teich 6.
- **By ear, still open:** the wah's depth and speed, the friction's colour per body, the Zunge's vowels and growl, the Teich's water and scream threshold, the Puls stroke (pluck ×3 under 0.3 s and ×2 native).

### Notes from stage 4a (Halm's Flöte and Flamme)
- **`hlm.rohr`** (chips Rohrblatt/Flöte/Flamme); each pipe names the five knobs its own way (`HLM_LAB`, the `lab` option of `NUM` – the label's first text node changes, the macro mark A/B stays) and has its own note text (`ENG_NOTE.hlm()` is a function). A pipe chosen under a sounding note starts from its own tone (`pipeOn`). Voices are priced by their pipe (`HLM_COST`, a getter on `VCOST1/3.hlm`).
- **Flöte** (`FluteLoop`, STK's jet x(x² − 1) on a non-inverting open bore – every harmonic): the jet delay picks the register (½, ¼, ⅙ of the period: fundamental, octave, twelfth); Strahl moves the overblowing point (y 0.57–0.87), the twelfth above y 0.95 (below 2.6 kHz). The bore's low-pass and the breath pull the pitch +4…+65 ct: a frequency-locked loop on interpolated zero crossings stretches the bore by (measured/target)^0.15 per period, only when two successive periods agree within 3 % (a mode jump or a burst does not pull it); within 0.4 ct in all registers 110–1320 Hz. A noise tongue kicked low notes into the twelfth (measured), so a note starts from one period of its tone in the bore plus a breath push. Below y 0.12 only air (the loop runs on in tune, its output fades in – a loop started from noise catches the twelfth). Without breath the jet is gone (`jg`), else the bore rang for seconds after release. Output DC-blocked (the jet's breath offset sits in the bore).
- **Flamme** (`FlameTube`, a Rijke tube): two travelling-wave pairs split at the heater, both ends open and inverting with a low-pass at 6–20 f (Rohr: the same loss at every pitch, its delay taken off the bore). The heat release follows the velocity at the heater a quarter period late by **King's law**, q = heat·tanh(K(√|U0 + u| − √U0)) – flow reversal rectifies it: even harmonics growing with heat (a plain tanh(2u) gave a hollow sine). The sound is **a2o + 0.5·b1o**: both ends breathe out together on the fundamental; the first build read a2o − b1o, which cancelled the fundamental by 40 dB and made the octave look 35 dB too loud. Threshold y ≈ 0.33 at every pitch (heat 0.04); the ignition's puff (Zunge) knocks the tube, so low notes start in 0.2–0.3 s. At the threshold the flame's slow pulse (a random walk 1.25–2.5 Hz, Flackern, weaker above the threshold) lifts the tube over it and drops it: the tone surges ±15 dB; above it ±1 dB.
  - **Overblowing**: a sounding fundamental never let go, whatever the heater did (grid over pos 0.1–0.15 × τ 0.05–0.4, and the "drive ∝ sin(2πn·pos)·sin(2πn·τ)" settings that should damp it – the saturated tube does not follow the linear rule). What works: heater at ⅛, lag ⅛ period, heat held at 0.07, and a **flare** – the ends let the old mode out for 30 ms, the new one starts from a period of itself (both ways; hysteresis 0.9/0.875; notes below 1 kHz). Measured h2 − h1 +25…+37 dB at 110–880 Hz, level within 1 dB of the fundamental after a lift (`1 + 2.7 + f/330`).
  - The fire: a rumble (LP 120–720 Hz) and a turbulent hiss beside the tube, the hiss also inside it (it whispers on the note); ≈ 14 dB under the song at y 0.1. Cracks: Poisson, 1.5–36/s with heat × Feuer, a 1.5-ms burst high-passed at 1.5 kHz, harder with heat (heard over the song: counted above 5 kHz, 3/s low, 21/s high). Let go: the flame dies, the tube rings out within ≈ 0.5 s at any pitch (`rr`), one last crack 40–160 ms later; native release 0.8 s.
  - Pitch: the fundamental's line is within 0.3 ct (the FLL); a harmonic comb reads −3…−13 ct there because the fire rings the tube's own, slightly stretched modes – measure the line.
- **Cost** (final calibration, quiet machine): reed 0.55–0.59 / 0.91–1.0, flute 0.76–0.77 / 1.33–1.38, flame 1.37–1.42 / 2.48–2.55; `HLM_COST` 0.68/1.15, 0.88/1.59, 1.63/2.93 (the first figures, taken with three builders running, had the flute under the reed).
- **By ear, still open:** the flame's fire/crack balance and the surge's speed; the flute's air below y 0.12.

### Notes from stages 4–7 and the reserves (built on 17./18.10.2026; builders' reports condensed in SPEC's „As built“ lines)
- **Built by parallel builder agents** in git worktrees (Moder, Böe, Amöbe; Zapfen, Sehne, Glut), merged by hand: every engine touches the same tables (`ENG_META`, `ENG_LATER`, params, `GROUP`, `VCOST1/3`, `MACRO`, `ENG_NOTE`, the `onParamChanged` case, the processor list), so a git merge interleaves classes and loses closing braces. What worked: take the builder's diff against its base, set each hunk onto the current file by its anchor (the table lines by hand), then check that every line the builder added is in the result (`collections.Counter` over lines) – and for the tests a three-way `git merge-file` per file (`<scratch>/tmerge.sh <key> <base>`), resolving „both added here“ as ours + theirs and restoring the closing brace that the two blocks share.
- **Gespinst:** the coupling limit is computed from the strings' responses (partials, between them, below them) with a high-pass on the bridge's feed back – a sub-audio mode (14 Hz) oscillated at Nachklang 0.5 before. `voiceLoad()` counts the web while it rings; its own mixer strip „Gespinst“ (Halo = its level); `{clear}` at Stille/Schlafen posts `{idle}`.
- **Rhizom:** the net runs in `tick()` (`rhzRun`, exact event times, scheduled ahead like the Puls); offline (and with a stopped clock) a strike's cascade is laid out at once – tests that need causality set `RHZ.step` and run the clock by hand (`M.rhzRun(t)`). A voice's cost grows with its ringing pings (`RHZ_COST`).
- **Kehlchen:** the labia in the note's phase with a frequency-locked loop (≤ 0.2 ct over 110 Hz–6 kHz at every pressure); the sound is the flow through the opening (a smooth max), so partials rise with pressure; the throat follows the note.
- **Sehne / Zapfen / Glut:** see their builders' notes in SPEC §3.7/§3.8/§3.3. Zapfen and Glut are their own stand-ins without AudioWorklet (`fallback: 'native'`, `wkReady()`); their native voices are priced separately (getters on `VCOST1/3`).
- **Tests:** `bench.js` covers every engine (`node bench.js <key>`; table `T` gained `line`/`lineAt` (pitch on the fundamental's line), `cYs`/`partials`/`cWin` (centroid variants), `burstDur`, `rel`); `t-dsp.js` every processor (147 rows); `t-eng-live.js` every worklet engine live (`KN_URL`); `listen-new.js OUTDIR` renders listening demos; `recal.js` the final cost calibration. The Gestik suites know the new Ladung targets (Gespinst-Kopplung, Rhizom-Reiz) and the Gespinst strip.
### Notes from the final cost calibration (18.10.2026, session `ccr-183ec81a-rkp3np`)
- `klang/tests/recal.js` (≈ 3 h, nothing else running) measures every new source at levels 1 and 3 – every body, bridge, pipe and syllable, the native stand-ins, Gespinst's web, Rhizom's split – two runs each, and prints the highest + 15 %. On a quiet machine the two runs of an entry agree within ≈ 10 %; the earlier entries, measured while builders ran, were up to 1.7× off either way. The figures and the new table are in SPEC §2.4 („As built (final calibration)“).
- **Gespinst's web:** one web alone carries the worklet's fixed share of the render, and cost.js multiplies a single node's figure ×24 (3.7–5.0 units, scattering). `NW=24` renders 24 webs against 24 Nebel voices, the voices' own method: 1.8–2.2 / 2.5–2.7 (the builder's 1.7 after the Lagrange fix agrees). The bench's web row uses it.
- **Rhizom:** its voices end with their cascade, so cost.js's 3-s window averaged them over a third of their life (0.29 – it matched the old entry 0.3 by chance). `rhz-pings.js` counts the pings ringing and how long the voices live; a voice with one ping costs 0.62 / 1.20 while it sounds, each ping beside it 0.29 / 0.38 (same NV for both settings, so level 3's graph share cancels). Entered: VCOST 0.71/1.38, `RHZ_COST` base 0.38/0.94 + 0.33/0.44 per ping ringing (`base` is per level now). A Rhizom shower now takes at least 2.4× the budget it did, so on a phone fewer strikes ring at once (stolen as before).
- Dearer variants priced in: Sehne's jawari (plucked 0.68/1.29, E-Bow 0.94/1.84), Zapfen's Holz (worklet 0.76/1.30) and Panzer native (1.74 at level 3), Jahresring's winter (0.98 at level 1), Kehlchen's Triller (0.73/1.33), Harz's Stab at level 1 (1.49).
- **Lessons** (also in `dev/tests/klang/BRIEF-engines.md`, the builders’ brief): offline port messages arrive only at a suspend (kick one after each); a float sample index gives NaN (round it); measure a self-oscillator's pitch on its fundamental's line, not with a comb; a level-3 voice that outputs stereo skips the voice's centre panner (−3 dB at level 1) – scale it.

### Owner's calls (open)
- Moder: default Nachklang 5 s (KONZEPT says „4–6 s Brummen“) – kept.
- Böe: default Nachklang 3 s (KONZEPT „vier bis sechs Sekunden“); library sentence 53 characters (SPEC's limit 52).
- Sehne: the knob is „Nachklang“ (a time) where KONZEPT says „Dämpfung“; Saite's library sentence is now „Gezupfte Saiten – leicht, viele Stimmen zugleich“; the E-Bow costs up to 0.94/1.84 units (jawari; final calibration) and is priced only while the hand is in its zone.
- Zapfen and Glut: their native stand-ins cost more than SPEC's estimate (≈ 1.2 and 1.0 units, final calibration) because they keep the full sound (the owner's rule); a lean version would sound clearly worse.
- Zapfen: the Rast-step row reads „within the tick train's own crest + 1 dB“ (a 14/s train alone has 6–7 dB crest).

### Still open
- **By ear:** every new source's „for the ear“ list in SPEC's As-built lines and the builders' reports – Gespinst's halo level, Rhizom's knock and Glimmen, Kehlchen's chips and roughness, Sehne's jawari bloom and E-Bow swell, Zapfen's saw/mode balance and Fels, Glut's swell speed and breathing, Moder's crackle, Böe's wind, Amöbe's unrest.
- Device checks on a real phone (level 1 budget with the new sources, worklet load time), the parity/soak suites after the owner's listening round.
- The claude.ai artifact is still stage 1 (see above).

### Other open items
- Backup: the private repo `BeidlAT/myzelbackup` holds a full copy of every branch (made 18.10.2026); it does not update itself – on „Backup aktualisieren“ push the new state there (add the repo to the session first).
