// ---- Ladung on loops (SPEC §17, only if switched on per loop): the shaken charge makes a living loop vary more (Lebendig
// breathes wider, Variieren and Wandern change more and stay less) and an Abdruck loop boil – grid-sliced drop-outs and
// stutters (sixteenths of a Takt loop, sixteen slices of a free one; a rhythmic loop's own onsets where it is re-placed
// by Schnitt), decaying with the Entladung. A Treu loop never moves. Read five times a second; the slices are the
// processor's (§11/§14 slices), so a charge of 0 is the tape exactly ----
function hxLadQ() { return ladOn() ? Math.round(clamp(LAD.lvl, 0, 1) * 20) / 20 : 0; }
function hxLadTick() {
  const pn = performance.now(); if (pn - (HX.ladT || 0) < 200) return; HX.ladT = pn;
  const q = hxLadQ();
  for (const L of hxLoopsLive()) {
    if (L.bew || !L.ladung) { if (L.ladQ) { L.ladQ = 0; hxBandSend(L); } continue; }
    if (q === (L.ladQ || 0)) continue;
    L.ladQ = q;
    if (!hxWAktiv(L) && !L.live) hxBandSend(L);   // (an Abdruck: the slices; a living loop: its next passes – hxVarStep, hxWPass)
    else hxPassNotesDrop(L);
  }
}
const hxLadOf = (L) => (L && L.ladung ? L.ladQ || 0 : 0);
function hxLadSet(L, on) {
  L.ladung = !!on; if (!on) { L.ladQ = 0; hxBandSend(L); }
  hxSaveMeta(L.id); hxCardDirty(); hxSay(hxName(L) + ': Ladung ' + (on ? 'an' : 'aus'));
  if (on && !ladOn()) toast('Ladung wirkt, wenn Gestik an ist und „Ladung“ gewählt ist – Schütteln lädt.', 4000);
}
// the grid slices of an Abdruck loop for Ladung (phases of its pass)
function hxLadU(L) { const n = hxTakt(L) ? Math.max(4, Math.round(L.d.beats * 4)) : 16; return Array.from({ length: n }, (_, i) => i / n); }

