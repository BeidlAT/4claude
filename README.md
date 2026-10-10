# Myzel

Ein Touch-Instrument für ambiente, perkussive, experimentelle und psychedelische Klänge – im Browser, gemacht fürs Handy.

- **Als App (auch offline):** https://beidlat.github.io/4claude/ – im Browser öffnen, dann „Teilen → Zum Home-Bildschirm“ (iPhone) bzw. „App installieren“ (Android).
- **In claude.ai:** https://claude.ai/artifact/HNZYLEaUvtCfkyYWi3SuDr (privat)

## Gerät: Qualität, Latenz, MIDI

- **Qualitätsstufen** (Tab „Gerät“): 1 · Leicht (Handys, wie bisher), 2 · Voll (mehr Stimmen gleichzeitig), 3 · Gewaltig (reichere Stimmen: sieben Oszillatoren im Nebel, Doppelsaiten, zwei Glocken pro Anschlag, mehr Teiltöne und Trommelmoden, dichtere Körner, Hall in echtem Stereo). Stufe 3 misst beim Start, wie viel das Gerät schafft, und füllt einen Prozessorkern – Browser rechnen allen Klang auf einem Echtzeit-Thread.
- **Latenz:** Der Klangweg hat keine Verzögerung mehr. Der Summen-Kompressor ist aus einfachen Web-Audio-Bausteinen nachgebaut, ohne die 6 ms Vorlauf des eingebauten Kompressors. „Minimal“ verlangt den kleinsten Ausgabepuffer, oft rund 3 statt 10 ms, und spielt die Verzerrung ohne Überabtastung, die 2,7 bis 4 ms kosten würde. Das Panel zeigt die gemessene Latenz.
- **MIDI-Keyboard** (Chrome/Edge auf Computer und Android, nicht Safari/iOS): anschließen und spielen; der Browser fragt am Computer beim ersten Start einmal nach der Erlaubnis. Tasten: Skala (rastet ein), weiße Tasten (Spalte für Spalte) oder chromatisch. Anschlagdynamik, Modulationsrad und Druck (Klangfarbe), Tonhöhenrad, Haltepedal, Hot-Plug.

## Aufbau

| Pfad | Inhalt |
|---|---|
| `myzel/index.html` | Die ganze App in einer Datei: HTML-Fragment mit CSS und JavaScript (Web Audio). Einzige Quelle für beide Varianten. |
| `myzel/tap-worklet.js` | AudioWorklet, das die Summe für Aufnahme und Echo-Körner bitgenau abgreift. |
| `myzel/pwa/build.py` | Baut daraus die installierbare Offline-App (Dokument-Hülle, lokale Schriften, Manifest, Service Worker). |
| `myzel/pwa/sw.js` | Service-Worker-Vorlage: speichert alle Dateien versioniert für den Offline-Betrieb. |
| `myzel/pwa/manifest.webmanifest`, `icons/`, `fonts/` | Installationsdaten, App-Icons (`tools/make_icons.py`), Schriften (SIL OFL 1.1). |
| `.github/workflows/pages.yml` | Veröffentlicht bei jedem Push auf GitHub Pages. |

## Entwickeln

- Die claude.ai-Version wird direkt aus `myzel/index.html` veröffentlicht (mit `tap-worklet.js` als Zusatzdatei und der Fähigkeit `downloads`).
- Lokal testen: `python3 myzel/pwa/build.py dist && npx http-server dist` und `http://localhost:8080` öffnen (Service Worker brauchen `localhost` oder HTTPS).
- Die App erkennt selbst, wo sie läuft: in claude.ai speichert sie Aufnahmen als ZIP über die Downloads-Fähigkeit, als eigenständige App direkt als WAV (iPhone: über das Teilen-Menü).
