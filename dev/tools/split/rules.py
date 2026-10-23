"""The module map: where myzel/index.html is cut, and what each piece is called.

Each region is a list of (path, pattern) in file order. A module begins at the first line after the previous cut that
matches `pattern` (a regex, searched in the line) – moved up to the top of the comment block right above it, so a
section's heading travels with its code – and runs to the next cut. The first entry of a region has no pattern: it
starts where the region starts. A pattern that is not found (an older or newer file) is reported and skipped: its
code simply stays in the module before it, the build stays byte-identical. A cut is only made where the scanner
sees a line start between two whole statements at the region's depth (never inside a function, an object, a string,
a template or a comment); a match anywhere else is reported and the next match is tried.

Options (a dict as third element): exact – cut at the matched line itself, not at the comment block above it.

To rename or regroup modules: edit this file, run split.py again. To add a cut: add an entry where its section is.
"""
import re

E = re.escape


def M(title):
    """a /* ---------- title ---------- */ section marker (CSS and JS)"""
    return r'^/\* -{10} ' + E(title)


def B(title):
    """a /* ===== … title … ===== */ banner's title line"""
    return r'^ {3}' + E(title)


def H(title):
    """a // ---- title ---- marker at column 0 (Hexenring and some audio sections)"""
    return r'^// -{4} ' + E(title)


def D(decl):
    """a top-level declaration, e.g. D('function initAudio(') or D('const ELM = {')"""
    return '^' + E(decl)


def I(title):
    """a marker inside myzelDsp (indented by two spaces)"""
    return r'^  // -{4} ' + E(title)


# ---- markup between </style> and <script> ----
HTML = [
    ('html/glyphs.html', None),
    ('html/app.html', r'^<div id="app"'),
]

# ---- the stylesheet ----
CSS = [
    ('css/base.css', None),
    ('css/top-bar.css', M('top bar')),
    ('css/field.css', M('play field')),
    ('css/quick-strip.css', M('quick strip')),
    ('css/puls.css', M('puls panel')),
    ('css/recording.css', M('recording panel')),
    ('css/presets.css', M('presets')),
    ('css/geraet.css', M('Gerät')),
    ('css/overlays.css', M('start / resume overlays')),
    ('css/hexenring.css', M('Hexenring')),
    ('css/mixer/mixer.css', M('Mixer (Mischpult)')),
    ('css/mixer/head.css', M('head band')),
    ('css/mixer/console.css', M('the console')),
    ('css/mixer/puls-mix.css', M("the Puls panel's block")),
    ('css/mixer/fruchtkoerper.css', M('Fruchtkörper')),
    ('css/mixer/geflecht.css', M('Geflecht')),
    ('css/klangquellen.css', M('Klangquellen')),
]

# ---- myzelDsp's body: the AudioWorklet module, one file per processor (see split.py: the DSP shell) ----
DSP = [
    ('js/dsp/blocks.js', None),
    ('js/dsp/contract.js', I('the processor contract')),
    ('js/dsp/halm.js', I('Halm:')),
    ('js/dsp/ranke.js', I('Ranke:')),
    ('js/dsp/harz.js', I('Harz:')),
    ('js/dsp/moder.js', I('Moder:')),
    ('js/dsp/boee.js', I('Böe:')),
    ('js/dsp/amoebe.js', I('Amöbe:')),
    ('js/dsp/gespinst.js', I('Gespinst:')),
    ('js/dsp/sehne.js', I('Sehne:')),
    ('js/dsp/kehlchen.js', I('Kehlchen:')),
    ('js/dsp/zapfen.js', I('Zapfen:')),
    ('js/dsp/glut.js', I('Glut:')),
    ('js/dsp/ring.js', I('Hexenring:')),
]
# where the shell takes over again: the empty voice, the registrations and the return stay in js/dsp/myzel-dsp.js
DSP_TAIL = r'^  class Null extends'
DSP_FN = r'^function myzelDsp\(\) \{$'

# ---- the app's script (the body of its one IIFE) ----
JS = [
    ('js/core/helpers.js', None),
    ('js/core/tuning.js', B('Tuning')),
    ('js/core/params.js', B('Parameters')),
    ('js/core/notes.js', B('Notes on the play field')),
    ('js/core/audio.js', B('Audio core')),
    ('js/core/buffers.js', M('heavy buffers')),
    ('js/core/init-audio.js', D('function initAudio(')),
    ('js/core/chain.js', M('insert chain')),
    ('js/core/apply.js', M('live parameter application')),
    ('js/mixer/strips.js', B('Mischpult: one channel strip')),
    ('js/mixer/processing.js', H('processing block')),
    ('js/mixer/metering.js', M('metering')),
    ('js/core/ruhe.js', M('Ruhe')),
    ('js/voices/voice.js', B('Voices')),
    ('js/engines/elmsfeuer.js', D('const ELM = {')),
    ('js/engines/jahresring.js', D('const JRG_BL =')),
    ('js/engines/zapfen-native.js', H('Zapfen without AudioWorklet')),
    ('js/engines/glut-native.js', H('Glut (klang SPEC')),
    ('js/engines/engines.js', D('const ENGINES = {')),
    ('js/voices/karplus.js', M('Karplus-Strong')),
    ('js/grains/sources.js', M('grain sources')),
    ('js/grains/own-material.js', M('own material for the grains')),
    ('js/grains/mic.js', M('live microphone')),
    ('js/voices/alloc.js', M('voice allocation')),
    ('js/core/quality.js', M('quality levels')),
    ('js/voices/drone.js', M('drone')),
    ('js/capture/tap-src.js', B('Capture: recording')),
    ('js/dsp/myzel-dsp.js', B('Worklet engines')),
    ('js/engines/dsp-loader.js', r'^// The module: the processors above', {'exact': True}),
    ('js/engines/gespinst-web.js', H("Gespinst's web")),
    ('js/engines/rhizom.js', r'^// -{10} Rhizom'),
    ('js/capture/backup.js', M('take backup')),
    ('js/capture/record.js', M('record state machine')),
    ('js/capture/bars.js', M('recording in bars')),
    ('js/capture/wav-zip.js', M('WAV + ZIP writers')),
    ('js/capture/save.js', M('saving files')),
    ('js/capture/preview.js', M('take preview')),
    ('js/puls/scheduler.js', B('Scheduler')),
    ('js/play/touch.js', B('Touch play')),
    ('js/midi/midi.js', M('MIDI: keyboards and controllers')),
    ('js/midi/webmidi.js', M('Web MIDI')),
    ('js/midi/ble.js', M('Bluetooth LE MIDI')),
    ('js/midi/messages.js', M('the message layer')),
    ('js/midi/mapping.js', M('controller mapping')),
    ('js/midi/bindings.js', M('bindings')),
    ('js/midi/profiles.js', M('device profiles')),
    ('js/midi/learn.js', M('MIDI learn')),
    ('js/midi/input.js', M('per-(source, channel) state')),
    ('js/midi/clock.js', M('MIDI clock')),
    ('js/gestik/recognizer.js', B('Gestik: the phone')),
    ('js/gestik/live.js', M('Gestik live')),
    ('js/gestik/zuweisen.js', M('Gestik in Zuweisen')),
    ('js/gestik/messen.js', M('Messen')),
    ('js/mod/mod.js', B('Mod-Schicht')),
    ('js/mod/formen.js', M('Formen in Zuweisen')),
    ('js/gestik/anlehnen.js', M('Anlehnen')),
    ('js/gestik/ladung.js', M('Ladung: ')),
    ('js/gestik/schlafen.js', M('Schlafen: ')),
    ('js/gestik/ladung-schlafen-card.js', M('Ladung and Schlafen in the card')),
    ('js/gestik/sporenregen.js', M('Sporenregen')),
    ('js/gestik/faehrte.js', M('Fährte: ')),
    ('js/gestik/faehrte-presets.js', M('Fährte in presets')),
    ('js/gestik/rezepte.js', M('Gestik-Rezepte')),
    ('js/gestik/funkstrecke.js', M('Funkstrecke')),
    ('js/ui/visuals.js', B('Visuals')),
    ('js/ui/controls.js', B('UI: controls generated')),
    ('js/mixer/mixer.js', B('Mixer – the Myzel-Mixer')),
    ('js/mixer/knobs.js', M('knobs: gill fans')),
    ('js/mixer/drags.js', M('drags and the floating value tip')),
    ('js/mixer/console.js', B('The console')),
    ('js/mixer/console-draw.js', M('static layer')),
    ('js/mixer/head.js', B('The head:')),
    ('js/mixer/snapshots.js', M('snapshots and morph')),
    ('js/mixer/views.js', B('Views, selection')),
    ('js/mixer/geflecht.js', B('Geflecht')),
    ('js/mixer/geflecht-draw.js', M('the still layer')),
    ('js/mixer/geflecht-gestures.js', M('gestures')),
    ('js/mixer/fruchtkoerper.js', B('Fruchtkörper')),
    ('js/mixer/klangbild.js', M('Klangbild')),
    ('js/mixer/formen.js', M('Formen: ')),
    ('js/mixer/wege.js', M('Wege: ')),
    ('js/mixer/summe.js', M('the Summe')),
    ('js/mixer/pages.js', M('head, pages, life')),
    ('js/mixer/hilfe.js', B('"?"')),
    ('js/mixer/puls-mix.js', B("The Puls panel's mixing block")),
    ('js/ui/klangquellen.js', M('Klangquellen')),
    ('js/ui/presets.js', M('presets')),
    ('js/ui/geraet.js', M('Gerät: ')),
    ('js/ui/gestik-card.js', M('the Gestik card')),
    ('js/ui/bindings.js', M('the bindings, per device')),
    ('js/ui/sheet.js', M('sheet + tabs')),
    ('js/ui/update.js', M('update check')),
    ('js/ui/start.js', D('function ensureRunning(')),
    ('js/hexenring/taktgeber.js', M('Hexenring')),
    ('js/hexenring/node.js', H('the processor (myzel-ring')),
    ('js/hexenring/calls.js', H('the calls')),
    ('js/hexenring/humus.js', H('the notes Humus')),
    ('js/hexenring/ohr.js', H('Ohr a)')),
    ('js/hexenring/ernten.js', H('cuts: ')),
    ('js/hexenring/grammar.js', H('the Hauptknopf')),
    ('js/hexenring/recuts.js', H('re-cuts')),
    ('js/hexenring/tick.js', H('memory: ')),
    ('js/hexenring/ringleiste.js', H('the Ringleiste')),
    ('js/hexenring/card.js', H('the card (SPEC §16')),
    ('js/hexenring/persist.js', H('persistence')),
    ('js/hexenring/chain-log.js', H("the chain's modulators")),
    ('js/hexenring/werk.js', H('the Werk-Rahmen, the parent')),
    ('js/hexenring/bake.js', H('the bake')),
    ('js/hexenring/seams.js', H('seams, complete')),
    ('js/hexenring/timing.js', H('Spielverzögerung')),
    ('js/hexenring/lichtungen.js', H('Lichtungen')),
    ('js/hexenring/controls.js', H('controls (SPEC §17)')),
    ('js/hexenring/bewegung.js', H("the Fährte's retirement")),
    ('js/hexenring/naehren.js', H('Nähren')),
    ('js/hexenring/auslese.js', H('Auslese')),
    ('js/hexenring/wuchs.js', H('the realms')),
    ('js/hexenring/wuchs-follow.js', H('following the key')),
    ('js/hexenring/werkzeug.js', H('the card (step 2b)')),
    ('js/hexenring/band.js', H('§14 the tape')),
    ('js/hexenring/noten.js', H("§14 the notes' tools")),
    ('js/hexenring/export.js', H('§14 export')),
    ('js/hexenring/folge-buehne.js', H('§13 Folge')),
    # Etappe 3 · Mitspieler (SPEC §12.2–§12.5)
    ('js/hexenring/mitspieler/mitspieler.js', r'^/\* -{4} Etappe 3'),
    ('js/hexenring/mitspieler/variieren.js', H('Variieren and Wandern')),
    ('js/hexenring/mitspieler/rollen.js', H('roles (SPEC')),
    ('js/hexenring/mitspieler/gaertner.js', H('the Gärtner (SPEC')),
    ('js/hexenring/mitspieler/antworten.js', H('Antworten (SPEC')),
    ('js/hexenring/mitspieler/begleiten.js', H('Klangverwandtschaft (SPEC')),
    ('js/hexenring/mitspieler/wiederkehr.js', H('Wiederkehr (SPEC')),
    ('js/hexenring/mitspieler/puls-lernt.js', H('Puls lernt')),
    ('js/hexenring/mitspieler/knospen.js', H('Knospen (SPEC')),
    ('js/hexenring/mitspieler/herzschlag.js', H("the Gärtner's heartbeat")),
    ('js/hexenring/mitspieler/handschrift.js', H('the Handschrift')),
    ('js/hexenring/mitspieler/card.js', H('the card: the Gärtner')),
    # Etappe 4 · Ökologie (SPEC §15, §10.6, §17)
    ('js/hexenring/oekologie/pass-notes.js', M('Hexenring: Ökologie')),
    ('js/hexenring/oekologie/midi-out.js', H('MIDI out of loop notes')),
    ('js/hexenring/oekologie/naehren.js', H('Nähren (SPEC §15)')),
    ('js/hexenring/oekologie/ladung.js', H('Ladung on loops')),
    ('js/hexenring/oekologie/veto.js', H('per-note vetoes')),
    ('js/hexenring/oekologie/treffen.js', H('Treffen (SPEC')),
    ('js/hexenring/oekologie/schleife-in-schleife.js', H('Schleife in Schleife')),
    ('js/hexenring/oekologie/zersetzung.js', H('Zersetzung per Schicht')),
    ('js/hexenring/oekologie/worker.js', H("the Hexenring's Worker")),
    ('js/hexenring/oekologie/mikro.js', H('Mikro-Schleifen')),
    ('js/hexenring/oekologie/gesang.js', H('Gesang als Noten')),
    ('js/hexenring/oekologie/herzschlag.js', H("the ecology's heartbeat")),
    ('js/hexenring/oekologie/card.js', H('the card: Nähren')),
    ('js/boot.js', D('function boot(')),
]
