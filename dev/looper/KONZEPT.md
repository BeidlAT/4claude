# Hexenring – der Looper für Myzel: das Konzept

Stand 2026-10-18, zweite Fassung, mit den Entscheidungen des Besitzers (§12). Für den Besitzer.

**Grundlage:**
- vier Recherchen (`research/`): die Fährte mit neun Nachstellungen, die Bausteine im Code, rund 40 Looper und Spielpraktiken, intelligente Mitspieler und was davon offline auf einem Handy läuft;
- fünf unabhängige Entwürfe (`ideas/`): Live-Musiker, Komponist, Erfinder, Ingenieur, Gestalter;
- drei gegnerische Prüfungen der ersten Fassung (`ideas/check-*.md`) mit eigenen Messungen;
- vier Hörproben (`hoerproben/`).

**Kennzeichnung:**
- **(G)** gemessen, auf dem Test-Server (noch nicht auf deinen Geräten);
- **(C)** im Code oder in einer Quelle belegt;
- **(A)** Annahme oder Entwurfsentscheidung.

---

## 0. Auf einer Seite

**Hexenring ist ein Looper, bei dem du nie vorher etwas drücken musst.**

Myzel schreibt immer mit, intern und ohne Mikrofon: den Klang und die Noten. Gefällt dir, was du gerade gespielt hast, tippst du auf den Korb. Du spielst den Durchgang zu Ende, und an der Naht übernimmt die Schleife, im Takt und ohne Lücke. Du musst keinen Einsatz treffen, nicht einzählen und keine Taktzahl vorher festlegen.

**Jede Schleife hält drei Dinge fest:**
- **den Abdruck:** den Klang deiner Klangquellen, wie du ihn gehört hast, mit der Effektkette und dem einmaligen Verhalten der physikalischen Modelle. Echo und Hall klingen live dazu, im selben Raum wie dein Spiel.
- **die Noten:** was du gespielt hast, mit Höhe, Anschlag und dem Zufall jeder Stimme;
- **die Bewegung:** Gestik und Regler, das, was heute die Fährte aufzeichnet.

**Solange sich nichts ändern soll, spielt die Schleife ihren Abdruck.** Soll sie der Tonart folgen, dem Tempo, einem anderen Klang, oder soll sie lebendig werden, dann **wächst** sie aus ihren Noten neu. Myzel spielt sie dafür im Hintergrund vor, in der besten Qualitätsstufe, ohne deinem Live-Spiel Stimmen wegzunehmen.

Ehrlich gesagt: Dieser Wechsel ist hörbar. Es sind dieselben Noten in einer neuen Darbietung, so wie ein Musiker seine Stimme noch einmal spielt. Wie nah das klingt, entscheidest du mit den Ohren (§3.4).

**Wo die KI steckt.** Die KI im Hexenring arbeitet mit deinen Noten, nicht mit fremdem Klang.
- Sie findet den Takt in frei Gespieltem und merkt, wenn du dich wiederholst.
- Sie baut aus vier Versuchen die Fassung, die du gemeint hast.
- Sie lernt deinen Groove und, wenn du willst, über Wochen deine Handschrift.

So weit du sie lässt, spielt sie mit: Sie variiert, macht Platz, antwortet und bringt zurück, was du vor zehn Minuten gespielt hast. Was sie vorhat, siehst du **einen Takt vorher** auf dem Spielfeld; ✓ behält es, ✕ lehnt es ab.

Den Klang machen immer Myzels eigene Klangquellen, in bester Qualität. KI, die selbst Klang erzeugt, läuft 2026 nicht offline auf einem Handy (C), und sie klänge nach etwas anderem als nach Myzel. Das wäre gegen deine Klangregel.

**Was es so noch nicht gibt** (Belege in Anhang C):
1. Ernten statt Einzählen, und jeder Durchgang über einer Schleife ist ein Angebot, das du nachträglich als Schicht behalten kannst;
2. Schleifen, die aus physikalischen Modellen neu wachsen, im Hintergrund vorgespielt;
3. den glücklichen Zufall eines Durchgangs behalten (den „Wurf“) und eine Schleife so züchten;
4. eine Schleife aus dem Konsens deiner Wiederholungen („Auslese“);
5. Schleifen, die Myzels eigene Klangkörper speisen: das Saitennetz, die Lawinen, den Regen;
6. die Pläne der Maschine im Spielfeld, an der Tonhöhe, wo sie klingen werden.

**Was zuerst kommt.** Etappe 1 bringt einen verlässlichen Looper:
- mit Ernten und dem Angebot jedes Durchgangs;
- mit Nähten, die einem Gong gerecht werden;
- mit Abschnitten für ein ganzes Stück und mit Pedalen;
- und mit einer Schleife, die das Saitennetz von Gespinst zum Klingen bringt.

Das Lebendige kommt mit Etappe 2. Der Hexenring richtet sich an leistungsstarke Geräte (ein aktuelles iPad Pro, Desktop-PCs).

**Hörproben** (`hoerproben/`, je etwa 30–40 s; was du wann hörst, steht in `LIESMICH.md`):
- `1-boe-treu-dann-lebendig.m4a` und `2-rhizom-treu-dann-lebendig.m4a`: zweimal derselbe Wurf (identisch), dann vier neue Würfe. Bei der Böe ist der Unterschied fein, beim Rhizom deutlich.
- `3-harz-stufe1-dann-stufe3.m4a` und `4-gong-stufe1-dann-stufe3.m4a`: dieselbe Phrase in Stufe 1, dann in Stufe 3.

**Deine Entscheidungen** stehen in §12. Die fünf wichtigsten:
- die Reihenfolge der Etappen;
- wie eine neue Schleife beginnt;
- in welcher Qualitätsstufe Schleifen klingen;
- was reine Klang-Schleifen bei einem Tempowechsel tun;
- wie Schleifen mit dem Taumeln umgehen.

---

## 1. Warum die Fährte nicht reicht

Die Fährte tut technisch, wofür sie gebaut wurde: Sie wiederholt **Bewegung** (Gestik, Regler, Fingerhöhe), keine Noten und keinen Klang. Alle 137 ihrer Prüfungen sind grün (C). Als Looper wirkt sie trotzdem kaputt (C, nachgestellt in `research/faehrte.md`):

- **Deine Noten kommen nicht wieder.** Nach einer Melodie meldet sie „hat sich nichts bewegt“. Mit 2 px Fingerzittern meldet sie „läuft als Schleife“, obwohl nichts Hörbares wiederkommt.
- **Ihr Takt ist unsichtbar.** Ohne Puls zählt sie eigene Takte, die nirgends angezeigt werden. Eine Geste über den Taktstrich wird zerschnitten, und an der Naht springt bei jedem Durchgang der Filter um anderthalb Oktaven.
- **Das gerade Gespielte fehlt.** „Die letzten Takte“ heißt bei ihr: die abgeschlossenen vor dem letzten Taktstrich. Ein schneller zweiter Tipp zum Nachbessern gilt als Doppeltipp und löscht.
- **Sie verblasst von selbst:** nach 23 s auf die Hälfte, nach knapp zwei Minuten ist sie weg.
- **Der Knopf ist oft unsichtbar:** auf dem Handy ohne Gestik, am PC ohne MIDI, auf dem iPad.
- **Hängt die Seite** länger als 0,4 s, friert die Schleife ein und springt danach.
- **Stille und Presets** halten sie nicht an.

**Was taugt und bleibt:** ihr Taktgeber, der nie springt; die Verzögerungskorrektur; das Vorausplanen im Scheduler; das Speicherformat; die Idee, immer mitzuschreiben. Der Knopf geht. Ihre Aufzeichnung lebt als **Bewegung** in jeder Schleife weiter.

---

## 2. So spielt es sich

### 2.1 Die Ringleiste

Auf dem Spielfeld ist jede Berührung ein Ton, und die Leiste oben ist bei 360 px voll (C, gemessen am Bildschirm). Der Hexenring bekommt deshalb eine eigene **Ringleiste**: 56 px hoch, direkt unter dem Spielfeld, im Daumenbereich. Öffnet sich ein Panel, bleibt sie am Feld. Eine Skizze steht in `ideas/designer-phone.svg`.

Von links nach rechts:
- **Korb** (Ernten). Seine Beschriftung zeigt immer, was ein Tipp jetzt nehmen würde: „2 T · 91“, „ab Takt 9“, „frei · 26 s“.
- **Hauptknopf**: ein Ring mit Punkt. Rot ist er nur, solange er aufnimmt; so ist er nicht mit dem REC-Knopf oben zu verwechseln.
- **Schleifen**: Jede ist ein kleiner Ring aus ihren Noten. Die Noten sind Sporen (der Abstand zur Mitte ist die Tonhöhe), ein Spielkopf kreist, außen stehen Taktstriche. Auf dem Handy passen vier Schleifen auf eine Seite, auf iPad und PC alle acht. Ein Hinweis wie „+3 spielen“ zeigt Schleifen auf der anderen Seite.
- **↶** (Zurück).
- **Form-Knopf** für die Abschnitte (§4.2).

**Am oberen Rand liegt die Taktlinie**, das erste sichtbare Metrum in Myzel; bisher zeigt der Spielbildschirm keinen Schlag (C). Ohne Tempo ist sie gepunktet („frei“).

**Unter jedem Ring steht ein Wort**, was ein Tipp jetzt tut: „aufnehmen“, „schließen“, „stumm“, „an“. Versteckte Modi waren der Hauptgrund, warum die Fährte unzuverlässig wirkte.

Zusammengeklappt ist die Leiste 24 px hoch (Taktlinie und Punkte); Korb und Hauptknopf bleiben auch dann sichtbar. Im Querformat steht sie unter dem Feld in dessen Spalte. Die Tiefe liegt im Aufnahme-Panel, in einem neuen Abschnitt „Hexenring“: die Karten der Schleifen, die Abschnitte, der Verlauf.

### 2.2 Eine Grammatik für alles

**Drei Regeln:**
- **Kein Doppeltipp auf dem Bildschirm.**
- **Nichts wird verzögert.** Korb, Hauptknopf und Ringe wirken beim Aufsetzen des Fingers, gemessen in der Zeit, die du gehört hast.
- **Löschen geht nur** über beschriftete Knöpfe, und es ist immer rückgängig zu machen.

| Was | Tippen | Ziehen | Halten |
|---|---|---|---|
| **Korb** | **Ernten** (§2.3) | – | – |
| **„→ 1 · → 2 …“** (Chips nach jeder Ernte) | Diese Ernte wird eine **Schicht** der Schleife 1, 2 … | – | – |
| **Hauptknopf** | Aufnahme starten (am Taktstrich, beim ersten Ton oder sofort; einstellbar); nochmal tippen schließt sie | – | ab 0,5 s: nimmt auf, solange du hältst; Loslassen schließt, mit Raster auf Takte gerundet |
| **Schleife, leer** | in sie aufnehmen | – | ihre Karte |
| **Schleife, spielt oder stumm** | stumm oder wieder an, am Taktstrich; ein Tipp bis ⅛ Takt *nach* dem Strich gilt für diesen Strich; ein zweiter Tipp bricht ab | senkrecht: Pegel | ab 0,5 s: ihre Karte |
| **Schleife, nimmt auf** | schließen | – | – |
| **↶** | bricht zuerst deine eigene wartende Aktion ab, sonst nimmt es den letzten Schritt zurück; daneben erscheint 8 s lang ↷ | – | ab 1,5 s: **alle leeren** (rückgängig zu machen) |
| **Form-Knopf** | nächste Lichtung, an der nächsten Eins | – | Zeile mit Lichtungen, „merken“, Kern, Lücke, Schluss |
| **✓ ✕** (nur solange die Maschine etwas vorhat) | behalten oder ablehnen, pro Schleife | – | – |

**Die Karte** einer Schleife enthält:
- Schichten, mit Pegel und Stumm für jede;
- Länge, Phase, Verdoppeln;
- Klang, Folgen, Eigensinn, Verwandeln;
- Löschen, Export.

**Ziel und Fokus.**
- Das **Ziel** (gestrichelt, „+“) ist der leere Platz für die nächste neue Schleife. Es rückt von selbst weiter.
- Der **Fokus** (eine helle Klammer) ist die spielende Schleife, die Schichten bekommt: die neueste, die zuletzt beschichtete, oder die in der Karte gewählte.

**Zwei Modi des Hauptknopfs**, einmal im Panel gewählt und am Knopf sichtbar:
- **neue Schleife** (Standard): Jede Aufnahme wird eine neue Schleife. Sie schließt sich nach der Grundlänge von selbst, also ein Tipp pro Schleife. Während du auf den Einsatz wartest, wählst du ×1, ×2 oder ×4.
- **dieselbe Schleife**: wie bei einer Loop-Station. Der Knopf überspielt den Fokus, bis du tippst; auf Wunsch nur eine Runde lang. Der Korb erntet dann ebenfalls in den Fokus.

### 2.3 Ernten: was der Korb nimmt

| Lage | Was der Korb nimmt | Wann die Schleife einsetzt |
|---|---|---|
| Takt läuft, Tipp bis ⅛ Takt (höchstens 250 ms) nach einem Taktstrich | 1, 2, 4 oder 8 Takte bis zu diesem Taktstrich | sofort, im Takt |
| Takt läuft, Tipp später im Takt | dieselbe Länge bis zum *nächsten* Taktstrich; du spielst den Takt zu Ende | an diesem Taktstrich; der Korb zeigt „ab Takt 9“, ↶ bricht ab |
| kein Takt, Wiederholung erkannt | der letzte ganze Durchgang | an der Naht, wenn die laufende Wiederholung zu Ende ist |
| kein Takt, keine Wiederholung | vom ersten Ton nach mindestens 1 s Stille bis zum Tipp | sofort, von ihrem Anfang; der Tipp ist die Naht |
| du hast vor dem Tipp schon aufgehört | wie in der Zeile darüber | von ihrem Anfang, beim Tipp (mit Takt: an der nächsten Eins), nie mitten in der Phrase |
| im Humus liegt nichts | nichts; ein Hinweis | – |

**Wie lang:** Die Länge wählt der Hexenring nach Phrasengrenze, Wiederholung und danach, dass kein Ton zerschnitten wird. Für die Bühne gibt es „wie Schleife 1“ oder „fest N Takte“. Mit Takt bleibt die Ernte immer im Raster, auch bei Flächen. Ohne Takt wird sie **frei**, wenn der Puls klar zu schwach ist (rubato, Flächen): Sie dreht sich dann in ihrer eigenen Zeit.

**Die erste Schleife setzt den Takt.** Puls und MIDI-Clock-Ausgang folgen ihr genau, auch mit Nachkommastellen im Tempo. Danach liegen die Korrekturen acht Sekunden lang *in* der Ringleiste, an der Stelle der Ringe, also nie über spielbaren Tönen:

`Tempo ½ · ×2 │ Länge −1 · +1 │ Eins ← → │ 3er │ Runde davor`

Oktavfehler beim Tempo werden vorkommen. Eine Korrektur kostet einen Tipp und schneidet neu aus dem Humus, ohne dass die Musik stoppt. Danach bleibt die Leiste in der Karte erreichbar.

**Die Ernte bleibt immer der echte, zuletzt gespielte Durchgang**, als Abdruck. Die Auslese aus mehreren Versuchen ist ein Angebot daneben (§5.1).

**Wann der Korb aufleuchtet:** wenn du ein Motiv wiederholst, das noch in keiner Schleife liegt. Dann zeigt er „2 T · 91“.

### 2.4 Jeder Durchgang ist ein Angebot

Das ist die Idee des Live-Musikers, und sie verändert das Überspielen grundlegend:

- Du **spielst frei über die Schleifen**. Nichts ist scharf geschaltet.
- **War ein Durchgang gut**, tippst du den Korb und dann „→ 1“, oder du trittst das Pedal B (§8). Genau dieser Durchgang wird eine Schicht der Schleife 1, schon im Takt, weil du ihn gegen die Schleife gespielt hast. Im Modus „dieselbe Schleife“ genügt der Korb allein.
- **War er schlecht**, passiert nichts. Ein verdorbenes Überspielen gibt es nicht mehr.
- **Welcher Durchgang zählt:** Entscheidest du dich im letzten Viertel eines Durchgangs, gilt dieser, sobald er zu Ende ist; bis dahin wartet die Aktion, und ↶ bricht sie ab. Sonst gilt der Durchgang, der gerade fertig wurde.
- **Klassisches Überspielen** bleibt: über den Hauptknopf im Modus „dieselbe Schleife“, über die Karte oder ein Pedal. Weiche 10-ms-Blenden an beiden Enden. Überspielst du über mehrere Durchgänge, wird jeder Durchgang eine eigene Schicht; sie bleiben als Gruppe zusammen und lassen sich einzeln abziehen.
- Jede Schicht bleibt einzeln erhalten, mit eigenem Pegel. **Rückgängig wirkt sofort**, nicht erst am Ende der Schleife: Ein falscher Ton, der sich endlos wiederholt, ist das Schlimmste auf einer Bühne.

### 2.5 Stumm, angehalten, leer

Eine Schleife kann auf zwei Arten schweigen:
- **stumm:** Ihr Spielkopf läuft weiter, und sie kommt im Takt wieder, an der Stelle, an der sie gerade ist. So wirken Stummschalten, Lichtungen, Kern und Lücke.
- **angehalten:** Sie kommt von ihrem Anfang wieder, auf der nächsten Eins. Mehrere Schleifen treffen sich dann neu. So wirken Stille, Schluss und Schlafen.

Nach **Stille** sagt ein Hinweis: „4 Schleifen angehalten · Weiter · Leeren“. Korb und leere Ringe nehmen weiter auf.

**Löschen:**
- eine Schleife über ihre Karte; sie fällt in den Humus und lässt sich bis zum Ende der Sitzung zurückholen;
- alle durch langes Halten auf ↶.

Sind alle Schleifen weg, gibt der Taktgeber das Tempo frei; ein Chip „Tempo behalten · 91“ hält es. Ein zweites Lied in einem anderen Tempo braucht so kein Neuladen.

### 2.6 Nähte, die einem Gong gerecht werden

Myzels Klangquellen klingen lang nach: ein Moder schwillt an, eine Böe hängt nach, ein Gong singt weiter. Die Naht muss das aushalten:

- **Ausklang:** Was über das Ende der Schleife hinausklingt, kommt aus dem Humus und wird ab dem zweiten Durchgang an den Anfang gelegt.
  - Spielst du gleich weiter, kann der Humus den Ausklang nicht von deinem neuen Spiel trennen. Dann ergänzt Myzel den verklingenden Teil aus den Noten, hinter einer kurzen Blende, oder blendet ihn sauber aus (A).
- **Auftakt:** Was vor der Eins gespielt wurde, kommt ans Ende der Schleife, wo ein Auftakt musikalisch hingehört. Das geschieht nur, wenn dort nicht schon ein eigener Auftakt liegt; sonst bietet ein Chip es an.
- **Wo geschnitten wird:** Die musikalische Eins bleibt auf dem Taktstrich. Der Schnitt fällt dort, wo es leise ist und beide Seiten zusammenpassen, nie in einen Anschlag hinein. Die Anschläge kennt Myzel aus den Noten und, für Klangquellen mit inneren Anschlägen (Rhizom, Körner, Schwarm, Knistern), aus dem Klang selbst. Verschoben wird der Schnitt nur innerhalb erkannter Wiederholungen, sonst würde ein anderer Durchgang hineingetauscht.
- **Wie gefügt wird:** mit einer weichen Überblendung von 10–40 ms. Gemessen (G): An der Naht ist es danach nicht lauter als in der Mitte des Durchgangs. Dieselbe Blende gilt für jedes Stummschalten, Rückgängig, Überspielen und jeden Wechsel der Wiedergabe.
- **Stoppen schneidet keinen Ausklang ab.** Der gespeicherte Ausklang spielt nach dem letzten Durchgang zu Ende. Die Ausnahme ist **Stille**: Sie leert auch Echo und Hall, wie heute (C).

### 2.7 Takt und Tempo

- **Ein Taktgeber, der nie springt.** Er entsteht aus dem der Fährte. Neue Tempoabschnitte beginnen in der Zukunft und übernehmen den alten Schlag; nur die Steigung ändert sich.
  - Gemessen (G, am Looper-Prototyp): eine Stunde mit Tempowechsel und Schwanken, 631 Durchgänge. Jeder begann innerhalb eines halben Samples am Taktstrich.
  - Ein einfacher Zähler lag nach 20 Minuten schon 1,2 ms daneben.
- **Der Puls folgt dem Taktgeber.** Startet er, während Schleifen laufen, reiht er sich in ihr Raster ein. Heute verschiebt sich die Fährte dabei um bis zu einen halben Takt (C). Dafür wird die Uhr des Puls umgebaut. Der Tempo-Schieber zeigt das genaue Tempo gerundet an.
- **Externe MIDI-Clock:** Das andere Gerät bestimmt das Raster.
  - Schwankt seine Clock, führt der Abdruck die Geschwindigkeit nach (§12).
  - Kommen Start oder Songposition von außen, setzen die Schleifen an ihrer nächsten Naht neu auf, mit Blende und Hinweis.
- **Tempowechsel mitten im Durchgang:** Eine Schleife mit Noten wechselt an der Stelle des Wechsels in den Wuchs. Für reine Klang-Schleifen gilt deine Entscheidung (§12).
- **Längen:**
  - ½ bis ×8 der Grundlänge, auch ×3, ×5 oder ×7 für Polymetrik; diese Schleifen liegen samplegenau fest;
  - **frei**, in ihrer eigenen Zeit gegen die anderen (Eno);
  - **versetzt:** eine Kopie, die langsam aus der Phase wandert (Reichs *Piano Phase*).
- **Spielverzögerung:** Zwischen Antippen und Klang vergehen auf einem Handy oft 70–150 ms (C). Ein kurzer Klopftest misst das einmal pro Gerät, wie die Klopf-Messung der Gestik. Schleifen gegen den Puls sitzen dann dort, wo du spielen wolltest. Für den Klang selbst braucht es keine Korrektur: Der Hexenring spielt wieder, was gerendert wurde, an derselben Stelle der Uhr (C).
- **Einzählen:** sichtbar, als Vibration oder hörbar. **Klick:** aus, auf den Zählzeiten oder nur beim Einzählen. Der Klick landet nie in einer Schleife.

---

## 3. Abdruck und Wuchs

### 3.1 Was eine Schleife festhält

| Teil | Inhalt | Speicher |
|---|---|---|
| **Abdruck** | Klang in Stereo, mit Rändern für die Naht und dem Ausklang | 384 KB pro Sekunde, 32 Bit (C) |
| **Noten** | jeder Ton: Zeit, Klangquelle, Tonstufe, Oktave, Höhe *über die Zeit*, Anschlag, Biegung, Loslassen, Kanal, die Startwerte seines Zufalls; auch Puls, Regen, Rassel und Wirbel, wenn sie mit aufgenommen werden | 30–60 Byte pro Ton |
| **Bewegung** | Gestik, gelernte Regler, Fader, als feste Werte | rund 600 Byte pro Bahn und Takt |

### 3.2 Woher der Klang kommt

**Der Humus** hält:
- die letzten 64 s in zwei Klang-Ringen:
  - **„Gespielt“:** die Kanäle, die du spielst (Feld, Ebene 2, Regen, Gespinst), so wie du sie gehört hast, also nach Fader, Stumm und Solo. Puls und Bordun sind nicht dabei; „Bordun mit“ und „Puls mit“ sind je ein Tipp.
  - **„Alles“:** die Summe vor dem Master. Damit lässt sich eine ganze Mischung zu einer Schicht machen.
- dazu zwei Minuten Noten und Bewegung.

**Regeln:**
- Noten und Klang einer Schleife stammen immer aus denselben Kanälen. Sonst verdoppelte sich etwa der Puls, wenn die Schleife neu wächst.
- Alles, was eine Schleife selbst erzeugt, klingt auf einem Weg, den der Humus nicht hört. Darum koppelt nichts zurück, und eine Schicht über einer Schleife nimmt nie die Schleife selbst auf.
- Ernten nimmt aus „Gespielt“; „Alles“ ist eine Wahl in der Karte.
- „Mikro“ (Stimme, Pfeifen, ein Instrument) kommt in einer späteren Etappe, mit gemessener Verzögerung und Warnung bei Bluetooth.

### 3.3 Der Abdruck: was du gehört hast

**Das Problem:** Myzels Effektkette (Verzerrung, Ring, Filter mit LFO, Phaser, Chorus, Kreisen) sitzt auf der Summe (C). Spielte eine Schleife trocken durch diese Kette, änderte jeder Dreh am Filter auch die laufenden Schleifen. Auch ein Presetwechsel für einen neuen Solo-Klang würde sie verändern. Und der LFO stünde jeden Durchgang anders.

**Die Lösung:** Beim Ernten läuft der Abdruck einmal durch eine Kopie der Kette, mit genau den Einstellungen und LFO-Phasen, die beim Spielen galten. Die Kette ist dann **eingebrannt**.
- Deine Live-Kette bleibt deine. Regler und Presets berühren laufende Schleifen nicht.
- Echo und Hall bleiben live, im selben Raum wie dein Spiel, und ihre Fahnen laufen natürlich über jede Naht.
- Eine Filterfahrt, die du beim Spielen gemacht hast, kommt eingebrannt mit wieder.
- Das Einbrennen kostet live nichts: Es geschieht einmal, im Hintergrund, bis zur ersten Naht (A).

**Ehrliche Grenzen:**
- **Verzerrung und Ring** sind auf der Summe nichtlinear. Einzeln eingebrannt klingen sie minimal anders als zusammen mit deinem Live-Spiel.
- **Die Sende-Pegel** zu Echo und Hall gelten für die ganze Schleife. Hattest du die Kanäle sehr verschieden in den Hall geschickt, ist das ein Mittelweg.

Wer will, stellt eine Schleife auf **„folgt der Effektkette“**. Sie läuft dann trocken durch die Live-Kette und bewegt sich mit deinem Filter, als bewusste Spielweise.

**Das Taumeln:** Taumeln ist das langsame gemeinsame Wandern der Tonhöhe, standardmäßig ±6 Cent (C). Ein Abdruck bringt das Taumeln seiner Aufnahmezeit mit. Gegen das Taumeln von jetzt kann er bis zu 12 Cent danebenliegen, bei Presets mit 14 Cent bis zu 28 Cent; ein gehaltenes A schwebt dann etwa dreimal pro Sekunde. Das ist eine Stimmungsfrage und deine Entscheidung (§12, Frage 5).

### 3.4 Der Wuchs: aus den Noten neu gespielt

Soll eine Schleife folgen oder lebendig werden, spielen Myzels Klangquellen ihre Noten neu. Das geschieht im Hintergrund, etwa eine Sekunde vor dem Hören.

**Wie (A):**
- Die Klangquellen sind heute für einen einzigen Live-Kontext gebaut. Ein Versuch, sie daneben in einem zweiten Kontext zu bauen, hat Live-Stimmen gestohlen, das Gespinst-Netz zerstört und Rhizoms Lawinen verbraucht (G).
- Der Wuchs bekommt deshalb einen **Werk-Rahmen**: eine unsichtbare zweite Kopie der Klangmaschine in derselben Seite, mit eigenem Speicher. Sie rendert offline und schickt die Blöcke an den Looper.
- Maßstab ist der Rechner, auf dem gebaut und getestet wird; die Zielgeräte sind ein aktuelles iPad Pro und Desktop-PCs.

**Was es kostet:**
- Der Wuchs kostet keine Stimmen deines Live-Budgets, wohl aber Rechenzeit des Geräts.
- Auf dem Test-Server rendert ein Durchgang in 0,16- bis 0,32-facher Echtzeit, je nach Klangquelle (G, für eine Phrase von 22 Noten).
- Ein Handy ist vielleicht zwei- bis viermal langsamer, auf einem kleinen Kern mehr (A).

**Damit das Live-Spiel immer Vorrang hat:**
- **Treu wird nur einmal gespielt.** Eine Schleife ohne Eigensinn klingt jeden Durchgang gleich. Sie wird nach jeder Änderung einmal neu gespielt und dann wie ein Abdruck wiederholt. Nur lebendige Schleifen brauchen jeden Durchgang neue Rechenzeit.
- **Gerät am Limit:** Kommt es an seine Grenze, hält zuerst der Wuchs an, nie dein Live-Budget. Heute würde ein Aussetzer das Live-Budget dauerhaft senken (C); das wird geändert.
- **Hängt die Seite**, überbrückt der Vorlauf von gut einer Sekunde. Der Werk-Rahmen selbst steht so lange (G).
- **Schafft ein Gerät eine Schleife nicht rechtzeitig**, gilt deine Entscheidung (§12, Frage 6).
- **Rückgängig bleibt sofort.** Jede Schicht hat ihren eigenen Strom, oder der Abdruck der Schicht überbrückt, bis der neue Durchgang fertig ist.

**Wie nah klingt der Wuchs am Original?** Das ist die ehrliche Kernfrage.

- **Wuchs gegen Wuchs, gleiche Startwerte:** gleich, für 22 von 28 Klangquellen (G, −104 bis −145 dB Unterschied).
  - Die chaotischen Quellen sind dabei stabil: Amöbe, Glut, Böe, Moder, Harz, Elmsfeuer, Sehne, Kehlchen bleiben über 20 s gleich (G).
  - Körner, Saite, Schwarm, Gespinst, Jahresring und Tropfen brauchen vorher Arbeit an ihrem inneren Zustand. Die Hörproben 1 und 2 zeigen „gleicher Wurf, gleicher Klang“.
- **Abdruck gegen Wuchs:** Das ist eine **neue Darbietung derselben Noten** (G: der Unterschied ist so groß wie das Signal selbst).
  - Live standen Vibrato, Taumeln und die Schwebungen der Stufe 3 an anderer Stelle.
  - Gespinst-Hof und Rhizom-Netz antworteten mit anderem Zustand.
  - Hörbar ist das wie ein Musiker, der seine Stimme noch einmal spielt.
  - Deshalb ist es eine Einstellung, ob eine neue Schleife exakt oder als Wuchs beginnt (§12). Die Hörproben zeigen den Unterschied zwischen zwei Wuchs-Durchgängen, nicht zwischen live und Wuchs; sie sind alle offline gerendert.
- **Wuchs ist mehr Arbeit, als er klingt:**
  - Töne, die länger gehalten werden als die Schleife selbst, etwa eine Fläche unter zwei Takten, werden im Wuchs jeden Durchgang neu angeschlagen (A; eine durchlaufende Lösung ist möglich, aber aufwendig).
  - Ein Gong-Ausklang, der viel länger ist als die Schleife, vervielfacht die Rechenzeit.

### 3.5 Folgen: Tonart, Tempo, Klang

- **Tonart und Tonleiter:** Eine Schleife mit Noten folgt nach Tonstufen.
  - *diatonisch* (Standard): Dorisch wird Lydisch auf denselben Stufen;
  - *transponieren*;
  - *fest*.
- **Tempo:** Eine Schleife mit Noten wächst im neuen Tempo. Ihre Zeiten liegen in Schlägen, ihre Ausklänge bleiben physikalisch echt. Gedehnt wird nie.
- **Klang:** „eigener Klang“ (Standard) oder „folgt dem Spielfeld“. In der Karte steht jede der 28 Quellen zur Wahl.

**Eine Änderung, während Schleifen laufen, ist selbst eine angekündigte Aktion.**
- Die Ringleiste zeigt „Schleifen folgen ab Takt 9 · ✕“.
- Feld und Schleifen wechseln auf derselben Eins.
- Jede Schleife zeigt ihre Folge-Regel am Ring.
- Nie spielt ein Durchgang in der alten Tonart gegen die neue Harmonie. Ist ein Wuchs nicht rechtzeitig fertig, blendet die Schleife aus.

**Reine Klang-Schleifen** („Alles“, „Mikro“) haben keine Noten:
- Bei der Tonart bleiben sie, wie sie sind; es sei denn, sie wurzeln ein (§6).
- Beim Tempo gilt deine Entscheidung (§12, Frage 4).

---

## 4. Verwandeln und Form

### 4.1 Verwandeln

**Am Abdruck, wie an einem Tonband:**
- Geschwindigkeit mit Trägheit in Oktav- und Quintschritten; die Tonhöhe geht mit, durch den besten Resampler;
- rückwärts ab der Naht;
- **Bandstopp** als Kadenz;
- **Trimmen** (eine Schleife in der Schleife);
- **Auslassen** und **Würfeln** genau an den Anschlägen, jeder Schnitt mit einer Mikro-Blende;
- **Verdoppeln:** Die Schleife wird durch Wiederholung doppelt so lang, darüber passt dann eine längere Schicht;
- **Verblassen:** jeder Durchgang etwas leiser, wie bei Fripp und Eno; Standard „nie“.

**An den Noten** (diese Formen sind Wuchs):
- nach Tonstufen transponieren, eine andere Klangquelle;
- ausdünnen oder füllen;
- nach deinem eigenen Groove straffen oder lockern;
- Krebs und Umkehrung in der Tonleiter.

**Erstarren** friert einen Wuchs-Durchgang als neuen Abdruck ein.

### 4.2 Form

- **Lichtungen** sind die Szenen des Hexenrings. Eine Lichtung speichert, welche Schleifen klingen, mit Pegel und Eigensinn, auf Wunsch auch eine Mixer-Szene und Puls an oder aus.
  - **Form-Knopf antippen:** nächste Lichtung an der nächsten Eins; bis dahin zeigt der Knopf „ab Takt 9“.
  - **Halten:** die Zeile mit allen Lichtungen. „Merken“ speichert, während du spielst („Strophe gemerkt“).
  - Jede Lichtung wechselt nach ihrer eigenen Regel, am Taktstrich oder am Ende der längsten Schleife, und ihr Chip zeigt die Regel.
- **Folge:** Lichtungen in einer Reihenfolge mit Durchgangszahlen, auf Wunsch im Kreis („1 ×4 → 2 ×8 → 3 ×4 ↺“).
- **Kern:** eine Lichtung, die du als Kern markierst, für einen Breakdown. Dieselbe Geste holt alles auf die Eins zurück.
- **Lücke:** Alle Schleifen setzen für den letzten Schlag oder Takt hart aus und kommen auf der Eins von selbst wieder.
- **Schluss**, auf drei Arten:
  - am Ende: jede Schleife endet an ihrem Ende, und ihr Ausklang läuft;
  - welkend: Pegel, Glanz und Teile fallen über 4–16 Takte weg;
  - abbauend: pro Durchgang eine Schleife weniger, die jüngste zuerst.
- **Schlafen:** Drehst du das Handy um, während Schleifen laufen, halten sie an ihrem Takt an und atmen in das eingefrorene Echo.
  - **Wieder umdrehen:** Das Feld zählt „3 · 2 · 1“, und alles kommt auf die nächste Eins zurück.
  - **Langer Schlaf** hält die Schleifen nur an; er beendet das Stück nicht ungefragt.
- **Puls ernten** (im Puls-Panel) hält einen glücklichen Durchgang des Zufalls-Sequencers fest: genau diese Schläge, mit ihrem Wurf.
- **Klang aufs Feld** (in der Karte) schaltet das Feld auf die Klangquelle einer Schleife. Für ein Lied mit vier Klängen musst du so nicht in die Bibliothek.

---

## 5. Die KI

Die KI im Hexenring hat vier Teile:
- **das Ohr**, immer an;
- **den Eigensinn** jeder Schleife;
- **den Gärtner** für das Ganze;
- **das Gedächtnis**, die Handschrift.

Alles, was sie selbst tun will, zeigt sie vorher. Alle Verfahren laufen offline auf dem Handy, in unter 20 ms pro Entscheidung und nie im Klangweg (C, `research/intelligence.md`).

### 5.1 Das Ohr: immer an, ändert keine Note

- **Takt finden:** Aus einem frei gespielten Motiv schätzt das Ohr Tempo, Taktzahl und die Eins. Es achtet darauf, wo die Anschläge liegen, wie weit sie auseinander sind, und ob betonte und tiefe Töne auf der Eins stehen. 1, 2, 4 und 8 Takte zieht es vor. Die beiden nächstbesten Lesarten stehen als Korrektur bereit.
- **Wiederholung erkennen:** Spielst du ein Motiv zum zweiten Mal, weiß der Korb es: gleiche Stufenfolge, Abstände bis ±15 %. Auf Wunsch schließt sich die Schleife dann von selbst.
- **Auslese:** Hast du ein Motiv drei-, viermal gespielt, legt der Hexenring die Versuche übereinander.
  - **Etappe 1:** Er bietet den echten Versuch an, der dem gemeinsamen Kern am nächsten liegt. Das ist ein exakter Abdruck.
  - **Etappe 2:** Er baut die Fassung aus allen Versuchen. Was in den meisten vorkommt, bleibt, mit mittlerem Timing und Anschlag; der Verspieler im dritten Durchgang ist weg, dein Groove bleibt. Diese Fassung ist ein Wuchs.
  - Beides kommt als Chip („Auslese aus 4 · 91 %“), nie von selbst. Zum Standard wird es erst nach deinem Hörtest.
- **Groove:** Aus deinem Spiel entsteht eine Schablone: wie früh oder spät, wie laut auf jeder Position des Takts, dein Swing. Quantisieren zieht zu *deiner* Schablone, nicht zum starren Raster; Standard ist aus. Der Puls kann die Schablone übernehmen.
- **Spielverzögerung** und **Tonleiter folgen** (§2.7, §3.5).

### 5.2 Eigensinn: wie sehr sich eine Schleife von selbst verändert

Eigensinn sagt, wie sehr sich eine Schleife verändert, auch wenn du nichts tust. Jede Stufe enthält die vorige.

| Stufe | Was die Schleife darf |
|---|---|
| **Treu** (Standard) | nichts: gleiche Noten, gleicher Wurf |
| **Lebendig** | gleiche Noten, neuer Wurf in jedem Durchgang. Die Physik variiert: Die Böe fängt andere Saiten, die Rhizom-Lawine nimmt einen anderen Weg (Hörproben 1 und 2). Dazu atmet das Timing ganz leicht um deinen Groove, mit langsam wanderndem statt zufällig springendem Versatz; den ziehen Hörer laut einer Studie vor (C). |
| **Variieren** | Noten auf leichten Zeiten ändern sich: Nachbarstufen mit gleicher Kontur, ausgedünnt oder gefüllt, Oktavsprünge, Verzierungen. Starke Zeiten bleiben. |
| **Wandern** | weitere Wege: Halbtakte mit gleichen Rändern tauschen, neu kombinieren aus der Sitzung. Ein elastischer Zug holt die Schleife immer wieder zum Original, dem **Anker**, zurück. |

**Der Wurf und ✓: Züchtung.**
- Hat eine lebendige Schleife einmal einen schönen Durchgang, bei der Böe etwa eine Quinte, die stehen bleibt, tippst du ✓. Dieser Durchgang mit seinem Zufall wird der neue Anker.
- Du wählst aus, Myzel vererbt.
- Ein *live* gespielter Durchgang bleibt dabei als Abdruck genau erhalten; ein neu gespielter samt seinem Wurf.

**Schutz:**
- In den drei Durchgängen nach einer neuen Schicht verändert sich nichts.
- Zweimal ✕ innerhalb von vier Takten setzt die Schleife für acht Takte auf Treu; der Ring zeigt das mit einem Countdown.

### 5.3 Der Gärtner: wie sehr die Schleifen auf dich hören

Ein Gärtner schreibt die Pflanze nicht, er sorgt für die Bedingungen. Jede Stufe enthält die vorige. Standard: „schaut zu“.

| Stufe | Der Gärtner darf |
|---|---|
| **schaut zu** | nur das Ohr arbeiten lassen |
| **pflegt** | **Platz machen:** Spielst du dicht, dünnen die Schleifen aus; spielst du sparsam, kommen Füllungen. **Die anderen spielen:** Spielst du Melodie, spielen Bass und Akkorde; gehst du in den Bass, blendet die Bass-Schleife am Taktstrich aus; hörst du auf, spielen alle. Die Rollen (Bass, Akkorde, Melodie, Fläche, Schlag) erkennt er an Lage, Dichte, Mehrstimmigkeit und der Art der Klangquelle; ein Tipp korrigiert sie. |
| **antwortet** | **Antworten:** Hörst du nach einer Phrase auf, antwortet er aus deinem eigenen Material. Die Antwort ist so lang wie dein Ruf und endet auf einer stabilen Stufe; mehr als sechs Töne am Stück übernimmt er nie wörtlich. Fängst du wieder an, endet sie weich. **Begleiten:** Aus einer Melodie-Schleife schlägt er Bass und Akkorde vor, als gestrichelte, stumme Schleifen, die du einzeln einschaltest. **Wiederkehr:** Eine alte Schleife, die du dafür markiert hast, kommt zurück, wenn dein Spiel ihr Motiv anklingen lässt. Angekündigt wird das einen Takt vorher. Spielst du in Minute 12 das Motiv des Anfangs, kommt der Bass des Anfangs zurück. |

**Die Regel zwischen beiden: Eigensinn ist die Grenze.**
- Eine Treu-Schleife ändert ihre Noten nie, auch nicht für den Gärtner. Er darf sie nur leiser, lauter oder stumm machen.
- Ladung (Schütteln) wirkt auf Schleifen nur, wenn du das für eine Schleife einschaltest.
- Eine Schleife, die du in den letzten acht Takten stumm geschaltet hast, holt er nicht zurück.

**Weitere Regeln des Gärtners:**
- nur dein eigenes Material;
- Entscheidungen nur an Taktstrichen, mit einem Takt Verzögerung gegen Hin und Her;
- jede erzeugte Note liegt in der Tonleiter;
- er schweigt, bis er genug Material hat (rund 30–60 Töne);
- nie berührt er den Live-Klang oder die Qualität einer Klangquelle.

**Klangverwandtschaft:** Bei Begleit-Vorschlägen wählt der Gärtner die Akkorde danach, wie rau sie mit den *tatsächlichen Teiltönen* der beteiligten Klangquellen klingen (nach Sethares, C). Gegen eine Glocke, einen Gong oder einen winterlichen Jahresring nimmt er Klänge, die nicht schweben. In der Naturtonreihe findet er ihre eigenen Akkorde.

### 5.4 Knospen: vorher sehen, ablehnen

Alles, was die Maschine von sich aus ändern will, zeigt sie **einen Takt vorher**:
- **Auf dem Spielfeld** schwillt eine Knospe am oberen Rand der Spalte, in der die geänderte Note klingen wird, und platzt, wenn sie klingt. Die Spalten sind Tonstufen, also zeigt der Ort die Tonhöhe. Antworten keimen als Kette, eine Wiederkehr erscheint als Ring, der sich am Rand bildet. Die Knospen nehmen keine Berührung an; das Feld bleibt spielbar.
- **In der Ringleiste** steht unter der Schleife ein Wort für ihre Haltung: „folgt“, „antwortet“, „macht Platz“.
- **Das Veto:** Solange etwas geplant ist, stehen dort die Chips **✕ 2 · ✕ 3 · ✓**. Ein Tipp lehnt die Änderung dieser Schleife ab oder behält sie. ⚓ in der Karte holt das Original zurück.
  - Für Pedale und MIDI sind ✓, ✕ und ⚓ eigene Ziele.
  - Einzelne Noten ablehnen geht auf iPad und PC in der Karte.
- **Farben:** Rot heißt „du wirst aufgenommen“, Lumen „die Maschine handelt“. Kein Zustand wird nur durch Farbe gezeigt.

### 5.5 Die Handschrift: Gedächtnis über Abende

Auf Wunsch merkt sich Myzel dich, lokal auf dem Gerät (unter 1 MB): deine Tempi, Grooves, Tonleitern und Klänge, deine Wendungen, was du behalten und abgelehnt hast.
- **Dafür:** Die Takt-Erkennung kennt dein Tempo (88 statt 176), und Antworten gehen ab der ersten Minute, statt kalt zu starten.
- **Kontrolle:** am Ende einer Sitzung „In die Handschrift übernehmen?“; Vergessen; Export und Import als Datei. Die Handschrift eines anderen nutzt Myzel nur, wenn du das ausdrücklich willst.

### 5.6 Was die KI nicht kann, und was später ginge

**Nicht:**
- **Klang erzeugen:** Neuronale Modelle, die Klang erzeugen, brauchen 2026 eine starke Grafikkarte, einen Mac mit Apple-Chip oder einen Server (C). Sie brächten außerdem einen fremden Klang.
- **Ein Lied planen:** Intro, Aufbau, Rückkehr plant der Mensch. Lichtungen, Folge und Wiederkehr helfen dabei.
- **Harmonie über die Tonleiter hinaus:** Die Harmonie ist Tonleiter-Harmonie, richtig, manchmal schlicht; eine Jazz-Reharmonisierung gibt es nicht.
- **Bei wenig Material** wartet sie, statt zu plappern.

**Später möglich**, jeweils deine Entscheidung (§12):
- eine kleine lernende Notenhilfe (etwa 0,3 MB), die nur dein eigenes Spiel kennt. Sie kommt nur in die App, wenn sie im Blindvergleich besser antwortet;
- Gesang und Pfeifen als Noten: Eine Mikro-Schleife wird zu Noten und spielt mit Myzels Klängen weiter, auch in neuer Tonart;
- eine Online-KI (etwa Googles Lyria): Sie braucht Netz und einen Schlüssel, und sie klingt fremd.

---

## 6. Schleifen nähren Myzel

Das ist die Idee des Komponisten, und sie ist das Myzel-eigenste am Hexenring.

**Nähren:** Eine Schleife speist andere Teile des Instruments.
- **ins Gespinst:** Ein Saitennetz, auf die Tonleiter gestimmt, schwingt mit der Schleife und legt einen Hof um sie. Jede nährende Schleife bekommt ein eigenes Netz, damit nichts zurückkoppelt; das kostet etwa so viel wie ein Gespinst-Netz (2,5 Einheiten, in Stufe 3 3,1; C).
- **in die Körner:** Der Abdruck wird Kornmaterial; das gibt es schon für Takes (C).
- **in Rhizom:** Jede Note stößt das Netz an. Die Lawinen antworten dem Rhythmus, die Erschöpfung des Netzes schnitzt Pausen hinein.
- **in den Sporenregen:** Die Noten der Schleife werden Keime; Neigen lässt den Regen ihre Töne spielen.
- **später in Glut und Sehne:** die Schleife als Zunder der gestimmten Rückkopplung, als Erreger der Saite. Dafür brauchen deren fertige Prozessoren einen Eingang (A).
- **Schleife in Schleife:** B nimmt A in jedem Durchgang auf, mit Rückführung unter 1 und einem weichen Begrenzer. Das ist Terry Rileys Zeitverzögerungs-Akkumulator.

**Zersetzung**, jeweils pro Schicht; die saubere Fassung bleibt immer erhalten:
- **Verblassen** (§4.1);
- **Abrieb** in zwei Arten:
  - *Band:* Abgenutzte Stellen, per festem Zufall gewählt, werden *an denselben Stellen* tiefer: dumpfer, leiser, kleine Aussetzer, bis der Rhythmus der Wunden eine Melodie ist (Basinski);
  - *Moder:* Die oberen Teiltöne zerfallen zu Knistern auf ihren eigenen Tonhöhen, und die Tiefe wird warm.
- **Einwurzeln:** Die Schleife wird in jedem Durchgang durch ein eigenes, auf die Tonleiter gestimmtes Saitennetz gespielt und neu aufgenommen (Alvin Luciers *I am sitting in a room*). Nach 10–30 Durchgängen bleibt nur, was die Tonleiter zum Klingen bringt. **Wechselt die Tonleiter, wachsen die Wurzeln langsam nach.** So folgt sogar eine reine Klang-Schleife der Harmonie, ohne Umrechnen. Das kostet etwa ein Gespinst-Netz.

**Treffen:**
- Schleifen verschiedener Länge treffen sich nur selten auf der gemeinsamen Eins. Bei 5, 7 und 8 Takten geschieht das erst nach 280 Takten. Der Hexenring zeigt, wann es so weit ist.
- **Treffen setzen:** Freie Schleifen bekommen ihre Längen aus Primzahlen, sodass sie sich *genau einmal* treffen, in der Minute, die du wählst. Verändert wird dabei nur die Stille nach jeder Phrase, nie die Musik.
  - Das ist Enos Verhalten für das ganze Stück, und am Ende ein einziger, gewählter Gleichklang.
  - Ein Treffen kann Form tragen: Alle Schleifen spielen einmal ihren Anker, das Netz blüht auf, ein geplanter Tonartwechsel landet.

---

## 7. Mit dem Rest von Myzel

| Teil | Verbindung |
|---|---|
| **Puls** | folgt dem Taktgeber; die erste Schleife setzt das Tempo; Puls ernten (§4.2); später „Puls lernt deine Schleife“: Eine Spur übernimmt den Rhythmus einer Bass- oder Schlag-Schleife als euklidisches Muster und führt ihn mit ihrem eigenen Gang weiter |
| **Gestik** | keine neue Geste. **Wenden** wirkt wie Schlafen (§4.2). **Ladung** lässt Schleifen nur brodeln, wenn du das pro Schleife einschaltest. **Ruhe** erntet auf Wunsch beim Ablegen (das alte „Hinlegen wird Schleife“). Neigen und Drehen wirken nur über Zuweisen. |
| **Sporenregen, Rhizom, Gespinst** | Nähren (§6). Wuchs-Schleifen klingen mit einem eigenen Netz; ihr Hof klingt deshalb anders als live (§12, Frage 11). |
| **Mixer** | ein Kanal „Hexenring“, versteckt bis zur ersten Schleife, wie der Regen-Kanal (C). Pegel pro Schleife in der Ringleiste; auf iPad und PC auf Wunsch ein Kanal pro Schleife. |
| **Szenen, Presets** | Eine Mixer-Szene kann eine Lichtung mitnehmen; der Morph blendet nur Pegel. Presets ändern laufende Schleifen nicht (die Kette ist eingebrannt). Ein Preset kann eine Vorlage tragen (Schleifen, Klänge, Längen, Lichtungen) und Verweise auf gespeicherte Schleifen, nie den Klang selbst. |
| **Aufnahme in Takten** | bleibt der Rekorder für das ganze Set. Jede Schleife lässt sich als Take sichern; damit gibt es WAV-Export und „Als Körner-Quelle“ ohne Zusatzarbeit (C). Die Noten gehen als MIDI-Datei hinaus. |
| **Stille** | hält alle Schleifen an; die Puffer bleiben (§2.5) |
| **Fährte** | Der Knopf geht. Ihre Aufzeichnung wird die Bewegung jeder Schleife, ihre MIDI-Ziele werden Hexenring-Ziele. Alte Presets und Szenen mit einer Fährte laden sie als Schleife, die nur Bewegung hat. Ihre 137 Prüfungen werden übernommen. |

---

## 8. Spielen ohne hinzusehen

**Die Pedal-Regel:** Ein Schalter bekommt eine zweite Bedeutung nur, wenn seine erste noch stumm ist oder noch wartet. Ernten klingt sofort; ein Doppeltritt, der es danach umdeutet, wäre hörbar.

| Aufbau | Belegung |
|---|---|
| **ein Schalter, „Korb“** | tippen = Ernten; auf Wunsch halten = nimmt als Schichten auf, was du spielst, solange du hältst |
| **ein Schalter, „Aufnahme“** | tippen = Hauptknopf (der Start ist noch stumm); halten = aufnehmen, solange gehalten |
| **zwei Schalter** | A = Korb. B tippen = der Durchgang wird eine Schicht im Fokus; das wirkt beim Loslassen, und eine Schicht, die 150 ms später in eine laufende Schleife einsteigt, hört man nicht. B halten = Rückgängig; jedes weitere Halten geht einen Schritt tiefer. |
| **drei, vier Schalter oder MIDI** | C = Hauptknopf; D tippen = nächste Lichtung (wartet erst), D lange halten = Schluss; Kern, ✓, ✕ und ⚓ auf freie Tasten |

- **Der Lernschritt prüft das Halten.** Viele Blätterpedale schicken Drücken und Loslassen auf einmal, andere wiederholen. Kann ein Pedal nicht halten, bietet Myzel die Belegung nur mit Tippen an und sagt, was dabei fehlt.
- **Blätterpedal:** Auf iPad und iPhone ist ein Bluetooth-Blätterpedal das einzige Pedal, denn Safari kennt kein Web-MIDI (C). Für die Seite ist es eine Tastatur.
  - Seine Tasten fängt Myzel vorab ab, damit sie nicht zugleich einen Mixer-Regler verstellen, der gerade den Fokus hat (C: Pfeil- und Bildtasten verstellen ihn heute). Antippen der Ringleiste lässt keinen Fokus zurück.
- **nanoKONTROL2:** SET schaltet zwischen Mixer und einer Hexenring-Seite; die LED und ein Hinweis auf dem Feld zeigen es. Ohne SET bleibt alles wie heute. Auf der Hexenring-Seite:

  | Taste | Wirkung |
  |---|---|
  | R1–R8 | aufnehmen oder schließen; auf einer spielenden Schleife Überspielen an oder aus |
  | M | stumm am Takt |
  | S | Solo |
  | Fader | Pegel |
  | Knöpfe | Eigensinn |
  | CYCLE | Ernten |
  | ◀◀ ▶▶ | Rückgängig, Wiederholen |
  | MARKER | Lichtung zurück, vor |
  | ■ ▶ | alles endet oder beginnt am Takt |
  | TRACK | ✕, ✓ |

- **nanoKEY Studio:** Alle 8 Pads sind belegt (C). Ein Chip „Pads: Spuren / Hexenring“ gibt Pad 1–4 die Schleifen, 5 Ernten, 6 Rückgängig, 7 die nächste Lichtung; **Pad 8 bleibt Stille**.
- **Computertastatur:** Leertaste = Hauptknopf, E = Ernten, 1–8 = Schleifen, Strg+Z und Strg+Umschalt+Z. Die Notenreihe spielt weiter Töne (C).

**Fluchtwege:**
- schlechte Schicht → ↶;
- falsche Länge → die Korrekturen in der Karte;
- Schleife sitzt neben dem Puls → Phase in der Karte (5-ms-Schritte oder ein Schlag);
- alles chaotisch → Kern oder Schlafen;
- aus Versehen gelöscht → aus dem Humus holen;
- Neuladen, Absturz, Anruf → Die Schleifen liegen im Gerätespeicher und kommen mit ihren Lichtungen zurück;
- Bluetooth-Kopfhörer → eine Warnung ab etwa 80 ms Ausgabeverzögerung.

**Barrierefreiheit:**
- **Bildschirmleser:** Die Ringleiste ist eine Werkzeugleiste, jede Schleife ein echter Knopf mit ihrem Zustand („Schleife 2, Amöbe, 2 Takte, spielt, lebendig“). Änderungen werden angesagt, Schläge nicht.
- **Halten ist nie Pflicht:** Jede Halte-Geste hat einen Weg über Tippen.
- **Kontraste** sind berechnet (6,3 bis 15,7 zu 1).
- **Bei reduzierter Bewegung** springt der Spielkopf schlagweise.

---

## 9. Drei Stücke

**A · „Laubhütte“, fünf Minuten, Handy allein in einer Hand.** Spielbar ab Etappe 1; die lebendige Amöbe kommt ab Etappe 2. Kein Puls.
- **0:00** Eine zweitaktige Jahresring-Figur, erst frei, dann fest. Beim dritten Mal zeigt der Korb „2 T · 91“. Ein Tipp mitten im Durchgang; am Ende dieser Wiederholung übernimmt die Schleife, die Taktlinie erscheint.
- **0:25** Das Feld auf Amöbe, eine Oktave tiefer. Eine viertaktige Linie, einmal sauber gespielt, Korb: Schleife 2.
- **0:55** Gespinst-Akkorde über beiden. Der erste Durchgang hat einen Patzer, der zweite ist gut: Korb, dann „→ 3“ (ein neuer Platz). Flageoletts dazu; im dritten Durchgang blüht das Netz von selbst: Korb, „→ 3“. Das ist Schicht 2.
- **1:30** Form-Knopf halten, „merken“: Lichtung A. Schleife 3 antippen: Sie verstummt am Takt, ihr Hof klingt aus. Eine Halm-Melodie, Korb, Schleife 4. „Merken“: Lichtung B.
- **2:30** Form-Knopf antippen: zurück zu A auf der nächsten Eins.
- **3:20** B, und auf Schlag 3 ihres letzten Takts wird das Handy umgedreht. Zwei Takte eingefrorenes Schimmern. Zurückdrehen: „3 · 2 · 1“, der Refrain landet.
- **4:20** Form-Knopf halten, Schluss welkend: über acht Takte, der Jahresring zuletzt.

**B · „Flughafen im Moos“, zwanzig Minuten, Handy auf dem Tisch.** Spielbar ab Etappe 4: freie Schleifen, Treffen gesetzt auf 19:00, Abrieb nach Moder, Nähren ins Gespinst, Gärtner „pflegt“. Halm-Flöte.
- **0–4** Ein langes D, Korb: eine freie Schleife von rund 26 s, Ton und Stille. Sechs weitere Einzeltöne, jeder in seiner Zeit geerntet. Treffen setzen: Der Hexenring legt ihre Pausen so, dass sich alle um 19:00 treffen und keine zwei vorher. Akkorde bilden sich und lösen sich auf; sieben Punkte kreisen in sieben Tempi.
- **4–12** Zuhören. Später gestrichene Harz-Schale darüber; der Gärtner senkt die Schleifen in deiner Lage.
- **12–16** Der Abrieb schreitet voran: Die ältesten Töne zerfallen zu Knistern auf ihren Tonhöhen, der Akkord dunkelt wie eine Moder-Glocke.
- **19:00** Die Übriggebliebenen treffen sich zum ersten und einzigen Mal, und das Netz blüht einmal auf. Handy umdrehen; die letzte Schleife endet im eingefrorenen Nachklang.

**C · „Abendset“, PC mit nanoKEY Studio und nanoKONTROL2, Puls bei 96, drei Wochen Handschrift.** Spielbar ab Etappe 3.
- **0:50** Eine zweitaktige Amöbe-Basslinie, viermal gespielt, im dritten Mal ein Ausrutscher. CYCLE: Die Schleife ist der vierte Durchgang. Der Chip „Auslese aus 4 · 91 %“; ein Tipp, und ab der nächsten Naht ist der Ausrutscher weg, ihr Swing von 58 % bleibt.
- **1:40** Vier Takte Harz-Akkorde, CYCLE. Dann ein Solo auf Kalimba, der Gärtner auf „antwortet“. Geht er in den Bass, blendet die Bass-Schleife am Taktstrich aus und kommt wieder, wenn er höher spielt.
- **4:00** Zwei Takte Pause. Knospen keimen am oberen Feldrand, die Antwort kommt auf Kalimba und endet auf dem Grundton. Er nimmt ihre letzten zwei Töne auf.
- **5:00** Begleiten schlägt Akkorde auf der Böe vor, gewählt für geringe Rauigkeit gegen die Teiltöne der Kalimba. Er schaltet sie ein.
- **12:00** Er spielt das Motiv vom Anfang. Am Rand bildet sich ein Ring: Die Intro-Schleife kehrt am Viertakter zurück, eine ungeplante Reprise. TRACK ▶: ✓.
- **Danach:** „Sitzung in die Handschrift übernehmen?“ Ja. Jede Schleife geht als MIDI und als WAV hinaus.

---

## 10. Etappen

Wie bei den Klangquellen: Etappe für Etappe gebaut, getestet, gepusht und veröffentlicht, bevor die nächste beginnt.

| Etappe | Inhalt | Danach kannst du … | Aufwand (A) |
|---|---|---|---|
| **1 · Fundament** | Taktgeber (der Puls folgt ihm); Looper auf dem Audio-Thread; Humus (beide Klang-Ringe, Noten an den Fingern, Bewegung); Korb, Hauptknopf mit beiden Modi, Ziel und Fokus; „→ N“-Schichten; Überspielen; Rückgängig; Stumm, Anhalten, Löschen; Nähte; Abdruck mit eingebrannter Kette; Ringleiste mit Taktlinie und Noten-Ringen; Lichtungen, Form-Knopf, Kern, Lücke, Schluss, Verblassen; Takt finden, Wiederholung, Korrekturen, Auslese als bester echter Durchgang; Einzählen und Klick; Spielverzögerung; Nähren ins Gespinst und in die Körner; Mixer-Kanal; Stille, Schlafen, Speichern; Pedale, MIDI, Tastatur; Umzug der Fährte | **„Laubhütte“** und jedes Stück mit festen Schleifen spielen | groß |
| **2a · Wuchs** | Werk-Rahmen; Zufall mit Startwerten in allen 28 Klangquellen; Wuchs mit Treu einmal gespielt; Folgen von Tonart und Tempo als angekündigte Aktion; Lebendig, Wurf und ✓; Klangstufe nach deiner Entscheidung | Schleifen in eine neue Tonart mitnehmen; lebendige Schleifen züchten | sehr groß |
| **2b · Werkzeug** | Auslese aus allen Versuchen; Groove; Band-Gesten; Verdoppeln; Abrieb; „Alles“; Puls ernten; Klang aufs Feld; Export als MIDI und WAV; Bühnenansicht mit Setliste | ein ganzes Set mit Verwandlungen | mittel |
| **3 · Mitspieler** | Variieren, Wandern; Knospen; Rollen; Gärtner „pflegt“ und „antwortet“; Begleiten mit Klangverwandtschaft; Puls lernt; Wiederkehr; Handschrift. Jedes Verhalten ist einzeln abschaltbar; der Gärtner steht standardmäßig auf „schaut zu“. | **„Abendset“** | groß, stückweise |
| **4 · Ökologie** | Nähren in Rhizom und Regen, dann Glut und Sehne; Treffen und Treffen setzen; Einwurzeln; Abrieb nach Moder; Mikro-Schleifen und Gesang als Noten; Live-Wiedergabe mit echten Stimmen | **„Flughafen im Moos“** | mittel bis groß |

**Später:**
- ein Gärtner, der verwildert und ab und zu widerspricht;
- ein Jahreslauf, der seine Haltung nach Jahreszeiten stellt;
- „Träumen“ unter dem Schlafen;
- ein Bauplan für den Aufbau ohne Hände;
- die lernende Notenhilfe.

---

## 11. Grenzen, ehrlich

- **Der Wuchs hängt am Werk-Rahmen.** Er ist neu und auf keinem Handy gemessen; Maßstab ist der Rechner, auf dem gebaut wird. Auf schwächeren Geräten gilt:
  - weniger lebendige Schleifen gleichzeitig;
  - Treu nur einmal spielen;
  - die Live-Wiedergabe mit echten Stimmen vorziehen.
- **Der Wechsel vom Abdruck zum Wuchs ist hörbar** (§3.4); deshalb ist der Beginn einer Schleife einstellbar.
- **Zufall mit Startwerten** müssen alle 28 Klangquellen lernen; sechs brauchen Arbeit an ihrem inneren Zustand (G).
- **Lange gehaltene Töne** werden im Wuchs jeden Durchgang neu angeschlagen, wenn sie länger sind als die Schleife (A).
- **Den Ausklang** kann der Humus nicht von deinem neuen Spiel trennen, wenn du gleich weiterspielst. Dann wird er aus den Noten ergänzt oder ausgeblendet.
- **Die eingebrannte Kette** ist nicht ganz dasselbe wie die Kette auf der Summe (Verzerrung, Ring); die Hall-Sende-Pegel sind ein Mittelweg (§3.3).
- **Der Wuchs reagiert verzögert:** auf Reglerbewegungen etwa eine Sekunde später. Ist die Seite versteckt, erstarren lebendige Schleifen zur Wiederholung.
- **Schätzungen irren**, etwa bei dünnem Rubato, einem hohen Bass-Ostinato oder einem Arpeggio, das Akkord oder Melodie sein kann. Die Korrekturen gehören zur Funktion.
- **Speicher:** Ein dichter Abend mit Rändern und Ausklängen braucht 150–200 MB, dazu die Takes. Es gibt eine gemeinsame Grenze für alles, auf dem iPhone niedriger. Dauerhaft speichert das iPhone nur, wenn Myzel als App installiert ist (C).
- **iPhone und iPad:** Ein Klang-Humus ab dem ersten Ton zöge jede Sitzung auf den Worklet-Thread, auch wenn du nur Nebel oder Gong spielst; das kann Aussetzer bringen (C, §12, Frage 7).
- **Abtastrate:** Viele Geräte laufen mit 44,1 kHz. Eine Schleife, die auf einem anderen Gerät geladen wird, muss umgerechnet werden, durch den besten Resampler.
- **Bluetooth-Kopfhörer** (100–300 ms) machen Überspielen unmöglich. Der Hexenring warnt, ändern kann er es nicht.
- **Platz:** Die Ringleiste kostet auf dem Handy 10 % des Spielfelds (C).
- **Plattformen:** iPad und iPhone haben kein Web-MIDI. In der claude.ai-Ansicht gibt es kein Mikrofon, keine Bewegung, kein MIDI und vielleicht keinen Speicher (C).

---

## 12. Entschieden (18.10.2026)

**Vom Besitzer:**
- **Kein Messtag.** Maßstab ist der Rechner, auf dem gebaut und getestet wird. Der Hexenring richtet sich an leistungsstarke Geräte: Er soll ein aktuelles iPad Pro voll ausreizen und ist auf Desktop-PCs optimiert. Gebaut wird alles; der Besitzer prüft das Endergebnis.
- **Wie eine neue Schleife beginnt,** ist eine Einstellung: exakt (Abdruck, Standard) oder gleich als Wuchs.
- **Die Klangstufe der Schleifen** ist manuell einstellbar: wie gespielt, Stufe 1, 2 oder 3. Standard ist die beste Stufe.
- **Reine Klang-Schleifen bei einem Tempowechsel:** „das, was am meisten Sinn macht“. Umgesetzt so: Ihr Klang wird nie gedehnt. Rhythmische Schleifen werden an ihren Anschlägen neu ins Raster gesetzt (Schnitt), jeder Anschlag klingt wie aufgenommen. Flächen ohne klare Anschläge laufen frei in ihrem Tempo weiter.
- **Taumeln** ist pro Schleife ein Schalter. An (Standard): Die Schleife taumelt mit dem Live-Spiel mit, der Abdruck wird um die bekannte Differenz nachgestimmt. Aus: Sie bleibt in ihrer Stimmung.

**Nach den Vorschlägen** (die Fragen der ersten Fassung):
- **Reihenfolge:** Etappen 1, 2a, 2b, 3, 4 nacheinander, jede getestet. Die Spieltests der Mitspieler entfallen; ihre Verhaltensweisen sind abschaltbar und stehen standardmäßig auf „schaut zu“.
- **Schafft ein Gerät eine Schleife nicht rechtzeitig,** wird sie in der Stufe neu gespielt, in der sie gespielt wurde, sonst verstummt sie bis zum Taktstrich, an dem sie fertig ist. Nie spielt sie im alten Ton.
- **Der Klang-Humus läuft ab dem ersten Ton**, auf allen Geräten (die Zielgeräte tragen das), 64 s pro Ring, einstellbar.
- **Die Effektkette** ist eingebrannt; „folgt der Effektkette“ ist pro Schleife wählbar.
- **Speicher:** 32-Bit-Gleitkomma, mit gemeinsamer Speichergrenze.
- **Live-Wiedergabe:** Reicht das Stimmenbudget nicht, weichen die Stimmen der Schleifen, nie die Live-Töne.
- **Gespinst und Rhizom im Wuchs** klingen mit eigenem Netz; wer den Live-Hof will, nimmt den Abdruck.
- **Reichs Phasenwandern:** gleitend über den Wuchs für Schleifen mit Noten, stufenweise für reine Klang-Schleifen.
- **Schwankende MIDI-Clock:** Der Abdruck führt die Geschwindigkeit nach.
- **Die Fährte** geht als Knopf; ihre Aufzeichnung wird die Bewegung jeder Schleife, alte Presets werden umgewandelt.
- **Die Ringleiste** ist immer sichtbar.
- **Wenden, solange Schleifen laufen:** Sie halten an und kommen auf die Eins zurück; ein langer Schlaf hält sie nur an.
- **Pedale:** die Sustain-Buchse nur über Zuweisen; die nanoKONTROL2-Seite auf SET.
- **KI:** Gesang und Pfeifen als Noten (einstimmig) gehören zu Etappe 4. Keine Online-KI. Die kleine lernende Notenhilfe bleibt ein späterer Versuch.
- **Handschrift:** standardmäßig aus, mit einer Frage am Ende jeder Sitzung.
- **Namen:** wie in Anhang A.

## Anhang A · Namen

Die Namen, die du kennen musst:

| Name | Was es ist |
|---|---|
| **Hexenring** | der Looper. Ein Hexenring ist ein Pilzkreis im Gras: Das Myzel wächst unsichtbar nach außen, die Pilze kommen im Kreis wieder, Jahr für Jahr. |
| **Schleife** | eine Schleife (das Gestik-Konzept hat das Wort für Klang-Schleifen reserviert; jede Schleife hier hat Klang) |
| **Schicht** | eine Überspielung in einer Schleife |
| **Humus** | das Gedächtnis: 64 s Klang, zwei Minuten Noten und Bewegung |
| **Ernten**, der **Korb** | nachträglich festhalten, und sein Knopf |
| **Abdruck** | der Klang, wie du ihn gehört hast |
| **Wuchs** | die Schleife wächst aus ihren Noten neu |
| **Wurf** | der Zufall eines Durchgangs |
| **Eigensinn** | Treu · Lebendig · Variieren · Wandern |
| **Gärtner** | schaut zu · pflegt · antwortet |
| **Knospen** | Änderungen, einen Takt bevor sie klingen |
| **Lichtung**, **Folge** | Abschnitt, Reihenfolge der Abschnitte |
| **Ringleiste** | die Leiste unter dem Spielfeld |
| **Taktgeber** | die Uhr, die nie springt |
| **Auslese** | die Fassung aus mehreren Versuchen |
| **Nähren** | eine Schleife speist Gespinst, Körner, Rhizom, den Regen |
| **Einwurzeln** | die Schleife wächst durch gestimmte Saiten in die Tonleiter |
| **Treffen** | wann sich Schleifen verschiedener Länge auf der Eins begegnen |
| **Handschrift** | dein Gedächtnis über Abende |

**Wörter für Handgriffe**, die die Oberfläche benutzt: Kern, Lücke, Schluss, Verblassen, Abrieb, Verdoppeln, Erstarren, Bandstopp.

**Bewusst vermieden:**
- „Kreis“, wegen „Kreisen“;
- „Atmen“, wegen des Bordun-Reglers;
- „Spur“, wegen des Puls;
- „Ring“ als Name, wegen des Ringmodulators;
- „Hyphen“, weil die Mixer-Legende das Wort schon benutzt;
- „Kompost“, wegen Moders Kompostglocke;
- „Takt“ als Name der Uhr, weil „Takt“ überall die Takte zählt.

## Anhang B · Technik in Kürze

**Der Weg des Klangs:**
- Kanäle (Feld, Ebene 2, Regen, Gespinst) nach Fader und Stumm, und die Summe vor dem Master → Humus.
- Humus → Ernten → Abdruck, einmal durch die Kopie der Effektkette → Looper auf dem Audio-Thread → Kanal „Hexenring“ → Echo, Hall, Master.
- Werk-Rahmen (Wuchs, offline) → Looper auf dem Audio-Thread.

**Wer was macht:**
- **Audio-Thread:** ein Looper-Prozessor im gemeinsamen DSP-Modul. Er nimmt auf, hält den Humus, spielt Schichten, setzt Nähte, kennt die Taktabschnitte und puffert den Wuchs. Er spielt weiter, wenn die Seite hängt, reserviert beim Spielen keinen Speicher, wartet nie auf die Seite und entscheidet nichts Musikalisches.
- **Seite (Haupt-Thread):** Noten und Bewegung aufzeichnen, Taktgeber, Oberfläche, Nähte wählen, Speichern, Intelligenz.
- **Werk-Rahmen:** eine unsichtbare zweite Kopie der Klangmaschine. Sie rendert Wuchs-Durchgänge offline, etwa eine Sekunde voraus, und schickt die Blöcke direkt an den Looper (A).

**Gemessen** (G, auf dem Test-Server, Chromium):
- **Nähte:** eine Stunde ohne Abdriften (≤ ½ Sample bei 631 Durchgängen). Der Klick an der Naht ist mit weicher 10-ms-Blende so laut wie die Mitte (1,2-fach); ein harter Schnitt liegt 18 000-fach darüber.
- **Kosten:** Aufnehmen ≈ 0,4 Einheiten, jede spielende Schicht ≈ 0,13 (Untergrenze; Resampler, Abrieb und Blenden kommen dazu). Gezählt wird in der Stimmenlast, solange der Humus läuft.
- **Wuchs:**
  - Ein Durchgang rendert in 0,16- bis 0,32-facher Echtzeit, ein Kontext ist in 23–33 ms aufgebaut.
  - Wuchs gegen Wuchs ist gleich für 22 von 28 Quellen; Abdruck gegen Wuchs nicht.
  - Der Versuch ohne Werk-Rahmen hat das Live-Instrument gestört.
- **Speicherformate:** 32 Bit genau; 16 Bit mit Blockexponent ≥ 79 dB unter dem Signal in jedem Block; einfaches 16 Bit in leisen Ausklängen nur 4 dB Abstand.

**Dauerhaft:**
- Gespeichert wird im Gerätespeicher, in Stücken von etwa 4 s nach jeder Schicht, damit nichts ruckelt.
- Nach Neuladen oder Absturz meldet sich „Hexenring wiederhergestellt“.
- Scheitert der Speicher, bleiben die Schleifen im RAM, und die App sagt es.

**Bildschirmsperre:**
- „Hexenring spielt oder nimmt auf“ hält den Klang wach, wie heute Puls, Bordun und Aufnahme (C).
- iOS-Web-Apps können den Klang trotzdem anhalten (A).

**Prüfungen** (automatisch):
- Nähte und kein Abdriften über eine Stunde mit Tempowechseln;
- keine Klicks und keine Pegelsprünge an jeder Naht, auch mit echtem Gong-, Harz- und Bordun-Material;
- keine hängenden Töne nach wilden Kombinationen aus Ernten, Überspielen, Rückgängig, Stille, Lichtungen, Tempo, Presets, Schlafen und verstecktem Tab;
- Gleichheit im Wuchs;
- das Live-Instrument bleibt unberührt, während der Werk-Rahmen rendert;
- der Speicher bleibt begrenzt;
- Wiederherstellung bitgenau;
- Kosten auf deinen Geräten.

## Anhang C · Was neu ist

Gemessen an rund 40 Loopern und den Forschungssystemen in `research/`. Das ist eine Recherche, kein Beweis, dass es nirgends existiert.

1. **Rückblickendes Überspielen.** Loopy Pro und Ableton nehmen rückblickend neue Clips, keine Schichten.
2. **Ein erster Loop ohne kritischen Moment:** Wiederholung an den Noten erkannt, Einsatz an der Naht, jede Schätzung mit einem Tipp korrigierbar.
3. **Physikalische Modelle, die im Hintergrund neu gespielt werden**, mit Abdruck und Noten in jeder Schleife. Ableton (Capture und Freeze), Deluge und Octatrack behalten jeweils eine der beiden Formen.
4. **Der Wurf:** der Zufall physikalischer Modelle als Register der Variation, und Züchtung durch ✓.
5. **Auslese:** Rückblickende Looper nehmen den letzten Durchgang; Programme zum Musikmachen setzen von Hand zusammen.
6. **Schleifen, die das Instrument nähren.** Die nächsten Verwandten (Softcut, Clouds, Oliveros) speisen Verzögerungen, nicht die physikalischen Modelle desselben Instruments.
7. **Einwurzeln:** Luciers Verfahren als Schleifen-Modus, und damit Klang-Schleifen, die der Harmonie folgen.
8. **Treffen berechnet und gesetzt.**
9. **Knospen im Spielfeld**, an der Tonhöhe. ReaLJam und „Agents in Concert“ zeigen ihre Pläne in einer eigenen Anzeige.
10. **Klangverwandtschaft:** Die Theorie gibt es (Sethares), einen Begleiter, der sie nutzt, haben wir nicht gefunden.
11. **Wiederkehr:** Reprisen aus deinen eigenen Motiven.
