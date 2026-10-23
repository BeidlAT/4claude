// ---- the Gärtner's heartbeat: every scheduler tick (cheap parts), its decisions ten times a second ----
function hxGdTick(now, horizon) {
  hxAntPlay(now, horizon);
  hxWkTick(now);
  hxGdApply(now);
  const pn = performance.now();
  if (pn - HXG.tE < 100) return;
  HXG.tE = pn;
  hxAntIngest(now);
  hxKnTick(now);
  if (HXA.cur && hxGdStep() < 2) hxAntStop('Gärtner hört nur zu');
  const B = hxGdBarAt(now);
  if (HXG.bar == null) HXG.bar = B.i;
  else if (B.i !== HXG.bar) { HXG.bar = B.i; try { hxGdBar(B, now); } catch (e) { console.warn(e); } }
  hxAntMaybe(now);
  if (P['hx.hand'] === 'an' && pn - (HXH.tS || 0) > 60000) { HXH.tS = pn; hxHandPend(); }
}
// the Gärtner's step or a behaviour changed: what it may no longer do is taken back at once
function hxGdParam(id) {
  const st = hxGdStep();
  if (st < 1 || (id === 'hx.gPlatz' && !P['hx.gPlatz']) || (id === 'hx.gRollen' && !P['hx.gRollen'])) hxGdReset();
  if (st < 2 || !P['hx.gAntw']) hxAntStop(st < 2 ? 'Gärtner hört nur zu' : '');
  if ((st < 2 || !P['hx.gWk']) && HXW_K.wk) hxWkNein();
  if (id === 'hx.gaertner') hxSay('Gärtner: ' + HX_GSTW[P['hx.gaertner']]);
  if (id === 'hx.hand') hxHandParam();
  hxRailDirty(); hxCardDirty();
}
// ✓ ✕ for whatever the machine plans first: a Wiederkehr, the Gärtner's plan, an answer – else a living loop's pass
function hxMachNein() { if (hxWkNein()) return true; if (HXG.plan) { for (const x of HXG.plan.items.slice()) { const L = hxByKey(x.key); if (L) hxGdNein(L, true); } hxSay('Gärtner: abgelehnt'); return true; } if (hxAntOn()) { hxAntStop('abgelehnt'); return true; } return false; }
function hxMachLob() { if (HXW_K.wk) { if (HX.chips && HX.chips.kind === 'wk') HX.chips = null; hxSay('Wiederkehr behalten'); hxRailDirty(); return true; } if (hxGdLob()) return true; if (hxAntOn()) { if (HX.chips && HX.chips.kind === 'ant') HX.chips = null; hxRailDirty(); return true; } return false; }

