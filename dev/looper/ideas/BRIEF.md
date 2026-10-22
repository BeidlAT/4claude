# Brief for the looper concept proposals

## The owner's request (verbatim, German)
> Also das Instrument braucht so etwas wie einen Looper. Die Fährte funktioniert in der Form nicht richtig oder unzuverlässig. Wir brauchen hier eine solide Lösung auf musikalisch hohem Niveau, mit der sich Musiker auf vielfältige Art und Weise künstlerisch ausdrücken können. Also kein ordinärer Looper, wir befinden uns schließlich im KI-Zeitalter und die Möglichkeiten sind immens. Arbeite ein entsprechendes Konzept aus und präsentiere mir dann deine ausgereifte Idee.

## The owner's standing rule (whole project)
Always the best sound quality. Cost ("Einheiten", VCOST, voice budget) is measured and entered honestly but is never a reason to simplify a sound – use every option. Never trade sound for cost on your own; if two goals conflict, name the conflict as a question for the owner. (The owner has NOT ruled out time-stretching; it is a sound-quality question – prefer approaches that keep the sound perfect, and flag any stretch/resample as a decision.)

## The instrument (Myzel)
- One HTML file `myzel/index.html` (~1.4 MB, German UI, vanilla JS + Web Audio, one shared AudioWorklet module), installable offline app on GitHub Pages. Primary device: an Android phone; also iPhone/iPad and a Windows PC with KORG keyboards (nanoKEY Studio, microKEY Air, nanoKONTROL2). The claude.ai view blocks mic, motion and MIDI.
- Playing surfaces: the touch field (a scale field: columns are scale degrees, finger height = "Höhe", a timbre/expression axis; held and struck sources), Ebene 2 (a layer source), the Puls (a step sequencer with 4 lanes, Euclidean, swing, its own clock and MIDI clock in/out), Bordun, Sporenregen and Keime (Gestik rain of seeds), Rhizom (cascades through the scale), Gespinst (a shared web of sympathetic strings), Schlafen (phone face down = freeze cadence), Gestik (phone motion: Anlehnen/tilt, Bebung, Drehen, Ladung/shake, Wenden, Ruhe), MIDI keyboards incl. MPE.
- 28 sound sources ("Klangquellen"), many physical or chaotic models – the same note never sounds exactly the same twice.
- Mixer with strips (fin, eb2, rgn, l0–l3, bor, gsp, dly, rev), scenes A/B with a morph, presets with Gestik recipes, "Aufnahme in Takten" (a sample-exact bar recorder that folds the tail onto the start for seamless loops; takes in RAM + IndexedDB; WAV export), a mic input used for grains only.
- The existing "Fährte" loops movement/modulation only (never notes or audio). It fails as a looper: notes are not repeated; invisible bar grid; seams jump; fades away by default; hidden button; stalls make it jump. Its beat clock (never jumps), latency compensation, look-ahead scheduling and save format are sound and reusable. Recommendation from the forensic report: retire it as a separate button, fold its movement recording into the new looper as a layer.
- Names already taken (do not reuse for new things): the 28 sources (Nebel, Körner, Hauch, Glocke, Membran, Saite, Schale, Gong, Kalimba, Obertöne, Stimme, Schwarm, Tiefe, Tropfen, Halm, Ranke, Elmsfeuer, Jahresring, Harz, Sehne, Zapfen, Glut, Moder, Böe, Amöbe, Gespinst, Rhizom, Kehlchen), Fährte, Ring (ring modulator), Kreisen (auto-pan), Schweben (chorus), Wirbel (roll), Einfrieren, Geflecht, Fruchtkörper, Puls, Bordun, Sporenregen, Keime, Gestik, Anlehnen, Ladung, Schlafen, Bebung. „Schleife“ is reserved for audio loops (Gestik concept §11). The instrument's vocabulary is the mycelium (spores, hyphae, roots, fruiting bodies, soil, rings of fungi …).

## Research to read first (all in `dev/looper/research/`)
- `faehrte.md` – what the Fährte is and why it fails (forensic, with reproductions).
- `code-map.md` – where a looper plugs into the code: choke points (`onDown/moveTouch/onUp`, `playNote`, `noteEvent`), the bar recorder (`beginBar`, `foldTail`), the tap worklet, a pre-master insert point, mixer strip pattern, clock, latency, storage, controls, UI slots, constraints. NOTE: event replays are not deterministic today (Math.random everywhere) – a design may require seeded randomness.
- `loopers.md` – state of the art: ~40 devices, practice (Fripp/Eno, Reich, Riley, Oliveros, Basinski, contemporary live loopers), what makes loopers solid, symbolic vs audio vs gesture looping, phone apps, 15 ranked ideas, pitfalls.
- `intelligence.md` – musical intelligence: Continuator, Reflexive Looper, OMax/Somax, ImproteK, Voyager, Magenta etc.; what runs on a phone browser offline (symbolic, rule-based: yes; neural audio: no); service vs co-player intelligence; "Eigensinn" control; ranked recommendations; honest limits; decisions for the owner (event vs audio loops and the voice budget).
- Also useful: `dev/gestik/konzept.md` (the owner-facing style of a concept; §4.4 Fährte), `dev/klang/KONZEPT.md` (the sources), `dev/HANDOFF.md`.

## What every proposal must contain (English, ≤ ~4500 words, Markdown)
1. **The idea in one paragraph** – what makes this looper unlike any other, in musical terms.
2. **Name(s)** – German, fitting the mycelium vocabulary, not colliding with the taken names; a name for the looper and for its main elements.
3. **How it plays** – the core gestures and workflows from the first tap to an advanced performance (phone alone; phone + MIDI keyboard; PC), including what happens at the seams, how loops start/stop/overdub/undo, how tempo and bars are found.
4. **What it records and how it plays back** (notes/events, audio, movement; per-loop modes), how it follows scale/tempo/sound changes.
5. **The musical depth** – transformations, form (scenes, series, multiple lengths), intelligence (which, how controlled, how visible), how it ties into Puls, Gestik, Sporenregen, Rhizom, Gespinst, Schlafen, the mixer, presets.
6. **What is new** – compared with the state of the art in `loopers.md` and `intelligence.md`.
7. **Feasibility sketch** – the architecture in brief (where it hooks into the code, audio thread vs main thread, memory, cost), with anything you verified marked (V) and assumptions (A).
8. **Risks, honest limits, and questions for the owner.**

Be bold but grounded: every idea must be musically justified ("would an excellent musician do this here?") and feasible offline on a phone. Avoid gimmicks.
