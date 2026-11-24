"""The embedded registry, the schema, the step library and the test files themselves."""

from __future__ import annotations

from . import guard as _guard  # noqa: F401

import json
import typing
import unittest
from pathlib import Path
from typing import Any

from searchsdk import ErrorCode, policy, registry
from searchsdk._regex import PatternError, compile_pattern
from searchsdk._registry import spec_problems
from searchsdk._schema import validate
from searchsdk._steps import STEP_NAMES

from .harness import CONFORMANCE, load_vectors

ROOT = Path(__file__).resolve().parents[3] / "registry"
PACKAGE = Path(__file__).resolve().parents[1]


def read(rel: str) -> Any:
    return json.loads((ROOT / rel).read_text(encoding="utf-8"))


SCHEMA = read("schema/provider.schema.json")
STEPS = read("steps.json")
FILES = sorted(p.name for p in (ROOT / "providers").glob("*.json"))
ALL_SPECS = [(f"providers/{f}", read(f"providers/{f}")) for f in FILES] + [
    (file, spec) for file, data in load_vectors("format/") for spec in (data.get("providers") or {}).values()
]


def patterns(value: Any) -> list[str]:
    if isinstance(value, dict):
        return [v for k, v in value.items() if k == "pattern" and isinstance(v, str)] + [
            p for k, v in value.items() if not (k == "pattern" and isinstance(v, str)) for p in patterns(v)
        ]
    if isinstance(value, list):
        return [p for v in value for p in patterns(v)]
    return []


class Registry(unittest.TestCase):
    def test_the_embedded_copy_matches_registry(self) -> None:
        import subprocess
        import sys

        result = subprocess.run([sys.executable, str(PACKAGE / "scripts" / "sync_registry.py"), "--check"], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_the_embedded_registry_holds_exactly_the_spec_files(self) -> None:
        self.assertEqual(sorted(registry), [f[:-5] for f in FILES])

    def test_every_spec_validates_against_the_schema(self) -> None:
        for where, spec in ALL_SPECS:
            self.assertEqual(validate(spec, SCHEMA), [], f"{where} {spec['id']}")

    def test_every_spec_passes_the_cross_field_rules(self) -> None:
        for where, spec in ALL_SPECS:
            self.assertEqual(spec_problems(spec), [], f"{where} {spec['id']}")

    def test_every_pattern_is_in_the_portable_subset(self) -> None:
        sources = [SCHEMA, read("policy.json"), *(spec for _, spec in ALL_SPECS)]
        for pattern in [p for s in sources for p in patterns(s)] + [policy["domains"]["labelPattern"]]:
            compile_pattern(pattern)
        for bad in ["(?<=a)b", "(?<n>a)", "\\p{L}", "(a)\\1", "\\b", "a{", "\\uD83D"]:
            with self.assertRaises(PatternError, msg=bad):
                compile_pattern(bad)

    def test_the_schema_rejects_an_unknown_step_and_an_extra_field(self) -> None:
        spec = read("providers/exa.json")
        spec["search"]["request"]["params"]["query"]["steps"] = [{"step": "eval"}]
        spec["extra"] = True
        self.assertGreaterEqual(len(validate(spec, SCHEMA)), 2)

    def test_the_schema_keeps_steps_on_their_side_and_requires_their_arguments(self) -> None:
        a = read("providers/exa.json")
        a["search"]["request"]["params"]["query"]["steps"] = [{"step": "parse-date"}]
        self.assertNotEqual(validate(a, SCHEMA), [])
        b = read("providers/exa.json")
        b["search"]["response"]["fields"]["title"] = {"path": "title", "steps": [{"step": "single"}]}
        self.assertNotEqual(validate(b, SCHEMA), [])
        c = read("providers/tinyfish.json")
        del c["search"]["request"]["params"]["includeDomains"]["steps"][0]["separator"]
        self.assertNotEqual(validate(c, SCHEMA), [])

    def test_the_schema_requires_a_reason_for_a_key_in_the_url_and_only_then(self) -> None:
        q = read("providers/exa.json")
        q["auth"] = {"in": "query", "name": "api_key", "env": ["EXA_API_KEY"]}
        self.assertNotEqual(validate(q, SCHEMA), [])
        q["auth"]["keyInUrlReason"] = "The provider documents no header."
        self.assertEqual(validate(q, SCHEMA), [])

    def test_object_keys_are_own_keys(self) -> None:
        schema = {"type": "object", "properties": {"a": {"type": "string"}}, "additionalProperties": False, "required": ["a"]}
        self.assertNotEqual(validate({"a": "x", "toString": 1}, schema), [])
        self.assertNotEqual(validate({"constructor": 1}, schema), [])

    def test_the_step_library_the_schema_and_the_runtime_name_the_same_steps(self) -> None:
        library = sorted(STEPS["steps"])

        def sides(side: str) -> list[str]:
            return sorted(n for n, s in STEPS["steps"].items() if s["side"] in (side, "both"))

        def names(definition: Any) -> list[str]:
            return sorted(b["properties"]["step"]["const"] for b in definition["anyOf"])

        self.assertEqual(names(SCHEMA["$defs"]["requestStep"]), sides("request"))
        self.assertEqual(names(SCHEMA["$defs"]["responseStep"]), sides("response"))
        self.assertEqual(sorted(STEP_NAMES), library)

    def test_every_unverified_pointer_resolves_inside_its_spec(self) -> None:
        for f in FILES:
            spec = read(f"providers/{f}")
            for entry in spec["unverified"]:
                node: Any = spec
                for key in entry["pointer"].split("/")[1:]:
                    key = key.replace("~1", "/").replace("~0", "~")
                    node = node[int(key)] if isinstance(node, list) else node[key]

    def test_policy_error_messages_cover_exactly_the_error_codes(self) -> None:
        codes = sorted(typing.get_args(ErrorCode))
        self.assertEqual(sorted(policy["errors"]), codes)
        for code in [*policy["transient"], *policy["fallbackOn"], *policy["billing"]["possible"]]:
            self.assertIn(code, codes)

    def test_every_provider_endpoint_has_vectors_marked_synthetic(self) -> None:
        vectors = dict(load_vectors("providers/"))
        for pid, spec in registry.items():
            data = vectors[f"providers/{pid}.json"]
            self.assertRegex(data["synthetic"], "(?i)synthetic")
            for kind in ("search", "contents"):
                if spec.get(kind) is not None:
                    self.assertTrue(any(c["call"] == kind and "response" in c["expect"] for c in data["cases"]), f"{pid} {kind}")
        for file, data in load_vectors("format/"):
            self.assertRegex(data["synthetic"], "(?i)synthetic", file)
        self.assertTrue(CONFORMANCE.is_dir())

    def test_every_test_file_imports_the_guard_first(self) -> None:
        for path in sorted(Path(__file__).parent.glob("test_*.py")):
            first = next(line for line in path.read_text(encoding="utf-8").splitlines() if line.startswith(("import ", "from ")) and "__future__" not in line)
            self.assertEqual(first, "from . import guard as _guard  # noqa: F401", path.name)


if __name__ == "__main__":
    unittest.main()
