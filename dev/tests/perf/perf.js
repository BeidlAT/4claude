// CPU per thread group while Myzel runs a scenario, for one or more builds, alternating the builds run by run (this
// machine is shared and its load drifts: each figure is the median of --runs measurements, and the builds compared
// share each round).   node perf.js [--runs 3] [--secs 10] [--vp d,a] [--sc idle,tiefsee,...] [--json out.json] slot…
// Slots are -inst builds made by v2/mk.sh (served from v2/ on :8790). Groups (% of one core): audio = the render
// thread(s), conv = the convolver's background thread, main = the page's main thread, comp = its compositor, gpu = the
// GPU process (compositing, in this headless browser on the CPU), total = the whole browser; fps and rafMs = frames per
// second and the frame callbacks' mean own time (ms).
const { SC, measure, median } = require('./lib');
const fs = require('fs');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const flags = new Set(['--runs', '--secs', '--vp', '--sc', '--json']);
const slots = process.argv.slice(2).filter((x, i, a) => !x.startsWith('--') && !flags.has(a[i - 1]));
const RUNS = +arg('runs', 3), SECS = +arg('secs', 10), VPS = arg('vp', 'd,a').split(','), SCS = arg('sc', Object.keys(SC).join(',')).split(',');
const COLS = ['audio', 'conv', 'main', 'comp', 'gpu', 'total', 'fps', 'rafMs'];
async function run(slots, o = {}) {
  const R = {};   // R[sc][vp][slot] = [results]
  for (let r = 0; r < (o.runs || RUNS); r++) for (const sc of o.scs || SCS) for (const vp of o.vps || VPS) for (const slot of (r % 2 ? slots.slice().reverse() : slots)) {
    let m = null;
    for (let tries = 0; tries < 2 && !m; tries++) try { m = await measure(slot, sc, vp, o.secs || SECS); } catch (e) { console.error('retry', slot, sc, vp, String(e).slice(0, 200)); }
    if (!m) continue;
    ((R[sc] = R[sc] || {})[vp] = R[sc][vp] || {})[slot] = (R[sc][vp][slot] || []).concat([m]);
    if (o.verbose !== false) console.error(`run ${r + 1} ${sc}/${vp} ${slot}: audio ${m.audio} conv ${m.conv} main ${m.main} gpu ${m.gpu} total ${m.total} fps ${m.fps}${m.st && m.st.idle != null ? ' idle ' + m.st.idle : ''}${m.errs.length ? ' ERR ' + m.errs[0] : ''}`);
  }
  return R;
}
function summary(R) {
  const out = {};
  for (const sc in R) for (const vp in R[sc]) for (const slot in R[sc][vp]) {
    const L = R[sc][vp][slot], s = {};
    for (const c of COLS) s[c] = median(L.map((m) => m[c]));
    s.n = L.length; s.audioRuns = L.map((m) => m.audio);
    ((out[sc] = out[sc] || {})[vp] = out[sc][vp] || {})[slot] = s;
  }
  return out;
}
function table(S) {
  const lines = [];
  for (const sc in S) for (const vp in S[sc]) {
    lines.push(`-- ${sc} (${SC[sc] ? SC[sc].about : ''}) · ${vp === 'a' ? 'Android emulation' : 'desktop'}`);
    for (const slot in S[sc][vp]) { const s = S[sc][vp][slot]; lines.push('  ' + slot.padEnd(18) + COLS.map((c) => c + ' ' + String(s[c] == null ? '–' : +s[c].toFixed(c === 'rafMs' ? 2 : 1)).padStart(6)).join('  ') + '   audio runs [' + s.audioRuns.join(' ') + ']'); }
  }
  return lines.join('\n');
}
module.exports = { run, summary, table, COLS };
if (require.main === module) (async () => {
  if (!slots.length) { console.log('usage: node perf.js [--runs 3] [--secs 10] [--vp d,a] [--sc ' + Object.keys(SC).join(',') + '] [--json out.json] slot…'); process.exit(2); }
  const R = await run(slots), S = summary(R);
  console.log(table(S));
  if (arg('json')) fs.writeFileSync(arg('json'), JSON.stringify({ date: new Date().toISOString(), runs: RUNS, secs: SECS, slots, summary: S, raw: R }, null, 1));
})().catch((e) => { console.log('FAIL', e && e.stack || e); process.exit(1); });
