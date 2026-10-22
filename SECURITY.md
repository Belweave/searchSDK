# Security policy

## Report a vulnerability privately

Use GitHub's [private vulnerability reporting form](https://github.com/Belweave/searchSDK/security/advisories/new)
when available. Include the affected SDK version or commit, impact, reproduction
steps, and a minimal synthetic example. Do not include API keys, account data,
private queries, or production checkpoint files.

If private reporting is unavailable, open a public issue asking for a private
security contact **without vulnerability details or sensitive data**. Wait for a
private channel before sharing the report. Do not publish an exploit in an issue
or pull request while a report is being coordinated.

The SDK is in alpha. Security fixes target the current development version;
older alpha snapshots do not have a separate maintenance commitment. There is no
guaranteed response time or bug-bounty program.

## Integrate with clear trust boundaries

- Run credentialed provider clients on your server. Keep secrets out of browser
  bundles, public environment variables, URLs, fixtures, and logs.
- Treat search text, native responses, and streamed events as untrusted input.
  Render text safely and independently authorize any actions driven by results.
- Result URL validation permits links; it is not an SSRF defense for fetching
  those links. Apply a separate network policy before server-side fetching.
- Custom providers and injected transports are trusted application code. Apply
  the same review and credential controls you use for other server integrations.
- Store durable checkpoints in a private directory with appropriate access
  controls. Reconcile ambiguous submissions explicitly; restarting or cancelling
  a local call does not prove a remote job stopped or was never created.
- Use the Node version in [.nvmrc](.nvmrc) and keep dependencies patched. Review
  lockfile and workflow changes before running contributed code locally.

The built-in transports provide deadlines, response-size bounds, redirect
rejection, and sanitized SDK errors. Native JSON declarations describe compile-time
contracts; they do not validate every provider field at runtime. Fixture checks
do not establish live-provider security or account behavior.
