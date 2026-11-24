"""The registry a client runs on.

The embedded copy of registry/ (synced by scripts/sync_registry.py) is read
once at import and frozen. Caller-supplied specs are validated against the
schema and the cross-field rules, copied and frozen, so later edits by other
code have no effect.
"""

from __future__ import annotations

import json
from collections.abc import Mapping
from importlib import resources
from typing import Any

from . import _regex
from ._errors import SearchError
from ._json import MISSING, freeze, get_path, is_array, is_json_value, is_number, thaw
from ._schema import validate


def _data(rel: str) -> Any:
    """A file under _registry/ (an importlib.resources Traversable)."""
    node = resources.files(__package__).joinpath("_registry")
    for part in rel.split("/"):
        node = node.joinpath(part)
    return node


def _read(rel: str) -> Any:
    return json.loads(_data(rel).read_bytes())


def _load_providers() -> dict[str, Any]:
    folder = _data("providers")
    out: dict[str, Any] = {}
    for entry in sorted(folder.iterdir(), key=lambda e: e.name):
        if entry.name.endswith(".json"):
            spec = json.loads(entry.read_bytes())
            spec.pop("$schema", None)
            out[spec["id"]] = spec
    return out


POLICY: Mapping[str, Any] = freeze(_read("policy.json"))
STEPS: Mapping[str, Any] = freeze(_read("steps.json"))
SCHEMA: Mapping[str, Any] = freeze(_read("schema/provider.schema.json"))
BUILT_IN: Mapping[str, Mapping[str, Any]] = freeze(_load_providers())

Registry = Mapping[str, Mapping[str, Any]]

NORMALIZED_INPUTS = ("query", "maxResults", "includeDomains", "excludeDomains", "recency", "startDate", "endDate", "country", "language", "depth")


def _patterns(value: Any) -> list[str]:
    """Every 'pattern' keyword inside a schema-like value."""
    found: list[str] = []
    if isinstance(value, Mapping):
        for k, v in value.items():
            if k == "pattern" and isinstance(v, str):
                found.append(v)
            else:
                found += _patterns(v)
    elif is_array(value):
        for v in value:
            found += _patterns(v)
    return found


def spec_problems(spec: Mapping[str, Any]) -> list[str]:
    """Rules the schema subset cannot express (registry/README.md). Empty when the spec is usable."""
    out: list[str] = []
    for kind in ("search", "contents"):
        ep = spec.get(kind)
        if ep is None:
            continue
        at = f"/{kind}"
        request = ep["request"]
        options = ep["providerOptions"]
        for name in (ep["pricing"].get("costOptions") or {}):
            if name not in options:
                out.append(f"{at}/pricing/costOptions/{name}: not a declared provider option")
        fixed = request.get("fixed") or {}
        for path in request.get("locked") or ():
            if get_path(fixed, path) is MISSING:
                out.append(f"{at}/request/locked: {path} is not in fixed")
        params = request["params"]
        for i, compose in enumerate(request.get("compose") or ()):
            inputs = [p["input"] for p in compose["parts"] if "input" in p]
            if not inputs:
                out.append(f"{at}/request/compose/{i}: has no input part")
            for name in inputs:
                if name in params:
                    out.append(f"{at}/request/compose/{i}: {name} is also a param")
                if name not in NORMALIZED_INPUTS:
                    out.append(f"{at}/request/compose/{i}: unknown input {name}")
        if request["method"] == "GET" and request["encoding"] != "query":
            out.append(f"{at}/request: GET needs query encoding")
        if request["encoding"] == "query":
            for key, value in fixed.items():
                if not (isinstance(value, (str, bool)) or is_number(value)):
                    out.append(f"{at}/request/fixed/{key}: query encoding takes strings, numbers and booleans")
        if "extraBlock" not in ep["pricing"] and "includedItems" in ep["pricing"]:
            out.append(f"{at}/pricing/includedItems: needs extraBlock")
        for pattern in _patterns(options):
            try:
                _regex.compile_pattern(pattern)
            except _regex.PatternError:
                out.append(f"{at}/providerOptions: pattern {pattern!r} is outside the portable subset")
    contents = spec.get("contents")
    if contents is not None:
        for i, source in enumerate(contents["response"]["pages"]):
            if source["status"] == "ok" and source.get("billable") is False:
                out.append(f"/contents/response/pages/{i}: ok pages are always billable")
    return out


def load_registry(specs: Any) -> Registry:
    """Validates, copies and freezes caller specs. Any problem is a configuration error naming 'registry'."""
    if not isinstance(specs, Mapping) or not is_json_value(specs):
        raise SearchError("configuration", field="registry")
    copy: dict[str, Any] = thaw(specs)
    for provider_id, spec in copy.items():
        if not isinstance(spec, dict) or validate(spec, SCHEMA) or spec.get("id") != provider_id or spec_problems(spec):
            raise SearchError("configuration", field="registry")
        spec.pop("$schema", None)
    frozen: Registry = freeze(copy)
    return frozen

