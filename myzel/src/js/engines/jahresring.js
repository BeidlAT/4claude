// Jahresring's bar: free–free Euler–Bernoulli modes (βL of the first six) and each mode's shape Φk along the bar
// (x from one end, 0…1, 65 points; 2 at the free ends) – where the mallet strikes decides how strongly each mode rings
// (the fundamental's nodes at x = 0.224 and 0.776, the 2nd and 4th mode's at the centre)
const JRG_BL = [4.730041, 7.853205, 10.995608, 14.137165, 17.27876, 20.420352];
const JRG_PHI = JRG_BL.map((b) => {
  const s = (Math.cosh(b) - Math.cos(b)) / (Math.sinh(b) - Math.sin(b));
  return Float64Array.from({ length: 65 }, (_, i) => { const x = b * i / 64; return Math.cosh(x) + Math.cos(x) - s * (Math.sinh(x) + Math.sin(x)); });
});
const jrgPhi = (k, x) => { const p = clamp(x, 0, 1) * 64, i = Math.min(63, Math.floor(p)), r = p - i; return JRG_PHI[k][i] * (1 - r) + JRG_PHI[k][i + 1] * r; };
// mode ratios of the free bar (STK; 5th and 6th from βL) and of the undercut marimba bar (Csound; 5th and 6th A)
const JRG_FREE = [1, 2.7565, 5.4039, 8.933, 13.345, 18.638], JRG_MAR = [1, 3.932, 9.538, 16.688, 25.4, 35.8];
// the year: 0 spring, 0.25 summer, 0.5 autumn, 0.75 winter; it starts where the calendar stands (5 May = spring)
const JRG_FIX = { fruehling: 0, sommer: 0.25, herbst: 0.5, winter: 0.75 };
const JRG_SEASON = ['Frühling', 'Sommer', 'Herbst', 'Winter'];
{ const d = new Date(), doy = (d - new Date(d.getFullYear(), 0, 1)) / 864e5; A.season = (((doy - 125) / 365.25) % 1 + 1) % 1; }
A.jrgAge = 0;
// the four seasons' weights now: each fades into the next along a half cosine (Jahreszeit fixes one for a preset)
function jrgSeason() {
  const fix = JRG_FIX[P['jrg.jahreszeit']], s = fix != null ? fix : A.season;
  const p = s * 4, i = Math.floor(p) % 4, m = (1 - Math.cos((p - Math.floor(p)) * Math.PI)) / 2, w = [0, 0, 0, 0];
  w[i] += 1 - m; w[(i + 1) % 4] += m;
  return w;
}
// a hit ages the bar and nudges the year – at most two hits a second count, so a dense Puls lane neither races the
// year nor sours the tuning (age: up to 6 ct flat, reversible – Verjüngen, Schlafen)
function jrgCount() {
  const s = Math.floor(HXW.on ? A.ctx.currentTime : performance.now() / 1000);   // (Hexenring: the Werk-Rahmen counts in its render's time)
  if (A.jrgSec !== s) { A.jrgSec = s; A.jrgN = 0; }
  if (A.jrgN >= 2) return;
  A.jrgN++; A.jrgAge++;
  if (P['jrg.jahreszeit'] === 'lauf' && P['jrg.jahr'] > 0) A.season = (A.season + 0.00025) % 1;
}
// the year runs with audio time (tick): only while the sound runs and the page is seen – after a pause it goes on
// where it stopped, never a jump
function jrgClock() {
  const now = A.ctx.currentTime, dt = A.seasonT != null ? clamp(now - A.seasonT, 0, 0.25) : 0;
  A.seasonT = now;
  if (document.hidden || P['jrg.jahreszeit'] !== 'lauf' || !(P['jrg.jahr'] > 0)) return;
  A.season = (A.season + dt / (P['jrg.jahr'] * 60)) % 1;
}
// the mallet's contact (per sample rate, shared): one sample of 0.5, then 0.25 s of −140 dB noise that a voice loops
// until it ends – it keeps the band-passes' input alive (Chromium stops a filter whose input fell silent after its own
// guess of the tail, long before a high-Q mode has rung out)
let JRG_IMP = null;
function jrgImp() {
  const sr = A.ctx.sampleRate;
  if (JRG_IMP && JRG_IMP.sampleRate === sr) return JRG_IMP;
  const b = A.ctx.createBuffer(1, Math.round(sr * 0.25), sr), d = b.getChannelData(0);
  d[0] = 0.5;
  for (let i = 2; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 1e-7;
  return (JRG_IMP = b);
}

