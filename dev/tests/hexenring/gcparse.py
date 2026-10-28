import sys, re, json, collections
inwin = False; st = collections.defaultdict(lambda: {'n':0,'freed':0,'pause':0,'maxp':0,'types':collections.Counter(),'alloc':0})
sec = float(sys.argv[2]) if len(sys.argv) > 2 else 10
for line in open(sys.argv[1]):
    if '@@MARK start' in line: inwin = True; continue
    if '@@MARK end' in line: inwin = False; continue
    m = re.search(r'\[(\d+):(0x[0-9a-f]+:\d+)\]\s+[\d.]+ ms: GC: (\{.*)', line)
    if not m or not inwin: continue
    try: d = json.loads(m.group(3))
    except Exception: continue
    k = m.group(1) + ':' + m.group(2); s = st[k]
    s['n'] += 1; s['freed'] += d.get('start_object_size',0) - d.get('end_object_size',0); s['pause'] += d['pause']; s['maxp'] = max(s['maxp'], d['pause']); s['types'][d['gc']] += 1
    s['alloc'] += d.get('allocated', 0) if isinstance(d.get('allocated'), (int,float)) else 0
for k, s in sorted(st.items(), key=lambda x: -x[1]['freed']):
    print(f"{k}: {s['n']} GCs, freed {s['freed']/1e6/sec:.2f} MB/s, pause total {s['pause']:.1f} ms, max {s['maxp']:.2f} ms, {dict(s['types'])}")
