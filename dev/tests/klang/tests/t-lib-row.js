// Klangquellen: the row at every place (field, layer, four lanes, mixer copies, Sporenregen in the mixer and in the
// Gestik card): its shape, ‹ › stepping in ENG_OPTS order with a probe (none while the place sounds), the ends, the
// passed sources of the rain, the die with Rückgängig, the long press, the bar's chip.   node t-lib-row.js
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const L = require('./dsplib'), K = require('./klh');
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const { page, errors, ctx } = await K.open(browser, { w: 360, h: 740 });
  const M = (fn, a) => page.evaluate(fn, a);
  await M(() => window.__M.openPanel('klang')); await page.waitForTimeout(300);
  // the shape: a group of three buttons, ≥ 44 px, ids kept for MIDI „Zuweisen“
  let r = await M(() => {
    const el = document.querySelector('#p-v-eng'), b = [...el.querySelectorAll('button')], q = el.getBoundingClientRect();
    return { role: el.getAttribute('role'), n: b.length, h: Math.round(q.height), small: b.filter((x) => { const z = x.getBoundingClientRect(); return z.height < 44 || z.width < 44; }).length, pid: el.closest('[data-pid]') && el.closest('[data-pid]').dataset.pid, chips: el.querySelectorAll('.chip').length,
      label: el.querySelector('.kq-name').getAttribute('aria-label'), name: el.querySelector('.kq-n').textContent, order: window.__M.ENG_OPTS.map((o) => o[0]).join(' ') };
  });
  L.ok(r.role === 'group' && r.n === 3 && r.h >= 44 && !r.small && r.pid === 'v.eng' && !r.chips, 'field: #p-v-eng is a group of ‹ name › (' + r.h + ' px, all targets ≥ 44 px), data-pid kept, no chips');
  L.ok(/Nebel · Dunst/.test(r.name) && /Klangquelle für die Spielfläche: Nebel, Dunst, hält\. Bibliothek öffnen/.test(r.label), 'name line „' + r.name + '“, label „' + r.label + '“');
  L.ok(r.order === 'hau obt stm hlm boe elm neb kor swm amo hrz shn rnk sai jrg glo sch gng klb gsp tie mem trp mdr rhz', 'ENG_OPTS by family (' + r.order + ')');
  // ‹ › step and probe
  await page.click('#p-v-eng .kq-step:last-child'); await page.waitForTimeout(120);
  r = await M(() => ({ eng: window.__M.P['v.eng'], pr: [...window.__M.A.voices].filter((v) => v.alive && v.probe && !v.probeEnd).map((v) => v.eng), say: document.querySelector('#kqSay').textContent }));
  L.ok(r.eng === 'kor' && r.pr.includes('kor') && /Körner gewählt für die Spielfläche/.test(r.say), '› steps Nebel → Körner, plays a probe (' + r.pr + '), says „' + r.say + '“');
  await page.click('#p-v-eng .kq-step:first-child'); await page.waitForTimeout(120);
  r = await M(() => ({ eng: window.__M.P['v.eng'], pr: [...window.__M.A.voices].filter((v) => v.alive && v.probe && !v.probeEnd).length }));
  L.ok(r.eng === 'neb' && r.pr === 1, '‹ steps back, one probe at a time (' + r.pr + ')');
  // ends: disabled, no wrap
  r = await M(() => { const M = window.__M; M.setParam('v.eng', 'hau'); const a = document.querySelector('#p-v-eng .kq-step:first-child').disabled; M.setParam('v.eng', 'rhz'); const b = document.querySelector('#p-v-eng .kq-step:last-child').disabled; M.kqStep(M.kqTarget('v.eng'), 1); return { a, b, eng: M.P['v.eng'] }; });
  L.ok(r.a && r.b && r.eng === 'rhz', 'the ends: ‹ disabled at Hauch, › at Rhizom, no wrap');
  // no probe while a finger holds
  r = await M(async () => {
    const M = window.__M; M.setParam('v.eng', 'neb'); M.kqProbeEnd();
    M.onDown({ pointerId: 7, pointerType: 'touch', pt: { x: 0.3, y: 0.5, px: 100, py: 100 } }); await window.__sleep(80);
    M.kqStep(M.kqTarget('v.eng'), 1); await window.__sleep(50);
    const n = [...M.A.voices].filter((v) => v.alive && v.probe && !v.probeEnd).length;
    M.onUp({ pointerId: 7, pointerType: 'touch' }); return { n, eng: M.P['v.eng'] };
  });
  L.ok(r.eng === 'kor' && r.n === 0, 'while a finger holds, › changes the source without a probe');
  // the die: only the source, a toast with Rückgängig
  r = await M(async () => {
    const M = window.__M; M.setParam('v.eng', 'neb'); const before = Object.assign({}, M.P);
    document.querySelector('.sec-h .kq-dice').click(); await window.__sleep(100);
    const eng = M.P['v.eng'], diff = Object.keys(before).filter((k) => before[k] !== M.P[k]);
    const t = document.querySelector('#toastMsg').textContent, act = document.querySelector('#toastAct');
    const sh = !act.hidden && act.textContent; act.click(); await window.__sleep(50);
    return { eng, diff, t, sh, back: M.P['v.eng'] };
  });
  L.ok(r.eng !== 'neb' && r.diff.join() === 'v.eng' && /^Überraschung: /.test(r.t) && r.sh === 'Rückgängig' && r.back === 'neb', 'the die picks ' + r.eng + ' (changes only v.eng), toast „' + r.t.slice(0, 40) + '…“; Rückgängig brings Nebel back');
  // long press on the name: held probe, no library; released at let-go
  const nb = await page.locator('#p-v-eng .kq-name').boundingBox();
  await page.mouse.move(nb.x + nb.width / 2, nb.y + nb.height / 2); await page.mouse.down(); await page.waitForTimeout(650);
  r = await M(() => ({ pr: [...window.__M.A.voices].filter((v) => v.alive && v.probe && !v.probeEnd && !v.released).map((v) => v.eng), lib: !document.querySelector('#kqLib') || document.querySelector('#kqLib').hidden }));
  await page.mouse.up(); await page.waitForTimeout(100);
  const r2 = await M(() => ({ held: [...window.__M.A.voices].filter((v) => v.alive && v.probe && !v.probeEnd && !v.released).length, lib: !document.querySelector('#kqLib') || document.querySelector('#kqLib').hidden }));
  L.ok(r.pr.includes('neb') && r.lib && r2.held === 0 && r2.lib, 'long press: Nebel sounds held (' + r.pr + '), the library stays shut; letting go releases it');
  // keyboard ←/→ on the name
  await page.focus('#p-v-eng .kq-name'); await page.keyboard.press('ArrowRight'); await page.waitForTimeout(60);
  r = await M(() => window.__M.P['v.eng']);
  L.ok(r === 'kor', '→ on the focused name steps (' + r + ')');
  await page.keyboard.press('ArrowLeft');
  // the second layer: Aus in the row, ‹ › pass through Aus
  r = await M(() => {
    const M = window.__M, el = document.querySelector('#p-v-layer'); M.setParam('v.layer', 'off');
    const a = { name: el.querySelector('.kq-n').textContent, off: el.classList.contains('off'), prev: el.querySelector('.kq-step').disabled };
    el.querySelector('.kq-step:last-child').click(); a.next = M.P['v.layer']; el.querySelector('.kq-step').click(); a.back = M.P['v.layer']; return a;
  });
  L.ok(/^Aus · keine zweite Ebene/.test(r.name) && r.off && r.prev && r.next === 'hau' && r.back === 'off', 'layer: „' + r.name + '“, › → Hauch, ‹ → Aus again');
  // the lanes: a row each (44 px), probe through the lane's channel with its gate
  await M(() => window.__M.openPanel('puls')); await page.waitForTimeout(250);
  r = await M(async () => {
    const M = window.__M, o = {};
    o.rows = [0, 1, 2, 3].map((i) => !!document.querySelector('#p-l' + i + '-eng.kq-row'));
    const T = M.kqTarget('l1.eng'), pr = T.probe(); o.gate = pr.gate; o.bus = pr.bus === M.stripIn('l1'); o.y = pr.y === M.P['l1.bright'];
    M.selectLane(1); await window.__sleep(50);
    document.querySelector('#p-l1-eng .kq-step:last-child').click(); await window.__sleep(60);
    o.eng = M.P['l1.eng']; o.pr = [...M.A.voices].filter((v) => v.alive && v.probe && !v.probeEnd).map((v) => v.eng);
    o.tab = document.querySelectorAll('.lane-tab')[1].querySelectorAll('small')[1].textContent; o.tabG = !!document.querySelectorAll('.lane-tab')[1].querySelector('small .kq-g');
    o.h = Math.round(document.querySelector('#p-l1-eng').getBoundingClientRect().height);
    // the Puls runs and the lane plays: a step changes the source silently
    M.setParam('l1.on', true); M.seqStart(); await window.__sleep(80); M.kqProbeEnd();
    M.kqStep(T, 1); await window.__sleep(30); o.busy = [...M.A.voices].filter((v) => v.alive && v.probe && !v.probeEnd).length; M.seqStop();
    return o;
  });
  L.ok(r.rows.every(Boolean) && r.h >= 44, 'four lane rows (' + r.h + ' px)');
  L.ok(r.bus && r.y && r.gate > 0.05 && r.gate < 2 && r.eng === 'obt' && r.pr.includes('obt'), 'lane 2: probe through its channel, its brightness, gate ' + r.gate.toFixed(3) + ' s; › Hauch → Obertöne');
  L.ok(r.tab === 'Obertöne' && r.tabG && r.busy === 0, 'its tab shows glyph + name; while the Puls plays the lane, steps are silent');
  // the mixer: the copies of the rows in the Fruchtkörper
  await M(() => window.__M.openPanel('mix')); await page.waitForTimeout(800);
  for (const [k, id] of [['fin', 'v-eng'], ['eb2', 'v-layer'], ['l2', 'l2-eng']]) {
    r = await M(async ([k, id]) => {
      const b = document.querySelector('.mx-st[data-k="' + k + '"] .mx-sh'); if (b) b.click(); await window.__sleep(700);
      const el = document.querySelector('#mxd-p-' + id);
      if (!el) return null;
      el.scrollIntoView({ block: 'center' }); await window.__sleep(100);
      el.querySelector('.kq-name').click(); await window.__sleep(250);
      const o = { row: el.classList.contains('kq-row'), pid: el.closest('[data-pid]').dataset.pid, title: document.querySelector('#kqTitle').textContent, lib: !document.querySelector('#kqLib').hidden, dl: document.querySelector('#sheet').dataset.lib };
      document.querySelector('.kq-done').click(); await window.__sleep(100);
      o.after = document.querySelector('#kqLib').hidden && !!window.__M.MX.detailK;
      return o;
    }, [k, id]);
    L.ok(r && r.row && r.lib && r.after, 'mixer ' + k + ': the Fruchtkörper row (data-pid ' + (r && r.pid) + ') opens the library „' + (r && r.title) + '“, Fertig back to the Fruchtkörper');
  }
  await M(() => window.__M.closePanel());
  // Sporenregen: the mixer's Quelle and the Gestik card; ‹ › pass held sources; the strike chosen is the rain's
  r = await M(async () => {
    const M = window.__M, o = {}; M.gkSet('rgS', 'mem'); M.gkSet('neigen', 'regen');
    M.openPanel('mix'); await window.__sleep(700);
    const b = document.querySelector('.mx-st[data-k="rgn"] .mx-sh'); if (b) b.click(); await window.__sleep(700);
    const el = document.querySelector('#mxd-kq-rgS');
    o.has = !!el; if (!el) return o;
    o.name = el.querySelector('.kq-n').textContent;
    el.querySelector('.kq-step').click(); o.prev = M.GK.p.rgS;   // mem ← tie (held) is passed: klb
    el.querySelector('.kq-step:last-child').click(); o.next = M.GK.p.rgS;
    M.gkSet('rgS', 'sai'); el.closest('.kq').sync(); o.first = el.querySelector('.kq-step').disabled;   // before Saite only held sources
    o.rgs = M.RG_S.map((x) => x[0]).join(' ');
    M.closePanel(); M.gkEnable(true); await window.__sleep(500); M.openPanel('dev'); await window.__sleep(400);
    o.card = !!document.querySelector('#gk-kq-rgS') || 'no card';
    M.gkSet('rgS', 'trp');
    return o;
  });
  L.ok(r.has && /Membran · Erde/.test(r.name) && r.prev === 'gsp' && r.next === 'mem', 'mixer „Regen“: row „' + r.name + '“; ‹ passes Tiefe (held) to Gespinst, › back to Membran');
  L.ok(r.first && r.rgs === 'sai jrg glo sch klb gsp mem trp mdr rhz', 'nothing before Saite can rain (‹ disabled); RG_S derived: ' + r.rgs);
  L.ok(r.card === true, 'the Gestik card has the rain row too (' + r.card + ')');
  // the bar's chip: glyphs, and a long press opens the library on the field
  await M(() => { const M = window.__M; M.closePanel(); M.setParam('v.eng', 'hlm'); M.setParam('v.layer', 'glo'); });
  r = await M(() => ({ g: document.querySelectorAll('#engGlyph .kq-g').length, name: document.querySelector('#engName').textContent, al: document.querySelector('#engChip').getAttribute('aria-label') }));
  L.ok(r.g === 2 && r.name === 'Halm + Glocke' && /lange drücken öffnet die Bibliothek/.test(r.al), 'the chip: two glyphs, „' + r.name + '“, „' + r.al + '“');
  const cb = await page.locator('#engChip').boundingBox();
  await page.mouse.move(cb.x + 40, cb.y + 15); await page.mouse.down(); await page.waitForTimeout(600); await page.mouse.up(); await page.waitForTimeout(200);
  r = await M(() => ({ lib: !document.querySelector('#kqLib').hidden, panel: window.__M.UI.panel, key: document.querySelector('#sheet').dataset.lib }));
  L.ok(r.lib && r.panel === 'klang' && r.key === 'v.eng', 'a long press on the chip opens the Klang panel and the library for the field');
  await M(() => { window.__M.kqClose(); window.__M.setParam('v.layer', 'off'); window.__M.setParam('v.eng', 'neb'); });
  L.ok(!errors.length, 'no console errors (' + errors.slice(0, 2).join(' | ') + ')');
  await ctx.close(); await browser.close();
  process.exit(L.summary() ? 1 : 0);
})().catch((e) => { console.log('FAIL fatal ' + (e && e.stack || e)); process.exit(1); });
