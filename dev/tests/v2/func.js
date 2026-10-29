// Functional test: desktop viewport, fake Web MIDI keyboard, quality levels, Gerät panel.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs');
const URL_ = process.env.URL || 'http://127.0.0.1:8790/new-inst/index.html';
fs.mkdirSync('out', { recursive: true });
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  await page.addInitScript(() => {
    const mk = (id, name) => ({ id, name, state: 'connected', onmidimessage: null });
    const inputs = new Map([['k1', mk('k1', 'Testkeyboard')]]);
    window.__midi = { inputs, asked: 0 };
    window.__midi.access = { inputs, outputs: new Map(), onstatechange: null };
    navigator.requestMIDIAccess = () => { window.__midi.asked++; return Promise.resolve(window.__midi.access); };
    const q = navigator.permissions.query.bind(navigator.permissions);
    navigator.permissions.query = (d) => (d && d.name === 'midi' ? Promise.resolve({ state: 'prompt' }) : q(d));
    window.__send = (bytes, id = 'k1') => { const i = inputs.get(id); i.onmidimessage && i.onmidimessage({ data: new Uint8Array(bytes), timeStamp: performance.now() }); };
  });
  await page.goto(URL_);
  await page.waitForFunction(() => !!window.__M);
  ok(await page.evaluate(() => window.__M.MIDI.state === 'idle' && window.__midi.asked === 0), 'no MIDI prompt before start');
  await page.click('#btnStart');
  await page.waitForTimeout(700);
  const st = await page.evaluate(() => ({ s: window.__M.MIDI.state, n: window.__M.MIDI.ports.size, asked: window.__midi.asked, lat: window.__M.A.latMode, q: window.__M.P['dev.q'], toast: document.querySelector('#toastMsg').textContent }));
  console.log(JSON.stringify(st));
  ok(st.s === 'ready' && st.n === 1 && st.asked === 1, 'desktop asks for MIDI at start and binds the input');
  ok(st.lat === 'min' && st.q === '2', 'desktop defaults: latency min, quality 2');
  ok(/Testkeyboard/.test(st.toast), 'toast names the keyboard');
  // note on / off
  let r = await page.evaluate(() => { window.__send([0x90, 60, 100]); const M = window.__M, tt = M.touches.get('midi-k1-0-60'); return tt && { f: tt.f, name: tt.name, nv: tt.voices.length, vel: tt.vel, y: tt.y, voices: M.A.voices.size }; });
  console.log(JSON.stringify(r));
  ok(r && Math.abs(r.f - 261.6256) < 0.01 && r.name === 'C4', 'Skala: C4 plays C4 in D minor pentatonic');
  ok(r && r.nv >= 1 && r.voices >= 1, 'note-on starts a voice');
  r = await page.evaluate(() => { window.__send([0x80, 60, 0]); const M = window.__M; return { held: M.touches.has('midi-k1-0-60'), rel: [...M.A.voices].every((v) => v.released) }; });
  ok(!r.held && r.rel, 'note-off releases');
  // snapping and the other maps
  r = await page.evaluate(() => {
    const M = window.__M, out = {};
    out.cs4 = M.midiNote(61).name; out.e4 = M.midiNote(64).name; out.low = M.midiNote(26).name;
    M.setParam('midi.map', 'white'); out.wC3 = M.midiNote(48); out.wD3 = M.midiNote(50).name; out.wCs3 = M.midiNote(49).name; out.wC4 = M.midiNote(60).name;
    M.setParam('midi.map', 'chrom'); out.c61 = M.midiNote(61); out.c20 = M.midiNote(21);
    M.setParam('midi.map', 'scale');
    return out;
  });
  console.log(JSON.stringify(r));
  ok(r.cs4 === 'C4' && r.e4 === 'F4' && r.low === 'D1', 'Skala snaps (ties go down) and extends below the field');
  ok(Math.abs(r.wC3.f - 146.832) < 0.01 && r.wC3.idx === 0 && r.wD3 === 'F3' && r.wCs3 === 'D3' && r.wC4 === 'G4', 'Weiße Tasten walk the columns from C');
  ok(Math.abs(r.c61.f - 277.18) < 0.02 && r.c61.name === 'C♯4' && r.c20.x < 0.01, 'Chromatisch plays exact pitches, off-field at the edge');
  // sustain pedal
  r = await page.evaluate(() => {
    const M = window.__M; window.__send([0xb0, 64, 127]); window.__send([0x90, 62, 90]); window.__send([0x80, 62, 0]);
    const a = M.touches.has('midi-k1-0-62'); window.__send([0xb0, 64, 0]); const b = M.touches.has('midi-k1-0-62'); return { a, b };
  });
  ok(r.a && !r.b, 'sustain pedal holds until released');
  // wheel, pressure, bend
  r = await page.evaluate(async () => {
    const M = window.__M; window.__send([0x90, 57, 64]); const y0 = M.touches.get('midi-k1-0-57').y;
    window.__send([0xb0, 1, 127]); const y1 = M.touches.get('midi-k1-0-57').y;
    window.__send([0xe0, 0x7f, 0x7f]); await new Promise((r) => setTimeout(r, 120)); const b = M.A.bendSrc.offset.value;
    window.__send([0xe0, 0, 0x40]); window.__send([0xb0, 1, 0]); window.__send([0x80, 57, 0]);
    return { y0, y1, b, bc: M.A.bendCents, nv: M.A.voices.size };
  });
  console.log(JSON.stringify(r));
  ok(r.y1 > r.y0 + 0.2, 'mod wheel raises the colour of held notes');
  ok(r.b > 150 && r.b <= 200, 'pitch wheel bends by up to 2 semitones');
  // hot-plug
  r = await page.evaluate(() => { const i = { id: 'k2', name: 'Zweites', state: 'connected', onmidimessage: null }; window.__midi.inputs.set('k2', i); window.__midi.access.onstatechange({}); return { n: window.__M.MIDI.ports.size, bound: typeof i.onmidimessage === 'function', toast: document.querySelector('#toastMsg').textContent }; });
  ok(r.n === 2 && r.bound && /Zweites/.test(r.toast), 'hot-plugged keyboard is bound and announced');
  r = await page.evaluate(() => { window.__send([0x90, 65, 100], 'k2'); const a = window.__M.touches.has('midi-k2-0-65'); window.__midi.inputs.delete('k2'); window.__midi.access.onstatechange({}); return { a, b: window.__M.touches.has('midi-k2-0-65'), n: window.__M.MIDI.ports.size }; });
  ok(r.a && !r.b && r.n === 1, 'unplugging releases its notes');
  // ignore clock / active sensing
  await page.evaluate(() => { for (let i = 0; i < 50; i++) window.__send([0xf8]); window.__send([0xfe]); });
  // quality levels and budget under a flood of notes in every engine
  for (const q of ['1', '2', '3']) {
    await page.evaluate((q) => window.__M.setParam('dev.q', q), q);
    if (q === '3') await page.waitForFunction(() => !window.__M.CAL.running && window.__M.CAL.unit > 0, null, { timeout: 15000 });
    for (const eng of ['neb', 'kor', 'hau', 'glo', 'mem', 'sai', 'sch']) {
      const res = await page.evaluate(async (eng) => {
        const M = window.__M; M.setParam('v.eng', eng);
        let maxLoad = 0, maxN = 0, over = 0;
        for (let k = 0; k < 60; k++) {
          const n = 36 + ((k * 7) % 48);
          window.__send([0x90, n, 40 + (k % 80)]);
          if (k % 3 === 2) window.__send([0x80, 36 + (((k - 1) * 7) % 48), 0]);
          if (eng === 'kor') M.grainTick(M.A.ctx.currentTime + 0.12);
          maxLoad = Math.max(maxLoad, M.voiceLoad()); maxN = Math.max(maxN, M.A.voices.size);
          // (29.10.2026) against the budget in force at that moment: the guard (Leistung) may lower it mid-flood when the
          // test machine underruns – a load reached before that step is no fault
          const b = M.getBudget(); if (M.voiceLoad() > b[0] + 1e-9 || M.A.voices.size > b[1]) over++;
          await new Promise((r) => setTimeout(r, 12));
        }
        window.__send([0xb0, 123, 0]);
        const [B, MX] = M.getBudget();
        return { maxLoad: +maxLoad.toFixed(2), maxN, B, MX, grains: M.A.grains, over, sc: M.A.budgetScale || 1 };
      }, eng);
      ok(!res.over, `q${q} ${eng}: load ${res.maxLoad}/${res.B}, voices ${res.maxN}/${res.MX}${res.sc < 1 ? ' (the guard lowered the budget to ×' + res.sc.toFixed(2) + ' meanwhile)' : ''}`);
    }
  }
  const cal = await page.evaluate(() => ({ unit: window.__M.CAL.unit, b: window.__M.getBudget(), rich: window.__M.getQ().rich, revCh: window.__M.A.revWant }));
  console.log('calibration', JSON.stringify(cal));
  ok(cal.rich && cal.revCh === 4, 'level 3: rich voices and true-stereo reverb');
  // Gerät panel
  await page.click('#tab-dev');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'out/dev-desktop.png' });
  const txt = await page.evaluate(() => document.querySelector('#sheetBody').innerText);
  ok(/gemeldet: Puffer/.test(txt) && /Verbunden: Testkeyboard/.test(txt) && /Gewaltig/.test(txt), 'Gerät panel shows latency, keyboard and level text');
  // latency change asks for a restart
  await page.evaluate(() => window.__M.setParam('dev.lat', 'std'));
  ok(await page.evaluate(() => /Neustart/.test(document.querySelector('#toastMsg').textContent) && [...document.querySelectorAll('#sheetBody button')].some((b) => b.textContent === 'Klang neu starten' && !b.hidden)), 'latency change offers a restart');
  await page.waitForTimeout(600);
  ok(await page.evaluate(() => JSON.parse(localStorage.getItem('myzel.dev.v1'))['dev.lat'] === 'std' && !('dev.q' in JSON.parse(localStorage.getItem('myzel.patch.v1')).values)), 'device settings stored apart from the patch');
  console.log('errors:', errors.length ? errors.join('\n') : 'none');
  ok(!errors.length, 'no console errors');
  await browser.close();
})();
