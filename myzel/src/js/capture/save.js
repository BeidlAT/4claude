/* ---------- saving files ---------- */
let DL = null, dlChecked = false;
const inViewer = !!(window.claude && typeof window.claude.use === 'function');
if (inViewer) {
  try { window.claude.use('downloads').then((d) => { DL = d; dlChecked = true; renderRecInfo(); renderTakes(); }, () => { dlChecked = true; renderRecInfo(); renderTakes(); }); } catch (e) { dlChecked = true; }
} else dlChecked = true;
const canSave = () => !!DL || !inViewer;
function anchorSave(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: filename });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
// resolves 'saved' | 'declined' | 'too_large' | 'error'
async function offerFile(filename, blob) {
  if (DL) {
    try {
      const r = await DL.save({ filename, data: blob });
      toast(r && r.status === 'delivered' ? 'Datei übergeben.' : 'Gespeichert: ' + filename);
      return 'saved';
    } catch (e) {
      const code = e && e.code;
      if (code === 'declined') { toast('Speichern abgebrochen.'); return 'declined'; }
      if (code === 'too_large') return 'too_large';
      if (code === 'rate_limited') toast('Es ist schon ein Speicherdialog offen. Bitte erst diesen bestätigen.');
      else if (code === 'rejected_extension' || code === 'extension_not_enabled') toast('Dieser Dateityp kann in dieser Ansicht nicht gespeichert werden.');
      else toast('Speichern ist in dieser Ansicht gerade nicht möglich. Bitte später noch einmal versuchen.');
      return 'error';
    }
  }
  if (inViewer) { toast('Speichern ist in dieser Ansicht nicht verfügbar.'); return 'error'; }
  // iPhone/iPad: downloads from a home-screen app are awkward, the share sheet offers "In Dateien sichern".
  // Sharing needs a fresh tap (preparing the file may take seconds), so the toast carries the button.
  const IOS_ = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (IOS_ && navigator.canShare) {
    const file = new File([blob], filename, { type: blob.type || 'application/octet-stream' });
    if (navigator.canShare({ files: [file] })) {
      return new Promise((resolve) => {
        const tm = setTimeout(() => resolve('declined'), 30000);
        toast('Datei bereit: ' + filename, 30000, { label: 'Sichern …', fn: async () => {
          clearTimeout(tm);
          try { await navigator.share({ files: [file], title: filename }); resolve('saved'); }
          catch (e) { resolve(e && e.name === 'AbortError' ? 'declined' : 'error'); }
        } });
      });
    }
  }
  anchorSave(blob, filename);
  toast('Download gestartet: ' + filename);
  return 'saved';
}
async function saveTake(tk, btn, split) {
  if (tk.busy) return;
  tk.busy = true;
  const label = btn ? btn.textContent : '';
  const progress = (f) => { if (btn) btn.textContent = 'Wird vorbereitet … ' + Math.round(f * 100) + ' %'; };
  if (btn) { btn.disabled = true; progress(0); }
  try {
    if (!(await ensureTakeData(tk))) { toast('Die Daten dieser Aufnahme sind nicht mehr vorhanden.'); return; }
    const fmtKey = P['rec.fmt'], fi = FMT_INFO[fmtKey], norm = P['rec.norm'];
    const base = 'myzel-' + slug(tk.name) + '-' + stamp(tk.date) + '-' + fi.tag;
    const block = 2 * fi.bps;
    const perPart = split ? Math.floor(PART_BYTES / block) : tk.frames;
    const parts = Math.max(1, Math.ceil(tk.frames / perPart));
    const enc = new TextEncoder();
    for (let p = 0; p < parts; p++) {
      const from = p * perPart, to = Math.min(tk.frames, from + perPart);
      const name = parts > 1 ? base + '-teil-' + (p + 1) + '-von-' + parts : base;
      const wav = await encodeWav(tk, fmtKey, norm, from, to, (f) => progress((p + f) / parts));
      const exact = fmtKey === 'f32' && !norm;
      const readme = [
        'Myzel – Aufnahme „' + tk.name + '“' + (parts > 1 ? ' (Teil ' + (p + 1) + ' von ' + parts + ')' : ''),
        '',
        'Datei: ' + name + '.wav',
        'Format: WAV, ' + tk.sr + ' Hz, ' + fi.label + ', Stereo',
        'Dauer: ' + fmtDur((to - from) / tk.sr) + (parts > 1 ? ' (gesamt ' + fmtDur(tk.frames / tk.sr) + ')' : ''),
        ...(tk.bars ? ['Länge: ' + tk.bars + (tk.bars === 1 ? ' Takt' : ' Takte') + ' im 4/4-Takt bei ' + dec(String(tk.bpm)) + ' BPM = ' + tk.frames.toLocaleString('de-DE') + ' Samples, beginnt auf der Eins' + (tk.seamless ? ' und läuft nahtlos als Schleife.' : '.')] : []),
        'Spitzenpegel der Aufnahme: ' + dec(gainToDb(tk.peak).toFixed(1)) + ' dBFS' + (norm ? ' (beim Speichern auf −1 dBFS normalisiert)' : ''),
        'Aufgenommen: ' + tk.date.toLocaleString('de-DE'),
        '',
        CAP.mode === 'script' ? 'Abgegriffen im Kompatibilitätsmodus des Browsers: bei hoher Last sind kurze Aussetzer möglich.' :
        exact ? 'Die Samples sind bitgenau von der Summe abgegriffen – ohne Datenkompression.'
              : 'Abgegriffen von der Summe, ohne Datenkompression' + (fmtKey !== 'f32' ? ', auf ' + fi.label + ' mit Dither gewandelt' : '') + (norm ? ', normalisiert' : '') + '.',
        'Die Datei ' + base + '-klang.json enthält alle Klangeinstellungen; du kannst sie unter „Presets → Datei importieren“ wieder laden.',
      ].join('\r\n');
      let out, filename;
      if (DL || inViewer) {
        const entries = [zipEntry(name + '.wav', wav), zipEntry('LIESMICH.txt', enc.encode(readme))];
        if (p === 0) entries.splice(1, 0, zipEntry(base + '-klang.json', enc.encode(JSON.stringify({ app: 'Myzel', version: 1, name: tk.name, values: tk.patch }, null, 2))));
        out = buildZip(entries, new Date()); filename = name + '.zip';
      } else { out = wav.blob; filename = name + '.wav'; }
      const res = await offerFile(filename, out);
      if (res === 'too_large' && !split) {
        tk.needSplit = true; renderTakes();
        toast('Die Datei ist für diese App zu groß. Tippe auf „In Teilen speichern“.', 6000);
        return;
      }
      if (res !== 'saved') return;
    }
    tk.saved = true;
    idbDo('takes', 'readwrite', (st) => st.put(takeMeta(tk)));
  } catch (e) {
    console.error(e);
    toast('Die Datei konnte nicht erstellt werden – vermutlich reicht der Speicher nicht. Versuche „24 Bit“ oder „16 Bit“.');
  } finally {
    tk.busy = false;
    if (btn && btn.isConnected) { btn.disabled = false; btn.textContent = label; }
    renderTakes();
  }
}
function fmtDur(s) { const m = Math.floor(s / 60), r = s - m * 60; return m + ':' + String(Math.floor(r)).padStart(2, '0') + ',' + Math.floor((r % 1) * 10); }

