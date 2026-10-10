# Sphärenwerk

Ein Musikinstrument für das iPad als Web-App: Flächenklänge, gestimmtes Schlagwerk und die eigene Stimme,
verkabelt wie ein Modularsystem. Alles liegt im Raster einer Tonleiter; jede Stufe trägt das Zeichen eines
Himmelskörpers.

## Starten

Die App braucht einen Webserver mit HTTPS (für Mikrofon, Service Worker und „Zum Home-Bildschirm“).
Einen Build-Schritt gibt es nicht: Der Ordner `ipadmuzika/` wird so, wie er ist, ausgeliefert.

Lokal zum Ausprobieren:

```sh
npx http-server ipadmuzika -p 8080
```

## Aufbau

| Datei | Inhalt |
|---|---|
| `engine.js` | Klangmaschine als AudioWorklet: alle Organe, Kabel, Transport, Aufnahme-Abgriff |
| `js/defs.js` | Bauplan der Organe: Regler, Bereiche, Buchsen, Texte |
| `js/scale.js` | Tonleitern, Stimmungen, Notennamen, Zeichen und Farben der Stufen |
| `js/machine.js` | Zustand der Maschine, Rückgängig, Autospeicher |
| `js/rituale.js` | fertige Maschinen (Rituale) |
| `js/audio.js` | Brücke zur Klangmaschine, Mikrofon, Neigung |
| `js/werk.js`, `js/displays.js` | Werkbank: Organe, Drehregler, Buchsen, Kabel, Anzeigen |
| `js/pad.js` | Pad, Halten-Kugeln, Geisterhand |
| `js/recorder.js` | Takt-Aufnahme, WAV-Export, IndexedDB |
| `js/oracle.js` | Orakelkarten |
| `js/main.js` | Start, Leiste, Blätter, Zeichenschleife |

## Prüfen

```sh
node tools/engine-test.js                                  # Klangmaschine in Node
NODE_PATH=$(npm root -g) node tools/browser-func.js        # Bedienung in Chromium
NODE_PATH=$(npm root -g) node tools/browser-check.js       # Bildschirmfotos
NODE_PATH=$(npm root -g) node tools/levels.js              # Pegel aller Rituale
```
