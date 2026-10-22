#!/usr/bin/env node
import { readFile, readdir, mkdir, writeFile, appendFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { platform, arch, release, cpus, totalmem } from 'node:os';
import { execute, makePlan, hash, validateLive } from './harness.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const usage = `searchSDK benchmark harness — plan and fixture modes never call providers.

  node benchmarks/run.mjs [--mode plan|fixture|live] [--config path] [--output directory] [--sdk-root directory]

Default: --mode plan --config benchmarks/configs/portable-v1.json
Live additionally requires --allow-live AND SEARCHSDK_BENCHMARK_ALLOW_LIVE=1.
The supplied config deliberately cannot run live. See docs/benchmarks.md.
Output is local and unreviewed. Never publish fixture timings as provider results.
`;

export function parseArgs(args) {
  const output = { mode: 'plan', config: resolve(root, 'benchmarks/configs/portable-v1.json'), output: null, 'sdk-root': null, allowLive: false, help: false };
  const seen = new Set();
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (seen.has(arg)) throw new Error('invalid_arguments');
    seen.add(arg);
    if (arg === '--help') output.help = true;
    else if (arg === '--allow-live') output.allowLive = true;
    else if (['--mode', '--config', '--output', '--sdk-root'].includes(arg) && args[i + 1] && !args[i + 1].startsWith('--')) output[arg.slice(2)] = args[++i];
    else throw new Error('invalid_arguments');
  }
  if (!['plan', 'fixture', 'live'].includes(output.mode) || output.allowLive && output.mode !== 'live') throw new Error('invalid_arguments');
  return output;
}

async function fingerprint(sdkRoot) {
  let sdkCommit = null, workingTreeDirty = null;
  try {
    sdkCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    workingTreeDirty = execFileSync('git', ['status', '--porcelain', '--untracked-files=normal'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim().length > 0;
  } catch { /* An archive checkout is valid; content hashes still identify it. */ }
  const dist = sdkRoot ?? resolve(root, 'packages/sdk/dist');
  let sdkBuildSha256 = null;
  try {
    const files = (await readdir(dist)).filter(name => name.endsWith('.js')).sort();
    sdkBuildSha256 = hash(await Promise.all(files.map(async name => [name, hash(await readFile(resolve(dist, name), 'utf8'))])));
  } catch { /* plan mode does not require a built SDK */ }
  const source = resolve(root, 'packages/sdk/src');
  const files = (await readdir(source)).filter(name => name.endsWith('.ts')).sort();
  const sdkSourceSha256 = hash(await Promise.all(files.map(async name => [name, hash(await readFile(resolve(source, name), 'utf8'))])));
  return { sdkCommit, workingTreeDirty, sdkSourceSha256, sdkBuildSha256,
    packageLockSha256: hash(await readFile(resolve(root, 'package-lock.json'), 'utf8')),
    harnessSha256: hash(await Promise.all(['run.mjs', 'harness.mjs', 'providers.mjs', 'fixtures.mjs'].map(async name =>
      [name, hash(await readFile(new URL(name, import.meta.url), 'utf8'))]))),
    node: process.version, platform: platform(), arch: arch(), kernel: release(),
    logicalCpus: cpus().length, memoryBytes: totalmem() };
}

export async function main(args = process.argv.slice(2)) {
  const options = parseArgs(args);
  if (options.help) { process.stdout.write(usage); return; }
  const config = JSON.parse(await readFile(resolve(options.config), 'utf8'));
  const dataset = JSON.parse(await readFile(resolve(root, 'benchmarks/datasets/public-web-v1.json'), 'utf8'));
  const protocolText = await readFile(resolve(root, 'apps/web/public/benchmark-methodology.json'), 'utf8');
  const protocol = JSON.parse(protocolText);
  const plan = makePlan(config, dataset);
  if (protocol.protocolVersion !== config.protocolVersion) throw new Error('protocol_version_mismatch');
  if (options.mode === 'live') validateLive(config, plan, { allowLive: options.allowLive });
  const runId = randomUUID();
  const directory = options.output ? resolve(options.output) : resolve(root, '.local/benchmarks', runId);
  // Exclusive directory creation avoids mixing/overwriting earlier evidence.
  await mkdir(dirname(directory), { recursive: true });
  await mkdir(directory);
  const manifest = { schemaVersion: '1.0.0', runId, mode: options.mode,
    publicationReady: false, status: options.mode === 'plan' ? 'planned' : 'incomplete',
    recordedAt: new Date().toISOString(), protocolSha256: hash(protocolText),
    runtime: config.runtime, execution: config.execution, disclosures: config.disclosures,
    reproducibility: await fingerprint(options['sdk-root']), plan };
  await writeFile(resolve(directory, 'run.json'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  if (options.mode !== 'plan') {
    await writeFile(resolve(directory, 'attempts.jsonl'), '', { flag: 'wx', mode: 0o600 });
    const controller = new AbortController();
    const cancel = () => controller.abort();
    process.once('SIGINT', cancel); process.once('SIGTERM', cancel);
    let result;
    try {
      result = await execute(config, dataset, { mode: options.mode, allowLive: options.allowLive,
        sdkRoot: options['sdk-root'] ? pathToFileURL(resolve(options['sdk-root']) + '/').href : undefined,
        signal: controller.signal, onRecord: record => appendFile(resolve(directory, 'attempts.jsonl'), JSON.stringify(record) + '\n') });
    } finally { process.removeListener('SIGINT', cancel); process.removeListener('SIGTERM', cancel); }
    await writeFile(resolve(directory, 'results.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    manifest.status = result.stopReason === 'complete' ? 'complete-unreviewed' : 'partial-unreviewed';
    manifest.finishedAt = result.finishedAt;
    await writeFile(resolve(directory, 'run.json'), JSON.stringify(manifest, null, 2) + '\n', { mode: 0o600 });
    if (result.stopReason !== 'complete') process.exitCode = 2;
  }
  process.stdout.write(JSON.stringify({ mode: options.mode, runId, expectedRequests: plan.expectedRequests,
    status: manifest.status, publicationReady: false }) + '\n');
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch(error => {
    // Do not print arbitrary exception messages/URLs/paths: they may contain credentials.
    const safe = new Set(['invalid_arguments', 'invalid_config', 'invalid_dataset', 'invalid_mode', 'protocol_version_mismatch',
      'live_opt_in_required', 'live_runtime_required', 'live_budget_required', 'live_disclosures_required', 'live_pricing_required',
      'live_credentials_required', 'live_instance_required', 'secret_in_metadata', 'live_budget_exceeded', 'adapter_unavailable']);
    process.stderr.write(JSON.stringify({ error: safe.has(error?.message) ? error.message : 'benchmark_setup_failed' }) + '\n');
    process.exitCode = 1;
  });
}
