# Publishing SDK packages

The packages are source alphas; registry publication is not claimed. Each
[package README](../packages/README.md) records its identity, version, build and
consumer checks. Preparing an artifact does not publish it or deploy the website.
The workspace root and website remain private npm packages.

The procedure below prepares the TypeScript package `@belweave/search-sdk`,
currently `0.1.0-alpha.0`. A future publication uses the `alpha` dist-tag only
after registry availability and permissions have been checked. Other SDKs need
a deliberate release in their own ecosystem; the npm command does not publish them.

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
