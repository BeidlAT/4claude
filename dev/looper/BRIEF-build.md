# Brief for Hexenring builders

You build part of the Hexenring looper into Myzel. Read first:
- `dev/looper/SPEC.md` – binding build spec (English). Your step is named in your task.
- `dev/looper/KONZEPT.md` – the owner-facing concept (German); §12 = the owner's decisions.
- `dev/looper/research/code-map.md` – where things are in the code (line numbers drift: search by name).
- `dev/looper/ideas/engineer.md`, `dev/looper/ideas/check-engineer.md`, `dev/looper/research/faehrte.md` – measurements,
  pitfalls; prototype scripts in `dev/looper/ideas/engineer-experiments/` (e.g. `loopproc.js`, `e4-drift.js`,
  `e10-click.js`, `e9-direct.js`) and `dev/looper/ideas/check-engineer-experiments/` (`c1-swap.js` …).
- `dev/HANDOFF.md` – test infrastructure, lessons, project rules.
- `CLAUDE.md` – the owner's standing rule: best sound quality always; cost measured honestly, never a reason to
  simplify; if two goals conflict, stop and report – do not decide.

## Rules
- The app is one file: `myzel/index.html` (German UI, vanilla JS + Web Audio). Worklet code lives inside `myzelDsp()`
  (copied by `toString()`, no outside closures). New code in the delimited section `/* ---------- Hexenring ---------- */`
  with prefixes `hx`/`HX`; hooks in existing code minimal and marked `// Hexenring:`. Match the surrounding style:
  dense, commented with the *why*, German UI strings, short.
- Work directly in `/home/user/4claude` on the current branch (`ccr-183ec81a-rkp3np`). You are the only builder
  working right now. Commit when a coherent piece works and its tests pass; push with `git push -u origin
  ccr-183ec81a-rkp3np`. Commit message: what and why; end with exactly these two lines:
  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01LLSMGriJSveVsBPJigcs9e
  ```
  Never put a model name anywhere else (code, comments, docs).
- Tests: setup once `sh dev/setup-tests.sh /tmp/claude-0/-home-user-4claude/31b62666-e283-5142-ac94-5f41b61da83b/scratchpad`
  (already done; re-run only if `$S/v2/mk.sh` is missing) – S is that scratchpad. Static server on :8790 serves `$S/v2`
  (start it if `curl -s -o /dev/null http://127.0.0.1:8790/` fails: `cd $S/v2 && nohup python3 -m http.server 8790
  >/dev/null 2>&1 &`). `sh $S/v2/mk.sh /home/user/4claude/myzel hx` builds `$S/v2/hx/` and the instrumented
  `$S/v2/hx-inst/` (window.__M exports; extend the export list in `$S/v2/mk.sh` **and** in `dev/tests/v2/mk.sh` via its
  guarded-block mechanism if you need more internals). Playwright: `require('/opt/node22/lib/node_modules/playwright')`,
  Chromium args `['--autoplay-policy=no-user-gesture-required']`, start sound with `#btnStart`. Syntax check:
  `sh $S/motion-tests/syn.sh myzel/index.html`.
- New tests go to `dev/tests/hexenring/` (copy them into `$S/hexenring/` to run; paths like the other suites) with a
  `run-all.sh`. Keep every existing suite green; at the end of your step run at least: `sh $S/reg.sh` (v2, mixfunc,
  mixui, MIDI, Gestik; a few Gestik timing checks flake under load – re-run those alone), `SKIP_BENCH=1 sh
  $S/klang/tests/run-all.sh`, `node $S/klang/tests/smoke-all.js`. Note: t-parity "presets ask for no worklet" may now
  need updating because the DSP module loads at audio start (owner decision: Humus from the first note) – update tests
  that encode the old lazy-loading rule, and say so.
- Offline renders: port messages reach a processor only at the next `suspend()` – kick one after each message (see
  `$S/klang/tests/bench.js`). Use the processor's own frame counter, not `currentFrame`.
- Do not break phones: the Hexenring targets strong devices, but phones must still work.
- When you finish, append a short "As built (step N)" note to `dev/looper/SPEC.md` under the relevant sections
  (what differs from the letter and why, measured), and report back: what works, what is tested, what is left, any
  conflict with the owner's rules, and the commits.
