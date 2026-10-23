"""Retain the TS reference's hand-maintained SerpAPI wire interfaces.

The B catalog supplies endpoints; engine-specific contracts remain open. This
small parser only describes known interface fields. Unexpressible TS types stay
unknown; the complete original interface source is retained with its hash.
"""

import re


def document(source):
    definitions = {}
    for match in re.finditer(
        r"export interface (SerpApi\w+)(?: extends (SerpApi\w+))?\s*\{", source
    ):
        name, parent = match.group(1, 2)
        start = match.end()
        depth = 1
        end = start
        while depth and end < len(source):
            depth += (source[end] == "{") - (source[end] == "}")
            end += 1
        content = source[start : end - 1]

        def typ(expression):
            expression = expression.strip()
            if expression.startswith("readonly ") and expression.endswith("[]"):
                return {"type": "array", "items": typ(expression[9:-2])}
            if expression.startswith("(") and expression.endswith(")"):
                return typ(expression[1:-1])
            if expression.endswith("[]"):
                return {"type": "array", "items": typ(expression[:-2])}
            if " | " in expression:
                return {"anyOf": [typ(x) for x in expression.split(" | ")]}
            if expression.startswith('"') and expression.endswith('"'):
                return {"const": expression[1:-1]}
            if expression.startswith("SerpApi"):
                return {"$ref": "#/components/schemas/" + expression}
            if expression.startswith("Readonly<Record") or expression.startswith("Record"):
                return {"type": "object", "additionalProperties": True}
            return (
                {
                    "type": {
                        "string": "string",
                        "number": "number",
                        "boolean": "boolean",
                        "null": "null",
                    }[expression]
                }
                if expression in ("string", "number", "boolean", "null")
                else {}
            )

        props = {}
        required = []
        for field in re.finditer(r"^  ([A-Za-z_][A-Za-z0-9_]*)(\?)?:\s*([^;]+);", content, re.M):
            key, optional, expression = field.group(1, 2, 3)
            props[key] = typ(expression)
            if not optional:
                required.append(key)
        schema = {
            "type": "object",
            "properties": props,
            "required": required,
            "additionalProperties": True,
        }
        if parent:
            schema = {"allOf": [{"$ref": "#/components/schemas/" + parent}, schema]}
        definitions[name] = schema
    return {
        "components": {"schemas": definitions},
        "x-source": "packages/sdk/src/native-serpapi.ts",
        "x-source-text": source,
    }
