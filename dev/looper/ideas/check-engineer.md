# Hexenring KONZEPT: adversarial engineering review

Reviewer stance: senior Web Audio / real-time DSP engineer. Subject: `dev/looper/KONZEPT.md` (draft of 2026-10-18),
checked against `myzel/index.html` (git `3f5b174`, search by name), the engineer's proposal and experiments, and new
experiments of my own.

**Method.** I used headless Chromium 141 (Playwright) on a 4-core Xeon, slot `crit`. The container has **no audio
device** (`/dev/snd` is missing; the live context runs on Chromium's fake output at 44.1 kHz) and **no WebKit**. Nothing
here says anything about Safari or a phone beyond what the code and the WebKit sources cited in
`dev/klang/research/webaudio.md` allow. My scripts are in
`/tmp/claude-0/-home-user-4claude/31b62666-e283-5142-ac94-5f41b61da83b/scratchpad/crit/` (index in §11).

---

## 1. Verdict in brief

The architecture is sound in three places:
- an audio-thread looper processor with clock-derived pass starts;
- a tap before the loop playback;
- Abdruck first.

The concept fails in two places where it promises more than the code can deliver: Wuchs, and the identity of Abdruck and
Wuchs. It is also silent at several points where the design will bite: takeover, tempo changes mid-pass, the makeup of
the Humus, and feedback through the hyphae.

| ID | Sev. | § | Finding |
|---|---|---|---|
| B1 | **blocker** | 0, 4.2, 10, 12 | Today's code cannot build Wuchs voices next to the live graph. The calibrate-style swap steals live voices, destroys the live Gespinst web, eats live Rhizom charges, breaks Elmsfeuer and ages the live Jahresring (measured). The engineer's numbers come from a page whose *whole* graph was the offline context. |
| B2 | **blocker** (claim) | 0, 4.2, 4.3, 9.2, 13 | "Mit gleichen Startwerten klingt der Wuchs wie der Abdruck" was never measured. Measured now, it is false at waveform level: −10…+4 dB re peak. Even Wuchs-vs-Wuchs identity fails for 5 of 28 sources, and superposition for 9. |
| M1 | major | 3.3, 3.5, 3.2 | Takeover after a retroactive tap (mid-pass, after a bar line, Korb onto a Schleife) is unspecified, so live and loop double. The grid harvest rule contradicts itself. |
| M2 | major | 0, 4.1, 4.2 | "Gespielt" is not "exactly what you heard": it is dry, the chain's LFOs run at a new phase, and per-source sends, route and Pumpen collapse into one strip. The capture is pre-mute, and the Wuchs strip copies use the current fader. |
| M3 | major | 4.1, 5.8, 4.2 Live | Hyphae, Live mode and the shared Gespinst web put loop-driven sound into *tapped* strips, so it is re-captured: doubled halos and feedback. |
| M4 | major | 3.3, 3.5, 4.1 | A single summed Humus fixes the source mask at capture. A per-loop source choice and "Alles" cannot be retroactive, and Korb-onto-loop breaks for "Alles" loops. |
| M5 | major | 3.6 | Seams: the notes do not give the onsets for 6+ sources. Nahtwahl is a rotation that swaps content. The Ausklang fold cuts Gong tails whenever the player goes on playing. The Auftakt overlay can double. The click metric misses level bumps. |
| M6 | major | 4.2, 3.6, 10 | Per-pass contexts (§4.2) contradict "ein Kontext pro Schleife" (§10). Notes held ≥ the loop length are re-struck. Tails multiply render cost and memory. Treu passes need not be re-rendered at all. |
| M7 | major | 3.7, 4.3 | Key and tempo changes against the ~1 s lead: an 8-bar loop can keep the old key for a whole pass, and the "late block → previous pass" fallback plays the *old* key. Abdruck loops cannot follow a tempo change mid-pass, and polymetric loops have no common seam. |
| M8 | major | 3.3, 3.7, 4.3 | Clock: the Takt must become the master of `SEQ`; today `faeClock` is the slave. Fractional tempo cannot pass through `P['seq.bpm']` (rounded to 1). MIDI-clock wander hides an in-pass drift of up to 80 ms. |
| M9 | major | 4.2, 10, 0 | Cost: "keine Stimme" is accounting, not CPU. The always-on capture is not counted. 0.13 is a floor. `watchUnderruns` will permanently cut the *live* budget and switch on `A.lite` when Wuchs load causes an underrun, which breaks the owner's rule automatically. |
| M10 | major | 4.2, 10 | The "85 blocks during a 600-ms stall" came from the *unpaced* run. Paced, the renderer stops with the main thread (0 blocks, measured). In Safari, worklet MessagePorts probably hop through the main thread. |
| M11 | major | 13.6 | The always-on Humus moves *every* iOS session to WebKit's non-real-time worklet thread, including sessions that never load it today. "wie heute schon bei jeder neuen Klangquelle" is inaccurate. |
| M12 | major | 4.2, 3.6 | Taumeln (shared drift, default ±6 ct, presets 14, max 80) detunes Abdruck loops against live playing by up to 2× the depth. This is not addressed. |
| m1–m14 | minor | various | Memory estimate, IndexedDB and iOS eviction, sample rate, lifecycle, undo in Wuchs, the pedal double tap, wrong numbers and (V) marks, names, "Alles" semantics, suspend overhead, Auslese is always Wuchs, latency against the Puls, Bewegung in Wuchs, Saite cache (§10). |

---

## 2. Focus 1 – Wuchs: can the engines be built into an OfflineAudioContext per loop?

### B1 · blocker · §0, §4.2, §10, §12 – the context swap corrupts the live instrument

**Claim.** §0: "…ohne deinem Live-Spiel eine einzige Stimme wegzunehmen (V, gemessen)". §10: "ein OfflineAudioContext pro
Wuchs-Schleife, mit den Stimmen und Offline-Kopien ihrer Kanäle". §12 names the refactor as "Körner, Rhizom und Wirbel
brauchen einen Weg in virtueller Zeit, Loslassen und Gleiten eine Zeitangabe". The engineer (§7.5) says voices are built
"through `calibrate()`'s synchronous context swap (`A.ctx`, `pitchMod`, `notePitch`, `Q`)".

**Evidence (code).**
- `calibrate()` swaps only `A.ctx`, `A.pitchMod`, `A.notePitch`, `Q` and the `neb.*` params, and it builds only Nebel.
  Every other engine reaches into further singletons:
  - `playNote` and `steal()`: the global `A.voices`, `VBUDGET`, `MAXV`, and `A.ctx.currentTime` for scoring and `kill()`;
  - `stripIn('fin')`: the default bus is a live node;
  - `gspWeb()`: `A.gsp` is "one myzel-web node for every Gespinst voice"; a context mismatch calls `gspDrop()` and then
    rewires `MIX.src[*].gS`;
  - Rhizom: `RHZ.q`, `RHZ.sp.refr` (net exhaustion in *live* audio time) and `RHZ.vs`, with `rhzRun(Infinity)` inside the
    start when `rhzAhead()`;
  - Elmsfeuer: `A.elmDrift` is rebuilt per context and fed from the live `A.driftSrc`;
  - level 3: `A.uni[]`;
  - shared bend buses: `A.bendSrc` and `MIDI.buses`;
  - `MOD` (`MOD.ctx === A.ctx` guards);
  - Jahresring: `A.jrgAge`, `A.season`, and `jrgCount()`, whose rate limit is `performance.now()`;
  - `A.lite`, passed into every `wkVoice` as `processorOptions.lite`;
  - Körner: `A.grainVoices`, run by the live `tick()` → `grainTick`;
  - Saite: `KS_CACHE`, which hands out a *neighbouring* buffer at a shifted rate while the worker computes the exact one
    (`ksBuffer`);
  - `Voice.finish`: cleanup timers computed from whichever `A.ctx` is current.
- Scale: the engine region (`class Voice` … `startBordun`) has 104 `A.ctx`, 90 random draws (`Math.random`, `rand`,
  `pick`), 23 `currentTime` reads ("act now" moves and releases) and 203 `P[...]` reads that would need a parameter
  snapshot for "eigener Klang".

**Evidence (C1, `c1-swap.js`).** A live, running context. Offline voices were built inside a calibrate-style swap with
their own offline bus:

| Probe | Result |
|---|---|
| live budget full (39/40), then 12 offline Gong voices | **1 live voice stolen.** `steal()` kills it with the *offline* time, so the ramp lies in the past: a hard cut. **11 of the 12 offline voices** were stolen by the next offline note; 1 survives. The pass would render with one note. |
| live Gespinst note, then one offline Gespinst note | **the live web is gone** (`A.gsp` → none); `InvalidAccessError` in `gspWeb`. The live halo stops. |
| offline Elmsfeuer note | 0 voices built (`InvalidAccessError`: live `driftSrc` → offline gain); `A.elmDrift` now belongs to the offline context. |
| offline Jahresring, 6 hits | **live `A.jrgAge` 0 → 2.** The render ages the live bar; only 2 of 6 hits count, because of the wall-clock rate limit. |
| live Rhizom strike with 4 charges queued, then an offline strike | **live charges 4 → 2**: `rhzRun(Infinity)` ran the live queue with `A.ctx` swapped; `InvalidAccessError` in `rhzPing`. The live cascade is cut short. |

**Why the engineer's numbers did not see this.** `lib.js`'s `__off()` calls `initAudio()` *into* the offline context. It
rebuilds the whole app graph there, and no live graph exists while it renders. That harness measures render speed and
determinism. It never tests coexistence, which is what the concept needs.

**Fix (pick one, and state it in §10/§12).**
1. **Render context object.** Every engine and helper takes an explicit `R = {ctx, voices, budget: ∞, pitch buses, uni,
   drift, gsp, rhz net/queue, jrg state, P snapshot, RNG, lite: false, Q: QP[3]}`, and every deferred scheduler
   (`grainTick`, `rhzRun`, `rollTick`, `gspTick`) iterates per context. This is a full engine refactor (≈ 500
   touch points). It is the "biggest refactor" of §12, but several times larger than §12 says.
2. **A render frame ("Werk-Rahmen"; my recommendation to evaluate first).**
   - A hidden same-origin `<iframe>` loads the same `index.html` with a render-only boot flag: no UI, no storage writes,
     no MIDI, no Gestik, no live context.
   - A second JS realm gives every singleton (`A`, `RHZ`, `MOD`, `KS_CACHE`, `Q`, `VBUDGET`) its own copy for free. The
     engines stay untouched apart from the RNG indirection and the `at`-times.
   - The realm's OfflineAudioContexts send blocks to the live `myzel-ring` through a transferred MessagePort, as in E9.
     Same-origin realms can transfer ports.
   - Costs: a second heap (tens of MB) and the same main thread. It must be checked in the claude.ai view (CSP for
     nested frames) and in the PWA.
   - Web Audio has no Worker path (no OfflineAudioContext in workers), so the iframe is the only second realm with audio.
3. Whatever is chosen, §0's "(V, gemessen)" becomes **(A)**. The owner should read §12 as "Etappe 2 needs either a
   render frame or a context object through all 28 engines".

### Determinism: is "same seeds = −108 dB" realistic for all 28 sources?

Setup: E8 rerun on all 28 sources (`e8.js`, the engineer's harness: global `Math.random` reseeded per note; `WARM=1`,
i.e. shared tables built first; tap at the strip pre-Pumpen; 4 s). "same" = two renders, same seeds; "superpos" =
full − (without note 2) vs note 2 alone (the basis of delta re-growth).

| Result | Sources |
|---|---|
| identity holds (−104…−145 dB) | neb, hau, glo, mem, sch, gng, klb, obt, stm, tie, hlm, rnk, elm *(only after a warm-up note; cold −7.1 dB)*, hrz, shn, zpf, glt, mdr, boe, amo, rhz *(in isolation)*, khl |
| borderline | trp −86 dB |
| **identity fails** | **kor** +5.2 / −1.5 dB (L1/L3), **gsp** +5.6 / +4.0, **swm** −2.7 / +0.9, **sai** +1.6, **jrg** −42.9 |
| **superposition fails** | rhz −1.4, mdr −1.3, trp −11.6, klb −42.5, jrg −30.8, kor, gsp, swm, sai (all ≥ 0 dB) |

**The chaotic sources are fine.** In `e8d.js` notes were held for 15 s in a 20-s render. amo, glt, boe, mdr, hrz, elm,
shn and khl stay at −131…−141 dB in every segment (0–4, 4–10, 10–17 s). The −10⁻⁷ residue does not grow: the feedback
loops themselves are bit-stable, and the residue comes from the output stage. Glut, Amöbe and Elmsfeuer are not the
problem; *state* is:
- Saite: the KS cache substitution;
- Körner: textures and grain-tick timing;
- Gespinst: the singleton web and its async build;
- Schwarm: lazily built chirp buffers;
- Jahresring: age, season and the wall-clock rate limit;
- Rhizom, Moder, Kalimba, Tropfen: interaction between notes (superposition).

**Reformulate §4.2:** "Gleich für 22 der 28 Quellen (gemessen −104…−145 dB); Körner, Saite, Schwarm, Gespinst,
Jahresring und Tropfen brauchen Zustandsarbeit, bevor ‚Treu‘ für sie gilt. Delta-Neuwuchs nur für Quellen, deren Noten
sich nicht beeinflussen (nicht Rhizom, Moder, Kalimba, Tropfen, Jahresring, Gespinst)."

### B2 · blocker (claim) · §0, §4.2, §4.3, §9.2, §13 – Abdruck ≠ Wuchs

**Claim.** §4.2: "Mit gleichen Startwerten klingt der Wuchs wie der Abdruck. Gemessen (V): … −108 bis −144 dB … Jeder
Wuchs-Durchgang beginnt deshalb bei Sample 0 seines eigenen Kontexts, mit den gemeinsamen Modulatoren in fester Phase; so
gilt die Gleichheit durch Bauart." §4.3: Abdruck with notes on a tempo change becomes "dieselbe Darbietung im neuen Tempo;
kehrt zum Abdruck zurück". §9.2: "verlustfrei in beide Richtungen".

**Evidence.** E8 compared Wuchs against Wuchs: both renders start at sample 0 with the same modulator phase. A live
Abdruck can never start at sample 0. Its notes sit wherever they fell relative to:
- the shared vibrato (`A.vibLfo`, 4 ct at 4.5 Hz by default);
- Taumeln (`A.driftSrc`, a random 32-point curve, ±6 ct by default);
- the four level-3 unison wanderers (`A.uni`, 3.5 ct);
- the 128-frame grid.

I rendered the same notes with the same seeds 1 s later (block-aligned) and shifted the result back (`e8b.js`, `e8c.js`,
strip tap):

| | neb1 | gng3 | amo3 | glt3 | rhz3 | klb3 | boe3 |
|---|---|---|---|---|---|---|---|
| default Bewegung | +1.6 | −0.9 | +3.0 | +3.8 | −1.7 | −10.1 | −6.0 |
| vib = drift = pan = 0 | −12.7 | −1.6 | **−117.8** | **−117.4** | −2.0 | −21.2 | **−118.1** |
| … and 37 frames off-grid | −13.2 | −1.7 | −9.5 | −34.8 | −2.0 | −20.0 | −18.5 |

(dB of the maximum difference re the signal peak; hrz −3.7, shn −0.2, elm +2.3, hlm 0.0 and stm +2.4 with default
Bewegung.)

Only three sources null at all, and only with the shared modulators off and the shift block-aligned. A null test is
pessimistic for perception, since a few cents of drift ruin the null and may be inaudible. The opposite claim
("unhörbar gleich") is just as unmeasured. A switch from Abdruck to Wuchs (key, tempo, Eigensinn, Auslese) therefore
brings a **sibling performance**:
- the same notes and seeds;
- another vibrato/drift/unison phase;
- another Gespinst halo (§12 admits this);
- another Rhizom net state;
- possibly another level (Q3).

**Fix.**
- **Concept text (German, §4.2):** "Mit gleichen Startwerten klingt jeder Wuchs-Durchgang wie der vorige. Der Wechsel
  vom Abdruck zum Wuchs ist dagegen eine neue Darbietung derselben Noten: Vibrato, Taumeln und die Schwebungen der
  Stufe 3 stehen an anderer Stelle, das Netz und der Hof antworten anders. Wie nah das klingt, entscheidet ein
  Hörvergleich (Etappe 0)." Remove "verlustfrei in beide Richtungen" from §0 and §9.2. Re-ask §13 Q2/Q3 with this fact.
- **Engineering, to approach identity:** stamp each note with the phases of all shared modulators at its start frame:
  - Taumeln is deterministic: the buffer plus the integral of `driftRate/4`;
  - the LFOs' phases follow from their frequency histories;
  - add the note's sub-block offset.

  Start the offline modulators at those phases, and the context at a frame congruent to the live frame mod 128. Then
  measure **live tap vs offline re-render** (a new test: record a phrase through the Gespielt tap in a live context,
  re-render it, null-test it, and ABX on the owner's ears). This will not cover Gespinst, Rhizom or Jahresring: their
  shared state is musical coupling, not noise.

### Safari and iOS: an AudioWorklet in an OfflineAudioContext, and port transfer

- **Not verifiable here** (no WebKit).
- Chromium: verified. `addModule` works in an OfflineAudioContext (E7 and my reruns). A MessageChannel port transferred
  into a worklet of an offline context and one of the live context delivers worklet to worklet: 703/703 blocks (`e9b.js`).
- WebKit: an offline worklet runs at QoS `Default` (webaudio.md §2, `wk_AudioWorkletThread.cpp:78`). By the spec and WPT
  it is likely to work on Safari ≥ 14.1, but nobody has run it.
- **Risk to check (A, from WebKit's architecture):** worker and worklet `MessagePort`s in WebKit go through
  `WorkerMessagePortChannelProvider`, which posts via the main thread. If that is so, Safari's "direct" transport depends
  on the main thread too (see M10).
- **Messtag list (Etappe 0), concretely:**
  1. `addModule` into an OfflineAudioContext;
  2. `suspend()`/`resume()` pacing;
  3. a port transferred into both scopes, with delivery while the main thread is blocked for 600 ms;
  4. live underruns while 1/2/4 offline renders run;
  5. the memory of N concurrent offline contexts with worklets (one global scope each).

---

## 3. Focus 2 – the "Gespielt" tap and playback through the Hexenring strip

**Code facts.**
- Strip: `in` (fader × expression × Gestik-Ausdruck × Schlafen = `stripGain`) → EQ (`byp`/`wet`) → width (`mBy`/`mWet`) →
  `duck` (Pumpen) → `dry` (mute/solo gate, `gates()`) → route (`A.voiceBus` = **the insert chain on the sum**, or
  `A.masterSum`).
- Sends `eS`/`hS` hang off `duck`. For `fx`-routed strips at 100 % send, the echo and hall input *is* the chain's output
  (`updSends`: `S.fromFx`).
- So the insert chain is **one chain on the sum**, not per strip: drive, ring, filter with LFO, phaser, chorus, auto-pan.

**What holds.** Abdruck and Wuchs playback never feed the Humus:
- the tap is on the source strips;
- playback goes to the Hexenring strip, which is not tapped;
- the returns are not tapped.

Echo and hall tails cross seams naturally. The Ausklang fold (dry) feeds the live echo and hall again, consistently: no
double echo, because the first pass's echo came from the live sound, and from the second seam on it comes from the
loop's dry audio. This part of the concept is right.

### M2 · major · §0, §4.1, §4.2 – "Abdruck = Sample für Sample, was du gehört hast" is not true for "Gespielt"

1. **Dry.** §0 sells the Abdruck as "den genauen Klang, mit Raum, Nachklang…". In "Gespielt" it holds no chain, echo or
   hall; they are re-applied live. Only "Alles" holds the room.
2. **The chain's modulators run at a new phase.** Filter LFO (`A.fltLfo`), phaser, chorus, auto-pan (Kreisen,
   `mov.pan` 0.25 at 0.07 Hz by default) and the ring oscillator process each pass at whatever phase they have now. A
   filter sweep or auto-pan heard while recording is not what the loop gets. Drive and ring are nonlinear on the *sum*
   with the live playing (this matches the original situation; just say so).
3. **Per-source sends, route and Pumpen collapse.** "Gespielt" sums fin + eb2 + rgn + gsp into one stereo buffer, which
   plays through one strip "Hexenring" with one echo send, one hall send, one route and one Pumpen depth. Say fin was
   sent 100 % to the hall, eb2 0 %, and Regen went `dir`. Then the loop gets one compromise; the claim "dieselbe
   Effektkette … dieselben Echos und Hallräume" holds only when all tapped strips have identical route, send and Pumpen
   settings. A source routed `dir` (past the chain) gains the chain on playback.
4. **Pre-mute.** The tap sits before `dry`, so a muted or soloed-away strip is captured though it was not heard.
5. **Wuchs strip copies.** "Offline-Kopien ihrer Kanäle" with the *current* source fader double-apply the fader: once in
   the copy, once at the Hexenring strip. Wuchs loops would also follow the live fader of their source while Abdruck
   loops do not.

**Fix.**
- Either capture **per source** (memory × number of sources; see M4 for the cost) and play each through a sub-strip
  that mirrors its source's route, sends and Pumpen as they were at capture, or state the compromise and default the
  Hexenring strip to the settings of the dominant source.
- Gate the tap by the source's mute/solo state.
- Freeze the source strip's gain into the Wuchs copy at capture, as a snapshot or a recorded automation curve.
- Rewrite §0: "den genauen Klang deiner Quellen mit ihrem Nachklang; Kette, Echo und Hall kommen bei jedem Durchgang live
  dazu (‚Gespielt‘) – oder genau die gehörte Summe (‚Alles‘)".

### M3 · major · §4.1, §5.8, §4.2 "Live" – feedback and double capture through the tapped strips

"Nichts koppelt zurück" holds only while no loop drives a voice or the Gespinst web:
- **Hyphae into Gespinst.** The loop excites the shared web. The web's answer comes out on strip `gsp`, which is
  *tapped* (§10 diagram: "Feld · Ebene 2 · Regen · Gespinst"), so every later harvest or Schicht records the web's
  response to the loop. Played back with the hyphae on, it excites the web again: a Riley accumulator nobody asked for,
  plus doubled halos.
- **Hyphae into Rhizom, Regen or Körner, and "Live" mode.** These are real voices. Unless `o.bus` points at the Hexenring
  strip, they land on `fin` and `rgn`, which are tapped, and the next harvest records the loop's own notes.
- **Gespinst web coupling in Live mode.** Even on the Hexenring bus, Gespinst voices send into the one shared web
  (`gspSend` → `A.gsp.inp`), whose output is tapped.

**Fix.**
- A rule in §4.1: everything a Schleife makes sounds on an *untapped* path.
- Give loops their own web instance for hyphae, or exclude `gsp` from the tap while any loop feeds the web (and say the
  live halo then goes uncaptured).
- Route every loop-driven voice to the Hexenring bus.

---

## 4. Focus 3 – seams

### M5 · major · §3.6 – seam rules that will bite

1. **"Die Noten sagen genau, wo die Anschläge liegen"** is false for sources whose onsets live *inside* a voice:
   - Rhizom pings: the cascade sits inside one `playNote`;
   - Körner grains;
   - Schwarm chirps;
   - Elmsfeuer, Moder and Glut crackle;
   - Tropfen drops.

   Bowed, blown and swelling sources (Harz, Halm, Böe, Moder's swell) sound their onset well after the note-on, so the
   5 ms before / 60 ms after window is wrong for them. Fix: combine the note list with an audio onset detector (spectral
   flux on the Humus) and per-source attack offsets.
2. **Nahtwahl is a rotation, not a trim.** The engineer's §7.4: the cut point c ∈ [T0 − ½ bar, T0 + ½ bar] keeps length L,
   so [c, T0) from *before* the pass replaces [c+L, T1) at its end. With a repeated motif this swaps one performance for
   another (harmless, but no longer "der letzte Durchgang", nor the Wurf the notes say). With a first, unrepeated take,
   [c, T0) is whatever came before, such as the rubato intro. Fix: rotate only inside material that "Wiederholung
   erkennen" confirmed as repeated; otherwise cut at T0 and join with the crossfade. Cut the note list at the same c.
3. **The Ausklang stops at the next new note, which is the normal case.** A player who keeps playing after the pass (the
   next repetition, or anything) stops the fold within 30 ms. From pass 2 on, an Abdruck Gong tail is chopped at the
   seam, unless the start of the buffer happens to hold a ring-in (warm start: a repeated motif). For a phrase followed
   by *different* playing, "Nähte, die einem Gong gerecht werden" fails. Fix:
   - with per-source lanes (M4), a new note on another strip does not stop the fold;
   - for Abdruck with notes, render the missing tail once from the cut-off notes and splice it in. This is a sibling
     performance (B2), but only of a decaying tail, behind a 30-ms crossfade.

   Also say which sources count as "dein nächster neuer Ton": a running Sporenregen makes notes all the time.
4. **The Auftakt overlay** lays the pick-up's audio onto the loop's last beats. A player who closed with their own
   anacrusis (common) gets it doubled. Offer it only when the end window holds no onsets, otherwise as a chip.
5. **The click metric** (third difference) misses what an equal-power crossfade of *partly correlated* sustained material
   does: a level bump or dip and a short comb (flanging) blip. E10's test signal is a stationary sine, the benign case
   for crossfades. Add a short-term RMS continuity check (±1 dB over 10 ms windows) and a spectral-flux check on real
   Gong, Harz and Bordun material to the test plan.

### M6 · major · §4.2, §3.6, §10 – per-pass contexts, tied notes, tails

- **Inconsistent.** §4.2 has "jeder Wuchs-Durchgang … bei Sample 0 seines eigenen Kontexts", §10 "ein
  OfflineAudioContext pro Wuchs-Schleife". The platform decides: an OfflineAudioContext has a fixed length, its render
  target is allocated for that whole length, and it cannot be reused after rendering. A context that runs for the
  session is impossible (10 min of stereo = 230 MB). It is per pass, or per few passes.
- **Ties.** With per-pass contexts and overlap-add, a note held *across* one seam works: pass k's voice rings on in pass
  k's tail. But **a note held for ≥ the loop length** (a drone under a 2-bar loop, a held Glut) is re-attacked at
  every pass. That contradicts "ein gehaltener Ton über die Naht gebunden … Eine Glut glüht weiter". Physical state
  (Glut, the Gespinst web) cannot cross contexts. Fix: such notes go into one long-lived "Bordun context" chain
  (re-seeded per segment, with a crossfade), or §3.6 states the limit.
- **Tails cost.** Each pass renders pass + tail:
  - render cost × (1 + tail/pass): e1's 0.04–0.21× already contains 1.5 s of tail; a 10-s Gong tail on a 2.9-s one-bar
    loop is ×4.4;
  - k = ⌈(pass + tail)/pass⌉ overlapping streams in `myzel-ring`: the cost of a Wuchs loop is about 0.13 × k, not "0";
  - k render targets in memory.
- **The missing optimisation.** A *Treu* Wuchs pass is identical every time, by construction. Render it **once per
  change** and loop it with overlap-add. Only Lebendig, Variieren and Wandern need per-pass renders. This turns "can a
  phone keep up?" from N loops × every pass into the number of *living* loops.

---

## 5. Focus 4 – clock

### M8 · major · §3.3 (5), §3.7, §4.3 – the Takt versus `SEQ`

- **Direction.** "Er entsteht aus dem Taktgeber der Fährte" and "Startet der Puls … reiht er sich in ihr Raster ein"
  pull in opposite directions in today's code. `faeClock` is *slaved* to `SEQ`: it copies `SEQ.anchorT/anchorB/bpm`
  minus an offset, and moves its loop by ≤ ½ bar (`faeAlign`) when the Puls starts.

  Making the Takt the master means the Puls follows it:
  - `seqStart` must anchor on Takt bar lines; today `anchorT = now + 0.06` and `anchorB = b0`;
  - so must `seqRetempo`, Sporenregen (`rgRebase`) and `clkOutTick`;
  - `clkFollow`, which re-anchors `SEQ` on *every* MIDI-clock pulse to a past pulse time (`anchorT = ctxAt(C.t0)`), must
    become slews into the future, or Puls and loops disagree by the PLL error.

  It is a refactor of `SEQ`, not a clock beside it. The midi tests must be re-run.
- **Fractional tempo.** §3.3 (5): "Puls und MIDI-Clock-Ausgang folgen ihr genau, auch mit Nachkommastellen". But
  `NUM('seq.bpm', …, { step: 1 })` and `sanitize()` round every `setParam`. `tapTempo` rounds too, and presets reload
  rounded. A first loop at 91.37 BPM written into `seq.bpm` becomes 91, which is 0.4 % of drift. The concept needs a
  `SEQ.ext`-like "Takt leads" source (`seqBpm()` returns it; the slider shows it and is inactive or relative) and a rule
  for what the 1-BPM slider does to a fractional Takt.
- **MIDI-clock wander.** §4.3: "Originalgeschwindigkeit, an jeder Naht auf ≤ ½ Sample neu ausgerichtet (V)". The ≤ ½
  frame is the *start* precision (E4). Inside the pass, an Abdruck at its original speed drifts from the external grid by
  up to wander × pass length: 0.5 % × a 16-s 8-bar pass = **80 ms at the end of the pass**, then jumps back at the seam.
  That is audible against an external drum machine. The owner's rule makes this a decision: varispeed (≤ 8.6 ct at
  0.5 %, best resampler) / re-phase jumps / Wuchs. E4 also had the clock in `processorOptions` from the start. The live
  path (segments streamed from the main thread, `currentFrame` stalls, the PLL) is untested.
- **External Start/SPP while loops run.** The external device owns the downbeat, and Myzel cannot move it. The loops
  must re-phase, with a crossfade and a toast, as the engineer's §7.2 says. The concept is silent.

### M7 · major · §3.7, §4.3 – changes versus the lead

- **Key.** "Wächst ab der nächsten Naht" needs the first Wuchs pass rendered ≥ the lead (~1 s) *before* that seam. A key
  change < 1 s before a seam is followed only at the *next* one. For an 8-bar loop that is a full pass in the old key.
  The safety net makes it worse: "Kommt ein Block doch zu spät, spielt … der vorige Durchgang" plays the **old key**
  against the new harmony. Fix:
  - a key change acts at the first seam ≥ lead away, and the UI says when;
  - a miss right after a follow-change fades the loop out and never plays the old pass;
  - planned changes (Lichtung, Treffen, Knospen) render in advance.
- **Tempo, mid-pass.** "Neue Tempoabschnitte beginnen in der Zukunft" at a bar line. An Abdruck loop in mid-pass then goes
  on at the old tempo until *its* next seam. Example: 84 → 90 BPM with 2 bars of an 84-BPM pass left, about 0.4 s off by
  the seam. Loops of 4, 5 and 7 bars have no common seam for 140 bars. Fix:
  - switch Abdruck-with-notes to Wuchs *at the tempo change point*, with a crossfade there;
  - the Wuchs context renders the pass from its start (pre-roll) and is heard from the change point;
  - for pure audio, the Q4 decision applies mid-pass as well;
  - alternatively, quantise tempo changes to the next seam of the longest Abdruck loop and say so.

---

## 6. Focus 5 – retroactive "Korb auf Schleife ziehen" and the Humus

### M4 · major · §3.3, §3.5, §4.1 – what exactly is in the Humus?

- The engineer's Humus is one stereo ring (25 MB): the masked sum of the strip taps. The concept offers the source "per
  Schleife" (Gespielt / Alles / Mikro, and Puls/Bordun "außer du wählst sie"). A retroactive harvest can only take what
  the Humus mask held at capture:
  - "Alles" retroactively needs a second ring on the pre-master sum (+25 MB);
  - the mic a third;
  - per-strip choices (only Ebene 2; with the Puls) cannot be made after the fact;
  - nine per-source rings would be 221 MB.
- **Separation from the loops: correct for Gespielt.** The taps sit before the Hexenring strip, so the Humus never hears
  Abdruck or Wuchs playback. Korb-onto-loop works, with M3's exceptions (hyphae, Live, Gespinst).
- For an **"Alles" loop**, the last pass *contains the target loop's own playback*. Dragging it onto the target
  re-records the loop into itself. Rule: Korb-onto-loop always takes the Gespielt Humus.
- **Loops of different lengths.** "Der letzte Durchgang, den du über diese Schleife gespielt hast" must be defined:
  - the last *completed* pass of the target, ending at its last seam? For an 8-bar target that may have ended 7 bars
    ago, without the player's freshest attempt;
  - or the pass in progress, completed at the next seam?

  Say which, show it on the ring (a filling arc), and say what happens if the player stops before that seam.

**Fix.** Define the Humus as two rings (Gespielt sum, Alles sum: 49 MB in Float32) plus the notes Humus. A per-strip mask
applies only to *armed* recordings (Hauptknopf), not to harvests. State that in §3.3 and §4.1.

### M1 · major · §3.2, §3.3, §3.5 – takeover is undefined

- **The tap mid-motif.** "Tippe, wann du willst, auch mitten im Motiv … läuft phasengleich weiter, als hättest du
  weitergespielt." At the tap T the loop enters at phase φ.
  - The player's notes of the last φ seconds are ringing *live*.
  - The loop at φ holds the same notes' tails from the previous repetition, so they double (flam or chorus).
  - A player who goes on for a moment (the natural reaction) plays in unison with the loop until they stop.
  - A player who *stopped* before tapping hears the loop come in mid-motif: φ = the time since the motif ended.
- **Hauptknopf "schließen" just after a bar line** ("Ein Tipp kurz nach dem Taktstrich meint diesen Taktstrich"): the
  loop's first pass starts late by the tap delay, i.e. mid-attack of the downbeat, plus doubling with the live notes.
- **Korb onto a loop:** when does the new Schicht enter? Mid-pass means doubling with the player, who is still playing
  over the loop.
- **Contradiction in §3.3:** "…die letzten 1, 2, 4 oder 8 Takte **bis zum Taktstrich, den du gerade gehört hast,
  einschließlich des laufenden Takts**". The window ends at the past bar line, *or* it includes the running bar and so
  ends at the *next* bar line (the engineer's version). In the second case the loop cannot "sofort" play, and the player
  must keep playing to the bar's end.

**Fix (choose and write it down).**
- (a) **Default: entry at the next seam.** The tap marks *which* repetition; the loop enters at the end of the one in
  progress, which the Humus completes. The player stops at the seam, and nothing doubles or enters mid-note.
- (b) **"phasengleich" as an option** for the free first loop, with the honest note "bis du aufhörst, klingt beides".
  For Wuchs only, loop notes whose live twin is still sounding can be gated until their next onset.
- (c) Rewrite the grid sentence: "bis zum Ende des laufenden Takts (ein Tipp im ersten Viertel des Takts: bis zu seinem
  Anfang)".

---

## 7. Focus 6 – memory, persistence, lifecycle

### M11 · major · §13 (6) – the always-on Humus and the thread move on iOS

- `dspMaybe()` loads the module only when a worklet source is selected (or previewed). Sessions that play Nebel, Glocke,
  Gong, Kalimba or the other 13 native sources stay on the device's render thread today.
- An always-on Humus needs `myzel-ring` from the first note. That moves **every** iOS session to WebKit's
  `AudioWorkletThread`, which runs at QoS UserInteractive, not real time (webaudio.md §2). It also exposes those sessions
  to the iOS worklet bugs listed there:
  - glitches after any worklet (bug 221334, open);
  - a silent worklet on iOS 17.6/18.0.1 until another tab plays.
- "wie heute schon bei jeder neuen Klangquelle" is true only for the 11 worklet sources.
- **Fix.**
  - Q6 must say "auch wenn du nur Nebel oder Gong spielst".
  - Messtag: underruns on iPhone/iPad with *native sources only*, with and without the Humus.
  - Fallback for iOS: a notes-only Humus, where harvesting re-grows from the notes (Wuchs) until the first loop exists.

### m1 · minor · §10 – the memory estimate

The "≈ 100 MB" (6 × 4 × 7.7 s + Humus + 3 MB) leaves out:
- the margins of ±½ bar: +3.85 s per 7.7-s 2-bar Schicht;
- the Ausklang, up to 8 s like `rec.tail`;
- the undo/redo history;
- "gelöschte Schleifen … bis zum Ende der Sitzung";
- the second Humus ring (M4);
- the Wuchs render targets, allocated whole per context and k per loop (M6);
- one worklet global scope per offline context.

With margins and tails the typical evening is closer to 150–200 MB. The tab also holds the takes (in RAM, ≤ 460 MB for
20 min), `KS_CACHE` (≤ 1e7 frames = 40 MB), the IR and the textures. iOS kills tabs well below 1 GB on older devices.
Fix: one global audio-memory budget (takes + loops + Humus + caches), a lower default on iOS, and estimates that include
margins and tails.

### m2 · minor · §7, §10 – IndexedDB and storage

- Safari's ITP deletes script-writable storage of a site not opened for 7 days unless it is a home-screen app. Ask for
  `navigator.storage.persist()`, show `estimate()`, and say "auf dem iPhone nur als installierte App dauerhaft".
- Writing a 3–8 MB Schicht with `put` (a structured clone on the main thread) during a performance causes jank. Write it
  in ≈ 4-s segments, as `backupSegment` already does, during idle time.
- The v2 upgrade can be blocked by another open tab still on v1 (`onblocked`): say so.

### m3 · minor – sample rate

`SR = ctx.sampleRate` is the device rate: 44.1 kHz on many Androids and PCs (this container's live context too). Store
the SR per Schicht. Restoring on another rate needs the best resampler, and that is a sound decision to show the owner.
Wuchs contexts must use the live SR.

### m4 · minor – lifecycle gaps

- `restartAudio` (a reload) is refused "while recording". Define it for an always-on Humus: allow the reload, lose the
  Humus with a warning, keep the persisted loops.
- **Stille:** does it clear the Humus? Does it cancel renders?
- **Pacing** compares offline time with *wall* time (E2/E9). It must follow the live context's `currentTime` (reported by
  `myzel-ring`), or a suspended or interrupted live context lets the queue overflow.
- **Hidden page:** timers are throttled and the pacing stalls, so Lebendig loops freeze into repetition. Say so.
- **`A.lite` and `Q`** must never leak into Wuchs ("beste Stufe"). Today they are globals read in `wkVoice` and the
  engines.

---

## 8. Focus 7 – cost honesty

### M9 · major · §0, §4.2, §10

1. **The Humus capture is not counted.** 0.40 units for nine stereo inputs run from the first note, but §10 counts them
   "solange Schleifen spielen". Count the capture whenever the Humus runs.
2. **0.13 per Schicht is a floor.** The prototype (`loopproc.js`) has none of the following, and their costs must be
   measured and entered:
   - the resampler (speed with inertia, Band, "bester Resampler": a windowed-sinc polyphase at a varying ratio per
     Schicht);
   - the Abrieb and Kompost filters;
   - the k overlapping Wuchs streams;
   - message handling for streams;
   - meters;
   - the per-Schicht fades on undo or mute.
3. **Wuchs: "keine Stimme" is accounting.** The device pays with CPU:
   - one Gong-type loop re-rendered every pass costs about 0.21 of a server core for a *sparse* 22-note phrase (voices
     only; the whole graph 0.32), × (1 + tail/pass) for long tails;
   - 8 such loops are 1.7 server cores;
   - on a phone the render may land on a little core (3–4× slower than a big one, on top of the 2–4× gap to the server
     core).

   Main thread (C2, `c2-build.js`): building a pass costs 1–13 ms per second of music per loop on the server (Körner 13,
   Elmsfeuer 5.5, Jahresring 3.9, Gong 2.7), plus 23–33 ms of context and module setup per pass. Both compete with the
   UI and `tick()`.
4. **The underrun handler punishes the live sound.** `watchUnderruns()` reacts to *any* underrun: `A.budgetScale *= 0.8`,
   `A.lite = true` and `applyQuality()`, permanent for the session. Background Wuchs load or thermal throttling then
   *cuts live voices and lightens the live processors*. That is exactly what §0 says can never happen, and it breaks the
   owner's standing rule automatically. iOS reports no `playbackStats`, so there glitches go unseen instead. Fix:
   - a Wuchs scheduler with a CPU share predicted from `CAL.unit` (load × unit × duration);
   - on an underrun it **first** pauses renders (Lebendig → cached Treu → Abdruck) and only then touches the live budget;
   - Treu passes are cached (M6).
5. **§12's "(A) zwei- bis viermal langsamer"** is optimistic for little cores. Measure throughput on the owner's phones
   *with the screen on, the UI animating, and after 10 minutes* (thermal).

### M10 · major · §4.2, §10 – the main thread and the transport

- **What was measured.** §4.2: "…auch während der Haupt-Thread hängt: 703 von 703 Blöcken kamen an, 85 davon während
  einer Blockade von 600 ms". I re-ran E9 with a pacing log (`e9b.js`):
  - **paced** (the proposed mode, lead 1.25 s): **0 blocks** arrived during the 600-ms stall;
  - **unpaced** (`FREE=1`): 173.

  The pacing (`suspend` → main-thread `setTimeout` → `resume`) and the voice building both run on the main thread, so
  the renderer stops when the main thread stops. What actually carries a stall is the ~1-s lead already queued in
  `myzel-ring`.
- **Reformulate (German):** "Ein Vorlauf von gut einer Sekunde überbrückt Hänger der Seite bis zu dieser Länge; der
  Renderer selbst steht, solange die Seite hängt." Keep the lead adjustable, and for cached Treu passes larger.
- In Safari the port itself may hop through the main thread (see §2 above).

### Suspend overhead (minor, m10)

Continuous Höhe, glide and MPE curves replayed at suspends cost about 50 µs per suspend on an idle main thread and about
120 µs with a half-busy one (C3: 2000 suspends per 6-s pass = 0.10/0.24 s). Do the `at`-time refactor (the curves as
AudioParam automation scheduled ahead) rather than one suspend per event.

---

## 9. Focus 8 – (V) marks and numbers that do not hold

| § | Statement | Status |
|---|---|---|
| 0 | "ohne deinem Live-Spiel eine einzige Stimme wegzunehmen (V, gemessen)" | Measured only in an isolated page; with today's code it steals live voices (C1). → **(A)**, with B1's fix. |
| 4.2 | "Mit gleichen Startwerten klingt der Wuchs wie der Abdruck … (V)" | Measured Wuchs vs Wuchs; Abdruck vs Wuchs differs at signal level (B2). |
| 4.2 | "−108 bis −144 dB" | Range of the passing sources in my rerun: −86 (Tropfen) … −145. Five sources fail. |
| 4.2 | "Gleiche Noten 37 Samples neben dem 128er-Raster wichen dagegen **nur** um −9 bis −38 dB ab" | "nur" inverts the meaning: −9 dB is a large difference. Rerun: −49 … **+5.2 dB** (Glocke), +3.4 (Elmsfeuer). Write "um bis zu …, also deutlich". |
| 4.2 | "…85 davon während einer Blockade von 600 ms" | Unpaced mode only; paced 0 (M10). |
| 4.2 | "Ein schweres Hintergrund-Rendern störte den Live-Klang nicht" (V) | Headless Chromium with a *fake* output device (no `/dev/snd`; callbacks arrive in ~10-ms bursts, p99 10–11 ms with or without the render), 4 cores. It cannot show real-time starvation. → (A) for phones. |
| 4.2 | "0,04- bis 0,21-facher Echtzeit" | Voices only, net of the base graph; the whole offline graph is 0.16–0.32×. Sparse phrase (22 notes in 5.7 s); dense pads scale with voices. Say so. |
| 3.7 | "Jeder Durchgang begann innerhalb eines halben Samples … (V)" | True for the prototype with the clock known in advance in `processorOptions`; the live path (segments streamed, `currentFrame` stalls, the PLL) is untested. |
| 4.3 | "an jeder Naht auf ≤ ½ Sample neu ausgerichtet (V)" | Start precision only; the in-pass drift (up to 80 ms) is not covered (M8). |
| 10 | "0,4 + 0,13 pro Schicht (V)" | A floor; see M9.2. |
| 5.8 | "Einwurzeln … 2,5 Einheiten (V)" | `GSP_COST = [2.47, 3.11]`: 2.5 is level 1; level 3 is 3.11. |
| 3.3 | "Puls und MIDI-Clock-Ausgang folgen ihr genau, auch mit Nachkommastellen" | Impossible through `P['seq.bpm']` (step 1, `sanitize`) (M8). |
| 13.6 | "wie heute schon bei jeder neuen Klangquelle" | Only for the 11 worklet sources (M11). |
| 2 | "Keiner dieser Namen ist in Myzel schon vergeben (V)" | True for the table. But "Hyphen" (§5.8) is already the mixer Geflecht's legend ("Hyphen = Weg"); "Kompost" is Moder's "Kompostglocke" and the preset "Kompostgarten"; "Takt" as the clock's name collides with "Takt" = bar all over the UI ("Aufnahme in Takten", "2 Takte"). |
| legend | (V) = "im Code, in einer Quelle oder durch Messung" | The owner will read (V) as "works here". Split it: **(G)** gemessen in Myzel, **(Q)** in einer Quelle, **(C)** im Code gelesen. |

---

## 10. Other minors

- **M12 (major, repeated here for the fix).** Taumeln is one shared pitch wander for all voices (`A.driftSrc` → `A.pitchMod`,
  a new random point every ≈ 5 s, ±`mov.drift` ct). An Abdruck replays the drift of its recording time against the live
  drift of now: up to 12 ct apart at the default, 28 ct with the "14 ct" presets, and about 3 Hz of beating on a held
  A4 at the default. Wuchs with "modulators in fixed phase" has a third drift. This is an intonation problem under the
  owner's rule and needs a decision:
  - varispeed the Abdruck by the *known* drift difference (the curve is deterministic; ≤ a few cents through the best
    resampler);
  - render Wuchs with the live drift phase (gives up pass identity);
  - or hold Taumeln while loops run.
- **m5 · Undo "sofort" in Wuchs** needs per-Schicht render streams (cost × Schichten); otherwise it takes about 1 s, like a
  knob. Say which.
- **m6 · The pedal (§7).**
  - Tap = harvest acts at once, so a double tap = undo lets a loop sound for 200–400 ms before it goes. "ohne hörbaren
    Verlust" is not "unhörbar".
  - Tap, hold-to-record and 2-s-hold on one switch must wait for the release or a threshold before acting. That
    contradicts "wirken beim Aufsetzen" (the window may still be fixed at the press).
- **m9 · "Alles"** plays back after its tap (`A.ringSum`), so an "Alles" capture holds the Gespielt loops but not the
  other "Alles" loops. "mit … den anderen Schleifen" is only half true.
- **m11 · Auslese, Variieren, Groove and Krebs** produce note lists with no audio, so they are always Wuchs: CPU, B2's
  sibling caveat, and the Q2 default does not apply to them. Say so in §5.3.
- **m12 · Latency against the Puls.**
  - Fact: notes start at `currentTime` (`onDown`), so loops recorded against the Puls keep the player's output + touch
    latency (Android "safe": often 70–150 ms) against the Puls. "Keine Korrektur" is right for the *audio*, because the
    loop reproduces what was rendered.
  - Gap: the flam against the Puls is the same flam the player made live.
  - Fix: a per-device "Spielverzögerung" measured by a tap test (the `gkKlopf` precedent), applied as the default phase
    of loops recorded against a Puls or external grid. This is better than the manual 5-ms ring nudge in §7.
- **m13 · Bewegung in Wuchs.**
  - `MOD` is a singleton bound to the live context. Recorded lanes for chain targets (flt, pha, rng, pan, dly, rev, cho,
    morph) drive the *live* chain for everybody.
  - Several loops' lanes on one target need a combine rule.
  - Pitch-wheel bends go to shared buses (`A.notePitch`/`A.bendSrc`, `MIDI.buses`), not per-note `setF` calls, so they
    are lost in Wuchs unless recorded as per-note curves.
  - Fix: specify which Bewegung goes into the render (voice targets) and which stays live (chain targets).
- **m14 · Saite.** `ksBuffer` returns a neighbouring cached buffer at a shifted rate while `dspJob` computes the exact
  one, so Saite's sound depends on the cache's history. That is why it fails identity. Wuchs must use exact buffers:
  computed synchronously, or awaited before the pass starts.

---

## 11. What holds (credit)

- **The clock.** Pass starts derived from a piecewise-linear beat map, never counted. E4's ±0.499 frames over an hour is
  convincing for the processor side.
- **The transport in Chromium.** A MessagePort transferred into an offline worklet and a live worklet delivers 703/703
  blocks.
- **The chaotic sources are deterministic in isolation**, over 20 s, at −131…−141 dB (no Lyapunov growth): Amöbe, Glut,
  Böe, Moder, Harz, Elmsfeuer (after a warm-up), Sehne, Kehlchen.
- **Determinism generally:** 22 of 28 sources reach −104…−145 dB Wuchs-vs-Wuchs in the engineer's harness.
- **The seam law.** The smooth equal-power crossfade (10–40 ms) is a good default. Suspend pacing at 0.25 s is free
  (C3: 40 suspends add 2–4 ms per 6 s).
- **The tap topology.** No feedback and no double echo for Abdruck and Wuchs playback (barring M3). The Ausklang and the
  live echo/hall interact consistently.
- **Abdruck first** is the right default: given B2 it is the only form that is exactly what the sources played.

---

## 12. Experiment index

Directory: `/tmp/claude-0/-home-user-4claude/31b62666-e283-5142-ac94-5f41b61da83b/scratchpad/crit/`. Instrumented
build: `sh $S/v2/mk.sh /home/user/4claude/myzel crit` → `http://127.0.0.1:8790/crit-inst/`.

| Script | What | Key result |
|---|---|---|
| `c1-swap.js` | offline voices built by a calibrate-style swap while the live context runs | live voice stolen, live Gespinst web destroyed, Elmsfeuer fails, live Rhizom charges consumed, live Jahresring aged |
| `e8.js` (`WARM=1`, `ENGS=…`) | E8 rerun over all 28 sources | identity fails: kor, gsp, swm, sai, jrg; superposition fails for 9 |
| `e8b.js` | same notes 1 s later (block-aligned and +37 frames), shifted back | −10…+4 dB re peak with default Bewegung |
| `e8c.js` (`NOMOD=1`) | as e8b with vibrato, Taumeln and Kreisen off | only amo, glt, boe null (−117 dB) and only block-aligned |
| `e8d.js` | 20-s render, notes held 15 s | no divergence growth for the chaotic sources (−131…−141 dB) |
| `e9b.js` (`FREE=1` optional) | E9 with a pacing log | paced: 0 blocks during the 600-ms stall; unpaced: 173 |
| `e2b.js` | E2b rerun | fake audio device, gaps p99 10–11 ms with or without the render: no evidence either way |
| `c2-build.js` | main-thread ms to build one Wuchs pass | 1–13 ms per second of music per loop (server); 44–990 nodes per pass |
| `c3-susp.js` | suspend/resume overhead | 0/40/400/2000 suspends per 6 s: 5/7/27/105 ms idle, 4/8/55/241 ms with a half-busy main thread |
