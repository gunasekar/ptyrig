const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { Session, launch } = require('../src/session');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(fn) { for (let n=0;n<100;n++) { if(fn()) return; await wait(20); } throw new Error('Timed out'); }

test('command mode preserves quoting and exits with the command', () => {
  assert.deepEqual(launch('printf "hello world"', { SHELL: '/bin/zsh' }, 'darwin'), { shell: '/bin/zsh', args: ['-lc', 'printf "hello world"'] });
  assert.deepEqual(launch('exit 7', { ComSpec: 'cmd.exe' }, 'win32').args, ['/d','/c','exit 7']);
});
test('real PTY accepts input, resizes and retains output with no view', async () => {
  const session = new Session(1, 'Example', 'read answer; printf "reply:%s\\n" "$answer"; sleep 120', process.cwd());
  try {
    assert.equal(session.title, '1: Example');
    const pid = session.process.pid;
    session.resize(90, 28);
    session.write('hello\r');
    await until(() => session.snapshot().includes('reply:hello'));
    assert.equal(session.process.pid, pid);
    assert.equal(session.screen.cols, 90);
    assert.equal(session.screen.rows, 28);
    session.resize(-1, 0);
    assert.equal(session.screen.cols, 90);
  } finally { session.close(); }
  await until(() => session.closed);
});
test('successful and failed commands end sessions without a leftover shell', async () => {
  for (const command of ['exit 0', 'exit 7', 'ptyrig_missing_command_123']) {
    const session = new Session(2, 'Test', command, process.cwd());
    const [event] = await once(session, 'exit');
    assert.equal(session.closed, true);
    assert.equal(event.exitCode, command === 'exit 0' ? 0 : command === 'exit 7' ? 7 : 127);
  }
});
test('closing a session is idempotent and does not close its neighbor', async () => {
  const a = new Session(1, 'App', 'sleep 120', process.cwd());
  const b = new Session(2, 'App', 'sleep 120', process.cwd());
  try { a.close(); a.close(); await until(() => a.closed); assert.equal(a.closed,true); assert.equal(b.closed,false); process.kill(b.process.pid,0); }
  finally { a.close(); b.close(); }
});
test('hidden output uses bounded scrollback and snapshot restores alternate screen', async () => {
  const s = new Session(1,'TUI', `printf '\\033[?1049h\\033[2J\\033[HAPP'; sleep 120`, process.cwd());
  try { await until(() => s.snapshot().includes('APP')); assert.match(s.snapshot(), /\x1b\[\?1049h/); assert.equal(s.screen.options.scrollback,2000); }
  finally { s.close(); }
});

test('snapshots preserve mouse encoding so restored clicks use the requested protocol', async () => {
  const s = new Session(1, 'Mouse', 'sleep 120', process.cwd());
  const output = data => new Promise(resolve => s.screen.write(data, resolve));
  try {
    // Include a split control sequence, as real PTY chunks can split anywhere.
    await output('\x1b[?1000h\x1b[?100');
    await output('6h');
    assert.ok(s.snapshot().endsWith('\x1b[?1006h'));
    await output('\x1b[?1016h');
    assert.ok(s.snapshot().endsWith('\x1b[?1016h'));
    await output('\x1b[?1016l');
    assert.equal(s.mouseEncoding, 0);
    await output('\x1b[?1006h\x1bc');
    assert.equal(s.mouseEncoding, 0);
  } finally { s.close(); }
});

test('legacy mouse binary bytes reach the PTY without UTF-8 conversion', () => {
  let received;
  Session.prototype.write.call({ closed: false, process: { write: data => { received = data; } } }, '\x1b[M\xff\x80', true);
  assert.deepEqual(received, Buffer.from([27, 91, 77, 255, 128]));
});

test('PTY environment identifies VS Code and discards inherited terminal identity', () => {
  const { terminalEnvironment } = require('../src/session');
  const parent = { PATH: '/bin', HOME: '/tmp', TERM_PROGRAM: 'iTerm.app', TERM_PROGRAM_VERSION: 'old', TMUX: '/tmp/outer,1,0', TMUX_PANE: '%7', NVIM: 'outer', ZED_TERM: '1', ITERM_SESSION_ID: 'outer', TERM_SESSION_ID: 'outer', SSH_AUTH_SOCK: '/agent', TRAILS_ATTACH: 'workspace' };
  const env = terminalEnvironment(parent, '1.95.0');
  assert.equal(env.TERM_PROGRAM, 'vscode');
  assert.equal(env.TERM_PROGRAM_VERSION, '1.95.0');
  assert.equal(env.TERM, 'xterm-256color');
  assert.equal(env.COLORTERM, 'truecolor');
  assert.equal(env.PTYRIG_SESSION, '1');
  for (const key of ['TMUX', 'TMUX_PANE', 'NVIM', 'ZED_TERM', 'ITERM_SESSION_ID', 'TERM_SESSION_ID']) assert.equal(key in env, false);
  assert.equal(env.SSH_AUTH_SOCK, '/agent');
  assert.equal(env.TRAILS_ATTACH, 'workspace'); // Explicit application overrides remain intact.
  assert.equal(parent.TERM_PROGRAM, 'iTerm.app');
});

test('real command observes VS Code terminal identity and a separate PTY', async () => {
  const session = new Session(1, 'Environment', `printf 'host=%s version=%s tty=' "$TERM_PROGRAM" "$TERM_PROGRAM_VERSION"; test -t 0 && printf yes; sleep 120`, process.cwd(), '1.95.0');
  try { await until(() => session.snapshot().includes('host=vscode version=1.95.0 tty=yes')); }
  finally { session.close(); }
});

test('headless session answers cursor queries without an attached view', async () => {
  const session = new Session(1, 'Query', "stty raw -echo; printf '\\033[6n'; dd bs=1 count=6 2>/dev/null | od -An -tx1; sleep 120", process.cwd());
  try { await until(() => /1b\s+5b\s+31\s+3b\s+31\s+52/.test(session.snapshot())); }
  finally { session.close(); }
});

test('close escalates for a process ignoring hangup and terminates its PTY group', async () => {
  const session = new Session(1, 'Resistant', `exec '${process.execPath}' -e 'process.on("SIGHUP",()=>{});process.on("SIGTERM",()=>{});process.stdout.write("ready");setInterval(()=>{},1000)'`, process.cwd());
  try {
    await until(() => session.snapshot().includes('ready'));
    const pid = session.process.pid;
    const started = Date.now();
    session.close();
    await until(() => session.closed);
    assert.ok(Date.now()-started >= 700, 'resistant process requires escalation');
    assert.throws(() => process.kill(pid, 0), { code: 'ESRCH' });
  } finally { session.close(true); }
});

test('standard titles update placeholder tabs using OSC 0/2, including split and empty titles', async () => {
  const session = new Session(5, 'Agent ($TITLE)', 'sleep 120', process.cwd(), undefined, true, 'Trails');
  const output = data => new Promise(resolve => session.screen.write(data, resolve));
  try {
    assert.equal(session.title,'5: Trails');
    await output('\x1b]2;Fixing ');
    await output('login bug\x07');
    assert.equal(session.title,'5: Agent (Fixing login bug)');
    await output('\x1b]0;Running tests\x1b\\');
    assert.equal(session.title,'5: Agent (Running tests)');
    await output('\x1b]2;\x07');
    assert.equal(session.title,'5: Trails');
  } finally { session.close(); }
  const fixed = new Session(6, 'Fixed', 'sleep 120', process.cwd(),undefined,false);
  try {
    await new Promise(resolve=>fixed.screen.write('\x1b]2;Some title\x07',resolve));
    assert.equal(fixed.title,'Fixed');
  } finally { fixed.close(); }
});
