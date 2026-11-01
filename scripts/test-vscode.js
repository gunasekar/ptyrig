// Uses an existing VS Code installation and never touches your normal settings.
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

async function main() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ptyrig-vscode-test-'));
  const workspace = path.join(root, 'workspace');
  const userData = path.join(root, 'userdata');
  const result = path.join(root, 'result.txt');
  fs.mkdirSync(workspace);
  fs.mkdirSync(path.join(userData, 'User'), { recursive: true });
  fs.writeFileSync(path.join(userData, 'User', 'settings.json'), JSON.stringify({
    'security.workspace.trust.enabled': false,
    'workbench.startupEditor': 'none',
    'terminal.integrated.confirmOnExit': 'never',
    'terminal.integrated.confirmOnKill': 'never'
  }));
  const child = spawn(process.env.VSCODE_CLI || 'code', [
    '--new-window', '--user-data-dir', userData,
    '--extensions-dir', path.join(root, 'extensions'), '--disable-extensions',
    '--disable-workspace-trust', '--skip-welcome', '--skip-release-notes',
    `--extensionDevelopmentPath=${process.env.PTYRIG_EXTENSION_PATH || path.resolve(__dirname, '..')}`,
    ...(process.env.PTYRIG_TRAILS_EXTENSION ? [`--extensionDevelopmentPath=${path.resolve(process.env.PTYRIG_TRAILS_EXTENSION)}`] : []),
    `--extensionTestsPath=${process.env.PTYRIG_TEST_PATH || path.resolve(__dirname, '../test/integration.js')}`, workspace
  ], { env: { ...process.env, PTYRIG_TEST_RESULT: result }, stdio: 'inherit' });
  let launchError;
  child.on('error', error => { launchError = error; });
  const deadline = Date.now() + 90000;
  while (!fs.existsSync(result)) {
    if (launchError) throw launchError;
    if (Date.now() > deadline) throw new Error(`VS Code tests timed out; logs: ${root}`);
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  const report = fs.readFileSync(result, 'utf8');
  console.log(report);
  if (!report.startsWith('PASS:')) throw new Error(`VS Code tests failed; logs: ${root}`);
}

main().catch(error => { console.error(error); process.exitCode = 1; });
