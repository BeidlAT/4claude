// magnitude of the centred Lagrange-3 read (as FracDelay.read3) at frequency f for fractions 0..1
const SR = 48000;
const mag = (p, w) => { const h = [-(p - 1) * (p - 2) * (p - 3) / 6, p * (p - 2) * (p - 3) / 2, -p * (p - 1) * (p - 3) / 2, p * (p - 1) * (p - 2) / 6]; let re = 0, im = 0; for (let k = 0; k < 4; k++) { re += h[k] * Math.cos(w * k); im -= h[k] * Math.sin(w * k); } return Math.hypot(re, im); };
for (const f of [500, 1000, 2000, 3000, 5000, 8000]) {
  const w = 2 * Math.PI * f / SR, row = [];
  for (const fr of [0, 0.1, 0.25, 0.5, 0.75, 0.9]) row.push((20 * Math.log10(mag(1 + fr, w))).toFixed(4));
  // loss per second at T60-equivalent: two reads per period, f periods per second, worst fraction
  const worst = 20 * Math.log10(mag(1.5, w)) * 2 * f;
  console.log(`${f} Hz: dB per read at frac 0/.1/.25/.5/.75/.9: ${row.join(' ')}  → worst ${worst.toFixed(0)} dB/s (two reads a period)`);
}
