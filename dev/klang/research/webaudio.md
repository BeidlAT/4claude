# Web Audio feasibility for ambitious DSP in Myzel (single file, phones, 2026)

Date 2026-10-13. Audience: the ideation and build agents. §1 is the verdict; §2–§9 are the evidence; §10 is the engine contract for worklet engines.

**Provenance marks.** `[V: file]` = read in the fetched source/spec text stored under `research/src/web/` (raw.githubusercontent.com was the only reachable host besides registry.npmjs.org; MDN, chromestatus, WebKit Bugzilla, blogs were blocked by the proxy). `[VS: url]` = fact reported by a WebSearch result summary of that page (not read in full). `[M]` = measured here: headless Chrome 141.0.7390 x86-64 (Playwright chromium-1194) on a 2.1 GHz Xeon, and Node 22.22 x64; scripts and raw JSON in `research/bench/` (`wa_bench.html`, `wa_bench2.html`, `run.js`, `dsp_bench.js`). `[A]` = my inference or general knowledge, not verified in this session. `[APP: line]` = the app's own code, `/home/user/4claude/myzel/index.html`.

---

## 1. Verdict in ten lines

1. AudioWorklet via a Blob-URL module is the right tool for sample-level DSP (feedback < 128 frames, modal banks, waveguides, chaotic/physical exciters). It is available in every target browser and the app already loads one that way with a file-then-blob fallback `[APP: 5168–5205]`.
2. The price of the first worklet is architectural, not per voice: in Chrome and WebKit the **whole graph** moves from the device callback thread to the worklet thread `[V: cr_audio_destination.cc:187–188; wk_AudioDestinationResampler.cpp:116–131]`. In a top-level Chrome frame that thread is real-time (Android `PRIORITY_AUDIO`, nice −16) `[V: cr_rt_thread.cc:61–69; cr_pt_android.cc:197–204]`; in an iframe it is only "semi-realtime" (`kPresentation`, nice −4) `[V: cr_awmp.cc:204–210; cr_semi_rt_thread.cc:42–49]`; in WebKit it is a QoS `UserInteractive` thread, not a real-time one `[V: wk_AudioWorkletThread.cpp:72–78]`; in Firefox processors run on the graph (audio callback) thread itself `[V: ff_AWNode.cpp:159–164]`.
3. Per-voice cost of plain-JS worklet DSP is **lower** than node-graph equivalents once a voice needs more than ~8 native nodes: a 16-resonator modal bank costs 0.5–0.6 Nebel units in a worklet versus 1.64 units as 16 native BiquadFilters `[M]`. A Nebel level-1 voice (16 native nodes) = 0.58 % of one server core at 48 kHz; every native node costs ≈ 0.02 % (≈ 0.03 units), every empty worklet node ≈ 0.035 % (≈ 0.06 units), every AudioParam on a worklet node ≈ 0.02 % (≈ 0.03 units) `[M]`.
4. One node per voice is fine (the overhead is 10–20 %, measured) and keeps the existing `Voice` contract; one node for all voices saves ~15 % but breaks per-voice bus/pan routing `[M]`. Recommendation: **one AudioWorkletNode per voice, ≤ 4 AudioParams, everything else over `port`, envelopes stay native on `v.out.gain`.**
5. One shared module string (`MYZEL_DSP_SRC`) registering all processors plus the existing `myzel-tap`; shared tables at module scope; loaded once right after `initAudio` (addModule ≈ 7–15 ms `[M]`), never on the first touch.
6. WebAssembly works inside the worklet scope (`WebAssembly` is `[Exposed=*]` `[V: wasm_jsapi.bs:373]`), must be compiled synchronously there `[VS: developer.chrome.com/blog/audio-worklet-design-pattern]`, and has Safari-specific history (Module transfer `DataCloneError`, Memory OOM on iPadOS) `[VS: bugs.webkit.org 220038, 256023]`. For Myzel-sized engines JS is enough; keep wasm as an option for one heavyweight flagship only.
7. Budget per block: 128 frames at 48 kHz = 2.667 ms wall time for *everything* (native nodes + all `process()` calls) `[VS: hacks.mozilla.org 2020 "about 3 ms"]`. Chrome Android renders in batches of the hardware buffer (≥ 128, else LCM capped at 512 frames) through a FIFO `[V: cr_audio_latency.cc:139–161; cr_audio_destination.cc:67–73]`.
8. Keep Nebel as the unit and measure worklet engines with the same offline method the app uses (`calibrate()` `[APP: 5049–5079]`); offline contexts with a worklet render on an `OfflineAudioWorkletThread` `[V: cr_awmp.cc:200–202]`, so the ratio is honest. A ready bench harness is in `research/bench/`.
9. Underrun signal exists only in Chrome: `AudioContext.playbackStats` (Chrome 146+, 1 Hz, only while visible or with capture permission) `[VS: caniuse mdn-api_audioplaybackstats_resetlatency; V: cr_audio_context.cc:186–232]`; the app already scales its budget on it `[APP: 18940–18953]`. `AudioRenderCapacity` is not in the current editor's draft and not shipped `[V: spec_index.bs grep "capacity" = 0 hits; A]`.
10. Fallbacks: no `audioWorklet` → engine hidden or native approximation (never ScriptProcessor for instruments); blob blocked → sibling file; iOS: do not await `addModule` inside the gesture handler, never bake the sample rate into tables; iframe → tell the user to open in a tab.

---

## 2. Thread model and starvation per browser

| | Chrome (Blink) | Safari/iOS (WebKit) | Firefox (Gecko) |
|---|---|---|---|
| Without worklet | graph rendered on the audio device thread (`AudioDeviceThread`) `[V: cr_audio_destination.cc:153]` | on the audio device's rendering thread `[V: wk_AudioDestinationResampler.cpp:131]` | graph (MTG) thread = callback thread `[A]` |
| With worklet | "dual-thread rendering": device thread pulls from FIFO, posts render requests to the worklet thread `[V: cr_audio_destination.cc:187–198, 279–313]` | rendering dispatched to `AudioWorkletThread`, FIFO of 96 × 128 frames between `[V: wk_AudioDestinationResampler.cpp:39, 116–131]` | processors run on the graph thread; no extra thread `[V: ff_AWNode.cpp:159–164; VS: hacks.mozilla.org]` |
| Worklet thread priority | top-level frame: `kRealtimeAudio` (feature `kAudioWorkletThreadRealtimePriority`, "enabled by default"); Android maps it to `PRIORITY_AUDIO` = −16, set via JNI for the better cgroup `[V: cr_rt_thread.cc:61–69; cr_pt_android.cc:197–204, 265–268]`. Linux sandboxed renderers cannot get SCHED_RR `[V: cr_rt_thread.cc:65–68]`. **Iframe: `SemiRealtimeAudioWorkletThread`, `kPresentation` (Android −4)** `[V: cr_awmp.cc:192, 204–210; cr_semi_rt_thread.cc:42–49]` | `Thread::QOS::UserInteractive` when the context is real-time, `Default` otherwise `[V: wk_AudioWorkletThread.cpp:78]`; RT only on Darwin (bug 220115) `[VS: bugs.webkit.org/220115]` | real-time callback thread `[VS: hacks.mozilla.org]` |
| Output buffering | FIFO allocated at max(16384, callback + quantum) frames; "earmarked" frames = callback buffer size when the worklet is active `[V: cr_audio_destination.cc:67–73, 416, 498–500]`; a `kWebAudioBypassOutputBuffering` mode makes the device thread wait synchronously for the worklet instead `[V: cr_audio_destination.cc:203–214]` | FIFO 12288 frames capacity `[V: wk_AudioDestinationResampler.cpp:39]` | n/a |
| Android callback size | hardware size if ≥ 128, else LCM(hw, 128) capped at 512 (e.g. 96 → 384) `[V: cr_audio_latency.cc:148–161]`; some BT devices report ≈ 16k `[V: cr_audio_destination.cc:67–72]` | — | — |
| Underrun/latency stats | `playbackStats` (Chrome 146+): `underrunEvents`, `underrunDuration`, `totalDuration`, `average/min/maximumLatency`, `resetLatency()`; refreshed ≤ 1/s and only while visible or with capture permission `[V: cr_playback_stats.cc:34–90; cr_audio_context.cc:186–232; VS: caniuse]` | none `[A]` | none `[A]` |
| Known worklet bugs | — | glitches after any worklet on iOS reported 2021–2023 (bug 221334 open) `[VS: bugs.webkit.org/221334, 226240]`; silent worklet on iOS 17.6/18.0.1 until another tab plays `[VS: developer.apple.com/forums/thread/768347]`; mic track 44.1 k vs context 48 k `[VS: bugs.webkit.org/253220]`; `addModule` awaited inside the click handler lost the gesture (bug 247614, fixed 2022) `[VS: bugs.webkit.org/247614]`; posting a `WebAssembly.Module` via port → `DataCloneError` (2020) `[VS: 220038]`; `SharedArrayBuffer` posted to a processor not shared (bug 237144) `[VS]` | — |

Consequence for Myzel: the app currently creates its tap worklet lazily for exactly this reason `[APP: 5164–5166]`. With worklet **engines** the move to the worklet thread is permanent; it is acceptable in a top-level tab (RT thread in Chrome; UserInteractive in WebKit), and the FIFO adds roughly one callback buffer of latency in Chrome `[A, from earmark = callback size]`. Decide once: if any worklet engine is in the library, load the module at `initAudio` and accept the thread move, instead of flipping threads on the first worklet note.

---

## 3. AudioWorklet facts that shape the design

- **Loading.** `addModule(url)` is the only way in; a `blob:` URL created from a string works in Chrome (measured: 7–15 ms for a fresh context including the first processor registration `[M]`). WebKit/Firefox: no explicit blob documentation found; WebKit's tests exercise data-URL loading `[VS: bugs.webkit.org/219166]`, MDN lists the error cases (`AbortError` on load failure, `SyntaxError` on an invalid URL) `[VS: MDN Worklet/addModule]`; AudioWorklet itself ships since Safari 14.1 / iOS 14.5 `[VS: usefulangle.com Safari TP 116]` and Firefox 76 `[A]`. **Assume blob works everywhere, keep the sibling-file-first order the app already uses** `[APP: 5181–5184]`.
- **Global scope.** `registerProcessor`, `currentFrame`, `currentTime`, `sampleRate`, `renderQuantumSize`, `port` `[V: spec_index.bs:10631–10640]`. No timers, no `fetch` `[A]`. One scope per context, shared by all processors: module-level tables are built once `[VS: MDN AudioWorkletGlobalScope]`. Registering the same name twice → `NotSupportedError` `[V: cr_aw_gs.cc:69–72]`; one module may register many processors.
- **process() arguments.** `inputs[n]` is an empty array when nothing actively-processing is connected `[V: spec_index.bs:11387]`; outputs are zero-filled; arrays are reused between calls unless topology changes `[V: spec_index.bs:11374–11378]`; Chromium copies through cached backing stores `[V: cr_aw_proc.cc:143–253]`. **Parameter arrays: a-rate = one value per frame, but "MAY have length 1" when no automation is scheduled** `[V: spec_index.bs:11398]`; Chromium does exactly that (`HasConstantValues ? first(1) : values`) `[V: cr_aw_handler.cc:190–199]`; k-rate = always length 1, sampled at the first frame `[V: spec_index.bs:4083–4086]`. Always index with `arr.length > 1 ? arr[i] : arr[0]`.
- **Render quantum.** 128 by default; `renderSizeHint` ("default" | "hardware" | integer, 1 … 6·SR) is in the spec `[V: spec_index.bs:1643–1654, render-quantum-sizes]`, implemented in Chromium with use counters `[V: cr_audio_context.cc:468–470]`, shipping around Chrome 153 `[VS: dev.classmethod.jp chrome-153 article; blink-dev intents]`; "hardware" currently returns 128 on Chromium `[VS: blink-dev B3OnsU0V-i4]`. **Never hard-code 128**: use `outputs[0][0].length` / `renderQuantumSize`.
- **Lifetime.** `active source` flag starts true; returning `true` keeps a node without inputs alive, returning `false` lets it be collected once nothing feeds it `[V: spec_index.bs:3603–3605, 10889–10891]`. An exception in `process()` sets `[[callable process]]` false, clears active source, fires `processorerror`, and Chromium zeroes the outputs from then on `[V: spec_index.bs:12414–12437; cr_aw_handler.cc:130–135]`. A thrown exception = a silent, dead voice: guard inner loops and validate `processorOptions`.
- **Parameters vs. messages.** Each `AudioParam` on a worklet node costs per block even when constant (6 params: +0.10 % core per node ≈ +0.17 Nebel units; ramping a-rate was not costlier than constant; k-rate ramping slightly costlier) `[M]`; the cprimozic case (16 processors × 34 params → audio glitches, fixed by cutting params from 544 to 96) confirms linear scaling `[VS: cprimozic.net/blog/webaudio-audioworklet-optimization]`. Messages via `port.postMessage` have no sample timestamps; include the intended context time and align in the processor with `currentTime`/`currentFrame`.
- **Memory/GC.** Allocate all state in the constructor (Float32Array/Float64Array); no object or array creation in `process()`; typed-array state reads/writes inside the per-sample loop are slower than locals (4-stage SVF with per-sample Float64Array state: 285 ns/sample vs 36 ns for a local-variable biquad `[M: dsp_bench.js]`) — copy state into locals at block start, write back at block end.
- **Denormals.** Chromium/WebKit/Gecko set flush-to-zero around rendering (x86 SSE `_DN_FLUSH`; ARM/ARM64 FPCR bit 24 FZ) `[V: cr_denormal.h:45–150; ff_Denormal.h; wk_Denormal.h]`, applied in `RealtimeAudioDestinationHandler::Render` and offline rendering `[V: cr_rt_dest_handler.cc:238; cr_offline_dest.cc:339]`, i.e. around the call that executes `process()` on the worklet thread `[A: call chain not read]`. JS doubles without FTZ pay ≈ 10× on x86 (64 vs 6.6 ns/sample) `[M]`; x86 subnormals cost ~2 orders of magnitude in general `[VS: arxiv.org/pdf/1506.03997]`; no number found for Cortex-A `[VS]`. Cheap insurance: once per block, if `|state| < 1e-18` set 0 for every feedback state (not per sample).
- **SharedArrayBuffer** needs cross-origin isolation (COOP/COEP headers) `[VS: github.com/br-matt/ringbuf.js]`; a single static HTML on a plain host cannot set headers → assume no SAB; transfer `ArrayBuffer`s through `port` instead.

---

## 4. Measured costs (Chrome 141 headless, x86-64, OfflineAudioContext 48 kHz, 24 voices × 2 s, min of 2 runs) `[M]`

CPU fraction = render wall time / audio time / voices. 1 Nebel unit = the first row.

| Voice | % of one core per voice | Nebel units | Note |
|---|---|---|---|
| native Nebel L1 (3 saw ±12 ct + sub + breath noise + lowpass; 16 nodes, LFO on every detune) | 0.581 | **1.00** | = `calibrate()`'s reference (`CAL.unit` ≈ 5.8 ms CPU per audio second here) |
| native modal bank: 16 bandpass Biquads in parallel | 0.954 | 1.64 | node overhead dominates |
| native: 1 oscillator + 1 gain | 0.055 | 0.09 | |
| native: 1 oscillator + 16 gains in series | 0.352 | 0.61 | ⇒ ≈ 0.019 % ≈ **0.03 units per native node** |
| worklet: empty processor, 1 node/voice | 0.035 | 0.06 | pure per-node overhead |
| worklet: sine + 1-pole, 0 / 6 a-rate const / 6 a-rate ramp / 6 k-rate ramp params | 0.090 / 0.196 / 0.192 / 0.229 | 0.15 / 0.34 / 0.33 / 0.39 | ≈ **0.03 units per AudioParam** |
| worklet pass-through with a native oscillator input | 0.111 | 0.19 | input handling ≈ +0.03–0.05 % |
| worklet modal bank 16 resonators (complex rotation), 1 node/voice | 0.353 | 0.61 | vs 1.64 native |
| same, 1 node × 24 voices / × 64 voices | 0.302 / 0.288 | 0.52 / 0.50 | linear in voices |
| same, 64 nodes × 1 voice | 0.380 | 0.65 | per-node overhead grows slightly with count |
| worklet waveguide (lerp delay + 1-pole + allpass), 1 node/voice / 1 node all | 0.138 / 0.108 | 0.24 / 0.19 | |
| worklet 2 table oscillators + tanh table + 1-pole, 1 node/voice / 1 node all | 0.142 / 0.146 | 0.24 / 0.25 | |

Build cost on the main thread: 24 Nebel voices 13.7 ms (0.57 ms per 16-node voice); 24 worklet nodes ≈ 6 ms (0.25 ms per node) `[M]`.

Pure-JS inner-loop throughput (Node 22 x64, ns per sample ⇒ % of one 48 kHz core) `[M: dsp_bench.js]`: biquad 36 (0.17 %), 16-resonator modal 72 (0.35 %, consistent with the worklet figure), waveguide 27 (0.13 %), 2 × `Math.sin` + `Math.tanh` 91 (0.44 %) vs table lookups 32 (0.16 %), 4 × SVF with typed-array state 285 (1.37 %). Rule of thumb: **≈ 5 ns per resonator-sample, ≈ 30 ns per biquad-sample, ≈ 30 ns per table-oscillator-sample in JS.**

Scaling to phones `[A]`: Snapdragon 695 Geekbench 6 single-core ≈ 905 `[VS: nanoreview.net]`; M1 iPad ≈ 2190–2380 `[VS: browser.geekbench.com]`; this Xeon core is unknown (assume 1000–1300). So multiply the table by ≈ 1.0–1.5 for a 2022 mid-range Android and ≈ 0.5 for an M1 iPad. The JS-vs-native ratio should hold within ±50 % on ARM64 (V8 ARM64 JIT is mature; Blink's native paths have NEON code, e.g. `[V: cr_periodic_wave_handler.cc:242]`). Myzel's level-1 mobile budget of 14 units `[APP: 2083]` is therefore ≈ 8 % of this core and ≈ 10–12 % of a Snapdragon 695 core; level 3 fills 40–50 % of a core by construction `[APP: 5035–5038]`. Worklet engine archetypes at 0.2–0.6 units per voice fit comfortably; the 1.5-unit engines (Gong) are the expensive ones, not the worklets.

Budget per block for reference: 2.667 ms at 48 kHz; Firefox states ≈ 3 ms including all native processing `[VS: hacks.mozilla.org/2020/05/high-performance-web-audio-with-audioworklet-in-firefox]`. The Android CTS workload test starts at 20 sine voices as the device-capacity baseline `[VS: source.android.com audio-workload-test]`.

---

## 5. WebAssembly inside the worklet

- Available: `WebAssembly`, `Module`, `Instance` are `[Exposed=*]` `[V: wasm_jsapi.bs:373, 705, 781]`. Chrome's design-pattern article: either load glue in the scope and **compile synchronously** (the `addModule` promise does not wait for promises inside the scope), or compile on the main thread and pass the `Module` via `processorOptions`/port `[VS: developer.chrome.com/blog/audio-worklet-design-pattern]`. The second path failed in Safari with `DataCloneError` in 2020 `[VS: bugs.webkit.org/220038]`; status today unknown `[A]` → use the first path: base64 bytes embedded in the module string (or passed as an `ArrayBuffer` in `processorOptions`, which is structured-cloned `[V: spec_index.bs:11123–11127]`), `new WebAssembly.Module(bytes)` once at module top, one `Instance` per node or one instance with voice slots.
- iPadOS: `WebAssembly.Memory` allocation failures in processors after repeated reloads (2023) `[VS: bugs.webkit.org/256023]` → allocate one small memory (≤ 1 MB) once per scope, reuse across nodes.
- No shared memory without COOP/COEP (§3). Faust/Emscripten denormal handling: Faust's wasm backend inserts software flush-to-zero because physical models produced denormals `[VS: lists.w3.org public-audio 2017JulSep/0006]`.
- Worth it? Only for a model whose JS cost would exceed ~1 unit per voice (e.g. a 44-section vocal tract with turbulence, or 64+ coupled modes). Pink Trombone already runs as a JS AudioWorkletProcessor `[V: research/src/pt_zakaton_README.md]`; Myzel's archetypes are 0.2–0.6 units in JS `[M]`. Recommendation: **JS first; wasm reserved for at most one flagship engine, compiled offline and embedded as base64.**

---

## 6. Existing physical-modelling stacks (what to borrow, what not to ship)

| Stack | Size (npm `unpackedSize`, latest) `[V: npm_*.json]` | Worklet use | Relevance |
|---|---|---|---|
| Faust `@grame/faustwasm` 0.19.0 (2026-10-01) | 31.6 MB (in-browser compiler) | creates AudioWorklet or ScriptProcessor nodes; exported DSPs run with a fixed 128-frame buffer in worklet mode; "ScriptProcessor is the only option on Safari" is an old note `[VS: faustdoc deploying; fausteditor faustlive-wasm; faustwasm README]` | `physmodels.lib`, `filters.lib`, `tibetanBowl.dsp`, `glassHarmonica.dsp` are in `research/src/` — port algorithms by hand into JS; do not ship the compiler. Exported wasm per DSP is small `[A: tens of KB]`. |
| WebChucK 1.2.11 | 121 KB package; the wasm is fetched separately ("about 3 s to load" in 2020) `[VS: chuck-users 2020-July]` | ChucK VM in a worklet | language VM, not an engine library |
| Csound `@csound/browser` 7.0.0-beta38 | 10.7 MB; csound wasm 3.8 MB (6.18) / 2.2 MB (7 alpha) `[VS: forum.csound.com/t/981]` | wasm in worklet | FOF, gendy, scanned synthesis, modal sources are in `research/src/cs_*.c` for reference |
| Elementary `@elemaudio/web-renderer` 4.0.3 | 988 KB (wasm runtime) | one worklet, functional graph | shows a whole synth runtime fits in < 1 MB |
| RNBO `@rnbo/js` 1.4.5 | 277 KB + exported patch JSON with wasm; each device = one AudioWorkletNode `[VS: rnbo.cycling74.com web export]` | wasm in worklet | proves the one-node-per-instrument model is production grade |
| Tone.js 15.1.22 | 5.4 MB source | mostly native nodes, few worklets | nothing to borrow for engines |
| ringbuf.js 0.4.0 | 252 KB | SAB ring buffer | needs COOP/COEP → not for Myzel |
| Pink Trombone (zakaton port) | two small JS files | JS AudioWorkletProcessor | the "Stimme"-adjacent vocal-tract model exists as a worklet; `research/src/pt_*` |

Takeaway: every serious browser instrument in 2026 runs its DSP in one or a few worklet nodes; none of these can be dropped into a single HTML file unchanged; all confirm the cost class measured in §4.

---

## 7. Native-node facts and tricks (verified against spec and Blink source)

- **Feedback through DelayNode.** In a cycle, `delayTime` is clamped to a minimum of one render quantum `[V: spec_index.bs:7768–7770, 12278–12280]`; cycles without a DelayNode are muted `[V: wpt_cycle_wo_delay.html]`; the WPT confirms exactly 128-frame loops at 48 kHz `[V: wpt_feedback_delay.html:16–39]`. ⇒ native Karplus-Strong / feedback FM only for periods ≥ 2.67 ms (≤ 375 Hz) and with a fixed 128-frame granularity; that is why Saite pre-renders `[APP: ksBuffer]`. Still excellent for comb/chorus/shimmer/"Schimmer" delays (Gong does this) — and for engines whose character *is* a long feedback path (≥ 3 ms: flutter echoes, resonant tubes below 375 Hz at full sample precision are not possible; frequency is quantised to integer multiples of 128 frames unless the DelayNode is outside a cycle).
- **WaveShaper oversampling.** Spec: up-sample 2×/4×, apply curve, down-sample; filters unspecified; tail-time only with oversampling `[V: spec_index.bs:10245, 10416–10430]`. Blink: UpSampler = 128-tap Blackman-windowed sinc half-band filter, even samples are a delayed copy, odd samples by direct convolution (FFT convolver for blocks > 128) `[V: cr_up_sampler.cc:44–140]`; DownSampler = 256-tap kernel reduced to its odd taps `[V: cr_down_sampler.cc:44–137]`; 4× = two stages, stage 2 via `SimpleFFTConvolver` at the standard quantum `[V: cr_waveshaper_handler.cc:50–53]`; latency is computed and reported from the kernels `[V: cr_waveshaper_handler.cc:201–227]`. Cost estimate `[A]`: 2× ≈ 128 + 128 MAC per input sample per channel ≈ 8–10 biquads; 4× ≈ 3× that. Use `oversample = 'none'` with a pre-lowpass for soft saturation; `'2x'` only on Stufe 3 and only on hard clipping stages.
- **IIRFilterNode.** ≤ 20 feedforward and ≤ 20 feedback coefficients, `NotSupportedError` beyond, `InvalidStateError` for all-zero numerator or zero `a0` `[V: spec_index.bs:1094–1095]`; Blink `kMaxOrder = 19`, WebKit `maxOrder = 20`, both keep state in double precision `[V: cr_iir_filter.h:20, 53–55; wk_IIRFilter.h:36, 60]`; coefficients are immutable, no AudioParams `[A: no params in IDL]`. Use for fixed high-order bodies (one node instead of several biquads); the implementation does not check stability → design with margin. Firefox's accuracy is the same class `[A]`.
- **ConvolverNode.** Blink `ReverbConvolver`: stages from FFT size 128, each next stage doubled; the leading part is direct convolution so total latency is zero `[V: cr_reverb_convolver.cc:74–83; cr_reverb_convolver.h:73]`; long tails run on a background thread with ≈ 278 ms slack (comment in the Gecko copy of the same code) `[VS: searchfox ReverbConvolver.cpp]`; normalisation = RMS power with a −58 dB calibration at 44.1 kHz `[V: cr_reverb.cc:50–84]`. Trick: short IRs (≤ ~100 ms) are cheap fixed "bodies" (Körper) and also work as **modal banks** — synthesise an IR of N decaying sinusoids offline in the DSP worker (`genIR` exists `[APP: 2191]`) and convolve the exciter; but the modes cannot follow pitch or Höhe (IR fixed; swap between a few IRs per octave band `[A]`). True-stereo 4-channel IRs already exist (reverb) `[APP]`.
- **PeriodicWave.** Blink builds all band-limited tables at creation: 3 tables per octave, table size 4096 at 44.1/48 kHz, `round(3·log2 4096) = 36` tables × 4096 floats ≈ 576 KB per wave, one inverse FFT each `[V: cr_periodic_wave_handler.cc:35–87, 283–354; cr_periodic_wave.cc:65]`; Firefox builds them lazily per needed range `[VS: bugzilla.mozilla.org/1222405]`. ⇒ cache waves (the app's `A.waves[key]` cache `[APP: 2809, 3781]`), never create one per note; partials are harmonic only — inharmonic spectra need several oscillators (Schale, Gong) or a worklet.
- **k-rate automation.** `AudioParam.automationRate` is settable on most params; fixed k-rate on `AudioBufferSourceNode.playbackRate/detune` and all DynamicsCompressor params; ignored for HRTF panning `[V: spec_index.bs:4232–4262]`. WebKit implements `setAutomationRate` `[V: wk_AudioParam.cpp:117–119]`; **Firefox has the enum but no attribute** `[V: ff_AudioParam.webidl:14–40]` (the app's `KR()` try/catch covers it `[APP: 2092]`). Grain pitch glides on BufferSources are therefore stepwise per quantum everywhere.
- **ConstantSourceNode / Gain-as-modulator.** Any number of sources summed into one AudioParam (the app feeds `A.pitchMod`/`A.notePitch` gains into every detune `[APP: 2831–2836, 3464]`); worklet nodes get the same for free by exposing a `detune` AudioParam and calling `v.mod()` on it.
- **OfflineAudioContext.** Renders on its own thread; with a worklet module present on an `OfflineAudioWorkletThread` `[V: cr_offline_dest.cc:141–146; cr_awmp.cc:200–202]` → `calibrate()`-style timing works for worklet engines too (bench harness proves it `[M]`).

---

## 8. How to measure cost (extend what the app has)

1. Keep `calibrate()` as is (24 Nebel voices offline → `CAL.unit` seconds of CPU per audio second per voice `[APP: 5049–5079]`).
2. Add `scratchpad` bench `research/bench/wa_bench.html` pattern per new engine: 24 voices, 2 s, `OfflineAudioContext(2, 96000, 48000)`, `await addModule(blob)` first, min of 2 runs; `units = cpuFrac / cpuFracNebel` from the same page. Level-3 variant measured separately (the app stores L3 = L1 × ratio `[APP: 2082]`).
3. Starting values for `VCOST1` from §4 (worklet, 1 node per voice): modal-16 0.6, waveguide 0.25, 2-osc/tanh 0.25; add 0.03 per AudioParam, 0.03 per extra native node (gain/pan/filter around the worklet), 0.06 per biquad; +25 % for input handling if the worklet is fed by native nodes. Phone correction ×1.0–1.5 `[A]`.
4. Runtime guard stays `watchUnderruns()` on `playbackStats` `[APP: 18940–18953]`. Add a worklet-side self-check without timers: the processor counts blocks and compares `currentFrame` to its own frame counter — a jump means the context skipped (bypass/underrun) `[A]`; report via port at most 1/s. `performance` is not assumed to exist in the worklet scope `[A]`.
5. For tracing on a device: Chrome tracing categories `webaudio` and `disabled-by-default-audio-worklet` carry the thread creation and render events `[V: cr_rt_thread.cc:53–84; cr_audio_destination.cc:159, 204]`.

---

## 9. Fallback ladder

| Condition | Action |
|---|---|
| `!ctx.audioWorklet` or `addModule` fails for both URLs | engine not offered (filtered out of the library) or a declared native stand-in (`ENGINES.xyz.fallback = 'sch'`), toast once. Never ScriptProcessor for instruments (main thread, ≥ 256-frame blocks; the app uses it only for the recording tap `[APP: 5196]`). |
| `processorerror` on a node | voice killed via `v.cleanup()`, engine marked broken for the session `[A]`. |
| Underruns rising after worklet engines are enabled | existing ×0.8 budget scaling + `A.lite`; additionally switch worklet engines to their lite variant (fewer modes/segments) via `Q.rich`/`A.lite`. |
| Chrome in an iframe | semi-realtime thread `[V]` → show "Im eigenen Tab öffnen" hint if `window.top !== window` `[A]`. |
| iOS gesture/sample-rate | context created and resumed in the gesture; `addModule` at load time, not awaited inside the handler `[VS: 247614]`; processors read `sampleRate` and recompute coefficients when it changes `[VS: 253220]`. |
| CSP without `blob:` | sibling `myzel-dsp.js` file first (the app's existing order) `[APP: 5181]`. |

---

## 10. Contract for a worklet engine in Myzel (fits `Voice`, `playNote`, `hit`, Gestik)

```
MYZEL_DSP_SRC (one string, one addModule, next to TAP_SRC):
  shared tables: SIN[4097], TANH[2049], NOISE[65536], helper classes (OnePole, SVF, Allpass, FracDelay, ModalBank)
  registerProcessor('myzel-tap', …)          // existing
  registerProcessor('myzel-<eng>', …)        // one per worklet engine
Processor:
  static parameterDescriptors: detune (k-rate, cents), freq (k-rate, Hz), hoehe (k-rate 0..1), [one engine param]   // ≤ 4
  constructor(o): all state preallocated from o.processorOptions (SR-independent); tail = false
  port.onmessage: {on:t, f, y, vel, gate?}  {off:t, k}  {set:{…}}   // aligned to currentTime inside process()
  process(): q = out.length; coefficients from k-rate params once per block; locals for state; per-block denormal flush;
             return !(this.done && this.silentBlocks > 8)                    // node becomes collectable
Engine side (start(v,t,f,y,vel,o)):
  node = v.n(new AudioWorkletNode(A.ctx, 'myzel-<eng>', {numberOfInputs:0, outputChannelCount:[1|2], processorOptions}))
  v.mod(node.parameters.get('detune'))              // Bebung, vibrato, pitch wheel, Höhe offsets come through the bus
  node.connect(v.out)                               // envelopes stay native: burstEnv / adsrStart / sustainRelease on v.out.gain
  node.port.postMessage({on: t, f, y, vel, gate: o.burst ? o.gate : 0})
  v.setF = (nf, glide) => glideTo(node.parameters.get('freq'), nf, glide)   // k-rate ramp, ≤ 30×/s is fine
  v.setY = (ny) => setP(node.parameters.get('hoehe'), ny, 0.04)
  v.release = (k) => { node.port.postMessage({off: A.ctx.currentTime, k}); …finish(t1 + rel) }   // finish() disconnects; processor returns false
  cost: VCOST1/VCOST3 from the bench (§8)
```

Decisions this contract encodes: envelopes and bus/pan routing remain native (no change to `playNote`, stealing, `vFade`, mixer strips); the processor is only exciter + resonator; pitch-carrying modulation goes through the one `detune` param so every Gestik feature works unchanged; module loaded once at `initAudio` so the thread move happens before the first note, not during it.
