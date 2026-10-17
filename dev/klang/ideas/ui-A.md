# UI-Variante A – Chips weiterentwickeln: Familienzeile + Bibliotheks-Blatt

Stand 2026-10-17. Grundlage: `research/code-map.md` (§8 Klang-Panel, §7 Fundstellen, §9 Presets), `research/library-ui.md` (§5 Rang 1/2, §6 Zahlen), Screenshots `shots/klang-p360.png`, `shots/puls-lane-p360.png`, `ideas/judge-1..3.md`. **V** = im Code/Research belegt (Zeile in `/home/user/4claude/myzel/index.html`, git 03050e0), **A** = Annahme, zu messen.

## 0. Entscheidung in drei Sätzen

1. **Inline bleibt Chips** – aber zweistufig: eine Familienzeile (5 Familien + ★) und darunter nur die Chips der gewählten Familie (≤ 7 → max. 2 Reihen). Footprint 94–144 px statt 160 px heute und statt 280–320 px bei 26 Quellen (V code-map §8).
2. **Ein Bibliotheks-Blatt** (Singleton, `.lib`) dient allen Fundstellen: Spielfläche, Ebene 2, Spur 1–4, Mixer-Fruchtkörper, Sporenregen. Es trägt, was Chips nicht tragen können: Satz je Quelle, Glyphe, Favoriten, Zuletzt, Suche, Hören, „Überrasch mich“, Kosten, Fallback-Hinweis.
3. **Keys und `SEL {chips:1}` bleiben** – die Familien sind eine Ansicht (`ENG_META[k].fam`), nicht die Datenordnung; MIDI-`selStep`, Pfeiltasten, `sanitize`, Presets und `#p-v-eng`-Ids funktionieren unverändert (V 12067–12083, 1975).

## 1. Fakten, auf denen das Design steht (V)

| Fakt | Quelle |
|---|---|
| Sichtbarer Sheet-Body 252 px (360×740), 308 px (390×844); Chipreihe 34 px + 6 px Lücke ≈ 40 px; 14 Chips = 4 Reihen = 160 px | code-map §8 |
| Dieselbe Chipgruppe wird 7× gerendert (`v.eng`, `v.layer`, `l0–3.eng`, Mixer `mxd-`) + Gestik-Teilmengen `RG_S` (6), Rassel (3) | code-map §7, 16186, 8772, 10527 |
| `ctl(id)` baut bei `d.chips` ein `radiogroup` mit roving tabIndex und Pfeiltasten über `d.opts` | 12067–12083 |
| Puls-Spurenkopf ist sticky (132 px Ring); Chips scrollen darunter | CSS 208–211, `puls-lane-p360.png` |
| Mixer liest nur `ENG_NAME`; Kopfzeilen-Chip `#engChip/#engName` zeigt „Nebel + Schale“ | 12812, 17046 |
| `hit()` spielt gehaltene Engines als 0,22-s-Stoß; `playNote` nimmt `bus`; `steal(fadingOnly, soft)` | 5080, 5013, 4997 |
| Sheet des Mixers wächst auf `max(58%, 100% − 132px)`; ≥ 900 px ist der Sheet eine 440-px-Spalte | CSS 645, 633 |
| `store.get/set` mit try/catch; Patch in `myzel.patch.v1` | 1603, 12202 |
| Apple HIG: ≤ 5 Segmente auf dem iPhone; 44-pt-Ziele; Material 48 dp | library-ui §2.3 |
| Jede App mit > 20 Klängen landet bei einem Browser; Hardware (Plaits, OP-1) bei Bänken + Schritten | library-ui §3 |

## 2. Familien

Fünf Familien, Namen aus Myzels Welt, kein Clash mit Engines (Nebel … Tropfen), Gestik (Sporenregen, Keime, Fährte, Ladung, Schlafen) oder Mixer (Fruchtkörper, Geflecht, Pult; Mixergruppe `grund` 12258, „Boden = aus“ im Geflecht 16738 – deshalb **Erde**, nicht Boden/Grund). Das Wort „Familie“ selbst kommt in der UI nur als aria-label vor.

Primärachse ist die **Welt** (Material/Mechanik), nicht gehalten/geschlagen: Spielweise steht an jeder Quelle als Zeichen (◠ liegt / ● schlägt) und ist filterbar; innerhalb einer Familie stehen gehaltene vor geschlagenen (wie heute in `ENG_OPTS`, V 1664). Alternative (verworfen): gehalten/geschlagen als Familien – nur zwei Gruppen à 13+, löst das Platzproblem nicht.

Set = Schnittmenge der drei Judges: 7 einstimmig (hrz, mdr, rnk, hlm, shn, boe, amo) + 5 mit zwei Stimmen (gsp, glt, zpf, elm, khl) = Judge-1-Set. Reserven (eine Stimme) sind eingeplant, damit die Familien auch bei anderem Zuschnitt tragen.

| Familie | Farbton `--fam-*` (A) | Untertitel (im Blatt) | Bestehend | Neu (Set) | Reserve |
|---|---|---|---|---|---|
| **Luft** | `#9bd7e6` | Atem, Wind, Stimmen, Funken | Hauch ◠, Obertöne ◠, Stimme ◠ | Halm ◠, Böe ◠, Kehlchen ◠●, Elmsfeuer ◠● | – |
| **Dunst** | `#d8cfe8` | Wolken aus Teilchen | Nebel ◠, Körner ◠, Schwarm ◠ | Ranke ◠●, Amöbe ◠ | Flechte ◠ |
| **Holz** | `#d9a066` | Saiten, Stäbe, Bogen | Saite ● | Sehne ◠●, Harz ◠, Zapfen ◠● | Jahresring ● |
| **Erz** | `#e8d9a0` | Metall, das nachklingt | Glocke ●, Schale ●, Gong ●, Kalimba ● | Gespinst ●◠ | – |
| **Erde** | `#a6c46c` | Felle, Tiefe, Fäulnis, Wasser | Tiefe ◠, Membran ●, Tropfen ● | Moder ●, Glut ◠ | Rhizom ●, Unke ◠, Balz ◠ |

7 / 5 / 4 / 5 / 5 = 26 Quellen; mit allen Reserven 31; Familien-Obergrenze 8 (2 Chipreihen). Farbtöne liegen bewusst neben den Spurfarben (spore/lumen/lilac/rose, V 17075) und erscheinen nur als Glyphen-Strich und 2-px-Unterstrich der Familienchips, nie als Chipfüllung (die bleibt `--spore`). Kontrast auf `--bark` ≥ 3:1 für alle fünf (A, prüfen).

Glyphen (16×16, eine Strichstärke 1,6, `currentColor`, Motiv je Quelle): Nebel Wellenband · Körner Punktwolke · Hauch Windstrich · Obertöne Teiltonleiter · Stimme Mundbogen · Schwarm drei Flügler · Tiefe Fallpfeil · Glocke Glocke · Membran Kreis mit Fell · Saite gespannte Linie · Schale Halbkreis · Kalimba drei Zungen · Gong Doppelkreis · Tropfen Tropfen · Halm Rohr mit Blatt · Böe Harfe im Wind · Kehlchen Vogelkehle · Elmsfeuer Funkenspitze · Ranke Spirale mit Knoten · Amöbe Blob · Sehne Saite mit Hand · Harz Bogen auf Stab · Zapfen gezahnter Zapfen · Gespinst Netz · Moder Pilzhut mit Rissen · Glut Glimmpunkt mit Hof. (A: Motive; Zeichnung ist Bauaufgabe.)

Satz je Quelle (`ENG_INFO`, ≤ 52 Zeichen, eine Zeile bei 440 px, zwei bei 360 px): bestehende bleiben (V 1668–1683); neu:

| Key | Name | Satz | Höhe (`ENG_META.hoehe`) |
|---|---|---|---|
| hlm | Halm | Rohrblatt, Flöte, Flamme – der Atem ist die Höhe | Atemdruck |
| boe | Böe | Äolsharfe – Saiten rasten im Wind ein und hängen nach | Windstärke |
| khl | Kehlchen | Vogelkehle – zwei Lippen, die ab einer Schwelle singen | Lippenspannung |
| elm | Elmsfeuer | Brummen, Knistern, Lichtbogen – der Zap im Puls | Spannung |
| rnk | Ranke | Ein Ring aus Massen, den der Finger anstößt | Hammerbreite |
| amo | Amöbe | Bass aus Zufall – jede Welle anders, der Ton bleibt | Unruhe |
| shn | Sehne | Lebende Saite – Handkante, Flageolett, E-Bow, Steg | Anschlagort |
| hrz | Harz | Gestrichenes Glas, Schale, Stab – Druck ist Höhe | Bogendruck |
| zpf | Zapfen | Kratzen, das zum Ton wird – Rhythmus unter dem Finger | Kratzrate |
| gsp | Gespinst | Ein Netz aus Saiten, das Finger und Puls teilen | Kopplung |
| mdr | Moder | Kompostglocke – Glanz zerfällt zu Knistern und Brummen | Verdauung |
| glt | Glut | Gestimmte Rückkopplung, die nachglüht | Gewinn |

## 3. Datenmodell (Ergänzungen, kein Umbau)

```js
// Familien = Ansicht. Reihenfolge = Reihenfolge der Familienzeile und der Bibliothek.
const FAM = [['luft', 'Luft', 'Atem, Wind, Stimmen, Funken'], ['dunst', 'Dunst', 'Wolken aus Teilchen'],
  ['holz', 'Holz', 'Saiten, Stäbe, Bogen'], ['erz', 'Erz', 'Metall, das nachklingt'], ['erde', 'Erde', 'Felle, Tiefe, Fäulnis, Wasser']];
// ENG_OPTS bleibt die eine flache Ordnung (Pfeiltasten, MIDI selStep, dice, Mixer), aber neu sortiert:
// nach Familie, innerhalb gehalten vor geschlagen. Werte (Keys) unverändert.
const ENG_OPTS = [['hau','Hauch'],['obt','Obertöne'],['stm','Stimme'],['hlm','Halm'],['boe','Böe'],['khl','Kehlchen'],['elm','Elmsfeuer'],
  ['neb','Nebel'],['kor','Körner'],['swm','Schwarm'],['rnk','Ranke'],['amo','Amöbe'],
  ['hrz','Harz'],['shn','Sehne'],['zpf','Zapfen'],['sai','Saite'],
  ['gsp','Gespinst'],['glo','Glocke'],['sch','Schale'],['gng','Gong'],['klb','Kalimba'],
  ['tie','Tiefe'],['glt','Glut'],['mem','Membran'],['mdr','Moder'],['trp','Tropfen']];
const ENG_META = {   // je Quelle: Familie, Spielweise-Zeichen, Suchwörter, Höhe-Wort, Glyphen-Key, Regen-Tauglichkeit, Fallback ohne Worklet
  hrz: { fam: 'holz', mode: 'held', tags: 'Bogen Streicher Glas Waterphone Reibung', hoehe: 'Bogendruck', glyph: 'hrz', fallback: 'sch' },
  mdr: { fam: 'erde', mode: 'struck', tags: 'Perkussion Kompost Knistern umgekehrt', hoehe: 'Verdauung', glyph: 'mdr', regen: 1, fallback: 'glo' },
  // …
};
// Sporenregen: nicht mehr hart kodiert (8772) – abgeleitet, alte Werte bleiben gültig:
const RG_S = ENG_OPTS.filter(([k]) => !ENGINES[k].sustain && ENG_META[k].regen !== 0);
// Bibliotheks-Zustand (Gerät, nicht Patch): myzel.lib.v1 = { fav: ['hrz', …], recent: ['hrz','neb', …≤ 8], fam: { 'v.eng': 'holz', 'l0.eng': 'erde', … } }
```

`v.eng`, `v.layer`, `l{i}.eng` erhalten `{ chips: 1, fam: 1 }` (Spuren zusätzlich `small: 1`); `ctl()` rendert bei `d.fam` die Familienvariante (§12). `ENGINES[k].needs = 'worklet'` markiert Worklet-Engines; `A.workletOK` (aus `setupCapture`-Muster, V 5168) entscheidet über den Fallback-Hinweis im Blatt – der Key bleibt im Patch, nur `playNote` leitet um (Patches reisen verlustfrei zwischen Geräten).

## 4. Kompaktzustand – Klang-Panel, 360×740 (Standard beim Öffnen)

```
360 px ──────────────────────────────────────────┐
│ (◠)Nebel + (●)Schale       ▶   ❄   ● REC  ▂▅  │  bar 54 px  – Kopfzeilen-Chip mit Glyphen (§10)
├─────────────────────────────────────────────────┤
│   D3   F3   G3   A3   C4   D4   F4   G4   A4   │  Spielfläche
├─────────────────────────────────────────────────┤
│ KLANG                           [Stille]  [✕]  │  sheet-head 48
│ KLANGQUELLE                      [⚄]  [⊞]      │  sec-h: Überrasch mich · Bibliothek (44×44)
│ [★] [Luft] [Dunst] [Holz] [Erz] [Erde]          │  famrow 44 px (★ nur, wenn Favoriten da sind)
│      ───── ‾‾‾‾‾                                │  Unterstrich = Familie der gewählten Quelle; gefüllt = angesehene Familie
│ [(◠)Nebel●] [Körner] [Schwarm] [Ranke] [Amöbe]  │  members 44 px · 2. Reihe ab 5–6 Chips (A: Textbreiten)
│ Oktave         ±0    Tonstufe          ±0       │  wie heute
├─────────────────────────────────────────────────┤  ↑ 252 px sichtbarer Body endet etwa hier
│ (◠) NEBEL      Schwebende Flächen aus verstimm… │  Engine-Sektion direkt darunter (§9)
│ Welle [Sinus][Dreieck][Säge]…  Höhe: Tiefpass   │
```

- Familienzeile: `.chips.famrow`, `flex-wrap: nowrap; overflow-x: auto; scroll-snap-type: x proximity`, rechts 24-px-Maskenverlauf als Scrollhinweis. Rechenprobe 360 px (Innenbreite 328): ★ 44 + Luft 46 + Dunst 54 + Holz 48 + Erz 40 + Erde 48 + 5 Lücken 30 = 310 ≤ 328 (A, Padding 0 10 px, 13 px Instrument Sans; mit Playwright messen – library-ui §6 hat 390/360-Werte der heutigen Chips).
- Mitgliederzeile: dasselbe `radiogroup#p-v-eng` wie heute (Id bleibt → Tests, MIDI-Zuweisen `data-pid`, Pfeiltasten). Es sind **alle** 26 Chips im DOM, Chips fremder Familien sind `hidden`; Pfeiltasten laufen über die volle `ENG_OPTS`-Ordnung und ziehen die Familienzeile nach (die Ansicht folgt der Auswahl, nie umgekehrt).
- Wechsel der angesehenen Familie ändert **keinen** Parameter; nur ein Chip-Tipp setzt `v.eng`. Die zuletzt angesehene Familie je Fundstelle bleibt im Gerät (`lib.fam`), beim Öffnen des Panels steht die Familie der gewählten Quelle.
- Footprint: famrow 44 + 6 + members 44 (≤ 4 Chips) … 94 px; 2 Reihen 144 px; Chips 40 px, `@media (pointer: coarse)` 44 px (wie `.kc-sec`, V 380). Heute 160 px, mit 26 Quellen ohne Umbau 280–320 px (A code-map §8).
- `[⚄]` Überrasch mich: `remember()`, wählt eine Quelle ≠ aktuell, bevorzugt nie gespielte (`lib.recent` leer dafür), setzt nur `v.eng` – kein `dice()`. Toast „Überraschung: Harz – gestrichenes Glas … [Rückgängig]“ (Toast-Action existiert, V 18819).
- `[⊞]` öffnet das Blatt für diese Fundstelle (§6). Langdruck 500 ms auf einen Mitgliederchip = Hören ohne Wechsel (§7); für Tastatur/Screenreader ist das Blatt der Weg.
- Subtitel „Was ein Finger spielt“ entfällt (Platz für die zwei Knöpfe); der Satz wandert in das aria-label des Radiogroups („Klangquelle für die Spielfläche“).

## 5. Die anderen Fundstellen

**Ebene 2 (`v.layer`)** – identisch, plus fester Chip `[Aus]` vor der Familienzeile links (immer sichtbar, unabhängig von der Familie; `v.layer='off'`). Bei „Aus“ zeigt die Familienzeile die Familie von `v.eng` (Nähe zur ersten Ebene ist der häufigste Griff, A).

**Puls-Spuren (`l0–3.eng`, `.small`)** – unter dem sticky Spurenkopf bleiben auf 360×740 nur ≈ 120 px (V 252 − 132). 

```
│ ◎ Ring 132 px   [Spur 1 E(5,16) Membran] [Spur 2 …] │  lanehead sticky
│ Spur spielt                                  (●)   │
│ Klang   [★][Luft][Dunst][Holz][Erz][Erde][⊞]       │  famrow.small 32 px (coarse 44)
│         [(●)Membran●] [Moder] [Tropfen] [Tiefe] [Glut] │  members.small, 1 Reihe (Erde = 5)
│ Schritte       16    Impulse        5              │
```
Footprint 32+6+32 = 70 px (coarse 94) statt 114–152 px (V); `[⊞]` ist hier ein Icon-Chip am Ende der Familienzeile, der Würfel entfällt. Hören im Blatt läuft über `stripIn('l'+i)` und `laneNote(i)` – man hört die Spur, wie sie klingt (V 5980).

**Mixer-Fruchtkörper (`mxdQuelle`, Präfix `mxd-`)** – `C('v.eng','Klang')` rendert über `ctl()` automatisch die Familienvariante; `MXD.qu[k]` cached wie heute (V 16186). `mxSrcText` zeigt weiter `ENG_NAME` (V 12812), ergänzt um die Glyphe im `.mxd-src` (A, optional).

**Gestik – Sporenregen (`rgS`) und Rassel (`rasS`)** – `gkChips(RG_S)` bleibt flach (abgeleitete Liste, ≤ 10 geschlagene → 3 Reihen `small`), dahinter `[⊞]` → Blatt mit Fundstelle `rgS`: gehaltene Quellen sind **sichtbar, aber grau** mit Grund „nur Schlagklänge regnen“ (Elektron-Muster, library-ui §7); Auswahl ruft `gkSet('rgS', v)` + `warmKS()` bei sai (V 18290). Rassel bleibt drei Chips (+ Moder, wenn er die Prüfung besteht, A) – kein Blatt. `gkCheck` validiert gegen die abgeleitete `RG_S` (V 8823): alte Werte trp/klb/glo/sch/mem/sai bleiben gültig.

**Presets** – Karten unverändert; neue Presets je neuer Quelle (eins pro Familie zuerst). Die Bibliothekszeile einer Quelle nennt bis zu zwei Presets, die sie als Spielflächenklang nutzen („in Tiefsee, Sonnenwind“) – aus `PRESETS` gerechnet, kein neues Datenfeld. Tipp darauf lädt nichts; es ist Orientierung (A). Der Würfel im Presets-Panel („Ganz neu würfeln“, V 17460) bleibt das Alles-Zufall; „Überrasch mich“ ist das Quellen-Zufall.

## 6. Das Bibliotheks-Blatt (`.lib`)

Ein Element, im `#sheet` als Geschwister von `.sheet-head/.sheet-body`, `position: absolute; inset: 0` (Handy) – der Sheet wächst dabei wie beim Mixer auf `max(58%, 100% − 132px)` (V 645): die Spielfläche bleibt 130 px hoch spielbar, der Finger kann die neue Quelle sofort auf dem Feld probieren. `sheet.dataset.lib = site` steuert CSS und Fokus.

### 6.1 360×740 – Blatt offen (Fundstelle Spielfläche)

```
360 px ──────────────────────────────────────────┐
│ (◠)Nebel + (●)Schale      ▶  ❄  ● REC  ▂▅      │  bar
│   D3   F3   G3   A3   C4   D4   F4   G4         │  Spielfläche ≈ 130 px, spielbar
├─────────────────────────────────────────────────┤  Sheet 100 % − 132 px ≈ 608 px
│ [‹]  Klangquelle · Spielfläche        [Fertig]  │  lib-head 48
│ [🔍 Suchen … Bogen, Bass, Vogel            ]    │  lib-search 44 (type=search)
│ [Alle] [Luft] [Dunst] [Holz] [Erz] [Erde]  ▸    │  famrow 44, scrollt, „Alle“ = Standard
├─────────────────────────────────────────────────┤  lib-list scrollt (≈ 440 px sichtbar)
│ ★ FAVORITEN                                     │  lib-grp sticky, 28 px
│ (◠) Harz  ◠               ●●○      [★]  [▶]     │  lib-row 56 px: Glyphe · Name · Zeichen · Kosten · Favorit · Hören
│     Gestrichenes Glas, Schale, Stab – Druck …   │
│ ZULETZT                                         │
│ (●) Moder ●               ●○○      [☆]  [▶]     │
│     Kompostglocke – Glanz zerfällt zu Knistern… │
│ LUFT · Atem, Wind, Stimmen, Funken              │  lib-grp mit --fh
│ (◠) Hauch ◠               ●○○      [☆]  [▶]     │
│     Gefiltertes Rauschen – von Wind bis Pfeifen │
│ (◠) Halm  ◠  ⌁ ohne AudioWorklet: als Hauch     │  Fallback-Zeile (nur wenn !A.workletOK)
│ …                                               │
├─────────────────────────────────────────────────┤
│ [⚄ Überrasch mich]     26 Quellen · 3 Favoriten │  lib-foot 48
```

- **Gewählt** = `aria-checked="true"` auf `.lib-pick`, 1-px-`--spore`-Rahmen wie `.pcard[aria-current]` (V 257). Tipp = wählen **und** kurzer Stoß (Logic „Replace“ + Preview in einer Geste); das Blatt bleibt offen zum Vergleichen; `[Fertig]`, `[‹]`, Esc oder Wischen nach unten schließen. Der Engine-Abschnitt im Panel ist beim Schließen schon umgebaut (`refreshEngineUI`, V 17035) und der Body steht auf ihm.
- **Familienzeile im Blatt**: `[Alle]` zeigt alles gruppiert (Favoriten, Zuletzt, dann die 5 Familien mit sticky Gruppenköpfen); eine Familie filtert. Zusätzlich zwei Filterchips rechts außen `[◠ liegt] [● schlägt]` (Spielweise; A: nur wenn Platz, sonst in der Suche als Wörter „gehalten/geschlagen“).
- **Suche**: `type="search"`, 16 px (kein iOS-Zoom), filtert über Name, Satz, `tags`, Familie, „gehalten/geschlagen“; NFD-normalisiert (ö/oe). Während der Suche steht die Familienzeile auf „Alle“. Leer: „Nichts gefunden – [⚄ Überrasch mich]“. Erst ab 26 Quellen sinnvoll, bei 40 nötig (library-ui §3: Suche ab ~100 üblich; hier billig).
- **Favoriten** `[★]` 44×44, `aria-pressed`; Gruppe „Favoriten“ erscheint ab 1 Stern, Reihenfolge = Sternzeitpunkt. ★ steht auch inline in der Familienzeile (§4).
- **Zuletzt**: die 6 zuletzt gewählten Quellen über alle Fundstellen (ohne Duplikate, ohne die gerade gewählte), gesetzt in `setParam` für die 6 Engine-Ids und `gkSet('rgS')`.
- **Kosten** `●○○ / ●●○ / ●●●` = `Q.cost[k]` ≤ 0,5 / ≤ 1,0 / > 1,0; `title`/aria: „Kosten 1,05 – etwa 13 Stimmen auf diesem Gerät“ (`floor(VBUDGET / Q.cost[k])`, Muster Gerät-Text V 17747). Klein, `--dim`, für Sounddesigner.
- **Fallback-Zeile** nur ohne Worklet: „⌁ ohne AudioWorklet: spielt als Hauch“ (Judge-3 §3 Spalte „Ohne Worklet“). Wählbar bleibt sie.
- **Körper-/Rohr-/Steg-Wahl** (Harz 5 Körper, Halm 3 Rohre, Zapfen, Moder, Sehne) ist **kein** Eintrag im Blatt – sie steht als erste SEL-Chipzeile in der Engine-Sektion (§9); der Satz im Blatt nennt die Körper („Glas, Schale, Stab“).

### 6.2 1280×800 – Blatt als zweite Spalte neben dem Klang-Panel

Ab 1100 px (A, Schwelle: 440 + 400 + ≥ 440 px Spielfläche) wird das Blatt eine linke Nachbarspalte des 440-px-Sheets; die Engine-Sektion rechts baut sich **live** beim Tippen um – der Sounddesigner sieht Parameter und Satz zugleich. 900–1099 px: Blatt als Seite im Sheet (wie Handy, nur ohne Höhenwachstum).

```
1280 px ─────────────────────────────────────────────────────────────────────────────────────────────┐
│ myzel  (◠)Nebel + (●)Schale            ▶   ❄    ● REC   ▂▅                                        │ bar
├────────────────────────────────────────────┬───────────────────────────────┬─────────────────────────┤
│                                            │ [‹] Klangquelle · Spielfläche │ KLANG       [Stille][✕] │
│   Spielfläche 440 px, spielbar             │ [🔍 Suchen …               ]  │ KLANGQUELLE    [⚄] [⊞]  │
│                                            │ [Alle][Luft][Dunst][Holz][Erz][Erde] [◠][●] │ [★][Luft][Dunst][Holz]… │
│   D3  F3  G3  A3  C4  D4  F4  G4  A4  C5   │───────────────────────────────│ [Harz●][Sehne][Zapfen]  │
│                                            │ HOLZ · Saiten, Stäbe, Bogen   │ Oktave ±0  Tonstufe ±0  │
│                                            │ (◠) Harz ◠  Gestrichenes Glas, Schale… ●●○ [★][▶] │─────────────────────────│
│                                            │ (◠●) Sehne  Lebende Saite – Handkante… ●●○ [☆][▶] │ (◠) HARZ  Gestrichenes… │
│                                            │ (◠●) Zapfen Kratzen, das zum Ton wird… ●○○ [☆][▶] │ Körper [Glas][Schale]…  │
│                                            │ (●) Saite   Gezupfte Saiten nach Karplus… ●○○ [☆][▶] │ Druck  ──●──  Bogen ──● │
│                                            │ ERZ · Metall, das nachklingt  │ Höhe: Bogendruck        │
│                                            │ (●◠) Gespinst Ein Netz aus Saiten … ●●● [☆][▶] │ Klingt, solange …       │
│                                            │ …                             │ ZWEITE EBENE            │
│                                            │ [⚄ Überrasch mich]  26 · 3 ★  │ …                       │
│ Fil 9,00 kHz  Echo 35 %  Hall 45 %   [🔇]  │                               │                         │
│ Klang Effekte Puls Mixer Aufnahme Presets  │  400 px                       │  440 px                 │
```

Zeile auf 440/400 px: 48 px, Satz auf einer Zeile (Ellipse), Tastaturfokus sichtbar (`:focus-visible` Lumen, V 44). Mausnutzer: Hover auf `[▶]` zeigt „Hören (halten)“; Mausrad scrollt die Liste, nicht den Sheet.

## 7. Hören (Vorhören)

| Geste | Verhalten | Implementierung |
|---|---|---|
| Tipp auf Zeile | wählen + Stoß 0,22 s | `setParam(site, k)`; `hit(k, now, f, 0.5, 0.7, {bus})` |
| `[▶]` halten / Langdruck 400 ms auf Zeile oder Inline-Chip | gehalten: Ton bis Loslassen; geschlagen: ein Schlag, bei Halten Wirbel 1/8 (A) | `playNote(k, now, f, y, 0.7, {bus})`, `v.setY(y)` bei vertikalem Ziehen, `v.release(1)` bei pointerup/-cancel |
| Tastatur: Leertaste auf fokussierter Zeile | Stoß; Shift+Leertaste = 1,2 s Halten | `hit()` bzw. `playNote` + Timer |

- Tonhöhe `f` = mittlere Skalenstufe des Feldes (`N.notes[mid].f`), Spur: `laneNote(i)`, Ebene 2: mit `v.layerInt/Deg`; `y = 0.5`; `bus = stripIn(site→'fin'|'eb2'|'l'+i|'rgn')` – man hört durch Mixer und Effekte der Fundstelle.
- Budget: Kosten `Q.cost[k]`; bei Überlauf `steal(false, true)` (weich, wie Sporenregen V 10888); nie mehr als eine Hör-Stimme gleichzeitig (die vorige wird mit `vFade` beendet, V 2139).
- Worklet-Engines beim ersten Hören: Modul laden (≤ 300 ms, A) – Glyphe pulsiert, danach spielt es; Saite/Sehne: `ksBuffer` erste Saite synchron (V 4667), `warmKS()` erst nach Wahl.
- Hören ändert **nichts** am Patch (kein `remember()`); `UI.preset` bleibt.

## 8. Tastatur, Screenreader, Ziele

- Inline: Familienzeile `role="radiogroup" aria-label="Familie"` (Pfeile links/rechts); Mitglieder bleiben das heutige `radiogroup` (Pfeile über alle 26 in `ENG_OPTS`, Ansicht folgt; Home/End; Buchstabe springt zur nächsten Quelle mit diesem Anfangsbuchstaben – Erweiterung des Handlers V 12076). Chip-Label trägt die Spielweise unsichtbar: `aria-label="Harz, gehalten, Familie Holz"`. `[⊞]` `aria-haspopup="dialog" aria-expanded`.
- Blatt: `role="dialog" aria-label="Bibliothek der Klangquellen für die Spielfläche"`, **nicht** `aria-modal` (die Spielfläche bleibt erreichbar); Fokus beim Öffnen auf die gewählte Zeile (nicht die Suche – sonst springt auf dem Handy die Tastatur auf), Esc/`[‹]` schließen und geben den Fokus an `[⊞]` zurück. Zeilen `role="radio"` in `radiogroup`, roving tabindex, Pfeile hoch/runter; `[★]` und `[▶]` sind Tab-Stopps hinter der Liste (nicht in jeder Zeile – Screenreader-Nutzer erreichen sie per Zeilenaktion: Tasten `f` = Favorit, `h` = Hören auf der fokussierten Zeile, angesagt im aria-description der Liste). Live-Region (`aria-live="polite"`): „Harz gewählt – gehalten, Familie Holz“, Suchtreffer „7 Quellen“.
- Ziele: Zeilen 56 px (Handy) / 48 px (Maus); `[★] [▶] [⊞] [⚄]` 44×44; Familien- und Mitgliederchips 40 px, bei `pointer: coarse` 44 px; Lücke 6 px bleibt (V 156) – Pitch 50 px.
- Reduced motion: Blatt ohne Gleiten (`prefers-reduced-motion`, Muster V 615–618). Dynamischer Text: Zeilen `min-height`, keine festen Höhen; bei 200 % Zoom 1 Spalte, Satz umbricht.

## 9. Die Engine-Sektion

Unverändert an ihrem Platz: direkt unter „Klangquelle“, Titel = Name, Untertitel = Satz (V 17014–17027), neu mit Glyphe vor dem Titel und, wenn vorhanden, der Körper/Rohr/Steg-SEL als erste Chipzeile (`{chips:1}`, ≤ 5 Chips). Note-Zeile ergänzt um „Höhe: Bogendruck“ (`ENG_META.hoehe`) und, bei Fallback, „Ohne AudioWorklet spielt diese Quelle als Schale“. Spuren und Regen: Engines, die nur eine Spur oder der Regen nutzt (nicht `v.eng`/`v.layer`), erscheinen am Ende des Klang-Panels als zugeklapptes `<details class="kc-more">` „Moder – Spur 1“ (Stilmuster V 443); `refreshEngineUI` setzt das in derselben Schleife (V 17037).

## 10. Kopfzeilen-Chip `#engChip`

- Inhalt: `(Glyphe) Nebel` bzw. `(◠)Nebel + (●)Schale` – Glyphen 16 px im Familienfarbton, Text wie heute (`#engName` bleibt, Glyphen davor als `<svg class="eg">`). `.lbl` „Klang“ verschwindet unter 400 px (V 65) – unverändert.
- Tipp: Klang-Panel (V 18782). **Langdruck 500 ms**: Panel + Blatt für `v.eng` (GarageBand-iPad-Muster, library-ui §7). Rechtsklick/Kontextmenü auf dem Desktop dasselbe.
- aria-label „Klangquelle: Nebel, dazu Schale. Einstellungen öffnen; lange drücken für die Bibliothek“.

## 11. Migration

| Fall | Verhalten |
|---|---|
| Alte Presets, `myzel.patch.v1`, Exporte (version 2), `myzel.user.v1` | Keys unverändert → `sanitize` lässt sie durch (V 1975). Neue Engine-Params fehlen → Defaults (V 12192). Keine Formatnummer-Änderung. |
| Unbekannter Engine-Key (Datei aus neuerer Version, Tippfehler) | wie heute still → Default; **neu:** `loadValues` sammelt die betroffenen Ids und `loadPreset/importPreset/restoreState` zeigen einmal: „Klangquelle „xyz“ gibt es in dieser Version nicht – Nebel gewählt.“ |
| Spätere Umbenennung eines Keys | `ENG_ALIAS = { alt: 'neu' }`, angewandt in `loadValues`/`restoreState`/`gkCheck` vor `sanitize`. Heute leer; Regel: Keys werden nie recycelt. |
| `ENG_OPTS`-Reihenfolge neu | nur Ansicht/Stepping; `dice()` (V 17571), MIDI `selStep`, `updLaneTabs`, `mxSrcText` lesen Keys/Namen, nicht Indizes. `kcBindsUI`-Signatur (V 18538) unverändert. |
| `RG_S` abgeleitet statt hart | alte `GK.p.rgS` bleiben in der Menge; `gkCheck` (V 8823) läuft gegen die neue Liste; `RZ`-Rezepte (V 11481) unverändert. |
| Fallback ohne Worklet | Key bleibt im Patch, `playNote` nimmt `ENGINES[ENG_META[k].fallback]`; der Mixer-Quelltext zeigt „Halm (als Hauch)“. |
| Bibliothekszustand | `myzel.lib.v1` neu; fehlt → keine Favoriten, keine Zuletzt, Familienzeile auf der Familie der gewählten Quelle. Nicht im Patch, nicht im Export. |
| DOM-Ids/Tests | `#p-v-eng`, `#p-l0-eng`, `#mxd-p-v-eng` bleiben die Radiogroups (alle 26 Chips im DOM, fremde `hidden`); `shot.js`/`qa-main.js` zählen Reihen neu. |
| Texte | Spielhilfe 17489–17491, Gerät 17749, Start 1565, README 10/56 nennen Familien statt Aufzählungen: „Halten: Luft und Dunst; Tippen: Erz und Erde …“ (A). |

## 12. CSS/DOM-Skizze (bestehende Klassen und Variablen)

```html
<!-- Inline (ctl('v.eng') mit d.fam) – ersetzt das heutige <div class="ctl wide"> -->
<div class="ctl wide eng" data-pid="v.eng" style="--fh: var(--fam-dunst)">
  <div class="ctl-row">
    <div class="lab" id="p-v-eng-l">Klangquelle</div>
    <span class="row">
      <button type="button" class="iconbtn sm" aria-label="Überrasch mich: zufällige Klangquelle">⚄</button>
      <button type="button" class="iconbtn sm" aria-haspopup="dialog" aria-expanded="false" aria-controls="lib" aria-label="Bibliothek der Klangquellen öffnen">⊞</button>
    </span>
  </div>
  <div class="chips famrow" role="radiogroup" aria-label="Familie">
    <button type="button" class="chip fav" role="radio" aria-checked="false" data-fam="fav" aria-label="Favoriten">★</button>
    <button type="button" class="chip" role="radio" aria-checked="true" data-fam="dunst" data-has="1">Dunst</button> …
  </div>
  <div class="chips eng" role="radiogroup" aria-label="Klangquelle für die Spielfläche" id="p-v-eng">
    <button type="button" class="chip" role="radio" aria-checked="true" data-val="neb" data-fam="dunst" aria-label="Nebel, gehalten, Familie Dunst"><svg class="eg">…</svg>Nebel</button>
    <button type="button" class="chip" role="radio" aria-checked="false" data-val="hau" data-fam="luft" hidden>…</button> …
  </div>
</div>

<!-- Blatt, einmal im #sheet -->
<div class="lib" id="lib" role="dialog" aria-label="Bibliothek der Klangquellen für die Spielfläche" hidden>
  <div class="lib-head"><button class="iconbtn" aria-label="Zurück">‹</button><h2>Klangquelle <small>· Spielfläche</small></h2><button class="btn ghost">Fertig</button></div>
  <div class="lib-tools"><input type="search" class="lib-search" placeholder="Suchen … Bogen, Bass, Vogel" aria-label="Klangquelle suchen">
    <div class="chips famrow" role="radiogroup" aria-label="Familie"><button class="chip" role="radio" aria-checked="true" data-fam="">Alle</button> …</div></div>
  <div class="lib-list" role="radiogroup" aria-label="Klangquelle" aria-describedby="lib-keys">
    <h4 class="lib-grp" style="--fh: var(--fam-holz)">Holz <small>Saiten, Stäbe, Bogen</small></h4>
    <div class="lib-row" style="--fh: var(--fam-holz)" data-eng="hrz">
      <button type="button" class="lib-pick" role="radio" aria-checked="false" aria-label="Harz, gehalten, Kosten mittel">
        <svg class="eg">…</svg><b>Harz <i class="mode" aria-hidden="true">◠</i></b><small>Gestrichenes Glas, Schale, Stab – Druck ist Höhe</small><span class="cost" aria-hidden="true">●●○</span>
      </button>
      <button type="button" class="lib-star" aria-pressed="false" aria-label="Harz als Favorit">★</button>
      <button type="button" class="lib-play" aria-label="Harz anhören">▶</button>
    </div> …
  </div>
  <div class="lib-foot"><button class="btn">⚄ Überrasch mich</button><p class="note live" aria-live="polite">26 Quellen · 3 Favoriten</p></div>
  <p id="lib-keys" hidden>Pfeiltasten wählen, Leertaste spielt kurz, f markiert als Favorit, h hört an.</p>
</div>
```

```css
:root { --fam-luft: #9bd7e6; --fam-dunst: #d8cfe8; --fam-holz: #d9a066; --fam-erz: #e8d9a0; --fam-erde: #a6c46c; }
.eg { width: 16px; height: 16px; flex: none; color: var(--fh, var(--dim)); }
.chip[aria-checked="true"] .eg { color: var(--ink); }
.iconbtn.sm { width: 44px; height: 44px; margin: -8px 0; }               /* 44-px-Ziel, Kopfzeile bleibt 28 px hoch */
.ctl.eng .ctl-row { align-items: center; }
.chips.famrow { flex-wrap: nowrap; overflow-x: auto; scroll-snap-type: x proximity; scrollbar-width: none; -webkit-mask: linear-gradient(90deg, #000 calc(100% - 24px), transparent); }
.chips.famrow .chip { flex: none; padding: 5px 10px; scroll-snap-align: start; }
.chips.famrow .chip[data-has="1"] { box-shadow: inset 0 -2px 0 var(--fh); }   /* hier liegt die gewählte Quelle */
.chips.famrow .chip.fav { min-width: 44px; padding: 5px 0; }
.chips.eng .chip { display: inline-flex; align-items: center; gap: 6px; min-height: 40px; }
.chips.small.eng .chip, .chips.small.famrow .chip { min-height: 32px; }
@media (pointer: coarse) { .chips.eng .chip, .chips.famrow .chip { min-height: 44px; } }

.lib { position: absolute; inset: 0; z-index: 3; display: flex; flex-direction: column; background: var(--bark); }
.sheet[data-lib] { height: max(58%, calc(100% - 132px)); max-height: none; }                      /* wie .sheet[data-panel="mix"] */
.lib-head { display: flex; align-items: center; gap: 8px; padding: 6px var(--gut); border-bottom: 1px solid var(--line); }
.lib-head h2 { flex: 1; margin: 0; font: 400 18px/1.1 var(--font-display); } .lib-head small { font: 400 12px var(--font-ui); color: var(--dim); }
.lib-tools { display: grid; gap: 6px; padding: 6px var(--gut); border-bottom: 1px solid var(--line); }
.lib-search { min-height: 44px; border-radius: 999px; }                                           /* erbt input[type=text]-Stil (V 190) */
.lib-list { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding: 0 var(--gut) 12px; }
.lib-grp { position: sticky; top: 0; z-index: 1; margin: 0; padding: 8px 0 4px; background: var(--bark); font: 600 11px/1.2 var(--font-ui); letter-spacing: .1em; text-transform: uppercase; color: var(--fh, var(--spore)); }
.lib-grp small { margin-left: 8px; font-weight: 400; letter-spacing: 0; text-transform: none; color: var(--dim); }
.lib-row { display: grid; grid-template-columns: minmax(0, 1fr) 44px 44px; align-items: center; gap: 2px; min-height: 56px; border-bottom: 1px solid var(--line); }
.lib-pick { display: grid; grid-template-columns: 24px minmax(0, 1fr) auto; grid-template-rows: auto auto; column-gap: 10px; align-items: center; min-height: 56px; padding: 6px 0; text-align: left; background: none; border: 0; border-radius: 12px; color: var(--hypha); }
.lib-pick .eg { grid-row: 1 / span 2; width: 22px; height: 22px; }
.lib-pick b { font: 600 14px/1.2 var(--font-ui); } .lib-pick .mode { font-style: normal; color: var(--dim); margin-left: 6px; }
.lib-pick small { grid-column: 2 / span 2; font-size: 12px; line-height: 1.3; color: var(--dim); overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.lib-pick .cost { font: 400 10px var(--font-num); color: var(--dim); letter-spacing: .1em; }
.lib-pick[aria-checked="true"] { box-shadow: inset 0 0 0 1px var(--spore); padding-left: 8px; padding-right: 8px; }
.lib-row[data-fallback] .lib-pick small::after { content: " · ⌁ ohne AudioWorklet: als " attr(data-fb); color: var(--rose); }
.lib-row[data-off] { opacity: .42; }                                                                /* z. B. gehaltene Quellen im Regen */
.lib-star, .lib-play { width: 44px; height: 44px; border: 0; background: none; color: var(--dim); border-radius: 50%; }
.lib-star[aria-pressed="true"] { color: var(--spore); } .lib-play:active { background: var(--bark-2); color: var(--lumen); }
.lib-foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 6px var(--gut); border-top: 1px solid var(--line); }
@media (min-width: 900px) { .lib-row { min-height: 48px; } .lib-pick { min-height: 48px; grid-template-rows: auto; } .lib-pick small { grid-column: auto; grid-row: 1; -webkit-line-clamp: 1; } }
@media (min-width: 1100px) {                                                                         /* Blatt als Nachbarspalte, Panel bleibt sichtbar */
  .sheet[data-lib] { width: 840px; display: grid; grid-template-columns: 400px 440px; grid-template-rows: auto minmax(0, 1fr); }
  .sheet[data-lib] .lib { position: static; grid-row: 1 / span 2; grid-column: 1; border-right: 1px solid var(--line); }
  .sheet[data-lib] .sheet-head, .sheet[data-lib] .sheet-body { grid-column: 2; }
}
@media (orientation: landscape) and (max-height: 540px) { .sheet[data-lib] { height: auto; width: min(600px, 64%); } .lib-tools { grid-template-columns: 1fr auto; } }
@media (prefers-reduced-motion: no-preference) { .lib { animation: libIn .18s ease-out; } @keyframes libIn { from { transform: translateY(12px); opacity: 0; } } }
```

JS-Haken (Namen als Vorschlag): `libOpen(site)` / `libClose()` / `libRender()` / `libAudition(k, site, hold)` / `libSurprise(site)` / `libStar(k)`; `ctl()` erhält den `d.fam`-Zweig; `setParam` ruft `libRecent(k)` für die 6 Engine-Ids; `refreshEngineUI` setzt Glyphen in `#engChip` und die `<details>` für Spur-/Regen-Engines; `onParamChanged` (V 12128) bleibt.

## 13. Zu messen / offen

1. Familienzeile auf 360 px mit ★ in einer Reihe (A §4) – Playwright wie `shots/shot.js`; sonst Padding 8 px oder „Erde“ → „Erde“ bleibt, „Dunst“ ggf. kürzer.
2. Kontrast der fünf Familienfarbtöne als Strich auf `--bark` (≥ 3:1, A).
3. Langdruck 500 ms vs. Scrollbeginn auf iOS/Android in `.sheet-body` (touch-action pan-y, V 111) – Langdruck nur, wenn der Finger ≤ 8 px wandert.
4. Hör-Stimme beim Blattwechsel/`panic()` sicher beenden; Worklet-Erstladen auf Mittelklasse-Android messen.
5. Ob das Blatt bei ≥ 1100 px als Nachbarspalte die Spielfläche (≥ 440 px) nicht zu schmal macht – alternativ Blatt überlagert das Panel wie 900–1099.
6. Reserven-Platzierung (Flechte/Jahresring/Rhizom/Unke/Balz) erst nach der Spec-Entscheidung; Familiengrenze 8 hält auch dann.
