// Helpers for the Anlehnen suites (slot ga: sh ../v2/mk.sh /home/user/4claude/myzel ga): gm-h's open() and probes()
// on the ga-inst build, plus note and tilt drivers:
//   note(id, x, y) / up(id) – a finger on the field through the app's own onDown/onUp (pointerType optional);
//   tilt(x, y) – the dragged Wasserwaage's tilt (exact axis values, no sensor), virtOff();
//   cents(id) – what a note's own bend bus holds (fb.own) and the cents Anlehnen asked for.
const H = require('./gm-h');
const URL_GA = process.env.GA || 'http://127.0.0.1:8790/ga-inst/index.html';
const open = (o = {}) => H.open(Object.assign({ url: URL_GA }, o));
async function drivers(page) {
  await page.evaluate(() => {
    const M = window.__M, W = (window.__a = {});
    W.note = (id, x, y = 0.5, ptype) => { const r = { pointerId: id, pt: { x, y, px: x * M.VIS.w, py: (1 - y) * M.VIS.h } }; if (ptype) r.pointerType = ptype; M.onDown(r); return M.touches.get(id); };
    W.up = (id, ptype) => M.onUp(ptype ? { pointerId: id, pointerType: ptype, type: 'pointerup' } : { pointerId: id });
    W.tilt = (x, y = 0) => { M.GK.virt = { x, y }; M.gkUpdate(performance.now(), []); };
    W.virtOff = () => { M.GK.virt = null; M.gkUpdate(performance.now(), []); };
    W.tt = (id) => M.touches.get(id);
    W.cents = (tt) => (tt && tt.fb ? tt.fb.own : 0);
    W.want = (tt) => (tt && tt.ga ? tt.ga.c : 0);
    // a column's index → its x on the field
    W.colX = (i) => M.noteX ? M.noteX(i) : (i + 0.5) / M.N.notes.length;
  });
}
module.exports = Object.assign({}, H, { open, drivers, URL_GA });
