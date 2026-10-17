// Funkstrecke (slot gf; node t-gf-funk.js): page A is a phone (motion events, a fake MIDI output "Pixel 7 USB-MIDI"),
// page B a computer without sensors (a fake MIDI input of the same name); every byte A sends is handed to B. A picks
// the output in its Gestik card: the signature goes out first, then the axes (14-bit NRPN, only on change, ≤ 100 per
// second each) and events (notes). B recognises the signature: profile "Gestik (Handy)", Gestik switched on for it (its
// own switch untouched); B's axes equal A's within quantisation, the events arrive in order; nothing reaches B's
// standard map, pedals or keys; B's notes are its clutch and its zero, A's zero resets it; B learns the phone's axes
// as Gestik; the end (output off, silence, profile off, switched off by hand); A never follows its own echo.
const H = require('./gf-h');
const { ok } = H;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// the NRPN parameters (42/n) in one send – an update sends all its changed axes at once
const nrpns = (d) => { const o = []; for (let i = 0; i + 11 < d.length; i += 12) if (d[i] === 0xbf && d[i + 1] === 99 && d[i + 2] === 42) o.push(d[i + 5]); return o; };
let relay = true;   // (the relay below runs until the end – also when a check throws)
(async () => {
  const A = await H.open({ mobile: true, cfg: { perm: 'granted', ins: [['i1', 'Pixel 7 USB-MIDI']] } });
  const B = await H.open({ cfg: { noMotion: true, ins: [['p1', 'Pixel 7 USB-MIDI']] } });
  const pa = A.page, pb = B.page;
  await pa.evaluate(() => window.__outs('o1', 'Pixel 7 USB-MIDI'));
  await pa.waitForFunction(() => [...window.__M.MIDI.outs.values()].some((o) => o.name === 'Pixel 7 USB-MIDI'), null, { timeout: 3000 });
  // the relay: A's output → B's input (and, for the echo check, A's own input when asked)
  let echo = false;
  const sent = [];
  (async () => {
    while (relay) {
      const m = await pa.evaluate(() => window.__midi.outputs.get('o1').sent.splice(0)).catch(() => []);
      if (m.length) {
        for (const x of m) sent.push(x);
        await pb.evaluate((l) => { for (const x of l) window.__send(x.d, 'p1'); }, m).catch(() => {});
        if (echo) await pa.evaluate((l) => { for (const x of l) window.__send(x.d, 'i1'); }, m).catch(() => {});
      }
      await sleep(12);
    }
  })();
  const patch0 = await pb.evaluate(() => JSON.stringify(window.__M.patchValues ? window.__M.patchValues() : Object.keys(window.__M.P).sort().map((k) => [k, window.__M.P[k]])));
  // ---- A: Gestik on, sensor alive; the Funkstrecke fold, the honest text, pick the output
  await H.gestikOn(pa);
  await pa.evaluate(() => window.__sensor(true, { beta: 45, roll: 0 }, 3));
  await sleep(1200);
  await pa.click('.gk-card details.gk-mehr > summary');   // (the Funkstrecke is under „Mehr“ since the fix phase)
  await pa.click('.gk-fs > summary');
  const txt = await pa.evaluate(() => document.querySelector('.gk-fs').textContent);
  ok(/Ungetestet: ob dein Handy im USB-MIDI-Modus einen Ausgang bekommt, hängt vom Gerät ab/.test(txt) && /Belegung/.test(txt), 'A\'s card: "Funkstrecke – als MIDI senden", with the honest word: untested, depends on the phone');
  await pa.click('.gk-fs [role=radio][data-v="Pixel 7 USB-MIDI"]');
  await sleep(800);
  const first = sent.slice(0, 1).map((x) => x.d.join(','));
  ok(first[0] === [0xbf, 99, 42, 0xbf, 98, 127, 0xbf, 6, 71, 0xbf, 38, first[0] ? +first[0].split(',')[11] : -1].join(','), 'A sends its signature first: NRPN 42/127 = 71·128 + flags on channel 16 (' + first[0] + ')');
  const st = await pa.evaluate(() => ({ fs: window.__M.GK.p.fs, t: document.querySelector('.gk-fs .note:nth-of-type(2)') && [...document.querySelectorAll('.gk-fs p')].map((p) => p.textContent).find((t) => /Sendet an/.test(t)) }));
  ok(st.fs === 'Pixel 7 USB-MIDI' && /Sendet an Pixel 7 USB-MIDI/.test(st.t || ''), 'A: „' + st.t + '“');
  // ---- the dark view: only the Wasserwaage, touches swallowed, a double tap back
  await pa.click('.gk-fs .btn:has-text("Nur die Wasserwaage")');
  await sleep(300);
  const dk = await pa.evaluate(() => { const d = document.querySelector('.gkf-dark'); return d && { txt: d.textContent, bg: getComputedStyle(d).backgroundColor }; });
  ok(dk && /Sendet an Pixel 7 USB-MIDI/.test(dk.txt) && dk.bg === 'rgb(0, 0, 0)', 'A shows only its Wasserwaage on black: „' + (dk && dk.txt) + '“');
  await pa.touchscreen.tap(200, 400);
  await sleep(500);
  ok(await pa.evaluate(() => window.__M.touches.size === 0 && !!document.querySelector('.gkf-dark')), 'a touch there plays nothing');
  await pa.touchscreen.tap(200, 400); await sleep(80); await pa.touchscreen.tap(200, 400);   // a finger, twice
  await sleep(200);
  ok(await pa.evaluate(() => !document.querySelector('.gkf-dark') && window.__M.gkfSending()), 'a double tap brings the app back – it keeps sending');
  // ---- B recognises it and runs Gestik for it
  await pb.waitForFunction(() => window.__M.GK.on && !!window.__M.GK.rem, null, { timeout: 4000 });
  const b1 = await pb.evaluate(() => { const M = window.__M, s = [...M.MIDI.srcs.values()].find((x) => x.name === 'Pixel 7 USB-MIDI'); M.mapOf(s); return { prof: s.prof && s.prof.name, on: M.GK.on, p: M.GK.p.on, src: !!M.GK.src, toast: document.getElementById('toastMsg').textContent, rem: M.GK.remOnly }; });
  ok(b1.prof === 'Gestik (Handy)' && b1.on && b1.src && b1.rem && b1.p === false, 'B recognises the signature: profile "Gestik (Handy)", Gestik on for it – its own switch untouched');
  ok(/Gestik \(Handy\) erkannt/.test(b1.toast), 'B says so: „' + b1.toast + '“');
  await pb.evaluate(() => window.__M.openPanel('dev'));
  await sleep(500);
  const bc = await pb.evaluate(() => ({ name: document.querySelector('.gk-card .kc-dn').textContent, badge: document.querySelector('.gk-card .kc-badge').textContent, stat: document.querySelector('.gk-card .gk-stat').textContent, prof: [...document.querySelectorAll('.kc-dev .kc-prof')].map((p) => p.textContent).join(' | '), fs: document.querySelector('.gk-card .gk-fs').hidden }));
  ok(/Handy über die Funkstrecke/.test(bc.name) && bc.badge === 'Funkstrecke' && /^Funkstrecke: Pixel 7 USB-MIDI · \d+ Werte\/s$/.test(bc.stat) && bc.fs, 'B\'s Gestik card: „' + bc.name + '“ · ' + bc.badge + ' · „' + bc.stat + '“ (no sending from here)');
  ok(/Gestik \(Handy\) erkannt/.test(bc.prof), 'B\'s device card: „Gestik (Handy) erkannt – …“');
  await pb.evaluate(() => window.__M.closePanel());
  // ---- the axes: equal within quantisation, pose after pose
  const cmp = async (label, pose) => {
    await pa.evaluate((p) => window.__setPose(p), pose);
    await sleep(900);
    const a = await pa.evaluate(() => Object.assign({}, window.__M.GK.raw));
    const b = await pb.evaluate(() => Object.assign({}, window.__M.GK.raw));
    const d = Math.max(...['tiltX', 'tiltY', 'bebung', 'drehen', 'ladung'].map((k) => Math.abs(a[k] - b[k])));
    ok(d < 0.004, label + ': B\'s axes = A\'s (largest difference ' + d.toFixed(5) + '; ↔ ' + a.tiltX.toFixed(3) + ' / ' + b.tiltX.toFixed(3) + ', ↕ ' + a.tiltY.toFixed(3) + ' / ' + b.tiltY.toFixed(3) + ')');
  };
  await cmp('leaning right 15°', { beta: 45, roll: 15 });
  await cmp('top edge away (beta 62°)', { beta: 62, roll: -8 });
  await cmp('back at the zero pose', { beta: 45, roll: 0 });
  // ---- events, in order, on both
  await pa.evaluate(() => { const M = window.__M; window.__evs = []; M.GK.subs.push((o, r, evs) => { for (const e of evs) if (['wenden', 'ruhe', 'schuetteln'].includes(e.type)) window.__evs.push(e.type + (e.on ? '+' : '-')); }); });
  await pb.evaluate(() => { const M = window.__M; window.__evs = []; window.__notes = 0; M.GK.subs.push((o, r, evs) => { for (const e of evs) if (['wenden', 'ruhe', 'schuetteln'].includes(e.type)) window.__evs.push(e.type + (e.on ? '+' : '-')); if (M.touches.size) window.__notes++; }); });
  await pa.evaluate(() => window.__setPose({ beta: 180, roll: 0 }));   // face down
  await sleep(1200);
  await pa.evaluate(() => window.__setPose({ beta: 45, roll: 0 }));
  await sleep(1000);
  await pa.evaluate(() => { window.__S.p = { beta: 45, roll: 0, lin: [0, 0, 0] }; const t0 = performance.now(); window.__shk = setInterval(() => { const t = (performance.now() - t0) / 1000; window.__S.p.lin = [16 * Math.sin(2 * Math.PI * 5 * t), 3 * Math.sin(2 * Math.PI * 5 * t), 0]; }, 8); });
  await sleep(1600);
  await pa.evaluate(() => { clearInterval(window.__shk); window.__S.p.lin = [0, 0, 0]; });
  await sleep(1200);
  await pa.evaluate(() => window.__sensor(true, { beta: 0, roll: 0 }, 0));   // laid on the table
  await sleep(2600);
  const ea = await pa.evaluate(() => window.__evs.join(' ')), eb = await pb.evaluate(() => window.__evs.join(' '));
  ok(/wenden\+/.test(ea) && /schuetteln\+/.test(ea) && /ruhe\+/.test(ea) && ea === eb, 'events arrive in order: A ' + ea + ' | B ' + eb);
  const lad = await pb.evaluate(() => window.__M.LAD ? window.__M.GK.raw.ladung : null);
  ok(await pb.evaluate(() => window.__notes === 0 && window.__M.touches.size === 0 && window.__M.MIDI.notes.size === 0), 'the event notes (48–52, channel 16) never played a note on B');
  const patch1 = await pb.evaluate(() => JSON.stringify(window.__M.patchValues ? window.__M.patchValues() : Object.keys(window.__M.P).sort().map((k) => [k, window.__M.P[k]])));
  ok(patch0 === patch1, 'B\'s patch is untouched: no NRPN, no note of the phone reached the standard map, a pedal or a parameter');
  await pa.evaluate(() => window.__sensor(true, { beta: 45, roll: 0 }, 3));
  await sleep(1500);
  // ---- rate: ≤ 100 per second per axis, even at 200 samples a second
  await pa.evaluate(() => {
    window.__sensor(false);
    const t0 = performance.now();
    window.__fast = setInterval(() => { for (let k = 0; k < 2; k++) { const t = (performance.now() - t0) / 1000, b = (45 + 20 * Math.sin(2 * Math.PI * 1.7 * t)) * Math.PI / 180, c = (15 * Math.sin(2 * Math.PI * 2.3 * t)) * Math.PI / 180; window.__dm({ g: [-9.81 * Math.sin(c), 9.81 * Math.sin(b) * Math.cos(c), 9.81 * Math.cos(b) * Math.cos(c)], a: [0, 0, 0], r: [20 * Math.sin(t * 9), 30 * Math.cos(t * 7), 5] }); } }, 10);
  });
  const r0 = sent.length;
  await sleep(2200);
  await pa.evaluate(() => { clearInterval(window.__fast); window.__sensor(true, { beta: 45, roll: 0 }, 3); });
  const win = sent.slice(r0), per = {};
  for (const x of win) for (const n of nrpns(x.d)) (per[n] || (per[n] = [])).push(x.at);
  let worst = 0;
  for (const k in per) { if (+k === 127) continue; const t = per[k]; for (let i = 0; i < t.length; i++) { let j = i; while (j < t.length && t[j] - t[i] < 1000) j++; worst = Math.max(worst, j - i); } }
  ok(worst > 40 && worst <= 101, 'at 200 samples a second: at most 100 messages per second for each axis (busiest: ' + worst + ')');
  // ---- only on change: a phone lying perfectly still sends only its signature
  await pa.evaluate(() => { window.__sensor(false); window.__still = setInterval(() => window.__dm({ g: [0, 6.937, 6.937], a: [0, 0, 0], r: [0, 0, 0] }), 16); });
  await sleep(1500);
  const r1 = sent.length;
  await sleep(1000);
  const w2 = sent.slice(r1);
  const by = {};
  for (const x of w2) for (const n of nrpns(x.d)) by[n] = (by[n] || 0) + 1;
  const beats = by[127] || 0, tilt = (by[0] || 0) + (by[1] || 0), rest = Object.keys(by).filter((k) => k !== '127' && k !== '0' && k !== '1').map((k) => '42/' + k + ' ×' + by[k]).join(', ');
  ok(tilt === 0 && beats >= 8 && beats <= 12, 'held perfectly still: no tilt goes out – only the signature (' + beats + ' per second)' + (rest ? ' and what still settles (' + rest + ': Ladung, Drehen and Schwenken drain on their own time)' : ''));
  await pa.evaluate(() => { clearInterval(window.__still); window.__sensor(true, { beta: 45, roll: 0 }, 3); });
  await sleep(800);
  // ---- B's notes are its clutch and its zero
  await pa.evaluate(() => window.__setPose({ beta: 45, roll: 15 }));
  await sleep(800);
  await pb.evaluate(() => window.__M.onDown({ pointerId: 'b1', pt: { x: 0.4, y: 0.5, px: 200, py: 300 } }));
  await sleep(500);
  const z = await pb.evaluate(() => ({ x: window.__M.GK.raw.tiltX, out: window.__M.GK.out.tiltX, mode: window.__M.GK.mode }));
  ok(Math.abs(z.x) < 0.01 && z.mode === 'live', 'a note on B: its zero is the phone\'s lean then (↔ ' + z.x.toFixed(3) + ' while the phone leans 15°), Gestik acts (' + z.mode + ')');
  await pa.evaluate(() => window.__setPose({ beta: 45, roll: 27 }));
  await sleep(900);
  const z2 = await pb.evaluate(() => ({ x: window.__M.GK.raw.tiltX, want: window.__M.GK.R.shape(window.__M.GK.R.st.roll), roll: window.__M.GK.R.st.roll }));
  ok(Math.abs(z2.roll - 12) < 1.5 && Math.abs(z2.x - z2.want) < 1e-9, 'leaning on: B measures from its own zero (' + z2.roll.toFixed(1) + '° of 12°), shaped by its own Weite');
  ok(await pb.evaluate(() => window.__M.FA.lanes.has('m|hoehe|gk:anl.h') || window.__M.FA.lanes.has('m|bend|gk:anl.t')), 'B\'s Fährte writes down what the phone\'s Gestik shapes here');
  await pb.evaluate(() => window.__M.onUp({ pointerId: 'b1' }));
  // A takes a new zero: B starts from it again
  await pa.evaluate(() => window.__M.gkZero(false));
  await sleep(700);
  const z3 = await pb.evaluate(() => window.__M.GK.R.st.roll);
  ok(Math.abs(z3) < 1, 'A sets a new zero (note 52): B\'s zero follows it (' + z3.toFixed(2) + '°)');
  // ---- B learns the phone's axes as Gestik, never as an NRPN of the port
  await pb.evaluate(() => window.__M.midiLearn(true));
  await pa.evaluate(() => window.__setPose({ beta: 45, roll: 0 }));
  await sleep(300);
  await pa.evaluate(() => window.__setPose({ beta: 45, roll: 22 }));
  await sleep(1300);
  const lc = await pb.evaluate(() => { const c = window.__M.LEARN.cap; return c && { src: c.src.kind, kind: c.kind, num: c.num }; });
  await pb.evaluate(() => window.__M.midiLearn(false));
  ok(lc && lc.src === 'motion' && lc.kind === 'axis' && lc.num === 0, 'Zuweisen on B: leaning the phone captures Gestik\'s axis Neigen ↔ (not an NRPN of the port)');
  // ---- the end: A stops sending → B rests, then lets go
  await pa.evaluate(() => window.__M.gkfPick(''));
  await sleep(500);
  const e1 = await pb.evaluate(() => ({ mode: window.__M.GK.mode, txt: window.__M.gkRemText() }));
  ok(e1.mode === 'off' && /wartet auf das Handy/.test(e1.txt), 'A stops: B rests at once (Wächter) – „' + e1.txt + '“');
  await pb.evaluate(() => { const s = window.__M.GK.rem.src; s.gkr.t = 0; });
  await sleep(200);
  const e2 = await pb.evaluate(() => ({ on: window.__M.GK.on, rem: !!window.__M.GK.rem, p: window.__M.GK.p.on }));
  ok(!e2.on && !e2.rem && e2.p === false, 'after 10 s of silence B lets go: Gestik off again, as it was');
  // ---- switched off by hand on B while the phone sends: it stays off; the tile brings it back
  await pa.evaluate(() => window.__M.gkfPick('Pixel 7 USB-MIDI'));
  await pb.waitForFunction(() => !!window.__M.GK.rem, null, { timeout: 4000 });
  await pb.evaluate(() => window.__M.gkDisable());
  await sleep(1000);
  ok(await pb.evaluate(() => !window.__M.GK.on && !window.__M.GK.rem), 'switched off on B while the phone sends: it stays off');
  await pb.evaluate(() => window.__M.gkEnable(true));
  await pb.waitForFunction(() => !!window.__M.GK.rem, null, { timeout: 4000 }).catch(() => {});
  ok(await pb.evaluate(() => !!window.__M.GK.rem && window.__M.GK.p.on === true), '"Gestik einschalten" on B: the phone is welcome again (and B\'s own switch is now on)');
  // ---- profile off: the port is a plain MIDI port again
  await pb.evaluate(() => { const M = window.__M, s = [...M.MIDI.srcs.values()].find((x) => x.name === 'Pixel 7 USB-MIDI'); M.setPortPref(s, { prof: false }); M.MAP.v++; });
  await sleep(400);
  ok(await pb.evaluate(() => !window.__M.GK.rem), 'the profile switched off on B: no Funkstrecke from that port');
  // ---- A never follows its own echo
  echo = true;
  await sleep(800);
  ok(await pa.evaluate(() => !window.__M.GK.rem && window.__M.gkfSending()), 'A hears its own signature come back (a MIDI thru): it keeps sending, never receives itself');
  relay = false;
  await sleep(50);
  ok(!A.errors.length && !B.errors.length, 'no page errors' + (A.errors.length || B.errors.length ? ': ' + A.errors.concat(B.errors).join(' | ') : ''));
  await H.close();
})().catch((e) => { relay = false; console.log('FAIL ' + e.stack); process.exitCode = 1; return H.close(); });
