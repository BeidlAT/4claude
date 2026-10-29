# Sporenwerk und Harmonizer (29.10.2026)

Besitzer: „weiter zahlreich Tools einbauen. Harmonizer als Audio-Effekt. Arp als MIDI-Effekt. Zusätzlich kann man
Schleifen arpen. Bau einen ausgefuchsten Arpeggiator, ganz im Myzel-Style, sehr speziell und ungewöhnlich, auch optisch
ein Highlight, mit viel Liebe zum Detail, gerne animiert – eine richtige Trickkiste.“

## Harmonizer (`dsp/harmonizer.js`, `myzel-harmo`, FX-Typ `harmo`)
- Wahl in „Effekt“/„Effekt 2“ (also auch als Einschub je Kanal). Bis zu drei Stimmen (`hv1…hv3`, 0 = aus), „Stimmen in“
  der Tonart (Stufen der Leiter ab der gehörten Tonhöhe) oder in Halbtönen (`hmod`), Formant halten, Breite, Schimmer.
- Phasen-Vocoder: STFT 2048, Hop 512, beide Seiten in einer komplexen FFT, alle Stimmen im Spektrum summiert → eine
  Rücktransformation. Verschiebung nach Laroche–Dolson (Spitzenbereiche als Ganzes, Phasen an die Spitze gekoppelt),
  Formant über eine Terz-Glättung des Log-Betrags, Tonhöhe aus der Autokorrelation (Leistungsspektrum zurück).
- Prüfstand (Node): Sinus 220 Hz +7 HT → −0,5 dB am Ziel, Original −120 dB; Tonart C-Dur E4 +2 Stufen → G4, C4 → E4.
- Kosten gemessen 6,5 / 5,5 Einheiten → `FX_COST.harmo = 7.5`.

## Sporenwerk (`arp/sporenwerk.js`, `arp/schleifen.js`, `arp/sporenwerk-ui.js`, Parameter `arp.*`)
- Zwischen Spiel und Klang: `onDown` (play/touch.js) fragt `arpTake` – gehaltene Töne klingen dann nicht selbst, das
  Sporenwerk spielt sie im Raster des Taktgebers über alle Ebenen (`hit`, als gespielt im Humus).
- Wuchsformen: Auf, Ab, Pendel, Wie gespielt, Zufall, Hyphe, Spirale, Sporenflug, Pilzring, Wachsen.
- Raster 1/4…1/32 gerade/triolisch/punktiert, Swing, Länge; euklidischer Ring (Schritte/Treffer/Drehung); Chance,
  Ratschen, Akzent alle N, Höhe-Welle, Stimmen (Terz/Quinte/Dreiklang/Oktave), Leiter-Wanderung (Stufen je Runde,
  heim nach N Runden), Mutation (Tauschen, Drehen, Welken – langsam), Oktaven 1–4 (auf/ab/pendelnd/springend), Halten.
- Schleifen arpen: `arp.quelle` Schleife/Beides, `arp.schl` Fokus oder Platz 1–8 – die gerade klingenden Noten der
  Schleife (S.wn, in der Tonart, der sie folgt) sind der Akkord; „Schleife selbst still“ (Pegel, kommt zurück).
- Panel „Sporenwerk“ (Tab nach dem Mixer): animierter Pilzring der Schritte, Töne als leuchtende Knoten mit Namen,
  Hyphen wachsen je Schritt, Sporen-Bursts (Ratschen, Akzente), Mutation sprießt am Ring, Fruchtkörper pulsiert.
  „Würfeln“: eine neue Trickkiste (Rückgängig im Toast).
- Test `dev/tests/arp/t-arp.js` 8/8 (Chromium).

## Offen
- Touché-Arp (F12) neben dem Sporenwerk: das Sporenwerk hat Vorrang (seine Töne spielt der Touché-Arp nicht).
- MIDI-Lernziele für die Arp-Regler (Formen, Würfeln) – noch nicht.
