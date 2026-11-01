# PTYrig: A terminal harness for VS Code

**Give your CLI/TUI tool a dedicated place in VS Code with a few settings.**

Run Claude Code, Codex, lazygit, or any terminal application in dedicated editor tabs. Keep sessions running while you hide or show them.

Set a command and a session name, then use the shortcuts to open or hide your tool.
PTYrig works on its own, without a separate session manager.

## Install

The first release is a **Preview for macOS Apple Silicon**. Install it from the
[VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=ptyrig.ptyrig)
or run:

```sh
code --install-extension ptyrig.ptyrig
```

To build and install it from source:

```sh
npm ci
npm run package
code --install-extension ptyrig-0.1.0-darwin-arm64.vsix
```

VS Code 1.95.3 or newer is required. Development/building needs Node.js 22 or newer;
Node.js 26 LTS is recommended. The packaged extension does not need a separate
Node.js installation. Install your terminal applications on the machine where
the extension runs. See `docs/RELEASE.md` for release progress and
`CONTRIBUTING.md` for development instructions.

## Examples

Add one of these examples to VS Code's `settings.json`. Install the tools first.
If no command is configured, PTYrig asks you to set one when you first open it.

### Claude Code

```json
{
  "ptyrig.command": "claude",
  "ptyrig.name": "Claude Code"
}
```

Each New Session starts an independent Claude Code process. Tabs appear as
`1: Claude Code`, `2: Claude Code`, and so on.

### Choose an agent with fzf

Choose between **Claude Code**, **Codex**, and **Gemini CLI** each time you start
a session. This example uses a POSIX shell (macOS/Linux) and requires `fzf` plus
the agent commands you intend to select:

```json
{
  "ptyrig.command": "agent=$(printf '%s\\n' claude codex gemini | fzf --prompt='Agent > ') && [ -n \"$agent\" ] && printf '\\033]777;ptyrig-command;%s\\007' \"$agent\" && exec \"$agent\"",
  "ptyrig.name": "Agent ($CMD)"
}
```

Select `claude`, `codex`, or `gemini` and press Enter to launch it. Escape cancels
and closes the session. The launcher reports its selection before starting it,
so tabs become `1: Agent (claude)`, `2: Agent (codex)`, and so on.

### Lazygit

Keep one Git interface running and hide/show it as needed:

```json
{
  "ptyrig.command": "lazygit",
  "ptyrig.name": "Lazygit",
  "ptyrig.multipleSessions": false
}
```

New Session reveals the existing Lazygit session instead of starting another.
Its title is simply `Lazygit`.

## Use

Multiple sessions are enabled by default. Session numbers remain stable and are
not reused until the extension restarts. Name and command changes apply to new
sessions. Settings and Command Palette commands always use the PTYrig name.

| Shortcut | Command | Behavior |
|---|---|---|
| Ctrl+backslash | PTYrig: Hide/Show | Start the first session or hide/show all sessions |
| Ctrl+Shift+backslash | PTYrig: New Session | Start another independent session |

Control is used on macOS too. These bindings override VS Code defaults and can be
remapped in Keyboard Shortcuts. VS Code handles the shortcuts, and PTYrig keeps
the default keypresses from reaching your application.

To change either shortcut, open **Preferences: Open Keyboard Shortcuts**, search
for `PTYrig`, and edit **Hide/Show** or **New Session**. These are standard VS Code
keybindings, rather than separate `ptyrig.*` settings. For example, in
`keybindings.json` you can replace the defaults with:

```json
[
  { "key": "ctrl+\\", "command": "-ptyrig.toggle" },
  { "key": "ctrl+shift+\\", "command": "-ptyrig.new" },
  { "key": "ctrl+alt+p", "command": "ptyrig.toggle" },
  { "key": "ctrl+alt+shift+p", "command": "ptyrig.new" }
]
```

Choose bindings that do not conflict with your editor or application. Even after
remapping, Ctrl+backslash and Ctrl+Shift+backslash remain reserved inside PTYrig.
Try your new shortcuts with focus inside a session as well as in the editor.

Hide/Show closes the tabs while your applications keep running and their screen
state is preserved. Showing them again restores the tabs beside your code and selects the
last-used session. PTYrig creates tabs in their previous order, but VS Code's
insertion settings can affect where they appear. It does not move tabs afterward.
If sessions are behind other files, Hide/Show brings them forward.

Closing a tab stops its session. When an application exits, its tab closes too,
including when it exits with an error. It does not leave a shell open afterward.

PTYrig never creates a native VS Code terminal or moves anything through the
bottom panel. Editor tabs can expand if other editor groups are closed; PTYrig
does not provide a fixed sidebar or an Activity Bar icon.

## Command names in titles

Use `($CMD)` in `ptyrig.name` to include the command name, with parentheses:

| Name template | Running command | Session title |
|---|---|---|
| `($CMD)` | `claude` | `1: (claude)` |
| `Agent ($CMD)` | `codex` | `1: Agent (codex)` |
| `My Agent` | `codex` | `1: My Agent` |

Single-session mode omits the numeric prefix, for example `Agent (claude)`.
Simple commands use the executable's basename, without its arguments. Compound
shell launchers initially show `(…)` until they report a selection, as in the
fzf example above. PTYrig does not execute a command or inspect unrelated
processes to guess a name.

Custom POSIX launchers can report a selected command with:

```sh
printf '\033]777;ptyrig-command;%s\007' "$agent"
exec "$agent"
```

This is display metadata from the running application, not verified process
identity. Ordinary application window-title changes do not overwrite the template.
Fixed names without `($CMD)` ignore command reports. Updating the name preference
applies to new sessions; existing sessions keep their original template.

## Single-session applications

Set `ptyrig.multipleSessions` to `false` to reuse one running session, as in the
Lazygit example. New Session reveals it even when hidden. After it exits or its
tab is closed, you can launch a fresh session.

Changing this preference never kills existing processes or renames their tabs.
If you disable it while several sessions are running, those sessions remain
available and New Session reveals them without adding more. Re-enable it to
create additional numbered sessions. The limit applies to the whole VS Code
window; PTYrig currently has one configured application rather than per-app profiles.

The title toolbar includes a **New Session** plus button when multiple sessions
are enabled. Double-clicking the empty native tab bar still creates an untitled
editor: VS Code owns this gesture and does not expose a supported override.

## Security

PTYrig runs your configured command with your user permissions; it is not an
agent sandbox. It uses locally bundled renderer assets, has no telemetry or
agent downloads, and requires Workspace Trust. Applications are installed and
trusted separately. See `SECURITY.md` for boundaries and release
requirements, and `docs/REVIEW.md` for findings and remaining work.

## Development

```sh
npm ci
npm test
npm run test:vscode
code --extensionDevelopmentPath="$PWD" .
```

Development requires Node.js 22 or newer; Node.js 26 LTS is recommended. CI uses
npm 12.2.1 and the latest stable Python 3 for package verification. See
[dependency maintenance](https://github.com/gunasekar/ptyrig/blob/main/docs/DEPENDENCIES.md)
for reviewed dependency/action versions and compatibility checks.

Use a development window to configure and try the extension. Tests use an isolated
VS Code profile and do not change your normal settings. The PTY tests run real
processes; currently validated on macOS arm64. Packaging is a local development
artifact, not a Marketplace publication:

```sh
npm run package
```

The VSIX targets the build host OS/architecture and includes a SHA-256 checksum
and CycloneDX runtime dependency inventory. For example, a macOS Apple Silicon
build produces `ptyrig-0.1.0-darwin-arm64.vsix`.

## Architecture

- `src/session.js`: PTY lifecycle, input/resize, headless terminal and bounded scrollback.
- `src/titles.js`: safe command labels and configurable title templates.
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
This does not provide native VS Code shell integration.

Workspace Trust is required. The workspace extension host owns processes, so Remote
SSH/WSL/container processes run remotely; those environments still need validation.

## Initial scope and limitations

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
