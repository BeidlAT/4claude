// Checks a split against a real parser (acorn): every top-level statement of the app's script lies in exactly one
// module, none is cut – and so does every statement of myzelDsp()'s body (the processors' files). Every JS module
// parses on its own (strict mode), every CSS module has balanced braces.
//   node check_decls.js <app.html> <map.json from build.py --map> <src-dir>
// Exit 0 ok, 1 a finding, 2 acorn not found (install it: npm i acorn, or set ACORN to its path).
'use strict';
const fs = require('fs'), path = require('path');
let acorn = null;
for (const p of [process.env.ACORN, 'acorn', '/opt/node-tools/node_modules/acorn',
  '/opt/node22/lib/node_modules/eslint/node_modules/acorn', '/usr/lib/node_modules/acorn', '/usr/local/lib/node_modules/acorn']) {
  if (!p) continue;
  try { acorn = require(p); break; } catch (e) { /* next */ }
}
if (!acorn) { console.log('SKIP: acorn not found'); process.exit(2); }

const [app, mapFile, src] = process.argv.slice(2);
const s = fs.readFileSync(app, 'utf8');
const segs = JSON.parse(fs.readFileSync(mapFile, 'utf8'));
const fileAt = (line) => { for (const [a, b, f] of segs) if (line >= a && line <= b) return f; return null; };
const filesOf = (a, b) => { const out = new Set(); for (const [x, y, f] of segs) if (y >= a && x <= b) out.add(f); return out; };
const bad = [], warn = [];

// the app's script: the one <script> after the markup
const open = s.indexOf('\n<script>\n') + 1, close = s.lastIndexOf('</script>');
const code = s.slice(open + '<script>\n'.length, close);
const line0 = s.slice(0, open).split('\n').length;   // the line of <script>; code's line 1 is line0 + 1
const ast = acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'script', locations: true });
const iife = ast.body[0].expression.callee;
if (!iife || !iife.body || !iife.body.body) throw new Error('the IIFE was not found');
const L = (loc) => loc.line + line0;

function names(node, out) {
  if (!node) return out;
  if (node.type === 'Identifier') out.push(node.name);
  else if (node.type === 'ObjectPattern') node.properties.forEach((p) => names(p.type === 'RestElement' ? p.argument : p.value, out));
  else if (node.type === 'ArrayPattern') node.elements.forEach((e) => names(e, out));
  else if (node.type === 'AssignmentPattern') names(node.left, out);
  else if (node.type === 'RestElement') names(node.argument, out);
  return out;
}
function declared(st) {
  if (st.type === 'FunctionDeclaration' || st.type === 'ClassDeclaration') return [st.id.name];
  if (st.type === 'VariableDeclaration') return st.declarations.flatMap((d) => names(d.id, []));
  return [];
}

const where = new Map();   // name → file
let nStmt = 0, nDecl = 0, nDsp = 0, nDspDecl = 0;
function place(st, scope) {
  const fs_ = filesOf(L(st.loc.start), L(st.loc.end));
  const what = declared(st).join(', ') || st.type;
  if (fs_.size !== 1) bad.push(`${scope}: ${what} (lines ${L(st.loc.start)}–${L(st.loc.end)}) spans ${[...fs_].join(' + ') || 'nothing'}`);
  const f = [...fs_][0];
  for (const n of declared(st)) {
    const k = scope + ':' + n;
    // a function declared twice is legal (the later one wins, in the single file as in the build): only noted
    if (where.has(k)) (st.type === 'FunctionDeclaration' ? warn : bad).push(`${scope}: ${n} declared in ${where.get(k)} and again in ${f}`);
    where.set(k, f);
  }
  return f;
}
for (const st of iife.body.body) {
  nStmt++; nDecl += declared(st).length;
  if (st.type === 'FunctionDeclaration' && st.id.name === 'myzelDsp') {
    // the worklet function: its shell and its processors' files; each statement of its body in exactly one
    const fs_ = filesOf(L(st.loc.start), L(st.loc.end));
    const off = [...fs_].filter((f) => !f.startsWith('js/dsp/'));
    if (off.length) bad.push('myzelDsp reaches outside js/dsp/: ' + off.join(', '));
    where.set('app:myzelDsp', 'js/dsp/myzel-dsp.js');
    for (const inner of st.body.body) { nDsp++; nDspDecl += declared(inner).length; place(inner, 'myzelDsp'); }
    continue;
  }
  place(st, 'app');
}

// every module on its own
let nMod = 0;
for (const f of new Set(segs.map((x) => x[2]))) {
  const text = fs.readFileSync(path.join(src, f), 'utf8');
  if (f.endsWith('.js')) {
    nMod++;
    const shell = /@include/.test(text);
    if (shell) continue;   // js/dsp/myzel-dsp.js: checked as a whole above (the function with its parts)
    try { acorn.parse('"use strict";' + text, { ecmaVersion: 'latest', sourceType: 'script', allowReturnOutsideFunction: true }); }
    catch (e) { bad.push(`${f} does not parse on its own: ${e.message}`); }
  } else if (f.endsWith('.css')) {
    nMod++;
    const t = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'/g, '');
    let d = 0; for (const c of t) { if (c === '{') d++; else if (c === '}' && --d < 0) break; }
    if (d !== 0) bad.push(`${f}: unbalanced braces`);
  }
}
console.log(`statements: app ${nStmt} (${nDecl} declared names), myzelDsp ${nDsp} (${nDspDecl}); modules checked ${nMod}`);
for (const w of warn) console.log('note: ' + w + ' (the later one wins)');
if (bad.length) { console.log('FAIL\n  ' + bad.slice(0, 40).join('\n  ')); process.exit(1); }
console.log('OK: every top-level statement in exactly one module, none cut');
