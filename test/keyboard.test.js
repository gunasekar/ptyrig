const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('webview does not dispatch a duplicate command for VS Code shortcuts', () => {
  const messages = [];
  let handler;
  class Terminal {
    loadAddon() {} open() {} onData() {} onBinary() {} onResize() {} focus() {}
    attachCustomKeyEventHandler(callback) { handler = callback; }
  }
  const context = {
    Terminal, FitAddon: { FitAddon: class { fit() {} } },
    PtyrigProtocol: { suppressQueries() {} },
    acquireVsCodeApi: () => ({ postMessage: message => messages.push(message) }),
    getComputedStyle: () => ({getPropertyValue: () => ''}),
    document: { documentElement: {}, body: {}, getElementById: () => ({}) },
    window: { addEventListener() {} },
    ResizeObserver: class { observe() {} }, MutationObserver: class { observe() {} }
  };
  vm.runInNewContext(fs.readFileSync(require.resolve('../web/terminal.js'), 'utf8'), context);
  for (const shiftKey of [false, true]) {
    for (const type of ['keydown','keypress','keyup']) {
      assert.equal(handler({ ctrlKey: true, code: 'Backslash', shiftKey, type }), false);
    }
  }
  assert.equal(messages.filter(message => message.type === 'shortcut').length, 0);
  assert.equal(handler({ctrlKey: false, code: 'KeyA', type:'keydown'}),true);
  assert.equal(handler({ctrlKey: true, altKey: true, code:'Backslash', type:'keydown'}),true);
  assert.equal(handler({ctrlKey: true, metaKey: true, code:'Backslash', type:'keydown'}),true);
});
