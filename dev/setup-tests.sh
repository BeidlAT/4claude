#!/bin/sh
# Sets up the Myzel test infrastructure in a fresh session's scratchpad.
#   sh dev/setup-tests.sh <scratchpad-dir>
# Copies dev/tests/* there, rewrites the old session's absolute paths, regenerates the parity baselines from git,
# creates a 180 s test WAV (220 Hz) for v2/live2.js and starts the static server on :8790 (serves <scratchpad>/v2).
set -e
T=${1:?usage: sh dev/setup-tests.sh <scratchpad-dir>}
R=$(cd "$(dirname "$0")/.." && pwd)
OLD=/tmp/claude-0/-home-user-4claude/c8d0b4bd-0d4c-545f-b176-6770c99f7009/scratchpad
mkdir -p "$T"
cp -r "$R/dev/tests/." "$T/"
grep -rl "$OLD" "$T" 2>/dev/null | while read -r f; do sed -i "s#$OLD#$T#g" "$f"; done
# parity baselines: the app before MIDI (midi-tests), before Gestik (motion-tests), before the new sound sources (klang)
mkdir -p "$T/midi-tests/orig" "$T/motion-tests/orig" "$T/klang" "$T/midi-tests/out" "$T/motion-tests/out" "$T/klang/tests/out"
git -C "$R" show e5680a2:myzel/index.html > "$T/midi-tests/orig/index.html" || echo "setup-tests: Grundlage e5680a2 fehlt (flacher Klon) – die Paritätstests dazu laufen nicht" >&2
git -C "$R" show 2bbfee9:myzel/index.html > "$T/motion-tests/orig/index.html" || echo "setup-tests: Grundlage 2bbfee9 fehlt (flacher Klon) – die Paritätstests dazu laufen nicht" >&2
git -C "$R" show 03050e0:myzel/index.html > "$T/klang/index.base.html" || echo "setup-tests: Grundlage 03050e0 fehlt (flacher Klon) – die Paritätstests dazu laufen nicht" >&2
for d in midi-tests/orig motion-tests/orig; do cp "$R/myzel/tap-worklet.js" "$T/$d/"; done
# v2/live2.js loads a 180 s file
command -v ffmpeg >/dev/null && [ ! -f "$T/v2/src2/lang180.wav" ] && \
  ffmpeg -v error -f lavfi -i "sine=frequency=220:duration=180" -ac 2 "$T/v2/src2/lang180.wav" || true
sh "$T/serve.sh"   # (the server on :8790 – also restarted by v2/mk.sh and midi-tests/h.js when a container restart ended it)
echo "tests ready in $T"
