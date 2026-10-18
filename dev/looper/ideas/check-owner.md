# Owner's-advocate review of `dev/looper/KONZEPT.md` („Hexenring“)

Reviewer stance: I read the draft as the owner would. He reads German on an Android phone, wants things brief, asked for a *solid*, *musically high-level*, *expressive*, *not ordinary* looper "im KI-Zeitalter", and holds the standing rule "always the best sound; if two goals conflict, ask me". Sources checked: the draft, `dev/klang/KONZEPT.md`, `dev/gestik/konzept.md`, `ideas/BRIEF.md`, the five proposals, `research/*.md`, the engineer's scripts and saved outputs (`e1.out`, `e4.out`), `dev/HANDOFF.md`, and greps of `myzel/index.html`.

## Verdict in five lines

1. **The substance is strong.** It covers solidity, musical depth, Myzel-specific ideas and honest limits better than any of the five proposals alone. "Ernten", "every pass is an offer", Abdruck + Wuchs and the Knospen are the right ideas.
2. **Two things must be fixed before he sees it.** First, his "KI-Zeitalter" framing is never answered in his words. The word "KI" appears twice, both times negatively (§5.4 „braucht keine KI“, §12 „Keine Klang-KI“). Second, a core promise carries a (V) that the measurement does not support: that a loop sounds the same when it switches from Abdruck to Wuchs.
3. **It is not too long in characters** (54 k against Gestik's 51 k, with similar sentence lengths). It is too dense in **names and features**: about 70 named things against Gestik's ≈ 25. Several of them overlap: Lichtung/Szene/Kern, Atempause/Schlafen, Welken/Verblassen/Abbau, Eigensinn-Gesamtregler/Gärtner.
4. **Stage 1 is a very good, trustworthy looper, but not yet an extraordinary one.** It delivers 2 of the 12 "Was neu ist" items. None of the three pieces in §8 can be played before stage 3. Several features belong to no stage at all.
5. **§13 is well meant, but four of the "important" decisions cannot be answered as written.** They have ambiguous words, a missing recommendation and hidden trade-offs. Several real sound-versus-function conflicts that the proposals put to the owner were dropped or decided silently.

---

## What is strong and must stay

- **§0's hook:** "ein Looper, bei dem du nie vorher etwas drücken musst … genau da, wo deine Hände aufgehört haben". This is the sentence that will win him.
- **§1, the diagnosis of the Fährte:** concrete, measured and fair ("tut technisch, wofür sie gebaut wurde"), and it keeps what works (clock, scheduler, format).
- **§3.2, one grammar:** no double-tap on screen, the time-critical buttons act on touch-down in heard time, and "unter jedem Ring steht ein Wort". This answers "unzuverlässig" directly.
- **§3.5, "Jeder Durchgang ist ein Angebot":** a retroactive overdub, so a spoiled overdub can no longer happen. It is genuinely new and plainly musical.
- **§3.6, seams worthy of a gong:** the tail folded in, the pickup kept, the cut chosen from the notes, a measured crossfade, and stopping never cuts a tail.
- **§3.7, a clock that never jumps,** with the one-hour drift test (`e4.out`: 631 passes, ≤ ½ sample).
- **§4, re-play rather than stretch:** "Ihr Klang wird nie verringert", 32 bit by default, and stretching posed as a decision. This is exactly his sound rule.
- **§5.4, Wurf and Lob:** breeding a loop by keeping its best chance is Myzel-specific, and only possible because of the physical models.
- **Auslese, Knospen with ✓/✕/⚓, and the Gärtner's rules:** only your material, only at bar lines, in the scale, silent until there is enough material, never touches the live sound.
- **Stage 3 only after a play test** ("gebaut wird nur, was du wiederhaben willst"), and the **Messtag first**.
- **§5.8:** loops feeding Gespinst, Rhizom and the Regen; Einwurzeln (Lucier, audio that follows the harmony without resampling); Treffen (Eno). This is the most Myzel-like part.
- **§7:** pedals, the page-turner as the only pedal on iPad, the nanoKONTROL2 page, escape routes, restore after a crash.
- **§8, the three pieces:** vivid. He will imagine himself in them.
- **§12, honest limits**, including "Form plant nur der Mensch".

---

## Blockers

### B1 · §0, §5.3–5.7, §12, §13 · The "KI-Zeitalter" part of his request is not answered in his terms

**Problem.**
- He wrote: „kein ordinärer Looper, wir befinden uns schließlich im KI-Zeitalter und die Möglichkeiten sind immens.“ The draft contains a lot of real intelligence: tempo finding, repetition, Auslese, groove, roles, answers, Wiederkehr, Handschrift, Klangverwandtschaft. It never *calls* it that.
- The only two uses of "KI" are negative:
  - §5.4: „Eine Schleife züchten … braucht keine KI, nur geordneten Zufall.“
  - §12, bullet 10 of 12: „Keine Klang-KI …“
- The honest limit (no neural audio offline on a phone) sits deep in the limits section. It reads like a confession, not a reason.
- Three options from `research/intelligence.md` §5.7, §5.8 and §7 are dropped without asking him:
  - a tiny neural note model (≈ 0.3 MB) that could learn from his own takes;
  - transcribing sung or whistled loops into notes (a hand-ported Basic Pitch, offline);
  - whether an online AI extra (Lyria) is wanted at all.
- He may feel short-changed ("wo ist denn die KI?"), even though the draft has more musical intelligence than any looper on the market.

**Fix.**
1. Add a short block to §0, right after „Darauf sitzt ein musikalisches Ohr“:

   > **Wo die KI steckt.** Die KI im Hexenring arbeitet mit deinen Noten, nicht mit fremdem Klang. Sie findet den Takt, merkt, wenn du dich wiederholst, baut aus vier Versuchen die gemeinte Fassung, lernt deinen Groove und über Wochen deine Handschrift. So weit du sie lässt, spielt sie mit: Sie variiert, macht Platz, antwortet und bringt Altes zurück. Was sie vorhat, siehst du einen Takt vorher. Den Klang machen immer Myzels eigene Klangquellen, in bester Qualität. KI, die selbst Klang erzeugt, läuft 2026 nicht offline auf einem Handy, und sie würde nach etwas anderem klingen als nach Myzel. Das wäre gegen deine Klangregel.

2. Turn §5.3–5.7 into one visible chapter: „Die KI: Ohr, Eigensinn, Gärtner, Knospen, Handschrift“.
3. Replace „braucht keine KI, nur geordneten Zufall“ with „Das ist Züchtung: Du wählst aus, Myzel vererbt.“
4. Add to §13, each with a recommendation:
   - „Darf später eine kleine lernende Notenhilfe (≈ 0,3 MB) in die App, die nur dein eigenes Spiel kennt, wenn sie im Blindvergleich besser antwortet?“ *Vorschlag: ja, als Versuch in Etappe 3.*
   - „Gesang und Pfeifen als Noten: Eine Mikro-Schleife wird zu Noten und spielt mit Myzels Klängen weiter, auch in neuer Tonart (Etappe 4)?“ *Vorschlag: ja.*
   - „Eine Online-KI (etwa Googles Lyria; braucht Netz und Schlüssel, klingt fremd)?“ *Vorschlag: nein.*

### B2 · §0, §4.2, §4.3, §9 #2–3 · "Wuchs klingt wie der Abdruck" is marked (V), but the measurement does not show it

**Problem.**
- §4.2 says: „Mit gleichen Startwerten klingt der Wuchs wie der Abdruck. Gemessen (V): … −108 bis −144 dB.“ But `e8-determ.js` compares **two offline renders** with each other.
- The Abdruck is a **live** pass, and four things differ there:
  - The shared modulators run at whatever phase they had.
  - Notes start at main-thread times, with occasional 8.7-ms jitter (`e5`).
  - Finger height and glides arrive at event times.
  - Gespinst's web and Rhizom's network were shared with everything else, and live voices may have been stolen by the budget.
- The draft's own data shows how much this matters: the same notes only 37 samples off the block grid differed by just −9 to −38 dB.
- Three of the five proposals say the switch is audible:
  - designer §8: „The Abdruck → lebendig switch is audible by nature“;
  - inventor §10: „Treu near-exact, not exact“;
  - composer §8: „only an Abdruck is exact“.
- §12 itself admits that Gespinst in Wuchs sounds different in the halo.
- Consequences:
  - „verlustfrei in beide Richtungen“ (§0 #2, §9 #2) is an overclaim. Loops recorded with „Alles“ or „Mikro“ have no notes at all.
  - „dieselbe Darbietung im neuen Tempo“ (§4.3) is an overclaim.
  - The headline Wurf promise only holds for passes that were *rendered*, not for the live pass he actually loved. If the Böe caught the perfect fifth while he played, a key change can lose it.
- This is also a sound-rule conflict that must be put to him: the first key or tempo change audibly changes the loop.

**Fix.**
1. Rewrite §4.2:

   > **Gleiche Startwerte, gleicher Wuchs.** Zwei Wuchs-Durchgänge mit gleichen Startwerten klingen gleich (gemessen −108 bis −144 dB, V). **Der Wechsel vom Abdruck zum Wuchs ist dagegen hörbar (A):** Live spielten die Klangquellen mit anderen Nachbarn, anderer Phase der Modulatoren und geteiltem Gespinst-Netz. Die Noten bleiben, der Klang ist nah am Original, aber nicht gleich; bei chaotischen Quellen (Amöbe, Böe, Glut, Rhizom) deutlich anders. Wie hörbar, zeigen Hörbeispiele vor Etappe 2.

2. Rewrite §0 #2 as „Abdruck und Noten in jeder Schleife aus Myzels eigenen Tönen; die Schleife wechselt ohne Neuaufnahme vom einen zum anderen.“ Drop „verlustfrei“.
3. In §5.4, say that a live pass is kept exactly *as an Abdruck*, and that a Lob is exact for Wuchs passes.
4. Add a test to stage 0 or the start of stage 2: a live-vs-Wuchs null test plus a listening comparison, for every source.
5. Make §13.2 and §13.3 depend on what he hears (see M5).

---

## Majors

### M1 · §0, §4.1 · "Abdruck … mit Raum" contradicts the default „Gespielt“; recorded movement and live effects are unresolved

**Problem.**
- §0 promises the Abdruck holds „den genauen Klang, mit Raum, Nachklang …“.
- §4.1's default „Gespielt“ taps the strips **before** the effect chain, echo and hall, and re-applies them live on playback. So the room is *not* in the Abdruck: turning the Hall knob later changes every loop.
- A filter sweep made while playing (Anlehnen, the Fährte lanes) is not in the Abdruck either. If the „Bewegung“ part of the loop replays it, it moves the global filter, which also moves his live playing. The performer flagged this (performer §9 limit 1, question 4). The draft is silent.

**Fix.**
1. In §0, write „den genauen Klang deiner Klangquellen, mit ihrem Nachklang und dem einmaligen Verhalten der physikalischen Modelle; Echo und Hall laufen live darüber, wie beim Spielen.“
2. Add a decision:

   > „Eine Filterfahrt, die du beim Spielen machst: soll sie mit der Schleife wiederkommen (dann bewegt sie den Filter auch für dein Live-Spiel) oder fest im Klang der Schleife liegen (dann Quelle „Alles“)?“

### M2 · §0, §4.2, §9 #1, §12 · Phone throughput is the single biggest risk; page one marks it (V); there is no Plan B; one sound-versus-function conflict is decided silently

**Problem.**
- §0 says: „in bester Qualität, ohne deinem Live-Spiel eine einzige Stimme wegzunehmen (V, gemessen)“. This was measured on a 4-core Xeon. §4.2 and §12 then say a phone may be 2–4× slower (A).
- The 0.04–0.21× real-time figures are "voices only" (`e1.out`, `rtVoicesOnly`). The lean render graph was not measured.
  - At 0.21× for one sparse 22-note phrase, a 3× slower phone gives ≈ 0.6× per Gong loop.
  - Eight living loops do not fit.
- Stages 2–4 (folgen, Eigensinn, Wurf, Gärtner, Antworten) all depend on Wuchs. The only fallback, „Live“ with real voices, is in stage 4.
- §4.2 decides: „Schafft ein Gerät eine Schleife nicht schnell genug, bleibt sie Abdruck. Ihr Klang wird nie verringert.“ After a key change, such a loop plays **in the old key**. That trades musical correctness for sound, and it was decided without asking him. „In der besten Stufe, die das Gerät schafft“ adds to the confusion: does the quality level step down or not?
- Heat and battery over a 20-minute set with continuous background rendering are not mentioned.

**Fix.**
1. Write the §0 status as „auf dem PC gemessen; auf deinem Handy misst es der Messtag“.
2. Add „20 Minuten Dauerlast: Wärme, Akku, Aussetzer“ to stage 0.
3. Add a decision:

   > „Eine Schleife muss der neuen Tonart folgen, aber dein Handy schafft sie nicht rechtzeitig in Stufe 3. Soll sie (a) in der Stufe neu gespielt werden, in der du sie gespielt hast, (b) bis zum Taktstrich verstummen, an dem sie fertig ist, (c) mit echten Stimmen spielen (kostet Live-Stimmen) oder (d) im alten Ton bleiben?“

   *Recommend (a).* It is never worse than what he heard.
4. State a Plan B for stage 2 if the Messtag numbers are bad: fewer living loops at once, render a Treu loop only once (see M5), and bring „Live“ forward.

### M3 · §11 · Stage 1 is solid but not extraordinary; several promised features are in no stage; stage 1 silently needs stage-2 parts

**Problem.**
- Of the twelve „Was neu ist“ items, stage 1 delivers #5 (jeder Durchgang ist ein Angebot) and #6 (no critical moment). Everything he will judge as „kein ordinärer Looper“ comes in stage 2 or later: Wuchs, Wurf, Auslese, Folgen, the Knospen, the Gärtner, the ecology. Stage 2 is also the biggest refactor, and it is gated by unmeasured phone numbers.
- **No stage** contains these items:
  - Kern, Lücke, Schluss, Welken, Abbau, Bauplan;
  - Schleife wählt Klang;
  - frei/Polymetrik/„wandert“;
  - Erstarren;
  - Szenen and presets integration, Puls ernten;
  - Werkstatt/Bühne/Setliste, the Humus timeline;
  - Lob/✕/⚓ for the Gärtner;
  - Speichergrenze/Sediment.
- None of the three pieces in §8 is playable before stage 3:
  - A needs Lichtung (stage 2), a living loop (2), Welken (no stage) and Schleife wählt Klang (no stage);
  - B needs Treffen, Kompost, Hyphen and Jahreslauf (all stage 4);
  - C needs the Gärtner, Knospen, Wiederkehr and Handschrift (stage 3).
- Stage 1 lists „Takt finden, Wiederholung, Korrektur-Chips“, Nahtwahl and rings drawn from notes. All of these need **note capture**, but „Noten an der Stimmenschicht“ is in stage 2.

**Fix.**
1. Assign every feature to a stage, and tag each piece in §8 with the stage from which it can be played.
2. Say in one line per stage what he can *play* afterwards (Gestik's „Fertig, wenn …“ style), and add an effort note per stage („Aufwand: …“), as Gestik did.
3. Move cheap wow into stage 1, for something impressive early:
   - note capture at the gesture layer (it is needed anyway), with the loop notes visible on the field;
   - **Auslese, first form:** „Myzel nimmt von deinen vier Versuchen den besten“. This picks the real pass closest to the consensus, so it stays an exact Abdruck. The note-built consensus comes in stage 2.
   - the form tools Lichtungen, Kern, Lücke, Schluss, Verblassen;
   - Schleife wählt Klang;
   - loops feeding **Gespinst** and **Körner**: the web's input `A.gsp.inp` already exists, and takes can already become Körner material.
4. Split stage 2 into 2a („Folgen der Tonart, Lebendig, Wurf und Lob“, the first magic) and 2b.
5. Offer **listening examples now**. The offline test harness can already render one phrase as Abdruck, as Wuchs in Stufe 3, and as four Lebendig passes. He decides things by ear (HANDOFF: „Offen sind nur noch Dinge fürs Ohr“).

### M4 · §2, §5.4, §5.5, §12 · Too many names; Eigensinn and Gärtner are blurred

**Problem.**
- About 70 named things (see the table below). Four of them are new words for things Myzel already has: Atempause = kurzer Schlaf, Lichtung ≈ Szene, Sediment = zusammenlegen, Korb = the Ernten button.
- Eigensinn and Gärtner are supposed to be per loop and per ensemble, but the draft blurs them:
  - §5.4 adds a global Eigensinn knob, „wie frei ist die Band“. That is what the Gärtner is.
  - §12 says „Der Gärtner macht Schleifen lebendig“.
  - „verwildert“ includes „Eigenweg“, which is per-loop variation.
  - The per-loop Knospen word „antwortet“ names a Gärtner stage.
  - The four Gärtner stages are cumulative, but the text never says so.
  - Who wins when a Treu loop meets a Gärtner on „pflegt“ (which thins loops)? Not specified.

**Fix.**
1. Define each in one line and use it everywhere:

   > **Eigensinn:** wie sehr sich eine Schleife von selbst verändert, auch wenn du nichts tust.
   > **Gärtner:** wie sehr die Schleifen auf dich hören: Platz machen, antworten, zurückbringen.
   > **Regel:** Eigensinn ist die Grenze. Eine Treu-Schleife ändert ihre Noten nie, auch nicht für den Gärtner. Er darf sie nur leiser, lauter, stumm schalten.

2. Drop the Gesamtregler.
3. Write „jede Stufe enthält die vorige“.
4. Cut „verwildert“, or defer it to a „später, nach Spieltest“ list.
5. Move the names table (§2) to the end, as Gestik did (§11), so he meets the instrument before its vocabulary.

### M5 · §13 #2, #3, #4, #6 · The four "important" decisions cannot be answered as written

**Problem.**
- **#2** asks: „Die Alternative: jede Schleife wächst von Anfang an lebendig.“ Does that mean Wuchs with the same Wurf (the engineer's question 3), or the Eigensinn step „Lebendig“ (a new Wurf every pass)? These are very different.
- **#3 has no recommendation.** Its framing misses the option that fits his rule best:
  - Render a loop **once** in Stufe 3 in the background and keep that as its Abdruck („veredeln“).
  - A Treu loop is identical every pass, so one render suffices. It costs no live voices and no ongoing CPU.
  - On a phone that plays at Stufe 1, the current default silently keeps every loop at Stufe 1 even though Stufe 3 is free. Under „immer der beste Klang“, that needs an explicit answer from him.
- **#4:** „Tempo halten“ is ambiguous. Either the loop keeps its own tempo and is then out of the grid, or the tempo change is refused while such loops exist (composer, question 3a). He cannot picture what he will hear.
- **#6** states that Safari moves to the worklet thread („wie heute schon bei jeder neuen Klangquelle“) but hides two things:
  - the risk: that thread has lower priority, so there can be dropouts on his iPad (Klang-KONZEPT §5, code-map: „only a top-level tab gets the real-time thread“);
  - the stake: with the Humus starting after first use, the first loop of every session cannot be **harvested**, which is the headline gesture.

**Fix.** Proposed wording:

> **2. Wie spielt eine neue Schleife?** (a) Als Abdruck: genau dein Durchgang. Sie wechselt erst zum Wuchs, wenn sie folgen oder sich verändern soll, und dieser Wechsel ist leicht hörbar. (b) Gleich ab dem zweiten Durchgang als Wuchs mit demselben Wurf: Später gibt es keinen hörbaren Wechsel mehr, aber schon der zweite Durchgang ist nicht mehr genau dein Spiel. *Vorschlag: (a).* Hörbeispiele liegen bei.
>
> **3. Klangstufe der Schleifen.** Dein Handy spielt live meist in Stufe 1. Eine Schleife kann (a) so bleiben, wie du sie gehört hast, (b) beim ersten Wuchs in Stufe 3 aufblühen, oder (c) gleich nach dem Ernten einmal im Hintergrund in Stufe 3 nachgespielt werden und so bleiben. (c) kostet live nichts; ein Tipp auf „wie gespielt“ holt das Original zurück. *Vorschlag nach deiner Klangregel: (c).* Hörbeispiele liegen bei.
>
> **4. Reine Klang-Schleifen bei Tempowechsel** (Mikro, „Alles“): (a) Sie spielen im alten Tempo weiter und laufen dann frei, nicht mehr im Takt. (b) Solange es sie gibt, bleibt das Tempo stehen. (c) Band: Tonhöhe geht mit. (d) Schnitt: Anschläge neu gesetzt. (e) Dehnen. *Vorschlag: (b).*
>
> **6. Klang-Humus ab dem ersten Ton?** Ernten kann nur, was schon mitgeschrieben wurde. Ab dem ersten Ton: Der Korb kann sofort ernten. Auf iPhone und iPad rechnet Safari dann aber den ganzen Klang auf einem Thread mit niedrigerer Priorität; das kann Aussetzer bringen. *Vorschlag: auf Android und PC ab dem ersten Ton; auf dem iPad entscheidet der Messtag.*

### M6 · §13 (missing) · Sound decisions the proposals asked him about were dropped or decided silently

**Problem.** His rule is „Never trade sound for cost on your own; if two goals conflict, ask the owner first“. These conflicts are missing from §13:

| Decision | Where it is now | Raised by |
|---|---|---|
| In „Live“ mode, whose voices are stolen first? | §4.2 decides „Schleifen-Stimmen weichen“ | performer Q1, designer Q3 („a sound decision, not mine“) |
| Gespinst and Rhizom in Wuchs ring with their own network, so the halo differs from live | §12 only; §6 even contradicts it (M8) | — |
| Continuous Reich drift (≈ 0.1 % resampling, < 2 ct), or stepped only | §3.7 decides „stufenweise“ | composer Q4 |
| A loop that cannot follow in time | §4.2 (M2) | — |
| Humus length: 64 s, or longer for long ambient loops (25 MB per minute) | — | performer Q3 |

Note on the third row: note loops could drift continuously through Wuchs with no resampling at all.

**Fix.** Add each as a short question with a recommendation. For the drift question, recommend: „gleitend über den Wuchs für Schleifen mit Noten; stufenweise nur für reine Klang-Schleifen.“

### M7 · §3.2, §7 · Two gesture collisions in the "solid" core

**Problem.**
- **On a loop (§3.2):** „nach unten wischen = letzte Schicht zurück“ and „hoch/runter ziehen = Pegel“, and likewise „nach oben wischen = Karte“ against dragging up. Only the speed of the movement tells them apart. That is exactly the kind of hidden distinction §3.2 blames for the Fährte's unreliability; the designer avoided it (hold = card, drag = level).
- **On the foot switch (§7):** „halten = aufnehmen, solange gehalten“ and „2 s halten = Kern“ on the same pedal. Any push-to-record longer than 2 s (a 2-bar phrase at 91 BPM is 5.3 s) triggers Kern.
- When an overdub by holding starts is not stated. It must be touch-down, taken from the Humus, so the hold detection adds no delay.

**Fix.**
1. Level only in the card, the mixer and on nanoKONTROL2 faders. The ring keeps tap, hold, swipe down and swipe up.
2. Foot switch A: drop the 2-s hold. Pedal B: „halten = Kern, solange gehalten; loslassen = alles auf die Eins zurück“. Lichtung and Schluss go on the screen or a second B gesture without a hold.
3. State the rule: „Auf einem Pedal hat Halten genau eine Bedeutung.“
4. Add to §3.2: „Überspielen beginnt beim Aufsetzen des Fingers (aus dem Humus), nicht erst, wenn das Halten erkannt ist.“

### M8 · §0 #6, §9 #10, §6 · Promises the mechanism does not deliver, and an internal contradiction

**Problem.**
- „Veto pro Note“ (§0 #6, §9 #10): §5.6 says the Knospen on the field take no touches, and ✕ on the Ringleiste rejects „die Änderung“ of a loop. There is no per-note veto.
- §6 (Sporenregen, Rhizom, Gespinst) says „Wuchs- und Live-Schleifen schlagen dasselbe Netz … an wie deine Hände“. §4.2 and §12 say only „Live“ shares the web, and Wuchs rings „nur aus den Noten der Schleife“.

**Fix.**
1. Write „mit Veto für jede Änderung“, and say where: „✕ auf der Ringleiste, solange die Knospe sichtbar ist“.
2. Change §6 to „Live-Schleifen schlagen dasselbe Netz an wie deine Hände; Wuchs-Schleifen klingen mit eigenem Netz (§12) und können das Live-Netz über ihren Klang anregen (§5.8).“

### M9 · Core vocabulary Abdruck / Wuchs / Treu / Lebendig is inconsistent

**Problem.**
- „Lebendig“ means Wuchs in general in §0 („soll sie lebendig werden, dann wächst sie“), §0 #1, §9 #1, §12 and §13 #2. In §5.4 it is one Eigensinn step: a new Wurf each pass.
- §5.4 says Lebendig means „Nur die Physik variiert“, then „Das Timing atmet …“, so the timing varies too.
- §6 Gestik says „Abdrücke bekommen Aussetzer und Stotterer …, Treu-Schleifen bleiben, wie sie sind“. A default loop is *both* Abdruck and Treu. In piece A at 3:00 the default Jahresring stutters, contradicting „Treu bleibt“.
- „Wandern“ is both the Eigensinn step (§5.4) and the Reich loop that „wandert“ (§3.7).

**Fix.**
1. Define the two axes once:

   > **Wiedergabe:** Abdruck oder Wuchs. **Eigensinn:** Treu · Lebendig · Variieren · Wandern. Treu und nichts ändert sich = Abdruck.

2. Reserve „lebendig“ for the step. Elsewhere write „neu gespielt“ or „wächst“.
3. In Lebendig, write „Physik und feines Timing variieren“.
4. Decide what Ladung does to a Treu-Abdruck loop.
5. Rename the Reich loop to „versetzt“ or „Phase“.

---

## Minors

- **§2** „Alle fünf Entwürfe haben unabhängig … denselben Namen gewählt“: the brief listed „rings of fungi“ in the vocabulary. *Fix:* „Alle fünf Entwürfe kamen auf denselben Namen.“
- **§1** „1773 Cent“: he will read this as pitch. *Fix:* „der Filter springt um anderthalb Oktaven“.
- **Overloaded words:**
  - „Stufe“ means a scale degree (§3.3, §4.1, §4.3, §5.3), a quality level (§4.2, §9, §12, §13) and an Eigensinn/Gärtner step (§5.4, §5.5). *Fix:* „Tonstufe“, „Qualitätsstufe“, and the step names without „Stufe“.
  - „Ring“ is „bewusst vermieden“ (§2) but used throughout („Unter jedem Ring“, „am Ring drehen“). *Fix:* say rings in the Ringleiste are fine, but nothing is *named* „Ring“.
  - „Hyphen“ is already Myzel's visual hyphae (Gestik §4.5) and also the Wuchs texture in the Ringleiste (§4.2). *Fix:* call the feature „Schleifen nähren das Instrument“.
  - Mode „Schichten“ against „Schicht“. *Fix:* modes „neue Schleife“ / „dieselbe Schleife“.
- **Undefined terms:** „Lied-Modus“ (§5.2), „Kernschleifen“ (who marks them?), „Grundlänge“. *Fix:* define them, or say „Kern = eine Lichtung, die du als Kern markierst“.
- **Overlap:** Lichtungen and Szenen A/B both store loop mute, level and Eigensinn. *Fix:* one owner, e.g. „Lichtungen sind die Szenen des Hexenrings; Szene A/B kann eine Lichtung mitnehmen.“
- **§3.3:** „bis zum Taktstrich, den du gerade gehört hast, einschließlich des laufenden Takts“ contradicts itself. *Fix:* „die letzten 1, 2, 4 oder 8 Takte bis genau jetzt; die Eins bleibt auf dem Taktstrich, die Schleife läuft ohne Sprung weiter.“
- **§0** „Jede Schleife hält zwei Dinge fest“ against §4.1 „dreifach“ (Bewegung). §0 also says „Ein Tipp behält es, einer lehnt es ab“ without saying where. *Fix:* „✓ behält es, ✕ lehnt es ab, beides auf der Ringleiste.“
- **§0** „Myzel hört immer mit“ may read as microphone. *Fix:* „Myzel schreibt immer mit (intern, ohne Mikrofon).“
- **§7 against §8 C:** ▶▶ is Wiederholen in §7, but Lob in piece C at 12:00.
- **§8 C:** „Begleiten schlägt eine … Böe-Fläche vor“, but §5.5 Begleiten proposes bass and chords. At 1:40 the bass fading out is a „pflegt“ behaviour, while the stage named is „antwortet“ (fine only if cumulative, M4).
- **§5.5 Jahreslauf** „Frühling erntet bereitwillig“: the Gärtner does not harvest. It also overlaps Jahresring's own year. *Fix:* cut, or defer.
- **§11 stage 3** „ein Skript oder ich [übernehme] die Rolle des Mitspielers“: Claude cannot play live with him. *Fix:* „eine einfache Probefassung des Verhaltens, die du ausprobierst und bewertest“.
- **§4.2 (V) for render speed:** the figures are voices only, and the lean graph was not measured. *Fix:* mark the lean graph (A). Also, only `e1.out` and `e4.out` are saved; the other (V) figures rest on the engineer's report.
- **§5.4** „in einem Drittel deiner eigenen Streuung … (V, Studie)“: the third is a design choice (A); only the preference for correlated noise is from the study.
- **Jargon in the musical sections:** phasengleich, Puffer, Kontext, 128er-Raster, the dB and "18 000-fach" figures in §3.6 and §4.2, Resampling. *Fix:* keep one plain sentence there („gemessen: an der Naht nicht lauter als in der Mitte“) and move the numbers to §10.
- **Phone layout:** the §10 diagram is about 110 characters wide and unreadable on a phone. *Fix:* replace it with a three-line list, and link `ideas/designer-phone.svg` from §3.1. The 4-column table in §4.3 is hard on 360 px.
- **§9:** it repeats §0's list at twice the length. *Fix:* shorten to one line of evidence per item, or move it to an appendix.
- **§13 #13:** fifteen names in one list. *Fix:* ask only about Hexenring, Ernten, Abdruck/Wuchs, Eigensinn/Gärtner.
- **Smaller dropped questions:** Kette vs Schichten as the default (designer Q1), one or two undo histories (designer Q9), haptic count-in (performer Q7). Each needs one line in §13, or a stated default.
- **§3.3 step 4:** seven correction chips above the Ringleiste on a 360-px phone. Check that they fit (designer measure).
- **§3.5:** dragging the Korb onto loop 6 needs paging (4 per page on a phone). Say how.

---

## Names: keep, merge, cut

| Keep (core) | Merge or rename | Cut or defer („später, nach Spieltest“) |
|---|---|---|
| Hexenring, Schleife, Schicht, Humus, Ernten, Abdruck, Wuchs, Wurf, Eigensinn (Treu · Lebendig · Variieren · Wandern), Gärtner (schaut zu · pflegt · antwortet), Knospen, Lichtung, Ringleiste, Takt, Auslese, Einwurzeln, Treffen, Handschrift | Korb → just the Ernten button · Reigen → „Folge“ of Lichtungen · Atempause → „kurzer Schlaf“ · Kern → a marked Lichtung · Welken + Abbau → ways to end in „Schluss“ · Sediment → „zusammenlegen“ · Hyphen → „Schleifen nähren das Instrument“ · Kompost → a flavour of Abrieb · Lob/Nein/Anker → just ✓ ✕ ⚓ · Werkstatt/Bühne → one switch „Bühnenansicht“ · Kette/Schichten → „neue Schleife“ / „dieselbe Schleife“ | Jahreslauf · Träumen · Gärtner „verwildert“ · Gesamtregler „wie frei ist die Band“ · Bauplan (defer) |

Result: about 18 names he must learn instead of about 45. With M3's restaging and §9 shortened, the draft should land near the Klang concept's 36 k characters without losing an idea that matters.

## Suggested order, for reading on a phone

1. **0 · Auf einer Seite.** Add „Wo die KI steckt“ (B1) and „Was zuerst kommt“: „Etappe 1 bringt …; das Lebendige kommt mit Etappe 2, wenn dein Handy schnell genug ist“.
2. **1 · Fährte.**
3. **2 · So spielt es sich.**
4. **3 · Abdruck und Wuchs.**
5. **4 · Verwandeln und Form.**
6. **5 · Die KI** (Ohr, Eigensinn, Gärtner, Knospen, Handschrift, honest limit).
7. **6 · Schleifen nähren Myzel.**
8. **7 · Ohne hinzusehen.**
9. **8 · Drei Stücke**, tagged by stage.
10. **9 · Etappen**, with „danach kannst du …“ and the effort for each.
11. **10 · Grenzen.**
12. **11 · Entscheidungen.**
13. **Anhang:** Namen, Technik, Was neu ist (details).

## What would make him say „das ist es“

- A first page that names three big ideas in his words:
  - **Ernten statt Einzählen.**
  - **Schleifen, die weiterwachsen, in bester Qualität.**
  - **Eine KI, die mitspielt, so weit du willst, und dir einen Takt vorher zeigt, was sie vorhat.**
- **Hörbeispiele, before he decides #2 and #3.** One phrase as Abdruck, as Wuchs in Stufe 3, and as four living passes. Then show him a single „guter Wurf“.
- A first stage that already contains one moment of magic: Auslese of the best pass, a loop ringing into Gespinst, and form tools so he can play a whole piece.
- Decisions he can answer by ear, each with a recommendation.
