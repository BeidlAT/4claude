#!/bin/sh
cd "$(dirname "$0")"
for p in $(ps -eo pid,args | awk '$2=="node" && $3=="drv.js" {print $1}'); do kill -9 $p; done
for i in 1 2 3 4 5 6 7 8 9 10; do curl -s -m 1 localhost:8791 >/dev/null 2>&1 || break; sleep 0.5; done
nohup node drv.js > drv.log 2>&1 &
sleep 1.5; cat drv.log
