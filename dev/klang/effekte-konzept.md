# Effekte für Myzel – Konzept (26.10.2026)

Auslöser: Der Besitzer fand die Handpan „verzerrt“ und fragte, ob Myzel neue Effekte braucht, um Klänge
authentischer zu machen. Außerdem klingen aufgenommene Schleifen für ihn anders und ebenfalls verzerrt.
Er will das gründlich durchdacht haben. Gewählt hat er bisher: Raummodelle, Korpus-Resonator,
Mikrofon-Perspektive und Transienten-Former.

Leitlinie (Regel des Besitzers): **immer die beste Klangqualität.** Rechenzeit wird gemessen und ehrlich
angegeben, ist aber nie ein Grund, an der Qualität zu sparen.

---

## 1. Befund

### 1.1 Geerbte Grundeinstellungen – die eigentliche Ursache für „unecht“

Ein Preset setzt nur die Werte, die es nennt. Alles andere kommt aus den Grundeinstellungen der App.
Bisher waren einige Effekte in der Grundeinstellung **an** – also liefen sie in fast jedem Preset mit,
ohne dass das jemand für dieses Preset entschieden hatte:

| Effekt | Grundwert | Presets mit eigenem Wert | erben ihn (von 47) |
|---|---|---|---|
| Verzerrung (Röhre) | 12 % · Anteil 35 % | 6 | 41 – **behoben 26.10.** |
| Phaser | Anteil 25 % | 6 | 41 |
| Chorus | Anteil 30 % | 15 | 32 |
| Filter-Welle | 0,6 Oktaven | 6 | 41 |
| Vibrato | 4 Cent | 2 | 45 |
| Taumeln (Drift) | 6 Cent | 7 | 40 |
| Kreisen (Auto-Pan) | 25 % | 9 | 38 |
| Summen-Verdichtung | 35 % | 1 | 46 |

Für Flächen und Synthesizer ist diese Mischung ein warmer, bewegter Grundton. Bei akustischen
Klangquellen wirkt sie dagegen falsch:
- Eine Handpan, eine Koto, Gamelan-Bronzen oder eine Kalimba haben kein Vibrato.
- Sie haben keinen Phaser-Wirbel und keinen wandernden Filter.
- Ihre Stimmung „taumelt“ nicht.

Genau das macht sie unecht – noch vor jedem fehlenden Effekt.

### 1.2 Der Hall ist ein allgemeiner Nebelhall

`genIR` baut die Impulsantwort aus gefiltertem Rauschen mit exponentiellem Abklingen und 12 zufälligen
frühen Reflexionen. Daraus folgt:
- Es gibt keine Raumgeometrie und damit keine glaubhaften frühen Reflexionen.
- Die Abklingzeit hängt nicht von der Frequenz ab, es gibt nur einen Tiefpass, der mit der Zeit schließt.
- Die Diffusion baut sich nicht auf.
- Die frühen Reflexionen hängen nicht von der Lage der Quelle ab.

Für Sphären klingt das schön. Ein Instrument verortet es aber nicht in einem Raum.

### 1.3 Der Summen-Begrenzer verzerrt bei lautem Material

Die Summe endet in einem WaveShaper-Clipper:
- Er ist linear bis −2,5 dBFS, darüber kommt ein tanh-Knie.
- Er arbeitet **ohne Überabtastung** (`oversample = 'none'`).
- Die Summe hat dazu +2 dB Grundpegel.

Spielen mehrere Schleifen und das Live-Spiel zusammen, steigt die Summe. Dann formt der Clipper ständig
und erzeugt Verzerrung und Aliasing. Das ist der wahrscheinlichste Grund, warum die Schleifen
„verzerrt“ klingen.

Gemessen in Chromium: Eine einzelne Schleife klingt wie live, Pegel und Oktavbänder ±1 dB. Nur unter
80 Hz fehlen der Schleife 3 dB. Firefox ist ungeprüft.

### 1.4 Was es schon gibt

- **Kette:** Verzerrung → Ringmodulator → Filter → Phaser → Chorus → Auto-Pan, dazu Echo und Hall als
  Rückwege.
- **Mixer:** Kanal-EQ mit Tiefen-/Höhenschnitt und drei Bändern, Sends, Pumpen.
- **Summe:** Tiefen, Höhen, Breite, Glue-Kompressor, Clipper.
- **Klangquellen mit eigenem Effekt:** Schimmer (Oktav-Hall), Gespinst (Saitennetz), Freeze.

---

## 2. Grundsatz

**Sauber als Grundeinstellung, jeder Effekt eine Entscheidung des Presets.** Die geerbten
Modulations-Effekte werden neutral (0). Jedes Preset bekommt ausdrücklich die Effekte, die zu seinem
Charakter gehören:
- Flächen und Sphären behalten ihre Bewegung. Ihr bisheriger Klang wird ausdrücklich ins Preset
  geschrieben und bleibt dadurch gleich.
- Akustische Welten werden sauber.

---

## 3. Neue Effekte

### 3.1 Raum – Raummodelle mit Mikrofon-Perspektive (größte Wirkung)

Der Raum ersetzt den Nebelhall nicht, sondern erweitert ihn: Der bisherige Hall bleibt als Raumtyp
„Nebel“ erhalten, damit Sphären-Presets gleich klingen.

**Technik:**
- Eine Impulsantwort wird pro Raum synthetisiert und über einen ConvolverNode gefaltet. Faltung ist die
  beste Qualität bei geringer Rechenlast, weil sie FFT-basiert läuft.
- **Frühe Reflexionen:** Spiegelquellen bis zur zweiten oder dritten Ordnung in einem Quaderraum,
  getrennt fürs linke und rechte Mikrofon. Jede Wand absorbiert je nach Material frequenzabhängig.
- **Nachhall:** dicht und diffus, mit eigener Abklingzeit für tiefe, mittlere und hohe Frequenzen. Leicht
  moduliert, damit nichts metallisch klingt. Die Echodichte baut sich realistisch auf.
- **Raumtypen:**
  - Kammer
  - Holzsaal
  - Steinkuppel / Tempel
  - Kathedrale
  - Höhle
  - Platte
  - Federhall
  - Freifeld (nur Boden und Bäume, kaum Nachhall)
  - Nebel (der bisherige Hall)

**Mikrofon-Perspektive** (Teil des Raums):
- **Abstand:** nah, mittel oder fern. Das verschiebt das Verhältnis von Direktklang, frühen
  Reflexionen und Nachhall und dämpft die Höhen mit der Entfernung wie die Luft.
- **Position:** wo das Instrument auf der Bühne steht.
- **Mikrofonbreite:** von nah beieinander bis weit gespreizt.

**Regler:** Raum, Größe, Nachhall (tief/mittel/hoch), Abstand, Position, Breite, Anteil.

**Kosten:** Faltung pro Raum. Eine neue Impulsantwort wird im Hintergrund berechnet, wenn sich ein
Regler ändert, und ohne Knacken übergeblendet.

### 3.2 Korpus – der mitschwingende Klangkörper

**Technik:**
- Eine modale Resonatorbank mit 12–32 Moden in einem AudioWorklet: Bandpass-Resonatoren mit eigener
  Frequenz, Güte und Abklingzeit.
- Optional werden die Moden auf die Tonleiter gestimmt. Dann klingen Töne der Tonart mit wie die
  Tarab-Saiten einer Sitar oder die Schale einer Handpan.

**Korpusse:**
- Stahlschale (Handpan)
- Holzkorpus (Koto, Sitar, Gitarre)
- Bronze (Gamelan, Gong)
- Fell (Trommel, Tabla)
- Glas
- Kürbis (Kalimba)

**Regler:** Korpus, Größe, Mitschwingen in der Tonleiter, Dämpfung, Anteil.

### 3.3 Transienten-Former

**Technik:**
- Zwei Hüllkurvenfolger, ein schneller und ein langsamer. Ihre Differenz erkennt den Anschlag.
- Daraus folgt eine Verstärkung für Anschlag ± und Ausklang ±, ohne Pumpen und mit Vorausschau.

Damit werden Schlaginstrumente knackig oder weich und Gongs länger oder kürzer.

**Regler:** Anschlag, Ausklang. Pro Kette und auch pro Mixer-Kanal einsetzbar.

**Gebaut (29.10.2026, je Mixer-Kanal, `myzel-trans`, Karte „Anschlag“ im Fruchtkörper; ohne Vorausschau – kein Delay im
Kanal).** 30.10.: die langsame Hüllkurve lässt mit 0,8 s statt 0,15 s los – vorher folgte sie einem 0,4-s-Ausklang selbst und
„Ausklang“ tat nichts (gemessen: jetzt −4,6 dB bei 300 ms für τ 0,4 s, −2,5 dB bei 500 ms für τ 1 s). Test `v2/t-formen-dsp.js`.

### 3.3a Verdichter je Kanal (gebaut 30.10.2026)

`myzel-komp` (dsp/kompressor.js) nach dem Transienten-Former: Spitzen-Detektor beider Seiten (ein Gain für beide),
Anschlag 0,1–100 ms, Loslassen 10–2000 ms (nach langem Druck bis dreimal so lang), Schwelle, Verhältnis 1–20 (1 = aus,
bitgenau durch), Knie 0–24 dB, Ausgleich −12…+24 dB, Anteil (parallel). Ohne Vorausschau. Kosten 1,1 Einheiten im Betrieb
(gemessen), 0 bei 1:1. Karte „Verdichter“ im Fruchtkörper mit der Reduktion der letzten 3 s. Die Summen-Verdichtung bleibt.

### 3.4 Summe: transparenter Begrenzer statt Clipper (Pflicht, keine Option)

**Technik:**
- Ein True-Peak-Limiter mit Vorausschau (≈ 3 ms) und 4-fach überabgetasteter Spitzenerkennung, als
  AudioWorklet.
- Er ersetzt den Clipper und regelt die Spitzen sauber, statt sie zu verformen.

**Dazu kommt ein Pegelhaushalt für den Hexenring:** Je mehr Schleifen spielen, desto mehr Spielraum
bekommt die Summe automatisch, damit vier Schleifen und das Live-Spiel nicht in den Begrenzer drücken.

**Gebaut (30.10.2026, `hexenring/haushalt.js`) – aber nach Messung anders als oben:** vier dichte Schleifen plus
Live-Spiel (Handpan-Kreis, Kalimbatraum, Kurzwellenritual, Chromium) halten die Summe bei −2 … −8 dBFS, der Begrenzer
bleibt untätig – die Summen-Verdichtung fängt es vorher ab. Ein Trim nach der Zahl der Schleifen hätte nur leiser gemacht,
ohne Not. Darum regelt der Haushalt nach dem, was der Begrenzer wirklich tut: meldet er > 1,5 dB Reduktion, während
Schleifen spielen – oder hält die Summen-Verdichtung mehr als 10 dB (ihre üblichen 5–9 dB unter einer vollen Summe sind
ihre Arbeit, gemessen) –, geht der Kanal „Hexenring“ langsam zurück (1 dB/s, ab 4 dB 2 dB/s, höchstens −6 dB); ist es
6 s ruhig, kommt er mit ½ dB/s zurück, ohne spielende Schleife mit 2 dB/s. Gerät-Einstellung `hx.haushalt` (an), sichtbar
im Kanaltext („Spielraum −2 dB“) und in Leistung. Test `t-hx-haushalt.js`.

### 3.5 Später sinnvoll

Nicht jetzt, aber auf der Liste:
- **Sättigung neu:** eine überabgetastete Band- oder Pult-Sättigung für Wärme, wo gewollt. Die
  Röhre bleibt für die harten Fälle.
- **Raum für die Schleifen:** Schleifen können in einem eigenen Raum klingen, etwa als Echo der Ernte im
  Steinraum.
- **Harmonizer / Oktavierer** für Stimmen.

---

## 4. Etappen

| Etappe | Inhalt | ändert vorhandene Klänge hörbar? |
|---|---|---|
| A | Summen-Begrenzer und Pegelhaushalt der Schleifen | ja: sauberer bei vielen Schleifen, kein Lautheitsverlust |
| B | Neutrale Grundeinstellungen; Bewegung bewusst in die Presets, die sie brauchen | ja: akustische Presets klarer, Flächen gleich |
| C | Raummodelle mit Mikrofon-Perspektive; akustische Presets bekommen ihren Raum | ja: nur dort, wo ein Raum zugewiesen wird |
| D | Korpus-Resonator; Handpan, Koto, Sitar, Gamelan, Kalimba bekommen ihren Korpus | ja: nur diese |
| E | Transienten-Former | nein: neue Möglichkeit, dann behutsam in Presets |

Jede Etappe wird gemessen: Rechenzeit und ein Klangvergleich vorher/nachher als Hörbeispiel (WAV).
Bei hörbaren Änderungen an Presets fragt Claude vorher.

## 5. Vorschlag, welche Welt welchen Raum und Korpus bekommt

- **Handpan-Kreis:** Holzsaal oder Steinkuppel, mittlerer Abstand; Stahlschale, in der Tonleiter
  mitschwingend.
- **Bali-Nacht:** Freifeld mit wenig Nachhall, fern; Bronze.
- **Kirschblüte:** Holzsaal, nah; Holzkorpus.
- **Ganges-Dämmerung:** Steinkuppel; Holzkorpus mit Tarab-Mitschwingen.
- **Gongbad:** Kathedrale oder Steinkuppel; Bronze.
- **Kalimbatraum:** Kammer, nah; Kürbis.
- **Tempelglocken:** Steinkuppel, fern.
- **Kristallhöhle:** Höhle.
- **Flächen, Sphären und Nordlicht:** bleiben beim Nebelhall.
