/* ---------- Sporenwerk – its panel: a living picture and the Trickkiste ----------
   The picture (SPW): a Pilzring of steps round the edge – a spore where the ring strikes, a hollow where it rests, a
   withered one where Mutation took it out; inside, the notes it plays on a spiral (the angle their pitch class, the
   radius their octave), each in its colour; every step a hypha grows from the ring to its note and bursts into spores
   there – Ratschen a little shower, an accent a bloom, Stimmen a branch to the added tones; the trail of the last steps
   fades into the soil, and with Mutation fine threads keep sprouting from the ring. Drawn while the panel shows. */
const SPW = { cv: null, w: 0, h: 0, dpr: 1, t: 0, hy: [], dust: [], spr: [], sprouts: [], wave: 0, glow: {} };
ICON.arp = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="8.6" stroke-dasharray="1.6 3.1"/><path d="M12 12 7.5 7.8M12 12l5 -2.6M12 12l1.6 5.2"/><circle cx="7.5" cy="7.8" r="1.5" fill="currentColor"/><circle cx="17" cy="9.4" r="1.5" fill="currentColor"/><circle cx="13.6" cy="17.2" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/></svg>';
PANELS.splice(PANELS.findIndex((p) => p.key === 'mix') + 1, 0, { key: 'arp', title: 'Sporenwerk', icon: ICON.arp, build: buildSporenwerk, frame: spwFrame, open: () => { for (const e of ARP.ev) e.drawn = true; spwFit(); } });
// a pitch's colour: its place in the octave round the colour wheel, in the field's muted, warm light
const spwHue = (f) => ((Math.log2(f / 261.63) % 1) + 1) % 1;
const spwCol = (f, a, l = 66) => 'hsla(' + Math.round(spwHue(f) * 360 + 20) + ',72%,' + l + '%,' + a.toFixed(3) + ')';
function buildSporenwerk() {
  SPW.cv = h('canvas', { class: 'spw-cv', role: 'img', 'aria-label': 'Sporenwerk: der Ring der Schritte und die Töne, die er spielt' });
  const on = ctl('arp.on', { label: 'Sporenwerk an' });
  SPW.form = h('p', { class: 'spw-form' });
  SPW.read = h('p', { class: 'spw-read', 'aria-live': 'polite' });
  const forms = h('div', { class: 'chips spw-forms', role: 'radiogroup', 'aria-label': 'Wuchsform' },
    ...ARP_FORMS.map(([k, t]) => { const b = h('button', { type: 'button', class: 'chip', role: 'radio', 'data-v': k, title: ARP_FORM_I[k], onclick: () => setParam('arp.form', k) }, t); return b; }));
  bindCtl('arp.form', (v) => { for (const b of forms.children) { const o = b.dataset.v === v; b.setAttribute('aria-checked', String(o)); b.tabIndex = o ? 0 : -1; } SPW.form.textContent = ARP_FORM_I[v] || ''; });
  forms.addEventListener('keydown', (e) => { const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0; if (!d) return; e.preventDefault(); const i = ARP_FORMS.findIndex((x) => x[0] === P['arp.form']), n = ARP_FORMS[(i + d + ARP_FORMS.length) % ARP_FORMS.length][0]; setParam('arp.form', n); forms.querySelector('[data-v="' + n + '"]').focus(); });
  // the dice: a new Trickkiste in one stroke – Wuchsform, ring, Ratschen, Stimmen, Wanderung, as the Myzel would grow it
  const dice = h('button', { type: 'button', class: 'btn ghost spw-dice', title: 'Würfeln: eine neue Trickkiste – Wuchsform, Ring, Ratschen, Stimmen, Wanderung', onclick: spwDice }, '⚄ Würfeln');
  const box = h('div', { class: 'spw' },
    h('div', { class: 'spw-head' }, on, dice),
    h('div', { class: 'spw-stage' }, SPW.cv, SPW.read),
    section('Wuchsform', 'Wie der Faden durch die Töne wächst', forms, SPW.form),
    section('Rhythmus', 'Raster, Ring und Swing', grid(ctl('arp.rate'), ctl('arp.takt')), grid(ctl('arp.gate'), ctl('arp.swing')),
      grid(ctl('arp.schritte'), ctl('arp.treffer'), ctl('arp.dreh')), h('p', { class: 'note' }, 'Der Ring: so viele Schritte, so viele davon klingen, gleichmäßig verteilt (euklidisch) – die Drehung verschiebt, wo er anfängt.')),
    section('Trickkiste', 'Was die Sporen unterwegs treiben', grid(ctl('arp.chance'), ctl('arp.ratsche'), ctl('arp.mutation')), grid(ctl('arp.akzent'), ctl('arp.akzN'), ctl('arp.welle')),
      ctl('arp.stimmen'), grid(ctl('arp.wander'), ctl('arp.wlang')),
      h('p', { class: 'note' }, 'Ratschen: ein Schritt zwei- bis viermal in sich, leiser werdend. Mutation: das Muster wächst langsam weiter – Plätze tauschen, der Ring dreht sich, ein Schritt welkt. Leiter-Wanderung: jede Runde wandert alles in der Tonart weiter und kehrt dann heim.')),
    section('Oktaven', '', grid(ctl('arp.okt'), ctl('arp.oktw'))),
    section('Quelle', 'Was das Sporenwerk spielt', ctl('arp.quelle'), ctl('arp.schl'), ctl('arp.schlStill'), ctl('arp.halten'),
      h('p', { class: 'note' }, 'Gespielt: die Töne, die du hältst (Feld, Keyboard, MIDI) – sie klingen dann nicht selbst. Schleife: die Töne, die gerade in einer Schleife klingen. Halten: der Akkord bleibt stehen, bis du aus leerer Hand neu greifst.')));
  if (window.ResizeObserver) new ResizeObserver(() => spwFit()).observe(SPW.cv);
  return box;
}
function spwDice() {
  const R = Math.random, pick = (a) => a[Math.floor(R() * a.length)];
  const n = pick([5, 7, 8, 9, 11, 12, 13, 16]);
  for (const [id, v] of [['arp.form', pick(ARP_FORMS)[0]], ['arp.rate', pick(['0.5', '0.25', '0.25', '0.125'])], ['arp.takt', pick(['g', 'g', 't', 'p'])], ['arp.schritte', n], ['arp.treffer', Math.max(2, Math.round(n * (0.45 + 0.5 * R())))],
    ['arp.dreh', Math.floor(R() * n)], ['arp.ratsche', pick([0, 0, 0.15, 0.3])], ['arp.stimmen', pick(['0', '0', 'terz', 'quinte', 'akkord'])], ['arp.wander', pick([0, 0, 1, -1, 2])], ['arp.okt', pick([1, 2, 2, 3])], ['arp.oktw', pick(['auf', 'pendel', 'zufall'])],
    ['arp.mutation', pick([0, 0.2, 0.4])], ['arp.welle', pick([0, 0.3, 0.6])], ['arp.chance', pick([1, 1, 0.85, 0.7])]]) setParam(id, v);
  toast('Sporenwerk: ' + ARP_FORMS.find((x) => x[0] === P['arp.form'])[1] + ' – neu gewürfelt.', 3500, UNDO_P());
}
// (Rückgängig for the dice: the Sporenwerk's knobs as they were)
function UNDO_P() { const was = Object.fromEntries(Object.keys(PD).filter((id) => id.startsWith('arp.') && id !== 'arp.on').map((id) => [id, P[id]])); return { label: 'Rückgängig', fn: () => { for (const id in was) setParam(id, was[id]); } }; }
function spwFit() {
  const cv = SPW.cv; if (!cv) return;
  const w = cv.clientWidth, hh = cv.clientHeight; if (!w || !hh) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(hh * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(hh * dpr); }
  SPW.w = w; SPW.h = hh; SPW.dpr = dpr;
  if (!SPW.dust.length) for (let i = 0; i < 70; i++) SPW.dust.push({ x: Math.random(), y: Math.random(), s: 0.4 + Math.random() * 1.4, v: 0.004 + Math.random() * 0.012, p: Math.random() * 6.28 });
}
// a note's place inside the ring: the pool's notes evenly round (lowest at the top, clockwise up), each octave the
// Sporenwerk adds a ring further out
function spwNodePos(i, n, o, R) {
  const a = -Math.PI / 2 + 2 * Math.PI * (i + 0.5 * (o % 2) / Math.max(1, n)) / Math.max(1, n), r = R * (0.3 + 0.17 * clamp(o, 0, 3.5));
  return [Math.cos(a) * r, Math.sin(a) * r];
}
// the field's note nearest a pitch (its index in N.notes)
const noteXInv = (f) => { let bi = 0, bd = 1e9; N.notes.forEach((n, i) => { const d = Math.abs(Math.log2(n.f / f)); if (d < bd) { bd = d; bi = i; } }); return bi; };
const spwIdx = (pool, f) => { let bi = 0, bd = 1e9; pool.forEach((p, i) => { const d = Math.abs(Math.log2(p.f / f)); if (d < bd) { bd = d; bi = i; } }); return bi; };
function spwFrame(dt) {
  const cv = SPW.cv; if (!cv || !SPW.w) { spwFit(); return; }
  const c = cv.getContext('2d'), w = SPW.w, hh = SPW.h, dpr = SPW.dpr, now = A.ctx ? A.ctx.currentTime : 0, run = P['arp.on'];
  dt = Math.min(0.1, dt || 0.016); SPW.t += dt;
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  // the soil: dark, a breath of warm light where the ring stands
  const cx = w / 2, cy = hh / 2, R = Math.min(w, hh) * 0.42;
  const bg = c.createRadialGradient(cx, cy, R * 0.1, cx, cy, Math.max(w, hh) * 0.75);
  bg.addColorStop(0, run ? '#1d1712' : '#16120f'); bg.addColorStop(1, '#0d0a08'); c.fillStyle = bg; c.fillRect(0, 0, w, hh);
  // drifting dust, slow
  c.globalCompositeOperation = 'lighter';
  for (const d of SPW.dust) { d.y -= d.v * dt * (run ? 1.6 : 0.6); d.x += 0.004 * Math.sin(SPW.t * 0.3 + d.p) * dt; if (d.y < -0.02) { d.y = 1.02; d.x = Math.random(); } c.fillStyle = 'rgba(255,217,168,' + (0.05 + 0.08 * Math.sin(SPW.t + d.p) ** 2).toFixed(3) + ')'; c.beginPath(); c.arc(d.x * w, d.y * hh, d.s, 0, 6.2832); c.fill(); }
  // what was played since the last frame: a hypha grows to each note
  const pool = run ? arpPool(now).sort((p, q) => p.f - q.f) : [];
  for (const e of ARP.ev) {
    if (e.drawn || e.t > now + 0.02) continue;
    e.drawn = true;
    const n = Math.max(1, Math.round(P['arp.schritte'])), si = (((e.k - Math.round(P['arp.dreh']) - ARP.rot) % n) + n) % n, sa = -Math.PI / 2 + 2 * Math.PI * si / n;
    SPW.glow[si] = 1;
    if (e.rest) continue;
    const [nx, ny] = spwNodePos(spwIdx(pool, e.nf || e.f), pool.length, Math.max(0, e.o) + (e.d ? 0.5 : 0), R), sx = Math.cos(sa) * R, sy = Math.sin(sa) * R;
    SPW.beat = 1;
    SPW.hy.push({ sx, sy, nx, ny, f: e.f, t0: SPW.t, life: 2.4 + 1.6 * e.vel, acc: e.acc, d: e.d, bend: (Math.random() - 0.5) * 0.9 });
    const m = e.rat > 1 ? 6 * e.rat : e.acc ? 14 : 8;
    for (let i = 0; i < m; i++) { const a = Math.random() * 6.2832, s = (e.rat > 1 ? 30 : 18) + Math.random() * (e.acc ? 46 : 26); SPW.spr.push({ x: nx, y: ny, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 8, f: e.f, life: 0.5 + Math.random() * 0.7, t: 0, s: 0.8 + Math.random() * (e.acc ? 2.2 : 1.4) }); }
  }
  if (SPW.hy.length > 40) SPW.hy.splice(0, SPW.hy.length - 40);
  if (SPW.spr.length > 500) SPW.spr.splice(0, SPW.spr.length - 500);
  c.save(); c.translate(cx, cy);
  // octave rings, faint
  c.globalCompositeOperation = 'source-over';
  for (let o = 0; o < 5; o++) { c.strokeStyle = 'rgba(240,230,216,' + (0.035 - o * 0.004).toFixed(3) + ')'; c.lineWidth = 1; c.beginPath(); c.arc(0, 0, R * (0.2 + 0.15 * o), 0, 6.2832); c.stroke(); }
  // the hyphae: from the ring's step to the note, growing in 0.12 s, then fading into the soil
  c.globalCompositeOperation = 'lighter';
  SPW.hy = SPW.hy.filter((H) => SPW.t - H.t0 < H.life);
  for (const H of SPW.hy) {
    const age = SPW.t - H.t0, grow = Math.min(1, age / 0.12), fade = 1 - age / H.life, mx = (H.sx + H.nx) / 2 + H.bend * (H.ny - H.sy) * 0.4, my = (H.sy + H.ny) / 2 - H.bend * (H.nx - H.sx) * 0.4;
    const ex = H.sx + (H.nx - H.sx) * grow, ey = H.sy + (H.ny - H.sy) * grow;
    c.strokeStyle = spwCol(H.f, 0.08 * fade, 60); c.lineWidth = 5; c.beginPath(); c.moveTo(H.sx, H.sy); c.quadraticCurveTo(mx * grow + H.sx * (1 - grow), my * grow + H.sy * (1 - grow), ex, ey); c.stroke();
    c.strokeStyle = spwCol(H.f, (H.d ? 0.45 : 0.75) * fade, H.acc ? 80 : 70); c.lineWidth = H.acc ? 1.8 : 1.1; c.stroke();
  }
  // the heart: a small Fruchtkörper that swells with every step
  SPW.beat = (SPW.beat || 0) * Math.pow(0.004, dt);
  { const s = 1 + 0.35 * SPW.beat, g = c.createRadialGradient(0, 0, 0, 0, 0, 26 * s); g.addColorStop(0, 'rgba(255,214,160,' + (0.25 + 0.4 * SPW.beat).toFixed(3) + ')'); g.addColorStop(1, 'rgba(255,214,160,0)'); c.fillStyle = g; c.beginPath(); c.arc(0, 0, 26 * s, 0, 6.2832); c.fill();
    c.globalCompositeOperation = 'source-over'; c.fillStyle = 'rgba(240,230,216,.55)'; c.fillRect(-1.2, 0, 2.4, 9 * s); c.fillStyle = run ? '#e9a35e' : 'rgba(168,153,138,.5)'; c.beginPath(); c.ellipse(0, 0, 9 * s, 5.5 * s, 0, Math.PI, 0); c.fill(); c.globalCompositeOperation = 'lighter'; }
  // the notes of the pool: glowing nodes, breathing, their names beside them
  const oct = Math.max(1, Math.round(P['arp.okt']));
  pool.forEach((nt, i) => { for (let o = 1; o < oct; o++) { const [x, y] = spwNodePos(i, pool.length, o, R); c.fillStyle = spwCol(nt.f, 0.35, 70); c.beginPath(); c.arc(x, y, 1.6, 0, 6.2832); c.fill(); } });
  pool.forEach((nt, i) => {
    const [x, y] = spwNodePos(i, pool.length, 0, R), br = 0.6 + 0.4 * Math.sin(SPW.t * 2 + i);
    const g = c.createRadialGradient(x, y, 0, x, y, 16); g.addColorStop(0, spwCol(nt.f, 0.5 * br, 72)); g.addColorStop(1, spwCol(nt.f, 0, 60));
    c.fillStyle = g; c.beginPath(); c.arc(x, y, 16, 0, 6.2832); c.fill();
    c.fillStyle = '#fff6ea'; c.beginPath(); c.arc(x, y, 2.4, 0, 6.2832); c.fill();
    const nm = N.free ? '' : (hxDeg(nt.f) && N.notes[clamp(Math.round(noteXInv(nt.f)), 0, N.notes.length - 1)] || {}).name || '';
    if (nm) { c.globalCompositeOperation = 'source-over'; c.font = '500 10px ' + COL.fontNum; c.fillStyle = 'rgba(240,230,216,.6)'; c.textAlign = 'center'; c.fillText(nm, x, y - 10); c.globalCompositeOperation = 'lighter'; }
  });
  // spores bursting
  SPW.spr = SPW.spr.filter((s) => (s.t += dt) < s.life);
  for (const s of SPW.spr) { s.x += s.vx * dt; s.y += s.vy * dt; s.vx *= 0.96; s.vy = s.vy * 0.96 - 4 * dt; const a = 1 - s.t / s.life; c.fillStyle = spwCol(s.f, 0.85 * a, 78); c.beginPath(); c.arc(s.x, s.y, s.s * (0.6 + 0.4 * a), 0, 6.2832); c.fill(); }
  // the Pilzring: its steps
  const n = Math.max(1, Math.round(P['arp.schritte'])), sb = arpStepB(), cur = run && A.ctx ? Math.floor(tgBeat(now) / sb + 1e-6) : -1;
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + 2 * Math.PI * i / n, x = Math.cos(a) * R, y = Math.sin(a) * R, k = i + Math.round(P['arp.dreh']) + ARP.rot;
    const hit = arpRing(k), dropped = ARP.drop.has(i), gl = (SPW.glow[i] || 0);
    SPW.glow[i] = gl * Math.pow(0.02, dt);
    const isCur = cur >= 0 && (((cur - Math.round(P['arp.dreh']) - ARP.rot) % n) + n) % n === i;
    if (gl > 0.02 || isCur) { const g = c.createRadialGradient(x, y, 0, x, y, 22); g.addColorStop(0, 'rgba(255,200,130,' + (0.35 * Math.max(gl, isCur ? 0.4 : 0)).toFixed(3) + ')'); g.addColorStop(1, 'rgba(255,200,130,0)'); c.fillStyle = g; c.beginPath(); c.arc(x, y, 22, 0, 6.2832); c.fill(); }
    c.globalCompositeOperation = 'source-over';
    if (dropped) { c.setLineDash([2, 2]); c.strokeStyle = 'rgba(168,153,138,.5)'; c.lineWidth = 1; c.beginPath(); c.arc(x, y, 4.5, 0, 6.2832); c.stroke(); c.setLineDash([]); }
    else if (hit) {
      // a little cap on its stem, leaning outwards
      c.save(); c.translate(x, y); c.rotate(a + Math.PI / 2);
      c.strokeStyle = 'rgba(240,230,216,.35)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 5); c.stroke();
      c.fillStyle = isCur ? '#ffd29a' : 'rgba(255,179,92,' + (0.55 + 0.45 * gl).toFixed(3) + ')'; c.beginPath(); c.ellipse(0, -1, 6 + 2 * gl, 3.6 + gl, 0, Math.PI, 0); c.fill();
      c.fillStyle = 'rgba(255,246,234,.8)'; c.beginPath(); c.arc(-2, -2.6, 0.8, 0, 6.2832); c.arc(2.2, -2.2, 0.6, 0, 6.2832); c.fill();
      c.restore();
    } else { c.strokeStyle = 'rgba(240,230,216,.25)'; c.lineWidth = 1; c.beginPath(); c.arc(x, y, 3.5, 0, 6.2832); c.stroke(); }
    c.globalCompositeOperation = 'lighter';
  }
  // Mutation: fine threads sprouting from the ring, slowly
  const mu = P['arp.mutation'];
  if (mu > 0 && Math.random() < dt * 3 * mu) { const a = Math.random() * 6.2832; SPW.sprouts.push({ a, t: 0, len: 10 + Math.random() * 26, life: 2 + Math.random() * 2, b: (Math.random() - 0.5) * 1.2 }); }
  SPW.sprouts = SPW.sprouts.filter((s) => (s.t += dt) < s.life);
  for (const s of SPW.sprouts) {
    const g = Math.min(1, s.t / 0.8), f = 1 - s.t / s.life, x0 = Math.cos(s.a) * R, y0 = Math.sin(s.a) * R, x1 = Math.cos(s.a + s.b * 0.08 * g) * (R + s.len * g), y1 = Math.sin(s.a + s.b * 0.08 * g) * (R + s.len * g);
    c.strokeStyle = 'rgba(134,240,208,' + (0.35 * f).toFixed(3) + ')'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
  }
  c.restore();
  c.globalCompositeOperation = 'source-over';
  // the readout: what it does, in words
  const txt = !run ? 'Aus – schalte das Sporenwerk an und halte Töne' : !pool.length ? 'Wartet auf Töne – halte einen Akkord' + (P['arp.quelle'] !== 'spiel' ? ' oder lass eine Schleife spielen' : '') : pool.length + (pool.length === 1 ? ' Ton' : ' Töne') + ' · ' + ARP_FORMS.find((x) => x[0] === P['arp.form'])[1] + ' · ' + PD['arp.rate'].opts.find((o) => o[0] === P['arp.rate'])[1] + (P['arp.takt'] === 't' ? 'T' : P['arp.takt'] === 'p' ? '.' : '') + ' · Runde ' + ARP.round;
  if (SPW.read.textContent !== txt) SPW.read.textContent = txt;
}
