# Hexenring – a looper you can read at a glance and play without looking

*Designer's proposal (interaction first). 18.10.2026.*

**Basis.** I read the brief and the four research reports. I also looked at the real UI: an instrumented copy (slot `ux`), screenshots at 360 × 740, 390 × 844, iPad 820 × 1180 and PC 1366 × 768, in the scratchpad `ux/` folder. Facts I checked in code or on screen are marked **(V)**; assumptions are marked **(A)**.

**Wireframes** (open in a browser):
- `designer-phone.svg`: the 360-px phone, three moments;
- `designer-states.svg`: every state of the main control and of a loop, plus the state machine;
- `designer-ipad.svg`;
- `designer-pc.svg`: the PC with a nanoKONTROL2.

---

## 1. The idea in one paragraph

The Hexenring is a looper you can **read like a score and play like a pedal**: Riley's time-lag accumulator and Eno's unequal tape loops, with a band member who listens and says what it will do before it does it. Every loop (a *Kreis*) is a visible ring of the notes you played, a fairy ring of spores with a playhead going round, in a rail under the field. On the field, what you play *now* grows as solid rings with hyphae, and what the loops play returns as dotted fairy rings, so live and loop cannot be confused. Nothing played is lost: the *Humus* keeps the last minute, so a phrase that turned out good is **harvested afterwards** (*Ernten*) instead of caught on a downbeat, and a pickup played before the bar line is kept where it belongs, at the end of the cycle. Each Kreis holds both the exact sound (its *Abdruck*) and the score of what you did. It stays exact until you ask it to follow a scale, move to another sound or vary itself, and every change it makes on its own shows one bar ahead as buds (*Knospen*) that you can strike out. One small grammar runs it all: a tap does what the glyph shows, no double-tap exists, and no hold ever destroys.

## 2. Names

None is a feature name in `index.html` or in the brief's list (grep, V). Two stems overlap and are flagged: "Kreis" (the auto-pan knob "Kreis-Tempo") and "Schicht" (the internal "Mod-Schicht"). "Verblassen" is reused on purpose.

| Name | What it is | Why |
|---|---|---|
| **Hexenring** | The looper as a whole | A fairy ring: mushrooms that come back in a circle, year after year, from one mycelium. It is the instrument's own word for "what returns". |
| **Kreis** (pl. Kreise) | One loop | It is what you see: a circle. A *Hexenkreis* is the other German word for a fairy ring. *Note:* the stem is shared with "Kreisen" (auto-pan); see §8, question 6. |
| **Ringleiste**, **Hauptknopf** | The rail under the field; its big round button (on screen: glyph and verb only) | – |
| **Schicht** (pl. Schichten) | An overdub layer inside a Kreis | Soil layers. |
| **Ernten** / **Korb** | Retroactive capture / its button (a forager's basket) | You harvest what has already grown. |
| **Humus** | The always-on memory of the last ≈ 64 s (notes, movement, sound) | What you play sinks in; Ernten brings it up again. |
| **Abdruck** | A Kreis's exact audio print | A spore print: the cap's exact imprint. |
| **lebendig** | A Kreis re-performed from its notes through the voices | – |
| **Eigensinn** | How much a Kreis may act on its own, 0–100 % | Wording taken from `intelligence.md`. The steps are Treu · Atmen · Variieren · Antworten · Eigenwillig. |
| **Anker** | A Kreis's original, to which variation returns | – |
| **Knospen** | The forecast: notes that will change in the next pass | Buds before they open. |
| **Lichtung** (pl. Lichtungen) | A stored section: which Kreise sound, and how | Form as a walk from clearing to clearing. |
| **Reigen** | An ordered round of Lichtungen with pass counts | The dance in the fairy ring; the follow actions. |
| **Verblassen** | Decay per pass (default *nie*) | Inherited from the Fährte: one concept, one name. |
| **Zersetzen** | Wear of the print per pass (Basinski) | What fungi do. |

Retired: the **Fährte** button. Its movement recording lives on as the *Bewegung* inside each Kreis (§4).

---

## 3. How it plays

### 3.1 Where it lives, and why there

What I measured on the real UI (V):
- **The bar is full at 360 px**: engine chip 144, Puls 38, Freeze 38, REC 84 px. While recording, the chip collapses to one letter (screenshot `p360-21`).
- **7 tabs of 51 px; a 60-px quick strip.** A panel opens *below* the field in portrait (54 %) and *beside* it in landscape and ≥ 900 px.
- **Every `pointerdown` on the field is a note** (`onDown`). The field has no free gesture.
- **The play screen shows no beat or bar at all.** The line under the bar is the output meter.

So:
1. **No looper gestures on the field**, and **not in the bar**: no room, and the Fährte failed there partly because its icon was small and hidden. **Not an 8th tab**: tabs open settings, a looper is performance.
2. **A rail under the field: the Ringleiste**, inside `.main` between `#stage` and `#sheet`. It stays glued to the field's lower edge when a panel opens, in the thumb zone.
   - It costs 56 px of field (574 → 519 px at 360 × 740, −10 %).
   - **It doubles as the metronome Myzel never had**: a beat line on its top edge, the downbeat in spore orange, dotted "frei" while no tempo exists.
   - Shown by default once sound starts, on every device. It folds to a 24-px strip (beat line and Kreis dots) with a visible chevron, and by itself while the mixer is open on a phone.
3. **Depth lives in the Aufnahme panel**: a *Hexenring* section on top of the take recorder (`buildRec`). The panel keeps the field playable above it.

```
360 px phone, portrait (to scale in designer-phone.svg)
┌──────────────────────────────────────────────┐
│ (≈ Nebel          )  (▶) (✳)  (● REC)        │ bar 55        unchanged; Fährte icon gone
├──────────────────────────────────────────────┤
│ HEXENRING · 92 BPM · TAKT 3/4        HELL ↑  │
│      ⁘1                  ◎∿ ← live: solid    │ field 519     loop notes: dotted ⁘ + number
│              2   ← count-in, big, faint      │
│ D3 F3 G3 A3 C4 D4 F4 G4 A4 C5 D5             │
├━━━━━━━━━━  ━━━━━━━━━━  ▀▀▀▀▀▀▀▀▀▀  ━━━━━━━━━━┤ beat line (beat 3 lit)
│ (🧺) ((●)) (·1·)(·2̸·)(┄+┄)(┄+┄)        (↶)   │ Ringleiste 56
│  40   52    40   40   40   40           34   │ px; gaps 4–10; hit areas ≥ 44
├──────────────────────────────────────────────┤
│ Filter ━━━●   Echo ━●━━   Hall ━━●━    (🔇)  │ quick 60      unchanged
├──────────────────────────────────────────────┤
│ Klang Effekte Puls Mixer Aufnahme Presets …  │ tabs 50       unchanged
└──────────────────────────────────────────────┘
```

On a phone the rail shows **4 Kreise per page**. A fifth adds a small page chip "1–4 · 5–8". The iPad and the PC show all 8 in one row.

### 3.2 One grammar for every target

The Fährte had three meanings on one icon: tap = take after 400 ms, hold = arm, double tap = clear. It acted late and destroyed by accident. The Hexenring has **one meaning per gesture and target, and no meaning is delayed**:

| Gesture | Meaning everywhere | Timing |
|---|---|---|
| **Tippen** | Do what the glyph shows (the glyph always shows the *next* step) | The Hauptknopf and the Korb act on **press-down**, stamped in heard time (no 400-ms wait). Kreise act on release, because their actions are bar-quantised anyway. |
| **Halten** on the Hauptknopf | The same action **only while held**: push-to-record, like a walkie-talkie. Release closes, rounded to the grid. | The recording already started at press-down, so nothing is late. |
| **Halten** on a Kreis (0.5 s, a visibly filling ring) | Open its card in the Aufnahme panel | Never destructive |
| **Ziehen ↕** on a Kreis | Level (a fader on the circle, with a tooltip "−6 dB") | 8-px threshold, so taps stay taps |
| **Doppeltipp** | **Nothing, anywhere** | – |
| Destructive acts (Löschen, Alle leeren) | Only as labelled buttons in the card or panel, always undoable | – |

The field keeps its gestures. Gestik keeps its gestures (Wenden = Schlafen, Schütteln = Ladung). The Hexenring adds none.

### 3.3 The Hauptknopf and the Kreise: states

The big button always acts on one **target**, outlined in spore orange. In the default mode, **Kette** (chain), every closed Kreis moves the target on to the next empty slot. In **Schichten** mode the button overdubs the same Kreis, RC-style. The mode is chosen once in the panel, and the glyph shows it: ●⁺ for a new Kreis, ●+ on a creme ring for a layer.

| Hauptknopf state | Looks like | Tap does | Hold does |
|---|---|---|---|
| Bereit | dark disc, red dot (⁺ in Kette) | records into the target | records while held |
| Wartet | dashed red ring, countdown arc and beats left ("2") | cancels | – |
| Lauscht | red dot with sound waves | cancels (it starts at your first note) | – |
| Nimmt auf · frei (first Kreis, no tempo yet) | red disc with elapsed "0:06" | closes; length and tempo inferred | release closes |
| Nimmt auf · im Takt | red disc, arc to the auto-end, "3/4" bars | closes now, rounded to the bar | release closes |
| Überspielt (Schichten mode) | red ring "+" | ends the layer | layer only while held |
| Ruht (after Stille) | ▶ | all Kreise re-enter at the next bar | – |
| Alle belegt | dot inside a dashed ring | a layer on the last Kreis | – |

| Kreis state | Glyph (never colour alone) |
|---|---|
| leer | dim dashed circle, "+" |
| Ziel | **orange** dashed circle, "+" |
| wartet / lauscht | dashed, with a red countdown arc / sound waves |
| nimmt auf | red disc; the arc fills; the notes appear as red spores as you play them |
| spielt · treu | creme ring of spores (radius = pitch, low inside); playhead dot; bar ticks outside |
| spielt · Eigensinn | as above, plus **lumen** hyphae growing out and lumen **Knospen** one bar ahead of the head |
| überspielt | red trail behind the playhead, "+" in the centre |
| verstummt am Takt | a grey wedge from the head to the bar line: the time left |
| stumm | hollow grey spores, a diagonal stroke; the head **keeps running** (you see it is still in time) |
| verblasst | the ring thins with its level ("60 %" in the card) |
| ruht · Mitspieler | a dotted lumen halo; the card says why ("ruht, weil du Bass spielst") |
| schläft | "z" (Schlafen); it wakes at the bar |

All of these are drawn in `designer-states.svg`.

The state machine in Kette mode:

```
leer ─●→ wartet/lauscht ─Takt/Ton→ nimmt auf ─●/Ende→ spielt ⇄(Kreis tippen)⇄ stumm
  └──●(frei, oder Halten)──────────↗                     │ └─Kette: Ziel rückt weiter → nächster Kreis
                                                Schicht dazu (Karte, R, Schichten-Modus) ⇅ überspielt
Korb (Ernten) from any state → a new Kreis that is already playing.
Rückgängig from any state: cancels what is pending first, then undoes the last step.
```

A tap on a Kreis does the obvious next thing: empty → record into it; recording → close; playing → mute at the bar; muted → sound again at the bar. **Overdubbing a particular Kreis** is the rarest act, so it sits one level deeper (the card's "Schicht dazu", the nanoKONTROL2's R key, or Schichten mode). That keeps every one-tap meaning unambiguous.

### 3.4 The first ten seconds

The first start shows one coach mark above the Hauptknopf:

> „Tippe ●, spiel ein paar Töne, tippe noch mal – das ist dein Kreis. Oder einfach spielen und dann 🧺 ernten."

1. **0 s:** tap ●. With the Puls off, recording starts *at the press*; the disc turns red and counts seconds.
2. **1–6 s:** play a figure; its notes appear as red spores round the ring.
3. **≈ 7 s:** tap ● again. The loop closes **without a gap**, playing on from the press.
   - Myzel infers bars and tempo from the onsets (`intelligence.md` 5.1a), lights the beat line at "92 BPM" and sets the Puls tempo.
   - A **correction strip** floats for 6 s above the rail: `2 Takte · 92 BPM │ ½ │ ×2 │ 3/4 │ 1 │ 4`. A tap re-cuts from the Humus without stopping; the card keeps the strip.
4. **≈ 8 s:** the target has moved to slot 2. The next tap records a Kreis that **closes by itself** after Kreis 1's length: one tap per layer, and the hand is back on the field.

**The Korb route**, for players who would rather not think about the downbeat: just play. When you repeat a figure, the Korb glows lumen with a small "2" (bars; `intelligence.md` 5.1b). Tap it, and the repeated phrase is a playing Kreis *at once*, phase-continued, so the music never restarts.

### 3.5 Time, seams and the downbeat

- **A grid exists** (Puls, MIDI clock, or Kreis 1):
  - A press up to ⅛ bar *after* a downbeat counts from that downbeat. Late presses are forgiven: the Humus already holds the audio.
  - An earlier press waits for the next downbeat with a visible countdown: a big faint number in the field centre, where the eyes are, plus the arc on the button.
  - **Notes played before the downbeat are kept as an *Auftakt*** and folded onto the end of the cycle, where a pickup belongs musically.
  - The end rounds to whole bars (rel-sync).
  - **Later Kreise** default to Kreis 1's length and close themselves. While recording, a "länger" chip extends by one more base length (×2, ×3 …), so polymeter stays one tap away.
- **No grid** (the first Kreis, free): as in §3.4.
- **Seams** (from `loopers.md` §3.2):
  - every recording keeps margins on both sides;
  - ringing tails fold onto the start (`foldTail` precedent, V);
  - equal-power crossfades whose length follows the material;
  - mutes and stops are fades at the bar line, never cuts;
  - notes held across the seam are tied, not retriggered.
- **Clock:** the Fährte's continuous beat (`faeClock`, V), shared as one Takt clock. Starting the Puls never shifts a Kreis by half a bar (Fährte defect §3.11): the Puls aligns to the Kreise, not the other way round.

### 3.6 Live and loop are always visible

| Where | Live | Loop |
|---|---|---|
| Field | Solid ripples with hyphae, as today (`VIS.burst`, V) | **Dotted fairy ring** (12 spores, no hyphae) with the Kreis number, at the note's column and height. A new `visPush` kind (A). |
| Rail | The Hauptknopf is red only while *you* are being recorded | Each Kreis shows its spores and its head |
| Field tag (top left, 11 px) | – | `HEXENRING · 92 BPM · TAKT 3/4 · LICHTUNG 2` |
| Mixer | Klang, Ebene 2 | its own strip **Hexenring** |

A preset load, Stille or Schlafen never leaves Kreise playing unnoticed (Fährte defect E):
- **Stille** stops them; the Hauptknopf shows ▶ Ruht.
- **Schlafen** puts them to sleep with the cadence; they wake at the bar.
- **A preset change** keeps them, with a toast "3 Kreise laufen weiter (eigener Klang)". The tag stays.

### 3.7 Hands-free

| Way | What it does | Default |
|---|---|---|
| **Bluetooth page-turner pedals** (keyboards: PageDown/Up, arrows, Space; A) | A new Zuweisen source kind "Taste" (A), caught globally once learned | Right = Hauptknopf (held = push-to-record), left = Rückgängig; 3rd = Korb, 4th = next Lichtung |
| **MIDI** (pads, footswitches, the microKEY's sustain jack) | Targets `hx.haupt/ernten/rueck/wieder`, `kreis.1–8`, `kreis.n.stumm/pegel/eigensinn/schicht`, `lichtung.vor/zurueck/1–8` | Only `hx.haupt` is learned momentary (extending `learnDone`'s exception, V). **Toggle-mode pads** (Fährte defect H) are detected while learning; every edge then counts as a tap. |
| **Lauschen** | An armed Kreis starts with the first note event: exact, no audio threshold (that only for a mic) | "Start: sofort / ab dem ersten Ton"; one tap, then both hands play |
| **Count-out** | Later Kreise close by themselves | on |
| **Gestik** | Nothing hard-wired: Wenden stays Schlafen, Schütteln stays Ladung. "Ruhe → Ernten" only via Zuweisen. | – |
| **Haptics, click** | Android buzz on count-in beats; optional audible count-in | off |

### 3.8 Phone with a keyboard, iPad, PC

- **Phone + microKEY or nanoKEY.** The keys play; a footswitch in the microKEY's jack runs the Hauptknopf. The nanoKEY Studio's 8 pads are all taken (V), so use a pedal or a Zuweisen scene. The rail is the display.
- **iPad** (`designer-ipad.svg`). No Web MIDI (V), so pedals arrive as Bluetooth keys. Two rail rows: Korb, Hauptknopf, Kreise 1–8 at 56 px, ↶ ↷; then Lichtung chips and the Reigen line "1 ×4 → 2 ×8 → 3 ×4 ↺".
- **PC 1366 × 768** (`designer-pc.svg`). Rail under the field; the panel on the right lists each Kreis as a channel-like row (ring, name, Pegel, M, S). With the field or rail focused: **Space** = Hauptknopf, **E** = Ernten (outside the note row, V), **1–8** = Kreis taps, **Strg+Z / Strg+Umschalt+Z** = undo/redo, printed under the targets.

**nanoKONTROL2.** Its profile owns the device (`own:1`, V). Today its strips are the mixer. I propose a second **page** on **SET** (free, V), with its LED lit = Hexenring (A: LED control via external LED mode).

```
KORG nanoKONTROL2 – page "Hexenring" (SET lit). Without SET: everything as today (mixer).
 TRACK ◀ ▶   preset back/next (unchanged)        strip n = Kreis n (1–8):
 CYCLE ⟲     Ernten                              knob    Eigensinn
 SET         page Mischpult ⇄ Hexenring          S       Solo
 MARKER ◀ ▶  Lichtung back / next (at the bar)   M       stumm (at the bar; LED = muted)
 ◀◀  ▶▶      Rückgängig / Wiederholen            R       record / close; on a playing Kreis:
 ■   ▶       everything ends / starts at the bar          Schicht (again: end it); LED lit = rec, blink = wartet
 ●           REC, Aufnahme in Takten (unchanged) fader   Pegel
```

R is "record arm" in every DAW, so R1–R8 as the Kreis record keys is what a nanoKONTROL2 owner expects. On screen the rail prints 1–8 under the Kreise and the field tag says "nanoKONTROL2: Seite Hexenring", so the page is never a hidden mode.

### 3.9 Undo

- **One history (Verlauf)** for every step that changes content: new Kreis, Schicht, Ernten, a re-cut, Löschen, Behalten, Klang or Folgen. Mutes, solos and Lichtung switches are performance; tapping again undoes them.
- **↶** cancels a *pending* action first (SooperLooper), then undoes the last step. **Redo** sits in the toast ("Schicht 3 von Kreis 1 entfernt · Wiederholen"), on the PC also Strg+Umschalt+Z and ▶▶.
- **The Verlauf list** in the panel returns to any earlier state (Endlesss-like). States point to stored layers, so Löschen keeps the audio until memory runs short; the oldest go first.
- **Separate from patch undo**: the rail's ↶ carries a small dotted ring (§8, question 9).

### 3.10 Accessibility

- **Screen readers (VoiceOver, TalkBack).**
  - The rail is a `role="toolbar"` (←/→ between targets, Space/Enter = tap). Each Kreis is a real `<button>` labelled with its full state: „Kreis 2, Amöbe, 2 Takte, spielt, Eigensinn Atmen".
  - A screen-reader-only "Details" button follows each Kreis, because a long-press is hard to discover by ear.
  - A polite live region announces state *changes*, never beats: „Kreis 3 beginnt in 2 Schlägen", „Kreis 3 spielt, 4 Takte".
  - No hold is ever required: push-to-record has a tap-tap alternative.
- **Contrast** on the loam ground (#110d0b, computed): creme 15.7:1, dim 6.9, spore 10.9, lumen 14.2, rec 6.3. All Kreis strokes pass WCAG 1.4.11; the empty track uses dashed dim, not `--line` (1.5:1).
- **Never colour alone** (1.4.1): recording = filled disc + number, target = dashed + "+", muted = hollow + stroke, Eigensinn = hyphae + buds. Red and orange never carry a state by themselves.
- **Motion.** With `prefers-reduced-motion`: no blinking, the playhead steps per beat, the count-in is a static number.
- **Targets** ≥ 40 px visual with ≥ 44-px hit areas (2.5.8).

---

## 4. What it records and how it plays back

**One window, three recordings.** Every Kreis keeps three things of the same bar-exact window:

| Part | Content | Source in code |
|---|---|---|
| **Noten** | Every note with its touch: degree, octave and frequency, Höhe *over time*, velocity, bend and MPE, release. From the field, computer keys, MIDI and the X-Y pad, plus Regen and Rassel hits. | Gesture layer `onDown/moveTouch/onUp`, and a `playNote` wrapper for scheduled sources (code-map §8B) |
| **Bewegung** | The Fährte's lanes (Gestik axes, learned knobs), as **absolute** values per Kreis. This fixes Fährte defects D and G. | `faeIn`-style lanes, now on the Kreis's clock |
| **Abdruck** | The exact sound of what you played | A looper processor on the strips' `st.duck` taps (`fin`, `eb2`, `rgn`), dry, so Echo and Hall stay live on playback; or **"Alles"**: the pre-master sum (resampling, bounce) |

**Source per Kreis.** The default is "Was du spielst": not the Puls (it runs anyway) and never other Kreise (no feedback). "Alles" is a chip in the card.

**Playback, chosen by what the music needs, not by a mode switch:**
- **Treu (Abdruck).** While nothing has to change, a Kreis plays its print: sample-exact, with the very Rhizom cascade and grain cloud you heard.
- **Lebendig.** The moment it must *follow* (scale, transposition, tempo, a new sound, Eigensinn > 0), it is re-performed from its Noten and Bewegung through the voices, with a **seeded** random generator so a stored variant returns the same (code-map §1.7).
- The ring shows which: plain spores = Abdruck, spores with tiny hyphae = lebendig. The card can pin either.

**Following:**
- **Scale.** *Stufen* (default; degrees kept, so Dorian becomes Lydian on the same degrees), *Transponieren*, or *Fest*.
- **Tempo.** A lebendig Kreis follows. An Abdruck holds its tempo, and the tempo control then shows a lock and offers "lebendig machen". Stretching is the owner's call (§8).
- **Sound.** "wie aufgenommen" (default, so a preset change does not alter a Kreis), "jetziger Klang", or any source from the library.

**Recording parameters:** lengths ×1/×2/×3/×4 of the base, or *frei* (asynchronous, never re-aligned: Eno's 79 and 83 feet). Verblassen defaults to *nie*.

## 5. The musical depth

**Transformations** (in the card, MIDI-learnable, quantised to the Kreis start):

| Transformation | Lebendig | Abdruck |
|---|---|---|
| Rückwärts | retrograde in time | tape backwards |
| Halbe / doppelte Zeit | rhythmic augmentation or diminution, **pitch kept** | tape octave (a resample; owner's call) |
| Versetzen · Kürzen | start moved by beats · a loop within the loop (½, ¼) | the same on the print |
| Phase · Verblassen | Reich-style drift of a few ms per pass · level loss per pass | the same |
| **Zersetzen** | – | HF loss, wow and drop-outs written into the print pass by pass (undoable): Basinski on a phone |

**Form on a phone.**
- **Lichtungen** are chips at the top of the Hexenring section. A Lichtung holds which Kreise sound, their levels and Eigensinn, and optionally scene A/B and Puls on/off.
  - A tap goes there **at the bar** or at the end of the longest Kreis; while pending, the chip is dashed with "ab Takt 9".
  - "+" stores the current state; holding a chip offers Überschreiben, Umbenennen, Löschen.
- **The Reigen** orders Lichtungen with pass counts and can loop; the active chip shows "noch 3 Takte".
- **Subtraction** (tapping Kreise mute) stays the most direct tool. The panel can stay open while playing, so form is one thumb away.

**Intelligence: shown and vetoable.** Its colour is always **lumen**: lumen means "the machine".

- **Service** (always on, never adds notes):
  - bar and tempo inference with the correction strip;
  - repeat detection, shown as the glowing Korb;
  - the Auftakt fold;
  - groove-keeping quantisation (off by default; strength in the card);
  - scale following;
  - seams.
- **Co-player, per Kreis, through Eigensinn** (`intelligence.md` §4.2, §5.2–5.6):
  - *Atmen:* micro-timing from your own groove;
  - *Variieren:* weak-beat neighbour notes, contour kept;
  - *Antworten:* when you stop, an answer from your own material, and the *Mitspieler* rule, under which Kreise playing your current role rest. The ring shows a lumen halo, and the card gives the reason.
  - *Eigenwillig.*
- **The forecast.** Changes for the next pass appear as **Knospen** one bar ahead on the ring, and as chips in the card ("T3: A3 → C4 ✕"). A ✕ vetoes that change; **Behalten** makes the current variant the new Anker; **Zum Anker** returns at once. All three are undoable.
- **Restraint.** Answers stay silent until roughly 30–60 events exist, rather than babble. Role switches happen only on bar lines, with one bar of hysteresis.

**Ties to the rest of Myzel:**

| Part | How it connects |
|---|---|
| **Puls** | Kreis 1 sets the Puls tempo; "Puls aus Kreis" takes the Puls swing from the Kreis's groove. |
| **Sporenregen** | "Kreis als Gelände": a Kreis's notes become Keime; the rain arpeggiates your loop. |
| **Rhizom** | The Abdruck keeps the exact cascade; lebendig grows a new one every pass. "Never twice the same", chosen per Kreis. |
| **Gespinst** | A send "ins Gespinst" lets a Kreis ring the web. |
| **Gestik** | Bewegung lives in the Kreis; Schlafen puts Kreise to sleep. Optional Ladung target "Eigensinn": shaking lets lebendig Kreise grow wild for a few bars. |
| **Mixer, presets, takes** | One strip "Hexenring" (PC/iPad: optionally one per Kreis). User presets store Kreise by reference (audio in IndexedDB). "Als Take sichern" gives WAV export for free (code-map §8.7). |

## 6. What is new

Compared with `loopers.md` and `intelligence.md`:

1. **A visual grammar for live and loop on the playing surface itself**: solid hyphae against dotted fairy rings, coloured by role (red = you are recorded, lumen = the machine). Loopy shows loop *clips*; no looper I found marks looped *notes* where they sound.
2. **Loops as readable note rings** (radius = pitch, spores = notes, buds = forecast) instead of opaque progress circles. You see a Kreis's *melody shape* at 40 px.
3. **Print and score in one Kreis, switched by the music's needs, and visibly so.** Ableton and Deluge convert by hand; here exactness is the default, and life is what you get the moment you ask the loop to follow or vary.
4. **The machine's will one bar ahead, vetoable per note**, on a phone: ReaLJam's plan display and Spire Muse's approve and revert, folded into one gesture set.
5. **A gesture grammar without double-tap or delayed taps**: press-down timing, hold = momentary (push-to-record), long-press = details (never destructive), the Auftakt fold, late presses forgiven from the Humus.
6. **The rail as the instrument's metronome**: the first visible beat on Myzel's play screen.
7. **Form as Lichtungen and a Reigen on a 360-px screen**, and a nanoKONTROL2 page that turns a mixer controller into an 8-Kreis looper.

## 7. Feasibility sketch

- **UI.**
  - The rail: a `<div id="rail" role="toolbar">` of real buttons over one small canvas, redrawn in `frame()` (V). Portrait: inside `.main`, a flex column of `#stage` and `#sheet` (V). Landscape and ≥ 900 px, where `.main` is a row (V): stage and rail share a wrapping column (A).
  - Count-in and correction strip: overlays on `#stage`. Field loop notes: a new `visPush` kind without hyphae (A).
  - Long-press: the `kqPress` pattern of the engine chip (V). Card and Lichtungen: a section on top of `buildRec` (V); toasts with an action (V).
- **Engine** (`code-map.md` §8).
  - The shared Takt clock from `faeClock`. Events at the gesture layer plus a `playNote` wrapper (`kqHear` probes excluded).
  - Abdruck: a lazily loaded looper processor in the worklet module, preallocated buffers, sample-exact by `{t}` messages, so stalls cannot touch it (Fährte defect L).
  - Lebendig: synthetic touches scheduled ahead in `tick()`, at the full look-ahead.
  - Strip `hxr` in `STRIPS`, `mxChannels.own`, `mxSrcText` (V: the list throws without it). Hooks in `panic`, `slpEnter`/`slpWake` and the visibility keep-alive (V).
- **Controls.** `midiTarget` entries and the `learnDone` exception (V: ≈ line 11954 hard-codes `fae`); a learnable "Taste" source (A); a nanoKONTROL2 bind set toggled by SET, LEDs via MIDI out (A); old `fae*` pads map to `hx.haupt`/`hx.ernten`.
- **Memory** (384 KB/s, V): the Humus ring of 64 s ≈ 24.6 MB; a 4-bar Schicht at 92 BPM ≈ 4 MB plus margins; 8 Kreise × 3 Schichten ≈ 100 MB at worst, shown in MB as the take list does.
- **Cost.** The rail is negligible and Abdruck playback cheap. **Lebendig Kreise cost voices**; each card shows "kostet 1,8 Einheiten", measured honestly, never a reason to simplify (§8, question 3).

## 8. Risks, honest limits, and questions for the owner

**Risks and limits**
- **The rail costs 10 % of the field on a phone.** Folding helps; it is a real trade.
- **Small targets.** Kreise are 40 px at 360; buds on the rail are too small to tap, so vetoes happen in the card. A phone shows 4 Kreise per page.
- **Long-press is a convention, not a discovery.** One hint after the second Kreis: „Halte einen Kreis für seine Karte".
- **The Abdruck → lebendig switch is audible by nature**: room, randomness and cascades differ. The ring texture tells you, but the ear notices first.
- **Bluetooth headphones** (100–300 ms) make overdubbing impossible. The Hexenring warns on a high `outputLatency`; it cannot fix it.
- **Page-turner pedals vary** (some send media keys a page cannot read; A). The learn step shows this at once.

**Questions for the owner**

1. **The default of the big button.** *Kette* (each tap a new Kreis that closes itself; my proposal) or *Schichten* (overdub the same loop, RC-style)?
2. **Treu = Abdruck by default.** Is exactness the right default, with life when asked? Or should Kreise be lebendig by default, "never twice the same"?
3. **The voice budget.** When lebendig Kreise and live playing exceed the budget, which voices are stolen first? I would steal Kreis voices before your live notes, but that is a sound decision, not mine.
4. **Tempo changes with Abdruck Kreise.** Lock the tempo (my default), resample (pitch moves, tape-like), or time-stretch? All three touch sound quality.
5. **The rail on phones.** Is 56 px of field for an always-visible looper acceptable? Or should it start folded (24 px) until the first Kreis?
6. **Names.** "Kreis" shares its stem with "Kreisen" (auto-pan, knob "Kreis-Tempo"). My alternative is **"Reif"** (hoop). Do you like "Hexenring"?
7. **The nanoKONTROL2 page on SET.** Is a page toggle acceptable on hardware, if LEDs and the screen always show it? The alternative is a fixed mapping on the free keys only (R1, R2, R8, ◀◀, ▶▶).
8. **The Fährte.** Retire its bar button and fold it into the Kreise (as recommended in `faehrte.md`)?
9. **Two undo stacks.** Keep the Hexenring's ↶ separate from patch undo (my proposal), or have one shared history?
