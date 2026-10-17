// Review probe: iPad (1180×820 touch) in Safari, in "Web MIDI Browser" (MIDI polyfill, no Web Bluetooth) and in Bluefy
// (Web Bluetooth, no Web MIDI): the start screen, the tap on "Mit Keyboard starten", the Gerät panel texts.
process.env.BASE = process.env.BASE || 'http://127.0.0.1:8790/r1a-inst/index.html';
const { open, ok, close } = require('./hb');
const OUT = __dirname + '/rshots/';
(async () => {
  const cases = {
    safari: { ua: 'ipad', bt: false, noMidi: true },
    wmb: { ua: 'ipad', bt: false, cfg: { ins: [] } },
    wmbKeys: { ua: 'ipad', bt: false, cfg: { ins: [['k1', 'nanoKEY Studio']] } },
    bluefy: { ua: 'ipad', bt: {}, noMidi: true },
  };
  for (const [nm, o] of Object.entries(cases)) {
    const { page, errors } = await open(Object.assign({ vp: [1180, 820], touch: true, tablet: true, start: false }, o));
    const s = await page.evaluate(() => ({ line: document.querySelector('#startKeysLine').textContent, keys: !document.querySelector('#btnStartKeys').hidden, fine: document.querySelector('#startFine').textContent, plat: window.__M.midiPlat() }));
    console.log('== ' + nm, JSON.stringify(s));
    await page.screenshot({ path: OUT + 'ipad-start-' + nm + '.png' });
    if (s.keys) { await page.click('#btnStartKeys'); } else await page.click('#btnStart');
    await page.waitForTimeout(600);
    if (nm === 'bluefy') console.log('  chooser asked in the tap:', JSON.stringify(await page.evaluate(() => window.__bt.reqs.map((r) => r.active))));
    await page.evaluate(() => { if (window.__M.UI.panel !== 'dev') window.__M.openPanel('dev'); });
    await page.waitForTimeout(300);
    const p = await page.evaluate(() => { const E = window.__M.getDevEls(); return { status: E.midiStatus.textContent, lead: E.platLead.hidden ? '(hidden)' : E.platLead.textContent, tiles: [...document.querySelectorAll('.kc-go')].filter((b) => !b.hidden).map((b) => b.textContent), steps: [...E.platSteps.children].map((l) => l.textContent), hidden: { map: E.mapSec.hidden, set: E.setSec.hidden, mon: E.monSec.hidden } }; });
    console.log('  ' + JSON.stringify(p, null, 1).split('\n').join('\n  '));
    await page.screenshot({ path: OUT + 'ipad-dev-' + nm + '.png' });
    if (errors.length) console.log('  errors', errors);
    await close();
  }
})();
