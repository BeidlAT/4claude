// ---- the ecology's heartbeat: every scheduler tick ----
function hxEcoTick(now, horizon) {
  for (const L of hxLoopsLive()) {
    if (L.bew || L.state !== 'spielt') continue;
    const n = L.naehrt || {};
    if (n.rhz) hxFeedAhead(L, 'rhz', now, horizon, (x, t) => hxNaehrRhz(L, x, t));
    if (n.rgn) hxFeedAhead(L, 'rgn', now, horizon, (x, t) => hxNaehrRgn(L, x, t));
    if (L.midi) hxFeedAhead(L, 'midi', now, horizon, (x, t, t1) => hxMidiNote(x, t, t1));
  }
  if (HXN.feed.size) hxFeedRetune();
  hxLadTick();
  hxTreffenTick(now);
  hxZersTick(now);
  hxAccTick();
}

