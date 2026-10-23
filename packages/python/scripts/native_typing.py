"""Python 3.11 TypedDicts and named client methods from the retained native catalog."""

from __future__ import annotations
import re


def pascal(v):
    return "".join(p[:1].upper() + p[1:] for p in re.split(r"[^A-Za-z0-9]+", v))


def snake(v):
    return re.sub(r"(?<!^)(?=[A-Z])", "_", v).lower()


def emit(catalog):
    definitions = []
    aliases = []
    seen = {}
    names = set()

    def unique(hint):
        hint = pascal(hint)
        name = hint
        index = 2
        while name in names:
            name = hint + str(index)
            index += 1
        names.add(name)
        return name

    def resolve(doc, value):
        if isinstance(value, dict) and "$ref" in value and value["$ref"].startswith("#/"):
            cur = doc
            for part in value["$ref"][2:].split("/"):
                cur = cur[part.replace("~1", "/").replace("~0", "~")]
            return cur
        return value

    def typ(document, value, hint):
        if value is True or value is None or not isinstance(value, dict):
            return "Any"
        if "$ref" in value:
            key = (document, value["$ref"])
            if key in seen:
                return seen[key]
            name = unique(document + "_" + value["$ref"].split("/")[-1])
            seen[key] = name
            expression = typ(
                document, resolve(catalog["documents"][document], value), name + "Value"
            )
            aliases.append(f"{name}: TypeAlias = {expression!r}")
            return name
        if "const" in value:
            v = value["const"]
            return "Literal[" + repr(v) + "]" if v is None or type(v) in (str, bool, int) else "Any"
        if "enum" in value:
            vals = value["enum"]
            if all(v is None or type(v) in (str, bool, int) for v in vals) and vals:
                return "Literal[" + ", ".join(repr(v) for v in vals) + "]"
        for combinator in ("oneOf", "anyOf"):
            if value.get(combinator):
                return (
                    "Union["
                    + ", ".join(
                        typ(document, v, hint + "Alternative" + str(i))
                        for i, v in enumerate(value[combinator])
                    )
                    + "]"
                )
        if value.get("allOf"):
            doc = catalog["documents"][document]
            properties = dict(value.get("properties", {}))
            required = list(value.get("required", []))
            for entry in value["allOf"]:
                entry = resolve(doc, entry)
                if not isinstance(entry, dict):
                    return "Any"
                properties.update(entry.get("properties", {}))
                required.extend(entry.get("required", []))
            if properties:
                return typ(
                    document,
                    {"type": "object", "properties": properties, "required": required},
                    hint,
                )
            return "Any"
        t = value.get("type")
        if isinstance(t, list):
            return "Union[" + ", ".join(typ(document, {**value, "type": v}, hint) for v in t) + "]"
        if t == "array":
            result = "list[" + typ(document, value.get("items", {}), hint + "Item") + "]"
        elif t == "object" or "properties" in value or "additionalProperties" in value:
            props = value.get("properties", {})
            if not props:
                result = (
                    "dict[str, "
                    + typ(document, value.get("additionalProperties", {}), hint + "Value")
                    + "]"
                )
            else:
                name = unique(hint)
                fields = []
                for key, schema in props.items():
                    expression = typ(document, schema, name + "_" + key)
                    required = "Required" if key in value.get("required", []) else "NotRequired"
                    fields.append(f"{key!r}: {required}[{expression!r}]")
                definitions.append(
                    f"{name} = TypedDict({name!r}, {{" + ", ".join(fields) + "}, total=False)"
                )
                result = name
        else:
            result = {
                "string": "str",
                "integer": "int",
                "number": "float",
                "boolean": "bool",
                "null": "None",
            }.get(t, "Any")
        if value.get("nullable") and result != "None":
            result = "Optional[" + result + "]"
        return result

    def alias(name, expression):
        aliases.append(f"{name}: TypeAlias = {expression!r}")
        return name

    methods = {}
    exports = []
    for e in catalog["operations"]:
        provider, name = e["provider"], e["name"]
        prefix = pascal(provider) + pascal(name)
        document = e.get("document")
        params = e.get("parameters", [])
        inputs = []
        args = []
        for where in ("path", "query"):
            ps = [p for p in params if p.get("in") == where]
            if ps:
                schema = {
                    "type": "object",
                    "properties": {p["name"]: p.get("schema", {}) for p in ps},
                    "required": [p["name"] for p in ps if p.get("required")],
                }
                typename = alias(
                    prefix + pascal(where), typ(document, schema, prefix + pascal(where) + "Fields")
                )
                required = bool(schema["required"])
            else:
                typename = "Mapping[str, Any]"
                required = "{" in e["path"] if where == "path" else False
            inputs.append(
                f"{where}: {'nt.' + typename if ps else typename}"
                + ("" if required else " | None = None")
            )
            args.append(where + "=" + where)
        if e.get("raw") or e.get("multipart"):
            typname = "MultipartBody" if e.get("multipart") else "bytes"
            inputs.append("raw_body: " + typname)
            args.append("raw_body=raw_body")
        elif e.get("bodySchema") is not None or e.get("bodyRequired") or e.get("streamField"):
            typename = alias(
                prefix + "Body", typ(document, e.get("bodySchema", {}), prefix + "BodyFields")
            )
            inputs.append(
                "body: nt." + typename + ("" if e.get("bodyRequired") else " | UnsetType = UNSET")
            )
            args.append("body=body")
        mode = e["response"]
        response_type = {
            "sse": "SSEStream",
            "bytes": "bytes",
            "text": "str",
            "raw": "RawResponse",
            "empty": "None",
            "embedding-url": "str",
        }.get(mode)
        if provider == "perplexity" and name == "revokeAuthToken":
            response_type = "None"
        if response_type is None:
            schemas = []
            for status, response in e.get("responses", {}).items():
                if not status.startswith("2"):
                    continue
                response = resolve(catalog["documents"].get(document, {}), response)
                for media, definition in response.get("content", {}).items():
                    if media == "application/json" or media in (
                        "searchResults",
                        "sourcedAnswer",
                        "structured",
                    ):
                        schema = definition.get("schema", {})
                        if schema not in schemas:
                            schemas.append(schema)
            expression = typ(
                document,
                schemas[0] if len(schemas) == 1 else {"oneOf": schemas} if schemas else {},
                prefix + "ResponseFields",
            )
            response_type = "nt." + alias(prefix + "Response", expression)
        header_params = [
            p
            for p in params
            if p.get("in") == "header"
            and p["name"].lower()
            not in (
                {k.lower() for k in e.get("headers", {})}
                | {"authorization", "x-api-key", "x-subscription-token"}
            )
        ]
        if header_params:
            header_schema = {
                "type": "object",
                "properties": {p["name"]: p.get("schema", {}) for p in header_params},
                "required": [p["name"] for p in header_params if p.get("required")],
            }
            header_type = alias(
                prefix + "Headers", typ(document, header_schema, prefix + "HeadersFields")
            )
            header_input = (
                "headers: nt."
                + header_type
                + ("" if header_schema["required"] else " | None = None")
            )
        else:
            header_input = "headers: Mapping[str, str] | None = None"
        signature = ", ".join(
            inputs
            + [
                header_input,
                "timeout_ms: int | None = None",
                "cancellation: CancellationToken | None = None",
            ]
        )
        call = ", ".join(
            args
            + [
                "headers=cast(Mapping[str, str] | None, headers)",
                "timeout_ms=timeout_ms",
                "cancellation=cancellation",
            ]
        )
        docstring = e.get("source", "") + " — " + e["method"] + " " + e["base"] + e["path"]
        sync = f'    def {snake(name)}(self, *, {signature}) -> NativeResponse[{response_type}]:\n        """{docstring}"""\n        return cast(NativeResponse[{response_type}], self.request({name!r}, {call}))\n'
        async_method = f'    async def {snake(name)}(self, *, {signature}) -> NativeResponse[{response_type}]:\n        """{docstring}"""\n        return cast(NativeResponse[{response_type}], await self.request_async({name!r}, {call}))\n'
        methods.setdefault(provider, [[], []])[0].append(sync)
        methods[provider][1].append(async_method)
    clients = [
        '"""Generated named native clients. Run scripts/generate_native.py --check."""',
        "from __future__ import annotations",
        "from typing import Any, Mapping, cast",
        "from . import native_types as nt",
        "from .native import NativeClient, NativeResponse, MultipartBody, RawResponse, SSEStream, UNSET, UnsetType",
        "from .client import RetryPolicy",
        "from .transport import CancellationToken, Transport",
        "",
    ]
    for provider, variants in sorted(methods.items()):
        for async_mode, entries in enumerate(variants):
            classname = ("Async" if async_mode else "") + pascal(provider) + "Client"
            exports.append(classname)
            key_parameter = "api_key: str | None = None" if provider == "tavily" else "api_key: str"
            special_parameters = (
                ", team_api_key: str | None = None"
                if provider == "exa"
                else ', access_mode: str = "keyed"'
                if provider == "tavily"
                else ""
            )
            special_arguments = (
                ", team_api_key=team_api_key"
                if provider == "exa"
                else ", access_mode=access_mode"
                if provider == "tavily"
                else ""
            )
            clients.extend(
                [
                    f"class {classname}(NativeClient):",
                    f'    """{provider} provider-native operations; no automatic polling or pagination."""',
                    f"    def __init__(self, {key_parameter}, *, transport: Transport | None = None, timeout_ms: int = 10000, max_response_bytes: int = 10485760, max_request_bytes: int = 10485760, max_concurrency: int = 4, retry: RetryPolicy | None = None{special_parameters}) -> None:",
                    f"        super().__init__({provider!r}, api_key, transport=transport, timeout_ms=timeout_ms, max_response_bytes=max_response_bytes, max_request_bytes=max_request_bytes, max_concurrency=max_concurrency, retry=retry{special_arguments})",
                    "",
                    *entries,
                    "",
                ]
            )
    clients.append("__all__ = " + repr(exports))
    types = [
        '"""Generated native schemas. Unknown/open shapes remain Any or mappings.',
        "TypedDict describes known fields; native requests retain extra provider fields.",
        "JSON Schema constraints and non-object intersections remain provider-owned.",
        "Retained original schemas and attribution are available through client.schema().",
        '"""',
        "from typing import Any, Literal, NotRequired, Optional, Required, TypeAlias, TypedDict, Union",
        "",
        *definitions,
        "",
        *aliases,
        "",
    ]
    return {"native_clients.py": "\n".join(clients) + "\n", "native_types.py": "\n".join(types)}
