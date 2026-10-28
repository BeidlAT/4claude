function ensureRunning() {
  if (A.ctx && A.ctx.state !== 'running') { try { const p = A.ctx.resume(); if (p && p.catch) p.catch(() => {}); } catch (e) {} }
}
// out of sight (and not to play on there): the sound stops, the silent element too – else iOS keeps the page playing;
// the iOS audio session leaves „playback“ as well – the one category that may sound in the background (back: iosUnmute)
function bgStop() {
  A.userSuspended = true; try { A.ctx.suspend(); } catch (e) {}
  try { if (A.unmute && !A.unmute.paused) A.unmute.pause(); } catch (e) {}
  try { if (IOS && navigator.audioSession && navigator.audioSession.type === 'playback') { navigator.audioSession.type = 'ambient'; A.bgSess = true; } } catch (e) {}
  try { if (navigator.mediaSession) navigator.mediaSession.playbackState = 'paused'; } catch (e) {}
}
// Akku schonen (iPad by default): the screen is kept awake while something sounds or was touched in the last three
// minutes – in a silence without a hand it may lock as the iPad is set to (the sound is never touched by it)
const AKKU = { inT: 0 };
const akkuIn = () => { AKKU.inT = performance.now(); if (P['dev.akku'] && !A.wake && A.started && document.visibilityState === 'visible') keepAwake(); };
function akkuTick() {
  if (!P['dev.akku'] || !A.started || document.visibilityState !== 'visible') return;
  const quiet = IDLE.on && !touches.size && CAP.state === 'idle' && performance.now() - AKKU.inT > 180000;
  if (quiet && A.wake) { try { A.wake.release(); } catch (e) {} A.wake = null; }
  else if (!quiet && !A.wake) keepAwake();
}
setInterval(akkuTick, 15000);
async function keepAwake() {
  try {
    if ('wakeLock' in navigator && document.visibilityState === 'visible' && !A.wake) {
      A.wake = await navigator.wakeLock.request('screen');
      A.wake.addEventListener('release', () => { A.wake = null; });
    }
    return !!A.wake;
  } catch (e) { return false; }
}
// iOS mutes Web Audio while the ring/silent switch is on. A looping silent media element moves the page into the
// "playback" audio category, which ignores the switch. navigator.audioSession does the same where WebKit honours it.
function iosUnmute() {
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
  if (!IOS || A.unmute) return;
  try {
    const sr = 8000, n = sr / 2, b = new ArrayBuffer(44 + n * 2), d = new DataView(b);
    const w = (o, s) => { for (let i = 0; i < 4; i++) d.setUint8(o + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); d.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt '); d.setUint32(16, 16, true); d.setUint16(20, 1, true); d.setUint16(22, 1, true);
    d.setUint32(24, sr, true); d.setUint32(28, sr * 2, true); d.setUint16(32, 2, true); d.setUint16(34, 16, true); w(36, 'data'); d.setUint32(40, n * 2, true);
    const el = document.createElement('audio');
    el.setAttribute('playsinline', ''); el.setAttribute('x-webkit-airplay', 'deny'); el.loop = true; el.preload = 'auto';
    el.src = URL.createObjectURL(new Blob([b], { type: 'audio/wav' }));
    const p = el.play();
    if (p && p.catch) p.catch(() => {});
    A.unmute = el;
  } catch (e) {}
}
// Phones and tablets: MIDI access needs a tap (no request at "Klang starten" there), so the start screen offers one.
// Without a keyboard found yet, the Gerät panel opens to show what to do next. A Bluetooth keyboard needs its link made
// again in every session: when one played last time (BLE.last), the button names it and its chooser opens in the same
// tap – as it does in a browser with Web Bluetooth but no Web MIDI (Bluefy on the iPad).
const startBle = () => bleOk() && !BLE.devs.size && (!!(BLE.last && BLE.last.name) || !navigator.requestMIDIAccess);
const startKeysWanted = () => { midiLate(); return MOBILE && !inViewer && ((!!navigator.requestMIDIAccess && MIDI.state === 'idle') || startBle()); };
function startWithKeys() {
  const ble = startBle();
  A.keysStart = true;
  start();
  if (ble) { bleAgainTap(); return; }   // synchronously, still inside the tap: the chooser needs it
  const p = midiInit('keys');
  if (p && p.then) p.then(() => { if (!MIDI.ports.size) showMidiSec(); });
}
// A Web MIDI shim that arrived after the page started (an iOS app's script at document end): from now on Web MIDI is
// there – for the start screen too
function midiLate() {
  if (MIDI.state !== 'unsupported' || !navigator.requestMIDIAccess) return;
  MIDI.state = 'idle';
  midiBoot();
}
// the Gerät panel at its keyboard section (it sits below quality and latency)
function showMidiSec() {
  if (UI.panel !== 'dev') openPanel('dev');
  if (devEls && devEls.midiSec) devEls.midiSec.scrollIntoView({ block: 'start' });
}
// the start screen's keyboard line in this platform's words, where the plain promise would not hold
function startKeysLine() {
  const el = $('#startKeysLine'), pl = midiPlat(), sk = $('#btnStartKeys');
  if (!el) return;
  if (!el.dataset.d) el.dataset.d = el.textContent;
  const link = () => h('a', { href: 'https://' + APP_URL + '/', target: '_blank', rel: 'noopener' }, APP_URL);
  if (pl === 'ios') el.textContent = 'Auf ' + (IPAD ? 'dem iPad' : 'dem iPhone') + ' nur in einer App wie „Web MIDI Browser“ oder „Bluefy“ – mehr unter „Gerät“';
  else if (pl === 'viewer') el.replaceChildren('Keyboard per USB oder Bluetooth: in der App unter ', link());
  else if (pl === 'webview' || pl === 'ffandroid') el.textContent = 'Keyboard per USB oder Bluetooth: Myzel dafür in Chrome öffnen';
  else if (el.textContent !== el.dataset.d) el.textContent = el.dataset.d;   // a shim came late: the plain promise holds
  if (sk) { sk.hidden = !startKeysWanted(); sk.textContent = startBle() && BLE.last && BLE.last.name ? 'Mit ' + devShort(BLE.last.name) + ' starten' : 'Mit Keyboard starten'; }
  // Gestik in this device's words: a phone moves, a tablet leans, a computer and the claude.ai view drag the Wasserwaage
  const g = $('#startGkLine');
  if (g && !g.dataset.d) {
    g.dataset.d = '1';
    if (gkBlocked()) g.replaceChildren('Bewegung ist hier gesperrt – in der App: ', link(), '. Hier ziehst du die Spore in der Wasserwaage.');
    else if (!gkExists() || !MOBILE) g.textContent = 'Am Handy formen Neigen, Schütteln und Umdrehen den Klang mit – hier ziehst du die Wasserwaage (unter „Gerät“)';
    else if (gkBig()) g.textContent = 'Neigen und umdrehen: das ' + (IPAD ? 'iPad' : 'Tablet') + ' formt den Klang mit, auf dem Schoß regnen Sporen – unter „Gerät“';
    else if (GK.want) g.textContent = 'Gestik ist an: Neigen, Schütteln und Umdrehen formen den Klang mit – sie startet mit dem Klang';
  }
}
