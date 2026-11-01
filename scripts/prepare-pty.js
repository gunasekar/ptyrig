// node-pty's npm prebuilds can arrive without their executable permission.
const fs = require('node:fs');
const path = require('node:path');
const root = path.dirname(require.resolve('node-pty/package.json'));
for (const platform of ['darwin-arm64', 'darwin-x64', 'linux-arm64', 'linux-x64']) {
  const helper = path.join(root, 'prebuilds', platform, 'spawn-helper');
  if (fs.existsSync(helper)) fs.chmodSync(helper, 0o755);
}
