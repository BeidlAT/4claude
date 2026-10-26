// The mixer opening straight in its view „Schleifen“ (owner, 26.10.2026, screenshot: only Schleife 1 drawn, the others
// without meter, cap or Balance): the view is remembered, so the Pult may never have been laid out – every strip must
// still draw (its words, its Balance knob, its cap at its level, its meter while its loop plays).   node t-hx-mixer2.js
const G = require('./hx-g'), H = require('./hx-h');
const { ok } = H;
(async () => {
  const { page, errors } = await G.open({ w: 1440, h: 900, init: () => { try { localStorage.setItem('myzel.mixview', 'schleifen'); } catch (e) {} } });
  const r = await page.evaluate(async () => {
    const M = window.__M, A = M.A, o = {};
    await window.__reset(); window.__grid(110); M.setParam('hx.laenge', 'fest'); M.setParam('hx.festT', 1); await window.__sleep(300);
    for (const d of [[0, 4, 7, 4, 2, 5, 9, 5], [7, 9, 11, 12, 11, 9, 7, 4], [0, 0, 2, 2, 4, 4, 5, 5], [9, 7, 5, 4, 2, 0, 2, 4]]) {
      const B0 = Math.ceil(M.tgBeat(A.ctx.currentTime + 0.3) / 4) * 4;
      window.__riff(M.tgTime(B0), 0.5, d, 1, { eng: 'klb', dur: 0.3 }); await window.__until(M.tgTime(B0 + 4) + 0.06);
      M.hxKorb(null); await window.__sleep(400);
    }
    M.HX.chips = null; M.setParam('hx.laenge', 'auto'); await window.__sleep(2200);
    M.openPanel('mix'); await window.__sleep(1200);
    o.view = M.MX.view;
    const st = [...document.querySelectorAll('.mx-v-schleifen .hxm-st:not(.hxm-all)')];
    o.n = st.length;
    o.strips = st.map((s) => {
      const c = s.querySelector('.hxm-stem canvas'), x = c.getContext('2d'), d = x.getImageData(0, 0, c.width, c.height).data; let lit = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 150 && d[i + 1] > 90) lit++;
      const k = s.querySelector('.hxm-kn canvas'), kd = k.getContext('2d').getImageData(0, 0, k.width, k.height).data; let kn = 0; for (let i = 3; i < kd.length; i += 4) if (kd[i] > 0) kn++;
      return { src: s.querySelector('.hxm-src').textContent, state: s.querySelector('.hxm-state').textContent, cap: !!s.querySelector('.hxm-cap').style.transform, kv: s.querySelector('.hxm-kv').textContent, lit, kn };
    });
    return o;
  });
  const bad = r.strips.map((s, i) => (s.src && s.state && s.cap && s.kv && s.kn > 20 && s.lit > 20 ? null : i + 1)).filter(Boolean);
  ok(r.view === 'schleifen' && r.n === 4 && !bad.length, `opened straight in „Schleifen“: all ${r.n} strips drawn – words, Balance, cap, meter${bad.length ? '; not: ' + bad.join(', ') : ''} (${JSON.stringify(r.strips)})`);
  await page.screenshot({ path: 'out/mixer-schleifen-direkt.png' });
  ok(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await H.close(); process.exit(H.summary() ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
