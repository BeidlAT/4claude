// Final QA (gq): Gestik off = the app before Gestik (./orig, slot gqbase) against the current app (slot gq), rendered
// offline sample for sample: a phrase on each engine (and Ebene 2, the Puls, the drone, echo/hall/chorus on), the same
// seeds. First: is a render reproducible within one build (two fresh pages)? Then old vs new. node t-gq-parity.js
//   build: sh ../v2/mk.sh /home/user/4claude/myzel gq; sh ../v2/mk.sh ./orig gqbase   (from review/tq-parity-render.js)
process.env.NO_RAF = '1'; process.env.SEED_BLOBS = '1';
const { chromium, openInst } = require('../v2/lib');
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
const OLD = 'http://127.0.0.1:8790/gqbase-inst/index.html', NEW = 'http://127.0.0.1:8790/gq-inst/index.html';
const CASES = [
  ['neb', {}], ['obt', { 'v.layer': 'glo', 'v.layerLvl': 0.4 }], ['glo', {}], ['trp', {}], ['kor', {}], ['sti', {}], ['sai', {}], ['tie', {}],
  ['neb', { 'dly.mix': 0.4, 'rev.mix': 0.4, 'cho.mix': 0.5, 'pha.mix': 0.3, 'mov.pan': 0.5, 'flt.lfoDepth': 0.4, 'bor.on': true, 'mst.comp': 0.5 }],
];
async function renders(url) {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const { page, errors } = await openInst(b, url, true);
  await page.click('#btnStart'); await page.waitForTimeout(500);
  const out = [];
  for (const [eng, extra] of CASES) {
    const r = await page.evaluate(async ([eng, extra]) => {
      const M = window.__M, sr = 44100, dur = 4;
      if (!M.ENGINES[eng]) return { skip: true };
      { let x = 4242; Math.random = () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 1e9) / 1e9; }; }
      const ctx = await window.__off(sr, dur, Object.assign({ 'v.eng': eng, 'v.human': 0.3 }, extra));
      { let x = 777; Math.random = () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 1e9) / 1e9; }; }
      const buf = await window.__phrase(ctx, sr, dur, { step: 0.4, hold: 0.3 });
      const L = buf.getChannelData(0), R = buf.getChannelData(1);
      let h = 0, e = 0, nz = 0;
      for (let i = 0; i < L.length; i++) { const a = L[i], c = R[i]; const ia = new Int32Array(new Float32Array([a, c]).buffer); h = (Math.imul(h, 31) + ia[0]) | 0; h = (Math.imul(h, 31) + ia[1]) | 0; e += a * a + c * c; if (a || c) nz++; }
      return { h, e: +e.toFixed(6), nz, st: window.__stats(buf, 0.1), L: Array.from(L.filter((_, i) => i % 64 === 0)) };
    }, [eng, extra]);
    out.push(r);
  }
  await b.close();
  return { out, errors };
}
(async () => {
  const o1 = await renders(OLD), o2 = await renders(OLD), n1 = await renders(NEW);
  for (let i = 0; i < CASES.length; i++) {
    const nm = CASES[i][0] + (Object.keys(CASES[i][1]).length ? '+' + Object.keys(CASES[i][1]).length + ' params' : '');
    const a = o1.out[i], b = o2.out[i], c = n1.out[i];
    if (a.skip) { console.log('SKIP ' + nm); continue; }
    const selfSame = a.h === b.h;
    let md = 0; for (let k = 0; k < a.L.length; k++) md = Math.max(md, Math.abs(a.L[k] - c.L[k]));
    let mdSelf = 0; for (let k = 0; k < a.L.length; k++) mdSelf = Math.max(mdSelf, Math.abs(a.L[k] - b.L[k]));
    console.log('INFO ' + nm + ': old twice ' + (selfSame ? 'identical' : 'differ (max ' + mdSelf.toExponential(2) + ')') + '; old vs new ' + (a.h === c.h ? 'identical' : 'differ (max ' + md.toExponential(2) + ', energy ' + a.e + ' vs ' + c.e + ')'));
    if (selfSame) ok(a.h === c.h, nm + ': Gestik never on – the render is bit-identical to the app before Gestik');
    else ok(Math.abs(a.st.rms - c.st.rms) <= Math.abs(a.st.rms - b.st.rms) + 0.05, nm + ': not reproducible even within the old build; loudness within its own spread (' + a.st.rms + ' / ' + b.st.rms + ' / new ' + c.st.rms + ' dB)');
  }
  ok(!o1.errors.length && !n1.errors.length, 'no page errors ' + o1.errors.concat(n1.errors).join(' | '));
})().catch((e) => { console.log('FAIL ' + e.stack); process.exitCode = 1; });
