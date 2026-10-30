# Effektseite und Räume (29.10.2026)

Besitzer: „eine Effektseite … etwas, das man im Mixer dazuschalten kann, damit die Klänge noch vielschichtiger und
kreativer werden“; „die Räume realistisch – und Spezial-Hallräume, gerne ganz ausgefallene Sachen“; „bau alles ein nach
deinem Ermessen“. Grundlage: `effekte-konzept.md` (26.10.).

## Stand
- **Summen-Begrenzer** (`dsp/begrenzer.js`, PR #99): True-Peak 4×, 2 ms Vorausschau, ersetzt den Clipper.
- **Hall: Raumwahl** (`rev.typ`, `core/raeume-liste.js`, `core/raum.js`, `core/raum-app.js`):
  - Nebel = der bisherige Hall (Grundwert).
  - 23 echte Räume aus OpenAIR (University of York, CC BY 4.0), aufbereitet von `dev/tools/raeume.py` zu
    `myzel/raeume/<id>.flac` (48 kHz, 24 bit, gekürzt bei −70 dB/Rauschen+10 dB), bei der ersten Wahl geladen
    (PWA: eigener Cache `raeume-1`, nicht vorgeladen). Quellennennung unter der Wahl. Lagerhalle verworfen (verrauscht).
  - 7 gerechnete (genRoom: Spiegelquellen 3. Ordnung, ORTF-Paar, Material je Oktave, Luft, Eyring je Band; Nachhall
    nach Vorgabe T je Band, Materialien darauf skaliert; Pegel aus dem Diffusfeld 16πr²/3A). Gegen OpenAIR gemessen:
    T30 in allen Bändern nah, EDT/C80 hängen am Abstand.
  - 15 besondere (genSpecial): Platte, Federhall, Rückwärts, Gatter, Myzelgeflecht, Unter Wasser, Eiskristall,
    Spiegelkabinett, Sternenstaub, Riesenrohr, Glockenkammer (in der Tonart), Tropfsteinhöhle, Kirche mit Krypta,
    Nebelbank, Unendlich.
  - Abstand (frühe ↔ späte Anteile, Luft) und Länge (×0,5 … 1,5) per genShape; Direktschall entfernt (Send).
- **Rückweg „Effekt“** (`mixer/effekt.js`, `dsp/effekte.js`): dritter Rückweg, Send je Kanal (`x…fx`, Grundwert
  100 %, Meister `fx.mix` = 0). Resonanz-Netz (Saiten mit Thiran-Allpass / Glocken / Holzkörper, auf die Tonleiter),
  Wolke (Körner im Takt, gefilterte Kopie für schnelles Lesen), Spektral-Nebel (STFT 8×, freie Phasen ×√(N/H)),
  Oktav-Echo (Ping-Pong, Tonhöhe im Rücklauf, Tiefpass vor dem Hochsetzen), Vokal-Filter (3 Formanten, SVF).
  Pegel mit Kalimba auf den Eingang abgeglichen.

- **Transienten-Former** je Kanal (`myzel-trans`, nach der Sättigung): Anschlag/Ausklang ±18 dB, auf 0 bitgleich (PR #101).
- **Ein Rückweg „Wandel“** (Besitzer, 30.10.: „wir brauchen nur einen davon … kurze knackige Bezeichnung“): der zweite
  Rückweg „Effekt 2“ (29.10.) ist wieder weg, `FX_RETS` trägt nur `fx` mit Namen „Wandel“; die Beschreibungen in
  `FX_TYPES` sind kurz (≤ 60 Zeichen, nichts wird abgeschnitten). `fx2.*`-Schlüssel alter Patches werden ignoriert.
- **Weg des Wandels** (`fx.weg`: Direkt / Durch die Kette): „Kette“ hängt den Rückweg an eine Kettenkopie
  (`fxKetteIn`, makeChain → Summe, in `A.chains`, folgt den Reglern) – Filter, Phaser, Verzerrung, Schweben wirken auf
  den Effektklang. Wahl in der Konsole (Klangquellen) und auf der Wege-Seite des Rückwegs.
- **Flechtwerk** (`myzel-flecht`, `dsp/effekte.js` Flecht): euklidisches Muster (`fsteps` 8/12/16, `fschl` Schläge,
  `fdreh` Drehung) im Raster `fraster` (⅛, 1/16, ⅛-Triole) auf dem Takt des Taktgebers (`fxGrid`: Frame von Schlag 0
  und Frames je Schlag, bei jedem Retempo/Start neu; ohne Takt frei im Puls-Tempo). Je Schritt: Tor (`ftiefe`, Flanken
  `fweich` 2–60 ms), Tiefpass-Lauf durchs Muster (`ffilt`, bis 5 Oktaven, SVF 2-polig), Seitenwechsel je Schlag
  (`fseite`, gleiche Leistung). Kosten 1,1 Einheiten (fxflecht1 1,02 − hxz1 0,075, + 15 %). Test `v2/t-wandel.js`.
- **Einschub je Kanal** (`x…ins`: Keiner / Wandel, `x…insmix` Anteil, gleiche Leistung): ein eigener
  Prozessor mit den Einstellungen des gewählten Rückwegs, hinter dem Transienten-Former (processing.js `x.ins`,
  effekt.js `fxInsUpd`); „Keiner“ blendet ihn aus und gibt ihn frei. Formen-Karte „Einschub“.
- **Formen** kennen „Wandel-Anteil“ (mod.js `fx`; Gestik und Fährte über `fx.mix`);
  eine Auslenkung baut den Prozessor auch, wenn der Anteil im Patch 0 ist.
- **Geflecht**: Send-Faden in den Wandel (eigenes Strichmuster), ihre Knoten als keimende Sterne, ihr Weg in den
  Hall; Wege-Ansicht zeigt alle drei Sends; Konsole: Rückweg-Untertitel nennen Wandel bzw. Raum.

## Offen
- Nichts aus diesem Plan. Mögliche Erweiterung: weitere Effektarten in `FX_TYPES`.
