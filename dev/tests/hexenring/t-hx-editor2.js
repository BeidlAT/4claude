// (owner, 26.10.2026) the editor, second round: the window moved in the Ernte – what plays and what is drawn match it
// (no Ausklang carrying the notes that followed over the start); Stopp ends the listening and halts the Schleife; the
// bar under a zoomed waveform drags to the end; the editor's width drags at its right edge; its head line stays
// readable when narrow; the global Stopp in the top bar halts every Schleife and the Puls.   node t-hx-editor2.js
const G = require('./hx-g'), H = require('./hx-h');
const { ok } = H;
(async () => {
  const { page, errors } = await G.open({ w: 1440, h: 900 });
  const r = await page.evaluate(async () => {
    const M = window.__M, A = M.A, sl = window.__sleep, o = {};
    await window.__reset(); window.__grid(88); await sl(300);
    M.setParam('hx.laenge', 'fest'); M.setParam('hx.festT', 16);
    const B0 = Math.ceil(M.tgBeat(A.ctx.currentTime + 0.3) / 4) * 4;
    window.__riff(M.tgTime(B0), 60 / 88, [0, 4, 7, 4, 2, 5, 9, 5], 2.5, { eng: 'klb', dur: 0.3 }); await window.__until(M.tgTime(B0 + 20) + 0.06);
    M.hxKorb(null);
    const L = M.hxLoopsLive()[0], Sx = () => M.HX.sch.get(L.sch[0]);
    for (let i = 0; i < 400 && !(L && L.hum && Sx().aud); i++) await sl(100);
    const S = Sx(), barF = (S.cut.len / L.d.beats) * 4;
    o.app = M.hxHumApply(L, S.cut.w0 - 3 * barF, S.cut.w1 - 3 * barF, 'test');
    o.aus = Sx().aus ? +(Sx().aus.len / 48000).toFixed(2) : null;
    M.openPanel('presets'); await sl(400);   // (a panel open: the field narrower, the editor too)
    M.hxEdOpen(L); for (let i = 0; i < 120 && !(M.HXE.rw && M.HXE.rw.sig === M.HXE.rsig && M.HXE.rw.buf); i++) await sl(100);
    if (M.HXE.rw && M.HXE.rw.buf) { const b = M.HXE.rw.buf.getChannelData(0), n = b.length, out = []; for (let k = 0; k < 32; k++) { let v = 0; for (let i = Math.floor(k * n / 32); i < Math.floor((k + 1) * n / 32); i += 97) v = Math.max(v, Math.abs(b[i])); out.push(v > 0.01 ? '#' : '.'); } o.rd = out.join(''); }
    // narrow: the head's words keep a readable width
    o.metaW = Math.round(document.querySelector('.hx-ed-t .meta').getBoundingClientRect().width);
    // the scroll bar: zoomed in, dragged to the right end
    M.hxEdZoom(0.25); await sl(200);
    const cv = M.HXE.cv.getBoundingClientRect(), wave = document.querySelector('.hx-ed-wave');
    const pe = (type, x, y) => wave.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: x, clientY: y, pointerId: 7, button: 0 }));
    const tx = cv.left + (M.HXE.zv[0] + 0.12) * cv.width; pe('pointerdown', tx, cv.bottom - 4); pe('pointermove', tx + cv.width, cv.bottom - 4); pe('pointerup', tx + cv.width, cv.bottom - 4);
    o.zv1 = M.HXE.zv ? +M.HXE.zv[1].toFixed(3) : null;
    // the width grip
    const ed = M.HXE.ed, w0 = ed.getBoundingClientRect().width, g = M.HXE.grip.getBoundingClientRect();
    const ge = (type, x) => M.HXE.grip.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: x, clientY: g.top + 20, pointerId: 9, button: 0 }));
    ge('pointerdown', g.left + 4); ge('pointermove', g.left + 154); ge('pointerup', g.left + 154);
    o.width = [Math.round(w0), Math.round(ed.getBoundingClientRect().width)];
    // Stopp in the editor: the Schleife halts
    const lvl = async () => Math.max(...(await window.__meter(L.id, 500)).map((m) => m[1]));
    M.hxPvToggle(); await sl(1500); M.hxPvToggle(); await sl(400); o.edStop = L.state; o.edLvl = await lvl();
    M.hxEdClose();
    // the global Stopp
    M.hxReenter([L]); await sl(4500); o.before = L.state;
    document.getElementById('btnStopAll').click(); await sl(500);
    o.after = L.state; o.puls = M.SEQ.on; o.afterLvl = await lvl();
    return o;
  });
  console.log(JSON.stringify(r));
  ok(r.app && r.rd && !r.rd.slice(2, 22).includes('#'), `the window moved: the pass as heard has no carried-over notes at its start (${r.rd}, Ausklang ${r.aus} s)`);
  ok(r.metaW > 150, `the head line keeps its width (${r.metaW} px)`);
  ok(r.zv1 === 1, `the bar under a zoomed view drags to the end (${r.zv1})`);
  ok(r.width[1] > r.width[0] + 100, `the editor's width drags (${r.width.join(' → ')} px)`);
  ok(r.edStop === 'angehalten' && r.edLvl < 1e-4, `Stopp in the editor halts the Schleife (${r.edStop})`);
  ok(r.before === 'spielt' && r.after === 'angehalten' && !r.puls && r.afterLvl < 1e-4, `the global Stopp halts every Schleife and the Puls (${r.before} → ${r.after})`);
  ok(!errors.length, 'no page errors ' + errors.slice(0, 3).join(' | '));
  H.summary(); process.exit(0);
})();
