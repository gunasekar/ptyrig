// Downloads an official VS Code build and runs tests in a disposable profile.
const { runTests, runVSCodeCommand } = require('@vscode/test-electron');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

async function main() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ptyrig-ci-'));
  const workspace = path.join(root, 'workspace');
  const userData = path.join(root, 'userdata');
  const result = path.join(root, 'result.txt');
  fs.mkdirSync(workspace);
  fs.mkdirSync(path.join(userData,'User'),{recursive:true});
  fs.writeFileSync(path.join(userData,'User','settings.json'),JSON.stringify({
    'security.workspace.trust.enabled':false,
    'workbench.startupEditor':'none',
    'terminal.integrated.confirmOnExit':'never',
    'terminal.integrated.confirmOnKill':'never'
  }));
  const version = process.env.PTYRIG_VSCODE_VERSION || 'stable';
  let extensionPath = path.resolve(process.env.PTYRIG_EXTENSION_PATH || path.join(__dirname,'..'));
  if (process.env.PTYRIG_VSIX) {
    const extensions = path.join(root,'extensions');
    const output = await runVSCodeCommand(['--user-data-dir',userData,'--extensions-dir',extensions,'--install-extension',path.resolve(process.env.PTYRIG_VSIX),'--force'],{version});
    console.log(output.stdout);
    extensionPath = fs.readdirSync(extensions).map(name=>path.join(extensions,name)).find(folder=>{
      const manifest = path.join(folder,'package.json');
      return fs.existsSync(manifest) && JSON.parse(fs.readFileSync(manifest,'utf8')).name === 'ptyrig';
    });
    if (!extensionPath) throw new Error('VSIX installation did not produce a PTYrig extension.');
  }
  await runTests({
    version,
    extensionDevelopmentPath: extensionPath,
    extensionTestsPath: path.resolve(__dirname,'../test/integration.js'),
    extensionTestsEnv: {PTYRIG_TEST_RESULT:result},
    launchArgs: [workspace,'--user-data-dir',userData,'--extensions-dir',path.join(root,'extensions'),'--disable-extensions','--disable-workspace-trust','--skip-welcome','--skip-release-notes','--disable-gpu','--no-sandbox']
  });
  const report=fs.readFileSync(result,'utf8');
  if (!report.startsWith('PASS:')) throw new Error(report);
  console.log(report);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
