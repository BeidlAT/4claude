// The microKEY's mod wheel (CC 1, "heller"): it never wrote the patch – it raises the height of its channel's held
// notes – and it sounds exactly as before: a chord held on a microKEY Air, the wheel swept at 60 Hz, every height the
// voices get compared with the app before Gestik (slot gkbase, build: run-all.sh). No patch value changes, the preset
// keeps its mark, nothing is saved. Now the wheel and Formen · Höhe add up instead of fighting.   node t-gm-wheel.js
const { open, ok, close } = require('./gm-h');
const OLD = 'http://127.0.0.1:8790/gkbase-inst/index.html';
async function sweep(url) {
  const { page, errors } = await open({ url, cfg: { ins: [['k1', 'microKEY Air']], seed: 99 } });
  const r = await page.evaluate(async () => {
    const M = window.__M;
    M.loadPreset(M.PRESETS.find((p) => p.key === 'tiefsee'));   // Nebel: the height opens its filter
    await window.__sleep(700);
    const P0 = JSON.stringify(M.P), pre = M.UI.preset, W = { set: 0 };
    const si = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) { if (k === 'myzel.patch.v1') W.set++; return si.call(this, k, v); };
    for (const n of [57, 60, 64]) window.__send([0x90, n, 80]);
    await window.__sleep(30);
    const log = [];
    for (const tt of M.touches.values()) for (const { v } of tt.voices) { const f = v.setY; v.setY = (y) => { log.push(String(tt.id).slice(-2) + ':' + y.toFixed(6)); return f(y); }; }
    for (let i = 0; i <= 180; i++) {
      window.__send([0xb0, 1, Math.round(127 * Math.abs(Math.sin((i / 180) * Math.PI * 1.5)))]);
      await window.__sleep(1000 / 60);
    }
    const ys = [...M.touches.values()].map((tt) => tt.y.toFixed(6));
    window.__send([0xb0, 1, 0]);
    for (const n of [57, 60, 64]) window.__send([0x80, n, 0]);
    await window.__sleep(500);
    return { log, ys, same: JSON.stringify(M.P) === P0, preset: M.UI.preset === pre && !!pre, saved: W.set };
  });
  await page.context().close();
  return Object.assign(r, { errors });
}
(async () => {
  const a = await sweep(OLD), b = await sweep(undefined);
  ok(a.log.length > 100 && a.log.join() === b.log.join(), 'the mod wheel sweeping a held chord: every height identical to before Gestik (' + b.log.length + ' setY calls)');
  ok(a.ys.join() === b.ys.join(), 'the notes\' heights at the end identical (' + b.ys.join(', ') + ')');
  ok(a.same && b.same && a.preset && b.preset && !a.saved && !b.saved, 'before and now: no patch value changes, the preset keeps its mark, nothing saved');
  // now: the wheel and Formen · Höhe add up
  const { page, errors } = await open({ cfg: { ins: [['k1', 'microKEY Air']] } });
  const r = await page.evaluate(async () => {
    const M = window.__M;
    M.setParam('v.eng', 'stm');
    window.__send([0x90, 60, 80]); await window.__sleep(30);
    const tt = [...M.touches.values()][0], o = {};
    window.__send([0xb0, 1, 64]); await window.__sleep(30);
    o.wheel = tt.y;
    M.modSet('t', 'hoehe', 0.2); M.modFlush(); await window.__sleep(30);
    o.sum = tt.my;
    window.__send([0xb0, 1, 80]); await window.__sleep(30);
    o.wheel2 = tt.y; o.sum2 = tt.my;
    M.modSet('t', 'hoehe', 0); M.modFlush(); await window.__sleep(30);
    o.back = tt.my === tt.y;
    window.__send([0x80, 60, 0]);
    return o;
  });
  ok(Math.abs(r.sum - (r.wheel + 0.1)) < 1e-9 && Math.abs(r.sum2 - (r.wheel2 + 0.1)) < 1e-9 && r.wheel2 > r.wheel && r.back, 'the wheel and Formen · Höhe add up (' + r.wheel.toFixed(3) + ' + 0.1 = ' + r.sum.toFixed(3) + '; wheel up: ' + r.sum2.toFixed(3) + ')');
  ok(!a.errors.length && !b.errors.length && !errors.length, 'no errors ' + a.errors.concat(b.errors, errors).join(' | '));
  await page.context().close();
  await close();
})().catch(async (e) => { console.error(e); process.exitCode = 1; await close(); });
