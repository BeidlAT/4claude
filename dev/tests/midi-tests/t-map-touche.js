// Expressive E Touché SE (owner, 25.10.2026): recognised by name, its four directions (factory CC 16–19) shape the held
// notes like a finger on the field – away/toward the height, left/right the newest note's pitch (±1 semitone) – through
// Formen, so the preset never changes; back at rest nothing is left.   node t-map-touche.js   (slot 'mm': sh ../v2/mk.sh … mm)
const { open, ok, close } = require('./hm');
(async () => {
  const { page, errors } = await open({ cfg: { ins: [['k1', 'Touché SE'], ['k2', 'Testkeyboard'], ['k3', 'TOUCHE']] } });
  const r = await page.evaluate(async () => {
    const M = window.__M, T = (b) => window.__send(b, 'k1'), K = (b) => window.__send(b, 'k2'), sl = window.__sleep;
    const o = { txt: M.profText(M.MIDI.srcs.get('k1')), txt2: M.profText(M.MIDI.srcs.get('k3')), kb: M.profText(M.MIDI.srcs.get('k2')) };
    const pv = JSON.stringify(M.patchValues ? M.patchValues() : M.P);
    K([0x90, 60, 100]); await sl(80);
    const tt = M.touches.get('midi-k2-0-60'); o.note = !!tt; const y0 = tt ? tt.y : 0;
    const at = async (msg) => { T(msg); M.mapFlush(); await sl(60); const nw = M.modNewest(); return { h: +M.modVal('hoehe').toFixed(3), b: +M.modVal('bend').toFixed(3), dy: +(M.modY(tt, nw) - y0).toFixed(3), c: Math.round(M.modCents(tt, nw, M.A.ctx.currentTime)) }; };
    o.weg = await at([0xb0, 17, 127]); o.weg0 = await at([0xb0, 17, 0]);
    o.her = await at([0xb0, 16, 127]); o.her0 = await at([0xb0, 16, 0]);
    o.re = await at([0xb0, 19, 127]); o.re0 = await at([0xb0, 19, 0]);
    o.li = await at([0xb0, 18, 127]); o.half = await at([0xb0, 18, 64]); o.li0 = await at([0xb0, 18, 0]);
    o.preset = pv === JSON.stringify(M.patchValues ? M.patchValues() : M.P);
    K([0x80, 60, 0]); await sl(50);
    return o;
  });
  ok(/^Expressive E Touché erkannt/.test(r.txt) && /^Expressive E Touché erkannt/.test(r.txt2) && r.kb === '', `recognised by name (${r.txt}; „TOUCHE“ too; a plain keyboard not)`);
  ok(r.note, 'a key held on another keyboard');
  ok(r.weg.h === 1 && r.weg.dy > 0.2, `pushed away: the height goes up (${JSON.stringify(r.weg)})`);
  ok(r.her.h === -1 && r.her.dy < -0.2, `pulled toward you: the height goes down (${JSON.stringify(r.her)})`);
  ok(r.re.b === 0.5 && r.re.c === 100, `right: the note one semitone up (${JSON.stringify(r.re)})`);
  ok(r.li.c === -100 && Math.abs(r.half.c + 50) <= 1, `left: down, half way half a semitone (${r.li.c}, ${r.half.c} cents)`);
  ok([r.weg0, r.her0, r.re0, r.li0].every((x) => x.h === 0 && x.b === 0 && x.dy === 0 && x.c === 0), 'back at rest nothing is left');
  ok(r.preset, 'the preset is untouched (Formen)');
  ok(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await close();
})().catch((e) => { console.error(e); process.exit(1); });
