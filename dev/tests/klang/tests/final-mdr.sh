#!/bin/sh
# Moder's final pass (k-mdr sandbox): rebuild the slots from the worktree, then every suite one after another (no
# contention between them): the processor in Node, the bench (mdr), live, native, library, parity, the Rassel's Gestik test.
D=$(cd "$(dirname "$0")" && pwd)
S="$D/../.."
W=/home/user/4claude/.claude/worktrees/agent-a12fa8c288aea2b8a/myzel
sh "$S/motion-tests/syn.sh" "$W/index.html" || exit 1
for s in kd-mdr kn-mdr kl-mdr gl-mdr; do sh "$S/v2/mk.sh" "$W" "$s" >/dev/null; done
cd "$D" || exit 1
export KD_URL=http://127.0.0.1:8790/kd-mdr-inst/index.html KN_URL=http://127.0.0.1:8790/kn-mdr-inst/index.html KL_URL=http://127.0.0.1:8790/kl-mdr-inst/index.html KN_FRAME=http://127.0.0.1:8790/kn-mdr-frame.html
export MYZEL_SRC="$W/index.html" COST_ROUNDS=${COST_ROUNDS:-3}
rc=0
run() { name=$1; shift; "$@" > "out/$name.log" 2>&1 || rc=1; echo "== $name: $(grep -c '^PASS' "out/$name.log") pass, $(grep -c '^FAIL' "out/$name.log") fail"; grep -E '^FAIL|^INFO|Error' "out/$name.log" | cut -c1-500; }
run t-dsp node t-dsp.js
run bench-mdr node bench.js mdr
run t-eng-live node t-eng-live.js
run t-eng-native node t-eng-native.js
for t in t-lib-row t-lib-lib t-lib-a11y t-lib-migr t-lib-fb t-parity; do run "$t" node "$t.js"; done
run t-gl-rassel env GL=http://127.0.0.1:8790/gl-mdr-inst/index.html node ../motion-tests/t-gl-rassel.js
echo "rc=$rc"
exit $rc
