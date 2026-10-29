/* ---------- Die Räume des Halls (owner, 29.10.2026: „die Räume realistisch – und Spezial-Hallräume, gerne ganz
   ausgefallene Sachen“) – the choice „Raum“ (rev.typ): Nebel is the hall as it always was; the real rooms are measured
   ones (OpenAIR, University of York, CC BY 4.0 – myzel/raeume/<id>.flac, made by dev/tools/raeume.py, loaded the first
   time one is chosen); the computed ones come from their geometry (genRoom), the special ones are designed (genSpecial).
   art: nebel | echt | gerechnet | besonders; t: a real room's reverberation at 500 Hz (s, measured – in its name, since
   some are small and dry: a cave, a forest). ---------- */
const RAUM_LISTE = [
  { id: 'nebel', name: 'Nebel', art: 'nebel', i: 'Der bisherige Hall: ein weicher Nebel ohne Wände – Nachhallzeit und Dämpfung frei' },
  // measured (ort: where; the app names it under the choice)
  { id: 'kathedrale', t: 7.7, name: 'Kathedrale', art: 'echt', ort: 'York Minster, England' },
  { id: 'steinkuppel', t: 12.4, name: 'Steinkuppel', art: 'echt', ort: 'Hamilton Mausoleum, Schottland – einer der längsten Nachhalle der Welt' },
  { id: 'kirchenschiff', t: 1.5, name: 'Kirchenschiff', art: 'echt', ort: "St Margaret's Church, York" },
  { id: 'kirche', t: 1.9, name: 'Dorfkirche', art: 'echt', ort: "St Patrick's Church, Patrington" },
  { id: 'kapelle', t: 2.5, name: 'Kapelle', art: 'echt', ort: 'Lady Chapel, St Albans Cathedral' },
  { id: 'konzertsaal', t: 2.0, name: 'Konzertsaal', art: 'echt', ort: 'Usina del Arte, Buenos Aires' },
  { id: 'saal', t: 1.8, name: 'Kleiner Saal', art: 'echt', ort: 'Jack Lyons Concert Hall, York' },
  { id: 'marmorhalle', t: 4.2, name: 'Marmorhalle', art: 'echt', ort: 'Elveden Hall, Suffolk' },
  { id: 'ratssaal', t: 0.9, name: 'Ratssaal', art: 'echt', ort: 'York Guildhall, Council Chamber' },
  { id: 'kammer', t: 0.8, name: 'Kammer', art: 'echt', ort: 'Elveden Hall, Suffolk (Rauchzimmer)' },
  { id: 'treppenhaus', t: 1.2, name: 'Treppenhaus', art: 'echt', ort: 'University of York' },
  { id: 'reaktorhalle', t: 5.2, name: 'Reaktorhalle', art: 'echt', ort: 'R1, Stockholm – der erste Forschungsreaktor Schwedens' },
  { id: 'steinkammer', t: 0.55, name: 'Steinkammer', art: 'echt', ort: 'Maeshowe, Orkney – Grabkammer, 5000 Jahre alt' },
  { id: 'ganggrab', t: 0.23, name: 'Ganggrab', art: 'echt', ort: 'Newgrange, Irland' },
  { id: 'verlies', t: 1.6, name: 'Verlies', art: 'echt', ort: 'Falkland Palace, Flaschenverlies' },
  { id: 'kalkofen', t: 0.8, name: 'Kalkofen', art: 'echt', ort: 'Hoffmann-Kalkofen, Langcliffe' },
  { id: 'tunnel', t: 2.6, name: 'Tunnel', art: 'echt', ort: 'Innocent Railway Tunnel, Edinburgh' },
  { id: 'stollen', t: 0.4, name: 'Stollen', art: 'echt', ort: 'Gill Heads Mine, Yorkshire' },
  { id: 'hoehle', t: 0.7, name: 'Höhle', art: 'echt', ort: 'Creswell Crags, England' },
  { id: 'schlucht', t: 0.7, name: 'Schlucht', art: 'echt', ort: "Troller's Gill, Yorkshire Dales" },
  { id: 'sommerwald', t: 1.1, name: 'Sommerwald', art: 'echt', ort: 'Koli-Nationalpark, Finnland' },
  { id: 'winterwald', t: 0.5, name: 'Winterwald', art: 'echt', ort: 'Koli-Nationalpark, Finnland – im Schnee' },
  { id: 'klangskulptur', t: 1.9, name: 'Klangskulptur', art: 'echt', ort: 'Tvísöngur, Seyðisfjörður, Island' },
  // computed from geometry (genRoom: box W × D × H m, surfaces x-, x+, y-, y+, floor, ceiling; T: its reverberation per
  // octave as rooms of that kind have it; src and mic at their places – Abstand moves them)
  { id: 'r-holzsaal', name: 'Holzsaal', art: 'gerechnet', o: { dim: [30, 20, 12], mat: ['holz', 'holz', 'holz', 'holz', 'holzboden', 'holz'], T: [1.9, 1.8, 1.7, 1.6, 1.5, 1.3, 1.0], scat: 0.5 } },
  { id: 'r-steinhalle', name: 'Steinhalle', art: 'gerechnet', o: { dim: [36, 18, 16], mat: ['stein', 'stein', 'stein', 'stein', 'stein', 'stein'], T: [4.2, 4.3, 4.1, 3.8, 3.2, 2.4, 1.5], scat: 0.4 } },
  { id: 'r-glashaus', name: 'Glashaus', art: 'gerechnet', o: { dim: [20, 10, 7], mat: ['glas', 'glas', 'glas', 'glas', 'erde', 'glas'], T: [1.2, 1.4, 1.7, 2.0, 2.1, 1.9, 1.5], scat: 0.15 } },
  { id: 'r-holzhuette', name: 'Holzhütte', art: 'gerechnet', o: { dim: [5, 4, 2.6], mat: ['holz', 'holz', 'holz', 'holz', 'holzboden', 'holz'], T: [0.5, 0.45, 0.4, 0.38, 0.35, 0.32, 0.28], scat: 0.35 } },
  { id: 'r-fliesenbad', name: 'Gekacheltes Bad', art: 'gerechnet', o: { dim: [4, 3, 2.6], mat: ['fliese', 'fliese', 'fliese', 'fliese', 'fliese', 'putz'], T: [1.4, 1.5, 1.6, 1.6, 1.5, 1.3, 1.0], scat: 0.1 } },
  { id: 'r-silo', name: 'Silo', art: 'gerechnet', o: { dim: [8, 8, 30], mat: ['beton', 'beton', 'beton', 'beton', 'beton', 'beton'], T: [6, 6.5, 6.5, 6, 5, 3.5, 2], scat: 0.2 } },
  { id: 'r-freifeld', name: 'Freifeld', art: 'gerechnet', o: { dim: [300, 300, 60], mat: ['luft', 'luft', 'luft', 'luft', 'wiese', 'luft'], T: [0.25, 0.22, 0.2, 0.18, 0.16, 0.14, 0.12], scat: 0.6 } },
  // designed (genSpecial)
  { id: 's-platte', name: 'Platte', art: 'besonders', i: 'Eine Hallplatte: dicht vom ersten Moment an, hell, ohne Raum davor' },
  { id: 's-feder', name: 'Federhall', art: 'besonders', i: 'Eine Feder: Zirpen, die hin und her laufen – das weiche Boing der alten Verstärker' },
  { id: 's-rueckwaerts', name: 'Rückwärts', art: 'besonders', i: 'Der Hall schwillt in den Ton hinein und bricht ab' },
  { id: 's-gatter', name: 'Gatter', art: 'besonders', i: 'Dicht und gleich laut für eine Viertelsekunde, dann weg – die Achtziger' },
  { id: 's-geflecht', name: 'Myzelgeflecht', art: 'besonders', i: 'Winzige Echos breiten sich aus wie ein Pilzgeflecht – erst vereinzelt, dann immer dichter, glitzernd' },
  { id: 's-unterwasser', name: 'Unter Wasser', art: 'besonders', i: 'Die Höhen sofort verschluckt, die Tiefen klingen in langsamen Schwebungen nach' },
  { id: 's-eis', name: 'Eiskristall', art: 'besonders', i: 'Die Tiefen kurz, die Höhen klingen lange – und funkeln' },
  { id: 's-spiegel', name: 'Spiegelkabinett', art: 'besonders', i: 'Zwei Paar Wände, die sich anflattern – metallisch, jeder Rückwurf etwas dunkler' },
  { id: 's-sterne', name: 'Sternenstaub', art: 'besonders', i: 'Ferne, einzelne Lichter im Dunkel – lang und spärlich' },
  { id: 's-rohr', name: 'Riesenrohr', art: 'besonders', i: 'Ein 40 m langes Rohr: der Klang läuft hin und zurück, jedes Mal dunkler' },
  { id: 's-glocke', name: 'Glockenkammer', art: 'besonders', i: 'Der Raum klingt in der Tonart mit – die Teiltöne einer Glocke auf dem Grundton' },
  { id: 's-tropfstein', name: 'Tropfsteinhöhle', art: 'besonders', i: 'Ein feuchter, langer Hall – hier und da fällt ein Tropfen hinein' },
  { id: 's-krypta', name: 'Kirche mit Krypta', art: 'besonders', i: 'Ein heller Raum sofort, ein dunkler, langer darunter' },
  { id: 's-nebelbank', name: 'Nebelbank', art: 'besonders', i: 'Der Hall steigt langsam auf, wie von weit her, und bleibt' },
  { id: 's-unendlich', name: 'Unendlich', art: 'besonders', i: 'Ein Hall, der kaum endet – weich, ein wenig dunkel' },
];
const RAUM_ART = { nebel: 'Nebel', echt: 'Echte Räume', gerechnet: 'Gerechnete Räume', besonders: 'Besondere Räume' };
const RAUM_BY = Object.fromEntries(RAUM_LISTE.map((r) => [r.id, r]));
