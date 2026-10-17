#!/bin/sh
# MIDI part 1 suites. Builds the test slots (mr = current app, mrbase = original in ./orig for the parity check),
# needs the static server on :8790 (cd ../v2 && python3 -m http.server 8790 &). Exit code ≠ 0 if any suite fails.
D=$(cd "$(dirname "$0")" && pwd)
sh "$D/../v2/mk.sh" /home/user/4claude/myzel mr >/dev/null
sh "$D/../v2/mk.sh" "$D/orig" mrbase >/dev/null
cd "$D" || exit 1
rc=0
for t in t-router t-mpe t-clock t-ports t-parity; do
  echo "== $t"
  node "$t.js" > "out/$t.log" 2>&1 || rc=1
  grep -c '^PASS' "out/$t.log" | sed 's/^/   PASS: /'
  grep -E '^FAIL|Error' "out/$t.log"
done
exit $rc
