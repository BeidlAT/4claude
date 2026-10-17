// Compare two Chrome heap snapshots: which (type, constructor/name) groups grew.   node heapcmp.js a.heapsnapshot b.heapsnapshot [top]
const fs = require('fs');
function agg(file) {
  const s = JSON.parse(fs.readFileSync(file, 'utf8')), m = s.snapshot.meta, F = m.node_fields, NF = F.length, T = m.node_types[0];
  const iT = F.indexOf('type'), iN = F.indexOf('name'), iS = F.indexOf('self_size'), out = new Map();
  for (let i = 0; i < s.nodes.length; i += NF) {
    const type = T[s.nodes[i + iT]];
    let name = type === 'string' || type === 'concatenated string' || type === 'sliced string' ? '(string)' : s.strings[s.nodes[i + iN]];
    if (type === 'number') name = '(number)';
    if (name && name.length > 80) name = name.slice(0, 80);
    const k = type + ' ' + name, e = out.get(k) || { n: 0, sz: 0 };
    e.n++; e.sz += s.nodes[i + iS]; out.set(k, e);
  }
  return out;
}
const a = agg(process.argv[2]), b = agg(process.argv[3]), top = +(process.argv[4] || 25), rows = [];
for (const [k, e] of b) { const o = a.get(k) || { n: 0, sz: 0 }; rows.push([k, e.n - o.n, e.sz - o.sz]); }
for (const [k, o] of a) if (!b.has(k)) rows.push([k, -o.n, -o.sz]);
rows.sort((x, y) => y[2] - x[2]);
let tot = 0; for (const r of rows) tot += r[2];
console.log('total self size Δ ' + (tot / 1024).toFixed(1) + ' KB');
for (const r of rows.slice(0, top)) console.log(String(r[2]).padStart(9) + ' B  ' + String(r[1]).padStart(7) + '  ' + r[0]);
