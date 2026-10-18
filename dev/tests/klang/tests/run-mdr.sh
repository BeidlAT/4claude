#!/bin/sh
# Moder's own runs (k-mdr sandbox): the suites against the kd-mdr / kn-mdr / kl-mdr slots.   sh run-mdr.sh [suite …]
D=$(cd "$(dirname "$0")" && pwd)
cd "$D" || exit 1
export KD_URL=http://127.0.0.1:8790/kd-mdr-inst/index.html KN_URL=http://127.0.0.1:8790/kn-mdr-inst/index.html KL_URL=http://127.0.0.1:8790/kl-mdr-inst/index.html KN_FRAME=http://127.0.0.1:8790/kn-mdr-frame.html
export MYZEL_SRC=/home/user/4claude/.claude/worktrees/agent-a12fa8c288aea2b8a/myzel/index.html
SUITES=${*:-"t-dsp t-lib-row t-lib-lib t-lib-a11y t-lib-migr t-lib-fb t-eng-live t-eng-native t-parity"}
rc=0
for t in $SUITES; do
  node "$t.js" > "out/$t.log" 2>&1 || rc=1
  echo "== $t: $(grep -c '^PASS' "out/$t.log") pass, $(grep -c '^FAIL' "out/$t.log") fail"
  grep -E '^FAIL|Error' "out/$t.log" | cut -c1-400
done
exit $rc
