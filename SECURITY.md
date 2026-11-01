# Security

PTYrig is a terminal host, not a sandbox or an agent permission system. Configured
commands run with the extension host user's operating-system permissions and
inherited environment, including credentials that a normal terminal can access.
PTYrig does not approve or restrict actions taken by those programs.

## Current boundaries

- Sessions start only after a launch/toggle command. No application is launched
  merely by activation, installation, a workspace opening, or a settings change.
- Workspace Trust is required both by the manifest and before process creation.
  The command setting is restricted. In a trusted workspace, workspace settings
  may choose the shell command: inspect them before launching an unfamiliar project.
- Applications are installed separately. PTYrig does not download agents, fetch
  runtime JavaScript, install extensions, collect credentials or send telemetry.
  Applications themselves may do these things; PTYrig does not constrain them.
- Terminal output is parsed by xterm.js, not inserted into HTML. The webview has
  no command URIs, arbitrary filesystem/command RPC, or remote scripts. Its CSP
  blocks network resources and restricts scripts to generated nonces. Inline
  styles remain necessary for the renderer. Resources are limited to its bundled
  browser assets, not the workspace or home directory.
- Renderer messages can supply terminal input, bounded dimensions, acknowledgements,
  and readiness. Input deliberately reaches the already running command and can
  execute commands if that application offers a shell. It is not a security boundary
  against a compromised terminal renderer; dependency integrity matters.
- Command-title reports are display metadata from the running application, not
  verified process identity. They cannot execute a host command or inject HTML,
  and fixed titles ignore them.
- Terminal buffers are bounded in memory and are not written to disk by PTYrig.
  OSC clipboard integration and automatic opening of links are not enabled.
- Closing terminates the PTY process group on macOS/Linux, escalating after 750ms.
  Deliberately detached daemons or externally managed sessions can outlive it.
  Windows delegates once to node-pty/ConPTY and still requires platform validation
  and upstream termination review before publication (node-pty issue #967).

This is an early local build, not an independently audited or hardened release.
The process manager and native PTY run outside the webview sandbox. A malicious
extension package can act with normal extension privileges regardless of the
webview's restrictions.

## Supply chain and publication

Source review alone cannot establish that a marketplace artifact contains the
reviewed code. Before public publication we must:

1. Establish the canonical source repository, publisher and private vulnerability
   reporting channel; enable account MFA and protect release branches/tags.
2. Build from a reviewed tag using `npm ci`, the committed lockfile and reviewed
   install scripts/native binaries. Keep dependencies pinned and review updates.
3. Use a protected, least-privilege release workflow with actions pinned to reviewed
   commit SHAs and short-lived OIDC publishing credentials where supported. Never
   expose release credentials to pull-request code.
4. Build/test each supported OS/architecture, inspect the VSIX file list, generate
   checksums and dependency inventory, and attach build provenance to artifacts.
5. Verify the distributed artifact matches the intended build. A checksum hosted
   only beside a compromised artifact is insufficient independent proof.

These publication controls must be verified before release. The public repository
is `gunasekar/ptyrig`, with private vulnerability reporting enabled. The intended
Marketplace publisher is `ptyrig`; publisher ownership, release protections and
trusted publishing configuration still need verification.

## Reporting

Report vulnerabilities privately at:
https://github.com/gunasekar/ptyrig/security/advisories/new

Private vulnerability reporting is enabled for this repository. Do not post
credentials or exploit details in public issues.

The first supported release will be 0.1.x Preview on macOS Apple Silicon. Only the
latest published patch in that series receives fixes. No public PTYrig version
has been released yet.
