# Klangbibliothek II, Etappe 4 (Strom, Trap, LoFi, Welt): the spec for add_sources.py, written as Python for the
# engines' JavaScript. python3 dev/klang/stufen/etappe4.py > dev/klang/stufen/etappe4.json
import json
def held(k, proc, fb, att, rel, brel, cmt, extra=''):
    return f"""  // {cmt}
  {k}: {{
    sustain: true, needs: 'worklet', fallback: '{fb}',
    start(v, t, f, y, vel, o) {{
{extra}      wkVoice(v, 'myzel-{k}', f, y, {{ prm: wkPrm('{k}'), seed: wkSeed(), on: {{ on: t, f, y, vel, burst: !!o.burst, gate: o.burst ? o.gate : 0, seed: wkSeed(){', from' if k == 'gbs' else ''} }} }});
      const peak = vel * {k.upper()}_PEAK;
      if (o.burst) burstEnv(v, t, peak, {att}, o.gate, {brel} * (o.decayMul || 1));
      else wkHold(v, t, peak, {att}, {rel});
    }},
  }},
"""
def damped(k, fb, L0, cmt):   # struck, rings while held; let go the processor damps it (like Tabla)
    return f"""  // {cmt}
  {k}: {{
    sustain: true, needs: 'worklet', fallback: '{fb}',
    start(v, t, f, y, vel, o) {{
      const L0 = {L0}, dmul = wkDmul(o, L0), life = L0 * dmul + 0.3;
      wkVoice(v, 'myzel-{k}', f, y, {{ prm: wkPrm('{k}'), seed: wkSeed(), on: {{ on: t, f, y, vel, dmul, seed: wkSeed() }} }});
      v.out.gain.setValueAtTime({k.upper()}_PEAK, t);
      if (o.burst) {{ wkRing(v, t, {k.upper()}_PEAK, life); return; }}
      v.release = () => {{ if (!v.alive || v.released) return; const now = A.ctx.currentTime; v.wk.port.postMessage({{ off: now }}); v.released = true; v.relAt = now; v.out.gain.setTargetAtTime(0, now + 0.6, 0.08); v.finish(now + 1.1); }};
      v.finish(t + life);
    }},
  }},
"""
def struck(k, fb, L0, cmt, pre=''):
    return f"""  // {cmt}
  {k}: {{
    sustain: false, needs: 'worklet', fallback: '{fb}',
    start(v, t, f, y, vel, o) {{
      const L0 = {L0}, dmul = wkDmul(o, L0), life = L0 * dmul + 0.3;
{pre}      wkVoice(v, 'myzel-{k}', f, y, {{ prm: wkPrm('{k}'), seed: wkSeed(), on: {{ on: t, f, y, vel, dmul, seed: wkSeed(), burst: !!o.burst, gate: o.burst ? o.gate : 0 }} }});
      wkRing(v, t, {k.upper()}_PEAK, life);
    }},
  }},
"""
S = []
def add(**d): S.append(d)
add(key='wkg', n='Westküste', fam='strom', art='beides', i='Wavefolder und Vaktrol – der Buchla-Bongo',
    tags='westküste west coast buchla wavefolder falter lowpass gate vactrol vaktrol fm complex oscillator bongo modular experimentell',
    hoehe='Faltung', regen=1, gate=1.0, rich='Stufe 3: wie Stufe 1',
    knobs=[['faltung', 'Faltung', 0.4], ['fm', 'FM', 0.3], ['verhaeltnis', 'Verhältnis', 0.25], ['vaktrol', 'Vaktrol', 0.5]], macro=['faltung', 'fm'],
    help='Ein komplexer Oszillator wie an der Westküste: der Träger wird vom Modulator frequenzmoduliert und dann gefaltet – je mehr Faltung, desto mehr gummiartig helle Obertöne. Dahinter das Lowpass-Gate: ein Vaktrol öffnet Filter und Lautstärke zugleich, schnell, und schließt langsam – angetippt der Bongo, gehalten bleibt es offen. Die Höhe faltet: unten rund und hölzern, oben eine summende Glaswand.',
    glyph='<path d="M3 12c2-6 3-6 4.5 0s2.5 6 4.5 0 3-6 4.5 0 2.5 6 4.5 0"/><path d="M4 20h16" stroke-dasharray="1.5 2"/>',
    engine=held('wkg', 'wkg', 'neb', 0.002, 1.2, 0.4, 'Westküste: complex oscillator, wavefolder, low pass gate (myzel-wkg) – Höhe folds. Stand-in: Nebel.'))
add(key='bnt', n='Schaltkreis', fam='strom', art='beides', i='Verbogene Schaltung: Sprünge, Stottern, Bits',
    tags='schaltkreis circuit bending bent glitch bitcrush bitcrusher lofi sample rate stotter stutter spielzeug toy noise experimentell kaputt',
    hoehe='Zerstörung', regen=1, gate=1.0, rich='Stufe 3: wie Stufe 1',
    knobs=[['bits', 'Bits', 0.4], ['sprung', 'Sprung', 0.4], ['stottern', 'Stottern', 0.3], ['kreuz', 'Kreuzung', 0.3]], macro=['sprung', 'stottern'],
    help='Ein Spielzeug, dessen Platine umgelötet wurde: zwei gekreuzte Oszillatoren, ein stolpernder Takt (Aliasing), zu wenige Bits; ab und zu springt die Schaltung auf Oktave oder Quinte, oder der Speicher bleibt hängen und stottert. Die Höhe ist die Zerstörung: unten ein sauberes kleines Rechteck, oben zerfällt die Schaltung. Jeder Sprung kehrt zur Note zurück.',
    glyph='<path d="M4 6h5v4h4V6h7M4 18h3v-4h5v4h8"/><circle cx="9" cy="10" r="1.2"/><circle cx="12" cy="14" r="1.2"/>',
    engine=held('bnt', 'bnt', 'kor', 0.003, 0.08, 0.06, 'Schaltkreis: a circuit-bent toy (myzel-bnt) – Höhe is the destruction. Stand-in: Körner.'))
add(key='kas', n='Kassette', fam='strom', art='beides', i='E-Piano auf altem Band: Leiern, Rauschen, Wärme',
    tags='kassette cassette tape band lofi lo-fi rhodes wurlitzer e-piano epiano electric piano wow flutter leiern hiss chillhop beats',
    hoehe='Anschlag (weich → bellend)', regen=1, gate=1.6, rich='Stufe 3: wie Stufe 1',
    knobs=[['alter', 'Bandalter', 0.5], ['glocke', 'Glocke', 0.4], ['nachklang', 'Nachklang', 0.5], ['waerme', 'Wärme', 0.5]], macro=['alter', 'waerme'],
    help='Ein Zungen-E-Piano: der Hammer schlägt eine Stimmgabel an, ihr Glockenton stirbt schnell, der Tonabnehmer neben der Zunge färbt – je härter, desto mehr „Bellen“. Dann ein altes Band: Leiern und Flattern, Sättigung, abgenutzte Höhen, Rauschen und kurze Aussetzer. Die Höhe ist der Anschlag: unten weich und rund, oben bellend. Bandalter: wie alt die Kassette ist.',
    glyph='<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="8.5" cy="12" r="2"/><circle cx="15.5" cy="12" r="2"/><path d="M8.5 14h7"/>',
    engine=damped('kas', 'klb', "(1.2 + 7 * P['kas.nachklang']) * clamp(Math.pow(260 / f, 0.6), 0.35, 1.6) * 1.2", 'Kassette: a tine piano on a worn tape (myzel-kas) – Höhe is the strike; let go, the damper. Stand-in: Kalimba.'))
add(key='bit', n='Achtbit', fam='strom', art='beides', i='Pulswellen-Chip, Arpeggio-Flimmern, 4-Bit-Lautstärke',
    tags='achtbit 8bit 8-bit chiptune chip nes gameboy c64 sid pulse puls rechteck square arpeggio tracker retro game videospiel',
    hoehe='Tastgrad', regen=1, gate=0.8, rich='Stufe 3: zweiter Kanal, verstimmt, links und rechts',
    knobs=[['arpeggio', 'Arpeggio', 0], ['leben', 'Leben (Vibrato, Breite)', 0.35], ['dreieck', 'Dreieck (Bass)', 0.4], ['abklingen', 'Abklingen', 0.4]], macro=['arpeggio', 'leben'],
    help='Der Pulskanal eines Soundchips: die Pulsbreite ist die Farbe (12,5 % dünn, 25 % hohl, 50 % Rechteck), die Lautstärke fällt in 16 hörbaren Stufen, das Tracker-Arpeggio flimmert den Akkord in einzelnen Tönen, dazu verzögertes Vibrato und darunter der körnige Dreieckskanal eine Oktave tiefer. Die Höhe ist die Pulsbreite.',
    glyph='<path d="M3 17V8h4v9h3V8h2v9h4V8h1v9h4"/>',
    engine=held('bit', 'bit', 'obt', 0.002, 0.13, 0.08, 'Achtbit: a pulse-wave sound chip (myzel-bit) – Höhe is the width. Stand-in: Obertöne.'))
add(key='gbs', n='Gleitbass', fam='erde', art='haelt', i='808-Bass: Knack, Gleiten, Antrieb – Trap',
    tags='gleitbass 808 bass sub trap drill hiphop glide slide portamento kick distortion verzerrung tief bass',
    hoehe='Antrieb', regen=0, gate=1.2, rich='Stufe 3: wie Stufe 1',
    knobs=[['knack', 'Knack', 0.5], ['ausklang', 'Ausklang', 0.6], ['gleiten', 'Gleiten', 0.4], ['ton', 'Ton', 0.6]], macro=['gleiten', 'knack'],
    help='Der 808 des Trap: ein Sinus, der von oben in die Note fällt (der Knack – die Kick im Bass), dann der lange Körper. Eine neue Note, während die letzte noch klingt, gleitet von deren Tonhöhe hinüber. Die Höhe ist der Antrieb: unten der saubere Sub, oben eine knurrende Verzerrung. Ton schließt den Tiefpass dahinter.',
    glyph='<path d="M3 15c3 0 3-6 6-6s4 8 7 8 3-4 5-4"/><path d="M4 20h16"/>',
    engine=held('gbs', 'gbs', 'tie', 0.001, 0.1, 0.12, "Gleitbass: the 808 bass (myzel-gbs) – Höhe is the drive; a note while the last still sounds glides from it (legato,\n  // that one is cut). Stand-in: Tiefe.",
                extra="      let from = 0; if (P['gbs.gleiten'] > 0.02 && !o.burst) for (const w of A.voices) if (w !== v && w.alive && w.as === 'gbs' && w.bus === v.bus && w.t0 < t && w._gf && (!w.released || t - w.relAt < 0.25)) { from = w._gf; w.out.gain.cancelScheduledValues(t); w.out.gain.setTargetAtTime(0, t, 0.012); w.released = true; w.relAt = t; w.finish(t + 0.1); }\n      v._gf = f;\n"))
add(key='hht', n='Zischel', fam='erz', art='schlaegt', i='808-Hi-Hat aus sechs Rechtecken, Wirbel im Puls',
    tags='zischel hihat hi-hat hat 808 trap drill wirbel roll rolls becken cymbal metall perkussion beats',
    hoehe='offen', regen=1, gate=0.6, rich='Stufe 3: das Metall im Stereo',
    knobs=[['ton', 'Ton', 0.5], ['wirbel', 'Wirbel (Puls)', 0.4], ['rauschen', 'Rauschen', 0.25], ['abwuergen', 'Abwürgen', 1]], macro=['ton', 'wirbel'],
    help='Die Hi-Hat der 808: sechs Rechtecke auf ihren schiefen Frequenzen, durch Bandpässe und Hochpass – mit der Note gestimmt. Die Höhe öffnet sie: unten ein Tick, oben ein Zischen bis eine Sekunde. Eine neue würgt die offene ab. Im Puls wird jeder Schlag zum Trap-Wirbel (Hälften, Drittel, Viertel des Schritts).',
    glyph='<path d="M3 10h18M6 10l6-3 6 3"/><path d="M12 10v10M8 20h8"/><path d="M5 14l2 1M19 14l-2 1" stroke-dasharray="1 1.5"/>',
    engine=struck('hht', 'mem', "(0.03 + 1.1 * Math.pow(clamp(y, 0, 1), 1.7)) * 1.6 + 0.1", 'Zischel: the 808 hi-hat (myzel-hht) – Höhe opens it; a new hat chokes an open one on the same channel. Stand-in: Membran.',
                  pre="      if (P['hht.abwuergen'] > 0.5) for (const w of A.voices) if (w !== v && w.alive && w.as === 'hht' && w.wk && w.bus === v.bus && w.t0 < t) w.wk.port.postMessage({ choke: 1, t: t + 0.002 });\n"))
add(key='vox', n='Silbe', fam='luft', art='beides', i='Gesungene Silbe: Konsonant, Vokal, Vocal Chop',
    tags='silbe vox vocal chop chops stimme voice gesang formant vokal konsonant singen choir lofi trap future',
    hoehe='Vokal (u o a e i)', regen=1, gate=0.8, rich='Stufe 3: zwei Sänger, leicht verschieden',
    knobs=[['konsonant', 'Konsonant', 0.4], ['hauch', 'Hauch', 0.3], ['groesse', 'Größe', 0.5], ['vibrato', 'Vibrato', 0.4]], macro=['konsonant', 'groesse'],
    help='Eine Stimme aus ihren Teilen: Stimmlippenpuls mit dem kleinen Zittern einer echten Stimme, Hauch, fünf Formanten des Vokaltrakts und am Anfang ein Konsonant (keiner, p, t, k, s, ch). Die Höhe ist der Vokal: unten u, dann o, a, e, oben i. Im Puls wird jeder Schlag eine gehackte Silbe – Vocal Chops.',
    glyph='<path d="M7 9a5 5 0 0 1 10 0v2a5 5 0 0 1-10 0z"/><path d="M12 16v4M9 20h6"/>',
    engine=held('vox', 'vox', 'stm', 0.004, 0.12, 0.08, 'Silbe: a sung syllable (myzel-vox) – Höhe is the vowel. Stand-in: Stimme.'))
add(key='spu', n='Spieluhr', fam='erz', art='schlaegt', i='Stahlkamm, Walzenstift, müdes Uhrwerk',
    tags='spieluhr music box spieldose kamm comb zunge glockenspiel celesta lofi nostalgie kinder traum uhrwerk',
    hoehe='Aufzug (müde → frisch)', regen=1, gate=1.6, rich='Stufe 3: Doppelzungen, links und rechts',
    knobs=[['glanz', 'Glanz', 0.45], ['nachklang', 'Nachklang', 0.5], ['uhrwerk', 'Uhrwerk', 0.3], ['kasten', 'Kasten', 0.5]], macro=['glanz', 'uhrwerk'],
    help='Ein Stahlkamm: jede Zunge ein eingespannter Stab mit unharmonischen Obertönen, gezupft von einem Stift der Walze (das kleine Klicken davor), der Kasten antwortet, das Uhrwerk tickt leise mit. Die Höhe ist der Aufzug: unten ist die Feder fast abgelaufen – der Ton sackt und leiert –, oben frisch aufgezogen, ruhig und hell.',
    glyph='<path d="M4 7h16M6 7v6M9 7v8M12 7v10M15 7v8M18 7v6"/><circle cx="12" cy="20" r="1.4"/>',
    engine=struck('spu', 'klb', "(1.5 + 6 * P['spu.nachklang']) * clamp(Math.pow(523 / f, 0.7), 0.35, 1.8) + 0.2", 'Spieluhr: a music box (myzel-spu) – Höhe is the winding. Stand-in: Kalimba.'))
add(key='kto', n='Koto', fam='holz', art='beides', i='Seidensaite, Elfenbeinnagel, Nachdrücken (Oshide)',
    tags='koto japan japanisch zither seide silk nagel tsume oshide pentatonik saite string zupfen pluck guzheng asien',
    hoehe='Anschlag; gehalten: hoch = Nachdrücken', regen=1, gate=1.6, rich='Stufe 3: der Korpus im Stereo',
    knobs=[['nagel', 'Nagel', 0.6], ['seide', 'Seide', 0.5], ['nachklang', 'Nachklang', 0.5], ['druck', 'Druck (Oshide)', 0.6]], macro=['druck', 'nagel'],
    help='Eine Seidensaite auf beweglichem Steg, gezupft mit dem Elfenbeinnagel; der lange Kasten aus Paulownia trägt sie. Die Höhe beim Anschlag ist die Zupfstelle: unten rund, oben nah am Steg, hell und schnarrend. Gehalten drückt die linke Hand hinter dem Steg: den Finger nach oben schieben hebt den Ton bis zum Ganzton (Oshide), mit Druck zittert er (Yuri). Loslassen dämpft.',
    glyph='<path d="M3 18L21 6"/><path d="M3 14l14-9M7 19l14-9" stroke-dasharray="1.4 1.8"/><path d="M11 9.5l2 3"/>',
    engine=damped('kto', 'sai', "(1.2 + 6 * P['kto.nachklang']) * clamp(Math.pow(260 / f, 0.5), 0.4, 1.6) * 1.15", 'Koto: a silk string, an ivory nail (myzel-kto) – Höhe is the pluck, held moving up presses behind the bridge. Stand-in: Saite.'))
for s in S: assert len(s['i']) <= 52, (s['key'], len(s['i']))
print(json.dumps({'knobAnchor': '// Glut (worklet myzel-ember', 'engineAnchor': '  // Ranke: scanned synthesis on a ring of masses (myzel-scan).', 'sources': S}, ensure_ascii=False, indent=1))
