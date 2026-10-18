# Hexenring – the looper as a living ground

*Proposal from the composer's chair: loops as organisms, the piece as a season. 18.10.2026.*
*(V) = verified in code or research; (A) = assumption or design decision.*

---

## 1. The idea in one paragraph

Hexenring treats a loop the way a mycelium treats matter: it is taken in, carried, digested and grown from. Everything you play is already in the ground, recorded continuously as sound and as notes, and one tap lifts the last phrase out as a **Schleife**: a ring that turns at its own length. Rings of different lengths turn against each other (whole-bar polymeter, Eno's cycles that never line up, Reich's slow drift), and Hexenring shows when they will **meet** again, because that meeting is the strongest downbeat a cyclic form has (the *sam* of a tala). **Hyphae** carry material between rings and into Myzel's own physical sources, so a loop can set Gespinst's web ringing, be the tinder in Glut's feedback, fire Rhizom's avalanches or plant Keime for the Sporenregen. Rings age, and the ageing is composed: worn at the same spots like Basinski's tape, digested like a Moder bell, or re-recorded through strings tuned to the scale until only harmony is left (Lucier). What dies becomes **Humus**, which new rings can grow from. A year clock gives a 20-minute piece its seasons. The intelligence is a **gardener**: it prunes, makes room, grafts and lets things fruit at the meetings, using only your own material and always showing its intentions one pass ahead. None of this gets in the way of the first minute, which is just *play, tap, it loops*, with a perfect seam, until you stop it.

---

## 2. Names

The new names do not occur in `index.html` (V, grep). Four already exist there and keep their meaning: „Schleife“ (Gestik §11), „Verblassen“ (from the Fährte), „ruht“ (the mixer) and „lebendig“ (only as a search tag).

| Name | What it is | Note |
|---|---|---|
| **Hexenring** | The looper: bar button and panel section | A fairy ring: one mycelium pushing a circle of mushrooms outward, year by year |
| **Schleife** | One loop | Reserved for audio loops by Gestik §11; here it carries sound and notes |
| **Ernten** | Tap: what you just played becomes a Schleife | Harvest after it has grown, never arm before |
| **Abdruck** · **lebendig** | The exact recorded sound (a spore print), or re-played from its notes | |
| **Maß** | Length relation: *Takte* · *Schläge* · *frei* · *wandernd* | |
| **Treffen** · **Fruchten** | When the awake Schleifen start together · what may happen then | |
| **Hyphe** | A connection carrying material into another Schleife or a source | The mixer legend already says „Hyphen = Weg“ (V) |
| **Zersetzung** | Ageing: *bleibt* · *Verblassen* · *Abrieb* · *Kompost* · *Einwurzeln* | „Verblassen“ comes over from the retired Fährte with the same meaning. „Kompost“ echoes Moder's „Kompostglocke“ on purpose. |
| **Wachsen** · **Schwinden** · **Wandel** | Additive/subtractive growth; variation per pass | |
| **ruht** · **überwintert** | Muted at its seam · resting for a season, then back by itself | „ruhend“ means muted in the mixer too (V) |
| **Humus** | The session's memory of all that was played and all that decayed | |
| **Gärtner** | The intelligence: *schaut zu* · *pflegt* · *gestaltet* · *verwildert* | |
| **Jahreslauf** | A year clock over the piece | Proposed to share Jahresring's „Jahr“ |
| **Beet** | A saved layout of Schleifen without sound: a piece template | |

---

## 3. How it plays

### 3.1 The first minute (what must stay simple)

1. The sound starts. The round **Hexenring** button sits in the bar where the Fährte button was, on every device, always visible.
2. You play a phrase. At the moment it would begin again, you **tap**. It loops at once: no count-in, no arming, no tempo question, no fade.
3. You play over it and tap again for a second Schleife. A thin strip of small rings appears at the field's bottom edge, one per Schleife, each with a dot running round it.
4. Tap a ring and it **rests** at its seam, its tail ringing out. Tap again and it **wakes**.
5. Every toast carries *Rückgängig*.

Ageing, hyphae, gardener and year stay off until you choose a Beet or switch them on.

### 3.2 Gestures

| Where | Gesture | Result |
|---|---|---|
| Button | **tap** | **Ernten**: the last phrase becomes a Schleife and starts (§3.3) |
| | **hold** | Record while held, from the press; release closes. With a grid, the length is rounded on release (rel sync). |
| Ring | **tap** | Rest/wake at its seam; waiting shows a shrinking arc |
| | **hold** | Overdub while held, punched where you play (10-ms fades); each overdub is its own layer |
| | **swipe out/in** | ×2 / ÷2; a short swipe ±1 bar or beat |
| | **turn** | Shift its phase |
| | **long press** | Card: form, Maß, Zersetzung, Wandel, level, layers, *Zurück* (anchor), *Löschen* |
| Ring onto ring or source glyph | **drag** | Draw a **Hyphe**; its thickness is the flow |
| Stille | | Stops every Schleife, keeps the buffers (fixes Fährte bug E) |

No double tap destroys anything (Fährte lesson 3.7).

**The panel section „Hexenring“** (in Aufnahme) is the composing view:
- concentric rings, the shortest innermost, each with its sweeping dot (at a Treffen all stand at twelve);
- notes as small caps around the ring in their source's hue (a fairy ring of your rhythm);
- an Abdruck's thickness is its envelope, so worn spots show as thin places, and Kompost browns it;
- hyphae as curves with travelling light, as sends in the mixer;
- the year as the outer arc, and the two global controls, Gärtner and Jahreslauf.

### 3.3 Time: tempo, bars, seams

- **With a clock** (Puls, MIDI clock, or an earlier Schleife that set the Grundmaß): Ernten takes the phrase just played **up to now** (fixing Fährte C2), in whole bars.
  - A tap in a bar's first quarter means the bar line just passed. Otherwise the Schleife closes at the next one, and you may keep playing into it.
  - The proposed length is 1/2/4/8 bars, or 3/5/6/7 when the phrase clearly has that shape (intelligence §5.1a/c). A swipe during the first pass corrects it.
- **Without a clock:**
  - The start is the first note after a silence of about 1 s, or the start of the repeat if you played the figure twice (intelligence §5.1b).
  - The end is the tap in heard time (`heardT`, V), snapped to your onset if you played the first note again to close the loop.
  - This length becomes the **Grundmaß**. The inferred tempo is offered to the Puls as one chip („Puls übernimmt 84 BPM · ½ · ×2“). If you never start the Puls, nothing asks.
- **Later harvests** round to the Grundmaß when the material is rhythmic (high bar-inference score) and stay *frei* when it is sparse and sustained. A chip on the ring switches between the two.
- **Abdruck seams:**
  - The retro ring gives a margin before the start, and the ring-out is folded onto the start (`foldTail`, V).
  - An equal-power crossfade of 5–50 ms sits at the quietest point within ±30 ms (intelligence §5.7).
  - The first pass is seamless by itself, because your live tail overlaps it (V, as the bar recorder's live start).
- **Lebendig seams:** held notes are tied over, releases ring on, and no note sticks.
- **Stop:** at the seam, with its tail.

### 3.4 Phone alone · phone + keyboard · PC

- **Phone:** the gestures above. Gestik reaches Hexenring only through Zuweisen („eine Geste, eine Bedeutung“); for example, Neigen can drive the flow of all hyphae.
- **+ microKEY / nanoKEY:**
  - The sustain jack via Zuweisen: tap = Ernten, hold = record (the foot-looper workflow).
  - The nanoKEY's pads are all taken (V), so they come via Zuweisen.
  - Learning needs the same momentary exception as `fae` (V).
- **PC + nanoKONTROL2**, on its free buttons (V): SET = Ernten/record while held, ◀◀ ▶▶ = select a Schleife, R1 = rest/wake, R2 = overdub while held, R8 = all rest. A fader bank maps faders to Schleife levels and knobs to their Zersetzung depth.

---

## 4. What it records and how it plays back

**Always written down:**
- the pre-master sum *without* the Schleifen, the last 64 s (A);
- about 2 min of notes: degree, octave, alteration, source, velocity, per-note height and bend over time, release. This covers the field, the keyboards, and the Puls, Regen and Rassel through a `playNote` wrapper (code-map §8B);
- the Fährte's lanes, now a *Bewegung* layer that belongs to its Schleife (forensic recommendation).

**Every Schleife keeps its sound and its notes**, and plays in one of two forms:

| | **Abdruck** (default) | **lebendig** |
|---|---|---|
| Sounds | The exact recording, with its space, tails and the models' one-off life | Its notes re-played, on the same source or another one |
| Runs in | The looper processor, sample-exact, immune to stalls | The scheduler's look-ahead, like the Puls (V) |
| Scale change | Stays (see Einwurzeln, §5.2) | Follows by degree: *diatonisch* (default) · *transponieren* · *fest* |
| Tempo change | Question 3 (§8) | Follows |
| Sound change | — | Follows if „folgt Klang“, else keeps its own source |
| Cost | Memory | Voices |

A Schleife can change form at a seam: a print comes to life, or a living ring freezes into a print of its current pass.

---

## 5. The musical depth

### 5.1 Lengths: the heart of it

| Maß | Meaning | Lineage |
|---|---|---|
| *Takte* | 1–16 bars, odd counts welcome | Infinity's ×3/×6 |
| *Schläge* | e.g. 7 beats against 4/4 | Reich's pulse figures |
| *frei* | Seconds, unrelated to any beat | Eno, Hainbach |
| *wandernd* | A copy of another Schleife stepping 1/16 ahead every N passes | *Piano Phase*; stepped at the seam, so no resampling (continuous drift: question 4) |

**The Treffen as a compositional tool.**
- Takt rings of 5, 7 and 8 bars meet every 280 bars, about 13:20 at 84 BPM. Hexenring shows the countdown and the pair meetings in between.
- Free rings almost never meet, so **„Treffen setzen“** lets you choose the one moment they all do, say minute 18:
  - each free Schleife's length counts back from T: L = (T − its start)/k for a whole k;
  - k is chosen so that the pause fits and no pair shares a start (within 30 ms) before T. For rings started together, distinct primes guarantee it: T = 1080 s and k = 41, 43, 47, 53, 59 give 26.3, 25.1, 23.0, 20.4 and 18.3 s;
  - the result is Eno's behaviour all piece long, then one exact unison at the moment you chose;
  - only the silence after each phrase is adjusted, never the music. Eno's loops were notes plus silence.

### 5.2 Ageing (Zersetzung)

Age belongs to each **layer**, so a fresh overdub sounds clean over old wear. That is the Frippertronics texture.

| Kind | What you hear | How |
|---|---|---|
| *bleibt* (default) | Unchanged | |
| *Verblassen* | ×0.7–0.98 per pass (Fripp, Riley) | A gain per layer and age |
| *Abrieb* | Basinski: worn spots, chosen by seeded chance, deepen **at the same places** every pass. The top dulls, the level sags, short dropouts open, until the rhythm of the wounds is a melody. | A wear map over the loop's position, applied at playback (position-dependent low-pass and gain). *Auffrischen* returns the clean layer. |
| *Kompost* | Like Moder: each layer's upper partials crumble into crackle on their own pitches while the low end swells warm. A digested layer sinks into the Humus. | A Worker computes the next pass from the clean layer and its age (STFT with sparse, phase-randomised gating above a falling cutoff, plus a warm shelf), swapped at the seam (A) |
| *Einwurzeln* | Lucier's *I Am Sitting in a Room* through Myzel's strings. Each pass the Schleife is played through a private copy of Gespinst's web tuned to the scale and re-recorded, keeping its loudness. After 10–30 passes only what the scale resonates remains. **Change the scale and the roots slowly follow**: an audio loop that follows harmony with no resampling. | The `Web` string loop inside the looper processor (A), about one web of cost: 2.47 / 3.11 units (`GSP_COST`, V) |

None of this is lo-fi kitsch: no bit-crushing, no generic hiss. Each kind of wear is a process the instrument already speaks (Moder's digestion, Gespinst's resonance, tape's local wear), and the clean layer is always kept.

### 5.3 Growth and change (lebendig)

- **Wandel:**
  - *treu*: the same notes every pass (a seeded PRNG per Schleife); the models still breathe.
  - *atmen*: groove-true micro-timing.
  - *variieren*: weak-beat neighbour degrees, kept contour, thinning and filling. These are intelligence §5.3's operators, with anchor, elastic return and ghost notes one pass ahead.
  - For an Abdruck, Wandel works on onset slices.
- **Wachsen:** every N passes the Schleife adds a beat grown from its own material, Glass's additive process (1, 1-2, 1-2-3 …), up to a limit. Then **Schwinden** removes beats from the front, and the Treffen moves with it.
- **Pfropfen:** the rhythm of one Schleife with the tones of another, offered as a ghost ring. One tap plants it.

### 5.4 Hyphen: material moves

| Hyphe | Musically | State |
|---|---|---|
| Schleife → Schleife (sound): B records A each pass, feedback < 1 | Riley's time-lag accumulator between two lengths, a cloud moving against itself | Inside the processor (A) |
| Schleife → Schleife (notes) | A's degrees feed B's Wandel, so B drifts toward its neighbour | (A) |
| → **Gespinst** | A scale halo around a loop | The web has an input (V `A.gsp.inp`) |
| → **Glut** | The loop is tinder: the tuned feedback catches its partials and glows | Needs an input; voices have none today (V `numberOfInputs: 0`) |
| → **Sehne** E-Bow | Held strings swell in sympathy with the loop | Same (A) |
| → **Rhizom** | Each note strikes the net: avalanches answer the rhythm, exhaustion carves rests | Existing net (V) |
| → **Sporenregen** | Its notes plant Keime: tilt, and the rain plays the loop's tones | `rgSeed`, as Puls notes (V) |
| → **Körner** | The Abdruck becomes grain material | `takeToGrains` (V) |
| Channel → Schleife | A Schleife listens to one channel only, e.g. Gespinst's halo | |

Every feedback path has a soft limiter, and the web keeps its own governor (V).

### 5.5 Harmony through all rings

- **Lebendig rings** follow the scale by degree.
- **Abdruck rings** keep their pitches. When Gespinst retunes with the scale (`gspRetune`, V), only their common tones still ring in its halo, like a pivot chord. **Einwurzeln** carries them over physically.
- **An optional harmonic plan** steps **only at a Treffen**, never under your fingers mid-phrase, and is shown on the field a pass ahead. The built-in *Jahreszeiten-Modi* keep the root and follow the year's brightness: Dorian in spring, Lydian in summer, Aeolian in autumn, Phrygian in winter.

### 5.6 Long form

**Jahreslauf** (default *steht*, e.g. 20 min). A season sets the Gärtner's policy, never notes:

| Season | Policy |
|---|---|
| Spring | Harvests readily, lets rings grow |
| Summer | Everything plays; Fruchten is prepared |
| Autumn | Zersetzung speeds up, material goes to the Humus |
| Winter | Rings overwinter one by one |

The year can share Jahresring's clock (`A.season`, `jrg.jahr`, V), so the bar ages with the piece.

**Fruchten** (chosen per Beet; otherwise a Treffen is only marked):
- all rings play their anchors for one pass, a recapitulation;
- the web's coupling blooms;
- the planned mode lands;
- the meeting's notes fly out as Keime.

**Scenes A/B** store which Schleifen are awake and their levels, so the morph crossfades between arrangements (the Octatrack crossfader). **Beete** (*Flughafen*, *Phasen*, *Zerfall*, plus user Beete) store the layout without sound and turn the first minute's notes into a form.

### 5.7 The Gärtner

A gardener does not write the plant; it sets the conditions under which your material grows.

| Stop | May do |
|---|---|
| *schaut zu* (default) | Service only: inference, loop closing, seams, scale following |
| *pflegt* | Makes room: rings in your register dip about 3 dB and lebendig rings thin there. Prunes when the network is too dense or voices are short: the least touched ring decays faster or overwinters. |
| *gestaltet* | Also sprouts a small Schleife from the Humus after two silent passes of the longest ring (factor-oracle recombination of your material), grafts, prepares Fruchten, follows the year. Answers and „die anderen spielen“ (intelligence §5.2/5.6) sit here. |
| *verwildert* | Now and then opposes or ignores you for a phrase (Voyager), with an elastic way back |

Its rules:
- your own material only;
- decisions only at seams and bar lines;
- every intention shown a pass ahead (a sprouting dot, a ghost ring, shears on a ring);
- a tap vetoes, and a tap on a ghost keeps it;
- it never touches the live sound or any source's quality.

### 5.8 With the rest of Myzel

- **Puls:** sets the Grundmaß, its lanes can be harvested, and the Gärtner may offer „Puls aus dieser Schleife“ (intelligence §5.5d).
- **Schlafen:**
  - face down, the Schleifen **overwinter**: each fades at its seam during the cadence and keeps its phase;
  - a short sleep brings them back staggered, each at its seam;
  - a sleep over 20 s ends the set (`SLP_LONG`, V);
  - Schlafen already clears the web and the Rhizom net (V), so those hyphae restart on waking.
- **Mixer:** one strip „Hexenring“ (route `dir`, sends off by default, because the rings carry their recorded space and a send would be re-captured), hidden until used. Each Schleife's level lives in the ring view.
- **Presets** can bring a Beet. Schleifen are referenced by id.
- **Fährte:** retired as a button; it lives on as the *Bewegung* layer.

### 5.9 Three pieces, minute by minute

**A · „Flughafen im Moos“** · phone alone, no Puls, about 20 min.
Beet *Flughafen*: free rings, Treffen set at 19:00, slow Kompost, all → Gespinst, year 20 min, Gärtner *pflegt*. Field: Halm, Flöte.
- **0–1.** One long D. Ten seconds later, tap: Schleife 1, about 26 s, note plus silence. The web answers with a faint octave and fifth.
- **1–4.** Six more single notes, each harvested in its own time. Hexenring sets their pauses so that all of them meet at 19:00 and no two before. Chords form and dissolve by themselves, as in Eno's *2/1*, while seven dots circle at seven speeds.
- **4–8.** Summer. The phone lies on the table and you listen, as the halo thickens where notes overlap.
- **8–12.** Harz, Schale: slow bowed notes over the rings. The Gärtner dips the rings in your register. One phrase you like becomes Schleife 8, Abdruck.
- **12–16.** Autumn. Kompost advances: the oldest notes crumble into crackle on their pitches and warm below, and the chord darkens like a Moder bell. Two notes slip into the Humus.
- **16–19.** Winter. Rings overwinter. At 19:00 the survivors meet for the first and only time: Fruchten, one bloom of the web.
- **19–20.** Face down: the last ring fades at its seam into the frozen tail.

**B · „Phasen am Stab“** · phone + microKEY Air, about 12 min. Beet *Phasen*. Field: Jahresring.
- **0–1.** A 12-sixteenth figure, played twice. Hexenring pulses „schließen?“; tap: Schleife 1, lebendig, *treu*. The inferred 96 BPM goes to the Puls with one tap.
- **1–3.** Pedal tap: a *wandernd* copy on Zapfen, one sixteenth ahead every 16 passes (30 s). Its twelve steps back to unison take 6 min. Resultant patterns emerge, and ghost spores of both rings flicker on the field.
- **3–5.** A 7-beat Amöbe bass (*Schläge*) and Puls lane 1 on Moder, Euclid 5/16, turn against the figure. The countdown to the copy's return reads „Treffen 3:30“.
- **5–7.** A hyphe from Schleife 1 to Rhizom: every note of the phasing figure starts an avalanche, and the net's exhaustion carves rests into it.
- **≈ 7:30.** The copy is back in unison: Fruchten. Dorian becomes Lydian, and for one pass every ring plays its anchor in the new mode.
- **8–11.** Pedal held: an overdub into the bass. A swipe on Schleife 1 sets Wachsen, so the figure gains a beat every four passes and the next Treffen moves.
- **11–12.** The rings rest at their seams, and the last cascade dies into the Puls's final bar.

**C · „Zerfall“** · PC, nanoKEY Studio + nanoKONTROL2, about 20 min. Beet *Zerfall*: Abrieb, Verblassen 0.92, Gärtner *gestaltet*.
- **0–2.** Bordun on D. A free four-chord chorale on Harz, Glas; SET: Schleife 1, Abdruck, 16 s.
- **2–5.** Holding SET, a slow counterline: Schleife 2, 21 s. A hyphe 1 → 2 with flow 0.7 makes Riley's accumulator: the chorale gathers into a cloud that keeps meeting itself differently.
- **5–9.** Schleife 1 wears at four spots, deeper every pass. By minute 9 its second chord has a soft hole and its fourth has lost its top.
- **9–13.** Held Glut notes with a hyphe 2 → Glut: the cloud becomes tinder, and the feedback glows its partials out.
- **13–17.** You stop. After two silent passes a ghost ring sprouts from the Humus, a clean fragment of the opening chorale. You leave it, and it returns like a memory between the worn rings.
- **17–20.** R8: the Schleifen rest at their seams. The worn chorale plays alone, full of holes, and ends. Each Schleife exports as a WAV stem through the take list.

---

## 6. What is new

Compared with `loopers.md` and `intelligence.md`, as far as that research reaches:
- **Loops feed the instrument's own physics:** a sympathetic web, a tuned feedback loop, an E-Bow, an avalanche net and a tilt-driven rain. The nearest relatives (softcut voices recording each other, Clouds' feedback, Oliveros' network) feed delays, not physical models of the same instrument.
- **Einwurzeln:** Lucier's process as a loop mode through scale-tuned strings, and with it a way for audio loops to follow harmony with no stretching.
- **Wear from the instrument's own processes** (Kompost after Moder; Abrieb local and cumulative), non-destructive per layer. Blooper's Stability and oooooo's destruction are uniform and destructive.
- **The Treffen computed, shown and composed.** Prime lengths make Eno-style loops meet exactly once, when you choose, and the meeting can carry form. Other loopers lock lengths or leave meetings to the ear.
- **A long-form generator without notes of its own:** the year sets the gardener's policy and is shared with a source's ageing.
- **A gardener instead of a co-player:** it acts on the network (pruning, grafting, sprouting from your Humus, fruiting), from your material only, and shows every intention ahead.
- **One loop, two forms** (sound and notes, loopers.md idea 1), with Glass's additive growth inside the looper.

---

## 7. Feasibility sketch

- **Audio thread:**
  - One processor `myzel-hexenring` in the shared DSP module, loaded lazily like `ensureCapture` (V pattern).
  - Its input is the pre-master sum, tapped before the Hexenring strip returns (a new `A.masterIn` insert, code-map §8A.1).
  - Inside (A): the 64-s retro ring, the Schleife buffers, sample-exact seams, crossfades and phase steps, wear maps, Verblassen gains, ring → ring hyphae, and the private webs for Einwurzeln.
  - Its outputs: the ring mix to the strip, a web send to `A.gsp.inp` (V), and aux sends to Glut and Sehne (A: those processors need `numberOfInputs: 1` and an injection point).
  - It counts frames itself, as the tap does (V), takes `{t}` messages (`MyzelProc` pattern, V), and keeps playing through main-thread stalls (fixing Fährte L).
- **Main thread and Worker:**
  - the event ring and the `playNote` wrapper (code-map §8B);
  - lebendig playback in `tick()` look-ahead;
  - seeded PRNGs per Schleife (everything uses `Math.random` today, V; per-note engine seeds through `o`, A);
  - the Kompost STFT in a Blob Worker, one pass ahead;
  - the Gärtner, deciding once per pass in under 20 ms (intelligence §3.5);
  - the shared Takt clock, factored out of `faeClock` (V).
- **Cost** (measured and entered, never a reason to simplify):
  - playback and wear: small (A), measured with `cost.js` and entered in `voiceLoad()` like `A.gsp.cost` (V precedent);
  - Einwurzeln: about 2.5 units each (V web cost);
  - lebendig: its voices.
- **Memory** (stereo float32 at 384 KB/s, V):
  - the retro ring takes 24.6 MB;
  - piece A (8 rings of about 22 s, plus Kompost's second buffers) needs about 150 MB;
  - piece C needs about 40 MB.
- **Storage:** IndexedDB segments, like takes (V); scenes and presets hold ids; a Schleife can become a take, which gives WAV/ZIP export and „Als Körner-Quelle“ (V).
- **Lifecycle:** add „Hexenring spielt“ to the keep-alive condition (V). Stille stops it, Schlafen makes it overwinter, and `restartAudio` is refused while Schleifen are unsaved.
- **UI:** the button takes `#btnFae`'s slot (V; the bar is full at 360 px). The ring strip (36 px) appears only once a Schleife exists, and the concentric view lives in Aufnahme.

---

## 8. Risks, honest limits, questions for the owner

**Limits**
- **Memory:** long ambient pieces with many Abdruck rings reach 100–200 MB. Mid-range Android usually copes, but iOS may evict earlier (A).
- **Kompost and Einwurzeln need the ear.** STFT re-synthesis can smear transients, and Einwurzeln with too much depth per pass becomes a generic wash. Both are opt-in and keep the original.
- **Glut and Sehne hyphae mean DSP work** on finished sources, and their cost must be measured again.
- **Lebendig rings re-perform**, so even *treu* passes differ in the models' own life; only an Abdruck is exact. At level 1 (14 units) three or four lebendig rings on dear sources take voices from live playing.
- **Free rings without „Treffen setzen“ may never meet**, and the countdown says so.
- **Gimmick risk** for the Gärtner, Fruchten and the year. That is why they default to off and why their intentions are visible. The co-player stops should be tried Wizard-of-Oz first (intelligence §4.4).
- **The retro ring moves Safari and Chrome-in-iframe to the worklet thread** (V). In the claude.ai view there is no MIDI, motion or mic, and storage may be missing.

**Questions**
1. Should every Schleife always keep both sound and notes, in float32 stereo? Is Int16 acceptable if a listening test finds it transparent? And should there be a memory cap with a meter?
2. Should Hexenring listen from the first note (a thread move for everyone), or only after its first use (then the first Schleife is born lebendig)?
3. What should an Abdruck do on a tempo change?
   - (a) hold the tempo while Takt rings exist (today's `seqRetempo` toast);
   - (b) become *frei* and drift;
   - (c) tape varispeed with the best resampler, so the pitch moves.
   - I propose (a), with (b) on the card.
4. Is continuous Reich drift allowed (resampling by about 0.1 %, under 2 ct), or stepped phasing only?
5. Einwurzeln costs about 2.5 units per rooting Schleife. Several at once?
6. Hyphae into Glut and Sehne: in version 1, or later?
7. Should the Jahreslauf share Jahresring's year?
8. Should the first Gärtner have only *schaut zu* and *pflegt*, with the rest after listening sessions?
9. Is **Hexenring** too close to „Ring“ (the effect), and **Fruchten** to „Fruchtkörper“? The alternatives would be *Pilzkreis* and *Austrieb*.
