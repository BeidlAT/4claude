/* ---------- Ebenen on the Klang page (owner, 30.10.2026: „bis zu 8 Ebenen … eine klare Ebenen-Sektion“) ----------
   One row per layer (params.js EB): its name, what it plays, Pegel, Mute (its strip's M) and Solo (among the layers);
   „Einstellen“ opens the rest – interval, scale step, Feinstimmung, Pan (its strip's), the Tonbereich and the
   Anschlags-Bereich with their soft edges. Ebene 1 is the Klangquelle above (its octave and step there), Ebene 2 the old
   second layer (its controls keep their ids, #p-v-layer …). Ebenen 3–8 show once they have a sound or „+ Ebene“ opened
   them – the page stays short for a preset of one or two. Built from the page's own parts (section, grid, ctl, chip). */
const EBUI = { sec: null, rows: [], shown: new Set(), add: null };
const ebHas = (e) => e.n === 1 || !!ENGINES[P[e.eng]];
function ebSection() {
  EBUI.rows = EB.map(ebRow);
  EBUI.add = h('button', { type: 'button', class: 'btn ghost', onclick: ebAdd }, '+ Ebene');
  EBUI.sec = section('Ebenen', 'Bis zu acht Klänge auf jedem Finger, jeder mit eigenem Kanal im Mixer', ...EBUI.rows.map((r) => r.el), h('div', { class: 'row' }, EBUI.add),
    h('p', { class: 'note' }, 'Alle Ebenen klingen auf jedem Ton. Tonstufe verschiebt um Stufen der Skala – so bleibt jeder Ton in der Tonart. Ton- und Anschlags-Bereich lassen eine Ebene nur in einem Teil der Fläche oder der Tastatur, nur leise oder nur kräftig spielen; der weiche Rand blendet sie dort aus. Mute und Solo gelten ab dem nächsten Ton (was klingt, verstummt sofort). Klangfarbe, Raum und Effekte jeder Ebene regelst du im Mixer.'));
  ebUI();
  return EBUI.sec;
}
function ebRow(e) {
  const k = e.k, w = 'Ebene ' + e.n, pre = { prefix: 'eb-' };
  const sum = h('span', { class: 'note', style: 'margin:0' });
  const chip = (id, txt, aria) => {
    const b = h('button', { type: 'button', class: 'chip', role: 'switch', 'aria-checked': 'false', 'aria-label': aria, 'data-pid': PD[id].live ? null : id, onclick: () => setParam(id, !P[id]) }, txt);
    bindCtl(id, (v) => b.setAttribute('aria-checked', String(!!v)));
    return b;
  };
  const det = grid(...[e.int ? ctl(e.int, { label: 'Intervall' }) : null, e.n > 1 ? ctl(e.deg, { label: 'Tonstufe' }) : null, ctl(e.pre + 'fine', { label: 'Feinstimmung' }), ctl('x' + k + '.pan', Object.assign({ label: 'Pan' }, pre)),
    ctl(e.pre + 'lo'), ctl(e.pre + 'hi'), ctl(e.pre + 'rand'), ctl(e.pre + 'vlo'), ctl(e.pre + 'vhi'), ctl(e.pre + 'vrand')].filter(Boolean));
  det.hidden = true;
  const tog = h('button', { type: 'button', class: 'chip', 'aria-expanded': 'false', 'aria-label': w + ' einstellen', onclick: () => { det.hidden = !det.hidden; tog.setAttribute('aria-expanded', String(!det.hidden)); } }, 'Einstellen');
  const head = h('div', { class: 'chips small', style: 'align-items:center' }, h('b', { style: 'min-width:5.5em' }, w), chip('x' + k + '.mute', 'M', w + ' stumm'), chip(e.pre + 'solo', 'S', w + ' solo (unter den Ebenen)'), tog, sum);
  // Ebene 1 plays the Klangquelle chosen above; Ebene 2 keeps its controls' ids (no prefix); 3–8 their own
  const src = e.n === 1 ? null : ctl(e.eng, { label: 'Klang' });
  const lvl = ctl(e.lvl, { label: 'Pegel' });
  const el = h('div', { class: 'eb-row', 'data-eb': String(e.n), style: 'padding:6px 0 8px;border-top:1px solid var(--line)' }, head, src, grid(lvl), det);
  return { e, el, sum, det };
}
// the next layer without a sound shows its row (its sound is chosen there)
function ebAdd() {
  const e = EB.find((x) => x.n > 2 && !ebHas(x) && !EBUI.shown.has(x.n));
  if (!e) return;
  EBUI.shown.add(e.n); ebUI();
  const r = EBUI.rows[e.n - 1], b = r.el.querySelector('.kq-name');
  if (b) b.focus({ preventScroll: true });
  r.el.scrollIntoView({ block: 'nearest', behavior: REDUCED ? 'auto' : 'smooth' });
}
// what each row says: its sound, its pitch, its ranges when set, and whether it plays now
function ebUI() {
  if (!EBUI.sec) return;
  const solo = EB.some((x) => P[x.pre + 'solo']);
  for (const r of EBUI.rows) {
    const e = r.e, p = e.pre, has = ebHas(e);
    r.el.hidden = e.n > 2 && !has && !EBUI.shown.has(e.n);
    const bits = [];
    if (e.n === 1) bits.push(ENG_NAME[P['v.eng']] || '');
    else if (!has) bits.push('aus');
    if (has) {
      if (e.n === 1 ? P['v.oct'] : P[e.int]) bits.push(e.n === 1 ? 'Oktave ' + fmtOct(P['v.oct']) : fmt(PD[e.int], P[e.int]));
      if (P[e.deg]) bits.push(fmtDeg(P[e.deg]));
      if (P[p + 'fine']) bits.push(fmtCent(P[p + 'fine']));
      if (P[p + 'lo'] > 0 || P[p + 'hi'] < 127) bits.push(fmtKey(P[p + 'lo']) + '–' + fmtKey(P[p + 'hi']));
      if (P[p + 'vlo'] > 0 || P[p + 'vhi'] < 1) bits.push('Anschlag ' + Math.round(P[p + 'vlo'] * 100) + '–' + Math.round(P[p + 'vhi'] * 100) + ' %');
      if (P['x' + e.k + '.mute']) bits.push('stumm');
      else if (solo && !P[p + 'solo']) bits.push('still (Solo)');
    }
    const t = bits.filter(Boolean).join(' · ');
    if (r.sum.textContent !== t) r.sum.textContent = t;
  }
  if (EBUI.add) EBUI.add.hidden = !EB.some((x) => x.n > 2 && !ebHas(x) && !EBUI.shown.has(x.n));
}
