const out = {};
const endBtn = async (t) => { const b = page.locator('#hxc-0 .hx-row.end button').filter({ hasText: new RegExp('^' + t + '$') }).first(); if (!await b.count()) return 'NO ' + t; return S.tap(b, { mouse: 1 }); };
out.lob = await endBtn('✓'); await page.waitForTimeout(1200); out.s1 = await S.said();
out.nein = await endBtn('✕'); await page.waitForTimeout(1200); out.s2 = await S.said();
out.anker = await endBtn('⚓'); await page.waitForTimeout(1500); out.s3 = await S.said();
out.w = await S.rowTxt('Wiedergabe'); out.e = await S.rowTxt('Eigensinn');
out.wurf = await endBtn('Neuer Wurf'); await page.waitForTimeout(1200); out.s4 = await S.said();
return out;
