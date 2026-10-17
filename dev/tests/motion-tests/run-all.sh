#!/bin/sh
# Gestik suites. Builds the test slots (gk = current app, gkbase = the app before Gestik in ./orig, for parity), needs the
# static server on :8790 (cd ../v2 && python3 -m http.server 8790 &). Exit code ≠ 0 if any suite fails.
# Later parts add their suites to SUITES (t-<area>-*.js; node ones run without the server).
D=$(cd "$(dirname "$0")" && pwd)
sh "$D/../v2/mk.sh" /home/user/4claude/myzel gk >/dev/null
sh "$D/../v2/mk.sh" "$D/orig" gkbase >/dev/null
sh "$D/../v2/mk.sh" /home/user/4claude/myzel gm >/dev/null   # part 2, the mod layer (t-gm-*: gm-h.js)
sh "$D/../v2/mk.sh" /home/user/4claude/myzel ga >/dev/null   # part 3, Anlehnen (t-ga-*: ga-h.js)
sh "$D/../v2/mk.sh" /home/user/4claude/myzel gl >/dev/null   # part 4, Ladung and Schlafen (t-gl-*: gl-h.js)
sh "$D/../v2/mk.sh" /home/user/4claude/myzel gf >/dev/null   # part 5, Fährte and Funkstrecke (t-gf-*: gf-h.js)
sh "$D/../v2/mk.sh" /home/user/4claude/myzel gs >/dev/null   # part 6, Sporenregen and Gestik-Rezepte (t-gs-*: gs-h.js)
sh "$D/../v2/mk.sh" /home/user/4claude/myzel gu >/dev/null   # part 7, UI and texts (t-gu-*: gk-h.js with any viewport)
sh "$D/../v2/mk.sh" /home/user/4claude/myzel gx >/dev/null   # fix phase: the review's findings (t-gx-*)
sh "$D/../v2/mk.sh" /home/user/4claude/myzel gq >/dev/null   # final QA: the 3-minute soak, the rain in a busy preset (t-gq-*)
cd "$D" || exit 1
mkdir -p out
SUITES="t-gk-pure t-gk-perm t-gk-clutch t-gk-learn t-gk-mess t-gk-parity t-gm-targets t-gm-stream t-gm-finger t-gm-learn t-gm-wheel t-gm-cost t-ga-ton t-ga-hoehe t-ga-bebung t-ga-tragen t-ga-cost t-gl-pure t-gl-ladung t-gl-rassel t-gl-tank t-gl-schwenken t-gl-schlafen t-gl-parity t-gl-cost t-gf-loop t-gf-pc t-gf-save t-gf-gk t-gf-funk t-gf-parity t-gf-cost t-gs-keime t-gs-regen t-gs-raster t-gs-strip t-gs-rezept t-gs-parity t-gs-cost t-gu-ui t-gx-pure t-gx-live t-gq-soak t-gq-rain"
rc=0
for t in $SUITES; do
  echo "== $t"
  node "$t.js" > "out/$t.log" 2>&1 || rc=1
  grep -c '^PASS' "out/$t.log" | sed 's/^/   PASS: /'
  grep -E '^FAIL|Error' "out/$t.log"
done
exit $rc
