// Hexenring – Klang verwandeln in Schritten (owner, 31.10.2026: „man kann bei der Tonhöhe mehrmals auf −1 klicken, dann geht
// es jedes Mal 1 runter; beim Verstimmen auch, dazu 1 und 2 ct – wenn Myzel das korrekt wiedergibt; im Feld ein Knopf zum
// Zurücksetzen“):
//  1 −1 three times: −3 (shown „jetzt −3 HT“); +1 ct, +1 ct, +2 ct: +4 ct; 0 sets a row back
//  2 Zurücksetzen: the whole Klangfarbe off; ↶ brings it back
//  3 the shift itself: a 440 Hz sine moved by +1 ct and −2 ct comes out at 440·2^(c/1200) (within 0.02 Hz)
//                                                                                     node t-hx-rx-schritte.js
const G = require('./hx-g'), H = require('./hx-h');
const { ok } = H;
const BPM = 120;
(async () => {
  const { page, errors } = await G.open({ w: 1400, h: 900 });
  const r = await page.evaluate(async (BPM) => {
    const M = window.__M, A = M.A, sl = window.__sleep, o = {};
    // 3 first: the op on a sine, measured by its zero crossings (a line through them over the middle second)
    const SR = A.ctx.sampleRate, N = Math.round(SR * 2.5), sine = new Float32Array(N); for (let i = 0; i < N; i++) sine[i] = 0.5 * Math.sin(2 * Math.PI * 440 * i / SR);
    const hz = (x) => { const z = []; for (let i = Math.round(SR * 0.6); i < Math.round(SR * 1.9); i++) if (x[i - 1] < 0 && x[i] >= 0) z.push(i - 1 + (-x[i - 1]) / (x[i] - x[i - 1])); const n = z.length, mi = (n - 1) / 2, mz = z.reduce((a, b) => a + b, 0) / n; let num = 0, den = 0; z.forEach((v, i) => { num += (i - mi) * (v - mz); den += (i - mi) * (i - mi); }); return SR / (num / den); };
    o.hz = [1, -2].map((c) => { const y = M.hxRvPitch([sine, sine], N, Math.pow(2, c / 1200)); return [c, +hz(y[0]).toFixed(4), +(440 * Math.pow(2, c / 1200)).toFixed(4)]; });
    await window.__reset(); window.__grid(BPM); await sl(400);
    M.setParam('hx.laenge', 'fest'); M.setParam('hx.festT', 1);
    const beat = 60 / BPM, B0 = Math.ceil(M.tgBeat(A.ctx.currentTime + 0.25) / 4) * 4, list = [];
    for (let i = 0; i < 4; i++) list.push([M.tgTime(B0) + i * beat, [0, 2, 4, 2][i], 0.9, 0.3]);
    window.__play(list, { eng: 'glo' }); await window.__until(M.tgTime(B0 + 4) + 0.04); M.hxKorb(null); await sl(1500);
    const L = M.hxLoopsLive()[0];
    M.hxEdOpen(L); await sl(300);
    const chipIn = (row, t) => [...document.querySelectorAll('.hx-ed-part .hx-ed-row')].find((x) => x.querySelector('.lab').textContent === row).querySelectorAll('.chip');
    const click = async (row, t) => { const b = [...chipIn(row)].find((x) => x.textContent === t); if (!b) throw new Error('chip ' + row + ' ' + t + ': ' + [...chipIn(row)].map((x) => x.textContent).join(',') + ' rx ' + JSON.stringify(L.rx)); b.click(); await sl(80); };
    const calm = async () => { for (let i = 0; i < 300 && L.rxBusy; i++) await sl(50); await sl(150); };
    const S = M.HX.sch.get(L.sch[0]); for (let i = 0; i < 300 && !(S.aud && (S.baked || !S.chain)); i++) await sl(100); await sl(1000);   // (ready: baked)
    for (let i = 0; i < 3; i++) await click('Tonhöhe', '−1');
    await click('Verstimmen', '+1 ct'); await click('Verstimmen', '+1 ct'); await click('Verstimmen', '+2 ct'); await calm();
    o.rx = M.hxRxOf(L); o.nowT = [...document.querySelectorAll('.hx-rx-now')].map((e) => e.textContent);
    await click('Tonhöhe', '0'); await calm(); o.zero = M.hxRxOf(L);
    await click('Färben', 'Licht'); await calm();
    const rb = document.querySelector('.hx-rx-reset'); o.rbOn = !rb.disabled; rb.click(); await calm(); o.reset = M.hxRxOf(L); o.rbOff = document.querySelector('.hx-rx-reset').disabled;
    M.hxUndoStep(); await calm(); o.undo = M.hxRxOf(L);
    return o;
  }, BPM);
  ok(r.hz.every(([c, got, want]) => Math.abs(got - want) < 0.02), `1 and 2 ct come out exactly: ${r.hz.map(([c, g, w]) => (c > 0 ? '+' : '') + c + ' ct → ' + g + ' Hz (soll ' + w + ')').join(', ')}`);
  ok(r.rx.pitch === -3 && r.rx.ct === 4 && r.nowT.join('|') === 'jetzt −3 HT|jetzt +4 ct', `−1 three times and +1 +1 +2 ct add up (${r.rx.pitch} HT, ${r.rx.ct} ct; „${r.nowT.join(' / ')}“)`);
  ok(r.zero.pitch === 0 && r.zero.ct === 4, `0: only the Tonhöhe back (${r.zero.pitch} HT, ${r.zero.ct} ct)`);
  ok(r.rbOn && r.reset.ct === 0 && !r.reset.farb && r.rbOff, 'Zurücksetzen: the whole Klangfarbe off, the button rests');
  ok(r.undo.ct === 4 && r.undo.farb === 'licht', `↶ brings it back (${r.undo.ct} ct, ${r.undo.farb})`);
  ok(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await H.close();
  process.exit(H.summary() ? 1 : 0);
})().catch(async (e) => { console.log('FAIL fatal ' + (e && e.stack || e)); await H.close(); process.exit(1); });
