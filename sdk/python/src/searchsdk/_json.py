"""JSON values: paths, equality, predicates, freezing and strict parsing.

Semantics: registry/policy.md ("Paths, equality, predicates, patterns").
Registry data is frozen into read-only mappings and tuples; response bodies
are plain dicts and lists. Every helper here accepts both.
"""

from __future__ import annotations

import json
import math
from collections.abc import Iterable, Mapping, Sequence
from types import MappingProxyType
from typing import Any, Final


class _Missing:
    """An absent value, as distinct from JSON null (None)."""

    _instance: _Missing | None = None

    def __new__(cls) -> _Missing:
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __repr__(self) -> str:
        return "MISSING"

    def __bool__(self) -> bool:
        return False


MISSING: Final = _Missing()


def is_object(value: object) -> bool:
    return isinstance(value, Mapping)


def is_array(value: object) -> bool:
    return isinstance(value, (list, tuple))


def is_number(value: object) -> bool:
    """A JSON number: int or float, never bool."""
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def is_finite_number(value: object) -> bool:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return False
    return isinstance(value, int) or math.isfinite(value)


def is_integer(value: object) -> bool:
    """JSON Schema 'integer': a number with no fractional part (2.0 counts, as in ECMAScript)."""
    if isinstance(value, bool):
        return False
    if isinstance(value, int):
        return True
    return isinstance(value, float) and math.isfinite(value) and value.is_integer()


def get_path(value: Any, path: str) -> Any:
    """Reads a path: '$' is the value itself; otherwise own keys only, and digit segments index arrays."""
    if path == "$":
        return value
    v = value
    for key in path.split("."):
        if is_array(v):
            if not (key.isascii() and key.isdigit()):
                return MISSING
            index = int(key)
            if index >= len(v):
                return MISSING
            v = v[index]
        elif isinstance(v, Mapping):
            if key not in v:
                return MISSING
            v = v[key]
        else:
            return MISSING
    return v


def json_equal(a: Any, b: Any) -> bool:
    """Same JSON type; numbers by value; booleans never equal numbers; absent equals nothing."""
    if a is MISSING or b is MISSING:
        return False
    if a is None or b is None:
        return a is None and b is None
    if isinstance(a, bool) or isinstance(b, bool):
        return isinstance(a, bool) and isinstance(b, bool) and a == b
    if is_number(a) or is_number(b):
        return is_number(a) and is_number(b) and a == b
    if isinstance(a, str) or isinstance(b, str):
        return isinstance(a, str) and isinstance(b, str) and a == b
    if is_array(a) or is_array(b):
        return is_array(a) and is_array(b) and len(a) == len(b) and all(json_equal(x, y) for x, y in zip(a, b))
    if isinstance(a, Mapping) and isinstance(b, Mapping):
        return len(a) == len(b) and all(k in b and json_equal(v, b[k]) for k, v in a.items())
    return False


def holds(root: Any, predicate: Mapping[str, Any]) -> bool:
    """One predicate. An absent value never equals anything and is never in a list or range."""
    v = get_path(root, predicate["path"])
    if "equals" in predicate:
        result = json_equal(v, predicate["equals"])
    elif "in" in predicate:
        result = any(json_equal(v, x) for x in predicate["in"])
    elif "range" in predicate:
        low, high = predicate["range"]
        result = is_finite_number(v) and low <= v <= high
    else:
        result = (v is not MISSING and v is not None) == predicate["present"]
    return not result if predicate.get("not") else result


def all_hold(root: Any, where: Iterable[Mapping[str, Any]] | None) -> bool:
    return all(holds(root, p) for p in (where or ()))


def freeze(value: Any) -> Any:
    """A read-only copy: mappings become MappingProxyType, lists become tuples."""
    if isinstance(value, Mapping):
        return MappingProxyType({k: freeze(v) for k, v in value.items()})
    if is_array(value):
        return tuple(freeze(v) for v in value)
    return value


def thaw(value: Any) -> Any:
    """A mutable deep copy: mappings become dicts, arrays become lists."""
    if isinstance(value, Mapping):
        return {k: thaw(v) for k, v in value.items()}
    if is_array(value):
        return [thaw(v) for v in value]
    return value


def is_json_value(value: Any, depth: int = 0) -> bool:
    """A value JSON can carry: str keys, finite numbers, no other Python types."""
    if depth > 200:
        return False
    if value is None or isinstance(value, (str, bool)):
        return True
    if is_number(value):
        return is_finite_number(value)
    if is_array(value):
        return all(is_json_value(v, depth + 1) for v in value)
    if isinstance(value, Mapping):
        return all(isinstance(k, str) and is_json_value(v, depth + 1) for k, v in value.items())
    return False


def has_surrogate(text: str) -> bool:
    """A Python str holds code points, so any surrogate in it is unpaired and cannot be UTF-8 encoded."""
    return any(0xD800 <= ord(c) <= 0xDFFF for c in text)


def well_formed(value: Any) -> bool:
    """Strings (keys included) without unpaired surrogates, deeply."""
    if isinstance(value, str):
        return not has_surrogate(value)
    if is_array(value):
        return all(well_formed(v) for v in value)
    if isinstance(value, Mapping):
        return all(well_formed(k) and well_formed(v) for k, v in value.items())
    return True


class JsonError(ValueError):
    pass


def _reject_constant(name: str) -> Any:
    raise JsonError(f"{name} is not JSON")


def _parse_int(text: str) -> int | float:
    try:
        return int(text)
    except ValueError:  # beyond Python's integer digit limit; ECMAScript would read a double
        return float(text)


def parse_json(data: bytes) -> Any:
    """Strict UTF-8 JSON as ECMAScript JSON.parse reads it: one leading BOM is ignored; NaN and Infinity are refused."""
    try:
        text = data.decode("utf-8")
        if text.startswith("\ufeff"):
            text = text[1:]
        return json.loads(text, parse_constant=_reject_constant, parse_int=_parse_int)
    except (UnicodeDecodeError, ValueError, RecursionError) as e:
        raise JsonError("not JSON") from e


def dumps(value: Any) -> bytes:
    """Compact UTF-8 JSON, as ECMAScript JSON.stringify writes it. A lone surrogate (only possible in a
    spec's fixed values) is written as a \\u escape, as JSON.stringify does, instead of failing to encode."""
    plain = thaw(value)
    try:
        return json.dumps(plain, ensure_ascii=False, separators=(",", ":"), allow_nan=False).encode("utf-8")
    except UnicodeEncodeError:
        return json.dumps(plain, ensure_ascii=True, separators=(",", ":"), allow_nan=False).encode("ascii")


def as_sequence(value: Any) -> Sequence[Any]:
    return value if is_array(value) else ()
