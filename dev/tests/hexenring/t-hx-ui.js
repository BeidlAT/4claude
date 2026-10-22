// Hexenring – the Ringleiste on screen (SPEC §16; tests §22): at 360×740, 390×844 (phones), 820×1180 (iPad) and
// 1366×768 (PC) and a phone turned (740×360): the rail is there once sound starts, 56 px, under the field and never over
// it (in the field's column beside an open panel), 4 rings a page on phones and 8 on iPad/PC, the chips and corrections
// inside the rail where the rings are (never over the field), folded 24 px with Korb and Hauptknopf – by itself while a
// panel is open only where the field would otherwise be shorter than 260 px (step 1d: from the layout, not the screen's
// height) – the form button at the rail's right end, a toolbar with a live region, the coach mark once. Screenshots go to SHOTS (default ./out/ui-*.png) – look at them.   node t-hx-ui.js
const G = require('./hx-g'), H = require('./hx-h');
const { ok } = H;
const SHOTS = process.env.SHOTS || __dirname + '/out';
(async () => {
  const sizes = [['p360', 360, 740, true], ['p390', 390, 844, true], ['ipad', 820, 1180, true], ['pc', 1366, 768, false], ['land', 740, 360, true]];
  for (const [name, w, h, touch] of sizes) {
    const { page, errors, ctx } = await (async () => {
      const r = await H.open({ w, h, start: false });
      return r;
    })();
    if (touch) { /* (the hx-h context is not mobile; the layout follows the width, the rings per page too) */ }
    await page.click('#btnStart'); await page.waitForFunction(() => window.__M.HX.state === 'ok', null, { timeout: 8000 }); await page.waitForTimeout(400);
    await G.gtools(page);
    const geo = () => page.evaluate(() => {
      const r = (el) => { const b = el.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height, b: b.bottom, r: b.right }; };
      const M = window.__M, rail = document.getElementById('hxRail'), st = document.getElementById('stage'), sh = document.getElementById('sheet');
      const vis = (el) => !el.hidden && el.offsetParent !== null;
      return { rail: r(rail), stage: r(st), sheet: sh.hidden ? null : r(sh), shown: vis(rail), rings: M.HXU.rings.filter(vis).length, chips: vis(M.HXU.chips) ? r(M.HXU.chips) : null,
        korb: vis(M.HXU.korb), haupt: vis(M.HXU.haupt), form: vis(document.getElementById('hxForm')) ? r(document.getElementById('hxForm')) : null, formAria: document.getElementById('hxForm').getAttribute('aria-label'), role: rail.getAttribute('role'), coach: !document.getElementById('hxCoach').hidden, vw: innerWidth, sw: document.documentElement.scrollWidth };
    });
    let g = await geo();
    ok(g.shown && g.role === 'toolbar' && Math.abs(g.rail.h - 56) < 1, `${name}: the Ringleiste is there after the start (a toolbar, ${g.rail.h} px)`);
    ok(g.rail.y >= g.stage.b - 1 && g.rail.x >= g.stage.x - 1 && g.rail.r <= g.stage.r + 1, `${name}:   under the field, in its column, never over it (field ${Math.round(g.stage.y)}–${Math.round(g.stage.b)}, rail from ${Math.round(g.rail.y)})`);
    ok(g.rings === (w >= 700 ? 8 : 4) && g.sw <= g.vw, `${name}:   ${g.rings} rings on a page; no sideways scrolling (${g.sw}/${g.vw})`);
    ok(g.coach, `${name}:   the coach mark on the first start`);
    ok(g.form && g.form.r >= g.rail.r - 8 && g.form.r <= g.rail.r + 1 && /Form|Lichtung/.test(g.formAria), `${name}:   the form button at the rail's right end (${g.form && Math.round(g.rail.r - g.form.r)} px from it, „${g.formAria}“)`);
    await page.screenshot({ path: SHOTS + '/ui-' + name + '-1.png' });
    // play, harvest: rings, chips in the rail
    await page.evaluate(async () => {
      const M = window.__M, A = M.A;
      window.__grid(110); await window.__sleep(200);
      const B0 = Math.ceil(M.tgBeat(A.ctx.currentTime + 0.3) / 4) * 4;
      window.__riff(M.tgTime(B0), 60 / 110, [0, 4, 2, 7, 5, 4, 2, 9], 1, { eng: 'glo' });
      await window.__until(M.tgTime(B0 + 8) + 0.05);
      M.hxKorb(null);
      window.__riff(M.tgTime(B0 + 8), 60 / 220, [9, 11, 12, 11, 9, 7, 5, 7, 9, 11, 12, 14, 12, 11, 9, 7], 1, { eng: 'glo' });
      await window.__until(M.tgTime(B0 + 16) + 0.05);
      M.hxKorb(null);
      await window.__sleep(500);
    });
    g = await geo();
    ok(g.chips && g.chips.y >= g.rail.y - 1 && g.chips.b <= g.rail.b + 1 && g.chips.y >= g.stage.b - 1, `${name}:   the chips after a harvest stand in the rail, where the rings were – not over the field`);
    ok(!g.coach, `${name}:   the coach mark is gone after the first harvest`);
    await page.screenshot({ path: SHOTS + '/ui-' + name + '-2.png' });
    await page.evaluate(async () => { const M = window.__M; M.HX.chips = null; M.hxRailDirty(); M.hxRingTap(1, null); await window.__sleep(2600); });
    await page.screenshot({ path: SHOTS + '/ui-' + name + '-3.png' });
    // the card in the Aufnahme panel; the rail stays with the field
    await page.evaluate(async () => { window.__M.hxCardOpen(0); await window.__sleep(700); });
    g = await geo();
    ok(g.sheet && g.shown && g.rail.y >= g.stage.b - 1 && (g.sheet.y >= g.rail.b - 1 || g.sheet.x >= g.rail.r - 1), `${name}:   with the panel open the rail stays at the field (${g.sheet && g.sheet.y >= g.rail.b - 1 ? 'panel below' : 'panel beside'})`);
    const fieldOpen = g.stage.h - (56 - g.rail.h), short = fieldOpen < 260;   // (the field's height with the rail open)
    ok(Math.abs(g.rail.h - (short ? 24 : 56)) < 1 && g.korb && g.haupt, `${name}:   ${short ? 'the field would be ' + Math.round(fieldOpen) + ' px (< 260): the rail folds while the panel is open' : 'the field keeps ' + Math.round(fieldOpen) + ' px (≥ 260): the rail stays open with the panel'} (${g.rail.h} px), Korb and Hauptknopf stay`);
    if (short) {
      const u = await page.evaluate(async () => { const M = window.__M; M.HXU.fold.click(); await window.__sleep(200); const a = M.HXU.rail.getBoundingClientRect().height; M.closePanel(); await window.__sleep(200); const b = M.HXU.rail.getBoundingClientRect().height; M.hxCardOpen(0); await window.__sleep(300); return { a, b, c: M.HXU.rail.getBoundingClientRect().height, p: M.P['hx.rail'] }; });
      ok(Math.abs(u.a - 56) < 1 && Math.abs(u.b - 56) < 1 && Math.abs(u.c - 24) < 1 && u.p === 'offen', `${name}:   its fold button opens it for that panel (${u.a} px); closed ${u.b}, the next panel folds it again (${u.c}); the setting stays (${u.p})`);
    }
    await page.screenshot({ path: SHOTS + '/ui-' + name + '-4.png' });
    // a tall panel (the mixer: on a short phone it leaves the field 118 px) – the rail keeps its place between them
    await page.evaluate(async () => { const M = window.__M; M.closePanel(); M.openPanel('mix'); await window.__sleep(600); });
    g = await geo();
    ok(g.sheet && (g.sheet.y >= g.rail.b - 1 || g.sheet.x >= g.rail.r - 1) && g.rail.y >= g.stage.b - 1 && g.stage.h >= 96, `${name}:   the mixer open: the field ${Math.round(g.stage.h)} px, the rail under it, the panel ${g.sheet && g.sheet.y >= g.rail.b - 1 ? 'below the rail' : 'beside'} – nothing overlaps`);
    await page.screenshot({ path: SHOTS + '/ui-' + name + '-6.png' });
    // folded
    await page.evaluate(async () => { const M = window.__M; M.closePanel(); M.setParam('hx.rail', 'klein'); await window.__sleep(300); });
    g = await geo();
    ok(Math.abs(g.rail.h - 24) < 1 && g.korb && g.haupt, `${name}:   folded: ${g.rail.h} px, Korb and Hauptknopf stay`);
    await page.screenshot({ path: SHOTS + '/ui-' + name + '-5.png' });
    const a11y = await page.evaluate(() => { const M = window.__M; M.setParam('hx.rail', 'offen'); return { live: document.getElementById('hxLive').textContent, ring: M.HXU.rings[0].getAttribute('aria-label') }; });
    ok(/Schleife/.test(a11y.ring) && /spielt|stumm/.test(a11y.ring) && a11y.live.length > 0, `${name}:   rings say what they are („${a11y.ring}“); the live region said „${a11y.live}“`);
    console.log(name, 'errors:', errors.length ? errors.join(' | ') : 'none');
    ok(!errors.length, `${name}: no page errors`);
    await page.evaluate(() => window.__reset());
    await ctx.close();
  }
  // the coach mark only once: a reload in the same browser does not show it again
  {
    const { page, ctx } = await H.open({ w: 390, h: 844, start: false });
    await page.evaluate(() => localStorage.setItem('myzel.hx.dev.v1', JSON.stringify({ coach: 1 })));
    await page.reload(); await page.waitForFunction(() => !!window.__M);
    await page.click('#btnStart'); await page.waitForTimeout(800);
    const c = await page.evaluate(() => !document.getElementById('hxCoach').hidden);
    ok(!c, 'the coach mark is shown once (not after it was seen)');
    await ctx.close();
  }
  await H.close();
  process.exit(H.summary() ? 1 : 0);
})().catch(async (e) => { console.log('FAIL fatal ' + (e && e.stack || e)); await H.close(); process.exit(1); });
