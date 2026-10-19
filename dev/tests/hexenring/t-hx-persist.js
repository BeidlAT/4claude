// Hexenring – persistence (SPEC §19; tests §22): IndexedDB „myzel“ version 2 – a version-1 database keeps its takes
// (only the missing stores are made; restoreTakes reads no ring data), a tab holding the old version gets a word
// (onblocked); a reload in the middle of an overdub brings every finished Schicht back bit-exactly (angehalten,
// „▶ Weiter“); a full device storage (quota) is said and nothing that plays is lost; the memory cap (shared with takes)
// refuses new audio with a choice – Gelöschte entfernen or Zusammenlegen (exact: the same steady pass) – and never drops
// any by itself; a Schicht stored at another sample rate is resampled by the processor's resampler.   node t-hx-persist.js
const G = require('./hx-g'), H = require('./hx-h');
const { ok } = H;
const ORIGIN = 'http://127.0.0.1:8790/';
(async () => {
  const { chromium } = require('/opt/node22/lib/node_modules/playwright');
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const errors = [];
  const newPage = async (ctx) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); }); return p; };
  const start = async (page) => { await page.click('#btnStart'); await page.waitForFunction(() => window.__M.HX.state === 'ok', null, { timeout: 8000 }); await page.waitForTimeout(300); await H.tools(page); await G.gtools(page); await page.evaluate(() => { window.__M.setParam('v.human', 0); }); };
  const hashJS = `window.__hash = (aud, n) => { let h = 2166136261 >>> 0; for (let i = 0; i < n; i++) { const c = aud[Math.floor(i / 8192)], j = i % 8192; for (const x of [c[0][j], c[1][j]]) { const u = new Uint32Array(new Float32Array([x]).buffer)[0]; h = Math.imul(h ^ u, 16777619) >>> 0; } } return h; };`;

  // ---- version 1 → 2: a take stays; the new stores come; an old tab blocking the upgrade is told ----
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const old = await newPage(ctx);
    await old.goto(ORIGIN);
    await old.evaluate(() => new Promise((res) => { const rq = indexedDB.open('myzel', 1); rq.onupgradeneeded = () => { const db = rq.result; db.createObjectStore('takes', { keyPath: 'id' }); db.createObjectStore('segs', { keyPath: ['take', 'i'] }); };
      rq.onsuccess = () => { const db = rq.result, tx = db.transaction('takes', 'readwrite'); tx.objectStore('takes').put({ id: 1, name: 'Alte Aufnahme', sr: 48000, frames: 0, peak: 0, date: Date.now(), patch: {}, saved: true, done: true }); tx.oncomplete = () => { window.__db = db; res(); }; }; }));
    const page = await newPage(ctx);
    await page.goto(H.URL_HX); await page.waitForFunction(() => !!window.__M);
    await page.waitForTimeout(1200);
    const blocked = await page.evaluate(() => ({ msg: document.getElementById('toastMsg').textContent, ok: window.__M.IDB.ok }));
    await old.evaluate(() => window.__db.close());
    await page.waitForTimeout(800);
    const after = await page.evaluate(async () => { const M = window.__M; return { ok: M.IDB.ok, v: M.IDB.db && M.IDB.db.version, stores: M.IDB.db ? [...M.IDB.db.objectStoreNames].join(' ') : '' }; });
    await page.reload(); await page.waitForFunction(() => !!window.__M); await page.waitForTimeout(800);
    const takes = await page.evaluate(() => window.__M.takes.map((t) => t.name).join(','));
    ok(/anderen Tab/.test(blocked.msg) && !blocked.ok, `a tab still holding version 1 blocks the upgrade: the toast says so („${blocked.msg}“)`);
    ok(after.ok && after.v === 2 && /rings/.test(after.stores) && /ringsegs/.test(after.stores) && /takes/.test(after.stores), `  once it lets go: version ${after.v}, stores ${after.stores}`);
    ok(takes === 'Alte Aufnahme', `  the version-1 take is still there (${takes}); restoreTakes lists no ring data`);
    await ctx.close();
  }

  // ---- a reload in the middle of an overdub: the finished Schichten come back bit-exactly, angehalten, ▶ Weiter ----
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await newPage(ctx);
    await page.goto(H.URL_HX); await page.waitForFunction(() => !!window.__M);
    await page.evaluate(() => new Promise((res) => { const rq = indexedDB.deleteDatabase('myzel'); rq.onsuccess = rq.onerror = rq.onblocked = () => res(); }));
    await page.reload(); await page.waitForFunction(() => !!window.__M);
    await start(page);
    await page.evaluate(hashJS);
    const before = await page.evaluate(async () => {
      const M = window.__M, A = M.A, lat = (A.ctx.baseLatency || 0) + (A.ctx.outputLatency || 0);
      window.__grid(120); await window.__sleep(300);
      const B0 = Math.ceil(M.tgBeat(A.ctx.currentTime + 0.4) / 4) * 4;
      window.__riff(M.tgTime(B0), 0.5, [0, 4, 2, 7, 5, 4, 2, 9], 1, { eng: 'mem' });
      await window.__until(M.tgTime(B0 + 8) + 0.05 + lat);
      M.hxKorb(null);
      const L = M.hxLoopsLive()[0];
      M.setParam('hx.modus', 'dieselbe');
      await window.__until(M.tgTime(B0 + 9) + lat);
      M.hxHaupt(null);   // the punch: it goes on over the reload
      window.__riff(M.tgTime(B0 + 9), 0.25, [9, 11, 12, 11, 9, 7, 9, 11, 12, 14, 12, 11, 9, 11, 12, 11, 9, 7, 9, 11, 12, 14, 12, 11, 9, 11, 12, 11], 1, { eng: 'mem' });
      // wait for the first pass's Schicht and the harvest's to be stored
      const done = () => L.sch.map((id) => M.HX.sch.get(id)).filter((S) => S.aud && S.saved >= Math.ceil(S.n / (4 * S.sr)));
      for (let i = 0; i < 200 && done().length < 2; i++) await window.__sleep(100);
      await window.__sleep(600);
      return { punch: !!M.HX.punch, slot: L.slot, key: L.key, sch: done().map((S) => ({ key: S.key, n: S.n, h: window.__hash(S.aud, S.n), kind: S.kind })), all: L.sch.length, bpm: M.tgBpm(A.ctx.currentTime) };
    });
    await page.reload(); await page.waitForFunction(() => !!window.__M);
    await start(page);
    await page.evaluate(hashJS);
    await page.waitForFunction(() => window.__M.hxLoopsLive().length > 0, null, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(500);
    const after = await page.evaluate(async () => {
      const M = window.__M, L = M.hxLoopsLive()[0];
      if (!L) return { none: true, toast: document.getElementById('toastMsg').textContent };
      const sch = L.sch.map((id) => M.HX.sch.get(id)).map((S) => ({ key: S.key, n: S.n, h: window.__hash(S.aud, S.n), kind: S.kind }));
      const o = { slot: L.slot, key: L.key, state: L.state, sch, toast: document.getElementById('toastMsg').textContent, act: document.getElementById('toastAct').textContent, ruht: M.HX.ruht, bpm: M.TG.hx, on: M.TG.hxOn };
      document.getElementById('toastAct').click();
      const t = M.HX.pend[0] && M.HX.pend[0].t;
      await window.__until((t || M.A.ctx.currentTime) + 0.4);
      const met = await window.__meter(L.id, 400);
      o.weiter = { state: L.state, lvl: Math.max(...met.map((m) => m[1])) };
      return o;
    });
    const same = after.sch && before.sch.every((b) => after.sch.some((a) => a.key === b.key && a.n === b.n && a.h === b.h));
    ok(before.punch && before.sch.length >= 2 && !after.none && after.key === before.key && after.slot === before.slot && same, `reload in the middle of an overdub: ${after.sch ? after.sch.length : 0} Schichten back (${before.sch.map((s) => s.kind).join(', ')}), bit-exact (hashes ${before.sch.map((s) => s.h.toString(16)).join(' ')})`);
    ok(after.state === 'angehalten' && after.ruht && /wiederhergestellt/.test(after.toast) && /Weiter/.test(after.act) && after.on && Math.abs(after.bpm - before.bpm) < 1e-6, `  angehalten, the toast „${after.toast}“ · ${after.act}; its Takt back (${after.bpm && after.bpm.toFixed(2)} BPM)`);
    ok(after.weiter.state === 'spielt' && after.weiter.lvl > 1e-4, '  ▶ Weiter: it plays again from the next 1');
    await ctx.close();
  }

  // ---- a full device storage, the memory cap, Zusammenlegen ----
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await newPage(ctx);
    await page.goto(H.URL_HX); await page.waitForFunction(() => !!window.__M);
    await start(page);
    await page.evaluate(hashJS);
    let r = await page.evaluate(async () => {
      const M = window.__M, A = M.A, lat = (A.ctx.baseLatency || 0) + (A.ctx.outputLatency || 0), o = {};
      // the quota: every write of audio fails
      const put = IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put = function (v, k) { if (this.name === 'ringsegs') throw new DOMException('voll', 'QuotaExceededError'); return put.call(this, v, k); };
      window.__grid(120); await window.__sleep(300);
      const B0 = Math.ceil(M.tgBeat(A.ctx.currentTime + 0.4) / 4) * 4;
      window.__riff(M.tgTime(B0), 0.5, [0, 4, 2, 7], 1, { eng: 'mem' });
      await window.__until(M.tgTime(B0 + 4) + 0.05 + lat);
      M.hxKorb(null);
      const L = M.hxLoopsLive()[0], S = M.HX.sch.get(L.sch[0]);
      for (let i = 0; i < 100 && !M.HX.saveFail; i++) await window.__sleep(100);
      o.quota = { fail: M.HX.saveFail, toast: document.getElementById('toastMsg').textContent, act: document.getElementById('toastAct').textContent, aud: !!S.aud, state: L.state };
      const met = await window.__meter(L.id, 500); o.quota.lvl = Math.max(...met.map((m) => m[1]));
      IDBObjectStore.prototype.put = put;
      // the cap: a little above what is used – new audio is refused with a choice, nothing is dropped
      const used = M.hxMemUsed() / 1048576;
      M.P['hx.mem'] = Math.ceil(used) + 40;   // (the same room every run – the slider's 50-MB steps left 50 … 100 MB)
      let made = 0, refused = false;
      for (let i = 0; i < 24 && !refused; i++) {
        const n0 = M.hxLoopsLive().length;
        M.hxHarvest({ kind: 'grid', in: 0, w0: M.tgTime(B0), w1: M.tgTime(B0 + 4), b0: B0 + 4, beats: 4, bars: 1, lock: 'takt', entry: { b: B0 + 4, t: M.tgTime(B0 + 4), now: true } });
        if (M.hxLoopsLive().length > n0) made++; else refused = true;
      }
      o.cap = { made, refused, toast: document.getElementById('toastMsg').textContent, act: document.getElementById('toastAct').textContent, n: M.hxLoopsLive().length, schOk: M.hxLoopsLive().every((x) => x.sch.length === 1), full: M.HX.memFull };
      // deleted Schleifen keep their audio in the graveyard (the page's copy): filled up again, it refuses again –
      // „Endgültig entfernen“ frees them
      const harvest = () => { const n0 = M.hxLoopsLive().length; M.hxHarvest({ kind: 'grid', in: 0, w0: M.tgTime(B0), w1: M.tgTime(B0 + 4), b0: B0 + 4, beats: 4, bars: 1, lock: 'takt', entry: { b: B0 + 4, t: M.tgTime(B0 + 4), now: true } }); return M.hxLoopsLive().length > n0; };
      for (let i = 0; i < 80 && M.hxLoopsLive().some((L) => L.sch.some((id) => !M.HX.sch.get(id).aud)); i++) await window.__sleep(100);   // (their copies complete: Ausklang in)
      for (let i = 0; i < 4; i++) M.hxDelete(M.hxLoopsLive()[1]);
      M.HX.hist.length = 0;
      await window.__sleep(400);   // (the processor hands their chunks back after its fade)
      let again = 0; while (again < 12 && harvest()) again++;
      const g0 = M.HX.grave.length, mb0 = M.hxMemUsed();
      M.hxGraveClear();
      o.graveKeeps = again < 12 && g0 === 4 && M.hxMemUsed() < mb0 - 4e6;   // (full again; the graveyard's audio counted until removed)
      o.afterClear = harvest(); o.again = again;
      await window.__sleep(100);
      M.setParam('hx.mem', 1500);
      return o;
    });
    ok(r.quota.fail && /voll/.test(r.quota.toast) && r.quota.act === 'Aufräumen' && r.quota.aud && r.quota.state === 'spielt' && r.quota.lvl > 1e-4, `device storage full: „${r.quota.toast}“ · ${r.quota.act} – the Schleife plays on, its audio kept`);
    ok(r.cap.made >= 1 && r.cap.refused && /Speichergrenze/.test(r.cap.toast) && r.cap.act === 'Aufräumen' && r.cap.schOk && r.cap.full, `memory cap: ${r.cap.made} more fit, then the next is refused („${r.cap.toast}“ · ${r.cap.act}); nothing playing lost a Schicht`);
    ok(r.graveKeeps && r.afterClear, `  four deleted: their audio stays in the graveyard (${r.again} fit again, then full) until „Endgültig entfernen“ – then there is room`);
    // Zusammenlegen: two Schichten → one, the steady pass the same (offline: both versions rendered by the processor)
    r = await page.evaluate(async () => {
      const M = window.__M, A = M.A, lat = (A.ctx.baseLatency || 0) + (A.ctx.outputLatency || 0);
      for (const L of M.hxLoopsLive()) M.hxDrop(L);
      const B0 = Math.ceil(M.tgBeat(A.ctx.currentTime + 0.4) / 4) * 4;
      window.__riff(M.tgTime(B0), 0.5, [0, 4, 2, 7], 1, { eng: 'glo' });
      await window.__until(M.tgTime(B0 + 4) + 0.05 + lat);
      M.hxKorb(null);
      const L = M.hxLoopsLive()[0];
      M.setParam('hx.modus', 'dieselbe');
      window.__riff(M.tgTime(B0 + 4), 0.5, [9, 11, 12, 11], 1, { eng: 'glo' });
      await window.__until(M.tgTime(B0 + 8) + 0.05 + lat);
      M.hxKorb(null);
      M.setParam('hx.modus', 'neu');
      for (let i = 0; i < 150 && L.sch.some((id) => !M.HX.sch.get(id).aud); i++) await window.__sleep(100);
      const sch = L.sch.map((id) => M.HX.sch.get(id)), Lf = M.hxPassF(L, 1) - M.hxPassF(L, 0);
      // the steady pass of the Schichten as they are, rendered by the processor
      const render = async (list) => {
        const tail = Math.max(0, ...list.map((S) => (S.aus ? S.aus.len : 0))), passes = Math.ceil(tail / Lf) + 2, ctx = new OfflineAudioContext(2, Lf * (passes + 2), A.ctx.sampleRate);
        await M.ensureDSP(ctx);
        const msgs = [{ loop: { id: 1, lock: 'frei', L: Lf, ph0: 0 } }];
        list.forEach((S, i) => msgs.push({ schicht: { loop: 1, id: i + 1, chunks: S.aud, n: S.n, pre: S.pre, len: S.len, ausklang: S.aus ? { off: S.aus.off, len: S.aus.len, fade: Math.min(Math.round(0.03 * A.ctx.sampleRate), S.aus.len) } : null, gain: S.gain, join: S.join, X: S.X, rho: S.rho, fin: 0 } }));
        const node = new AudioWorkletNode(ctx, 'myzel-ring', { numberOfInputs: 2, numberOfOutputs: 2, outputChannelCount: [2, 2], channelCount: 2, channelCountMode: 'explicit', processorOptions: { humusS: 2, chunk: 8192, msgs } });
        node.connect(ctx.destination, 0);
        const b = await ctx.startRendering(); return { L: b.getChannelData(0), at: passes * Lf };
      };
      const a = await render(sch);
      const n0 = sch.length, ok0 = await M.hxMerge(L);
      const m = L.sch.map((id) => M.HX.sch.get(id));
      const b = await render(m);
      let d = 0, pk = 0; for (let i = 0; i < Lf; i++) { d = Math.max(d, Math.abs(a.L[a.at + i] - b.L[b.at + i])); pk = Math.max(pk, Math.abs(a.L[a.at + i])); }
      const met = await window.__meter(L.id, 300);
      const o = { ok0, n0, n1: L.sch.length, kind: m[0].kind, d, pk, lvl: Math.max(...met.map((x) => x[1])), hist: M.HX.hist[M.HX.hist.length - 1].label };
      M.hxUndoStep(); await window.__sleep(200); o.undo = L.sch.length;
      return o;
    });
    ok(r.ok0 && r.n0 === 2 && r.n1 === 1 && r.kind === 'sediment' && r.lvl > 1e-4, `Zusammenlegen: ${r.n0} Schichten → ${r.n1} (${r.hist}), it plays on`);
    ok(r.d < 1e-6 * Math.max(1, r.pk * 10), `  exact: the steady pass differs by ${r.d.toExponential(1)} (peak ${r.pk.toFixed(3)})`);
    ok(r.undo === 2, '  ↶: the two Schichten again');
    await ctx.close();
  }

  // ---- another sample rate: a Schicht stored at 22 050 Hz (a 1-kHz sine) comes back at the device's rate ----
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await newPage(ctx);
    await page.goto(H.URL_HX); await page.waitForFunction(() => !!window.__M);
    await page.evaluate(() => new Promise((res) => { const rq = indexedDB.deleteDatabase('myzel'); rq.onsuccess = rq.onerror = rq.onblocked = () => res(); }));
    await page.reload(); await page.waitForFunction(() => !!window.__M && window.__M.IDB.ok, null, { timeout: 8000 });
    await page.evaluate(async () => {
      const M = window.__M, sr = 22050, n = sr * 3, L = new Float32Array(n), R = new Float32Array(n);
      for (let i = 0; i < n; i++) { L[i] = R[i] = 0.3 * Math.sin((2 * Math.PI * 1000 * i) / sr); }
      const len = sr * 2, s = { key: 'sx', len, pre: 0, n, cut: { in: 0, w0: 0, w1: len, f0: 0, pre: 0, len, post: 0, n }, aus: null, join: 'xf', X: 441, rho: 0, gain: 1, mute: false, kind: 'ernte', group: 0, sr, segs: 1, saved: true };
      await M.hxDbPut('rings', { id: 'lx', v: 1, slot: 0, lock: 'frei', b0: 0, beats: 0, L: len, ph0: 0, bpb: 4, notes: [], mv: null, cut: s.cut, eng: 'neb', setTG: false, gain: 1, src: 0, bpm: 84, state: 'spielt', made: Date.now(), nudge: 0, sr, tk: null, plan: 'phrase', sch: [s] });
      await M.hxDbPut('ringsegs', { ring: 'lx', schicht: 'sx', i: 0, L: L.buffer, R: R.buffer, sr });
      // and one at 96 kHz going down: 1 kHz and 18 kHz pass, 30 kHz must not fold to 14.1 kHz
      const s2 = 96000, n2 = s2 * 2, L2 = new Float32Array(n2), R2 = new Float32Array(n2);
      for (let i = 0; i < n2; i++) L2[i] = R2[i] = 0.3 * Math.sin(2 * Math.PI * 1000 * i / s2) + 0.2 * Math.sin(2 * Math.PI * 18000 * i / s2) + 0.3 * Math.sin(2 * Math.PI * 30000 * i / s2);
      const c2 = { in: 0, w0: 0, w1: s2, f0: 0, pre: 0, len: s2, post: 0, n: n2 };
      await M.hxDbPut('rings', { id: 'ly', v: 1, slot: 1, lock: 'frei', b0: 0, beats: 0, L: s2, ph0: 0, bpb: 4, notes: [], mv: null, cut: c2, eng: 'neb', setTG: false, gain: 1, src: 0, bpm: 84, state: 'spielt', made: Date.now(), nudge: 0, sr: s2, tk: null, plan: 'phrase',
        sch: [{ key: 'sy', len: s2, pre: 0, n: n2, cut: c2, aus: null, join: 'xf', X: 960, rho: 0, gain: 1, mute: false, kind: 'ernte', group: 0, sr: s2, segs: 1, saved: true }] });
      await M.hxDbPut('ringsegs', { ring: 'ly', schicht: 'sy', i: 0, L: L2.buffer, R: R2.buffer, sr: s2 });
    });
    await page.reload(); await page.waitForFunction(() => !!window.__M);
    await start(page);
    await page.waitForFunction(() => window.__M.hxLoopsLive().length > 1, null, { timeout: 30000 }).catch(() => {});
    const r2 = await page.evaluate(() => {
      const M = window.__M, L = M.hxLoopsLive().find((x) => x.slot === 1); if (!L) return null;
      const S = M.HX.sch.get(L.sch[0]), sr = M.A.ctx.sampleRate, at = (i) => S.aud[Math.floor(i / 8192)][0][i % 8192];
      const amp = (f) => { let re = 0, im = 0, w0 = 0; const a = Math.round(0.4 * sr), N = Math.round(1.0 * sr); for (let i = 0; i < N; i++) { const t = i / (N - 1), w = 0.35875 - 0.48829 * Math.cos(2 * Math.PI * t) + 0.14128 * Math.cos(4 * Math.PI * t) - 0.01168 * Math.cos(6 * Math.PI * t), x = at(a + i); re += w * x * Math.cos(2 * Math.PI * f * i / sr); im += w * x * Math.sin(2 * Math.PI * f * i / sr); w0 += w; } return 2 * Math.hypot(re, im) / w0; };
      return { sr, a1: amp(1000), a18: amp(18000), alias: amp(sr - 30000) };
    });
    ok(r2 && Math.abs(20 * Math.log10(r2.a1 / 0.3)) < 0.05 && Math.abs(20 * Math.log10(r2.a18 / 0.2)) < 0.2 && 20 * Math.log10(r2.alias / 0.3 + 1e-12) < -80, `stored at 96 kHz, restored at ${r2 && r2.sr} Hz: 1 kHz ${r2 && (20 * Math.log10(r2.a1 / 0.3)).toFixed(3)} dB, 18 kHz ${r2 && (20 * Math.log10(r2.a18 / 0.2)).toFixed(3)} dB, the 30-kHz tone not folded (${r2 && (20 * Math.log10(r2.alias / 0.3 + 1e-12)).toFixed(1)} dB at ${r2 && r2.sr - 30000} Hz)`);
    const r = await page.evaluate(() => {
      const M = window.__M, L = M.hxLoopsLive().find((x) => x.slot === 0); if (!L) return null;
      const S = M.HX.sch.get(L.sch[0]), sr = M.A.ctx.sampleRate, at = (i) => S.aud[Math.floor(i / 8192)][0][i % 8192];
      let zc = 0, pk = 0; const a = Math.round(0.5 * sr), b = Math.round(2.5 * sr);
      for (let i = a + 1; i < b; i++) { if (at(i - 1) < 0 && at(i) >= 0) zc++; pk = Math.max(pk, Math.abs(at(i))); }
      return { sr, n: S.n, srS: S.sr, ratio: S.n / (22050 * 3), f: zc / 2, pk, Lf: L.d.L / sr };
    });
    ok(r && r.srS === r.sr && Math.abs(r.ratio - r.sr / 22050) < 1e-3 && Math.abs(r.f - 1000) <= 1 && Math.abs(r.pk - 0.3) < 0.003 && Math.abs(r.Lf - 2) < 1e-3, `stored at 22 050 Hz, restored at ${r && r.sr} Hz: ${r && r.n} frames, a ${r && r.f} Hz sine at ${r && r.pk.toFixed(4)} (the processor's resampler), the loop still ${r && r.Lf.toFixed(3)} s`);
    await ctx.close();
  }

  console.log('errors:', errors.length ? errors.join(' | ') : 'none');
  ok(!errors.length, 'no page errors');
  await browser.close();
  process.exit(H.summary() ? 1 : 0);
})().catch(async (e) => { console.log('FAIL fatal ' + (e && e.stack || e)); process.exit(1); });
