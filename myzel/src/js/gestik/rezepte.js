/* ---------- Gestik-Rezepte: Presets bringen ihre Gestik mit ---------- */
// A built-in preset may carry a recipe for Gestik: settings of Gestik's own (never a value of the patch) and a few routes
// on the mod layer – [axis, target, amount, with: 'anl' while Anlehnen shapes, 'lad' while Ladung charges]. Switching
// Gestik on is the player's one opt-in: while it is on, the recipe of the preset loaded last acts; loading a preset
// without one, switching Gestik off or "Rezepte der Presets" off brings back exactly the player's own settings (they
// are what is stored meanwhile). The player always wins: a setting changed by hand stays theirs, and a learned binding
// of an axis ("Eigene") rests the recipe's route on it, as it rests Gestik's own functions.
const RZ = {
  tiefsee: { set: { neigen: 'anl' }, mod: [['tiltY', 'bor', 0.7, 'anl']], txt: 'Anlehnen öffnet Nebel und Bordun' },
  tempel: { set: { neigen: 'regen', rgArt: 'keime', rgS: 'glo' }, txt: 'Sporenregen mit Glocke' },
  kristall: { set: { neigen: 'regen', rgArt: 'keime', rgS: 'sai' }, txt: 'Sporenregen mit Saite' },
  pilzregen: { set: { lad: true, tank: true, ras: true, rasS: 'trp' }, txt: 'Ladung als Tank, Rassel-Schläge an' },
  sporen: { set: { neigen: 'anl', seit: 'aus' }, mod: [['tiltX', 'korS', 0.8, 'anl']], txt: 'Neigen fährt durch die Körner' },
  maschine: { set: { lad: true, entl: 0.6, ras: true, rasS: 'mem', rasQ: '16' }, mod: [['ladung', 'rng', 0.7, 'lad']], txt: 'Ladung kurz wie eine Rassel, dazu der Ring' },
  ritual: { set: { lad: true, sw: true }, txt: 'Schwenken lässt die Schalen singen' },
  regenwald: { set: { neigen: 'regen', rgArt: 'keime', rgS: 'trp' }, txt: 'Sporenregen mit Tropfen' },
  kalimbatraum: { set: { neigen: 'regen', rgArt: 'keime', rgS: 'klb' }, txt: 'Sporenregen mit Kalimba' },
  gongbad: { set: { lad: true, sw: true }, txt: 'Schwenken lässt die Gongs singen' },
  glaswiese: { set: { neigen: 'anl' }, mod: [['tiltY', 'hoehe', 0.7, 'anl']], txt: 'Anlehnen = Bogendruck' },
  gespinstgarten: { set: { neigen: 'anl' }, mod: [['tiltY', 'gspK', 0.8, 'anl']], txt: 'Vorneigen hebt die Kopplung des Netzes' },
  kompostgarten: { set: { neigen: 'regen', rgArt: 'keime', rgS: 'mdr' }, txt: 'Sporenregen aus Kompostglocken' },
  atemrohr: { set: { neigen: 'anl', seit: 'aus' }, mod: [['tiltY', 'hoehe', 0.8, 'anl']], txt: 'Vorneigen = Atem, mit Ocarina-Vibrato' },
  hochspannung: { set: { lad: true, ras: true, rasS: 'jrg', rasQ: '16' }, mod: [['ladung', 'pulsD', 0.6, 'lad']], txt: 'Schütteln verdichtet den Puls, Rassel aus Holz' },
  wurzelnetz: { set: { neigen: 'anl' }, mod: [['tiltY', 'rhzR', 0.8, 'anl']], txt: 'Vorneigen macht das Netz reizbar' },
  vogelhain: { set: { neigen: 'anl' }, mod: [['tiltY', 'hoehe', 0.7, 'anl']], txt: 'Anlehnen = Kehldruck' },
  sporenfaehrte: { set: { neigen: 'regen', rgArt: 'keime', rgS: 'klb', rgQ: 'auto' }, txt: 'Sporenregen mit Kalimba, eine Schleife aus Bewegung neigt ihn' },
};
// the recipe that should act: Gestik on, recipes on, the current preset has one
function rzSync() {
  const want = GK.on && GK.p.rez && RZ[GK.p.rzK] ? GK.p.rzK : null, cur = GK.rz ? GK.rz.key : null;
  if (want === cur) return false;
  const was = GK.p.neigen;
  if (GK.rz) { Object.assign(GK.p, GK.rz.own); GK.rz = null; for (let i = 0; i < 4; i++) gkRoute('rz.' + i, null); }   // the player's own back
  if (want) {
    const R = RZ[want], own = {};
    for (const k in R.set) if (GK.p[k] !== R.set[k]) { own[k] = GK.p[k]; GK.p[k] = R.set[k]; }
    GK.rz = { key: want, own };
    (R.mod || []).forEach(([axis, target, amt, w], i) => gkRoute('rz.' + i, { axis, target, amt, on: w === 'lad' ? ladOn : () => GK.p.neigen === 'anl' }));
  }
  gkCheck();
  if (GK.R) GK.R.set({ entl: GK.p.entl });
  gkNeigen(was);
  gkSave();
  if (GK.on) gkUpdate(performance.now(), []);
  gkCardSync();
  if (MX.root) mxSrcAll();
  return true;
}
// a preset was loaded: its recipe is the current one (none for the player's own presets and files)
function rzPreset(p) {
  const k = p && p.key && RZ[p.key] ? p.key : null;
  if (k === GK.p.rzK) return;
  GK.p.rzK = k;
  if (!rzSync() && (GK.on || GK.want || store.get(GK_KEY) != null)) gkSave();   // remembered for when Gestik comes on
}
// what loading says when a recipe acts
const rzSay = () => (GK.rz ? ' Gestik-Rezept: ' + RZ[GK.rz.key].txt + '.' : '');
function rzCardSync(C) {
  const R = GK.rz && RZ[GK.rz.key], pre = R && PRESETS.find((p) => p.key === GK.rz.key);
  if (C.rez.getAttribute('aria-checked') !== String(GK.p.rez)) C.rez.setAttribute('aria-checked', String(GK.p.rez));
  const t = R ? 'Rezept von „' + (pre ? pre.name : GK.rz.key) + '“: ' + R.txt + '. Was du selbst änderst und deine Zuweisungen gehen vor; ein Preset ohne Rezept bringt deine eigenen Einstellungen zurück.'
    : GK.p.rez ? 'Manche Presets bringen ein Gestik-Rezept mit – etwa Tempelglocken (Sporenregen mit Glocke) oder Pilzregen (Ladung als Tank). Es wirkt, solange Gestik an ist.' : 'Rezepte aus: Presets lassen deine Gestik-Einstellungen, wie sie sind.';
  if (C.rzTxt.textContent !== t) C.rzTxt.textContent = t;
}
// the demo "Sporenregen + Fährte": a Fährte that leans the rain to and fro over two bars – the rain plays itself (once
// Gestik is on; on a computer without a sensor too)
function rzDemoFae() {
  const n = 2 * 4 * FA_R, x = new Float32Array(n), y = new Float32Array(n);
  for (let i = 0; i < n; i++) { const a = (2 * Math.PI * i) / n; x[i] = 0.55 * Math.sin(a); y[i] = 0.2 * Math.sin(2 * a + 0.6); }
  const ex = faeEnc(x), ey = faeEnc(y);
  return { v: 1, R: FA_R, n, g: 1, lanes: [{ k: 'rgx', s: 'gk:regen.x', d: ex }, { k: 'rgy', s: 'gk:regen.y', d: ey }], disp: { tx: ex, ty: ey } };
}

