const out = {};
const gd = page.locator('.hx-gd'); await S.tap(gd.locator('button').filter({ hasText: /^schaut zu$/ }).first(), { mouse: 1 });
await S.tap('#tab-rec', { mouse: 1 }); await page.waitForTimeout(600);   // close the panel (toggle)
out.panel = await page.evaluate(() => !!document.querySelector('#hxSec') && document.querySelector('#hxSec').offsetParent !== null);
await S.said();
out.t1 = await S.tap('#hxForm', { mouse: 1 }); await page.waitForTimeout(400); out.r1 = await S.rail(); out.s1 = await S.said();
out.t2 = await S.tap('#hxForm', { hold: 900 }); await page.waitForTimeout(400); out.r2 = await S.rail(); out.s2 = await S.said(); await S.shot('d60-formrow');
out.m = await S.btn('merken', '#hxRail'); await page.waitForTimeout(400); out.r3 = await S.rail(); out.s3 = await S.said();
return out;
