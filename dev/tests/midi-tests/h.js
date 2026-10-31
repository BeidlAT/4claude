// Shared helpers for the MIDI suites: a fake Web MIDI (several inputs/outputs, timestamps, hot-plug, polyfill variants).
// BASE defaults to the 'mr' test slot; build it with: sh ../v2/mk.sh /home/user/4claude/myzel mr
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8790/mr-inst/index.html';
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
let browser = null;
// (31.10.2026) the test server: a restarted container ends it – started again when it does not answer (../serve.sh)
function serve() { if (!/127\.0\.0\.1:8790|localhost:8790/.test(BASE)) return; try { require('child_process').execFileSync('sh', [require('path').join(__dirname, '..', 'serve.sh')], { stdio: 'inherit' }); } catch (e) {} }
async function launch() { if (!browser) { serve(); browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); } return browser; }
async function close() { if (browser) await browser.close(); browser = null; }
// cfg: { ins: [[id, name]], outs: [[id, name]], noState, fresh, deny, perm: 'prompt'|'granted', noMidi, seed }
async function open(opts = {}) {
  const b = await launch();
  const ctx = await b.newContext(opts.mobile ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } : { viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript((cfg) => {
    let x = cfg.seed || 12345;   // seeded Math.random: comparable runs
    Math.random = () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 1e9) / 1e9; };
    if (cfg.storage) for (const k in cfg.storage) localStorage.setItem(k, cfg.storage[k]);
    if (cfg.noMidi) { delete Navigator.prototype.requestMIDIAccess; return; }
    const mkIn = (id, name) => ({ id, name, state: 'connected', onmidimessage: null });
    const mkOut = (id, name) => ({ id, name, state: 'connected', sent: [], send(d, ts) { this.sent.push({ d: Array.from(d), ts: ts == null ? null : ts, at: performance.now(), off: window.__M ? window.__M.A.ctxOff : null }); } });
    const inputs = new Map(), outputs = new Map();
    for (const [id, name] of cfg.ins || [['k1', 'Testkeyboard']]) inputs.set(id, mkIn(id, name));
    for (const [id, name] of cfg.outs || []) outputs.set(id, mkOut(id, name));
    const F = (window.__midi = { inputs, outputs, asked: 0, cfg, mkIn, mkOut });
    const mkAcc = () => { const a = { inputs, outputs }; if (!cfg.noState) a.onstatechange = null; return a; };
    F.access = mkAcc();
    navigator.requestMIDIAccess = () => {
      F.asked++;
      if (F.cfg.deny) return Promise.reject(Object.assign(new Error('no'), { name: 'NotAllowedError' }));
      if (F.cfg.fresh) F.access = mkAcc();
      return Promise.resolve(F.access);
    };
    const q = navigator.permissions.query.bind(navigator.permissions);
    navigator.permissions.query = (d) => (d && d.name === 'midi' ? Promise.resolve({ state: cfg.perm || 'prompt' }) : q(d));
    F.send = (bytes, id = 'k1', ts) => { const i = inputs.get(id); if (i && i.onmidimessage) i.onmidimessage(ts === false ? { data: new Uint8Array(bytes) } : { data: new Uint8Array(bytes), timeStamp: ts == null ? performance.now() : ts }); };
    F.plug = (id, name) => { inputs.set(id, mkIn(id, name)); if (F.access.onstatechange) F.access.onstatechange({}); };
    F.plugOut = (id, name) => { outputs.set(id, mkOut(id, name)); if (F.access.onstatechange) F.access.onstatechange({}); };
    F.unplug = (id) => { inputs.delete(id); if (F.access.onstatechange) F.access.onstatechange({}); };
    window.__send = F.send;
    window.__sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  }, opts.cfg || {});
  await page.goto(opts.url || BASE);
  await page.waitForFunction(() => !!window.__M);
  if (opts.start !== false) { await page.click('#btnStart'); await page.waitForFunction(() => window.__M.MIDI.state === 'ready' || window.__M.MIDI.state === 'unsupported' || window.__M.MIDI.state === 'blocked', null, { timeout: 5000 }).catch(() => {}); await page.waitForTimeout(300); }
  return { page, errors, ctx };
}
module.exports = { open, ok, close, BASE };
