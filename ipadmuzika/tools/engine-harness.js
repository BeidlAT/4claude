// Prüfstand für die Klangmaschine: lädt engine.js mit nachgebautem AudioWorklet-Umfeld in Node.
'use strict';
const fs = require('fs');
const path = require('path');
const { ORGANE, Param, engineSpec } = require('../js/defs.js');
const { Skala } = require('../js/scale.js');

const BL = 128;

function loadEngine(sr = 48000) {
  const src = fs.readFileSync(path.join(__dirname, '..', 'engine.js'), 'utf8');
  let Proc = null;
  const posted = [];
  class AudioWorkletProcessor {
    constructor() { this.port = { postMessage: (m) => posted.push(m), onmessage: null }; }
  }
  // als Funktionskörper laden: so bleiben die Helfer lokale Funktionen und laufen so schnell wie im Worklet
  const fn = new Function('sampleRate', 'AudioWorkletProcessor', 'registerProcessor', src + '\n//# sourceURL=engine.js');
  fn(sr, AudioWorkletProcessor, (n, c) => { Proc = c; });
  const p = new Proc();
  const send = (m) => p.port.onmessage({ data: m });
  return { p, posted, send, sr };
}

// Eine Maschine aus einer Liste von Organen und Kabeln aufbauen
function build(E, mods, cables, opts = {}) {
  const ids = {};
  let n = 1;
  for (const m of mods) {
    const id = n++;
    ids[m.name || m.type] = id;
    const vals = {};
    for (const [k, v] of Object.entries(m.vals || {})) {
      const p = ORGANE[m.type].pmap.get(k);
      vals[k] = Param.toNorm(p, v);
    }
    E.send({ t: 'mod+', id, type: m.type, p: engineSpec(m.type, vals) });
  }
  const a = [], mm = [], t = [];
  for (const c of cables) {
    const [sName, sPort] = c[0].split('.'), [dName, dPort] = c[1].split('.');
    const st = mods.find((m) => (m.name || m.type) === sName).type, dt = mods.find((m) => (m.name || m.type) === dName).type;
    const so = ORGANE[st], dO = ORGANE[dt];
    const outJ = so.outs.find((j) => j.id === sPort);
    if (!outJ) throw new Error('Ausgang fehlt: ' + c[0]);
    if (outJ.kind === 'audio') a.push([ids[sName], so.audioOut.indexOf(outJ), ids[dName], dO.audioIn.findIndex((j) => j.id === dPort)]);
    else if (outJ.kind === 'mod') mm.push([ids[sName], so.modOut.indexOf(outJ), ids[dName], dPort, c[2] == null ? 0.3 : c[2]]);
    else t.push([ids[sName], so.trigOut.indexOf(outJ), ids[dName], dO.trigIn.findIndex((j) => j.id === dPort)]);
  }
  E.send({ t: 'patch', a, m: mm, tr: t });
  const sk = Skala.build({ root: opts.root ?? 0, mode: opts.mode || 'dorisch', tuning: opts.tuning || 'gleich', a4: 440 });
  E.send({ t: 'scale', root0: sk.root0, cents: sk.cents, lo: 65.4, oct: 3 });
  E.send({ t: 'tempo', bpm: opts.bpm || 90 });
  return { ids, sk };
}

// Blöcke rechnen; mic: Funktion(t in Samples) → Wert oder null
function run(E, seconds, { mic = null, onBlock = null } = {}) {
  const nb = Math.ceil(seconds * E.sr / BL);
  const L = new Float32Array(nb * BL), R = new Float32Array(nb * BL);
  const oL = new Float32Array(BL), oR = new Float32Array(BL), inp = new Float32Array(BL);
  let tMax = 0, tSum = 0;
  E.t = E.t || 0;
  for (let b = 0; b < nb; b++) {
    if (onBlock) onBlock(b, E.t);
    let inputs = [[]];
    if (mic) { for (let i = 0; i < BL; i++) inp[i] = mic(E.t + i); inputs = [[inp]]; }
    const t0 = process.hrtime.bigint();
    E.p.process(inputs, [[oL, oR]]);
    const dt = Number(process.hrtime.bigint() - t0) / 1e6;
    if (b > 20) { tSum += dt; if (dt > tMax) tMax = dt; }
    L.set(oL, b * BL); R.set(oR, b * BL);
    E.t += BL;
  }
  return { L, R, avgMs: tSum / Math.max(1, nb - 21), maxMs: tMax, blockMs: BL / E.sr * 1000 };
}

function stats(x) {
  let pk = 0, sq = 0, nan = 0, dc = 0;
  for (let i = 0; i < x.length; i++) { const v = x[i]; if (!Number.isFinite(v)) { nan++; continue; } const a = Math.abs(v); if (a > pk) pk = a; sq += v * v; dc += v; }
  return { peak: pk, rms: Math.sqrt(sq / x.length), nan, dc: dc / x.length };
}
const db = (a) => (a > 1e-9 ? (20 * Math.log10(a)).toFixed(1) : '-inf');

function writeWav(file, L, R, sr) {
  const n = L.length, buf = Buffer.alloc(44 + n * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(sr, 24);
  buf.writeUInt32LE(sr * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    buf.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(L[i] * 32767))), 44 + i * 4);
    buf.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(R[i] * 32767))), 46 + i * 4);
  }
  fs.writeFileSync(file, buf);
}

module.exports = { loadEngine, build, run, stats, db, writeWav, BL };
