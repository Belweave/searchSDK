import { crc32, deflateRawSync } from "node:zlib";
import type { Corpus } from "@/lib/mcp/core";
import corpusJson from "@/lib/mcp/corpus.json";

/**
 * The searchSDK agent skill (../skills/searchsdk), served at /skill.md, /skills/searchsdk/<file>
 * and /skills/searchsdk.zip. Read from the MCP corpus, which checks/mcp.mjs builds from the
 * skill folder, so the site, the zip and both MCP servers serve the same bytes.
 */
export const skillFiles: Readonly<Record<string, string>> = (corpusJson as Corpus).skill;

export function markdown(body: string): Response {
  return new Response(body, { headers: { "content-type": "text/markdown; charset=utf-8" } });
}

/** A deterministic zip (deflate, fixed 1980-01-01 timestamps) of the skill under searchsdk/. */
export function skillZip(): Uint8Array {
  const local: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const [file, text] of Object.entries(skillFiles).sort(([a], [b]) => a.localeCompare(b))) {
    const name = Buffer.from(`searchsdk/${file}`, "utf8");
    const data = Buffer.from(text, "utf8");
    const packed = deflateRawSync(data, { level: 9 });
    const crc = crc32(data);
    const head = Buffer.alloc(30);
    head.writeUInt32LE(0x04034b50, 0);
    head.writeUInt16LE(20, 4); // version needed
    head.writeUInt16LE(0x0800, 6); // UTF-8 names
    head.writeUInt16LE(8, 8); // deflate
    head.writeUInt16LE(0, 10); // time
    head.writeUInt16LE(0x21, 12); // date: 1980-01-01
    head.writeUInt32LE(crc, 14);
    head.writeUInt32LE(packed.length, 18);
    head.writeUInt32LE(data.length, 22);
    head.writeUInt16LE(name.length, 26);
    head.writeUInt16LE(0, 28);
    local.push(head, name, packed);
    const dir = Buffer.alloc(46);
    dir.writeUInt32LE(0x02014b50, 0);
    dir.writeUInt16LE(20, 4);
    dir.writeUInt16LE(20, 6);
    dir.writeUInt16LE(0x0800, 8);
    dir.writeUInt16LE(8, 10);
    dir.writeUInt16LE(0, 12);
    dir.writeUInt16LE(0x21, 14);
    dir.writeUInt32LE(crc, 16);
    dir.writeUInt32LE(packed.length, 20);
    dir.writeUInt32LE(data.length, 24);
    dir.writeUInt16LE(name.length, 28);
    dir.writeUInt32LE(offset, 42);
    central.push(dir, name);
    offset += head.length + name.length + packed.length;
  }
  const dirBytes = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(Object.keys(skillFiles).length, 8);
  end.writeUInt16LE(Object.keys(skillFiles).length, 10);
  end.writeUInt32LE(dirBytes.length, 12);
  end.writeUInt32LE(offset, 16);
  return new Uint8Array(Buffer.concat([...local, dirBytes, end]));
}
