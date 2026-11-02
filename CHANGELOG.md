# Changelog

## 0.3.2 Preview (2026-11-03)

- Reduce the extension package size by excluding unused screenshots, module variants, and native build files.

## 0.3.1 Preview (2026-11-03)

- Fix live session titles to recognize `$TITLE` directly. Existing `($TITLE)` templates retain their literal parentheses.
- Preserve literal dollar sequences in application titles during substitution.

## 0.3.0 Preview (2026-11-03)

- Replace `($CMD)` and custom OSC 777 command reports with live `($TITLE)` substitution from standard OSC 0/2 terminal titles. **Migration:** update title templates and launcher escape sequences; old placeholders remain literal text.
- Show `ptyrig.name` until a nonempty terminal title arrives; restore it on an empty title. Fixed templates remain fixed.
- Shorten live title values to 32 Unicode code points with an ellipsis, including native tab hover text.
- Set the informational `PTYRIG_SESSION=1` environment marker for optional integrations.
- Update the agent picker example and document Trails/tmux title forwarding.

## 0.2.0 Preview (2026-11-02)

- Add a right-aligned status bar launcher that appears after startup without launching a process.
- Use `ptyrig.name` for the launcher display name and tooltip; add `ptyrig.sessionTitle` for session tab title templates. **Migration:** move existing session titles from `ptyrig.name` to `ptyrig.sessionTitle`, then set a plain display name in `ptyrig.name`.
- Refresh the logo with a transparent orange listing/tab icon and a theme-aware status bar glyph.
- Fix terminal sizing so padding does not clip the rightmost columns or bottom rows.
- Add real VS Code screenshots and configuration examples for Claude, Codex, OpenCode, Cursor, and LazyGit.

## 0.1.1 Preview (2026-11-02)

- Outline the Marketplace listing icon so it stays visible on dark themes.
- Shorten the README and move reference material into USAGE, DEVELOPMENT, and ARCHITECTURE guides.

## 0.1.0 Preview (2026-11-02)

Initial release for macOS Apple Silicon.

- Run any configured foreground terminal application in a custom editor view.
- Create independent sessions or reuse a single session with `ptyrig.multipleSessions`.
- Hide/show views while preserving processes and terminal state, without using the bottom panel.
- Recreate sessions in their previous tab order and restore selection on hide/show, without moving tabs afterward; VS Code insertion settings still apply.
- Customize titles, including `($CMD)` substitution and picker-reported command names.
- Close views on command exit and terminate owned PTY process groups on explicit close.
- Preserve scrolling margins, saved cursors, tab stops, character sets and cursor modes during restoration.
- Bound output buffering and scrollback; acknowledge rendered frames and answer queries while hidden.
- Provide keyboard shortcuts, a New Session toolbar action, and PTYrig listing/tab icons.
- Require Workspace Trust and restrict webview scripts/resources to bundled assets.
- Include pinned dependencies, regression tests, platform verification, checksums, runtime inventory and prepared OIDC release tooling.
