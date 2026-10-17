// Helpers for the Sporenregen / Gestik-Rezepte suites (slot gs: sh ../v2/mk.sh /home/user/4claude/myzel gs): gk-h's
// open() on the gs-inst build (motion permission granted, a seeded Math.random), and in the page:
//   __key(x, y, id, type) / __up(id) – a note on the field at (x, y) (type 'touch' by default), and its end
//   __tilt(x, y)   – the dragged Wasserwaage's tilt (no sensor here: it is Gestik's tilt); null: let go
//   __collect()    – from now every strike of the rain into window.__hits ({ te, t, key, f, y, s (spore), lap }); __stop()
//   __starts       – every AudioScheduledSourceNode.start(when) since __startsOn() (the audio really scheduled)
// rain(page, settings) switches Gestik on by its tile and chooses "Neigen formt: Sporenregen" (plus the settings).
const H = require('./gk-h');
const URL_GS = process.env.GS || 'http://127.0.0.1:8790/gs-inst/index.html';
const open = (o = {}) => H.open(Object.assign({ url: URL_GS }, o, { cfg: Object.assign({ perm: 'granted', seed: 4242 }, o.cfg || {}) }));
async function tools(page) {
  await page.evaluate(() => {
    const M = window.__M;
    window.__key = (x, y, id, type = 'touch') => M.onDown({ pointerId: id, pointerType: type, pt: { x, y, px: x * M.VIS.w, py: (1 - y) * M.VIS.h } });
    window.__up = (id) => M.onUp({ pointerId: id, pointerType: 'touch' });
    window.__tilt = (x, y) => { M.GK.virt = x == null ? null : { x, y }; M.gkUpdate(performance.now(), []); };
    window.__collect = () => {
      clearInterval(window.__ci); window.__hits = []; let n = M.RG.n;
      window.__ci = setInterval(() => { const k = M.RG.n - n; if (k > 0) { window.__hits.push(...M.RG.log.slice(-k).map((e) => Object.assign({}, e))); n = M.RG.n; } }, 20);
    };
    window.__stop = () => { clearInterval(window.__ci); const k = M.RG.n; return window.__hits; };
    if (!window.__startsP) {
      window.__startsP = true; window.__starts = []; window.__startsRec = false;
      const st = AudioScheduledSourceNode.prototype.start;
      AudioScheduledSourceNode.prototype.start = function (when, ...a) { if (window.__startsRec) window.__starts.push(when || 0); return st.call(this, when, ...a); };
    }
    window.__startsOn = () => { window.__starts = []; window.__startsRec = true; };
  });
}
async function rain(page, set = {}) {
  await H.gestikOn(page);
  await page.waitForTimeout(250);
  await page.evaluate((set) => { const M = window.__M; M.closePanel(); for (const k in set) M.gkSet(k, set[k]); M.gkSet('neigen', 'regen'); }, set);
  await tools(page);
  await page.waitForTimeout(100);
}
// per spore and lap, the steps between consecutive strikes of a list: [prev, next] pairs
function pairs(hits, by = (h) => h.f) {
  const o = [], last = new Map();
  for (const h of hits.slice().sort((a, b) => a.t - b.t || a.te - b.te)) {
    const k = h.s + ':' + h.lap, p = last.get(k);
    if (p) o.push([by(p), by(h)]);
    last.set(k, h);
  }
  return o;
}
module.exports = Object.assign({}, H, { open, tools, rain, pairs, URL_GS });
