# Audio-Thread-Müll messen (28.10.2026)

Die Worklet-Prozessoren laufen hier in Node (V8 wie Chrome) mit einer Attrappe des AudioWorklet-Scopes.

    python3 extract.py ../../../myzel/index.html dsp.js     # das Modul aus dem Build
    WARM=20000 DSP=./dsp.js node bench.js [myzel-atr …]     # kB Müll je Stimme und Sekunde im Dauerzustand (Sampling-Heap-Profiler)
    DSP=./dsp.js node hash.js > a.json                      # Ausgabe-Hash aller Prozessoren – vorher/nachher vergleichen: bitgenau?
    python3 where.py myzel-syrinx dsp.js                    # wo im optimierten Code Zahlen verpackt werden / Aufrufe nicht eingebaut sind
    DSP=./dsp.js node ctor.js                               # was ein Prozessor je Note anlegt

Im echten Chromium: `hexenring/x-wkgc.js` (V8 `--trace-gc`, je Isolate; die mit `:1` nach dem Start ist der Audio-Thread),
auswerten mit `gcparse.py`. Ohne `WARM` misst bench.js auch den Aufwärm-Müll (Interpreter) – der vergeht.

Lehren (V8; SpiderMonkey/Firefox und JSC/Safari verpacken Kommazahlen nicht – dort entsteht dieser Müll nicht):
- Ein Methodenaufruf in einer großen `render`, den V8 nicht einbaut (Budget), verpackt jede übergebene und zurückgegebene
  Kommazahl als Objekt – Werte über Felder geben (Attraktor `rk`, Sitar `step`, Glut `lagH`).
- Ein Feld, das erst `render` anlegt (nicht der Konstruktor), wird in der Schleife je Sample verpackt (Kehlchen `dA`).
- Keine Arrays/Closures je Block (`.map`, Pfeilfunktion, `subarray`) – Schimmer, Stufentreppe, Glut.
