#!/bin/sh
# The performance harness – CPU per thread while Myzel idles, plays, runs the Puls; and Ruhe's proofs. Needs the static
# server on :8790 serving ../v2 (sh dev/setup-tests.sh <scratch> starts it). Never run it beside other heavy tests.
#   sh run.sh            the guard: Ruhe's parity (offline renders, every sample) and live tests, then the current tree
#                        against baseline.json's reference commit, measured alternately (check.js; exit 1 on a regression)
#   sh run.sh baseline   measure the current tree (5 runs) and store it as baseline.json, with its commit as reference
#   sh run.sh table <commit>…   perf.js on any commits (slots p<commit>-inst), every scenario, both viewports
# Parts: lib.js (viewports, /proc per thread, scenarios), perf.js (the table), inv.js (the node inventory: what the
# render pulls and what of it is busy), check.js (the guard), t-idle-parity.js, t-idle-live.js.
D=$(cd "$(dirname "$0")" && pwd); V="$D/../v2"; R=/home/user/4claude
PARITY_BASE=e341c1b   # the last build before Ruhe: the parity reference
build() { mkdir -p "$D/src-$1" && git -C "$R" show "$1:myzel/index.html" > "$D/src-$1/index.html" && git -C "$R" show "$1:myzel/tap-worklet.js" > "$D/src-$1/tap-worklet.js" && sh "$V/mk.sh" "$D/src-$1" "$2" >/dev/null; }
case "$1" in
  table) shift; S=""; for c in "$@"; do build "$c" "p$c"; S="$S p$c-inst"; done; node "$D/perf.js" $S; exit $? ;;
  baseline) sh "$V/mk.sh" "$R/myzel" perfcur >/dev/null; node "$D/check.js" --write; exit $? ;;
esac
sh "$V/mk.sh" "$R/myzel" perfcur >/dev/null
sh "$V/mk.sh" "$R/myzel" perfnew >/dev/null
build "$PARITY_BASE" "p$PARITY_BASE"
REF=$(node -e "try{console.log(require('$D/baseline.json').ref)}catch(e){console.log('$PARITY_BASE')}")
build "$REF" perfref
rc=0
echo "== t-idle-parity"; OLD="p$PARITY_BASE-inst" NEW=perfnew-inst node "$D/t-idle-parity.js" || rc=1
echo "== t-idle-live"; URL=http://127.0.0.1:8790/perfcur-inst/index.html node "$D/t-idle-live.js" || rc=1
echo "== check (against $REF)"; node "$D/check.js" || rc=1
exit $rc
