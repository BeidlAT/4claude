# Offen – die eine aktuelle Liste (Stand 30.10.2026, nach PR #115)

Zuerst lesen. Wird bei jedem Abschluss gepflegt: Erledigtes streichen (mit PR), Neues eintragen. Einzelheiten und
Begründungen stehen in `dev/STAND-2026-10-29.md` (Abschnitte „Danach (30.10.) …“) und den verlinkten Dokumenten.

## Wartet auf den Besitzer (er entscheidet / hört selbst)
1. **Hüllkurven:** welche Stufe bauen – Stufe 1 klassisches ADSR je Klangquelle, Stufe 2 zweite Hüllkurve (Helligkeit,
   Tonhöhe, Quell-Regler), Stufe 3 Frickler (zeichenbar, Schleifen, Zufall, Modulationsmatrix). Konzept:
   `dev/klang/huellkurven-recherche.md`. Wichtig: Firefox hat kein `cancelAndHoldAtTime` → Hüllkurven im Worklet.
2. **Ebenen – Fragen:** Mute wird gespeichert, Solo nicht – so gewollt? Tonbereich gilt nur beim Anschlag (gleitender
   Finger wechselt die Ebene nicht; neue Anschläge – „Anreißen“, Sporenwerk, Touché-Arp – nehmen seit dem Review vom
   30.10. die Ebenen der neuen Tonhöhe). Anschlagsbereich wirkt auf der Fläche nur über MIDI/„Anschlag“. Export einer
   Hexenring-Leiste als Preset nimmt nur Ebene 2 mit. (`dev/klang/ebenen-recherche.md` → „Stufe 1 gebaut“)
3. **Ebenen – Stufen 2/3** (Makros, Überblend-Wähler, Ebene als Baustein speichern, Vorlagen): erst nach seinem Okay.
4. **Presets mit vielen Ebenen:** neue bauen oder bestehende „aufpimpen“ nur nach seinem Okay je Preset; bestehende
   bleiben vorerst unverändert.
5. **Design:** Bewegung steht auf der Effekte-Seite jetzt nach Schweben (Signalweg) – recht so? Neues Aussehen (Regler,
   Karten) in Firefox und auf dem iPad ansehen. Mögliche nächste Schritte: Bild je Klangquelle auf der Klang-Seite,
   einklappbare Karten (`dev/klang/design-konzept.md`).
6. **Verzerrer in Presets – er hört selbst** (Liste vom 30.10.): Regenwald (Schwarm-Spur +6 dB über 8 kHz durch den
   Standard-Drive), Traumzeit (Jahresring-Spur +5), Westküstenbongos (+4), Kurzwellenritual (+8,5, Drive dort gewollt
   hoch). Gewollte Rausch-Klangfarben: Moder-Knistern, Tunnelblick, Membran-Fell, Hi-Hats. Nichts ändern ohne seine Ansage.
7. **Kurzwellenritual (neu, #113):** sein Urteil steht aus.
8. **Handpan:** bleibt wie sie ist (Besitzer 30.10.: „in Myzel sauber … lass das Preset so“). Der Pilot liegt in Branch
   `worktree-agent-abdf55b3a423a3add` (f57bc8e); falls er zurückkommt: das Mitschwingen der anderen Felder war mit
   −20…−25 dB viel zu laut (Halbton-Cluster E/F) – deutlich leiser machen.
9. **Firefox zum Testen:** in den Umgebungs-Einstellungen „Network access“ freigeben (cdn.playwright.dev,
   playwright.download.prss.microsoft.com, playwright.azureedge.net, ftp.mozilla.org, download-installer.cdn.mozilla.net)
   – bis dahin laufen alle Tests nur in Chromium (immer dazusagen).

11. **Latenz (31.10.):** Im Browser ist mit seinem Steinberg-Treiber nichts mehr zu holen (Chrome-Bericht: 10 ms Puffer +
   48–64 ms Ausgang; Exklusiv-Modus +50 ms). Firefox-Bericht steht aus. Entscheidung offen: eigenes Programm mit ASIO –
   Konzept `dev/klang/nativ-asio-konzept.md` (zuerst Probe-Bau Electron + node-web-audio-api, 1–2 Sitzungen).

## Für die nächste Sitzung zu tun (ohne weitere Rückfrage)
## Erledigt am 31.10.
<<<<<<< Updated upstream
=======
Wege-Bedienung umgebaut (Besitzer: „F anklicken macht keinen Unterschied … mehrere aktivieren/deaktivieren … schlüsselfertig“):
die Perlen V R F P S sind die Schalter des bearbeiteten Kanals (`WFX.t` – gewählt im Mixer über `selectChannel`, Puls =
alle Spuren, Hexenring = alle Schleifen, Schleife durch Antippen ihres Kanals/Knotens), leuchten in seiner Farbe, Name
darunter; Alt = nur dieser, Umschalt = nur solange; Knoten = Kette ↔ Direkt mit gemerkter Auswahl; Effekt-Blick entfernt.
Test `t-wege-fx.js` spielt es hörbar durch.
Schleifen-Neugenerierung blieb stecken (Besitzer: Neustart mit 3 Schleifen, Leere Erde → „0 von … fertig“ für immer):
`hxwCall` (werk.js) hatte keine Frist – ein Rahmen, der nicht antwortet, hielt `S.wBusy` ewig. Jetzt Frist je Auftrag
(`hxwLimit`, 20 s + 8 s je Sekunde Audio), danach `hxwKill` (alle Wartenden bekommen null, Neustart beim nächsten
Auftrag; dreimal in 2 min → bleibt aus); Start-Fehler dürfen nach 20 s erneut; `hxWRenderFor` mit catch, zwei
Wiederholungen, dann bleibt die Schleife beim alten Klang (`S.wSkip`); ✕ am Ladebalken (`hxLadeCancel`, `S.wGen`). Test
`hexenring/t-hx-lade.js`. Die eigentliche Ursache des Hängers in Firefox ist damit abgefangen, aber nicht gefunden –
bei Gelegenheit die Werk-Protokollzeilen („rahmen-haengt“, „keine-antwort“) aus dem Leistungsbericht ansehen.
>>>>>>> Stashed changes
Routing je Kanal durch einzelne Effekte (Besitzer: „überrasche mich … Design so behalten, mit den Neuerungen“):
`makeChain(m)` mit Maske (core/chain.js, 1 V · 2 R · 4 F · 8 P · 16 S; ausgelassene Stufen gebaut, nicht verdrahtet);
Parameter `x<k>.fxm` je Kanal; `mixer/wege-fx.js`: eine Kette je benutzter Maske (`fxmIn`/`fxmChain`, Sends über eigene
Kopien je Maske in `updSends`), Effekt-Blick (Perle antippen), Malen, Alt/Umschalt/Esc, feiner Ring je Knoten, Lichtpunkte
hüpfen/leuchten an den Perlen, Knoten der Schleifen im Pult (`FXL`). Schleifen: `hexenring/weg.js` – L.weg/L.fxm, der
Prozessor gibt die Schleife über `rt` an ihr Paar von Ausgang 2 ab (Nähren-Paar), Seite → Kette der Maske → Strip
„Hexenring“; neue Schleifen spielen Direkt; Kanal „Hexenring“ setzt alle (`hxRouteAll`). „K“ entfernt, A/B-Morph schaltet
Masken in der Mitte. Tests `midi-tests/t-wege-fx.js`, `hexenring/t-hx-route.js` (neu gefasst). Offen fürs Auge/Ohr: die
Leiste in Firefox; Tastatur-Kürzel V/R/F/P/S (nicht gebaut – „r“ ist im Pult schon „Spitze zurücksetzen“); Wege in den
Szenen A/B weich überblenden (Idee, noch nicht gebaut).
Testserver (Besitzer: „wieso beenden die ganze Zeit die Testserver?“): der Container der Sitzung wird bei Leerlauf neu
gestartet – alle Prozesse enden, das Scratchpad bleibt; außerdem brach `setup-tests.sh` im flachen Klon vor dem Serverstart ab
(alte Grundlagen-Commits fehlen). Jetzt `dev/tests/serve.sh` (startet :8790 nur wenn nötig), aufgerufen von `setup-tests.sh`,
`v2/mk.sh` und `midi-tests/h.js` (vor jedem Browserstart); fehlende Grundlagen nur gemeldet.
Touché-Spielweise „Gestik“ (Besitzer: „mit dem Touché die Gestik des Handys vollständig nachmachen“): `midi/touche-gestik.js`
– ein künstlicher Funkstrecken-Sender (`TCHG.src`, `syn`, über `gkRemOn`/`gkrDue`/`gkRemIn`), 100 Hz: Neigen = Weg der Haut
(×1,15 Weite), Bebung = 2,5–10 Hz im Druck, Drehen/Schwenken = Kreisen, Ladung = schnelle Bewegung (Gesetz des Handys),
Schütteln = ≥3 Umkehrungen in 600 ms (+ Peaks), Wenden = zweimal kurz heran (Umschalter), Ruhe = Hand weg 1,5 s; Ruhelage
bleibt die Null. Test `t-tch-gestik.js` 8/8. Offen fürs Gefühl: Schwellen (Bebung recht empfindlich, Doppel-Heran als
Schlafen) mit dem echten Touché in Firefox; die Kupplung „Bei Tönen“ wirkt wie am Handy (Neigen nur bei gehaltenen Tönen).
Eigene Touché-Spielweisen (Besitzer: „je Richtung Ziel, Stärke und Kurve; speichern und benennen“): `midi/touche-eigen.js`
(TCHE, gespeichert `myzel.tch.eigen.v1`): Grundlage (eine der 16 oder keine) + je Richtung Zeilen {Ziel, Stärke −100…100 %,
Kurve}; Ziele = Eingänge der Grundlage (`b:weg` …, Tauschen/Abschalten), alle Formen-Ziele (MODT), Gleiten, Vibrato,
Vibrato-Tempo, Band der Schleife. `tchApply` (touche.js) rechnet über `tchEigRoute`. Karte: Reihe „Eigene Spielweisen“ +
„＋ Eigene aus dieser“/„Bearbeiten …“; Editor als Vollbild-Dialog mit Live-Anzeige je Richtung. Test `t-tch-eigen.js`.
Offen fürs Ohr/Auge: Bedienung des Editors in Firefox, ob weitere Ziele (Insert-Parameter der Klangformung) gewünscht sind.
Qualitätsstufen (Besitzer: „nicht nachvollziehbar, widersprüchlich“): ungemessen hatte Stufe 3 25 Nebel-Stimmen gegen
40 in Stufe 2, auf langsameren Rechnern fiel Stufe 2 unter Stufe 1 – jetzt `qBudgets()` (quality.js): eine Messung, Stufe
für Stufe nie weniger Rechenzeit, die Karte nennt alle drei Zahlen; Test `midi-tests/t-qstufen.js`. Latenz-Karte sagt in
Firefox, dass die Wahl dort nicht wirkt (latencyHint ignoriert) und was wirkt.
Besitzer: „unbinde alle F-Tasten, Touché-Preset-Code weg, Presets am Screen anordnen, Stottern knackst bei Chill-Hop
Abend“ → F-Tasten frei (keine Presets F1–F10, keine Spielweisen F1–F12, kein Umschalt+F10 im Geflecht), Touché-Schalter
(Program Change, `tchIn`) blättern keine Presets mehr, Test `t-fkeys.js` entfernt; Spielweise-Knöpfe der Touché-Karte als
Raster (`.kc-tch`, 4 Spalten, schmal 2). Stottern (`dsp/touche-fx.js`): Ausschnitt endet immer am Druckmoment (`S.at`) –
eine längere Teilung las vorher über den Ring-Kopf hinaus, die Naht passte bei Längenwechsel nicht; Pegelschritt (heran)
gleitet; erneuter Druck im Ausklingen setzt fort. Neuer Prüfpunkt in `t-tch-fx.js` (Krümmung 0,071 → 0,003, Chromium).
Danach („Stottern ist generell nicht clean“): Naht 10 ms Hann statt 3 ms linear, Ein/Aus ~25 ms, weg/heran erst ab
16 % (Mitdrücken verstimmte und dunkelte), Teilung mit Hysterese, Tiefpass erst mit heran. Prüfpunkt „Stottern clean“
(Bass-Naht: Krümmung 180× → 1× der eigenen). Offen fürs Ohr: Stottern im Chill-Hop Abend mit dem echten Touché in Firefox.

## Erledigt am 30.10. (zur Orientierung)
(ungemergt, Besitzer: „warte mit GitHub, es kommen noch Kleinigkeiten“) Punkt 11: ein Rückweg „Wandel“ statt
Effekt/Effekt 2 (`FX_RETS` nur `fx`, kurze Texte in `FX_TYPES`), Weg `fx.weg` Direkt / Durch die Kette (`fxKetteIn`,
Kettenkopie → Summe), neuer Effekt „Flechtwerk“ (`myzel-flecht`, euklidisches Tor-/Filter-/Seiten-Muster auf dem Takt des
Taktgebers, `fxGrid`; 1,1 Einheiten), Test `v2/t-wandel.js`. Offen fürs Ohr: Flechtwerk-Grundwerte (6 von 16, Tiefe 80 %,
Filter 50 %) und ob der Wandel in einem Preset „Durch die Kette“ laufen soll. · Punkt 10: eigene Presets überschreiben (`saveUserPreset`,
„Überschreiben“ je Zeile, Strg+S, geladenes markiert über `UI.upr`), Test `v2/t-presets-own.js` · #122 Punkt 9: Strip-Weg „Kette“ doppelte die Effekte (eingebranntes Audio durch die Kettenkopie) – jetzt „Kette“ = alle
Schleifen folgen (hxRouteAll → hxFolgt, out 1), Strip immer direkt (hxRoute = hxGateM); Weg-Schalter „K“ je Schleife im
Hexenring-Mixer; neue Schleifen übernehmen den Strip-Weg. · #121 Punkt 7 Schalter im Bearbeiten-Fenster (`hexenring/klangebene.js`: Klangfarbe-Ebene `L.rx` über Abdruck und Wuchs-
Version, Basis `S.rxB` gespeichert als ~r/~q; Zeit/Noten/Trimmen als Schalter) · Punkt 8 F1–F10 Presets (mit Touché
Strg+F1–F10), Touché-Schalter per Program Change (`tchIn`). Nach Band-Werkzeugen, die neues Audio schreiben (rückwärts,
Verdoppeln, Abschnitt-Schritte) gilt das aktuelle Audio als neue Basis – die Klangfarbe ist dann fest im Band; ↶ oder
„Grundeinstellung“ holen das Original. Offen fürs Ohr: ob der Touché SE wirklich Program Change von seinen zwei Schaltern
sendet (sonst unter „Zuweisen“ auf preset.prev/next legen).
#120 Dynamik und Besitzer-Punkte 1–6 (Instrument-Schalter ohne Neuberechnung `hxWPHashOf`, Verschieben Schlag/Ton, Raster
im Neue-Schleife-Popup mit Achtel/Triole, `hxDuplicate`, Hinweistext `hxNtWords`, Tonart/Skala im Editor-Kopf) · #120 Dynamik: Verdichter je Kanal (`myzel-komp`, Karte „Verdichter“), Transienten-Former „Ausklang“ wirksam (langsame
Hüllkurve 0,8 s), Pegelhaushalt Hexenring nach Begrenzer-Last (`haushalt.js`, `hx.haushalt`); Messung: der Begrenzer bleibt
bei 4 Schleifen + Live untätig (Summen-Verdichtung hält −2…−8 dBFS). Offen fürs Ohr: Verdichter an einer Puls-Spur und
einer Kalimba-Ebene; „Ausklang −“ dimmt nach einem lauten Ton kurz auch einen leiseren, der folgt (Transient-Designer-Art).
#109 Preset-Wechsel ohne Warten auf die Naht, Ladebalken, Tonart-Grundwert · #110 Übergabe in Portionen, „Takt sehen“ ·
#111/#112 Kompostgarten, Kalimba-Schnarren, Jahresring-Laub · #113 Kurzwellenritual, Puls-Spuren-Hinweis, Ebenen-Recherche ·
#114 Kappung vor der Effektkette, Harmonizer auf der Effekte-Seite · #115 8 Ebenen, Design, Bearbeiten-Fenster, globaler
Stopp, Interface-Keyboard, „Vorige Skala“, Ernte-Leiste, Sporenwerk-Fix · Code-Review von #115 (9 Funde, alle behoben:
Stehlen nach Ebenen, Vorhören-Stopp, Tonbereich bei neuen Anschlägen, Geflecht-Knoten, Interface-Erkennung, Fader `b.fad`). · #118 Geflecht-Knoten (in #117 verschluckt) · Max-Review
von #117 (14 Funde behoben: Interface-Erkennung als Marke minus Controller `MIDI_CTRL`, Fader aus dem Gerätebild
`cbCcTravels`, Ebenen bei jedem Anschlag in `triggerPerc`, Stopp/Stille mit `over`, Vorhören-Rücknahme am Ring, Karten über
`hxmState`, `layers()`-Schlüssel vorberechnet). Aus `dev/OFFEN-2026-10-27.md` damit erledigt:
1, 2, 5, 7, 8 (iPad Hintergrund), 13; 3/4 (Handpan) vom Besitzer zurückgestellt; 9/10/11/12 von ihm als geklärt bestätigt.
