# Development

Use Node.js 22 or newer, preferably Node.js 26 LTS, and Python 3.9 or newer for
package verification. The packaged extension does not need a separate Node.js
installation.

## Build and install locally

```sh
npm ci
npm run package
code --install-extension ptyrig-0.1.0-darwin-arm64.vsix
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
build produces `ptyrig-0.1.0-darwin-arm64.vsix`.

See [Contributing](../CONTRIBUTING.md) for the full check list and contribution guidance.
