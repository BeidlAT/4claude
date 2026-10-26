#!/usr/bin/env python3
# Klangbibliothek II: one source's lines in every place the app keeps them (params.js ENG_META + its knobs + GROUP,
# engines.js, dsp-loader.js WORKLET_ENGINES, controls.js live updates, mapping.js MACRO, puls-mix.js help, glyphs.html).
#   python3 dev/klang/add_sources.py <spec.json>     – the spec: a list of sources (see the stage files beside it)
import json, sys, os
SRC = os.path.join(os.path.dirname(__file__), '..', '..', 'myzel', 'src')
P = lambda *a: os.path.join(SRC, *a)
def rd(p): return open(p, encoding='utf-8').read()
def wr(p, s): open(p, 'w', encoding='utf-8').write(s)
def put(p, anchor, text, before=True):
    s = rd(p); assert s.count(anchor) == 1, (p, anchor[:60], s.count(anchor))
    s = s.replace(anchor, text + anchor if before else anchor + text); wr(p, s)
spec = json.load(open(sys.argv[1], encoding='utf-8'))
FAM_END = {'luft': "  neb: { n: 'Nebel'", 'dunst': "  hrz: { n: 'Harz'", 'holz': "  glo: { n: 'Glocke'", 'erz': "  tie: { n: 'Tiefe'", 'erde': "};\n// sources of later versions", 'strom': "};\n// sources of later versions"}
for S in spec['sources']:
    k = S['key']
    assert len(S['i']) <= 52, (k, len(S['i']))
    s = rd(P('js/core/params.js'))
    if ("  " + k + ": { n: ") in s: print('already there:', k); continue
    meta = "  %s: { n: '%s', fam: '%s', art: '%s', i: '%s', tags: '%s', hoehe: '%s', regen: %d, hear: { gate: %s }, rich: '%s' },\n" % (k, S['n'], S['fam'], S['art'], S['i'], S['tags'], S['hoehe'], S.get('regen', 0), S.get('gate', 1.2), S['rich'])
    put(P('js/core/params.js'), FAM_END[S['fam']], meta)
    knobs = ''.join("NUM('%s.%s', '%s', 0, 1, %s, '%%');\n" % (k, kk, lab, d) for kk, lab, d in S['knobs'])
    put(P('js/core/params.js'), spec['knobAnchor'], "const %s_PEAK = %s;\n" % (k.upper(), S.get('peak', 1)) + knobs)
    put(P('js/core/params.js'), "hlm: 'Halm', rnk: 'Ranke',", "%s: '%s', " % (k, S['n']))
    put(P('js/engines/engines.js'), spec['engineAnchor'], S['engine'])
    s = rd(P('js/engines/dsp-loader.js')); s = s.replace("]);\nA.workletOK = false;", ", '%s']);\nA.workletOK = false;" % k, 1); wr(P('js/engines/dsp-loader.js'), s)
    put(P('js/ui/controls.js'), "case 'hng': case 'gml':", "case '%s': " % k)
    put(P('js/midi/mapping.js'), "hng: ['hng.glanz', 'hng.nachklang'],", "%s: ['%s.%s', '%s.%s'], " % (k, k, S['macro'][0], k, S['macro'][1]))
    put(P('js/mixer/puls-mix.js'), "  hng: 'Ein Tipp schlägt ein Stahlfeld an.", "  %s: '%s',\n" % (k, S['help'].replace("'", "\\'")))
    put(P('html/glyphs.html'), '<symbol id="g-off"', '<symbol id="g-%s" viewBox="0 0 24 24">%s</symbol>\n' % (k, S['glyph']))
    print('added', k)
