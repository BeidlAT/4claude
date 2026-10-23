// The installed app's update check (index.html updBoot, pwa/sw.js, pwa/build.py) with a real service worker:
// version A is built by build.py and installed, then the server swaps in version B (the same app with one more
// CHANGELOG entry) and the page reloads – as a phone opening the app after a release.
//   node t-pwa-update.js            (own static server on PORT=8791; builds into ./out/; screenshots ./out/upd-*.png)
// Cases: the card with B's notes only · nothing lies over it (toasts wait) · „Später“ keeps A · „Jetzt aktualisieren“
// ends on B with „Neu in dieser Version“ once · Klang starten with the card open never reloads · offline and a slow
// server never hold up the start screen · a version still loading shows the card's loading state · an installed old
// version from before the card (LEGACY_REF, default 0a3b1b2) still takes the new one over.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const REPO = '/home/user/4claude', OUT = path.join(__dirname, 'out'), PORT = +(process.env.PORT || 8791);
const LEGACY = process.env.LEGACY_REF || '0a3b1b2';
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- builds: A = the repo as it is, B = A plus a test entry, OLD = the published app before the card ----
fs.mkdirSync(OUT, { recursive: true });
const build = (src, dst) => execSync(`python3 ${src}/pwa/build.py ${dst}`, { stdio: 'pipe' }).toString();
const verOf = (dir) => /const VERSION = "([0-9a-f]+)"/.exec(fs.readFileSync(path.join(dir, 'sw.js'), 'utf8'))[1];
build(path.join(REPO, 'myzel'), path.join(OUT, 'A'));
fs.rmSync(path.join(OUT, 'srcB'), { recursive: true, force: true });
fs.cpSync(path.join(REPO, 'myzel'), path.join(OUT, 'srcB'), { recursive: true });
const logB = JSON.parse(fs.readFileSync(path.join(OUT, 'srcB/CHANGELOG.json'), 'utf8'));
logB.versionen.unshift({ id: '2099-01-01', punkte: ['Testpunkt B eins', 'Testpunkt B zwei'] });
fs.writeFileSync(path.join(OUT, 'srcB/CHANGELOG.json'), JSON.stringify(logB, null, 2));
build(path.join(OUT, 'srcB'), path.join(OUT, 'B'));
// A0: an older version that knows only the oldest entry – B then shows all the others (the long card)
fs.rmSync(path.join(OUT, 'srcA0'), { recursive: true, force: true });
fs.cpSync(path.join(REPO, 'myzel'), path.join(OUT, 'srcA0'), { recursive: true });
const logA0 = JSON.parse(fs.readFileSync(path.join(OUT, 'srcA0/CHANGELOG.json'), 'utf8'));
logA0.versionen = logA0.versionen.slice(-1);
fs.writeFileSync(path.join(OUT, 'srcA0/CHANGELOG.json'), JSON.stringify(logA0, null, 2));
build(path.join(OUT, 'srcA0'), path.join(OUT, 'A0'));
fs.rmSync(path.join(OUT, 'srcOld'), { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'srcOld'));
execSync(`git -C ${REPO} archive ${LEGACY} myzel | tar -x -C ${path.join(OUT, 'srcOld')}`);
build(path.join(OUT, 'srcOld/myzel'), path.join(OUT, 'OLD'));
const VA = verOf(path.join(OUT, 'A')), VB = verOf(path.join(OUT, 'B'));
const topA = JSON.parse(fs.readFileSync(path.join(REPO, 'myzel/CHANGELOG.json'), 'utf8')).versionen[0];
console.log('INFO versions A', VA, 'B', VB, 'old', verOf(path.join(OUT, 'OLD')));

// ---- the server: /app/ → the current root; offline drops every connection, slow delays sw.js and/or the rest ----
const SRV = { root: 'A', offline: false, slowSw: 0, slowRest: 0 };
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };
const server = http.createServer(async (req, res) => {
  if (SRV.offline) { req.socket.destroy(); return; }
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (!p.startsWith('/app/')) { res.writeHead(404); res.end(); return; }
  p = p.slice(5) || 'index.html';
  const d = p === 'sw.js' ? SRV.slowSw : SRV.slowRest;
  if (d) await sleep(d);
  const f = path.join(OUT, SRV.root, p);
  if (!f.startsWith(path.join(OUT, SRV.root)) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'max-age=600' });   // like GitHub Pages
  res.end(fs.readFileSync(f));
});
const URL0 = `http://127.0.0.1:${PORT}/app/`;

(async () => {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const errors = [];
  async function fresh(vp = { width: 360, height: 740 }) {
    const ctx = await b.newContext({ viewport: vp, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    return { ctx, page };
  }
  async function install(page, root) {
    Object.assign(SRV, { root, offline: false, slowSw: 0, slowRest: 0 });
    await page.goto(URL0);
    await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 20000 });
    await page.waitForFunction(async () => { const r = await navigator.serviceWorker.getRegistration(); return r && r.active && r.active.state === 'activated'; }, null, { timeout: 20000 });
  }
  const ver = (page) => page.evaluate(() => (window.MYZEL_BUILD ? window.MYZEL_BUILD.version : 'old'));
  const card = (page) => page.evaluate(() => { const u = document.getElementById('upd'); return u && !u.hidden ? { t: document.getElementById('updTitle').textContent, n: document.getElementById('updNotes').textContent, go: !document.getElementById('updGo').hidden } : null; });
  const waitCard = (page, title, ms = 20000) => page.waitForFunction((t) => { const u = document.getElementById('upd'); return u && !u.hidden && document.getElementById('updTitle').textContent === t; }, title, { timeout: ms }).then(() => true, () => false);

  // 1 – A installed, B published: the card, nothing over it, Später, Jetzt aktualisieren, Neu in dieser Version
  {
    const { ctx, page } = await fresh();
    await install(page, 'A');
    ok(await ver(page) === VA, 'A installed (version ' + VA + ')');
    await page.reload(); await sleep(1500);
    ok(!(await card(page)), 'A again, nothing new: no card (a fresh install shows no notes either)');
    SRV.root = 'B';
    await page.reload();
    ok(await waitCard(page, 'Neue Version verfügbar'), 'B published: „Neue Version verfügbar“ on the start screen');
    const c = await card(page);
    ok(c && /Testpunkt B eins/.test(c.n) && /Testpunkt B zwei/.test(c.n) && /1\.1\.2099/.test(c.n), 'the card shows B\'s notes: ' + (c && c.n.slice(0, 80)));
    ok(c && !c.n.includes(topA.punkte[0].slice(0, 30)), 'and only those A lacks');
    ok(await ver(page) === VA, 'the page is still A while the card is open');
    // a start-up toast while the card is open waits; nothing covers the card
    await page.evaluate(() => window.dispatchEvent(new Event('appinstalled')));
    await sleep(400);
    const lay = await page.evaluate(() => {
      const u = document.getElementById('upd'), r = u.getBoundingClientRect(), pts = [];
      for (const fx of [0.05, 0.5, 0.95]) for (const fy of [0.05, 0.5, 0.95]) { const el = document.elementFromPoint(r.left + r.width * fx, r.top + r.height * fy); pts.push(!!el && u.contains(el)); }
      return { pts, top: r.top, bottom: r.bottom, left: r.left, right: r.right, vw: innerWidth, vh: innerHeight, toast: document.getElementById('toast').classList.contains('show'), sw: document.documentElement.scrollWidth };
    });
    ok(lay.pts.every(Boolean), 'nothing lies over the card (9 points hit it)');
    ok(!lay.toast, 'a toast during the card waits');
    ok(lay.top >= 0 && lay.bottom <= lay.vh && lay.left >= 0 && lay.right <= lay.vw && lay.sw <= lay.vw, `360 px: the card fits the screen (${Math.round(lay.left)}–${Math.round(lay.right)} × ${Math.round(lay.top)}–${Math.round(lay.bottom)}), no side scroll`);
    await page.screenshot({ path: path.join(OUT, 'upd-360.png') });
    await page.click('#updLater');
    await sleep(300);
    ok(!(await card(page)), '„Später“ closes the card');
    ok(await page.evaluate(() => document.getElementById('toast').classList.contains('show') || new Promise((r) => setTimeout(() => r(document.getElementById('toast').classList.contains('show')), 900))), 'the waiting toast shows after the card');
    ok(await ver(page) === VA && await page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration()).waiting), '„Später“ keeps A (B waits)');
    await page.reload();
    ok(await waitCard(page, 'Neue Version verfügbar', 5000), 'the next start offers it again');
    await Promise.all([page.waitForNavigation({ timeout: 15000 }), page.click('#updGo')]);
    await page.waitForFunction(() => !!window.MYZEL_BUILD, null, { timeout: 10000 });
    ok(await ver(page) === VB, '„Jetzt aktualisieren“ ends on B');
    ok(await waitCard(page, 'Neu in dieser Version', 3000), '„Neu in dieser Version“ after the update');
    const n = await card(page);
    ok(n && /Testpunkt B eins/.test(n.n) && !n.n.includes(topA.punkte[0].slice(0, 30)) && !n.go, 'with B\'s new notes only, and just „OK“');
    await page.screenshot({ path: path.join(OUT, 'upd-neu-360.png') });
    await page.click('#updLater');
    await page.reload(); await sleep(2000);
    ok(!(await card(page)) && await ver(page) === VB, 'once: the next start is plain B');
    await page.click('#btnStart');
    await page.waitForFunction(() => document.getElementById('start').hidden, null, { timeout: 5000 }).then(() => ok(true, 'B starts its sound'), () => ok(false, 'B starts its sound'));
    await ctx.close();
  }

  // 2 – „Klang starten“ while the card is open: the card counts as Später, nothing reloads while sound plays
  {
    const { ctx, page } = await fresh();
    await install(page, 'A');
    SRV.root = 'B';
    await page.reload();
    ok(await waitCard(page, 'Neue Version verfügbar'), 'card again (second phone)');
    await page.evaluate(() => { window.__mark = 1; });
    await page.click('#btnStart');
    await sleep(500);
    ok(await page.evaluate(() => document.getElementById('start').hidden && document.getElementById('upd').hidden), 'Klang starten with the card open: the instrument starts, the card is gone');
    // another tab takes the update over while this one plays: this one must not reload
    const p2 = await ctx.newPage();
    await p2.goto(URL0);
    await p2.waitForFunction(() => { const u = document.getElementById('upd'); return u && !u.hidden && !document.getElementById('updGo').hidden; }, null, { timeout: 15000 });
    await Promise.all([p2.waitForNavigation({ timeout: 15000 }), p2.click('#updGo')]);
    await sleep(5000);
    ok(await page.evaluate(() => window.__mark === 1) && await ver(page) === VA, 'sound playing: no reload, not even when another window updates');
    await ctx.close();
  }

  // 3 – offline: the start screen at once, no card, no errors
  {
    const { ctx, page } = await fresh();
    await install(page, 'A');
    Object.assign(SRV, { root: 'B', offline: true });
    const t0 = Date.now();
    await page.reload();
    await page.waitForSelector('#btnStart', { state: 'visible', timeout: 5000 });
    await page.click('#btnStart', { timeout: 3000 });
    await page.waitForFunction(() => document.getElementById('start').hidden, null, { timeout: 3000 }).then(() => ok(Date.now() - t0 < 3000, `offline: the instrument starts at once (${Date.now() - t0} ms after reload)`), () => ok(false, 'offline: the instrument starts'));
    await sleep(3500);
    ok(await ver(page) === VA && !(await card(page)), 'offline: A, no card');
    await ctx.close();
  }

  // 4 – a slow server (sw.js after 9 s): nothing waits for it; the version found after the start comes next time
  {
    const { ctx, page } = await fresh();
    await install(page, 'A');
    Object.assign(SRV, { root: 'B', slowSw: 9000 });
    await page.reload();
    await page.evaluate(() => { window.__mark = 2; });
    await sleep(800);
    ok(!(await card(page)), 'slow: no card yet, the start screen is free');
    const t0 = Date.now();
    await page.click('#btnStart');
    await page.waitForFunction(() => document.getElementById('start').hidden, null, { timeout: 3000 }).then(() => ok(Date.now() - t0 < 1500, `slow: Klang starten works at once (${Date.now() - t0} ms)`), () => ok(false, 'slow: Klang starten works'));
    const said = await page.waitForFunction(() => /Neue Version bereit/.test(document.getElementById('toastMsg').textContent), null, { timeout: 30000 }).then(() => true, () => false);
    ok(said, 'found after the start: a quiet toast „Neue Version bereit – sie kommt beim nächsten Start.“');
    ok(await page.evaluate(() => window.__mark === 2) && await ver(page) === VA, 'slow: no reload while playing');
    SRV.slowSw = 0;
    const t1 = Date.now();
    await page.reload();
    ok(await waitCard(page, 'Neue Version verfügbar', 4000), `next start: the card at once (${Date.now() - t1} ms)`);
    await ctx.close();
  }

  // 5 – a version still loading (its files slow): the card's loading state, then the offer – from A0, so the card
  //     carries every entry since (the long card at 360 px: it fits, its notes scroll inside)
  {
    const { ctx, page } = await fresh();
    await install(page, 'A0');
    Object.assign(SRV, { root: 'B', slowRest: 2500 });
    await page.reload();
    ok(await waitCard(page, 'Neue Version wird geladen …', 8000), 'loading: „Neue Version wird geladen …“ (only „Später“)');
    const c = await card(page);
    ok(c && !c.go, 'loading: no „Jetzt aktualisieren“ yet');
    ok(await waitCard(page, 'Neue Version verfügbar', 30000), 'loading: then „Neue Version verfügbar“');
    const lay = await page.evaluate(() => { const u = document.getElementById('upd').getBoundingClientRect(), n = document.getElementById('updNotes'), g = document.getElementById('updGo').getBoundingClientRect(); return { top: u.top, bottom: u.bottom, vh: innerHeight, sh: n.scrollHeight, ch: n.clientHeight, go: g.bottom, dates: (n.textContent.match(/\d+\.\d+\.20\d\d/g) || []).length }; });
    ok(lay.dates === logB.versionen.length - 1, `long card: every entry A0 lacks (${lay.dates})`);
    ok(lay.top >= 0 && lay.bottom <= lay.vh && lay.go <= lay.vh, `long card: fits the 360 × 740 screen with its buttons (${Math.round(lay.top)}–${Math.round(lay.bottom)}), notes scroll inside (${lay.sh} in ${lay.ch})`);
    await page.screenshot({ path: path.join(OUT, 'upd-long-360.png') });
    SRV.slowRest = 0;
    await ctx.close();
  }

  // 6 – the installed app from before the card (LEGACY_REF) still updates: the new worker takes over at once as before
  {
    const { ctx, page } = await fresh();
    await install(page, 'OLD');
    await page.reload(); await sleep(1000);
    SRV.root = 'B';
    await page.reload();
    const t = await page.waitForFunction(() => /neue Version von Myzel/.test(document.getElementById('toastMsg').textContent), null, { timeout: 30000 }).then(() => true, () => false);
    ok(t, 'old version open: the new one installs and the old page offers „Neu laden“ (as it always did)');
    await page.reload();
    await page.waitForFunction(() => !!window.MYZEL_BUILD, null, { timeout: 10000 }).catch(() => {});
    ok(await ver(page) === VB, 'old → new: the next start is the new version');
    ok(await waitCard(page, 'Neu in dieser Version', 3000), 'old → new: „Neu in dieser Version“ shows its newest notes');
    await ctx.close();
  }

  ok(!errors.length, 'no page errors ' + errors.slice(0, 4).join(' | '));
  await b.close();
  server.close();
})().catch((e) => { console.log('FAIL ' + e.stack); process.exitCode = 1; server.close(); process.exit(1); });
