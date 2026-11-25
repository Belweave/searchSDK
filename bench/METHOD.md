# searchSDK Benchmarks: method 0.2.0

Values in this document come from `config/method.json`. Changing any of them,
the rubric or the scoring code is a new method version.

## 1. What is measured

One normalized `search` call per item, provider and profile, made through the
searchSDK TypeScript runtime exactly as a user would make it: `maxResults` 10,
a 10-second deadline, no retries, no fallback, and no options beyond the
profile's settings. The benchmark measures the provider and its registry spec
together, as users get them.

Two profiles:

- **default**: nothing set. This is the headline.
- **tuned**: the best settings found by tuning (section 8), within a list-price
  cap per call. Published beside the headline with its exact settings.

## 2. Items

An item is one query with a verifiable answer (`schemas/item-1.schema.json`):
query, class, language, aliases or a pattern or official URLs, source and
statement, licence, the date the answer was true, and review status.

### Classes and target mix

The method must tell a 6-point overall gap from noise (section 9), so the
monthly run needs about 400 paired items. The six static classes get equal
shares, so no single kind of query decides the overall score; fresh is sized
by what can be verified each month.

| Class | Public | Private | Why it is in the set |
| --- | --- | --- | --- |
| `fact.head` | 42 | 17 | baseline: facts about well-linked subjects; every provider should find them |
| `fact.tail` | 42 | 17 | index coverage differs most on obscure subjects (few sitelinks, smaller languages and countries) |
| `multihop` | 42 | 17 | needs a page that joins two facts (a work's creator, then where they were born) |
| `tech` | 42 | 17 | developer, standards and security lookups, the main use by agents |
| `nav` | 42 | 17 | precision at the top: the official site of a named owner |
| `nonen` | 42 | 17 | non-English queries answered in that language, in Latin, Cyrillic and Han/kana scripts |
| `fresh` | — | — | crawl recency: 50 items a month about the last 45 days |

**Per-class reporting.** A monthly run has 59 items in each static class
and 50 fresh: all above the routing table's 30-item floor, so every class is
reported. At that size the minimum detectable paired difference within a
class is about 16 points (2.8·√(0.2/59)); only the overall score (n ≈ 400,
about 6 points) separates the gaps the owner cares about. Cells below the
class are **too small to report alone** and are never published as scores:
one language within `nonen` (4 to 9 items), one source within `tech` or
`fresh` (10 to 15), one template anywhere.

### Templates and sources

Each template is a fixed, published query over one open source
(`src/dataset/wikidata.ts` for the seed templates,
`scripts/datasets/templates.ts` and `scripts/datasets/sources.ts` for the
rest). Licences were checked on 2026-11-25 and are recorded on every item.

| Class | Templates | Source and licence |
| --- | --- | --- |
| `fact.head` | capital of a country with ≥220 sitelinks; author of a Nobel laureate's notable work; director of a Best Picture winner; painter of a work with ≥25 sitelinks in eleven large museums; headquarters city of a listed company with ≥60 sitelinks | Wikidata P36, P50, P57, P170, P159 (CC0-1.0) |
| `fact.tail` | author of a work in a smaller language (2–5 sitelinks); director of a film from a smaller industry (2–6); painter of a work in eight national galleries of smaller countries (1–3 sitelinks, dated, generic titles dropped); architect of a skyscraper (2–5) | Wikidata P50, P57, P170, P84 (CC0-1.0) |
| `multihop` | birthplace of the director, author, painter or architect of a named work (Best Picture winners, Nobel works, museum paintings, smaller-industry films, buildings) | Wikidata P57/P50/P170/P84, then P19 (CC0-1.0) |
| `tech` | designer of a programming language; developer of a piece of software; developer of a file format | Wikidata P287, P178 (CC0-1.0) |
| | author of an accepted or final Standards Track PEP with one or two authors | PEPs, peps.python.org (public domain or CC0-1.0) |
| | product affected by a CVE in CISA's Known Exploited Vulnerabilities catalog, added before 2026 | CISA KEV (CC0-1.0) |
| `nav` | official website of a university, a piece of software, a government agency, an international organisation, a museum; root URLs on the owner's own host only (shared hosts such as github.com or gov.uk are refused) | Wikidata P856 (CC0-1.0) |
| `nonen` | capital of a country in French, German, Spanish, Japanese; author of a Nobel work in French and Russian; director of a prize-winning film (Oscar, Palme d'Or, Golden Lion, Golden Bear) in Italian, Portuguese and Chinese; painter of a museum painting in German | Wikidata P36, P50, P57, P170 (CC0-1.0) |
| `fresh` | latest patch of a maintained release line, "as of" the build date | endoflife.date (MIT) |
| | product affected by a CVE of this year added to the KEV catalog in the last 45 days | CISA KEV (CC0-1.0) |
| | first author of an arXiv paper first posted 5 to 40 days before the build: the first 60 per subject group in the window, ten groups, then a seeded draw | arXiv metadata (CC0-1.0) |
| | latest stable version of a piece of software, "as of" the build date | Wikidata P348 with P577 and P548 (CC0-1.0) |
| | winner of an event dated in the last 45 days (one winner, a person); not in `fresh-2026-12` (section 13) | Wikidata P1346 or P991 (CC0-1.0) |

Fresh questions name the build date ("as of 25 November 2026") or a dated
event, so the answer cannot change between the build and the run.

### Bias controls

- **No provider in the loop.** Building and reviewing call no search
  provider and read no provider output. Questions and answers come only from
  the sources above.
- **Random within template.** Candidates are drawn in a seeded random order
  within each template, never by how providers do on them.
- **One subject, once.** A subject (Wikidata entity, PEP, CVE, product,
  paper) is used once across all splits. With `uniqueHolders` (private,
  fresh and tuning specs) the Wikidata statement and the entity holding it
  count too, so two birthplace items about one author never appear. Public,
  private, fresh and tuning share no id, query, statement or subject;
  `dataset validate` enforces this for the tuning set.
- **No crowded answers.** At most two items in a set share a first answer
  (one in fresh), so a common answer (London, a prolific author) cannot carry
  a class.
- **No dominant template.** No template is more than a third of its class.
- **Popularity is explicit.** Head and tail differ by sitelink thresholds,
  not by judgement.
- **Several sources and scripts.** `tech` and `fresh` draw on sources other
  than Wikidata; `nonen` spans eight languages and three scripts.
- **Answer keys.** Aliases come from the source, pruned by a fixed rule
  (`pruneAliases` in `scripts/datasets/build.ts`): the label; one-word
  variants of a one-word label; for longer labels, aliases of two or more
  words that share a word of four or more letters with it; same-script
  variants of Han and kana names. Bare surnames and nicknames ("Wood",
  "Pink City") are dropped because they match unrelated text.
- **One defensible answer set.** Subjects need exactly one current value.
  Reviewers drop generic or ambiguous names (a painting called "Rest", "Trinity
  College"), answers that are contested or moving (a headquarters being
  relocated), and source errors.
- **Review does not select by Wikipedia.** The cross-check (below) only
  supports the reviewer. An item whose answer a second source does not show
  stays in the set as `builder-checked`; it is dropped only when the answer
  is wrong or ambiguous.

### Rules

- A subject is used only when it has exactly one current value for the asked
  property, so each item has one answer. The statement ID is recorded.
- The answer may not appear in the query.
- Latin aliases shorter than four letters, or all lowercase, are dropped:
  they match unrelated text.
- A committed review file (`datasets/review/`) lists every dropped candidate
  with its reason and every changed alias list. Reviewed items say who
  reviewed them (`agent-reviewed` or `human-verified`); items nobody could
  check stay `builder-checked`.
- **Cross-check.** `scripts/datasets/crosscheck.ts` looks for each answer in
  a second public source: the Wikipedia article of the entity holding the
  statement (Wikidata items), the CVE record on cve.org (KEV items), the
  release page the endoflife.date record links to. PEPs and arXiv pages are
  their own authority. An item is `agent-reviewed` when the reviewer (an AI
  agent) confirmed it against its source and, where one exists, the second
  source; the item's note says where.
- Every committed set is listed in `datasets/manifest.json` with its SHA-256.
  Changing a file without a new version fails validation. A later version may
  carry an item forward only unchanged.
- The owner spot-checks a seeded 10% sample of each split, round-robin over
  classes and over templates within a class
  (`datasets/review/spot-check-2026-12.json`; the private sample there lists
  only opaque ids and hashes, and the full private entries are in
  `<store>/private/spot-check-private-1.0.0.json`).

### Splits

| Split | File | Items | Notes |
| --- | --- | --- | --- |
| Public | `datasets/public/public-1.0.0.jsonl` | 252 | the 86 seed items (`seed-0.1.0`, unchanged ids) plus 166 new |
| Private | `<store>/private/private-1.0.0.jsonl` | 102 | 17 per class; local only; hashes in `datasets/private-manifest.json` |
| Fresh | `datasets/fresh/fresh-2026-12.jsonl` | 50 | built 2026-11-25, expires 2026-12-25; `fresh-2026-11` kept as history |
| Tuning | `datasets/public/tuning-0.1.0.jsonl` | 24 | 4 per class; for `bench tune` only; shares nothing with the other splits |

Review status after the agent review: public 245 `agent-reviewed` and 7
`builder-checked`; private 98 and 4; fresh 36 and 14; tuning 23 and 1. No
item is `human-verified` yet.

- **Public**: committed, with full text.
- **Private**: built with the same templates and proportions as the public
  set, a secret seed and the public set excluded, then turned private: each
  item gets a new opaque ID and a random 128-bit nonce. The spec, the
  candidates, the review file and the items live only in the local store.
  The repository holds the SHA-256 of each item's canonical JSON, nonce
  included, with its class. Published results name private items by that
  hash and publish no result URLs for them. A retired item is published with
  its nonce, so anyone can check it against the old hash. Every run sends
  private queries to every provider, so a quarter of them are replaced each
  quarter.
- **Fresh**: built just before the run from the last 45 days of data. They
  expire 30 days after building. Superseded versions are kept to measure
  stale answers.
- **Tuning**: a separate small public set for choosing tuned settings, so
  the tuned profile is never scored on the items it was chosen with.

**The store.** The store is `BENCH_STORE` or, by default, `.local/bench/`
in the repository root (git-ignored). Private items are read from
`<store>/private/`; a run config names them in `privateDatasets` relative to
the store (`"privateDatasets": ["private/private-1.0.0.jsonl"]`). In a git
worktree, set `BENCH_STORE` to the main checkout's `.local/bench` so the run
finds them.

### Building a set

```sh
node scripts/datasets/build.ts --spec datasets/specs/<name>-<version>.json   # candidates into <store>/candidates/
node scripts/datasets/crosscheck.ts --in <store>/candidates/<file>.jsonl --out <report>.json
# write datasets/review/<name>-<version>.json (drops with reasons, answer fixes, notes)
node scripts/datasets/assemble.ts --spec datasets/specs/<name>-<version>.json  # set + manifest
```

A spec's `exclude` list names committed sets, or sets in the store as
`store:<path>` (the tuning spec excludes `store:private/private-1.0.0.jsonl`).
The private spec and review file live in `<store>/private/specs/`;
`assemble.ts` sends the result through `makePrivate` and writes only the hash
manifest. Each month: copy the fresh spec with a new version and seed, set
`builtOn` to the build day (at most a week before the run), build, review,
assemble.

## 3. Conditions

- **Order.** Items run in a seeded random order. Each item goes to every
  provider within the same few seconds, in a seeded random provider order.
  At most 4 items are in flight.
- **Pacing.** Each provider is held to half of its strictest documented rate
  limit for the chosen plan (the most restrictive one when no plan is
  named). A 429 under that pacing is the provider's failure. After one, the
  provider pauses for `Retry-After` or 30 seconds.
- **Passes.** The pilot runs every item twice to measure run-to-run change.
  Monthly runs use one pass.
- **Where.** Runs are started by hand, never by CI, on the owner's machine
  or a VM. `BENCH_REGION` is recorded.

## 4. Outcomes

Each call has exactly one outcome.

| Outcome | Meaning | Quality | Counts against reliability |
| --- | --- | --- | --- |
| `ok_nonempty` | at least one result | scored | no |
| `ok_empty` | a valid, empty list | 0 | yes |
| `rate_limited` | 429 or quota | 0 | yes |
| `timeout` | deadline passed | 0 | yes |
| `server_error` | 5xx or a provider error | 0 | yes |
| `network_error` | connection failed | 0 | yes |
| `invalid_response` | a 2xx the spec cannot read, or too large | 0 | yes |
| `setup_error` | our key, request or option was wrong | not scored; the provider stops until fixed | no |
| `aborted`, `harness_error` | we interrupted it, or our bug | not scored; rerun on resume | no |

Empty results, errors, timeouts and rate limits all score zero. The old
benchmark counted empty responses as successes. Here an always-empty
provider scores zero and ranks last.

## 5. Known-answer score (objective)

For each attempt:

- **Non-nav items** score 1 when an alias or pattern matches in the title and
  excerpts of any of the top 10 results, or in the text of any of the top 3
  result pages. Otherwise they score 0.
- **Nav items** score 1 when one of the top 3 result URLs is on the official
  host or one of its subdomains.

Matching first normalizes both texts: NFKC, lowercase, Latin, Greek and
Cyrillic diacritics removed, punctuation and symbols turned into spaces.
Aliases must match on word boundaries. For Han, kana and Thai, a substring
match is enough. Version patterns reject longer versions, so 1.6.11 matches
neither 1.6.110 nor 1.6.11.2.

Page text comes from the harness's own plain fetcher (`src/pages/fetcher.ts`),
never from a ranked provider. Each distinct top-3 URL (by the SDK's URL key)
is fetched once per run:

- an HTTP GET with the user agent `BenchPageFetcher/1.0 (compatible; …;
  obeys robots.txt)`, which names no person, project or contact;
- robots.txt is read once per host and obeyed (RFC 9309): our own group if it
  names `BenchPageFetcher`, else `*`; the longest rule wins and allow wins a
  tie. No robots.txt (4xx) allows everything; an unreachable one (5xx, 429,
  network failure, timeout) disallows everything. A Crawl-delay up to 30
  seconds is honoured; a longer one makes the host unreadable;
- one request per host at a time, at least one second apart, four in flight;
- at most 5 redirects, each hop checked again (scheme, host, robots.txt);
  local, private and link-local addresses are refused;
- a 20-second deadline per page; the first 5 MiB of the body is read;
- only `text/html`, `application/xhtml+xml` and `text/plain`; the charset
  comes from the header, a byte order mark or a `<meta>` tag; scripts,
  styles and markup are removed.

A page it cannot read is **unreadable**, with a reason (robots, status,
content type, redirects, timeout, network, empty, blocked URL). An unreadable
page contains no answer for every provider alike, since all providers share
the same fetch of a URL. Published: the overall unreadable rate with counts
by reason, and each provider's unreadable share among its own top URLs. The
fetcher costs nothing and is not in the spend plan.

Reported: the score, plus its snippet part and its page part. Snippet credit
depends on what a provider's excerpts are (registry `excerptKind`:
description, content chunk or highlights), so that kind is published beside
each provider's score.

## 6. Judged relevance

- **Pool.** On the judged items (pass 1, default profile), each provider's
  top 3 URLs are pooled, then de-duplicated by the SDK's URL key. When the
  judge is covered by a plan, every item is judged; otherwise a seeded
  sample within classes keeps the cost down.
- **Passage.** The judge sees the query, URL, title and up to 4,000 bytes of
  the fetched page. The passage is the paragraph-aligned window holding the
  most query terms. When the page was unreadable, the judge sees the
  result's own title and excerpts instead, and the published `pageShare`
  says how often the page was used.
- **Blind.** The judge never learns which provider returned the page.
- **Grades.** Grades follow `rubric/relevance-1.0.0.md` (0 to 3). The
  rationale comes before the grade.
- **Score.** nDCG@3 with gain 2^g − 1. The ideal is the best 3 distinct
  pairs anyone returned for the item. Items where nobody returned anything
  relevant are dropped. A failed or empty response scores 0. Items with any
  unresolved pair are left out, and the count is published.
- **Judge.** Kimi K3.1 Pro (`morph-kimik31`) through Morph's
  OpenAI-compatible endpoint, with `reasoning_effort` low, at most 600 output
  tokens, and JSON-schema output. Temperature and top_p are not sent: the
  host fixes them. Judges are pluggable (`config/judges.json`).
- **Self-consistency.** 15% of pairs, chosen by seed, are judged twice. The
  quadratic-weighted kappa between the two passes is published.
- **Human check.** `bench label` shows a seeded sample of judged pairs, one at
  a time. It shows the same passage the judge saw, with no provider and no
  judge grade, and records 0 to 3. Judge-human agreement is the quadratic
  weighted kappa with a bootstrap interval, plus the exact-agreement rate.
- **Gate.** Judged scores are published only with at least 100 human labels,
  judge-human kappa ≥ 0.60 and self-consistency kappa ≥ 0.80. Otherwise the
  judged columns are withheld with the reason. The known-answer score,
  reliability, latency and cost are published either way.

One judge model means there is no cross-vendor check. That is why the
objective score alone decides rank (section 9), and why the gate exists.

## 7. Reliability, latency, cost

- **Usable-response rate:** `ok_nonempty` ÷ scored attempts, over all
  passes, with a 95% Wilson interval. Every outcome's rate is published.
- **Latency:** wall-clock time around the SDK call, measured with a
  monotonic clock. Pacing waits are excluded. Successful and empty calls
  count as measured. A timeout counts as the deadline (censored), so a
  provider that times out cannot look fast. Other errors are excluded and
  reported as rates. Published as p50, p90 and p95.
- **Cost:** the SDK's per-attempt cost: the provider's reported figure, else
  the registry's list price (the SDK's `listPrice`). Every billed attempt counts, including
  `possible` ones (timeouts, network failures). Published as cost per query
  and cost per correct answer, with counts by cost source and by billing
  certainty. An unknown price is shown as unknown, never as $0.

Cost and latency are columns. They never affect rank.

## 8. Tuning

`bench tune` runs a seeded sample of 30 public items. It runs each provider's
default and every candidate in `config/tuning.json`. Candidates use only
documented options. A candidate runs only if the SDK can bound its cost per
call (`costBound`) and the bound is at most $0.02. For each provider, the candidate with the best
known-answer score wins. A tie goes to the cheaper option, then to default.
Unreliable candidates cannot win.

The monthly run adds the `tuned` profile from the selection file. It scores
that profile without the 30 tuning items, so the choice is not graded on the
items it was chosen with. Tuning spend goes through the same ledger and caps.

## 9. Statistics and ranking

The owner confirmed these rules on 2026-11-24: the known-answer score sets the
rank and judged relevance is a gated column; a tie needs both statistical
separation and at least 6 points; a provider is unreliable below a 95%
usable-response floor.

- **Pairing.** Every provider is scored on the same items. An item missing
  for any ranked provider is dropped from that profile's comparison, and the
  count is published. A provider scored on fewer than 90% of items is marked
  `incomplete` and not ranked.
- **Intervals.** 95% percentile intervals come from a paired bootstrap over
  items: 2,000 replicates, seed 20261124. Each replicate draws the same
  items for every provider, so a difference keeps the item-level
  correlation.
- **Reliability bands.** A provider is unreliable when the upper end of its
  usable-rate Wilson interval is below 0.95. Unreliable providers are marked
  and ranked below every dependable provider, whatever their quality.
- **Ties.** Within each band, providers are sorted by known-answer score. A
  provider joins the current group unless it is separable from the group's
  leader. Separable means two things hold: the interval of the paired
  difference excludes zero, and the difference is at least 6 points. Tied
  providers share a group number and are shown as tied, with intervals.
- **Per class.** The same rule runs within each query class for the routing
  table.
- **Run-to-run change** (two passes): the share of items whose score changed
  between passes, and the mean Jaccard overlap of the two passes' result
  URLs.

## 10. Spend control

- **Ledger.** Every paid call reserves its worst case in a month-wide ledger
  before it is sent. For a search that is the SDK's cost bound for the exact
  request (`costBound`, registry/steps.md): the highest documented rate
  (overage, the dearest plan, the top of a published range) for the results
  asked for. No margin is added. Only a call the SDK cannot bound reserves
  $0.05, and the plan says so. Page fetches are free and reserve nothing.
- **Judge pricing** is a run setting (`judgePricing`). `covered-by-plan`, the
  default in the owner's configs because Morph Ultra covers Kimi K3.1 Pro,
  reserves nothing: the cap counts provider calls only, and the judge can
  score every item. Any charge the judge reports (`usage.cost` or
  `usage.total_cost`), or a 402 from it, halts the run. `list-price`, the
  default otherwise, reserves each call's request byte length as input
  tokens plus the full output cap, at list price.
- **Caps.** A call is refused when it could take the run past its cap or the
  month past $100 in cash. Cash is spend beyond the declared free credit of
  each account.
- **Commits.** After the call, the actual cost replaces the reservation. An
  unknown actual cost keeps the reservation.
- **Overruns.** An actual cost above its reservation halts the run: the price
  data is wrong.
- **Crashes.** A reservation never committed (a crash mid-call) counts in
  full.
- **The guarantee.** Spend stays under the cap as long as no provider bills
  above its highest documented rate. The first call that does stops
  everything. A bound for a free allowance (TinyFish) holds only while paid
  use past the allowance is off on the account; the plan prints that
  condition.
- **Starting a live run.** `BENCH_ALLOW_LIVE=1`, every key present, no `CI`,
  the printed plan, and `--confirm-spend` equal to the cap.
- **Credits.** Free credit per account (`creditsUsd`) is spent before cash.

## 11. Outputs

`bench publish` writes four files:

- `results.json` (`schemas/results-1.schema.json`)
- `attempts.jsonl`
- `leaderboard.json` (`schemas/leaderboard-1.schema.json`), read by the site
- `routing-table.json` (`schemas/routing-table-1.schema.json`): per provider,
  profile and class, with n, intervals, latency, reliability, cost, tie group
  and flags (`insufficient-n` below 30 items, `unreliable`, `cost-unknown`).
  It is valid for 45 days.

They contain scores, URLs, hashes of result text, timings, costs, settings,
dataset hashes, registry spec versions, the judge's prompt hash and the
harness commit. They never contain titles, snippets, page text or judge
rationales. Before writing, publish scans the output for every stored
result text, page text, rationale and private item, and refuses on any
match.

Raw responses, pages, judgments, labels and the ledger stay in the
git-ignored store (`.local/bench/`, or `BENCH_STORE`).

Fixture runs use synthetic providers and a synthetic judge. Their outputs
say `"mode": "fixture"` and `"liveVerified": false`, and must never be shown
as provider measurements.

## 12. Versions

- **Method:** semver in `config/method.json`. Major means scores are not
  comparable across versions; minor adds metrics, classes or providers;
  patch fixes bugs.
- **Datasets:** `name-version`, with a SHA-256 in the manifest.
- **Rubric:** a versioned file, recorded with its hash.
- **Judge:** model ID, parameters and prompt hash, recorded in every result.
- **Schemas:** a version in every file name and `schema` field.

## 13. Known limits

- Most static items (237 of 252 public) still come from Wikidata, and
  search providers index Wikipedia heavily, so the head, tail and multi-hop
  classes favour encyclopedic coverage. PEPs and the KEV catalog widen `tech`;
  the other classes have no non-Wikidata source yet.
- The second-source check reads Wikipedia, so tail items whose answer is not
  on Wikipedia are more often `builder-checked` than head items.
- Fresh items lean to software and security: in `fresh-2026-12`, 38 of 50
  are release lines, versions and vulnerabilities; the other 12 are new
  arXiv papers. There are no news-like events this month: the event-winner
  template finds recent events with Wikidata's search API, which throttled
  the build (it asks unnamed clients for contact details, and the builder
  sends none). Rerun it before the next fresh set.
- Version items rest on the source alone: Wikipedia infoboxes draw versions
  from Wikidata, so the cross-check cannot confirm them independently, and
  they stay `builder-checked`.
- There is no open-ended research class. Judged relevance runs only on
  known-answer queries.
- The page check reads only what a plain GET returns: pages that need
  JavaScript, PDFs, paywalls and sites that refuse unknown crawlers are
  unreadable for every provider. A provider whose results lean towards such
  pages gets less page credit; the per-provider unreadable share shows it.
- The fetcher refuses private addresses by name and IP literal; it does not
  resolve hostnames first.
- Wikidata release dates can lag or differ by a day from the real release;
  the "as of" phrasing keeps the answer fixed but not always exact.
- Ties need both statistical separation and 6 points, so close providers
  stay tied even with significant differences. This follows the owner's
  decision.
