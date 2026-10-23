# Myzel – code map for a new LOOPER

> **Since 23.10.2026 the app's source is the module tree `myzel/src/`** (`myzel/index.html` is its build, never edited by
> hand). The line numbers below are of the old one-file app: find a name with `grep -rn name myzel/src`.

Source: `myzel/index.html` (24 012 lines, git `bf4bf26`, 18.10.2026) and `myzel/tap-worklet.js`. Line numbers are from
this commit and will drift: **search by name**. "(A)" marks an inference rather than something read in the code. The
Fährte (motion/modulation loops) is covered by a separate report. It appears here only where a looper must share its
clock, its UX or its controls.

---

## 1. Playing surfaces and note flow

### 1.1 Pitch space
| Symbol | Line | What it is |
|---|---|---|
| `N = { notes, free, lo, hi, base }` | 2323 | The field's scale: `N.notes[i] = { f, name, root, semi }`, rebuilt by `buildNotes()` (2333) from `t.root/t.oct/t.range/t.scale/t.just/t.a4`. |
| `noteAt(x)` | 2368 | x 0..1 → `{ f, idx, name }`. Free scale: continuous semitones, otherwise column = `floor(x·n)`. |
| `noteX(idx)` | 2378 | Column centre in 0..1 (used for visuals, the lanes and Rhizom). |
| `degNote(d)` | 12634 | Scale degree → `{ f, name }` across octaves (Ebene 2 interval, MIDI mapping). |
| `midiNote(m)` | 12641 | MIDI key → `{ f, idx, name, x }`, using `midi.map` = Skala / Weiße Tasten / Chromatisch. |

The **y axis (Höhe)** is the timbre: 0 is dark and 1 is bright. Each engine reads it in `start(v,t,f,y,vel,o)` and
in `v.setY(y)`. `modY(tt)` (14137) adds the mod layer's "Höhe" (Gestik, Fährte) to a finger's own y.

### 1.2 Touch field, keyboard keys, X-Y pad, MIDI notes: all of them are "fingers"
| Symbol | Line | What it does |
|---|---|---|
| `touches: Map(id → tt)` | 10419 | Every held finger. Ids: pointer id, `'key-…'` (computer keys), `'midi-<src>-<ch>-<note>'`, `'midi-xy-<src>'`. |
| `layers()` | 10420 | `[{eng: v.eng, ratio, deg, lvl:1, bus: stripIn('fin')}, {eng: v.layer, …, bus: stripIn('eb2')}]`. This is Ebene 2: a second engine on every finger, on its own strip. |
| `lyF(ly,f,idx)` | 10427 | The pitch of a layer: scale degrees plus octave or interval. |
| `onDown(e)` | 10451 | **The note-on choke point for every finger.** It builds `tt = {id,x,y,f,col,name,layers,vel,bend,mb,mpe,seq,…}`, calls `playNote` for each **held** layer and `triggerPerc` for **struck** layers, then `gkNote`, `modTouch`, `noteEvent()` and `VIS.touchStart`. The time is always `A.ctx.currentTime` (no look-ahead). |
| `moveTouch(tt,pt)` | 10484 | Sliding: `v.setF(lyF(…), v.glide)` and `v.setY(modY(tt))` on held voices. A new column with `v.strum` strikes again (`triggerPerc`). Fingerhalt locks the column while Gestik acts. |
| `onUp(e)` | 10499 | `v.release(e.relK)` on held voices. Tragen (`gaCarry`) can keep a note sounding without a finger. |
| `triggerPerc(tt,t,isRoll)` | 10436 | Struck layers only, through `hit(...)`. It is also called by the Wirbel (`rollTick` 10372, `v.roll`) and by strum. |
| `keyNote(e,down)` | 10513 | The computer's home row plays as fingers (calls `onDown/onUp`). |
| `xyIn/xyDown/xyUp` | ≈11500 | The X-Y pad of a controller as one more finger. |

Held and struck engines differ by `ENGINES[k].sustain`. The library text uses `ENG_META[k].art` ('haelt' | 'schlaegt' |
'beides'). A held engine played through `hit()` becomes a burst: `{burst:true, gate:0.22}` by default (6266).

### 1.3 Voices
| Symbol | Line | What it does |
|---|---|---|
| `playNote(eng,t,f,y,vel,o)` | 6197 | **The single voice factory.** It prices the voice with `Q.cost[wkPlays(eng)]`, steals until `voiceLoad()+cost ≤ VBUDGET` and `size < MAXV`, and builds `Voice → PAN(o.pan) → (o.bus ‖ stripIn('fin'))`. Then it calls `ENGINES[as].start(v,t,f,y,vel,o)` and returns `v` (or `null`). `o = {burst, gate, decayMul, pan, bus, bend}`. |
| `hit(eng,t,f,y,vel,o)` | 6266 | A held engine becomes a burst; otherwise it is `playNote`. Every scheduled or struck sound goes through it. |
| `class Voice` | 3790 | `eng, as, cost, bend, out(Gain), nodes, srcs, mods, alive, released, t0, endAt, relAt`. Methods: `n/s/mod/lnk/finish/cleanup/kill`. Engines add `v.setF`, `v.setY` and `v.release`. Worklet voices add `v.wk`. |
| `sustainRelease(v,rel)` | 3835 | The release closure (k = release-velocity factor). |
| `burstEnv(v,t,peak,att,gate,rel)` | 3854 | The Puls-style stroke. It sets `released=true` at once. |
| `steal(fadingOnly,soft)` | 6181 | Takes released voices first (by the share of release elapsed), then the oldest held one. `soft` uses `vFade` (≈25 ms). |
| `voiceLoad()` | 6196 | Σ `v.cost`, plus `A.gsp.cost` while the Gespinst web rings. **This is the precedent for a fixed DSP cost that is not a voice.** |
| `VCOST1/VCOST3`, `HLM_COST`, `ZPF_COST`, `GLT_COST`, `SHN_EBOW_COST`, `RHZ_COST`, `GSP_COST` | 2396–2416, 9312, 9374 | Measured costs in Nebel units (level 1 / level 3). A missing entry counts as 1.0. |
| `QP`, `Q`, `VBUDGET`, `MAXV` | 2417–2422 | Level 1: budget 14 on mobile (22 on desktop), maxv 32. Level 2: 24/40. Level 3: calibrated 24–360 with `rich:true`. |

### 1.4 Puls (step sequencer)
| Symbol | Line | What it does |
|---|---|---|
| `LANE_DEF`, params `l0–l3.*` | 2168 | Per lane: `on, eng, steps, puls, rot, div` (Raster, `DIV_OPTS`), `deg, oct, walk, prob, vol, bright, pan`. The sequencer is Euclidean and generative. It has no step entry and no note list. |
| `SEQ = {on, ext, anchorT, anchorB, bpm, lanes[], stopB, tk}` | 10285 | One shared beat clock for all four lanes. |
| `beatAt(t)` / `timeAt(b)` | 10286/7 | Audio time ↔ beat, linear from the anchor. |
| `seqBpm()` | 10288 | `SEQ.ext.bpm` (MIDI clock) or `P['seq.bpm']` (30–200). |
| `seqRetempo()` | 10289 | Re-anchors at `now` so the beat never jumps. **While the Puls stands the clock runs on** (Sporenregen and Rassel count in it). It calls `barRecue()` and toasts if a bar recording keeps the old tempo. |
| `laneNote(i)` | 10306 | Degree + random walk → `{f, x}` (random). |
| `seqTick(horizon)` | 10318 | Every step up to the horizon. Swing is `+seq.swing·stepDur·0.5` on odd steps of each lane. Formen Puls-Dichte/-Helligkeit add ghost hits. Each step calls `hit(l.eng, t+jit, f, bright, vel, {pan, gate: stepDur·0.9, bus: stripIn('l'+i)})`, then `duckHit`, `noteEvent(t)`, `visPush` and `rgPuls`. `SEQ.stopB` ends the Puls at a bar (Schlafen). |
| `seqStart(b0,t0)` / `seqStop()` | 10356/10369 | Start **re-anchors** (`anchorT = now+0.06`, `anchorB = b0`): the beat jumps here. Start also sends MIDI Start (`clkOutStart`). |
| `laneHit(i,v)` | 11449 | A pad strikes a lane now: gate `div·54/bpm`, plus `noteEvent`. |
| `rgAt(n,d)` | 15155 | A grid time with the Puls's swing (no swing for triplets). Use it to quantise to the swung grid. |
| `duckHit(t,lane)` | 3672 | Pumpen: sample-exact gain dips on the other strips. |

### 1.5 Other note sources
| Source | Where | How it sounds |
|---|---|---|
| Bordun | `startBordun` 6283, `updBordun` | A continuous drone on strip `bor`. It is not a Voice and not budgeted. Its start calls `noteEvent()`. |
| Sporenregen / Keime | `RG` 14977, `rgTick`, `rgStrike` 15263, `rgPuls` 15022 | Hits predicted in the scheduler, then `hit(GK.p.rgS, t, f, y, vel, {pan, bus: stripIn('rgn')})`, at most 8 voices (`RG_VMAX`), plus `noteEvent(t)`. |
| Rassel (Ladung) | `ladRassel` 14605 | Shake peaks are snapped to the Puls grid: `hit(GK.p.rasS, …, {bus: stripIn('fin')})`, plus `noteEvent(t)`. |
| Rhizom | `RHZ` 9370, `rhzVoice` 9406, `rhzFire/rhzPing`, `rhzRun` 9480 (from `tick`) | One `playNote` per strike. **The cascade of pings lives inside that voice** as oscillators scheduled ahead and chosen at random. It never passes `playNote` again. |
| Gespinst | `gspWeb` 9325 (singleton worklet `myzel-web`), `gspSend` 9347 | Every voice that plays Gespinst also sends into one shared web whose output is strip `gsp`. Audio only. |
| Körner | `grainTick` 10384, `spawnGrain` 6139 | One held Voice per finger. The grains are BufferSources created by the scheduler and are not voices. |
| Library preview | `kqHear` 21625 | `playNote/hit` with `v.probe = true` set **after** the call. A recorder at `playNote` must ignore it (KQ.probe). |
| Arpeggiator / chord pads | – | **None in Myzel.** The KORG keyboards' own arpeggiator, chord pad and Touch Scale arrive as ordinary MIDI notes (`midiCounts`, 12180). |

### 1.6 MIDI input
| Symbol | Line | What it does |
|---|---|---|
| `MIDI` | 10531 | `srcs, outs, ports, notes, buses, expr, tap, take, route, …` |
| `midiSource(key,name,kind,port)` | 10564 | The registry for Web MIDI, BLE-MIDI and Gestik ('motion'). |
| `onMidi(e,src)` → `midiIn(src,bytes,ts)` | 10689 / 11223 | All transports enter here. `ts` is performance time. |
| `midiMsg(src,st,d1,d2,ts)` | 11242 | `ev={type,ch,num,val,t}` → `MIDI.tap` (monitor) → `midiTake` (bindings) → built-in handling. |
| `midiTake(src,ev)` | 11284 | Gestik over Funkstrecke, then the `MIDI.take` plug-in slot, then learn, then `mapTake`. |
| `midiNoteOn(cs,note,vel)` / `midiNoteOff` | 12182 / 12201 | Velocity curve and `midiY` (12228: wheel, pressure, CC74, pedals) → `onDown({pointerId: midiId, note, vel, bend, mb, mpe})`. Sustain and sostenuto live in `noteUp`. The **note starts at currentTime**; `ts` is not used for note timing. |
| MPE | `chRole`, `mpeSeen` 12135/12159 | Member channels: per-note bend `mb`, pressure `tt.pp`, CC74 → y. |
| `midiSys` / clock | 12458 ff. | See §4. |

### 1.7 Is there one choke point?
**No single function sees every note together with its full context.** There are three layers to choose from:
1. **Gesture layer:** `onDown/moveTouch/onUp`. This covers every finger: touch, computer key, MIDI (including MPE and the KORG arp), X-Y pad. It has `tt` (id, x, y, f, col, vel, bend, mb, mpe, layers) plus later moves and the release. It misses the Puls, Regen, Rassel and Rhizom cascades.
2. **Voice layer:** `playNote(eng, t, f, y, vel, o)`, which `hit()` also feeds. It is the closest thing to a universal point: finger layers, Puls (`seqTick`, `laneHit`), Regen, Rassel and the library preview all pass. The source can be derived from `o.bus` (`MIX.list.find(st => st.in === o.bus).k` → `fin|eb2|rgn|l0…l3`, as `gspSend` does). It sees only the **start**. A held note's glide, height and release happen later on the returned voice (`v.setF`, `v.setY`, `v.release`), so a recorder would have to wrap those three methods. It misses Rhizom pings, grains, the Bordun and the Gespinst web.
3. **Existing hook:** `noteEvent(t)` (9740) is "called for every note the player or the Puls starts". Its callers are onDown, seqTick, laneHit, ladRassel, rgStrike and startBordun. It carries the time only and serves the armed recorder.

**Event replays are not deterministic:** `v.human` jitter, `laneNote` walk, `prob`, Rhizom's cascade, grain scatter and per-note worklet seeds (`wkSeed`) all use `Math.random`. Replaying a note list gives a new performance, not the same sound.

---

## 2. Existing recording features
| Feature | Symbols (line) | What it does |
|---|---|---|
| **Tap** | `TAP_SRC` 6342 (string), `myzel/tap-worklet.js`, `ensureCapture` 9529, `setupCapture` 9537 | Processor `myzel-tap`. It forwards 2048-frame stereo blocks **bit-exactly with the audio-clock frame `f`** of the first sample. Its pool of reused blocks (`{back}`) avoids allocation on the audio thread, and `'flush'` sends a partial block. It is connected at **`A.out` (post-master)**. It is created lazily, because any worklet moves Safari and Chrome-in-iframe to the worklet thread. Fallback: `ScriptProcessor(16384)` with an estimated frame position (`CAP.mode='script'`). |
| **Ring** | `CAP.ringL/R` (8 s), `onChunk` 9576, `echoBuffer` 9623 | The last 8 s of the sum. It is used by the grain source "Echo" and by `nextDownbeat` (looking back ≤ 0.2 s). |
| **Free recording** | `recToggle` 9713, `recStart`, `beginRec`, `recStop`, `finishRec` 9948; `CAP.state` idle → armed → cue → rec → tail | Up to `REC_MAX_S` = 20 min. Armed mode starts on the first `noteEvent` with ≈130 ms of pre-roll (3 held blocks). `rec.tail` records the ring-out until −54 dBFS for 0.4 s (at most 8 s). |
| **"Aufnahme in Takten"** | `P['rec.len']='bars'`, `rec.bars` 1–64; `barGrid` 9782, `nextDownbeat` 9788, `beginBar` 9799, `barRecue` 9815, `barChunk` 9834, `barTail`, `barStop` 9892, `foldTail` 9921 | **An exact 4/4 bar window in audio frames.** `f0 = round(t0·SR) + latF()`, and the downbeat is sample 0. While the Puls runs it starts on the next downbeat; otherwise at once or on the first note. A first tap ends with the current bar, a second tap at once. A tempo change while cueing re-cues. **The tail is folded onto the start** so the take loops seamlessly. A live start (Puls, Bordun or freeze running) is seamless by itself. The take keeps its tempo; `seqRetempo` toasts about that. |
| **Takes** | `takes[]`, `newRec` 9747 (stores `patch: patchValues()`), `takeMeta` 9678, `renderTakes` 22111 | `{id,name,sr,L[],R[] (Float32 chunks in RAM),frames,peak,date,patch,bars,bpm,seamless,comp}`. The UI shows the RAM in use. |
| **Backup** | `IDB` 9635, `idbOpen` 9636 (DB `myzel` v1: stores `takes` keyPath `id`, `segs` keyPath `[take,i]`), `backupSegment` (≈4 s segments), `restoreTakes` 9681 | Takes survive a reload or crash ("wiederhergestellt"). The grain file is stored as `segs ['usertex',0]`. `IDB.failed` marks a full quota. |
| **Preview / loop listening** | `playTake` 10251, `previewTick` 10260 | Streams 0.5-s AudioBuffers scheduled ahead from `tick()`. A bar take **loops** until stopped. It is connected **straight to `ctx.destination`**: outside the mixer, not recorded, not metered, and it depends on the main thread. |
| **Export** | `encodeWav` 10019 (f32 / s24 / s16 with TPDF dither, normalise, 4/10-ms edge fades), `buildZip`, `saveTake` 10181, `offerFile` 10144 | A WAV file, or in claude.ai a ZIP (WAV + `-klang.json` patch + LIESMICH). Parts are split at 180 MB. iOS uses the share sheet. |
| **Compressed copy** | `startCompressed` 9984 | A MediaRecorder on `A.mdest` (from `A.out`): mp4/opus at 256 kb/s. |
| **Takes as grain material** | `takeToGrains` 6000, `useUserMaterial` | The first 30 s become `kor.src='datei'`. |
| **Mic** | `MIC` 6069, `micStart` 6070 | A second `myzel-tap` instance on the mic feeds an 8-s ring for grains only. It is never monitored or mixed. It sets the iOS `audioSession` to 'play-and-record'. In the claude.ai view it is blocked. |
| **User file** | `USERTEX` 5981, `loadUserFile` | Up to 30 s, kept in IndexedDB. |
| **Freeze** | `setFreeze` 12695, `updDelay` | **The only live audio loop today**: the echo's delay lines loop on themselves at unity gain (`createDelay(4)`, so ≤ 3.9 s, `dly.sync` to the Puls). Schlafen's cadence uses it. |
| **Fährte** | `FA` 13849 … (separate report) | It loops modulation, not audio. Its clock and UX are relevant (§4, §5). |
| **Scenes / presets** | §2a below | |

**2a. Storage of state**
| Key / API | What it holds |
|---|---|
| `store` (1765) = try/catch localStorage | `myzel.patch.v1` (patch + preset, `saveState` 16607, debounced 400 ms after `setParam`), `myzel.rec.v1` (params with `rec:1`), `myzel.dev.v1` (`dev:1`), `myzel.user.v1` (user presets, ≤ 50, format 2 = `{name, v, fmt:2, fae, gk}`), `myzel.mixsnap.v1` (scenes A/B, plus `MX.snap.fae` loops per scene), `myzel.faehrte.v1`, `myzel.gestik.v1`, `myzel.midimap.v1`, `myzel.midiports.v1`, `myzel.cal.v1`, `myzel.klang.v1`, `myzel.kcui.v1`, `myzel.ble.v1`, `myzel.mixview/mixlayer/mixtarget`. localStorage is ≈5 MB, which is **too small for audio**. |
| `patchValues()` 16593 / `loadValues` 16594 / `PATCH_IDS` | Every PD id without `rec/dev/live`. Unknown SEL values fall back to the default. |
| `loadPreset` 22399, `presetExtra/presetExtraLoad` 15807/15823, `exportPreset/importPreset` 22479/22485 | Format 2 carries the Fährte loop (base64 Int16 lanes) and Gestik settings. A JSON file goes through `offerFile`. |
| `HIST` / `remember` / `undo` | 30 patch snapshots, plus the replaced Fährte and Gestik settings. |

---

## 3. Audio graph

```
Voice.out → PAN → strip.in ─┐ (stripIn(k); fallback A.voiceBus)
Bordun → strip bor          │   strip: in → [proc: LC/EQ/HC/sat] → byp|wet → [mat: width/balance] → duck (Pumpen) → dry
Gespinst web → strip gsp    │          dry ──► A.voiceBus (route 'fx')  or  A.masterSum (route 'dir', returns)
                            │          eS (echo send, post-fader) / hS (hall send) ──► sends
A.voiceBus = chain.in → drive → ring → filter(+LFO) → phaser(6 AP) → chorus → auto-pan = A.insertOut ──► A.masterSum
A.insertOut ─► A.send.dly/rev (or a copy of the chain when strips send ≠100 %) ─► A.dlySend/A.revSend
echo (ping-pong tape, dL/dR ≤ 3.9 s, wow/flutter, tanh sat, freeze) ─► A.dlyRet ─► strip dly (ret) ─► A.masterSum
reverb (convolver, IR from worker, 2 or 4 ch) ─► A.revRet ─► strip rev (ret) ─► A.masterSum ; dly strip hS → A.revIn
A.masterSum → lowSh → highSh → mwBy|mw (Summe Breite) → masterVol → cmpVca (glue compressor, no look-ahead) → clipPre → clip → A.out
A.out → monSt (dim/mono, monitoring only) → destination ;  A.out → analyser ;  A.out → CAP tap ;  A.out → A.mdest (MediaRecorder)
```

| Symbol | Line | Note |
|---|---|---|
| `initAudio` | 3129 | Builds everything above: `A.pitchMod/notePitch/bendSrc`, `A.uni`, LFOs, the chain, the sends, `buildStrips()`, echo, reverb and master. |
| `makeChain` | 3291 | The insert chain. Copies (`updSends` 3549) share the modulators. |
| `STRIPS` | 2191 | **The data-driven strip list:** `fin` Klang, `eb2` Ebene 2, `rgn` Regen, `l0–l3` Spur 1–4 (`lane`), `bor` Bordun, `gsp` Gespinst, `dly` Echo (ret), `rev` Hall (ret). The params `x<k>.vol/pan/mute/solo/route/dly/rev/lc/hc/lo/mid/midf/hi/sat/wid/duck` are generated per strip, and `GROUP['x'+k]` is filled automatically (2270). |
| `MIX`, `stripIn(k)`, `buildStrips` | 3460–3475 | `MIX.s[k]`, `MIX.list`, `MIX.src` (non-returns). |
| `stripGain(st)` | 3477 | Fader × (fin/eb2: `MIDI.expr`·`MOD.eg`) × (lanes: Puls group VCA `mix.pulsVol/pulsMute`) × Schlafen factor `slpK`. |
| `wireStrip` 3528, `updSolo`, `gates`, `sendTo`, `procUpd`, `matUpd` | 3480–3660 | Routing `fx`/`dir` and mute/solo. Processing blocks are switched in only when needed, so a strip at defaults is transparent. |
| `meterTaps` | 3721 | Strip meters tap **`st.duck`** (post-fader, post-width, post-Pumpen, pre-mute). Master meters and LUFS tap `A.out`. |
| `updMaster` | 3434 | `mst.low/high/comp/vol/wid`. `SLP.mg` mutes the master for Schlafen · Stille. |
| Gespinst strip | `gspWeb` 9325 | **The precedent for an own strip fed by a non-voice node.** The singleton node goes to `out(G halo)` and then `stripIn('gsp')`. Its cost counts in `voiceLoad` while `A.gsp.active`. It is rebuilt on level change (`applyQuality`) and cleared on `panic`/`slpEnter` (`{clear}`). |
| Regen strip | `STRIPS` `rgn`, `mxRgnSync` 17989 | **The precedent for a strip hidden in the mixer until used.** `mxTouched(k)` keeps it visible if any `x<k>.*` param differs from its default. |
| Mixer UI | `MXC/MXK` 16663, `mxChannels` 16666, `mxSrcText` 17214, `MX_SRC_IDS` 17231 | `mxChannels` reads a hard-coded `own = {fin, eb2, rgn, bor, gsp, dly, rev}` colour and group map: **a new strip key without an entry throws** (`own[st.k][0]`). Groups: spiel · puls · grund · rückwege · summe. |
| Take preview | `playTake` | Goes to `ctx.destination`, bypassing the mix. |

**Where a looper's audio could be tapped:**
- **`A.out`**: the existing tap, post-master (EQ, compressor, width, volume, clip, Schlafen · Stille). If loops are played back into the mix, the master is applied twice and the looper hears its own playback.
- **`A.masterSum`**: the full pre-master mix, including echo/hall returns and `dir` strips. **This is the cleanest input for an "everything" looper.**
- **`A.voiceBus` / `A.insertOut`**: pre/post insert chain, but only strips routed `fx`, without echo/hall returns.
- **Per strip at `st.duck`**, like the meters: post-fader and dry. This allows source selection (e.g. "only what I play", fin + eb2 + rgn, without the Puls) and per-source latency compensation. The sends are not included; dry loops would then run through the live FX again.

**Where playback could be inserted:** an own strip (`STRIPS` entry, like `gsp`) gives fader, pan, EQ, mute/solo, Pumpen, sends and route, and is captured by REC. Default route `dir` keeps the insert chain from processing it twice. Echo/hall sends on that strip would feed the returns, which go back into `A.masterSum`. With a `masterSum` tap those echoes would be re-captured on overdub, so a looper strip needs its sends post-tap or a separate pre-master sum (§8).

---

## 4. Time and sync
| Symbol | Line | What it does |
|---|---|---|
| `tick()` | 10395 | **The scheduler, every 25 ms**, from `startClock` (10405): a Blob Worker `setInterval(25)`, with a watchdog fallback to a main-thread `setInterval` after 700 ms. Horizon = `currentTime + clamp(0.07 + 2·jitter, 0.12, 0.35)`. `A.jitter` tracks the worst recent gap (decays ×0.993 per tick). It runs `ctxSync, jrgClock, seqTick, clkOutTick, rollTick, grainTick, previewTick, faeTick, rgTick, modFlush(true), gspTick, rhzRun`. **It returns at once if `A.ctx.state !== 'running'`.** |
| `ctxSync()` / `ctxAt(ms)` / `perfAt(t)` | 12560/12570/12569 | performance.now ↔ audio clock: the minimum offset over 2 × 0.5-s buckets, moved in ≤1 ms steps. |
| Audio clock of the tap | `tap-worklet.js` | Frame positions are counted in the worklet (`currentFrame` can stall in Chromium). This is the sample-exact reference used by bar recording. |
| `graphLatency()` | 22711 | **Only the oversampled drive's delay** (2x: 128, 4x: 192 frames; `Q.os` is '2x' on mobile and '4x' on desktop; `dev.lat='min'` turns oversampling off). It is used as `latF()` (9785) for bar windows. |
| `heardT()` | 9784 | `currentTime − baseLatency − outputLatency`: what the player hears now. It decides which downbeat a REC tap means. |
| `dev.lat` | 2249, `initAudio` 3135 | `min` gives latencyHint 0, `std` 'interactive', `safe` 'balanced'. Defaults: Android safe, other mobile std, desktop min. A change applies after `restartAudio`, which is `location.reload()`. |
| `updLatText` | 23710 | Shows baseLatency + outputLatency + graph latency. **No input or round-trip latency is measured for touch or MIDI.** |
| Klopf-Messung | `gkKlopf` 13679 | Motion → sound latency through the mic (`GK.p.lat/latS`), for Gestik only. |
| `faeShift(gk)` / `faeHeard(pt)` | 15431/15437 | The Fährte places what it writes earlier by base + output + graph latency (Gestik: + sensor latency, ±20 ms trim). **This is the only existing latency compensation of played input.** Notes and audio are never shifted. |
| Fährte clock `faeClock` | 15400 | A **continuous beat that never jumps**: the Puls's beat at a fixed offset `FA.d` while it runs, its own at `seqBpm()` while it stands. When the Puls starts, a running loop moves onto the new bar lines by ≤ half a bar (`faeAlign`). It follows the MIDI clock. A looper should share this (or a factored-out common "Takt" clock). |
| MIDI clock in | `CLK` 12482, `clkPulse` 12485 (a DLL with bandwidth 2 → 1 → 0.4 Hz), `clkFollow` 12517, `clkStart/clkStop` 12537 ff. | `P['midi.clock']='follow'` sets `SEQ.ext.bpm` (fractional). With `CLK.run` the anchors are phase-locked to every pulse. Start/Continue begin on the next pulse, and SPP is supported. After 0.5 s without pulses the Puls returns to its own tempo (`clkLost`). Loop prevention: `clkLoops`. |
| MIDI clock out | `CLKO` 12577, `clkOutTick` 12580, `clkOutStart/Stop` | 24 ppq, time-stamped ahead from the audio clock (`perfAt`). It keeps running at tempo while the Puls stands. |
| Tap tempo | `tapTempo` (target `tap`) | Sets `seq.bpm` from 2–5 taps. |
| Page visibility | `boot` 23982 | When hidden: `releaseAllTouches()`, and **`A.ctx.suspend()` unless `CAP.state !== 'idle' ‖ SEQ.on ‖ A.bor ‖ A.frozen`**. When visible again: resume and wake lock. Gestik pauses (`gkVis`). |
| Resume overlay | `start()` 23896 `onstatechange` | The "Klang fortsetzen" overlay appears after an OS interruption (a call, screen lock). |

Clock facts for a looper:
- Audio-time scheduling is sample-exact. Main-thread work (tick, preview) is jittery and is throttled in the background; the Worker keeps 25 ms there (A).
- The Puls beat jumps only at `seqStart`. The Fährte clock never jumps.
- External clock changes the tempo continuously. A fixed-length audio loop then drifts unless it is re-phased at each pass.

---

## 5. Gestik and controls
| Symbol | Line | What it does |
|---|---|---|
| Mod layer `MODT` / `MOD` | 13816/13844 | Targets ("Formen") that only deflect: `hoehe, bend, flt, pha, rng, pan, wow, dly, rev, cho, bor, korD, korS, trp, pulsD, pulsH, expr, morph, rgx, rgy, gspK, rhzR`. |
| `modSet(src,k,v,o)` / `modVal(k,t)` / `modClear(src)` | 13880/13869/13904 | Live values, or points ahead (`o.at`, used by the Fährte and Sporenregen). Flushed by frame or tick (`modFlush`). **The mod layer never writes the patch.** |
| `setParam(id,v)` → `onParamChanged` | 16487/16511 | The path that writes the patch: CTL listeners, then 400 ms save. Gestik avoids it. |
| Targets `MTARGETS`, `midiTarget(key,label,run,o)` | 11304/11305 | One registry for everything a controller can drive. A target can be `{press, release}` (momentary), `{button:true}`, `{bool, get, set}` or `{cont}`. Existing transport-like keys: `puls`, `puls.start/stop`, `rec` (`recToggle`), `freeze`, `stille`, `tap`, `hit.0–3`, `scene.a/b/ab`, `morph`, `preset.next/prev`, `fae`, `fae.take`, `fae.rec`, `fae.clear`. |
| Learn mode | `learnDone` 11939 | A button-type control gets mode `toggle` / `trigger` / `momentary`. **Line 11954 hard-codes `key === 'fae' ? 'momentary'`** because the Fährte pad needs its release for tap, hold and double-tap. A looper target with the same semantics needs the same exception. |
| Profiles `MPROF` | 11652 | **nanoKEY Studio** (`nks`): knobs CC20–27 = `BANK8`; X-Y CC16/17/18; pads on channel 10 (or channel 1 with `midi.pads`) = `PADFN` hit.0–3, puls, bor.on, freeze, stille. **All 8 pads are taken.** **nanoKONTROL2** (`nk2`, `own:1`): faders and knobs = `STRIP8`; S/M; R3–R7 = l0–l3.on, bor.on; Play 41 = puls, Stop 42, **Rec 45 = `rec`**, Cycle 46 = scene.ab, Marker ◀ ▶ 61/62 = scenes, Track ◀ ▶ 58/59 = presets. **Free and swallowed by `own`: ◀◀ 43, ▶▶ 44, SET 60, R1 64, R2 65, R8 71.** **microKEY**: no pads; its SUSTAIN jack sends CC64, which the message layer uses as a pedal but which a learned binding can claim (`mapTake` runs before `midiCC`). |
| Gestik events | `GK_EV = ['wenden','ruhe','schuetteln']` 13135; `gkEvent` 13422 → `gkEvTake` 13430 | They enter `midiTake` as `{type:'gon'/'goff', num}` and are learnable like pads (trigger, toggle, momentary). **Default meanings (one gesture, one meaning):** Wenden = Schlafen (`slpEnter` 14698: freeze cadence, Puls ends at the bar, strips fade; or Stille or Szene B); Ruhe = Gestik pauses, plus opt-in "Hinlegen wird Schleife" → `faeTake(…,'hin')` (15484); Schütteln = Ladung (Rassel, `wkShake`, Regen sprinkle). A user binding of Wenden takes the gesture (`gkOwnEv` 14691). |
| Gestik axes | `gkEmit` 13440 | Five axes (Neigen ↔/↕, Bebung, Drehen, Ladung) as continuous `'axis'` events. They may only drive Formen targets (`gkTarget`), never patch writes. |
| Fährte button UX | `faeWire` 15736, `FAE_ST` 15677 | **Tap** = the last 1/2/4 bars become a loop (retroactive, nothing to arm); **hold** = record from the next bar (or overdub one pass); **double tap** = clear. A ring shows the loop's phase. |

**Hands-free candidates:** Ruhe ("put the phone down") is already the Fährte's opt-in capture. Wenden means Schlafen, so the looper should define its behaviour under Schlafen rather than take the gesture. Schütteln means Ladung. Per Konzept §1.5 ("one gesture, one meaning") none should be hard-wired; they should be offered through Zuweisen. **The sustain-pedal jack, nanoKONTROL2 ◀◀ / ▶▶ / SET / R1 / R2 / R8, and MIDI notes or pads via Zuweisen** are the natural foot and hand controls.

---

## 6. UI structure
| Symbol | Line | What it is |
|---|---|---|
| Top bar `#bar` | HTML 1688 | Logo, `#engChip` (flex), `#btnPuls`, `#btnFreeze`, `#btnGk` (hidden unless Gestik), `#btnFae` (hidden unless Gestik, MIDI or BLE, or already used), `#btnRec` (pill ≥ 84 px), `#outMeter`. CSS 51–90 and 457–497: `.bar.gk`/`.bar.fae` hide the logo below 460 px and narrow the gaps below 340 px; with Gestik below 400 px the REC label collapses to a 38-px dot. **At 360 px the bar is full**: ≈ 38+38+36+36+38 px of buttons plus gaps leave ≈ 90–100 px for the engine chip. |
| Stage | `#stage` (`#cvBg`, `#cvFx`), `#faeTag` | The field. Tags like `#faeTag` ("Fährte · 2 Takte · 85 %") sit top-left without pointer events. |
| Sheet + tabs | `PANELS` 16627 (+ mixer spliced in at 16649) | `{key, title, icon, build(), open?, close?, frame?(dt,ts)}`. `buildUI` 23740 builds the tabs and panels; `openPanel/closePanel` 23779/23795. **7 tabs today:** Klang, Effekte, Puls, Mixer, Aufnahme, Presets, Gerät. Each is ≈ 51 px at 360 px, with 10-px labels below 460 px. The sheet is 54 % high (max 560 px), and its visible body is ≈ 250–310 px on phones. |
| `buildRec` | 22070 | The Aufnahme panel: big REC button, meters, Länge (Frei / In Takten) + Takte, Qualität, the take list. **This is the natural home for a looper section.** |
| Controls | `ctl(id)` 16400, `section(title,sub,…)` 16480, `grid`, `kcSwitch` 22598, `foldSec` 22605, `CTL`/`CTLWRAP` | All generated from the `PD` schema (`NUM/SEL/BOOL`; flags `chips, small, rec, dev, live, lib`). `rec:1` params are kept out of the patch and out of MIDI. |
| Frame loop | `frame(ts)` 16256 | Visual events, scope, finger labels, `updateMeters`, `panel.frame`, `mapFlush`, `modFlush`, `faeFrame`. |
| `VIS`, `visPush(ev)` | 16191 / 10317 | Events `{t, kind:'hit'|'step', x, y, lane, s, hue}` are drawn when their audio time comes (≤ 400 queued; none while hidden). There are also `VIS.burst`, `VIS.rip`, spores and hyphae. |
| `toast(msg, ms, {label, fn})` | 23808 | One toast with an optional action (e.g. Rückgängig). |
| Library UI (KQ) | `KQ` 21531, `kqOpen` 21917, `kqRow`, `kqPress` 21646 (long-press) | A searchable list overlay inside the sheet. This pattern would suit a list of loops or takes. |
| Mixer views | `MXV.views`, detail `MXV.detail` | A new strip appears automatically if `STRIPS`, `mxChannels.own` and `mxSrcText` know it. |

---

## 7. Constraints in code
| Topic | Where | Fact |
|---|---|---|
| Budget levels | `QP`, `applyQuality` 6218, `calibrate` 6235 | Level 1 on mobile is 14 Nebel units. `calibrate()` renders 24 **Nebel** voices offline (`CAL.unit`, `myzel.cal.v1`); every other cost is relative to that. Level 3 fills 0.4–0.5 of one core. |
| Underruns | `watchUnderruns` 23930 | Chrome `playbackStats`: budget ×0.8 per event and `A.lite` (processors get `{lite:1}`). |
| Worklet module | `myzelDsp` 6351, `MyzelProc` 6398, `MYZEL_DSP_SRC` 9214, `ensureDSP` 9229, `dspWanted` 9225, `wkVoice` 9284 | One Blob module (tried first) with a `myzel-dsp.js` fallback, built by `toString()` from `myzelDsp()`, which may not use closures. It has shared tables (TANH, EXP2, SIN, NOISE) and classes (PRNG, OnePole, DcBlock, Allpass1, FracDelay, Reso, Biquad). Contract: k-rate `freq/detune/hoehe`; port messages carry `{t}` and are applied at frame `round((t−currentTime)·SR)`; reports `{done}`; `{kill}`. It is **loaded only when a worklet engine is in use**, because loading moves Safari and Chrome-in-iframe to the worklet thread. It also registers `myzel-tap` inside try/catch. |
| Tap file order | `setupCapture` | The tap loads **`tap-worklet.js` first, then the Blob**. A processor added only to `TAP_SRC` would lose to a stale sibling file, so both must change. `pwa/build.py` precaches every file. |
| Offline / single file | `pwa/sw.js`, `pwa/build.py` | `myzel/src/` is the source (modules); `index.html` is its build, one HTML fragment. The PWA wraps it, uses local fonts, and has a cache-first SW with a versioned cache. No server and no COOP/COEP, so **no SharedArrayBuffer**: audio goes to and from worklets by `postMessage` with transfer. External scripts are not used. |
| iOS | `iosUnmute` 23832, `micStart`, `start()` | A silent `<audio>` loop and `audioSession='playback'` work around the ring switch. The mic needs 'play-and-record'. Unlock with a silent buffer inside the gesture. WebKit worklet glitches and silent-worklet bugs are noted in `dev/klang/research/webaudio.md` §2/§9. iOS has no `playbackStats` and no vibration. iPad/iPhone Safari have no Web MIDI or Web Bluetooth. |
| claude.ai view | `inViewer` 10132, `DL` (`window.claude.use('downloads')`) | Mic, motion and MIDI are blocked (toasts point to the app URL). Saving works only as a ZIP through the capability. IndexedDB or localStorage may be unavailable (`IDB.ok`, and `store.set` returns false); the UI warns. The artifact is still at stage 1 (HANDOFF). |
| Memory | `REC_MAX_S` 9522, `renderTakes` | Stereo float32 at 48 kHz is **384 KB/s**; 8 bars at 84 BPM (22.9 s) is ≈ 8.8 MB. Takes are kept in RAM (the UI shows the MB). The 20-min cap is ≈ 460 MB. The `CAP` ring is 8 s ≈ 3 MB. |
| Stille / reload | `panic` 12669, `restartAudio` 16588 | Stille kills voices, stops the Puls and Bordun, unfreezes, clears Gespinst and Rhizom, and flushes echo and hall. Restart is a page reload and is refused while recording. |

---

## 8. Where a looper plugs in (recommendations)

**A. Audio looper as the core.** It is the only faithful option for this instrument: Rhizom cascades, grains, Gespinst, Bordun, echo and hall tails, and the Gestik/Fährte modulation are not note events, and event replays are random (§1.7). It also follows the owner's rule: loops replay the exact sound.

1. **Input tap: pre-master.** Insert a node between the mix and the master. Make the chain `A.masterSum → A.masterIn → lowSh …` (3270) and tap `A.masterSum` with a second `myzel-tap` instance or a looper processor. Loop playback enters `A.masterIn` (or a new strip whose dry path goes there), so the master EQ, compressor, width and volume are applied once and REC (at `A.out`) records loops with the performance. Do not reuse the `A.out` tap for loop input: it is post-master and post-Schlafen-Stille.
   - Optional second input mode: "nur Gespieltes" sums the `st.duck` taps of `fin`, `eb2` and `rgn`, then plays the loop back through the live insert chain and sends. Echo and hall then stay live on the loop, and the input can be latency-compensated (see 3).
2. **Clock and quantisation: the bar window of "Aufnahme in Takten".** Reuse `barGrid`, `nextDownbeat`, `heardT`, `latF` and the frame-exact window logic (`beginBar`/`barChunk`), and `foldTail` for seamless loops. Count bars on **a beat that never jumps**: factor `faeClock` (`faeB/faeT`) into a shared Takt clock, or align like `faeAlign` when the Puls starts, rather than raw `beatAt`, which jumps at `seqStart`. With MIDI clock (`SEQ.ext`), re-phase each pass to the bar line (equal-power micro crossfade). Never time-stretch: under the owner's rule, either lock the tempo while loops exist or warn as `seqRetempo` does today.
3. **Latency.** Puls, Regen and Rassel are scheduled sample-exactly. Live input (touch, MIDI) sounds ≈ base + output latency (+ device) late relative to the beat the player heard. For a mixed-sum loop nothing can be shifted per source. In "nur Gespieltes" mode the window can be shifted earlier by `faeShift(false)` (+ trim), as the Fährte does for its lanes.
4. **Playback engine.**
   - Preferred: a **looper processor** in the worklet: record into preallocated buffers, sample-exact start/stop/overdub via `{t}` messages (the `MyzelProc` frame-offset pattern), overdub feedback (decay per pass, like the Fährte's Verblassen), an equal-power seam crossfade, an undo layer. Being self-running on the audio thread it survives main-thread stalls and background throttling. Load it lazily, like `ensureCapture`, because of the thread move. It can be registered either in `myzelDsp` (add `ensureDSP()` to its callers) or in the tap module (then update `TAP_SRC` **and** `tap-worklet.js`).
   - Fallback without AudioWorklet: `AudioBufferSourceNode{loop:true, loopStart, loopEnd}` started at a bar time. Note that the take preview's `previewTick` streaming depends on the main thread and is not a good model.
5. **Mixer channel.** Add a `STRIPS` entry (e.g. `k:'lop'`, name "Schleife") with route `dir` by default. Add it to `mxChannels.own` (otherwise it throws), add a `mxSrcText` case, and hide it until used (`mxRgnSync` pattern). Then fader, Pumpen, solo and MIDI fader learn come for free. Sends on this strip return into `A.masterSum` and would be re-captured on overdub. Either take the looper's input before the returns, or drop or post-tap the sends on this strip.
6. **Cost.** Measure the processor's cost (`klang/tests/cost.js` method) and add it to `voiceLoad()` while loops play, like `A.gsp.cost`. Report it honestly; it is never a reason to simplify.
7. **Storage.**
   - RAM: loops as Float32 chunks, like takes.
   - Persistence: IndexedDB `myzel`, either reusing `segs` with ids like `'loop:<n>'` (and `restoreTakes` must skip them) or a v2 upgrade that adds a `loops` store (create only missing stores in `onupgradeneeded`).
   - Scenes and user presets should **reference** loop ids, not embed audio (localStorage ≈ 5 MB).
   - Export: a finished loop can become a take (`takes.unshift`), so WAV/ZIP export, "Als Körner-Quelle" and the bar-exact README come for free.
8. **Controls.**
   - Register `midiTarget('loop', …, {press, release})` with Fährte-like semantics (tap = last N bars retroactively, which needs a ring of max loop length ≈ 32–64 s at the looper tap, i.e. 12–25 MB; hold = record from the next bar or overdub; double tap = clear), plus discrete targets `loop.rec/play/stop/undo/clear`.
   - Extend the momentary exception at `learnDone` (11954).
   - Profile suggestions: nanoKONTROL2 ◀◀ 43 / ▶▶ 44 / SET 60 / R1 64 / R2 65 / R8 71 are free. The microKEY sustain jack works through Zuweisen. nanoKEY Studio pads are all used (via Zuweisen or a KORG editor scene).
   - Gestik: offer Ruhe / Wenden / Schütteln only through Zuweisen; do not hard-wire them.
   - `noteEvent(t)` can auto-start an armed loop on the first note (the existing armed-REC precedent).
9. **UI slot.**
   - Sheet: a **section "Schleifen" in the Aufnahme panel** (`buildRec`) rather than an 8th tab (7 tabs at 360 px already).
   - Bar: a round icon with a phase ring on the `#btnFae` / `.fae-ico` pattern, shown only once the looper is switched on (as `faeUI` shows the Fährte). At ≤400 px collapse REC to its dot (the `.bar.gk` rule exists).
   - Field: a tag like `#faeTag` ("Schleife · 4 Takte · Spur 2/3").
   - Phase markers: `visPush`.
10. **Lifecycle hooks.**
    - Add "loop playing or recording" to the visibility keep-alive condition (boot 23982), otherwise the context suspends when the screen locks.
    - Decide the behaviour for `panic` (Stille: stop, probably keep the buffers), `slpEnter`/`slpWake` (fade with the cadence, or stop at the bar like the Puls), `applyQuality` (`Q.rich` / `A.lite`), `restartAudio` (refuse or persist), `setFreeze`, and scene switching.

**B. Event (performance) looper as an optional second layer.**
- Record at the gesture layer (`onDown/moveTouch/onUp` with `tt`, time from `A.ctx.currentTime`, MIDI `ev.t` via `ctxAt`).
- Add a `playNote` wrapper for scheduled sources (`seqTick`, `laneHit`, `rgStrike`, `ladRassel`), deriving the source from `o.bus`, and wrap `v.setF/v.setY/v.release` for held notes.
- Replay through `onDown`-like synthetic touches (ids `'loop-…'`) scheduled ahead in `tick()`.
- Exclude `kqHear` probes.
- It re-performs: randomness, Rhizom and grains differ each pass, and it consumes voice budget.
- Its benefit: it follows tempo, scale, engine and Gestik changes.

## 9. Constraints and risks
- **Owner's rule:** best sound first. Any resampling, time-stretch, lower bit depth or mono shortcut needs the owner's decision. Cost is measured and entered, never traded.
- **Feedback and double processing:** tapping `A.out` and playing back into the mix applies the master twice. Loop strip sends feeding the returns are re-captured on overdub.
- **Thread move:** any worklet, including a looper processor or an always-on tap for retroactive capture, moves Safari and Chrome-in-iframe to the worklet thread. Load it lazily and say so. Only a top-level tab gets the real-time thread.
- **Background:** without adding the looper to the keep-alive condition, a locked screen suspends the context. iOS PWAs may suspend audio anyway (A). Main-thread timers are throttled, so playback must not depend on `tick()`.
- **Tempo and clock:** audio loops cannot follow tempo or external clock drift without processing. `seqStart` makes the Puls beat jump. Share or factor out the Fährte's continuous clock.
- **Memory on phones:** 384 KB/s per stereo layer, with undo copies and the retroactive ring. Takes already sit in RAM. IndexedDB quota and eviction are browser-defined, and `IDB.failed` must be honoured.
- **Determinism:** event loops are not reproducible, whereas audio loops are.
- **Latency:** only the drive's oversampling is in `graphLatency()`. Output latency differs per device (Bluetooth 100–300 ms). There is no touch or MIDI input measurement.
- **Single-file and PWA:** a processor added to the tap must also go into `tap-worklet.js`. No SharedArrayBuffer. External libraries are not used.
- **claude.ai view:** no mic, motion or MIDI. Saving only as ZIP through the capability. Storage may be unavailable. The artifact is still stage 1.
- **Hard-coded lists to touch:**
  - `mxChannels.own`, `mxSrcText`, `learnDone`'s momentary list, `STRIP8` (if the strip should be on a fader bank).
  - The `restoreTakes` filter and `takeMeta` (if loops share the IndexedDB stores).
  - The visibility keep-alive, `soundGoesOn()` (bar-take fold logic; a looper playing "goes on"), `panic`, `slpEnter`.
- **Naming:** Gestik Konzept §11 reserves „Schleife“ for audio loops; „Fährte“, „Ring“ (ring modulator), „Kreisen“ (auto-pan), „Schweben“ (chorus), „Wirbel“ (roll), „Einfrieren“, „Geflecht“ and „Fruchtkörper“ are taken.
- **Tests to extend:** `dev/tests/v2/bars.js`, `bars2.js` (frame-exact windows, fold), `recui.js`, `latency.js`, `memdbg.js`, `mixfunc.js` (new strip), `midi-tests` (targets and profiles), `motion-tests` (Gestik bindings).
