#!/bin/sh
# Build test copies: $1 = source dir, $2 = name → v2/<name>/ (plain) and v2/<name>-inst/ (window.__M exposed)
SRC=$1; NAME=$2; P=$(dirname "$0")
mkdir -p "$P/$NAME" "$P/$NAME-inst"
HEAD='<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>'
{ printf '%s' "$HEAD"; cat "$SRC/index.html"; printf '</body></html>'; } > "$P/$NAME/index.html"
cp "$SRC/tap-worklet.js" "$P/$NAME/" ; cp "$SRC/tap-worklet.js" "$P/$NAME-inst/"
python3 - "$P/$NAME/index.html" "$P/$NAME-inst/index.html" <<'PY'
import sys,re
s=open(sys.argv[1]).read()
n=0
for old in ["const ctx = new AC({ latencyHint: L });","try { ctx = new AC({ latencyHint: L }); }"]:
    if old in s:
        new = old.replace("new AC({ latencyHint: L })","(window.__mkCtx ? window.__mkCtx() : new AC({ latencyHint: L }))")
        s=s.replace(old,new); n+=1
assert n==1, n
exp = "A, P, PD, CAP, N, SEQ, VIS, ENGINES, KS_CACHE, playNote, hit, ksBuffer, setParam, applyAll, initAudio, setFreeze, panic, updDelay, texture, spawnGrain, grainTick, seqStart, seqStop, seqTick, start, noteAt, buildNotes, touches, takes, loadValues, PRESETS, regenIR, korSource, tick, Voice, dspJob, toBuffer, preloadTextures, updBordun, onDown, onUp, onMove, frame, updMaster, seqTick, updBordun"
extra = []
if 'function applyQuality' in s: extra = ['applyQuality', 'calibrate', 'CAL', 'MIDI', 'midiNote', 'onMidi', 'QP', 'getQ: () => Q', 'getBudget: () => [VBUDGET, MAXV]', 'voiceLoad', 'warmKS', 'graphLatency', 'updDrive', 'recToggle', 'beatAt', 'timeAt', 'MIC', 'USERTEX']
else: extra = ['warmKS']
if 'function midiIn(' in s: extra += ['midiIn', 'midiSource', 'midiDrop', 'midiSync', 'midiAllOff', 'midiRescan', 'midiSetPort', 'midiSetClockOut', 'chState', 'CLK', 'CLKO', 'MTARGETS', 'midiParam', 'portPref', 'setPortPref', 'seqBpm', 'ctxAt', 'perfAt', 'loadPreset', 'userPresets', 'UI', 'openPanel', 'midiId', 'sameDev', 'MIDI_SECONDARY', 'ctl', 'fmt']
if 'function bleDecode(' in s: extra += ['BLE', 'bleCI', 'bleDecode', 'bleEncode', 'bleClock', 'bleClockNew', 'bleAsk', 'bleAdd', 'bleOff', 'bleForget', 'bleConnect', 'bleWhy', 'bleKind', 'bleDedupe', 'bleSend', 'bleFlushAll', 'midiPlat', 'midiHelp', 'blePairFix', 'bleOk', 'bleAgainTap', 'updDevUI', 'midiSrcOff', 'midiInit']
if 'function mapTake(' in s: extra += ['MAP', 'MPROF', 'STD', 'LEARN', 'midiLearn', 'learnPick', 'learnDone', 'mapTake', 'mapApply', 'mapOf', 'mapList', 'mapEdit', 'mapDel', 'mapRestore', 'mapExport', 'mapImport', 'mapSearch', 'mapTargets', 'mtOf', 'tName', 'mapFlush', 'mapLoad', 'midiSetProfile', 'mapLine', 'profText', 'MX', 'mxSnapStore', 'mxSnapDiff', 'xyOf', 'moveTouch', 'laneHit', 'CTL', 'CAP', 'macroId', 'mxPos', 'mxDb', 'devName']
if 'function kcUI(' in s: extra += ['KC', 'KCM', 'kcUI', 'kcWhat', 'kcEvText', 'kcLastText', 'kcMonOn', 'kcEdit', 'kcEditClose', 'kcBindsUI', 'kcDevsUI', 'learnUndo', 'devFrame', 'getDevEls: () => devEls']
if 'function gkMake(' in s: extra += ['GK', 'gkMake', 'gkOriG', 'gkEnable', 'gkDisable', 'gkSample', 'gkUpdate', 'gkZero', 'gkSet', 'gkNote', 'gkKey', 'gkHoldPad', 'gkStatus', 'gkLearnPick', 'gkShape', 'gkSub', 'gkExists', 'kcNone', 'kcNoMidi', 'GK_AX', 'GK_EV', 'gkRateText', 'gkSignText', 'gkCardSync', 'learnShow', 'mxBuzz']
if 'function buildStrips' in s: extra += ['MIX', 'updMix', 'meterTaps', 'mixMeters', 'duckHit', 'duckDepth', 'stripIn', 'layers', 'lyF', 'setMonMono', 'setMonDim', 'STRIPS', 'updSends', 'loudReset']
if 'function modSet(' in s: extra += ['MOD', 'MODT', 'modSet', 'modClear', 'modVal', 'modFlush', 'modY', 'modCents', 'modNewest', 'modFinger', 'modExprG', 'gkRoute', 'GKR', 'gkTarget', 'mp', 'mxoApply', 'fhX', 'stripGain', 'tName', 'tSet', 'triggerPerc', 'makeChain', 'startBordun', 'stopBordun', 'updStrip', 'mxSnapIds', 'mxMorphApply', 'sceneGo', 'midiRecolor', 'midiY', 'busOf', 'exprSet', 'store', 'closePanel']
if 'function ladTick(' in s: extra += ['LAD', 'SLP', 'LAD_AMT', 'ladTick', 'ladRassel', 'ladTank', 'slpEnter', 'slpWake', 'slpOpen', 'gkIco', 'gkOwnEv', 'mxSnapLoad', 'modPt', 'barStart', 'barStop', 'setFreeze', 'noteX', 'gkVisFrame', 'fctx']
if 'function faeTick(' in s: extra += ['FA', 'FA_R', 'FAE_PAR', 'faeTick', 'faeIn', 'faeCut', 'faeRun', 'faeLay', 'faeTake', 'faeHold', 'faeClear', 'faePress', 'faeRelease', 'faeTap', 'faeB', 'faeT', 'faeHeard', 'faeShift', 'faeGain', 'faeExport', 'faeImport', 'faeDecode', 'faeState', 'faeText', 'faeUI', 'faeFade', 'faeClock', 'faeReady', 'presetExtra', 'presetExtraLoad', 'GKF', 'GKS', 'GKF_PROF', 'gkfPack', 'gkfUnpack', 'gkfPick', 'gkfOut', 'gkfSending', 'gkrTake', 'gkRemOn', 'gkRemEnd', 'gkRemText', 'gkCheck', 'gkfDark', 'gkfSub', 'mxSnapStore', 'mxSnapSwap', 'mxMorphApply', 'MX', 'setParam', 'loadPreset', 'userPresets', 'setUserPresets', 'undo', 'HIST', 'seqStart', 'seqStop', 'SEQ', 'clkPulse', 'clkStart', 'CLK', 'modVal', 'modPt', 'modSet', 'modClear', 'MOD', 'GKR', 'gaFaeV', 'gaFaePer', 'midiTake', 'mapOf', 'profOf', 'MAP', 'midiSource', 'midiIn']
if 'function gaTick(' in s: extra += ['GA', 'gaTick', 'gaStep', 'gaDeg', 'gaOn', 'gaBeb', 'gaCarry', 'gaW', 'gaGlow', 'gkBig', 'degNote', 'ratioForSemi', 'SCALES', 'JUST', 'NOTE_NAMES', 'modSweep', 'gkOwn', 'releaseAllTouches', 'gkBuzz']
if 'function rgTick(' in s: extra += ['RG', 'RZ', 'RG_S', 'rgTick', 'rgStep', 'rgDiv', 'rgAt', 'rgNext', 'rgBook', 'rgSeed', 'rgNote', 'rgPuls', 'rgSpawn', 'rgStart', 'rgStop', 'rgOn', 'rgPhys', 'rgPos', 'rgVisFrame', 'rgSpore', 'rgSprinkle', 'rgPanic', 'rzSync', 'rzPreset', 'rgCol', 'gkCl', 'gkNeigen', 'noteAt', 'N', 'visPush', 'VIS', 'presetExtra', 'presetExtraLoad', 'remember', 'undo', 'HIST', 'stripIn', 'MIX', 'SLP', 'LAD', 'ladOn', 'faeImport', 'faeExport', 'FA', 'modVal', 'modSet', 'MOD', 'gkSet', 'gkCardSync', 'GK', 'loadPreset', 'PRESETS', 'slpEnter', 'slpWake', 'GKR', 'gkOwn', 'Q', 'getVB: () => [VBUDGET, MAXV]', 'MX', 'mxSrcText', 'saiInUse', 'KS_CACHE', 'patchValues', 'seqStart', 'seqStop', 'SEQ', 'beatAt', 'timeAt', 'CAP', 'recToggle']
if 'function rampP(' in s: extra += ['rampP', 'vFade', 'rgQueue', 'rgFire', 'rgNextK', 'rgRebase', 'mxRgnSync', 'mxVis', 'gkOwnGet', 'gkOwnSet', 'gaF0', 'modStroke', 'modInNw', 'gkHasTaste', 'gkNew', 'gkNote', 'ladFull', 'ladDry', 'soundGoesOn', 'faeUI', 'modBendAhead', 'modExprAhead', 'modFut', 'seqRetempo', 'slpFade', 'gkShade', 'ladSub', 'gkRgLatch', 'gkBass', 'gkBassOff', 'learnIn', 'modNotes', 'modY', 'modCents', 'modExpr', 'modMorph', 'faeLay', 'faePend', 'faeWin', 'gaTick', 'gkModeWord', 'onDown', 'onUp', 'onMove', 'stripGain', 'MIX', 'faeExport', 'faeImport', 'FA', 'GA', 'gaStep']
if 'function ensureDSP(' in s: extra += ['ensureDSP', 'DSP', 'WORKLET_ENGINES', 'wkPlays', 'wkPrm', 'dspWanted', 'engLabel', 'MACRO', 'ENG_OPTS', 'ENG_INFO', 'ENG_NAME', 'GROUP', 'VCOST1', 'VCOST3', 'mxSrcText', 'engSecs', 'MYZEL_DSP_SRC', 'wkShake', 'ENG_NOTE', 'refreshEngineUI', 'setupCapture', 'ensureCapture', 'steal', 'burstEnv', 'sustainRelease', 'onParamChanged']
if 'const ELM = {' in s: extra += ['ELM', 'jrgSeason', 'jrgCount', 'jrgClock', 'jrgText', 'jrgPhi', 'JRG_FIX', 'JRG_FREE', 'JRG_MAR', 'octFold', 'klangFrame', 'ladRassel', 'slpEnter', 'slpWake', 'gkCheck']
if 'function kqOpen(' in s: extra += ['KQ', 'KQ_PIDS', 'kqOpen', 'kqClose', 'kqHear', 'kqHold', 'kqHoldEnd', 'kqStep', 'kqStepTo', 'kqChoose', 'kqSurprise', 'kqTarget', 'kqUsed', 'kqRender', 'kqProbeEnd', 'kqFb', 'kqCost', 'kqSyncAll', 'famPlay', 'engKeysIn', 'engMissSay', 'ENG_META', 'FAM', 'ENG_ALIAS', 'ENG_LATER', 'RG_S', 'restoreState', 'toast', 'updLaneTabs', 'selectLane', 'remember', 'gkSet', 'GK', 'sheet', 'touches', 'LANE_DEF']
s=s.replace("\nboot();\n})();","\nboot();\nwindow.__M = { "+exp+(", "+", ".join(extra) if extra else "")+" };\n})();")
assert '__M' in s
open(sys.argv[2],'w').write(s)
PY
