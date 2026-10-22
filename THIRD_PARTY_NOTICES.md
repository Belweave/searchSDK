# Third-party notices

The MIT license in `LICENSE` applies to searchSDK's original source and
documentation. Third-party code, fonts, API reference material and trademarks
retain their respective ownership and terms.

## Paper Mono

The website bundles Paper Mono under the SIL Open Font License 1.1. The complete
copyright and license notice is retained at
[`apps/web/public/fonts/paper-mono/OFL.txt`](apps/web/public/fonts/paper-mono/OFL.txt).
Font provenance is recorded alongside it. See [Paper Mono](https://paper.design/mono).

## dithercn

The website includes the dithercn engine in `apps/web/src/lib/dither/`, obtained
from the [official registry](https://dithercn.dev/r/dither-core.json). The
[publisher](https://dithercn.dev/) identifies the project as MIT licensed and
attributes it to [Leo](https://github.com/leoisadev1). The registry files were
supplied without individual copyright headers. Local compatibility changes
replace sorting of newly created arrays with ES2022-compatible equivalents.
The site extends the shader with an optional spatial color field, keeping its
original scalar palette path as the default. The search aurora adapts the
[official Aurora field](https://dithercn.dev/r/aurora.json); the site components
in `apps/web/src/components/DitherKit.tsx` adapt the ordered-fill techniques
from the official DitherFade, Divider, Card, Empty, Loader, ProgressBar and
Number examples. The search lens geometry, documentation diagrams, and
request-duration compositions are original site work.
Upstream ownership is retained; the project's copyright notice does not claim
ownership of this component.

The MIT permission and warranty terms apply to that component:

> Permission is hereby granted, free of charge, to any person obtaining a copy
> of this software and associated documentation files (the "Software"), to deal
> in the Software without restriction, including without limitation the rights
> to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
> copies of the Software, and to permit persons to whom the Software is
> furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in all
> copies or substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
> IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
> FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
> AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
> LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
> OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
> SOFTWARE.

## Provider names, artwork and API references

Provider names and logos identify supported integrations. Their trademarks and
artwork remain with their owners and are not relicensed under MIT. Their use does
not imply sponsorship or endorsement. Original artwork sources and usage notes
are recorded in [`docs/brand-assets.md`](docs/brand-assets.md).

Public API schemas and source snapshots under `scripts/providers-a` and
`scripts/providers-b` retain their publishers' ownership and any embedded
notices. Provenance manifests identify the official sources. searchSDK's license
does not grant additional rights to those reference materials or to data
returned by a provider. Provider account terms continue to apply when calling
their services.

## Dependencies

The SDK has no runtime dependencies. Website and development dependencies retain
their own licenses, recorded in the lockfile and installed package notices.
