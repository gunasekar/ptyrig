# Contributing

See [Development](docs/DEVELOPMENT.md) for local setup and builds, and
[Architecture](docs/ARCHITECTURE.md) for the process and renderer design.

Use Node.js 22 or newer and Python 3.9 or newer for package verification. Install
with `npm ci` so the committed dependency versions and integrity hashes are used.
Prefer Node.js 26 LTS and a maintained Python 3 release. CI uses npm 12.2.1;
that npm version requires a recent patch of Node 22/24 or Node 26 or newer.
The PTY dependency includes native code; review install scripts and dependency
updates, and install the platform compiler toolchain if no prebuild is available.

```sh
npm ci
npm test
npm audit --omit=dev
npm run test:vscode       # existing VS Code installation, isolated profile
npm run test:vscode:ci    # download an official VS Code build, isolated profile
npm run package
python3 scripts/verify-package.py ptyrig-0.1.0-darwin-arm64.vsix --target darwin-arm64
```

Substitute the build host's target/version in the verification command. Linux
GUI tests require a display, for example `xvfb-run -a npm run test:vscode:ci`.
Set `PTYRIG_VSCODE_VERSION=1.95.3` to test the minimum supported VS Code version.
For product changes verify the actual PTY and editor behavior, not only mocked
messages. Keep tests meaningful: process identity, input/output, terminal protocol,
exit cleanup, grouping, bounded buffering and isolation are useful boundaries.

Run a development window with:

```sh
code --extensionDevelopmentPath="$PWD" .
```

Keep changes focused. Explain the user-visible behavior and the checks performed.
Do not add telemetry, remote code loading, agent installers or shell integration
claims without an explicit design discussion. Terminal applications run with the
user's permissions: see SECURITY.md rather than treating the renderer as a sandbox.

The CI workflow tests macOS arm64 and Linux x64. Windows publication remains gated
on native validation and review of node-pty's reported termination issue. A green
workflow does not establish compatibility on untested platforms or prove that the
code and dependencies are free of vulnerabilities.

See [dependency maintenance](docs/DEPENDENCIES.md) for the checked versions,
upstream sources and update procedure. The minimum lane retains Node 22 and
VS Code 1.95.3; release and Linux lanes use Node 26 LTS and current stable VS Code.
