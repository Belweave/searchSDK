import type { DocArticle } from "./model.js";
import { callout, code, links, list, paragraph as p, section as s } from "./model.js";

export const boatArticles: readonly DocArticle[] = [
  {
    slug: "guides/boat",
    title: "Run searchSDK in Boat",
    label: "Boat sandbox",
    group: "Guides",
    description: "Install the alpha package in your own Boat sandbox, run a fixture, then optionally make one server-side search with your own key.",
    keywords: ["boat", "sandbox", "run", "recipe", "SSH", "download"],
    sections: [
      s("before-you-start", "Before you start",
        p("Boat provides Ubuntu sandboxes with SSH and Node. This guide runs searchSDK inside a sandbox you create and control. The downloadable runner uses deterministic fixtures by default. It does not create or manage a sandbox."),
        list("You need your own Boat account and an installed, signed-in Boat CLI. Follow Boat's official quickstart, review its installer before executing it, and check its current billing terms before creating a sandbox.", "Install `@belweave/search-sdk@alpha` in the sandbox application. Alpha APIs may change; retain package-lock.json to reproduce the resolved version.", "Use Node `24.22.1` or a newer patched Node 24 release. The fixture needs no search-provider key. Optional live search needs your own Context.dev key and can incur provider charges."),
        callout("Verification boundary", "The SDK contract and fixture runner are checked locally. A live Boat session and live provider search have not been verified. This is a setup recipe, not a benchmark or a partnership claim."),
        links({ label: "Boat quickstart", href: "https://docs.boat.dev/quickstart" }, { label: "Boat pricing", href: "https://docs.boat.dev/pricing" }, { label: "Optional source build", href: "/docs/installation#pack-locally" }, { label: "Download search.mjs", href: "/recipes/boat/search.mjs", description: "Save the file in your sandbox application and inspect it before running. Fixture mode is the default." })),
      s("open-a-sandbox", "1. Open your sandbox",
        p("On your own computer, after completing Boat's official CLI setup, create a sandbox with a 30-minute auto-stop deadline. `--no-env` prevents Boat from injecting your account's configured secrets, repositories, and agent logins. Keep the printed sandbox ID; replace `YOUR_SANDBOX_ID` below with that actual ID."),
        code("Your computer · Boat CLI", `boat status --check
boat new --type small --ttl 1800 --no-env

# Use the ID printed by boat new:
boat info YOUR_SANDBOX_ID
boat ssh YOUR_SANDBOX_ID`, "bash"),
        p("The remaining setup and search commands run inside that SSH shell. SSH work does not extend the auto-stop deadline. Install and run one recipe at a time; leave enough time to clean up before the deadline."),
        links({ label: "Boat SSH access", href: "https://docs.boat.dev/ssh-access" }, { label: "Boat credential inheritance", href: "https://docs.boat.dev/environments/access" })),
      s("prepare-node", "2. Check Node inside the sandbox",
        code("Inside the sandbox · check Node", `node --version
npm --version`, "bash"),
        p("Use Node `24.22.1` or a newer patched Node 24 release before continuing. If you already use nvm, run `nvm install 24.22.1` and `nvm use 24.22.1`. Otherwise, follow Node's official installation instructions for your sandbox architecture."),
        links({ label: "Official Node downloads", href: "https://nodejs.org/en/download" })),
      s("build-the-alpha", "3. Install searchSDK",
        p("Create a server application inside the sandbox and install the alpha channel. The package is ESM with declarations and zero runtime dependencies. Keep the generated lockfile if you retain the project."),
        code("Inside the sandbox · Bash", `mkdir searchsdk-boat
cd searchsdk-boat
npm init --yes
npm install @belweave/search-sdk@alpha`, "bash"),
        links({ label: "Installation and optional source build", href: "/docs/installation" })),
      s("run-the-fixture", "4. Inspect and run the recipe",
        p("In `searchsdk-boat`, download the plain ESM file from this documentation site, inspect it, then execute it. It requires no extra runtime dependencies beyond the SDK package. You can also save the linked file locally and copy it with Boat's documented `boat scp` command."),
        code("Inside the sandbox · download for review", `curl --fail --location --show-error https://searchsdk.dev/recipes/boat/search.mjs -o search.mjs
cat search.mjs`, "bash"),
        code("Inside the sandbox · run after review", `node search.mjs`, "bash"),
        p("Expect JSON with `mode: \"fixture\"`, a mock provider, three fixed example-domain results, and source provenance. No search-provider request is sent. Attempt timestamps and durations vary; the fixture is not evidence of live retrieval quality or Boat performance."),
        p("The runner uses the same SDK calls as this complete fixture example. It caps results at three, sets a ten-second total deadline and an eight-second attempt deadline, disables retries, and passes a cancellation signal when interrupted."),
        code("boat-fixture.ts · fixture", `import { createSearch } from '@belweave/search-sdk';
import { createMockProvider } from '@belweave/search-sdk/testing';

const client = createSearch({
  provider: createMockProvider(),
  timeoutMs: 10_000,
  attemptTimeoutMs: 8_000,
  retry: { maxRetries: 0 },
});
const response = await client.web.search({ query: 'SQLite write concurrency', limit: 3 });
console.log(response.provider, response.results, response.attempts);`)),
      s("optional-live-search", "5. Optional: one live search",
        p("Only continue if you intend to make a potentially billable Context.dev request. Enter your provider key in the interactive SSH session using this Bash prompt. The key is hidden while typing, stays in the subshell's environment and runner memory, and is removed when they exit. The runner requires `--live`; setting a key alone never enables live search."),
        code("Inside the sandbox · Bash · live opt-in", `(
  set +x
  ulimit -c 0
  read -r -s -p 'Context.dev API key (hidden): ' CONTEXT_API_KEY
  printf '\\n'
  export CONTEXT_API_KEY
  node search.mjs --live
)`, "bash"),
        p("The runner makes one normalized search with no configured fallback or retries. Context.dev can request at least ten native results before the SDK trims the output to three, which can affect credits. Cancellation and deadlines limit local waiting; they cannot guarantee a remote request was not processed or billed."),
        callout("Keep credentials out of disk and logs", "Do not put provider or Boat account keys in source, `.env`, shell startup files, command arguments, public client code, or snapshots. Do not pass a provider key through a Boat exec command: command history can retain command text. This recipe writes no credential file, but other processes in the same sandbox may access process memory or environment. Use a sandbox you control and trust.", "caution"),
        links({ label: "Context.dev adapter and billing boundary", href: "/docs/providers/context" }, { label: "SDK cancellation and deadlines", href: "/docs/reliability/timeouts" })),
      s("finish-and-clean-up", "6. Finish and clean up",
        p("Exit SSH and manage the sandbox from your own computer. Choose deletion when you are finished with the disposable environment; the CLI asks for confirmation. Export only non-secret artifacts you need first."),
        code("Your computer · delete the disposable sandbox", `# Leave the sandbox SSH shell:
exit

# On your computer, use your recorded ID:
boat delete YOUR_SANDBOX_ID`, "bash"),
        p("If you deliberately want to keep the disk instead, run `boat stop YOUR_SANDBOX_ID` and check `boat info YOUR_SANDBOX_ID` until it is stopped. Stopping ends running processes and snapshots disk; it does not erase files or earlier snapshots. Auto-stop has the same persistence caveat. Review Boat's current retention policy before relying on stopped storage."),
        callout("Snapshots are persistent data", "Deleting the sandbox starts irreversible background deletion. Follow the deletion operation to completion. Named snapshots, forks, and other shared artifacts can retain data independently and need separate cleanup. If a key was written to disk or logged accidentally, revoke it; deleting a current file or merely stopping the sandbox does not erase older copies.", "caution"),
        links({ label: "What Boat snapshots save", href: "https://docs.boat.dev/snapshots/whats-saved" }, { label: "Boat stop and deletion commands", href: "https://docs.boat.dev/cli-reference#boat-delete-id" }, { label: "Boat deletion API semantics", href: "https://docs.boat.dev/api/reference/sandboxes/permanently-delete-sandbox-data" })),
      s("programmatic-lifecycle", "Automating the lifecycle later",
        p("Boat's `@boatdev/sdk` and HTTP API are separate infrastructure clients. searchSDK is the search client running inside the sandbox. For automation, use Boat's official TypeScript guide: keep `BOAT_API_KEY` on the trusted controller, wait for readiness, bound the sandbox lifetime, inspect command exit status, and clean up in `finally`. Its synchronous command API has a separate timeout; keep installation and execution within that timeout or use the documented streaming helper."),
        p("Provisioning and live provider execution are intentionally manual in this recipe. No Boat API key is required inside the sandbox. Benchmarks are separate work and are not run by these commands."),
        links({ label: "Boat TypeScript SDK", href: "https://docs.boat.dev/sdks/typescript" }, { label: "Boat HTTP API", href: "https://docs.boat.dev/api/v1" }, { label: "Boat documentation index", href: "https://docs.boat.dev/llms.txt" }, { label: "Test integrations with fixtures", href: "/docs/guides/testing" })),
    ],
  },
];
