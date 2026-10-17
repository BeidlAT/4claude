// Gestik's clutch: "Mit Tönen" (fingers on the field and keys of a MIDI keyboard; the zero 80 ms after the first note,
// never the jolt of the tap; 300 ms back on release), Festhalten with the sustain pedal (CC 64) and a learned pad,
// "Immer" (double tap = zero), "Taste", Ruhe and Wenden resting it, the tap lockout – and that motion alone, with
// nothing bound, writes nothing.   node t-gk-clutch.js
const { open, ok, close, gestikOn } = require('./gk-h');
const out = (page) => page.evaluate(() => Object.assign({ mode: window.__M.GK.mode }, window.__M.GK.out));
const near = (a, b, e = 0.05) => Math.abs(a - b) <= e;
(async () => {
  const { page, errors } = await open({ cfg: { perm: 'granted', ins: [['k1', 'Testkeyboard']] } });
  await gestikOn(page);
  await page.evaluate(() => window.__sensor(true, { beta: 45, roll: 0 }));
  await page.waitForTimeout(400);
  const patch0 = await page.evaluate(() => localStorage.getItem('myzel.patch.v1'));
  const sub = await page.evaluate(() => { window.__subN = 0; window.__M.gkSub(() => window.__subN++); return true; });
  // ---- Mit Tönen ----
  await page.evaluate(() => window.__setPose({ beta: 45, roll: 22 }));
  await page.waitForTimeout(400);
  let o = await out(page);
  ok(o.mode === 'off' && o.tiltX === 0, 'Mit Tönen, no note: tilting does nothing (the phone in your hand makes no sound by itself)');
  const box = await page.locator('#cvFx').boundingBox(), fx = box.x + box.width * 0.3, fy = box.y + box.height * 0.5;
  await page.mouse.move(fx, fy);
  await page.mouse.down();
  const lock = await page.evaluate(() => window.__M.GK.lockT - performance.now());
  ok(lock > 60 && lock <= 100, 'a tap on the field blinds Schütteln and Wenden for 100 ms (' + Math.round(lock) + ' ms left)');
  await page.waitForTimeout(40);
  o = await out(page);
  const eng40 = await page.evaluate(() => window.__M.GK.engaged);
  await page.waitForTimeout(160);
  o = await out(page);
  ok(!eng40 && o.mode === 'live' && near(o.tiltX, 0, 0.03), 'finger down: the zero is the pose 80 ms later – the held 22° become 0 (' + o.tiltX.toFixed(3) + ')');
  await page.evaluate(() => window.__setPose({ beta: 45, roll: 0 }));
  await page.waitForTimeout(400);
  o = await out(page);
  ok(o.tiltX < -0.6, 'while the note sounds the tilt acts (back to 0° = 22° to the left: ' + o.tiltX.toFixed(2) + ')');
  await page.mouse.up();
  await page.waitForTimeout(120);
  const mid = (await out(page)).tiltX;
  await page.waitForTimeout(300);
  o = await out(page);
  ok(mid < -0.15 && mid > -0.6 && o.tiltX === 0 && o.mode === 'off', 'finger up: glides back in 300 ms (' + mid.toFixed(2) + ' after 120 ms, then 0)');
  // the jolt of the tap is not the zero: the phone rocks 8° for 40 ms as the finger lands
  await page.evaluate(() => window.__setPose({ beta: 45, roll: 5 }));
  await page.waitForTimeout(300);
  await page.mouse.down();
  await page.evaluate(async () => { window.__setPose({ beta: 45, roll: 13 }); await window.__sleep(40); window.__setPose({ beta: 45, roll: 5 }); });
  await page.waitForTimeout(400);
  o = await out(page);
  ok(near(o.tiltX, 0, 0.06), 'the rock of the landing finger is not the zero (' + o.tiltX.toFixed(3) + ' at the held pose)');
  await page.mouse.up();
  await page.waitForTimeout(400);
  // ---- a key on a MIDI keyboard ----
  await page.evaluate(() => window.__send([0x90, 60, 100]));
  await page.waitForTimeout(150);
  await page.evaluate(() => window.__setPose({ beta: 25, roll: 5 }));
  await page.waitForTimeout(400);
  o = await out(page);
  ok(o.mode === 'live' && o.tiltY > 0.5 && near(o.tiltX, 0, 0.03), 'a MIDI key held: the top edge tilted away acts (Neigen ↕ ' + o.tiltY.toFixed(2) + ')');
  // ---- by default the sustain pedal only sustains: the gesture keeps acting (legato pedalling must not freeze Anlehnen) ----
  await page.evaluate(() => window.__send([0xb0, 64, 127]));
  await page.waitForTimeout(60);
  await page.evaluate(() => window.__setPose({ beta: 45, roll: 5 }));
  await page.waitForTimeout(400);
  o = await out(page);
  ok(o.mode === 'live' && o.tiltY < 0.3, 'default: the pedal down does not freeze the shape (' + o.mode + ', Neigen ↕ ' + o.tiltY.toFixed(2) + ')');
  await page.evaluate(() => window.__send([0xb0, 64, 0]));
  await page.evaluate(() => window.__setPose({ beta: 25, roll: 5 }));
  await page.waitForTimeout(400);
  // ---- Festhalten: with "Haltepedal hält fest" on, the sustain pedal keeps the shape ----
  await page.evaluate(() => window.__M.gkSet('ped', true));
  await page.evaluate(() => window.__send([0xb0, 64, 127]));
  await page.waitForTimeout(60);
  const held = await out(page);
  await page.evaluate(() => window.__setPose({ beta: 65, roll: -20 }));
  await page.evaluate(() => window.__send([0x80, 60, 0]));
  await page.waitForTimeout(450);
  o = await out(page);
  const notes = await page.evaluate(() => window.__M.touches.size);
  ok(o.mode === 'hold' && near(o.tiltY, held.tiltY, 0.01) && near(o.tiltX, held.tiltX, 0.01) && notes === 1, 'CC 64: the shape stays while the hand moves on and the key is let go (' + o.tiltY.toFixed(2) + ', the pedal holds the note)');
  await page.evaluate(() => window.__send([0xb0, 64, 0]));
  await page.waitForTimeout(450);
  o = await out(page);
  ok(o.mode === 'off' && o.tiltY === 0 && o.tiltX === 0, 'pedal up: the note ends, the shape glides back');
  // a pedal already down before playing: no shape to keep, the gesture acts
  await page.evaluate(() => window.__send([0xb0, 64, 127]));
  await page.evaluate(() => window.__send([0x90, 62, 90]));
  await page.waitForTimeout(150);
  await page.evaluate(() => window.__setPose({ beta: 65, roll: 0 }));
  await page.waitForTimeout(350);
  o = await out(page);
  ok(o.mode === 'live' && o.tiltX > 0.6, 'pedal down before the first note: nothing frozen, the gesture acts (' + o.tiltX.toFixed(2) + ')');
  await page.evaluate(() => { window.__send([0x80, 62, 0]); window.__send([0xb0, 64, 0]); window.__M.gkSet('ped', false); });
  await page.waitForTimeout(400);
  // ---- Festhalten from a learned pad ----
  await page.evaluate(() => window.__send([0x90, 64, 100]));
  await page.waitForTimeout(150);
  await page.evaluate(() => window.__setPose({ beta: 45, roll: 0 }));
  await page.waitForTimeout(350);
  const h1 = await out(page);
  await page.evaluate(() => window.__M.MTARGETS.get('gk.hold').set(1, {}));
  await page.evaluate(() => window.__setPose({ beta: 45, roll: 30 }));
  await page.waitForTimeout(350);
  o = await out(page);
  ok(o.mode === 'hold' && near(o.tiltX, h1.tiltX, 0.01) && near(o.tiltY, h1.tiltY, 0.01) && h1.tiltY > 0.5, 'a pad on "Gestik festhalten": the shape stays (↕ ' + o.tiltY.toFixed(2) + ' while tilted sideways)');
  await page.evaluate(() => window.__M.MTARGETS.get('gk.hold').set(0, {}));
  await page.waitForTimeout(450);
  o = await out(page);
  ok(o.mode === 'live' && o.tiltX > 0.6, 'pad let go: back to the live gesture (' + o.tiltX.toFixed(2) + ')');
  await page.evaluate(() => window.__send([0x80, 64, 0]));
  await page.waitForTimeout(400);
  // ---- Ruhe rests it while a note sounds; Wenden too ----
  await page.evaluate(() => window.__send([0x90, 65, 100]));
  await page.waitForTimeout(150);
  await page.evaluate(() => window.__sensor(true, { beta: 0, roll: 0 }, 0));   // laid on the table, still
  await page.waitForFunction(() => window.__M.GK.ev.ruhe, null, { timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(400);
  o = await out(page);
  const ru = await page.evaluate(() => window.__M.GK.ev.ruhe);
  ok(ru && o.mode === 'off' && o.tiltY === 0, 'laid on the table with a note held: Ruhe, Gestik rests');
  await page.evaluate(() => window.__sensor(true, { beta: 180, roll: 0 }, 3));
  await page.waitForTimeout(600);
  const we = await page.evaluate(() => ({ w: window.__M.GK.ev.wenden, mode: window.__M.GK.mode }));
  ok(we.w && we.mode === 'off', 'turned face down: Wenden, Gestik rests');
  await page.evaluate(() => { window.__send([0x80, 65, 0]); window.__sensor(true, { beta: 45, roll: 0 }, 3); });
  await page.waitForTimeout(600);
  // ---- Immer ----
  await page.evaluate(() => window.__M.gkSet('clutch', 'immer'));
  await page.waitForTimeout(100);
  await page.evaluate(() => window.__setPose({ beta: 45, roll: -24 }));
  await page.waitForTimeout(400);
  o = await out(page);
  ok(o.mode === 'live' && o.tiltX < -0.7, 'Immer: acts without a note, the zero from switching (' + o.tiltX.toFixed(2) + ')');
  await page.dblclick('.gk-ww');
  await page.waitForTimeout(300);
  o = await out(page);
  ok(near(o.tiltX, 0, 0.03), 'Immer: a double tap on the Wasserwaage is the new zero (' + o.tiltX.toFixed(3) + ')');
  // ---- Taste ----
  await page.evaluate(() => window.__M.gkSet('clutch', 'taste'));
  await page.evaluate(() => window.__send([0x90, 60, 100]));
  await page.evaluate(() => window.__setPose({ beta: 45, roll: 10 }));
  await page.waitForTimeout(400);
  o = await out(page);
  ok(o.mode === 'off' && o.tiltX === 0, 'Taste: a note alone does nothing');
  await page.evaluate(() => window.__M.MTARGETS.get('gk.taste').set(1, {}));
  await page.waitForTimeout(150);
  await page.evaluate(() => window.__setPose({ beta: 45, roll: 34 }));
  await page.waitForTimeout(400);
  o = await out(page);
  ok(o.mode === 'live' && o.tiltX > 0.7, 'Taste held: acts from the pose it was pressed in (' + o.tiltX.toFixed(2) + ')');
  await page.evaluate(() => window.__M.MTARGETS.get('gk.taste').set(0, {}));
  await page.waitForTimeout(400);
  o = await out(page);
  ok(o.mode === 'off' && o.tiltX === 0, 'Taste let go: back to rest');
  await page.evaluate(() => window.__send([0x80, 60, 0]));
  // the mod layer's hook: subscribers hear every update
  const n = await page.evaluate(() => window.__subN);
  ok(n > 100, 'gkSub: the subscriber got every update (' + n + ')');
  // nothing bound: all that motion and all those notes wrote nothing to the patch
  const patch1 = await page.evaluate(() => localStorage.getItem('myzel.patch.v1'));
  ok(patch1 === patch0, 'motion with nothing bound writes nothing to the patch');
  ok(!errors.length, 'no errors ' + errors.join(' | '));
  await close();
})().catch(async (e) => { console.error(e); process.exitCode = 1; await close(); });
