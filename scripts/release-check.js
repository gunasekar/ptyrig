// Fail closed on incomplete public metadata or a mismatched release tag.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const manifest = require('../package.json');
const failures = [];
const { XTERM_VERSION } = require('../web/state');
if (manifest.dependencies['@xterm/xterm'] !== XTERM_VERSION || manifest.dependencies['@xterm/headless'] !== XTERM_VERSION) failures.push('Update and parity-test the pinned xterm state adapter before changing xterm versions.');
if (process.env.GITHUB_REPOSITORY && manifest.repository?.url?.replace(/\.git$/, '') !== `https://github.com/${process.env.GITHUB_REPOSITORY}`) failures.push('Publishing repository does not match the package identity.');
if (!/^[a-z0-9][a-z0-9-]*$/i.test(manifest.publisher || '') || /undefined|example|placeholder/i.test(manifest.publisher || '')) failures.push('Choose and register the Marketplace publisher in package.json.');
const repo = manifest.repository?.url;
if (!/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\.git)?$/.test(repo || '')) failures.push('Set the canonical GitHub repository URL.');
if (!manifest.homepage || !manifest.bugs?.url) failures.push('Set the public homepage and issue tracker URLs.');
if (manifest.preview !== true) failures.push('The public release should be labeled Preview.');
if (manifest.capabilities?.untrustedWorkspaces?.supported !== false) failures.push('Workspace Trust must be required.');
if (!manifest.contributes.configuration.properties['ptyrig.command'].restricted) failures.push('The command setting must remain restricted.');
for (const [name, version] of Object.entries({...manifest.dependencies,...manifest.devDependencies})) {
  if (!/^\d+\.\d+\.\d+$/.test(version)) failures.push(`Pin dependency ${name} to an exact version.`);
}
if (process.env.RELEASE_TAG && process.env.RELEASE_TAG !== `v${manifest.version}`) failures.push('Release tag must match the package version.');
if (!fs.readFileSync(path.join(root, 'SECURITY.md'), 'utf8').includes('https://github.com/')) failures.push('Set the actual private vulnerability reporting URL in SECURITY.md.');
if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
else console.log(`Release metadata ready: ${manifest.publisher}.${manifest.name} ${manifest.version}`);
