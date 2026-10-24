const out = {};
out.st = await S.rowBtn('Zustand', 'spielt'); await page.waitForTimeout(3500); out.a0 = await S.rms(2500);
out.n1 = await S.rowBtn('Nähren', 'Gespinst'); await page.waitForTimeout(3500); out.a1 = await S.rms(2500); out.nt = await S.rowTxt('Nähren');
out.n2 = await S.rowBtn('Nähren', 'Gespinst'); await page.waitForTimeout(1000);
out.lad = await S.rowBtn('Ladung', 'an'); await page.waitForTimeout(500); out.ladt = await S.rowTxt('Ladung');
out.lad2 = await S.rowBtn('Ladung', 'aus');
// downloads
const dl = []; page.on('download', (d) => dl.push(d.suggestedFilename()));
const endBtn = async (t) => { const b = page.locator('#hxc-0 button').filter({ hasText: new RegExp('^' + t + '$') }).first(); if (!await b.count()) return 'NO ' + t; return S.tap(b, { mouse: 1 }); };
out.ex1 = await endBtn('Als Aufnahme'); await page.waitForTimeout(2500); await S.shot('d40-export');
out.afterEx = (await page.evaluate(() => document.querySelector('#tab-rec') && [...document.querySelectorAll('.take, .takes li, [class*=take]')].slice(0, 3).map((e) => e.innerText.replace(/\n/g, ' | '))));
out.ex2 = await endBtn('MIDI'); await page.waitForTimeout(2000);
out.dl = dl;
out.said = await S.said();
return out;
