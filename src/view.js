const vscode = require('vscode');
const { randomBytes } = require('node:crypto');

function createView(context, session, column, onActive, onClose) {
  const root = (...parts) => vscode.Uri.joinPath(context.extensionUri, ...parts);
  const panel = vscode.window.createWebviewPanel('ptyrig.session', session.title,
    { viewColumn: column, preserveFocus: false }, {
      enableScripts: true,
      localResourceRoots: [root('web'), root('node_modules', '@xterm', 'xterm', 'lib'), root('node_modules', '@xterm', 'xterm', 'css'), root('node_modules', '@xterm', 'addon-fit', 'lib')]
    });
  panel.iconPath = { light: root('icons', 'ptyrig-light.svg'), dark: root('icons', 'ptyrig-dark.svg') };
  panel.ptyrigFrames = 0;
  let hiding = false;
  let disposed = false;
  let ready = false;
  let inFlight;
  let sequence = 0;
  let buffer = '';
  let resync = true;
  let timer;
  function send() {
    clearTimeout(timer); timer = undefined;
    if (disposed || !ready || inFlight !== undefined || session.closed || (!resync && !buffer)) return;
    const reset = resync;
    const data = reset ? session.snapshot() : buffer;
    const state = reset ? session.snapshotState?.() : undefined;
    const id = ++sequence;
    buffer = ''; resync = false; inFlight = id;
    void panel.webview.postMessage({ type: 'output', id, reset, data, state }).then(delivered => {
      if (disposed || inFlight !== id || delivered) return;
      ready = false; inFlight = undefined; resync = true;
    }, () => {
      if (!disposed && inFlight === id) { ready = false; inFlight = undefined; resync = true; }
    });
  }
  function onData(data) {
    if (!resync) {
      if (buffer.length + data.length > 256 * 1024) { buffer = ''; resync = true; }
      else buffer += data;
    }
    if (!timer && ready && inFlight === undefined) timer = setTimeout(send, 16);
  }
  const onTitle = title => { if (!disposed) panel.title = title; };
  session.on('title', onTitle);
  session.on('data', onData);
  const listeners = [
    panel.webview.onDidReceiveMessage(message => {
      if (disposed || session.closed || !message || typeof message !== 'object') return;
      switch (message.type) {
        case 'ready':
          panel.ptyrigFrames = 0; panel.ptyrigReady = true; ready = true; inFlight = undefined; resync = true; send(); break;
        case 'ack':
          if (inFlight !== undefined && message.id === inFlight) { panel.ptyrigFrames++; inFlight = undefined; send(); }
          break;
        case 'input': session.write(message.data, message.binary === true); break;
        case 'resize': session.resize(message.cols, message.rows); break;
      }
    }),
    panel.onDidChangeViewState(event => {
      if (!event.webviewPanel.visible) { ready = false; panel.ptyrigReady = false; resync = true; }
      if (event.webviewPanel.active) onActive();
    })
  ];
  panel.onDidDispose(() => {
    disposed = true;
    clearTimeout(timer);
    buffer = '';
    session.off('data', onData);
    session.off('title', onTitle);
    for (const listener of listeners) listener.dispose();
    onClose(hiding);
  });
  panel.hideSession = () => { hiding = true; panel.dispose(); };
  const nonce = randomBytes(24).toString('hex');
  const asset = (...parts) => panel.webview.asWebviewUri(root(...parts));
  panel.webview.html = `<!doctype html><html><head><meta charset="utf-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; base-uri 'none'; form-action 'none'; style-src ${panel.webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <link rel="stylesheet" href="${asset('node_modules', '@xterm', 'xterm', 'css', 'xterm.css')}">
    <style>html,body,#terminal{height:100%;width:100%;margin:0;overflow:hidden}body{background:var(--vscode-terminal-background,var(--vscode-editor-background))}#terminal{box-sizing:border-box;padding:8px}</style></head>
    <body><div id="terminal" role="region" aria-label="Terminal application"></div>
    <script nonce="${nonce}" src="${asset('node_modules', '@xterm', 'xterm', 'lib', 'xterm.js')}"></script>
    <script nonce="${nonce}" src="${asset('node_modules', '@xterm', 'addon-fit', 'lib', 'addon-fit.js')}"></script>
    <script nonce="${nonce}" src="${asset('web', 'protocol.js')}"></script>
    <script nonce="${nonce}" src="${asset('web', 'state.js')}"></script>
    <script nonce="${nonce}" src="${asset('web', 'terminal.js')}"></script></body></html>`;
  return panel;
}
module.exports = { createView };
