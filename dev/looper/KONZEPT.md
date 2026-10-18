# Hexenring – der Looper für Myzel: das Konzept

Stand 2026-10-18, Entwurf zur Prüfung. Für den Besitzer.

**Grundlage:**
- vier Recherchen (`research/`): die Fährte im Code mit neun Nachstellungen, die Bausteine im Code, rund 40 Looper und Looping-Praktiken, intelligente Mitspieler und was davon offline auf dem Handy läuft;
- fünf unabhängige Entwürfe (`ideas/`): Live-Musiker, Komponist, Erfinder, Ingenieur, Gestalter;
- zehn Messungen des Ingenieurs (`ideas/engineer-experiments/`).

**Kennzeichnung:** **(V)** = im Code, in einer Quelle oder durch Messung belegt. **(A)** = Annahme oder Entwurfsentscheidung.

---

## 0. Auf einer Seite

**Hexenring** ist ein Looper, bei dem du nie vorher etwas drücken musst.

Myzel hört immer mit, Klang und Noten. Gefällt dir, was du gerade gespielt hast, tippst du auf den Korb: Das war's, es läuft als Schleife weiter, im Takt, genau da, wo deine Hände aufgehört haben. Keinen Einsatz verpassen, kein Einzählen, keine Taktzahl vorher festlegen.

Jede Schleife hält zwei Dinge fest:
- **den Abdruck:** den genauen Klang, mit Raum, Nachklang und dem einmaligen Verhalten der physikalischen Klangquellen;
- **die Noten:** was du gespielt hast, mit Höhe, Anschlag und dem Zufall jeder Stimme.

Solange sich nichts ändern soll, spielt die Schleife ihren Abdruck, Sample für Sample. Soll sie der Tonart folgen, dem Tempo, einem anderen Klang, oder soll sie lebendig werden, dann **wächst** sie jeden Durchgang neu aus ihren Noten. Myzel rendert sie dafür im Hintergrund eine Sekunde voraus, in bester Qualität, ohne deinem Live-Spiel eine einzige Stimme wegzunehmen (V, gemessen).

Darauf sitzt ein musikalisches Ohr:
- Es findet den Takt in einem frei gespielten Motiv.
- Es merkt, wenn du dich wiederholst.
- Es baut aus vier Versuchen die Fassung, die du gemeint hast.
- Es folgt der Tonleiter und hält deinen Groove.

So viel du willst, und nur so viel, spielt es mit: Es variiert, macht Platz, antwortet, bringt zurück, was du vor zehn Minuten gespielt hast. Alles, was es von sich aus ändern will, zeigt es **einen Takt vorher** auf dem Spielfeld. Ein Tipp behält es, einer lehnt es ab.

**Was es so noch nicht gibt** (§9):
1. lebendige Schleifen aus physikalischen Modellen, im Hintergrund vorgerendert, ohne Stimmenkosten;
2. Abdruck und Noten in jeder Schleife, verlustfrei in beide Richtungen;
3. der glückliche Zufall eines Durchgangs lässt sich behalten (der „Wurf“);
4. eine Schleife aus dem Konsens deiner Wiederholungen („Auslese“);
5. Schleifen, die Myzels eigene Klangkörper speisen: das Saitennetz, die Lawinen, den Regen;
6. die Pläne der Maschine sichtbar im Spielfeld, mit Veto pro Note.

**Was du entscheiden solltest**, steht in §13. Die wichtigsten Fragen: in welcher Reihenfolge gebaut wird, ob neue Schleifen exakt oder lebendig beginnen, und was reine Klang-Schleifen bei einem Tempowechsel tun.

---

## 1. Warum die Fährte nicht reicht

Die Fährte tut technisch, wofür sie gebaut wurde: Sie wiederholt **Bewegung** (Gestik, Regler, Fingerhöhe), keine Noten und keinen Klang. Alle 137 ihrer Prüfungen sind grün (V). Als Looper wirkt sie trotzdem kaputt, aus diesen Gründen (V, nachgestellt in `research/faehrte.md`):

- **Deine Noten kommen nicht wieder.** Nach einer Melodie meldet sie „hat sich nichts bewegt“. Mit 2 px Fingerzittern meldet sie „läuft als Schleife“, obwohl nichts Hörbares wiederkommt.
- **Der unsichtbare Takt.** Ohne Puls zählt sie eigene Takte, die nirgends angezeigt werden. Eine Geste über den Taktstrich wird zerschnitten und springt an der Naht bei jedem Durchgang (gemessen: 1773 Cent).
- **Das gerade Gespielte fehlt.** „Die letzten Takte“ heißt: die abgeschlossenen vor dem letzten Taktstrich. Ein schneller zweiter Tipp zum Nachbessern gilt als Doppeltipp und löscht.
- **Sie verblasst von selbst:** nach 23 s auf 52 %, nach knapp zwei Minuten ist sie weg.
- **Der Knopf ist oft unsichtbar:** auf dem Handy ohne Gestik, am PC ohne MIDI, auf dem iPad.
- **Hänger der Seite** über 0,4 s frieren sie ein, danach springt sie (bis 2300 Cent).
- **Stille und Presets** halten sie nicht an.

**Was taugt und bleibt:** ihr Taktgeber, der nie springt; die Verzögerungskorrektur; das Vorausplanen im Scheduler; das Speicherformat; die Idee, immer mitzuschreiben. Der Knopf geht. Ihre Aufzeichnung lebt als **Bewegung** in jeder Schleife weiter (§4).

---

## 2. Namen

Alle fünf Entwürfe haben unabhängig voneinander denselben Namen gewählt.

| Name | Was es ist | Warum |
|---|---|---|
| **Hexenring** | der Looper | Ein Hexenring ist ein Pilzkreis im Gras: Das Myzel wächst unsichtbar nach außen, die Pilze kommen im Kreis wieder, Jahr für Jahr. Wiederholung, die wächst. |
| **Schleife** | eine Schleife | Das Gestik-Konzept hat das Wort für Klang-Schleifen reserviert (§11); jede Schleife hier hat Klang. |
| **Schicht** | eine Überspielung in einer Schleife | Bodenschichten |
| **Humus** | das Gedächtnis: die letzten 64 s Klang, zwei Minuten Noten und Bewegung | Was du spielst, sinkt ein. Nichts geht verloren. |
| **Ernten**, **Korb** | das Nachträglich-Festhalten, sein Knopf | Du erntest, was schon gewachsen ist. |
| **Abdruck** | der genaue Klang einer Schleife | Ein Sporenabdruck bestimmt einen Pilz genau. |
| **Wuchs** | die Schleife wächst jeden Durchgang neu aus ihren Noten | |
| **Wurf** | der Zufall eines Durchgangs (die Startwerte aller seiner Stimmen) | „ein guter Wurf“ |
| **Eigensinn** | was eine Schleife von sich aus tun darf | |
| **Gärtner** | was der Hexenring als Ganzes von sich aus tun darf | Ein Gärtner schreibt die Pflanze nicht, er sorgt für die Bedingungen. |
| **Knospen** | Änderungen, einen Takt bevor sie klingen | |
| **Lichtung**, **Reigen** | ein gespeicherter Abschnitt, eine Folge von Abschnitten | Form als Weg von Lichtung zu Lichtung; der Reigen ist der Tanz im Hexenring. |
| **Ringleiste** | die Leiste unter dem Spielfeld | |
| **Takt** | der gemeinsame Taktgeber, der nie springt | aus der Fährte |

Keiner dieser Namen ist in Myzel schon vergeben (V, gesucht). „Schicht“ steckt nur im internen Wort „Mod-Schicht“, „Verblassen“ kommt mit gleicher Bedeutung aus der Fährte. Bewusst vermieden: „Kreis“ (wegen „Kreisen“), „Atmen“ (Bordun), „Spur“ (Puls), „Ring“ (Ringmodulator).

---

## 3. So spielt es sich

### 3.1 Wo der Hexenring wohnt: die Ringleiste

Auf dem Spielfeld ist jede Berührung ein Ton, und die Leiste oben ist bei 360 px voll (V, gemessen). Der Hexenring bekommt deshalb eine eigene **Ringleiste**, 56 px hoch, direkt unter dem Spielfeld. Dort liegt sie im Daumenbereich und bleibt am Feld kleben, wenn ein Panel aufgeht.

```
┌──────────────────────────────────────────────┐
│ (≈ Nebel)  (▶) (✳)  (● REC)                  │  Leiste oben: unverändert, Fährte-Knopf weg
│                                              │
│      Spielfeld   ⁘1 ← Schleifen-Noten        │  gespielte Töne: volle Ringe
│                       gepunktet, mit Nummer  │
├━━━━━━━━  ━━━━━━━━  ▀▀▀▀▀▀▀▀  ━━━━━━━━────────┤  Taktlinie: Schlag 3 leuchtet, die 1 orange
│ (🧺) ((●))  (·1·) (·2·) (┄+┄) (┄+┄)    (↶)   │  Ringleiste: Korb · Hauptknopf · Schleifen · Zurück
├──────────────────────────────────────────────┤
│ Filter ━━●   Echo ━●━   Hall ━━●     (🔇)    │  unverändert
│ Klang Effekte Puls Mixer Aufnahme Presets …  │
└──────────────────────────────────────────────┘
```

- **Die Taktlinie** am oberen Rand der Ringleiste ist das erste sichtbare Metrum in Myzel. Bisher zeigt der Spielbildschirm keinen Schlag und keinen Takt (V). Ohne Tempo ist sie gepunktet („frei“).
- **Jede Schleife ist ein kleiner Ring aus ihren Noten.** Die Noten sind Sporen (Abstand zur Mitte = Tonhöhe), dazu kreist ein Spielkopf, außen stehen Taktstriche. Man sieht die Form einer Melodie schon bei 40 px.
- **Auf dem Handy** stehen vier Schleifen pro Seite, auf iPad und PC alle acht.
- **Zusammenklappen** auf 24 px (nur Taktlinie und Punkte) ist möglich. Solange der Mixer auf dem Handy offen ist, klappt sie von selbst zusammen.
- **Die Tiefe** (Karten, Abschnitte, Verlauf) liegt im Aufnahme-Panel, in einem neuen Abschnitt „Hexenring“ über dem Take-Rekorder.

### 3.2 Eine Grammatik für alles

Die Fährte hatte drei Bedeutungen auf einem Knopf: tippen, halten, doppelt tippen. Sie reagierte 400 ms zu spät und löschte aus Versehen (V). Der Hexenring hat **eine Bedeutung pro Geste und Ziel**, nichts wird verzögert, und **auf dem Bildschirm gibt es keinen Doppeltipp**.

| Wo | Geste | Wirkung |
|---|---|---|
| **Korb** | tippen | **Ernten:** das zuletzt Gespielte wird eine neue Schleife und läuft sofort weiter (§3.3) |
| | auf eine Schleife ziehen | Der letzte Durchgang, den du über diese Schleife gespielt hast, wird eine **Schicht** in ihr (§3.5) |
| **Hauptknopf** | tippen | Aufnahme starten; nochmal tippen schließt sie |
| | halten | nimmt nur auf, solange du hältst (wie ein Funkgerät) |
| **Schleife** | tippen | leer: wird das Ziel des Hauptknopfs · spielt: verstummt am Taktstrich, ihr Ausklang läuft · stumm: kommt am Taktstrich wieder |
| | halten | **Überspielen**, solange du hältst: eine neue Schicht |
| | nach unten wischen | die letzte Schicht zurück, sofort, mit weicher Blende |
| | nach oben wischen | ihre **Karte** öffnet sich im Panel |
| | hoch/runter ziehen | Pegel |
| **↶** | tippen | bricht zuerst ab, was noch wartet; sonst macht es den letzten Schritt rückgängig. „Wiederholen“ steht im Hinweis. |
| **Stille** | | stoppt alle Schleifen weich; die Puffer bleiben. Der Hauptknopf zeigt ▶, ein Tipp holt sie am nächsten Taktstrich zurück. |

Zeitkritische Knöpfe (Korb, Hauptknopf) wirken **beim Aufsetzen** des Fingers, gemessen in der Zeit, die du gehört hast. Ein Tipp kurz *nach* dem Taktstrich meint diesen Taktstrich. Weil der Humus alles schon hat, geht dabei nichts verloren.

**Unter jedem Ring steht ein Wort**, was ein Tipp jetzt tut: „ernten“, „aufnehmen“, „schließen“, „stumm“, „an“. Versteckte Modi waren der Hauptgrund, warum die Fährte unzuverlässig wirkte.

### 3.3 Die erste Schleife: ernten statt einzählen

Der späte erste Einsatz ist der häufigste Fehler beim Loopen (V, `research/loopers.md` §3.11). Der Hexenring schafft den Moment ab, in dem du etwas treffen musst:

1. **Einfach spielen.** Der Humus hält die letzten 64 s Klang und alle Noten mit Stufe, Anschlag und Zeit fest.
2. **Wenn du ein Motiv wiederholst, leuchtet der Korb** und zeigt, was er nehmen würde: „2 T · 91“. Das erkennt er an den Noten selbst, ohne Klanganalyse (V, Verfahren in `research/intelligence.md` §5.1).
3. **Tippe, wann du willst**, auch mitten im Motiv. Die Schleife ist der letzte ganze Durchgang bis zum Tipp. Sie läuft **phasengleich** weiter, als hättest du weitergespielt. Hör auf, wo du willst; die Schleife trägt.
4. **Acht Sekunden lang** stehen über der Ringleiste Korrekturen:

   `2 Takte · 91 │ ½ │ ×2 │ 3er │ −1 │ +1 │ Runde davor`

   Oktavfehler beim Tempo werden passieren; die Korrektur kostet einen Tipp und schneidet neu aus dem Humus, ohne dass die Musik stoppt.
5. **Die erste Schleife setzt den Takt.** Puls und MIDI-Clock-Ausgang folgen ihr genau, auch mit Nachkommastellen im Tempo.

**Spielt schon ein Takt** (Puls, MIDI-Clock oder eine frühere Schleife), nimmt Ernten die letzten 1, 2, 4 oder 8 Takte **bis zum Taktstrich, den du gerade gehört hast, einschließlich des laufenden Takts**. Die Länge wählt der Hexenring nach Phrasengrenze, Wiederholung und danach, dass kein Ton zerschnitten wird. Das behebt den Fehler der Fährte, die den laufenden Takt ausließ.

**Ist der Puls klar zu schwach** (rubato, Flächen), wird die Schleife **frei**: ihre eigene Länge in Sekunden, ohne Raster. Nichts zwingt ambientem Spiel einen Takt auf.

**Wer lieber klassisch arbeitet:** Hauptknopf tippen, spielen, tippen. Mit Raster wartet er sichtbar auf den nächsten Taktstrich (große, blasse Zahl in der Feldmitte, Bogen am Knopf) oder startet beim ersten Ton. Töne vor der Eins werden als **Auftakt** behalten und ans Ende der Schleife gelegt, wo ein Auftakt musikalisch hingehört.

### 3.4 Die nächsten Schleifen: eine pro Tipp

Nach der ersten Schleife rückt das Ziel des Hauptknopfs zur nächsten leeren Schleife (**Kette**). Die nächste Aufnahme schließt sich nach der Grundlänge von selbst: ein Tipp pro Schicht, und die Hand ist sofort zurück auf dem Feld. Während sie läuft, verlängert ein Chip „länger“ um eine weitere Grundlänge (×2, ×3 …). Polymetrik bleibt so einen Tipp entfernt.

Wer lieber wie bei einer Loop-Station immer dieselbe Schleife überspielt, stellt im Panel einmal **Schichten** statt Kette ein. Der Knopf zeigt, welcher Modus gilt.

### 3.5 Jeder Durchgang ist ein Angebot

Das ist die Idee des Live-Musikers, und sie verändert das Überspielen grundlegend:

- Du **spielst frei über die Schleifen**. Nichts ist scharf geschaltet.
- War ein Durchgang gut, **ziehst du den Korb auf die Schleife** (oder trittst das Pedal B, §7): Genau dieser Durchgang wird eine Schicht, schon im Takt, weil du ihn gegen die Schleife gespielt hast.
- War er schlecht, passiert nichts. **Ein verdorbenes Überspielen gibt es nicht mehr.**
- Klassisches Überspielen bleibt: Schleife halten, spielen, loslassen. Jede Überspielung ist eine eigene Schicht mit 10 ms weichen Blenden an beiden Enden.

Jede Schicht bleibt einzeln erhalten, mit eigenem Pegel und eigener Stummschaltung. Rückgängig und Wiederholen wirken **sofort**, nicht erst am Ende der Schleife: Ein falscher Ton, der sich endlos wiederholt, ist das Schlimmste auf einer Bühne. Gelöschte Schleifen fallen in den Humus und lassen sich bis zum Ende der Sitzung wieder ausgraben.

### 3.6 Nähte, die einem Gong gerecht werden

Myzels Klangquellen klingen lang nach: ein Moder schwillt an, eine Böe hängt nach, ein Gong singt weiter. Die Naht muss das aushalten.

- **Ausklang:** Was über das Ende der Schleife hinausklingt, kommt aus dem Humus und wird ab dem zweiten Durchgang an den Anfang gelegt. Das Falten hört bei deinem nächsten neuen Ton auf, damit deine nächste Phrase nicht mitgefaltet wird.
- **Auftakt:** Was vor der Eins gespielt wurde, kommt ans Ende (§3.3).
- **Wo geschnitten wird, wählt der Hexenring** (Nahtwahl): Die musikalische Eins bleibt auf dem Taktstrich, aber der Puffer wird dort geschnitten, wo es leise ist und beide Seiten zusammenpassen, nie 5 ms vor bis 60 ms nach einem Anschlag. Die Noten sagen genau, wo die Anschläge liegen.
- **Wie gefügt wird:** Klingt am Anfang nichts nach, wird der Ausklang einfach dazugelegt. Klingt schon etwas, gibt es eine weiche Überblendung von 10–40 ms.
- **Gemessen** (V, Sinus mit krummer Periodenzahl plus 30 Hz, Spitze an der Naht gegen die Mitte des Durchgangs): harter Schnitt 18 000-fach, gewöhnliche Sinus-Blende 4,6-fach, die gewählte weiche Blende von 10 ms **1,2-fach**, von 40 ms 1,0-fach. Dieselbe Blende gilt für jede Naht, jedes Stummschalten, Rückgängig, Überspielen und jeden Wechsel der Wiedergabe.
- **Im Wuchs** (§4.2) wird ein gehaltener Ton über die Naht gebunden, nicht neu angeschlagen. Eine Glut glüht weiter.
- **Stoppen schneidet nie einen Ausklang ab.** Der gespeicherte Ausklang spielt nach dem letzten Durchgang einmal zu Ende. Der harte Schnitt ist eine eigene Geste (Lücke, §5.2).

### 3.7 Takt und Tempo

- **Ein gemeinsamer Takt, der nie springt.** Er entsteht aus dem Taktgeber der Fährte. Neue Tempoabschnitte beginnen in der Zukunft und übernehmen den alten Schlag; nur die Steigung ändert sich. Korrekturen der MIDI-Clock gleitet er über mindestens einen Schlag aus.
- **Gemessen** (V): eine Stunde, 631 Durchgänge, ein Tempowechsel und 20 Minuten Schwanken um ±0,2 %. Jeder Durchgang begann innerhalb eines halben Samples am genauen Taktstrich, kein einziges Sample im Durchgang war falsch. Ein einfacher Zähler lag nach 20 Minuten schon 1,2 ms daneben.
- **Wer das Raster hat:** der laufende Puls oder eine externe Clock, sonst die erste Schleife. Startet der Puls, während Schleifen laufen, reiht **er sich in ihr Raster** ein. Heute verschiebt sich die Fährte dabei um bis zu einen halben Takt (V).
- **Längen:** jede Schleife ist ein Vielfaches oder ein Bruchteil der Grundlänge (½, ×1 … ×8, auch ×3, ×5, ×7 für Polymetrik) und liegt samplegenau fest. Oder sie ist **frei** und dreht sich in ihrer eigenen Zeit gegen die anderen (Eno). Oder sie **wandert**: eine Kopie, die alle N Durchgänge ein Sechzehntel vorrückt (Reichs *Piano Phase*), stufenweise an der Naht, also ohne Umrechnen des Klangs.

---

## 4. Was aufgenommen wird und wie es wiederkommt

### 4.1 Ein Durchgang, dreifach festgehalten

| Teil | Inhalt | Größe |
|---|---|---|
| **Abdruck** | der Klang in Stereo, mit Rändern: Vorlauf aus dem Humus, Nachklang nach dem Ende | 384 KB/s in 32-Bit-Gleitkomma (V) |
| **Noten** | jeder Ton an der Stimmenschicht: Zeit, Klangquelle, Stufe, Oktave, Frequenz, Höhe *über die Zeit*, Anschlag, Biegung, MPE, Loslassen, Kanal, dazu die **Startwerte seines Zufalls**. Auch Puls, Sporenregen, Rassel und Wirbel. | 30–60 Byte pro Ton |
| **Bewegung** | die Bahnen der Fährte: Gestik, gelernte Regler, Fader, als absolute Werte | rund 600 Byte pro Bahn und Takt |

**Woher der Klang kommt** (Wahl pro Schleife):
- **„Gespielt“** (Standard): die Kanäle, die du spielst (Feld, Ebene 2, Regen …), jeweils nach Fader, vor dem Pumpen. Die Schleife läuft danach über einen eigenen Mixer-Kanal „Hexenring“ wieder durch dieselbe Effektkette und in dieselben Echos und Hallräume. Nichts wird doppelt bearbeitet, nichts koppelt zurück, Echo- und Hallfahnen laufen natürlich über jede Naht. Puls und Bordun laufen ohnehin weiter und bleiben draußen, außer du wählst sie.
- **„Alles“:** die Summe vor dem Master, mit Effekten, Puls und den anderen Schleifen. Das ist Resampling: der Weg, um aus vielen Schichten eine zu machen.
- **„Mikro“** (spätere Etappe): Stimme, Pfeifen, ein akustisches Instrument; mit gemessener Verzögerung und Warnung bei Bluetooth.

**Verzögerung:** Myzels eigener Klang braucht keine Korrektur. Der Hexenring spielt wieder, was gerendert wurde, an derselben Stelle der Uhr, durch dieselbe Kette; er landet genau dort, wo du ihn gehört hast. Eine Korrektur wäre hier der klassische Doppelfehler (V, `research/loopers.md` §3.1). Nur das Mikrofon braucht eine Messung.

### 4.2 Wie eine Schleife wiederkommt: Abdruck oder Wuchs

| Form | Klang | folgt Tonart, Tempo, Klang | kostet live |
|---|---|---|---|
| **Abdruck** | Sample für Sample, was du gehört hast | nein | ≈ 0,13 Einheiten pro Schicht (V) |
| **Wuchs** | dieselben Klangquellen spielen die Noten neu, im Hintergrund **eine Sekunde voraus gerendert**, in der besten Stufe, die das Gerät schafft | ja | **keine Stimme** |

**Die Regel ist einfach:** Eine Schleife spielt ihren Abdruck, solange sich nichts ändern soll. Sobald sie folgen muss (neue Tonart, neues Tempo, neuer Klang) oder Eigensinn bekommt (§5.3), wächst sie ab der nächsten Naht aus ihren Noten. Die Ringleiste zeigt, was gilt: ruhige Sporen für Abdruck, Sporen mit feinen Hyphen für Wuchs. Die Karte kann jede Form festhalten.

**Mit gleichen Startwerten klingt der Wuchs wie der Abdruck.** Gemessen (V): Zwei Renderungen mit gleichen Startwerten weichen um −108 bis −144 dB voneinander ab. Das ist nicht bitgenau, aber weit unter jeder Hörschwelle. Gleiche Noten 37 Samples neben dem 128er-Raster wichen dagegen nur um −9 bis −38 dB ab. Jeder Wuchs-Durchgang beginnt deshalb bei Sample 0 seines eigenen Kontexts, mit den gemeinsamen Modulatoren in fester Phase; so gilt die Gleichheit durch Bauart.

**Warum der Wuchs keine Stimmen kostet** (V, gemessen auf einem Server-Kern):
- Ein Durchgang rendert in **0,04- bis 0,21-facher Echtzeit**, je nach Klangquelle (Sehne und Halm schnell, Gong am langsamsten).
- Die gerenderten Blöcke gehen direkt an den Looper auf dem Audio-Thread, auch während der Haupt-Thread hängt: 703 von 703 Blöcken kamen an, 85 davon während einer Blockade von 600 ms.
- Ein schweres Hintergrund-Rendern störte den Live-Klang nicht.
- Kommt ein Block doch zu spät, spielt an dieser Stelle der vorige Durchgang, überblendet. Es entsteht nie eine Lücke.
- Schafft ein Gerät eine Schleife nicht schnell genug, bleibt sie Abdruck. **Ihr Klang wird nie verringert.**
- (A) Auf einem Handy ist das Rendern vielleicht zwei- bis viermal langsamer. Das muss auf deinen Geräten gemessen werden, bevor Etappe 2 gebaut wird (§11).

**Drittens gibt es „Live“** (spätere Etappe): Die Noten spielen echte Stimmen, wie der Puls. Das antwortet sofort auf Regler und Gestik, kann MIDI ausgeben und das Saitennetz von Gespinst mit dem Live-Spiel teilen, kostet aber Stimmen. Schleifen-Stimmen weichen dann vor deinen Live-Tönen.

### 4.3 Folgen: Tonart, Tempo, Klang

| Änderung | Wuchs | Abdruck mit Noten | reiner Klang („Alles“, „Mikro“) |
|---|---|---|---|
| **Tonart, Tonleiter** | folgt nach Stufen: *diatonisch* (Standard: Dorisch wird Lydisch auf denselben Stufen), *transponieren* oder *fest* | wird an der Naht zum Wuchs | bleibt (oder: Einwurzeln, §5.5) |
| **Tempo** | wächst im neuen Tempo; Zeiten in Schlägen, Ausklänge physikalisch echt | wird zum Wuchs mit denselben Startwerten: dieselbe Darbietung im neuen Tempo; kehrt zum Abdruck zurück, wenn das Tempo zurückkehrt | **deine Entscheidung** (§13): Tempo halten · Band (Tonhöhe geht mit) · Schnitt (Anschläge neu gesetzt) · Dehnen |
| **Klang** | „eigener Klang“ (Standard) oder „folgt dem Spielfeld“; in der Karte jede der 28 Quellen | bleibt | bleibt |
| **MIDI-Clock-Schwanken** unter 0,5 % | folgt | Originalgeschwindigkeit, an jeder Naht auf ≤ ½ Sample neu ausgerichtet (V) | ebenso |

Das Tempo eines Abdrucks wird also nie gedehnt, solange es Noten gibt: Er wird neu gespielt. Das ist die Antwort auf deine Regel „immer der beste Klang“.

---

## 5. Die musikalische Tiefe

### 5.1 Verwandeln

**Am Abdruck, wie an einem Tonband:**
- Geschwindigkeit mit Trägheit, in Oktav- und Quintschritten (die Tonhöhe geht mit; bester Resampler);
- rückwärts ab der Naht; **Bandstopp** als Kadenz; **Trimmen** (eine Schleife in der Schleife);
- **Auslassen** und **Würfeln** schneiden genau an den gespielten Anschlägen, jeder Schnitt mit Mikro-Blende;
- **Verblassen** (Frippertronics: jeder Durchgang etwas leiser, Standard „nie“) und **Abrieb** (Basinski, §5.5). Beides bleibt umkehrbar, bis du die Schichten zusammenlegst.

**An den Noten:**
- Transponieren nach Stufen, eine andere Klangquelle;
- ausdünnen oder füllen, nach deinem eigenen Groove straffen oder lockern;
- Krebs und Umkehrung innerhalb der Tonleiter;
- „Erstarren“ friert einen Wuchs-Durchgang als neuen Abdruck ein.

### 5.2 Form

- **Lichtungen:** Chips oben im Hexenring-Abschnitt. Eine Lichtung speichert, welche Schleifen klingen, mit Pegel und Eigensinn, auf Wunsch auch Szene A/B und Puls an/aus. Ein Tipp wechselt dorthin **am Taktstrich** oder am Ende der längsten Schleife; solange er wartet, zeigt der Chip „ab Takt 9“. Lange drücken auf „+“ speichert, während du spielst („Strophe gemerkt“).
- **Reigen:** Lichtungen in einer Reihenfolge mit Durchgangszahlen, auf Wunsch im Kreis („1 ×4 → 2 ×8 → 3 ×4 ↺“). Das sind die Folgeaktionen großer Looper.
- **Kern:** zurück auf die Kernschleifen für einen Breakdown; dieselbe Geste holt alles auf die Eins zurück.
- **Lücke:** alle Schleifen setzen hart für den letzten Schlag oder Takt aus und kommen auf der Eins von selbst wieder.
- **Atempause:** Handy umdrehen, während Schleifen laufen. Wie bei Schlafen enden die Schleifen mit ihrem Takt und atmen in das eingefrorene Echo. Wieder umdrehen: Das Feld zählt „3 · 2 · 1“, und alles kommt auf die nächste Eins eines Takts zurück, der nie stehen geblieben ist. Langer Schlaf bleibt das Ende des Sets.
- **Enden:** **Schluss** (jede Schleife endet an ihrem Ende, ihr Ausklang läuft), **Welken** (Pegel, Glanz und Teile fallen über 4–16 Durchgänge weg), **Abbau** (pro Durchgang eine Schleife weniger, die jüngste zuerst).
- **Bauplan** für Hände-frei-Aufbau: „2 Takte Jahresring → 4 Takte Amöbe → 4 Takte Gespinst“. Ein Tipp zählt ein, dann nimmt der Hexenring auf und wechselt Schleife und Klang an jedem Taktstrich.
- **Schleife wählt Klang:** Jede Schleife merkt sich ihren Klang. Antippen einer Schleife im Bauplan- oder Lied-Modus schaltet das Feld auf ihre Quelle. Ein Lied mit vier Klängen braucht keinen Gang in die Bibliothek.

### 5.3 Das Ohr: Dienst-Intelligenz, immer an

Sie ändert nie eine Note, ohne dass du es willst (alle Verfahren: `research/intelligence.md` §5.1, Rechenzeit unter 1 ms):

- **Takt finden:** Aus einem frei gespielten Motiv werden Tempo, Taktzahl und die Eins geschätzt (Anschläge auf Unterteilungen, Abstände, betonte und tiefe Töne auf der Eins, Vorlieben für 1/2/4/8 Takte). Die beiden nächstbesten Lesarten stehen als Korrektur bereit.
- **Wiederholung erkennen:** Spielst du ein Motiv zum zweiten Mal, weiß der Korb es (gleiche Stufenfolge, Abstände ±15 %). Auf Wunsch schließt sich die Schleife dann von selbst.
- **Auslese** (neu): Hast du ein Motiv drei-, viermal gespielt, legt der Hexenring die Versuche übereinander und nimmt, was in den meisten vorkommt, mit dem mittleren Timing und Anschlag. Der Verspieler im dritten Durchgang ist weg, dein Groove bleibt. Angeboten nur bei mindestens 80 % Übereinstimmung, sonst gilt der letzte Durchgang. Ein Chip „letzte Fassung“ schaltet um.
- **Groove:** Aus deinem Spiel entsteht eine Groove-Schablone (mittlere Verschiebung und Lautstärke pro Taktposition, dein Swing-Verhältnis). Quantisieren zieht zu *deiner* Schablone, nicht zum starren Raster; Standard ist aus. Die Schablone kann der Puls übernehmen.
- **Tonleiter folgen** (§4.3).
- **Puls lernt deine Schleife:** Ein euklidischer Rhythmus wird an die Anschläge einer Bass- oder Schlag-Schleife angepasst; die Puls-Spur führt ihn dann mit ihrem eigenen Gang weiter.

### 5.4 Der Wille: Eigensinn pro Schleife

Ein Regler pro Schleife, dazu ein Gesamtregler für alle („wie frei ist die Band“):

| Stufe | Was die Schleife darf |
|---|---|
| **Treu** | gleiche Noten, gleicher Wurf: jeden Durchgang dieselbe Darbietung der physikalischen Modelle (Standard) |
| **Lebendig** | gleiche Noten, neuer Wurf: Nur die Physik variiert. Die Böe fängt andere Saiten, die Rhizom-Lawine nimmt einen anderen Weg. Das Timing atmet um deinen Groove, mit langsam korreliertem Rauschen in einem Drittel deiner eigenen Streuung, das Hörer gegenüber Zufallsrauschen bevorzugen (V, Studie in `research/intelligence.md` §5.1e). |
| **Variieren** | Noten auf leichten Zeiten ändern sich: Nachbarstufen mit gleicher Kontur, euklidisch umverteilt, ausgedünnt oder gefüllt, Oktavsprünge, Verzierungen. Starke Zeiten bleiben. Jeden Durchgang werden 16 Kandidaten nach Nähe zum Original, Neuheit und Passung bewertet. |
| **Wandern** | weitere Wege: Halbtakte tauschen mit gleichen Rändern, Neukombination aus der ganzen Sitzung. Ein elastischer Zug holt sie immer wieder zum **Anker**, dem Original, zurück. |

**Der Wurf, das Glück der Physik:** Jeder Durchgang hat seine Startwerte. Hat die Böe im Lebendig-Modus einmal die perfekte Quinte gefangen, tippst du ✓ (**Lob**): Genau dieser Durchgang wird der neue Anker, samt seinem Zufall. Eine Schleife züchten, indem man ihre besten Durchgänge lobt, braucht keine KI, nur geordneten Zufall. Das bietet kein Looper (V, Recherche).

### 5.5 Das Ensemble: der Gärtner

Eigensinn betrifft eine Schleife. Der **Gärtner** betrifft den ganzen Hexenring: Er schreibt keine Pflanze, er sorgt für die Bedingungen. Vier Stufen, Standard „schaut zu“:

| Stufe | Darf |
|---|---|
| **schaut zu** | nur Dienst-Intelligenz |
| **pflegt** | **Platz machen:** Spielst du dicht, dünnen die Schleifen aus; spielst du sparsam, kommen Füllungen. **Die anderen spielen:** Spielst du Melodie, spielen Bass und Akkorde; gehst du in den Bass, blendet die Bass-Schleife am Taktstrich aus; hörst du auf, spielen alle. Rollen (Bass, Akkorde, Melodie, Fläche, Schlag) erkennt er aus Lage, Dichte, Mehrstimmigkeit und der Art der Klangquelle; ein Tipp korrigiert sie. |
| **antwortet** | **Antworten:** Hörst du nach einer Phrase auf, antwortet er aus deinem eigenen Material, so lang wie dein Ruf, endend auf einer stabilen Stufe, nie mehr als sechs Töne wörtlich kopiert. Fängst du wieder an, endet die Antwort weich. **Begleiten:** Aus einer Melodie-Schleife schlägt er Bass und Akkorde vor, als gestrichelte, stumme Schleifen; einzeln einschaltbar. **Wiederkehr:** Eine alte Schleife kommt zurück, wenn dein Spiel ihr Motiv anklingen lässt, angekündigt einen Takt vorher. Spielst du in Minute 12 das Motiv des Anfangs, kommt der Bass des Anfangs zurück. |
| **verwildert** | dazu, ab und zu, für eine Phrase Widerspruch (dichter, wenn du ausdünnst) oder Eigenweg; immer mit Rückweg. Treibt aus dem Humus eine kleine neue Schleife, wenn lange nichts Neues kam. |

**Seine Regeln:**
- nur dein eigenes Material;
- Entscheidungen nur an Taktstrichen und Nähten, mit einem Takt Verzögerung gegen Hin-und-her;
- jede erzeugte Note liegt in der Tonleiter;
- er schweigt, bis er genug Material hat (rund 30–60 Töne), statt zu plappern;
- er berührt nie den Live-Klang und nie die Qualität einer Klangquelle.

**Klangverwandtschaft** (neu): Bei Begleit-Vorschlägen wählt der Gärtner Klänge danach, wie rau sie mit den **tatsächlichen Teiltönen** der beteiligten Klangquellen klingen (nach Sethares). Gegen eine Glocke, einen Gong oder einen winterlichen Jahresring mit gestreckten Teiltönen nimmt er Klänge, die nicht schweben; in der Naturtonreihe findet er ihre eigenen Akkorde.

### 5.6 Sehen und ablehnen: Knospen

Alles, was die Maschine von sich aus ändern will, zeigt sie **einen Takt vorher**:
- **Auf dem Spielfeld:** Eine Knospe schwillt am oberen Rand der Spalte, in der die geänderte Note klingen wird, und platzt, wenn sie klingt. Die Spalten sind Tonstufen, also ist der Ort die Tonhöhe. Antworten keimen als Kette, eine Wiederkehr erscheint als Ring, der sich am Rand bildet. Nichts davon nimmt Berührungen an; das Feld bleibt spielbar.
- **Auf der Ringleiste:** Knospen vor dem Spielkopf; ein Wort pro Schleife sagt die Haltung: „folgt“, „antwortet“, „macht Platz“, „widerspricht“.
- **Farbe:** Rot heißt immer „du wirst aufgenommen“, Orange „Ziel des Hauptknopfs“, Lumen „die Maschine handelt“. Kein Zustand wird nur durch Farbe gezeigt.

**Lob, Nein, Anker:** ✓ behält, ✕ lehnt ab (die Änderung fällt weg, dieser Weg wird eine Weile seltener gewählt; zweimal ✕ in vier Takten setzt die Schleife acht Takte auf Treu), ⚓ holt das Original sofort zurück. Alles ist rückgängig zu machen.

### 5.7 Gedächtnis: die Handschrift

Auf Wunsch merkt sich Myzel dich über Abende hinweg, lokal auf dem Gerät (unter 1 MB): deine Tempi, deine Grooves, deine Tonleitern und Klänge, deine Wendungen als Musterbaum, was du gelobt und abgelehnt hast.
- **Dafür:** Die Takt-Erkennung kennt dein Tempo (88 statt 176), Antworten gehen ab der ersten Minute, statt kalt zu starten.
- **Kontrolle:** Am Ende einer Sitzung „In die Handschrift übernehmen?“; Vergessen; Export und Import als Datei. Fremde Handschriften nur ausdrücklich.

### 5.8 Ökologie: Schleifen, die Myzel nähren

Das ist die Idee des Komponisten, und sie ist das Myzel-eigenste am Hexenring.

- **Hyphen:** Eine Schleife speist andere Teile des Instruments:
  - ins **Gespinst**: das Saitennetz schwingt mit der Schleife, ein Hof aus der Tonleiter (der Eingang existiert, V);
  - in **Rhizom**: jede Note stößt das Netz an; Lawinen antworten dem Rhythmus, die Erschöpfung schnitzt Pausen hinein (V);
  - in den **Sporenregen**: ihre Noten werden Keime, Neigen lässt den Regen ihre Töne spielen (V);
  - in die **Körner**: der Abdruck wird Kornmaterial (V);
  - in **Glut** und **Sehne** (E-Bow): die Schleife als Zunder für die gestimmte Rückkopplung, als Erreger der Saite. Dafür brauchen deren Prozessoren einen Eingang (A, neue Arbeit an fertigen Quellen);
  - Schleife in Schleife: B nimmt A jeden Durchgang auf, mit Rückführung unter 1 (Rileys Zeitverzögerungs-Akkumulator).
  - Jede Rückführung hat einen weichen Begrenzer; das Gespinst behält seinen eigenen Regler.
- **Zersetzung** (pro Schicht, die saubere Fassung bleibt immer erhalten):
  - *Verblassen:* ×0,7–0,98 pro Durchgang;
  - *Abrieb:* abgenutzte Stellen, per festem Zufall gewählt, werden **an denselben Stellen** tiefer (dumpfer, leiser, kleine Aussetzer), bis der Rhythmus der Wunden eine Melodie ist (Basinski);
  - *Kompost:* wie Moder zerfallen die oberen Teiltöne zu Knistern auf ihren eigenen Tonhöhen, die Tiefe wird warm;
  - *Einwurzeln:* Die Schleife wird jeden Durchgang durch ein privates, auf die Tonleiter gestimmtes Saitennetz gespielt und neu aufgenommen (Luciers *I am sitting in a room*). Nach 10–30 Durchgängen bleibt nur, was die Tonleiter zum Klingen bringt. **Wechselt die Tonleiter, wachsen die Wurzeln langsam nach:** eine reine Klang-Schleife, die der Harmonie folgt, ohne Umrechnen. Kosten ≈ ein Gespinst-Netz (2,5 Einheiten, V).
- **Treffen:** Schleifen verschiedener Länge treffen sich nur selten auf der gemeinsamen Eins. Der Hexenring zeigt, wann (bei 5, 7 und 8 Takten erst nach 280 Takten). **Treffen setzen:** Freie Schleifen bekommen Längen aus Primzahlen, sodass sie sich **genau einmal** treffen, zu der Minute, die du wählst. Verändert wird dabei nur die Stille nach jeder Phrase, nie die Musik. Das ist Enos Verhalten für das ganze Stück, und dann ein einziger, gewählter Gleichklang. Ein Treffen kann Form tragen: alle Schleifen spielen einmal ihren Anker, das Netz blüht, ein geplanter Tonartwechsel landet.
- **Jahreslauf** (Standard aus): Eine Jahresuhr über das Stück (z. B. 20 Minuten) stellt die Haltung des Gärtners nach Jahreszeit ein: Frühling erntet bereitwillig, Sommer lässt alles spielen, Herbst lässt zersetzen, Winter lässt Schleifen überwintern. Sie kann Jahresrings Jahr teilen.

---

## 6. Mit dem Rest von Myzel

| Teil | Verbindung |
|---|---|
| **Puls** | ein gemeinsamer Takt; die erste Schleife setzt das Tempo; startet der Puls, reiht er sich ein; **Puls ernten** hält einen glücklichen Durchgang des Zufalls-Sequencers fest (mit festem Wurf genau diese Schläge); „Puls lernt“ (§5.3); Groove-Übernahme |
| **Gestik** | keine neue Geste. **Wenden** = Atempause, solange Schleifen laufen (§5.2). **Ladung** lässt Schleifen für ein paar Takte brodeln: Lebendig-Schleifen variieren mehr, Abdrücke bekommen Aussetzer und Stotterer im Raster, Treu-Schleifen bleiben, wie sie sind; es klingt mit der Entladung ab. **Ruhe** auf Wunsch: Ablegen erntet (das alte „Hinlegen wird Schleife“). Neigen und Drehen nur über Zuweisen. |
| **Schlafen** | Schleifen enden mit der Kadenz an ihrer Naht und behalten ihre Phase; kurzer Schlaf holt sie auf die Eins zurück; langer Schlaf beendet das Set. Neue Option **Träumen**: unter dem eingefrorenen Nachklang spielt der Gärtner einen spärlichen Gang durch das Material der Sitzung, bis du das Handy aufnimmst. |
| **Sporenregen, Rhizom, Gespinst** | Wuchs- und Live-Schleifen schlagen dasselbe Netz und denselben Hof an wie deine Hände; Hyphen (§5.8) |
| **Mixer** | ein Kanal „Hexenring“, versteckt bis zur ersten Schleife (wie der Regen-Kanal, V); Pegel pro Schleife in der Ringleiste; auf iPad und PC auf Wunsch ein Kanal pro Schleife |
| **Szenen, Presets** | Szenen A/B speichern Stummschaltung, Pegel und Eigensinn der Schleifen; der Morph blendet zwischen Arrangements. Presets tragen eine Vorlage (Schleifen, Klänge, Längen, Lichtungen) und **Verweise** auf gespeicherte Schleifen, nie den Klang selbst. |
| **Aufnahme in Takten** | bleibt der Set-Rekorder. Jede Schleife lässt sich als Take sichern: WAV-Export, ZIP, „Als Körner-Quelle“ gibt es damit geschenkt (V). Die Noten gehen als MIDI-Datei hinaus. |
| **Stille** | stoppt alle Schleifen (die Fährte tat das nicht, V); die Puffer bleiben |
| **Fährte** | Der Knopf geht. Ihre Aufnahme wird die Bewegung jeder Schleife, ihre MIDI-Ziele werden Hexenring-Ziele, alte Presets und Szenen mit einer Fährte laden sie als Schleife, die nur Bewegung hat. |

---

## 7. Spielen ohne hinzusehen

| Gerät | Belegung |
|---|---|
| **ein Fußschalter** (Sustain-Buchse von nanoKEY Studio oder microKEY über Zuweisen; jedes MIDI-Pedal) | tippen = Ernten · halten = aufnehmen, solange gehalten · doppelt = Rückgängig (nochmal = Wiederholen) · 2 s halten = Kern / alles zurück |
| **zwei Schalter** (Bluetooth-Blätterpedal: Pfeil- oder Bild-Tasten) | A wie oben · B: tippen = Durchgang als Schicht (Korb auf die Zielschleife) · doppelt = nächste Lichtung · halten = Schluss |
| **nanoKONTROL2** | **SET** schaltet zwischen Mixer und einer Hexenring-Seite um (die LED zeigt es, der Feld-Hinweis auch): R1–R8 aufnehmen/schließen bzw. Schicht, M stumm am Takt, S Solo, Fader Pegel, Knöpfe Eigensinn, CYCLE Ernten, ◀◀ ▶▶ Rückgängig/Wiederholen, MARKER Lichtung zurück/vor, ■ ▶ alles endet/beginnt am Takt. Ohne SET bleibt alles wie heute. |
| **nanoKEY Studio** | alle 8 Pads sind belegt (V); ein Chip „Pads: Spuren / Hexenring“ gibt Pad 1–4 die Schleifen, 5 Ernten, 6 Rückgängig, 7 Lichtung, **8 bleibt Stille** |
| **Computertastatur** | Leertaste = Hauptknopf, E = Ernten, 1–8 = Schleifen, Strg+Z / Strg+Umschalt+Z; die Notenreihe spielt weiter Töne (V) |

**Warum ein Doppeltipp am Pedal geht, auf dem Bildschirm aber nicht:** Ein Pedaltritt handelt sofort. Das Fenster einer Ernte ist beim Tritt festgelegt und liegt im Humus; ein zweiter Tritt kurz danach kann den ersten deshalb ohne hörbaren Verlust umdeuten. Auf dem Bildschirm gibt es dafür eigene Knöpfe.

**Das Blätterpedal ist auf iPad und iPhone das einzige Pedal:** Safari kennt kein Web-MIDI (V); ein Bluetooth-Blätterpedal ist dort eine Tastatur. Welche Modelle Medientasten senden, die eine Seite nicht lesen kann, zeigt der Lernschritt sofort (A).

**Bühne und Werkstatt:** In der Werkstatt (Probe) ist alles bearbeitbar: der Humus als 64-s-Zeitleiste zum Ausgraben jedes Moments, Schichten, Bauplan, Pedalbelegung, Eigensinn, Vorschläge, „Lied speichern“. Auf der Bühne ist das Layout fest: große Ringe, eine kleine Pedal-Legende, wenige Hinweise, Stille immer erreichbar, eine **Setliste** („nächstes Lied“ lädt Preset, Tempo und Vorlage). Mit Keyboard ersetzt auf Wunsch eine große Ring-Ansicht das Feld, lesbar aus 60 cm.

**Fluchtwege:** schlechte Schicht → nach unten wischen; falsche Länge → ½ ×2 ±1; Schleife sitzt neben dem Puls → am Ring drehen (5-ms-Schritte oder ein Schlag); alles chaotisch → Kern oder Atempause; aus Versehen gelöscht → aus dem Humus holen; Neuladen, Absturz, Anruf → die Schleifen liegen in IndexedDB und kommen mit ihren Lichtungen zurück; Bluetooth-Kopfhörer → Warnung ab ≈ 80 ms Ausgabeverzögerung.

**Barrierefreiheit:** Die Ringleiste ist eine Werkzeugleiste für Bildschirmleser, jede Schleife ein echter Knopf mit ihrem Zustand („Schleife 2, Amöbe, 2 Takte, spielt, Eigensinn lebendig“); Änderungen werden angesagt, Schläge nicht. Kein Halten ist Pflicht: Push-to-talk hat einen Tipp-Tipp-Ersatz. Kontraste sind berechnet (6,3–15,7 : 1), bei reduzierter Bewegung springt der Spielkopf schlagweise.

---

## 8. Drei Stücke

**A · „Laubhütte“, fünf Minuten, Handy allein in der linken Hand.** Schleife 1 Jahresring, 2 Amöbe eine Oktave tiefer, 3 Gespinst, 4 Halm-Flöte. Kein Puls.
- **0:00** Eine zweitaktige Jahresring-Figur, erst rubato, dann fest. Beim dritten Mal zeigt der Korb „2 T · 91“. Der Daumen tippt auf Schlag 3; die Schleife spielt einfach weiter, die Taktlinie erscheint.
- **0:25** Schleife 2 antippen: das Feld wird Amöbe. Eine viertaktige Linie, einmal sauber gespielt, Korb.
- **0:55** Gespinst-Akkorde. Der erste Durchgang hat einen Patzer, der zweite ist gut: Korb auf Schleife 3. Flageoletts dazu; im dritten Durchgang blüht das Netz von selbst: Korb, Schicht 2.
- **1:30** „+“ lang drücken: Lichtung A. Schleife 3 verstummt am Takt, ihr Hof klingt aus. Eine Halm-Melodie auf Schleife 4, Lichtung B.
- **3:00** Zwei Sekunden schütteln: die Amöbe (lebendig) wird rau, der Jahresring stottert ein paar Schläge, das legt sich über acht Takte.
- **3:20** Lichtung B, und auf Schlag 3 ihres letzten Takts wird das Handy umgedreht: zwei Takte eingefrorenes Schimmern. Zurückdrehen: „3 · 2 · 1“, der Refrain landet mit einer Sporenblüte.
- **4:20** Welken über acht Durchgänge, der Jahresring zuletzt.

**B · „Flughafen im Moos“, zwanzig Minuten, Handy auf dem Tisch.** Freie Schleifen, Treffen gesetzt auf 19:00, langsamer Kompost, alle in das Gespinst, Gärtner „pflegt“. Halm-Flöte.
- **0–4** Ein langes D, Korb: eine Schleife von rund 26 s, Ton plus Stille. Sechs weitere Einzeltöne, jeder in seiner Zeit geerntet. Der Hexenring setzt ihre Pausen so, dass sich alle um 19:00 treffen und keine zwei vorher. Akkorde bilden sich und lösen sich auf; sieben Punkte kreisen in sieben Tempi.
- **4–12** Man hört zu. Später gestrichene Harz-Schale darüber; der Gärtner senkt die Schleifen in deiner Lage.
- **12–16** Herbst: Der Kompost schreitet voran, die ältesten Töne zerfallen zu Knistern auf ihren Tonhöhen, der Akkord dunkelt wie eine Moder-Glocke.
- **19:00** Die Übriggebliebenen treffen sich zum ersten und einzigen Mal: das Netz blüht einmal auf. Handy umdrehen, die letzte Schleife endet in den eingefrorenen Nachklang.

**C · „Abendset“, PC mit nanoKEY Studio und nanoKONTROL2, Puls bei 96, drei Wochen Handschrift.**
- **0:50** Eine zweitaktige Amöbe-Basslinie, viermal gespielt, im dritten Mal ein Ausrutscher. CYCLE: Auslese aus vier (91 % Übereinstimmung), der Ausrutscher ist weg, ihr Swing von 58 % bleibt.
- **1:40** Vier Takte Harz-Akkorde, CYCLE. Dann ein Solo auf Kalimba mit dem Gärtner auf „antwortet“: Geht er in den Bass, blendet die Bass-Schleife am Taktstrich aus und kommt wieder, wenn er höher spielt.
- **4:00** Zwei Takte Pause. Knospen keimen am oberen Feldrand, die Antwort kommt auf Kalimba und endet auf dem Grundton. Er nimmt ihre letzten zwei Töne auf.
- **5:00** Begleiten schlägt eine gestrichelte Böe-Fläche vor, gewählt für geringe Rauigkeit gegen die Teiltöne der Kalimba. Er schaltet sie ein.
- **12:00** Er spielt das Motiv vom Anfang. Am Rand bildet sich ein Ring: die Intro-Schleife kehrt am Viertakter zurück, eine ungeplante Reprise. ▶▶ Lob.
- **Danach:** „Sitzung in die Handschrift übernehmen?“ Ja. Jede Schleife geht als MIDI und als WAV hinaus.

---

## 9. Was neu ist

Gemessen an rund 40 Loopern und den Forschungssystemen in `research/`:

1. **Lebendige Schleifen ohne Stimmenkosten.** Physikalische Modelle werden jeden Durchgang neu gespielt, im Hintergrund vorgerendert, in der besten Stufe. Kein Looper, den wir gefunden haben, tut das. Es löst den Grundkonflikt jedes intelligenten Loopers: Noten-Schleifen kosten Stimmen, Klang-Schleifen können nicht folgen.
2. **Abdruck und Noten in jeder Schicht, verlustfrei in beide Richtungen.** Ableton (Capture + Freeze), Deluge und Octatrack behalten jeweils eine der beiden Formen.
3. **Der Wurf:** der Zufall physikalischer Modelle als Register der Variation, und ein glücklicher Durchgang lässt sich genau behalten.
4. **Auslese:** eine Schleife aus dem Konsens deiner Wiederholungen. Rückblickende Looper nehmen den letzten Durchgang; DAWs setzen von Hand zusammen.
5. **Jeder Durchgang ist ein Angebot:** rückblickendes Überspielen, im Takt. Loopy und Ableton nehmen rückblickend neue Clips, keine Schichten.
6. **Ein erster Loop ohne kritischen Moment:** Wiederholung an den Noten erkannt, Tipp irgendwo, phasengleiche Übernahme, jede Schätzung mit einem Tipp korrigierbar.
7. **Schleifen, die das Instrument nähren:** Saitennetz, Lawinennetz, Regen, Rückkopplung. Die nächsten Verwandten (Softcut, Clouds, Oliveros) speisen Verzögerungen, nicht die physikalischen Modelle desselben Instruments.
8. **Einwurzeln:** Luciers Verfahren als Schleifen-Modus durch gestimmte Saiten, und damit Klang-Schleifen, die der Harmonie folgen, ohne Umrechnen.
9. **Treffen berechnet, gezeigt und komponiert:** Enos Schleifen treffen sich genau einmal, wann du willst.
10. **Die Pläne der Maschine im Spielfeld**, an der Tonhöhe, wo sie klingen werden, mit Veto pro Note. ReaLJam und „Agents in Concert“ zeigen ihre Pläne in einer eigenen Anzeige.
11. **Klangverwandtschaft:** Begleitung nach der Rauigkeit der tatsächlichen Klangquellen. Die Theorie gibt es (Sethares), einen Begleiter, der sie nutzt, haben wir nicht gefunden.
12. **Wiederkehr:** Reprisen, die aus deinen eigenen Motiven entstehen.

---

## 10. Technik in Kürze

```
Stimmen ─► Kanäle Feld · Ebene 2 · Regen · Gespinst (· Puls · Bordun) ─[Abgriff vor dem Pumpen: „Gespielt“]─┐
Summe vor dem Master ─────────────────────────────────────────────────[Abgriff: „Alles“]──────────────────┤
Mikrofon (gemessene Verzögerung abgezogen) ───────────────────────────[Abgriff: „Mikro“]──────────────────┤
                                                                                                         ▼
Wuchs-Renderer (OfflineAudioContext, eigener Thread) ══MessageChannel══►  Looper-Prozessor auf dem Audio-Thread
                                                                          ─► Kanal „Hexenring“ ─► Kette, Sends ─► Summe
```

- **Audio-Thread:** ein Looper-Prozessor im gemeinsamen DSP-Modul. Er nimmt auf, hält den Humus, spielt Schichten, setzt Nähte, kennt die Taktabschnitte und puffert den Wuchs. Er spielt weiter, wenn der Haupt-Thread hängt; das behebt die Sprünge der Fährte. Er reserviert nie Speicher während des Spielens, wartet nie auf den Haupt-Thread und entscheidet nichts Musikalisches.
- **Haupt-Thread:** Noten und Bewegung aufzeichnen, Takt, Oberfläche, Nähte wählen, Speichern, Wuchs-Stimmen bauen, Intelligenz (unter 20 ms pro Entscheidung, nie im Klangweg).
- **Wuchs-Renderer:** ein OfflineAudioContext pro Wuchs-Schleife, mit den Stimmen und Offline-Kopien ihrer Kanäle; Effektkette, Echo, Hall und Master bleiben live. Aufbau eines Kontexts samt Modul 23–33 ms (V). Er rendert etwa eine Sekunde voraus und hält sich mit regelmäßigen Pausen in diesem Abstand (V, 40 Pausen kosten nichts Messbares).
- **Zufall mit Startwerten:** Die Zufallsaufrufe in den Stimmen (Menschlichkeit, Panorama, Körner, Rhizom, Puls-Gang, Startwerte der Prozessoren) laufen über eine Weiche, die pro Stimme einen eigenen Generator mit festem Startwert einsetzt. Die Prozessoren nutzen schon heute solche Generatoren (V). Gemeinsame Zufallstabellen werden beim Start mit festen Werten gebaut; spät gebaute Tabellen brachen die Gleichheit völlig (V, gemessen).
- **Kosten** (V, Prototyp): Aufnehmen von neun Stereo-Eingängen ≈ 0,4 Einheiten, jede spielende Schicht ≈ 0,13. Gezählt in der Stimmenlast, solange Schleifen spielen, wie beim Gespinst-Netz. Wuchs: 0 Stimmen. Auf deinen Handys nachzumessen.
- **Speicher:** 32-Bit-Gleitkomma, 384 KB/s in Stereo (V). Ein typischer Abend (6 Schleifen × 4 Schichten × 7,7 s, Humus, Wuchs-Puffer) ≈ 100 MB. Obergrenze 300 MB, einstellbar; ist sie erreicht, bietet der Hexenring an, alte Schichten genau zusammenzulegen (**Sediment**, umkehrbar bis dahin). Gemessene Alternative (V): Blockgleitkomma in 16 Bit halbiert den Speicher und bleibt in jedem Block 79–80 dB unter dem Signal; einfaches 16 Bit verliert leise Ausklänge (−4 dB Abstand). Nur mit deiner Zustimmung (§13).
- **Dauerhaft:** IndexedDB, neue Speicher für Schleifen und ihre Klangstücke; geschrieben wird nach jeder Schicht; nach Neuladen oder Absturz „Hexenring wiederhergestellt“. Scheitert der Speicher, bleiben die Schleifen im RAM, und die App sagt es.
- **Bildschirmsperre:** „Hexenring spielt oder nimmt auf“ hält den Audio-Kontext wach, wie heute Puls, Bordun und Aufnahme (V). (A) iOS-Web-Apps können Audio trotzdem anhalten.
- **Prüfungen** (automatisch): exakte Nähte und kein Abdriften über eine Stunde mit Tempowechseln (≤ ½ Sample); keine Klicks an jeder Naht, jedem Einstieg, jeder Stummschaltung (≤ 1,5-fach der Mitte); keine hängenden Töne nach wilden Kombinationen aus Ernten, Überspielen, Rückgängig, Stille, Szenen, Tempo, Presets, Schlafen und verstecktem Tab; Gleichheit (≤ −100 dB); Wuchs unter Last ohne Lücke; Speicher bleibt begrenzt; Wiederherstellung bitgenau; Kosten auf deinen Handys. Die 137 Prüfungen der Fährte werden übernommen.

---

## 11. Etappen

Wie bei den Klangquellen: Etappe für Etappe gebaut, getestet, gepusht und veröffentlicht, bevor die nächste beginnt.

| Etappe | Inhalt |
|---|---|
| **0 · Messtag** | Auf deinen Geräten: Wuchs-Durchsatz, Offline-Rendern in Safari, Bildschirmsperre, Speicher. Ich baue dafür eine kleine Messseite; du öffnest sie einmal auf jedem Gerät. |
| **1 · Fundament** | Takt; Looper-Prozessor; Humus; Korb, Hauptknopf, Halten, Überspielen, Rückgängig, Stummschalten; Nähte; Abdruck mit „Gespielt“; Ringleiste mit Taktlinie; Mixer-Kanal; Stille, Schlafen/Atempause, Speichern; Takt finden, Wiederholung, Korrektur-Chips; MIDI-Ziele, Pedale, Tastatur; Umzug der Fährte. **Danach ist der Hexenring schon ein vollwertiger, verlässlicher Looper.** |
| **2 · Wuchs** | Noten an der Stimmenschicht; Zufall mit Startwerten; Wuchs-Renderer; Folgen von Tonart, Tempo, Klang; Eigensinn Treu/Lebendig; Wurf und Lob; Auslese; Groove; Schleifen-Noten auf dem Feld; Lichtungen und Reigen; Band-Gesten; Verblassen, Abrieb; „Alles“; Export. |
| **3 · Mitspieler** | Variieren, Wandern; Knospen; Rollen; Gärtner „pflegt“ und „antwortet“; Begleiten mit Klangverwandtschaft; Puls lernt; Wiederkehr; Handschrift. **Jedes Verhalten erst nach einem Spieltest mit dir**, bei dem ein Skript oder ich die Rolle des Mitspielers übernehme; gebaut wird nur, was du wiederhaben willst. |
| **4 · Ökologie** | Hyphen in Gespinst, Rhizom, Regen, Körner, dann Glut und Sehne; Treffen und Treffen setzen; Einwurzeln; Kompost; Gärtner „verwildert“; Jahreslauf; Träumen; Mikro-Schleifen; „Live“-Wiedergabe. |

---

## 12. Grenzen, ehrlich

- **Der größte Umbau** steckt in Etappe 2: Die Klangquellen gehen heute von einem einzigen Live-Kontext aus. Körner, Rhizom und Wirbel brauchen einen Weg in virtueller Zeit, Loslassen und Gleiten eine Zeitangabe. Daran hängt der Wuchs (V, Ingenieur).
- **Handy-Durchsatz ist ungemessen.** Die Zahlen stammen von einem Server-Kern; ein Mittelklasse-Handy ist vielleicht zwei- bis viermal langsamer. Dichte Gong-Durchgänge in Stufe 3 passen dann eventuell nicht und bleiben Abdruck (A).
- **Der Wuchs antwortet auf Reglerbewegungen etwa eine Sekunde später**, um den Vorlauf. „Live“ antwortet sofort, kostet aber Stimmen.
- **Gespinst im Wuchs** klingt nur aus den Noten der Schleife; live koppelt das Netz alles. Hörbar ist das nur im Hof.
- **„Gespielt“ ist nach dem Fader:** Eine Schleife, aufgenommen bei geschlossenem Fader, ist stumm. Die Oberfläche sagt es.
- **Schätzungen irren:** dünnes Rubato, ein hohes Bass-Ostinato, ein Arpeggio, das Akkord oder Melodie sein kann. Die Korrekturen gehören zur Funktion, nicht zum Notfall.
- **Form plant nur der Mensch.** Der Gärtner macht Schleifen lebendig, antwortet, holt zurück; ein Lied mit Intro, Aufbau und Rückkehr plant er nicht. Kein Modell, das 2026 offline auf einem Handy läuft, kann das.
- **Harmonie ist Tonleiter-Harmonie:** richtig, manchmal schlicht. Keine Jazz-Reharmonisierung.
- **Bluetooth-Kopfhörer** (100–300 ms) machen Überspielen unmöglich; der Hexenring warnt, ändern kann er es nicht.
- **Keine Klang-KI:** Neuronale Modelle, die Klang erzeugen, laufen im Oktober 2026 nicht offline in einem Handy-Browser (V, `research/intelligence.md` §3). Sie brächten außerdem einen fremden Klang statt Myzels. Die Intelligenz hier ist Musik-Intelligenz auf Notenebene, gebaut aus Verfahren, die man prüfen und verstehen kann.
- **Die Ringleiste kostet 10 % des Spielfelds** auf dem Handy (574 → 519 px bei 360 × 740, V).
- **Plattformen:** iPad und iPhone ohne Web-MIDI; in der claude.ai-Ansicht kein Mikrofon, keine Bewegung, kein MIDI und vielleicht kein Speicher (V).

---

## 13. Deine Entscheidungen

**Die wichtigen:**

1. **Reihenfolge der Etappen** wie in §11, mit dem Messtag auf deinen Geräten zuerst? Und die Mitspieler-Verhaltensweisen (Etappe 3) erst nach Spieltests mit dir?
2. **Wie beginnt eine neue Schleife?** Mein Vorschlag: **Abdruck**, also genau der Klang, den du gehört hast, und automatisch Wuchs, sobald sie folgen soll oder Eigensinn bekommt. Die Alternative: jede Schleife wächst von Anfang an lebendig.
3. **Wuchs in der besten Stufe**, auch wenn du live in Stufe 1 spielst? Dann **erblüht** eine Schleife hörbar, wenn sie vom Abdruck zum Wuchs wechselt: Sie klingt reicher als das, was du gespielt hast. Deine Klangregel spricht dafür, die Treue zum Gespielten dagegen.
4. **Reine Klang-Schleifen bei einem Tempowechsel** (Mikro, „Alles“; Schleifen mit Noten werden ja neu gespielt): Tempo halten (mein Vorschlag als Standard), Band (Tonhöhe geht mit, wie ein Tonband), Schnitt (die Anschläge werden neu gesetzt) oder Dehnen (bestes Zeitdehnen, mit hörbaren Spuren an langen Ausklängen)?

**Die weiteren**, jeweils mit meinem Vorschlag:

5. **Speicher:** 32-Bit-Gleitkomma (genau, ≈ 100 MB an einem typischen Abend, Grenze 300 MB) oder Blockgleitkomma in 16 Bit (halber Speicher, gemessen ≥ 79 dB unter dem Signal)? Vorschlag: 32 Bit.
6. **Der Klang-Humus ab dem ersten Ton** (beste Ernte; auf iPhone und iPad zieht der Klang dafür auf den Worklet-Thread, wie heute schon bei jeder neuen Klangquelle) oder erst nach dem ersten Gebrauch? Vorschlag: ab dem ersten Ton. Der Noten-Humus läuft ohnehin immer.
7. **Die Ringleiste:** 56 px immer sichtbar (10 % des Felds) oder eingeklappt, bis die erste Schleife existiert? Vorschlag: sichtbar; sie ist zugleich das Metrum, das Myzel bisher fehlt.
8. **Der Fährte-Knopf geht**, ihre Aufzeichnung wird die Bewegung jeder Schleife, alte Presets werden umgewandelt? Vorschlag: ja.
9. **Wenden, solange Schleifen laufen = Atempause** (sie kommen auf die Eins zurück)? Vorschlag: ja.
10. **Die Sustain-Buchse als Looper-Pedal**, solange der Hexenring an ist? Dann fehlt sie für Noten. Vorschlag: nur über Zuweisen, nicht automatisch.
11. **nanoKONTROL2:** SET schaltet auf eine Hexenring-Seite um (LED und Feld-Hinweis zeigen es)? Oder nur die freien Tasten? Vorschlag: die Seite.
12. **Die Handschrift:** standardmäßig aus, mit Frage am Ende jeder Sitzung? Vorschlag: ja.
13. **Die Namen:** Hexenring, Schleife, Schicht, Humus, Ernten, Korb, Abdruck, Wuchs, Wurf, Eigensinn, Gärtner, Knospen, Lichtung, Reigen, Ringleiste.
