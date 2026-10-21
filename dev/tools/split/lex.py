"""A small, dependency-free JavaScript/CSS scanner: just enough to know, for every line start, whether it lies in
plain code (not inside a string, template, comment or regex) and at which bracket depth – so the splitter cuts only
between whole statements. test/check_decls.js checks the cuts against a real parser (acorn)."""
import bisect
import re

KW_BEFORE_REGEX = {'return', 'typeof', 'case', 'do', 'else', 'in', 'of', 'new', 'delete', 'void', 'throw',
                   'instanceof', 'yield', 'await'}
_ident = re.compile(r'[A-Za-z_$\u0080-￿][\w$\u0080-￿]*')
_num = re.compile(r'0[xXoObB][0-9a-fA-F_]+n?|(?:\d[\d_]*\.?[\d_]*|\.\d[\d_]*)(?:[eE][+-]?\d+)?n?')
_str = {"'": re.compile(r"'(?:[^'\\\n]|\\[\s\S])*'"), '"': re.compile(r'"(?:[^"\\\n]|\\[\s\S])*"')}
_regex = re.compile(r'/(?:[^/\\\[\n]|\\.|\[(?:[^\]\\\n]|\\.)*\])+/[a-z]*')
_ws = re.compile(r'[ \t\r\n\f\v ﻿  ]+')
_CLOSE = {'(': ')', '[': ']', '{': '}'}


class Line:
    """The state at the start of one line.
    depth: open brackets of any kind (a template's ${ counts); plain: the line start is in code, not inside a
    string, template, regex or comment; comment: the line's first token is a comment; prev / nxt: the last
    significant token before the line start and the first after it (comments skipped; words as themselves)."""
    __slots__ = ('depth', 'plain', 'prev', 'nxt', 'comment')

    def __init__(self, depth, plain):
        self.depth, self.plain, self.prev, self.nxt, self.comment = depth, plain, None, None, False


def _line_starts(s, start, end):
    out = [start]
    j = s.find('\n', start, end)
    while j >= 0 and j + 1 < end:
        out.append(j + 1)
        j = s.find('\n', j + 1, end)
    return out


def scan_js(s, start=0, end=None):
    """Scans s[start:end] as JavaScript; returns {offset of each line start: Line}. Raises ValueError on unbalanced
    brackets or an unterminated string, comment, template or regex – a sign that the scanner lost its way."""
    end = len(s) if end is None else end
    starts = _line_starts(s, start, end)
    lines = {}
    stack = []      # '(' '[' '{' or '${'
    toks = []       # (offset, token): significant tokens
    prev = None     # the last significant token's kind, for regex vs division
    li = 0
    i = start

    def settle(upto, plain):
        # line starts before `upto` that have no state yet get this one
        nonlocal li
        while li < len(starts) and starts[li] < upto:
            lines[starts[li]] = Line(len(stack), plain)
            li += 1

    def comment_line(at):
        k = bisect.bisect_right(starts, at) - 1
        p = starts[k]
        if p in lines and not s[p:at].strip():
            lines[p].comment = True

    while i < end:
        m = _ws.match(s, i)
        if m:
            i = min(m.end(), end)
            settle(i, True)
            continue
        settle(i + 1, True)
        c = s[i]
        if s.startswith('//', i):
            comment_line(i)
            j = s.find('\n', i, end)
            i = end if j < 0 else j
            continue
        if s.startswith('/*', i):
            comment_line(i)
            j = s.find('*/', i + 2, end)
            if j < 0:
                raise ValueError('unterminated comment at %d' % i)
            settle(j + 2, False)
            i = j + 2
            continue
        if c in '\'"':
            m = _str[c].match(s, i, end)
            if not m:
                raise ValueError('unterminated string at %d' % i)
            settle(m.end(), False)
            toks.append((i, 'str')); prev = 'str'
            i = m.end()
            continue
        if c == '`' or (c == '}' and stack and stack[-1] == '${'):
            if c == '}':
                stack.pop()
            j = i + 1
            while True:
                if j >= end:
                    raise ValueError('unterminated template at %d' % i)
                d = s[j]
                if d == '\\':
                    j += 2
                elif d == '`':
                    j += 1; settle(j, False); toks.append((i, 'str')); prev = 'str'; break
                elif d == '$' and s.startswith('${', j):
                    j += 2; settle(j, False); stack.append('${'); toks.append((i, '${')); prev = '${'; break
                else:
                    j += 1
            i = j
            continue
        if c == '/' and (prev is None or prev in KW_BEFORE_REGEX or prev not in (')', ']', '}', 'str', 'num', 'id')):
            m = _regex.match(s, i, end)
            if not m:
                raise ValueError('bad regex at %d' % i)
            settle(m.end(), False)
            toks.append((i, 'str')); prev = 'str'
            i = m.end()
            continue
        if c in '([{':
            stack.append(c); toks.append((i, c)); prev = c; i += 1
            continue
        if c in ')]}':
            if not stack or _CLOSE.get(stack[-1]) != c:
                raise ValueError('unbalanced %s at %d (open: %s)' % (c, i, stack[-1:] or 'none'))
            stack.pop(); toks.append((i, c)); prev = c; i += 1
            continue
        m = _ident.match(s, i, end)
        if m:
            w = m.group()
            toks.append((i, w)); prev = w if w in KW_BEFORE_REGEX else 'id'
            i = m.end()
            continue
        m = _num.match(s, i, end)
        if m and m.end() > i:
            toks.append((i, 'num')); prev = 'num'; i = m.end()
            continue
        toks.append((i, c)); prev = c
        i += 1
    settle(end + 1, True)
    if stack:
        raise ValueError('unclosed %r at the end' % stack)
    offs = [t[0] for t in toks]
    for p, L in lines.items():
        k = bisect.bisect_left(offs, p)
        L.prev = toks[k - 1][1] if k > 0 else None
        L.nxt = toks[k][1] if k < len(toks) else None
    return lines


# a line starting with one of these continues the statement before it
CONT = {'else', 'catch', 'finally', 'while', '.', ',', '?', ':', ')', ']', '}', '+', '-', '*', '/', '%', '&', '|',
        '^', '=', '<', '>', '!', '(', '[', 'in', 'of', 'instanceof', 'str'}


def boundary(L, depth):
    """True if this line start lies between two whole statements at this bracket depth."""
    return (L is not None and L.plain and L.depth == depth and L.prev in (';', '}', '{', None)
            and L.nxt not in CONT)


def scan_css(s, start=0, end=None):
    """CSS: per line start the brace depth and whether it lies outside comments and strings."""
    end = len(s) if end is None else end
    lines = {}
    depth, plain, i = 0, True, start
    lines[start] = Line(0, True)
    while i < end:
        c = s[i]
        if not plain:
            if s.startswith('*/', i):
                plain = True; i += 2
                continue
        elif s.startswith('/*', i):
            plain = False; i += 2
            continue
        elif c in '\'"':
            m = _str[c].match(s, i, end)
            if not m:
                raise ValueError('css: unterminated string at %d' % i)
            i = m.end()
            continue
        elif c == '{':
            depth += 1
        elif c == '}':
            depth -= 1
            if depth < 0:
                raise ValueError('css: unbalanced } at %d' % i)
        i += 1
        if c == '\n' and i < end:
            lines[i] = Line(depth, plain)
    if depth or not plain:
        raise ValueError('css: not closed at the end')
    return lines
