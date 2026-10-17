// One keyboard over two transports (Web MIDI port via a helper app/driver/USB + Bluetooth direct): only the Web MIDI
// port plays, the panel says so; switching that port off lets Bluetooth play; a twin that stays silent (Windows keeps
// ports of gone devices) hands over after 0,4 s and takes over again when it plays; name variants.   node t-ble-dedupe.js
const { open, ok, close, pair, showDev, summary } = require('./hb');
(async () => {
  {
    const { page, errors } = await open({ bt: {}, cfg: { ins: [['k1', 'microKEY Air-25'], ['k2', 'nanoKONTROL2 SLIDER/KNOB']] } });
    await pair(page, { id: 'dev1', name: 'microKEY Air-25' });
    let r = await page.evaluate(() => {
      const M = window.__M, d = window.__bt.dev('dev1'), b = M.MIDI.srcs.get('ble:dev1'), hx = window.__hx, out = {};
      out.dup = b.dup; out.twin = b.twinName; out.ports = [...M.MIDI.ports.values()].join();
      out.toast = document.querySelector('#toastMsg').textContent;
      window.__send([0x90, 60, 100], 'k1'); d.send(hx('80 80 90 3C 64'));
      out.one = M.touches.has('midi-k1-0-60') && !M.touches.has('midi-ble:dev1-0-60');
      window.__send([0x80, 60, 0], 'k1'); d.send(hx('80 81 80 3C 00'));
      out.line = document.querySelector('.bledev .note').textContent;
      return out;
    });
    ok(r.dup && r.twin === 'microKEY Air-25' && r.ports === 'microKEY Air-25,nanoKONTROL2 SLIDER/KNOB', 'same name over Web MIDI and Bluetooth: Bluetooth stays quiet, listed once');
    ok(/spielt aber über den MIDI-Port „microKEY Air-25“/.test(r.toast), 'announced: ' + r.toast);
    ok(r.one, 'a key pressed once sounds once (the Web MIDI copy)');
    ok(/spielt über den MIDI-Port „microKEY Air-25“ \(dasselbe Keyboard\)/.test(r.line), 'the panel says which one plays: ' + r.line);
    r = await page.evaluate(() => {
      const M = window.__M, d = window.__bt.dev('dev1'), hx = window.__hx, k = M.MIDI.srcs.get('k1'), out = {};
      M.midiSetPort(k, false);
      const b = M.MIDI.srcs.get('ble:dev1'); out.dup = b.dup; out.ports = [...M.MIDI.ports.values()].join();
      d.send(hx('80 80 90 3E 64')); out.plays = M.touches.has('midi-ble:dev1-0-62');
      M.midiSetPort(k, true); out.dup2 = b.dup; out.rel = !M.touches.has('midi-ble:dev1-0-62');
      return out;
    });
    ok(!r.dup && r.plays && /microKEY Air-25/.test(r.ports), 'switching the Web MIDI port off lets the Bluetooth link play');
    ok(r.dup2 && r.rel, 'switching it on again: Bluetooth quiet again, its held note released');

    // the twin stays silent while Bluetooth is played → Bluetooth takes over after 0,4 s; the twin plays again → back
    r = await page.evaluate(async () => {
      const M = window.__M, d = window.__bt.dev('dev1'), hx = window.__hx, k = M.MIDI.srcs.get('k1'), b = M.MIDI.srcs.get('ble:dev1'), out = {};
      k.lastIn = performance.now() - 5000;
      d.send(hx('80 80 90 40 64')); await window.__sleep(250);
      d.send(hx('80 81 80 40 00')); out.still = b.dup;
      await window.__sleep(250);
      d.send(hx('80 82 90 41 64'));
      out.took = !b.dup; out.toast = document.querySelector('#toastMsg').textContent; out.ports = [...M.MIDI.ports.values()].join();
      d.send(hx('80 83 90 43 64')); out.plays = M.touches.has('midi-ble:dev1-0-67');
      d.send(hx('80 84 80 43 00 80 41 00'));
      // the port is alive after all: it plays, and on the next Bluetooth message the Web MIDI port leads again
      window.__send([0x90, 72, 100], 'k1');
      d.send(hx('80 85 90 48 64'));
      out.back = b.dup && M.touches.has('midi-k1-0-72') && !M.touches.has('midi-ble:dev1-0-72');
      window.__send([0x80, 72, 0], 'k1');
      return out;
    });
    ok(r.still && r.took && /spielt jetzt direkt/.test(r.toast) && /microKEY Air-25/.test(r.ports), 'a silent twin: after 0,4 s of playing Bluetooth takes over (' + r.toast + ')');
    ok(r.plays, 'and then plays');
    ok(r.back, 'when the Web MIDI port plays again, it leads again (no double notes)');

    // both alive: the Web MIDI copy arrives a little after the Bluetooth one – no takeover however long one plays
    r = await page.evaluate(async () => {
      const M = window.__M, d = window.__bt.dev('dev1'), hx = window.__hx, b = M.MIDI.srcs.get('ble:dev1');
      M.MIDI.srcs.get('k1').lastIn = performance.now() - 5000;
      for (let i = 0; i < 12; i++) {
        d.send(hx('80 80 90 3C 64')); await window.__sleep(15); window.__send([0x90, 60, 100], 'k1');
        await window.__sleep(60);
        d.send(hx('80 81 80 3C 00')); await window.__sleep(15); window.__send([0x80, 60, 0], 'k1');
        await window.__sleep(60);
      }
      return b.dup;
    });
    ok(r, 'both copies arriving (Web MIDI 15 ms later): Bluetooth stays quiet for 1,8 s of playing');
    ok(!errors.length, 'no page errors ' + errors.join(' | '));
    await close();
  }

  // name variants: a Mac's "… Bluetooth" port and Windows' "2- " prefix count, an off DAW port and another model do not
  {
    const { page, errors } = await open({ bt: {}, cfg: { ins: [['k1', 'MIDIIN2 (nanoKEY Studio)'], ['k2', 'nanoKONTROL Studio']] } });
    await pair(page, { id: 'dev1', name: 'nanoKEY Studio' });
    let r = await page.evaluate(() => window.__M.MIDI.srcs.get('ble:dev1').dup);
    ok(r === false, 'an off secondary port (MIDIIN2 …) and another KORG model do not silence Bluetooth');
    r = await page.evaluate(() => { window.__midi.plug('k3', 'nanoKEY Studio Bluetooth'); const b = window.__M.MIDI.srcs.get('ble:dev1'); const a = b.dup; window.__midi.unplug('k3'); return [a, b.dup]; });
    ok(r[0] === true && r[1] === false, 'a hot-plugged "nanoKEY Studio Bluetooth" port takes over, unplugged hands back');
    r = await page.evaluate(() => { window.__midi.plug('k4', '2- nanoKEY Studio'); return window.__M.MIDI.srcs.get('ble:dev1').dup; });
    ok(r === true, 'Windows "2- nanoKEY Studio" counts as the same keyboard');
    ok(!errors.length, 'no page errors ' + errors.join(' | '));
    await close();
  }
  summary();
})().catch((e) => { console.error(e); process.exit(1); });
