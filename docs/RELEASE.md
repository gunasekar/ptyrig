# Release preparation

## Release target

v0.3.0 Preview is published for macOS Apple Silicon. Its
[release workflow](https://github.com/gunasekar/ptyrig/actions/runs/41511397899)
passed the build and verification lanes and published through Marketplace OIDC.
The Marketplace VSIX matched the tested artifact after HTTP gzip decoding.

The commands below target v0.3.2 Preview, which reduces the packaged extension size.
Check the [GitHub releases](https://github.com/gunasekar/ptyrig/releases) and the
[Marketplace listing](https://marketplace.visualstudio.com/items?itemName=ptyrig.ptyrig)
for publication status.

The source is public at `gunasekar/ptyrig`, with protected version tags. The
Marketplace publisher is `ptyrig`; trusted publishing uses the `marketplace`
environment. The published target is macOS Apple Silicon. Linux CI provides extra
coverage, but Linux is not a published target yet. Before adding Windows, review
node-pty issue #967 and test native process cleanup.

## Initial commit

The initial commit is `feat: introduce PTYrig terminal application host`. It includes
the implementation, icons, settings, tests, documentation, lockfile and workflows.
Dependencies, downloaded VS Code builds, VSIX files, checksums, generated SBOMs and
local profile data stay out of Git. The setup below records the publication prerequisites and is also useful when
recreating the release environment.

## Setup before publication

1. Confirm the `ptyrig` publisher and trusted publishing policy match the public
   `gunasekar/ptyrig` repository and `.github/workflows/publish.yml` workflow.
   The policy environment must be `marketplace`. Keep the Preview label.
2. Keep main and the release tag on the reviewed source. Private vulnerability
   reporting is enabled, and SECURITY.md links to it. Protect main and release tags; require reviews,
   CODEOWNER review and passing Checks jobs. Require MFA for maintainer accounts.
3. Configure a GitHub `marketplace` environment with required reviewers and restrict
   deployment refs to the approved release tags/branch. Set repository variable
   `MARKETPLACE_PUBLISHING_ENABLED=true` only after these protections are in place.
4. Register a Marketplace Trusted Publishing policy for this exact repository,
   `.github/workflows/publish.yml` and the `marketplace` environment. This requires
   publisher-owner access in the Marketplace portal; a local CLI login does not
   prove that such a policy exists. Do not create or store a long-lived publishing PAT.
5. Run hosted CI. Resolve test/package failures; inspect the dependency audit,
   native binaries, installed VSIX behavior and release file list. Current devtool
   audit has a moderate vsce/minimatch finding with no compatible upstream fix.
   It is not shipped in the runtime VSIX. The CI high-severity gate does not waive
   review of moderate findings; recheck and document the decision before release.

## Build and verify

Prefer Node 26 LTS and npm 12.2.1; Node 22 remains the compatibility baseline.
See DEPENDENCIES.md for reviewed versions and install-script policy. CI rejects
unreviewed dependency install scripts and selects stable Python 3 explicitly.

```sh
npm ci
npm test
npm audit --omit=dev
npm run test:vscode
PTYRIG_VSCODE_VERSION=1.95.3 npm run test:vscode:ci
npm run release:check
npm run package
python3 scripts/verify-package.py ptyrig-0.3.2-darwin-arm64.vsix --target darwin-arm64
```

Packaging targets the build host and writes the VSIX, its SHA-256 file, and a
CycloneDX runtime dependency inventory. The verifier checks source/document bytes,
manifest identity, native architecture, executable helper, development-file
exclusions, checksum and direct runtime inventory. It does not establish absence
of malicious code or reproducible byte-for-byte builds.

## Publish the reviewed artifact

After all setup and checks pass, create the reviewed version tag and push it.
Publishing is manual; a tag push alone does not publish:

```sh
gh workflow run publish.yml --ref v0.3.2 -f tag=v0.3.2
```

The workflow verifies the tag/version, requires that its dispatch source commit
matches the tagged commit, and confirms the tag is on main. Read-only jobs build,
test and upload artifacts. After environment approval, the publishing job downloads
the stable macOS arm64 artifact, verifies it against the same source, generates a
provenance attestation, and publishes that exact VSIX via OIDC. It does not rebuild
the extension with publishing credentials. Actions are pinned to commit SHAs.

The publisher job needs `id-token:write` for OIDC and attestation, plus attestation
and artifact-metadata permissions. Its dependency installation skips install scripts.
These controls were exercised by the v0.2.0 publication. Never describe the
release as signed or provenance-verified until the hosted job and distribution have
actually been checked.

## After publication

- Confirm the Marketplace identity, version, Preview label and macOS arm64 target.
- Install from Marketplace in a clean profile and test direct launch, picker titles,
  single/multiple sessions, hide/show, exit and shortcuts.
- Download the published artifact and compare its digest with CI; verify its
  provenance with `gh attestation verify FILE --repo OWNER/REPO`.
- Keep source/release notes and distribution links consistent. Do not add other
  registries or platform claims without separately validating their artifacts.

References:
https://code.visualstudio.com/api/working-with-extensions/publishing-extension
https://github.com/actions/attest
https://github.com/microsoft/node-pty/issues/967
