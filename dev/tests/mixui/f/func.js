// re-runs the reviewers' repros against the fixed build (phone touch via CDP, desktop mouse)
const { launch, page, start, touchDrag, line, tap, ok } = require('./lib.js');
(async () => {
  const b = await launch();
  let { ctx, pg } = await page(b, 'phone');
  if (process.env.SKIP1) { await ctx.close(); } else {
  await start(pg); await pg.click('#tab-mix'); await pg.waitForTimeout(1000);
  const P = (id) => pg.evaluate((i) => window.__M.P[i], id);
  const S = (id, v) => pg.evaluate(([i, v]) => window.__M.setParam(i, v), [id, v]);
  const box = async (sel) => (await pg.$(sel)).boundingBox();
  // (Gestik part 6 added the channel „Regen“ to the Spiel group: Spur 1 now stands one strip further right – the rack
  // is scrolled so it is fully in view, as a player would – by the strip's own box: with the Hexenring's Ringleiste
  // under the field a 390 × 844 phone gets the „side“ strips, their knobs beside the stem)
  await pg.evaluate(() => { const M = window.__MX.MX, el = M.ch.l0.el, sc = document.querySelector('.mx-scroll'); if (el) { const r = el.getBoundingClientRect(), rr = M.row.getBoundingClientRect(); sc.scrollLeft = Math.max(0, r.right - rr.left - (M.vw - M.sumW) + 4); } });
  await pg.waitForTimeout(300);
  // 1 two quick nudges on knobs never reset
  await S('xl0.dly', 0);
  let kn = await box('.mx-st[data-k="l0"] .k2 .mx-kn'), seq = [];
  for (let i = 0; i < 2; i++) { await touchDrag(pg, line(kn.x + 22, kn.y + 30, kn.x + 22, kn.y + 14, 4), { stepMs: 12, after: 30 }); seq.push(await P('xl0.dly')); }
  ok(seq[1] > seq[0] && seq[1] < 0.9, 'knob: two nudges on Echo send ' + JSON.stringify(seq));
  await S('xl0.pan', -0.6);
  kn = await box('.mx-st[data-k="l0"] .k1 .mx-kn'); seq = [];
  for (let i = 0; i < 2; i++) { await touchDrag(pg, line(kn.x + 22, kn.y + 30, kn.x + 22, kn.y + 16, 4), { stepMs: 12, after: 30 }); seq.push(await P('xl0.pan')); }
  ok(seq[1] < -0.3 && seq[1] > seq[0], 'knob: two nudges on balance ' + JSON.stringify(seq));
  // plain double tap on a knob does nothing on touch
  await S('xl0.pan', -0.6); await tap(pg, kn.x + 22, kn.y + 22); await pg.waitForTimeout(80); await tap(pg, kn.x + 22, kn.y + 22); await pg.waitForTimeout(200);
  ok(await P('xl0.pan') === -0.6, 'knob: a touch double tap leaves it ' + await P('xl0.pan'));
  // 2 the value box: double tap = 0 dB; two stem nudges never 0 dB
  await S('xl0.vol', -20);
  const vb = await box('.mx-st[data-k="l0"] .mx-val');
  await tap(pg, vb.x + vb.width / 2, vb.y + 13); await pg.waitForTimeout(90); await tap(pg, vb.x + vb.width / 2, vb.y + 13); await pg.waitForTimeout(250);
  ok(await P('xl0.vol') === 0, 'value: double tap → 0 dB (' + await P('xl0.vol') + ')');
  await S('xl0.vol', -20);
  const st = await box('.mx-st[data-k="l0"] .mx-stem'); seq = [];
  for (let i = 0; i < 2; i++) { await touchDrag(pg, line(st.x + st.width / 2 + 6, st.y + st.height - 40, st.x + st.width / 2 + 6, st.y + st.height - 52, 4), { stepMs: 12, after: 30 }); seq.push(await P('xl0.vol')); }
  ok(seq[1] < -5 && seq[1] > -20, 'stem: two nudges ' + JSON.stringify(seq));
  // 13 the node never takes a tap aimed at the value's bottom
  const ov = await pg.evaluate(() => { const v = document.querySelector('.mx-st[data-k="eb2"] .mx-val').getBoundingClientRect(); const e = document.elementFromPoint(v.left + v.width / 2, v.bottom - 3); return e && e.className; });
  ok(/mx-val/.test(ov), 'value bottom belongs to the value: ' + ov);
  // 8 a tap in a half-visible strip doesn't scroll the rack
  const geo = await pg.evaluate(() => { const M = window.__MX.MX; return { vw: M.vw, sumW: M.sumW, l1x: M.ch.l1.g.x, w: M.ch.l1.g.w }; });
  const target = geo.l1x + geo.w * 0.6 - (geo.vw - geo.sumW);
  await pg.evaluate((x) => { document.querySelector('.mx-scroll').scrollLeft = x; }, target); await pg.waitForTimeout(300);
  const s0 = await pg.evaluate(() => document.querySelector('.mx-scroll').scrollLeft);
  const mb = await box('.mx-st[data-k="l1"] .mx-m');
  await tap(pg, Math.min(mb.x + mb.width / 2, geo.vw - geo.sumW - 6), mb.y + 22); await pg.waitForTimeout(700);
  const s1 = await pg.evaluate(() => document.querySelector('.mx-scroll').scrollLeft);
  ok((await P('xl1.mute')) === true && Math.abs(s1 - s0) < 2, 'rack stays under the finger: mute ' + await P('xl1.mute') + ', scroll ' + s0 + '→' + s1);
  await S('xl1.mute', false);
  // but a choice from elsewhere (bridge, detail) still scrolls
  await pg.evaluate(() => window.__MX.selectChannel('rev')); await pg.waitForTimeout(800);
  ok((await pg.evaluate(() => document.querySelector('.mx-scroll').scrollLeft)) > s1 + 50, 'a choice from elsewhere scrolls to it');
  // 5 morph: stray tap changes nothing, a drag does
  await pg.evaluate(() => { const M = window.__M; M.setParam('xl1.vol', -20); window.__MX.mxSnapStore('a'); M.setParam('xl1.vol', 0); window.__MX.mxSnapStore('b'); window.__MX.mxMorphTo(0); });
  await pg.waitForTimeout(400);
  const mo = await box('.mx-morph');
  await tap(pg, mo.x + mo.width * 0.85, mo.y + 22); await pg.waitForTimeout(1000);
  ok(await P('xl1.vol') === -20, 'morph: stray tap at 85 % leaves the mix (' + await P('xl1.vol') + ')');
  await touchDrag(pg, line(mo.x + 20, mo.y + 22, mo.x + 80, mo.y + 22, 8)); await pg.waitForTimeout(300);
  ok(await P('xl1.vol') > -20, 'morph: a sideways drag moves it (' + await P('xl1.vol') + ')');
  // 6 hold A: 650 ms glides, 1,1 s stores with undo
  await pg.evaluate(() => { window.__MX.mxMorphTo(1); }); await pg.waitForTimeout(200); await S('xl1.vol', -5);
  const a = await box('.mx-ab-a');
  await tap(pg, a.x + 22, a.y + 22, 650); await pg.waitForTimeout(1200);
  ok(await pg.evaluate(() => window.__MX.MX.snap.a['xl1.vol']) === -20 && await P('xl1.vol') === -20, 'hold A 650 ms: glides to A, A kept (' + await P('xl1.vol') + ')');
  await S('xl1.vol', -7);
  await tap(pg, a.x + 22, a.y + 22, 1150); await pg.waitForTimeout(300);
  const toast = await pg.evaluate(() => [document.querySelector('#toastMsg').textContent, document.querySelector('#toastAct').hidden ? null : document.querySelector('#toastAct').textContent]);
  ok(await pg.evaluate(() => window.__MX.MX.snap.a['xl1.vol']) === -7 && toast[1] === 'Rückgängig', 'hold A 1,15 s: stores, toast ' + JSON.stringify(toast));
  await pg.click('#toastAct'); await pg.waitForTimeout(200);
  ok(await pg.evaluate(() => window.__MX.MX.snap.a['xl1.vol']) === -20, 'undo puts A back');
  // 7 the solo lamp
  await S('xl2.solo', true); await pg.waitForTimeout(300);
  const lamp = await pg.evaluate(() => { const e = document.querySelector('.mx-band .mx-sololamp'); return [e.hidden, e.getAttribute('aria-label')]; });
  ok(!lamp[0] && /Spur 3/.test(lamp[1]), 'solo lamp lit: ' + lamp[1]);
  const lb = await box('.mx-band .mx-sololamp'); await tap(pg, lb.x + lb.width / 2, lb.y + 22); await pg.waitForTimeout(300);
  ok(await P('xl2.solo') === false, 'lamp tap lifts the solo');
  await pg.click('#toastAct'); await pg.waitForTimeout(200);
  ok(await P('xl2.solo') === true, 'undo brings it back'); await S('xl2.solo', false);
  // 15/16 Puls group meter skips silent lanes; dormant when all lanes are muted
  await S('xl0.mute', true); await S('xl1.solo', true); await pg.waitForTimeout(1500);
  const pm = await pg.evaluate(() => { const M = window.__MX.MX; return { dom: M.ch.puls.lv.dom, pulsPk: M.ch.puls.lv.pk.map((x) => +x.toFixed(3)), l1: M.ch.l1.lv.pk.map((x) => +x.toFixed(3)), dorm: M.ch.puls.dorm }; });
  ok(pm.dom === 1 && pm.pulsPk[0] === pm.l1[0], 'Puls meter = the lane you hear ' + JSON.stringify(pm));
  await S('xl1.solo', false); for (let i = 0; i < 4; i++) await S('xl' + i + '.mute', true); await pg.waitForTimeout(200);
  ok(await pg.evaluate(() => window.__MX.MX.ch.puls.dorm), 'Puls dormant when every lane is muted');
  for (let i = 0; i < 4; i++) await S('xl' + i + '.mute', false);
  // 17 empty mushrooms; Puls "alle aus"
  for (let i = 0; i < 4; i++) await S('l' + i + '.on', false); await pg.waitForTimeout(200);
  const so = await pg.evaluate(() => [...document.querySelectorAll('.mx-st.srcoff')].map((e) => e.dataset.k).join(',') + ' | ' + document.querySelector('.mx-st[data-k="puls"] .mx-src').textContent);
  ok(/puls/.test(so) && /alle aus/.test(so), 'srcoff strips: ' + so);
  for (let i = 0; i < 2; i++) await S('l' + i + '.on', true);
  // 3 phone detail: a swipe starting on an unchosen EQ handle scrolls; a tap chooses it, then it drags
  await pg.evaluate(() => window.__MX.openDetail('l1')); await pg.waitForTimeout(800);
  await pg.evaluate(() => { document.querySelector('.mxd-body').scrollTop = 200; }); await pg.waitForTimeout(300);
  await pg.evaluate(() => { const E = window.__MX.MXD.eqc; E.sel = 'lc'; E.hkey = ''; E.dirty = true; }); await pg.waitForTimeout(200);
  let hm = await pg.evaluate(() => { const r = [...document.querySelectorAll('.mxe-h[data-b="mid"]')].find((e) => e.getBoundingClientRect().width).getBoundingClientRect(); return [r.left + 22, r.top + 22]; });
  const before = await pg.evaluate(() => ['xl1.mid', 'xl1.midf', 'xl1.lo'].map((i) => window.__M.P[i]));
  await touchDrag(pg, line(hm[0], hm[1], hm[0] + 2, hm[1] - 160, 14)); await pg.waitForTimeout(400);
  const after = await pg.evaluate(() => ['xl1.mid', 'xl1.midf', 'xl1.lo'].map((i) => window.__M.P[i]));
  const sc = await pg.evaluate(() => document.querySelector('.mxd-body').scrollTop);
  ok(sc > 260 && JSON.stringify(before) === JSON.stringify(after), 'EQ: swipe from the Mitten handle scrolls (' + sc + '), values kept ' + JSON.stringify(after));
  await pg.evaluate(() => { document.querySelector('.mxd-body').scrollTop = 200; }); await pg.waitForTimeout(300);
  hm = await pg.evaluate(() => { const r = [...document.querySelectorAll('.mxe-h[data-b="mid"]')].find((e) => e.getBoundingClientRect().width).getBoundingClientRect(); return [r.left + 22, r.top + 22]; });
  await tap(pg, hm[0], hm[1]); await pg.waitForTimeout(400);
  await touchDrag(pg, line(hm[0], hm[1], hm[0], hm[1] - 40, 8)); await pg.waitForTimeout(300);
  ok(await P('xl1.mid') > 1, 'EQ: tapped handle then drags: mid ' + (await P('xl1.mid')).toFixed(1));
  // EQ: two nudges on the chosen handle never reset
  await S('xl1.mid', 6); await pg.waitForTimeout(200);
  hm = await pg.evaluate(() => { const r = [...document.querySelectorAll('.mxe-h[data-b="mid"]')].find((e) => e.getBoundingClientRect().width).getBoundingClientRect(); return [r.left + 22, r.top + 22]; });
  seq = []; for (let i = 0; i < 2; i++) { await touchDrag(pg, line(hm[0], hm[1], hm[0], hm[1] - 8, 3), { stepMs: 10, after: 20 }); seq.push(await P('xl1.mid')); }
  ok(seq[1] > 5, 'EQ: two nudges on Mitten ' + JSON.stringify(seq.map((x) => +x.toFixed(1))));
  await S('xl1.mid', 0);
  await pg.evaluate(() => window.__MX.closeDetail());
  console.log('phone errors', pg.errors);
  await ctx.close();
  }
  // 4 the Puls panel's block
  ({ ctx, pg } = await page(b, 'phone'));
  await start(pg);
  await pg.click('#tab-puls'); await pg.waitForTimeout(800);
  await pg.evaluate(() => { const e = document.querySelector('.mxp-row:nth-child(2)'); e.scrollIntoView({ block: 'center' }); }); await pg.waitForTimeout(500);
  await pg.evaluate(() => window.__M.setParam('xl1.vol', -20));
  const fd = await (await pg.$('.mxp-row:nth-child(2) .mxp-fd')).boundingBox();
  const P2 = (id) => pg.evaluate((i) => window.__M.P[i], id); seq = [];
  for (let i = 0; i < 2; i++) { await touchDrag(pg, line(fd.x + fd.width * 0.4, fd.y + 30, fd.x + fd.width * 0.4 + 12, fd.y + 30, 3), { stepMs: 10, after: 20 }); seq.push(await P2('xl1.vol')); }
  ok(seq[1] > -20 && seq[1] < -5, 'Puls block: two nudges on the lane fader ' + JSON.stringify(seq));
  await pg.evaluate(() => window.__M.setParam('xl1.vol', -20));
  await tap(pg, fd.x + fd.width * 0.4, fd.y + 30); await pg.waitForTimeout(80); await tap(pg, fd.x + fd.width * 0.4, fd.y + 30); await pg.waitForTimeout(250);
  ok(await P2('xl1.vol') === -20, 'Puls block: double tap on the fader body does nothing (' + await P2('xl1.vol') + ')');
  const pv = { x: fd.x + fd.width - 40, y: fd.y + 8 };
  await tap(pg, pv.x, pv.y); await pg.waitForTimeout(80); await tap(pg, pv.x, pv.y); await pg.waitForTimeout(250);
  ok(await P2('xl1.vol') === 0, 'Puls block: double tap on its value → 0 dB');
  const tg = await pg.evaluate(() => [...document.querySelectorAll('.mxp-sr button, .mxp-go')].filter((e) => e.getBoundingClientRect().width).map((e) => Math.round(e.getBoundingClientRect().width) + 'x' + Math.round(e.getBoundingClientRect().height)));
  ok(tg.every((t) => t.split('x').every((v) => +v >= 44)), 'Puls block targets ' + [...new Set(tg)].join(' '));
  console.log('puls errors', pg.errors);
  await ctx.close();
  // 12 keyboard on desktop
  ({ ctx, pg } = await page(b, 'd1280'));
  await start(pg); await pg.click('#tab-mix'); await pg.waitForTimeout(900);
  const P3 = (id) => pg.evaluate((i) => window.__M.P[i], id);
  await pg.evaluate(() => window.__M.setParam('xl0.vol', -10)); await pg.focus('.mx-st[data-k="l0"] .mx-cap');
  await pg.keyboard.press('End'); const e1 = await P3('xl0.vol');
  await pg.keyboard.press('Home'); const e2 = await P3('xl0.vol');
  await pg.keyboard.press('Shift+End'); const e3 = await P3('xl0.vol');
  await pg.keyboard.press('0'); const e4 = await P3('xl0.vol');
  ok(e1 === -10 && e2 === 0 && e3 === -60 && e4 === 0, 'fader keys: End ' + e1 + ', Home ' + e2 + ', Shift+End ' + e3 + ', 0 ' + e4);
  await pg.evaluate(() => { const M = window.__MX.MX; M.ch.l0.lv.max = 0.9; }); await pg.keyboard.press('r'); await pg.waitForTimeout(50);
  ok(await pg.evaluate(() => window.__MX.MX.ch.l0.lv.max) < 0.5, 'R on the cap resets the held peak');
  const tabs = await pg.evaluate(() => [...document.querySelectorAll('.mx-st[data-k="l0"] [tabindex="0"], .mx-st[data-k="l0"] button:not([tabindex="-1"])')].map((e) => (e.getAttribute('aria-label') || e.textContent).slice(0, 26)));
  console.log('info Spur 1 tab stops', tabs.length, JSON.stringify(tabs));
  const al = await pg.evaluate(() => document.querySelector('.mx-st[data-k="dly"] .k2 .mx-kn').getAttribute('aria-label'));
  ok(!/Echo Echo/.test(al), 'return knob name: ' + al);
  // 10 mid width (1180, mouse) and coarse widths: no overlaps
  await ctx.close();
  for (const w of ['d1180', 'd1024', 'ipadL', 'ipadP', 'c1440']) {
    ({ ctx, pg } = await page(b, w));
    await start(pg); await pg.evaluate(() => document.querySelector('#tab-mix').click()); await pg.waitForTimeout(1200);
    const r = await pg.evaluate(() => {
      const q = (s) => { const e = document.querySelector(s); if (!e || !e.getBoundingClientRect().width) return null; const r = e.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom]; };
      const X = (a, b) => !!(a && b && a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3]);
      const stats = q('.mx-stats'), img = q('.mx-img'), br = q('.mx-br'), hist = q('.mx-hist'), snap = q('.mx-snap'), cap = q('.mx-sum .mx-cap'), tief = q('.mx-sum .x1 .mx-kn'), sum = q('.mx-g-sum'), dim = q('.mx-sum .mx-s');
      return { sumW: sum && Math.round(sum[2] - sum[0]), statsImg: X(stats, img), statsSnap: X(stats, snap), brHist: X(br, hist), capTief: X(cap, tief), dimOut: dim && sum ? dim[2] > sum[2] + 1 : null, reg: !!q('.mx-reg'), regc: !!q('.mx-regc') };
    });
    ok(!r.statsImg && !r.statsSnap && !r.brHist && !r.capTief && !r.dimOut && r.sumW >= 120, w + ' ' + JSON.stringify(r));
    await pg.screenshot({ path: 's/' + w + '.png' });
    if (pg.errors.length) console.log(w, pg.errors);
    await ctx.close();
  }
  await b.close();
})();
