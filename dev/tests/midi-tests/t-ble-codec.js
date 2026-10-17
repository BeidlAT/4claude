// BLE-MIDI packet decoder, encoder and timestamp clock (the app's own functions, run in the page): BlueZ test vectors,
// wrap, running status, real-time inside SysEx, SysEx across packets and its 4 KB cap, junk, encoder round trip,
// clock against connection-interval quantisation, drift, pauses and frozen senders.   node t-ble-codec.js
const { open, ok, close, summary } = require('./hb');
(async () => {
  const { page, errors } = await open({ start: false });
  const r = await page.evaluate(() => {
    const M = window.__M, hx = window.__hx, out = {};
    const hex = (a) => Array.from(a).map((b) => b.toString(16).toUpperCase().padStart(2, '0')).join(' ');
    // decode a list of packets (hex strings) with one decoder; returns "msg@ts" strings
    const dec = (pk, D = { sx: null, run: 0 }) => {
      const got = [];
      for (const p of pk) M.bleDecode(D, new DataView(Uint8Array.from(typeof p === 'string' ? hx(p) : p).buffer), (b, ts) => got.push(hex(b) + '@' + ts));
      return got;
    };
    const V = [
      ['A6 88 E8 00 40 88 B8 4A 3F 88 98 3E 0E', 'E8 00 40@4872|B8 4A 3F@4872|98 3E 0E@4872'],
      ['A6 AA D8 71', 'D8 71@4906'],
      ['A6 B7 B8 4A 43', 'B8 4A 43@4919'],
      ['A6 C4 E8 7E 3F 7D 3F C4 7C 3F', 'E8 7E 3F@4932|E8 7D 3F@4932|E8 7C 3F@4932'],
      ['A6 D9 3E 00 88 3E 00', ''],
      ['A6 DA F0 01 02 03 DA F7', 'F0 01 02 03 F7@4954'],
      [['A6 DA F0 01 02 03 04 05', 'A6 06 07 08 09 0A DB F7'], 'F0 01 02 03 04 05 06 07 08 09 0A F7@4955'],
      [['A6 DA F0 01 02 03 04 05 06 07 08 09 0A 0B 0C', 'A6 0D 0E 0F 10 11 12 13', 'A6 14 15 16 17 18 DB F7'],
        'F0 01 02 03 04 05 06 07 08 09 0A 0B 0C 0D 0E 0F 10 11 12 13 14 15 16 17 18 F7@4955'],
      [['A6 DA F0 01 02 03 DA F7 DA F0', 'A6 06 07 08 09 0A DB F7'], 'F0 01 02 03 F7@4954|F0 06 07 08 09 0A F7@4955'],
    ];
    out.bluez = V.map(([pk, want]) => { const g = dec([].concat(pk)).join('|'); return g === want ? '' : JSON.stringify(pk) + ' → ' + g + ' (want ' + want + ')'; }).filter(Boolean);
    out.wrap = dec(['BF FE 90 3C 64 82 80 3C 00']).join('|');
    out.rtSysex = dec(['80 80 F0 01 02 80 F8 03 04', '80 05 06 81 FA 07 82 F7']).join('|');
    out.contEnd = dec(['80 80 F0 01 02', '80 03 81 F7']).join('|');
    out.contTsEnd = dec(['80 80 F0 01 02', '80 81 F7']).join('|');
    out.two = dec(['80 80 C0 05 06 81 D0 30 31']).join('|');
    out.rtRun = dec(['80 80 90 3C 64 81 F8 82 3E 64']).join('|');
    out.common = dec(['80 80 90 3C 64 81 F1 20 82 3E 64 83 F2 01 02 84 40 00']).join('|');
    out.sxThenMsg = dec(['80 80 F0 01 81 F7 82 90 3C 64']).join('|');
    out.empty = dec([[], [0x80], [0x00, 0x80, 0x90, 1, 2]]).join('|');
    out.undef = dec(['80 80 F4 81 F5 82 F6 83 90 3C 64']).join('|');
    // lenient: running status survives the packet end (after a timestamp); a data byte right after the header with no
    // SysEx open is a lost fragment and never plays
    { const D = { sx: null, run: 0 }; out.lenient = dec(['80 80 90 3C 64', '80 81 3E 64'], D).join('|'); out.orphan = dec(['80 3E 64 82 40 64'], D).join('|'); }
    // an open SysEx is aborted by a new status; a stray F7 does nothing
    out.abort = dec(['80 80 F0 01 02 81 90 3C 64 82 F7']).join('|');
    // SysEx cap: 5000 data bytes are dropped, the next message still plays
    {
      const D = { sx: null, run: 0 }, pk = [[0x80, 0x80, 0xf0]];
      for (let i = 0; i < 300; i++) pk.push([0x80].concat(Array(17).fill(0x11)));
      pk.push([0x80, 0x81, 0xf7, 0x82, 0x90, 0x3c, 0x64]);
      const g = dec(pk, D); out.cap = g.join('|'); out.capOpen = D.sx;
    }
    // junk never throws and never yields a malformed message
    {
      let x = 7, bad = 0, n = 0;
      const rnd = () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return (x >>> 0) % 256; };
      const D = { sx: null, run: 0 };
      try {
        for (let k = 0; k < 6000; k++) {
          const len = 1 + (rnd() % 24), p = [];
          for (let i = 0; i < len; i++) p.push(rnd());
          M.bleDecode(D, new DataView(Uint8Array.from(p).buffer), (b) => {
            n++;
            const s = b[0];
            if (!(s & 0x80)) bad++;
            else if (s === 0xf0) { if (b[b.length - 1] !== 0xf7 || b.length > 4097) bad++; }
            else if (b.length !== (s >= 0xf8 || s === 0xf6 ? 1 : s < 0xf0 ? ((s & 0xe0) === 0xc0 ? 2 : 3) : s === 0xf2 ? 3 : 2)) bad++;
            for (let i = 1; i < b.length - (s === 0xf0 ? 1 : 0); i++) if (b[i] & 0x80) bad++;
          });
        }
        out.fuzz = { bad, n };
      } catch (e) { out.fuzz = { err: String(e) }; }
    }
    // encoder: round trip, ≤ 20 bytes per packet, SysEx in its own packets, several messages packed
    {
      const msgs = [[0x90, 60, 100], [0xc0, 5], [0xf0].concat(Array.from({ length: 40 }, (_, i) => i + 1), [0xf7]), [0x80, 60, 0], [0xb0, 1, 64], [0xe0, 0, 64], [0xf8]];
      const pk = M.bleEncode(msgs, 123456.7);
      const D = { sx: null, run: 0 }, got = [];
      for (const p of pk) M.bleDecode(D, new DataView(p.buffer), (b, ts) => got.push(hex(b) + '@' + ts));
      out.rt = got.join('|') === msgs.map((m) => hex(m) + '@' + (123456 & 0x1fff)).join('|');
      out.rtMax = Math.max(...pk.map((p) => p.length));
      let sweep = 0;
      for (let n = 0; n <= 59; n++) {
        const m = [0xf0].concat(Array.from({ length: n }, (_, i) => (i * 7) & 0x7f), [0xf7]), ps = M.bleEncode([[0x90, 1, 2], m, [0x80, 1, 0]], 9000);
        const g = []; const D2 = { sx: null, run: 0 };
        for (const p of ps) { if (p.length > 20) sweep++; M.bleDecode(D2, new DataView(p.buffer), (b) => g.push(hex(b))); }
        if (g.join('|') !== [hex([0x90, 1, 2]), hex(m), hex([0x80, 1, 0])].join('|')) sweep++;
      }
      out.sweep = sweep;
      out.pack = M.bleEncode([[0x90, 60, 1], [0x90, 64, 1], [0x90, 67, 1], [0x90, 72, 1], [0x90, 76, 1]], 0).map((p) => p.length).join(',');
    }
    // clock: a note every 37 ms, delivered on connection events (CI), the sender's clock wrapping past 8191
    {
      // the first notes after an anchor only converge (the window has not yet seen the packet that waited least), so
      // the spacing error is measured after 12 notes; the warm-up maximum is reported too
      const sim = (o) => {
        const C = M.bleClockNew(), CI = o.ci, base = 1000, s0 = 8000;
        let prev = null, maxErr = 0, warm = 0, rawErr = 0, prevArr = null, late = 0, n = 0;
        const run = (k0, k1, shift = 0) => {
          for (let k = k0; k < k1; k++, n++) {
            const s = s0 + 37 * k * (1 + (o.ppm || 0) * 1e-6), local = base + (s - s0) + shift;
            const arr = Math.ceil(local / CI) * CI + 2 + ((k * 7919) % 5) / 5;
            const t = M.bleClock(C, Math.floor(s) & 0x1fff, arr);
            if (t > arr + 1e-9) late++;
            if (prev != null) {
              const e = Math.abs(t - prev - 37 * (1 + (o.ppm || 0) * 1e-6));
              if (n >= 12) maxErr = Math.max(maxErr, e); else warm = Math.max(warm, e);
              rawErr = Math.max(rawErr, Math.abs(arr - prevArr - 37));
            }
            prev = t; prevArr = arr;
          }
        };
        run(0, 200);
        // after the pause: a re-anchor (longer than one wrap) starts the warm-up again; a shorter pause must not
        if (o.pause) { const pk = Math.ceil(o.pause / 37); prev = null; if (o.pause > 8192) n = 0; run(200 + pk, 400 + pk); }
        return { maxErr: Math.round(maxErr * 10) / 10, warm: Math.round(warm), rawErr: Math.round(rawErr), late };
      };
      out.clk = { ci45: sim({ ci: 45 }), ci15: sim({ ci: 15 }), drift: sim({ ci: 30, ppm: 200 }), drift2: sim({ ci: 30, ppm: -200 }), p20: sim({ ci: 45, pause: 20000 }), p5: sim({ ci: 45, pause: 5000 }) };
      // a sender whose clock never moves: arrival time after three tries, correlation again once it moves
      const C = M.bleClockNew(), f = [], g = [];
      f.push(M.bleClock(C, 100, 1000)); f.push(M.bleClock(C, 100, 1200)); f.push(M.bleClock(C, 100, 1400)); f.push(M.bleClock(C, 100, 1600)); f.push(M.bleClock(C, 100, 1800));
      out.frozen = { f, flag: C.frozen };
      g.push(M.bleClock(C, 150, 1850)); g.push(M.bleClock(C, 200, 1910));
      out.unfrozen = { f: g, flag: C.frozen };
      out.noTs = M.bleClock(M.bleClockNew(), -1, 1234);
    }
    return out;
  });
  ok(!r.bluez.length, 'BlueZ test vectors (9) decode exactly ' + r.bluez.join(' ; '));
  ok(r.wrap === '90 3C 64@8190|80 3C 00@2', 'timestamp wrap inside a packet: 8190 then 2 (' + r.wrap + ')');
  ok(r.rtSysex === 'F8@0|FA@1|F0 01 02 03 04 05 06 07 F7@2', 'real-time inside a SysEx across packets plays on time, SysEx stays whole (' + r.rtSysex + ')');
  ok(r.contEnd === 'F0 01 02 03 F7@1' && r.contTsEnd === 'F0 01 02 F7@1', 'continuation packets: data then [ts][F7], and [hdr][ts][F7] alone');
  ok(r.two === 'C0 05@0|C0 06@0|D0 30@1|D0 31@1', '2-byte messages under running status (' + r.two + ')');
  ok(r.rtRun === '90 3C 64@0|F8@1|90 3E 64@2', 'real-time between running-status messages keeps running status');
  ok(r.common === '90 3C 64@0|F1 20@1|90 3E 64@2|F2 01 02@3|90 40 00@4', 'System Common keeps running status (' + r.common + ')');
  ok(r.sxThenMsg === 'F0 01 F7@1|90 3C 64@2', 'SysEx end followed by a new message in the same packet');
  ok(r.empty === '', 'empty read answer, 1-byte packet and a header without bit 7 yield nothing');
  ok(r.undef === 'F6@2|90 3C 64@3', 'undefined F4/F5 ignored, Tune Request passes');
  ok(r.lenient === '90 3C 64@0|90 3E 64@1' && r.orphan === '90 40 64@2', 'lenient: running status across packets after a timestamp; a fragment right after the header is dropped (' + r.lenient + ' / ' + r.orphan + ')');
  ok(r.abort === '90 3C 64@1', 'a status aborts an open SysEx; a stray F7 does nothing');
  ok(r.cap === '90 3C 64@2' && r.capOpen === null, 'SysEx over 4 KB is dropped, the next message still plays');
  ok(r.fuzz && r.fuzz.bad === 0 && r.fuzz.n > 100, 'fuzz: 6000 random packets never throw, every emitted message is well-formed ' + JSON.stringify(r.fuzz));
  ok(r.rt && r.rtMax <= 20, 'encoder round trip (note, PC, 42-byte SysEx, CC, bend, clock), packets ≤ 20 bytes (max ' + r.rtMax + ')');
  ok(r.sweep === 0, 'encoder: SysEx 0–59 data bytes round-trip between two notes, never > 20 bytes');
  ok(r.pack === '17,5', 'encoder packs 4 notes per 20-byte packet (' + r.pack + ')');
  const c = r.clk;
  ok(c.ci45.maxErr <= 2 && c.ci45.rawErr >= 30 && !c.ci45.late, 'clock, CI 45 ms: spacing error ' + c.ci45.maxErr + ' ms after 12 notes (warm-up ' + c.ci45.warm + ' ms; on arrival ' + c.ci45.rawErr + ' ms), never later than arrival');
  ok(c.ci15.maxErr <= 1 && !c.ci15.late, 'clock, CI 15 ms: spacing error ' + c.ci15.maxErr + ' ms (on arrival ' + c.ci15.rawErr + ' ms)');
  ok(c.drift.maxErr <= 2 && c.drift2.maxErr <= 2 && !c.drift.late && !c.drift2.late, 'clock, ±200 ppm sender drift: ' + c.drift.maxErr + ' / ' + c.drift2.maxErr + ' ms');
  ok(c.p20.maxErr <= 3 && !c.p20.late, 'clock, 20 s silence (longer than a wrap) re-anchors: ' + c.p20.maxErr + ' ms');
  ok(c.p5.maxErr <= 6 && !c.p5.late, 'clock, 5 s silence keeps ≥ 16 samples, no new warm-up: ' + c.p5.maxErr + ' ms');
  ok(r.frozen.f.join() === '1000,1000,1400,1600,1800' && r.frozen.flag >= 3, 'frozen sender clock: the same moment once, arrival time once it stood still over two steps and 40 ms (' + r.frozen.f.join() + ')');
  ok(r.unfrozen.f[0] === 1850 && Math.abs(r.unfrozen.f[1] - 1900) < 0.01 && r.unfrozen.flag === 0, 'a frozen clock that moves again restores correlation (' + r.unfrozen.f.join() + ')');
  ok(r.noTs === 1234, 'a message without timestamp keeps its arrival time');
  ok(!errors.length, 'no page errors ' + errors.join(' | '));
  await close();
  summary();
})().catch((e) => { console.error(e); process.exit(1); });
