// run the library suites against Glut's slot (env KL_URL) and summarise   node run-lib-glt.js
const { execFileSync } = require('child_process'), fs = require('fs'), path = require('path');
for (const t of ['t-lib-row', 't-lib-lib', 't-lib-a11y', 't-lib-migr', 't-lib-fb']) {
  let out = '';
  try { out = execFileSync('node', [path.join(__dirname, t + '.js')], { env: process.env, encoding: 'utf8', timeout: 900000 }); } catch (e) { out = (e.stdout || '') + (e.stderr || ''); }
  fs.writeFileSync(path.join(__dirname, 'out', t + '.log'), out);
  const lines = out.split('\n');
  console.log(`== ${t}: ${lines.filter((l) => l.startsWith('PASS')).length} pass`);
  for (const l of lines) if (/^FAIL|fatal/.test(l)) console.log('  ' + l.slice(0, 300));
}
