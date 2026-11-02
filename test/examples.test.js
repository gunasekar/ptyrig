const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const examples = [...fs.readFileSync(path.join(__dirname, '../README.md'), 'utf8').matchAll(/```json\n([\s\S]*?)```/g)].map(match => JSON.parse(match[1]));

test('README picker launches the selected CLI and reports the command for tab titles', t => {
  const picker = examples.find(example => example['ptyrig.name'] === 'Agents');
  assert.equal(picker['ptyrig.sessionTitle'], 'Agent ($CMD)');
  const bin = fs.mkdtempSync(path.join(os.tmpdir(), 'ptyrig-example-'));
  t.after(() => fs.rmSync(bin, { recursive: true, force: true }));
  fs.writeFileSync(path.join(bin, 'fzf'), '#!/bin/sh\ncat >/dev/null\n[ -n "$PTYRIG_PICK" ] || exit 130\nprintf "%s\\n" "$PTYRIG_PICK"\n', { mode: 0o755 });
  for (const command of ['claude', 'codex', 'opencode', 'cursor-agent']) {
    fs.writeFileSync(path.join(bin, command), `#!/bin/sh\nprintf 'LAUNCHED:${command}\\n'\n`, { mode: 0o755 });
  }
  const run = choice => spawnSync('/bin/sh', ['-c', picker['ptyrig.command']], {
    env: { ...process.env, PATH: bin + path.delimiter + process.env.PATH, PTYRIG_PICK: choice },
    encoding: 'utf8'
  });
  for (const [choice, command] of Object.entries({ Claude: 'claude', Codex: 'codex', OpenCode: 'opencode', Cursor: 'cursor-agent' })) {
    const result = run(choice);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, `\x1b]777;ptyrig-command;${command}\x07LAUNCHED:${command}\n`);
  }
  const canceled = run('');
  assert.equal(canceled.status, 130);
  assert.equal(canceled.stdout, '');
  const unknown = run('Unknown');
  assert.equal(unknown.status, 0);
  assert.equal(unknown.stdout, '');
});
