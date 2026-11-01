# Changelog

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
