// Screenshots of the Gerät panel's "Keyboard & Controller" part (MIDI part 4) in every state, at phone (390×844,
// 360×740), desktop (1280×800) and iPad (1180×820, touch) sizes. Not a test: writes shots/mu-<state>-<size>.png.
// Needs the 'mu' slot: sh ../v2/mk.sh /home/user/4claude/myzel mu      node shot-mu.js [state ...]
process.env.BASE = process.env.BASE || 'http://127.0.0.1:8790/mf-inst/index.html';
const { open, close, pair } = require('./hb');
const OUT = __dirname + '/shots-mf/';
const VP = { p390: { vp: [390, 844], touch: true, ua: 'android' }, p360: { vp: [360, 740], touch: true, ua: 'android' }, d1280: { vp: [1280, 800], ua: 'windows' }, ipad: { vp: [1180, 820], touch: true, tablet: true, ua: 'ipad' } };
const want = process.argv.slice(2);
const NKS = [['k1', 'nanoKEY Studio KEYBOARD/CTRL']];
const hideToast = (page) => page.evaluate(() => document.querySelector('#toast').classList.remove('show'));
const toSec = (page, title, off = 0) => page.evaluate(([t, o]) => {
  const s = [...document.querySelectorAll('#sheetBody .sec')].find((x) => x.querySelector('h3') && x.querySelector('h3').textContent.trim() === t);
  const b = document.querySelector('#sheetBody');
  if (s) b.scrollTop = s.offsetTop - b.offsetTop + o;
}, [title, off]);
const shot = async (page, name, size) => { await hideToast(page); await page.waitForTimeout(250); await page.screenshot({ path: OUT + 'mu-' + name + '-' + size + '.png' }); };
async function connected(o, size) {
  const { page, errors } = await open(Object.assign({ bt: {}, cfg: { ins: NKS, outs: NKS } }, o));
  await page.evaluate(() => window.__M.midiInit(true));   // phones ask only on a tap
  await page.waitForTimeout(150);
  await pair(page, { id: 'air', name: 'microKEY Air-25' });
  await page.evaluate(async () => {
    const d = window.__bt.dev('air');
    for (let i = 0; i < 24; i++) { d.send([0x80, 0x80 + i, 0x90, 60 + (i % 5), 90]); await window.__sleep(15); d.send([0x80, 0x81 + i, 0x80, 60 + (i % 5), 0]); }
    window.__send([0xb0, 22, 81], 'k1');
  });
  await page.waitForTimeout(300);
  return { page, errors };
}
const STATES = {
  async start(size, o) {
    const { page } = await open(Object.assign({ bt: {}, cfg: { ins: [] }, start: false }, o));
    await shot(page, 'start', size); await close();
  },
  async none(size, o) {   // no devices yet; Android: Bluetooth promoted once Web MIDI found nothing
    const { page } = await open(Object.assign({ bt: {}, cfg: { ins: [] } }, o));
    await page.evaluate(() => window.__M.midiInit(true));
    await page.waitForTimeout(200);
    await page.evaluate(() => window.__M.openPanel('dev'));
    await shot(page, 'none', size);
    await page.click('details.plat > summary');
    await toSec(page, 'Keyboard & Controller', 150);
    await shot(page, 'none-help', size);
    await close();
  },
  async conn(size, o) {   // nanoKEY Studio over USB (fake Web MIDI) + microKEY Air over Bluetooth (fake Web Bluetooth)
    const { page, errors } = await connected(o, size);
    await page.evaluate(() => window.__send([0xb0, 22, 81], 'k1'));
    await page.waitForTimeout(80);
    await toSec(page, 'Keyboard & Controller');
    await shot(page, 'conn', size);
    await toSec(page, 'Keyboard & Controller', 380);
    await shot(page, 'conn2', size);
    await page.evaluate(() => { const d = [...document.querySelectorAll('details.kc-more')][0]; if (d) d.open = true; });
    await toSec(page, 'Keyboard & Controller', 640);
    await shot(page, 'conn3', size);
    if (errors.length) console.log('errors', errors);
    await close();
  },
  async binds(size, o) {   // Zuordnungen with learned bindings, the profile list open, an editor open
    const { page } = await connected(o, size);
    await page.evaluate(async () => {
      const M = window.__M, s = M.MIDI.srcs.get('k1');
      M.midiLearn(true); window.__send([0xb0, 20, 60], 'k1'); window.__send([0xb0, 20, 64], 'k1'); M.learnPick('cho.mix');
      await window.__sleep(30);
      window.__send([0xb0, 50, 127], 'k1'); window.__send([0xb0, 50, 0], 'k1'); M.learnPick('xl1.mute');
      M.midiLearn(false);
      window.__send([0xb0, 20, 70], 'k1');
    });
    await page.evaluate(() => { const d = document.querySelector('details.kc-bd'); d.open = true; });
    await toSec(page, 'Zuordnungen');
    await page.waitForTimeout(50);
    await page.evaluate(() => window.__send([0xb0, 21, 90], 'k1'));
    await shot(page, 'binds', size);
    await page.click('.kc-b .kc-be');
    await toSec(page, 'Zuordnungen', 90);
    await shot(page, 'binds-edit', size);
    await close();
  },
  async learn(size, o) {   // learn armed: in the Gerät panel, captured, then in the mixer
    const { page } = await connected(o, size);
    await toSec(page, 'Zuordnungen');
    await page.click('.sheet button:text-is("Zuweisen")');
    await shot(page, 'learn1', size);
    await page.evaluate(() => { window.__send([0xb0, 23, 40], 'k1'); window.__send([0xb0, 23, 44], 'k1'); });
    await page.click('#tab-mix');
    await page.waitForTimeout(500);
    await shot(page, 'learn2-mix', size);
    await page.click('.mx-st[data-k="fin"] .mx-stem', { position: { x: 20, y: 60 } }).catch(() => page.evaluate(() => window.__M.learnPick('xfin.vol')));
    await shot(page, 'learn3-done', size);
    await page.click('#tab-klang');
    await page.waitForTimeout(300);
    await shot(page, 'learn4-klang', size);
    await close();
  },
  async mixer(size, o) {   // the mixer's learn button (a controller connected)
    const { page } = await connected(o, size);
    await page.click('#tab-mix');
    await page.waitForTimeout(600);
    await shot(page, 'mixer', size);
    await close();
  },
  async mon(size, o) {   // the monitor open, with messages
    const { page } = await connected(o, size);
    await page.evaluate(() => { const b = [...document.querySelectorAll('.fold-b')].find((x) => /Monitor/.test(x.textContent)); b.click(); });
    await page.evaluate(async () => {
      const d = window.__bt.dev('air'), S = (b) => window.__send(b, 'k1');
      S([0x90, 48, 100]); S([0x80, 48, 0]); S([0xb0, 20, 64]); S([0xb0, 16, 30]); S([0xb0, 17, 99]); S([0xe0, 0, 80]); S([0x99, 36, 110]); S([0x89, 36, 0]); S([0xb0, 1, 70]); S([0xc0, 3]);
      d.send([0x80, 0x80, 0xb0, 67, 127]); await window.__sleep(20); d.send([0x80, 0x81, 0xb0, 2, 50]);
    });
    await page.waitForTimeout(200);
    await toSec(page, 'MIDI-Monitor');
    await shot(page, 'mon', size);
    await close();
  },
  async settings(size, o) {   // "Spielweise am Keyboard" open
    const { page } = await connected(o, size);
    await page.evaluate(() => { const b = [...document.querySelectorAll('.fold-b')].find((x) => /Spielweise/.test(x.textContent)); b.click(); });
    await toSec(page, 'Spielweise am Keyboard');
    await shot(page, 'set', size);
    await toSec(page, 'Spielweise am Keyboard', 420);
    await shot(page, 'set2', size);
    await close();
  },
  async ios(size, o) {   // Safari on iPad / iPhone: no Web MIDI, no Bluetooth
    const { page } = await open(Object.assign({}, o, { ua: 'ipad', bt: false, noMidi: true, start: false }));
    await shot(page, 'ios-start', size);
    await page.click('#btnStart'); await page.waitForTimeout(300);
    await page.evaluate(() => window.__M.openPanel('dev'));
    await shot(page, 'ios', size);
    await close();
  },
  async viewer(size, o) {   // the claude.ai viewer
    const { page } = await open(Object.assign({}, o, { bt: {}, viewer: true, cfg: { denyMidi: true }, start: false }));
    await shot(page, 'viewer-start', size);
    await page.click('#btnStart'); await page.waitForTimeout(300);
    await page.evaluate(() => window.__M.midiInit(true)); await page.waitForTimeout(200);
    await page.evaluate(() => window.__M.openPanel('dev'));
    await shot(page, 'viewer', size);
    await close();
  },
};
(async () => {
  const sizes = want.filter((w) => VP[w]), states = want.filter((w) => STATES[w]);
  for (const st of states.length ? states : Object.keys(STATES)) {
    for (const size of sizes.length ? sizes : Object.keys(VP)) {
      try { await STATES[st](size, Object.assign({}, VP[size])); } catch (e) { console.log('FAIL', st, size, e.message.split('\n')[0]); await close(); }
    }
  }
  console.log('done');
})();
