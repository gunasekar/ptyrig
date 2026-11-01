# Code review (2026-11-02)

Scope: session/process lifecycle, shell launch, PTY environment, renderer transport,
terminal state, settings/trust, webview isolation, dependency/package contents and
editor behavior. This is a source review plus regression tests, not an independent
security audit, penetration test or cross-platform certification.

## Findings fixed

| Priority | Finding | Resolution |
|---|---|---|
| High | Closed tabs assumed a single SIGHUP ended a process; resistant processes/children could survive | Signal the owned POSIX PTY process group, escalate to SIGKILL, finalize on actual exit, force termination on extension shutdown |
| High | A hidden/background terminal had no renderer to answer cursor/device queries and could stall an application | Headless model replies; renderer suppresses matching queries so they cannot reply twice |
| Medium | Exit during restore could dereference a disposed view | Skip closed sessions and tolerate view disappearance |
| Medium | Old/mismatched output acknowledgements could release a different pending frame | Monotonic message IDs; accept only the outstanding ID; recover from rejected delivery |
| Medium | Broad node_modules resource root exposed more local assets than needed | Restrict roots to renderer libraries/CSS and PTYrig web assets; explicitly deny base URL and form actions |
| Medium | Trust was only declared in the manifest | Also check Workspace Trust at process creation and mark command setting restricted |
| Medium | Lifecycle was difficult to review in one module | Extract webview ownership, transport and resource policy into src/view.js |
| Low | Control characters/unbounded display names could pollute tab labels | Strip controls and bound the configured display name |
| Low | Queued error notification awaited user dismissal and could block later actions | Show errors without making queue progress depend on dismissal |
| Low | Generic extension/tab icon and no nearby New Session action | New vector/raster mark, light/dark tab assets, multi-session-only plus button |

Earlier regression coverage retains fixes for duplicate shortcut dispatch, mouse
encoding omitted from screen snapshots, binary mouse bytes, and VS Code terminal
environment detection. CLI environment and real PTY availability were compared
with the separate Trails extension in an isolated VS Code profile.

## Editor-title double-click limitation

VS Code's MultiEditorTabsControl handles blank native tab-bar double-click by
calling editorService.openEditor directly, not by invoking an overridable command.
The stable extension API exposes neither that mouse event nor a cancellable
before-open event. PTYrig cannot safely distinguish this gesture from an intentional
new untitled file. Watching and closing new files would interfere with user work.

The supported implementation adds New Session to the title toolbar when multiple
sessions are allowed. Native blank-bar double-click still creates an untitled file.
To own that gesture, PTYrig would need its own session strip *inside* a webview;
that would replace native session tabs and change the interface. No VS Code DOM
patching or automatic closure of unrelated editors is used.

Source: https://github.com/microsoft/vscode/blob/main/src/vs/workbench/browser/parts/editor/multiEditorTabsControl.ts

## Release preparation follow-up (before publication)

- Reproduced and fixed scrolling-margin divergence after screen restoration. Added
  a version-pinned xterm state supplement and round-trip tests for future output,
  normal/alternate buffers, saved cursor/attributes, tab stops, pending wrap,
  origin mode, line-drawing charset and cursor visibility. This deliberately uses
  isolated xterm internals; it is an explicit maintenance cost, not a claim that
  the stock serialization addon captures all terminal behavior.
- Removed the duplicate delayed Windows termination call and cancel a pending
  POSIX escalation when force-closing. Upstream node-pty #967 remains an unresolved
  Windows publication concern, not a vulnerability we claim to have fixed upstream.
- Closing processes remain owned for cleanup but no longer block a replacement
  single-session launch. Restoration resolves a surviving view anchor each time
  rather than reusing a column that may have disappeared on process exit.
- Failed view creation now closes the newly created process instead of retaining
  an invisible orphan. Modified Ctrl+Alt/Meta+backslash combinations reach the app.
- Added official VS Code download tests; the lifecycle suite passed on 1.95.3 locally.
  Added CI checks for minimum/current macOS arm64 and current Linux x64. Those
  Hosted jobs still need to pass on the public repository before publication.
- Prepared pinned-action, manual, protected-environment OIDC publication of the
  tested macOS arm64 artifact. Added platform/native/source package verification,
  CycloneDX inventory, checksum, metadata/tag checks and provenance generation.
  This pipeline is prepared locally, not remotely configured or proven.
- Source/release identity confirmed by the maintainer: gunasekar/ptyrig source,
  new ptyrig publisher, macOS Apple Silicon Preview first. The public repository
  now exists and private vulnerability reporting is enabled. Release protections,
  publisher ownership and Marketplace policies still require setup.
- Rechecked stable npm releases and full action release SHA pins on 2026-11-02.
  All seven direct packages were current. Updated artifact upload/download,
  release tooling to Node 26 LTS/npm 12.2.1, and current runner images. Kept the
  minimum Node 22/VS Code 1.95.3 lane. See DEPENDENCIES.md for exact versions.
- Reviewed npm 12's changed install policy: added exact-version approvals for
  native PTY/signature helper setup and fail-on-unreviewed-scripts in build CI.
  Publication still ignores all install scripts. Added an explicit stable Python
  setup step for package verification. Hosted workflow validation is still pending.
- Hide/show recreates tabs in their previous order and then restores selection.
  Removed the forced tab-move commands to avoid visible shuffling. VS Code's
  insertion preference still applies; no editor settings are changed.

## Publication follow-up

v0.1.0 Preview passed the minimum/current macOS and Linux hosted checks and was
published through OIDC after deployment approval. The Marketplace download matches
the tested VSIX checksum. GitHub build provenance verification also passed. The
repository, publisher policy, protected refs and deployment review gate are now
configured. See RELEASE.md for the release workflow and distribution details.

## Remaining work

- Windows/Linux/Remote SSH/WSL/container native process and packaging validation.
  Current local validation is macOS arm64. POSIX group cleanup does not stop a
  program that deliberately detaches; no system-wide process killing is attempted.
- Native PTY and xterm are part of the trusted code. Pinning/lockfiles/audits reduce
  accidental drift but do not establish absence of malicious code.
- npm audit currently reports two moderate development-tool findings through
  vsce/minimatch. Runtime dependency audit is clean. No forced incompatible major
  override is applied. Recheck before release and track upstream mitigation.
- Font preferences, clipboard shortcuts, accessibility/IME, arbitrary remapped keys,
  color/pixel queries and sustained-output performance need broader testing. This
  is not a promise of full native VS Code terminal emulation.
- Reload/restart recovery and daemon-backed arbitrary-process persistence are out
  of scope. Output is not retained after a process exits and its tab closes.

## Security positioning

A generic terminal host lets users run an independently installed CLI without an
agent-specific extension. It does not protect against a compromised PTYrig VSIX,
compromised CLI, another malicious extension, or an agent performing an unsafe action.
See SECURITY.md for actual boundaries and the publication requirements.
