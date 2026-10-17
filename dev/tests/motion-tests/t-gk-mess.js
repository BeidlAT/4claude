// Gestik "Messen": rate and jitter, gyroscope, the sign checked against deviceorientation, the current tilt, "Spur
// aufnehmen" (30 s of raw samples as a JSON file through the app's own save path) played back through the trace player,
// and the Klopf-Messung (a fake microphone hears 8 knocks, the accelerometer feels each 40 ms later).   node t-gk-mess.js
const fs = require('fs');
const { open, ok, close, gestikOn } = require('./gk-h');
(async () => {
  const { page, errors } = await open({ cfg: { perm: 'granted' } });
  await gestikOn(page);
  await page.evaluate(() => window.__sensor(true, { beta: 45, roll: 0 }));
  await page.waitForTimeout(800);
  await page.click('.gk-card details.gk-mehr > summary');   // (Messen is under "Mehr")
  await page.click('.gk-card details summary:has-text("Messen")');
  await page.evaluate(() => window.__do(45, 0));
  await page.waitForTimeout(400);
  const m = await page.evaluate(() => { const r = {}; const dl = document.querySelector('.gk-mess'); const dt = [...dl.querySelectorAll('dt')]; for (const d of dt) r[d.textContent] = d.nextElementSibling.textContent; return r; });
  ok(/^(5[5-9]|6[0-5]) Hz · ±\d+ ms$/.test(m.Rate), 'Rate: "' + m.Rate + '"');
  ok(m.Gyroskop === 'ja', 'Gyroskop: "' + m.Gyroskop + '"');
  ok(m.Vorzeichen === 'normal (an der Lage geprüft)', 'Vorzeichen checked against deviceorientation: "' + m.Vorzeichen + '"');
  ok(/^↔ 0° · ↕ 0° vom Nullpunkt · 45° aus der Waagerechten$/.test(m.Neigung), 'Neigung: "' + m.Neigung + '"');
  ok(/noch nicht beobachtet/.test(m['Ansicht dreht']) && /geschätzt 40–100 ms/.test(m['Verzögerung']), 'turning angle and delay: not yet measured');
  // ---- Spur aufnehmen ----
  await page.click('.gk-card button:has-text("Spur aufnehmen")');
  await page.evaluate(async () => { for (let i = 0; i < 10; i++) { window.__setPose({ beta: 45, roll: i * 3 }); await window.__sleep(100); } });
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 5000 }), page.click('.gk-card button:has-text("Spur speichern")')]);
  const file = await dl.path(), name = dl.suggestedFilename(), J = JSON.parse(fs.readFileSync(file, 'utf8'));
  ok(/^myzel-gestik-spur-\d{4}-\d\d-\d\d_\d{4}\.json$/.test(name), 'saved as ' + name);
  ok(J.app === 'myzel' && J.kind === 'gestik-spur' && J.cols.join() === 't,gx,gy,gz,ax,ay,az,ra,rb,rg,orient,lock' && J.samples.length > 50 && J.gyro === true, 'the trace: ' + J.samples.length + ' raw samples, columns named, gyroscope noted');
  // ---- played back through the trace player ----
  await page.evaluate(async () => { window.__setPose({ beta: 45, roll: 0 }); await window.__sleep(400); window.__M.gkSet('clutch', 'immer'); window.__sensor(false); });
  await page.waitForTimeout(400);
  const back = await page.evaluate(async (J) => { const G = window.__M.GK; await G.play(J); return { x: G.raw.tiltX, live: G.live }; }, J);
  ok(back.x > 0.5, 'GK.play: the recorded tilt comes back (' + back.x.toFixed(2) + ')');
  // ---- Klopf-Messung with a fake microphone ----
  await page.evaluate(() => window.__sensor(true, { beta: 0, roll: 0 }, 0.2));
  await page.evaluate(() => {
    navigator.mediaDevices.getUserMedia = async () => {
      const fx = new AudioContext(), dst = fx.createMediaStreamDestination(), n = fx.sampleRate * 0.01, b = fx.createBuffer(1, fx.sampleRate * 8, fx.sampleRate), d = b.getChannelData(0);
      const t0 = performance.now() + 400, lead = (t0 - performance.now()) / 1000;
      for (let k = 0; k < 10; k++) { const i0 = Math.round((lead + k * 0.6) * fx.sampleRate); for (let i = 0; i < n; i++) d[i0 + i] = 0.8 * Math.exp(-i / (n / 4)) * (i % 2 ? 1 : -1); }
      const s = fx.createBufferSource(); s.buffer = b; s.connect(dst); s.start();
      // the table knock reaches the accelerometer 40 ms after the microphone
      for (let k = 0; k < 10; k++) setTimeout(() => { window.__S.p = { beta: 0, roll: 0, lin: [0, 0, 3] }; setTimeout(() => { window.__S.p = { beta: 0, roll: 0 }; }, 17); }, t0 - performance.now() + k * 600 + 40);
      window.__fx = fx;
      return dst.stream;
    };
  });
  await page.click('.gk-card button:has-text("Klopf-Messung")');
  await page.waitForFunction(() => window.__M.GK.p.lat != null || !window.__M.GK.kl, null, { timeout: 12000 }).catch(() => {});
  const k = await page.evaluate(() => ({ lat: window.__M.GK.p.lat, latS: window.__M.GK.p.latS, msg: document.querySelector('.gk-card .gk-mess') && [...document.querySelectorAll('.gk-card .note')].map((n) => n.textContent).find((t) => /Gemessen|Klopf|Abgebrochen|Mikrofon/.test(t)), kl: !!window.__M.GK.kl, store: JSON.parse(localStorage.getItem('myzel.gestik.v1')).lat }));
  ok(Number.isFinite(k.lat) && k.lat > 0 && k.lat < 300 && k.store === k.lat && !k.kl, 'Klopf-Messung: 8 knocks paired, ' + k.lat + ' ms stored for this device (sensor part ' + k.latS + ' ms)');
  ok(/^Gemessen: \d+ ms von der Bewegung bis zum Klang \(Sensor \d+ ms, Ausgabe \d+ ms\)\.$/.test(k.msg || ''), '"' + k.msg + '"');
  const m2 = await page.evaluate(() => [...document.querySelectorAll('.gk-mess dt')].find((d) => d.textContent === 'Verzögerung').nextElementSibling.textContent);
  ok(/^\d+ ms gemessen$/.test(m2), 'Messen shows it: "' + m2 + '"');
  ok(!errors.length, 'no errors ' + errors.join(' | '));
  await close();
})().catch(async (e) => { console.error(e); process.exitCode = 1; await close(); });
