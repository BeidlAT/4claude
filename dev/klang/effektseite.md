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

## Offen
- Transienten-Former als Einschub je Kanal (Anschlag/Ausklang).
- Zweiter Effekt-Rückweg / Einschub-Plätze, falls gewünscht.
- Formen (mod.js) kennen den Effekt-Send noch nicht; Geflecht-Ansicht zeichnet seine Fäden nicht.
