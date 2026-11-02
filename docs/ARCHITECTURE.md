# Architecture

- `src/session.js`: PTY lifecycle, input/resize, headless terminal and bounded scrollback.
- `src/titles.js`: sanitized live terminal titles, initial display names and title templates.
- `src/extension.js`: session registry, commands and view placement.
- `src/view.js`: webview lifecycle, bounded transport, resource policy and validated messages.
- `web/terminal.js`: xterm.js renderer, theme integration and keyboard input.
- `web/state.js`: pinned xterm snapshot supplement for margins, saved cursor,
  attributes, tab stops, character sets and cursor modes.

Each process has a headless terminal that keeps its screen state even when the
view is closed. Reopened views receive a snapshot of that screen, including the
alternate screen, cursor modes and other state needed to keep rendering correctly.
The snapshot supplement uses xterm internals, so the renderer and headless versions
are pinned together and upgrades must pass the state restoration tests.

The renderer acknowledges output after drawing it. Buffered output is capped and
replaced with a fresh snapshot when necessary. PTY reading pauses if the headless
parser falls too far behind.
Scripts and assets are packaged locally with a restrictive content security policy.
Terminal output is interpreted by xterm, never injected as HTML.

Commands run through the user's shell in command mode with the active file's
workspace folder (or the first workspace folder, then home) as working directory.
Child processes receive `TERM_PROGRAM=vscode`, the running VS Code version,
`TERM=xterm-256color` and `COLORTERM=truecolor`. Inherited outer tmux/editor
identifiers are removed so applications detect this independent editor terminal.
`PTYRIG_SESSION=1` identifies the PTYrig terminal to optional integrations. It
is informational and does not gate terminal title handling.
This does not provide native VS Code shell integration.

The headless terminal emits title changes for standard OSC 0/2 sequences. Sessions
with `($TITLE)` templates format those changes and notify their own editor panel,
including while hidden. Empty titles use the display name captured at creation;
fixed templates ignore updates. Live title values are sanitized and shortened to
32 Unicode code points, including an ellipsis, before insertion. Native tab hovers
therefore also show the shortened text. PTYrig does not parse executable names or
implement the former custom OSC 777 command-report protocol.

Workspace Trust is required. The workspace extension host owns processes, so Remote
SSH/WSL/container processes run remotely; those environments still need validation.

## Scope and limitations

Sessions keep running while hidden, but reloading or closing VS Code stops
PTYrig's processes. There is no background service or restart recovery.
Applications with their own session manager, such as Trails/tmux, retain whatever
their manager supports.

The first public target is macOS Apple Silicon Preview. Native PTY packaging
must be tested per OS/architecture before adding support. Windows,
Linux, Remote SSH, IME, accessibility, arbitrary remapped shortcuts, clipboard
behavior and sustained-output performance need broader acceptance testing. Native
VS Code terminal features (shell integration, terminal profiles and terminal APIs)
do not automatically apply to these custom views. No automatic application-specific
title detection, links, search UI or clipboard escape-sequence access is provided.
