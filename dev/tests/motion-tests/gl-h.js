// Helpers for the Ladung/Schlafen suites (slot gl: sh ../v2/mk.sh /home/user/4claude/myzel gl): ga-h's open(),
// probes() and drivers() on the gl-inst build, plus motion made in node with gk-lib's trace() and played into the
// page in real time as DeviceMotionEvents (play), and a few shapes of motion:
//   shake(dur, amp, hz) – to and fro along the screen's x (as a hand shakes an egg shaker), the phone at 45°;
//   circle(dur, hz, amp, dir) – small horizontal circles (Schwenken; dir 1 counter-clockwise from above);
//   walk(dur) – walking with the phone in hand (sway 0.9 Hz, steps 1.8 Hz); hold(dur, beta) – held still;
//   faceDown / faceUp – turning the phone over onto its screen and back (1 s each way, then still).
const H = require('./ga-h');
const L = require('./gk-lib');
const URL_GL = process.env.GL || 'http://127.0.0.1:8790/gl-inst/index.html';
const open = (o = {}) => H.open(Object.assign({ url: URL_GL }, o));
const sm = L.smooth;
const M = {
  shake: (dur, amp = 16, hz = 5, t0 = 0.3) => (t) => ({ beta: 45, roll: 6 * Math.sin(2 * Math.PI * hz * t) * (t > t0 && t < t0 + dur ? 1 : 0), lin: t > t0 && t < t0 + dur ? [amp * Math.sin(2 * Math.PI * hz * (t - t0)), 0.2 * amp * Math.sin(2 * Math.PI * hz * (t - t0)), 0] : [0, 0, 0] }),
  circle: (dur, hz = 1.5, amp = 2.5, dir = 1, t0 = 0.3) => (t) => ({ beta: 45, lin: t > t0 && t < t0 + dur ? [amp * Math.cos(2 * Math.PI * hz * t), dir * amp * Math.sin(2 * Math.PI * hz * t), 0] : [0, 0, 0] }),
  walk: () => (t) => ({ beta: 45 + 3 * Math.sin(2 * Math.PI * 0.9 * t), roll: 4 * Math.sin(2 * Math.PI * 0.9 * t + 1), yaw: 10 * Math.sin(t * 0.2),
    lin: [1.2 * Math.sin(2 * Math.PI * 0.9 * t), 0.8 * Math.sin(2 * Math.PI * 1.8 * t), 3.5 * Math.sin(2 * Math.PI * 1.8 * t) + 1.2 * Math.sin(2 * Math.PI * 3.6 * t)] }),
  hold: (beta = 45) => () => ({ beta }),
  // from beta b0 over onto the screen (beta 180), lying there
  faceDown: (b0 = 45) => (t) => ({ beta: b0 + (180 - b0) * sm(0.1, 1.1, t), lin: t > 0.1 && t < 1.1 ? [0, 0.6 * Math.sin(Math.PI * (t - 0.1)), 0.8 * Math.sin(Math.PI * (t - 0.1))] : [0, 0, 0] }),
  faceUp: (b1 = 45) => (t) => ({ beta: 180 - (180 - b1) * sm(0.1, 1.1, t), lin: t > 0.1 && t < 1.1 ? [0, 0.6 * Math.sin(Math.PI * (t - 0.1)), 0.8 * Math.sin(Math.PI * (t - 0.1))] : [0, 0, 0] }),
};
// a trace made here, dispatched in the page at its own pace; resolves when through. o: gk-lib trace options (rate,
// noise, noGyro, noLin, seed …)
async function play(page, dur, motion, o = {}) {
  const tr = L.trace(dur, motion, Object.assign({ noise: { g: 0.03, r: 0.3 } }, o)).map((s) => ({ t: s.t, g: s.g, a: s.a, r: s.r }));
  return page.evaluate((list) => window.__dmPlay(list), tr);
}
// Gestik on through the tile (granted), the sensor alive and held at 45° for a moment (the zero, the floors)
async function gestik(page, o = {}) {
  await H.gestikOn(page);
  await play(page, o.settle || 1.2, M.hold(45));
  await page.evaluate(() => window.__M.closePanel());
}
module.exports = Object.assign({}, H, { open, M, play, gestik, L, URL_GL });
