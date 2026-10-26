// Gerätebild (26.10.2026): a PCR-M50 is recognised, drawn; Einmessen takes R1 … S8 … B6 in turn (each moved once);
// „Logisch belegen“: knobs – filter and the sound, faders – the mixer in the Pult's order (S1 = Klang), buttons – the
// transport; a fader on the device then moves its channel; a click chooses another target.   node t-gbild.js
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => {
    const mk = (id, name) => ({ id, name, manufacturer: 'Roland', state: 'connected', onmidimessage: null });
    const inputs = new Map([['k1', mk('k1', 'PCR-M50 MIDI')]]);
    window.__midi = { inputs, access: { inputs, outputs: new Map(), onstatechange: null } };
    navigator.requestMIDIAccess = () => Promise.resolve(window.__midi.access);
    window.__send = (bytes) => { const i = inputs.get('k1'); i.onmidimessage && i.onmidimessage({ data: new Uint8Array(bytes), timeStamp: performance.now() }); };
  });
  await page.goto('http://127.0.0.1:8790/new-inst/index.html');
  await page.waitForFunction(() => !!window.__M);
  await page.click('#btnStart'); await page.waitForTimeout(1200);
  const r = await page.evaluate(async () => {
    const M = window.__M, sl = (ms) => new Promise((r) => setTimeout(r, ms)), o = {};
    const src = [...M.MIDI.srcs.values()][0]; o.src = src && src.name;
    M.cbOpen(src); await sl(300);
    o.model = document.querySelector('.cb-model').value;
    o.drawn = document.querySelectorAll('.cb-c').length;
    M.cbCalStart(); await sl(100);
    // the device: R1–R8 send CC 16–23, S1–S8 CC 24–31, B1–B6 CC 80–85 (any numbers – Einmessen learns them)
    const seq = []; for (let i = 0; i < 8; i++) seq.push(16 + i); for (let i = 0; i < 6; i++) seq.push(80 + i); for (let i = 0; i < 8; i++) seq.push(24 + i);   // (in the panel's order: R1–R8, B1–B6, S1–S8)
    for (const cc of seq) { window.__send([0xb0, cc, 64]); window.__send([0xb0, cc, 70]); await sl(330); }
    const d = M.cbData(src); o.cal = Object.keys(d.ctl).length; o.calStep = M.CB.step;
    o.logical = M.cbLogical(src);
    const bind = (cc) => M.MAP.user.find((u) => u.type === 'cc' && u.num === cc);
    o.r1 = bind(16) && bind(16).target; o.s1 = bind(24) && bind(24).target; o.s3 = bind(26) && bind(26).target; o.b1 = bind(80) && bind(80).target;
    M.cbClose(); await sl(100);
    const v0 = M.P['xfin.vol']; for (let v = 127; v >= 20; v -= 3) { window.__send([0xb0, 24, v]); await sl(8); } await sl(150);  o.fader = [v0, M.P['xfin.vol']];
    M.cbOpen(src); await sl(400);
    // (owner, 26.10.2026: „nicht erkannt“) the names its drivers give it; the device card names the model
    o.names = ['PCR-M 1', 'EDIROL PCR 1', 'PCR-M30/50/80', 'PCR MIDI', 'PCR-M30', 'EDIROL PCR-500'].map((n) => M.profModel({ name: n }).id);
    M.cbClose(); M.openPanel('dev'); await sl(400);
    o.card = [...document.querySelectorAll('.kc-prof')].map((e) => e.textContent).join(' | ');
    return o;
  });
  console.log(JSON.stringify(r));
  await page.screenshot({ path: 'out/gbild.png' });
  ok(r.model === 'pcrm50' && r.drawn >= 22, `PCR-M50 recognised and drawn (${r.model}, ${r.drawn} controls)`);
  ok(r.cal === 22 && r.calStep === -1, `Einmessen: 22 controls taken in turn (${r.cal})`);
  ok(r.r1 === 'flt.freq' && r.s1 === 'xfin.vol' && r.s3 === 'xhxr.vol' && r.b1 === 'puls', `logical: R1 Filter, S1 Klang, S3 Hexenring, B1 Puls (${r.r1}, ${r.s1}, ${r.s3}, ${r.b1})`);
  ok(r.fader[1] < r.fader[0] - 5, `S1 on the device moves the first mixer channel (${r.fader.join(' → ')} dB)`);
  ok(r.names.join() === 'pcrm50,pcrm50,pcrm50,pcrm50,pcrm30,pcr500', `port names recognised: ${r.names.join(', ')}`);
  ok(/PCR-M50 erkannt/.test(r.card), `the device card names it: „${r.card.slice(0, 90)}“`);
  ok(!errors.length, 'no page errors ' + errors.slice(0, 3).join(' | '));
  await browser.close();
})();
