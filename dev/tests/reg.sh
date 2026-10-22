#!/bin/sh
# all regression suites after a stage (HANDOFF "Test infrastructure"), sequential; summary in reg.log
S=$(cd "$(dirname "$0")" && pwd)
cd "$S/v2" || exit 1
sh mk.sh /home/user/4claude/myzel new >/dev/null; sh mk.sh /home/user/4claude/myzel mnew >/dev/null; sh mk.sh /home/user/4claude/myzel mix >/dev/null
mkdir -p "$S/reglogs"
for t in func fixes mobile bars bars2 integrity sources live2 presets smoke; do
  echo "== v2/$t"; node $t.js > "$S/reglogs/v2-$t.log" 2>&1; echo "   exit $?"; grep -c '^PASS' "$S/reglogs/v2-$t.log" | sed 's/^/   PASS: /'; grep -E '^FAIL|Error|fatal' "$S/reglogs/v2-$t.log" | head -8
done
echo "== v2/mixfunc"; SEED_BLOBS=1 NO_RAF=1 node mixfunc.js mnew-inst > "$S/reglogs/v2-mixfunc.log" 2>&1; echo "   exit $?"; tail -3 "$S/reglogs/v2-mixfunc.log"; grep -E '^FAIL|fatal' "$S/reglogs/v2-mixfunc.log" | head -8
cd "$S/mixui/f" && { echo "== mixui/f/func"; node func.js > "$S/reglogs/mixui-func.log" 2>&1; echo "   exit $?"; tail -3 "$S/reglogs/mixui-func.log"; grep -E '^FAIL|fatal' "$S/reglogs/mixui-func.log" | head -8; }
echo "== midi-tests"; sh "$S/midi-tests/run-all.sh" > "$S/reglogs/midi.log" 2>&1; echo "   exit $?"; grep -E '^==|PASS:|^FAIL|Error' "$S/reglogs/midi.log"
echo "== motion-tests"; sh "$S/motion-tests/run-all.sh" > "$S/reglogs/motion.log" 2>&1; echo "   exit $?"; grep -E '^FAIL|Error' "$S/reglogs/motion.log"
# the performance guard (dev/tests/perf/run.sh): Ruhe's parity and live tests, then CPU per thread against the
# reference build in perf/baseline.json, measured alternately – last, alone, never beside another suite (PERF=0 skips)
[ "${PERF:-1}" = 0 ] || { echo "== perf"; sh "$S/perf/run.sh" > "$S/reglogs/perf.log" 2>&1; echo "   exit $?"; grep -E '^(PASS|FAIL)' "$S/reglogs/perf.log" | grep -c '^PASS' | sed 's/^/   PASS: /'; grep -E '^FAIL|fatal' "$S/reglogs/perf.log" | head -12; }
