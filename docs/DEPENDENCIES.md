# Dependency maintenance

Checked against upstream stable releases on 2026-11-02. This is a dated review,
not a promise that these versions remain the newest after that date. Prereleases
are excluded. Install with `npm ci`; keep direct dependencies exactly pinned.

## npm packages

All seven direct dependencies already match the npm registry's `latest` tag.

| Package | Stable version | Role |
|---|---|---|
| `@xterm/xterm` | 6.0.0 | Browser terminal renderer |
| `@xterm/headless` | 6.0.0 | Terminal state independent of views |
| `@xterm/addon-fit` | 0.11.0 | Renderer sizing |
| `@xterm/addon-serialize` | 0.14.0 | Screen snapshots |
| `node-pty` | 1.1.0 | Native terminal processes |
| `@vscode/test-electron` | 3.1.0 | Official VS Code integration tests |
| `@vscode/vsce` | 4.1.0 | VSIX packaging and publication |

Sources: [xterm.js](https://github.com/xtermjs/xterm.js/releases),
[node-pty](https://github.com/microsoft/node-pty/releases),
[test-electron](https://github.com/microsoft/vscode-test/releases),
[vsce](https://github.com/microsoft/vscode-vsce/releases), and the
[npm registry](https://registry.npmjs.org/).

Some indirect packages have newer majors outside their parents' declared ranges.
Do not override these to make an outdated report empty. Review parent upgrades,
compatibility, install scripts, lockfile integrity and the packaged native binary.
The renderer and headless terminal must stay on the same version as the state
adapter in `web/state.js`; run snapshot parity tests before any xterm upgrade.

The runtime audit reports no known vulnerabilities. The full audit reports two
moderate findings: `@vscode/vsce` and its vulnerable `minimatch` dependency are
both listed for the same dependency path. No compatible fix is available through
the latest stable vsce. These development dependencies are excluded from the VSIX.
Track [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249).
This is not an assertion that the extension or dependencies are vulnerability-free.

## GitHub Actions and tooling

| Action | Reviewed release |
|---|---|
| `actions/checkout` | [v7.0.1](https://github.com/actions/checkout/releases/tag/v7.0.1) |
| `actions/setup-node` | [v7.1.0](https://github.com/actions/setup-node/releases/tag/v7.1.0) |
| `actions/setup-python` | [v7.1.0](https://github.com/actions/setup-python/releases/tag/v7.1.0) |
| `actions/upload-artifact` | [v7.0.2](https://github.com/actions/upload-artifact/releases/tag/v7.0.2) |
| `actions/download-artifact` | [v8.0.2](https://github.com/actions/download-artifact/releases/tag/v8.0.2) |
| `actions/attest` | [v4.2.2](https://github.com/actions/attest/releases/tag/v4.2.2) |

Both workflows use full commit SHA pins resolved from these release tags. The
artifact steps keep archived upload/extracted download behavior; download digest
mismatches fail the publish job. Publication still uses the exact verified VSIX.
The actions' own embedded Node runtime is selected by their upstream manifests;
`setup-node` controls the runtime for our build and test commands.

- Release and Linux validation use Node 26, the current LTS line, with the latest
  patch selected at run time. Source checks and publication also use Node 26.
- npm is explicitly installed at 12.2.1, the current stable release. It requires
  Node `^22.22.2 || ^24.15.0 || >=26.0.0`.
  npm 12 blocks dependency install scripts by default. `allowScripts` approves
  only `node-pty@1.1.0` (prebuild selection/source compilation and native setup)
  and `@vscode/vsce-sign@2.1.0` (packaging signature helper setup). CI uses
  `--strict-allow-scripts` so newly introduced install scripts require review.
  The publication job retains `--ignore-scripts`, regardless of this allowlist.
- Python verification uses the latest stable Python 3 selected by `setup-python`.
  The verifier uses the standard library and remains compatible with Python 3.9+.
- Release runs on `macos-26` arm64; Linux validation/publication use `ubuntu-26.04`.
  The minimum lane keeps `macos-15`, Node 22 and VS Code 1.95.3 intentionally.
- Current lanes select stable VS Code at run time; the current stable release
  checked for this review is 1.144.0. The extension's minimum stays at 1.95.3.

Sources: [Node release schedule](https://github.com/nodejs/Release),
[npm](https://www.npmjs.com/package/npm),
[runner images](https://github.com/actions/runner-images), and the
[VS Code update service](https://update.code.visualstudio.com/api/update/darwin-arm64/stable/latest).

## Updating

Dependabot checks npm dependencies and pinned GitHub Actions weekly. It does not
maintain the npm version in shell commands or choose new Node/runner major lines;
review those explicitly with this document.

1. Check registry `latest` tags and upstream action releases. Resolve release tags
   to commit SHAs and inspect breaking changes before replacing workflow pins.
2. Update exact dependency pins and the lockfile only within reviewed compatible
   ranges. Retest terminal state parity when changing xterm internals.
3. Run `npm test`, `npm run release:check`, both dependency audit scopes, real
   VS Code tests, packaging and package verification. Validate workflows with
   `actionlint`. The release lane also tests the installed VSIX.
4. Run hosted CI before publication. Local macOS checks cannot validate hosted
   runner changes or certify Linux/Windows behavior. Update this dated record.

`actionlint` 1.7.12 does not yet recognize the GitHub-hosted `ubuntu-26.04`
label. `.github/actionlint.yaml` adds only that verified label to its allowlist.
Remove the compatibility entry when the linter includes it upstream.
