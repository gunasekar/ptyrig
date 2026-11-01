# PTYrig: A terminal harness for VS Code

**Give your CLI/TUI tool a dedicated place in VS Code with a few settings.**

Run Claude Code, Codex, lazygit, or any terminal application in dedicated editor
tabs. Keep sessions running while you hide or show them.

## Install

Available as a **Preview for macOS Apple Silicon**, with VS Code 1.95.3 or newer.
Install from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=ptyrig.ptyrig)
or run:

```sh
code --install-extension ptyrig.ptyrig
```

Install the terminal tools you want to use separately.

## Configure

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

## Shortcuts

| Shortcut | Command |
|---|---|
| Ctrl+backslash | PTYrig: Hide/Show |
| Ctrl+Shift+backslash | PTYrig: New Session |

Use Control on macOS too. Change either binding in **Preferences: Open Keyboard
Shortcuts** by searching for `PTYrig`.

Hide/Show keeps your applications running. Closing a session tab stops its
process, and an application exiting closes its tab. Reloading or closing VS Code
stops sessions.

PTYrig uses editor tabs and leaves the bottom terminal panel alone. Commands run
with your user permissions and require Workspace Trust.

## More information

- [Session settings, shortcuts and titles](https://github.com/gunasekar/ptyrig/blob/main/docs/USAGE.md)
- [Development and local builds](https://github.com/gunasekar/ptyrig/blob/main/docs/DEVELOPMENT.md)
- [Architecture and limitations](https://github.com/gunasekar/ptyrig/blob/main/docs/ARCHITECTURE.md)
- [Security](https://github.com/gunasekar/ptyrig/blob/main/SECURITY.md)
- [Contributing](https://github.com/gunasekar/ptyrig/blob/main/CONTRIBUTING.md)
