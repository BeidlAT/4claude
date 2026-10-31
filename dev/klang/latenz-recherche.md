# Latenz unter Windows – Recherche (31.10.2026)

Anlass (Besitzer): „Die Einstellungen an meinem Steinberg-USB-Interface haben keinen Einfluss auf Myzel … ich würde die
Latenz gern senken – Hardware direkter ansprechen, Add-on, Codecs, Treiber?“ Quellen: Quelltext von Firefox
(mozilla-firefox/firefox), cubeb, Chromium; Microsoft-Doku; Steinberg-Handbücher. Nichts davon auf Windows-Hardware gemessen.

## Warum der ASIO-Puffer nichts ändert
Browser sprechen nie ASIO an. Firefox und Chrome geben über WASAPI im geteilten Modus aus; der Takt dort ist die Periode
der Windows-Audio-Engine (meist 10 ms = 480 Samples bei 48 kHz). Die „Buffer Size“ im Steinberg-Treiber gilt laut Handbuch
nur für ASIO. „Mode“ (Low Latency / Standard / Stable; früher „Base Period“) wirkt dagegen auch auf WDM/WASAPI – vermutlich
ein paar ms.

## Firefox (Hauptbrowser)
- Der schnelle Weg (IAudioClient3, kleine Perioden) ist in cubeb seit Firefox 72/76 abgeschaltet (`#if 0`, Bug 1590902,
  offen). Firefox bleibt bei der Standard-Periode des Geräts.
- `latencyHint` wird ignoriert (AudioContextOptions kennt nur sampleRate); `baseLatency` ist fest 0; `outputLatency`
  gemessen. → Myzels Wahl „Minimal/Standard/Sicher“ wirkt in Firefox nicht (steht seit 31.10. auf der Karte).
- about:config: `media.cubeb_latency_mtg_frames` (Web-Audio-Puffer in Samples, Standard = Geräteperiode) – probeweise
  384/256, kann Aussetzer bringen; `media.cubeb.wasapi-raw` = 2 umgeht Windows-Klangeffekte (am UR kaum Gewinn).
  `media.cubeb_latency_playback_ms` betrifft nur <audio>/<video>. `media.cubeb.sandbox` nicht abschalten.
- MIDI: Firefox-Web-MIDI über midir → WinMM, ≈ 1–3 ms.

## Chrome
Nutzt IAudioClient3, wenn `latencyHint` eine Zahl ≤ Mindestperiode ist (Myzel „Minimal“ = 0) – hilft nur, wenn der Treiber
kleinere Perioden als 10 ms meldet. Test: in Chrome `new AudioContext({latencyHint:0}).baseLatency` – deutlich unter 0,01
heißt: der Yamaha-Treiber kann es. `--enable-exclusive-audio` (exklusiv, 256 Samples) ist experimentell und sperrt das Gerät.

## Was es sonst gibt
- Kein Browser-Add-on kann den Ausgabeweg ändern. ASIO4ALL/FlexASIO/Voicemeeter helfen nicht (eher mehr Latenz).
- REAL (github.com/miniant-git/REAL) stellt die Windows-Engine auf die Mindestperiode – nur wenn der Treiber das kann;
  zusammen mit dem Firefox-Pref vielleicht ≈ 5 ms.
- Einziger großer Gewinn (15–30 ms): eine native Hülle (z. B. Tauri) mit ASIO-Ausgabe – der Klang müsste dann nativ
  gerechnet werden: großer Umbau, nur nach Besitzer-Entscheid.
- Configurable render quantum (`renderSizeHint`): nur Chrome-Testphase, bringt bei 10-ms-Periode nichts.

## In Myzel
- „Zeitpunkt einer Note: Gleichmäßig“ (midiAt) setzt eine Note um Puffer + 5 ms nach dem Tastenstempel – in Firefox mit
  baseLatency 0 also 128 Samples + 5 ms ≈ 7,7 ms, kürzer als Firefox' 10-ms-Takt: gelegentlich greift dann „so bald wie
  möglich“. Mögliche Verbesserung (offen): Abbildung über `getOutputTimestamp()`.
- Reihenfolge für den Besitzer: 1. messen (Taste → Ton, Handy-Aufnahme); 2. Treiber „Mode: Low Latency“, 48 kHz überall;
  3. Firefox-Pref testen; 4. Chrome-Test, ob der Treiber kleine Perioden kann; 5. nur bei Bedarf: native Hülle.
