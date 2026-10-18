# Hexenring – check from the stage

*Adversarial review of `dev/looper/KONZEPT.md` (draft of 18.10.2026), written as a live-looping performer and looping teacher (RC-505, Ableton Looper, Loopy Pro, SooperLooper, Blooper). Read against `ideas/BRIEF.md`, the five proposals and `research/loopers.md`. Section numbers (§) refer to KONZEPT.md. Code facts marked (V) were checked in `myzel/index.html` or `research/code-map.md`.*

**Severity.** **Blocker:** a builder would have to guess, or the default workflow fails on stage. **Major:** players lose time, material or trust. **Minor:** polish, wording, edge cases.

---

## 0. Verdict

The musical core is the best looper concept I have read for a touch instrument:
- retroactive harvest with a phase-locked takeover;
- "every pass is an offer";
- instant undo;
- measured seams;
- a clock that never jumps.

The interaction layer (§3.2 and §7) is not yet a grammar, though. It is a list of good gestures that collide as soon as a real thumb, foot or page-turner performs them.

Seven things must be settled before Etappe 1 is built:
- **B1:** the ring has four vertical meanings, two of them destructive.
- **B2:** the Korb acts on touch-down, but it is also dragged.
- **B3:** the pedal grammar collides with itself, and its "re-interpretation" is audible.
- **B4:** one "Ziel" serves both new loops and layers, so pedal B and Schichten mode have nowhere to go.
- **B5:** there is no clear, no start-over and no tempo reset, and Stille is a trap.
- **B6:** the default "Gespielt" Abdruck is not what you heard.
- **B7:** what Ernten takes is ambiguous in most situations.

Eighteen majors follow (M1–M18). Most are under-specification, plus a few places where §8 and §7 contradict §3.2.

---

## 1. Four walkthroughs, gesture by gesture

### (a) Beginner, phone alone, first five minutes
1. Under the field: a basket, a big red dot, four dashed rings, ↶. In the top bar: the familiar red "● REC". There are two red dots, both under "Aufnahme". Which one loops? Nothing says that Myzel is always listening. → M16
2. Taps the big red dot. With no grid, recording starts at the press. Plays 6 s, taps again: a loop. **This path works.**
3. Wants a second part and taps the dashed ring 2 ("+"). Nothing is heard; the ring turns orange. Every touch looper they know (Loopy, GarageBand, RC track buttons) would have started recording. → B4
4. Long-presses ring 1 "for options", the phone convention. It starts overdubbing in red. They let go: an empty Schicht. They swipe down "to close it" and undo the last Schicht, or the loop's only one; §3.2 does not say which. → B1
5. Pulls ring 1 down to make it quieter. A fast pull is the undo swipe. → B1
6. Plays a non-repeating noodle, stops, thinks, and taps the basket 4 s later. What length does it take? Where does the loop enter? Taken literally ("phasengleich, als hättest du weitergespielt"), it enters 4 s into itself, mid-phrase. → B7
7. Nothing obvious seems to have happened, so they tap the basket again. Two identical loops: +6 dB and comb filtering. → M1
8. Wants to start over and taps Stille: the loops stop, and the big button now shows ▶. They tap it to record something new, and the old mess comes back at the next bar. Nothing anywhere says "alles leeren". → B5

### (b) Performer, a 5-minute song, one hand (phone on a stand; the other hand on a mic, a guitar neck or a keyboard)
- **Korb:** works one-handed. This is the strongest part of the concept.
- **Overdub:** holding a ring needs a second hand.
  - The Korb drag is the only one-handed way to layer.
  - It starts with a press-acting button (B2).
  - It needs a 100–200-px aim while the pass is ending.
  - Deciding late raises "which pass?" (M11).
- **Drops:**
  - A tap "on the 1" arrives 40–80 ms late through touch latency.
  - Ring taps get no grace window, so the mute waits a whole bar (M2).
- **Sections and endings:**
  - Lichtungen live in the Aufnahme panel, which takes 54 % of the portrait screen.
  - Kern, Lücke, Schluss, Welken and Abbau have no screen gesture at all (M4).
- **Mid-song preset change for a new lead sound:** every running loop changes its filter, echo and hall (B6).

### (c) Ambient player, foot switch on the microKEY sustain jack, keyboard, phone on a stand
- Holds the pedal over a Böe chord ("halten = aufnehmen, solange gehalten"). At 2 s, Kern fires (B3).
- Taps the pedal to keep a beautiful pass as a layer. On one switch, a tap is Ernten, so the pass becomes a doubling new loop, not a Schicht.
  - Retro layering needs pedal B, and pedal B aims at the "Zielschleife".
  - In Kette mode that is the next *empty* slot (B3, B4).
- Double-taps to remove a bad layer. The first tap has already harvested a new loop, which sounds for about 300 ms before it is "re-interpreted". After two bad layers in a row, the second double-tap means redo (B3).
- Plays a slow pad over a running 2-bar groove loop. "Puls klar zu schwach → frei" (§3.3): the pad drifts against the groove (B7).
- The Bordun drone is excluded from "Gespielt" by default. The player stops the Bordun, and the bed disappears (M8).
- The Bauplan count-in is visual only, while the eyes are on the keys (M9).
- Puts the phone face down on the table for 30 s. That is an Atempause, and after 20 s (`SLP_LONG`) a "long sleep ends the set" (minor 12).

### (d) iPad and a Bluetooth page-turner
- Many page-turners send key-down and key-up at once, however long the foot stays down; others auto-repeat. "Halten" and "2 s halten" may not exist (B3).
- After any touch, a ring button or a mixer knob keeps focus.
  - The pedal's PageDown or arrow then also steps that knob: index.html ≈ line 16983 handles ArrowUp/Down/Left/Right, PageUp and PageDown on a focused mixer knob (V).
  - Space clicks the focused button as well as the Hauptknopf (M12).
- Pedal B, "Durchgang als Schicht (Korb auf die Zielschleife)", fails in Kette mode (B4).
- Lob, Nein and Anker have no pedal or MIDI target (M14).

---

## 2. Blockers

### B1 · The ring has four vertical meanings, two of them destructive · [blocker]
**Where:** §3.2, "Schleife":
- halten = Überspielen;
- nach unten wischen = letzte Schicht zurück;
- nach oben wischen = Karte;
- hoch/runter ziehen = Pegel.

§7 "Fluchtwege" adds "am Ring drehen", a fifth gesture that is not in the grammar.

**What goes wrong:**
- On a 40-px ring in a 56-px strip, a swipe and a drag on the same axis can only be told apart by speed.
  - On stage, a quick pull-down to duck a loop undoes its last layer.
  - A quick push-up opens the card and half the screen.
- Hold versus drag:
  - A press that rests 300 ms before the drag starts recording an overdub.
  - Does the drag that follows set the level while recording?
  - A thumb resting on the strip ("im Daumenbereich") records.
- Undo on the loop's only Schicht: removes the loop? Unspecified.
- §7 Barrierefreiheit says "Kein Halten ist Pflicht", but overdubbing a particular ring exists only as a hold.

**Fix:** Three ring gestures, told apart by movement and time, never by speed:
- **Tap** = the state action.
- **Vertical drag beyond 12 px** = level, with a dB readout.
- **Hold ≥ 0.5 s without movement** = card. It is never destructive and matches the phone convention (the designer's proposal).

Move the other meanings off the ring:
- Undo goes to ↶ only, with a per-Schicht list in the card.
- The phase nudge goes into the card.
- Overdub goes to the Hauptknopf in Schichten mode and to the retro Korb (B2, B4).

If the owner wants hold-to-overdub on the ring, then level and card must leave the ring entirely. Never both.

### B2 · The Korb acts on touch-down and is also dragged · [blocker]
**Where:** §3.2:
- Korb: tippen = Ernten.
- Korb: auf eine Schleife ziehen = Schicht.
- "Zeitkritische Knöpfe (Korb, Hauptknopf) wirken beim Aufsetzen."

§3.5 makes the drag the headline gesture.

**What goes wrong:**
- At touch-down the Korb has already made a new Schleife, and it sounds.
  - Either the drag that follows withdraws it, which is audible for the length of the drag (0.3–1 s);
  - or the Korb waits for the drag threshold, which is the Fährte's 400-ms delay in a new costume.
- One-handed, the drag is the only way to layer, and it is hard to aim while the pass is ending.
- Dropping onto a ring on the other phone page (4 rings per page) is impossible.
- Dropping onto an empty ring is undefined, yet §8 A 0:55 does exactly that.

**Fix:** The Korb is tap only and press-acting. Layering becomes a tap, not a drag:
- After every harvest, the correction strip carries "→ 1 · → 2 · → 3".
- One tap turns the new Schleife into a Schicht of that ring, re-cut from the Humus to that ring's last pass.
- When the lengths match, the change is inaudible: same pass, same phase. It works one-handed and needs no aim.
- Add the Fokus rule from B4 for pedals and Schichten mode.

*Alternative, if the drag must stay:* commit the harvest at release, with the window stamped at press. State that the first loop then enters up to about 150 ms late (faded in) when the player stopped exactly at the tap.

### B3 · The pedal grammar collides with itself · [blocker]
**Where:** §7, the first two rows of the table, and "Warum ein Doppeltipp am Pedal geht".

**What goes wrong:**
1. **Hold and 2-s hold are one gesture.** "halten = aufnehmen, solange gehalten" and "2 s halten = Kern" cannot be told apart. Every push-to-talk recording longer than 2 s triggers Kern, which means every drone and every 2-bar phrase below 120 BPM. Pedal B has the same problem with tap, double and hold.
2. **The re-interpretation is audible.** The tap acts "sofort", and Ernten makes sound at once. A hold or a double-tap can only be recognised later, so each first plays a harvested loop for 0.3–0.5 s and then withdraws it.
   - "Ohne hörbaren Verlust" is true for the window, not for the sound.
   - Classic loopers get away with double-tap because their first tap (toggling overdub) is silent. Ernten is not.
3. **Only one undo step.** "doppelt = Rückgängig (nochmal = Wiederholen)": a one-pedal player cannot remove two bad layers. Is "nochmal" a third tap or a second double-tap?
4. **B has no target.** B's "Schicht auf die Zielschleife" fails in Kette mode (B4).
5. **Page-turners often cannot hold.** Many send press and release at once; others auto-repeat. Hold meanings are unreliable on exactly the devices §7 calls "das einzige Pedal" on iPad and iPhone.

**Fix:** One rule: *a switch may carry a second meaning only if its first action is silent or still pending.*

| Setup | Default meaning |
|---|---|
| 1 switch, profile "Korb" | tap = Ernten (press-acting). Optional: hold ≥ 0.4 s = keep layering what you play while held. This is compatible, because nothing is withdrawn. No double tap, no 2-s hold. |
| 1 switch, profile "Aufnahme" | tap = Hauptknopf (the start is silent); hold ≥ 0.5 s = push-to-talk, release closes (rounded on a grid). |
| 2 switches | A = Korb, as above. B tap = Schicht into the **Fokus** loop, committed at **release**: a retro layer that enters 150 ms late into an already playing loop is inaudible in practice. B hold ≥ 0.5 s = Rückgängig; nothing has sounded yet, so it is safe. Each further hold goes one step deeper; ↷ is on screen. |
| 3–4 switches, MIDI | C = Hauptknopf. D tap = next Lichtung, which is pending, so D hold ≥ 1 s may safely become Schluss. Kern goes on MIDI or the nanoKONTROL2. |

The learn step must test **hold**. If a pedal auto-repeats or cannot hold, it offers the tap-only profile and names the meanings that are lost.

### B4 · One "Ziel" for two jobs; tapping an empty ring does not record · [blocker]
**Where:** §3.2 ("leer: wird das Ziel des Hauptknopfs"), §3.4 (Kette/Schichten), §7 (pedal B, nanoKONTROL2 R).

**What goes wrong:**
- The orange Ziel is where the Hauptknopf records next, and in Kette mode it is always an empty slot.
- Pedal B ("Korb auf die Zielschleife") and Schichten mode ("immer dieselbe Schleife") need a *playing* loop as their target. But tapping a playing ring mutes it, so a playing loop can never become the target:
  - in Schichten mode the player cannot move overdubbing back from loop 2 to loop 1;
  - in Kette mode, pedal B has nowhere to go.
- Tapping an empty ring only selects it. Beginners expect it to record, and the word under the ring cannot honestly say "aufnehmen". The §3.2 word list has no word for an empty ring.
- Unspecified: does a Korb harvest land in the Ziel or in the first empty slot, and does the Ziel move afterwards?

**Fix:** Two markers.
- **Ziel** (orange "+"): the empty slot for the next new Schleife. It advances by itself.
- **Fokus** (a creme bracket): the playing Schleife that receives Schichten.
  - It is the newest Schleife, or the one last layered via a "→ N" chip, or the one chosen in its card.
  - Pedal B, Schichten mode and nanoKONTROL2 R on a playing loop act on the Fokus.
- **Tap on an empty ring** = record into it: it becomes the Ziel and starts, like the Hauptknopf. Its word is "aufnehmen".
- **Korb harvests** always land in the Ziel.

### B5 · No clear, no start-over, no tempo reset, and Stille is a trap · [blocker]
**Where:** §3.2 (Stille), §3.5 ("Gelöschte Schleifen …"), §5.2, §11.

**What goes wrong:**
- §3.5 mentions deleted Schleifen, but no gesture deletes one. Nothing clears everything, and nothing releases the Takt the first Schleife set.
  - A second song at a new tempo is impossible without a reload.
  - Does MIDI clock out keep the old tempo?
- After Stille, the Hauptknopf shows ▶. A player who wants "something new" brings the old loops back.
- Does the Korb still work after Stille? Does a harvest then play alone while the others wait?
- A builder must invent all of this, including its undo.

**Fix:**
- **One Schleife:** "Schleife löschen" in the card. It goes to the Humus and can be undone.
- **Everything:** hold ↶ ≥ 1.5 s, with a filling ring = "Alle leeren". It can be undone, and a toast offers Rückgängig (SooperLooper's long-press undo-all).
- **Tempo:** when all Schleifen are cleared, a Takt that came from a Schleife is released (Puls and external clock keep theirs). A chip "Tempo behalten · 91" keeps it.
- **After Stille:**
  - ▶ on the Hauptknopf, plus a toast "4 Schleifen angehalten · Weiter · Leeren";
  - Korb and empty rings still record;
  - a harvest plays alone, and ▶ brings the others back.
- **Staging:** all of this belongs in Etappe 1.

### B6 · The default Abdruck is not what you heard · [blocker]
**Where:** §0 ("den genauen Klang, mit Raum, Nachklang"), §4.1 "Gespielt", §4.2 ("Sample für Sample, was du gehört hast"), §6 Presets, §12.

**What goes wrong:**
- "Gespielt" taps the channels dry and plays them back "wieder durch dieselbe Effektkette", into the live echo and hall.
- That insert chain sits on the sum (V, code-map §3, `A.voiceBus`): drive, ring, filter with LFO, phaser, chorus, auto-pan. So:
  - **The chain changes the loop afterwards.** Record a loop through a closed filter, then open the filter for the solo: the loop opens too. Switch the ring modulator off, and it leaves the loop.
  - **No two passes are equal.** The filter LFO and Kreisen run free against the loop. The Abdruck is then neither "Sample für Sample" nor a valid reference for the −108 dB Wuchs identity.
  - **Presets change running loops.** A preset change mid-song (for a new lead sound) changes every running loop's chain, echo and hall. §6 does not even say whether a preset stops loops.
  - **Bewegung steals the controls.** The Bewegung lane could restore a sweep, but replaying it moves the *global* filter under the live player's hands: the Fährte's "verhext" feeling again. Two loops with Bewegung fight over one knob.
- The owner's decisions in §13.2–3 rest on "Abdruck = exact". The performer proposal named this limit (its §9); §12 dropped it.

**Fix:** Decide, and write the decision down. Recommended, following the owner's rule:
- Each Schleife plays through **its own copy of the insert chain**, driven by its recorded chain lanes and LFO phase. Chain copies already exist (`updSends`, V).
- Echo and hall stay live, which is good for the seams, and §0 says so.
- The live chain stays the player's, and preset changes do not touch running loops.
- Bewegung lanes of global controls replay only when switched on per Schleife.
- Cost is measured and entered.

If this is refused:
- §0 and §4.2 must say "Abdruck = what you played, before the effect chain";
- the ring must show it;
- §12 must list it as a limit.

### B7 · What Ernten takes is ambiguous in most situations · [blocker]
**Where:** §3.3, §3.6.

**What goes wrong:**
- **With a grid,** "die letzten 1, 2, 4 oder 8 Takte bis zum Taktstrich, den du gerade gehört hast, einschließlich des laufenden Takts" contradicts itself: a window that ends at the bar line just heard cannot include the running bar.
  - Tap on beat 3 of the last bar of a 4-bar phrase. Does the loop start now, from bars that do not contain your phrase's end? Or at the next bar line?
  - The grace "kurz nach dem Taktstrich" has no number. The proposals said ⅛ bar, ¼ bar and 200 ms.
- **No grid, no repetition found:** "der letzte ganze Durchgang" is undefined. Does it start at the first note after a silence? Does it end at the tap, or at the last onset?
- **Tap after a silence:** "phasengleich, als hättest du weitergespielt" starts the loop mid-phrase (walkthrough a6).
- **Weak pulse while a grid runs:** "wird die Schleife frei". A pad over a groove drifts against it.
- **Automatic length every time:** on stage a player wants the length to be predictable.

**Fix:** One table in §3.3. The Korb's label always shows what a tap takes *now*: "2 T · 91", "4 T", "frei · 26 s" or "ab Takt 9".

| Situation | Window | Entry |
|---|---|---|
| Grid, tap ≤ ⅛ bar (max 250 ms) after a bar line | N bars ending at that bar line | at once, phase-locked |
| Grid, tap later in the bar | N bars ending at the *next* bar line | at that bar line; the Korb shows "ab Takt X"; ↶ cancels |
| Grid, sustained or rubato material | still on the grid, rounded to bars | as above; "frei" only by choice |
| No grid, repetition found | the last whole cycle | at once, phase-locked |
| No grid, no repetition | first onset after ≥ 1 s of silence → the tap (or → the last onset plus its ring, if the tap comes later) | at once; the tap is the seam |
| Silence of ≥ 1 cycle (or 2 s) before the tap | as above | from the loop's start at the tap (with a grid: at the next 1), never mid-phrase |
| Nothing in the Humus | nothing; a hint | – |

Add a stage option "Ernte-Länge: automatisch · wie Schleife 1 · fest N Takte".

---

## 3. Majors

### M1 · Precedence between Korb, Hauptknopf and recordings is undefined · [major]
**Where:** §3.2–3.4.

**Undefined cases:**
- **Korb during a recording:** tapped while the Hauptknopf records or waits (a Kette auto-close running): two loops of the same material?
- **Korb twice:** two taps within one pass give a doubled loop, the Fährte's "schneller zweiter Tipp" in a new form.
- **Hauptknopf during auto-length:** a tap during a Kette auto-length recording: close early, cancel, or "länger"?
- **Hold past the Grundlänge:** what happens?
- **All slots full:** what do the Korb and the Hauptknopf do when all 8 slots are full?
- **Tap versus hold:** a nervous 400-ms tap on the Hauptknopf becomes push-to-talk and closes a 0.4-s loop.

**Fix:** Write a precedence list:
- Korb during a recording or a wait: the harvest replaces the recording (one loop; the recording's time is in the Humus anyway).
- A second Korb tap over the same window: a re-cut, never a second loop. New playing makes a new window.
- Hauptknopf during auto-length: close at the next bar line; shorter results such as ½ or 1 bar are allowed.
- Hold threshold 0.5 s, and a minimum length of one beat; anything shorter counts as a tap.
- Full slots: the label says "voll"; nothing is overwritten silently.

### M2 · Mute and unmute land a bar late · [major]
**Where:** §3.2, "Schleife tippen". Only the Korb and the Hauptknopf get press timing and the "kurz nach dem Taktstrich" grace.

**What goes wrong:** A drop on the 1 arrives 40–80 ms late through touch latency, so the mute waits a whole bar.

**Fix:**
- Rings act on press.
- A tap ≤ ⅛ bar (max 150 ms) after a bar line acts on that bar line: a mute fades now, an unmute enters now, in phase.
- A second tap while something is pending cancels it.
- Free loops have no bar lines: mute at once with a 40-ms fade, and let the tail ring.

### M3 · ↶ is unpredictable · [major]
**Where:** §3.2 ("bricht zuerst ab, was noch wartet"), §3.5.

**What goes wrong:**
- With the Gärtner on, a Knospe is almost always pending. If that counts as "was wartet", the first ↶ never removes your bad layer.
- It is not stated which steps are in the history: mutes, level drags, Lichtungen?
- How do the per-ring swipe-undo and the global ↶ interleave?
- Redo is only "im Hinweis", a toast that disappears.
- Myzel already has a patch undo (`HIST`, 30 snapshots, V), so the UI shows two "Rückgängig".

**Fix:**
- ↶ cancels only the player's *own* pending actions, newest first. Knospen have their own veto (M14).
- The history holds content steps only: new Schleife, Schicht, harvest, re-cut, delete, sound or follow change, Erstarren. Mute, level and Lichtung are performance (the designer's rule).
- After an undo, a ↷ sits next to ↶ for 8 s.
- One sentence on how this relates to patch undo.

### M4 · Song form is out of reach on stage · [major]
**Where:** §5.2, §7.

**What goes wrong:**
- Lichtungen are chips in the Aufnahme panel, which takes half the field on a phone. Storing one ("+" lang drücken) also happens there.
- Kern, Lücke, Schluss, Welken and Abbau have no screen gesture.
- "Kern" never says which loops belong to it.
- Schluss exists only as pedal B hold or nanoKONTROL2 ■.
- Lichtungen are Etappe 2. Etappe 1 has no sections, and loopers.md §7 warns against "one endless crescendo".

**Fix:**
- **One form button** at the Ringleiste's right end:
  - tap = next Lichtung at the next 1 (pending, visible, cancellable);
  - hold = a row over the Ringleiste with the Lichtung chips, "merken", Kern, Lücke, Schluss and Welken.
- **Kern** = the loops marked in their card (default: the first Schleife).
- **When a Lichtung switches** ("am Taktstrich oder am Ende der längsten Schleife"): one rule per Lichtung, shown on its chip.
- **Staging:** move the button and the Lichtungen into Etappe 1.

### M5 · Stop, mute and re-entry phase are undefined · [major]
**Where:** §3.2, §3.6, §5.2, §6 Schlafen.

**What goes wrong:**
- **Re-entry phase is open.** "Stumm" keeps the playhead, which is good. But after Stille, Schluss, an Atempause, a Lichtung or Kern, do loops come back in the running phase (a 3-bar loop enters in its bar 2), or from their own start on a common 1? With polymeter, that is the difference between "the band comes back" and a mess.
- **Schlafen and the Atempause disagree.** Schlafen ends loops "an ihrer Naht" (§6), the Atempause "mit ihrem Takt" (§5.2). A 26-s free loop could play on for 25 s after the flip.
- **The tail fold can leave a ghost.** The Ausklang is "ab dem zweiten Durchgang an den Anfang gelegt". If it is baked into the buffer, the first pass after a re-entry starts with a tail from a pass that never sounded.

**Fix:** Two states.
- **stumm:** the phase runs on, and the loop re-enters in phase. Used by mute, Lichtung, Kern and Lücke.
- **angehalten:** each Schleife re-enters from its own start on the next 1, a fresh meeting. Used by Stille, Schluss, Atempause and Schlafen.

Ending:
- Gridded loops end at the next bar line, with their tails.
- Free loops fade over about 1 s, with their tails.

The tail fold is applied per pass, and only when the previous pass actually sounded (the engineer's rule).

### M6 · Automatic Abdruck→Wuchs changes music the player did not touch · [major]
**Where:** §4.2 ("Sobald sie folgen muss …"), §4.3, §13.3.

**What goes wrong:**
- **Scale change:** the player changes the scale to colour the *live* field, and every loop re-voices "diatonisch" at its next seam. A bass that was right is now different. Nobody asked the loops.
- **Slow devices:** a loop the device cannot render "bleibt Abdruck", and then it cannot follow. After a key change, a Gong loop stays in the old key under the new one. "Ihr Klang wird nie verringert", but the music is wrong.
- **Seam timing:** the switch lands on the next seam, with a lead of at least 1 s.
  - A 26-s free loop clashes for up to 26 s.
  - Short loops clash for a whole pass when the change comes less than 1 s before their seam.
- **Bloom (§13.3):** it arrives as a side effect of an unrelated key or tempo change. The loop suddenly sounds different, and the player suspects a bug.

**Fix:**
1. A scale or tempo change while loops play is itself a pending action. It shows as Knospen on the rings ("folgt ab Takt 9 · Nein"), and field and loops change on the same bar line (option "Tonart am Takt").
2. Each loop's follow rule is visible on its ring.
3. At harvest, the device predicts its render speed from its calibration (V, engineer §7.5) and marks loops that cannot grow. Before a key change lands, those are flagged, and the player chooses:
   - mute it at the seam;
   - "Live" at the measured cost;
   - leave it as it is.
4. Long loops switch at the next safe point inside the pass (a rest), not only at the seam.
5. If the owner chooses "Wuchs in bester Stufe", the bloom happens predictably at the second pass of every loop, with a mark, never later as a side effect.

### M7 · Auslese breaks "at once" and "never changes a note" · [major]
**Where:** §5.3, §8 C 0:50, §13.2.

**What goes wrong:**
- A consensus was never played, so it has no Abdruck: Auslese can only be Wuchs.
- Wuchs needs about 1 s of lead, plus 23–33 ms of context setup. The immediate takeover therefore cannot be the consensus. §8 C's "der Ausrutscher ist weg" is not what the first pass sounds like.
- Auslese applies by default whenever agreement is ≥ 80 %, with "letzte Fassung" to revert. That contradicts:
  - "Sie ändert nie eine Note, ohne dass du es willst";
  - §13.2, "a new Schleife starts as Abdruck".

**Fix:**
- A harvest is always the last pass's Abdruck, at once.
- Auslese is a chip, "Auslese aus 4 · 91 %". It switches at the next seam once it is rendered.
- Make it the default only after the owner's listening test.

### M8 · The Puls, the Bordun and what the Korb actually captures · [major]
**Where:** §4.1.

**What goes wrong:**
- **Notes and audio disagree.** The notes include Puls, Regen, Rassel and Wirbel, but the default audio excludes the Puls and the Bordun. When such a loop turns Wuchs, its re-render contains the Puls hits, and the drum pattern doubles.
- **Ambient players lose the drone.** They live on the Bordun, which is never in the loop: stop the Bordun, and the bed is gone.
- **Mute is not handled.** Is the tap before or after a strip's mute? The engineer said before. Then a loop can contain a channel you had muted.

**Fix:**
- One source mask for audio and notes: a Schleife's notes contain only events from channels in its Abdruck.
- The Korb shows the captured channels as small glyphs, and "Bordun mit" is one tap.
- Tap after mute and solo, so the loop holds only what you heard.
- "Puls ernten" is its own action in the Puls panel, with "Puls danach stumm?". §6 never says where it lives.

### M9 · Count-in and click are visual only · [major]
**Where:** §3.3 ("große, blasse Zahl in der Feldmitte"), §5.2 Bauplan ("Ein Tipp zählt ein").

**What goes wrong:** Eyes on a keyboard or a guitar do not see the count. The audible click and the Android vibration that the designer and the performer proposed were dropped.

**Fix:**
- "Einzählen: sichtbar · Vibration · hörbar".
- "Klick: aus · Zählzeiten · nur Einzählen".
- Say that the Puls is already excluded from "Gespielt", so a click lane is a metronome that never lands in a loop, and ship it as a preset.

### M10 · Length operations and correction chips are ambiguous · [major]
**Where:** §3.3, §3.4, §3.7.

**What goes wrong:**
- **Unclear chip labels:**
  - "½ ×2": tempo (same audio, another bar grid) or length (a re-cut)?
  - "−1 +1": bars of length?
- **Missing chip:** moving the Eins, the most common free-play error after octave errors (the performer had "Eins ↔").
- **Strip lifetime:** the 8-s strip disappears, and nothing says where corrections live afterwards.
- **No Multiply:**
  - A 4-bar phrase over a 2-bar loop cannot be layered; the retro Schicht cuts it to 2 bars.
  - "×2" on an existing loop could mean "repeat the content" or "re-cut from the Humus". The re-cut is only possible for 64 s.
- **"länger":** it needs a tap mid-phrase, while both hands play chords.

**Fix:**
- Label chips by what they change: "Tempo ½ · ×2", "Länge −1 · +1 Takt", "Eins ← →", "3er", "Runde davor".
- The strip stays available in the card.
- In the card, separate "Verdoppeln" (multiply by repetition, then layer the longer cycle) from "neu schneiden" (only while the Humus holds it).
- Kette lengths can be chosen while waiting for the count-in ("×1 ×2 ×4"), so no hand leaves the keys mid-phrase.

### M11 · Overdub is under-specified · [major]
**Where:** §3.2, §3.4, §3.5, §7 nanoKONTROL2.

**What goes wrong:**
- **Overdub across passes:** holding over three passes of a 1-bar loop gives what? One Schicht with three passes summed, or three Schichten?
- **Schichten mode:** does a Hauptknopf overdub close after one pass, or run until tapped (the RC habit)?
- **nanoKONTROL2 R:** "R … bzw. Schicht" — a punch, or a retro layer?
- **"Der letzte Durchgang":** a decision at 80 % of a good pass means this pass, waited for, or the previous one?
- **Muted targets:** is a layer over a muted loop allowed?
- **Living loops:** a Schicht laid over a Variieren or Wuchs loop can clash with the next pass's variation.

**Fix:**
- A continuous overdub makes one Schicht per pass, grouped, so each pass can be peeled off.
- Schichten mode runs until tapped, with an option "eine Runde".
- R on a playing loop toggles a punch.
- A retro layer in the last ¼ of a pass takes *this* pass at its end (pending; ↶ cancels). Otherwise it takes the pass just completed.
- Adopt the performer's guardrail: nothing in a loop varies during the three passes after a layer was added.

### M12 · Keyboard and page-turner focus · [major]
**Where:** §7, Computertastatur and Blätterpedal.

**What goes wrong:**
- Space = Hauptknopf, but every ring is a real `<button>` (§7 Barrierefreiheit). After a touch, Space also clicks the focused ring.
- Page-turners send arrows, PageUp and PageDown. A focused mixer knob steps on exactly these keys (index.html ≈ line 16983, V), and so does every slider. The pedal then moves the filter instead of harvesting.
- iOS Safari scrolls on Space and the arrows unless the page prevents it.

**Fix:**
- Learned pedal keys are caught by a capture-phase `keydown` on `window`, act there, and `preventDefault` before focused controls see them. The only exception is text fields.
- Touching a Ringleiste button does not leave focus on it.
- Pedal keys are learnable (the designer's "Taste" source), not hard-coded arrows, and the pedal legend shows them.

### M13 · Undo in Wuchs is not "sofort" · [major]
**Where:** §3.5 ("Rückgängig und Wiederholen wirken sofort"), §4.2, §10 ("ein OfflineAudioContext pro Wuchs-Schleife").

**What goes wrong:** If a Schleife's Schichten are rendered together, undoing one waits for a re-render. The wrong note repeats for another second, or another pass.

**Fix:**
- Render each Schicht into its own lane and mix the lanes on the audio thread, so undo and mute are a 10-ms fade at once.
- Or keep each Schicht's Abdruck and crossfade to it while the re-render runs.

### M14 · The veto has no place to be tapped · [major]
**Where:** §0 ("Ein Tipp behält es, einer lehnt es ab"), §0 point 6 and §9.10 ("Veto pro Note"), §5.6.

**What goes wrong:**
- Knospen on the field take no touches, and they cannot: every touch there is a note. On the Ringleiste they are too small (designer §8).
- Lob, Nein and Anker have no place on screen and no pedal or MIDI target.
- §8 C taps ▶▶ for Lob, but §7 assigns ▶▶ to Wiederholen.
- On a phone, no gesture can deliver per-note vetoes.

**Fix:**
- While the machine has pending changes, a lumen chip row sits where the correction strip sits: "Nein 2 · Nein 3 · Lob". One tap vetoes or keeps that ring's change. Ring taps stay mute taps.
- Add learnable targets `hx.lob`, `hx.nein` and `hx.anker`.
- Per-note vetoes exist only in the card on iPad and PC.
- Correct §0 and §9.10.

### M15 · Three overlapping autonomy controls, no precedence · [major]
**Where:**
- §5.4: Eigensinn per Schleife, plus a global Eigensinn;
- §5.5: the Gärtner's four stages;
- §6 Gestik: Ladung;
- §5.8: the Jahreslauf;
- §5.6: "zweimal ✕ → acht Takte Treu".

**What goes wrong:**
- Does "pflegt" thin a Treu loop?
- Does Ladung make a default loop stutter? A default loop is Treu *and* Abdruck.
  - §6 says Abdrücke stutter and Treu loops stay as they are.
  - §8 A 3:00 has the default Jahresring stutter.
- Shaking already means Ladung (Rassel, Regen). Making loops stutter by default changes what an existing gesture does.
- May Wiederkehr unmute a loop the player muted on purpose?
- On stage, nobody can predict who changed what.

**Fix:**
- **Ceiling rule:** a Schleife's Eigensinn is the maximum anyone may do to it. The Gärtner, Ladung and the Jahreslauf act only below it.
- **Treu means untouched**, Ladung included. Ladung on loops is opt-in, per Schleife or via Zuweisen.
- **Wiederkehr** only for loops marked "darf wiederkehren", and never for a loop the player muted in the last 8 bars.
- **One control:** merge the global Eigensinn and the Gärtner, or explain the difference in one sentence.

### M16 · The beginner's first contact · [major]
**Where:** §3.1, §3.3.

**What goes wrong:**
- **Two red record dots:** the top-bar REC (the set take) and the Hauptknopf (a loop), both under "Aufnahme". The take recorder's "In Takten" mode even loops a take in preview (code-map §2, V).
- **No first-run hint** that Myzel listens all the time, or what the basket means.
- **The correction strip** floats over the field's bottom row, exactly where the thumb plays: an accidental "×2".

**Fix:**
- The Hauptknopf gets a loop glyph (a ring with a dot) and is red only while recording.
- A one-time coach mark (designer §3.4).
- The Korb's label always says what it would take.
- The correction strip sits *inside* the Ringleiste, replacing the rings for 8 s, never over playable notes.

### M17 · The scenarios use gestures the grammar does not have · [major]
**Where:** §8 against §3.2 and §7.

**What goes wrong:**
- **A 0:25:** "Schleife 2 antippen: das Feld wird Amöbe". Tapping an empty ring only makes it the Ziel; switching the sound needs a "Lied-Modus" that is defined nowhere (§5.2 mentions it once). It also collides with "tap = mute" on playing rings.
- **A 0:55:** "Korb auf Schleife 3". Ring 3 is empty, so the drag is undefined.
- **A 0:55:** "Korb, Schicht 2". A Korb tap makes a new Schleife, not a Schicht.
- **A 1:30:** "„+“ lang drücken". That button is in the panel.
- **C 12:00:** "▶▶ Lob". ▶▶ is Wiederholen.
- **B 0–4:** "Ein langes D, Korb: 26 s". It relies on the undefined no-grid rule (B7).

The owner will judge the concept by these scenes.

**Fix:** Rewrite §8 strictly with the final grammar, or mark the gestures that are still proposals.

### M18 · The Etappen do not match the content · [major]
**Where:** §11.

**What goes wrong:**
- **Notes are needed earlier.** Etappe 1 contains "Takt finden, Wiederholung, Korrektur-Chips", the Nahtwahl and the Auftakt, and all of them need notes. Notes are Etappe 2 ("Noten an der Stimmenschicht").
- **Never staged:**
  - clear and delete;
  - Kette/Schichten;
  - the retro Schicht (the headline);
  - Schluss, Kern, Lücke, Welken, Abbau;
  - Bauplan, Lied-Modus;
  - Werkstatt/Bühne, Setliste, the ring view;
  - Puls ernten, Ladung on loops, Sediment.
- **The claim does not hold.** "Danach ist der Hexenring schon ein vollwertiger, verlässlicher Looper" is not true without clear, stop-all, sections or retro layering.

**Fix:** Etappe 1 =
- a note recorder at the gesture layer (enough for Takt finden and onsets; the voice-layer recorder stays in Etappe 2);
- the fixes for B1–B7;
- clear, stop-all and Schluss;
- Ziel and Fokus;
- the retro Schicht;
- the safe pedal grammar;
- the form button with Lichtungen.

Everything else gets an Etappe or the label "später".

---

## 4. Minors

| # | Where | Problem | Fix |
|---|---|---|---|
| 1 | §7 | "Werkstatt (Probe)": „Probe“ is the library preview (performer §2). It is never said how to switch between Werkstatt and Bühne. | Use another word; one switch, stated. |
| 2 | §3.1, §5.6 | Orange marks both the downbeat on the Taktlinie and the Ziel. | Give the Ziel a shape (dashed "+"), and keep orange for the 1 only. |
| 3 | §3.1 | While the mixer is open on a phone, the Ringleiste folds to 24 px, and the Korb and the Hauptknopf disappear. | Keep both visible when folded. |
| 4 | §3.1 | 4 rings per page: no paging gesture is defined, and a playing loop on the other page is invisible. | A "+3 spielen" indicator with activity dots; paging by tapping it. |
| 5 | §3.1 | Korb on the left, ↶ on the right: a right-hand hold reaches neither comfortably. | A mirrored layout. |
| 6 | §3.2 | The word list has no word for an empty ring or the Ziel. "aufnehmen" or "schließen" at about 10 px in a 44-px cell is tight. | Test at 360 px; use short words. |
| 7 | §3.2 | Korb and Hauptknopf sit side by side, both press-acting. A near miss starts a silent recording instead of a harvest. | A dead zone between them, or separate them. |
| 8 | §3.2, §3.6 | Stille (`panic`) flushes echo and hall (V), the one place where tails are cut. | Say so next to "Stoppen schneidet nie einen Ausklang ab". |
| 9 | §2, §3.3 | "Nichts geht verloren", but the audio Humus holds 64 s. "Runde davor" on 8 bars at 60 BPM, or on a 40-s free loop, does not fit. | Say "64 s"; grey out "Runde davor" when it cannot reach. |
| 10 | §4.1 | Harvesting retroactively from "Alles" needs a second 64-s Humus (+25 MB). | Either provide it, or make "Alles" Hauptknopf-only. Say which. |
| 11 | §10 | Abdruck playback costs 0.13 units per Schicht. 4 loops × 4 Schichten ≈ 2 units of a 14-unit phone: live chords lose notes as the song grows. | Cache the exact float sum of Schichten not being edited (one read per loop) and keep the layers for undo. Say what happens when the budget is full (owner's decision). |
| 12 | §5.2, §6 | Face-down muffles the phone speaker, and > 20 s face down (`SLP_LONG`) "ends the set". An ambient player who rests the phone loses the piece. | With loops present, ask before ending; or a long sleep only stops loops (angehalten, M5). |
| 13 | §5.2 | "Welken über 4–16 Durchgänge": passes of which loop? | Count in bars or seconds. |
| 14 | §5.2, §6 | Szenen A/B and Lichtungen both store mutes, levels and Eigensinn, and a Lichtung can recall a Szene. Which wins? What is a half-muted loop in a morph? | One owner per property; the morph fades levels only. |
| 15 | §5.6 | "Zweimal ✕ … acht Takte Treu" is an invisible change of state. | Show it on the ring with a countdown. |
| 16 | §3.3 | The Korb lights on every repetition, so it is always lit while you practise along. | Light it only for material not already in a Schleife. |
| 17 | §3.7 | An external MIDI Start or SPP while loops run is not covered. | Re-phase at the next seam, with a toast (engineer §7.2). |
| 18 | §3.4 | The mode "Schichten" and the plural "Schichten" (layers) appear in one panel. | Rename the mode, e.g. "eine Schleife". |
| 19 | §6 vs §12 | §6: Wuchs loops "schlagen dasselbe Netz und denselben Hof an wie deine Hände". §12: "Gespinst im Wuchs klingt nur aus den Noten der Schleife". Rhizom exhaustion has the same conflict. | Pick one and correct the other. |
| 20 | §7 | The nanoKEY pad page has no Hauptknopf and no Schicht; the nanoKONTROL2 page has no Lob or Nein. | Complete both, or say what is missing. |
| 21 | §7 | Sustain pedals with reversed polarity. | Detect it in the learn step. |
| 22 | §3.1 | Landscape (field and panel side by side): where the Ringleiste goes is not stated. | State it (the designer had "a shared column"). |
| 23 | §2 | About 45 new terms. | The Etappe 1 UI shows only Schleife, Schicht, Korb/ernten, Takt and Lichtung. |
| 24 | §7 | "Kein Halten ist Pflicht" is only true after B1. | Re-check after the grammar fix. |
| 25 | §6 Mixer | The performer's "Vorrang" (loops dip under live playing) was dropped. Level creep is the classic beginner failure (loopers.md §3.11). | Promise "loops return at the heard level, with headroom"; offer Vorrang later. |
| 26 | §5.2 | A Lichtung switches "am Taktstrich oder am Ende der längsten Schleife": which one, and how does the player know? | One rule per Lichtung, printed on its chip (M4). |
| 27 | §3.3 | "Mit Raster wartet er … oder startet beim ersten Ton": a setting, or an automatic choice? | A setting, "Start: am Takt · beim ersten Ton", shown on the Hauptknopf. |

---

## 5. Self-contradictions at a glance

| Statement | Contradicted by | Finding |
|---|---|---|
| §3.2 "Korb wirkt beim Aufsetzen" | §3.2 "Korb auf eine Schleife ziehen" | B2 |
| §7 "halten = aufnehmen, solange gehalten" | §7 "2 s halten = Kern" | B3 |
| §7 "ohne hörbaren Verlust umdeuten" | Ernten sounds at once | B3 |
| §0, §4.2 "Abdruck = genauer Klang, Sample für Sample" | §4.1 "Gespielt" replayed through the live chain | B6 |
| §3.3 "bis zum Taktstrich, den du gerade gehört hast" | "einschließlich des laufenden Takts" | B7 |
| §5.3 "ändert nie eine Note, ohne dass du es willst" | Auslese on by default at ≥ 80 % | M7 |
| §0 "Ein Tipp … lehnt es ab" | §5.6 "Nichts davon nimmt Berührungen an" | M14 |
| §7 nanoKONTROL2 ▶▶ = Wiederholen | §8 C "▶▶ Lob" | M14, M17 |
| §6 Ladung "Treu-Schleifen bleiben" | §8 A 3:00, the default Jahresring stutters | M15 |
| §5.2 Atempause "mit ihrem Takt" | §6 Schlafen "an ihrer Naht" | M5 |
| §3.2 tap on an empty ring = Ziel | §5.2 and §8 A: tap = switch the field's sound | M17 |
| §11 Etappe 1 "Takt finden, Wiederholung" | notes arrive in Etappe 2 | M18 |
| §6 Wuchs strikes the same web as the hands | §12 Gespinst in Wuchs hears only the loop | minor 19 |
| §7 "Kein Halten ist Pflicht" | overdub on a ring is hold-only | B1 |
| §3.6 "Stoppen schneidet nie einen Ausklang ab" | Stille flushes echo and hall | minor 8 |

---

## 6. The grammar after the fixes, on one page

| Target | Tap | Drag | Hold |
|---|---|---|---|
| **Korb** | Ernten into the Ziel; press-acting; the label shows what it takes now (B7). In "eine Schleife" mode: a Schicht into the Fokus. | – | – |
| **"→ N" chips** after a harvest | turn the harvest into a Schicht of ring N (re-cut, inaudible when the lengths match) | – | – |
| **Hauptknopf** | Ziel empty: start (at the 1, at the first note, or now; a setting). Recording: close (Kette: auto-close). "Eine Schleife" mode: punch on the Fokus. | – | ≥ 0.5 s push-to-talk; the release closes, rounded on a grid; minimum one beat |
| **Ring, empty** | record into it | – | card |
| **Ring, playing or muted** | mute or unmute; press-acting, ⅛-bar grace; a second tap cancels | vertical > 12 px: level | ≥ 0.5 s: card (Schichten, delete, length, phase, Fokus, sound, Eigensinn) |
| **Ring, recording** | close | – | – |
| **↶** | cancel your own newest pending action, else undo the last content step; ↷ appears for 8 s | – | ≥ 1.5 s: "Alle leeren" (undoable) |
| **Form button** | next Lichtung at the next 1 (pending) | – | row: Lichtungen, merken, Kern, Lücke, Schluss, Welken |
| **Machine chips** (only while it plans) | Nein or Lob per ring | – | – |
| **Pedals** | B3 table: never two audible meanings on one switch | | |

---

## 7. What is excellent and must not be lost

1. **Ernten with a phase-locked takeover and one-tap corrections (§3.3).** It removes the late first downbeat, the most common failure in looping. No hardware looper does this as cleanly.
2. **"Jeder Durchgang ist ein Angebot" (§3.5).** This is the best idea in the document: "a ruined overdub no longer exists". It must reach one hand and one foot (B2, B3, B4), not get lost in the grammar fixes.
3. **Instant undo, Schichten as objects, cleared loops recoverable, crash recovery from IndexedDB (§3.5, §7, §10).** This is stage trust.
4. **Words under the rings, visible pending actions, ↶ that cancels a pending action first (§3.2).** This is exactly the cure for hidden modes.
5. **The seam engineering (§3.6):**
   - margins, Nahtwahl from the onsets, the measured smooth equal-power law (1.2× at 10 ms);
   - the Ausklang and the Auftakt folded where they belong;
   - stopping never cuts a tail;
   - notes held across the seam are tied in Wuchs.

   Keep every number.
6. **The Takt that never jumps, and the Puls that joins the loops' grid (§3.7).** Playback runs on the audio thread and is immune to stalls: one hour, ≤ ½ sample (V).
7. **No screen double-tap; press timing in heard time; no double latency compensation (§3.2, §4.1).**
8. **Stille stops the loops and keeps the buffers (§3.2).** Fix only the trap after it (B5).
9. **Abdruck plus notes in every Schleife, and Wuchs at zero voice cost, "Ihr Klang wird nie verringert" (§4).** This is the owner's rule turned into architecture.
10. **The Taktlinie, Myzel's first visible metre (§3.1).**
11. **Restraint:**
    - the Gärtner defaults to "schaut zu";
    - the Handschrift is off;
    - co-player behaviours are built only after play tests with the owner (§11, Etappe 3).

    Keep this order.
12. **Colour never alone, a screen-reader toolbar, announced state changes (§5.6, §7).**
13. **The Wurf and Lob (§5.4):** keeping a lucky physical-model pass exactly. It is unique and musical.
14. **Kette with auto-close (§3.4):** "one tap per layer, and the hand is back on the field".
15. **The honest limits (§12),** including the Bluetooth warning. Add B6's limit back to them.
