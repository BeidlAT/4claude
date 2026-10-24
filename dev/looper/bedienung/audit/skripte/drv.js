// interactive driver: POST js to :8791, evaluated in node with `page`, `ctx`, `shot(name)`, `dump()`
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const http = require('http');
const OUT = process.env.OUT || __dirname + '/shots';
require('fs').mkdirSync(OUT, { recursive: true });
let browser, ctx, page, logs = [];
// output tap: every connection to the destination also goes to an analyser (observation only)
const TAP = () => {
  if (window.top !== window) return;
  const AC0 = window.AudioContext;
  const orig = AudioNode.prototype.connect;
  class AC extends AC0 { constructor(o) { super(o); if (window.__ac) return; const c = this; window.__ac = c;
    const an = c.createAnalyser(); an.fftSize = 2048; window.__an = an; window.__rmsLog = [];
    AudioNode.prototype.connect = function (d, ...r) { const x = orig.call(this, d, ...r); if (d === c.destination) { try { orig.call(this, an); } catch (e) {} } return x; };
    setInterval(() => { const b = new Float32Array(an.fftSize); an.getFloatTimeDomainData(b); let s = 0, p = 0; for (const v of b) { s += v * v; p = Math.max(p, Math.abs(v)); } const F = new Float32Array(an.frequencyBinCount); an.getFloatFrequencyData(F); let num = 0, den = 0; for (let i = 1; i < F.length; i++) { const m = Math.pow(10, F[i] / 20); num += m * i; den += m; } window.__rmsLog.push([c.currentTime, Math.sqrt(s / b.length), p, den ? num / den * c.sampleRate / an.fftSize : 0]); if (window.__rmsLog.length > 40000) window.__rmsLog.shift(); }, 25);
  } }
  window.AudioContext = AC;
};

async function open(kind) {
  if (browser) await browser.close();
  browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  const phone = kind === 'phone';
  ctx = await browser.newContext(phone ? { viewport: { width: 412, height: 915 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (Linux; Android 14; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36' } : { viewport: { width: 1280, height: 800 } });
  page = await ctx.newPage(); logs = [];
  page.on('pageerror', (e) => logs.push('ERR ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') logs.push(m.type() + ' ' + m.text()); });
  await page.addInitScript(TAP);
  await page.goto('http://127.0.0.1:8790/bed/index.html');
  await page.waitForTimeout(1500);
  return 'opened ' + kind;
}
async function shot(name, o = {}) { await page.screenshot({ path: OUT + '/' + name + '.png', ...o }); return name; }
async function rms(ms) { const t = await page.evaluate(() => window.__ac ? window.__ac.currentTime : 0); await page.waitForTimeout(ms); return page.evaluate((t) => { const l = (window.__rmsLog || []).filter((x) => x[0] >= t); if (!l.length) return null; const r = l.map((x) => x[1]); return { n: l.length, mean: +(r.reduce((a, b) => a + b, 0) / r.length).toFixed(4), max: +Math.max(...r).toFixed(4), min: +Math.min(...r).toFixed(4), peak: +Math.max(...l.map((x) => x[2])).toFixed(3), cent: Math.round(l.filter((x) => x[1] > 0.002).reduce((a, x) => a + x[3], 0) / Math.max(1, l.filter((x) => x[1] > 0.002).length)) }; }, t); }
// visible text of interactive elements
async function dump(sel = 'body') { return page.evaluate((sel) => { const out = []; for (const e of document.querySelectorAll(sel + ' button, ' + sel + ' [role=button], ' + sel + ' select, ' + sel + ' input')) { const r = e.getBoundingClientRect(); if (!r.width || !r.height || e.closest('[hidden]')) continue; if (r.bottom < 0 || r.top > innerHeight) continue; out.push([Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height), (e.id ? '#' + e.id + ' ' : '') + (e.textContent || e.value || '').trim().slice(0, 40).replace(/\s+/g, ' '), e.getAttribute('aria-label') || ''].join(' | ')); } return out.join('\n'); }, sel); }
async function txt(sel) { return page.evaluate((sel) => { const e = document.querySelector(sel); return e ? e.innerText : null; }, sel); }
async function tap(sel, o = {}) { const el = typeof sel === 'string' ? page.locator(sel).first() : sel; await el.scrollIntoViewIfNeeded({ timeout: 2000 }).catch(() => {}); const b = await el.boundingBox(); if (!b) return 'nobox ' + sel; const x = b.x + b.width / 2, y = b.y + b.height / 2; if (o.hold) { await page.mouse.move(x, y); await page.mouse.down(); await page.waitForTimeout(o.hold); await page.mouse.up(); return 'held ' + sel; } if (page.context()._options && false) {} await el.tap ? 0 : 0; try { if (o.mouse) await page.mouse.click(x, y); else await page.touchscreen.tap(x, y); } catch (e) { await page.mouse.click(x, y); } return 'tapped ' + sel + ' @' + Math.round(x) + ',' + Math.round(y); }
// play notes on the field by touching it: pts = [[xFrac, yFrac, holdMs, gapMs], …]
async function playField(pts) { const st = await page.locator('#stage').boundingBox(); for (const [fx, fy, hold, gap] of pts) { const x = st.x + fx * st.width, y = st.y + fy * st.height; await page.mouse.move(x, y); await page.mouse.down(); await page.waitForTimeout(hold); await page.mouse.up(); if (gap) await page.waitForTimeout(gap); } return 'played ' + pts.length; }
async function watch() { return page.evaluate(() => { window.__said = []; const add = (k) => () => { const e = document.querySelector(k); const t = e && e.textContent.trim(); if (t) window.__said.push((k === '#toastMsg' ? 'TOAST ' : 'SAY ') + t); }; for (const k of ['#hxLive', '#toastMsg']) { const e = document.querySelector(k); if (e) new MutationObserver(add(k)).observe(e, { childList: true, characterData: true, subtree: true }); } return 'watching'; }); }
async function said() { return page.evaluate(() => (window.__said || []).splice(0)); }
async function rail() { return page.evaluate(() => { const r = document.querySelector('#hxRail'); if (!r || r.hidden) return 'rail hidden'; const out = []; for (const b of r.querySelectorAll('button')) { if (b.hidden || !b.offsetParent) continue; out.push((b.id || b.className.replace('hxb ', '')) + '[' + b.textContent.trim() + ']' + (b.getAttribute('aria-label') ? '{' + b.getAttribute('aria-label') + '}' : '')); } return out.join('  '); }); }
async function btn(text, scope = 'body', o = {}) { const esc = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); const loc = page.locator(scope + ' button:visible, ' + scope + ' [role=button]:visible').filter({ hasText: new RegExp('^\\s*' + esc + '\\s*$') }); const n = await loc.count(); if (!n) return 'NO BUTTON ' + text; const el = loc.nth(o.nth || 0); await el.scrollIntoViewIfNeeded().catch(() => {}); return tap(el, { mouse: o.touch ? 0 : 1, hold: o.hold }); }
// a chip in the card row labelled lab (card of slot i)
async function rowBtn(lab, text, i = 0, o = {}) { const r = page.locator('#hxc-' + i + ' .hx-row').filter({ has: page.locator('.lab', { hasText: new RegExp('^' + lab + '$') }) }).first(); if (!await r.count()) return 'NO ROW ' + lab; const esc = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); const b = r.locator('button').filter({ hasText: new RegExp('^\\s*' + esc + '\\s*$') }).first(); if (!await b.count()) return 'NO BTN ' + lab + '/' + text + ' in: ' + (await r.innerText()).replace(/\n/g, ' | '); await b.scrollIntoViewIfNeeded().catch(() => {}); return tap(b, { mouse: o.touch ? 0 : 1 }); }
async function rowTxt(lab, i = 0) { const r = page.locator('#hxc-' + i + ' .hx-row').filter({ has: page.locator('.lab', { hasText: new RegExp('^' + lab + '$') }) }).first(); if (!await r.count()) return null; return (await r.innerText()).replace(/\n/g, ' | ') + ' ‖on: ' + (await r.locator('[aria-pressed=true]').allInnerTexts()).join(','); }
async function cardTxt(i = 0) { return page.evaluate((i) => { const c = document.querySelector('#hxc-' + i); return c ? c.innerText.replace(/\n/g, ' | ') : null; }, i); }
// how alike consecutive passes are: the output's envelope (and centroid) on a 10-ms grid, pass k vs k+1 (len s)
async function passSim(len, passes = 4) { const t0 = await page.evaluate(() => window.__ac.currentTime); await page.waitForTimeout(len * passes * 1000 + 300); const l = await page.evaluate((t0) => window.__rmsLog.filter((x) => x[0] >= t0), t0); const step = 0.025, n = Math.floor(len / step); const grid = []; for (let k = 0; k < passes; k++) { const a = []; for (let j = 0; j < n; j++) { const t = t0 + k * len + j * step; let best = null, bd = 1; for (const x of l) { const d = Math.abs(x[0] - t); if (d < bd) { bd = d; best = x; } } a.push(best ? best[1] : 0); } grid.push(a); } const corr = (a, b) => { const ma = a.reduce((s, v) => s + v, 0) / a.length, mb = b.reduce((s, v) => s + v, 0) / b.length; let sab = 0, saa = 0, sbb = 0; for (let i = 0; i < a.length; i++) { sab += (a[i] - ma) * (b[i] - mb); saa += (a[i] - ma) ** 2; sbb += (b[i] - mb) ** 2; } return +(sab / Math.sqrt(saa * sbb + 1e-12)).toFixed(3); }; const diff = (a, b) => +(a.reduce((s, v, i) => s + Math.abs(v - b[i]), 0) / a.reduce((s, v) => s + v, 1e-9)).toFixed(3); const out = []; for (let k = 0; k + 1 < passes; k++) out.push({ corr: corr(grid[k], grid[k + 1]), diff: diff(grid[k], grid[k + 1]) }); return out; }
const S = { open, passSim, rowBtn, rowTxt, cardTxt, btn, watch, said, rail, shot, rms, dump, txt, tap, playField, get page() { return page; }, get logs() { return logs; } };
http.createServer((q, s) => { let b = ''; q.on('data', (d) => (b += d)); q.on('end', async () => { let r; try { const fn = new Function('S', 'return (async () => { const page = S.page; const logs = S.logs; ' + b + '})()'); r = await fn(S); } catch (e) { r = 'EXC ' + e.stack; } s.end(typeof r === 'string' ? r : JSON.stringify(r, null, 1)); }); }).listen(8791, () => console.log('drv up'));
