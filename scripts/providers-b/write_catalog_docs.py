"""Refresh only the generated tail of provider-surfaces-b.md."""
from pathlib import Path
import json

root = Path(__file__).resolve().parent
page = root.parents[1] / "docs/provider-surfaces-b.md"
marker = "## Exact native operation catalog\n"
intro = "\nThe tables below are generated inventory documentation. Output/stream/raw helpers\nare labeled separately from new HTTP surface area. Read/write semantics and\nrequest aliases are available next to each method in its module.\n"
prefix = page.read_text().split(marker, 1)[0]
chunks = [prefix + marker + intro]
for provider in ["perplexity", "parallel", "linkup", "firecrawl", "you", "serper", "serpapi", "wondersearch"]:
    operations = json.loads((root / "catalogs" / f"{provider}-operations.json").read_text())
    title = {"serpapi": "SerpAPI", "wondersearch": "WonderSearch", "you": "You.com"}.get(provider, provider.capitalize())
    chunks.append(f"\n### {title}\n\n| Method | HTTP contract | Output |\n| --- | --- | --- |\n")
    for operation in operations:
        helper = f" (helper for `{operation['aliasOf']}`)" if operation.get("aliasOf") else ""
        chunks.append(f"| `{operation['name']}` | `{operation['method']} {operation['path']}` | {operation['response']}{helper} |\n")
page.write_text("".join(chunks))
