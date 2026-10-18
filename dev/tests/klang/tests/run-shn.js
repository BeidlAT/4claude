// run suites of this copy against the Sehne slots, one after the other: node run-shn.js t-lib-row t-lib-lib …
// logs in out/<suite>.log; prints the PASS count and every FAIL line
const { spawnSync } = require('child_process'), fs = require('fs'), path = require('path');
const S = 'http://127.0.0.1:8790/';
const env = Object.assign({}, process.env, { KL_URL: S + 'kn-shn-inst/index.html', KN_URL: S + 'kn-shn-inst/index.html', KD_URL: S + 'kd-shn-inst/index.html', MYZEL_SRC: '/home/user/4claude/.claude/worktrees/agent-a3e20fd42104c26df/myzel/index.html' });
for (const t of process.argv.slice(2)) {
  const r = spawnSync('node', [path.join(__dirname, t + '.js')], { env, encoding: 'utf8', timeout: 900000, cwd: __dirname });
  const out = (r.stdout || '') + (r.stderr || ''); fs.writeFileSync(path.join(__dirname, 'out', t + '.log'), out);
  const lines = out.split('\n');
  console.log(`== ${t}: ${lines.filter((l) => l.startsWith('PASS')).length} pass, exit ${r.status}`);
  for (const l of lines) if (/^FAIL|fatal/.test(l)) console.log('   ' + l.slice(0, 300));
}
