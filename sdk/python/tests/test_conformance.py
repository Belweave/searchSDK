"""Every vector in registry/conformance, through both the synchronous and the asynchronous client.

Test methods are generated from the vector files: no provider, step or case
list is written here.
"""

from __future__ import annotations

from . import guard as _guard  # noqa: F401

import re
import unittest
from collections.abc import Callable
from typing import Any

import searchsdk
from searchsdk import SearchError, cost_bound, list_price, url_key
from searchsdk._steps import StepUnsupported, credits_to_usd, request_price, run_step

from .harness import DEFAULT_NOW, Mode, assert_json, load_vectors, parse_iso, run_case


def _name(*parts: str) -> str:
    return "test_" + re.sub("[^0-9A-Za-z]+", "_", " ".join(parts)).strip("_").lower()[:120]


class ConformanceSync(unittest.TestCase):
    """Provider, policy and format vectors through Client."""


class ConformanceAsync(unittest.TestCase):
    """Provider, policy and format vectors through AsyncClient."""


class Steps(unittest.TestCase):
    """registry/conformance/steps.json."""


class CostFunctions(unittest.TestCase):
    """registry/conformance/cost.json: list_price, cost_bound and url_key."""


def _case_test(case: dict[str, Any], data: dict[str, Any], mode: Mode) -> Callable[[unittest.TestCase], None]:
    def test(self: unittest.TestCase) -> None:
        run_case(case, data, mode)

    test.__doc__ = case["name"]
    return test


for _sub in ("providers/", "policy/", "format/"):
    for _file, _data in load_vectors(_sub):
        for _i, _case in enumerate(_data["cases"]):
            _method = _name(_file.removesuffix(".json"), f"{_i:03d}", _case["name"])
            setattr(ConformanceSync, _method, _case_test(_case, _data, "sync"))
            setattr(ConformanceAsync, _method, _case_test(_case, _data, "async"))


def _step_test(c: dict[str, Any]) -> Callable[[unittest.TestCase], None]:
    def test(self: unittest.TestCase) -> None:
        side = c.get("side", "response")
        now = parse_iso(c.get("now", DEFAULT_NOW))

        def run() -> Any:
            if c["step"] == "credits-to-usd":
                return credits_to_usd(c["input"], c["args"]["rateUsd"])
            if c["step"] == "request-price":
                return request_price(c["input"], c["args"]["pricing"], c["args"]["tier"])
            return run_step(c["input"], {"step": c["step"], **(c.get("args") or {})}, side, now)

        if "expectError" in c:
            with self.assertRaises(StepUnsupported):
                run()
        else:
            assert_json(run(), c["expect"], f"{c['step']} {c['input']!r}")

    return test


for _file, _data in load_vectors(""):
    if _file == "steps.json":
        for _i, _c in enumerate(_data["cases"]):
            setattr(Steps, _name(f"{_i:03d}", _c["step"]), _step_test(_c))


def _cost_test(c: dict[str, Any]) -> Callable[[unittest.TestCase], None]:
    def test(self: unittest.TestCase) -> None:
        spec = c.get("spec") or searchsdk.registry.get(c.get("provider", ""))
        given: Any = c.get("input")

        def run() -> Any:
            if c["fn"] == "urlKey":
                return url_key(given)
            assert spec is not None
            o = given or {}
            if c["fn"] == "listPrice":
                return list_price(spec, c["kind"], count=o["count"], depth=o.get("depth"), provider_options=o.get("providerOptions")).to_json()
            if c["fn"] == "costBound":
                return cost_bound(
                    spec, c["kind"], max_results=o.get("maxResults"), urls=o.get("urls"), depth=o.get("depth"), provider_options=o.get("providerOptions")
                ).to_json()
            raise AssertionError(f"unknown fn {c['fn']}")

        if "expectError" in c:
            with self.assertRaises(SearchError) as caught:
                run()
            self.assertEqual((caught.exception.code, caught.exception.field), (c["expectError"]["code"], c["expectError"]["field"]))
        else:
            assert_json(run(), c["expect"], c["name"])

    test.__doc__ = c["name"]
    return test


for _file, _data in load_vectors(""):
    if _file == "cost.json":
        for _i, _c in enumerate(_data["cases"]):
            setattr(CostFunctions, _name(f"{_i:03d}", _c["name"]), _cost_test(_c))


if __name__ == "__main__":
    unittest.main()
