"""Runs one conformance call live through the Python runtime, for `bench verify`.

Reads one JSON object on stdin: {"call": "search" | "contents", "query" | "urls",
"options": {camelCase options as in a conformance vector}}. Keys come from the
provider's documented environment variables. Writes one JSON object on stdout:
{"response": ..., "error": ..., "diagnostics": [...]}, in the runtimes' shared
JSON form. Diagnostics redact the key; nothing here prints it.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parents[3] / "sdk" / "python" / "src"))

from searchsdk import Client, SearchError  # noqa: E402


def python_name(name: str) -> str:
    return re.sub("([A-Z])", lambda m: "_" + m.group(1).lower(), name)


def main() -> None:
    case = json.loads(sys.stdin.read())
    events: list[Any] = []
    client = Client(diagnostics=lambda event: events.append(event.to_json()))
    options = {python_name(k): v for k, v in (case.get("options") or {}).items()}
    out: dict[str, Any] = {"response": None, "error": None, "diagnostics": events}
    try:
        if case["call"] == "search":
            out["response"] = client.search(case["query"], **options).to_json()
        else:
            out["response"] = client.contents(case["urls"], **options).to_json()
    except SearchError as e:
        out["error"] = {"code": e.code, "status": e.status, "providerCode": e.provider_code}
    finally:
        client.close()
    json.dump(out, sys.stdout, ensure_ascii=False, default=repr)


if __name__ == "__main__":
    main()
