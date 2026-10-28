# the worklet module (myzelDsp) out of a built index.html as a Node module: python3 extract.py <index.html> <out.js>
import sys
s = open(sys.argv[1]).read(); j = s.index("function myzelDsp() {"); p = j + len("function myzelDsp() "); d = 0
while True:
    c = s[p]
    if c == '{': d += 1
    elif c == '}':
        d -= 1
        if d == 0: break
    p += 1
open(sys.argv[2], 'w').write('module.exports = function () {\n(' + s[j:p + 1] + ')();\n};\n')
