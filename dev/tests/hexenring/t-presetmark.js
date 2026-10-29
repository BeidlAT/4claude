// (owner, 29.10.2026: „die Markierung, welches Preset man gerade ausgewählt hat, verschwindet gerne“) the preset loaded
// last stays marked: „spielt“ as loaded, „geändert“ once a fader or the tempo moved; a thrown sound is from no preset
//   node t-presetmark.js
const G = require('./hx-g'), H = require('./hx-h');
const { ok } = H;
(async () => {
  const { page, errors } = await G.open({ w: 1440, h: 900 });
  const r = await page.evaluate(async () => {
    const M = window.__M, sl = window.__sleep;
    M.openPanel('presets'); await sl(500);
    const st = (k) => { const c = document.querySelector('.pcard[data-key="' + k + '"]'); return c ? c.getAttribute('aria-current') + '/' + c.dataset.geaendert : 'none'; };
    const k = M.PRESETS[2].key; M.loadPreset(M.PRESETS[2]); await sl(400); const a = st(k);
    M.setParam('xfin.vol', -3); await sl(300); const b = st(k);
    M.setParam('seq.bpm', 101); await sl(300); const c = st(k);
    const any = () => document.querySelectorAll('.pcard[aria-current="true"], .pcard[data-geaendert="true"]').length;
    return { a, b, c, n: any() };
  });
  ok(r.a === 'true/false', `loaded: marked as playing (${r.a})`);
  ok(r.b === 'false/true' && r.c === 'false/true' && r.n === 1, `a fader, then the tempo moved: still marked, „geändert“ (${r.b}, ${r.c}; ${r.n} card marked)`);
  ok(!errors.length, 'no page errors ' + JSON.stringify(errors.slice(0, 3)));
  process.exit(H.summary() ? 1 : 0);
})();
