# UI-Final – Klangquellen-Bibliothek: Urteil über A und B und die gewählte Fassung

Stand 2026-10-17. Geprüft gegen `research/library-ui.md` (§1 Ist, §3 Befunde, §5 Rang 1–3, §6 Zahlen), `research/code-map.md` §8/§11, Screenshots `shots/klang-p360.png`, `klang-layer-p360.png`, `klang-kor-p360.png`, `puls-lane-p360.png`, und den Code `/home/user/4claude/myzel/index.html` (git `03050e0`). **V** = im Code/Research/Screenshot geprüft (Zeile), **A** = Annahme/Entwurfsentscheidung.

## 0. Urteil

| Kriterium | A (Familienzeile + Mitgliederchips inline, Blatt im Sheet) | B (44-px-Quelle-Zeile ‹ › inline, Bibliothek als Overlay) | Punkt an |
|---|---|---|---|
| Kompaktheit 360 px | 94–144 px je Fundstelle (2 Reihen bei 5–7 Chips, A §4); Puls 70–94 px unter dem sticky Kopf, dem nur ≈ 120 px bleiben (V 252 − 132) | 44 px je Fundstelle; Sektion ≈ 132 statt 355 px (B §3); Puls eine Zeile | **B** |
| Klarheit | Familienzeile trägt zwei Zustände (angesehen = gefüllt, Familie der Wahl = Unterstrich) – zwei Hervorhebungen in einer Reihe; Chips ohne Satz | Eine Zeile: Glyphe, Name, Familie, Satz; ‹ › sind nur sinnvoll, weil `ENG_OPTS` nach Familie sortiert wird | **B** |
| Tempo beim Spielen | 1–2 Tipps ohne Overlay; ★-Familie inline = Favoriten mit einem Tipp | ‹ › = 1 Tipp zum Nachbarn (mit Probe); gezielt = Name → Kachel (→ Fertig); Overlay deckt auf dem Handy die Spielfläche ab (B §4.1) | **A** |
| Auffindbarkeit 26+ | Familien bei jedem Öffnen sichtbar; Blatt mit Suche/★/Zuletzt | Satz und Familie inline; Stepping mit Probe (Plaits/OP-1); Bibliothek mit Suche/★/⟲ | gleich |
| Konsistenz (Chips überall) | Chips bleiben, `#p-v-eng` bleibt Radiogroup | neues Widget; Unter-Wahlen und Familienreihe bleiben Chips | **A** |
| Barrierefreiheit | 21 versteckte Radios je Gruppe, Pfeiltasten müssen Familien nachziehen; Blatt ohne `aria-modal` | `role=group` mit 3 Knöpfen; Dialog modal mit Fokusfalle; aber 2 Tab-Stopps je Kachel (52) | B, mit A's Tasten `f`/`h` |
| Umsetzungsrisiko | `ctl()`-Zweig mit `hidden`-Chips, Breite der Familienzeile auf 360 px ungemessen (A §13.1), Zweispalten-Desktop offen (A §13.5) | 7 Fundstellen auf ein Widget, Tests zählen Chips (B §8.7), Overlay über Tabs/Mixer-`.mxd` mit z-index-Pflege | gleich |

**Entscheidung: B ist die Basis** (Quelle-Zeile + eine Bibliothek), weil der Auftrag „eine lange Liste nimmt zu viel Platz“ das Platzproblem an erste Stelle setzt, die Recherche für > 20 Klänge keine andere Konvergenz kennt (library-ui §3, §5 Rang 1) und nur B die Puls-Spur und den Mixer-Fruchtkörper wirklich löst. **Aus A übernommen** (holt die beiden A-Punkte zurück, ohne B's Kompaktheit zu opfern):

1. **Bibliothek im Sheet statt über allem** – das Sheet wächst wie beim Mixer auf `max(58%, 100% − 132px)` (V 645), die Spielfläche bleibt ≈ 130 px hoch spielbar: die Bibliothek wird zur **Palette** – einmal öffnen (Langdruck auf den Kopfzeilen-Chip), offen lassen, Kacheln tippen und sofort auf dem Feld spielen. Das ersetzt A's Inline-Favoriten beim Auftritt.
2. **Bibliothek öffnet auf der Familie der gewählten Quelle** (nicht auf „Alle“): die Geschwister sind sofort sichtbar, 7 Kacheln passen ohne Scrollen.
3. **Familien von A** (Luft, Dunst, Holz, Erz, Erde – eine Achse „Welt/Material“, Spielweise getrennt als Wort). B's „Schlag“ ist eine Spielweise und kollidiert mit dem Kachelwort „schlägt“ (Tropfen schlägt, liegt aber in „Rieseln“).
4. **`[⚄]` inline** in der Sektionskopfzeile (Überrasch mich ohne Bibliothek) mit Rückgängig-Toast (Toast-Action existiert, V 18819).
5. **Kosten-Punkte**, **Höhe-Wort**, **Fallback-Zeile** auf der Kachel (Sounddesigner-Nutzen, je ≤ 20 Zeichen).
6. **Tastaturmodell**: ★ und ▶ sind keine Tab-Stopps je Kachel; `f`/`h` auf der fokussierten Kachel, Screenreader erreichen die Knöpfe über ihre Rolle.
7. **Migrationsregeln** `ENG_ALIAS`, Toast bei unbekanntem Key, `RG_S` abgeleitet.

**Aus B verworfen:** Overlay `position: fixed` über Tabs und Quick-Streifen (Handy); Familien als Mischachse; „Zuletzt“ nur als Chip ohne Reihenfolge-Regel (jetzt: 6, über alle Fundstellen, ohne die gewählte). **Aus A verworfen:** Familienfarben (`--fam-*`) – 9 Kanalfarben sind vergeben (V 12261–12266), Kontrast ungeprüft (A §13.2); Identität = Glyphe + Name + Familienwort. Zweispaltiger Desktop ≥ 1100 px → P2.

## 1. Familien und Quellen

Primärachse **Welt** (Material/Mechanik); **Spielweise** (`hält` / `schlägt` / `beides`) als Wort auf der Kachel und im aria-label, weil sie das Verhalten der Spielfläche ändert (`triggerPerc` nur für `!sustain`, V 6073). Namen kollidieren mit keinem Engine-, Gestik- oder Mixer-Wort; „Erde“ statt Boden/Grund (Mixergruppe `grund` 12258, „Boden = aus“ 16738, V). Das Wort „Familie“ erscheint nur in aria-labels.

| Familie | Untertitel | Bestehend | Neu (Kern 12 = Mehrheit der Judges 1–3) | Reserve (eine Stimme) |
|---|---|---|---|---|
| **Luft** | Atem, Wind, Stimmen, Funken | Hauch, Obertöne, Stimme | Halm (hlm), Böe (boe), Kehlchen (khl), Elmsfeuer (elm) | – |
| **Dunst** | Wolken aus Teilchen und Zufall | Nebel, Körner, Schwarm | Amöbe (amo) | Flechte (fle) |
| **Holz** | Saiten, Stäbe, Bogen | Saite | Sehne (shn), Harz (hrz), Zapfen (zpf), Ranke (rnk) | Jahresring (jrg) |
| **Erz** | Metall, das nachklingt | Glocke, Schale, Gong, Kalimba | Gespinst (gsp) | – |
| **Erde** | Felle, Tiefe, Fäulnis, Wasser | Tiefe, Membran, Tropfen | Moder (mdr), Glut (glt) | Rhizom (rhz), Unke (unk), Balz (blz) |

7 / 4 / 5 / 5 / 5 = **26**; mit Reserven 31; Obergrenze je Familie 8 (A). Abweichung von A: Ranke liegt in Holz (Massen-Ring = Saitenverwandter, B's Faser-Logik), nicht in Dunst. Reserven erscheinen erst, wenn gebaut (`ENG_META`-Eintrag ohne `ENGINES[k]` wird übersprungen – kein „Demnächst“).

Spielweise neu: hält – Halm, Böe, Kehlchen, Harz, Amöbe, Glut, Unke, Flechte, Balz · schlägt – Moder, Gespinst, Jahresring, Rhizom · beides – Sehne, Ranke, Zapfen, Elmsfeuer (`sustain: true` mit kräftigem Burst, A; Wort aus `ENG_META.art`).

Satz je Quelle (`ENG_INFO`, **≤ 52 Zeichen** – eine Zeile in der 440-px-Spalte, Ellipse in der Zeile auf 360 px; bestehende bleiben, V 1668–1683) und Höhe-Wort (`ENG_META.hoehe`, erscheint als „Höhe: …“ in der Engine-Sektion):

| Key | Satz | Höhe |
|---|---|---|
| hlm | Rohrblatt, Flöte, Flamme – der Atem ist die Höhe | Atemdruck |
| boe | Äolsharfe – Saiten rasten im Wind ein und hängen nach | Windstärke |
| khl | Vogelkehle – zwei Lippen, die ab einer Schwelle singen | Lippenspannung |
| elm | Brummen, Knistern, Lichtbogen – der Zap im Puls | Spannung |
| amo | Bass aus Zufall – jede Welle anders, der Ton bleibt | Unruhe |
| shn | Lebende Saite – Handkante, Flageolett, E-Bow, Steg | Anschlagort |
| hrz | Gestrichenes Glas, Schale, Stab – Druck ist Höhe | Bogendruck |
| zpf | Kratzen, das zum Ton wird – Rhythmus unter dem Finger | Kratzrate |
| rnk | Ein Ring aus Massen, den der Finger anstößt | Hammerbreite |
| gsp | Ein Netz aus Saiten, das Finger und Puls teilen | Kopplung |
| mdr | Kompostglocke – Glanz zerfällt zu Knistern und Brummen | Verdauung |
| glt | Gestimmte Rückkopplung, die nachglüht | Gewinn |
| jrg | Holzstab – wo du triffst, bestimmt den Klang | Treffpunkt |
| rhz | Ein Schlag läuft durch die Skala – Lawinen im Wurzelnetz | Ausbreitung |
| unk | Zuhörender Froschchor – die Töne wechseln sich ab | Geduld |
| fle | Atmende Fläche – ein Pilz, den alle Finger teilen | Atem |
| blz | Reibtrommel und Daxophon – die Hand formt die Stimme | Handdruck |

Glyphen: 16–24 px Strich-SVG, `currentColor`, Strich 1,6, keine Füllung, ein Motiv je Quelle, als `<symbol>`-Sprite (≈ 4 KB, A). Motive wie in B §1 (Nebel Wellen · Körner Punktwolke · Hauch auslaufende Striche · Obertöne aufsteigende Punkte · Stimme offener Mund · Schwarm Punktwirbel · Tiefe Fallpfeil · Halm Halm mit Knoten · Böe Saiten im Wind · Kehlchen Vogelkopf · Elmsfeuer Blitzzacke · Amöbe Blob · Saite Linie mit Zupfpunkt · Sehne Linie mit Handbogen · Harz Bogen über Kreis · Zapfen Schuppen · Ranke Spirale · Glocke · Schale Halbkreis · Gong Kreis in Kreis · Kalimba drei Zungen · Gespinst Netz · Tiefe · Membran Kreis mit Punkt · Tropfen · Moder zerbröselnder Kreis · Glut Glutpunkt mit Strahlen · Reserven s. B §1).

## 2. Datenmodell (Ergänzung, kein Umbau)

```js
const FAM = [['luft','Luft','Atem, Wind, Stimmen, Funken'], ['dunst','Dunst','Wolken aus Teilchen und Zufall'],
  ['holz','Holz','Saiten, Stäbe, Bogen'], ['erz','Erz','Metall, das nachklingt'], ['erde','Erde','Felle, Tiefe, Fäulnis, Wasser']];
// ENG_OPTS bleibt die eine flache Ordnung (‹ ›, MIDI selStep V 6994, Pfeiltasten, dice V 17571, mxSrcText V 12812) – neu sortiert
// nach Familie, innerhalb gehalten vor geschlagen, bestehende vor neuen. Werte = Keys, daher sicher (sanitize prüft Keys, V 1975).
const ENG_OPTS = [['hau','Hauch'],['obt','Obertöne'],['stm','Stimme'],['hlm','Halm'],['boe','Böe'],['khl','Kehlchen'],['elm','Elmsfeuer'],
  ['neb','Nebel'],['kor','Körner'],['swm','Schwarm'],['amo','Amöbe'],
  ['hrz','Harz'],['shn','Sehne'],['zpf','Zapfen'],['rnk','Ranke'],['sai','Saite'],
  ['glo','Glocke'],['sch','Schale'],['gng','Gong'],['klb','Kalimba'],['gsp','Gespinst'],
  ['tie','Tiefe'],['glt','Glut'],['mem','Membran'],['trp','Tropfen'],['mdr','Moder']];
const ENG_META = {   // fam · art (haelt|schlaegt|beides) · tags (Suche, zweisprachig) · hoehe · glyph · regen (0 = nie im Sporenregen)
  hrz: { fam: 'holz', art: 'haelt', tags: 'bogen bow glas streicher reibung cello waterphone', hoehe: 'Bogendruck', glyph: 'hrz', hear: { gate: 1.6 } },
  mdr: { fam: 'erde', art: 'schlaegt', tags: 'perkussion kompost knistern umgekehrt reverse', hoehe: 'Verdauung', glyph: 'mdr' },
  // … alle 26 (+ Reserven); fehlt ein Eintrag → fam 'dunst', art aus ENGINES[k].sustain (Rückfall, A)
};
// Worklet-Rückfall lebt bei der Engine, nicht in der UI: ENGINES[k].needs = 'worklet', ENGINES[k].fallback = 'sch' (judge-3 §5);
// A.workletOK entscheidet, playNote leitet um – der Key bleibt im Patch, Patches reisen verlustfrei.
const RG_S = ENG_OPTS.filter(([k]) => !ENGINES[k].sustain && ENG_META[k].regen !== 0);   // statt hart kodiert (V 8772)
// Nutzerzustand (Gerät, nicht Patch, nicht Export): store (V 1603)
// myzel.klang.v1 = { fav: ['hrz', …], recent: ['hrz','neb', … ≤ 6], fam: 'auto' }
```

- `SEL('v.eng'|'v.layer'|'l0–3.eng', …, { chips: 1 })` → `{ lib: 1 }` (Spuren ohne `small`); `ctl()` erhält `if (d.lib) return kqRow(id, opts)` neben dem `d.chips`-Zweig (V 12067). `d.opts` bleibt für `selStep`, `dice`, `mxSrcText`, `updLaneTabs` (V 17099). Alle übrigen `chips`-SELs (Welle, Körper, Rohr, Steg …) bleiben Chips.
- Gestik `rgS` liegt nicht in `PD` (V 8785): `kqRow({ get, set }, …)` wie `gkChips(label, opts, get, set)` (V 18032).
- `Q.cost[k]` (V 2088/5015) liefert die Kosten-Punkte; `VBUDGET` den Stimmen-Hinweis.

## 3. Inline: die Quelle-Zeile (alle Fundstellen)

### 3.1 Klang-Panel, 360×740 (Standard beim Öffnen)

```
360 px ──────────────────────────────────────────┐
│ [◌ Nebel + ◡ Schale]     ▶   ❄   ● REC         │  bar 54 – Glyphen im Kopfzeilen-Chip (§6)
│   D3  F3  G3  A3  C4  D4  F4  G4  A4  C5  D5   │  Spielfläche
├─────────────────────────────────────────────────┤  Sheet 310, Body sichtbar 252 (V code-map §8)
│ KLANG                           [Stille]  [✕]  │  sheet-head
│ KLANGQUELLE                              [⚄]   │  sec-h 26 – Untertitel „Was ein Finger spielt“ → aria-label
│ ┌───┬─────────────────────────────────────┬───┐ │
│ │ ‹ │ ◌ Nebel · Dunst                     │ › │ │  kq-row 44: Name = Knopf „Bibliothek öffnen“
│ │   │ Schwebende Flächen aus verstimmt…   │   │ │
│ └───┴─────────────────────────────────────┴───┘ │
│ Oktave         ±0    Tonstufe          ±0       │  58
│ ◌ NEBEL     Schwebende Flächen aus verstimmt…   │  Engine-Sektion direkt darunter (§6) – Kopf + 1. Regler sichtbar
│ Welle [Sinus][Dreieck][Säge][Rechteck]…         │
├─────────────────────────────────────────────────┤  ≈ 252 px
```

Sektion „Klangquelle“ ≈ 26 + 48 + 58 = **132 px** statt 355 px (A, B §3). `[⚄]` ist ein 44×44-Iconknopf in der `sec-h` (`.iconbtn.sm`, negatives Margin, Kopfzeile bleibt 28 px hoch; A §12).

Zeile `.kq-row` (Raster `44px minmax(0,1fr) 44px`, 44 px, `border 1px --line`, Radius 12, `--bark-2`):
- `‹ ›` = `button.kq-step`, `aria-label="Vorige/Nächste Klangquelle"`; schreiten in `ENG_OPTS`-Ordnung (= `selStep(id, ±1, false)`, V 6994: Stopp am Ende, kein Umlauf; `disabled` am Rand), überspringen nicht erlaubte Quellen (Regen-Subset); jeder Schritt spielt die kurze Probe (§4.6) – **nicht**, solange eine Stimme der Fundstelle gehalten wird (A: Auftritt stören vermeiden).
- Name = `button.kq-name` (`aria-haspopup="dialog"`, `aria-expanded`), zwei Zeilen: `Glyphe Name · Familie` (13 px 500 `--hypha`) und Satz (11 px `--dim`, Ellipse). `aria-label="Klangquelle für die Spielfläche: Nebel, Dunst, hält. Bibliothek öffnen"`.
- Langdruck ≥ 400 ms ohne Bewegung > 8 px auf dem Namen = gehaltene Probe ohne Öffnen (`touch-action: pan-y` bleibt; A §13.3 messen).
- `[⚄]` Überrasch mich: `remember()`, wählt eine erlaubte Quelle ≠ aktuell, bevorzugt nie gespielte (nicht in `recent`), setzt **nur** die Quelle (Regler bleiben – Animoog-Z-Lehre, library-ui §7); Toast „Überraschung: Harz – gestrichenes Glas … [Rückgängig]“ (`toast(msg, ms, action)`, V 18819). Der Würfel im Presets-Panel (`dice`, V 17571) bleibt das Alles-Zufall.

### 3.2 Die anderen Fundstellen

| Fundstelle | Heute (V) | Neu | Besonderheit |
|---|---|---|---|
| Spielfläche `v.eng` | 14 Chips, 160 px (17010) | `kqRow('v.eng')` + `[⚄]` | Standard |
| Ebene 2 `v.layer` | 15 Chips mit „Aus“ (`klang-layer-p360.png`) | `kqRow('v.layer')` | „Aus“ = Zustand der Zeile (`— Aus · keine zweite Ebene`, Glyphe grau), ‹ › schalten „Aus“ mit durch; in der Bibliothek erste Kachel nur für dieses Ziel; Probe mit `v.layerInt`/`v.layerLvl` |
| Spuren `l0–3.eng` | 14 `small`-Chips, 114–152 px, teils unter dem sticky Kopf (`puls-lane-p360.png`) | `kqRow(p+'eng')` 44 px | passt unter den sticky `.lanehead` (V 208–211); Spur-Tab zeigt Glyphe + Name (`updLaneTabs`, V 17093); Probe = `laneNote(i)`, Gate wie `seqTick` (V 5980), Bus `stripIn('l'+i)` |
| Mixer-Fruchtkörper `mxd-` | dritte Chip-Kopie (16186) | `kqRow(id, { prefix: 'mxd-' })` | Bibliothek liegt im Sheet **über** `.mxd` (z-index, §7); Titel „… für Kanal Spur 2“; `mxSrcText` liest weiter `ENG_NAME` (V 12812) |
| Sporenregen `rgS` | 6 Chips `RG_S` in Gestik-Karte (18290) und Fruchtkörper „Regen“ (10973) | `kqRow({get, set}, { allow: k => !ENGINES[k].sustain && ENG_META[k].regen !== 0, title: 'den Sporenregen' })` | gehaltene Quellen in der Bibliothek **grau mit Grund**, nicht versteckt (Elektron, library-ui §7); `gkCheck` (V 8823) prüft gegen das abgeleitete `RG_S`; `warmKS()` bei `sai` bleibt (V 18290) |
| Rassel `rasS` | 3 Chips (10527, 8816) | **bleiben Chips** | kein Bibliotheksfall (+ Moder, wenn geprüft, A) |
| Körner-Quelle `kor.src` | 13 Chips, 160 px (`klang-kor-p360.png`) | `kqRow('kor.src', { fams: false })` (P2) | dieselbe Komponente ohne Familien/★; Liste = `PD['kor.src'].opts` |
| Presets | `pcard` (17448) | Glyphe(n) von `v.eng` (+ `v.layer`) vor dem Namen | optional (P2): Kachel nennt bis zu zwei Presets, die die Quelle nutzen (aus `PRESETS` gerechnet) |

Unter-Wahlen der neuen Engines (Harz „Körper“ ≤ 5, Halm „Rohr“ 3, Sehne „Steg“ 3, Zapfen/Moder „Körper“) bleiben `SEL {chips:1}` als **erste Chipzeile der Engine-Sektion**, 44 px bei `pointer: coarse` (Regel wie V 380/511); erst ab ~8 Optionen lohnt eine Liste.

## 4. Die Bibliothek (`.kq-lib`, Singleton)

### 4.1 Lage

- **Handy (Hochformat):** ein Element im `#sheet` als Geschwister von `.sheet-head/.sheet-body`, `position: absolute; inset: 0` (`.sheet` bekommt `position: relative`, heute ohne, V 104–109). `sheet.dataset.lib = site` lässt das Sheet wie beim Mixer wachsen: `height: max(58%, calc(100% − 132px))` (V 645; ≤ 780 px Höhe 118 px, V 647) und blendet den Quick-Streifen aus (Muster `#app:has(#sheet[data-panel="mix"]) .quick`, V 649). Die Spielfläche bleibt ≈ 130 px hoch spielbar – man probiert die neue Quelle mit dem Finger, nicht nur per ▶.
- **≥ 900 px und Querformat ≤ 540 px hoch:** dasselbe Element, Sheet ist dort ohnehin eine Spalte (440 px, V 635; `min(420px, 52%)`, V 623) – die Spielfläche bleibt vollständig. Zweispalten-Variante (Bibliothek links neben dem Panel, Engine-Sektion baut live um; A §6.2) = P2, erst nach Messung ≥ 1100 px.
- z-index im Sheet über `.mxd` (Mixer-Fruchtkörper, V 1078) und `.mxl` (14, V 1352) → 20.
- `kqOpen(target)` setzt Titel, Ziel-Bus, Erlaubnis-Prädikat, Startfamilie, Rückgabe-Fokus; `kqClose()` beendet Probe-Stimmen (`vFade`, V 2133), setzt `dataset.lib` zurück, gibt den Fokus an den Öffner.

### 4.2 Aufbau 360×740 (geöffnet aus der Spielfläche bei Nebel → Familie Dunst vorgewählt)

```
360 px ──────────────────────────────────────────┐ 0
│ [◌ Nebel + ◡ Schale]     ▶   ❄   ● REC         │ bar 54
│   D3  F3  G3  A3  C4  D4  F4  G4  A4            │ Spielfläche ≈ 130, spielbar
├─────────────────────────────────────────────────┤ Sheet ≈ 608 (100 % − 132)
│ [‹]  Klangquelle · Spielfläche        [Fertig]  │ kq-head 48, sticky
│ [⌕  Suchen – Name, Familie, Stichwort        ]  │ kq-search 44 (type=search, 16 px)
│ (★)(⟲)[Alle][Luft][Dunst][Holz][Erz][Erde]      │ kq-fams 44, waagrecht scrollbar, Dunst gewählt
├─────────────────────────────────────────────────┤
│ DUNST · 4 · Wolken aus Teilchen und Zufall      │ kq-fh 28 sticky
│ ◌ Nebel                 hält   ●○○   ★    ▶     │ kq-tile 56, aria-checked (Spore-Kante links)
│   Schwebende Flächen aus verstimmten Osz…       │
│ ⁘ Körner                hält   ●●○   ☆    ▶     │
│   Granulare Wolken aus winzigen Klangkör…       │
│ ⋇ Schwarm               hält   ●●○   ☆    ▶     │
│   Fremdartiger Insektenschwarm – die Fin…       │
│ ◍ Amöbe                 hält   ●○○   ☆    ▶     │
│   Bass aus Zufall – jede Welle anders, d…       │
│                                                 │ (bei „Alle“: 26 Kacheln ≈ 1 600 px mit sticky Köpfen)
├─────────────────────────────────────────────────┤
│ [⚄ Überrasch mich]        26 Quellen · 3 ★      │ kq-foot 48 (safe-area), Live-Region
└─────────────────────────────────────────────────┘ 740
```

Rechnung: 608 − 48 − 44 − 44 − 48 = 424 px Liste → 7 Kacheln à 56 px sichtbar (A) – jede Familie passt ohne Scrollen.

Kachel `.kq-tile` (Raster `minmax(0,1fr) 44px 44px`; innen `40px 1fr auto`):
- Ganze Kachel = `button.kq-pick[role=radio]`; ★ und ▶ sind eigene 44-px-Knöpfe **neben**, nicht im Radio (kein verschachtelter Button).
- Inhalt: Glyphe 24 px · Name 600 · Spielweise-Wort (10 px `--font-num`, `--dim`) · Kosten-Punkte `●○○/●●○/●●●` = `Q.cost[k]` ≤ 0,5 / ≤ 1,0 / > 1,0 (`title`/aria: „Kosten 1,05 – etwa 13 Stimmen auf diesem Gerät“ = `floor(VBUDGET / Q.cost[k])`, Muster Gerät-Text V 17747) · Satz (12 px, 2 Zeilen clamp; 1 Zeile ≥ 900 px).
- Gewählt: `aria-checked="true"`, `--spore`-Text und 3-px-Kante links (`:has()`-Regel, Fallback Klasse).
- Nicht erlaubt (Regen: gehaltene): `aria-disabled="true"`, Opazität .42 (wie `.ctl.inactive`, V 134); Grund im Gruppenkopf: „Der Regen schlägt an – gehaltene Quellen sind hier grau.“
- Ohne Worklet (`!A.workletOK`): Zusatz hinter dem Satz `· ⌁ spielt als Schale` in `--rose`; wählbar bleibt sie. Quelle der Wahrheit = `ENGINES[k].fallback`.
- Worklet-Erstladen beim ersten Hören/Wählen: Glyphe pulsiert bis das Modul steht (≤ 300 ms, A; auf Mittelklasse-Android messen).

### 4.3 Familienreihe

`(★)(⟲)[Alle][Luft][Dunst][Holz][Erz][Erde]` – Chips (`.chips.kq-fams`, nowrap, `overflow-x: auto`, 44 px, rechts 24-px-Maske als Scrollhinweis; `role="radiogroup" aria-label="Familie"`). **Familien-Chip = Filter** (Liste enthält nur die Familie – einfach für Screenreader); „Alle“ = alles mit sticky Gruppenköpfen (★ Favoriten, Zuletzt, dann 5 Familien). Beim Öffnen: immer die Familie der gewählten Quelle (auch wenn sie Favorit ist, A), gewählte Kachel im Blick und fokussiert. Bei Ebene 2 „Aus“: Familie von `v.eng`. Die zuletzt angesehene Familie wird **nicht** gemerkt (`fam: 'auto'`) – die Ansicht folgt der Auswahl, nie umgekehrt.

### 4.4 Suche

`input[type=search]`, 16 px (kein iOS-Zoom), `enterkeyhint="search"`, `autocomplete="off"`; sucht ab 1 Zeichen in Name, Familie, Satz, `tags` (zweisprachig: „bow bogen“, „808“, „glas“), Spielweise-Wörter; `normalize('NFD')` (ö/oe, ß); Familienfilter während der Suche aus, Kopf „n Treffer“; leer: „Nichts gefunden – versuch ‚Bogen‘, ‚Fell‘ oder ‚Bass‘ · [⚄]“. Autofokus **nur** bei `pointer: fine` (`MOBILE`, V 1600) – auf dem Handy verdeckt die Tastatur die Kacheln. Nutzen ab 26 Quellen klein, ab 40 nötig (library-ui §3); Kosten ≈ 20 Zeilen.

### 4.5 Favoriten, Zuletzt, Überrasch mich

- ★ `aria-pressed`, global (nicht je Ziel), Reihenfolge = Sternzeitpunkt; Chip ★ leer: „Tippe ★ auf einer Quelle – sie landet hier.“
- ⟲ Zuletzt: die 6 zuletzt **gewählten** Quellen über alle Fundstellen, ohne Duplikate, ohne die gerade gewählte; gepflegt in `setParam` für die 6 Engine-Ids, `gkSet('rgS')` und beim Preset-Laden. Hören trägt nichts ein.
- ⚄ im Fuß: zufällig aus den **sichtbaren, erlaubten** Kacheln (ohne die aktuelle), übernimmt, spielt Probe, Live-Region „Zufall: Harz“.

### 4.6 Hören (Probe) – vorhandene APIs

| Geste | Verhalten | Aufruf |
|---|---|---|
| Tipp auf Kachel | `setParam` zuerst (man hört die Patch-Regler, z. B. Harz-Körper), dann kurze Probe; Bibliothek bleibt offen (Vergleichen, Logic „Replace“) | schlägt: `hit(k, now, f, 0.5, 0.75, {gate: .4, bus})`; hält: `playNote(k, now, f, 0.5, 0.7, {burst: true, gate: ENG_META[k].hear?.gate ?? 1.2, bus})` (V 5080, 5013) |
| ▶ (Tipp) | kurze Probe ohne Wahl | wie oben, kein `setParam`, kein `remember()` |
| Langdruck ≥ 350 ms auf Kachel oder ▶ | gehaltene Probe bis Loslassen; senkrechtes Ziehen = `v.setY(y)` (Höhe hörbar); `v.release(1)` bei pointerup/-cancel; geschlagen: ein Schlag, beim Halten Wirbel 1/8 (A) | `playNote` ohne burst |
| Tastatur: Leertaste/Enter auf Kachel | wählen + Probe; Shift+Leertaste = 1,2 s Halten; `h` = Probe ohne Wahl | |

- `f`: Spielfläche `N.notes[mid].f` (mittlere Skalenstufe), Ebene 2 `f · ratio(v.layerInt)`, `vel · v.layerLvl`; Spur `laneNote(i).f`, `P[l+'bright']`, `P[l+'vol']`, Gate `stepDur · 0.9` wie `seqTick` (V 5943, 5980); Regen `hit(k, …)`.
- Bus = `stripIn('fin'|'eb2'|'l'+i|'rgn')` (V 3126) – man hört durch Mixer und Effekte des Ziels; stummer Kanal → Live-Region „Kanal ist stumm“ (liest `MX`-Mute, A).
- Budget: `playNote` → `steal()` (V 5016); Probe-Stimmen tragen `v.probe = true`, höchstens eine zugleich (vorige `vFade`, V 2133), alle bei `kqClose()`/`panic()` beendet. Hören ändert nichts am Patch (`UI.preset` bleibt). Saite/Sehne: `ksBuffer` erste Saite synchron (V 4667), `warmKS()` erst nach Wahl.
- Erster Tipp startet `initAudio()` (User-Geste) – danach keine Sonderfälle.

### 4.7 Schließen

`[Fertig]` (`.btn.primary` im Kopf rechts; der Fuß trägt ⚄ und die Live-Region, A), `[‹]`, `Esc`, Wischen nach unten auf dem Kopf. Beim Schließen ist die Engine-Sektion schon umgebaut (`refreshEngineUI`, V 17035) und der Body steht auf ihr. Falls Tests zeigen, dass Nutzer nach dem Tipp „hängen“: Tipp auf die bereits gewählte Kachel schließt (B §11, mit Fertig kompatibel).

## 5. Tastatur, Screenreader, Ziele

| Element | Rolle / Verhalten |
|---|---|
| Quelle-Zeile | `div.kq-row[role=group][aria-labelledby=p-v-eng-l]#p-v-eng` (Id bleibt → Tests, MIDI „Zuweisen“ über `data-pid` am `.ctl.wide`, V 12083); drei Knöpfe, Tab-Reihenfolge ‹ Name ›; Pfeiltasten ←/→ auf dem Namen = ‹ › (Ersatz für den heutigen Radiogroup-Handler V 12076) |
| Bibliothek | `role="dialog" aria-modal="true" aria-labelledby="kqTitle"`, Fokusfalle (Muster `mxLegend`, V 16757–16781), `Esc` schließt, Fokus zurück auf den Öffner. Modal ist vertretbar, weil die Spielfläche Touch ist, nicht Tastatur (A) |
| Titel | `h2#kqTitle` „Klangquelle · Spielfläche / zweite Ebene / Spur 3 / Sporenregen / Kanal Spur 2“ |
| Familienreihe | `radiogroup` „Familie“, ←/→, roving tabindex (Code von `gkChips`, V 18032) |
| Liste | `radiogroup` „Klangquelle“ `aria-describedby="kq-keys"`; Kacheln `role="radio"`, roving tabindex, ↑/↓, Home/End, Buchstabe springt zur nächsten Quelle mit diesem Anfangsbuchstaben; Enter/Space wählt (+Probe), schließt nicht |
| Kachel-Label | `aria-label="Harz, Holz, hält, Kosten mittel. Gestrichenes Glas, Schale, Stab – Druck ist Höhe. Favorit."` |
| ★ / ▶ | echte Knöpfe (`aria-pressed` / „Harz anhören“) mit `tabindex="-1"` – keine 52 Tab-Stopps; Tastatur: `f` = Favorit, `h` = Hören auf der fokussierten Kachel (angesagt in `#kq-keys`); Screenreader erreichen sie über die Rolle |
| Live-Region | `aria-live="polite"` im Fuß: „Harz gewählt für Spur 2“, „7 Treffer“, „Zufall: Harz“ |
| Ziele | Kachel 56 px (Handy) / 48 px (≥ 900 px); ‹ › ★ ▶ ⚄ Familien-Chips 44 × 44; Zeile 44 px |
| Bewegung | `prefers-reduced-motion`: kein Einblend-Slide (Muster V 615–618); dynamischer Text: `min-height`, keine festen Höhen; 200 % Zoom: eine Spalte, Satz umbricht |

## 6. Engine-Sektion und Kopfzeilen-Chip

- Engine-Sektion bleibt `section(name, ENG_INFO[k], grid(…))` direkt unter der Quelle (V 17035–17043); neu: Glyphe vor dem `h3`, Unter-Wahl als erste Chipzeile, Note-Zeile „Höhe: Bogendruck“ (`ENG_META.hoehe`), bei Rückfall „Ohne AudioWorklet spielt diese Quelle als Schale“, bei `Q.rich` ein Halbsatz `ENG_META.rich` („Stufe 3: zwei Bögen L/R“). Makro-A/B-Regler (`MACRO[k]`, V 7050) tragen ein 10-px-Abzeichen „A“/„B“ in `--lumen`.
- Spielhilfe-Texte (V 17489–17491), Gerät-Text (V 17749), Start (V 1565), README 10/56: aus `ENG_META.art`/`FAM` generiert („Halten: Luft, Dunst …; Tippen: Erz, Erde …“) statt Aufzählungen.
- Engines, die nur eine Spur oder der Regen nutzt: zugeklapptes `<details class="kc-more">` „Moder – Spur 1“ am Ende des Klang-Panels (Stilmuster V 443) – P2.
- `#engChip` (V 1528): `Glyphe Name` (+ `Glyphe Name` der Ebene); „Klang“-Label fällt < 400 px ohnehin weg (V 64). Klick unverändert (V 18782). **Langdruck ≥ 400 ms / Rechtsklick**: `kqOpen({id:'v.eng'})` direkt – der schnellste Weg zur Palette (GarageBand-iPad-Muster). aria-label „Klangquelle: Nebel, dazu Schale. Einstellungen öffnen; lange drücken für die Bibliothek“. Ohne Worklet: kleiner Punkt in `--rose` mit `title="spielt als Schale"`.

## 7. CSS/DOM-Skizze (bestehende Klassen und Variablen)

```html
<!-- Quelle-Zeile: ein .ctl.wide wie bisher (data-pid für MIDI „Zuweisen“, bindCtl gleich) -->
<div class="ctl wide" data-pid="v.eng">
  <div class="ctl-row"><div class="lab" id="p-v-eng-l">Für die Spielfläche</div>
    <button type="button" class="iconbtn sm" aria-label="Überrasch mich: zufällige Klangquelle">⚄</button></div>
  <div class="kq-row" role="group" aria-labelledby="p-v-eng-l" id="p-v-eng">
    <button type="button" class="kq-step" aria-label="Vorige Klangquelle">‹</button>
    <button type="button" class="kq-name" aria-haspopup="dialog" aria-expanded="false" aria-controls="kqLib"
            aria-label="Klangquelle für die Spielfläche: Nebel, Dunst, hält. Bibliothek öffnen">
      <svg class="kq-g" aria-hidden="true"><use href="#g-neb"/></svg>
      <span class="kq-n">Nebel <small>· Dunst</small></span>
      <span class="kq-i">Schwebende Flächen aus verstimmten Oszillatoren</span>
    </button>
    <button type="button" class="kq-step" aria-label="Nächste Klangquelle">›</button>
  </div>
</div>

<!-- Bibliothek: einmal im #sheet, Geschwister von .sheet-head/.sheet-body -->
<div class="kq-lib" id="kqLib" role="dialog" aria-modal="true" aria-labelledby="kqTitle" hidden>
  <div class="kq-head"><button class="iconbtn" aria-label="Zurück">‹</button><h2 id="kqTitle">Klangquelle <small>· Spielfläche</small></h2><button class="btn primary">Fertig</button></div>
  <label class="kq-search"><input type="search" placeholder="Suchen – Name, Familie, Stichwort" aria-label="Klangquellen durchsuchen" autocomplete="off" enterkeyhint="search"></label>
  <div class="chips kq-fams" role="radiogroup" aria-label="Familie">
    <button class="chip" role="radio" data-fam="fav" aria-label="Favoriten">★</button>
    <button class="chip" role="radio" data-fam="recent" aria-label="Zuletzt">⟲</button>
    <button class="chip" role="radio" data-fam="alle">Alle</button>
    <button class="chip" role="radio" data-fam="dunst" aria-checked="true">Dunst</button> …
  </div>
  <div class="kq-list" role="radiogroup" aria-label="Klangquelle" aria-describedby="kq-keys">
    <h3 class="kq-fh">Dunst <small>· 4 · Wolken aus Teilchen und Zufall</small></h3>
    <div class="kq-tile" data-k="neb">
      <button type="button" class="kq-pick" role="radio" aria-checked="true" aria-label="Nebel, Dunst, hält, Kosten gering. Schwebende Flächen aus verstimmten Oszillatoren. Favorit.">
        <svg class="kq-g" aria-hidden="true"><use href="#g-neb"/></svg>
        <b class="kq-n">Nebel</b><span class="kq-art">hält</span><span class="kq-cost" aria-hidden="true">●○○</span>
        <span class="kq-i">Schwebende Flächen aus verstimmten Oszillatoren</span>
      </button>
      <button type="button" class="kq-fav" tabindex="-1" aria-pressed="true" aria-label="Nebel als Favorit">★</button>
      <button type="button" class="kq-hear" tabindex="-1" aria-label="Nebel anhören">▶</button>
    </div> …
  </div>
  <div class="kq-foot"><button class="btn ghost">⚄ Überrasch mich</button><p class="kq-live" aria-live="polite">26 Quellen · 3 Favoriten</p></div>
  <p id="kq-keys" hidden>Pfeiltasten wählen, Leertaste spielt kurz, f markiert als Favorit, h hört an.</p>
</div>
```

```css
/* ---------- Klangquellen: Zeile ---------- */
.iconbtn.sm { width: 44px; height: 44px; margin: -8px 0; }
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

/* ---------- Klangquellen: Bibliothek im Sheet ---------- */
.sheet { position: relative; }                                                         /* neu, Anker (V 104–109 ohne position) */
.sheet[data-lib] { height: max(58%, calc(100% - 132px)); max-height: none; }           /* wie .sheet[data-panel="mix"] (V 645) */
@media (max-height: 780px) and (orientation: portrait) { .sheet[data-lib] { height: max(58%, calc(100% - 118px)); } }
#app:has(#sheet[data-lib]:not([hidden])) .quick { display: none; }                      /* wie V 649 */
.kq-lib { position: absolute; inset: 0; z-index: 20; display: flex; flex-direction: column; background: var(--bark); }
.kq-lib[hidden] { display: none; }
.kq-head { display: flex; align-items: center; gap: 8px; padding: 6px var(--gut); border-bottom: 1px solid var(--line); }
.kq-head h2 { flex: 1; margin: 0; font: 400 18px/1.1 var(--font-display); letter-spacing: .02em; }
.kq-head small { font: 400 12px var(--font-ui); color: var(--dim); }
.kq-search { display: block; margin: 8px var(--gut) 0; } .kq-search input { min-height: 44px; font-size: 16px; border-radius: 999px; }
.kq-fams { flex: none; flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; padding: 8px var(--gut); gap: 6px;
  -webkit-mask: linear-gradient(90deg, #000 calc(100% - 24px), transparent); }
.kq-fams .chip { flex: none; min-height: 44px; min-width: 44px; }
.kq-list { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; touch-action: pan-y; padding: 0 var(--gut) 12px; }
.kq-fh { position: sticky; top: 0; z-index: 1; margin: 0; padding: 6px 0; background: var(--bark);
  font: 600 12px/1.2 var(--font-ui); letter-spacing: .1em; text-transform: uppercase; color: var(--spore); }
.kq-fh small { color: var(--dim); letter-spacing: 0; text-transform: none; font-weight: 400; }
.kq-tile { display: grid; grid-template-columns: minmax(0, 1fr) 44px 44px; min-height: 56px; border-bottom: 1px solid var(--line); }
.kq-pick { display: grid; grid-template-columns: 40px minmax(0, 1fr) auto auto; grid-template-rows: auto auto; column-gap: 6px; align-items: center;
  min-width: 0; padding: 6px 0; border: 0; background: none; text-align: left; color: var(--hypha); }
.kq-pick .kq-g { width: 24px; height: 24px; justify-self: center; color: var(--hypha); }
.kq-pick .kq-n { font-weight: 600; } .kq-pick .kq-i { grid-column: 2 / 5; white-space: normal; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.kq-art { font: 500 10px/1 var(--font-num); letter-spacing: .06em; text-transform: uppercase; color: var(--dim); }
.kq-cost { font: 400 10px var(--font-num); letter-spacing: .1em; color: var(--dim); }
.kq-pick[aria-checked="true"], .kq-pick[aria-checked="true"] .kq-g { color: var(--spore); }
.kq-tile:has(.kq-pick[aria-checked="true"]), .kq-tile.on { box-shadow: inset 3px 0 0 var(--spore); }
.kq-pick[aria-disabled="true"] { opacity: .42; }
.kq-tile[data-fallback] .kq-i::after { content: " · ⌁ spielt als " attr(data-fb); color: var(--rose); }
.kq-fav, .kq-hear { border: 0; background: none; color: var(--dim); font-size: 16px; border-radius: 50%; }
.kq-fav[aria-pressed="true"] { color: var(--spore); } .kq-hear:active, .kq-hear.playing { color: var(--lumen); }
.kq-g.loading { animation: kqPulse .8s ease-in-out infinite alternate; } @keyframes kqPulse { to { opacity: .35; } }
.kq-foot { display: flex; align-items: center; gap: 8px; padding: 8px var(--gut) max(8px, env(safe-area-inset-bottom)); border-top: 1px solid var(--line); }
.kq-live { flex: 1; margin: 0; font-size: 12px; color: var(--dim); text-align: right; }
.kq-empty { padding: 24px 0; color: var(--dim); font-size: 13px; text-align: center; }
@media (min-width: 900px) { .kq-tile { min-height: 48px; } .kq-pick { grid-template-rows: auto; } .kq-pick .kq-i { grid-column: auto; grid-row: 1; -webkit-line-clamp: 1; } }
@media (orientation: landscape) and (max-height: 540px) { .sheet[data-lib] { height: auto; } }
@media (prefers-reduced-motion: no-preference) { .kq-lib { animation: kq-in .18s ease-out; } @keyframes kq-in { from { opacity: 0; translate: 0 12px; } } }
```

```js
// Logik (Namen final, Körper angedeutet)
function kqRow(idOrAcc, o = {}) { /* .kq-row; bindCtl(id, sync) oder acc.get(); ‹ › → kqStep(±1); Name → kqOpen(); Langdruck → kqHear(held) */ }
function kqStep(t, d)         { /* nächste erlaubte Quelle in ENG_OPTS ohne Umlauf (selStep-Semantik); setParam/acc.set; Probe nur ohne gehaltene Stimme */ }
function kqOpen(t)            { /* t = {id|get/set, title, allow, bus, f, gate, prefix, opener}; sheet.dataset.lib; Familie der Wahl; Fokus auf gewählte Kachel (fine pointer: Suche) */ }
function kqHear(t, k, held)   { /* §4.6; v.probe; .kq-hear.playing; eine Probe zugleich */ }
function kqSurprise(t, inline){ /* erlaubte ≠ aktuell, nie gespielte zuerst; remember(); Toast mit Rückgängig (inline) / Live-Region (Bibliothek) */ }
function kqClose()            { /* vFade aller v.probe; delete sheet.dataset.lib; hidden; Fokus → t.opener */ }
const KQ = { fav: new Set(), recent: [], save() { store.set('myzel.klang.v1', JSON.stringify({ fav: [...this.fav], recent: this.recent })); } };
```

## 8. Migration

| Fall | Verhalten |
|---|---|
| Alte Presets, `myzel.patch.v1`, Exporte (`version: 2`, V 17505), `myzel.user.v1` | Keys unverändert → `sanitize` lässt sie durch (V 1975); fehlende neue Params → Defaults (V 12192); Formatnummer bleibt 2 |
| `ENG_OPTS` neu sortiert | nur Ansicht/Stepping; `dice` (V 17571), `selStep` (V 6994), `updLaneTabs`, `mxSrcText`, `LANE_DEF` (V 1860), `PRESETS` (V 17278), `RZ` (V 11481) lesen Keys; Program Change lädt Presets, keine Engines (V 7939) |
| Unbekannter Key (neuerer Export, nicht gebaute Reserve) | wie heute still → Default (V 1975); **neu:** `loadValues` sammelt die Ids, `loadPreset/importPreset/restoreState` zeigen **einen** Toast „Klangquelle „Rhizom“ gibt es in dieser Version nicht – Nebel gewählt.“ |
| Spätere Umbenennung | `ENG_ALIAS = { alt: 'neu' }` in `loadValues`/`restoreState`/`gkCheck` vor `sanitize`; heute leer; Keys werden nie recycelt |
| `RG_S` abgeleitet | alte `GK.p.rgS`-Werte (trp/klb/glo/sch/mem/sai) bleiben in der Menge; `gkCheck` (V 8823) läuft gegen die neue Liste |
| Rückfall ohne Worklet | Key bleibt im Patch; `playNote` nimmt `ENGINES[k].fallback`; Mixer-Quelltext „Halm (als Hauch)“ |
| `SEL {chips:1}` → `{lib:1}` | nur `v.eng`, `v.layer`, `l*.eng` (P2 `kor.src`); MIDI `mtParam`/`selStep` lesen `PD[id].opts` (V 6990–6998) – kein Umbau; `kcBindsUI`-Signatur mit `P['v.eng']` (V 18538) bleibt |
| Bibliothekszustand | `myzel.klang.v1` neu; fehlt → keine ★, kein ⟲ – kein Fehlerpfad; nicht im Patch, nicht im Export |
| DOM-Ids/Tests | `#p-v-eng`, `#p-l0-eng`, `#mxd-p-v-eng` sind jetzt `.kq-row[role=group]`; Tests, die Chips zählen (`qa-main.js:66`, `midi-tests/t-map-nks.js`, `motion-tests/gm-script.js`, code-map §11.10) → `ENG_OPTS.length` / `.kq-row`; `shot.js` neue Screenshots |

## 9. Reihenfolge und Prioritäten

**P1 (Release):** `ENG_META`/`FAM`/Glyphen-Sprite → `kqRow` an 6 PD-Fundstellen + Mixer-Präfix → Bibliothek im Sheet mit Familien, ★, ⟲, Suche, ⚄, Probe, Rückfall-Zeile, Kosten-Punkte → `rgS` über `{get,set}` → `#engChip` Glyphen + Langdruck → generierte Texte → Migration-Toast → Tests/Screenshots.
**P2:** `kor.src` als Zeile+Liste; Zweispalten-Desktop ≥ 1100 px; Presets-Hinweis auf der Kachel; `<details>` für Spur-/Regen-Engines; „Tipp auf gewählte Kachel schließt“, falls nötig; Familienfarben nur, falls die Glyphen allein nicht tragen (Kontrast ≥ 3:1 auf `--bark` messen).

## 10. Zu messen / offen

1. Familienreihe in der Bibliothek auf 360 px (★ ⟲ Alle + 5): sichtbar bis „Holz“, Rest scrollt – Playwright wie `shots/shot.js`; Maske als Scrollhinweis prüfen.
2. Sheet-Wachstum mit offener Bibliothek: 130 px Spielfläche spielbar auf 360×740 (Mixer-Erfahrung sagt ja, V 645); Quick-Streifen aus.
3. Langdruck 350–400 ms vs. Scrollbeginn auf iOS/Android in `.kq-list`/`.sheet-body` (`touch-action: pan-y`, V 111) – nur ohne Bewegung > 8 px.
4. Probe-Stimme bei Bibliothekswechsel, `panic()`, Panelwechsel sicher beenden; Worklet-Erstladen auf Mittelklasse-Android (Ziel ≤ 300 ms).
5. ‹ ›-Probe während gehaltener Stimmen unterdrücken – fühlt sich das beim Auftritt richtig an, oder lieber leise Probe?
6. Zeilensatz-Ellipse auf 360 px: wie viele Zeichen des Satzes bleiben (≈ 40, A) – Sätze ggf. mit der Pointe vorn formulieren.
7. `:has()`-Regel für die gewählte Kachel – Fallback-Klasse `.on` setzen, falls Zielbrowser (ältere Android-WebViews) `:has()` nicht kennen.
