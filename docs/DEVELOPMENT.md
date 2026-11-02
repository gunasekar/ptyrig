# Development

Use Node.js 22 or newer, preferably Node.js 26 LTS, and Python 3.9 or newer for
package verification. The packaged extension does not need a separate Node.js
installation.

## Build and install locally

```sh
npm ci
npm run package
code --install-extension ptyrig-0.3.1-darwin-arm64.vsix
```

Builds target the host OS and architecture. The public preview supports macOS
Apple Silicon; other platforms need their own native build and validation.

## Run and test

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
processes and also run in macOS arm64 and Linux x64 CI. Packaging is a local development
artifact, not a Marketplace publication:

```sh
npm run package
```

The VSIX targets the build host OS/architecture and includes a SHA-256 checksum
and CycloneDX runtime dependency inventory. For example, a macOS Apple Silicon
build produces `ptyrig-0.3.1-darwin-arm64.vsix`.

See [Contributing](../CONTRIBUTING.md) for the full check list and contribution guidance.

## Logo assets

`icons/ptyrig.svg` is the canonical transparent orange logo. Session tabs use it
directly. The listing PNG and monochrome status bar font are checked in, so
normal builds and extension users need no image or font tooling.

To regenerate after changing the SVG, install librsvg (`rsvg-convert`) and use
a disposable Python environment for the font build tools:

```sh
python3 -m venv /tmp/ptyrig-icon-tools
/tmp/ptyrig-icon-tools/bin/pip install fonttools==4.68.0 skia-pathops==0.9.2
python3 scripts/build-icon.py
/tmp/ptyrig-icon-tools/bin/python scripts/build-status-icon.py
```

README screenshots are real isolated VS Code captures. Keep the visible settings
identical to the corresponding JSON examples, use the current logo, and capture
only the demo window. README image URLs are absolute raw GitHub URLs so vsce
preserves the document bytes during packaging and Marketplace can load them.
