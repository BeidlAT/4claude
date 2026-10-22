#!/usr/bin/env python3
"""The split tool's acceptance: split → build must give the input back byte for byte, and every top-level statement
must land in exactly one module (acorn, test/check_decls.js) – on the working tree's myzel/index.html, on HEAD and on
older commits, so the tool keeps working while the file changes.

    python3 dev/tools/split/test/run.py <scratch-dir> [-v] [commit …]   (-v: list the missing rules)

Without commits: the working tree, HEAD and seven older commits spread over the file's history. Light: one version
at a time, about 3 s each. Also runs the scanner's unit cases (test_lex.py) and checks that the checker itself catches
a cut inside a statement (a module boundary moved by one line).
"""
import json
import os
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TOOL = os.path.dirname(HERE)
REPO = os.path.abspath(os.path.join(TOOL, '..', '..', '..'))
sys.path.insert(0, TOOL)
import build  # noqa: E402
import split  # noqa: E402

APP = 'myzel/index.html'


def git(*a):
    return subprocess.run(['git', '-C', REPO] + list(a), check=True, capture_output=True).stdout


def versions(args):
    if args:
        return [(c, git('show', '%s:%s' % (c, APP)).decode('utf-8')) for c in args]
    out = [('working tree', open(os.path.join(REPO, APP), encoding='utf-8', newline='').read()),
           ('HEAD', git('show', 'HEAD:' + APP).decode('utf-8'))]
    hist = git('log', '--format=%h', '--', APP).decode().split()
    n = len(hist)
    picks = sorted({hist[min(n - 1, round(i * (n - 1) / 7))] for i in range(1, 8)}, key=hist.index)
    for c in picks:
        out.append((c, git('show', '%s:%s' % (c, APP)).decode('utf-8')))
    return out


def check(scratch, text, sub):
    d = os.path.join(scratch, sub)
    shutil.rmtree(d, ignore_errors=True)
    os.makedirs(d)
    src = os.path.join(d, 'src')
    report = []
    files = split.split(text, report)
    for p, t in files.items():
        f = os.path.join(src, p)
        os.makedirs(os.path.dirname(f), exist_ok=True)
        with open(f, 'w', encoding='utf-8', newline='') as fh:
            fh.write(t)
    segs = []
    out = build.build(src, segments=segs)
    same = out == text
    app, mp = os.path.join(d, 'app.html'), os.path.join(d, 'map.json')
    with open(app, 'w', encoding='utf-8', newline='') as fh:
        fh.write(out)
    with open(mp, 'w') as fh:
        json.dump(segs, fh)
    r = subprocess.run(['node', os.path.join(HERE, 'check_decls.js'), app, mp, src], capture_output=True, text=True)
    missing = [x for x in report if x.startswith('missing')]
    return {'same': same, 'decl': r.returncode, 'decl_out': r.stdout.strip(), 'files': len(files),
            'lines': text.count('\n'), 'missing': missing, 'notes': [x for x in report if x not in missing],
            'segs': segs, 'src': src, 'app': app, 'mp': mp}


def checker_catches(res):
    """move one module boundary down by one line inside a multi-line statement: the checker must fail"""
    segs = res['segs']
    for i in range(len(segs) - 1):
        a, b, f = segs[i]
        if f.startswith('js/') and segs[i + 1][2].startswith('js/') and b - a > 3:
            bad = [list(x) for x in segs]
            bad[i][1] -= 2
            bad[i + 1][0] -= 2
            mp = res['mp'] + '.bad'
            with open(mp, 'w') as fh:
                json.dump(bad, fh)
            r = subprocess.run(['node', os.path.join(HERE, 'check_decls.js'), res['app'], mp, res['src']],
                               capture_output=True, text=True)
            if r.returncode == 1:
                return True
    return False


def main(argv):
    if len(argv) < 2:
        print(__doc__.strip().split('\n\n')[1], file=sys.stderr)
        return 2
    verbose = '-v' in argv
    argv = [a for a in argv if a != '-v']
    scratch = os.path.abspath(argv[1])
    os.makedirs(scratch, exist_ok=True)
    fails = 0
    r = subprocess.run([sys.executable, os.path.join(HERE, 'test_lex.py')], capture_output=True, text=True)
    print(r.stdout.strip() or r.stderr.strip())
    fails += r.returncode != 0
    first = None
    for name, text in versions(argv[2:]):
        try:
            res = check(scratch, text, 'first' if first is None else 'older')
        except (split.Fail, ValueError, build.BuildError) as e:
            print('%-13s FAIL split/build: %s' % (name, e))
            fails += 1
            continue
        first = first or res
        decl = {0: 'statements OK', 1: 'STATEMENTS CUT', 2: 'acorn missing (skipped)'}.get(res['decl'], 'checker error')
        ok = res['same'] and res['decl'] in (0, 2)
        fails += not ok
        print('%-13s %6d lines → %3d files · %s · %s · rules missing %d%s' % (
            name, res['lines'], res['files'], 'byte-identical' if res['same'] else 'DIFFERENT', decl,
            len(res['missing']), '' if ok else '  FAIL'))
        for m in (res['missing'] if verbose else []) + res['notes']:
            print('              ' + m)
        if res['decl'] != 0:
            print('              ' + res['decl_out'].replace('\n', '\n              '))
        else:
            for ln in res['decl_out'].split('\n'):
                if ln.startswith('note:'):
                    print('              ' + ln)
    if first:
        # the functions copied by toString() (the worklet, the buffer worker) stay self-contained; the ES-module numbers
        r = subprocess.run(['node', os.path.join(TOOL, 'xref.js'), first['app'], first['mp']], capture_output=True, text=True)
        for ln in r.stdout.split('\n'):
            if ln.startswith(('copied', 'let/var', 'read at load', 'declared twice')) or ' import bindings' in ln:
                print('xref: ' + ln)
        if r.returncode != 0:
            print('xref: FAIL ' + (r.stderr.strip().split('\n') or [''])[-1])
            fails += 1
    if first and first['decl'] == 0:
        c = checker_catches(first)
        print('checker sanity: a boundary moved into a statement is %s' % ('caught' if c else 'NOT CAUGHT'))
        fails += not c
    print('ALL OK' if not fails else '%d FAILED' % fails)
    return 1 if fails else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
