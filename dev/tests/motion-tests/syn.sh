#!/bin/sh
# syntax check: the largest <script> of the app through node --check
python3 - "$1" <<'PY'
import re,sys
s=open(sys.argv[1]).read()
sc=max(re.findall(r'<script>(.*?)</script>', s, re.S), key=len)
open('/tmp/claude-0/-home-user-4claude/c8d0b4bd-0d4c-545f-b176-6770c99f7009/scratchpad/motion-tests/out/app.js','w').write(sc)
PY
node --check /tmp/claude-0/-home-user-4claude/c8d0b4bd-0d4c-545f-b176-6770c99f7009/scratchpad/motion-tests/out/app.js && echo SYNTAX_OK
