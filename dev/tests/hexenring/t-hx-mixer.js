// The loops in the mixer (owner, 25.10.2026: „separater Mixer für Schleifen“): the mixer's view „Schleifen“ – a strip
// per loop with its level (the console's fader law), Balance, M and S at once, its own meter; „Alle“ is the Hexenring
// channel; the Balance reaches the processor and stays with the loop (snapshot, record); MIDI targets per loop.
//   node t-hx-mixer.js   (screenshot out/mixer-schleifen.png)
const G = require('./hx-g'), H = require('./hx-h');
const { ok } = H;
(async () => {
  const { page, errors } = await G.open({ w: 1440, h: 900 });
  const r = await page.evaluate(async () => {
    const M = window.__M, A = M.A, o = {};
    await window.__reset(); window.__grid(110); M.setParam('hx.laenge', 'fest'); M.setParam('hx.festT', 1); await window.__sleep(300);
    for (const d of [[0, 4, 7, 4, 2, 5, 9, 5], [7, 9, 11, 12, 11, 9, 7, 4], [0, 0, 2, 2, 4, 4, 5, 5]]) {
      const B0 = Math.ceil(M.tgBeat(A.ctx.currentTime + 0.3) / 4) * 4;
      window.__riff(M.tgTime(B0), 0.5, d, 1, { eng: 'klb', dur: 0.3 }); await window.__until(M.tgTime(B0 + 4) + 0.06);
      M.hxKorb(null); await window.__sleep(400);
    }
    M.HX.chips = null; M.setParam('hx.laenge', 'auto'); await window.__sleep(2200);
    M.openPanel('mix'); await window.__sleep(400);
    const sw = document.querySelector('.mx-vsw [data-v="schleifen"]'); o.tab = !!sw; sw.click(); await window.__sleep(900);
    const st = [...document.querySelectorAll('.mx-v-schleifen .hxm-st')];
    o.n = st.length; o.names = st.map((s) => s.querySelector('.hxm-nm').textContent);
    o.vis = st.every((s) => s.offsetParent && s.getBoundingClientRect().height > 250);
    const Ls = M.hxLoopsLive().sort((a, b) => a.slot - b.slot), L1 = Ls[0], L2 = Ls[1], L3 = Ls[2];
    // the meters move while the loops play
    o.cv = st.slice(0, 3).map((s) => { const c = s.querySelector('.hxm-stem canvas'), x = c.getContext('2d'), d = x.getImageData(0, 0, c.width, c.height).data; let lit = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 150 && d[i + 1] > 90) lit++; return lit; });
    // the fader: keys (a focused stem) – arrows ±0,5 dB
    const stem = st[0].querySelector('.hxm-stem'); stem.focus();
    for (let i = 0; i < 6; i++) stem.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await window.__sleep(100); o.db = +(20 * Math.log10(L1.gain)).toFixed(2); o.val = st[0].querySelector('.hxm-val').textContent;
    // Balance by keys, then a double click back to the middle
    const kn = st[1].querySelector('.hxm-kn'); kn.focus();
    for (let i = 0; i < 4; i++) kn.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    await window.__sleep(150); o.pan = L2.pan; o.kv = st[1].querySelector('.hxm-kv').textContent;
    o.snapPan = M.hxSnap(L2).pan;
    // M at once; S: only that loop, again – all as before
    st[2].querySelector('.mx-m').click(); await window.__sleep(100); o.m = { st: L3.state, pressed: st[2].querySelector('.mx-m').getAttribute('aria-pressed') };
    st[2].querySelector('.mx-m').click(); await window.__sleep(100); o.m2 = L3.state;
    st[0].querySelector('.mx-s').click(); await window.__sleep(150); o.s = Ls.map((L) => L.state); o.sp = st[0].querySelector('.mx-s').getAttribute('aria-pressed');
    st[0].querySelector('.mx-s').click(); await window.__sleep(150); o.s2 = Ls.map((L) => L.state);
    // „Alle“ is the Hexenring channel
    const all = document.querySelector('.mx-v-schleifen .hxm-all'); o.all = !!all;
    all.querySelector('.mx-m').click(); await window.__sleep(80); o.allM = M.P['xhxr.mute']; all.querySelector('.mx-m').click();
    // the processor got the Balance: its report's level per side – render check via the snapshot's record
    o.rec = M.hxRecOf ? M.hxRecOf(L2).pan : null;
    // MIDI targets
    const T = M.MTARGETS; o.mt = ['hx.ring.1.stumm', 'hx.ring.1.balance', 'hx.ring.1.pegel', 'hx.ring.1.solo'].every((k) => T.has(k));
    T.get('hx.ring.3.balance').set(0); o.mtPan = L3.pan; T.get('hx.ring.3.stumm').press(1); await window.__sleep(60); o.mtM = L3.state; T.get('hx.ring.3.stumm').press(1); T.get('hx.ring.3.balance').set(0.5);
    // a loop gone: its strip goes too
    M.hxDelete(L3); await window.__sleep(600); o.after = document.querySelectorAll('.mx-v-schleifen .hxm-st:not(.hxm-all)').length;
    // (owner, 26.10.2026) the Pult itself: a group „Schleifen“ right beside the Hexenring channel, folding
    M.mxSetView('pult'); await window.__sleep(900);
    const g = document.querySelector('.mx-g-hxl'), hx = document.querySelector('.mx-st[data-k="hxr"]').getBoundingClientRect(), ps = [...g.querySelectorAll('.hxm-st')];
    o.pult = { shown: !g.hidden, n: ps.length, names: ps.map((x) => x.querySelector('.hxm-nm').textContent), next: Math.abs(g.getBoundingClientRect().left - hx.right) < 20, h: Math.round(ps[0].getBoundingClientRect().height) };
    const L1b = M.hxLoopsLive().sort((a, b) => a.slot - b.slot)[0], stem2 = ps[0].querySelector('.hxm-stem'); stem2.focus(); stem2.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true })); await window.__sleep(80);
    o.pult.db = +(20 * Math.log10(L1b.gain)).toFixed(2);
    g.querySelector('.hxmp-fold').click(); await window.__sleep(300); o.pult.fold = [g.classList.contains('fold'), g.querySelector('.hxmp-fold').textContent];
    g.querySelector('.hxmp-fold').click(); await window.__sleep(300); o.pult.open = !g.classList.contains('fold');
    return o;
  });
  await page.screenshot({ path: 'out/mixer-schleifen.png' });
  ok(r.tab && r.n === 4 && r.names.join(',') === 'Schleife 1,Schleife 2,Schleife 3,Alle' && r.vis, `the mixer's view „Schleifen“: a strip per loop and „Alle“ (${r.names.join(', ')})`);
  ok(r.cv.every((n) => n > 20), `each strip's meter lights while its loop plays (${r.cv.join(', ')} lit pixels)`);
  ok(Math.abs(r.db + 3) < 0.05 && r.val === '−3,0 dB', `the fader by keys: 6 × ↓ = −3 dB on the loop (${r.db} dB, „${r.val}“)`);
  ok(Math.abs(r.pan - 0.2) < 1e-6 && r.kv === 'R20' && r.snapPan === 0.2 && r.rec === 0.2, `Balance by keys: R20 on the loop, in its snapshot and its record (${r.pan}, „${r.kv}“, ${r.snapPan}, ${r.rec})`);
  ok(r.m.st === 'stumm' && r.m.pressed === 'true' && r.m2 === 'spielt', `M mutes at once and back (${JSON.stringify(r.m)}, ${r.m2})`);
  ok(r.s.join() === 'spielt,stumm,stumm' && r.sp === 'true' && r.s2.join() === 'spielt,spielt,spielt', `S: only that loop, again: all as before (${r.s.join()} → ${r.s2.join()})`);
  ok(r.all && r.allM === true, '„Alle“ is the Hexenring channel (its M is xhxr.mute)');
  ok(r.mt && r.mtPan === -1 && r.mtM === 'stumm', `MIDI: per loop stumm, Balance, Pegel, Solo (${r.mtPan}, ${r.mtM})`);
  ok(r.after === 2, `a loop deleted: its strip goes (${r.after})`);
  ok(r.pult.shown && r.pult.n === 2 && r.pult.names.join() === 'Schleife 1,Schleife 2' && r.pult.next && r.pult.h > 250, `the Pult: the loops one by one right beside the Hexenring channel (${JSON.stringify(r.pult)})`);
  ok(Math.abs(r.pult.db + 2.5) < 0.05 && r.pult.fold[0] && /schleifen 2/.test(r.pult.fold[1]) && r.pult.open, `… the same faders (−3 → −2,5 dB), its header folds and unfolds it (${JSON.stringify(r.pult.fold)})`);
  ok(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await H.close(); process.exit(H.summary() ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
