# Library UI – choosing among 25–40 Klangquellen on a phone

Scope: how music apps and hardware present and group 10–150 instruments/models, and which pattern fits Myzel's Klang panel (sheet body 308 px at 390×844, 252 px at 360×740; chips reused in 7 places). Written 2026-10-13.

**Evidence policy.** `verified(URL)` = the fact appeared in that page's text as quoted by the search engine; `verified(code)` = checked in `/home/user/4claude/myzel/index.html` or the screenshots in `scratchpad/klang/shots/`; `assumed` = my own knowledge of the product, not re-checked. **Limitation:** in this sandbox no page could be fetched (every host → DNS/egress blocked, proxy answers 403 to CONNECT) and the shared WebSearch budget ran out after ~30 queries, so screenshots could not be inspected; every visual-layout statement below is `assumed` unless marked otherwise. Follow-ups worth running when network is available are listed in §9.

---

## 1. Myzel today (verified(code))

- Picker = `SEL(..., {chips:1})` → `<div class="chips" role="radiogroup">` of `<button class="chip" role="radio">`; roving `tabIndex`, Arrow keys step through `d.opts` and call `setParam` (index.html 12067–12083). Chip: pill, `min-height 34px`, 13 px text, `.small` 32 px (CSS 156–162). No icon, no colour, no description on the chip; the one-liner `ENG_INFO[k]` is only used as section subtitle (17015).
- 14 engines → 4 chip rows = **160 px**, i.e. 52 % of the visible sheet body at 390 px and 63 % at 360 px; the whole "Klangquelle" section is 355 px (115 % / 141 % of the body) (`code-map.md` §8, `klang-p390.png`).
- The same radiogroup is rendered 7× (Spielfläche `v.eng`, Ebene 2 `v.layer` with extra "Aus", Puls `l0–3.eng` small, Mixer-Fruchtkörper `mxd-…`) plus Gestik subsets (`RG_S` 6 chips, Rassel 3 chips). In the Puls panel the chip rows scroll **under the sticky lane head** (`puls-lane-p390.png`: "Schwarm Tiefe Glocke" half hidden).
- Order is one flat list, "held first, then struck" (1664). Header chip `#engChip` shows the current name ("Nebel + Schale") and opens the Klang panel (18782).
- Random already exists: `dice()` does `pick(ENG_OPTS)` for Klang and Ebene (17571). Audition path exists: `hit(eng, t, f, y, vel, {gate})` plays any engine as a 0.22 s burst (5080) – this is what Sporenregen uses.
- Projection (assumed, 40 px/row): 24–30 engines → 6–8 rows ≈ 240–320 px per chip group, ×7 sites. Without a new picker the selection alone exceeds the visible sheet on both phone sizes.

---

## 2. Survey: how others present many sources

### 2.1 Apps

| App | What is picked | Picker form | Grouping | Search / tags / fav / recent / random | Audition | Description + identity | Reuse in several places | Status |
|---|---|---|---|---|---|---|---|---|
| **GarageBand iOS** | ~10 Touch Instruments, then "Mehr Sounds" variants | Full-screen **Sound browser**, swipe horizontally through instrument cards, tap to open; "More Sounds" lists variants per instrument; Browser button in the control bar returns; on iPad **touch-and-hold the Browser button shows a list** for quick switching | By instrument family (Keyboard, Guitar, Bass, Drums, Strings, World…), variants inside | Sound Library download; no tags/search in the instrument level (assumed) | Tap = instrument opens, you play it (no separate preview) (assumed) | Big illustrated card per instrument + name; variants as text list (assumed) | One browser for all tracks | verified(https://support.apple.com/guide/garageband-iphone/chsff8c943/ios; iPad long-press: https://help.apple.com/pdf/garagebandipad/en_US/garageband-ipad-user-guide.pdf as summarised) |
| **Logic Pro iPad** | Thousands of patches | **Browser** column/sheet: category list, "advanced search" combining keywords + filters, star = Favorites, **Preview button left of each patch name**, **Replace mode** (each tap loads onto the track), natural-language loop search (Apple Intelligence, loops only) | Instrument/Audio FX/Loops/Samples; patches by instrument category + tag filters (assumed names) | search ✔, filters ✔, favourites ✔, recent (assumed), random ✖ | ✔ dedicated preview button | Name + small category icon (assumed) | Same browser for instrument, FX, loops | verified(https://support.apple.com/guide/logicpro-ipad/lpipba17453e/ipados; https://support.apple.com/guide/logicpro-ipad/lpipc520cc93/ipados) |
| **Ableton Note** | 76 drum kits, 317 synth sounds, 60 melodic-sampler instruments (current listing; older: 56/261/36) | Full-screen sound list per track type, scrolled vertically, chosen by tap; track types Drum / Melodic Sampler / Synth decide which list you see (assumed layout) | By track type; inside by category/pack (assumed) | search (assumed), favourites (assumed), no random (assumed) | Tap loads it; play pads to hear (assumed) | Text rows (assumed) | One list per track type | counts verified(https://apps.apple.com/tr/app/id1633243177, https://applevis.com/comment/158801); workflow verified(https://www.soundonsound.com/reviews/ableton-note); layout assumed |
| **Koala** | 16 sample pads/bank; the "sound" is whatever you record or import | Pad grid; **sample browser** for import (files, iCloud), drag file onto a pad; no instrument list at all | Banks of 16 | – | Tap pad | Pad colour per sample (assumed) | – | verified(https://static.roland.com/manuals/sp-404mk2_v4_koala_sampler/eng/164266033.html; https://www.elektronauts.com/t/koala-sampler-app/82974?page=13); SOS: "UI easy to navigate", "built around the classic sample-pad approach" verified(https://www.soundonsound.com/reviews/elf-audio-koala-sampler) |
| **Drambo** | 120–140+ modules incl. a Plaits-style macro oscillator with 24 engines | **Module browser** = categories → sub-categories → modules ("PROCESSOR / AMP", "MODULATOR / ENVELOPES"); **"?" button top-left turns a tap into a help overview of any module**; module header menu: name, presets, help, visibility | Category / sub-category tree: oscillators, filters, mixers, modulators, math, sequencers, MIDI, rack | search (assumed), no favourites (assumed) | No audition in browser (assumed) | Text; help text on demand | Same browser everywhere a module is added | verified(https://www.beepstreet.com/drambo-docs/modular-processing-your-first-synth.html; https://www.beepstreet.com/drambo-docs/modular-processing-introduction.html; https://forum.beepstreet.com/discussion/comment/32400/; engine count https://mwm.ai/apps/drambo/1469365718) |
| **NanoStudio 2 / Obsidian** | Patches, AU presets | Patch browser; the AU library is "tagged, searchable"; Obsidian "relies on tags rather than folders"; subfolders in the User folder act as a filter after Manage ▸ Refresh | Tags (+ user folders) | tags ✔, search ✔, favourites (assumed) | assumed | Text | Same for internal + AU instruments | verified(https://apps.apple.com/app/id1112601015; https://blipinteractive.co.uk/community/discussion/comment/1615; …/comment/11647) |
| **Endlesss** | 72 drum banks, 216 instruments, 132 basses (Studio) | **Three horizontally paged screens**: page 1 picks the *type* (samples, effects, mic), page 2 the *instrument*, page 3 eight dials to tweak; app auto-advances after a pick | Type → instrument; sound packs (subscription adds 2/month) | packs; no search (assumed) | Pick then play (assumed) | Text + pack art (assumed) | One flow for every layer | verified(https://engadget.com/2020-03-31-endless-music-collaboration-app.html; https://musictech.com/reviews/endlesss-studio-review/) |
| **Borderlands** | Sample clouds | Gestural canvas; samples loaded via AudioShare/Audiobus/mic; default sample content shipped | – | – | – | Waveform rectangles on canvas (assumed) | – | verified(App Store https://apps.apple.com/US/app/id561369733; https://cdm.link/borderlands-amazing-looking-granular-sampler-ipad-desktop-free-source-and-beautiful-sound/). Criticism: "sample tools are frustratingly limited" (needs AudioShare) – App Store user review quoted in search |
| **Samplr** | 7–8 play modes × samples | Modes (Slicer, Looper, Granular/Bow, Tape, Scratch, Arpeggiator, Keyboard, Loop Player) switchable "at any time"; samples chosen "by icon in the lower part of the screen" | – | – | immediate | Mode icons; waveform per sample (assumed) | – | verified(https://www.soundonsound.com/reviews/samplr; https://apps.apple.com/app/id560756420) |
| **Animoog Z** | Presets + timbres | Preset browser with **tagging**, sharing, **random presets**; a Random tab in settings where modules (Orb, LFOs, Envelopes…) can be locked so randomise/preset-load leaves them alone; library via Files/iCloud | Tags (original Animoog used genre categories – not confirmed for Z) | tags ✔, random ✔ (scoped), favourites (unknown) | assumed | Text (assumed) | – | verified(https://apps.apple.com/app/id1586841361; https://forum.loopypro.com/discussion/comment/1137085/; https://www.soundandrecording.de/?p=54166) |
| **Moog Model 15** | 160+ presets, IAP packs | Preset list (assumed: list with categories); reviewers: "Easy on the eyes", con "No ability to swap out modules" | assumed categories | assumed | assumed | Patch-cable graphic (the UI is the hardware) | – | verified(https://www.musicradar.com/reviews/tech/moog-model-15-app-638933; https://forum.moogmusic.com/t/moog-m15-app-updated/18975) |
| **BeatMaker 3 (Intua, iOS)** | Factory kits/instruments, user files | File-style browser with folders, preview on tap (assumed). NB: searches returned the **UJAM "Beatmaker 3" plug-in** (tag browser genre/mood/BPM, instant previews), a different product – do not conflate | folders (assumed) | assumed | assumed | – | – | UJAM facts verified(https://www.ujam.com/blog/whats-new-in-beatmaker-3); Intua layout assumed |
| **Groovebox (Ampify/Novation)** | 3→5 instruments, each with 19–20 presets + 4 kits (2018), "hundreds of presets" | Choose instrument, then **shuffle to a different preset**; preset-driven ("rigorously designed to give you a place to start") | Per instrument | random/shuffle ✔ | play after load | Instrument artwork cards (assumed) | – | verified(https://musictech.com/2018/01/ampify-groovebox-review/; https://cdm.link/groovebox-music-app-rigorously-designed-give-place-start/; https://eu.novationmusic.com/software/groovebox-ios). Criticism: "sparse mixer", no automation (Bonedo, verified https://www.bonedo.de/artikel/novation-groovebox-for-ios-test/) |
| **Fugue Machine** | none – MIDI sequencer, sound comes from the routed instrument (Classic/Rubato) | – | – | – | – | – | – | verified(https://apps.apple.com/app/fugue-machine-midi-sequencer/id1014191410; SOS review). Not a picker precedent. |
| **Mela (Nikolozi)** | Mela 5: engine "based on modules and dedicated collections", free + IAP collections; Mela 2: preset management with import/export, customisable perform view | Module picker per slot (assumed list grouped by collection) | Collections | – | – | – | Same picker in every slot (assumed) | verified(https://synthanatomy.com/2024/03/nikolozi-mela-5-virtual-analog-synth-for-ios-macos-is-now-free-with-iap-modules.html; https://synthyfrog.com/app/mela-2-synth-fx/) |
| **AudioKit Synth One** | 300+ presets in banks | Preset panel: bank selector + scrolling list; category buttons along the top (All, Arp/Seq, Poly, Keys, Bass, Lead, Pad, FX, User) (assumed); import/export, MIDI bank/program | Banks + categories | favourites ✖ (assumed), random (assumed ✖) | load then play | Text list | – | counts verified(https://www.kvraudio.com/news/audiokit-pro-releases-free-open-source-ipad-synth-41737; https://www.open-electronics.org/?p=24184); layout assumed |

### 2.2 Hardware

| Device | Items | Selection | Grouping | Identity / description | Status |
|---|---|---|---|---|---|
| **Mutable Plaits** | 16 models (fw 1.0/1.1) → **24 with fw 1.2** (new "orange" bank of 8 pitched models: 6-op DX7-style FM, wave terrain, string machine…) | **Two buttons, each cycles its bank of 8; 8 bicolour LEDs show the active model**; left button = pitched models, right = noise/percussive; short press of both toggles an alternative mode (button 1 = previous, button 2 = next; long press = calibration); MODEL CV input automates model changes; trigger input S&H on model change | Banks by character (pitched / noisy-percussive / "orange" extra pitched) | No text at all – position + LED colour only; colour per bank (assumed: green bank 1, red bank 2, orange bank 3) | verified(https://www.musicradar.com/reviews/mutable-instruments-plaits; https://clockfacemodular.com/en/products/mutable-instruments-plaits; https://pichenette.readthedocs.io/en/latest/modules/plaits/firmware/ (as quoted); https://www.gearnews.com/mutable-instruments-adds-dx7-mode-to-plaits-and-a-load-more-algorithms/; https://synthanatomy.com/2022/12/mutable-instruments-plaits-new-firmware-adds-8-models-incl-dx-7-fm-synthesis.html) |
| **TE OP-1 / OP-1 Field** | 8 engines (2011) → 12 (+ Dimension, vocoder on Field); DNA engine unique per unit | **Shift + T1 opens the engine browser; blue encoder scrolls; T1 confirms; swapping the engine keeps envelope/FX/LFO**. **Shift + 1–8 opens a combined browser: blue encoder = engine type, ochre encoder = preset within it**; the 8 sound keys are instant preset slots. Each engine has **4 parameters with unique graphics** | Flat list; presets per engine | A distinctive animated graphic per engine = the identity; reviewers: "not initially obvious just how deep you can go" | verified(https://teenage.engineering/guides/op-1/original/synthesizer-mode (as quoted); https://www.musicradar.com/reviews/teenage-engineering-op-1; https://www.synthtopia.com/content/2023/02/10/teenage-engineering-op-1-op-1-field-synth-engines-compared/; https://musictech.com/reviews/op-1-update-review) |
| **Elektron Syntakt / Digitone II** | Syntakt: 8 digital tracks × 10 machines, 3 analog drum tracks × 15, 1 cymbal track × 12 (≈35 total; 1.30 added SY CHIP, SD/BD ACOUSTIC, HH LAB). Digitone II machines: Wavetone, Swarmer, FM Tone, FM Drum | Per-track **machine** chosen from a menu (user note: hold FUNC + SYN, turn a MOD knob); the machine redefines the SRC parameter page; the list is a plain scrolling name list (assumed) | By track type (digital vs analog; pitched vs drum) → the hardware gates the list by what the track can do | Name only; parameter page changes | verified(https://www.thomannmusic.com/elektron_drum_machines.html; https://scrapbox.io/0b5vr/Syntakt_Day_1; https://www.bonedo.de/?p=2387273; https://cdm.link/elektron-digitone-ii-syntakt-130/); exact key combo assumed |
| **Arturia MicroFreak** | 12 → 16 → more oscillator types (VA, Karplus-Strong, vowel/speech, Plaits-derived, Noise Engineering) | **One Type knob steps through types; the OLED shows the 3 type-specific parameters as "test tubes" that fill/empty** | Flat | Name on OLED + graphic | verified(https://www.musicradar.com/reviews/arturia-microfreak; https://musictech.com/reviews/arturia-microfreak/) |

### 2.3 Platform guidance

- Apple HIG, segmented controls: "no more than about five to seven segments in a wide interface and no more than about five segments on iPhone" – verified(https://developer-mdn.apple.com/design/human-interface-guidelines/components/selection-and-input/segmented-controls as quoted). → a family row of ≤5 segments is HIG-conformant; 14–40 chips in one radiogroup is not a segmented control but suffers the same parsing problem.
- Material chips: four variants — assist (action), filter (filters results), suggestion (product-generated), input (user-generated); "Filter chips are tags used to filter content"; Compose `FilterChip` carries its own selected state – verified(https://developer.android.com/quick-guides/content/create-chip; https://material-web.dev/components/chip/). Material also recommends horizontally scrolling chip rows when they exceed the width (assumed), with a 48 dp touch target (assumed).
- Touch targets: Apple 44×44 pt (assumed, HIG), Material 48 dp (assumed), WCAG 2.2 SC 2.5.8 minimum 24×24 CSS px (AA) / SC 2.5.5 44×44 (AAA) (assumed). Myzel's chips are 34 px / 32 px (`.small`) with 6 px gap (verified(code)) → below 44 px except in Gestik/MIDI cards (coarse pointer rule 44 px, CSS 380/511).
- Accessibility specifics: Myzel's radiogroup already implements the WAI-ARIA radio-group pattern (roving tabindex + arrow keys) (verified(code)); AppleVis maintains an entry for Ableton Note with ~10 comments (existence verified: https://applevis.com/comment/188798, …/188741, …/188746, …/188713), content not readable here; GarageBand is commonly cited as VoiceOver-accessible (assumed).

---

## 3. Findings by question

**Categories/families vs tags.** Apps with hundreds of items use tags + search (Logic, NS2, Animoog Z, UJAM); apps with 10–40 items use *families* and gate by context (GarageBand instrument families, Endlesss type→instrument, Elektron track type, Plaits banks, Drambo category→sub-category). Nobody with ≤40 items uses free tags as the primary navigation. Two-level family→item is the dominant pattern at Myzel's scale. Plaits shows 24 items are navigable with *zero text* when banks have a clear character; the cost is that users memorise positions.

**Search.** Only at ≥100 items (Logic, NS2, Drambo). For 25–40 German one-word names a search field is marginal; a type-ahead on the keyboard path (desktop/MIDI users) is cheap and sufficient (assumed).

**Favourites / recent.** Logic: star favourites (verified). OP-1: 8 instant slots = user-curated favourites (verified). GarageBand iPad: long-press list = quick switch (verified). Recent lists not confirmed in any source → treat "Zuletzt" as nice-to-have; favourites/slots as proven.

**Random / inspire.** Groovebox "shuffle" (verified), Animoog Z random with module locks (verified), Myzel `dice()` (verified(code)). Scoped randomness ("roll only the engine, keep everything else") is the Animoog Z lesson.

**Preview / audition on tap.** Logic: explicit preview button per row + Replace mode (verified). Everything touch-instrument-shaped (GarageBand, Note, Koala, Samplr, Endlesss) uses *pick → play immediately* instead of a separate preview. For Myzel both exist for free: `hit()` burst for a tile tap, `playNote` held while the finger stays on the tile (assumed design; APIs verified(code)).

**Compact chip rows vs sheets/drawers vs carousels.** Chip rows: good ≤ 8 items (2 rows); beyond that they eat the panel (Myzel measurement) and scroll under sticky heads. Sheets/drawers: every "many sounds" app ends up in a full-height browser (GarageBand, Logic, Note, Endlesss, Drambo). Carousels/steppers: hardware (Plaits, OP-1, MicroFreak) uses stepping with a graphic per item – fast to try neighbours, slow to reach a specific one, needs a one-row footprint only. Endlesss's horizontally paged type→instrument flow is a carousel at the *family* level.

**One-line description + visual identity.** OP-1's per-engine graphic (verified) and MicroFreak's test-tube parameters (verified) are the strongest identities; Drambo's "?"-mode help (verified) is the cheapest description pattern. GarageBand cards (illustration + name + subtitle) are the mobile reference (assumed). Myzel already has `ENG_INFO` one-liners (verified(code)) but no glyph/colour per engine; mixer colours are per channel, not per engine (verified(code)).

**Reuse of the same picker.** Logic's one Browser serves instruments/FX/loops with a mode toggle; Drambo's one module browser serves every slot; Endlesss's one flow serves every layer; Elektron gates the same machine list by track type. The pattern: *one* picker component parameterised by (target id, allowed subset, current value), not N copies of a chip group.

---

## 4. Review evidence (praise / criticism relevant to pickers)

- Koala: "the UI easy to navigate", "built around the classic sample-pad approach" – verified(https://www.soundonsound.com/reviews/elf-audio-koala-sampler).
- Borderlands: "interface stunning" (reviewers) vs user review "sample tools are frustratingly limited" (needs AudioShare) – verified(App Store listing as quoted).
- Endlesss: committing instruments to audio is "liberating … though it takes some getting used to" – verified(https://musictech.com/reviews/endlesss-studio-review/).
- OP-1: "loads of detail, loads of graphics", "not initially obvious just how deep you can go" – verified(https://www.musicradar.com/reviews/teenage-engineering-op-1).
- Groovebox: "sparse mixer", no automation – verified(https://www.bonedo.de/artikel/novation-groovebox-for-ios-test/); "rigorously designed to give you a place to start" – verified(cdm.link).
- Moog Model 15: "Easy on the eyes" / "No ability to swap out modules" – verified(musicradar).
- Drambo: "Innovatives Groovebox-Konzept mit vielen Möglichkeiten" – verified(https://www.keyboards.de/?p=52338).
- No source found that criticises a *sound picker* for being too long; the criticisms are about missing features (import, favourites) – consistent with pickers being invisible when they work.

---

## 5. Three candidate patterns for Myzel, ranked

Constraints recalled: 360–390 px wide, sheet body 252–308 px, 7 render sites + Gestik subsets, `SEL {chips:1}` semantics must stay for MIDI `selStep` and keyboard (verified(code) 12076, code-map §11.11), German bio-naming, no clash with Fruchtkörper/Geflecht/Pult/Sporenregen/Keime/Fährte/Ladung/Schlafen.

### Rank 1 — "Knopf + Blatt": one picker button inline, one shared library sheet
- **Inline (every site):** replace each chip group with a single 44-px row: `[● Glyph] Name — one-liner (ENG_INFO, ellipsised) [‹] [›]`. Tapping the name opens the sheet; ‹/› step through the flat `ENG_OPTS` order (Plaits/OP-1 stepping, MIDI `selStep` unchanged). Footprint 44 px instead of 160–320 px; fits under the sticky Puls lane head and inside the Mixer-Fruchtkörper.
- **Sheet (singleton, ~85 % height, above the panel):** header "Klangquelle für Spielfläche / Ebene 2 / Spur 3 / Regen"; row 1 = family filter chips (≤5, single-select, HIG limit) + "★" (favourites) + "Zuletzt"; body = 2-column tiles 64 px (≈ 7 rows visible = 14 engines per screen at 390 px; 30 engines = ~2 screens of scrolling), tile = glyph + colour + name + one-liner; footer = "Würfeln" (scoped `pick()`), "Alle anhören" (optional). Allowed subsets (RG_S, Rassel) → other tiles greyed with reason ("nur geschlagene Klänge").
- **Audition:** tap tile = select + `hit(eng,…)` burst (Logic Replace + preview in one gesture); hold tile = `playNote` held note until pointerup (held engines show their Höhe when sliding vertically on the tile – assumed design). Long-press on the inline name = audition without opening.
- **A11y:** button `aria-haspopup="dialog"`, label "Klangquelle, Nebel"; sheet `role="dialog"`; tiles stay `role="radio"` in a `radiogroup` so the existing arrow-key/roving-tabindex code is reused; type-ahead on first letter; Esc closes; ≥44 px targets everywhere.
- **Why first:** matches what every app with >20 sounds converged on (full browser) while keeping a one-row inline control; solves the 7× duplication by construction; makes room for identity (glyph, colour, one-liner) and audition, which the chips cannot carry.
- **Cost/risk:** new component (sheet, tiles, glyphs, favourites storage next to `myzel.patch.v1`); a modal step for the simplest switch (mitigated by ‹/› and long-press list à la GarageBand iPad).

### Rank 2 — "Familien-Reiter": chips stay, gated by a family row
- Row 1: segmented family selector (≤5: e.g. gehalten/geschlagen split first, then character) – single-select, scrolls nowhere. Row 2: only that family's chips (≤8 → ≤2 rows ≈ 80 px). Current family auto-selected from the current engine. Extra pseudo-families "★" and "Zuletzt". Random keeps `dice()`.
- **Pros:** minimal change to `ctl()` (wrap `d.opts` by `fam`), no modal, keyboard/MIDI untouched, 160–320 px → ~130 px per site. **Cons:** still 7 copies, still no glyph/one-liner/audition on the chip (could add long-press audition), users must know a family to find a name, 5 families × 6–8 engines caps growth at ~40, and under the sticky Puls head 130 px still partly hides.
- Best as the *inside* of Rank 1's sheet (its filter row) or as a fallback if the sheet is out of budget.

### Rank 3 — "Rad": stepper/carousel only
- One 52-px row per site: `[‹] [glyph · Name · one-liner · bank dots] [›]`; horizontal swipe on the row steps; each step auditions (`hit`); long-press opens a plain list (`select`-like) for direct access. Family = bank dots coloured per family (Plaits LEDs).
- **Pros:** smallest footprint, playful "try the neighbour" discovery (hardware-proven), trivial to drop into Puls lanes and Gestik cards. **Cons:** reaching a specific one of 30 = up to 15 steps; no overview; weak for screen readers unless the list fallback is the primary semantic; identity rests on the glyph. Use as the inline half of Rank 1, not alone.

### Decision hints for the ideation agents
- Keep **one flat canonical order** (`ENG_OPTS`) for MIDI/keyboard/‹›; families are a *view* (`FAM[k]`), not the order.
- Family split: primary axis **Spielweise** (gehalten vs geschlagen) because it changes surface behaviour (`triggerPerc` only for non-sustain, Spielhilfe texts); secondary axis **Welt/character** as colour + glyph. Candidate family words that do not clash with existing names: *Atem, Metall, Fell & Saite, Wesen, Strom* (assumed; naming is the ideation agents' call).
- Per-engine identity to add to `ENG_OPTS`/`ENG_INFO`: `glyph` (12–16 px inline SVG), `hue`, `fam`, `tags` (for the dialog's search/type-ahead). The Mixer's per-channel colours stay; the engine hue appears only in the picker.
- Audition must respect the voice budget: bursts cost `Q.cost[eng]` for ≤0.5 s; held audition should steal softly (`steal(false, true)`) like Sporenregen (verified(code) that these paths exist).

---

## 6. Compact numbers for layout decisions (verified(code) unless noted)

| Item | Value |
|---|---|
| Sheet body visible | 308 px @390×844, 252 px @360×740 |
| Chip row | 34 px + 6 px gap ≈ 40 px; `.small` 32 px |
| 14 chips today | 4 rows = 160 px; 15 (Ebene 2) 4 rows; Puls small 3–4 rows 114–152 px |
| 30 engines as chips | 7–8 rows ≈ 280–320 px (assumed) |
| Rank 1 inline row | 44 px (HIG target) |
| Rank 1 sheet, 2-col tiles 64 px | 14 tiles visible @390 (sheet ≈ 85 % = ~720 px minus header/filter ≈ 560 px) (assumed) |
| Rank 2 family row + ≤8 chips | ≈ 44 + 80 = 124–130 px (assumed) |
| Rank 3 stepper | 52 px (assumed) |

---

## 7. What to copy from whom (one line each)

- GarageBand iPad: long-press on the current-instrument button → quick list (no sheet).
- Logic iPad: favourites star + preview button + Replace-mode semantics (tap = load).
- OP-1: engine swap keeps the rest of the patch; per-engine graphic; 8 user slots.
- Plaits: two/three character banks reachable with ≤2 taps; colour per bank; model stepping.
- MicroFreak: the parameters *are* the picture (Myzel: Makro A/B as tiny meters on the tile – optional).
- Drambo: "?"-mode: one tap on anything explains it (Myzel: `ENG_INFO` as tile subtitle, longer help on long-press).
- Endlesss: type → instrument → tweak as three horizontal pages (Myzel: family → engine → section).
- Elektron: gate the list by what the slot can do (Rassel/Regen subsets greyed, not hidden).
- Animoog Z / Groovebox: scoped shuffle ("Würfel nur die Quelle").

---

## 8. Sources used (as quoted by the search engine; none fetched directly)

GarageBand iPhone guide https://support.apple.com/guide/garageband-iphone/chsff8c943/ios · GarageBand iPad PDF https://help.apple.com/pdf/garagebandipad/en_US/garageband-ipad-user-guide.pdf · Logic Pro iPad guide https://support.apple.com/guide/logicpro-ipad/lpipba17453e/ipados and https://support.apple.com/guide/logicpro-ipad/lpipc520cc93/ipados · Ableton Note SOS https://www.soundonsound.com/reviews/ableton-note · Note App Store https://apps.apple.com/tr/app/id1633243177 · AppleVis Note https://applevis.com/comment/188798 · Koala SOS https://www.soundonsound.com/reviews/elf-audio-koala-sampler · Roland/Koala manual https://static.roland.com/manuals/sp-404mk2_v4_koala_sampler/eng/164266033.html · Drambo docs https://www.beepstreet.com/drambo-docs/modular-processing-your-first-synth.html, https://www.beepstreet.com/drambo-docs/modular-processing-introduction.html, forum https://forum.beepstreet.com/discussion/comment/32400/ · NS2 App Store https://apps.apple.com/app/id1112601015, forum https://blipinteractive.co.uk/community/discussion/comment/1615, …/11647 · Endlesss Engadget https://engadget.com/2020-03-31-endless-music-collaboration-app.html, MusicTech https://musictech.com/reviews/endlesss-studio-review/ · Borderlands App Store https://apps.apple.com/US/app/id561369733, CDM https://cdm.link/borderlands-amazing-looking-granular-sampler-ipad-desktop-free-source-and-beautiful-sound/ · Samplr SOS https://www.soundonsound.com/reviews/samplr, App Store https://apps.apple.com/app/id560756420 · Animoog Z App Store https://apps.apple.com/app/id1586841361, LoopyPro https://forum.loopypro.com/discussion/comment/1137085/ · Model 15 MusicRadar https://www.musicradar.com/reviews/tech/moog-model-15-app-638933 · UJAM Beatmaker https://www.ujam.com/blog/whats-new-in-beatmaker-3 · Groovebox MusicTech https://musictech.com/2018/01/ampify-groovebox-review/, CDM https://cdm.link/groovebox-music-app-rigorously-designed-give-place-start/, Bonedo https://www.bonedo.de/artikel/novation-groovebox-for-ios-test/, Novation https://eu.novationmusic.com/software/groovebox-ios · Fugue Machine App Store https://apps.apple.com/app/fugue-machine-midi-sequencer/id1014191410 · Mela https://synthanatomy.com/2024/03/nikolozi-mela-5-virtual-analog-synth-for-ios-macos-is-now-free-with-iap-modules.html · Synth One KVR https://www.kvraudio.com/news/audiokit-pro-releases-free-open-source-ipad-synth-41737 · Plaits MusicRadar https://www.musicradar.com/reviews/mutable-instruments-plaits, firmware page https://pichenette.readthedocs.io/en/latest/modules/plaits/firmware/, Gearnews https://www.gearnews.com/mutable-instruments-adds-dx7-mode-to-plaits-and-a-load-more-algorithms/ · OP-1 guide https://teenage.engineering/guides/op-1/original/synthesizer-mode, MusicRadar https://www.musicradar.com/reviews/teenage-engineering-op-1, Synthtopia https://www.synthtopia.com/content/2023/02/10/teenage-engineering-op-1-op-1-field-synth-engines-compared/ · Syntakt Thomann https://www.thomannmusic.com/elektron_drum_machines.html, scrapbox https://scrapbox.io/0b5vr/Syntakt_Day_1, CDM https://cdm.link/elektron-digitone-ii-syntakt-130/ · MicroFreak MusicRadar https://www.musicradar.com/reviews/arturia-microfreak, MusicTech https://musictech.com/reviews/arturia-microfreak/ · Apple HIG segmented controls https://developer-mdn.apple.com/design/human-interface-guidelines/components/selection-and-input/segmented-controls · Material chips https://developer.android.com/quick-guides/content/create-chip, https://material-web.dev/components/chip/

---

## 9. Open items to verify when network is available (none block the ideation)

1. Screenshots: GarageBand iPhone Sound browser cards; Logic iPad Browser filter row; Ableton Note sound list (favourites? search?); Synth One category bar; Intua BeatMaker 3 browser (preview-on-tap?).
2. Plaits LED colour per bank (green/red/orange) from the official manual.
3. Elektron Syntakt exact machine-select key combo and whether the list shows descriptions.
4. AppleVis verdicts for Note, GarageBand, Koala, Drambo (VoiceOver labelling of pickers).
5. NN/g or Baymard evidence on discoverability of horizontally scrolled chip rows (used here as assumed).
