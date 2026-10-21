"""Unit cases for the scanner: the line starts it must call plain (between statements) or not."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from lex import boundary, scan_css, scan_js  # noqa: E402

# (source, {line number (1-based): expected boundary at depth 0})
CASES = [
    ("const a = 1;\nconst b = 2;\n", {2: True}),
    ("const r = /[}{'\"`]/g;\nfunction f() {\n  return 1;\n}\nf();\n", {2: True, 3: False, 5: True}),
    ("const x = a / b / c;\nconst y = 2;\n", {2: True}),
    ("const t = `line\n}\n${ { a: '`' }.a }\n`;\nlet z;\n", {2: False, 3: False, 4: False, 5: True}),
    ("/* {\n}\n*/\nconst a = {\n  b: 1,\n};\n", {2: False, 4: True, 5: False}),
    ("const s = '{'; // }\nconst q = \"}\";\n", {2: True}),
    ("if (a) {\n  b();\n}\nelse {\n  c();\n}\nd();\n", {4: False, 7: True}),
    ("const v = a\n  .b();\nconst w = x\n  ? 1\n  : 2;\nw;\n", {2: False, 4: False, 5: False, 6: True}),
    ("const f = (x) => x\n/ 2;\n", {2: False}),
    ("x = y.return / 2 / 3;\ny;\n", {2: True}),
    ("const k = typeof /a}/;\nk;\n", {2: True}),
]


def main():
    fails = 0
    for src, want in CASES:
        lines = scan_js(src)
        starts = sorted(lines)
        for ln, exp in want.items():
            got = boundary(lines[starts[ln - 1]], 0)
            if got != exp:
                fails += 1
                print('FAIL line %d of %r: boundary %s, want %s' % (ln, src, got, exp))
    css = scan_css("a { b: '}' }\n/* { */\nc { }\n")
    if not (css[0].depth == 0 and sorted(css)[2] and css[sorted(css)[2]].plain):
        fails += 1
        print('FAIL css')
    for bad in ("const a = {;\n", "const s = 'x;\n", "/* open\n", "const t = `x${ 1 \n"):
        try:
            scan_js(bad)
            fails += 1
            print('FAIL: no error for %r' % bad)
        except ValueError:
            pass
    print('scanner cases: %s' % ('OK' if not fails else '%d FAILED' % fails))
    return 1 if fails else 0


if __name__ == '__main__':
    sys.exit(main())
