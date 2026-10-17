// Final QA screenshots (gq), not a test: every Gestik card state on the phone (390×844 portrait and landscape), the
// iPad (1180×820) and the desktop (1280×800) – the view as it is (field or panel) and the whole card (a tall window of
// the same width) → final/<vp>-<state>[-card|-field].png      node shot-gq.js [vp,vp…|all] [state,state…|all]
// (contact sheets: python3 sheet-gq.py)
const H = require('./gk-h');
const fs = require('fs');
const URL = process.env.GQ || 'http://127.0.0.1:8790/gq-inst/index.html';
const dir = __dirname + '/final/';
fs.mkdirSync(dir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const IPAD_UA = 'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const DROID_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36';
const VPS = {
  p390: { width: 390, height: 844, touch: true, mobile: true, dsf: 2, ua: DROID_UA },
  land: { width: 844, height: 390, touch: true, mobile: true, dsf: 2, ua: DROID_UA, angle: 90 },
  ipadL: { width: 1180, height: 820, touch: true, mobile: true, dsf: 1, ua: IPAD_UA, ios: true },
  desk: { width: 1280, height: 800 },
};
// per state: the permission mock and what to do once the app runs
const ST = {
  off: { cfg: {}, on: false },
  ask: { cfg: { perm: 'hang' } },
  live: { cfg: { perm: 'granted' }, run: async (page) => { await sensor(page, { beta: 52, roll: 0 }); await sleep(900); await page.evaluate(() => window.__setPose({ beta: 40, roll: 13 })); await sleep(500); } },
  anl: { cfg: { perm: 'granted' }, field: true, run: async (page) => {
    await sensor(page, { beta: 45, roll: 0 }); await sleep(900);
    await page.evaluate(() => { const M = window.__M; M.closePanel(); M.onDown({ pointerId: 7, pointerType: 'touch', pt: { x: 0.42, y: 0.55, px: 0.42 * M.VIS.w, py: 0.45 * M.VIS.h } }); });
    await sleep(250); await page.evaluate(() => window.__setPose({ beta: 33, roll: 16 })); await sleep(900);
  } },
  lad: { cfg: { perm: 'granted' }, field: true, run: async (page) => {
    await sensor(page, { beta: 45, roll: 0 }); await sleep(900);
    await page.evaluate(async () => { const M = window.__M; M.closePanel(); M.seqStart(); const t0 = performance.now();
      while (performance.now() - t0 < 2300) { const k = Math.sin(2 * Math.PI * 5 * (performance.now() - t0) / 1000); window.__S.p = { beta: 45, roll: 6 * k, lin: [16 * k, 3.2 * k, 0] }; await window.__sleep(8); }
      window.__S.p = { beta: 45, roll: 0 }; });
    await sleep(500);
  } },
  schlaf: { cfg: { perm: 'granted' }, field: true, run: async (page) => {
    await sensor(page, { beta: 45, roll: 0 }); await sleep(900);
    await page.evaluate(async () => { const M = window.__M; M.closePanel(); M.seqStart(); for (let b = 45; b <= 180; b += 9) { window.__S.p = { beta: b, roll: 0 }; await window.__sleep(50); } });
    await sleep(3600);
  } },
  fae: { cfg: { perm: 'granted' }, run: async (page) => {
    await sensor(page, { beta: 45, roll: 0 }); await sleep(600);
    await page.evaluate(() => { const M = window.__M; M.loadPreset(M.PRESETS.find((p) => p.key === 'sporenfaehrte')); });
    await sleep(2200);
  } },
  regen: { cfg: { perm: 'granted' }, field: true, run: async (page) => {
    await sensor(page, { beta: 10, roll: 0 }); await sleep(700);
    await page.evaluate(async () => {
      const M = window.__M, s = window.__sleep; M.loadPreset(M.PRESETS.find((p) => p.key === 'kalimbatraum')); M.gkSet('neigen', 'regen'); M.closePanel();
      const W = M.VIS.w, H = M.VIS.h;
      for (const [x, y] of [[0.18, 0.35], [0.38, 0.55], [0.52, 0.45], [0.7, 0.6], [0.86, 0.3]]) { const id = 'p' + x; M.onDown({ pointerId: id, pointerType: 'touch', pt: { x, y, px: x * W, py: (1 - y) * H } }); await s(60); M.onUp({ pointerId: id, pointerType: 'touch' }); }
      window.__S.p = { beta: 2, roll: 22 };
    });
    await sleep(3200);
  } },
  mess: { cfg: { perm: 'granted' }, open: 'messD', run: async (page) => { await sensor(page, { beta: 50, roll: 0 }); await sleep(1500); await page.evaluate(() => window.__setPose({ beta: 44, roll: 8 })); await sleep(400); } },
  funk: { cfg: { perm: 'granted', ins: [] }, open: 'fs', run: async (page) => {
    await page.evaluate(() => { const o = { id: 'o1', name: 'Pixel 7 USB-MIDI', state: 'connected', send() {} }; window.__midi.outputs.set('o1', o); const A = window.__midi.access; if (A.onstatechange) A.onstatechange({ port: o }); });   // plugged in (a desktop has MIDI open already)
    await page.evaluate(() => window.__M.midiInit(true)); await sleep(300);
    await sensor(page, { beta: 45, roll: 0 }); await sleep(900);
    await page.evaluate(() => { const C = window.__M.GK.card; const b = C && C.fsBox.querySelector('[data-v="Pixel 7 USB-MIDI"]'); if (b) b.click(); });
    await sleep(1200);
  } },
  // a phone without a gyroscope: rotationRate null
  nogyro: { cfg: { perm: 'granted' }, open: 'ga', run: async (page) => {
    await page.evaluate(() => { window.__ng = setInterval(() => window.__dm({ g: [-1.2, 6.9, 6.9], a: [0, 0, 0], r: null }), 16); });
    await sleep(1400);
  } },
  denied: { cfg: { perm: 'denied' } },
  start: { cfg: {}, on: false, only: async (page, base) => { await page.screenshot({ path: base + '.png' }); } },
  hilfe: { cfg: {}, on: false, only: async (page, base) => {
    await page.click('#btnStart'); await sleep(300);
    await page.evaluate(() => { const M = window.__M; M.openPanel('presets'); });
    await sleep(500);
    await page.evaluate(() => { const li = [...document.querySelectorAll('.help li')].find((l) => /^Gestik:/.test(l.textContent)); if (li) li.scrollIntoView({ block: 'center' }); });
    await sleep(300);
    await page.screenshot({ path: base + '.png' });
  } },
  nosensor: { cfg: { perm: 'granted' }, run: async () => { await sleep(1500); } },
  viewer: { cfg: { viewer: true }, run: async () => { await sleep(1500); } },
};
async function sensor(page, pose) { await page.evaluate((p) => window.__sensor(true, p, 3), pose); }
async function shoot(vpName, stName) {
  const vp = VPS[vpName], S = ST[stName];
  const cfg = Object.assign({ seed: 777 }, S.cfg);
  if (vp.ios) { cfg.noMidi = cfg.noMidi !== false; cfg.noBt = true; cfg.noVib = true; if (cfg.perm == null && !cfg.viewer) cfg.perm = 'granted'; }
  if (vp.ios && stName === 'funk') return;   // no Web MIDI there: nothing to send with
  if (vp.angle != null) cfg.angle = vp.angle;
  const { page, errors } = await H.open({ url: URL, vp, cfg, start: !S.only });
  // landscape: screen.orientation.angle 90 and the simulated hand's poses (meant in screen axes) turned into the
  // device's axes, as gk-lib's traces do (orient)
  if (vp.angle) await page.evaluate((o) => {
    const d = window.__dm, a = (-o * Math.PI) / 180, c = Math.cos(a), sn = Math.sin(a), rot = (v) => (v ? [v[0] * c - v[1] * sn, v[0] * sn + v[1] * c, v[2]] : v);
    window.__dm = (s) => d(Object.assign({}, s, { g: rot(s.g), a: rot(s.a), r: rot(s.r) }));
  }, vp.angle);
  try {
    if (S.only) { await sleep(300); await S.only(page, dir + vpName + '-' + stName); throw { skip: true }; }
    if (S.on !== false) { await H.gestikOn(page); await sleep(350); }
    else await page.evaluate(() => window.__M.openPanel('dev'));
    if (S.run) await S.run(page);
    const base = dir + vpName + '-' + stName;
    if (S.field) { await page.evaluate(() => window.__M.closePanel()); await sleep(450); await page.screenshot({ path: base + '-field.png' }); }
    // the panel at the card (or at the tiles while Gestik is off)
    await page.evaluate((o) => {
      const M = window.__M; if (M.UI.panel !== 'dev') M.openPanel('dev');
      const C = M.GK.card;
      if (C && o && C[o]) C[o].open = true;
      if (C) { if (o === 'fs') C.fs.open = true; if (o === 'messD' || o === 'fs') C.el.querySelector('.gk-mehr').open = true; M.gkCardSync(); }
    }, S.open || (stName === 'lad' ? 'lad' : stName === 'schlaf' ? 'slp' : stName === 'regen' ? 'rg' : stName === 'anl' ? 'ga' : null));
    await sleep(500);
    await page.evaluate((st) => {
      const M = window.__M, C = M.GK.card, E = M.getDevEls();
      const el = !C || !C.el.isConnected ? E.midiSec : st === 'mess' ? C.messD : st === 'funk' ? C.fs : st === 'lad' ? C.lad : st === 'schlaf' ? C.slp : C.el;
      el.scrollIntoView({ block: 'start' });
    }, stName);
    await sleep(350);
    await page.screenshot({ path: base + '.png' });
    // the whole card (or section) in a tall window of the same width
    const sw = await page.evaluate(() => document.getElementById('sheet').getBoundingClientRect().width);
    await page.setViewportSize({ width: vp.width, height: 4200 });
    await page.addStyleTag({ content: '#sheet{position:absolute!important;top:0!important;left:0!important;right:auto!important;bottom:auto!important;width:' + sw + 'px!important;height:auto!important;max-height:none!important;transform:none!important}#sheet .sheet-body{overflow:visible!important;height:auto!important;max-height:none!important}.main{overflow:visible!important}' });
    await sleep(500);
    const sel = await page.evaluate(() => { const M = window.__M, C = M.GK.card; return C && C.el.isConnected ? '.gk-card' : '.kc-sec'; });
    const el = await page.$(sel);
    if (el) await el.screenshot({ path: base + '-card.png' });
    await page.setViewportSize({ width: vp.width, height: vp.height });
  } catch (e) { if (!e.skip) console.log('ERR', vpName, stName, e.message); }
  if (errors.length) console.log('page errors', vpName, stName, errors.slice(0, 3));
  await page.context().close();
}
(async () => {
  const vps = !process.argv[2] || process.argv[2] === 'all' ? Object.keys(VPS) : process.argv[2].split(',');
  const sts = !process.argv[3] || process.argv[3] === 'all' ? Object.keys(ST) : process.argv[3].split(',');
  for (const v of vps) for (const s of sts) { await shoot(v, s); process.stdout.write(v + ':' + s + ' '); }
  console.log();
  await H.close();
})();
