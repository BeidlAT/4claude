/* ---------- the hall's room (rev.typ): its response made or loaded, shaped (Abstand, Länge) and handed to regenIR.
   Real rooms are fetched once from raeume/<id>.flac (decoded by the context, so at its rate) and kept for the session;
   a room that cannot be loaded (no network the first time, the claude.ai viewer) says so and the hall stays as it was. ---------- */
const RAUM_MAT = {   // absorption per octave 125 Hz … 8 kHz (the computed rooms scale them to their T, keeping their differences)
  holz: [0.28, 0.22, 0.17, 0.09, 0.10, 0.11, 0.11], holzboden: [0.15, 0.11, 0.10, 0.07, 0.06, 0.07, 0.07], stein: [0.02, 0.02, 0.03, 0.04, 0.05, 0.05, 0.06],
  glas: [0.35, 0.25, 0.18, 0.12, 0.07, 0.04, 0.03], erde: [0.15, 0.25, 0.4, 0.55, 0.6, 0.6, 0.6], fliese: [0.01, 0.01, 0.01, 0.01, 0.02, 0.02, 0.02],
  putz: [0.013, 0.015, 0.02, 0.03, 0.04, 0.05, 0.06], beton: [0.01, 0.01, 0.015, 0.02, 0.02, 0.02, 0.03], luft: [0.95, 0.95, 0.95, 0.95, 0.95, 0.95, 0.95],
  wiese: [0.11, 0.26, 0.6, 0.69, 0.92, 0.99, 0.99],
};
const RAUMA = { buf: new Map(), ctx: null, warned: new Set() };
async function raumLoad(id) {
  if (RAUMA.ctx !== A.ctx) { RAUMA.buf.clear(); RAUMA.ctx = A.ctx; }
  if (RAUMA.buf.has(id)) return RAUMA.buf.get(id);
  const p = (async () => {
    const r = await fetch(new URL('raeume/' + id + '.flac', document.baseURI).href);
    if (!r.ok) throw new Error(r.status);
    const b = await A.ctx.decodeAudioData(await r.arrayBuffer());
    return [b.getChannelData(0).slice(), b.getChannelData(Math.min(1, b.numberOfChannels - 1)).slice()];
  })();
  RAUMA.buf.set(id, p);
  p.catch(() => RAUMA.buf.delete(id));
  return p;
}
// the response for the room chosen: [L, R] at SR, ready for the convolver (null: Nebel – regenIR's own)
async function raumIR() {
  const id = P['rev.typ'], R = RAUM_BY[id]; if (!R || R.art === 'nebel') return null;
  const dist = P['rev.dist'], len = P['rev.len'];
  if (R.art === 'echt') {
    const [l, r] = await raumLoad(id);
    return dspJob('shape', [l.slice(), r.slice(), SR, { direct: true, dist, len }]);
  }
  if (R.art === 'gerechnet') {
    const o = R.o, [W, D, H] = o.dim;
    // Abstand: the source at a quarter of the room, the pair from close (1.5 m) to the far end
    const sx = W * 0.22, sy = D * 0.5, dmax = Math.max(2, W * 0.72), dd = 1.5 + (dmax - 1.5) * dist;
    const job = { dim: o.dim, mat: o.mat.map((m) => RAUM_MAT[m]), T: o.T.map((t) => t * len), scat: o.scat, src: [sx, sy, Math.min(1.6, H * 0.5)], mic: [Math.min(W - 0.3, sx + dd), sy + 0.37 * Math.min(4, D / 4), Math.min(1.7, H * 0.55)], seed: 11, maxLen: 16, noDirect: true };
    const [l, r] = await dspJob('room', [job, SR]);
    return dspJob('shape', [l, r, SR, { direct: false, dist: 0.5, len: 1 }]);
  }
  const [l, r] = await dspJob('special', [id.slice(2), { len, root: N.notes && N.notes[0] ? N.notes[0].f : 220, seed: 7 }, SR]);
  return dspJob('shape', [l, r, SR, { direct: false, dist, len: 1 }]);
}
// what the hall's details say under the choice: the room's own sentence or where it was measured (with the credit)
function raumText() {
  const R = RAUM_BY[P['rev.typ']]; if (!R) return '';
  if (R.art === 'echt') return R.ort + ' · gemessen: OpenAIR, University of York (CC BY 4.0)';
  if (R.art === 'gerechnet') return 'Aus seiner Form gerechnet: ' + R.o.dim.join(' × ') + ' m';
  return R.i || '';
}
