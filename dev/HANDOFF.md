# Übergabe: Myzel – neue Klangquellen (Stand 17.10.2026, Etappe 2 fertig)

## Für den Besitzer

Fertig und veröffentlicht sind:
- das gemeinsame DSP-Modul, das nur geladen wird, wenn eine neue Quelle gewählt wird;
- **Halm** und **Ranke**;
- die **Bibliothek**: die Zeile ‹ Name › an jeder Auswahlstelle, dazu Suche, Familien, Favoriten und „Überrasch mich“;
- **Elmsfeuer** und **Jahresring** (Etappe 2, ohne Worklet gebaut).

Offen sind acht Quellen in fünf Etappen (siehe unten).

So geht es in einer neuen Sitzung nahtlos weiter: Öffne eine neue Claude-Code-Sitzung auf diesem Repository und diesem Branch und schicke diesen Satz:

> Lies dev/HANDOFF.md und mach mit der nächsten Etappe der Klangquellen weiter.

## For the next session (English working notes)

**Branch:** the one named in the session (stage 1 was on `ccr-c7c5d0a6-cus3ip`, stage 2 on `ccr-d21a93b2-oncy3v`) – develop, commit and push only there; no PR unless asked.

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
  - `klang/tests/run-all.sh` covers stages 1–2 and the library. `SKIP_BENCH=1` skips the offline bench (≈ 20 min for four engines); `bench.js` is the per-engine acceptance bench (`node bench.js elm jrg` for single engines), so extend it for each new engine – its table `T` takes `native`, `struck`, `pp` (params for the pitch checks) and `cost` (env for `cost.js`).
  - `klang/tests/t-eng-native.js`: stage 2 live (Elmsfeuer, Jahresring: finger, MIDI, lanes, jumps, the year clock, Verjüngen, Schlafen, Rassel, no worklet).
  - `v2/func.js` needs slot `new` (→ `new-inst`). Other v2 suites: `fixes`, `mobile`, `bars`, `bars2`, `integrity`, `sources`, `live2`, `presets`, `smoke`, and `SEED_BLOBS=1 NO_RAF=1 node mixfunc.js mnew-inst` (slot `mnew`).
  - `mixui/f/func.js` needs slot `mix`.
  - `midi-tests/run-all.sh`.
  - `motion-tests/run-all.sh` is long; a few timing checks flake under load, so re-run those alone.
- Syntax check: `sh <scratch>/motion-tests/syn.sh myzel/index.html`.
- `sh <scratch>/reg.sh` runs every regression suite after a stage (v2, mixfunc, mixui, MIDI, Gestik) into `<scratch>/reglogs/`, summary on stdout.
- Cost (`klang/tests/cost.js`): this machine's render times scatter by ±20 % between runs. The script keeps each candidate's fastest of N interleaved rounds and scales by the **median** of the held native references; struck engines need `DUR` inside their voices' life (Jahresring: `DUR=2 PARAMS='{"jrg.holz":1,"jrg.jahreszeit":"sommer"}'`). Re-run before believing a single number.

### Notes from stage 1
- **OfflineAudioContext:** port messages to a processor only arrive at the next `suspend()`. The note-on therefore travels in `processorOptions.on`; tests add a suspend one block after a message (see `klang/tests/bench.js`).
- **Adding an engine:**
  - one `ENG_META` line (family, Spielweise, sentence, tags, Höhe word, `regen`, probe gate, level-3 text);
  - an `ENGINES` entry, which for a worklet engine has `needs:'worklet'` and `fallback:'<native key>'`;
  - the params (≤ 6), `VCOST1/3` (measured against 24 Nebel voices, interleaved), `MACRO`, `ENG_NOTE`.
  - All 26 glyphs are already in the sprite. `ENG_LATER` names the unbuilt keys; remove a key from it when it ships.
- **Open from stage 1:**
  - Halm's Flöte/Flamme are not built, so there is no `hlm.rohr` selector yet.
  - Ranke's held flutter has to be judged by ear.
  - Halm level 1 costs about 0.58 against the 0.55 target.
  - Long-press drag scrolling on real phones is untested.
  - Worklet load time and thread move on a mid-range Android are not measured.

### Notes from stage 2 (Elmsfeuer, Jahresring)
- **Built to SPEC §3.9/§3.12 with their full sound** (a first version had simplified both to reach SPEC's cost targets; the owner rejected that – best sound first). Cost as measured: Elmsfeuer ≈ 1.0–1.6 units at level 1 with its arc (≈ 2–4 at level 3), Jahresring ≈ 0.8–1.1 while its modes ring (≈ 2–2.7 at level 3); VCOST 1.8/4.2 and 1.2/2.9. The bench reports cost as INFO, it no longer fails on it.
- **Chromium cuts a BiquadFilter's output** after its own tail estimate once its input is silent – for a high-Q band-pass excited by a click that is long before the mode has rung out (Q 150 at 440 Hz: cut at 0.29 s, T60 0.75 s). Jahresring's contact source loops a −140 dB trickle until the voice ends (`jrgImp`). Any future native resonator needs the same.
- **Where the build differs from SPEC's letter, and why** (each measured): the hum is one PeriodicWave with SPEC's lopsided tanh baked in (same sound as two oscillators and a shaper, without aliasing or offset); the corona's pre-gain is set so the threshold lies z = 4.1 → 1.4 standard deviations out (SPEC's 0.6 + 1.2·y gave almost no ticks; the acceptance asks 50–300/s) and its level `knistern·(0.2 + y)` is evened out with the density (else the ticks low are inaudible and the fizz high buries the arc); the arc's follower has a soft ceiling (bursts of ticks would pop) and its tanh is oversampled (2×, level 3 4×); a high-pass after the arc's tanh takes its offset; the shared loops (steps, two gates) are 16 s, not 2 s (the check's „repeats audibly“), the steps capped at 2.7 jumps/s; zap steps stay in key (KONZEPT „in der Tonart“ over SPEC's „depth ∝ vel“); a zap halves the hum so the arc leads. Jahresring: the mallet is its contact (a click, the same every hit) plus SPEC's 2–6 ms noise burst, so no hit comes out weak; a soft mallet weakens the upper modes and the box opens toward the bar's end (both for SPEC's „centre round, end bright“); the knock passes the box (SPEC's „knock noise“); the ice crack adds a 2-ms tick past the box so it is heard.
- **Native cost is per node, ~6–10 ns each** (≈ 0.05–0.07 units), more than SPEC's 0.03/AudioParam.
- The year starts where the calendar stands (5 May = spring), runs in `tick()` (`jrgClock`) only while the context runs and the page is visible, hits add ≤ 2/s. Age resets with Verjüngen, Schlafen and panic.
- **Library texts:** `famPlay()` names a family by the way most of its sources play (Elmsfeuer, „beides“, would otherwise have moved Luft into „Tippen und Wischen“).
- **By ear, still open:** the arc's character, the crackle density at default height, the Jahresring box/tube/knock balance, leaves and ice levels.
- **Halm** (stage 1) still lacks SPEC's Flöte and Flamme – by the owner's rule they belong in, at the next chance.

### Next stages (SPEC §8; step 1–3 + library = done)
1. **Stage 3:** `hrz` Harz – glas/schale/stab, then zunge/teich by ear (§3.1).
2. **Stage 4:** `mdr` Moder, `boe` Böe, `amo` Amöbe (§3.10, §3.4, §3.5).
3. **Stage 5:** `zpf` Zapfen (+ native fallback), `shn` Sehne (+ Jawari), `glt` Glut (+ native fallback) (§3.8, §3.7, §3.3).
4. **Stage 6:** `gsp` Gespinst – singleton web, governor, mixer strip, budget (§3.11).
5. **Stage 7:**
   - presets and Gestik recipes (§5);
   - texts and README;
   - parity, soak and device checks;
   - reserves `khl` Kehlchen and `rhz` Rhizom, only if everything else passes.

Every stage must clear the same gate:
- the engine passes `bench.js` (loudness ±2 dB, peak ≤ −1 dBFS, no NaN or DC, centroid rising with y, cost on target, level 3 within ±1.5 dB, held/burst/release, pitch tolerance, spectrogram looked at);
- the stage's own Playwright checks pass;
- all regression suites are green;
- then commit, push, republish the artifact, and give the owner a short German report.

### Other open items
- Backup: the owner wanted a private GitHub repo `4claude-backup`; still waiting for them to create it. Downloadable bundle/ZIP backups have been provided before (`git bundle create … --all` plus `git archive`).
