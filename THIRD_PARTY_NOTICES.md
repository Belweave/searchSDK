# Third-party notices

The MIT license in `LICENSE` applies to searchSDK's original source and
documentation. Third-party fonts, logos, reference material, data and
trademarks keep their own ownership and terms.

## Fonts

The brand and the website use two typefaces, unmodified, under the SIL Open
Font License 1.1. Neither declares a Reserved Font Name.

| Family | Copyright | Files | Licence text |
| --- | --- | --- | --- |
| Instrument Sans | © 2022 The Instrument Sans Project Authors | `brand/fonts/InstrumentSans-*`, `site/assets/fonts/InstrumentSans-latin.woff2` | [`brand/fonts/InstrumentSans-OFL.txt`](brand/fonts/InstrumentSans-OFL.txt), [`site/assets/fonts/InstrumentSans-OFL.txt`](site/assets/fonts/InstrumentSans-OFL.txt) |
| Martian Mono | © 2021 The Martian Mono Project Authors | `brand/fonts/MartianMono-*`, `site/assets/fonts/MartianMono-latin.woff2` | [`brand/fonts/MartianMono-OFL.txt`](brand/fonts/MartianMono-OFL.txt), [`site/assets/fonts/MartianMono-OFL.txt`](site/assets/fonts/MartianMono-OFL.txt) |

Sources for each file are recorded in [`brand/fonts/README.md`](brand/fonts/README.md).
The site's copies are byte-identical to the brand's and are kept current by
`site/checks/brand.mjs`.

## Provider names and logos

Provider names and logos identify the providers searchSDK supports. They are
trademarks of their owners, are not licensed under MIT, and their use does not
imply sponsorship, endorsement or affiliation. searchSDK is not affiliated with
any provider.

The logo files in `site/public/providers/<id>/` are each provider's own
files, downloaded from the provider's website and stored unmodified. Their
sources, retrieval date, hashes and each provider's usage rules are recorded
in [`site/public/providers/SOURCES.md`](site/public/providers/SOURCES.md).

## Provider API references

The specs in `registry/providers/` describe each provider's public API in
searchSDK's own format and record the source URL and retrieval date of each
fact. The providers' documentation, APIs and the data they return remain
theirs; searchSDK's license grants no rights to them, and each provider's
terms apply when you call its service.

## Benchmark datasets

Items in `bench/datasets/` are built from open sources. Each item records its
source and licence; [`bench/METHOD.md`](bench/METHOD.md) lists them:

- Wikidata, CC0-1.0.
- CISA Known Exploited Vulnerabilities catalog, CC0-1.0.
- arXiv metadata, CC0-1.0.
- Python Enhancement Proposals (peps.python.org), public domain or CC0-1.0.
- endoflife.date, MIT. Its copyright and license notice are in the
  `LICENSE` file of the [endoflife.date repository](https://github.com/endoflife-date/endoflife.date).

## Dependencies

`@searchsdk/sdk` and the Python `searchsdk` package have no runtime
dependencies. The development dependencies of `brand/`, `sdk/typescript/`,
`bench/` and `site/` keep their own licenses, recorded in each package's
lockfile and in the installed packages' notices.
