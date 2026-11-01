// Optional local comparison with the separately maintained Trails extension.
const vscode = require('vscode');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(fn) { for (let i=0;i<200;i++) { if(fn()) return; await wait(50); } throw new Error('Timed out'); }
exports.run = async () => {
  try {
    const root = path.dirname(process.env.PTYRIG_TEST_RESULT);
    const quote = value => "'" + value.replaceAll("'", "'\\''") + "'";
    const native = vscode.extensions.all.find(e => e.packageJSON.name === 'trails-vscode');
    const custom = vscode.extensions.all.find(e => e.packageJSON.name === 'ptyrig');
    assert.ok(native); assert.ok(custom);
    await native.activate(); const api = await custom.activate();
    const probe = path.join(root, 'probe.sh');
    fs.writeFileSync(probe, `#!/bin/sh\nprintf '%s\\n' "TERM_PROGRAM=$TERM_PROGRAM" "TERM_PROGRAM_VERSION=$TERM_PROGRAM_VERSION" "TERM=$TERM" "COLORTERM=$COLORTERM" "TMUX=$TMUX" "TMUX_PANE=$TMUX_PANE" "PWD=$PWD"\nif test -t 0 && test -t 2; then echo PTY=yes; else echo PTY=no; fi\n`);
    for (const [section, command] of [['trails','trails.new'], ['ptyrig','ptyrig.new']]) {
      await vscode.workspace.getConfiguration(section).update('command', `/bin/sh ${quote(probe)} > ${quote(path.join(root,section+'.txt'))}; sleep 120`, vscode.ConfigurationTarget.Workspace);
      await vscode.commands.executeCommand(command);
      await until(()=>fs.existsSync(path.join(root,section+'.txt')) && fs.readFileSync(path.join(root,section+'.txt'),'utf8').includes('PTY='));
    }
    const read = name => Object.fromEntries(fs.readFileSync(path.join(root,name+'.txt'),'utf8').trim().split('\n').map(line => {const i=line.indexOf('=');return [line.slice(0,i),line.slice(i+1)];}));
    const a=read('trails'), b=read('ptyrig');
    for (const key of ['TERM_PROGRAM','TERM_PROGRAM_VERSION','TERM','COLORTERM','TMUX','TMUX_PANE','PWD','PTY']) assert.equal(b[key],a[key],key);
    assert.equal(b.TERM_PROGRAM,'vscode'); assert.equal(b.PTY,'yes');
    // Dispose only the native terminals created in this isolated profile.
    for (const terminal of vscode.window.terminals) terminal.dispose();
    const tabs=vscode.window.tabGroups.all.flatMap(g=>g.tabs).filter(t=>t.input instanceof vscode.TabInputWebview);
    await vscode.window.tabGroups.close(tabs);
    await until(()=>api.getSessions().length===0);
    fs.writeFileSync(process.env.PTYRIG_TEST_RESULT,'PASS: Trails extension vs PTYrig actual child environment matches: '+JSON.stringify(b));
  } catch(error) { fs.writeFileSync(process.env.PTYRIG_TEST_RESULT,'FAIL: '+error.stack); throw error; }
};
