# Übergabe: Myzel (Stand 22.10.2026 – Klangquellen, Ruhe und der Hexenring fertig, Schlussprüfung grün)

**→ Zuerst `dev/STAND-2026-10-28.md` lesen** (Stand, Arbeitsweise, alles Offene, 28.10.2026).

## Nächste Sitzung – zuerst lesen (Stand 26.10.2026, nachts)

**ZURÜCKGESETZT (27.10.2026, Besitzer):** `myzel/` steht wieder auf `cd268ce` (26.10., nach den Klangwelt-Bildern). Alles danach (PR #49–#62) ist heraus – die Einträge unten dazu beschreiben Code, der **nicht mehr** in der App ist. Offen: `dev/OFFEN-2026-10-27.md` – zuerst lesen, mit der Lehre daraus.

**Aussetzer am PC mit Touché-Arp (28.10.2026, Chrome, Polarfunk, Log 16:04):** Befund aus dem Log: 0 Aussetzer in 11 s bei voller Last (22 Worklet-Stimmen Ätherwelle+Nordlicht), dann drei zusammenhängende Stille-Strecken 160/790/130 ms bei 11,3–13,5 s – genau beim ersten Start des Werk-Rahmens (`werklog 11.7 rahmen-ok:srcdoc`; Auslöser unklar, loops=0 – vermutlich eine Ernte) und der Wächter-Reaktion (`stimmen:47`). Hauptthread nie > 7 ms blockiert (raf max 7,1 bei 145 Hz). Der Wächter hatte außerdem **0,512 gelernt** (`myzel.guard.v1`): der PC startete jede Sitzung mit 51 % Stimmen (`voices load=91–100`, Stimmenklau). Chrome läuft dort mit 480 Frames/10 ms (`lat=std`, out 56 ms) – die 128 des Interfaces gelten nur für ASIO. Gemessen hier (Chromium, `x-arp.js`): Rahmen-Start unter Arp-Last ≈ +100 Underruns. Gebaut: (1) `hxwPreboot` (werk.js, aus init-audio.js 2,5 s nach Start): Rahmen im ersten stillen Moment (keine Stimmen, keine Aufnahme, kein Puls/Bordun), alle 3 s neu versucht, dann `warm`; PC und Tablet, nicht Handy; Ernte vorher bootet wie bisher. (2) Gelernter Faktor abgeschafft (`gdlGet` = 1, Schlüssel geleert) – Sitzungs-Wächter unverändert. (3) `dsp/ring.js` misst im Audio-Thread Lücke zwischen `process()`-Aufrufen und Blockdauer (`Date.now`), meldet `thr` ab 20/8 ms → `HX.thr`, `LM.thr`, Bericht `audio … stockt= stocktGap= blockMax=`, Ereignis `audio-stockt`; `werklog` mit `rahmen-start[:n-stimmen]`, `rahmen-huelle:ms`, `rahmen-ok:…:ms`. Tests `t-hx-preboot.js` 6/6, `t-hx-guard` Teil 1 angepasst. **Offen:** Ursache der 790 ms am PC nicht bewiesen – nächstes Log des Besitzers zeigt `stockt`/`rahmen-start` und entscheidet (Audio-Thread stockt selbst vs. Ausgabeweg). Wenn `stockt` ohne Rahmen-Start wiederkehrt: Worklet-GC (Stimmen-Churn: je Arp-Schritt 2 AudioWorkletNodes), dann Stimmen-Pool statt Neuanlage erwägen.

**Eingebrannt bleibt eingebrannt (28.10.2026, iPad-Bericht des Besitzers: alle Schleifen `out1`):** Drei Lücken: (1) Laden in anderer Abtastrate warf `S.bak` weg (persist.js) – jetzt mit `hxResampleS` mit umgerechnet (`bakR`, `kcB` neu); (2) `L.chainRec` wurde nur gesetzt, wenn das Fenster bei der Ernte noch klang (`hxNotesRefresh`) – fast nie; jetzt sofort in `hxHarvest` (ernten.js). Folge: Wuchs-Durchgänge und Werkstatt-Kreationen solcher Schleifen tragen ihre Kette (vorher trocken auf out 0); (3) fehlt `S.bak` trotzdem (`nie`/`lesen`/Bake gescheitert): `hxRebakeLater` → `hxBakeRec` aus `L.chainRec` (`hxRecShift`: um `S.pre` verschoben, LFO-Phasen zurückgerechnet) – gespeichert nur bei gleicher Rate. Bericht: `lmSchDesc` je Schicht `Rate[>jetzt]:gebrannt|live|trocken[/Grund]`, „ohne Kette“. Test `t-hx-nachbrennen.js` 6/6 (Nachbrennen = erstes Einbrennen, −300 dB). Alte Schleifen ohne gespeicherte Kette können nicht nachgebrannt werden (Bericht: „ohne Kette“).

**iPad: Hintergrund, Akku, Probe (28.10.2026, Besitzer: „sound spielt weiter, obwohl die App beendet wurde … zieht viel Akku … klangquelle wechseln: kurz ertönt die neue“):** Die Hintergrund-Korrektur vom 26.10. (43c3c9a, 5c1e9ae) war mit der Rücksetzung heraus – neu eingebaut: `dev.bg` (Standard `!(IOS || MOBILE)`), `bgStop` (start.js: `ctx.suspend`, stummes iOS-Element pausiert, `audioSession` → „ambient“, `mediaSession` paused) bei `visibilitychange` hidden, `pagehide`, `freeze`; zurück: `iosUnmute`. `dev.akku` „Akku schonen“ (Standard `IOS`): `frameBody` zeichnet mit 33 ms ohne Hand (`AKKU.inT`: pointerdown/-move/keydown, `midiNoteOn`; Berührung → sofort 16,7 ms), `akkuTick` alle 15 s gibt den Wake-Lock in der Stille (`IDLE.on`, keine Aufnahme, 3 min ohne Eingabe) frei. Klangquellen: keine Probe, solange etwas klingt/aufnimmt (`kqLoud`). Gerät › „Hintergrund und Akku“. Test `t-ipad.js` 8/8 (iPad-UA in Chromium; der PC unverändert). Am echten iPad (Safari) ungeprüft – besonders das Beenden aus dem App-Umschalter.

**Direkt, Nachtrag (28.10.2026, iPad-Screenshot des Besitzers):** `.toast` z-index 95 (lag unter `.hx-ed` 40). Ohne Auswahl zeigt der Editor „Klang verwandeln – die ganze Schleife“ (Einspielen, Tonhöhe, Verstimmen, Verwandeln, Färben; a=0, b=1; bei `HX_RX_WHOLE` – pitch, erde, licht, wurzel, krone, gain – die ganze Schicht-Audio [0, S.n) samt Vorlauf/Ausklang). Wuchs aktiv: Hinweis `.hx-ed-frz` mit Grund (`hxWWhy`), der erste Eingriff ruft `hxRxFreeze` → `hxErstarren`, dann die Bearbeitung (zwei Schritte). Test `t-hx-direkt2.js` 6/6. `t-hx-vorhoeren` „heard at once, mid-pass“ einmal von vier Läufen rot (Tausch erst an der Naht, die Schleife wuchs dabei nicht – Zeitpunkt; dreimal grün).

**Direkt (28.10.2026, Besitzer: „abschnitte löschen (länge bleibt), gegeneinander auswechseln, stellenweise mit neuem input füttern, in der tonart ändern“):** `hexenring/direkt.js`. Ops in `hxRegionWrite`: `loeschen`; `swap`/`paste` (`hxRxMove`, Quelle `HXE.mark` = `{key,a,b}`, gleiche Schleife, nicht überlappend; kürzere Quelle endet in 5-ms-Blende; Vorhören über `hxPvEdit(…, full)`); `pitch` (v Halbtöne, Cent/100: Phasen-Vocoder `hxRvPv` – STFT 2048, Analyse-Hop 512, Synthese an ganzen Stellen, Identity Phase Locking – dann Rücklesen mit Sinc `hxRvAt`, bei rt > 1,04 Butterworth 8. O. vorher; gemessen 0 ct Abweichung); `take` (Einspielen: `hxTakeArm` – „ersetzen“ leert sofort per `loeschen`, Ziel = nächster Durchgang mit Abschnittsbeginn ≥ 1,2 s, `hxTakeTick` alle 100 ms, `hxGrab({in: hxInp()})` ab `fa + sh` (Mikro: `hxMicRt`), geteilt durch `S.gain`, in die erste Schicht – trocken und, wenn sie eingebrannt spielt, über `hxwCall('bake', hxChainRec(…))`). Nicht bei Wuchs, Band ≠ ×1, Schnitt. Wellenform: gemerkter Abschnitt gestrichelt, Einspielen rot. Test `t-hx-direkt.js` 12/12 (Einsatz 5 ms genau; Tonhöhe hörbar nach ≈ 0,3 s bei 2 Takten).

**Abschnitt: sofort hörbar, Verwandeln/Färben (28.10.2026, Besitzer: „änderungen bei der auswahl gleich on the fly hörbar … weitere bearbeitungsoptionen … myzel thema“):** `hexenring/verwandeln.js`. `hxRegionEdit` patcht zuerst den Vorhör-Puffer (`hxPvEdit`: nur der Abschnitt, derselbe Prozessor mit demselben `seed`; startet das Vorhören, wenn es nicht läuft – Auswahl wiederholt), das Einschreiben in die Schichten folgt in eigener Aufgabe (`hxRegionWrite`, Warteschlange `HX.rxQ`), der exakte Render übernimmt danach (Korrelation 1,000). Nicht bei Band ≠ ×1 oder Schnitt (dann nur der Render). Neue Ops in `HX_RV` (über `hxRxOp`): nebel (FDN 8 Linien, T60 3 s), sporen (Körner 50–150 ms, ±10 Cent, Hermite), keimen (⅛…1/64 wiederholt), wurzel/krone (Körner ×4 Überlappung, ½: 32-Tap-Sinc bei ½, 2: Butterworth 8. Ordnung vorher), erde (LP 650 Hz 4. O.), licht (HP 900 Hz 4. O.), welken/spriessen (LP-Fahrt + Hüllkurve); Pegel = RMS des Abschnitts (max +9 dB; Licht bleibt leiser). „Nur die Auswahl spielen“ heißt „Schleife auf die Auswahl kürzen“. Test `t-hx-verwandeln.js` 12/12 (Klick blockiert ≈ 70–180 ms, exakter Render ≈ 1,5 s). `t-hx-tips` klappt alle Karten auf (seit dem Zuklappen sah er nur eine Zeile) – 6/6.

**Halten = Menü (28.10.2026, Besitzer: „wie wird der rechtsklick gelöst … variante 1“):** `hxRingDown` öffnet nach `HX_HOLD` das Kontextmenü `hxCtxMenu` (über dem Finger) statt der Karte; „Karte – alle Einstellungen“ ist ein Eintrag. Auf `pointer: coarse` Einträge 44 px. Test `t-hx-halten.js` 8/8 (iPad-Größe, CDP-Touch in Chromium – Safari nicht geprüft). `t-hx-tips`: „Alle aufklappen“ ohne Tooltip und die Kartenzeilen (1 von 1) rot – nicht von dieser Änderung.

**28.10.2026, später („mach alles fertig“):** (1) **Instrument folgt dem Preset** – `ui.instrument` (dev, Standard „eigen“; Presets-Panel und Wurzelwerk „Klang & Presets“). `hxKlangOf(L)` (wuchs.js) ersetzt alle `L.klang || 'eigen'` im Rendern: „eigener“ wird bei „preset“ zu „feld“ (Begleitungen `mi.from` ausgenommen); Umschalten → `hxWUpdate` aller Schleifen (onParamChanged). Test `t-hx-instrument.js` 4/4. (2) **Werkstatt Etappe 2:** `hx.ws.effekte` – Rezept `fx = {k, v}` je Schicht (`HX_WS_FX`: Filterwelle, Bandfilter, Phaser, Chorus, Wärme, Kreisen; ein oder zwei, je Gruppe eins; Wellen in ganzen Zyklen je Durchgang), gerendert über eine eigene Kette `hxWsChain` (Basis `L.chainRec` oder trocken, Oversampling `QP[3].os`) im `hxWJob`; nicht bei `L.folgt`. Kreationen ändern ≥ 30 % der Noten (`HX_WS_DIFF`, `hxVDist`). Durchspielen: `hx.ws.durchg` „auto“ = mind. 10 s, mind. 2 Durchgänge (`hxWsPasses`; einmalige Umstellung `myzel.ws.v2` von „1“). Liste zeigt je Kreation, was sie ändert (`hxWsWhat`). Test `t-hx-werkstatt-fx.js` 6/6. (3) **Wurzelwerk Etappe 2: Suche** – Feld im Kopf, Taste „/“ (`wwSearchOpen`), Index aller `PD` (num/sel/bool, Name/Gruppe/Auswahl/Id, Umlaute egal – `wwNorm`) und `MTARGETS`; Treffer als Kacheln (`wwQTile`, einmal je Id gebaut), Spore sät; Esc leert erst, dann zu. Test `dev/tests/ui/t-ww-suche.js` 10/10.

**Gärtner-Werkstatt (28.10.2026, Etappe 1):** `hexenring/mitspieler/werkstatt.js` + `css/werkstatt.css`. Kreation = Rezept je Schicht (Index in `L.sch`): `vn` (hxVarStep, 3+ Schritte, Gewichte nach `hx.ws.noten/rhythmus/oktaven`) und `eng` (`hx.ws.klang`: gleiche Art, Familie bevorzugt). Gerendert wie ein Durchgang (`hxWPass` mit `o.W`, `hxwCall('wuchs')`), gespielt mit `hxWPlay(S, 'krea', f, …, V)`; `hxWUpdate` hält still, solange `L.krea.sel` gesetzt ist. Triebe = Rezepte (`krt`, gewählter `krs`) in `hxRecOf`/Schnappschuss/Kreisen, Audio nach dem Laden neu gerendert (`K.want`, `hxWsTick`). Umfang Leiste: gleicher Index für alle Schleifen. Durchspielen: `HXWS.auto`, Wechsel genau an der Naht nach `hx.ws.durchg` Durchgängen. Offen (Etappe 2): Effekte als Änderungsart. Tests `t-hx-werkstatt.js` 7/7, `t-hx-werkstatt-leiste.js` 5/5.

**Firefox: kein OfflineAudioContext.suspend (27.10.2026):** Bericht `werklog` des Besitzers: jeder Wuchs-Durchgang „ctx.suspend is not a function“. Betraf auch das Einbrennen (`hxwBake`) – in Firefox blieb jede Schleife trocken auf der Live-Kette. Ersatz `hxwAhead` (werk.js): die Blockarbeit vorab in Blockreihenfolge, `ctx.currentTime` als eigene Eigenschaft auf die Blockzeit gestellt; Streaming-Lesungen (`nsRead`) erst in `ns.fin`, jetzt Stück für Stück. Prüfschalter `myzel.test.nosusp`. Gemessen (Chromium): Einbrennen 13/13 wie mit suspend; Noten Kalimba/Nebel/Glocke spektral ≤ 0,5 dB, Atem ≤ 3 dB (Rauschen), nicht bitgleich (Phasen). Tests `t-hx-bake-ohnesuspend.js`, `t-hx-werk-ohnesuspend.js`.

**Wurzelwerk, Etappe 1 (27.10.2026):** `ui/wurzelwerk.js` + `css/wurzelwerk.css`. Leiste: `.ww-tk` (Tempo/Tonart, `wwTick` alle 250 ms; „frei“ = `!hxGrid()`), Popover `wwPopToggle` (`wwTaktTools`: `wwTempoSet` → `hxTempo` bzw. `seq.bpm`, `wwTap`, `wwTempoFrei`, `TG.keep`), Knoten `.ww-btn` (Taste W außerhalb des Felds). Schublade `#ww`: Gesät-Reihe (`myzel.ww.v1`, Kacheln je id einmal gebaut – `ctl` bindet für immer) und Gruppen `WW_GROUPS` (einmal gebaut). Jedes `ctl()` trägt jetzt `data-ww` (Wrapper um `ctl0`); Säen = `body.ww-saen-an` (Inneres ohne Zeiger, Klick auf den Rahmen im Capture), Marke `.ww-gesaet`. Nur `ctl`-Regler sind säbar (nicht die Chips der Hexenring-Karte). Test `dev/tests/ui/t-wurzelwerk.js` (Slot hx). Nächste Etappe: Suche („/“).

**Stumme Schleifen in Firefox (27.10.2026):** Firefox-Bericht des Besitzers (`proc`-Zeile, neu im Leistungsbericht): Schicht `dd:1 ch:0 tot:0` – `wsHold` nach einem Pflicht-Durchgang (`must`, Tonart-Folgen bei Preset in anderer Tonart), der nie kam (`werk n=0`). Firefox hat kein `playbackStats` → kein Wächter, Taumeln/Wuchs laufen dort immer. Fix in `dsp/ring.js`: `wsHold` bei `must` nur ohne spielbare Fassung (`wsHas`). Warum der Werk-Rahmen in Firefox nichts liefert, ist offen (hier kein Firefox). Test `hexenring/t-hx-mussspaet.js`.

**Presets mit Leiste und automatische Sicherung (27.10.2026, Besitzer: „dass presets automatisch die schleifen mitspeichern. und dass VERLÄSSLICH nie mehr was verloren geht“):** Stand = Rücksetzung (f20f11a) plus `hexenring/kreise.js` (Ende). Eigenes Preset: `p.kr` = Id seines Kreises (`meta.preset`) oder `'leer'`; „Speichern“ → `hxUprSave`; `loadPreset(p, own)` → `hxUprLeave` (das laufende eigene Preset `UI.upr = {name, keys}`, in `myzel.upr` gemerkt, bekommt die Leiste, mit der es endet, wenn sie sich geändert hat – eine leere Leiste ersetzt nie die eigene) und `hxUprEnter` (`hxKrLoad(p.kr, 'neu')`). Ältere Presets ohne `kr`: Leiste bleibt, die Leiste beim Verlassen wird ihre. Automatische Kreise (`meta.auto`): `hxKrSecure(why, loops)` vor `hxDelete`, `hxLeeren`, `hxKrLoad('neu')`, `hxSetGo` – nur Schleifen, die kein Kreis unverändert hält (`hxKrSig`-Hash, `HXKR.safe`, in `myzel.hx.krsafe`). `hxDbDel` wartet für gehaltene Schlüssel (`HXKR.hold/later`), bis der Kreis geschrieben ist. Saves laufen nacheinander (`HXKR.q`, `hxKrRun`). Gelöschtes Preset: sein Kreis wird automatisch. Test `hexenring/t-hx-presetleiste.js` (Chromium).

**Vereinbart (Besitzer, 26.10.2026): Presets einzeln durchgehen.** Nach dem Handpan-Piloten gehen wir die Klangwelten eine nach der anderen gemeinsam durch; der Besitzer sagt, welche umgebaut werden. Kein Preset ohne seine Ansage umbauen (auch nicht „nur“ Effekte neutralisieren, Konzept §2/Etappe B wartet darauf).

**Taktgeber in der Leiste (Besitzer, 27.10.2026: „eine zentrale BPM-Anzeige … professionell, nach Branchenstandard, mit dem gewissen Myzel-Extra“):** `ui/tempo.js` (`TMP`, `tempoBuild` aus boot.js, `tempoDraw` je Frame aus `frameBody`): Pille zwischen Klang-Chip und ▶ – Ring (Canvas, 4 Segmente, die Eins lumen, sonst spore, Spore in der Mitte schwillt mit dem Schlag; ruhig ohne Takt), Tempo `tempoNow()` (MIDI-Uhr → `SEQ.ext.bpm`, sonst `tgBpm`) mit Zehntel, Quelle `tempoSrc()` (MIDI-Uhr · Schleife · Puls · Takt · frei), TAP (`tapTempo`). Ziehen 4 px = 1 BPM (Umschalt 0,1 je 4 px… genauer 0,025/px), Rad ±1/±0,1, Pfeile, Bild ↑↓ ±10, Doppelklick/Enter tippt, Klick öffnet `.tmp-pop` (−1, −0,1, +0,1, +1, ½×, 2×, Eintippen, „Tempo halten“ = `TG.keep`). `tempoSet` – über `setParam('seq.bpm')`, gibt eine Schleife das Tempo (`TG.hxOn`) und der Wert ist gleich, wird der Wechsel trotzdem ausgelöst; MIDI-Uhr: nur Anzeige. `seq.bpm` jetzt 20–300 in Zehnteln (`step 0.1`, `tick: 1` – ein Encoder-Tick bleibt 1 BPM, mapping.js `pStep`). Test `v2/t-tempo.js` 8/8; MIDI t-map-rel 40/40 (t-clock „pulses at 120“ rot wie auf dem alten Stand).

**Vorhören und Schleifen-Kanal (Besitzer, 27.10.2026, Screenshot Schleife 2):** Das „Abspielen“ im Bearbeiten-Fenster spielt einen gerenderten Durchgang an Stelle der Schleife (`L.pvMute`, ihr Pegel 0) – der Kanal der Schleife zeigte darum nichts, und ein Start aus der Leiste blieb stumm, solange das Vorhören lief. Jetzt: `hxState(…, 'spielt')` beendet das Vorhören dieser Schleife (`hxPvStop`); der Kanal zeigt beim Vorhören dessen Pegel (Analyser `HXE.pv.out.an`, `hxmPvLv`) und „Vorhören“ als Zustand. Test `t-hx-trimspiel.js` 9/9 (auch getrimmt und um einen Schlag verlängert). `t-hx-vorhoeren` „Leertaste im Editor“ rot – auch auf dem alten Stand.

**Schleifen entkoppelt, vierte Runde – der Kanal auf KETTE (Besitzer, 27.10.2026: „wenn ich es auf eingebrannt lasse, kann ich mittels Filter den Sound immer noch ändern … eingebrannt oder neu hat keinerlei Auswirkung“):** Die eigentliche Ursache von Anfang an: Der Besitzer hatte den Kanal „Hexenring“ im Pult auf KETTE (`xhxr.route` ≠ 'dir', rec) – `hxRoute()` schickte dann die Summe aller Schleifen durch `hxChain('fx')`, eine Kopie der Live-Kette, nach dem Kanal; jede eingebrannte Schleife bekam die Kette des aktuellen Presets ein zweites Mal. Die Tests davor maßen den Weg der Schleifen nur bis vor diesen Punkt. Jetzt: `hxRoute()` immer direkt (`hxGateM`); die Live-Kette erreicht Schleifen nur einzeln und trocken über `folgt`. Der Knoten KETTE/DIREKT des Kanals ist `hx.fx` (onParamChanged `xhxr.route` → `hx.fx`; `hxRouteMirror` zeigt `hx.fx` am Knoten; `restoreState` setzt `xhxr.route` nach `hx.fx`, Standard DIREKT). Test `t-hx-kette.js` 5/5, gemessen am Master bei stillem Feld (Kanal auf KETTE gesetzt, Schleife eingebrannt): Filter zu und Verzerrung voll → Korrelation 1, Maschinenträume → 1 (alter Stand: 0,85 / 0,25); „folgt“ → der Filter wirkt (0,56); Knoten ↔ Schalter in beide Richtungen.

**Schleifen entkoppelt, dritte Runde – eigener Raum je Schleife (Besitzer, 27.10.2026: „immer noch nicht … AUFGENOMMENE SCHLEIFEN WERDEN NICHT MEHR VON EFFEKTEN BERÜHRT“):** Die Tests davor liefen nur mit frisch aufgenommenen Schleifen; beim Besitzer liefen gespeicherte. Lücken: (1) Schleifen von vor dem Raum hatten kein `HXR.v` → `hxrV` nahm `P` – Hall/Echo des aktuellen Presets; (2) eine Schicht, deren Bake scheiterte, blieb dauerhaft auf Ausgang 1 (Live-Kette); (3) ein gemeinsamer Raum (der der ersten Schleife) für alle – eine unter einem anderen Preset aufgenommene Schleife klang danach im falschen Raum. Jetzt (`hexenring/raum.js`, neu geschrieben): **je Schleife ihr Raum** `L.room` = Hall/Echo des Felds zum Beginn ihres Fensters (`HXRL`, Protokoll der `HXR_IDS` mit Zeit, 20 min, geschrieben von `updDelay`/`updReverbMix`/`regenIR` über `hxrLog`/`hxrAll`; ein verschobener Ernte-Ausschnitt nimmt den Raum seiner Zeit), gespeichert (persist, Kreise, Rückgängig); ohne `L.room` aus `L.P`, sonst `myzel.hxRaum`, sonst Standard – nie `P`. Räume gleicher Einstellungen teilen eine Kopie (`HXR.rooms`, Schlüssel `hxrKey`; Echo + Hall wie in raum.js zuvor, Rückwege in `A.masterSum`); jede Schleife erreicht ihren über ihr Sendepaar (Ausgang 2, nach Pegel/Balance/Zustand – wie Nähren; `hxSendSync` an, solange `L.roomOn`), mal Fader/Stumm/Solo und Echo/Hall-Regler des Hexenring-Kanals (`hxrLevels` aus `gates`); die Kanal-Sends selbst sind dann zu (`updSends`). `hxrSync` in `hxStripSync`. Höchstens 16 Schleifen mit eigenem Raum (`HX_SENDS`), die übrigen ohne (Hinweis). `hxSchPlay`: Ausgang 1 nur bei `folgt` oder solange der frische Bake läuft (≤ 120 s, `bakeFail` nein) – sonst trocken auf Ausgang 0. Tests: `t-hx-raum.js` 9/9 (Schleife 1 Handpan-Kreis 4,5 s/0,3, Schleife 2 Maschinenträume 3 s/0,68; vier Klangwelten darüber: Korrelation 1; Schalter; trocken ohne Bake; ohne Raum gespeichert → nach Neuladen der ihres Patches), `t-hx-allepresets.js` 3/3 (47 Klangwelten, schlechteste Korrelation 0,9999999994; bei Messfehler durch blockierten Haupt-Thread – Tiefsee 11-s-Hall – einmal nachgemessen), `t-hx-taumeln` wählt Taumeln jetzt ausdrücklich. Grün: preset, eigen, kreise, bake, ohr, oeko, oeko2, mixer, mixer2, persist, tempo, taumeln. `t-hx-taps` rot wie auf dem alten Stand.

**Schleifen entkoppelt – endgültig (Besitzer, 27.10.2026: „du hast wieder versagt … mit Maschinenträume hört man es deutlich … ein Schalter, der die Effekte für Schleifen aktiviert oder deaktiviert; von Haus aus wirken sie beim Aufnehmen, wenn die Schleifen stehen, wirkt nichts mehr, außer der User möchte das“):** Gemessen, nicht geraten (Diagnose: Ring-Ausgang 0, Hexenring-Kanal, Rückwege des Schleifen-Raums je vor/nach dem Preset, Ausrichtung per Korrelation): Es war das **Tempo** – `loadValues` setzte `seq.bpm` des Presets, `seqRetempo` stellte den Taktgeber um, jede Takt-Schleife wurde neu ins Raster gesetzt (Ring-Ausgang Korrelation 0,64). Jetzt hält `loadValues` `seq.bpm`, solange eine Takt-Schleife lebt (`UI.tempoKept`, der Hinweis im Lade-Toast); den Regler bewegt der Spieler bewusst. Dazu der Schalter **`hx.fx`** „Effekte des Presets wirken auf die Schleifen“ (rec, aus; im Aufnahme-Panel oben, ersetzt `hx.raumFolgt`): an → `hxFxSet` stellt jede Schleife auf `folgt` (trocken durch die Live-Kette, ab ihrer Naht) und den Hexenring-Kanal auf Hall/Echo des Felds; aus → eingebrannte Fassung, eigener Raum. Neue Schleifen übernehmen ihn (`folgt` in ernten.js). `hxBake` brennt jetzt auch ein, wenn das Ketten-Protokoll (15 min) den Ausschnitt nicht mehr hält – mit `L.chainRec` der Schleife (vorher blieb so eine Schleife dauerhaft an der Live-Kette). Tests: `t-hx-raum.js` 8/8 (Handpan-Kreis → Maschinenträume: Ring −330 dB, Summe −88 dB; Schalter an/aus), **`t-hx-allepresets.js`** 3/3 (alle 47 Klangwelten über einer Schleife: Weg der Schleife identisch, schlechteste Korrelation 0,9999999994; Tempo bleibt). Die Summe (`mst.*`) wirkt auf alles – nur Obertonhöhle setzt sie (Verdichtung 0,4 statt 0,35). `t-hx-bake` wählt fürs Taumeln-Teil jetzt „mit“. Vorbestehend rot (auch alter Stand): `t-hx-bew` externe Uhr 110 BPM (mittlere Abweichung 0,013–0,019 > 0,01).

**Schleifen 1:1 beim Preset-Wechsel (Besitzer, 27.10.2026: „ändert sich immer noch leicht – es scheint, als wären Effekte drauf“):** Zwei Wege hingen am Preset: (1) Taumeln – Schleifen taumelten standardmäßig mit `mov.drift` des Felds mit (Handpan-Kreis hat seit dem Piloten 0 Cent, die anderen 6 → beim Wechsel änderte sich die Tonhöhenbewegung der Schleife); jetzt `L.taumeln` nur auf Wunsch (`hxTauOn` = `!!L.taumeln`; alte Datensätze ohne `tauV` → aus). (2) Hall und Echo – der Hexenring-Kanal schickte in die Hall/Echo des Felds. Jetzt `hexenring/raum.js`: eine eigene Kopie von Echo (Band, Ping-Pong, Ton, Sättigung, Leiern über die LFOs des Felds) und Hall (eigene IR, `dspJob('ir')`), Einstellungen `HXR.v` = Schnappschuss der `HXR_IDS` beim ersten Schleife der leeren Leiste (`hxLoopMake` → `hxrTake`), gespeichert in `localStorage myzel.hxRaum` und im Kreis (`raum`, „neu“ setzt ihn). Rückwege direkt in `A.masterSum` (die Rückweg-Kanäle des Pults sind die des Presets). `updSends`: `st.k === 'hxr'` → `hxrTarget(fx)`; `hx.raumFolgt` (rec, aus) schickt wieder ins Feld. Gemessen (`t-hx-raum.js` 5/5): ein Durchgang vor und nach einem Preset mit anderem Hall, Raum, Echo, Taumeln, Chorus, Verzerrung – Korrelation 1,00000, Differenz −84 dB (Leiern im Test aus; mit Leiern weichen Durchgänge auch ohne Wechsel voneinander ab). Summe (`mst.*`, 5 Presets) wirkt weiter auf alles. Ringleiste: Ringe mittig (`ry = hh/2`), kein „aufnehmen“, `hxRingEnv` zeigt den Lautstärkeverlauf, wenn eine Schleife keine Noten hat (`t-hx-sporen.js` 7/7). Vorbestehend rot, auch auf dem alten Stand: `t-hx-ui` p390 (Handy), `t-hx-taps` Pegelgrenze −30 dB.

**Schleifen spielen ihr Original (Besitzer, 27.10.2026):** „Die Schleife spielt immer die Originalaufnahme; Tonartwechsel nur, wenn dezidiert eingestellt – ein Preset-Wechsel ist kein Tonartwechsel.“ `hxTon(L)` = `L.ton || 'fest'` (wuchs-follow.js) ersetzt alle `L.ton || 'diatonisch'`; neue Schleifen nehmen `hx.folgen` (rec, Standard „fest“, im Aufnahme-Panel neben „Neue Schleife“); Datensätze ohne `tonV` (vor 27.10.) mit „diatonisch“ werden „fest“ (persist.js, auch Kreise); Begleit-Vorschläge erben das Folgen ihrer Melodie-Schleife. Die Suiten, die das Folgen prüfen (t-hx-wuchs, -oeko, -oeko2, -fuzz), setzen `hx.folgen` diatonisch. `t-hx-preset.js` prüft beides (Standard: nichts angekündigt, nichts gerechnet; `FOLGEN=diatonisch`: folgt ohne Stille). Grün: preset 5/5 + 4/4, eigen 7/7 (neu: keine Schleife hängt an der Live-Kette – frisch, getrimmt, verschoben, Kreis, Neuladen), livepatch 3/3, oeko 13/13, oeko2 56/56, kreise 9/9, gaertner 58/58, wuchs (treu,ton,tempo,live,persist) 16/16, bake 13/13 (einmal 12/13: Nahtpegel −2,16 dB, danach zweimal grün).

**Hintergrund (26.10.2026, nachts, iPad: „spielt weiter, obwohl geschlossen“):** `dev.bg` „Im Hintergrund weiterspielen“ (Standard `!(IOS || MOBILE)`, Gerät › Hintergrund). Aus: `visibilitychange` hidden und `pagehide` rufen immer `bgStop()` (start.js: `ctx.suspend`, das stumme iOS-Element pausiert); an: wie bisher nur ohne Puls/Schleifen/Bordun/Freeze/Aufnahme. Test `v2/t-bg.js` 5/5 (Chromium, Sichtbarkeit simuliert; am iPad ungeprüft). Nachgelegt (Besitzer: „beim Beenden spielt es trotzdem weiter“ – womöglich noch die alte Version, Updates kommen erst beim nächsten Start): `bgStop` stellt auf iOS `navigator.audioSession.type` von „playback“ auf „ambient“ (`A.bgSess`; zurück per `iosUnmute` bei visible), dazu `freeze`.

**Schleife klang nach dem Preset (26.10.2026, nachts, iPad):** Spielt eine Schleife ihre Noten über echte Stimmen (`hxWLiveTick`: „Wiedergabe: Live“ oder ohne Werk-Rahmen, vermutlich der iPad-Fall – dort nicht geprüft), starteten die Stimmen mit dem aktuellen `P` (die Klangregler des geladenen Presets). Jetzt leiht `hxWWithP(hxWOwnP(L.P, eng))` die Regler der Klangquelle aus dem Patch der Schleife für den Start (nur bei Klang „eigener“), `v.hxOwn` schützt die Stimme vor Reglerbewegungen (controls.js). „Klang: Spielfeld“ bleibt der gewollte Folge-Modus. Test `t-hx-livepatch.js` 3/3 (alter Stand: 0,9/0,9 statt 0,1/0,3).

**Handpan-Pilot (26.10.2026, nachts – vom Besitzer abgenommen: „passt so“):** `dsp/handpan.js`: die anderen Felder der Skala schwingen mit (`on.sym` = `N.notes`, je Feld Moden 1/2/(3 unter 330 Hz), über die Schale vom Klang des angeschlagenen Felds getrieben `HNG_SYM_DRIVE`, plus Anklopfen `HNG_SYM_KNOCK`; gemessen: das D4-Feld beim Ding ≈ −23 dB unter dem Grundton, alles Mitschwingen ≈ −19 dB), nichtlineare Kopplung (Grundton² treibt die Oktave, Grundton×Oktave die Quinte, `HNG_NL2/3`: harter Schlag Oktave +2,4 dB, Quinte +18 dB gegenüber weich), Anschlags-Glide (`HNG_GLIDE` 7 Cent × vel², 80 ms), Variation je Schlag (Ort ±0,04, Breite ±5 %, Moden ±1 dB, Paar-Aufspaltung ±20 %), Hand-Berührung `{touch}` (engines.js: neuer Schlag aufs klingende Feld; `v.hf`/`v.hOn`). Raum: `rev.raum` Nebel/Holzsaal/Steinkuppel (`genRoom`, buffers.js: Spiegelquellen bis 3. Ordnung je Mikrofon, Wand-Tiefpass je Ordnung, Nachhall in drei Bändern, Energie wie der Nebel – Anteil bedeutet dasselbe). Handpan-Kreis: Steinkuppel 4,5 s, Vibrato/Taumeln/Phaser/Kreisen/Chorus/Filterwelle 0. Hörbeispiele: der Besitzer hörte zwischen vorher/nachher kaum Unterschied außer dem Raum – die Modell-Feinheiten sind leise; mehr Realismus bräuchte Messdaten echter Handpans (Modenverhältnisse/Abklingzeiten) und die Mikrofon-Perspektive (Konzept §3.1). Kosten neu gemessen (cost.js, 5 Runden, alt/neu nacheinander, Gamelan als Kontrolle unverändert): roh ×1,93 (Stufe 1) / ×1,63 (Stufe 3) → `VCOST1.hng` 0,69 → 1,33, `VCOST3.hng` 1,3 → 2,12.

**Schleifen still nach Preset mit anderer Tonart (26.10.2026, nachts):** `loadValues` setzt die Tonart direkt – die Schleifen folgten sofort und schwiegen, bis ihr neuer Durchgang da war; die Treu-Schleifen streamten den laufenden Durchgang in Echtzeit (bis zu einem ganzen Durchgang, 40 s+) und hielten den Werk-Rahmen auf. Jetzt: `loadValues` geht über `hxWTonHold` (angekündigt, wie vom Regler); `hxWTonSlots` streamt nur Lebendig-Schleifen, Treu rendert die ganze Fassung und spielt sie am Taktstrich (`hxWRenderFor`: verspätet sofort per `hxSwapAt`, d. h. kurz die alte Tonart statt Stille). Test `t-hx-preset.js` 4/4, `t-hx-wuchs` ton/tempo grün („late blocks“ scheitert auch auf dem alten Stand: die Maschine erzeugt keine Verspätung), `t-hx-oeko` 13/13.

**Schieberegler auf Schritt-Zielen (26.10.2026, nachts):** `mapApply` (bindings.js): ein absoluter Regler (Zwischenwerte gesehen, `st.fader`) auf einem Ziel mit `step` (Vorige/Nächste Skala, Preset, Grundton …) blättert je Sechzehntel einen Schritt (`st.fz`, Hysterese 1/16 Zone); ein CC-Taster (nur 0/127) drückt wie bisher. Test `v2/t-fstep.js` 5/5, Mapping-Suiten grün.

**Ernte bei getrimmter Schleife (26.10.2026, nachts, Parallelstrang):** `hxHumWin(L, S)` (vorrat.js) = der klingende Ausschnitt (getrimmt: `f0 + pre … + len`), Leiste/Ziehen/Knöpfe nutzen ihn; Verschieben einer getrimmten Schleife macht einen normalen Schnitt (↶ holt den Trim). `hxLenText` rundet Schläge. Test `t-hx-trimernte.js` 6/6.

**Verzerrung (26.10.2026, spät – zurückgenommen):** Die starke Verzerrung war ein Firefox-Fehler (Neustart half). `drv.mix` Standard wieder 0,35; nur Handpan-Kreis `drv.mix: 0`. Damals: `drv.mix` Standard 0 (vorher 0,35 – alle Presets ohne eigene Verzerrung liefen mit Röhre 12 %/35 %, Besitzer hörte die Handpan „verzerrt“). Kompostgarten und Hochspannung tragen `drv.mix: 0.35` jetzt ausdrücklich. Messung Schleife vs. Live (Chromium, Handpan/Kalimba): Pegel und Oktavbänder ±1 dB, unter 80 Hz −3 dB in der Schleife – keine eigene Verzerrung der Schleife gefunden; Firefox ungeprüft. Nächstes: Effekt-Konzept (Raummodelle, Korpus, Mikrofon-Perspektive, Transienten) – Besitzer will es gründlich durchdacht.

**Editor, zweite Runde (26.10.2026, spät):** Ausschnitt aus der Ernte (`hxSchSwap` mit `o.hum`) kürzt den Ausklang jetzt über `hxAusFrom` (recuts.js) bis zur nächsten Note bzw. zum nächsten Onset – vorher liefen bis zu 6 s Folge-Töne über den Pass-Anfang (Besitzer sah Bild/Vorhören versetzt zur Ernte). Editor: Breiten-Griff `HXE.grip` (`myzel.edW`), ziehbare Zoom-Leiste unten in der Wellenform, Kopfzeile umbrechend; `hxPvToggle` hält beim Stopp die Schleife an. Oben in der Leiste `#btnStopAll` → `panic()`. Test `t-hx-editor2.js` 7/7.

**Interface-Anschlüsse (26.10.2026, spät):** Das PCR-M50 des Besitzers hängt am MIDI-Eingang eines Steinberg-Interfaces – der Port heißt nach dem Interface. `KC_IFACE`/`kcIface` (geraet.js) erkennt Interface-Ports; die Karte fragt „Am Anschluss: …“ (`kcModelSel`, gespeichert als `cbData(src).model`, gilt auch für nicht erkannte Geräte), ohne Wahl kein Gerätebild des Interfaces. Test `t-iface.js` 5/5.

**Klangwelten und Leer-Start (26.10.2026, spät):** `ui/klangwelten.js` + `ui/klangwelten-motive.js` – jede Preset-Karte (`kbCard`) trägt ein Bild: `kbSpec(p)` liest Klangquelle, Tonleiter, Puls-Spuren, Tempo, Hall/Bordun; `KB_ART[key]` gibt Motiv (`m`), Farben (`a`, `b`, `sky`), Horizont (`hz`), `soil`; unbekannte (eigene) Presets bekommen über `kbDerive` ein Motiv nach Familie und einen Farbton aus dem Namen. `kbDraw` = gecachte Schichten (`kbLayers`: Himmel+Raumlicht, Boden mit Hyphen, Korn+Vignette) + Motiv (`KB_M[m]`, gut 40) + Bordun-Linie (Mixer-Blau) + funkelnde Sporen. Gezeichnet beim Sichtbarwerden (IntersectionObserver), bewegt nur unter dem Zeiger (30/s) und das laufende Preset (20/s), über `frame` des Presets-Panels; `REDUCED` = nur Standbilder. Fußzeile: Tonkreis (`kbTonring`), Puls-Reihen (`kbPulsRows`, Spurfarben), BPM. Eigene Presets: `kbMini`. Presets-Panel am PC 740 px breit (drei Spalten). Messung (Chromium, DPR 2): ein Bild 1–3 ms, Nordlicht ≈ 3 ms. **Leer-Start:** `ui.leer` (dev-Parameter, Standard an) – `restoreState` lädt dann `PRESET_LEER` statt des gespeicherten Klangs; Schalter unter „Klangwelten“. Testseiten (`mk.sh`) öffnen mit dem letzten Klang, außer ein Test setzt `window.__leer` (t-leer, t-kb). Tests `t-kb.js` 7/7, `t-leer.js` 5/5.

**Aufnahme-Menü aufgeräumt (26.10.2026, spät):** `hxCardFold` (card.js) klappt jeden Schleifen-Eintrag ein (`.hx-card.zu`, offen gemerkt in `myzel.hxAuf`, `hxCardOpen(slot)` öffnet den gefragten); `renderBarInfo` nur noch ein Satz, Rest als `title`; „Alle löschen“ in `renderTakes`. Test `t-hx-falten.js` 5/5. Dazu: `PRESET_LEER` („Leere Erde“, presets.js) als erste Karte, außerhalb von `PRESETS` (Programmwechsel-Nummern bleiben); Spielhilfe per `foldSec('hilfe')`, die Gestik-Zeile entfernt (Gestik wird umgebaut, Touché soll sie übernehmen können). Test `t-leer.js` 5/5.

**Kreise (26.10.2026, spät):** `hexenring/kreise.js` – die Leiste unter einem Namen, unabhängig vom Projekt. IndexedDB jetzt Version 3 mit `kreise` (Datensatz: `recs` = `hxRecOf` je Schleife, `cols`, `bpm`, `bytes`, `done`) und `kreissegs` (`[kreis, ring/schicht~w, i]`, 4-s-Segmente wie `ringsegs`, im Leerlauf geschrieben; gelistet erst mit `done`). Laden über `hxRecBuild(r, segsOf, { fresh: true })` – aus `hxRestoreApply` herausgelöst, neue Schlüssel, danach `hxSaveLoop`. `hxKrLoad(id, 'neu'|'dazu')`: ersetzt (ein ↶ per `hxHistGroup`) und startet per `hxReenter` auf der nächsten Eins; „dazu“ nur im selben Tempo. Datei `.myzelkreis` = „MYZK“ + Kopflänge + JSON-Kopf + Float32-Segmente (`hxKrExport`/`hxKrImport`). Karte: `hxKrRender` (Speicherzeile einmal gebaut, Liste nur bei Änderung). Test `t-hx-kreise.js` 9/9. **PCR-M:** Regex für Treibernamen erweitert („PCR-M 1“, „EDIROL PCR 1“, „PCR-M30/50/80“), `cbModelFor(src)`; die Gerätekarte nennt das Modell.

**APC40 MK2 (26.10.2026, spät):** `midi/apc.js` – `APC` (mode aus|raster|zeit|netz|ton|puls, gespeichert `myzel.apc.v1`), `apcScan` (aus `midiScan`: findet das Gerät per `profModel`, startet `apcFrame` alle 60 ms), `apcIn` (in `midiTake` nach dem Gerätebild: nur Kanal 1, Pads 0–39, Scene 82–86 = Modus, Shift 98, Play 91, Pfeile 94–97; Fader/Regler/andere Tasten → Belegungen), `apcPad(k, down)` (k = Reihe·8+Spalte, Reihe 0 oben; auch vom klickbaren Pad-Bild `apcModesRow` im Gerätebild). Lichter: `apcLights()` → [Velocity, Kanal] je Pad (Tabelle `APC_PAL`, Pigment über `apcVel`), `apcSendAll` schickt nur Änderungen; `apcSysex` stellt das Gerät per SysEx in den Alternate-Ableton-Modus (0x42), damit der Rechner die LEDs führt. Myzelnetz und Sequenzer laufen über `apcTick` im `tickRun` (T 14) auf dem Taktgeber, auch wenn ein anderer Modus gezeigt wird; Zeitreise erntet mit `apcHarvest(b0, b1)` (Plan `kind: 'grid'`, Einstieg nächste Eins). Test `dev/tests/v2/t-apc.js` (9/9, simuliertes Gerät, nur Chromium) – am echten APC ungetestet (Notennummern laut Akai-Protokoll).

**Pigmente (26.10.2026, spät):** `hexenring/farben.js` – `HX_PIG` (12, dunkel → hell), `hxPig(L)`: L.col (gewählt) oder
L.colA (aus der Nulldurchgangsrate der ersten Schicht, nächstes freies); Ring (ringleiste.js), Mixer-Streifen (`--c`,
mixer.js), Ring-Menü und Editor (`hxColRow`). Gespeichert in hxRecOf/hxSnap.

**Gerätebild (26.10.2026, spät):** `js/midi/geraetebild.js` + `css/geraetebild.css`. Katalog `CB_MODELS` (Reihen-DSL:
cbR(kind, n, lab, {sz, gap, cols/grid, same, deco, m})); PCR-M50 nach dem Foto des Besitzers (`PCRM_SEC`). Einmessen
speichert je Gerätename die Nachricht jedes Elements (`myzel.gbild.v1`); `cbLogical` schreibt gelernte Bindungen
(Regler → CB_KNOBS, Fader → CB_FADERS in Pult-Reihenfolge, „Master/Volume“ → mst.vol, M/S-Reihen → mute/solo,
übrige Taster → CB_BUTTONS, Pads → PADFN). `xhxr.vol/pan/mute/solo` sind jetzt Ziele (mtParam). Hook: `midiTake` →
`cbIn` (leuchten; beim Einmessen geschluckt). Test: `dev/tests/v2/t-gbild.js` (simulierter PCR-M50). Werks-CCs nur
für bekannte Modelle (nanoKONTROL2, APC40 MK2, APC mini) – sonst Einmessen. Nächstes: Schleifen einfärben, dann die
fünf APC40-Modi (`apcModesRow` wird schon aufgerufen, wenn es existiert).

**24 Plätze, geteiltes Lager (26.10.2026, spät):** `HX_SLOTS = MOBILE ? 8 : 24` (humus.js); die Ringleiste zeigt
`clamp(midW / 40, 4, 24)` Ringe pro Seite und blättert allgemein (ringleiste.js). Die Sendepaare fürs Nähren sind nicht
mehr der Platz, sondern `hxSendCh(L)` – höchstens `HX_SENDS = 16` gleichzeitig (ein Ausgang hat höchstens 32 Kanäle).
Ernten: `HX_LAGER` (vorrat.js) – je Ring eine Map Stück-Nummer → WeakRef auf [L, R] (+ end, dr); eine Ernte ist eine
Liste von Verweisen; geholt wird nur, was fehlt. Speicherzählung zählt jedes Stück einmal. Test: t-hx-vorrat (11/11).

**Ganze Ernte / 128 Takte / Mixer-Breite (26.10.2026, spät, #40):** `hexenring/vorrat.js` – nach dem ersten Füllen einer
Schleife kopiert `hxHumKeep` den ganzen Humus-Ring (bis zum Füllende) nach `L.hum` (nur Sitzung, zählt gegen hx.mem);
`hxReach` und `hxSchSwap` nehmen Schnitte daraus (`hxHumOf`/`hxHumSlice`), daher gehen alle Neuschnitte und ihr ↶ auch
nach dem Überschreiben des Rings. Editor-Zeile „Ganze Ernte“ (ab dem ersten Ton, Ränder/Ausschnitt ziehen, Takt-/
Schlag-Knöpfe, „wie geerntet“; Grundeinstellung setzt den Ausschnitt zurück). Grenzen: hx.humus ≤ 900 s (PC 300),
hx.festT/rec.bars ≤ 128, hx.mem ≤ 12000 (PC 6000), Noten-/Pegel-/Kettenprotokoll 15 min. Mixer: `mixer/breite.js`
(Breite am linken Rand, Einklappen). „Abdruck“ setzt jetzt alles zurück, was Wuchs erzwang (`hxAbdruck`). Test:
`dev/tests/hexenring/t-hx-vorrat.js`. Bekannt: `t-hx-mixer.js` scheitert auch auf dem alten Stand (Streifen doppelt im
Test, im Einzelversuch nicht) – offen.

**Klangbibliothek II (26.10.2026, spät):** Wunsch des Besitzers – „mindestens 20 neue Sounds, zahlreiche Presets,
exotisch, sphärisch, experimentell, psychedelisch, Ambient, LoFi, Trap, Avantgarde“. Gebaut: **22 neue Quellen**
(jede ein eigener Worklet-Prozessor in `myzel/src/js/dsp/`), neue Familie **Strom**, **24 Presets**. Konzept, Liste und
Stand: `dev/klang/BIBLIOTHEK.md`. Abnahme: `bench.js` (Zeilen „Klangbibliothek II“), Kosten in `VCOST1/3`. Nur in
Chromium geprüft. Bench: alle 22 grün (in Paketen – ein Lauf über alle stürzte nach 13 Quellen ab, Speicher des
Testbrowsers). reg.sh: v2/func meldet Lastgrenzen über dem Budget bei alten Quellen (der Lastwächter senkt das Budget
im belasteten Container mitten im Test – Umgebung), alles andere grün; perf ausgelassen.

**Neue Richtung des Besitzers (26.10.2026):** ab jetzt auf den **PC** konzentrieren (16 GB RAM, Firefox). Tests knapp
und gezielt (Bau, Syntax, die betroffene Suite; neue Klänge: Pegelmessung) – keine Gesamtläufe und keine Leistungsmessung
mehr; bei Problemen schickt der Besitzer den Leistungsbericht seines PCs. **Nächste Etappe:** der ganze Humus-Inhalt
bleibt beim Ernten mit der Schleife erhalten, im Bearbeiten-Fenster als Wellenform mit verschiebbarem Ausschnitt
(Anfang/Ende auf Takte, sofort hörbar, ↶/↷/Grundeinstellung – „früher“ im Korb wird dazu eine Abkürzung); Schleifen und
Aufnahme bis 128 Takte (Humus entsprechend länger, volle Qualität, Float32).


Neu seit dem Stand unten (Wunsch des Besitzers, 25.10.2026 nachts – „Länge fehlt, wo bin ich beim Einspielen, Bearbeiten
und Mixer für Schleifen nicht gefunden“), je eine Etappe, jede getestet und veröffentlicht: **4j** Länge an der
Ringleiste + Positionsanzeige (#28), **4k** Mixer-Ansicht „Schleifen“ (#29), **4l** Rechtsklick-Menü und Fenster
„Ansehen und bearbeiten“ (#30), danach am 26.10. Nachträge (#31–#33: Lücken-Markierung, Rückgängig/Grundeinstellung/
exakte Wellenform, Abschnitte) und Nachtrag 4 (sofort hörbar, Vorhören mit Play/Stopp, Zoom – unter 4l). Rückmeldung
des Besitzers dazu abwarten (nur in Chromium geprüft). Die Gesamtprüfung
(reg.sh, Lastwächter) lief für diese drei nicht – nur die betroffenen Suiten; einmal nachholen.

### Davor (Stand 25.10.2026, abends)

Veröffentlicht ist alles bis Pull-Request #26 (Pages aus `ccr-c7c5d0a6-cus3ip`, jede Veröffentlichung auf GitHub
erfolgreich geprüft). Am 25.10.2026 dazugekommen (Einzelheiten unter 4c–4i): Überlast/Harz in WebAssembly, Firefox-Ruhe
aus, Looper leuchtet + Tooltips + Rückmeldung bei jedem Klick, Ernte-Zeile bleibt, Touché SE mit acht Spielweisen
(4g), Halten-Knopf (4h), Raster für Aufnahmen von Hand (4i). Nichts liegt halb fertig. Offen:

- **Rückmeldung des Besitzers abwarten** zu Touché (Streichen, Vokal, Platte, Gleiten – Stärken nach seinem Ohr
  nachstellen), Halten und Raster; alles nur in Chromium geprüft, sein Hauptbrowser ist Firefox.
- **Testfehler klären** (unter 4g notiert): `v2/func` Lastzeilen und mehrere `motion-tests` – auf dem Stand vor #24
  laufen lassen und vergleichen, dann beheben oder als vorbestehend markieren. Testserver losgelöst starten
  (`setsid nohup python3 -m http.server 8790` in `<scratch>/v2`).
- **Vorgemerkt, erst auf Zuruf bauen:** Naturaufnahmen (alle vier Verwendungen, Quelle offen), Schleifen einzeln im
  Mixer, Rechtsklick-Menü einer Schleife, übrige Touché-Ideen, Looper E4–E8 (`dev/IDEEN.md`).

## Davor (Stand 24.10.2026, nachts)

Veröffentlicht ist alles bis Pull-Request #11 (Pages aus `ccr-c7c5d0a6-cus3ip`); Punkt 3 und 4 (Branch
`claude/handoff-ideen-review-5ca6uj`) wurden am 25.10.2026 veröffentlicht. Offen, in dieser Reihenfolge:

1. **Ausrichtung – entschieden (24.10.2026):** der **PC mit Keyboard ist Hauptgerät** (dafür entwickeln, messen,
   optimieren); das iPad läuft über die Web-App mit (MIDI dort evtl. über eine iPad-Browser-App wie „Web MIDI Browser“
   oder „Bluefy“ – ungetestet, Besitzer probiert). **Das Handy wird nicht weiter verfolgt** (keine eigene Arbeit, keine
   Fragen mehr dazu – so war es besprochen). Grund: Apple verlangt 99 €/Jahr für eigene Apps; am PC mit Keyboard macht es
   dem Besitzer am meisten Spaß. Native App später zuerst für Windows (siehe `dev/IDEEN.md`).
2. **Looper-Bedienung neu:** Audit, Konzept und klickbares Mockup liegen in `dev/looper/bedienung/` (AUDIT.md, KONZEPT.md,
   mockup.html; privates Artifact: https://claude.ai/artifact/UDuaiAtuLNikwVvJ6NuRnu). **Entschieden (24.10.2026):**
   E1 ja (● legt Schichten auf die aktive Schleife, „+“ beginnt eine neue), E2 (a) (⤓ über laufenden Schleifen legt eine
   neue Schleife an und fragt „als Schicht auf Schleife 1?“); E3 entfällt (Handy). **E4–E8 bleiben offen – nichts bauen**,
   bis der Besitzer es sagt. Beim Umbau: zuerst Maus, Tastatur, Tastenkürzel und MIDI, Touch zweitrangig.
   B1 (Doppeltipp) ist behoben; B2–B13 gehören in den Umbau.
3. **Restliche kurze Aussetzer am PC – Taumeln gebaut (24.10.2026, veröffentlicht 25.10.2026):** Resampler und Entdriften laufen bitgleich in WebAssembly (SPEC §10.5 „As built (Taumeln faster)“).
   Live kosten 6 Schleifen mit Taumeln 3,3 statt 4,7 Punkte eines Kerns (Grundlast der App ohne Schleifen ≈ 20,7) – Taumeln
   war live ein kleinerer Teil als gedacht. **Rückmeldung des Besitzers (24.10.2026, vor diesem Schritt):** am PC
   „weitgehend stabil“, viele Schleifen und gleichzeitiges Spielen gut; einmal musste er die Qualität auf „Mittel“
   stellen. Nächste Kandidaten, wenn es weiter aussetzt: ein „Leistung messen“-Bericht vom PC (Zeilen `ulog`, `loops`
   mit `rs=wasm`), dann die Grundlast der Live-Kette und der Stimmen messen (das ist jetzt der größte Teil), Schleifen in
   Workern vorausrechnen (SharedArrayBuffer über einen Service-Worker-Umweg), WebAssembly für weitere teure Kerne.
4. **Lastwächter:** `baseline.json` neu gemessen (24.10.2026, Referenz = der Stand mit WebAssembly) – die Mehrlast in der
   Android-Nachbildung kam vom Standard „Minimal“ (Entscheidung des Besitzers), nicht von einem Fehler.
4b. **Überlast am PC (25.10.2026, veröffentlicht):** Bericht des Besitzers: Aussetzer beim Halten mehrerer Tasten mit
   Stimme + Schale (Ebene 2) und Regen „Membran“ auf Qualität 3 – nicht die Schleifen (alle angehalten). Die Startmessung
   erlaubte 114 Einheiten, es setzte bei 94 % davon aus; der Wächter griff erst nach 2 s, und gehaltene Töne liefen weiter.
   Gebaut (Entscheidungen des Besitzers): Am Rechner/iPad ein Schritt sofort, wenn eine Sekunde ≥ 30 ms verlor, höchstens
   alle 2 s, bis 30 %; was über dem neuen Limit liegt, blendet aus (älteste gehaltene, Ebene 2 zuerst – `vShed`); das Limit
   pro Gerät und Stufe wird gemerkt (`myzel.guard.v1`, `gdLearned`/`gdlSet`), alle 10 min ohne Aussetzer eine Stufe höher.
   Harz rechnet in WebAssembly (bitgleich, ≈ 1,4×). **Achtung:** Die „Schale“ des Besitzers ist die native Klangquelle
   `sch` (Browser-Bausteine), nicht Harz – sie lässt sich nicht in WebAssembly beschleunigen, ohne sie als eigenen
   DSP-Code neu zu schreiben (dann nicht mehr bitgleich: Entscheidung des Besitzers). Das spricht für die eigene Engine
   (Mehrkern im Browser oder Standalone, siehe Gespräch 25.10.2026 und `dev/IDEEN.md`).
4c. **Firefox ist die Basis (Besitzer, 25.10.2026):** Dort läuft Myzel beim Besitzer einwandfrei, besser als in Chrome.
   Firefox meldet keine Aussetzer, der Lastwächter bleibt dort untätig – so lassen (ein Wächter über die Audio-Uhr war
   gebaut, 734b79f, und ist wieder herausgenommen: nur in Chromium prüfbar, und nicht nötig). **Als Nächstes laut
   Besitzer: Unklarheiten im Looper bereinigen** (er nennt die Punkte), danach die Standalone-App (Windows) als Prototyp.
4d. **Firefox: keyboard stumm nach langer Sitzung (Bericht 25.10.2026):** MIDI kam an, kein Ton, bis zum Neustart des
   Browsers. In Chromium nicht nachstellbar (25 min, 16 Presetwechsel, MIDI-Akkorde und Läufe: immer Ton, 0 Stimmen übrig,
   Speicher stabil – `scratchpad/soak/long.js`, nicht im Repo). Verdacht: Ruhe (auf Chromiums Regeln gebaut). Gebaut:
   Ruhe bleibt in Firefox aus (`FIREFOX`, `IDLE.auto`), veröffentlicht. Kommt es wieder: Firefox-Konsole (Strg+Umschalt+K)
   und „Leistung messen“ vom Besitzer; nächster Verdacht die Ruhe der Kettenkopie (`HXF1`, Hexenring) – gleiche Bauart.
4e. **Looper klarer (Besitzer, 25.10.2026, veröffentlicht):** Spielende Schleifen leuchten (lumen-Scheibe und Glühen,
   pulsierend auf jedem Schlag, `hxDrawRing`; Wort in lumen, `.hx-ring.spielt`). Tooltips überall: `js/hexenring/tips.js`
   (`HX_TIP` nach Zeile|Text, Abschnitt|Text, Text, sonst aria-label; `@Zeile` am Zeilennamen; `HX_TIP_P` für die
   Einstellungen; `hxTipsWatch` hält sie nach jedem Render aktuell; die Ringleiste setzt ihre in `hxRailTips`). Neue
   Knöpfe brauchen einen Eintrag – `t-hx-tips` prüft, dass jedes sichtbare Element einen hat. Danach (Besitzer): kein Wort mehr unter
   einem Schleifen-Ring (nur „abbrechen“, wenn etwas wartet), und die Zeile nach einer Ernte bleibt, bis man sie mit ✕
   schließt (`until: Infinity`).
4f. **Rückmeldung bei jedem Klick (Besitzer, 25.10.2026, veröffentlicht):** „man hat oft das Gefühl, es war ohne Wirkung“.
   Jeder Druck in Ringleiste und Karte blitzt (`hxBlitz`/`hxBlitzOn`, ein fixiertes `.hx-blitz` über dem Knopf – überlebt
   das Neuzeichnen). Was `hxSay` sagt, steht jetzt auch sichtbar über der Leiste (`#hxMsg`, `hxMsgShow`, 2–4,5 s); ein
   Toast im selben Moment gewinnt (`toast.at`, `hxMsgHide`). Ein auf die Eins wartender Stumm/An-Wechsel hat einen
   gestrichelten Ring (lumen: kommt, hypha: verstummt). Test `t-hx-rueck` (7 Zeilen, in run-all).
4g. **Touché SE (Besitzer, 25.10.2026, veröffentlicht; er hat eins):** Profil `tch` in `js/midi/profiles.js` (Name
   `/Touch[eé](?![a-z])/i`), „wie ein Finger“: Werks-CCs des Standalone-Modus (Expressive-E-Hilfe) 17 weg → `mod.hoehe` +,
   16 heran → `mod.hoehe` − (inv), 18/19 → `mod.bend` ∓/± ±1 Halbton (min/max 0.5) – über Formen, also auf alle gehaltenen
   Töne (Tasten und Feld), Preset unberührt. Test `midi-tests/t-map-touche.js` (18, in run-map; Slot mm). Am Gerät
   geprüft (Besitzer, Chrome): geht. Danach: das Leuchten des Tons folgt Formen · Höhe/Tonhöhe auf dem Feld
   (`visuals.js`, wie `gaGlow`; Bilder `out/touche-0/1.png`). Der Drehknopf des SE sendet kein MIDI (Empfindlichkeit, 8
   Stufen auf 4 LEDs; Drücken = Freeze) – darum die Spielweisen in Myzel (`js/midi/touche.js`, `midi.tch`, F1–F4 nur mit
   Touché, Chips in der Geräte-Karte, Ziele `tch.weg/her/li/re`, `tch.1–4`, `tch.next`): Finger, Atem (Ruhe Ausdruck −0.55,
   weg schwillt an, heran Filter dunkel, links/rechts Vibrato auf allen Tönen), Raum (Hall, Echo, Panorama), Verwandlung
   (Morph A/B, Filter). Quellen `map:tch:*` (die Fährte/Bewegung schreibt sie mit); ohne Touché bleibt nichts (Prüfung je
   Sekunde). t-ui hatte schon vorher 5 Fehler (Abschnitt-Reihenfolge, viewer/ios, 44-px-Pads) – nicht von hier.
   Danach (Besitzer): in Ruhe darf keine Spielweise den Klang ändern (Atem nicht mehr leise in Ruhe); jede Richtung wird
   an ihrem stärksten Druck gemessen (`tchCal`, `TCH.pk`, gespeichert `myzel.tch.pk`, „Neu einmessen“) – die Seiten des
   SE haben kurzen Weg. Brainstorming (14 Ideen) in `dev/IDEEN.md` „Touché SE – neues Terrain“; der Besitzer ließ die drei
   empfohlenen bauen, „Finger“ bleibt fein (sein Wunsch):
   - **Gleiten** (⇧F1): wie Finger, Seiten ±700 Cent am neuesten Ton (`TCH_OPT.g`, per).
   - **Streichen** (⇧F2): ohne Druck still (`expr` = Druck − 1), die Höhe aller Töne absolut aus dem Druck (`TCH_OPT.s`,
     per: (TCH.sy − tt.y)/MOD_HSPAN) – bei Halm/Harz/Kehlchen/Böe/Glut ist die Höhe die Erregung; Seiten ±1 Halbton.
   - **Platte** (⇧F3): `tchPlatte` schickt `band {vs, T, lin:1}` an die Fokus-Schleife (sonst die neueste, die spielt);
     `ring.js` kennt dafür `G.lin` (gerades Gleiten, `vsPos`/`vsRate`) und 0.03 … 2.4 – das Bisherige bitgleich.
     Test `hexenring/t-hx-touche.js` (6, in run-all).
   - **Vokal** (⇧F4): Formen-Ziele `vok`, `vokO`, `vokV` (hx: in die Schleife gebacken, `werk.js`); in `makeChain` nach dem
     Filter drei Bandpässe (`VOK_F`, `VOK_C`, `VOK_MAKEUP`, `vokConnect`), erst beim ersten Gebrauch gespeist – vorher
     kosten sie nichts, in Ruhe ist die Kette exakt wie vorher. t-map-touche misst a/i/u an weißem Rauschen.
   Klang nur in Chromium geprüft; Stärken (Formant-Q, Makeup, Platte-Bremse) nach dem Ohr des Besitzers nachstellen.
   **F5–F12 (Besitzer, 26.10.2026: „viel weitreichendere Klangformung, acht weitere F-Tasten, jede fundamental anders“;
   gewählt: den aktuellen Klang formen, keine eigenen Klänge):** `TCH_W` 16 Einträge (`tchKey`: F1–F4, ⇧F1–F4, F5–F12),
   `midi.tch` erweitert, Ziele `tch.9–16`. Einschub in den Kanälen Klang und Ebene 2 (`buildStrips`: `st.tD`/`st.tW`, danach
   `st.pt` – der Kanal-EQ hängt jetzt dort an), `js/midi/touche-fx.js` (`TFX`, `tfxSet` aus `tchApply`): erst bei Bewegung
   in den Weg, in Ruhe (Prozessor meldet `idle`) wieder heraus – dann exakt wie vorher; die Gespielt-Abgriffe hören ihn.
   Prozessor `myzel-tfx` (`js/dsp/touche-fx.js`, Ring 10,9 s): **Körner** (Körnerwolke, bis 6 s zurück, Tonhöhen-Streuung
   in Oktaven/Quinten, rückwärts), **Eis** (0,6 s eingefroren, Körner an Zufallsstellen, ±1 Oktave gleitend, Verwischen über
   2×4 Allpässe, dunkler + Oktave darunter), **Obertöne** (4× Überabtastung, tanh mit Versatz = gerade, Chebyshev = ungerade,
   Wellenfaltung, Kleinsignal-Verstärkung 1), **Stottern** (Ausschnitt 1 … 1/16 Schlag im Puls-Tempo aus dem Ziel der Hand,
   Band langsamer, Ausklingen + Tiefpass), **Resonanz** (6 Saiten auf die gehaltenen Töne, sonst Grunddreiklang; Druck =
   Nachklang 0,25 … 9 s, heller, Dispersions-Allpass = Glocke, ±1 Oktave; sanfte Pegelwache). **Ort** nativ: Verzögerung =
   Entfernung/343 (Doppler), Luft-Tiefpass, Nähe-Bass, `PannerNode` HRTF, Hall über Formen `rev`. **Fächer** spielt echte
   Stimmen der Klangquelle (`tfxFan`: Paar ±6 … 18 Cent, Oktave ↓/↑, Quinte; folgen Höhe/Tonhöhe, enden mit dem Ton) – ein
   Tonhöhenschieber auf dem Signal waberte hörbar (verworfen). **Arpeggio** (`tfxArp`, `hit` je Ebene; auf dem Puls-Raster
   2/3/4/6/8 je Schlag, sonst 3 … 16/s). Test `midi-tests/t-tch-fx.js` (13, in run-map). Nur in Chromium geprüft; ob der
   Browser F5/F11/F12 hergibt (Firefox!), am Gerät prüfen – sonst die Chips.
   **Offene Testfehler (25.10.2026, Besitzer: „notier dir den Fehler“):** im Regressionslauf nach #24 rot – `v2/func`
   (Last-Zeilen: q2 kor/glo/sai, q3 neb/hau/mem/sch – „load 39.98/32 …“, das Stimmenbudget) und `motion-tests` (Gestik-
   Erlaubnis/requestPermission, Ansicht gedreht, Pad „Gestik an/aus“, „nothing saved … myzel.guard.v1“, Dorisch-Nachbarstufe,
   „the patch is never written“, Sporenregen fällt links, scharfe Aufnahme startet mit dem Regen, Aufnahme in Takten). Ob
   sie schon vor #24 rot waren, ist nicht geprüft (der Vergleich auf `origin` vor #24 wurde angehalten); mindestens
   „myzel.guard.v1“ kommt von der gelernten Grenze (Etappe 4c), die Lastzeilen vermutlich vom Wächter/Budget. Nächster
   Schritt: `v2/func.js` und `motion-tests/run-all.sh` auf dem Stand vor #24 laufen lassen und vergleichen; den Testserver
   losgelöst starten (`setsid nohup python3 -m http.server 8790`) – als Hintergrundaufgabe stirbt er nach 2 h.
4h. **Halten (Besitzer, 25.10.2026, veröffentlicht):** ein Latch – `HOLD`, `holdSet/holdRelease/holdUI` in `play/touch.js`:
   `onUp` hält bei `HOLD.on` (außer `force`), `onDown` löst die gehaltenen, wenn nur gehaltene klingen (neuer Anschlag aus
   leerer Hand); Knopf `#btnHold` (Fermate, `ICON.hold`, leuchtet, `.carries` atmet), Eingabetaste, Ziel `hold`. Test
   `midi-tests/t-hold.js` (9, in run-map).
4i. **Raster (Besitzer, 25.10.2026, veröffentlicht):** `hx.raster` frei/takt/halb/viertel (`HX_RASTER`, `hxUnitOf`,
   `hxUnit(R)` in `grammar.js`): Beginn (`hx.start` am Takt/sofort/erster Ton) und Schluss auf der Einheit; ohne Takt setzt
   `hxRecStart` ihn mit `hxTaktSet(seq.bpm)` einen Takt nach dem Druck (`TG.keep`), Phase `wait` = Einzählen. „Frei“ ist
   wie vorher (Einheit 4 nur mit Takt). Gnade: ⅛ der Einheit, mindestens 0.1 s. Test `t-hx-raster` (8, in run-all).
4j. **Länge und Position (Besitzer, 25.10.2026, nachts):** „Beim Looper fehlt die Einstellung für die Taktlänge … und als
   Spieler sollte man sehen, wo man im Takt ist, wo man in der Schleife ist, wenn man sie einspielt.“ Die Einstellung gab
   es (`hx.laenge`/`hx.festT`), aber nur tief in der Karte, und ohne Takt galt sie nicht. Gebaut (`js/hexenring/laenge.js`):
   Knopf `#hxLen` rechts neben dem Hauptknopf (Zahl groß, „Takte“ darunter; unter 480 px Breite ausgeblendet), Fenster
   `#hxLenPop` (`hxLenOpen/hxLenRender/hxLenPlace`, `HXLEN`): Länge auto · 1 2 3 4 6 8 12 16 (ein anderer Wert aus der
   Karte erscheint dazwischen; „wie 1“ nur wenn gesetzt), Tempo (ohne Takt `seq.bpm` mit −/+, gehalten wiederholt; mit Takt
   nur angezeigt), Einzählen, Klick, „Alle Einstellungen …“ (öffnet die Karte samt Einstellungen). Eine feste Länge zählt
   ohne Takt wie das Raster einen Takt im Puls-Tempo ein (`hxRecStart`: `fest` wie `ra`); `hxBase` zählt die eben
   aufgenommene Schleife nicht mehr als Schleife 1; eine geänderte Länge gilt für die wartende oder laufende Aufnahme, wenn
   ihr neues Ende noch vor uns liegt (`hxLenLive`). Position: `hxRecPos(t)` (ein · ton · rec · frei · ueber),
   `hxPosWords`, `hxPosDraw` oben im Feld (aus `hxVisFrame`; `HXLEN.box` für die Tests), die Taktlinie der Leiste zeigt
   während einer Aufnahme deren Schläge (`hxDrawTakt`). MIDI-Ziele `hx.len` (Drehknopf, `step`), `hx.len.next/prev`.
   Hauptknopf ab 480 px 56 px breit (Wörter ganz). Test `t-hx-laenge` (19, in run-all). Nur in Chromium geprüft.
4k. **Schleifen im Mixer (Besitzer, 25.10.2026, nachts – „separater Mixer für Schleifen“):** dritte Ansicht des Mixers
   `MXV.views.schleifen` (`js/hexenring/mixer.js`, `HXM`, `hxmBuild/hxmSync/hxmFrame`): pro Schleife (Platz-Reihenfolge,
   ohne Bewegung) Kopf (Tipp: Karte), Zustand, Balance-Knopf, M und S sofort (`hxmMute`, `hxmSolo` – ein auf die Eins
   wartender Wechsel wird zu seinem Zeitpunkt überschrieben; S merkt die Zustände in `HX.solo` wie `hxRingSolo`), Fader
   auf dem Gesetz des Pults (`mxDrag`, `mxStemBody`/`mxMeter` auf einem Stellvertreter-Streifen, Farbe `MXK.hxr`),
   Pegelanzeige aus `HX.meter` (nach Gain und Balance); „Alle“ = `xhxr.vol`/`xhxr.mute`. Balance pro Schleife: `hxPan`
   (`L.pan`, in `hxSnap`/`hxRebuild`/`hxRecOf`/Wiederherstellen und `hxLoopMake` → `hxLoopNew`); der Prozessor kannte
   `pan` schon. MIDI-Ziele `hx.ring.N.stumm`, `hx.ring.N.balance` (dazu wie bisher `.pegel`, `.solo`). Test
   `t-hx-mixer` (10, in run-all).
4l. **Ansehen und bearbeiten (Besitzer, 25.10.2026, nachts – „Die Editiermöglichkeit hab ich nicht gefunden“):**
   `js/hexenring/bearbeiten.js` (`HXE`). Rechtsklick auf einen Ring (Maus; ein langer Touch öffnet weiter die Karte):
   Menü `hxCtxMenu` (Ansehen und bearbeiten · Karte · Stumm/An bzw. Weiterspielen · Solo · Als Aufnahme · MIDI · Löschen;
   leerer Ring: „Hier aufnehmen“), Pfeiltasten, Esc. Fenster `hxEdOpen` (auch Umschalt+1…8 in `hxKeyDown`, Kopf eines
   Streifens im Schleifen-Mixer) über dem Feld (`hxEdPlace` aus `#stage`): Wellenform aller hörbaren Schichten
   (`hxEdPeaks` aus `S.aud`, Fenster `pre…pre+len`, mit Pegel), Takt-/Schlaglinien, Noten (`L.notes`), Spielkopf
   (`hxEdFrame`, Teil 27 in „Leistung messen“), Auswahl durch Ziehen auf ganze Schläge (frei: 1/16) →
   `hxBandTrimTo(L, a, f)`; `hxBandTrim` rechnet jetzt mit Beginn `a` (`hxTrA`, alte Einträge mit `i` gelten weiter),
   ½/¼/◀▶/ganz wie vorher. Schichten mit eigener Wellenform, Pegel, stumm, löschen; Werkzeugzeilen wie die Karte.
   Behoben: `hxBandFl` merkt die ungetrimmten Noten (↶ nach dem ersten Trimmen ließ nur die getrimmten). Test
   `t-hx-bearbeiten` (10, in run-all). Nachtrag 26.10.2026 (Besitzer: „weg 15 %“ blieb auf „weg aus“ markiert): `hxEdSig` beobachtet jetzt auch `slc`, `vb`, `ab`. Nachtrag 2 (26.10.2026, Besitzer: Tauschen ließ sich nicht abschalten; alles sofort rückgängig; Grundeinstellung;
   Wellenform exakt): Zeilen Weglassen/Tauschen/Altern mit eigenem „aus“; `hxSpeed`, `hxVbSet`, `hxAbSet`, `hxSlcSet` legen
   einen Schritt in den Verlauf (`o.noHist` beim Zurückspielen; ein noch wartender Bandwechsel nimmt seinen Schritt mit,
   `hxAbPut`, `hxSlcPut`), Schicht-Pegel/-Stumm im Fenster ebenso (`hxEdSchStep`); ↶ ↷ im Fensterkopf;
   `hxDefaults(L)` + `hxHistGroup` (ein Schritt; Pegel, Balance, Schichten und Verdoppeln bleiben), auch in der Karte;
   `T0.rev/revW` beim ersten Trimmen – „ganz“ setzt die Richtung passend zur Aufnahme (vorher konnte sie danach falsch
   stehen). Wellenform: `hxEdRenderPass` rendert offline drei Durchgänge mit dem Prozessor (gespielte Version je Schicht,
   Pegel, Band, `hxBandSliceOf`, Verblassen, Abrieb), gezeichnet der dritte, Maßstab = Spitze der Aufnahme; bis dahin
   die rohe Aufnahme mit „Klang wird berechnet …“. Abrieb zeigt den dritten Durchgang, nicht den Verschleiß seit Beginn.
   `t-hx-bearbeiten` 15. Nachtrag 3 (26.10.2026, Besitzer: „einzelne Abschnitte separat editieren“; Entscheidung: ein
   Abschnitt behält seine Länge): `js/hexenring/abschnitt.js` – `hxRegionEdit(L, a, b, op, v)` schreibt in die Audio jeder
   Schicht (trocken und eingebrannt, dieselben Frames; `tr0` bekommt sie mit): `band` (Kaiser-Sinc 32 Taps `hxRsRead`,
   Grenzfrequenz bei schneller gesenkt; ×2 wiederholt mit 5-ms-Überblendung, ½ spielt die erste Hälfte), `rev`, `weg`/
   `tausch` an den Anschlägen (`hxBandU`), `gain`; 5-ms-Überblendung an den Rändern; ein Schritt (`hxBandStep`, ↶ tauscht
   die vorige Audio zurück). Bei Wuchs abgelehnt (es spielt dann nicht die Aufnahme). Im Fenster der Kasten „Abschnitt
   bearbeiten“, sobald eine Auswahl steht; Wellenform mit `hxEdWf` (Band der ganzen Schleife: kürzer/Länge bei ×1).
   Die Noten (Ring, Notenbalken) folgen einem Abschnitt-Band nicht. Wellenform-Rendern mit der Länge aus `L.d` (der kommende
   Durchgang – eine Änderung wartet bis zur Naht, `L.prev`; vorher wurde mit der alten Länge gerechnet: Bild abgeschnitten),
   Hinweis `.hx-ed-wait` mit den Sekunden bis zur Naht. `t-hx-bearbeiten` 20.
   Nachtrag 4 (26.10.2026, Besitzer: „erst zu hören, wenn die Schleife fertig gespielt hat – on the fly besser; Stufe −1,
   Krebs, dünner ohne Wirkung; Play/Stopp und an beliebiger Stelle weiterspielen“). Diagnose: die Noten-Werkzeuge wirkten
   (neu gerendert in ≈ 1,5 s), aber erst an der nächsten Naht – bei seiner 109-s-Schleife bis fast 2 min. Jetzt
   **sofort**: `hxSwapAt(L)`/`hxNowOk(L)` (recuts.js) – Tausch mitten im Durchgang (Prozessor-Überblendung an derselben
   Stelle, `XM` = `HX_XM` 25 ms, neu in `replace`), außer eine neue Länge (`L.prev`, wartender Bandwechsel) oder ein
   anderer Tausch (`S.swapF` in der Zukunft, z. B. das Einbrennen) wartet noch – dann an der Naht wie bisher. Sofort:
   `hxRegionEdit`, `hxRev`, Wuchs-Versionen der Noten-Werkzeuge (`hxWUpdate(L, {now})` → `hxWPlay(…, now)`), Weglassen/
   Tauschen (`hxBandSend(L, now)` → `slice.now`: Prozessor `slNow` – was klingt, klingt als Schwanz aus, die neuen
   Scheiben setzen mit 12 ms ein), ↶ ↷ davon ebenso (`hxGeoBack(L, g, {now})` gibt zurück, ob sofort). Band und Trimmen
   bleiben an der Naht (sie ändern die Länge). **Vorhören** `js/hexenring/vorhoeren.js`: ▶/■ im Fenster (Leertaste bei
   Fokus im Fenster), spielt den gerenderten Durchgang (`hxEdRenderPass` behält ihn als `buf`; über 20 s nur zwei
   Durchgänge) über `stripIn('hxr')` mit Pegel/Balance der Schleife; die Schleife selbst schweigt (`L.pvMute` in
   `hxGain`), die anderen spielen weiter; Klick in die Wellenform spielt ab dort (in der Auswahl bleibt sie), Auswahl
   wiederholt sich („Auswahl wiederholen“), eine neue Berechnung übernimmt an derselben Stelle (30 ms), Uhr Takt/Schlag/
   Sekunden, `idleSrc` zählt es. Zoom (`HXE.zv`, Strg+Mausrad, −/+, „Auswahl“, Umschalt+Mausrad schiebt, folgt beim
   Abspielen; Spitzen aus dem gerenderten Puffer), Alt beim Ziehen = Sechzehntel. Umgeformte Noten hell, gespielte blass
   (`hxEdNtMarks`); Hinweis „Die Noten werden neu gespielt …“. Test `t-hx-vorhoeren` (neu, in run-all): jedes der
   16 Werkzeuge ändert den gerenderten Durchgang und ↶ stellt ihn exakt her, sofort hörbar, Sinus ohne Knack durch
   Scheibenwechsel und Tausch, Transport, Zoom. Nur in Chromium geprüft. Dabei zwei Fehler aus #32 behoben: ↶ brach
   den Bandwechsel ab, auf den ein ↶ selbst noch wartete (statt den Schritt davor zurückzunehmen – Wartende mit
   `replay` zählen nicht), und ein zweiter Bandwechsel vor der Naht rechnete vom falschen Stand (`hxSpeed` nimmt den
   eigenen wartenden zuerst zurück, dann `was`); die Schleife konnte danach doppelt so lang sein.
   Nachtrag 5 (26.10.2026, Besitzer: „im Mixer fehlen die einzelnen Schleifen“ – gewählt: direkt im Pult; „zwei
   Spielköpfe – welcher spielt?“): Gruppe „Schleifen“ im Pult gleich nach der Spiel-Gruppe (`hxmPultGroup` aus
   `mxBuildPult`, `HXMP`, gleiche Streifen wie die Ansicht über `hxmSyncR`/`hxmDrawR`, nur solange es Schleifen gibt,
   Überschrift klappt ein, `localStorage myzel.hxmPultFold`; neu/weg → `mxLayout`). Beim Vorhören zeichnet der Editor
   nur dessen Spielkopf, gestoppt die Marke nur als Dreieck. `t-hx-mixer` 12.
   Nachtrag 6 (26.10.2026, Besitzer: „Grundeinstellung funktioniert nicht immer“): (1) Abschnitte stehen in der Audio –
   `hxRegionEdit` behält vor der ersten Bearbeitung die Audio wie aufgenommen (`L.rx0`: je Schicht aud/bak/n + `hxSnapS`,
   ob rückwärts, `dbl`; in `hxBandFl`, also mit ↶ ↷), `hxRxRestore` tauscht sie in `hxDefaults` zurück (gespiegelt, wenn
   nötig; gleiches Fenster: die Naht wie damals). Nach Verdoppeln oder Zusammenlegen nicht (anderes `n`/andere Schicht);
   nach einem Neuladen ist `rx0` weg (nur im Speicher). (2) `hxBandTrimDo`: `T0.sp` – „ganz“ rechnet die Länge mit dem
   Bandtempo seit dem Trimmen (vorher halbe/doppelte Länge nach Trimmen + Band). Test `t-hx-grund` (6, in run-all).
   Nachtrag 7 (26.10.2026, Besitzer, Bild: nur Schleife 1 gezeichnet): die Ansicht „Schleifen“ wird gemerkt
   (`myzel.mixview`) – öffnete der Mixer direkt darin, hatte das Pult die Leucht-Sprites (`mxSprites`) noch nicht angelegt,
   `mxMeter` brach bei der ersten klingenden Schleife ab und die übrigen Kanäle blieben leer. `hxmStrDraw` ruft
   `mxSprites()` selbst; jeder Kanal zeichnet in eigenem try. Test `t-hx-mixer2` (öffnet direkt dort, in run-all).
5. **Offene Fragen ans Ohr:** Schale spricht wie früher das Harz-Glas manchmal spät an (soll sie immer sofort?);
   Bandträgheit, Gärtner-Bass, Musikalität der Antworten (siehe `dev/IDEEN.md`).
6. **Danach** die Liste in `dev/IDEEN.md` (Sample-Bibliothek, Stimme als Instrument, neue Klangerzeugung, native App).
   **Für später vermerkt (Besitzer, 25.10.2026):** Naturaufnahmen/Feldaufnahmen – alle vier Verwendungen gewünscht
   (spielbar auf dem Feld, Körnerwolke, Atmosphäre im Hintergrund, echte Räume für den Hall), Quelle noch offen; die
   Dateien muss der Besitzer hochladen (Freesound/Archive/Wikimedia sind aus der Claude-Umgebung gesperrt). Ebenfalls
   vorgemerkt: Schleifen einzeln im Mixer, Rechtsklick-Menü für eine Schleife, die übrigen Touché-Ideen
   (alle in `dev/IDEEN.md`).

**Arbeitsweise, die der Besitzer will:** ein Thema pro Bauabschnitt, lange Prüfungen (Gesamtprüfung, Lastwächter) nur
einmal vor der Veröffentlichung, kurz und ehrlich berichten, keine Gerätemodelle oder E-Mails ins (öffentliche) Repo.
Neue Klang-Logik als reiner DSP-Code schreiben (leicht nach C++ portierbar).

## Für den Besitzer – dein Bericht vom Rechner (24.10.2026, abends)

**Was los war:** Nach den ersten Aussetzern hatte Myzel am Rechner noch die alte Notbremse gezogen: sechsmal weniger
Stimmen (am Ende 29 statt 110) und eine einfachere Verzerrung – beides blieb bis zum Neuladen. Das war gegen deine Regel.
Dass „Lebendig“ nichts rechnete, lag nicht an den weniger Stimmen, sondern an derselben Notbremse: Sie schaltete die
lebendigen Schleifen bei jedem Aussetzer 30 Sekunden auf ihren festen Durchgang und fing immer wieder von vorn an.
**Gebaut:** Am Rechner und iPad wird nie mehr etwas einfacher. Bei Aussetzern geben zuerst die Schleifen nach (lebendige
spielen ihren letzten Durchgang weiter, das Taumeln ruht) und kommen nach einer ruhigen halben Minute von selbst zurück;
erst wenn das nicht reicht, spielt Myzel kurz weniger Stimmen gleichzeitig (höchstens bis zur Hälfte, gleicher Klang) und
gibt sie nach 30 s ohne Aussetzer Schritt für Schritt zurück. Am Handy bleibt alles wie bisher, nur kommen die Stimmen dort
jetzt auch zurück. Dazu: Ein Tipp auf die Knöpfe der Ringleiste löst am Handy nur noch eine Aktion aus (Korb, Hauptknopf
und ↶ feuerten doppelt – aus der Bedienungs-Prüfung).
**Die restlichen kurzen Aussetzer:** Nachgestellt (Schleifen wie bei dir, Latenz „Sicher“): Sie hängen mit nichts
Bestimmtem zusammen, das Myzel tut (kein Umstecken, keine Nachrichten, kein Aufräumen des Speichers) – es ist die Last des
Audio-Kerns, und den größten Teil bei den Schleifen kostet das Taumeln. Das schneller zu rechnen, ohne den Klang zu ändern,
wäre ein eigener Schritt. **Bitte** noch einmal „Leistung messen“ am Rechner: Der Bericht zeigt jetzt jeden Aussetzer mit
Zeitpunkt und was gerade geschah (Zeile `ulog`), und warum lebendige Schleifen nicht rechnen (`nichtLeb`).

## Für den Besitzer – Latenz am Handy (24.10.2026)

**Gebaut, wie du entschieden hast:** Auf Android steht die Latenz jetzt von selbst auf **„Minimal“** – bei neuen
Installationen und bei allen, die sie nie selbst umgestellt haben (wer „Standard“ oder „Minimal“ selbst gewählt hat,
behält das; ein gespeichertes „Sicher“ war bisher immer die Voreinstellung und wird jetzt „Minimal“). Setzt der Klang damit
immer wieder aus (nicht bei ein paar winzigen Aussetzern wie in deiner Messung), stellt Myzel ab dem nächsten Klangstart auf
„Standard“, danach auf „Sicher“, und sagt es einmal – mit „Jetzt neu starten“. Sofort geht es nicht: der Browser legt den
Puffer beim Klangstart fest, ein Wechsel mitten im Spiel hieße neu laden. Was du unter „Gerät“ selbst wählst, fasst Myzel
nie an; „Wieder automatisch“ dort macht es rückgängig. Rechner und iPad wie bisher. **Die Verzerrung behält in „Minimal“
ihre Überabtastung** (gleicher Klang wie in den anderen Stufen, Sample für Sample geprüft; 2–4 ms mehr). Schleifen, die
vorher in „Minimal“ aufgenommen wurden, klingen beim Neurechnen weiter so, wie sie aufgenommen wurden. Über 100 ms bis zum
Lautsprecher schlagen „Gerät“ und „Leistung messen“ „Minimal“ vor, auf Android auch Firefox (sehr kurz, aber ohne MIDI).
**Das Audio-Herz (AudioWorklet) kostet keine messbare Latenz:** in Chromium mit Android-Nachbildung gleiche Puffer- und
Ausgabewerte mit und ohne, gleiche Zeitstempel (±0,5 ms), vom Antippen bis zum Ton im Rauschen der Messung. Am echten Handy
bitte einmal „Leistung messen“ in der neuen Version – dort steht es endgültig.
**Entschieden (24.10.2026, „so lassen“):** In „Minimal“ nutzt Myzel auf Stufe 2 und 3 weiter 40 % statt 50 % eines Kerns
für Stimmen (mehr Reserve beim kleinsten Puffer; auf Android jetzt der Normalfall – höchstens weniger gleichzeitige
Stimmen, nie anderer Klang).

## Für den Besitzer – Updates beim Start (23.10.2026)

Die installierte App fragt jetzt gleich auf dem Startbildschirm nach einer neuen Version, bevor der Klang startet. Gibt
es eine, steht oben eine Karte „Neue Version verfügbar“ mit dem, was neu ist – „Jetzt aktualisieren“ lädt einmal neu,
„Später“ lässt alles wie es ist. Solange die Karte offen ist, warten alle anderen Hinweise. Offline oder bei langsamem
Netz hält nichts den Start auf; gespielt wird nie unterbrochen. Nach dem Aktualisieren steht einmal „Neu in dieser
Version“. Einmalig, beim Sprung von der jetzigen Version auf diese, kommt noch der alte kurze Hinweis „Neu laden“ – beim
nächsten Öffnen ist die neue Version da. Was neu ist, steht in `myzel/CHANGELOG.json`.

## Für den Besitzer – der volle Arbeitsspeicher am PC (24.10.2026)

**Was los war:** Jeder neu gerechnete Durchgang einer lebendigen Schleife blieb im Speicher – der Browser (Chrome) gibt
eine bestimmte Art von Rechenraum erst frei, wenn die ganze unsichtbare Rechen-Seite geschlossen wird. Nachgestellt: in
10 Minuten von 0,4 auf 1,6 GB, gut 100 MB pro Minute; das häufige Aufräumen des Speichers ist sehr wahrscheinlich das
Ruckeln. **Behoben:** Die Rechen-Seiten werden jetzt regelmäßig erneuert, laden schlanker, und lebendige Schleifen mit
Myzels eingebauten Klängen brauchen diesen Rechenraum gar nicht mehr. Nachgemessen 15 Minuten: der Speicher bleibt
flach (etwa 0,5 GB). Bei Klangquellen mit eigenem Rechenkern (Harz, Halm u. a.) bleibt pro Durchgang noch ein kleiner Rest
im Browser (unter 1 MB) – deutlich weniger als vorher, aber nicht null. Am Klang ändert sich nichts.

## Für den Besitzer – deine zwei Messberichte (23.10.2026, nachts)

**Was los war:** In Bericht A spielte keine der 8 Schleifen (sie waren angehalten, etwa nach dem Neuladen) – trotzdem
rechnete das Audio-Herz jede von ihnen weiter, samt Taumeln, und nur am Ende wurde stumm geschaltet. Myzel zählte
angehaltene Schleifen aber als kostenlos; die Notbremse für die Schleifen griff nur bei spielenden. So landete sie beim
alten Mittel und nahm deinem Live-Spiel viermal Stimmen weg (übrig blieben 2). Nachgestellt: genau dieser Zustand.
**Behoben:** Angehaltene und stumme Schleifen kosten jetzt nichts (Sample für Sample der gleiche Klang, auf jedem Gerät);
die Kopie der Effektkette und die Ruhe schlafen dann auch. Auf dem Handy (nie iPad oder Rechner) gilt jetzt die
vereinbarte Reihenfolge: zuerst spielen lebendige Schleifen ihren letzten Durchgang weiter, bis wieder Luft ist (nichts
wird neu gerechnet), dann ruht das Taumeln – und dein Live-Spiel behält immer alle Stimmen. Im Nachbau mit 8 Schleifen,
4 davon lebendig, auf einem gebremsten Kern: Aussetzer pro 5 s von gut 400 auf 0. In der Karte und unter „Leistung“
steht, wie viel die Schleifen gerade belegen; „Leistung messen“ zeigt es pro Schleife, dazu die Arbeit fürs Lebendige,
wann Myzel entlastet hat und die echte Latenz.
**Die 400–500 ms vom Antippen bis zum Ton** kommen fast ganz von der Latenz „Sicher“: dein Handy meldet dort 128 ms
Puffer plus 257 ms Ausgabe. Bitte einmal mit „Standard“ messen.
**Zum Entscheiden (nicht gebaut, weil es den Klang ändert):** siehe „Owner's calls“ unten, Punkt „Handy und Schleifen“.

## Für den Besitzer – „am Anschlag“ am Handy (23.10.2026, abends)

**Was los war:** Dass die drei Qualitätsstufen keinen Unterschied machen, hieß: Nicht die Stimmen bremsen, sondern etwas,
das immer gleich viel kostet. Nachgestellt (Handy mit 120-Hz-Bildschirm, hoher Auflösung, Spielen mit dem Finger,
gebremster Rechenkern): Der Hauptthread war auf allen drei Stufen zu 94 % ausgelastet – fast alles davon ist das Zeichnen
des Felds –, jedes fünfte Bild kam zu spät, ein Fingertipp wartete 60–80 ms, bis er überhaupt drankam.
**Gebaut:** Der **Handy-Modus** (unter „Gerät“ → „Leistung“, auf Handys von selbst an, nie auf iPad oder Rechner; mit
Schalter): Das Feld zeichnet mit etwas geringerer Auflösung und, solange das Handy ausgelastet ist, 30 statt 60 Bilder pro
Sekunde – gleich schnell, gleiche Spuren. Im Nachbau: Hauptthread 94 → 55 %, zu späte Bilder 19 → 1 %, Warten des Fingers
70 → 26 ms, vom Antippen bis zum Ton 110 → 63 ms. **Am Klang ändert sich nichts** (Sample für Sample geprüft).
**Bitte:** Unter „Gerät“ → „Leistung“ auf **„Leistung messen“** tippen, das Panel schließen und 20 Sekunden ganz normal
spielen (gern mit Schleifen, so wie es sonst ruckelt). Danach kommt ein Hinweis; dort stehen eine kurze Auswertung und
„Kopieren“ – den Bericht einfach in den Chat einfügen. Gesendet wird von der App nichts. Am besten zweimal: einmal mit
Handy-Modus an, einmal aus. Der Bericht zeigt auch, ob der Klang selbst aussetzt – das kann der Handy-Modus nicht beheben
(er ändert nur das Bild); falls es so ist, schlage ich dir Möglichkeiten vor, die den Klang betreffen, und du entscheidest.

## Für den Besitzer – dein erster Test am Handy (23.10.2026)

**Was los war:** Alle drei Beobachtungen hatten eine gemeinsame Ursache – das Handy kam beim Abspielen der Schleifen
mit dem Rechnen des Klangs nicht hinterher. Dann fehlen dem Lautsprecher immer wieder kleine Stücke (das „Abgehackte“,
klingt fast wie ein Granular-Effekt), und wenn es schlimm wird, läuft sogar die Uhr des Klangs langsamer: Das Einzählen
bis zur Eins und die Aufnahmezeit bewegen sich dann kaum („wartet auf die 1“, „bleibt bei 0“), und je nachdem, was du
gerade sonst tust (etwa einen Regler ziehen), klingt es langsamer oder schneller. Nachgestellt mit einem künstlich
gebremsten Rechenkern: genau dieses Bild, und ohne Schleifen (nur live gespielt) blieb es sauber.
**Behoben:** Eine Kopie der Effektkette, die ab der ersten Schleife dauerhaft mitlief, obwohl nach dem Einbrennen nichts
mehr durch sie ging, ruht jetzt (Klang Sample für Sample gleich, auf jedem Gerät). Und auf dem Handy – nur dort, nie auf
iPad oder Rechner – gibt es eine ehrliche Notbremse: Setzt der Klang trotzdem aus, solange Schleifen spielen, bleiben die
Schleifen in ihrer Stimmung statt mit dem Live-Spiel zu „taumeln“ (das Taumeln kostet pro Schleife am meisten). Myzel
sagt es dir einmal, in der Karte steht „ruht – das Handy ist ausgelastet“, und „mit“ holt es zurück. Im Test mit zwei
Schleifen: vorher rund 400 Aussetzer in 5 Sekunden, danach keine. Dazu: Die Aufnahme kann nicht mehr an einem Fehler
anderswo hängen bleiben, und der Hinweis „8 Takte bei … BPM“ zeigt jetzt das Tempo, in dem wirklich aufgenommen wird
(vorher stand dort das Puls-Tempo, auch wenn die Schleifen schneller liefen) – die Länge stellst du dort in Takten ein,
das ändert nie, was gerade spielt. (Das Puls-Tempo dagegen bewegt die Schleifen mit, wie du es entschieden hast.)
**Bitte am Handy noch einmal probieren:** Schleifen spielen lassen, ein paar Minuten; aufnehmen in Takten mit und ohne
Puls. Wenn die Notbremse kommt, siehst du den Hinweis. Ist das Handy deutlich schwächer als mein Nachbau, stockt es auch
danach noch – dann wäre der nächste Schritt, beim reinen Schleifen-Spielen auch die Live-Kette ruhen zu lassen (etwa
4 % weniger; das würde ich nur mit deinem Okay bauen).

## Für den Besitzer – jetzt (22.10.2026)

**Fertig zum Testen.** Der Hexenring ist mit allen vier Etappen gebaut und durch die Schlussprüfung: jede Suite einzeln
auf der Maschine gelaufen, alle Reihen des Hexenrings und der App grün (Zahlen in SPEC §23). Offen fürs Ohr bzw. zur
Entscheidung: Gespinst-Phrasen streuen um ihre Grenzen (Lautheit, Spitze, Nachklang – im Kalibrierungsstand genauso),
und ein Gestik-Kostenwert liegt 14 % über dem Stand von Etappe 1 (Wachstum der Etappen 2–4, nicht der Schlussprüfung). Sobald der Pull Request in den
Standard-Branch übernommen ist, aktualisiert sich die App unter beidlat.github.io von selbst (installierte Apps holen die
neue Version, die Service-Worker-Version ändert sich mit jedem Inhalt).

**In der Schlussprüfung entschieden und gebaut:**
- **Rhizom genährt:** pro Schleife ein Schalter in der Karte, „Netz: eigen · geteilt“. Standard „eigen“: Die Schleife
  stößt ihr eigenes Netz an, dein Spiel bleibt frisch – ihre Lawinen und ihre Erschöpfung bleiben bei ihr. „Geteilt“: wie
  bisher, ein gemeinsames Netz. Umschalten mitten im Spiel ist sauber (was klingt, klingt im alten Netz aus); ↶/↷ und
  Speichern gehen mit.
- **Kosten ehrlich nachgemessen:** Rhizom war bei kurzem Glimmen zu billig eingetragen (jeder Ping kostet seinen Anschlag,
  in Stufe 3 bis zu 37 % mehr als eingetragen) – jetzt nach Glimmen gerechnet, in beiden Netzen gemessen. Gluts Ersatz
  ohne Rechenkern war auf dieser Maschine zu billig (gemessen 1,22–1,29 statt 1,12) – jetzt 1,48 / 2,13. Am Klang wurde
  nichts gespart.
- **Nähte:** Eine Gong-Naht konnte für 10 ms bis zu 1,7 dB leiser werden als beide Seiten; jetzt bleibt jede Naht in
  jedem 10-ms-Fenster zwischen den Pegeln ihrer beiden Seiten (gemessen höchstens ±0,34 dB).
- **Akkorde vom Keyboard:** Anlehnen biegt bei einem Akkord wieder den obersten Ton, auch wenn das Gerät gerade
  beschäftigt ist (die Töne werden nach ihrem Zeitstempel als Akkord erkannt).

**Von dir entschieden (22.10.2026):**
- **Kostentabelle bleibt** wie kalibriert (18.10.). Zur Information, gemessen auf der Maschine nach den Neustarts (andere
  Rechnerumgebung): Halm Rohrblatt 0,66–0,73 / 1,15–1,31 (Tabelle 0,68 / 1,15), Flöte 0,78–0,91 / 1,51–1,69 (0,88 / 1,59),
  Flamme 1,40–1,52 / 2,65–3,03 (1,63 / 2,93); Harz je Körper bis 1,74 / 3,94 (1,71 / 3,85); Böe 0,74 / 1,12 (0,69 / 1,11);
  Amöbe 0,55 / 1,45 (0,47 / 1,34); Gespinst 0,37 / 0,83 (0,34 / 1,01); Elmsfeuer 1,25–1,61 / 4,4–6,3 (1,09 / 2,51) – der
  Stand vor der Schlussprüfung misst dort genauso (A/B), es liegt an der Maschine. Die Kostenreihen des Prüfstands
  sind deshalb als maschinenabhängig markiert: deckt ein Eintrag die Messung nicht, steht „MACHINE“ mit den Zahlen da
  statt eines Fehlers (`COST_STRICT=1` misst den Kalibrierungs-Stand 73ab260 abwechselnd mit).
- **Harz, Glas spricht immer sofort an:** hohe Töne bekamen ihren Anschub zu schwach (√ statt (f/800)^1,5 über 800 Hz),
  und das Dublett-Paar schwebte schon im ersten Moment auseinander und zog sein Muster vom Bogen weg. Jetzt wächst die
  Schwebung in den ersten 0,3 s herein. Gemessen über viele Noten und Seeds (Zahlen unten bei „Final pass“): kein später
  Einsatz mehr, gleicher Ton und gleiche Stimmung, sobald er klingt; die anderen Körper rendern bitgleich wie vorher. Die Schale zeigt bei hohen Tönen dasselbe späte Ansprechen (6 von 16
  Noten, bis 0,84 s) – nicht angefasst; sag Bescheid, ob sie es auch bekommen soll.

**Fürs Ohr beim ersten Test** (die ersten Punkte stehen auch in `dev/IDEEN.md`):
- die Bandträgheit beim Tempoändern einer Schleife (schießt ≈ 22 % des Schritts über);
- der Gärtner „pflegt“: soll die Bass-Schleife bei deinem Bassspiel pausieren (so gebaut) oder nur leiser werden?
- wie musikalisch Antworten, Variationen und die Begleit-Akkorde klingen;
- das Knistern von Moder, wie tief Einwurzeln greift, wie laut die Höfe von Glut und Sehne neben der Schleife stehen;
- Mikrofon und Gesang einmal mit, einmal ohne Kopfhörer (bisher nur nachgebildet getestet);
- Rhizom genährt: „eigen“ oder „geteilt“ als Standard – so wie du es im Spiel lieber hast;
- die offenen Bestätigungen unten (z. B. nur Schleifen aus Bewegung bewegen das Live-Instrument; Schwarm und Tropfen
  rendern im Werk-Rahmen nicht bitgleich).

**Wie es weitergeht:** Die vereinbarte Reihenfolge steht in `dev/IDEEN.md` (die Module sind seit 23.10.2026 umgestellt –
Quelle `myzel/src/`, siehe „App“ unten; danach die Bibliothek freier Aufnahmen, Stimme als Instrument, ein Hörprototyp). Neue Sitzung: dieses Repository und diesen Branch
öffnen und schreiben:

> Lies dev/HANDOFF.md und dev/IDEEN.md und mach mit dem nächsten Punkt weiter.

## Für den Besitzer – die Klangquellen (Stand 18.10.2026)

Alle Klangquellen der Planung sind gebaut, getestet und auf dem Branch gepusht – 28 Quellen in fünf Familien:
- **Etappen 1–3** (schon veröffentlicht): das DSP-Modul, Halm, Ranke, die Bibliothek, Elmsfeuer, Jahresring, Harz.
- **Halm** hat dazu Flöte (mit Überblasen) und Flamme (ein singendes Rijke-Rohr) bekommen.
- **Etappe 4:** Moder (Kompostglocke), Böe (Äolsharfe), Amöbe (Bass aus Zufall).
- **Etappe 5:** Sehne (lebende Saite mit Handballen, Flageolett, E-Bow, Jawari), Zapfen (Kratzen, das zum Ton wird, fünf Körper), Glut (gestimmte Rückkopplung, die nachglüht).
- **Etappe 6:** Gespinst (ein Netz aus Saiten mit eigenem Mixer-Kanal).
- **Reserven:** Kehlchen (Vogelkehle mit Chip, Triller, Ruf) und Rhizom (Lawinen durch die Tonleiter).
- **Presets:** Glaswiese, Kompostgarten, Atemrohr, Hochspannung, Gespinstgarten, Wurzelnetz, Vogelhain – jedes mit Gestik-Rezept.
- **Kosten:** Alle neuen Quellen sind auf ruhiger Maschine nachgemessen und ehrlich eingetragen (jeder Körper, jeder Steg, jede Silbe). Das ändert nur, wie viele Stimmen gleichzeitig spielen dürfen, nicht den Klang. Rhizom war zu billig eingetragen, das Gespinst-Netz, Elmsfeuer und Gluts Ersatz ohne Rechenkern zu teuer.

Offen sind nur noch Dinge fürs Ohr und ein paar Entscheidungen (unten bei „Owner's calls“), dazu die Veröffentlichung: Die App unter beidlat.github.io aktualisiert sich, sobald dieser Branch in den Standard-Branch übernommen ist (ein Pull Request, den du öffnest oder bei mir bestellst).

(Wie es weitergeht, steht oben unter „jetzt“.)

## Hexenring – der Looper (Stand 22.10.2026, alle vier Etappen gebaut und durch die Schlussprüfung)

**Für den Besitzer:** Das Konzept steht in `dev/looper/KONZEPT.md`, deine Entscheidungen in dessen §12. Gebaut wird alles in Etappen auf dem Branch dieser Sitzung; veröffentlicht wird erst am Ende. Fertig sind der Kern (Etappe 1a: Taktgeber, Looper im Audio-Thread, Humus, Kanal „Hexenring“) und die Bedienung (Etappe 1b): die Ringleiste unter dem Feld mit Korb (ernten, was gerade gespielt wurde), Hauptknopf (aufnehmen, auch gehalten), den Ringen der Schleifen, Korrekturen, ↶/↷, die Karte im Aufnahme-Panel, und die Sicherung – Schleifen kommen nach dem Neuladen zurück. Etappe 1c: der Werk-Rahmen (ein unsichtbarer zweiter Rechenraum), das Einbrennen der Effektkette (eine Schleife klingt weiter, wie sie aufgenommen wurde, auch wenn du Filter & Co. bewegst – oder „folgt der Effektkette“), Taumeln pro Schleife (sie schwebt mit dem Instrument mit), die Nähte komplett (Ausklang, Nahtwahl, Auftakt, gleichmäßige Lautstärke durch jede Naht), „Klopf mit“ (deine Spielverzögerung), Einzählen und Klick, die Ringleiste klappt auf kleinen Bildschirmen bei offenem Panel ein. Etappe 1d: die Form – Lichtungen (merken, was gerade klingt; der Form-Knopf rechts in der Ringleiste wechselt auf der nächsten Eins zur nächsten, gehalten zeigt er die Form-Zeile), Kern, Lücke, Schluss (am Ende, welkend, abbauend), Szenen A/B mit Lichtungen, Schlafen und Wenden mit „3 · 2 · 1“; die Bedienung mit MIDI, Pedalen (mit Haltetest), Tastatur (Leertaste, E, 1–8, Strg+Z – ein Blätterpedal verstellt keinen Regler mehr), der nanoKONTROL2-Seite und den nanoKEY-Pads; die Fährte ist als Knopf verschwunden – ihre Aufzeichnung lebt als Bewegung weiter: Hörte der Humus nur Bewegung, erntet der Korb eine „Schleife aus Bewegung“, und nach jeder Ernte macht der Chip „nur Bewegung“ aus demselben Fenster eine (so lässt sich ein Neigen oder ein Regler wieder auf das Live-Spiel legen; alte Presets, Szenen und Dateien laden ihre Fährte so); Nähren ins Gespinst (ein eigenes Saitennetz je Schleife) und in die Körner; die Auslese (aus vier Wiederholungen die beste echte – als Chip, nie von selbst); „eine Runde“ beim Überspielen; die Ringleiste klappt nur noch ein, wo das Feld sonst kürzer als 260 px wäre. Taumeln kostet jetzt einmal pro Schleife statt pro Schicht (gleicher Klang – sogar genauer als vorher, SPEC §9; mit „eigene Stimmung“ spielt jede Schicht ab der nächsten Naht wieder genau ihre Aufnahme). Ein Zufallstest mit 2000 Aktionen fand sechs echte Fehler, alle behoben: drei hätten ein NaN (Stille oder Knall) erzeugt (eine Schicht, deren Fenster vor den Anfang des Humus reichte; ein Auftakt beim einmaligen Umrechnen fürs Taumeln; ein Ausklang, dessen Klang zu früh zurückgegeben wurde); eine kurz vor der Eins gelöschte Schleife kam mit dem Wechsel einer Lichtung als Geist zurück (klang ohne Ring weiter); in eine Schleife aus Bewegung ließ sich Klang überspielen; eine vor ihrem ersten Durchgang gelöschte Schleife gab ihren Speicher nie zurück. Zum Entscheiden: Schwarm und Tropfen rendern im Werk-Rahmen mit gleichem Startwert nicht exakt gleich (der Browser addiert in wechselnder Reihenfolge); nur Schleifen aus Bewegung bewegen das Live-Instrument – eine Klang-Schleife trägt ihre Bewegung im Klang (so gebaut, SPEC §18; passt das?). Etappe 2a (Wuchs): Eine Schleife mit Noten kann jetzt neu wachsen – Myzels eigene Klangquellen spielen ihre Noten im Werk-Rahmen nach. „Treu“ rechnet sie einmal und spielt sie wie eine Aufnahme; „Lebendig“ spielt jeden Durchgang neu, ein wenig anders atmend, und streamt ihn ins Audio-Herz. ✓ behält den Durchgang, der gerade klang (genau diesen Klang), ✕ spielt ihn wieder ab der nächsten Eins, ⚓ führt zur Aufnahme zurück. Schleifen folgen der Tonart (angekündigt: „Schleifen folgen ab Takt N · ✕“ – keine Schleife spielt danach in der alten Tonart), dem Tempo und auf Wunsch einem anderen Klang; Taumeln schwebt auch hier mit. Kommt das Gerät an seine Grenze, weicht zuerst Lebendig, nie dein Live-Spiel. Ohne Werk-Rahmen spielen die Noten über echte Stimmen („live gespielt“). Unterwegs gefunden und behoben: der Nachklang einer Schleifenversion klang nach einem Wechsel an jeder Naht falsch (die alte Version statt der eigenen), ein Ton knapp vor der Eins rutschte einen Durchgang zu spät, eine Tonart ohne den gespielten Ton ergab Stille. Offen: Elmsfeuer rendert ab und zu nicht bitgleich (Chromium, nicht der Zufall); ein Zufallstest von zehn sah einmal ein NaN, seither nicht wieder. Etappe 2b (Werkzeug): Schleifen lassen sich jetzt wie ein Tonband verwandeln – schneller oder langsamer in Oktaven und Quinten, die Tonhöhe geht mit, mit der Trägheit eines Bandmotors (er schwingt kurz über das Ziel, damit die Schleife genau im Takt bleibt – fürs Ohr: passt das?), Bandstopp als Schluss (das Band läuft aus), rückwärts, trimmen (½, ¼, verschieben), verdoppeln, Verblassen (jede Schicht nach ihrem Alter, eine frische klingt über den verblassten), Abrieb (das Band nutzt sich an denselben Stellen ab, „Auffrischen“ macht es wie neu), Auslassen und Würfeln an den Anschlägen. Reine Klang-Schleifen beim Tempowechsel, wie du entschieden hast: rhythmische werden an ihren Anschlägen neu ins Raster gesetzt, nie gedehnt (gemessen: jeder Anschlag auf 0,2 ms genau, keine Tonhöhe verändert), Flächen laufen frei in ihrer eigenen Länge weiter; zurück im eigenen Tempo spielt die Schleife wieder Sample für Sample ihre Aufnahme. An den Noten (als Wuchs): Stufen, dünner und dichter, straffer oder lockerer nach deinem eigenen Groove, Krebs, Umkehrung; „Erstarren“ macht den Wuchs-Durchgang, der gerade klingt, zum neuen Abdruck. Die Auslese bietet jetzt auch die gemeinte Fassung aus allen Versuchen an (der Median jeder Note, neu gespielt). „Puls übernimmt“ gibt dem Puls den Swing einer Schleife. „Puls ernten“ (im Puls-Panel) hält die letzten Takte des Puls als Schleife fest – genau diese Schläge, mit ihrem eigenen Klang. Dazu: Folge (Lichtungen nacheinander mit Durchgängen, auf Wunsch im Kreis), Klang aufs Feld, Export einer Schleife als Aufnahme (WAV, ZIP, Körner) und ihrer Noten als MIDI-Datei, die Bühnenansicht (große Ringe, Pedal-Legende, wenige Hinweise, das Panel nur durch langes Drücken) mit Setliste („nächstes Lied“ legt die Schleifen mit ihrem Lied beiseite und holt sie zurück, wenn es wiederkommt). Robustheit: Der Zufallstest kennt jetzt Wuchs und alle neuen Werkzeuge; Fallen im Audio-Herz und in den Rechenräumen machen ein NaN sofort still (kein Knall) und melden, woher es kam. Gefunden und behoben: Kam ein Lebendig-Durchgang zu spät, sprang die Schleife auf den vorigen zurück – dessen Klang wurde aber schon zurückgegeben, während er noch gelesen werden konnte (sehr wahrscheinlich das eine NaN aus Etappe 2a). Ein zweiter Fall (eine ganze Schicht, deren Klang zu früh zurückging) zeigte sich einmal in 25 Läufen mit je 2000 Aktionen und danach nicht wieder; eine neue Sperre gibt nie Klang zurück, den noch etwas liest, und meldet es – in den letzten 14 Läufen meldete sie nichts. Offen fürs Ohr: das kurze Überschwingen der Bandträgheit (≈ 22 % des Schritts). Etappe 3 (Mitspieler): Der Eigensinn hat jetzt alle vier Stufen – „Variieren“ ändert Noten auf leichten Zeiten (Nachbarstufen mit gleicher Kontur, Durchgänge, ausdünnen, Oktaven, Verzierungen und Wirbel, Rhythmus neu verteilt), „Wandern“ tauscht dazu Halbtakte mit gleichen Rändern, auch aus deinen anderen Schleifen; die Eins und die Taktmitte bleiben immer, jede Note liegt in der Tonleiter, ein elastischer Zug holt die Schleife zum Anker zurück. Was sich ändert, zeigt eine Knospe am oberen Feldrand einen Takt vorher. ✓ behält einen variierten Durchgang samt seinen Noten als neuen Anker, ✕ geht zum Anker zurück und macht die abgelehnten Veränderungen für den Abend seltener, ⚓ holt das Original. Der Gärtner (Standard „schaut zu“; jedes Verhalten einzeln abschaltbar) erkennt die Rollen (Bass, Akkorde, Melodie, Fläche, Schlag – ein Tipp in der Karte korrigiert); „pflegt“: gehst du in den Bass, pausiert die Bass-Schleife am Taktstrich, spielst du dicht, werden Schleifen in deiner Lage leiser (Treu-Schleifen nur leiser oder stumm, nie andere Noten); angekündigt einen Takt vorher („✕ 2 · ✓“), ein Tipp auf den Ring nimmt es sofort zurück, dann lässt er die Schleife acht Takte in Ruhe; nie eine Schleife, die du stumm geschaltet hast. „antwortet“: hörst du nach einer Phrase auf, antwortet er aus deinem eigenen Material (ab 40 Tönen, so lang wie dein Ruf, endet auf einer stabilen Stufe, nie mehr als sechs Töne wörtlich), mit echten Stimmen; spielst du weiter, verstummt er. Begleiten schlägt zu einer Melodie-Schleife Bass und Akkorde als gestrichelte, stumme Schleifen vor – die Akkorde nach der Rauigkeit gegen die echten Teiltöne der Klangquellen (gegen eine Kalimba wählt er die Böe); ein Tipp schaltet sie ein. Wiederkehr: eine markierte Schleife kommt am Viertakter zurück, wenn du ihr Motiv spielst. „Puls lernt“ setzt den Rhythmus einer Bass- oder Schlag-Schleife in eine Puls-Spur. Die Handschrift (Standard aus) merkt sich auf dem Gerät deine Wendungen, Tempi, Tonleitern und was du behalten oder abgelehnt hast; am Ende einer Sitzung fragt Myzel, ob sie übernommen wird. Fürs Ohr offen: wie musikalisch die Antworten und Variationen klingen, die Begleit-Akkorde, ob „pausiert“ für die Bass-Schleife das richtige Verhalten ist. So geht es in einer neuen Sitzung weiter: Etappe 4 (Ökologie) ist gebaut – damit ist der Hexenring vollständig: Schleifen nähren jetzt auch Rhizom (jede Note stößt das Netz an, dasselbe Netz, das du spielst), den Sporenregen (ihre Noten werden Keime), die Glut (die Schleife ist ihr Zunder, sie glüht in ihren Tönen) und die Sehne (Saiten schwingen mit, ohne angezupft zu werden). „Schleife in Schleife“: eine neue Schleife nimmt eine andere in jedem Durchgang auf und lässt sie langsam verwehen (Riley), mit Festhalten. „Treffen“ zeigt, wann alle Schleifen (und jedes Paar) wieder gemeinsam beginnen; „Treffen setzen“ gibt freien Schleifen Längen aus Primzahlen, sodass sie sich genau einmal treffen, in der gewählten Minute – verändert wird nur die Stille nach der Phrase; beim Treffen spielen alle ihren Anker, die Netze blühen, auf Wunsch landet eine neue Tonart. In „Verwandeln“: Einwurzeln (die Schleife wird jeden Durchgang durch ein auf die Tonleiter gestimmtes Saitennetz neu aufgenommen; wechselt die Tonleiter, wandern ihre Töne gemessen von 57 auf 98 % in die neue) und Moder (die Höhen zerfallen zu Knistern auf ihren eigenen Tonhöhen, die Tiefe wird warm); die saubere Fassung bleibt immer. Das Mikrofon: erst wenn du es in den Einstellungen einschaltest, mit rotem „● Mikro“ im Feld, solange es offen ist; es geht nur in den Humus (zu hören ist es nicht). „Verzögerung messen“ misst den Weg Lautsprecher → Mikrofon auf 1 ms genau, damit Gesungenes im Takt sitzt; mit Bluetooth-Kopfhörern wird Überspielen mit dem Mikrofon abgelehnt. „Gesang als Noten“ macht aus einer gesungenen oder gepfiffenen Schleife Noten auf der Tonleiter – danach spielt Myzel sie mit seinen Klängen. „Wiedergabe: Live“ spielt die Noten einer Schleife mit echten Stimmen (sie weichen immer deinem Spiel), „MIDI · Noten hinaus“ schickt sie an MIDI-Geräte. Ladung wirkt pro Schleife, wenn du sie einschaltest (eine Aufnahme brodelt mit Aussetzern und Stottern, eine lebendige variiert mehr; Treu bleibt Treu); in der Karte lassen sich einzelne geplante Noten ablehnen; die Wiederkehr geht jetzt auch ohne Takt. Alles gemessen und ehrlich eingetragen (Mikrofon 0,47 Einheiten, Schleife in Schleife 0,33, die Glut-/Sehnen-Höfe je Stimme etwas billiger als eine gespielte Stimme); am Klang wurde nichts gespart. Fürs Ohr: das Knistern von Moder, wie tief Einwurzeln greifen soll, und wie laut die Höfe von Glut und Sehne neben der Schleife stehen. Entschieden (21.10.2026): Rhizom genährt hat pro Schleife einen Schalter „Netz: eigen · geteilt“, Standard eigen (gebaut in der Schlussprüfung). Die Schlussprüfung ist durch; als Nächstes: die Veröffentlichung (Pull Request) und dein Test in der App.

**Working notes:** binding spec `dev/looper/SPEC.md` (§23 build order; "As built" notes per step), builder rules `dev/looper/BRIEF-build.md`, research/proposals/reviews/listening examples under `dev/looper/`. Owner decisions (18.10.2026): no measuring day – the build machine is the reference, target a current iPad Pro and desktop PCs; new-loop start and loop quality are settings (defaults: Abdruck, Stufe 3); audio loops on tempo change: Schnitt for rhythmic, frei for pads, never stretched; Taumeln per loop; everything else per the concept's recommendations; build everything, publish at the end (PR into `ccr-c7c5d0a6-cus3ip`, merge when the owner says so). Progress per step is in the session's commits and SPEC's "As built" notes.

**Step 1a (engine core, built):** Taktgeber (`TG`, one beat map; the Puls, MIDI clock in/out, Sporenregen, the Fährte and the bar recorder read it), processor `myzel-ring` (Humus rings, Schleifen/Schichten, seam law, Ausklang hook, resampler), the taps and the strip „Hexenring“ (`hxr` → `A.masterIn`), the notes and Bewegung Humus, the internal calls `hxGrab/hxLoopNew/hxSchichtAdd/hxState/hxGain/hxUndo/hxClear/hxRate/hxTempo` (no UI yet). The DSP module now loads at sound start. Suite `dev/tests/hexenring/run-all.sh` (copy to `<scratch>/hexenring/`). Costs entered: `HX_COST = { capture: 0.68, schicht: 0.31, rs: 0.95 }` (cost.js candidates `hxq…hxr`). (The two step-1a conflicts were decided by the owner and built in 1b: MIDI clock – small errors slew, > 15 ms within ¼ beat; „Alles“ hears everything incl. the Schleifen.)

**Phone report (built, 23.10.2026):** SPEC §21 „As built (phone report)“. The owner's three symptoms were one cause –
the render falling behind on a phone while loops play (reproduced with the render threads in a cgroup; CDP throttling
slows only the main thread). Built: the out-1 chain copy rests (`HXF1`, `hxF1Tick/Wake/Busy`, woken by `hxOut1`, any
`hxPost` with `out`, any automation of its params through the AudioParam hook); the guard's phone step `hxTauGuard`
(Taumeln rests, `hxTauOn`, `HX.tauRest`), a clock-lag underrun count for phones without playbackStats; `tickTry` for
each part of `tick()` and the frame loop (`frameBody`); the recorder's tap renewed when it stops (`capDrop`); the bar
info's tempo (`barGrid`). Suite `hexenring/t-hx-phone.js` (in run-all; its part 8 needs root for the cgroup).
`v2/mk.sh` exports the phone-report names (guarded line `hxF1Tick`).

**Latency (built, 24.10.2026):** `ui/leistung.js` section „the latency's default on Android“: `LAT` {own, auto},
`myzel.lat.v1`, `latRestore` (from `restoreState`; a stored 'safe' on Android without the mark = the old default),
`latChosen` (from `onDeviceChanged`, skipped under `LAT.quiet`), `latSet`, `latAutoAgain` (#latAuto), `latWatch` (from
`watchUnderruns`: 100 ms missing or 12 s with underruns within 30 s, clock-only 4; not in the first 5 s; one step per
session, from the next start; guard log step `latenz`), `latHint(ms)` (Gerät's `updLatText`, the LM summary's „Tipp:“).
`dev.lat` default `MOBILE && !ANDROID ? 'std' : 'min'`. `updDrive`: oversampling never depends on dev.lat; `HX_CHAIN`
lost 'dev.lat', a record that still has it renders 'min' as 'none' (`HXW.latOld`, set in `hxwChain`/`hxwBake`'s `all`).
`applyQuality`'s cap reads `A.latMode` while a context runs. LM latency line `set ctx own step hint …`. Tests
`perf/t-phone-mode.js` part 6 (51 rows in all). Worklet latency, headless Chromium, Android emulation (`scratchpad/wl/wl.js`,
not in the repo): bare page hint 0 / interactive / balanced → base 2.9 / 10 / 10 ms, out 8 / 32 / 32, `currentTime −
getOutputTimestamp().contextTime` 11.6 / 41.3 / 41.3 ms – identical with a worklet node in the path; the app with the
module vs addModule blocked: same base/out, ts lag 11.6 vs 11.6 (min), 36–38 vs 38 (std/safe), touch → sound 59/59 vs 53/57
(min), 75/77 vs 76/77 (std) – noise (the main-thread wait, ≈ 40 ms headless, dominates). The headless sink is not
AAudio: the phone's own report decides.

**Memory – the desktop report (built, 24.10.2026):** SPEC §8 „As built (memory)“. Realms renewed (`hxwRenew`,
`HX_WRENEW`/`HX_WRENEW_S`, `R.used/t0/old`), booted from srcdoc (`hxwShell`), one DSP Blob (`DSP.url`), WSend `fin`, the
worklet-free sink `hxwNs`. Test `hexenring/t-hx-soak.js` (in run-all; `SOAK_MIN`, `RENEW`); harnesses (not in the repo)
`scratchpad/x8/mem.js` (heap, RSS, objects per frame context via CDP queryObjects, `--snap`), `x8/dump.js` (memory-infra
allocator diff), `x8/min/*.js` (the Chromium reproductions). `v2/mk.sh` exports `hxwRenew/hxwRealm/hxwCall`. Regression (24.10.2026): Hexenring
27 suites + t-hx-soak green (single rows that scattered in the full run passed alone and fail alike on 62d0c4a: t-hx-wuchs
„late blocks“ and „✓“, t-hx-form „Schluss am Ende“, t-hx-clock's device rows); reg.sh green but three Gestik timing/heap rows,
green alone; klang run-all and smoke-all green (t-eng-native's 6-s hold scattered once, green alone); t-pwa-update 37/37;
the perf guard: every CPU row PASS (idle audio 19.3 / 10.2 against the reference's 36.0 / 26.1 – loops halted cost
nothing, Ruhe sleeps), t-phone-mode 29/29.

**Report A – loops on a phone (built, 23.10.2026, night):** SPEC §10.5 and §21 „As built (report A)“. Root cause: the
8 loops did not play (`spielt=0`, restored or halted) yet `span()` read every Schicht of a halted/muted loop (Taumeln's
resampler included) before multiplying by the state's 0, while `hxCount` priced only playing loops and `hxTauGuard` acted
only on playing ones; `hxWGuard` needs Wuchs work within 8 s (the Werk-Rahmen had not even started, `werk=-`) – so
`watchUnderruns` fell to the old rule: 0.8⁴ = 0.41, `A.lite`. Built: the processor skips reads under a settled silent
state (`mute`/`skp`/`nil`, `po.noMute` the reference – offline max |d| 0; 8 halted loops 3.7 → 0.4 s per 20 s of audio);
`hxF1Busy`, `idleSrc`, `IDLE.hxT` count only sounding loops (`hxSounds`), `hxPost` wakes copy/Ruhe/gates for a state
`spielt` (`hxOut1Of`); the phone guard (`HX_PHONE`): `hxWGuard` holds (`G.hold`, `G.span` 30 s doubling to 4 min,
`hxWHold`, `hxWHoldKeep`) – the processor replays the last pass, `hxWStop` drops the rest –, then Taumeln, then
`hxGuardGrenze` (never `A.lite` while loops sound or Wuchs ran within 60 s); everywhere a living pass whose time passed
while its render still waits in a realm queue is dropped (`hxWDropPast`, realm job `drop`); `hxGuardLog`/`HX.gLog`,
`HX.wSt`/`hxWStat`; per loop `hxCountL`/`hxCostOf` (one law with `hxCount`); the card's `#hxCost`, Gerät's `#lmHx`
(`lmLive`), LM lines `loops`/`werk`/`guard`/`latency` (`lmLoops/lmLoopsRes/lmWerk/lmGuard`). Measured (Android
emulation, a desktop core): 8 playing loops ≈ +27 points on the realtime thread (reads ≈ 2.5, Taumeln ≈ 0.9 per loop,
≈ 1.5 units each against 8 Nebel voices; `HX_COST` counts 2.15 – safe), the out-1 copy ≈ 4.6; 4 Lebendig loops at level 3:
the Werk-Rahmen ≈ 90 % of a core offline plus 30–40 points of the page's main thread (realms are same-origin iframes),
its queue growing (12–25 jobs) – the dominant cost. Tests: `t-hx-phone` part 9 (`PARTS=9`; 9c needs root – a cgroup
shared with the realms' `Offline AudioW` threads, `SLOW9`), `t-phone-mode` part 5; harness `scratchpad/x8/x8.js` (not in
the repo). `v2/mk.sh` exports the new names (guarded line `hxGuardLog`).

**Leistung messen + Handy-Modus (built, 23.10.2026):** `myzel/src/js/ui/leistung.js` (after `geraet.js`). `LM`: a 20-s
on-device measurement (`lmStart/lmSample/lmStop/lmResult/lmText/lmSummary`); `tickTry(k)` and `tick()` (now `tickRun`)
time each part while `LM.on` (keys in `LM_PART`; 21 hxVis and 26 rail are split now; 30 the whole tick, 31 `hxMsg`, 32
`onDown` via `lmTouch` – touch → sound by `getOutputTimestamp`), frame intervals via `phFrame`, long tasks + LoAF,
playbackStats/playoutStats (all numeric fields, diffed), the clock lag, `renderCapacity` if present. `PH` (Handy-Modus):
`set` auto/an/aus (`myzel.handy`), `on = an || (auto && MOBILE && !HX_TABLET)`; effects: `VIS.dpr ≤ PH_DPR` (1.5) and, while
`PH.load` (8 frame intervals > 25 ms or 2 long tasks within 3 s, or new underruns in 2 seconds within 10 s; hold 15 s,
doubling on re-entry within 2 min, max 2 min), the field at 30 fps with `VIS.k = 2` motion steps (fade `FADE[2]`, spores,
bursts, hyphae, ripples, hx rings, Gestik spawn/glow, Regen parity). Universal, invisible: `#outMeter`/rec meters written
on change, the field's per-frame arrays reused. Tests `perf/t-phone-mode.js` (22 rows, in `perf/run.sh`); harness
`perf/phone.js` (`--thr`, `--slow <% of a core>` cgroup, `--q`, `--handy aus,auto,dpr,fps30`). Measured (4× main
throttle, RAF120, DPR 2.75, touch): main 94 → 55 % (DPR cap alone 84, 30 fps alone 71), late frames 19 → 1 %, touch wait
70 → 26 ms, LM touch→sound 110 → 63 ms; base vs new at q1/q3: main 94/94 – the levels make no difference, as reported.
With the render threads at 30 % of a core both levels underrun ~1500×/20 s and the clock slows (×0.63–0.86) with or
without the profile; at 40 % q1 ≈ 190, q3 ≈ 1500 – there the levels would differ. Headless canvas is software raster
(`ProduceCanvasResource` ≈ 800 ms/s); a real phone rasters on the GPU, hence the on-device report.

**Final pass (built, 21./22.10.2026):** SPEC §23 „As built (final pass)“, §15/§21/§7 notes, klang SPEC §2.4. Rhizom Nähren's
net per loop (`L.rhzNetz`, `rhzOwn`, `hxRhzNetz`, card row „Netz“), Rhizom's price refit (`rhzPrice`, `rhz-fit.js`), Glut's
`GLT_COST`, the seam law per window (`hxSeamBand`), the processor's chunk bookkeeping (`sharedV` – the guard `held`'s
report reproduced in the fuzz and fixed), the memory cap over Wuchs/Zersetzung, MIDI chords grouped by time stamp
(`modStroke(t)`), the AudioParam hooks without rest arrays. Every red row of the list made green – app fixes where the
app was wrong, test fixes with their measurement where a row measured the headless machine (list in SPEC §23; the cost
rows now compare in turns with the build their budget was set on: `motion-tests/run-all.sh` builds slots `gmref`
(fae609a) and `gfref` (4d6d233)). Not reproduced in the fuzz runs after the fixes: a Rhizom loop voice left after Stille
with charges pending (seen in 2 of 14 runs before; `t-hx-fuzz` now prints such a voice's state).

**Step 4 (Ökologie, built):** SPEC §10.6 and §15 „As built (step 4)“, §21 costs, §23 suites. One section `Hexenring: Ökologie (Etappe 4)` (`hxEcoTick` per tick): pass notes `hxPassNotes`/`hxFeedAhead` (Nähren Rhizom/Regen, MIDI out `hxMidiNote`), Höfe `hxFeedMake` (`HX_FEED`, `MyzelProc` `po.inj`, Sehne `SHN_FEED`, Glut injection), Sammelschleife (`hxAccMake`, processor `{acc}`/`accWrite`/`{accCopy}`), gap mode and fractional lengths (`d.gap`, `d.fr`, `gapTail`), Treffen (`hxCrt`, `hxTreffenOf`, `hxTreffenSetzen`/`hxTrefPlan`, Fruchten), Zersetzung (`hxEinwPass` offline web, `hxModerPass` in the Worker `hxWk`, `hxZersJob`), Mikro (`HX.mic`, input/ring 3, `hxMicOn/Off/Messen`, `#hxMic`), Gesang (`hxYin` with candidate dips, `hxGesangSeg`), Ladung (`hxLadTick`, slice stutter `ps`), vetoes (`hxVetoList/hxVeto`), Live chosen (`L.live`, `hxWLm`), Wiederkehr without a Takt (`hxWkSeqD`). Suites `t-hx-oeko2`, `t-hx-mikro`, `t-hx-live` in run-all; t-hx-fuzz's bag (+10 kinds, `FUZZ_E=0`); `perf/t-idle-live` 5e; `cost.js` candidates `hxi/hxj/hxk/fglt/fshn`. Costs `HX_COST.mic 0.47, acc 0.33, hof {glt [0.8, 1.05], shn [0.77, 1.16]}`.

**Step 3 (Mitspieler, built):** SPEC §12.2–§12.5, §21, §23 „As built (step 3)“. One section before `showResume`:
the variation engine (`hxVarStep`/`hxVOp`/`hxVarW`, chain per Schicht `S.vc`, `hxWBase` – a kept varied pass's notes
`S.anc.vn`, `hxVarNein`, session weights `HX.vw`), roles (`hxRoleOf`, `L.mi.rolle`), the Gärtner (`HXG`, `hxGdTick` from
`hxTick`, `hxGdBar`/`hxGdTarget`/`hxGdApply`/`hxGdNein`/`hxGdReset`; the factor `L.gg` applied inside `hxGain`, density
`L.gdv`; `hxStance` the ring's word; `hxMachNein/Lob` for ✕ ✓ and MIDI), answers (`HXA`, `hxAntIngest/Dist/Gen/Start/
Play/Stop`, real voices with `hxSrc 'hxr'`, `hxWakeRing`), Klangverwandtschaft (`HX_PART` from `part.js`, `hxRough`),
Begleiten (`hxBeglPlan/Best/Notes/Render`, `hxBegleiten`, suggestion loops `mi.sugg`), Wiederkehr (`HXW_K`, `hxWkBar/
Tick/Nein`, `mi.wk`, `mi.uMute` from `hxState`), Puls lernt (`hxPulsFit/Lernt`), Knospen (`HX.kn`, `hxKnTick/Frame`),
the Handschrift (`HXH`, database `myzel-hand`, `hxHand*`, `hxTempoPrior` in `hxTaktFinden`), the card (`hxCardGd`,
`hxCardMit`, `hxCardHand`). Parameters `hx.gaertner` (was `HX.gaertner`), `hx.gPlatz/gRollen/gAntw/gBegl/gWk`,
`hx.gStimme`, `hx.hand`. Persistence: `mi` and `anc.vn` in the record and the snapshot. Suites `t-hx-mitspieler` (33)
and `t-hx-gaertner` (58) in run-all; t-hx-fuzz carries ten more actions; t-idle-live 5d (an answer wakes the graph).
Fixed on the way: the card's „null“ (since 1b), glide curves of transposed notes (2b), the dead first `hxProbe`
(coordinator, own commit). Costs: no new processor cost (`HX_COST` unchanged): answers are voices (VCOST), suggestions
are loops (`schicht`), varied passes render in the Werk-Rahmen like living ones (`hxWPredict` ×1.75 at Variieren/
Wandern – a pass may hold 1.75 × the notes); main thread: a Wandern pass of 64 notes 4.2 ms, an answer 1.5 ms,
Begleiten 5.5–10.7 ms per source (split between tasks), a bar's decision 0.4 ms. Regression: SPEC §23 „Regression (step 3)“ – every red row is red
on 2491e14 too (compared run for run), except `t-ga-cost`, which step 3's first build broke and f922619 fixed (the Ohr
reads only new ring slots); the performance guard's tiefsee/d row fails against the stored reference, but HEAD equals
2491e14 there (33.4 / 34.7). Not built: Ladung on loops (§17), per-note vetoes in the card, Wiederkehr without a Takt.
Next: SPEC §23 – Etappe 4 (Ökologie).

**Step 2b (Werkzeug, built):** SPEC §11, §12.1 c/d, §13, §14, §16, §17, §19, §21 „As built (step 2b)“. Processor: the
tape's speed `{band}` (servo glide `vsPos/vsRate/vsEnd`, kernels `RSK` k16/k24 in `rd`/`grpRun`), Bandstopp, slices
`{slice}` (`slSet/slPass/slSlot/slRd/slOver`; Schnitt, Auslassen, Würfeln), Verblassen `{vb}` and Abrieb `{abr}` per
Schicht (`abSet/abPass/abApply`, applied to a Schicht still waiting via `schQ`), `geom` with `lock: 'frei'`, a third Humus
ring (input 2, `rings: 3`, the Puls's strips via `A.hxIn2`), the report's `sl`, the tripwire `nanTrip` (and `WSend`'s,
`hxwScrub` in the realms; reports in `HX.nan`). Page: `hxArtOf/hxOnsetsAt/hxClarity/hxBandFill/hxBandSend/hxTempoAudio`,
`hxSpeed/hxBandstopp/hxRev/hxBandTrim/hxDouble/hxVbSet/hxAbSet/hxSlcSet`, the notes' tools `L.nt` (`hxWNotesT`, `hxNtSet`),
`hxGrooveOf/hxGroovePuls`, `hxErstarren`, the consensus `hxAusleseCons/hxAusleseWuchs` (`hxWNotesMk`), `hxExportTake`,
`hxMidiOf`, `hxKlangFeld`, `hxPulsErnten`, Folge `HX.fl` (`hxFolgeTick`), Bühnenansicht `hx.buehne` (`hxBuehneSync`, the
tabs' long press, the toast filter), Setliste (`hxSet*`), the card `hxCardTools/hxCardFolge/hxCardSet`, persistence `tb`
(`hxTbOf/hxTbSend`). Suites `t-hx-tempo` (18) and `t-hx-tools` (47) in run-all; t-hx-fuzz carries Wuchs's and the tools'
actions (60 kinds), the tripwires' row and `FUZZ_DBG`; t-idle-live: a take's preview wakes the graph. Costs: `HX_COST`
capture 1.38, k16 2.06, k24 2.69, slice 0.77, abr 0.21. Robustness: tripwires (`nanTrip`, `WSend`, `hxwScrub` → `HX.nan`) and the guard `held` in `give`/`ddBack` (SPEC §23 „As built (step 2b): suites and the robustness hunt“). Fixed: a Lebendig fallback after a late pass lost its slot (`wsOwn`). Not reproduced: one whole Schicht detached while playing (seed 101, once in 25 fuzz runs; the guard now keeps and reports it). Open: the servo's overshoot (≈ 22 % of a step) for the owner's ear; Lebendig is not mirrored (rückwärts uses Treu); Verblassen/Abrieb ages and Trimmen's „ganz“ restart after a reload; Bandstopp acts at once (not at the 1); the Setliste's graveyard lives per session; the Puls's ring costs 64 s of memory and part of `capture`. Next: SPEC §23 – Etappe 3 (Mitspieler).

**Step 2a (Wuchs, built):** SPEC §10 „As built (step 2a)“ – notes `hxWNotesOf/hxWPass/hxWF/hxWJob`, realms `HXW` + pool (`HX_WPOOL`, `hxwPick/Warm`), Treu `hxWRender/hxWRenderFor/hxWUpdate` (signature `hxWSig`), Lebendig `hxWSlot/hxWTick` with the sink `myzel-wsend` and the ring's slots (`wst`, `wsCheck/wsTake/wsSet`, pacing `{fr}`), ✓✕⚓ `hxWLob/Nein/Anker`, key `hxWTonHold/Slots/Go/Ab`, tempo `hxWTempo/Go`, guard `hxWGuard/hxWPredict/hxWCanLive`, Live mode `hxWLiveTick`, card `hxCardWuchs`. Processor fixes: Ausklang/continuation of a swapped version at its seam only (`tld/kS`), `aus` never on a Wuchs version. Costs: `HX_COST.stream` 0.1, `HX_WRT`/`HX_WBASE` from `wrt.js`. Suite `t-hx-wuchs` (38 rows, in run-all); t-idle-live has a living loop. Open: Elmsfeuer identity (about 1 render in 6 differs, Chromium), one fuzz NaN in ten runs not reproduced, Gong seam row and device-clock rows fail the same on the build before. Next: SPEC §23 – step 2b (tools, audio tempo, groove, consensus, export, Bühnenansicht).

**Step 1d (form, controls, the Fährte's retirement, first ecology, Auslese, hardening, built):** SPEC §13 (`HX.lich`, `hxLichGo/Merken`, `hxFormTap`, `#hxForm`, Kern, `hxLuecke`, `hxSchluss` with the processor's `wilt`, scenes `MX.snap.lch`, `hxSlpEnter/Wake`), §17 (`hx.*` targets, `HX_MOMENT`, `FAE_TO_HX` migration, pedals `HX_PEDP`/`hxPedLearn` with the hold test, the capture-phase key listener `hxKeyDown`, `HX_NK2`/`hxNkPage`, `HX_PADFN`), §18 (the Fährte's UI removed; Schleifen of Bewegung `L.bew` – `hxBewPlan/Harvest/Only/Import/Export/Lay`; only they replay lanes live; a lane must change twice), §15 (output 2 sends, `hxNaehrGsp` webs, `hxNaehrKor` + `kor.src` „schleife“), §12.1c (`hxAuslese`/`hxDtw`/`hxAusleseFor/Do`), §6.4 (`hxGuardSet`, `hx.runde`), §16 (the 260-px rule `hxRailAuto`), §9 (summed reads `grp/grpRun`, de-drift jobs `ddAsk/ddStart/ddJob/ddAdopt` via `{ddReq}/{ddGo}`, the drift at the span's middle; Taumeln off: `hxTauOrig` gives each Schicht its own audio back), fixes the fuzz found: `drAt` (a negative index read NaN into Taumeln), an Auftakt's de-drift (`pre` < 0), a version given back while a summed read still waited for it (`gvQ`, `S.park`), a state change reviving a loop being cleared (a Lichtung's switch on the 1), a Schleife of Bewegung as the Fokus (sound punched into it), a loop cleared before its first pass never freed (`L.k < 0`), Schichten taken back while their loop died left in `HX.sch`. Suites `t-hx-form` 30, `t-hx-ctl` 23, `t-hx-bew` 66 (the Fährte's checks ported; `t-gf-loop/pc/save/gk` deleted, list in SPEC §18), `t-hx-oeko` 13, `t-hx-fuzz` 7 (2000 actions), `t-hx-taumeln` 14, Auslese rows in `t-hx-ohr` (27), `t-hx-ui` 69. Costs re-measured: `HX_COST = { capture: 1.33, schicht: 0.39, rs: 1.32 (per loop and output), fx1: 2.71, dd: 3.5 }`; a loop of four Schichten measured 4.3 units read one by one, 1.5 summed. All in SPEC's „As built (step 1d)“ notes; regression (reg.sh, klang, smoke-all, all Hexenring suites) green except rows that fail alike on the earlier builds, compared run for run (SPEC §23). Next (SPEC §23): Etappe 2 – Wuchs (the `wuchs` job's streaming, the CPU guard, Eigensinn above Treu through the guard's hook, ✓ keeps a pass's audio as the anchor – §10.3 note), Folge, Puls ernten, Klang aufs Feld, the tools.

**Step 1c (Werk-Rahmen, bake, Taumeln, seams, built):** SPEC §8 (`hxWerk`/`hxwCall`, child `hxwBoot`/`HXW_JOB` on `?werk=1`, jobs ping/bake/tail/wuchs-skeleton; determinism 26/28 within −100 dB, Schwarm and Tropfen the documented exceptions), §9 (`HXL` chain log, `hxChainRec`, `hxBake`/`hxSchPlay`/`hxAfterFill`, out 1 → out 0 at a seam, `hxFolgt`; Taumeln in the processor from its drift input – per-Schicht `dr`), §7 (`hxProbe`, `hxNaht`, `hxSeamK` time-local level, `hxTail`, `hxAuftakt*`, the stop's tails), §2 „Klopf mit“ (`hxKlopf*`, `hxLat`), §6.3 `hx.ein`/`hx.klick` (`hxClickAt` into `A.monSt`), the rail's auto-fold (< 800 px with a panel open; `t-lib-shots` p360 green), the Takt finder's margin (`hxTaktOk`). Suites `t-hx-werk/bake/seams` (+ taps/ohr/ui rows). Costs re-measured: `HX_COST = { capture: 1.07, schicht: 0.41, rs: 1.19, fx1: 2.81 }`. All in SPEC's „As built (step 1c)“ notes. Next (SPEC §23): step 3 items still open from 1b's list (Eigensinn guard, „eine Runde“ for punches, pedals/controls, Lichtungen, the Fährte's retirement), then Wuchs (the `wuchs` job's streaming, CPU guard).

**Step 1b (grammar, Ringleiste, persistence, built):** SPEC §6 grammar (`hxKorb`/`hxKorbPlan`, `hxHaupt`, `hxRingTap`, punch, retro rule, Stille, history), §12.1 a/b (`hxTaktFinden`, `hxWiederholung`), §16 UI (`#hxRail` in the new column `.stcol` with `#stage`; the card in `buildRec`), §19 IndexedDB v2 (`rings`, `ringsegs`), MIDI clock follow (t-clock 5/5), „Alles“ via its own node `myzel-ring-in` downstream of `A.masterIn`. Suites `t-hx-ernten/grammar/ohr/persist/ui` (+ `hx-g.js` helpers); all in SPEC's „As built (step 1b)“ notes. Costs re-measured: `HX_COST = { capture: 0.93, schicht: 0.31, rs: 0.96 }`. Open points for the owner: t-hx-proc's Gong seam row scatters with the random Gong material (RMS dip up to −1.7 dB vs ±1 dB, the 1a seam law; a time-local ρ would fix it); a short rubato phrase can find a chance grid (clarity near the 0.55 line); on a 360 × 740 phone the field (118 px) + the Ringleiste + the sound library don't all fit – the library list scrolls (Dunst 3 of 4 tiles in view; `klang/tests/t-lib-shots` fails that one check) – hide/fold the rail there, or accept? (SPEC §16 As built 1b). Test machine note: after a container restart the machine stalls audio several times a second; some Gestik timing/cost rows then flake on the step-1a build too (SPEC §22 As built 1b). Next (SPEC §23): step 2 (Werk-Rahmen, bake, Taumeln, the Ausklang tail render); not yet built from 1b's list: `HX.lat`/„Klopf mit“, `hx.ein`/`hx.klick`, the Eigensinn guard, „eine Runde“ for punches, pedals/controls, Lichtungen, the Fährte's retirement.

## Leistung – Ruhe und Bildrate (Stand 20.10.2026)

**Für den Besitzer:** Myzel rechnet jetzt weniger, ohne dass sich ein einziges Sample ändert – offline nachgerechnet: jeder Testfall Sample für Sample gleich wie vorher.
- **Ruhe:** Klingt nichts mehr, steckt Myzel Master, Kanalzüge und Effektketten ab – erst wenn Echo, Hall und Master exakt auf null ausgeklungen sind. Jeder Ton, der Bordun und jede Schleife stecken sie wieder ein, bevor sie erklingen. Der Humus des Hexenrings nimmt weiter auf. Im Leerlauf sinkt die Last der Audio-Threads auf dem Desktop von 21,5 auf 18,5 % eines Kerns, in der Android-Nachbildung von 20 auf 14,8 % – so viel wie vor dem Hexenring (veröffentlichte Version: 15,3 / 14,6 %; der Rest auf dem Desktop ist der Preis des Audio-Worklets, das der Hexenring braucht).
- **Hexenring:** Sein Kanal läuft erst mit, wenn es eine Schleife gibt, und 20 s nach der letzten wieder nicht – auch beim Spielen.
- **Erster Ton:** Was nicht klingt (Aufnahmestart, das Aufblühen auf dem Feld), kommt jetzt nach dem Ton, und die Wellentabellen werden beim Klangstart gebaut: der erste Fingerdruck braucht 2,2 statt 4,1 ms.
- **Bildrate (sichtbar, nicht hörbar):** Auf 90-/120-Hz-Bildschirmen (viele aktuelle Handys) zeichnet das Feld höchstens etwa 60 Bilder pro Sekunde. Seine Bewegung war für 60 Hz gebaut und lief dort bis zu doppelt so schnell, mit kürzeren Spuren – jetzt läuft sie überall gleich, mit halb so viel Zeichenarbeit (nachgebildet: Hauptthread im Leerlauf 46 → 36 % eines Kerns, beim Spielen 98 → 90 %). Wenn dir das schnellere Feld lieber war, sag es.
- **Entschieden (20.10.2026):** Der Hall schläft im Leerlauf mit – erst wenn sein Nachhall ganz auf null ausgeklungen ist; nach dem Aufwachen klingt er um −99 … −103 dB anders als ohne Pause (unhörbar, nicht bitgleich). Das spart im Leerlauf noch einmal die Hälfte: Desktop 26 → 13 % eines Kerns, Android-Nachbildung 21 → 8 %. Das Echo läuft weiter (es brächte nur 1–2 Punkte, wiche mit Leiern aber um bis zu −57 dB ab). Das Feld bleibt bei 60 Bildern pro Sekunde, so schnell wie gedacht.

## For the next session (English working notes)

**Branch:** the one named in the session (stage 1 was on `ccr-c7c5d0a6-cus3ip`, stages 2 and 3 on `ccr-d21a93b2-oncy3v` – after the owner merged stage 2 (PR #1) into the default branch `ccr-c7c5d0a6-cus3ip`, the branch was restarted from it for stage 3) – develop, commit and push only there; no PR unless asked. The Pages app updates when the owner merges a stage into the default branch (a PR they open or ask for).

Commit trailers:
```
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: <this session's URL>
```

**App:** source in `myzel/src/` – a module tree (since 23.10.2026): the shell `myzel/src/index.html` holds one `@include` line per module (their order is the app's order: one IIFE, one shared scope), modules under `html/`, `css/`, `js/{core,voices,engines,dsp,grains,capture,puls,play,midi,gestik,mod,ui,mixer,hexenring}/` (Etappe 3 in `js/hexenring/mitspieler/`, Etappe 4 in `js/hexenring/oekologie/`); `js/dsp/*` is the body of `myzelDsp()` (AudioWorklet scope – nothing from the app). `myzel/index.html` is the **built output, committed alongside** (one file of about 1.4 MB, German UI, vanilla JS + Web Audio) – never edit it by hand; edit modules, then `python3 myzel/build.py myzel/src myzel/index.html` and commit both. Guards: `myzel/pwa/build.py` and the Pages workflow refuse a stale `index.html` (`python3 myzel/build.py myzel/src --check myzel/index.html`), and so does `dev/tests/v2/mk.sh` as its first step. Find code with `grep -rn name myzel/src`. The split tool and its module map: `dev/tools/split/` (README: how it cuts, the escape hatch for a late branch that still edits `index.html`, what a move to real ES modules would take). GitHub Pages (https://beidlat.github.io/4claude/) deploys from the default branch `ccr-c7c5d0a6-cus3ip` alone: its `github-pages` environment allows no other branch. The stage-2 session had added its own branch to `.github/workflows/pages.yml`; every push there failed before a runner started (runs 18–31, the owner got a failure mail each time) – it is out again. A session's work reaches the app by a pull request into the default branch; Claude opens it and merges it when the owner says so (18.10.2026: „streich ihn und merge dann“ for #4).

**App updates and release notes (23.10.2026):** the installed app checks for a new version on the start screen,
before the instrument starts. `pwa/build.py` stamps `window.MYZEL_BUILD = {version, notes}` into the page (version = the
service worker's cache version, the content hash; notes = `myzel/CHANGELOG.json`'s entries) and calls
`window.myzelUpdate` (`myzel/src/js/ui/update.js`, `updBoot`) – outside claude.ai and the Werk-Rahmen
only, so the artifact has no check. `updBoot` registers `sw.js`, runs `registration.update()` (never awaited by
anything; 3 s cap), and offers a waiting worker in the card `#upd` at the top of the start screen: „Neue Version
verfügbar“ with the notes the page lacks (read from the waiting version's own cache, `changelog.json`, after asking it its
version over a MessageChannel), „Jetzt aktualisieren“ (message `skipWaiting`, reload once on `controllerchange` – only the
page that asked, never once sound started) and „Später“ (this start only). A worker still installing shows „Neue Version
wird geladen …“. While the card is open, `toast()` queues (up to 4, shown after it). „Klang starten“ closes the card
(= Später); a version found only after the start gets one quiet toast. After an update the first start shows „Neu in
dieser Version“ once (`myzel.neu` = newest id seen, `myzel.neu.von` = the old page's ids, set by „Jetzt aktualisieren“; a
controlled page with no `myzel.neu` – updated from a version before the card – shows the newest entry). `sw.js`: a new
version caches everything and then waits; it takes over at once only when the active version predates the card (no
`changelog.json` in any other `myzel-*` cache) – that old page then shows its old „Neu laden“ toast and the next start is
the new version (tested against 0a3b1b2). Test: `dev/tests/pwa/t-pwa-update.js` (in `reg.sh`; own server on :8791,
builds A, B = A + a test entry, A0 = only the oldest entry, OLD = 0a3b1b2; screenshots `out/upd-*.png`).
**How a release gets its notes:** every pull request into the default branch that changes what a player sees or hears adds
one entry at the top of `myzel/CHANGELOG.json` – `id` = the publishing date `JJJJ-MM-TT` (a second release on the same day
`…b`, then `…c`), `punkte` = 2–6 short German sentences for a musician, no internal names (no SPEC terms, no function
names). `build.py` refuses a malformed list (unique ids, newest first, 2–6 points). A build without a new entry still
updates (the card then says „Verbesserungen und Korrekturen.“). The version itself needs nothing: it is the hash.

**claude.ai version:** the artifact https://claude.ai/artifact/HNZYLEaUvtCfkyYWi3SuDr, private, capability `downloads` – still stage 1.
- Republish it with the Artifact tool: `url` + `file_path` = `myzel/index.html`.
- A new conversation must first `read` the artifact, then publish. The tool asks for every line of the live version (and of a file Claude did not write in the session) to be read first – at 1.4 MB that is ≈ 870 k tokens, more than a session holds; stage 2 therefore did not republish. Ask the owner how to go on (a session only for that, or the Pages app alone).

**Workflow etiquette:**
- Build stage by stage, as the owner chose. Each stage is built, tested, committed, pushed and published before the next one starts.
- **Publishing (owner, 25.10.2026):** a finished, tested stage is published by Claude itself – pull request into the default
  branch, merge – without asking; ask first only when the step changes the sound audibly or checks are still open.
- **Backups (owner, 25.10.2026):** a backup is never updated; each larger development step gets a new private repository
  (`myzelbackup` = 18.10.2026, before the Hexenring; `myzelbackup251026` = 25.10.2026, every branch after PR #13 – the
  Hexenring complete, the modules, Taumeln in WebAssembly; its default branch shows as `IpadMuzika`, the app's is
  `ccr-c7c5d0a6-cus3ip`). Claude cannot create repositories (the
  GitHub integration is refused) – the owner creates the empty one, Claude pushes every branch and tag into it.
- Report to the owner in German, briefly.
- **Best sound quality first (owner, 17.10.2026, for the whole project):** cost targets in SPEC and in the bench are measured and reported, never a reason to simplify a sound. Build every engine with its full planned sound (and better where possible); enter the measured VCOST honestly. If two goals of the plan conflict, ask the owner before deciding.
- The earlier usage-limit trouble came from the model in use then; there is no need to economise on tokens or subagents.

### Documents (binding)
- `dev/klang/SPEC.md` – the build spec:
  - §2: the shared worklet module (already built – read the code: `myzelDsp`, `MYZEL_DSP_SRC`, `ensureDSP`, `MyzelProc`, `wkPlays`, `engLabel`).
  - §3.x: each engine.
  - §4: library (built).
  - §5: presets.
  - §6: integration checklist.
  - §7: tests.
  - §8: build order and risk register.
- `dev/klang/KONZEPT.md` – the German concept the owner has read (names, sounds, families, honest limits).
- `dev/klang/ideas/check/*.json` – the adversarial checks per engine. Their required fixes are acceptance criteria.
- `dev/klang/ideas/judge-*.md`, `ui-final.md`, `dev/klang/research/*.md` – background (`code-map.md` maps the code; line numbers drift, so search by name).
- `dev/gestik/` – the Gestik concept and decisions (done earlier).

### Test infrastructure
Run once per session:
```
sh dev/setup-tests.sh <scratchpad-dir>
```
It does the following:
- copies `dev/tests/*` there and rewrites the old absolute paths;
- regenerates the parity baselines from git;
- starts `python3 -m http.server 8790` serving `<scratch>/v2`.

Then use these:
- `sh <scratch>/v2/mk.sh /home/user/4claude/myzel <slot>` builds `<scratch>/v2/<slot>/` and `<slot>-inst/`; the latter exposes internals on `window.__M` and its export list grows via guarded blocks.
- Playwright is at `/opt/node22/lib/node_modules/playwright`. Use Chromium args `['--autoplay-policy=no-user-gesture-required']` and start the sound with `#btnStart`.
- The suites:
  - `klang/tests/run-all.sh` covers stages 1–3 and the library. `SKIP_BENCH=1` skips the offline bench (≈ 30 min for five engines); `bench.js` is the per-engine acceptance bench (`node bench.js elm jrg` for single engines), so extend it for each new engine – its table `T` takes `native`, `struck`, `pp` (params for the pitch checks) and `cost` (env for `cost.js`).
  - `klang/tests/t-eng-native.js`: stage 2 live (Elmsfeuer, Jahresring: finger, MIDI, lanes, jumps, the year clock, Verjüngen, Schlafen, Rassel, no worklet). `t-eng-live.js`: the worklet engines live (Halm, Ranke, Harz). `t-dsp.js`: their processors in Node.
  - `klang/tests/proto-hrz.js`, `sweep-hrz.js` (constants varied by replacing them in the source), `tim-hrz.js`, `burst-hrz.js`, `pan-hrz.js`, `demo-hrz.js`: the Node tools Harz was tuned with – quick to re-run when a processor changes.
  - `v2/func.js` needs slot `new` (→ `new-inst`). Other v2 suites: `fixes`, `mobile`, `bars`, `bars2`, `integrity`, `sources`, `live2`, `presets`, `smoke`, and `SEED_BLOBS=1 NO_RAF=1 node mixfunc.js mnew-inst` (slot `mnew`).
  - `mixui/f/func.js` needs slot `mix`.
  - `midi-tests/run-all.sh`.
  - `motion-tests/run-all.sh` is long; a few timing checks flake under load, so re-run those alone.
- Syntax check: `sh <scratch>/motion-tests/syn.sh myzel/index.html` (after the build). All test builders read the built `myzel/index.html`; `mk.sh` refuses it when it is stale against `myzel/src`.
- `sh <scratch>/reg.sh` runs every regression suite after a stage (v2, mixfunc, mixui, MIDI, Gestik) into `<scratch>/reglogs/`, summary on stdout.
- Performance (`dev/tests/perf/`, 20.10.2026): `sh <scratch>/perf/run.sh` is the guard – Ruhe's parity and live tests, then CPU per thread against `baseline.json`'s reference build, measured alternately; `reg.sh` runs it last (`PERF=0` skips it; ≈ 75 min). `node <scratch>/perf/perf.js [--runs 3] [--vp d,a] [--sc …] [--hz120] <slot>…` is the table, `inv.js <slot>` the live graph's inventory, `attrib.js <slot>` each always-on part's share. Details: „Notes from the performance pass“ below. Never beside another heavy test.
- Cost (`klang/tests/cost.js`): this machine's render times scatter by ±20 % between runs. The script keeps each candidate's fastest of N interleaved rounds and scales by the **median** of the held native references; struck engines need `DUR` inside their voices' life (Jahresring: `DUR=2 PARAMS='{"jrg.holz":1,"jrg.jahreszeit":"sommer"}'`; Rhizom: see the final calibration below). A singleton (Gespinst's web) is measured as 24 of them (`NW=24`). Re-run before believing a single number – busy builders skewed it by up to 1.7×; on a quiet machine two runs agree within ≈ 10 %. `recal.js` is the full calibration.

### Notes from stage 1
- **OfflineAudioContext:** port messages to a processor only arrive at the next `suspend()`. The note-on therefore travels in `processorOptions.on`; tests add a suspend one block after a message (see `klang/tests/bench.js`).
- **Adding an engine:**
  - one `ENG_META` line (family, Spielweise, sentence, tags, Höhe word, `regen`, probe gate, level-3 text);
  - an `ENGINES` entry, which for a worklet engine has `needs:'worklet'` and `fallback:'<native key>'`;
  - the params (≤ 6), `VCOST1/3` (measured against 24 Nebel voices, interleaved), `MACRO`, `ENG_NOTE`.
  - All 26 glyphs are already in the sprite. `ENG_LATER` names the unbuilt keys; remove a key from it when it ships.
- **Open from stage 1:**
  - Ranke's held flutter has to be judged by ear.
  - Halm level 1 costs 0.59 (final calibration) against the 0.55 target.
  - Long-press drag scrolling on real phones is untested.
  - Worklet load time and thread move on a mid-range Android are not measured.

### Notes from stage 2 (Elmsfeuer, Jahresring)
- **Built to SPEC §3.9/§3.12 with their full sound** (a first version had simplified both to reach SPEC's cost targets; the owner rejected that – best sound first). Cost as measured: Elmsfeuer ≈ 1.0–1.6 units at level 1 with its arc (≈ 2–4 at level 3), Jahresring ≈ 0.8–1.1 while its modes ring (≈ 2–2.7 at level 3); VCOST 1.8/4.2 and 1.2/2.9 – the final calibration on a quiet machine measured 0.93–0.95 / 2.0–2.2 and 0.82–0.98 / 2.05–2.32 (VCOST now 1.09/2.51 and 1.13/2.67). The bench reports cost as INFO, it no longer fails on it.
- **Chromium cuts a BiquadFilter's output** after its own tail estimate once its input is silent – for a high-Q band-pass excited by a click that is long before the mode has rung out (Q 150 at 440 Hz: cut at 0.29 s, T60 0.75 s). Jahresring's contact source loops a −140 dB trickle until the voice ends (`jrgImp`). Any future native resonator needs the same.
- **Where the build differs from SPEC's letter, and why** (each measured): the hum is one PeriodicWave with SPEC's lopsided tanh baked in (same sound as two oscillators and a shaper, without aliasing or offset); the corona's pre-gain is set so the threshold lies z = 4.1 → 1.4 standard deviations out (SPEC's 0.6 + 1.2·y gave almost no ticks; the acceptance asks 50–300/s) and its level `knistern·(0.2 + y)` is evened out with the density (else the ticks low are inaudible and the fizz high buries the arc); the arc's follower has a soft ceiling (bursts of ticks would pop) and its tanh is oversampled (2×, level 3 4×); a high-pass after the arc's tanh takes its offset; the shared loops (steps, two gates) are 16 s, not 2 s (the check's „repeats audibly“), the steps capped at 2.7 jumps/s; zap steps stay in key (KONZEPT „in der Tonart“ over SPEC's „depth ∝ vel“); a zap halves the hum so the arc leads. Jahresring: the mallet is its contact (a click, the same every hit) plus SPEC's 2–6 ms noise burst, so no hit comes out weak; a soft mallet weakens the upper modes and the box opens toward the bar's end (both for SPEC's „centre round, end bright“); the knock passes the box (SPEC's „knock noise“); the ice crack adds a 2-ms tick past the box so it is heard.
- **Native cost is per node, ~6–10 ns each** (≈ 0.05–0.07 units), more than SPEC's 0.03/AudioParam.
- The year starts where the calendar stands (5 May = spring), runs in `tick()` (`jrgClock`) only while the context runs and the page is visible, hits add ≤ 2/s. Age resets with Verjüngen, Schlafen and panic.
- **Library texts:** `famPlay()` names a family by the way most of its sources play (Elmsfeuer, „beides“, would otherwise have moved Luft into „Tippen und Wischen“).
- **By ear, still open:** the arc's character, the crackle density at default height, the Jahresring box/tube/knock balance, leaves and ice levels.

### Notes from stage 3 (Harz)
- **Built to SPEC §3.1 with every acceptance row and the check's fixes** (inventor-hrz, inventor-dax, performer-tum), all five bodies. Measured (bench, out/hrz): in tune within 1.9 ct without Schwebung at 110–1568 Hz; t90 0.2–0.6 s; mode 2 ≥ 34 dB under mode 1 at y 0.1/0.85; h2/h3 rise with Höhe; the ring after release within 0–15 % of the Dämpfung mapping; level 3 within ±0.4 dB of level 1 at any pan; cost ≈ 0.9–1.4 units at level 1, 1.7–2.9 at level 3 (VCOST 1.6/3.3, the highest run + 15 %; final calibration over all five bodies 1.11–1.49 / 1.97–3.35, VCOST 1.71/3.85).
- **Where the build differs from SPEC's letter, and why** (each measured in Node, `klang/tests/*-hrz.js`):
  - the onset seed is one period of each band's own sine, not low-passed noise (a noise burst falls mostly outside the 32-Hz bands: −62 dB, t90 1–1.7 s);
  - a pass loses g per period **plus the band-pass's group delay** 1/(π·32 Hz) ≈ 10 ms (else the ring after release was 4–5× the Dämpfung mapping); D = SR/f exactly (the RBJ band has zero phase at its centre), no τ_bp subtracted;
  - Glas/Schale: the bow's contact stays where it set on; the finger's circling is heard as the pattern (S) turning past two listeners a quarter turn apart (level 1: one) – as amplitude, because turning the listeners around a fixed pattern shifted the pitch of its travelling share by n·rot (up to 20 ct) and a moving contact broke the swell; the doublets' share O is picked up a quarter period late (else ±2.5 dB note to note); the right listener takes S late and O now (two coherent channels sum up to 2 dB louder off centre in the voice's StereoPanner); level 3 single bands: equal power 1.31/0.53, the softer side a quarter period late; the lifted finger stops circling;
  - Schale: the measured 180-mm bowl's ratios 1 : 2.778 : 5.181 : 8.163 : 11.661 instead of STK's 2.986 (near 3: the stick-slip's 3rd harmonic locked mode 2 in, −11 dB and −9 ct at 110 Hz);
  - the friction path: level `harz · (0.2 + 2.5·p²) · 5.5` through each body's high-pass (Glas 1500, Schale 800, Stab 300, Zunge 60, Teich 500 Hz) – SPEC's 0.5·(0.3 + 0.7p) left it 20 dB under the tone (h2 −50 dB, Höhe did nothing audible); a rough contact (the pressure trembling with low-passed noise, ±0.25·(0.3 + Harz)·(0.3 + p), at the very top +0.8) gives grain and the tearing; pressing harder plays louder (`0.55 + 0.9p` on the bow speed), Dauerschlupf ×1.4 above y 0.9 (SPEC 1.8: +5 dB jump);
  - Dämpfung is a damping (more = shorter: `0.4 + 6(1 − d)²` s × the body's ring – Glas 0.6, Schale 2.5, Stab 1.6, Zunge 0.35, Teich 2), as Ranke's; default 0.6 = SPEC's 1.36 s; the native release is six times slower than the ring (the processor ends the voice when silent);
  - Zunge: formants inside the processor that open with the pressure (u → a: F1 350–750, F2 900–1800 Hz, +9 dB, then 3.5 kHz), the bite seeds the upper modes, the growl is the bow arm at 25–45 Hz from y 0.55; **no second tongue at level 3** (under the shared bow it locked to the first – no beating – and only changed the swell/ring between the levels; tried bowed, weakly bowed, sympathetic);
  - Teich: a neighbour rod (1.031 ± 3 %, level 3 its second mode and a third rod), the bowl's resonance inside the processor, water as a damped 0.8-Hz slosh stirred by every stroke and a little noise – it bends the rods apart (±25 ct × (0.15 + 0.85·Schwebung)) and moves the bowl (± that share of an octave); from y 0.85 the bow is drawn to the rod's second mode, from ≈ 0.95 it screams there (bistable, as bowed rods);
  - L3 stereo: see above; level 3 Glas/Schale every mode a pair (10 bands), Stab 6, Zunge 4, Teich 6.
- **By ear, still open:** the wah's depth and speed, the friction's colour per body, the Zunge's vowels and growl, the Teich's water and scream threshold, the Puls stroke (pluck ×3 under 0.3 s and ×2 native).

### Notes from stage 4a (Halm's Flöte and Flamme)
- **`hlm.rohr`** (chips Rohrblatt/Flöte/Flamme); each pipe names the five knobs its own way (`HLM_LAB`, the `lab` option of `NUM` – the label's first text node changes, the macro mark A/B stays) and has its own note text (`ENG_NOTE.hlm()` is a function). A pipe chosen under a sounding note starts from its own tone (`pipeOn`). Voices are priced by their pipe (`HLM_COST`, a getter on `VCOST1/3.hlm`).
- **Flöte** (`FluteLoop`, STK's jet x(x² − 1) on a non-inverting open bore – every harmonic): the jet delay picks the register (½, ¼, ⅙ of the period: fundamental, octave, twelfth); Strahl moves the overblowing point (y 0.57–0.87), the twelfth above y 0.95 (below 2.6 kHz). The bore's low-pass and the breath pull the pitch +4…+65 ct: a frequency-locked loop on interpolated zero crossings stretches the bore by (measured/target)^0.15 per period, only when two successive periods agree within 3 % (a mode jump or a burst does not pull it); within 0.4 ct in all registers 110–1320 Hz. A noise tongue kicked low notes into the twelfth (measured), so a note starts from one period of its tone in the bore plus a breath push. Below y 0.12 only air (the loop runs on in tune, its output fades in – a loop started from noise catches the twelfth). Without breath the jet is gone (`jg`), else the bore rang for seconds after release. Output DC-blocked (the jet's breath offset sits in the bore).
- **Flamme** (`FlameTube`, a Rijke tube): two travelling-wave pairs split at the heater, both ends open and inverting with a low-pass at 6–20 f (Rohr: the same loss at every pitch, its delay taken off the bore). The heat release follows the velocity at the heater a quarter period late by **King's law**, q = heat·tanh(K(√|U0 + u| − √U0)) – flow reversal rectifies it: even harmonics growing with heat (a plain tanh(2u) gave a hollow sine). The sound is **a2o + 0.5·b1o**: both ends breathe out together on the fundamental; the first build read a2o − b1o, which cancelled the fundamental by 40 dB and made the octave look 35 dB too loud. Threshold y ≈ 0.33 at every pitch (heat 0.04); the ignition's puff (Zunge) knocks the tube, so low notes start in 0.2–0.3 s. At the threshold the flame's slow pulse (a random walk 1.25–2.5 Hz, Flackern, weaker above the threshold) lifts the tube over it and drops it: the tone surges ±15 dB; above it ±1 dB.
  - **Overblowing**: a sounding fundamental never let go, whatever the heater did (grid over pos 0.1–0.15 × τ 0.05–0.4, and the "drive ∝ sin(2πn·pos)·sin(2πn·τ)" settings that should damp it – the saturated tube does not follow the linear rule). What works: heater at ⅛, lag ⅛ period, heat held at 0.07, and a **flare** – the ends let the old mode out for 30 ms, the new one starts from a period of itself (both ways; hysteresis 0.9/0.875; notes below 1 kHz). Measured h2 − h1 +25…+37 dB at 110–880 Hz, level within 1 dB of the fundamental after a lift (`1 + 2.7 + f/330`).
  - The fire: a rumble (LP 120–720 Hz) and a turbulent hiss beside the tube, the hiss also inside it (it whispers on the note); ≈ 14 dB under the song at y 0.1. Cracks: Poisson, 1.5–36/s with heat × Feuer, a 1.5-ms burst high-passed at 1.5 kHz, harder with heat (heard over the song: counted above 5 kHz, 3/s low, 21/s high). Let go: the flame dies, the tube rings out within ≈ 0.5 s at any pitch (`rr`), one last crack 40–160 ms later; native release 0.8 s.
  - Pitch: the fundamental's line is within 0.3 ct (the FLL); a harmonic comb reads −3…−13 ct there because the fire rings the tube's own, slightly stretched modes – measure the line.
- **Cost** (final calibration, quiet machine): reed 0.55–0.59 / 0.91–1.0, flute 0.76–0.77 / 1.33–1.38, flame 1.37–1.42 / 2.48–2.55; `HLM_COST` 0.68/1.15, 0.88/1.59, 1.63/2.93 (the first figures, taken with three builders running, had the flute under the reed).
- **By ear, still open:** the flame's fire/crack balance and the surge's speed; the flute's air below y 0.12.

### Notes from stages 4–7 and the reserves (built on 17./18.10.2026; builders' reports condensed in SPEC's „As built“ lines)
- **Built by parallel builder agents** in git worktrees (Moder, Böe, Amöbe; Zapfen, Sehne, Glut), merged by hand: every engine touches the same tables (`ENG_META`, `ENG_LATER`, params, `GROUP`, `VCOST1/3`, `MACRO`, `ENG_NOTE`, the `onParamChanged` case, the processor list), so a git merge interleaves classes and loses closing braces. What worked: take the builder's diff against its base, set each hunk onto the current file by its anchor (the table lines by hand), then check that every line the builder added is in the result (`collections.Counter` over lines) – and for the tests a three-way `git merge-file` per file (`<scratch>/tmerge.sh <key> <base>`), resolving „both added here“ as ours + theirs and restoring the closing brace that the two blocks share.
- **Gespinst:** the coupling limit is computed from the strings' responses (partials, between them, below them) with a high-pass on the bridge's feed back – a sub-audio mode (14 Hz) oscillated at Nachklang 0.5 before. `voiceLoad()` counts the web while it rings; its own mixer strip „Gespinst“ (Halo = its level); `{clear}` at Stille/Schlafen posts `{idle}`.
- **Rhizom:** the net runs in `tick()` (`rhzRun`, exact event times, scheduled ahead like the Puls); offline (and with a stopped clock) a strike's cascade is laid out at once – tests that need causality set `RHZ.step` and run the clock by hand (`M.rhzRun(t)`). A voice's cost grows with its ringing pings (`RHZ_COST`).
- **Kehlchen:** the labia in the note's phase with a frequency-locked loop (≤ 0.2 ct over 110 Hz–6 kHz at every pressure); the sound is the flow through the opening (a smooth max), so partials rise with pressure; the throat follows the note.
- **Sehne / Zapfen / Glut:** see their builders' notes in SPEC §3.7/§3.8/§3.3. Zapfen and Glut are their own stand-ins without AudioWorklet (`fallback: 'native'`, `wkReady()`); their native voices are priced separately (getters on `VCOST1/3`).
- **Tests:** `bench.js` covers every engine (`node bench.js <key>`; table `T` gained `line`/`lineAt` (pitch on the fundamental's line), `cYs`/`partials`/`cWin` (centroid variants), `burstDur`, `rel`); `t-dsp.js` every processor (147 rows); `t-eng-live.js` every worklet engine live (`KN_URL`); `listen-new.js OUTDIR` renders listening demos; `recal.js` the final cost calibration. The Gestik suites know the new Ladung targets (Gespinst-Kopplung, Rhizom-Reiz) and the Gespinst strip.
### Notes from the final cost calibration (18.10.2026, session `ccr-183ec81a-rkp3np`)
- `klang/tests/recal.js` (≈ 3 h, nothing else running) measures every new source at levels 1 and 3 – every body, bridge, pipe and syllable, the native stand-ins, Gespinst's web, Rhizom's split – two runs each, and prints the highest + 15 %. On a quiet machine the two runs of an entry agree within ≈ 10 %; the earlier entries, measured while builders ran, were up to 1.7× off either way. The figures and the new table are in SPEC §2.4 („As built (final calibration)“).
- **Gespinst's web:** one web alone carries the worklet's fixed share of the render, and cost.js multiplies a single node's figure ×24 (3.7–5.0 units, scattering). `NW=24` renders 24 webs against 24 Nebel voices, the voices' own method: 1.8–2.2 / 2.5–2.7 (the builder's 1.7 after the Lagrange fix agrees). The bench's web row uses it.
- **Rhizom:** its voices end with their cascade, so cost.js's 3-s window averaged them over a third of their life (0.29 – it matched the old entry 0.3 by chance). `rhz-pings.js` counts the pings ringing and how long the voices live; a voice with one ping costs 0.62 / 1.20 while it sounds, each ping beside it 0.29 / 0.38 (same NV for both settings, so level 3's graph share cancels). Entered: VCOST 0.71/1.38, `RHZ_COST` base 0.38/0.94 + 0.33/0.44 per ping ringing (`base` is per level now). A Rhizom shower now takes at least 2.4× the budget it did, so on a phone fewer strikes ring at once (stolen as before).
- Checked after entering (18.10.2026): klang suites, smoke-all (all 28 sources sound), v2, mixfunc, mixui, MIDI and Gestik green (t-gf-cost and t-gs-regen flaked once under load, green alone); the bench's cost rows for Rhizom and Gespinst pass. Two bench rows scatter run to run on the same build, budget-free (`budget = 1e4`), so not the costs: Gespinst's level 3 vs level 1 (−22.8/−21.0 once, else within 0.4 dB) and Rhizom's exhaustion with Erholung 0.1 (56–94 % against ≥ 70 %).
- Dearer variants priced in: Sehne's jawari (plucked 0.68/1.29, E-Bow 0.94/1.84), Zapfen's Holz (worklet 0.76/1.30) and Panzer native (1.74 at level 3), Jahresring's winter (0.98 at level 1), Kehlchen's Triller (0.73/1.33), Harz's Stab at level 1 (1.49).
- **Lessons** (also in `dev/tests/klang/BRIEF-engines.md`, the builders’ brief): offline port messages arrive only at a suspend (kick one after each); a float sample index gives NaN (round it); measure a self-oscillator's pitch on its fundamental's line, not with a comb; a level-3 voice that outputs stereo skips the voice's centre panner (−3 dB at level 1) – scale it.

### Notes from the performance pass (20.10.2026, session `ccr-183ec81a-rkp3np`)
- **Goal (coordinator's brief):** the constant audio load as small as possible without changing a sample; phones keep working, strong devices are the target. Commits `977e39b` (Ruhe + harness), `9ed4816` (note start), `5691d21` (taps only in the quiet), `5ede726` (field at 60 frames), `957d8b3`.
- **Ruhe** (`IDLE`, `idleBuild/idleTick/idlePoll/idleTaps/idleEnter/idleWake`, after `mixMeters`): at idle the echo's loop (a cycle) and the Hexenring's processor (a worklet) are never silent to Chromium, so everything after them ran on – the master, the strips, the chains, the hall. After the last source (`idleSrc`: voices, grains, touches, Bordun, frozen echo, Puls, rain, Schleifen, webs, Gespinst, Rhizom, an IR being made) the taps (analysers on the echo's delay inputs, the hall's input and the master's input, each channel) are plugged in; once the echo's loop has been exactly zero 6 s, the hall's input its IR + 3 s and the master's input 3 s (and 3 s since the last source), `idleEnter` takes out `masterSum→masterIn`, the echo's return to its strip and `dlySend→dlyIn`, the hall's sends (a stereo zero feed takes their place), the Gespielt input of the processor, and closes `HX.gM`. Every source plugs them back before it exists (Voice constructor, `startBordun`, `hxPost` with a loop, `hxNode`, `hxOut1`; `idleTick` counts a wake it had to make itself as late – never seen). The keeper (`IDLE.keeper`, a gain at 0 into the destination) pulls through its gain param what must keep its time: the 8 shared LFOs (the bake follows their phase), the Gespinst's web, the Hexenring's processor (the Humus records the silence), the echo's loop and the hall (their rounding, see above).
- **Automation keeps its time only where the render pulls** (`idleHook`): Chromium advances a setTarget or a ramp sample by sample while its node is processed; a node taken out of the render holds it where it stood (measured; and a setTarget reaches its target exactly after 10 time constants of processing). The first Ruhe build (`977e39b`…`0ae83ea`) therefore let a knob turned in the silence glide only when the next note woke the graph (the parity case: −2.8 dB after the wake; found through `motion-tests/t-gm-learn`, whose mod points set ahead read back frozen). Now every AudioParam automation call and value set wakes the graph first, and it falls asleep only once the last scheduled move has ended (`IDLE.autoT`). Opening the mixer wakes it too (its meters' filters are made), it sleeps again with the mixer open.
- **Hexenring gates** (`hxGates`, `hxGateM`): SPEC §21 „As built (performance)“. Without a Schleife the strip „Hexenring“ no longer runs at all, also while playing.
- **Proof of exactness** (`t-idle-parity.js`, offline, every sample): exact cases (single-oscillator voices, echo without wow/ping-pong, halls 5 and 12 s with pre-delay, the mixer's EQ/saturation/width/balance, the compressor hard, a frozen echo thawed, echo at 105 %) – old build `e341c1b`, the new build without the switch and with it all max |d| = 0; the presets (default, Tiefsee without Bordun and Puls, Tempelglocken, the Bordun after a silence), knobs turned in the silence (the chain's cutoff, a balance, the master's bass) and a 20-s ramp running through it differ from the old build after the wake no more than the old build from itself (Chromium's own summing order: old↔old −67 … −112 dB; the ramp case 0); the options measured (hall −103 dB, echo with Leiern −64 dB). (Until `idleHook` the test's wake log missed wakes made by a voice itself, so its after-wake window was empty – fixed; the knob case failed on the build before the hook at −2.8 dB, see below.) `t-idle-live.js`: idle after ≈ 8 s, wakes by finger, Bordun, mixer meters, a Schleife; never late.
- **Note start** (`noteAfter`/`noteAfterRun`, `oscWarm`): from the WIP patch `wip-2a-step0.patch` without its t-hx-bake part (the git stash untouched). First note's `onDown`: `e7afa22` 4.0 ms, `e341c1b` 4.1 ms, now 2.2 ms; warm notes 0.7 ms everywhere; the onset in the graph unchanged (1–4 samples).
- **Visuals:** the main thread's time at idle is almost all the field canvas's hand-over to the compositor (trace: `ProduceCanvasResource` ≈ 290 of 360 ms/s in the Android emulation, JS ≈ 25 ms/s; while playing JS ≈ 46 ms/s inclusive of 900 ms/s busy); the Ringleiste already draws only on change, style, layout and paint of the page together take ≈ 15 ms/s – no redundant redraw worth removing found. The field is now drawn ≈ 60 times a second on faster displays (`FR`, `frameCtl` – a visible change, owner's call above).
- **Measured, not changed:** gains at ×1 (38 busy while a note plays, the strips' switch points) cost 0.1 ms per second of audio each offline – 0.4 % of a core together, at idle they rest; the Hexenring's processor without a Schleife 3–6 ms per second of audio; the device thread's hand-over to the worklet thread 3 % (desktop) / 1.3 % (Android emulation) – the price of any worklet. Tiefsee's idle is not idle (its Bordun sounds), the Puls scenarios neither: there only the gates and the taps save.
- **Harness** `dev/tests/perf/` (copied by `setup-tests.sh`; needs :8790): `lib.js` (viewports d = 1280×800, a = Pixel-7-like 412×915 DPR 2.625 touch; CPU per thread group from `/proc` – audio = the render threads, conv = the convolver's background thread, main, comp, gpu, total; the scenarios idle, tiefsee, regenwald, kompost, play, after; `RAF120` emulates a 120-Hz display by running the page's frame callbacks twice per frame), `perf.js` (the table: builds alternate run by run, each figure the median of `--runs`; `--json` is written as it goes), `inv.js` (the live graph's inventory: what the render pulls, what of it is busy; `parts()` names Myzel's parts), `attrib.js` (offline: each always-on part's share of an idle render), `t-idle-parity.js` and `t-idle-live.js` (Ruhe's proofs), `check.js` + `run.sh` (the guard) and `baseline.json`. Never run it beside another heavy test; background runs need `timeout` up to 7200000 (the default cut a 72-measurement baseline at 71).
- **The guard** (`sh <scratch>/perf/run.sh`, last in `reg.sh`, `PERF=0` skips): t-idle-parity (offline, against `e341c1b`), t-idle-live, then `check.js`: first the machine-independent part – at idle the graph sleeps and the master, the strips and the insert chains are not busy, and the render visits no more nodes than `baseline.json` stored (+ 8) – then the current tree against `baseline.json`'s reference commit, measured alternately in the same session (this machine's load drifts; figures from another day prove little): a scenario fails when audio + conv rise above the reference by more than 10 % + 2 points of a core, or the main thread by 15 % + 3 points (the guard run against its own reference after a container restart: green, the widest gap +3.9 points of 36). The deterministic part catches a broken Ruhe whatever the machine's load. `sh run.sh baseline` re-measures and stores the current commit as the new reference (after a change that is meant to cost more – say so in the commit). `sh run.sh table <commit>…` measures any commits.
- **Chromium's rules this rests on** (measured, `scratchpad/perfx`): a node is skipped once its inputs are silent and its tail has passed; a cycle (the echo's ping-pong) is always busy; a worklet's output is never silent; an explicit mono downmix of a silent stereo input is not silent (the compressor's detector); a gain at 0 without automation outputs silence, one ramped there by `setTarget` outputs non-silent zeros; a node nothing references and nothing feeds is switched off by the GC (hold it); an oscillator nobody pulls stops its phase (the keeper pulls them through its gain param), and a param's automation holds where it stood while its node is not pulled; graph changes reach the render at a quantum's start under a try-lock (they may lag a quantum), a param's value does not (race-free against a worklet's port message).
- **Offline renders are not bit-reproducible** wherever three or more non-zero signals meet (at a node or an AudioParam): Chromium adds them in hash order, so the same build differs from itself by −67 … −140 dB. Exact comparisons need voices of one oscillator, `dly.wow` 0 and `dly.pp` 0; the presets are compared against the old build's own spread (before the switch / old↔old).
- **Pausing moves rounding** in two places, so they do not sleep by default: a convolver's block phase (blocks of up to 16384 frames: −99 dB after an arbitrary pause, 0 after whole blocks) and a delay whose time moves (its float read position depends on its write count: −57 … −64 dB).
- **Results** (`dev/tests/perf/perf.js`, medians of 3, builds alternating; % of one core of this machine – audio = the render threads, conv = the convolver's thread, main = the page's main thread):

| scenario | view | `4b6bfb2` (published) | `e341c1b` (before) | now |
|---|---|---|---|---|
| idle (default patch) | desktop | 15.3 / 6.0 / 24.4 | 21.5 / 6.0 / 23.6 | **18.5** / 6.0 / 23.9 |
| idle | Android | 14.6 / 5.7 / 34.5 | 20.0 / 6.0 / 33.6 | **14.8** / 5.7 / 33.8 |
| after (18 s after playing) | desktop | 16.0 / 6.1 / 24.8 | 21.6 / 5.9 / 23.9 | **18.8** / 6.0 / 24.0 |
| after | Android | 15.3 / 5.8 / 35.2 | 18.9 / 5.9 / 35.0 | **15.1** / 5.7 / 34.1 |
| play (a phrase) | desktop | 22.2 / 6.2 / 55.3 | 30.6 / 6.1 / 56.0 | 28.5 / 6.1 / 56.0 |
| play | Android | 21.8 / 6.0 / 89.6 | 25.4 / 5.8 / 88.9 | 25.3 / 5.9 / 88.9 |
| Tiefsee (Bordun sounds) | desktop | 18.6 / 8.7 / 32.2 | 26.1 / 8.6 / 32.1 | 26.5 / 8.3 / 32.8 |
| Tiefsee | Android | 19.3 / 8.1 / 45.0 | 23.4 / 10.0 / 45.1 | 22.8 / 8.1 / 42.9 |
| Regenwald (Puls) | desktop | 25.6 / 5.1 / 40.3 | 31.6 / 4.8 / 41.2 | 33.5 / 5.1 / 41.1 |
| Regenwald | Android | 23.9 / 4.7 / 61.4 | 28.6 / 4.7 / 59.9 | 26.6 / 4.6 / 59.7 |
| Kompostgarten (Puls) | desktop | 30.8 / 3.9 / 39.3 | 34.7 / 6.1 / 40.7 | 32.8 / 5.9 / 39.3 |
| Kompostgarten | Android | 28.3 / 5.8 / 61.1 | 30.3 / 6.0 / 61.5 | 28.0 / 5.7 / 60.9 |

  Figures are audio / conv / main. While sound plays the runs scatter by ±2–4 points; there the new build equals the one before within that (Ruhe does not apply; only the Hexenring's resting strip and the taps' rest save, ≈ 1 point). At idle the audio threads are back at the published build's level, except the device thread's hand-over to the worklet thread (3 points on the desktop, 1.3 in the Android emulation – any worklet costs it; the Hexenring's processor must record from the first note). The compositor and the GPU process are unchanged (≈ 5 and 28–31). With a 120-Hz display emulated (`--hz120`, Android, idle / play): main thread 46.3 → 35.9 and 97.5 → 89.7 (the old build managed 76 of 120 frames while playing, the new one draws its 60). The owner's options at idle (live, medians of 3; audio + conv): desktop 26.1 default → echo asleep 23.8, hall asleep 12.8, both 11.3; Android 20.9 → 19.6 / 8.3 / 7.0.

### Notes from the desktop report (24.10.2026, session `ccr-183ec81a-rkp3np`)
- The guard per device class, the underrun log (`ulog`), the realms' states and `nichtLeb` in „Leistung messen“: SPEC §10.5
  „As built (desktop report)“. Tests: `t-hx-guard` (13 rows: computer, computer with loops, iPad, phone) and `t-hx-tap` (one
  touch tap, one action – UI audit B1; `hxKeyClick`) in `run-all.sh`; `t-hx-dsoak` (the desktop soak, ≈ 6 min, not in
  `run-all.sh`: A live notes only against B 8 loops / 6 playing / 4 Lebendig, underruns, the worklet's gaps, CPU per thread,
  what coincides).
- This container cannot show 0 underruns: live notes alone already drop (headless output, 4 cores shared with other
  sessions' browsers); compare B against A of the same run. Chrome traces (`webaudio.audionode`) stall the render thread
  every 0.5 s while they flush – do not read their periodic 70–110 ms „peaks“ as the app's.
- Final checks (24.10.2026): v2 all green, `t-pwa-update` 37, `t-phone-mode` 51 (one earlier run lost 2 rows to the latency's
  automatic step back under load – green again alone), Hexenring all green except `t-hx-taps` „the loops sound“ (−30.7
  dBFS against −30 – exactly the same on the build before this session) and `t-hx-phone` 8's „the underruns fall“ ratio
  (fails the same on the build before; on this loaded machine). The perf guard 145 PASS, 1 FAIL: tiefsee/a audio 50.9 vs
  41.3 against `baseline.json`'s 7f226e7 – the build at 66e17bf (before this session) measures the same (37.5 vs 35.5 now,
  5 runs each): it came with Android's „Minimal“ default (50d653e, the smaller buffer), not from here. Re-baseline
  (`sh run.sh baseline`) once the owner accepts that cost.
- Open: Taumeln's resampler (`rd`, 32 taps per frame and Schicht) is 80 % of the ring processor's time – an exact speed-up
  would cut the loops' audio load most.

### Notes from the Taumeln step (24.10.2026, session on `claude/handoff-ideen-review-5ca6uj`)
- SPEC §10.5 „As built (Taumeln faster)“. The WebAssembly source is `dev/tools/wasm/rs.c`; `sh dev/tools/wasm/build.sh`
  (clang 18, wasm-ld – both in the container) regenerates `myzel/src/js/dsp/rs-wasm.js` (base64; decoded without atob –
  the AudioWorklet scope may lack it). Any change to `rd`'s or `ddJob`'s arithmetic must change rs.c alike; the proofs:
  `hexenring/t-hx-rsw.js` (in run-all) and the Node harnesses in the session's scratchpad (`rs/bench.js`, `rs/edge.js`
  old vs new reads with `Object.is`, `rs/whole.js` the processor with six loops – not in the repo; rebuild them from SPEC's
  description if needed). Live comparison: `node hexenring/live-tau.js <slotA> <slotB> [rounds]` (6 harvested loops, drift 8 ct, guard held
  back, /proc CPU of the render threads, builds alternating; not in run-all).
- Final checks (24./25.10.2026, after the cloned repo was unshallowed – `git fetch --unshallow`: the guard's parity base
  e341c1b and the Gestik references fae609a/4d6d233 need the history): Hexenring run-all – t-hx-rsw 4/4, t-hx-taumeln
  14/14, t-hx-bake 13/13 and the rest green except rows that fail alike on the build before (69af6f4, where this session
  started), each re-run alone and on it: t-hx-taps „the loops sound“ (known), t-hx-werk Gong's
  level-3 determinism −87.7 dB (same), t-hx-bew „device speeds up to 110 BPM“ (same), t-hx-guard 8 / old 7 rows (the
  container's own underruns), t-hx-wuchs „late blocks“, „an underrun while Wuchs works“ and a fatal row (same; its
  Lebendig rows scatter with the guard's hold – green on the second run), t-hx-form and t-hx-live green alone; t-hx-soak
  „the living loop rendered 4 passes“ (not compared – 10 min; the guard holding Lebendig, likely the same cause).
  reg.sh: v2 green but func's load rows (old build alike), mixfunc, mixui, MIDI, t-pwa-update 37 green; Gestik: t-gk-perm,
  t-gk-learn, t-gu-ui, t-gx-live fail identically on the old build (sensor permission in this Chromium); perf: the
  guard's check against the new reference green, t-idle-parity all green against e341c1b, t-phone-mode one phone row
  (frames under load – the phone is not pursued).
- Bit-exactness rules learned: the read position must run in the same doubles (pass the absolute p and a base offset –
  `p − base` then `+= r` rounds differently); no FMA; a skipped frame is −0 (adding −0 is the identity; a sum that starts
  at +0 is never −0, so ddJob writes `+ 0`).

### Owner's calls (open)
- **Handy und Schleifen (report A, 23.10.2026) – options that change the sound on a phone, not built:** (1) Wuchs on
  phones at level 1 (or „gespielt“) instead of 3 – a living pass renders 2–3× cheaper; (2) fewer realms on phones (1–2):
  living passes come late more often, the last pass repeats more; (3) under lasting overload, halt or mute a loop by
  itself (the quietest or the oldest) instead of only easing; (4) a shorter resampler for Taumeln on phones (fewer taps:
  a little aliasing at the top); (5) shorter Ausklang tails on phones; (6) the partial Ruhe for the live part while only
  loops sound (from the phone report). (7) let the old last step – `A.lite` and the live budget – act again when loops alone overload (it lightens
  the worklet sources and the drive for everything; `t-hx-phone` 8 at 30 % of a core eases as much without it: 1601 → 29
  fallbacks, 1543 → 760 in another run; the build before 1369 → 66 – this machine scatters). Built without asking: the halted-loop savings (exact), Lebendig's hold (the agreed
  first step), the guard never taking live voices for loops.
- **Ruhe – the hall and the echo at idle (performance pass, 20.10.2026):** they keep running while the rest of the graph sleeps, because a pause moves where their rounding falls (after a sleep the hall's tail differs by −103 dB, an echo with Leiern by −64 dB from one that never paused – inaudible, not bit-exact). Letting them sleep (`IDLE.hall`, `IDLE.echo`, no UI yet) would save at idle: the hall 13 points of a core (desktop 26 → 13 %, Android emulation 21 → 8 %), the echo 1–2 more. The owner chose (20.10.2026): the hall sleeps (`IDLE.hall = true`, the default; t-idle-parity's hall case bounds what moves, the exact cases keep it running to prove the rest), the echo runs on (`IDLE.echo` stays an option); the field stays at 60 frames.
- **The field at 60 frames (performance pass):** on 90/120-Hz displays the field now draws ≈ 60 times a second. Its motion is counted per frame (made at 60 Hz), so there it used to run up to twice as fast with shorter trails – now it moves as designed everywhere. A visible change (no sound change); if the owner preferred the faster field, the alternative is drawing every frame with the motion scaled by time (twice the drawing).
- Moder: default Nachklang 5 s (KONZEPT says „4–6 s Brummen“) – kept.
- Böe: default Nachklang 3 s (KONZEPT „vier bis sechs Sekunden“); library sentence 53 characters (SPEC's limit 52).
- Sehne: the knob is „Nachklang“ (a time) where KONZEPT says „Dämpfung“; Saite's library sentence is now „Gezupfte Saiten – leicht, viele Stimmen zugleich“; the E-Bow costs up to 0.94/1.84 units (jawari; final calibration) and is priced only while the hand is in its zone.
- Zapfen and Glut: their native stand-ins cost more than SPEC's estimate (≈ 1.2 and 1.0 units, final calibration) because they keep the full sound (the owner's rule); a lean version would sound clearly worse.
- Zapfen: the Rast-step row reads „within the tick train's own crest + 1 dB“ (a 14/s train alone has 6–7 dB crest).

### Still open
- **By ear:** every new source's „for the ear“ list in SPEC's As-built lines and the builders' reports – Gespinst's halo level, Rhizom's knock and Glimmen, Kehlchen's chips and roughness, Sehne's jawari bloom and E-Bow swell, Zapfen's saw/mode balance and Fels, Glut's swell speed and breathing, Moder's crackle, Böe's wind, Amöbe's unrest.
- Device checks on a real phone (level 1 budget with the new sources, worklet load time), the parity/soak suites after the owner's listening round.
- The claude.ai artifact is still stage 1 (see above).

### Other open items
- Backups: `BeidlAT/myzelbackup` (18.10.2026) and `BeidlAT/myzelbackup251026` (25.10.2026) – full copies of every branch. Never update one; a new step gets a new repository (the owner creates it, add it to the session, push `refs/remotes/origin/*:refs/heads/*`).
