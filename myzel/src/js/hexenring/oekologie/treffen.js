// ---- Treffen (SPEC §15, KONZEPT §6): when the playing Schleifen next start together – all of them, and each pair. Takt
// loops: their pass starts are beats b0 + k·beats – the common one by the Chinese remainder theorem on 1/48 beats
// (exact: 5, 7 and 8 bars meet every 280 bars); free loops: their pass starts in frames, the next moment each one starts
// within 30 ms of the others (searched over two hours) ----
const HX_TREF_TOL = 0.03, HX_TREF_H = 7200;
const hxGcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) { const t = a % b; a = b; b = t; } return a; };
// x ≡ r (mod m) for every pair [r, m] (integers): the smallest x ≥ lo, or null (no solution, or beyond 2^52)
function hxCrt(list, lo) {
  let r = 0, m = 1;
  for (const [ri, mi] of list) {
    const g = hxGcd(m, mi), d = ri - r;
    if (d % g !== 0) return null;
    const m1 = m / g, mi1 = mi / g;
    // r + m·t ≡ ri (mod mi) → t ≡ (d/g)·inv(m1) (mod mi1)
    let inv = 1, a = ((m1 % mi1) + mi1) % mi1;
    if (mi1 > 1) { let [o0, o1, s0, s1] = [mi1, a, 0, 1]; while (o1) { const q = Math.floor(o0 / o1); [o0, o1] = [o1, o0 - q * o1]; [s0, s1] = [s1, s0 - q * s1]; } inv = ((s0 % mi1) + mi1) % mi1; }
    const t = mi1 > 1 ? Number((BigInt(((d / g) % mi1 + mi1) % mi1) * BigInt(inv)) % BigInt(mi1)) : 0;
    r = r + m * t; m = m * mi1;
    if (!(m < 2 ** 52)) return null;
    r = ((r % m) + m) % m;
  }
  return lo == null ? r : r + Math.ceil((lo - r) / m) * m;
}
// when loops meet next, from audio time t0 on: { t, b (a Takt's beat, else null) } or null (not within two hours)
function hxTreffenOf(list, t0) {
  if (list.length < 2) return null;
  if (list.every((L) => hxTakt(L)) && list.every((L) => Number.isFinite(L.d.beats))) {
    const Q = 48, lo = Math.ceil(hxBeatAtF(Math.round(hxF(t0))) * Q - 1e-6), eq = list.map((L) => [Math.round(L.d.b0 * Q), Math.round(L.d.beats * Q)]);
    if (eq.every(([, m]) => m > 0)) {
      const x = hxCrt(eq, lo);
      if (x == null) return null;
      const t = hxT(hxFrameAt(x / Q));
      return t - t0 > HX_TREF_H ? null : { t, b: x / Q - TG.o };
    }
  }
  // free (or mixed): the loop with the fewest starts paces the search, the others must start within 30 ms of each
  const f0 = Math.round(hxF(t0)), tol = HX_TREF_TOL * SR, fe = f0 + HX_TREF_H * SR;
  const per = (L) => hxPassF(L, hxPassK(L, f0) + 1) - hxPassF(L, hxPassK(L, f0));
  const lead = list.slice().sort((a, b) => per(b) - per(a))[0];
  for (let k = hxPassK(lead, f0), g = 0; g < 200000; k++, g++) {
    const f = hxPassF(lead, k); if (f < f0 - tol) continue; if (f > fe) return null;
    let ok = true;
    for (const L of list) { if (L === lead) continue; const j = hxPassK(L, f); if (Math.min(Math.abs(hxPassF(L, j) - f), Math.abs(hxPassF(L, j + 1) - f)) > tol) { ok = false; break; } }
    if (ok) return { t: hxT(f), b: null };
  }
  return null;
}
const hxTrefLoops = () => hxLoopsLive().filter((L) => !L.bew && L.state === 'spielt' && L.sch.length);
// all, and each pair – for the card (computed when it is drawn, cached a second)
function hxTreffen() {
  const now = hxNowT(), pn = performance.now();
  if (HX.trefC && pn - HX.trefC.at < 1000) return HX.trefC.v;
  const list = hxTrefLoops(), v = { all: list.length >= 2 ? hxTreffenOf(list, now) : null, pairs: [], n: list.length };
  if (list.length <= 6) for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) { const T = hxTreffenOf([list[i], list[j]], now); if (T) v.pairs.push({ a: list[i].slot, b: list[j].slot, t: T.t }); }
  v.pairs.sort((a, b) => a.t - b.t);
  HX.trefC = { at: pn, v };
  return v;
}
const hxClock = (s) => { s = Math.max(0, Math.round(s)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0'); };

// ---- Treffen setzen (SPEC §15): free loops get lengths L_i = (T − s_i)/k_i from distinct primes k_i, so they all start
// together at T and no two before it (checked by enumeration, 30 ms); s_i – each loop's next pass start, where its new
// length begins. Only the silence after each phrase changes (gap: a pass plays its window once, then its own ring-out,
// then silence – never shorter than the phrase, never stretched). Takt loops keep their bars: T falls on their next
// common downbeat after the chosen moment. Fruchten at T (each a choice): every living loop plays its anchor that pass,
// the webs bloom, a planned key lands ----
const HX_PRIMES = (() => { const p = []; for (let n = 2; p.length < 400; n++) if (p.every((q) => n % q)) p.push(n); return p; })();
// where a loop's phrase ends (seconds from its window's start): the last moment its audio is within 40 dB of its peak
function hxPhraseEnd(L) {
  let e = 0;
  for (const id of L.sch) {
    const S = HX.sch.get(id), a = S && (S.bak || S.aud); if (!a || S.mute) continue;
    const blk = Math.round(0.01 * SR), n = Math.min(S.n - S.pre, Math.max(S.len, S.aus ? S.len + S.aus.len : S.len)), lv = [];
    let pk = 0;
    for (let i = 0; i < n; i += blk) { let q = 0; for (let j = i; j < Math.min(n, i + blk); j++) { const p = S.pre + j, c = a[Math.floor(p / HX_CH)]; if (c) { const x = c[0][p % HX_CH], y = c[1][p % HX_CH]; q += x * x + y * y; } } const r = Math.sqrt(q / (2 * blk)); lv.push(r); pk = Math.max(pk, r); }
    if (!(pk > 0)) continue;
    let last = 0; const thr = pk * Math.pow(10, -40 / 20);
    for (let i = 0; i < Math.min(lv.length, Math.ceil(S.len / blk)); i++) if (lv[i] >= thr) last = i + 1;
    e = Math.max(e, (last * blk) / SR + 0.08);
  }
  return e;
}
// the plan: for each free loop its prime and length – or why not
function hxTrefPlan(T, list) {
  const now = hxNowT(), items = list.map((L) => {
    const sw = hxNextSeam(L), s = hxT(sw.f), ph = Math.max(0.25, hxPhraseEnd(L)), L0 = hxLen(L), span = T - s;
    const ks = HX_PRIMES.filter((k) => span / k >= ph).map((k) => ({ k, Lf: (span / k) * SR, d: Math.abs(Math.log(span / k / L0)) })).sort((a, b) => a.d - b.d).slice(0, 14);
    return { L, s, f: sw.f, kSeam: sw.k, ph, L0, ks };
  });
  if (items.some((it) => !it.ks.length)) return { err: 'zu früh' };
  // no two meet before T: their pass starts (from each one's next seam) never within 30 ms – except where both begin
  const tol = HX_TREF_TOL * SR, fT = hxF(T) - tol;
  const clash = (A, a, B, b) => {
    let i = 0, j = 0;
    const sa = (q) => A.f + q * a.Lf, sb = (q) => B.f + q * b.Lf;
    while (sa(i) < fT && sb(j) < fT) { const x = sa(i), y = sb(j); if (Math.abs(x - y) <= tol && !(i === 0 && j === 0)) return true; if (x < y) i++; else j++; }
    return false;
  };
  const pick = [], used = new Set();
  const dfs = (n) => {
    if (n === items.length) return true;
    for (const c of items[n].ks) {
      if (used.has(c.k)) continue;
      let ok = true; for (let m = 0; m < n && ok; m++) if (clash(items[m], pick[m], items[n], c)) ok = false;
      if (!ok) continue;
      used.add(c.k); pick[n] = c; if (dfs(n + 1)) return true; used.delete(c.k);
    }
    return false;
  };
  if (!dfs(0)) return { err: 'keine Lösung' };
  return { T, items: items.map((it, i) => Object.assign(it, { k: pick[i].k, Lf: pick[i].Lf })), now };
}
// T (audio time), o: { anker, bluehen, ton: {root, scale} | null } – the free loops meet there once
function hxTreffenSetzen(T, o = {}) {
  const list = hxTrefLoops().filter((L) => !hxTakt(L)), takt = hxTrefLoops().filter((L) => hxTakt(L));
  if (!list.length) { toast('Treffen setzen braucht freie Schleifen.'); return null; }
  if (takt.length) { const M = hxTreffenOf(takt.length > 1 ? takt : takt.concat(takt), T); if (M) T = M.t; }   // (the Takt loops keep their bars: their next common downbeat after the chosen moment)
  const plan = hxTrefPlan(T, list);
  if (plan.err) { toast(plan.err === 'zu früh' ? 'So früh geht es nicht – jede Schleife braucht mindestens ihre Phrase. Wähle einen späteren Treffpunkt.' : 'Für diesen Zeitpunkt findet sich keine Lösung – versuch einen anderen.', 4500); return null; }
  const before = list.map((L) => ({ key: L.key, d: Object.assign({}, L.d) }));
  const apply = (its) => hxBatch(() => {
    for (const it of its) {
      const L = hxByKey(it.key); if (!L) continue;
      const k = hxPassK(L, it.f - 1);
      hxPost({ geom: { loop: L.id, f: it.f, L: it.Lf, fr: 1, gap: it.gap ? 1 : 0 } });
      hxGeomMirror(L, it.f, k, L.d.beats, it.Lf);
      L.d.gap = !!it.gap; L.gap = !!it.gap; hxPassNotesDrop(L); if (L.fd) for (const x in L.fd) L.fd[x] = Math.min(L.fd[x], it.f);
      if (hxWAktiv(L)) hxWUpdate(L, { f: it.f });
      hxSaveMeta(L.id);
    }
  });
  const its = plan.items.map((it) => ({ key: it.L.key, f: it.f, Lf: it.Lf, gap: true }));
  apply(its);
  HX.tref = { T, keys: list.map((L) => L.key), o: Object.assign({}, o), done: false, primes: plan.items.map((it) => it.k) };
  hxHist({ kind: 'treffen', label: 'Treffen gesetzt', undo() { HX.tref = null; apply(before.map((b) => { const L = hxByKey(b.key); return L ? { key: b.key, f: hxNextSeam(L).f, Lf: b.d.L, gap: !!b.d.gap } : null; }).filter(Boolean)); hxCardDirty(); }, redo() { apply(its.map((x) => { const L = hxByKey(x.key); return L ? Object.assign({}, x, { f: hxNextSeam(L).f }) : null; }).filter(Boolean)); } });
  HX.trefC = null;
  hxSay('Treffen gesetzt: in ' + hxClock(T - hxNowT())); hxSessSave(); hxRailDirty(); hxCardDirty();
  return plan;
}
function hxTreffenAb() { if (!HX.tref) return; HX.tref = null; hxSay('Treffen aufgehoben – die Längen bleiben'); hxSessSave(); hxRailDirty(); hxCardDirty(); }
// every tick: Fruchten – the key planned for T lands with it (announced as any key change, its bar line T), at T every
// living loop plays its anchor that pass, and the webs bloom
function hxTreffenTick(now) {
  const R = HX.tref; if (!R || R.done) return;
  const o = R.o || {};
  if (o.ton && !R.tonGo && now >= R.T - 3) {
    R.tonGo = true; HX.tonAt = R.T;
    try { if (o.ton.scale && o.ton.scale !== P['t.scale']) setParam('t.scale', o.ton.scale); if (o.ton.root != null && String(o.ton.root) !== String(P['t.root'])) setParam('t.root', String(o.ton.root)); } finally { HX.tonAt = null; }
  }
  if (o.anker && !R.ankGo && now >= R.T - 4) {
    R.ankGo = true;
    for (const k of R.keys.concat(hxTrefLoops().map((L) => L.key))) { const L = hxByKey(k); if (L && hxEigN(L) >= 1) L.frucht = hxPassK(L, Math.round(hxF(R.T)) + 2); }
  }
  if (now >= R.T - 0.05) {
    R.done = true;
    if (o.bluehen) hxBluehen(R.T);
    HX.kn.set('tref:' + Math.round(R.T), { x: null, t: R.T, t0: Math.max(now - 1, R.T - 1), kind: 'tref', prev: null, slot: null });
    hxSay('Treffen'); hxRailDirty(); hxCardDirty(); hxSessSave();
  }
}
// the webs bloom: every loop's web and the live one couple toward their limit and their halo swells, then back (≈ 8 s)
function hxBluehen(T) {
  const k = gspKop(), up = Object.assign({}, gspPrm(), { kopplung: Math.min(0.98, k + 0.35) }), back = gspPrm();
  const send = (m) => { if (A.gsp) try { A.gsp.node.port.postMessage(m); } catch (e) {} hxWebsMsg(m); };
  const dt = Math.max(0, (T - hxNowT()) * 1000);
  setTimeout(() => { send({ set: up }); for (const W of HXN.webs.values()) { setP(W.out.gain, dbToGain(P['gsp.halo'] + 5), 1.2); } }, dt);
  setTimeout(() => { send({ set: back }); for (const W of HXN.webs.values()) setP(W.out.gain, dbToGain(P['gsp.halo']), 2.5); }, dt + 6000);
  HX.blueN = (HX.blueN || 0) + 1;
}
// the session's record (the Treffen itself is not kept: its loops come back angehalten after a reload – it is set anew)
function hxSessSave() { if (IDB.ok && hxLive()) hxDbPut('rings', hxSessRec()); }

