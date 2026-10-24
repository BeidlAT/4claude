// Reproduces the double action of a touch tap on the Ringleiste (AUDIT.md, bug B1).
// Usage: node repro-doppeltipp.js [url]   (default: the test slot http://127.0.0.1:8790/bed/index.html,
// built with: sh <scratch>/v2/mk.sh /home/user/4claude/myzel bed)
// Prints, for one touch tap and one mouse click on the Korb, the click's `detail` and what the rail announced.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8790/bed/index.html';
async function run(touch) {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext(touch ? { viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 800 } });
  const p = await ctx.newPage();
  await p.goto(URL); await p.waitForTimeout(1200);
  const tap = async (sel) => { const r = await p.locator(sel).first().boundingBox(); const x = r.x + r.width / 2, y = r.y + r.height / 2; if (touch) await p.touchscreen.tap(x, y); else await p.mouse.click(x, y); };
  await tap('#btnStart'); await p.waitForTimeout(2500);
  // play a short figure three times on the field
  const st = await p.locator('#stage').boundingBox();
  for (let k = 0; k < 3; k++) for (const [fx, fy] of [[0.15, 0.5], [0.35, 0.4], [0.55, 0.5], [0.45, 0.6]]) { await p.mouse.move(st.x + fx * st.width, st.y + fy * st.height); await p.mouse.down(); await p.waitForTimeout(200); await p.mouse.up(); await p.waitForTimeout(300); }
  await p.evaluate(() => { window.__log = []; document.querySelector('#hxKorb').addEventListener('click', (e) => window.__log.push('click detail=' + e.detail)); new MutationObserver(() => { const t = document.querySelector('#hxLive').textContent; if (t) window.__log.push('sagt: ' + t); }).observe(document.querySelector('#hxLive'), { childList: true, characterData: true, subtree: true }); });
  await tap('#hxKorb'); await p.waitForTimeout(4000);
  console.log(touch ? 'Touch:' : 'Maus: ', (await p.evaluate(() => window.__log)).join(' | '));
  await b.close();
}
(async () => { await run(true); await run(false); })();
