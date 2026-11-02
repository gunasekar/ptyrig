# Using PTYrig

## Settings

Set these in VS Code Settings or `settings.json`:

| Setting | Default | Purpose |
|---|---|---|
| `ptyrig.command` | Empty | Shell command to run when starting a session |
| `ptyrig.name` | `PTYrig` | Display name used in the status bar and launcher tooltip |
| `ptyrig.sessionTitle` | `PTYrig` | Session tab title template; supports `($CMD)` |
| `ptyrig.multipleSessions` | `true` | Allow more than one running session |

Upgrading from 0.1.x: move the existing session title in `ptyrig.name` to
`ptyrig.sessionTitle`, including fixed titles without placeholders. Set
`ptyrig.name` to a plain display name. Both settings default to `PTYrig`.

See the [README examples](../README.md#configure) for Claude Code, an fzf agent
picker and Lazygit.

## Sessions and shortcuts

Multiple sessions are enabled by default. Session numbers remain stable and are
not reused until the extension restarts. Session title and command changes apply
to new sessions. Display name changes update the launcher immediately. Settings
and Command Palette commands always use the PTYrig name.

| Shortcut | Command | Behavior |
|---|---|---|
| Ctrl+backslash | PTYrig: Hide/Show | Start the first session or hide/show all sessions |
| Ctrl+Shift+backslash | PTYrig: New Session | Start another independent session |
| Status bar (right) | PTYrig: Hide/Show | Same as Hide/Show; click the configured display name in the status bar |

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

Use `($CMD)` in `ptyrig.sessionTitle` to include the command name, with parentheses:

| Name template | Running command | Session title |
|---|---|---|
| `($CMD)` | `claude` | `1: (claude)` |
| `Agent ($CMD)` | `codex` | `1: Agent (codex)` |
| `My Agent` | `codex` | `1: My Agent` |

Single-session mode omits the numeric prefix, for example `Agent (claude)`.
Simple commands use the executable's basename, without its arguments. Compound
shell launchers initially show `(…)` until they report a selection, as in the
fzf example in the README. PTYrig does not execute a command or inspect unrelated
processes to guess a name.

Custom POSIX launchers can report a selected command with:

```sh
printf '\033]777;ptyrig-command;%s\007' "$agent"
exec "$agent"
```

This is display metadata from the running application, not verified process
identity. Ordinary application window-title changes do not overwrite the template.
Fixed names without `($CMD)` ignore command reports. Updating the session title
preference applies to new sessions; existing sessions keep their original template.

## Single-session applications

Set `ptyrig.multipleSessions` to `false` to reuse one running session, as in the
Lazygit example in the README. New Session reveals it even when hidden. After it exits or its
tab is closed, you can launch a fresh session.

Changing this preference never kills existing processes or renames their tabs.
If you disable it while several sessions are running, those sessions remain
available and New Session reveals them without adding more. Re-enable it to
create additional numbered sessions. The limit applies to the whole VS Code
window; PTYrig currently has one configured application rather than per-app profiles.

The title toolbar includes a **New Session** plus button when multiple sessions
are enabled. Double-clicking the empty native tab bar still creates an untitled
editor: VS Code owns this gesture and does not expose a supported override.
