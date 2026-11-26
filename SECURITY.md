# Security policy

## Report a vulnerability privately

Use GitHub's [private vulnerability reporting form](https://github.com/Belweave/searchSDK/security/advisories/new)
when available. Include the affected package and version (for example
`@searchsdk/sdk@0.1.0`) or commit, the impact, reproduction steps, and a
minimal synthetic example. Do not include API keys, account data, private
queries or raw provider responses.

If private reporting is unavailable, open a public issue asking for a private
security contact **without vulnerability details or sensitive data**. Wait for
a private channel before sharing the report. Do not publish an exploit in an
issue or pull request while a report is being coordinated.

## Supported versions

Security fixes target the latest `@searchsdk/sdk` release on npm and the
current `main` branch, which also carries the Python runtime (`sdk/python`,
not yet on PyPI). v1 (tag `v1-final`, branch `v1`) is archived and receives no
fixes. There is no guaranteed response time or bug-bounty program.

## Integrate with clear trust boundaries

- Call providers from your server. Keep keys out of browser bundles, public
  environment variables, URLs, fixtures and logs. The runtimes read keys from
  each provider's documented variable or from the client, send them in
  headers, and keep them out of errors and diagnostics.
- Treat search results, page contents and the provider's `raw` body as
  untrusted input. Render text safely and authorize separately any action an
  agent takes because of a result.
- `contents` asks the provider to fetch the URLs you pass. Validate URLs
  before passing them on; result URLs are not an SSRF defence for fetching
  those links yourself.
- A custom `fetch`, transport, environment or registry passed to a client is
  trusted application code. Edited registry specs are validated for shape,
  not for intent: review them like code.
- Cancelling a call or a timeout does not prove the provider did not receive
  or bill the request; check each attempt's `billed` value.
- Use the Node version in [.nvmrc](.nvmrc) and keep dependencies patched.
  Review lockfile and workflow changes before running contributed code.

The runtimes enforce deadlines, cancellation, response-size limits and fixed,
sanitized error messages, and never follow redirects. Specs and fixtures do
not establish live provider behaviour or security. The public documentation
site and its MCP endpoint serve documentation and registry data only; they
hold no provider keys and do not execute provider calls.
