// The performance guard: the current build against the reference build of baseline.json, measured alternately in the
// same session (this machine is shared and its load drifts, so absolute figures from another day prove little), plus a
// check that does not depend on the machine at all: at idle the graph sleeps (Ruhe) and nothing after the echo runs.
//   node check.js [--runs 3] [--sc idle,after,play,tiefsee] [--vp d,a]      exit 1 on a regression
//   node check.js --write [--runs 5]     measure the current build alone and store it in baseline.json (with its commit)
// A figure fails when it rises above the reference by more than the noise: audio (the render threads plus the
// convolver's background thread) by 8 % + 1 point of a core, the main thread by 15 % + 3 points.
const fs = require('fs'), path = require('path');
const { run, summary, table } = require('./perf');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { hook, analyse, parts } = require('./inv');
const { HOST } = require('./lib');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const BASE = path.join(__dirname, 'baseline.json');
const CUR = process.env.CUR || 'perfcur-inst', REF = process.env.REF || 'perfref-inst';
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; return c; };
// at idle, after the switch has had time: asleep, and the busy set holds no part of what follows the echo
async function sleeps(slot, vp) {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  try {
    const ctx = await b.newContext(vp === 'a' ? { viewport: { width: 412, height: 915 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2.625 } : { viewport: { width: 1280, height: 800 } });
    await ctx.addInitScript(hook);
    const pg = await ctx.newPage();
    await pg.goto(HOST + slot + '/index.html'); await pg.waitForFunction(() => !!window.__M);
    await pg.click('#btnStart');
    const t = await pg.evaluate(async () => { const t0 = performance.now(); while (performance.now() - t0 < 30000) { if (window.__M.IDLE && window.__M.IDLE.on) return (performance.now() - t0) / 1000; await new Promise((r) => setTimeout(r, 200)); } return -1; });
    const a = await pg.evaluate(analyse), q = await pg.evaluate(parts);
    return { t, a, q };
  } finally { await b.close(); }
}
(async () => {
  const base = fs.existsSync(BASE) ? JSON.parse(fs.readFileSync(BASE, 'utf8')) : null, graph = {};
  const vps = arg('vp', 'd,a').split(','), scs = arg('sc', 'idle,after,play,tiefsee').split(','), runs = +arg('runs', process.argv.includes('--write') ? 5 : 3);
  // the deterministic part first
  for (const vp of vps) {
    const { t, a, q } = await sleeps(CUR, vp);
    ok(t > 0, `${vp}: idle – the graph sleeps after ${t.toFixed(1)} s`);
    ok(!q.master && !q.strips.length && !q.chains && !q.chainsPulled && !q.hxStrip, `${vp}: asleep, the master, the channel strips and the insert chains rest (busy ${JSON.stringify(a.busy)})`);
    if (base && base.graph && base.graph[vp]) ok(a.nPulled <= base.graph[vp].nPulled + 8, `${vp}: nodes the render visits asleep ${a.nPulled} (baseline ${base.graph[vp].nPulled})`);
    graph[vp] = { nPulled: a.nPulled, busy: a.busy };
  }
  if (process.argv.includes('--write')) {
    const R = await run([CUR], { runs, scs: (arg('sc', 'idle,tiefsee,regenwald,kompost,play,after')).split(','), vps }), S = summary(R);
    console.log(table(S));
    const { execSync } = require('child_process');
    const commit = execSync('git -C /home/user/4claude rev-parse --short HEAD').toString().trim();
    const cpu = (fs.readFileSync('/proc/cpuinfo', 'utf8').match(/model name\s*:\s*(.*)/) || [])[1];
    const out = { about: 'Myzel CPU per thread group (% of one core), medians – dev/tests/perf/README in check.js and perf.js', ref: commit, date: new Date().toISOString().slice(0, 10), cpu, cores: require('os').cpus().length, runs, graph, figures: {} };
    for (const sc in S) for (const vp in S[sc]) { const s = S[sc][vp][CUR]; (out.figures[sc] = out.figures[sc] || {})[vp] = { audio: s.audio, conv: s.conv, main: s.main, comp: s.comp, gpu: s.gpu, total: s.total, fps: s.fps, rafMs: s.rafMs }; }
    fs.writeFileSync(BASE, JSON.stringify(out, null, 1) + '\n');
    console.log('baseline written: ' + BASE + ' (ref ' + commit + ')');
    return;
  }
  // the current build against the reference build, alternately
  const R = await run([REF, CUR], { runs, scs, vps }), S = summary(R);
  console.log(table(S));
  for (const sc in S) for (const vp in S[sc]) {
    const c = S[sc][vp][CUR], r = S[sc][vp][REF]; if (!c || !r) continue;
    const ca = c.audio + c.conv, ra = r.audio + r.conv;
    ok(ca <= ra * 1.08 + 1, `${sc}/${vp}: audio ${ca.toFixed(1)} against the reference's ${ra.toFixed(1)} (limit ${(ra * 1.08 + 1).toFixed(1)})`);
    ok(c.main <= r.main * 1.15 + 3, `${sc}/${vp}: main thread ${c.main.toFixed(1)} against ${r.main.toFixed(1)}`);
    const B = base && base.figures && base.figures[sc] && base.figures[sc][vp];
    if (B) console.log(`INFO ${sc}/${vp}: stored baseline (${base.ref}, ${base.date}) audio ${(B.audio + B.conv).toFixed(1)}, main ${B.main.toFixed(1)} – this session's reference ${ra.toFixed(1)} / ${r.main.toFixed(1)}`);
  }
})().catch((e) => { console.log('FAIL ' + (e && e.stack || e)); process.exitCode = 1; });
