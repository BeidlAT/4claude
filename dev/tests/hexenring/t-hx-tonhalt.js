// (owner, 27.10.2026) A new Schleife plays its recording (hx.folgen „fest“); a preset loaded over Schleifen keeps
// their key (ui.tonart „preset“) – its sound, never another key under them; switched off, the preset brings its own key.
// node t-hx-tonhalt.js
const G = require('./hx-g'), H = require('./hx-h');
const { ok } = H;
(async () => {
  const { page, errors } = await G.open({ w: 1440, h: 900 });
  const r = await page.evaluate(async () => {
    const M = window.__M, A = M.A, sl = window.__sleep, o = {};
    await window.__reset(); window.__grid(100); await sl(300);
    M.setParam('hx.laenge', 'fest'); M.setParam('hx.festT', 1);
    o.std = M.P['hx.folgen'];
    const B0 = Math.ceil(M.tgBeat(A.ctx.currentTime + 0.3) / 4) * 4;
    window.__riff(M.tgTime(B0), 0.6, [0, 4, 7, 4], 1, { eng: 'klb', dur: 0.3 }); await window.__until(M.tgTime(B0 + 4) + 0.06);
    M.hxKorb(null);
    for (let i = 0; i < 100 && !M.hxLoopsLive().every((L) => L.sch.every((id) => M.HX.sch.get(id).aud)); i++) await sl(100);
    await sl(1500);
    const L = M.hxLoopsLive()[0]; o.ton = L.ton;
    const key = () => M.P['t.root'] + '/' + M.P['t.scale'];
    o.k0 = key();
    const other = M.PRESETS.find((p) => p.v['t.root'] != null && (String(p.v['t.root']) !== String(M.P['t.root']) || p.v['t.scale'] !== M.P['t.scale']));
    o.pk = other.key + ':' + other.v['t.root'] + '/' + other.v['t.scale'];
    M.setParam('ui.tonart', 'preset'); M.loadPreset(other); await sl(400); o.k1 = key(); o.eng = M.P['v.eng'] === (other.v['v.eng'] || M.PD['v.eng'].d);
    o.folge = !!M.HX.folge;
    M.setParam('ui.tonart', 'schleifen'); o.folgt = M.hxTonOf(L) + '/' + M.hxWFolgt(L); M.loadPreset(M.PRESET_LEER); await sl(200); M.loadPreset(other); await sl(400); o.k2 = key();
    M.setParam('ui.tonart', 'preset'); o.fest = M.hxTonOf(L);
    M.loadPreset(M.PRESET_LEER); await sl(200); M.hxLeeren(); await sl(300); M.loadPreset(other); await sl(300); o.k3 = key();
    return o;
  });
  console.log(JSON.stringify(r));
  ok(r.std === 'fest' && r.ton === 'fest', `a new Schleife plays its recording (hx.folgen ${r.std}, its ton ${r.ton})`);
  ok(r.k1 === r.k0 && r.eng && !r.folge, `a preset in another key (${r.pk}) over it: the key stays ${r.k1}, the rest of its sound comes`);
  ok(r.k2 === r.pk.split(':')[1] && /^diatonisch\/true$/.test(r.folgt) && r.fest === 'fest', `„Schleifen folgen dem Preset“: the preset's own key (${r.k2}), the loop follows (${r.folgt}); back: fest again (${r.fest})`);
  ok(r.k3 === r.pk.split(':')[1], `no Schleifen: the preset's key as always (${r.k3})`);
  ok(!errors.length, 'no page errors ' + errors.slice(0, 3).join(' | '));
  H.summary(); process.exit(0);
})();
