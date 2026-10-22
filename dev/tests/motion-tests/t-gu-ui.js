// Part 7 (UI and texts): the Gestik card in the order of play, the Lebenszeichen with its word, the hint lines, the
// Wasserwaage for keyboard and screen reader, the card's Zuweisen button (its Fährte button retired), 44 px targets on touch screens,
// no sideways scrolling at 360 px, the live region, the tile's words per platform, the start screen and the
// Spielhilfe, iPhone (no vibration: no Haptik; Zuordnungen with Gestik), a computer without sensor, the claude.ai view,
// the iPad's larger Wasserwaage, reduced motion.   node t-gu-ui.js   (slot gu: sh ../v2/mk.sh /home/user/4claude/myzel gu)
const H = require('./gk-h');
const { ok } = H;
const URL = process.env.GU || 'http://127.0.0.1:8790/gu-inst/index.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const DROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36';
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const IPAD = 'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const phone = (w = 390, hgt = 844, ua = DROID) => ({ width: w, height: hgt, touch: true, mobile: true, dsf: 1, ua });
// the card's parts in document order: which comes before which
const ORDER = ['.gk-life', '.gk-main', '[aria-label="Neigen formt"]', '.gk-pair [data-kc$=":lad"]', '.gk-pair [data-kc$=":slp"]', '.gk-btns', '[aria-label="Weite"]', '[aria-label="Wann Gestik wirkt"]', '[data-kc$=":rez"]', '.gk-zw', '.gk-fs', '.gk-mehr > details:last-of-type'];   // (since the fix phase: Weite … Hinweise under the fold „Mehr“)
// every visible control of an element at least 44 × 44 px (text buttons may be wider, never lower)
const small = (sel) => [...document.querySelector(sel).querySelectorAll('button, [role=radio], [role=switch], summary, a, canvas, input')].filter((e) => e.offsetParent && e.getClientRects().length)
  .map((e) => { const r = e.getBoundingClientRect(); return { t: (e.getAttribute('aria-label') || e.textContent || e.tagName).trim().slice(0, 30), w: Math.round(r.width), h: Math.round(r.height), tag: e.tagName }; })
  .filter((r) => r.h < 44 || (r.w < 44 && r.tag !== 'INPUT'));
(async () => {
  // ---------- 1. Android phone, 390 px: start screen, Spielhilfe, tile, the card ----------
  {
    const { page, errors } = await H.open({ url: URL, vp: phone(), cfg: { perm: 'granted' }, start: false });
    const sl = await page.evaluate(() => document.getElementById('startGkLine').textContent);
    ok(/^Neigen, schütteln, umdrehen – das Handy formt den Klang mit$/.test(sl), 'start screen (phone): „' + sl + '“');
    await page.click('#btnStart'); await page.waitForFunction(() => window.__M.A.started);
    await page.evaluate(() => window.__M.openPanel('presets')); await sleep(300);
    const sh = await page.evaluate(() => [...document.querySelectorAll('.help li')].map((l) => l.textContent).find((t) => /^Gestik:/.test(t)) || '');
    ok(/Neigen lehnt/.test(sh) && /Schütteln lädt/.test(sh) && /Umdrehen/.test(sh) && /Bewegung als Schleife/.test(sh) && /Sporenregen/.test(sh) && /Wasserwaage/.test(sh), 'Spielhilfe has a Gestik line naming the functions and the way without a sensor');
    await page.evaluate(() => window.__M.openPanel('dev')); await sleep(250);
    const tile = await page.evaluate(() => { const b = document.querySelector('[data-gk="on"]'); return { sub: b.dataset.sub, vis: !b.hidden, ico: document.getElementById('btnGk').hidden }; });
    ok(tile.vis && tile.sub === 'Neigen, schütteln, umdrehen' && tile.ico, 'tile: „Gestik einschalten · ' + tile.sub + '“, the bar\'s spore still hidden');
    await H.gestikOn(page);
    await page.evaluate(() => window.__sensor(true, { beta: 45, roll: 0 }, 3));
    await sleep(1300);
    const c = await page.evaluate((ORDER) => {
      const C = document.querySelector('.gk-card'), all = [...C.querySelectorAll('*')];
      const idx = ORDER.map((s) => all.indexOf(C.querySelector(s)));
      const ico = document.getElementById('btnGk');
      return { idx, stat: C.querySelector('.gk-stat').textContent, mode: C.querySelector('.gk-mode').textContent, hap: !!C.querySelector('[data-kc$=":hap"]'), halt: !!C.querySelector('[data-kc$=":halt"]'),
        subs: [...C.querySelectorAll(':scope > .kc-sub, :scope > .gk-mehr > .kc-sub')].map((x) => x.textContent), help: C.querySelector('.gk-mehr > details:last-of-type').textContent, ico: !ico.hidden && /^Gestik: /.test(ico.getAttribute('aria-label')),
        ww: C.querySelector('.gk-ww').getAttribute('aria-describedby'), wwd: document.getElementById('gk-ww-d') && document.getElementById('gk-ww-d').textContent, sub: document.querySelector('[data-gk="on"]').dataset.sub };
    }, ORDER);
    ok(c.idx.every((v, i) => v >= 0 && (i === 0 || v > c.idx[i - 1])), 'the card in the order of play: Lebenszeichen, Wasserwaage, Neigen formt, Ladung, Schlafen, buttons, Weite, Wann, Rezepte, Zuweisen, Funkstrecke, Hinweise (' + c.idx.join(' < ') + ')');
    ok(/^\d+ Hz · ±\d+ ms$/.test(c.stat) && c.mode === 'wartet auf einen Ton', 'Lebenszeichen „' + c.stat + '“ · „' + c.mode + '“');
    ok(c.hap && c.halt, 'phone: Fingerhalt and Haptik (the browser can vibrate)');
    ok(c.subs.join('|') === 'schütteln und umdrehen|feinheiten', 'two quiet headings: ' + c.subs.join(', '));
    ok(/Systemgesten/.test(c.help) && /Handy-Sache/.test(c.help) && /Ohne Bewegung/.test(c.help), 'Hinweise: system gestures, honestly a phone thing, everything also without motion');
    ok(c.ico, 'the bar\'s spore shows, its label says what Gestik does');
    ok(c.ww === 'gk-ww-d' && /Keine Neigung|Neigung:/.test(c.wwd), 'Wasserwaage described for screen readers: „' + c.wwd + '“');
    ok(c.sub === 'Bewegung und Ausrichtung erlauben', 'tile while on (for a second permission tap): „' + c.sub + '“');
    // a note: the word says it acts; the tilt is described in degrees
    await page.evaluate(() => { const M = window.__M; M.onDown({ pointerId: 3, pointerType: 'touch', pt: { x: 0.4, y: 0.5, px: 0.4 * M.VIS.w, py: 0.5 * M.VIS.h } }); });
    await sleep(250);
    await page.evaluate(() => window.__setPose({ beta: 45, roll: 14 }));
    await sleep(700);
    const w = await page.evaluate(() => ({ mode: document.querySelector('.gk-mode').textContent, m: document.querySelector('.gk-mode').dataset.m, d: document.getElementById('gk-ww-d').textContent }));
    ok(w.mode === 'wirkt' && w.m === 'live' && /1[05]° nach rechts/.test(w.d) && /Gestik wirkt/.test(w.d), 'a note sounds: „' + w.mode + '“, „' + w.d + '“');
    await page.evaluate(() => window.__M.onUp({ pointerId: 3, pointerType: 'touch' }));
    await page.evaluate(() => window.__setPose({ beta: 45, roll: 0 }));
    // 44 px targets, every fold open
    await page.evaluate(() => { const C = window.__M.GK.card; for (const d of C.el.querySelectorAll('details')) d.open = true; window.__M.gkSet('ras', true); window.__M.gkCardSync(); });
    await sleep(300);
    const sm = await page.evaluate(small, '.gk-card');
    ok(!sm.length, 'touch: every control in the card is at least 44 px' + (sm.length ? ' – too small: ' + JSON.stringify(sm.slice(0, 6)) : ''));
    const tl = await page.evaluate(small, '.kc-go-row');
    ok(!tl.length, 'touch: the tiles are at least 44 px' + (tl.length ? JSON.stringify(tl) : ''));
    // the Fährte's buttons (card and bar) are retired – the Korb of the Hexenring takes Bewegung (t-hx-bew)
    const fs = await page.evaluate(() => ({ card: !!document.querySelector('.gk-fae-b'), bar: !!document.getElementById('btnFae'), line: (document.querySelector('.gk-fae') || {}).hidden }));
    ok(!fs.card && !fs.bar && fs.line !== false, 'the Fährte\'s buttons are gone from the card and the bar; its line shows only while a Schleife of Bewegung plays');
    // the card's Zuweisen button starts learn
    await page.click('.gk-zw .btn'); await sleep(150);
    const ln = await page.evaluate(() => window.__M.LEARN.on);
    await page.keyboard.press('Escape'); await sleep(100);
    const ln2 = await page.evaluate(() => window.__M.LEARN.on);
    ok(ln && !ln2, 'card\'s „Zuweisen“ starts learn, Escape ends it');
    // face down: the live region says Myzel sleeps, and wakes
    await page.evaluate(async () => { for (let b = 45; b <= 180; b += 9) { window.__setPose({ beta: b, roll: 0 }); await window.__sleep(50); } });
    await page.waitForFunction(() => window.__M.SLP.on, null, { timeout: 6000 }).catch(() => {});
    await sleep(300);
    const z = await page.evaluate(() => ({ say: window.__M.GK.sayEl && window.__M.GK.sayEl.textContent, live: window.__M.GK.sayEl && window.__M.GK.sayEl.getAttribute('aria-live'), mode: document.querySelector('.gk-mode').textContent }));
    ok(z.live === 'polite' && /^Myzel schläft/.test(z.say) && z.mode === 'schläft', 'face down: the live region says „' + z.say + '“, the word „' + z.mode + '“');
    await page.evaluate(async () => { for (let b = 180; b >= 45; b -= 9) { window.__setPose({ beta: b, roll: 0 }); await window.__sleep(50); } });
    await page.waitForFunction(() => !window.__M.SLP.on, null, { timeout: 6000 }).catch(() => {});
    await sleep(300);
    const z2 = await page.evaluate(() => window.__M.GK.sayEl.textContent);
    ok(z2 === 'Myzel ist wach', 'turned back: „' + z2 + '“');
    ok(!errors.length, 'phone: no page errors' + (errors.length ? ' ' + errors.slice(0, 3).join(' | ') : ''));
    await page.context().close();
  }
  // ---------- 2. 360 px: nothing scrolls sideways, every fold open ----------
  {
    const { page } = await H.open({ url: URL, vp: phone(360, 740), cfg: { perm: 'granted' } });
    await H.gestikOn(page);
    await page.evaluate(() => window.__sensor(true, { beta: 45, roll: 0 }, 3));
    await sleep(900);
    await page.evaluate(() => { const C = window.__M.GK.card; for (const d of C.el.querySelectorAll('details')) d.open = true; window.__M.gkSet('ras', true); window.__M.gkCardSync(); });
    await sleep(300);
    const o = await page.evaluate(() => { const b = document.getElementById('sheetBody'), C = document.querySelector('.gk-card'); return { b: b.scrollWidth - b.clientWidth, c: C.scrollWidth - C.clientWidth, ww: document.querySelector('.gk-ww').getBoundingClientRect().width, cw: C.getBoundingClientRect().width }; });
    ok(o.b <= 1 && o.c <= 1, '360 px: no sideways scrolling (sheet ' + o.b + ', card ' + o.c + ')');
    ok(o.ww >= 140, '360 px: Wasserwaage ' + o.ww + ' px in a ' + Math.round(o.cw) + ' px card');
    const hdr = await page.evaluate(() => { const b = document.querySelector('.bar'); return { over: b.scrollWidth - b.clientWidth, ico: document.getElementById('btnGk').getBoundingClientRect().width }; });
    ok(hdr.over <= 1 && hdr.ico >= 28, '360 px: the bar fits with the spore (' + JSON.stringify(hdr) + ')');
    await page.context().close();
  }
  // ---------- 2b. phone landscape: the page itself never scrolls (only the panel), whatever the card holds ----------
  {
    const { page } = await H.open({ url: URL, vp: phone(844, 390), cfg: { perm: 'granted' } });
    await H.gestikOn(page);
    await page.evaluate(() => window.__sensor(true, { beta: 45, roll: 0 }, 3));
    await sleep(900);
    const o = await page.evaluate(() => { const C = window.__M.GK.card; for (const d of C.el.querySelectorAll('details')) d.open = true; window.__M.gkCardSync(); C.ww = 0; C.el.querySelector('.gk-ww').scrollIntoView({ block: 'start' }); return { y: window.scrollY, over: document.scrollingElement.scrollHeight - innerHeight, sx: document.getElementById('sheetBody').scrollWidth - document.getElementById('sheetBody').clientWidth }; });
    ok(o.y === 0 && o.over <= 0 && o.sx <= 1, 'landscape: only the panel scrolls (' + JSON.stringify(o) + ')');
    await page.context().close();
  }
  // ---------- 3. iPhone: permission in the tap, no vibration → no Haptik; Zuordnungen with Gestik; refused ----------
  {
    const { page, errors } = await H.open({ url: URL, vp: phone(390, 844, IPHONE), cfg: { perm: 'gesture', noMidi: true, noBt: true, noVib: true } });
    await page.evaluate(() => window.__M.openPanel('dev')); await sleep(250);
    const t0 = await page.evaluate(() => ({ prim: document.querySelector('[data-gk="on"]').classList.contains('primary'), map: window.__M.getDevEls().mapSec.hidden }));
    ok(t0.prim && t0.map, 'iPhone: the tile is the first choice; no Zuordnungen yet');
    await H.gestikOn(page);
    await page.evaluate(() => window.__sensor(true, { beta: 45, roll: 0 }, 3));
    await sleep(1000);
    const t1 = await page.evaluate(() => ({ live: window.__M.GK.live, hap: !!document.querySelector('.gk-card [data-kc$=":hap"]'), halt: !!document.querySelector('.gk-card [data-kc$=":halt"]'), map: window.__M.getDevEls().mapSec.hidden, set: window.__M.getDevEls().setSec.hidden, nm: document.querySelector('.gk-card .kc-dn').textContent }));
    ok(t1.live && !t1.hap && t1.halt, 'iPhone: permission inside the tap, Gestik lives; no Haptik switch (no vibration), Fingerhalt there');
    ok(!t1.map && t1.set, 'iPhone with Gestik: the Zuordnungen appear (keyboard settings stay hidden)');
    ok(t1.nm === 'Gestik · dieses Handy', 'iPhone card: „' + t1.nm + '“');
    ok(!errors.length, 'iPhone: no page errors' + (errors.length ? ' ' + errors.slice(0, 3).join(' | ') : ''));
    await page.context().close();
  }
  {
    const { page } = await H.open({ url: URL, vp: phone(390, 844, IPHONE), cfg: { perm: 'denied', noMidi: true, noBt: true, noVib: true } });
    await H.gestikOn(page); await sleep(400);
    const d = await page.evaluate(() => ({ stat: document.querySelector('.gk-stat').textContent, warn: document.querySelector('.gk-life').classList.contains('warn'), hint: document.querySelector('.gk-hint').hidden ? '' : document.querySelector('.gk-hint').textContent, mode: document.querySelector('.gk-mode').textContent, say: window.__M.GK.sayEl && window.__M.GK.sayEl.textContent }));
    ok(/^Zugriff abgelehnt\. Android: .* iPhone\/iPad: Safari ganz schließen/.test(d.stat) && d.warn && !d.hint && !d.mode, 'refused: one line for Android and iPhone – „' + d.stat.slice(0, 60) + '…“ (no second, contradicting line)');
    ok(/^Gestik: Zugriff abgelehnt/.test(d.say || ''), 'refused while the panel shows: said in the live region');
    const sy = await page.evaluate(() => { window.__M.GK.card.el.scrollIntoView({ block: 'start' }); return { y: window.scrollY, over: document.scrollingElement.scrollHeight - window.innerHeight }; });
    ok(sy.y === 0 && sy.over <= 0, 'the live region never makes the page itself scrollable (' + JSON.stringify(sy) + ')');
    await page.context().close();
  }
  // ---------- 4. a computer without a sensor: the tile, the start line, the honest hint, dragging ----------
  {
    const { page, errors } = await H.open({ url: URL, vp: { width: 1280, height: 800 }, cfg: { perm: 'granted' }, start: false });
    const sl = await page.evaluate(() => document.getElementById('startGkLine').textContent);
    ok(/^Am Handy formen Neigen, Schütteln und Umdrehen den Klang mit – hier ziehst du die Wasserwaage/.test(sl), 'start screen (computer): „' + sl + '“');
    await page.click('#btnStart'); await page.waitForFunction(() => window.__M.A.started);
    await page.evaluate(() => window.__M.openPanel('dev')); await sleep(250);
    const sub = await page.evaluate(() => document.querySelector('[data-gk="on"]').dataset.sub);
    ok(/ohne Sensor die Wasserwaage ziehen/.test(sub), 'tile (computer): „' + sub + '“');
    await H.gestikOn(page); await sleep(1500);
    const n = await page.evaluate(() => ({ stat: document.querySelector('.gk-stat').textContent, hint: document.querySelector('.gk-hint').textContent, hidden: document.querySelector('.gk-hint').hidden, hap: !!document.querySelector('.gk-card [data-kc$=":hap"]'), halt: !!document.querySelector('.gk-card [data-kc$=":halt"]'), lock: [...document.querySelectorAll('.gk-btns .btn')].some((b) => /Vollbild/.test(b.textContent)) }));
    ok(/^Kein Bewegungssensor gefunden/.test(n.stat) && !n.hidden && /vor allem eine Handy-Sache/.test(n.hint) && /Funkstrecke/.test(n.hint), 'no sensor: „' + n.stat.slice(0, 32) + '…“ + honestly: „' + n.hint.slice(0, 50) + '…“');
    ok(!n.hap && !n.halt && !n.lock, 'computer: no Haptik, no Fingerhalt, no rotation lock');
    // the Wasserwaage with the mouse and the keyboard (clutch "Immer", so the tilt acts without a note)
    await page.evaluate(() => window.__M.gkSet('clutch', 'immer'));
    const cv = await page.$('.gk-ww'), r = await cv.boundingBox();
    await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2); await page.mouse.down();
    await page.mouse.move(r.x + r.width * 0.8, r.y + r.height / 2, { steps: 6 }); await sleep(150);
    const dr = await page.evaluate(() => ({ x: window.__M.GK.out.tiltX, mode: document.querySelector('.gk-mode').textContent }));
    await page.mouse.up();
    ok(dr.x > 0.4 && /^wirkt · von Hand$/.test(dr.mode), 'drag the spore: tilt ' + dr.x.toFixed(2) + ', „' + dr.mode + '“');
    await cv.focus();
    await page.evaluate(() => { window.__M.GK.virt = null; });
    for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowUp');
    await sleep(120);
    const kb = await page.evaluate(() => ({ v: window.__M.GK.virt, d: document.getElementById('gk-ww-d').textContent }));
    ok(kb.v && Math.abs(kb.v.x + 0.3) < 1e-6 && Math.abs(kb.v.y - 0.1) < 1e-6, 'arrow keys tilt by a tenth of the Weite (' + JSON.stringify(kb.v) + ')');
    await sleep(300);
    const kd = await page.evaluate(() => document.getElementById('gk-ww-d').textContent);
    ok(/10° nach links/.test(kd) && /von Hand/.test(kd), 'described: „' + kd + '“');
    await page.keyboard.press('0'); await sleep(100);
    const k0 = await page.evaluate(() => window.__M.GK.virt);
    ok(k0 === null, '0 on the Wasserwaage: back to level (no sensor)');
    ok(!errors.length, 'computer: no page errors' + (errors.length ? ' ' + errors.slice(0, 3).join(' | ') : ''));
    await page.context().close();
  }
  // ---------- 5. the claude.ai view: blocked, the link, what still works ----------
  {
    const { page } = await H.open({ url: URL, vp: phone(), cfg: { viewer: true }, start: false });
    const sl = await page.evaluate(() => { const g = document.getElementById('startGkLine'); return { t: g.textContent, a: g.querySelector('a') && g.querySelector('a').href }; });
    ok(/^Bewegung ist hier gesperrt/.test(sl.t) && sl.a === 'https://beidlat.github.io/4claude/', 'start screen (claude.ai view): „' + sl.t + '“');
    await page.click('#btnStart'); await page.waitForFunction(() => window.__M.A.started);
    await page.evaluate(() => window.__M.openPanel('dev')); await sleep(250);
    const sub = await page.evaluate(() => document.querySelector('[data-gk="on"]').dataset.sub);
    ok(/^Hier ohne Sensor/.test(sub), 'tile (claude.ai view): „' + sub + '“');
    await H.gestikOn(page); await sleep(1500);
    const v = await page.evaluate(() => ({ stat: document.querySelector('.gk-stat').textContent, a: !document.querySelector('.gk-card .kc-app').hidden && document.querySelector('.gk-card .kc-app a').href, hint: document.querySelector('.gk-hint').textContent }));
    ok(v.stat === 'In dieser Ansicht gesperrt – öffne Myzel als App:' && v.a === 'https://beidlat.github.io/4claude/', 'card: „' + v.stat + '“ + the link (the address once)');
    ok(/Wasserwaage, der Sporenregen und Schleifen aus Bewegung/.test(v.hint), 'and what still works: „' + v.hint + '“');
    await page.context().close();
  }
  // ---------- 6. iPad, portrait: a larger Wasserwaage in the wide card; the words of a tablet ----------
  {
    const { page } = await H.open({ url: URL, vp: { width: 820, height: 1180, touch: true, mobile: true, dsf: 1, ua: IPAD }, cfg: { perm: 'granted', noMidi: true, noBt: true, noVib: true }, start: false });
    const sl = await page.evaluate(() => document.getElementById('startGkLine').textContent);
    ok(/das iPad formt den Klang mit/.test(sl), 'start screen (iPad): „' + sl + '“');
    await page.click('#btnStart'); await page.waitForFunction(() => window.__M.A.started);
    await H.gestikOn(page);
    await page.evaluate(() => window.__sensor(true, { beta: 30, roll: 0 }, 1));
    await sleep(1000);
    const p = await page.evaluate(() => { const c = document.querySelector('.gk-ww'); return { w: c.getBoundingClientRect().width, bw: c.width, nm: document.querySelector('.gk-card .kc-dn').textContent, big: [...document.querySelectorAll('.gk-card .help li')].some((l) => /^Großes Gerät/.test(l.textContent)) }; });
    ok(p.w === 184 && p.bw === 184, 'iPad portrait: Wasserwaage ' + p.w + ' px, drawn at ' + p.bw + ' px (it follows its size)');
    ok(p.nm === 'Gestik · dieses iPad' && p.big, 'iPad: „' + p.nm + '“, Hinweise say what a large device is good for');
    await page.context().close();
  }
  // ---------- 6b. a phone without a gyroscope: Bebung, Drehen, Schwenken say what they need ----------
  {
    const { page } = await H.open({ url: URL, vp: phone(), cfg: { perm: 'granted' } });
    await H.gestikOn(page);
    await page.evaluate(() => { window.__ng = setInterval(() => window.__dm({ g: [-1.2, 6.9, 6.9], a: [0, 0, 0], r: null }), 16); });
    await sleep(1400);
    const g = await page.evaluate(() => { const C = window.__M.GK.card; return { na: [2, 3].map((i) => C.ax[i].classList.contains('na') && /braucht ein Gyroskop/.test(C.ax[i].getAttribute('aria-label'))), txt: getComputedStyle(C.ax[2].querySelector('.gk-bar'), '::after').content, hand: C.beb.querySelector('[data-v="hand"]').disabled, sw: C.sw.disabled, stat: C.stat.textContent }; });
    ok(g.na.every(Boolean) && /braucht Gyroskop/.test(g.txt) && g.hand && g.sw && /ohne Gyroskop/.test(g.stat), 'no gyroscope: Bebung and Drehen say „braucht Gyroskop“, Bebung „Hand“ and Schwenken off-limits, „' + g.stat + '“');
    await page.context().close();
  }
  // ---------- 7. reduced motion ----------
  {
    const { page } = await H.open({ url: URL, vp: phone(), cfg: { perm: 'granted' } });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await H.gestikOn(page); await sleep(300);
    const t = await page.evaluate(() => ({ spo: getComputedStyle(document.querySelector('#btnGk .spo')).transitionDuration, ev: getComputedStyle(document.querySelector('.gk-ev')).transitionDuration }));
    ok(/^0s/.test(t.spo) && /^0s/.test(t.ev), 'reduced motion: the spore and the lamps change without transitions (' + t.spo + ', ' + t.ev + ')');
    await page.context().close();
  }
  // ---------- 8. Gestik never switched on: no live region, no card ----------
  {
    const { page } = await H.open({ url: URL, vp: phone(), cfg: { perm: 'granted' } });
    await page.evaluate(() => window.__M.openPanel('dev')); await sleep(250);
    const o = await page.evaluate(() => ({ say: !!window.__M.GK.sayEl, card: !!document.querySelector('.gk-card'), ico: document.getElementById('btnGk').hidden, asked: window.__mo.asked }));
    ok(!o.say && !o.card && o.ico && !o.asked, 'Gestik off: no card, no live region, no symbol, nothing asked');
    await page.context().close();
  }
  await H.close();
})();
