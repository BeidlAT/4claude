# Myzel – notes for Claude

- The app's source is `myzel/src/` (modules: `html/`, `css/`, `js/…`, German UI); the module order is the `@include` lines in `myzel/src/index.html`. `myzel/index.html` is the built output, committed alongside it – never edit it by hand. After editing modules, build with `python3 myzel/build.py myzel/src myzel/index.html` and commit both (`pwa/build.py`, the Pages job and the test builder `mk.sh` refuse a stale `index.html`). Locate code with `grep -rn name myzel/src`.
- Work continues from `dev/HANDOFF.md` – read it first: current state, binding specs in `dev/klang/`, test setup (`sh dev/setup-tests.sh <scratchpad>`), next stages.
- Talk to the owner in German, briefly. Develop on the branch named in the session; no PR unless asked.
- **Owner's standing rule (whole project): always the best sound quality.** Cost ("Einheiten", VCOST) is measured and entered honestly but is never a reason to simplify a sound – no holding back, use every option. Never trade sound for cost on your own; if two goals of a plan conflict, ask the owner first.
