#!/bin/sh
# Zapfen (stage 5): every suite of this copy against the builder's own slots (kd-zpf, kn-zpf; build them first with
# v2/mk.sh <worktree>/myzel kd-zpf|kn-zpf). Logs in out/<suite>-zpf.log, a summary on stdout.
D=$(cd "$(dirname "$0")" && pwd)
W=${MYZEL_SRC:-/home/user/4claude/.claude/worktrees/agent-a6fca2ac5a3fb2286/myzel/index.html}
export MYZEL_SRC="$W" KD_URL=http://127.0.0.1:8790/kd-zpf-inst/index.html KN_URL=http://127.0.0.1:8790/kn-zpf-inst/index.html KL_URL=http://127.0.0.1:8790/kn-zpf-inst/index.html
cd "$D" || exit 1
for t in t-dsp t-eng-live t-eng-native t-parity t-lib-row t-lib-lib t-lib-a11y t-lib-migr t-lib-fb t-lib-shots; do
  node "$t.js" > "out/$t-zpf.log" 2>&1
  echo "$t: $(grep -E '^[0-9]+ passed' "out/$t-zpf.log")"
  grep -E '^FAIL' "out/$t-zpf.log"
done
[ -z "$SKIP_BENCH" ] && { COST_ROUNDS=${COST_ROUNDS:-6} node bench.js zpf > out/bench-zpf.log 2>&1; echo "bench zpf: $(grep -E 'passed' out/bench-zpf.log)"; grep -E '^FAIL|^INFO' out/bench-zpf.log; }
