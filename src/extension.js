const vscode = require('vscode');
const { createView } = require('./view');
const { Session } = require('./session');

function activate(context) {
  const sessions = new Map();
  const views = new Map();
  let nextId = 1;
  let current;
  let hiddenOrder = [];
  let pending = Promise.resolve();
  let stopping = false;

  const liveSessions = () => [...sessions.values()].filter(session => !session.closed && !session.closing);

  function revealViews() {
    const selected = views.get(current);
    for (const panel of views.values()) if (panel !== selected) panel.reveal();
    selected?.reveal();
  }

  async function present(session, column) {
    if (views.has(session.id)) { views.get(session.id).reveal(column); return; }
    if (session.closed || session.closing) return;
    const panel = createView(context, session, column, () => { current = session.id; }, hiding => {
      views.delete(session.id);
      if (!hiding && !stopping) session.close();
    });
    views.set(session.id, panel);
    for (let i = 0; i < 100 && !session.closed; i++) {
      if (panel.viewColumn !== undefined) break;
      await new Promise(resolve => setTimeout(resolve, 20));
    }
  }

  async function showAll() {
    const live = liveSessions();
    if (!live.length) return newSession();
    const selected = live.find(session => session.id === current) || live.at(-1);
    const order = new Map(hiddenOrder.map((id, index) => [id, index]));
    const ordered = live.slice().sort((a, b) => (order.get(a.id) ?? Infinity) - (order.get(b.id) ?? Infinity));
    for (const session of ordered) {
      // Resolve the surviving anchor every time: a process can exit while a
      // previous view is opening, removing its entire editor group.
      await present(session, [...views.values()][0]?.viewColumn ?? vscode.ViewColumn.Beside);
    }
    views.get(selected.id)?.reveal();
  }
  async function newSession() {
    const uri = vscode.window.activeTextEditor?.document.uri;
    const folder = (uri && vscode.workspace.getWorkspaceFolder(uri)) || vscode.workspace.workspaceFolders?.[0];
    const config = vscode.workspace.getConfiguration('ptyrig', folder?.uri);
    const multipleSessions = config.get('multipleSessions', true);
    if (!multipleSessions && liveSessions().length) {
      // Reuse running processes, even when hidden or the command has changed.
      // Switching this setting never terminates existing sessions.
      if (views.size) revealViews();
      else await showAll();
      return;
    }
    if (!vscode.workspace.isTrusted) {
      vscode.window.showErrorMessage('Trust this workspace before running terminal applications.');
      return;
    }
    const command = config.get('command', '').trim();
    if (!command) {
      await vscode.window.showInformationMessage('Set PTYrig: Command to the terminal application you want to run.', 'Open Settings').then(choice => {
        if (choice) return vscode.commands.executeCommand('workbench.action.openSettings', 'ptyrig.command');
      });
      return;
    }
    const name = (config.get('name', 'PTYrig').replace(/[\x00-\x1f\x7f]/g, '').trim() || 'PTYrig').slice(0, 120);
    const session = new Session(nextId++, name, command, folder?.uri.fsPath || require('node:os').homedir(), vscode.version, multipleSessions);
    sessions.set(session.id, session);
    current = session.id;
    session.once('exit', () => {
      sessions.delete(session.id);
      views.get(session.id)?.dispose();
      if (current === session.id) current = [...sessions.keys()].at(-1);
    });
    try {
      if (!views.size && liveSessions().length > 1) await showAll();
      else await present(session, [...views.values()][0]?.viewColumn ?? vscode.ViewColumn.Beside);
    } catch (error) {
      session.close(true);
      throw error;
    }
  }
  function run(action) {
    pending = pending.then(action).catch(error => {
      void vscode.window.showErrorMessage(`PTYrig: ${error.message}`);
    });
    return pending;
  }
  context.subscriptions.push(
    vscode.commands.registerCommand('ptyrig.new', () => run(newSession)),
    vscode.commands.registerCommand('ptyrig.toggle', () => run(async () => {
      if ([...views.values()].some(panel => panel.visible)) {
        const selectedId = current;
        // Capture visual order before disposing views; activation events during
        // disposal must not determine where the tabs are recreated.
        const remaining = new Map(views);
        hiddenOrder = [];
        for (const group of vscode.window.tabGroups.all) {
          for (const tab of group.tabs) {
            if (!(tab.input instanceof vscode.TabInputWebview) || !tab.input.viewType.includes('ptyrig.session')) continue;
            const entry = [...remaining].find(([, panel]) => panel.viewColumn === group.viewColumn && panel.title === tab.label);
            if (entry) { hiddenOrder.push(entry[0]); remaining.delete(entry[0]); }
          }
        }
        hiddenOrder.push(...remaining.keys());
        const groups = [...new Set([...views.values()].map(panel => vscode.window.tabGroups.all.find(g => g.viewColumn === panel.viewColumn)))].filter(Boolean);
        for (const panel of [...views.values()]) panel.hideSession();
        for (let i = 0; i < 100 && groups.some(group => group.tabs.some(tab => tab.input instanceof vscode.TabInputWebview && tab.input.viewType.includes('ptyrig.session'))); i++) {
          await new Promise(resolve => setTimeout(resolve, 20));
        }
        for (const group of groups) {
          if (!group.tabs.length && vscode.window.tabGroups.all.length > 1) await vscode.window.tabGroups.close(group, true);
        }
        if (sessions.has(selectedId)) current = selectedId;
      } else if (views.size) revealViews();
      else await showAll();
    })),
    { dispose() { stopping = true; for (const session of [...sessions.values()]) session.close(true); for (const panel of [...views.values()]) panel.dispose(); } }
  );
  return { getSessions: () => [...sessions.values()].map(session => ({ id: session.id, title: session.title, pid: session.process.pid, visible: views.get(session.id)?.visible || false, rendererReady: views.get(session.id)?.ptyrigReady || false, renderedFrames: views.get(session.id)?.ptyrigFrames || 0 })) };
}
module.exports = { activate };
