# Publishing the SDK

The SDK is `@belweave/search-sdk`. The workspace root and website remain private.
The initial prerelease is `0.1.0-alpha.0`, published publicly under the `alpha`
dist-tag. Users install it with `npm install @belweave/search-sdk@alpha`.
Preparing a release does not publish it or deploy the website.

## Update npm and sign in

Use the repository's Node version. With nvm installed, from the repository root:

```bash
nvm use
node --version
npm install --global npm@latest
npm --version
npm login --auth-type=web --registry=https://registry.npmjs.org/
npm whoami --registry=https://registry.npmjs.org/
```

Complete login and any two-factor verification in the browser opened by npm.
Do not paste passwords, tokens, recovery codes, or one-time codes into an issue,
chat, source file, or repository configuration. Updating npm affects the selected
nvm Node installation. If the latest npm no longer supports the pinned Node
version, follow npm's reported engine requirements before updating.

The signed-in npm account must have permission to publish in the `@belweave`
organization. Confirm that organization membership in npm before the first
publication. GitHub organization access does not grant npm access.

## Prepare and inspect

```bash
npm ci
npm run release:prepare
```

This runs all SDK, server, documentation, site, benchmark-fixture, and packed
consumer checks. It then writes the tarball, file manifest, and SHA-256 checksum
under `.local/releases/0.1.0-alpha.0/`. These local release artifacts are ignored
by Git. Review the manifest: the package contains compiled SDK code and
declarations, its README, license, and package metadata, with no site, test,
credential, or research files.

```bash
cd .local/releases/0.1.0-alpha.0
shasum -a 256 -c SHA256SUMS
npm publish ./belweave-search-sdk-0.1.0-alpha.0.tgz --dry-run --ignore-scripts --access=public --tag=alpha --registry=https://registry.npmjs.org/
```

Dry-run does not publish and does not establish organization permissions. Verify
the exact version and intended tag before the actual publish. npm versions are
immutable: an already-published name/version cannot be reused. If source changes
after preparation, regenerate and recheck the artifact.

## Publish the reviewed artifact

From the same release directory, when ready:

```bash
npm publish ./belweave-search-sdk-0.1.0-alpha.0.tgz --ignore-scripts --access=public --tag=alpha --registry=https://registry.npmjs.org/
npm view @belweave/search-sdk@0.1.0-alpha.0 version dist.integrity --registry=https://registry.npmjs.org/
npm view @belweave/search-sdk dist-tags --json --registry=https://registry.npmjs.org/
```

Check the registry integrity against the prepared manifest and perform a fresh
consumer installation from npm. Test the fixture quickstart without provider
credentials. Do not treat publication, installation, or fixture checks as live
provider verification. Keep the `latest` tag for a deliberate stable-channel
decision; alpha publication does not move it.

For later releases, update the SDK version and lockfile together, rerun checks,
and use the resulting versioned directory and tarball. CI publishing and npm
provenance should be configured through npm trusted publishing separately;
local preparation does not claim provenance attestation.

References: [npm login](https://docs.npmjs.com/cli/v11/commands/npm-login/),
[npm publish](https://docs.npmjs.com/cli/v11/commands/npm-publish/), and
[npm organization roles](https://docs.npmjs.com/about-organization-roles-and-permissions).
