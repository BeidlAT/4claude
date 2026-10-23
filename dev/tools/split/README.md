# Split tool: `myzel/index.html` as a module tree

**Applied on 23.10.2026 (Plan A below):** the app's source is `myzel/src/` (182 files), `myzel/build.py` (a copy of
`build.py` here) builds `myzel/index.html` from it byte for byte, and `myzel/index.html` stays committed as the build
output. Edit the modules, never `index.html`. `myzel/pwa/build.py`, the Pages workflow and `dev/tests/v2/mk.sh` refuse a
stale `index.html`. This tool stays for the escape hatch (a late branch that still edits `index.html`) and as the record
of how the tree was cut; `rules.py` is the map that produced `myzel/src`.

| File | What it does |
|---|---|
| `split.py` | `python3 split.py <index.html> <out-src-dir>`: cuts the app into ~155 modules (`html/`, `css/`, `js/…`) plus the shell `index.html`. Python 3 stdlib only. |
| `build.py` | `python3 build.py <src-dir> <out.html>` puts them back together by plain concatenation. `--check <file>` compares without writing; `--map m.json` writes which output lines came from which module. Stdlib only, importable (`build(src)`). |
| `rules.py` | The module map: where to cut and what each piece is called (edit this to regroup). |
| `lex.py` | A small JS/CSS scanner: for every line start, whether it lies between whole statements (not in a string, template, regex, comment, or open bracket). |
| `xref.js` | What a move to real ES modules would need (imports/exports per module, cross-module writes, load-order reads), and the check that the `toString()`-copied functions stay self-contained. Needs `acorn` + `eslint-scope`. |
| `test/run.py` | The acceptance: `python3 test/run.py <scratch-dir> [-v] [commit …]`. |

## How it works

- **Shell + includes.** `src/index.html` is the page with every module replaced by one line, `/* @include css/top-bar.css */`, `<!-- @include html/app.html -->` or `// @include js/core/params.js` (paths relative to `src/`). The build replaces each such line with the file, byte for byte, recursively. The order of these lines is the manifest. The app is one IIFE whose top-level `const`/`let` and hoisted functions share one scope, so the order matters and stays exactly the file's order.
- **Where it cuts.** Only at section markers of the file itself (`/* ===== banner ===== */`, `/* ---------- x ---------- */`, `// ---- x ----`) and a few top-level declarations (`const ELM = {`, `function initAudio(`, `function boot(`), and only where `lex.py` sees a line start between two whole statements at the IIFE's top level. A cut moves up over the comment block above it, so a section's heading stays with its code. A rule whose marker is missing, for example in an older or newer file, is reported and skipped: its code stays in the module before it, and the build stays byte-identical. A section added later just lands in the module before it until it gets a rule.
- **The build** errors on a missing module, an include cycle, a module included twice, and any file under `html/ css/ js/` that no include lists. So a new module cannot be forgotten.

## The module tree (as first planned: 30 955 lines → 155 files; applied: 33 444 lines → 182 files)

```
index.html 149 (shell: <title>, font links, <style>/<script> frames, include lines)
html/  glyphs 33 · app 74
css/   base 44 · top-bar 40 · field 93 · quick-strip 23 · puls 18 · recording 24 · presets 16 · geraet 256 ·
       overlays 101 · hexenring 92 · klangquellen 138
css/mixer/  mixer 34 · head 152 · console 182 · puls-mix 68 · fruchtkoerper 321 · geflecht 125
js/core/     helpers 49 · tuning 22 · params 536 · notes 64 · audio 147 · buffers 601 · init-audio 168 · chain 44 ·
             apply 123 · ruhe 144 · quality 61
js/voices/   voice 111 · karplus 102 · alloc 38 · drone 69
js/engines/  elmsfeuer 86 · jahresring 53 · zapfen-native 140 · glut-native 152 · engines 1472 · dsp-loader 95 ·
             gespinst-web 54 · rhizom 275
js/dsp/      myzel-dsp 28 (the function's shell) · blocks 40 · contract 73 · halm 393 · ranke 216 · harz 248 ·
             moder 230 · boee 212 · amoebe 262 · gespinst 185 · sehne 351 · kehlchen 172 · zapfen 221 · glut 251 ·
             ring 1313
js/grains/   sources 52 · own-material 120 · mic 109
js/capture/  tap-src 5 · backup 84 · record 67 · bars 235 · wav-zip 118 · save 112 · preview 39
js/puls/     scheduler 141          js/play/  touch 124
js/midi/     midi 78 · webmidi 88 · ble 528 · messages 54 · mapping 245 · bindings 116 · profiles 249 · learn 243 ·
             input 355 · clock 229
js/gestik/   recognizer 426 · live 479 · zuweisen 60 · messen 135 · anlehnen 203 · ladung 133 · schlafen 223 ·
             ladung-schlafen-card 58 · sporenregen 415 · faehrte 157 · faehrte-presets 84 · rezepte 73 · funkstrecke 259
js/mod/      mod 424 · formen 105
js/ui/       visuals 214 · controls 259 · klangquellen 686 · presets 368 · geraet 372 · gestik-card 497 · bindings 245 ·
             sheet 163
js/mixer/    strips 127 · processing 132 · metering 77 · mixer 297 · knobs 145 · drags 118 · console 376 ·
             console-draw 444 · head 412 · snapshots 222 · views 180 · geflecht 309 · geflecht-draw 429 ·
             geflecht-gestures 255 · fruchtkoerper 205 · klangbild 293 · formen 164 · wege 225 · summe 203 ·
             pages 225 · hilfe 132 · puls-mix 258
js/hexenring/ taktgeber 94 · node 150 · calls 124 · humus 178 · ohr 104 · ernten 319 · grammar 336 · recuts 203 ·
             tick 166 · ringleiste 422 · card 216 · persist 190 · chain-log 76 · werk 327 · bake 84 · seams 278 ·
             timing 89 · lichtungen 250 · controls 316 · bewegung 174 · naehren 69 · auslese 130 · wuchs 315 ·
             wuchs-follow 277 · werkzeug 160 · band 174 · noten 149 · export 112 · folge-buehne 122
js/boot.js 62
```

Added at the switch-over (23.10.2026): `js/ui/update.js` 118 (the update card) and `js/ui/start.js` 77 (start screen:
wake lock, iOS unmute, the phone's keyboard line), cut out of `sheet.js`; Etappe 3 in `js/hexenring/mitspieler/`
(mitspieler 29 · variieren 198 · rollen 51 · gaertner 114 · antworten 158 · begleiten 173 · wiederkehr 69 · puls-lernt 37 ·
knospen 58 · herzschlag 31 · handschrift 103 · card 54) and Etappe 4 in `js/hexenring/oekologie/` (pass-notes 38 ·
midi-out 14 · naehren 130 · ladung 26 · veto 40 · treffen 172 · schleife-in-schleife 51 · zersetzung 116 · worker 92 ·
mikro 89 · gesang 87 · herzschlag 16 · card 151), cut out of `folge-buehne.js`.

Three files stay large because each is a single declaration and is never cut: `engines/engines.js` (the `ENGINES` object literal, 1 471 lines), `dsp/ring.js` (the class `Ring`, 1 220 lines), and `core/buffers.js` (`genTexture`, 548 lines). The order of the folders is not the order of the build: the shell's include lines are. For example, `js/mixer/strips.js` comes before `js/voices/voice.js`, exactly as in the file.

## Special cases

- **The DSP worklet (`myzelDsp`).** It stays **one self-contained function** in the built file, and `MYZEL_DSP_SRC = '(' + myzelDsp + ')();…'` still copies it by `toString()`. Its body is cut into one file per processor (`js/dsp/*.js`, cut at its own `  // ---- Halm: …` markers, depth 1 inside the function, never inside a class). `js/dsp/myzel-dsp.js` is the function's shell: the banner, `function myzelDsp() {`, the include lines, the empty voice `Null`, the `registerProcessor` loop, the `return`, `}` and `// end myzelDsp`. Rule: everything in `js/dsp/` runs in the AudioWorklet scope and may use nothing from the app. `xref.js` checks that `myzelDsp`, `genIR`, `genTexture` and `genKS` (copied by `toString()` into the buffer worker) read no app name (today: self-contained). The loading code (`MYZEL_DSP_SRC`, `ensureDSP`, …) lives in `js/engines/dsp-loader.js`, outside `js/dsp/`. `dev/tests/klang/tests/dsplib.js` finds `function myzelDsp()` … `// end myzelDsp` in the built file as before.
- **`TAP_SRC` / `myzel/tap-worklet.js`.** `TAP_SRC` is a minified copy of `tap-worklet.js`, used as the Blob fallback when the file URL cannot be loaded, and appended to `MYZEL_DSP_SRC`. It stays verbatim in `js/capture/tap-src.js`. The two copies are still kept in step by hand. After the switch, the builder could generate `TAP_SRC` from the file; that is the one change that would make a build differ from today's bytes, so it is left for later.
- **Text-pattern test builders.** `dev/tests/v2/mk.sh` patches `new AC({ latencyHint: L })` and `"\nboot();\n})();"`. `motion-tests/gk-lib.js` cuts `/* GK-PURE-BEGIN */…END` (now exactly `js/gestik/recognizer.js`), `motion-tests/syn.sh` checks the largest `<script>`, and `perf/run.sh` and `setup-tests.sh` use `git show <commit>:myzel/index.html`. All of them work on the **built** file, which is byte-identical, so they need no change as long as `myzel/index.html` stays committed (plan below).
- **`hxProbe` is declared twice** (`hexenring/ernten.js`, the step-1b version, and `hexenring/seams.js`, step 1c). The later one wins, in the single file and in the build alike. It is harmless now, but delete the dead first one before any move to ES modules: as separate modules, the callers in `ernten.js` would silently keep the old version. *(Since removed: the build at the switch-over declares no name twice.)*
- **The Werk-Rahmen** (`?werk=1`) loads the same page in a hidden frame. Nothing changes as long as one built page is served.

## Tests (`python3 dev/tools/split/test/run.py <scratch>`)

The run checks the working tree, HEAD and seven older commits spread over the file's history (or pass commits). For each version it:
1. splits, builds and requires a byte-identical result;
2. runs `check_decls.js` (acorn). Every top-level statement of the IIFE, and every statement of `myzelDsp`'s body, must lie in exactly one module, with no declaration cut. Every JS module must parse on its own in strict mode, and every CSS module must have balanced braces.

The run also includes:
- the scanner's unit cases (`test_lex.py`: regex vs division, templates with `${ { } }`, comments with braces, `else`, chained lines);
- a sanity check that the checker catches a boundary moved into a statement;
- `xref.js` on the current file.

It takes about 3 s per version, one version at a time. If acorn is missing, the statement check is reported as skipped; `npm i acorn eslint-scope` fixes that.

## Switch-over (done 23.10.2026 – kept as the record)

Plan A (recommended): **sources in `myzel/src/`, `myzel/index.html` stays committed as the build output.** Then Pages, the PWA, the claude.ai artifact and every test builder keep working unchanged, and only a guard is added.

1. Make sure all looper work is merged and pushed, and that no other session or branch still edits `myzel/index.html`.
2. Run `python3 dev/tools/split/test/run.py <scratch> -v`. It must say `ALL OK` with `rules missing 0` for the working tree. If new sections appeared, give them a rule in `rules.py`; otherwise they simply grow the module before them.
3. Split and check the result:
   ```
   python3 dev/tools/split/split.py myzel/index.html myzel/src
   cp dev/tools/split/build.py myzel/build.py
   python3 myzel/build.py myzel/src --check myzel/index.html     # → matches
   ```
4. `myzel/pwa/build.py`: right after reading `index.html`, refuse a stale build (the Pages job then fails instead of deploying old code):
   ```python
   sys.path.insert(0, APP); from build import build as build_app
   assert build_app(os.path.join(APP, 'src')) == src, 'myzel/index.html is not the build of myzel/src – run python3 myzel/build.py myzel/src myzel/index.html'
   ```
5. `dev/tests/v2/mk.sh`: the same guard as its first step, so no test runs a stale build:
   `[ -d "$SRC/src" ] && { python3 "$SRC/build.py" "$SRC/src" --check "$SRC/index.html" >/dev/null || exit 1; }`.
   Nothing else changes in mk.sh, dsplib.js, gk-lib.js, syn.sh, perf/run.sh or the `run-*.sh` scripts.
6. claude.ai artifact: publish exactly as before (`myzel/index.html`, `tap-worklet.js` as supporting file, capability `downloads`).
7. Docs: in `CLAUDE.md`, `dev/HANDOFF.md` and the README's „Aufbau“, write: *edit `myzel/src/`, then `python3 myzel/build.py myzel/src myzel/index.html`; never edit `myzel/index.html` by hand; module order = the include lines in `myzel/src/index.html`.* `dev/klang/research/code-map.md`: `grep -rn name myzel/src` replaces line numbers.
8. One commit with `myzel/src`, `myzel/build.py` and the edits above. The app's bytes do not change, so no test run is needed beyond `syn.sh`.

**Escape hatch.** If a late branch still edits `myzel/index.html` after the switch, run `split.py` on its file into an empty directory, copy that over `myzel/src`, and `git diff` shows its change module by module, because the same rules give the same tree.

Plan B (later, optional): stop committing `myzel/index.html`. Then `pwa/build.py` builds it (`src = build_app(...)` instead of reading the file), `mk.sh` builds into `$P/$NAME/`, and `dsplib.js`, `gk-lib.js`, `syn.sh`, `perf/run.sh`, `setup-tests.sh` (`git show <commit>:myzel/index.html` must become "check out the commit and build") and the artifact publishing build first. That costs more and buys little, so stay on Plan A.

## Later: real ES modules (not needed for editing; what it would take)

Concatenation costs nothing at run time, and the module tree already gives the editing benefit. Move only when there is a concrete reason (for example, publishing only changed files: claude.ai artifacts now keep files a publish leaves out). `node xref.js <app> <map>` measures the work. Today it reports:
- **121 modules, 3 837 import bindings over 2 138 shared names.** Each module needs explicit `import { … } from` and `export` lines. Generate them from `xref.js --json` rather than writing them by hand.
- **10 `let`/`var` assigned from another module:** `SR`, `Q`, `VBUDGET`, `MAXV`, `JRG_IMP`, `ZPF_BUF`, `userTexEl`, `takeCounter`, `midiDot`, `installEvt`. Imports are read-only, so each needs a setter or a field of a state object (the shared objects `A`, `P`, `HX`, `MIX`, … are already fine: their fields are written, not the bindings).
- **46 reads at load time from another module, in 30 modules** (for example `MOBILE`, `$`, `HXW` from `core/helpers.js`; `HX` from `hexenring/node.js`; `MXV` from `mixer/mixer.js`). ES modules run in import-graph order, not manifest order, and the graph has cycles. These reads must stay in modules that are evaluated after their source, or move into `boot()`.
- **Hoisting across files.** Function declarations stay callable across cyclic imports, but a function called at load time that reads another module's `const` hits the TDZ.
- **`hxProbe`**: the dead duplicate is gone (see above); `xref.js` reports any name declared twice.
- **The worklet:** `js/dsp/*` becomes a real worklet module file. It would be the parts without the function wrapper, `sampleRate` used as a global, loaded with `addModule(url)` like `tap-worklet.js`, and with a Blob fallback. Likewise a module worker for `genIR`/`genTexture`/`genKS`. `dsplib.js` would then load that file directly.
- **Strict mode** is already on (`'use strict'` in the IIFE), so nothing changes there.
- **Test exports:** `mk.sh` injects `window.__M = {…}` before `boot()`. Keep a concatenated test build for that, or add a test-only module that imports the names.
- **PWA / Pages / artifact:** `pwa/build.py` must copy the module files, which `sw.js` then precaches automatically. The artifact gets `<script type="module" src="js/main.js">` and the files as supporting files.
