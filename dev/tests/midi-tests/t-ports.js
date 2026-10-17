// Sources and ports: secondary-port regex and prefs, outputs, rescan / retry, polyfill without statechange, the source
// API other transports use, dedupe flag, target registry, phone start button.   node t-ports.js
const { open, ok, close } = require('./h');
(async () => {
  // ---------- regex and name matching (pure) ----------
  {
    const { page, errors } = await open({ start: false });
    const r = await page.evaluate(() => {
      const M = window.__M, re = M.MIDI_SECONDARY;
      const sec = ['MPK mini IV DAW Port', 'MIDIIN2 (MPK mini IV)', 'Launchkey Mini MK3 DAW Port', 'MIDIOUT2 (Launchkey Mini MK4 25)', 'Launchkey Mini MK4 25 Launchkey #2',
        'Oxygen Pro 49 MACKIE/HUI', 'MIDI DIN', 'Minilab3 MCU/HUI', 'Minilab3 ALV', 'Keystation 49 MK3 (Port 2)', 'MPK mini Plus Anschluss 2', 'MIDIIN 2 (LPX MIDI)',
        'Osmose daw control', 'Oxygen Pro 49 EDITOR', 'Midi Through Port-0', 'MPK mini IV Plugin Port', 'MPK mini IV Software Control'];
      const main = ['nanoKEY Studio', 'nanoKEY Studio KEYBOARD/CTRL', 'microKEY Air-25', 'microKEY-37 MIDI 1', 'MPK mini 3', 'MPK mini Plus Port 1', 'Minilab3 MIDI', 'Launchkey Mini MK3 MIDI Port',
        'Arturia KeyStep 37', 'nanoKONTROL2 SLIDER/KNOB', 'Seaboard BLOCK', 'Osmose Port 1', 'LPX MIDI', '2- nanoKEY Studio', 'KOMPLETE KONTROL A25 MIDI', 'Xkey Air 37'];
      return { badSec: sec.filter((n) => !re.test(n)), badMain: main.filter((n) => re.test(n)),
        same: [M.sameDev('MIDIIN2 (nanoKEY Studio)', 'nanoKEY Studio'), M.sameDev('2- nanoKEY Studio', 'NANOKEY STUDIO'), M.sameDev('nanoKEY Studio Bluetooth', 'nanoKEY Studio'), M.sameDev('microKEY Air', 'nanoKEY Studio'), M.sameDev('', 'x')] };
    });
    ok(!r.badSec.length, 'secondary ports default off: ' + (r.badSec.join(', ') || 'all 17 matched'));
    ok(!r.badMain.length, 'main ports stay on: ' + (r.badMain.join(', ') || 'all 16 clean'));
    ok(r.same.join() === 'true,true,true,false,false', 'same device across name variants (Windows MIDIIN2, "2- ", " Bluetooth")');
    ok(!errors.length, 'no errors ' + errors.join(' | '));
    await close();
  }

  // ---------- secondary port, prefs, outputs, dedupe, the source API, targets ----------
  {
    const { page, errors } = await open({ cfg: { ins: [['k1', 'MPK mini IV MIDI Port'], ['d1', 'MPK mini IV DAW Port']], outs: [['o1', 'MPK mini IV MIDI Port']] } });
    let r = await page.evaluate(() => {
      const M = window.__M, S = window.__send, d = M.MIDI.srcs.get('d1');
      const out = { en: d.enabled, sec: d.secondary, ports: [...M.MIDI.ports.values()], outs: M.MIDI.outs.size, toast: document.querySelector('#toastMsg').textContent };
      S([0x90, 60, 100], 'd1'); out.silent = !M.touches.has('midi-d1-0-60');
      M.midiSetPort(d, true); S([0x90, 60, 100], 'd1'); out.plays = M.touches.has('midi-d1-0-60');
      M.midiSetPort(d, false); out.offReleases = !M.touches.has('midi-d1-0-60');
      M.midiSetPort(d, true);
      out.stored = JSON.parse(localStorage.getItem('myzel.midiports.v1'))['in:MPK mini IV DAW Port'].on === true;
      // another transport plays the same device: this source stays quiet
      const k = M.MIDI.srcs.get('k1'); k.dup = true; M.midiSync();
      S([0x90, 62, 100], 'k1'); out.dup = !M.touches.has('midi-k1-0-62') && !M.MIDI.ports.has('k1');
      k.dup = false; M.midiSync();
      return out;
    });
    ok(!r.en && r.sec && r.ports.join() === 'MPK mini IV MIDI Port' && !/DAW/.test(r.toast), 'DAW port found but off: not listed, not announced');
    ok(r.silent && r.plays && r.offReleases, 'switching a port on plays it; switching off releases its notes');
    ok(r.stored && r.outs === 1, 'port choice stored by name; outputs scanned');
    ok(r.dup, 'a source marked dup (same device on another transport) stays quiet');
    await page.reload(); await page.waitForFunction(() => !!window.__M); await page.click('#btnStart'); await page.waitForTimeout(400);
    r = await page.evaluate(() => { const M = window.__M; return { en: M.MIDI.srcs.get('d1').enabled, ports: M.MIDI.ports.size }; });
    ok(r.en && r.ports === 2, 'after a reload the DAW port is still on');

    // the source API a Bluetooth transport uses
    r = await page.evaluate(() => {
      const M = window.__M, out = {};
      const b = M.midiSource('ble:abc', 'microKEY Air-25', 'ble'); M.midiSync([b], []);
      out.toast = document.querySelector('#toastMsg').textContent;
      M.midiIn(b, new Uint8Array([0x90, 60, 100]), performance.now());
      out.plays = M.touches.has('midi-ble:abc-0-60');
      M.midiIn(b, new Uint8Array([0xb0, 1, 127]));
      out.y = M.touches.get('midi-ble:abc-0-60').y;
      M.midiDrop(b); M.midiSync([], [b]);
      out.gone = !M.touches.has('midi-ble:abc-0-60') && !M.MIDI.srcs.has('ble:abc');
      out.toast2 = document.querySelector('#toastMsg').textContent;
      return out;
    });
    ok(/microKEY Air-25 verbunden/.test(r.toast) && r.plays && r.y > 0.9, 'midiSource + midiIn: a Bluetooth source plays like any other');
    ok(r.gone && /getrennt/.test(r.toast2), 'midiDrop releases its notes and forgets it');

    // targets registry and the param primitive
    r = await page.evaluate(() => {
      const M = window.__M, out = { keys: [...M.MTARGETS.keys()].join() };
      M.midiParam('flt.freq', 0.5); out.freq = M.P['flt.freq'];
      M.midiParam('t.scale', 0); out.scale = M.P['t.scale'] === M.PD['t.scale'].opts[0][0];
      const src = M.P['kor.src']; M.midiParam('kor.src', 0.99); out.kor = M.P['kor.src'] === src || !['datei', 'mikro'].includes(M.P['kor.src']);
      const q = M.P['dev.q']; M.midiParam('dev.q', 1); out.dev = M.P['dev.q'] === q;
      M.MTARGETS.get('puls').run(1); out.on = M.SEQ.on; M.MTARGETS.get('puls').run(0); out.still = M.SEQ.on; M.MTARGETS.get('puls.stop').run(1); out.off = !M.SEQ.on;
      M.MTARGETS.get('preset.next').run(1); out.p0 = M.UI.preset; M.MTARGETS.get('preset.next').run(1); out.p1 = M.UI.preset; M.MTARGETS.get('preset.prev').run(1); out.p2 = M.UI.preset;
      out.k0 = M.PRESETS[0].key; out.k1 = M.PRESETS[1].key;
      return out;
    });
    ok(/puls,puls.start,puls.stop,preset.next,preset.prev/.test(r.keys), 'target registry lists the actions');
    ok(Math.abs(r.freq - Math.sqrt(40 * 18000)) < 1 && r.scale, 'midiParam sets params on their own curve (Filter 0.5 → ' + Math.round(r.freq) + ' Hz)');
    ok(r.kor && r.dev, 'midiParam never opens file/mic sources, never touches device settings');
    ok(r.on && r.still && r.off, 'Puls actions start/stop (a button release does nothing)');
    ok(r.p0 === r.k0 && r.p1 === r.k1 && r.p2 === r.k0, 'Preset ± steps through the factory presets');
    // the new device settings render through ctl() and stay out of presets
    r = await page.evaluate(() => {
      const M = window.__M, ids = ['midi.curve', 'midi.fix', 'midi.mpe', 'midi.pc', 'midi.transport', 'midi.clock'];
      const el = ids.map((id) => M.ctl(id)), txt = el.map((e) => e.textContent).join(' | ');
      return { ok: el.every((e) => e instanceof HTMLElement), txt, dev: ids.every((id) => M.PD[id].dev), fix: M.fmt(M.PD['midi.fix'], 100), defs: ids.map((id) => M.P[id]).join() };
    });
    ok(r.ok && r.dev && r.fix === '100', 'new device settings render with ctl(): ' + r.txt);
    ok(r.defs === 'mid,100,auto,true,true,follow', 'defaults: Mittel, 100, MPE Auto, PC on, Start/Stop on, clock Folgen');
    ok(!errors.length, 'no errors ' + errors.join(' | '));
    await close();
  }

  // ---------- rescan, retry, polyfill without statechange ----------
  {
    const { page, errors } = await open({ cfg: { fresh: true } });
    let r = await page.evaluate(async () => {
      const M = window.__M, F = window.__midi, old = F.inputs.get('k1');
      M.openPanel('dev');
      const btn = [...document.querySelectorAll('#sheetBody button')].find((b) => b.textContent === 'Neu suchen');
      const vis = btn && !btn.hidden;
      F.inputs.set('k9', F.mkIn('k9', 'Spät erkannt'));   // the system did not report it
      btn.click(); await window.__sleep(200);
      return { vis, asked: F.asked, n: M.MIDI.ports.size, bound: typeof F.inputs.get('k9').onmidimessage === 'function', toast: document.querySelector('#toastMsg').textContent, still: typeof old.onmidimessage === 'function' };
    });
    ok(r.vis && r.asked === 2 && r.n === 2 && r.bound && r.still, '"Neu suchen" fetches a fresh port list and binds a keyboard the system did not report');
    ok(/Gefunden: Testkeyboard, Spät erkannt/.test(r.toast), 'rescan says what it found');
    ok(!errors.length, 'no errors ' + errors.join(' | '));
    await close();
  }
  {
    const { page, errors } = await open({ cfg: { deny: true } });
    let r = await page.evaluate(async () => {
      const M = window.__M, F = window.__midi;
      M.openPanel('dev');
      const st0 = M.MIDI.state, btn = [...document.querySelectorAll('#sheetBody button')].find((b) => b.textContent === 'Erneut versuchen');
      F.cfg.deny = false;   // the user allowed MIDI in the site settings
      btn.click(); await window.__sleep(200);
      return { st0, vis: !!btn, st: M.MIDI.state, n: M.MIDI.ports.size };
    });
    ok(r.st0 === 'blocked' && r.vis && r.st === 'ready' && r.n === 1, 'blocked → "Erneut versuchen" asks again and connects');
    ok(!errors.length, 'no errors ' + errors.join(' | '));
    await close();
  }
  {
    const { page, errors } = await open({ cfg: { noState: true } });
    const r = await page.evaluate(async () => {
      const M = window.__M, F = window.__midi;
      F.inputs.set('k2', F.mkIn('k2', 'Polyfill-Keyboard'));
      await window.__sleep(2300);
      window.__send([0x90, 60, 100], 'k2');
      return { n: M.MIDI.ports.size, plays: M.touches.has('midi-k2-0-60') };
    });
    ok(r.n === 2 && r.plays, 'MIDIAccess without statechange (polyfill): new ports found by polling');
    ok(!errors.length, 'no errors ' + errors.join(' | '));
    await close();
  }

  // ---------- phones: the start screen offers the MIDI permission ----------
  for (const [label, cfg, want] of [['phone + keyboard', { ins: [['a', 'USB Keys']] }, 'keys'], ['phone, no keyboard', { ins: [] }, 'panel'], ['phone without Web MIDI', { noMidi: true }, 'hidden'], ['phone, permission granted earlier', { perm: 'granted' }, 'hidden']]) {
    const { page, errors } = await open({ mobile: true, start: false, cfg });
    await page.waitForTimeout(300);
    const vis = await page.evaluate(() => !document.querySelector('#btnStartKeys').hidden);
    if (want === 'hidden') { ok(!vis, label + ': no extra start button'); await close(); continue; }
    ok(vis, label + ': "Mit Keyboard starten" on the start screen');
    await page.click('#btnStartKeys'); await page.waitForTimeout(600);
    const r = await page.evaluate(() => ({ started: window.__M.A.started, asked: window.__midi.asked, st: window.__M.MIDI.state, n: window.__M.MIDI.ports.size, panel: window.__M.UI.panel }));
    ok(r.started && r.asked === 1 && r.st === 'ready', label + ': one tap starts the sound and asks for MIDI');
    ok(want === 'keys' ? r.n === 1 && r.panel !== 'dev' : r.panel === 'dev', label + (want === 'keys' ? ': keyboard found, plays at once' : ': nothing found → Gerät opens'));
    ok(!errors.length, 'no errors ' + errors.join(' | '));
    await close();
  }
  {
    const { page } = await open({ start: false });
    ok(await page.evaluate(() => document.querySelector('#btnStartKeys').hidden), 'desktop: no extra start button (Chromium asks at "Klang starten")');
    await close();
  }
})().catch(async (e) => { console.error(e); process.exitCode = 1; await close(); });
