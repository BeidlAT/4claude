function boot() {
  if (HXW.on) { hxwBoot(); return; }   // Hexenring: the Werk-Rahmen boots render-only
  restoreState();
  applyQuality();
  midiBoot();
  bleBoot();
  readColors();
  buildNotes();
  buildUI();
  hxRailBuild();   // Hexenring: the Ringleiste (shown once sound starts)
  learnBar();
  startKeysLine();
  { const miss = engMissSay(); if (miss) toast(miss, 8000); }   // the stored patch named a source this version lacks
  resize();
  if (window.ResizeObserver) new ResizeObserver(resize).observe(stage); else window.addEventListener('resize', resize);
  cvFx.addEventListener('pointerdown', onDown);
  cvFx.addEventListener('pointermove', onMove);
  cvFx.addEventListener('pointerup', onUp);
  cvFx.addEventListener('pointercancel', onUp);
  cvFx.addEventListener('lostpointercapture', onUp);
  cvFx.addEventListener('contextmenu', (e) => e.preventDefault());
  cvFx.addEventListener('keydown', (e) => keyNote(e, true));
  cvFx.addEventListener('keyup', (e) => keyNote(e, false));
  cvFx.addEventListener('blur', () => { for (const id of Array.from(touches.keys())) if (String(id).startsWith('key-')) onUp({ pointerId: id }); });
  $('#btnStart').addEventListener('click', start);
  $('#btnStartKeys').addEventListener('click', startWithKeys);
  // a Web MIDI shim injected when the document is complete (iOS wrapper apps): the start screen catches up
  for (const [t, ev] of [[document, 'DOMContentLoaded'], [window, 'load']]) t.addEventListener(ev, () => { midiLate(); if (!A.started) updDevUI(); });
  // … or a moment later: looked for twice a second while the start screen shows (10 s at most)
  let lateN = 0;
  const lateT = setInterval(() => { if (A.started || MIDI.state !== 'unsupported' || ++lateN > 20) { clearInterval(lateT); if (!A.started) updDevUI(); return; } midiLate(); }, 500);
  $('#btnResume').addEventListener('click', () => { ensureRunning(); setTimeout(() => { if (A.ctx && A.ctx.state === 'running') showResume(false); }, 300); });
  document.addEventListener('pointerdown', () => { if (A.started && !A.userSuspended) ensureRunning(); }, true);
  document.addEventListener('visibilitychange', () => {
    if (!A.ctx) return;
    if (document.visibilityState === 'visible') {
      A.userSuspended = false; ensureRunning(); keepAwake();
      if (A.unmute && A.unmute.paused) { const p = A.unmute.play(); if (p && p.catch) p.catch(() => {}); }
    } else {
      releaseAllTouches();
      if (CAP.state === 'idle' && !SEQ.on && !A.bor && !A.frozen && !hxBusy()) { A.userSuspended = true; try { A.ctx.suspend(); } catch (e) {} }   // (Hexenring: a Schleife plays on)
    }
  });
  window.addEventListener('blur', () => { if (document.visibilityState !== 'visible') releaseAllTouches(); });
  // Gestik: back from the background, a turned view (both do nothing while it is off)
  document.addEventListener('visibilitychange', () => { if (GK.on) gkVis(); });
  window.addEventListener('orientationchange', gkTurned);
  if (screen.orientation && screen.orientation.addEventListener) screen.orientation.addEventListener('change', gkTurned);
  if (IOS) $('#startFine').textContent = (IPAD ? 'iPad: Bleibt es still, die Stummschaltung ausschalten (Kontrollzentrum oder Schalter an der Seite).' : 'iPhone: Bleibt es still, den Stummschalter an der Seite ausschalten.') + ' Kopfhörer bringen Tiefen und Raum am besten zur Geltung.';
  // the start screen is modal until sound is on
  for (const id of ['bar', 'main', 'quick', 'tabs']) document.getElementById(id).inert = true;
  try { $('#btnStart').focus({ preventScroll: true }); } catch (e) {}
  if (UI.preset) markPresetCards();
  restoreTakes();
  // installable web app (outside claude.ai): offer installing, and a reload after an update was stored offline
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; if (installBtn) installBtn.hidden = false; });
  window.addEventListener('appinstalled', () => { installEvt = null; if (installBtn) installBtn.hidden = true; toast('Myzel ist installiert und startet jetzt auch offline vom Home-Bildschirm.'); });
  if (!HXW.on) window.myzelUpdate = updBoot;   // the installed app's update check (pwa/build.py calls it)
  requestAnimationFrame(frame);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => drawBg());
}
boot();
