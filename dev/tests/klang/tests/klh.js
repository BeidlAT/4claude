// Helpers for the Klangquellen library suites (t-lib-*): a page on the kl-inst build (KL_URL overrides), started.
//   open(browser, { w, h, mobile, store: {key: value}, init: fn }) → { page, errors, ctx }
const URL_ = process.env.KL_URL || 'http://127.0.0.1:8790/kl-inst/index.html';
async function open(browser, o = {}) {
  const mobile = o.mobile !== false;
  const ctx = await browser.newContext(Object.assign({ viewport: { width: o.w || (mobile ? 390 : 1280), height: o.h || (mobile ? 844 : 800) } }, mobile ? { isMobile: true, hasTouch: true } : {}, o.reduced ? { reducedMotion: 'reduce' } : {}));
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript((st) => {
    try { if (!sessionStorage.getItem('__seeded')) { sessionStorage.setItem('__seeded', '1'); for (const k in st) localStorage.setItem(k, st[k]); } } catch (e) {}
    window.__sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  }, o.store || {});
  if (o.init) await page.addInitScript(o.init);
  await page.goto(URL_); await page.waitForFunction(() => !!window.__M);
  if (o.start !== false) { await page.click('#btnStart'); await page.waitForTimeout(500); }
  return { page, errors, ctx };
}
// the probe voices alive now: [{ eng, as, probe, released }]
const probes = (page) => page.evaluate(() => [...window.__M.A.voices].filter((v) => v.alive && v.probe && !v.probeEnd).map((v) => ({ eng: v.eng, as: v.as, released: v.released })));
const voices = (page) => page.evaluate(() => [...window.__M.A.voices].filter((v) => v.alive).length);
module.exports = { open, probes, voices, URL_ };
