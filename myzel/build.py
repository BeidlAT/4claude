#!/usr/bin/env python3
"""Puts the module tree back together into the one-file app – plain concatenation in the order of the @include lines.

    python3 dev/tools/split/build.py <src-dir> <out-file>        # writes the app (e.g. myzel/index.html)
    python3 dev/tools/split/build.py <src-dir> --check <file>    # exit 1 if <file> differs from a fresh build
    python3 dev/tools/split/build.py <src-dir> <out-file> --map <map.json>   # also: which lines came from which file

<src-dir>/index.html is the shell. A line that holds only `// @include p`, `/* @include p */` or `<!-- @include p -->`
(p relative to <src-dir>) is replaced by that file's content, exactly – recursively, so js/dsp/myzel-dsp.js includes
the processors. Every file under html/, css/ and js/ must be included exactly once (a new module that is not in the
order yet, or one listed twice, is an error). Python 3 standard library only, so pwa/build.py can import build().
"""
import json
import os
import re
import sys

INCLUDE = re.compile(r'^[ \t]*(?://|/\*|<!--)[ \t]*@include[ \t]+(\S+?)[ \t]*(?:\*/|-->)?[ \t]*$')


class BuildError(Exception):
    pass


def build(src, entry='index.html', segments=None):
    """Returns the app as one string. segments (a list), if given, receives [first line, last line, file] for every
    stretch of output lines (1-based, inclusive) – the map from the app's lines back to the modules."""
    used = []
    out = []
    state = {'line': 1}

    def emit(text, path):
        if not text:
            return
        n = text.count('\n') + (0 if text.endswith('\n') else 1)
        if segments is not None:
            if segments and segments[-1][2] == path and segments[-1][1] == state['line'] - 1:
                segments[-1][1] += n
            else:
                segments.append([state['line'], state['line'] + n - 1, path])
        state['line'] += text.count('\n')
        out.append(text)

    def walk(path, stack):
        if path in stack:
            raise BuildError('include cycle: ' + ' → '.join(stack + [path]))
        f = os.path.join(src, path)
        if not os.path.isfile(f):
            raise BuildError('missing module %s (included by %s)' % (path, stack[-1] if stack else '-'))
        used.append(path)
        with open(f, encoding='utf-8', newline='') as fh:
            text = fh.read()
        buf = []
        for ln in re.findall(r'[^\n]*\n|[^\n]+$', text):   # lines, ends kept (only \n ends one)
            m = INCLUDE.match(ln.rstrip('\r\n'))
            if m:
                emit(''.join(buf), path); buf = []
                walk(m.group(1), stack + [path])
            else:
                buf.append(ln)
        emit(''.join(buf), path)

    walk(entry, [])
    dup = sorted({p for p in used if used.count(p) > 1})
    if dup:
        raise BuildError('included more than once: ' + ', '.join(dup))
    have = set()
    for d in ('html', 'css', 'js'):
        for root, _, names in os.walk(os.path.join(src, d)):
            for n in names:
                have.add(os.path.relpath(os.path.join(root, n), src).replace(os.sep, '/'))
    orphans = sorted(have - set(used))
    if orphans:
        raise BuildError('not included anywhere (add an @include line): ' + ', '.join(orphans))
    return ''.join(out)


def main(argv):
    args = argv[1:]
    mp = None
    if '--map' in args:
        i = args.index('--map'); mp = args[i + 1]; del args[i:i + 2]
    check = '--check' in args
    if check:
        args.remove('--check')
    if len(args) != 2:
        print(__doc__.strip().split('\n\n')[1], file=sys.stderr)
        return 2
    segs = [] if mp else None
    try:
        app = build(args[0], segments=segs)
    except BuildError as e:
        print('build: ' + str(e), file=sys.stderr)
        return 1
    if check:
        with open(args[1], encoding='utf-8', newline='') as fh:
            same = fh.read() == app
        print('build: %s %s the modules' % (args[1], 'matches' if same else 'DIFFERS from'))
        return 0 if same else 1
    with open(args[1], 'w', encoding='utf-8', newline='') as fh:
        fh.write(app)
    if mp:
        with open(mp, 'w', encoding='utf-8') as fh:
            json.dump(segs, fh)
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
