// Puls und Bordun mit dem Preset, Puls starten spielt, die Leiste leuchtet (owner, 31.10.2026: „Puls und Bordun spielen
// nicht mehr, auch wenn ich ein Preset lade … wenn man auf Puls starten klickt, soll er auch spielen … das Symbol unten in
// der Leiste soll leuchten, wenn der Puls aktiv ist – nicht wie bei aktiver Auswahl; dasselbe für das Sporenwerk“):
//  1 Leere Erde (no Spur on): Puls starten runs it with Spur 1 – heard
//  2 a preset with lanes and a Bordun, the Puls standing: it starts, its Bordun sounds
//  3 the Puls tab glows while the Puls runs (data-live, mint – not the open panel's amber), the Sporenwerk tab while it is on
//                                                         node t-puls-start.js   (slot 'mm': sh ../v2/mk.sh … mm)
const { open, ok, close } = require('./hm');
(async () => {
  const { page, errors } = await open({});
  const r = await page.evaluate(async () => {
    const M = window.__M, A = M.A, sl = (ms) => new Promise((r) => setTimeout(r, ms)), o = {};
    const lvl = async () => { const b = new Float32Array(2048); let s = 0; for (let k = 0; k < 25; k++) { A.analyser.getFloatTimeDomainData(b); let q = 0; for (const x of b) q += x * x; s += q / b.length; await sl(40); } return +(10 * Math.log10(s / 25 + 1e-20)).toFixed(1); };
    const live = (k) => document.getElementById('tab-' + k).hasAttribute('data-live');
    if (M.SEQ.on) M.seqStop();
    M.loadPreset(M.PRESET_LEER); await sl(1500);
    o.leer = { seq: M.SEQ.on, lanes: [0, 1, 2, 3].map((i) => M.P['l' + i + '.on']), lvl: await lvl(), live: live('puls') };
    document.getElementById('btnPuls').click(); await sl(1500);
    o.go = { seq: M.SEQ.on, l0: M.P['l0.on'], lvl: await lvl(), live: live('puls') };
    const st = getComputedStyle(document.querySelector('#tab-puls svg')), sel = document.getElementById('tab-puls');
    o.color = st.color; o.filter = st.filter;
    document.getElementById('btnPuls').click(); await sl(600); o.stopLive = live('puls');
    const pr = M.PRESETS.find((p) => p.name === 'Tiefsee'); M.loadPreset(pr); await sl(2000);
    o.pre = { seq: M.SEQ.on, bor: !!A.bor, lvl: await lvl(), live: live('puls'), toast: (document.getElementById('toastMsg') || {}).textContent };
    o.arp0 = live('arp'); M.setParam('arp.on', true); await sl(600); o.arp1 = live('arp'); M.setParam('arp.on', false); await sl(600); o.arp2 = live('arp');
    M.seqStop(); return o;
  });
  ok(!r.leer.seq && r.leer.lanes.every((x) => !x) && !r.leer.live, `Leere Erde: no Spur, the Puls stands, its tab dark (${r.leer.lvl} dB)`);
  ok(r.go.seq && r.go.l0 && r.go.lvl > r.leer.lvl + 10 && r.go.live, `Puls starten: it runs with Spur 1 – heard (${r.leer.lvl} → ${r.go.lvl} dB), its tab glows`);
  ok(/134, 240, 208/.test(r.color) && /drop-shadow/.test(r.filter), `the glow is mint, not the open panel's amber (${r.color})`);
  ok(!r.stopLive, 'halted: the tab dark again');
  ok(r.pre.seq && r.pre.bor && r.pre.lvl > -45 && r.pre.live, `Tiefsee loaded: its Puls starts, its Bordun sounds (${r.pre.lvl} dB) – „${r.pre.toast}“`);
  ok(!r.arp0 && r.arp1 && !r.arp2, 'the Sporenwerk tab glows while it is on');
  await page.screenshot({ path: __dirname + '/out/puls-start.png' });
  ok(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await close();
})();
