const out = {};
await S.tap('#btnStart', { mouse: 1 }); await page.waitForTimeout(1500); await S.watch();
await page.waitForTimeout(2500);
await S.tap('#hxKorb', { mouse: 1 }); await page.waitForTimeout(400); out.emptyKorb = await S.said();
// keyboard: Space = Hauptknopf
await page.mouse.click(640, 300); await page.waitForTimeout(300); await S.said();
await page.keyboard.press('Space'); await page.waitForTimeout(300); out.space = (await S.rail()).split('  ')[1]; out.s1 = await S.said();
const m=[[0.15,0.5,200,300],[0.35,0.4,200,300],[0.55,0.5,200,300],[0.45,0.6,200,300]];
await S.playField(m);
await page.keyboard.press('Space'); await page.waitForTimeout(3500); out.s2 = await S.said(); out.a = await S.rms(1500);
// Stille
await S.tap('#btnPanic2', { mouse: 1 }); await page.waitForTimeout(800); out.stille = await S.said(); out.r = (await S.rail()).split('  ').slice(1,3).join(' '); out.aS = await S.rms(1500);
await S.shot('d95-stille');
const t = await page.locator('#toast').isVisible(); out.toast = t ? (await page.locator('#toast').innerText()).replace(/\n/g, ' | ') : null;
await S.tap('#hxHaupt', { mouse: 1 }); await page.waitForTimeout(3500); out.weiter = await S.said(); out.aW = await S.rms(1500);
// delete via card + undo
await S.tap('#tab-rec', { mouse: 1 }); await page.waitForTimeout(500);
const del = page.locator('#hxc-0 button').filter({ hasText: /^Löschen$/ }).first(); await S.tap(del, { mouse: 1 }); await page.waitForTimeout(800); out.del = await S.said(); out.aD = await S.rms(1500);
await S.tap('#hxUndo', { mouse: 1 }); await page.waitForTimeout(2500); out.und = await S.said(); out.aU = await S.rms(1500);
return out;
