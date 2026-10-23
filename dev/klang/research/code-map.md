# Myzel – Code-Map für neue Klangquellen

> **Seit 23.10.2026 ist die Quelle der Modulbaum `myzel/src/`** (`myzel/index.html` ist sein Build und wird nie von Hand
> bearbeitet). Die Zeilennummern unten gehören zur alten Einzeldatei: Namen mit `grep -rn name myzel/src` suchen.

Quelle: `/home/user/4claude/myzel/index.html` (19 022 Zeilen, git `03050e0`, Stand 2026-10-13). Alle Zeilennummern sind gegen diese Datei verifiziert (grep/sed); Aussagen mit **(assumed)** sind Schlussfolgerungen. Test-Slot: `sh scratchpad/v2/mk.sh /home/user/4claude/myzel km` → `http://127.0.0.1:8790/km-inst/index.html` (Server läuft, cwd `scratchpad/v2`; `window.__M` exportiert u. a. `ENGINES, PD, P, playNote, hit, Voice, dspJob, ksBuffer, KS_CACHE, texture, macroId, setParam, applyQuality, calibrate, getBudget`).

## 1. Parameter-Schema

| Was | Zeile | Fakt |
|---|---|---|
| `PD`, `def`, `NUM(id,label,min,max,d,unit,o)`, `SEL(id,label,opts,d,o)`, `BOOL` | 1658–1662 | `o.curve: 'lin'|'exp'|'sq'`, `o.step`, `o.fmt(v)`, `o.chips:1` (Chips statt `<select>`), `o.small:1`, `o.dev/rec/live` (nicht im Patch) |
| `ENG_OPTS` | 1665–1666 | `[['neb','Nebel'],…]`, Kommentar 1664: „held sounds first, then struck ones“. Einzige Quelle für die Reihenfolge überall |
| `ENG_NAME` | 1667 | `Object.fromEntries(ENG_OPTS)` |
| `ENG_INFO` | 1668–1683 | ein Satz je Engine → Untertitel der Sektion (17015) |
| `v.eng` | 1688 | `SEL(…, ENG_OPTS, 'neb', {chips:1})` |
| `v.layer` | 1689 | `SEL(…, [['off','Aus'], ...ENG_OPTS], 'off', {chips:1})`; `v.layerLvl/Int/Deg` 1690–1691, 1704 |
| Engine-Parameter | 1702–1797 | Blöcke `// Nebel` … `// Tropfen`; Präfix = Engine-Key; kor.src SEL 1713 (13 Quellen) |
| `LANE_DEF` + `l{i}.eng` | 1860–1868 | Defaults mem/hau/glo/sch; `SEL(p+'eng','Klang',ENG_OPTS,d.eng,{chips:1,small:1})` |
| `GROUP` | 1950–1955 | Präfix → Gruppenname (MIDI-Ziele, Mixer-Namen); `groupOf(id)` 1961 |
| `PATCH_IDS`, `P` | 1962–1965 | alles ohne rec/dev/live; `P[id]=PD[id].d` |
| `sanitize(d,v)` | 1967–1977 | SEL: unbekannter Wert → `d.d` (so wird `v.eng` beim Laden validiert) |
| `fmt(d,v)` | 1990 | Einheitenformat (Hz/s/ms/%/dB/ct) |

## 2. Audio-Kern und Helfer

| Symbol | Zeile | Fakt |
|---|---|---|
| `A` | 2076 | `ctx, voices:Set, grainVoices:Set, tex, texWait, grains, frozen …`; `SR` 2077 |
| `VCOST1` / `VCOST3` | 2081–2082 | Kosten je Engine (Einheit = 1 Nebel-Stimme Stufe 1); Stufe 3 „measured: level-1 cost × (level 3 / level 1)“ |
| `QP` | 2083–2087 | Stufe 1: budget 14 (mobil)/22, maxv 32, grainMax 80/128, overlap 16/24, `rich:false`, `korDens:1`, `cost:VCOST1`; Stufe 2: 24/40; Stufe 3: 48, `rich:true`, `korDens:1.75`, `cost:VCOST3` |
| `Q, VBUDGET, MAXV` | 2088 | aktive Stufe; `Q.rich` ist der Stufe-3-Schalter in allen Engines |
| `KR(p)` | 2092 | AudioParam auf k-rate (2–4× billiger); BQ/PAN/OSC rufen es selbst |
| `G(v)`, `BQ(type,f,q)`, `PAN(v)`, `OSC(type,f)` | 2093–2109 | OSC: `A.waves[type]` → PeriodicWave, sonst `o.type`; detune k-rate |
| `setP(param,v,tc=0.03)` | 2110 | cancel + setTargetAtTime (für alles, was die App selbst setzt) |
| `holdParam`, `rampP`, `vFade` | 2115–2139 | rampP nur für Gestik-Params (Kommentar 2120–2125: nie auf einem Param, den setP treibt); vFade: Stimme in ~25 ms raus (Sporenregen/Rassel) |
| `glideTo(param,v,glide)` | 2140 | setTargetAtTime mit `tc = max(0.004, glide/3)` – Standard für `v.setF` |
| `noiseSrc()` | 2145 | Loop über `A.noise` (2 s weiß, 2807) |
| `makeShaperCurve(fn,n)` | 2147 | WaveShaper-Kurven (tie.curve 4442, klb.slack 3885) |
| `rand`, `pick`, `gauss`, `clamp` | 1594–1599, 1593 | |
| `initAudio()` | 2795 | `A.noise` 2807, `A.waves = {}` 2809 (glass/organ 2810–2817), `A.driftBuf` 2818, Pitch-Bus `A.pitchMod` 2831 (Vibrato+Drift in Cent), `A.notePitch` 2836 (+ MIDI-Bend), `A.uniLfo/A.uni` 2840–2841 (4 langsame Sinus-LFOs ±3,5 ct für Stufe-3-Unisono) |
| `A.voiceBus` | 2854 | Eingang der Insert-Kette; `stripIn(k)` 3126 liefert Mixer-Kanal oder voiceBus |

### Offline-DSP (Worker) und Caches
| Symbol | Zeile | Fakt |
|---|---|---|
| `genIR`, `genTexture(kind,sr,F)`, `genKS` | 2191, 2219–2767, 4614–4647 | reine Funktionen, werden **per `toString()` in einen Blob-Worker kopiert** (2773–2775) → dürfen keine Closure-Variablen nutzen |
| Texturen in `genTexture` | 2223 glas, 2233 chor, 2259 metall, 2272 fluestern, 2359 funk, 2474 orgel, 2553 voegel, 2615 wasser, 2675 zikaden, else-Zweig = staub (2745) | 3,2 s Stereo bei `TEX_F=220` Hz (4718) |
| `DSPW`, `DSP_FN`, `dspJob(type,args)` | 2768–2788 | Promise; Fallback synchron im Main-Thread bei Worker-Fehler |
| `toBuffer(chans)` | 2789 | Float32-Kanäle → AudioBuffer |
| `texture(kind)` | 4727–4740 | Cache `A.tex[kind] = {buf, rev, ref}`; rendert sonst via dspJob; laufende Körner-Finger wechseln nach (4735) |
| `preloadTextures()` | 4741 | nur gewählte Quelle + `glas` |
| `LIVE_SRC`, `korSource()` | 4743–4763 | datei/mikro/echo; sonst `texture(want) || A.tex.glas || …` |
| `USERTEX`, `loadUserFile`, `useUserMaterial`, `guessPitch` | 4798–4880 | eigene Datei (≤30 s, IndexedDB) |
| `MIC` | 4886–4950 | 8-s-Ring, nutzt den Tap-Worklet-Prozessor `myzel-tap` (4903) |
| `HANN`, `spawnGrain(v,when)` | 4953–4995 | Korn: BufferSource + Gain-Kurve, `A.grains` Zähler, `Q.grainMax/overlap`; Bend manuell über `v.bend.cents`/`A.bendCents` (4960); MOD `korS` (4967) |
| `grainTick(horizon)` | 6021–6031 | Scheduler aller `A.grainVoices`; Dichte × `Q.korDens` × MOD `korD` |
| `KS_CACHE`, `ksArgs`, `ksKey`, `ksStore` | 4648–4665 | LRU: max 80 Buffer / 1e7 Frames |
| `ksBuffer(f,bright,decay,damp,pos)` | 4667–4683 | Treffer, sonst nächste Saite ≤2 Oktaven per Playback-Rate + Worker-Render; nur die allererste synchron |
| `saiInUse()`, `warmKS()` | 4685–4712 | rendert alle Skalentöne (Spielfläche, Ebene 2, Spuren mit Oktave, MIDI 48–84, Sporenregen) 300 ms nach Änderung; `warmKS.job` bricht alte Läufe ab |

### AudioWorklet (Tap) – Lade-Muster
- `TAP_SRC` 5156 (Prozessor `myzel-tap` als String), Datei `tap-worklet.js` daneben.
- `ensureCapture()`/`setupCapture()` 5168–5205: probiert `addModule(new URL('tap-worklet.js'))`, dann Blob-URL aus `TAP_SRC` (5181–5184); bei Erfolg `AudioWorkletNode` (5187), sonst **Fallback `createScriptProcessor(16384)`** (5196). `CAP.mode = 'worklet' | 'script'`.
- Kommentar 5164–5166: sobald ein Worklet existiert, rendern Chrome-im-Frame und Safari den ganzen Graph auf dem Worklet-Thread (niedrigere Priorität) → der Tap wird **erst bei Bedarf** gebaut. Eine Worklet-Engine zöge das beim ersten Ton nach sich **(assumed: gleicher Effekt)**.

## 3. `class Voice` und Hüllkurven (3454–3528)

| Member | Zeile | Fakt |
|---|---|---|
| `constructor(eng)` | 3455 | `nodes[], srcs[], mods[]`, `out` = Gain 0, `alive, released, t0, endAt=∞, relAt` |
| `n(node)` / `s(node)` | 3460–3461 | registrieren (s: wird gestoppt) |
| `mod(param)` | 3464 | k-rate + Verbindung an `A.notePitch` (MIDI/`v.bend`) oder `A.pitchMod` → **Vibrato, Drift, Bebung, Pitch-Wheel**; jede tonhöhentragende detune muss hier hin |
| `lnk(src,param)` | 3465 | z. B. `A.uni[i]` |
| `finish(at)` | 3466–3473 | stoppt `srcs` (früher, wenn `s._end` gesetzt), Cleanup-Timer +150 ms |
| `cleanup()` / `kill()` | 3474–3490 | kill: 35 ms Rampe, `released=true` |
| `adsrStart(v,t,peak,att)` | 3492 | setzt `v.peak/att/tA` |
| `sustainRelease(v,rel)` → `(k)=>…` | 3498–3515 | `v.release(k)`; k = MIDI-Release-Faktor; kurzer Tipp endet ≥ halber Peak; `finish(t1 + rel*1.3 + 0.08)` |
| `burstEnv(v,t,peak,att,gate,rel)` | 3517–3524 | Puls-Stoß: att ≤ gate/2, Decay ab `max(a,gate)`, `released=true` sofort |

Engine-Vertrag (aus allen 14 Engines abgeleitet, verifiziert): `start(v, t, f, y, vel, o)` mit `o = {burst, gate, decayMul, pan, bus, bend}`; `pan/bus/bend` konsumiert `playNote` (5018–5020). Gehalten: `v.setF(nf, glide)`, `v.setY(ny)` setzen, `v.release = sustainRelease(…)`, bei `o.burst` `burstEnv`. Geschlagen: eigene Hüllkurve auf `v.out.gain`, `v.released = true`, `v.finish(t + decay + …)`. Quellen mit kürzerem Leben: `src._end = t + …`.

## 4. ENGINES (3530–4640) – die 14 Engines

Peak-Konstanten (`vel × …`) sind die Loudness-Referenz: neb 0.48 (3558), kor 0.55, hau 1.0, glo 0.42, mem 0.62, sai 1.5, sch 0.55, gng 0.125, klb 0.32/0.29, obt 0.105 (burst 0.135), stm 0.5, swm 0.47 (burst 0.68), tie 0.16 (burst ×1.6), trp 0.67/0.62.

| Key | Zeilen | sustain | y (Fingerhöhe) | Params (Anzahl) | Cost L1/L3 | Stufe 3 | Burst / Besonderes |
|---|---|---|---|---|---|---|---|
| neb Nebel | 3531–3568 | ja | `nebCut(y)` 3526: Tiefpass `neb.cut·2^(y·ymod)`; `setY` 3561 | wave spread sub breath cut res ymod att rel (9) | 1 / 1.9 | 7 statt 3 Oszillatoren + `A.uni` | `burstEnv(att, gate, min(rel,3))` 3562; `v.filt` wird von onParamChanged live nachgezogen (12159) |
| kor Körner | 3569–3584 | ja | `v.kor.y` = Position im Material (spawnGrain 4968) | src dens size scat pjit oct rev att rel (9) | 0.6 / 1.1 | 8 statt 4 Panner, `Q.korDens` 1.75 | `burstEnv(min(att,0.03), gate, min(rel,2))`; Stimme in `A.grainVoices`, Körner kommen aus `grainTick` |
| hau Hauch | 3585–3611 | ja | `hauFreq` 3527: Bandpass `f·2^(color+y·sweep)` | color q sweep att rel burst (6) | 0.3 / 0.75 | 3 Bänder verstimmt L/M/R | `burstEnv(…, 0.002, max(.005, gate·0.1), hau.burst·decayMul)` 3608 |
| glo Glocke | 3612–3648 | nein | decay ×(0.6+0.8y), FM-Index ×(0.3+1.4y) | ratio index decay bright beat click (6) | 0.7 / 1.4 | 2 Glocken ±3,5 ct L/R | Klick-Rauschen mit `_end`; eigene Hüllkurve 3642–3646 |
| mem Membran | 3649–3703 | nein | decay ×(0.5+y), Fell-Bandpass | drop dropT decay mode2 ratio2 noise tone (7) | 0.4 / 0.75 | +2 Moden L/R (3676), Mitte via `PAN(0)` | Pitch-Sprung per exponentialRamp |
| sai Saite | 3704–3731 | nein | Tiefpass `f·2^(1.5+7y)` 3709 | decay bright damp pos body (5) | 0.35 / 1.2 | Doppelchor ±3 ct L/R | Karplus-Strong aus `ksBuffer` (3707); `v.out.gain` fest, `finish(buf.duration/rate)` |
| sch Schale | 3732–3771 | nein | bright ×(0.5+y) | decay beat bright stretch mallet (5) | 0.9 / 2 | 6 statt 4 Teiltöne, Schwebungspaare L/R | Schlägel-Rauschen |
| gng Gong | 3772–3881 | nein | decay, bloom, bright, att, bend (3800–3806) | decay bloom bright glide beat shimmer (6) | 1.55 / 2.8 | 2 Platten gestreckt L/R, `A.uni` | Modengruppen als PeriodicWave `wave()` 3781 (Cache `A.waves[key]`), `banks()` 3791, `warm()` 3794 (verifiziert: **kein Aufrufer** in der Datei – toter Hook, Kommentar 3792 ist veraltet); Delay-Modulation für Schimmer |
| klb Kalimba | 3882–4003 | nein | decay, Obertonpegel, Daumen-Tiefpass, Schnarr-Bandpass | decay over ratio thumb body buzz (6) | 1.25 / 2.2 | Deckel-Mode, Paar L/R, Oktav-Zunge, 2 Kappen | festes Klopf-Rauschen `knock()` 3889 (`A.klbKnock`), `slack`-Shaper 3885, Wave `A.waves.tine` 3897 |
| obt Obertöne | 4004–4115 | ja | `harm(f,y)` 4035 wählt Oberton; `bodyC(y)` Körper-Tiefpass | top focus body wander att rel (6) | 0.75 / 1.85 | 2. Sänger 3:2 L/R | Wave `A.waves.obtGlottis` 4006, Random-Walk-Buffer `A.obtWalk` 4017 → WaveShaper auf detune/Q; `setF` 4094, `setY` 4099; burst peak 0.135, `burstEnv(min(att,.03), gate, min(rel,2))` |
| stm Stimme | 4116–4254 | ja | Vokal u-o-a-e-i via `formants(f,y,tract)` 4126 | choir vib breath shift att rel (6) | 1.05 / 2.4 | 6 Sänger in 2 Gruppen L/R | Wave `A.waves.stmGlottis` 4142; Glide-Plan für Formanten (4203–4247); `burstEnv(att, gate, min(rel,3))` |
| swm Schwarm | 4255–4393 | ja | Chaos/Dichte: FM-Index, Flattern, Triller, Tiefpass (4276–4296) | chaos spread unrest chirp att rel (6) | 1.2 / 2.7 | 2 Schwärme L/R, Loop verbunden | Buffer `A.swmChirps` 4259, `A.swmFly` 4269; FM-Rückkopplung über DelayNode (4350); burst peak 0.68 |
| tie Tiefe | 4394–4511 | ja | `drive(y,fb)` 4413: Growl-Drive | oct drop dropT drive click rel (6) | 0.75 / 1.5 | 2 Growls L/R, `A.uni[1]` pendelt Pegel | `base(f)` 4400 faltet in Bassoktave (nutzt `N.base`); `this.curve` tanh(6x); `burstEnv(peak·1.6, .003, gate·0.8, rel·decayMul)` 4507 |
| trp Tropfen | 4512–4612 | nein | Tropfengröße: Chirp-Tiefe, Steigzeit, Wave-Schattierung `wave(y)` 4527, Regenmenge, Tick-Helligkeit | chirp rise decay rain spread splash (6) | 0.7 / 1.5 | 2 Blasen L/R, 15 statt 10 Regentropfen | `inKey()` 4517 nutzt `N.notes`; Regen liest MOD `trp` (4584); max. Tropfen 10/15 |

Hilfsfunktionen vor dem Objekt: `nebCut` 3526, `hauFreq` 3527, `hauGain` 3528.

## 5. Stimmenvergabe, Budget, Kalibrierung

| Symbol | Zeile | Fakt |
|---|---|---|
| `steal(fadingOnly, soft)` | 4997–5011 | released-Stimmen zuerst (Anteil des Releases), sonst älteste gehaltene; soft = vFade |
| `voiceLoad()` | 5012 | Σ `v.cost` |
| `playNote(eng,t,f,y,vel,o)` | 5013–5026 | `cost = Q.cost[eng] || 1` (**fehlender Eintrag ⇒ 1.0**), stiehlt bis Budget passt, baut Panner → `o.bus || stripIn('fin')`, ruft `ENGINES[eng].start` im try/catch (Fehler → `v.cleanup()`, null) |
| `hit(eng,…)` | 5080–5085 | sustain-Engines → `playNote` mit `{burst:true, gate:0.22}` (überschreibbar), geschlagene direkt |
| `CAL`, `applyQuality()` | 5032–5048 | Budget aus `CAL.unit` (Anteil 0,4/0,5 einer Sekunde); `A.budgetScale` nach Underruns (18940–18953: ×0.8 je Ereignis, `A.lite`) |
| `calibrate()` | 5049–5079 | rendert 24 **Nebel**-Stimmen offline (ersetzt `A.ctx`, `A.pitchMod`, `Q=QP[1]`, Nebel-Defaults) → nur Nebel ist die Messgröße; andere Engines sind relative Konstanten in VCOST |
| Gerät-Text | 17747–17753 | `nNeb = floor(VBUDGET / Q.cost.neb)`; nennt Nebel, Hauch, Membran, Saite, Körner, Glocke |

## 6. Spielpfade (wo Engines starten)

| Pfad | Zeile | Fakt |
|---|---|---|
| `layers()` / `lyF(ly,f,idx)` | 6057–6069 | `[{eng:P['v.eng'], bus:stripIn('fin')}, {eng:P['v.layer'], bus:stripIn('eb2'), lvl, ratio, deg}]` |
| `onDown` | 6086–6116 | held: `playNote(ly.eng, now, f, y0, vel·lvl, {pan, bend, bus})` 6101; `triggerPerc` für geschlagene 6105; Roll 6106 |
| `moveTouch` | 6120–6136 | `v.setF(lyF(…), P['v.glide'])`, `v.setY(modY(tt))`; Spaltenwechsel + `v.strum` → `triggerPerc` |
| `onUp` | 6137–6146 | `v.release(e.relK)` |
| `triggerPerc(tt,t,isRoll)` | 6073–6084 | nur `!ENGINES[ly.eng].sustain` → `hit(...)` |
| `rollTick` | 6008–6020 | Wirbel |
| `seqTick(horizon)` | 5955–5996 | `hit(P[pre+'eng'], t+jit, nt.f, bright, vel, {pan, gate: stepDur·0.9, bus: stripIn('l'+i)})` 5980; `laneNote(i)` 5943 |
| `laneHit(i,v)` (MIDI-Pad) | 7085–7096 | `hit(…, {gate: div·54/bpm})` |
| `tick()` | 6032–6041 | 25-ms-Worker-Clock: seqTick, rollTick, grainTick, previewTick, faeTick, rgTick |
| `panic()` | 8305 | `v.kill()` für alle |
| MIDI | 6238 ff. | Noten gehen über `onDown`/`onUp` mit `e.vel/e.bend/e.mb/e.mpe`; `midiY` 7861, `midiRecolor` 7873 → `v.setY(modY(tt))` 7883 |

## 7. Jede Stelle, an der Engine-Keys stehen (Vollständigkeit per grep `'(neb|kor|…)'`)

| Zeile | Ort | Inhalt |
|---|---|---|
| 1665–1666 | `ENG_OPTS` | Liste + Reihenfolge (14) |
| 1668–1683 | `ENG_INFO` | Untertitel |
| 1702–1797 | Params | `neb.*`… `trp.*` |
| 1860–1863 | `LANE_DEF` | Spur-Defaults `mem, hau, glo, sch` |
| 1950–1951 | `GROUP` | 14 Namen |
| 2081–2082 | `VCOST1/VCOST3` | Kosten |
| 3526–3528 | Helfer | nebCut/hauFreq/hauGain |
| 3530–4640 | `ENGINES` | |
| 4686–4705 | `saiInUse`, `warmKS` | `'sai'` hart, auch `GK.p.rgS === 'sai'` |
| 5067 | `calibrate` | `ENGINES.neb.start` |
| 7050–7053 | `MACRO`, `macroId` | 2 Makro-Params je Engine; Fallback `MACRO.neb` |
| 7013 | `tName` | „Klang-Makro A (Nebel: …)“ |
| 8772 | `RG_S` | Sporenregen-Anschlag: `trp klb glo sch mem sai` |
| 8785, 8794 | `GK.p` Defaults | `rasS:'trp'`, `rgS:'trp'` |
| 8816, 8823 | `gkCheck` | `rasS ∈ {trp,mem,sch}`, `rgS ∈ RG_S` sonst `'trp'` |
| 9458–9460 | `MODT` | Formen-Ziele `korD, korS, trp` (`js:1`) |
| 9481–9482 | `FAE_PAR` | `kor.dens→korD`, `kor.scat→korS`, `trp.rain→trp` |
| 9484 | `modKorD` | ×0,35…×2,8 |
| 9887–9888 | `MOD_EQ` | Gestik-Zuweisung Param → Formen-Ziel |
| 10179 | `LAD_AMT` | Ladung: `korD .8, korS .7, trp .8, pulsD .7, pulsH .5, wow .6, expr .35` |
| 10221 | `ladFull` | `['kor','trp']` als Klang/Ebene oder Puls läuft |
| 10233–10260 | `ladRassel` | `eng = GK.p.rasS`, `cost = Q.cost[eng] || 1`; Schlag 10260: `hit(eng, t, f, y, vel, {pan: zufällig ±0.4, bus: stripIn('fin')})` |
| 10527 | Gestik-Karte | Rassel-Chips `trp/mem/sch` |
| 10554–10555 | `ladCardSync` | Text „Körner dichter“, „Tropfen-Regen“ |
| 10604 | `rgName` | |
| 10628 | `rgStart` | `if (GK.p.rgS === 'sai') warmKS()` |
| 10888–10902 | `rgStrike` | `hit(GK.p.rgS, t, f, y, vel, {pan, bus: stripIn('rgn')})`, max `RG_VMAX` Stimmen, nie gehaltene stehlen |
| 10971–10985 | `rgQuelle` | Mixer-Fruchtkörper „Regen“: Chips `RG_S` |
| 11481–11491 | `RZ` | Rezepte: `rgS: glo/sai/trp/klb`, `rasS: trp/mem` |
| 12128–12130 | `onParamChanged` | `refreshEngineUI()`; `warmKS()` bei v.eng/v.layer/l*.eng |
| 12159–12161 | `onParamChanged` | `case 'neb'`: Tiefpass live an laufende Nebel-Stimmen |
| 12812–12815 | `mxSrcText` | Kanalquelle = `ENG_NAME[…]` |
| 12824 | `MX_SRC_IDS` | `v.eng, v.layer, l*.eng …` (Mixer liest neu) |
| 16186–16196 | `mxdQuelle` | Fruchtkörper: `ctl('v.eng')`, `ctl('v.layer')`, `ctl(p+'eng')` mit Präfix `mxd-` → **dritte Kopie der Chips** |
| 17008–17048 | `buildKlang`, `refreshEngineUI` | |
| 17099 | `updLaneTabs` | Spur-Tab zeigt `ENG_NAME` |
| 17278–17430 | `PRESETS` | 16 Presets |
| 17489–17491 | Spielhilfe | „Halten: Nebel, Körner und Hauch …“, „Tippen und Wischen: Glocke, Membran, Saite und Schale …“ |
| 17531 | `MUT_SKIP` | `v.eng, v.layer` nicht mutieren |
| 17571–17572 | `dice()` | `pick(ENG_OPTS)` für Klang und Ebene |
| 17749–17752 | Gerät-Qualitätstext | Engine-Namen |
| 18290 | Gestik-Karte | `rgS`-Chips (+ `warmKS` bei sai) |
| 18538 | `kcBindsUI` | Signatur enthält `P['v.eng']` (Makro-Labels) |
| 1565 | Startbildschirm | „Wischen schlägt Glocken, Trommeln und Saiten an“ |
| README 10–16, 56 | `/home/user/4claude/README.md` | „Klangquellen (14): …“, Stufe-3-Beschreibung |

Mixer-Farben: **pro Kanal, nicht pro Engine** (12261–12266: fin `#f0e6d8`, eb2 `#c9dc82`, rgn `RG_COL`, Spuren `COL.lanes[i]`, bor `#5a7cff`, dly `#6cc9ef`, rev `#d6cbff`).

## 8. Klang-Panel heute

- `PANELS` 12221–12229 (klang, fx, puls, rec, presets, dev) + Mixer eingeschoben 12248. Tabs `#tab-<key>` (18767), `openPanel(key)` 18792; Kopfzeilen-Chip `#engChip/#engName` (HTML 1528, CSS 57–64, Klick 18782 → `openPanel('klang')`).
- `buildKlang()` 17009–17033: Sektion „Klangquelle“ (`ctl('v.eng')` + `v.oct`, `v.deg` + Hinweis) → je Engine eine Sektion `engSecs[k]` (alle `PD`-Ids mit Präfix `k+'.'`, 17014), versteckt; Körner-Extras 17017–17025; Hinweistext je nach `sustain` 17026–17027 → „Zweite Ebene“ (`ctl('v.layer')` …) → „Spielweise“ → „Stimmung“.
- `refreshEngineUI()` 17035–17048: blendet nur die Sektionen von `v.eng`/`v.layer` ein und hängt sie direkt unter die Klangquelle; setzt `#engName` („Nebel + Schale“).
- `ctl(id)` 12017–12105: `d.chips` → `<div class="chips[ small]" role="radiogroup" id="p-v-eng">` mit `<button class="chip" data-val>` (12067–12083); Ids `domId` 12005 (`p-` + id mit `-`; Präfix `mxd-` im Mixer). Pfeiltasten wechseln (12076).
- CSS: `.chips` flex-wrap gap 6px (156); `.chip` min-height 34px, pill (157–161); `.chips.small .chip` 32px (162); coarse pointer in Gestik/MIDI-Karten 44px (380, 511). Sektion `.sec` 124, `.grid` 148-px-Spalten 131. Sheet 54 % Höhe, max 560px (104–109); Puls-`.lanehead` ist **sticky** (208–211).

### Messung (Playwright, `km-inst`, Screenshots in `scratchpad/klang/shots/`)
| | 390×844 | 360×740 |
|---|---|---|
| Sheet / sichtbarer Body | 366 px / 308 px | 310 px / 252 px |
| Klangquelle-Chips (14, `#p-v-eng`) | 4 Reihen, **160 px** (y 488–648) | 4 Reihen, 160 px (63 % des Bodys) |
| Sektion „Klangquelle“ (Chips + Oktave/Tonstufe + Hinweis) | **355 px** = 115 % des Bodys | 355 px = 141 % |
| Zweite Ebene (15 Chips, `#p-v-layer`) | 4 Reihen, 160 px | 4 Reihen, 160 px |
| Körner-Quellen (13 Chips, `#p-kor-src`) | 4 Reihen, 160 px; Körner-Sektion 722 px | gleich |
| Puls-Spur-Chips (14 small, `#p-l0-eng`) | 3 Reihen, 114 px, liegen z. T. **unter dem sticky Spurenkopf** (Screenshot `puls-lane-p390.png`) | 4 Reihen, 152 px |
| Klang-Panel Scrollhöhe (Nebel aktiv) | 2101 px | 2101 px |

Dateien: `klang-p390.png`, `klang-p360.png`, `klang-layer-p390/360.png`, `klang-kor-p390/360.png`, `puls-lane-p390/360.png`, Script `shot.js`.

Hochrechnung **(assumed, 40 px je Reihe)**: 24 Engines ⇒ 6–7 Reihen ≈ 240–280 px pro Chipgruppe, und diese Gruppe existiert **7-mal** (Spielfläche, Ebene 2, Spur 1–4, Mixer-Fruchtkörper je Kanal) plus Gestik-Listen – ohne neue Verwaltung füllt allein die Auswahl den sichtbaren Sheet-Bereich.

## 9. Presets, Laden, Speichern

| Symbol | Zeile | Fakt |
|---|---|---|
| `PRESETS` | 17278–17430 | 16 Einträge `{key,name,tags,desc,v,[fmt:2, fae, gk]}`; `v.eng`: tiefsee neb(+sch), tempel glo, pilzregen mem, kristall sai(+glo), sporen kor, ritual sch, maschine mem(+glo), sonnenwind hau(+neb), obertonhoehle obt, geisterchor stm(+sch), regenwald trp, kalimbatraum klb, kurzwelle kor(+tie), zikadennacht kor(+hau), gongbad gng(+obt), sporenfaehrte klb(+glo, fmt 2) |
| `loadPreset(p)` | 17431–17441 | `remember()`; `fmt>=2` sichert Fährte/Gestik in HIST; `loadValues(p.v,false)`; `rzPreset(p)`; `presetExtraLoad(p)` |
| `loadValues(vals, keepUnset)` | 12189–12199 | für **alle** `PATCH_IDS`: `sanitize` oder Default → unbekannter `v.eng`-Wert fällt still auf `'neb'`/`'off'`; fehlende neue Params bekommen Defaults; danach `refreshEngineUI`, `applyAll`, `warmKS`, Textur laden |
| `saveState/restoreState` | 12201–12215 | `localStorage myzel.patch.v1` (values+preset), sanitize beim Lesen |
| `exportPreset/importPreset` | 17505–17529 | Datei `{app:'Myzel', version:2, values, faehrte, gestik}`; Import prüft nur „irgendein Key in PD“ |
| `MUT_SKIP`, `safeify`, `mutate`, `dice` | 17531–17590 | `safeify` begrenzt nur `neb.cut, hau.q, kor.size, bor.cut …`; `dice` würfelt **jede** Engine mit zufälligen Params (0,1–0,9 normiert) |
| `RZ`, `rzSync`, `rzPreset` | 11481–11523 | Gestik-Rezepte je Preset-Key |

## 10. Hilfetexte
- Startbildschirm 1559–1574 (Zeile 1565 nennt Glocken/Trommeln/Saiten).
- Spielhilfe (Presets-Panel) 17487–17500: Items „Halten“, „Tippen und Wischen“ nennen Engines.
- Klang-Sektionen: `ENG_INFO`, Hinweise 17026–17027, Körner 17024.
- Gerät 17749–17753.
- Gestik-Karte: 10554–10555 (Ladung), 10559 (Rassel: „Tropfen, Membran oder Schale“), `rgQuelle` 10981.
- README 10–16 („Klangquellen (14)“), 56 (Stufe 3), 82 (Ladung: Körner, Regen).

## 11. Integrations-Checkliste: eine Engine `xyz` hinzufügen

1. **`ENG_OPTS`** (1665): `['xyz','Name']` an der richtigen Stelle (gehalten vor geschlagen). Damit automatisch: `ENG_NAME`, Chips in `v.eng`, `v.layer`, `l0–3.eng`, Mixer-Fruchtkörper, `dice`, `updLaneTabs`, `mxSrcText`.
2. **`ENG_INFO.xyz`** (1668) – sonst Sektion ohne Untertitel.
3. **Params** `NUM/SEL('xyz.…')` nach 1797, ≤6; **`GROUP.xyz`** (1950) – sonst MIDI-Zielgruppe leer (`groupOf` → ''). Jeder Param wird automatisch MIDI-Ziel (`mtParam` 6956) und in Fruchtkörper/Fährte nicht automatisch (nur `FAE_PAR`).
4. **`VCOST1.xyz` / `VCOST3.xyz`** (2081–2082) – messen (Bench `scratchpad/v2/cost.js`, `audiocost-scripts/`); fehlt ⇒ 1.0 (5015, 10236, 10889).
5. **`ENGINES.xyz`** (vor 4640): `sustain`, `start(v,t,f,y,vel,o)`; `v.s()/v.n()`, `v.mod()` auf jede Tonhöhen-detune (Bebung/Vibrato/Wheel), `Q.rich`-Zweig, `o.burst/o.gate/o.decayMul`, `setF/setY` (nur setP/glideTo, Höhe kommt bis 30×/s, Kommentar 9780), `_end`, Partials < 0,45·SR, Peak auf Referenz einpegeln (§4). Lazy Buffers/Waves nur aus `A.ctx` nach `initAudio` (`A.waves` wird dort geleert, 2809), Muster `if (!A.xyzBuf) …`. Offline-Rendering: Funktion zu `DSP_FN` (2769) **und** zur Worker-Quellenliste (2773) – selbstständig, ohne Closures.
6. **`MACRO.xyz`** (7050): zwei Param-Ids – sonst Fallback auf Nebel-Makros (7053) und falscher Name in `tName` (7013); Test `qa-main.js:66` prüft das.
7. **Gestik (optional, nur wenn sinnvoll)**: geschlagene Engine → `RG_S` (8772; Chips 10973, 18290); Rassel → Liste 10527 **und** Validierung 8816; „verdichtbarer“ Param → `MODT` (9446) + `MOD_EQ` (9887) + `LAD_AMT` (10179) + `ladFull` (10221) + Text 10554; Vorberechnung wie Saite → `saiInUse`/`warmKS` (4685), `rgStart` 10628, `onParamChanged` 12130.
8. **Presets**: optional neues `PRESETS`-Objekt (+ `RZ`-Rezept); `safeify` (17533) ergänzen, wenn Params gefährliche Bereiche haben (dice spielt jede Engine zufällig).
9. **Texte**: Spielhilfe 17489–17491, Gerät 17749–17752, Start 1565, README 10 („14“) und 56; `ENG_INFO`.
10. **Tests/Tooling**: `mk.sh` exportiert `ENGINES` (automatisch); Engine-Listen in `scratchpad/qa-main.js:66`, `midi-tests/t-map-nks.js`, `motion-tests/gm-script.js` (Kopien der Datei) prüfen; `v2/cost.js` für Kostenmessung.
11. **UI-Verwaltung** (Auftrag): die Chip-Gruppe wird 7-fach gerendert (§8) – neue Auswahl-UI muss `ctl('v.eng')`, `ctl('v.layer')`, `ctl(p+'eng')` und `mxdQuelle` abdecken, `SEL … {chips:1}` bleibt für MIDI-`selStep` und Tastatur (12076) relevant.

### Risiken
- **Kosten/Budget**: `Q.cost[eng] || 1`; Stufe 1 mobil = 14 Einheiten → Engine mit 1,5 lässt 9 Stimmen (Spuren, Ebene 2, Regen konkurrieren). `calibrate` misst nur Nebel; Worklet-Engines werden gar nicht kalibriert (**assumed**) und setzen den Graph in Chrome-Frame/Safari auf den Worklet-Thread (5164).
- **Presets**: unbekannte SEL-Werte fallen still auf Default (1975) – Umbenennen bricht gespeicherte Patches/Exporte; neue Params fehlen in alten User-Presets → Defaults (12192).
- **Mixer**: liest nur `ENG_NAME`; `MX_SRC_IDS` muss nicht wachsen; Fruchtkörper rendert die Chips erneut (16186).
- **MIDI-Makro**: Fallback Nebel; `kcBindsUI`-Signatur hängt an `v.eng` (18538) – Label-Umbau rendert Bindings neu.
- **Sporenregen/Rassel**: hart kodierte Listen + Validierung (8772, 8816, 8823, 10527); `rgStrike` ruft `hit()` – eine gehaltene Engine im Regen würde als 0,22-s-Stoß spielen.
- **Ladung**: `ladFull` nennt nur kor/trp; eine Engine ohne Formen-Ziel reagiert nur über Höhe/Echo (ladDry 10222).
- **Voice-Stealing**: geschlagene Stimmen müssen `v.released = true` sofort setzen (sonst gelten sie als gehalten und werden bei `fadingOnly` übersprungen, 5005–5006); Quellen ohne `_end` laufen bis `finish`.
- **Automation**: `holdParam` nach `setTargetAtTime` lässt in Chromium Rampen bei 0 starten (Kommentar 2123–2125) – in `setF/setY` nur `setP`/`glideTo` nutzen.
- **UI-Platz**: s. §8 – ohne Bibliotheks-UI wird die Klangquellen-Auswahl auf 360×740 größer als der sichtbare Sheet-Body.
