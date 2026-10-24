const out = {};
const gd = page.locator('.hx-gd');
out.gdTxt = (await gd.innerText()).replace(/\n/g, ' | ');
const b = gd.locator('button').filter({ hasText: /^antwortet$/ }).first();
out.c = await S.tap(b, { mouse: 1 }); await page.waitForTimeout(500);
out.gdTxt2 = (await gd.innerText()).replace(/\n/g, ' | ');
// play a long phrase over the loop (48 notes), then stop and listen
const pts = []; for (let i = 0; i < 48; i++) pts.push([0.1 + ((i * 7) % 9) / 10, 0.5, 120, 130]);
await S.playField(pts);
out.after = await S.rms(5000);
out.rail = await S.rail();
await S.shot('d50-gaertner');
out.said = await S.said();
out.gdTxt3 = (await gd.innerText()).replace(/\n/g, ' | ');
return out;
