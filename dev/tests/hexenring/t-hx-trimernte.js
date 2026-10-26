// (owner, 26.10.2026: „es passt überhaupt nicht zusammen“ – a trimmed Schleife, Ätherwelle) the Ernte's window in the
// editor is the part that plays: trimmed to the second half, its audio is the Ernte at that window (not at the whole
// cut's); moving it a bar keeps the trimmed length and plays the Ernte there; its length reads as whole beats.
//                                                                                       node t-hx-trimernte.js
const G = require('./hx-g'), H = require('./hx-h');
const { ok } = H;
(async () => {
  const { page, errors } = await G.open({ w: 1440, h: 900 });
  const r = await page.evaluate(async () => {
    const M = window.__M, A = M.A, sl = window.__sleep, o = {};
    await window.__reset(); window.__grid(88); await sl(300);
    M.setParam('hx.laenge', 'fest'); M.setParam('hx.festT', 4);
    const B0 = Math.ceil(M.tgBeat(A.ctx.currentTime + 0.3) / 4) * 4;
    // held notes (Ätherwelle) changing every bar, bars before and after: the Ernte is longer than the window
    window.__riff(M.tgTime(B0), 4 * 60 / 88, [0, 7, 3, 9, 5, 11, 2, 8], 1, { eng: 'ond', dur: 2.6 }); await window.__until(M.tgTime(B0 + 32) + 0.06);
    M.hxKorb(null);
    const L = M.hxLoopsLive()[0], Sx = () => M.HX.sch.get(L.sch[0]);
    for (let i = 0; i < 400 && !(L && L.hum && Sx().aud); i++) await sl(100);
    o.hum = !!L.hum;
    // the played part of the Schicht against the Ernte at a window (sample correlation)
    const corr = (w0) => {
      const S = Sx(), Hm = L.hum, n = S.len, a = [], b = [];
      const at = (aud, i) => { const c = aud[Math.floor(i / M.HX_CH)]; return c ? c[0][i % M.HX_CH] : 0; };
      for (let i = 0; i < n; i += 7) { a.push(at(S.aud, S.pre + i)); const s = w0 - Hm.f0 + i; b.push(s >= 0 && s < Hm.n ? at(Hm.aud, s) : 0); }
      let ab = 0, aa = 0, bb = 0; for (let i = 0; i < a.length; i++) { ab += a[i] * b[i]; aa += a[i] * a[i]; bb += b[i] * b[i]; }
      return +(ab / Math.sqrt(aa * bb + 1e-12)).toFixed(3);
    };
    const S0 = Sx(); o.whole = corr(S0.cut.w0);
    M.hxBandTrimTo(L, 0.5, 0.5); await sl(300);
    for (let i = 0; i < 100 && Sx().cut === S0.cut; i++) await sl(100);
    const S = Sx(), W = M.hxHumWin ? M.hxHumWin(L, S) : null;
    o.beats = L.d.beats; o.len = M.hxLenText(L);
    o.atCut = corr(S.cut.w0);   // (where the strip drew the window before)
    o.atWin = W ? corr(W.w0) : null; o.winLen = W ? W.w1 - W.w0 : null; o.sLen = S.len;
    // a bar later in the Ernte: still 8 beats, the Ernte there
    if (W) {
      const barF = (S.cut.len / L.d.beats) * 4;
      o.app = M.hxHumApply(L, W.w0 + barF, W.w1 + barF, 'test'); await sl(300);
      const S2 = Sx(), W2 = M.hxHumWin(L, S2); o.beats2 = L.d.beats; o.trim2 = !!L.trim;
      o.atWin2 = corr(W2.w0); o.shift = W2.w0 - W.w0 - barF;
    }
    // the editor with the Ernte strip drawn (its window, the drag's path), and a trim's float beats as text
    M.hxEdOpen(L); await sl(1200); o.strip = !!document.querySelector('.hx-ed-humcv'); o.info = (document.querySelector('.hx-ed-hum .hx-ms') || {}).textContent || '';
    M.hxEdClose();
    const d0 = L.d.beats; L.d.beats = 16.000000000000004; o.txt = M.hxLenText(L); L.d.beats = 49 / 3; o.txt2 = M.hxLenText(L); L.d.beats = d0;
    return o;
  });
  console.log(JSON.stringify(r));
  ok(r.hum && r.whole > 0.99, `the whole Schicht is the Ernte at its window (${r.whole})`);
  ok(r.beats === 8 && /^8 Schläge|^2 Takte/.test(r.len), `trimmed to the second half: ${r.beats} beats, „${r.len}“`);
  ok(r.atWin > 0.99 && r.winLen === r.sLen, `the window drawn in the Ernte is the part that plays (${r.atWin}; at the whole cut's start: ${r.atCut})`);
  ok(r.app && r.beats2 === 8 && !r.trim2 && r.atWin2 > 0.99 && r.shift === 0, `a bar later: 8 beats, the Ernte there (${r.atWin2})`);
  ok(r.strip && !/\d\.\d{5}/.test(r.info) && r.txt === '4 Takte' && r.txt2 === '16,33 Schläge', `the editor's Ernte strip („${r.info}“); 16.000000000000004 beats read „${r.txt}“, 49/3 „${r.txt2}“`);
  ok(!errors.length, 'no page errors ' + errors.slice(0, 3).join(' | '));
  H.summary(); process.exit(0);
})();
