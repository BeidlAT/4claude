#!/bin/sh
# Final QA, second pass on the final build: rebuild new / mnew / mix / mq from the app, then every v2 + mixui suite
# (run-qa-v2.sh) and every MIDI suite incl. the QA probes (run-qa.sh, without the soak, which runs on its own:
# node soak-midi.js 180 d1280). Summaries: qa-out/final-v2.txt, qa-out/final-midi.txt.
D=$(cd "$(dirname "$0")" && pwd)
for s in new mnew mix; do sh "$D/../v2/mk.sh" /home/user/4claude/myzel $s >/dev/null; done
sh "$D/run-qa-v2.sh" > "$D/qa-out/final-v2.txt" 2>&1
L=$(sed -n '/^ALL="/,/"$/p' "$D/run-qa.sh" | tr -d '"' | sed 's/^ALL=//' | tr '\n' ' ' | sed 's/soak-midi//')
sh "$D/run-qa.sh" $L > "$D/qa-out/final-midi.txt" 2>&1
echo "final pass done"
