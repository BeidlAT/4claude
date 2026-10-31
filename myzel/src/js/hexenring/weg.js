// ---- (owner, 31.10.2026) a Schleife's way, as every channel's: „Kette“ or „Direkt“ – and on Kette through just the effects
// it should (a mask over V R F P S, mixer/wege-fx.js). „Ich möchte die Schleifen auch so regeln können wie die anderen
// Spuren … ob eine Schleife mit oder ohne Effekte aufgenommen wird, kann man ja einstellen; wurde mit Effekten aufgenommen,
// schaltet Myzel sie danach auf Direkt; auf Kette jagt der User sie noch einmal durch die Effekte.“
// So the way is on top of what the Schleife sounds like (burnt in, or following the chain – its card): Direkt plays it as it
// is; Kette sends that sound through a chain of its own (one per set of effects, shared by the Schleifen that use it) into
// the strip „Hexenring“. The processor hands the Schleife whole to its own pair of output 2 (the pair Nähren uses – the
// send at 1) and its usual outputs give way (rt), with a short fade; the page takes the pair into that chain. A new
// Schleife plays Direkt; the Hexenring's channel sets every Schleife at once. ----
const HXWG = { r: new Map(), mk: {} };
const hxWegM = (L) => (!L || L.bew || L.weg !== 'fx' ? 0 : L.fxm == null ? FXM_ALL : L.fxm & FXM_ALL);   // (0: Direkt)
const hxWegOn = (L) => hxWegM(L) > 0;
// the chain for a set of effects: its output into the strip „Hexenring“ (built once, every knob reaches it)
function hxWegChain(m) {
  let c = HXWG.mk[m];
  if (c && c.in.context === A.ctx) return c;
  c = makeChain(m); c.ctx = A.ctx;
  updDrive(c); updRing(c); updFilter(c); updPhaser(c); updChorus(c);
  c.out.connect(stripIn('hxr'));
  return (HXWG.mk[m] = c);
}
// a Schleife's way applied: its pair into the chain of its effects (a crossfade when the set changes), the processor told
function hxWegApply(L, quiet) {
  if (!L || !A.ctx || !HX.node) return;
  const m = hxWegM(L), R = HXWG.r.get(L.id), X = Math.round(0.02 * SR);
  if (!m) {
    L.wegOn = false;
    if (R) { hxPost({ rt: { loop: L.id, on: false, X } }); setP(R.g.gain, 0, 0.012); HXWG.r.delete(L.id); setTimeout(() => { try { R.mg.disconnect(); R.g.disconnect(); } catch (e) {} }, 200); }
    hxSendSync(L);
  } else {
    L.wegOn = true; hxSendSync(L);
    const ch = L.sendCh;
    if (ch == null || ch < 0) { L.weg = 'dir'; if (!quiet) toast('Höchstens ' + HX_SENDS + ' Schleifen gehen gleichzeitig eigene Wege.', 3000); hxWegApply(L, true); return; }
    if (R && R.m === m && R.ch === ch && R.g.context === A.ctx) { hxPost({ rt: { loop: L.id, on: true, X } }); return; }
    const sp = hxSplit(), mg = A.ctx.createChannelMerger(2), g = G(0);
    sp.connect(mg, 2 * ch, 0); sp.connect(mg, 2 * ch + 1, 1);
    mg.connect(g).connect(hxWegChain(m).in);
    setP(g.gain, 1, 0.012);
    if (R) { setP(R.g.gain, 0, 0.012); setTimeout(() => { try { R.mg.disconnect(); R.g.disconnect(); } catch (e) {} }, 200); }
    HXWG.r.set(L.id, { m, ch, mg, g });
    hxPost({ rt: { loop: L.id, on: true, X } });
  }
  L.wegOn = m > 0;
  hxWegGc();
}
// set by the Pult (a Schleife's knot, the effect view) or the Hexenring's channel: weg 'fx' | 'dir', m the effects on Kette
function hxWegSet(L, weg, m, quiet) {
  if (!L || L.bew) return;
  L.weg = weg === 'fx' ? 'fx' : 'dir';
  if (m != null) L.fxm = m & FXM_ALL;
  if (L.weg === 'fx' && !L.fxm) L.fxm = FXM_ALL;
  hxWegApply(L, quiet);
  hxSaveMeta(L.id); hxCardDirty();
  if (typeof MX !== 'undefined') MX.dirtyStatic = true;
  if (!quiet) hxSay(hxName(L) + ': ' + wfxWords(hxWegM(L)));
}
// the Hexenring's channel: every Schleife takes its way (and a new one plays Direkt – it is as it was recorded)
function hxRouteAll(route) {
  const m = route === 'dir' ? 0 : wfxOf('hxr');
  for (const L of hxLoopsLive()) if (!L.bew && hxWegM(L) !== m) hxWegSet(L, m ? 'fx' : 'dir', m || null, true);
  if (MX.root) hxStripSync();
}
// chains no Schleife uses any more: taken out after a while (they cost what the chain costs)
function hxWegGc() {
  clearTimeout(HXWG.gcT);
  HXWG.gcT = setTimeout(() => {
    const used = new Set([...HXWG.r.values()].map((R) => R.m));
    for (const m in HXWG.mk) if (!used.has(+m)) { const c = HXWG.mk[m]; try { c.out.disconnect(); } catch (e) {} A.chains = A.chains.filter((x) => x !== c); delete HXWG.mk[m]; }
  }, 4000);
}
// a new processor (a restart of the sound) or the Schleifen restored: every way again
function hxWegAll() { HXWG.r.clear(); HXWG.mk = {}; for (const L of hxLoopsLive()) if (hxWegOn(L)) hxWegApply(L, true); }
// a Schleife gone: its way with it
function hxWegDrop(L) { const R = HXWG.r.get(L.id); if (!R) return; HXWG.r.delete(L.id); try { R.mg.disconnect(); R.g.disconnect(); } catch (e) {} hxWegGc(); }
