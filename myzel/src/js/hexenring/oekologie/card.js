// ---- the card: Nähren, Schleife in Schleife, Zersetzung, Ladung, the Knospen's vetoes, Gesang als Noten, MIDI out ----
function hxCardEco(L, sch, chip, row, btn) {
  if (L.bew) return [];
  const n = L.naehrt || {}, notes = sch.some(hxWCan) || (L.notes && L.notes.length), out = [];
  if (L.acc) {   // a Sammelschleife: where it records from, its feedback, Festhalten
    const R = L.acc, A = hxByKey(R.src);
    out.push(row('Sammelt', h('span', { class: 'hx-ms' }, (A ? hxName(A) : 'Quelle gelöscht') + ' · ' + (R.on ? 'nimmt jeden Durchgang auf' : 'festgehalten')),
      ...HX_ACC_FB.map((v) => chip(dec(v), Math.abs(R.fb - v) < 1e-6, () => hxAccSet(L, 'fb', v), 'Rückführung ' + dec(v) + ': so viel bleibt von jedem Durchgang')),
      chip(R.on ? 'Festhalten' : 'Weiter sammeln', false, () => hxAccSet(L, 'on', !R.on), R.on ? 'Festhalten: das Band bleibt, wie es ist' : 'Wieder aufnehmen'), chip('Leeren', false, () => hxAccSet(L, 'leer'), 'Das Band leeren')));
  }
  const nae = [chip('Gespinst', !!n.gsp, () => hxNaehrGsp(L, !n.gsp), 'Nähren: ein eigenes Saitennetz schwingt mit der Schleife'), chip('Körner', !!n.kor, () => hxNaehrKor(L, !n.kor), 'Nähren: die Schleife wird Kornmaterial (Körner-Quelle „Schleife“)')];
  if (notes) nae.push(chip('Rhizom', !!n.rhz, () => hxNaehr(L, 'rhz', !n.rhz), 'Nähren: jede Note stößt das Rhizom-Netz an'), chip('Regen', !!n.rgn, () => hxNaehr(L, 'rgn', !n.rgn), 'Nähren: die Noten werden Keime des Sporenregens'));
  nae.push(chip('Glut', !!n.glt, () => hxNaehr(L, 'glt', !n.glt), 'Nähren: die Schleife ist Zunder der Glut – sie glüht in ihren Tönen'), chip('Sehne', !!n.shn, () => hxNaehr(L, 'shn', !n.shn), 'Nähren: Saiten schwingen mit der Schleife mit'));
  if (!L.acc) nae.push(chip('Schleife …', !!L.accOpen, () => { L.accOpen = !L.accOpen; hxCardDirty(); }, 'Schleife in Schleife: eine neue Schleife nimmt diese in jedem Durchgang auf'));
  out.push(row('Nähren', ...nae));
  if (notes && n.rhz) { const g = L.rhzNetz === 'geteilt'; out.push(row('Netz', chip('eigen', !g, () => hxRhzNetz(L, 'eigen'), 'Rhizom: ein eigenes Netz der Schleife – dein Spiel bleibt frisch'), chip('geteilt', g, () => hxRhzNetz(L, 'geteilt'), 'Rhizom: das Netz deines Spiels – Lawinen und Erschöpfung gemeinsam'))); }
  if (L.accOpen && !L.acc) out.push(row('Sammeln', h('span', { class: 'hx-ms' }, 'Länge'), ...HX_ACC_R.map(([r, t]) => chip(t, false, () => { L.accOpen = false; hxAccMake(L, r, 0.7); }, 'Neue Sammelschleife, ' + t + ' so lang – Rückführung 0,7'))));
  const lq = hxLadOf(L);
  out.push(row('Ladung', chip('an', !!L.ladung, () => hxLadSet(L, true), 'Ladung: Schütteln lässt diese Schleife brodeln'), chip('aus', !L.ladung, () => hxLadSet(L, false), 'Ladung wirkt nicht auf diese Schleife'),
    L.ladung ? h('span', { class: 'hx-ms' }, hxWAktiv(L) && hxEigN(L) === 0 && !L.live ? 'Treu bleibt Treu' : Math.round(lq * 100) + ' %') : null));
  if (notes) out.push(row('MIDI', chip('Noten hinaus', !!L.midi, () => hxMidiSet(L, !L.midi), 'Die Noten der Schleife an die MIDI-Ausgänge, während sie spielt'), L.midi ? h('span', { class: 'hx-ms' }, hxMidiOuts().length ? hxMidiOuts().length + (hxMidiOuts().length === 1 ? ' Ausgang' : ' Ausgänge') : 'kein Ausgang') : null));
  const S0 = sch[0];
  if (S0 && S0.cut && S0.cut.in === 3) out.push(h('div', { class: 'hx-row end' }, btn(L.gesBusy ? 'Gesang wird zu Noten …' : L.gesang ? 'Gesang neu lesen' : 'Gesang als Noten', () => hxGesang(L), { dis: !!L.gesBusy, aria: 'Die Stimme wird zu Noten – die Schleife wächst dann mit Myzels Klängen' })));
  const vt = hxVetoList(L);
  if (vt.length) out.push(h('div', { class: 'hx-sch hx-veto' }, h('div', { class: 'lab' }, 'Knospen – geplant'), ...vt.slice(0, 12).map((v) => h('div', { class: 'hx-srow' }, h('span', { class: 'lab' }, hxVetoText(L, v)), h('button', { type: 'button', class: 'chip danger', 'aria-label': 'Diese Note ablehnen: ' + hxVetoText(L, v), onclick: () => hxVeto(L, v) }, '✕')))));
  return out;
}
// Verwandeln's Zersetzung rows (in the fold, after Abrieb)
function hxCardZers(L, chip, row) {
  if (L.bew || L.acc) return [];
  const Z = L.sch.map((id) => HX.sch.get(id)).filter((S) => S && S.zr), gen = Z.length ? Math.max(...Z.map((S) => S.zr.gen || 0)) : 0, age = Z.length ? Math.max(...Z.map((S) => S.zr.age || 0)) : 0, w = hxWAktiv(L) || L.live;
  return [row('Einwurzeln', ...HX_EINW.map(([v, t]) => chip(t, (L.einw || 0) === v, () => hxEinwSet(L, v), 'Einwurzeln ' + t + ': jeder Durchgang durch ein eigenes, auf die Tonleiter gestimmtes Saitennetz neu aufgenommen')), (L.einw || 0) > 0 ? h('span', { class: 'hx-ms' }, w ? 'nur im Abdruck' : gen + (gen === 1 ? ' Durchgang' : ' Durchgänge')) : null),
    row('Moder', ...HX_MODER.map(([v, t]) => chip(t, ((L.moder && L.moder.rate) || 0) === v, () => hxModerSet(L, v), 'Abrieb nach Moder ' + t + ': die oberen Teiltöne zerfallen zu Knistern, die Tiefe wird warm')), L.moder ? chip('Auffrischen', false, () => hxModerSet(L, 0, true), 'Moder auffrischen: wie neu') : null, L.moder && age ? h('span', { class: 'hx-ms' }, w ? 'nur im Abdruck' : 'Alter ' + age) : null)];
}
// the form section's Treffen: when the loops meet next – all, and the pairs – and Treffen setzen with its Fruchten
function hxCardTreffen(btn) {
  const T = hxTreffen(), now = hxNowT(), R = HX.tref, chip = (t, on, fn, aria) => { const b = h('button', { type: 'button', class: 'chip', 'aria-pressed': on ? 'true' : 'false', 'aria-label': aria || null }, t); b.addEventListener('click', fn); return b; };
  if (T.n < 2 && !R) return null;
  const all = T.all ? 'alle ' + T.n + ' in ' + hxClock(T.all.t - now) + (T.all.b != null ? ' (Takt ' + hxBarNo(T.all.b) + ')' : '') : T.n >= 2 ? 'alle ' + T.n + ': nicht in den nächsten zwei Stunden' : '';
  const pairs = T.pairs.slice(0, 6).map((p) => (p.a + 1) + '·' + (p.b + 1) + ' in ' + hxClock(p.t - now)).join(', ');
  const free = hxTrefLoops().some((L) => !hxTakt(L)), o = HX.trefO || (HX.trefO = { min: 5, anker: true, bluehen: true, ton: null });
  const box = h('div', { class: 'hx-folge hx-tref' }, h('div', { class: 'hx-gh' }, h('b', null, 'Treffen'), h('span', null, ' – ' + (all || 'gesetzt'))),
    pairs ? h('p', { class: 'note' }, 'Paare: ' + pairs) : null);
  if (R && !R.done) box.append(h('div', { class: 'hx-row' }, h('span', { class: 'lab' }, 'Gesetzt'), h('div', { class: 'chips small' }, h('span', { class: 'hx-ms' }, 'in ' + hxClock(R.T - now) + ' · Primzahlen ' + R.primes.join(', ')), chip('Aufheben', false, hxTreffenAb, 'Das gesetzte Treffen aufheben (die Längen bleiben)'))));
  if (free) {
    const sel = h('select', { class: 'hx-eng', 'aria-label': 'Tonart beim Treffen' }, h('option', { value: '' }, 'Tonart bleibt'), ...Object.keys(SCALES).filter((k) => !SCALES[k].free).map((k) => h('option', { value: k, selected: o.ton && o.ton.scale === k ? '' : null }, SCALES[k].n || k)));
    sel.addEventListener('change', () => { o.ton = sel.value ? { scale: sel.value, root: P['t.root'] } : null; });
    box.append(h('div', { class: 'hx-row' }, h('span', { class: 'lab' }, 'Setzen in'), h('div', { class: 'chips small' }, ...[2, 5, 10, 19, 30].map((m) => chip(m + ' min', o.min === m, () => { o.min = m; hxCardDirty(); }, 'Treffen in ' + m + ' Minuten')))),
      h('div', { class: 'hx-row' }, h('span', { class: 'lab' }, 'Fruchten'), h('div', { class: 'chips small' }, chip('Anker', !!o.anker, () => { o.anker = !o.anker; hxCardDirty(); }, 'Beim Treffen spielen alle lebendigen Schleifen einmal ihren Anker'), chip('Netz blüht', !!o.bluehen, () => { o.bluehen = !o.bluehen; hxCardDirty(); }, 'Beim Treffen blühen die Saitennetze auf'), sel)),
      h('div', { class: 'hx-acts' }, btn('Treffen setzen', () => hxTreffenSetzen(hxNowT() + 60 * o.min, { anker: o.anker, bluehen: o.bluehen, ton: o.ton }), { cls: 'primary', aria: 'Die freien Schleifen treffen sich in ' + o.min + ' Minuten genau einmal' })));
  }
  return box;
}
// the settings: the microphone (on/off with its sign, the round trip, what the Korb takes)
function hxCardMic(btn) {
  const M = HX.mic, box = h('div', { class: 'hx-klopf hx-micc' });
  const on = btn(M.on ? 'Mikrofon aus' : 'Mikrofon an', () => (M.on ? hxMicOff() : hxMicOn()), { cls: M.on ? 'danger' : '', aria: M.on ? 'Mikrofon ausschalten' : 'Mikrofon für Mikro-Schleifen einschalten' });
  const mess = M.on ? btn(M.mess ? 'misst …' : 'Verzögerung messen', () => hxMicMessen(), { dis: !!M.mess, aria: 'Klicks aus dem Lautsprecher messen, wie spät das Mikrofon sie hört' }) : null;
  const korb = M.on ? h('div', { class: 'hx-row' }, h('span', { class: 'lab' }, 'Korb nimmt'), h('div', { class: 'chips small' }, ...[[true, 'Mikro'], [false, 'Gespielt']].map(([v, t]) => { const b = h('button', { type: 'button', class: 'chip', 'aria-pressed': M.korb === v ? 'true' : 'false', 'aria-label': 'Korb und Aufnahme nehmen ' + t }, t); b.addEventListener('click', () => { M.korb = v; hxCardDirty(); hxRailDirty(); }); return b; }))) : null;
  box.append(h('div', { class: 'hx-row' }, h('span', { class: 'lab' }, 'Mikrofon'), h('div', { class: 'hx-kb' }, h('span', { class: 'hx-ms' + (M.on ? ' hx-micon' : '') }, M.on ? '● an · ' + Math.round((M.rt / SR) * 1000) + ' ms' + (M.rtM ? '' : ' (geschätzt)') : 'aus'), on, mess)), korb,
    h('p', { class: 'note' }, 'Stimme, Pfeifen, ein Instrument: Das Mikrofon geht nur in den Humus (zu hören ist es nicht). Erst „Verzögerung messen“ – dann sitzt, was du zu den Schleifen singst, im Takt. Gesang wird auf Wunsch zu Noten. Mit Bluetooth-Kopfhörern geht Überspielen mit dem Mikrofon nicht.'));
  return box;
}
function hxMicTagSync() {
  const el = HXU.mic || (HXU.mic = $('#hxMic')); if (!el) return;
  el.hidden = !HX.mic.on;
}

function showResume(show) { $('#resume').hidden = !show; if (show) $('#btnResume').focus({ preventScroll: true }); }
function start() {
  if (A.started || UPD.going) return;
  updClose();   // the update card counts as „Später“
  if (GK.want && !GK.on) gkEnable(true);   // Gestik was on: its permission inside this tap (iOS may forget it between sessions)
  iosUnmute();
  try { initAudio(); }
  catch (e) { console.error(e); toast('Dieser Browser kann leider keinen Klang erzeugen (Web Audio fehlt).', 6000); return; }
  ensureRunning();
  hxStart();   // Hexenring: the module and its processor now – the Humus records from the first note
  hxRailShow();
  // iOS: unlock with a silent buffer inside the gesture
  try { const b = A.ctx.createBuffer(1, 1, SR), s = A.ctx.createBufferSource(); s.buffer = b; s.connect(A.ctx.destination); s.start(); } catch (e) {}
  A.ctx.onstatechange = () => {
    clearTimeout(A.resumeTimer);
    if (A.ctx.state === 'running') { showResume(false); return; }
    if (A.userSuspended || document.visibilityState !== 'visible') return;
    A.resumeTimer = setTimeout(() => { if (A.ctx.state !== 'running' && !A.userSuspended && document.visibilityState === 'visible' && !touches.size) showResume(true); }, 1500);
  };
  $('#start').hidden = true;
  for (const id of ['bar', 'main', 'quick', 'tabs']) document.getElementById(id).inert = false;
  try { cvFx.focus({ preventScroll: true }); } catch (e) {}
  startClock();
  setTimeout(oscWarm, 0);
  setTimeout(preloadTextures, 0);   // after the reverb's job, which initAudio queued first
  warmKS();
  if (USERTEX.pending) setUserTex(USERTEX.pending);
  watchUnderruns();
  applyBend();
  if (!MOBILE || P['dev.q'] !== '1') setTimeout(calibrate, 1500);
  if (MIDI_AUTO && MIDI.state === 'idle') midiInit(false);
  // the Bluetooth keyboard of last time needs one more tap – say where, unless another keyboard plays already
  if (!A.keysStart) setTimeout(() => { if (startBle() && BLE.last && BLE.last.name && !MIDI.ports.size && UI.panel !== 'dev') toast('Dein Bluetooth-Keyboard: unter „Gerät“ → „Wieder verbinden: ' + devShort(BLE.last.name) + '“.', 5000); }, 1200);
  updDevUI();
  if (P['kor.src'] === 'echo') ensureCapture();
  keepAwake();
  renderRecInfo();
}
// the browser builds an oscillator type's wave tables at its first use in a context (≈ 1–3 ms each): at sound start,
// not inside the first note (whose sound waits for the task that makes it)
function oscWarm() { if (!A.ctx) return; try { for (const t of ['sine', 'sawtooth', 'square', 'triangle']) { const o = A.ctx.createOscillator(); o.type = t; } } catch (e) {} }
// Chrome 146+ reports output underruns. What gives way, in this order (owner's rule: the loops first, the live playing
// last; on a computer or an iPad Myzel never plays simpler – desktop report 24.10.2026, where the old last step had cut the
// live budget six times to 26 % and set A.lite for the rest of the session):
//   1. Lebendig holds (the last complete pass plays on), then fewer renders at once (hxWGuard) – every device;
//   2. Taumeln rests (hxTauGuard) – every device; on a computer or an iPad it comes back by itself after the quiet;
//   3. a phone with loops sounding: the live budget stays (hxGuardGrenze);
//   4. the live voices: on a phone the old step (budget × 0.8 and A.lite – it lightens the worklet sources and the drive);
//      on a computer or an iPad only a voice limit (budget × 0.8, at most every 5 s, never under half) – never A.lite.
// Everywhere the budget comes back a step after 30 s without underruns (gdRecover), the guard's own steps are logged with
// the underruns' times for „Leistung messen“.
// Hexenring (phone report 22.10.2026): where the browser counts none, the audio clock tells – a render that falls behind
// lets the context's time run slower than the page's (the device plays the frames that were not ready as silence, the
// graph renders them later): a second in which the clock lost 25 ms or more counts. That count serves the loops' steps on
// a phone only (the Wuchs, Taumeln) – never the live budget or A.lite, which wait for the browser's own figures.
const GD = { uT: 0, upT: 0, stepT: 0, said: false };
function watchUnderruns() {
  const ps = A.ctx.playbackStats || A.ctx.playoutStats;
  if (!ps && !(MOBILE && !HX_TABLET)) return;
  const ck = { p: 0, c: 0, lag: 0, n: 0 };
  const clock = () => {
    const ctx = A.ctx, ts = ctx.getOutputTimestamp ? ctx.getOutputTimestamp() : null;
    const p = ts && ts.performanceTime > 0 ? ts.performanceTime : performance.now(), c = ts && ts.performanceTime > 0 ? ts.contextTime : ctx.currentTime;
    if (!ck.p) { ck.p = p; ck.c = c; ck.lag = 0; return ck.n; }
    const lag = (p - ck.p) / 1000 - (c - ck.c);
    if (lag - ck.lag >= 0.025) ck.n++;
    ck.lag = Math.max(ck.lag, lag);
    return ck.n;
  };
  const count = ps ? () => (ps.underrunEvents != null ? ps.underrunEvents : ps.fallbackFramesEvents) || 0 : clock;
  let last = count();
  LAT.t0 = performance.now(); LAT.dur = null;
  const hits = [];   // (the seconds with new underruns, the last ten: a lasting stutter, not one glitch)
  setInterval(() => {
    if (document.visibilityState !== 'visible' || !A.ctx || A.ctx.state !== 'running') { ck.p = 0; return; }   // (a pause stops the clock: counted afresh)
    const u = count(), now = performance.now();
    A.underruns = u;
    latWatch(ps, u, last, now);   // (Android's „Minimal“ by default: lasting underruns step the latency back from the next start)
    if (u > last) { hits.push(now); hxWHoldKeep(now); GD.uT = now; }   // Hexenring: (Leistung) a held Lebendig stays held while it lasts
    while (hits.length && now - hits[0] > 10000) hits.shift();
    gdRecover(now);
    if (!(u > last)) return;
    last = u;
    if (hxWGuard()) return;   // Hexenring: (step 2a) the Wuchs gives way first – never the live budget, never A.lite for it
    if (hits.length >= 2 && hxTauGuard()) return;   // Hexenring: (phone report) then, when it lasts, the loops' Taumeln
    if (hxGuardGrenze()) return;   // Hexenring: (Leistung, report A) a phone with loops sounding: the live budget stays
    if (!ps || VBUDGET <= 6) return;
    if (HX_PHONE) {
      hxGuardLog('lite', Math.round(VBUDGET * 0.8));
      A.budgetScale = (A.budgetScale || 1) * 0.8; GD.stepT = now;
      A.lite = true; applyQuality(); updDevUI();
      if (!A.liteHinted) {
        A.liteHinted = true;
        toast('Das Gerät kam kurz an seine Grenze – Myzel spielt jetzt etwas weniger Stimmen gleichzeitig.' + (A.latMode === 'min' && !latAuto() ? ' Knackt es weiter, stelle unter „Gerät“ die Latenz auf „Standard“.' : ''), 7000);
      }
      return;
    }
    // a computer or an iPad: only when it lasts, a step at most every 5 s, never under half the budget – the same sound
    if (hits.length < 2 || now - GD.stepT < 5000 || (A.budgetScale || 1) <= 0.5) return;
    A.budgetScale = Math.max(0.5, (A.budgetScale || 1) * 0.8); GD.stepT = now; budgetApply();
    hxGuardLog('stimmen', VBUDGET); updDevUI();
    if (!GD.said) { GD.said = true; toast('Das Gerät kam an seine Grenze – Myzel spielt kurz weniger Stimmen gleichzeitig (der Klang bleibt gleich). Nach einer halben Minute ohne Aussetzer sind wieder alle da.', 8000); }
  }, 1000);
}
// the budget back, a step at a time: 30 s without underruns, then every 30 s one step (× 1.25) up to the full budget – on
// every device (A.lite on a phone stays, as before); a computer's or an iPad's Taumeln comes back after its quiet span
function gdRecover(now) {
  const sc = A.budgetScale || 1;
  if (sc < 1 && now - GD.uT >= 30000 && now - Math.max(GD.upT, GD.stepT) >= 30000) {
    A.budgetScale = sc / 0.8 > 0.99 ? 1 : sc / 0.8; GD.upT = now; budgetApply();
    hxGuardLog('mehr', VBUDGET); updDevUI();
  }
  hxTauBack(now);
}

