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

## Für die nächste Sitzung zu tun (ohne weitere Rückfrage)
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
