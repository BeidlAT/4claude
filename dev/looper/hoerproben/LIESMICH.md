# Hörproben zum Hexenring

Vier kurze Stücke, mit denen du drei Ideen aus `../KONZEPT.md` mit den Ohren entscheiden kannst: **Treu**, **Lebendig** (§5.4) und **Wuchs in Stufe 3** (§4.2, §13 Frage 3).

Alle vier sind gleich gebaut:
- **Tempo und Tonart:** 84 bpm, eine Phrase von zwei Takten (5,7 s), D-Moll-Pentatonik (Myzels Standard).
- **Effekte:** Myzels Standard-Hall und -Echo; das Echo läuft im Tempo.
- **Format:** −16 LUFS, 48 kHz Stereo, AAC mit 256 kb/s.
- **Kopfhörer** sind besser, denn Stufe 3 klingt vor allem breiter.

**So ist eine Datei gebaut:** Jeder Durchgang ist ein eigenes Offline-Rendern ab Sample 0, so wie ein Wuchs-Durchgang. Die Durchgänge liegen Stoß an Stoß, und der Nachklang jedes Durchgangs klingt in die folgenden hinein. Am Dateianfang klingt schon der Nachklang desselben Durchgangs, als liefe die Schleife bereits.

**Der Wurf** ist der Startwert für den Zufall der Stimmen: Verstimmungen, die Startwerte der Prozessoren, den Weg der Lawine. Der Hall ist in jedem Durchgang derselbe.

## 1 · Böe: treu, dann lebendig (`1-boe-treu-dann-lebendig.m4a`, 0:41)

Die Windharfe spielt in Stufe 3. Ein D3 hält beide Takte, darüber liegt A3, im zweiten Takt kommen C4 und F4. Böen stehen auf 65 % (Standard 40 %), damit der Wind weiter wandert.

| Zeit | Was du hörst |
|---|---|
| 0:00–0:05,7 | Durchgang 1, Wurf A |
| 0:05,7–0:11,4 | Durchgang 2, gleicher Wurf: **identisch** |
| 0:11,4–0:34,3 | Durchgänge 3–6 (Wechsel bei 0:17,1 · 0:22,9 · 0:28,6), **je ein neuer Wurf** |
| 0:34,3–0:41 | Ausklang |

**Was sich ändert:** Bei der Böe ist der Unterschied fein.
- **Erster Takt:** Alle Würfe fangen dieselben Saiten. Anders sind nur das Rauschen und das Atmen des Winds.
- **Zweiter Takt:** Hier singt das tiefe D je nach Wurf einen anderen Teilton (gemessen):
  - in Durchgang 1 und 2 den 7. (≈ 1030 Hz),
  - in 3–5 den 5. (≈ 734 Hz, die große Terz),
  - in 6 den 4. (D5).

## 2 · Rhizom: treu, dann lebendig (`2-rhizom-treu-dann-lebendig.m4a`, 0:40)

Fünf Anschläge (D4, A3, G4, G3, A4) in Stufe 3, Reiz 62 %. Jeder Anschlag stößt eine Lawine durch das Netz der Tonstufen an.

Die Zeiten sind dieselben wie bei der Böe: Durchgang 1 und 2 sind identisch, 3–6 haben je einen neuen Wurf, ab 0:34,3 folgt der Ausklang.

Pings je Anschlag (mit dem Anschlag selbst):

| Durchgang | D4 | A3 | G4 | G3 | A4 | Was auffällt |
|---|---|---|---|---|---|---|
| 1 und 2 | 11 | 8 | 10 | 7 | 9 | identisch |
| 3 | 7 | **1** | 9 | 6 | 10 | Das A3 bleibt allein. |
| 4 | 10 | 9 | 10 | **2** | **3** | Der zweite Takt ist fast still. |
| 5 | 7 | 8 | 10 | 3 | 4 | |
| 6 | 10 | 6 | **2** | 10 | 4 | |

Hier hört man Lebendig deutlich.

## 3 · Harz (Glas): Stufe 1, dann Stufe 3 (`3-harz-stufe1-dann-stufe3.m4a`, 0:29)

Gestrichenes Glas: d-Moll (D3 A3 F4), dann F-Dur (F3 C4 A4) mit einem G4. Alle vier Durchgänge haben denselben Wurf.

| Zeit | Was du hörst |
|---|---|
| 0:00–0:05,7 | Stufe 1 |
| 0:05,7–0:11,4 | Stufe 1 (identisch) |
| 0:11,4–0:17,1 | **Stufe 3**. Anfangs klingt noch der Nachklang aus Stufe 1 mit: So klänge das „Erblühen“ an der Naht. |
| 0:17,1–0:22,9 | Stufe 3 (identisch) |
| 0:22,9–0:29 | Ausklang |

**Was Stufe 3 hinzufügt** (laut Code):
- Jede Glas-Mode ist ein Paar aus ihren zwei Lagen, und die beiden schweben gegeneinander. In Stufe 1 ist nur der Grundton ein Paar.
- Es klingen 5 statt 4 Moden.
- Das kreisende Muster wird von zwei Hörern gehört, also in Stereo. In Stufe 1 gibt der Prozessor Mono aus.
- Der Hall ist echtes Stereo mit 4 Kanälen statt 2.

**Gemessen:**
- gleiche Lautheit (−0,2 dB),
- Seite/Mitte von −7,3 auf −3,4 dB (deutlich breiter),
- Klangschwerpunkt von 248 auf 272 Hz.

## 4 · Gong: Stufe 1, dann Stufe 3 (`4-gong-stufe1-dann-stufe3.m4a`, 0:36)

Gongs: D3+A3, ein leises F4, dann F3+C4 und ein leises A4. Die Zeiten sind dieselben wie beim Harz; der Ausklang reicht bis 0:36, weil Gongs etwa 14 s klingen.

**Was Stufe 3 hinzufügt:** Die Moden zweier Platten klingen, um 2,3 % gegeneinander gestreckt, links und rechts, jede mit eigener Schwebung. Dazu kommt der Hall in echtem Stereo.

**Gemessen:**
- +0,6 dB lauter,
- Seite/Mitte von −6,3 auf −5,9 dB,
- Klangschwerpunkt von 327 auf 273 Hz: dunkler und dichter, kaum breiter.

Unter den Stufe-3-Durchgängen klingen noch die Gongs aus Stufe 1 nach. So wäre es auch in einer echten Schleife.

## Messungen

Gemessen wurde jeder ganze Durchgang samt Nachklang, aus `render.js`.

| | Böe | Rhizom | Harz | Gong |
|---|---|---|---|---|
| gleicher Wurf, Durchgang 2 gegen 1 | −102,5 dB | −101,5 dB | −100,9 dB | −103,7 dB |
| neuer Wurf gegen Durchgang 1 (Wellenform) | +2,7 bis +3,3 dB | +0,5 bis +1,7 dB | – | – |
| neuer Wurf, Abweichung im Terzband-Spektrum | 2,5–3,5 dB | 5,2–6,1 dB | – | – |
| Stufe 3 gegen Stufe 1 (Wellenform / Spektrum) | – | – | +4,6 dB / 3,0 dB | +3,3 dB / 3,0 dB |

So liest du die Tabelle:
- **Gleicher Wurf:** Die Durchgänge sind nicht bitgleich, aber weit unter jeder Hörschwelle. Das passt zu §4.2.
- **Neuer Wurf:** Werte um 0 dB und darüber heißen, dass die Wellenformen unkorreliert sind; die Differenz ist so laut wie das Signal selbst.
- **Spektrum:** Die Abweichung im Terzband-Spektrogramm (Fenster 85 ms) ist bei gleichem Wurf 0 dB.
- **Stimmenlast:** Die Stufe-1-Phrasen passten auch in das Stimmenbudget eines Handys (höchstens 12,0 Einheiten beim Harz und 9,3 beim Gong; das Budget ist 14).

## Was diese Proben nicht zeigen

- **Live gegen neu gespielt:** Alle Durchgänge sind Offline-Renderungen, auch Durchgang 1, der hier schon ein Wuchs ist. Den Unterschied zwischen einem *live* gespielten Durchgang und einem neu gespielten (vom **Abdruck** zum **Wuchs**) kann man so nicht vorführen. Live kommen Gestik, dein Timing, gestohlene Stimmen und die Last des Geräts dazu, und der Abdruck ist das, was du wirklich gehört hast. Ob der Wuchs dann wie der Abdruck klingt, hängt davon ab, ob der live gespielte Wurf mit aufgezeichnet wird.
- **Atmendes Timing:** Das gehört laut §5.4 zu Lebendig, fehlt hier aber. Nur der Wurf ändert sich, die Noten sitzen genau im Raster.
- **Gerät:** Gerendert wurde auf einem Server mit Chromium (headless), nicht auf einem Handy. Die Seite lief aber als Handy, deshalb ist Stufe 1 die Stufe 1 eines Handys. Das Stimmenbudget war zum Rendern aufgehoben.

## Neu rendern

Die WAV-Dateien (24 bit, je 8–12 MB) liegen nicht im Repo. `render.js` erzeugt sie neu, zusammen mit den `.m4a` und einem `report.json`:
1. Test-Umgebung einrichten, wie in `dev/HANDOFF.md` beschrieben: `sh dev/setup-tests.sh <scratchpad>`.
2. `sh <scratchpad>/v2/mk.sh myzel hp`
3. `node render.js AUSGABEORDNER`
