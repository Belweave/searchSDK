# Named steps

A spec may transform a value only through these steps. Each runtime implements
them once. Vectors: `conformance/steps.json`. No step throws on the response
side; bad input yields `null` (or `[]` for `to-list`). On the request side, a
step that cannot express a value raises `unsupported`.

Each step has a side in `steps.json` (`request`, `response` or `both`), and
the schema lists which steps a param, compose part or response field may use,
with their required arguments. A runtime that meets a step on the wrong side
treats it as `unsupported` on the request side and `null` on the response
side.

"Blank" means the code points in `policy.json` `query.blank`.
Arithmetic is IEEE-754 binary64, evaluated in the order written, never rounded.

## parse-date
Input: any. Non-strings give `null`. Leading and trailing ASCII space, tab, CR
and LF are ignored. Accepted forms:

1. `YYYY-MM-DD`, read as midnight UTC.
2. `YYYY-MM-DD` + `T`, `t` or one space + `HH:mm`, optional `:ss`, optional
   `.` and 1 to 9 fraction digits (truncated to milliseconds), optional zone
   `Z`, `z`, `±HH:mm` or `±HHmm`. No zone means UTC.
3. RFC 5322 style: optional English day name and comma, then
   `D Mon YYYY HH:mm[:ss]` and a zone of `GMT`, `UTC`, `Z` or `±HHmm`. Month
   and day names are three letters, any case.

Fields must form a real calendar date and time (no hour 24, no second 60,
offset at most 23:59). Years have exactly four digits. A result outside
0001-01-01 to 9999-12-31 UTC gives `null`. Anything else gives `null`,
including relative phrases and numbers.

Output: `YYYY-MM-DDTHH:mm:ss.sssZ` in UTC.

## to-list
`null` or absent gives `[]`. A string gives `[s]` unless it is empty or all
blank, then `[]`; the string is not trimmed. An array keeps, in order, its
string elements that are not empty or all blank. Anything else gives `[]`.

## join
Args: `separator` (required). An array joins its string elements with it; an
array with none gives `null`. A string passes through. Anything else gives
`null`.

## single
An array of exactly one element gives that element. Otherwise `unsupported`.

## map-value
Args: `table` (required). Looks up the input, as given, among the table's own
keys (case-sensitive). A string is its own key. An integer of magnitude at most
2^53 − 1 is looked up by its plain decimal string (`1440`, `-3`); other numbers,
booleans and anything else never match. A miss gives `unsupported` on the
request side and `null` on the response side.

## lowercase, uppercase
Changes ASCII letters only; other characters are unchanged. Non-strings give
`null`.

## prefix
Args: `prefix` (required). A string gives `prefix + s`. An array gives its
string elements, each prefixed, in order; other elements are dropped. Anything
else gives `null`.

## date-to-datetime
Args: `edge`. Input must be a real `YYYY-MM-DD` date, else `unsupported`.
`start` gives `YYYY-MM-DDT00:00:00.000Z`; `end` gives
`YYYY-MM-DDT23:59:59.999Z`.

## format-date
Request side. Args: `format`, only `MM/DD/YYYY`. Input must be a real
`YYYY-MM-DD` date, else `unsupported`. Output keeps the zero padding:
`2026-01-05` gives `01/05/2026`.

## recency-to-date
Input: `day`, `week`, `month` or `year`. Output: `now` minus
`policy.search.recencyDays[input]` × 86 400 000 ms, formatted as above. `now`
is the runtime clock in epoch milliseconds.

## credits-to-usd
Args: `rateUsd`. A finite number ≥ 0 gives `input × rateUsd`. Anything else
gives `null`.

## request-price
Input: `count`, a non-negative integer. Args: the endpoint `pricing` and a
`tier`. `base` is `pricing.perRequestUsd` when it is a number, else
`pricing.perRequestUsd[tier]`, where a missing tier means `standard`; a
missing or `null` entry, or a `null` `perRequestUsd`, gives `null` (the price
is not public). With `pricing.extraBlock`:
`blocks = ceil(max(0, count − includedItems) / extraBlock.items)` and the
output is `base + blocks × extraBlock.usd`. Without it, the output is `base`.
`includedItems` defaults to 0.

## Cost (composition of the steps above)
A response's `cost`, and each attempt's, is chosen in this order:

1. `cost.reported` with unit `usd` and a finite number ≥ 0 at its path:
   `{ usd, source: "reported", estimated: cost.reported.isEstimate ?? false }`.
2. `cost.reported` with unit `credit` and a usable number:
   `{ usd: credits-to-usd(credits, pricing.creditUsd), credits,
   source: "reported-credits", estimated: true }`.
3. Otherwise the computed price `{ usd: request-price(count, pricing, tier),
   source: "computed", estimated: true }`, or `{ usd: null, source: "unknown",
   estimated: true }` when that is `null`.

`tier` is the request's normalized `depth`, or `standard`. Then, for each
provider option the caller set that `pricing.costOptions` lists: `"unknown"`
makes the computed price unknown; a table maps the option's string value to
the tier to use, and a value that is not a string, not listed, or listed as
`null` makes it unknown. A reported cost is never affected.

`count` is the length of the provider's result array for search. For contents
it is the number of pages read from sources that are `ok` or marked
`billable`, matched to a requested URL or not. For an attempt with no usable
body (billed `possible`, or a 2xx that could not be mapped) it is the requested
`maxResults`, or the number of URLs sent.

## parse-date details
The RFC 5322 form accepts a day name without checking it against the date, and
needs at least one space after its comma.