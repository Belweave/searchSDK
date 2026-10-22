"""Check retained source identity without network access or dependencies."""
import hashlib
import json
from pathlib import Path

root = Path(__file__).resolve().parent
manifest = json.loads((root / "provenance.json").read_text())
for source in manifest["sources"]:
    file = root / source["file"]
    actual = hashlib.sha256(file.read_bytes()).hexdigest()
    if actual != source["sha256"]:
        raise SystemExit(f"Snapshot changed: {source['file']}")
print(f"Verified {len(manifest['sources'])} retained public source snapshots.")
