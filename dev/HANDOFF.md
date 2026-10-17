# Übergabe: Myzel – neue Klangquellen (Stand 17.10.2026, Commit fb6234a)

## Für den Besitzer

Fertig und veröffentlicht sind:
- das gemeinsame DSP-Modul, das nur geladen wird, wenn eine neue Quelle gewählt wird;
- **Halm** und **Ranke**;
- die **Bibliothek**: die Zeile ‹ Name › an jeder Auswahlstelle, dazu Suche, Familien, Favoriten und „Überrasch mich“.

Offen sind zehn Quellen in sechs Etappen (siehe unten).

So geht es in einer neuen Sitzung nahtlos weiter: Öffne eine neue Claude-Code-Sitzung auf diesem Repository und diesem Branch und schicke diesen Satz:

> Lies dev/HANDOFF.md und mach mit der nächsten Etappe der Klangquellen weiter.

## For the next session (English working notes)

**Branch:** `ccr-c7c5d0a6-cus3ip` – develop, commit and push only there; no PR unless asked.

Commit trailers:
```
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: <this session's URL>
```

**App:** `myzel/index.html`, a single file of about 1.3 MB (German UI, vanilla JS + Web Audio). Each push deploys GitHub Pages (https://beidlat.github.io/4claude/).

**claude.ai version:** the artifact https://claude.ai/artifact/HNZYLEaUvtCfkyYWi3SuDr, version 10, private, capability `downloads`.
- Republish it with the Artifact tool: `url` + `file_path` = `myzel/index.html`.
- A new conversation must first `read` the artifact, then publish.

**Workflow etiquette:**
- Build stage by stage, as the owner chose. Each stage is built, tested, committed, pushed and published before the next one starts.
- Report to the owner in German, briefly.
- The owner's Claude usage limits have been hit repeatedly. Prefer a few sequential background `Agent` calls per stage (build → build UI/texts → review/fix) over big multi-agent workflows.

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
  - `klang/tests/run-all.sh` covers stage 1 and the library. `SKIP_BENCH=1` skips the 4-minute offline bench; `bench.js` is the per-engine acceptance bench, so extend it for each new engine.
  - `v2/func.js` needs slot `new` (→ `new-inst`). Other v2 suites: `fixes`, `mobile`, `bars`, `bars2`, `integrity`, `sources`, `live2`, `presets`, `smoke`, and `SEED_BLOBS=1 NO_RAF=1 node mixfunc.js mnew-inst` (slot `mnew`).
  - `mixui/f/func.js` needs slot `mix`.
  - `midi-tests/run-all.sh`.
  - `motion-tests/run-all.sh` is long; a few timing checks flake under load, so re-run those alone.
- Syntax check: `sh <scratch>/motion-tests/syn.sh myzel/index.html`.

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

### Next stages (SPEC §8; step 1–2 + library = done)
1. **Stage 2:** `elm` Elmsfeuer and `jrg` Jahresring – both native, no worklet (SPEC §3.9, §3.12).
2. **Stage 3:** `hrz` Harz – glas/schale/stab, then zunge/teich by ear (§3.1).
3. **Stage 4:** `mdr` Moder, `boe` Böe, `amo` Amöbe (§3.10, §3.4, §3.5).
4. **Stage 5:** `zpf` Zapfen (+ native fallback), `shn` Sehne (+ Jawari), `glt` Glut (+ native fallback) (§3.8, §3.7, §3.3).
5. **Stage 6:** `gsp` Gespinst – singleton web, governor, mixer strip, budget (§3.11).
6. **Stage 7:**
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
