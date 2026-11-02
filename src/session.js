const { EventEmitter } = require('node:events');
const { Terminal } = require('@xterm/headless');
const { SerializeAddon } = require('@xterm/addon-serialize');
const pty = require('node-pty');
const { capture } = require('../web/state');
const { sessionTitle } = require('./titles');

function launch(command, env = process.env, platform = process.platform) {
  const shell = platform === 'win32' ? env.ComSpec || 'cmd.exe' : env.SHELL || '/bin/sh';
  const args = /(?:^|[\\/])(?:pwsh|powershell)(?:\.exe)?$/i.test(shell)
    ? ['-NoLogo', '-NoProfile', '-Command', command]
    : platform === 'win32' ? ['/d', '/c', command] : ['-lc', command];
  return { shell, args };
}

function terminalEnvironment(parent = process.env, vscodeVersion) {
  // Informational identification for optional integrations; OSC titles need no marker.
  const env = { ...parent, TERM: 'xterm-256color', COLORTERM: 'truecolor', TERM_PROGRAM: 'vscode', PTYRIG_SESSION: '1' };
  // The extension host may inherit the terminal that launched VS Code. This
  // process has its own PTY, so it is not inside that tmux pane or editor.
  for (const key of ['TMUX', 'TMUX_PANE', 'NVIM', 'ZED_TERM', 'ITERM_SESSION_ID', 'TERM_SESSION_ID']) delete env[key];
  if (vscodeVersion) env.TERM_PROGRAM_VERSION = vscodeVersion;
  else delete env.TERM_PROGRAM_VERSION;
  return env;
}

class Session extends EventEmitter {
  constructor(id, name, command, cwd, vscodeVersion, numbered = true, displayName = 'PTYrig') {
    super();
    this.id = id;
    this.nameTemplate = name;
    this.numbered = numbered;
    this.title = sessionTitle(id, name, '', numbered, displayName);
    this.closed = false;
    this.closing = false;
    this.screen = new Terminal({ cols: 100, rows: 30, scrollback: 2000, allowProposedApi: true });
    // xterm handles OSC 0/2 and BEL/ST terminators even without a visible renderer.
    this.screen.onTitleChange(value => {
      if (this.closed || !this.nameTemplate.includes('$TITLE')) return;
      const title = sessionTitle(this.id, this.nameTemplate, value, this.numbered, displayName);
      if (title !== this.title) { this.title = title; this.emit('title', title); }
    });
    // The serialize addon restores tracking mode but omits mouse encoding.
    // Preserve SGR/pixel encoding explicitly so restored views send the protocol
    // requested by the application, rather than legacy mouse bytes.
    this.mouseEncoding = 0;
    for (const [final, enabled] of [['h', true], ['l', false]]) {
      this.screen.parser.registerCsiHandler({ prefix: '?', final }, params => {
        for (const mode of params) {
          if (mode === 1006 || mode === 1016) this.mouseEncoding = enabled ? mode : 0;
        }
        return false;
      });
    }
    this.screen.parser.registerEscHandler({ final: 'c' }, () => { this.mouseEncoding = 0; return false; });
    this.serializer = new SerializeAddon();
    this.screen.loadAddon(this.serializer);
    const { shell, args } = launch(command);
    try { this.process = pty.spawn(shell, args, { cwd, env: terminalEnvironment(process.env, vscodeVersion), name: 'xterm-256color', cols: 100, rows: 30 }); } catch (error) { this.screen.dispose(); throw error; }
    // Reply even when no renderer is attached. Renderers suppress these replies.
    this.screen.onData(data => this.write(data));
    let queued = 0;
    this.dataListener = this.process.onData(data => {
      queued += data.length;
      if (queued > 1024 * 1024) this.process.pause();
      this.screen.write(data, () => {
        queued -= data.length;
        if (this.closed) return;
        if (queued < 256 * 1024) this.process.resume();
        this.emit('data', data);
      });
    });
    this.exitListener = this.process.onExit(event => this.finish(event));
  }
  resize(cols, rows) {
    if (this.closed || this.closing || !Number.isInteger(cols) || !Number.isInteger(rows) || cols < 2 || rows < 1 || cols > 1000 || rows > 500) return;
    this.screen.resize(cols, rows);
    this.process.resize(cols, rows);
  }
  write(data, binary = false) { if (!this.closed && !this.closing && typeof data === 'string' && data.length <= 1024 * 1024) this.process.write(binary ? Buffer.from(data, 'latin1') : data); }
  snapshotState() { return capture(this.screen); }
  snapshot() { return this.serializer.serialize() + (this.mouseEncoding ? `\x1b[?${this.mouseEncoding}h` : ''); }
  finish(event) {
    if (this.closed) return;
    this.closed = true;
    this.dataListener?.dispose();
    this.exitListener?.dispose();
    this.screen.dispose();
    this.emit('exit', event);
  }
  close(force = false) {
    if (this.closed) return;
    if (this.closing && !force) return;
    this.closing = true;
    if (force) clearTimeout(this.killTimer);
    // ConPTY already owns process-tree termination. A second delayed kill can
    // act on a stale process ID; do not add a POSIX escalation timer on Windows.
    if (process.platform === 'win32') { this.process.kill(); return; }
    const signalGroup = signal => {
      try { process.kill(-this.process.pid, signal); }
      catch (error) { if (error.code !== 'ESRCH') this.process.kill(signal); }
    };
    signalGroup(force ? 'SIGKILL' : 'SIGHUP');
    if (!force) {
      // Kill remaining members of this PTY's process group, including children
      // whose parent has already exited. Never target another session's group.
      this.killTimer = setTimeout(() => signalGroup('SIGKILL'), 750);
      this.killTimer.unref?.();
    }
  }
}
module.exports = { Session, launch, terminalEnvironment };
