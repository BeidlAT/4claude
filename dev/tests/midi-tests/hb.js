// Helpers for the Bluetooth suites: the fake Web MIDI of h.js plus a fake Web Bluetooth (navigator.bluetooth) whose
// devices speak real BLE-MIDI packets. BASE defaults to the 'mb' slot: sh ../v2/mk.sh /home/user/4claude/myzel mb
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8790/mb-inst/index.html';
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) { fails++; process.exitCode = 1; } };
let browser = null;
async function launch() { if (!browser) browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); return browser; }
async function close() { if (browser) await browser.close(); browser = null; }
const UA = {
  android: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36',
  webview: 'Mozilla/5.0 (Linux; Android 13; Pixel 7 Build/TQ3A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/140.0.0.0 Mobile Safari/537.36',
  windows: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
  mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
  ipad: 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  firefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0',
  ffandroid: 'Mozilla/5.0 (Android 14; Mobile; rv:140.0) Gecko/140.0 Firefox/140.0',
  linux: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
};
// opts: { cfg: Web MIDI mock config (h.js), bt: Bluetooth mock config | false (no navigator.bluetooth), ua, mobile,
//         vp: [w, h] viewport (touch: true for a touch screen, tablet: true for one that is not a phone),
//         start (default true), storage, viewer }
async function open(opts = {}) {
  const b = await launch();
  const co = opts.mobile ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } : { viewport: { width: 1280, height: 800 } };
  if (opts.vp) { co.viewport = { width: opts.vp[0], height: opts.vp[1] }; if (opts.touch) { co.hasTouch = true; co.isMobile = !opts.tablet; } }
  if (opts.ua) co.userAgent = UA[opts.ua] || opts.ua;
  const ctx = await b.newContext(co);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript((cfg) => {
    let x = cfg.seed || 12345;
    Math.random = () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 1e9) / 1e9; };
    if (cfg.storage) for (const k in cfg.storage) localStorage.setItem(k, cfg.storage[k]);
    if (cfg.viewer) window.claude = { use: () => Promise.reject(new Error('no')) };
    window.__sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    window.__hx = (s) => s.trim().split(/\s+/).map((b) => parseInt(b, 16));
    if (cfg.noMidi) { delete Navigator.prototype.requestMIDIAccess; }
    else {
      const mkIn = (id, name) => ({ id, name, state: 'connected', onmidimessage: null });
      const mkOut = (id, name) => ({ id, name, state: 'connected', sent: [], send(d, ts) { this.sent.push({ d: Array.from(d), ts: ts == null ? null : ts }); } });
      const inputs = new Map(), outputs = new Map();
      for (const [id, name] of cfg.ins || []) inputs.set(id, mkIn(id, name));
      for (const [id, name] of cfg.outs || []) outputs.set(id, mkOut(id, name));
      const F = (window.__midi = { inputs, outputs, asked: 0, cfg, mkIn, mkOut });
      F.access = { inputs, outputs, onstatechange: null };
      navigator.requestMIDIAccess = () => { F.asked++; return cfg.denyMidi ? Promise.reject(Object.assign(new Error('no'), { name: 'NotAllowedError' })) : Promise.resolve(F.access); };
      const q = navigator.permissions.query.bind(navigator.permissions);
      navigator.permissions.query = (d) => { if (cfg.permThrow && d && d.name === 'midi') throw new TypeError('unknown permission'); return d && d.name === 'midi' ? Promise.resolve({ state: cfg.perm || 'prompt' }) : q(d); };
      F.send = (bytes, id = 'k1') => { const i = inputs.get(id); if (i && i.onmidimessage) i.onmidimessage({ data: new Uint8Array(bytes), timeStamp: performance.now() }); };
      F.plug = (id, name) => { inputs.set(id, mkIn(id, name)); if (F.access.onstatechange) F.access.onstatechange({}); };
      F.unplug = (id) => { inputs.delete(id); if (F.access.onstatechange) F.access.onstatechange({}); };
      window.__send = F.send;
    }
    // ---------- fake Web Bluetooth ----------
    if (cfg.bt === false) { try { delete Navigator.prototype.bluetooth; } catch (e) {} try { Object.defineProperty(navigator, 'bluetooth', { value: undefined, configurable: true }); } catch (e) {} return; }
    const C = cfg.bt || {}, CHR = '7772e5db-3868-4112-a1a9-f2669d106bf3';
    const T = (window.__bt = { reqs: [], devs: new Map(), next: null, cfg: C });
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const err = (name, msg) => Object.assign(new Error(msg), { name });
    function mkDev(id, name, o = {}) {
      const dev = new EventTarget();
      Object.assign(dev, { id, name, o, links: 0, reads: 0, subs: 0, written: [], log: [], t: [], overlap: 0, chr: null });
      let pending = 0;
      // every GATT call takes a few ms; a second one while one is pending fails like on Android
      const op = async (nm, fn) => {
        dev.log.push(nm); dev.t.push(performance.now());
        if (pending) { dev.overlap++; await wait(1); throw err('NetworkError', 'GATT operation failed for unknown reason.'); }
        pending++;
        try { await wait(o.opDelay != null ? o.opDelay : 3); return await fn(); } finally { pending--; }
      };
      const mkChr = () => {
        const c = o.noEvents ? {} : new EventTarget();
        c.uuid = CHR; c.value = null; c.on = false;
        c.fire = (bytes) => {
          c.value = new DataView(Uint8Array.from(bytes).buffer);
          if (c.dispatchEvent) c.dispatchEvent(new Event('characteristicvaluechanged'));
          else if (c.oncharacteristicvaluechanged) c.oncharacteristicvaluechanged({ target: c });
        };
        if (!o.noRead) c.readValue = () => op('read', async () => {
          if (o.readDelay && !dev.reads) await wait(o.readDelay);   // a person confirming a pairing prompt
          dev.reads++;
          if (o.readFail && dev.reads <= o.readFail) throw err('NetworkError', 'GATT operation failed for unknown reason.');
          c.fire([]); return c.value;
        });
        c.startNotifications = () => op('notify', () => {
          if (o.notifyFail) throw err(o.notifyFailName || 'NetworkError', o.notifyFail);
          dev.subs++; c.on = true; return c;
        });
        const rec = (b) => Array.from(new Uint8Array(b.buffer ? b.buffer.slice(b.byteOffset || 0, (b.byteOffset || 0) + b.byteLength) : b));
        if (!o.noWoR) c.writeValueWithoutResponse = (b) => op('wor', () => { dev.written.push(rec(b)); });
        c.writeValue = (b) => op('write', () => { dev.written.push(rec(b)); dev.wv = (dev.wv || 0) + 1; });
        return c;
      };
      const gatt = { device: dev, connected: false };
      gatt.connect = () => op('connect', async () => {
        if (o.connectFail) throw err(o.connectFailName || 'NetworkError', o.connectFail);
        if (o.away) { await wait(o.away); throw err('NetworkError', 'Connection failed for unknown reason.'); }
        if (o.hang) await new Promise(() => {});
        if (o.connDelay) await wait(o.connDelay);
        gatt.connected = true; dev.links++; dev.chr = mkChr(); dev.linkAt = performance.now();
        if (o.dropAfter) setTimeout(() => dev.drop(), o.dropAfter);
        return gatt;
      });
      gatt.getPrimaryService = (u) => op('svc', () => {
        if (!gatt.connected) throw err('NetworkError', 'GATT Server is disconnected. Cannot retrieve services.');
        if (o.noSvc) throw err('NotFoundError', 'No Services matching UUID ' + u + ' found in Device.');
        return { uuid: u, getCharacteristic: (cu) => op('chr', () => dev.chr) };
      });
      gatt.disconnect = () => { const was = gatt.connected; gatt.connected = false; dev.log.push('disconnect'); dev.t.push(performance.now()); if (dev.chr) dev.chr.on = false; if (was) dev.dispatchEvent(new Event('gattserverdisconnected')); };
      dev.gatt = gatt;
      dev.drop = () => { if (!gatt.connected) return; gatt.connected = false; if (dev.chr) dev.chr.on = false; dev.dispatchEvent(new Event('gattserverdisconnected')); };
      dev.send = (bytes) => { if (gatt.connected && dev.chr && dev.chr.on) { dev.chr.fire(bytes); return true; } return false; };
      if (!o.noForget) dev.forget = () => { dev.forgotten = true; return Promise.resolve(); };
      return dev;
    }
    T.mkDev = mkDev;
    T.dev = (id = 'dev1') => T.devs.get(id);
    const bt = new EventTarget();
    if (!C.noAvail) bt.getAvailability = () => Promise.resolve(C.avail !== false);
    bt.requestDevice = (opts) => {
      T.reqs.push({ opts: JSON.parse(JSON.stringify(opts || {})), active: navigator.userActivation ? navigator.userActivation.isActive : null, at: performance.now() });
      const r = T.next || C.pick || {}; T.next = null;
      if (r.reject) return new Promise((_, rej) => setTimeout(() => rej(err(r.reject[0], r.reject[1])), r.after || 0));
      if (r.typeErrorOnPrefix && opts && opts.filters && opts.filters.some((f) => f.namePrefix)) { T.next = r; return Promise.reject(new TypeError("Failed to execute 'requestDevice': unknown filter key")); }
      const id = r.id || 'dev1';
      let d = T.devs.get(id);
      if (!d) T.devs.set(id, (d = mkDev(id, r.name || 'microKEY Air-25', r.o || {})));
      return new Promise((res) => setTimeout(() => res(d), 20));
    };
    if (C.getDevices) bt.getDevices = () => Promise.resolve(C.getDevices.map(([id, name]) => { let d = T.devs.get(id); if (!d) T.devs.set(id, (d = mkDev(id, name, {}))); return d; }));
    Object.defineProperty(navigator, 'bluetooth', { value: bt, configurable: true });
  }, Object.assign({}, opts.cfg || {}, { bt: opts.bt, storage: opts.storage, viewer: opts.viewer, noMidi: opts.noMidi }));
  await page.goto(opts.url || BASE);
  await page.waitForFunction(() => !!window.__M);
  if (opts.start !== false) { await page.click('#btnStart'); await page.waitForTimeout(400); }
  return { page, errors, ctx };
}
// the Gerät panel open (openPanel toggles, so only when another or none is open)
const showDev = (page) => page.evaluate(() => { if (window.__M.UI.panel !== 'dev') window.__M.openPanel('dev'); });
// pick a device in the next chooser, tap the Bluetooth button in the Gerät panel, wait for the link
async function pair(page, pick = {}, wait = true) {
  await page.evaluate((p) => { window.__bt.next = p; }, pick);
  await showDev(page);
  await page.click('[data-ble="ask"]');
  if (wait) await page.waitForFunction((id) => { const B = [...window.__M.BLE.devs.values()].find((b) => b.id === id); return B && B.state === 'on'; }, pick.id || 'dev1', { timeout: 5000 });
}
const summary = () => { console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); };
module.exports = { open, ok, close, pair, showDev, BASE, UA, summary };
