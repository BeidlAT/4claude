# UI-Variante B – „Klangquellen“: eine Bibliothek für 26+ Quellen

Stand 2026-10-17. Grundlage: `research/code-map.md` (§8 Klang-Panel, §11 Checkliste), `research/library-ui.md` (Rang 1 „Knopf + Blatt“), Screenshots `shots/*.png`, die drei Judge-Sets `ideas/judge-{1,2,3}.md`, Code `/home/user/4claude/myzel/index.html` (git `03050e0`).
Legende: **V** = im Code/Screenshot geprüft (Zeile), **A** = Annahme/Entwurfsentscheidung. Pixelwerte ohne V sind Hochrechnungen (A).

## 0. Entscheidung in fünf Sätzen

1. Jede der heute 7 Chip-Gruppen (`v.eng`, `v.layer`, `l0–3.eng`, Mixer-Fruchtkörper; V 12067, 16186) wird eine **Quelle-Zeile** von 44 px: `‹ │ Glyphe Name · Familie / Einzeiler │ ›`. Der Name öffnet die Bibliothek, ‹ › schalten in der kanonischen Reihenfolge weiter (wie MIDI `selStep`, V 6994).
2. Die **Bibliothek** ist ein Singleton-Layer „klangquellen“: Suche, Familien-Reihe (★ Favoriten, ⟲ Zuletzt, Alle, 5 Familien), eine Liste von 56-px-Kacheln mit Glyphe, Name, Spielweise, Einzeiler, ★ und ▶ Hören; Fuß mit „Überrasch mich“ und „Fertig“.
3. Tippen auf eine Kachel **wählt sofort** (Logic „Replace“) und spielt eine kurze Probe durch den Bus des Ziels (Spielfläche, Ebene 2, Spur, Regen) – man hört die Quelle so, wie sie gleich klingen wird. Langes Drücken hält den Ton; ▶ ist die Hör-Taste für Tastatur und Screenreader.
4. **Familien** sind eine Sicht (`ENG_META[k].fam`), nicht die Datenstruktur: Keys, `ENG_OPTS`, Presets und MIDI bleiben, alte Patches laden unverändert (sanitize prüft Keys, nicht Indizes; V 1975).
5. Die Engine-Sektion (≤6 Regler) bleibt direkt unter der Quelle-Zeile; Unter-Wahlen wie Harz „Körper“ oder Halm „Rohr“ bleiben kleine Chips (≤5), weil erst ab ~8 Optionen eine Liste nötig ist.

## 1. Familien und Zuordnung

Primärachse ist der **Charakter** (so findet man etwas), die **Spielweise** (hält / schlägt / beides) steht auf jeder Kachel als Wort, weil sie das Verhalten auf der Spielfläche ändert (`triggerPerc` nur für `!sustain`, V 6073). Fünf Familien (Apple HIG: ≤5 Segmente auf dem Handy, library-ui §2.3). Namen kollidieren mit keinem Engine-, Gestik- oder Mixer-Wort.

| Familie | Untertitel (Kachel-Kopf) | Bestehend | Neu (Kern 12 = Mehrheit der drei Judges) | Reserve (von 1–2 Judges) |
|---|---|---|---|---|
| **Luft** | Wind, Atem, Stimmen | Nebel, Hauch, Obertöne, Stimme | **Halm** (hlm), **Böe** (boe), **Kehlchen** (khl) | – |
| **Faser** | Saiten, Ranken, Bogen | Saite | **Sehne** (shn), **Ranke** (rnk), **Harz** (hrz), **Gespinst** (gsp) | Balz (blz) |
| **Schlag** | Metall, Fell, Holz | Glocke, Membran, Schale, Kalimba, Gong | **Moder** (mdr) | Jahresring (jrg) |
| **Rieseln** | Körner, Tropfen, Funken | Körner, Tropfen | **Zapfen** (zpf), **Elmsfeuer** (elm) | Rhizom (rhz) |
| **Wesen** | Schwärme, Zellen, Glut | Schwarm, Tiefe | **Amöbe** (amo), **Glut** (glt) | Unke (unk), Flechte (fle) |

Kern = 14 + 12 = **26**; mit Reserven 31. Herleitung: hrz, mdr, rnk, hlm, shn, boe, amo sind in allen drei Sets; gsp, glt, zpf, elm, khl in zwei (judge-1/3 bzw. judge-1/2); jrg, rhz, unk, fle, blz in einem Set oder nur als Reserve.

Spielweise je neuer Quelle (aus den Judge-Tabellen): hält: Halm, Böe, Kehlchen, Harz, Amöbe, Glut, Unke, Flechte, Balz · schlägt: Moder, Gespinst, Jahresring, Rhizom · beides: Sehne, Ranke, Zapfen, Elmsfeuer. „beides“ ist in `ENGINES` weiterhin `sustain:true` mit kräftigem Burst (A; das Flag ist binär, V 3530 ff.) – die Kachel zeigt das Wort aus `ENG_META.art`.

Einzeiler für `ENG_INFO` der neuen Quellen (Stil wie die bestehenden, V 1668–1683):

| Key | Einzeiler |
|---|---|
| hlm | Rohrblatt, Flöte, Flamme – Atem ist die Fingerhöhe, Überblasen inklusive |
| boe | Äolsharfe – Akkorde rasten ein, hängen und springen um |
| khl | Vogelkehle mit Schwelle – Silben und Triller, im Puls ein Schwarm |
| shn | Lebende Saite: Gleiten, Handkante, Flageolett, E-Bow, Jawari-Steg |
| rnk | Ein schwingender Ring, vom Finger gehämmert – klingt nach keinem Oszillator |
| hrz | Gestrichenes Glas, Schale, Stab oder Teich – der Druck des Fingers ist die Höhe |
| gsp | Ein Netz aus Saiten, das Finger, Ebene und Puls gemeinsam anregen |
| mdr | Kompostglocke – Glanz wird Knistern, dann Brummen: die Hüllkurve läuft rückwärts |
| zpf | Kratzen auf Zapfen, Fels, Holz – aus Rhythmus wird Ton |
| elm | Brummen, Knistern, Lichtbogen – und ein Zap im Puls |
| amo | Bass, dessen Welle in jeder Periode anders aussieht (Xenakis' GENDY) |
| glt | Gestimmte Rückkopplung – wächst unter dem Finger, glimmt nach |
| jrg | Holzstab – wo du triffst, bestimmt den Klang |
| rhz | Ein Schlag läuft durch die Skala – Lawinen im Wurzelnetz |
| unk | Zuhörender Froschchor – die Töne wechseln sich ab |
| fle | Atmende Fläche – ein Pilz, den alle Finger teilen |
| blz | Reibtrommel und Daxophon – die Hand formt die Tierstimme |

**Keine Familienfarbe.** Die Palette ist bereits mit 9 Kanalfarben belegt (fin/eb2/rgn/4 Spuren/bor/dly/rev, V 12261–12266); eine sechste Farbachse würde im Mixer mit Kanälen verwechselt. Identität = **Glyphe** (OP-1-Prinzip) + Name + Familienwort in `--dim`. Gewählt = `--spore` wie jeder Chip (V 160).

Glyphen (16–20 px Strich-SVG in `currentColor`, eine Idee je Quelle, A): Nebel drei versetzte Wellen · Körner Punktwolke · Hauch drei auslaufende Striche · Obertöne Grundlinie mit aufsteigenden Punkten · Stimme offener Mund (Ellipse) · Schwarm Punktwirbel · Tiefe fallender Pfeil in Kreis · Halm Halm mit Knoten · Böe gebogene Saiten im Wind · Kehlchen Vogelkopf mit Schnabel · Saite eine Linie mit Zupfpunkt · Sehne Linie mit Hand-Bogen · Ranke Spirale · Harz Bogen über Kreis · Gespinst Netz (3 Fäden × 2) · Glocke Glockenkontur · Membran Kreis mit Mittelpunkt · Schale Halbkreis · Kalimba drei Zungen · Gong Kreis in Kreis · Moder zerbröselnder Kreis · Jahresring konzentrische Ringe · Tropfen Tropfen · Zapfen Zapfen-Schuppen · Elmsfeuer Blitzzacke · Rhizom Wurzelverzweigung · Amöbe unregelmäßiger Blob · Glut Glutpunkt mit Strahlen · Unke Froschauge · Flechte Flechtenrosette · Balz Fell mit Stab.

## 2. Datenmodell (eine Tabelle, alles andere liest daraus)

```js
// neben ENG_OPTS/ENG_INFO (1665–1683); ENG_OPTS bleibt die kanonische Reihenfolge für ‹ ›, MIDI selStep, dice()
const FAM = [['luft', 'Luft', 'Wind, Atem, Stimmen'], ['faser', 'Faser', 'Saiten, Ranken, Bogen'], ['schlag', 'Schlag', 'Metall, Fell, Holz'],
  ['rieseln', 'Rieseln', 'Körner, Tropfen, Funken'], ['wesen', 'Wesen', 'Schwärme, Zellen, Glut']];
const ENG_META = {                       // fam, art (haelt|schlaegt|beides), tags für die Suche, glyph = Schlüssel in GLYPH
  neb: { fam: 'luft', art: 'haelt', tags: 'pad fläche drone analog', glyph: 'wellen' },
  hrz: { fam: 'faser', art: 'haelt', tags: 'bogen glas reibung streichen cello', glyph: 'bogen' },
  // … 26+ Einträge; fehlt ein Eintrag → fam 'wesen', art aus ENGINES[k].sustain (Rückfall, A)
};
```

- `ENG_OPTS` wird **nach Familien sortiert** (Luft → Faser → Schlag → Rieseln → Wesen, innerhalb: bestehende zuerst). Sicher, weil Werte Keys sind: `sanitize` prüft `d.opts.some(o => o[0] === v)` (V 1975), Patches/Exports speichern Keys (V 12189, 17505), Program Change lädt Presets, keine Engines (V 7939). Nur Index-relativ: `selStep` zur Laufzeit (V 6994) – Nachbarn werden dadurch klanglich verwandt (Plaits-Bänke).
- Nutzerzustand `store` (V 1603) unter `myzel.klang.v1`: `{ fav: ['hrz', …], recent: ['neb', 'sch', …] (max 8, global über alle Ziele), fam: 'alle' }`.
- `SEL('v.eng', …, { chips: 1 })` → `{ lib: 1 }` (V 1688–1689, 1868). `ctl()` bekommt einen Zweig `if (d.lib) return kqRow(id, opts)`; `d.opts` bleibt für `selStep`, `dice` (V 17571), `mxSrcText` (V 12812), `updLaneTabs` (V 17099) unverändert.
- Gestik `rgS` liegt nicht in `PD` (V 8785): die Bibliothek nimmt wahlweise `{ id }` oder `{ get, set }` wie `gkChips` (V 18032).

## 3. Kompakter Zustand – das Klang-Panel auf 360 × 740

Gemessen heute: Sheet 310 px, sichtbarer Body 252 px, 14 Chips = 160 px (V code-map §8, `klang-p360.png`). Neu: Sektion „Klangquelle“ ≈ 26 (Kopf) + 48 (Zeile) + 58 (Oktave/Tonstufe) = **132 px** (A) – der Kopf der Engine-Sektion und ihr erster Regler sind ohne Scrollen sichtbar.

```
┌───────────────────────────────────────────┐ 0
│ [◌ Nebel + Schale]   (▶)  (❄)  (● REC)    │ Kopfzeile 54 – Glyphe statt „Klang“-Label (≤400 px, V 64)
├───────────────────────────────────────────┤
│                                  HELL ↑   │
│            Spielfläche                    │
│                                DUNKEL ↓   │
│ D3  F3  G3  A3  C4  D4  F4  G4  A4  C5 D5 │
├───────────────────────────────────────────┤ 430
│ KLANG                    [Stille]   (✕)   │ sheet-head
├───────────────────────────────────────────┤
│ KLANGQUELLE         Was ein Finger spielt │ sec-h
│ ┌───┬───────────────────────────────┬───┐ │
│ │ ‹ │ ◌ Nebel · Luft                │ › │ │ kq-row 44 px, Name = Knopf „Bibliothek öffnen“
│ │   │ Schwebende Flächen aus verst… │   │ │
│ └───┴───────────────────────────────┴───┘ │
│ Oktave           ±0    Tonstufe        ±0 │
│ ────●──────────        ────●────────────  │
│ ◌ NEBEL   Schwebende Flächen aus verstim… │ Engine-Sektion (unverändert direkt darunter)
│ Welle   [Sinus][Dreieck][Säge][Rechteck]… │
│ Spread          35 %   Sub           40 % │ ← Makro A/B tragen ein kleines „A“/„B“
│ ───●───────────        ────●────────────  │
├───────────────────────────────────────────┤ 682 (sichtbarer Body endet; Rest scrollt)
│ Fil… 9,00 kHz  Echo 35 %  Hall 45 %  (🔇) │ quick
├───────────────────────────────────────────┤
│ Klang Effekte Puls Mixer Aufnahme Pres… │ tabs
└───────────────────────────────────────────┘ 740
```

Zeile im Detail (`.kq-row`, Höhe 44, Raster `44px 1fr 44px`):
- ‹ › = `button.kq-step` 44 × 44, `aria-label="Vorige Klangquelle" / "Nächste Klangquelle"`; schalten in `d.opts`-Reihenfolge, überspringen nicht erlaubte Quellen (Regen-Subset), am Ende Stopp statt Umlauf (wie `selStep(…, false)`, V 6994); jeder Schritt spielt die kurze Probe (§6).
- Name = `button.kq-name` (`aria-haspopup="dialog"`, `aria-expanded`), zwei Zeilen: `Glyphe Name · Familie` (13 px 500 `--hypha`) und Einzeiler (11 px `--dim`, `text-overflow: ellipsis`). `aria-label="Klangquelle für die Spielfläche: Nebel, Luft. Bibliothek öffnen"`.
- Ebene 2 (`v.layer`): Zustand „Aus“ zeigt `— Aus · keine zweite Ebene` als Name, ‹ › schalten „Aus“ mit durch; in der Bibliothek steht „Aus“ als erste Kachel nur für dieses Ziel.
- Zusätzliche Geste: langes Drücken auf den Namen (≥ 400 ms, keine Bewegung) = Probe hören, ohne zu öffnen (GarageBand-iPad-Idee, library-ui §7).
- Puls-Spuren: dieselbe Zeile (`small` entfällt – 44 px bleibt), eine Zeile passt unter den sticky Spurenkopf (V 208–211), das Überlappen der Chips (`puls-lane-p390.png`) entfällt. Spur-Tab zeigt Glyphe + Name (`updLaneTabs`, V 17093).

Puls-Spur auf 360 px (Ausschnitt):
```
│ SPUREN            Impulse verteilt auf Schritte │
│ ┌───────┐ ┌───────────┐ ┌───────────┐           │ .lanehead (sticky)
│ │ Ringe │ │ Spur 1    │ │ Spur 2    │           │
│ │  84   │ │ E(5,16)   │ │ E(7,12)   │           │
│ │  BPM  │ │ ◍ Membran │ │ ≋ Hauch   │           │
│ └───────┘ └───────────┘ └───────────┘           │
│ Spur spielt                             [●  ]   │
│ ┌───┬───────────────────────────────────┬───┐   │
│ │ ‹ │ ◍ Membran · Schlag                │ › │   │ 44 px statt 152 px Chips
│ └───┴───────────────────────────────────┴───┘   │
│ Schritte           16   Impulse            5    │
```

## 4. Die Bibliothek („klangquellen“)

### 4.1 Wo sie liegt
- **Hochformat / Handy:** `position: fixed; top: <Höhe .bar>; bottom: 0; left/right: 0; z-index: 20` – über Spielfläche, Sheet, Quick-Streifen und Tabs. Begründung: der Sheet-Body hat nur 252 px (V); die Probe (▶) ersetzt die Spielfläche während der Wahl.
- **≥ 900 px und Querformat ≤ 540 px hoch:** `position: absolute; inset: 0` **im Sheet** (Sheet ist dort eine Spalte von 440 px bzw. `min(420px, 52%)`, V 623, 635); `.sheet` bekommt `position: relative` (heute ohne `position`, V 104–109). Die Spielfläche bleibt spielbar – Grundsatz des Layouts (V Kommentar 1–4 im CSS).
- Muster: wie `.mxl` (Mixer-Erklärung: absolute Ebene mit sticky Kopf, 44-px-✕, V 1352–1358).
- Singleton: ein DOM-Knoten, `kqOpen(target)` setzt Titel, Ziel-Bus, Erlaubnis-Prädikat, Rückgabe-Fokus.

### 4.2 Aufbau auf 360 × 740 (Familie „Luft“ gefiltert)

```
┌───────────────────────────────────────────┐ 0
│ [◌ Nebel + Schale]   (▶)  (❄)  (● REC)    │ Kopfzeile bleibt (54)
├───────────────────────────────────────────┤ 54
│ klangquellen · Spielfläche          (✕)   │ .kq-head 48, sticky
│ ┌───────────────────────────────────────┐ │
│ │ ⌕  Suchen – Name, Familie, Stichwort  │ │ .kq-search 44 (input[type=search])
│ └───────────────────────────────────────┘ │
│ (★)(⟲)[Alle][Luft][Faser][Schlag][Riese…  │ .kq-fams 44, waagrecht scrollbar, Luft gewählt
├───────────────────────────────────────────┤ 190
│ LUFT · 7 · Wind, Atem, Stimmen            │ .kq-fh 28 (sticky unter der Familienreihe)
│ ◌ Nebel                  hält   ★    ▶    │ .kq-tile 56, aria-checked=true (Spore-Rand)
│   Schwebende Flächen aus verstimmten Os…  │
│ ≋ Hauch                  hält   ☆    ▶    │
│   Gefiltertes Rauschen – von Wind bis P…  │
│ ⋰ Obertöne               hält   ☆    ▶    │
│   Obertongesang – ein Brummen, aus dem …  │
│ ◡ Stimme                 hält   ☆    ▶    │
│   Vokalchor – die Fingerhöhe formt u, o…  │
│ ⎸ Halm                   hält   ★    ▶    │
│   Rohrblatt, Flöte, Flamme – Atem ist d…  │
│ ≀ Böe                    hält   ☆    ▶    │
│   Äolsharfe – Akkorde rasten ein, hänge…  │
│ ◞ Kehlchen               hält   ☆    ▶    │
│   Vogelkehle mit Schwelle – Silben und …  │
├───────────────────────────────────────────┤ 610
│ [⚄ Überrasch mich]            [ Fertig ]  │ .kq-foot 56 (Fertig = .btn.primary, Daumenzone)
└───────────────────────────────────────────┘ 740  (74 px Luft: 8. Kachel teilweise sichtbar bei „Alle“)
```
Rechnung: 54 + 48 + 44 + 44 + 28 + 7 × 56 + 56 = 666 px (A). Bei „Alle“ scrollt die Liste mit sticky Familienköpfen (26 Kacheln ≈ 1 600 px); die Familienreihe springt beim Tippen zum Kopf **und** filtert nicht – Entscheidung: **Familien-Chip = Filter** (einfacher für Screenreader: die Liste enthält dann nur die Familie), „Alle“ = Liste mit Köpfen.

Kachel-Anatomie (`.kq-tile`, Raster `40px 1fr auto 44px 44px`):
```
┌──────┬──────────────────────────────────┬───────┬──────┬──────┐
│      │ Harz                   FASER     │ hält  │  ☆   │  ▶   │ 56 px
│ Glyph│ Gestrichenes Glas, Schale, Stab… │       │ Fav  │ Hören│
└──────┴──────────────────────────────────┴───────┴──────┴──────┘
   40        1fr (zwei Zeilen, ellipsis)     auto    44     44
```
- Ganze Kachel = `button[role=radio]`; ★ und ▶ sind eigene 44-px-Knöpfe **außerhalb** des Radio-Knopfs (kein verschachtelter Button): DOM = `div.kq-tile > button.kq-pick + button.kq-fav + button.kq-hear`.
- Nicht erlaubte Quelle (Sporenregen: nur schlagende, `RG_S`, V 8772): `aria-disabled="true"`, Opazität .42 (wie `.ctl.inactive`, V 134), Grund im Kopf: „Der Regen schlägt an – gehaltene Quellen sind hier grau.“ Nicht verstecken (Elektron-Prinzip, library-ui §7).
- Ohne Worklet (judge-3 §5 Rückfall): Kachel bleibt wählbar, Zusatz im Einzeiler `· spielt als Schale` in `--rose`.
- Kosten: nur im Gerät-Panel/dev, nicht auf der Kachel (Musiker brauchen es nicht; `A.lite` zeigt ohnehin Underruns, V 18940).

### 4.3 Suche
- `input[type=search]` mit `enterkeyhint="search"`, `autocomplete="off"`; sucht in Name, Familie, Einzeiler, `tags` (z. B. „bass“, „glas“, „808“, „wind“); ab 1 Zeichen, diakritik-tolerant (`normalize('NFD')`); Treffer unter Kopf „n Treffer“, Familienfilter wird dabei ignoriert; leer → „Nichts gefunden – versuch ‚Bogen‘, ‚Fell‘ oder ‚Bass‘“.
- Autofokus **nur** bei `pointer: fine` (V 1600 `MOBILE`): auf dem Handy würde die Tastatur die Kacheln verdecken.
- Tastatur in der Liste: Buchstabe = Sprung zur nächsten Quelle mit diesem Anfangsbuchstaben (First-Letter-Navigation, zusätzlich zur Suche).

### 4.4 Favoriten, Zuletzt, Überrasch mich
- ★ auf der Kachel (`aria-pressed`), Chip „★“ in der Familienreihe zeigt die Favoriten (leer: „Tippe ★ auf einer Quelle – sie landet hier.“). OP-1-Slots sinngemäß: Favoriten sind global, nicht je Ziel.
- „⟲ Zuletzt“: die letzten 8 gewählten Quellen aller Ziele (auch Preset-Laden trägt `v.eng`/`v.layer` ein). Nice-to-have laut Recherche, kostet 10 Zeilen.
- „⚄ Überrasch mich“: wählt zufällig aus den **sichtbaren, erlaubten** Kacheln (ohne die aktuelle), übernimmt, spielt Probe, Toast „Zufall: Harz“. Nur die Quelle – Regler bleiben (Animoog-Z-Lehre). Zweite Stufe bleibt bei „Würfeln“ im Presets-Panel (`dice`, V 17571), dort könnte eine Option „nur Regler der Quelle“ (Prefix-Scope) dazukommen (P2).

### 4.5 Hören (Probe)
| Ziel | Aufruf (bestehende API, V 5013/5080) | Ton | Bus |
|---|---|---|---|
| Spielfläche | schlägt: `hit(k, now, f, 0.5, 0.75, {gate: .4, bus})`; hält: `playNote(k, now, f, 0.5, 0.7, {burst: true, gate: 1.2, bus})` | `f` = Grundton der Spielfläche (`N.base · 2^v.oct`, mittlere Oktave) | `stripIn('fin')` |
| Ebene 2 | wie oben, `f · ratio(v.layerInt)`, `vel · v.layerLvl` | | `stripIn('eb2')` |
| Spur i | `hit(k, now, laneNote(i).f, P[l+'bright'], P[l+'vol'], {gate: stepDur·0.9, bus})` – genau wie `seqTick` (V 5980) | | `stripIn('l'+i)` |
| Regen | `hit(k, …, {bus})` | | `stripIn('rgn')` |
- Langes Drücken auf die Kachel (≥ 350 ms ohne Bewegung > 8 px, `pointer`-Events, `touch-action: pan-y` bleibt) = gehaltene Probe: `playNote` ohne burst, senkrechtes Ziehen auf der Kachel = `v.setY` (Höhe hörbar), Loslassen = `v.release(1)`. ▶ = kurze Probe; auf Tastatur/Screenreader ist ▶ der einzige Weg (Enter/Space auf ▶).
- Gehaltene Quellen mit langsamem Einschwingen (Harz, Böe: 1–2 s laut judge-3 §6) bekommen `gate: 1.6` (Tabelle `ENG_META.hear = {gate}`; A).
- Budget: läuft durch `playNote` → `steal()`; Probe-Stimmen tragen `v.probe = true` und werden bei `kqClose()` mit `vFade` beendet (V 2139). Erster Tipp startet `initAudio()` (User-Geste), danach keine Sonderfälle.
- Auswahl + Probe beim Tippen: `setParam(id, k)` zuerst, dann Probe – so hört man bereits die Parameter des Patches (bei Harz z. B. den gewählten Körper).

### 4.6 Tastatur und Screenreader
| Element | Rolle / Verhalten |
|---|---|
| Layer | `role="dialog" aria-modal="true" aria-labelledby="kqTitle"`; Fokusfalle; `Esc` schließt; Fokus zurück auf den öffnenden `.kq-name` (Muster `mxLegend`, V 16769–16781) |
| Titel | `h2#kqTitle` „Klangquellen für die Spielfläche / zweite Ebene / Spur 3 / den Sporenregen“ |
| Familienreihe | `role="radiogroup" aria-label="Familie"`, Pfeile ←/→, roving tabindex (Code von `gkChips`, V 18032) |
| Liste | `role="radiogroup" aria-label="Klangquelle"`; Kacheln `role="radio" aria-checked`; ↑/↓ bewegen, `Home/End`, Buchstabe springt; Enter/Space wählt (+Probe), **schließt nicht** (Vergleichen); `Esc` oder „Fertig“ schließt |
| Kachel-Label | `aria-label="Harz, Faser, hält. Gestrichenes Glas, Schale, Stab oder Teich – der Druck des Fingers ist die Höhe. Favorit."` |
| ★ | `button aria-pressed aria-label="Harz als Favorit"` |
| ▶ | `button aria-label="Harz anhören"` |
| Live-Region | `aria-live="polite"` im Fuß: „Harz gewählt für Spur 2“ |
| Ziele | alle Knöpfe ≥ 44 × 44 px; Kachel 56 px; Chips der Familienreihe 44 px (`.kq-fams .chip { min-height: 44px }` – heute 34 px, V 157) |
| Reduced motion | kein Einblend-Slide (`prefers-reduced-motion`, Muster V 513) |

### 4.7 Desktop 1280 × 800 (Sheet-Spalte 440 px, V 635)

Links Spielfläche (bleibt spielbar), rechts die Spalte; die Bibliothek liegt **in** der Spalte, Suche mit Autofokus und Treffer „harz“:
```
┌──────────────────────────────────────────────────────────────────────┬─────────────────────────────────────┐
│ myzel  [◌ Nebel + Schale]            (▶) (❄) (◎) (● REC)              │                                     │
├──────────────────────────────────────────────────────────────────────┤ klangquellen · Spielfläche     (✕)  │
│                                                            HELL ↑    │ ┌─────────────────────────────────┐ │
│                                                                      │ │ ⌕ harz▏                         │ │
│                                                                      │ └─────────────────────────────────┘ │
│                                                                      │ (★)(⟲)[Alle][Luft][Faser][Schlag]…  │
│                                                                      │ 1 TREFFER                           │
│               Spielfläche – spielbar, während man wählt              │ ◠ Harz                hält  ☆   ▶   │
│                                                                      │   Gestrichenes Glas, Schale, Stab…  │
│                                                                      │ VERWANDT (Faser)                    │
│                                                                      │ ⟋ Sehne              beides ☆   ▶   │
│                                                                      │ ─ Saite              schlägt☆   ▶   │
│                                                          DUNKEL ↓    │ ∿ Ranke              beides ☆   ▶   │
│  D3    F3    G3    A3    C4    D4    F4    G4    A4    C5    D5      │                                     │
│                                                                      │ [⚄ Überrasch mich]       [ Fertig ] │
├──────────────────────────────────────────────────────────────────────┴─────────────────────────────────────┤
│ Filter 9,00 kHz        Echo 35 %        Hall 45 %                                                    (🔇)  │
├────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│   Klang      Effekte      Puls      Mixer      Aufnahme      Presets      Gerät                             │
└────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```
Ohne Bibliothek (kompakt) zeigt die Spalte das Klang-Panel wie auf dem Handy, nur höher: Quelle-Zeile, Oktave/Tonstufe, die Engine-Sektion vollständig (≤6 Regler in 2 Spalten des `.grid`, V 131), darunter Zweite Ebene mit ihrer eigenen Quelle-Zeile. Bei „Alle“ sind auf 800 px Höhe ≈ 9 Kacheln sichtbar (A: 800 − 54 − 60 − 48 − 44 − 44 − 56 ≈ 494 px / 56).

## 5. Die Engine-Sektion unter der Quelle

- Bleibt `section(name, ENG_INFO[k], grid(…))`, `refreshEngineUI` hängt sie weiter direkt unter „Klangquelle“ (V 17035–17043). Neu: Glyphe vor dem `h3`, Familienwort rechts im `sec-h p` vor dem Einzeiler bei ≥ 600 px, sonst nur der Einzeiler.
- Unter-Wahlen der Familien-Engines (Harz „Körper“ Glas/Schale/Stab/Zunge/Teich; Halm „Rohr“ Rohrblatt/Flöte/Flamme; Zapfen „Körper“; Sehne „Steg“ Flach/Jawari/Feder; Moder „Körper“) = `SEL … {chips: 1}` wie bisher, **eine Reihe ≤ 5 Chips, 44 px auf Touch** (Regel wie V 380/511 auf `.sec`). Erst ab 8 Optionen (Körner-Quellen: 13, V 1713) lohnt die Bibliothek – Körner-Quelle bekommt deshalb ebenfalls eine Quelle-Zeile mit eigener kleiner Liste (gleiche Komponente, `opts` = `PD['kor.src'].opts`, ohne Familien).
- Makro A/B: die zwei `MACRO[k]`-Regler (V 7050) tragen ein 10-px-Abzeichen „A“/„B“ in `--lumen` rechts vom Label – so sieht man, was ein Keyboard-Regler greift.
- „Gewaltig“-Hinweis: `ENG_META.rich` = ein Halbsatz („Stufe 3: zwei Bögen L/R“), als `.note` nur wenn `Q.rich` (V 2088).
- Spielhilfe-Texte „Halten: …“ / „Tippen und Wischen: …“ (V 17489–17491) und Gerät-Text (V 17749) werden aus `ENG_META.art` bzw. `VCOST1` generiert statt hart kodiert.

## 6. Kopfzeilen-Chip `#engChip`

- Inhalt: `Glyphe(v.eng) Name` + bei Ebene `+ Glyphe(v.layer) Name` („◌ Nebel + ◡ Schale“); ≤ 400 px entfällt das „Klang“-Label bereits (V 64) – die Glyphe trägt die Bedeutung.
- Klick: unverändert `openPanel('klang')` (V 18782). **Langes Drücken** (≥ 400 ms): `kqOpen({id: 'v.eng'})` direkt – der schnellste Wechsel ohne Panel.
- `aria-label="Klangquelle: Nebel, zweite Ebene Schale. Einstellungen öffnen"` (wie V 17047), Zusatz `title="Lange drücken: Klangquelle wechseln"`.
- Stufe-3-/Rückfall-Zustand: ohne Worklet erscheint hinter dem Namen ein kleines „·“ in `--rose` mit `title="spielt als Schale"`.

## 7. Dieselbe Komponente an allen Stellen

| Ziel | Heute (V) | Neu | Besonderheit |
|---|---|---|---|
| Spielfläche `v.eng` | 14 Chips, 160 px (17010) | `kqRow('v.eng')` | Standard |
| Ebene 2 `v.layer` | 15 Chips (`Aus`) | `kqRow('v.layer')` | „Aus“ als Zustand + erste Kachel; Probe mit Intervall/Anteil |
| Spuren `l0–3.eng` | 14 `small`-Chips unter sticky Kopf (puls-lane-p360.png) | `kqRow(p+'eng')` | Probe mit Spur-Note/-Gate/-Bus; ‹ › praktisch beim Live-Jam |
| Mixer-Fruchtkörper | dritte Kopie der Chips mit Prefix `mxd-` (16186) | `kqRow(id, {prefix: 'mxd-'})` | Bibliothek über `.mxd` (z-index > 14); Titel „… für Kanal Spur 2“ |
| Sporenregen `rgS` | 6 Chips `RG_S` in Gestik-Karte (18290) und Fruchtkörper „Regen“ (10973) | `kqRow({get, set}, {allow: k => !ENGINES[k].sustain, title: 'den Sporenregen'})` | `RG_S` wird aus `ENG_OPTS` + `allow` abgeleitet; `gkCheck` (8823) prüft gegen dieselbe Liste; `warmKS` bei `sai` bleibt (10628) |
| Rassel `rasS` | 3 Chips (10527, Validierung 8816) | **bleiben Chips** (3 Optionen, 44 px) | kein Bibliotheksfall |
| Presets | `pcard` mit Name/Tags/Text (17448) | Glyphe(n) der `v.eng` (+ `v.layer`) vor dem Namen; Recents werden beim Laden gepflegt | Optional (P2): Familien-Chips als Filter über den Klangwelten |

## 8. Migration – alte Presets und Patches laufen weiter

1. Keys bleiben (`neb … trp`), neue kommen dazu; `loadValues` setzt fehlende Params auf Defaults (V 12192) – alte Exporte (`version: 2`, V 17505) laden unverändert, Export-Version bleibt 2.
2. Umsortieren von `ENG_OPTS` ist sicher (§2). `LANE_DEF` (V 1860), `PRESETS` (V 17278), `RZ` (V 11481) referenzieren Keys.
3. Unbekannter Key (neuer Export in alter App, oder Reserve-Engine noch nicht gebaut): `sanitize` fällt still auf `neb`/`off` (V 1975). Neu: `loadValues` sammelt solche Fälle und zeigt **einen** Toast „Klangquelle „Rhizom“ gibt es hier nicht – Nebel gesetzt“ (A, 6 Zeilen).
4. `SEL … {chips:1}` → `{lib:1}` für `v.eng`, `v.layer`, `l*.eng`, `kor.src`; alle anderen `chips`-SELs unverändert. MIDI: `mtParam`/`selStep` lesen `PD[id].opts` (V 6990–6998) – kein Umbau; die Quelle-Zeile hört `bindCtl(id, …)` wie jeder Chip-Block.
5. `kcBindsUI`-Signatur enthält `P['v.eng']` (V 18538) – bleibt, weil Labels der Makros weiter von `v.eng` abhängen.
6. Favoriten/Zuletzt sind neu (`myzel.klang.v1`), fehlen sie: ★ leer, ⟲ leer – kein Fehlerpfad.
7. Tests, die Chips zählen (`qa-main.js:66`, `midi-tests/t-map-nks.js`, `motion-tests/gm-script.js`, code-map §11.10): auf `kq-row`/`ENG_OPTS.length` umstellen.

## 9. CSS/DOM-Skizze (bestehende Klassen und Variablen)

```html
<!-- Quelle-Zeile (ersetzt .chips für d.lib) – ein .ctl.wide wie bisher, damit .grid, data-pid (MIDI „Zuweisen“) und bindCtl gleich bleiben -->
<div class="ctl wide" data-pid="v.eng">
  <div class="lab" id="p-v-eng-l">Für die Spielfläche</div>
  <div class="kq-row" role="group" aria-labelledby="p-v-eng-l" id="p-v-eng">
    <button type="button" class="kq-step" aria-label="Vorige Klangquelle">‹</button>
    <button type="button" class="kq-name" aria-haspopup="dialog" aria-expanded="false"
            aria-label="Klangquelle für die Spielfläche: Nebel, Luft. Bibliothek öffnen">
      <svg class="kq-g" aria-hidden="true"><use href="#g-neb"/></svg>
      <span class="kq-n">Nebel <small>· Luft</small></span>
      <span class="kq-i">Schwebende Flächen aus verstimmten Oszillatoren</span>
    </button>
    <button type="button" class="kq-step" aria-label="Nächste Klangquelle">›</button>
  </div>
</div>

<!-- Bibliothek (Singleton, an #sheet bei ≥900px/landscape, sonst an body) -->
<div class="kq-lib" role="dialog" aria-modal="true" aria-labelledby="kqTitle" hidden>
  <div class="kq-head"><h2 id="kqTitle">klangquellen · Spielfläche</h2><button class="iconbtn" aria-label="Bibliothek schließen">✕</button></div>
  <label class="kq-search"><svg aria-hidden="true"/><input type="search" placeholder="Suchen – Name, Familie, Stichwort" aria-label="Klangquellen durchsuchen" autocomplete="off" enterkeyhint="search"></label>
  <div class="chips kq-fams" role="radiogroup" aria-label="Familie">
    <button class="chip" role="radio" data-fam="fav" aria-label="Favoriten">★</button>
    <button class="chip" role="radio" data-fam="recent" aria-label="Zuletzt">⟲</button>
    <button class="chip" role="radio" data-fam="alle" aria-checked="true">Alle</button>
    <button class="chip" role="radio" data-fam="luft">Luft</button> …
  </div>
  <div class="kq-list" role="radiogroup" aria-label="Klangquelle">
    <h3 class="kq-fh">Luft <small>· 7 · Wind, Atem, Stimmen</small></h3>
    <div class="kq-tile" data-k="neb">
      <button type="button" class="kq-pick" role="radio" aria-checked="true" aria-label="Nebel, Luft, hält. Schwebende Flächen aus verstimmten Oszillatoren. Favorit.">
        <svg class="kq-g" aria-hidden="true"><use href="#g-neb"/></svg>
        <b class="kq-n">Nebel</b><span class="kq-art">hält</span>
        <span class="kq-i">Schwebende Flächen aus verstimmten Oszillatoren</span>
      </button>
      <button type="button" class="kq-fav" aria-pressed="true" aria-label="Nebel als Favorit">★</button>
      <button type="button" class="kq-hear" aria-label="Nebel anhören">▶</button>
    </div> …
  </div>
  <div class="kq-foot"><button class="btn ghost">⚄ Überrasch mich</button><p class="kq-live" aria-live="polite"></p><button class="btn primary">Fertig</button></div>
</div>
```

```css
/* ---------- Klangquellen: Zeile + Bibliothek ---------- */
.kq-row { display: grid; grid-template-columns: 44px minmax(0, 1fr) 44px; align-items: stretch; min-height: 44px;
  border: 1px solid var(--line); border-radius: 12px; background: var(--bark-2); overflow: hidden; }
.kq-step { width: 44px; border: 0; background: none; color: var(--dim); font: 500 20px/1 var(--font-ui); }
.kq-step:disabled { opacity: .3; }
.kq-name { display: grid; grid-template-columns: 24px minmax(0, 1fr); grid-template-rows: auto auto; column-gap: 8px; align-items: center;
  min-width: 0; padding: 4px 8px; border: 0; border-left: 1px solid var(--line); border-right: 1px solid var(--line); background: none; text-align: left; }
.kq-g { width: 20px; height: 20px; grid-row: 1 / 3; color: var(--spore); }
.kq-n { font: 500 13px/1.2 var(--font-ui); color: var(--hypha); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.kq-n small { color: var(--dim); font-size: 11px; }
.kq-i { font: 400 11px/1.2 var(--font-ui); color: var(--dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.kq-row.off .kq-g { color: var(--dim); }

.sheet { position: relative; }                                  /* neu: Anker für die Bibliothek in der Spalte */
.kq-lib { position: fixed; top: var(--bar-h, 54px); right: 0; bottom: 0; left: 0; z-index: 20; display: flex; flex-direction: column;
  background: var(--bark); border-top: 1px solid var(--line); }
@media (min-width: 900px), (orientation: landscape) and (max-height: 540px) { .kq-lib { position: absolute; inset: 0; z-index: 14; border-top: 0; } }
.kq-head { display: flex; align-items: center; gap: 8px; padding: 6px var(--gut); border-bottom: 1px solid var(--line); }
.kq-head h2 { flex: 1; margin: 0; font: 400 18px/1.1 var(--font-display); letter-spacing: .02em; }
.kq-search { display: flex; align-items: center; gap: 8px; margin: 8px var(--gut) 0; }
.kq-search input { min-height: 44px; }                           /* input[type=text]-Optik (V 174) auch für type=search */
.kq-fams { flex: none; flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; padding: 8px var(--gut); gap: 6px; }
.kq-fams .chip { flex: none; min-height: 44px; min-width: 44px; }
.kq-list { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; touch-action: pan-y; padding: 0 var(--gut) 12px; }
.kq-fh { position: sticky; top: 0; z-index: 1; margin: 0; padding: 6px 0; background: var(--bark);
  font: 600 12px/1.2 var(--font-ui); letter-spacing: .1em; text-transform: uppercase; color: var(--spore); }
.kq-fh small { color: var(--dim); letter-spacing: 0; text-transform: none; font-weight: 400; }
.kq-tile { display: grid; grid-template-columns: minmax(0, 1fr) 44px 44px; min-height: 56px; border-bottom: 1px solid var(--line); }
.kq-pick { display: grid; grid-template-columns: 40px minmax(0, 1fr) auto; grid-template-rows: auto auto; column-gap: 6px; align-items: center;
  min-width: 0; padding: 6px 0; border: 0; background: none; text-align: left; color: var(--hypha); }
.kq-pick .kq-g { width: 24px; height: 24px; justify-self: center; color: var(--hypha); }
.kq-pick .kq-n { font-weight: 600; }
.kq-pick .kq-i { grid-column: 2 / 4; }
.kq-art { font: 500 10px/1 var(--font-num); letter-spacing: .06em; text-transform: uppercase; color: var(--dim); }
.kq-pick[aria-checked="true"] { color: var(--spore); } .kq-pick[aria-checked="true"] .kq-g { color: var(--spore); }
.kq-tile:has(.kq-pick[aria-checked="true"]) { box-shadow: inset 3px 0 0 var(--spore); }
.kq-pick[aria-disabled="true"] { opacity: .42; }
.kq-fav, .kq-hear { border: 0; background: none; color: var(--dim); font-size: 16px; }
.kq-fav[aria-pressed="true"] { color: var(--spore); }
.kq-hear:active, .kq-hear.playing { color: var(--lumen); }
.kq-foot { display: flex; align-items: center; gap: 8px; padding: 8px var(--gut) max(8px, env(safe-area-inset-bottom)); border-top: 1px solid var(--line); background: var(--bark); }
.kq-live { flex: 1; margin: 0; font-size: 12px; color: var(--dim); text-align: center; }
.kq-empty { padding: 24px 0; color: var(--dim); font-size: 13px; text-align: center; }
@media (prefers-reduced-motion: no-preference) { .kq-lib { animation: kq-in .18s ease-out; } @keyframes kq-in { from { opacity: 0; translate: 0 12px; } } }
```

```js
// Skizze der Logik (Namen final, Körper angedeutet)
function kqRow(idOrAcc, o = {}) { /* baut .kq-row; bindCtl(id, sync) oder acc.get(); ‹ › → kqStep(±1); Name → kqOpen(); long-press → kqHear() */ }
function kqStep(t, d) { /* nächste erlaubte Quelle in ENG_OPTS, ohne Umlauf; setParam/acc.set; kqHear(t, k) */ }
function kqOpen(t) { /* t = {id|get/set, title, allow, bus, f, gate, prefix, opener}; füllt Liste nach Filter; Fokus auf gewählte Kachel (fine pointer: Suche) */ }
function kqHear(t, k, held) { /* §4.5; markiert v.probe; .kq-hear.playing während der Probe */ }
function kqClose() { /* vFade aller v.probe; hidden; Fokus zurück auf t.opener */ }
const KQ = { fav: new Set(), recent: [], fam: 'alle', save() { store.set('myzel.klang.v1', JSON.stringify({ fav: [...this.fav], recent: this.recent, fam: this.fam })); } };
```

## 10. Maße und Belege

| Was | Wert | Status |
|---|---|---|
| Sheet/Body sichtbar 360×740 | 310 / 252 px | V (code-map §8) |
| Chip-Gruppe 14 Quellen heute | 160 px, 4 Reihen; 7× gerendert | V |
| Quelle-Zeile | 44 px | A (HIG/Material-Ziel) |
| Sektion „Klangquelle“ neu | ≈ 132 px statt 355 px | A |
| Kachel | 56 px; 7 Kacheln + Kopf auf 360×740 ohne Scrollen bei Familienfilter | A |
| Kachel-Knöpfe | 44 × 44 px (★, ▶, ‹, ›, Familien-Chips) | A, Regel wie V 380/511 |
| Sheet-Spalte Desktop / Querformat | 440 px / min(420px, 52 %) | V 635 / 623 |
| `.sheet` ohne `position` | muss `relative` werden | V 104–109 |
| Overlay-Muster | `.mxl` absolute inset 0, z 14, sticky Kopf | V 1352–1358 |
| Keys statt Indizes in Patches | `sanitize` prüft Mitgliedschaft | V 1975 |
| Program Change | lädt Presets, keine Engines | V 7939 |
| Probe-APIs | `hit`, `playNote`, `stripIn`, `vFade`, `laneNote`, `seqTick`-Gate | V 5080, 5013, 3126, 2139, 5943, 5980 |

## 11. Offene Punkte / Risiken

- **Schließen nach Wahl:** Entwurf lässt die Bibliothek offen (Vergleichen); wenn Tests zeigen, dass Nutzer nach dem Tipp „hängen“, Alternative: Tipp auf die bereits gewählte Kachel schließt. Beides mit `Fertig` kompatibel.
- **Probe auf Spielfläche vs. Mixer:** die Probe läuft durch den Ziel-Bus; bei stumm geschaltetem Kanal hört man nichts → Hinweis in `.kq-live` „Kanal ist stumm“ (liest `MX`-Mute, A).
- **Worklet-Rückfall:** Kacheln mit „spielt als …“ brauchen eine Quelle der Wahrheit (`ENGINES[k].fallback`), die erst mit dem Worklet-Modul entsteht (judge-3 §5).
- **Glyphen:** 31 kleine SVGs als `<symbol>`-Sprite (~4 KB, A); Stilregel: 1,6-px-Strich, keine Füllung, ein Motiv.
- **Reserve-Engines in der Liste:** erst anzeigen, wenn gebaut; `ENG_META`-Einträge ohne `ENGINES[k]` werden übersprungen (kein „Demnächst“ – das wäre ein leeres Versprechen).
- **Suche auf Deutsch:** Umlaute/ß über `normalize('NFD')`; Tags zweisprachig („bow bogen“), weil Sounddesigner oft Englisch suchen.
