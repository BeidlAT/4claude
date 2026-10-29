// (owner, 29.10.2026: „jeweils eine Auswahl, was vorne oder hinten dazukommt oder wegkommt … auch 1/32 oder gar 1/64 …
// triolisches Raster … zusätzlich nächsten Ton einrasten“) the Ernte's edges in Ansehen und Bearbeiten:
//  1 Raster ¼: Anfang „+ ¼ dazu“ starts a beat earlier (a beat longer), Ende „− ¼ weg“ a beat shorter
//  2 Raster ⅛: Anfang/Ende are off on a Takt loop (whole beats), Verschieben moves the window by half a beat
//  3 Triole (⅛T): Verschieben by a third of a beat; 1/64 by a sixteenth of a beat
//  4 „Ton ▶“: the start on the next attack (4 ms ahead of it), the length kept
//   node t-hx-ernterand.js
const G = require('./hx-g'), H = require('./hx-h');
const { ok } = H;
(async () => {
  const { page, errors } = await G.open({ w: 1440, h: 900, init: () => { const si = window.setInterval; window.setInterval = function (f, ms, ...a) { if (typeof f === 'function' && /hxWGuard/.test(String(f))) return 0; return si.call(this, f, ms, ...a); }; } });
  const r = await page.evaluate(async () => {
    const M = window.__M, A = M.A, sl = window.__sleep, o = {};
    await window.__reset(); window.__grid(100); await sl(300);
    M.setParam('hx.laenge', 'fest'); M.setParam('hx.festT', 2); M.setParam('hx.ernte', true);
    const b = 60 / 100, B0 = Math.ceil(M.tgBeat(A.ctx.currentTime + 0.3) / 4) * 4, t0 = M.tgTime(B0);
    // two bars before the window and the window itself: quarter notes, a pickup eighth before each bar's one
    window.__riff(t0, b / 2, [0, null, 2, null, 4, null, 2, 6], 4, { eng: 'klb', dur: 0.2 }); await window.__until(t0 + 16 * b + 0.06);
    M.hxKorb(null);
    const L = M.hxLoopsLive().slice(-1)[0];
    for (let i = 0; i < 300 && !(L && L.hum && M.HX.sch.get(L.sch[0]).aud); i++) await sl(100);
    M.hxEdOpen(L); await sl(800);
    const S = () => M.HX.sch.get(L.sch[0]), beatF = S().cut.len / L.d.beats;
    const btn = (t) => [...document.querySelectorAll('.hx-ed-htools button')].find((x) => x.textContent.trim() === t);
    const click = async (t) => { const x = btn(t); if (!x || x.disabled) return false; x.click(); await sl(400); return true; };
    const cut = () => ({ w0: S().cut.w0, w1: S().cut.w1, beats: L.d.beats });
    o.beatF = beatF; o.c0 = cut();
    await click('1/4'); o.lab = !!btn('+ 1/4 dazu') && !!btn('− 1/4 weg');
    await click('+ 1/4 dazu'); await sl(300); o.c1 = cut();
    await click('− 1/4 weg'); o.c1b = cut();   // (Anfang's „weg“ is the second button of its row – the first „− ¼ weg“ is Anfang's)
    await click('1/8'); o.dis = !!(btn('+ 1/8 dazu') && btn('+ 1/8 dazu').disabled);
    const c2a = cut(); await click('1/8 ▶'); o.sh8 = cut().w0 - c2a.w0;
    await click('Triole'); const c3a = cut(); await click('1/8T ▶'); o.sh8t = cut().w0 - c3a.w0;
    await click('Triole'); await click('1/64'); const c4a = cut(); await click('◀ 1/64'); o.sh64 = cut().w0 - c4a.w0;
    // „Ton ▶“: the next attack
    const c5a = cut(); await click('Ton ▶'); const c5 = cut(); o.ton = c5.w0 - c5a.w0; o.tonLen = (c5.w1 - c5.w0) - (c5a.w1 - c5a.w0);
    // the attack found: in the Ernte's audio, the level 4 ms after the new start against 2 ms before it
    const Hh = L.hum, lv = (f, n) => { let s = 0; for (let i = 0; i < n; i++) { const p = f - Hh.f0 + i, ch = Hh.aud[Math.floor(p / 8192)]; if (ch) s += ch[0][p % 8192] ** 2; } return Math.sqrt(s / n); };
    o.att = 20 * Math.log10((lv(c5.w0 + 192, 960) + 1e-9) / (lv(c5.w0 - 960, 864) + 1e-9));
    // and on a note played: the new start (4 ms ahead of the attack) in audio time against the riff's notes
    const tA = M.hxT(c5.w0 + Math.round(0.004 * 48000)), notes = []; for (let k = 0; k < 32; k++) if ([0, null, 2, null, 4, null, 2, 6][k % 8] != null) notes.push(t0 + k * b / 2);
    o.dt = Math.min(...notes.map((t) => Math.abs(tA - t)));
    return o;
  });
  const bF = r.beatF;
  ok(r.lab, 'Raster ¼: the buttons say what they do („+ ¼ dazu“, „− ¼ weg“)');
  ok(Math.abs(r.c0.w0 - r.c1.w0 - bF) < 2 && r.c1.w1 === r.c0.w1 && r.c1.beats === r.c0.beats + 1, `Anfang „+ ¼ dazu“: a beat earlier, a beat longer (${r.c0.beats} → ${r.c1.beats} beats)`);
  ok(Math.abs(r.c1b.w0 - r.c1.w0 - bF) < 2 && r.c1b.beats === r.c0.beats, `Anfang „− ¼ weg“: a beat later again (${r.c1b.beats} beats)`);
  ok(r.dis, 'Raster ⅛ on a Takt loop: Anfang/Ende are off (its length stays whole beats)');
  ok(Math.abs(r.sh8 - bF / 2) < 2, `Verschieben ⅛: the window half a beat later (${(r.sh8 / bF).toFixed(3)} beat)`);
  ok(Math.abs(r.sh8t - bF / 3) < 2, `Verschieben ⅛T: a third of a beat (${(r.sh8t / bF).toFixed(3)} beat)`);
  ok(Math.abs(r.sh64 + bF / 16) < 2, `Verschieben 1/64: a sixteenth of a beat earlier (${(r.sh64 / bF).toFixed(4)} beat)`);
  ok(r.ton > 0 && r.ton < 4 * 48000 && r.tonLen === 0 && r.att > 6 && r.dt < 0.015, `„Ton ▶“: the start on the next attack (${(r.ton / 48).toFixed(1)} ms on, length kept, ${r.att.toFixed(1)} dB louder after it, ${(r.dt * 1000).toFixed(1)} ms from a note played)`);
  ok(!errors.length, 'no page errors ' + JSON.stringify(errors.slice(0, 3)));
  process.exit(H.summary() ? 1 : 0);
})();
