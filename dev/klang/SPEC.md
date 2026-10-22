# Myzel – twelve new sound sources: build specification

Date 2026-10-17. For the builders. Companion: `KONZEPT.md` (owner's view, German). Evidence: `research/code-map.md` (APP line numbers against git `03050e0`, 19 022 lines), `research/webaudio.md` (platform measurements), `research/synthesis.md` (formulas), `ideas/check/*.json` (adversarial checks with simulations), `ideas/judge-1..3.md`, `ideas/ui-final.md` (library UI). Marks: **(V)** verified in code/source/measurement, **(M)** measured in `research/bench/` or `ideas/check/sim/`, **(A)** assumption or design decision. `APP n` = line n of `/home/user/4claude/myzel/index.html`.

Units: 1 cost unit = one level-1 Nebel voice (`VCOST1.neb = 1`, APP 2081); mobile level-1 budget 14 units (APP 2084); measured worklet archetypes: empty node 0.06, each AudioParam 0.03, 16 complex-rotation resonators 0.61, waveguide 0.24 (M, webaudio.md §4); ≈ 121 ns per sample at 48 kHz = 1 unit (M).

---

## 0. Decisions

1. **Set (12):** hrz Harz, hlm Halm, glt Glut, boe Böe, amo Amöbe, rnk Ranke, shn Sehne, zpf Zapfen, elm Elmsfeuer, mdr Moder, gsp Gespinst, jrg Jahresring. **Reserves:** khl Kehlchen, rhz Rhizom. Rule: 7 unanimous across the three judges, 5 with two of three; Kehlchen (2/3) swapped for Jahresring (1/3 + two reserve votes) to reach the held/struck balance the brief asks for (vote result would be 10/2; now 6 held-first, 3 both, 3 struck-first) and because Kehlchen's check leaves two subsystems open (2-D pitch correction, syllable generator) while Jahresring is native with zero DSP risk (`ideas/judge-3.md` §3). Folded in: dax → hrz body `zunge`, tum → hrz body `teich`, loh → hlm pipe `flamme`, kre → glt native fallback, klf → zpf body `fels`, drn → shn bridge `jawari`. blz (Fell body) and blg (free reed) are P2 bodies/pipes once the bow/blow processors exist.
2. **Engine contract unchanged** (APP 3454–3528, 5013–5026): `start(v, t, f, y, vel, o)` with `o = {burst, gate, decayMul, pan, bus, bend}`; held engines set `v.setF(nf, glide)`, `v.setY(ny)`, `v.release = sustainRelease(...)` or use `burstEnv` when `o.burst`; struck engines set `v.released = true` and `v.finish(...)`. Envelopes stay native on `v.out.gain`. Every pitch-carrying detune goes through `v.mod()` (APP 3464).
3. **One shared worklet module** `MYZEL_DSP_SRC` (string, Blob URL, sibling file first – the `TAP_SRC`/`setupCapture` pattern APP 5156–5205) registering `myzel-tap` plus ten engine processors. One `AudioWorkletNode` per voice, ≤ 4 AudioParams, everything else over `port` (webaudio.md §10). The module is loaded when a worklet engine is **selected** anywhere (`v.eng`, `v.layer`, `l0–3.eng`, `GK.p.rgS`), when a restored patch/preset contains one, or when the library previews one – never inside the first touch handler; native-only sessions keep the real-time thread (`ideas/engineer.md` §0.5, webaudio.md §2).
4. **Fallback without AudioWorklet** per engine (`ENGINES[k].needs = 'worklet'`, `ENGINES[k].fallback`): native stand-in of its own for zpf and glt; mapped to an existing engine for hrz → sch, hlm → hau, shn → sai, gsp → sai, mdr → glo, boe → obt, rnk → neb, amo → tie. `playNote` reroutes when `!A.workletOK`; the key stays in the patch; the library tile shows „⌁ spielt als …“ (ui-final §4.2). Never ScriptProcessor for instruments (webaudio.md §9).
5. **Puls, Sporenregen, Rassel:** every held engine has a burst mode that is audible inside a 112 ms gate (≥ −20 dB vs its held level); struck engines scale their life from `o.gate` because the app never sets `decayMul` (V: 0 setters, only `o.decayMul || 1` readers) – `decayMul` stays honoured as a multiplier. `RG_S` becomes derived (`!sustain && ENG_META[k].regen !== 0`); Rassel list gains mdr and jrg.
6. **Gespinst singleton** is counted in the budget: `voiceLoad()` adds `A.gsp.cost` while the web is active (APP 5012 sums only voices; the Bordun is not counted either – out of scope, noted).
7. **Acceptance = the checks' fix lists.** No engine enters the library without passing its tests in §7.

---

## 1. The set

| key | name | ENG_INFO (≤ 52 chars) | fam | art | sustain | path | VCOST1 / VCOST3 | fallback | regen | MACRO | hoehe |
|---|---|---|---|---|---|---|---|---|---|---|---|
| hrz | Harz | Gestrichenes Glas, Schale, Stab – Druck ist Höhe | holz | haelt | true | W `myzel-bow` | 1.05 / 1.75 | sch | 0 | hrz.druck, hrz.harz | Bogendruck |
| hlm | Halm | Rohrblatt, Flöte, Flamme – der Atem ist die Höhe | luft | haelt | true | W `myzel-blow` | 0.45 / 0.8 | hau | 0 | hlm.atem, hlm.blatt | Atemdruck |
| glt | Glut | Gestimmte Rückkopplung, die nachglüht | erde | haelt | true | W `myzel-ember` (+ native) | 0.45 / 0.9 (native 0.35) | native | 0 | glt.gluehen, glt.hitze | Gewinn |
| boe | Böe | Äolsharfe – Saiten rasten im Wind ein und hängen nach | luft | haelt | true | W `myzel-aeol` | 0.7 / 1.2 | obt | 0 | boe.wind, boe.fang | Windstärke |
| amo | Amöbe | Bass aus Zufall – jede Welle anders, der Ton bleibt | dunst | haelt | true | W `myzel-gendy` | 0.35 / 0.9 | tie | 0 | amo.zeit, amo.punkte | Unruhe |
| rnk | Ranke | Ein Ring aus Massen, den der Finger anstößt | holz | beides | true | W `myzel-scan` | 0.4 / 0.55 | neb | 0 | rnk.feder, rnk.daempfung | Hammerbreite |
| shn | Sehne | Lebende Saite – Handkante, Flageolett, E-Bow, Steg | holz | beides | true | W `myzel-string` | 0.6 / 1.2 | sai | 0 | shn.ebow, shn.daempfung | Hand |
| zpf | Zapfen | Kratzen, das zum Ton wird – Rhythmus unter dem Finger | holz | beides | true | W `myzel-scrape` (+ native) | 0.45 / 0.85 (native 0.2) | native | 0 | zpf.rast, zpf.klang | Kratzrate |
| elm | Elmsfeuer | Brummen, Knistern, Lichtbogen – der Zap im Puls | luft | beides | true | N | 0.7 / 1.35 | – | 0 | elm.spannung, elm.knistern | Spannung |
| mdr | Moder | Kompostglocke – Glanz zerfällt zu Knistern, Brummen | erde | schlaegt | false | W `myzel-rot` | 0.55 / 0.9 | glo | 1 | mdr.pilz, mdr.knistern | Feuchte |
| gsp | Gespinst | Ein Netz aus Saiten, das Finger und Puls teilen | erz | schlaegt | false | N voice + W singleton `myzel-web` | 0.4 / 0.6 + web 1.65 / 2.5 | sai | 1 | gsp.kopplung, gsp.nachklang | Zupfhelligkeit |
| jrg | Jahresring | Holzstab – wo du triffst, bestimmt den Klang | holz | schlaegt | false | N | 0.65 / 1.3 | – | 1 | jrg.schnitt, jrg.holz | Treffpunkt |
| khl | Kehlchen (R1) | Vogelkehle – Lippen, die ab einer Schwelle singen | luft | haelt | true | W `myzel-syrinx` | 0.4 / 0.7 | swm | 0 | khl.druck, khl.rauheit | Lippenspannung |
| rhz | Rhizom (R2) | Ein Schlag läuft durch die Skala – Lawinen im Netz | erde | schlaegt | false | N + JS tick net | 0.3–0.65 / 1.0 | – | 1 | rhz.reiz, rhz.weg | Ausbreitung |

`GROUP` entries (APP 1950): same German names. `ENG_OPTS` is re-sorted by family (§4.2). Loudness references: peak constants of the 14 engines (APP, code-map §4): neb 0.48, hau 1.0, glo 0.42, mem 0.62, sai 1.5, sch 0.55, obt 0.105; the acceptance test compares RMS of a standard phrase against neb/glo/mem (§7.1).

---

## 2. Shared worklet module `MYZEL_DSP_SRC`

### 2.1 Loading

```js
const DSP = { url: null, ok: false, pending: null, failed: false };
const WORKLET_ENGINES = new Set(['hrz','hlm','glt','boe','amo','rnk','shn','zpf','mdr','gsp','khl']);
function dspWanted() {                       // any worklet engine selected or restored
  const ks = [P['v.eng'], P['v.layer'], P['l0.eng'], P['l1.eng'], P['l2.eng'], P['l3.eng'], GK.p && GK.p.rgS];
  return ks.some((k) => WORKLET_ENGINES.has(k));
}
async function ensureDSP(ctx = A.ctx) {      // idempotent per context; called from onParamChanged, loadValues, kqHear, initAudio (if dspWanted())
  if (!ctx || !ctx.audioWorklet || !window.AudioWorkletNode) { A.workletOK = false; return false; }
  if (ctx.__dsp) return ctx.__dsp;           // offline contexts in tests get their own load
  ctx.__dsp = (async () => {
    const urls = [];
    try { urls.push(new URL('myzel-dsp.js', document.baseURI).href); } catch (e) {}   // sibling file (CSP without blob:), optional
    try { urls.push(URL.createObjectURL(new Blob([MYZEL_DSP_SRC], { type: 'text/javascript' }))); } catch (e) {}
    for (const u of urls) { try { await ctx.audioWorklet.addModule(u); if (ctx === A.ctx) A.workletOK = true; return true; } catch (e) {} }
    if (ctx === A.ctx) { A.workletOK = false; toast('Dieser Browser spielt die neuen Quellen vereinfacht (kein AudioWorklet).'); }
    return false;
  })();
  return ctx.__dsp;
}
```
- `MYZEL_DSP_SRC` also registers `myzel-tap` (the current `TAP_SRC` body); `setupCapture()` (APP 5168) uses `ensureDSP()` first and keeps its ScriptProcessor fallback for recording only.
- `playNote` (APP 5013): `if (E.needs === 'worklet' && !A.workletOK) eng = E.fallback === 'native' ? eng : E.fallback;` – the voice's `v.eng` stays the requested key for the UI; `E.start` of a native-fallback engine checks `A.workletOK` itself (zpf, glt).
- iOS: `addModule` is awaited outside the gesture handler (webaudio.md §9); the module reads `sampleRate` and never bakes tables to 48 kHz.
- Chrome in an iframe (`window.top !== window`): one toast „Im eigenen Tab öffnen – dort läuft der Klang auf dem Echtzeit-Thread“ the first time a worklet engine is selected (A).

### 2.2 Module scope (built once per context)

```
SIN  = Float32Array(4097)        // sin table, linear interpolation, phase in [0,1)
TANH = Float32Array(2049)        // tanh(x) for x in [-8, 8], clamp outside
POW4 = Float32Array(1025)        // bow table: (x + 0.75)^-4 for x in [0, 16] → clamp to [0.01, 0.98]
EXP2 = Float32Array(1201)        // 2^(c/1200) for c in [-600, 600] cents (detune/glide), beyond: Math.pow
NOISE = Float32Array(65536)      // white, built with xorshift32 seed 0x9E3779B9
ICDF_CAUCHY / ICDF_LOGIST = Float32Array(1025)   // inverse CDF tables (Amöbe), normalised (c = atan(10a) scaling applied at use)
class PRNG { constructor(seed) ; next() → [0,1) }                    // xorshift32, one per node, seeded from (f, vel, counter)
class Reso { set(f, t60) ; tick(x) }                                // complex rotation: re' = re*c - im*s + x, im' = re*s + im*c, *r ; r = 0.001^(1/(t60*SR))
class FracDelay { constructor(maxLen) ; write(x) ; readL(d) ; read3(d) } // ring buffer; linear and Lagrange-3; d in samples ≥ 2
class OnePole { set(coef) ; tick(x) }                               // y += coef*(x - y)
class DcBlock { tick(x) }                                           // y = x - x1 + 0.995*y1
class Allpass1 { set(a) ; tick(x) }                                 // y = -a*x + x1 + a*y1
class Biquad { bp(f, bw) / peak(f, q, dB) ; tick(x) }               // direct form II transposed, doubles in locals
```
Cost rule: ≈ 5 ns per resonator-sample, ≈ 30 ns per biquad-sample, ≈ 0.5–0.6 ns per flop (M). Copy state into locals at block start, write back at block end (typed-array state in the inner loop is 8× slower, M).

### 2.3 Processor contract

```
class MyzelProc extends AudioWorkletProcessor {
  static get parameterDescriptors() { return [
    { name: 'freq',   defaultValue: 220, minValue: 16, maxValue: 8000, automationRate: 'k-rate' },
    { name: 'detune', defaultValue: 0, minValue: -4800, maxValue: 4800, automationRate: 'k-rate' },   // v.mod() → KR() makes it k-rate anyway
    { name: 'hoehe',  defaultValue: 0.5, minValue: 0, maxValue: 1, automationRate: 'k-rate' },
    { name: 'p1', ... }   // at most one engine-specific param (optional)
  ]; }
  constructor(o) { super(); const po = o.processorOptions; /* preallocate all state from po: body tables, K, seed, SR-dependent sizes */
    this.q = []; this.port.onmessage = (e) => this.q.push(e.data); this.off = false; this.silent = 0; this.done = false; }
  process(inputs, outputs, params) {
    const out = outputs[0], L = out[0], R = out[1] || null, n = L.length;        // never hard-code 128
    // 1. messages: {on:t,f,y,vel,gate,burst,seed,...} {off:t,k} {set:{...}} {clear} – frame offset = clamp(round((m.t - currentTime)*sampleRate), 0, n-1)
    // 2. per-block coefficients from k-rate params: fTarget = freq * EXP2(detune); internal one-pole glide of f (τ 5–20 ms) to avoid steps
    // 3. engine loop over n samples with locals; detune changes inside the block are not needed (k-rate)
    // 4. guards: if (!(acc === acc) || Math.abs(acc) > 1e3) this.reset();   (NaN/Inf → reset state, keep running)
    //            per block: every feedback state with |x| < 1e-18 → 0
    //            output soft-clip through TANH when the engine has gain > 1 anywhere
    // 5. silence: blockRMS < 1e-5 for 8 consecutive blocks after off → postMessage({done:1}) once; return false (collectable)
    return !(this.off && this.silent > 8);
  }
}
```
Engine side pattern (webaudio.md §10):
```js
const node = v.n(new AudioWorkletNode(A.ctx, 'myzel-xyz', { numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [Q.rich ? 2 : 1], processorOptions }));
v.mod(node.parameters.get('detune'));                    // Bebung, vibrato, pitch wheel, Gestik Tonhöhe
node.connect(v.out);
node.parameters.get('freq').setValueAtTime(f, t); node.parameters.get('hoehe').setValueAtTime(y, t);
node.port.postMessage({ on: t, f, y, vel, gate: o.burst ? o.gate : 0, seed: (Math.random() * 2 ** 31) | 0 });
node.port.onmessage = (e) => { if (e.data.done) v.finish(A.ctx.currentTime + 0.05); };
v.setF = (nf, glide) => glideTo(node.parameters.get('freq'), nf, glide);        // APP 2140: tc = max(0.004, glide/3)
v.setY = (ny) => setP(node.parameters.get('hoehe'), ny, 0.04);                   // Höhe arrives up to 30×/s (APP 9780)
v.release = (k) => { node.port.postMessage({ off: A.ctx.currentTime, k }); sustainRelease(v, rel)(k); };
node.onprocessorerror = () => { v.cleanup(); A.workletBroken.add('xyz'); };      // engine hidden for the session
```
Clicks: every processor ramps its own output over 5 ms at `on` (from the previous tail) and at `clear`; `v.out.gain` envelopes do the rest. `finish()` disconnects after `endAt + 150 ms` (APP 3466).

### 2.4 Cost accounting and calibration
- `VCOST1/VCOST3` entries from the bench (§7.1), +15 % margin. `calibrate()` (APP 5049) stays Nebel-only; worklet engines are relative constants, measured offline with the same method (offline contexts render on an `OfflineAudioWorkletThread`, V).
- `voiceLoad()` (APP 5012) → `let c = A.gsp && A.gsp.active ? A.gsp.cost : 0; for (...) c += v.cost; return c;`.
- **As built (final calibration, 18.10.2026, quiet machine):** `klang/tests/recal.js` – cost.js (24 voices against 24 Nebel voices, scaled by the median of eight held native references), two runs each over every body, bridge, pipe and syllable and the native stand-ins, the highest + 15 %. VCOST1 / VCOST3: Halm Rohrblatt 0.68 / 1.15, Flöte 0.88 / 1.59, Flamme 1.63 / 2.93; Ranke 0.63 / 1.07; Harz 1.71 / 3.85 (Stab the dearest at level 1, Glas at level 3); Elmsfeuer 1.09 / 2.51; Jahresring 1.13 / 2.67 (Winter); Moder 0.84 / 1.67; Böe 0.69 / 1.11; Amöbe 0.47 / 1.34; Gespinst voice 0.34 / 1.01, web 2.47 / 3.11; Sehne 0.78 / 1.49, in the E-Bow's zone 1.08 / 2.11 (Jawari the dearer bridge); Zapfen 0.88 / 1.49, native 1.38 / 2.00 (Holz, Panzer); Glut 0.86 / 1.58, native 1.12 / 2.06; Kehlchen 0.84 / 1.53 (Triller); Rhizom 0.71 / 1.38 for a voice with one ping, + 0.33 / 0.44 for each ping ringing beside it. The two runs of an entry now agree within ≈ 10 %; the earlier entries (measured while builders ran) were up to 1.7× off either way. Two method fixes: Gespinst's web is measured as 24 webs (one web alone carried the worklet's fixed share of the render ×24: 3.7–5.0 units); Rhizom's voices end with their cascade, so a 3-s window priced them by a third of their life (0.29) – its entries come from a window the voices live through (`rhz-pings.js` counts the ringing pings: one ping against ≈ 3.5 per voice at Reiz 1, Erholung 0.1).
- **Re-measured in the Hexenring's final pass (21./22.10.2026, same machine, nothing else running):** Glut's native loop under-covered its table on this machine (bench.js 1.22–1.29 against 1.12): cost.js three runs – the worklet loop 0.76–0.83 / 1.42–1.52, the native loop 1.22–1.28 / 1.81–1.86 – entered `GLT_COST` 0.96 / 1.74, native 1.48 / 2.13 (highest + 15 %). Rhizom refit (`rhz-fit.js`, five settings, the player's net and a net per voice as a nourishing loop's): the long-ping law under-priced the default Glimmen by up to 37 % at level 3 – a short ping costs its start; now `RHZ_COST` base 0.36 / 0, per ping ringing 0.24 / 0.51, and gl 0.088 / 0.646 ÷ τ^0.8 / τ^0.6 (τ = Glimmen × the body's decay), priced 1.15–1.42 × measured over all settings; VCOST = one ping at the current Glimmen (default 1.08 / 2.82).
- Underruns: existing `watchUnderruns()` (APP 18940) scales the budget ×0.8 and sets `A.lite`; processors read `lite` via `{set:{lite:1}}` and drop to fewer modes (hrz 3 modes, boe 6, mdr 6, gsp 6 strings).

---

## 3. Engines

Conventions per engine: **f** = note frequency (Hz) after `v.oct`/`v.deg`; **y** = finger height 0..1 (Gestik Höhe offsets arrive through `setY`, ±half the field, APP 9444); **vel** 0..1; **burst** = `o.burst` with `o.gate` (0.22 s from `hit()`, `stepDur·0.9` from lanes, APP 5083/5980); **L3** = `Q.rich`. Param ids `<key>.<name>`; curves `lin|exp|sq`; defaults must sound finished without effects. Each param is automatically a MIDI target (`mtParam`, APP 6956).

### 3.1 hrz Harz – `myzel-bow` (banded waveguide + bow table)

**Signal flow.** K banded modes (L1 K = 4, Zunge 3, Teich 4; L3 K = 8 with doublets ±0.4 %): each mode k = 2-pole bandpass (radius 1 − π·32/SR, centre f·r_k) + fractional delay D_k = SR/(f·r_k) − τ_bp(k) (group delay of the bandpass at its centre, computed analytically from the pole) + loop gain g_k. Bow: Δv = v_bow − Σ_k g_k·d_k.read(); F = Δv·bow(Δv); per mode in_k = K_c·F·w_k + g_k·d_k.read(); s_k = bp_k(in_k); d_k.write(s_k); y_out = Σ o_k·s_k. Output = TANH(y_out·gain + harz·F·(0.3 + 0.7·p)·0.5). (V: STK BandedWG structure, synthesis.md §2.10; M: bow_check.js.)

**Per sample (pseudo):**
```
dv = vBow + 0.002*p*NOISE[ni++] - sumPrev
x  = abs(dv) * slope                       // slope = 10 - 9*p   (V STK/Faust)
bt = POW4[x] (clamped 0.01..0.98)          // (x + 0.75)^-4
F  = dv * bt * Kc                          // Kc contact 0..1, 20 ms ramps at on/off
sum = 0; yo = 0
for k: r = g[k]*d[k].read3(D[k]); s = bp[k].tick(F*w[k] + r); d[k].write(s); sum += g[k]*s; yo += o[k]*s
sumPrev = sum
out = TANH(yo*gain + harz*F*fr)
```
- **Bodies** (`hrz.koerper`): `glas` 1, 2.32, 4.25, 6.63 (L3 +9.38) (V Rossing/STK); `schale` L1 1, 2.986, 5.704, 8.998, L3 doublets 0.9961/1.0039, 2.979/2.993, 5.704/5.704, 8.998/9.015 (V STK Tibetan Bowl); `stab` 1, 2.756, 5.404, 8.933 (V STK Uniform Bar; loop gain must stay ≥ 0.98, the STK 0.9/period never speaks, M); `zunge` cantilever 1, 6.27, 17.55 (L3 +34.4) (A, Euler–Bernoulli βL 1.875/4.694/7.855) + two native peaking biquads after the node: F1 500 Hz, F2 1400 Hz, Q 4, +9 dB, and a 3.5 kHz lowpass („Holz“); `teich` 4 rods: 1, 1.031 (second rod, seeded per note ±3 %), 6.27, 17.55, T60 ×2, plus native peaking 180 Hz Q 2 +6 dB (A, tune by ear).
- **Excitation weights** w_k = 1, 0.5, 0.3, 0.2, 0.15, 0.12, 0.1, 0.08 (M: without them mode 2/3 wins); output weights o_k = 1, 0.7, 0.5, 0.4, …; **no /N division** of the bow force (M: STK coupling gives 1–2 s onsets).
- **Pressure** p = (0.15 + 0.55·y)·(0.6 + 0.8·druck) clamped 0.1..0.75 (M: p ≥ 0.8 chokes); **bow speed** vBow target = (0.08 + 0.14·vel)·(0.6 + 0.8·bogen), inertia v += 0.0005·(target − v) per sample (STK 0.9995), direction constant. y > 0.9: vBow target ×1.8 (Dauerschlupf, roughness via F path). `harz` mixes F into the output 0..0.5.
- **Loop gain** g_k = 10^(−3/(T60·f·r_k)) with T60 = 0.4 + 6·daempfung^2·(1 − 0.3·(k−1)/K) s → g in 0.98..0.9995.
- **Tuning**: per-mode cent correction table `BOW_CENT[k][octave]` from the acceptance bench (M: +2..+12 ct uncorrected); initial values 110 Hz +11, 220 +5, 440 +3, ≥ 880 +3 ct → D_k ×= EXP2(−c).
- **f / setF**: `freq` glides; D_k recomputed per block and lerped per sample (zipper-free glissando). **detune**: multiplies f. **setY**: p.
- **on**: Kc ramps 0→1 in 20 ms; pluck seed: one period of lowpassed noise ×0.5·vel·w_k written into each delay (modes speak within the first period). **vel**: bow speed + seed amplitude.
- **burst**: Kc = 1 for gate·0.8 then 0 (bow lifts), seed amplitude ×3 for gate < 0.3 s; `burstEnv(v, t, peak·(gate < 0.3 ? 2 : 1), 0.005, gate, min(T60, 3)·(o.decayMul||1))`.
- **release**: `{off}` → Kc → 0 in 20 ms, modes ring at g_k (M: with the bow left on, STK damps everything in 100 ms); `sustainRelease(v, min(T60, 4))`.
- **L3**: 8 modes incl. doublets, odd modes L / even R (stereo output), second bow noise seed.
- **Anti-runaway**: bow table ≤ 0.98, g_k < 1, TANH on output, NaN guard. **Anti-click**: Kc ramps, seed is lowpassed.
- **Peak target**: `v.out.gain` peak = vel·0.55 (reference sch 0.55); internal gain normalised so that a sustained Glas note at p 0.45 has RMS −18 dBFS before `v.out`.
- **Cost**: 1.05 (4 modes 104 ns/sample M + node + 3 params); L3 1.75.
- **Params (6):** `hrz.koerper` SEL glas/schale/stab/zunge/teich (glas, chips) · `hrz.druck` 0–1 (0.5, %) · `hrz.bogen` 0–1 (0.5, %) · `hrz.daempfung` 0–1 (0.4, %) · `hrz.schwebung` 0–1 (0.3, %; L1: slow ±3 ct random walk per mode at 0.1 Hz ×schwebung, L3: doublet spread 0..0.8 %) · `hrz.harz` 0–1 (0.3, %). MACRO druck/harz.
- **Höhe (Gestik)**: forward tilt = more pressure (towards roughness); Bebung = vibrato on glass. **Puls**: strokes with seed, good at ≥ 1/8 at 120 bpm; faster lanes become plucked modes (intended). regen 0.
- **Presets**: Glaswiese (§5).
- **Acceptance**: f0 |err| ≤ 5 ct at 110/220/440/880/1568 Hz for all bodies after correction; t90 ≤ 0.8 s held (p 0.45); mode 1 dominant (mode 2 ≤ −20 dB) at p 0.2–0.7; h2/h3 of the output rise monotonically with y (F path); burst 112 ms ≥ −20 dB rel. held RMS; after release ring T60 within ±30 % of the Dämpfung mapping; no NaN; peak ≤ −1 dBFS; cost ≤ 1.2 / 2.0; L3 within ±1.5 dB; dice(): no silent corner (y 0 → flautando audible ≥ −35 dB).
- **As built (stage 3):** the banded waveguides and the bow table above, with every acceptance row met and the check's fixes; the measured changes of letter (in-band onset seed, the band's group delay in the loss, the bow's contact fixed with the pattern turning past the listeners, measured bowl ratios, the friction path's level and colour, a rough contact, the Teich's scream and water, no second tongue) – see `dev/HANDOFF.md` „Notes from stage 3“.

### 3.2 hlm Halm – `myzel-blow` (reed, flute, flame)

**Reed (default, V STK Clarinet; M blow_check.js):**
```
bore = d.read3(D)                          // D = SR/(2 f) - 1.5 (M: 0–1 ct)
refl = -0.95 * lp.tick(bore)               // lp coef 0.55 + 0.4*mund
dp   = refl - pA                           // pA = P * (1 + 0.15*lpn(noise))  breath with 15 % lowpassed noise
r    = clamp(0.7 - 0.3*dp*stiff, -1, 1)    // stiff = 0.6 + 0.8*blatt
d.write(dc.tick(pA + dp*r))
out  = bore*0.9 + air                      // air = bpAir(noise)*luft*max(0, 0.28 - P)*4  (outside the loop: 'Luft' regime)
```
- **Breath** P(y) piecewise: y < 0.3 → 0.02 + 0.5·y (0.02..0.17, below the measured threshold 0.15); y ≥ 0.3 → 0.17 + 1.3·(y − 0.3) → max 1.08 (M: choke above 1.2) ×(0.7 + 0.6·atem) clamped ≤ 1.15. y ≥ 0.92: „Quietschen“ = stiff ×0.5 + noise ×3 (explicit effect, not physics).
- **Tongue**: on = P steps with 1 ms ramp + 8 ms noise burst (zunge → burst level and 4–12 ms); **vel**: tongue hardness and P ×(0.8 + 0.3·vel).
- **burst**: P = 0.85 (sweet spot) for the gate regardless of y, then 0 (M: decay 5–55 ms); gates < 60 ms add an impulse click; `burstEnv(v, t, peak, 0.002, gate, 0.08)`.
- **release**: `{off}` → P → 0 over 15 ms; `sustainRelease(v, 0.08)`.
- **Flute** (`rohr = floete`, ships only if §7 passes): bidirectional open pipe (two delays head/foot, D/2 each), jet delay J = D·j_reg, embouchure nonlinearity jet(x) = clamp(x·(x² − 1), −1, 1), register table `FL_TAB[register][octave] = {j, cent}` from the bench (M: pitch moves ±240 ct with J; registers 1×/2× for the open pipe); pitch ceiling 1.1 kHz, above it the processor crossfades to the reed nonlinearity (A). Breath window 0.9–1.5 mapped from y.
- **Flame** (`rohr = flamme`, Rijke tube, A, ships only if §7 passes): open pipe D, heat-release nonlinearity at the D/4 tap: h(u) = heat·TANH(2u)·(1 + 0.3·lpn(noise)), heat = 0.3 + 1.2·P (threshold on P), crackle = dead-zone impulses on the noise ×luft. Expected: threshold, irregular bursting, overblow – audition early.
- **L3**: second bore ±4 ct, R channel, shared breath.
- **Guards**: r clamped, losses < 1 → bounded by construction; DC blocker in loop; TANH on output for the flame.
- **Peak**: `v.out.gain` peak = vel·0.9 (reference hau 1.0).
- **Cost** 0.45 / 0.8 (M: 29–34 ns/sample loop).
- **Params (6):** `hlm.rohr` SEL rohrblatt/floete/flamme (rohrblatt) · `hlm.atem` 0–1 (0.5) · `hlm.mund` 0–1 (0.4) · `hlm.blatt` 0–1 (0.5) · `hlm.luft` 0–1 (0.4) · `hlm.zunge` 0–1 (0.5). MACRO atem/blatt.
- **Höhe**: breath (air → tone → choke); tilt forward = more breath with Ocarina vibrato (existing Gestik). **Puls**: tongue strokes; bass notes speak slowly (M: 235 ms at 110 Hz) → lanes below 110 Hz are soft, documented. regen 0.
- **Acceptance**: threshold between y 0.2 and 0.35 (RMS jump ≥ 20 dB); f0 ≤ 5 ct (reed) 110–2500 Hz; t90 ≤ 250 ms at 110 Hz, ≤ 100 ms at 440 Hz; decay ≤ 60 ms; air at y 0 ≥ −40 dB; burst 60 ms ≥ −20 dB; odd harmonics dominate (h2 ≤ h3 − 20 dB); flute: f0 ≤ 10 ct in registers 1 and 2 at 220–880 Hz, else the option is hidden; cost ≤ 0.55.
- **As built (stage 4a, Flöte and Flamme):** both pipes ship – the flute within 0.4 ct in three registers (an FLL keeps it in tune; the 1.1-kHz ceiling and the crossfade to the reed were not needed: register 1 reaches 2.6 kHz), the flame as a Rijke tube by King's law heard from both ends, threshold at y ≈ 0.33, the surge at the threshold, overblowing by a flare, the fire and its cracks beside the tube; release 0.8 s for the flame. Measured changes of letter – see `dev/HANDOFF.md` „Notes from stage 4a“.

### 3.3 glt Glut – `myzel-ember` (tuned feedback loop) + native fallback

**Loop (per sample):**
```
x = d.read3(τ)                             // τ = SR/f - τ_bp - τ_interp (compensated); Lagrange-3
x = bp.tick(x)                             // 2-pole bandpass at m*f, Q 8 + 12*hitze, peak gain normalised to 1
x = TANH(h*(x + bias))/h                   // h = 1 + 4*hitze ; bias = 0.05*(sprung==2) seeds even modes
x = G*x + klopfer + zunderFloor            // G = exp(r/SR) per sample growth; klopfer = noise burst at on; floor -70 dB noise
d.write(dc.tick(x))
out = hpKasten(lpKasten(x)) * 0.3
```
- **Growth per second** r(y) (nepers/s, M: 16× pitch dependence otherwise): y 0 → −6, y 0.3 → 0 (threshold), y 0.6 → +8, y 1 → +12; scaled by (0.5 + gluehen); loop loss (bandpass peak, interpolation) compensated analytically so G·|H| = exp(r/SR) exactly at the mode. Clamp G ≤ 1.5.
- **Glimmen**: random walk on r (±1.5/s, 0.2–1 Hz) and τ (±2 ct) – always on (M: settled state is a static sine without it).
- **Sprung**: y ≥ 0.75 → m = sprung (2 or 3), y ≥ 0.9 → m = 3; bandpass centre glides over 60 ms.
- **on**: klopfer = noise burst 5–20 ms × (0.2 + 0.8·zunder)·vel; y = 0 is a soft pinged tone (dice safety).
- **burst**: inject loop state (one period sinusoid at f, amplitude 0.5·vel, written into the delay) + r = +10/s for the gate, then afterglow r = −6.9/nachgluehen; `burstEnv(v, t, peak, 0.003, gate + nachgluehen, 0.3)` (afterglow lives in the loop).
- **release**: `{off}` → r = −6.9/nachgluehen (T60 = nachgluehen); engine-side: `v.released = true; v.out.gain.setTargetAtTime(0, t + nachgluehen, 0.15); v.finish(t + nachgluehen + 0.8)`.
- **L3**: two loops L/R ±5 ct with 10 % cross-coupling, clipper 2× oversampled (JS half-band).
- **Native fallback** (`A.workletOK === false`, from kre): DelayNode τ_n = n/f with n = ceil(128·f/SR) (cycle floor one quantum, V spec) → BQ bandpass (f·m, Q ≥ 12) → WaveShaper tanh (oversample 'none') → Gain G(y) via `setP` → back; `A.pitchMod` → Gain(−τ_n·ln2/1200) → `delayTime` (Bebung) and `v.mod(bq.detune)`; klopfer noise burst; no Glimmen/injection; cost 0.35; usable to ~2 kHz.
- **Guards**: TANH bounds amplitude; DC blocker + HP in loop; NaN reset; output ×0.3 (limit cycle ≈ 0.97 peak).
- **Peak**: `v.out.gain` peak = vel·0.55.
- **Cost** 0.45 / 0.9.
- **Params (6):** `glt.gluehen` 0–1 (0.5) · `glt.nachgluehen` 0.2–6 s (1.5, exp) · `glt.zunder` 0–1 (0.4) · `glt.hitze` 0–1 (0.5) · `glt.sprung` SEL 2/3 (3, chips) · `glt.kasten` 0–1 (0.5; LP 1.5–8 kHz, HP 60 Hz). MACRO gluehen/hitze.
- **Höhe**: loop gain and mode; tilt forward = flare, back = fade; Bebung = vibrato on feedback. **Puls**: state injection makes hits land on the frame; long gates = swelling chords. regen 0.
- **Acceptance**: growth dB/s at y 0.6 within ±25 % from 55 to 1760 Hz; afterglow T60 = nachgluehen ±20 % across octaves; y 0 ≥ −40 dB; burst 112 ms at 55 Hz ≥ −20 dB inside the gate; f0 ≤ 8 ct incl. under ±50 ct Bebung (bandpass and delay move together); peak after `v.out` ≤ −1 dBFS at any y/hitze; native fallback f0 exact; cost ≤ 0.55.
- **As built (stage 5, Glut):** one delay of one period, a band-pass on the mode, a tanh and a gain – the whole loop scaled exponentially in time, so Höhe's growth per second is the same at every pitch (69.5–71.8 dB/s at 55–1760 Hz for r 8, theory 69.5); the tanh's effect on the fundamental divided out (it only colours: Hitze), the level settling at σ = r − c·A² (a soft knee, the same at every pitch; a tanh alone left high notes ≈ 10 dB lower); Glimmen always on, Nachglühen exactly the afterglow's T60; Sprung: the band jumps and the old mode rings out beside the loop for 35 ms while the new one is seeded (SPEC's 60-ms glide left a 28–83 dB hole); level 3 two loops ±5 ct coupled by a lossless rotation, the right one seeded a quarter period late; no oversampled clipper (folding ≤ −57 dB). Its own native loop (delay, band-pass, tanh, gain per pass, the same knee and Glimmen; Chromium's feedback loop is one render quantum longer than delayTime – probed once – and its linear interpolation's loss made up). Bench: every row for both loops (growth 55–76 dB/s, afterglow T60 within ±4 %/+10 %, settled level ±0.6 dB across pitches, f0 ≤ 1.4 ct, loudness −20.0); cost (final calibration, quiet machine) loop 0.68–0.75 / 1.34–1.38, native 0.89–0.97 / 1.70–1.79 – GLT_COST 0.86 / 1.58, native 1.12 / 2.06 (final pass: 0.96 / 1.74, native 1.48 / 2.13 – §2.4). For the ear: swell speed, breathing, the jump's crossfade, knock vs ping; Puls sixteenths with a 1.5-s afterglow pile into a glowing wash (Nachglühen as SPEC says).

### 3.4 boe Böe – `myzel-aeol` (aeolian harp with one-mode capture)

- **Strings**: K = 8 `Reso` at k·f (L3 14), T60_k = nachklang·(1 − 0.5·(k−1)/K)·(1 − 0.6·dunkel·(k−1)/K), excitation normalised g_k = sqrt(1 − r_k)/sqrt(k) (noise-driven RMS ∝ 1/sqrt(1−r), M/A).
- **Wind**: w = y·(0.5 + wind) + walk (±0.15, orbit 5–20 s) + gust (random every 2–8 s ×boeen, decays 0.5 s); f_shed = f·(0.7 + 7·w).
- **Capture state machine** (per block): k* = round(f_shed/f) ∈ 1..K; dev = |f_shed/(k*f) − 1|; band = 0.06 + 0.19·fang. If not captured and dev < band → captured = k*, pull f_shed_eff = k*f (lock-in); while captured: release when dev > 1.6·band (hysteresis) → captured = 0. Excitation e_k = (k === captured ? 1 : k === captured ± 1 ? 0.1 : 0) + (k === 1 ? 0.12 : 0) (fundamental floor, musical liberty).
- **Per sample**: `n = NOISE[ni++]; wind = windReso.tick(n)*rauschen*0.3 (Reso at f_shed_eff, T60 20 ms); out = wind + Σ_k reso_k.tick(n*e_k*g_k*drive)`; stereo L3: odd L / even R.
- **on**: gust = vel (initial gust); **burst** (gust-pluck): drive ×12·vel during the gate, f_shed parked on k = 1 + round(5·y), impulse n·0.3·vel into all modes at onset, T60 capped 1.5 s, `burstEnv(v, t, peak, 0.005, gate, min(2, nachklang))` (M: otherwise 8 hits/s × 5.5 s life = 30 units).
- **release**: wind → 0 over 0.3 s; strings ring; `sustainRelease(v, min(nachklang, 4))`.
- **setF**: strings retune (Reso coefficients per block, phase-continuous). **detune**: all strings. **setY**: w.
- **Guards**: no feedback; denormal flush; r_k < 1.
- **Peak**: `v.out.gain` peak = vel·0.45 (noise-driven, measured RMS ≈ obt class).
- **Cost** 0.7 / 1.2 (wind band reuses `Reso`).
- **Params (6):** `boe.wind` 0–1 (0.4) · `boe.boeen` 0–1 (0.4) · `boe.nachklang` 0.5–6 s (3, exp) · `boe.rauschen` 0–1 (0.3) · `boe.fang` 0–1 (0.3) · `boe.dunkel` 0–1 (0.3). MACRO wind/fang.
- **Höhe**: wind strength = which string captures; tilt forward = storm. **Puls**: gust-pluck. regen 0.
- **Acceptance**: capture event: when f_shed crosses k·f, mode k energy rises ≥ 10 dB within 150 ms; between harmonics excitation drops ≥ 15 dB but output ≥ −45 dB rel. peak (fundamental floor); after release ring ≥ 1 s at nachklang 3; burst 220 ms ≥ −20 dB; level across y within ±4 dB; cost ≤ 0.8.
- **As built (stage 4, Böe):** 8 strings at k·f (L3 14, the odd left, the even right), a capture state machine (band 0.06 + 0.19·Fang, hysteresis 1.6) whose caught string grows by lock-in to a target with a slow ±50 % swell (noise drive alone dipped > 10 dB and wandered ±12 ct at 55 Hz; now ≤ 1 ct), −20 dB leak to neighbours, wind band 40 Hz + 12 % with a DC zero, soft broadband air; touch gust 0.4·vel, Puls gust ×12·vel over 0.2 s plus a pluck impulse 4·vel·k^−0.8; release six times slower than the ring, the processor ends the voice. Bench 30/30: loudness −21.3 (L3 +0.4), pitch worst 1.2 ct, capture rise 16.6–32 dB, Höhe moves the capture +20.7 dB in 0.3 s. Default Nachklang 3 s kept (KONZEPT says 4–6 s: the owner's call).

### 3.5 amo Amöbe – `myzel-gendy` (pitch-locked GENDY)

- **State**: K ≤ 24 breakpoints (amp_i ∈ [−1,1], dur_i), seed polygon amp0_i from vel (|amp0| up to 0.3 + 0.7·vel), amp_0 pinned to 0. Per period T = SR/f_eff: K_eff = min(punkte, floor(T/6)) (≥ 6 samples per segment, M); for i in 1..K_eff: `amp_i = mirror(amp_i + a·D() + rueck·0.1·(amp0_i − amp_i), −1, 1); dur_i = mirror(dur_i + d·D() + rueck·0.1·(dur0_i − dur_i), 0.05, 1)`; renormalise Σdur = 1 (Gendy3 pitch lock, V sc_GendynUGens.cpp). a = 0.01·30^y (0.01..0.3), d = 0.3·zeit. D() from `verteilung`: linear U(−1,1); cauchy = ICDF table with c = atan(10a) scaling (SC's normalised Cauchy); logist; sinus = previous period's neighbour value.
- **Per sample**: linear interpolation between breakpoints at phase φ ∈ [0,T); per-period RMS normalisation with slew (target −12 dBFS, max ±6 dB/period); DcBlock 15 Hz; 1-pole LP at min(8f, 0.4·SR). L1 no oversampling; L3 two amoebas L/R ±3 ct, own seeds, right one Gendy2 (delta random walk), 2× oversampling + half-band.
- **burst**: Zucken = 35 ms window with a×4, d×2, reseed from (vel, PRNG) per hit, then normal; `burstEnv(v, t, peak, 0.005, gate, rel)`.
- **setF**: period changes at the next period boundary (glide via `freq` k-rate + internal 10 ms smoothing). **setY**: a. **release**: `sustainRelease(v, amo.rel)`.
- **Peak**: `v.out.gain` peak = vel·0.5 (reference neb 0.48).
- **Cost** 0.35 (no oversampling, table distributions; M: Math.tan per period alone would cost 0.66) / 0.9.
- **Params (6):** `amo.punkte` 3–24 (12, step 1) · `amo.zeit` 0–1 (0.15) · `amo.verteilung` SEL linear/cauchy/logist/sinus (linear; cauchy = „Ausreißer“) · `amo.rueck` 0–1 (0.3) · `amo.att` 0.005–2 s (0.02, exp) · `amo.rel` 0.05–6 s (0.3, exp). MACRO zeit/punkte.
- **Range**: declared bass (50–500 Hz); presets use `v.oct` −1; library text „lebt unten“. **Höhe**: unrest; shake (Höhe spikes) = bursts that heal. **Puls**: Zucken, every hit differently seeded. regen 0.
- **Acceptance**: f0 lock ≤ 3 ct at zeit 0 (50–500 Hz); DC < 0.01; RMS over 2 s within ±3 dB at y 0.3; above 1 kHz aliasing products ≤ −30 dB (K_eff); two bursts with the same (f, y) have waveform correlation < 0.9; centroid rises with y; peak ≤ −1 dBFS; cost ≤ 0.45.
- **As built (stage 4, Amöbe):** Gendy3 polygon (3–24 points, the first pinned) with per-period random steps pulled back to the note's seed polygon, durations renormalised to the period (pitch locked: ≤ 1.8 ct, ≤ 0.09 ct at Zeit 0); K_eff = min(Punkte, ⌊T/6⌋); distributions from tables (Ausreißer as a clipped Cauchy – SC's form was indistinguishable from linear); per-period level normalisation; polyBLAMP corners (aliasing between harmonics ≤ −38 dB above 1 kHz); unrest a = 0.01·60^y; L3 two amoebas ±3 ct at 2× rate through a 47-tap half-band; Puls and shakes: Zucken (a 35-ms wild run that heals). Bench 40/40: loudness −20.54, centroid 381 → 543 → 670 Hz.

### 3.6 rnk Ranke – `myzel-scan` (scanned synthesis)

- **Ring**: N = 48 masses (L3 96), mass 0 clamped (x_0 = 0, standing waves → hammer position audible; M: a uniform ring makes position a pure time shift). Per update (pitch-synchronous: once per scan period, or every ceil(f/400) periods above 400 Hz so U ≤ 400 Hz): `a_i = ks·(x_{i−1} − 2x_i + x_{i+1}) − kc·x_i − d_i·v_i + F_i; v_i += a_i·dt; x_i += v_i·dt` with dt = 1/U; stability pre-scaled: ks·dt² ≤ 0.9 (A: explicit Euler, max eigenvalue 4ks), d_i = damp·(1 + 0.3·holz·rnd_i), m_i = 1 + 0.1·holz·rnd_i (per-node seed).
- **Scan**: φ += f_eff/SR; read 4-point cubic at φ·N from `x` crossfaded with the previous state (lerp by elapsed fraction of the update interval); DcBlock 20 Hz; LP min(16f, 0.4·SR); gain = fixed by hammer energy at `on` (no AGC, M: pumps); TANH soft clip.
- **Hammer** at `on`: velocity kick v_i += vel·hammerAmp·window(i − p, w) around the fixed position p = N/3 (position is fixed; `rnk.mitte` is the centering spring kc, not a position); width w = 12 − 9·y masses (y low = wide/soft, y high = narrow/hard; clamp w ≥ 3 for aliasing); kick lowpassed by hammer hardness.
- **Held drive**: band-limited random force on 3 masses near p, amplitude 0.08·hammer·vel, updated per physics step (keeps the form moving; M: otherwise dies in seconds).
- **burst**: hammer only, physics tempo ×3 (dt×3 with ks rescaled for stability) so dispersion happens inside 60–120 ms gates; `burstEnv(v, t, peak, 0.003, gate, 0.4)`.
- **release**: drive off, damping ×3; `sustainRelease(v, 0.6)`.
- **setF**: scan rate (exact pitch). **detune**: scan rate. **setY**: hammer width for the next hammer and damping blend (d ×(0.6 + 0.8·(1−y))).
- **L3**: 96 masses, second scan head offset ½ ring → R channel.
- **Guards**: ks clamp, |x| clamp ±4 with soft limit, NaN reset, DC HP.
- **Peak**: `v.out.gain` peak = vel·0.5.
- **Cost** 0.4 / 0.55 (M: scan dominates, physics ≈ 5 ops/sample).
- **Params (6):** `rnk.masse` 0–1 (0.5) · `rnk.feder` 0–1 (0.5) · `rnk.mitte` 0–1 (0.3) · `rnk.daempfung` 0–1 (0.4; decay 0.3–8 s) · `rnk.hammer` 0–1 (0.5) · `rnk.holz` 0–1 (0.3). MACRO feder/daempfung.
- **Höhe**: hammer width/damping (dark-soft → bright-hard). Shake = extra hammers (Gestik Schütteln → `{hammer}` message, 0.3·vel). **Puls**: hammer cascades. regen 0.
- **Acceptance**: f0 ≤ 1 ct; no inharmonic sidebands > −40 dB (pitch-synchronous update); DC < 0.005; held centroid drifts ≥ 15 % within 3 s and stays ≥ −30 dB for 10 s; hammer at y 0.2 vs 0.9 → centroid differs ≥ 30 %; RMS tail monotone (no pumping); peak ≤ −1 dBFS; cost ≤ 0.5.

### 3.7 shn Sehne – `myzel-string` (live bidirectional waveguide)

- **Structure**: two travelling waves v⁺/v⁻ in two segments split at the finger x_f (Lagrange-3 fractional delays, both allocated for 20 Hz at construction); total loop length L = SR/f − τ(bridge LP) − 2·τ(allpass); L target lerped **per sample** (M: per-block steps = 2.7 ms pitch stairs). Bridge: OnePole LP (brightness) + loss g = 10^(−3/(T60·f)) per round trip; nut: −1. Dispersion: 2 × Allpass1 with a = −0.618·d/(0.15 + |d|), d = steifheit (V Rings). Junction at x_f: `s = v⁺ + v⁻; v⁺ −= k·s; v⁻ −= k·s` (damper; modes with a node at x_f survive = physical flageolet). Above 2.5 kHz: single segment, no junction (M: < 8 samples per segment).
- **Pluck**: one period of filtered noise (vel → LP cutoff), combed by pluck position pos (±3 % jitter, per-hit seed), injected into both directions.
- **Hand zones** (y, hysteresis 0.02): 0–0.3 palm: bridge damping T60 ×(0.05 + 0.95·y/0.3); 0.3–0.7 open (pos drifts 0.13 → 0.2); 0.7–0.85 flageolet: x_f = ½ / ⅓ / ¼ by sub-range, k = 0.3·hand, pos clamped ≤ 0.2, zone gain +8 dB (M: 10–15 dB drop otherwise); 0.85–1 E-Bow: tap at bridge → TANH(G·x) → OnePole bandpass at f (2f above y 0.95, Q from vel) → inject at pos with g_eb = ebow·(y − 0.85)/0.15; slow random walk ±0.3 % on the bandpass centre; RMS cap at −6 dBFS inside the processor.
- **Steg** (`shn.steg`): `flach`; `jawari` = curved bridge: delay shortened by the rectified bridge signal (Rings negative dispersion, V mi_rings_string.cc) + one-sided soft contact at the bridge y' = y < h ? y : h + (y − h)·0.2, h = 0.3·peak(on) (A; the bloom = energy pushed into high harmonics while amplitude > h).
- **burst**: pluck + hand damping after the gate (T60 → 0.15 s), short gates = palm-mute riff; lanes clamp y ≤ 0.8 unless gate ≥ 1 s (M: E-Bow drones never finish); `burstEnv(v, t, peak, 0.002, gate, 0.3)`.
- **release**: bridge damping → T60 0.25 s over rel; `sustainRelease(v, 0.25)`.
- **setF**: L per sample; **detune**: L; **setY**: zone.
- **L3**: two strings ±3 ct L/R + body 2 `Reso` (180/420 Hz, T60 80 ms).
- **Guards**: TANH in the E-Bow path, loss < 1 elsewhere, RMS cap, NaN reset.
- **Peak**: `v.out.gain` peak = vel·1.3 (reference sai 1.5, offline KS is hotter).
- **Cost** 0.6 / 1.2 (E-Bow path skipped while g_eb = 0 → 0.5).
- **Params (6):** `shn.daempfung` 0.3–8 s (2.5, exp) · `shn.steifheit` 0–1 (0.25) · `shn.zupfort` 0.05–0.5 (0.13) · `shn.hand` 0–1 (0.5; strength of palm and flageolet zones) · `shn.ebow` 0–1 (0.5) · `shn.steg` SEL flach/jawari (flach, chips). MACRO ebow/daempfung.
- **Höhe**: the hand (palm → open → flageolet → E-Bow); tilt forward = hand up. **Puls**: pluck + gate damp. regen 0 (held). Library: Sehne = „lebendig“, Saite = „viele Stimmen“.
- **Acceptance**: f0 ≤ 3 ct 55–2000 Hz, glide 220→330 Hz over 0.2 s has no step > 5 ct between blocks; palm T60 ≤ 0.15 s at y 0; flageolet: fundamental ≤ −20 dB vs 2f at y 0.75 and level within 6 dB of the open string; E-Bow: level ≥ −12 dB after 4 s at y 0.95, decays within 0.5 s after release; jawari: spectral centroid rises for ≥ 0.5 s after the pluck (bloom) vs flach falling; 16th-note lane at y 0.5 keeps voices finishing (≤ 8 concurrent); peak ≤ −1 dBFS; cost ≤ 0.7.
- **As built (stage 5, Sehne):** two travelling waves on one line pair (written at the nut / the bridge, Lagrange-3 reads, the length per sample); everything on the string – the pluck, the hand's node, the E-Bow's push – in place at its point in both lines, so the point moves without moving the waves. Every acceptance row and the checks' fixes are met (bench `shn`); the measured changes of letter:
  - **Pluck:** an impulse through the touch's two poles ((1 + 2.5·vel²)·f and 400 Hz…18 kHz) plus the per-hit noise at −6 dB, at the pluck's acoustic point (the bridge filters' delay counts as string): noise alone moved the fundamental ±10 dB from pluck to pluck.
  - **Bridge:** the low-pass sets the 5-kHz (at least 3f) ring to 0.2 × Nachklang (0.7 for the jawari); the fundamental's loss from the low-pass and the two reads is given back, so every note 55 Hz–4 kHz rings the Nachklang exactly (above ≈ 4.5 kHz the reads' own loss shortens it). **Stiffness:** four first-order all-passes whose coefficient is solved per pitch for B = 8·10⁻⁴·Steifheit^1.5 at the partial nearest 2.5 kHz (two fixed all-passes stretched h10 at 220 Hz by < 1 ct – no audible „Glanz“); at the shortest loops they give up their delay.
  - **Palm:** the ring shortened geometrically to 0.05× (a linear ramp left the zone's lower half nearly open), darker. **Flageolet:** the node at half the wavelength of the actual (stretched) mode, so the harmonic rings at its open-string rate; zone gains measured +4.6/+5.6/+8 dB (½/⅓/¼; the drop was 4–9 dB, not 10–15).
  - **E-Bow:** loop gain scaled by the period's loss (every pitch held at its own level, ≈ the pluck's at the top), strength 0.35–1 across the zone, a 0.4-s grab (the dying pluck sinks and swells back), the pickup half the bridge filters' delay late (else it pulled 55 Hz by 5.5 ct), the walk ±5 % on the push point and ±0.1 % on the band (±0.3 % pulled the pitch 3 ct), a −50-dB noise floor (it starts a silent string, as a real E-Bow), the faint squeal: some of the limited pickup signal past the band above y 0.97.
  - **Jawari:** not a clip and not a signal-driven delay (the first pumped energy until the ceiling, an in-place contact lost the note 5× faster into the reads' top octave): three normalized-lattice all-passes at the bridge, their coefficient moved by the string's press onto the bridge (its displacement just before it, one side) – lossless at every coefficient; the press scaled per pitch so the bloom lasts 0.55–1.1 s at 55–440 Hz; its mean delay held in the tuning; a loop high-pass at 0.02·f and a second-order one after the loop take the little DC it leaves.
  - **Glide row:** a pitch track cannot resolve 128-sample stairs on a 220-Hz tone (one period ≈ 1.7 blocks); measured instead as their audible result – the read point's jumps (zipper) above 12 kHz while gliding: +3.6…+6 dB per sample vs +33 dB for a per-block length (t-dsp control).
  - **Cost** (final calibration, quiet machine, the highest of the runs): plucked 0.63 / 1.16 flat, 0.68 / 1.29 jawari; under the E-Bow 0.75 / 1.49 flat, 0.94 / 1.84 jawari – VCOST 0.78 / 1.49, and a voice whose hand is in the E-Bow's zone is priced 1.08 / 2.11 while it is there (`SHN_EBOW_COST`, `v.cost` follows `setY`; lanes stay below the zone). (The first figures, 0.68 / 1.20 and 1.13 / 1.93, were taken with other builders running.)

### 3.8 zpf Zapfen – `myzel-scrape` (scrape → tone) + native fallback

- **Teeth**: phase accumulator with rate R(t); tooth i fires when phase crosses; spacing irregular: next interval = (1/R)·(1 + 0.05·schuppen·tab_i) (64-entry seeded table ±1), amplitude a·(1 + 0.3·amp_i); each tooth = 4-sample Hann impulse placed with **sub-sample** offset (8-tap windowed sinc) + 2–6 ms noise burst × kratzen (M: integer placement = ±18–35 ct jitter at 1–2 kHz).
- **Body**: 4 `Reso` (L3 6), T60 = 50 + 350·klang ms, sets: `zapfen` 1, 2.572, 4.644 + hollow 0.5f; `holz` 1, 2.572, 4.644, 6.984 (V Csound wood bar); `panzer` 1, 1.47, 2.09, 2.56 (V Csound wood plate); `kuerbis` 1, 2, 3.01, 4.01 + Helmholtz 0.7f (A); `fels` = stick-slip mode: tooth events replaced by slip events from a hysteretic friction state (stick until force > μ_s, slip for a random 1–3 ms burst, creak clustering at low R; physics normalised to the period; A, from klf).
- **Rate**: R = f·2^(−6 + 6·y) (3 Hz … f); Rast: y ≥ 0.6·(1.3 − rast) → R snaps to f/2^n (n = 0..4 by y) with hysteresis ±8 % and 30–60 ms slew; |dy/dt| adds rate: dead zone 0.02/s, leaky integrator 50 ms, ≤ 0.5·R.
- **detune**: when R > 30 Hz or Rast engaged → modulates R (perceived pitch = R); else → body modes (M). **setF**: f (R and modes). **setY**: R.
- **burst** (Strich): R(t) = R_max·sin²(πt/gate)^(0.5 + strich), R_max = f·2^(−6 + 6y); gates 30–60 ms → 5–10-tick blip; `burstEnv(v, t, peak, 0.002, gate, 0.25)`.
- **held**: continuous teeth; **release**: R → 0 over 0.3 s (coasting), `sustainRelease(v, 0.3)`.
- **Native fallback**: looped 64-tooth impulse buffer (irregularity baked) as `AudioBufferSource` with `playbackRate = R·64/bufLen`, `v.mod(src.detune)` (k-rate, Bebung on rate), 3 biquad bodies (`v.mod(bq.detune)` for low R), noise burst; no Fels, Rast via quantised playbackRate; cost 0.2.
- **Guards**: no feedback; Reso r < 1; peaks of impulses limited by TANH.
- **Peak**: `v.out.gain` peak = vel·0.6 (reference mem 0.62).
- **Cost** 0.45 / 0.85.
- **Params (6):** `zpf.koerper` SEL zapfen/holz/panzer/kuerbis/fels (zapfen, chips) · `zpf.schuppen` 0–1 (0.3) · `zpf.rast` 0–1 (0.7) · `zpf.klang` 0–1 (0.4) · `zpf.strich` 0–1 (0.5) · `zpf.kratzen` 0–1 (0.3). MACRO rast/klang.
- **Höhe**: scrape rate (tick → buzz → Rast → tone); tilt forward = faster; Ladung target `zpfR` (rate ×) optional P2. **Puls**: the stroke. regen 0.
- **Acceptance**: y 1 with Rast: perceived f0 = f ± 5 ct; tooth train sideband floor ≥ −35 dB (irregularity measurable vs a pure pulse train); y 0.2: 3–10 ticks/s; Rast transitions: no peak > 6 dB above running RMS; burst 112 ms ≥ 5 ticks; Bebung ±50 ct shifts R at y 1, shifts body at y 0.2; fallback plays; cost ≤ 0.55.
- **As built (stage 5):** the scrape processor and its own native stand-in, all five bodies, every acceptance row met with the checks' fixes (inventor-zpf, designer-klf). Measured changes of letter (klang/tests `bench.js zpf`, `t-dsp.js`, `*-zpf.js`):
  - **rate**: geometric from 3/s to f (R = 3^(1−y)·f^y) – SPEC's f·2^(−6+6y) gave 0.9–14 ticks/s at y 0 and 3.9–31 at y 0.2 over 55–880 Hz, KONZEPT promises 3–10 at the bottom: now 5.4–9.2 at y 0.2 at every pitch; Rast, hysteresis and the finger's speed as specified (slew: one-pole τ 15 ms on log R);
  - **teeth**: each tooth's offset drawn fresh around its grid place (never cumulative: the mean rate is exactly R; a 64-entry table would loop), ±(0.8 + 2.5·Schuppen) % of a period at the top, up to 4× low; heights ±(20 + 30·Schuppen) %; a tooth's force (R/3)^−0.15;
  - **Bebung** moves rate and body together at every height (a switch at 30/s would jump with a bent wheel; both rows pass);
  - **body**: modes heard as their velocity (no low tail), T60 × body (Holz 1.3, Panzer 0.5, Kürbis 1.6, Fels 1.4), upper modes shorter; the fundamental's build-up at the rate taken off (locked on f/2ⁿ every tooth adds in phase: +11 dB at the top otherwise); level 3 six modes on alternating sides, the soft side in quadrature;
  - **the tone**: the stick's ride – the integrated teeth, a saw from ≈ 50/s, high-passed at 0.35·f – with a box formant and a click resonator (a pulse train through the narrow modes alone was a sine: harmonics −32…−60 dB);
  - **Fels**: each tooth a rasp of slips (the load given up in 14–32 % parts, the next sooner the more is left, 1.6·f falling; at the top one slip a period), a crack into the contact at each slip, the click 1.5–4 kHz with Höhe and velocity (the scream);
  - **stroke**: at least 5 + 25·gate teeth (SPEC's R_max gave 2.3 teeth in 112 ms at y 0.6), a last knock at 0.92·gate;
  - **level**: v.out peak vel·1.13 (SPEC 0.6 left the standard phrase 5.5 dB under), the processor's tanh only a guard, every body as loud;
  - **native stand-in** (the playbackRate buffer alone cannot span nine octaves): the baked 64-tooth buffer below ≈ 40/s, a band-limited saw at R above (a PeriodicWave, its time jittered by noise on a short delay – noise on its frequency pulled it 9–21 ct flat), three band-pass modes, click and box; Fels from a baked creak buffer (SPEC: none). Cost measured, not SPEC's 0.2.

### 3.9 elm Elmsfeuer – native (hum → corona → arc)

- **Hum**: `OSC(PeriodicWave 'elm')` (harmonics 1–24 at 1/n, 2 and 4 +6 dB) at f_b = fold(f) (30–120 Hz, `tie.base` pattern APP 4400 extracted to a shared `fold(f)`), the note itself at −10 dB when folded; mix by `netz` (0 = note only, 1 = folded hum only; default 0.4 → mostly folded, M: hum on f = Tiefe clone) → WaveShaper tanh(3x) slightly asymmetric (oversample 'none') → BQ highpass 30 Hz → Gain; instability: `A.driftBuf` walk ±4 ct via `v.lnk`.
- **Corona (Knisterquelle, `ideas/designer.md` §0.1)**: `noiseSrc → BQ lowpass(30 + 3000·y²) → WaveShaper(A.ddCurve: 0 for |x| < 0.55, else sign·((|x|−0.55)/0.45)³) → BQ highpass 1500 → Gain(knistern·(0.2 + y))`; two noise sources with random offsets (2 s loop repeats otherwise); pre-gain 0.6 + 1.2·y sets the rate.
- **Arc** (built lazily when `bogen > 0` and y > y_arc − 0.15; y_arc = 0.3 + 0.55·(1 − spannung)): `OSC sawtooth` at f·2^reichweite, pitch steps from a looped `A.elmSteps` buffer (2 s, values {0, +700, +1200, −500, +1900} ct every 150–500 ms → ≤ 3 jumps/s, M) → Gain → `osc.detune`, per-voice random `loopStart` and `playbackRate` 0.9–1.1; stutter from `A.elmGate[0/1]` buffers → gains, crossfade by `flackern`; → BQ bandpass (f_arc·3, Q 2) → WaveShaper tanh → Gain(bogen × env). **Crackle gates the arc**: corona → WaveShaper |x| → BQ lowpass 30 Hz → Gain(k) → `arcGain.gain` (a-rate), so no crackle = no arc; arc fades in over Spannung 0.4–0.7 (wide crossfade, not a switch).
- All oscillator `detune`s via `v.mod()`; `setY` → `setP` on corona cutoff/pre-gain, arc gain, gate crossfade; `setF` → `glideTo` hum/arc.
- **vel**: level + Zündstoß (arc gain +1 for 100 ms via setTargetAtTime). **burst**: `burstEnv(v, t, peak, 0.002, gate, 0.15·(o.decayMul||1))` + Zündstoß + crackle tail; step buffer offset randomised per hit, step depth ∝ vel.
- **release**: `sustainRelease(v, 0.12)` (hum drops with a click – intended) + last crackles (corona gain decays 0.4 s).
- **L3**: two arcs L/R with own step buffers, hum shaper 2×, second corona source panned.
- **Guards**: HP 30 Hz after the asymmetric shaper (DC), asymmetry ≤ 0.1; peak reference 0.45.
- **Cost** 0.7 / 1.35 (≈ 18 nodes; 0.45 with Bogen = 0).
- **Params (6):** `elm.spannung` 0–1 (0.5) · `elm.netz` 0–1 (0.4) · `elm.knistern` 0–1 (0.5) · `elm.bogen` 0–1 (0.6) · `elm.reichweite` 1–2 oct (2, step 1) · `elm.flackern` 0–1 (0.5). MACRO spannung/knistern.
- **Höhe**: voltage ladder (register ladder with wide crossfades); tilt forward = voltage up; Bebung = mains flutter. **Puls**: the Zap. regen 0 (held engine; Sporenregen strikes it as a 0.22 s zap via `hit()` – acceptable but not listed).
- **Acceptance**: y 0: hum ≥ −30 dB, crackle < 5 events/s; y 0.5: 50–300 events/s (threshold-crossing count on the corona bus); y 0.9: arc at f·2^reichweite dominant and present only while corona energy > −40 dB; jumps ≤ 3/s; zap: peak within 10 ms, −30 dB within 0.4 s; two hits differ (step offsets); DC < 0.005; peak ≤ −1 dBFS; cost ≤ 0.8.
- **As built (stage 2):** the full chain above; calibrations and the few changes of letter (each measured) – see `dev/HANDOFF.md` „Notes from stage 2“.

### 3.10 mdr Moder – `myzel-rot` (modes with downward digestion + tuned crackle)

- **Modes**: K = 8 `Reso` (L3 12), ratios: `glocke` 1, 1.794, 2.520, 2.991, 3.786 (V Csound handbell) + 4.5, 5.4, 6.8 (A); `holz` 1, 2.572, 4.644, 6.984, 9.723, 12 (V) + 14.5, 17 (A); `knochen` 1, 2.756, 5.404, 8.933 (V STK) + 12.9, 17.6, 22.5, 28 (A). Each mode's amplitude a_k = sqrt(P_k) from the power ODE integrated per block (dt = n/SR):
```
m  = 0.1 + 2*y                             // moisture at the hit
D  = pilz * gateScale                      // gateScale = clamp(1/gate, 1, 6) for lanes; decayMul divides D and multiplies τ
d_k = D*m*max(0.5, 3*(k/K)^1.5)            // 1/s, k ≥ 2 (M: floor 0.5/s)
P_k' = -P_k/τ_k - d_k*P_k                  // τ_k = τ_1/k, τ_1 = nachklang*clamp(gate, 0.25, 1)*(decayMul||1)
P_1' = -P_1/τ_1 + Σ_{k≥2} η*d_k*P_k        // η = 0.4 + 0.45*schwellen → direct-to-stem (M: +7–9 dB at 1.4 s)
crackleBudget_k = (1-η)*d_k*P_k
```
- **Strike**: a_k = vel·g_k·tilt_k(schlaegel) with the fundamental −10 dB at the strike (M: the swell needs a quiet stem) and 3 ms mallet noise; stem body: fundamental through TANH(1.2·x) (soft even harmonics) + 0.2·mode 2.
- **Crackle**: per mode a Poisson process with rate λ_k = min(20, knistern·40·crackleBudget_k/(P_k + 1e-6)) events/s; event = 2–8 ms noise grain as AM on that mode: mode_k × (1 + c·grain), c ∝ sqrt(digested power) → tuned sidebands at f_k for free (M: cost ≈ 0).
- **Per sample**: `out = Σ_k a_k·reso_k.tick(exc) · (1 + crackle_k)`; L3: modes alternate L/R, crackle grains panned randomly.
- **finish**: ΣP < 1e-6 (−60 dB) → `{done}` → `v.finish(now + 0.05)`; `v.released = true` at start (steal order, APP 5005).
- **detune**: all modes. No live Höhe after the hit.
- **Guards**: P_k ≥ 0 clamp; TANH on stem; denormal flush.
- **Peak**: `v.out.gain` = vel·0.5 (reference glo 0.42 / sch 0.55; the swell must not exceed the strike peak by > 3 dB → stem gain cap).
- **Cost** 0.55 / 0.9.
- **Params (6):** `mdr.koerper` SEL glocke/holz/knochen (glocke, chips) · `mdr.pilz` 0–1 (0.5) · `mdr.knistern` 0–1 (0.4) · `mdr.schwellen` 0–1 (0.6) · `mdr.nachklang` 1–12 s (5, exp) · `mdr.schlaegel` 0–1 (0.6). MACRO pilz/knistern.
- **Höhe**: moisture at the hit (dry = ordinary bell, wet = fast compost); lanes default `bright` ≥ 0.5 in presets. **Puls**: digestion scales with the step. regen 1; Rassel candidate (`rasS` list APP 8816/10527).
- **Acceptance**: fundamental swells ≥ +6 dB between 0.1 s and 1.0–1.8 s (y 0.7, vel 0.8); modes k ≥ 5 fall ≥ 20 dB by 1.5 s; crackle: ≥ 10 transient events/s in 0.3–1.5 s at knistern 0.4, energy concentrated within ±5 % of f_k; voice finishes ≤ 1.3·nachklang; lane at 8 hits/s with gate 0.11 s: ≤ 10 concurrent voices; peak ≤ −1 dBFS; cost ≤ 0.65.
- **As built (stage 4, Moder):** 8/12 modal phasors with a power ODE per block; digestion D = 3.5·Pilz (SPEC's 1× left mode 5 at −14 dB and a +3.5 dB swell), the fungus growing x²/(1 + x²) (swell +8.7 dB on the Glocke at 220 Hz), a drying loss late in the life (the stem otherwise rang 13.8× Nachklang); crackle per mode as Poisson grains into a leaky complex integrator, heard as AM on its own mode's pitch; strike weights equal with the mallet's tilt, the fundamental −10 dB; stem soft cap. Bench 30/30: loudness −19.96, pitch ≤ 0.21 ct, modes 5–8 at 1.5 s −24…−46 dB.

### 3.11 gsp Gespinst – native voice + singleton `myzel-web`

- **Singleton** `A.gsp = { node, cost, active, strings }`: one `AudioWorkletNode('myzel-web', { numberOfInputs: 1, outputChannelCount: [2] })`, input = sum of all voice sends (Gain `A.gspIn`), output → `stripIn('gsp')`, a **new mixer return strip** „Gespinst“ (precedents `stripIn('bor')` APP 5100, `stripIn('rgn')` APP 10897; colour: new `#b9a46e` (A), `MX` list, meters, mute/solo; sends are post-fader per source strip so lane mute/solo are respected – send gain multiplies the strip gain).
- **Strings**: N = 8 (L3 12) KS loops: `FracDelay` + OnePole loss (dark: coef from `nachklang` and `metall` → `Allpass1` dispersion a = 0.3·metall) tuned to the first N notes of `N.notes` from the field's base octave (`gsp.saiten = zwei` → every other degree over two octaves); `N.free` → harmonic stack of the root 1, 2, 3, 4, 5, 6, 8, 10; per-string random-walk detune ±2 ct (5–15 s). **Retune** on any `t.*`/`v.oct` change: glide delay lengths over 60–120 ms (no bank crossfade, M).
- **Bridge** (per sample): `B = Σ s_i·w_i / N; Bn = |B| < 0.25 ? B : TANH(steg·B)/steg (linear below −12 dBFS); for i: in_i = input·c_i + κ·Bn; s_i = loss_i(d_i.read3(L_i) ) …; d_i.write(in_i + s_i); outL/R by pitch (low L, high R)`.
- **κ normalisation** (M: κ_crit ≈ 0.02–0.12): κ_crit = 0.8·N / Σ_i (1/(1 − g_i)) recomputed on every retune/Nachklang change (g_i = per-round-trip loop gain); κ = kopplung_user·0.95·κ_crit. **Energy governor**: per block bridge RMS; if input RMS < −60 dB for > 1 s and bridge RMS rising → κ ×= 0.99 per block until stable; κ restored at the next input.
- **Ruhe**: 10 s without input → loss coefficients ×1.02 per block until silent, then `active = false` (budget released). `{clear}` on `panic()` (APP 8305) and Schlafen (`slpEnter`).
- **Per voice (native)**: `Zupfen`: `ksBuffer` pluck (Saite path, APP 4667) → LP(y) → `v.out` and → send Gain(halo-independent: vel²·(0.3 + 0.7·y)) → `A.gspIn`; `Streichen`: noise → BQ bandpass (f, Q 20) with 0.3 s envelope → same. Voice life = buffer duration; `v.released = true`; `v.finish(t + dur)`. Second-layer and lanes feed the same web by routing their send to `A.gspIn` (bus of the voice stays the lane strip).
- **Sporenregen**: rain plucks send ×0.5 (cap on pile-up).
- **Budget**: `A.gsp.cost = Q.rich ? 2.5 : 1.65`; `active` true from the first send until Ruhe; `voiceLoad()` adds it; `applyQuality()` recreates the node when `Q.rich` changes (like the Bordun, APP 5047).
- **Fallback** (no worklet): plain Saite voice, no web, tile text „⌁ spielt als Saite“.
- **Peak**: voice `v.out.gain` = vel·1.3; web return −9 dB default (`gsp.halo`).
- **Cost** voice 0.4 / 0.6; web 1.65 / 2.5 (M: 0.19 per string shared node).
- **Params (6):** `gsp.saiten` SEL oktave/zwei (oktave, chips) · `gsp.kopplung` 0–1 (0.4) · `gsp.nachklang` 0.5–8 s (2, exp; web T60) · `gsp.metall` 0–1 (0.2) · `gsp.steg` 0–1 (0.5; bridge drive) · `gsp.halo` −24–0 dB (−9). MACRO kopplung/nachklang.
- **Gestik**: `MODT.gspK = { label: 'Gespinst-Kopplung', js: 1 }`, `MOD_EQ` entry `gsp.kopplung → gspK`, `LAD_AMT.gspK = 0.6` → tilt/Ladung drive κ (modulates kopplung_user before normalisation). **Höhe**: pluck brightness + send strength at the hit. regen 1.
- **Acceptance**: kopplung 1.0: no self-oscillation without input (bridge RMS falls after 5 s); common-mode T60 ≤ 4·nachklang; halo: pluck on degree 1 → fifth/octave strings ≥ −25 dB rel. direct within 0.5 s; energy exchange: string j rises ≥ 6 dB above its own decay after a pluck on i; scale change glides without clicks (no peak > 6 dB above RMS); `panic()` clears within 100 ms; singleton ≤ 1.9 units measured; voice ≤ 0.45; mixer strip present with meter; `voiceLoad()` includes the web while active.
- **As built (stage 4, Gespinst):** the web as specified, with the coupling limit taken from the strings' own responses – checked at every partial's resonance, between neighbouring partials and below the lowest string – instead of N/Σ1/(1 − G_i) (×3–8 too careful for a scale: the coupling was inaudible), WEB_MARGIN 0.75; a Butterworth high-pass (0.35 × the lowest string) on the bridge's feed back: below the strings the in-loop DC blockers' lead made every string answer in phase, a 14-Hz mode that oscillated at Nachklang 0.5 (now T60 ≤ 3.2 × Nachklang everywhere, lite included); Lagrange taps precomputed per block (4.2 → 1.7 units); an in-loop DC blocker with its phase delay compensated; 80 ms deaf after a clear; the finger's pluck Saite-like at 1.75 × Nachklang. t-dsp: halo fifth/octave −3/+4.6 dB, exchange −14.5 → −6.3 dB; bench: every row; cost (final calibration): a voice 0.26–0.29 / 0.82–0.88, the web 1.82–2.15 / 2.51–2.70 measured as 24 webs – a single web carried the worklet's fixed share of the render ×24 (3.7–5.0) – GSP_COST 2.47 / 3.11.

### 3.12 jrg Jahresring – native (modal wooden bar, strike position, year clock)

- **Chain**: noise burst 2–6 ms (vel → shorter/brighter, BQ lowpass 2–8 kHz by `schlaegel`) → 4 parallel BQ bandpass modes (L3 6) with gain g_k = max(k === 1 ? 0.1 : 0, |Φ_k(x)|) from a 64-point Euler–Bernoulli table (free-free, βL = 4.730, 7.853, 10.996, 14.137, Φ_k(x) = cosh βx + cos βx − σ_k(sinh βx + sin βx); M: fundamental vanishes at x = 0.776, modes 2 and 4 at the centre) with x = 0.5 + 0.5·y; Q_k = π·f_k·T60_k/6.9 (T60 from `holz`: 0.4–3 s, ×(1 − 0.5·(k−1)/K)); ratios blended logarithmically by `schnitt` between free bar 1, 2.756, 5.404, 8.933 (V STK) and marimba 1, 3.932, 9.538, 16.688 (V Csound); body: BQ lowpass „Kasten“ + BQ bandpass 0.9f (Q 5, −12 dB, tube). `v.mod(bq.detune)` on every mode (Bebung). `decayMul` scales T60.
- **Season** `A.season ∈ [0,1)`: advances with audio time (`jahr` minutes per year, 0 = still) only while `A.ctx.state === 'running'` and the tab is visible; plus a hit contribution rate-limited to ≤ 0.0005/s of hits (count hits per second, cap 2/s). Anchors cosine-crossfaded: spring (0): T60 ×0.6, bright, modes start +25 ct and settle in 60 ms (`detune.setTargetAtTime`), mode 1 ×0.8; summer (0.25): T60 ×1.3; autumn (0.5): T60 ×0.8, ±8 ct per hit on modes 2+, leaf = 120–300 ms noise through BQ 3–6 kHz after the knock, level `laub`; winter (0.75): modes 2–4 +2 % (≤ 34 ct; fundamental excluded, M), T60 of modes 3–4 ×2.5, mode 1 ×0.5, ice crack second impulse after 25–60 ms at −10 dB ×laub. `jahreszeit` fixes the season for presets.
- **Age** n = `A.jrgAge` (hits, rate-limited ≤ 2/s counted): α = 1 − e^(−n/600) → detune −6α ct (cap −6), Kasten cutoff ×(1 − 0.2α), knock noise ×(1 + 0.5α). Reversible: Schlafen resets, button „Verjüngen“ in the engine section; not persisted.
- **Struck**: `v.out.gain = vel·0.5` (reference glo 0.42 / klb 0.32); `v.released = true`; `v.finish(t + T60_max + 0.15)`; noise `_end`.
- **L3**: 6 modes (+12.9/17.6 free, +16.7/23.4 marimba), two bars ±3 ct L/R, tube per side.
- **Cost** 0.65 / 1.3 (M: ≈ 0.1 per biquad+gain).
- **Params (6):** `jrg.jahr` 0–12 min (4, step 0.5; 0 = Stillstand) · `jrg.jahreszeit` SEL lauf/fruehling/sommer/herbst/winter (lauf, chips) · `jrg.schnitt` 0–1 (0.5) · `jrg.holz` 0–1 (0.5) · `jrg.schlaegel` 0–1 (0.5) · `jrg.laub` 0–1 (0.4). MACRO schnitt/holz. Section shows „Jetzt: Herbst (3:12 im Jahr) · Ringe: 412“ (live text, 1 Hz).
- **Höhe**: mallet position centre → end (the nodal line at y ≈ 0.55 is the edge); tilt moves the mallet. **Puls**: the safest hit; lanes rustle in autumn, crack in winter. regen 1; Rassel candidate.
- **Acceptance**: mode-1 level at y 0.55 ≤ −20 dB vs y 0 while mode 2 ≥ its centre level + 6 dB; centroid rises y 0 → 1 (node dip allowed); winter f0 unchanged; age after 600 hits ≤ −6 ct; season frozen while suspended; loudness ±2 dB vs glo; peak ≤ −1 dBFS; cost ≤ 0.75.
- **As built (stage 2):** the full chain above (contact + noise burst → mallet low-pass → modes → Kasten and tube; level 3 six modes on two bars), with a −140 dB trickle so Chromium does not cut the filters early – see `dev/HANDOFF.md`.

### 3.13 Reserves (build only after the twelve pass)

**khl Kehlchen – `myzel-syrinx`** (M: 27 ns/sample): labia ODE ẋ = v, v̇ = −ε·x − κ·x³ − C·x²·v + B·v (semi-implicit Euler, 2 substeps), trachea 2 biquads (1.2–2.8 kHz), beak lowpass on y. Mandatory fixes: (1) frequency-locked loop inside the processor (zero-crossing period estimate → ε correction, τ 20 ms; M: errors +10..+210 / −50..−80 ct); (2) roughness = pressure-modulated turbulence noise (the D term is inert, M) + L3 second labia pair at 100 ct offset, strong shared-pressure coupling (M: −24 dB subharmonics); (3) built-in syllable generator: B and ε trajectories of 20–80 ms per onset, retriggered by Höhe movement/Gestik and by every Puls hit. y → B = −0.3 + 1.6·y (threshold at y ≈ 0.19). Params: `khl.spannung`, `khl.druck`, `khl.schnabel`, `khl.rauheit`, `khl.silbe` SEL (aus/chip/triller/ruf), `khl.anstieg`. Cost 0.4 / 0.7, fallback swm. Acceptance: f0 ≤ 10 ct over the (f, B) grid; chips 1–64 ms onsets; syllable audible as pitch/level contour.

- **As built (Kehlchen):** the labia in the note's phase (x'' = −x − κx³ − C·x²·x' + b·x' + η, two substeps), the FLL as specified (zero crossings, τ 20 ms, the first multiplier from a dozen silent periods at the start): ≤ 0.2 ct over 110 Hz–6 kHz × y 0.25–1. What sounds is the flow through the opening (rest 1.1, a smooth max(0, ·)): past it the labia shut for part of each cycle, so the partials rise with pressure (h2–h5 −45 → −16 dB) – the SPEC's κ and C alone left the top a near-sine. The throat follows the note (+4 dB, Q 1.4: songbirds tune it to f0), the trachea's resonance c/4L (+3.5 dB), the beak opens with the pressure. Roughness: turbulence in the drive, the pressure every other cycle ±(0.7·Rauheit·top²) (f/2, 3f/2 at −11 dB at Rauheit 1), the L3 pair 6–100 ct apart on one air sac. Syllables: Chip (an upward flick from −260 ct with a pressure overshoot, 22–44 ms), Triller (13 + 12y pulses a second, a third of each under the threshold: swing ≥ 30 dB), Ruf (slurred down from +320 ct, again every 0.55–0.9 s while held); a Höhe jump > 0.12, a shake and every Puls hit start one. Air under the threshold ≈ −31 dB under the tone. Cost (final calibration, quiet machine): 0.59–0.64 / 1.06–1.21 with Chip, 0.73 / 1.33 with Triller – VCOST 0.84 / 1.53.

**rhz Rhizom – native + JS net**: net as one JS event process in `tick()` (25 ms clock, APP 6032) keyed by absolute scale index (`N.notes`, APP 2056): strike charges node i0 (always pings), transmission to i±1 with probability p = w = reiz·(0.5 + y) clamped ≤ 0.8 (full-charge packets, M: deterministic LIF is a switch), i±2 at p/3, optional fifth/octave edges ≤ 0.2; refractory `erholung` 0.6 s default; caps ≤ 40 firings and ≤ 2.5 s per cascade; packets carry the owner voice (bus/strip). Pings native: OSC pair (Holz 1 + 1.5, Metall 1 + 2.76, Glas 1 + 2.32) with `setTargetAtTime` decays (Tropfen pattern APP 4546–4560), cap 12 per voice; voice ends on `done` (no charge in transit, pings < −60 dB). `N.free` → voice-local net; `panic()`/Schlafen clear. Params: `rhz.reiz`, `rhz.erholung`, `rhz.weg`, `rhz.knoten` SEL, `rhz.glimmen`, `rhz.streuung`. Cost 0.3 average / 0.65 cap. regen 1. Works without a worklet.

- **As built (Rhizom):** as specified, with p = Reiz·(0.3 + 1.1·y) (SPEC's 0.5 + y spread too far: 38 % of strikes at y 0.5 rolled over 12+ nodes), ±2 at p/3.5, octave and fifth at ≤ 0.2·p; the strike's first step ×(0.75 + 0.45·vel), a lane's short gate ×0.55–1. Measured (mpent over three octaves, 150 strikes): y 0 mean 2.0 (54 % single), y 0.5 mean 6.3 (12 % single, 41 % 4–8, 31 % 9+), y 1 mean 12.8 (25 % the whole field). Each ping: two partials (L3 three, panned by pitch) and a knock (one noise per voice, its band moved to each ping's note); body levels Holz 1 / Metall 0.69 / Glas 0.87; cap 12 pings a voice (L3 20), the oldest gives way in 8 ms; the budget counts a voice by its ringing pings – final calibration: a voice with one ping 0.62 / 1.20 units, each ping more 0.29 / 0.38 (`rhz-pings.js`), so VCOST 0.71 / 1.38 and `RHZ_COST` base 0.38 / 0.94 + 0.33 / 0.44 per ping ringing (refit in the Hexenring's final pass with a Glimmen term – §2.4; the first entry, 0.07 + 0.045 per ping on top of 0.3, came from a 3-s window in which the voices lived a third of the time). Offline the cascade is laid out at once (tests step the clock by hand). Bench 33/33: loudness −20.48, f0 ≤ 0.21 ct.

---

## 4. Library UI (from `ideas/ui-final.md`, decisions final)

### 4.1 Summary
- **Inline**: every engine selector (`v.eng`, `v.layer`, `l0–3.eng`, Mixer-Fruchtkörper `mxd-` copies, Gestik `rgS`) becomes a 44 px **Quelle-Zeile** `.kq-row` (‹ · glyph + name · family + sentence · ›) instead of 14–26 chips. `[⚄]` icon button in the section header picks a random allowed source with an undo toast.
- **Library** `.kq-lib`: one singleton element inside `#sheet` (sibling of `.sheet-head/.sheet-body`, `position:absolute; inset:0; z-index:20`); the sheet grows like the mixer (`height: max(58%, calc(100% − 132px))`, V APP 645) so ≈ 130 px of the field stay playable; header (‹ · title · Fertig), search, family chips (★ ⟲ Alle Luft Dunst Holz Erz Erde), tile list with sticky group headers, footer (⚄ Überrasch mich · live region). Opens on the **family of the selected source**, selected tile focused and in view.
- **Tile** `.kq-tile`: `button.kq-pick[role=radio]` (glyph 24 px, name, art word hält/schlägt/beides, cost dots ●○○ ≤ 0.5 / ●●○ ≤ 1.0 / ●●● > 1.0 from `Q.cost[k]` with title „Kosten 1,05 – etwa 13 Stimmen auf diesem Gerät“ = `floor(VBUDGET / Q.cost[k])`, sentence 2 lines) + `button.kq-fav` ★ + `button.kq-hear` ▶ (both `tabindex=-1`, keys `f`/`h`). Selected: `aria-checked`, 3 px `--spore` left edge. Disallowed (Sporenregen: held engines): `aria-disabled`, opacity .42, reason in the group header. Fallback: `data-fallback` → „· ⌁ spielt als Schale“ in `--rose`. Worklet loading: glyph pulses ≤ 300 ms.
- **Hearing**: tap = `setParam` then short probe (struck: `hit(k, now, f, 0.5, 0.75, {gate:.4, bus})`; held: `playNote(k, now, f, 0.5, 0.7, {burst:true, gate: ENG_META[k].hear?.gate ?? 1.2, bus})`); ▶ = probe without selecting; long-press ≥ 350 ms = held probe, vertical drag = `v.setY`; `f` from the target (field: middle scale note; layer: × ratio; lane: `laneNote(i)` with lane gate; rain: `hit`), bus = `stripIn(target)`; probe voices `v.probe = true`, one at a time (`vFade` the previous), all ended in `kqClose()`/`panic()`. ‹ › probe suppressed while a voice of that target is held.
- **State** `myzel.klang.v1 = { fav: [...], recent: [≤ 6] }` in `store` (device, not patch); recent maintained in `setParam` for the six engine ids, `gkSet('rgS')` and preset load; hearing adds nothing.
- **Keyboard/a11y**: row = `role=group` with three buttons, ←/→ on the name = ‹ ›; library = `role=dialog aria-modal` with focus trap (pattern `mxLegend` APP 16757), Esc closes, focus returns to the opener; family chips and tile list are radiogroups with roving tabindex, ↑/↓, Home/End, first-letter jump; live region announces „Harz gewählt für Spur 2“. Targets ≥ 44 px; tiles 56 px (48 px ≥ 900 px). `prefers-reduced-motion` honoured.

### 4.2 Data model (additions)
```js
const FAM = [['luft','Luft','Atem, Wind, Stimmen, Funken'], ['dunst','Dunst','Wolken aus Teilchen und Zufall'],
  ['holz','Holz','Saiten, Stäbe, Bogen'], ['erz','Erz','Metall, das nachklingt'], ['erde','Erde','Felle, Tiefe, Fäulnis, Wasser']];
// flat order stays the single truth (‹ ›, selStep APP 6994, dice APP 17571, mxSrcText APP 12812, updLaneTabs APP 17099):
// by family, held before struck, existing before new
const ENG_OPTS = [['hau','Hauch'],['obt','Obertöne'],['stm','Stimme'],['hlm','Halm'],['boe','Böe'],['elm','Elmsfeuer'],
  ['neb','Nebel'],['kor','Körner'],['swm','Schwarm'],['amo','Amöbe'],
  ['hrz','Harz'],['shn','Sehne'],['zpf','Zapfen'],['rnk','Ranke'],['sai','Saite'],['jrg','Jahresring'],
  ['glo','Glocke'],['sch','Schale'],['gng','Gong'],['klb','Kalimba'],['gsp','Gespinst'],
  ['tie','Tiefe'],['glt','Glut'],['mem','Membran'],['trp','Tropfen'],['mdr','Moder']];
// reserves appended when built: khl after elm, rhz after mdr
const ENG_META = {  // fam · art · tags (search, bilingual) · hoehe · glyph · regen (0 = never in Sporenregen) · hear · rich (L3 half sentence)
  hrz: { fam:'holz', art:'haelt', tags:'bogen bow glas schale stab daxophon waterphone reibung streichen', hoehe:'Bogendruck', glyph:'hrz', regen:0, hear:{gate:1.6}, rich:'Stufe 3: acht Moden mit Dubletten, Bogen links und rechts' },
  hlm: { fam:'luft', art:'haelt', tags:'rohrblatt klarinette flöte flute flamme atem blasen reed', hoehe:'Atemdruck', glyph:'hlm', regen:0, hear:{gate:1.0}, rich:'Stufe 3: zweites Rohr ±4 Cent' },
  glt: { fam:'erde', art:'haelt', tags:'feedback rückkopplung larsen glühen drone', hoehe:'Gewinn', glyph:'glt', regen:0, hear:{gate:2.0}, rich:'Stufe 3: zwei Schleifen L/R' },
  boe: { fam:'luft', art:'haelt', tags:'äolsharfe aeolian wind harfe lock-in akkord', hoehe:'Windstärke', glyph:'boe', regen:0, hear:{gate:2.0}, rich:'Stufe 3: 14 Saiten, Wind in Stereo' },
  amo: { fam:'dunst', art:'haelt', tags:'gendy xenakis stochastisch bass zufall', hoehe:'Unruhe', glyph:'amo', regen:0, hear:{gate:1.2}, rich:'Stufe 3: zwei Amöben L/R' },
  rnk: { fam:'holz', art:'beides', tags:'scanned synthesis masse feder hammer ring', hoehe:'Hammerbreite', glyph:'rnk', regen:0, hear:{gate:1.2}, rich:'Stufe 3: 96 Massen, zweiter Abtastkopf' },
  shn: { fam:'holz', art:'beides', tags:'saite string gleiten slide flageolett ebow jawari sitar', hoehe:'Hand', glyph:'shn', regen:0, hear:{gate:1.2}, rich:'Stufe 3: Doppelsaite mit Korpus' },
  zpf: { fam:'holz', art:'beides', tags:'güiro kratzen ratsche scrape rhythmus fels knarren', hoehe:'Kratzrate', glyph:'zpf', regen:0, hear:{gate:0.6}, rich:'Stufe 3: sechs Moden, zwei Stäbe' },
  elm: { fam:'luft', art:'beides', tags:'elektrisch strom brummen knistern lichtbogen zap tesla', hoehe:'Spannung', glyph:'elm', regen:0, hear:{gate:1.0}, rich:'Stufe 3: zwei Bögen L/R' },
  mdr: { fam:'erde', art:'schlaegt', tags:'kompost perkussion knistern umgekehrt reverse glocke', hoehe:'Feuchte', glyph:'mdr', regen:1, rich:'Stufe 3: zwölf Moden, Knistern im Stereo' },
  gsp: { fam:'erz', art:'schlaegt', tags:'sympathetisch resonanz netz saiten steg ökologie', hoehe:'Zupfhelligkeit', glyph:'gsp', regen:1, rich:'Stufe 3: zwölf Saiten über zwei Oktaven' },
  jrg: { fam:'holz', art:'schlaegt', tags:'marimba holz stab anschlag jahreszeit', hoehe:'Treffpunkt', glyph:'jrg', regen:1, rich:'Stufe 3: sechs Moden, zwei Stäbe' },
  // existing 14: fam/art/hoehe/glyph as in ui-final §1; missing entry → fam 'dunst', art from ENGINES[k].sustain
};
const RG_S = () => ENG_OPTS.filter(([k]) => ENGINES[k] && !ENGINES[k].sustain && (ENG_META[k] || {}).regen !== 0);   // replaces APP 8772; gkCheck APP 8823 validates against it
const RAS_S = ['trp', 'mem', 'sch', 'mdr', 'jrg'];   // APP 8816 + chips APP 10527
```
- `SEL('v.eng'|'v.layer'|'l*.eng', …, { lib: 1 })` (lanes without `small`); `ctl()` (APP 12017) gets `if (d.lib) return kqRow(id, opts)` beside the `d.chips` branch (APP 12067); `d.opts` keeps serving `selStep`, `dice`, `mxSrcText`, `updLaneTabs`. Engine sub-selects (`hrz.koerper`, `hlm.rohr`, `zpf.koerper`, `mdr.koerper`, `shn.steg`, `jrg.jahreszeit`, `glt.sprung`, `gsp.saiten`, `amo.verteilung`) stay `{chips:1}` as the first row of the engine section, 44 px at `pointer: coarse`.
- Engine section (APP 17035–17043): glyph before `h3`, note line „Höhe: Bogendruck“, fallback line when `!A.workletOK`, `rich` half-sentence when `Q.rich`, A/B badges on the MACRO params. `#engChip` (APP 1528): glyph + name (+ layer), long-press ≥ 400 ms / right-click → `kqOpen({id:'v.eng'})`.

### 4.3 DOM/CSS
As in `ideas/ui-final.md` §7 (copy verbatim): `.kq-row` grid `44px minmax(0,1fr) 44px`, `.kq-step`, `.kq-name` (two lines, ellipsis), `.kq-lib` (flex column, `--bark`), `.kq-head` 48, `.kq-search` 44 (16 px input, no iOS zoom, autofocus only at `pointer: fine`), `.kq-fams` nowrap horizontal scroll with a 24 px mask, `.kq-list` scroll container with `touch-action: pan-y`, `.kq-fh` sticky, `.kq-tile` 56 px / 48 px ≥ 900 px, `.kq-pick` grid `40px minmax(0,1fr) auto auto`, `.kq-cost`, `.kq-art`, `.kq-fav/.kq-hear`, `.kq-g.loading` pulse, `.kq-foot` with safe-area padding, `.sheet[data-lib]` height rule (+ ≤ 780 px portrait variant), `#app:has(#sheet[data-lib]:not([hidden])) .quick { display:none }`, landscape ≤ 540 px: `height:auto`, `:has()` fallback class `.on`. Glyphs: one `<symbol>` sprite, 24 px stroke 1.6, `currentColor`, ids `g-<key>` (≈ 4 KB).

### 4.4 Functions
`kqRow(idOrAcc, o)`, `kqStep(t, d)` (next allowed source in `ENG_OPTS` order, no wrap, `selStep` semantics, probe only without a held voice), `kqOpen(t = {id|get/set, title, allow, bus, f, gate, prefix, opener})`, `kqHear(t, k, held)`, `kqSurprise(t, inline)`, `kqClose()`, `KQ = { fav:Set, recent:[], save() }`. Targets: field, layer („Aus“ = first tile for this target only), lanes (probe = `laneNote(i)`, gate `stepDur·0.9`), mixer `mxd-` prefix (title „… für Kanal Spur 2“), rain (`{get,set}` accessor, allow = `RG_S()`), `kor.src` = P2.

### 4.5 Migration (ui-final §8)
Keys unchanged → `sanitize` (APP 1975) passes old patches; new params get defaults (APP 12192); unknown key (newer export, unbuilt reserve) → one toast „Klangquelle „Rhizom“ gibt es in dieser Version nicht – Nebel gewählt.“ collected in `loadValues`; `ENG_ALIAS = {}` hook before `sanitize` in `loadValues/restoreState/gkCheck`; `RG_S()` keeps old `rgS` values valid; fallback keeps the key in the patch; DOM ids `#p-v-eng`, `#p-l0-eng`, `#mxd-p-v-eng` remain (now `.kq-row[role=group]`) so MIDI „Zuweisen“ (`data-pid`, APP 12083) works.

### 4.6 To measure (ui-final §10)
Family row width at 360 px; sheet growth leaves ≥ 130 px field; long-press vs scroll start on iOS/Android; probe voices end on panel change/`panic()`; worklet first load ≤ 300 ms on mid-range Android; ellipsis length of the sentence (≈ 40 chars → put the point first); `:has()` support.

---

## 5. Presets and recipes (5, to be tuned by ear; values are starting points)

| key | name | tags | v (essentials) | RZ recipe |
|---|---|---|---|---|
| glaswiese | Glaswiese | Ambient · Reibung | `v.eng:'hrz', hrz.koerper:'glas', hrz.druck:.45, hrz.harz:.25, v.layer:'boe', v.layerLvl:.3, v.layerInt:12, boe.wind:.35, t.scale:'hira', t.oct:3, l0.on:true, l0.eng:'mdr', l0.steps:16, l0.puls:3, l0.div:'1', l0.bright:.6, l0.vol:.5, rev.mix:.5, rev.size:10, dly.mix:.25, bor.on:true, bor.int:'1.5', bor.lvl:.25, seq.bpm:60` | `{ set:{neigen:'anl'}, mod:[['tiltY','hoehe',.7,'anl']], txt:'Anlehnen = Bogendruck' }` |
| kompostgarten | Kompostgarten | Perkussiv · Polyrhythmus | `v.eng:'jrg', jrg.jahreszeit:'herbst', jrg.laub:.5, t.scale:'pelog', t.oct:3, seq.bpm:92, seq.swing:.14, l0.on:true, l0.eng:'mdr', l0.steps:16, l0.puls:5, l0.oct:-1, l0.bright:.7, l1.on:true, l1.eng:'zpf', l1.steps:12, l1.puls:7, l1.bright:.35, l1.vol:.4, l2.on:true, l2.eng:'jrg', l2.steps:7, l2.puls:3, l2.div:'0.5', l2.walk:.5, l3.on:true, l3.eng:'gsp', l3.steps:11, l3.puls:2, l3.div:'1', gsp.kopplung:.5, drv.amt:.2, rev.mix:.35` | `{ set:{neigen:'regen', rgArt:'keime', rgS:'mdr'}, txt:'Sporenregen aus Kompostglocken' }` |
| atemrohr | Atemrohr | Experimentell · Atem | `v.eng:'hlm', hlm.rohr:'rohrblatt', hlm.luft:.5, v.layer:'glt', v.layerInt:-12, v.layerLvl:.35, glt.gluehen:.45, glt.nachgluehen:2.5, t.scale:'dor', t.oct:3, v.glide:.15, l1.on:true, l1.eng:'hlm', l1.steps:8, l1.puls:3, l1.div:'0.5', l1.bright:.75, l1.vol:.35, dly.div:'0.75', dly.fb:.4, dly.mix:.3, rev.mix:.4, seq.bpm:76` | `{ set:{neigen:'anl', seit:'aus'}, mod:[['tiltY','hoehe',.8,'anl']], txt:'Vorneigen = Atem, mit Ocarina-Vibrato' }` |
| hochspannung | Hochspannung | Psychedelisch · Elektrisch | `v.eng:'elm', elm.spannung:.55, elm.bogen:.6, v.layer:'amo', v.layerInt:-12, v.layerLvl:.45, amo.zeit:.2, v.oct:-1, t.scale:'phrdom', t.oct:3, l0.on:true, l0.eng:'elm', l0.steps:16, l0.puls:7, l0.div:'0.25', l0.bright:.9, l0.vol:.5, l2.on:true, l2.eng:'zpf', l2.steps:9, l2.puls:4, l2.bright:.95, zpf.koerper:'fels', drv.type:'fold', drv.amt:.35, flt.type:'lowpass', flt.freq:5000, flt.lfoDepth:.8, rev.mix:.3, seq.bpm:110` | `{ set:{lad:true, ras:true, rasS:'jrg', rasQ:'16'}, mod:[['ladung','pulsD',.6,'lad']], txt:'Schütteln verdichtet den Puls, Rassel aus Holz' }` |
| gespinstgarten | Gespinstgarten | Experimentell · Ökologie | `v.eng:'gsp', gsp.kopplung:.55, gsp.nachklang:3, gsp.saiten:'zwei', gsp.halo:-6, t.scale:'dpent', t.oct:3, seq.bpm:84, l0.on:true, l0.eng:'gsp', l0.steps:16, l0.puls:5, l0.bright:.5, l1.on:true, l1.eng:'shn', l1.steps:12, l1.puls:4, l1.oct:-1, l1.bright:.3, l1.vol:.45, l2.on:true, l2.eng:'rnk', l2.steps:7, l2.puls:2, l2.div:'1', l2.bright:.7, l2.vol:.4, rev.mix:.45, rev.size:9, cho.mix:.2` | `{ set:{neigen:'anl'}, mod:[['tiltY','gspK',.8,'anl']], txt:'Vorneigen hebt die Kopplung des Netzes' }` |

All presets `fmt: 2`; `safeify` (APP 17533) adds: `glt.gluehen ≤ 0.8`, `gsp.kopplung ≤ 0.7`, `hrz.druck ≤ 0.85`, `amo.zeit ≤ 0.5`, `boe.nachklang ≤ 5`, `mdr.nachklang ≤ 8`, `shn.ebow ≤ 0.8` (dice() plays every engine randomly, APP 17571).

---

## 6. Integration checklist (extends code-map §11)

1. `ENG_OPTS` (APP 1665) re-sorted + new keys; `ENG_INFO` (1668), `GROUP` (1950), `VCOST1/VCOST3` (2081–2082) from the bench, `MACRO` (7050), `ENG_META`, `FAM`, glyph sprite in the HTML.
2. Params after APP 1813 (`trp.splash`), ≤ 6 each, ids as in §3; `SEL … {chips:1}` for sub-selects; `{lib:1}` on the six engine selectors (1688–1689, 1868).
3. `MYZEL_DSP_SRC` + `ensureDSP()` (§2.1); `setupCapture()` reuses it; `A.workletOK`, `A.workletBroken`; `playNote` reroute (§2.1); `ENGINES[k].needs/fallback`.
4. `ENGINES.*` (before APP 4613) per §3; shared `fold(f)` pulled out of `tie.base` (4400); `A.ddCurve`, `A.elmSteps`, `A.elmGate`, PeriodicWave `elm` lazily after `initAudio` (`A.waves` is cleared there, 2809); Euler–Bernoulli table `JRG_PHI` at module level.
5. `voiceLoad()` (5012) with the Gespinst singleton; `applyQuality()` (5032) rebuilds the web on `Q.rich` change; `stripIn('gsp')` + mixer strip (`MIX.list`, colours 12261–12266, `mxSrcText` 12812, `MX_SRC_IDS` 12824); `onParamChanged` (12128): `t.*`/`v.oct` → `gspRetune()`; `gsp.*` live → web `{set}`.
6. Gestik: `RG_S()` derived (8772; chips 10973, 18290; `gkCheck` 8823); `RAS_S` (8816, 10527); `MODT.gspK` (9446) + `MOD_EQ` (9887) + `LAD_AMT` (10179) + Ladung card text (10554); `panic()` (8305) and `slpEnter` post `{clear}` to the web, end probe voices, reset `A.jrgAge`; `rgStart` (10628) warms nothing new (Sehne/Gespinst voices render their own pluck as Saite does).
7. Jahresring season clock: advance in `tick()` while `A.ctx.state === 'running'` and `!document.hidden`; „Verjüngen“ button in the engine section; live text.
8. Presets (§5) in `PRESETS` (17278) + `RZ` (11481); `safeify` limits; `MUT_SKIP` unchanged.
9. Texts generated from `FAM`/`ENG_META`: Spielhilfe (17489–17491), Gerät (17749–17752), start screen (1565), README 10–16/56, Ladung card (10554–10555), rain quelle (10981).
10. Library UI (§4): `ctl()` branch, `kqRow/kqOpen/...`, CSS, sprite, `#engChip` long-press, migration toast, `store` key.
11. Tests and tooling (§7); `mk.sh` export list gains `ensureDSP, DSP, ENG_META, FAM, KQ, kqOpen, kqClose, kqHear, RG_S, RAS_S, voiceLoad`.

---

## 7. Test plan

### 7.1 Offline render bench – `scratchpad/snd/` (update, then run per engine)
Existing: `inject.py` builds a test copy from pieces (engine dirs with `meta.json`, `params.js`, `engine.js`) and `render.js` renders loudness/centroid/sustain/cost/demo WAV + spectrogram through Playwright. Both target the pre-Gestik app (`base-index.html`, anchors on an ENG_OPTS ending with Schale) and must be updated:

| What | Today (V) | Change |
|---|---|---|
| `SRC` default | `snd/base-index.html` | `/home/user/4claude/myzel/index.html` (env `MYZEL_SRC`) |
| ENG_OPTS anchor | `['sai', 'Saite'], ['sch', 'Schale']];` | insert into the family-sorted list: piece `meta.json` gets `fam`, `art`; inject after the last existing entry of that family (or simply before `];` of line 1666 for the bench) |
| ENG_INFO anchor | `sch: 'Klangschalen …',\n` | `trp: "Wassertropfen – Luftblasen mit aufsteigendem Ton",\n` (APP 1682) |
| GROUP anchor | `sai: 'Saite', sch: 'Schale',` | `tie: "Tiefe", trp: "Tropfen",` (APP 1951) |
| VCOST anchors | `… sch: 0.9` / `… sch: 2` | `trp: 0.7 };` / `trp: 1.5 };` (APP 2081–2082) |
| params anchor | `NUM('sch.mallet', …)` | `NUM('trp.splash', 'Aufprall', 0, 1, 0.3, '%');\n` (APP 1813) |
| engines anchor | `\n};\n\n/* ---------- Karplus-Strong string` | unchanged text, verify (APP 4613–4615) |
| `__mkCtx` hook | `try { ctx = new AC({ latencyHint: L }); }` | unchanged (APP 2803) |
| worklet | none | piece `meta.json` may carry `"worklet": "proc.js"`; inject appends its processor source into `MYZEL_DSP_SRC` (anchor: the module string's final `registerProcessor('myzel-tap'…` line); copy `myzel-dsp.js` beside `inst.html` if the sibling file is shipped; `__off()` must `await M.ensureDSP(ctx)` after `initAudio()` (offline contexts load their own module, V webaudio.md §7) |
| exports | `window.__M = { … }` | add `ensureDSP, DSP, ENG_META, voiceLoad, getQ, applyQuality, calibrate, QP, KS_CACHE, stripIn, panic, MIX` |

`render.js` additions per engine (report JSON + WAV/PNG in `snd/out-klang/<key>/`):
- **loud**: unchanged (RMS vs neb/glo/mem, L1 and L3, burst for held) → pass if |RMS − ref| ≤ 2 dB, L3 − L1 within ±1.5 dB, peak ≤ −1 dBFS, nan = 0, |dc| < 0.01.
- **yCentroidHz**: unchanged (0 / 0.5 / 1) → monotone rise (jrg: node dip allowed).
- **f0**: YIN/autocorrelation on 4096-sample windows at 0.6 s for f ∈ {55, 110, 220, 440, 880, 1760} and y ∈ {0.2, 0.5, 0.8} → |err| ≤ 5 ct (self-oscillators ≤ 10 ct; zpf at y 1; amo at zeit 0; mdr/jrg/gsp at the strike).
- **onset/decay**: t90 from envelope follower; decay to −60 dB after release; compared with each engine's acceptance row.
- **burst**: `hit()` with gates 0.06, 0.112, 0.22, 0.5 s → level inside the gate ≥ −20 dB rel. held; voices finish (`A.voices.size` returns to 0 within gate + rel·1.5).
- **bebung**: offset `A.pitchMod` by +50 ct (ConstantSource) → f0 shifts +50 ± 5 ct (zpf: at y 1 the rate, at y 0.2 the body).
- **lane**: 8 hits/s for 3 s with gate 0.11 → max concurrent voices, `voiceLoad()` ≤ VBUDGET, RMS.
- **cost**: unchanged (16 voices vs 16 Nebel, min of 2) → ≤ target + 15 %; L3 likewise; singleton (gsp) measured separately with 0 voices + web active.
- **engine-specific** (§3 acceptance rows): implemented as named checks (`hrzModeRace`, `hlmThreshold`, `gltGrowth`, `boeCapture`, `amoLock`, `rnkSidebands`, `shnGlide`, `zpfRast`, `elmCorona`, `mdrSwell`, `gspHalo`, `jrgNode`).
- **spectrogram**: `ffmpeg showspectrumpic` (existing) for a 12 s L3 demo phrase; a reviewer looks at every PNG once.
- **worklet health**: `processorerror` count 0; `done` messages arrive; `A.workletOK` true in the offline context.
Run: `python3 snd/inject.py snd/builds/<key> snd/pieces/<key> && node snd/render.js snd/builds/<key> eng:<key> snd/out-klang/<key>`; keep `research/bench/wa_bench.html` for raw processor ns/sample.

### 7.2 Playwright UI tests – `scratchpad/klang/tests/` (new; pattern `v2/lib.js openInst`, slot `km` via `sh v2/mk.sh /home/user/4claude/myzel km`, server `:8790`)
- `t-kq-row.js`: six rows + mixer copies are `.kq-row[role=group]` of 44 px; ‹ › step in `ENG_OPTS` order, disabled at the ends, skip disallowed (rain), probe suppressed while a voice of that target is held; `[⚄]` changes only the engine and toasts with undo.
- `t-kq-lib.js`: open on the family of the selection; 7 tiles visible at 360×740 without scrolling; search (ö/oe, tags „bow“), ★ persists in `myzel.klang.v1`, ⟲ holds 6 without the current; ⚄ picks a visible allowed tile ≠ current; Fertig/‹/Esc/swipe close, focus returns to the opener; `sheet.dataset.lib` grows the sheet and hides `.quick`; field ≥ 130 px tall.
- `t-kq-targets.js`: layer „Aus“ tile only for the layer; lane probe uses `laneNote(i)` and `stripIn('l'+i)`; mixer `mxd-` prefix title; rain shows held engines disabled with reason; `gkCheck` accepts the derived `RG_S()`.
- `t-kq-hear.js`: tap = `setParam` + probe voice with `v.probe`, one at a time; long-press held probe with `setY`; all probes gone after `kqClose()` and `panic()`.
- `t-kq-fallback.js`: with `A.workletOK = false` tiles show „⌁ spielt als …“, `playNote('hrz')` creates a Schale voice, zpf/glt play natively; `processorerror` marks the engine broken.
- `t-kq-migration.js`: old preset JSON loads; unknown key → one toast and default; `ENG_ALIAS` hook.
- `t-kq-a11y.js`: roles/labels (`aria-modal`, radiogroups, live region), roving tabindex, `f`/`h` keys, targets ≥ 44 px, `prefers-reduced-motion`.
- `t-kq-shots.js`: screenshots 360×740, 390×844, 1280×800 for klang, layer, lane, mixer, rain, library (`shots/shot.js` pattern) into `klang/shots/`.
- `t-eng-live.js`: for every new engine: play held 1 s with `setF/setY`, release, `hit` burst, L3 toggle, no console errors, `A.voices` empty afterwards; Gespinst web strip present and `voiceLoad()` includes it.

### 7.3 Regression suites (run unchanged, then fix expectations)
- `scratchpad/v2/func.js:82` – engine flood list `['neb','kor','hau','glo','mem','sai','sch']` → iterate `ENG_OPTS` keys (budget/voice caps per quality level); `v2/integrity.js`, `v2/levels.js`, `v2/latency*.js`, `v2/cost.js` (old vs new master render time: the thread move must not raise idle cost).
- `scratchpad/qa-main.js:66` – MACRO check per engine → iterate `ENG_OPTS` (every engine has two valid macro ids).
- `scratchpad/midi-tests/`: `t-map-nks.js:66` engine list → from `__M.ENG_OPTS`; `run-all.sh`, `run-map.sh`, `run-final.sh`, `soak-midi.js` (3-minute soak with fake nanoKEY/microKEY) unchanged.
- `scratchpad/motion-tests/`: `gm-script.js:81–105` is a copy of the app's PD block → regenerate from the new app (or make it read `__M.PD`); `run-all.sh` suites `t-gs-regen`/`t-gs-rezept` (derived `RG_S()`, new recipes), `t-gl-rassel` (`RAS_S` with mdr/jrg), `t-gl-schlafen` (web `{clear}`, season freeze, probes ended), `t-gq-soak`/`t-gq-rain` (rain with Moder/Jahresring/Gespinst, budget incl. web).
- `scratchpad/mixui/qa/` + `mixui/t/*.js`: `sources.log` (mxSrcText with new names and „(als Schale)“ fallback text), strip count +1 (Gespinst return), Fruchtkörper rows render `kqRow` with `mxd-` prefix, snapshots/morph include `gsp.*`.
- Parity: `v2/mk.sh` base vs new render of the 16 old presets (RMS within 0.5 dB – the old engines must not change).

### 7.4 Device checks (manual, documented in `klang/shots/` and a short log)
Mid-range Android (Snapdragon 695 class) in Chrome top-level tab and in the claude.ai frame; iPad Safari; desktop Chrome/Firefox: worklet load time, `playbackStats` underruns before/after the thread move with 6 Harz voices + Puls, library long-press vs scroll, 130 px field playable, speaker audibility of Amöbe/Moder/Elm hum (document, do not fix).

---

## 8. Build order and risk register

| Step | Scope | Gate |
|---|---|---|
| 1 | `MYZEL_DSP_SRC` base, helpers, contract, `ensureDSP`, bench updates (§7.1) | empty processor voice measured ≈ 0.06; offline bench loads the module |
| 2 | hlm (reed), rnk | both pass §7.1; Flöte/Flamme only if their rows pass |
| 3 | elm, jrg; library UI P1 (§4) | UI suites §7.2 green at 360/390/desktop |
| 4 | hrz glas/schale/stab, then zunge/teich | mode race, tuning table, burst audibility |
| 5 | mdr, boe, amo | swell, capture, lock |
| 6 | zpf (+ native), shn (+ jawari), glt (+ native) | Rast, glide, growth/afterglow |
| 7 | gsp (web, governor, strip, budget) | κ_crit, halo, panic, budget |
| 8 | presets, recipes, texts, README, parity, soaks, device checks | all suites green; release |
| 9 | reserves khl, rhz | their own rows |

| Engine | Main risk | Countermeasure | Metric |
|---|---|---|---|
| hrz | intonation, 1–2 s onset, mode 2/3 wins, Zunge/Teich by ear | delay − group delay + cent table; pluck seed; weights; audition bodies early | f0, t90, mode ratio |
| hlm | flute registers, > 1.2 kHz collapse | reed default; flute table + ceiling; hidden if failing | f0 per register |
| glt | static saturated sine; late Puls hits | Glimmen walk; r per second; state injection | dB/s, onset |
| boe | dead zones feel like silence; Puls = Hauch | fundamental floor; one-mode capture; gust-pluck | level over y, burst level |
| amo | hiss > 1 kHz, DC, loud | K_eff, DC block, normalisation, bass declaration | f0 lock, DC, aliasing |
| rnk | aliasing, pumping, inaudible position | width ≥ 3, clamped mass, no AGC | sidebands, tail RMS |
| shn | Saite twin, flageolet quiet | sell on Hand/E-Bow/Steg; zone gain | A/B vs sai, zone levels |
| zpf | pulse-train top end | irregularity, sub-sample placement, detune on rate | sideband floor, f0 |
| elm | laser patch | crackle gates arc, sparse jumps, folded hum | event rates, arc gating |
| mdr | no swell; lanes eat budget | direct-to-stem, gate scaling, finish −60 dB | +dB at 1.4 s, voices |
| gsp | drone on every hit; budget; scale change | κ_crit normalisation, governor, voiceLoad, glide retune | self-oscillation test, load |
| jrg | aging sours tuning; calendar gimmick | rate limit, cap −6 ct, reversible; identity on the position sweep | detune after 10 min |
| all | worklet thread move; iframe priority | load on selection; iframe toast; underrun scaling | `playbackStats` on device |
