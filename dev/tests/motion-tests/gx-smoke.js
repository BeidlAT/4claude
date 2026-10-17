// gx: the page boots, __M has the new exports, no errors
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('http://127.0.0.1:8790/gx-inst/index.html');
  await p.click('#btnStart');
  await p.waitForTimeout(1500);
  const r = await p.evaluate(() => ({ m: !!window.__M && typeof window.__M.rampP === 'function' && typeof window.__M.mxRgnSync === 'function', st: window.__M.A.started }));
  console.log(JSON.stringify(r), errs);
  await b.close();
})();
