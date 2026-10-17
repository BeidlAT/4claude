# Gestik – decisions and build scope (binding addendum to konzept.md)

The user answered the open questions of konzept.md §10 on 2026-10-12:
"No main scenario – the app is given away for free and must serve every scenario. All phones.
Take whatever has the most substance / makes the most sense for the rest."
So the concept is built in full (phases 1–3 + Funkstrecke), with these decisions:

## D1 – Every scenario, no "main" one
Defaults must be good in each of these without setup:
- phone alone as the instrument (touch field), portrait AND landscape;
- phone + Bluetooth/USB keyboard (microKEY Air, nanoKEY Studio …);
- iPad on a stand and on the lap (no Web MIDI there → Gestik is its first controller);
- Windows/Mac PC (no sensors): Fährte records ANY continuous source (X-Y pad, wheels, knobs,
  finger height, mixer faders), Sporenregen/Gestik can be driven by dragging the Wasserwaage
  ("virtuelle Neigung"), and Funkstrecke can bring a phone's motion in;
- claude.ai viewer (motion blocked): clear message + link to the app; Fährte and the dragged
  Wasserwaage still work.

## D2 – All phones, no device-specific code
- No UA sniffing, no vendor lists. Feature-detect everything.
- Must work with: iOS (permission inside a tap, sign-flipped acceleration), Android Chrome /
  Samsung Internet / Edge, 50–200 Hz event rates, jittery/bundled/duplicate events,
  event.interval in ms or s (ignore it; use event.timeStamp / performance.now()).
- Phones WITHOUT a gyroscope (rotationRate null or all-zero): tilt + Wenden + Ruhe + Schütteln
  still work from accelerationIncludingGravity; Bebung, Drehen and Schwenken are shown as
  "braucht Gyroskop – dieses Gerät hat keins" and disabled. Devices that only deliver
  deviceorientation (no devicemotion) fall back to a gravity vector derived from beta/gamma.
- Screen orientation: map axes to the CURRENT screen orientation (screen.orientation.angle,
  fallback window.orientation) so "seitlich" is always the player's left/right, in portrait and
  landscape, and re-zero on orientation change.
- Personal noise floor is learned adaptively (rolling quantiles while playing) – thresholds are
  relative to it, so a shaky hand, a tremor, a bus ride or a different phone all work.
- A short generic help line names system gestures a web app cannot block (e.g. "Hacken =
  Taschenlampe" on some phones, "Schütteln zum Widerrufen" on iPhone) – no vendor detection.

## D3 – Anlehnen seitlich: Tonhöhe is the default (more substance than Raum)
- Sideways tilt bends the NEWEST sounding note toward the neighbouring SCALE step (right = up,
  left = down), magnetic snap from 80 % of the way so a held bend never ends between notes;
  Android haptic tick on snap; visible snap on iOS.
- Older held notes: unchanged by default (half a scale step would be out of tune). Option
  "alle Töne": every held note bends to ITS OWN neighbour step (diatonic parallel shift –
  stays in key).
- Alternative choice "Raum" (pan + echo send) remains available.
- Forward/back tilt = Höhe (timbre per engine): newest note full, older ones half.
- Bebung (hand vibrato) on by default on phones; off by default on large screens (tablet heuristic
  by screen size, not UA), user can switch it on.
- MPE notes are excluded (they carry their own bend).

## D4 – Tragen: build it, default OFF
One-line explanation in the UI: "Tragen: Finger heben, während das Handy geneigt ist – der Ton
klingt weiter und folgt der Neigung. Zurück in die Mitte legt ihn ab." Max 2 carried notes,
auto-release 20 s, "Stille"/panic always ends them.

## D5 – Schlafen: Freeze-Kadenz is the default
Options: Freeze-Kadenz (default) · Stille · Szene B. Schlafen is ON by default only while Gestik
is on. Touches are ignored while face-down. Wake with a spore bloom.

## D6 – Sporenregen: only your own notes seed by default
- Seeds: touch-field notes and keyboard notes. Switch "Puls sät mit" (default off).
- The rain gets its OWN mixer channel strip "Regen" (in the Spiel group) so it can be levelled,
  panned, EQ'd, pumped, soloed and is captured by recording/Takt-Aufnahme. If adding a strip
  is impossible without breaking the mixer, route it through the Puls group with a clear label –
  but try the own strip first (the mixer's strip list is data-driven; check STRIPS/buildStrips).
- Strike sound selectable: Tropfen (default), Kalimba, Glocke, Schale, Membran, Saite.
- Grid default 1/16 at ≤ 100 BPM, 1/8 above; options 1/8, 1/16, 1/8T, frei.
- Smallest entry ("Harfe": column crossings play scale glissandi) exists as a mode, but the
  default is Keime.

## D7 – Gestik-Rezepte: presets bring them, they apply automatically WHILE Gestik is on
- Switching Gestik on is the user's single opt-in. While it is on, loading a preset applies its
  recipe (only mod-layer settings – never patch values).
- Switch "Rezepte der Presets" (default on). User assignments ("Eigene") always win over recipes.
- User presets store the current Gestik settings + Fährte loops.

## D8 – iPad: both stand and lap
- Lap: everything incl. Sporenregen; stand: Sporenregen keeps raining when leaned, Ladung gentle.
- iPad/iPhone gain the Zuordnungen screen (today hidden without Web MIDI/Bluetooth) because
  Gestik is a learnable source there.

## D9 – Names stay as in konzept.md §11
Gestik, Anlehnen, Bebung, Festhalten, Tragen, Ladung/Entladung, Schütteln, Schwenken,
Schlafen, Wenden, Ruhe, Fährte, Verblassen, Sporenregen, Keime, Harfe, Wasserwaage, Nullpunkt,
Weite, Fingerhalt, Funkstrecke.

## D10 – Phase 0 (Messtag) is built INTO the app instead of blocking the build
The user cannot run a separate measurement day for us, so:
- Defaults are conservative estimates from sensors.md; thresholds adapt to the measured noise
  floor and event rate at runtime.
- The Gestik card has a collapsible "Messen" section: live rate + jitter, gyro present?,
  sign check, current tilt angle, the angle at which the UI would auto-rotate (shown when it
  happens), the optional Klopf-Messung (mic onset vs accel spike → measured motion→sound
  latency per device, stored and used by Fährte), and "Spur aufnehmen" (records raw sensor
  events for 30 s and offers them as a JSON download/share) so real traces can be sent to us.
- Bass-feedback guard: the Bebung band uses the adaptive noise floor and is muted while the
  output level of < 120 Hz content is very high AND the gyro spectrum shows the same frequency
  (simple heuristic; documented).

## D11 – Funkstrecke: built generically, marked untested
- "Gestik als MIDI senden": sends the PROCESSED axes as 14-bit NRPN and events as notes on a
  chosen Web MIDI output (any output: phone in USB-MIDI mode → PC, or to any synth/DAW).
  Throttled to ≤ 100 messages/s per axis, only on change.
- PC side: a device profile "Gestik (Handy)" recognises the NRPN signature (fixed NRPN numbers,
  documented) on any input and turns it into the same Gestik source (axes/events), so Anlehnen,
  Ladung, Schlafen, Fährte, Sporenregen work on the PC from the phone.
- Honest UI text: "Ungetestet: ob dein Handy im USB-MIDI-Modus einen Ausgang bekommt, hängt vom
  Gerät ab. Wenn hier kein Ausgang erscheint, geht es (noch) nicht."
- No WebRTC/WLAN path.

## Non-negotiables (from konzept.md)
- Motion NEVER writes to the patch: no setParam/onParamChanged from motion, no "Preset geändert",
  no save timer, no expensive recomputation. Everything goes through the new mod layer.
- Clutch ("Die Musik ist die Kupplung") is the default for Anlehnen; Ladung/Sporenregen use "Immer"
  with handling thresholds. Global Gestik switch + learnable on/off.
- Fingerhalt protects touch notes from the screen tilting under the finger.
- Gestik is NOT a MIDI port (no toast, no warmKS strings, no #midiDot, monitor throttled).
- Pure, browser-free gesture recogniser (input samples → axes/events) with unit tests incl.
  sign-mirrored traces, jitter/duplicate/bundled samples, and 10-min no-false-trigger traces.
- Fährte/Sporenregen run in the scheduler look-ahead (sample-accurate, independent of main-thread
  hitches); expensive params are never mod targets.
- Bit-identical behaviour when Gestik is off (existing suites must pass unchanged).
