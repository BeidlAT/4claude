// (owner, 30.10.2026: „Tempo und Takt sehen, wenn man die Option einschaltet – der Bildschirm pulsiert dezent im Takt,
// die Eins mit eigener Farbe, die anderen neutral und dezenter; unten links dreht sich ein Kreis um den eingestellten
// Takt, eine Umrundung ist die eingestellte Taktlänge“) hx.taktbild: off – nothing shown; on with a Takt – the glow
// peaks on each beat (the one in its own layer, stronger), falls within the beat; the ring's round is 4 × festT beats.
//   node t-hx-taktbild.js
const G = require('./hx-g'), H = require('./hx-h');
const { ok } = H;
(async () => {
  const { page, errors } = await G.open({ w: 1440, h: 900 });
  const r = await page.evaluate(async () => {
    const M = window.__M, A = M.A, sl = window.__sleep, o = {};
    await window.__reset(); window.__grid(90); M.setParam('hx.laenge', 'fest'); M.setParam('hx.festT', 2);
    M.setParam('hx.taktbild', false); await sl(600);
    o.offEl = !document.querySelector('.hx-tb') || document.querySelector('.hx-tb').hidden;
    M.setParam('hx.taktbild', true); await sl(400);
    const el = document.querySelector('.hx-tb'), a = el && el.querySelector('.eins'), z = el && el.querySelector('.zz'), ring = document.querySelector('.hx-tbr');
    o.shown = !!el && !el.hidden && !!ring && ring.classList.contains('an');
    const hb = () => M.tgBeat(A.ctx.currentTime - (A.ctx.baseLatency || 0) - (A.ctx.outputLatency || 0));
    const s = []; const end = performance.now() + 6000;
    while (performance.now() < end) { await new Promise((res) => requestAnimationFrame(res)); const b = hb(); s.push([b, +a.style.opacity || 0, +z.style.opacity || 0, parseFloat(document.querySelector('.hx-tbr .arc').style.strokeDasharray) || 0]); }
    // per beat: the highest of each layer, and how far into the beat it was
    const per = new Map(); for (const [b, ea, ez] of s) { const k = Math.floor(b + 1e-6), f = b - k, P = per.get(k) || { a: 0, z: 0, late: 0 }; P.a = Math.max(P.a, ea); P.z = Math.max(P.z, ez); if (f > 0.9) P.late = Math.max(P.late, ea, ez); per.set(k, P); }
    o.beats = [...per.entries()].slice(1, -1).map(([k, P]) => [((k % 4) + 4) % 4, +P.a.toFixed(2), +P.z.toFixed(2), +P.late.toFixed(3)]);
    // the ring: its fill against the beat within the round of 8 beats
    o.ringErr = Math.max(...s.map(([b, , , p]) => { const want = (((b % 8) + 8) % 8) / 8; const d = Math.abs(p - want); return Math.min(d, 1 - d); }));
    M.setParam('hx.taktbild', false); await sl(300); o.offAgain = el.hidden && !ring.classList.contains('an');
    return o;
  });
  console.log(JSON.stringify(r));
  ok(r.offEl, 'off: no pulse shown');
  ok(r.shown, 'on with a Takt: the pulse layer and the ring are shown');
  const ones = r.beats.filter((x) => x[0] === 0), rest = r.beats.filter((x) => x[0] !== 0);
  ok(ones.length >= 1 && ones.every((x) => x[1] > 0.6 && x[2] === 0), `the one: its own coloured layer peaks (${ones.map((x) => x[1]).join(', ')})`);
  ok(rest.length >= 3 && rest.every((x) => x[2] > 0.6 && x[1] === 0), `the other beats: the neutral layer (${rest.map((x) => x[2]).join(', ')})`);
  ok(r.beats.every((x) => x[3] < 0.2), `each pulse falls within its beat (end of beat ≤ ${Math.max(...r.beats.map((x) => x[3]))})`);
  ok(r.ringErr < 0.03, `the ring: one round is 2 bars (8 beats) – off by at most ${(r.ringErr * 100).toFixed(1)} %`);
  ok(r.offAgain, 'off again: hidden');
  ok(!errors.length, 'no page errors ' + errors.slice(0, 3).join(' | '));
  H.summary(); process.exit(0);
})();
