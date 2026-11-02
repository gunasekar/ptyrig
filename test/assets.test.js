const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { inflateSync } = require('node:zlib');

test('status bar font uses the same coordinate scale as the logo', () => {
  const root = path.join(__dirname, '..');
  const manifest = require('../package.json');
  const icon = manifest.contributes.icons['ptyrig-logo'];
  const font = fs.readFileSync(path.join(root, icon.default.fontPath));
  assert.equal(font.toString('ascii', 0, 4), 'wOFF');
  let head;
  for (let i = 0; i < font.readUInt16BE(12); i++) {
    const entry = 44 + i * 20;
    if (font.toString('ascii', entry, entry + 4) !== 'head') continue;
    const offset = font.readUInt32BE(entry + 4);
    const length = font.readUInt32BE(entry + 8);
    const originalLength = font.readUInt32BE(entry + 12);
    const data = font.subarray(offset, offset + length);
    head = length < originalLength ? inflateSync(data) : data;
  }
  assert.ok(head, 'Icon font must contain a head table');
  const svg = fs.readFileSync(path.join(root, 'icons/ptyrig.svg'), 'utf8');
  const [, width, height] = svg.match(/viewBox="0 0 (\d+) (\d+)"/);
  assert.equal(width, height);
  assert.equal(head.readUInt16BE(18), Number(width), 'Incorrect font scale makes the launcher logo too small');
});
