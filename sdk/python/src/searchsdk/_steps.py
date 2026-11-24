"""The named-step library. Semantics: registry/steps.md. One implementation per runtime."""

from __future__ import annotations

import math
import re
from collections.abc import Callable, Mapping
from typing import Any, Literal

from ._json import MISSING, is_array, is_finite_number
from ._registry import POLICY, STEPS

Side = Literal["request", "response"]


class StepUnsupported(Exception):
    """A request-side step cannot express its value; the caller maps it to 'unsupported'."""


def _ranges(pairs: Any) -> tuple[tuple[int, int], ...]:
    return tuple((int(a, 16), int(b, 16)) for a, b in pairs)


BLANK = _ranges(POLICY["query"]["blank"])
FORBIDDEN = _ranges(POLICY["query"]["forbidden"])


def in_ranges(cp: int, ranges: tuple[tuple[int, int], ...]) -> bool:
    return any(a <= cp <= b for a, b in ranges)


def is_blank(cp: int) -> bool:
    return in_ranges(cp, BLANK)


def has_content(text: str) -> bool:
    return any(not is_blank(ord(c)) for c in text)


def trim_blank(text: str) -> str:
    """Removes policy blank code points from both ends."""
    start, end = 0, len(text)
    while start < end and is_blank(ord(text[start])):
        start += 1
    while end > start and is_blank(ord(text[end - 1])):
        end -= 1
    return text[start:end]


def ascii_lower(text: str) -> str:
    """Lowercases A-Z only (str.lower would also map the Kelvin sign to 'k' and more)."""
    return re.sub("[A-Z]+", lambda m: m.group(0).lower(), text)


def ascii_upper(text: str) -> str:
    return re.sub("[a-z]+", lambda m: m.group(0).upper(), text)


# ---- Calendar arithmetic (proleptic Gregorian, UTC), integer milliseconds ----

MIN_MS = -62_135_596_800_000  # 0001-01-01T00:00:00.000Z
MAX_MS = 253_402_300_799_999  # 9999-12-31T23:59:59.999Z
DAY_MS = 86_400_000


def days_in(year: int, month: int) -> int:
    leap = year % 4 == 0 and (year % 100 != 0 or year % 400 == 0)
    return (31, 29 if leap else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31)[month - 1]


def _days_from_civil(y: int, m: int, d: int) -> int:
    y -= m <= 2
    era = y // 400
    yoe = y - era * 400
    doy = (153 * (m + (-3 if m > 2 else 9)) + 2) // 5 + d - 1
    doe = yoe * 365 + yoe // 4 - yoe // 100 + doy
    return era * 146097 + doe - 719468


def _civil_from_days(z: int) -> tuple[int, int, int]:
    z += 719468
    era = z // 146097
    doe = z - era * 146097
    yoe = (doe - doe // 1460 + doe // 36524 - doe // 146096) // 365
    doy = doe - (365 * yoe + yoe // 4 - yoe // 100)
    mp = (5 * doy + 2) // 153
    d = doy - (153 * mp + 2) // 5 + 1
    m = mp + (3 if mp < 10 else -9)
    return yoe + era * 400 + (m <= 2), m, d


def epoch_ms(y: int, mo: int, d: int, h: int = 0, mi: int = 0, s: int = 0, ms: int = 0) -> int:
    return _days_from_civil(y, mo, d) * DAY_MS + ((h * 60 + mi) * 60 + s) * 1000 + ms


def iso(ms: int) -> str:
    """ECMAScript Date.prototype.toISOString for years 0 to 9999."""
    days, rest = divmod(ms, DAY_MS)
    y, mo, d = _civil_from_days(days)
    h, rest = divmod(rest, 3_600_000)
    mi, rest = divmod(rest, 60_000)
    s, milli = divmod(rest, 1000)
    return f"{y:04d}-{mo:02d}-{d:02d}T{h:02d}:{mi:02d}:{s:02d}.{milli:03d}Z"


_DATE = re.compile("([0-9]{4})-([0-9]{2})-([0-9]{2})")


def calendar_date(value: Any) -> tuple[int, int, int] | None:
    """A real YYYY-MM-DD date with ASCII digits, or None."""
    m = _DATE.fullmatch(value) if isinstance(value, str) else None
    if not m:
        return None
    y, mo, d = int(m[1]), int(m[2]), int(m[3])
    return (y, mo, d) if y >= 1 and 1 <= mo <= 12 and 1 <= d <= days_in(y, mo) else None


_ISO_DATETIME = re.compile(
    "([0-9]{4})-([0-9]{2})-([0-9]{2})[Tt ]([0-9]{2}):([0-9]{2})"
    "(?::([0-9]{2})(?:\\.([0-9]{1,9}))?)?(Z|z|[+-][0-9]{2}:?[0-9]{2})?"
)
_RFC5322 = re.compile(
    "(?:([A-Za-z]{3}), +)?([0-9]{1,2}) +([A-Za-z]{3}) +([0-9]{4}) +([0-9]{2}):([0-9]{2})"
    "(?::([0-9]{2}))? +([A-Za-z]{1,3}|[+-][0-9]{4})"
)
_MONTHS = ("jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec")
_DAYS = ("mon", "tue", "wed", "thu", "fri", "sat", "sun")
_OFFSET = re.compile("([+-])([0-9]{2}):?([0-9]{2})")


def _offset_minutes(zone: str | None) -> int | None:
    if zone is None or zone.lower() in ("z", "gmt", "utc"):
        return 0
    m = _OFFSET.fullmatch(zone)
    if not m:
        return None
    h, mi = int(m[2]), int(m[3])
    if h > 23 or mi > 59:
        return None
    return (-1 if m[1] == "-" else 1) * (h * 60 + mi)


def _build(y: int, mo: int, d: int, h: int, mi: int, s: int, ms: int, zone: str | None) -> str | None:
    if y < 1 or not 1 <= mo <= 12 or not 1 <= d <= days_in(y, mo) or h > 23 or mi > 59 or s > 59:
        return None
    offset = _offset_minutes(zone)
    if offset is None:
        return None
    t = epoch_ms(y, mo, d, h, mi, s, ms) - offset * 60_000
    return iso(t) if MIN_MS <= t <= MAX_MS else None


def _strip_ascii_space(text: str) -> str:
    return text.strip(" \t\r\n")


def parse_date(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    s = _strip_ascii_space(value)
    m = _DATE.fullmatch(s)
    if m:
        return _build(int(m[1]), int(m[2]), int(m[3]), 0, 0, 0, 0, None)
    m = _ISO_DATETIME.fullmatch(s)
    if m:
        ms = int((m[7] + "00")[:3]) if m[7] else 0
        return _build(int(m[1]), int(m[2]), int(m[3]), int(m[4]), int(m[5]), int(m[6]) if m[6] else 0, ms, m[8])
    m = _RFC5322.fullmatch(s)
    if m:
        if m[1] is not None and m[1].lower() not in _DAYS:
            return None
        if m[3].lower() not in _MONTHS or not re.fullmatch("gmt|utc|z|[+-][0-9]{4}", m[8], re.IGNORECASE | re.ASCII):
            return None
        mo = _MONTHS.index(m[3].lower()) + 1
        return _build(int(m[4]), mo, int(m[2]), int(m[5]), int(m[6]), int(m[7]) if m[7] else 0, 0, m[8])
    return None


def to_list(value: Any) -> list[str]:
    if isinstance(value, str):
        return [value] if has_content(value) else []
    if is_array(value):
        return [v for v in value if isinstance(v, str) and has_content(v)]
    return []


def _unsupported() -> Any:
    raise StepUnsupported()


def _join(value: Any, ref: Mapping[str, Any], side: Side, now: int) -> Any:
    if isinstance(value, str):
        return value
    if not is_array(value):
        return None
    parts = [v for v in value if isinstance(v, str)]
    return str(ref.get("separator", "")).join(parts) if parts else None


def _single(value: Any, ref: Mapping[str, Any], side: Side, now: int) -> Any:
    return value[0] if is_array(value) and len(value) == 1 else _unsupported()


SAFE_INTEGER = 2**53 - 1


def _map_value(value: Any, ref: Mapping[str, Any], side: Side, now: int) -> Any:
    key: Any = value
    if isinstance(value, bool):
        key = None
    elif isinstance(value, int):
        key = str(value) if abs(value) <= SAFE_INTEGER else None
    elif isinstance(value, float):
        key = str(int(value)) if math.isfinite(value) and value.is_integer() and abs(value) <= SAFE_INTEGER else None
    table = ref.get("table") or {}
    if isinstance(key, str) and key in table:
        return table[key]
    return _unsupported() if side == "request" else None


def _prefix(value: Any, ref: Mapping[str, Any], side: Side, now: int) -> Any:
    pre = str(ref.get("prefix", ""))
    if isinstance(value, str):
        return pre + value
    if is_array(value):
        return [pre + v for v in value if isinstance(v, str)]
    return None


def _date_to_datetime(value: Any, ref: Mapping[str, Any], side: Side, now: int) -> Any:
    if not calendar_date(value):
        return _unsupported()
    return f"{value}T{'23:59:59.999' if ref.get('edge') == 'end' else '00:00:00.000'}Z"


def _format_date(value: Any, ref: Mapping[str, Any], side: Side, now: int) -> Any:
    if not calendar_date(value) or ref.get("format") != "MM/DD/YYYY":
        return _unsupported()
    y, m, d = str(value).split("-")
    return f"{m}/{d}/{y}"


def _recency_to_date(value: Any, ref: Mapping[str, Any], side: Side, now: int) -> Any:
    days = POLICY["search"]["recencyDays"]
    if not isinstance(value, str) or value not in days:
        return _unsupported()
    return iso(now - days[value] * DAY_MS)


Impl = Callable[[Any, Mapping[str, Any], Side, int], Any]

IMPLEMENTATIONS: dict[str, Impl] = {
    "parse-date": lambda v, r, s, n: parse_date(v),
    "to-list": lambda v, r, s, n: to_list(v),
    "join": _join,
    "single": _single,
    "map-value": _map_value,
    "lowercase": lambda v, r, s, n: ascii_lower(v) if isinstance(v, str) else None,
    "uppercase": lambda v, r, s, n: ascii_upper(v) if isinstance(v, str) else None,
    "prefix": _prefix,
    "date-to-datetime": _date_to_datetime,
    "format-date": _format_date,
    "recency-to-date": _recency_to_date,
}

STEP_NAMES: tuple[str, ...] = (*IMPLEMENTATIONS, "credits-to-usd", "request-price")
"""Every step this runtime implements, the cost steps included. Tests compare it with registry/steps.json."""


def run_step(value: Any, ref: Mapping[str, Any], side: Side, now: int) -> Any:
    """One step. A step used on a side the library does not allow is unsupported on the request side and null on the response side."""
    definition = STEPS["steps"].get(ref["step"])
    impl = IMPLEMENTATIONS.get(ref["step"])
    if definition is None or impl is None or definition["side"] not in ("both", side):
        return _unsupported() if side == "request" else None
    return impl(None if value is MISSING else value, ref, side, now)


def run_steps(value: Any, steps: Any, side: Side, now: int) -> Any:
    v = value
    for ref in steps or ():
        v = run_step(v, ref, side, now)
    return v


def credits_to_usd(credits: Any, rate_usd: Any) -> float | None:
    if not is_finite_number(credits) or credits < 0 or rate_usd is None:
        return None
    result: float = credits * rate_usd
    return result


def request_price(count: int, pricing: Mapping[str, Any] | None, tier: str | None) -> float | None:
    if not pricing:
        return None
    per = pricing.get("perRequestUsd")
    base = per if per is None or not isinstance(per, Mapping) else per.get(tier or "standard")
    if base is None:
        return None
    block = pricing.get("extraBlock")
    if not block:
        result: float = base
        return result
    blocks = math.ceil(max(0, count - pricing.get("includedItems", 0)) / block["items"])
    total: float = base + blocks * block["usd"]
    return total
