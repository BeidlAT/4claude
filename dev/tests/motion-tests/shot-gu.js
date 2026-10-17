// Screenshots for part 7 (UI and texts), not a test: every Gestik state on six viewports – the view as it is (field or
// panel) and the whole card (a tall window of the same width) → shots/gu/<vp>-<state>[-card|-field].png
//   node shot-gu.js [vp,vp…|all] [state,state…|all]
const H = require('./gk-h');
const fs = require('fs');
const URL = process.env.GU || 'http://127.0.0.1:8790/gu-inst/index.html';
const dir = __dirname + '/shots/gu/';
fs.mkdirSync(dir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const IPAD_UA = 'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const DROID_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36';
const VPS = {
  p390: { width: 390, height: 844, touch: true, mobile: true, dsf: 2, ua: DROID_UA },
  p360: { width: 360, height: 740, touch: true, mobile: true, dsf: 2, ua: DROID_UA },
  land: { width: 844, height: 390, touch: true, mobile: true, dsf: 2, ua: DROID_UA },
  ipadL: { width: 1180, height: 820, touch: true, mobile: true, dsf: 1, ua: IPAD_UA, ios: true },
  ipadP: { width: 820, height: 1180, touch: true, mobile: true, dsf: 1, ua: IPAD_UA, ios: true },
  desk: { width: 1280, height: 800 },
  iph: { width: 390, height: 844, touch: true, mobile: true, dsf: 2, ua: IPHONE_UA, ios: true },
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
    await page.evaluate(() => { const o = { id: 'o1', name: 'Pixel 7 USB-MIDI', state: 'connected', send() {} }; window.__midi.outputs.set('o1', o); });
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
  const { page, errors } = await H.open({ url: URL, vp, cfg, start: !S.only });
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
      if (C) { if (o === 'fs') C.fs.open = true; M.gkCardSync(); }
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
