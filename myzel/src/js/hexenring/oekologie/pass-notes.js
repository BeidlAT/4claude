/* ---------- Hexenring: Ökologie (Etappe 4) ---------- */
// (dev/looper/SPEC.md §15, §10.6, §17, §12.3/§12.4 leftovers) Schleifen that feed the instrument and each other, meet,
// root and rot; the microphone; the Live playback; Ladung on loops, per-note vetoes, Wiederkehr without a Takt.

// ---- a loop's notes as a pass plays them – for Nähren (Rhizom, Regen) and MIDI out, scheduled ahead in the scheduler's
// tick as the Puls's are. Live or Wuchs: the pass's own notes (varied, breathing); an Abdruck: its notes as harvested ----
function hxPassNotes(L, k) {
  const C = L.pnC || (L.pnC = new Map()), hit = C.get(k); if (hit) return hit;
  const a = hxPassF(L, k), b = hxPassF(L, k + 1), len = Math.max(1e-3, (b - a) / SR), out = [];
  if (L.live || hxWAktiv(L)) {
    for (const id of L.sch) {
      const S = HX.sch.get(id); if (!hxWCan(S) || S.mute) continue;
      const job = hxWPass(L, S, k, { live: hxEigN(L) >= 1, tail: 0 }); if (!job) continue;
      for (const n of job.notes) if (n.eng !== 'bor' && n.t0 < len) out.push({ t0: n.t0, t1: n.t1, f: n.f, vel: n.vel, y: n.y0 != null ? n.y0 : 0.5, pan: n.pan || 0, eng: n.eng });
    }
  } else for (const n of L.notes || []) if (n.f > 0) out.push({ t0: n.ph * len, t1: n.d != null ? n.ph * len + Math.max(0.03, n.d) : null, f: n.f, vel: n.v != null ? n.v : 0.7, y: n.y != null ? n.y : 0.5, pan: 0, eng: n.eng });
  for (const n of out) n.x = hxDeg(n.f).x;
  C.set(k, out); for (const x of C.keys()) if (x < k - 3 || x > k + 6) C.delete(x);
  return out;
}
// the notes due before the horizon, once each (a cursor per purpose): fn(note, its time, its end)
function hxFeedAhead(L, key, now, horizon, fn) {
  const cur = L.fd || (L.fd = {}), f1 = Math.round(hxF(horizon)), from = Math.max(cur[key] || 0, Math.round(hxF(now + 0.004)));
  cur[key] = Math.max(cur[key] || 0, f1);
  if (f1 <= from || L.state !== 'spielt' || L.gg === 0) return;
  for (let k = hxPassK(L, from), g = 0; g < 4; k++, g++) {
    const a = hxPassF(L, k); if (a >= f1) break;
    for (const n of hxPassNotes(L, k)) {
      const f = a + Math.round(n.t0 * SR);
      if (f >= from && f < f1) try { fn(n, hxT(f), n.t1 != null ? hxT(a + Math.round(n.t1 * SR)) : null); } catch (e) { console.warn(e); }
    }
  }
}
// what a loop's own voices sound through: the chain's copy into the strip „Hexenring“ – no tap hears it (KONZEPT §3.2)
function hxFeedBus() { hxOut1(); hxWakeRing(); return hxChain('fx1').in; }
// a pass of a loop changed (its notes, its key, its length): the notes made for it are made again
function hxPassNotesDrop(L) { if (L && L.pnC) L.pnC.clear(); }

