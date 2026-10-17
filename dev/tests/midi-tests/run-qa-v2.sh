#!/bin/sh
# Final QA: the app's regression suites in v2 + mixui (slots new, mnew, mix must be built from the current app)
S=/tmp/claude-0/-home-user-4claude/c8d0b4bd-0d4c-545f-b176-6770c99f7009/scratchpad
O=$S/midi-tests/qa-out
cd $S/v2 || exit 1
for t in ${*:-func fixes mobile bars bars2 integrity sources live2 presets smoke mixfunc mixui}; do
  case $t in
    mixfunc) ( SEQ_BLOBS= SEED_BLOBS=1 NO_RAF=1 timeout 900 node mixfunc.js mnew-inst ) > $O/v2-$t.log 2>&1;;
    mixui) ( cd $S/mixui/f && timeout 900 node func.js ) > $O/v2-$t.log 2>&1;;
    smoke) timeout 900 node smoke.js out-smoke > $O/v2-$t.log 2>&1;;
    *) timeout 900 node $t.js > $O/v2-$t.log 2>&1;;
  esac
  echo "== $t rc=$? PASS=$(grep -cE '^(PASS|ok )' $O/v2-$t.log) FAIL=$(grep -c '^FAIL' $O/v2-$t.log)"
done
