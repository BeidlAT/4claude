#!/bin/sh
# MIDI part 2 (Bluetooth LE MIDI + platform texts) suites. Builds the 'mb' test slot from the current app; needs the
# static server on :8790 (cd ../v2 && python3 -m http.server 8790 &). Exit code ≠ 0 if any suite fails.
D=$(cd "$(dirname "$0")" && pwd)
sh "$D/../v2/mk.sh" /home/user/4claude/myzel mb >/dev/null
cd "$D" || exit 1
rc=0
for t in t-ble-codec t-ble-link t-ble-errors t-ble-dedupe t-ble-timing t-ble-plat; do
  echo "== $t"
  node "$t.js" > "out/$t.log" 2>&1 || rc=1
  grep -c '^PASS' "out/$t.log" | sed 's/^/   PASS: /'
  grep -E '^FAIL|Error' "out/$t.log"
done
exit $rc
