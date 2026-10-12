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
- **Keyboard & Controller** (Tab „Gerät“; Chrome, Edge oder Samsung Internet auf Computer und Android):
  - **USB:** einstecken und spielen. Der Browser fragt einmal nach der Erlaubnis; auf Handys startet „Mit Keyboard starten“ Klang und MIDI in einem Tipp.
  - **Bluetooth:** „Bluetooth-Keyboard koppeln“ verbindet Bluetooth-MIDI-Keyboards direkt aus dem Browser, ohne Zusatz-App. Das ist nötig, weil Android-Chrome in den Einstellungen gekoppelte Keyboards nicht sieht. Nach einem Neuladen genügt „Wieder verbinden“.
  - **Geräteprofile:** KORG nanoKEY Studio (Regler, X-Y-Pad als Finger auf der Spielfläche, Touch Scale, Pads als Töne oder Auslöser), KORG microKEY Air (Joystick, Sustain), nanoKONTROL2 (steuert den Mixer), nanoPAD2, Akai MPK mini, Arturia MiniLab 3/KeyStep, Novation Launchkey Mini und weitere. Dazu die üblichen General-MIDI-Regler.
  - **Zuweisen:** MIDI-Lernen für jeden Regler in der App, auch im Mixer. Dazu ein MIDI-Monitor.
  - **Weitere Funktionen:**
    - MPE (Seaboard, LUMI, LinnStrument …);
    - Anschlagkurven;
    - Programmwechsel lädt Presets;
    - Start/Stop und MIDI-Clock vom Gerät (der Puls folgt);
    - Puls-Tempo an ein Keyboard senden (Arpeggiator folgt, nur über USB);
    - mehrere Geräte gleichzeitig.
  - **Plattformen:**
    - Auf iPhone und iPad haben Safari und alle iOS-Browser kein MIDI. Apps wie „Web MIDI Browser“ oder „Bluefy“ könnten es nachrüsten; das ist ungetestet.
    - In der claude.ai-Ansicht ist MIDI gesperrt.

## Gestik (Bewegung)

Das Handy wird Teil des Instruments: Finger, Tasten oder der Puls wählen die Töne, die Bewegung des Geräts formt sie. Einschalten unter „Gerät → Gestik einschalten“; die Erlaubnis wird in diesem Tipp angefragt. Gestik verändert nie das Preset: Alles läuft über eine eigene Modulationsschicht, ohne „Preset geändert“.

- **Das Gerät „Gestik“** steht neben den Keyboards. Es hat 5 Achsen (Neigen ↔, Neigen ↕, Bebung, Drehen, Ladung) und 3 Ereignisse (Wenden, Ruhe, Schütteln), alle mit „Zuweisen“ auf jedes Ziel lernbar. Die Wasserwaage zeigt die Neigung: Doppeltipp setzt den Nullpunkt, Ziehen neigt ohne Sensor.
- **Die Musik ist die Kupplung:** Gestik wirkt, solange ein Ton klingt (Finger, Taste oder Haltepedal). Der Nullpunkt ist die Haltung beim ersten Anschlag, Loslassen führt alles zurück. Festhalten friert die Form ein: ein Pad „Gestik festhalten“, auf Wunsch auch das Haltepedal. Wahlweise wirkt sie „Immer“ oder nur mit einer „Taste“.
- **Sechs Funktionen:**
  - **Anlehnen:** Vor- und Zurückneigen formt die Klangfarbe der gehaltenen Töne. Seitlich biegt es den neuesten Ton (bei einem Akkord den obersten) nach einer kleinen Ruhezone zur Nachbarstufe der Skala und rastet ab 80 % ein. Bebung ist ein Vibrato aus dem Handgelenk. Tragen gibt es auf Wunsch.
  - **Ladung:** Schütteln lädt das Myzel auf (dichtere Körner, Regen, ein vollerer Puls, leierndes Echo). Danach entlädt es sich über 0,3 bis 30 s. Schwenken, also Kreisen wie mit einem Weinglas, lässt gehaltene Töne singen.
  - **Schlafen:** Display nach unten friert den Klang ein (Freeze-Kadenz, Stille oder Szene B). Zurückdrehen weckt ihn. Nach einer halben Minute klingt der Schweif aus, und nach langem Schlaf wacht Myzel still auf. Liegt das Handy still auf dem Display, ruhen Berührungen; in der Hand, etwa im Liegen über dem Gesicht, weckt es ein Finger auf dem Display.
  - **Fährte:** Bewegung wird im Takt mitgeschrieben. Ein Tipp macht die letzten 1, 2 oder 4 Takte zur Schleife, die mit jedem Durchgang verblasst. Sie nimmt auch jeden anderen stetigen Regler auf, deshalb nützt sie auch am Computer.
  - **Sporenregen:** Gespielte Töne werden leuchtende Keime. Geneigte Sporen rollen darüber und spielen sie im Raster des Pulses, auf einem eigenen Mixer-Kanal „Regen“ (im Pult, sobald es regnen kann). Flach hingelegt wird es still; an einem Ständer zählt die Waagerechte, und eine von Hand gezogene Neigung bleibt stehen.
  - **Funkstrecke:** sendet die Gestik als MIDI (14-Bit-NRPN auf Kanal 16), etwa per USB an einen Computer. Myzel erkennt sie dort als „Gestik (Handy)“. Ob ein Handy dafür einen MIDI-Ausgang bekommt, ist ungetestet.
- **Rezepte:** Manche Presets bringen Gestik-Einstellungen mit. Sie wirken, solange Gestik an ist; eigene Zuweisungen gehen vor.
- **Messen:** Rate, Gyroskop, Vorzeichen und die Verzögerung (Klopf-Messung mit dem Mikrofon). „Spur aufnehmen“ speichert 30 s Rohdaten für Fehlerberichte.
- **Plattformen:**
  - **Android-Handys:** alles, Haptik nur hier. Bebung, Drehen und Schwenken brauchen ein Gyroskop; fehlt es, sagt die Karte das.
  - **iPhone und iPad:** Die Erlaubnis kommt im Tipp. Auf dem iPad ist Bebung zuerst aus (zu schwer fürs Handgelenk), der Sporenregen geht gut auf dem Schoß. Mit Gestik bekommen iPhone und iPad erstmals die Zuordnungen.
  - **Computer:** meist ohne Sensor. Dort zieht man die Wasserwaage, nimmt Regler mit der Fährte auf oder holt ein Handy per Funkstrecke.
  - **claude.ai-Ansicht:** Bewegung ist gesperrt. Wasserwaage, Sporenregen und Fährte gehen trotzdem.
- **Ehrliche Grenzen:**
  - Der Browser liefert Bewegung mit etwa 60 Hz und geschätzt 40 bis 100 ms Verzögerung. Deshalb formt, lädt und lenkt Gestik nur; sie wählt nie Töne und löst keine frei getimten Schläge aus.
  - Der Bildschirm muss an bleiben. Myzel hält ihn wach, das kostet Akku.
  - Starkes Neigen kann die Ansicht drehen. Dagegen helfen die Drehsperre des Geräts oder „Vollbild mit Drehsperre“ (Android).
  - Systemgesten wie „Schütteln zum Widerrufen“ kann eine Web-App nicht abfangen.
  - Die Schwellen passen sich dem Grundrauschen des Geräts an. Getestet ist alles mit simulierten Sensoren, auf echten Geräten noch kaum.

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
