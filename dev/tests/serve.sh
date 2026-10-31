#!/bin/sh
# The test server on :8790 (serves this folder's v2/): started when it is not answering, otherwise left alone.
# (31.10.2026) A cloud session's container is restarted when the session sits idle – every process in it ends, the
# scratchpad stays. mk.sh and the browser helper (midi-tests/h.js) call this, so a restart never leaves the suites
# without their server.                                                     sh serve.sh
D=$(cd "$(dirname "$0")" && pwd)/v2
curl -s -o /dev/null --max-time 2 http://127.0.0.1:8790/ && exit 0
cd "$D" && setsid nohup python3 -m http.server 8790 >/dev/null 2>&1 < /dev/null &
for i in 1 2 3 4 5 6 7 8 9 10; do curl -s -o /dev/null --max-time 1 http://127.0.0.1:8790/ && exit 0; sleep 0.3; done
echo "serve.sh: server on :8790 did not come up" >&2; exit 1
