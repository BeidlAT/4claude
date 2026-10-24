const out = {};
out.wAfterWurf = await S.rowTxt('Wiedergabe');
// open Verwandeln
const f = page.locator('#hxc-0').getByText('Verwandeln', { exact: false }).first();
out.fold = await S.tap(f, { mouse: 1 }); await page.waitForTimeout(600);
out.band = await S.rowTxt('Band');
out.a0 = await S.rms(2500);
const opts = (out.band || '').split(' | ');
out.half = await S.rowBtn('Band', opts.find((x) => /½|0,5|−12|-12|Oktave tiefer/.test(x)) || opts[1]);
await page.waitForTimeout(2500); out.a1 = await S.rms(2500); out.band1 = await S.rowTxt('Band');
out.back = await S.rowBtn('Band', opts.find((x) => x === '1' || x === '×1' || /normal/.test(x)) || opts[3]);
await page.waitForTimeout(2500); out.a2 = await S.rms(2000);
out.rev = await S.rowBtn('Band', 'rückwärts'); await page.waitForTimeout(3000); out.a3 = await S.rms(2000);
out.rev2 = await S.rowBtn('Band', 'rückwärts');
out.stopp = await S.rowBtn('Band', 'Stopp'); await page.waitForTimeout(3000); out.a4 = await S.rms(2000); out.meta = await S.cardTxt();
out.said = await S.said();
await S.shot('d30-tools');
return out;
