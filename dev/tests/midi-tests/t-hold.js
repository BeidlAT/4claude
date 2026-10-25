// Halten (owner, 25.10.2026): a latch – what is let go sounds on and stays drawn as held; a new stroke from an empty
// hand lets the held ones go, notes struck while another is down join the chord; off lets all go. The fermata beside
// Freeze, the Enter key, a MIDI key, a learned control.   node t-hold.js   (slot 'mm': sh ../v2/mk.sh … mm)
const { open, ok, close } = require('./hm');
(async () => {
  const { page, errors } = await open({ cfg: { ins: [['k2', 'Testkeyboard']] } });
  const r = await page.evaluate(async () => {
    const M = window.__M, sl = window.__sleep, K = (b) => window.__send(b, 'k2');
    const dn = (id, x) => M.onDown({ pointerId: id, pt: { x, y: 0.5, px: x * 800, py: 300 } }), up = (id) => M.onUp({ pointerId: id });
    const alive = (id) => { const tt = M.touches.get(id); return !!tt && tt.voices.some(({ v }) => v.alive && !v.released && !v.rel); };
    const btn = document.getElementById('btnHold'), o = {};
    o.icon = !!btn.querySelector('svg'); btn.click(); await sl(50); o.on = M.HOLD.on && btn.getAttribute('aria-pressed') === 'true';
    dn('p1', 0.3); await sl(100); up('p1'); await sl(200); o.p1 = { held: !!(M.touches.get('p1') || {}).hold, alive: alive('p1') }; o.carries = btn.classList.contains('carries');
    dn('p2', 0.6); await sl(100); o.p1gone = !M.touches.has('p1');
    dn('p3', 0.7); await sl(50); up('p2'); up('p3'); await sl(100); o.chord = ['p2', 'p3'].every((id) => M.touches.get(id) && M.touches.get(id).hold);
    K([0x90, 64, 100]); await sl(80); K([0x80, 64, 0]); await sl(100); o.chordGone = !M.touches.has('p2') && !M.touches.has('p3'); o.midi = !!(M.touches.get('midi-k2-0-64') || {}).hold;
    K([0x90, 64, 100]); await sl(80); o.again = M.touches.has('midi-k2-0-64') && !M.touches.get('midi-k2-0-64').hold; K([0x80, 64, 0]); await sl(80);
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })); await sl(80);
    o.offKey = !M.HOLD.on && M.touches.size === 0 && !btn.classList.contains('carries');
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })); await sl(50); o.onKey = M.HOLD.on;
    M.holdSet(false); dn('p4', 0.4); await sl(50); up('p4'); await sl(50); o.plain = !M.touches.has('p4');
    return o;
  });
  ok(r.icon && r.on, 'the fermata beside Freeze switches Halten on, lit');
  ok(r.p1.held && r.p1.alive && r.carries, `a note let go sounds on, held (${JSON.stringify(r.p1)}); the button breathes while it carries`);
  ok(r.p1gone, 'a new stroke from an empty hand lets it go');
  ok(r.chord, 'notes struck while another is down join the chord and are held together');
  ok(r.chordGone && r.midi, 'a MIDI key is a new stroke too, and its note is held');
  ok(r.again, 'the same key again strikes it anew');
  ok(r.offKey && r.onKey, 'Enter switches it off (all let go) and on again');
  ok(r.plain, 'off: a note ends when let go, as always');
  ok(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await close();
})().catch((e) => { console.error(e); process.exit(1); });
