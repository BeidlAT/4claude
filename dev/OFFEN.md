# Offen – die eine aktuelle Liste (Stand 30.10.2026, nach PR #115)

Zuerst lesen. Wird bei jedem Abschluss gepflegt: Erledigtes streichen (mit PR), Neues eintragen. Einzelheiten und
Begründungen stehen in `dev/STAND-2026-10-29.md` (Abschnitte „Danach (30.10.) …“) und den verlinkten Dokumenten.

## Wartet auf den Besitzer (er entscheidet / hört selbst)
1. **Hüllkurven:** welche Stufe bauen – Stufe 1 klassisches ADSR je Klangquelle, Stufe 2 zweite Hüllkurve (Helligkeit,
   Tonhöhe, Quell-Regler), Stufe 3 Frickler (zeichenbar, Schleifen, Zufall, Modulationsmatrix). Konzept:
   `dev/klang/huellkurven-recherche.md`. Wichtig: Firefox hat kein `cancelAndHoldAtTime` → Hüllkurven im Worklet.
2. **Ebenen – Fragen:** Mute wird gespeichert, Solo nicht – so gewollt? Tonbereich gilt nur beim Anschlag (gleitender
   Finger wechselt die Ebene nicht). Anschlagsbereich wirkt auf der Fläche nur über MIDI/„Anschlag“. Export einer
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
10. **Chrome-Aussetzer** (Bericht 29.10. 23:09, Latenz „min“): die Übergabe in Portionen (#110) und die Kappung vor der
    Kette (#114) sind behoben – nächsten Leistungsbericht des Besitzers aus Chrome abwarten und prüfen, ob noch etwas bleibt.
11. **Firefox: Werk-Rahmen liefert zeitweise keine Durchgänge** (alt, OFFEN-2026-10-27 Punkt 6) – Diagnose aus seinem
    Firefox (Gerät → Leistung messen → Kopieren: `werklog`, `hxstate`, `proc`).
12. **Bekannt rote Tests** (schon vor den Änderungen rot): t-hx-taps 16/17 (Pegelschwelle −30,6 dBFS gegen −30),
    midi-tests/t-ui 5, t-hx-raum und t-hx-allepresets (`M.HXR` fehlt), t-hx-kette 3, t-hx-livepatch 1 – Funktionen, die
    mit der Rücksetzung am 27.10. herausgingen; Tests an den heutigen Stand anpassen oder die Funktion klären.
    t-hx-wuchs schwankt in headless Chromium (Wächter senkt das Budget) – Test robuster machen.
13. **Sporenwerk – Ausbau** (`dev/klang/sporenwerk.md` → Offen): MIDI-Lernziele, Schnellknopf, Rezepte.
14. **Testvorlage:** `dev/tests/v2/mk.sh` exportiert jetzt alle Namen, die Tests als `M.<Name>` lesen (per `typeof`
    abgesichert). Testserver mit `setsid` starten; `sh dev/setup-tests.sh <scratch>` kopiert die Tests.

## Erledigt am 30.10. (zur Orientierung)
#109 Preset-Wechsel ohne Warten auf die Naht, Ladebalken, Tonart-Grundwert · #110 Übergabe in Portionen, „Takt sehen“ ·
#111/#112 Kompostgarten, Kalimba-Schnarren, Jahresring-Laub · #113 Kurzwellenritual, Puls-Spuren-Hinweis, Ebenen-Recherche ·
#114 Kappung vor der Effektkette, Harmonizer auf der Effekte-Seite · #115 8 Ebenen, Design, Bearbeiten-Fenster, globaler
Stopp, Interface-Keyboard, „Vorige Skala“, Ernte-Leiste, Sporenwerk-Fix. Aus `dev/OFFEN-2026-10-27.md` damit erledigt:
1, 2, 5, 7, 8 (iPad Hintergrund), 13; 3/4 (Handpan) vom Besitzer zurückgestellt; 9/10/11/12 von ihm als geklärt bestätigt.
