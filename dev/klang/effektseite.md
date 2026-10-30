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
- **Zweiter Rückweg „Effekt 2“** (Besitzer, 29.10.: „ja alle 3 offenen Punkte erledigen“): `FX_RETS` (params.js) trägt
  beide Rückwege – je eigene Wahl und Regler (`fx2.*`, beginnt mit Wolke), Send je Kanal `x…fx2`, eigene Farbe.
- **Einschub je Kanal** (`x…ins`: Keiner / Effekt / Effekt 2, `x…insmix` Anteil, gleiche Leistung): ein eigener
  Prozessor mit den Einstellungen des gewählten Rückwegs, hinter dem Transienten-Former (processing.js `x.ins`,
  effekt.js `fxInsUpd`); „Keiner“ blendet ihn aus und gibt ihn frei. Formen-Karte „Einschub“.
- **Formen** kennen „Effekt-Anteil“ und „Effekt-2-Anteil“ (mod.js `fx`, `fx2`; Gestik und Fährte über `fx.mix`);
  eine Auslenkung baut den Prozessor auch, wenn der Anteil im Patch 0 ist.
- **Geflecht**: Send-Fäden in beide Effekte (eigene Strichmuster), ihre Knoten als keimende Sterne, ihr Weg in den
  Hall; Wege-Ansicht zeigt alle vier Sends; Konsole: Rückweg-Untertitel nennen Effekt bzw. Raum.

## Offen
- Nichts aus diesem Plan. Mögliche Erweiterung: weitere Effektarten in `FX_TYPES`.
