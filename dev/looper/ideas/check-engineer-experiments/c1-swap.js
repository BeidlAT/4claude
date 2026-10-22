// C1: does the calibrate()-style context swap (A.ctx, pitchMod, notePitch) let an offline Wuchs voice be built while
// the LIVE graph runs – without touching live state? Checks per engine: errors, live voices stolen, offline voices left
// in A.voices, the live Gespinst web, A.elmDrift, Rhizom's queue, Jahresring's age.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  const errors = []; page.on('pageerror', (e) => errors.push('pageerror ' + e.message)); page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ' ' + m.text().slice(0, 160)); });
  await page.goto('http://127.0.0.1:8790/crit-inst/index.html'); await page.waitForFunction(() => !!window.__M);
  const r = await page.evaluate(async () => {
    const errors = window.__errs = []; { const ce = console.error, cw = console.warn; console.error = (...a) => { errors.push('E ' + a.map(String).join(' ').slice(0, 160)); ce(...a); }; console.warn = (...a) => { errors.push('W ' + a.map(String).join(' ').slice(0, 160)); cw(...a); }; }
    const M = window.__M, A = M.A, sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    M.start();
    for (let i = 0; i < 100 && A.ctx.state !== 'running'; i++) await sleep(20);
    await M.ensureDSP();
    await sleep(300);
    const live = A.ctx, out = { ctxState: live.state, workletOK: A.workletOK };
    async function offNote(eng, n = 1, f = 220) {   // build n offline voices of eng inside a swap, like calibrate()
      const c = new OfflineAudioContext(2, 48000 * 3, 48000);
      await M.ensureDSP(c);
      const keep = { ctx: A.ctx, pitchMod: A.pitchMod, notePitch: A.notePitch };
      const bus = c.createGain(); bus.connect(c.destination);
      const res = { err: null, built: 0 };
      try {
        A.ctx = c; A.pitchMod = A.notePitch = c.createGain();
        for (let i = 0; i < n; i++) { const v = M.playNote(eng, 0.02 + i * 0.05, f * Math.pow(2, i / 12), 0.7, 0.9, { bus }); if (v) res.built++; }
      } catch (e) { res.err = String(e.message || e).slice(0, 160); }
      finally { Object.assign(A, keep); }
      res.offlineInLiveSet = [...A.voices].filter((v) => v.out.context === c).length;
      return { c, res };
    }
    const liveCount = () => [...A.voices].filter((v) => v.out.context === live && v.alive).length;
    // 1. stealing: fill the live budget with held Nebel notes, then build 12 offline Gong voices
    M.P['v.eng'] = 'neb';
    const [VB, MX] = M.getBudget();
    const held = [];
    for (let i = 0; i < 40 && M.voiceLoad() < VB - 1; i++) held.push(M.playNote('neb', live.currentTime + 0.01, 110 * Math.pow(2, i / 7), 0.5, 0.5, {}));
    await sleep(100);
    const before = liveCount(), loadBefore = M.voiceLoad();
    const { res: rs } = await offNote('gng', 12);
    await sleep(50);
    out.steal = { budget: VB, liveBefore: before, loadBefore: +loadBefore.toFixed(2), offlineBuilt: rs.built, err: rs.err, liveAfter: liveCount(), liveKilledOrStolen: held.filter((v) => !v.alive || !A.voices.has(v) || v.released).length, offlineVoicesInLiveSet: rs.offlineInLiveSet, loadAfter: +M.voiceLoad().toFixed(2) };
    M.panic && M.panic(); await sleep(300);
    // 2. Gespinst: a live note builds the live web, then one offline note
    M.P['v.eng'] = 'gsp';
    M.playNote('gsp', live.currentTime + 0.01, 220, 0.6, 0.8, {}); await sleep(200);
    const webBefore = A.gsp && A.gsp.ctx === live;
    const { res: rg } = await offNote('gsp', 1);
    out.gespinst = { liveWebBefore: webBefore, err: rg.err, liveWebAfter: !!(A.gsp && A.gsp.ctx === live), webNowIn: A.gsp ? (A.gsp.ctx === live ? 'live' : 'offline') : 'none' };
    M.panic && M.panic(); await sleep(300);
    // 3. Elmsfeuer: A.elmDrift is hung off the live A.driftSrc
    const { res: re } = await offNote('elm', 1);
    out.elmsfeuer = { err: re.err, built: re.built, elmDriftCtx: A.elmDrift ? (A.elmDrift.context === live ? 'live' : 'offline') : 'none' };
    // 4. Jahresring: does an offline hit age the live bar?
    const age0 = A.jrgAge; const { res: rj } = await offNote('jrg', 6); out.jahresring = { err: rj.err, built: rj.built, liveAgeBefore: age0, liveAgeAfter: A.jrgAge };
    M.panic && M.panic(); await sleep(300);
    // 5. Rhizom: a live strike with charges underway, then an offline strike (rhzRun(Infinity) inside the swap)
    M.P['rhz.reiz'] = 1; M.P['v.eng'] = 'rhz';
    M.playNote('rhz', live.currentTime + 0.01, 220, 1, 1, {}); await sleep(30);
    const q0 = M.RHZ.q.length;
    const nErr = errors.length;
    const { res: rr } = await offNote('rhz', 1);
    out.rhizom = { liveChargesQueuedBefore: q0, err: rr.err, liveChargesAfter: M.RHZ.q.length, consoleErrorsDuring: errors.slice(nErr).slice(0, 3) };
    out.allPageErrors = errors.slice(0, 12); return out;
  });
  console.log(JSON.stringify(r, null, 1));
  console.log('errors', errors.slice(0, 12));
  await browser.close();
})();
