// Main-thread time of one MIDI note-on per engine and level (median / max over 60 notes), Saite pre-rendered.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  await page.addInitScript(() => {
    const inp = { id: 'k', name: 'T', state: 'connected', onmidimessage: null };
    navigator.requestMIDIAccess = () => Promise.resolve({ inputs: new Map([['k', inp]]), outputs: new Map(), onstatechange: null });
    window.__send = (b) => inp.onmidimessage && inp.onmidimessage({ data: new Uint8Array(b) });
  });
  await page.goto('http://127.0.0.1:8790/new-inst/index.html');
  await page.waitForFunction(() => !!window.__M);
  await page.click('#btnStart'); await page.waitForTimeout(2500);
  const r = await page.evaluate(async () => {
    const M = window.__M, out = {};
    for (const q of ['1', '3']) {
      M.setParam('dev.q', q);
      for (const eng of ['neb', 'kor', 'hau', 'glo', 'mem', 'sai', 'sch']) {
        M.setParam('v.eng', eng);
        if (eng === 'sai') await new Promise((r) => setTimeout(r, 3000));
        const ts = [];
        for (let k = 0; k < 60; k++) {
          const n = 48 + ((k * 5) % 36);
          const a = performance.now(); window.__send([0x90, n, 100]); ts.push(performance.now() - a);
          await new Promise((r) => setTimeout(r, 15));
          window.__send([0x80, n, 0]);
        }
        ts.sort((a, b) => a - b);
        out[eng + q] = ts[30].toFixed(2) + ' / ' + ts[59].toFixed(2);
        M.panic(); await new Promise((r) => setTimeout(r, 300));
      }
    }
    return out;
  });
  console.log(JSON.stringify(r, null, 1));
  await browser.close();
})();
