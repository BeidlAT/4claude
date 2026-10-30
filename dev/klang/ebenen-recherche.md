# Mehr Ebenen pro Klang und Routing nach Profi-Vorbild – Recherche und Vorschlag (30.10.2026)

Besitzer, 30.10.2026: „ob nicht mehr Ebenen pro Klang Sinn machen würden (Sound, Richness, Performance) … am iPad Pro ist
die Auslastung nie größer als 20 % … dann kann der User selbst Presets noch nach seinen Vorstellungen zusammenstellen. Man
kann theoretisch 10 Ebenen im Klang haben mit unterschiedlichsten Sounds. Und jede Klangquelle lässt sich individuell
routen (mit FX, ohne FX). Und dann gibt es noch erweiterte Routings, nach professionellem Vorbild. Recherchiere gerne,
was möglich ist und für Myzel Sinn machen würde.“

**Noch nichts gebaut** – das hier ist die Grundlage für die Entscheidung mit dem Besitzer.

## Was Myzel heute hat

- Ein Klang = **Hauptquelle** (`v.eng`) + **eine zweite Ebene** (`v.layer`, mit Pegel `v.layerLvl` und Intervall
  `v.layerInt`) – beide auf jedem Finger, gemeinsame Höhe/Anschlag.
- Daneben, unabhängig vom Spielen: 4 **Puls-Spuren** (je eigene Quelle, Rhythmus), **Bordun**, **Gespinst**, **Regen**
  (Gestik), **Hexenring** (Schleifen).
- **Mixer** mit einem Kanalzug je Gruppe (`STRIPS`: Klang, Ebene 2, Regen, Hexenring, Spur 1–4, Bordun, Gespinst; Rückwege
  Echo, Hall, Effekt, Effekt 2). Pro Kanal: Fader, Pan, Lo/Hi-Cut, Transienten-Former, Einschub (`x…ins`), Sends auf vier
  Rückwege, Route `dir` (an der Effektkette vorbei) oder Kette.
- Globale serielle Kette (Verzerrung → Ring → Filter → Phaser → Schweben → Kreisen), Echo und Hall parallel, Summen-
  Begrenzer.

Myzel hat also schon fast das „dreistufige“ Profi-Routing (Insert je Kanal – gemeinsame Kette – Send-Busse). Was fehlt,
ist **die Zahl der Ebenen auf dem Finger** und dass jede Ebene **ihren eigenen Kanalzug** bekommt.

## Wie Profi-Instrumente es machen (Kurzfassung, Quellen unten)

| | Ebenen | Mischen / Routing | Umschalten / Überblenden |
|---|---|---|---|
| Ableton Instrument Rack | beliebig viele „Chains“ | jede Chain eigene Effekte, Rack-Ausgang gemeinsam | Key-, Velocity-, Chain-Select-Zonen mit Fade-Rändern; Makros; Makro-Snapshots |
| Bitwig Instrument/FX Layer | beliebig | eigener Mixer je Layer; FX Layer parallel | Selector: manuell, Round-Robin, Zufall, Keyswitch, CC |
| Logic Track Stack | Sub-Spuren | Inserts je Sub-Spur, Summe auf Bus, Sends | MainStage: Key-/Velocity-Bereich je Strip |
| Omnisphere | 4 Layer | FX-Rack je Layer + Aux + Common, 4 Aux-Sends | Quadzone-Raster (Splits/Crossfade), Orb-Morph, 6 Makros |
| Pigments 5 / Serum 2 / Vital | 2–3 Engines/Oszillatoren | Insert-Busse A/B seriell oder parallel, Send-Bus; Serum: Oszillator auf eigenen FX-Bus; Vital: nur eine Kette | Makros, Modulation |
| Digitakt II / Octatrack | Spuren | Insert je Spur, 3 gemeinsame Sends | Octatrack: Szenen-Crossfader |
| Waldorf Quantum MK2 | 2 Timbres | eigene FX-Kette je Timbre | Layer/Split |

**Muster:** Instrumente mit festem Aufbau bleiben bei **2–4 Ebenen**; nur Hosts erlauben „beliebig viele“. Routing ist fast
überall Insert je Ebene → gemeinsame Kette → 2–4 Send-Busse. Umgeschaltet wird über Zonen (Tastatur, Anschlag), einen
Wähler mit Überblend-Zonen oder ein Makro-/Morph-Ziel.

**Bedienung am Touch-Gerät:** Ebenen als Liste von Kanalzügen (Name, Quelle, Pegel, Mute/Solo, Ziel-Abzeichen), Tippen
öffnet den Editor (wie AUM); Zonen als Balken mit Ziehgriffen; wenige gut benannte Makros; Vorlagen statt leerem Raster;
ein Morph-Feld (2D) für vier Ebenen.

**Web Audio:** Kosten ≈ Stimmen × Ebenen (+ Effekte je Ebene, unabhängig von der Polyphonie). Viele AudioParams je
Worklet-Knoten kosten spürbar (ein Entwickler halbierte die Renderzeit, als er sie von 544 auf 96 senkte) – Ebenen-
Parameter besser per Nachricht. Stimmenklau muss alle Ebenen einer Note zusammen nehmen. Eine dokumentierte Obergrenze
für Worklets oder Speicher in iOS/WebKit wurde **nicht** gefunden. `renderCapacity` ist nicht in Chrome/Firefox
verfügbar – Myzel misst weiter selbst (VCOST, Leistung messen).

## Vorschlag für Myzel (in Stufen, jede für sich nützlich)

**Stufe 1 – bis zu 8 Ebenen auf dem Finger** (statt nur `v.layer`)
- Je Ebene: Quelle, Pegel, Pan, Intervall/Oktave, Feinstimmung, Höhen-Bereich (Teil der Fläche/Tastatur) und
  Anschlags-Bereich mit weichen Rändern, Mute/Solo.
- Je Ebene ein eigener Kanalzug im Mixer – damit gibt es sofort Route Kette/direkt, Einschub, Sends auf alle vier
  Rückwege, Transienten-Former: was heute „Ebene 2“ kann, kann jede Ebene.
- Die heutige zweite Ebene wird Ebene 2 – alle Presets klingen gleich.
- Obergrenze 8: mehr als jedes Instrument mit festem Aufbau, bei 20 % iPad-Last wahrscheinlich tragbar – **erst messen**
  (Stimmen × Ebenen; ehrlich in VCOST), dann ggf. 10. Nach der Projektregel entscheidet die Messung, nicht Sparsamkeit.

**Stufe 2 – eigene Klänge bauen und teilen**
- „Ebene speichern“ als Baustein, Vorlagen („Teilung Bass/Fläche“, „Anschlags-Stapel“, „vier Ecken zum Überblenden“).
- Eigene Presets nehmen alle Ebenen mit.

**Stufe 3 – Ausdruck**
- 4–8 Makros je Klang mit mehreren Zielen, dazu Schnappschüsse.
- Ein Wähler (0–100 %) mit Überblend-Zonen je Ebene, auf Makro, MIDI-CC, Touché oder Gestik legbar; optional ein
  Morph-Feld für vier Ebenen. Wähler und Zonen als **Pegel**, nie als Noten-Sperre (sonst verstummen Ebenen wie beim
  Ableton-Chain-Selector).

**Fallstricke:** gleich gestimmte Ebenen löschen sich teilweise aus (Pegelausgleich/Hinweis); Stimmenklau über alle
Ebenen einer Note; Denormal-Schutz in jeder neuen Rückkopplung; Mute/Solo ändern das gespeicherte Preset nicht; Tests nur
in Chromium – Firefox und iPad prüft der Besitzer.

## Offene Fragen an den Besitzer
1. Stufe 1 bauen – mit 8 Ebenen als Start?
2. Sollen die Puls-Spuren dabei bleiben, wie sie sind (eigene Rhythmen), oder sollen auch sie Ebenen eines Klangs werden?
3. Höhen-/Anschlags-Bereiche je Ebene von Anfang an, oder zuerst nur Stapel (alle Ebenen auf jedem Ton)?

## Quellen
- Ableton Chain Selector: https://help.ableton.com/hc/en-us/articles/360000727359-Using-the-chain-selector-in-a-Rack ·
  https://www.soundonsound.com/techniques/creative-crossfading-ableton-live ·
  https://www.musictech.net/tutorials/master-macro-variations-in-ableton-live-exciting-arrangement/
- Bitwig Container (nur aus Suchauszügen): https://bitwig.com/userguide/latest/container
- Logic/MainStage: https://help.apple.com/logicpro/mac/10.1/en.lproj/lgcp9bc4b63d.html ·
  https://www.soundonsound.com/techniques/well-stacked · https://help.apple.com/mainstage/mac/3.1/en.lproj/mstg00d8b689.html
- Kontakt (Gruppenzahl nicht bestätigt): https://www.adsrsounds.com/kontakt-tutorials/the-power-of-cycle-random-in-ni-kontakt/
- Omnisphere: https://support.spectrasonics.net/manual/Omnisphere2/fx_page/page00.html ·
  https://www.kvraudio.com/omnisphere-3-boldly-going-everywhere
- Vital/Serum/Pigments: https://forum.vital.audio/t/routing-specific-oscillators-to-specific-effects/10464 ·
  https://xferrecords.com/web-manual/serum-2/routing-an-oscillator-or-filter · https://www.arturia.com/store/software-instruments/pigments
- Phase Plant (nur Suchauszüge): https://kilohearts.com/docs/phase_plant
- Elektron/Waldorf: https://www.soundonsound.com/node/4932624 · https://kraftmusic.com/products/waldorf-quantum-mk2-16-voice-hybrid-synthesizer
- AUM (Touch-Mixer): https://musicradar.com/reviews/tech/kymatica-aum-636178 · Makro-Gestaltung: https://ask.audio/articles/7-tips-for-designing-racks-in-ableton-live
- Web Audio: https://cprimozic.net/blog/webaudio-audioworklet-optimization/ ·
  https://lists.w3.org/Archives/Public/public-audio-comgp/2023Jul/0002.html · https://bugs.webkit.org/show_bug.cgi?id=251091
