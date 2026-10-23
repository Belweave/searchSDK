# Source attribution

searchSDK is MIT licensed; see LICENSE. Provider names and trademarks belong to
their respective owners. This package is not an official provider SDK.

The native catalog and Python wire types derive from the retained public source
schemas and documentation in repository directories scripts/providers-a and
scripts/providers-b. Each operation retains its official source URL. The bundled
searchsdk/catalog.json records all retained input hashes, reviewed date, original
schema documents, operation response modes, and supplemental bindings. The
package generator performs no provider requests and writes only this package.

Serper and WonderSearch contracts include schemas transcribed from public
provider documentation by the retained upstream generators; these are derived
schemas, not provider-issued OpenAPI specifications. SerpAPI catalog entries are
endpoint families; individual search engine schemas are not claimed complete.

All conformance response fixtures are synthetic. Shared copies under
 tests/fixtures derive from sdk-contract/fixtures and are verified byte-for-byte
by scripts/sync_fixtures.py --check.
