# Gestik: das Handy als Teil des Instruments

Konzept für Myzels Bewegungssteuerung · Stand 12. Oktober 2026 · Code-Stand `myzel/index.html`, Commit 2bbfee9

Grundlage sind drei Recherchen (Vorbilder und Forschung, Sensor-Fakten im Browser, Andockpunkte im Code), vier Ideenrunden aus verschiedenen Blickwinkeln (Live-Musiker, Instrumentenerfinder, Einsteiger und Barrierefreiheit, skeptischer Audio-Ingenieur) und zwei unabhängige Bewertungen. Beide Bewertungen kamen zu fast derselben Rangfolge. Dieses Konzept fasst das zu **einem** Plan zusammen.

---

## Auf einen Blick

- **Gestik ist eine Ausdrucksschicht, kein zweites Instrument.** Finger, Tasten oder der Puls wählen die Töne. Die Bewegung des Handys **formt** sie, **lädt** sie mit Energie auf, **lenkt** einen Sporenregen und wird **mitgeschrieben**, damit du sie als Schleife zurückbekommst.
- **Der Kern** ist ein virtuelles Gerät „Gestik“ in der Gerätekarte, so wie dein microKEY. Es hat 5 Achsen und 3 Ereignisse, alles in „Zuweisen“ lernbar. Die Musik selbst schaltet es ein und aus („Die Musik ist die Kupplung“). Es schreibt **nie** in dein Patch.
- **Sechs Funktionen, in drei Phasen:**
  - Phase 1: **Anlehnen** (der Ton lehnt sich in die Neigung), **Ladung** (Schütteln lädt das Myzel auf), **Schlafen** (umdrehen = einfrieren)
  - Phase 2: **Fährte** (Bewegung wird immer mitgeschrieben und kann nachträglich zur Schleife werden)
  - Phase 3: **Sporenregen** (deine Töne werden Gelände, gekippte Sporen spielen sie im Raster ab), als Signatur
  - bedingt: **Funkstrecke** (Handy als Sensor für Myzel am PC)
- **Innovativ** ist nicht eine einzelne Geste, sondern die Kombination aus fünf Designzügen, die wir zusammen in keinem Instrument gefunden haben (Abschnitt 2).
- **Ehrlich gesagt:** Gestik ist vor allem eine Handy-Sache. Das iPad ist zu schwer für Handgelenk-Ausdruck, der Windows-PC hat keine Sensoren, und in der claude.ai-Ansicht ist Bewegung gesperrt. Deshalb funktioniert die Fährte mit **jedem** Regler, und wir testen früh die Funkstrecke per USB.
- **Vor dem ersten Feature-Code** steht ein Messtag auf deinem Android-Handy und deinem iPad. Die Latenz von Bewegung zu Klang (geschätzt 40–100 ms) ist bisher nur geraten.

---

## 1. Leitsätze: warum so und nicht anders

Die Recherche zeigt ein klares Muster:

- **Bewegung als Ausdruck auf Tönen, die anders gewählt wurden, wird benutzt:**
  - Ocarina (Neigen = Vibrato, laut Suchzusammenfassungen über 10 Mio. Nutzer)
  - ThumbJam
  - das G-Force-LFO des OP-1
  - Animoog
  - die Schwerkraft auf Kornwolken in Borderlands
  - der Neigefilter der Orba
  - Genki Wave
- **Bewegung, die Tonhöhe oder Timing frei in der Luft bestimmen soll, scheitert:**
  - Theremin-artige Handy-Synths
  - das „Gefuchtel“ in Wii Music
  - die Luft-Trommel Hit Sense Audio (schwankende Latenz)
  - Kinect, die frühe Leap Motion
  - die zehn sich überlappenden Gesten der Orba

Daraus folgen acht Leitsätze. Jede Funktion unten hält sich an alle acht.

1. **Bewegung wählt nie den Ton.** Tonhöhen kommen immer aus der Skala, über Finger, Tasten, Puls oder deine gespielten Töne.
2. **Bewegung löst nie frei getimte Schläge aus.** Was durch Bewegung erklingt, ist entweder stetig (Formen, Laden), wird vorausberechnet auf den Puls gerastert (Sporenregen) oder ist von Natur aus zufällig (Rassel). Der Browser liefert Bewegung mit nur 60 Hz und schwankendem Takt. Für Schläge in der Luft reicht das nicht (Forschung: unter 10 ms Latenz, unter 1 ms Schwankung).
3. **Die Musik ist die Kupplung.** Bewegung wirkt nur, wenn musikalisch etwas passiert. Ein Handy in der Tasche oder auf dem Tisch macht nie von selbst Klang.
4. **Bewegung verändert nie dein Patch.** Kein „Preset geändert“, kein Speichern, kein teures Neuberechnen von Hall oder Saiten, nur weil du das Handy geneigt hast.
5. **Eine Geste, eine Bedeutung.** Höchstens drei Gesten je Spielart. Schütteln bedeutet überall „Ladung“, Umdrehen überall „Schlafen“.
6. **Nur robuste Signale.** Wir nutzen die Neigung aus der Schwerkraft relativ zu einem Nullpunkt (driftfrei), Drehgeschwindigkeiten (driftfrei), Bewegungsenergie, Schwingungen und grobe Lagen. Wir nutzen keine Kompassrichtung, keine Euler-Winkel (instabil, wenn das Handy aufrecht gehalten wird) und kein Klopfen aufs Gehäuse.
7. **Alles hat einen Weg ohne Bewegung** (Touch oder Controller) und einen Aus-Schalter (Barrierefreiheit, WCAG 2.5.4).
8. **Alles ist aufnehmbar und speicherbar:** über „Aufnahme in Takten“, über die Fährte und in Szenen und Presets.

---

## 2. Wo Myzel wirklich neu sein kann

Keine der Einzelgesten ist für sich revolutionär. Neu ist, soweit unsere Recherche reicht, die Kombination dieser fünf Züge. Die Recherche beruht nur auf Suchzusammenfassungen, Volltexte waren nicht abrufbar.

1. **Die Musik ist die Kupplung.**
   - Der Nullpunkt entsteht beim ersten Anschlag, egal ob Finger oder Taste.
   - Loslassen führt alles sanft zurück.
   - Das Haltepedal hält den Ausdruck fest.
   - Es gibt keinen Kalibrier-Knopf und keine Drift zwischen den Phrasen.
   - Bisherige Lösungen (Genki Wave, Hot Hand, Neigen-zum-Scrollen) brauchen dafür eine eigene Taste.
2. **Deine Töne werden Gelände.**
   - Im Sporenregen hinterlassen die gespielten Töne leuchtende Keime.
   - Gekippte Sporen rollen darüber und spielen sie ab, also ein Arpeggiator, den du mit der Hand neigst.
   - Die Treffer werden im Voraus berechnet und landen latenzfrei im Raster.
   - Borderlands kennt Schwerkraft ohne Töne. Kollisions-Apps kennen Töne ohne Schwerkraft.
3. **Bewegung ist Energie, die nachwirkt.**
   - Schütteln und Schwenken laden das Myzel auf. Es leuchtet und entlädt sich über Takte.
   - Die Geste überdauert sich selbst. Deshalb spielen Latenz und 60 Hz keine Rolle.
   - Der Charakter der Geste bestimmt den Charakter des Klangs: rauschendes Schütteln wird zu Körnern und Regen, ein ruhiges Kreisen lässt Töne singen.
4. **Nichts geht verloren.**
   - Die Fährte schreibt jede Bewegung im Takt mit.
   - Ein Tipp macht aus den letzten Takten eine Schleife, ganz ohne vorher auf „Aufnahme“ zu drücken.
   - Die Schleife verblasst Durchgang für Durchgang wie ein Echo.
   - Sie spielt präziser ab, als sie gespielt wurde, weil Myzel sie vorausplanen kann.
5. **Ein Ton wandert vom Finger ans Handgelenk** (Tragen, optional). Hebst du den Finger, während das Handy geneigt ist, trägt die Neigung den Ton weiter, und der Finger ist frei für den nächsten.

Dazu kommt etwas, das keine generische Bewegungs-App hat: Alles erzählt sich in Myzels eigener Biologie. Sporen fallen, das Geflecht leuchtet, wenn es geladen ist, und schläft ein, wenn man es umdreht.

---

## 3. Der Kern: das Gerät „Gestik“

### 3.1 Was du siehst

Unter **Gerät** gibt es eine neue Kachel **„Gestik einschalten“**. Danach erscheint eine Gerätekarte **„Gestik · dieses Handy“** (oder „dieses iPad“) neben deinen KORG-Karten. Sie enthält:

- **Wasserwaage:** eine Spore in einem Ring. Ein innerer Kreis zeigt die Ruhezone, der äußere Kreis die Weite. Ein Doppeltipp setzt den Nullpunkt.
- **Lebenszeichen:** „60 Hz · ±3 ms“, oder klar „pausiert“ bzw. „gesperrt“.
- **„Neigen formt:“** als Chips: Aus · Anlehnen · Sporenregen (ab Phase 3) · Eigene
- **Schalter:** Ladung · Schlafen
- **Fährte-Knopf** (ab Phase 2)
- **Weite:** klein / mittel / groß (20° / 30° / 45°)
- **Haptik** an/aus (nur Android)
- **Zuweisen:** derselbe Weg wie bei deinen Keyboards. Zuweisen antippen, Handy bewegen, Regler antippen.

In der Kopfzeile sitzt ein kleines Sporen-Symbol. Es leuchtet, wenn Gestik wirkt, und schläft, wenn das Handy ruht.

### 3.2 Einschalten und Erlaubnis

- Die Kachel fragt die Erlaubnis **innerhalb des Tipps** an. Das muss auf dem iPad so sein, und seit Chrome 151 hat auch Android die Abfrage. Dort ist sie normalerweise ohne Nachfrage erlaubt.
- War Gestik schon einmal an, fragt Myzel beim nächsten Start im **Start-Tipp** erneut. iOS vergisst die Erlaubnis zwischen den Sitzungen womöglich; das prüfen wir am Messtag.
- Danach prüft Myzel 1,2 s lang, ob wirklich lebendige Werte kommen. Wenn nicht, gibt es eine klare deutsche Meldung:
  - „Kein Bewegungssensor gefunden“ (PC)
  - „In dieser Ansicht gesperrt – öffne Myzel als App: beidlat.github.io/4claude“ (claude.ai-Ansicht, genau wie beim Mikrofon)
  - „Zugriff abgelehnt – in den Safari-Einstellungen für diese Website erlauben“
  - „Bildschirm aus oder App im Hintergrund – Gestik pausiert“
- Der Bildschirm bleibt wach (Wake Lock gibt es schon). Auf Android bietet Myzel Vollbild mit Ausrichtungssperre an, damit Neigen die Oberfläche nicht dreht. Auf dem iPad gibt es einen Hinweis auf die System-Drehsperre.

### 3.3 Die Signale: 5 Achsen, 3 Ereignisse

Bewusst wenige, damit es nicht wie bei der Orba zur Gestenüberladung kommt.

| Achse | Was du tust | Wie gemessen | Warum robust |
|---|---|---|---|
| **Neigen ↔** | seitlich kippen | Schwerkraftrichtung relativ zum Nullpunkt, auf die Bildschirmachsen projiziert | driftfrei. Das Vorzeichen spielt keine Rolle, damit ist der vertauschte iOS-Beschleunigungswert erledigt. |
| **Neigen ↕** | Oberkante zu dir oder von dir weg | dito | dito |
| **Bebung** | schnelles Wackeln aus dem Handgelenk (ca. 3–9 Hz) | Drehgeschwindigkeit um dieselbe Achse, auf 2,5–10 Hz gefiltert, zu einem Winkel aufsummiert. Eine Rauschschwelle hält Ruhezittern fern. | Drehraten driften nicht |
| **Drehen** | um die Bildschirmachse drehen wie einen Knopf | aufsummierte Drehrate, federt in ca. 3 s zur Mitte zurück | keine absolute Richtung nötig |
| **Ladung** | Bewegungsenergie mit einstellbarem Nachklingen | Energie aus Drehung und Beschleunigung minus deinem Ruhe-Grundrauschen. Ein Lade-Speicher mit **Entladung** von 0,3 s (Rassel) bis 30 s (Kondensator). | unabhängig von der Haltung |

| Ereignis | Auslöser | Schutz vor Fehlauslösung |
|---|---|---|
| **Wenden** | Display nach unten (über 150° gegenüber dem Nullpunkt, länger als 300 ms) | Rückschaltung erst unter 60°. Berührungen werden ignoriert, solange das Handy auf dem Display liegt. |
| **Ruhe** | liegt mindestens 1,5 s still. Aufnehmen beendet Ruhe und setzt einen neuen Nullpunkt. | sehr enge Schwellen für Drehung und Beschleunigung |
| **Schütteln** | mindestens 3 kräftige Richtungswechsel in 600 ms, mit Stärke | Schwelle über deinem persönlichen Handhabungsrauschen |

Alle stetigen Werte laufen durch dieselbe Aufbereitung:

- Ruhezone 4°
- Vollausschlag nach Weite (Standard 30°), weiches Knie
- ein „1€-Filter“, der in Ruhe stark glättet und bei schneller Bewegung kaum verzögert

Ein „Schlag“-Ereignis (Handy als Schlägel) gibt es absichtlich nicht (siehe Abschnitt 5).

### 3.4 Die Kupplung: die Musik schaltet

Es gibt drei Kupplungsarten. Jede Spielart bringt ihren passenden Standard mit.

- **„Mit Tönen“ (Standard bei Anlehnen):**
  - Gestik wirkt, solange ein Ton klingt, egal ob Finger auf dem Feld, Taste am microKEY oder Haltepedal.
  - Der **Nullpunkt** ist deine Haltung 60–100 ms nach dem ersten Anschlag, nachdem vorher alles losgelassen war. So wird der Ruck des Antippens selbst nie zum Nullpunkt.
  - Lässt du alles los, gleiten alle Werte in 300 ms zurück.
  - **Festhalten:** Das Haltepedal (CC64) oder ein gelernter Pad friert die aktuellen Gestik-Werte ein. Du kannst die Hand senken und die Form bleibt.
- **„Immer“ (Standard bei Ladung und Sporenregen):** Der Nullpunkt wird beim Einschalten gesetzt oder per Doppeltipp auf die Wasserwaage. Ladung reagiert erst oberhalb der Handhabungsschwelle, Hochheben allein lädt also nichts.
- **„Taste“:** Gestik wirkt nur, solange ein gelernter Pad oder Knopf gehalten wird. Das ist für Leute, die es ganz explizit mögen.

Dazu kommen ein **globaler Gestik-Schalter** und ein lernbarer An/Aus-Pad.

### 3.5 Fingerhalt: die Falle, die keiner gesehen hat

Hältst du das Handy in der linken Hand und spielst mit der rechten, dreht sich beim Neigen das Glas unter deinem rechten Finger weg. Myzel würde das heute als Fingerbewegung lesen:

- die Tonhöhe gleitet,
- in der nächsten Spalte schlägt der Ton neu an,
- die Fingerhöhe überschreibt den Gestik-Wert.

Im Code ist das `moveTouch`, Zeile 5938. Deshalb gilt, solange Gestik auf einen Ton wirkt:

- Die **Spalte des Fingers ist gesperrt**, solange die Fingerbewegung klein bleibt. Ein bewusstes Gleiten über eine größere Strecke wirkt weiter.
- Die Fingerhöhe und der Gestik-Höhenversatz werden **zusammengerechnet**, statt sich zu überschreiben.
- Tonhöhenbiegungen laufen über einen eigenen Biege-Weg pro Finger und nicht über die normale Frequenzsetzung, die jede Fingerbewegung neu schreibt.

Wer das Gleiten unter dem Finger als Effekt will, kann Fingerhalt abschalten.

### 3.6 Die Mod-Schicht: Bewegung verändert nie das Patch

Das ist der größte Bauteil, und er lohnt sich doppelt. Heute schreibt fast jedes Ziel dauerhaft ins Patch, mit „Preset geändert“, Speichern nach 400 ms und teils teurer Neuberechnung. Gestik braucht stattdessen **Modulationsziele, die nur auslenken.**

| Ziel (deutsch) | Was es tut | Pro Klangmaschine |
|---|---|---|
| **Höhe** | verschiebt die Fingerhöhe aller gehaltenen Töne (Finger und Tasten) | Nebel: Cutoff · Körner: Scrub-Position · Hauch: Band · Obertöne: Teilton · Stimme: Vokal u-o-a-e-i · Schwarm: Chaos · Tiefe: Form · angeschlagene Klänge: Helligkeit beim Anschlag |
| **Filter**, **Phaser**, **Ring** | schiebt Filter-/Phaser-/Ringfrequenz | global, auch in Ketten-Kopien |
| **Panorama** | lenkt die Auto-Pan-Position | global |
| **Leiern** | Band-Leiern im Echo | global |
| **Körner-Dichte / -Streuung** | Multiplikator, pro Korn gelesen | Körner (kostet nichts im Audiograph) |
| **Tropfen-Regen** | Multiplikator für die Regentropfen | Tropfen |
| **Puls-Dichte / -Helligkeit** | Multiplikator auf die Wahrscheinlichkeit und Helligkeit der Spuren | Puls |
| **Ausdruck** | Lautstärke-Schwelle (gibt es schon) | Klang, Ebene 2 |
| **Tonhöhe pro Finger** (Phase 2) | Biegung und Bebung je Ton | alle |
| **A/B-Morph** (Phase 2) | Mixer-Morph ohne Patch-Schreiben | Mixer |

Diese Parameter sind **nie** Gestik-Ziele, weil sie teuer oder zerstörerisch sind:

- Hallgröße und Hall-Dämpfung
- Verzerrungskurve
- Stimmung und Skala
- Saiten-Vorberechnung
- Wahl der Klangmaschine und Oktave

**Nebeneffekt:** Dein Modulationsrad am microKEY kann dieselben Ziele nutzen. Damit verstellt endlich auch MIDI-Ausdruck kein Preset mehr.

### 3.7 Zuweisen und Lernen

- Gestik erscheint in „Zuweisen“ als **Quelle wie ein Keyboard**.
- Lernen nimmt die Achse mit der **größten bewussten Auslenkung**. Die Schwelle liegt höher als bei Rädern, damit das Grundzittern nicht gewinnt.
- Ereignisse verhalten sich wie Tasten. Die Modi „Auslösen“ und „Umschalten“ funktionieren also wie gewohnt, etwa Wenden auf Szene B.
- Die Zuordnungs-Ansicht bekommt zu „von/bis“, „Umkehren“ und „Übernahme“ noch Ruhezone, Glätte und Kurve.
- Gestik zählt **nicht** als MIDI-Port. Es gibt also keinen „verbunden“-Toast, keine Dauer-LED, keinen überfluteten Monitor und keine Zusatzsaiten.
- **Bonus fürs iPad:** Es bekommt erstmals einen Zuordnungen-Bildschirm. Der ist heute ohne Web MIDI und Web Bluetooth ganz ausgeblendet.

### 3.8 Kalibrierung: so gut wie keine

- **Pflicht:** nichts. Der Nullpunkt kommt aus der Musik oder vom Einschalten.
- **Weite:** ein Regler mit drei Stufen.
- **Klopf-Messung** (einmal pro Gerät, optional, braucht das Mikrofon):
  - Du legst das Handy auf den Tisch und klopfst 8-mal daneben.
  - Myzel vergleicht den Mikrofon-Einsatz mit dem Beschleunigungsausschlag.
  - Daraus wird aus „40–100 ms geschätzt“ eine gemessene Zahl für dein Gerät. Die Fährte rechnet damit die Verzögerung heraus.

### 3.9 Sicherheitsnetz

- **Wächter:** Kommen 250 ms lang keine Sensorwerte (Bildschirm aus, App gewechselt), gleitet alles sanft auf neutral. Beim Wiederkommen werden die Filter zurückgesetzt.
- **Ruhe:** Liegt das Handy still, pausiert die Live-Gestik. Fährte-Schleifen laufen weiter.
- **Berührungs-Sperre:** 100 ms nach jedem Tipp aufs Feld und während das Handy vibriert, sind Schütteln und Wenden blind. Der Vibrationsmotor stört die Sensoren.
- **Systemgesten:** Ein Hilfetext nennt die Fälle, die eine Web-App nicht abfangen kann: Motorola „zweimal hacken = Taschenlampe“ und iOS „Schütteln zum Widerrufen“.

---

## 4. Die Funktionen

### 4.1 Anlehnen · *Der Finger wählt den Ton, das Handgelenk formt ihn*

**Phase 1 (Grundform), Phase 2 (vollständig)**

**So spielt es sich**

- Das Handy liegt in der linken Hand. Die rechte spielt auf dem Feld oder am microKEY Air.
- Sobald ein Ton klingt, ist deine aktuelle Haltung der Nullpunkt.
- **Vor/zurück neigen** ändert die **Höhe** der gehaltenen Töne, also die Klangfarbe, die jede Maschine zur Signatur macht. Die Stimme spricht ihre Vokale, Nebel öffnet sich, Körner fahren durchs Material, die Obertöne steigen.
- **Seitlich neigen:**
  - In Phase 1 neigt sich der Klang in den Raum (Panorama, Echo-Anteil).
  - Ab Phase 2 kannst du wählen: **„Tonhöhe“** lehnt den neuesten Ton zur **nächsten Skalenstufe**. Ab 80 % des Wegs rastet er **magnetisch** ein, eine Biegung endet also nie zwischen zwei Tönen. Auf Android gibt es beim Einrasten einen feinen Vibrationstick.
- **Bebung** (Phase 2): Wackelst du schnell aus dem Handgelenk, entsteht ein Vibrato, dessen Tempo und Tiefe **deine Hand** bestimmt und kein LFO. Das ist die Bebung des Clavichords, auf einem Mini-Keyboard ohne Aftertouch. Als ruhigere Alternative gibt es Vibrato wie bei Ocarina: die Neigung bestimmt die Tiefe eines festen LFOs.
- **Mehrere Töne:** Der neueste Ton bekommt die volle Wirkung, ältere die halbe, oder wahlweise alle gleich. Der aktive Finger leuchtet sichtbar geneigt.
- **Festhalten:** Mit dem Haltepedal bleibt die Form stehen, auch wenn du die Hand senkst.
- **Tragen** (Phase 2, nur auf Wunsch):
  - Hebst du den Finger, während das Handy mehr als 12° geneigt ist, klingt der Ton weiter. Das Handgelenk trägt ihn jetzt, und sein Leuchten löst sich vom Finger.
  - Kehrst du in die Ruhezone zurück, wird er abgelegt.
  - Höchstens 2 getragene Töne. Automatisches Loslassen nach 20 s, und „Stille“ beendet sie immer.
- **Platzierung** (Phase 2): ein Chip „Hand / Unterarm“. Mit einer Armbinde am Unterarm wird Rollen des Unterarms zur Höhe, und die Hand bleibt frei auf den Tasten.

**Warum du es benutzen würdest**

- microKEY Air und nanoKEY Studio haben **keinen Aftertouch**. Ein Ton ist tot, sobald er angeschlagen ist. Anlehnen gibt ihm Leben, und zwar mit dem Körperteil, das ohnehin frei ist.
- Weil der Nullpunkt aus der Musik kommt, gibt es nie einen Kalibrierschritt. Kabel aufheben, verbeugen oder den Ständer richten verändert nichts, solange kein Ton klingt.
- Dieses Muster ist das am besten belegte überhaupt (Ocarina, ThumbJam). Wir machen es pro Ton, skalentreu und ohne Kalibrierung.

**Was daran neu ist:** Neigung pro Stimme auf einem polyphonen Feld, ein Nullpunkt pro Anschlag statt einer Kalibrierung, magnetische Biegung in die Skala mit spürbarer Rastung, Vibrato aus der Handbewegung selbst und die Übergabe eines Tons vom Finger ans Handgelenk.

**Technik in Kürze**

- Neigung und Bebung kommen aus **einer** Achse, die in zwei Frequenzbänder geteilt wird: unter 1,5 Hz wird gebogen, zwischen 2,5 und 10 Hz entsteht Vibrato.
- Die Höhe wirkt als Versatz über die Klangmaschinen-Funktion für die Fingerhöhe, auch innerhalb der Fingerbewegung (Fingerhalt).
- Die Tonhöhe läuft über einen Biege-Weg pro Finger, nach dem Muster der vorhandenen MIDI-Pitchbend-Busse. Körner liest diesen Wert schon heute.
- Für Töne von MPE-Controllern ist Anlehnen aus, sie bringen ihre eigene Biegung mit.

**Grenzen**

- Druck aufs Display kippt das Handy um 1–3°. Ruhezone und verzögerter Nullpunkt fangen das ab.
- Das iPad ist zu schwer für Bebung, dort gibt es nur Neigen.
- Lauter Bass aus dem Handy-Lautsprecher (Tiefe, Gong) könnte das Gyroskop anregen und Vibrato-Rückkopplung erzeugen. Das testen wir am Messtag, die Rauschschwelle hilft.
- 40–100 ms Verzögerung machen Biegungen etwas weich. Für stetigen Ausdruck ist das hörbar unkritisch.

---

### 4.2 Ladung · *Schütteln lädt das Myzel auf*

**Phase 1 (Schütteln), Phase 3 (Schwenken)**

**So spielt es sich**

- Ein bis drei Sekunden schütteln wie ein Ei-Shaker, und das Myzel **lädt sich auf**:
  - die Körner werden dichter und streuen weiter,
  - der Tropfen-Regen wird dichter,
  - der Puls wird voller und heller,
  - das Echo beginnt zu leiern,
  - das Geflecht glüht.
- Danach legst du das Handy weg, und die Ladung **entlädt sich** über die eingestellte Zeit (Regler „Entladung“):
  - kurz (0,3 s): eine echte Rassel, die nur klingt, solange du schüttelst,
  - lang (bis 30 s): ein Aufbau über viele Takte, während deine Hände längst wieder auf den Tasten sind.
- Ein Ring um das Gestik-Symbol füllt sich wie ein Tank.
- **Schwenken** (Phase 3, die Idee „Glasrand“): Lässt du das Handy in kleinen Kreisen kreisen wie ein Weinglas, lädt das **ruhig und kreisend**. Gehaltene Töne schwellen an und ihre Obertöne steigen, wie ein geriebener Glasrand oder eine Klangschale. Die Kreisgeschwindigkeit bestimmt das Schweben, die Richtung verstimmt leicht nach oben oder unten. Passt zu Schale, Obertöne, Glocke und dem Klangschalen-Ritual.
- **Rassel-Schläge** (optional): Jeder Schüttel-Höhepunkt spielt zusätzlich einen Tropfen, eine Membran oder eine Schale, gerastert auf 1/16 (oder 1/32 bzw. frei bei langsamen Tempi).
- **Für Einsteiger** gibt es als Preset-Rezept den „Tank“: Die Energie schaltet Puls-Spuren nacheinander dazu. Das ist ein Rezept auf deinem Arrangement, es ersetzt es nie.

**Warum du es benutzen würdest:** Anschwellen, Höhepunkt, Auflösen ist der häufigste Bogen in Ambient- und Experimental-Sets. Hier ist er eine Zwei-Sekunden-Geste, die jeder kennt, und die Hände sind danach frei. Man kann es kaum falsch machen: Nichts muss einen Schlag treffen, und die Entladung ist langsam und musikalisch. Wer zittert oder ungenau ist, kann es genauso gut.

**Was daran neu ist:**
- OP-1, Orba und Shoogle bilden Schütteln direkt ab: Es klingt nur, solange du schüttelst.
- Hier wird die Geschichte der Geste zu einer langsamen Hüllkurve, die sie überdauert.
- Rauschendes und kreisendes Laden speisen verschiedene Ziele.

**Technik in Kürze**

- Alle Ziele sind Multiplikatoren, die pro Takt-Tick ohnehin gelesen werden (Körner, Puls, Tropfen), dazu die Leier-Stärke und der Ausdruck. Das kostet praktisch nichts.
- Rassel-Schläge werden am Höhepunkt der Beschleunigung erkannt (nicht an der Umkehr) und auf die nächste Rasterstelle gelegt.
- Schwenken erkennt eine gleichmäßig rotierende Bewegung quer zur Schwerkraft. Hin-und-her-Schütteln zählt dabei nicht.

**Grenzen**

- Das Handy kann herunterfallen. Eine Handschlaufe ist zu empfehlen, die Standardschwelle ist niedrig, sanftes Schütteln reicht.
- Hängt ein USB-C-Audiokabel dran, ist Schütteln umständlich.
- Gehen und Tragen könnte laden. Dagegen helfen die Schwelle, Ruhe und der Schalter.

---

### 4.3 Schlafen · *Umdrehen, und Myzel schläft ein*

**Phase 1**

**So spielt es sich**

- Drehst du das Handy mit dem Display nach unten, ob in der Hand, auf dem Tisch oder auf dem Keyboard:
  - der Klang blendet über 2–4 s in einen **eingefrorenen Echo- und Hallschweif** über,
  - der Puls hört am Taktende auf,
  - das Geflecht schläft ein.
- Drehst du es zurück und nimmst es auf, **erwacht** es mit einer Sporen-Blüte.
- Was „Schlafen“ bedeutet, wählst du selbst: Freeze-Kadenz (Standard), harte Stille oder Szene B. Über Zuweisen geht auch alles andere.
- Liegt das Handy mit dem Display nach oben still da, **pausiert** die Gestik. Ein schlafendes Sporen-Symbol zeigt das an.

**Warum du es benutzen würdest:** Es ist die robusteste Geste, die ein Handy hat. Sie geht blind, im Dunkeln, mitten in der Phrase, mit dem Handrücken, und praktisch nie aus Versehen. Einfrieren und darüber spielen ist ein Kern-Move im Ambient, und heute ist es ein kleiner Knopf in der Kopfzeile. Außerdem ist es ein theatralischer Set-Schluss.

**Was daran neu ist:** Wenig, und das ist ehrlich so: „Umdrehen = stumm“ kennt Android von Anrufen. Neu ist nur die musikalische Kadenz mit dem Erwachen.

**Grenzen**

- Spielt Myzel über den Handy-Lautsprecher, dämpft das Umdrehen den Klang. Mit Kopfhörer, Kabel oder Funkstrecke ist das egal. Im Lautsprecherbetrieb schlägt Myzel Szene B vor.
- Ein feuchter Tisch kann Phantom-Berührungen erzeugen. Deshalb werden Berührungen ignoriert, solange das Handy auf dem Display liegt.
- Wer das Handy mitten im Set ablegt, um ans Keyboard zu greifen, kann Schlafen abschalten.

---

### 4.4 Fährte · *Bewegung wird nie vergessen*

**Phase 2**

**So spielt es sich**

- Myzel schreibt die Gestik-Achsen **immer** im Takt mit. Der Puls-Takt läuft dafür auch, wenn der Puls selbst aus ist.
- Gefällt dir, was du gerade gemacht hast, tippst du **„Fährte“** (oder einen gelernten Pad am nanoKEY). Die **letzten 1, 2 oder 4 Takte** werden zur Schleife, ohne dass du vorher etwas scharf schalten musstest.
- Hältst du den Knopf stattdessen gedrückt, nimmt Myzel ab dem nächsten Taktanfang neu auf.
- Danach legst du das Handy hin. Der Klang atmet mit deiner Bewegung weiter, beide Hände sind frei.
- **Verblassen:** Die Schleife wird pro Durchgang schwächer, zum Beispiel um den Faktor 0,85. Eine Geste stirbt so über 8–16 Takte aus wie ein Echo. Bei 1,0 läuft sie ewig.
- **Überspielen:** Erneut halten legt Neues darüber.
- **Löschen:** Doppeltipp.
- Live-Bewegung addiert sich obendrauf, du kannst also auf deiner eigenen Schleife reiten.
- Eine **Geister-Spore** in der Wasserwaage zeigt, was gerade läuft.
- Gespeichert wird mit Szene und Preset.
- Auf Wunsch wird das Hinlegen des Handys selbst zur Schleife. Das ist nicht der Standard, weil man das Handy oft nur ablegt, um ans Keyboard zu greifen.
- **Für jeden Regler:** Die Fährte nimmt nicht nur Gestik auf, sondern jede stetige Quelle: das X-Y-Pad und die Räder des nanoKEY Studio, die Fingerhöhe und Mixer-Fader.

**Warum du es benutzen würdest:**

- Auf dem Handy sind Hände die knappste Ressource. Zehn Sekunden Bewegung werden zu einer lebendigen Automationsspur, organischer als jeder LFO und trotzdem im Takt.
- Rückwirkendes Mitschneiden heißt, eine gute Geste geht nie verloren. Das ist Ableton „Capture“, angewandt auf Bewegung.
- Und weil die Fährte jeden Regler aufnimmt, nützt sie dir **auch am Windows-PC**, der keine Sensoren hat: dort nimmt sie das X-Y-Pad und die Räder deiner KORG-Keyboards auf.

**Was daran neu ist:**
- Wir haben keine Handy-App gefunden, die ihre eigene Bewegung als taktgebundene Schleife aufnimmt.
- Rückwirkend, verblassend wie ein Echo und beim Abspielen genauer als beim Spielen: Diese Kombination kennen wir aus keinem Automations-Looper.

**Technik in Kürze**

- Aufgezeichnet werden die aufbereiteten Achsen, nicht die Rohdaten. Sie werden über die Zeit auf Taktpositionen umgerechnet und um die **gemessene Verzögerung** (Klopf-Messung) nach vorn verschoben.
- Abgespielt wird im Vorlauf des Schedulers als Rampen auf den Modulationszielen, damit sample-genau und unabhängig von Hängern im Hauptthread.
- Weil die Schleife in Takten lebt, folgt sie Tempowechseln und externer MIDI-Clock.
- Der Speicherbedarf ist winzig.
- Teure Ziele sind gesperrt, wie überall in der Mod-Schicht.

**Grenzen:**
- Es muss immer sichtbar sein, was live ist und was Schleife („Fährte läuft“). Sonst wirkt der Klang verhext.
- Das Preset-Format bekommt eine neue Version.
- Ist die Verzögerung falsch gemessen, sitzt die Schleife leicht daneben. Dagegen hilft ein Feinregler von ±20 ms.

---

### 4.5 Sporenregen · *Deine Töne werden Gelände*

**Phase 3, die Signatur**

**So spielt es sich**

- Unter „Neigen formt:“ wählst du **Sporenregen**. Die Haltung beim Einschalten gilt als waagerecht.
- Jeder Ton, den du spielst, hinterlässt an seiner Stelle einen leuchtenden **Keim**: Finger auf dem Feld, Tasten am microKEY und auf Wunsch die Töne der Puls-Spuren.
  - Gehaltene Töne bleiben als Keim, solange sie klingen.
  - Gespielte Töne bleiben 2, 4 oder 8 Takte.
- Neigst du das Handy, rollen 8–16 Sporen bergab übers Feld. **Trifft eine Spore einen Keim, erklingt sein Ton**, mit einem Anschlagsklang deiner Wahl (Tropfen, Kalimba, Glocke, Schale, Membran). Das Ergebnis:
  - **nach rechts neigen:** die Sporen kaskadieren aufwärts durch deine Töne,
  - **nach links:** abwärts,
  - **zu dir:** sie fallen durch die Höhe, und der Klang wird heller oder dunkler,
  - **steiler:** schneller und dichter,
  - **zurück in die Waagerechte:** sie werden langsamer und bleiben in Mulden liegen, es wird still.
- **Halte einen Akkord am microKEY und neige das Handy: Der Akkord arpeggiert in die Richtung, in die du dich lehnst.**
- **Raster:** Treffer landen auf 1/8, 1/16, 1/8 triolisch oder frei. Gelandete Sporen **warten sichtbar gedimmt und ploppen genau auf dem Raster**. So siehst du die Quantisierung, statt dass sie versteckt passiert.
- Andere Gesten:
  - Schütteln (Ladung) streut neue Sporen ein,
  - Umdrehen (Schlafen) lässt alle Sporen versickern, während der Klang einfriert.
- **Lehnst du das Handy schräg an den Notenständer**, regnet es gleichmäßig weiter, während du mit beiden Händen spielst. Ein Stups ändert den Regen.
- **Mit der Fährte zusammen:** Nimm die Neigung als Schleife auf, und der Regen spielt sich selbst. Das ergibt einen generativen Sequencer, den dein Körper lenkt und der mit dem harmoniert, was deine Tasten spielen.
- **Ohne Sensor:** Ziehst du die Spore in der Wasserwaage, setzt du damit die Schwerkraft. So geht es auch am PC, in der claude.ai-Ansicht und in automatischen Tests.

**Warum du es benutzen würdest:**

- Neigen wird hier zum Komponieren statt zum Knopfdrehen. Drei bis fünf Töne spielen, dich anlehnen, und deine Phrase kommt als fließendes Arpeggio zurück, streng in der Skala und im Takt.
- Die Ungenauigkeit von Bewegung spielt keine Rolle, weil Physik, Skala und Raster jedes Ergebnis musikalisch machen.
- Im Stream sieht das Publikum Ursache und Wirkung: kippen, regnen, klingen.

**Was daran neu ist:**
- Borderlands kippt Kornwolken, aber nichts kollidiert und keine Töne klingen.
- Billard, Orbits und MotionTones sind Kollisions-Sequencer, aber per Touch gesteuert.
- Wir haben kein Instrument gefunden, das Neige-Schwerkraft, **eigene gerade gespielte Töne als Ziele**, vorausberechnete Treffer im Raster und Live-Spiel darüber verbindet.

**Technik in Kürze**

- Die Simulation läuft **im Takt-Scheduler** (alle 25 ms, mit feinen Zwischenschritten), nicht im Bildaufbau. Sie **sagt Treffer im Vorlauf voraus** und legt sie im Voraus auf die nächste Rasterstelle. Damit verschwindet die Sensorverzögerung ganz.
- Begrenzungen:
  - höchstens ein Treffer pro Keim und Rasterstelle,
  - etwa 12 Treffer pro Sekunde,
  - Rücksicht auf die Stimmenlast.
- Der Klang läuft über einen Puls-Spur-Kanal, also gelten Mixer, Pumpen, Sends und „Aufnahme in Takten“.
- Die vorhandenen Sporen der Visualisierung bekommen Schwerkraft statt Auftrieb, die Hyphen neigen sich mit, und jeder Treffer blüht kurz auf.
- **Kleinster Einstieg („Harfe“):** Zuerst klingen nur Spaltenübergänge, also Skalen-Glissandi. Danach kommen die Keime. Das ist billig zu bauen, aber auf Dauer gleichförmig.

**Grenzen**

- Der Spielzeug-Effekt (wie bei Electroplankton). Dagegen helfen wenige Sporen, die Regler „Zähigkeit“ und „Ordnung“, das Raster und dass Sporenregen immer eine bewusste Wahl ist, aufnehmbar und in Szenen speicherbar.
- Starkes Neigen dreht die Oberfläche. Daher Vollbild mit Ausrichtungssperre auf Android, Drehsperre auf dem iPad, und die Weite bleibt unter dem Drehwinkel des Systems (am Messtag bestimmt).
- Zeichenaufwand auf schwachen Handys. Wir verwenden die vorhandenen Sporen, statt neue Partikel einzuführen.
- Sporenregen und Anlehnen schließen sich aus, weil beide die Neigung nutzen. Ladung und Schlafen gehen mit beiden.

---

### 4.6 Funkstrecke · *Das Handy als Sensor für Myzel am PC*

**Bedingt: Test in Phase 0, Bau in Phase 2, falls der Test klappt**

**So spielt es sich**

- Das Handy hängt per USB-Kabel am Windows-PC. In Myzel auf dem Handy wählst du „Als Gestik-Sensor senden“. Das Display zeigt dunkel nur die Wasserwaage und bleibt wach.
- Auf dem PC erscheint ein Gerät **„Gestik (Handy)“** mit denselben Achsen und Ereignissen. Anlehnen, Ladung, Schlafen und Fährte funktionieren wie auf dem Handy, während der Klang aus deinem guten Audio-Interface kommt.
- Nebenbei wird das Handy so zu einem Bewegungs-Controller für jede DAW.

**Warum:**
- Du streamst vom PC, und der hat keine Sensoren. Ohne Funkstrecke lebt Gestik nur dort, wo das Handy auch Klangquelle ist.
- Per Kabel gibt es kein WLAN-Risiko, und das Handy lädt dabei.

**Technik:**
- Das Handy rechnet die Gesten selbst (Nullpunkt, Bebung, Ladung, Lagen) und schickt nur die fertigen Werte: Achsen als hochauflösende 14-Bit-Controller (NRPN), Ereignisse als Noten.
- Am PC gibt es ein Geräteprofil, das die Standardbelegungen sperrt.
- Damit landet alles im vorhandenen MIDI-Lernsystem.

**Ehrlich:**
- Ob Chrome auf Android im USB-MIDI-Modus des Handys einen Web-MIDI-Ausgang zum PC bekommt, ist **unbestätigt**. Das ist ein 5-Minuten-Test am Messtag.
- Klappt er nicht, wäre der Weg über WLAN (WebRTC) deutlich aufwändiger:
  - GitHub Pages bietet keinen Vermittlungsserver,
  - Veranstaltungs-WLANs trennen die Geräte voneinander,
  - das Koppeln per QR-Code ist umständlich.
  
  Den Weg über WLAN bauen wir nur bei echtem Bedarf.
- Für das iPad gilt das nicht: Safari hat kein Web MIDI.

---

### 4.7 Zusammenspiel: eine Geste, eine Bedeutung

| Geste | Anlehnen | Sporenregen | immer |
|---|---|---|---|
| Neigen vor/zurück | Höhe (Klangfarbe) | Sporen fallen durch die Höhe | – |
| Neigen seitlich | Raum, ab Phase 2 wahlweise Tonhöhe zur Nachbarstufe | Sporen rollen durch deine Töne | – |
| schnelles Wackeln | Bebung | – | – |
| Schütteln | – | streut Sporen ein | **Ladung** |
| Schwenken (Phase 3) | – | – | **Ladung, kreisend** (Töne singen) |
| Umdrehen | – | Sporen versickern | **Schlafen** |
| Stillliegen / Aufnehmen | – | – | **Ruhe** / Aufwachen mit neuem Nullpunkt |
| Drehen | frei zuweisbar | frei zuweisbar | – |
| Haltepedal | Festhalten | Regen einfrieren | – |

### 4.8 Wie sich ein Abend damit anfühlen könnte

Myzel läuft auf dem Handy. Der microKEY Air ist per Bluetooth verbunden, der Ton geht per USB-C oder Kopfhörer raus.

1. Preset **Tiefsee**. Du hältst mit rechts einen Akkord, das Handy liegt locker in der linken Hand. Neigst du die Oberkante weg, öffnet sich der Nebel. Ein Zittern aus dem Handgelenk lässt den obersten Ton beben. Lässt du los, gleitet alles in die Ruhe zurück.
2. Zwei Sekunden schütteln: Die Körner verdichten sich, das Geflecht glüht und entlädt sich über acht Takte, während du weiterspielst.
3. Das letzte Anlehnen war schön. Ein Tipp auf **Fährte**, und die letzten zwei Takte laufen als Schleife, jedes Mal etwas blasser.
4. Umschalten auf **Sporenregen**. Deine Akkordtöne werden Keime. Du lehnst das Handy an den Notenständer, und ein ruhiger Kalimba-Regen arpeggiert deinen Akkord auf 1/8. Mit beiden Händen spielst du darüber.
5. Zum Schluss drehst du das Handy um. Der Klang friert zu einem Schweif ein, der Puls endet am Taktende, und das Myzel schläft.

### 4.9 Gestik-Rezepte in den Presets (Phase 3)

Jedes Preset kann ein Gestik-Rezept mitbringen. Einsteiger müssen dann nichts einstellen, und Musiker ändern alles per Zuweisen.

| Preset | Rezept |
|---|---|
| Pilzregen | Ladung als „Tank“, Rassel-Schläge an |
| Tempelglocken / Kristallhöhle | Sporenregen mit Glocke bzw. Saite |
| Tiefsee | Anlehnen auf Nebel und Bordun |
| Sporenwolke | Neigen fährt durch die Körner |
| Maschinenträume | Ladung kurz (Rassel) plus Ring |
| Klangschalen-Ritual | Schwenken (Glasrand) |

Ob ein Rezept automatisch aktiv wird oder nur angeboten wird, ist eine offene Frage (Abschnitt 10).

---

## 5. Was wir bewusst weglassen, und warum

| Weggelassen | Warum |
|---|---|
| **Theremin-Modus** (Neigung wählt die Tonhöhe) | Ohne fühlbaren Bezugspunkt bleibt es Spielerei. Das ist der am besten belegte Fehlschlag. |
| **Luftschläge** (Handy als Schlägel, „Akzent-Schlag“) | 60 Hz Abtastung, ±8 ms Schwankung und geschätzt 40–100 ms Verzögerung: Schläge brauchen unter 10 ms. Hit Sense Audio und Wii Music sind genau daran gescheitert. Auch gerastert fühlt es sich bei Ambient-Tempi spät an. |
| **Klopfen aufs Gehäuse** | Ein 10-ms-Klopfer wird bei 60 Hz nur etwa jedes zweite Mal überhaupt gesehen. |
| **Kompass, Himmelsrichtungen** („Windrose“) | Die absolute Richtung driftet und wird drinnen von Lautsprechern und Laptops verfälscht. Die Sensor-Recherche rät ausdrücklich davon ab. |
| **Atem über die Brust** („Wiegen & Atmen“) | Das Signal ist geschätzt 1–3° pro Atemzug, ungemessen und unter jeder Spielbewegung begraben. Nur wenn die Messtag-Spur es klar zeigt. |
| **Viele Haltungen als Szenen** (N-Wege-Morph) | Die Schwerkraft gibt nur etwa 5 sicher trennbare Haltungen her, der heutige Morph schreibt ins Patch, und die Verwaltung ist auf dem Handy eng. Stattdessen kommt in Phase 2 das fast kostenlose **Neigen → A/B-Morph** über Zuweisen. Mehr nur bei Bedarf. |
| **Dirigieren mit laufendem Tempo** | Ein ständig nachgeführtes Tempo kämpft mit dem synchronen Echo, mit „Aufnahme in Takten“ und mit MIDI-Clock-Out, und Rubato auf einem euklidischen Raster klingt meist nach Eiern. Höchstens später ein „Schwung-Tap“: Tap-Taste halten und das Handy pendeln lassen. |
| **Anstoßen** (zwei Handys per Klirren synchronisieren) | Ein charmantes Ritual, aber du spielst meist allein. Es braucht das Mikrofon, und die Geräteverzögerungen verschieben das Ergebnis. Geparkt als Ensemble-Idee. |
| **Kamera** | Erlaubnisabfrage, Datenschutz-Anzeige, Akku, 50–100 ms Verzögerung, auf dem iPad keine feste Belichtung, in der claude.ai-Ansicht gesperrt. Höchstens später als langsamer „Kamera-Hauch“ für ein iPad auf dem Ständer. |
| **Tisch-Trommel, Resonanzboden** | Das sind Mikrofon-Funktionen, keine Bewegung. Die gute Idee darin (eine skalengestimmte Resonatorbank am Live-Mikro, ideal fürs iPad auf dem Tisch) wird ein **eigenes Projekt „Myzel hört mit“**. |
| **Gezeichnete Bahnen** („Myzelbahn“) | Großer Aufwand und ein eigener Modus, der mit dem normalen Spiel konkurriert. Die Keime liefern den musikalischen Kern schon. Später als Unter-Modus des Sporenregens möglich. |
| **Großer Knopf** (Barrierefrei-Modus: Neigen wählt grobe Zonen, ein Knopf spielt) | Wertvoll, aber er gehört mit Musik- oder Ergotherapeuten getestet. Kommt später als Profil auf dem fertigen Kern. |
| **Technische Abkürzungen** | Kein Generic-Sensor-API (nur Chromium, bringt nichts über 60 Hz). Keine Euler-Winkel. Keine Plattform-Erkennung am Browsernamen. `event.interval` ist plattformabhängig falsch, deshalb nur Zeitstempel. |
| **Immer-an ohne Kupplung als Standard** | Das ist das klassische „Midas-Problem“ von Sensoren: Alles, was du anfasst, verändert den Klang. |

---

## 6. Grenzen, ehrlich

- **iOS-Erlaubnis:** Sie muss innerhalb eines Tipps angefragt werden, deshalb nur über die Kachel oder den Start-Tipp. Möglicherweise fragt iOS in jeder Sitzung neu. Wird sie verweigert, verschwindet Gestik sauber, mit einem Hinweis auf die Safari-Einstellungen.
- **claude.ai-Ansicht:** Bewegungssensoren sind dort mit an Sicherheit grenzender Wahrscheinlichkeit gesperrt, wie das Mikrofon. Myzel erkennt das und zeigt den Link zur App. Was dort trotzdem geht: die Fährte für Touch- und Controller-Werte und der Sporenregen über die gezogene Wasserwaage.
- **Drift:** Neigung aus der Schwerkraft und Drehgeschwindigkeiten driften nicht. „Drehen“ federt bewusst zurück, statt sich endlos aufzusummieren. Absolute Richtung nutzen wir nicht.
- **Fehlauslösung:** Die Hauptverteidigung ist die Kupplung. Dazu kommen Ruhezone, Schwellen über dem persönlichen Grundrauschen, die Sperre nach Berührungen und beim Vibrieren, Ruhe beim Ablegen, Hysterese bei Wenden und der globale Schalter.
- **Verzögerung und Takt:** 60 Hz, abgefragt im Hauptthread. Die Verzögerung ist geschätzt, nicht gemessen. Deshalb beschränkt sich Gestik auf Formen, Laden und Lenken, und Treffer werden vorausberechnet.
- **Bildschirm muss an bleiben:** Bei ausgeschaltetem Display oder App im Hintergrund stoppen die Sensoren (so steht es in der Spezifikation). Der Wächter führt alles auf neutral, Wake Lock hält den Bildschirm wach. Das kostet Akku.
- **Automatisches Drehen:** Starkes seitliches Neigen dreht die Oberfläche. Auf Android gibt es eine Sperre nur im Vollbild, auf dem iPhone praktisch gar nicht, auf dem iPad über die System-Drehsperre.
- **Haptik:** Android ja. iOS hat im Browser gar keine Vibration, dort gibt es stattdessen ein sichtbares Pulsieren oder einen leisen Klick.
- **Lautsprecher und Vibrationsmotor stören die Sensoren.** Wir sperren die Erkennung während des Vibrierens und testen lauten Bass.
- **Systemgesten** von Motorola oder iOS kann eine Web-App nicht verhindern. Ein Hilfetext nennt sie.

---

## 7. Was auf deinen Geräten geht

| | Android-Handy | iPad | Windows-PC | claude.ai-Ansicht |
|---|---|---|---|---|
| Sensoren | ja, 60 Hz, meist ohne Nachfrage | ja, nach Tipp-Erlaubnis | in der Regel keine | gesperrt |
| Anlehnen | voll (mit Bebung) | nur Neigen, zu schwer für Bebung | nur über Funkstrecke | – |
| Ladung | ja | sanft | über Funkstrecke | – |
| Schlafen | ja | ja (auf dem Tisch umdrehen) | über Funkstrecke | – |
| Fährte | ja | ja (Gestik und Fingerhöhe) | **ja, mit deinen KORG-Reglern** | ja, für Touch-Werte |
| Sporenregen | ja | gut auf dem Schoß oder angelehnt | per gezogener Wasserwaage | per gezogener Wasserwaage |
| Haptik | ja | nein | – | – |

Hinweis zum iPad: Safari hat weder Web MIDI noch Web Bluetooth, deine KORG-Keyboards erreichen Myzel dort also nicht. Gerade deshalb ist Gestik auf dem iPad der erste „Controller“ überhaupt. Heute ist die Zuordnungs-Ansicht auf iPad und iPhone ganz ausgeblendet, der Kern ändert das.

---

## 8. Phasenplan

### Phase 0: Messtag (1 Tag, vor jedem Feature-Code)

Eine kleine Messseite (oder ein versteckter Messmodus in Myzel) auf deinem Android-Handy und deinem iPad misst:

- tatsächliche Rate und Schwankung, die Vorzeichen und den Winkel, ab dem das System die Oberfläche dreht,
- die **Klopf-Messung** (Verzögerung von Bewegung zu Klang je Gerät),
- wie stark ein Tipp aufs Display das Handy kippt,
- ob die Erlaubnis in der Homescreen-App auf dem iPad erhalten bleibt,
- ob lauter Bass (Tiefe, Gong) das Gyroskop anregt.

Außerdem:

- **Spuren aufnehmen:** jede Geste etwa 20-mal und dazu 10 Minuten normales Spielen, als Testmaterial.
- Optional eine Atem-Spur, um „Wiegen & Atmen“ endgültig zu entscheiden.
- Der **5-Minuten-Test Funkstrecke:** Handy im USB-MIDI-Modus, Chrome Web MIDI, sieht der PC einen Port?

**Ergebnis:** Zahlen statt Schätzungen. Sie legen die Schwellen fest und entscheiden über Funkstrecke und Bebung.

### Phase 1: „Erste spielbare Gestik“ (klein, aber schon nützlich)

- **Kern:**
  - die Sensor-Kette (Erlaubnis, Prüfung, Aufbereitung, 5 Achsen und 3 Ereignisse),
  - Kupplung „Mit Tönen“ und „Immer“, Festhalten,
  - **Fingerhalt**, Ruhe, Wächter, Sperren,
  - die Gerätekarte mit Wasserwaage,
  - Gestik als Quelle in Zuweisen.
- **Mod-Schicht** mit den ersten Zielen: Höhe, Filter, Panorama, Leiern, Körner-Dichte/-Streuung, Tropfen-Regen, Puls-Dichte, Ausdruck.
- **Anlehnen**, Grundform: vor/zurück = Höhe, seitlich = Raum.
- **Ladung** (Schütteln, Entladungs-Regler).
- **Schlafen** (Freeze-Kadenz, Ruhe-Pause).
- **Tests** (siehe Abschnitt 9).

**Aufwand:** mittel bis groß. Der Großteil ist die Mod-Schicht, und die zahlt sich für alles Spätere aus.

**Fertig, wenn:**
- ein Akkord am microKEY mit Anlehnen lebt,
- zwei Sekunden Schütteln das Myzel aufladen,
- Umdrehen einfriert,
- in 10 Minuten normalem Spiel nichts von selbst passiert,
- und dabei kein Preset als geändert markiert wird.

### Phase 2: „Ausdruck und Gedächtnis“

- **Anlehnen vollständig:**
  - Tonhöhe pro Finger mit magnetischer Biegung und Android-Rastung,
  - Bebung,
  - Platzierung Hand oder Unterarm,
  - Tragen (nur auf Wunsch).
- **Fährte**: rückwirkend, Verblassen, Überspielen, für jeden stetigen Regler, gespeichert in Szene und Preset.
- **Neigen → A/B-Morph** über einen Morph, der nicht ins Patch schreibt.
- **Funkstrecke per USB**, falls der Test in Phase 0 positiv war.

**Aufwand:** mittel + mittel + klein (+ klein).

### Phase 3: „Signatur“

- **Sporenregen:** erst die „Harfe“ als kleinster Einstieg, dann die Keime aus deinen Tönen. Vorausberechnete Treffer, sichtbares Raster, Ersatzbedienung über die Wasserwaage.
- **Schwenken** (Glasrand) als zweite, kreisende Quelle der Ladung.
- **Gestik-Rezepte** in den Presets, darunter ein Vorführ-Preset „Sporenregen + Fährte“.

**Aufwand:** mittel + mittel + klein.

### Später, nur bei Bedarf

- Haltungen mit bis zu 5 Posen
- Schwung-Tap
- Großer Knopf (mit Therapeuten)
- Myzelbahn
- Funkstrecke über WLAN
- Kamera-Hauch
- Anstoßen
- das Mikrofon-Projekt „Myzel hört mit“, getrennt von Gestik

---

## 9. Wie wir es testen

1. **Die Gestenerkennung ist eine reine Funktion**, also Eingabe rein, Achsen und Ereignisse raus. Sie wird ohne Browser getestet:
   - Eine vorzeichen-gespiegelte Kopie jeder Spur (iOS-Fall) muss identische Ergebnisse liefern.
   - Doppelte, fehlende oder gebündelte Messwerte (±8 ms) dürfen das Ergebnis um höchstens 2 % ändern.
   - 10 Minuten Spiel- und Geh-Spuren dürfen null falsche Wenden- oder Schüttel-Ereignisse erzeugen.
2. **Echte Spuren** von deinem Handy und iPad (Debug-Knopf „Spur aufnehmen“) bilden ein Regressionsarchiv mit Zielwerten für Treffer und Fehlalarme.
3. **Browser-Tests (Playwright)** mit einer nachgebauten Sensorquelle, die Spuren abspielt, mit gespielten Erlaubnis-Fällen (erlaubt, verweigert, ohne Tipp, Ansicht) und mit den virtuellen Sensoren von Chromium. Geprüft wird:
   - Streamende Bewegung erzeugt kein Patch-Schreiben, kein Speichern, keinen Toast und keinen MIDI-Port.
   - Lernen erwischt die gemeinte Achse.
   - Die Modulationswerte folgen der Eingabe.
4. **Dauerlast:** 10 Minuten mit 4 Fingern, Puls und Körner bei vierfach gedrosselter CPU. Die Sensorverarbeitung braucht unter 0,2 ms pro Wert, und es gibt keine neuen Aussetzer.
5. **Auf dem Gerät:** Drehwinkel, Verhalten mit dem Display nach unten, lauter Bass, Akku über eine Stunde.

---

## 10. Offene Fragen an dich

1. **Wie spielst du am häufigsten?** Mit dem Handy als Instrument, oder mit dem Handy als Begleiter zum microKEY oder nanoKEY, während Myzel auf dem PC läuft? Und wofür nimmst du das iPad? Davon hängt ab, wie wichtig die Funkstrecke ist.
2. **Welches Android-Handy** genau? Bei Motorola würden die Systemgesten „hacken“ und „drehen“ stören. Darf am Messtag der USB-MIDI-Test darauf laufen?
3. **Anlehnen seitlich:** Soll ab Phase 2 die Tonhöhe zur Nachbarstufe der Standard sein, oder bleibt Raum/Klangfarbe Standard und die Tonhöhe eine Wahl?
4. **Tragen:** Reizt dich das, oder lieber weglassen?
5. **Schlafen:** Freeze-Kadenz, harte Stille oder Szene B als Standard?
6. **Sporenregen:** Sollen auch die Töne der Puls-Spuren Keime säen, oder nur, was du selbst spielst? Und über welche Spur soll der Regen klingen?
7. **Rezepte:** Sollen Presets ihre Gestik automatisch einschalten oder nur anbieten?
8. **iPad:** Eher auf dem Ständer oder auf dem Schoß? Auf dem Schoß ist der Sporenregen dort sehr reizvoll.
9. **Namen:** Passen „Gestik“, „Anlehnen“, „Ladung“, „Schlafen“, „Fährte“, „Sporenregen“ und „Keime“?

---

## 11. Namen

Alle hier verwendeten Namen sind in `index.html` noch nicht belegt (geprüft).

| Name | Bedeutung | bewusst nicht |
|---|---|---|
| **Gestik** | Oberbegriff und Gerät | „Bewegung“ ist die LFO-Sektion (mov.*). „Lage“ bedeutet musikalisch auch Tonlage. |
| **Anlehnen**, **Bebung**, **Festhalten**, **Tragen** | Ausdrucksschicht | – |
| **Ladung** / **Entladung**, **Schütteln**, **Schwenken** | Energie | „Kreisen“ ist Auto-Pan, „Schweben“ ist Chorus |
| **Schlafen**, **Wenden**, **Ruhe** | Lagen | – |
| **Fährte**, **Verblassen** | Bewegungsschleifen | „Schleife“ heißen die Audio-Loops, „Ausklingen“ ist schon der Release-Parameter |
| **Sporenregen**, **Keime**, **Harfe** | Signatur | „Fruchtkörper“ ist die Mixer-Detailansicht, „Knoten“ steht in der Mixer-Hilfe |
| **Wasserwaage**, **Nullpunkt**, **Weite**, **Fingerhalt** | Kern | – |
| **Funkstrecke** | Handy → PC | – |

„Raster“ verwenden wir absichtlich mit derselben Bedeutung wie bei den Puls-Spuren.

---

## Anhang: technische Andockpunkte (Commit 2bbfee9)

Für die Umsetzung. Die Zeilennummern sind geprüft, verschieben sich aber mit jedem Commit.

- **Quelle:** `midiSource(key, name, 'motion')` (6014). Ereignisse gehen direkt in `midiTake` (6734), **nicht** über `midiIn`/`midiMsg` (6673/6692), denn `midiCC` (7667) und `mapStd` (7217) belegen viele CC-Nummern fest. Neuer Ereignistyp `axis` in KIND/KIND_T/mapClean/mapApply/ctlDesc/learnIn (7322)/kcEvText/kcWhat. Alternativ ein Profil mit `own:1`.
- **Nicht in `MIDI.ports`:** Das verhindert den Toast „verbunden“, die Zusatzsaiten in `warmKS`, `#midiDot`, die Statuszeile und den Lern-Knopf im Mixer. Die Geräte-LED und der Monitor `kcTap` müssen gedrosselt werden. `kcNone` (13868) muss künftig „kein MIDI, kein Bluetooth und keine Gestik“ bedeuten.
- **Zerstörerischer Pfad, den Gestik meidet:** `setParam` (8407) → `onParamChanged` (8431).
- **Höhe:** `v.setY` je Maschine, Schleife nach dem Muster von `midiRecolor` (7656), **und** innerhalb von `moveTouch` (5938), siehe Fingerhalt.
- **Tonhöhe pro Finger:** Bus-Objekt nach `busOf`/`busSet` (7739/7757), als `e.bend` an `onDown` (5909). `spawnGrain` (4793) liest `v.bend.cents` schon.
- **Audio-Modulationseingänge:** `c.flt.detune` (ca. 2810, auch in `makeChain`-Kopien), Phaser-Detune (ca. 2817), Auto-Pan (ca. 2830), Echo-Leiern über `delayTime` (ca. 2728), Ring-Oszillator (ca. 2688), Bordun `filt.detune` (ca. 4938), `exprSet` (6910).
- **Multiplikatoren pro Tick:** `grainTick` (5842), `spawnGrain` (4793), `seqTick` (5785).
- **Takt:** `beatAt`/`timeAt` (5754/5755), `barGrid` (5250), `laneHit` (6896), `hit` (4916), `stripIn` (2967), `noteEvent` (5210), `voiceLoad` (4848), `duckHit` (3176).
- **Morph:** `morphSet` (6924), `mxMorphApply` (10321). Braucht eine Variante, die nicht ins Patch schreibt.
- **Freeze:** `setFreeze` (8108).
- **Bild:** Sporen steigen (ca. 8210), Hyphen wandern (ca. 8233), `VIS.burst` (ca. 8129).
- **Oberfläche:** `kcBuild` (13924) für die Kachel (Erlaubnis im Tipp), `kcCard` (14130), `kcEdit` (14357), `start()` (14650) für die Erlaubnis im Start-Tipp, `keepAwake` (14584), Haptik wie `mxBuzz` (8670).
- **Mikrofon** (nur Klopf-Messung): Muster `micStart` (4724).
