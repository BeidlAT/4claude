// ---- Pegelhaushalt (effekte-konzept.md §3.4, built 30.10.2026): when the Schleifen and the live play press the sum into
// the Begrenzer, the Schleifen make room – the strip „Hexenring“ is turned down a little, slowly (1 dB/s, 2 dB/s under
// hard pressure, 6 dB at most), and comes back once the Begrenzer has been quiet for a while (6 s, then ½ dB/s); with no
// Schleife playing it comes back at once (2 dB/s). It acts only on what the Begrenzer really has to do (its reported
// reduction, init-audio.js masterLim; or the Summe's Verdichtung holding more than 10 dB, mixer.js mxGR) – measured 30.10. (Chromium, four dense Schleifen and live play in Handpan-Kreis,
// Kalimbatraum, Kurzwellenritual): the Summe's Verdichtung holds the sum at −2 … −8 dBFS and the Begrenzer stays idle,
// so in ordinary play nothing changes. Device-side (hx.haushalt, on), shown in the strip's text and in Leistung. ----
const HXHR = { db: 0, quiet: 0, t: 0, need: 0 };
const HXHR_MIN = -6, HXHR_ON = 1.5, HXHR_HARD = 4, HXHR_QUIET = 6, HXHR_GLUE = 10;   // (GLUE: the Summe's Verdichtung slammed – holding more than 10 dB counts as pressing too; its usual 5–9 dB under a full sum is its own work)
// the factor the strip „Hexenring“ takes (strips.js stripGain)
const hxHrGain = () => (HXHR.db < 0 ? dbToGain(HXHR.db) : 1);
// every ¼ s (hxTick): the Begrenzer's deepest reduction since the last look decides
function hxHrTick() {
  const pnow = performance.now();
  if (pnow - HXHR.t < 250) return;
  const dt = HXHR.t ? Math.min(1, (pnow - HXHR.t) / 1000) : 0.25; HXHR.t = pnow;
  const glue = typeof mxGR === 'function' ? mxGR() : 0, over = glue - HXHR_GLUE, need = Math.max(A.limRedMin != null ? -A.limRedMin : 0, over > 0 ? over + HXHR_ON : 0); A.limRedMin = 0; HXHR.need = need;   // (anything over 10 dB of Verdichtung counts as pressing)
  const was = HXHR.db, on = P['hx.haushalt'] && A.lim && HX.node;
  if (!on) HXHR.db = 0;
  else if (!hxBusy()) HXHR.db = Math.min(0, HXHR.db + 2 * dt);
  else if (need > HXHR_ON) { HXHR.db = Math.max(HXHR_MIN, HXHR.db - (need > HXHR_HARD ? 2 : 1) * dt); HXHR.quiet = 0; }
  else { HXHR.quiet += dt; if (HXHR.quiet > HXHR_QUIET && HXHR.db < 0) HXHR.db = Math.min(0, HXHR.db + 0.5 * dt); }
  if (HXHR.db !== was && A.ctx && MIX.s.hxr) { updStrip(MIX.s.hxr); if (MX.root) hxStripSync(); }
}
const hxHrText = () => (HXHR.db < -0.05 ? 'Spielraum ' + MX_MINUS + dec(Math.abs(HXHR.db).toFixed(1)) + ' dB' : '');
