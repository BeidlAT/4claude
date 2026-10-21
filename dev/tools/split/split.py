#!/usr/bin/env python3
"""Splits myzel/index.html into a tree of modules that build.py puts back together byte for byte.

    python3 dev/tools/split/split.py <index.html> <out-src-dir> [--quiet]

Writes <out-src-dir>/index.html (the shell: the page's own lines plus one `@include` line per module) and the
modules under html/, css/ and js/ (the map is rules.py). The function myzelDsp() – copied by toString() into the
AudioWorklet – stays one function: its body is cut into js/dsp/*.js (one file per processor), included by the
shell js/dsp/myzel-dsp.js, which keeps the function's head, the registrations and its closing brace.

It refuses (exit 1) if the input already holds a line that looks like an @include, if a region of the page cannot be
found, or if the scanner finds unbalanced code. Rules whose section is missing are reported, not fatal.
"""
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import rules  # noqa: E402
from lex import boundary, scan_css, scan_js  # noqa: E402

INCLUDE = re.compile(r'^[ \t]*(?://|/\*|<!--)[ \t]*@include[ \t]+(\S+?)[ \t]*(?:\*/|-->)?[ \t]*$')


class Fail(Exception):
    pass


def line_index(s):
    """offsets of every line start"""
    out = [0]
    j = s.find('\n')
    while j >= 0:
        if j + 1 < len(s):
            out.append(j + 1)
        j = s.find('\n', j + 1)
    return out


def text_of(s, starts, k):
    a = starts[k]
    b = starts[k + 1] - 1 if k + 1 < len(starts) else len(s)
    return s[a:b].rstrip('\n')


def walk_up(states, starts, k, lo):
    """the top of the comment block that line k belongs to or sits under (not above line lo)"""
    while k > lo:
        cur = states.get(starts[k])
        above = states.get(starts[k - 1])
        if cur is not None and not cur.plain:   # inside a block comment: go to its start
            k -= 1
            continue
        if above is not None and (above.comment or not above.plain):
            k -= 1
            continue
        break
    return k


def cut_region(s, starts, k0, k1, states, depth, table, kind, report):
    """Cuts lines [k0, k1) by a rule table. Returns [(path, k_start, k_end)] covering the range without gaps."""
    cuts = [(table[0][0], k0)]
    pos = k0
    for entry in table[1:]:
        path, pat = entry[0], entry[1]
        opts = entry[2] if len(entry) > 2 else {}
        rx = re.compile(pat)
        k = pos + 1
        made = False
        while k < k1:
            if rx.search(text_of(s, starts, k)):
                c = k if opts.get('exact') else walk_up(states, starts, k, pos + 1)
                L = states.get(starts[c])
                ok = c > pos and (kind == 'html' or (L is not None and L.plain and L.depth == depth and
                                                      (kind == 'css' or boundary(L, depth))))
                if ok:
                    cuts.append((path, c))
                    pos = c
                    made = True
                    break
                report.append('not at a boundary: %s (line %d) – trying the next match' % (path, k + 1))
            k += 1
        if not made:
            report.append('missing: %s (%s) – its code stays in %s' % (path, pat, cuts[-1][0]))
    out = []
    for i, (path, k) in enumerate(cuts):
        end = cuts[i + 1][1] if i + 1 < len(cuts) else k1
        out.append((path, k, end))
    return out


def find_line(s, starts, pat, k0=0, k1=None):
    rx = re.compile(pat)
    for k in range(k0, len(starts) if k1 is None else k1):
        if rx.search(text_of(s, starts, k)):
            return k
    return -1


def split(s, report):
    """Returns {path: text} for the shell (index.html) and every module."""
    for ln in s.split('\n'):
        if INCLUDE.match(ln):
            raise Fail('the input already holds an @include line: %r' % ln[:80])
    starts = line_index(s)
    nl = len(starts)
    files = {}
    # the page's regions (line indices): <style> … </style>, markup, <script> (( ) => { 'use strict'; … })();
    ks = find_line(s, starts, r'^<style>$')
    ke = find_line(s, starts, r'^</style>$', ks + 1)
    kj = find_line(s, starts, r'^<script>$', ke + 1)
    if min(ks, ke, kj) < 0 or text_of(s, starts, kj + 1) != '(() => {' or text_of(s, starts, kj + 2) != "'use strict';":
        raise Fail('page regions not found (<style>, </style>, <script> + (() => { + \'use strict\';)')
    kz = nl - 1
    while kz > kj and text_of(s, starts, kz) != '})();':
        kz -= 1
    if kz <= kj or text_of(s, starts, kz + 1) != '</script>':
        raise Fail('the script\'s closing "})();" + "</script>" not found')
    js0, js1 = kj + 3, kz
    css = scan_css(s, starts[ks + 1], starts[ke])
    js = scan_js(s, starts[kj + 1], starts[kz + 1])   # the whole IIFE: its body is at depth 2
    plan = []   # (path, k_start, k_end, kind)
    plan += [(p, a, b, 'css') for p, a, b in cut_region(s, starts, ks + 1, ke, css, 0, rules.CSS, 'css', report)]
    plan += [(p, a, b, 'html') for p, a, b in cut_region(s, starts, ke + 1, kj, {}, 0, rules.HTML, 'html', report)]
    plan += [(p, a, b, 'js') for p, a, b in cut_region(s, starts, js0, js1, js, 2, rules.JS, 'js', report)]
    seen = set()
    for p, a, b, _ in plan:
        if p in seen:
            raise Fail('two modules with one path: ' + p)
        seen.add(p)

    def chunk(a, b):
        return s[starts[a]:(starts[b] if b < nl else len(s))]

    def directive(path, kind, indent=''):
        if kind == 'css':
            return '%s/* @include %s */\n' % (indent, path)
        if kind == 'html':
            return '%s<!-- @include %s -->\n' % (indent, path)
        return '%s// @include %s\n' % (indent, path)

    shell = [chunk(0, ks + 1)]
    for p, a, b, kind in plan:
        if a == b:
            report.append('empty: ' + p)
        files[p] = chunk(a, b)
        shell_piece = directive(p, kind)
        # between the regions: </style> before the markup, the IIFE's head before the script
        if kind == 'html' and a == ke + 1:
            shell.append(chunk(ke, ke + 1))
        if kind == 'js' and a == js0:
            shell.append(chunk(kj, js0))
        shell.append(shell_piece)
        # the DSP shell: myzelDsp's body becomes js/dsp/*.js
        if p == 'js/dsp/myzel-dsp.js':
            files[p] = dsp_shell(s, starts, a, b, js, report, files, directive)
    shell.append(chunk(js1, nl))
    files['index.html'] = ''.join(shell)
    return files


def dsp_shell(s, starts, a, b, js, report, files, directive):
    kf = find_line(s, starts, rules.DSP_FN, a, b)
    if kf < 0:
        report.append('myzelDsp() not found in its module – kept whole')
        return s[starts[a]:starts[b]]
    kt = find_line(s, starts, rules.DSP_TAIL, kf + 1, b)
    if kt < 0:
        report.append('the DSP tail (%s) not found – myzelDsp kept whole' % rules.DSP_TAIL)
        return s[starts[a]:starts[b]]
    kt = walk_up(js, starts, kt, kf + 2)
    if not boundary(js.get(starts[kt]), 3):
        report.append('the DSP tail is not at a boundary – myzelDsp kept whole')
        return s[starts[a]:starts[b]]
    parts = cut_region(s, starts, kf + 1, kt, js, 3, rules.DSP, 'js', report)
    out = [s[starts[a]:starts[kf + 1]]]
    for p, x, y in parts:
        if p in files:
            raise Fail('two modules with one path: ' + p)
        files[p] = s[starts[x]:starts[y]]
        out.append(directive(p, 'js', '  '))
    out.append(s[starts[kt]:starts[b]])
    return ''.join(out)


def main(argv):
    args = [x for x in argv[1:] if not x.startswith('--')]
    quiet = '--quiet' in argv
    if len(args) != 2:
        print(__doc__.strip().split('\n\n')[1], file=sys.stderr)
        return 2
    src = open(args[0], encoding='utf-8', newline='').read()
    out = args[1]
    report = []
    try:
        files = split(src, report)
    except (Fail, ValueError) as e:
        print('split: ' + str(e), file=sys.stderr)
        return 1
    if os.path.exists(out) and os.listdir(out):
        print('split: %s is not empty' % out, file=sys.stderr)
        return 1
    for p, text in files.items():
        f = os.path.join(out, p)
        os.makedirs(os.path.dirname(f), exist_ok=True)
        with open(f, 'w', encoding='utf-8', newline='') as fh:
            fh.write(text)
    if not quiet:
        w = max(len(p) for p in files)
        for p in files:
            print('%-*s %6d' % (w, p, files[p].count('\n')))
        print('%d files' % len(files))
    for r in report:
        print('note: ' + r, file=sys.stderr)
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
