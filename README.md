# Myzel

Ein Touch-Instrument für ambiente, perkussive, experimentelle und psychedelische Klänge – im Browser, gemacht fürs Handy.

- **Als App (auch offline):** https://beidlat.github.io/4claude/ – im Browser öffnen, dann „Teilen → Zum Home-Bildschirm“ (iPhone) bzw. „App installieren“ (Android).
- **In claude.ai:** https://claude.ai/artifact/HNZYLEaUvtCfkyYWi3SuDr (privat)

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
