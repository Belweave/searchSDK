"""The registry's regular-expression dialect, translated to Python's re.

Registry patterns are ECMAScript regular expressions with the u flag, tested
as RegExp.prototype.test does (a match anywhere; JSON Schema semantics),
restricted to the portable subset in registry/README.md. Python's re differs
inside that subset: '$' also matches before a trailing newline, '.' matches
CR and U+2028/9, and \\d, \\w and \\s are Unicode-aware. This module rewrites
those constructs so both runtimes accept exactly the same strings, and
refuses anything outside the subset.
"""

from __future__ import annotations

import functools
import re

# ECMAScript WhiteSpace and LineTerminator: what \s matches with the u flag.
_JS_SPACE = "\\t\\n\\x0b\\x0c\\r \\xa0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000\\ufeff"
_CLASS_ESCAPES = {"d": "0-9", "w": "A-Za-z0-9_", "s": _JS_SPACE}
_CONTROL = {"t": "\\t", "n": "\\n", "r": "\\r", "f": "\\x0c", "v": "\\x0b"}
_SYNTAX = set("^$\\.*+?()[]{}|/")
_HEX = set("0123456789abcdefABCDEF")


class PatternError(ValueError):
    """The pattern is not in the registry's portable subset."""


def _escape_char(cp: int) -> str:
    return f"\\U{cp:08x}"


def _read_escape(p: str, i: int, in_class: bool) -> tuple[str, int, bool]:
    """Reads the escape at p[i] == '\\'. Returns (python text, next index, is_shorthand_class)."""
    if i + 1 >= len(p):
        raise PatternError("trailing backslash")
    c = p[i + 1]
    if c in _CLASS_ESCAPES:
        return _CLASS_ESCAPES[c], i + 2, True
    if c in ("D", "W", "S"):
        if in_class:
            raise PatternError("negated class escape inside a class")
        return "[^" + _CLASS_ESCAPES[c.lower()] + "]", i + 2, True
    if c in _CONTROL:
        return _CONTROL[c], i + 2, False
    if c == "x" and len(p) >= i + 4 and set(p[i + 2 : i + 4]) <= _HEX:
        return _escape_char(int(p[i + 2 : i + 4], 16)), i + 4, False
    if c == "u":
        if p[i + 2 : i + 3] == "{":
            end = p.find("}", i + 3)
            digits = p[i + 3 : end] if end > 0 else ""
            if not digits or not set(digits) <= _HEX or int(digits, 16) > 0x10FFFF:
                raise PatternError("bad \\u{...} escape")
            cp = int(digits, 16)
            nxt = end + 1
        else:
            digits = p[i + 2 : i + 6]
            if len(digits) != 4 or not set(digits) <= _HEX:
                raise PatternError("bad \\u escape")
            cp = int(digits, 16)
            nxt = i + 6
        if 0xD800 <= cp <= 0xDFFF:
            raise PatternError("surrogate escapes are not portable")
        return _escape_char(cp), nxt, False
    if c in _SYNTAX or (in_class and c == "-"):
        return _escape_char(ord(c)), i + 2, False
    raise PatternError(f"escape \\{c} is not in the portable subset")


def _read_class(p: str, i: int) -> tuple[str, int]:
    """Reads a class starting at p[i] == '['."""
    out = "["
    i += 1
    negated = p[i : i + 1] == "^"
    if negated:
        out += "^"
        i += 1
    if p[i : i + 1] == "]":  # [] matches nothing and [^] matches anything in ECMAScript
        return ("(?s:.)" if negated else "(?!)"), i + 1
    after_shorthand = False
    while True:
        if i >= len(p):
            raise PatternError("unterminated class")
        c = p[i]
        if c == "]":
            return out + "]", i + 1
        if after_shorthand and c == "-" and p[i + 1 : i + 2] != "]":
            raise PatternError("a class escape cannot bound a range")
        after_shorthand = False
        if c == "\\":
            text, i, after_shorthand = _read_escape(p, i, in_class=True)
            out += text
        elif c == "[":
            raise PatternError("'[' inside a class must be escaped")
        elif c == "-":
            out += "-" if out[-1] not in "[^" and p[i + 1 : i + 2] != "]" else "\\-"
            i += 1
        else:
            out += _escape_char(ord(c)) if not c.isalnum() else c
            i += 1


def translate(pattern: str) -> str:
    """Python re source for an ECMAScript (u flag) pattern in the portable subset."""
    out = []
    i = 0
    depth = 0
    while i < len(pattern):
        c = pattern[i]
        if c == "\\":
            text, i, shorthand = _read_escape(pattern, i, in_class=False)
            out.append("[" + text + "]" if shorthand and not text.startswith("[") else text)
            continue
        if c == "[":
            text, i = _read_class(pattern, i)
            out.append(text)
            continue
        if c == "(":
            if pattern.startswith("(?:", i):
                out.append("(?:")
                i += 3
            elif pattern.startswith("(?", i):
                raise PatternError("only (...) and (?:...) groups are portable")
            else:
                out.append("(")
                i += 1
            depth += 1
            continue
        if c == ")":
            depth -= 1
            if depth < 0:
                raise PatternError("unbalanced )")
            out.append(")")
            i += 1
            continue
        if c == "{":
            m = re.compile(r"\{([0-9]+)(,([0-9]*))?\}").match(pattern, i)
            if not m:
                raise PatternError("a literal { must be escaped")
            out.append(m.group(0))
            i = m.end()
            continue
        if c in "}]":
            raise PatternError(f"a literal {c} must be escaped")
        if c == "^":
            out.append("\\A")
        elif c == "$":
            out.append("\\Z")
        elif c == ".":
            out.append("[^\\n\\r\\u2028\\u2029]")
        elif c in "|*+?":
            out.append(c)
        else:
            out.append(_escape_char(ord(c)) if not c.isalnum() else c)
        i += 1
    if depth:
        raise PatternError("unbalanced (")
    return "".join(out)


@functools.lru_cache(maxsize=512)
def compile_pattern(pattern: str) -> re.Pattern[str]:
    try:
        return re.compile(translate(pattern))
    except re.error as e:
        raise PatternError(str(e)) from None


def test(pattern: str, value: str) -> bool:
    """RegExp.prototype.test with the u flag: a match anywhere in the string."""
    return compile_pattern(pattern).search(value) is not None
