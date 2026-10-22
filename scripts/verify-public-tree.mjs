import { execFileSync } from 'node:child_process';
import { lstat, readFile } from 'node:fs/promises';

// A narrow release guard, not a substitute for reviewing staged content.
// Report locations only: a rejected value may itself be sensitive.
const paths = [...new Set(execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean))];
const forbiddenPath = /(?:^|\/)(?:\.env(?:\..*)?|\.local|\.vercel|\.agents|\.claude|\.codex|node_modules|__pycache__)(?:\/|$)|\.(?:pyc|bundle|pem|key)$/i;
const checks = [
  ['personal home directory', /\/(?:Users|home)\/[A-Za-z0-9._-]+\//],
  ['private key', /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/],
  ['GitHub credential', /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{60,})\b/],
  ['AWS access key', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
];
const failures = [];
let inspected = 0;
for (const path of paths) {
  const info = await lstat(path).catch(error => { if (error.code === 'ENOENT') return null; throw error; });
  if (!info) continue;
  if (forbiddenPath.test(path) || info.isSymbolicLink()) { failures.push(`${path}: forbidden release path`); continue; }
  if (!info.isFile()) continue;
  const bytes = await readFile(path);
  inspected++;
  if (bytes.includes(0)) continue;
  const lines = bytes.toString('utf8').split('\n');
  for (const [label, pattern] of checks) {
    const index = lines.findIndex(line => pattern.test(line));
    if (index >= 0) failures.push(`${path}:${index + 1}: ${label}`);
  }
}
if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else console.log(`Public-tree guard passed: ${inspected} files; no forbidden paths or high-confidence credential patterns.`);
