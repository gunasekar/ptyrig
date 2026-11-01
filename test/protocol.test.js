const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Terminal } = require('@xterm/headless');
const { suppressQueries } = require('../web/protocol');

test('renderer suppresses duplicate query responses while retaining screen updates', async () => {
  const terminal = new Terminal({allowProposedApi:true});
  let responses = '';
  terminal.onData(data => { responses += data; });
  const handlers = suppressQueries(terminal);
  try {
    await new Promise(resolve => terminal.write('HELLO\x1b[6n\x1b[c\x1b[>c\x1b[?6n\x1b[?1000$p\x1bP$qm\x1b\\',resolve));
    assert.equal(responses,'');
    assert.match(terminal.buffer.active.getLine(0).translateToString(), /HELLO/);
    handlers.dispose();
    await new Promise(resolve => terminal.write('\x1b[6n',resolve));
    assert.match(responses,/\x1b\[1;6R/);
  } finally { terminal.dispose(); }
});
