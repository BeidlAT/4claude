# Myzel als eigenes Programm mit ASIO – was es bedeuten würde (31.10.2026)

Anlass (Besitzer): Der Steinberg-Treiber wirkt im Browser nicht. Sein Leistungsbericht aus Chrome zeigt 10 ms Puffer
(`base=10`, mehr gibt Windows dem Browser mit diesem Treiber nicht) und dahinter 48–64 ms bis zum Ausgang (`out`). Der
Exklusiv-Modus von Chrome machte es 50 ms schlechter. Im Browser ist hier nichts mehr zu holen
(`dev/klang/latenz-recherche.md`).

## Was es bringen würde
- ASIO spricht das Interface direkt an. Der Puffer ist der, den man im Steinberg-Treiber einstellt: 64 Samples bei
  48 kHz sind 1,3 ms; mit USB-Weg und Wandlern üblicherweise **etwa 3–7 ms** vom Klang bis zum Ausgang.
- Heute in Chrome laut Bericht ≈ 70 ms. Firefox liegt wahrscheinlich darunter (sein Bericht fehlt noch), aber kaum unter
  ≈ 20 ms, wegen des 10-ms-Takts von Windows.
- Die Einstellungen im Steinberg-Treiber würden endlich wirken – im eigenen Programm, nicht im Browser.
- Dazu: der Klang läuft nicht mehr auf dem einen Browser-Kern unter Fremdlast (Tabs, Bildschirm). Ob er schneller
  rechnet, hängt vom Weg ab (unten).

## Der Weg, der am meisten von Myzel behält
Myzel ist ≈ 44 000 Zeilen JavaScript, davon ≈ 7 000 eigene Klangprozessoren (AudioWorklet: Hexenring-Ring, Effekte,
Verdichter, Begrenzer, Sättigung, Touché-Klangformung, Gespinst …). Die Klangquellen bauen außerdem auf Bausteinen des
Browsers (Oszillatoren, Filter, Verzögerungen, Waveshaper, Faltungshall, HRTF-Panner, Puffer-Quellen). Neu schreiben kommt
nicht in Frage – der Klang soll exakt bleiben.

**Vorschlag: eine Desktop-Hülle (Electron) + eine fertige Web-Audio-Nachbildung in Rust mit ASIO.**
- Die Seite bleibt, wie sie ist (Bedienung, Spielfläche, MIDI über Web MIDI von Chromium).
- Nur `AudioContext` wird ausgetauscht: statt des Browsers rechnet `web-audio-api-rs` (IRCAM, Rust; Node-Anbindung
  `node-web-audio-api`) den Klanggraphen und gibt über `cpal` aus – mit der Option `cpal-asio` über **ASIO**.
- Steinberg hat das ASIO-SDK im Oktober 2025 zusätzlich unter **GPLv3** gestellt; kostenlos war es schon vorher.
  Ein eigenes Programm darf es damit ohne Sondervertrag einbinden (genauen Lizenztext vor dem Bau prüfen).

## Was unsicher ist (darum zuerst ein Probe-Bau)
1. **AudioWorklet in der Node-Anbindung**: Die Rust-Bibliothek hat AudioWorklet; ob und wie die Node-Anbindung Myzels
   JavaScript-Prozessoren ausführt (eigener Thread? wie schnell?), ist nicht belegt. Myzels wichtigste Teile hängen daran.
2. **Klang-Gleichheit**: Filter, Oszillatoren, Hall und Panner sind dort eigene Umsetzungen – kleine Unterschiede im
   Klang sind möglich. Myzel hat Paritäts-Tests; sie müssten gegen den Browser-Klang laufen.
3. **Fehlende Teile**: Mikrofon-Eingang ist dort „minimal“; `OfflineAudioContext` (Messung der Qualitätsstufe,
   Hexenring-Werk), `getOutputTimestamp`, Aussetzer-Statistik, `setValueCurveAtTime` u. a. müssten geprüft werden.
4. **ASIO-Bau**: die fertigen Pakete enthalten kein ASIO – es braucht einen eigenen Windows-Bau (LLVM/Clang, ASIO-SDK).
   Das kann ein GitHub-Actions-Lauf auf Windows erledigen; **testen kann nur der Besitzer** (hier gibt es kein Windows
   und keine Audio-Hardware).

## Was sich für dich ändern würde
- Myzel gäbe es zweimal: wie heute im Browser (Firefox, iPad – bleibt) **und** als Windows-Programm zum Installieren.
- Updates: nicht mehr von selbst wie die Web-App, sondern über eine Update-Funktion des Programms.
- Windows warnt beim ersten Start eines nicht signierten Programms („Trotzdem ausführen“) – ein Signatur-Zertifikat
  kostet Geld (≈ 100–400 €/Jahr), ohne geht es auch.
- ASIO gehört dann Myzel: andere Programme können je nach Treiber nicht gleichzeitig über das Interface spielen.
- Presets und Einstellungen: das Programm hat seinen eigenen Speicher – Übernahme über „Exportieren/Importieren“.

## Aufwand und Reihenfolge (in Sitzungen wie dieser)
1. **Probe-Bau (1–2)**: Electron + `node-web-audio-api`, `AudioContext` ausgetauscht, Myzel starten, Liste dessen, was
   bricht. Zuerst ohne ASIO (WASAPI), um die Lücken zu sehen. → Danach Entscheidung: weiter oder lassen.
2. **Lücken schließen (2–5)**: AudioWorklet-Anbindung, fehlende Funktionen nachbilden, Paritäts-Tests.
3. **ASIO-Bau (1–2)**: Windows-Bau mit `cpal-asio`, Gerät und Puffergröße wählbar in „Gerät“.
4. **Paket (1–2)**: Installer, Update-Weg, Hinweise.
Zusammen grob **6–12 Sitzungen**, mit echtem Risiko beim AudioWorklet (Punkt 1 der Unsicherheiten).

## Andere Wege (verworfen oder später)
- **Alles nativ neu (Rust/C++, z. B. JUCE)**: schnellster Klang, aber die ganzen Klangquellen und den Hexenring neu
  schreiben – um ein Vielfaches mehr Arbeit, und der Klang wäre nicht mehr derselbe.
- **Browser + Zusatzprogramm**: bringt nichts – der Puffer des Browsers bleibt.
- **Tauri statt Electron**: kleiner, aber die Seite liefe in WebView2 (Chromium) ohne Node – der Klang müsste über eine
  Brücke laufen; mehr Umbau.

## Empfehlung
Erst der Probe-Bau (1–2 Sitzungen). Er zeigt, ob die Rust-Nachbildung Myzels Klangprozessoren trägt und wie es klingt.
Erst danach lohnt die Entscheidung für den ganzen Weg. Vorher hilft ein Leistungsbericht aus Firefox, um zu wissen, wie
viel der Browser-Weg dort heute wirklich kostet.

Quellen: cpal (ASIO-Feature, CPAL_ASIO_DIR) https://docs.rs/crate/cpal/latest · web-audio-api-rs (Feature `cpal-asio`,
Node-Anbindung) https://docs.rs/crate/web-audio-api/0.33.0 · node-web-audio-api https://github.com/ircam-ismm/node-web-audio-api
· ASIO unter GPLv3 (Okt. 2025) https://heise.de/-10963451
