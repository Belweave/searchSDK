"""The JSON Schema subset listed in registry/README.md.

Used to check provider options at call time and caller-supplied registries.
Object keys are always own keys, and 2.0 is an integer, as JSON Schema says.
"""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any

from . import _regex
from ._json import is_array, is_integer, is_number, json_equal


def _type_of(value: Any) -> str:
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "boolean"
    if is_number(value):
        return "integer" if is_integer(value) else "number"
    if isinstance(value, str):
        return "string"
    if is_array(value):
        return "array"
    if isinstance(value, Mapping):
        return "object"
    return "unknown"


def _resolve(ref: str, root: Mapping[str, Any]) -> Any:
    if not ref.startswith("#/"):
        return None
    target: Any = root
    for key in ref[2:].split("/"):
        key = key.replace("~1", "/").replace("~0", "~")
        if not isinstance(target, Mapping) or key not in target:
            return None
        target = target[key]
    return target


def validate(value: Any, schema: Mapping[str, Any], root: Mapping[str, Any] | None = None, at: str = "") -> list[str]:
    """Returns error locations; an empty list means valid."""
    root = schema if root is None else root
    errors: list[str] = []

    def fail(why: str) -> None:
        errors.append(f"{at or '/'}: {why}")

    if "$ref" in schema:
        target = _resolve(schema["$ref"], root)
        if not isinstance(target, Mapping):
            return [f"{at}: unresolved {schema['$ref']}"]
        errors += validate(value, target, root, at)
    for sub in schema.get("allOf", ()):
        errors += validate(value, sub, root, at)
    if "anyOf" in schema and not any(not validate(value, sub, root, at) for sub in schema["anyOf"]):
        fail("matches no anyOf branch")
    if "oneOf" in schema and sum(1 for sub in schema["oneOf"] if not validate(value, sub, root, at)) != 1:
        fail("must match exactly one oneOf branch")
    if "const" in schema and not json_equal(value, schema["const"]):
        fail("const mismatch")
    if "enum" in schema and not any(json_equal(value, e) for e in schema["enum"]):
        fail("not in enum")

    t = _type_of(value)
    if "type" in schema:
        types = schema["type"] if is_array(schema["type"]) else (schema["type"],)
        if not any(x == t or (x == "number" and t == "integer") for x in types):
            fail("expected " + "|".join(types))
            return errors
    if t == "string":
        length = len(value)  # code points
        if "minLength" in schema and length < schema["minLength"]:
            fail("too short")
        if "maxLength" in schema and length > schema["maxLength"]:
            fail("too long")
        if "pattern" in schema:
            try:
                if not _regex.test(schema["pattern"], value):
                    fail("pattern mismatch")
            except _regex.PatternError:
                fail("pattern is not portable")
    if t in ("number", "integer"):
        if "minimum" in schema and value < schema["minimum"]:
            fail("below minimum")
        if "maximum" in schema and value > schema["maximum"]:
            fail("above maximum")
    if t == "array":
        if "minItems" in schema and len(value) < schema["minItems"]:
            fail("too few items")
        if "maxItems" in schema and len(value) > schema["maxItems"]:
            fail("too many items")
        if "items" in schema:
            for i, v in enumerate(value):
                errors += validate(v, schema["items"], root, f"{at}/{i}")
    if t == "object":
        for k in schema.get("required", ()):
            if k not in value:
                fail(f"missing {k}")
        properties = schema.get("properties", {})
        additional = schema.get("additionalProperties")
        for k, v in value.items():
            where = f"{at}/{k}"
            if "propertyNames" in schema:
                errors += validate(k, schema["propertyNames"], root, where)
            if k in properties:
                errors += validate(v, properties[k], root, where)
            elif additional is False:
                errors.append(f"{where}: not allowed")
            elif isinstance(additional, Mapping):
                errors += validate(v, additional, root, where)
    return errors
