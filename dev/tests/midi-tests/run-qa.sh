#!/bin/sh
# Final QA: every MIDI suite (build parts 1–4, review reproducers, UX and robustness reviewers, soak) against slot mq.
# Usage: sh run-qa.sh [suite …]   (default: all). Logs in qa-out/. Needs the static server on :8790.
D=$(cd "$(dirname "$0")" && pwd)
# mrbase / r2b: the app before MIDI part 1 (parity and reviewer comparisons)
if [ -z "$NOBUILD" ]; then for s in mq; do sh "$D/../v2/mk.sh" /home/user/4claude/myzel $s >/dev/null; done; for s in mrbase r2b; do sh "$D/../v2/mk.sh" "$D/orig" $s >/dev/null; done; fi
export BASE=http://127.0.0.1:8790/mq-inst/index.html
cd "$D" || exit 1
ALL="t-fix t-router t-mpe t-clock t-ports t-parity t-ble-codec t-ble-link t-ble-errors t-ble-dedupe t-ble-timing t-ble-plat t-map-nks t-map-mk t-map-nk2 t-map-rel t-map-learn t-ui
review/u-codec review/t-r-clock review/t-r-mpe review/t-r-slide review/t-r-nrpn review/t-r-ble review/t-r-frozen review/t-r-pair review/t-r-ano review/t-r-clkout review/t-r-clkq review/t-r-takeover
rv2/t-rv-stuck rv2/t-rv-dblon rv2/t-rv-expr rv2/t-rv-sense rv2/t-rv-poly rv2/t-rv-late rv2/t-rv-flood rv2/t-rv-bleflood rv2/t-rv-leak rv2/t-rv-cc123 rv2/t-rv-panelcost rv2/t-rv-stall
r-android-flow r-deny r-return r-errs r-targets r-tui44 r-aria r-search r-keys r-keys2 r-ipad r-ipadp r-landcover r-land r-touchlearn r-takeover r-contrast r-perf2 r-qa-proto r-qa-sense r-qa-rip soak-midi"
L=${*:-$ALL}
rc=0
for t in $L; do
  n=$(echo "$t" | tr '/' '_')
  ( cd "$(dirname "$D/$t.js")" && timeout 600 node "$(basename "$t").js" ) > "qa-out/$n.log" 2>&1; r=$?
  [ $r -ne 0 ] && rc=1
  echo "== $t rc=$r PASS=$(grep -c '^PASS' qa-out/$n.log) FAIL=$(grep -c '^FAIL' qa-out/$n.log)"
  grep -E '^FAIL|Error' "qa-out/$n.log" | cut -c1-260 | head -8
done
exit $rc
