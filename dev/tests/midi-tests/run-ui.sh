#!/bin/sh
# MIDI part 4 (the Gerät panel's Keyboard & Controller UI) suite. Builds the 'mu' test slot from the current app; needs
# the static server on :8790 (cd ../v2 && python3 -m http.server 8790 &). Exit code ≠ 0 if it fails.
# Screenshots of every state and size (not a test): node shot-mu.js [state …] [p390 p360 d1280 ipad]
D=$(cd "$(dirname "$0")" && pwd)
sh "$D/../v2/mk.sh" /home/user/4claude/myzel mu >/dev/null
cd "$D" || exit 1
rc=0
for t in t-ui; do
  echo "== $t"
  node "$t.js" > "out/$t.log" 2>&1 || rc=1
  grep -c '^PASS' "out/$t.log" | sed 's/^/   PASS: /'
  grep -E '^FAIL|Error' "out/$t.log"
done
exit $rc
