#!/bin/sh
# Sets up the Myzel test infrastructure in a fresh session's scratchpad.
#   sh dev/setup-tests.sh <scratchpad-dir>
# Copies dev/tests/* there, rewrites the old session's absolute paths, regenerates the parity baselines from git,
# creates a 180 s test WAV for v2/live2.js and starts the static server on :8790 (serves <scratchpad>/v2).
set -e
T=${1:?usage: sh dev/setup-tests.sh <scratchpad-dir>}
R=$(cd "$(dirname "$0")/.." && pwd)
OLD=/tmp/claude-0/-home-user-4claude/c8d0b4bd-0d4c-545f-b176-6770c99f7009/scratchpad
mkdir -p "$T"
cp -r "$R/dev/tests/." "$T/"
grep -rl "$OLD" "$T" 2>/dev/null | while read -r f; do sed -i "s#$OLD#$T#g" "$f"; done
# parity baselines: the app before MIDI (midi-tests), before Gestik (motion-tests), before the new sound sources (klang)
mkdir -p "$T/midi-tests/orig" "$T/motion-tests/orig" "$T/klang" "$T/midi-tests/out" "$T/motion-tests/out" "$T/klang/tests/out"
git -C "$R" show e5680a2:myzel/index.html > "$T/midi-tests/orig/index.html"
git -C "$R" show 2bbfee9:myzel/index.html > "$T/motion-tests/orig/index.html"
git -C "$R" show 03050e0:myzel/index.html > "$T/klang/index.base.html"
for d in midi-tests/orig motion-tests/orig; do cp "$R/myzel/tap-worklet.js" "$T/$d/"; done
# v2/live2.js loads a 180 s file
command -v ffmpeg >/dev/null && [ ! -f "$T/v2/src2/lang180.wav" ] && \
  ffmpeg -v error -f lavfi -i "sine=frequency=180:duration=180" -ac 2 "$T/v2/src2/lang180.wav" || true
cd "$T/v2" && (curl -s -o /dev/null http://127.0.0.1:8790/ || (nohup python3 -m http.server 8790 >/dev/null 2>&1 &))
echo "tests ready in $T"
