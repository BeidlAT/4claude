#!/bin/sh
# Sehne cost per state: the flat and the jawari bridge, open (y 0.6) and under the E-Bow (y 0.95); 24 voices vs 24 Nebel,
# interleaved rounds, scaled by the native references (cost.js). Output: out/cost-shn.log (one JSON line per case)
D=$(cd "$(dirname "$0")" && pwd)
export KD_URL=http://127.0.0.1:8790/kd-shn-inst/index.html
R=${ROUNDS:-4}
: > "$D/out/cost-shn.log"
for steg in flach jawari; do for y in 0.6 0.95; do
  echo "== $steg y $y" >> "$D/out/cost-shn.log"
  ENGS=shn1,shn3,hau1,hau3,obt1,obt3,tie1,stm1,swm1,neb3 PARAMS="{\"shn.steg\":\"$steg\"}" Y=$y node "$D/cost.js" "$R" 2>&1 | tail -1 >> "$D/out/cost-shn.log"
done; done
