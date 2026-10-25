#!/bin/sh
# Hexenring suites (dev/looper/SPEC.md §22): builds the test slot hx (the current app, instrumented), needs the static
# server on :8790 (cd ../v2 && python3 -m http.server 8790 &). Exit code ≠ 0 if any suite fails. Logs in out/.
#   env: MIN=60 (t-hx-proc's simulated hour), POOLMIN=10 (its pool run) – shorter for a quick look
#   t-hx-ui writes its screenshots to out/ui-*.png (SHOTS=dir elsewhere) – look at them
D=$(cd "$(dirname "$0")" && pwd)
sh "$D/../motion-tests/syn.sh" /home/user/4claude/myzel/index.html || exit 1
sh "$D/../v2/mk.sh" /home/user/4claude/myzel hx >/dev/null
sh "$D/../v2/mk.sh" /home/user/4claude/myzel mr >/dev/null   # (the MIDI harness's own slot, for parity of its helpers)
cd "$D" || exit 1
mkdir -p out
rc=0
for t in t-hx-proc t-hx-taps t-hx-clock t-hx-humus t-hx-ohr t-hx-ernten t-hx-grammar t-hx-persist t-hx-ui t-hx-werk t-hx-bake t-hx-seams t-hx-form t-hx-ctl t-hx-bew t-hx-oeko t-hx-fuzz t-hx-taumeln t-hx-rsw t-bow-wasm t-hx-wuchs t-hx-tempo t-hx-tools t-hx-mitspieler t-hx-gaertner t-hx-oeko2 t-hx-mikro t-hx-live t-hx-phone t-hx-guard t-hx-tap t-hx-tips t-hx-soak; do
  echo "== $t"
  node "$t.js" > "out/$t.log" 2>&1 || rc=1
  grep -c '^PASS' "out/$t.log" | sed 's/^/   PASS: /'
  grep -E '^FAIL|^INFO|Error' "out/$t.log"
done
exit $rc
