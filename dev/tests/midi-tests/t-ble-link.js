// Web Bluetooth BLE-MIDI against a fake navigator.bluetooth: the chooser inside the tap with the right filters, the
// connect flow and its per-device GATT queue, real packets through the whole path (BlueZ vectors, running status, wrap,
// clock inside SysEx), read retry, polyfill variants, output, drop → per-source release → reconnect with backoff,
// Trennen / Wieder verbinden, reload with the remembered name, getDevices.   node t-ble-link.js
const { open, ok, close, pair, showDev, summary } = require('./hb');
const SVC = '03b80e5a-ede8-4b33-a751-6ce34ec4c700';
const B_ = (id = 'dev1') => `[...window.__M.BLE.devs.values()].find((b) => b.id === '${id}')`;
(async () => {
  // ---------- connect flow, filters, queue, notes ----------
  {
    const { page, errors } = await open({ bt: {}, cfg: { ins: [['k1', 'Testkeyboard']] } });
    await showDev(page);
    ok(await page.isVisible('[data-ble="ask"]'), 'Gerät panel offers „Bluetooth-Keyboard koppeln“');
    await pair(page, { id: 'dev1', name: 'microKEY Air-25' });
    let r = await page.evaluate((B) => {
      const M = window.__M, T = window.__bt, q = T.reqs[0], d = T.dev('dev1'), b = eval(B);
      return { active: q.active, f: q.opts.filters, os: q.opts.optionalServices, log: d.log.join(','), overlap: d.overlap, pk: b.pk,
        src: !!M.MIDI.srcs.get('ble:dev1'), kind: (M.MIDI.srcs.get('ble:dev1') || {}).kind, ports: [...M.MIDI.ports.values()].join(), dot: document.querySelector('#midiDot').classList.contains('conn'),
        toast: document.querySelector('#toastMsg').textContent, last: localStorage.getItem('myzel.ble.v1'), out: (M.MIDI.outs.get('ble:dev1') || {}).noClock };
    }, B_());
    const pre = r.f.filter((x) => x.namePrefix).map((x) => x.namePrefix);
    ok(r.active === true, 'requestDevice runs inside the tap (user activation active)');
    ok(r.f[0].services && r.f[0].services[0] === SVC && r.os.includes(SVC), 'filter by the MIDI service, optionalServices has it');
    ok(['microKEY', 'nanoKEY', 'nanoKONTROL', 'nanoPAD', 'Xkey', 'WIDI', 'MD-BT01', 'Seaboard', 'LUMI', 'BLE-MIDI'].every((n) => pre.includes(n)), 'name prefixes for KORG and common BLE-MIDI devices (' + pre.length + ')');
    ok(r.log === 'connect,svc,chr,read,notify' && r.overlap === 0, 'connect → service → characteristic → read → notifications, one GATT call at a time (' + r.log + ')');
    ok(r.pk >= 1, 'the listener was attached before the first read (its empty answer arrived)');
    ok(r.src && r.kind === 'ble' && r.ports === 'Testkeyboard,microKEY Air-25' && r.dot, 'a Bluetooth source joins the ports; MIDI dot lit');
    ok(/microKEY Air-25 verbunden/.test(r.toast), 'announced: ' + r.toast);
    ok(JSON.parse(r.last).name === 'microKEY Air-25', 'the keyboard is remembered for the next visit');
    ok(r.out === true, 'KORG over Bluetooth: output listed without clock (KORG ignores it there)');

    r = await page.evaluate(async () => {
      const M = window.__M, d = window.__bt.dev('dev1'), hx = window.__hx, out = {};
      d.send(hx('80 80 90 3C 64')); out.on = M.touches.has('midi-ble:dev1-0-60');
      d.send(hx('80 81 80 3C 40')); out.off = !M.touches.has('midi-ble:dev1-0-60');
      d.send(hx('A6 88 E8 00 40 88 B8 4A 3F 88 98 3E 0E')); out.bluez = M.touches.has('midi-ble:dev1-8-62') && M.chState(M.MIDI.srcs.get('ble:dev1'), 8).cc[74] === 63;
      d.send(hx('A6 C4 E8 7E 3F 7D 3F C4 7C 3F')); out.bend = Math.round(M.chState(M.MIDI.srcs.get('ble:dev1'), 8).bend * 8192);
      d.send(hx('A6 D9 3E 00 88 3E 00')); out.misplaced = M.touches.has('midi-ble:dev1-8-62');
      d.send(hx('A6 88 98 3E 00'));
      d.send(hx('80 80 90 3C 64 3E 64 40 64')); out.run = ['60', '62', '64'].every((n) => M.touches.has('midi-ble:dev1-0-' + n));
      d.send(hx('80 82 80 3C 00 3E 00 40 00'));
      d.send(hx('BF FE 90 41 64 82 80 41 00')); out.wrap = !M.touches.has('midi-ble:dev1-0-65') && M.MIDI.srcs.get('ble:dev1').last.type === 'off';
      // clock pulses inside a SysEx that spans packets reach the clock follower; the SysEx itself is skipped
      M.setParam('midi.clock', 'follow');
      d.send(hx('80 80 F0 01 02 80 F8 03')); await window.__sleep(21);
      d.send(hx('80 04 95 F8 05 06')); await window.__sleep(21);
      d.send(hx('80 07 AA F8 08 AB F7')); out.clk = M.CLK.n >= 3 && M.CLK.src === M.MIDI.srcs.get('ble:dev1');
      d.send(hx('80 B0 90 43 64')); out.after = M.touches.has('midi-ble:dev1-0-67');
      d.send(hx('80 B1 80 43 00'));
      return out;
    });
    ok(r.on && r.off, 'note on / off from a packet play the field (id midi-ble:dev1-0-60)');
    ok(r.bluez, 'BlueZ vector through the app: bend, CC 74 and a note on channel 9');
    ok(r.bend === 8188 - 8192, 'three bends under running status: the last one counts (' + r.bend + ')');
    ok(r.misplaced, 'the misplaced running-status vector plays nothing (note 62 still held, not ended)');
    ok(r.run, 'running status inside a packet: three notes');
    ok(r.wrap, 'a packet whose timestamp wraps still plays and ends its note');
    ok(r.clk && r.after, 'MIDI clock inside a multi-packet SysEx reaches the clock follower; playing goes on afterwards');

    // output: bounded queue, serialized, ≤ 20 bytes
    r = await page.evaluate(async (B) => {
      const M = window.__M, d = window.__bt.dev('dev1'), b = eval(B);
      d.written.length = 0;
      for (let i = 0; i < 40; i++) M.bleSend(b, [0x90, 60 + (i % 12), 100]);
      M.bleSend(b, [0xb0, 1, 2, 0xb0, 7, 100]);
      await window.__sleep(400);
      return { n: d.written.length, max: Math.max(...d.written.map((p) => p.length)), drop: b.txDrop, overlap: d.overlap, hdr: d.written.every((p) => p[0] & 0x80 && p[1] & 0x80), two: JSON.stringify(d.written[d.written.length - 1].slice(2)) };
    }, B_());
    ok(r.n === 33 && r.drop === 8 && r.max <= 20 && r.overlap === 0 && r.hdr, 'sending: one in flight + at most 32 waiting packets (oldest dropped), ≤ 20 bytes, one write at a time (' + r.n + ' sent, ' + r.drop + ' dropped)');
    ok(r.two === '[176,1,2,' + r.two.split(',')[3] + ',176,7,100]', 'two messages in one send() share a packet ' + r.two);
    ok(!errors.length, 'no page errors ' + errors.join(' | '));
    await close();
  }

  // ---------- read retry, polyfill variants ----------
  {
    const { page, errors } = await open({ bt: { noAvail: true } });
    await pair(page, { id: 'r1', name: 'nanoKEY Studio', o: { readFail: 1 } });
    let r = await page.evaluate(() => window.__bt.dev('r1').log.join(','));
    ok(r === 'connect,svc,chr,read,read,notify', 'a failed first read is tried once more, then notifications (' + r + ')');
    await pair(page, { id: 'r2', name: 'nanoKEY Studio 2', o: { readFail: 5 } });
    r = await page.evaluate(() => window.__bt.dev('r2').log.join(','));
    ok(r === 'connect,svc,chr,read,read,notify', 'a read that keeps failing does not stop the link (' + r + ')');
    await pair(page, { id: 'p1', name: 'WIDI Master', o: { noEvents: true, noRead: true, noWoR: true, noForget: true } });
    r = await page.evaluate(async () => {
      const M = window.__M, d = window.__bt.dev('p1'), b = [...M.BLE.devs.values()].find((x) => x.id === 'p1');
      d.send(window.__hx('80 80 92 3C 64')); const on = M.touches.has('midi-ble:p1-2-60');
      M.bleSend(b, [0xfe]); await window.__sleep(50);
      return { on, wv: d.wv, log: d.log.join(','), noClock: M.MIDI.outs.get('ble:p1').noClock };
    });
    ok(r.on && r.log.startsWith('connect,svc,chr,notify'), 'polyfill without addEventListener, readValue: on* handler, no read, still plays');
    ok(r.wv === 1, 'no writeValueWithoutResponse: falls back to writeValue');
    ok(r.noClock === false, 'a non-KORG Bluetooth output may carry clock');
    // TypeError for name filters (a browser that only knows service filters): asked again by service
    await page.evaluate(() => { window.__bt.reqs.length = 0; });
    await pair(page, { id: 't1', name: 'Xkey Air', typeErrorOnPrefix: true });
    r = await page.evaluate(() => window.__bt.reqs.map((q) => q.opts.filters.length));
    ok(r.length === 2 && r[1] === 1, 'unknown filter keys → asked again with the service filter alone (' + r.join(' → ') + ')');
    ok(!errors.length, 'no page errors ' + errors.join(' | '));
    await close();
  }

  // ---------- clock out over Bluetooth to a non-KORG device ----------
  {
    const { page, errors } = await open({ bt: {} });
    await pair(page, { id: 'w1', name: 'WIDI Master' });
    const r = await page.evaluate(async () => {
      const M = window.__M, d = window.__bt.dev('w1'), o = M.MIDI.outs.get('ble:w1');
      d.written.length = 0; M.midiSetClockOut(o, true);
      await window.__sleep(600);
      const f8 = d.written.filter((p) => p.includes(0xf8)).length;
      M.midiSetClockOut(o, false); await window.__sleep(60);
      return { f8, max: Math.max(0, ...d.written.map((p) => p.length)), stop: d.written.some((p) => p.includes(0xfc)), pref: JSON.parse(localStorage.getItem('myzel.midiports.v1'))['out:WIDI Master'] };
    });
    ok(r.f8 >= 10 && r.max <= 20 && r.stop, 'clock out over Bluetooth: ' + r.f8 + ' pulse packets in 0,6 s, Stop at the end');
    ok(r.pref && r.pref.clock === false, 'the choice is stored per output name');
    ok(!errors.length, 'no page errors ' + errors.join(' | '));
    await close();
  }

  // ---------- drop → release only its notes → reconnect with backoff; Trennen / Wieder verbinden ----------
  {
    const { page, errors } = await open({ bt: {}, cfg: { ins: [['k1', 'Testkeyboard']] } });
    await page.evaluate(() => { window.__M.BLE.wait0 = 100; window.__M.BLE.waitMax = 400; });
    await pair(page, { id: 'dev1', name: 'nanoKEY Studio' });
    let r = await page.evaluate(async (B) => {
      const M = window.__M, d = window.__bt.dev('dev1'), b = eval(B), hx = window.__hx, out = {};
      window.__send([0x90, 50, 100], 'k1');
      d.send(hx('80 80 90 3C 64 3E 64')); d.send(hx('80 81 F0 01 02 03'));
      out.held = M.touches.has('midi-ble:dev1-0-60') && M.touches.has('midi-k1-0-50') && !!b.D.sx;
      d.drop();
      out.rel = !M.touches.has('midi-ble:dev1-0-60') && !M.touches.has('midi-ble:dev1-0-62') && M.touches.has('midi-k1-0-50');
      out.state = b.state; out.src = M.MIDI.srcs.has('ble:dev1'); out.sx = b.D.sx; out.out = M.MIDI.outs.has('ble:dev1');
      out.toast = document.querySelector('#toastMsg').textContent; out.ports = [...M.MIDI.ports.values()].join();
      await window.__sleep(300);
      out.state2 = b.state; out.log = d.log.join(','); out.links = d.links; out.toast2 = document.querySelector('#toastMsg').textContent;
      d.send(hx('80 80 90 40 64')); out.again = M.touches.has('midi-ble:dev1-0-64');
      d.send(hx('80 81 80 40 00'));
      // the keyboard stays away: 100, 200, 400, 400 ms between attempts
      d.o.away = 20; d.t.length = 0; d.log.length = 0;
      d.drop();
      await window.__sleep(2100);
      const ts = d.t.filter((_, i) => d.log[i] === 'connect');
      out.gaps = ts.slice(1).map((t, i) => Math.round(t - ts[i]));
      out.tries = b.tries; out.st3 = b.state;
      d.o.away = 0;
      await window.__sleep(500);
      out.back = b.state;
      return out;
    }, B_());
    ok(r.held && r.rel, 'a drop releases only that keyboard\'s notes (the USB keyboard\'s note keeps sounding)');
    ok(r.state === 'wait' && !r.src && r.sx === null && !r.out && r.ports === 'Testkeyboard', 'after a drop: source and output gone, decoder reset (open SysEx dropped), waiting to reconnect');
    ok(/getrennt/.test(r.toast), 'announced: ' + r.toast);
    ok(r.state2 === 'on' && r.links === 2 && r.log === 'connect,svc,chr,read,notify,connect,svc,chr,read,notify', 'reconnects on its own: connect, read and subscribe again');
    ok(/wieder verbunden/.test(r.toast2) && r.again, 'plays again after reconnecting (' + r.toast2 + ')');
    const g = r.gaps;
    ok(g.length >= 4 && Math.abs(g[1] - g[0] * 2) < 80 && g.slice(2).every((x) => x < 520), 'backoff doubles up to the cap (gaps ' + g.join(', ') + ' ms incl. 20 ms attempts)');
    ok(r.back === 'on', 'comes back when the keyboard is there again');

    // Trennen: no more attempts; Wieder verbinden
    await showDev(page);
    await page.click('.bledev [data-ble="off"]');
    r = await page.evaluate(async () => {
      const M = window.__M, d = window.__bt.dev('dev1'), b = [...M.BLE.devs.values()][0], l = d.links;
      await window.__sleep(600);
      return { st: b.state, links: d.links - l, conn: d.gatt.connected, txt: document.querySelector('.bledev').textContent, src: M.MIDI.srcs.has('ble:dev1') };
    });
    ok(r.st === 'off' && r.links === 0 && !r.conn && !r.src && /nicht verbunden/.test(r.txt), '„Trennen“ disconnects and stops reconnecting');
    await page.click('.bledev [data-ble="on"]');
    await page.waitForFunction(() => [...window.__M.BLE.devs.values()][0].state === 'on');
    r = await page.evaluate(() => document.querySelector('.bledev').textContent);
    ok(/^nanoKEY Studio\s*Bluetooth direkt\s*verbunden/.test(r), '„Wieder verbinden“ links again: ' + r.slice(0, 80));
    // "Trennen" while a slow connect is still under way: the link that comes up afterwards is closed at once
    await page.click('.bledev [data-ble="off"]');
    await page.evaluate(() => { window.__bt.dev('dev1').o.connDelay = 300; });
    await page.click('.bledev [data-ble="on"]');
    await page.waitForTimeout(100);
    await page.click('.bledev [data-ble="off"]');
    await page.waitForTimeout(600);
    r = await page.evaluate(() => ({ st: [...window.__M.BLE.devs.values()][0].state, conn: window.__bt.dev('dev1').gatt.connected, src: window.__M.MIDI.srcs.has('ble:dev1') }));
    ok(r.st === 'off' && !r.conn && !r.src, '„Trennen“ during a slow connect: the late link is closed, nothing plays');
    ok(!errors.length, 'no page errors ' + errors.join(' | '));
    await close();
  }

  // ---------- after a reload: "Wieder verbinden" with the remembered name; getDevices skips the chooser ----------
  {
    const st = { 'myzel.ble.v1': JSON.stringify({ name: 'microKEY Air-37', id: 'old' }) };
    let { page, errors } = await open({ bt: {}, storage: st });
    await showDev(page);
    let r = await page.evaluate(() => { const b = document.querySelector('[data-ble="again"]'); return { vis: !b.hidden, txt: b.textContent, cls: b.className }; });
    ok(r.vis && r.txt === 'Wieder verbinden: microKEY Air-37', 'after a reload: ' + r.txt);
    await page.evaluate(() => { window.__bt.next = { id: 'dev9', name: 'microKEY Air-37' }; });
    await page.click('[data-ble="again"]');
    await page.waitForFunction(() => window.__M.BLE.devs.size && [...window.__M.BLE.devs.values()][0].state === 'on');
    r = await page.evaluate(() => { const q = window.__bt.reqs[0]; return { active: q.active, name: q.opts.filters.some((f) => f.name === 'microKEY Air-37'), again: document.querySelector('[data-ble="again"]').hidden }; });
    ok(r.active && r.name && r.again, 'the tap opens the chooser (inside the gesture) with the remembered name as a filter; button gone once linked');
    ok(!errors.length, 'no page errors ' + errors.join(' | '));
    await close();
    ({ page, errors } = await open({ bt: { getDevices: [['devX', 'nanoKEY Studio']] }, storage: { 'myzel.ble.v1': JSON.stringify({ name: 'nanoKEY Studio', id: 'devX' }) } }));
    await showDev(page);
    await page.click('[data-ble="again"]');
    await page.waitForFunction(() => window.__M.BLE.devs.size && [...window.__M.BLE.devs.values()][0].state === 'on');
    r = await page.evaluate(() => window.__bt.reqs.length);
    ok(r === 0, 'a device the browser still allows (getDevices) reconnects without the chooser');
    // Vergessen
    await page.click('.bledev [data-ble="off"]');
    await page.click('.bledev [data-ble="forget"]');
    r = await page.evaluate(() => ({ n: window.__M.BLE.devs.size, f: window.__bt.dev('devX').forgotten }));
    ok(r.n === 0 && r.f, '„Vergessen“ drops the device and the browser\'s permission');
    ok(!errors.length, 'no page errors ' + errors.join(' | '));
    await close();
  }
  summary();
})().catch((e) => { console.error(e); process.exit(1); });
