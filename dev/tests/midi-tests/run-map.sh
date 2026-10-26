#!/bin/sh
# MIDI part 3 (mapping: targets, bindings, profiles, learn, persistence) suites. Builds the 'mm' test slot from the
# current app; needs the static server on :8790 (cd ../v2 && python3 -m http.server 8790 &). Exit code ≠ 0 on failure.
D=$(cd "$(dirname "$0")" && pwd)
sh "$D/../v2/mk.sh" /home/user/4claude/myzel mm >/dev/null
cd "$D" || exit 1
rc=0
for t in t-map-nks t-map-mk t-map-nk2 t-map-rel t-map-learn t-map-touche t-tch-fx t-hold; do
  echo "== $t"
  node "$t.js" > "out/$t.log" 2>&1 || rc=1
  grep -c '^PASS' "out/$t.log" | sed 's/^/   PASS: /'
  grep -E '^FAIL|Error' "out/$t.log"
done
exit $rc
