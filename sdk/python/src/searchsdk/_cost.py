"""The exported price functions (registry/steps.md, List price and Cost bound).

They read a spec's pricing data only; nothing is sent.
"""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass
from typing import Any, Literal

from ._engine import Kind, computed_cost, endpoint, priced_tier
from ._registry import POLICY
from ._steps import request_price
from ._types import Cost, Depth, _Json, _omit


@dataclass(frozen=True)
class CostBound(_Json):
    """The most one request can cost under the registry's documented prices.

    ``usd`` is None when it cannot be bounded, and ``unknown_because`` says why:
    a cost option makes the price unknown ("option"), the billed count is
    unbounded ("count"), or the price is not public ("price").
    ``requires_overage_off`` is True when the bound holds only while paid use past
    the provider's free allowance stays off on the account.
    """

    usd: float | None
    unknown_because: Literal["option", "count", "price"] | None = _omit(default=None)
    requires_overage_off: Literal[True] | None = _omit(default=None)


def list_price(
    spec: Mapping[str, Any],
    kind: Kind,
    *,
    count: int,
    depth: Depth | None = None,
    provider_options: Mapping[str, Any] | None = None,
) -> Cost:
    """The computed list price of one request that returned ``count`` items.

    This is the cost a response reports when the provider reports none: a
    computed estimate, or unknown when the price is not public or a cost option
    makes it so. ``provider_options`` are this provider's own options.
    """
    ep = endpoint(spec, kind)
    return computed_cost(ep, count, depth if kind == "search" else None, provider_options)


def cost_bound(
    spec: Mapping[str, Any],
    kind: Kind,
    *,
    max_results: int | None = None,
    urls: int | None = None,
    depth: Depth | None = None,
    provider_options: Mapping[str, Any] | None = None,
) -> CostBound:
    """The most one request can cost under the documented prices.

    Uses the highest documented rates (``pricing.ceiling``) for the requested
    count, and the overage price past a free allowance when that is public. A
    spend cap can reserve this figure instead of a guessed margin. It assumes the
    provider bills no more items than were requested; a reported cost above it
    means the registry's price data is wrong.
    """
    ep = endpoint(spec, kind)
    tier = priced_tier(ep, depth if kind == "search" else None, provider_options)
    if tier is None:
        return CostBound(None, unknown_because="option")
    pricing: Mapping[str, Any] = ep["pricing"]
    if kind == "search":
        if pricing.get("extraBlock") and "maxResults" not in ep["request"]["params"]:
            return CostBound(None, unknown_because="count")
        count = max_results if max_results is not None else int(POLICY["search"]["maxResults"]["default"])
    else:
        count = urls if urls is not None else 1
    ceiling: Mapping[str, Any] = pricing.get("ceiling") or {}
    highest: dict[str, Any] = dict(pricing)
    if "perRequestUsd" in ceiling:
        highest["perRequestUsd"] = ceiling["perRequestUsd"]
    block = pricing.get("extraBlock")
    if block:
        highest["extraBlock"] = {"items": block["items"], "usd": ceiling.get("extraBlockUsd", block["usd"])}
    usd = request_price(count, highest, tier)
    if usd is None:
        return CostBound(None, unknown_because="price")
    allowance: Mapping[str, Any] | None = pricing.get("allowance")
    if allowance and allowance["beyond"]["billing"] == "opt-in":
        over = allowance["beyond"].get("perRequestUsd")
        if over is None:
            return CostBound(usd, requires_overage_off=True)
        over_usd = request_price(count, {**highest, "perRequestUsd": over}, tier)
        if over_usd is not None:
            usd = max(usd, over_usd)
    return CostBound(usd)
