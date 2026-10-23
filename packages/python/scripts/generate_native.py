#!/usr/bin/env python3
"""Offline Python native inventory; only writes within this package. Run --check in CI.

Consumes retained A operation tables/converted schemas and B catalogs/snapshots.
The original generators are imported for A/Brave conversion with their emitters
replaced; no TypeScript, retained source, or repository-level file is written.
"""

from __future__ import annotations
import argparse
import hashlib
import importlib.util
import json
import pathlib
import runpy
import sys

sys.dont_write_bytecode = True
PACKAGE = pathlib.Path(__file__).resolve().parents[1]
ROOT = PACKAGE.parents[1]
A = ROOT / "scripts/providers-a"
B = ROOT / "scripts/providers-b"


def load_module(name: str, path: pathlib.Path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


def generate() -> dict:
    sys.path.insert(0, str(A))
    a = load_module("generate", A / "generate.py")
    a.verify_snapshots()
    runpy.run_path(str(B / "verify.py"))
    documents = {}
    enriched = {}

    def capture(gen):
        for key, doc, source in gen.specs:
            documents[gen.provider + "." + key] = doc
            gen.add(key, doc, source)
        for operation in gen.operations:
            enriched[(gen.provider, operation["name"])] = operation

    a.Gen.emit = capture
    specs = [
        (
            "context",
            "Context",
            [("context", a.J("context"), "https://docs.context.dev/openapi.json")],
        ),
        (
            "tinyfish",
            "Tinyfish",
            [
                (n, a.J(n), "https://agent.tinyfish.ai/v1/openapi/" + n.split("-")[1])
                for n in [
                    "tinyfish-main",
                    "tinyfish-search",
                    "tinyfish-fetch",
                    "tinyfish-browser",
                    "tinyfish-monitor",
                    "tinyfish-research",
                ]
            ],
        ),
        (
            "exa",
            "Exa",
            [
                (
                    n,
                    a.J(n),
                    "https://exa.ai/docs/"
                    + ("exa-spec.yaml" if n == "exa" else "team-management-spec.yaml"),
                )
                for n in ["exa", "exa-team"]
            ],
        ),
        (
            "tavily",
            "Tavily",
            [
                (
                    f.stem,
                    json.loads(f.read_text()),
                    "https://docs.tavily.com/"
                    + (
                        "documentation/enterprise/"
                        if f.stem.split("tavily-")[1]
                        in ["generate-keys", "deactivate-keys", "key-info", "org-usage"]
                        else "documentation/api-reference/endpoint/"
                    )
                    + f.stem.split("tavily-")[1]
                    + ".md",
                )
                for f in sorted((A / "fixtures").glob("tavily-*.json"))
            ],
        ),
    ]
    for provider, prefix, inputs in specs:
        capture(a.Gen(provider, prefix, inputs))
    runpy.run_path(str(A / "brave.py"))
    operations = []
    for entry in json.loads((A / "operations.json").read_text())["operations"]:
        provider, name = entry["provider"], entry["name"]
        e = enriched.get((provider, name))
        if e is None:
            operations.append(
                {
                    "provider": provider,
                    "name": name,
                    "base": entry["base"],
                    "path": entry["path"],
                    "method": entry["verb"],
                    "response": entry["mode"],
                    "source": entry["source"],
                    "supported": True,
                    "supplemental": True,
                    "retryable": entry["verb"] in ("GET", "HEAD"),
                    "parameters": [],
                    "bodyRequired": entry["name"] == "paidSearch",
                    "raw": False,
                    "headers": {},
                    "streamField": False,
                    "commaQuery": [],
                }
            )
            continue
        document_id = provider + "." + e["key"]
        document = documents[document_id]
        raw_op = document["paths"][e["path"]][e["verb"].lower()]
        params = document["paths"][e["path"]].get("parameters", []) + raw_op.get("parameters", [])

        def resolve(v, document=document):
            while isinstance(v, dict) and "$ref" in v:
                r = document
                for segment in v["$ref"].lstrip("#/").split("/"):
                    r = r[segment.replace("~1", "/").replace("~0", "~")]
                v = r
            return v

        params = [resolve(v) for v in params]
        operation = {
            "provider": provider,
            "name": name,
            "base": e["base"],
            "path": e["path"],
            "method": e["verb"],
            "response": e["mode"],
            "source": e["source"],
            "supported": True,
            "document": document_id,
            "parameters": params,
            "bodySchema": e["body"],
            "bodyRequired": e["bodyRequired"],
            "raw": e["raw"],
            "headers": e["headers"],
            "streamField": e["streamfield"],
            "streamValue": e["streamvalue"],
            "setStreamField": True,
            "retryable": e["verb"] == "GET" and e["mode"] != "sse",
            "responses": raw_op.get("responses", {}),
            "commaQuery": [
                q[0]
                for q in e["query"]
                if q[3].get("explode") is False
                or provider == "context"
                and resolve(q[1]).get("type") == "array"
            ],
        }
        operations.append(operation)
    # Supplemental shapes transcribed from retained providers-a/extensions.py.
    for operation in operations:
        if not operation.get("supplemental"):
            continue
        if operation["provider"] == "context":
            operation["parameters"] = [
                {
                    "name": name,
                    "in": "query",
                    "required": name in ("publicClientId", "domain"),
                    "schema": schema,
                }
                for name, schema in {
                    "publicClientId": {"type": "string"},
                    "domain": {"type": "string"},
                    "theme": {"enum": ["light", "dark"]},
                    "type": {"enum": ["icon", "wordmark"]},
                }.items()
            ]
        elif operation["name"] == "paidSearch":
            import copy

            operation["document"] = "tavily.tavily-search"
            schema = copy.deepcopy(
                documents[operation["document"]]["paths"]["/search"]["post"]["requestBody"][
                    "content"
                ]["application/json"]["schema"]
            )
            schema.setdefault("properties", {})["search_depth"] = {"enum": ["advanced"]}
            operation["bodySchema"] = schema
            operation["parameters"] = [
                {
                    "name": "PAYMENT-SIGNATURE",
                    "in": "header",
                    "required": False,
                    "schema": {"type": "string"},
                }
            ]
    # B retained specs already include documentation-derived Serper/WonderSearch shapes.
    files = {
        "perplexity": ["p-openapi"]
        + [
            "p-" + n + ".json"
            for n in [
                "gateway-chat",
                "gateway-responses",
                "gateway-messages",
                "gateway-models",
                "gateway-model",
                "auth-generate",
                "auth-revoke",
            ]
        ],
        "parallel": ["parallel-openapi"],
        "linkup": ["linkup-openapi"],
        "firecrawl": ["firecrawl-openapi"],
        "you": [
            "you-" + n
            for n in [
                "web-search",
                "contents",
                "answer",
                "research",
                "finance-research",
                "billing",
                "images",
            ]
        ],
        "serper": ["serper-openapi", "serper-scrape"],
        "wondersearch": ["wonder-openapi"],
    }
    for provider, names in files.items():
        docs = []
        for file in names:
            doc = json.loads((B / "snapshots" / file).read_text())
            key = provider + "." + file
            documents[key] = doc
            docs.append((key, doc))
        for e in json.loads((B / "catalogs" / (provider + "-operations.json")).read_text()):
            matches = [
                (key, doc)
                for key, doc in docs
                if e["method"].lower() in doc.get("paths", {}).get(e["path"], {})
            ]
            if len(matches) != 1:
                raise SystemExit(
                    "Ambiguous or missing retained operation: " + provider + "." + e["name"]
                )
            key, doc = matches[0]

            def resolve(v, doc=doc):
                while isinstance(v, dict) and "$ref" in v:
                    ref = doc
                    for seg in v["$ref"].lstrip("#/").split("/"):
                        ref = ref[seg.replace("~1", "/").replace("~0", "~")]
                    v = ref
                return v

            item = doc["paths"][e["path"]]
            upstream = item[e["method"].lower()]
            body = resolve(upstream.get("requestBody", {}))
            content = body.get("content", {})
            schema = content.get("application/json", {}).get("schema")
            actual = resolve(schema) if schema is not None else {}
            stream_field = (
                "stream" in actual.get("properties", {})
                or e["name"].endswith("Stream")
                and e["method"] == "POST"
            )
            raw = bool(content) and schema is None
            operations.append(
                {
                    "provider": provider,
                    "name": e["name"],
                    "base": doc["servers"][0]["url"].rstrip("/"),
                    "path": e["path"],
                    "method": e["method"],
                    "response": e["response"],
                    "source": e["source"],
                    "supported": True,
                    "multipart": "multipart/form-data" in content,
                    "document": key,
                    "parameters": [
                        resolve(v)
                        for v in item.get("parameters", []) + upstream.get("parameters", [])
                    ],
                    "bodySchema": schema,
                    "bodyRequired": body.get("required", False),
                    "raw": raw,
                    "headers": {"Content-Type": next(iter(content))} if raw else {},
                    "streamField": stream_field,
                    "streamValue": e["response"] == "sse",
                    "setStreamField": e["response"] == "sse",
                    "retryable": e["method"] in ["GET", "HEAD"] and e["response"] != "sse",
                    "responses": upstream.get("responses", {}),
                    "commaQuery": [],
                }
            )
    from serpapi_schema import document as serpapi_document

    serpapi_source = ROOT / "packages/sdk/src/native-serpapi.ts"
    serpapi_doc = serpapi_document(serpapi_source.read_text())
    documents["serpapi.typescript-reference"] = serpapi_doc
    for e in json.loads((B / "catalogs/serpapi-operations.json").read_text()):
        name = e["name"]
        operations.append(
            {
                "provider": "serpapi",
                "name": name,
                "base": "https://serpapi.com",
                "path": e["path"],
                "method": e["method"],
                "response": e["response"],
                "source": e["source"],
                "supported": True,
                "multipart": name == "uploadImage",
                "parameters": (
                    [
                        {
                            "name": parameter,
                            "in": "path",
                            "required": True,
                            "schema": {"type": "string"},
                        }
                        for parameter in __import__("re").findall(
                            r"\{([A-Za-z][A-Za-z0-9_]*)\}", e["path"]
                        )
                    ]
                    + (
                        [
                            {
                                "name": "engine",
                                "in": "query",
                                "required": True,
                                "schema": {"type": "string"},
                            }
                        ]
                        if name.startswith("search")
                        else [
                            {
                                "name": "q",
                                "in": "query",
                                "required": True,
                                "schema": {"type": "string"},
                            }
                        ]
                        if name == "google"
                        else [
                            {
                                "name": "url",
                                "in": "query",
                                "required": True,
                                "schema": {"type": "string"},
                            }
                        ]
                        if name in ("extract", "extractMarkdown")
                        else []
                    )
                ),
                "bodySchema": None,
                "bodyRequired": False,
                "raw": False,
                "headers": {},
                "streamField": False,
                "retryable": name in {"locations", "account", "getSearch", "getSearchHtml"},
                "commaQuery": [],
            }
        )
    # Supplement endpoint families with known TS wire interfaces; keep engine extensions open.
    definitions = serpapi_doc["components"]["schemas"]
    for operation in operations:
        if operation["provider"] != "serpapi":
            continue
        name = operation["name"]
        operation["document"] = "serpapi.typescript-reference"
        operation["typingSource"] = "packages/sdk/src/native-serpapi.ts"
        if name.startswith("search") or name == "google":
            query_name = "SerpApiCommonSearchQuery"
        elif name in ("extract", "extractMarkdown"):
            query_name = "SerpApiExtractQuery"
        else:
            query_name = None
        if query_name:
            schema = definitions[query_name]
            existing = {p["name"] for p in operation["parameters"]}
            operation["parameters"] += [
                {"name": key, "in": "query", "required": key in schema["required"], "schema": value}
                for key, value in schema["properties"].items()
                if key not in existing
            ]
        response_name = (
            "SerpApiAccountResponse"
            if name == "account"
            else "SerpApiLocation"
            if name == "locations"
            else "SerpApiUploadImageResponse"
            if name == "uploadImage"
            else "SerpApiExtractResponse"
            if name in ("extract", "extractMarkdown")
            else "SerpApiPixelPositionResponse"
            if "PixelPositions" in name
            else "SerpApiSearchResponse"
        )
        schema = {"$ref": "#/components/schemas/" + response_name}
        if name == "locations":
            schema = {"type": "array", "items": schema}
        operation["responses"] = {"200": {"content": {"application/json": {"schema": schema}}}}
    paths = sorted(
        set(
            [
                A / "operations.json",
                A / "generate.py",
                A / "brave.py",
                A / "extensions.py",
                A / "provenance.json",
                B / "provenance.json",
            ]
            + list((A / "fixtures").glob("*.json"))
            + list((B / "catalogs").glob("*.json"))
            + list((B / "snapshots").iterdir())
        )
    )
    paths.append(serpapi_source)
    inputs = {
        str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest()
        for p in paths
        if p.is_file()
    }
    return {
        "schemaVersion": 1,
        "reviewedAt": "2026-10-22",
        "inputs": inputs,
        "operations": sorted(operations, key=lambda e: (e["provider"], e["name"])),
        "documents": documents,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    from native_typing import emit

    catalog = generate()
    generated = {
        "catalog.json": json.dumps(
            catalog, sort_keys=True, ensure_ascii=True, separators=(",", ":")
        )
        + "\n",
        **emit(catalog),
    }
    for name, text in generated.items():
        target = PACKAGE / "src/searchsdk" / name
        if args.check:
            if not target.exists() or target.read_text() != text:
                raise SystemExit("Python native output is stale: " + name)
        else:
            target.write_text(text)
    print("Python native catalog " + ("verified" if args.check else "generated"))


if __name__ == "__main__":
    main()
