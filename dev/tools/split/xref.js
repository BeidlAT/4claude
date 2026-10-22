// What a later move to real ES modules would have to write down: for every module, the shared names it uses from
// other modules (its imports) and the names others use from it (its exports); top-level `let`/`var` bindings that
// another module assigns (ES imports are read-only: they need a setter or a state object); and functions declared
// twice (the later one wins today – as separate modules each caller would keep its own).
//   node dev/tools/split/xref.js <app.html> <map.json from build.py --map> [-v] [--json out.json]
// Needs acorn and eslint-scope (found in /opt/node-tools/node_modules here; npm i acorn eslint-scope elsewhere).
'use strict';
const fs = require('fs');
const req = (n) => { for (const p of [process.env.NODE_TOOLS && process.env.NODE_TOOLS + '/' + n, n, '/opt/node-tools/node_modules/' + n]) { if (!p) continue; try { return require(p); } catch (e) { /* next */ } } throw new Error(n + ' not found'); };
const acorn = req('acorn'), escope = req('eslint-scope');

const [app, mapFile] = process.argv.slice(2);
const jsonOut = process.argv.includes('--json') ? process.argv[process.argv.indexOf('--json') + 1] : null;
const s = fs.readFileSync(app, 'utf8');
const segs = JSON.parse(fs.readFileSync(mapFile, 'utf8'));
const open = s.indexOf('\n<script>\n') + 1, close = s.lastIndexOf('</script>');
const code = s.slice(open + '<script>\n'.length, close);
const line0 = s.slice(0, open).split('\n').length;
const fileAt = (line) => { line += line0; for (const [a, b, f] of segs) if (line >= a && line <= b) return f; return '?'; };
const ast = acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'script', locations: true, ranges: true });
const sm = escope.analyze(ast, { ecmaVersion: 2022, sourceType: 'script' });
const iife = ast.body[0].expression.callee;
const top = sm.acquire(iife);   // the IIFE's function scope: the app's shared names

const mod = (f) => (f.startsWith('js/dsp/') ? 'js/dsp/myzel-dsp.js' : f);   // js/dsp/ is myzelDsp: one unit
const M = new Map();   // module → {imports: Map(name → from), exports: Set}
const get = (m) => { if (!M.has(m)) M.set(m, { imports: new Map(), exports: new Set() }); return M.get(m); };
const writes = new Map();   // name → Set(modules that assign it from outside)
const dups = [];
const loadRefs = new Map();   // module → Set(name from module): read while the module itself runs (not in a function)
const atLoad = (r) => { let sc = r.from; while (sc && sc.type !== 'function') sc = sc.upper; return sc === top; };
for (const v of top.variables) {
  if (!v.defs.length || v.name === 'arguments') continue;
  const def = v.defs[v.defs.length - 1];
  const home = mod(fileAt(def.name.loc.start.line));
  if (v.defs.length > 1) dups.push(v.name + ': ' + v.defs.map((d) => fileAt(d.name.loc.start.line)).join(' + '));
  for (const r of v.references) {
    const at = mod(fileAt(r.identifier.loc.start.line));
    if (at === home) continue;
    get(at).imports.set(v.name, home);
    get(home).exports.add(v.name);
    if (atLoad(r) && def.type !== 'FunctionName') {
      if (!loadRefs.has(at)) loadRefs.set(at, new Set());
      loadRefs.get(at).add(v.name + ' ← ' + home);
    }
    if (r.isWrite() && def.type === 'Variable' && def.parent && def.parent.kind !== 'const') {
      if (!writes.has(v.name)) writes.set(v.name, new Set([home + ' (declared)']));
      writes.get(v.name).add(at);
    }
  }
}
// the functions copied by toString() into another scope (the AudioWorklet, the buffer worker) must not read app names
const COPIED = ['myzelDsp', 'genIR', 'genTexture', 'genKS'];
const leaks = [];
for (const st of iife.body.body) {
  if (st.type !== 'FunctionDeclaration' || !COPIED.includes(st.id.name)) continue;
  const seen = new Set();
  (function walk(sc) {
    for (const r of sc.through) if (r.resolved && r.resolved.scope === top && !seen.has(r.identifier.name)) { seen.add(r.identifier.name); }
    sc.childScopes.forEach(walk);
  })(sm.acquire(st));
  seen.delete(st.id.name);
  if (seen.size) leaks.push(st.id.name + ' reads ' + [...seen].join(', '));
}
const rows = [...M].map(([m, x]) => [m, x.imports.size, x.exports.size]).sort((a, b) => a[0].localeCompare(b[0]));
const sum = (i) => rows.reduce((t, r) => t + r[i], 0);
console.log('module'.padEnd(40) + 'imports  exports');
for (const [m, i, e] of rows) console.log(m.padEnd(40) + String(i).padStart(7) + String(e).padStart(9));
console.log(`\n${rows.length} modules · ${sum(1)} import bindings · ${top.variables.length} shared names`);
console.log(`let/var assigned from another module (need a setter or a state object): ${writes.size}`);
for (const [n, ms] of writes) console.log('  ' + n + ': ' + [...ms].join(', '));
const nLoad = [...loadRefs.values()].reduce((t, x) => t + x.size, 0);
console.log(`read at load time from another module (that module must have run first – the import graph's order, not the manifest's): ${nLoad} in ${loadRefs.size} modules`);
if (process.argv.includes('-v')) for (const [m, xs] of loadRefs) console.log('  ' + m + ': ' + [...xs].join(', '));
console.log(`copied by toString() (${COPIED.join(', ')}): ${leaks.length ? 'READ APP NAMES – ' + leaks.join('; ') : 'self-contained'}`);
console.log(`declared twice (the later one wins today): ${dups.length}`);
for (const d of dups) console.log('  ' + d);
if (leaks.length) process.exitCode = 1;
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify({ modules: Object.fromEntries([...M].map(([m, x]) => [m, { imports: Object.fromEntries(x.imports), exports: [...x.exports].sort() }])), writes: Object.fromEntries([...writes].map(([n, ms]) => [n, [...ms]])), dups }, null, 1));
