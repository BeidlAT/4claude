const mouse = !!globalThis.MOUSE, P=(mouse?'d':'p');
const m=[[0.15,0.5,200,300],[0.35,0.4,200,300],[0.55,0.5,200,300],[0.45,0.6,200,300]];
await page.waitForTimeout(2500);
await S.tap('#hxHaupt',{mouse}); await page.waitForTimeout(200); const h0 = await S.rail();
await S.playField(m);
await S.tap('#hxHaupt',{mouse}); await page.waitForTimeout(400); const h1 = await S.rail(); await S.shot(P+'-haupt-closed');
const a = await S.rms(5000); const h2 = await S.rail(); await S.shot(P+'-haupt-after');
return {h0: h0.split('  ').slice(0,3).join(' '), h1: h1.split('  ').slice(0,4).join(' '), a, h2: h2.split('  ').slice(0,4).join(' '), said: await S.said()};
