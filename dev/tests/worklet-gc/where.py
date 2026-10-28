# where in a processor's optimised code numbers are boxed (inline HeapNumber allocations) and which JS calls are not
# inlined – each mapped to its source line.   python3 where.py <name> [dsp.js]
import sys, re, subprocess, os
name = sys.argv[1]; dsp = sys.argv[2] if len(sys.argv) > 2 else 'dsp.js'
env = dict(os.environ, DSP='./' + dsp)
t = subprocess.run(['node', '--allow-natives-syntax', '--print-opt-code', '--code-comments', os.environ.get('DBG', 'dbg3.js'), name], capture_output=True, text=True, env=env).stdout
src = open(dsp).read()
def line_of(pos): return src.count('\n', 0, pos) + 1
for blk in t.split('--- Raw source ---')[1:]:
    m = re.search(r'\nname = (\S+)', blk); fname = m.group(1) if m else '?'
    if fname in ('run', 'mk', '(anon)', 'blk'): continue
    code = re.findall(r'^0x[0-9a-f]+\s+([0-9a-f]+)\s+[0-9a-f]+\s+(.*)$', blk, re.M)
    sp = re.search(r'Source positions:\n pc offset  position\n(.*?)\n\n', blk, re.S)
    pos = []
    if sp:
        for l in sp.group(1).split('\n'):
            p = l.split()
            if len(p) >= 2:
                try: pos.append((int(p[0], 16), int(p[1])))
                except ValueError: pass
    def src_at(pc):
        best = None
        for a, b in pos:
            if a <= pc: best = b
        return best
    hits = {}
    for i, (pc, ins) in enumerate(code):
        if 'movq [r13+0x48] (external value (Heap::NewSpaceAllocationTopAddress()))' in ins:
            what = '?'
            for j in range(i + 1, min(i + 8, len(code))):
                mm2 = re.search(r'\((?:root \()?(\w*map)\)|object: 0x[0-9a-f]+ <(Map[^>]*)>', code[j][1])
                if mm2: what = mm2.group(1) or mm2.group(2); break
            sp_ = src_at(int(pc, 16)); k = ('alloc ' + what, line_of(sp_) if sp_ else 0); hits[k] = hits.get(k, 0) + 1
        mm = re.search(r'<JSFunction (\w+) \(sfi', ins)
        if mm:
            sp_ = src_at(int(pc, 16)); k = ('call ' + mm.group(1), line_of(sp_) if sp_ else 0); hits[k] = hits.get(k, 0) + 1
    if hits:
        print('==', fname)
        for (kind, ln), c in sorted(hits.items(), key=lambda x: x[0][1]):
            print(f'  {kind:14s} line {ln}: {src.split(chr(10))[ln-1].strip()[:150] if ln else ""}')
