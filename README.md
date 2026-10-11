# Myzel

Ein Touch-Instrument für ambiente, perkussive, experimentelle und psychedelische Klänge – im Browser, gemacht fürs Handy.

- **Als App (auch offline):** https://beidlat.github.io/4claude/ – im Browser öffnen, dann „Teilen → Zum Home-Bildschirm“ (iPhone) bzw. „App installieren“ (Android).
- **In claude.ai:** https://claude.ai/artifact/HNZYLEaUvtCfkyYWi3SuDr (privat)

## Klänge

- **Klangquellen (14):** gehaltene Klänge Nebel, Körner, Hauch, Obertöne (Obertongesang), Stimme (Vokalchor), Schwarm (Insektenschwarm) und Tiefe (Subbass). Angeschlagen werden Glocke, Membran, Saite, Schale, Kalimba, Gong und Tropfen.
- **Körner-Quellen:**
  - Erzeugt: Glasharfe, Chor, Metall, Staub, Wasser, Vögel, Zikaden, Flüstern, Harmonium und Kurzwelle.
  - Echo (die letzten 8 Sekunden des eigenen Spiels).
  - Eigene Datei: eine Audiodatei oder Aufnahme mit bis zu 30 Sekunden. Sie wird auf dem Gerät gespeichert, ihr Grundton wird erkannt.
  - Mikrofon (live).
- **Aufnahme:** frei oder in Takten (1–64), samplegenau als Schleife.

## Mixer (Tab „Mixer“)

Jede Klangebene hat einen eigenen Kanalzug:

- **Spiel:** Klang (Spielfläche und Keyboard) und Ebene 2.
- **Puls:** Spur 1–4 und eine Puls-Gruppe als Gesamtregler.
- **Grund:** Bordun.
- **Rückwege:** Echo und Hall.
- **Summe.**

In Grundstellung klingt alles bitgenau wie ohne Mixer.

**Kanalzug:**
- Pegel (−∞ bis +6 dB), Balance, Stumm und Solo. Echo und Hall bleiben bei Solo hörbar; ein solo geschalteter Rückweg spielt nur den Effekt.
- Echo- und Hall-Anteil, relativ zum Anteil unter „Effekte“.
- Weg: durch die Effektkette oder direkt in die Summe.
- Tiefen- und Höhenschnitt, 3-Band-EQ mit verschiebbaren Mitten, Sättigung, Stereobreite.
- „Pumpen“: im Takt einer Puls-Spur weggedrückt, samplegenau.
- Die Klangquelle mit Oktave und Tonstufe. Die Tonstufe verschiebt um Stufen der Skala, die Zielnote wird angezeigt.

**Ansichten:**
- **Pult:** Pilzstiel-Fader mit Pegelanzeige im Stiel (RMS, Spitze, Haltepunkt, Übersteuerung). Dazu Lamellen-Regler und die Wege „Kette“ und „Direkt“ als Wurzeln im Boden.
- **Geflecht:** das Signalnetz als lebendes Myzel. Jede Spore steht so hoch wie ihr Pegel; Hyphen zeigen Weg und Sends.
- **Fruchtkörper:** die Detailansicht eines Kanals. Sie zeigt eine EQ-Kurve über dem Live-Spektrum, Sättigungskennlinie, Stereobild, Pumpen-Verlauf, Wege und Quelle.

**Summe:**
- Lautheit nach EBU R 128: Momentan, Kurzzeit, Integriert und LRA, mit 60-Sekunden-Verlauf gegen einen Zielwert.
- Spitze, Korrelation und Goniometer.
- Spektrum, eingefärbt nach dem Kanal, der jedes Band füllt.
- Verdichtung mit Anzeige der Pegelreduktion, Tiefen, Höhen und Breite.
- Mono- und −20-dB-Kontrolle; beide wirken nur auf das Abhören, nicht auf die Aufnahme.

**Szenen A/B:** speichern und mit einem Morph-Regler stufenlos überblenden.

**Puls-Tab:** „Spuren mischen“ mit Pegel, Balance, Stumm/Solo, Oktave und Tonstufe jeder Spur.

## Gerät: Qualität, Latenz, MIDI

- **Qualitätsstufen** (Tab „Gerät“): 1 · Leicht (Handys, wie bisher), 2 · Voll (mehr Stimmen gleichzeitig), 3 · Gewaltig (reichere Stimmen: sieben Oszillatoren im Nebel, Doppelsaiten, zwei Glocken pro Anschlag, mehr Teiltöne und Trommelmoden, dichtere Körner, Hall in echtem Stereo). Stufe 3 misst beim Start, wie viel das Gerät schafft, und füllt einen Prozessorkern – Browser rechnen allen Klang auf einem Echtzeit-Thread.
- **Latenz:** Der Klangweg hat keine Verzögerung mehr. Der Summen-Kompressor ist aus einfachen Web-Audio-Bausteinen nachgebaut, ohne die 6 ms Vorlauf des eingebauten Kompressors. „Minimal“ verlangt den kleinsten Ausgabepuffer, oft rund 3 statt 10 ms, und spielt die Verzerrung ohne Überabtastung, die 2,7 bis 4 ms kosten würde. Das Panel zeigt die gemessene Latenz.
- **MIDI-Keyboard** (Chrome/Edge auf Computer und Android, nicht Safari/iOS): anschließen und spielen; der Browser fragt am Computer beim ersten Start einmal nach der Erlaubnis. Tasten: Skala (rastet ein), weiße Tasten (Spalte für Spalte) oder chromatisch. Anschlagdynamik, Modulationsrad und Druck (Klangfarbe), Tonhöhenrad, Haltepedal, Hot-Plug.

## Aufbau

| Pfad | Inhalt |
|---|---|
| `myzel/index.html` | Die ganze App in einer Datei: HTML-Fragment mit CSS und JavaScript (Web Audio), einschließlich Mixer. Einzige Quelle für beide Varianten. |
| `myzel/tap-worklet.js` | AudioWorklet, das die Summe für Aufnahme und Echo-Körner bitgenau abgreift. |
| `myzel/pwa/build.py` | Baut daraus die installierbare Offline-App (Dokument-Hülle, lokale Schriften, Manifest, Service Worker). |
| `myzel/pwa/sw.js` | Service-Worker-Vorlage: speichert alle Dateien versioniert für den Offline-Betrieb. |
| `myzel/pwa/manifest.webmanifest`, `icons/`, `fonts/` | Installationsdaten, App-Icons (`tools/make_icons.py`), Schriften (SIL OFL 1.1). |
| `.github/workflows/pages.yml` | Veröffentlicht bei jedem Push auf GitHub Pages. |

## Entwickeln

- Die claude.ai-Version wird direkt aus `myzel/index.html` veröffentlicht (mit `tap-worklet.js` als Zusatzdatei und der Fähigkeit `downloads`).
- Lokal testen: `python3 myzel/pwa/build.py dist && npx http-server dist` und `http://localhost:8080` öffnen (Service Worker brauchen `localhost` oder HTTPS).
- Die App erkennt selbst, wo sie läuft: in claude.ai speichert sie Aufnahmen als ZIP über die Downloads-Fähigkeit, als eigenständige App direkt als WAV (iPhone: über das Teilen-Menü).
