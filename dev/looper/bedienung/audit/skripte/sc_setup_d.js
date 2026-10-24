await S.tap('#btnStart',{mouse:1}); await page.waitForTimeout(1500); await S.watch();
const m=[[0.15,0.5,200,300],[0.35,0.4,200,300],[0.55,0.5,200,300],[0.45,0.6,200,300]];
await page.waitForTimeout(2500);
await S.tap('#hxHaupt',{mouse:1}); await page.waitForTimeout(200);
await S.playField(m);
await S.tap('#hxHaupt',{mouse:1}); await page.waitForTimeout(3000);
await S.tap('#tab-rec',{mouse:1}); await page.waitForTimeout(800);
return [await S.rms(2000), await S.said()];
