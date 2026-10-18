// the app's DSP module with constants/lines replaced: env SUBS='[["from","to"],…]' (JSON), or SUB='from|to;…'
const L = require('./dsplib');
function src() {
  let s = L.dspSource();
  const reps = process.env.SUBS ? JSON.parse(process.env.SUBS) : (process.env.SUB || '').split(';').filter(Boolean).map((r) => r.split('|'));
  for (const [from, to] of reps) { if (!s.includes(from)) { console.log('!! not found: ' + from); process.exit(1); } s = s.split(from).join(to); }
  return s;
}
module.exports = { src, load: (sr = 48000) => L.loadDsp(sr, src()) };
