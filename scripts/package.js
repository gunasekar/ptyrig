// Local packages target the build host; never label a native binary as universal.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const os = require('node:os');
const root = path.resolve(__dirname, '..');
const manifest = require('../package.json');
const target = `${process.platform}-${process.arch}`;
const output = `${manifest.name}-${manifest.version}-${target}.vsix`;
const cli = path.join(path.dirname(require.resolve('@vscode/vsce/package.json')), 'vsce');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ptyrig-package-'));
const ignoreFile = path.join(temp, 'ignore');
let ignore = fs.readFileSync(path.join(root, '.vscodeignore'), 'utf8');
const prebuilds = path.join(root, 'node_modules', 'node-pty', 'prebuilds');
if (fs.existsSync(prebuilds)) {
  for (const folder of fs.readdirSync(prebuilds)) {
    if (folder !== target) ignore += `\nnode_modules/node-pty/prebuilds/${folder}/**`;
  }
}
if (process.platform !== 'win32') ignore += '\nnode_modules/node-pty/third_party/**';
fs.writeFileSync(ignoreFile, ignore + '\n');
try {
  const result = spawnSync(process.execPath, [cli, 'package', '--target', target, '--ignoreFile', ignoreFile, '--out', output], { cwd:root, stdio:'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Packaging failed (${result.status})`);
} finally { fs.rmSync(temp, {recursive:true,force:true}); }
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error('Run packaging through npm run package.');
const inventory = spawnSync(process.execPath, [npmCli, 'sbom', '--omit=dev', '--sbom-format=cyclonedx'], {cwd:root,encoding:'utf8',maxBuffer:8*1024*1024});
if (inventory.error || inventory.status !== 0) throw inventory.error || new Error(inventory.stderr);
fs.writeFileSync(path.join(root,output.replace(/\.vsix$/,'.sbom.json')),inventory.stdout);
const sha = createHash('sha256').update(fs.readFileSync(path.join(root,output))).digest('hex');
fs.writeFileSync(path.join(root,`${output}.sha256`),`${sha}  ${output}\n`);
console.log(`Local build target: ${target}; checksum: ${output}.sha256`);
