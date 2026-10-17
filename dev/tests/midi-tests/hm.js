// Helpers for the mapping suites (part 3): the fake Web MIDI of h.js on the 'mm' slot.
// Build it with: sh ../v2/mk.sh /home/user/4claude/myzel mm
process.env.BASE = process.env.BASE || 'http://127.0.0.1:8790/mm-inst/index.html';
module.exports = require('./h');
