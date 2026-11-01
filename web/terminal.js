/* global Terminal, FitAddon, PtyrigProtocol, PtyrigState, acquireVsCodeApi */
const api = acquireVsCodeApi();
const style = () => getComputedStyle(document.documentElement);
const color = (key, fallback) => style().getPropertyValue(`--vscode-${key}`).trim() || fallback;
const theme = () => ({
  background: color('terminal-background', color('editor-background', '#1e1e1e')),
  foreground: color('terminal-foreground', color('editor-foreground', '#cccccc')),
  cursor: color('terminalCursor-foreground', color('editor-foreground', '#cccccc')),
  ...Object.fromEntries(['black','red','green','yellow','blue','magenta','cyan','white','brightBlack','brightRed','brightGreen','brightYellow','brightBlue','brightMagenta','brightCyan','brightWhite'].map(name => [name, color(`terminal-ansi${name[0].toUpperCase()}${name.slice(1)}`, undefined)]).filter(([,v]) => v))
});
const terminal = new Terminal({ cursorBlink: true, scrollback: 2000, fontFamily: color('editor-font-family', 'monospace'), fontSize: 14, theme: theme(), allowProposedApi: true });
PtyrigProtocol.suppressQueries(terminal);
const fit = new FitAddon.FitAddon();
terminal.loadAddon(fit);
terminal.open(document.getElementById('terminal'));
terminal.onData(data => api.postMessage({ type: 'input', data }));
terminal.onBinary(data => api.postMessage({ type: 'input', data, binary: true }));
terminal.onResize(({ cols, rows }) => api.postMessage({ type: 'resize', cols, rows }));
terminal.attachCustomKeyEventHandler(event => {
  if (event.ctrlKey && !event.altKey && !event.metaKey && event.code === 'Backslash') {
    // VS Code owns these keybindings. Suppress terminal input only; posting
    // another command here would execute the same keypress twice.
    return false;
  }
  return true;
});
window.addEventListener('message', ({ data: message }) => {
  if (!message || message.type !== 'output' || typeof message.data !== 'string') return;
  if (message.reset) terminal.reset();
  terminal.write(message.data, () => {
    if (message.reset) PtyrigState.restore(terminal, message.state);
    api.postMessage({ type: 'ack', id: message.id });
  });
});
new ResizeObserver(() => { if (document.body.clientWidth && document.body.clientHeight) fit.fit(); }).observe(document.body);
new MutationObserver(() => { terminal.options.theme = theme(); }).observe(document.body, { attributes: true, attributeFilter: ['class', 'data-vscode-theme-id'] });
fit.fit();
api.postMessage({ type: 'ready' });
terminal.focus();
