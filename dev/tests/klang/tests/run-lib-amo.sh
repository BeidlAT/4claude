#!/bin/sh
# the library suites, t-eng-native and t-parity against my slots (kn-amo); logs in out/
D=$(cd "$(dirname "$0")" && pwd)
cd "$D" || exit 1
export KL_URL=http://127.0.0.1:8790/kn-amo-inst/index.html KN_URL=http://127.0.0.1:8790/kn-amo-inst/index.html
for t in t-lib-row t-lib-lib t-lib-a11y t-lib-migr t-lib-fb t-lib-shots t-eng-native t-parity; do
  timeout 900 node "./$t.js" > "out/$t.log" 2>&1
  echo "$t: $(grep -E 'passed' "out/$t.log")"
  grep -E '^FAIL|fatal' "out/$t.log"
done
