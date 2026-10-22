const [major, minor, patch] = process.versions.node.split(".").map(Number);
const patched =
  (major === 24 && (minor > 22 || (minor === 22 && patch >= 1))) ||
  (major === 26 && (minor > 12 || (minor === 12 && patch >= 1)));
if (!patched)
  throw new Error(
    `Node ${process.versions.node} is outside the verified runtime policy. Use Node 24.22.1+ (24.x) or 26.12.1+ (26.x). See CONTRIBUTING.md.`,
  );
console.log(`Verified runtime floor: Node ${process.versions.node}`);
