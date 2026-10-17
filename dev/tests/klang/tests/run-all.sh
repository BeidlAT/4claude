#!/bin/sh
# klang stage 1 (worklet module, Halm, Ranke) and 1b (the Klangquellen library): all suites. Builds the test slots kd/kn (current app) and kbase
# (klang/index.base.html, the app before stage 1, for the parity check); needs the static server on :8790
# (cd ../../v2 && python3 -m http.server 8790 &). Exit code ≠ 0 if any suite fails. Logs and renders in out/.
#   env: SKIP_BENCH=1 skips the offline bench (≈ 4 min), COST_ROUNDS=n for its cost rounds (default 4)
D=$(cd "$(dirname "$0")" && pwd)
S="$D/../.."
mkdir -p "$D/out" "$D/../work/base-src"
cp "$D/../index.base.html" "$D/../work/base-src/index.html"
cp /home/user/4claude/myzel/tap-worklet.js "$D/../work/base-src/"
sh "$S/motion-tests/syn.sh" /home/user/4claude/myzel/index.html || exit 1
sh "$S/v2/mk.sh" /home/user/4claude/myzel kd >/dev/null
sh "$S/v2/mk.sh" /home/user/4claude/myzel kn >/dev/null
sh "$S/v2/mk.sh" /home/user/4claude/myzel kl >/dev/null   # stage 1b, the library UI (t-lib-*: klh.js)
sh "$S/v2/mk.sh" "$D/../work/base-src" kbase >/dev/null
printf '<!doctype html><meta charset="utf-8"><iframe id="f" src="kn-inst/index.html" style="width:780px;height:880px"></iframe>' > "$S/v2/kn-frame.html"
cd "$D" || exit 1
SUITES="t-dsp t-parity t-eng-live t-lib-row t-lib-lib t-lib-a11y t-lib-migr t-lib-fb t-lib-shots"
[ -z "$SKIP_BENCH" ] && SUITES="$SUITES bench"
rc=0
for t in $SUITES; do
  echo "== $t"
  node "$t.js" > "out/$t.log" 2>&1 || rc=1
  grep -c '^PASS' "out/$t.log" | sed 's/^/   PASS: /'
  grep -E '^FAIL|Error' "out/$t.log"
done
exit $rc
